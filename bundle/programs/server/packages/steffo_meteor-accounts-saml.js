(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var ECMAScript = Package.ecmascript.ECMAScript;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var Accounts = Package['accounts-base'].Accounts;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var SAML;

var require = meteorInstall({"node_modules":{"meteor":{"steffo:meteor-accounts-saml":{"saml_server.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/steffo_meteor-accounts-saml/saml_server.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let fiber;
module.watch(require("fibers"), {
  default(v) {
    fiber = v;
  }

}, 1);
let connect;
module.watch(require("connect"), {
  default(v) {
    connect = v;
  }

}, 2);

if (!Accounts.saml) {
  Accounts.saml = {
    settings: {
      debug: true,
      generateUsername: false,
      providers: []
    }
  };
}

RoutePolicy.declare('/_saml/', 'network');
/**
 * Fetch SAML provider configs for given 'provider'.
 */

function getSamlProviderConfig(provider) {
  if (!provider) {
    throw new Meteor.Error('no-saml-provider', 'SAML internal error', {
      method: 'getSamlProviderConfig'
    });
  }

  const samlProvider = function (element) {
    return element.provider === provider;
  };

  return Accounts.saml.settings.providers.filter(samlProvider)[0];
}

Meteor.methods({
  samlLogout(provider) {
    // Make sure the user is logged in before initiate SAML SLO
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'samlLogout'
      });
    }

    const providerConfig = getSamlProviderConfig(provider);

    if (Accounts.saml.settings.debug) {
      console.log(`Logout request from ${JSON.stringify(providerConfig)}`);
    } // This query should respect upcoming array of SAML logins


    const user = Meteor.users.findOne({
      _id: Meteor.userId(),
      'services.saml.provider': provider
    }, {
      'services.saml': 1
    });
    let nameID = user.services.saml.nameID;
    const sessionIndex = user.services.saml.idpSession;
    nameID = sessionIndex;

    if (Accounts.saml.settings.debug) {
      console.log(`NameID for user ${Meteor.userId()} found: ${JSON.stringify(nameID)}`);
    }

    const _saml = new SAML(providerConfig);

    const request = _saml.generateLogoutRequest({
      nameID,
      sessionIndex
    }); // request.request: actual XML SAML Request
    // request.id: comminucation id which will be mentioned in the ResponseTo field of SAMLResponse


    Meteor.users.update({
      _id: Meteor.userId()
    }, {
      $set: {
        'services.saml.inResponseTo': request.id
      }
    });

    const _syncRequestToUrl = Meteor.wrapAsync(_saml.requestToUrl, _saml);

    const result = _syncRequestToUrl(request.request, 'logout');

    if (Accounts.saml.settings.debug) {
      console.log(`SAML Logout Request ${result}`);
    }

    return result;
  }

});
Accounts.registerLoginHandler(function (loginRequest) {
  if (!loginRequest.saml || !loginRequest.credentialToken) {
    return undefined;
  }

  const loginResult = Accounts.saml.retrieveCredential(loginRequest.credentialToken);

  if (Accounts.saml.settings.debug) {
    console.log(`RESULT :${JSON.stringify(loginResult)}`);
  }

  if (loginResult === undefined) {
    return {
      type: 'saml',
      error: new Meteor.Error(Accounts.LoginCancelledError.numericError, 'No matching login attempt found')
    };
  }

  if (loginResult && loginResult.profile && loginResult.profile.email) {
    const emailList = Array.isArray(loginResult.profile.email) ? loginResult.profile.email : [loginResult.profile.email];
    const emailRegex = new RegExp(emailList.map(email => `^${RegExp.escape(email)}$`).join('|'), 'i');
    let user = Meteor.users.findOne({
      'emails.address': emailRegex
    });

    if (!user) {
      const newUser = {
        name: loginResult.profile.cn || loginResult.profile.username,
        active: true,
        globalRoles: ['user'],
        emails: emailList.map(email => {
          return {
            address: email,
            verified: true
          };
        })
      };

      if (Accounts.saml.settings.generateUsername === true) {
        const username = RocketChat.generateUsernameSuggestion(newUser);

        if (username) {
          newUser.username = username;
        }
      } else if (loginResult.profile.username) {
        newUser.username = loginResult.profile.username;
      }

      const userId = Accounts.insertUserDoc({}, newUser);
      user = Meteor.users.findOne(userId);
    } //creating the token and adding to the user


    const stampedToken = Accounts._generateStampedLoginToken();

    Meteor.users.update(user, {
      $push: {
        'services.resume.loginTokens': stampedToken
      }
    });
    const samlLogin = {
      provider: Accounts.saml.RelayState,
      idp: loginResult.profile.issuer,
      idpSession: loginResult.profile.sessionIndex,
      nameID: loginResult.profile.nameID
    };
    Meteor.users.update({
      _id: user._id
    }, {
      $set: {
        // TBD this should be pushed, otherwise we're only able to SSO into a single IDP at a time
        'services.saml': samlLogin
      }
    }); //sending token along with the userId

    const result = {
      userId: user._id,
      token: stampedToken.token
    };
    return result;
  } else {
    throw new Error('SAML Profile did not contain an email address');
  }
});

Accounts.saml.hasCredential = function (credentialToken) {
  return RocketChat.models.CredentialTokens.findOneById(credentialToken) != null;
};

Accounts.saml.retrieveCredential = function (credentialToken) {
  // The credentialToken in all these functions corresponds to SAMLs inResponseTo field and is mandatory to check.
  const data = RocketChat.models.CredentialTokens.findOneById(credentialToken);

  if (data) {
    return data.userInfo;
  }
};

Accounts.saml.storeCredential = function (credentialToken, loginResult) {
  RocketChat.models.CredentialTokens.create(credentialToken, loginResult);
};

const closePopup = function (res, err) {
  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  let content = '<html><head><script>window.close()</script></head><body><H1>Verified</H1></body></html>';

  if (err) {
    content = `<html><body><h2>Sorry, an annoying error occured</h2><div>${err}</div><a onclick="window.close();">Close Window</a></body></html>`;
  }

  res.end(content, 'utf-8');
};

const samlUrlToObject = function (url) {
  // req.url will be '/_saml/<action>/<service name>/<credentialToken>'
  if (!url) {
    return null;
  }

  const splitUrl = url.split('?');
  const splitPath = splitUrl[0].split('/'); // Any non-saml request will continue down the default
  // middlewares.

  if (splitPath[1] !== '_saml') {
    return null;
  }

  const result = {
    actionName: splitPath[2],
    serviceName: splitPath[3],
    credentialToken: splitPath[4]
  };

  if (Accounts.saml.settings.debug) {
    console.log(result);
  }

  return result;
};

const middleware = function (req, res, next) {
  // Make sure to catch any exceptions because otherwise we'd crash
  // the runner
  try {
    const samlObject = samlUrlToObject(req.url);

    if (!samlObject || !samlObject.serviceName) {
      next();
      return;
    }

    if (!samlObject.actionName) {
      throw new Error('Missing SAML action');
    }

    console.log(Accounts.saml.settings.providers);
    console.log(samlObject.serviceName);

    const service = _.find(Accounts.saml.settings.providers, function (samlSetting) {
      return samlSetting.provider === samlObject.serviceName;
    }); // Skip everything if there's no service set by the saml middleware


    if (!service) {
      throw new Error(`Unexpected SAML service ${samlObject.serviceName}`);
    }

    let _saml;

    switch (samlObject.actionName) {
      case 'metadata':
        _saml = new SAML(service);
        service.callbackUrl = Meteor.absoluteUrl(`_saml/validate/${service.provider}`);
        res.writeHead(200);
        res.write(_saml.generateServiceProviderMetadata(service.callbackUrl));
        res.end(); //closePopup(res);

        break;

      case 'logout':
        // This is where we receive SAML LogoutResponse
        _saml = new SAML(service);

        _saml.validateLogoutResponse(req.query.SAMLResponse, function (err, result) {
          if (!err) {
            const logOutUser = function (inResponseTo) {
              if (Accounts.saml.settings.debug) {
                console.log(`Logging Out user via inResponseTo ${inResponseTo}`);
              }

              const loggedOutUser = Meteor.users.find({
                'services.saml.inResponseTo': inResponseTo
              }).fetch();

              if (loggedOutUser.length === 1) {
                if (Accounts.saml.settings.debug) {
                  console.log(`Found user ${loggedOutUser[0]._id}`);
                }

                Meteor.users.update({
                  _id: loggedOutUser[0]._id
                }, {
                  $set: {
                    'services.resume.loginTokens': []
                  }
                });
                Meteor.users.update({
                  _id: loggedOutUser[0]._id
                }, {
                  $unset: {
                    'services.saml': ''
                  }
                });
              } else {
                throw new Meteor.Error('Found multiple users matching SAML inResponseTo fields');
              }
            };

            fiber(function () {
              logOutUser(result);
            }).run();
            res.writeHead(302, {
              'Location': req.query.RelayState
            });
            res.end();
          } //  else {
          // 	// TBD thinking of sth meaning full.
          // }

        });

        break;

      case 'sloRedirect':
        res.writeHead(302, {
          // credentialToken here is the SAML LogOut Request that we'll send back to IDP
          'Location': req.query.redirect
        });
        res.end();
        break;

      case 'authorize':
        service.callbackUrl = Meteor.absoluteUrl(`_saml/validate/${service.provider}`);
        service.id = samlObject.credentialToken;
        _saml = new SAML(service);

        _saml.getAuthorizeUrl(req, function (err, url) {
          if (err) {
            throw new Error('Unable to generate authorize url');
          }

          res.writeHead(302, {
            'Location': url
          });
          res.end();
        });

        break;

      case 'validate':
        _saml = new SAML(service);
        Accounts.saml.RelayState = req.body.RelayState;

        _saml.validateResponse(req.body.SAMLResponse, req.body.RelayState, function (err, profile
        /*, loggedOut*/
        ) {
          if (err) {
            throw new Error(`Unable to validate response url: ${err}`);
          }

          const credentialToken = profile.inResponseToId && profile.inResponseToId.value || profile.inResponseToId || profile.InResponseTo || samlObject.credentialToken;
          const loginResult = {
            profile
          };

          if (!credentialToken) {
            // No credentialToken in IdP-initiated SSO
            const saml_idp_credentialToken = Random.id();
            Accounts.saml.storeCredential(saml_idp_credentialToken, loginResult);
            const url = `${Meteor.absoluteUrl('home')}?saml_idp_credentialToken=${saml_idp_credentialToken}`;
            res.writeHead(302, {
              'Location': url
            });
            res.end();
          } else {
            Accounts.saml.storeCredential(credentialToken, loginResult);
            closePopup(res);
          }
        });

        break;

      default:
        throw new Error(`Unexpected SAML action ${samlObject.actionName}`);
    }
  } catch (err) {
    closePopup(res, err);
  }
}; // Listen to incoming SAML http requests


WebApp.connectHandlers.use(connect.bodyParser()).use(function (req, res, next) {
  // Need to create a fiber since we're using synchronous http calls and nothing
  // else is wrapping this in a fiber automatically
  fiber(function () {
    middleware(req, res, next);
  }).run();
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saml_utils.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/steffo_meteor-accounts-saml/saml_utils.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let zlib;
module.watch(require("zlib"), {
  default(v) {
    zlib = v;
  }

}, 0);
let xmlCrypto;
module.watch(require("xml-crypto"), {
  default(v) {
    xmlCrypto = v;
  }

}, 1);
let crypto;
module.watch(require("crypto"), {
  default(v) {
    crypto = v;
  }

}, 2);
let xmldom;
module.watch(require("xmldom"), {
  default(v) {
    xmldom = v;
  }

}, 3);
let querystring;
module.watch(require("querystring"), {
  default(v) {
    querystring = v;
  }

}, 4);
let xmlbuilder;
module.watch(require("xmlbuilder"), {
  default(v) {
    xmlbuilder = v;
  }

}, 5);
let array2string;
module.watch(require("arraybuffer-to-string"), {
  default(v) {
    array2string = v;
  }

}, 6);

// var prefixMatch = new RegExp(/(?!xmlns)^.*:/);
SAML = function (options) {
  this.options = this.initialize(options);
};

function debugLog() {
  if (Meteor.settings.debug) {
    console.log.apply(this, arguments);
  }
} // var stripPrefix = function(str) {
// 	return str.replace(prefixMatch, '');
// };


SAML.prototype.initialize = function (options) {
  if (!options) {
    options = {};
  }

  if (!options.protocol) {
    options.protocol = 'https://';
  }

  if (!options.path) {
    options.path = '/saml/consume';
  }

  if (!options.issuer) {
    options.issuer = 'onelogin_saml';
  }

  if (options.identifierFormat === undefined) {
    options.identifierFormat = 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';
  }

  if (options.authnContext === undefined) {
    options.authnContext = 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport';
  }

  return options;
};

SAML.prototype.generateUniqueID = function () {
  const chars = 'abcdef0123456789';
  let uniqueID = 'id-';

  for (let i = 0; i < 20; i++) {
    uniqueID += chars.substr(Math.floor(Math.random() * 15), 1);
  }

  return uniqueID;
};

SAML.prototype.generateInstant = function () {
  return new Date().toISOString();
};

SAML.prototype.signRequest = function (xml) {
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(xml);
  return signer.sign(this.options.privateKey, 'base64');
};

SAML.prototype.generateAuthorizeRequest = function (req) {
  let id = `_${this.generateUniqueID()}`;
  const instant = this.generateInstant(); // Post-auth destination

  let callbackUrl;

  if (this.options.callbackUrl) {
    callbackUrl = this.options.callbackUrl;
  } else {
    callbackUrl = this.options.protocol + req.headers.host + this.options.path;
  }

  if (this.options.id) {
    id = this.options.id;
  }

  let request = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${id}" Version="2.0" IssueInstant="${instant}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="${callbackUrl}" Destination="${this.options.entryPoint}">` + `<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${this.options.issuer}</saml:Issuer>\n`;

  if (this.options.identifierFormat) {
    request += `<samlp:NameIDPolicy xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" Format="${this.options.identifierFormat}" AllowCreate="true"></samlp:NameIDPolicy>\n`;
  }

  request += '<samlp:RequestedAuthnContext xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" Comparison="exact">' + '<saml:AuthnContextClassRef xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></samlp:RequestedAuthnContext>\n' + '</samlp:AuthnRequest>';
  return request;
};

SAML.prototype.generateLogoutRequest = function (options) {
  // options should be of the form
  // nameId: <nameId as submitted during SAML SSO>
  // sessionIndex: sessionIndex
  // --- NO SAMLsettings: <Meteor.setting.saml  entry for the provider you want to SLO from
  const id = `_${this.generateUniqueID()}`;
  const instant = this.generateInstant();
  let request = `${'<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ' + 'xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="'}${id}" Version="2.0" IssueInstant="${instant}" Destination="${this.options.idpSLORedirectURL}">` + `<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${this.options.issuer}</saml:Issuer>` + `<saml:NameID Format="${this.options.identifierFormat}">${options.nameID}</saml:NameID>` + '</samlp:LogoutRequest>';
  request = `${'<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"  ' + 'ID="'}${id}" ` + 'Version="2.0" ' + `IssueInstant="${instant}" ` + `Destination="${this.options.idpSLORedirectURL}" ` + '>' + `<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${this.options.issuer}</saml:Issuer>` + '<saml:NameID xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ' + 'NameQualifier="http://id.init8.net:8080/openam" ' + `SPNameQualifier="${this.options.issuer}" ` + `Format="${this.options.identifierFormat}">${options.nameID}</saml:NameID>` + `<samlp:SessionIndex xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">${options.sessionIndex}</samlp:SessionIndex>` + '</samlp:LogoutRequest>';
  debugLog('------- SAML Logout request -----------');
  debugLog(request);
  return {
    request,
    id
  };
};

SAML.prototype.requestToUrl = function (request, operation, callback) {
  const self = this;
  zlib.deflateRaw(request, function (err, buffer) {
    if (err) {
      return callback(err);
    }

    const base64 = buffer.toString('base64');
    let target = self.options.entryPoint;

    if (operation === 'logout') {
      if (self.options.idpSLORedirectURL) {
        target = self.options.idpSLORedirectURL;
      }
    }

    if (target.indexOf('?') > 0) {
      target += '&';
    } else {
      target += '?';
    } // TBD. We should really include a proper RelayState here


    let relayState;

    if (operation === 'logout') {
      // in case of logout we want to be redirected back to the Meteor app.
      relayState = Meteor.absoluteUrl();
    } else {
      relayState = self.options.provider;
    }

    const samlRequest = {
      SAMLRequest: base64,
      RelayState: relayState
    };

    if (self.options.privateCert) {
      samlRequest.SigAlg = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
      samlRequest.Signature = self.signRequest(querystring.stringify(samlRequest));
    }

    target += querystring.stringify(samlRequest);
    debugLog(`requestToUrl: ${target}`);

    if (operation === 'logout') {
      // in case of logout we want to be redirected back to the Meteor app.
      return callback(null, target);
    } else {
      callback(null, target);
    }
  });
};

SAML.prototype.getAuthorizeUrl = function (req, callback) {
  const request = this.generateAuthorizeRequest(req);
  this.requestToUrl(request, 'authorize', callback);
};

SAML.prototype.getLogoutUrl = function (req, callback) {
  const request = this.generateLogoutRequest(req);
  this.requestToUrl(request, 'logout', callback);
};

SAML.prototype.certToPEM = function (cert) {
  cert = cert.match(/.{1,64}/g).join('\n');
  cert = `-----BEGIN CERTIFICATE-----\n${cert}`;
  cert = `${cert}\n-----END CERTIFICATE-----\n`;
  return cert;
}; // functionfindChilds(node, localName, namespace) {
// 	var res = [];
// 	for (var i = 0; i < node.childNodes.length; i++) {
// 		var child = node.childNodes[i];
// 		if (child.localName === localName && (child.namespaceURI === namespace || !namespace)) {
// 			res.push(child);
// 		}
// 	}
// 	return res;
// }


SAML.prototype.validateStatus = function (doc) {
  let successStatus = false;
  let status = '';
  let messageText = '';
  const statusNodes = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'StatusCode');

  if (statusNodes.length) {
    const statusNode = statusNodes[0];
    const statusMessage = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'StatusMessage')[0];

    if (statusMessage) {
      messageText = statusMessage.firstChild.textContent;
    }

    status = statusNode.getAttribute('Value');

    if (status === 'urn:oasis:names:tc:SAML:2.0:status:Success') {
      successStatus = true;
    }
  }

  return {
    success: successStatus,
    message: messageText,
    statusCode: status
  };
};

SAML.prototype.validateSignature = function (xml, cert) {
  const self = this;
  const doc = new xmldom.DOMParser().parseFromString(xml);
  const signature = xmlCrypto.xpath(doc, '//*[local-name(.)=\'Signature\' and namespace-uri(.)=\'http://www.w3.org/2000/09/xmldsig#\']')[0];
  const sig = new xmlCrypto.SignedXml();
  sig.keyInfoProvider = {
    getKeyInfo()
    /*key*/
    {
      return '<X509Data></X509Data>';
    },

    getKey()
    /*keyInfo*/
    {
      return self.certToPEM(cert);
    }

  };
  sig.loadSignature(signature);
  return sig.checkSignature(xml);
};

SAML.prototype.validateLogoutResponse = function (samlResponse, callback) {
  const self = this;
  const compressedSAMLResponse = new Buffer(samlResponse, 'base64');
  zlib.inflateRaw(compressedSAMLResponse, function (err, decoded) {
    if (err) {
      debugLog(`Error while inflating. ${err}`);
    } else {
      console.log(`constructing new DOM parser: ${Object.prototype.toString.call(decoded)}`);
      console.log(`>>>> ${decoded}`);
      const doc = new xmldom.DOMParser().parseFromString(array2string(decoded), 'text/xml');

      if (doc) {
        const response = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'LogoutResponse')[0];

        if (response) {
          // TBD. Check if this msg corresponds to one we sent
          let inResponseTo;

          try {
            inResponseTo = response.getAttribute('InResponseTo');
            debugLog(`In Response to: ${inResponseTo}`);
          } catch (e) {
            if (Meteor.settings.debug) {
              console.log(`Caught error: ${e}`);
              const msg = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'StatusMessage');
              console.log(`Unexpected msg from IDP. Does your session still exist at IDP? Idp returned: \n ${msg}`);
            }
          }

          const statusValidateObj = self.validateStatus(doc);

          if (statusValidateObj.success) {
            callback(null, inResponseTo);
          } else {
            callback('Error. Logout not confirmed by IDP', null);
          }
        } else {
          callback('No Response Found', null);
        }
      }
    }
  });
};

