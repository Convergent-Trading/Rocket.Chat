(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Restivus = Package['nimble:restivus'].Restivus;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var result, endpoints, options, routes;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:api":{"server":{"api.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/api.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const logger = new Logger('API', {});

class API extends Restivus {
  constructor(properties) {
    super(properties);
    this.authMethods = [];
    this.fieldSeparator = '.';
    this.defaultFieldsToExclude = {
      joinCode: 0,
      members: 0,
      importIds: 0
    };
    this.limitedUserFieldsToExclude = {
      avatarOrigin: 0,
      emails: 0,
      phone: 0,
      statusConnection: 0,
      createdAt: 0,
      lastLogin: 0,
      services: 0,
      requirePasswordChange: 0,
      requirePasswordChangeReason: 0,
      roles: 0,
      statusDefault: 0,
      _updatedAt: 0,
      customFields: 0,
      settings: 0
    };
    this.limitedUserFieldsToExcludeIfIsPrivilegedUser = {
      services: 0
    };

    this._config.defaultOptionsEndpoint = function _defaultOptionsEndpoint() {
      if (this.request.method === 'OPTIONS' && this.request.headers['access-control-request-method']) {
        if (RocketChat.settings.get('API_Enable_CORS') === true) {
          this.response.writeHead(200, {
            'Access-Control-Allow-Origin': RocketChat.settings.get('API_CORS_Origin'),
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, X-User-Id, X-Auth-Token'
          });
        } else {
          this.response.writeHead(405);
          this.response.write('CORS not enabled. Go to "Admin > General > REST Api" to enable it.');
        }
      } else {
        this.response.writeHead(404);
      }

      this.done();
    };
  }

  hasHelperMethods() {
    return RocketChat.API.helperMethods.size !== 0;
  }

  getHelperMethods() {
    return RocketChat.API.helperMethods;
  }

  getHelperMethod(name) {
    return RocketChat.API.helperMethods.get(name);
  }

  addAuthMethod(method) {
    this.authMethods.push(method);
  }

  success(result = {}) {
    if (_.isObject(result)) {
      result.success = true;
    }

    result = {
      statusCode: 200,
      body: result
    };
    logger.debug('Success', result);
    return result;
  }

  failure(result, errorType, stack) {
    if (_.isObject(result)) {
      result.success = false;
    } else {
      result = {
        success: false,
        error: result,
        stack
      };

      if (errorType) {
        result.errorType = errorType;
      }
    }

    result = {
      statusCode: 400,
      body: result
    };
    logger.debug('Failure', result);
    return result;
  }

  notFound(msg) {
    return {
      statusCode: 404,
      body: {
        success: false,
        error: msg ? msg : 'Resource not found'
      }
    };
  }

  unauthorized(msg) {
    return {
      statusCode: 403,
      body: {
        success: false,
        error: msg ? msg : 'unauthorized'
      }
    };
  }

  addRoute(routes, options, endpoints) {
    // Note: required if the developer didn't provide options
    if (typeof endpoints === 'undefined') {
      endpoints = options;
      options = {};
    } // Allow for more than one route using the same option and endpoints


    if (!_.isArray(routes)) {
      routes = [routes];
    }

    const {
      version
    } = this._config;
    routes.forEach(route => {
      // Note: This is required due to Restivus calling `addRoute` in the constructor of itself
      Object.keys(endpoints).forEach(method => {
        if (typeof endpoints[method] === 'function') {
          endpoints[method] = {
            action: endpoints[method]
          };
        } // Add a try/catch for each endpoint


        const originalAction = endpoints[method].action;

        endpoints[method].action = function _internalRouteActionHandler() {
          const rocketchatRestApiEnd = RocketChat.metrics.rocketchatRestApi.startTimer({
            method,
            version,
            user_agent: this.request.headers['user-agent'],
            entrypoint: route
          });
          logger.debug(`${this.request.method.toUpperCase()}: ${this.request.url}`);
          let result;

          try {
            result = originalAction.apply(this);
          } catch (e) {
            logger.debug(`${method} ${route} threw an error:`, e.stack);
            result = RocketChat.API.v1.failure(e.message, e.error);
          }

          result = result || RocketChat.API.v1.success();
          rocketchatRestApiEnd({
            status: result.statusCode
          });
          return result;
        };

        if (this.hasHelperMethods()) {
          for (const [name, helperMethod] of this.getHelperMethods()) {
            endpoints[method][name] = helperMethod;
          }
        } // Allow the endpoints to make usage of the logger which respects the user's settings


        endpoints[method].logger = logger;
      });
      super.addRoute(route, options, endpoints);
    });
  }

  _initAuth() {
    const loginCompatibility = bodyParams => {
      // Grab the username or email that the user is logging in with
      const {
        user,
        username,
        email,
        password,
        code
      } = bodyParams;

      if (password == null) {
        return bodyParams;
      }

      if (_.without(Object.keys(bodyParams), 'user', 'username', 'email', 'password', 'code').length > 0) {
        return bodyParams;
      }

      const auth = {
        password
      };

      if (typeof user === 'string') {
        auth.user = user.includes('@') ? {
          email: user
        } : {
          username: user
        };
      } else if (username) {
        auth.user = {
          username
        };
      } else if (email) {
        auth.user = {
          email
        };
      }

      if (auth.user == null) {
        return bodyParams;
      }

      if (auth.password.hashed) {
        auth.password = {
          digest: auth.password,
          algorithm: 'sha-256'
        };
      }

      if (code) {
        return {
          totp: {
            code,
            login: auth
          }
        };
      }

      return auth;
    };

    const self = this;
    this.addRoute('login', {
      authRequired: false
    }, {
      post() {
        const args = loginCompatibility(this.bodyParams);
        const getUserInfo = self.getHelperMethod('getUserInfo');
        const invocation = new DDPCommon.MethodInvocation({
          connection: {
            close() {}

          }
        });
        let auth;

        try {
          auth = DDP._CurrentInvocation.withValue(invocation, () => Meteor.call('login', args));
        } catch (error) {
          let e = error;

          if (error.reason === 'User not found') {
            e = {
              error: 'Unauthorized',
              reason: 'Unauthorized'
            };
          }

          return {
            statusCode: 401,
            body: {
              status: 'error',
              error: e.error,
              message: e.reason || e.message
            }
          };
        }

        this.user = Meteor.users.findOne({
          _id: auth.id
        });
        this.userId = this.user._id; // Remove tokenExpires to keep the old behavior

        Meteor.users.update({
          _id: this.user._id,
          'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(auth.token)
        }, {
          $unset: {
            'services.resume.loginTokens.$.when': 1
          }
        });
        const response = {
          status: 'success',
          data: {
            userId: this.userId,
            authToken: auth.token,
            me: getUserInfo(this.user)
          }
        };

        const extraData = self._config.onLoggedIn && self._config.onLoggedIn.call(this);

        if (extraData != null) {
          _.extend(response.data, {
            extra: extraData
          });
        }

        return response;
      }

    });

    const logout = function () {
      // Remove the given auth token from the user's account
      const authToken = this.request.headers['x-auth-token'];

      const hashedToken = Accounts._hashLoginToken(authToken);

      const tokenLocation = self._config.auth.token;
      const index = tokenLocation.lastIndexOf('.');
      const tokenPath = tokenLocation.substring(0, index);
      const tokenFieldName = tokenLocation.substring(index + 1);
      const tokenToRemove = {};
      tokenToRemove[tokenFieldName] = hashedToken;
      const tokenRemovalQuery = {};
      tokenRemovalQuery[tokenPath] = tokenToRemove;
      Meteor.users.update(this.user._id, {
        $pull: tokenRemovalQuery
      });
      const response = {
        status: 'success',
        data: {
          message: 'You\'ve been logged out!'
        }
      }; // Call the logout hook with the authenticated user attached

      const extraData = self._config.onLoggedOut && self._config.onLoggedOut.call(this);

      if (extraData != null) {
        _.extend(response.data, {
          extra: extraData
        });
      }

      return response;
    };
    /*
    	Add a logout endpoint to the API
    	After the user is logged out, the onLoggedOut hook is called (see Restfully.configure() for
    	adding hook).
    */


    return this.addRoute('logout', {
      authRequired: true
    }, {
      get() {
        console.warn('Warning: Default logout via GET will be removed in Restivus v1.0. Use POST instead.');
        console.warn('    See https://github.com/kahmali/meteor-restivus/issues/100');
        return logout.call(this);
      },

      post: logout
    });
  }

}

const getUserAuth = function _getUserAuth(...args) {
  const invalidResults = [undefined, null, false];
  return {
    token: 'services.resume.loginTokens.hashedToken',

    user() {
      if (this.bodyParams && this.bodyParams.payload) {
        this.bodyParams = JSON.parse(this.bodyParams.payload);
      }

      for (let i = 0; i < RocketChat.API.v1.authMethods.length; i++) {
        const method = RocketChat.API.v1.authMethods[i];

        if (typeof method === 'function') {
          const result = method.apply(this, args);

          if (!invalidResults.includes(result)) {
            return result;
          }
        }
      }

      let token;

      if (this.request.headers['x-auth-token']) {
        token = Accounts._hashLoginToken(this.request.headers['x-auth-token']);
      }

      return {
        userId: this.request.headers['x-user-id'],
        token
      };
    }

  };
};

RocketChat.API = {
  helperMethods: new Map(),
  getUserAuth,
  ApiClass: API
};

const createApi = function _createApi(enableCors) {
  if (!RocketChat.API.v1 || RocketChat.API.v1._config.enableCors !== enableCors) {
    RocketChat.API.v1 = new API({
      version: 'v1',
      useDefaultAuth: true,
      prettyJson: process.env.NODE_ENV === 'development',
      enableCors,
      auth: getUserAuth()
    });
  }

  if (!RocketChat.API.default || RocketChat.API.default._config.enableCors !== enableCors) {
    RocketChat.API.default = new API({
      useDefaultAuth: true,
      prettyJson: process.env.NODE_ENV === 'development',
      enableCors,
      auth: getUserAuth()
    });
  }
}; // register the API to be re-created once the CORS-setting changes.


RocketChat.settings.get('API_Enable_CORS', (key, value) => {
  createApi(value);
}); // also create the API immediately

createApi(!!RocketChat.settings.get('API_Enable_CORS'));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/settings.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.settings.addGroup('General', function () {
  this.section('REST API', function () {
    this.add('API_Upper_Count_Limit', 100, {
      type: 'int',
      public: false
    });
    this.add('API_Default_Count', 50, {
      type: 'int',
      public: false
    });
    this.add('API_Allow_Infinite_Count', true, {
      type: 'boolean',
      public: false
    });
    this.add('API_Enable_Direct_Message_History_EndPoint', false, {
      type: 'boolean',
      public: false
    });
    this.add('API_Enable_Shields', true, {
      type: 'boolean',
      public: false
    });
    this.add('API_Shield_Types', '*', {
      type: 'string',
      public: false,
      enableQuery: {
        _id: 'API_Enable_Shields',
        value: true
      }
    });
    this.add('API_Enable_CORS', false, {
      type: 'boolean',
      public: false
    });
    this.add('API_CORS_Origin', '*', {
      type: 'string',
      public: false,
      enableQuery: {
        _id: 'API_Enable_CORS',
        value: true
      }
    });
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"helpers":{"requestParams.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/requestParams.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('requestParams', function _requestParams() {
  return ['POST', 'PUT'].includes(this.request.method) ? this.bodyParams : this.queryParams;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getPaginationItems.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/getPaginationItems.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// If the count query param is higher than the "API_Upper_Count_Limit" setting, then we limit that
// If the count query param isn't defined, then we set it to the "API_Default_Count" setting
// If the count is zero, then that means unlimited and is only allowed if the setting "API_Allow_Infinite_Count" is true
RocketChat.API.helperMethods.set('getPaginationItems', function _getPaginationItems() {
  const hardUpperLimit = RocketChat.settings.get('API_Upper_Count_Limit') <= 0 ? 100 : RocketChat.settings.get('API_Upper_Count_Limit');
  const defaultCount = RocketChat.settings.get('API_Default_Count') <= 0 ? 50 : RocketChat.settings.get('API_Default_Count');
  const offset = this.queryParams.offset ? parseInt(this.queryParams.offset) : 0;
  let count = defaultCount; // Ensure count is an appropiate amount

  if (typeof this.queryParams.count !== 'undefined') {
    count = parseInt(this.queryParams.count);
  } else {
    count = defaultCount;
  }

  if (count > hardUpperLimit) {
    count = hardUpperLimit;
  }

  if (count === 0 && !RocketChat.settings.get('API_Allow_Infinite_Count')) {
    count = defaultCount;
  }

  return {
    offset,
    count
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUserFromParams.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/getUserFromParams.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Convenience method, almost need to turn it into a middleware of sorts
RocketChat.API.helperMethods.set('getUserFromParams', function _getUserFromParams() {
  const doesntExist = {
    _doesntExist: true
  };
  let user;
  const params = this.requestParams();

  if (params.userId && params.userId.trim()) {
    user = RocketChat.models.Users.findOneById(params.userId) || doesntExist;
  } else if (params.username && params.username.trim()) {
    user = RocketChat.models.Users.findOneByUsername(params.username) || doesntExist;
  } else if (params.user && params.user.trim()) {
    user = RocketChat.models.Users.findOneByUsername(params.user) || doesntExist;
  } else {
    throw new Meteor.Error('error-user-param-not-provided', 'The required "userId" or "username" param was not provided');
  }

  if (user._doesntExist) {
    throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
  }

  return user;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUserInfo.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/getUserInfo.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const getInfoFromUserObject = user => {
  const {
    _id,
    name,
    emails,
    status,
    statusConnection,
    username,
    utcOffset,
    active,
    language,
    roles,
    settings,
    customFields
  } = user;
  return {
    _id,
    name,
    emails,
    status,
    statusConnection,
    username,
    utcOffset,
    active,
    language,
    roles,
    settings,
    customFields
  };
};

RocketChat.API.helperMethods.set('getUserInfo', function _getUserInfo(user) {
  const me = getInfoFromUserObject(user);

  const isVerifiedEmail = () => {
    if (me && me.emails && Array.isArray(me.emails)) {
      return me.emails.find(email => email.verified);
    }

    return false;
  };

  const getUserPreferences = () => {
    const defaultUserSettingPrefix = 'Accounts_Default_User_Preferences_';
    const allDefaultUserSettings = RocketChat.settings.get(new RegExp(`^${defaultUserSettingPrefix}.*$`));
    return allDefaultUserSettings.reduce((accumulator, setting) => {
      const settingWithoutPrefix = setting.key.replace(defaultUserSettingPrefix, ' ').trim();
      accumulator[settingWithoutPrefix] = RocketChat.getUserPreference(user, settingWithoutPrefix);
      return accumulator;
    }, {});
  };

  const verifiedEmail = isVerifiedEmail();
  me.email = verifiedEmail ? verifiedEmail.address : undefined;
  me.settings = {
    preferences: getUserPreferences()
  };
  return me;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"isUserFromParams.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/isUserFromParams.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('isUserFromParams', function _isUserFromParams() {
  const params = this.requestParams();
  return !params.userId && !params.username && !params.user || params.userId && this.userId === params.userId || params.username && this.user.username === params.username || params.user && this.user.username === params.user;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"parseJsonQuery.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/parseJsonQuery.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('parseJsonQuery', function _parseJsonQuery() {
  let sort;

  if (this.queryParams.sort) {
    try {
      sort = JSON.parse(this.queryParams.sort);
    } catch (e) {
      this.logger.warn(`Invalid sort parameter provided "${this.queryParams.sort}":`, e);
      throw new Meteor.Error('error-invalid-sort', `Invalid sort parameter provided: "${this.queryParams.sort}"`, {
        helperMethod: 'parseJsonQuery'
      });
    }
  }

  let fields;

  if (this.queryParams.fields) {
    try {
      fields = JSON.parse(this.queryParams.fields);
    } catch (e) {
      this.logger.warn(`Invalid fields parameter provided "${this.queryParams.fields}":`, e);
      throw new Meteor.Error('error-invalid-fields', `Invalid fields parameter provided: "${this.queryParams.fields}"`, {
        helperMethod: 'parseJsonQuery'
      });
    }
  } // Verify the user's selected fields only contains ones which their role allows


  if (typeof fields === 'object') {
    let nonSelectableFields = Object.keys(RocketChat.API.v1.defaultFieldsToExclude);

    if (this.request.route.includes('/v1/users.')) {
      const getFields = () => Object.keys(RocketChat.authz.hasPermission(this.userId, 'view-full-other-user-info') ? RocketChat.API.v1.limitedUserFieldsToExcludeIfIsPrivilegedUser : RocketChat.API.v1.limitedUserFieldsToExclude);

      nonSelectableFields = nonSelectableFields.concat(getFields());
    }

    Object.keys(fields).forEach(k => {
      if (nonSelectableFields.includes(k) || nonSelectableFields.includes(k.split(RocketChat.API.v1.fieldSeparator)[0])) {
        delete fields[k];
      }
    });
  } // Limit the fields by default


  fields = Object.assign({}, fields, RocketChat.API.v1.defaultFieldsToExclude);

  if (this.request.route.includes('/v1/users.')) {
    if (RocketChat.authz.hasPermission(this.userId, 'view-full-other-user-info')) {
      fields = Object.assign(fields, RocketChat.API.v1.limitedUserFieldsToExcludeIfIsPrivilegedUser);
    } else {
      fields = Object.assign(fields, RocketChat.API.v1.limitedUserFieldsToExclude);
    }
  }

  let query = {};

  if (this.queryParams.query) {
    try {
      query = JSON.parse(this.queryParams.query);
    } catch (e) {
      this.logger.warn(`Invalid query parameter provided "${this.queryParams.query}":`, e);
      throw new Meteor.Error('error-invalid-query', `Invalid query parameter provided: "${this.queryParams.query}"`, {
        helperMethod: 'parseJsonQuery'
      });
    }
  } // Verify the user has permission to query the fields they are


  if (typeof query === 'object') {
    let nonQueryableFields = Object.keys(RocketChat.API.v1.defaultFieldsToExclude);

    if (this.request.route.includes('/v1/users.')) {
      if (RocketChat.authz.hasPermission(this.userId, 'view-full-other-user-info')) {
        nonQueryableFields = nonQueryableFields.concat(Object.keys(RocketChat.API.v1.limitedUserFieldsToExcludeIfIsPrivilegedUser));
      } else {
        nonQueryableFields = nonQueryableFields.concat(Object.keys(RocketChat.API.v1.limitedUserFieldsToExclude));
      }
    }

    Object.keys(query).forEach(k => {
      if (nonQueryableFields.includes(k) || nonQueryableFields.includes(k.split(RocketChat.API.v1.fieldSeparator)[0])) {
        delete query[k];
      }
    });
  }

  return {
    sort,
    fields,
    query
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deprecationWarning.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/deprecationWarning.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

RocketChat.API.helperMethods.set('deprecationWarning', function _deprecationWarning({
  endpoint,
  versionWillBeRemove,
  response
}) {
  const warningMessage = `The endpoint "${endpoint}" is deprecated and will be removed after version ${versionWillBeRemove}`;
  console.warn(warningMessage);

  if (process.env.NODE_ENV === 'development') {
    return (0, _objectSpread2.default)({
      warning: warningMessage
    }, response);
  }

  return response;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getLoggedInUser.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/getLoggedInUser.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('getLoggedInUser', function _getLoggedInUser() {
  let user;

  if (this.request.headers['x-auth-token'] && this.request.headers['x-user-id']) {
    user = RocketChat.models.Users.findOne({
      _id: this.request.headers['x-user-id'],
      'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(this.request.headers['x-auth-token'])
    });
  }

  return user;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"insertUserObject.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/insertUserObject.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('insertUserObject', function _addUserToObject({
  object,
  userId
}) {
  const user = RocketChat.models.Users.findOneById(userId);
  object.user = {};

  if (user) {
    object.user = {
      _id: userId,
      username: user.username,
      name: user.name
    };
  }

  return object;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"default":{"info.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/default/info.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.default.addRoute('info', {
  authRequired: false
}, {
  get() {
    const user = this.getLoggedInUser();

    if (user && RocketChat.authz.hasRole(user._id, 'admin')) {
      return RocketChat.API.v1.success({
        info: RocketChat.Info
      });
    }

    return RocketChat.API.v1.success({
      version: RocketChat.Info.version
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"v1":{"channels.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/channels.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

// Returns the channel IF found otherwise it will return the failure of why it didn't. Check the `statusCode` property
function findChannelByIdOrName({
  params,
  checkedArchived = true
}) {
  if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
    throw new Meteor.Error('error-roomid-param-not-provided', 'The parameter "roomId" or "roomName" is required');
  }

  const fields = (0, _objectSpread2.default)({}, RocketChat.API.v1.defaultFieldsToExclude);
  let room;

  if (params.roomId) {
    room = RocketChat.models.Rooms.findOneById(params.roomId, {
      fields
    });
  } else if (params.roomName) {
    room = RocketChat.models.Rooms.findOneByName(params.roomName, {
      fields
    });
  }

  if (!room || room.t !== 'c') {
    throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any channel');
  }

  if (checkedArchived && room.archived) {
    throw new Meteor.Error('error-room-archived', `The channel, ${room.name}, is archived`);
  }

  return room;
}

RocketChat.API.v1.addRoute('channels.addAll', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addAllUserToRoom', findResult._id, this.bodyParams.activeUsersOnly);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.addModerator', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomModerator', findResult._id, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.addOwner', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomOwner', findResult._id, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.archive', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('archiveRoom', findResult._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.close', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    const sub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(findResult._id, this.userId);

    if (!sub) {
      return RocketChat.API.v1.failure(`The user/callee is not in the channel "${findResult.name}.`);
    }

    if (!sub.open) {
      return RocketChat.API.v1.failure(`The channel, ${findResult.name}, is already closed to the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('hideRoom', findResult._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.counters', {
  authRequired: true
}, {
  get() {
    const access = RocketChat.authz.hasPermission(this.userId, 'view-room-administration');
    const {
      userId
    } = this.requestParams();
    let user = this.userId;
    let unreads = null;
    let userMentions = null;
    let unreadsFrom = null;
    let joined = false;
    let msgs = null;
    let latest = null;
    let members = null;

    if (userId) {
      if (!access) {
        return RocketChat.API.v1.unauthorized();
      }

      user = userId;
    }

    const room = findChannelByIdOrName({
      params: this.requestParams(),
      returnUsernames: true
    });
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user);
    const lm = room.lm ? room.lm : room._updatedAt;

    if (typeof subscription !== 'undefined' && subscription.open) {
      unreads = RocketChat.models.Messages.countVisibleByRoomIdBetweenTimestampsInclusive(subscription.rid, subscription.ls, lm);
      unreadsFrom = subscription.ls || subscription.ts;
      userMentions = subscription.userMentions;
      joined = true;
    }

    if (access || joined) {
      msgs = room.msgs;
      latest = lm;
      members = room.usersCount;
    }

    return RocketChat.API.v1.success({
      joined,
      members,
      unreads,
      unreadsFrom,
      msgs,
      latest,
      userMentions
    });
  }

}); // Channel -> create

function createChannelValidator(params) {
  if (!RocketChat.authz.hasPermission(params.user.value, 'create-c')) {
    throw new Error('unauthorized');
  }

  if (!params.name || !params.name.value) {
    throw new Error(`Param "${params.name.key}" is required`);
  }

  if (params.members && params.members.value && !_.isArray(params.members.value)) {
    throw new Error(`Param "${params.members.key}" must be an array if provided`);
  }

  if (params.customFields && params.customFields.value && !(typeof params.customFields.value === 'object')) {
    throw new Error(`Param "${params.customFields.key}" must be an object if provided`);
  }
}

function createChannel(userId, params) {
  const readOnly = typeof params.readOnly !== 'undefined' ? params.readOnly : false;
  let id;
  Meteor.runAsUser(userId, () => {
    id = Meteor.call('createChannel', params.name, params.members ? params.members : [], readOnly, params.customFields);
  });
  return {
    channel: RocketChat.models.Rooms.findOneById(id.rid, {
      fields: RocketChat.API.v1.defaultFieldsToExclude
    })
  };
}

RocketChat.API.channels = {};
RocketChat.API.channels.create = {
  validate: createChannelValidator,
  execute: createChannel
};
RocketChat.API.v1.addRoute('channels.create', {
  authRequired: true
}, {
  post() {
    const {
      userId,
      bodyParams
    } = this;
    let error;

    try {
      RocketChat.API.channels.create.validate({
        user: {
          value: userId
        },
        name: {
          value: bodyParams.name,
          key: 'name'
        },
        members: {
          value: bodyParams.members,
          key: 'members'
        }
      });
    } catch (e) {
      if (e.message === 'unauthorized') {
        error = RocketChat.API.v1.unauthorized();
      } else {
        error = RocketChat.API.v1.failure(e.message);
      }
    }

    if (error) {
      return error;
    }

    return RocketChat.API.v1.success(RocketChat.API.channels.create.execute(userId, bodyParams));
  }

});
RocketChat.API.v1.addRoute('channels.delete', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('eraseRoom', findResult._id);
    });
    return RocketChat.API.v1.success({
      channel: findResult
    });
  }

});
RocketChat.API.v1.addRoute('channels.files', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });

    const addUserObjectToEveryObject = file => {
      if (file.userId) {
        file = this.insertUserObject({
          object: file,
          userId: file.userId
        });
      }

      return file;
    };

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('canAccessRoom', findResult._id, this.userId);
    });
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult._id
    });
    const files = RocketChat.models.Uploads.find(ourQuery, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      files: files.map(addUserObjectToEveryObject),
      count: files.length,
      offset,
      total: RocketChat.models.Uploads.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('channels.getIntegrations', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      return RocketChat.API.v1.unauthorized();
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    let includeAllPublicChannels = true;

    if (typeof this.queryParams.includeAllPublicChannels !== 'undefined') {
      includeAllPublicChannels = this.queryParams.includeAllPublicChannels === 'true';
    }

    let ourQuery = {
      channel: `#${findResult.name}`
    };

    if (includeAllPublicChannels) {
      ourQuery.channel = {
        $in: [ourQuery.channel, 'all_public_channels']
      };
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    ourQuery = Object.assign({}, query, ourQuery);
    const integrations = RocketChat.models.Integrations.find(ourQuery, {
      sort: sort ? sort : {
        _createdAt: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      integrations,
      count: integrations.length,
      offset,
      total: RocketChat.models.Integrations.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('channels.history', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    let latestDate = new Date();

    if (this.queryParams.latest) {
      latestDate = new Date(this.queryParams.latest);
    }

    let oldestDate = undefined;

    if (this.queryParams.oldest) {
      oldestDate = new Date(this.queryParams.oldest);
    }

    const inclusive = this.queryParams.inclusive || false;
    let count = 20;

    if (this.queryParams.count) {
      count = parseInt(this.queryParams.count);
    }

    const unreads = this.queryParams.unreads || false;
    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('getChannelHistory', {
        rid: findResult._id,
        latest: latestDate,
        oldest: oldestDate,
        inclusive,
        count,
        unreads
      });
    });

    if (!result) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('channels.info', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.invite', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addUserToRoom', {
        rid: findResult._id,
        username: user.username
      });
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.join', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('joinRoom', findResult._id, this.bodyParams.joinCode);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.kick', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeUserFromRoom', {
        rid: findResult._id,
        username: user.username
      });
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.leave', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('leaveRoom', findResult._id);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.list', {
  authRequired: true
}, {
  get: {
    // This is defined as such only to provide an example of how the routes can be defined :X
    action() {
      const {
        offset,
        count
      } = this.getPaginationItems();
      const {
        sort,
        fields,
        query
      } = this.parseJsonQuery();
      const hasPermissionToSeeAllPublicChannels = RocketChat.authz.hasPermission(this.userId, 'view-c-room');
      const ourQuery = (0, _objectSpread2.default)({}, query, {
        t: 'c'
      });

      if (!hasPermissionToSeeAllPublicChannels) {
        if (!RocketChat.authz.hasPermission(this.userId, 'view-joined-room')) {
          return RocketChat.API.v1.unauthorized();
        }

        const roomIds = RocketChat.models.Subscriptions.findByUserIdAndType(this.userId, 'c', {
          fields: {
            rid: 1
          }
        }).fetch().map(s => s.rid);
        ourQuery._id = {
          $in: roomIds
        };
      }

      const cursor = RocketChat.models.Rooms.find(ourQuery, {
        sort: sort ? sort : {
          name: 1
        },
        skip: offset,
        limit: count,
        fields
      });
      const total = cursor.count();
      const rooms = cursor.fetch();
      return RocketChat.API.v1.success({
        channels: rooms,
        count: rooms.length,
        offset,
        total
      });
    }

  }
});
RocketChat.API.v1.addRoute('channels.list.joined', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields
    } = this.parseJsonQuery(); // TODO: CACHE: Add Breacking notice since we removed the query param

    const cursor = RocketChat.models.Rooms.findBySubscriptionTypeAndUserId('c', this.userId, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    });
    const totalCount = cursor.count();
    const rooms = cursor.fetch();
    return RocketChat.API.v1.success({
      channels: rooms,
      offset,
      count: rooms.length,
      total: totalCount
    });
  }

});
RocketChat.API.v1.addRoute('channels.members', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });

    if (findResult.broadcast && !RocketChat.authz.hasPermission(this.userId, 'view-broadcast-member-list')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort = {}
    } = this.parseJsonQuery();
    const subscriptions = RocketChat.models.Subscriptions.findByRoomId(findResult._id, {
      fields: {
        'u._id': 1
      },
      sort: {
        'u.username': sort.username != null ? sort.username : 1
      },
      skip: offset,
      limit: count
    });
    const total = subscriptions.count();
    const members = subscriptions.fetch().map(s => s.u && s.u._id);
    const users = RocketChat.models.Users.find({
      _id: {
        $in: members
      }
    }, {
      fields: {
        _id: 1,
        username: 1,
        name: 1,
        status: 1,
        utcOffset: 1
      },
      sort: {
        username: sort.username != null ? sort.username : 1
      }
    }).fetch();
    return RocketChat.API.v1.success({
      members: users,
      count: users.length,
      offset,
      total
    });
  }

});
RocketChat.API.v1.addRoute('channels.messages', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult._id
    }); // Special check for the permissions

    if (RocketChat.authz.hasPermission(this.userId, 'view-joined-room') && !RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(findResult._id, this.userId, {
      fields: {
        _id: 1
      }
    })) {
      return RocketChat.API.v1.unauthorized();
    }

    if (!RocketChat.authz.hasPermission(this.userId, 'view-c-room')) {
      return RocketChat.API.v1.unauthorized();
    }

    const cursor = RocketChat.models.Messages.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    });
    const total = cursor.count();
    const messages = cursor.fetch();
    return RocketChat.API.v1.success({
      messages,
      count: messages.length,
      offset,
      total
    });
  }

}); // TODO: CACHE: I dont like this method( functionality and how we implemented ) its very expensive
// TODO check if this code is better or not
// RocketChat.API.v1.addRoute('channels.online', { authRequired: true }, {
// 	get() {
// 		const { query } = this.parseJsonQuery();
// 		const ourQuery = Object.assign({}, query, { t: 'c' });
// 		const room = RocketChat.models.Rooms.findOne(ourQuery);
// 		if (room == null) {
// 			return RocketChat.API.v1.failure('Channel does not exists');
// 		}
// 		const ids = RocketChat.models.Subscriptions.find({ rid: room._id }, { fields: { 'u._id': 1 } }).fetch().map(sub => sub.u._id);
// 		const online = RocketChat.models.Users.find({
// 			username: { $exists: 1 },
// 			_id: { $in: ids },
// 			status: { $in: ['online', 'away', 'busy'] }
// 		}, {
// 			fields: { username: 1 }
// 		}).fetch();
// 		return RocketChat.API.v1.success({
// 			online
// 		});
// 	}
// });

RocketChat.API.v1.addRoute('channels.online', {
  authRequired: true
}, {
  get() {
    const {
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      t: 'c'
    });
    const room = RocketChat.models.Rooms.findOne(ourQuery);

    if (room == null) {
      return RocketChat.API.v1.failure('Channel does not exists');
    }

    const online = RocketChat.models.Users.findUsersNotOffline({
      fields: {
        username: 1
      }
    }).fetch();
    const onlineInRoom = [];
    online.forEach(user => {
      const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(root._id, user._id, {
        fields: {
          _id: 1
        }
      });

      if (subscription) {
        onlineInRoom.push({
          _id: user._id,
          username: user.username
        });
      }
    });
    return RocketChat.API.v1.success({
      online: onlineInRoom
    });
  }

});
RocketChat.API.v1.addRoute('channels.open', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    const sub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(findResult._id, this.userId);

    if (!sub) {
      return RocketChat.API.v1.failure(`The user/callee is not in the channel "${findResult.name}".`);
    }

    if (sub.open) {
      return RocketChat.API.v1.failure(`The channel, ${findResult.name}, is already open to the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('openRoom', findResult._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.removeModerator', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomModerator', findResult._id, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.removeOwner', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomOwner', findResult._id, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.rename', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.name || !this.bodyParams.name.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "name" is required');
    }

    const findResult = findChannelByIdOrName({
      params: {
        roomId: this.bodyParams.roomId
      }
    });

    if (findResult.name === this.bodyParams.name) {
      return RocketChat.API.v1.failure('The channel name is the same as what it would be renamed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomName', this.bodyParams.name);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setCustomFields', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.customFields || !(typeof this.bodyParams.customFields === 'object')) {
      return RocketChat.API.v1.failure('The bodyParam "customFields" is required with a type like object.');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomCustomFields', this.bodyParams.customFields);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setDefault', {
  authRequired: true
}, {
  post() {
    if (typeof this.bodyParams.default === 'undefined') {
      return RocketChat.API.v1.failure('The bodyParam "default" is required', 'error-channels-setdefault-is-same');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.default === this.bodyParams.default) {
      return RocketChat.API.v1.failure('The channel default setting is the same as what it would be changed to.', 'error-channels-setdefault-missing-default-param');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'default', this.bodyParams.default.toString());
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setDescription', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.description || !this.bodyParams.description.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "description" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.description === this.bodyParams.description) {
      return RocketChat.API.v1.failure('The channel description is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomDescription', this.bodyParams.description);
    });
    return RocketChat.API.v1.success({
      description: this.bodyParams.description
    });
  }

});
RocketChat.API.v1.addRoute('channels.setJoinCode', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.joinCode || !this.bodyParams.joinCode.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "joinCode" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'joinCode', this.bodyParams.joinCode);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setPurpose', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.purpose || !this.bodyParams.purpose.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "purpose" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.description === this.bodyParams.purpose) {
      return RocketChat.API.v1.failure('The channel purpose (description) is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomDescription', this.bodyParams.purpose);
    });
    return RocketChat.API.v1.success({
      purpose: this.bodyParams.purpose
    });
  }

});
RocketChat.API.v1.addRoute('channels.setReadOnly', {
  authRequired: true
}, {
  post() {
    if (typeof this.bodyParams.readOnly === 'undefined') {
      return RocketChat.API.v1.failure('The bodyParam "readOnly" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.ro === this.bodyParams.readOnly) {
      return RocketChat.API.v1.failure('The channel read only setting is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'readOnly', this.bodyParams.readOnly);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setTopic', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.topic || !this.bodyParams.topic.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "topic" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.topic === this.bodyParams.topic) {
      return RocketChat.API.v1.failure('The channel topic is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomTopic', this.bodyParams.topic);
    });
    return RocketChat.API.v1.success({
      topic: this.bodyParams.topic
    });
  }

});
RocketChat.API.v1.addRoute('channels.setAnnouncement', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.announcement || !this.bodyParams.announcement.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "announcement" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomAnnouncement', this.bodyParams.announcement);
    });
    return RocketChat.API.v1.success({
      announcement: this.bodyParams.announcement
    });
  }

});
RocketChat.API.v1.addRoute('channels.setType', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.type || !this.bodyParams.type.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "type" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.t === this.bodyParams.type) {
      return RocketChat.API.v1.failure('The channel type is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomType', this.bodyParams.type);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.unarchive', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });

    if (!findResult.archived) {
      return RocketChat.API.v1.failure(`The channel, ${findResult.name}, is not archived`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('unarchiveRoom', findResult._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.getAllUserMentionsByChannel', {
  authRequired: true
}, {
  get() {
    const {
      roomId
    } = this.requestParams();
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort
    } = this.parseJsonQuery();

    if (!roomId) {
      return RocketChat.API.v1.failure('The request param "roomId" is required');
    }

    const mentions = Meteor.runAsUser(this.userId, () => Meteor.call('getUserMentionsByChannel', {
      roomId,
      options: {
        sort: sort ? sort : {
          ts: 1
        },
        skip: offset,
        limit: count
      }
    }));
    const allMentions = Meteor.runAsUser(this.userId, () => Meteor.call('getUserMentionsByChannel', {
      roomId,
      options: {}
    }));
    return RocketChat.API.v1.success({
      mentions,
      count: mentions.length,
      offset,
      total: allMentions.length
    });
  }

});
RocketChat.API.v1.addRoute('channels.roles', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const roles = Meteor.runAsUser(this.userId, () => Meteor.call('getRoomRoles', findResult._id));
    return RocketChat.API.v1.success({
      roles
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"roles.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/roles.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('roles.list', {
  authRequired: true
}, {
  get() {
    const roles = RocketChat.models.Roles.find({}, {
      fields: {
        _updatedAt: 0
      }
    }).fetch();
    return RocketChat.API.v1.success({
      roles
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"rooms.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/rooms.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 0);

function findRoomByIdOrName({
  params,
  checkedArchived = true
}) {
  if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
    throw new Meteor.Error('error-roomid-param-not-provided', 'The parameter "roomId" or "roomName" is required');
  }

  const fields = (0, _objectSpread2.default)({}, RocketChat.API.v1.defaultFieldsToExclude);
  let room;

  if (params.roomId) {
    room = RocketChat.models.Rooms.findOneById(params.roomId, {
      fields
    });
  } else if (params.roomName) {
    room = RocketChat.models.Rooms.findOneByName(params.roomName, {
      fields
    });
  }

  if (!room) {
    throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any channel');
  }

  if (checkedArchived && room.archived) {
    throw new Meteor.Error('error-room-archived', `The channel, ${room.name}, is archived`);
  }

  return room;
}

RocketChat.API.v1.addRoute('rooms.get', {
  authRequired: true
}, {
  get() {
    const {
      updatedSince
    } = this.queryParams;
    let updatedSinceDate;

    if (updatedSince) {
      if (isNaN(Date.parse(updatedSince))) {
        throw new Meteor.Error('error-updatedSince-param-invalid', 'The "updatedSince" query parameter must be a valid date.');
      } else {
        updatedSinceDate = new Date(updatedSince);
      }
    }

    let result;
    Meteor.runAsUser(this.userId, () => result = Meteor.call('rooms/get', updatedSinceDate));

    if (Array.isArray(result)) {
      result = {
        update: result,
        remove: []
      };
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('rooms.upload/:rid', {
  authRequired: true
}, {
  post() {
    const room = Meteor.call('canAccessRoom', this.urlParams.rid, this.userId);

    if (!room) {
      return RocketChat.API.v1.unauthorized();
    }

    const busboy = new Busboy({
      headers: this.request.headers
    });
    const files = [];
    const fields = {};
    Meteor.wrapAsync(callback => {
      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (fieldname !== 'file') {
          return files.push(new Meteor.Error('invalid-field'));
        }

        const fileDate = [];
        file.on('data', data => fileDate.push(data));
        file.on('end', () => {
          files.push({
            fieldname,
            file,
            filename,
            encoding,
            mimetype,
            fileBuffer: Buffer.concat(fileDate)
          });
        });
      });
      busboy.on('field', (fieldname, value) => fields[fieldname] = value);
      busboy.on('finish', Meteor.bindEnvironment(() => callback()));
      this.request.pipe(busboy);
    })();

    if (files.length === 0) {
      return RocketChat.API.v1.failure('File required');
    }

    if (files.length > 1) {
      return RocketChat.API.v1.failure('Just 1 file is allowed');
    }

    const file = files[0];
    const fileStore = FileUpload.getStore('Uploads');
    const details = {
      name: file.filename,
      size: file.fileBuffer.length,
      type: file.mimetype,
      rid: this.urlParams.rid,
      userId: this.userId
    };
    Meteor.runAsUser(this.userId, () => {
      const uploadedFile = Meteor.wrapAsync(fileStore.insert.bind(fileStore))(details, file.fileBuffer);
      uploadedFile.description = fields.description;
      delete fields.description;
      RocketChat.API.v1.success(Meteor.call('sendFileMessage', this.urlParams.rid, null, uploadedFile, fields));
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('rooms.saveNotification', {
  authRequired: true
}, {
  post() {
    const saveNotifications = (notifications, roomId) => {
      Object.keys(notifications).forEach(notificationKey => Meteor.runAsUser(this.userId, () => Meteor.call('saveNotificationSettings', roomId, notificationKey, notifications[notificationKey])));
    };

    const {
      roomId,
      notifications
    } = this.bodyParams;

    if (!roomId) {
      return RocketChat.API.v1.failure('The \'roomId\' param is required');
    }

    if (!notifications || Object.keys(notifications).length === 0) {
      return RocketChat.API.v1.failure('The \'notifications\' param is required');
    }

    saveNotifications(notifications, roomId);
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('rooms.favorite', {
  authRequired: true
}, {
  post() {
    const {
      favorite
    } = this.bodyParams;

    if (!this.bodyParams.hasOwnProperty('favorite')) {
      return RocketChat.API.v1.failure('The \'favorite\' param is required');
    }

    const room = findRoomByIdOrName({
      params: this.bodyParams
    });
    Meteor.runAsUser(this.userId, () => Meteor.call('toggleFavorite', room._id, favorite));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('rooms.cleanHistory', {
  authRequired: true
}, {
  post() {
    const findResult = findRoomByIdOrName({
      params: this.bodyParams
    });

    if (!this.bodyParams.latest) {
      return RocketChat.API.v1.failure('Body parameter "latest" is required.');
    }

    if (!this.bodyParams.oldest) {
      return RocketChat.API.v1.failure('Body parameter "oldest" is required.');
    }

    const latest = new Date(this.bodyParams.latest);
    const oldest = new Date(this.bodyParams.oldest);
    const inclusive = this.bodyParams.inclusive || false;
    Meteor.runAsUser(this.userId, () => Meteor.call('cleanRoomHistory', {
      roomId: findResult._id,
      latest,
      oldest,
      inclusive,
      limit: this.bodyParams.limit,
      excludePinned: this.bodyParams.excludePinned,
      filesOnly: this.bodyParams.filesOnly,
      fromUsers: this.bodyParams.users
    }));
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"subscriptions.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/subscriptions.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('subscriptions.get', {
  authRequired: true
}, {
  get() {
    const {
      updatedSince
    } = this.queryParams;
    let updatedSinceDate;

    if (updatedSince) {
      if (isNaN(Date.parse(updatedSince))) {
        throw new Meteor.Error('error-roomId-param-invalid', 'The "lastUpdate" query parameter must be a valid date.');
      } else {
        updatedSinceDate = new Date(updatedSince);
      }
    }

    let result;
    Meteor.runAsUser(this.userId, () => result = Meteor.call('subscriptions/get', updatedSinceDate));

    if (Array.isArray(result)) {
      result = {
        update: result,
        remove: []
      };
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('subscriptions.getOne', {
  authRequired: true
}, {
  get() {
    const {
      roomId
    } = this.requestParams();

    if (!roomId) {
      return RocketChat.API.v1.failure('The \'roomId\' param is required');
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(roomId, this.userId);
    return RocketChat.API.v1.success({
      subscription
    });
  }

});
/**
	This API is suppose to mark any room as read.

	Method: POST
	Route: api/v1/subscriptions.read
	Params:
		- rid: The rid of the room to be marked as read.
 */

RocketChat.API.v1.addRoute('subscriptions.read', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      rid: String
    });
    Meteor.runAsUser(this.userId, () => Meteor.call('readMessages', this.bodyParams.rid));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('subscriptions.unread', {
  authRequired: true
}, {
  post() {
    const {
      roomId,
      firstUnreadMessage
    } = this.bodyParams;

    if (!roomId && firstUnreadMessage && !firstUnreadMessage._id) {
      return RocketChat.API.v1.failure('At least one of "roomId" or "firstUnreadMessage._id" params is required');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('unreadMessages', firstUnreadMessage, roomId));
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"chat.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/chat.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* global processWebhookMessage */
RocketChat.API.v1.addRoute('chat.delete', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      msgId: String,
      roomId: String,
      asUser: Match.Maybe(Boolean)
    }));
    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.msgId, {
      fields: {
        u: 1,
        rid: 1
      }
    });

    if (!msg) {
      return RocketChat.API.v1.failure(`No message found with the id of "${this.bodyParams.msgId}".`);
    }

    if (this.bodyParams.roomId !== msg.rid) {
      return RocketChat.API.v1.failure('The room id provided does not match where the message is from.');
    }

    if (this.bodyParams.asUser && msg.u._id !== this.userId && !RocketChat.authz.hasPermission(Meteor.userId(), 'force-delete-message', msg.rid)) {
      return RocketChat.API.v1.failure('Unauthorized. You must have the permission "force-delete-message" to delete other\'s message as them.');
    }

    Meteor.runAsUser(this.bodyParams.asUser ? msg.u._id : this.userId, () => {
      Meteor.call('deleteMessage', {
        _id: msg._id
      });
    });
    return RocketChat.API.v1.success({
      _id: msg._id,
      ts: Date.now(),
      message: msg
    });
  }

});
RocketChat.API.v1.addRoute('chat.syncMessages', {
  authRequired: true
}, {
  get() {
    const {
      roomId,
      lastUpdate
    } = this.queryParams;

    if (!roomId) {
      throw new Meteor.Error('error-roomId-param-not-provided', 'The required "roomId" query param is missing.');
    }

    if (!lastUpdate) {
      throw new Meteor.Error('error-lastUpdate-param-not-provided', 'The required "lastUpdate" query param is missing.');
    } else if (isNaN(Date.parse(lastUpdate))) {
      throw new Meteor.Error('error-roomId-param-invalid', 'The "lastUpdate" query parameter must be a valid date.');
    }

    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('messages/get', roomId, {
        lastUpdate: new Date(lastUpdate)
      });
    });

    if (!result) {
      return RocketChat.API.v1.failure();
    }

    return RocketChat.API.v1.success({
      result
    });
  }

});
RocketChat.API.v1.addRoute('chat.getMessage', {
  authRequired: true
}, {
  get() {
    if (!this.queryParams.msgId) {
      return RocketChat.API.v1.failure('The "msgId" query parameter must be provided.');
    }

    let msg;
    Meteor.runAsUser(this.userId, () => {
      msg = Meteor.call('getSingleMessage', this.queryParams.msgId);
    });

    if (!msg) {
      return RocketChat.API.v1.failure();
    }

    return RocketChat.API.v1.success({
      message: msg
    });
  }

});
RocketChat.API.v1.addRoute('chat.pinMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is missing.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    let pinnedMessage;
    Meteor.runAsUser(this.userId, () => pinnedMessage = Meteor.call('pinMessage', msg));
    return RocketChat.API.v1.success({
      message: pinnedMessage
    });
  }

});
RocketChat.API.v1.addRoute('chat.postMessage', {
  authRequired: true
}, {
  post() {
    const messageReturn = processWebhookMessage(this.bodyParams, this.user, undefined, true)[0];

    if (!messageReturn) {
      return RocketChat.API.v1.failure('unknown-error');
    }

    return RocketChat.API.v1.success({
      ts: Date.now(),
      channel: messageReturn.channel,
      message: messageReturn.message
    });
  }

});
RocketChat.API.v1.addRoute('chat.search', {
  authRequired: true
}, {
  get() {
    const {
      roomId,
      searchText
    } = this.queryParams;
    const {
      count
    } = this.getPaginationItems();

    if (!roomId) {
      throw new Meteor.Error('error-roomId-param-not-provided', 'The required "roomId" query param is missing.');
    }

    if (!searchText) {
      throw new Meteor.Error('error-searchText-param-not-provided', 'The required "searchText" query param is missing.');
    }

    let result;
    Meteor.runAsUser(this.userId, () => result = Meteor.call('messageSearch', searchText, roomId, count).message.docs);
    return RocketChat.API.v1.success({
      messages: result
    });
  }

}); // The difference between `chat.postMessage` and `chat.sendMessage` is that `chat.sendMessage` allows
// for passing a value for `_id` and the other one doesn't. Also, `chat.sendMessage` only sends it to
// one channel whereas the other one allows for sending to more than one channel at a time.

RocketChat.API.v1.addRoute('chat.sendMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.message) {
      throw new Meteor.Error('error-invalid-params', 'The "message" parameter must be provided.');
    }

    let message;
    Meteor.runAsUser(this.userId, () => message = Meteor.call('sendMessage', this.bodyParams.message));
    return RocketChat.API.v1.success({
      message
    });
  }

});
RocketChat.API.v1.addRoute('chat.starMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is required.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('starMessage', {
      _id: msg._id,
      rid: msg.rid,
      starred: true
    }));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.unPinMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is required.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('unpinMessage', msg));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.unStarMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is required.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('starMessage', {
      _id: msg._id,
      rid: msg.rid,
      starred: false
    }));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.update', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      roomId: String,
      msgId: String,
      text: String // Using text to be consistant with chat.postMessage

    }));
    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.msgId); // Ensure the message exists

    if (!msg) {
      return RocketChat.API.v1.failure(`No message found with the id of "${this.bodyParams.msgId}".`);
    }

    if (this.bodyParams.roomId !== msg.rid) {
      return RocketChat.API.v1.failure('The room id provided does not match where the message is from.');
    } // Permission checks are already done in the updateMessage method, so no need to duplicate them


    Meteor.runAsUser(this.userId, () => {
      Meteor.call('updateMessage', {
        _id: msg._id,
        msg: this.bodyParams.text,
        rid: msg.rid
      });
    });
    return RocketChat.API.v1.success({
      message: RocketChat.models.Messages.findOneById(msg._id)
    });
  }

});
RocketChat.API.v1.addRoute('chat.react', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is missing.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    const emoji = this.bodyParams.emoji || this.bodyParams.reaction;

    if (!emoji) {
      throw new Meteor.Error('error-emoji-param-not-provided', 'The required "emoji" param is missing.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('setReaction', emoji, msg._id, this.bodyParams.shouldReact));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.getMessageReadReceipts', {
  authRequired: true
}, {
  get() {
    const {
      messageId
    } = this.queryParams;

    if (!messageId) {
      return RocketChat.API.v1.failure({
        error: 'The required \'messageId\' param is missing.'
      });
    }

    try {
      const messageReadReceipts = Meteor.runAsUser(this.userId, () => Meteor.call('getReadReceipts', {
        messageId
      }));
      return RocketChat.API.v1.success({
        receipts: messageReadReceipts
      });
    } catch (error) {
      return RocketChat.API.v1.failure({
        error: error.message
      });
    }
  }

});
RocketChat.API.v1.addRoute('chat.reportMessage', {
  authRequired: true
}, {
  post() {
    const {
      messageId,
      description
    } = this.bodyParams;

    if (!messageId) {
      return RocketChat.API.v1.failure('The required "messageId" param is missing.');
    }

    if (!description) {
      return RocketChat.API.v1.failure('The required "description" param is missing.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('reportMessage', messageId, description));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.ignoreUser', {
  authRequired: true
}, {
  get() {
    const {
      rid,
      userId
    } = this.queryParams;
    let {
      ignore = true
    } = this.queryParams;
    ignore = typeof ignore === 'string' ? /true|1/.test(ignore) : ignore;

    if (!rid || !rid.trim()) {
      throw new Meteor.Error('error-room-id-param-not-provided', 'The required "rid" param is missing.');
    }

    if (!userId || !userId.trim()) {
      throw new Meteor.Error('error-user-id-param-not-provided', 'The required "userId" param is missing.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('ignoreUser', {
      rid,
      userId,
      ignore
    }));
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"commands.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/commands.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('commands.get', {
  authRequired: true
}, {
  get() {
    const params = this.queryParams;

    if (typeof params.command !== 'string') {
      return RocketChat.API.v1.failure('The query param "command" must be provided.');
    }

    const cmd = RocketChat.slashCommands.commands[params.command.toLowerCase()];

    if (!cmd) {
      return RocketChat.API.v1.failure(`There is no command in the system by the name of: ${params.command}`);
    }

    return RocketChat.API.v1.success({
      command: cmd
    });
  }

});
RocketChat.API.v1.addRoute('commands.list', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    let commands = Object.values(RocketChat.slashCommands.commands);

    if (query && query.command) {
      commands = commands.filter(command => command.command === query.command);
    }

    const totalCount = commands.length;
    commands = RocketChat.models.Rooms.processQueryOptionsOnResult(commands, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    });
    return RocketChat.API.v1.success({
      commands,
      offset,
      count: commands.length,
      total: totalCount
    });
  }

}); // Expects a body of: { command: 'gimme', params: 'any string value', roomId: 'value' }

RocketChat.API.v1.addRoute('commands.run', {
  authRequired: true
}, {
  post() {
    const body = this.bodyParams;
    const user = this.getLoggedInUser();

    if (typeof body.command !== 'string') {
      return RocketChat.API.v1.failure('You must provide a command to run.');
    }

    if (body.params && typeof body.params !== 'string') {
      return RocketChat.API.v1.failure('The parameters for the command must be a single string.');
    }

    if (typeof body.roomId !== 'string') {
      return RocketChat.API.v1.failure('The room\'s id where to execute this command must be provided and be a string.');
    }

    const cmd = body.command.toLowerCase();

    if (!RocketChat.slashCommands.commands[body.command.toLowerCase()]) {
      return RocketChat.API.v1.failure('The command provided does not exist (or is disabled).');
    } // This will throw an error if they can't or the room is invalid


    Meteor.call('canAccessRoom', body.roomId, user._id);
    const params = body.params ? body.params : '';
    let result;
    Meteor.runAsUser(user._id, () => {
      result = RocketChat.slashCommands.run(cmd, params, {
        _id: Random.id(),
        rid: body.roomId,
        msg: `/${cmd} ${params}`
      });
    });
    return RocketChat.API.v1.success({
      result
    });
  }

});
RocketChat.API.v1.addRoute('commands.preview', {
  authRequired: true
}, {
  // Expects these query params: command: 'giphy', params: 'mine', roomId: 'value'
  get() {
    const query = this.queryParams;
    const user = this.getLoggedInUser();

    if (typeof query.command !== 'string') {
      return RocketChat.API.v1.failure('You must provide a command to get the previews from.');
    }

    if (query.params && typeof query.params !== 'string') {
      return RocketChat.API.v1.failure('The parameters for the command must be a single string.');
    }

    if (typeof query.roomId !== 'string') {
      return RocketChat.API.v1.failure('The room\'s id where the previews are being displayed must be provided and be a string.');
    }

    const cmd = query.command.toLowerCase();

    if (!RocketChat.slashCommands.commands[cmd]) {
      return RocketChat.API.v1.failure('The command provided does not exist (or is disabled).');
    } // This will throw an error if they can't or the room is invalid


    Meteor.call('canAccessRoom', query.roomId, user._id);
    const params = query.params ? query.params : '';
    let preview;
    Meteor.runAsUser(user._id, () => {
      preview = Meteor.call('getSlashCommandPreviews', {
        cmd,
        params,
        msg: {
          rid: query.roomId
        }
      });
    });
    return RocketChat.API.v1.success({
      preview
    });
  },

  // Expects a body format of: { command: 'giphy', params: 'mine', roomId: 'value', previewItem: { id: 'sadf8' type: 'image', value: 'https://dev.null/gif } }
  post() {
    const body = this.bodyParams;
    const user = this.getLoggedInUser();

    if (typeof body.command !== 'string') {
      return RocketChat.API.v1.failure('You must provide a command to run the preview item on.');
    }

    if (body.params && typeof body.params !== 'string') {
      return RocketChat.API.v1.failure('The parameters for the command must be a single string.');
    }

    if (typeof body.roomId !== 'string') {
      return RocketChat.API.v1.failure('The room\'s id where the preview is being executed in must be provided and be a string.');
    }

    if (typeof body.previewItem === 'undefined') {
      return RocketChat.API.v1.failure('The preview item being executed must be provided.');
    }

    if (!body.previewItem.id || !body.previewItem.type || typeof body.previewItem.value === 'undefined') {
      return RocketChat.API.v1.failure('The preview item being executed is in the wrong format.');
    }

    const cmd = body.command.toLowerCase();

    if (!RocketChat.slashCommands.commands[cmd]) {
      return RocketChat.API.v1.failure('The command provided does not exist (or is disabled).');
    } // This will throw an error if they can't or the room is invalid


    Meteor.call('canAccessRoom', body.roomId, user._id);
    const params = body.params ? body.params : '';
    Meteor.runAsUser(user._id, () => {
      Meteor.call('executeSlashCommandPreview', {
        cmd,
        params,
        msg: {
          rid: body.roomId
        }
      }, body.previewItem);
    });
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"emoji-custom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/emoji-custom.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('emoji-custom', {
  authRequired: true
}, {
  get() {
    const emojis = Meteor.call('listEmojiCustom');
    return RocketChat.API.v1.success({
      emojis
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"groups.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/groups.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

// Returns the private group subscription IF found otherwise it will return the failure of why it didn't. Check the `statusCode` property
function findPrivateGroupByIdOrName({
  params,
  userId,
  checkedArchived = true
}) {
  if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
    throw new Meteor.Error('error-room-param-not-provided', 'The parameter "roomId" or "roomName" is required');
  }

  let roomSub;

  if (params.roomId) {
    roomSub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(params.roomId, userId);
  } else if (params.roomName) {
    roomSub = RocketChat.models.Subscriptions.findOneByRoomNameAndUserId(params.roomName, userId);
  }

  if (!roomSub || roomSub.t !== 'p') {
    throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any group');
  }

  if (checkedArchived && roomSub.archived) {
    throw new Meteor.Error('error-room-archived', `The private group, ${roomSub.name}, is archived`);
  }

  return roomSub;
}

RocketChat.API.v1.addRoute('groups.addAll', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addAllUserToRoom', findResult.rid, this.bodyParams.activeUsersOnly);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.addModerator', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomModerator', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.addOwner', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomOwner', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.addLeader', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomLeader', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

}); // Archives a private group only if it wasn't

RocketChat.API.v1.addRoute('groups.archive', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('archiveRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.close', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });

    if (!findResult.open) {
      return RocketChat.API.v1.failure(`The private group, ${findResult.name}, is already closed to the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('hideRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.counters', {
  authRequired: true
}, {
  get() {
    const access = RocketChat.authz.hasPermission(this.userId, 'view-room-administration');
    const params = this.requestParams();
    let user = this.userId;
    let room;
    let unreads = null;
    let userMentions = null;
    let unreadsFrom = null;
    let joined = false;
    let msgs = null;
    let latest = null;
    let members = null;

    if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
      throw new Meteor.Error('error-room-param-not-provided', 'The parameter "roomId" or "roomName" is required');
    }

    if (params.roomId) {
      room = RocketChat.models.Rooms.findOneById(params.roomId);
    } else if (params.roomName) {
      room = RocketChat.models.Rooms.findOneByName(params.roomName);
    }

    if (!room || room.t !== 'p') {
      throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any group');
    }

    if (room.archived) {
      throw new Meteor.Error('error-room-archived', `The private group, ${room.name}, is archived`);
    }

    if (params.userId) {
      if (!access) {
        return RocketChat.API.v1.unauthorized();
      }

      user = params.userId;
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user);
    const lm = room.lm ? room.lm : room._updatedAt;

    if (typeof subscription !== 'undefined' && subscription.open) {
      if (subscription.ls) {
        unreads = RocketChat.models.Messages.countVisibleByRoomIdBetweenTimestampsInclusive(subscription.rid, subscription.ls, lm);
        unreadsFrom = subscription.ls;
      }

      userMentions = subscription.userMentions;
      joined = true;
    }

    if (access || joined) {
      msgs = room.msgs;
      latest = lm;
      members = room.usersCount;
    }

    return RocketChat.API.v1.success({
      joined,
      members,
      unreads,
      unreadsFrom,
      msgs,
      latest,
      userMentions
    });
  }

}); // Create Private Group

RocketChat.API.v1.addRoute('groups.create', {
  authRequired: true
}, {
  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'create-p')) {
      return RocketChat.API.v1.unauthorized();
    }

    if (!this.bodyParams.name) {
      return RocketChat.API.v1.failure('Body param "name" is required');
    }

    if (this.bodyParams.members && !_.isArray(this.bodyParams.members)) {
      return RocketChat.API.v1.failure('Body param "members" must be an array if provided');
    }

    if (this.bodyParams.customFields && !(typeof this.bodyParams.customFields === 'object')) {
      return RocketChat.API.v1.failure('Body param "customFields" must be an object if provided');
    }

    const readOnly = typeof this.bodyParams.readOnly !== 'undefined' ? this.bodyParams.readOnly : false;
    let id;
    Meteor.runAsUser(this.userId, () => {
      id = Meteor.call('createPrivateGroup', this.bodyParams.name, this.bodyParams.members ? this.bodyParams.members : [], readOnly, this.bodyParams.customFields);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(id.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.delete', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('eraseRoom', findResult.rid);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.files', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });

    const addUserObjectToEveryObject = file => {
      if (file.userId) {
        file = this.insertUserObject({
          object: file,
          userId: file.userId
        });
      }

      return file;
    };

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult.rid
    });
    const files = RocketChat.models.Uploads.find(ourQuery, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      files: files.map(addUserObjectToEveryObject),
      count: files.length,
      offset,
      total: RocketChat.models.Uploads.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('groups.getIntegrations', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      return RocketChat.API.v1.unauthorized();
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    let includeAllPrivateGroups = true;

    if (typeof this.queryParams.includeAllPrivateGroups !== 'undefined') {
      includeAllPrivateGroups = this.queryParams.includeAllPrivateGroups === 'true';
    }

    const channelsToSearch = [`#${findResult.name}`];

    if (includeAllPrivateGroups) {
      channelsToSearch.push('all_private_groups');
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      channel: {
        $in: channelsToSearch
      }
    });
    const integrations = RocketChat.models.Integrations.find(ourQuery, {
      sort: sort ? sort : {
        _createdAt: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      integrations,
      count: integrations.length,
      offset,
      total: RocketChat.models.Integrations.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('groups.history', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    let latestDate = new Date();

    if (this.queryParams.latest) {
      latestDate = new Date(this.queryParams.latest);
    }

    let oldestDate = undefined;

    if (this.queryParams.oldest) {
      oldestDate = new Date(this.queryParams.oldest);
    }

    const inclusive = this.queryParams.inclusive || false;
    let count = 20;

    if (this.queryParams.count) {
      count = parseInt(this.queryParams.count);
    }

    const unreads = this.queryParams.unreads || false;
    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('getChannelHistory', {
        rid: findResult.rid,
        latest: latestDate,
        oldest: oldestDate,
        inclusive,
        count,
        unreads
      });
    });

    if (!result) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('groups.info', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.invite', {
  authRequired: true
}, {
  post() {
    const {
      roomId = '',
      roomName = ''
    } = this.requestParams();
    const idOrName = roomId || roomName;

    if (!idOrName.trim()) {
      throw new Meteor.Error('error-room-param-not-provided', 'The parameter "roomId" or "roomName" is required');
    }

    const {
      _id: rid,
      t: type
    } = RocketChat.models.Rooms.findOneByIdOrName(idOrName) || {};

    if (!rid || type !== 'p') {
      throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any group');
    }

    const {
      username
    } = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => Meteor.call('addUserToRoom', {
      rid,
      username
    }));
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.kick', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeUserFromRoom', {
        rid: findResult.rid,
        username: user.username
      });
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.leave', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('leaveRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

}); // List Private Groups a user has access to

RocketChat.API.v1.addRoute('groups.list', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields
    } = this.parseJsonQuery(); // TODO: CACHE: Add Breacking notice since we removed the query param

    const cursor = RocketChat.models.Rooms.findBySubscriptionTypeAndUserId('p', this.userId, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    });
    const totalCount = cursor.count();
    const rooms = cursor.fetch();
    return RocketChat.API.v1.success({
      groups: rooms,
      offset,
      count: rooms.length,
      total: totalCount
    });
  }

});
RocketChat.API.v1.addRoute('groups.listAll', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-room-administration')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      t: 'p'
    });
    let rooms = RocketChat.models.Rooms.find(ourQuery).fetch();
    const totalCount = rooms.length;
    rooms = RocketChat.models.Rooms.processQueryOptionsOnResult(rooms, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    });
    return RocketChat.API.v1.success({
      groups: rooms,
      offset,
      count: rooms.length,
      total: totalCount
    });
  }

});
RocketChat.API.v1.addRoute('groups.members', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const room = RocketChat.models.Rooms.findOneById(findResult.rid, {
      fields: {
        broadcast: 1
      }
    });

    if (room.broadcast && !RocketChat.authz.hasPermission(this.userId, 'view-broadcast-member-list')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort = {}
    } = this.parseJsonQuery();
    const subscriptions = RocketChat.models.Subscriptions.findByRoomId(findResult.rid, {
      fields: {
        'u._id': 1
      },
      sort: {
        'u.username': sort.username != null ? sort.username : 1
      },
      skip: offset,
      limit: count
    });
    const total = subscriptions.count();
    const members = subscriptions.fetch().map(s => s.u && s.u._id);
    const users = RocketChat.models.Users.find({
      _id: {
        $in: members
      }
    }, {
      fields: {
        _id: 1,
        username: 1,
        name: 1,
        status: 1,
        utcOffset: 1
      },
      sort: {
        username: sort.username != null ? sort.username : 1
      }
    }).fetch();
    return RocketChat.API.v1.success({
      members: users,
      count: users.length,
      offset,
      total
    });
  }

});
RocketChat.API.v1.addRoute('groups.messages', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult.rid
    });
    const messages = RocketChat.models.Messages.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      messages,
      count: messages.length,
      offset,
      total: RocketChat.models.Messages.find(ourQuery).count()
    });
  }

}); // TODO: CACHE: same as channels.online

RocketChat.API.v1.addRoute('groups.online', {
  authRequired: true
}, {
  get() {
    const {
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      t: 'p'
    });
    const room = RocketChat.models.Rooms.findOne(ourQuery);

    if (room == null) {
      return RocketChat.API.v1.failure('Group does not exists');
    }

    const online = RocketChat.models.Users.findUsersNotOffline({
      fields: {
        username: 1
      }
    }).fetch();
    const onlineInRoom = [];
    online.forEach(user => {
      const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(root._id, user._id, {
        fields: {
          _id: 1
        }
      });

      if (subscription) {
        onlineInRoom.push({
          _id: user._id,
          username: user.username
        });
      }
    });
    return RocketChat.API.v1.success({
      online: onlineInRoom
    });
  }

});
RocketChat.API.v1.addRoute('groups.open', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });

    if (findResult.open) {
      return RocketChat.API.v1.failure(`The private group, ${findResult.name}, is already open for the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('openRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.removeModerator', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomModerator', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.removeOwner', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomOwner', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.removeLeader', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomLeader', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.rename', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.name || !this.bodyParams.name.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "name" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: {
        roomId: this.bodyParams.roomId
      },
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomName', this.bodyParams.name);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.setCustomFields', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.customFields || !(typeof this.bodyParams.customFields === 'object')) {
      return RocketChat.API.v1.failure('The bodyParam "customFields" is required with a type like object.');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomCustomFields', this.bodyParams.customFields);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.setDescription', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.description || !this.bodyParams.description.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "description" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomDescription', this.bodyParams.description);
    });
    return RocketChat.API.v1.success({
      description: this.bodyParams.description
    });
  }

});
RocketChat.API.v1.addRoute('groups.setPurpose', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.purpose || !this.bodyParams.purpose.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "purpose" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomDescription', this.bodyParams.purpose);
    });
    return RocketChat.API.v1.success({
      purpose: this.bodyParams.purpose
    });
  }

});
RocketChat.API.v1.addRoute('groups.setReadOnly', {
  authRequired: true
}, {
  post() {
    if (typeof this.bodyParams.readOnly === 'undefined') {
      return RocketChat.API.v1.failure('The bodyParam "readOnly" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });

    if (findResult.ro === this.bodyParams.readOnly) {
      return RocketChat.API.v1.failure('The private group read only setting is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'readOnly', this.bodyParams.readOnly);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.setTopic', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.topic || !this.bodyParams.topic.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "topic" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomTopic', this.bodyParams.topic);
    });
    return RocketChat.API.v1.success({
      topic: this.bodyParams.topic
    });
  }

});
RocketChat.API.v1.addRoute('groups.setType', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.type || !this.bodyParams.type.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "type" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });

    if (findResult.t === this.bodyParams.type) {
      return RocketChat.API.v1.failure('The private group type is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomType', this.bodyParams.type);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.unarchive', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('unarchiveRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.roles', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const roles = Meteor.runAsUser(this.userId, () => Meteor.call('getRoomRoles', findResult.rid));
    return RocketChat.API.v1.success({
      roles
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"im.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/im.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
function findDirectMessageRoom(params, user) {
  if ((!params.roomId || !params.roomId.trim()) && (!params.username || !params.username.trim())) {
    throw new Meteor.Error('error-room-param-not-provided', 'Body param "roomId" or "username" is required');
  }

  const room = RocketChat.getRoomByNameOrIdWithOptionToJoin({
    currentUserId: user._id,
    nameOrId: params.username || params.roomId,
    type: 'd'
  });

  if (!room || room.t !== 'd') {
    throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "username" param provided does not match any dirct message');
  }

  const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user._id);
  return {
    room,
    subscription
  };
}

RocketChat.API.v1.addRoute(['dm.create', 'im.create'], {
  authRequired: true
}, {
  post() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    return RocketChat.API.v1.success({
      room: findResult.room
    });
  }

});
RocketChat.API.v1.addRoute(['dm.close', 'im.close'], {
  authRequired: true
}, {
  post() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);

    if (!findResult.subscription.open) {
      return RocketChat.API.v1.failure(`The direct message room, ${this.bodyParams.name}, is already closed to the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('hideRoom', findResult.room._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute(['dm.counters', 'im.counters'], {
  authRequired: true
}, {
  get() {
    const access = RocketChat.authz.hasPermission(this.userId, 'view-room-administration');
    const ruserId = this.requestParams().userId;
    let user = this.userId;
    let unreads = null;
    let userMentions = null;
    let unreadsFrom = null;
    let joined = false;
    let msgs = null;
    let latest = null;
    let members = null;
    let lm = null;

    if (ruserId) {
      if (!access) {
        return RocketChat.API.v1.unauthorized();
      }

      user = ruserId;
    }

    const rs = findDirectMessageRoom(this.requestParams(), {
      _id: user
    });
    const {
      room
    } = rs;
    const dm = rs.subscription;
    lm = room.lm ? room.lm : room._updatedAt;

    if (typeof dm !== 'undefined' && dm.open) {
      if (dm.ls && room.msgs) {
        unreads = dm.unread;
        unreadsFrom = dm.ls;
      }

      userMentions = dm.userMentions;
      joined = true;
    }

    if (access || joined) {
      msgs = room.msgs;
      latest = lm;
      members = room.usersCount;
    }

    return RocketChat.API.v1.success({
      joined,
      members,
      unreads,
      unreadsFrom,
      msgs,
      latest,
      userMentions
    });
  }

});
RocketChat.API.v1.addRoute(['dm.files', 'im.files'], {
  authRequired: true
}, {
  get() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);

    const addUserObjectToEveryObject = file => {
      if (file.userId) {
        file = this.insertUserObject({
          object: file,
          userId: file.userId
        });
      }

      return file;
    };

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult.room._id
    });
    const files = RocketChat.models.Uploads.find(ourQuery, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      files: files.map(addUserObjectToEveryObject),
      count: files.length,
      offset,
      total: RocketChat.models.Uploads.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute(['dm.history', 'im.history'], {
  authRequired: true
}, {
  get() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    let latestDate = new Date();

    if (this.queryParams.latest) {
      latestDate = new Date(this.queryParams.latest);
    }

    let oldestDate = undefined;

    if (this.queryParams.oldest) {
      oldestDate = new Date(this.queryParams.oldest);
    }

    const inclusive = this.queryParams.inclusive || false;
    let count = 20;

    if (this.queryParams.count) {
      count = parseInt(this.queryParams.count);
    }

    const unreads = this.queryParams.unreads || false;
    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('getChannelHistory', {
        rid: findResult.room._id,
        latest: latestDate,
        oldest: oldestDate,
        inclusive,
        count,
        unreads
      });
    });

    if (!result) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute(['dm.members', 'im.members'], {
  authRequired: true
}, {
  get() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort
    } = this.parseJsonQuery();
    const cursor = RocketChat.models.Subscriptions.findByRoomId(findResult.room._id, {
      sort: {
        'u.username': sort && sort.username ? sort.username : 1
      },
      skip: offset,
      limit: count
    });
    const total = cursor.count();
    const members = cursor.fetch().map(s => s.u && s.u.username);
    const users = RocketChat.models.Users.find({
      username: {
        $in: members
      }
    }, {
      fields: {
        _id: 1,
        username: 1,
        name: 1,
        status: 1,
        utcOffset: 1
      },
      sort: {
        username: sort && sort.username ? sort.username : 1
      }
    }).fetch();
    return RocketChat.API.v1.success({
      members: users,
      count: members.length,
      offset,
      total
    });
  }

});
RocketChat.API.v1.addRoute(['dm.messages', 'im.messages'], {
  authRequired: true
}, {
  get() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    console.log(findResult);
    const ourQuery = Object.assign({}, query, {
      rid: findResult.room._id
    });
    const messages = RocketChat.models.Messages.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      messages,
      count: messages.length,
      offset,
      total: RocketChat.models.Messages.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute(['dm.messages.others', 'im.messages.others'], {
  authRequired: true
}, {
  get() {
    if (RocketChat.settings.get('API_Enable_Direct_Message_History_EndPoint') !== true) {
      throw new Meteor.Error('error-endpoint-disabled', 'This endpoint is disabled', {
        route: '/api/v1/im.messages.others'
      });
    }

    if (!RocketChat.authz.hasPermission(this.userId, 'view-room-administration')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      roomId
    } = this.queryParams;

    if (!roomId || !roomId.trim()) {
      throw new Meteor.Error('error-roomid-param-not-provided', 'The parameter "roomId" is required');
    }

    const room = RocketChat.models.Rooms.findOneById(roomId);

    if (!room || room.t !== 'd') {
      throw new Meteor.Error('error-room-not-found', `No direct message room found by the id of: ${roomId}`);
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: room._id
    });
    const msgs = RocketChat.models.Messages.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      messages: msgs,
      offset,
      count: msgs.length,
      total: RocketChat.models.Messages.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute(['dm.list', 'im.list'], {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort = {
        name: 1
      },
      fields
    } = this.parseJsonQuery(); // TODO: CACHE: Add Breacking notice since we removed the query param

    const cursor = RocketChat.models.Rooms.findBySubscriptionTypeAndUserId('d', this.userId, {
      sort,
      skip: offset,
      limit: count,
      fields
    });
    const total = cursor.count();
    const rooms = cursor.fetch();
    return RocketChat.API.v1.success({
      ims: rooms,
      offset,
      count: rooms.length,
      total
    });
  }

});
RocketChat.API.v1.addRoute(['dm.list.everyone', 'im.list.everyone'], {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-room-administration')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      t: 'd'
    });
    const rooms = RocketChat.models.Rooms.find(ourQuery, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      ims: rooms,
      offset,
      count: rooms.length,
      total: RocketChat.models.Rooms.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute(['dm.open', 'im.open'], {
  authRequired: true
}, {
  post() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);

    if (!findResult.subscription.open) {
      Meteor.runAsUser(this.userId, () => {
        Meteor.call('openRoom', findResult.room._id);
      });
    }

    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute(['dm.setTopic', 'im.setTopic'], {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.topic || !this.bodyParams.topic.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "topic" is required');
    }

    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.room._id, 'roomTopic', this.bodyParams.topic);
    });
    return RocketChat.API.v1.success({
      topic: this.bodyParams.topic
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"integrations.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/integrations.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('integrations.create', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      type: String,
      name: String,
      enabled: Boolean,
      username: String,
      urls: Match.Maybe([String]),
      channel: String,
      event: Match.Maybe(String),
      triggerWords: Match.Maybe([String]),
      alias: Match.Maybe(String),
      avatar: Match.Maybe(String),
      emoji: Match.Maybe(String),
      token: Match.Maybe(String),
      scriptEnabled: Boolean,
      script: Match.Maybe(String),
      targetChannel: Match.Maybe(String)
    }));
    let integration;

    switch (this.bodyParams.type) {
      case 'webhook-outgoing':
        Meteor.runAsUser(this.userId, () => {
          integration = Meteor.call('addOutgoingIntegration', this.bodyParams);
        });
        break;

      case 'webhook-incoming':
        Meteor.runAsUser(this.userId, () => {
          integration = Meteor.call('addIncomingIntegration', this.bodyParams);
        });
        break;

      default:
        return RocketChat.API.v1.failure('Invalid integration type.');
    }

    return RocketChat.API.v1.success({
      integration
    });
  }

});
RocketChat.API.v1.addRoute('integrations.history', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      return RocketChat.API.v1.unauthorized();
    }

    if (!this.queryParams.id || this.queryParams.id.trim() === '') {
      return RocketChat.API.v1.failure('Invalid integration id.');
    }

    const {
      id
    } = this.queryParams;
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      'integration._id': id
    });
    const history = RocketChat.models.IntegrationHistory.find(ourQuery, {
      sort: sort ? sort : {
        _updatedAt: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      history,
      offset,
      items: history.length,
      total: RocketChat.models.IntegrationHistory.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('integrations.list', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query);
    const integrations = RocketChat.models.Integrations.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      integrations,
      offset,
      items: integrations.length,
      total: RocketChat.models.Integrations.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('integrations.remove', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      type: String,
      target_url: Match.Maybe(String),
      integrationId: Match.Maybe(String)
    }));

    if (!this.bodyParams.target_url && !this.bodyParams.integrationId) {
      return RocketChat.API.v1.failure('An integrationId or target_url needs to be provided.');
    }

    let integration;

    switch (this.bodyParams.type) {
      case 'webhook-outgoing':
        if (this.bodyParams.target_url) {
          integration = RocketChat.models.Integrations.findOne({
            urls: this.bodyParams.target_url
          });
        } else if (this.bodyParams.integrationId) {
          integration = RocketChat.models.Integrations.findOne({
            _id: this.bodyParams.integrationId
          });
        }

        if (!integration) {
          return RocketChat.API.v1.failure('No integration found.');
        }

        Meteor.runAsUser(this.userId, () => {
          Meteor.call('deleteOutgoingIntegration', integration._id);
        });
        return RocketChat.API.v1.success({
          integration
        });

      case 'webhook-incoming':
        integration = RocketChat.models.Integrations.findOne({
          _id: this.bodyParams.integrationId
        });

        if (!integration) {
          return RocketChat.API.v1.failure('No integration found.');
        }

        Meteor.runAsUser(this.userId, () => {
          Meteor.call('deleteIncomingIntegration', integration._id);
        });
        return RocketChat.API.v1.success({
          integration
        });

      default:
        return RocketChat.API.v1.failure('Invalid integration type.');
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"misc.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/misc.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('info', {
  authRequired: false
}, {
  get() {
    const user = this.getLoggedInUser();

    if (user && RocketChat.authz.hasRole(user._id, 'admin')) {
      return RocketChat.API.v1.success({
        info: RocketChat.Info
      });
    }

    return RocketChat.API.v1.success({
      info: {
        version: RocketChat.Info.version
      }
    });
  }

});
RocketChat.API.v1.addRoute('me', {
  authRequired: true
}, {
  get() {
    return RocketChat.API.v1.success(this.getUserInfo(RocketChat.models.Users.findOneById(this.userId)));
  }

});
let onlineCache = 0;
let onlineCacheDate = 0;
const cacheInvalid = 60000; // 1 minute

RocketChat.API.v1.addRoute('shield.svg', {
  authRequired: false
}, {
  get() {
    const {
      type,
      channel,
      name,
      icon
    } = this.queryParams;

    if (!RocketChat.settings.get('API_Enable_Shields')) {
      throw new Meteor.Error('error-endpoint-disabled', 'This endpoint is disabled', {
        route: '/api/v1/shield.svg'
      });
    }

    const types = RocketChat.settings.get('API_Shield_Types');

    if (type && types !== '*' && !types.split(',').map(t => t.trim()).includes(type)) {
      throw new Meteor.Error('error-shield-disabled', 'This shield type is disabled', {
        route: '/api/v1/shield.svg'
      });
    }

    const hideIcon = icon === 'false';

    if (hideIcon && (!name || !name.trim())) {
      return RocketChat.API.v1.failure('Name cannot be empty when icon is hidden');
    }

    let text;
    let backgroundColor = '#4c1';

    switch (type) {
      case 'online':
        if (Date.now() - onlineCacheDate > cacheInvalid) {
          onlineCache = RocketChat.models.Users.findUsersNotOffline().count();
          onlineCacheDate = Date.now();
        }

        text = `${onlineCache} ${TAPi18n.__('Online')}`;
        break;

      case 'channel':
        if (!channel) {
          return RocketChat.API.v1.failure('Shield channel is required for type "channel"');
        }

        text = `#${channel}`;
        break;

      case 'user':
        const user = this.getUserFromParams(); // Respect the server's choice for using their real names or not

        if (user.name && RocketChat.settings.get('UI_Use_Real_Name')) {
          text = `${user.name}`;
        } else {
          text = `@${user.username}`;
        }

        switch (user.status) {
          case 'online':
            backgroundColor = '#1fb31f';
            break;

          case 'away':
            backgroundColor = '#dc9b01';
            break;

          case 'busy':
            backgroundColor = '#bc2031';
            break;

          case 'offline':
            backgroundColor = '#a5a1a1';
        }

        break;

      default:
        text = TAPi18n.__('Join_Chat').toUpperCase();
    }

    const iconSize = hideIcon ? 7 : 24;
    const leftSize = name ? name.length * 6 + 7 + iconSize : iconSize;
    const rightSize = text.length * 6 + 20;
    const width = leftSize + rightSize;
    const height = 20;
    return {
      headers: {
        'Content-Type': 'image/svg+xml;charset=utf-8'
      },
      body: `
				<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">
				  <linearGradient id="b" x2="0" y2="100%">
				    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
				    <stop offset="1" stop-opacity=".1"/>
				  </linearGradient>
				  <mask id="a">
				    <rect width="${width}" height="${height}" rx="3" fill="#fff"/>
				  </mask>
				  <g mask="url(#a)">
				    <path fill="#555" d="M0 0h${leftSize}v${height}H0z"/>
				    <path fill="${backgroundColor}" d="M${leftSize} 0h${rightSize}v${height}H${leftSize}z"/>
				    <path fill="url(#b)" d="M0 0h${width}v${height}H0z"/>
				  </g>
				    ${hideIcon ? '' : '<image x="5" y="3" width="14" height="14" xlink:href="/assets/favicon.svg"/>'}
				  <g fill="#fff" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
						${name ? `<text x="${iconSize}" y="15" fill="#010101" fill-opacity=".3">${name}</text>
				    <text x="${iconSize}" y="14">${name}</text>` : ''}
				    <text x="${leftSize + 7}" y="15" fill="#010101" fill-opacity=".3">${text}</text>
				    <text x="${leftSize + 7}" y="14">${text}</text>
				  </g>
				</svg>
			`.trim().replace(/\>[\s]+\</gm, '><')
    };
  }

});
RocketChat.API.v1.addRoute('spotlight', {
  authRequired: true
}, {
  get() {
    check(this.queryParams, {
      query: String
    });
    const {
      query
    } = this.queryParams;
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('spotlight', query));
    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('directory', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      query
    } = this.parseJsonQuery();
    const {
      text,
      type
    } = query;

    if (sort && Object.keys(sort).length > 1) {
      return RocketChat.API.v1.failure('This method support only one "sort" parameter');
    }

    const sortBy = sort ? Object.keys(sort)[0] : undefined;
    const sortDirection = sort && Object.values(sort)[0] === 1 ? 'asc' : 'desc';
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('browseChannels', {
      text,
      type,
      sortBy,
      sortDirection,
      offset: Math.max(0, offset),
      limit: Math.max(0, count)
    }));

    if (!result) {
      return RocketChat.API.v1.failure('Please verify the parameters');
    }

    return RocketChat.API.v1.success({
      result: result.results,
      count: result.results.length,
      offset,
      total: result.total
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"permissions.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/permissions.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
	This API returns all permissions that exists
	on the server, with respective roles.

	Method: GET
	Route: api/v1/permissions
 */
RocketChat.API.v1.addRoute('permissions', {
  authRequired: true
}, {
  get() {
    const warningMessage = 'The endpoint "permissions" is deprecated and will be removed after version v0.69';
    console.warn(warningMessage);
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('permissions/get'));
    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('permissions.list', {
  authRequired: true
}, {
  get() {
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('permissions/get'));
    return RocketChat.API.v1.success({
      permissions: result
    });
  }

});
RocketChat.API.v1.addRoute('permissions.update', {
  authRequired: true
}, {
  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'access-permissions')) {
      return RocketChat.API.v1.failure('Editing permissions is not allowed', 'error-edit-permissions-not-allowed');
    }

    check(this.bodyParams, {
      permissions: [Match.ObjectIncluding({
        _id: String,
        roles: [String]
      })]
    });
    let permissionNotFound = false;
    let roleNotFound = false;
    Object.keys(this.bodyParams.permissions).forEach(key => {
      const element = this.bodyParams.permissions[key];

      if (!RocketChat.models.Permissions.findOneById(element._id)) {
        permissionNotFound = true;
      }

      Object.keys(element.roles).forEach(key => {
        const subelement = element.roles[key];

        if (!RocketChat.models.Roles.findOneById(subelement)) {
          roleNotFound = true;
        }
      });
    });

    if (permissionNotFound) {
      return RocketChat.API.v1.failure('Invalid permission', 'error-invalid-permission');
    } else if (roleNotFound) {
      return RocketChat.API.v1.failure('Invalid role', 'error-invalid-role');
    }

    Object.keys(this.bodyParams.permissions).forEach(key => {
      const element = this.bodyParams.permissions[key];
      RocketChat.models.Permissions.createOrUpdate(element._id, element.roles);
    });
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('permissions/get'));
    return RocketChat.API.v1.success({
      permissions: result
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"push.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/push.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals Push */
RocketChat.API.v1.addRoute('push.token', {
  authRequired: true
}, {
  post() {
    const {
      type,
      value,
      appName
    } = this.bodyParams;
    let {
      id
    } = this.bodyParams;

    if (id && typeof id !== 'string') {
      throw new Meteor.Error('error-id-param-not-valid', 'The required "id" body param is invalid.');
    } else {
      id = Random.id();
    }

    if (!type || type !== 'apn' && type !== 'gcm') {
      throw new Meteor.Error('error-type-param-not-valid', 'The required "type" body param is missing or invalid.');
    }

    if (!value || typeof value !== 'string') {
      throw new Meteor.Error('error-token-param-not-valid', 'The required "value" body param is missing or invalid.');
    }

    if (!appName || typeof appName !== 'string') {
      throw new Meteor.Error('error-appName-param-not-valid', 'The required "appName" body param is missing or invalid.');
    }

    let result;
    Meteor.runAsUser(this.userId, () => result = Meteor.call('raix:push-update', {
      id,
      token: {
        [type]: value
      },
      appName,
      userId: this.userId
    }));
    return RocketChat.API.v1.success({
      result
    });
  },

  delete() {
    const {
      token
    } = this.bodyParams;

    if (!token || typeof token !== 'string') {
      throw new Meteor.Error('error-token-param-not-valid', 'The required "token" body param is missing or invalid.');
    }

    const affectedRecords = Push.appCollection.remove({
      $or: [{
        'token.apn': token
      }, {
        'token.gcm': token
      }],
      userId: this.userId
    });

    if (affectedRecords === 0) {
      return RocketChat.API.v1.notFound();
    }

    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/settings.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
// settings endpoints
RocketChat.API.v1.addRoute('settings.public', {
  authRequired: false
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    let ourQuery = {
      hidden: {
        $ne: true
      },
      public: true
    };
    ourQuery = Object.assign({}, query, ourQuery);
    const settings = RocketChat.models.Settings.find(ourQuery, {
      sort: sort ? sort : {
        _id: 1
      },
      skip: offset,
      limit: count,
      fields: Object.assign({
        _id: 1,
        value: 1
      }, fields)
    }).fetch();
    return RocketChat.API.v1.success({
      settings,
      count: settings.length,
      offset,
      total: RocketChat.models.Settings.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('settings.oauth', {
  authRequired: false
}, {
  get() {
    const mountOAuthServices = () => {
      const oAuthServicesEnabled = ServiceConfiguration.configurations.find({}, {
        fields: {
          secret: 0
        }
      }).fetch();
      return oAuthServicesEnabled.map(service => {
        if (service.custom || ['saml', 'cas', 'wordpress'].includes(service.service)) {
          return (0, _objectSpread2.default)({}, service);
        }

        return {
          _id: service._id,
          name: service.service,
          clientId: service.appId || service.clientId || service.consumerKey,
          buttonLabelText: service.buttonLabelText || '',
          buttonColor: service.buttonColor || '',
          buttonLabelColor: service.buttonLabelColor || '',
          custom: false
        };
      });
    };

    return RocketChat.API.v1.success({
      services: mountOAuthServices()
    });
  }

});
RocketChat.API.v1.addRoute('settings', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    let ourQuery = {
      hidden: {
        $ne: true
      }
    };

    if (!RocketChat.authz.hasPermission(this.userId, 'view-privileged-setting')) {
      ourQuery.public = true;
    }

    ourQuery = Object.assign({}, query, ourQuery);
    const settings = RocketChat.models.Settings.find(ourQuery, {
      sort: sort ? sort : {
        _id: 1
      },
      skip: offset,
      limit: count,
      fields: Object.assign({
        _id: 1,
        value: 1
      }, fields)
    }).fetch();
    return RocketChat.API.v1.success({
      settings,
      count: settings.length,
      offset,
      total: RocketChat.models.Settings.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('settings/:_id', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-privileged-setting')) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success(_.pick(RocketChat.models.Settings.findOneNotHiddenById(this.urlParams._id), '_id', 'value'));
  },

  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'edit-privileged-setting')) {
      return RocketChat.API.v1.unauthorized();
    } // allow special handling of particular setting types


    const setting = RocketChat.models.Settings.findOneNotHiddenById(this.urlParams._id);

    if (setting.type === 'action' && this.bodyParams && this.bodyParams.execute) {
      // execute the configured method
      Meteor.call(setting.value);
      return RocketChat.API.v1.success();
    }

    if (setting.type === 'color' && this.bodyParams && this.bodyParams.editor && this.bodyParams.value) {
      RocketChat.models.Settings.updateOptionsById(this.urlParams._id, {
        editor: this.bodyParams.editor
      });
      RocketChat.models.Settings.updateValueNotHiddenById(this.urlParams._id, this.bodyParams.value);
      return RocketChat.API.v1.success();
    }

    check(this.bodyParams, {
      value: Match.Any
    });

    if (RocketChat.models.Settings.updateValueNotHiddenById(this.urlParams._id, this.bodyParams.value)) {
      return RocketChat.API.v1.success();
    }

    return RocketChat.API.v1.failure();
  }

});
RocketChat.API.v1.addRoute('service.configurations', {
  authRequired: false
}, {
  get() {
    const {
      ServiceConfiguration
    } = Package['service-configuration'];
    return RocketChat.API.v1.success({
      configurations: ServiceConfiguration.configurations.find({}, {
        fields: {
          secret: 0
        }
      }).fetch()
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"stats.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/stats.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('statistics', {
  authRequired: true
}, {
  get() {
    let refresh = false;

    if (typeof this.queryParams.refresh !== 'undefined' && this.queryParams.refresh === 'true') {
      refresh = true;
    }

    let stats;
    Meteor.runAsUser(this.userId, () => {
      stats = Meteor.call('getStatistics', refresh);
    });
    return RocketChat.API.v1.success({
      statistics: stats
    });
  }

});
RocketChat.API.v1.addRoute('statistics.list', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-statistics')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const statistics = RocketChat.models.Statistics.find(query, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      statistics,
      count: statistics.length,
      offset,
      total: RocketChat.models.Statistics.find(query).count()
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"users.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/users.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 1);
RocketChat.API.v1.addRoute('users.create', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      email: String,
      name: String,
      password: String,
      username: String,
      active: Match.Maybe(Boolean),
      roles: Match.Maybe(Array),
      joinDefaultChannels: Match.Maybe(Boolean),
      requirePasswordChange: Match.Maybe(Boolean),
      sendWelcomeEmail: Match.Maybe(Boolean),
      verified: Match.Maybe(Boolean),
      customFields: Match.Maybe(Object)
    }); // New change made by pull request #5152

    if (typeof this.bodyParams.joinDefaultChannels === 'undefined') {
      this.bodyParams.joinDefaultChannels = true;
    }

    if (this.bodyParams.customFields) {
      RocketChat.validateCustomFields(this.bodyParams.customFields);
    }

    const newUserId = RocketChat.saveUser(this.userId, this.bodyParams);

    if (this.bodyParams.customFields) {
      RocketChat.saveCustomFieldsWithoutValidation(newUserId, this.bodyParams.customFields);
    }

    if (typeof this.bodyParams.active !== 'undefined') {
      Meteor.runAsUser(this.userId, () => {
        Meteor.call('setUserActiveStatus', newUserId, this.bodyParams.active);
      });
    }

    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(newUserId, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.delete', {
  authRequired: true
}, {
  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'delete-user')) {
      return RocketChat.API.v1.unauthorized();
    }

    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('deleteUser', user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('users.deleteOwnAccount', {
  authRequired: true
}, {
  post() {
    const {
      password
    } = this.bodyParams;

    if (!password) {
      return RocketChat.API.v1.failure('Body parameter "password" is required.');
    }

    if (!RocketChat.settings.get('Accounts_AllowDeleteOwnAccount')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('deleteUserOwnAccount', password);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('users.getAvatar', {
  authRequired: false
}, {
  get() {
    const user = this.getUserFromParams();
    const url = RocketChat.getURL(`/avatar/${user.username}`, {
      cdn: false,
      full: true
    });
    this.response.setHeader('Location', url);
    return {
      statusCode: 307,
      body: url
    };
  }

});
RocketChat.API.v1.addRoute('users.getPresence', {
  authRequired: true
}, {
  get() {
    if (this.isUserFromParams()) {
      const user = RocketChat.models.Users.findOneById(this.userId);
      return RocketChat.API.v1.success({
        presence: user.status,
        connectionStatus: user.statusConnection,
        lastLogin: user.lastLogin
      });
    }

    const user = this.getUserFromParams();
    return RocketChat.API.v1.success({
      presence: user.status
    });
  }

});
RocketChat.API.v1.addRoute('users.info', {
  authRequired: true
}, {
  get() {
    const {
      username
    } = this.getUserFromParams();
    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('getFullUserData', {
        username,
        limit: 1
      });
    });

    if (!result || result.length !== 1) {
      return RocketChat.API.v1.failure(`Failed to get the user data for the userId of "${username}".`);
    }

    return RocketChat.API.v1.success({
      user: result[0]
    });
  }

});
RocketChat.API.v1.addRoute('users.list', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-d-room')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const users = RocketChat.models.Users.find(query, {
      sort: sort ? sort : {
        username: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      users,
      count: users.length,
      offset,
      total: RocketChat.models.Users.find(query).count()
    });
  }

});
RocketChat.API.v1.addRoute('users.register', {
  authRequired: false
}, {
  post() {
    if (this.userId) {
      return RocketChat.API.v1.failure('Logged in users can not register again.');
    } // We set their username here, so require it
    // The `registerUser` checks for the other requirements


    check(this.bodyParams, Match.ObjectIncluding({
      username: String
    })); // Register the user

    const userId = Meteor.call('registerUser', this.bodyParams); // Now set their username

    Meteor.runAsUser(userId, () => Meteor.call('setUsername', this.bodyParams.username));
    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(userId, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.resetAvatar', {
  authRequired: true
}, {
  post() {
    const user = this.getUserFromParams();

    if (user._id === this.userId) {
      Meteor.runAsUser(this.userId, () => Meteor.call('resetAvatar'));
    } else if (RocketChat.authz.hasPermission(this.userId, 'edit-other-user-info')) {
      Meteor.runAsUser(user._id, () => Meteor.call('resetAvatar'));
    } else {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('users.setAvatar', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      avatarUrl: Match.Maybe(String),
      userId: Match.Maybe(String),
      username: Match.Maybe(String)
    }));

    if (!RocketChat.settings.get('Accounts_AllowUserAvatarChange')) {
      throw new Meteor.Error('error-not-allowed', 'Change avatar is not allowed', {
        method: 'users.setAvatar'
      });
    }

    let user;

    if (this.isUserFromParams()) {
      user = Meteor.users.findOne(this.userId);
    } else if (RocketChat.authz.hasPermission(this.userId, 'edit-other-user-info')) {
      user = this.getUserFromParams();
    } else {
      return RocketChat.API.v1.unauthorized();
    }

    Meteor.runAsUser(user._id, () => {
      if (this.bodyParams.avatarUrl) {
        RocketChat.setUserAvatar(user, this.bodyParams.avatarUrl, '', 'url');
      } else {
        const busboy = new Busboy({
          headers: this.request.headers
        });
        Meteor.wrapAsync(callback => {
          busboy.on('file', Meteor.bindEnvironment((fieldname, file, filename, encoding, mimetype) => {
            if (fieldname !== 'image') {
              return callback(new Meteor.Error('invalid-field'));
            }

            const imageData = [];
            file.on('data', Meteor.bindEnvironment(data => {
              imageData.push(data);
            }));
            file.on('end', Meteor.bindEnvironment(() => {
              RocketChat.setUserAvatar(user, Buffer.concat(imageData), mimetype, 'rest');
              callback();
            }));
          }));
          this.request.pipe(busboy);
        })();
      }
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('users.update', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      userId: String,
      data: Match.ObjectIncluding({
        email: Match.Maybe(String),
        name: Match.Maybe(String),
        password: Match.Maybe(String),
        username: Match.Maybe(String),
        active: Match.Maybe(Boolean),
        roles: Match.Maybe(Array),
        joinDefaultChannels: Match.Maybe(Boolean),
        requirePasswordChange: Match.Maybe(Boolean),
        sendWelcomeEmail: Match.Maybe(Boolean),
        verified: Match.Maybe(Boolean),
        customFields: Match.Maybe(Object)
      })
    });

    const userData = _.extend({
      _id: this.bodyParams.userId
    }, this.bodyParams.data);

    Meteor.runAsUser(this.userId, () => RocketChat.saveUser(this.userId, userData));

    if (this.bodyParams.data.customFields) {
      RocketChat.saveCustomFields(this.bodyParams.userId, this.bodyParams.data.customFields);
    }

    if (typeof this.bodyParams.data.active !== 'undefined') {
      Meteor.runAsUser(this.userId, () => {
        Meteor.call('setUserActiveStatus', this.bodyParams.userId, this.bodyParams.data.active);
      });
    }

    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(this.bodyParams.userId, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.updateOwnBasicInfo', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      data: Match.ObjectIncluding({
        email: Match.Maybe(String),
        name: Match.Maybe(String),
        username: Match.Maybe(String),
        currentPassword: Match.Maybe(String),
        newPassword: Match.Maybe(String)
      }),
      customFields: Match.Maybe(Object)
    });
    const userData = {
      email: this.bodyParams.data.email,
      realname: this.bodyParams.data.name,
      username: this.bodyParams.data.username,
      newPassword: this.bodyParams.data.newPassword,
      typedPassword: this.bodyParams.data.currentPassword
    };
    Meteor.runAsUser(this.userId, () => Meteor.call('saveUserProfile', userData, this.bodyParams.customFields));
    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(this.userId, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.createToken', {
  authRequired: true
}, {
  post() {
    const user = this.getUserFromParams();
    let data;
    Meteor.runAsUser(this.userId, () => {
      data = Meteor.call('createToken', user._id);
    });
    return data ? RocketChat.API.v1.success({
      data
    }) : RocketChat.API.v1.unauthorized();
  }

});
RocketChat.API.v1.addRoute('users.getPreferences', {
  authRequired: true
}, {
  get() {
    const user = RocketChat.models.Users.findOneById(this.userId);

    if (user.settings) {
      const {
        preferences
      } = user.settings;
      preferences.language = user.language;
      return RocketChat.API.v1.success({
        preferences
      });
    } else {
      return RocketChat.API.v1.failure(TAPi18n.__('Accounts_Default_User_Preferences_not_available').toUpperCase());
    }
  }

});
RocketChat.API.v1.addRoute('users.setPreferences', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      userId: Match.Maybe(String),
      data: Match.ObjectIncluding({
        newRoomNotification: Match.Maybe(String),
        newMessageNotification: Match.Maybe(String),
        useEmojis: Match.Maybe(Boolean),
        convertAsciiEmoji: Match.Maybe(Boolean),
        saveMobileBandwidth: Match.Maybe(Boolean),
        collapseMediaByDefault: Match.Maybe(Boolean),
        autoImageLoad: Match.Maybe(Boolean),
        emailNotificationMode: Match.Maybe(String),
        unreadAlert: Match.Maybe(Boolean),
        notificationsSoundVolume: Match.Maybe(Number),
        desktopNotifications: Match.Maybe(String),
        mobileNotifications: Match.Maybe(String),
        enableAutoAway: Match.Maybe(Boolean),
        highlights: Match.Maybe(Array),
        desktopNotificationDuration: Match.Maybe(Number),
        messageViewMode: Match.Maybe(Number),
        hideUsernames: Match.Maybe(Boolean),
        hideRoles: Match.Maybe(Boolean),
        hideAvatars: Match.Maybe(Boolean),
        hideFlexTab: Match.Maybe(Boolean),
        sendOnEnter: Match.Maybe(String),
        roomCounterSidebar: Match.Maybe(Boolean),
        language: Match.Maybe(String),
        sidebarShowFavorites: Match.Optional(Boolean),
        sidebarShowUnread: Match.Optional(Boolean),
        sidebarSortby: Match.Optional(String),
        sidebarViewMode: Match.Optional(String),
        sidebarHideAvatar: Match.Optional(Boolean),
        sidebarGroupByType: Match.Optional(Boolean),
        muteFocusedConversations: Match.Optional(Boolean)
      })
    });
    const userId = this.bodyParams.userId ? this.bodyParams.userId : this.userId;
    const userData = {
      _id: userId,
      settings: {
        preferences: this.bodyParams.data
      }
    };

    if (this.bodyParams.data.language) {
      const {
        language
      } = this.bodyParams.data;
      delete this.bodyParams.data.language;
      userData.language = language;
    }

    Meteor.runAsUser(this.userId, () => RocketChat.saveUser(this.userId, userData));
    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(userId, {
        fields: {
          'settings.preferences': 1
        }
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.forgotPassword', {
  authRequired: false
}, {
  post() {
    const {
      email
    } = this.bodyParams;

    if (!email) {
      return RocketChat.API.v1.failure('The \'email\' param is required');
    }

    const emailSent = Meteor.call('sendForgotPasswordEmail', email);

    if (emailSent) {
      return RocketChat.API.v1.success();
    }

    return RocketChat.API.v1.failure('User not found');
  }

});
RocketChat.API.v1.addRoute('users.getUsernameSuggestion', {
  authRequired: true
}, {
  get() {
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('getUsernameSuggestion'));
    return RocketChat.API.v1.success({
      result
    });
  }

});
RocketChat.API.v1.addRoute('users.generatePersonalAccessToken', {
  authRequired: true
}, {
  post() {
    const {
      tokenName
    } = this.bodyParams;

    if (!tokenName) {
      return RocketChat.API.v1.failure('The \'tokenName\' param is required');
    }

    const token = Meteor.runAsUser(this.userId, () => Meteor.call('personalAccessTokens:generateToken', {
      tokenName
    }));
    return RocketChat.API.v1.success({
      token
    });
  }

});
RocketChat.API.v1.addRoute('users.regeneratePersonalAccessToken', {
  authRequired: true
}, {
  post() {
    const {
      tokenName
    } = this.bodyParams;

    if (!tokenName) {
      return RocketChat.API.v1.failure('The \'tokenName\' param is required');
    }

    const token = Meteor.runAsUser(this.userId, () => Meteor.call('personalAccessTokens:regenerateToken', {
      tokenName
    }));
    return RocketChat.API.v1.success({
      token
    });
  }

});
RocketChat.API.v1.addRoute('users.getPersonalAccessTokens', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.settings.get('API_Enable_Personal_Access_Tokens')) {
      throw new Meteor.Error('error-personal-access-tokens-are-current-disabled', 'Personal Access Tokens are currently disabled');
    }

    const loginTokens = RocketChat.models.Users.getLoginTokensByUserId(this.userId).fetch()[0];

    const getPersonalAccessTokens = () => loginTokens.services.resume.loginTokens.filter(loginToken => loginToken.type && loginToken.type === 'personalAccessToken').map(loginToken => ({
      name: loginToken.name,
      createdAt: loginToken.createdAt,
      lastTokenPart: loginToken.lastTokenPart
    }));

    return RocketChat.API.v1.success({
      tokens: getPersonalAccessTokens()
    });
  }

});
RocketChat.API.v1.addRoute('users.removePersonalAccessToken', {
  authRequired: true
}, {
  post() {
    const {
      tokenName
    } = this.bodyParams;

    if (!tokenName) {
      return RocketChat.API.v1.failure('The \'tokenName\' param is required');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('personalAccessTokens:removeToken', {
      tokenName
    }));
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"assets.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/assets.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 0);
RocketChat.API.v1.addRoute('assets.setAsset', {
  authRequired: true
}, {
  post() {
    const busboy = new Busboy({
      headers: this.request.headers
    });
    const fields = {};
    let asset = {};
    Meteor.wrapAsync(callback => {
      busboy.on('field', (fieldname, value) => fields[fieldname] = value);
      busboy.on('file', Meteor.bindEnvironment((fieldname, file, filename, encoding, mimetype) => {
        const isValidAsset = Object.keys(RocketChat.Assets.assets).includes(fieldname);

        if (!isValidAsset) {
          callback(new Meteor.Error('error-invalid-asset', 'Invalid asset'));
        }

        const assetData = [];
        file.on('data', Meteor.bindEnvironment(data => {
          assetData.push(data);
        }));
        file.on('end', Meteor.bindEnvironment(() => {
          asset = {
            buffer: Buffer.concat(assetData),
            name: fieldname,
            mimetype
          };
        }));
      }));
      busboy.on('finish', () => callback());
      this.request.pipe(busboy);
    })();
    Meteor.runAsUser(this.userId, () => Meteor.call('setAsset', asset.buffer, asset.mimetype, asset.name));

    if (fields.refreshAllClients) {
      Meteor.runAsUser(this.userId, () => Meteor.call('refreshClients'));
    }

    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('assets.unsetAsset', {
  authRequired: true
}, {
  post() {
    const {
      assetName,
      refreshAllClients
    } = this.bodyParams;
    const isValidAsset = Object.keys(RocketChat.Assets.assets).includes(assetName);

    if (!isValidAsset) {
      throw new Meteor.Error('error-invalid-asset', 'Invalid asset');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('unsetAsset', assetName));

    if (refreshAllClients) {
      Meteor.runAsUser(this.userId, () => Meteor.call('refreshClients'));
    }

    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:api/server/api.js");
require("/node_modules/meteor/rocketchat:api/server/settings.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/requestParams.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/getPaginationItems.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/getUserFromParams.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/getUserInfo.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/isUserFromParams.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/parseJsonQuery.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/deprecationWarning.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/getLoggedInUser.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/insertUserObject.js");
require("/node_modules/meteor/rocketchat:api/server/default/info.js");
require("/node_modules/meteor/rocketchat:api/server/v1/channels.js");
require("/node_modules/meteor/rocketchat:api/server/v1/roles.js");
require("/node_modules/meteor/rocketchat:api/server/v1/rooms.js");
require("/node_modules/meteor/rocketchat:api/server/v1/subscriptions.js");
require("/node_modules/meteor/rocketchat:api/server/v1/chat.js");
require("/node_modules/meteor/rocketchat:api/server/v1/commands.js");
require("/node_modules/meteor/rocketchat:api/server/v1/emoji-custom.js");
require("/node_modules/meteor/rocketchat:api/server/v1/groups.js");
require("/node_modules/meteor/rocketchat:api/server/v1/im.js");
require("/node_modules/meteor/rocketchat:api/server/v1/integrations.js");
require("/node_modules/meteor/rocketchat:api/server/v1/misc.js");
require("/node_modules/meteor/rocketchat:api/server/v1/permissions.js");
require("/node_modules/meteor/rocketchat:api/server/v1/push.js");
require("/node_modules/meteor/rocketchat:api/server/v1/settings.js");
require("/node_modules/meteor/rocketchat:api/server/v1/stats.js");
require("/node_modules/meteor/rocketchat:api/server/v1/users.js");
require("/node_modules/meteor/rocketchat:api/server/v1/assets.js");

/* Exports */
Package._define("rocketchat:api");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_api.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2FwaS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9yZXF1ZXN0UGFyYW1zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9nZXRQYWdpbmF0aW9uSXRlbXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci9oZWxwZXJzL2dldFVzZXJGcm9tUGFyYW1zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9nZXRVc2VySW5mby5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2hlbHBlcnMvaXNVc2VyRnJvbVBhcmFtcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2hlbHBlcnMvcGFyc2VKc29uUXVlcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci9oZWxwZXJzL2RlcHJlY2F0aW9uV2FybmluZy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2hlbHBlcnMvZ2V0TG9nZ2VkSW5Vc2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9pbnNlcnRVc2VyT2JqZWN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvZGVmYXVsdC9pbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvY2hhbm5lbHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci92MS9yb2xlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL3Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvc3Vic2NyaXB0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2NoYXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci92MS9jb21tYW5kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2Vtb2ppLWN1c3RvbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2dyb3Vwcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2ltLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvaW50ZWdyYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvbWlzYy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL3Blcm1pc3Npb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvcHVzaC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvc3RhdHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci92MS91c2Vycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2Fzc2V0cy5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJsb2dnZXIiLCJMb2dnZXIiLCJBUEkiLCJSZXN0aXZ1cyIsImNvbnN0cnVjdG9yIiwicHJvcGVydGllcyIsImF1dGhNZXRob2RzIiwiZmllbGRTZXBhcmF0b3IiLCJkZWZhdWx0RmllbGRzVG9FeGNsdWRlIiwiam9pbkNvZGUiLCJtZW1iZXJzIiwiaW1wb3J0SWRzIiwibGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGUiLCJhdmF0YXJPcmlnaW4iLCJlbWFpbHMiLCJwaG9uZSIsInN0YXR1c0Nvbm5lY3Rpb24iLCJjcmVhdGVkQXQiLCJsYXN0TG9naW4iLCJzZXJ2aWNlcyIsInJlcXVpcmVQYXNzd29yZENoYW5nZSIsInJlcXVpcmVQYXNzd29yZENoYW5nZVJlYXNvbiIsInJvbGVzIiwic3RhdHVzRGVmYXVsdCIsIl91cGRhdGVkQXQiLCJjdXN0b21GaWVsZHMiLCJzZXR0aW5ncyIsImxpbWl0ZWRVc2VyRmllbGRzVG9FeGNsdWRlSWZJc1ByaXZpbGVnZWRVc2VyIiwiX2NvbmZpZyIsImRlZmF1bHRPcHRpb25zRW5kcG9pbnQiLCJfZGVmYXVsdE9wdGlvbnNFbmRwb2ludCIsInJlcXVlc3QiLCJtZXRob2QiLCJoZWFkZXJzIiwiUm9ja2V0Q2hhdCIsImdldCIsInJlc3BvbnNlIiwid3JpdGVIZWFkIiwid3JpdGUiLCJkb25lIiwiaGFzSGVscGVyTWV0aG9kcyIsImhlbHBlck1ldGhvZHMiLCJzaXplIiwiZ2V0SGVscGVyTWV0aG9kcyIsImdldEhlbHBlck1ldGhvZCIsIm5hbWUiLCJhZGRBdXRoTWV0aG9kIiwicHVzaCIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJpc09iamVjdCIsInN0YXR1c0NvZGUiLCJib2R5IiwiZGVidWciLCJmYWlsdXJlIiwiZXJyb3JUeXBlIiwic3RhY2siLCJlcnJvciIsIm5vdEZvdW5kIiwibXNnIiwidW5hdXRob3JpemVkIiwiYWRkUm91dGUiLCJyb3V0ZXMiLCJvcHRpb25zIiwiZW5kcG9pbnRzIiwiaXNBcnJheSIsInZlcnNpb24iLCJmb3JFYWNoIiwicm91dGUiLCJPYmplY3QiLCJrZXlzIiwiYWN0aW9uIiwib3JpZ2luYWxBY3Rpb24iLCJfaW50ZXJuYWxSb3V0ZUFjdGlvbkhhbmRsZXIiLCJyb2NrZXRjaGF0UmVzdEFwaUVuZCIsIm1ldHJpY3MiLCJyb2NrZXRjaGF0UmVzdEFwaSIsInN0YXJ0VGltZXIiLCJ1c2VyX2FnZW50IiwiZW50cnlwb2ludCIsInRvVXBwZXJDYXNlIiwidXJsIiwiYXBwbHkiLCJlIiwidjEiLCJtZXNzYWdlIiwic3RhdHVzIiwiaGVscGVyTWV0aG9kIiwiX2luaXRBdXRoIiwibG9naW5Db21wYXRpYmlsaXR5IiwiYm9keVBhcmFtcyIsInVzZXIiLCJ1c2VybmFtZSIsImVtYWlsIiwicGFzc3dvcmQiLCJjb2RlIiwid2l0aG91dCIsImxlbmd0aCIsImF1dGgiLCJpbmNsdWRlcyIsImhhc2hlZCIsImRpZ2VzdCIsImFsZ29yaXRobSIsInRvdHAiLCJsb2dpbiIsInNlbGYiLCJhdXRoUmVxdWlyZWQiLCJwb3N0IiwiYXJncyIsImdldFVzZXJJbmZvIiwiaW52b2NhdGlvbiIsIkREUENvbW1vbiIsIk1ldGhvZEludm9jYXRpb24iLCJjb25uZWN0aW9uIiwiY2xvc2UiLCJERFAiLCJfQ3VycmVudEludm9jYXRpb24iLCJ3aXRoVmFsdWUiLCJNZXRlb3IiLCJjYWxsIiwicmVhc29uIiwidXNlcnMiLCJmaW5kT25lIiwiX2lkIiwiaWQiLCJ1c2VySWQiLCJ1cGRhdGUiLCJBY2NvdW50cyIsIl9oYXNoTG9naW5Ub2tlbiIsInRva2VuIiwiJHVuc2V0IiwiZGF0YSIsImF1dGhUb2tlbiIsIm1lIiwiZXh0cmFEYXRhIiwib25Mb2dnZWRJbiIsImV4dGVuZCIsImV4dHJhIiwibG9nb3V0IiwiaGFzaGVkVG9rZW4iLCJ0b2tlbkxvY2F0aW9uIiwiaW5kZXgiLCJsYXN0SW5kZXhPZiIsInRva2VuUGF0aCIsInN1YnN0cmluZyIsInRva2VuRmllbGROYW1lIiwidG9rZW5Ub1JlbW92ZSIsInRva2VuUmVtb3ZhbFF1ZXJ5IiwiJHB1bGwiLCJvbkxvZ2dlZE91dCIsImNvbnNvbGUiLCJ3YXJuIiwiZ2V0VXNlckF1dGgiLCJfZ2V0VXNlckF1dGgiLCJpbnZhbGlkUmVzdWx0cyIsInVuZGVmaW5lZCIsInBheWxvYWQiLCJKU09OIiwicGFyc2UiLCJpIiwiTWFwIiwiQXBpQ2xhc3MiLCJjcmVhdGVBcGkiLCJfY3JlYXRlQXBpIiwiZW5hYmxlQ29ycyIsInVzZURlZmF1bHRBdXRoIiwicHJldHR5SnNvbiIsInByb2Nlc3MiLCJlbnYiLCJOT0RFX0VOViIsImtleSIsInZhbHVlIiwiYWRkR3JvdXAiLCJzZWN0aW9uIiwiYWRkIiwidHlwZSIsInB1YmxpYyIsImVuYWJsZVF1ZXJ5Iiwic2V0IiwiX3JlcXVlc3RQYXJhbXMiLCJxdWVyeVBhcmFtcyIsIl9nZXRQYWdpbmF0aW9uSXRlbXMiLCJoYXJkVXBwZXJMaW1pdCIsImRlZmF1bHRDb3VudCIsIm9mZnNldCIsInBhcnNlSW50IiwiY291bnQiLCJfZ2V0VXNlckZyb21QYXJhbXMiLCJkb2VzbnRFeGlzdCIsIl9kb2VzbnRFeGlzdCIsInBhcmFtcyIsInJlcXVlc3RQYXJhbXMiLCJ0cmltIiwibW9kZWxzIiwiVXNlcnMiLCJmaW5kT25lQnlJZCIsImZpbmRPbmVCeVVzZXJuYW1lIiwiRXJyb3IiLCJnZXRJbmZvRnJvbVVzZXJPYmplY3QiLCJ1dGNPZmZzZXQiLCJhY3RpdmUiLCJsYW5ndWFnZSIsIl9nZXRVc2VySW5mbyIsImlzVmVyaWZpZWRFbWFpbCIsIkFycmF5IiwiZmluZCIsInZlcmlmaWVkIiwiZ2V0VXNlclByZWZlcmVuY2VzIiwiZGVmYXVsdFVzZXJTZXR0aW5nUHJlZml4IiwiYWxsRGVmYXVsdFVzZXJTZXR0aW5ncyIsIlJlZ0V4cCIsInJlZHVjZSIsImFjY3VtdWxhdG9yIiwic2V0dGluZyIsInNldHRpbmdXaXRob3V0UHJlZml4IiwicmVwbGFjZSIsImdldFVzZXJQcmVmZXJlbmNlIiwidmVyaWZpZWRFbWFpbCIsImFkZHJlc3MiLCJwcmVmZXJlbmNlcyIsIl9pc1VzZXJGcm9tUGFyYW1zIiwiX3BhcnNlSnNvblF1ZXJ5Iiwic29ydCIsImZpZWxkcyIsIm5vblNlbGVjdGFibGVGaWVsZHMiLCJnZXRGaWVsZHMiLCJhdXRoeiIsImhhc1Blcm1pc3Npb24iLCJjb25jYXQiLCJrIiwic3BsaXQiLCJhc3NpZ24iLCJxdWVyeSIsIm5vblF1ZXJ5YWJsZUZpZWxkcyIsIl9kZXByZWNhdGlvbldhcm5pbmciLCJlbmRwb2ludCIsInZlcnNpb25XaWxsQmVSZW1vdmUiLCJ3YXJuaW5nTWVzc2FnZSIsIndhcm5pbmciLCJfZ2V0TG9nZ2VkSW5Vc2VyIiwiX2FkZFVzZXJUb09iamVjdCIsIm9iamVjdCIsImdldExvZ2dlZEluVXNlciIsImhhc1JvbGUiLCJpbmZvIiwiSW5mbyIsImZpbmRDaGFubmVsQnlJZE9yTmFtZSIsImNoZWNrZWRBcmNoaXZlZCIsInJvb21JZCIsInJvb21OYW1lIiwicm9vbSIsIlJvb21zIiwiZmluZE9uZUJ5TmFtZSIsInQiLCJhcmNoaXZlZCIsImZpbmRSZXN1bHQiLCJydW5Bc1VzZXIiLCJhY3RpdmVVc2Vyc09ubHkiLCJjaGFubmVsIiwiZ2V0VXNlckZyb21QYXJhbXMiLCJzdWIiLCJTdWJzY3JpcHRpb25zIiwiZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkIiwib3BlbiIsImFjY2VzcyIsInVucmVhZHMiLCJ1c2VyTWVudGlvbnMiLCJ1bnJlYWRzRnJvbSIsImpvaW5lZCIsIm1zZ3MiLCJsYXRlc3QiLCJyZXR1cm5Vc2VybmFtZXMiLCJzdWJzY3JpcHRpb24iLCJsbSIsIk1lc3NhZ2VzIiwiY291bnRWaXNpYmxlQnlSb29tSWRCZXR3ZWVuVGltZXN0YW1wc0luY2x1c2l2ZSIsInJpZCIsImxzIiwidHMiLCJ1c2Vyc0NvdW50IiwiY3JlYXRlQ2hhbm5lbFZhbGlkYXRvciIsImNyZWF0ZUNoYW5uZWwiLCJyZWFkT25seSIsImNoYW5uZWxzIiwiY3JlYXRlIiwidmFsaWRhdGUiLCJleGVjdXRlIiwiYWRkVXNlck9iamVjdFRvRXZlcnlPYmplY3QiLCJmaWxlIiwiaW5zZXJ0VXNlck9iamVjdCIsImdldFBhZ2luYXRpb25JdGVtcyIsInBhcnNlSnNvblF1ZXJ5Iiwib3VyUXVlcnkiLCJmaWxlcyIsIlVwbG9hZHMiLCJza2lwIiwibGltaXQiLCJmZXRjaCIsIm1hcCIsInRvdGFsIiwiaW5jbHVkZUFsbFB1YmxpY0NoYW5uZWxzIiwiJGluIiwiaW50ZWdyYXRpb25zIiwiSW50ZWdyYXRpb25zIiwiX2NyZWF0ZWRBdCIsImxhdGVzdERhdGUiLCJEYXRlIiwib2xkZXN0RGF0ZSIsIm9sZGVzdCIsImluY2x1c2l2ZSIsImhhc1Blcm1pc3Npb25Ub1NlZUFsbFB1YmxpY0NoYW5uZWxzIiwicm9vbUlkcyIsImZpbmRCeVVzZXJJZEFuZFR5cGUiLCJzIiwiY3Vyc29yIiwicm9vbXMiLCJmaW5kQnlTdWJzY3JpcHRpb25UeXBlQW5kVXNlcklkIiwidG90YWxDb3VudCIsImJyb2FkY2FzdCIsInN1YnNjcmlwdGlvbnMiLCJmaW5kQnlSb29tSWQiLCJ1IiwibWVzc2FnZXMiLCJvbmxpbmUiLCJmaW5kVXNlcnNOb3RPZmZsaW5lIiwib25saW5lSW5Sb29tIiwicm9vdCIsInRvU3RyaW5nIiwiZGVzY3JpcHRpb24iLCJwdXJwb3NlIiwicm8iLCJ0b3BpYyIsImFubm91bmNlbWVudCIsIm1lbnRpb25zIiwiYWxsTWVudGlvbnMiLCJSb2xlcyIsIkJ1c2JveSIsImZpbmRSb29tQnlJZE9yTmFtZSIsInVwZGF0ZWRTaW5jZSIsInVwZGF0ZWRTaW5jZURhdGUiLCJpc05hTiIsInJlbW92ZSIsInVybFBhcmFtcyIsImJ1c2JveSIsIndyYXBBc3luYyIsImNhbGxiYWNrIiwib24iLCJmaWVsZG5hbWUiLCJmaWxlbmFtZSIsImVuY29kaW5nIiwibWltZXR5cGUiLCJmaWxlRGF0ZSIsImZpbGVCdWZmZXIiLCJCdWZmZXIiLCJiaW5kRW52aXJvbm1lbnQiLCJwaXBlIiwiZmlsZVN0b3JlIiwiRmlsZVVwbG9hZCIsImdldFN0b3JlIiwiZGV0YWlscyIsInVwbG9hZGVkRmlsZSIsImluc2VydCIsImJpbmQiLCJzYXZlTm90aWZpY2F0aW9ucyIsIm5vdGlmaWNhdGlvbnMiLCJub3RpZmljYXRpb25LZXkiLCJmYXZvcml0ZSIsImhhc093blByb3BlcnR5IiwiZXhjbHVkZVBpbm5lZCIsImZpbGVzT25seSIsImZyb21Vc2VycyIsImNoZWNrIiwiU3RyaW5nIiwiZmlyc3RVbnJlYWRNZXNzYWdlIiwiTWF0Y2giLCJPYmplY3RJbmNsdWRpbmciLCJtc2dJZCIsImFzVXNlciIsIk1heWJlIiwiQm9vbGVhbiIsIm5vdyIsImxhc3RVcGRhdGUiLCJtZXNzYWdlSWQiLCJwaW5uZWRNZXNzYWdlIiwibWVzc2FnZVJldHVybiIsInByb2Nlc3NXZWJob29rTWVzc2FnZSIsInNlYXJjaFRleHQiLCJkb2NzIiwic3RhcnJlZCIsInRleHQiLCJlbW9qaSIsInJlYWN0aW9uIiwic2hvdWxkUmVhY3QiLCJtZXNzYWdlUmVhZFJlY2VpcHRzIiwicmVjZWlwdHMiLCJpZ25vcmUiLCJ0ZXN0IiwiY29tbWFuZCIsImNtZCIsInNsYXNoQ29tbWFuZHMiLCJjb21tYW5kcyIsInRvTG93ZXJDYXNlIiwidmFsdWVzIiwiZmlsdGVyIiwicHJvY2Vzc1F1ZXJ5T3B0aW9uc09uUmVzdWx0IiwicnVuIiwiUmFuZG9tIiwicHJldmlldyIsInByZXZpZXdJdGVtIiwiZW1vamlzIiwiZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUiLCJyb29tU3ViIiwiZmluZE9uZUJ5Um9vbU5hbWVBbmRVc2VySWQiLCJncm91cCIsImluY2x1ZGVBbGxQcml2YXRlR3JvdXBzIiwiY2hhbm5lbHNUb1NlYXJjaCIsImlkT3JOYW1lIiwiZmluZE9uZUJ5SWRPck5hbWUiLCJncm91cHMiLCJmaW5kRGlyZWN0TWVzc2FnZVJvb20iLCJnZXRSb29tQnlOYW1lT3JJZFdpdGhPcHRpb25Ub0pvaW4iLCJjdXJyZW50VXNlcklkIiwibmFtZU9ySWQiLCJydXNlcklkIiwicnMiLCJkbSIsInVucmVhZCIsImxvZyIsImltcyIsImVuYWJsZWQiLCJ1cmxzIiwiZXZlbnQiLCJ0cmlnZ2VyV29yZHMiLCJhbGlhcyIsImF2YXRhciIsInNjcmlwdEVuYWJsZWQiLCJzY3JpcHQiLCJ0YXJnZXRDaGFubmVsIiwiaW50ZWdyYXRpb24iLCJoaXN0b3J5IiwiSW50ZWdyYXRpb25IaXN0b3J5IiwiaXRlbXMiLCJ0YXJnZXRfdXJsIiwiaW50ZWdyYXRpb25JZCIsIm9ubGluZUNhY2hlIiwib25saW5lQ2FjaGVEYXRlIiwiY2FjaGVJbnZhbGlkIiwiaWNvbiIsInR5cGVzIiwiaGlkZUljb24iLCJiYWNrZ3JvdW5kQ29sb3IiLCJUQVBpMThuIiwiX18iLCJpY29uU2l6ZSIsImxlZnRTaXplIiwicmlnaHRTaXplIiwid2lkdGgiLCJoZWlnaHQiLCJzb3J0QnkiLCJzb3J0RGlyZWN0aW9uIiwiTWF0aCIsIm1heCIsInJlc3VsdHMiLCJwZXJtaXNzaW9ucyIsInBlcm1pc3Npb25Ob3RGb3VuZCIsInJvbGVOb3RGb3VuZCIsImVsZW1lbnQiLCJQZXJtaXNzaW9ucyIsInN1YmVsZW1lbnQiLCJjcmVhdGVPclVwZGF0ZSIsImFwcE5hbWUiLCJkZWxldGUiLCJhZmZlY3RlZFJlY29yZHMiLCJQdXNoIiwiYXBwQ29sbGVjdGlvbiIsIiRvciIsImhpZGRlbiIsIiRuZSIsIlNldHRpbmdzIiwibW91bnRPQXV0aFNlcnZpY2VzIiwib0F1dGhTZXJ2aWNlc0VuYWJsZWQiLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsImNvbmZpZ3VyYXRpb25zIiwic2VjcmV0Iiwic2VydmljZSIsImN1c3RvbSIsImNsaWVudElkIiwiYXBwSWQiLCJjb25zdW1lcktleSIsImJ1dHRvbkxhYmVsVGV4dCIsImJ1dHRvbkNvbG9yIiwiYnV0dG9uTGFiZWxDb2xvciIsInBpY2siLCJmaW5kT25lTm90SGlkZGVuQnlJZCIsImVkaXRvciIsInVwZGF0ZU9wdGlvbnNCeUlkIiwidXBkYXRlVmFsdWVOb3RIaWRkZW5CeUlkIiwiQW55IiwiUGFja2FnZSIsInJlZnJlc2giLCJzdGF0cyIsInN0YXRpc3RpY3MiLCJTdGF0aXN0aWNzIiwiam9pbkRlZmF1bHRDaGFubmVscyIsInNlbmRXZWxjb21lRW1haWwiLCJ2YWxpZGF0ZUN1c3RvbUZpZWxkcyIsIm5ld1VzZXJJZCIsInNhdmVVc2VyIiwic2F2ZUN1c3RvbUZpZWxkc1dpdGhvdXRWYWxpZGF0aW9uIiwiZ2V0VVJMIiwiY2RuIiwiZnVsbCIsInNldEhlYWRlciIsImlzVXNlckZyb21QYXJhbXMiLCJwcmVzZW5jZSIsImNvbm5lY3Rpb25TdGF0dXMiLCJhdmF0YXJVcmwiLCJzZXRVc2VyQXZhdGFyIiwiaW1hZ2VEYXRhIiwidXNlckRhdGEiLCJzYXZlQ3VzdG9tRmllbGRzIiwiY3VycmVudFBhc3N3b3JkIiwibmV3UGFzc3dvcmQiLCJyZWFsbmFtZSIsInR5cGVkUGFzc3dvcmQiLCJuZXdSb29tTm90aWZpY2F0aW9uIiwibmV3TWVzc2FnZU5vdGlmaWNhdGlvbiIsInVzZUVtb2ppcyIsImNvbnZlcnRBc2NpaUVtb2ppIiwic2F2ZU1vYmlsZUJhbmR3aWR0aCIsImNvbGxhcHNlTWVkaWFCeURlZmF1bHQiLCJhdXRvSW1hZ2VMb2FkIiwiZW1haWxOb3RpZmljYXRpb25Nb2RlIiwidW5yZWFkQWxlcnQiLCJub3RpZmljYXRpb25zU291bmRWb2x1bWUiLCJOdW1iZXIiLCJkZXNrdG9wTm90aWZpY2F0aW9ucyIsIm1vYmlsZU5vdGlmaWNhdGlvbnMiLCJlbmFibGVBdXRvQXdheSIsImhpZ2hsaWdodHMiLCJkZXNrdG9wTm90aWZpY2F0aW9uRHVyYXRpb24iLCJtZXNzYWdlVmlld01vZGUiLCJoaWRlVXNlcm5hbWVzIiwiaGlkZVJvbGVzIiwiaGlkZUF2YXRhcnMiLCJoaWRlRmxleFRhYiIsInNlbmRPbkVudGVyIiwicm9vbUNvdW50ZXJTaWRlYmFyIiwic2lkZWJhclNob3dGYXZvcml0ZXMiLCJPcHRpb25hbCIsInNpZGViYXJTaG93VW5yZWFkIiwic2lkZWJhclNvcnRieSIsInNpZGViYXJWaWV3TW9kZSIsInNpZGViYXJIaWRlQXZhdGFyIiwic2lkZWJhckdyb3VwQnlUeXBlIiwibXV0ZUZvY3VzZWRDb252ZXJzYXRpb25zIiwiZW1haWxTZW50IiwidG9rZW5OYW1lIiwibG9naW5Ub2tlbnMiLCJnZXRMb2dpblRva2Vuc0J5VXNlcklkIiwiZ2V0UGVyc29uYWxBY2Nlc3NUb2tlbnMiLCJyZXN1bWUiLCJsb2dpblRva2VuIiwibGFzdFRva2VuUGFydCIsInRva2VucyIsImFzc2V0IiwiaXNWYWxpZEFzc2V0IiwiQXNzZXRzIiwiYXNzZXRzIiwiYXNzZXREYXRhIiwiYnVmZmVyIiwicmVmcmVzaEFsbENsaWVudHMiLCJhc3NldE5hbWUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsQ0FBSjs7QUFBTUMsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0wsUUFBRUssQ0FBRjtBQUFJOztBQUFoQixDQUFuQyxFQUFxRCxDQUFyRDtBQUVOLE1BQU1DLFNBQVMsSUFBSUMsTUFBSixDQUFXLEtBQVgsRUFBa0IsRUFBbEIsQ0FBZjs7QUFFQSxNQUFNQyxHQUFOLFNBQWtCQyxRQUFsQixDQUEyQjtBQUMxQkMsY0FBWUMsVUFBWixFQUF3QjtBQUN2QixVQUFNQSxVQUFOO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQixFQUFuQjtBQUNBLFNBQUtDLGNBQUwsR0FBc0IsR0FBdEI7QUFDQSxTQUFLQyxzQkFBTCxHQUE4QjtBQUM3QkMsZ0JBQVUsQ0FEbUI7QUFFN0JDLGVBQVMsQ0FGb0I7QUFHN0JDLGlC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Q0E7O0FBQ0QsV0FBT3JGLFdBQVdoQyxHQUFYLENBQWVrRixFQUFmLENBQWtCcEMsT0FBbEIsRUFBUDtBQUNBOztBQVpzRSxDQUF4RSxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2FwaS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbCBSZXN0aXZ1cywgRERQLCBERFBDb21tb24gKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcignQVBJJywge30pO1xuXG5jbGFzcyBBUEkgZXh0ZW5kcyBSZXN0aXZ1cyB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0XHR0aGlzLmF1dGhNZXRob2RzID0gW107XG5cdFx0dGhpcy5maWVsZFNlcGFyYXRvciA9ICcuJztcblx0XHR0aGlzLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgPSB7XG5cdFx0XHRqb2luQ29kZTogMCxcblx0XHRcdG1lbWJlcnM6IDAsXG5cdFx0XHRpbXBvcnRJZHM6IDAsXG5cdFx0fTtcblx0XHR0aGlzLmxpbWl0ZWRVc2VyRmllbGRzVG9FeGNsdWRlID0ge1xuXHRcdFx0YXZhdGFyT3JpZ2luOiAwLFxuXHRcdFx0ZW1haWxzOiAwLFxuXHRcdFx0cGhvbmU6IDAsXG5cdFx0XHRzdGF0dXNDb25uZWN0aW9uOiAwLFxuXHRcdFx0Y3JlYXRlZEF0OiAwLFxuXHRcdFx0bGFzdExvZ2luOiAwLFxuXHRcdFx0c2VydmljZXM6IDAsXG5cdFx0XHRyZXF1aXJlUGFzc3dvcmRDaGFuZ2U6IDAsXG5cdFx0XHRyZXF1aXJlUGFzc3dvcmRDaGFuZ2VSZWFzb246IDAsXG5cdFx0XHRyb2xlczogMCxcblx0XHRcdHN0YXR1c0RlZmF1bHQ6IDAsXG5cdFx0XHRfdXBkYXRlZEF0OiAwLFxuXHRcdFx0Y3VzdG9tRmllbGRzOiAwLFxuXHRcdFx0c2V0dGluZ3M6IDAsXG5cdFx0fTtcblx0XHR0aGlzLmxpbWl0ZWRVc2VyRmllbGRzVG9FeGNsdWRlSWZJc1ByaXZpbGVnZWRVc2VyID0ge1xuXHRcdFx0c2VydmljZXM6IDAsXG5cdFx0fTtcblxuXHRcdHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9uc0VuZHBvaW50ID0gZnVuY3Rpb24gX2RlZmF1bHRPcHRpb25zRW5kcG9pbnQoKSB7XG5cdFx0XHRpZiAodGhpcy5yZXF1ZXN0Lm1ldGhvZCA9PT0gJ09QVElPTlMnICYmIHRoaXMucmVxdWVzdC5oZWFkZXJzWydhY2Nlc3MtY29udHJvbC1yZXF1ZXN0LW1ldGhvZCddKSB7XG5cdFx0XHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0VuYWJsZV9DT1JTJykgPT09IHRydWUpIHtcblx0XHRcdFx0XHR0aGlzLnJlc3BvbnNlLndyaXRlSGVhZCgyMDAsIHtcblx0XHRcdFx0XHRcdCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0NPUlNfT3JpZ2luJyksXG5cdFx0XHRcdFx0XHQnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdPcmlnaW4sIFgtUmVxdWVzdGVkLVdpdGgsIENvbnRlbnQtVHlwZSwgQWNjZXB0LCBYLVVzZXItSWQsIFgtQXV0aC1Ub2tlbicsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5yZXNwb25zZS53cml0ZUhlYWQoNDA1KTtcblx0XHRcdFx0XHR0aGlzLnJlc3BvbnNlLndyaXRlKCdDT1JTIG5vdCBlbmFibGVkLiBHbyB0byBcIkFkbWluID4gR2VuZXJhbCA+IFJFU1QgQXBpXCIgdG8gZW5hYmxlIGl0LicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlc3BvbnNlLndyaXRlSGVhZCg0MDQpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmRvbmUoKTtcblx0XHR9O1xuXHR9XG5cblx0aGFzSGVscGVyTWV0aG9kcygpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zaXplICE9PSAwO1xuXHR9XG5cblx0Z2V0SGVscGVyTWV0aG9kcygpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcztcblx0fVxuXG5cdGdldEhlbHBlck1ldGhvZChuYW1lKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLmhlbHBlck1ldGhvZHMuZ2V0KG5hbWUpO1xuXHR9XG5cblx0YWRkQXV0aE1ldGhvZChtZXRob2QpIHtcblx0XHR0aGlzLmF1dGhNZXRob2RzLnB1c2gobWV0aG9kKTtcblx0fVxuXG5cdHN1Y2Nlc3MocmVzdWx0ID0ge30pIHtcblx0XHRpZiAoXy5pc09iamVjdChyZXN1bHQpKSB7XG5cdFx0XHRyZXN1bHQuc3VjY2VzcyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmVzdWx0ID0ge1xuXHRcdFx0c3RhdHVzQ29kZTogMjAwLFxuXHRcdFx0Ym9keTogcmVzdWx0LFxuXHRcdH07XG5cblx0XHRsb2dnZXIuZGVidWcoJ1N1Y2Nlc3MnLCByZXN1bHQpO1xuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZhaWx1cmUocmVzdWx0LCBlcnJvclR5cGUsIHN0YWNrKSB7XG5cdFx0aWYgKF8uaXNPYmplY3QocmVzdWx0KSkge1xuXHRcdFx0cmVzdWx0LnN1Y2Nlc3MgPSBmYWxzZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ID0ge1xuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdFx0ZXJyb3I6IHJlc3VsdCxcblx0XHRcdFx0c3RhY2ssXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoZXJyb3JUeXBlKSB7XG5cdFx0XHRcdHJlc3VsdC5lcnJvclR5cGUgPSBlcnJvclR5cGU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmVzdWx0ID0ge1xuXHRcdFx0c3RhdHVzQ29kZTogNDAwLFxuXHRcdFx0Ym9keTogcmVzdWx0LFxuXHRcdH07XG5cblx0XHRsb2dnZXIuZGVidWcoJ0ZhaWx1cmUnLCByZXN1bHQpO1xuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdG5vdEZvdW5kKG1zZykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdGF0dXNDb2RlOiA0MDQsXG5cdFx0XHRib2R5OiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcjogbXNnID8gbXNnIDogJ1Jlc291cmNlIG5vdCBmb3VuZCcsXG5cdFx0XHR9LFxuXHRcdH07XG5cdH1cblxuXHR1bmF1dGhvcml6ZWQobXNnKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHN0YXR1c0NvZGU6IDQwMyxcblx0XHRcdGJvZHk6IHtcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRcdGVycm9yOiBtc2cgPyBtc2cgOiAndW5hdXRob3JpemVkJyxcblx0XHRcdH0sXG5cdFx0fTtcblx0fVxuXG5cdGFkZFJvdXRlKHJvdXRlcywgb3B0aW9ucywgZW5kcG9pbnRzKSB7XG5cdFx0Ly8gTm90ZTogcmVxdWlyZWQgaWYgdGhlIGRldmVsb3BlciBkaWRuJ3QgcHJvdmlkZSBvcHRpb25zXG5cdFx0aWYgKHR5cGVvZiBlbmRwb2ludHMgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRlbmRwb2ludHMgPSBvcHRpb25zO1xuXHRcdFx0b3B0aW9ucyA9IHt9O1xuXHRcdH1cblxuXHRcdC8vIEFsbG93IGZvciBtb3JlIHRoYW4gb25lIHJvdXRlIHVzaW5nIHRoZSBzYW1lIG9wdGlvbiBhbmQgZW5kcG9pbnRzXG5cdFx0aWYgKCFfLmlzQXJyYXkocm91dGVzKSkge1xuXHRcdFx0cm91dGVzID0gW3JvdXRlc107XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyB2ZXJzaW9uIH0gPSB0aGlzLl9jb25maWc7XG5cblx0XHRyb3V0ZXMuZm9yRWFjaCgocm91dGUpID0+IHtcblx0XHRcdC8vIE5vdGU6IFRoaXMgaXMgcmVxdWlyZWQgZHVlIHRvIFJlc3RpdnVzIGNhbGxpbmcgYGFkZFJvdXRlYCBpbiB0aGUgY29uc3RydWN0b3Igb2YgaXRzZWxmXG5cdFx0XHRPYmplY3Qua2V5cyhlbmRwb2ludHMpLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuXHRcdFx0XHRpZiAodHlwZW9mIGVuZHBvaW50c1ttZXRob2RdID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0ZW5kcG9pbnRzW21ldGhvZF0gPSB7IGFjdGlvbjogZW5kcG9pbnRzW21ldGhvZF0gfTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEFkZCBhIHRyeS9jYXRjaCBmb3IgZWFjaCBlbmRwb2ludFxuXHRcdFx0XHRjb25zdCBvcmlnaW5hbEFjdGlvbiA9IGVuZHBvaW50c1ttZXRob2RdLmFjdGlvbjtcblx0XHRcdFx0ZW5kcG9pbnRzW21ldGhvZF0uYWN0aW9uID0gZnVuY3Rpb24gX2ludGVybmFsUm91dGVBY3Rpb25IYW5kbGVyKCkge1xuXHRcdFx0XHRcdGNvbnN0IHJvY2tldGNoYXRSZXN0QXBpRW5kID0gUm9ja2V0Q2hhdC5tZXRyaWNzLnJvY2tldGNoYXRSZXN0QXBpLnN0YXJ0VGltZXIoe1xuXHRcdFx0XHRcdFx0bWV0aG9kLFxuXHRcdFx0XHRcdFx0dmVyc2lvbixcblx0XHRcdFx0XHRcdHVzZXJfYWdlbnQ6IHRoaXMucmVxdWVzdC5oZWFkZXJzWyd1c2VyLWFnZW50J10sXG5cdFx0XHRcdFx0XHRlbnRyeXBvaW50OiByb3V0ZSxcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdGxvZ2dlci5kZWJ1ZyhgJHsgdGhpcy5yZXF1ZXN0Lm1ldGhvZC50b1VwcGVyQ2FzZSgpIH06ICR7IHRoaXMucmVxdWVzdC51cmwgfWApO1xuXHRcdFx0XHRcdGxldCByZXN1bHQ7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHJlc3VsdCA9IG9yaWdpbmFsQWN0aW9uLmFwcGx5KHRoaXMpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdGxvZ2dlci5kZWJ1ZyhgJHsgbWV0aG9kIH0gJHsgcm91dGUgfSB0aHJldyBhbiBlcnJvcjpgLCBlLnN0YWNrKTtcblx0XHRcdFx0XHRcdHJlc3VsdCA9IFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5tZXNzYWdlLCBlLmVycm9yKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXN1bHQgPSByZXN1bHQgfHwgUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXG5cdFx0XHRcdFx0cm9ja2V0Y2hhdFJlc3RBcGlFbmQoe1xuXHRcdFx0XHRcdFx0c3RhdHVzOiByZXN1bHQuc3RhdHVzQ29kZSxcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0aWYgKHRoaXMuaGFzSGVscGVyTWV0aG9kcygpKSB7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBbbmFtZSwgaGVscGVyTWV0aG9kXSBvZiB0aGlzLmdldEhlbHBlck1ldGhvZHMoKSkge1xuXHRcdFx0XHRcdFx0ZW5kcG9pbnRzW21ldGhvZF1bbmFtZV0gPSBoZWxwZXJNZXRob2Q7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQWxsb3cgdGhlIGVuZHBvaW50cyB0byBtYWtlIHVzYWdlIG9mIHRoZSBsb2dnZXIgd2hpY2ggcmVzcGVjdHMgdGhlIHVzZXIncyBzZXR0aW5nc1xuXHRcdFx0XHRlbmRwb2ludHNbbWV0aG9kXS5sb2dnZXIgPSBsb2dnZXI7XG5cdFx0XHR9KTtcblxuXHRcdFx0c3VwZXIuYWRkUm91dGUocm91dGUsIG9wdGlvbnMsIGVuZHBvaW50cyk7XG5cdFx0fSk7XG5cdH1cblxuXHRfaW5pdEF1dGgoKSB7XG5cdFx0Y29uc3QgbG9naW5Db21wYXRpYmlsaXR5ID0gKGJvZHlQYXJhbXMpID0+IHtcblx0XHRcdC8vIEdyYWIgdGhlIHVzZXJuYW1lIG9yIGVtYWlsIHRoYXQgdGhlIHVzZXIgaXMgbG9nZ2luZyBpbiB3aXRoXG5cdFx0XHRjb25zdCB7IHVzZXIsIHVzZXJuYW1lLCBlbWFpbCwgcGFzc3dvcmQsIGNvZGUgfSA9IGJvZHlQYXJhbXM7XG5cblx0XHRcdGlmIChwYXNzd29yZCA9PSBudWxsKSB7XG5cdFx0XHRcdHJldHVybiBib2R5UGFyYW1zO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoXy53aXRob3V0KE9iamVjdC5rZXlzKGJvZHlQYXJhbXMpLCAndXNlcicsICd1c2VybmFtZScsICdlbWFpbCcsICdwYXNzd29yZCcsICdjb2RlJykubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRyZXR1cm4gYm9keVBhcmFtcztcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgYXV0aCA9IHtcblx0XHRcdFx0cGFzc3dvcmQsXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAodHlwZW9mIHVzZXIgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdGF1dGgudXNlciA9IHVzZXIuaW5jbHVkZXMoJ0AnKSA/IHsgZW1haWw6IHVzZXIgfSA6IHsgdXNlcm5hbWU6IHVzZXIgfTtcblx0XHRcdH0gZWxzZSBpZiAodXNlcm5hbWUpIHtcblx0XHRcdFx0YXV0aC51c2VyID0geyB1c2VybmFtZSB9O1xuXHRcdFx0fSBlbHNlIGlmIChlbWFpbCkge1xuXHRcdFx0XHRhdXRoLnVzZXIgPSB7IGVtYWlsIH07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChhdXRoLnVzZXIgPT0gbnVsbCkge1xuXHRcdFx0XHRyZXR1cm4gYm9keVBhcmFtcztcblx0XHRcdH1cblxuXHRcdFx0aWYgKGF1dGgucGFzc3dvcmQuaGFzaGVkKSB7XG5cdFx0XHRcdGF1dGgucGFzc3dvcmQgPSB7XG5cdFx0XHRcdFx0ZGlnZXN0OiBhdXRoLnBhc3N3b3JkLFxuXHRcdFx0XHRcdGFsZ29yaXRobTogJ3NoYS0yNTYnLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoY29kZSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHRvdHA6IHtcblx0XHRcdFx0XHRcdGNvZGUsXG5cdFx0XHRcdFx0XHRsb2dpbjogYXV0aCxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYXV0aDtcblx0XHR9O1xuXG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0XHR0aGlzLmFkZFJvdXRlKCdsb2dpbicsIHsgYXV0aFJlcXVpcmVkOiBmYWxzZSB9LCB7XG5cdFx0XHRwb3N0KCkge1xuXHRcdFx0XHRjb25zdCBhcmdzID0gbG9naW5Db21wYXRpYmlsaXR5KHRoaXMuYm9keVBhcmFtcyk7XG5cdFx0XHRcdGNvbnN0IGdldFVzZXJJbmZvID0gc2VsZi5nZXRIZWxwZXJNZXRob2QoJ2dldFVzZXJJbmZvJyk7XG5cblx0XHRcdFx0Y29uc3QgaW52b2NhdGlvbiA9IG5ldyBERFBDb21tb24uTWV0aG9kSW52b2NhdGlvbih7XG5cdFx0XHRcdFx0Y29ubmVjdGlvbjoge1xuXHRcdFx0XHRcdFx0Y2xvc2UoKSB7fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRsZXQgYXV0aDtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRhdXRoID0gRERQLl9DdXJyZW50SW52b2NhdGlvbi53aXRoVmFsdWUoaW52b2NhdGlvbiwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2xvZ2luJywgYXJncykpO1xuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdGxldCBlID0gZXJyb3I7XG5cdFx0XHRcdFx0aWYgKGVycm9yLnJlYXNvbiA9PT0gJ1VzZXIgbm90IGZvdW5kJykge1xuXHRcdFx0XHRcdFx0ZSA9IHtcblx0XHRcdFx0XHRcdFx0ZXJyb3I6ICdVbmF1dGhvcml6ZWQnLFxuXHRcdFx0XHRcdFx0XHRyZWFzb246ICdVbmF1dGhvcml6ZWQnLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0c3RhdHVzQ29kZTogNDAxLFxuXHRcdFx0XHRcdFx0Ym9keToge1xuXHRcdFx0XHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXG5cdFx0XHRcdFx0XHRcdGVycm9yOiBlLmVycm9yLFxuXHRcdFx0XHRcdFx0XHRtZXNzYWdlOiBlLnJlYXNvbiB8fCBlLm1lc3NhZ2UsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzLnVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh7XG5cdFx0XHRcdFx0X2lkOiBhdXRoLmlkLFxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR0aGlzLnVzZXJJZCA9IHRoaXMudXNlci5faWQ7XG5cblx0XHRcdFx0Ly8gUmVtb3ZlIHRva2VuRXhwaXJlcyB0byBrZWVwIHRoZSBvbGQgYmVoYXZpb3Jcblx0XHRcdFx0TWV0ZW9yLnVzZXJzLnVwZGF0ZSh7XG5cdFx0XHRcdFx0X2lkOiB0aGlzLnVzZXIuX2lkLFxuXHRcdFx0XHRcdCdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuaGFzaGVkVG9rZW4nOiBBY2NvdW50cy5faGFzaExvZ2luVG9rZW4oYXV0aC50b2tlbiksXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHQkdW5zZXQ6IHtcblx0XHRcdFx0XHRcdCdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuJC53aGVuJzogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRjb25zdCByZXNwb25zZSA9IHtcblx0XHRcdFx0XHRzdGF0dXM6ICdzdWNjZXNzJyxcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHR1c2VySWQ6IHRoaXMudXNlcklkLFxuXHRcdFx0XHRcdFx0YXV0aFRva2VuOiBhdXRoLnRva2VuLFxuXHRcdFx0XHRcdFx0bWU6IGdldFVzZXJJbmZvKHRoaXMudXNlciksXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRjb25zdCBleHRyYURhdGEgPSBzZWxmLl9jb25maWcub25Mb2dnZWRJbiAmJiBzZWxmLl9jb25maWcub25Mb2dnZWRJbi5jYWxsKHRoaXMpO1xuXG5cdFx0XHRcdGlmIChleHRyYURhdGEgIT0gbnVsbCkge1xuXHRcdFx0XHRcdF8uZXh0ZW5kKHJlc3BvbnNlLmRhdGEsIHtcblx0XHRcdFx0XHRcdGV4dHJhOiBleHRyYURhdGEsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgbG9nb3V0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBSZW1vdmUgdGhlIGdpdmVuIGF1dGggdG9rZW4gZnJvbSB0aGUgdXNlcidzIGFjY291bnRcblx0XHRcdGNvbnN0IGF1dGhUb2tlbiA9IHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LWF1dGgtdG9rZW4nXTtcblx0XHRcdGNvbnN0IGhhc2hlZFRva2VuID0gQWNjb3VudHMuX2hhc2hMb2dpblRva2VuKGF1dGhUb2tlbik7XG5cdFx0XHRjb25zdCB0b2tlbkxvY2F0aW9uID0gc2VsZi5fY29uZmlnLmF1dGgudG9rZW47XG5cdFx0XHRjb25zdCBpbmRleCA9IHRva2VuTG9jYXRpb24ubGFzdEluZGV4T2YoJy4nKTtcblx0XHRcdGNvbnN0IHRva2VuUGF0aCA9IHRva2VuTG9jYXRpb24uc3Vic3RyaW5nKDAsIGluZGV4KTtcblx0XHRcdGNvbnN0IHRva2VuRmllbGROYW1lID0gdG9rZW5Mb2NhdGlvbi5zdWJzdHJpbmcoaW5kZXggKyAxKTtcblx0XHRcdGNvbnN0IHRva2VuVG9SZW1vdmUgPSB7fTtcblx0XHRcdHRva2VuVG9SZW1vdmVbdG9rZW5GaWVsZE5hbWVdID0gaGFzaGVkVG9rZW47XG5cdFx0XHRjb25zdCB0b2tlblJlbW92YWxRdWVyeSA9IHt9O1xuXHRcdFx0dG9rZW5SZW1vdmFsUXVlcnlbdG9rZW5QYXRoXSA9IHRva2VuVG9SZW1vdmU7XG5cblx0XHRcdE1ldGVvci51c2Vycy51cGRhdGUodGhpcy51c2VyLl9pZCwge1xuXHRcdFx0XHQkcHVsbDogdG9rZW5SZW1vdmFsUXVlcnksXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSB7XG5cdFx0XHRcdHN0YXR1czogJ3N1Y2Nlc3MnLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0bWVzc2FnZTogJ1lvdVxcJ3ZlIGJlZW4gbG9nZ2VkIG91dCEnLFxuXHRcdFx0XHR9LFxuXHRcdFx0fTtcblxuXHRcdFx0Ly8gQ2FsbCB0aGUgbG9nb3V0IGhvb2sgd2l0aCB0aGUgYXV0aGVudGljYXRlZCB1c2VyIGF0dGFjaGVkXG5cdFx0XHRjb25zdCBleHRyYURhdGEgPSBzZWxmLl9jb25maWcub25Mb2dnZWRPdXQgJiYgc2VsZi5fY29uZmlnLm9uTG9nZ2VkT3V0LmNhbGwodGhpcyk7XG5cdFx0XHRpZiAoZXh0cmFEYXRhICE9IG51bGwpIHtcblx0XHRcdFx0Xy5leHRlbmQocmVzcG9uc2UuZGF0YSwge1xuXHRcdFx0XHRcdGV4dHJhOiBleHRyYURhdGEsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xuXHRcdH07XG5cblx0XHQvKlxuXHRcdFx0QWRkIGEgbG9nb3V0IGVuZHBvaW50IHRvIHRoZSBBUElcblx0XHRcdEFmdGVyIHRoZSB1c2VyIGlzIGxvZ2dlZCBvdXQsIHRoZSBvbkxvZ2dlZE91dCBob29rIGlzIGNhbGxlZCAoc2VlIFJlc3RmdWxseS5jb25maWd1cmUoKSBmb3Jcblx0XHRcdGFkZGluZyBob29rKS5cblx0XHQqL1xuXHRcdHJldHVybiB0aGlzLmFkZFJvdXRlKCdsb2dvdXQnLCB7XG5cdFx0XHRhdXRoUmVxdWlyZWQ6IHRydWUsXG5cdFx0fSwge1xuXHRcdFx0Z2V0KCkge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oJ1dhcm5pbmc6IERlZmF1bHQgbG9nb3V0IHZpYSBHRVQgd2lsbCBiZSByZW1vdmVkIGluIFJlc3RpdnVzIHYxLjAuIFVzZSBQT1NUIGluc3RlYWQuJyk7XG5cdFx0XHRcdGNvbnNvbGUud2FybignICAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20va2FobWFsaS9tZXRlb3ItcmVzdGl2dXMvaXNzdWVzLzEwMCcpO1xuXHRcdFx0XHRyZXR1cm4gbG9nb3V0LmNhbGwodGhpcyk7XG5cdFx0XHR9LFxuXHRcdFx0cG9zdDogbG9nb3V0LFxuXHRcdH0pO1xuXHR9XG59XG5cbmNvbnN0IGdldFVzZXJBdXRoID0gZnVuY3Rpb24gX2dldFVzZXJBdXRoKC4uLmFyZ3MpIHtcblx0Y29uc3QgaW52YWxpZFJlc3VsdHMgPSBbdW5kZWZpbmVkLCBudWxsLCBmYWxzZV07XG5cdHJldHVybiB7XG5cdFx0dG9rZW46ICdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuaGFzaGVkVG9rZW4nLFxuXHRcdHVzZXIoKSB7XG5cdFx0XHRpZiAodGhpcy5ib2R5UGFyYW1zICYmIHRoaXMuYm9keVBhcmFtcy5wYXlsb2FkKSB7XG5cdFx0XHRcdHRoaXMuYm9keVBhcmFtcyA9IEpTT04ucGFyc2UodGhpcy5ib2R5UGFyYW1zLnBheWxvYWQpO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IFJvY2tldENoYXQuQVBJLnYxLmF1dGhNZXRob2RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGNvbnN0IG1ldGhvZCA9IFJvY2tldENoYXQuQVBJLnYxLmF1dGhNZXRob2RzW2ldO1xuXG5cdFx0XHRcdGlmICh0eXBlb2YgbWV0aG9kID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdFx0XHRcdGlmICghaW52YWxpZFJlc3VsdHMuaW5jbHVkZXMocmVzdWx0KSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0bGV0IHRva2VuO1xuXHRcdFx0aWYgKHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LWF1dGgtdG9rZW4nXSkge1xuXHRcdFx0XHR0b2tlbiA9IEFjY291bnRzLl9oYXNoTG9naW5Ub2tlbih0aGlzLnJlcXVlc3QuaGVhZGVyc1sneC1hdXRoLXRva2VuJ10pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR1c2VySWQ6IHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LXVzZXItaWQnXSxcblx0XHRcdFx0dG9rZW4sXG5cdFx0XHR9O1xuXHRcdH0sXG5cdH07XG59O1xuXG5Sb2NrZXRDaGF0LkFQSSA9IHtcblx0aGVscGVyTWV0aG9kczogbmV3IE1hcCgpLFxuXHRnZXRVc2VyQXV0aCxcblx0QXBpQ2xhc3M6IEFQSSxcbn07XG5cbmNvbnN0IGNyZWF0ZUFwaSA9IGZ1bmN0aW9uIF9jcmVhdGVBcGkoZW5hYmxlQ29ycykge1xuXHRpZiAoIVJvY2tldENoYXQuQVBJLnYxIHx8IFJvY2tldENoYXQuQVBJLnYxLl9jb25maWcuZW5hYmxlQ29ycyAhPT0gZW5hYmxlQ29ycykge1xuXHRcdFJvY2tldENoYXQuQVBJLnYxID0gbmV3IEFQSSh7XG5cdFx0XHR2ZXJzaW9uOiAndjEnLFxuXHRcdFx0dXNlRGVmYXVsdEF1dGg6IHRydWUsXG5cdFx0XHRwcmV0dHlKc29uOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jyxcblx0XHRcdGVuYWJsZUNvcnMsXG5cdFx0XHRhdXRoOiBnZXRVc2VyQXV0aCgpLFxuXHRcdH0pO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LkFQSS5kZWZhdWx0IHx8IFJvY2tldENoYXQuQVBJLmRlZmF1bHQuX2NvbmZpZy5lbmFibGVDb3JzICE9PSBlbmFibGVDb3JzKSB7XG5cdFx0Um9ja2V0Q2hhdC5BUEkuZGVmYXVsdCA9IG5ldyBBUEkoe1xuXHRcdFx0dXNlRGVmYXVsdEF1dGg6IHRydWUsXG5cdFx0XHRwcmV0dHlKc29uOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jyxcblx0XHRcdGVuYWJsZUNvcnMsXG5cdFx0XHRhdXRoOiBnZXRVc2VyQXV0aCgpLFxuXHRcdH0pO1xuXHR9XG59O1xuXG4vLyByZWdpc3RlciB0aGUgQVBJIHRvIGJlIHJlLWNyZWF0ZWQgb25jZSB0aGUgQ09SUy1zZXR0aW5nIGNoYW5nZXMuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0VuYWJsZV9DT1JTJywgKGtleSwgdmFsdWUpID0+IHtcblx0Y3JlYXRlQXBpKHZhbHVlKTtcbn0pO1xuXG4vLyBhbHNvIGNyZWF0ZSB0aGUgQVBJIGltbWVkaWF0ZWx5XG5jcmVhdGVBcGkoISFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0VuYWJsZV9DT1JTJykpO1xuIiwiUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnR2VuZXJhbCcsIGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNlY3Rpb24oJ1JFU1QgQVBJJywgZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5hZGQoJ0FQSV9VcHBlcl9Db3VudF9MaW1pdCcsIDEwMCwgeyB0eXBlOiAnaW50JywgcHVibGljOiBmYWxzZSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX0RlZmF1bHRfQ291bnQnLCA1MCwgeyB0eXBlOiAnaW50JywgcHVibGljOiBmYWxzZSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX0FsbG93X0luZmluaXRlX0NvdW50JywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIHB1YmxpYzogZmFsc2UgfSk7XG5cdFx0dGhpcy5hZGQoJ0FQSV9FbmFibGVfRGlyZWN0X01lc3NhZ2VfSGlzdG9yeV9FbmRQb2ludCcsIGZhbHNlLCB7IHR5cGU6ICdib29sZWFuJywgcHVibGljOiBmYWxzZSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX0VuYWJsZV9TaGllbGRzJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIHB1YmxpYzogZmFsc2UgfSk7XG5cdFx0dGhpcy5hZGQoJ0FQSV9TaGllbGRfVHlwZXMnLCAnKicsIHsgdHlwZTogJ3N0cmluZycsIHB1YmxpYzogZmFsc2UsIGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0FQSV9FbmFibGVfU2hpZWxkcycsIHZhbHVlOiB0cnVlIH0gfSk7XG5cdFx0dGhpcy5hZGQoJ0FQSV9FbmFibGVfQ09SUycsIGZhbHNlLCB7IHR5cGU6ICdib29sZWFuJywgcHVibGljOiBmYWxzZSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX0NPUlNfT3JpZ2luJywgJyonLCB7IHR5cGU6ICdzdHJpbmcnLCBwdWJsaWM6IGZhbHNlLCBlbmFibGVRdWVyeTogeyBfaWQ6ICdBUElfRW5hYmxlX0NPUlMnLCB2YWx1ZTogdHJ1ZSB9IH0pO1xuXHR9KTtcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ3JlcXVlc3RQYXJhbXMnLCBmdW5jdGlvbiBfcmVxdWVzdFBhcmFtcygpIHtcblx0cmV0dXJuIFsnUE9TVCcsICdQVVQnXS5pbmNsdWRlcyh0aGlzLnJlcXVlc3QubWV0aG9kKSA/IHRoaXMuYm9keVBhcmFtcyA6IHRoaXMucXVlcnlQYXJhbXM7XG59KTtcbiIsIi8vIElmIHRoZSBjb3VudCBxdWVyeSBwYXJhbSBpcyBoaWdoZXIgdGhhbiB0aGUgXCJBUElfVXBwZXJfQ291bnRfTGltaXRcIiBzZXR0aW5nLCB0aGVuIHdlIGxpbWl0IHRoYXRcbi8vIElmIHRoZSBjb3VudCBxdWVyeSBwYXJhbSBpc24ndCBkZWZpbmVkLCB0aGVuIHdlIHNldCBpdCB0byB0aGUgXCJBUElfRGVmYXVsdF9Db3VudFwiIHNldHRpbmdcbi8vIElmIHRoZSBjb3VudCBpcyB6ZXJvLCB0aGVuIHRoYXQgbWVhbnMgdW5saW1pdGVkIGFuZCBpcyBvbmx5IGFsbG93ZWQgaWYgdGhlIHNldHRpbmcgXCJBUElfQWxsb3dfSW5maW5pdGVfQ291bnRcIiBpcyB0cnVlXG5cblJvY2tldENoYXQuQVBJLmhlbHBlck1ldGhvZHMuc2V0KCdnZXRQYWdpbmF0aW9uSXRlbXMnLCBmdW5jdGlvbiBfZ2V0UGFnaW5hdGlvbkl0ZW1zKCkge1xuXHRjb25zdCBoYXJkVXBwZXJMaW1pdCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfVXBwZXJfQ291bnRfTGltaXQnKSA8PSAwID8gMTAwIDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9VcHBlcl9Db3VudF9MaW1pdCcpO1xuXHRjb25zdCBkZWZhdWx0Q291bnQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0RlZmF1bHRfQ291bnQnKSA8PSAwID8gNTAgOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0RlZmF1bHRfQ291bnQnKTtcblx0Y29uc3Qgb2Zmc2V0ID0gdGhpcy5xdWVyeVBhcmFtcy5vZmZzZXQgPyBwYXJzZUludCh0aGlzLnF1ZXJ5UGFyYW1zLm9mZnNldCkgOiAwO1xuXHRsZXQgY291bnQgPSBkZWZhdWx0Q291bnQ7XG5cblx0Ly8gRW5zdXJlIGNvdW50IGlzIGFuIGFwcHJvcGlhdGUgYW1vdW50XG5cdGlmICh0eXBlb2YgdGhpcy5xdWVyeVBhcmFtcy5jb3VudCAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRjb3VudCA9IHBhcnNlSW50KHRoaXMucXVlcnlQYXJhbXMuY291bnQpO1xuXHR9IGVsc2Uge1xuXHRcdGNvdW50ID0gZGVmYXVsdENvdW50O1xuXHR9XG5cblx0aWYgKGNvdW50ID4gaGFyZFVwcGVyTGltaXQpIHtcblx0XHRjb3VudCA9IGhhcmRVcHBlckxpbWl0O1xuXHR9XG5cblx0aWYgKGNvdW50ID09PSAwICYmICFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0FsbG93X0luZmluaXRlX0NvdW50JykpIHtcblx0XHRjb3VudCA9IGRlZmF1bHRDb3VudDtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0b2Zmc2V0LFxuXHRcdGNvdW50LFxuXHR9O1xufSk7XG4iLCIvLyBDb252ZW5pZW5jZSBtZXRob2QsIGFsbW9zdCBuZWVkIHRvIHR1cm4gaXQgaW50byBhIG1pZGRsZXdhcmUgb2Ygc29ydHNcblJvY2tldENoYXQuQVBJLmhlbHBlck1ldGhvZHMuc2V0KCdnZXRVc2VyRnJvbVBhcmFtcycsIGZ1bmN0aW9uIF9nZXRVc2VyRnJvbVBhcmFtcygpIHtcblx0Y29uc3QgZG9lc250RXhpc3QgPSB7IF9kb2VzbnRFeGlzdDogdHJ1ZSB9O1xuXHRsZXQgdXNlcjtcblx0Y29uc3QgcGFyYW1zID0gdGhpcy5yZXF1ZXN0UGFyYW1zKCk7XG5cblx0aWYgKHBhcmFtcy51c2VySWQgJiYgcGFyYW1zLnVzZXJJZC50cmltKCkpIHtcblx0XHR1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQocGFyYW1zLnVzZXJJZCkgfHwgZG9lc250RXhpc3Q7XG5cdH0gZWxzZSBpZiAocGFyYW1zLnVzZXJuYW1lICYmIHBhcmFtcy51c2VybmFtZS50cmltKCkpIHtcblx0XHR1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUocGFyYW1zLnVzZXJuYW1lKSB8fCBkb2VzbnRFeGlzdDtcblx0fSBlbHNlIGlmIChwYXJhbXMudXNlciAmJiBwYXJhbXMudXNlci50cmltKCkpIHtcblx0XHR1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUocGFyYW1zLnVzZXIpIHx8IGRvZXNudEV4aXN0O1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXVzZXItcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcInVzZXJJZFwiIG9yIFwidXNlcm5hbWVcIiBwYXJhbSB3YXMgbm90IHByb3ZpZGVkJyk7XG5cdH1cblxuXHRpZiAodXNlci5fZG9lc250RXhpc3QpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnVGhlIHJlcXVpcmVkIFwidXNlcklkXCIgb3IgXCJ1c2VybmFtZVwiIHBhcmFtIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIGFueSB1c2VycycpO1xuXHR9XG5cblx0cmV0dXJuIHVzZXI7XG59KTtcbiIsImNvbnN0IGdldEluZm9Gcm9tVXNlck9iamVjdCA9ICh1c2VyKSA9PiB7XG5cdGNvbnN0IHtcblx0XHRfaWQsXG5cdFx0bmFtZSxcblx0XHRlbWFpbHMsXG5cdFx0c3RhdHVzLFxuXHRcdHN0YXR1c0Nvbm5lY3Rpb24sXG5cdFx0dXNlcm5hbWUsXG5cdFx0dXRjT2Zmc2V0LFxuXHRcdGFjdGl2ZSxcblx0XHRsYW5ndWFnZSxcblx0XHRyb2xlcyxcblx0XHRzZXR0aW5ncyxcblx0XHRjdXN0b21GaWVsZHMsXG5cdH0gPSB1c2VyO1xuXHRyZXR1cm4ge1xuXHRcdF9pZCxcblx0XHRuYW1lLFxuXHRcdGVtYWlscyxcblx0XHRzdGF0dXMsXG5cdFx0c3RhdHVzQ29ubmVjdGlvbixcblx0XHR1c2VybmFtZSxcblx0XHR1dGNPZmZzZXQsXG5cdFx0YWN0aXZlLFxuXHRcdGxhbmd1YWdlLFxuXHRcdHJvbGVzLFxuXHRcdHNldHRpbmdzLFxuXHRcdGN1c3RvbUZpZWxkcyxcblx0fTtcbn07XG5cblxuUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ2dldFVzZXJJbmZvJywgZnVuY3Rpb24gX2dldFVzZXJJbmZvKHVzZXIpIHtcblx0Y29uc3QgbWUgPSBnZXRJbmZvRnJvbVVzZXJPYmplY3QodXNlcik7XG5cdGNvbnN0IGlzVmVyaWZpZWRFbWFpbCA9ICgpID0+IHtcblx0XHRpZiAobWUgJiYgbWUuZW1haWxzICYmIEFycmF5LmlzQXJyYXkobWUuZW1haWxzKSkge1xuXHRcdFx0cmV0dXJuIG1lLmVtYWlscy5maW5kKChlbWFpbCkgPT4gZW1haWwudmVyaWZpZWQpO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH07XG5cdGNvbnN0IGdldFVzZXJQcmVmZXJlbmNlcyA9ICgpID0+IHtcblx0XHRjb25zdCBkZWZhdWx0VXNlclNldHRpbmdQcmVmaXggPSAnQWNjb3VudHNfRGVmYXVsdF9Vc2VyX1ByZWZlcmVuY2VzXyc7XG5cdFx0Y29uc3QgYWxsRGVmYXVsdFVzZXJTZXR0aW5ncyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KG5ldyBSZWdFeHAoYF4keyBkZWZhdWx0VXNlclNldHRpbmdQcmVmaXggfS4qJGApKTtcblxuXHRcdHJldHVybiBhbGxEZWZhdWx0VXNlclNldHRpbmdzLnJlZHVjZSgoYWNjdW11bGF0b3IsIHNldHRpbmcpID0+IHtcblx0XHRcdGNvbnN0IHNldHRpbmdXaXRob3V0UHJlZml4ID0gc2V0dGluZy5rZXkucmVwbGFjZShkZWZhdWx0VXNlclNldHRpbmdQcmVmaXgsICcgJykudHJpbSgpO1xuXHRcdFx0YWNjdW11bGF0b3Jbc2V0dGluZ1dpdGhvdXRQcmVmaXhdID0gUm9ja2V0Q2hhdC5nZXRVc2VyUHJlZmVyZW5jZSh1c2VyLCBzZXR0aW5nV2l0aG91dFByZWZpeCk7XG5cdFx0XHRyZXR1cm4gYWNjdW11bGF0b3I7XG5cdFx0fSwge30pO1xuXHR9O1xuXHRjb25zdCB2ZXJpZmllZEVtYWlsID0gaXNWZXJpZmllZEVtYWlsKCk7XG5cdG1lLmVtYWlsID0gdmVyaWZpZWRFbWFpbCA/IHZlcmlmaWVkRW1haWwuYWRkcmVzcyA6IHVuZGVmaW5lZDtcblx0bWUuc2V0dGluZ3MgPSB7XG5cdFx0cHJlZmVyZW5jZXM6IGdldFVzZXJQcmVmZXJlbmNlcygpLFxuXHR9O1xuXG5cdHJldHVybiBtZTtcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ2lzVXNlckZyb21QYXJhbXMnLCBmdW5jdGlvbiBfaXNVc2VyRnJvbVBhcmFtcygpIHtcblx0Y29uc3QgcGFyYW1zID0gdGhpcy5yZXF1ZXN0UGFyYW1zKCk7XG5cblx0cmV0dXJuICghcGFyYW1zLnVzZXJJZCAmJiAhcGFyYW1zLnVzZXJuYW1lICYmICFwYXJhbXMudXNlcikgfHxcblx0XHQocGFyYW1zLnVzZXJJZCAmJiB0aGlzLnVzZXJJZCA9PT0gcGFyYW1zLnVzZXJJZCkgfHxcblx0XHQocGFyYW1zLnVzZXJuYW1lICYmIHRoaXMudXNlci51c2VybmFtZSA9PT0gcGFyYW1zLnVzZXJuYW1lKSB8fFxuXHRcdChwYXJhbXMudXNlciAmJiB0aGlzLnVzZXIudXNlcm5hbWUgPT09IHBhcmFtcy51c2VyKTtcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ3BhcnNlSnNvblF1ZXJ5JywgZnVuY3Rpb24gX3BhcnNlSnNvblF1ZXJ5KCkge1xuXHRsZXQgc29ydDtcblx0aWYgKHRoaXMucXVlcnlQYXJhbXMuc29ydCkge1xuXHRcdHRyeSB7XG5cdFx0XHRzb3J0ID0gSlNPTi5wYXJzZSh0aGlzLnF1ZXJ5UGFyYW1zLnNvcnQpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYEludmFsaWQgc29ydCBwYXJhbWV0ZXIgcHJvdmlkZWQgXCIkeyB0aGlzLnF1ZXJ5UGFyYW1zLnNvcnQgfVwiOmAsIGUpO1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1zb3J0JywgYEludmFsaWQgc29ydCBwYXJhbWV0ZXIgcHJvdmlkZWQ6IFwiJHsgdGhpcy5xdWVyeVBhcmFtcy5zb3J0IH1cImAsIHsgaGVscGVyTWV0aG9kOiAncGFyc2VKc29uUXVlcnknIH0pO1xuXHRcdH1cblx0fVxuXG5cdGxldCBmaWVsZHM7XG5cdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmZpZWxkcykge1xuXHRcdHRyeSB7XG5cdFx0XHRmaWVsZHMgPSBKU09OLnBhcnNlKHRoaXMucXVlcnlQYXJhbXMuZmllbGRzKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBJbnZhbGlkIGZpZWxkcyBwYXJhbWV0ZXIgcHJvdmlkZWQgXCIkeyB0aGlzLnF1ZXJ5UGFyYW1zLmZpZWxkcyB9XCI6YCwgZSk7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWZpZWxkcycsIGBJbnZhbGlkIGZpZWxkcyBwYXJhbWV0ZXIgcHJvdmlkZWQ6IFwiJHsgdGhpcy5xdWVyeVBhcmFtcy5maWVsZHMgfVwiYCwgeyBoZWxwZXJNZXRob2Q6ICdwYXJzZUpzb25RdWVyeScgfSk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gVmVyaWZ5IHRoZSB1c2VyJ3Mgc2VsZWN0ZWQgZmllbGRzIG9ubHkgY29udGFpbnMgb25lcyB3aGljaCB0aGVpciByb2xlIGFsbG93c1xuXHRpZiAodHlwZW9mIGZpZWxkcyA9PT0gJ29iamVjdCcpIHtcblx0XHRsZXQgbm9uU2VsZWN0YWJsZUZpZWxkcyA9IE9iamVjdC5rZXlzKFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUpO1xuXHRcdGlmICh0aGlzLnJlcXVlc3Qucm91dGUuaW5jbHVkZXMoJy92MS91c2Vycy4nKSkge1xuXHRcdFx0Y29uc3QgZ2V0RmllbGRzID0gKCkgPT4gT2JqZWN0LmtleXMoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1mdWxsLW90aGVyLXVzZXItaW5mbycpID8gUm9ja2V0Q2hhdC5BUEkudjEubGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGVJZklzUHJpdmlsZWdlZFVzZXIgOiBSb2NrZXRDaGF0LkFQSS52MS5saW1pdGVkVXNlckZpZWxkc1RvRXhjbHVkZSk7XG5cdFx0XHRub25TZWxlY3RhYmxlRmllbGRzID0gbm9uU2VsZWN0YWJsZUZpZWxkcy5jb25jYXQoZ2V0RmllbGRzKCkpO1xuXHRcdH1cblxuXHRcdE9iamVjdC5rZXlzKGZpZWxkcykuZm9yRWFjaCgoaykgPT4ge1xuXHRcdFx0aWYgKG5vblNlbGVjdGFibGVGaWVsZHMuaW5jbHVkZXMoaykgfHwgbm9uU2VsZWN0YWJsZUZpZWxkcy5pbmNsdWRlcyhrLnNwbGl0KFJvY2tldENoYXQuQVBJLnYxLmZpZWxkU2VwYXJhdG9yKVswXSkpIHtcblx0XHRcdFx0ZGVsZXRlIGZpZWxkc1trXTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdC8vIExpbWl0IHRoZSBmaWVsZHMgYnkgZGVmYXVsdFxuXHRmaWVsZHMgPSBPYmplY3QuYXNzaWduKHt9LCBmaWVsZHMsIFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUpO1xuXHRpZiAodGhpcy5yZXF1ZXN0LnJvdXRlLmluY2x1ZGVzKCcvdjEvdXNlcnMuJykpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1mdWxsLW90aGVyLXVzZXItaW5mbycpKSB7XG5cdFx0XHRmaWVsZHMgPSBPYmplY3QuYXNzaWduKGZpZWxkcywgUm9ja2V0Q2hhdC5BUEkudjEubGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGVJZklzUHJpdmlsZWdlZFVzZXIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmaWVsZHMgPSBPYmplY3QuYXNzaWduKGZpZWxkcywgUm9ja2V0Q2hhdC5BUEkudjEubGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGUpO1xuXHRcdH1cblx0fVxuXG5cdGxldCBxdWVyeSA9IHt9O1xuXHRpZiAodGhpcy5xdWVyeVBhcmFtcy5xdWVyeSkge1xuXHRcdHRyeSB7XG5cdFx0XHRxdWVyeSA9IEpTT04ucGFyc2UodGhpcy5xdWVyeVBhcmFtcy5xdWVyeSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0dGhpcy5sb2dnZXIud2FybihgSW52YWxpZCBxdWVyeSBwYXJhbWV0ZXIgcHJvdmlkZWQgXCIkeyB0aGlzLnF1ZXJ5UGFyYW1zLnF1ZXJ5IH1cIjpgLCBlKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcXVlcnknLCBgSW52YWxpZCBxdWVyeSBwYXJhbWV0ZXIgcHJvdmlkZWQ6IFwiJHsgdGhpcy5xdWVyeVBhcmFtcy5xdWVyeSB9XCJgLCB7IGhlbHBlck1ldGhvZDogJ3BhcnNlSnNvblF1ZXJ5JyB9KTtcblx0XHR9XG5cdH1cblxuXHQvLyBWZXJpZnkgdGhlIHVzZXIgaGFzIHBlcm1pc3Npb24gdG8gcXVlcnkgdGhlIGZpZWxkcyB0aGV5IGFyZVxuXHRpZiAodHlwZW9mIHF1ZXJ5ID09PSAnb2JqZWN0Jykge1xuXHRcdGxldCBub25RdWVyeWFibGVGaWVsZHMgPSBPYmplY3Qua2V5cyhSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlKTtcblx0XHRpZiAodGhpcy5yZXF1ZXN0LnJvdXRlLmluY2x1ZGVzKCcvdjEvdXNlcnMuJykpIHtcblx0XHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWZ1bGwtb3RoZXItdXNlci1pbmZvJykpIHtcblx0XHRcdFx0bm9uUXVlcnlhYmxlRmllbGRzID0gbm9uUXVlcnlhYmxlRmllbGRzLmNvbmNhdChPYmplY3Qua2V5cyhSb2NrZXRDaGF0LkFQSS52MS5saW1pdGVkVXNlckZpZWxkc1RvRXhjbHVkZUlmSXNQcml2aWxlZ2VkVXNlcikpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9uUXVlcnlhYmxlRmllbGRzID0gbm9uUXVlcnlhYmxlRmllbGRzLmNvbmNhdChPYmplY3Qua2V5cyhSb2NrZXRDaGF0LkFQSS52MS5saW1pdGVkVXNlckZpZWxkc1RvRXhjbHVkZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdE9iamVjdC5rZXlzKHF1ZXJ5KS5mb3JFYWNoKChrKSA9PiB7XG5cdFx0XHRpZiAobm9uUXVlcnlhYmxlRmllbGRzLmluY2x1ZGVzKGspIHx8IG5vblF1ZXJ5YWJsZUZpZWxkcy5pbmNsdWRlcyhrLnNwbGl0KFJvY2tldENoYXQuQVBJLnYxLmZpZWxkU2VwYXJhdG9yKVswXSkpIHtcblx0XHRcdFx0ZGVsZXRlIHF1ZXJ5W2tdO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRzb3J0LFxuXHRcdGZpZWxkcyxcblx0XHRxdWVyeSxcblx0fTtcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ2RlcHJlY2F0aW9uV2FybmluZycsIGZ1bmN0aW9uIF9kZXByZWNhdGlvbldhcm5pbmcoeyBlbmRwb2ludCwgdmVyc2lvbldpbGxCZVJlbW92ZSwgcmVzcG9uc2UgfSkge1xuXHRjb25zdCB3YXJuaW5nTWVzc2FnZSA9IGBUaGUgZW5kcG9pbnQgXCIkeyBlbmRwb2ludCB9XCIgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGFmdGVyIHZlcnNpb24gJHsgdmVyc2lvbldpbGxCZVJlbW92ZSB9YDtcblx0Y29uc29sZS53YXJuKHdhcm5pbmdNZXNzYWdlKTtcblx0aWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHdhcm5pbmc6IHdhcm5pbmdNZXNzYWdlLFxuXHRcdFx0Li4ucmVzcG9uc2UsXG5cdFx0fTtcblx0fVxuXG5cdHJldHVybiByZXNwb25zZTtcbn0pO1xuXG4iLCJSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNldCgnZ2V0TG9nZ2VkSW5Vc2VyJywgZnVuY3Rpb24gX2dldExvZ2dlZEluVXNlcigpIHtcblx0bGV0IHVzZXI7XG5cblx0aWYgKHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LWF1dGgtdG9rZW4nXSAmJiB0aGlzLnJlcXVlc3QuaGVhZGVyc1sneC11c2VyLWlkJ10pIHtcblx0XHR1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7XG5cdFx0XHRfaWQ6IHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LXVzZXItaWQnXSxcblx0XHRcdCdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuaGFzaGVkVG9rZW4nOiBBY2NvdW50cy5faGFzaExvZ2luVG9rZW4odGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtYXV0aC10b2tlbiddKSxcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB1c2VyO1xufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNldCgnaW5zZXJ0VXNlck9iamVjdCcsIGZ1bmN0aW9uIF9hZGRVc2VyVG9PYmplY3QoeyBvYmplY3QsIHVzZXJJZCB9KSB7XG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpO1xuXHRvYmplY3QudXNlciA9IHsgfTtcblx0aWYgKHVzZXIpIHtcblx0XHRvYmplY3QudXNlciA9IHtcblx0XHRcdF9pZDogdXNlcklkLFxuXHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHRuYW1lOiB1c2VyLm5hbWUsXG5cdFx0fTtcblx0fVxuXG5cblx0cmV0dXJuIG9iamVjdDtcbn0pO1xuXG4iLCJSb2NrZXRDaGF0LkFQSS5kZWZhdWx0LmFkZFJvdXRlKCdpbmZvJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldExvZ2dlZEluVXNlcigpO1xuXG5cdFx0aWYgKHVzZXIgJiYgUm9ja2V0Q2hhdC5hdXRoei5oYXNSb2xlKHVzZXIuX2lkLCAnYWRtaW4nKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRpbmZvOiBSb2NrZXRDaGF0LkluZm8sXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR2ZXJzaW9uOiBSb2NrZXRDaGF0LkluZm8udmVyc2lvbixcblx0XHR9KTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbi8vIFJldHVybnMgdGhlIGNoYW5uZWwgSUYgZm91bmQgb3RoZXJ3aXNlIGl0IHdpbGwgcmV0dXJuIHRoZSBmYWlsdXJlIG9mIHdoeSBpdCBkaWRuJ3QuIENoZWNrIHRoZSBgc3RhdHVzQ29kZWAgcHJvcGVydHlcbmZ1bmN0aW9uIGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtcywgY2hlY2tlZEFyY2hpdmVkID0gdHJ1ZSB9KSB7XG5cdGlmICgoIXBhcmFtcy5yb29tSWQgfHwgIXBhcmFtcy5yb29tSWQudHJpbSgpKSAmJiAoIXBhcmFtcy5yb29tTmFtZSB8fCAhcGFyYW1zLnJvb21OYW1lLnRyaW0oKSkpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29taWQtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSBwYXJhbWV0ZXIgXCJyb29tSWRcIiBvciBcInJvb21OYW1lXCIgaXMgcmVxdWlyZWQnKTtcblx0fVxuXG5cdGNvbnN0IGZpZWxkcyA9IHsgLi4uUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9O1xuXG5cdGxldCByb29tO1xuXHRpZiAocGFyYW1zLnJvb21JZCkge1xuXHRcdHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChwYXJhbXMucm9vbUlkLCB7IGZpZWxkcyB9KTtcblx0fSBlbHNlIGlmIChwYXJhbXMucm9vbU5hbWUpIHtcblx0XHRyb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShwYXJhbXMucm9vbU5hbWUsIHsgZmllbGRzIH0pO1xuXHR9XG5cblx0aWYgKCFyb29tIHx8IHJvb20udCAhPT0gJ2MnKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1ub3QtZm91bmQnLCAnVGhlIHJlcXVpcmVkIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIHBhcmFtIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIGFueSBjaGFubmVsJyk7XG5cdH1cblxuXHRpZiAoY2hlY2tlZEFyY2hpdmVkICYmIHJvb20uYXJjaGl2ZWQpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLWFyY2hpdmVkJywgYFRoZSBjaGFubmVsLCAkeyByb29tLm5hbWUgfSwgaXMgYXJjaGl2ZWRgKTtcblx0fVxuXG5cdHJldHVybiByb29tO1xufVxuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuYWRkQWxsJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2FkZEFsbFVzZXJUb1Jvb20nLCBmaW5kUmVzdWx0Ll9pZCwgdGhpcy5ib2R5UGFyYW1zLmFjdGl2ZVVzZXJzT25seSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmFkZE1vZGVyYXRvcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkUm9vbU1vZGVyYXRvcicsIGZpbmRSZXN1bHQuX2lkLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5hZGRPd25lcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkUm9vbU93bmVyJywgZmluZFJlc3VsdC5faWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmFyY2hpdmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYXJjaGl2ZVJvb20nLCBmaW5kUmVzdWx0Ll9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5jbG9zZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGNvbnN0IHN1YiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKGZpbmRSZXN1bHQuX2lkLCB0aGlzLnVzZXJJZCk7XG5cblx0XHRpZiAoIXN1Yikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYFRoZSB1c2VyL2NhbGxlZSBpcyBub3QgaW4gdGhlIGNoYW5uZWwgXCIkeyBmaW5kUmVzdWx0Lm5hbWUgfS5gKTtcblx0XHR9XG5cblx0XHRpZiAoIXN1Yi5vcGVuKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShgVGhlIGNoYW5uZWwsICR7IGZpbmRSZXN1bHQubmFtZSB9LCBpcyBhbHJlYWR5IGNsb3NlZCB0byB0aGUgc2VuZGVyYCk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2hpZGVSb29tJywgZmluZFJlc3VsdC5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuY291bnRlcnMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBhY2Nlc3MgPSBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXJvb20tYWRtaW5pc3RyYXRpb24nKTtcblx0XHRjb25zdCB7IHVzZXJJZCB9ID0gdGhpcy5yZXF1ZXN0UGFyYW1zKCk7XG5cdFx0bGV0IHVzZXIgPSB0aGlzLnVzZXJJZDtcblx0XHRsZXQgdW5yZWFkcyA9IG51bGw7XG5cdFx0bGV0IHVzZXJNZW50aW9ucyA9IG51bGw7XG5cdFx0bGV0IHVucmVhZHNGcm9tID0gbnVsbDtcblx0XHRsZXQgam9pbmVkID0gZmFsc2U7XG5cdFx0bGV0IG1zZ3MgPSBudWxsO1xuXHRcdGxldCBsYXRlc3QgPSBudWxsO1xuXHRcdGxldCBtZW1iZXJzID0gbnVsbDtcblxuXHRcdGlmICh1c2VySWQpIHtcblx0XHRcdGlmICghYWNjZXNzKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHRcdH1cblx0XHRcdHVzZXIgPSB1c2VySWQ7XG5cdFx0fVxuXHRcdGNvbnN0IHJvb20gPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoe1xuXHRcdFx0cGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSxcblx0XHRcdHJldHVyblVzZXJuYW1lczogdHJ1ZSxcblx0XHR9KTtcblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb29tLl9pZCwgdXNlcik7XG5cdFx0Y29uc3QgbG0gPSByb29tLmxtID8gcm9vbS5sbSA6IHJvb20uX3VwZGF0ZWRBdDtcblxuXHRcdGlmICh0eXBlb2Ygc3Vic2NyaXB0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBzdWJzY3JpcHRpb24ub3Blbikge1xuXHRcdFx0dW5yZWFkcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNvdW50VmlzaWJsZUJ5Um9vbUlkQmV0d2VlblRpbWVzdGFtcHNJbmNsdXNpdmUoc3Vic2NyaXB0aW9uLnJpZCwgc3Vic2NyaXB0aW9uLmxzLCBsbSk7XG5cdFx0XHR1bnJlYWRzRnJvbSA9IHN1YnNjcmlwdGlvbi5scyB8fCBzdWJzY3JpcHRpb24udHM7XG5cdFx0XHR1c2VyTWVudGlvbnMgPSBzdWJzY3JpcHRpb24udXNlck1lbnRpb25zO1xuXHRcdFx0am9pbmVkID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoYWNjZXNzIHx8IGpvaW5lZCkge1xuXHRcdFx0bXNncyA9IHJvb20ubXNncztcblx0XHRcdGxhdGVzdCA9IGxtO1xuXHRcdFx0bWVtYmVycyA9IHJvb20udXNlcnNDb3VudDtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRqb2luZWQsXG5cdFx0XHRtZW1iZXJzLFxuXHRcdFx0dW5yZWFkcyxcblx0XHRcdHVucmVhZHNGcm9tLFxuXHRcdFx0bXNncyxcblx0XHRcdGxhdGVzdCxcblx0XHRcdHVzZXJNZW50aW9ucyxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG4vLyBDaGFubmVsIC0+IGNyZWF0ZVxuXG5mdW5jdGlvbiBjcmVhdGVDaGFubmVsVmFsaWRhdG9yKHBhcmFtcykge1xuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihwYXJhbXMudXNlci52YWx1ZSwgJ2NyZWF0ZS1jJykpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ3VuYXV0aG9yaXplZCcpO1xuXHR9XG5cblx0aWYgKCFwYXJhbXMubmFtZSB8fCAhcGFyYW1zLm5hbWUudmFsdWUpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYFBhcmFtIFwiJHsgcGFyYW1zLm5hbWUua2V5IH1cIiBpcyByZXF1aXJlZGApO1xuXHR9XG5cblx0aWYgKHBhcmFtcy5tZW1iZXJzICYmIHBhcmFtcy5tZW1iZXJzLnZhbHVlICYmICFfLmlzQXJyYXkocGFyYW1zLm1lbWJlcnMudmFsdWUpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBQYXJhbSBcIiR7IHBhcmFtcy5tZW1iZXJzLmtleSB9XCIgbXVzdCBiZSBhbiBhcnJheSBpZiBwcm92aWRlZGApO1xuXHR9XG5cblx0aWYgKHBhcmFtcy5jdXN0b21GaWVsZHMgJiYgcGFyYW1zLmN1c3RvbUZpZWxkcy52YWx1ZSAmJiAhKHR5cGVvZiBwYXJhbXMuY3VzdG9tRmllbGRzLnZhbHVlID09PSAnb2JqZWN0JykpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYFBhcmFtIFwiJHsgcGFyYW1zLmN1c3RvbUZpZWxkcy5rZXkgfVwiIG11c3QgYmUgYW4gb2JqZWN0IGlmIHByb3ZpZGVkYCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2hhbm5lbCh1c2VySWQsIHBhcmFtcykge1xuXHRjb25zdCByZWFkT25seSA9IHR5cGVvZiBwYXJhbXMucmVhZE9ubHkgIT09ICd1bmRlZmluZWQnID8gcGFyYW1zLnJlYWRPbmx5IDogZmFsc2U7XG5cblx0bGV0IGlkO1xuXHRNZXRlb3IucnVuQXNVc2VyKHVzZXJJZCwgKCkgPT4ge1xuXHRcdGlkID0gTWV0ZW9yLmNhbGwoJ2NyZWF0ZUNoYW5uZWwnLCBwYXJhbXMubmFtZSwgcGFyYW1zLm1lbWJlcnMgPyBwYXJhbXMubWVtYmVycyA6IFtdLCByZWFkT25seSwgcGFyYW1zLmN1c3RvbUZpZWxkcyk7XG5cdH0pO1xuXG5cdHJldHVybiB7XG5cdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoaWQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0fTtcbn1cblxuUm9ja2V0Q2hhdC5BUEkuY2hhbm5lbHMgPSB7fTtcblJvY2tldENoYXQuQVBJLmNoYW5uZWxzLmNyZWF0ZSA9IHtcblx0dmFsaWRhdGU6IGNyZWF0ZUNoYW5uZWxWYWxpZGF0b3IsXG5cdGV4ZWN1dGU6IGNyZWF0ZUNoYW5uZWwsXG59O1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuY3JlYXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgdXNlcklkLCBib2R5UGFyYW1zIH0gPSB0aGlzO1xuXG5cdFx0bGV0IGVycm9yO1xuXG5cdFx0dHJ5IHtcblx0XHRcdFJvY2tldENoYXQuQVBJLmNoYW5uZWxzLmNyZWF0ZS52YWxpZGF0ZSh7XG5cdFx0XHRcdHVzZXI6IHtcblx0XHRcdFx0XHR2YWx1ZTogdXNlcklkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRuYW1lOiB7XG5cdFx0XHRcdFx0dmFsdWU6IGJvZHlQYXJhbXMubmFtZSxcblx0XHRcdFx0XHRrZXk6ICduYW1lJyxcblx0XHRcdFx0fSxcblx0XHRcdFx0bWVtYmVyczoge1xuXHRcdFx0XHRcdHZhbHVlOiBib2R5UGFyYW1zLm1lbWJlcnMsXG5cdFx0XHRcdFx0a2V5OiAnbWVtYmVycycsXG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRpZiAoZS5tZXNzYWdlID09PSAndW5hdXRob3JpemVkJykge1xuXHRcdFx0XHRlcnJvciA9IFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZXJyb3IgPSBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUubWVzc2FnZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRyZXR1cm4gZXJyb3I7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoUm9ja2V0Q2hhdC5BUEkuY2hhbm5lbHMuY3JlYXRlLmV4ZWN1dGUodXNlcklkLCBib2R5UGFyYW1zKSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmRlbGV0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdlcmFzZVJvb20nLCBmaW5kUmVzdWx0Ll9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBmaW5kUmVzdWx0LFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5maWxlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXHRcdGNvbnN0IGFkZFVzZXJPYmplY3RUb0V2ZXJ5T2JqZWN0ID0gKGZpbGUpID0+IHtcblx0XHRcdGlmIChmaWxlLnVzZXJJZCkge1xuXHRcdFx0XHRmaWxlID0gdGhpcy5pbnNlcnRVc2VyT2JqZWN0KHsgb2JqZWN0OiBmaWxlLCB1c2VySWQ6IGZpbGUudXNlcklkIH0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZpbGU7XG5cdFx0fTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdjYW5BY2Nlc3NSb29tJywgZmluZFJlc3VsdC5faWQsIHRoaXMudXNlcklkKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgcmlkOiBmaW5kUmVzdWx0Ll9pZCB9KTtcblxuXHRcdGNvbnN0IGZpbGVzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRmaWxlczogZmlsZXMubWFwKGFkZFVzZXJPYmplY3RUb0V2ZXJ5T2JqZWN0KSxcblx0XHRcdGNvdW50OlxuXHRcdFx0ZmlsZXMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMuZmluZChvdXJRdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuZ2V0SW50ZWdyYXRpb25zJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGxldCBpbmNsdWRlQWxsUHVibGljQ2hhbm5lbHMgPSB0cnVlO1xuXHRcdGlmICh0eXBlb2YgdGhpcy5xdWVyeVBhcmFtcy5pbmNsdWRlQWxsUHVibGljQ2hhbm5lbHMgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRpbmNsdWRlQWxsUHVibGljQ2hhbm5lbHMgPSB0aGlzLnF1ZXJ5UGFyYW1zLmluY2x1ZGVBbGxQdWJsaWNDaGFubmVscyA9PT0gJ3RydWUnO1xuXHRcdH1cblxuXHRcdGxldCBvdXJRdWVyeSA9IHtcblx0XHRcdGNoYW5uZWw6IGAjJHsgZmluZFJlc3VsdC5uYW1lIH1gLFxuXHRcdH07XG5cblx0XHRpZiAoaW5jbHVkZUFsbFB1YmxpY0NoYW5uZWxzKSB7XG5cdFx0XHRvdXJRdWVyeS5jaGFubmVsID0ge1xuXHRcdFx0XHQkaW46IFtvdXJRdWVyeS5jaGFubmVsLCAnYWxsX3B1YmxpY19jaGFubmVscyddLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCBvdXJRdWVyeSk7XG5cblx0XHRjb25zdCBpbnRlZ3JhdGlvbnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IF9jcmVhdGVkQXQ6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0aW50ZWdyYXRpb25zLFxuXHRcdFx0Y291bnQ6IGludGVncmF0aW9ucy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmQob3VyUXVlcnkpLmNvdW50KCksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmhpc3RvcnknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGxldCBsYXRlc3REYXRlID0gbmV3IERhdGUoKTtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5sYXRlc3QpIHtcblx0XHRcdGxhdGVzdERhdGUgPSBuZXcgRGF0ZSh0aGlzLnF1ZXJ5UGFyYW1zLmxhdGVzdCk7XG5cdFx0fVxuXG5cdFx0bGV0IG9sZGVzdERhdGUgPSB1bmRlZmluZWQ7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMub2xkZXN0KSB7XG5cdFx0XHRvbGRlc3REYXRlID0gbmV3IERhdGUodGhpcy5xdWVyeVBhcmFtcy5vbGRlc3QpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGluY2x1c2l2ZSA9IHRoaXMucXVlcnlQYXJhbXMuaW5jbHVzaXZlIHx8IGZhbHNlO1xuXG5cdFx0bGV0IGNvdW50ID0gMjA7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMuY291bnQpIHtcblx0XHRcdGNvdW50ID0gcGFyc2VJbnQodGhpcy5xdWVyeVBhcmFtcy5jb3VudCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdW5yZWFkcyA9IHRoaXMucXVlcnlQYXJhbXMudW5yZWFkcyB8fCBmYWxzZTtcblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0cmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ2dldENoYW5uZWxIaXN0b3J5Jywge1xuXHRcdFx0XHRyaWQ6IGZpbmRSZXN1bHQuX2lkLFxuXHRcdFx0XHRsYXRlc3Q6IGxhdGVzdERhdGUsXG5cdFx0XHRcdG9sZGVzdDogb2xkZXN0RGF0ZSxcblx0XHRcdFx0aW5jbHVzaXZlLFxuXHRcdFx0XHRjb3VudCxcblx0XHRcdFx0dW5yZWFkcyxcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhyZXN1bHQpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5pbmZvJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmludml0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkVXNlclRvUm9vbScsIHsgcmlkOiBmaW5kUmVzdWx0Ll9pZCwgdXNlcm5hbWU6IHVzZXIudXNlcm5hbWUgfSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmpvaW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnam9pblJvb20nLCBmaW5kUmVzdWx0Ll9pZCwgdGhpcy5ib2R5UGFyYW1zLmpvaW5Db2RlKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMua2ljaycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgncmVtb3ZlVXNlckZyb21Sb29tJywgeyByaWQ6IGZpbmRSZXN1bHQuX2lkLCB1c2VybmFtZTogdXNlci51c2VybmFtZSB9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMubGVhdmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnbGVhdmVSb29tJywgZmluZFJlc3VsdC5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5saXN0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQ6IHtcblx0XHQvLyBUaGlzIGlzIGRlZmluZWQgYXMgc3VjaCBvbmx5IHRvIHByb3ZpZGUgYW4gZXhhbXBsZSBvZiBob3cgdGhlIHJvdXRlcyBjYW4gYmUgZGVmaW5lZCA6WFxuXHRcdGFjdGlvbigpIHtcblx0XHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXHRcdFx0Y29uc3QgaGFzUGVybWlzc2lvblRvU2VlQWxsUHVibGljQ2hhbm5lbHMgPSBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWMtcm9vbScpO1xuXG5cdFx0XHRjb25zdCBvdXJRdWVyeSA9IHsgLi4ucXVlcnksIHQ6ICdjJyB9O1xuXG5cdFx0XHRpZiAoIWhhc1Blcm1pc3Npb25Ub1NlZUFsbFB1YmxpY0NoYW5uZWxzKSB7XG5cdFx0XHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1qb2luZWQtcm9vbScpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IHJvb21JZHMgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVVzZXJJZEFuZFR5cGUodGhpcy51c2VySWQsICdjJywgeyBmaWVsZHM6IHsgcmlkOiAxIH0gfSkuZmV0Y2goKS5tYXAoKHMpID0+IHMucmlkKTtcblx0XHRcdFx0b3VyUXVlcnkuX2lkID0geyAkaW46IHJvb21JZHMgfTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdFx0ZmllbGRzLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHRvdGFsID0gY3Vyc29yLmNvdW50KCk7XG5cblx0XHRcdGNvbnN0IHJvb21zID0gY3Vyc29yLmZldGNoKCk7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0Y2hhbm5lbHM6IHJvb21zLFxuXHRcdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0XHRvZmZzZXQsXG5cdFx0XHRcdHRvdGFsLFxuXHRcdFx0fSk7XG5cdFx0fSxcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMubGlzdC5qb2luZWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdC8vIFRPRE86IENBQ0hFOiBBZGQgQnJlYWNraW5nIG5vdGljZSBzaW5jZSB3ZSByZW1vdmVkIHRoZSBxdWVyeSBwYXJhbVxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRCeVN1YnNjcmlwdGlvblR5cGVBbmRVc2VySWQoJ2MnLCB0aGlzLnVzZXJJZCwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHRvdGFsQ291bnQgPSBjdXJzb3IuY291bnQoKTtcblx0XHRjb25zdCByb29tcyA9IGN1cnNvci5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbHM6IHJvb21zLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0Y291bnQ6IHJvb21zLmxlbmd0aCxcblx0XHRcdHRvdGFsOiB0b3RhbENvdW50LFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5tZW1iZXJzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7XG5cdFx0XHRwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLFxuXHRcdFx0Y2hlY2tlZEFyY2hpdmVkOiBmYWxzZSxcblx0XHR9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0LmJyb2FkY2FzdCAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1icm9hZGNhc3QtbWVtYmVyLWxpc3QnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQgPSB7fSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9ucyA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5Um9vbUlkKGZpbmRSZXN1bHQuX2lkLCB7XG5cdFx0XHRmaWVsZHM6IHsgJ3UuX2lkJzogMSB9LFxuXHRcdFx0c29ydDogeyAndS51c2VybmFtZSc6IHNvcnQudXNlcm5hbWUgIT0gbnVsbCA/IHNvcnQudXNlcm5hbWUgOiAxIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0fSk7XG5cblx0XHRjb25zdCB0b3RhbCA9IHN1YnNjcmlwdGlvbnMuY291bnQoKTtcblxuXHRcdGNvbnN0IG1lbWJlcnMgPSBzdWJzY3JpcHRpb25zLmZldGNoKCkubWFwKChzKSA9PiBzLnUgJiYgcy51Ll9pZCk7XG5cblx0XHRjb25zdCB1c2VycyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmQoeyBfaWQ6IHsgJGluOiBtZW1iZXJzIH0gfSwge1xuXHRcdFx0ZmllbGRzOiB7IF9pZDogMSwgdXNlcm5hbWU6IDEsIG5hbWU6IDEsIHN0YXR1czogMSwgdXRjT2Zmc2V0OiAxIH0sXG5cdFx0XHRzb3J0OiB7IHVzZXJuYW1lOiAgc29ydC51c2VybmFtZSAhPSBudWxsID8gc29ydC51c2VybmFtZSA6IDEgfSxcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVtYmVyczogdXNlcnMsXG5cdFx0XHRjb3VudDogdXNlcnMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWwsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLm1lc3NhZ2VzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7XG5cdFx0XHRwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLFxuXHRcdFx0Y2hlY2tlZEFyY2hpdmVkOiBmYWxzZSxcblx0XHR9KTtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHJpZDogZmluZFJlc3VsdC5faWQgfSk7XG5cblx0XHQvLyBTcGVjaWFsIGNoZWNrIGZvciB0aGUgcGVybWlzc2lvbnNcblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1qb2luZWQtcm9vbScpICYmICFSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChmaW5kUmVzdWx0Ll9pZCwgdGhpcy51c2VySWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1jLXJvb20nKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogLTEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHRvdGFsID0gY3Vyc29yLmNvdW50KCk7XG5cdFx0Y29uc3QgbWVzc2FnZXMgPSBjdXJzb3IuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lc3NhZ2VzLFxuXHRcdFx0Y291bnQ6IG1lc3NhZ2VzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsLFxuXHRcdH0pO1xuXHR9LFxufSk7XG4vLyBUT0RPOiBDQUNIRTogSSBkb250IGxpa2UgdGhpcyBtZXRob2QoIGZ1bmN0aW9uYWxpdHkgYW5kIGhvdyB3ZSBpbXBsZW1lbnRlZCApIGl0cyB2ZXJ5IGV4cGVuc2l2ZVxuLy8gVE9ETyBjaGVjayBpZiB0aGlzIGNvZGUgaXMgYmV0dGVyIG9yIG5vdFxuLy8gUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLm9ubGluZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcbi8vIFx0Z2V0KCkge1xuLy8gXHRcdGNvbnN0IHsgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcbi8vIFx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHQ6ICdjJyB9KTtcblxuLy8gXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lKG91clF1ZXJ5KTtcblxuLy8gXHRcdGlmIChyb29tID09IG51bGwpIHtcbi8vIFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdDaGFubmVsIGRvZXMgbm90IGV4aXN0cycpO1xuLy8gXHRcdH1cblxuLy8gXHRcdGNvbnN0IGlkcyA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZCh7IHJpZDogcm9vbS5faWQgfSwgeyBmaWVsZHM6IHsgJ3UuX2lkJzogMSB9IH0pLmZldGNoKCkubWFwKHN1YiA9PiBzdWIudS5faWQpO1xuXG4vLyBcdFx0Y29uc3Qgb25saW5lID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh7XG4vLyBcdFx0XHR1c2VybmFtZTogeyAkZXhpc3RzOiAxIH0sXG4vLyBcdFx0XHRfaWQ6IHsgJGluOiBpZHMgfSxcbi8vIFx0XHRcdHN0YXR1czogeyAkaW46IFsnb25saW5lJywgJ2F3YXknLCAnYnVzeSddIH1cbi8vIFx0XHR9LCB7XG4vLyBcdFx0XHRmaWVsZHM6IHsgdXNlcm5hbWU6IDEgfVxuLy8gXHRcdH0pLmZldGNoKCk7XG5cbi8vIFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG4vLyBcdFx0XHRvbmxpbmVcbi8vIFx0XHR9KTtcbi8vIFx0fVxuLy8gfSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5vbmxpbmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyB0OiAnYycgfSk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZShvdXJRdWVyeSk7XG5cblx0XHRpZiAocm9vbSA9PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnQ2hhbm5lbCBkb2VzIG5vdCBleGlzdHMnKTtcblx0XHR9XG5cblx0XHRjb25zdCBvbmxpbmUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kVXNlcnNOb3RPZmZsaW5lKHtcblx0XHRcdGZpZWxkczogeyB1c2VybmFtZTogMSB9LFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRjb25zdCBvbmxpbmVJblJvb20gPSBbXTtcblx0XHRvbmxpbmUuZm9yRWFjaCgodXNlcikgPT4ge1xuXHRcdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vdC5faWQsIHVzZXIuX2lkLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblx0XHRcdGlmIChzdWJzY3JpcHRpb24pIHtcblx0XHRcdFx0b25saW5lSW5Sb29tLnB1c2goe1xuXHRcdFx0XHRcdF9pZDogdXNlci5faWQsXG5cdFx0XHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0b25saW5lOiBvbmxpbmVJblJvb20sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLm9wZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRjb25zdCBzdWIgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChmaW5kUmVzdWx0Ll9pZCwgdGhpcy51c2VySWQpO1xuXG5cdFx0aWYgKCFzdWIpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgdXNlci9jYWxsZWUgaXMgbm90IGluIHRoZSBjaGFubmVsIFwiJHsgZmluZFJlc3VsdC5uYW1lIH1cIi5gKTtcblx0XHR9XG5cblx0XHRpZiAoc3ViLm9wZW4pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgY2hhbm5lbCwgJHsgZmluZFJlc3VsdC5uYW1lIH0sIGlzIGFscmVhZHkgb3BlbiB0byB0aGUgc2VuZGVyYCk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ29wZW5Sb29tJywgZmluZFJlc3VsdC5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMucmVtb3ZlTW9kZXJhdG9yJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdyZW1vdmVSb29tTW9kZXJhdG9yJywgZmluZFJlc3VsdC5faWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnJlbW92ZU93bmVyJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdyZW1vdmVSb29tT3duZXInLCBmaW5kUmVzdWx0Ll9pZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMucmVuYW1lJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm5hbWUgfHwgIXRoaXMuYm9keVBhcmFtcy5uYW1lLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJuYW1lXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB7IHJvb21JZDogdGhpcy5ib2R5UGFyYW1zLnJvb21JZCB9IH0pO1xuXG5cdFx0aWYgKGZpbmRSZXN1bHQubmFtZSA9PT0gdGhpcy5ib2R5UGFyYW1zLm5hbWUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgY2hhbm5lbCBuYW1lIGlzIHRoZSBzYW1lIGFzIHdoYXQgaXQgd291bGQgYmUgcmVuYW1lZCB0by4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAncm9vbU5hbWUnLCB0aGlzLmJvZHlQYXJhbXMubmFtZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnNldEN1c3RvbUZpZWxkcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMgfHwgISh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcyA9PT0gJ29iamVjdCcpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcImN1c3RvbUZpZWxkc1wiIGlzIHJlcXVpcmVkIHdpdGggYSB0eXBlIGxpa2Ugb2JqZWN0LicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0Ll9pZCwgJ3Jvb21DdXN0b21GaWVsZHMnLCB0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0RGVmYXVsdCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5kZWZhdWx0ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJkZWZhdWx0XCIgaXMgcmVxdWlyZWQnLCAnZXJyb3ItY2hhbm5lbHMtc2V0ZGVmYXVsdC1pcy1zYW1lJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC5kZWZhdWx0ID09PSB0aGlzLmJvZHlQYXJhbXMuZGVmYXVsdCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBjaGFubmVsIGRlZmF1bHQgc2V0dGluZyBpcyB0aGUgc2FtZSBhcyB3aGF0IGl0IHdvdWxkIGJlIGNoYW5nZWQgdG8uJywgJ2Vycm9yLWNoYW5uZWxzLXNldGRlZmF1bHQtbWlzc2luZy1kZWZhdWx0LXBhcmFtJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0Ll9pZCwgJ2RlZmF1bHQnLCB0aGlzLmJvZHlQYXJhbXMuZGVmYXVsdC50b1N0cmluZygpKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0RGVzY3JpcHRpb24nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb24gfHwgIXRoaXMuYm9keVBhcmFtcy5kZXNjcmlwdGlvbi50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwiZGVzY3JpcHRpb25cIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0aWYgKGZpbmRSZXN1bHQuZGVzY3JpcHRpb24gPT09IHRoaXMuYm9keVBhcmFtcy5kZXNjcmlwdGlvbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBjaGFubmVsIGRlc2NyaXB0aW9uIGlzIHRoZSBzYW1lIGFzIHdoYXQgaXQgd291bGQgYmUgY2hhbmdlZCB0by4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAncm9vbURlc2NyaXB0aW9uJywgdGhpcy5ib2R5UGFyYW1zLmRlc2NyaXB0aW9uKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGRlc2NyaXB0aW9uOiB0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb24sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnNldEpvaW5Db2RlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLmpvaW5Db2RlIHx8ICF0aGlzLmJvZHlQYXJhbXMuam9pbkNvZGUudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcImpvaW5Db2RlXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdqb2luQ29kZScsIHRoaXMuYm9keVBhcmFtcy5qb2luQ29kZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnNldFB1cnBvc2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMucHVycG9zZSB8fCAhdGhpcy5ib2R5UGFyYW1zLnB1cnBvc2UudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcInB1cnBvc2VcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0aWYgKGZpbmRSZXN1bHQuZGVzY3JpcHRpb24gPT09IHRoaXMuYm9keVBhcmFtcy5wdXJwb3NlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNoYW5uZWwgcHVycG9zZSAoZGVzY3JpcHRpb24pIGlzIHRoZSBzYW1lIGFzIHdoYXQgaXQgd291bGQgYmUgY2hhbmdlZCB0by4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAncm9vbURlc2NyaXB0aW9uJywgdGhpcy5ib2R5UGFyYW1zLnB1cnBvc2UpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cHVycG9zZTogdGhpcy5ib2R5UGFyYW1zLnB1cnBvc2UsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnNldFJlYWRPbmx5JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJyZWFkT25seVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC5ybyA9PT0gdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNoYW5uZWwgcmVhZCBvbmx5IHNldHRpbmcgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyZWFkT25seScsIHRoaXMuYm9keVBhcmFtcy5yZWFkT25seSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnNldFRvcGljJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLnRvcGljIHx8ICF0aGlzLmJvZHlQYXJhbXMudG9waWMudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcInRvcGljXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0LnRvcGljID09PSB0aGlzLmJvZHlQYXJhbXMudG9waWMpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgY2hhbm5lbCB0b3BpYyBpcyB0aGUgc2FtZSBhcyB3aGF0IGl0IHdvdWxkIGJlIGNoYW5nZWQgdG8uJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0Ll9pZCwgJ3Jvb21Ub3BpYycsIHRoaXMuYm9keVBhcmFtcy50b3BpYyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR0b3BpYzogdGhpcy5ib2R5UGFyYW1zLnRvcGljLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5zZXRBbm5vdW5jZW1lbnQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuYW5ub3VuY2VtZW50IHx8ICF0aGlzLmJvZHlQYXJhbXMuYW5ub3VuY2VtZW50LnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJhbm5vdW5jZW1lbnRcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0Ll9pZCwgJ3Jvb21Bbm5vdW5jZW1lbnQnLCB0aGlzLmJvZHlQYXJhbXMuYW5ub3VuY2VtZW50KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGFubm91bmNlbWVudDogdGhpcy5ib2R5UGFyYW1zLmFubm91bmNlbWVudCxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0VHlwZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50eXBlIHx8ICF0aGlzLmJvZHlQYXJhbXMudHlwZS50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwidHlwZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC50ID09PSB0aGlzLmJvZHlQYXJhbXMudHlwZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBjaGFubmVsIHR5cGUgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyb29tVHlwZScsIHRoaXMuYm9keVBhcmFtcy50eXBlKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMudW5hcmNoaXZlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0aWYgKCFmaW5kUmVzdWx0LmFyY2hpdmVkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShgVGhlIGNoYW5uZWwsICR7IGZpbmRSZXN1bHQubmFtZSB9LCBpcyBub3QgYXJjaGl2ZWRgKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgndW5hcmNoaXZlUm9vbScsIGZpbmRSZXN1bHQuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmdldEFsbFVzZXJNZW50aW9uc0J5Q2hhbm5lbCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgcm9vbUlkIH0gPSB0aGlzLnJlcXVlc3RQYXJhbXMoKTtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRpZiAoIXJvb21JZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByZXF1ZXN0IHBhcmFtIFwicm9vbUlkXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBtZW50aW9ucyA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdnZXRVc2VyTWVudGlvbnNCeUNoYW5uZWwnLCB7XG5cdFx0XHRyb29tSWQsXG5cdFx0XHRvcHRpb25zOiB7XG5cdFx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogMSB9LFxuXHRcdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdH0sXG5cdFx0fSkpO1xuXG5cdFx0Y29uc3QgYWxsTWVudGlvbnMgPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnZ2V0VXNlck1lbnRpb25zQnlDaGFubmVsJywge1xuXHRcdFx0cm9vbUlkLFxuXHRcdFx0b3B0aW9uczoge30sXG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVudGlvbnMsXG5cdFx0XHRjb3VudDogbWVudGlvbnMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IGFsbE1lbnRpb25zLmxlbmd0aCxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMucm9sZXMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGNvbnN0IHJvbGVzID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2dldFJvb21Sb2xlcycsIGZpbmRSZXN1bHQuX2lkKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRyb2xlcyxcblx0XHR9KTtcblx0fSxcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3JvbGVzLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCByb2xlcyA9IFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmZpbmQoe30sIHsgZmllbGRzOiB7IF91cGRhdGVkQXQ6IDAgfSB9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyByb2xlcyB9KTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IEJ1c2JveSBmcm9tICdidXNib3knO1xuXG5mdW5jdGlvbiBmaW5kUm9vbUJ5SWRPck5hbWUoeyBwYXJhbXMsIGNoZWNrZWRBcmNoaXZlZCA9IHRydWUgfSkge1xuXHRpZiAoKCFwYXJhbXMucm9vbUlkIHx8ICFwYXJhbXMucm9vbUlkLnRyaW0oKSkgJiYgKCFwYXJhbXMucm9vbU5hbWUgfHwgIXBhcmFtcy5yb29tTmFtZS50cmltKCkpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcGFyYW1ldGVyIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIGlzIHJlcXVpcmVkJyk7XG5cdH1cblxuXHRjb25zdCBmaWVsZHMgPSB7IC4uLlJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfTtcblxuXHRsZXQgcm9vbTtcblx0aWYgKHBhcmFtcy5yb29tSWQpIHtcblx0XHRyb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocGFyYW1zLnJvb21JZCwgeyBmaWVsZHMgfSk7XG5cdH0gZWxzZSBpZiAocGFyYW1zLnJvb21OYW1lKSB7XG5cdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUocGFyYW1zLnJvb21OYW1lLCB7IGZpZWxkcyB9KTtcblx0fVxuXHRpZiAoIXJvb20pIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLW5vdC1mb3VuZCcsICdUaGUgcmVxdWlyZWQgXCJyb29tSWRcIiBvciBcInJvb21OYW1lXCIgcGFyYW0gcHJvdmlkZWQgZG9lcyBub3QgbWF0Y2ggYW55IGNoYW5uZWwnKTtcblx0fVxuXHRpZiAoY2hlY2tlZEFyY2hpdmVkICYmIHJvb20uYXJjaGl2ZWQpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLWFyY2hpdmVkJywgYFRoZSBjaGFubmVsLCAkeyByb29tLm5hbWUgfSwgaXMgYXJjaGl2ZWRgKTtcblx0fVxuXG5cdHJldHVybiByb29tO1xufVxuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncm9vbXMuZ2V0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyB1cGRhdGVkU2luY2UgfSA9IHRoaXMucXVlcnlQYXJhbXM7XG5cblx0XHRsZXQgdXBkYXRlZFNpbmNlRGF0ZTtcblx0XHRpZiAodXBkYXRlZFNpbmNlKSB7XG5cdFx0XHRpZiAoaXNOYU4oRGF0ZS5wYXJzZSh1cGRhdGVkU2luY2UpKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci11cGRhdGVkU2luY2UtcGFyYW0taW52YWxpZCcsICdUaGUgXCJ1cGRhdGVkU2luY2VcIiBxdWVyeSBwYXJhbWV0ZXIgbXVzdCBiZSBhIHZhbGlkIGRhdGUuJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1cGRhdGVkU2luY2VEYXRlID0gbmV3IERhdGUodXBkYXRlZFNpbmNlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHJlc3VsdCA9IE1ldGVvci5jYWxsKCdyb29tcy9nZXQnLCB1cGRhdGVkU2luY2VEYXRlKSk7XG5cblx0XHRpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG5cdFx0XHRyZXN1bHQgPSB7XG5cdFx0XHRcdHVwZGF0ZTogcmVzdWx0LFxuXHRcdFx0XHRyZW1vdmU6IFtdLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhyZXN1bHQpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdyb29tcy51cGxvYWQvOnJpZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCByb29tID0gTWV0ZW9yLmNhbGwoJ2NhbkFjY2Vzc1Jvb20nLCB0aGlzLnVybFBhcmFtcy5yaWQsIHRoaXMudXNlcklkKTtcblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGJ1c2JveSA9IG5ldyBCdXNib3koeyBoZWFkZXJzOiB0aGlzLnJlcXVlc3QuaGVhZGVycyB9KTtcblx0XHRjb25zdCBmaWxlcyA9IFtdO1xuXHRcdGNvbnN0IGZpZWxkcyA9IHt9O1xuXG5cdFx0TWV0ZW9yLndyYXBBc3luYygoY2FsbGJhY2spID0+IHtcblx0XHRcdGJ1c2JveS5vbignZmlsZScsIChmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUpID0+IHtcblx0XHRcdFx0aWYgKGZpZWxkbmFtZSAhPT0gJ2ZpbGUnKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZpbGVzLnB1c2gobmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1maWVsZCcpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGZpbGVEYXRlID0gW107XG5cdFx0XHRcdGZpbGUub24oJ2RhdGEnLCAoZGF0YSkgPT4gZmlsZURhdGUucHVzaChkYXRhKSk7XG5cblx0XHRcdFx0ZmlsZS5vbignZW5kJywgKCkgPT4ge1xuXHRcdFx0XHRcdGZpbGVzLnB1c2goeyBmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUsIGZpbGVCdWZmZXI6IEJ1ZmZlci5jb25jYXQoZmlsZURhdGUpIH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHRidXNib3kub24oJ2ZpZWxkJywgKGZpZWxkbmFtZSwgdmFsdWUpID0+IGZpZWxkc1tmaWVsZG5hbWVdID0gdmFsdWUpO1xuXG5cdFx0XHRidXNib3kub24oJ2ZpbmlzaCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4gY2FsbGJhY2soKSkpO1xuXG5cdFx0XHR0aGlzLnJlcXVlc3QucGlwZShidXNib3kpO1xuXHRcdH0pKCk7XG5cblx0XHRpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnRmlsZSByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGlmIChmaWxlcy5sZW5ndGggPiAxKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSnVzdCAxIGZpbGUgaXMgYWxsb3dlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbGUgPSBmaWxlc1swXTtcblxuXHRcdGNvbnN0IGZpbGVTdG9yZSA9IEZpbGVVcGxvYWQuZ2V0U3RvcmUoJ1VwbG9hZHMnKTtcblxuXHRcdGNvbnN0IGRldGFpbHMgPSB7XG5cdFx0XHRuYW1lOiBmaWxlLmZpbGVuYW1lLFxuXHRcdFx0c2l6ZTogZmlsZS5maWxlQnVmZmVyLmxlbmd0aCxcblx0XHRcdHR5cGU6IGZpbGUubWltZXR5cGUsXG5cdFx0XHRyaWQ6IHRoaXMudXJsUGFyYW1zLnJpZCxcblx0XHRcdHVzZXJJZDogdGhpcy51c2VySWQsXG5cdFx0fTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdGNvbnN0IHVwbG9hZGVkRmlsZSA9IE1ldGVvci53cmFwQXN5bmMoZmlsZVN0b3JlLmluc2VydC5iaW5kKGZpbGVTdG9yZSkpKGRldGFpbHMsIGZpbGUuZmlsZUJ1ZmZlcik7XG5cblx0XHRcdHVwbG9hZGVkRmlsZS5kZXNjcmlwdGlvbiA9IGZpZWxkcy5kZXNjcmlwdGlvbjtcblxuXHRcdFx0ZGVsZXRlIGZpZWxkcy5kZXNjcmlwdGlvbjtcblxuXHRcdFx0Um9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhNZXRlb3IuY2FsbCgnc2VuZEZpbGVNZXNzYWdlJywgdGhpcy51cmxQYXJhbXMucmlkLCBudWxsLCB1cGxvYWRlZEZpbGUsIGZpZWxkcykpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncm9vbXMuc2F2ZU5vdGlmaWNhdGlvbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBzYXZlTm90aWZpY2F0aW9ucyA9IChub3RpZmljYXRpb25zLCByb29tSWQpID0+IHtcblx0XHRcdE9iamVjdC5rZXlzKG5vdGlmaWNhdGlvbnMpLmZvckVhY2goKG5vdGlmaWNhdGlvbktleSkgPT5cblx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT5cblx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZU5vdGlmaWNhdGlvblNldHRpbmdzJywgcm9vbUlkLCBub3RpZmljYXRpb25LZXksIG5vdGlmaWNhdGlvbnNbbm90aWZpY2F0aW9uS2V5XSlcblx0XHRcdFx0KVxuXHRcdFx0KTtcblx0XHR9O1xuXHRcdGNvbnN0IHsgcm9vbUlkLCBub3RpZmljYXRpb25zIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cblx0XHRpZiAoIXJvb21JZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBcXCdyb29tSWRcXCcgcGFyYW0gaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRpZiAoIW5vdGlmaWNhdGlvbnMgfHwgT2JqZWN0LmtleXMobm90aWZpY2F0aW9ucykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFxcJ25vdGlmaWNhdGlvbnNcXCcgcGFyYW0gaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRzYXZlTm90aWZpY2F0aW9ucyhub3RpZmljYXRpb25zLCByb29tSWQpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncm9vbXMuZmF2b3JpdGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgeyBmYXZvcml0ZSB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuaGFzT3duUHJvcGVydHkoJ2Zhdm9yaXRlJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgXFwnZmF2b3JpdGVcXCcgcGFyYW0gaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gZmluZFJvb21CeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLmJvZHlQYXJhbXMgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgndG9nZ2xlRmF2b3JpdGUnLCByb29tLl9pZCwgZmF2b3JpdGUpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Jvb21zLmNsZWFuSGlzdG9yeScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFJvb21CeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLmJvZHlQYXJhbXMgfSk7XG5cblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5sYXRlc3QpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtZXRlciBcImxhdGVzdFwiIGlzIHJlcXVpcmVkLicpO1xuXHRcdH1cblxuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm9sZGVzdCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW1ldGVyIFwib2xkZXN0XCIgaXMgcmVxdWlyZWQuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbGF0ZXN0ID0gbmV3IERhdGUodGhpcy5ib2R5UGFyYW1zLmxhdGVzdCk7XG5cdFx0Y29uc3Qgb2xkZXN0ID0gbmV3IERhdGUodGhpcy5ib2R5UGFyYW1zLm9sZGVzdCk7XG5cblx0XHRjb25zdCBpbmNsdXNpdmUgPSB0aGlzLmJvZHlQYXJhbXMuaW5jbHVzaXZlIHx8IGZhbHNlO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2NsZWFuUm9vbUhpc3RvcnknLCB7XG5cdFx0XHRyb29tSWQ6IGZpbmRSZXN1bHQuX2lkLFxuXHRcdFx0bGF0ZXN0LFxuXHRcdFx0b2xkZXN0LFxuXHRcdFx0aW5jbHVzaXZlLFxuXHRcdFx0bGltaXQ6IHRoaXMuYm9keVBhcmFtcy5saW1pdCxcblx0XHRcdGV4Y2x1ZGVQaW5uZWQ6IHRoaXMuYm9keVBhcmFtcy5leGNsdWRlUGlubmVkLFxuXHRcdFx0ZmlsZXNPbmx5OiB0aGlzLmJvZHlQYXJhbXMuZmlsZXNPbmx5LFxuXHRcdFx0ZnJvbVVzZXJzOiB0aGlzLmJvZHlQYXJhbXMudXNlcnMsXG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG4iLCJSb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc3Vic2NyaXB0aW9ucy5nZXQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IHVwZGF0ZWRTaW5jZSB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblxuXHRcdGxldCB1cGRhdGVkU2luY2VEYXRlO1xuXHRcdGlmICh1cGRhdGVkU2luY2UpIHtcblx0XHRcdGlmIChpc05hTihEYXRlLnBhcnNlKHVwZGF0ZWRTaW5jZSkpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb21JZC1wYXJhbS1pbnZhbGlkJywgJ1RoZSBcImxhc3RVcGRhdGVcIiBxdWVyeSBwYXJhbWV0ZXIgbXVzdCBiZSBhIHZhbGlkIGRhdGUuJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1cGRhdGVkU2luY2VEYXRlID0gbmV3IERhdGUodXBkYXRlZFNpbmNlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHJlc3VsdCA9IE1ldGVvci5jYWxsKCdzdWJzY3JpcHRpb25zL2dldCcsIHVwZGF0ZWRTaW5jZURhdGUpKTtcblxuXHRcdGlmIChBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcblx0XHRcdHJlc3VsdCA9IHtcblx0XHRcdFx0dXBkYXRlOiByZXN1bHQsXG5cdFx0XHRcdHJlbW92ZTogW10sXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHJlc3VsdCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3N1YnNjcmlwdGlvbnMuZ2V0T25lJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyByb29tSWQgfSA9IHRoaXMucmVxdWVzdFBhcmFtcygpO1xuXG5cdFx0aWYgKCFyb29tSWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgXFwncm9vbUlkXFwnIHBhcmFtIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbUlkLCB0aGlzLnVzZXJJZCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRzdWJzY3JpcHRpb24sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuLyoqXG5cdFRoaXMgQVBJIGlzIHN1cHBvc2UgdG8gbWFyayBhbnkgcm9vbSBhcyByZWFkLlxuXG5cdE1ldGhvZDogUE9TVFxuXHRSb3V0ZTogYXBpL3YxL3N1YnNjcmlwdGlvbnMucmVhZFxuXHRQYXJhbXM6XG5cdFx0LSByaWQ6IFRoZSByaWQgb2YgdGhlIHJvb20gdG8gYmUgbWFya2VkIGFzIHJlYWQuXG4gKi9cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzdWJzY3JpcHRpb25zLnJlYWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRyaWQ6IFN0cmluZyxcblx0XHR9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+XG5cdFx0XHRNZXRlb3IuY2FsbCgncmVhZE1lc3NhZ2VzJywgdGhpcy5ib2R5UGFyYW1zLnJpZClcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc3Vic2NyaXB0aW9ucy51bnJlYWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgeyByb29tSWQsIGZpcnN0VW5yZWFkTWVzc2FnZSB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGlmICghcm9vbUlkICYmIChmaXJzdFVucmVhZE1lc3NhZ2UgJiYgIWZpcnN0VW5yZWFkTWVzc2FnZS5faWQpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnQXQgbGVhc3Qgb25lIG9mIFwicm9vbUlkXCIgb3IgXCJmaXJzdFVucmVhZE1lc3NhZ2UuX2lkXCIgcGFyYW1zIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT5cblx0XHRcdE1ldGVvci5jYWxsKCd1bnJlYWRNZXNzYWdlcycsIGZpcnN0VW5yZWFkTWVzc2FnZSwgcm9vbUlkKVxuXHRcdCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblxuIiwiLyogZ2xvYmFsIHByb2Nlc3NXZWJob29rTWVzc2FnZSAqL1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5kZWxldGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0bXNnSWQ6IFN0cmluZyxcblx0XHRcdHJvb21JZDogU3RyaW5nLFxuXHRcdFx0YXNVc2VyOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHR9KSk7XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubXNnSWQsIHsgZmllbGRzOiB7IHU6IDEsIHJpZDogMSB9IH0pO1xuXG5cdFx0aWYgKCFtc2cpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBObyBtZXNzYWdlIGZvdW5kIHdpdGggdGhlIGlkIG9mIFwiJHsgdGhpcy5ib2R5UGFyYW1zLm1zZ0lkIH1cIi5gKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLnJvb21JZCAhPT0gbXNnLnJpZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByb29tIGlkIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIHdoZXJlIHRoZSBtZXNzYWdlIGlzIGZyb20uJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5hc1VzZXIgJiYgbXNnLnUuX2lkICE9PSB0aGlzLnVzZXJJZCAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ2ZvcmNlLWRlbGV0ZS1tZXNzYWdlJywgbXNnLnJpZCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdVbmF1dGhvcml6ZWQuIFlvdSBtdXN0IGhhdmUgdGhlIHBlcm1pc3Npb24gXCJmb3JjZS1kZWxldGUtbWVzc2FnZVwiIHRvIGRlbGV0ZSBvdGhlclxcJ3MgbWVzc2FnZSBhcyB0aGVtLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy5ib2R5UGFyYW1zLmFzVXNlciA/IG1zZy51Ll9pZCA6IHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnZGVsZXRlTWVzc2FnZScsIHsgX2lkOiBtc2cuX2lkIH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0X2lkOiBtc2cuX2lkLFxuXHRcdFx0dHM6IERhdGUubm93KCksXG5cdFx0XHRtZXNzYWdlOiBtc2csXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuc3luY01lc3NhZ2VzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyByb29tSWQsIGxhc3RVcGRhdGUgfSA9IHRoaXMucXVlcnlQYXJhbXM7XG5cblx0XHRpZiAoIXJvb21JZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbUlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJyb29tSWRcIiBxdWVyeSBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdGlmICghbGFzdFVwZGF0ZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbGFzdFVwZGF0ZS1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwibGFzdFVwZGF0ZVwiIHF1ZXJ5IHBhcmFtIGlzIG1pc3NpbmcuJyk7XG5cdFx0fSBlbHNlIGlmIChpc05hTihEYXRlLnBhcnNlKGxhc3RVcGRhdGUpKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbUlkLXBhcmFtLWludmFsaWQnLCAnVGhlIFwibGFzdFVwZGF0ZVwiIHF1ZXJ5IHBhcmFtZXRlciBtdXN0IGJlIGEgdmFsaWQgZGF0ZS4nKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdHJlc3VsdCA9IE1ldGVvci5jYWxsKCdtZXNzYWdlcy9nZXQnLCByb29tSWQsIHsgbGFzdFVwZGF0ZTogbmV3IERhdGUobGFzdFVwZGF0ZSkgfSk7XG5cdFx0fSk7XG5cblx0XHRpZiAoIXJlc3VsdCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRyZXN1bHQsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuZ2V0TWVzc2FnZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghdGhpcy5xdWVyeVBhcmFtcy5tc2dJZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBcIm1zZ0lkXCIgcXVlcnkgcGFyYW1ldGVyIG11c3QgYmUgcHJvdmlkZWQuJyk7XG5cdFx0fVxuXG5cdFx0bGV0IG1zZztcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRtc2cgPSBNZXRlb3IuY2FsbCgnZ2V0U2luZ2xlTWVzc2FnZScsIHRoaXMucXVlcnlQYXJhbXMubXNnSWQpO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFtc2cpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZTogbXNnLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnBpbk1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkIHx8ICF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJtZXNzYWdlSWRcIiBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQpO1xuXG5cdFx0aWYgKCFtc2cpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2Utbm90LWZvdW5kJywgJ1RoZSBwcm92aWRlZCBcIm1lc3NhZ2VJZFwiIGRvZXMgbm90IG1hdGNoIGFueSBleGlzdGluZyBtZXNzYWdlLicpO1xuXHRcdH1cblxuXHRcdGxldCBwaW5uZWRNZXNzYWdlO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHBpbm5lZE1lc3NhZ2UgPSBNZXRlb3IuY2FsbCgncGluTWVzc2FnZScsIG1zZykpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZTogcGlubmVkTWVzc2FnZSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5wb3N0TWVzc2FnZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBtZXNzYWdlUmV0dXJuID0gcHJvY2Vzc1dlYmhvb2tNZXNzYWdlKHRoaXMuYm9keVBhcmFtcywgdGhpcy51c2VyLCB1bmRlZmluZWQsIHRydWUpWzBdO1xuXG5cdFx0aWYgKCFtZXNzYWdlUmV0dXJuKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgndW5rbm93bi1lcnJvcicpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHRzOiBEYXRlLm5vdygpLFxuXHRcdFx0Y2hhbm5lbDogbWVzc2FnZVJldHVybi5jaGFubmVsLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZVJldHVybi5tZXNzYWdlLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnNlYXJjaCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgcm9vbUlkLCBzZWFyY2hUZXh0IH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXHRcdGNvbnN0IHsgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cblx0XHRpZiAoIXJvb21JZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbUlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJyb29tSWRcIiBxdWVyeSBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdGlmICghc2VhcmNoVGV4dCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itc2VhcmNoVGV4dC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwic2VhcmNoVGV4dFwiIHF1ZXJ5IHBhcmFtIGlzIG1pc3NpbmcuJyk7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiByZXN1bHQgPSBNZXRlb3IuY2FsbCgnbWVzc2FnZVNlYXJjaCcsIHNlYXJjaFRleHQsIHJvb21JZCwgY291bnQpLm1lc3NhZ2UuZG9jcyk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZXNzYWdlczogcmVzdWx0LFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cbi8vIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gYGNoYXQucG9zdE1lc3NhZ2VgIGFuZCBgY2hhdC5zZW5kTWVzc2FnZWAgaXMgdGhhdCBgY2hhdC5zZW5kTWVzc2FnZWAgYWxsb3dzXG4vLyBmb3IgcGFzc2luZyBhIHZhbHVlIGZvciBgX2lkYCBhbmQgdGhlIG90aGVyIG9uZSBkb2Vzbid0LiBBbHNvLCBgY2hhdC5zZW5kTWVzc2FnZWAgb25seSBzZW5kcyBpdCB0b1xuLy8gb25lIGNoYW5uZWwgd2hlcmVhcyB0aGUgb3RoZXIgb25lIGFsbG93cyBmb3Igc2VuZGluZyB0byBtb3JlIHRoYW4gb25lIGNoYW5uZWwgYXQgYSB0aW1lLlxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuc2VuZE1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1wYXJhbXMnLCAnVGhlIFwibWVzc2FnZVwiIHBhcmFtZXRlciBtdXN0IGJlIHByb3ZpZGVkLicpO1xuXHRcdH1cblxuXHRcdGxldCBtZXNzYWdlO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IG1lc3NhZ2UgPSBNZXRlb3IuY2FsbCgnc2VuZE1lc3NhZ2UnLCB0aGlzLmJvZHlQYXJhbXMubWVzc2FnZSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5zdGFyTWVzc2FnZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQgfHwgIXRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQudHJpbSgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1tZXNzYWdlaWQtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcIm1lc3NhZ2VJZFwiIHBhcmFtIGlzIHJlcXVpcmVkLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQpO1xuXG5cdFx0aWYgKCFtc2cpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2Utbm90LWZvdW5kJywgJ1RoZSBwcm92aWRlZCBcIm1lc3NhZ2VJZFwiIGRvZXMgbm90IG1hdGNoIGFueSBleGlzdGluZyBtZXNzYWdlLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdzdGFyTWVzc2FnZScsIHtcblx0XHRcdF9pZDogbXNnLl9pZCxcblx0XHRcdHJpZDogbXNnLnJpZCxcblx0XHRcdHN0YXJyZWQ6IHRydWUsXG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC51blBpbk1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkIHx8ICF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJtZXNzYWdlSWRcIiBwYXJhbSBpcyByZXF1aXJlZC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkKTtcblxuXHRcdGlmICghbXNnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1tZXNzYWdlLW5vdC1mb3VuZCcsICdUaGUgcHJvdmlkZWQgXCJtZXNzYWdlSWRcIiBkb2VzIG5vdCBtYXRjaCBhbnkgZXhpc3RpbmcgbWVzc2FnZS4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgndW5waW5NZXNzYWdlJywgbXNnKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnVuU3Rhck1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkIHx8ICF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJtZXNzYWdlSWRcIiBwYXJhbSBpcyByZXF1aXJlZC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkKTtcblxuXHRcdGlmICghbXNnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1tZXNzYWdlLW5vdC1mb3VuZCcsICdUaGUgcHJvdmlkZWQgXCJtZXNzYWdlSWRcIiBkb2VzIG5vdCBtYXRjaCBhbnkgZXhpc3RpbmcgbWVzc2FnZS4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnc3Rhck1lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IG1zZy5faWQsXG5cdFx0XHRyaWQ6IG1zZy5yaWQsXG5cdFx0XHRzdGFycmVkOiBmYWxzZSxcblx0XHR9KSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnVwZGF0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRyb29tSWQ6IFN0cmluZyxcblx0XHRcdG1zZ0lkOiBTdHJpbmcsXG5cdFx0XHR0ZXh0OiBTdHJpbmcsIC8vIFVzaW5nIHRleHQgdG8gYmUgY29uc2lzdGFudCB3aXRoIGNoYXQucG9zdE1lc3NhZ2Vcblx0XHR9KSk7XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubXNnSWQpO1xuXG5cdFx0Ly8gRW5zdXJlIHRoZSBtZXNzYWdlIGV4aXN0c1xuXHRcdGlmICghbXNnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShgTm8gbWVzc2FnZSBmb3VuZCB3aXRoIHRoZSBpZCBvZiBcIiR7IHRoaXMuYm9keVBhcmFtcy5tc2dJZCB9XCIuYCk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5yb29tSWQgIT09IG1zZy5yaWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcm9vbSBpZCBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCB3aGVyZSB0aGUgbWVzc2FnZSBpcyBmcm9tLicpO1xuXHRcdH1cblxuXHRcdC8vIFBlcm1pc3Npb24gY2hlY2tzIGFyZSBhbHJlYWR5IGRvbmUgaW4gdGhlIHVwZGF0ZU1lc3NhZ2UgbWV0aG9kLCBzbyBubyBuZWVkIHRvIGR1cGxpY2F0ZSB0aGVtXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3VwZGF0ZU1lc3NhZ2UnLCB7IF9pZDogbXNnLl9pZCwgbXNnOiB0aGlzLmJvZHlQYXJhbXMudGV4dCwgcmlkOiBtc2cucmlkIH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZTogUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQobXNnLl9pZCksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQucmVhY3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkIHx8ICF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJtZXNzYWdlSWRcIiBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQpO1xuXG5cdFx0aWYgKCFtc2cpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2Utbm90LWZvdW5kJywgJ1RoZSBwcm92aWRlZCBcIm1lc3NhZ2VJZFwiIGRvZXMgbm90IG1hdGNoIGFueSBleGlzdGluZyBtZXNzYWdlLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGVtb2ppID0gdGhpcy5ib2R5UGFyYW1zLmVtb2ppIHx8IHRoaXMuYm9keVBhcmFtcy5yZWFjdGlvbjtcblxuXHRcdGlmICghZW1vamkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWVtb2ppLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJlbW9qaVwiIHBhcmFtIGlzIG1pc3NpbmcuJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3NldFJlYWN0aW9uJywgZW1vamksIG1zZy5faWQsIHRoaXMuYm9keVBhcmFtcy5zaG91bGRSZWFjdCkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5nZXRNZXNzYWdlUmVhZFJlY2VpcHRzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyBtZXNzYWdlSWQgfSA9IHRoaXMucXVlcnlQYXJhbXM7XG5cdFx0aWYgKCFtZXNzYWdlSWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKHtcblx0XHRcdFx0ZXJyb3I6ICdUaGUgcmVxdWlyZWQgXFwnbWVzc2FnZUlkXFwnIHBhcmFtIGlzIG1pc3NpbmcuJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBtZXNzYWdlUmVhZFJlY2VpcHRzID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2dldFJlYWRSZWNlaXB0cycsIHsgbWVzc2FnZUlkIH0pKTtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0cmVjZWlwdHM6IG1lc3NhZ2VSZWFkUmVjZWlwdHMsXG5cdFx0XHR9KTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoe1xuXHRcdFx0XHRlcnJvcjogZXJyb3IubWVzc2FnZSxcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5yZXBvcnRNZXNzYWdlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgbWVzc2FnZUlkLCBkZXNjcmlwdGlvbiB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGlmICghbWVzc2FnZUlkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHJlcXVpcmVkIFwibWVzc2FnZUlkXCIgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRpZiAoIWRlc2NyaXB0aW9uKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHJlcXVpcmVkIFwiZGVzY3JpcHRpb25cIiBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdyZXBvcnRNZXNzYWdlJywgbWVzc2FnZUlkLCBkZXNjcmlwdGlvbikpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5pZ25vcmVVc2VyJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyByaWQsIHVzZXJJZCB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRsZXQgeyBpZ25vcmUgPSB0cnVlIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXG5cdFx0aWdub3JlID0gdHlwZW9mIGlnbm9yZSA9PT0gJ3N0cmluZycgPyAvdHJ1ZXwxLy50ZXN0KGlnbm9yZSkgOiBpZ25vcmU7XG5cblx0XHRpZiAoIXJpZCB8fCAhcmlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1pZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwicmlkXCIgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRpZiAoIXVzZXJJZCB8fCAhdXNlcklkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItdXNlci1pZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwidXNlcklkXCIgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnaWdub3JlVXNlcicsIHsgcmlkLCB1c2VySWQsIGlnbm9yZSB9KSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY29tbWFuZHMuZ2V0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgcGFyYW1zID0gdGhpcy5xdWVyeVBhcmFtcztcblxuXHRcdGlmICh0eXBlb2YgcGFyYW1zLmNvbW1hbmQgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHF1ZXJ5IHBhcmFtIFwiY29tbWFuZFwiIG11c3QgYmUgcHJvdmlkZWQuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY21kID0gUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW3BhcmFtcy5jb21tYW5kLnRvTG93ZXJDYXNlKCldO1xuXG5cdFx0aWYgKCFjbWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGVyZSBpcyBubyBjb21tYW5kIGluIHRoZSBzeXN0ZW0gYnkgdGhlIG5hbWUgb2Y6ICR7IHBhcmFtcy5jb21tYW5kIH1gKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IGNvbW1hbmQ6IGNtZCB9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY29tbWFuZHMubGlzdCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGxldCBjb21tYW5kcyA9IE9iamVjdC52YWx1ZXMoUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzKTtcblxuXHRcdGlmIChxdWVyeSAmJiBxdWVyeS5jb21tYW5kKSB7XG5cdFx0XHRjb21tYW5kcyA9IGNvbW1hbmRzLmZpbHRlcigoY29tbWFuZCkgPT4gY29tbWFuZC5jb21tYW5kID09PSBxdWVyeS5jb21tYW5kKTtcblx0XHR9XG5cblx0XHRjb25zdCB0b3RhbENvdW50ID0gY29tbWFuZHMubGVuZ3RoO1xuXHRcdGNvbW1hbmRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMucHJvY2Vzc1F1ZXJ5T3B0aW9uc09uUmVzdWx0KGNvbW1hbmRzLCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y29tbWFuZHMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRjb3VudDogY29tbWFuZHMubGVuZ3RoLFxuXHRcdFx0dG90YWw6IHRvdGFsQ291bnQsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuLy8gRXhwZWN0cyBhIGJvZHkgb2Y6IHsgY29tbWFuZDogJ2dpbW1lJywgcGFyYW1zOiAnYW55IHN0cmluZyB2YWx1ZScsIHJvb21JZDogJ3ZhbHVlJyB9XG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY29tbWFuZHMucnVuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGJvZHkgPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyKCk7XG5cblx0XHRpZiAodHlwZW9mIGJvZHkuY29tbWFuZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdZb3UgbXVzdCBwcm92aWRlIGEgY29tbWFuZCB0byBydW4uJyk7XG5cdFx0fVxuXG5cdFx0aWYgKGJvZHkucGFyYW1zICYmIHR5cGVvZiBib2R5LnBhcmFtcyAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcGFyYW1ldGVycyBmb3IgdGhlIGNvbW1hbmQgbXVzdCBiZSBhIHNpbmdsZSBzdHJpbmcuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBib2R5LnJvb21JZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcm9vbVxcJ3MgaWQgd2hlcmUgdG8gZXhlY3V0ZSB0aGlzIGNvbW1hbmQgbXVzdCBiZSBwcm92aWRlZCBhbmQgYmUgYSBzdHJpbmcuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY21kID0gYm9keS5jb21tYW5kLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuY29tbWFuZHNbYm9keS5jb21tYW5kLnRvTG93ZXJDYXNlKCldKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNvbW1hbmQgcHJvdmlkZWQgZG9lcyBub3QgZXhpc3QgKG9yIGlzIGRpc2FibGVkKS4nKTtcblx0XHR9XG5cblx0XHQvLyBUaGlzIHdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgdGhleSBjYW4ndCBvciB0aGUgcm9vbSBpcyBpbnZhbGlkXG5cdFx0TWV0ZW9yLmNhbGwoJ2NhbkFjY2Vzc1Jvb20nLCBib2R5LnJvb21JZCwgdXNlci5faWQpO1xuXG5cdFx0Y29uc3QgcGFyYW1zID0gYm9keS5wYXJhbXMgPyBib2R5LnBhcmFtcyA6ICcnO1xuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRyZXN1bHQgPSBSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMucnVuKGNtZCwgcGFyYW1zLCB7XG5cdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdHJpZDogYm9keS5yb29tSWQsXG5cdFx0XHRcdG1zZzogYC8keyBjbWQgfSAkeyBwYXJhbXMgfWAsXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgcmVzdWx0IH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjb21tYW5kcy5wcmV2aWV3JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHQvLyBFeHBlY3RzIHRoZXNlIHF1ZXJ5IHBhcmFtczogY29tbWFuZDogJ2dpcGh5JywgcGFyYW1zOiAnbWluZScsIHJvb21JZDogJ3ZhbHVlJ1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldExvZ2dlZEluVXNlcigpO1xuXG5cdFx0aWYgKHR5cGVvZiBxdWVyeS5jb21tYW5kICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1lvdSBtdXN0IHByb3ZpZGUgYSBjb21tYW5kIHRvIGdldCB0aGUgcHJldmlld3MgZnJvbS4nKTtcblx0XHR9XG5cblx0XHRpZiAocXVlcnkucGFyYW1zICYmIHR5cGVvZiBxdWVyeS5wYXJhbXMgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHBhcmFtZXRlcnMgZm9yIHRoZSBjb21tYW5kIG11c3QgYmUgYSBzaW5nbGUgc3RyaW5nLicpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgcXVlcnkucm9vbUlkICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByb29tXFwncyBpZCB3aGVyZSB0aGUgcHJldmlld3MgYXJlIGJlaW5nIGRpc3BsYXllZCBtdXN0IGJlIHByb3ZpZGVkIGFuZCBiZSBhIHN0cmluZy4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBjbWQgPSBxdWVyeS5jb21tYW5kLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuY29tbWFuZHNbY21kXSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBjb21tYW5kIHByb3ZpZGVkIGRvZXMgbm90IGV4aXN0IChvciBpcyBkaXNhYmxlZCkuJyk7XG5cdFx0fVxuXG5cdFx0Ly8gVGhpcyB3aWxsIHRocm93IGFuIGVycm9yIGlmIHRoZXkgY2FuJ3Qgb3IgdGhlIHJvb20gaXMgaW52YWxpZFxuXHRcdE1ldGVvci5jYWxsKCdjYW5BY2Nlc3NSb29tJywgcXVlcnkucm9vbUlkLCB1c2VyLl9pZCk7XG5cblx0XHRjb25zdCBwYXJhbXMgPSBxdWVyeS5wYXJhbXMgPyBxdWVyeS5wYXJhbXMgOiAnJztcblxuXHRcdGxldCBwcmV2aWV3O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodXNlci5faWQsICgpID0+IHtcblx0XHRcdHByZXZpZXcgPSBNZXRlb3IuY2FsbCgnZ2V0U2xhc2hDb21tYW5kUHJldmlld3MnLCB7IGNtZCwgcGFyYW1zLCBtc2c6IHsgcmlkOiBxdWVyeS5yb29tSWQgfSB9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgcHJldmlldyB9KTtcblx0fSxcblx0Ly8gRXhwZWN0cyBhIGJvZHkgZm9ybWF0IG9mOiB7IGNvbW1hbmQ6ICdnaXBoeScsIHBhcmFtczogJ21pbmUnLCByb29tSWQ6ICd2YWx1ZScsIHByZXZpZXdJdGVtOiB7IGlkOiAnc2FkZjgnIHR5cGU6ICdpbWFnZScsIHZhbHVlOiAnaHR0cHM6Ly9kZXYubnVsbC9naWYgfSB9XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgYm9keSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRMb2dnZWRJblVzZXIoKTtcblxuXHRcdGlmICh0eXBlb2YgYm9keS5jb21tYW5kICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1lvdSBtdXN0IHByb3ZpZGUgYSBjb21tYW5kIHRvIHJ1biB0aGUgcHJldmlldyBpdGVtIG9uLicpO1xuXHRcdH1cblxuXHRcdGlmIChib2R5LnBhcmFtcyAmJiB0eXBlb2YgYm9keS5wYXJhbXMgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHBhcmFtZXRlcnMgZm9yIHRoZSBjb21tYW5kIG11c3QgYmUgYSBzaW5nbGUgc3RyaW5nLicpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgYm9keS5yb29tSWQgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHJvb21cXCdzIGlkIHdoZXJlIHRoZSBwcmV2aWV3IGlzIGJlaW5nIGV4ZWN1dGVkIGluIG11c3QgYmUgcHJvdmlkZWQgYW5kIGJlIGEgc3RyaW5nLicpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgYm9keS5wcmV2aWV3SXRlbSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcHJldmlldyBpdGVtIGJlaW5nIGV4ZWN1dGVkIG11c3QgYmUgcHJvdmlkZWQuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFib2R5LnByZXZpZXdJdGVtLmlkIHx8ICFib2R5LnByZXZpZXdJdGVtLnR5cGUgfHwgdHlwZW9mIGJvZHkucHJldmlld0l0ZW0udmFsdWUgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHByZXZpZXcgaXRlbSBiZWluZyBleGVjdXRlZCBpcyBpbiB0aGUgd3JvbmcgZm9ybWF0LicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNtZCA9IGJvZHkuY29tbWFuZC50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmICghUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF0pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgY29tbWFuZCBwcm92aWRlZCBkb2VzIG5vdCBleGlzdCAob3IgaXMgZGlzYWJsZWQpLicpO1xuXHRcdH1cblxuXHRcdC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBlcnJvciBpZiB0aGV5IGNhbid0IG9yIHRoZSByb29tIGlzIGludmFsaWRcblx0XHRNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIGJvZHkucm9vbUlkLCB1c2VyLl9pZCk7XG5cblx0XHRjb25zdCBwYXJhbXMgPSBib2R5LnBhcmFtcyA/IGJvZHkucGFyYW1zIDogJyc7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnZXhlY3V0ZVNsYXNoQ29tbWFuZFByZXZpZXcnLCB7IGNtZCwgcGFyYW1zLCBtc2c6IHsgcmlkOiBib2R5LnJvb21JZCB9IH0sIGJvZHkucHJldmlld0l0ZW0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2Vtb2ppLWN1c3RvbScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGVtb2ppcyA9IE1ldGVvci5jYWxsKCdsaXN0RW1vamlDdXN0b20nKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgZW1vamlzIH0pO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuLy8gUmV0dXJucyB0aGUgcHJpdmF0ZSBncm91cCBzdWJzY3JpcHRpb24gSUYgZm91bmQgb3RoZXJ3aXNlIGl0IHdpbGwgcmV0dXJuIHRoZSBmYWlsdXJlIG9mIHdoeSBpdCBkaWRuJ3QuIENoZWNrIHRoZSBgc3RhdHVzQ29kZWAgcHJvcGVydHlcbmZ1bmN0aW9uIGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zLCB1c2VySWQsIGNoZWNrZWRBcmNoaXZlZCA9IHRydWUgfSkge1xuXHRpZiAoKCFwYXJhbXMucm9vbUlkIHx8ICFwYXJhbXMucm9vbUlkLnRyaW0oKSkgJiYgKCFwYXJhbXMucm9vbU5hbWUgfHwgIXBhcmFtcy5yb29tTmFtZS50cmltKCkpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHBhcmFtZXRlciBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBpcyByZXF1aXJlZCcpO1xuXHR9XG5cblx0bGV0IHJvb21TdWI7XG5cdGlmIChwYXJhbXMucm9vbUlkKSB7XG5cdFx0cm9vbVN1YiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHBhcmFtcy5yb29tSWQsIHVzZXJJZCk7XG5cdH0gZWxzZSBpZiAocGFyYW1zLnJvb21OYW1lKSB7XG5cdFx0cm9vbVN1YiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbU5hbWVBbmRVc2VySWQocGFyYW1zLnJvb21OYW1lLCB1c2VySWQpO1xuXHR9XG5cblx0aWYgKCFyb29tU3ViIHx8IHJvb21TdWIudCAhPT0gJ3AnKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1ub3QtZm91bmQnLCAnVGhlIHJlcXVpcmVkIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIHBhcmFtIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIGFueSBncm91cCcpO1xuXHR9XG5cblx0aWYgKGNoZWNrZWRBcmNoaXZlZCAmJiByb29tU3ViLmFyY2hpdmVkKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1hcmNoaXZlZCcsIGBUaGUgcHJpdmF0ZSBncm91cCwgJHsgcm9vbVN1Yi5uYW1lIH0sIGlzIGFyY2hpdmVkYCk7XG5cdH1cblxuXHRyZXR1cm4gcm9vbVN1Yjtcbn1cblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5hZGRBbGwnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhZGRBbGxVc2VyVG9Sb29tJywgZmluZFJlc3VsdC5yaWQsIHRoaXMuYm9keVBhcmFtcy5hY3RpdmVVc2Vyc09ubHkpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmFkZE1vZGVyYXRvcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhZGRSb29tTW9kZXJhdG9yJywgZmluZFJlc3VsdC5yaWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5hZGRPd25lcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhZGRSb29tT3duZXInLCBmaW5kUmVzdWx0LnJpZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmFkZExlYWRlcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2FkZFJvb21MZWFkZXInLCBmaW5kUmVzdWx0LnJpZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG4vLyBBcmNoaXZlcyBhIHByaXZhdGUgZ3JvdXAgb25seSBpZiBpdCB3YXNuJ3RcblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuYXJjaGl2ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2FyY2hpdmVSb29tJywgZmluZFJlc3VsdC5yaWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmNsb3NlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQsIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRpZiAoIWZpbmRSZXN1bHQub3Blbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYFRoZSBwcml2YXRlIGdyb3VwLCAkeyBmaW5kUmVzdWx0Lm5hbWUgfSwgaXMgYWxyZWFkeSBjbG9zZWQgdG8gdGhlIHNlbmRlcmApO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdoaWRlUm9vbScsIGZpbmRSZXN1bHQucmlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5jb3VudGVycycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGFjY2VzcyA9IFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctcm9vbS1hZG1pbmlzdHJhdGlvbicpO1xuXHRcdGNvbnN0IHBhcmFtcyA9IHRoaXMucmVxdWVzdFBhcmFtcygpO1xuXHRcdGxldCB1c2VyID0gdGhpcy51c2VySWQ7XG5cdFx0bGV0IHJvb207XG5cdFx0bGV0IHVucmVhZHMgPSBudWxsO1xuXHRcdGxldCB1c2VyTWVudGlvbnMgPSBudWxsO1xuXHRcdGxldCB1bnJlYWRzRnJvbSA9IG51bGw7XG5cdFx0bGV0IGpvaW5lZCA9IGZhbHNlO1xuXHRcdGxldCBtc2dzID0gbnVsbDtcblx0XHRsZXQgbGF0ZXN0ID0gbnVsbDtcblx0XHRsZXQgbWVtYmVycyA9IG51bGw7XG5cblx0XHRpZiAoKCFwYXJhbXMucm9vbUlkIHx8ICFwYXJhbXMucm9vbUlkLnRyaW0oKSkgJiYgKCFwYXJhbXMucm9vbU5hbWUgfHwgIXBhcmFtcy5yb29tTmFtZS50cmltKCkpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcGFyYW1ldGVyIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHBhcmFtcy5yb29tSWQpIHtcblx0XHRcdHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChwYXJhbXMucm9vbUlkKTtcblx0XHR9IGVsc2UgaWYgKHBhcmFtcy5yb29tTmFtZSkge1xuXHRcdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUocGFyYW1zLnJvb21OYW1lKTtcblx0XHR9XG5cblx0XHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAncCcpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tbm90LWZvdW5kJywgJ1RoZSByZXF1aXJlZCBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBwYXJhbSBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCBhbnkgZ3JvdXAnKTtcblx0XHR9XG5cblx0XHRpZiAocm9vbS5hcmNoaXZlZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1hcmNoaXZlZCcsIGBUaGUgcHJpdmF0ZSBncm91cCwgJHsgcm9vbS5uYW1lIH0sIGlzIGFyY2hpdmVkYCk7XG5cdFx0fVxuXG5cdFx0aWYgKHBhcmFtcy51c2VySWQpIHtcblx0XHRcdGlmICghYWNjZXNzKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHRcdH1cblx0XHRcdHVzZXIgPSBwYXJhbXMudXNlcklkO1xuXHRcdH1cblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb29tLl9pZCwgdXNlcik7XG5cdFx0Y29uc3QgbG0gPSByb29tLmxtID8gcm9vbS5sbSA6IHJvb20uX3VwZGF0ZWRBdDtcblxuXHRcdGlmICh0eXBlb2Ygc3Vic2NyaXB0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBzdWJzY3JpcHRpb24ub3Blbikge1xuXHRcdFx0aWYgKHN1YnNjcmlwdGlvbi5scykge1xuXHRcdFx0XHR1bnJlYWRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY291bnRWaXNpYmxlQnlSb29tSWRCZXR3ZWVuVGltZXN0YW1wc0luY2x1c2l2ZShzdWJzY3JpcHRpb24ucmlkLCBzdWJzY3JpcHRpb24ubHMsIGxtKTtcblx0XHRcdFx0dW5yZWFkc0Zyb20gPSBzdWJzY3JpcHRpb24ubHM7XG5cdFx0XHR9XG5cdFx0XHR1c2VyTWVudGlvbnMgPSBzdWJzY3JpcHRpb24udXNlck1lbnRpb25zO1xuXHRcdFx0am9pbmVkID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoYWNjZXNzIHx8IGpvaW5lZCkge1xuXHRcdFx0bXNncyA9IHJvb20ubXNncztcblx0XHRcdGxhdGVzdCA9IGxtO1xuXHRcdFx0bWVtYmVycyA9IHJvb20udXNlcnNDb3VudDtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRqb2luZWQsXG5cdFx0XHRtZW1iZXJzLFxuXHRcdFx0dW5yZWFkcyxcblx0XHRcdHVucmVhZHNGcm9tLFxuXHRcdFx0bXNncyxcblx0XHRcdGxhdGVzdCxcblx0XHRcdHVzZXJNZW50aW9ucyxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG4vLyBDcmVhdGUgUHJpdmF0ZSBHcm91cFxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5jcmVhdGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdjcmVhdGUtcCcpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubmFtZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW0gXCJuYW1lXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLm1lbWJlcnMgJiYgIV8uaXNBcnJheSh0aGlzLmJvZHlQYXJhbXMubWVtYmVycykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVtYmVyc1wiIG11c3QgYmUgYW4gYXJyYXkgaWYgcHJvdmlkZWQnKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcyAmJiAhKHR5cGVvZiB0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzID09PSAnb2JqZWN0JykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwiY3VzdG9tRmllbGRzXCIgbXVzdCBiZSBhbiBvYmplY3QgaWYgcHJvdmlkZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCByZWFkT25seSA9IHR5cGVvZiB0aGlzLmJvZHlQYXJhbXMucmVhZE9ubHkgIT09ICd1bmRlZmluZWQnID8gdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5IDogZmFsc2U7XG5cblx0XHRsZXQgaWQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0aWQgPSBNZXRlb3IuY2FsbCgnY3JlYXRlUHJpdmF0ZUdyb3VwJywgdGhpcy5ib2R5UGFyYW1zLm5hbWUsIHRoaXMuYm9keVBhcmFtcy5tZW1iZXJzID8gdGhpcy5ib2R5UGFyYW1zLm1lbWJlcnMgOiBbXSwgcmVhZE9ubHksIHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGlkLnJpZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5kZWxldGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdlcmFzZVJvb20nLCBmaW5kUmVzdWx0LnJpZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRncm91cDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5yaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuZmlsZXMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXHRcdGNvbnN0IGFkZFVzZXJPYmplY3RUb0V2ZXJ5T2JqZWN0ID0gKGZpbGUpID0+IHtcblx0XHRcdGlmIChmaWxlLnVzZXJJZCkge1xuXHRcdFx0XHRmaWxlID0gdGhpcy5pbnNlcnRVc2VyT2JqZWN0KHsgb2JqZWN0OiBmaWxlLCB1c2VySWQ6IGZpbGUudXNlcklkIH0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZpbGU7XG5cdFx0fTtcblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgcmlkOiBmaW5kUmVzdWx0LnJpZCB9KTtcblxuXHRcdGNvbnN0IGZpbGVzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRmaWxlczogZmlsZXMubWFwKGFkZFVzZXJPYmplY3RUb0V2ZXJ5T2JqZWN0KSxcblx0XHRcdGNvdW50OiBmaWxlcy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuZ2V0SW50ZWdyYXRpb25zJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0bGV0IGluY2x1ZGVBbGxQcml2YXRlR3JvdXBzID0gdHJ1ZTtcblx0XHRpZiAodHlwZW9mIHRoaXMucXVlcnlQYXJhbXMuaW5jbHVkZUFsbFByaXZhdGVHcm91cHMgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRpbmNsdWRlQWxsUHJpdmF0ZUdyb3VwcyA9IHRoaXMucXVlcnlQYXJhbXMuaW5jbHVkZUFsbFByaXZhdGVHcm91cHMgPT09ICd0cnVlJztcblx0XHR9XG5cblx0XHRjb25zdCBjaGFubmVsc1RvU2VhcmNoID0gW2AjJHsgZmluZFJlc3VsdC5uYW1lIH1gXTtcblx0XHRpZiAoaW5jbHVkZUFsbFByaXZhdGVHcm91cHMpIHtcblx0XHRcdGNoYW5uZWxzVG9TZWFyY2gucHVzaCgnYWxsX3ByaXZhdGVfZ3JvdXBzJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyBjaGFubmVsOiB7ICRpbjogY2hhbm5lbHNUb1NlYXJjaCB9IH0pO1xuXHRcdGNvbnN0IGludGVncmF0aW9ucyA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgX2NyZWF0ZWRBdDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbnRlZ3JhdGlvbnMsXG5cdFx0XHRjb3VudDogaW50ZWdyYXRpb25zLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmhpc3RvcnknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0bGV0IGxhdGVzdERhdGUgPSBuZXcgRGF0ZSgpO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmxhdGVzdCkge1xuXHRcdFx0bGF0ZXN0RGF0ZSA9IG5ldyBEYXRlKHRoaXMucXVlcnlQYXJhbXMubGF0ZXN0KTtcblx0XHR9XG5cblx0XHRsZXQgb2xkZXN0RGF0ZSA9IHVuZGVmaW5lZDtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5vbGRlc3QpIHtcblx0XHRcdG9sZGVzdERhdGUgPSBuZXcgRGF0ZSh0aGlzLnF1ZXJ5UGFyYW1zLm9sZGVzdCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW5jbHVzaXZlID0gdGhpcy5xdWVyeVBhcmFtcy5pbmNsdXNpdmUgfHwgZmFsc2U7XG5cblx0XHRsZXQgY291bnQgPSAyMDtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5jb3VudCkge1xuXHRcdFx0Y291bnQgPSBwYXJzZUludCh0aGlzLnF1ZXJ5UGFyYW1zLmNvdW50KTtcblx0XHR9XG5cblx0XHRjb25zdCB1bnJlYWRzID0gdGhpcy5xdWVyeVBhcmFtcy51bnJlYWRzIHx8IGZhbHNlO1xuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRyZXN1bHQgPSBNZXRlb3IuY2FsbCgnZ2V0Q2hhbm5lbEhpc3RvcnknLCB7IHJpZDogZmluZFJlc3VsdC5yaWQsIGxhdGVzdDogbGF0ZXN0RGF0ZSwgb2xkZXN0OiBvbGRlc3REYXRlLCBpbmNsdXNpdmUsIGNvdW50LCB1bnJlYWRzIH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhyZXN1bHQpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuaW5mbycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQsIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRncm91cDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5yaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuaW52aXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgcm9vbUlkID0gJycsIHJvb21OYW1lID0gJycgfSA9IHRoaXMucmVxdWVzdFBhcmFtcygpO1xuXHRcdGNvbnN0IGlkT3JOYW1lID0gcm9vbUlkIHx8IHJvb21OYW1lO1xuXHRcdGlmICghaWRPck5hbWUudHJpbSgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcGFyYW1ldGVyIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBfaWQ6IHJpZCwgdDogdHlwZSB9ID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWRPck5hbWUoaWRPck5hbWUpIHx8IHt9O1xuXG5cdFx0aWYgKCFyaWQgfHwgdHlwZSAhPT0gJ3AnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLW5vdC1mb3VuZCcsICdUaGUgcmVxdWlyZWQgXCJyb29tSWRcIiBvciBcInJvb21OYW1lXCIgcGFyYW0gcHJvdmlkZWQgZG9lcyBub3QgbWF0Y2ggYW55IGdyb3VwJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyB1c2VybmFtZSB9ID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2FkZFVzZXJUb1Jvb20nLCB7IHJpZCwgdXNlcm5hbWUgfSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJpZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5raWNrJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3JlbW92ZVVzZXJGcm9tUm9vbScsIHsgcmlkOiBmaW5kUmVzdWx0LnJpZCwgdXNlcm5hbWU6IHVzZXIudXNlcm5hbWUgfSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMubGVhdmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdsZWF2ZVJvb20nLCBmaW5kUmVzdWx0LnJpZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cbi8vIExpc3QgUHJpdmF0ZSBHcm91cHMgYSB1c2VyIGhhcyBhY2Nlc3MgdG9cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMubGlzdCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcyB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Ly8gVE9ETzogQ0FDSEU6IEFkZCBCcmVhY2tpbmcgbm90aWNlIHNpbmNlIHdlIHJlbW92ZWQgdGhlIHF1ZXJ5IHBhcmFtXG5cdFx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5U3Vic2NyaXB0aW9uVHlwZUFuZFVzZXJJZCgncCcsIHRoaXMudXNlcklkLCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWxDb3VudCA9IGN1cnNvci5jb3VudCgpO1xuXHRcdGNvbnN0IHJvb21zID0gY3Vyc29yLmZldGNoKCk7XG5cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3Vwczogcm9vbXMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0dG90YWw6IHRvdGFsQ291bnQsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmxpc3RBbGwnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctcm9vbS1hZG1pbmlzdHJhdGlvbicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHQ6ICdwJyB9KTtcblxuXHRcdGxldCByb29tcyA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmQob3VyUXVlcnkpLmZldGNoKCk7XG5cdFx0Y29uc3QgdG90YWxDb3VudCA9IHJvb21zLmxlbmd0aDtcblxuXHRcdHJvb21zID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMucHJvY2Vzc1F1ZXJ5T3B0aW9uc09uUmVzdWx0KHJvb21zLCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXBzOiByb29tcyxcblx0XHRcdG9mZnNldCxcblx0XHRcdGNvdW50OiByb29tcy5sZW5ndGgsXG5cdFx0XHR0b3RhbDogdG90YWxDb3VudCxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLm1lbWJlcnMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0LnJpZCwgeyBmaWVsZHM6IHsgYnJvYWRjYXN0OiAxIH0gfSk7XG5cblx0XHRpZiAocm9vbS5icm9hZGNhc3QgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctYnJvYWRjYXN0LW1lbWJlci1saXN0JykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0ID0ge30gfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVJvb21JZChmaW5kUmVzdWx0LnJpZCwge1xuXHRcdFx0ZmllbGRzOiB7ICd1Ll9pZCc6IDEgfSxcblx0XHRcdHNvcnQ6IHsgJ3UudXNlcm5hbWUnOiBzb3J0LnVzZXJuYW1lICE9IG51bGwgPyBzb3J0LnVzZXJuYW1lIDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWwgPSBzdWJzY3JpcHRpb25zLmNvdW50KCk7XG5cblx0XHRjb25zdCBtZW1iZXJzID0gc3Vic2NyaXB0aW9ucy5mZXRjaCgpLm1hcCgocykgPT4gcy51ICYmIHMudS5faWQpO1xuXG5cdFx0Y29uc3QgdXNlcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kKHsgX2lkOiB7ICRpbjogbWVtYmVycyB9IH0sIHtcblx0XHRcdGZpZWxkczogeyBfaWQ6IDEsIHVzZXJuYW1lOiAxLCBuYW1lOiAxLCBzdGF0dXM6IDEsIHV0Y09mZnNldDogMSB9LFxuXHRcdFx0c29ydDogeyB1c2VybmFtZTogIHNvcnQudXNlcm5hbWUgIT0gbnVsbCA/IHNvcnQudXNlcm5hbWUgOiAxIH0sXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lbWJlcnM6IHVzZXJzLFxuXHRcdFx0Y291bnQ6IHVzZXJzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMubWVzc2FnZXMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgcmlkOiBmaW5kUmVzdWx0LnJpZCB9KTtcblxuXHRcdGNvbnN0IG1lc3NhZ2VzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IHRzOiAtMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZXNzYWdlcyxcblx0XHRcdGNvdW50OiBtZXNzYWdlcy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZChvdXJRdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuLy8gVE9ETzogQ0FDSEU6IHNhbWUgYXMgY2hhbm5lbHMub25saW5lXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLm9ubGluZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHQ6ICdwJyB9KTtcblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lKG91clF1ZXJ5KTtcblxuXHRcdGlmIChyb29tID09IG51bGwpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdHcm91cCBkb2VzIG5vdCBleGlzdHMnKTtcblx0XHR9XG5cblx0XHRjb25zdCBvbmxpbmUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kVXNlcnNOb3RPZmZsaW5lKHtcblx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdH0sXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdGNvbnN0IG9ubGluZUluUm9vbSA9IFtdO1xuXHRcdG9ubGluZS5mb3JFYWNoKCh1c2VyKSA9PiB7XG5cdFx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb290Ll9pZCwgdXNlci5faWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXHRcdFx0aWYgKHN1YnNjcmlwdGlvbikge1xuXHRcdFx0XHRvbmxpbmVJblJvb20ucHVzaCh7XG5cdFx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRvbmxpbmU6IG9ubGluZUluUm9vbSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLm9wZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0Lm9wZW4pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgcHJpdmF0ZSBncm91cCwgJHsgZmluZFJlc3VsdC5uYW1lIH0sIGlzIGFscmVhZHkgb3BlbiBmb3IgdGhlIHNlbmRlcmApO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdvcGVuUm9vbScsIGZpbmRSZXN1bHQucmlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5yZW1vdmVNb2RlcmF0b3InLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgncmVtb3ZlUm9vbU1vZGVyYXRvcicsIGZpbmRSZXN1bHQucmlkLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMucmVtb3ZlT3duZXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgncmVtb3ZlUm9vbU93bmVyJywgZmluZFJlc3VsdC5yaWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5yZW1vdmVMZWFkZXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgncmVtb3ZlUm9vbUxlYWRlcicsIGZpbmRSZXN1bHQucmlkLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMucmVuYW1lJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm5hbWUgfHwgIXRoaXMuYm9keVBhcmFtcy5uYW1lLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJuYW1lXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHsgcm9vbUlkOiB0aGlzLmJvZHlQYXJhbXMucm9vbUlkIH0sIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQucmlkLCAncm9vbU5hbWUnLCB0aGlzLmJvZHlQYXJhbXMubmFtZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRncm91cDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5yaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuc2V0Q3VzdG9tRmllbGRzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcyB8fCAhKHR5cGVvZiB0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzID09PSAnb2JqZWN0JykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwiY3VzdG9tRmllbGRzXCIgaXMgcmVxdWlyZWQgd2l0aCBhIHR5cGUgbGlrZSBvYmplY3QuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yaWQsICdyb29tQ3VzdG9tRmllbGRzJywgdGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRncm91cDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5yaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuc2V0RGVzY3JpcHRpb24nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb24gfHwgIXRoaXMuYm9keVBhcmFtcy5kZXNjcmlwdGlvbi50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwiZGVzY3JpcHRpb25cIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQucmlkLCAncm9vbURlc2NyaXB0aW9uJywgdGhpcy5ib2R5UGFyYW1zLmRlc2NyaXB0aW9uKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGRlc2NyaXB0aW9uOiB0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb24sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5zZXRQdXJwb3NlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLnB1cnBvc2UgfHwgIXRoaXMuYm9keVBhcmFtcy5wdXJwb3NlLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJwdXJwb3NlXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0LnJpZCwgJ3Jvb21EZXNjcmlwdGlvbicsIHRoaXMuYm9keVBhcmFtcy5wdXJwb3NlKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHB1cnBvc2U6IHRoaXMuYm9keVBhcmFtcy5wdXJwb3NlLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuc2V0UmVhZE9ubHknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKHR5cGVvZiB0aGlzLmJvZHlQYXJhbXMucmVhZE9ubHkgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcInJlYWRPbmx5XCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0aWYgKGZpbmRSZXN1bHQucm8gPT09IHRoaXMuYm9keVBhcmFtcy5yZWFkT25seSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBwcml2YXRlIGdyb3VwIHJlYWQgb25seSBzZXR0aW5nIGlzIHRoZSBzYW1lIGFzIHdoYXQgaXQgd291bGQgYmUgY2hhbmdlZCB0by4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQucmlkLCAncmVhZE9ubHknLCB0aGlzLmJvZHlQYXJhbXMucmVhZE9ubHkpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnNldFRvcGljJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLnRvcGljIHx8ICF0aGlzLmJvZHlQYXJhbXMudG9waWMudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcInRvcGljXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0LnJpZCwgJ3Jvb21Ub3BpYycsIHRoaXMuYm9keVBhcmFtcy50b3BpYyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR0b3BpYzogdGhpcy5ib2R5UGFyYW1zLnRvcGljLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuc2V0VHlwZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50eXBlIHx8ICF0aGlzLmJvZHlQYXJhbXMudHlwZS50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwidHlwZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0LnQgPT09IHRoaXMuYm9keVBhcmFtcy50eXBlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHByaXZhdGUgZ3JvdXAgdHlwZSBpcyB0aGUgc2FtZSBhcyB3aGF0IGl0IHdvdWxkIGJlIGNoYW5nZWQgdG8uJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0LnJpZCwgJ3Jvb21UeXBlJywgdGhpcy5ib2R5UGFyYW1zLnR5cGUpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnVuYXJjaGl2ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3VuYXJjaGl2ZVJvb20nLCBmaW5kUmVzdWx0LnJpZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMucm9sZXMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0Y29uc3Qgcm9sZXMgPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnZ2V0Um9vbVJvbGVzJywgZmluZFJlc3VsdC5yaWQpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHJvbGVzLFxuXHRcdH0pO1xuXHR9LFxufSk7XG4iLCJmdW5jdGlvbiBmaW5kRGlyZWN0TWVzc2FnZVJvb20ocGFyYW1zLCB1c2VyKSB7XG5cdGlmICgoIXBhcmFtcy5yb29tSWQgfHwgIXBhcmFtcy5yb29tSWQudHJpbSgpKSAmJiAoIXBhcmFtcy51c2VybmFtZSB8fCAhcGFyYW1zLnVzZXJuYW1lLnRyaW0oKSkpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLXBhcmFtLW5vdC1wcm92aWRlZCcsICdCb2R5IHBhcmFtIFwicm9vbUlkXCIgb3IgXCJ1c2VybmFtZVwiIGlzIHJlcXVpcmVkJyk7XG5cdH1cblxuXHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5nZXRSb29tQnlOYW1lT3JJZFdpdGhPcHRpb25Ub0pvaW4oe1xuXHRcdGN1cnJlbnRVc2VySWQ6IHVzZXIuX2lkLFxuXHRcdG5hbWVPcklkOiBwYXJhbXMudXNlcm5hbWUgfHwgcGFyYW1zLnJvb21JZCxcblx0XHR0eXBlOiAnZCcsXG5cdH0pO1xuXG5cdGlmICghcm9vbSB8fCByb29tLnQgIT09ICdkJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tbm90LWZvdW5kJywgJ1RoZSByZXF1aXJlZCBcInJvb21JZFwiIG9yIFwidXNlcm5hbWVcIiBwYXJhbSBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCBhbnkgZGlyY3QgbWVzc2FnZScpO1xuXHR9XG5cblx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIHVzZXIuX2lkKTtcblxuXHRyZXR1cm4ge1xuXHRcdHJvb20sXG5cdFx0c3Vic2NyaXB0aW9uLFxuXHR9O1xufVxuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZShbJ2RtLmNyZWF0ZScsICdpbS5jcmVhdGUnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kRGlyZWN0TWVzc2FnZVJvb20odGhpcy5yZXF1ZXN0UGFyYW1zKCksIHRoaXMudXNlcik7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRyb29tOiBmaW5kUmVzdWx0LnJvb20sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5jbG9zZScsICdpbS5jbG9zZSddLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblxuXHRcdGlmICghZmluZFJlc3VsdC5zdWJzY3JpcHRpb24ub3Blbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYFRoZSBkaXJlY3QgbWVzc2FnZSByb29tLCAkeyB0aGlzLmJvZHlQYXJhbXMubmFtZSB9LCBpcyBhbHJlYWR5IGNsb3NlZCB0byB0aGUgc2VuZGVyYCk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2hpZGVSb29tJywgZmluZFJlc3VsdC5yb29tLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0uY291bnRlcnMnLCAnaW0uY291bnRlcnMnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgYWNjZXNzID0gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJyk7XG5cdFx0Y29uc3QgcnVzZXJJZCA9IHRoaXMucmVxdWVzdFBhcmFtcygpLnVzZXJJZDtcblx0XHRsZXQgdXNlciA9IHRoaXMudXNlcklkO1xuXHRcdGxldCB1bnJlYWRzID0gbnVsbDtcblx0XHRsZXQgdXNlck1lbnRpb25zID0gbnVsbDtcblx0XHRsZXQgdW5yZWFkc0Zyb20gPSBudWxsO1xuXHRcdGxldCBqb2luZWQgPSBmYWxzZTtcblx0XHRsZXQgbXNncyA9IG51bGw7XG5cdFx0bGV0IGxhdGVzdCA9IG51bGw7XG5cdFx0bGV0IG1lbWJlcnMgPSBudWxsO1xuXHRcdGxldCBsbSA9IG51bGw7XG5cblx0XHRpZiAocnVzZXJJZCkge1xuXHRcdFx0aWYgKCFhY2Nlc3MpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdFx0fVxuXHRcdFx0dXNlciA9IHJ1c2VySWQ7XG5cdFx0fVxuXHRcdGNvbnN0IHJzID0gZmluZERpcmVjdE1lc3NhZ2VSb29tKHRoaXMucmVxdWVzdFBhcmFtcygpLCB7IF9pZDogdXNlciB9KTtcblx0XHRjb25zdCB7IHJvb20gfSA9IHJzO1xuXHRcdGNvbnN0IGRtID0gcnMuc3Vic2NyaXB0aW9uO1xuXHRcdGxtID0gcm9vbS5sbSA/IHJvb20ubG0gOiByb29tLl91cGRhdGVkQXQ7XG5cblx0XHRpZiAodHlwZW9mIGRtICE9PSAndW5kZWZpbmVkJyAmJiBkbS5vcGVuKSB7XG5cdFx0XHRpZiAoZG0ubHMgJiYgcm9vbS5tc2dzKSB7XG5cdFx0XHRcdHVucmVhZHMgPSBkbS51bnJlYWQ7XG5cdFx0XHRcdHVucmVhZHNGcm9tID0gZG0ubHM7XG5cdFx0XHR9XG5cdFx0XHR1c2VyTWVudGlvbnMgPSBkbS51c2VyTWVudGlvbnM7XG5cdFx0XHRqb2luZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmIChhY2Nlc3MgfHwgam9pbmVkKSB7XG5cdFx0XHRtc2dzID0gcm9vbS5tc2dzO1xuXHRcdFx0bGF0ZXN0ID0gbG07XG5cdFx0XHRtZW1iZXJzID0gcm9vbS51c2Vyc0NvdW50O1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGpvaW5lZCxcblx0XHRcdG1lbWJlcnMsXG5cdFx0XHR1bnJlYWRzLFxuXHRcdFx0dW5yZWFkc0Zyb20sXG5cdFx0XHRtc2dzLFxuXHRcdFx0bGF0ZXN0LFxuXHRcdFx0dXNlck1lbnRpb25zLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0uZmlsZXMnLCAnaW0uZmlsZXMnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblx0XHRjb25zdCBhZGRVc2VyT2JqZWN0VG9FdmVyeU9iamVjdCA9IChmaWxlKSA9PiB7XG5cdFx0XHRpZiAoZmlsZS51c2VySWQpIHtcblx0XHRcdFx0ZmlsZSA9IHRoaXMuaW5zZXJ0VXNlck9iamVjdCh7IG9iamVjdDogZmlsZSwgdXNlcklkOiBmaWxlLnVzZXJJZCB9KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmaWxlO1xuXHRcdH07XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHJpZDogZmluZFJlc3VsdC5yb29tLl9pZCB9KTtcblxuXHRcdGNvbnN0IGZpbGVzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRmaWxlczogZmlsZXMubWFwKGFkZFVzZXJPYmplY3RUb0V2ZXJ5T2JqZWN0KSxcblx0XHRcdGNvdW50OiBmaWxlcy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0uaGlzdG9yeScsICdpbS5oaXN0b3J5J10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kRGlyZWN0TWVzc2FnZVJvb20odGhpcy5yZXF1ZXN0UGFyYW1zKCksIHRoaXMudXNlcik7XG5cblx0XHRsZXQgbGF0ZXN0RGF0ZSA9IG5ldyBEYXRlKCk7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMubGF0ZXN0KSB7XG5cdFx0XHRsYXRlc3REYXRlID0gbmV3IERhdGUodGhpcy5xdWVyeVBhcmFtcy5sYXRlc3QpO1xuXHRcdH1cblxuXHRcdGxldCBvbGRlc3REYXRlID0gdW5kZWZpbmVkO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLm9sZGVzdCkge1xuXHRcdFx0b2xkZXN0RGF0ZSA9IG5ldyBEYXRlKHRoaXMucXVlcnlQYXJhbXMub2xkZXN0KTtcblx0XHR9XG5cblx0XHRjb25zdCBpbmNsdXNpdmUgPSB0aGlzLnF1ZXJ5UGFyYW1zLmluY2x1c2l2ZSB8fCBmYWxzZTtcblxuXHRcdGxldCBjb3VudCA9IDIwO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmNvdW50KSB7XG5cdFx0XHRjb3VudCA9IHBhcnNlSW50KHRoaXMucXVlcnlQYXJhbXMuY291bnQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVucmVhZHMgPSB0aGlzLnF1ZXJ5UGFyYW1zLnVucmVhZHMgfHwgZmFsc2U7XG5cblx0XHRsZXQgcmVzdWx0O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdHJlc3VsdCA9IE1ldGVvci5jYWxsKCdnZXRDaGFubmVsSGlzdG9yeScsIHtcblx0XHRcdFx0cmlkOiBmaW5kUmVzdWx0LnJvb20uX2lkLFxuXHRcdFx0XHRsYXRlc3Q6IGxhdGVzdERhdGUsXG5cdFx0XHRcdG9sZGVzdDogb2xkZXN0RGF0ZSxcblx0XHRcdFx0aW5jbHVzaXZlLFxuXHRcdFx0XHRjb3VudCxcblx0XHRcdFx0dW5yZWFkcyxcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhyZXN1bHQpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0ubWVtYmVycycsICdpbS5tZW1iZXJzJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kRGlyZWN0TWVzc2FnZVJvb20odGhpcy5yZXF1ZXN0UGFyYW1zKCksIHRoaXMudXNlcik7XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWQoZmluZFJlc3VsdC5yb29tLl9pZCwge1xuXHRcdFx0c29ydDogeyAndS51c2VybmFtZSc6ICBzb3J0ICYmIHNvcnQudXNlcm5hbWUgPyBzb3J0LnVzZXJuYW1lIDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWwgPSBjdXJzb3IuY291bnQoKTtcblx0XHRjb25zdCBtZW1iZXJzID0gY3Vyc29yLmZldGNoKCkubWFwKChzKSA9PiBzLnUgJiYgcy51LnVzZXJuYW1lKTtcblxuXHRcdGNvbnN0IHVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh7IHVzZXJuYW1lOiB7ICRpbjogbWVtYmVycyB9IH0sIHtcblx0XHRcdGZpZWxkczogeyBfaWQ6IDEsIHVzZXJuYW1lOiAxLCBuYW1lOiAxLCBzdGF0dXM6IDEsIHV0Y09mZnNldDogMSB9LFxuXHRcdFx0c29ydDogeyB1c2VybmFtZTogIHNvcnQgJiYgc29ydC51c2VybmFtZSA/IHNvcnQudXNlcm5hbWUgOiAxIH0sXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lbWJlcnM6IHVzZXJzLFxuXHRcdFx0Y291bnQ6IG1lbWJlcnMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWwsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5tZXNzYWdlcycsICdpbS5tZXNzYWdlcyddLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZERpcmVjdE1lc3NhZ2VSb29tKHRoaXMucmVxdWVzdFBhcmFtcygpLCB0aGlzLnVzZXIpO1xuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc29sZS5sb2coZmluZFJlc3VsdCk7XG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyByaWQ6IGZpbmRSZXN1bHQucm9vbS5faWQgfSk7XG5cblx0XHRjb25zdCBtZXNzYWdlcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogLTEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXMsXG5cdFx0XHRjb3VudDogbWVzc2FnZXMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnkpLmNvdW50KCksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5tZXNzYWdlcy5vdGhlcnMnLCAnaW0ubWVzc2FnZXMub3RoZXJzJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0VuYWJsZV9EaXJlY3RfTWVzc2FnZV9IaXN0b3J5X0VuZFBvaW50JykgIT09IHRydWUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWVuZHBvaW50LWRpc2FibGVkJywgJ1RoaXMgZW5kcG9pbnQgaXMgZGlzYWJsZWQnLCB7IHJvdXRlOiAnL2FwaS92MS9pbS5tZXNzYWdlcy5vdGhlcnMnIH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IHJvb21JZCB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRpZiAoIXJvb21JZCB8fCAhcm9vbUlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcGFyYW1ldGVyIFwicm9vbUlkXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUlkKTtcblx0XHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAnZCcpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tbm90LWZvdW5kJywgYE5vIGRpcmVjdCBtZXNzYWdlIHJvb20gZm91bmQgYnkgdGhlIGlkIG9mOiAkeyByb29tSWQgfWApO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHJpZDogcm9vbS5faWQgfSk7XG5cblx0XHRjb25zdCBtc2dzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IHRzOiAtMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZXNzYWdlczogbXNncyxcblx0XHRcdG9mZnNldCxcblx0XHRcdGNvdW50OiBtc2dzLmxlbmd0aCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0ubGlzdCcsICdpbS5saXN0J10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQgPSB7IG5hbWU6IDEgfSwgZmllbGRzIH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHQvLyBUT0RPOiBDQUNIRTogQWRkIEJyZWFja2luZyBub3RpY2Ugc2luY2Ugd2UgcmVtb3ZlZCB0aGUgcXVlcnkgcGFyYW1cblxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRCeVN1YnNjcmlwdGlvblR5cGVBbmRVc2VySWQoJ2QnLCB0aGlzLnVzZXJJZCwge1xuXHRcdFx0c29ydCxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHRvdGFsID0gY3Vyc29yLmNvdW50KCk7XG5cdFx0Y29uc3Qgcm9vbXMgPSBjdXJzb3IuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGltczogcm9vbXMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0dG90YWwsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5saXN0LmV2ZXJ5b25lJywgJ2ltLmxpc3QuZXZlcnlvbmUnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXJvb20tYWRtaW5pc3RyYXRpb24nKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgdDogJ2QnIH0pO1xuXG5cdFx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbXM6IHJvb21zLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0Y291bnQ6IHJvb21zLmxlbmd0aCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0ub3BlbicsICdpbS5vcGVuJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZERpcmVjdE1lc3NhZ2VSb29tKHRoaXMucmVxdWVzdFBhcmFtcygpLCB0aGlzLnVzZXIpO1xuXG5cdFx0aWYgKCFmaW5kUmVzdWx0LnN1YnNjcmlwdGlvbi5vcGVuKSB7XG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdE1ldGVvci5jYWxsKCdvcGVuUm9vbScsIGZpbmRSZXN1bHQucm9vbS5faWQpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZShbJ2RtLnNldFRvcGljJywgJ2ltLnNldFRvcGljJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50b3BpYyB8fCAhdGhpcy5ib2R5UGFyYW1zLnRvcGljLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJ0b3BpY1wiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yb29tLl9pZCwgJ3Jvb21Ub3BpYycsIHRoaXMuYm9keVBhcmFtcy50b3BpYyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR0b3BpYzogdGhpcy5ib2R5UGFyYW1zLnRvcGljLFxuXHRcdH0pO1xuXHR9LFxufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnaW50ZWdyYXRpb25zLmNyZWF0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHR0eXBlOiBTdHJpbmcsXG5cdFx0XHRuYW1lOiBTdHJpbmcsXG5cdFx0XHRlbmFibGVkOiBCb29sZWFuLFxuXHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHRcdHVybHM6IE1hdGNoLk1heWJlKFtTdHJpbmddKSxcblx0XHRcdGNoYW5uZWw6IFN0cmluZyxcblx0XHRcdGV2ZW50OiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dHJpZ2dlcldvcmRzOiBNYXRjaC5NYXliZShbU3RyaW5nXSksXG5cdFx0XHRhbGlhczogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdGF2YXRhcjogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdGVtb2ppOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dG9rZW46IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRzY3JpcHRFbmFibGVkOiBCb29sZWFuLFxuXHRcdFx0c2NyaXB0OiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dGFyZ2V0Q2hhbm5lbDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHR9KSk7XG5cblx0XHRsZXQgaW50ZWdyYXRpb247XG5cblx0XHRzd2l0Y2ggKHRoaXMuYm9keVBhcmFtcy50eXBlKSB7XG5cdFx0XHRjYXNlICd3ZWJob29rLW91dGdvaW5nJzpcblx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gTWV0ZW9yLmNhbGwoJ2FkZE91dGdvaW5nSW50ZWdyYXRpb24nLCB0aGlzLmJvZHlQYXJhbXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd3ZWJob29rLWluY29taW5nJzpcblx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gTWV0ZW9yLmNhbGwoJ2FkZEluY29taW5nSW50ZWdyYXRpb24nLCB0aGlzLmJvZHlQYXJhbXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBpbnRlZ3JhdGlvbiB0eXBlLicpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgaW50ZWdyYXRpb24gfSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2ludGVncmF0aW9ucy5oaXN0b3J5JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMucXVlcnlQYXJhbXMuaWQgfHwgdGhpcy5xdWVyeVBhcmFtcy5pZC50cmltKCkgPT09ICcnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBpbnRlZ3JhdGlvbiBpZC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IGlkIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgJ2ludGVncmF0aW9uLl9pZCc6IGlkIH0pO1xuXHRcdGNvbnN0IGhpc3RvcnkgPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbkhpc3RvcnkuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IF91cGRhdGVkQXQ6IC0xIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHMsXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGhpc3RvcnksXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRpdGVtczogaGlzdG9yeS5sZW5ndGgsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25IaXN0b3J5LmZpbmQob3VyUXVlcnkpLmNvdW50KCksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2ludGVncmF0aW9ucy5saXN0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5KTtcblx0XHRjb25zdCBpbnRlZ3JhdGlvbnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IHRzOiAtMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbnRlZ3JhdGlvbnMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRpdGVtczogaW50ZWdyYXRpb25zLmxlbmd0aCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnaW50ZWdyYXRpb25zLnJlbW92ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHR0eXBlOiBTdHJpbmcsXG5cdFx0XHR0YXJnZXRfdXJsOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0aW50ZWdyYXRpb25JZDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHR9KSk7XG5cblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50YXJnZXRfdXJsICYmICF0aGlzLmJvZHlQYXJhbXMuaW50ZWdyYXRpb25JZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0FuIGludGVncmF0aW9uSWQgb3IgdGFyZ2V0X3VybCBuZWVkcyB0byBiZSBwcm92aWRlZC4nKTtcblx0XHR9XG5cblx0XHRsZXQgaW50ZWdyYXRpb247XG5cdFx0c3dpdGNoICh0aGlzLmJvZHlQYXJhbXMudHlwZSkge1xuXHRcdFx0Y2FzZSAnd2ViaG9vay1vdXRnb2luZyc6XG5cdFx0XHRcdGlmICh0aGlzLmJvZHlQYXJhbXMudGFyZ2V0X3VybCkge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmRPbmUoeyB1cmxzOiB0aGlzLmJvZHlQYXJhbXMudGFyZ2V0X3VybCB9KTtcblx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLmJvZHlQYXJhbXMuaW50ZWdyYXRpb25JZCkge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmRPbmUoeyBfaWQ6IHRoaXMuYm9keVBhcmFtcy5pbnRlZ3JhdGlvbklkIH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCFpbnRlZ3JhdGlvbikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdObyBpbnRlZ3JhdGlvbiBmb3VuZC4nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnZGVsZXRlT3V0Z29pbmdJbnRlZ3JhdGlvbicsIGludGVncmF0aW9uLl9pZCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHRpbnRlZ3JhdGlvbixcblx0XHRcdFx0fSk7XG5cdFx0XHRjYXNlICd3ZWJob29rLWluY29taW5nJzpcblx0XHRcdFx0aW50ZWdyYXRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZE9uZSh7IF9pZDogdGhpcy5ib2R5UGFyYW1zLmludGVncmF0aW9uSWQgfSk7XG5cblx0XHRcdFx0aWYgKCFpbnRlZ3JhdGlvbikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdObyBpbnRlZ3JhdGlvbiBmb3VuZC4nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnZGVsZXRlSW5jb21pbmdJbnRlZ3JhdGlvbicsIGludGVncmF0aW9uLl9pZCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHRpbnRlZ3JhdGlvbixcblx0XHRcdFx0fSk7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBpbnRlZ3JhdGlvbiB0eXBlLicpO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnaW5mbycsIHsgYXV0aFJlcXVpcmVkOiBmYWxzZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRMb2dnZWRJblVzZXIoKTtcblxuXHRcdGlmICh1c2VyICYmIFJvY2tldENoYXQuYXV0aHouaGFzUm9sZSh1c2VyLl9pZCwgJ2FkbWluJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0aW5mbzogUm9ja2V0Q2hhdC5JbmZvLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0aW5mbzoge1xuXHRcdFx0XHR2ZXJzaW9uOiBSb2NrZXRDaGF0LkluZm8udmVyc2lvbixcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ21lJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3ModGhpcy5nZXRVc2VySW5mbyhSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVzZXJJZCkpKTtcblx0fSxcbn0pO1xuXG5sZXQgb25saW5lQ2FjaGUgPSAwO1xubGV0IG9ubGluZUNhY2hlRGF0ZSA9IDA7XG5jb25zdCBjYWNoZUludmFsaWQgPSA2MDAwMDsgLy8gMSBtaW51dGVcblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzaGllbGQuc3ZnJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgdHlwZSwgY2hhbm5lbCwgbmFtZSwgaWNvbiB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW5hYmxlX1NoaWVsZHMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItZW5kcG9pbnQtZGlzYWJsZWQnLCAnVGhpcyBlbmRwb2ludCBpcyBkaXNhYmxlZCcsIHsgcm91dGU6ICcvYXBpL3YxL3NoaWVsZC5zdmcnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHR5cGVzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9TaGllbGRfVHlwZXMnKTtcblx0XHRpZiAodHlwZSAmJiAodHlwZXMgIT09ICcqJyAmJiAhdHlwZXMuc3BsaXQoJywnKS5tYXAoKHQpID0+IHQudHJpbSgpKS5pbmNsdWRlcyh0eXBlKSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXNoaWVsZC1kaXNhYmxlZCcsICdUaGlzIHNoaWVsZCB0eXBlIGlzIGRpc2FibGVkJywgeyByb3V0ZTogJy9hcGkvdjEvc2hpZWxkLnN2ZycgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaGlkZUljb24gPSBpY29uID09PSAnZmFsc2UnO1xuXHRcdGlmIChoaWRlSWNvbiAmJiAoIW5hbWUgfHwgIW5hbWUudHJpbSgpKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ05hbWUgY2Fubm90IGJlIGVtcHR5IHdoZW4gaWNvbiBpcyBoaWRkZW4nKTtcblx0XHR9XG5cblx0XHRsZXQgdGV4dDtcblx0XHRsZXQgYmFja2dyb3VuZENvbG9yID0gJyM0YzEnO1xuXHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0Y2FzZSAnb25saW5lJzpcblx0XHRcdFx0aWYgKERhdGUubm93KCkgLSBvbmxpbmVDYWNoZURhdGUgPiBjYWNoZUludmFsaWQpIHtcblx0XHRcdFx0XHRvbmxpbmVDYWNoZSA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRVc2Vyc05vdE9mZmxpbmUoKS5jb3VudCgpO1xuXHRcdFx0XHRcdG9ubGluZUNhY2hlRGF0ZSA9IERhdGUubm93KCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0ZXh0ID0gYCR7IG9ubGluZUNhY2hlIH0gJHsgVEFQaTE4bi5fXygnT25saW5lJykgfWA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnY2hhbm5lbCc6XG5cdFx0XHRcdGlmICghY2hhbm5lbCkge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdTaGllbGQgY2hhbm5lbCBpcyByZXF1aXJlZCBmb3IgdHlwZSBcImNoYW5uZWxcIicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGV4dCA9IGAjJHsgY2hhbm5lbCB9YDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd1c2VyJzpcblx0XHRcdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdFx0XHQvLyBSZXNwZWN0IHRoZSBzZXJ2ZXIncyBjaG9pY2UgZm9yIHVzaW5nIHRoZWlyIHJlYWwgbmFtZXMgb3Igbm90XG5cdFx0XHRcdGlmICh1c2VyLm5hbWUgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VJX1VzZV9SZWFsX05hbWUnKSkge1xuXHRcdFx0XHRcdHRleHQgPSBgJHsgdXNlci5uYW1lIH1gO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRleHQgPSBgQCR7IHVzZXIudXNlcm5hbWUgfWA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzd2l0Y2ggKHVzZXIuc3RhdHVzKSB7XG5cdFx0XHRcdFx0Y2FzZSAnb25saW5lJzpcblx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvciA9ICcjMWZiMzFmJztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ2F3YXknOlxuXHRcdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yID0gJyNkYzliMDEnO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAnYnVzeSc6XG5cdFx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3IgPSAnI2JjMjAzMSc7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdvZmZsaW5lJzpcblx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvciA9ICcjYTVhMWExJztcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRleHQgPSBUQVBpMThuLl9fKCdKb2luX0NoYXQnKS50b1VwcGVyQ2FzZSgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGljb25TaXplID0gaGlkZUljb24gPyA3IDogMjQ7XG5cdFx0Y29uc3QgbGVmdFNpemUgPSBuYW1lID8gbmFtZS5sZW5ndGggKiA2ICsgNyArIGljb25TaXplIDogaWNvblNpemU7XG5cdFx0Y29uc3QgcmlnaHRTaXplID0gdGV4dC5sZW5ndGggKiA2ICsgMjA7XG5cdFx0Y29uc3Qgd2lkdGggPSBsZWZ0U2l6ZSArIHJpZ2h0U2l6ZTtcblx0XHRjb25zdCBoZWlnaHQgPSAyMDtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2ltYWdlL3N2Zyt4bWw7Y2hhcnNldD11dGYtOCcgfSxcblx0XHRcdGJvZHk6IGBcblx0XHRcdFx0PHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgd2lkdGg9XCIkeyB3aWR0aCB9XCIgaGVpZ2h0PVwiJHsgaGVpZ2h0IH1cIj5cblx0XHRcdFx0ICA8bGluZWFyR3JhZGllbnQgaWQ9XCJiXCIgeDI9XCIwXCIgeTI9XCIxMDAlXCI+XG5cdFx0XHRcdCAgICA8c3RvcCBvZmZzZXQ9XCIwXCIgc3RvcC1jb2xvcj1cIiNiYmJcIiBzdG9wLW9wYWNpdHk9XCIuMVwiLz5cblx0XHRcdFx0ICAgIDxzdG9wIG9mZnNldD1cIjFcIiBzdG9wLW9wYWNpdHk9XCIuMVwiLz5cblx0XHRcdFx0ICA8L2xpbmVhckdyYWRpZW50PlxuXHRcdFx0XHQgIDxtYXNrIGlkPVwiYVwiPlxuXHRcdFx0XHQgICAgPHJlY3Qgd2lkdGg9XCIkeyB3aWR0aCB9XCIgaGVpZ2h0PVwiJHsgaGVpZ2h0IH1cIiByeD1cIjNcIiBmaWxsPVwiI2ZmZlwiLz5cblx0XHRcdFx0ICA8L21hc2s+XG5cdFx0XHRcdCAgPGcgbWFzaz1cInVybCgjYSlcIj5cblx0XHRcdFx0ICAgIDxwYXRoIGZpbGw9XCIjNTU1XCIgZD1cIk0wIDBoJHsgbGVmdFNpemUgfXYkeyBoZWlnaHQgfUgwelwiLz5cblx0XHRcdFx0ICAgIDxwYXRoIGZpbGw9XCIkeyBiYWNrZ3JvdW5kQ29sb3IgfVwiIGQ9XCJNJHsgbGVmdFNpemUgfSAwaCR7IHJpZ2h0U2l6ZSB9diR7IGhlaWdodCB9SCR7IGxlZnRTaXplIH16XCIvPlxuXHRcdFx0XHQgICAgPHBhdGggZmlsbD1cInVybCgjYilcIiBkPVwiTTAgMGgkeyB3aWR0aCB9diR7IGhlaWdodCB9SDB6XCIvPlxuXHRcdFx0XHQgIDwvZz5cblx0XHRcdFx0ICAgICR7IGhpZGVJY29uID8gJycgOiAnPGltYWdlIHg9XCI1XCIgeT1cIjNcIiB3aWR0aD1cIjE0XCIgaGVpZ2h0PVwiMTRcIiB4bGluazpocmVmPVwiL2Fzc2V0cy9mYXZpY29uLnN2Z1wiLz4nIH1cblx0XHRcdFx0ICA8ZyBmaWxsPVwiI2ZmZlwiIGZvbnQtZmFtaWx5PVwiRGVqYVZ1IFNhbnMsVmVyZGFuYSxHZW5ldmEsc2Fucy1zZXJpZlwiIGZvbnQtc2l6ZT1cIjExXCI+XG5cdFx0XHRcdFx0XHQkeyBuYW1lID8gYDx0ZXh0IHg9XCIkeyBpY29uU2l6ZSB9XCIgeT1cIjE1XCIgZmlsbD1cIiMwMTAxMDFcIiBmaWxsLW9wYWNpdHk9XCIuM1wiPiR7IG5hbWUgfTwvdGV4dD5cblx0XHRcdFx0ICAgIDx0ZXh0IHg9XCIkeyBpY29uU2l6ZSB9XCIgeT1cIjE0XCI+JHsgbmFtZSB9PC90ZXh0PmAgOiAnJyB9XG5cdFx0XHRcdCAgICA8dGV4dCB4PVwiJHsgbGVmdFNpemUgKyA3IH1cIiB5PVwiMTVcIiBmaWxsPVwiIzAxMDEwMVwiIGZpbGwtb3BhY2l0eT1cIi4zXCI+JHsgdGV4dCB9PC90ZXh0PlxuXHRcdFx0XHQgICAgPHRleHQgeD1cIiR7IGxlZnRTaXplICsgNyB9XCIgeT1cIjE0XCI+JHsgdGV4dCB9PC90ZXh0PlxuXHRcdFx0XHQgIDwvZz5cblx0XHRcdFx0PC9zdmc+XG5cdFx0XHRgLnRyaW0oKS5yZXBsYWNlKC9cXD5bXFxzXStcXDwvZ20sICc+PCcpLFxuXHRcdH07XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Nwb3RsaWdodCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNoZWNrKHRoaXMucXVlcnlQYXJhbXMsIHtcblx0XHRcdHF1ZXJ5OiBTdHJpbmcsXG5cdFx0fSk7XG5cblx0XHRjb25zdCB7IHF1ZXJ5IH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXG5cdFx0Y29uc3QgcmVzdWx0ID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT5cblx0XHRcdE1ldGVvci5jYWxsKCdzcG90bGlnaHQnLCBxdWVyeSlcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MocmVzdWx0KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZGlyZWN0b3J5JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IHsgdGV4dCwgdHlwZSB9ID0gcXVlcnk7XG5cdFx0aWYgKHNvcnQgJiYgT2JqZWN0LmtleXMoc29ydCkubGVuZ3RoID4gMSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoaXMgbWV0aG9kIHN1cHBvcnQgb25seSBvbmUgXCJzb3J0XCIgcGFyYW1ldGVyJyk7XG5cdFx0fVxuXHRcdGNvbnN0IHNvcnRCeSA9IHNvcnQgPyBPYmplY3Qua2V5cyhzb3J0KVswXSA6IHVuZGVmaW5lZDtcblx0XHRjb25zdCBzb3J0RGlyZWN0aW9uID0gc29ydCAmJiBPYmplY3QudmFsdWVzKHNvcnQpWzBdID09PSAxID8gJ2FzYycgOiAnZGVzYyc7XG5cblx0XHRjb25zdCByZXN1bHQgPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnYnJvd3NlQ2hhbm5lbHMnLCB7XG5cdFx0XHR0ZXh0LFxuXHRcdFx0dHlwZSxcblx0XHRcdHNvcnRCeSxcblx0XHRcdHNvcnREaXJlY3Rpb24sXG5cdFx0XHRvZmZzZXQ6IE1hdGgubWF4KDAsIG9mZnNldCksXG5cdFx0XHRsaW1pdDogTWF0aC5tYXgoMCwgY291bnQpLFxuXHRcdH0pKTtcblxuXHRcdGlmICghcmVzdWx0KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnUGxlYXNlIHZlcmlmeSB0aGUgcGFyYW1ldGVycycpO1xuXHRcdH1cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRyZXN1bHQ6IHJlc3VsdC5yZXN1bHRzLFxuXHRcdFx0Y291bnQ6IHJlc3VsdC5yZXN1bHRzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiByZXN1bHQudG90YWwsXG5cdFx0fSk7XG5cdH0sXG59KTtcbiIsIi8qKlxuXHRUaGlzIEFQSSByZXR1cm5zIGFsbCBwZXJtaXNzaW9ucyB0aGF0IGV4aXN0c1xuXHRvbiB0aGUgc2VydmVyLCB3aXRoIHJlc3BlY3RpdmUgcm9sZXMuXG5cblx0TWV0aG9kOiBHRVRcblx0Um91dGU6IGFwaS92MS9wZXJtaXNzaW9uc1xuICovXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncGVybWlzc2lvbnMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB3YXJuaW5nTWVzc2FnZSA9ICdUaGUgZW5kcG9pbnQgXCJwZXJtaXNzaW9uc1wiIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBhZnRlciB2ZXJzaW9uIHYwLjY5Jztcblx0XHRjb25zb2xlLndhcm4od2FybmluZ01lc3NhZ2UpO1xuXG5cdFx0Y29uc3QgcmVzdWx0ID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3Blcm1pc3Npb25zL2dldCcpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHJlc3VsdCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Blcm1pc3Npb25zLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCByZXN1bHQgPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncGVybWlzc2lvbnMvZ2V0JykpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cGVybWlzc2lvbnM6IHJlc3VsdCxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncGVybWlzc2lvbnMudXBkYXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnYWNjZXNzLXBlcm1pc3Npb25zJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdFZGl0aW5nIHBlcm1pc3Npb25zIGlzIG5vdCBhbGxvd2VkJywgJ2Vycm9yLWVkaXQtcGVybWlzc2lvbnMtbm90LWFsbG93ZWQnKTtcblx0XHR9XG5cblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdHBlcm1pc3Npb25zOiBbXG5cdFx0XHRcdE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRcdFx0X2lkOiBTdHJpbmcsXG5cdFx0XHRcdFx0cm9sZXM6IFtTdHJpbmddLFxuXHRcdFx0XHR9KSxcblx0XHRcdF0sXG5cdFx0fSk7XG5cblx0XHRsZXQgcGVybWlzc2lvbk5vdEZvdW5kID0gZmFsc2U7XG5cdFx0bGV0IHJvbGVOb3RGb3VuZCA9IGZhbHNlO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuYm9keVBhcmFtcy5wZXJtaXNzaW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG5cdFx0XHRjb25zdCBlbGVtZW50ID0gdGhpcy5ib2R5UGFyYW1zLnBlcm1pc3Npb25zW2tleV07XG5cblx0XHRcdGlmICghUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuZmluZE9uZUJ5SWQoZWxlbWVudC5faWQpKSB7XG5cdFx0XHRcdHBlcm1pc3Npb25Ob3RGb3VuZCA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdE9iamVjdC5rZXlzKGVsZW1lbnQucm9sZXMpLmZvckVhY2goKGtleSkgPT4ge1xuXHRcdFx0XHRjb25zdCBzdWJlbGVtZW50ID0gZWxlbWVudC5yb2xlc1trZXldO1xuXG5cdFx0XHRcdGlmICghUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuZmluZE9uZUJ5SWQoc3ViZWxlbWVudCkpIHtcblx0XHRcdFx0XHRyb2xlTm90Rm91bmQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdGlmIChwZXJtaXNzaW9uTm90Rm91bmQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdJbnZhbGlkIHBlcm1pc3Npb24nLCAnZXJyb3ItaW52YWxpZC1wZXJtaXNzaW9uJyk7XG5cdFx0fSBlbHNlIGlmIChyb2xlTm90Rm91bmQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdJbnZhbGlkIHJvbGUnLCAnZXJyb3ItaW52YWxpZC1yb2xlJyk7XG5cdFx0fVxuXG5cdFx0T2JqZWN0LmtleXModGhpcy5ib2R5UGFyYW1zLnBlcm1pc3Npb25zKS5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdGNvbnN0IGVsZW1lbnQgPSB0aGlzLmJvZHlQYXJhbXMucGVybWlzc2lvbnNba2V5XTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoZWxlbWVudC5faWQsIGVsZW1lbnQucm9sZXMpO1xuXHRcdH0pO1xuXG5cdFx0Y29uc3QgcmVzdWx0ID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3Blcm1pc3Npb25zL2dldCcpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHBlcm1pc3Npb25zOiByZXN1bHQsXG5cdFx0fSk7XG5cdH0sXG59KTtcbiIsIi8qIGdsb2JhbHMgUHVzaCAqL1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncHVzaC50b2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHR5cGUsIHZhbHVlLCBhcHBOYW1lIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0bGV0IHsgaWQgfSA9IHRoaXMuYm9keVBhcmFtcztcblxuXHRcdGlmIChpZCAmJiB0eXBlb2YgaWQgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pZC1wYXJhbS1ub3QtdmFsaWQnLCAnVGhlIHJlcXVpcmVkIFwiaWRcIiBib2R5IHBhcmFtIGlzIGludmFsaWQuJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlkID0gUmFuZG9tLmlkKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF0eXBlIHx8ICh0eXBlICE9PSAnYXBuJyAmJiB0eXBlICE9PSAnZ2NtJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXR5cGUtcGFyYW0tbm90LXZhbGlkJywgJ1RoZSByZXF1aXJlZCBcInR5cGVcIiBib2R5IHBhcmFtIGlzIG1pc3Npbmcgb3IgaW52YWxpZC4nKTtcblx0XHR9XG5cblx0XHRpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXRva2VuLXBhcmFtLW5vdC12YWxpZCcsICdUaGUgcmVxdWlyZWQgXCJ2YWx1ZVwiIGJvZHkgcGFyYW0gaXMgbWlzc2luZyBvciBpbnZhbGlkLicpO1xuXHRcdH1cblxuXHRcdGlmICghYXBwTmFtZSB8fCB0eXBlb2YgYXBwTmFtZSAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFwcE5hbWUtcGFyYW0tbm90LXZhbGlkJywgJ1RoZSByZXF1aXJlZCBcImFwcE5hbWVcIiBib2R5IHBhcmFtIGlzIG1pc3Npbmcgb3IgaW52YWxpZC4nKTtcblx0XHR9XG5cblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gcmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ3JhaXg6cHVzaC11cGRhdGUnLCB7XG5cdFx0XHRpZCxcblx0XHRcdHRva2VuOiB7IFt0eXBlXTogdmFsdWUgfSxcblx0XHRcdGFwcE5hbWUsXG5cdFx0XHR1c2VySWQ6IHRoaXMudXNlcklkLFxuXHRcdH0pKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgcmVzdWx0IH0pO1xuXHR9LFxuXHRkZWxldGUoKSB7XG5cdFx0Y29uc3QgeyB0b2tlbiB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXG5cdFx0aWYgKCF0b2tlbiB8fCB0eXBlb2YgdG9rZW4gIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci10b2tlbi1wYXJhbS1ub3QtdmFsaWQnLCAnVGhlIHJlcXVpcmVkIFwidG9rZW5cIiBib2R5IHBhcmFtIGlzIG1pc3Npbmcgb3IgaW52YWxpZC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBhZmZlY3RlZFJlY29yZHMgPSBQdXNoLmFwcENvbGxlY3Rpb24ucmVtb3ZlKHtcblx0XHRcdCRvcjogW3tcblx0XHRcdFx0J3Rva2VuLmFwbic6IHRva2VuLFxuXHRcdFx0fSwge1xuXHRcdFx0XHQndG9rZW4uZ2NtJzogdG9rZW4sXG5cdFx0XHR9XSxcblx0XHRcdHVzZXJJZDogdGhpcy51c2VySWQsXG5cdFx0fSk7XG5cblx0XHRpZiAoYWZmZWN0ZWRSZWNvcmRzID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuLy8gc2V0dGluZ3MgZW5kcG9pbnRzXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc2V0dGluZ3MucHVibGljJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGxldCBvdXJRdWVyeSA9IHtcblx0XHRcdGhpZGRlbjogeyAkbmU6IHRydWUgfSxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHR9O1xuXG5cdFx0b3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgb3VyUXVlcnkpO1xuXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgX2lkOiAxIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHM6IE9iamVjdC5hc3NpZ24oeyBfaWQ6IDEsIHZhbHVlOiAxIH0sIGZpZWxkcyksXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHNldHRpbmdzLFxuXHRcdFx0Y291bnQ6IHNldHRpbmdzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzZXR0aW5ncy5vYXV0aCcsIHsgYXV0aFJlcXVpcmVkOiBmYWxzZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBtb3VudE9BdXRoU2VydmljZXMgPSAoKSA9PiB7XG5cdFx0XHRjb25zdCBvQXV0aFNlcnZpY2VzRW5hYmxlZCA9IFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLmZpbmQoe30sIHsgZmllbGRzOiB7IHNlY3JldDogMCB9IH0pLmZldGNoKCk7XG5cblx0XHRcdHJldHVybiBvQXV0aFNlcnZpY2VzRW5hYmxlZC5tYXAoKHNlcnZpY2UpID0+IHtcblx0XHRcdFx0aWYgKHNlcnZpY2UuY3VzdG9tIHx8IFsnc2FtbCcsICdjYXMnLCAnd29yZHByZXNzJ10uaW5jbHVkZXMoc2VydmljZS5zZXJ2aWNlKSkge1xuXHRcdFx0XHRcdHJldHVybiB7IC4uLnNlcnZpY2UgfTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0X2lkOiBzZXJ2aWNlLl9pZCxcblx0XHRcdFx0XHRuYW1lOiBzZXJ2aWNlLnNlcnZpY2UsXG5cdFx0XHRcdFx0Y2xpZW50SWQ6IHNlcnZpY2UuYXBwSWQgfHwgc2VydmljZS5jbGllbnRJZCB8fCBzZXJ2aWNlLmNvbnN1bWVyS2V5LFxuXHRcdFx0XHRcdGJ1dHRvbkxhYmVsVGV4dDogc2VydmljZS5idXR0b25MYWJlbFRleHQgfHwgJycsXG5cdFx0XHRcdFx0YnV0dG9uQ29sb3I6IHNlcnZpY2UuYnV0dG9uQ29sb3IgfHwgJycsXG5cdFx0XHRcdFx0YnV0dG9uTGFiZWxDb2xvcjogc2VydmljZS5idXR0b25MYWJlbENvbG9yIHx8ICcnLFxuXHRcdFx0XHRcdGN1c3RvbTogZmFsc2UsXG5cdFx0XHRcdH07XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0c2VydmljZXM6IG1vdW50T0F1dGhTZXJ2aWNlcygpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzZXR0aW5ncycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGxldCBvdXJRdWVyeSA9IHtcblx0XHRcdGhpZGRlbjogeyAkbmU6IHRydWUgfSxcblx0XHR9O1xuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXByaXZpbGVnZWQtc2V0dGluZycpKSB7XG5cdFx0XHRvdXJRdWVyeS5wdWJsaWMgPSB0cnVlO1xuXHRcdH1cblxuXHRcdG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIG91clF1ZXJ5KTtcblxuXHRcdGNvbnN0IHNldHRpbmdzID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IF9pZDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzOiBPYmplY3QuYXNzaWduKHsgX2lkOiAxLCB2YWx1ZTogMSB9LCBmaWVsZHMpLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRzZXR0aW5ncyxcblx0XHRcdGNvdW50OiBzZXR0aW5ncy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZChvdXJRdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc2V0dGluZ3MvOl9pZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1wcml2aWxlZ2VkLXNldHRpbmcnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKF8ucGljayhSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lTm90SGlkZGVuQnlJZCh0aGlzLnVybFBhcmFtcy5faWQpLCAnX2lkJywgJ3ZhbHVlJykpO1xuXHR9LFxuXHRwb3N0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnZWRpdC1wcml2aWxlZ2VkLXNldHRpbmcnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdC8vIGFsbG93IHNwZWNpYWwgaGFuZGxpbmcgb2YgcGFydGljdWxhciBzZXR0aW5nIHR5cGVzXG5cdFx0Y29uc3Qgc2V0dGluZyA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmVOb3RIaWRkZW5CeUlkKHRoaXMudXJsUGFyYW1zLl9pZCk7XG5cdFx0aWYgKHNldHRpbmcudHlwZSA9PT0gJ2FjdGlvbicgJiYgdGhpcy5ib2R5UGFyYW1zICYmIHRoaXMuYm9keVBhcmFtcy5leGVjdXRlKSB7XG5cdFx0XHQvLyBleGVjdXRlIHRoZSBjb25maWd1cmVkIG1ldGhvZFxuXHRcdFx0TWV0ZW9yLmNhbGwoc2V0dGluZy52YWx1ZSk7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdH1cblxuXHRcdGlmIChzZXR0aW5nLnR5cGUgPT09ICdjb2xvcicgJiYgdGhpcy5ib2R5UGFyYW1zICYmIHRoaXMuYm9keVBhcmFtcy5lZGl0b3IgJiYgdGhpcy5ib2R5UGFyYW1zLnZhbHVlKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy51cGRhdGVPcHRpb25zQnlJZCh0aGlzLnVybFBhcmFtcy5faWQsIHsgZWRpdG9yOiB0aGlzLmJvZHlQYXJhbXMuZWRpdG9yIH0pO1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MudXBkYXRlVmFsdWVOb3RIaWRkZW5CeUlkKHRoaXMudXJsUGFyYW1zLl9pZCwgdGhpcy5ib2R5UGFyYW1zLnZhbHVlKTtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdFx0fVxuXG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHR2YWx1ZTogTWF0Y2guQW55LFxuXHRcdH0pO1xuXHRcdGlmIChSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy51cGRhdGVWYWx1ZU5vdEhpZGRlbkJ5SWQodGhpcy51cmxQYXJhbXMuX2lkLCB0aGlzLmJvZHlQYXJhbXMudmFsdWUpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3NlcnZpY2UuY29uZmlndXJhdGlvbnMnLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyBTZXJ2aWNlQ29uZmlndXJhdGlvbiB9ID0gUGFja2FnZVsnc2VydmljZS1jb25maWd1cmF0aW9uJ107XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjb25maWd1cmF0aW9uczogU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZCh7fSwgeyBmaWVsZHM6IHsgc2VjcmV0OiAwIH0gfSkuZmV0Y2goKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3N0YXRpc3RpY3MnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRsZXQgcmVmcmVzaCA9IGZhbHNlO1xuXHRcdGlmICh0eXBlb2YgdGhpcy5xdWVyeVBhcmFtcy5yZWZyZXNoICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnF1ZXJ5UGFyYW1zLnJlZnJlc2ggPT09ICd0cnVlJykge1xuXHRcdFx0cmVmcmVzaCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0bGV0IHN0YXRzO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdHN0YXRzID0gTWV0ZW9yLmNhbGwoJ2dldFN0YXRpc3RpY3MnLCByZWZyZXNoKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHN0YXRpc3RpY3M6IHN0YXRzLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzdGF0aXN0aWNzLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctc3RhdGlzdGljcycpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgc3RhdGlzdGljcyA9IFJvY2tldENoYXQubW9kZWxzLlN0YXRpc3RpY3MuZmluZChxdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0c3RhdGlzdGljcyxcblx0XHRcdGNvdW50OiBzdGF0aXN0aWNzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5TdGF0aXN0aWNzLmZpbmQocXVlcnkpLmNvdW50KCksXG5cdFx0fSk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IEJ1c2JveSBmcm9tICdidXNib3knO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuY3JlYXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0ZW1haWw6IFN0cmluZyxcblx0XHRcdG5hbWU6IFN0cmluZyxcblx0XHRcdHBhc3N3b3JkOiBTdHJpbmcsXG5cdFx0XHR1c2VybmFtZTogU3RyaW5nLFxuXHRcdFx0YWN0aXZlOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdHJvbGVzOiBNYXRjaC5NYXliZShBcnJheSksXG5cdFx0XHRqb2luRGVmYXVsdENoYW5uZWxzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdHJlcXVpcmVQYXNzd29yZENoYW5nZTogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRzZW5kV2VsY29tZUVtYWlsOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdHZlcmlmaWVkOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdGN1c3RvbUZpZWxkczogTWF0Y2guTWF5YmUoT2JqZWN0KSxcblx0XHR9KTtcblxuXHRcdC8vIE5ldyBjaGFuZ2UgbWFkZSBieSBwdWxsIHJlcXVlc3QgIzUxNTJcblx0XHRpZiAodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5qb2luRGVmYXVsdENoYW5uZWxzID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5ib2R5UGFyYW1zLmpvaW5EZWZhdWx0Q2hhbm5lbHMgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnZhbGlkYXRlQ3VzdG9tRmllbGRzKHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG5ld1VzZXJJZCA9IFJvY2tldENoYXQuc2F2ZVVzZXIodGhpcy51c2VySWQsIHRoaXMuYm9keVBhcmFtcyk7XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zYXZlQ3VzdG9tRmllbGRzV2l0aG91dFZhbGlkYXRpb24obmV3VXNlcklkLCB0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzKTtcblx0XHR9XG5cblxuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLmFjdGl2ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJBY3RpdmVTdGF0dXMnLCBuZXdVc2VySWQsIHRoaXMuYm9keVBhcmFtcy5hY3RpdmUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyB1c2VyOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChuZXdVc2VySWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pIH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5kZWxldGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdkZWxldGUtdXNlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdkZWxldGVVc2VyJywgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZGVsZXRlT3duQWNjb3VudCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHBhc3N3b3JkIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0aWYgKCFwYXNzd29yZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW1ldGVyIFwicGFzc3dvcmRcIiBpcyByZXF1aXJlZC4nKTtcblx0XHR9XG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfQWxsb3dEZWxldGVPd25BY2NvdW50JykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2RlbGV0ZVVzZXJPd25BY2NvdW50JywgcGFzc3dvcmQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZ2V0QXZhdGFyJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRjb25zdCB1cmwgPSBSb2NrZXRDaGF0LmdldFVSTChgL2F2YXRhci8keyB1c2VyLnVzZXJuYW1lIH1gLCB7IGNkbjogZmFsc2UsIGZ1bGw6IHRydWUgfSk7XG5cdFx0dGhpcy5yZXNwb25zZS5zZXRIZWFkZXIoJ0xvY2F0aW9uJywgdXJsKTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzdGF0dXNDb2RlOiAzMDcsXG5cdFx0XHRib2R5OiB1cmwsXG5cdFx0fTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZ2V0UHJlc2VuY2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAodGhpcy5pc1VzZXJGcm9tUGFyYW1zKCkpIHtcblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVzZXJJZCk7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdHByZXNlbmNlOiB1c2VyLnN0YXR1cyxcblx0XHRcdFx0Y29ubmVjdGlvblN0YXR1czogdXNlci5zdGF0dXNDb25uZWN0aW9uLFxuXHRcdFx0XHRsYXN0TG9naW46IHVzZXIubGFzdExvZ2luLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHByZXNlbmNlOiB1c2VyLnN0YXR1cyxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuaW5mbycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgdXNlcm5hbWUgfSA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0cmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ2dldEZ1bGxVc2VyRGF0YScsIHsgdXNlcm5hbWUsIGxpbWl0OiAxIH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQgfHwgcmVzdWx0Lmxlbmd0aCAhPT0gMSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYEZhaWxlZCB0byBnZXQgdGhlIHVzZXIgZGF0YSBmb3IgdGhlIHVzZXJJZCBvZiBcIiR7IHVzZXJuYW1lIH1cIi5gKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR1c2VyOiByZXN1bHRbMF0sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctZC1yb29tJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCB1c2VycyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmQocXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB1c2VybmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR1c2Vycyxcblx0XHRcdGNvdW50OiB1c2Vycy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZChxdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMucmVnaXN0ZXInLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICh0aGlzLnVzZXJJZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0xvZ2dlZCBpbiB1c2VycyBjYW4gbm90IHJlZ2lzdGVyIGFnYWluLicpO1xuXHRcdH1cblxuXHRcdC8vIFdlIHNldCB0aGVpciB1c2VybmFtZSBoZXJlLCBzbyByZXF1aXJlIGl0XG5cdFx0Ly8gVGhlIGByZWdpc3RlclVzZXJgIGNoZWNrcyBmb3IgdGhlIG90aGVyIHJlcXVpcmVtZW50c1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdHVzZXJuYW1lOiBTdHJpbmcsXG5cdFx0fSkpO1xuXG5cdFx0Ly8gUmVnaXN0ZXIgdGhlIHVzZXJcblx0XHRjb25zdCB1c2VySWQgPSBNZXRlb3IuY2FsbCgncmVnaXN0ZXJVc2VyJywgdGhpcy5ib2R5UGFyYW1zKTtcblxuXHRcdC8vIE5vdyBzZXQgdGhlaXIgdXNlcm5hbWVcblx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3NldFVzZXJuYW1lJywgdGhpcy5ib2R5UGFyYW1zLnVzZXJuYW1lKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHVzZXI6IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXJJZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSkgfSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLnJlc2V0QXZhdGFyJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRpZiAodXNlci5faWQgPT09IHRoaXMudXNlcklkKSB7XG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncmVzZXRBdmF0YXInKSk7XG5cdFx0fSBlbHNlIGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdlZGl0LW90aGVyLXVzZXItaW5mbycpKSB7XG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiBNZXRlb3IuY2FsbCgncmVzZXRBdmF0YXInKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5zZXRBdmF0YXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0YXZhdGFyVXJsOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dXNlcklkOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dXNlcm5hbWU6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0fSkpO1xuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfQWxsb3dVc2VyQXZhdGFyQ2hhbmdlJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ0NoYW5nZSBhdmF0YXIgaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3VzZXJzLnNldEF2YXRhcicsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRsZXQgdXNlcjtcblx0XHRpZiAodGhpcy5pc1VzZXJGcm9tUGFyYW1zKCkpIHtcblx0XHRcdHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh0aGlzLnVzZXJJZCk7XG5cdFx0fSBlbHNlIGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdlZGl0LW90aGVyLXVzZXItaW5mbycpKSB7XG5cdFx0XHR1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5hdmF0YXJVcmwpIHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5zZXRVc2VyQXZhdGFyKHVzZXIsIHRoaXMuYm9keVBhcmFtcy5hdmF0YXJVcmwsICcnLCAndXJsJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCBidXNib3kgPSBuZXcgQnVzYm95KHsgaGVhZGVyczogdGhpcy5yZXF1ZXN0LmhlYWRlcnMgfSk7XG5cblx0XHRcdFx0TWV0ZW9yLndyYXBBc3luYygoY2FsbGJhY2spID0+IHtcblx0XHRcdFx0XHRidXNib3kub24oJ2ZpbGUnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUpID0+IHtcblx0XHRcdFx0XHRcdGlmIChmaWVsZG5hbWUgIT09ICdpbWFnZScpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtZmllbGQnKSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGNvbnN0IGltYWdlRGF0YSA9IFtdO1xuXHRcdFx0XHRcdFx0ZmlsZS5vbignZGF0YScsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdFx0aW1hZ2VEYXRhLnB1c2goZGF0YSk7XG5cdFx0XHRcdFx0XHR9KSk7XG5cblx0XHRcdFx0XHRcdGZpbGUub24oJ2VuZCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNldFVzZXJBdmF0YXIodXNlciwgQnVmZmVyLmNvbmNhdChpbWFnZURhdGEpLCBtaW1ldHlwZSwgJ3Jlc3QnKTtcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0XHRcdH0pKTtcblxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0XHR0aGlzLnJlcXVlc3QucGlwZShidXNib3kpO1xuXHRcdFx0XHR9KSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMudXBkYXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0dXNlcklkOiBTdHJpbmcsXG5cdFx0XHRkYXRhOiBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0XHRlbWFpbDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0bmFtZTogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0cGFzc3dvcmQ6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdHVzZXJuYW1lOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRhY3RpdmU6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRyb2xlczogTWF0Y2guTWF5YmUoQXJyYXkpLFxuXHRcdFx0XHRqb2luRGVmYXVsdENoYW5uZWxzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0cmVxdWlyZVBhc3N3b3JkQ2hhbmdlOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0c2VuZFdlbGNvbWVFbWFpbDogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdHZlcmlmaWVkOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0Y3VzdG9tRmllbGRzOiBNYXRjaC5NYXliZShPYmplY3QpLFxuXHRcdFx0fSksXG5cdFx0fSk7XG5cblx0XHRjb25zdCB1c2VyRGF0YSA9IF8uZXh0ZW5kKHsgX2lkOiB0aGlzLmJvZHlQYXJhbXMudXNlcklkIH0sIHRoaXMuYm9keVBhcmFtcy5kYXRhKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IFJvY2tldENoYXQuc2F2ZVVzZXIodGhpcy51c2VySWQsIHVzZXJEYXRhKSk7XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLmRhdGEuY3VzdG9tRmllbGRzKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVDdXN0b21GaWVsZHModGhpcy5ib2R5UGFyYW1zLnVzZXJJZCwgdGhpcy5ib2R5UGFyYW1zLmRhdGEuY3VzdG9tRmllbGRzKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5kYXRhLmFjdGl2ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJBY3RpdmVTdGF0dXMnLCB0aGlzLmJvZHlQYXJhbXMudXNlcklkLCB0aGlzLmJvZHlQYXJhbXMuZGF0YS5hY3RpdmUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyB1c2VyOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMudXNlcklkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSB9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMudXBkYXRlT3duQmFzaWNJbmZvJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0ZGF0YTogTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdFx0ZW1haWw6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdG5hbWU6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdHVzZXJuYW1lOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRjdXJyZW50UGFzc3dvcmQ6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdG5ld1Bhc3N3b3JkOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0fSksXG5cdFx0XHRjdXN0b21GaWVsZHM6IE1hdGNoLk1heWJlKE9iamVjdCksXG5cdFx0fSk7XG5cblx0XHRjb25zdCB1c2VyRGF0YSA9IHtcblx0XHRcdGVtYWlsOiB0aGlzLmJvZHlQYXJhbXMuZGF0YS5lbWFpbCxcblx0XHRcdHJlYWxuYW1lOiB0aGlzLmJvZHlQYXJhbXMuZGF0YS5uYW1lLFxuXHRcdFx0dXNlcm5hbWU6IHRoaXMuYm9keVBhcmFtcy5kYXRhLnVzZXJuYW1lLFxuXHRcdFx0bmV3UGFzc3dvcmQ6IHRoaXMuYm9keVBhcmFtcy5kYXRhLm5ld1Bhc3N3b3JkLFxuXHRcdFx0dHlwZWRQYXNzd29yZDogdGhpcy5ib2R5UGFyYW1zLmRhdGEuY3VycmVudFBhc3N3b3JkLFxuXHRcdH07XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnc2F2ZVVzZXJQcm9maWxlJywgdXNlckRhdGEsIHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdXNlcjogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodGhpcy51c2VySWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pIH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5jcmVhdGVUb2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXHRcdGxldCBkYXRhO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdGRhdGEgPSBNZXRlb3IuY2FsbCgnY3JlYXRlVG9rZW4nLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGRhdGEgPyBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgZGF0YSB9KSA6IFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5nZXRQcmVmZXJlbmNlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVzZXJJZCk7XG5cdFx0aWYgKHVzZXIuc2V0dGluZ3MpIHtcblx0XHRcdGNvbnN0IHsgcHJlZmVyZW5jZXMgfSA9IHVzZXIuc2V0dGluZ3M7XG5cdFx0XHRwcmVmZXJlbmNlcy5sYW5ndWFnZSA9IHVzZXIubGFuZ3VhZ2U7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0cHJlZmVyZW5jZXMsXG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoVEFQaTE4bi5fXygnQWNjb3VudHNfRGVmYXVsdF9Vc2VyX1ByZWZlcmVuY2VzX25vdF9hdmFpbGFibGUnKS50b1VwcGVyQ2FzZSgpKTtcblx0XHR9XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLnNldFByZWZlcmVuY2VzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0dXNlcklkOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0ZGF0YTogTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdFx0bmV3Um9vbU5vdGlmaWNhdGlvbjogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0bmV3TWVzc2FnZU5vdGlmaWNhdGlvbjogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0dXNlRW1vamlzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0Y29udmVydEFzY2lpRW1vamk6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRzYXZlTW9iaWxlQmFuZHdpZHRoOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0Y29sbGFwc2VNZWRpYUJ5RGVmYXVsdDogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdGF1dG9JbWFnZUxvYWQ6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRlbWFpbE5vdGlmaWNhdGlvbk1vZGU6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdHVucmVhZEFsZXJ0OiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0bm90aWZpY2F0aW9uc1NvdW5kVm9sdW1lOiBNYXRjaC5NYXliZShOdW1iZXIpLFxuXHRcdFx0XHRkZXNrdG9wTm90aWZpY2F0aW9uczogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0bW9iaWxlTm90aWZpY2F0aW9uczogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0ZW5hYmxlQXV0b0F3YXk6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRoaWdobGlnaHRzOiBNYXRjaC5NYXliZShBcnJheSksXG5cdFx0XHRcdGRlc2t0b3BOb3RpZmljYXRpb25EdXJhdGlvbjogTWF0Y2guTWF5YmUoTnVtYmVyKSxcblx0XHRcdFx0bWVzc2FnZVZpZXdNb2RlOiBNYXRjaC5NYXliZShOdW1iZXIpLFxuXHRcdFx0XHRoaWRlVXNlcm5hbWVzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0aGlkZVJvbGVzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0aGlkZUF2YXRhcnM6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRoaWRlRmxleFRhYjogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdHNlbmRPbkVudGVyOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRyb29tQ291bnRlclNpZGViYXI6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRsYW5ndWFnZTogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0c2lkZWJhclNob3dGYXZvcml0ZXM6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0XHRzaWRlYmFyU2hvd1VucmVhZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbiksXG5cdFx0XHRcdHNpZGViYXJTb3J0Ynk6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRcdHNpZGViYXJWaWV3TW9kZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdFx0c2lkZWJhckhpZGVBdmF0YXI6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0XHRzaWRlYmFyR3JvdXBCeVR5cGU6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0XHRtdXRlRm9jdXNlZENvbnZlcnNhdGlvbnM6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0fSksXG5cdFx0fSk7XG5cblx0XHRjb25zdCB1c2VySWQgPSB0aGlzLmJvZHlQYXJhbXMudXNlcklkID8gdGhpcy5ib2R5UGFyYW1zLnVzZXJJZCA6IHRoaXMudXNlcklkO1xuXHRcdGNvbnN0IHVzZXJEYXRhID0ge1xuXHRcdFx0X2lkOiB1c2VySWQsXG5cdFx0XHRzZXR0aW5nczoge1xuXHRcdFx0XHRwcmVmZXJlbmNlczogdGhpcy5ib2R5UGFyYW1zLmRhdGEsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLmRhdGEubGFuZ3VhZ2UpIHtcblx0XHRcdGNvbnN0IHsgbGFuZ3VhZ2UgfSA9IHRoaXMuYm9keVBhcmFtcy5kYXRhO1xuXHRcdFx0ZGVsZXRlIHRoaXMuYm9keVBhcmFtcy5kYXRhLmxhbmd1YWdlO1xuXHRcdFx0dXNlckRhdGEubGFuZ3VhZ2UgPSBsYW5ndWFnZTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBSb2NrZXRDaGF0LnNhdmVVc2VyKHRoaXMudXNlcklkLCB1c2VyRGF0YSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0dXNlcjogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkLCB7XG5cdFx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHRcdCdzZXR0aW5ncy5wcmVmZXJlbmNlcyc6IDEsXG5cdFx0XHRcdH0sXG5cdFx0XHR9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZm9yZ290UGFzc3dvcmQnLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgZW1haWwgfSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRpZiAoIWVtYWlsKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFxcJ2VtYWlsXFwnIHBhcmFtIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZW1haWxTZW50ID0gTWV0ZW9yLmNhbGwoJ3NlbmRGb3Jnb3RQYXNzd29yZEVtYWlsJywgZW1haWwpO1xuXHRcdGlmIChlbWFpbFNlbnQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdFx0fVxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdVc2VyIG5vdCBmb3VuZCcpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5nZXRVc2VybmFtZVN1Z2dlc3Rpb24nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCByZXN1bHQgPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnZ2V0VXNlcm5hbWVTdWdnZXN0aW9uJykpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyByZXN1bHQgfSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLmdlbmVyYXRlUGVyc29uYWxBY2Nlc3NUb2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHRva2VuTmFtZSB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGlmICghdG9rZW5OYW1lKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFxcJ3Rva2VuTmFtZVxcJyBwYXJhbSBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblx0XHRjb25zdCB0b2tlbiA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdwZXJzb25hbEFjY2Vzc1Rva2VuczpnZW5lcmF0ZVRva2VuJywgeyB0b2tlbk5hbWUgfSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyB0b2tlbiB9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMucmVnZW5lcmF0ZVBlcnNvbmFsQWNjZXNzVG9rZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgeyB0b2tlbk5hbWUgfSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRpZiAoIXRva2VuTmFtZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBcXCd0b2tlbk5hbWVcXCcgcGFyYW0gaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cdFx0Y29uc3QgdG9rZW4gPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncGVyc29uYWxBY2Nlc3NUb2tlbnM6cmVnZW5lcmF0ZVRva2VuJywgeyB0b2tlbk5hbWUgfSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyB0b2tlbiB9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZ2V0UGVyc29uYWxBY2Nlc3NUb2tlbnMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW5hYmxlX1BlcnNvbmFsX0FjY2Vzc19Ub2tlbnMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItcGVyc29uYWwtYWNjZXNzLXRva2Vucy1hcmUtY3VycmVudC1kaXNhYmxlZCcsICdQZXJzb25hbCBBY2Nlc3MgVG9rZW5zIGFyZSBjdXJyZW50bHkgZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0Y29uc3QgbG9naW5Ub2tlbnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXRMb2dpblRva2Vuc0J5VXNlcklkKHRoaXMudXNlcklkKS5mZXRjaCgpWzBdO1xuXHRcdGNvbnN0IGdldFBlcnNvbmFsQWNjZXNzVG9rZW5zID0gKCkgPT4gbG9naW5Ub2tlbnMuc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zXG5cdFx0XHQuZmlsdGVyKChsb2dpblRva2VuKSA9PiBsb2dpblRva2VuLnR5cGUgJiYgbG9naW5Ub2tlbi50eXBlID09PSAncGVyc29uYWxBY2Nlc3NUb2tlbicpXG5cdFx0XHQubWFwKChsb2dpblRva2VuKSA9PiAoe1xuXHRcdFx0XHRuYW1lOiBsb2dpblRva2VuLm5hbWUsXG5cdFx0XHRcdGNyZWF0ZWRBdDogbG9naW5Ub2tlbi5jcmVhdGVkQXQsXG5cdFx0XHRcdGxhc3RUb2tlblBhcnQ6IGxvZ2luVG9rZW4ubGFzdFRva2VuUGFydCxcblx0XHRcdH0pKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHRva2VuczogZ2V0UGVyc29uYWxBY2Nlc3NUb2tlbnMoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMucmVtb3ZlUGVyc29uYWxBY2Nlc3NUb2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHRva2VuTmFtZSB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGlmICghdG9rZW5OYW1lKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFxcJ3Rva2VuTmFtZVxcJyBwYXJhbSBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncGVyc29uYWxBY2Nlc3NUb2tlbnM6cmVtb3ZlVG9rZW4nLCB7XG5cdFx0XHR0b2tlbk5hbWUsXG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IEJ1c2JveSBmcm9tICdidXNib3knO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnYXNzZXRzLnNldEFzc2V0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGJ1c2JveSA9IG5ldyBCdXNib3koeyBoZWFkZXJzOiB0aGlzLnJlcXVlc3QuaGVhZGVycyB9KTtcblx0XHRjb25zdCBmaWVsZHMgPSB7fTtcblx0XHRsZXQgYXNzZXQgPSB7fTtcblxuXHRcdE1ldGVvci53cmFwQXN5bmMoKGNhbGxiYWNrKSA9PiB7XG5cdFx0XHRidXNib3kub24oJ2ZpZWxkJywgKGZpZWxkbmFtZSwgdmFsdWUpID0+IGZpZWxkc1tmaWVsZG5hbWVdID0gdmFsdWUpO1xuXHRcdFx0YnVzYm95Lm9uKCdmaWxlJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZmllbGRuYW1lLCBmaWxlLCBmaWxlbmFtZSwgZW5jb2RpbmcsIG1pbWV0eXBlKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGlzVmFsaWRBc3NldCA9IE9iamVjdC5rZXlzKFJvY2tldENoYXQuQXNzZXRzLmFzc2V0cykuaW5jbHVkZXMoZmllbGRuYW1lKTtcblx0XHRcdFx0aWYgKCFpc1ZhbGlkQXNzZXQpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWFzc2V0JywgJ0ludmFsaWQgYXNzZXQnKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgYXNzZXREYXRhID0gW107XG5cdFx0XHRcdGZpbGUub24oJ2RhdGEnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChkYXRhKSA9PiB7XG5cdFx0XHRcdFx0YXNzZXREYXRhLnB1c2goZGF0YSk7XG5cdFx0XHRcdH0pKTtcblxuXHRcdFx0XHRmaWxlLm9uKCdlbmQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcblx0XHRcdFx0XHRhc3NldCA9IHtcblx0XHRcdFx0XHRcdGJ1ZmZlcjogQnVmZmVyLmNvbmNhdChhc3NldERhdGEpLFxuXHRcdFx0XHRcdFx0bmFtZTogZmllbGRuYW1lLFxuXHRcdFx0XHRcdFx0bWltZXR5cGUsXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSkpO1xuXHRcdFx0fSkpO1xuXHRcdFx0YnVzYm95Lm9uKCdmaW5pc2gnLCAoKSA9PiBjYWxsYmFjaygpKTtcblx0XHRcdHRoaXMucmVxdWVzdC5waXBlKGJ1c2JveSk7XG5cdFx0fSkoKTtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnc2V0QXNzZXQnLCBhc3NldC5idWZmZXIsIGFzc2V0Lm1pbWV0eXBlLCBhc3NldC5uYW1lKSk7XG5cdFx0aWYgKGZpZWxkcy5yZWZyZXNoQWxsQ2xpZW50cykge1xuXHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3JlZnJlc2hDbGllbnRzJykpO1xuXHRcdH1cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdhc3NldHMudW5zZXRBc3NldCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IGFzc2V0TmFtZSwgcmVmcmVzaEFsbENsaWVudHMgfSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRjb25zdCBpc1ZhbGlkQXNzZXQgPSBPYmplY3Qua2V5cyhSb2NrZXRDaGF0LkFzc2V0cy5hc3NldHMpLmluY2x1ZGVzKGFzc2V0TmFtZSk7XG5cdFx0aWYgKCFpc1ZhbGlkQXNzZXQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtYXNzZXQnLCAnSW52YWxpZCBhc3NldCcpO1xuXHRcdH1cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgndW5zZXRBc3NldCcsIGFzc2V0TmFtZSkpO1xuXHRcdGlmIChyZWZyZXNoQWxsQ2xpZW50cykge1xuXHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3JlZnJlc2hDbGllbnRzJykpO1xuXHRcdH1cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG4iXX0=
