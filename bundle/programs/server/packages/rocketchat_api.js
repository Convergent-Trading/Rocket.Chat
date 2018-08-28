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
    //Note: required if the developer didn't provide options
    if (typeof endpoints === 'undefined') {
      endpoints = options;
      options = {};
    } //Allow for more than one route using the same option and endpoints


    if (!_.isArray(routes)) {
      routes = [routes];
    }

    const version = this._config.version;
    routes.forEach(route => {
      //Note: This is required due to Restivus calling `addRoute` in the constructor of itself
      Object.keys(endpoints).forEach(method => {
        if (typeof endpoints[method] === 'function') {
          endpoints[method] = {
            action: endpoints[method]
          };
        } //Add a try/catch for each endpoint


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
        } //Allow the endpoints to make usage of the logger which respects the user's settings


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

const getUserAuth = function _getUserAuth() {
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
          const result = method.apply(this, arguments);

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
//Convenience method, almost need to turn it into a middleware of sorts
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

  let query;

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
      '_id': this.request.headers['x-user-id'],
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

//Returns the channel IF found otherwise it will return the failure of why it didn't. Check the `statusCode` property
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
    const userId = this.requestParams().userId;
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
  let readOnly = false;

  if (typeof params.readOnly !== 'undefined') {
    readOnly = params.readOnly;
  }

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
    const userId = this.userId;
    const bodyParams = this.bodyParams;
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

    let inclusive = false;

    if (this.queryParams.inclusive) {
      inclusive = this.queryParams.inclusive;
    }

    let count = 20;

    if (this.queryParams.count) {
      count = parseInt(this.queryParams.count);
    }

    let unreads = false;

    if (this.queryParams.unreads) {
      unreads = this.queryParams.unreads;
    }

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
    //This is defined as such only to provide an example of how the routes can be defined :X
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
    }); //Special check for the permissions

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
      Object.keys(notifications).map(notificationKey => {
        Meteor.runAsUser(this.userId, () => Meteor.call('saveNotificationSettings', roomId, notificationKey, notifications[notificationKey]));
      });
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
    let inclusive = false;

    if (typeof this.bodyParams.inclusive !== 'undefined') {
      inclusive = this.bodyParams.inclusive;
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('cleanRoomHistory', {
        roomId: findResult._id,
        latest,
        oldest,
        inclusive,
        limit: this.bodyParams.limit,
        excludePinned: this.bodyParams.excludePinned,
        filesOnly: this.bodyParams.filesOnly,
        fromUsers: this.bodyParams.users
      });
    });
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
      text: String //Using text to be consistant with chat.postMessage

    }));
    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.msgId); //Ensure the message exists

    if (!msg) {
      return RocketChat.API.v1.failure(`No message found with the id of "${this.bodyParams.msgId}".`);
    }

    if (this.bodyParams.roomId !== msg.rid) {
      return RocketChat.API.v1.failure('The room id provided does not match where the message is from.');
    } //Permission checks are already done in the updateMessage method, so no need to duplicate them


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

//Returns the private group subscription IF found otherwise it will return the failure of why it didn't. Check the `statusCode` property
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

}); //Archives a private group only if it wasn't

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

}); //Create Private Group

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

    let readOnly = false;

    if (typeof this.bodyParams.readOnly !== 'undefined') {
      readOnly = this.bodyParams.readOnly;
    }

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

    let inclusive = false;

    if (this.queryParams.inclusive) {
      inclusive = this.queryParams.inclusive;
    }

    let count = 20;

    if (this.queryParams.count) {
      count = parseInt(this.queryParams.count);
    }

    let unreads = false;

    if (this.queryParams.unreads) {
      unreads = this.queryParams.unreads;
    }

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

}); //List Private Groups a user has access to

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
      '_id': user
    });
    const room = rs.room;
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

    let inclusive = false;

    if (this.queryParams.inclusive) {
      inclusive = this.queryParams.inclusive;
    }

    let count = 20;

    if (this.queryParams.count) {
      count = parseInt(this.queryParams.count);
    }

    let unreads = false;

    if (this.queryParams.unreads) {
      unreads = this.queryParams.unreads;
    }

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
    const cursor = RocketChat.models.Subscriptions.findByRoomId(findResult._id, {
      sort: {
        'u.username': sort.username != null ? sort.username : 1
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
        username: sort.username != null ? sort.username : 1
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

    const roomId = this.queryParams.roomId;

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

    const id = this.queryParams.id;
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
        'version': RocketChat.Info.version
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
      page: offset,
      limit: count
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
      'public': true
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
      //execute the configured method
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
    const ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
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
    }); //New change made by pull request #5152

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
    } //We set their username here, so require it
    //The `registerUser` checks for the other requirements


    check(this.bodyParams, Match.ObjectIncluding({
      username: String
    })); //Register the user

    const userId = Meteor.call('registerUser', this.bodyParams); //Now set their username

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
      const preferences = user.settings.preferences;
      preferences['language'] = user.language;
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
      const language = this.bodyParams.data.language;
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