SAML.prototype.mapAttributes = function (attributeStatement, profile) {
  debugLog(`Attribute Statement found in SAML response: ${attributeStatement}`);
  const attributes = attributeStatement.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Attribute');
  debugLog(`Attributes will be processed: ${attributes.length}`);

  if (attributes) {
    for (let i = 0; i < attributes.length; i++) {
      const values = attributes[i].getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeValue');
      let value;

      if (values.length === 1) {
        value = values[0].textContent;
      } else {
        value = [];

        for (let j = 0; j < values.length; j++) {
          value.push(values[j].textContent);
        }
      }

      const key = attributes[i].getAttribute('Name');
      debugLog(`Name:  ${attributes[i]}`);
      debugLog(`Adding attribute from SAML response to profile: ${key} = ${value}`);
      profile[key] = value;
    }
  } else {
    debugLog('No Attributes found in SAML attribute statement.');
  }

  if (!profile.mail && profile['urn:oid:0.9.2342.19200300.100.1.3']) {
    // See http://www.incommonfederation.org/attributesummary.html for definition of attribute OIDs
    profile.mail = profile['urn:oid:0.9.2342.19200300.100.1.3'];
  }

  if (!profile.email && profile['urn:oid:1.2.840.113549.1.9.1']) {
    profile.email = profile['urn:oid:1.2.840.113549.1.9.1'];
  }

  if (!profile.email && profile.mail) {
    profile.email = profile.mail;
  }
};

SAML.prototype.validateResponse = function (samlResponse, relayState, callback) {
  const self = this;
  const xml = new Buffer(samlResponse, 'base64').toString('utf8'); // We currently use RelayState to save SAML provider

  debugLog(`Validating response with relay state: ${xml}`);
  const doc = new xmldom.DOMParser().parseFromString(xml, 'text/xml');

  if (doc) {
    debugLog('Verify status');
    const statusValidateObj = self.validateStatus(doc);

    if (statusValidateObj.success) {
      debugLog('Status ok'); // Verify signature

      debugLog('Verify signature');

      if (self.options.cert && !self.validateSignature(xml, self.options.cert)) {
        debugLog('Signature WRONG');
        return callback(new Error('Invalid signature'), null, false);
      }

      debugLog('Signature OK');
      const response = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'Response')[0];

      if (response) {
        debugLog('Got response');
        const assertion = response.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Assertion')[0];

        if (!assertion) {
          return callback(new Error('Missing SAML assertion'), null, false);
        }

        const profile = {};

        if (response.hasAttribute('InResponseTo')) {
          profile.inResponseToId = response.getAttribute('InResponseTo');
        }

        const issuer = assertion.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Issuer')[0];

        if (issuer) {
          profile.issuer = issuer.textContent;
        }

        const subject = assertion.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Subject')[0];

        if (subject) {
          const nameID = subject.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'NameID')[0];

          if (nameID) {
            profile.nameID = nameID.textContent;

            if (nameID.hasAttribute('Format')) {
              profile.nameIDFormat = nameID.getAttribute('Format');
            }
          }
        }

        const authnStatement = assertion.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AuthnStatement')[0];

        if (authnStatement) {
          if (authnStatement.hasAttribute('SessionIndex')) {
            profile.sessionIndex = authnStatement.getAttribute('SessionIndex');
            debugLog(`Session Index: ${profile.sessionIndex}`);
          } else {
            debugLog('No Session Index Found');
          }
        } else {
          debugLog('No AuthN Statement found');
        }

        const attributeStatement = assertion.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeStatement')[0];

        if (attributeStatement) {
          this.mapAttributes(attributeStatement, profile);
        } else {
          debugLog('No Attribute Statement found in SAML response.');
        }

        if (!profile.email && profile.nameID && profile.nameIDFormat && profile.nameIDFormat.indexOf('emailAddress') >= 0) {
          profile.email = profile.nameID;
        }

        const profileKeys = Object.keys(profile);

        for (let i = 0; i < profileKeys.length; i++) {
          const key = profileKeys[i];

          if (key.match(/\./)) {
            profile[key.replace(/\./g, '-')] = profile[key];
            delete profile[key];
          }
        }

        debugLog(`NameID: ${JSON.stringify(profile)}`);
        callback(null, profile, false);
      } else {
        const logoutResponse = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'LogoutResponse');

        if (logoutResponse) {
          callback(null, null, true);
        } else {
          return callback(new Error('Unknown SAML response message'), null, false);
        }
      }
    } else {
      return callback(new Error(`Status is:  ${statusValidateObj.statusCode}`), null, false);
    }
  }
};

let decryptionCert;