/* Exports */
Package._define("rocketchat:api");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_api.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2FwaS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9yZXF1ZXN0UGFyYW1zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9nZXRQYWdpbmF0aW9uSXRlbXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci9oZWxwZXJzL2dldFVzZXJGcm9tUGFyYW1zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9nZXRVc2VySW5mby5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2hlbHBlcnMvaXNVc2VyRnJvbVBhcmFtcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2hlbHBlcnMvcGFyc2VKc29uUXVlcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci9oZWxwZXJzL2RlcHJlY2F0aW9uV2FybmluZy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2hlbHBlcnMvZ2V0TG9nZ2VkSW5Vc2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9pbnNlcnRVc2VyT2JqZWN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvZGVmYXVsdC9pbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvY2hhbm5lbHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci92MS9yb2xlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL3Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvc3Vic2NyaXB0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2NoYXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci92MS9jb21tYW5kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2Vtb2ppLWN1c3RvbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2dyb3Vwcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2ltLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvaW50ZWdyYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvbWlzYy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL3Blcm1pc3Npb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvcHVzaC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvc3RhdHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci92MS91c2Vycy5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJsb2dnZXIiLCJMb2dnZXIiLCJBUEkiLCJSZXN0aXZ1cyIsImNvbnN0cnVjdG9yIiwicHJvcGVydGllcyIsImF1dGhNZXRob2RzIiwiZmllbGRTZXBhcmF0b3IiLCJkZWZhdWx0RmllbGRzVG9FeGNsdWRlIiwiam9pbkNvZGUiLCJtZW1iZXJzIiwiaW1wb3J0SWRzIiwibGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGUiLCJhdmF0YXJPcmlnaW4iLCJlbWFpbHMiLCJwaG9uZSIsInN0YXR1c0Nvbm5lY3Rpb24iLCJjcmVhdGVkQXQiLCJsYXN0TG9naW4iLCJzZXJ2aWNlcyIsInJlcXVpcmVQYXNzd29yZENoYW5nZSIsInJlcXVpcmVQYXNzd29yZENoYW5nZVJlYXNvbiIsInJvbGVzIiwic3RhdHVzRGVmYXVsdCIsIl91cGRhdGVkQXQiLCJjdXN0b21GaWVsZHMiLCJzZXR0aW5ncyIsImxpbWl0ZWRVc2VyRmllbGRzVG9FeGNsdWRlSWZJc1ByaXZpbGVnZWRVc2VyIiwiX2NvbmZpZyIsImRlZmF1bHRPcHRpb25zRW5kcG9pbnQiLCJfZGVmYXVsdE9wdGlvbnNFbmRwb2ludCIsInJlcXVlc3QiLCJtZXRob2QiLCJoZWFkZXJzIiwiUm9ja2V0Q2hhdCIsImdldCIsInJlc3BvbnNlIiwid3JpdGVIZWFkIiwid3JpdGUiLCJkb25lIiwiaGFzSGVscGVyTWV0aG9kcyIsImhlbHBlck1ldGhvZHMiLCJzaXplIiwiZ2V0SGVscGVyTWV0aG9kcyIsImdldEhlbHBlck1ldGhvZCIsIm5hbWUiLCJhZGRBdXRoTWV0aG9kIiwicHVzaCIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJpc09iamVjdCIsInN0YXR1c0NvZGUiLCJib2R5IiwiZGVidWciLCJmYWlsdXJlIiwiZXJyb3JUeXBlIiwic3RhY2siLCJlcnJvciIsIm5vdEZvdW5kIiwibXNnIiwidW5hdXRob3JpemVkIiwiYWRkUm91dGUiLCJyb3V0ZXMiLCJvcHRpb25zIiwiZW5kcG9pbnRzIiwiaXNBcnJheSIsInZlcnNpb24iLCJmb3JFYWNoIiwicm91dGUiLCJPYmplY3QiLCJrZXlzIiwiYWN0aW9uIiwib3JpZ2luYWxBY3Rpb24iLCJfaW50ZXJuYWxSb3V0ZUFjdGlvbkhhbmRsZXIiLCJyb2NrZXRjaGF0UmVzdEFwaUVuZCIsIm1ldHJpY3MiLCJyb2NrZXRjaGF0UmVzdEFwaSIsInN0YXJ0VGltZXIiLCJ1c2VyX2FnZW50IiwiZW50cnlwb2ludCIsInRvVXBwZXJDYXNlIiwidXJsIiwiYXBwbHkiLCJlIiwidjEiLCJtZXNzYWdlIiwic3RhdHVzIiwiaGVscGVyTWV0aG9kIiwiX2luaXRBdXRoIiwibG9naW5Db21wYXRpYmlsaXR5IiwiYm9keVBhcmFtcyIsInVzZXIiLCJ1c2VybmFtZSIsImVtYWlsIiwicGFzc3dvcmQiLCJjb2RlIiwid2l0aG91dCIsImxlbmd0aCIsImF1dGgiLCJpbmNsdWRlcyIsImhhc2hlZCIsImRpZ2VzdCIsImFsZ29yaXRobSIsInRvdHAiLCJsb2dpbiIsInNlbGYiLCJhdXRoUmVxdWlyZWQiLCJwb3N0IiwiYXJncyIsImdldFVzZXJJbmZvIiwiaW52b2NhdGlvbiIsIkREUENvbW1vbiIsIk1ldGhvZEludm9jYXRpb24iLCJjb25uZWN0aW9uIiwiY2xvc2UiLCJERFAiLCJfQ3VycmVudEludm9jYXRpb24iLCJ3aXRoVmFsdWUiLCJNZXRlb3IiLCJjYWxsIiwicmVhc29uIiwidXNlcnMiLCJmaW5kT25lIiwiX2lkIiwiaWQiLCJ1c2VySWQiLCJ1cGRhdGUiLCJBY2NvdW50cyIsIl9oYXNoTG9naW5Ub2tlbiIsInRva2VuIiwiJHVuc2V0IiwiZGF0YSIsImF1dGhUb2tlbiIsIm1lIiwiZXh0cmFEYXRhIiwib25Mb2dnZWRJbiIsImV4dGVuZCIsImV4dHJhIiwibG9nb3V0IiwiaGFzaGVkVG9rZW4iLCJ0b2tlbkxvY2F0aW9uIiwiaW5kZXgiLCJsYXN0SW5kZXhPZiIsInRva2VuUGF0aCIsInN1YnN0cmluZyIsInRva2VuRmllbGROYW1lIiwidG9rZW5Ub1JlbW92ZSIsInRva2VuUmVtb3ZhbFF1ZXJ5IiwiJHB1bGwiLCJvbkxvZ2dlZE91dCIsImNvbnNvbGUiLCJ3YXJuIiwiZ2V0VXNlckF1dGgiLCJfZ2V0VXNlckF1dGgiLCJpbnZhbGlkUmVzdWx0cyIsInVuZGVmaW5lZCIsInBheWxvYWQiLCJKU09OIiwicGFyc2UiLCJpIiwiYXJndW1lbnRzIiwiTWFwIiwiQXBpQ2xhc3MiLCJjcmVhdGVBcGkiLCJfY3JlYXRlQXBpIiwiZW5hYmxlQ29ycyIsInVzZURlZmF1bHRBdXRoIiwicHJldHR5SnNvbiIsInByb2Nlc3MiLCJlbnYiLCJOT0RFX0VOViIsImtleSIsInZhbHVlIiwiYWRkR3JvdXAiLCJzZWN0aW9uIiwiYWRkIiwidHlwZSIsInB1YmxpYyIsImVuYWJsZVF1ZXJ5Iiwic2V0IiwiX3JlcXVlc3RQYXJhbXMiLCJxdWVyeVBhcmFtcyIsIl9nZXRQYWdpbmF0aW9uSXRlbXMiLCJoYXJkVXBwZXJMaW1pdCIsImRlZmF1bHRDb3VudCIsIm9mZnNldCIsInBhcnNlSW50IiwiY291bnQiLCJfZ2V0VXNlckZyb21QYXJhbXMiLCJkb2VzbnRFeGlzdCIsIl9kb2VzbnRFeGlzdCIsInBhcmFtcyIsInJlcXVlc3RQYXJhbXMiLCJ0cmltIiwibW9kZWxzIiwiVXNlcnMiLCJmaW5kT25lQnlJZCIsImZpbmRPbmVCeVVzZXJuYW1lIiwiRXJyb3IiLCJnZXRJbmZvRnJvbVVzZXJPYmplY3QiLCJ1dGNPZmZzZXQiLCJhY3RpdmUiLCJsYW5ndWFnZSIsIl9nZXRVc2VySW5mbyIsImlzVmVyaWZpZWRFbWFpbCIsIkFycmF5IiwiZmluZCIsInZlcmlmaWVkIiwiZ2V0VXNlclByZWZlcmVuY2VzIiwiZGVmYXVsdFVzZXJTZXR0aW5nUHJlZml4IiwiYWxsRGVmYXVsdFVzZXJTZXR0aW5ncyIsIlJlZ0V4cCIsInJlZHVjZSIsImFjY3VtdWxhdG9yIiwic2V0dGluZyIsInNldHRpbmdXaXRob3V0UHJlZml4IiwicmVwbGFjZSIsImdldFVzZXJQcmVmZXJlbmNlIiwidmVyaWZpZWRFbWFpbCIsImFkZHJlc3MiLCJwcmVmZXJlbmNlcyIsIl9pc1VzZXJGcm9tUGFyYW1zIiwiX3BhcnNlSnNvblF1ZXJ5Iiwic29ydCIsImZpZWxkcyIsIm5vblNlbGVjdGFibGVGaWVsZHMiLCJnZXRGaWVsZHMiLCJhdXRoeiIsImhhc1Blcm1pc3Npb24iLCJjb25jYXQiLCJrIiwic3BsaXQiLCJhc3NpZ24iLCJxdWVyeSIsIm5vblF1ZXJ5YWJsZUZpZWxkcyIsIl9kZXByZWNhdGlvbldhcm5pbmciLCJlbmRwb2ludCIsInZlcnNpb25XaWxsQmVSZW1vdmUiLCJ3YXJuaW5nTWVzc2FnZSIsIndhcm5pbmciLCJfZ2V0TG9nZ2VkSW5Vc2VyIiwiX2FkZFVzZXJUb09iamVjdCIsIm9iamVjdCIsImdldExvZ2dlZEluVXNlciIsImhhc1JvbGUiLCJpbmZvIiwiSW5mbyIsImZpbmRDaGFubmVsQnlJZE9yTmFtZSIsImNoZWNrZWRBcmNoaXZlZCIsInJvb21JZCIsInJvb21OYW1lIiwicm9vbSIsIlJvb21zIiwiZmluZE9uZUJ5TmFtZSIsInQiLCJhcmNoaXZlZCIsImZpbmRSZXN1bHQiLCJydW5Bc1VzZXIiLCJhY3RpdmVVc2Vyc09ubHkiLCJjaGFubmVsIiwiZ2V0VXNlckZyb21QYXJhbXMiLCJzdWIiLCJTdWJzY3JpcHRpb25zIiwiZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkIiwib3BlbiIsImFjY2VzcyIsInVucmVhZHMiLCJ1c2VyTWVudGlvbnMiLCJ1bnJlYWRzRnJvbSIsImpvaW5lZCIsIm1zZ3MiLCJsYXRlc3QiLCJyZXR1cm5Vc2VybmFtZXMiLCJzdWJzY3JpcHRpb24iLCJsbSIsIk1lc3NhZ2VzIiwiY291bnRWaXNpYmxlQnlSb29tSWRCZXR3ZWVuVGltZXN0YW1wc0luY2x1c2l2ZSIsInJpZCIsImxzIiwidHMiLCJ1c2Vyc0NvdW50IiwiY3JlYXRlQ2hhbm5lbFZhbGlkYXRvciIsImNyZWF0ZUNoYW5uZWwiLCJyZWFkT25seSIsImNoYW5uZWxzIiwiY3JlYXRlIiwidmFsaWRhdGUiLCJleGVjdXRlIiwiYWRkVXNlck9iamVjdFRvRXZlcnlPYmplY3QiLCJmaWxlIiwiaW5zZXJ0VXNlck9iamVjdCIsImdldFBhZ2luYXRpb25JdGVtcyIsInBhcnNlSnNvblF1ZXJ5Iiwib3VyUXVlcnkiLCJmaWxlcyIsIlVwbG9hZHMiLCJza2lwIiwibGltaXQiLCJmZXRjaCIsIm1hcCIsInRvdGFsIiwiaW5jbHVkZUFsbFB1YmxpY0NoYW5uZWxzIiwiJGluIiwiaW50ZWdyYXRpb25zIiwiSW50ZWdyYXRpb25zIiwiX2NyZWF0ZWRBdCIsImxhdGVzdERhdGUiLCJEYXRlIiwib2xkZXN0RGF0ZSIsIm9sZGVzdCIsImluY2x1c2l2ZSIsImhhc1Blcm1pc3Npb25Ub1NlZUFsbFB1YmxpY0NoYW5uZWxzIiwicm9vbUlkcyIsImZpbmRCeVVzZXJJZEFuZFR5cGUiLCJzIiwiY3Vyc29yIiwicm9vbXMiLCJmaW5kQnlTdWJzY3JpcHRpb25UeXBlQW5kVXNlcklkIiwidG90YWxDb3VudCIsImJyb2FkY2FzdCIsInN1YnNjcmlwdGlvbnMiLCJmaW5kQnlSb29tSWQiLCJ1IiwibWVzc2FnZXMiLCJvbmxpbmUiLCJmaW5kVXNlcnNOb3RPZmZsaW5lIiwib25saW5lSW5Sb29tIiwicm9vdCIsInRvU3RyaW5nIiwiZGVzY3JpcHRpb24iLCJwdXJwb3NlIiwicm8iLCJ0b3BpYyIsImFubm91bmNlbWVudCIsIm1lbnRpb25zIiwiYWxsTWVudGlvbnMiLCJSb2xlcyIsIkJ1c2JveSIsImZpbmRSb29tQnlJZE9yTmFtZSIsInVwZGF0ZWRTaW5jZSIsInVwZGF0ZWRTaW5jZURhdGUiLCJpc05hTiIsInJlbW92ZSIsInVybFBhcmFtcyIsImJ1c2JveSIsIndyYXBBc3luYyIsImNhbGxiYWNrIiwib24iLCJmaWVsZG5hbWUiLCJmaWxlbmFtZSIsImVuY29kaW5nIiwibWltZXR5cGUiLCJmaWxlRGF0ZSIsImZpbGVCdWZmZXIiLCJCdWZmZXIiLCJiaW5kRW52aXJvbm1lbnQiLCJwaXBlIiwiZmlsZVN0b3JlIiwiRmlsZVVwbG9hZCIsImdldFN0b3JlIiwiZGV0YWlscyIsInVwbG9hZGVkRmlsZSIsImluc2VydCIsImJpbmQiLCJzYXZlTm90aWZpY2F0aW9ucyIsIm5vdGlmaWNhdGlvbnMiLCJub3RpZmljYXRpb25LZXkiLCJmYXZvcml0ZSIsImhhc093blByb3BlcnR5IiwiZXhjbHVkZVBpbm5lZCIsImZpbGVzT25seSIsImZyb21Vc2VycyIsImNoZWNrIiwiU3RyaW5nIiwiZmlyc3RVbnJlYWRNZXNzYWdlIiwiTWF0Y2giLCJPYmplY3RJbmNsdWRpbmciLCJtc2dJZCIsImFzVXNlciIsIk1heWJlIiwiQm9vbGVhbiIsIm5vdyIsImxhc3RVcGRhdGUiLCJtZXNzYWdlSWQiLCJwaW5uZWRNZXNzYWdlIiwibWVzc2FnZVJldHVybiIsInByb2Nlc3NXZWJob29rTWVzc2FnZSIsInNlYXJjaFRleHQiLCJkb2NzIiwic3RhcnJlZCIsInRleHQiLCJlbW9qaSIsInJlYWN0aW9uIiwic2hvdWxkUmVhY3QiLCJtZXNzYWdlUmVhZFJlY2VpcHRzIiwicmVjZWlwdHMiLCJpZ25vcmUiLCJ0ZXN0IiwiY29tbWFuZCIsImNtZCIsInNsYXNoQ29tbWFuZHMiLCJjb21tYW5kcyIsInRvTG93ZXJDYXNlIiwidmFsdWVzIiwiZmlsdGVyIiwicHJvY2Vzc1F1ZXJ5T3B0aW9uc09uUmVzdWx0IiwicnVuIiwiUmFuZG9tIiwicHJldmlldyIsInByZXZpZXdJdGVtIiwiZW1vamlzIiwiZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUiLCJyb29tU3ViIiwiZmluZE9uZUJ5Um9vbU5hbWVBbmRVc2VySWQiLCJncm91cCIsImluY2x1ZGVBbGxQcml2YXRlR3JvdXBzIiwiY2hhbm5lbHNUb1NlYXJjaCIsImlkT3JOYW1lIiwiZmluZE9uZUJ5SWRPck5hbWUiLCJncm91cHMiLCJmaW5kRGlyZWN0TWVzc2FnZVJvb20iLCJnZXRSb29tQnlOYW1lT3JJZFdpdGhPcHRpb25Ub0pvaW4iLCJjdXJyZW50VXNlcklkIiwibmFtZU9ySWQiLCJydXNlcklkIiwicnMiLCJkbSIsInVucmVhZCIsImxvZyIsImltcyIsImVuYWJsZWQiLCJ1cmxzIiwiZXZlbnQiLCJ0cmlnZ2VyV29yZHMiLCJhbGlhcyIsImF2YXRhciIsInNjcmlwdEVuYWJsZWQiLCJzY3JpcHQiLCJ0YXJnZXRDaGFubmVsIiwiaW50ZWdyYXRpb24iLCJoaXN0b3J5IiwiSW50ZWdyYXRpb25IaXN0b3J5IiwiaXRlbXMiLCJ0YXJnZXRfdXJsIiwiaW50ZWdyYXRpb25JZCIsIm9ubGluZUNhY2hlIiwib25saW5lQ2FjaGVEYXRlIiwiY2FjaGVJbnZhbGlkIiwiaWNvbiIsInR5cGVzIiwiaGlkZUljb24iLCJiYWNrZ3JvdW5kQ29sb3IiLCJUQVBpMThuIiwiX18iLCJpY29uU2l6ZSIsImxlZnRTaXplIiwicmlnaHRTaXplIiwid2lkdGgiLCJoZWlnaHQiLCJzb3J0QnkiLCJzb3J0RGlyZWN0aW9uIiwicGFnZSIsInJlc3VsdHMiLCJwZXJtaXNzaW9ucyIsInBlcm1pc3Npb25Ob3RGb3VuZCIsInJvbGVOb3RGb3VuZCIsImVsZW1lbnQiLCJQZXJtaXNzaW9ucyIsInN1YmVsZW1lbnQiLCJjcmVhdGVPclVwZGF0ZSIsImFwcE5hbWUiLCJkZWxldGUiLCJhZmZlY3RlZFJlY29yZHMiLCJQdXNoIiwiYXBwQ29sbGVjdGlvbiIsIiRvciIsImhpZGRlbiIsIiRuZSIsIlNldHRpbmdzIiwibW91bnRPQXV0aFNlcnZpY2VzIiwib0F1dGhTZXJ2aWNlc0VuYWJsZWQiLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsImNvbmZpZ3VyYXRpb25zIiwic2VjcmV0Iiwic2VydmljZSIsImN1c3RvbSIsImNsaWVudElkIiwiYXBwSWQiLCJjb25zdW1lcktleSIsImJ1dHRvbkxhYmVsVGV4dCIsImJ1dHRvbkNvbG9yIiwiYnV0dG9uTGFiZWxDb2xvciIsInBpY2siLCJmaW5kT25lTm90SGlkZGVuQnlJZCIsImVkaXRvciIsInVwZGF0ZU9wdGlvbnNCeUlkIiwidXBkYXRlVmFsdWVOb3RIaWRkZW5CeUlkIiwiQW55IiwiUGFja2FnZSIsInJlZnJlc2giLCJzdGF0cyIsInN0YXRpc3RpY3MiLCJTdGF0aXN0aWNzIiwiam9pbkRlZmF1bHRDaGFubmVscyIsInNlbmRXZWxjb21lRW1haWwiLCJ2YWxpZGF0ZUN1c3RvbUZpZWxkcyIsIm5ld1VzZXJJZCIsInNhdmVVc2VyIiwic2F2ZUN1c3RvbUZpZWxkc1dpdGhvdXRWYWxpZGF0aW9uIiwiZ2V0VVJMIiwiY2RuIiwiZnVsbCIsInNldEhlYWRlciIsImlzVXNlckZyb21QYXJhbXMiLCJwcmVzZW5jZSIsImNvbm5lY3Rpb25TdGF0dXMiLCJhdmF0YXJVcmwiLCJzZXRVc2VyQXZhdGFyIiwiaW1hZ2VEYXRhIiwidXNlckRhdGEiLCJzYXZlQ3VzdG9tRmllbGRzIiwiY3VycmVudFBhc3N3b3JkIiwibmV3UGFzc3dvcmQiLCJyZWFsbmFtZSIsInR5cGVkUGFzc3dvcmQiLCJuZXdSb29tTm90aWZpY2F0aW9uIiwibmV3TWVzc2FnZU5vdGlmaWNhdGlvbiIsInVzZUVtb2ppcyIsImNvbnZlcnRBc2NpaUVtb2ppIiwic2F2ZU1vYmlsZUJhbmR3aWR0aCIsImNvbGxhcHNlTWVkaWFCeURlZmF1bHQiLCJhdXRvSW1hZ2VMb2FkIiwiZW1haWxOb3RpZmljYXRpb25Nb2RlIiwidW5yZWFkQWxlcnQiLCJub3RpZmljYXRpb25zU291bmRWb2x1bWUiLCJOdW1iZXIiLCJkZXNrdG9wTm90aWZpY2F0aW9ucyIsIm1vYmlsZU5vdGlmaWNhdGlvbnMiLCJlbmFibGVBdXRvQXdheSIsImhpZ2hsaWdodHMiLCJkZXNrdG9wTm90aWZpY2F0aW9uRHVyYXRpb24iLCJtZXNzYWdlVmlld01vZGUiLCJoaWRlVXNlcm5hbWVzIiwiaGlkZVJvbGVzIiwiaGlkZUF2YXRhcnMiLCJoaWRlRmxleFRhYiIsInNlbmRPbkVudGVyIiwicm9vbUNvdW50ZXJTaWRlYmFyIiwic2lkZWJhclNob3dGYXZvcml0ZXMiLCJPcHRpb25hbCIsInNpZGViYXJTaG93VW5yZWFkIiwic2lkZWJhclNvcnRieSIsInNpZGViYXJWaWV3TW9kZSIsInNpZGViYXJIaWRlQXZhdGFyIiwic2lkZWJhckdyb3VwQnlUeXBlIiwibXV0ZUZvY3VzZWRDb252ZXJzYXRpb25zIiwiZW1haWxTZW50Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFFTixNQUFNQyxTQUFTLElBQUlDLE1BQUosQ0FBVyxLQUFYLEVBQWtCLEVBQWxCLENBQWY7O0FBRUEsTUFBTUMsR0FBTixTQUFrQkMsUUFBbEIsQ0FBMkI7QUFDMUJDLGNBQVlDLFVBQVosRUFBd0I7QUFDdkIsVUFBTUEsVUFBTjtBQUNBLFNBQUtDLFdBQUwsR0FBbUIsRUFBbkI7QUFDQSxTQUFLQyxjQUFMLEdBQXNCLEdBQXRCO0FBQ0EsU0FBS0Msc0JBQUwsR0FBOEI7QUFDN0JDLGdCQUFVLENBRG1CO0FBRTdCQyxlQUFTLENBRm9CO0FBRzdCQyxpQkFBVztBQUhrQixLQUE5QjtBQUtBLFNBQUtDLDBCQUFMLEdBQWtDO0FBQ2pDQyxvQkFBYyxDQURtQjtBQUVqQ0MsY0FBUSxDQUZ5QjtBQUdqQ0MsYUFBTyxDQUgwQjtBQUlqQ0Msd0JBQWtCLENBSmU7QUFLakNDLGlCQUFXLENBTHNCO0FBTWpDQyxpQkFBVyxDQU5zQjtBQU9qQ0MsZ0JBQVUsQ0FQdUI7QUFRakNDLDZCQUF1QixDQVJVO0FBU2pDQyxtQ0FBNkIsQ0FUSTtBQVVqQ0MsYUFBTyxDQVYwQjtBQVdqQ0MscUJBQWUsQ0FYa0I7QUFZakNDLGtCQUFZLENBWnFCO0FBYWpDQyxvQkFB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LFNBQVNxRSxPQUFPMkksU0FBUCxDQUFpQixLQUFLcEksTUFBdEIsRUFBOEIsTUFBTVAsT0FBT0MsSUFBUCxDQUFZLHVCQUFaLENBQXBDLENBQWY7QUFFQSxXQUFPckYsV0FBV2hDLEdBQVgsQ0FBZWtGLEVBQWYsQ0FBa0JwQyxPQUFsQixDQUEwQjtBQUFFQztBQUFGLEtBQTFCLENBQVA7QUFDQTs7QUFMZ0YsQ0FBbEYsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9hcGkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgUmVzdGl2dXMsIEREUCwgRERQQ29tbW9uICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoJ0FQSScsIHt9KTtcblxuY2xhc3MgQVBJIGV4dGVuZHMgUmVzdGl2dXMge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdFx0dGhpcy5hdXRoTWV0aG9kcyA9IFtdO1xuXHRcdHRoaXMuZmllbGRTZXBhcmF0b3IgPSAnLic7XG5cdFx0dGhpcy5kZWZhdWx0RmllbGRzVG9FeGNsdWRlID0ge1xuXHRcdFx0am9pbkNvZGU6IDAsXG5cdFx0XHRtZW1iZXJzOiAwLFxuXHRcdFx0aW1wb3J0SWRzOiAwXG5cdFx0fTtcblx0XHR0aGlzLmxpbWl0ZWRVc2VyRmllbGRzVG9FeGNsdWRlID0ge1xuXHRcdFx0YXZhdGFyT3JpZ2luOiAwLFxuXHRcdFx0ZW1haWxzOiAwLFxuXHRcdFx0cGhvbmU6IDAsXG5cdFx0XHRzdGF0dXNDb25uZWN0aW9uOiAwLFxuXHRcdFx0Y3JlYXRlZEF0OiAwLFxuXHRcdFx0bGFzdExvZ2luOiAwLFxuXHRcdFx0c2VydmljZXM6IDAsXG5cdFx0XHRyZXF1aXJlUGFzc3dvcmRDaGFuZ2U6IDAsXG5cdFx0XHRyZXF1aXJlUGFzc3dvcmRDaGFuZ2VSZWFzb246IDAsXG5cdFx0XHRyb2xlczogMCxcblx0XHRcdHN0YXR1c0RlZmF1bHQ6IDAsXG5cdFx0XHRfdXBkYXRlZEF0OiAwLFxuXHRcdFx0Y3VzdG9tRmllbGRzOiAwLFxuXHRcdFx0c2V0dGluZ3M6IDBcblx0XHR9O1xuXHRcdHRoaXMubGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGVJZklzUHJpdmlsZWdlZFVzZXIgPSB7XG5cdFx0XHRzZXJ2aWNlczogMFxuXHRcdH07XG5cblx0XHR0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnNFbmRwb2ludCA9IGZ1bmN0aW9uIF9kZWZhdWx0T3B0aW9uc0VuZHBvaW50KCkge1xuXHRcdFx0aWYgKHRoaXMucmVxdWVzdC5tZXRob2QgPT09ICdPUFRJT05TJyAmJiB0aGlzLnJlcXVlc3QuaGVhZGVyc1snYWNjZXNzLWNvbnRyb2wtcmVxdWVzdC1tZXRob2QnXSkge1xuXHRcdFx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9FbmFibGVfQ09SUycpID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0dGhpcy5yZXNwb25zZS53cml0ZUhlYWQoMjAwLCB7XG5cdFx0XHRcdFx0XHQnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9DT1JTX09yaWdpbicpLFxuXHRcdFx0XHRcdFx0J0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnT3JpZ2luLCBYLVJlcXVlc3RlZC1XaXRoLCBDb250ZW50LVR5cGUsIEFjY2VwdCwgWC1Vc2VyLUlkLCBYLUF1dGgtVG9rZW4nXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5yZXNwb25zZS53cml0ZUhlYWQoNDA1KTtcblx0XHRcdFx0XHR0aGlzLnJlc3BvbnNlLndyaXRlKCdDT1JTIG5vdCBlbmFibGVkLiBHbyB0byBcIkFkbWluID4gR2VuZXJhbCA+IFJFU1QgQXBpXCIgdG8gZW5hYmxlIGl0LicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlc3BvbnNlLndyaXRlSGVhZCg0MDQpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmRvbmUoKTtcblx0XHR9O1xuXHR9XG5cblx0aGFzSGVscGVyTWV0aG9kcygpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zaXplICE9PSAwO1xuXHR9XG5cblx0Z2V0SGVscGVyTWV0aG9kcygpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcztcblx0fVxuXG5cdGdldEhlbHBlck1ldGhvZChuYW1lKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLmhlbHBlck1ldGhvZHMuZ2V0KG5hbWUpO1xuXHR9XG5cblx0YWRkQXV0aE1ldGhvZChtZXRob2QpIHtcblx0XHR0aGlzLmF1dGhNZXRob2RzLnB1c2gobWV0aG9kKTtcblx0fVxuXG5cdHN1Y2Nlc3MocmVzdWx0ID0ge30pIHtcblx0XHRpZiAoXy5pc09iamVjdChyZXN1bHQpKSB7XG5cdFx0XHRyZXN1bHQuc3VjY2VzcyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmVzdWx0ID0ge1xuXHRcdFx0c3RhdHVzQ29kZTogMjAwLFxuXHRcdFx0Ym9keTogcmVzdWx0XG5cdFx0fTtcblxuXHRcdGxvZ2dlci5kZWJ1ZygnU3VjY2VzcycsIHJlc3VsdCk7XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZmFpbHVyZShyZXN1bHQsIGVycm9yVHlwZSwgc3RhY2spIHtcblx0XHRpZiAoXy5pc09iamVjdChyZXN1bHQpKSB7XG5cdFx0XHRyZXN1bHQuc3VjY2VzcyA9IGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcjogcmVzdWx0LFxuXHRcdFx0XHRzdGFja1xuXHRcdFx0fTtcblxuXHRcdFx0aWYgKGVycm9yVHlwZSkge1xuXHRcdFx0XHRyZXN1bHQuZXJyb3JUeXBlID0gZXJyb3JUeXBlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJlc3VsdCA9IHtcblx0XHRcdHN0YXR1c0NvZGU6IDQwMCxcblx0XHRcdGJvZHk6IHJlc3VsdFxuXHRcdH07XG5cblx0XHRsb2dnZXIuZGVidWcoJ0ZhaWx1cmUnLCByZXN1bHQpO1xuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdG5vdEZvdW5kKG1zZykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdGF0dXNDb2RlOiA0MDQsXG5cdFx0XHRib2R5OiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcjogbXNnID8gbXNnIDogJ1Jlc291cmNlIG5vdCBmb3VuZCdcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cblx0dW5hdXRob3JpemVkKG1zZykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdGF0dXNDb2RlOiA0MDMsXG5cdFx0XHRib2R5OiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcjogbXNnID8gbXNnIDogJ3VuYXV0aG9yaXplZCdcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cblx0YWRkUm91dGUocm91dGVzLCBvcHRpb25zLCBlbmRwb2ludHMpIHtcblx0XHQvL05vdGU6IHJlcXVpcmVkIGlmIHRoZSBkZXZlbG9wZXIgZGlkbid0IHByb3ZpZGUgb3B0aW9uc1xuXHRcdGlmICh0eXBlb2YgZW5kcG9pbnRzID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0ZW5kcG9pbnRzID0gb3B0aW9ucztcblx0XHRcdG9wdGlvbnMgPSB7fTtcblx0XHR9XG5cblx0XHQvL0FsbG93IGZvciBtb3JlIHRoYW4gb25lIHJvdXRlIHVzaW5nIHRoZSBzYW1lIG9wdGlvbiBhbmQgZW5kcG9pbnRzXG5cdFx0aWYgKCFfLmlzQXJyYXkocm91dGVzKSkge1xuXHRcdFx0cm91dGVzID0gW3JvdXRlc107XG5cdFx0fVxuXG5cdFx0Y29uc3QgdmVyc2lvbiA9IHRoaXMuX2NvbmZpZy52ZXJzaW9uO1xuXG5cdFx0cm91dGVzLmZvckVhY2goKHJvdXRlKSA9PiB7XG5cdFx0XHQvL05vdGU6IFRoaXMgaXMgcmVxdWlyZWQgZHVlIHRvIFJlc3RpdnVzIGNhbGxpbmcgYGFkZFJvdXRlYCBpbiB0aGUgY29uc3RydWN0b3Igb2YgaXRzZWxmXG5cdFx0XHRPYmplY3Qua2V5cyhlbmRwb2ludHMpLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuXHRcdFx0XHRpZiAodHlwZW9mIGVuZHBvaW50c1ttZXRob2RdID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0ZW5kcG9pbnRzW21ldGhvZF0gPSB7IGFjdGlvbjogZW5kcG9pbnRzW21ldGhvZF0gfTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vQWRkIGEgdHJ5L2NhdGNoIGZvciBlYWNoIGVuZHBvaW50XG5cdFx0XHRcdGNvbnN0IG9yaWdpbmFsQWN0aW9uID0gZW5kcG9pbnRzW21ldGhvZF0uYWN0aW9uO1xuXHRcdFx0XHRlbmRwb2ludHNbbWV0aG9kXS5hY3Rpb24gPSBmdW5jdGlvbiBfaW50ZXJuYWxSb3V0ZUFjdGlvbkhhbmRsZXIoKSB7XG5cdFx0XHRcdFx0Y29uc3Qgcm9ja2V0Y2hhdFJlc3RBcGlFbmQgPSBSb2NrZXRDaGF0Lm1ldHJpY3Mucm9ja2V0Y2hhdFJlc3RBcGkuc3RhcnRUaW1lcih7XG5cdFx0XHRcdFx0XHRtZXRob2QsXG5cdFx0XHRcdFx0XHR2ZXJzaW9uLFxuXHRcdFx0XHRcdFx0dXNlcl9hZ2VudDogdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3VzZXItYWdlbnQnXSxcblx0XHRcdFx0XHRcdGVudHJ5cG9pbnQ6IHJvdXRlXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRsb2dnZXIuZGVidWcoYCR7IHRoaXMucmVxdWVzdC5tZXRob2QudG9VcHBlckNhc2UoKSB9OiAkeyB0aGlzLnJlcXVlc3QudXJsIH1gKTtcblx0XHRcdFx0XHRsZXQgcmVzdWx0O1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgPSBvcmlnaW5hbEFjdGlvbi5hcHBseSh0aGlzKTtcblx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0XHRsb2dnZXIuZGVidWcoYCR7IG1ldGhvZCB9ICR7IHJvdXRlIH0gdGhyZXcgYW4gZXJyb3I6YCwgZS5zdGFjayk7XG5cdFx0XHRcdFx0XHRyZXN1bHQgPSBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUubWVzc2FnZSwgZS5lcnJvcik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmVzdWx0ID0gcmVzdWx0IHx8IFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblxuXHRcdFx0XHRcdHJvY2tldGNoYXRSZXN0QXBpRW5kKHtcblx0XHRcdFx0XHRcdHN0YXR1czogcmVzdWx0LnN0YXR1c0NvZGVcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0aWYgKHRoaXMuaGFzSGVscGVyTWV0aG9kcygpKSB7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBbbmFtZSwgaGVscGVyTWV0aG9kXSBvZiB0aGlzLmdldEhlbHBlck1ldGhvZHMoKSkge1xuXHRcdFx0XHRcdFx0ZW5kcG9pbnRzW21ldGhvZF1bbmFtZV0gPSBoZWxwZXJNZXRob2Q7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9BbGxvdyB0aGUgZW5kcG9pbnRzIHRvIG1ha2UgdXNhZ2Ugb2YgdGhlIGxvZ2dlciB3aGljaCByZXNwZWN0cyB0aGUgdXNlcidzIHNldHRpbmdzXG5cdFx0XHRcdGVuZHBvaW50c1ttZXRob2RdLmxvZ2dlciA9IGxvZ2dlcjtcblx0XHRcdH0pO1xuXG5cdFx0XHRzdXBlci5hZGRSb3V0ZShyb3V0ZSwgb3B0aW9ucywgZW5kcG9pbnRzKTtcblx0XHR9KTtcblx0fVxuXG5cdF9pbml0QXV0aCgpIHtcblx0XHRjb25zdCBsb2dpbkNvbXBhdGliaWxpdHkgPSAoYm9keVBhcmFtcykgPT4ge1xuXHRcdFx0Ly8gR3JhYiB0aGUgdXNlcm5hbWUgb3IgZW1haWwgdGhhdCB0aGUgdXNlciBpcyBsb2dnaW5nIGluIHdpdGhcblx0XHRcdGNvbnN0IHt1c2VyLCB1c2VybmFtZSwgZW1haWwsIHBhc3N3b3JkLCBjb2RlfSA9IGJvZHlQYXJhbXM7XG5cblx0XHRcdGlmIChwYXNzd29yZCA9PSBudWxsKSB7XG5cdFx0XHRcdHJldHVybiBib2R5UGFyYW1zO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoXy53aXRob3V0KE9iamVjdC5rZXlzKGJvZHlQYXJhbXMpLCAndXNlcicsICd1c2VybmFtZScsICdlbWFpbCcsICdwYXNzd29yZCcsICdjb2RlJykubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRyZXR1cm4gYm9keVBhcmFtcztcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgYXV0aCA9IHtcblx0XHRcdFx0cGFzc3dvcmRcblx0XHRcdH07XG5cblx0XHRcdGlmICh0eXBlb2YgdXNlciA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0YXV0aC51c2VyID0gdXNlci5pbmNsdWRlcygnQCcpID8ge2VtYWlsOiB1c2VyfSA6IHt1c2VybmFtZTogdXNlcn07XG5cdFx0XHR9IGVsc2UgaWYgKHVzZXJuYW1lKSB7XG5cdFx0XHRcdGF1dGgudXNlciA9IHt1c2VybmFtZX07XG5cdFx0XHR9IGVsc2UgaWYgKGVtYWlsKSB7XG5cdFx0XHRcdGF1dGgudXNlciA9IHtlbWFpbH07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChhdXRoLnVzZXIgPT0gbnVsbCkge1xuXHRcdFx0XHRyZXR1cm4gYm9keVBhcmFtcztcblx0XHRcdH1cblxuXHRcdFx0aWYgKGF1dGgucGFzc3dvcmQuaGFzaGVkKSB7XG5cdFx0XHRcdGF1dGgucGFzc3dvcmQgPSB7XG5cdFx0XHRcdFx0ZGlnZXN0OiBhdXRoLnBhc3N3b3JkLFxuXHRcdFx0XHRcdGFsZ29yaXRobTogJ3NoYS0yNTYnXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjb2RlKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0dG90cDoge1xuXHRcdFx0XHRcdFx0Y29kZSxcblx0XHRcdFx0XHRcdGxvZ2luOiBhdXRoXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYXV0aDtcblx0XHR9O1xuXG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0XHR0aGlzLmFkZFJvdXRlKCdsb2dpbicsIHthdXRoUmVxdWlyZWQ6IGZhbHNlfSwge1xuXHRcdFx0cG9zdCgpIHtcblx0XHRcdFx0Y29uc3QgYXJncyA9IGxvZ2luQ29tcGF0aWJpbGl0eSh0aGlzLmJvZHlQYXJhbXMpO1xuXHRcdFx0XHRjb25zdCBnZXRVc2VySW5mbyA9IHNlbGYuZ2V0SGVscGVyTWV0aG9kKCdnZXRVc2VySW5mbycpO1xuXG5cdFx0XHRcdGNvbnN0IGludm9jYXRpb24gPSBuZXcgRERQQ29tbW9uLk1ldGhvZEludm9jYXRpb24oe1xuXHRcdFx0XHRcdGNvbm5lY3Rpb246IHtcblx0XHRcdFx0XHRcdGNsb3NlKCkge31cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGxldCBhdXRoO1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGF1dGggPSBERFAuX0N1cnJlbnRJbnZvY2F0aW9uLndpdGhWYWx1ZShpbnZvY2F0aW9uLCAoKSA9PiBNZXRlb3IuY2FsbCgnbG9naW4nLCBhcmdzKSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0bGV0IGUgPSBlcnJvcjtcblx0XHRcdFx0XHRpZiAoZXJyb3IucmVhc29uID09PSAnVXNlciBub3QgZm91bmQnKSB7XG5cdFx0XHRcdFx0XHRlID0ge1xuXHRcdFx0XHRcdFx0XHRlcnJvcjogJ1VuYXV0aG9yaXplZCcsXG5cdFx0XHRcdFx0XHRcdHJlYXNvbjogJ1VuYXV0aG9yaXplZCdcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHN0YXR1c0NvZGU6IDQwMSxcblx0XHRcdFx0XHRcdGJvZHk6IHtcblx0XHRcdFx0XHRcdFx0c3RhdHVzOiAnZXJyb3InLFxuXHRcdFx0XHRcdFx0XHRlcnJvcjogZS5lcnJvcixcblx0XHRcdFx0XHRcdFx0bWVzc2FnZTogZS5yZWFzb24gfHwgZS5tZXNzYWdlXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMudXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHtcblx0XHRcdFx0XHRfaWQ6IGF1dGguaWRcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0dGhpcy51c2VySWQgPSB0aGlzLnVzZXIuX2lkO1xuXG5cdFx0XHRcdC8vIFJlbW92ZSB0b2tlbkV4cGlyZXMgdG8ga2VlcCB0aGUgb2xkIGJlaGF2aW9yXG5cdFx0XHRcdE1ldGVvci51c2Vycy51cGRhdGUoe1xuXHRcdFx0XHRcdF9pZDogdGhpcy51c2VyLl9pZCxcblx0XHRcdFx0XHQnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLmhhc2hlZFRva2VuJzogQWNjb3VudHMuX2hhc2hMb2dpblRva2VuKGF1dGgudG9rZW4pXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHQkdW5zZXQ6IHtcblx0XHRcdFx0XHRcdCdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuJC53aGVuJzogMVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Y29uc3QgcmVzcG9uc2UgPSB7XG5cdFx0XHRcdFx0c3RhdHVzOiAnc3VjY2VzcycsXG5cdFx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdFx0dXNlcklkOiB0aGlzLnVzZXJJZCxcblx0XHRcdFx0XHRcdGF1dGhUb2tlbjogYXV0aC50b2tlbixcblx0XHRcdFx0XHRcdG1lOiBnZXRVc2VySW5mbyh0aGlzLnVzZXIpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGNvbnN0IGV4dHJhRGF0YSA9IHNlbGYuX2NvbmZpZy5vbkxvZ2dlZEluICYmIHNlbGYuX2NvbmZpZy5vbkxvZ2dlZEluLmNhbGwodGhpcyk7XG5cblx0XHRcdFx0aWYgKGV4dHJhRGF0YSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0Xy5leHRlbmQocmVzcG9uc2UuZGF0YSwge1xuXHRcdFx0XHRcdFx0ZXh0cmE6IGV4dHJhRGF0YVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgbG9nb3V0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBSZW1vdmUgdGhlIGdpdmVuIGF1dGggdG9rZW4gZnJvbSB0aGUgdXNlcidzIGFjY291bnRcblx0XHRcdGNvbnN0IGF1dGhUb2tlbiA9IHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LWF1dGgtdG9rZW4nXTtcblx0XHRcdGNvbnN0IGhhc2hlZFRva2VuID0gQWNjb3VudHMuX2hhc2hMb2dpblRva2VuKGF1dGhUb2tlbik7XG5cdFx0XHRjb25zdCB0b2tlbkxvY2F0aW9uID0gc2VsZi5fY29uZmlnLmF1dGgudG9rZW47XG5cdFx0XHRjb25zdCBpbmRleCA9IHRva2VuTG9jYXRpb24ubGFzdEluZGV4T2YoJy4nKTtcblx0XHRcdGNvbnN0IHRva2VuUGF0aCA9IHRva2VuTG9jYXRpb24uc3Vic3RyaW5nKDAsIGluZGV4KTtcblx0XHRcdGNvbnN0IHRva2VuRmllbGROYW1lID0gdG9rZW5Mb2NhdGlvbi5zdWJzdHJpbmcoaW5kZXggKyAxKTtcblx0XHRcdGNvbnN0IHRva2VuVG9SZW1vdmUgPSB7fTtcblx0XHRcdHRva2VuVG9SZW1vdmVbdG9rZW5GaWVsZE5hbWVdID0gaGFzaGVkVG9rZW47XG5cdFx0XHRjb25zdCB0b2tlblJlbW92YWxRdWVyeSA9IHt9O1xuXHRcdFx0dG9rZW5SZW1vdmFsUXVlcnlbdG9rZW5QYXRoXSA9IHRva2VuVG9SZW1vdmU7XG5cblx0XHRcdE1ldGVvci51c2Vycy51cGRhdGUodGhpcy51c2VyLl9pZCwge1xuXHRcdFx0XHQkcHVsbDogdG9rZW5SZW1vdmFsUXVlcnlcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCByZXNwb25zZSA9IHtcblx0XHRcdFx0c3RhdHVzOiAnc3VjY2VzcycsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRtZXNzYWdlOiAnWW91XFwndmUgYmVlbiBsb2dnZWQgb3V0ISdcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0Ly8gQ2FsbCB0aGUgbG9nb3V0IGhvb2sgd2l0aCB0aGUgYXV0aGVudGljYXRlZCB1c2VyIGF0dGFjaGVkXG5cdFx0XHRjb25zdCBleHRyYURhdGEgPSBzZWxmLl9jb25maWcub25Mb2dnZWRPdXQgJiYgc2VsZi5fY29uZmlnLm9uTG9nZ2VkT3V0LmNhbGwodGhpcyk7XG5cdFx0XHRpZiAoZXh0cmFEYXRhICE9IG51bGwpIHtcblx0XHRcdFx0Xy5leHRlbmQocmVzcG9uc2UuZGF0YSwge1xuXHRcdFx0XHRcdGV4dHJhOiBleHRyYURhdGFcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0fTtcblxuXHRcdC8qXG5cdFx0XHRBZGQgYSBsb2dvdXQgZW5kcG9pbnQgdG8gdGhlIEFQSVxuXHRcdFx0QWZ0ZXIgdGhlIHVzZXIgaXMgbG9nZ2VkIG91dCwgdGhlIG9uTG9nZ2VkT3V0IGhvb2sgaXMgY2FsbGVkIChzZWUgUmVzdGZ1bGx5LmNvbmZpZ3VyZSgpIGZvclxuXHRcdFx0YWRkaW5nIGhvb2spLlxuXHRcdCovXG5cdFx0cmV0dXJuIHRoaXMuYWRkUm91dGUoJ2xvZ291dCcsIHtcblx0XHRcdGF1dGhSZXF1aXJlZDogdHJ1ZVxuXHRcdH0sIHtcblx0XHRcdGdldCgpIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKCdXYXJuaW5nOiBEZWZhdWx0IGxvZ291dCB2aWEgR0VUIHdpbGwgYmUgcmVtb3ZlZCBpbiBSZXN0aXZ1cyB2MS4wLiBVc2UgUE9TVCBpbnN0ZWFkLicpO1xuXHRcdFx0XHRjb25zb2xlLndhcm4oJyAgICBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2thaG1hbGkvbWV0ZW9yLXJlc3RpdnVzL2lzc3Vlcy8xMDAnKTtcblx0XHRcdFx0cmV0dXJuIGxvZ291dC5jYWxsKHRoaXMpO1xuXHRcdFx0fSxcblx0XHRcdHBvc3Q6IGxvZ291dFxuXHRcdH0pO1xuXHR9XG59XG5cbmNvbnN0IGdldFVzZXJBdXRoID0gZnVuY3Rpb24gX2dldFVzZXJBdXRoKCkge1xuXHRjb25zdCBpbnZhbGlkUmVzdWx0cyA9IFt1bmRlZmluZWQsIG51bGwsIGZhbHNlXTtcblx0cmV0dXJuIHtcblx0XHR0b2tlbjogJ3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy5oYXNoZWRUb2tlbicsXG5cdFx0dXNlcigpIHtcblx0XHRcdGlmICh0aGlzLmJvZHlQYXJhbXMgJiYgdGhpcy5ib2R5UGFyYW1zLnBheWxvYWQpIHtcblx0XHRcdFx0dGhpcy5ib2R5UGFyYW1zID0gSlNPTi5wYXJzZSh0aGlzLmJvZHlQYXJhbXMucGF5bG9hZCk7XG5cdFx0XHR9XG5cblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgUm9ja2V0Q2hhdC5BUEkudjEuYXV0aE1ldGhvZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0Y29uc3QgbWV0aG9kID0gUm9ja2V0Q2hhdC5BUEkudjEuYXV0aE1ldGhvZHNbaV07XG5cblx0XHRcdFx0aWYgKHR5cGVvZiBtZXRob2QgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBtZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdFx0XHRpZiAoIWludmFsaWRSZXN1bHRzLmluY2x1ZGVzKHJlc3VsdCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGxldCB0b2tlbjtcblx0XHRcdGlmICh0aGlzLnJlcXVlc3QuaGVhZGVyc1sneC1hdXRoLXRva2VuJ10pIHtcblx0XHRcdFx0dG9rZW4gPSBBY2NvdW50cy5faGFzaExvZ2luVG9rZW4odGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtYXV0aC10b2tlbiddKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dXNlcklkOiB0aGlzLnJlcXVlc3QuaGVhZGVyc1sneC11c2VyLWlkJ10sXG5cdFx0XHRcdHRva2VuXG5cdFx0XHR9O1xuXHRcdH1cblx0fTtcbn07XG5cblJvY2tldENoYXQuQVBJID0ge1xuXHRoZWxwZXJNZXRob2RzOiBuZXcgTWFwKCksXG5cdGdldFVzZXJBdXRoLFxuXHRBcGlDbGFzczogQVBJXG59O1xuXG5jb25zdCBjcmVhdGVBcGkgPSBmdW5jdGlvbiBfY3JlYXRlQXBpKGVuYWJsZUNvcnMpIHtcblx0aWYgKCFSb2NrZXRDaGF0LkFQSS52MSB8fCBSb2NrZXRDaGF0LkFQSS52MS5fY29uZmlnLmVuYWJsZUNvcnMgIT09IGVuYWJsZUNvcnMpIHtcblx0XHRSb2NrZXRDaGF0LkFQSS52MSA9IG5ldyBBUEkoe1xuXHRcdFx0dmVyc2lvbjogJ3YxJyxcblx0XHRcdHVzZURlZmF1bHRBdXRoOiB0cnVlLFxuXHRcdFx0cHJldHR5SnNvbjogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcsXG5cdFx0XHRlbmFibGVDb3JzLFxuXHRcdFx0YXV0aDogZ2V0VXNlckF1dGgoKVxuXHRcdH0pO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LkFQSS5kZWZhdWx0IHx8IFJvY2tldENoYXQuQVBJLmRlZmF1bHQuX2NvbmZpZy5lbmFibGVDb3JzICE9PSBlbmFibGVDb3JzKSB7XG5cdFx0Um9ja2V0Q2hhdC5BUEkuZGVmYXVsdCA9IG5ldyBBUEkoe1xuXHRcdFx0dXNlRGVmYXVsdEF1dGg6IHRydWUsXG5cdFx0XHRwcmV0dHlKc29uOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jyxcblx0XHRcdGVuYWJsZUNvcnMsXG5cdFx0XHRhdXRoOiBnZXRVc2VyQXV0aCgpXG5cdFx0fSk7XG5cdH1cbn07XG5cbi8vIHJlZ2lzdGVyIHRoZSBBUEkgdG8gYmUgcmUtY3JlYXRlZCBvbmNlIHRoZSBDT1JTLXNldHRpbmcgY2hhbmdlcy5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW5hYmxlX0NPUlMnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRjcmVhdGVBcGkodmFsdWUpO1xufSk7XG5cbi8vIGFsc28gY3JlYXRlIHRoZSBBUEkgaW1tZWRpYXRlbHlcbmNyZWF0ZUFwaSghIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW5hYmxlX0NPUlMnKSk7XG4iLCJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdHZW5lcmFsJywgZnVuY3Rpb24oKSB7XG5cdHRoaXMuc2VjdGlvbignUkVTVCBBUEknLCBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFkZCgnQVBJX1VwcGVyX0NvdW50X0xpbWl0JywgMTAwLCB7IHR5cGU6ICdpbnQnLCBwdWJsaWM6IGZhbHNlIH0pO1xuXHRcdHRoaXMuYWRkKCdBUElfRGVmYXVsdF9Db3VudCcsIDUwLCB7IHR5cGU6ICdpbnQnLCBwdWJsaWM6IGZhbHNlIH0pO1xuXHRcdHRoaXMuYWRkKCdBUElfQWxsb3dfSW5maW5pdGVfQ291bnQnLCB0cnVlLCB7IHR5cGU6ICdib29sZWFuJywgcHVibGljOiBmYWxzZSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX0VuYWJsZV9EaXJlY3RfTWVzc2FnZV9IaXN0b3J5X0VuZFBvaW50JywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBwdWJsaWM6IGZhbHNlIH0pO1xuXHRcdHRoaXMuYWRkKCdBUElfRW5hYmxlX1NoaWVsZHMnLCB0cnVlLCB7IHR5cGU6ICdib29sZWFuJywgcHVibGljOiBmYWxzZSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX1NoaWVsZF9UeXBlcycsICcqJywgeyB0eXBlOiAnc3RyaW5nJywgcHVibGljOiBmYWxzZSwgZW5hYmxlUXVlcnk6IHsgX2lkOiAnQVBJX0VuYWJsZV9TaGllbGRzJywgdmFsdWU6IHRydWUgfSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX0VuYWJsZV9DT1JTJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBwdWJsaWM6IGZhbHNlIH0pO1xuXHRcdHRoaXMuYWRkKCdBUElfQ09SU19PcmlnaW4nLCAnKicsIHsgdHlwZTogJ3N0cmluZycsIHB1YmxpYzogZmFsc2UsIGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0FQSV9FbmFibGVfQ09SUycsIHZhbHVlOiB0cnVlIH0gfSk7XG5cdH0pO1xufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNldCgncmVxdWVzdFBhcmFtcycsIGZ1bmN0aW9uIF9yZXF1ZXN0UGFyYW1zKCkge1xuXHRyZXR1cm4gWydQT1NUJywgJ1BVVCddLmluY2x1ZGVzKHRoaXMucmVxdWVzdC5tZXRob2QpID8gdGhpcy5ib2R5UGFyYW1zIDogdGhpcy5xdWVyeVBhcmFtcztcbn0pO1xuIiwiLy8gSWYgdGhlIGNvdW50IHF1ZXJ5IHBhcmFtIGlzIGhpZ2hlciB0aGFuIHRoZSBcIkFQSV9VcHBlcl9Db3VudF9MaW1pdFwiIHNldHRpbmcsIHRoZW4gd2UgbGltaXQgdGhhdFxuLy8gSWYgdGhlIGNvdW50IHF1ZXJ5IHBhcmFtIGlzbid0IGRlZmluZWQsIHRoZW4gd2Ugc2V0IGl0IHRvIHRoZSBcIkFQSV9EZWZhdWx0X0NvdW50XCIgc2V0dGluZ1xuLy8gSWYgdGhlIGNvdW50IGlzIHplcm8sIHRoZW4gdGhhdCBtZWFucyB1bmxpbWl0ZWQgYW5kIGlzIG9ubHkgYWxsb3dlZCBpZiB0aGUgc2V0dGluZyBcIkFQSV9BbGxvd19JbmZpbml0ZV9Db3VudFwiIGlzIHRydWVcblxuUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ2dldFBhZ2luYXRpb25JdGVtcycsIGZ1bmN0aW9uIF9nZXRQYWdpbmF0aW9uSXRlbXMoKSB7XG5cdGNvbnN0IGhhcmRVcHBlckxpbWl0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9VcHBlcl9Db3VudF9MaW1pdCcpIDw9IDAgPyAxMDAgOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX1VwcGVyX0NvdW50X0xpbWl0Jyk7XG5cdGNvbnN0IGRlZmF1bHRDb3VudCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRGVmYXVsdF9Db3VudCcpIDw9IDAgPyA1MCA6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRGVmYXVsdF9Db3VudCcpO1xuXHRjb25zdCBvZmZzZXQgPSB0aGlzLnF1ZXJ5UGFyYW1zLm9mZnNldCA/IHBhcnNlSW50KHRoaXMucXVlcnlQYXJhbXMub2Zmc2V0KSA6IDA7XG5cdGxldCBjb3VudCA9IGRlZmF1bHRDb3VudDtcblxuXHQvLyBFbnN1cmUgY291bnQgaXMgYW4gYXBwcm9waWF0ZSBhbW91bnRcblx0aWYgKHR5cGVvZiB0aGlzLnF1ZXJ5UGFyYW1zLmNvdW50ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGNvdW50ID0gcGFyc2VJbnQodGhpcy5xdWVyeVBhcmFtcy5jb3VudCk7XG5cdH0gZWxzZSB7XG5cdFx0Y291bnQgPSBkZWZhdWx0Q291bnQ7XG5cdH1cblxuXHRpZiAoY291bnQgPiBoYXJkVXBwZXJMaW1pdCkge1xuXHRcdGNvdW50ID0gaGFyZFVwcGVyTGltaXQ7XG5cdH1cblxuXHRpZiAoY291bnQgPT09IDAgJiYgIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfQWxsb3dfSW5maW5pdGVfQ291bnQnKSkge1xuXHRcdGNvdW50ID0gZGVmYXVsdENvdW50O1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRvZmZzZXQsXG5cdFx0Y291bnRcblx0fTtcbn0pO1xuIiwiLy9Db252ZW5pZW5jZSBtZXRob2QsIGFsbW9zdCBuZWVkIHRvIHR1cm4gaXQgaW50byBhIG1pZGRsZXdhcmUgb2Ygc29ydHNcblJvY2tldENoYXQuQVBJLmhlbHBlck1ldGhvZHMuc2V0KCdnZXRVc2VyRnJvbVBhcmFtcycsIGZ1bmN0aW9uIF9nZXRVc2VyRnJvbVBhcmFtcygpIHtcblx0Y29uc3QgZG9lc250RXhpc3QgPSB7IF9kb2VzbnRFeGlzdDogdHJ1ZSB9O1xuXHRsZXQgdXNlcjtcblx0Y29uc3QgcGFyYW1zID0gdGhpcy5yZXF1ZXN0UGFyYW1zKCk7XG5cblx0aWYgKHBhcmFtcy51c2VySWQgJiYgcGFyYW1zLnVzZXJJZC50cmltKCkpIHtcblx0XHR1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQocGFyYW1zLnVzZXJJZCkgfHwgZG9lc250RXhpc3Q7XG5cdH0gZWxzZSBpZiAocGFyYW1zLnVzZXJuYW1lICYmIHBhcmFtcy51c2VybmFtZS50cmltKCkpIHtcblx0XHR1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUocGFyYW1zLnVzZXJuYW1lKSB8fCBkb2VzbnRFeGlzdDtcblx0fSBlbHNlIGlmIChwYXJhbXMudXNlciAmJiBwYXJhbXMudXNlci50cmltKCkpIHtcblx0XHR1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUocGFyYW1zLnVzZXIpIHx8IGRvZXNudEV4aXN0O1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXVzZXItcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcInVzZXJJZFwiIG9yIFwidXNlcm5hbWVcIiBwYXJhbSB3YXMgbm90IHByb3ZpZGVkJyk7XG5cdH1cblxuXHRpZiAodXNlci5fZG9lc250RXhpc3QpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnVGhlIHJlcXVpcmVkIFwidXNlcklkXCIgb3IgXCJ1c2VybmFtZVwiIHBhcmFtIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIGFueSB1c2VycycpO1xuXHR9XG5cblx0cmV0dXJuIHVzZXI7XG59KTtcbiIsImNvbnN0IGdldEluZm9Gcm9tVXNlck9iamVjdCA9ICh1c2VyKSA9PiB7XG5cdGNvbnN0IHtcblx0XHRfaWQsXG5cdFx0bmFtZSxcblx0XHRlbWFpbHMsXG5cdFx0c3RhdHVzLFxuXHRcdHN0YXR1c0Nvbm5lY3Rpb24sXG5cdFx0dXNlcm5hbWUsXG5cdFx0dXRjT2Zmc2V0LFxuXHRcdGFjdGl2ZSxcblx0XHRsYW5ndWFnZSxcblx0XHRyb2xlcyxcblx0XHRzZXR0aW5ncyxcblx0XHRjdXN0b21GaWVsZHNcblx0fSA9IHVzZXI7XG5cdHJldHVybiB7XG5cdFx0X2lkLFxuXHRcdG5hbWUsXG5cdFx0ZW1haWxzLFxuXHRcdHN0YXR1cyxcblx0XHRzdGF0dXNDb25uZWN0aW9uLFxuXHRcdHVzZXJuYW1lLFxuXHRcdHV0Y09mZnNldCxcblx0XHRhY3RpdmUsXG5cdFx0bGFuZ3VhZ2UsXG5cdFx0cm9sZXMsXG5cdFx0c2V0dGluZ3MsXG5cdFx0Y3VzdG9tRmllbGRzXG5cdH07XG59O1xuXG5cblJvY2tldENoYXQuQVBJLmhlbHBlck1ldGhvZHMuc2V0KCdnZXRVc2VySW5mbycsIGZ1bmN0aW9uIF9nZXRVc2VySW5mbyh1c2VyKSB7XG5cdGNvbnN0IG1lID0gZ2V0SW5mb0Zyb21Vc2VyT2JqZWN0KHVzZXIpO1xuXHRjb25zdCBpc1ZlcmlmaWVkRW1haWwgPSAoKSA9PiB7XG5cdFx0aWYgKG1lICYmIG1lLmVtYWlscyAmJiBBcnJheS5pc0FycmF5KG1lLmVtYWlscykpIHtcblx0XHRcdHJldHVybiBtZS5lbWFpbHMuZmluZCgoZW1haWwpID0+IGVtYWlsLnZlcmlmaWVkKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xuXHRjb25zdCBnZXRVc2VyUHJlZmVyZW5jZXMgPSAoKSA9PiB7XG5cdFx0Y29uc3QgZGVmYXVsdFVzZXJTZXR0aW5nUHJlZml4ID0gJ0FjY291bnRzX0RlZmF1bHRfVXNlcl9QcmVmZXJlbmNlc18nO1xuXHRcdGNvbnN0IGFsbERlZmF1bHRVc2VyU2V0dGluZ3MgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChuZXcgUmVnRXhwKGBeJHsgZGVmYXVsdFVzZXJTZXR0aW5nUHJlZml4IH0uKiRgKSk7XG5cblx0XHRyZXR1cm4gYWxsRGVmYXVsdFVzZXJTZXR0aW5ncy5yZWR1Y2UoKGFjY3VtdWxhdG9yLCBzZXR0aW5nKSA9PiB7XG5cdFx0XHRjb25zdCBzZXR0aW5nV2l0aG91dFByZWZpeCA9IHNldHRpbmcua2V5LnJlcGxhY2UoZGVmYXVsdFVzZXJTZXR0aW5nUHJlZml4LCAnICcpLnRyaW0oKTtcblx0XHRcdGFjY3VtdWxhdG9yW3NldHRpbmdXaXRob3V0UHJlZml4XSA9IFJvY2tldENoYXQuZ2V0VXNlclByZWZlcmVuY2UodXNlciwgc2V0dGluZ1dpdGhvdXRQcmVmaXgpO1xuXHRcdFx0cmV0dXJuIGFjY3VtdWxhdG9yO1xuXHRcdH0sIHt9KTtcblx0fTtcblx0Y29uc3QgdmVyaWZpZWRFbWFpbCA9IGlzVmVyaWZpZWRFbWFpbCgpO1xuXHRtZS5lbWFpbCA9IHZlcmlmaWVkRW1haWwgPyB2ZXJpZmllZEVtYWlsLmFkZHJlc3MgOiB1bmRlZmluZWQ7XG5cdG1lLnNldHRpbmdzID0ge1xuXHRcdHByZWZlcmVuY2VzOiBnZXRVc2VyUHJlZmVyZW5jZXMoKVxuXHR9O1xuXG5cdHJldHVybiBtZTtcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ2lzVXNlckZyb21QYXJhbXMnLCBmdW5jdGlvbiBfaXNVc2VyRnJvbVBhcmFtcygpIHtcblx0Y29uc3QgcGFyYW1zID0gdGhpcy5yZXF1ZXN0UGFyYW1zKCk7XG5cblx0cmV0dXJuICghcGFyYW1zLnVzZXJJZCAmJiAhcGFyYW1zLnVzZXJuYW1lICYmICFwYXJhbXMudXNlcikgfHxcblx0XHQocGFyYW1zLnVzZXJJZCAmJiB0aGlzLnVzZXJJZCA9PT0gcGFyYW1zLnVzZXJJZCkgfHxcblx0XHQocGFyYW1zLnVzZXJuYW1lICYmIHRoaXMudXNlci51c2VybmFtZSA9PT0gcGFyYW1zLnVzZXJuYW1lKSB8fFxuXHRcdChwYXJhbXMudXNlciAmJiB0aGlzLnVzZXIudXNlcm5hbWUgPT09IHBhcmFtcy51c2VyKTtcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ3BhcnNlSnNvblF1ZXJ5JywgZnVuY3Rpb24gX3BhcnNlSnNvblF1ZXJ5KCkge1xuXHRsZXQgc29ydDtcblx0aWYgKHRoaXMucXVlcnlQYXJhbXMuc29ydCkge1xuXHRcdHRyeSB7XG5cdFx0XHRzb3J0ID0gSlNPTi5wYXJzZSh0aGlzLnF1ZXJ5UGFyYW1zLnNvcnQpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYEludmFsaWQgc29ydCBwYXJhbWV0ZXIgcHJvdmlkZWQgXCIkeyB0aGlzLnF1ZXJ5UGFyYW1zLnNvcnQgfVwiOmAsIGUpO1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1zb3J0JywgYEludmFsaWQgc29ydCBwYXJhbWV0ZXIgcHJvdmlkZWQ6IFwiJHsgdGhpcy5xdWVyeVBhcmFtcy5zb3J0IH1cImAsIHsgaGVscGVyTWV0aG9kOiAncGFyc2VKc29uUXVlcnknIH0pO1xuXHRcdH1cblx0fVxuXG5cdGxldCBmaWVsZHM7XG5cdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmZpZWxkcykge1xuXHRcdHRyeSB7XG5cdFx0XHRmaWVsZHMgPSBKU09OLnBhcnNlKHRoaXMucXVlcnlQYXJhbXMuZmllbGRzKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBJbnZhbGlkIGZpZWxkcyBwYXJhbWV0ZXIgcHJvdmlkZWQgXCIkeyB0aGlzLnF1ZXJ5UGFyYW1zLmZpZWxkcyB9XCI6YCwgZSk7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWZpZWxkcycsIGBJbnZhbGlkIGZpZWxkcyBwYXJhbWV0ZXIgcHJvdmlkZWQ6IFwiJHsgdGhpcy5xdWVyeVBhcmFtcy5maWVsZHMgfVwiYCwgeyBoZWxwZXJNZXRob2Q6ICdwYXJzZUpzb25RdWVyeScgfSk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gVmVyaWZ5IHRoZSB1c2VyJ3Mgc2VsZWN0ZWQgZmllbGRzIG9ubHkgY29udGFpbnMgb25lcyB3aGljaCB0aGVpciByb2xlIGFsbG93c1xuXHRpZiAodHlwZW9mIGZpZWxkcyA9PT0gJ29iamVjdCcpIHtcblx0XHRsZXQgbm9uU2VsZWN0YWJsZUZpZWxkcyA9IE9iamVjdC5rZXlzKFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUpO1xuXHRcdGlmICh0aGlzLnJlcXVlc3Qucm91dGUuaW5jbHVkZXMoJy92MS91c2Vycy4nKSkge1xuXHRcdFx0Y29uc3QgZ2V0RmllbGRzID0gKCkgPT4gT2JqZWN0LmtleXMoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1mdWxsLW90aGVyLXVzZXItaW5mbycpID8gUm9ja2V0Q2hhdC5BUEkudjEubGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGVJZklzUHJpdmlsZWdlZFVzZXIgOiBSb2NrZXRDaGF0LkFQSS52MS5saW1pdGVkVXNlckZpZWxkc1RvRXhjbHVkZSk7XG5cdFx0XHRub25TZWxlY3RhYmxlRmllbGRzID0gbm9uU2VsZWN0YWJsZUZpZWxkcy5jb25jYXQoZ2V0RmllbGRzKCkpO1xuXHRcdH1cblxuXHRcdE9iamVjdC5rZXlzKGZpZWxkcykuZm9yRWFjaCgoaykgPT4ge1xuXHRcdFx0aWYgKG5vblNlbGVjdGFibGVGaWVsZHMuaW5jbHVkZXMoaykgfHwgbm9uU2VsZWN0YWJsZUZpZWxkcy5pbmNsdWRlcyhrLnNwbGl0KFJvY2tldENoYXQuQVBJLnYxLmZpZWxkU2VwYXJhdG9yKVswXSkpIHtcblx0XHRcdFx0ZGVsZXRlIGZpZWxkc1trXTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdC8vIExpbWl0IHRoZSBmaWVsZHMgYnkgZGVmYXVsdFxuXHRmaWVsZHMgPSBPYmplY3QuYXNzaWduKHt9LCBmaWVsZHMsIFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUpO1xuXHRpZiAodGhpcy5yZXF1ZXN0LnJvdXRlLmluY2x1ZGVzKCcvdjEvdXNlcnMuJykpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1mdWxsLW90aGVyLXVzZXItaW5mbycpKSB7XG5cdFx0XHRmaWVsZHMgPSBPYmplY3QuYXNzaWduKGZpZWxkcywgUm9ja2V0Q2hhdC5BUEkudjEubGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGVJZklzUHJpdmlsZWdlZFVzZXIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmaWVsZHMgPSBPYmplY3QuYXNzaWduKGZpZWxkcywgUm9ja2V0Q2hhdC5BUEkudjEubGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGUpO1xuXHRcdH1cblx0fVxuXG5cdGxldCBxdWVyeTtcblx0aWYgKHRoaXMucXVlcnlQYXJhbXMucXVlcnkpIHtcblx0XHR0cnkge1xuXHRcdFx0cXVlcnkgPSBKU09OLnBhcnNlKHRoaXMucXVlcnlQYXJhbXMucXVlcnkpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYEludmFsaWQgcXVlcnkgcGFyYW1ldGVyIHByb3ZpZGVkIFwiJHsgdGhpcy5xdWVyeVBhcmFtcy5xdWVyeSB9XCI6YCwgZSk7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXF1ZXJ5JywgYEludmFsaWQgcXVlcnkgcGFyYW1ldGVyIHByb3ZpZGVkOiBcIiR7IHRoaXMucXVlcnlQYXJhbXMucXVlcnkgfVwiYCwgeyBoZWxwZXJNZXRob2Q6ICdwYXJzZUpzb25RdWVyeScgfSk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gVmVyaWZ5IHRoZSB1c2VyIGhhcyBwZXJtaXNzaW9uIHRvIHF1ZXJ5IHRoZSBmaWVsZHMgdGhleSBhcmVcblx0aWYgKHR5cGVvZiBxdWVyeSA9PT0gJ29iamVjdCcpIHtcblx0XHRsZXQgbm9uUXVlcnlhYmxlRmllbGRzID0gT2JqZWN0LmtleXMoUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSk7XG5cdFx0aWYgKHRoaXMucmVxdWVzdC5yb3V0ZS5pbmNsdWRlcygnL3YxL3VzZXJzLicpKSB7XG5cdFx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1mdWxsLW90aGVyLXVzZXItaW5mbycpKSB7XG5cdFx0XHRcdG5vblF1ZXJ5YWJsZUZpZWxkcyA9IG5vblF1ZXJ5YWJsZUZpZWxkcy5jb25jYXQoT2JqZWN0LmtleXMoUm9ja2V0Q2hhdC5BUEkudjEubGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGVJZklzUHJpdmlsZWdlZFVzZXIpKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5vblF1ZXJ5YWJsZUZpZWxkcyA9IG5vblF1ZXJ5YWJsZUZpZWxkcy5jb25jYXQoT2JqZWN0LmtleXMoUm9ja2V0Q2hhdC5BUEkudjEubGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRPYmplY3Qua2V5cyhxdWVyeSkuZm9yRWFjaCgoaykgPT4ge1xuXHRcdFx0aWYgKG5vblF1ZXJ5YWJsZUZpZWxkcy5pbmNsdWRlcyhrKSB8fCBub25RdWVyeWFibGVGaWVsZHMuaW5jbHVkZXMoay5zcGxpdChSb2NrZXRDaGF0LkFQSS52MS5maWVsZFNlcGFyYXRvcilbMF0pKSB7XG5cdFx0XHRcdGRlbGV0ZSBxdWVyeVtrXTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0c29ydCxcblx0XHRmaWVsZHMsXG5cdFx0cXVlcnlcblx0fTtcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ2RlcHJlY2F0aW9uV2FybmluZycsIGZ1bmN0aW9uIF9kZXByZWNhdGlvbldhcm5pbmcoeyBlbmRwb2ludCwgdmVyc2lvbldpbGxCZVJlbW92ZSwgcmVzcG9uc2UgfSkge1xuXHRjb25zdCB3YXJuaW5nTWVzc2FnZSA9IGBUaGUgZW5kcG9pbnQgXCIkeyBlbmRwb2ludCB9XCIgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGFmdGVyIHZlcnNpb24gJHsgdmVyc2lvbldpbGxCZVJlbW92ZSB9YDtcblx0Y29uc29sZS53YXJuKHdhcm5pbmdNZXNzYWdlKTtcblx0aWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHdhcm5pbmc6IHdhcm5pbmdNZXNzYWdlLFxuXHRcdFx0Li4ucmVzcG9uc2Vcblx0XHR9O1xuXHR9XG5cblx0cmV0dXJuIHJlc3BvbnNlO1xufSk7XG5cbiIsIlJvY2tldENoYXQuQVBJLmhlbHBlck1ldGhvZHMuc2V0KCdnZXRMb2dnZWRJblVzZXInLCBmdW5jdGlvbiBfZ2V0TG9nZ2VkSW5Vc2VyKCkge1xuXHRsZXQgdXNlcjtcblxuXHRpZiAodGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtYXV0aC10b2tlbiddICYmIHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LXVzZXItaWQnXSkge1xuXHRcdHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHtcblx0XHRcdCdfaWQnOiB0aGlzLnJlcXVlc3QuaGVhZGVyc1sneC11c2VyLWlkJ10sXG5cdFx0XHQnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLmhhc2hlZFRva2VuJzogQWNjb3VudHMuX2hhc2hMb2dpblRva2VuKHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LWF1dGgtdG9rZW4nXSlcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB1c2VyO1xufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNldCgnaW5zZXJ0VXNlck9iamVjdCcsIGZ1bmN0aW9uIF9hZGRVc2VyVG9PYmplY3QoeyBvYmplY3QsIHVzZXJJZCB9KSB7XG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpO1xuXHRvYmplY3QudXNlciA9IHsgfTtcblx0aWYgKHVzZXIpIHtcblx0XHRvYmplY3QudXNlciA9IHtcblx0XHRcdF9pZDogdXNlcklkLFxuXHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHRuYW1lOiB1c2VyLm5hbWVcblx0XHR9O1xuXHR9XG5cblxuXHRyZXR1cm4gb2JqZWN0O1xufSk7XG5cbiIsIlJvY2tldENoYXQuQVBJLmRlZmF1bHQuYWRkUm91dGUoJ2luZm8nLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyKCk7XG5cblx0XHRpZiAodXNlciAmJiBSb2NrZXRDaGF0LmF1dGh6Lmhhc1JvbGUodXNlci5faWQsICdhZG1pbicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdGluZm86IFJvY2tldENoYXQuSW5mb1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0dmVyc2lvbjogUm9ja2V0Q2hhdC5JbmZvLnZlcnNpb25cblx0XHR9KTtcblx0fVxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuLy9SZXR1cm5zIHRoZSBjaGFubmVsIElGIGZvdW5kIG90aGVyd2lzZSBpdCB3aWxsIHJldHVybiB0aGUgZmFpbHVyZSBvZiB3aHkgaXQgZGlkbid0LiBDaGVjayB0aGUgYHN0YXR1c0NvZGVgIHByb3BlcnR5XG5mdW5jdGlvbiBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXMsIGNoZWNrZWRBcmNoaXZlZCA9IHRydWUgfSkge1xuXHRpZiAoKCFwYXJhbXMucm9vbUlkIHx8ICFwYXJhbXMucm9vbUlkLnRyaW0oKSkgJiYgKCFwYXJhbXMucm9vbU5hbWUgfHwgIXBhcmFtcy5yb29tTmFtZS50cmltKCkpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcGFyYW1ldGVyIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIGlzIHJlcXVpcmVkJyk7XG5cdH1cblxuXHRjb25zdCBmaWVsZHMgPSB7IC4uLlJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfTtcblxuXHRsZXQgcm9vbTtcblx0aWYgKHBhcmFtcy5yb29tSWQpIHtcblx0XHRyb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocGFyYW1zLnJvb21JZCwgeyBmaWVsZHMgfSk7XG5cdH0gZWxzZSBpZiAocGFyYW1zLnJvb21OYW1lKSB7XG5cdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUocGFyYW1zLnJvb21OYW1lLCB7IGZpZWxkcyB9KTtcblx0fVxuXG5cdGlmICghcm9vbSB8fCByb29tLnQgIT09ICdjJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tbm90LWZvdW5kJywgJ1RoZSByZXF1aXJlZCBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBwYXJhbSBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCBhbnkgY2hhbm5lbCcpO1xuXHR9XG5cblx0aWYgKGNoZWNrZWRBcmNoaXZlZCAmJiByb29tLmFyY2hpdmVkKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1hcmNoaXZlZCcsIGBUaGUgY2hhbm5lbCwgJHsgcm9vbS5uYW1lIH0sIGlzIGFyY2hpdmVkYCk7XG5cdH1cblxuXHRyZXR1cm4gcm9vbTtcbn1cblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmFkZEFsbCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhZGRBbGxVc2VyVG9Sb29tJywgZmluZFJlc3VsdC5faWQsIHRoaXMuYm9keVBhcmFtcy5hY3RpdmVVc2Vyc09ubHkpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuYWRkTW9kZXJhdG9yJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhZGRSb29tTW9kZXJhdG9yJywgZmluZFJlc3VsdC5faWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuYWRkT3duZXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2FkZFJvb21Pd25lcicsIGZpbmRSZXN1bHQuX2lkLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmFyY2hpdmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYXJjaGl2ZVJvb20nLCBmaW5kUmVzdWx0Ll9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmNsb3NlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0Y29uc3Qgc3ViID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQoZmluZFJlc3VsdC5faWQsIHRoaXMudXNlcklkKTtcblxuXHRcdGlmICghc3ViKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShgVGhlIHVzZXIvY2FsbGVlIGlzIG5vdCBpbiB0aGUgY2hhbm5lbCBcIiR7IGZpbmRSZXN1bHQubmFtZSB9LmApO1xuXHRcdH1cblxuXHRcdGlmICghc3ViLm9wZW4pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgY2hhbm5lbCwgJHsgZmluZFJlc3VsdC5uYW1lIH0sIGlzIGFscmVhZHkgY2xvc2VkIHRvIHRoZSBzZW5kZXJgKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnaGlkZVJvb20nLCBmaW5kUmVzdWx0Ll9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmNvdW50ZXJzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgYWNjZXNzID0gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJyk7XG5cdFx0Y29uc3QgdXNlcklkID0gdGhpcy5yZXF1ZXN0UGFyYW1zKCkudXNlcklkO1xuXHRcdGxldCB1c2VyID0gdGhpcy51c2VySWQ7XG5cdFx0bGV0IHVucmVhZHMgPSBudWxsO1xuXHRcdGxldCB1c2VyTWVudGlvbnMgPSBudWxsO1xuXHRcdGxldCB1bnJlYWRzRnJvbSA9IG51bGw7XG5cdFx0bGV0IGpvaW5lZCA9IGZhbHNlO1xuXHRcdGxldCBtc2dzID0gbnVsbDtcblx0XHRsZXQgbGF0ZXN0ID0gbnVsbDtcblx0XHRsZXQgbWVtYmVycyA9IG51bGw7XG5cblx0XHRpZiAodXNlcklkKSB7XG5cdFx0XHRpZiAoIWFjY2Vzcykge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0XHR9XG5cdFx0XHR1c2VyID0gdXNlcklkO1xuXHRcdH1cblx0XHRjb25zdCByb29tID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHtcblx0XHRcdHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksXG5cdFx0XHRyZXR1cm5Vc2VybmFtZXM6IHRydWVcblx0XHR9KTtcblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb29tLl9pZCwgdXNlcik7XG5cdFx0Y29uc3QgbG0gPSByb29tLmxtID8gcm9vbS5sbSA6IHJvb20uX3VwZGF0ZWRBdDtcblxuXHRcdGlmICh0eXBlb2Ygc3Vic2NyaXB0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBzdWJzY3JpcHRpb24ub3Blbikge1xuXHRcdFx0dW5yZWFkcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNvdW50VmlzaWJsZUJ5Um9vbUlkQmV0d2VlblRpbWVzdGFtcHNJbmNsdXNpdmUoc3Vic2NyaXB0aW9uLnJpZCwgc3Vic2NyaXB0aW9uLmxzLCBsbSk7XG5cdFx0XHR1bnJlYWRzRnJvbSA9IHN1YnNjcmlwdGlvbi5scyB8fCBzdWJzY3JpcHRpb24udHM7XG5cdFx0XHR1c2VyTWVudGlvbnMgPSBzdWJzY3JpcHRpb24udXNlck1lbnRpb25zO1xuXHRcdFx0am9pbmVkID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoYWNjZXNzIHx8IGpvaW5lZCkge1xuXHRcdFx0bXNncyA9IHJvb20ubXNncztcblx0XHRcdGxhdGVzdCA9IGxtO1xuXHRcdFx0bWVtYmVycyA9IHJvb20udXNlcnNDb3VudDtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRqb2luZWQsXG5cdFx0XHRtZW1iZXJzLFxuXHRcdFx0dW5yZWFkcyxcblx0XHRcdHVucmVhZHNGcm9tLFxuXHRcdFx0bXNncyxcblx0XHRcdGxhdGVzdCxcblx0XHRcdHVzZXJNZW50aW9uc1xuXHRcdH0pO1xuXHR9XG59KTtcblxuLy8gQ2hhbm5lbCAtPiBjcmVhdGVcblxuZnVuY3Rpb24gY3JlYXRlQ2hhbm5lbFZhbGlkYXRvcihwYXJhbXMpIHtcblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24ocGFyYW1zLnVzZXIudmFsdWUsICdjcmVhdGUtYycpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCd1bmF1dGhvcml6ZWQnKTtcblx0fVxuXG5cdGlmICghcGFyYW1zLm5hbWUgfHwgIXBhcmFtcy5uYW1lLnZhbHVlKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBQYXJhbSBcIiR7IHBhcmFtcy5uYW1lLmtleSB9XCIgaXMgcmVxdWlyZWRgKTtcblx0fVxuXG5cdGlmIChwYXJhbXMubWVtYmVycyAmJiBwYXJhbXMubWVtYmVycy52YWx1ZSAmJiAhXy5pc0FycmF5KHBhcmFtcy5tZW1iZXJzLnZhbHVlKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcihgUGFyYW0gXCIkeyBwYXJhbXMubWVtYmVycy5rZXkgfVwiIG11c3QgYmUgYW4gYXJyYXkgaWYgcHJvdmlkZWRgKTtcblx0fVxuXG5cdGlmIChwYXJhbXMuY3VzdG9tRmllbGRzICYmIHBhcmFtcy5jdXN0b21GaWVsZHMudmFsdWUgJiYgISh0eXBlb2YgcGFyYW1zLmN1c3RvbUZpZWxkcy52YWx1ZSA9PT0gJ29iamVjdCcpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBQYXJhbSBcIiR7IHBhcmFtcy5jdXN0b21GaWVsZHMua2V5IH1cIiBtdXN0IGJlIGFuIG9iamVjdCBpZiBwcm92aWRlZGApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUNoYW5uZWwodXNlcklkLCBwYXJhbXMpIHtcblx0bGV0IHJlYWRPbmx5ID0gZmFsc2U7XG5cdGlmICh0eXBlb2YgcGFyYW1zLnJlYWRPbmx5ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHJlYWRPbmx5ID0gcGFyYW1zLnJlYWRPbmx5O1xuXHR9XG5cblx0bGV0IGlkO1xuXHRNZXRlb3IucnVuQXNVc2VyKHVzZXJJZCwgKCkgPT4ge1xuXHRcdGlkID0gTWV0ZW9yLmNhbGwoJ2NyZWF0ZUNoYW5uZWwnLCBwYXJhbXMubmFtZSwgcGFyYW1zLm1lbWJlcnMgPyBwYXJhbXMubWVtYmVycyA6IFtdLCByZWFkT25seSwgcGFyYW1zLmN1c3RvbUZpZWxkcyk7XG5cdH0pO1xuXG5cdHJldHVybiB7XG5cdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoaWQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KVxuXHR9O1xufVxuXG5Sb2NrZXRDaGF0LkFQSS5jaGFubmVscyA9IHt9O1xuUm9ja2V0Q2hhdC5BUEkuY2hhbm5lbHMuY3JlYXRlID0ge1xuXHR2YWxpZGF0ZTogY3JlYXRlQ2hhbm5lbFZhbGlkYXRvcixcblx0ZXhlY3V0ZTogY3JlYXRlQ2hhbm5lbFxufTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmNyZWF0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB1c2VySWQgPSB0aGlzLnVzZXJJZDtcblx0XHRjb25zdCBib2R5UGFyYW1zID0gdGhpcy5ib2R5UGFyYW1zO1xuXG5cdFx0bGV0IGVycm9yO1xuXG5cdFx0dHJ5IHtcblx0XHRcdFJvY2tldENoYXQuQVBJLmNoYW5uZWxzLmNyZWF0ZS52YWxpZGF0ZSh7XG5cdFx0XHRcdHVzZXI6IHtcblx0XHRcdFx0XHR2YWx1ZTogdXNlcklkXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG5hbWU6IHtcblx0XHRcdFx0XHR2YWx1ZTogYm9keVBhcmFtcy5uYW1lLFxuXHRcdFx0XHRcdGtleTogJ25hbWUnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG1lbWJlcnM6IHtcblx0XHRcdFx0XHR2YWx1ZTogYm9keVBhcmFtcy5tZW1iZXJzLFxuXHRcdFx0XHRcdGtleTogJ21lbWJlcnMnXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGlmIChlLm1lc3NhZ2UgPT09ICd1bmF1dGhvcml6ZWQnKSB7XG5cdFx0XHRcdGVycm9yID0gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRlcnJvciA9IFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5tZXNzYWdlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdHJldHVybiBlcnJvcjtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhSb2NrZXRDaGF0LkFQSS5jaGFubmVscy5jcmVhdGUuZXhlY3V0ZSh1c2VySWQsIGJvZHlQYXJhbXMpKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5kZWxldGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnZXJhc2VSb29tJywgZmluZFJlc3VsdC5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogZmluZFJlc3VsdFxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmZpbGVzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cdFx0Y29uc3QgYWRkVXNlck9iamVjdFRvRXZlcnlPYmplY3QgPSAoZmlsZSkgPT4ge1xuXHRcdFx0aWYgKGZpbGUudXNlcklkKSB7XG5cdFx0XHRcdGZpbGUgPSB0aGlzLmluc2VydFVzZXJPYmplY3QoeyBvYmplY3Q6IGZpbGUsIHVzZXJJZDogZmlsZS51c2VySWQgfSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmlsZTtcblx0XHR9O1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2NhbkFjY2Vzc1Jvb20nLCBmaW5kUmVzdWx0Ll9pZCwgdGhpcy51c2VySWQpO1xuXHRcdH0pO1xuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyByaWQ6IGZpbmRSZXN1bHQuX2lkIH0pO1xuXG5cdFx0Y29uc3QgZmlsZXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyBuYW1lOiAxIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHNcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0ZmlsZXM6IGZpbGVzLm1hcChhZGRVc2VyT2JqZWN0VG9FdmVyeU9iamVjdCksXG5cdFx0XHRjb3VudDpcblx0XHRcdGZpbGVzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmZpbmQob3VyUXVlcnkpLmNvdW50KClcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5nZXRJbnRlZ3JhdGlvbnMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1pbnRlZ3JhdGlvbnMnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0bGV0IGluY2x1ZGVBbGxQdWJsaWNDaGFubmVscyA9IHRydWU7XG5cdFx0aWYgKHR5cGVvZiB0aGlzLnF1ZXJ5UGFyYW1zLmluY2x1ZGVBbGxQdWJsaWNDaGFubmVscyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdGluY2x1ZGVBbGxQdWJsaWNDaGFubmVscyA9IHRoaXMucXVlcnlQYXJhbXMuaW5jbHVkZUFsbFB1YmxpY0NoYW5uZWxzID09PSAndHJ1ZSc7XG5cdFx0fVxuXG5cdFx0bGV0IG91clF1ZXJ5ID0ge1xuXHRcdFx0Y2hhbm5lbDogYCMkeyBmaW5kUmVzdWx0Lm5hbWUgfWBcblx0XHR9O1xuXG5cdFx0aWYgKGluY2x1ZGVBbGxQdWJsaWNDaGFubmVscykge1xuXHRcdFx0b3VyUXVlcnkuY2hhbm5lbCA9IHtcblx0XHRcdFx0JGluOiBbb3VyUXVlcnkuY2hhbm5lbCwgJ2FsbF9wdWJsaWNfY2hhbm5lbHMnXVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCBvdXJRdWVyeSk7XG5cblx0XHRjb25zdCBpbnRlZ3JhdGlvbnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IF9jcmVhdGVkQXQ6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbnRlZ3JhdGlvbnMsXG5cdFx0XHRjb3VudDogaW50ZWdyYXRpb25zLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSkuY291bnQoKVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmhpc3RvcnknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGxldCBsYXRlc3REYXRlID0gbmV3IERhdGUoKTtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5sYXRlc3QpIHtcblx0XHRcdGxhdGVzdERhdGUgPSBuZXcgRGF0ZSh0aGlzLnF1ZXJ5UGFyYW1zLmxhdGVzdCk7XG5cdFx0fVxuXG5cdFx0bGV0IG9sZGVzdERhdGUgPSB1bmRlZmluZWQ7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMub2xkZXN0KSB7XG5cdFx0XHRvbGRlc3REYXRlID0gbmV3IERhdGUodGhpcy5xdWVyeVBhcmFtcy5vbGRlc3QpO1xuXHRcdH1cblxuXHRcdGxldCBpbmNsdXNpdmUgPSBmYWxzZTtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5pbmNsdXNpdmUpIHtcblx0XHRcdGluY2x1c2l2ZSA9IHRoaXMucXVlcnlQYXJhbXMuaW5jbHVzaXZlO1xuXHRcdH1cblxuXHRcdGxldCBjb3VudCA9IDIwO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmNvdW50KSB7XG5cdFx0XHRjb3VudCA9IHBhcnNlSW50KHRoaXMucXVlcnlQYXJhbXMuY291bnQpO1xuXHRcdH1cblxuXHRcdGxldCB1bnJlYWRzID0gZmFsc2U7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMudW5yZWFkcykge1xuXHRcdFx0dW5yZWFkcyA9IHRoaXMucXVlcnlQYXJhbXMudW5yZWFkcztcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdHJlc3VsdCA9IE1ldGVvci5jYWxsKCdnZXRDaGFubmVsSGlzdG9yeScsIHtcblx0XHRcdFx0cmlkOiBmaW5kUmVzdWx0Ll9pZCxcblx0XHRcdFx0bGF0ZXN0OiBsYXRlc3REYXRlLFxuXHRcdFx0XHRvbGRlc3Q6IG9sZGVzdERhdGUsXG5cdFx0XHRcdGluY2x1c2l2ZSxcblx0XHRcdFx0Y291bnQsXG5cdFx0XHRcdHVucmVhZHNcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhyZXN1bHQpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmluZm8nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmludml0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkVXNlclRvUm9vbScsIHsgcmlkOiBmaW5kUmVzdWx0Ll9pZCwgdXNlcm5hbWU6IHVzZXIudXNlcm5hbWUgfSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSlcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5qb2luJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2pvaW5Sb29tJywgZmluZFJlc3VsdC5faWQsIHRoaXMuYm9keVBhcmFtcy5qb2luQ29kZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSlcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5raWNrJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdyZW1vdmVVc2VyRnJvbVJvb20nLCB7IHJpZDogZmluZFJlc3VsdC5faWQsIHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lIH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMubGVhdmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnbGVhdmVSb29tJywgZmluZFJlc3VsdC5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMubGlzdCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0OiB7XG5cdFx0Ly9UaGlzIGlzIGRlZmluZWQgYXMgc3VjaCBvbmx5IHRvIHByb3ZpZGUgYW4gZXhhbXBsZSBvZiBob3cgdGhlIHJvdXRlcyBjYW4gYmUgZGVmaW5lZCA6WFxuXHRcdGFjdGlvbigpIHtcblx0XHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXHRcdFx0Y29uc3QgaGFzUGVybWlzc2lvblRvU2VlQWxsUHVibGljQ2hhbm5lbHMgPSBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWMtcm9vbScpO1xuXG5cdFx0XHRjb25zdCBvdXJRdWVyeSA9IHsgLi4ucXVlcnksIHQ6ICdjJyB9O1xuXG5cdFx0XHRpZiAoIWhhc1Blcm1pc3Npb25Ub1NlZUFsbFB1YmxpY0NoYW5uZWxzKSB7XG5cdFx0XHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1qb2luZWQtcm9vbScpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IHJvb21JZHMgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVVzZXJJZEFuZFR5cGUodGhpcy51c2VySWQsICdjJywgeyBmaWVsZHM6IHsgcmlkOiAxIH0gfSkuZmV0Y2goKS5tYXAocyA9PiBzLnJpZCk7XG5cdFx0XHRcdG91clF1ZXJ5Ll9pZCA9IHsgJGluOiByb29tSWRzIH07XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRcdGZpZWxkc1xuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHRvdGFsID0gY3Vyc29yLmNvdW50KCk7XG5cblx0XHRcdGNvbnN0IHJvb21zID0gY3Vyc29yLmZldGNoKCk7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0Y2hhbm5lbHM6IHJvb21zLFxuXHRcdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0XHRvZmZzZXQsXG5cdFx0XHRcdHRvdGFsXG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMubGlzdC5qb2luZWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdC8vIFRPRE86IENBQ0hFOiBBZGQgQnJlYWNraW5nIG5vdGljZSBzaW5jZSB3ZSByZW1vdmVkIHRoZSBxdWVyeSBwYXJhbVxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRCeVN1YnNjcmlwdGlvblR5cGVBbmRVc2VySWQoJ2MnLCB0aGlzLnVzZXJJZCwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWxDb3VudCA9IGN1cnNvci5jb3VudCgpO1xuXHRcdGNvbnN0IHJvb21zID0gY3Vyc29yLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsczogcm9vbXMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0dG90YWw6IHRvdGFsQ291bnRcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5tZW1iZXJzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7XG5cdFx0XHRwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLFxuXHRcdFx0Y2hlY2tlZEFyY2hpdmVkOiBmYWxzZVxuXHRcdH0pO1xuXG5cdFx0aWYgKGZpbmRSZXN1bHQuYnJvYWRjYXN0ICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWJyb2FkY2FzdC1tZW1iZXItbGlzdCcpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCA9IHt9IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb25zID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWQoZmluZFJlc3VsdC5faWQsIHtcblx0XHRcdGZpZWxkczogeyAndS5faWQnOiAxIH0sXG5cdFx0XHRzb3J0OiB7ICd1LnVzZXJuYW1lJzogc29ydC51c2VybmFtZSAhPSBudWxsID8gc29ydC51c2VybmFtZSA6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWwgPSBzdWJzY3JpcHRpb25zLmNvdW50KCk7XG5cblx0XHRjb25zdCBtZW1iZXJzID0gc3Vic2NyaXB0aW9ucy5mZXRjaCgpLm1hcChzID0+IHMudSAmJiBzLnUuX2lkKTtcblxuXHRcdGNvbnN0IHVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh7IF9pZDogeyAkaW46IG1lbWJlcnMgfSB9LCB7XG5cdFx0XHRmaWVsZHM6IHsgX2lkOiAxLCB1c2VybmFtZTogMSwgbmFtZTogMSwgc3RhdHVzOiAxLCB1dGNPZmZzZXQ6IDEgfSxcblx0XHRcdHNvcnQ6IHsgdXNlcm5hbWU6ICBzb3J0LnVzZXJuYW1lICE9IG51bGwgPyBzb3J0LnVzZXJuYW1lIDogMSB9XG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lbWJlcnM6IHVzZXJzLFxuXHRcdFx0Y291bnQ6IHVzZXJzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMubWVzc2FnZXMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHtcblx0XHRcdHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksXG5cdFx0XHRjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlXG5cdFx0fSk7XG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyByaWQ6IGZpbmRSZXN1bHQuX2lkIH0pO1xuXG5cdFx0Ly9TcGVjaWFsIGNoZWNrIGZvciB0aGUgcGVybWlzc2lvbnNcblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1qb2luZWQtcm9vbScpICYmICFSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChmaW5kUmVzdWx0Ll9pZCwgdGhpcy51c2VySWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1jLXJvb20nKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogLTEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWwgPSBjdXJzb3IuY291bnQoKTtcblx0XHRjb25zdCBtZXNzYWdlcyA9IGN1cnNvci5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXMsXG5cdFx0XHRjb3VudDogbWVzc2FnZXMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWxcblx0XHR9KTtcblx0fVxufSk7XG4vLyBUT0RPOiBDQUNIRTogSSBkb250IGxpa2UgdGhpcyBtZXRob2QoIGZ1bmN0aW9uYWxpdHkgYW5kIGhvdyB3ZSBpbXBsZW1lbnRlZCApIGl0cyB2ZXJ5IGV4cGVuc2l2ZVxuLy8gVE9ETyBjaGVjayBpZiB0aGlzIGNvZGUgaXMgYmV0dGVyIG9yIG5vdFxuLy8gUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLm9ubGluZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcbi8vIFx0Z2V0KCkge1xuLy8gXHRcdGNvbnN0IHsgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcbi8vIFx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHQ6ICdjJyB9KTtcblxuLy8gXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lKG91clF1ZXJ5KTtcblxuLy8gXHRcdGlmIChyb29tID09IG51bGwpIHtcbi8vIFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdDaGFubmVsIGRvZXMgbm90IGV4aXN0cycpO1xuLy8gXHRcdH1cblxuLy8gXHRcdGNvbnN0IGlkcyA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZCh7IHJpZDogcm9vbS5faWQgfSwgeyBmaWVsZHM6IHsgJ3UuX2lkJzogMSB9IH0pLmZldGNoKCkubWFwKHN1YiA9PiBzdWIudS5faWQpO1xuXG4vLyBcdFx0Y29uc3Qgb25saW5lID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh7XG4vLyBcdFx0XHR1c2VybmFtZTogeyAkZXhpc3RzOiAxIH0sXG4vLyBcdFx0XHRfaWQ6IHsgJGluOiBpZHMgfSxcbi8vIFx0XHRcdHN0YXR1czogeyAkaW46IFsnb25saW5lJywgJ2F3YXknLCAnYnVzeSddIH1cbi8vIFx0XHR9LCB7XG4vLyBcdFx0XHRmaWVsZHM6IHsgdXNlcm5hbWU6IDEgfVxuLy8gXHRcdH0pLmZldGNoKCk7XG5cbi8vIFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG4vLyBcdFx0XHRvbmxpbmVcbi8vIFx0XHR9KTtcbi8vIFx0fVxuLy8gfSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5vbmxpbmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyB0OiAnYycgfSk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZShvdXJRdWVyeSk7XG5cblx0XHRpZiAocm9vbSA9PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnQ2hhbm5lbCBkb2VzIG5vdCBleGlzdHMnKTtcblx0XHR9XG5cblx0XHRjb25zdCBvbmxpbmUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kVXNlcnNOb3RPZmZsaW5lKHtcblx0XHRcdGZpZWxkczogeyB1c2VybmFtZTogMSB9XG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdGNvbnN0IG9ubGluZUluUm9vbSA9IFtdO1xuXHRcdG9ubGluZS5mb3JFYWNoKHVzZXIgPT4ge1xuXHRcdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vdC5faWQsIHVzZXIuX2lkLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblx0XHRcdGlmIChzdWJzY3JpcHRpb24pIHtcblx0XHRcdFx0b25saW5lSW5Sb29tLnB1c2goe1xuXHRcdFx0XHRcdF9pZDogdXNlci5faWQsXG5cdFx0XHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWVcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRvbmxpbmU6IG9ubGluZUluUm9vbVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLm9wZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRjb25zdCBzdWIgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChmaW5kUmVzdWx0Ll9pZCwgdGhpcy51c2VySWQpO1xuXG5cdFx0aWYgKCFzdWIpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgdXNlci9jYWxsZWUgaXMgbm90IGluIHRoZSBjaGFubmVsIFwiJHsgZmluZFJlc3VsdC5uYW1lIH1cIi5gKTtcblx0XHR9XG5cblx0XHRpZiAoc3ViLm9wZW4pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgY2hhbm5lbCwgJHsgZmluZFJlc3VsdC5uYW1lIH0sIGlzIGFscmVhZHkgb3BlbiB0byB0aGUgc2VuZGVyYCk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ29wZW5Sb29tJywgZmluZFJlc3VsdC5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5yZW1vdmVNb2RlcmF0b3InLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3JlbW92ZVJvb21Nb2RlcmF0b3InLCBmaW5kUmVzdWx0Ll9pZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5yZW1vdmVPd25lcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgncmVtb3ZlUm9vbU93bmVyJywgZmluZFJlc3VsdC5faWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMucmVuYW1lJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm5hbWUgfHwgIXRoaXMuYm9keVBhcmFtcy5uYW1lLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJuYW1lXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB7IHJvb21JZDogdGhpcy5ib2R5UGFyYW1zLnJvb21JZCB9IH0pO1xuXG5cdFx0aWYgKGZpbmRSZXN1bHQubmFtZSA9PT0gdGhpcy5ib2R5UGFyYW1zLm5hbWUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgY2hhbm5lbCBuYW1lIGlzIHRoZSBzYW1lIGFzIHdoYXQgaXQgd291bGQgYmUgcmVuYW1lZCB0by4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAncm9vbU5hbWUnLCB0aGlzLmJvZHlQYXJhbXMubmFtZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSlcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5zZXRDdXN0b21GaWVsZHMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzIHx8ICEodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMgPT09ICdvYmplY3QnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJjdXN0b21GaWVsZHNcIiBpcyByZXF1aXJlZCB3aXRoIGEgdHlwZSBsaWtlIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyb29tQ3VzdG9tRmllbGRzJywgdGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSlcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5zZXREZWZhdWx0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLmRlZmF1bHQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcImRlZmF1bHRcIiBpcyByZXF1aXJlZCcsICdlcnJvci1jaGFubmVscy1zZXRkZWZhdWx0LWlzLXNhbWUnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0LmRlZmF1bHQgPT09IHRoaXMuYm9keVBhcmFtcy5kZWZhdWx0KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNoYW5uZWwgZGVmYXVsdCBzZXR0aW5nIGlzIHRoZSBzYW1lIGFzIHdoYXQgaXQgd291bGQgYmUgY2hhbmdlZCB0by4nLCAnZXJyb3ItY2hhbm5lbHMtc2V0ZGVmYXVsdC1taXNzaW5nLWRlZmF1bHQtcGFyYW0nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAnZGVmYXVsdCcsIHRoaXMuYm9keVBhcmFtcy5kZWZhdWx0LnRvU3RyaW5nKCkpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0RGVzY3JpcHRpb24nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb24gfHwgIXRoaXMuYm9keVBhcmFtcy5kZXNjcmlwdGlvbi50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwiZGVzY3JpcHRpb25cIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0aWYgKGZpbmRSZXN1bHQuZGVzY3JpcHRpb24gPT09IHRoaXMuYm9keVBhcmFtcy5kZXNjcmlwdGlvbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBjaGFubmVsIGRlc2NyaXB0aW9uIGlzIHRoZSBzYW1lIGFzIHdoYXQgaXQgd291bGQgYmUgY2hhbmdlZCB0by4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAncm9vbURlc2NyaXB0aW9uJywgdGhpcy5ib2R5UGFyYW1zLmRlc2NyaXB0aW9uKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGRlc2NyaXB0aW9uOiB0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb25cblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5zZXRKb2luQ29kZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5qb2luQ29kZSB8fCAhdGhpcy5ib2R5UGFyYW1zLmpvaW5Db2RlLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJqb2luQ29kZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAnam9pbkNvZGUnLCB0aGlzLmJvZHlQYXJhbXMuam9pbkNvZGUpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0UHVycG9zZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5wdXJwb3NlIHx8ICF0aGlzLmJvZHlQYXJhbXMucHVycG9zZS50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwicHVycG9zZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC5kZXNjcmlwdGlvbiA9PT0gdGhpcy5ib2R5UGFyYW1zLnB1cnBvc2UpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgY2hhbm5lbCBwdXJwb3NlIChkZXNjcmlwdGlvbikgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyb29tRGVzY3JpcHRpb24nLCB0aGlzLmJvZHlQYXJhbXMucHVycG9zZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRwdXJwb3NlOiB0aGlzLmJvZHlQYXJhbXMucHVycG9zZVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnNldFJlYWRPbmx5JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJyZWFkT25seVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC5ybyA9PT0gdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNoYW5uZWwgcmVhZCBvbmx5IHNldHRpbmcgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyZWFkT25seScsIHRoaXMuYm9keVBhcmFtcy5yZWFkT25seSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSlcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5zZXRUb3BpYycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50b3BpYyB8fCAhdGhpcy5ib2R5UGFyYW1zLnRvcGljLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJ0b3BpY1wiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC50b3BpYyA9PT0gdGhpcy5ib2R5UGFyYW1zLnRvcGljKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNoYW5uZWwgdG9waWMgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyb29tVG9waWMnLCB0aGlzLmJvZHlQYXJhbXMudG9waWMpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0dG9waWM6IHRoaXMuYm9keVBhcmFtcy50b3BpY1xuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnNldEFubm91bmNlbWVudCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5hbm5vdW5jZW1lbnQgfHwgIXRoaXMuYm9keVBhcmFtcy5hbm5vdW5jZW1lbnQudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcImFubm91bmNlbWVudFwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAncm9vbUFubm91bmNlbWVudCcsIHRoaXMuYm9keVBhcmFtcy5hbm5vdW5jZW1lbnQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0YW5ub3VuY2VtZW50OiB0aGlzLmJvZHlQYXJhbXMuYW5ub3VuY2VtZW50XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0VHlwZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50eXBlIHx8ICF0aGlzLmJvZHlQYXJhbXMudHlwZS50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwidHlwZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC50ID09PSB0aGlzLmJvZHlQYXJhbXMudHlwZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBjaGFubmVsIHR5cGUgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyb29tVHlwZScsIHRoaXMuYm9keVBhcmFtcy50eXBlKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnVuYXJjaGl2ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGlmICghZmluZFJlc3VsdC5hcmNoaXZlZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYFRoZSBjaGFubmVsLCAkeyBmaW5kUmVzdWx0Lm5hbWUgfSwgaXMgbm90IGFyY2hpdmVkYCk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3VuYXJjaGl2ZVJvb20nLCBmaW5kUmVzdWx0Ll9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmdldEFsbFVzZXJNZW50aW9uc0J5Q2hhbm5lbCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgcm9vbUlkIH0gPSB0aGlzLnJlcXVlc3RQYXJhbXMoKTtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRpZiAoIXJvb21JZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByZXF1ZXN0IHBhcmFtIFwicm9vbUlkXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBtZW50aW9ucyA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdnZXRVc2VyTWVudGlvbnNCeUNoYW5uZWwnLCB7XG5cdFx0XHRyb29tSWQsXG5cdFx0XHRvcHRpb25zOiB7XG5cdFx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogMSB9LFxuXHRcdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRcdGxpbWl0OiBjb3VudFxuXHRcdFx0fVxuXHRcdH0pKTtcblxuXHRcdGNvbnN0IGFsbE1lbnRpb25zID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2dldFVzZXJNZW50aW9uc0J5Q2hhbm5lbCcsIHtcblx0XHRcdHJvb21JZCxcblx0XHRcdG9wdGlvbnM6IHt9XG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVudGlvbnMsXG5cdFx0XHRjb3VudDogbWVudGlvbnMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IGFsbE1lbnRpb25zLmxlbmd0aFxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnJvbGVzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRjb25zdCByb2xlcyA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdnZXRSb29tUm9sZXMnLCBmaW5kUmVzdWx0Ll9pZCkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cm9sZXNcblx0XHR9KTtcblx0fVxufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncm9sZXMubGlzdCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHJvbGVzID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuZmluZCh7fSwgeyBmaWVsZHM6IHsgX3VwZGF0ZWRBdDogMCB9IH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHJvbGVzIH0pO1xuXHR9XG59KTtcbiIsImltcG9ydCBCdXNib3kgZnJvbSAnYnVzYm95JztcblxuZnVuY3Rpb24gZmluZFJvb21CeUlkT3JOYW1lKHsgcGFyYW1zLCBjaGVja2VkQXJjaGl2ZWQgPSB0cnVlfSkge1xuXHRpZiAoKCFwYXJhbXMucm9vbUlkIHx8ICFwYXJhbXMucm9vbUlkLnRyaW0oKSkgJiYgKCFwYXJhbXMucm9vbU5hbWUgfHwgIXBhcmFtcy5yb29tTmFtZS50cmltKCkpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcGFyYW1ldGVyIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIGlzIHJlcXVpcmVkJyk7XG5cdH1cblxuXHRjb25zdCBmaWVsZHMgPSB7IC4uLlJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfTtcblxuXHRsZXQgcm9vbTtcblx0aWYgKHBhcmFtcy5yb29tSWQpIHtcblx0XHRyb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocGFyYW1zLnJvb21JZCwgeyBmaWVsZHMgfSk7XG5cdH0gZWxzZSBpZiAocGFyYW1zLnJvb21OYW1lKSB7XG5cdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUocGFyYW1zLnJvb21OYW1lLCB7IGZpZWxkcyB9KTtcblx0fVxuXHRpZiAoIXJvb20pIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLW5vdC1mb3VuZCcsICdUaGUgcmVxdWlyZWQgXCJyb29tSWRcIiBvciBcInJvb21OYW1lXCIgcGFyYW0gcHJvdmlkZWQgZG9lcyBub3QgbWF0Y2ggYW55IGNoYW5uZWwnKTtcblx0fVxuXHRpZiAoY2hlY2tlZEFyY2hpdmVkICYmIHJvb20uYXJjaGl2ZWQpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLWFyY2hpdmVkJywgYFRoZSBjaGFubmVsLCAkeyByb29tLm5hbWUgfSwgaXMgYXJjaGl2ZWRgKTtcblx0fVxuXG5cdHJldHVybiByb29tO1xufVxuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncm9vbXMuZ2V0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyB1cGRhdGVkU2luY2UgfSA9IHRoaXMucXVlcnlQYXJhbXM7XG5cblx0XHRsZXQgdXBkYXRlZFNpbmNlRGF0ZTtcblx0XHRpZiAodXBkYXRlZFNpbmNlKSB7XG5cdFx0XHRpZiAoaXNOYU4oRGF0ZS5wYXJzZSh1cGRhdGVkU2luY2UpKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci11cGRhdGVkU2luY2UtcGFyYW0taW52YWxpZCcsICdUaGUgXCJ1cGRhdGVkU2luY2VcIiBxdWVyeSBwYXJhbWV0ZXIgbXVzdCBiZSBhIHZhbGlkIGRhdGUuJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1cGRhdGVkU2luY2VEYXRlID0gbmV3IERhdGUodXBkYXRlZFNpbmNlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHJlc3VsdCA9IE1ldGVvci5jYWxsKCdyb29tcy9nZXQnLCB1cGRhdGVkU2luY2VEYXRlKSk7XG5cblx0XHRpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG5cdFx0XHRyZXN1bHQgPSB7XG5cdFx0XHRcdHVwZGF0ZTogcmVzdWx0LFxuXHRcdFx0XHRyZW1vdmU6IFtdXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHJlc3VsdCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncm9vbXMudXBsb2FkLzpyaWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3Qgcm9vbSA9IE1ldGVvci5jYWxsKCdjYW5BY2Nlc3NSb29tJywgdGhpcy51cmxQYXJhbXMucmlkLCB0aGlzLnVzZXJJZCk7XG5cblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCBidXNib3kgPSBuZXcgQnVzYm95KHsgaGVhZGVyczogdGhpcy5yZXF1ZXN0LmhlYWRlcnMgfSk7XG5cdFx0Y29uc3QgZmlsZXMgPSBbXTtcblx0XHRjb25zdCBmaWVsZHMgPSB7fTtcblxuXHRcdE1ldGVvci53cmFwQXN5bmMoKGNhbGxiYWNrKSA9PiB7XG5cdFx0XHRidXNib3kub24oJ2ZpbGUnLCAoZmllbGRuYW1lLCBmaWxlLCBmaWxlbmFtZSwgZW5jb2RpbmcsIG1pbWV0eXBlKSA9PiB7XG5cdFx0XHRcdGlmIChmaWVsZG5hbWUgIT09ICdmaWxlJykge1xuXHRcdFx0XHRcdHJldHVybiBmaWxlcy5wdXNoKG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtZmllbGQnKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBmaWxlRGF0ZSA9IFtdO1xuXHRcdFx0XHRmaWxlLm9uKCdkYXRhJywgZGF0YSA9PiBmaWxlRGF0ZS5wdXNoKGRhdGEpKTtcblxuXHRcdFx0XHRmaWxlLm9uKCdlbmQnLCAoKSA9PiB7XG5cdFx0XHRcdFx0ZmlsZXMucHVzaCh7IGZpZWxkbmFtZSwgZmlsZSwgZmlsZW5hbWUsIGVuY29kaW5nLCBtaW1ldHlwZSwgZmlsZUJ1ZmZlcjogQnVmZmVyLmNvbmNhdChmaWxlRGF0ZSkgfSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdGJ1c2JveS5vbignZmllbGQnLCAoZmllbGRuYW1lLCB2YWx1ZSkgPT4gZmllbGRzW2ZpZWxkbmFtZV0gPSB2YWx1ZSk7XG5cblx0XHRcdGJ1c2JveS5vbignZmluaXNoJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiBjYWxsYmFjaygpKSk7XG5cblx0XHRcdHRoaXMucmVxdWVzdC5waXBlKGJ1c2JveSk7XG5cdFx0fSkoKTtcblxuXHRcdGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdGaWxlIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0aWYgKGZpbGVzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdKdXN0IDEgZmlsZSBpcyBhbGxvd2VkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlsZSA9IGZpbGVzWzBdO1xuXG5cdFx0Y29uc3QgZmlsZVN0b3JlID0gRmlsZVVwbG9hZC5nZXRTdG9yZSgnVXBsb2FkcycpO1xuXG5cdFx0Y29uc3QgZGV0YWlscyA9IHtcblx0XHRcdG5hbWU6IGZpbGUuZmlsZW5hbWUsXG5cdFx0XHRzaXplOiBmaWxlLmZpbGVCdWZmZXIubGVuZ3RoLFxuXHRcdFx0dHlwZTogZmlsZS5taW1ldHlwZSxcblx0XHRcdHJpZDogdGhpcy51cmxQYXJhbXMucmlkLFxuXHRcdFx0dXNlcklkOiB0aGlzLnVzZXJJZFxuXHRcdH07XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRjb25zdCB1cGxvYWRlZEZpbGUgPSBNZXRlb3Iud3JhcEFzeW5jKGZpbGVTdG9yZS5pbnNlcnQuYmluZChmaWxlU3RvcmUpKShkZXRhaWxzLCBmaWxlLmZpbGVCdWZmZXIpO1xuXG5cdFx0XHR1cGxvYWRlZEZpbGUuZGVzY3JpcHRpb24gPSBmaWVsZHMuZGVzY3JpcHRpb247XG5cblx0XHRcdGRlbGV0ZSBmaWVsZHMuZGVzY3JpcHRpb247XG5cblx0XHRcdFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoTWV0ZW9yLmNhbGwoJ3NlbmRGaWxlTWVzc2FnZScsIHRoaXMudXJsUGFyYW1zLnJpZCwgbnVsbCwgdXBsb2FkZWRGaWxlLCBmaWVsZHMpKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncm9vbXMuc2F2ZU5vdGlmaWNhdGlvbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBzYXZlTm90aWZpY2F0aW9ucyA9IChub3RpZmljYXRpb25zLCByb29tSWQpID0+IHtcblx0XHRcdE9iamVjdC5rZXlzKG5vdGlmaWNhdGlvbnMpLm1hcCgobm90aWZpY2F0aW9uS2V5KSA9PiB7XG5cdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdzYXZlTm90aWZpY2F0aW9uU2V0dGluZ3MnLCByb29tSWQsIG5vdGlmaWNhdGlvbktleSwgbm90aWZpY2F0aW9uc1tub3RpZmljYXRpb25LZXldKSk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXHRcdGNvbnN0IHsgcm9vbUlkLCBub3RpZmljYXRpb25zIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cblx0XHRpZiAoIXJvb21JZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBcXCdyb29tSWRcXCcgcGFyYW0gaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRpZiAoIW5vdGlmaWNhdGlvbnMgfHwgT2JqZWN0LmtleXMobm90aWZpY2F0aW9ucykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFxcJ25vdGlmaWNhdGlvbnNcXCcgcGFyYW0gaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRzYXZlTm90aWZpY2F0aW9ucyhub3RpZmljYXRpb25zLCByb29tSWQpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdyb29tcy5mYXZvcml0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IGZhdm9yaXRlIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5oYXNPd25Qcm9wZXJ0eSgnZmF2b3JpdGUnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBcXCdmYXZvcml0ZVxcJyBwYXJhbSBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBmaW5kUm9vbUJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMuYm9keVBhcmFtcyB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCd0b2dnbGVGYXZvcml0ZScsIHJvb20uX2lkLCBmYXZvcml0ZSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdyb29tcy5jbGVhbkhpc3RvcnknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRSb29tQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5ib2R5UGFyYW1zIH0pO1xuXG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubGF0ZXN0KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnQm9keSBwYXJhbWV0ZXIgXCJsYXRlc3RcIiBpcyByZXF1aXJlZC4nKTtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5vbGRlc3QpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtZXRlciBcIm9sZGVzdFwiIGlzIHJlcXVpcmVkLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGxhdGVzdCA9IG5ldyBEYXRlKHRoaXMuYm9keVBhcmFtcy5sYXRlc3QpO1xuXHRcdGNvbnN0IG9sZGVzdCA9IG5ldyBEYXRlKHRoaXMuYm9keVBhcmFtcy5vbGRlc3QpO1xuXG5cdFx0bGV0IGluY2x1c2l2ZSA9IGZhbHNlO1xuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLmluY2x1c2l2ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdGluY2x1c2l2ZSA9IHRoaXMuYm9keVBhcmFtcy5pbmNsdXNpdmU7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2NsZWFuUm9vbUhpc3RvcnknLCB7IHJvb21JZDogZmluZFJlc3VsdC5faWQsIGxhdGVzdCwgb2xkZXN0LCBpbmNsdXNpdmUsIGxpbWl0OiB0aGlzLmJvZHlQYXJhbXMubGltaXQsIGV4Y2x1ZGVQaW5uZWQ6IHRoaXMuYm9keVBhcmFtcy5leGNsdWRlUGlubmVkLCBmaWxlc09ubHk6IHRoaXMuYm9keVBhcmFtcy5maWxlc09ubHksIGZyb21Vc2VyczogdGhpcy5ib2R5UGFyYW1zLnVzZXJzIH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cbiIsIlJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzdWJzY3JpcHRpb25zLmdldCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgdXBkYXRlZFNpbmNlIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXG5cdFx0bGV0IHVwZGF0ZWRTaW5jZURhdGU7XG5cdFx0aWYgKHVwZGF0ZWRTaW5jZSkge1xuXHRcdFx0aWYgKGlzTmFOKERhdGUucGFyc2UodXBkYXRlZFNpbmNlKSkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbUlkLXBhcmFtLWludmFsaWQnLCAnVGhlIFwibGFzdFVwZGF0ZVwiIHF1ZXJ5IHBhcmFtZXRlciBtdXN0IGJlIGEgdmFsaWQgZGF0ZS4nKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHVwZGF0ZWRTaW5jZURhdGUgPSBuZXcgRGF0ZSh1cGRhdGVkU2luY2UpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gcmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ3N1YnNjcmlwdGlvbnMvZ2V0JywgdXBkYXRlZFNpbmNlRGF0ZSkpO1xuXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuXHRcdFx0cmVzdWx0ID0ge1xuXHRcdFx0XHR1cGRhdGU6IHJlc3VsdCxcblx0XHRcdFx0cmVtb3ZlOiBbXVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhyZXN1bHQpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3N1YnNjcmlwdGlvbnMuZ2V0T25lJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyByb29tSWQgfSA9IHRoaXMucmVxdWVzdFBhcmFtcygpO1xuXG5cdFx0aWYgKCFyb29tSWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgXFwncm9vbUlkXFwnIHBhcmFtIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbUlkLCB0aGlzLnVzZXJJZCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRzdWJzY3JpcHRpb25cblx0XHR9KTtcblx0fVxufSk7XG5cbi8qKlxuXHRUaGlzIEFQSSBpcyBzdXBwb3NlIHRvIG1hcmsgYW55IHJvb20gYXMgcmVhZC5cblxuXHRNZXRob2Q6IFBPU1Rcblx0Um91dGU6IGFwaS92MS9zdWJzY3JpcHRpb25zLnJlYWRcblx0UGFyYW1zOlxuXHRcdC0gcmlkOiBUaGUgcmlkIG9mIHRoZSByb29tIHRvIGJlIG1hcmtlZCBhcyByZWFkLlxuICovXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc3Vic2NyaXB0aW9ucy5yZWFkJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0cmlkOiBTdHJpbmdcblx0XHR9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+XG5cdFx0XHRNZXRlb3IuY2FsbCgncmVhZE1lc3NhZ2VzJywgdGhpcy5ib2R5UGFyYW1zLnJpZClcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzdWJzY3JpcHRpb25zLnVucmVhZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHJvb21JZCwgZmlyc3RVbnJlYWRNZXNzYWdlIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0aWYgKCFyb29tSWQgJiYgKGZpcnN0VW5yZWFkTWVzc2FnZSAmJiAhZmlyc3RVbnJlYWRNZXNzYWdlLl9pZCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdBdCBsZWFzdCBvbmUgb2YgXCJyb29tSWRcIiBvciBcImZpcnN0VW5yZWFkTWVzc2FnZS5faWRcIiBwYXJhbXMgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PlxuXHRcdFx0TWV0ZW9yLmNhbGwoJ3VucmVhZE1lc3NhZ2VzJywgZmlyc3RVbnJlYWRNZXNzYWdlLCByb29tSWQpXG5cdFx0KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5cbiIsIi8qIGdsb2JhbCBwcm9jZXNzV2ViaG9va01lc3NhZ2UgKi9cblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuZGVsZXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdG1zZ0lkOiBTdHJpbmcsXG5cdFx0XHRyb29tSWQ6IFN0cmluZyxcblx0XHRcdGFzVXNlcjogTWF0Y2guTWF5YmUoQm9vbGVhbilcblx0XHR9KSk7XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubXNnSWQsIHsgZmllbGRzOiB7IHU6IDEsIHJpZDogMSB9IH0pO1xuXG5cdFx0aWYgKCFtc2cpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBObyBtZXNzYWdlIGZvdW5kIHdpdGggdGhlIGlkIG9mIFwiJHsgdGhpcy5ib2R5UGFyYW1zLm1zZ0lkIH1cIi5gKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLnJvb21JZCAhPT0gbXNnLnJpZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByb29tIGlkIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIHdoZXJlIHRoZSBtZXNzYWdlIGlzIGZyb20uJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5hc1VzZXIgJiYgbXNnLnUuX2lkICE9PSB0aGlzLnVzZXJJZCAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ2ZvcmNlLWRlbGV0ZS1tZXNzYWdlJywgbXNnLnJpZCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdVbmF1dGhvcml6ZWQuIFlvdSBtdXN0IGhhdmUgdGhlIHBlcm1pc3Npb24gXCJmb3JjZS1kZWxldGUtbWVzc2FnZVwiIHRvIGRlbGV0ZSBvdGhlclxcJ3MgbWVzc2FnZSBhcyB0aGVtLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy5ib2R5UGFyYW1zLmFzVXNlciA/IG1zZy51Ll9pZCA6IHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnZGVsZXRlTWVzc2FnZScsIHsgX2lkOiBtc2cuX2lkIH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0X2lkOiBtc2cuX2lkLFxuXHRcdFx0dHM6IERhdGUubm93KCksXG5cdFx0XHRtZXNzYWdlOiBtc2dcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnN5bmNNZXNzYWdlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgcm9vbUlkLCBsYXN0VXBkYXRlIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXG5cdFx0aWYgKCFyb29tSWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb21JZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwicm9vbUlkXCIgcXVlcnkgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRpZiAoIWxhc3RVcGRhdGUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWxhc3RVcGRhdGUtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcImxhc3RVcGRhdGVcIiBxdWVyeSBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH0gZWxzZSBpZiAoaXNOYU4oRGF0ZS5wYXJzZShsYXN0VXBkYXRlKSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb21JZC1wYXJhbS1pbnZhbGlkJywgJ1RoZSBcImxhc3RVcGRhdGVcIiBxdWVyeSBwYXJhbWV0ZXIgbXVzdCBiZSBhIHZhbGlkIGRhdGUuJyk7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRyZXN1bHQgPSBNZXRlb3IuY2FsbCgnbWVzc2FnZXMvZ2V0Jywgcm9vbUlkLCB7IGxhc3RVcGRhdGU6IG5ldyBEYXRlKGxhc3RVcGRhdGUpIH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cmVzdWx0XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5nZXRNZXNzYWdlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCF0aGlzLnF1ZXJ5UGFyYW1zLm1zZ0lkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFwibXNnSWRcIiBxdWVyeSBwYXJhbWV0ZXIgbXVzdCBiZSBwcm92aWRlZC4nKTtcblx0XHR9XG5cblx0XHRsZXQgbXNnO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdG1zZyA9IE1ldGVvci5jYWxsKCdnZXRTaW5nbGVNZXNzYWdlJywgdGhpcy5xdWVyeVBhcmFtcy5tc2dJZCk7XG5cdFx0fSk7XG5cblx0XHRpZiAoIW1zZykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZXNzYWdlOiBtc2dcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnBpbk1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkIHx8ICF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJtZXNzYWdlSWRcIiBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQpO1xuXG5cdFx0aWYgKCFtc2cpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2Utbm90LWZvdW5kJywgJ1RoZSBwcm92aWRlZCBcIm1lc3NhZ2VJZFwiIGRvZXMgbm90IG1hdGNoIGFueSBleGlzdGluZyBtZXNzYWdlLicpO1xuXHRcdH1cblxuXHRcdGxldCBwaW5uZWRNZXNzYWdlO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHBpbm5lZE1lc3NhZ2UgPSBNZXRlb3IuY2FsbCgncGluTWVzc2FnZScsIG1zZykpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZTogcGlubmVkTWVzc2FnZVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQucG9zdE1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgbWVzc2FnZVJldHVybiA9IHByb2Nlc3NXZWJob29rTWVzc2FnZSh0aGlzLmJvZHlQYXJhbXMsIHRoaXMudXNlciwgdW5kZWZpbmVkLCB0cnVlKVswXTtcblxuXHRcdGlmICghbWVzc2FnZVJldHVybikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ3Vua25vd24tZXJyb3InKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR0czogRGF0ZS5ub3coKSxcblx0XHRcdGNoYW5uZWw6IG1lc3NhZ2VSZXR1cm4uY2hhbm5lbCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2VSZXR1cm4ubWVzc2FnZVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuc2VhcmNoJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyByb29tSWQsIHNlYXJjaFRleHQgfSA9IHRoaXMucXVlcnlQYXJhbXM7XG5cdFx0Y29uc3QgeyBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblxuXHRcdGlmICghcm9vbUlkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tSWQtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcInJvb21JZFwiIHF1ZXJ5IHBhcmFtIGlzIG1pc3NpbmcuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFzZWFyY2hUZXh0KSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1zZWFyY2hUZXh0LXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJzZWFyY2hUZXh0XCIgcXVlcnkgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHJlc3VsdCA9IE1ldGVvci5jYWxsKCdtZXNzYWdlU2VhcmNoJywgc2VhcmNoVGV4dCwgcm9vbUlkLCBjb3VudCkubWVzc2FnZS5kb2NzKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lc3NhZ2VzOiByZXN1bHRcblx0XHR9KTtcblx0fVxufSk7XG5cbi8vIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gYGNoYXQucG9zdE1lc3NhZ2VgIGFuZCBgY2hhdC5zZW5kTWVzc2FnZWAgaXMgdGhhdCBgY2hhdC5zZW5kTWVzc2FnZWAgYWxsb3dzXG4vLyBmb3IgcGFzc2luZyBhIHZhbHVlIGZvciBgX2lkYCBhbmQgdGhlIG90aGVyIG9uZSBkb2Vzbid0LiBBbHNvLCBgY2hhdC5zZW5kTWVzc2FnZWAgb25seSBzZW5kcyBpdCB0b1xuLy8gb25lIGNoYW5uZWwgd2hlcmVhcyB0aGUgb3RoZXIgb25lIGFsbG93cyBmb3Igc2VuZGluZyB0byBtb3JlIHRoYW4gb25lIGNoYW5uZWwgYXQgYSB0aW1lLlxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuc2VuZE1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1wYXJhbXMnLCAnVGhlIFwibWVzc2FnZVwiIHBhcmFtZXRlciBtdXN0IGJlIHByb3ZpZGVkLicpO1xuXHRcdH1cblxuXHRcdGxldCBtZXNzYWdlO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IG1lc3NhZ2UgPSBNZXRlb3IuY2FsbCgnc2VuZE1lc3NhZ2UnLCB0aGlzLmJvZHlQYXJhbXMubWVzc2FnZSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuc3Rhck1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkIHx8ICF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJtZXNzYWdlSWRcIiBwYXJhbSBpcyByZXF1aXJlZC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkKTtcblxuXHRcdGlmICghbXNnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1tZXNzYWdlLW5vdC1mb3VuZCcsICdUaGUgcHJvdmlkZWQgXCJtZXNzYWdlSWRcIiBkb2VzIG5vdCBtYXRjaCBhbnkgZXhpc3RpbmcgbWVzc2FnZS4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnc3Rhck1lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IG1zZy5faWQsXG5cdFx0XHRyaWQ6IG1zZy5yaWQsXG5cdFx0XHRzdGFycmVkOiB0cnVlXG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnVuUGluTWVzc2FnZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQgfHwgIXRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQudHJpbSgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1tZXNzYWdlaWQtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcIm1lc3NhZ2VJZFwiIHBhcmFtIGlzIHJlcXVpcmVkLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQpO1xuXG5cdFx0aWYgKCFtc2cpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2Utbm90LWZvdW5kJywgJ1RoZSBwcm92aWRlZCBcIm1lc3NhZ2VJZFwiIGRvZXMgbm90IG1hdGNoIGFueSBleGlzdGluZyBtZXNzYWdlLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCd1bnBpbk1lc3NhZ2UnLCBtc2cpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC51blN0YXJNZXNzYWdlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZCB8fCAhdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZC50cmltKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2VpZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwibWVzc2FnZUlkXCIgcGFyYW0gaXMgcmVxdWlyZWQuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbXNnID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQodGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZCk7XG5cblx0XHRpZiAoIW1zZykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZS1ub3QtZm91bmQnLCAnVGhlIHByb3ZpZGVkIFwibWVzc2FnZUlkXCIgZG9lcyBub3QgbWF0Y2ggYW55IGV4aXN0aW5nIG1lc3NhZ2UuJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3N0YXJNZXNzYWdlJywge1xuXHRcdFx0X2lkOiBtc2cuX2lkLFxuXHRcdFx0cmlkOiBtc2cucmlkLFxuXHRcdFx0c3RhcnJlZDogZmFsc2Vcblx0XHR9KSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQudXBkYXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdHJvb21JZDogU3RyaW5nLFxuXHRcdFx0bXNnSWQ6IFN0cmluZyxcblx0XHRcdHRleHQ6IFN0cmluZyAvL1VzaW5nIHRleHQgdG8gYmUgY29uc2lzdGFudCB3aXRoIGNoYXQucG9zdE1lc3NhZ2Vcblx0XHR9KSk7XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubXNnSWQpO1xuXG5cdFx0Ly9FbnN1cmUgdGhlIG1lc3NhZ2UgZXhpc3RzXG5cdFx0aWYgKCFtc2cpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBObyBtZXNzYWdlIGZvdW5kIHdpdGggdGhlIGlkIG9mIFwiJHsgdGhpcy5ib2R5UGFyYW1zLm1zZ0lkIH1cIi5gKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLnJvb21JZCAhPT0gbXNnLnJpZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByb29tIGlkIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIHdoZXJlIHRoZSBtZXNzYWdlIGlzIGZyb20uJyk7XG5cdFx0fVxuXG5cdFx0Ly9QZXJtaXNzaW9uIGNoZWNrcyBhcmUgYWxyZWFkeSBkb25lIGluIHRoZSB1cGRhdGVNZXNzYWdlIG1ldGhvZCwgc28gbm8gbmVlZCB0byBkdXBsaWNhdGUgdGhlbVxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCd1cGRhdGVNZXNzYWdlJywgeyBfaWQ6IG1zZy5faWQsIG1zZzogdGhpcy5ib2R5UGFyYW1zLnRleHQsIHJpZDogbXNnLnJpZCB9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lc3NhZ2U6IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKG1zZy5faWQpXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5yZWFjdCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQgfHwgIXRoaXMuYm9keVBhcmFtcy5tZXNzYWdlSWQudHJpbSgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1tZXNzYWdlaWQtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcIm1lc3NhZ2VJZFwiIHBhcmFtIGlzIG1pc3NpbmcuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbXNnID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQodGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZCk7XG5cblx0XHRpZiAoIW1zZykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZS1ub3QtZm91bmQnLCAnVGhlIHByb3ZpZGVkIFwibWVzc2FnZUlkXCIgZG9lcyBub3QgbWF0Y2ggYW55IGV4aXN0aW5nIG1lc3NhZ2UuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZW1vamkgPSB0aGlzLmJvZHlQYXJhbXMuZW1vamkgfHwgdGhpcy5ib2R5UGFyYW1zLnJlYWN0aW9uO1xuXG5cdFx0aWYgKCFlbW9qaSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItZW1vamktcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcImVtb2ppXCIgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnc2V0UmVhY3Rpb24nLCBlbW9qaSwgbXNnLl9pZCwgdGhpcy5ib2R5UGFyYW1zLnNob3VsZFJlYWN0KSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuZ2V0TWVzc2FnZVJlYWRSZWNlaXB0cycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgbWVzc2FnZUlkIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXHRcdGlmICghbWVzc2FnZUlkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSh7XG5cdFx0XHRcdGVycm9yOiAnVGhlIHJlcXVpcmVkIFxcJ21lc3NhZ2VJZFxcJyBwYXJhbSBpcyBtaXNzaW5nLidcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBtZXNzYWdlUmVhZFJlY2VpcHRzID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2dldFJlYWRSZWNlaXB0cycsIHsgbWVzc2FnZUlkIH0pKTtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0cmVjZWlwdHM6IG1lc3NhZ2VSZWFkUmVjZWlwdHNcblx0XHRcdH0pO1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSh7XG5cdFx0XHRcdGVycm9yOiBlcnJvci5tZXNzYWdlXG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5yZXBvcnRNZXNzYWdlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgbWVzc2FnZUlkLCBkZXNjcmlwdGlvbiB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGlmICghbWVzc2FnZUlkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHJlcXVpcmVkIFwibWVzc2FnZUlkXCIgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRpZiAoIWRlc2NyaXB0aW9uKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHJlcXVpcmVkIFwiZGVzY3JpcHRpb25cIiBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdyZXBvcnRNZXNzYWdlJywgbWVzc2FnZUlkLCBkZXNjcmlwdGlvbikpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0Lmlnbm9yZVVzZXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IHJpZCwgdXNlcklkIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXHRcdGxldCB7IGlnbm9yZSA9IHRydWUgfSA9IHRoaXMucXVlcnlQYXJhbXM7XG5cblx0XHRpZ25vcmUgPSB0eXBlb2YgaWdub3JlID09PSAnc3RyaW5nJyA/IC90cnVlfDEvLnRlc3QoaWdub3JlKSA6IGlnbm9yZTtcblxuXHRcdGlmICghcmlkIHx8ICFyaWQudHJpbSgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJyaWRcIiBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdGlmICghdXNlcklkIHx8ICF1c2VySWQudHJpbSgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci11c2VyLWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJ1c2VySWRcIiBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdpZ25vcmVVc2VyJywgeyByaWQsIHVzZXJJZCwgaWdub3JlIH0pKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NvbW1hbmRzLmdldCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHBhcmFtcyA9IHRoaXMucXVlcnlQYXJhbXM7XG5cblx0XHRpZiAodHlwZW9mIHBhcmFtcy5jb21tYW5kICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBxdWVyeSBwYXJhbSBcImNvbW1hbmRcIiBtdXN0IGJlIHByb3ZpZGVkLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNtZCA9IFJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1twYXJhbXMuY29tbWFuZC50b0xvd2VyQ2FzZSgpXTtcblxuXHRcdGlmICghY21kKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShgVGhlcmUgaXMgbm8gY29tbWFuZCBpbiB0aGUgc3lzdGVtIGJ5IHRoZSBuYW1lIG9mOiAkeyBwYXJhbXMuY29tbWFuZCB9YCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBjb21tYW5kOiBjbWQgfSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY29tbWFuZHMubGlzdCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGxldCBjb21tYW5kcyA9IE9iamVjdC52YWx1ZXMoUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzKTtcblxuXHRcdGlmIChxdWVyeSAmJiBxdWVyeS5jb21tYW5kKSB7XG5cdFx0XHRjb21tYW5kcyA9IGNvbW1hbmRzLmZpbHRlcigoY29tbWFuZCkgPT4gY29tbWFuZC5jb21tYW5kID09PSBxdWVyeS5jb21tYW5kKTtcblx0XHR9XG5cblx0XHRjb25zdCB0b3RhbENvdW50ID0gY29tbWFuZHMubGVuZ3RoO1xuXHRcdGNvbW1hbmRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMucHJvY2Vzc1F1ZXJ5T3B0aW9uc09uUmVzdWx0KGNvbW1hbmRzLCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjb21tYW5kcyxcblx0XHRcdG9mZnNldCxcblx0XHRcdGNvdW50OiBjb21tYW5kcy5sZW5ndGgsXG5cdFx0XHR0b3RhbDogdG90YWxDb3VudFxuXHRcdH0pO1xuXHR9XG59KTtcblxuLy8gRXhwZWN0cyBhIGJvZHkgb2Y6IHsgY29tbWFuZDogJ2dpbW1lJywgcGFyYW1zOiAnYW55IHN0cmluZyB2YWx1ZScsIHJvb21JZDogJ3ZhbHVlJyB9XG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY29tbWFuZHMucnVuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGJvZHkgPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyKCk7XG5cblx0XHRpZiAodHlwZW9mIGJvZHkuY29tbWFuZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdZb3UgbXVzdCBwcm92aWRlIGEgY29tbWFuZCB0byBydW4uJyk7XG5cdFx0fVxuXG5cdFx0aWYgKGJvZHkucGFyYW1zICYmIHR5cGVvZiBib2R5LnBhcmFtcyAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcGFyYW1ldGVycyBmb3IgdGhlIGNvbW1hbmQgbXVzdCBiZSBhIHNpbmdsZSBzdHJpbmcuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBib2R5LnJvb21JZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcm9vbVxcJ3MgaWQgd2hlcmUgdG8gZXhlY3V0ZSB0aGlzIGNvbW1hbmQgbXVzdCBiZSBwcm92aWRlZCBhbmQgYmUgYSBzdHJpbmcuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY21kID0gYm9keS5jb21tYW5kLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuY29tbWFuZHNbYm9keS5jb21tYW5kLnRvTG93ZXJDYXNlKCldKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNvbW1hbmQgcHJvdmlkZWQgZG9lcyBub3QgZXhpc3QgKG9yIGlzIGRpc2FibGVkKS4nKTtcblx0XHR9XG5cblx0XHQvLyBUaGlzIHdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgdGhleSBjYW4ndCBvciB0aGUgcm9vbSBpcyBpbnZhbGlkXG5cdFx0TWV0ZW9yLmNhbGwoJ2NhbkFjY2Vzc1Jvb20nLCBib2R5LnJvb21JZCwgdXNlci5faWQpO1xuXG5cdFx0Y29uc3QgcGFyYW1zID0gYm9keS5wYXJhbXMgPyBib2R5LnBhcmFtcyA6ICcnO1xuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRyZXN1bHQgPSBSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMucnVuKGNtZCwgcGFyYW1zLCB7XG5cdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdHJpZDogYm9keS5yb29tSWQsXG5cdFx0XHRcdG1zZzogYC8keyBjbWQgfSAkeyBwYXJhbXMgfWBcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyByZXN1bHQgfSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY29tbWFuZHMucHJldmlldycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Ly8gRXhwZWN0cyB0aGVzZSBxdWVyeSBwYXJhbXM6IGNvbW1hbmQ6ICdnaXBoeScsIHBhcmFtczogJ21pbmUnLCByb29tSWQ6ICd2YWx1ZSdcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRMb2dnZWRJblVzZXIoKTtcblxuXHRcdGlmICh0eXBlb2YgcXVlcnkuY29tbWFuZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdZb3UgbXVzdCBwcm92aWRlIGEgY29tbWFuZCB0byBnZXQgdGhlIHByZXZpZXdzIGZyb20uJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHF1ZXJ5LnBhcmFtcyAmJiB0eXBlb2YgcXVlcnkucGFyYW1zICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBwYXJhbWV0ZXJzIGZvciB0aGUgY29tbWFuZCBtdXN0IGJlIGEgc2luZ2xlIHN0cmluZy4nKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHF1ZXJ5LnJvb21JZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcm9vbVxcJ3MgaWQgd2hlcmUgdGhlIHByZXZpZXdzIGFyZSBiZWluZyBkaXNwbGF5ZWQgbXVzdCBiZSBwcm92aWRlZCBhbmQgYmUgYSBzdHJpbmcuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY21kID0gcXVlcnkuY29tbWFuZC50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmICghUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF0pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgY29tbWFuZCBwcm92aWRlZCBkb2VzIG5vdCBleGlzdCAob3IgaXMgZGlzYWJsZWQpLicpO1xuXHRcdH1cblxuXHRcdC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBlcnJvciBpZiB0aGV5IGNhbid0IG9yIHRoZSByb29tIGlzIGludmFsaWRcblx0XHRNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIHF1ZXJ5LnJvb21JZCwgdXNlci5faWQpO1xuXG5cdFx0Y29uc3QgcGFyYW1zID0gcXVlcnkucGFyYW1zID8gcXVlcnkucGFyYW1zIDogJyc7XG5cblx0XHRsZXQgcHJldmlldztcblx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRwcmV2aWV3ID0gTWV0ZW9yLmNhbGwoJ2dldFNsYXNoQ29tbWFuZFByZXZpZXdzJywgeyBjbWQsIHBhcmFtcywgbXNnOiB7IHJpZDogcXVlcnkucm9vbUlkIH0gfSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHByZXZpZXcgfSk7XG5cdH0sXG5cdC8vIEV4cGVjdHMgYSBib2R5IGZvcm1hdCBvZjogeyBjb21tYW5kOiAnZ2lwaHknLCBwYXJhbXM6ICdtaW5lJywgcm9vbUlkOiAndmFsdWUnLCBwcmV2aWV3SXRlbTogeyBpZDogJ3NhZGY4JyB0eXBlOiAnaW1hZ2UnLCB2YWx1ZTogJ2h0dHBzOi8vZGV2Lm51bGwvZ2lmIH0gfVxuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGJvZHkgPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyKCk7XG5cblx0XHRpZiAodHlwZW9mIGJvZHkuY29tbWFuZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdZb3UgbXVzdCBwcm92aWRlIGEgY29tbWFuZCB0byBydW4gdGhlIHByZXZpZXcgaXRlbSBvbi4nKTtcblx0XHR9XG5cblx0XHRpZiAoYm9keS5wYXJhbXMgJiYgdHlwZW9mIGJvZHkucGFyYW1zICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBwYXJhbWV0ZXJzIGZvciB0aGUgY29tbWFuZCBtdXN0IGJlIGEgc2luZ2xlIHN0cmluZy4nKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIGJvZHkucm9vbUlkICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByb29tXFwncyBpZCB3aGVyZSB0aGUgcHJldmlldyBpcyBiZWluZyBleGVjdXRlZCBpbiBtdXN0IGJlIHByb3ZpZGVkIGFuZCBiZSBhIHN0cmluZy4nKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIGJvZHkucHJldmlld0l0ZW0gPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHByZXZpZXcgaXRlbSBiZWluZyBleGVjdXRlZCBtdXN0IGJlIHByb3ZpZGVkLicpO1xuXHRcdH1cblxuXHRcdGlmICghYm9keS5wcmV2aWV3SXRlbS5pZCB8fCAhYm9keS5wcmV2aWV3SXRlbS50eXBlIHx8IHR5cGVvZiBib2R5LnByZXZpZXdJdGVtLnZhbHVlID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBwcmV2aWV3IGl0ZW0gYmVpbmcgZXhlY3V0ZWQgaXMgaW4gdGhlIHdyb25nIGZvcm1hdC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBjbWQgPSBib2R5LmNvbW1hbmQudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAoIVJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1tjbWRdKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNvbW1hbmQgcHJvdmlkZWQgZG9lcyBub3QgZXhpc3QgKG9yIGlzIGRpc2FibGVkKS4nKTtcblx0XHR9XG5cblx0XHQvLyBUaGlzIHdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgdGhleSBjYW4ndCBvciB0aGUgcm9vbSBpcyBpbnZhbGlkXG5cdFx0TWV0ZW9yLmNhbGwoJ2NhbkFjY2Vzc1Jvb20nLCBib2R5LnJvb21JZCwgdXNlci5faWQpO1xuXG5cdFx0Y29uc3QgcGFyYW1zID0gYm9keS5wYXJhbXMgPyBib2R5LnBhcmFtcyA6ICcnO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2V4ZWN1dGVTbGFzaENvbW1hbmRQcmV2aWV3JywgeyBjbWQsIHBhcmFtcywgbXNnOiB7IHJpZDogYm9keS5yb29tSWQgfSB9LCBib2R5LnByZXZpZXdJdGVtKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2Vtb2ppLWN1c3RvbScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGVtb2ppcyA9IE1ldGVvci5jYWxsKCdsaXN0RW1vamlDdXN0b20nKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgZW1vamlzIH0pO1xuXHR9XG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG4vL1JldHVybnMgdGhlIHByaXZhdGUgZ3JvdXAgc3Vic2NyaXB0aW9uIElGIGZvdW5kIG90aGVyd2lzZSBpdCB3aWxsIHJldHVybiB0aGUgZmFpbHVyZSBvZiB3aHkgaXQgZGlkbid0LiBDaGVjayB0aGUgYHN0YXR1c0NvZGVgIHByb3BlcnR5XG5mdW5jdGlvbiBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtcywgdXNlcklkLCBjaGVja2VkQXJjaGl2ZWQgPSB0cnVlIH0pIHtcblx0aWYgKCghcGFyYW1zLnJvb21JZCB8fCAhcGFyYW1zLnJvb21JZC50cmltKCkpICYmICghcGFyYW1zLnJvb21OYW1lIHx8ICFwYXJhbXMucm9vbU5hbWUudHJpbSgpKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSBwYXJhbWV0ZXIgXCJyb29tSWRcIiBvciBcInJvb21OYW1lXCIgaXMgcmVxdWlyZWQnKTtcblx0fVxuXG5cdGxldCByb29tU3ViO1xuXHRpZiAocGFyYW1zLnJvb21JZCkge1xuXHRcdHJvb21TdWIgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChwYXJhbXMucm9vbUlkLCB1c2VySWQpO1xuXHR9IGVsc2UgaWYgKHBhcmFtcy5yb29tTmFtZSkge1xuXHRcdHJvb21TdWIgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21OYW1lQW5kVXNlcklkKHBhcmFtcy5yb29tTmFtZSwgdXNlcklkKTtcblx0fVxuXG5cdGlmICghcm9vbVN1YiB8fCByb29tU3ViLnQgIT09ICdwJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tbm90LWZvdW5kJywgJ1RoZSByZXF1aXJlZCBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBwYXJhbSBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCBhbnkgZ3JvdXAnKTtcblx0fVxuXG5cdGlmIChjaGVja2VkQXJjaGl2ZWQgJiYgcm9vbVN1Yi5hcmNoaXZlZCkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tYXJjaGl2ZWQnLCBgVGhlIHByaXZhdGUgZ3JvdXAsICR7IHJvb21TdWIubmFtZSB9LCBpcyBhcmNoaXZlZGApO1xuXHR9XG5cblx0cmV0dXJuIHJvb21TdWI7XG59XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuYWRkQWxsJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkQWxsVXNlclRvUm9vbScsIGZpbmRSZXN1bHQucmlkLCB0aGlzLmJvZHlQYXJhbXMuYWN0aXZlVXNlcnNPbmx5KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0LnJpZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSlcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuYWRkTW9kZXJhdG9yJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2FkZFJvb21Nb2RlcmF0b3InLCBmaW5kUmVzdWx0LnJpZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuYWRkT3duZXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkUm9vbU93bmVyJywgZmluZFJlc3VsdC5yaWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmFkZExlYWRlcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2FkZFJvb21MZWFkZXInLCBmaW5kUmVzdWx0LnJpZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cbi8vQXJjaGl2ZXMgYSBwcml2YXRlIGdyb3VwIG9ubHkgaWYgaXQgd2Fzbid0XG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmFyY2hpdmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhcmNoaXZlUm9vbScsIGZpbmRSZXN1bHQucmlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmNsb3NlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQsIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRpZiAoIWZpbmRSZXN1bHQub3Blbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYFRoZSBwcml2YXRlIGdyb3VwLCAkeyBmaW5kUmVzdWx0Lm5hbWUgfSwgaXMgYWxyZWFkeSBjbG9zZWQgdG8gdGhlIHNlbmRlcmApO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdoaWRlUm9vbScsIGZpbmRSZXN1bHQucmlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmNvdW50ZXJzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgYWNjZXNzID0gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJyk7XG5cdFx0Y29uc3QgcGFyYW1zID0gdGhpcy5yZXF1ZXN0UGFyYW1zKCk7XG5cdFx0bGV0IHVzZXIgPSB0aGlzLnVzZXJJZDtcblx0XHRsZXQgcm9vbTtcblx0XHRsZXQgdW5yZWFkcyA9IG51bGw7XG5cdFx0bGV0IHVzZXJNZW50aW9ucyA9IG51bGw7XG5cdFx0bGV0IHVucmVhZHNGcm9tID0gbnVsbDtcblx0XHRsZXQgam9pbmVkID0gZmFsc2U7XG5cdFx0bGV0IG1zZ3MgPSBudWxsO1xuXHRcdGxldCBsYXRlc3QgPSBudWxsO1xuXHRcdGxldCBtZW1iZXJzID0gbnVsbDtcblxuXHRcdGlmICgoIXBhcmFtcy5yb29tSWQgfHwgIXBhcmFtcy5yb29tSWQudHJpbSgpKSAmJiAoIXBhcmFtcy5yb29tTmFtZSB8fCAhcGFyYW1zLnJvb21OYW1lLnRyaW0oKSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSBwYXJhbWV0ZXIgXCJyb29tSWRcIiBvciBcInJvb21OYW1lXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRpZiAocGFyYW1zLnJvb21JZCkge1xuXHRcdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHBhcmFtcy5yb29tSWQpO1xuXHRcdH0gZWxzZSBpZiAocGFyYW1zLnJvb21OYW1lKSB7XG5cdFx0XHRyb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShwYXJhbXMucm9vbU5hbWUpO1xuXHRcdH1cblxuXHRcdGlmICghcm9vbSB8fCByb29tLnQgIT09ICdwJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1ub3QtZm91bmQnLCAnVGhlIHJlcXVpcmVkIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIHBhcmFtIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIGFueSBncm91cCcpO1xuXHRcdH1cblxuXHRcdGlmIChyb29tLmFyY2hpdmVkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLWFyY2hpdmVkJywgYFRoZSBwcml2YXRlIGdyb3VwLCAkeyByb29tLm5hbWUgfSwgaXMgYXJjaGl2ZWRgKTtcblx0XHR9XG5cblx0XHRpZiAocGFyYW1zLnVzZXJJZCkge1xuXHRcdFx0aWYgKCFhY2Nlc3MpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdFx0fVxuXHRcdFx0dXNlciA9IHBhcmFtcy51c2VySWQ7XG5cdFx0fVxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCB1c2VyKTtcblx0XHRjb25zdCBsbSA9IHJvb20ubG0gPyByb29tLmxtIDogcm9vbS5fdXBkYXRlZEF0O1xuXG5cdFx0aWYgKHR5cGVvZiBzdWJzY3JpcHRpb24gIT09ICd1bmRlZmluZWQnICYmIHN1YnNjcmlwdGlvbi5vcGVuKSB7XG5cdFx0XHRpZiAoc3Vic2NyaXB0aW9uLmxzKSB7XG5cdFx0XHRcdHVucmVhZHMgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jb3VudFZpc2libGVCeVJvb21JZEJldHdlZW5UaW1lc3RhbXBzSW5jbHVzaXZlKHN1YnNjcmlwdGlvbi5yaWQsIHN1YnNjcmlwdGlvbi5scywgbG0pO1xuXHRcdFx0XHR1bnJlYWRzRnJvbSA9IHN1YnNjcmlwdGlvbi5scztcblx0XHRcdH1cblx0XHRcdHVzZXJNZW50aW9ucyA9IHN1YnNjcmlwdGlvbi51c2VyTWVudGlvbnM7XG5cdFx0XHRqb2luZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmIChhY2Nlc3MgfHwgam9pbmVkKSB7XG5cdFx0XHRtc2dzID0gcm9vbS5tc2dzO1xuXHRcdFx0bGF0ZXN0ID0gbG07XG5cdFx0XHRtZW1iZXJzID0gcm9vbS51c2Vyc0NvdW50O1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGpvaW5lZCxcblx0XHRcdG1lbWJlcnMsXG5cdFx0XHR1bnJlYWRzLFxuXHRcdFx0dW5yZWFkc0Zyb20sXG5cdFx0XHRtc2dzLFxuXHRcdFx0bGF0ZXN0LFxuXHRcdFx0dXNlck1lbnRpb25zXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG4vL0NyZWF0ZSBQcml2YXRlIEdyb3VwXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmNyZWF0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ2NyZWF0ZS1wJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5uYW1lKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnQm9keSBwYXJhbSBcIm5hbWVcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmJvZHlQYXJhbXMubWVtYmVycyAmJiAhXy5pc0FycmF5KHRoaXMuYm9keVBhcmFtcy5tZW1iZXJzKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW0gXCJtZW1iZXJzXCIgbXVzdCBiZSBhbiBhcnJheSBpZiBwcm92aWRlZCcpO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzICYmICEodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMgPT09ICdvYmplY3QnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW0gXCJjdXN0b21GaWVsZHNcIiBtdXN0IGJlIGFuIG9iamVjdCBpZiBwcm92aWRlZCcpO1xuXHRcdH1cblxuXHRcdGxldCByZWFkT25seSA9IGZhbHNlO1xuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmVhZE9ubHkgPSB0aGlzLmJvZHlQYXJhbXMucmVhZE9ubHk7XG5cdFx0fVxuXG5cdFx0bGV0IGlkO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdGlkID0gTWV0ZW9yLmNhbGwoJ2NyZWF0ZVByaXZhdGVHcm91cCcsIHRoaXMuYm9keVBhcmFtcy5uYW1lLCB0aGlzLmJvZHlQYXJhbXMubWVtYmVycyA/IHRoaXMuYm9keVBhcmFtcy5tZW1iZXJzIDogW10sIHJlYWRPbmx5LCB0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChpZC5yaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmRlbGV0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2VyYXNlUm9vbScsIGZpbmRSZXN1bHQucmlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0LnJpZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSlcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuZmlsZXMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXHRcdGNvbnN0IGFkZFVzZXJPYmplY3RUb0V2ZXJ5T2JqZWN0ID0gKGZpbGUpID0+IHtcblx0XHRcdGlmIChmaWxlLnVzZXJJZCkge1xuXHRcdFx0XHRmaWxlID0gdGhpcy5pbnNlcnRVc2VyT2JqZWN0KHsgb2JqZWN0OiBmaWxlLCB1c2VySWQ6IGZpbGUudXNlcklkIH0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZpbGU7XG5cdFx0fTtcblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgcmlkOiBmaW5kUmVzdWx0LnJpZCB9KTtcblxuXHRcdGNvbnN0IGZpbGVzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGZpbGVzOiBmaWxlcy5tYXAoYWRkVXNlck9iamVjdFRvRXZlcnlPYmplY3QpLFxuXHRcdFx0Y291bnQ6IGZpbGVzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmZpbmQob3VyUXVlcnkpLmNvdW50KClcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuZ2V0SW50ZWdyYXRpb25zJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0bGV0IGluY2x1ZGVBbGxQcml2YXRlR3JvdXBzID0gdHJ1ZTtcblx0XHRpZiAodHlwZW9mIHRoaXMucXVlcnlQYXJhbXMuaW5jbHVkZUFsbFByaXZhdGVHcm91cHMgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRpbmNsdWRlQWxsUHJpdmF0ZUdyb3VwcyA9IHRoaXMucXVlcnlQYXJhbXMuaW5jbHVkZUFsbFByaXZhdGVHcm91cHMgPT09ICd0cnVlJztcblx0XHR9XG5cblx0XHRjb25zdCBjaGFubmVsc1RvU2VhcmNoID0gW2AjJHsgZmluZFJlc3VsdC5uYW1lIH1gXTtcblx0XHRpZiAoaW5jbHVkZUFsbFByaXZhdGVHcm91cHMpIHtcblx0XHRcdGNoYW5uZWxzVG9TZWFyY2gucHVzaCgnYWxsX3ByaXZhdGVfZ3JvdXBzJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyBjaGFubmVsOiB7ICRpbjogY2hhbm5lbHNUb1NlYXJjaCB9IH0pO1xuXHRcdGNvbnN0IGludGVncmF0aW9ucyA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgX2NyZWF0ZWRBdDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGludGVncmF0aW9ucyxcblx0XHRcdGNvdW50OiBpbnRlZ3JhdGlvbnMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kKG91clF1ZXJ5KS5jb3VudCgpXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmhpc3RvcnknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0bGV0IGxhdGVzdERhdGUgPSBuZXcgRGF0ZSgpO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmxhdGVzdCkge1xuXHRcdFx0bGF0ZXN0RGF0ZSA9IG5ldyBEYXRlKHRoaXMucXVlcnlQYXJhbXMubGF0ZXN0KTtcblx0XHR9XG5cblx0XHRsZXQgb2xkZXN0RGF0ZSA9IHVuZGVmaW5lZDtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5vbGRlc3QpIHtcblx0XHRcdG9sZGVzdERhdGUgPSBuZXcgRGF0ZSh0aGlzLnF1ZXJ5UGFyYW1zLm9sZGVzdCk7XG5cdFx0fVxuXG5cdFx0bGV0IGluY2x1c2l2ZSA9IGZhbHNlO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmluY2x1c2l2ZSkge1xuXHRcdFx0aW5jbHVzaXZlID0gdGhpcy5xdWVyeVBhcmFtcy5pbmNsdXNpdmU7XG5cdFx0fVxuXG5cdFx0bGV0IGNvdW50ID0gMjA7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMuY291bnQpIHtcblx0XHRcdGNvdW50ID0gcGFyc2VJbnQodGhpcy5xdWVyeVBhcmFtcy5jb3VudCk7XG5cdFx0fVxuXG5cdFx0bGV0IHVucmVhZHMgPSBmYWxzZTtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy51bnJlYWRzKSB7XG5cdFx0XHR1bnJlYWRzID0gdGhpcy5xdWVyeVBhcmFtcy51bnJlYWRzO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0cmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ2dldENoYW5uZWxIaXN0b3J5JywgeyByaWQ6IGZpbmRSZXN1bHQucmlkLCBsYXRlc3Q6IGxhdGVzdERhdGUsIG9sZGVzdDogb2xkZXN0RGF0ZSwgaW5jbHVzaXZlLCBjb3VudCwgdW5yZWFkcyB9KTtcblx0XHR9KTtcblxuXHRcdGlmICghcmVzdWx0KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MocmVzdWx0KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuaW5mbycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQsIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRncm91cDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5yaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmludml0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHJvb21JZCA9ICcnLCByb29tTmFtZSA9ICcnIH0gPSB0aGlzLnJlcXVlc3RQYXJhbXMoKTtcblx0XHRjb25zdCBpZE9yTmFtZSA9IHJvb21JZCB8fCByb29tTmFtZTtcblx0XHRpZiAoIWlkT3JOYW1lLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHBhcmFtZXRlciBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgX2lkOiByaWQsIHQ6IHR5cGUgfSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkT3JOYW1lKGlkT3JOYW1lKSB8fCB7fTtcblxuXHRcdGlmICghcmlkIHx8IHR5cGUgIT09ICdwJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1ub3QtZm91bmQnLCAnVGhlIHJlcXVpcmVkIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIHBhcmFtIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIGFueSBncm91cCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgdXNlcm5hbWUgfSA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdhZGRVc2VyVG9Sb29tJywgeyByaWQsIHVzZXJuYW1lIH0pKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmtpY2snLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgncmVtb3ZlVXNlckZyb21Sb29tJywgeyByaWQ6IGZpbmRSZXN1bHQucmlkLCB1c2VybmFtZTogdXNlci51c2VybmFtZSB9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmxlYXZlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnbGVhdmVSb29tJywgZmluZFJlc3VsdC5yaWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cbi8vTGlzdCBQcml2YXRlIEdyb3VwcyBhIHVzZXIgaGFzIGFjY2VzcyB0b1xuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5saXN0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdC8vIFRPRE86IENBQ0hFOiBBZGQgQnJlYWNraW5nIG5vdGljZSBzaW5jZSB3ZSByZW1vdmVkIHRoZSBxdWVyeSBwYXJhbVxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRCeVN1YnNjcmlwdGlvblR5cGVBbmRVc2VySWQoJ3AnLCB0aGlzLnVzZXJJZCwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWxDb3VudCA9IGN1cnNvci5jb3VudCgpO1xuXHRcdGNvbnN0IHJvb21zID0gY3Vyc29yLmZldGNoKCk7XG5cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3Vwczogcm9vbXMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0dG90YWw6IHRvdGFsQ291bnRcblx0XHR9KTtcblx0fVxufSk7XG5cblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5saXN0QWxsJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXJvb20tYWRtaW5pc3RyYXRpb24nKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyB0OiAncCcgfSk7XG5cblx0XHRsZXQgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKG91clF1ZXJ5KS5mZXRjaCgpO1xuXHRcdGNvbnN0IHRvdGFsQ291bnQgPSByb29tcy5sZW5ndGg7XG5cblx0XHRyb29tcyA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLnByb2Nlc3NRdWVyeU9wdGlvbnNPblJlc3VsdChyb29tcywge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXBzOiByb29tcyxcblx0XHRcdG9mZnNldCxcblx0XHRcdGNvdW50OiByb29tcy5sZW5ndGgsXG5cdFx0XHR0b3RhbDogdG90YWxDb3VudFxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5tZW1iZXJzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5yaWQsIHsgZmllbGRzOiB7IGJyb2FkY2FzdDogMSB9IH0pO1xuXG5cdFx0aWYgKHJvb20uYnJvYWRjYXN0ICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWJyb2FkY2FzdC1tZW1iZXItbGlzdCcpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCA9IHt9IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb25zID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWQoZmluZFJlc3VsdC5yaWQsIHtcblx0XHRcdGZpZWxkczogeyAndS5faWQnOiAxIH0sXG5cdFx0XHRzb3J0OiB7ICd1LnVzZXJuYW1lJzogc29ydC51c2VybmFtZSAhPSBudWxsID8gc29ydC51c2VybmFtZSA6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWwgPSBzdWJzY3JpcHRpb25zLmNvdW50KCk7XG5cblx0XHRjb25zdCBtZW1iZXJzID0gc3Vic2NyaXB0aW9ucy5mZXRjaCgpLm1hcChzID0+IHMudSAmJiBzLnUuX2lkKTtcblxuXHRcdGNvbnN0IHVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh7IF9pZDogeyAkaW46IG1lbWJlcnMgfSB9LCB7XG5cdFx0XHRmaWVsZHM6IHsgX2lkOiAxLCB1c2VybmFtZTogMSwgbmFtZTogMSwgc3RhdHVzOiAxLCB1dGNPZmZzZXQ6IDEgfSxcblx0XHRcdHNvcnQ6IHsgdXNlcm5hbWU6ICBzb3J0LnVzZXJuYW1lICE9IG51bGwgPyBzb3J0LnVzZXJuYW1lIDogMSB9XG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lbWJlcnM6IHVzZXJzLFxuXHRcdFx0Y291bnQ6IHVzZXJzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLm1lc3NhZ2VzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHJpZDogZmluZFJlc3VsdC5yaWQgfSk7XG5cblx0XHRjb25zdCBtZXNzYWdlcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogLTEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZXNzYWdlcyxcblx0XHRcdGNvdW50OiBtZXNzYWdlcy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZChvdXJRdWVyeSkuY291bnQoKVxuXHRcdH0pO1xuXHR9XG59KTtcbi8vIFRPRE86IENBQ0hFOiBzYW1lIGFzIGNoYW5uZWxzLm9ubGluZVxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5vbmxpbmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyB0OiAncCcgfSk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZShvdXJRdWVyeSk7XG5cblx0XHRpZiAocm9vbSA9PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnR3JvdXAgZG9lcyBub3QgZXhpc3RzJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgb25saW5lID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZFVzZXJzTm90T2ZmbGluZSh7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0dXNlcm5hbWU6IDFcblx0XHRcdH1cblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0Y29uc3Qgb25saW5lSW5Sb29tID0gW107XG5cdFx0b25saW5lLmZvckVhY2godXNlciA9PiB7XG5cdFx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb290Ll9pZCwgdXNlci5faWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXHRcdFx0aWYgKHN1YnNjcmlwdGlvbikge1xuXHRcdFx0XHRvbmxpbmVJblJvb20ucHVzaCh7XG5cdFx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG9ubGluZTogb25saW5lSW5Sb29tXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLm9wZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0Lm9wZW4pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgcHJpdmF0ZSBncm91cCwgJHsgZmluZFJlc3VsdC5uYW1lIH0sIGlzIGFscmVhZHkgb3BlbiBmb3IgdGhlIHNlbmRlcmApO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdvcGVuUm9vbScsIGZpbmRSZXN1bHQucmlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnJlbW92ZU1vZGVyYXRvcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdyZW1vdmVSb29tTW9kZXJhdG9yJywgZmluZFJlc3VsdC5yaWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnJlbW92ZU93bmVyJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3JlbW92ZVJvb21Pd25lcicsIGZpbmRSZXN1bHQucmlkLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5yZW1vdmVMZWFkZXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgncmVtb3ZlUm9vbUxlYWRlcicsIGZpbmRSZXN1bHQucmlkLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5yZW5hbWUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubmFtZSB8fCAhdGhpcy5ib2R5UGFyYW1zLm5hbWUudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcIm5hbWVcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogeyByb29tSWQ6IHRoaXMuYm9keVBhcmFtcy5yb29tSWR9LCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0LnJpZCwgJ3Jvb21OYW1lJywgdGhpcy5ib2R5UGFyYW1zLm5hbWUpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5zZXRDdXN0b21GaWVsZHMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzIHx8ICEodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMgPT09ICdvYmplY3QnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJjdXN0b21GaWVsZHNcIiBpcyByZXF1aXJlZCB3aXRoIGEgdHlwZSBsaWtlIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0LnJpZCwgJ3Jvb21DdXN0b21GaWVsZHMnLCB0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0LnJpZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSlcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuc2V0RGVzY3JpcHRpb24nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb24gfHwgIXRoaXMuYm9keVBhcmFtcy5kZXNjcmlwdGlvbi50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwiZGVzY3JpcHRpb25cIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQucmlkLCAncm9vbURlc2NyaXB0aW9uJywgdGhpcy5ib2R5UGFyYW1zLmRlc2NyaXB0aW9uKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGRlc2NyaXB0aW9uOiB0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb25cblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuc2V0UHVycG9zZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5wdXJwb3NlIHx8ICF0aGlzLmJvZHlQYXJhbXMucHVycG9zZS50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwicHVycG9zZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yaWQsICdyb29tRGVzY3JpcHRpb24nLCB0aGlzLmJvZHlQYXJhbXMucHVycG9zZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRwdXJwb3NlOiB0aGlzLmJvZHlQYXJhbXMucHVycG9zZVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5zZXRSZWFkT25seScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5yZWFkT25seSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwicmVhZE9ubHlcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC5ybyA9PT0gdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHByaXZhdGUgZ3JvdXAgcmVhZCBvbmx5IHNldHRpbmcgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yaWQsICdyZWFkT25seScsIHRoaXMuYm9keVBhcmFtcy5yZWFkT25seSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRncm91cDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5yaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnNldFRvcGljJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLnRvcGljIHx8ICF0aGlzLmJvZHlQYXJhbXMudG9waWMudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcInRvcGljXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0LnJpZCwgJ3Jvb21Ub3BpYycsIHRoaXMuYm9keVBhcmFtcy50b3BpYyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR0b3BpYzogdGhpcy5ib2R5UGFyYW1zLnRvcGljXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnNldFR5cGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudHlwZSB8fCAhdGhpcy5ib2R5UGFyYW1zLnR5cGUudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcInR5cGVcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC50ID09PSB0aGlzLmJvZHlQYXJhbXMudHlwZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBwcml2YXRlIGdyb3VwIHR5cGUgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yaWQsICdyb29tVHlwZScsIHRoaXMuYm9keVBhcmFtcy50eXBlKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0LnJpZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSlcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMudW5hcmNoaXZlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQsIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgndW5hcmNoaXZlUm9vbScsIGZpbmRSZXN1bHQucmlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnJvbGVzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IHJvbGVzID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2dldFJvb21Sb2xlcycsIGZpbmRSZXN1bHQucmlkKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRyb2xlc1xuXHRcdH0pO1xuXHR9XG59KTtcbiIsImZ1bmN0aW9uIGZpbmREaXJlY3RNZXNzYWdlUm9vbShwYXJhbXMsIHVzZXIpIHtcblx0aWYgKCghcGFyYW1zLnJvb21JZCB8fCAhcGFyYW1zLnJvb21JZC50cmltKCkpICYmICghcGFyYW1zLnVzZXJuYW1lIHx8ICFwYXJhbXMudXNlcm5hbWUudHJpbSgpKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tcGFyYW0tbm90LXByb3ZpZGVkJywgJ0JvZHkgcGFyYW0gXCJyb29tSWRcIiBvciBcInVzZXJuYW1lXCIgaXMgcmVxdWlyZWQnKTtcblx0fVxuXG5cdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0LmdldFJvb21CeU5hbWVPcklkV2l0aE9wdGlvblRvSm9pbih7XG5cdFx0Y3VycmVudFVzZXJJZDogdXNlci5faWQsXG5cdFx0bmFtZU9ySWQ6IHBhcmFtcy51c2VybmFtZSB8fCBwYXJhbXMucm9vbUlkLFxuXHRcdHR5cGU6ICdkJ1xuXHR9KTtcblxuXHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAnZCcpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLW5vdC1mb3VuZCcsICdUaGUgcmVxdWlyZWQgXCJyb29tSWRcIiBvciBcInVzZXJuYW1lXCIgcGFyYW0gcHJvdmlkZWQgZG9lcyBub3QgbWF0Y2ggYW55IGRpcmN0IG1lc3NhZ2UnKTtcblx0fVxuXG5cdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCB1c2VyLl9pZCk7XG5cblx0cmV0dXJuIHtcblx0XHRyb29tLFxuXHRcdHN1YnNjcmlwdGlvblxuXHR9O1xufVxuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZShbJ2RtLmNyZWF0ZScsICdpbS5jcmVhdGUnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kRGlyZWN0TWVzc2FnZVJvb20odGhpcy5yZXF1ZXN0UGFyYW1zKCksIHRoaXMudXNlcik7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRyb29tOiBmaW5kUmVzdWx0LnJvb21cblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0uY2xvc2UnLCAnaW0uY2xvc2UnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kRGlyZWN0TWVzc2FnZVJvb20odGhpcy5yZXF1ZXN0UGFyYW1zKCksIHRoaXMudXNlcik7XG5cblx0XHRpZiAoIWZpbmRSZXN1bHQuc3Vic2NyaXB0aW9uLm9wZW4pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgZGlyZWN0IG1lc3NhZ2Ugcm9vbSwgJHsgdGhpcy5ib2R5UGFyYW1zLm5hbWUgfSwgaXMgYWxyZWFkeSBjbG9zZWQgdG8gdGhlIHNlbmRlcmApO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdoaWRlUm9vbScsIGZpbmRSZXN1bHQucm9vbS5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0uY291bnRlcnMnLCAnaW0uY291bnRlcnMnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgYWNjZXNzID0gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJyk7XG5cdFx0Y29uc3QgcnVzZXJJZCA9IHRoaXMucmVxdWVzdFBhcmFtcygpLnVzZXJJZDtcblx0XHRsZXQgdXNlciA9IHRoaXMudXNlcklkO1xuXHRcdGxldCB1bnJlYWRzID0gbnVsbDtcblx0XHRsZXQgdXNlck1lbnRpb25zID0gbnVsbDtcblx0XHRsZXQgdW5yZWFkc0Zyb20gPSBudWxsO1xuXHRcdGxldCBqb2luZWQgPSBmYWxzZTtcblx0XHRsZXQgbXNncyA9IG51bGw7XG5cdFx0bGV0IGxhdGVzdCA9IG51bGw7XG5cdFx0bGV0IG1lbWJlcnMgPSBudWxsO1xuXHRcdGxldCBsbSA9IG51bGw7XG5cblx0XHRpZiAocnVzZXJJZCkge1xuXHRcdFx0aWYgKCFhY2Nlc3MpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdFx0fVxuXHRcdFx0dXNlciA9IHJ1c2VySWQ7XG5cdFx0fVxuXHRcdGNvbnN0IHJzID0gZmluZERpcmVjdE1lc3NhZ2VSb29tKHRoaXMucmVxdWVzdFBhcmFtcygpLCB7J19pZCc6IHVzZXJ9KTtcblx0XHRjb25zdCByb29tID0gcnMucm9vbTtcblx0XHRjb25zdCBkbSA9IHJzLnN1YnNjcmlwdGlvbjtcblx0XHRsbSA9IHJvb20ubG0gPyByb29tLmxtIDogcm9vbS5fdXBkYXRlZEF0O1xuXG5cdFx0aWYgKHR5cGVvZiBkbSAhPT0gJ3VuZGVmaW5lZCcgJiYgZG0ub3Blbikge1xuXHRcdFx0aWYgKGRtLmxzICYmIHJvb20ubXNncykge1xuXHRcdFx0XHR1bnJlYWRzID0gZG0udW5yZWFkO1xuXHRcdFx0XHR1bnJlYWRzRnJvbSA9IGRtLmxzO1xuXHRcdFx0fVxuXHRcdFx0dXNlck1lbnRpb25zID0gZG0udXNlck1lbnRpb25zO1xuXHRcdFx0am9pbmVkID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoYWNjZXNzIHx8IGpvaW5lZCkge1xuXHRcdFx0bXNncyA9IHJvb20ubXNncztcblx0XHRcdGxhdGVzdCA9IGxtO1xuXHRcdFx0bWVtYmVycyA9IHJvb20udXNlcnNDb3VudDtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRqb2luZWQsXG5cdFx0XHRtZW1iZXJzLFxuXHRcdFx0dW5yZWFkcyxcblx0XHRcdHVucmVhZHNGcm9tLFxuXHRcdFx0bXNncyxcblx0XHRcdGxhdGVzdCxcblx0XHRcdHVzZXJNZW50aW9uc1xuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5maWxlcycsICdpbS5maWxlcyddLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZERpcmVjdE1lc3NhZ2VSb29tKHRoaXMucmVxdWVzdFBhcmFtcygpLCB0aGlzLnVzZXIpO1xuXHRcdGNvbnN0IGFkZFVzZXJPYmplY3RUb0V2ZXJ5T2JqZWN0ID0gKGZpbGUpID0+IHtcblx0XHRcdGlmIChmaWxlLnVzZXJJZCkge1xuXHRcdFx0XHRmaWxlID0gdGhpcy5pbnNlcnRVc2VyT2JqZWN0KHsgb2JqZWN0OiBmaWxlLCB1c2VySWQ6IGZpbGUudXNlcklkIH0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZpbGU7XG5cdFx0fTtcblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgcmlkOiBmaW5kUmVzdWx0LnJvb20uX2lkIH0pO1xuXG5cdFx0Y29uc3QgZmlsZXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyBuYW1lOiAxIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHNcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0ZmlsZXM6IGZpbGVzLm1hcChhZGRVc2VyT2JqZWN0VG9FdmVyeU9iamVjdCksXG5cdFx0XHRjb3VudDogZmlsZXMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMuZmluZChvdXJRdWVyeSkuY291bnQoKVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5oaXN0b3J5JywgJ2ltLmhpc3RvcnknXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblxuXHRcdGxldCBsYXRlc3REYXRlID0gbmV3IERhdGUoKTtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5sYXRlc3QpIHtcblx0XHRcdGxhdGVzdERhdGUgPSBuZXcgRGF0ZSh0aGlzLnF1ZXJ5UGFyYW1zLmxhdGVzdCk7XG5cdFx0fVxuXG5cdFx0bGV0IG9sZGVzdERhdGUgPSB1bmRlZmluZWQ7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMub2xkZXN0KSB7XG5cdFx0XHRvbGRlc3REYXRlID0gbmV3IERhdGUodGhpcy5xdWVyeVBhcmFtcy5vbGRlc3QpO1xuXHRcdH1cblxuXHRcdGxldCBpbmNsdXNpdmUgPSBmYWxzZTtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5pbmNsdXNpdmUpIHtcblx0XHRcdGluY2x1c2l2ZSA9IHRoaXMucXVlcnlQYXJhbXMuaW5jbHVzaXZlO1xuXHRcdH1cblxuXHRcdGxldCBjb3VudCA9IDIwO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmNvdW50KSB7XG5cdFx0XHRjb3VudCA9IHBhcnNlSW50KHRoaXMucXVlcnlQYXJhbXMuY291bnQpO1xuXHRcdH1cblxuXHRcdGxldCB1bnJlYWRzID0gZmFsc2U7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMudW5yZWFkcykge1xuXHRcdFx0dW5yZWFkcyA9IHRoaXMucXVlcnlQYXJhbXMudW5yZWFkcztcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdHJlc3VsdCA9IE1ldGVvci5jYWxsKCdnZXRDaGFubmVsSGlzdG9yeScsIHtcblx0XHRcdFx0cmlkOiBmaW5kUmVzdWx0LnJvb20uX2lkLFxuXHRcdFx0XHRsYXRlc3Q6IGxhdGVzdERhdGUsXG5cdFx0XHRcdG9sZGVzdDogb2xkZXN0RGF0ZSxcblx0XHRcdFx0aW5jbHVzaXZlLFxuXHRcdFx0XHRjb3VudCxcblx0XHRcdFx0dW5yZWFkc1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRpZiAoIXJlc3VsdCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHJlc3VsdCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZShbJ2RtLm1lbWJlcnMnLCAnaW0ubWVtYmVycyddLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZERpcmVjdE1lc3NhZ2VSb29tKHRoaXMucmVxdWVzdFBhcmFtcygpLCB0aGlzLnVzZXIpO1xuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5Um9vbUlkKGZpbmRSZXN1bHQuX2lkLCB7XG5cdFx0XHRzb3J0OiB7ICd1LnVzZXJuYW1lJzogIHNvcnQudXNlcm5hbWUgIT0gbnVsbCA/IHNvcnQudXNlcm5hbWUgOiAxIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnRcblx0XHR9KTtcblxuXHRcdGNvbnN0IHRvdGFsID0gY3Vyc29yLmNvdW50KCk7XG5cblx0XHRjb25zdCBtZW1iZXJzID0gY3Vyc29yLmZldGNoKCkubWFwKHMgPT4gcy51ICYmIHMudS51c2VybmFtZSk7XG5cblx0XHRjb25zdCB1c2VycyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmQoeyB1c2VybmFtZTogeyAkaW46IG1lbWJlcnMgfSB9LCB7XG5cdFx0XHRmaWVsZHM6IHsgX2lkOiAxLCB1c2VybmFtZTogMSwgbmFtZTogMSwgc3RhdHVzOiAxLCB1dGNPZmZzZXQ6IDEgfSxcblx0XHRcdHNvcnQ6IHsgdXNlcm5hbWU6ICBzb3J0LnVzZXJuYW1lICE9IG51bGwgPyBzb3J0LnVzZXJuYW1lIDogMSB9XG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lbWJlcnM6IHVzZXJzLFxuXHRcdFx0Y291bnQ6IG1lbWJlcnMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWxcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0ubWVzc2FnZXMnLCAnaW0ubWVzc2FnZXMnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnNvbGUubG9nKGZpbmRSZXN1bHQpO1xuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgcmlkOiBmaW5kUmVzdWx0LnJvb20uX2lkIH0pO1xuXG5cdFx0Y29uc3QgbWVzc2FnZXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgdHM6IC0xIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHNcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXMsXG5cdFx0XHRjb3VudDogbWVzc2FnZXMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnkpLmNvdW50KClcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0ubWVzc2FnZXMub3RoZXJzJywgJ2ltLm1lc3NhZ2VzLm90aGVycyddLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9FbmFibGVfRGlyZWN0X01lc3NhZ2VfSGlzdG9yeV9FbmRQb2ludCcpICE9PSB0cnVlKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1lbmRwb2ludC1kaXNhYmxlZCcsICdUaGlzIGVuZHBvaW50IGlzIGRpc2FibGVkJywgeyByb3V0ZTogJy9hcGkvdjEvaW0ubWVzc2FnZXMub3RoZXJzJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctcm9vbS1hZG1pbmlzdHJhdGlvbicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbUlkID0gdGhpcy5xdWVyeVBhcmFtcy5yb29tSWQ7XG5cdFx0aWYgKCFyb29tSWQgfHwgIXJvb21JZC50cmltKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb21pZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHBhcmFtZXRlciBcInJvb21JZFwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cdFx0aWYgKCFyb29tIHx8IHJvb20udCAhPT0gJ2QnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLW5vdC1mb3VuZCcsIGBObyBkaXJlY3QgbWVzc2FnZSByb29tIGZvdW5kIGJ5IHRoZSBpZCBvZjogJHsgcm9vbUlkIH1gKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyByaWQ6IHJvb20uX2lkIH0pO1xuXG5cdFx0Y29uc3QgbXNncyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogLTEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZXNzYWdlczogbXNncyxcblx0XHRcdG9mZnNldCxcblx0XHRcdGNvdW50OiBtc2dzLmxlbmd0aCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZShbJ2RtLmxpc3QnLCAnaW0ubGlzdCddLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0ID0geyBuYW1lOiAxIH0sIGZpZWxkcyB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Ly8gVE9ETzogQ0FDSEU6IEFkZCBCcmVhY2tpbmcgbm90aWNlIHNpbmNlIHdlIHJlbW92ZWQgdGhlIHF1ZXJ5IHBhcmFtXG5cblx0XHRjb25zdCBjdXJzb3IgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlTdWJzY3JpcHRpb25UeXBlQW5kVXNlcklkKCdkJywgdGhpcy51c2VySWQsIHtcblx0XHRcdHNvcnQsXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHNcblx0XHR9KTtcblxuXHRcdGNvbnN0IHRvdGFsID0gY3Vyc29yLmNvdW50KCk7XG5cdFx0Y29uc3Qgcm9vbXMgPSBjdXJzb3IuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGltczogcm9vbXMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0dG90YWxcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0ubGlzdC5ldmVyeW9uZScsICdpbS5saXN0LmV2ZXJ5b25lJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHQ6ICdkJyB9KTtcblxuXHRcdGNvbnN0IHJvb21zID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbXM6IHJvb21zLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0Y291bnQ6IHJvb21zLmxlbmd0aCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZShbJ2RtLm9wZW4nLCAnaW0ub3BlbiddLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblxuXHRcdGlmICghZmluZFJlc3VsdC5zdWJzY3JpcHRpb24ub3Blbikge1xuXHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRNZXRlb3IuY2FsbCgnb3BlblJvb20nLCBmaW5kUmVzdWx0LnJvb20uX2lkKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZShbJ2RtLnNldFRvcGljJywgJ2ltLnNldFRvcGljJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50b3BpYyB8fCAhdGhpcy5ib2R5UGFyYW1zLnRvcGljLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJ0b3BpY1wiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yb29tLl9pZCwgJ3Jvb21Ub3BpYycsIHRoaXMuYm9keVBhcmFtcy50b3BpYyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR0b3BpYzogdGhpcy5ib2R5UGFyYW1zLnRvcGljXG5cdFx0fSk7XG5cdH1cbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2ludGVncmF0aW9ucy5jcmVhdGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0dHlwZTogU3RyaW5nLFxuXHRcdFx0bmFtZTogU3RyaW5nLFxuXHRcdFx0ZW5hYmxlZDogQm9vbGVhbixcblx0XHRcdHVzZXJuYW1lOiBTdHJpbmcsXG5cdFx0XHR1cmxzOiBNYXRjaC5NYXliZShbU3RyaW5nXSksXG5cdFx0XHRjaGFubmVsOiBTdHJpbmcsXG5cdFx0XHRldmVudDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdHRyaWdnZXJXb3JkczogTWF0Y2guTWF5YmUoW1N0cmluZ10pLFxuXHRcdFx0YWxpYXM6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRhdmF0YXI6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRlbW9qaTogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdHRva2VuOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0c2NyaXB0RW5hYmxlZDogQm9vbGVhbixcblx0XHRcdHNjcmlwdDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdHRhcmdldENoYW5uZWw6IE1hdGNoLk1heWJlKFN0cmluZylcblx0XHR9KSk7XG5cblx0XHRsZXQgaW50ZWdyYXRpb247XG5cblx0XHRzd2l0Y2ggKHRoaXMuYm9keVBhcmFtcy50eXBlKSB7XG5cdFx0XHRjYXNlICd3ZWJob29rLW91dGdvaW5nJzpcblx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gTWV0ZW9yLmNhbGwoJ2FkZE91dGdvaW5nSW50ZWdyYXRpb24nLCB0aGlzLmJvZHlQYXJhbXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd3ZWJob29rLWluY29taW5nJzpcblx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gTWV0ZW9yLmNhbGwoJ2FkZEluY29taW5nSW50ZWdyYXRpb24nLCB0aGlzLmJvZHlQYXJhbXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBpbnRlZ3JhdGlvbiB0eXBlLicpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgaW50ZWdyYXRpb24gfSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnaW50ZWdyYXRpb25zLmhpc3RvcnknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1pbnRlZ3JhdGlvbnMnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGlmICghdGhpcy5xdWVyeVBhcmFtcy5pZCB8fCB0aGlzLnF1ZXJ5UGFyYW1zLmlkLnRyaW0oKSA9PT0gJycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdJbnZhbGlkIGludGVncmF0aW9uIGlkLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGlkID0gdGhpcy5xdWVyeVBhcmFtcy5pZDtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7ICdpbnRlZ3JhdGlvbi5faWQnOiBpZCB9KTtcblx0XHRjb25zdCBoaXN0b3J5ID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25IaXN0b3J5LmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyBfdXBkYXRlZEF0OiAtMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGhpc3RvcnksXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRpdGVtczogaGlzdG9yeS5sZW5ndGgsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25IaXN0b3J5LmZpbmQob3VyUXVlcnkpLmNvdW50KClcblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdpbnRlZ3JhdGlvbnMubGlzdCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSk7XG5cdFx0Y29uc3QgaW50ZWdyYXRpb25zID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogLTEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbnRlZ3JhdGlvbnMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRpdGVtczogaW50ZWdyYXRpb25zLmxlbmd0aCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSkuY291bnQoKVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2ludGVncmF0aW9ucy5yZW1vdmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0dHlwZTogU3RyaW5nLFxuXHRcdFx0dGFyZ2V0X3VybDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdGludGVncmF0aW9uSWQ6IE1hdGNoLk1heWJlKFN0cmluZylcblx0XHR9KSk7XG5cblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50YXJnZXRfdXJsICYmICF0aGlzLmJvZHlQYXJhbXMuaW50ZWdyYXRpb25JZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0FuIGludGVncmF0aW9uSWQgb3IgdGFyZ2V0X3VybCBuZWVkcyB0byBiZSBwcm92aWRlZC4nKTtcblx0XHR9XG5cblx0XHRsZXQgaW50ZWdyYXRpb247XG5cdFx0c3dpdGNoICh0aGlzLmJvZHlQYXJhbXMudHlwZSkge1xuXHRcdFx0Y2FzZSAnd2ViaG9vay1vdXRnb2luZyc6XG5cdFx0XHRcdGlmICh0aGlzLmJvZHlQYXJhbXMudGFyZ2V0X3VybCkge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmRPbmUoeyB1cmxzOiB0aGlzLmJvZHlQYXJhbXMudGFyZ2V0X3VybCB9KTtcblx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLmJvZHlQYXJhbXMuaW50ZWdyYXRpb25JZCkge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmRPbmUoeyBfaWQ6IHRoaXMuYm9keVBhcmFtcy5pbnRlZ3JhdGlvbklkIH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCFpbnRlZ3JhdGlvbikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdObyBpbnRlZ3JhdGlvbiBmb3VuZC4nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnZGVsZXRlT3V0Z29pbmdJbnRlZ3JhdGlvbicsIGludGVncmF0aW9uLl9pZCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHRpbnRlZ3JhdGlvblxuXHRcdFx0XHR9KTtcblx0XHRcdGNhc2UgJ3dlYmhvb2staW5jb21pbmcnOlxuXHRcdFx0XHRpbnRlZ3JhdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kT25lKHsgX2lkOiB0aGlzLmJvZHlQYXJhbXMuaW50ZWdyYXRpb25JZCB9KTtcblxuXHRcdFx0XHRpZiAoIWludGVncmF0aW9uKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ05vIGludGVncmF0aW9uIGZvdW5kLicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdE1ldGVvci5jYWxsKCdkZWxldGVJbmNvbWluZ0ludGVncmF0aW9uJywgaW50ZWdyYXRpb24uX2lkKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRcdGludGVncmF0aW9uXG5cdFx0XHRcdH0pO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0ludmFsaWQgaW50ZWdyYXRpb24gdHlwZS4nKTtcblx0XHR9XG5cdH1cbn0pO1xuIiwiXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnaW5mbycsIHsgYXV0aFJlcXVpcmVkOiBmYWxzZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRMb2dnZWRJblVzZXIoKTtcblxuXHRcdGlmICh1c2VyICYmIFJvY2tldENoYXQuYXV0aHouaGFzUm9sZSh1c2VyLl9pZCwgJ2FkbWluJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0aW5mbzogUm9ja2V0Q2hhdC5JbmZvXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbmZvOiB7XG5cdFx0XHRcdCd2ZXJzaW9uJzogUm9ja2V0Q2hhdC5JbmZvLnZlcnNpb25cblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdtZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHRoaXMuZ2V0VXNlckluZm8oUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodGhpcy51c2VySWQpKSk7XG5cdH1cbn0pO1xuXG5sZXQgb25saW5lQ2FjaGUgPSAwO1xubGV0IG9ubGluZUNhY2hlRGF0ZSA9IDA7XG5jb25zdCBjYWNoZUludmFsaWQgPSA2MDAwMDsgLy8gMSBtaW51dGVcblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzaGllbGQuc3ZnJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgdHlwZSwgY2hhbm5lbCwgbmFtZSwgaWNvbiB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW5hYmxlX1NoaWVsZHMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItZW5kcG9pbnQtZGlzYWJsZWQnLCAnVGhpcyBlbmRwb2ludCBpcyBkaXNhYmxlZCcsIHsgcm91dGU6ICcvYXBpL3YxL3NoaWVsZC5zdmcnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHR5cGVzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9TaGllbGRfVHlwZXMnKTtcblx0XHRpZiAodHlwZSAmJiAodHlwZXMgIT09ICcqJyAmJiAhdHlwZXMuc3BsaXQoJywnKS5tYXAoKHQpID0+IHQudHJpbSgpKS5pbmNsdWRlcyh0eXBlKSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXNoaWVsZC1kaXNhYmxlZCcsICdUaGlzIHNoaWVsZCB0eXBlIGlzIGRpc2FibGVkJywgeyByb3V0ZTogJy9hcGkvdjEvc2hpZWxkLnN2ZycgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaGlkZUljb24gPSBpY29uID09PSAnZmFsc2UnO1xuXHRcdGlmIChoaWRlSWNvbiAmJiAoIW5hbWUgfHwgIW5hbWUudHJpbSgpKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ05hbWUgY2Fubm90IGJlIGVtcHR5IHdoZW4gaWNvbiBpcyBoaWRkZW4nKTtcblx0XHR9XG5cblx0XHRsZXQgdGV4dDtcblx0XHRsZXQgYmFja2dyb3VuZENvbG9yID0gJyM0YzEnO1xuXHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0Y2FzZSAnb25saW5lJzpcblx0XHRcdFx0aWYgKERhdGUubm93KCkgLSBvbmxpbmVDYWNoZURhdGUgPiBjYWNoZUludmFsaWQpIHtcblx0XHRcdFx0XHRvbmxpbmVDYWNoZSA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRVc2Vyc05vdE9mZmxpbmUoKS5jb3VudCgpO1xuXHRcdFx0XHRcdG9ubGluZUNhY2hlRGF0ZSA9IERhdGUubm93KCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0ZXh0ID0gYCR7IG9ubGluZUNhY2hlIH0gJHsgVEFQaTE4bi5fXygnT25saW5lJykgfWA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnY2hhbm5lbCc6XG5cdFx0XHRcdGlmICghY2hhbm5lbCkge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdTaGllbGQgY2hhbm5lbCBpcyByZXF1aXJlZCBmb3IgdHlwZSBcImNoYW5uZWxcIicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGV4dCA9IGAjJHsgY2hhbm5lbCB9YDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd1c2VyJzpcblx0XHRcdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdFx0XHQvLyBSZXNwZWN0IHRoZSBzZXJ2ZXIncyBjaG9pY2UgZm9yIHVzaW5nIHRoZWlyIHJlYWwgbmFtZXMgb3Igbm90XG5cdFx0XHRcdGlmICh1c2VyLm5hbWUgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VJX1VzZV9SZWFsX05hbWUnKSkge1xuXHRcdFx0XHRcdHRleHQgPSBgJHsgdXNlci5uYW1lIH1gO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRleHQgPSBgQCR7IHVzZXIudXNlcm5hbWUgfWA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzd2l0Y2ggKHVzZXIuc3RhdHVzKSB7XG5cdFx0XHRcdFx0Y2FzZSAnb25saW5lJzpcblx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvciA9ICcjMWZiMzFmJztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ2F3YXknOlxuXHRcdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yID0gJyNkYzliMDEnO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAnYnVzeSc6XG5cdFx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3IgPSAnI2JjMjAzMSc7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdvZmZsaW5lJzpcblx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvciA9ICcjYTVhMWExJztcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRleHQgPSBUQVBpMThuLl9fKCdKb2luX0NoYXQnKS50b1VwcGVyQ2FzZSgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGljb25TaXplID0gaGlkZUljb24gPyA3IDogMjQ7XG5cdFx0Y29uc3QgbGVmdFNpemUgPSBuYW1lID8gbmFtZS5sZW5ndGggKiA2ICsgNyArIGljb25TaXplIDogaWNvblNpemU7XG5cdFx0Y29uc3QgcmlnaHRTaXplID0gdGV4dC5sZW5ndGggKiA2ICsgMjA7XG5cdFx0Y29uc3Qgd2lkdGggPSBsZWZ0U2l6ZSArIHJpZ2h0U2l6ZTtcblx0XHRjb25zdCBoZWlnaHQgPSAyMDtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2ltYWdlL3N2Zyt4bWw7Y2hhcnNldD11dGYtOCcgfSxcblx0XHRcdGJvZHk6IGBcblx0XHRcdFx0PHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgd2lkdGg9XCIkeyB3aWR0aCB9XCIgaGVpZ2h0PVwiJHsgaGVpZ2h0IH1cIj5cblx0XHRcdFx0ICA8bGluZWFyR3JhZGllbnQgaWQ9XCJiXCIgeDI9XCIwXCIgeTI9XCIxMDAlXCI+XG5cdFx0XHRcdCAgICA8c3RvcCBvZmZzZXQ9XCIwXCIgc3RvcC1jb2xvcj1cIiNiYmJcIiBzdG9wLW9wYWNpdHk9XCIuMVwiLz5cblx0XHRcdFx0ICAgIDxzdG9wIG9mZnNldD1cIjFcIiBzdG9wLW9wYWNpdHk9XCIuMVwiLz5cblx0XHRcdFx0ICA8L2xpbmVhckdyYWRpZW50PlxuXHRcdFx0XHQgIDxtYXNrIGlkPVwiYVwiPlxuXHRcdFx0XHQgICAgPHJlY3Qgd2lkdGg9XCIkeyB3aWR0aCB9XCIgaGVpZ2h0PVwiJHsgaGVpZ2h0IH1cIiByeD1cIjNcIiBmaWxsPVwiI2ZmZlwiLz5cblx0XHRcdFx0ICA8L21hc2s+XG5cdFx0XHRcdCAgPGcgbWFzaz1cInVybCgjYSlcIj5cblx0XHRcdFx0ICAgIDxwYXRoIGZpbGw9XCIjNTU1XCIgZD1cIk0wIDBoJHsgbGVmdFNpemUgfXYkeyBoZWlnaHQgfUgwelwiLz5cblx0XHRcdFx0ICAgIDxwYXRoIGZpbGw9XCIkeyBiYWNrZ3JvdW5kQ29sb3IgfVwiIGQ9XCJNJHsgbGVmdFNpemUgfSAwaCR7IHJpZ2h0U2l6ZSB9diR7IGhlaWdodCB9SCR7IGxlZnRTaXplIH16XCIvPlxuXHRcdFx0XHQgICAgPHBhdGggZmlsbD1cInVybCgjYilcIiBkPVwiTTAgMGgkeyB3aWR0aCB9diR7IGhlaWdodCB9SDB6XCIvPlxuXHRcdFx0XHQgIDwvZz5cblx0XHRcdFx0ICAgICR7IGhpZGVJY29uID8gJycgOiAnPGltYWdlIHg9XCI1XCIgeT1cIjNcIiB3aWR0aD1cIjE0XCIgaGVpZ2h0PVwiMTRcIiB4bGluazpocmVmPVwiL2Fzc2V0cy9mYXZpY29uLnN2Z1wiLz4nIH1cblx0XHRcdFx0ICA8ZyBmaWxsPVwiI2ZmZlwiIGZvbnQtZmFtaWx5PVwiRGVqYVZ1IFNhbnMsVmVyZGFuYSxHZW5ldmEsc2Fucy1zZXJpZlwiIGZvbnQtc2l6ZT1cIjExXCI+XG5cdFx0XHRcdFx0XHQkeyBuYW1lID8gYDx0ZXh0IHg9XCIkeyBpY29uU2l6ZSB9XCIgeT1cIjE1XCIgZmlsbD1cIiMwMTAxMDFcIiBmaWxsLW9wYWNpdHk9XCIuM1wiPiR7IG5hbWUgfTwvdGV4dD5cblx0XHRcdFx0ICAgIDx0ZXh0IHg9XCIkeyBpY29uU2l6ZSB9XCIgeT1cIjE0XCI+JHsgbmFtZSB9PC90ZXh0PmAgOiAnJyB9XG5cdFx0XHRcdCAgICA8dGV4dCB4PVwiJHsgbGVmdFNpemUgKyA3IH1cIiB5PVwiMTVcIiBmaWxsPVwiIzAxMDEwMVwiIGZpbGwtb3BhY2l0eT1cIi4zXCI+JHsgdGV4dCB9PC90ZXh0PlxuXHRcdFx0XHQgICAgPHRleHQgeD1cIiR7IGxlZnRTaXplICsgNyB9XCIgeT1cIjE0XCI+JHsgdGV4dCB9PC90ZXh0PlxuXHRcdFx0XHQgIDwvZz5cblx0XHRcdFx0PC9zdmc+XG5cdFx0XHRgLnRyaW0oKS5yZXBsYWNlKC9cXD5bXFxzXStcXDwvZ20sICc+PCcpXG5cdFx0fTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzcG90bGlnaHQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjaGVjayh0aGlzLnF1ZXJ5UGFyYW1zLCB7XG5cdFx0XHRxdWVyeTogU3RyaW5nXG5cdFx0fSk7XG5cblx0XHRjb25zdCB7IHF1ZXJ5IH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXG5cdFx0Y29uc3QgcmVzdWx0ID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT5cblx0XHRcdE1ldGVvci5jYWxsKCdzcG90bGlnaHQnLCBxdWVyeSlcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MocmVzdWx0KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdkaXJlY3RvcnknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3QgeyB0ZXh0LCB0eXBlIH0gPSBxdWVyeTtcblx0XHRpZiAoc29ydCAmJiBPYmplY3Qua2V5cyhzb3J0KS5sZW5ndGggPiAxKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhpcyBtZXRob2Qgc3VwcG9ydCBvbmx5IG9uZSBcInNvcnRcIiBwYXJhbWV0ZXInKTtcblx0XHR9XG5cdFx0Y29uc3Qgc29ydEJ5ID0gc29ydCA/IE9iamVjdC5rZXlzKHNvcnQpWzBdIDogdW5kZWZpbmVkO1xuXHRcdGNvbnN0IHNvcnREaXJlY3Rpb24gPSBzb3J0ICYmIE9iamVjdC52YWx1ZXMoc29ydClbMF0gPT09IDEgPyAnYXNjJyA6ICdkZXNjJztcblxuXHRcdGNvbnN0IHJlc3VsdCA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdicm93c2VDaGFubmVscycsIHtcblx0XHRcdHRleHQsXG5cdFx0XHR0eXBlLFxuXHRcdFx0c29ydEJ5LFxuXHRcdFx0c29ydERpcmVjdGlvbixcblx0XHRcdHBhZ2U6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudFxuXHRcdH0pKTtcblxuXHRcdGlmICghcmVzdWx0KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnUGxlYXNlIHZlcmlmeSB0aGUgcGFyYW1ldGVycycpO1xuXHRcdH1cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRyZXN1bHQ6IHJlc3VsdC5yZXN1bHRzLFxuXHRcdFx0Y291bnQ6IHJlc3VsdC5yZXN1bHRzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiByZXN1bHQudG90YWxcblx0XHR9KTtcblx0fVxufSk7XG4iLCIvKipcblx0VGhpcyBBUEkgcmV0dXJucyBhbGwgcGVybWlzc2lvbnMgdGhhdCBleGlzdHNcblx0b24gdGhlIHNlcnZlciwgd2l0aCByZXNwZWN0aXZlIHJvbGVzLlxuXG5cdE1ldGhvZDogR0VUXG5cdFJvdXRlOiBhcGkvdjEvcGVybWlzc2lvbnNcbiAqL1xuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Blcm1pc3Npb25zJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3Qgd2FybmluZ01lc3NhZ2UgPSAnVGhlIGVuZHBvaW50IFwicGVybWlzc2lvbnNcIiBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgdmVyc2lvbiB2MC42OSc7XG5cdFx0Y29uc29sZS53YXJuKHdhcm5pbmdNZXNzYWdlKTtcblxuXHRcdGNvbnN0IHJlc3VsdCA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdwZXJtaXNzaW9ucy9nZXQnKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhyZXN1bHQpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Blcm1pc3Npb25zLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCByZXN1bHQgPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncGVybWlzc2lvbnMvZ2V0JykpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cGVybWlzc2lvbnM6IHJlc3VsdFxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Blcm1pc3Npb25zLnVwZGF0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ2FjY2Vzcy1wZXJtaXNzaW9ucycpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnRWRpdGluZyBwZXJtaXNzaW9ucyBpcyBub3QgYWxsb3dlZCcsICdlcnJvci1lZGl0LXBlcm1pc3Npb25zLW5vdC1hbGxvd2VkJyk7XG5cdFx0fVxuXG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRwZXJtaXNzaW9uczogW1xuXHRcdFx0XHRNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0XHRcdF9pZDogU3RyaW5nLFxuXHRcdFx0XHRcdHJvbGVzOiBbU3RyaW5nXVxuXHRcdFx0XHR9KVxuXHRcdFx0XVxuXHRcdH0pO1xuXG5cdFx0bGV0IHBlcm1pc3Npb25Ob3RGb3VuZCA9IGZhbHNlO1xuXHRcdGxldCByb2xlTm90Rm91bmQgPSBmYWxzZTtcblx0XHRPYmplY3Qua2V5cyh0aGlzLmJvZHlQYXJhbXMucGVybWlzc2lvbnMpLmZvckVhY2goKGtleSkgPT4ge1xuXHRcdFx0Y29uc3QgZWxlbWVudCA9IHRoaXMuYm9keVBhcmFtcy5wZXJtaXNzaW9uc1trZXldO1xuXG5cdFx0XHRpZiAoIVJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmZpbmRPbmVCeUlkKGVsZW1lbnQuX2lkKSkge1xuXHRcdFx0XHRwZXJtaXNzaW9uTm90Rm91bmQgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRPYmplY3Qua2V5cyhlbGVtZW50LnJvbGVzKS5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdFx0Y29uc3Qgc3ViZWxlbWVudCA9IGVsZW1lbnQucm9sZXNba2V5XTtcblxuXHRcdFx0XHRpZiAoIVJvY2tldENoYXQubW9kZWxzLlJvbGVzLmZpbmRPbmVCeUlkKHN1YmVsZW1lbnQpKSB7XG5cdFx0XHRcdFx0cm9sZU5vdEZvdW5kID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRpZiAocGVybWlzc2lvbk5vdEZvdW5kKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBwZXJtaXNzaW9uJywgJ2Vycm9yLWludmFsaWQtcGVybWlzc2lvbicpO1xuXHRcdH0gZWxzZSBpZiAocm9sZU5vdEZvdW5kKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCByb2xlJywgJ2Vycm9yLWludmFsaWQtcm9sZScpO1xuXHRcdH1cblxuXHRcdE9iamVjdC5rZXlzKHRoaXMuYm9keVBhcmFtcy5wZXJtaXNzaW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG5cdFx0XHRjb25zdCBlbGVtZW50ID0gdGhpcy5ib2R5UGFyYW1zLnBlcm1pc3Npb25zW2tleV07XG5cblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKGVsZW1lbnQuX2lkLCBlbGVtZW50LnJvbGVzKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IHJlc3VsdCA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdwZXJtaXNzaW9ucy9nZXQnKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRwZXJtaXNzaW9uczogcmVzdWx0XG5cdFx0fSk7XG5cdH1cbn0pO1xuIiwiLyogZ2xvYmFscyBQdXNoICovXG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdwdXNoLnRva2VuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgdHlwZSwgdmFsdWUsIGFwcE5hbWUgfSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRsZXQgeyBpZCB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXG5cdFx0aWYgKGlkICYmIHR5cGVvZiBpZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWlkLXBhcmFtLW5vdC12YWxpZCcsICdUaGUgcmVxdWlyZWQgXCJpZFwiIGJvZHkgcGFyYW0gaXMgaW52YWxpZC4nKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWQgPSBSYW5kb20uaWQoKTtcblx0XHR9XG5cblx0XHRpZiAoIXR5cGUgfHwgKHR5cGUgIT09ICdhcG4nICYmIHR5cGUgIT09ICdnY20nKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItdHlwZS1wYXJhbS1ub3QtdmFsaWQnLCAnVGhlIHJlcXVpcmVkIFwidHlwZVwiIGJvZHkgcGFyYW0gaXMgbWlzc2luZyBvciBpbnZhbGlkLicpO1xuXHRcdH1cblxuXHRcdGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItdG9rZW4tcGFyYW0tbm90LXZhbGlkJywgJ1RoZSByZXF1aXJlZCBcInZhbHVlXCIgYm9keSBwYXJhbSBpcyBtaXNzaW5nIG9yIGludmFsaWQuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFhcHBOYW1lIHx8IHR5cGVvZiBhcHBOYW1lICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYXBwTmFtZS1wYXJhbS1ub3QtdmFsaWQnLCAnVGhlIHJlcXVpcmVkIFwiYXBwTmFtZVwiIGJvZHkgcGFyYW0gaXMgbWlzc2luZyBvciBpbnZhbGlkLicpO1xuXHRcdH1cblxuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiByZXN1bHQgPSBNZXRlb3IuY2FsbCgncmFpeDpwdXNoLXVwZGF0ZScsIHtcblx0XHRcdGlkLFxuXHRcdFx0dG9rZW46IHsgW3R5cGVdOiB2YWx1ZSB9LFxuXHRcdFx0YXBwTmFtZSxcblx0XHRcdHVzZXJJZDogdGhpcy51c2VySWRcblx0XHR9KSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHJlc3VsdCB9KTtcblx0fSxcblx0ZGVsZXRlKCkge1xuXHRcdGNvbnN0IHsgdG9rZW4gfSA9IHRoaXMuYm9keVBhcmFtcztcblxuXHRcdGlmICghdG9rZW4gfHwgdHlwZW9mIHRva2VuICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItdG9rZW4tcGFyYW0tbm90LXZhbGlkJywgJ1RoZSByZXF1aXJlZCBcInRva2VuXCIgYm9keSBwYXJhbSBpcyBtaXNzaW5nIG9yIGludmFsaWQuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgYWZmZWN0ZWRSZWNvcmRzID0gUHVzaC5hcHBDb2xsZWN0aW9uLnJlbW92ZSh7XG5cdFx0XHQkb3I6IFt7XG5cdFx0XHRcdCd0b2tlbi5hcG4nOiB0b2tlblxuXHRcdFx0fSwge1xuXHRcdFx0XHQndG9rZW4uZ2NtJzogdG9rZW5cblx0XHRcdH1dLFxuXHRcdFx0dXNlcklkOiB0aGlzLnVzZXJJZFxuXHRcdH0pO1xuXG5cdFx0aWYgKGFmZmVjdGVkUmVjb3JkcyA9PT0gMCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLm5vdEZvdW5kKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuLy8gc2V0dGluZ3MgZW5kcG9pbnRzXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc2V0dGluZ3MucHVibGljJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGxldCBvdXJRdWVyeSA9IHtcblx0XHRcdGhpZGRlbjogeyAkbmU6IHRydWUgfSxcblx0XHRcdCdwdWJsaWMnOiB0cnVlXG5cdFx0fTtcblxuXHRcdG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIG91clF1ZXJ5KTtcblxuXHRcdGNvbnN0IHNldHRpbmdzID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IF9pZDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzOiBPYmplY3QuYXNzaWduKHsgX2lkOiAxLCB2YWx1ZTogMSB9LCBmaWVsZHMpXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHNldHRpbmdzLFxuXHRcdFx0Y291bnQ6IHNldHRpbmdzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKG91clF1ZXJ5KS5jb3VudCgpXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc2V0dGluZ3Mub2F1dGgnLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgbW91bnRPQXV0aFNlcnZpY2VzID0gKCkgPT4ge1xuXHRcdFx0Y29uc3Qgb0F1dGhTZXJ2aWNlc0VuYWJsZWQgPSBTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy5maW5kKHt9LCB7IGZpZWxkczogeyBzZWNyZXQ6IDAgfSB9KS5mZXRjaCgpO1xuXG5cdFx0XHRyZXR1cm4gb0F1dGhTZXJ2aWNlc0VuYWJsZWQubWFwKChzZXJ2aWNlKSA9PiB7XG5cdFx0XHRcdGlmIChzZXJ2aWNlLmN1c3RvbSB8fCBbJ3NhbWwnLCAnY2FzJywgJ3dvcmRwcmVzcyddLmluY2x1ZGVzKHNlcnZpY2Uuc2VydmljZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4geyAuLi5zZXJ2aWNlIH07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdF9pZDogc2VydmljZS5faWQsXG5cdFx0XHRcdFx0bmFtZTogc2VydmljZS5zZXJ2aWNlLFxuXHRcdFx0XHRcdGNsaWVudElkOiBzZXJ2aWNlLmFwcElkIHx8IHNlcnZpY2UuY2xpZW50SWQgfHwgc2VydmljZS5jb25zdW1lcktleSxcblx0XHRcdFx0XHRidXR0b25MYWJlbFRleHQ6IHNlcnZpY2UuYnV0dG9uTGFiZWxUZXh0IHx8ICcnLFxuXHRcdFx0XHRcdGJ1dHRvbkNvbG9yOiBzZXJ2aWNlLmJ1dHRvbkNvbG9yIHx8ICcnLFxuXHRcdFx0XHRcdGJ1dHRvbkxhYmVsQ29sb3I6IHNlcnZpY2UuYnV0dG9uTGFiZWxDb2xvciB8fCAnJyxcblx0XHRcdFx0XHRjdXN0b206IGZhbHNlXG5cdFx0XHRcdH07XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0c2VydmljZXM6IG1vdW50T0F1dGhTZXJ2aWNlcygpXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc2V0dGluZ3MnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRsZXQgb3VyUXVlcnkgPSB7XG5cdFx0XHRoaWRkZW46IHsgJG5lOiB0cnVlIH1cblx0XHR9O1xuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXByaXZpbGVnZWQtc2V0dGluZycpKSB7XG5cdFx0XHRvdXJRdWVyeS5wdWJsaWMgPSB0cnVlO1xuXHRcdH1cblxuXHRcdG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIG91clF1ZXJ5KTtcblxuXHRcdGNvbnN0IHNldHRpbmdzID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IF9pZDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzOiBPYmplY3QuYXNzaWduKHsgX2lkOiAxLCB2YWx1ZTogMSB9LCBmaWVsZHMpXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHNldHRpbmdzLFxuXHRcdFx0Y291bnQ6IHNldHRpbmdzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKG91clF1ZXJ5KS5jb3VudCgpXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc2V0dGluZ3MvOl9pZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1wcml2aWxlZ2VkLXNldHRpbmcnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKF8ucGljayhSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lTm90SGlkZGVuQnlJZCh0aGlzLnVybFBhcmFtcy5faWQpLCAnX2lkJywgJ3ZhbHVlJykpO1xuXHR9LFxuXHRwb3N0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnZWRpdC1wcml2aWxlZ2VkLXNldHRpbmcnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdC8vIGFsbG93IHNwZWNpYWwgaGFuZGxpbmcgb2YgcGFydGljdWxhciBzZXR0aW5nIHR5cGVzXG5cdFx0Y29uc3Qgc2V0dGluZyA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmVOb3RIaWRkZW5CeUlkKHRoaXMudXJsUGFyYW1zLl9pZCk7XG5cdFx0aWYgKHNldHRpbmcudHlwZSA9PT0gJ2FjdGlvbicgJiYgdGhpcy5ib2R5UGFyYW1zICYmIHRoaXMuYm9keVBhcmFtcy5leGVjdXRlKSB7XG5cdFx0XHQvL2V4ZWN1dGUgdGhlIGNvbmZpZ3VyZWQgbWV0aG9kXG5cdFx0XHRNZXRlb3IuY2FsbChzZXR0aW5nLnZhbHVlKTtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdFx0fVxuXG5cdFx0aWYgKHNldHRpbmcudHlwZSA9PT0gJ2NvbG9yJyAmJiB0aGlzLmJvZHlQYXJhbXMgJiYgdGhpcy5ib2R5UGFyYW1zLmVkaXRvciAmJiB0aGlzLmJvZHlQYXJhbXMudmFsdWUpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLnVwZGF0ZU9wdGlvbnNCeUlkKHRoaXMudXJsUGFyYW1zLl9pZCwgeyBlZGl0b3I6IHRoaXMuYm9keVBhcmFtcy5lZGl0b3IgfSk7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy51cGRhdGVWYWx1ZU5vdEhpZGRlbkJ5SWQodGhpcy51cmxQYXJhbXMuX2lkLCB0aGlzLmJvZHlQYXJhbXMudmFsdWUpO1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0XHR9XG5cblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdHZhbHVlOiBNYXRjaC5Bbnlcblx0XHR9KTtcblx0XHRpZiAoUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MudXBkYXRlVmFsdWVOb3RIaWRkZW5CeUlkKHRoaXMudXJsUGFyYW1zLl9pZCwgdGhpcy5ib2R5UGFyYW1zLnZhbHVlKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3NlcnZpY2UuY29uZmlndXJhdGlvbnMnLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgU2VydmljZUNvbmZpZ3VyYXRpb24gPSBQYWNrYWdlWydzZXJ2aWNlLWNvbmZpZ3VyYXRpb24nXS5TZXJ2aWNlQ29uZmlndXJhdGlvbjtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNvbmZpZ3VyYXRpb25zOiBTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy5maW5kKHt9LCB7IGZpZWxkczogeyBzZWNyZXQ6IDAgfSB9KS5mZXRjaCgpXG5cdFx0fSk7XG5cdH1cbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3N0YXRpc3RpY3MnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRsZXQgcmVmcmVzaCA9IGZhbHNlO1xuXHRcdGlmICh0eXBlb2YgdGhpcy5xdWVyeVBhcmFtcy5yZWZyZXNoICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnF1ZXJ5UGFyYW1zLnJlZnJlc2ggPT09ICd0cnVlJykge1xuXHRcdFx0cmVmcmVzaCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0bGV0IHN0YXRzO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdHN0YXRzID0gTWV0ZW9yLmNhbGwoJ2dldFN0YXRpc3RpY3MnLCByZWZyZXNoKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHN0YXRpc3RpY3M6IHN0YXRzXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc3RhdGlzdGljcy5saXN0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXN0YXRpc3RpY3MnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IHN0YXRpc3RpY3MgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdGF0aXN0aWNzLmZpbmQocXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyBuYW1lOiAxIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHNcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0c3RhdGlzdGljcyxcblx0XHRcdGNvdW50OiBzdGF0aXN0aWNzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5TdGF0aXN0aWNzLmZpbmQocXVlcnkpLmNvdW50KClcblx0XHR9KTtcblx0fVxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBCdXNib3kgZnJvbSAnYnVzYm95JztcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLmNyZWF0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdGVtYWlsOiBTdHJpbmcsXG5cdFx0XHRuYW1lOiBTdHJpbmcsXG5cdFx0XHRwYXNzd29yZDogU3RyaW5nLFxuXHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHRcdGFjdGl2ZTogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRyb2xlczogTWF0Y2guTWF5YmUoQXJyYXkpLFxuXHRcdFx0am9pbkRlZmF1bHRDaGFubmVsczogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRyZXF1aXJlUGFzc3dvcmRDaGFuZ2U6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0c2VuZFdlbGNvbWVFbWFpbDogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHR2ZXJpZmllZDogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRjdXN0b21GaWVsZHM6IE1hdGNoLk1heWJlKE9iamVjdClcblx0XHR9KTtcblxuXHRcdC8vTmV3IGNoYW5nZSBtYWRlIGJ5IHB1bGwgcmVxdWVzdCAjNTE1MlxuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLmpvaW5EZWZhdWx0Q2hhbm5lbHMgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLmJvZHlQYXJhbXMuam9pbkRlZmF1bHRDaGFubmVscyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMpIHtcblx0XHRcdFJvY2tldENoYXQudmFsaWRhdGVDdXN0b21GaWVsZHModGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbmV3VXNlcklkID0gUm9ja2V0Q2hhdC5zYXZlVXNlcih0aGlzLnVzZXJJZCwgdGhpcy5ib2R5UGFyYW1zKTtcblxuXHRcdGlmICh0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVDdXN0b21GaWVsZHNXaXRob3V0VmFsaWRhdGlvbihuZXdVc2VySWQsIHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMpO1xuXHRcdH1cblxuXG5cdFx0aWYgKHR5cGVvZiB0aGlzLmJvZHlQYXJhbXMuYWN0aXZlICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRNZXRlb3IuY2FsbCgnc2V0VXNlckFjdGl2ZVN0YXR1cycsIG5ld1VzZXJJZCwgdGhpcy5ib2R5UGFyYW1zLmFjdGl2ZSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHVzZXI6IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKG5ld1VzZXJJZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSkgfSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZGVsZXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnZGVsZXRlLXVzZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnZGVsZXRlVXNlcicsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZGVsZXRlT3duQWNjb3VudCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHBhc3N3b3JkIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0aWYgKCFwYXNzd29yZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW1ldGVyIFwicGFzc3dvcmRcIiBpcyByZXF1aXJlZC4nKTtcblx0XHR9XG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfQWxsb3dEZWxldGVPd25BY2NvdW50JykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2RlbGV0ZVVzZXJPd25BY2NvdW50JywgcGFzc3dvcmQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5nZXRBdmF0YXInLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdGNvbnN0IHVybCA9IFJvY2tldENoYXQuZ2V0VVJMKGAvYXZhdGFyLyR7IHVzZXIudXNlcm5hbWUgfWAsIHsgY2RuOiBmYWxzZSwgZnVsbDogdHJ1ZSB9KTtcblx0XHR0aGlzLnJlc3BvbnNlLnNldEhlYWRlcignTG9jYXRpb24nLCB1cmwpO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHN0YXR1c0NvZGU6IDMwNyxcblx0XHRcdGJvZHk6IHVybFxuXHRcdH07XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZ2V0UHJlc2VuY2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAodGhpcy5pc1VzZXJGcm9tUGFyYW1zKCkpIHtcblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVzZXJJZCk7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdHByZXNlbmNlOiB1c2VyLnN0YXR1cyxcblx0XHRcdFx0Y29ubmVjdGlvblN0YXR1czogdXNlci5zdGF0dXNDb25uZWN0aW9uLFxuXHRcdFx0XHRsYXN0TG9naW46IHVzZXIubGFzdExvZ2luXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cHJlc2VuY2U6IHVzZXIuc3RhdHVzXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuaW5mbycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgdXNlcm5hbWUgfSA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0cmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ2dldEZ1bGxVc2VyRGF0YScsIHsgdXNlcm5hbWUsIGxpbWl0OiAxIH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQgfHwgcmVzdWx0Lmxlbmd0aCAhPT0gMSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYEZhaWxlZCB0byBnZXQgdGhlIHVzZXIgZGF0YSBmb3IgdGhlIHVzZXJJZCBvZiBcIiR7IHVzZXJuYW1lIH1cIi5gKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR1c2VyOiByZXN1bHRbMF1cblx0XHR9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5saXN0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWQtcm9vbScpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3QgdXNlcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kKHF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgdXNlcm5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkc1xuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR1c2Vycyxcblx0XHRcdGNvdW50OiB1c2Vycy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZChxdWVyeSkuY291bnQoKVxuXHRcdH0pO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLnJlZ2lzdGVyJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAodGhpcy51c2VySWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdMb2dnZWQgaW4gdXNlcnMgY2FuIG5vdCByZWdpc3RlciBhZ2Fpbi4nKTtcblx0XHR9XG5cblx0XHQvL1dlIHNldCB0aGVpciB1c2VybmFtZSBoZXJlLCBzbyByZXF1aXJlIGl0XG5cdFx0Ly9UaGUgYHJlZ2lzdGVyVXNlcmAgY2hlY2tzIGZvciB0aGUgb3RoZXIgcmVxdWlyZW1lbnRzXG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0dXNlcm5hbWU6IFN0cmluZ1xuXHRcdH0pKTtcblxuXHRcdC8vUmVnaXN0ZXIgdGhlIHVzZXJcblx0XHRjb25zdCB1c2VySWQgPSBNZXRlb3IuY2FsbCgncmVnaXN0ZXJVc2VyJywgdGhpcy5ib2R5UGFyYW1zKTtcblxuXHRcdC8vTm93IHNldCB0aGVpciB1c2VybmFtZVxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnc2V0VXNlcm5hbWUnLCB0aGlzLmJvZHlQYXJhbXMudXNlcm5hbWUpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdXNlcjogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSB9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5yZXNldEF2YXRhcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0aWYgKHVzZXIuX2lkID09PSB0aGlzLnVzZXJJZCkge1xuXHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3Jlc2V0QXZhdGFyJykpO1xuXHRcdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnZWRpdC1vdGhlci11c2VyLWluZm8nKSkge1xuXHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VyLl9pZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3Jlc2V0QXZhdGFyJykpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5zZXRBdmF0YXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0YXZhdGFyVXJsOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dXNlcklkOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dXNlcm5hbWU6IE1hdGNoLk1heWJlKFN0cmluZylcblx0XHR9KSk7XG5cblx0XHRsZXQgdXNlcjtcblx0XHRpZiAodGhpcy5pc1VzZXJGcm9tUGFyYW1zKCkpIHtcblx0XHRcdHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh0aGlzLnVzZXJJZCk7XG5cdFx0fSBlbHNlIGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdlZGl0LW90aGVyLXVzZXItaW5mbycpKSB7XG5cdFx0XHR1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5hdmF0YXJVcmwpIHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5zZXRVc2VyQXZhdGFyKHVzZXIsIHRoaXMuYm9keVBhcmFtcy5hdmF0YXJVcmwsICcnLCAndXJsJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCBidXNib3kgPSBuZXcgQnVzYm95KHsgaGVhZGVyczogdGhpcy5yZXF1ZXN0LmhlYWRlcnMgfSk7XG5cblx0XHRcdFx0TWV0ZW9yLndyYXBBc3luYygoY2FsbGJhY2spID0+IHtcblx0XHRcdFx0XHRidXNib3kub24oJ2ZpbGUnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUpID0+IHtcblx0XHRcdFx0XHRcdGlmIChmaWVsZG5hbWUgIT09ICdpbWFnZScpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtZmllbGQnKSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGNvbnN0IGltYWdlRGF0YSA9IFtdO1xuXHRcdFx0XHRcdFx0ZmlsZS5vbignZGF0YScsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdFx0aW1hZ2VEYXRhLnB1c2goZGF0YSk7XG5cdFx0XHRcdFx0XHR9KSk7XG5cblx0XHRcdFx0XHRcdGZpbGUub24oJ2VuZCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNldFVzZXJBdmF0YXIodXNlciwgQnVmZmVyLmNvbmNhdChpbWFnZURhdGEpLCBtaW1ldHlwZSwgJ3Jlc3QnKTtcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0XHRcdH0pKTtcblxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0XHR0aGlzLnJlcXVlc3QucGlwZShidXNib3kpO1xuXHRcdFx0XHR9KSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy51cGRhdGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHR1c2VySWQ6IFN0cmluZyxcblx0XHRcdGRhdGE6IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRcdGVtYWlsOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRuYW1lOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRwYXNzd29yZDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0dXNlcm5hbWU6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdGFjdGl2ZTogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdHJvbGVzOiBNYXRjaC5NYXliZShBcnJheSksXG5cdFx0XHRcdGpvaW5EZWZhdWx0Q2hhbm5lbHM6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRyZXF1aXJlUGFzc3dvcmRDaGFuZ2U6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRzZW5kV2VsY29tZUVtYWlsOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0dmVyaWZpZWQ6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRjdXN0b21GaWVsZHM6IE1hdGNoLk1heWJlKE9iamVjdClcblx0XHRcdH0pXG5cdFx0fSk7XG5cblx0XHRjb25zdCB1c2VyRGF0YSA9IF8uZXh0ZW5kKHsgX2lkOiB0aGlzLmJvZHlQYXJhbXMudXNlcklkIH0sIHRoaXMuYm9keVBhcmFtcy5kYXRhKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IFJvY2tldENoYXQuc2F2ZVVzZXIodGhpcy51c2VySWQsIHVzZXJEYXRhKSk7XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLmRhdGEuY3VzdG9tRmllbGRzKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVDdXN0b21GaWVsZHModGhpcy5ib2R5UGFyYW1zLnVzZXJJZCwgdGhpcy5ib2R5UGFyYW1zLmRhdGEuY3VzdG9tRmllbGRzKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5kYXRhLmFjdGl2ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJBY3RpdmVTdGF0dXMnLCB0aGlzLmJvZHlQYXJhbXMudXNlcklkLCB0aGlzLmJvZHlQYXJhbXMuZGF0YS5hY3RpdmUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyB1c2VyOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMudXNlcklkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSB9KTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy51cGRhdGVPd25CYXNpY0luZm8nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRkYXRhOiBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0XHRlbWFpbDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0bmFtZTogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0dXNlcm5hbWU6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdGN1cnJlbnRQYXNzd29yZDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0bmV3UGFzc3dvcmQ6IE1hdGNoLk1heWJlKFN0cmluZylcblx0XHRcdH0pLFxuXHRcdFx0Y3VzdG9tRmllbGRzOiBNYXRjaC5NYXliZShPYmplY3QpXG5cdFx0fSk7XG5cblx0XHRjb25zdCB1c2VyRGF0YSA9IHtcblx0XHRcdGVtYWlsOiB0aGlzLmJvZHlQYXJhbXMuZGF0YS5lbWFpbCxcblx0XHRcdHJlYWxuYW1lOiB0aGlzLmJvZHlQYXJhbXMuZGF0YS5uYW1lLFxuXHRcdFx0dXNlcm5hbWU6IHRoaXMuYm9keVBhcmFtcy5kYXRhLnVzZXJuYW1lLFxuXHRcdFx0bmV3UGFzc3dvcmQ6IHRoaXMuYm9keVBhcmFtcy5kYXRhLm5ld1Bhc3N3b3JkLFxuXHRcdFx0dHlwZWRQYXNzd29yZDogdGhpcy5ib2R5UGFyYW1zLmRhdGEuY3VycmVudFBhc3N3b3JkXG5cdFx0fTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdzYXZlVXNlclByb2ZpbGUnLCB1c2VyRGF0YSwgdGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcykpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyB1c2VyOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVzZXJJZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSkgfSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuY3JlYXRlVG9rZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblx0XHRsZXQgZGF0YTtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRkYXRhID0gTWV0ZW9yLmNhbGwoJ2NyZWF0ZVRva2VuJywgdXNlci5faWQpO1xuXHRcdH0pO1xuXHRcdHJldHVybiBkYXRhID8gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IGRhdGEgfSkgOiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5nZXRQcmVmZXJlbmNlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVzZXJJZCk7XG5cdFx0aWYgKHVzZXIuc2V0dGluZ3MpIHtcblx0XHRcdGNvbnN0IHByZWZlcmVuY2VzID0gdXNlci5zZXR0aW5ncy5wcmVmZXJlbmNlcztcblx0XHRcdHByZWZlcmVuY2VzWydsYW5ndWFnZSddID0gdXNlci5sYW5ndWFnZTtcblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRwcmVmZXJlbmNlc1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKFRBUGkxOG4uX18oJ0FjY291bnRzX0RlZmF1bHRfVXNlcl9QcmVmZXJlbmNlc19ub3RfYXZhaWxhYmxlJykudG9VcHBlckNhc2UoKSk7XG5cdFx0fVxuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLnNldFByZWZlcmVuY2VzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0dXNlcklkOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0ZGF0YTogTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdFx0bmV3Um9vbU5vdGlmaWNhdGlvbjogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0bmV3TWVzc2FnZU5vdGlmaWNhdGlvbjogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0dXNlRW1vamlzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0Y29udmVydEFzY2lpRW1vamk6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRzYXZlTW9iaWxlQmFuZHdpZHRoOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0Y29sbGFwc2VNZWRpYUJ5RGVmYXVsdDogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdGF1dG9JbWFnZUxvYWQ6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRlbWFpbE5vdGlmaWNhdGlvbk1vZGU6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdHVucmVhZEFsZXJ0OiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0bm90aWZpY2F0aW9uc1NvdW5kVm9sdW1lOiBNYXRjaC5NYXliZShOdW1iZXIpLFxuXHRcdFx0XHRkZXNrdG9wTm90aWZpY2F0aW9uczogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0bW9iaWxlTm90aWZpY2F0aW9uczogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0ZW5hYmxlQXV0b0F3YXk6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRoaWdobGlnaHRzOiBNYXRjaC5NYXliZShBcnJheSksXG5cdFx0XHRcdGRlc2t0b3BOb3RpZmljYXRpb25EdXJhdGlvbjogTWF0Y2guTWF5YmUoTnVtYmVyKSxcblx0XHRcdFx0bWVzc2FnZVZpZXdNb2RlOiBNYXRjaC5NYXliZShOdW1iZXIpLFxuXHRcdFx0XHRoaWRlVXNlcm5hbWVzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0aGlkZVJvbGVzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0aGlkZUF2YXRhcnM6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRoaWRlRmxleFRhYjogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdHNlbmRPbkVudGVyOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRyb29tQ291bnRlclNpZGViYXI6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRsYW5ndWFnZTogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0c2lkZWJhclNob3dGYXZvcml0ZXM6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0XHRzaWRlYmFyU2hvd1VucmVhZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbiksXG5cdFx0XHRcdHNpZGViYXJTb3J0Ynk6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRcdHNpZGViYXJWaWV3TW9kZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdFx0c2lkZWJhckhpZGVBdmF0YXI6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0XHRzaWRlYmFyR3JvdXBCeVR5cGU6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0XHRtdXRlRm9jdXNlZENvbnZlcnNhdGlvbnM6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG5cdFx0XHR9KVxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdXNlcklkID0gdGhpcy5ib2R5UGFyYW1zLnVzZXJJZCA/IHRoaXMuYm9keVBhcmFtcy51c2VySWQgOiB0aGlzLnVzZXJJZDtcblx0XHRjb25zdCB1c2VyRGF0YSA9IHtcblx0XHRcdF9pZDogdXNlcklkLFxuXHRcdFx0c2V0dGluZ3M6IHtcblx0XHRcdFx0cHJlZmVyZW5jZXM6IHRoaXMuYm9keVBhcmFtcy5kYXRhXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGlmICh0aGlzLmJvZHlQYXJhbXMuZGF0YS5sYW5ndWFnZSkge1xuXHRcdFx0Y29uc3QgbGFuZ3VhZ2UgPSB0aGlzLmJvZHlQYXJhbXMuZGF0YS5sYW5ndWFnZTtcblx0XHRcdGRlbGV0ZSB0aGlzLmJvZHlQYXJhbXMuZGF0YS5sYW5ndWFnZTtcblx0XHRcdHVzZXJEYXRhLmxhbmd1YWdlID0gbGFuZ3VhZ2U7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gUm9ja2V0Q2hhdC5zYXZlVXNlcih0aGlzLnVzZXJJZCwgdXNlckRhdGEpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHVzZXI6IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXJJZCwge1xuXHRcdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0XHQnc2V0dGluZ3MucHJlZmVyZW5jZXMnOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZm9yZ290UGFzc3dvcmQnLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgZW1haWwgfSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRpZiAoIWVtYWlsKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFxcJ2VtYWlsXFwnIHBhcmFtIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZW1haWxTZW50ID0gTWV0ZW9yLmNhbGwoJ3NlbmRGb3Jnb3RQYXNzd29yZEVtYWlsJywgZW1haWwpO1xuXHRcdGlmIChlbWFpbFNlbnQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdFx0fVxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdVc2VyIG5vdCBmb3VuZCcpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLmdldFVzZXJuYW1lU3VnZ2VzdGlvbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdnZXRVc2VybmFtZVN1Z2dlc3Rpb24nKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHJlc3VsdCB9KTtcblx0fVxufSk7XG4iXX0=