SAML.prototype.generateServiceProviderMetadata = function (callbackUrl) {
  if (!decryptionCert) {
    decryptionCert = this.options.privateCert;
  }

  if (!this.options.callbackUrl && !callbackUrl) {
    throw new Error('Unable to generate service provider metadata when callbackUrl option is not set');
  }

  const metadata = {
    'EntityDescriptor': {
      '@xmlns': 'urn:oasis:names:tc:SAML:2.0:metadata',
      '@xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
      '@entityID': this.options.issuer,
      'SPSSODescriptor': {
        '@protocolSupportEnumeration': 'urn:oasis:names:tc:SAML:2.0:protocol',
        'SingleLogoutService': {
          '@Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
          '@Location': `${Meteor.absoluteUrl()}_saml/logout/${this.options.provider}/`,
          '@ResponseLocation': `${Meteor.absoluteUrl()}_saml/logout/${this.options.provider}/`
        },
        'NameIDFormat': this.options.identifierFormat,
        'AssertionConsumerService': {
          '@index': '1',
          '@isDefault': 'true',
          '@Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
          '@Location': callbackUrl
        }
      }
    }
  };

  if (this.options.privateKey) {
    if (!decryptionCert) {
      throw new Error('Missing decryptionCert while generating metadata for decrypting service provider');
    }

    decryptionCert = decryptionCert.replace(/-+BEGIN CERTIFICATE-+\r?\n?/, '');
    decryptionCert = decryptionCert.replace(/-+END CERTIFICATE-+\r?\n?/, '');
    decryptionCert = decryptionCert.replace(/\r\n/g, '\n');
    metadata['EntityDescriptor']['SPSSODescriptor']['KeyDescriptor'] = {
      'ds:KeyInfo': {
        'ds:X509Data': {
          'ds:X509Certificate': {
            '#text': decryptionCert
          }
        }
      },
      'EncryptionMethod': [// this should be the set that the xmlenc library supports
      {
        '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#aes256-cbc'
      }, {
        '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#aes128-cbc'
      }, {
        '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#tripledes-cbc'
      }]
    };
  }

  return xmlbuilder.create(metadata).end({
    pretty: true,
    indent: '  ',
    newline: '\n'
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saml_rocketchat.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/steffo_meteor-accounts-saml/saml_rocketchat.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  updateServices: () => updateServices,
  configureSamlService: () => configureSamlService,
  getSamlConfigs: () => getSamlConfigs,
  debounce: () => debounce,
  logger: () => logger
});
const logger = new Logger('steffo:meteor-accounts-saml', {
  methods: {
    updated: {
      type: 'info'
    }
  }
});
RocketChat.settings.addGroup('SAML');
Meteor.methods({
  addSamlService(name) {
    RocketChat.settings.add(`SAML_Custom_${name}`, false, {
      type: 'boolean',
      group: 'SAML',
      section: name,
      i18nLabel: 'Accounts_OAuth_Custom_Enable'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_provider`, 'provider-name', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Provider'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_entry_point`, 'https://example.com/simplesaml/saml2/idp/SSOService.php', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Entry_point'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_idp_slo_redirect_url`, 'https://example.com/simplesaml/saml2/idp/SingleLogoutService.php', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_IDP_SLO_Redirect_URL'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_issuer`, 'https://your-rocket-chat/_saml/metadata/provider-name', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Issuer'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_cert`, '', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Cert',
      multiline: true
    });
    RocketChat.settings.add(`SAML_Custom_${name}_public_cert`, '', {
      type: 'string',
      group: 'SAML',
      section: name,
      multiline: true,
      i18nLabel: 'SAML_Custom_Public_Cert'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_private_key`, '', {
      type: 'string',
      group: 'SAML',
      section: name,
      multiline: true,
      i18nLabel: 'SAML_Custom_Private_Key'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_button_label_text`, '', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'Accounts_OAuth_Custom_Button_Label_Text'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_button_label_color`, '#FFFFFF', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'Accounts_OAuth_Custom_Button_Label_Color'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_button_color`, '#13679A', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'Accounts_OAuth_Custom_Button_Color'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_generate_username`, false, {
      type: 'boolean',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Generate_Username'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_logout_behaviour`, 'SAML', {
      type: 'select',
      values: [{
        key: 'SAML',
        i18nLabel: 'SAML_Custom_Logout_Behaviour_Terminate_SAML_Session'
      }, {
        key: 'Local',
        i18nLabel: 'SAML_Custom_Logout_Behaviour_End_Only_RocketChat'
      }],
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Logout_Behaviour'
    });
  }

});

const getSamlConfigs = function (service) {
  return {
    buttonLabelText: RocketChat.settings.get(`${service.key}_button_label_text`),
    buttonLabelColor: RocketChat.settings.get(`${service.key}_button_label_color`),
    buttonColor: RocketChat.settings.get(`${service.key}_button_color`),
    clientConfig: {
      provider: RocketChat.settings.get(`${service.key}_provider`)
    },
    entryPoint: RocketChat.settings.get(`${service.key}_entry_point`),
    idpSLORedirectURL: RocketChat.settings.get(`${service.key}_idp_slo_redirect_url`),
    generateUsername: RocketChat.settings.get(`${service.key}_generate_username`),
    issuer: RocketChat.settings.get(`${service.key}_issuer`),
    logoutBehaviour: RocketChat.settings.get(`${service.key}_logout_behaviour`),
    secret: {
      privateKey: RocketChat.settings.get(`${service.key}_private_key`),
      publicCert: RocketChat.settings.get(`${service.key}_public_cert`),
      cert: RocketChat.settings.get(`${service.key}_cert`)
    }
  };
};

const debounce = (fn, delay) => {
  let timer = null;
  return () => {
    if (timer != null) {
      Meteor.clearTimeout(timer);
    }

    return timer = Meteor.setTimeout(fn, delay);
  };
};

const serviceName = 'saml';

const configureSamlService = function (samlConfigs) {
  let privateCert = false;
  let privateKey = false;

  if (samlConfigs.secret.privateKey && samlConfigs.secret.publicCert) {
    privateKey = samlConfigs.secret.privateKey;
    privateCert = samlConfigs.secret.publicCert;
  } else if (samlConfigs.secret.privateKey || samlConfigs.secret.publicCert) {
    logger.error('You must specify both cert and key files.');
  } // TODO: the function configureSamlService is called many times and Accounts.saml.settings.generateUsername keeps just the last value


  Accounts.saml.settings.generateUsername = samlConfigs.generateUsername;
  return {
    provider: samlConfigs.clientConfig.provider,
    entryPoint: samlConfigs.entryPoint,
    idpSLORedirectURL: samlConfigs.idpSLORedirectURL,
    issuer: samlConfigs.issuer,
    cert: samlConfigs.secret.cert,
    privateCert,
    privateKey
  };
};

const updateServices = debounce(() => {
  const services = RocketChat.settings.get(/^(SAML_Custom_)[a-z]+$/i);
  Accounts.saml.settings.providers = services.map(service => {
    if (service.value === true) {
      const samlConfigs = getSamlConfigs(service);
      logger.updated(service.key);
      ServiceConfiguration.configurations.upsert({
        service: serviceName.toLowerCase()
      }, {
        $set: samlConfigs
      });
      return configureSamlService(samlConfigs);
    } else {
      ServiceConfiguration.configurations.remove({
        service: serviceName.toLowerCase()
      });
    }
  }).filter(e => e);
}, 2000);
RocketChat.settings.get(/^SAML_.+/, updateServices);
Meteor.startup(() => {
  return Meteor.call('addSamlService', 'Default');
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/steffo:meteor-accounts-saml/saml_server.js");
require("/node_modules/meteor/steffo:meteor-accounts-saml/saml_utils.js");
require("/node_modules/meteor/steffo:meteor-accounts-saml/saml_rocketchat.js");

/* Exports */
Package._define("steffo:meteor-accounts-saml");

})();

//# sourceURL=meteor://💻app/packages/steffo_meteor-accounts-saml.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RlZmZvOm1ldGVvci1hY2NvdW50cy1zYW1sL3NhbWxfc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zdGVmZm86bWV0ZW9yLWFjY291bnRzLXNhbWwvc2FtbF91dGlscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RlZmZvOm1ldGVvci1hY2NvdW50cy1zYW1sL3NhbWxfcm9ja2V0Y2hhdC5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJmaWJlciIsImNvbm5lY3QiLCJBY2NvdW50cyIsInNhbWwiLCJzZXR0aW5ncyIsImRlYnVnIiwiZ2VuZXJhdGVVc2VybmFtZSIsInByb3ZpZGVycyIsIlJvdXRlUG9saWN5IiwiZGVjbGFyZSIsImdldFNhbWxQcm92aWRlckNvbmZpZyIsInByb3ZpZGVyIiwiTWV0ZW9yIiwiRXJyb3IiLCJtZXRob2QiLCJzYW1sUHJvdmlkZXIiLCJlbGVtZW50IiwiZmlsdGVyIiwibWV0aG9kcyIsInNhbWxMb2dvdXQiLCJ1c2VySWQiLCJwcm92aWRlckNvbmZpZyIsImNvbnNvbGUiLCJsb2ciLCJKU09OIiwic3RyaW5naWZ5IiwidXNlciIsInVzZXJzIiwiZmluZE9uZSIsIl9pZCIsIm5hbWVJRCIsInNlcnZpY2VzIiwic2Vzc2lvbkluZGV4IiwiaWRwU2Vzc2lvbiIsIl9zYW1sIiwiU0FNTCIsInJlcXVlc3QiLCJnZW5lcmF0ZUxvZ291dFJlcXVlc3QiLCJ1cGRhdGUiLCIkc2V0IiwiaWQiLCJfc3luY1JlcXVlc3RUb1VybCIsIndyYXBBc3luYyIsInJlcXVlc3RUb1VybCIsInJlc3VsdCIsInJlZ2lzdGVyTG9naW5IYW5kbGVyIiwibG9naW5SZXF1ZXN0IiwiY3JlZGVudGlhbFRva2VuIiwidW5kZWZpbmVkIiwibG9naW5SZXN1bHQiLCJyZXRyaWV2ZUNyZWRlbnRpYWwiLCJ0eXBlIiwiZXJyb3IiLCJMb2dpbkNhbmNlbGxlZEVycm9yIiwibnVtZXJpY0Vycm9yIiwicHJvZmlsZSIsImVtYWlsIiwiZW1haWxMaXN0IiwiQXJyYXkiLCJpc0FycmF5IiwiZW1haWxSZWdleCIsIlJlZ0V4cCIsIm1hcCIsImVzY2FwZSIsImpvaW4iLCJuZXdVc2VyIiwibmFtZSIsImNuIiwidXNlcm5hbWUiLCJhY3RpdmUiLCJnbG9iYWxSb2xlcyIsImVtYWlscyIsImFkZHJlc3MiLCJ2ZXJpZmllZCIsIlJvY2tldENoYXQiLCJnZW5lcmF0ZVVzZXJuYW1lU3VnZ2VzdGlvbiIsImluc2VydFVzZXJEb2MiLCJzdGFtcGVkVG9rZW4iLCJfZ2VuZXJhdGVTdGFtcGVkTG9naW5Ub2tlbiIsIiRwdXNoIiwic2FtbExvZ2luIiwiUmVsYXlTdGF0ZSIsImlkcCIsImlzc3VlciIsInRva2VuIiwiaGFzQ3JlZGVudGlhbCIsIm1vZGVscyIsIkNyZWRlbnRpYWxUb2tlbnMiLCJmaW5kT25lQnlJZCIsImRhdGEiLCJ1c2VySW5mbyIsInN0b3JlQ3JlZGVudGlhbCIsImNyZWF0ZSIsImNsb3NlUG9wdXAiLCJyZXMiLCJlcnIiLCJ3cml0ZUhlYWQiLCJjb250ZW50IiwiZW5kIiwic2FtbFVybFRvT2JqZWN0IiwidXJsIiwic3BsaXRVcmwiLCJzcGxpdCIsInNwbGl0UGF0aCIsImFjdGlvbk5hbWUiLCJzZXJ2aWNlTmFtZSIsIm1pZGRsZXdhcmUiLCJyZXEiLCJuZXh0Iiwic2FtbE9iamVjdCIsInNlcnZpY2UiLCJmaW5kIiwic2FtbFNldHRpbmciLCJjYWxsYmFja1VybCIsImFic29sdXRlVXJsIiwid3JpdGUiLCJnZW5lcmF0ZVNlcnZpY2VQcm92aWRlck1ldGFkYXRhIiwidmFsaWRhdGVMb2dvdXRSZXNwb25zZSIsInF1ZXJ5IiwiU0FNTFJlc3BvbnNlIiwibG9nT3V0VXNlciIsImluUmVzcG9uc2VUbyIsImxvZ2dlZE91dFVzZXIiLCJmZXRjaCIsImxlbmd0aCIsIiR1bnNldCIsInJ1biIsInJlZGlyZWN0IiwiZ2V0QXV0aG9yaXplVXJsIiwiYm9keSIsInZhbGlkYXRlUmVzcG9uc2UiLCJpblJlc3BvbnNlVG9JZCIsInZhbHVlIiwiSW5SZXNwb25zZVRvIiwic2FtbF9pZHBfY3JlZGVudGlhbFRva2VuIiwiUmFuZG9tIiwiV2ViQXBwIiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwiYm9keVBhcnNlciIsInpsaWIiLCJ4bWxDcnlwdG8iLCJjcnlwdG8iLCJ4bWxkb20iLCJxdWVyeXN0cmluZyIsInhtbGJ1aWxkZXIiLCJhcnJheTJzdHJpbmciLCJvcHRpb25zIiwiaW5pdGlhbGl6ZSIsImRlYnVnTG9nIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJwcm90b3R5cGUiLCJwcm90b2NvbCIsInBhdGgiLCJpZGVudGlmaWVyRm9ybWF0IiwiYXV0aG5Db250ZXh0IiwiZ2VuZXJhdGVVbmlxdWVJRCIsImNoYXJzIiwidW5pcXVlSUQiLCJpIiwic3Vic3RyIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiZ2VuZXJhdGVJbnN0YW50IiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwic2lnblJlcXVlc3QiLCJ4bWwiLCJzaWduZXIiLCJjcmVhdGVTaWduIiwic2lnbiIsInByaXZhdGVLZXkiLCJnZW5lcmF0ZUF1dGhvcml6ZVJlcXVlc3QiLCJpbnN0YW50IiwiaGVhZGVycyIsImhvc3QiLCJlbnRyeVBvaW50IiwiaWRwU0xPUmVkaXJlY3RVUkwiLCJvcGVyYXRpb24iLCJjYWxsYmFjayIsInNlbGYiLCJkZWZsYXRlUmF3IiwiYnVmZmVyIiwiYmFzZTY0IiwidG9TdHJpbmciLCJ0YXJnZXQiLCJpbmRleE9mIiwicmVsYXlTdGF0ZSIsInNhbWxSZXF1ZXN0IiwiU0FNTFJlcXVlc3QiLCJwcml2YXRlQ2VydCIsIlNpZ0FsZyIsIlNpZ25hdHVyZSIsImdldExvZ291dFVybCIsImNlcnRUb1BFTSIsImNlcnQiLCJtYXRjaCIsInZhbGlkYXRlU3RhdHVzIiwiZG9jIiwic3VjY2Vzc1N0YXR1cyIsInN0YXR1cyIsIm1lc3NhZ2VUZXh0Iiwic3RhdHVzTm9kZXMiLCJnZXRFbGVtZW50c0J5VGFnTmFtZU5TIiwic3RhdHVzTm9kZSIsInN0YXR1c01lc3NhZ2UiLCJmaXJzdENoaWxkIiwidGV4dENvbnRlbnQiLCJnZXRBdHRyaWJ1dGUiLCJzdWNjZXNzIiwibWVzc2FnZSIsInN0YXR1c0NvZGUiLCJ2YWxpZGF0ZVNpZ25hdHVyZSIsIkRPTVBhcnNlciIsInBhcnNlRnJvbVN0cmluZyIsInNpZ25hdHVyZSIsInhwYXRoIiwic2lnIiwiU2lnbmVkWG1sIiwia2V5SW5mb1Byb3ZpZGVyIiwiZ2V0S2V5SW5mbyIsImdldEtleSIsImxvYWRTaWduYXR1cmUiLCJjaGVja1NpZ25hdHVyZSIsInNhbWxSZXNwb25zZSIsImNvbXByZXNzZWRTQU1MUmVzcG9uc2UiLCJCdWZmZXIiLCJpbmZsYXRlUmF3IiwiZGVjb2RlZCIsIk9iamVjdCIsImNhbGwiLCJyZXNwb25zZSIsImUiLCJtc2ciLCJzdGF0dXNWYWxpZGF0ZU9iaiIsIm1hcEF0dHJpYnV0ZXMiLCJhdHRyaWJ1dGVTdGF0ZW1lbnQiLCJhdHRyaWJ1dGVzIiwidmFsdWVzIiwiaiIsInB1c2giLCJrZXkiLCJtYWlsIiwiYXNzZXJ0aW9uIiwiaGFzQXR0cmlidXRlIiwic3ViamVjdCIsIm5hbWVJREZvcm1hdCIsImF1dGhuU3RhdGVtZW50IiwicHJvZmlsZUtleXMiLCJrZXlzIiwicmVwbGFjZSIsImxvZ291dFJlc3BvbnNlIiwiZGVjcnlwdGlvbkNlcnQiLCJtZXRhZGF0YSIsInByZXR0eSIsImluZGVudCIsIm5ld2xpbmUiLCJleHBvcnQiLCJ1cGRhdGVTZXJ2aWNlcyIsImNvbmZpZ3VyZVNhbWxTZXJ2aWNlIiwiZ2V0U2FtbENvbmZpZ3MiLCJkZWJvdW5jZSIsImxvZ2dlciIsIkxvZ2dlciIsInVwZGF0ZWQiLCJhZGRHcm91cCIsImFkZFNhbWxTZXJ2aWNlIiwiYWRkIiwiZ3JvdXAiLCJzZWN0aW9uIiwiaTE4bkxhYmVsIiwibXVsdGlsaW5lIiwiYnV0dG9uTGFiZWxUZXh0IiwiZ2V0IiwiYnV0dG9uTGFiZWxDb2xvciIsImJ1dHRvbkNvbG9yIiwiY2xpZW50Q29uZmlnIiwibG9nb3V0QmVoYXZpb3VyIiwic2VjcmV0IiwicHVibGljQ2VydCIsImZuIiwiZGVsYXkiLCJ0aW1lciIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJzYW1sQ29uZmlncyIsIlNlcnZpY2VDb25maWd1cmF0aW9uIiwiY29uZmlndXJhdGlvbnMiLCJ1cHNlcnQiLCJ0b0xvd2VyQ2FzZSIsInJlbW92ZSIsInN0YXJ0dXAiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFBd0QsSUFBSUMsS0FBSjtBQUFVTCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsUUFBUixDQUFiLEVBQStCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDQyxZQUFNRCxDQUFOO0FBQVE7O0FBQXBCLENBQS9CLEVBQXFELENBQXJEO0FBQXdELElBQUlFLE9BQUo7QUFBWU4sT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFNBQVIsQ0FBYixFQUFnQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0UsY0FBUUYsQ0FBUjtBQUFVOztBQUF0QixDQUFoQyxFQUF3RCxDQUF4RDs7QUFJNUksSUFBSSxDQUFDRyxTQUFTQyxJQUFkLEVBQW9CO0FBQ25CRCxXQUFTQyxJQUFULEdBQWdCO0FBQ2ZDLGNBQVU7QUFDVEMsYUFBTyxJQURFO0FBRVRDLHdCQUFrQixLQUZUO0FBR1RDLGlCQUFXO0FBSEY7QUFESyxHQUFoQjtBQU9BOztBQUlEQyxZQUFZQyxPQUFaLENBQW9CLFNBQXBCLEVBQStCLFNBQS9CO0FBRUE7Ozs7QUFHQSxTQUFTQyxxQkFBVCxDQUErQkMsUUFBL0IsRUFBeUM7QUFDeEMsTUFBSSxDQUFFQSxRQUFOLEVB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QkcsU0FBUyxNQUFNO0FBQ3JDLFFBQU14TyxXQUFXMkMsV0FBV3RFLFFBQVgsQ0FBb0IrUSxHQUFwQixDQUF3Qix5QkFBeEIsQ0FBakI7QUFDQWpSLFdBQVNDLElBQVQsQ0FBY0MsUUFBZCxDQUF1QkcsU0FBdkIsR0FBbUN3QixTQUFTK0IsR0FBVCxDQUFjZ0QsT0FBRCxJQUFhO0FBQzVELFFBQUlBLFFBQVFzQixLQUFSLEtBQWtCLElBQXRCLEVBQTRCO0FBQzNCLFlBQU0ySixjQUFjekIsZUFBZXhKLE9BQWYsQ0FBcEI7QUFDQTBKLGFBQU9FLE9BQVAsQ0FBZTVKLFFBQVFxSSxHQUF2QjtBQUNBNkMsMkJBQXFCQyxjQUFyQixDQUFvQ0MsTUFBcEMsQ0FBMkM7QUFDMUNwTCxpQkFBU0wsWUFBWTBMLFdBQVo7QUFEaUMsT0FBM0MsRUFFRztBQUNGNVAsY0FBTXdQO0FBREosT0FGSDtBQUtBLGFBQU8xQixxQkFBcUIwQixXQUFyQixDQUFQO0FBQ0EsS0FURCxNQVNPO0FBQ05DLDJCQUFxQkMsY0FBckIsQ0FBb0NHLE1BQXBDLENBQTJDO0FBQzFDdEwsaUJBQVNMLFlBQVkwTCxXQUFaO0FBRGlDLE9BQTNDO0FBR0E7QUFDRCxHQWZrQyxFQWVoQ2xSLE1BZmdDLENBZXpCeU4sS0FBS0EsQ0Fmb0IsQ0FBbkM7QUFnQkEsQ0FsQnNCLEVBa0JwQixJQWxCb0IsQ0FBdkI7QUFxQkFoSyxXQUFXdEUsUUFBWCxDQUFvQitRLEdBQXBCLENBQXdCLFVBQXhCLEVBQW9DZixjQUFwQztBQUVBeFAsT0FBT3lSLE9BQVAsQ0FBZSxNQUFNO0FBQ3BCLFNBQU96UixPQUFPNE4sSUFBUCxDQUFZLGdCQUFaLEVBQThCLFNBQTlCLENBQVA7QUFDQSxDQUZELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3N0ZWZmb19tZXRlb3ItYWNjb3VudHMtc2FtbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbHMgUm91dGVQb2xpY3ksIFNBTUwgKi9cbi8qIGpzaGludCBuZXdjYXA6IGZhbHNlICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuaWYgKCFBY2NvdW50cy5zYW1sKSB7XG5cdEFjY291bnRzLnNhbWwgPSB7XG5cdFx0c2V0dGluZ3M6IHtcblx0XHRcdGRlYnVnOiB0cnVlLFxuXHRcdFx0Z2VuZXJhdGVVc2VybmFtZTogZmFsc2UsXG5cdFx0XHRwcm92aWRlcnM6IFtdXG5cdFx0fVxuXHR9O1xufVxuXG5pbXBvcnQgZmliZXIgZnJvbSAnZmliZXJzJztcbmltcG9ydCBjb25uZWN0IGZyb20gJ2Nvbm5lY3QnO1xuUm91dGVQb2xpY3kuZGVjbGFyZSgnL19zYW1sLycsICduZXR3b3JrJyk7XG5cbi8qKlxuICogRmV0Y2ggU0FNTCBwcm92aWRlciBjb25maWdzIGZvciBnaXZlbiAncHJvdmlkZXInLlxuICovXG5mdW5jdGlvbiBnZXRTYW1sUHJvdmlkZXJDb25maWcocHJvdmlkZXIpIHtcblx0aWYgKCEgcHJvdmlkZXIpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCduby1zYW1sLXByb3ZpZGVyJyxcblx0XHRcdCdTQU1MIGludGVybmFsIGVycm9yJyxcblx0XHRcdHsgbWV0aG9kOiAnZ2V0U2FtbFByb3ZpZGVyQ29uZmlnJyB9KTtcblx0fVxuXHRjb25zdCBzYW1sUHJvdmlkZXIgPSBmdW5jdGlvbihlbGVtZW50KSB7XG5cdFx0cmV0dXJuIChlbGVtZW50LnByb3ZpZGVyID09PSBwcm92aWRlcik7XG5cdH07XG5cdHJldHVybiBBY2NvdW50cy5zYW1sLnNldHRpbmdzLnByb3ZpZGVycy5maWx0ZXIoc2FtbFByb3ZpZGVyKVswXTtcbn1cblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRzYW1sTG9nb3V0KHByb3ZpZGVyKSB7XG5cdFx0Ly8gTWFrZSBzdXJlIHRoZSB1c2VyIGlzIGxvZ2dlZCBpbiBiZWZvcmUgaW5pdGlhdGUgU0FNTCBTTE9cblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnc2FtbExvZ291dCcgfSk7XG5cdFx0fVxuXHRcdGNvbnN0IHByb3ZpZGVyQ29uZmlnID0gZ2V0U2FtbFByb3ZpZGVyQ29uZmlnKHByb3ZpZGVyKTtcblxuXHRcdGlmIChBY2NvdW50cy5zYW1sLnNldHRpbmdzLmRlYnVnKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhgTG9nb3V0IHJlcXVlc3QgZnJvbSAkeyBKU09OLnN0cmluZ2lmeShwcm92aWRlckNvbmZpZykgfWApO1xuXHRcdH1cblx0XHQvLyBUaGlzIHF1ZXJ5IHNob3VsZCByZXNwZWN0IHVwY29taW5nIGFycmF5IG9mIFNBTUwgbG9naW5zXG5cdFx0Y29uc3QgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHtcblx0XHRcdF9pZDogTWV0ZW9yLnVzZXJJZCgpLFxuXHRcdFx0J3NlcnZpY2VzLnNhbWwucHJvdmlkZXInOiBwcm92aWRlclxuXHRcdH0sIHtcblx0XHRcdCdzZXJ2aWNlcy5zYW1sJzogMVxuXHRcdH0pO1xuXHRcdGxldCBuYW1lSUQgPSB1c2VyLnNlcnZpY2VzLnNhbWwubmFtZUlEO1xuXHRcdGNvbnN0IHNlc3Npb25JbmRleCA9IHVzZXIuc2VydmljZXMuc2FtbC5pZHBTZXNzaW9uO1xuXHRcdG5hbWVJRCA9IHNlc3Npb25JbmRleDtcblx0XHRpZiAoQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5kZWJ1Zykge1xuXHRcdFx0Y29uc29sZS5sb2coYE5hbWVJRCBmb3IgdXNlciAkeyBNZXRlb3IudXNlcklkKCkgfSBmb3VuZDogJHsgSlNPTi5zdHJpbmdpZnkobmFtZUlEKSB9YCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgX3NhbWwgPSBuZXcgU0FNTChwcm92aWRlckNvbmZpZyk7XG5cblx0XHRjb25zdCByZXF1ZXN0ID0gX3NhbWwuZ2VuZXJhdGVMb2dvdXRSZXF1ZXN0KHtcblx0XHRcdG5hbWVJRCxcblx0XHRcdHNlc3Npb25JbmRleFxuXHRcdH0pO1xuXG5cdFx0Ly8gcmVxdWVzdC5yZXF1ZXN0OiBhY3R1YWwgWE1MIFNBTUwgUmVxdWVzdFxuXHRcdC8vIHJlcXVlc3QuaWQ6IGNvbW1pbnVjYXRpb24gaWQgd2hpY2ggd2lsbCBiZSBtZW50aW9uZWQgaW4gdGhlIFJlc3BvbnNlVG8gZmllbGQgb2YgU0FNTFJlc3BvbnNlXG5cblx0XHRNZXRlb3IudXNlcnMudXBkYXRlKHtcblx0XHRcdF9pZDogTWV0ZW9yLnVzZXJJZCgpXG5cdFx0fSwge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHQnc2VydmljZXMuc2FtbC5pblJlc3BvbnNlVG8nOiByZXF1ZXN0LmlkXG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRjb25zdCBfc3luY1JlcXVlc3RUb1VybCA9IE1ldGVvci53cmFwQXN5bmMoX3NhbWwucmVxdWVzdFRvVXJsLCBfc2FtbCk7XG5cdFx0Y29uc3QgcmVzdWx0ID0gX3N5bmNSZXF1ZXN0VG9VcmwocmVxdWVzdC5yZXF1ZXN0LCAnbG9nb3V0Jyk7XG5cdFx0aWYgKEFjY291bnRzLnNhbWwuc2V0dGluZ3MuZGVidWcpIHtcblx0XHRcdGNvbnNvbGUubG9nKGBTQU1MIExvZ291dCBSZXF1ZXN0ICR7IHJlc3VsdCB9YCk7XG5cdFx0fVxuXG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59KTtcblxuQWNjb3VudHMucmVnaXN0ZXJMb2dpbkhhbmRsZXIoZnVuY3Rpb24obG9naW5SZXF1ZXN0KSB7XG5cdGlmICghbG9naW5SZXF1ZXN0LnNhbWwgfHwgIWxvZ2luUmVxdWVzdC5jcmVkZW50aWFsVG9rZW4pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Y29uc3QgbG9naW5SZXN1bHQgPSBBY2NvdW50cy5zYW1sLnJldHJpZXZlQ3JlZGVudGlhbChsb2dpblJlcXVlc3QuY3JlZGVudGlhbFRva2VuKTtcblx0aWYgKEFjY291bnRzLnNhbWwuc2V0dGluZ3MuZGVidWcpIHtcblx0XHRjb25zb2xlLmxvZyhgUkVTVUxUIDokeyBKU09OLnN0cmluZ2lmeShsb2dpblJlc3VsdCkgfWApO1xuXHR9XG5cblx0aWYgKGxvZ2luUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ3NhbWwnLFxuXHRcdFx0ZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoQWNjb3VudHMuTG9naW5DYW5jZWxsZWRFcnJvci5udW1lcmljRXJyb3IsICdObyBtYXRjaGluZyBsb2dpbiBhdHRlbXB0IGZvdW5kJylcblx0XHR9O1xuXHR9XG5cblx0aWYgKGxvZ2luUmVzdWx0ICYmIGxvZ2luUmVzdWx0LnByb2ZpbGUgJiYgbG9naW5SZXN1bHQucHJvZmlsZS5lbWFpbCkge1xuXHRcdGNvbnN0IGVtYWlsTGlzdCA9IEFycmF5LmlzQXJyYXkobG9naW5SZXN1bHQucHJvZmlsZS5lbWFpbCkgPyBsb2dpblJlc3VsdC5wcm9maWxlLmVtYWlsIDogW2xvZ2luUmVzdWx0LnByb2ZpbGUuZW1haWxdO1xuXHRcdGNvbnN0IGVtYWlsUmVnZXggPSBuZXcgUmVnRXhwKGVtYWlsTGlzdC5tYXAoZW1haWwgPT4gYF4keyBSZWdFeHAuZXNjYXBlKGVtYWlsKSB9JGApLmpvaW4oJ3wnKSwgJ2knKTtcblx0XHRsZXQgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHtcblx0XHRcdCdlbWFpbHMuYWRkcmVzcyc6IGVtYWlsUmVnZXhcblx0XHR9KTtcblxuXHRcdGlmICghdXNlcikge1xuXHRcdFx0Y29uc3QgbmV3VXNlciA9IHtcblx0XHRcdFx0bmFtZTogbG9naW5SZXN1bHQucHJvZmlsZS5jbiB8fCBsb2dpblJlc3VsdC5wcm9maWxlLnVzZXJuYW1lLFxuXHRcdFx0XHRhY3RpdmU6IHRydWUsXG5cdFx0XHRcdGdsb2JhbFJvbGVzOiBbJ3VzZXInXSxcblx0XHRcdFx0ZW1haWxzOiBlbWFpbExpc3QubWFwKGVtYWlsID0+IHtcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0YWRkcmVzczogZW1haWwsXG5cdFx0XHRcdFx0XHR2ZXJpZmllZDogdHJ1ZVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH0pXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5nZW5lcmF0ZVVzZXJuYW1lID09PSB0cnVlKSB7XG5cdFx0XHRcdGNvbnN0IHVzZXJuYW1lID0gUm9ja2V0Q2hhdC5nZW5lcmF0ZVVzZXJuYW1lU3VnZ2VzdGlvbihuZXdVc2VyKTtcblx0XHRcdFx0aWYgKHVzZXJuYW1lKSB7XG5cdFx0XHRcdFx0bmV3VXNlci51c2VybmFtZSA9IHVzZXJuYW1lO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKGxvZ2luUmVzdWx0LnByb2ZpbGUudXNlcm5hbWUpIHtcblx0XHRcdFx0bmV3VXNlci51c2VybmFtZSA9IGxvZ2luUmVzdWx0LnByb2ZpbGUudXNlcm5hbWU7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHVzZXJJZCA9IEFjY291bnRzLmluc2VydFVzZXJEb2Moe30sIG5ld1VzZXIpO1xuXHRcdFx0dXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHVzZXJJZCk7XG5cdFx0fVxuXG5cdFx0Ly9jcmVhdGluZyB0aGUgdG9rZW4gYW5kIGFkZGluZyB0byB0aGUgdXNlclxuXHRcdGNvbnN0IHN0YW1wZWRUb2tlbiA9IEFjY291bnRzLl9nZW5lcmF0ZVN0YW1wZWRMb2dpblRva2VuKCk7XG5cdFx0TWV0ZW9yLnVzZXJzLnVwZGF0ZSh1c2VyLCB7XG5cdFx0XHQkcHVzaDoge1xuXHRcdFx0XHQnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zJzogc3RhbXBlZFRva2VuXG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRjb25zdCBzYW1sTG9naW4gPSB7XG5cdFx0XHRwcm92aWRlcjogQWNjb3VudHMuc2FtbC5SZWxheVN0YXRlLFxuXHRcdFx0aWRwOiBsb2dpblJlc3VsdC5wcm9maWxlLmlzc3Vlcixcblx0XHRcdGlkcFNlc3Npb246IGxvZ2luUmVzdWx0LnByb2ZpbGUuc2Vzc2lvbkluZGV4LFxuXHRcdFx0bmFtZUlEOiBsb2dpblJlc3VsdC5wcm9maWxlLm5hbWVJRFxuXHRcdH07XG5cblx0XHRNZXRlb3IudXNlcnMudXBkYXRlKHtcblx0XHRcdF9pZDogdXNlci5faWRcblx0XHR9LCB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdC8vIFRCRCB0aGlzIHNob3VsZCBiZSBwdXNoZWQsIG90aGVyd2lzZSB3ZSdyZSBvbmx5IGFibGUgdG8gU1NPIGludG8gYSBzaW5nbGUgSURQIGF0IGEgdGltZVxuXHRcdFx0XHQnc2VydmljZXMuc2FtbCc6IHNhbWxMb2dpblxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly9zZW5kaW5nIHRva2VuIGFsb25nIHdpdGggdGhlIHVzZXJJZFxuXHRcdGNvbnN0IHJlc3VsdCA9IHtcblx0XHRcdHVzZXJJZDogdXNlci5faWQsXG5cdFx0XHR0b2tlbjogc3RhbXBlZFRva2VuLnRva2VuXG5cdFx0fTtcblxuXHRcdHJldHVybiByZXN1bHQ7XG5cblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ1NBTUwgUHJvZmlsZSBkaWQgbm90IGNvbnRhaW4gYW4gZW1haWwgYWRkcmVzcycpO1xuXHR9XG59KTtcblxuQWNjb3VudHMuc2FtbC5oYXNDcmVkZW50aWFsID0gZnVuY3Rpb24oY3JlZGVudGlhbFRva2VuKSB7XG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5DcmVkZW50aWFsVG9rZW5zLmZpbmRPbmVCeUlkKGNyZWRlbnRpYWxUb2tlbikgIT0gbnVsbDtcbn07XG5cbkFjY291bnRzLnNhbWwucmV0cmlldmVDcmVkZW50aWFsID0gZnVuY3Rpb24oY3JlZGVudGlhbFRva2VuKSB7XG5cdC8vIFRoZSBjcmVkZW50aWFsVG9rZW4gaW4gYWxsIHRoZXNlIGZ1bmN0aW9ucyBjb3JyZXNwb25kcyB0byBTQU1McyBpblJlc3BvbnNlVG8gZmllbGQgYW5kIGlzIG1hbmRhdG9yeSB0byBjaGVjay5cblx0Y29uc3QgZGF0YSA9IFJvY2tldENoYXQubW9kZWxzLkNyZWRlbnRpYWxUb2tlbnMuZmluZE9uZUJ5SWQoY3JlZGVudGlhbFRva2VuKTtcblx0aWYgKGRhdGEpIHtcblx0XHRyZXR1cm4gZGF0YS51c2VySW5mbztcblx0fVxufTtcblxuQWNjb3VudHMuc2FtbC5zdG9yZUNyZWRlbnRpYWwgPSBmdW5jdGlvbihjcmVkZW50aWFsVG9rZW4sIGxvZ2luUmVzdWx0KSB7XG5cdFJvY2tldENoYXQubW9kZWxzLkNyZWRlbnRpYWxUb2tlbnMuY3JlYXRlKGNyZWRlbnRpYWxUb2tlbiwgbG9naW5SZXN1bHQpO1xufTtcblxuY29uc3QgY2xvc2VQb3B1cCA9IGZ1bmN0aW9uKHJlcywgZXJyKSB7XG5cdHJlcy53cml0ZUhlYWQoMjAwLCB7XG5cdFx0J0NvbnRlbnQtVHlwZSc6ICd0ZXh0L2h0bWwnXG5cdH0pO1xuXHRsZXQgY29udGVudCA9ICc8aHRtbD48aGVhZD48c2NyaXB0PndpbmRvdy5jbG9zZSgpPC9zY3JpcHQ+PC9oZWFkPjxib2R5PjxIMT5WZXJpZmllZDwvSDE+PC9ib2R5PjwvaHRtbD4nO1xuXHRpZiAoZXJyKSB7XG5cdFx0Y29udGVudCA9IGA8aHRtbD48Ym9keT48aDI+U29ycnksIGFuIGFubm95aW5nIGVycm9yIG9jY3VyZWQ8L2gyPjxkaXY+JHsgZXJyIH08L2Rpdj48YSBvbmNsaWNrPVwid2luZG93LmNsb3NlKCk7XCI+Q2xvc2UgV2luZG93PC9hPjwvYm9keT48L2h0bWw+YDtcblx0fVxuXHRyZXMuZW5kKGNvbnRlbnQsICd1dGYtOCcpO1xufTtcblxuY29uc3Qgc2FtbFVybFRvT2JqZWN0ID0gZnVuY3Rpb24odXJsKSB7XG5cdC8vIHJlcS51cmwgd2lsbCBiZSAnL19zYW1sLzxhY3Rpb24+LzxzZXJ2aWNlIG5hbWU+LzxjcmVkZW50aWFsVG9rZW4+J1xuXHRpZiAoIXVybCkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0Y29uc3Qgc3BsaXRVcmwgPSB1cmwuc3BsaXQoJz8nKTtcblx0Y29uc3Qgc3BsaXRQYXRoID0gc3BsaXRVcmxbMF0uc3BsaXQoJy8nKTtcblxuXHQvLyBBbnkgbm9uLXNhbWwgcmVxdWVzdCB3aWxsIGNvbnRpbnVlIGRvd24gdGhlIGRlZmF1bHRcblx0Ly8gbWlkZGxld2FyZXMuXG5cdGlmIChzcGxpdFBhdGhbMV0gIT09ICdfc2FtbCcpIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdGNvbnN0IHJlc3VsdCA9IHtcblx0XHRhY3Rpb25OYW1lOiBzcGxpdFBhdGhbMl0sXG5cdFx0c2VydmljZU5hbWU6IHNwbGl0UGF0aFszXSxcblx0XHRjcmVkZW50aWFsVG9rZW46IHNwbGl0UGF0aFs0XVxuXHR9O1xuXHRpZiAoQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5kZWJ1Zykge1xuXHRcdGNvbnNvbGUubG9nKHJlc3VsdCk7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn07XG5cbmNvbnN0IG1pZGRsZXdhcmUgPSBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuXHQvLyBNYWtlIHN1cmUgdG8gY2F0Y2ggYW55IGV4Y2VwdGlvbnMgYmVjYXVzZSBvdGhlcndpc2Ugd2UnZCBjcmFzaFxuXHQvLyB0aGUgcnVubmVyXG5cdHRyeSB7XG5cdFx0Y29uc3Qgc2FtbE9iamVjdCA9IHNhbWxVcmxUb09iamVjdChyZXEudXJsKTtcblx0XHRpZiAoIXNhbWxPYmplY3QgfHwgIXNhbWxPYmplY3Quc2VydmljZU5hbWUpIHtcblx0XHRcdG5leHQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoIXNhbWxPYmplY3QuYWN0aW9uTmFtZSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIFNBTUwgYWN0aW9uJyk7XG5cdFx0fVxuXG5cdFx0Y29uc29sZS5sb2coQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5wcm92aWRlcnMpO1xuXHRcdGNvbnNvbGUubG9nKHNhbWxPYmplY3Quc2VydmljZU5hbWUpO1xuXHRcdGNvbnN0IHNlcnZpY2UgPSBfLmZpbmQoQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5wcm92aWRlcnMsIGZ1bmN0aW9uKHNhbWxTZXR0aW5nKSB7XG5cdFx0XHRyZXR1cm4gc2FtbFNldHRpbmcucHJvdmlkZXIgPT09IHNhbWxPYmplY3Quc2VydmljZU5hbWU7XG5cdFx0fSk7XG5cblx0XHQvLyBTa2lwIGV2ZXJ5dGhpbmcgaWYgdGhlcmUncyBubyBzZXJ2aWNlIHNldCBieSB0aGUgc2FtbCBtaWRkbGV3YXJlXG5cdFx0aWYgKCFzZXJ2aWNlKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgU0FNTCBzZXJ2aWNlICR7IHNhbWxPYmplY3Quc2VydmljZU5hbWUgfWApO1xuXHRcdH1cblx0XHRsZXQgX3NhbWw7XG5cdFx0c3dpdGNoIChzYW1sT2JqZWN0LmFjdGlvbk5hbWUpIHtcblx0XHRcdGNhc2UgJ21ldGFkYXRhJzpcblx0XHRcdFx0X3NhbWwgPSBuZXcgU0FNTChzZXJ2aWNlKTtcblx0XHRcdFx0c2VydmljZS5jYWxsYmFja1VybCA9IE1ldGVvci5hYnNvbHV0ZVVybChgX3NhbWwvdmFsaWRhdGUvJHsgc2VydmljZS5wcm92aWRlciB9YCk7XG5cdFx0XHRcdHJlcy53cml0ZUhlYWQoMjAwKTtcblx0XHRcdFx0cmVzLndyaXRlKF9zYW1sLmdlbmVyYXRlU2VydmljZVByb3ZpZGVyTWV0YWRhdGEoc2VydmljZS5jYWxsYmFja1VybCkpO1xuXHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRcdC8vY2xvc2VQb3B1cChyZXMpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2xvZ291dCc6XG5cdFx0XHRcdC8vIFRoaXMgaXMgd2hlcmUgd2UgcmVjZWl2ZSBTQU1MIExvZ291dFJlc3BvbnNlXG5cdFx0XHRcdF9zYW1sID0gbmV3IFNBTUwoc2VydmljZSk7XG5cdFx0XHRcdF9zYW1sLnZhbGlkYXRlTG9nb3V0UmVzcG9uc2UocmVxLnF1ZXJ5LlNBTUxSZXNwb25zZSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcblx0XHRcdFx0XHRpZiAoIWVycikge1xuXHRcdFx0XHRcdFx0Y29uc3QgbG9nT3V0VXNlciA9IGZ1bmN0aW9uKGluUmVzcG9uc2VUbykge1xuXHRcdFx0XHRcdFx0XHRpZiAoQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5kZWJ1Zykge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGBMb2dnaW5nIE91dCB1c2VyIHZpYSBpblJlc3BvbnNlVG8gJHsgaW5SZXNwb25zZVRvIH1gKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjb25zdCBsb2dnZWRPdXRVc2VyID0gTWV0ZW9yLnVzZXJzLmZpbmQoe1xuXHRcdFx0XHRcdFx0XHRcdCdzZXJ2aWNlcy5zYW1sLmluUmVzcG9uc2VUbyc6IGluUmVzcG9uc2VUb1xuXHRcdFx0XHRcdFx0XHR9KS5mZXRjaCgpO1xuXHRcdFx0XHRcdFx0XHRpZiAobG9nZ2VkT3V0VXNlci5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5kZWJ1Zykge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coYEZvdW5kIHVzZXIgJHsgbG9nZ2VkT3V0VXNlclswXS5faWQgfWApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRNZXRlb3IudXNlcnMudXBkYXRlKHtcblx0XHRcdFx0XHRcdFx0XHRcdF9pZDogbG9nZ2VkT3V0VXNlclswXS5faWRcblx0XHRcdFx0XHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkc2V0OiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMnOiBbXVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdE1ldGVvci51c2Vycy51cGRhdGUoe1xuXHRcdFx0XHRcdFx0XHRcdFx0X2lkOiBsb2dnZWRPdXRVc2VyWzBdLl9pZFxuXHRcdFx0XHRcdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRcdFx0XHRcdCR1bnNldDoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnc2VydmljZXMuc2FtbCc6ICcnXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignRm91bmQgbXVsdGlwbGUgdXNlcnMgbWF0Y2hpbmcgU0FNTCBpblJlc3BvbnNlVG8gZmllbGRzJyk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdGZpYmVyKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsb2dPdXRVc2VyKHJlc3VsdCk7XG5cdFx0XHRcdFx0XHR9KS5ydW4oKTtcblxuXG5cdFx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDMwMiwge1xuXHRcdFx0XHRcdFx0XHQnTG9jYXRpb24nOiByZXEucXVlcnkuUmVsYXlTdGF0ZVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vICBlbHNlIHtcblx0XHRcdFx0XHQvLyBcdC8vIFRCRCB0aGlua2luZyBvZiBzdGggbWVhbmluZyBmdWxsLlxuXHRcdFx0XHRcdC8vIH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2xvUmVkaXJlY3QnOlxuXHRcdFx0XHRyZXMud3JpdGVIZWFkKDMwMiwge1xuXHRcdFx0XHRcdC8vIGNyZWRlbnRpYWxUb2tlbiBoZXJlIGlzIHRoZSBTQU1MIExvZ091dCBSZXF1ZXN0IHRoYXQgd2UnbGwgc2VuZCBiYWNrIHRvIElEUFxuXHRcdFx0XHRcdCdMb2NhdGlvbic6IHJlcS5xdWVyeS5yZWRpcmVjdFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2F1dGhvcml6ZSc6XG5cdFx0XHRcdHNlcnZpY2UuY2FsbGJhY2tVcmwgPSBNZXRlb3IuYWJzb2x1dGVVcmwoYF9zYW1sL3ZhbGlkYXRlLyR7IHNlcnZpY2UucHJvdmlkZXIgfWApO1xuXHRcdFx0XHRzZXJ2aWNlLmlkID0gc2FtbE9iamVjdC5jcmVkZW50aWFsVG9rZW47XG5cdFx0XHRcdF9zYW1sID0gbmV3IFNBTUwoc2VydmljZSk7XG5cdFx0XHRcdF9zYW1sLmdldEF1dGhvcml6ZVVybChyZXEsIGZ1bmN0aW9uKGVyciwgdXJsKSB7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZ2VuZXJhdGUgYXV0aG9yaXplIHVybCcpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDMwMiwge1xuXHRcdFx0XHRcdFx0J0xvY2F0aW9uJzogdXJsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd2YWxpZGF0ZSc6XG5cdFx0XHRcdF9zYW1sID0gbmV3IFNBTUwoc2VydmljZSk7XG5cdFx0XHRcdEFjY291bnRzLnNhbWwuUmVsYXlTdGF0ZSA9IHJlcS5ib2R5LlJlbGF5U3RhdGU7XG5cdFx0XHRcdF9zYW1sLnZhbGlkYXRlUmVzcG9uc2UocmVxLmJvZHkuU0FNTFJlc3BvbnNlLCByZXEuYm9keS5SZWxheVN0YXRlLCBmdW5jdGlvbihlcnIsIHByb2ZpbGUvKiwgbG9nZ2VkT3V0Ki8pIHtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byB2YWxpZGF0ZSByZXNwb25zZSB1cmw6ICR7IGVyciB9YCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y29uc3QgY3JlZGVudGlhbFRva2VuID0gKHByb2ZpbGUuaW5SZXNwb25zZVRvSWQgJiYgcHJvZmlsZS5pblJlc3BvbnNlVG9JZC52YWx1ZSkgfHwgcHJvZmlsZS5pblJlc3BvbnNlVG9JZCB8fCBwcm9maWxlLkluUmVzcG9uc2VUbyB8fCBzYW1sT2JqZWN0LmNyZWRlbnRpYWxUb2tlbjtcblx0XHRcdFx0XHRjb25zdCBsb2dpblJlc3VsdCA9IHtcblx0XHRcdFx0XHRcdHByb2ZpbGVcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGlmICghY3JlZGVudGlhbFRva2VuKSB7XG5cdFx0XHRcdFx0XHQvLyBObyBjcmVkZW50aWFsVG9rZW4gaW4gSWRQLWluaXRpYXRlZCBTU09cblx0XHRcdFx0XHRcdGNvbnN0IHNhbWxfaWRwX2NyZWRlbnRpYWxUb2tlbiA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0XHRcdFx0QWNjb3VudHMuc2FtbC5zdG9yZUNyZWRlbnRpYWwoc2FtbF9pZHBfY3JlZGVudGlhbFRva2VuLCBsb2dpblJlc3VsdCk7XG5cblx0XHRcdFx0XHRcdGNvbnN0IHVybCA9IGAkeyBNZXRlb3IuYWJzb2x1dGVVcmwoJ2hvbWUnKSB9P3NhbWxfaWRwX2NyZWRlbnRpYWxUb2tlbj0keyBzYW1sX2lkcF9jcmVkZW50aWFsVG9rZW4gfWA7XG5cdFx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDMwMiwge1xuXHRcdFx0XHRcdFx0XHQnTG9jYXRpb24nOiB1cmxcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRBY2NvdW50cy5zYW1sLnN0b3JlQ3JlZGVudGlhbChjcmVkZW50aWFsVG9rZW4sIGxvZ2luUmVzdWx0KTtcblx0XHRcdFx0XHRcdGNsb3NlUG9wdXAocmVzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBTQU1MIGFjdGlvbiAkeyBzYW1sT2JqZWN0LmFjdGlvbk5hbWUgfWApO1xuXG5cdFx0fVxuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRjbG9zZVBvcHVwKHJlcywgZXJyKTtcblx0fVxufTtcblxuLy8gTGlzdGVuIHRvIGluY29taW5nIFNBTUwgaHR0cCByZXF1ZXN0c1xuV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoY29ubmVjdC5ib2R5UGFyc2VyKCkpLnVzZShmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuXHQvLyBOZWVkIHRvIGNyZWF0ZSBhIGZpYmVyIHNpbmNlIHdlJ3JlIHVzaW5nIHN5bmNocm9ub3VzIGh0dHAgY2FsbHMgYW5kIG5vdGhpbmdcblx0Ly8gZWxzZSBpcyB3cmFwcGluZyB0aGlzIGluIGEgZmliZXIgYXV0b21hdGljYWxseVxuXHRmaWJlcihmdW5jdGlvbigpIHtcblx0XHRtaWRkbGV3YXJlKHJlcSwgcmVzLCBuZXh0KTtcblx0fSkucnVuKCk7XG59KTtcbiIsIi8qIGdsb2JhbHMgU0FNTDp0cnVlICovXG5cbmltcG9ydCB6bGliIGZyb20gJ3psaWInO1xuaW1wb3J0IHhtbENyeXB0byBmcm9tICd4bWwtY3J5cHRvJztcbmltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCB4bWxkb20gZnJvbSAneG1sZG9tJztcbmltcG9ydCBxdWVyeXN0cmluZyBmcm9tICdxdWVyeXN0cmluZyc7XG5pbXBvcnQgeG1sYnVpbGRlciBmcm9tICd4bWxidWlsZGVyJztcbmltcG9ydCBhcnJheTJzdHJpbmcgZnJvbSAnYXJyYXlidWZmZXItdG8tc3RyaW5nJztcblxuLy8gdmFyIHByZWZpeE1hdGNoID0gbmV3IFJlZ0V4cCgvKD8heG1sbnMpXi4qOi8pO1xuXG5cblNBTUwgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHRoaXMub3B0aW9ucyA9IHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbn07XG5cbmZ1bmN0aW9uIGRlYnVnTG9nKCkge1xuXHRpZiAoTWV0ZW9yLnNldHRpbmdzLmRlYnVnKSB7XG5cdFx0Y29uc29sZS5sb2cuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0fVxufVxuXG4vLyB2YXIgc3RyaXBQcmVmaXggPSBmdW5jdGlvbihzdHIpIHtcbi8vIFx0cmV0dXJuIHN0ci5yZXBsYWNlKHByZWZpeE1hdGNoLCAnJyk7XG4vLyB9O1xuXG5TQU1MLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRpZiAoIW9wdGlvbnMpIHtcblx0XHRvcHRpb25zID0ge307XG5cdH1cblxuXHRpZiAoIW9wdGlvbnMucHJvdG9jb2wpIHtcblx0XHRvcHRpb25zLnByb3RvY29sID0gJ2h0dHBzOi8vJztcblx0fVxuXG5cdGlmICghb3B0aW9ucy5wYXRoKSB7XG5cdFx0b3B0aW9ucy5wYXRoID0gJy9zYW1sL2NvbnN1bWUnO1xuXHR9XG5cblx0aWYgKCFvcHRpb25zLmlzc3Vlcikge1xuXHRcdG9wdGlvbnMuaXNzdWVyID0gJ29uZWxvZ2luX3NhbWwnO1xuXHR9XG5cblx0aWYgKG9wdGlvbnMuaWRlbnRpZmllckZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0b3B0aW9ucy5pZGVudGlmaWVyRm9ybWF0ID0gJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjEuMTpuYW1laWQtZm9ybWF0OmVtYWlsQWRkcmVzcyc7XG5cdH1cblxuXHRpZiAob3B0aW9ucy5hdXRobkNvbnRleHQgPT09IHVuZGVmaW5lZCkge1xuXHRcdG9wdGlvbnMuYXV0aG5Db250ZXh0ID0gJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphYzpjbGFzc2VzOlBhc3N3b3JkUHJvdGVjdGVkVHJhbnNwb3J0Jztcblx0fVxuXG5cdHJldHVybiBvcHRpb25zO1xufTtcblxuU0FNTC5wcm90b3R5cGUuZ2VuZXJhdGVVbmlxdWVJRCA9IGZ1bmN0aW9uKCkge1xuXHRjb25zdCBjaGFycyA9ICdhYmNkZWYwMTIzNDU2Nzg5Jztcblx0bGV0IHVuaXF1ZUlEID0gJ2lkLSc7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgMjA7IGkrKykge1xuXHRcdHVuaXF1ZUlEICs9IGNoYXJzLnN1YnN0cihNYXRoLmZsb29yKChNYXRoLnJhbmRvbSgpICogMTUpKSwgMSk7XG5cdH1cblx0cmV0dXJuIHVuaXF1ZUlEO1xufTtcblxuU0FNTC5wcm90b3R5cGUuZ2VuZXJhdGVJbnN0YW50ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG59O1xuXG5TQU1MLnByb3RvdHlwZS5zaWduUmVxdWVzdCA9IGZ1bmN0aW9uKHhtbCkge1xuXHRjb25zdCBzaWduZXIgPSBjcnlwdG8uY3JlYXRlU2lnbignUlNBLVNIQTEnKTtcblx0c2lnbmVyLnVwZGF0ZSh4bWwpO1xuXHRyZXR1cm4gc2lnbmVyLnNpZ24odGhpcy5vcHRpb25zLnByaXZhdGVLZXksICdiYXNlNjQnKTtcbn07XG5cblNBTUwucHJvdG90eXBlLmdlbmVyYXRlQXV0aG9yaXplUmVxdWVzdCA9IGZ1bmN0aW9uKHJlcSkge1xuXHRsZXQgaWQgPSBgXyR7IHRoaXMuZ2VuZXJhdGVVbmlxdWVJRCgpIH1gO1xuXHRjb25zdCBpbnN0YW50ID0gdGhpcy5nZW5lcmF0ZUluc3RhbnQoKTtcblxuXHQvLyBQb3N0LWF1dGggZGVzdGluYXRpb25cblx0bGV0IGNhbGxiYWNrVXJsO1xuXHRpZiAodGhpcy5vcHRpb25zLmNhbGxiYWNrVXJsKSB7XG5cdFx0Y2FsbGJhY2tVcmwgPSB0aGlzLm9wdGlvbnMuY2FsbGJhY2tVcmw7XG5cdH0gZWxzZSB7XG5cdFx0Y2FsbGJhY2tVcmwgPSB0aGlzLm9wdGlvbnMucHJvdG9jb2wgKyByZXEuaGVhZGVycy5ob3N0ICsgdGhpcy5vcHRpb25zLnBhdGg7XG5cdH1cblxuXHRpZiAodGhpcy5vcHRpb25zLmlkKSB7XG5cdFx0aWQgPSB0aGlzLm9wdGlvbnMuaWQ7XG5cdH1cblxuXHRsZXQgcmVxdWVzdCA9XG5cdFx0YDxzYW1scDpBdXRoblJlcXVlc3QgeG1sbnM6c2FtbHA9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2xcIiBJRD1cIiR7IGlkIH1cIiBWZXJzaW9uPVwiMi4wXCIgSXNzdWVJbnN0YW50PVwiJHsgaW5zdGFudCB9XCIgUHJvdG9jb2xCaW5kaW5nPVwidXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmJpbmRpbmdzOkhUVFAtUE9TVFwiIEFzc2VydGlvbkNvbnN1bWVyU2VydmljZVVSTD1cIiR7IGNhbGxiYWNrVXJsIH1cIiBEZXN0aW5hdGlvbj1cIiR7XG5cdFx0XHR0aGlzLm9wdGlvbnMuZW50cnlQb2ludCB9XCI+YCArXG5cdFx0YDxzYW1sOklzc3VlciB4bWxuczpzYW1sPVwidXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFzc2VydGlvblwiPiR7IHRoaXMub3B0aW9ucy5pc3N1ZXIgfTwvc2FtbDpJc3N1ZXI+XFxuYDtcblxuXHRpZiAodGhpcy5vcHRpb25zLmlkZW50aWZpZXJGb3JtYXQpIHtcblx0XHRyZXF1ZXN0ICs9IGA8c2FtbHA6TmFtZUlEUG9saWN5IHhtbG5zOnNhbWxwPVwidXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sXCIgRm9ybWF0PVwiJHsgdGhpcy5vcHRpb25zLmlkZW50aWZpZXJGb3JtYXQgfVwiIEFsbG93Q3JlYXRlPVwidHJ1ZVwiPjwvc2FtbHA6TmFtZUlEUG9saWN5PlxcbmA7XG5cdH1cblxuXHRyZXF1ZXN0ICs9XG5cdFx0JzxzYW1scDpSZXF1ZXN0ZWRBdXRobkNvbnRleHQgeG1sbnM6c2FtbHA9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2xcIiBDb21wYXJpc29uPVwiZXhhY3RcIj4nICtcblx0XHQnPHNhbWw6QXV0aG5Db250ZXh0Q2xhc3NSZWYgeG1sbnM6c2FtbD1cInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb25cIj51cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YWM6Y2xhc3NlczpQYXNzd29yZFByb3RlY3RlZFRyYW5zcG9ydDwvc2FtbDpBdXRobkNvbnRleHRDbGFzc1JlZj48L3NhbWxwOlJlcXVlc3RlZEF1dGhuQ29udGV4dD5cXG4nICtcblx0XHQnPC9zYW1scDpBdXRoblJlcXVlc3Q+JztcblxuXHRyZXR1cm4gcmVxdWVzdDtcbn07XG5cblNBTUwucHJvdG90eXBlLmdlbmVyYXRlTG9nb3V0UmVxdWVzdCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0Ly8gb3B0aW9ucyBzaG91bGQgYmUgb2YgdGhlIGZvcm1cblx0Ly8gbmFtZUlkOiA8bmFtZUlkIGFzIHN1Ym1pdHRlZCBkdXJpbmcgU0FNTCBTU08+XG5cdC8vIHNlc3Npb25JbmRleDogc2Vzc2lvbkluZGV4XG5cdC8vIC0tLSBOTyBTQU1Mc2V0dGluZ3M6IDxNZXRlb3Iuc2V0dGluZy5zYW1sICBlbnRyeSBmb3IgdGhlIHByb3ZpZGVyIHlvdSB3YW50IHRvIFNMTyBmcm9tXG5cblx0Y29uc3QgaWQgPSBgXyR7IHRoaXMuZ2VuZXJhdGVVbmlxdWVJRCgpIH1gO1xuXHRjb25zdCBpbnN0YW50ID0gdGhpcy5nZW5lcmF0ZUluc3RhbnQoKTtcblxuXHRsZXQgcmVxdWVzdCA9IGAkeyAnPHNhbWxwOkxvZ291dFJlcXVlc3QgeG1sbnM6c2FtbHA9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2xcIiAnICtcblx0XHQneG1sbnM6c2FtbD1cInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb25cIiBJRD1cIicgfSR7IGlkIH1cIiBWZXJzaW9uPVwiMi4wXCIgSXNzdWVJbnN0YW50PVwiJHsgaW5zdGFudCB9XCIgRGVzdGluYXRpb249XCIkeyB0aGlzLm9wdGlvbnMuaWRwU0xPUmVkaXJlY3RVUkwgfVwiPmAgK1xuXHRcdGA8c2FtbDpJc3N1ZXIgeG1sbnM6c2FtbD1cInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb25cIj4keyB0aGlzLm9wdGlvbnMuaXNzdWVyIH08L3NhbWw6SXNzdWVyPmAgK1xuXHRcdGA8c2FtbDpOYW1lSUQgRm9ybWF0PVwiJHsgdGhpcy5vcHRpb25zLmlkZW50aWZpZXJGb3JtYXQgfVwiPiR7IG9wdGlvbnMubmFtZUlEIH08L3NhbWw6TmFtZUlEPmAgK1xuXHRcdCc8L3NhbWxwOkxvZ291dFJlcXVlc3Q+JztcblxuXHRyZXF1ZXN0ID0gYCR7ICc8c2FtbHA6TG9nb3V0UmVxdWVzdCB4bWxuczpzYW1scD1cInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpwcm90b2NvbFwiICAnICtcblx0XHQnSUQ9XCInIH0keyBpZCB9XCIgYCArXG5cdFx0J1ZlcnNpb249XCIyLjBcIiAnICtcblx0XHRgSXNzdWVJbnN0YW50PVwiJHsgaW5zdGFudCB9XCIgYCArXG5cdFx0YERlc3RpbmF0aW9uPVwiJHsgdGhpcy5vcHRpb25zLmlkcFNMT1JlZGlyZWN0VVJMIH1cIiBgICtcblx0XHQnPicgK1xuXHRcdGA8c2FtbDpJc3N1ZXIgeG1sbnM6c2FtbD1cInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb25cIj4keyB0aGlzLm9wdGlvbnMuaXNzdWVyIH08L3NhbWw6SXNzdWVyPmAgK1xuXHRcdCc8c2FtbDpOYW1lSUQgeG1sbnM6c2FtbD1cInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb25cIiAnICtcblx0XHQnTmFtZVF1YWxpZmllcj1cImh0dHA6Ly9pZC5pbml0OC5uZXQ6ODA4MC9vcGVuYW1cIiAnICtcblx0XHRgU1BOYW1lUXVhbGlmaWVyPVwiJHsgdGhpcy5vcHRpb25zLmlzc3VlciB9XCIgYCArXG5cdFx0YEZvcm1hdD1cIiR7IHRoaXMub3B0aW9ucy5pZGVudGlmaWVyRm9ybWF0IH1cIj4ke1xuXHRcdFx0b3B0aW9ucy5uYW1lSUQgfTwvc2FtbDpOYW1lSUQ+YCArXG5cdFx0YDxzYW1scDpTZXNzaW9uSW5kZXggeG1sbnM6c2FtbHA9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2xcIj4keyBvcHRpb25zLnNlc3Npb25JbmRleCB9PC9zYW1scDpTZXNzaW9uSW5kZXg+YCArXG5cdFx0Jzwvc2FtbHA6TG9nb3V0UmVxdWVzdD4nO1xuXG5cdGRlYnVnTG9nKCctLS0tLS0tIFNBTUwgTG9nb3V0IHJlcXVlc3QgLS0tLS0tLS0tLS0nKTtcblx0ZGVidWdMb2cocmVxdWVzdCk7XG5cblx0cmV0dXJuIHtcblx0XHRyZXF1ZXN0LFxuXHRcdGlkXG5cdH07XG59O1xuXG5TQU1MLnByb3RvdHlwZS5yZXF1ZXN0VG9VcmwgPSBmdW5jdGlvbihyZXF1ZXN0LCBvcGVyYXRpb24sIGNhbGxiYWNrKSB7XG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHR6bGliLmRlZmxhdGVSYXcocmVxdWVzdCwgZnVuY3Rpb24oZXJyLCBidWZmZXIpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHR9XG5cblx0XHRjb25zdCBiYXNlNjQgPSBidWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuXHRcdGxldCB0YXJnZXQgPSBzZWxmLm9wdGlvbnMuZW50cnlQb2ludDtcblxuXHRcdGlmIChvcGVyYXRpb24gPT09ICdsb2dvdXQnKSB7XG5cdFx0XHRpZiAoc2VsZi5vcHRpb25zLmlkcFNMT1JlZGlyZWN0VVJMKSB7XG5cdFx0XHRcdHRhcmdldCA9IHNlbGYub3B0aW9ucy5pZHBTTE9SZWRpcmVjdFVSTDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGFyZ2V0LmluZGV4T2YoJz8nKSA+IDApIHtcblx0XHRcdHRhcmdldCArPSAnJic7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRhcmdldCArPSAnPyc7XG5cdFx0fVxuXG5cdFx0Ly8gVEJELiBXZSBzaG91bGQgcmVhbGx5IGluY2x1ZGUgYSBwcm9wZXIgUmVsYXlTdGF0ZSBoZXJlXG5cdFx0bGV0IHJlbGF5U3RhdGU7XG5cdFx0aWYgKG9wZXJhdGlvbiA9PT0gJ2xvZ291dCcpIHtcblx0XHRcdC8vIGluIGNhc2Ugb2YgbG9nb3V0IHdlIHdhbnQgdG8gYmUgcmVkaXJlY3RlZCBiYWNrIHRvIHRoZSBNZXRlb3IgYXBwLlxuXHRcdFx0cmVsYXlTdGF0ZSA9IE1ldGVvci5hYnNvbHV0ZVVybCgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZWxheVN0YXRlID0gc2VsZi5vcHRpb25zLnByb3ZpZGVyO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNhbWxSZXF1ZXN0ID0ge1xuXHRcdFx0U0FNTFJlcXVlc3Q6IGJhc2U2NCxcblx0XHRcdFJlbGF5U3RhdGU6IHJlbGF5U3RhdGVcblx0XHR9O1xuXG5cdFx0aWYgKHNlbGYub3B0aW9ucy5wcml2YXRlQ2VydCkge1xuXHRcdFx0c2FtbFJlcXVlc3QuU2lnQWxnID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvMDkveG1sZHNpZyNyc2Etc2hhMSc7XG5cdFx0XHRzYW1sUmVxdWVzdC5TaWduYXR1cmUgPSBzZWxmLnNpZ25SZXF1ZXN0KHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeShzYW1sUmVxdWVzdCkpO1xuXHRcdH1cblxuXHRcdHRhcmdldCArPSBxdWVyeXN0cmluZy5zdHJpbmdpZnkoc2FtbFJlcXVlc3QpO1xuXG5cdFx0ZGVidWdMb2coYHJlcXVlc3RUb1VybDogJHsgdGFyZ2V0IH1gKTtcblxuXHRcdGlmIChvcGVyYXRpb24gPT09ICdsb2dvdXQnKSB7XG5cdFx0XHQvLyBpbiBjYXNlIG9mIGxvZ291dCB3ZSB3YW50IHRvIGJlIHJlZGlyZWN0ZWQgYmFjayB0byB0aGUgTWV0ZW9yIGFwcC5cblx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCB0YXJnZXQpO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdGNhbGxiYWNrKG51bGwsIHRhcmdldCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cblNBTUwucHJvdG90eXBlLmdldEF1dGhvcml6ZVVybCA9IGZ1bmN0aW9uKHJlcSwgY2FsbGJhY2spIHtcblx0Y29uc3QgcmVxdWVzdCA9IHRoaXMuZ2VuZXJhdGVBdXRob3JpemVSZXF1ZXN0KHJlcSk7XG5cblx0dGhpcy5yZXF1ZXN0VG9VcmwocmVxdWVzdCwgJ2F1dGhvcml6ZScsIGNhbGxiYWNrKTtcbn07XG5cblNBTUwucHJvdG90eXBlLmdldExvZ291dFVybCA9IGZ1bmN0aW9uKHJlcSwgY2FsbGJhY2spIHtcblx0Y29uc3QgcmVxdWVzdCA9IHRoaXMuZ2VuZXJhdGVMb2dvdXRSZXF1ZXN0KHJlcSk7XG5cblx0dGhpcy5yZXF1ZXN0VG9VcmwocmVxdWVzdCwgJ2xvZ291dCcsIGNhbGxiYWNrKTtcbn07XG5cblNBTUwucHJvdG90eXBlLmNlcnRUb1BFTSA9IGZ1bmN0aW9uKGNlcnQpIHtcblx0Y2VydCA9IGNlcnQubWF0Y2goLy57MSw2NH0vZykuam9pbignXFxuJyk7XG5cdGNlcnQgPSBgLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tXFxuJHsgY2VydCB9YDtcblx0Y2VydCA9IGAkeyBjZXJ0IH1cXG4tLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tXFxuYDtcblx0cmV0dXJuIGNlcnQ7XG59O1xuXG4vLyBmdW5jdGlvbmZpbmRDaGlsZHMobm9kZSwgbG9jYWxOYW1lLCBuYW1lc3BhY2UpIHtcbi8vIFx0dmFyIHJlcyA9IFtdO1xuLy8gXHRmb3IgKHZhciBpID0gMDsgaSA8IG5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuLy8gXHRcdHZhciBjaGlsZCA9IG5vZGUuY2hpbGROb2Rlc1tpXTtcbi8vIFx0XHRpZiAoY2hpbGQubG9jYWxOYW1lID09PSBsb2NhbE5hbWUgJiYgKGNoaWxkLm5hbWVzcGFjZVVSSSA9PT0gbmFtZXNwYWNlIHx8ICFuYW1lc3BhY2UpKSB7XG4vLyBcdFx0XHRyZXMucHVzaChjaGlsZCk7XG4vLyBcdFx0fVxuLy8gXHR9XG4vLyBcdHJldHVybiByZXM7XG4vLyB9XG5cblNBTUwucHJvdG90eXBlLnZhbGlkYXRlU3RhdHVzID0gZnVuY3Rpb24oZG9jKSB7XG5cdGxldCBzdWNjZXNzU3RhdHVzID0gZmFsc2U7XG5cdGxldCBzdGF0dXMgPSAnJztcblx0bGV0IG1lc3NhZ2VUZXh0ID0gJyc7XG5cdGNvbnN0IHN0YXR1c05vZGVzID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpwcm90b2NvbCcsICdTdGF0dXNDb2RlJyk7XG5cblx0aWYgKHN0YXR1c05vZGVzLmxlbmd0aCkge1xuXG5cdFx0Y29uc3Qgc3RhdHVzTm9kZSA9IHN0YXR1c05vZGVzWzBdO1xuXHRcdGNvbnN0IHN0YXR1c01lc3NhZ2UgPSBkb2MuZ2V0RWxlbWVudHNCeVRhZ05hbWVOUygndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sJywgJ1N0YXR1c01lc3NhZ2UnKVswXTtcblxuXHRcdGlmIChzdGF0dXNNZXNzYWdlKSB7XG5cdFx0XHRtZXNzYWdlVGV4dCA9IHN0YXR1c01lc3NhZ2UuZmlyc3RDaGlsZC50ZXh0Q29udGVudDtcblx0XHR9XG5cblx0XHRzdGF0dXMgPSBzdGF0dXNOb2RlLmdldEF0dHJpYnV0ZSgnVmFsdWUnKTtcblxuXHRcdGlmIChzdGF0dXMgPT09ICd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6c3RhdHVzOlN1Y2Nlc3MnKSB7XG5cdFx0XHRzdWNjZXNzU3RhdHVzID0gdHJ1ZTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHtcblx0XHRzdWNjZXNzOiBzdWNjZXNzU3RhdHVzLFxuXHRcdG1lc3NhZ2U6IG1lc3NhZ2VUZXh0LFxuXHRcdHN0YXR1c0NvZGU6IHN0YXR1c1xuXHR9O1xufTtcblxuU0FNTC5wcm90b3R5cGUudmFsaWRhdGVTaWduYXR1cmUgPSBmdW5jdGlvbih4bWwsIGNlcnQpIHtcblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0Y29uc3QgZG9jID0gbmV3IHhtbGRvbS5ET01QYXJzZXIoKS5wYXJzZUZyb21TdHJpbmcoeG1sKTtcblx0Y29uc3Qgc2lnbmF0dXJlID0geG1sQ3J5cHRvLnhwYXRoKGRvYywgJy8vKltsb2NhbC1uYW1lKC4pPVxcJ1NpZ25hdHVyZVxcJyBhbmQgbmFtZXNwYWNlLXVyaSguKT1cXCdodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjXFwnXScpWzBdO1xuXG5cdGNvbnN0IHNpZyA9IG5ldyB4bWxDcnlwdG8uU2lnbmVkWG1sKCk7XG5cblx0c2lnLmtleUluZm9Qcm92aWRlciA9IHtcblx0XHRnZXRLZXlJbmZvKC8qa2V5Ki8pIHtcblx0XHRcdHJldHVybiAnPFg1MDlEYXRhPjwvWDUwOURhdGE+Jztcblx0XHR9LFxuXHRcdGdldEtleSgvKmtleUluZm8qLykge1xuXHRcdFx0cmV0dXJuIHNlbGYuY2VydFRvUEVNKGNlcnQpO1xuXHRcdH1cblx0fTtcblxuXHRzaWcubG9hZFNpZ25hdHVyZShzaWduYXR1cmUpO1xuXG5cdHJldHVybiBzaWcuY2hlY2tTaWduYXR1cmUoeG1sKTtcbn07XG5cblNBTUwucHJvdG90eXBlLnZhbGlkYXRlTG9nb3V0UmVzcG9uc2UgPSBmdW5jdGlvbihzYW1sUmVzcG9uc2UsIGNhbGxiYWNrKSB7XG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRjb25zdCBjb21wcmVzc2VkU0FNTFJlc3BvbnNlID0gbmV3IEJ1ZmZlcihzYW1sUmVzcG9uc2UsICdiYXNlNjQnKTtcblx0emxpYi5pbmZsYXRlUmF3KGNvbXByZXNzZWRTQU1MUmVzcG9uc2UsIGZ1bmN0aW9uKGVyciwgZGVjb2RlZCkge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdGRlYnVnTG9nKGBFcnJvciB3aGlsZSBpbmZsYXRpbmcuICR7IGVyciB9YCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnNvbGUubG9nKGBjb25zdHJ1Y3RpbmcgbmV3IERPTSBwYXJzZXI6ICR7IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkZWNvZGVkKSB9YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgPj4+PiAkeyBkZWNvZGVkIH1gKTtcblx0XHRcdGNvbnN0IGRvYyA9IG5ldyB4bWxkb20uRE9NUGFyc2VyKCkucGFyc2VGcm9tU3RyaW5nKGFycmF5MnN0cmluZyhkZWNvZGVkKSwgJ3RleHQveG1sJyk7XG5cdFx0XHRpZiAoZG9jKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3BvbnNlID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpwcm90b2NvbCcsICdMb2dvdXRSZXNwb25zZScpWzBdO1xuXHRcdFx0XHRpZiAocmVzcG9uc2UpIHtcblxuXHRcdFx0XHRcdC8vIFRCRC4gQ2hlY2sgaWYgdGhpcyBtc2cgY29ycmVzcG9uZHMgdG8gb25lIHdlIHNlbnRcblx0XHRcdFx0XHRsZXQgaW5SZXNwb25zZVRvO1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRpblJlc3BvbnNlVG8gPSByZXNwb25zZS5nZXRBdHRyaWJ1dGUoJ0luUmVzcG9uc2VUbycpO1xuXHRcdFx0XHRcdFx0ZGVidWdMb2coYEluIFJlc3BvbnNlIHRvOiAkeyBpblJlc3BvbnNlVG8gfWApO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdGlmIChNZXRlb3Iuc2V0dGluZ3MuZGVidWcpIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coYENhdWdodCBlcnJvcjogJHsgZSB9YCk7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1zZyA9IGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZU5TKCd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wnLCAnU3RhdHVzTWVzc2FnZScpO1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhgVW5leHBlY3RlZCBtc2cgZnJvbSBJRFAuIERvZXMgeW91ciBzZXNzaW9uIHN0aWxsIGV4aXN0IGF0IElEUD8gSWRwIHJldHVybmVkOiBcXG4gJHsgbXNnIH1gKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCBzdGF0dXNWYWxpZGF0ZU9iaiA9IHNlbGYudmFsaWRhdGVTdGF0dXMoZG9jKTtcblxuXHRcdFx0XHRcdGlmIChzdGF0dXNWYWxpZGF0ZU9iai5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHRjYWxsYmFjayhudWxsLCBpblJlc3BvbnNlVG8pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjYWxsYmFjaygnRXJyb3IuIExvZ291dCBub3QgY29uZmlybWVkIGJ5IElEUCcsIG51bGwpO1xuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNhbGxiYWNrKCdObyBSZXNwb25zZSBGb3VuZCcsIG51bGwpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdH0pO1xufTtcblxuU0FNTC5wcm90b3R5cGUubWFwQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGF0dHJpYnV0ZVN0YXRlbWVudCwgcHJvZmlsZSkge1xuXHRkZWJ1Z0xvZyhgQXR0cmlidXRlIFN0YXRlbWVudCBmb3VuZCBpbiBTQU1MIHJlc3BvbnNlOiAkeyBhdHRyaWJ1dGVTdGF0ZW1lbnQgfWApO1xuXHRjb25zdCBhdHRyaWJ1dGVzID0gYXR0cmlidXRlU3RhdGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24nLCAnQXR0cmlidXRlJyk7XG5cdGRlYnVnTG9nKGBBdHRyaWJ1dGVzIHdpbGwgYmUgcHJvY2Vzc2VkOiAkeyBhdHRyaWJ1dGVzLmxlbmd0aCB9YCk7XG5cblx0aWYgKGF0dHJpYnV0ZXMpIHtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGNvbnN0IHZhbHVlcyA9IGF0dHJpYnV0ZXNbaV0uZ2V0RWxlbWVudHNCeVRhZ05hbWVOUygndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFzc2VydGlvbicsICdBdHRyaWJ1dGVWYWx1ZScpO1xuXHRcdFx0bGV0IHZhbHVlO1xuXHRcdFx0aWYgKHZhbHVlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0dmFsdWUgPSB2YWx1ZXNbMF0udGV4dENvbnRlbnQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YWx1ZSA9IFtdO1xuXHRcdFx0XHRmb3IgKGxldCBqPTA7ajx2YWx1ZXMubGVuZ3RoO2orKykge1xuXHRcdFx0XHRcdHZhbHVlLnB1c2godmFsdWVzW2pdLnRleHRDb250ZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBrZXkgPSBhdHRyaWJ1dGVzW2ldLmdldEF0dHJpYnV0ZSgnTmFtZScpO1xuXG5cdFx0XHRkZWJ1Z0xvZyhgTmFtZTogICR7IGF0dHJpYnV0ZXNbaV0gfWApO1xuXHRcdFx0ZGVidWdMb2coYEFkZGluZyBhdHRyaWJ1dGUgZnJvbSBTQU1MIHJlc3BvbnNlIHRvIHByb2ZpbGU6ICR7IGtleSB9ID0gJHsgdmFsdWUgfWApO1xuXHRcdFx0cHJvZmlsZVtrZXldID0gdmFsdWU7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGRlYnVnTG9nKCdObyBBdHRyaWJ1dGVzIGZvdW5kIGluIFNBTUwgYXR0cmlidXRlIHN0YXRlbWVudC4nKTtcblx0fVxuXG5cdGlmICghcHJvZmlsZS5tYWlsICYmIHByb2ZpbGVbJ3VybjpvaWQ6MC45LjIzNDIuMTkyMDAzMDAuMTAwLjEuMyddKSB7XG5cdFx0Ly8gU2VlIGh0dHA6Ly93d3cuaW5jb21tb25mZWRlcmF0aW9uLm9yZy9hdHRyaWJ1dGVzdW1tYXJ5Lmh0bWwgZm9yIGRlZmluaXRpb24gb2YgYXR0cmlidXRlIE9JRHNcblx0XHRwcm9maWxlLm1haWwgPSBwcm9maWxlWyd1cm46b2lkOjAuOS4yMzQyLjE5MjAwMzAwLjEwMC4xLjMnXTtcblx0fVxuXG5cdGlmICghcHJvZmlsZS5lbWFpbCAmJiBwcm9maWxlWyd1cm46b2lkOjEuMi44NDAuMTEzNTQ5LjEuOS4xJ10pIHtcblx0XHRwcm9maWxlLmVtYWlsID0gcHJvZmlsZVsndXJuOm9pZDoxLjIuODQwLjExMzU0OS4xLjkuMSddO1xuXHR9XG5cblx0aWYgKCFwcm9maWxlLmVtYWlsICYmIHByb2ZpbGUubWFpbCkge1xuXHRcdHByb2ZpbGUuZW1haWwgPSBwcm9maWxlLm1haWw7XG5cdH1cbn07XG5cblNBTUwucHJvdG90eXBlLnZhbGlkYXRlUmVzcG9uc2UgPSBmdW5jdGlvbihzYW1sUmVzcG9uc2UsIHJlbGF5U3RhdGUsIGNhbGxiYWNrKSB7XG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRjb25zdCB4bWwgPSBuZXcgQnVmZmVyKHNhbWxSZXNwb25zZSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCd1dGY4Jyk7XG5cdC8vIFdlIGN1cnJlbnRseSB1c2UgUmVsYXlTdGF0ZSB0byBzYXZlIFNBTUwgcHJvdmlkZXJcblx0ZGVidWdMb2coYFZhbGlkYXRpbmcgcmVzcG9uc2Ugd2l0aCByZWxheSBzdGF0ZTogJHsgeG1sIH1gKTtcblxuXHRjb25zdCBkb2MgPSBuZXcgeG1sZG9tLkRPTVBhcnNlcigpLnBhcnNlRnJvbVN0cmluZyh4bWwsICd0ZXh0L3htbCcpO1xuXG5cdGlmIChkb2MpIHtcblx0XHRkZWJ1Z0xvZygnVmVyaWZ5IHN0YXR1cycpO1xuXHRcdGNvbnN0IHN0YXR1c1ZhbGlkYXRlT2JqID0gc2VsZi52YWxpZGF0ZVN0YXR1cyhkb2MpO1xuXG5cdFx0aWYgKHN0YXR1c1ZhbGlkYXRlT2JqLnN1Y2Nlc3MpIHtcblx0XHRcdGRlYnVnTG9nKCdTdGF0dXMgb2snKTtcblxuXHRcdFx0Ly8gVmVyaWZ5IHNpZ25hdHVyZVxuXHRcdFx0ZGVidWdMb2coJ1ZlcmlmeSBzaWduYXR1cmUnKTtcblx0XHRcdGlmIChzZWxmLm9wdGlvbnMuY2VydCAmJiAhc2VsZi52YWxpZGF0ZVNpZ25hdHVyZSh4bWwsIHNlbGYub3B0aW9ucy5jZXJ0KSkge1xuXHRcdFx0XHRkZWJ1Z0xvZygnU2lnbmF0dXJlIFdST05HJyk7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ0ludmFsaWQgc2lnbmF0dXJlJyksIG51bGwsIGZhbHNlKTtcblx0XHRcdH1cblx0XHRcdGRlYnVnTG9nKCdTaWduYXR1cmUgT0snKTtcblxuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBkb2MuZ2V0RWxlbWVudHNCeVRhZ05hbWVOUygndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sJywgJ1Jlc3BvbnNlJylbMF07XG5cdFx0XHRpZiAocmVzcG9uc2UpIHtcblx0XHRcdFx0ZGVidWdMb2coJ0dvdCByZXNwb25zZScpO1xuXG5cdFx0XHRcdGNvbnN0IGFzc2VydGlvbiA9IHJlc3BvbnNlLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24nLCAnQXNzZXJ0aW9uJylbMF07XG5cdFx0XHRcdGlmICghYXNzZXJ0aW9uKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignTWlzc2luZyBTQU1MIGFzc2VydGlvbicpLCBudWxsLCBmYWxzZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBwcm9maWxlID0ge307XG5cblx0XHRcdFx0aWYgKHJlc3BvbnNlLmhhc0F0dHJpYnV0ZSgnSW5SZXNwb25zZVRvJykpIHtcblx0XHRcdFx0XHRwcm9maWxlLmluUmVzcG9uc2VUb0lkID0gcmVzcG9uc2UuZ2V0QXR0cmlidXRlKCdJblJlc3BvbnNlVG8nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGlzc3VlciA9IGFzc2VydGlvbi5nZXRFbGVtZW50c0J5VGFnTmFtZU5TKCd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uJywgJ0lzc3VlcicpWzBdO1xuXHRcdFx0XHRpZiAoaXNzdWVyKSB7XG5cdFx0XHRcdFx0cHJvZmlsZS5pc3N1ZXIgPSBpc3N1ZXIudGV4dENvbnRlbnQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBzdWJqZWN0ID0gYXNzZXJ0aW9uLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24nLCAnU3ViamVjdCcpWzBdO1xuXG5cdFx0XHRcdGlmIChzdWJqZWN0KSB7XG5cdFx0XHRcdFx0Y29uc3QgbmFtZUlEID0gc3ViamVjdC5nZXRFbGVtZW50c0J5VGFnTmFtZU5TKCd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uJywgJ05hbWVJRCcpWzBdO1xuXHRcdFx0XHRcdGlmIChuYW1lSUQpIHtcblx0XHRcdFx0XHRcdHByb2ZpbGUubmFtZUlEID0gbmFtZUlELnRleHRDb250ZW50O1xuXG5cdFx0XHRcdFx0XHRpZiAobmFtZUlELmhhc0F0dHJpYnV0ZSgnRm9ybWF0JykpIHtcblx0XHRcdFx0XHRcdFx0cHJvZmlsZS5uYW1lSURGb3JtYXQgPSBuYW1lSUQuZ2V0QXR0cmlidXRlKCdGb3JtYXQnKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBhdXRoblN0YXRlbWVudCA9IGFzc2VydGlvbi5nZXRFbGVtZW50c0J5VGFnTmFtZU5TKCd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uJywgJ0F1dGhuU3RhdGVtZW50JylbMF07XG5cblx0XHRcdFx0aWYgKGF1dGhuU3RhdGVtZW50KSB7XG5cdFx0XHRcdFx0aWYgKGF1dGhuU3RhdGVtZW50Lmhhc0F0dHJpYnV0ZSgnU2Vzc2lvbkluZGV4JykpIHtcblxuXHRcdFx0XHRcdFx0cHJvZmlsZS5zZXNzaW9uSW5kZXggPSBhdXRoblN0YXRlbWVudC5nZXRBdHRyaWJ1dGUoJ1Nlc3Npb25JbmRleCcpO1xuXHRcdFx0XHRcdFx0ZGVidWdMb2coYFNlc3Npb24gSW5kZXg6ICR7IHByb2ZpbGUuc2Vzc2lvbkluZGV4IH1gKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZGVidWdMb2coJ05vIFNlc3Npb24gSW5kZXggRm91bmQnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZGVidWdMb2coJ05vIEF1dGhOIFN0YXRlbWVudCBmb3VuZCcpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgYXR0cmlidXRlU3RhdGVtZW50ID0gYXNzZXJ0aW9uLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24nLCAnQXR0cmlidXRlU3RhdGVtZW50JylbMF07XG5cdFx0XHRcdGlmIChhdHRyaWJ1dGVTdGF0ZW1lbnQpIHtcblx0XHRcdFx0XHR0aGlzLm1hcEF0dHJpYnV0ZXMoYXR0cmlidXRlU3RhdGVtZW50LCBwcm9maWxlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkZWJ1Z0xvZygnTm8gQXR0cmlidXRlIFN0YXRlbWVudCBmb3VuZCBpbiBTQU1MIHJlc3BvbnNlLicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCFwcm9maWxlLmVtYWlsICYmIHByb2ZpbGUubmFtZUlEICYmIHByb2ZpbGUubmFtZUlERm9ybWF0ICYmIHByb2ZpbGUubmFtZUlERm9ybWF0LmluZGV4T2YoJ2VtYWlsQWRkcmVzcycpID49IDApIHtcblx0XHRcdFx0XHRwcm9maWxlLmVtYWlsID0gcHJvZmlsZS5uYW1lSUQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBwcm9maWxlS2V5cyA9IE9iamVjdC5rZXlzKHByb2ZpbGUpO1xuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHByb2ZpbGVLZXlzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0Y29uc3Qga2V5ID0gcHJvZmlsZUtleXNbaV07XG5cblx0XHRcdFx0XHRpZiAoa2V5Lm1hdGNoKC9cXC4vKSkge1xuXHRcdFx0XHRcdFx0cHJvZmlsZVtrZXkucmVwbGFjZSgvXFwuL2csICctJyldID0gcHJvZmlsZVtrZXldO1xuXHRcdFx0XHRcdFx0ZGVsZXRlIHByb2ZpbGVba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkZWJ1Z0xvZyhgTmFtZUlEOiAkeyBKU09OLnN0cmluZ2lmeShwcm9maWxlKSB9YCk7XG5cdFx0XHRcdGNhbGxiYWNrKG51bGwsIHByb2ZpbGUsIGZhbHNlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0IGxvZ291dFJlc3BvbnNlID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpwcm90b2NvbCcsICdMb2dvdXRSZXNwb25zZScpO1xuXG5cdFx0XHRcdGlmIChsb2dvdXRSZXNwb25zZSkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKG51bGwsIG51bGwsIHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ1Vua25vd24gU0FNTCByZXNwb25zZSBtZXNzYWdlJyksIG51bGwsIGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKGBTdGF0dXMgaXM6ICAkeyBzdGF0dXNWYWxpZGF0ZU9iai5zdGF0dXNDb2RlIH1gKSwgbnVsbCwgZmFsc2UpO1xuXHRcdH1cblx0fVxufTtcblxubGV0IGRlY3J5cHRpb25DZXJ0O1xuU0FNTC5wcm90b3R5cGUuZ2VuZXJhdGVTZXJ2aWNlUHJvdmlkZXJNZXRhZGF0YSA9IGZ1bmN0aW9uKGNhbGxiYWNrVXJsKSB7XG5cblx0aWYgKCFkZWNyeXB0aW9uQ2VydCkge1xuXHRcdGRlY3J5cHRpb25DZXJ0ID0gdGhpcy5vcHRpb25zLnByaXZhdGVDZXJ0O1xuXHR9XG5cblx0aWYgKCF0aGlzLm9wdGlvbnMuY2FsbGJhY2tVcmwgJiYgIWNhbGxiYWNrVXJsKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFxuXHRcdFx0J1VuYWJsZSB0byBnZW5lcmF0ZSBzZXJ2aWNlIHByb3ZpZGVyIG1ldGFkYXRhIHdoZW4gY2FsbGJhY2tVcmwgb3B0aW9uIGlzIG5vdCBzZXQnKTtcblx0fVxuXG5cdGNvbnN0IG1ldGFkYXRhID0ge1xuXHRcdCdFbnRpdHlEZXNjcmlwdG9yJzoge1xuXHRcdFx0J0B4bWxucyc6ICd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6bWV0YWRhdGEnLFxuXHRcdFx0J0B4bWxuczpkcyc6ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjJyxcblx0XHRcdCdAZW50aXR5SUQnOiB0aGlzLm9wdGlvbnMuaXNzdWVyLFxuXHRcdFx0J1NQU1NPRGVzY3JpcHRvcic6IHtcblx0XHRcdFx0J0Bwcm90b2NvbFN1cHBvcnRFbnVtZXJhdGlvbic6ICd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wnLFxuXHRcdFx0XHQnU2luZ2xlTG9nb3V0U2VydmljZSc6IHtcblx0XHRcdFx0XHQnQEJpbmRpbmcnOiAndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmJpbmRpbmdzOkhUVFAtUmVkaXJlY3QnLFxuXHRcdFx0XHRcdCdATG9jYXRpb24nOiBgJHsgTWV0ZW9yLmFic29sdXRlVXJsKCkgfV9zYW1sL2xvZ291dC8keyB0aGlzLm9wdGlvbnMucHJvdmlkZXIgfS9gLFxuXHRcdFx0XHRcdCdAUmVzcG9uc2VMb2NhdGlvbic6IGAkeyBNZXRlb3IuYWJzb2x1dGVVcmwoKSB9X3NhbWwvbG9nb3V0LyR7IHRoaXMub3B0aW9ucy5wcm92aWRlciB9L2Bcblx0XHRcdFx0fSxcblx0XHRcdFx0J05hbWVJREZvcm1hdCc6IHRoaXMub3B0aW9ucy5pZGVudGlmaWVyRm9ybWF0LFxuXHRcdFx0XHQnQXNzZXJ0aW9uQ29uc3VtZXJTZXJ2aWNlJzoge1xuXHRcdFx0XHRcdCdAaW5kZXgnOiAnMScsXG5cdFx0XHRcdFx0J0Bpc0RlZmF1bHQnOiAndHJ1ZScsXG5cdFx0XHRcdFx0J0BCaW5kaW5nJzogJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpiaW5kaW5nczpIVFRQLVBPU1QnLFxuXHRcdFx0XHRcdCdATG9jYXRpb24nOiBjYWxsYmFja1VybFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdGlmICh0aGlzLm9wdGlvbnMucHJpdmF0ZUtleSkge1xuXHRcdGlmICghZGVjcnlwdGlvbkNlcnQpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0J01pc3NpbmcgZGVjcnlwdGlvbkNlcnQgd2hpbGUgZ2VuZXJhdGluZyBtZXRhZGF0YSBmb3IgZGVjcnlwdGluZyBzZXJ2aWNlIHByb3ZpZGVyJyk7XG5cdFx0fVxuXG5cdFx0ZGVjcnlwdGlvbkNlcnQgPSBkZWNyeXB0aW9uQ2VydC5yZXBsYWNlKC8tK0JFR0lOIENFUlRJRklDQVRFLStcXHI/XFxuPy8sICcnKTtcblx0XHRkZWNyeXB0aW9uQ2VydCA9IGRlY3J5cHRpb25DZXJ0LnJlcGxhY2UoLy0rRU5EIENFUlRJRklDQVRFLStcXHI/XFxuPy8sICcnKTtcblx0XHRkZWNyeXB0aW9uQ2VydCA9IGRlY3J5cHRpb25DZXJ0LnJlcGxhY2UoL1xcclxcbi9nLCAnXFxuJyk7XG5cblx0XHRtZXRhZGF0YVsnRW50aXR5RGVzY3JpcHRvciddWydTUFNTT0Rlc2NyaXB0b3InXVsnS2V5RGVzY3JpcHRvciddID0ge1xuXHRcdFx0J2RzOktleUluZm8nOiB7XG5cdFx0XHRcdCdkczpYNTA5RGF0YSc6IHtcblx0XHRcdFx0XHQnZHM6WDUwOUNlcnRpZmljYXRlJzoge1xuXHRcdFx0XHRcdFx0JyN0ZXh0JzogZGVjcnlwdGlvbkNlcnRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQnRW5jcnlwdGlvbk1ldGhvZCc6IFtcblx0XHRcdFx0Ly8gdGhpcyBzaG91bGQgYmUgdGhlIHNldCB0aGF0IHRoZSB4bWxlbmMgbGlicmFyeSBzdXBwb3J0c1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0J0BBbGdvcml0aG0nOiAnaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxlbmMjYWVzMjU2LWNiYydcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCdAQWxnb3JpdGhtJzogJ2h0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZW5jI2FlczEyOC1jYmMnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQnQEFsZ29yaXRobSc6ICdodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGVuYyN0cmlwbGVkZXMtY2JjJ1xuXHRcdFx0XHR9XG5cdFx0XHRdXG5cdFx0fTtcblx0fVxuXG5cdHJldHVybiB4bWxidWlsZGVyLmNyZWF0ZShtZXRhZGF0YSkuZW5kKHtcblx0XHRwcmV0dHk6IHRydWUsXG5cdFx0aW5kZW50OiAnICAnLFxuXHRcdG5ld2xpbmU6ICdcXG4nXG5cdH0pO1xufTtcbiIsImNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoJ3N0ZWZmbzptZXRlb3ItYWNjb3VudHMtc2FtbCcsIHtcblx0bWV0aG9kczoge1xuXHRcdHVwZGF0ZWQ6IHtcblx0XHRcdHR5cGU6ICdpbmZvJ1xuXHRcdH1cblx0fVxufSk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ1NBTUwnKTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRhZGRTYW1sU2VydmljZShuYW1lKSB7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYFNBTUxfQ3VzdG9tXyR7IG5hbWUgfWAsIGZhbHNlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRncm91cDogJ1NBTUwnLFxuXHRcdFx0c2VjdGlvbjogbmFtZSxcblx0XHRcdGkxOG5MYWJlbDogJ0FjY291bnRzX09BdXRoX0N1c3RvbV9FbmFibGUnXG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYFNBTUxfQ3VzdG9tXyR7IG5hbWUgfV9wcm92aWRlcmAsICdwcm92aWRlci1uYW1lJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRncm91cDogJ1NBTUwnLFxuXHRcdFx0c2VjdGlvbjogbmFtZSxcblx0XHRcdGkxOG5MYWJlbDogJ1NBTUxfQ3VzdG9tX1Byb3ZpZGVyJ1xuXHRcdH0pO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBTQU1MX0N1c3RvbV8keyBuYW1lIH1fZW50cnlfcG9pbnRgLCAnaHR0cHM6Ly9leGFtcGxlLmNvbS9zaW1wbGVzYW1sL3NhbWwyL2lkcC9TU09TZXJ2aWNlLnBocCcsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9FbnRyeV9wb2ludCdcblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgU0FNTF9DdXN0b21fJHsgbmFtZSB9X2lkcF9zbG9fcmVkaXJlY3RfdXJsYCwgJ2h0dHBzOi8vZXhhbXBsZS5jb20vc2ltcGxlc2FtbC9zYW1sMi9pZHAvU2luZ2xlTG9nb3V0U2VydmljZS5waHAnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnU0FNTF9DdXN0b21fSURQX1NMT19SZWRpcmVjdF9VUkwnXG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYFNBTUxfQ3VzdG9tXyR7IG5hbWUgfV9pc3N1ZXJgLCAnaHR0cHM6Ly95b3VyLXJvY2tldC1jaGF0L19zYW1sL21ldGFkYXRhL3Byb3ZpZGVyLW5hbWUnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnU0FNTF9DdXN0b21fSXNzdWVyJ1xuXHRcdH0pO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBTQU1MX0N1c3RvbV8keyBuYW1lIH1fY2VydGAsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnU0FNTF9DdXN0b21fQ2VydCcsXG5cdFx0XHRtdWx0aWxpbmU6IHRydWVcblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgU0FNTF9DdXN0b21fJHsgbmFtZSB9X3B1YmxpY19jZXJ0YCwgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRtdWx0aWxpbmU6IHRydWUsXG5cdFx0XHRpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9QdWJsaWNfQ2VydCdcblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgU0FNTF9DdXN0b21fJHsgbmFtZSB9X3ByaXZhdGVfa2V5YCwgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRtdWx0aWxpbmU6IHRydWUsXG5cdFx0XHRpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9Qcml2YXRlX0tleSdcblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgU0FNTF9DdXN0b21fJHsgbmFtZSB9X2J1dHRvbl9sYWJlbF90ZXh0YCwgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdBY2NvdW50c19PQXV0aF9DdXN0b21fQnV0dG9uX0xhYmVsX1RleHQnXG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYFNBTUxfQ3VzdG9tXyR7IG5hbWUgfV9idXR0b25fbGFiZWxfY29sb3JgLCAnI0ZGRkZGRicsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdBY2NvdW50c19PQXV0aF9DdXN0b21fQnV0dG9uX0xhYmVsX0NvbG9yJ1xuXHRcdH0pO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBTQU1MX0N1c3RvbV8keyBuYW1lIH1fYnV0dG9uX2NvbG9yYCwgJyMxMzY3OUEnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnQWNjb3VudHNfT0F1dGhfQ3VzdG9tX0J1dHRvbl9Db2xvcidcblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgU0FNTF9DdXN0b21fJHsgbmFtZSB9X2dlbmVyYXRlX3VzZXJuYW1lYCwgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnU0FNTF9DdXN0b21fR2VuZXJhdGVfVXNlcm5hbWUnXG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYFNBTUxfQ3VzdG9tXyR7IG5hbWUgfV9sb2dvdXRfYmVoYXZpb3VyYCwgJ1NBTUwnLCB7XG5cdFx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHRcdHZhbHVlczogW1xuXHRcdFx0XHR7a2V5OiAnU0FNTCcsIGkxOG5MYWJlbDogJ1NBTUxfQ3VzdG9tX0xvZ291dF9CZWhhdmlvdXJfVGVybWluYXRlX1NBTUxfU2Vzc2lvbid9LFxuXHRcdFx0XHR7a2V5OiAnTG9jYWwnLCBpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9Mb2dvdXRfQmVoYXZpb3VyX0VuZF9Pbmx5X1JvY2tldENoYXQnfVxuXHRcdFx0XSxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnU0FNTF9DdXN0b21fTG9nb3V0X0JlaGF2aW91cidcblx0XHR9KTtcblx0fVxufSk7XG5cbmNvbnN0IGdldFNhbWxDb25maWdzID0gZnVuY3Rpb24oc2VydmljZSkge1xuXHRyZXR1cm4ge1xuXHRcdGJ1dHRvbkxhYmVsVGV4dDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYCR7IHNlcnZpY2Uua2V5IH1fYnV0dG9uX2xhYmVsX3RleHRgKSxcblx0XHRidXR0b25MYWJlbENvbG9yOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgJHsgc2VydmljZS5rZXkgfV9idXR0b25fbGFiZWxfY29sb3JgKSxcblx0XHRidXR0b25Db2xvcjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYCR7IHNlcnZpY2Uua2V5IH1fYnV0dG9uX2NvbG9yYCksXG5cdFx0Y2xpZW50Q29uZmlnOiB7XG5cdFx0XHRwcm92aWRlcjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYCR7IHNlcnZpY2Uua2V5IH1fcHJvdmlkZXJgKVxuXHRcdH0sXG5cdFx0ZW50cnlQb2ludDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYCR7IHNlcnZpY2Uua2V5IH1fZW50cnlfcG9pbnRgKSxcblx0XHRpZHBTTE9SZWRpcmVjdFVSTDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYCR7IHNlcnZpY2Uua2V5IH1faWRwX3Nsb19yZWRpcmVjdF91cmxgKSxcblx0XHRnZW5lcmF0ZVVzZXJuYW1lOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgJHsgc2VydmljZS5rZXkgfV9nZW5lcmF0ZV91c2VybmFtZWApLFxuXHRcdGlzc3VlcjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYCR7IHNlcnZpY2Uua2V5IH1faXNzdWVyYCksXG5cdFx0bG9nb3V0QmVoYXZpb3VyOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgJHsgc2VydmljZS5rZXkgfV9sb2dvdXRfYmVoYXZpb3VyYCksXG5cdFx0c2VjcmV0OiB7XG5cdFx0XHRwcml2YXRlS2V5OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgJHsgc2VydmljZS5rZXkgfV9wcml2YXRlX2tleWApLFxuXHRcdFx0cHVibGljQ2VydDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYCR7IHNlcnZpY2Uua2V5IH1fcHVibGljX2NlcnRgKSxcblx0XHRcdGNlcnQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGAkeyBzZXJ2aWNlLmtleSB9X2NlcnRgKVxuXHRcdH1cblx0fTtcbn07XG5cbmNvbnN0IGRlYm91bmNlID0gKGZuLCBkZWxheSkgPT4ge1xuXHRsZXQgdGltZXIgPSBudWxsO1xuXHRyZXR1cm4gKCkgPT4ge1xuXHRcdGlmICh0aW1lciAhPSBudWxsKSB7XG5cdFx0XHRNZXRlb3IuY2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRpbWVyID0gTWV0ZW9yLnNldFRpbWVvdXQoZm4sIGRlbGF5KTtcblx0fTtcbn07XG5jb25zdCBzZXJ2aWNlTmFtZSA9ICdzYW1sJztcblxuY29uc3QgY29uZmlndXJlU2FtbFNlcnZpY2UgPSBmdW5jdGlvbihzYW1sQ29uZmlncykge1xuXHRsZXQgcHJpdmF0ZUNlcnQgPSBmYWxzZTtcblx0bGV0IHByaXZhdGVLZXkgPSBmYWxzZTtcblx0aWYgKHNhbWxDb25maWdzLnNlY3JldC5wcml2YXRlS2V5ICYmIHNhbWxDb25maWdzLnNlY3JldC5wdWJsaWNDZXJ0KSB7XG5cdFx0cHJpdmF0ZUtleSA9IHNhbWxDb25maWdzLnNlY3JldC5wcml2YXRlS2V5O1xuXHRcdHByaXZhdGVDZXJ0ID0gc2FtbENvbmZpZ3Muc2VjcmV0LnB1YmxpY0NlcnQ7XG5cdH0gZWxzZSBpZiAoc2FtbENvbmZpZ3Muc2VjcmV0LnByaXZhdGVLZXkgfHwgc2FtbENvbmZpZ3Muc2VjcmV0LnB1YmxpY0NlcnQpIHtcblx0XHRsb2dnZXIuZXJyb3IoJ1lvdSBtdXN0IHNwZWNpZnkgYm90aCBjZXJ0IGFuZCBrZXkgZmlsZXMuJyk7XG5cdH1cblx0Ly8gVE9ETzogdGhlIGZ1bmN0aW9uIGNvbmZpZ3VyZVNhbWxTZXJ2aWNlIGlzIGNhbGxlZCBtYW55IHRpbWVzIGFuZCBBY2NvdW50cy5zYW1sLnNldHRpbmdzLmdlbmVyYXRlVXNlcm5hbWUga2VlcHMganVzdCB0aGUgbGFzdCB2YWx1ZVxuXHRBY2NvdW50cy5zYW1sLnNldHRpbmdzLmdlbmVyYXRlVXNlcm5hbWUgPSBzYW1sQ29uZmlncy5nZW5lcmF0ZVVzZXJuYW1lO1xuXHRyZXR1cm4ge1xuXHRcdHByb3ZpZGVyOiBzYW1sQ29uZmlncy5jbGllbnRDb25maWcucHJvdmlkZXIsXG5cdFx0ZW50cnlQb2ludDogc2FtbENvbmZpZ3MuZW50cnlQb2ludCxcblx0XHRpZHBTTE9SZWRpcmVjdFVSTDogc2FtbENvbmZpZ3MuaWRwU0xPUmVkaXJlY3RVUkwsXG5cdFx0aXNzdWVyOiBzYW1sQ29uZmlncy5pc3N1ZXIsXG5cdFx0Y2VydDogc2FtbENvbmZpZ3Muc2VjcmV0LmNlcnQsXG5cdFx0cHJpdmF0ZUNlcnQsXG5cdFx0cHJpdmF0ZUtleVxuXHR9O1xufTtcblxuY29uc3QgdXBkYXRlU2VydmljZXMgPSBkZWJvdW5jZSgoKSA9PiB7XG5cdGNvbnN0IHNlcnZpY2VzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoL14oU0FNTF9DdXN0b21fKVthLXpdKyQvaSk7XG5cdEFjY291bnRzLnNhbWwuc2V0dGluZ3MucHJvdmlkZXJzID0gc2VydmljZXMubWFwKChzZXJ2aWNlKSA9PiB7XG5cdFx0aWYgKHNlcnZpY2UudmFsdWUgPT09IHRydWUpIHtcblx0XHRcdGNvbnN0IHNhbWxDb25maWdzID0gZ2V0U2FtbENvbmZpZ3Moc2VydmljZSk7XG5cdFx0XHRsb2dnZXIudXBkYXRlZChzZXJ2aWNlLmtleSk7XG5cdFx0XHRTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy51cHNlcnQoe1xuXHRcdFx0XHRzZXJ2aWNlOiBzZXJ2aWNlTmFtZS50b0xvd2VyQ2FzZSgpXG5cdFx0XHR9LCB7XG5cdFx0XHRcdCRzZXQ6IHNhbWxDb25maWdzXG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBjb25maWd1cmVTYW1sU2VydmljZShzYW1sQ29uZmlncyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLnJlbW92ZSh7XG5cdFx0XHRcdHNlcnZpY2U6IHNlcnZpY2VOYW1lLnRvTG93ZXJDYXNlKClcblx0XHRcdH0pO1xuXHRcdH1cblx0fSkuZmlsdGVyKGUgPT4gZSk7XG59LCAyMDAwKTtcblxuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgvXlNBTUxfLisvLCB1cGRhdGVTZXJ2aWNlcyk7XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0cmV0dXJuIE1ldGVvci5jYWxsKCdhZGRTYW1sU2VydmljZScsICdEZWZhdWx0Jyk7XG59KTtcblxuZXhwb3J0IHtcblx0dXBkYXRlU2VydmljZXMsXG5cdGNvbmZpZ3VyZVNhbWxTZXJ2aWNlLFxuXHRnZXRTYW1sQ29uZmlncyxcblx0ZGVib3VuY2UsXG5cdGxvZ2dlclxufTtcbiJdfQ==
