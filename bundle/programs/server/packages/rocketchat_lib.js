(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var RateLimiter = Package['rate-limit'].RateLimiter;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var ReactiveDict = Package['reactive-dict'].ReactiveDict;
var Accounts = Package['accounts-base'].Accounts;
var ECMAScript = Package.ecmascript.ECMAScript;
var Random = Package.random.Random;
var check = Package.check.check;
var Match = Package.check.Match;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var CollectionHooks = Package['matb33:collection-hooks'].CollectionHooks;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var meteorInstall = Package.modules.meteorInstall;
var Streamer = Package['rocketchat:streamer'].Streamer;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var CustomOAuth = Package['rocketchat:custom-oauth'].CustomOAuth;
var FlowRouter = Package['kadira:flow-router'].FlowRouter;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var RocketChat, name, language, message, result, options, hidden, pinned, pinnedAt, snippeted, snippetedAt, importIds, inc, value, _id, roles, favorite, file, username, exceptions, active, latest, query;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:lib":{"lib":{"core.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/core.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let EventEmitter;
module.watch(require("wolfy87-eventemitter"), {
  default(v) {
    EventEmitter = v;
  }

}, 0);
RocketChat = new EventEmitter();
/*
* Kick off the global namespace for RocketChat.
* @namespace RocketChat
*/

RocketChat.models = {};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/settings.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/*
* RocketChat.settings holds all packages settings
* @namespace RocketChat.settings
*/
RocketChat.settings = {
  callbacks: {},
  regexCallbacks: {},
  ts: new Date(),

  get(_id, callback) {
    if (callback != null) {
      RocketChat.settings.onload(_id, callback);

      if (!Meteor.settings) {
        return;
      }

      if (_id === '*') {
        return Object.keys(Meteor.settings).forEach(key => {
          const value = Meteor.settings[key];
          callback(key, value);
        });
      }

      if (_.isRegExp(_id) && Meteor.settings) {
        return Object.keys(Meteor.settings).forEach(key => {
          if (!_id.test(key)) {
            return;
          }

          const value = Meteor.settings[key];
          callback(key, value);
        });
      }

      return Meteor.settings[_id] != null && callback(_id, Meteor.settings[_id]);
    } else {
      if (!Meteor.settings) {
        return;
      }

      if (_.isRegExp(_id)) {
        return Object.keys(Meteor.settings).reduce((items, key) => {
          const value = Meteor.settings[key];

          if (_id.test(key)) {
            items.push({
              key,
              value
            });
          }

          return items;
        }, []);
      }

      return Meteor.settings && Meteor.settings[_id];
    }
  },

  set(_id, value, callback) {
    return Meteor.call('saveSetting', _id, value, callback);
  },

  batchSet(settings, callback) {
    // async -> sync
    // http://daemon.co.za/2012/04/simple-async-with-only-underscore/
    const save = function (setting) {
      return function (callback) {
        return Meteor.call('saveSetting', setting._id, setting.value, setting.editor, callback);
      };
    };

    const actions = _.map(settings, setting => save(setting));

    return _(actions).reduceRight(_.wrap, (err, success) => callback(err, success))();
  },

  load(key, value, initialLoad) {
    ['*', key].forEach(item => {
      if (RocketChat.settings.callbacks[item]) {
        RocketChat.settings.callbacks[item].forEach(callback => callback(key, value, initialLoad));
      }
    });
    Object.keys(RocketChat.settings.regexCallbacks).forEach(cbKey => {
      const cbValue = RocketChat.settings.regexCallbacks[cbKey];

      if (!cbValue.regex.test(key)) {
        return;
      }

      cbValue.callbacks.forEach(callback => callback(key, value, initialLoad));
    });
  },

  onload(key, callback) {
    // if key is '*'
    // 	for key, value in Meteor.settings
    // 		callback key, value, false
    // else if Meteor.settings?[_id]?
    // 	callback key, Meteor.settings[_id], false
    const keys = [].concat(key);
    keys.forEach(k => {
      if (_.isRegExp(k)) {
        RocketChat.settings.regexCallbacks[name = k.source] = RocketChat.settings.regexCallbacks[name = k.source] || {
          regex: k,
          callbacks: []
        };
        RocketChat.settings.regexCallbacks[k.source].callbacks.push(callback);
      } else {
        RocketChat.settings.callbacks[k] = RocketChat.settings.callbacks[k] || [];
        RocketChat.settings.callbacks[k].push(callback);
      }
    });
  }

};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"RoomTypeConfig.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/RoomTypeConfig.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  RoomSettingsEnum: () => RoomSettingsEnum,
  UiTextContext: () => UiTextContext,
  RoomTypeRouteConfig: () => RoomTypeRouteConfig,
  RoomTypeConfig: () => RoomTypeConfig
});
const RoomSettingsEnum = {
  NAME: 'roomName',
  TOPIC: 'roomTopic',
  ANNOUNCEMENT: 'roomAnnouncement',
  DESCRIPTION: 'roomDescription',
  READ_ONLY: 'readOnly',
  REACT_WHEN_READ_ONLY: 'reactWhenReadOnly',
  ARCHIVE_OR_UNARCHIVE: 'archiveOrUnarchive',
  JOIN_CODE: 'joinCode',
  BROADCAST: 'broadcast',
  SYSTEM_MESSAGES: 'systemMessages'
};
const UiTextContext = {
  CLOSE_WARNING: 'closeWarning',
  HIDE_WARNING: 'hideWarning',
  LEAVE_WARNING: 'leaveWarning',
  NO_ROOMS_SUBSCRIBED: 'noRoomsSubscribed'
};

class RoomTypeRouteConfig {
  constructor({
    name,
    path
  }) {
    if (typeof name !== 'undefined' && (typeof name !== 'string' || name.length === 0)) {
      throw new Error('The name must be a string.');
    }

    if (typeof path !== 'undefined' && (typeof path !== 'string' || path.length === 0)) {
      throw new Error('The path must be a string.');
    }

    this._name = name;
    this._path = path;
  }

  get name() {
    return this._name;
  }

  get path() {
    return this._path;
  }

}

class RoomTypeConfig {
  constructor({
    identifier = Random.id(),
    order,
    icon,
    header,
    label,
    route
  }) {
    if (typeof identifier !== 'string' || identifier.length === 0) {
      throw new Error('The identifier must be a string.');
    }

    if (typeof order !== 'number') {
      throw new Error('The order must be a number.');
    }

    if (typeof icon !== 'undefined' && (typeof icon !== 'string' || icon.length === 0)) {
      throw new Error('The icon must be a string.');
    }

    if (typeof header !== 'undefined' && (typeof header !== 'string' || header.length === 0)) {
      throw new Error('The header must be a string.');
    }

    if (typeof label !== 'undefined' && (typeof label !== 'string' || label.length === 0)) {
      throw new Error('The label must be a string.');
    }

    if (typeof route !== 'undefined' && !(route instanceof RoomTypeRouteConfig)) {
      throw new Error('Room\'s route is not a valid route configuration. Must be an instance of "RoomTypeRouteConfig".');
    }

    this._identifier = identifier;
    this._order = order;
    this._icon = icon;
    this._header = header;
    this._label = label;
    this._route = route;
  }
  /**
   * The room type's internal identifier.
   */


  get identifier() {
    return this._identifier;
  }
  /**
   * The order of this room type for the display.
   */


  get order() {
    return this._order;
  }
  /**
   * Sets the order of this room type for the display.
   *
   * @param {number} order the number value for the order
   */


  set order(order) {
    if (typeof order !== 'number') {
      throw new Error('The order must be a number.');
    }

    this._order = order;
  }
  /**
   * The icon class, css, to use as the visual aid.
   */


  get icon() {
    return this._icon;
  }
  /**
   * The header name of this type.
   */


  get header() {
    return this._header;
  }
  /**
   * The i18n label for this room type.
   */


  get label() {
    return this._label;
  }
  /**
   * The route config for this room type.
   */


  get route() {
    return this._route;
  }
  /**
   * Gets the room's name to display in the UI.
   *
   * @param {object} room
   */


  getDisplayName(room) {
    return room.name;
  }

  allowRoomSettingChange()
  /* room, setting */
  {
    return true;
  }
  /**
   * Return a room's name
   *
   * @abstract
   * @return {string} Room's name according to it's type
   */


  roomName()
  /* room */
  {
    return '';
  }

  canBeCreated() {
    return Meteor.isServer ? RocketChat.authz.hasAtLeastOnePermission(Meteor.userId(), [`create-${this._identifier}`]) : RocketChat.authz.hasAtLeastOnePermission([`create-${this._identifier}`]);
  }

  canBeDeleted(room) {
    return Meteor.isServer ? RocketChat.authz.hasAtLeastOnePermission(Meteor.userId(), [`delete-${room.t}`], room._id) : RocketChat.authz.hasAtLeastOnePermission([`delete-${room.t}`], room._id);
  }

  supportMembersList()
  /* room */
  {
    return true;
  }

  isGroupChat() {
    return false;
  }

  canAddUser()
  /* userId, room */
  {
    return false;
  }

  userDetailShowAll()
  /* room */
  {
    return true;
  }

  userDetailShowAdmin()
  /* room */
  {
    return true;
  }

  preventRenaming()
  /* room */
  {
    return false;
  }

  includeInRoomSearch() {
    return false;
  }

  enableMembersListProfile() {
    return false;
  }
  /**
   * Returns a text which can be used in generic UIs.
   * @param context The role of the text in the UI-Element
   * @return {string} A text or a translation key - the consumers of this method will pass the
   * returned value to an internationalization library
   */


  getUiText()
  /* context */
  {
    return '';
  }
  /**
   * Returns the full object of message sender
   * @param {string} senderId Sender's _id
   * @return {object} Sender's object from db
   */


  getMsgSender(senderId) {
    return Meteor.isServer ? RocketChat.models.Users.findOneById(senderId) : {};
  }
  /**
   * Returns details to use on notifications
   *
   * @param {object} room
   * @param {object} user
   * @param {string} notificationMessage
   * @return {object} Notification details
   */


  getNotificationDetails(room, user, notificationMessage) {
    if (!Meteor.isServer) {
      return {};
    }

    const title = `#${this.roomName(room)}`;
    const text = `${RocketChat.settings.get('UI_Use_Real_Name') ? user.name : user.username}: ${notificationMessage}`;
    return {
      title,
      text
    };
  }
  /**
   * Check if there is an user with the same id and loginToken
   * @param {object} allowData
   * @return {object} User's object from db
   */


  canAccessUploadedFile()
  /* accessData */
  {
    return false;
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"roomTypes":{"conversation.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/roomTypes/conversation.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ConversationRoomType: () => ConversationRoomType
});
let RoomTypeConfig;
module.watch(require("../RoomTypeConfig"), {
  RoomTypeConfig(v) {
    RoomTypeConfig = v;
  }

}, 0);

class ConversationRoomType extends RoomTypeConfig {
  constructor() {
    super({
      identifier: 'merged',
      order: 30,
      label: 'Conversations'
    });
  }

  condition() {
    // returns true only if sidebarGroupByType is not set
    return !RocketChat.getUserPreference(Meteor.userId(), 'sidebarGroupByType');
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"direct.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/roomTypes/direct.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  DirectMessageRoomRoute: () => DirectMessageRoomRoute,
  DirectMessageRoomType: () => DirectMessageRoomType
});
let RoomTypeConfig, RoomTypeRouteConfig, RoomSettingsEnum, UiTextContext;
module.watch(require("../RoomTypeConfig"), {
  RoomTypeConfig(v) {
    RoomTypeConfig = v;
  },

  RoomTypeRouteConfig(v) {
    RoomTypeRouteConfig = v;
  },

  RoomSettingsEnum(v) {
    RoomSettingsEnum = v;
  },

  UiTextContext(v) {
    UiTextContext = v;
  }

}, 0);

class DirectMessageRoomRoute extends RoomTypeRouteConfig {
  constructor() {
    super({
      name: 'direct',
      path: '/direct/:username'
    });
  }

  action(params) {
    return openRoom('d', params.username);
  }

  link(sub) {
    return {
      username: sub.name
    };
  }

}

class DirectMessageRoomType extends RoomTypeConfig {
  constructor() {
    super({
      identifier: 'd',
      order: 50,
      label: 'Direct_Messages',
      route: new DirectMessageRoomRoute()
    });
  }

  findRoom(identifier) {
    const query = {
      t: 'd',
      name: identifier
    };
    const subscription = RocketChat.models.Subscriptions.findOne(query);

    if (subscription && subscription.rid) {
      return ChatRoom.findOne(subscription.rid);
    }
  }

  roomName(roomData) {
    const subscription = RocketChat.models.Subscriptions.findOne({
      rid: roomData._id
    }, {
      fields: {
        name: 1,
        fname: 1
      }
    });

    if (!subscription) {
      return '';
    }

    if (RocketChat.settings.get('UI_Use_Real_Name') && subscription.fname) {
      return subscription.fname;
    }

    return subscription.name;
  }

  secondaryRoomName(roomData) {
    if (RocketChat.settings.get('UI_Use_Real_Name')) {
      const subscription = RocketChat.models.Subscriptions.findOne({
        rid: roomData._id
      }, {
        fields: {
          name: 1
        }
      });
      return subscription && subscription.name;
    }
  }

  condition() {
    const groupByType = RocketChat.getUserPreference(Meteor.userId(), 'sidebarGroupByType');
    return groupByType && RocketChat.authz.hasAtLeastOnePermission(['view-d-room', 'view-joined-room']);
  }

  getUserStatus(roomId) {
    const subscription = RocketChat.models.Subscriptions.findOne({
      rid: roomId
    });

    if (subscription == null) {
      return;
    }

    return Session.get(`user_${subscription.name}_status`);
  }

  getDisplayName(room) {
    return room.usernames.join(' x ');
  }

  allowRoomSettingChange(room, setting) {
    switch (setting) {
      case RoomSettingsEnum.NAME:
      case RoomSettingsEnum.SYSTEM_MESSAGES:
      case RoomSettingsEnum.DESCRIPTION:
      case RoomSettingsEnum.READ_ONLY:
      case RoomSettingsEnum.REACT_WHEN_READ_ONLY:
      case RoomSettingsEnum.ARCHIVE_OR_UNARCHIVE:
      case RoomSettingsEnum.JOIN_CODE:
        return false;

      default:
        return true;
    }
  }

  enableMembersListProfile() {
    return true;
  }

  userDetailShowAll()
  /* room */
  {
    return false;
  }

  getUiText(context) {
    switch (context) {
      case UiTextContext.HIDE_WARNING:
        return 'Hide_Private_Warning';

      case UiTextContext.LEAVE_WARNING:
        return 'Leave_Private_Warning';

      default:
        return '';
    }
  }
  /**
   * Returns details to use on notifications
   *
   * @param {object} room
   * @param {object} user
   * @param {string} notificationMessage
   * @return {object} Notification details
   */


  getNotificationDetails(room, user, notificationMessage) {
    if (!Meteor.isServer) {
      return {};
    }

    const title = RocketChat.settings.get('UI_Use_Real_Name') ? user.name : `@${user.username}`;
    const text = notificationMessage;
    return {
      title,
      text
    };
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"favorite.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/roomTypes/favorite.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  FavoriteRoomType: () => FavoriteRoomType
});
let RoomTypeConfig;
module.watch(require("../RoomTypeConfig"), {
  RoomTypeConfig(v) {
    RoomTypeConfig = v;
  }

}, 0);

class FavoriteRoomType extends RoomTypeConfig {
  constructor() {
    super({
      identifier: 'f',
      order: 20,
      header: 'favorite',
      icon: 'star',
      label: 'Favorites'
    });
  }

  condition() {
    return RocketChat.settings.get('Favorite_Rooms') && RocketChat.getUserPreference(Meteor.userId(), 'sidebarShowFavorites');
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/roomTypes/index.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ConversationRoomType: () => ConversationRoomType,
  DirectMessageRoomType: () => DirectMessageRoomType,
  FavoriteRoomType: () => FavoriteRoomType,
  PrivateRoomType: () => PrivateRoomType,
  PublicRoomType: () => PublicRoomType,
  UnreadRoomType: () => UnreadRoomType
});
let ConversationRoomType;
module.watch(require("./conversation"), {
  ConversationRoomType(v) {
    ConversationRoomType = v;
  }

}, 0);
let DirectMessageRoomType;
module.watch(require("./direct"), {
  DirectMessageRoomType(v) {
    DirectMessageRoomType = v;
  }

}, 1);
let FavoriteRoomType;
module.watch(require("./favorite"), {
  FavoriteRoomType(v) {
    FavoriteRoomType = v;
  }

}, 2);
let PrivateRoomType;
module.watch(require("./private"), {
  PrivateRoomType(v) {
    PrivateRoomType = v;
  }

}, 3);
let PublicRoomType;
module.watch(require("./public"), {
  PublicRoomType(v) {
    PublicRoomType = v;
  }

}, 4);
let UnreadRoomType;
module.watch(require("./unread"), {
  UnreadRoomType(v) {
    UnreadRoomType = v;
  }

}, 5);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"private.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/roomTypes/private.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  PrivateRoomRoute: () => PrivateRoomRoute,
  PrivateRoomType: () => PrivateRoomType
});
let RoomSettingsEnum, RoomTypeConfig, RoomTypeRouteConfig, UiTextContext;
module.watch(require("../RoomTypeConfig"), {
  RoomSettingsEnum(v) {
    RoomSettingsEnum = v;
  },

  RoomTypeConfig(v) {
    RoomTypeConfig = v;
  },

  RoomTypeRouteConfig(v) {
    RoomTypeRouteConfig = v;
  },

  UiTextContext(v) {
    UiTextContext = v;
  }

}, 0);

class PrivateRoomRoute extends RoomTypeRouteConfig {
  constructor() {
    super({
      name: 'group',
      path: '/group/:name'
    });
  }

  action(params) {
    return openRoom('p', params.name);
  }

}

class PrivateRoomType extends RoomTypeConfig {
  constructor() {
    super({
      identifier: 'p',
      order: 40,
      icon: 'lock',
      label: 'Private_Groups',
      route: new PrivateRoomRoute()
    });
  }

  findRoom(identifier) {
    const query = {
      t: 'p',
      name: identifier
    };
    return ChatRoom.findOne(query);
  }

  roomName(roomData) {
    if (RocketChat.settings.get('UI_Allow_room_names_with_special_chars')) {
      return roomData.fname || roomData.name;
    }

    return roomData.name;
  }

  condition() {
    const groupByType = RocketChat.getUserPreference(Meteor.userId(), 'sidebarGroupByType');
    return groupByType && RocketChat.authz.hasAllPermission('view-p-room');
  }

  isGroupChat() {
    return true;
  }

  canAddUser(room) {
    return RocketChat.authz.hasAtLeastOnePermission(['add-user-to-any-p-room', 'add-user-to-joined-room'], room._id);
  }

  allowRoomSettingChange(room, setting) {
    switch (setting) {
      case RoomSettingsEnum.JOIN_CODE:
        return false;

      case RoomSettingsEnum.BROADCAST:
        return room.broadcast;

      case RoomSettingsEnum.READ_ONLY:
        return !room.broadcast;

      case RoomSettingsEnum.REACT_WHEN_READ_ONLY:
        return !room.broadcast && room.ro;

      case RoomSettingsEnum.SYSTEM_MESSAGES:
      default:
        return true;
    }
  }

  enableMembersListProfile() {
    return true;
  }

  getUiText(context) {
    switch (context) {
      case UiTextContext.HIDE_WARNING:
        return 'Hide_Group_Warning';

      case UiTextContext.LEAVE_WARNING:
        return 'Leave_Group_Warning';

      default:
        return '';
    }
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"public.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/roomTypes/public.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  PublicRoomRoute: () => PublicRoomRoute,
  PublicRoomType: () => PublicRoomType
});
let RoomTypeConfig, RoomTypeRouteConfig, RoomSettingsEnum, UiTextContext;
module.watch(require("../RoomTypeConfig"), {
  RoomTypeConfig(v) {
    RoomTypeConfig = v;
  },

  RoomTypeRouteConfig(v) {
    RoomTypeRouteConfig = v;
  },

  RoomSettingsEnum(v) {
    RoomSettingsEnum = v;
  },

  UiTextContext(v) {
    UiTextContext = v;
  }

}, 0);

class PublicRoomRoute extends RoomTypeRouteConfig {
  constructor() {
    super({
      name: 'channel',
      path: '/channel/:name'
    });
  }

  action(params) {
    return openRoom('c', params.name);
  }

}

class PublicRoomType extends RoomTypeConfig {
  constructor() {
    super({
      identifier: 'c',
      order: 30,
      icon: 'hashtag',
      label: 'Channels',
      route: new PublicRoomRoute()
    });
  }

  findRoom(identifier) {
    const query = {
      t: 'c',
      name: identifier
    };
    return ChatRoom.findOne(query);
  }

  roomName(roomData) {
    if (RocketChat.settings.get('UI_Allow_room_names_with_special_chars')) {
      return roomData.fname || roomData.name;
    }

    return roomData.name;
  }

  condition() {
    const groupByType = RocketChat.getUserPreference(Meteor.userId(), 'sidebarGroupByType');
    return groupByType && (RocketChat.authz.hasAtLeastOnePermission(['view-c-room', 'view-joined-room']) || RocketChat.settings.get('Accounts_AllowAnonymousRead') === true);
  }

  showJoinLink(roomId) {
    return !!ChatRoom.findOne({
      _id: roomId,
      t: 'c'
    });
  }

  includeInRoomSearch() {
    return true;
  }

  isGroupChat() {
    return true;
  }

  canAddUser(room) {
    return RocketChat.authz.hasAtLeastOnePermission(['add-user-to-any-c-room', 'add-user-to-joined-room'], room._id);
  }

  enableMembersListProfile() {
    return true;
  }

  allowRoomSettingChange(room, setting) {
    switch (setting) {
      case RoomSettingsEnum.BROADCAST:
        return room.broadcast;

      case RoomSettingsEnum.READ_ONLY:
        return !room.broadcast;

      case RoomSettingsEnum.REACT_WHEN_READ_ONLY:
        return !room.broadcast && room.ro;

      case RoomSettingsEnum.SYSTEM_MESSAGES:
      default:
        return true;
    }
  }

  getUiText(context) {
    switch (context) {
      case UiTextContext.HIDE_WARNING:
        return 'Hide_Room_Warning';

      case UiTextContext.LEAVE_WARNING:
        return 'Leave_Room_Warning';

      default:
        return '';
    }
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unread.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/roomTypes/unread.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  UnreadRoomType: () => UnreadRoomType
});
let RoomTypeConfig;
module.watch(require("../RoomTypeConfig"), {
  RoomTypeConfig(v) {
    RoomTypeConfig = v;
  }

}, 0);

class UnreadRoomType extends RoomTypeConfig {
  constructor() {
    super({
      identifier: 'unread',
      order: 10,
      label: 'Unread'
    });
    this.unread = true;
  }

  condition() {
    return RocketChat.getUserPreference(Meteor.userId(), 'sidebarShowUnread');
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"getURL.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/getURL.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat.getURL = (path, {
  cdn = true,
  full = false
} = {}) => {
  const cdnPrefix = s.rtrim(s.trim(RocketChat.settings.get('CDN_PREFIX') || ''), '/');
  const pathPrefix = s.rtrim(s.trim(__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || ''), '/');
  let basePath;
  const finalPath = s.ltrim(s.trim(path), '/');

  if (cdn && cdnPrefix !== '') {
    basePath = cdnPrefix + pathPrefix;
  } else if (full || Meteor.isCordova) {
    return Meteor.absoluteUrl(finalPath);
  } else {
    basePath = pathPrefix;
  }

  return `${basePath}/${finalPath}`;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"callbacks.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/callbacks.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/*
* Callback hooks provide an easy way to add extra steps to common operations.
* @namespace RocketChat.callbacks
*/
RocketChat.callbacks = {};

if (Meteor.isServer) {
  RocketChat.callbacks.showTime = true;
  RocketChat.callbacks.showTotalTime = true;
} else {
  RocketChat.callbacks.showTime = false;
  RocketChat.callbacks.showTotalTime = false;
}
/*
* Callback priorities
*/


RocketChat.callbacks.priority = {
  HIGH: -1000,
  MEDIUM: 0,
  LOW: 1000
};

const getHooks = hookName => RocketChat.callbacks[hookName] || [];
/*
* Add a callback function to a hook
* @param {String} hook - The name of the hook
* @param {Function} callback - The callback function
*/


RocketChat.callbacks.add = function (hook, callback, priority, id = Random.id()) {
  if (!_.isNumber(priority)) {
    priority = RocketChat.callbacks.priority.MEDIUM;
  }

  callback.priority = priority;
  callback.id = id;
  RocketChat.callbacks[hook] = getHooks(hook);

  if (RocketChat.callbacks.showTime === true) {
    const err = new Error();
    callback.stack = err.stack;
  }

  if (RocketChat.callbacks[hook].find(cb => cb.id === callback.id)) {
    return;
  }

  RocketChat.callbacks[hook].push(callback);
  RocketChat.callbacks[hook] = _.sortBy(RocketChat.callbacks[hook], function (callback) {
    return callback.priority || RocketChat.callbacks.priority.MEDIUM;
  });
};
/*
* Remove a callback from a hook
* @param {string} hook - The name of the hook
* @param {string} id - The callback's id
*/


RocketChat.callbacks.remove = function (hook, id) {
  RocketChat.callbacks[hook] = getHooks(hook).filter(callback => callback.id !== id);
};
/*
* Successively run all of a hook's callbacks on an item
* @param {String} hook - The name of the hook
* @param {Object} item - The post, comment, modifier, etc. on which to run the callbacks
* @param {Object} [constant] - An optional constant that will be passed along to each callback
* @returns {Object} Returns the item after it's been through all the callbacks for this hook
*/


RocketChat.callbacks.run = function (hook, item, constant) {
  const callbacks = RocketChat.callbacks[hook];

  if (!callbacks || !callbacks.length) {
    return item;
  }

  let rocketchatHooksEnd;

  if (Meteor.isServer) {
    rocketchatHooksEnd = RocketChat.metrics.rocketchatHooks.startTimer({
      hook,
      callbacks_length: callbacks.length
    });
  }

  let totalTime = 0;
  const result = callbacks.reduce(function (result, callback) {
    let rocketchatCallbacksEnd;

    if (Meteor.isServer) {
      rocketchatCallbacksEnd = RocketChat.metrics.rocketchatCallbacks.startTimer({
        hook,
        callback: callback.id
      });
    }

    const time = RocketChat.callbacks.showTime === true || RocketChat.callbacks.showTotalTime === true ? Date.now() : 0;
    const callbackResult = callback(result, constant);

    if (RocketChat.callbacks.showTime === true || RocketChat.callbacks.showTotalTime === true) {
      const currentTime = Date.now() - time;
      totalTime += currentTime;

      if (RocketChat.callbacks.showTime === true) {
        if (Meteor.isServer) {
          rocketchatCallbacksEnd();
          RocketChat.statsTracker.timing('callbacks.time', currentTime, [`hook:${hook}`, `callback:${callback.id}`]);
        } else {
          let stack = callback.stack && typeof callback.stack.split === 'function' && callback.stack.split('\n');
          stack = stack && stack[2] && (stack[2].match(/\(.+\)/) || [])[0];
          console.log(String(currentTime), hook, callback.id, stack);
        }
      }
    }

    return typeof callbackResult === 'undefined' ? result : callbackResult;
  }, item);

  if (Meteor.isServer) {
    rocketchatHooksEnd();
  }

  if (RocketChat.callbacks.showTotalTime === true) {
    if (Meteor.isServer) {
      RocketChat.statsTracker.timing('callbacks.totalTime', totalTime, [`hook:${hook}`]);
    } else {
      console.log(`${hook}:`, totalTime);
    }
  }

  return result;
};
/*
* Successively run all of a hook's callbacks on an item, in async mode (only works on server)
* @param {String} hook - The name of the hook
* @param {Object} item - The post, comment, modifier, etc. on which to run the callbacks
* @param {Object} [constant] - An optional constant that will be passed along to each callback
*/


RocketChat.callbacks.runAsync = function (hook, item, constant) {
  const callbacks = RocketChat.callbacks[hook];

  if (Meteor.isServer && callbacks && callbacks.length) {
    Meteor.defer(function () {
      callbacks.forEach(callback => callback(item, constant));
    });
  }

  return item;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"fileUploadRestrictions.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/fileUploadRestrictions.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.fileUploadMediaWhiteList = function () {
  const mediaTypeWhiteList = RocketChat.settings.get('FileUpload_MediaTypeWhiteList');

  if (!mediaTypeWhiteList || mediaTypeWhiteList === '*') {
    return;
  }

  return _.map(mediaTypeWhiteList.split(','), function (item) {
    return item.trim();
  });
};

RocketChat.fileUploadIsValidContentType = function (type) {
  const list = RocketChat.fileUploadMediaWhiteList();

  if (!list) {
    return true;
  }

  if (!type) {
    return false;
  }

  if (_.contains(list, type)) {
    return true;
  } else {
    const wildCardGlob = '/*';

    const wildcards = _.filter(list, function (item) {
      return item.indexOf(wildCardGlob) > 0;
    });

    if (_.contains(wildcards, type.replace(/(\/.*)$/, wildCardGlob))) {
      return true;
    }
  }

  return false;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getAvatarColor.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/getAvatarColor.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const colors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'];

RocketChat.getAvatarColor = function (name) {
  return colors[name.length % colors.length];
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getDefaultSubscriptionPref.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/getDefaultSubscriptionPref.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.getDefaultSubscriptionPref = function _getDefaultSubscriptionPref(userPref) {
  const subscription = {};
  const {
    desktopNotifications,
    mobileNotifications,
    emailNotificationMode,
    highlights
  } = userPref.settings && userPref.settings.preferences || {};

  if (Array.isArray(highlights) && highlights.length) {
    subscription.userHighlights = highlights;
  }

  if (desktopNotifications && desktopNotifications !== 'default') {
    subscription.desktopNotifications = desktopNotifications;
    subscription.desktopPrefOrigin = 'user';
  }

  if (mobileNotifications && mobileNotifications !== 'default') {
    subscription.mobilePushNotifications = mobileNotifications;
    subscription.mobilePrefOrigin = 'user';
  }

  if (emailNotificationMode && emailNotificationMode !== 'default') {
    subscription.emailNotifications = emailNotificationMode;
    subscription.emailPrefOrigin = 'user';
  }

  return subscription;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getValidRoomName.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/getValidRoomName.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat.getValidRoomName = function getValidRoomName(displayName, rid = '') {
  let slugifiedName = displayName;

  if (RocketChat.settings.get('UI_Allow_room_names_with_special_chars')) {
    const room = RocketChat.models.Rooms.findOneByDisplayName(displayName);

    if (room && room._id !== rid) {
      if (room.archived) {
        throw new Meteor.Error('error-archived-duplicate-name', `There's an archived channel with name ${displayName}`, {
          function: 'RocketChat.getValidRoomName',
          channel_name: displayName
        });
      } else {
        throw new Meteor.Error('error-duplicate-channel-name', `A channel with name '${displayName}' exists`, {
          function: 'RocketChat.getValidRoomName',
          channel_name: displayName
        });
      }
    }

    slugifiedName = s.slugify(displayName);
  }

  let nameValidation;

  try {
    nameValidation = new RegExp(`^${RocketChat.settings.get('UTF8_Names_Validation')}$`);
  } catch (error) {
    nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
  }

  if (!nameValidation.test(slugifiedName)) {
    throw new Meteor.Error('error-invalid-room-name', `${slugifiedName} is not a valid room name.`, {
      'function': 'RocketChat.getValidRoomName',
      channel_name: slugifiedName
    });
  }

  const room = RocketChat.models.Rooms.findOneByName(slugifiedName);

  if (room && room._id !== rid) {
    if (RocketChat.settings.get('UI_Allow_room_names_with_special_chars')) {
      let tmpName = slugifiedName;
      let next = 0;

      while (RocketChat.models.Rooms.findOneByNameAndNotId(tmpName, rid)) {
        tmpName = `${slugifiedName}-${++next}`;
      }

      slugifiedName = tmpName;
    } else if (room.archived) {
      throw new Meteor.Error('error-archived-duplicate-name', `There's an archived channel with name ${slugifiedName}`, {
        function: 'RocketChat.getValidRoomName',
        channel_name: slugifiedName
      });
    } else {
      throw new Meteor.Error('error-duplicate-channel-name', `A channel with name '${slugifiedName}' exists`, {
        function: 'RocketChat.getValidRoomName',
        channel_name: slugifiedName
      });
    }
  }

  return slugifiedName;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"placeholders.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/placeholders.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
RocketChat.placeholders = {};

RocketChat.placeholders.replace = function (str, data) {
  if (!str) {
    return '';
  }

  str = str.replace(/\[Site_Name\]/g, RocketChat.settings.get('Site_Name') || '');
  str = str.replace(/\[Site_URL\]/g, RocketChat.settings.get('Site_Url') || '');

  if (data) {
    str = str.replace(/\[name\]/g, data.name || '');
    str = str.replace(/\[fname\]/g, s.strLeft(data.name, ' ') || '');
    str = str.replace(/\[lname\]/g, s.strRightBack(data.name, ' ') || '');
    str = str.replace(/\[email\]/g, data.email || '');
    str = str.replace(/\[password\]/g, data.password || '');
    str = str.replace(/\[reason\]/g, data.reason || '');
    str = str.replace(/\[User\]/g, data.user || '');
    str = str.replace(/\[Room\]/g, data.room || '');

    if (data.unsubscribe) {
      str = str.replace(/\[unsubscribe\]/g, data.unsubscribe);
    }
  }

  str = str.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br>' + '$2');
  return str;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"promises.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/promises.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/*
* Callback hooks provide an easy way to add extra steps to common operations.
* @namespace RocketChat.promises
*/
RocketChat.promises = {};
/*
* Callback priorities
*/

RocketChat.promises.priority = {
  HIGH: -1000,
  MEDIUM: 0,
  LOW: 1000
};

const getHook = hookName => RocketChat.promises[hookName] || [];
/*
* Add a callback function to a hook
* @param {String} hook - The name of the hook
* @param {Function} callback - The callback function
*/


RocketChat.promises.add = function (hook, callback, p = RocketChat.promises.priority.MEDIUM, id) {
  callback.priority = _.isNumber(p) ? p : RocketChat.promises.priority.MEDIUM;
  callback.id = id || Random.id();
  RocketChat.promises[hook] = getHook(hook);

  if (RocketChat.promises[hook].find(cb => cb.id === callback.id)) {
    return;
  }

  RocketChat.promises[hook].push(callback);
  RocketChat.promises[hook] = _.sortBy(RocketChat.promises[hook], callback => callback.priority || RocketChat.promises.priority.MEDIUM);
};
/*
* Remove a callback from a hook
* @param {string} hook - The name of the hook
* @param {string} id - The callback's id
*/


RocketChat.promises.remove = function (hook, id) {
  RocketChat.promises[hook] = getHook(hook).filter(callback => callback.id !== id);
};
/*
* Successively run all of a hook's callbacks on an item
* @param {String} hook - The name of the hook
* @param {Object} item - The post, comment, modifier, etc. on which to run the callbacks
* @param {Object} [constant] - An optional constant that will be passed along to each callback
* @returns {Object} Returns the item after it's been through all the callbacks for this hook
*/


RocketChat.promises.run = function (hook, item, constant) {
  const callbacks = RocketChat.promises[hook];

  if (callbacks == null || callbacks.length === 0) {
    return Promise.resolve(item);
  }

  return callbacks.reduce((previousPromise, callback) => previousPromise.then(result => callback(result, constant)), Promise.resolve(item));
};
/*
* Successively run all of a hook's callbacks on an item, in async mode (only works on server)
* @param {String} hook - The name of the hook
* @param {Object} item - The post, comment, modifier, etc. on which to run the callbacks
* @param {Object} [constant] - An optional constant that will be passed along to each callback
*/


RocketChat.promises.runAsync = function (hook, item, constant) {
  const callbacks = RocketChat.promises[hook];

  if (!Meteor.isServer || callbacks == null || callbacks.length === 0) {
    return item;
  }

  Meteor.defer(() => callbacks.forEach(callback => callback(item, constant)));
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"RoomTypesCommon.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/RoomTypesCommon.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  RoomTypesCommon: () => RoomTypesCommon
});
let RoomTypeConfig;
module.watch(require("./RoomTypeConfig"), {
  RoomTypeConfig(v) {
    RoomTypeConfig = v;
  }

}, 0);

class RoomTypesCommon {
  constructor() {
    this.roomTypes = {};
    this.roomTypesOrder = [];
    this.mainOrder = 1;
  }
  /**
   * Adds a room type to the application.
   *
   * @param {RoomTypeConfig} roomConfig
   * @returns {void}
   */


  add(roomConfig) {
    if (!(roomConfig instanceof RoomTypeConfig)) {
      throw new Error('Invalid Room Configuration object, it must extend "RoomTypeConfig"');
    }

    if (this.roomTypes[roomConfig.identifier]) {
      return false;
    }

    if (!roomConfig.order) {
      roomConfig.order = this.mainOrder + 10;
      this.mainOrder += 10;
    }

    this.roomTypesOrder.push({
      identifier: roomConfig.identifier,
      order: roomConfig.order
    });
    this.roomTypes[roomConfig.identifier] = roomConfig;

    if (roomConfig.route && roomConfig.route.path && roomConfig.route.name && roomConfig.route.action) {
      const routeConfig = {
        name: roomConfig.route.name,
        action: roomConfig.route.action
      };

      if (Meteor.isClient) {
        routeConfig.triggersExit = [roomExit];
      }

      return FlowRouter.route(roomConfig.route.path, routeConfig);
    }
  }

  hasCustomLink(roomType) {
    return this.roomTypes[roomType] && this.roomTypes[roomType].route && this.roomTypes[roomType].route.link != null;
  }
  /**
   * @param {string} roomType room type (e.g.: c (for channels), d (for direct channels))
   * @param {object} subData the user's subscription data
   */


  getRouteLink(roomType, subData) {
    if (!this.roomTypes[roomType]) {
      return false;
    }

    let routeData = {};

    if (this.roomTypes[roomType] && this.roomTypes[roomType].route && this.roomTypes[roomType].route.link) {
      routeData = this.roomTypes[roomType].route.link(subData);
    } else if (subData && subData.name) {
      routeData = {
        name: subData.name
      };
    }

    return FlowRouter.path(this.roomTypes[roomType].route.name, routeData);
  }

  openRouteLink(roomType, subData, queryParams) {
    if (!this.roomTypes[roomType]) {
      return false;
    }

    let routeData = {};

    if (this.roomTypes[roomType] && this.roomTypes[roomType].route && this.roomTypes[roomType].route.link) {
      routeData = this.roomTypes[roomType].route.link(subData);
    } else if (subData && subData.name) {
      routeData = {
        name: subData.name
      };
    }

    return FlowRouter.go(this.roomTypes[roomType].route.name, routeData, queryParams);
  }
  /**
   * @param {string} roomType room type (e.g.: c (for channels), d (for direct channels))
   * @param {RoomTypeConfig} roomConfig room's type configuration
   */


  getConfig(roomType) {
    return this.roomTypes[roomType];
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"slashCommand.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/slashCommand.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.slashCommands = {
  commands: {}
};

RocketChat.slashCommands.add = function _addingSlashCommand(command, callback, options = {}, result, providesPreview = false, previewer, previewCallback) {
  RocketChat.slashCommands.commands[command] = {
    command,
    callback,
    params: options.params,
    description: options.description,
    permission: options.permission,
    clientOnly: options.clientOnly || false,
    result,
    providesPreview,
    previewer,
    previewCallback
  };
};

RocketChat.slashCommands.run = function _runningSlashCommand(command, params, message) {
  if (RocketChat.slashCommands.commands[command] && typeof RocketChat.slashCommands.commands[command].callback === 'function') {
    if (!message || !message.rid) {
      throw new Meteor.Error('invalid-command-usage', 'Executing a command requires at least a message with a room id.');
    }

    return RocketChat.slashCommands.commands[command].callback(command, params, message);
  }
};

RocketChat.slashCommands.getPreviews = function _gettingSlashCommandPreviews(command, params, message) {
  if (RocketChat.slashCommands.commands[command] && typeof RocketChat.slashCommands.commands[command].previewer === 'function') {
    if (!message || !message.rid) {
      throw new Meteor.Error('invalid-command-usage', 'Executing a command requires at least a message with a room id.');
    } // { i18nTitle, items: [{ id, type, value }] }


    const previewInfo = RocketChat.slashCommands.commands[command].previewer(command, params, message);

    if (typeof previewInfo !== 'object' || !Array.isArray(previewInfo.items) || previewInfo.items.length === 0) {
      return;
    } // A limit of ten results, to save time and bandwidth


    if (previewInfo.items.length >= 10) {
      previewInfo.items = previewInfo.items.slice(0, 10);
    }

    return previewInfo;
  }
};

RocketChat.slashCommands.executePreview = function _executeSlashCommandPreview(command, params, message, preview) {
  if (RocketChat.slashCommands.commands[command] && typeof RocketChat.slashCommands.commands[command].previewCallback === 'function') {
    if (!message || !message.rid) {
      throw new Meteor.Error('invalid-command-usage', 'Executing a command requires at least a message with a room id.');
    } // { id, type, value }


    if (!preview.id || !preview.type || !preview.value) {
      throw new Meteor.Error('error-invalid-preview', 'Preview Item must have an id, type, and value.');
    }

    return RocketChat.slashCommands.commands[command].previewCallback(command, params, message, preview);
  }
};

Meteor.methods({
  slashCommand(command) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'slashCommand'
      });
    }

    if (!command || !command.cmd || !RocketChat.slashCommands.commands[command.cmd]) {
      throw new Meteor.Error('error-invalid-command', 'Invalid Command Provided', {
        method: 'executeSlashCommandPreview'
      });
    }

    return RocketChat.slashCommands.run(command.cmd, command.params, command.msg);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Message.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/Message.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
RocketChat.Message = {
  parse(msg, language) {
    const messageType = RocketChat.MessageTypes.getType(msg);

    if (messageType) {
      if (messageType.render) {
        return messageType.render(msg);
      } else if (messageType.template) {
        // Render message
        return;
      } else if (messageType.message) {
        if (!language && typeof localStorage !== 'undefined') {
          language = localStorage.getItem('userLanguage');
        }

        const data = typeof messageType.data === 'function' && messageType.data(msg) || {};
        return TAPi18n.__(messageType.message, data, language);
      }
    }

    if (msg.u && msg.u.username === RocketChat.settings.get('Chatops_Username')) {
      msg.html = msg.msg;
      return msg.html;
    }

    msg.html = msg.msg;

    if (s.trim(msg.html) !== '') {
      msg.html = s.escapeHTML(msg.html);
    }

    msg.html = msg.html.replace(/\n/gm, '<br/>');
    return msg.html;
  }

};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"MessageProperties.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/MessageProperties.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  messageProperties: () => messageProperties
});
let GraphemeSplitter;
module.watch(require("grapheme-splitter"), {
  default(v) {
    GraphemeSplitter = v;
  }

}, 0);
const splitter = new GraphemeSplitter();
const messageProperties = {
  length: message => {
    return splitter.countGraphemes(message);
  },
  messageWithoutEmojiShortnames: message => {
    return message.replace(/:\w+:/gm, match => {
      if (RocketChat.emoji.list[match] !== undefined) {
        return ' ';
      }

      return match;
    });
  }
};

// check for tests
if (typeof RocketChat !== 'undefined') {
  RocketChat.messageProperties = messageProperties;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"messageBox.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/messageBox.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

RocketChat.messageBox = {};
RocketChat.messageBox.actions = new class {
  constructor() {
    this.actions = {};
  }
  /* Add a action to messagebox
  @param group
  @param label
  @param config
  icon: icon class
  action: action function
  condition: condition to display the action
  */


  add(group, label, config) {
    if (!group && !label && !config) {
      return;
    }

    if (!this.actions[group]) {
      this.actions[group] = [];
    }

    const actionExists = this.actions[group].find(action => {
      return action.label === label;
    });

    if (actionExists) {
      return;
    }

    this.actions[group].push((0, _objectSpread2.default)({}, config, {
      label
    }));
  }

  get(group) {
    if (!group) {
      return Object.keys(this.actions).reduce((ret, key) => {
        const actions = this.actions[key].filter(action => !action.condition || action.condition());

        if (actions.length) {
          ret[key] = actions;
        }

        return ret;
      }, {});
    }

    return this.actions[group].filter(action => !action.condition || action.condition());
  }

  getById(id) {
    const messageActions = this.actions;
    let actions = [];
    Object.keys(messageActions).forEach(function (action) {
      actions = actions.concat(messageActions[action]);
    });
    return actions.filter(action => action.id === id);
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"MessageTypes.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/MessageTypes.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.MessageTypes = new class {
  constructor() {
    this.types = {};
  }

  registerType(options) {
    return this.types[options.id] = options;
  }

  getType(message) {
    return this.types[message && message.t];
  }

  isSystemMessage(message) {
    const type = this.types[message && message.t];
    return type && type.system;
  }

}();
Meteor.startup(function () {
  RocketChat.MessageTypes.registerType({
    id: 'r',
    system: true,
    message: 'Room_name_changed',

    data(message) {
      return {
        room_name: message.msg,
        user_by: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'au',
    system: true,
    message: 'User_added_by',

    data(message) {
      return {
        user_added: message.msg,
        user_by: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'ru',
    system: true,
    message: 'User_removed_by',

    data(message) {
      return {
        user_removed: message.msg,
        user_by: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'ul',
    system: true,
    message: 'User_left',

    data(message) {
      return {
        user_left: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'uj',
    system: true,
    message: 'User_joined_channel',

    data(message) {
      return {
        user: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'wm',
    system: true,
    message: 'Welcome',

    data(message) {
      return {
        user: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'rm',
    system: true,
    message: 'Message_removed',

    data(message) {
      return {
        user: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'rtc',

    render(message) {
      return RocketChat.callbacks.run('renderRtcMessage', message);
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'user-muted',
    system: true,
    message: 'User_muted_by',

    data(message) {
      return {
        user_muted: message.msg,
        user_by: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'user-unmuted',
    system: true,
    message: 'User_unmuted_by',

    data(message) {
      return {
        user_unmuted: message.msg,
        user_by: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'subscription-role-added',
    system: true,
    message: '__username__was_set__role__by__user_by_',

    data(message) {
      return {
        username: message.msg,
        role: message.role,
        user_by: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'subscription-role-removed',
    system: true,
    message: '__username__is_no_longer__role__defined_by__user_by_',

    data(message) {
      return {
        username: message.msg,
        role: message.role,
        user_by: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'room-archived',
    system: true,
    message: 'This_room_has_been_archived_by__username_',

    data(message) {
      return {
        username: message.u.username
      };
    }

  });
  RocketChat.MessageTypes.registerType({
    id: 'room-unarchived',
    system: true,
    message: 'This_room_has_been_unarchived_by__username_',

    data(message) {
      return {
        username: message.u.username
      };
    }

  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"templateVarHandler.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/templateVarHandler.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let logger;

if (Meteor.isServer) {
  logger = new Logger('TemplateVarHandler', {});
}

RocketChat.templateVarHandler = function (variable, object) {
  const templateRegex = /#{([\w\-]+)}/gi;
  let match = templateRegex.exec(variable);
  let tmpVariable = variable;

  if (match == null) {
    if (!object.hasOwnProperty(variable)) {
      logger && logger.debug(`user does not have attribute: ${variable}`);
      return;
    }

    return object[variable];
  } else {
    logger && logger.debug('template found. replacing values');

    while (match != null) {
      const tmplVar = match[0];
      const tmplAttrName = match[1];

      if (!object.hasOwnProperty(tmplAttrName)) {
        logger && logger.debug(`user does not have attribute: ${tmplAttrName}`);
        return;
      }

      const attrVal = object[tmplAttrName];
      logger && logger.debug(`replacing template var: ${tmplVar} with value: ${attrVal}`);
      tmpVariable = tmpVariable.replace(tmplVar, attrVal);
      match = templateRegex.exec(variable);
    }

    return tmpVariable;
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUserNotificationPreference.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/getUserNotificationPreference.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.getUserNotificationPreference = function _getUserNotificationPreference(user, pref) {
  if (typeof user === 'string') {
    user = RocketChat.models.Users.findOneById(user);
  }

  let preferenceKey;

  switch (pref) {
    case 'desktop':
      preferenceKey = 'desktopNotifications';
      break;

    case 'mobile':
      preferenceKey = 'mobileNotifications';
      break;

    case 'email':
      preferenceKey = 'emailNotificationMode';
      break;
  }

  if (user && user.settings && user.settings.preferences && user.settings.preferences[preferenceKey] !== 'default') {
    return {
      value: user.settings.preferences[preferenceKey],
      origin: 'user'
    };
  }

  const serverValue = RocketChat.settings.get(`Accounts_Default_User_Preferences_${preferenceKey}`);

  if (serverValue) {
    return {
      value: serverValue,
      origin: 'server'
    };
  }

  return null;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUserPreference.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/getUserPreference.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Tries to retrieve the user preference falling back to a default system
 * value or to a default value if it is passed as argument
*/
RocketChat.getUserPreference = function (user, key, defaultValue = undefined) {
  let preference;

  if (typeof user === typeof '') {
    user = RocketChat.models.Users.findOne(user, {
      fields: {
        [`settings.preferences.${key}`]: 1
      }
    });
  }

  if (user && user.settings && user.settings.preferences && user.settings.preferences.hasOwnProperty(key)) {
    preference = user.settings.preferences[key];
  } else if (defaultValue === undefined) {
    preference = RocketChat.settings.get(`Accounts_Default_User_Preferences_${key}`);
  }

  return preference !== undefined ? preference : defaultValue;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"startup":{"settingsOnLoadSiteUrl.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/lib/startup/settingsOnLoadSiteUrl.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals WebAppInternals */
RocketChat.settings.get('Site_Url', function (key, value) {
  if (value == null || value.trim() === '') {
    return;
  }

  let host = value.replace(/\/$/, ''); // let prefix = '';

  const match = value.match(/([^\/]+\/{2}[^\/]+)(\/.+)/);

  if (match != null) {
    host = match[1]; // prefix = match[2].replace(/\/$/, '');
  }

  __meteor_runtime_config__.ROOT_URL = value;

  if (Meteor.absoluteUrl.defaultOptions && Meteor.absoluteUrl.defaultOptions.rootUrl) {
    Meteor.absoluteUrl.defaultOptions.rootUrl = value;
  }

  if (Meteor.isServer) {
    RocketChat.hostname = host.replace(/^https?:\/\//, '');
    process.env.MOBILE_ROOT_URL = host;
    process.env.MOBILE_DDP_URL = host;

    if (typeof WebAppInternals !== 'undefined' && WebAppInternals.generateBoilerplate) {
      return WebAppInternals.generateBoilerplate();
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"lib":{"debug.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/debug.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const logger = new Logger('Meteor', {
  methods: {
    method: {
      type: 'debug'
    },
    publish: {
      type: 'debug'
    }
  }
});
let Log_Trace_Methods;
let Log_Trace_Subscriptions;
RocketChat.settings.get('Log_Trace_Methods', (key, value) => Log_Trace_Methods = value);
RocketChat.settings.get('Log_Trace_Subscriptions', (key, value) => Log_Trace_Subscriptions = value);
let Log_Trace_Methods_Filter;
let Log_Trace_Subscriptions_Filter;
RocketChat.settings.get('Log_Trace_Methods_Filter', (key, value) => Log_Trace_Methods_Filter = value ? new RegExp(value) : undefined);
RocketChat.settings.get('Log_Trace_Subscriptions_Filter', (key, value) => Log_Trace_Subscriptions_Filter = value ? new RegExp(value) : undefined);

const traceConnection = (enable, filter, prefix, name, connection, userId) => {
  if (!enable) {
    return;
  }

  if (filter && !filter.test(name)) {
    return;
  }

  if (connection) {
    console.log(name, {
      id: connection.id,
      clientAddress: connection.clientAddress,
      httpHeaders: connection.httpHeaders,
      userId
    });
  } else {
    console.log(name, 'no-connection');
  }
};

const wrapMethods = function (name, originalHandler, methodsMap) {
  methodsMap[name] = function () {
    traceConnection(Log_Trace_Methods, Log_Trace_Methods_Filter, 'method', name, this.connection, this.userId);
    const end = RocketChat.metrics.meteorMethods.startTimer({
      method: name,
      has_connection: this.connection != null,
      has_user: this.userId != null
    });
    const args = name === 'ufsWrite' ? Array.prototype.slice.call(arguments, 1) : arguments;
    logger.method(name, '-> userId:', Meteor.userId(), ', arguments: ', args);
    this.unblock();
    const result = originalHandler.apply(this, arguments);
    end();
    return result;
  };
};

const originalMeteorMethods = Meteor.methods;

Meteor.methods = function (methodMap) {
  _.each(methodMap, function (handler, name) {
    wrapMethods(name, handler, methodMap);
  });

  originalMeteorMethods(methodMap);
};

const originalMeteorPublish = Meteor.publish;

Meteor.publish = function (name, func) {
  return originalMeteorPublish(name, function () {
    traceConnection(Log_Trace_Subscriptions, Log_Trace_Subscriptions_Filter, 'subscription', name, this.connection, this.userId);
    logger.publish(name, '-> userId:', this.userId, ', arguments: ', arguments);
    const end = RocketChat.metrics.meteorSubscriptions.startTimer({
      subscription: name
    });
    const originalReady = this.ready;

    this.ready = function () {
      end();
      return originalReady.apply(this, arguments);
    };

    return func.apply(this, arguments);
  });
};

WebApp.rawConnectHandlers.use(function (req, res, next) {
  res.setHeader('X-Instance-ID', InstanceStatus.id());
  return next();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"bugsnag.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/bugsnag.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let bugsnag;
module.watch(require("bugsnag"), {
  default(v) {
    bugsnag = v;
  }

}, 0);
RocketChat.bugsnag = bugsnag;
RocketChat.settings.get('Bugsnag_api_key', (key, value) => {
  if (value) {
    bugsnag.register(value);
  }
});

const notify = function (message, stack) {
  if (typeof stack === 'string') {
    message += ` ${stack}`;
  }

  let options = {};

  if (RocketChat.Info) {
    options = {
      app: {
        version: RocketChat.Info.version,
        info: RocketChat.Info
      }
    };
  }

  const error = new Error(message);
  error.stack = stack;
  RocketChat.bugsnag.notify(error, options);
};

process.on('uncaughtException', Meteor.bindEnvironment(error => {
  notify(error.message, error.stack);
  throw error;
}));
const originalMeteorDebug = Meteor._debug;

Meteor._debug = function () {
  notify(...arguments);
  return originalMeteorDebug(...arguments);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"metrics.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/metrics.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let client;
module.watch(require("prom-client"), {
  default(v) {
    client = v;
  }

}, 0);
let connect;
module.watch(require("connect"), {
  default(v) {
    connect = v;
  }

}, 1);
let http;
module.watch(require("http"), {
  default(v) {
    http = v;
  }

}, 2);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 3);
RocketChat.promclient = client;
client.collectDefaultMetrics();
RocketChat.metrics = {}; // one sample metrics only - a counter

RocketChat.metrics.meteorMethods = new client.Summary({
  name: 'rocketchat_meteor_methods',
  help: 'summary of meteor methods count and time',
  labelNames: ['method', 'has_connection', 'has_user']
});
RocketChat.metrics.rocketchatCallbacks = new client.Summary({
  name: 'rocketchat_callbacks',
  help: 'summary of rocketchat callbacks count and time',
  labelNames: ['hook', 'callback']
});
RocketChat.metrics.rocketchatHooks = new client.Summary({
  name: 'rocketchat_hooks',
  help: 'summary of rocketchat hooks count and time',
  labelNames: ['hook', 'callbacks_length']
});
RocketChat.metrics.rocketchatRestApi = new client.Summary({
  name: 'rocketchat_rest_api',
  help: 'summary of rocketchat rest api count and time',
  labelNames: ['method', 'entrypoint', 'user_agent', 'status', 'version']
});
RocketChat.metrics.meteorSubscriptions = new client.Summary({
  name: 'rocketchat_meteor_subscriptions',
  help: 'summary of meteor subscriptions count and time',
  labelNames: ['subscription']
});
RocketChat.metrics.messagesSent = new client.Counter({
  'name': 'rocketchat_message_sent',
  'help': 'cumulated number of messages sent'
});
RocketChat.metrics.notificationsSent = new client.Counter({
  'name': 'rocketchat_notification_sent',
  labelNames: ['notification_type'],
  'help': 'cumulated number of notifications sent'
});
RocketChat.metrics.ddpSessions = new client.Gauge({
  'name': 'rocketchat_ddp_sessions_count',
  'help': 'number of open ddp sessions'
});
RocketChat.metrics.ddpAthenticatedSessions = new client.Gauge({
  'name': 'rocketchat_ddp_sessions_auth',
  'help': 'number of authenticated open ddp sessions'
});
RocketChat.metrics.ddpConnectedUsers = new client.Gauge({
  'name': 'rocketchat_ddp_connected_users',
  'help': 'number of unique connected users'
});
RocketChat.metrics.version = new client.Gauge({
  'name': 'rocketchat_version',
  labelNames: ['version'],
  'help': 'Rocket.Chat version'
});
RocketChat.metrics.migration = new client.Gauge({
  'name': 'rocketchat_migration',
  'help': 'migration versoin'
});
RocketChat.metrics.instanceCount = new client.Gauge({
  'name': 'rocketchat_instance_count',
  'help': 'instances running'
});
RocketChat.metrics.oplogEnabled = new client.Gauge({
  'name': 'rocketchat_oplog_enabled',
  labelNames: ['enabled'],
  'help': 'oplog enabled'
}); // User statistics

RocketChat.metrics.totalUsers = new client.Gauge({
  'name': 'rocketchat_users_total',
  'help': 'total of users'
});
RocketChat.metrics.activeUsers = new client.Gauge({
  'name': 'rocketchat_users_active',
  'help': 'total of active users'
});
RocketChat.metrics.nonActiveUsers = new client.Gauge({
  'name': 'rocketchat_users_non_active',
  'help': 'total of non active users'
});
RocketChat.metrics.onlineUsers = new client.Gauge({
  'name': 'rocketchat_users_online',
  'help': 'total of users online'
});
RocketChat.metrics.awayUsers = new client.Gauge({
  'name': 'rocketchat_users_away',
  'help': 'total of users away'
});
RocketChat.metrics.offlineUsers = new client.Gauge({
  'name': 'rocketchat_users_offline',
  'help': 'total of users offline'
}); // Room statistics

RocketChat.metrics.totalRooms = new client.Gauge({
  'name': 'rocketchat_rooms_total',
  'help': 'total of rooms'
});
RocketChat.metrics.totalChannels = new client.Gauge({
  'name': 'rocketchat_channels_total',
  'help': 'total of public rooms/channels'
});
RocketChat.metrics.totalPrivateGroups = new client.Gauge({
  'name': 'rocketchat_private_groups_total',
  'help': 'total of private rooms'
});
RocketChat.metrics.totalDirect = new client.Gauge({
  'name': 'rocketchat_direct_total',
  'help': 'total of direct rooms'
});
RocketChat.metrics.totalLivechat = new client.Gauge({
  'name': 'rocketchat_livechat_total',
  'help': 'total of livechat rooms'
}); // Message statistics

RocketChat.metrics.totalMessages = new client.Gauge({
  'name': 'rocketchat_messages_total',
  'help': 'total of messages'
});
RocketChat.metrics.totalChannelMessages = new client.Gauge({
  'name': 'rocketchat_channel_messages_total',
  'help': 'total of messages in public rooms'
});
RocketChat.metrics.totalPrivateGroupMessages = new client.Gauge({
  'name': 'rocketchat_private_group_messages_total',
  'help': 'total of messages in private rooms'
});
RocketChat.metrics.totalDirectMessages = new client.Gauge({
  'name': 'rocketchat_direct_messages_total',
  'help': 'total of messages in direct rooms'
});
RocketChat.metrics.totalLivechatMessages = new client.Gauge({
  'name': 'rocketchat_livechat_messages_total',
  'help': 'total of messages in livechat rooms'
});
client.register.setDefaultLabels({
  uniqueId: RocketChat.settings.get('uniqueID'),
  siteUrl: RocketChat.settings.get('Site_Url')
});

const setPrometheusData = () => {
  const date = new Date();
  client.register.setDefaultLabels({
    unique_id: RocketChat.settings.get('uniqueID'),
    site_url: RocketChat.settings.get('Site_Url'),
    version: RocketChat.Info.version
  });
  const sessions = Object.values(Meteor.server.sessions);
  const authenticatedSessions = sessions.filter(s => s.userId);
  RocketChat.metrics.ddpSessions.set(sessions.length, date);
  RocketChat.metrics.ddpAthenticatedSessions.set(authenticatedSessions.length, date);
  RocketChat.metrics.ddpConnectedUsers.set(_.unique(authenticatedSessions.map(s => s.userId)).length, date);

  if (!RocketChat.models.Statistics) {
    return;
  }

  const statistics = RocketChat.models.Statistics.findLast();

  if (!statistics) {
    return;
  }

  RocketChat.metrics.version.set({
    version: statistics.version
  }, 1, date);
  RocketChat.metrics.migration.set(RocketChat.Migrations._getControl().version, date);
  RocketChat.metrics.instanceCount.set(statistics.instanceCount, date);
  RocketChat.metrics.oplogEnabled.set({
    enabled: statistics.oplogEnabled
  }, 1, date); // User statistics

  RocketChat.metrics.totalUsers.set(statistics.totalUsers, date);
  RocketChat.metrics.activeUsers.set(statistics.activeUsers, date);
  RocketChat.metrics.nonActiveUsers.set(statistics.nonActiveUsers, date);
  RocketChat.metrics.onlineUsers.set(statistics.onlineUsers, date);
  RocketChat.metrics.awayUsers.set(statistics.awayUsers, date);
  RocketChat.metrics.offlineUsers.set(statistics.offlineUsers, date); // Room statistics

  RocketChat.metrics.totalRooms.set(statistics.totalRooms, date);
  RocketChat.metrics.totalChannels.set(statistics.totalChannels, date);
  RocketChat.metrics.totalPrivateGroups.set(statistics.totalPrivateGroups, date);
  RocketChat.metrics.totalDirect.set(statistics.totalDirect, date);
  RocketChat.metrics.totalLivechat.set(statistics.totalLivechat, date); // Message statistics

  RocketChat.metrics.totalMessages.set(statistics.totalMessages, date);
  RocketChat.metrics.totalChannelMessages.set(statistics.totalChannelMessages, date);
  RocketChat.metrics.totalPrivateGroupMessages.set(statistics.totalPrivateGroupMessages, date);
  RocketChat.metrics.totalDirectMessages.set(statistics.totalDirectMessages, date);
  RocketChat.metrics.totalLivechatMessages.set(statistics.totalLivechatMessages, date);
};

const app = connect(); // const compression = require('compression');
// app.use(compression());

app.use('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.end(RocketChat.promclient.register.metrics());
});
const server = http.createServer(app);
let timer;

const updatePrometheusConfig = () => {
  const port = RocketChat.settings.get('Prometheus_Port');
  const enabled = RocketChat.settings.get('Prometheus_Enabled');

  if (port == null || enabled == null) {
    return;
  }

  if (enabled === true) {
    server.listen({
      port,
      host: process.env.BIND_IP || '0.0.0.0'
    });
    timer = Meteor.setInterval(setPrometheusData, 5000);
  } else {
    server.close();
    Meteor.clearInterval(timer);
  }
};

RocketChat.settings.get('Prometheus_Enabled', updatePrometheusConfig);
RocketChat.settings.get('Prometheus_Port', updatePrometheusConfig);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"RateLimiter.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/RateLimiter.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
RocketChat.RateLimiter = new class {
  limitFunction(fn, numRequests, timeInterval, matchers) {
    if (process.env.TEST_MODE === 'true') {
      return fn;
    }

    const rateLimiter = new RateLimiter();
    rateLimiter.addRule(matchers, numRequests, timeInterval);
    return function (...args) {
      const match = {};

      _.each(matchers, function (matcher, key) {
        return match[key] = args[key];
      });

      rateLimiter.increment(match);
      const rateLimitResult = rateLimiter.check(match);

      if (rateLimitResult.allowed) {
        return fn.apply(null, arguments);
      } else {
        throw new Meteor.Error('error-too-many-requests', `Error, too many requests. Please slow down. You must wait ${Math.ceil(rateLimitResult.timeToReset / 1000)} seconds before trying again.`, {
          timeToReset: rateLimitResult.timeToReset,
          seconds: Math.ceil(rateLimitResult.timeToReset / 1000)
        });
      }
    };
  }

  limitMethod(methodName, numRequests, timeInterval, matchers) {
    if (process.env.TEST_MODE === 'true') {
      return;
    }

    const match = {
      type: 'method',
      name: methodName
    };

    _.each(matchers, function (matcher, key) {
      return match[key] = matchers[key];
    });

    return DDPRateLimiter.addRule(match, numRequests, timeInterval);
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"configLogger.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/configLogger.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals LoggerManager */
RocketChat.settings.get('Log_Package', function (key, value) {
  return LoggerManager.showPackage = value;
});
RocketChat.settings.get('Log_File', function (key, value) {
  return LoggerManager.showFileAndLine = value;
});
RocketChat.settings.get('Log_Level', function (key, value) {
  if (value != null) {
    LoggerManager.logLevel = parseInt(value);
    Meteor.setTimeout(() => {
      return LoggerManager.enable(true);
    }, 200);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"PushNotification.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/PushNotification.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals Push */
class PushNotification {
  getNotificationId(roomId) {
    const serverId = RocketChat.settings.get('uniqueID');
    return this.hash(`${serverId}|${roomId}`); // hash
  }

  hash(str) {
    let hash = 0;
    let i = str.length;

    while (i) {
      hash = (hash << 5) - hash + str.charCodeAt(--i);
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash;
  }

  send({
    roomName,
    roomId,
    username,
    message,
    usersTo,
    payload,
    badge = 1,
    category
  }) {
    let title;

    if (roomName && roomName !== '') {
      title = `${roomName}`;
      message = `${username}: ${message}`;
    } else {
      title = `${username}`;
    }

    const icon = RocketChat.settings.get('Assets_favicon_192').url || RocketChat.settings.get('Assets_favicon_192').defaultUrl;
    const config = {
      from: 'push',
      badge,
      sound: 'default',
      title,
      text: message,
      payload,
      query: usersTo,
      notId: this.getNotificationId(roomId),
      gcm: {
        style: 'inbox',
        summaryText: '%n% new messages',
        image: RocketChat.getURL(icon, {
          full: true
        })
      }
    };

    if (category !== '') {
      config.apn = {
        category
      };
    }

    RocketChat.metrics.notificationsSent.inc({
      notification_type: 'mobile'
    });
    return Push.send(config);
  }

}

RocketChat.PushNotification = new PushNotification();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"defaultBlockedDomainsList.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/defaultBlockedDomainsList.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.emailDomainDefaultBlackList = ['0-mail.com', '0815.ru', '0815.su', '0clickemail.com', '0wnd.net', '0wnd.org', '10mail.org', '10minut.com.pl', '10minutemail.co.za', '10minutemail.com', '10minutemail.de', '123-m.com', '1chuan.com', '1fsdfdsfsdf.tk', '1pad.de', '1zhuan.com', '20email.eu', '20mail.eu', '20mail.it', '20minutemail.com', '21cn.com', '2fdgdfgdfgdf.tk', '2prong.com', '30minutemail.com', '33mail.com', '3d-painting.com', '3trtretgfrfe.tk', '4gfdsgfdgfd.tk', '4warding.com', '4warding.net', '4warding.org', '5ghgfhfghfgh.tk', '60minutemail.com', '675hosting.com', '675hosting.net', '675hosting.org', '6hjgjhgkilkj.tk', '6ip.us', '6paq.com', '6url.com', '75hosting.com', '75hosting.net', '75hosting.org', '7days-printing.com', '7tags.com', '99experts.com', '9ox.net', 'a-bc.net', 'a45.in', 'abcmail.email', 'abyssmail.com', 'acentri.com', 'advantimo.com', 'afrobacon.com', 'ag.us.to', 'agedmail.com', 'ahk.jp', 'ajaxapp.net', 'alivance.com', 'ama-trade.de', 'amail.com', 'amilegit.com', 'amiri.net', 'amiriindustries.com', 'anappthat.com', 'ano-mail.net', 'anonbox.net', 'anonmails.de', 'anonymail.dk', 'anonymbox.com', 'antichef.com', 'antichef.net', 'antireg.ru', 'antispam.de', 'antispammail.de', 'appixie.com', 'armyspy.com', 'artman-conception.com', 'aver.com', 'azmeil.tk', 'baxomale.ht.cx', 'beddly.com', 'beefmilk.com', 'bigprofessor.so', 'bigstring.com', 'binkmail.com', 'bio-muesli.net', 'blogmyway.org', 'bobmail.info', 'bofthew.com', 'bootybay.de', 'boun.cr', 'bouncr.com', 'boxformail.in', 'breakthru.com', 'brefmail.com', 'brennendesreich.de', 'broadbandninja.com', 'bsnow.net', 'bspamfree.org', 'bu.mintemail.com', 'buffemail.com', 'bugmenot.com', 'bumpymail.com', 'bund.us', 'bundes-li.ga', 'burnthespam.info', 'burstmail.info', 'buymoreplays.com', 'buyusedlibrarybooks.org', 'byom.de', 'c2.hu', 'cachedot.net', 'card.zp.ua', 'casualdx.com', 'cbair.com', 'cek.pm', 'cellurl.com', 'centermail.com', 'centermail.net', 'chammy.info', 'cheatmail.de', 'childsavetrust.org', 'chogmail.com', 'choicemail1.com', 'chong-mail.com', 'chong-mail.net', 'chong-mail.org', 'clixser.com', 'cmail.com', 'cmail.net', 'cmail.org', 'coldemail.info', 'consumerriot.com', 'cool.fr.nf', 'correo.blogos.net', 'cosmorph.com', 'courriel.fr.nf', 'courrieltemporaire.com', 'crapmail.org', 'crazymailing.com', 'cubiclink.com', 'curryworld.de', 'cust.in', 'cuvox.de', 'd3p.dk', 'dacoolest.com', 'daintly.com', 'dandikmail.com', 'dayrep.com', 'dbunker.com', 'dcemail.com', 'deadaddress.com', 'deadspam.com', 'deagot.com', 'dealja.com', 'delikkt.de', 'despam.it', 'despammed.com', 'devnullmail.com', 'dfgh.net', 'digitalsanctuary.com', 'dingbone.com', 'discard.email', 'discardmail.com', 'discardmail.de', 'disposableaddress.com', 'disposableemailaddresses.com', 'disposableemailaddresses.emailmiser.com', 'disposableinbox.com', 'dispose.it', 'disposeamail.com', 'disposemail.com', 'dispostable.com', 'dlemail.ru', 'dm.w3internet.co.uk', 'dm.w3internet.co.ukexample.com', 'dodgeit.com', 'dodgit.com', 'dodgit.org', 'doiea.com', 'domozmail.com', 'donemail.ru', 'dontreg.com', 'dontsendmespam.de', 'dotmsg.com', 'drdrb.com', 'drdrb.net', 'droplar.com', 'dropmail.me', 'dt.com', 'duam.net', 'dudmail.com', 'dump-email.info', 'dumpandjunk.com', 'dumpmail.de', 'dumpyemail.com', 'duskmail.com', 'e-mail.com', 'e-mail.org', 'e4ward.com', 'easytrashmail.com', 'einmalmail.de', 'einrot.com', 'einrot.de', 'eintagsmail.de', 'email60.com', 'emaildienst.de', 'emailgo.de', 'emailias.com', 'emailigo.de', 'emailinfive.com', 'emaillime.com', 'emailmiser.com', 'emailproxsy.com', 'emailsensei.com', 'emailtemporanea.com', 'emailtemporanea.net', 'emailtemporar.ro', 'emailtemporario.com.br', 'emailthe.net', 'emailtmp.com', 'emailto.de', 'emailwarden.com', 'emailx.at.hm', 'emailxfer.com', 'emeil.in', 'emeil.ir', 'emil.com', 'emz.net', 'enterto.com', 'ephemail.net', 'ero-tube.org', 'etranquil.com', 'etranquil.net', 'etranquil.org', 'evopo.com', 'explodemail.com', 'express.net.ua', 'eyepaste.com', 'fakeinbox.com', 'fakeinformation.com', 'fakemail.fr', 'fakemailz.com', 'fammix.com', 'fansworldwide.de', 'fantasymail.de', 'fastacura.com', 'fastchevy.com', 'fastchrysler.com', 'fastkawasaki.com', 'fastmazda.com', 'fastmitsubishi.com', 'fastnissan.com', 'fastsubaru.com', 'fastsuzuki.com', 'fasttoyota.com', 'fastyamaha.com', 'fatflap.com', 'fdfdsfds.com', 'fightallspam.com', 'figjs.com', 'fiifke.de', 'filzmail.com', 'fivemail.de', 'fixmail.tk', 'fizmail.com', 'fleckens.hu', 'flemail.ru', 'flyspam.com', 'footard.com', 'forgetmail.com', 'fr33mail.info', 'frapmail.com', 'freundin.ru', 'friendlymail.co.uk', 'front14.org', 'fuckingduh.com', 'fudgerub.com', 'fux0ringduh.com', 'fyii.de', 'garliclife.com', 'gehensiemirnichtaufdensack.de', 'gelitik.in', 'get1mail.com', 'get2mail.fr', 'getairmail.com', 'getmails.eu', 'getonemail.com', 'getonemail.net', 'ghosttexter.de', 'giantmail.de', 'girlsundertheinfluence.com', 'gishpuppy.com', 'gmial.com', 'goemailgo.com', 'gorillaswithdirtyarmpits.com', 'gotmail.com', 'gotmail.net', 'gotmail.org', 'gotti.otherinbox.com', 'gowikibooks.com', 'gowikicampus.com', 'gowikicars.com', 'gowikifilms.com', 'gowikigames.com', 'gowikimusic.com', 'gowikimusic.great-host.in', 'gowikinetwork.com', 'gowikitravel.com', 'gowikitv.com', 'grandmamail.com', 'grandmasmail.com', 'great-host.in', 'greensloth.com', 'grr.la', 'gsrv.co.uk', 'guerillamail.biz', 'guerillamail.com', 'guerillamail.net', 'guerillamail.org', 'guerrillamail.biz', 'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com', 'gustr.com', 'h.mintemail.com', 'h8s.org', 'hacccc.com', 'haltospam.com', 'harakirimail.com', 'hartbot.de', 'hat-geld.de', 'hatespam.org', 'hellodream.mobi', 'herp.in', 'hidemail.de', 'hidzz.com', 'hmamail.com', 'hochsitze.com', 'hopemail.biz', 'hotpop.com', 'hulapla.de', 'iaoss.com', 'ieatspam.eu', 'ieatspam.info', 'ieh-mail.de', 'ihateyoualot.info', 'iheartspam.org', 'ikbenspamvrij.nl', 'imails.info', 'imgof.com', 'imstations.com', 'inbax.tk', 'inbox.si', 'inboxalias.com', 'inboxclean.com', 'inboxclean.org', 'inboxproxy.com', 'incognitomail.com', 'incognitomail.net', 'incognitomail.org', 'infocom.zp.ua', 'inoutmail.de', 'inoutmail.eu', 'inoutmail.info', 'inoutmail.net', 'insorg-mail.info', 'instant-mail.de', 'ip6.li', 'ipoo.org', 'irish2me.com', 'iwi.net', 'jamit.com.au', 'jetable.com', 'jetable.fr.nf', 'jetable.net', 'jetable.org', 'jnxjn.com', 'jourrapide.com', 'jsrsolutions.com', 'junk1e.com', 'kasmail.com', 'kaspop.com', 'keepmymail.com', 'killmail.com', 'killmail.net', 'kimsdisk.com', 'kingsq.ga', 'kir.ch.tc', 'klassmaster.com', 'klassmaster.net', 'klzlk.com', 'kook.ml', 'koszmail.pl', 'kulturbetrieb.info', 'kurzepost.de', 'l33r.eu', 'lackmail.net', 'lags.us', 'lawlita.com', 'lazyinbox.com', 'letthemeatspam.com', 'lhsdv.com', 'lifebyfood.com', 'link2mail.net', 'litedrop.com', 'loadby.us', 'login-email.ml', 'lol.ovpn.to', 'lolfreak.net', 'lookugly.com', 'lopl.co.cc', 'lortemail.dk', 'lovemeleaveme.com', 'lr78.com', 'lroid.com', 'lukop.dk', 'm21.cc', 'm4ilweb.info', 'maboard.com', 'mail-filter.com', 'mail-temporaire.fr', 'mail.by', 'mail.mezimages.net', 'mail.zp.ua', 'mail114.net', 'mail1a.de', 'mail21.cc', 'mail2rss.org', 'mail333.com', 'mail4trash.com', 'mailbidon.com', 'mailbiz.biz', 'mailblocks.com', 'mailbucket.org', 'mailcat.biz', 'mailcatch.com', 'mailde.de', 'mailde.info', 'maildrop.cc', 'maildx.com', 'maileater.com', 'mailed.ro', 'maileimer.de', 'mailexpire.com', 'mailfa.tk', 'mailforspam.com', 'mailfreeonline.com', 'mailfs.com', 'mailguard.me', 'mailimate.com', 'mailin8r.com', 'mailinater.com', 'mailinator.com', 'mailinator.net', 'mailinator.org', 'mailinator.us', 'mailinator2.com', 'mailincubator.com', 'mailismagic.com', 'mailmate.com', 'mailme.ir', 'mailme.lv', 'mailme24.com', 'mailmetrash.com', 'mailmetrash.comilzilla.org', 'mailmoat.com', 'mailms.com', 'mailnator.com', 'mailnesia.com', 'mailnull.com', 'mailorg.org', 'mailpick.biz', 'mailproxsy.com', 'mailquack.com', 'mailrock.biz', 'mailscrap.com', 'mailshell.com', 'mailsiphon.com', 'mailslapping.com', 'mailslite.com', 'mailtemp.info', 'mailtome.de', 'mailtothis.com', 'mailtrash.net', 'mailtv.net', 'mailtv.tv', 'mailzilla.com', 'mailzilla.org', 'mailzilla.orgmbx.cc', 'makemetheking.com', 'manifestgenerator.com', 'manybrain.com', 'mbx.cc', 'mega.zik.dj', 'meinspamschutz.de', 'meltmail.com', 'messagebeamer.de', 'mezimages.net', 'mierdamail.com', 'migumail.com', 'ministry-of-silly-walks.de', 'mintemail.com', 'misterpinball.de', 'mjukglass.nu', 'mmailinater.com', 'moakt.com', 'mobi.web.id', 'mobileninja.co.uk', 'moburl.com', 'mohmal.com', 'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'monumentmail.com', 'msa.minsmail.com', 'mt2009.com', 'mt2014.com', 'mx0.wwwnew.eu', 'my10minutemail.com', 'mycard.net.ua', 'mycleaninbox.net', 'myemailboxy.com', 'mymail-in.net', 'mymailoasis.com', 'mynetstore.de', 'mypacks.net', 'mypartyclip.de', 'myphantomemail.com', 'mysamp.de', 'myspaceinc.com', 'myspaceinc.net', 'myspaceinc.org', 'myspacepimpedup.com', 'myspamless.com', 'mytemp.email', 'mytempemail.com', 'mytempmail.com', 'mytrashmail.com', 'nabuma.com', 'neomailbox.com', 'nepwk.com', 'nervmich.net', 'nervtmich.net', 'netmails.com', 'netmails.net', 'netzidiot.de', 'neverbox.com', 'nice-4u.com', 'nincsmail.com', 'nincsmail.hu', 'nnh.com', 'no-spam.ws', 'noblepioneer.com', 'nobulk.com', 'noclickemail.com', 'nogmailspam.info', 'nomail.pw', 'nomail.xl.cx', 'nomail2me.com', 'nomorespamemails.com', 'nonspam.eu', 'nonspammer.de', 'noref.in', 'nospam.ze.tc', 'nospam4.us', 'nospamfor.us', 'nospammail.net', 'nospamthanks.info', 'notmailinator.com', 'notsharingmy.info', 'nowhere.org', 'nowmymail.com', 'nurfuerspam.de', 'nus.edu.sg', 'nwldx.com', 'objectmail.com', 'obobbo.com', 'odaymail.com', 'odnorazovoe.ru', 'one-time.email', 'oneoffemail.com', 'oneoffmail.com', 'one2mail.info', 'onewaymail.com', 'onlatedotcom.info', 'online.ms', 'oopi.org', 'opayq.com', 'ordinaryamerican.net', 'otherinbox.codupmyspace.com', 'otherinbox.com', 'ourklips.com', 'outlawspam.com', 'ovpn.to', 'owlpic.com', 'pancakemail.com', 'paplease.com', 'pcusers.otherinbox.com', 'pepbot.com', 'pfui.ru', 'pimpedupmyspace.com', 'pjjkp.com', 'plexolan.de', 'poczta.onet.pl', 'politikerclub.de', 'pooae.com', 'poofy.org', 'pookmail.com', 'privacy.net', 'privatdemail.net', 'privy-mail.com', 'privymail.de', 'proxymail.eu', 'prtnx.com', 'prtz.eu', 'punkass.com', 'putthisinyourspamdatabase.com', 'pwrby.com', 'quickinbox.com', 'quickmail.nl', 'rcpt.at', 'reallymymail.com', 'realtyalerts.ca', 'recode.me', 'recursor.net', 'recyclemail.dk', 'regbypass.com', 'regbypass.comsafe-mail.net', 'rejectmail.com', 'reliable-mail.com', 'rhyta.com', 'rklips.com', 'rmqkr.net', 'royal.net', 'rppkn.com', 'rtrtr.com', 's0ny.net', 'safe-mail.net', 'safersignup.de', 'safetymail.info', 'safetypost.de', 'sandelf.de', 'saynotospams.com', 'schafmail.de', 'schrott-email.de', 'secretemail.de', 'secure-mail.biz', 'selfdestructingmail.com', 'selfdestructingmail.org', 'sendspamhere.com', 'sendspamhere.com', 'senseless-entertainment.com', 'services391.com', 'sharedmailbox.org', 'sharklasers.com', 'shieldedmail.com', 'shieldemail.com', 'shiftmail.com', 'shitmail.me', 'shitmail.org', 'shitware.nl', 'shmeriously.com', 'shortmail.net', 'shotmail.ru', 'showslow.de', 'sibmail.com', 'sinnlos-mail.de', 'siteposter.net', 'skeefmail.com', 'slapsfromlastnight.com', 'slaskpost.se', 'slipry.net', 'slopsbox.com', 'slushmail.com', 'smashmail.de', 'smellfear.com', 'smellrear.com', 'snakemail.com', 'sneakemail.com', 'sneakmail.de', 'snkmail.com', 'sofimail.com', 'sofort-mail.de', 'softpls.asia', 'sogetthis.com', 'sohu.com', 'solvemail.info', 'soodonims.com', 'spa.com', 'spaereplease.com', 'spam.la', 'spam.su', 'spam4.me', 'spamail.de', 'spamarrest.com', 'spamavert.com', 'spambob.com', 'spambob.net', 'spambob.org', 'spambog.com', 'spambog.de', 'spambog.net', 'spambog.ru', 'spambox.info', 'spambox.irishspringrealty.com', 'spambox.us', 'spamcannon.com', 'spamcannon.net', 'spamcero.com', 'spamcon.org', 'spamcorptastic.com', 'spamcowboy.com', 'spamcowboy.net', 'spamcowboy.org', 'spamday.com', 'spamex.com', 'spamfree.eu', 'spamfree24.com', 'spamfree24.de', 'spamfree24.eu', 'spamfree24.info', 'spamfree24.net', 'spamfree24.org', 'spamgoes.in', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org', 'spamherelots.com', 'spamhereplease.com', 'spamhole.com', 'spamify.com', 'spaminator.de', 'spamkill.info', 'spaml.com', 'spaml.de', 'spammotel.com', 'spamobox.com', 'spamoff.de', 'spamsalad.in', 'spamslicer.com', 'spamspot.com', 'spamstack.net', 'spamthis.co.uk', 'spamthisplease.com', 'spamtrail.com', 'spamtroll.net', 'speed.1s.fr', 'spikio.com', 'spoofmail.de', 'squizzy.de', 'ssoia.com', 'startkeys.com', 'stinkefinger.net', 'stop-my-spam.com', 'stuffmail.de', 'super-auswahl.de', 'supergreatmail.com', 'supermailer.jp', 'superrito.com', 'superstachel.de', 'suremail.info', 'svk.jp', 'sweetxxx.de', 'tagyourself.com', 'talkinator.com', 'tapchicuoihoi.com', 'teewars.org', 'teleosaurs.xyz', 'teleworm.com', 'teleworm.us', 'temp-mail.org', 'temp-mail.ru', 'temp.emeraldwebmail.com', 'temp.headstrong.de', 'tempalias.com', 'tempe-mail.com', 'tempemail.biz', 'tempemail.co.za', 'tempemail.com', 'tempemail.net', 'tempemail.net', 'tempinbox.co.uk', 'tempinbox.com', 'tempmail.eu', 'tempmail.it', 'tempmail2.com', 'tempmaildemo.com', 'tempmailer.com', 'tempmailer.de', 'tempomail.fr', 'temporarily.de', 'temporarioemail.com.br', 'temporaryemail.net', 'temporaryemail.us', 'temporaryforwarding.com', 'temporaryinbox.com', 'temporarymailaddress.com', 'tempsky.com', 'tempthe.net', 'tempymail.com', 'thanksnospam.info', 'thankyou2010.com', 'thc.st', 'thecloudindex.com', 'thelimestones.com', 'thisisnotmyrealemail.com', 'thismail.net', 'thrma.com', 'throwawayemailaddress.com', 'tilien.com', 'tittbit.in', 'tizi.com', 'tmail.ws', 'tmailinator.com', 'toiea.com', 'toomail.biz', 'topranklist.de', 'tradermail.info', 'trash-amil.com', 'trash-mail.at', 'trash-mail.com', 'trash-mail.de', 'trash2009.com', 'trash2010.com', 'trash2011.com', 'trashdevil.com', 'trashdevil.de', 'trashemail.de', 'trashmail.at', 'trashmail.com', 'trashmail.de', 'trashmail.me', 'trashmail.net', 'trashmail.org', 'trashmail.ws', 'trashmailer.com', 'trashymail.com', 'trashymail.net', 'trbvm.com', 'trbvn.com', 'trialmail.de', 'trillianpro.com', 'tryalert.com', 'turual.com', 'twinmail.de', 'twoweirdtricks.com', 'tyldd.com', 'uggsrock.com', 'umail.net', 'upliftnow.com', 'uplipht.com', 'uroid.com', 'us.af', 'username.e4ward.com', 'venompen.com', 'veryrealemail.com', 'vidchart.com', 'viditag.com', 'viewcastmedia.com', 'viewcastmedia.net', 'viewcastmedia.org', 'viewcastmediae', 'viralplays.com', 'vkcode.ru', 'vomoto.com', 'vpn.st', 'vsimcard.com', 'vubby.com', 'walala.org', 'walkmail.net', 'walkmail.ru', 'wasteland.rfc822.org', 'webemail.me', 'webm4il.info', 'webuser.in', 'wee.my', 'weg-werf-email.de', 'wegwerf-email-addressen.de', 'wegwerf-emails.de', 'wegwerfadresse.de', 'wegwerfemail.com', 'wegwerfemail.de', 'wegwerfmail.de', 'wegwerfmail.info', 'wegwerfmail.net', 'wegwerfmail.org', 'wetrainbayarea.com', 'wetrainbayarea.org', 'wh4f.org', 'whatiaas.com', 'whatpaas.com', 'whatsaas.com', 'whopy.com', 'whtjddn.33mail.com', 'whyspam.me', 'wilemail.com', 'willhackforfood.biz', 'willselfdestruct.com', 'winemaven.info', 'wronghead.com', 'wuzup.net', 'wuzupmail.net', 'www.e4ward.com', 'www.gishpuppy.com', 'www.mailinator.com', 'wwwnew.eu', 'x.ip6.li', 'xagloo.com', 'xemaps.com', 'xents.com', 'xmaily.com', 'xoxy.net', 'xyzfree.net', 'yapped.net', 'yeah.net', 'yep.it', 'yogamaven.com', 'yomail.info', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'yourdomain.com', 'ypmail.webarnak.fr.eu.org', 'yuurok.com', 'z1p.biz', 'za.com', 'zehnminuten.de', 'zehnminutenmail.de', 'zetmail.com', 'zippymail.info', 'zoaxe.com', 'zoemail.com', 'zoemail.net', 'zoemail.org', 'zomg.info', 'zxcv.com', 'zxcvbnm.com', 'zzz.com'];
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"interceptDirectReplyEmails.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/interceptDirectReplyEmails.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  IMAPIntercepter: () => IMAPIntercepter,
  POP3Intercepter: () => POP3Intercepter,
  POP3Helper: () => POP3Helper
});
let IMAP;
module.watch(require("imap"), {
  default(v) {
    IMAP = v;
  }

}, 0);
let POP3;
module.watch(require("poplib"), {
  default(v) {
    POP3 = v;
  }

}, 1);
let simpleParser;
module.watch(require("mailparser"), {
  simpleParser(v) {
    simpleParser = v;
  }

}, 2);

class IMAPIntercepter {
  constructor() {
    this.imap = new IMAP({
      user: RocketChat.settings.get('Direct_Reply_Username'),
      password: RocketChat.settings.get('Direct_Reply_Password'),
      host: RocketChat.settings.get('Direct_Reply_Host'),
      port: RocketChat.settings.get('Direct_Reply_Port'),
      debug: RocketChat.settings.get('Direct_Reply_Debug') ? console.log : false,
      tls: !RocketChat.settings.get('Direct_Reply_IgnoreTLS'),
      connTimeout: 30000,
      keepalive: true
    });
    this.delete = RocketChat.settings.get('Direct_Reply_Delete') ? RocketChat.settings.get('Direct_Reply_Delete') : true; // On successfully connected.

    this.imap.on('ready', Meteor.bindEnvironment(() => {
      if (this.imap.state !== 'disconnected') {
        this.openInbox(Meteor.bindEnvironment(err => {
          if (err) {
            throw err;
          } // fetch new emails & wait [IDLE]


          this.getEmails(); // If new message arrived, fetch them

          this.imap.on('mail', Meteor.bindEnvironment(() => {
            this.getEmails();
          }));
        }));
      } else {
        console.log('IMAP didnot connected.');
        this.imap.end();
      }
    }));
    this.imap.on('error', err => {
      console.log('Error occurred ...');
      throw err;
    });
  }

  openInbox(cb) {
    this.imap.openBox('INBOX', false, cb);
  }

  start() {
    this.imap.connect();
  }

  isActive() {
    if (this.imap && this.imap.state && this.imap.state === 'disconnected') {
      return false;
    }

    return true;
  }

  stop(callback = new Function()) {
    this.imap.end();
    this.imap.once('end', callback);
  }

  restart() {
    this.stop(() => {
      console.log('Restarting IMAP ....');
      this.start();
    });
  } // Fetch all UNSEEN messages and pass them for further processing


  getEmails() {
    this.imap.search(['UNSEEN'], Meteor.bindEnvironment((err, newEmails) => {
      if (err) {
        console.log(err);
        throw err;
      } // newEmails => array containing serials of unseen messages


      if (newEmails.length > 0) {
        const f = this.imap.fetch(newEmails, {
          // fetch headers & first body part.
          bodies: ['HEADER.FIELDS (FROM TO DATE MESSAGE-ID)', '1'],
          struct: true,
          markSeen: true
        });
        f.on('message', Meteor.bindEnvironment((msg, seqno) => {
          const email = {};
          msg.on('body', (stream, info) => {
            let headerBuffer = '';
            let bodyBuffer = '';
            stream.on('data', chunk => {
              if (info.which === '1') {
                bodyBuffer += chunk.toString('utf8');
              } else {
                headerBuffer += chunk.toString('utf8');
              }
            });
            stream.once('end', () => {
              if (info.which === '1') {
                email.body = bodyBuffer;
              } else {
                // parse headers
                email.headers = IMAP.parseHeader(headerBuffer);
                email.headers.to = email.headers.to[0];
                email.headers.date = email.headers.date[0];
                email.headers.from = email.headers.from[0];
              }
            });
          }); // On fetched each message, pass it further

          msg.once('end', Meteor.bindEnvironment(() => {
            // delete message from inbox
            if (this.delete) {
              this.imap.seq.addFlags(seqno, 'Deleted', err => {
                if (err) {
                  console.log(`Mark deleted error: ${err}`);
                }
              });
            }

            RocketChat.processDirectEmail(email);
          }));
        }));
        f.once('error', err => {
          console.log(`Fetch error: ${err}`);
        });
      }
    }));
  }

}

class POP3Intercepter {
  constructor() {
    this.pop3 = new POP3(RocketChat.settings.get('Direct_Reply_Port'), RocketChat.settings.get('Direct_Reply_Host'), {
      enabletls: !RocketChat.settings.get('Direct_Reply_IgnoreTLS'),
      debug: RocketChat.settings.get('Direct_Reply_Debug') ? console.log : false
    });
    this.totalMsgCount = 0;
    this.currentMsgCount = 0;
    this.pop3.on('connect', Meteor.bindEnvironment(() => {
      this.pop3.login(RocketChat.settings.get('Direct_Reply_Username'), RocketChat.settings.get('Direct_Reply_Password'));
    }));
    this.pop3.on('login', Meteor.bindEnvironment(status => {
      if (status) {
        // run on start
        this.pop3.list();
      } else {
        console.log('Unable to Log-in ....');
      }
    })); // on getting list of all emails

    this.pop3.on('list', Meteor.bindEnvironment((status, msgcount) => {
      if (status) {
        if (msgcount > 0) {
          this.totalMsgCount = msgcount;
          this.currentMsgCount = 1; // Retrieve email

          this.pop3.retr(this.currentMsgCount);
        } else {
          this.pop3.quit();
        }
      } else {
        console.log('Cannot Get Emails ....');
      }
    })); // on retrieved email

    this.pop3.on('retr', Meteor.bindEnvironment((status, msgnumber, data) => {
      if (status) {
        // parse raw email data to  JSON object
        simpleParser(data, Meteor.bindEnvironment((err, mail) => {
          this.initialProcess(mail);
        }));
        this.currentMsgCount += 1; // delete email

        this.pop3.dele(msgnumber);
      } else {
        console.log('Cannot Retrieve Message ....');
      }
    })); // on email deleted

    this.pop3.on('dele', Meteor.bindEnvironment(status => {
      if (status) {
        // get next email
        if (this.currentMsgCount <= this.totalMsgCount) {
          this.pop3.retr(this.currentMsgCount);
        } else {
          // parsed all messages.. so quitting
          this.pop3.quit();
        }
      } else {
        console.log('Cannot Delete Message....');
      }
    })); // invalid server state

    this.pop3.on('invalid-state', function (cmd) {
      console.log(`Invalid state. You tried calling ${cmd}`);
    }); // locked => command already running, not finished yet

    this.pop3.on('locked', function (cmd) {
      console.log(`Current command has not finished yet. You tried calling ${cmd}`);
    });
  }

  initialProcess(mail) {
    const email = {
      headers: {
        from: mail.from.text,
        to: mail.to.text,
        date: mail.date,
        'message-id': mail.messageId
      },
      body: mail.text
    };
    RocketChat.processDirectEmail(email);
  }

}

class POP3Helper {
  constructor() {
    this.running = false;
  }

  start() {
    // run every x-minutes
    if (RocketChat.settings.get('Direct_Reply_Frequency')) {
      RocketChat.POP3 = new POP3Intercepter();
      this.running = Meteor.setInterval(() => {
        // get new emails and process
        RocketChat.POP3 = new POP3Intercepter();
      }, Math.max(RocketChat.settings.get('Direct_Reply_Frequency') * 60 * 1000, 2 * 60 * 1000));
    }
  }

  isActive() {
    return this.running;
  }

  stop(callback = new Function()) {
    if (this.isActive()) {
      Meteor.clearInterval(this.running);
    }

    callback();
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"loginErrorMessageOverride.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/loginErrorMessageOverride.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Do not disclose if user exists when password is invalid
const _runLoginHandlers = Accounts._runLoginHandlers;

Accounts._runLoginHandlers = function (methodInvocation, options) {
  const result = _runLoginHandlers.call(Accounts, methodInvocation, options);

  if (result.error && result.error.reason === 'Incorrect password') {
    result.error = new Meteor.Error(403, 'User not found');
  }

  return result;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"notifyUsersOnMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/notifyUsersOnMessage.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  messageContainsHighlight: () => messageContainsHighlight
});

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 2);

function messageContainsHighlight(message, highlights) {
  if (!highlights || highlights.length === 0) {
    return false;
  }

  return highlights.some(function (highlight) {
    const regexp = new RegExp(s.escapeRegExp(highlight), 'i');
    return regexp.test(message.msg);
  });
}

function notifyUsersOnMessage(message, room) {
  // skips this callback if the message was edited and increments it if the edit was way in the past (aka imported)
  if (message.editedAt && Math.abs(moment(message.editedAt).diff()) > 60000) {
    //TODO: Review as I am not sure how else to get around this as the incrementing of the msgs count shouldn't be in this callback
    RocketChat.models.Rooms.incMsgCountById(message.rid, 1);
    return message;
  } else if (message.editedAt) {
    // only updates last message if it was edited (skip rest of callback)
    if (RocketChat.settings.get('Store_Last_Message') && (!room.lastMessage || room.lastMessage._id === message._id)) {
      RocketChat.models.Rooms.setLastMessageById(message.rid, message);
    }

    return message;
  }

  if (message.ts && Math.abs(moment(message.ts).diff()) > 60000) {
    RocketChat.models.Rooms.incMsgCountById(message.rid, 1);
    return message;
  }

  if (room != null) {
    let toAll = false;
    let toHere = false;
    const mentionIds = [];
    const highlightsIds = [];
    const highlights = RocketChat.models.Subscriptions.findByRoomWithUserHighlights(room._id, {
      fields: {
        'userHighlights': 1,
        'u._id': 1
      }
    }).fetch();

    if (message.mentions != null) {
      message.mentions.forEach(function (mention) {
        if (!toAll && mention._id === 'all') {
          toAll = true;
        }

        if (!toHere && mention._id === 'here') {
          toHere = true;
        }

        if (mention._id !== message.u._id) {
          mentionIds.push(mention._id);
        }
      });
    }

    highlights.forEach(function (subscription) {
      if (subscription.userHighlights && messageContainsHighlight(message, subscription.userHighlights)) {
        if (subscription.u._id !== message.u._id) {
          highlightsIds.push(subscription.u._id);
        }
      }
    });

    if (room.t === 'd') {
      const unreadCountDM = RocketChat.settings.get('Unread_Count_DM');

      if (unreadCountDM === 'all_messages') {
        RocketChat.models.Subscriptions.incUnreadForRoomIdExcludingUserId(room._id, message.u._id);
      } else if (toAll || toHere) {
        RocketChat.models.Subscriptions.incGroupMentionsAndUnreadForRoomIdExcludingUserId(room._id, message.u._id, 1, 1);
      } else if (mentionIds && mentionIds.length > 0 || highlightsIds && highlightsIds.length > 0) {
        RocketChat.models.Subscriptions.incUserMentionsAndUnreadForRoomIdAndUserIds(room._id, _.compact(_.unique(mentionIds.concat(highlightsIds))), 1, 1);
      }
    } else {
      const unreadCount = RocketChat.settings.get('Unread_Count');

      if (toAll || toHere) {
        let incUnread = 0;

        if (['all_messages', 'group_mentions_only', 'user_and_group_mentions_only'].includes(unreadCount)) {
          incUnread = 1;
        }

        RocketChat.models.Subscriptions.incGroupMentionsAndUnreadForRoomIdExcludingUserId(room._id, message.u._id, 1, incUnread);
      } else if (mentionIds && mentionIds.length > 0 || highlightsIds && highlightsIds.length > 0) {
        let incUnread = 0;

        if (['all_messages', 'user_mentions_only', 'user_and_group_mentions_only'].includes(unreadCount)) {
          incUnread = 1;
        }

        RocketChat.models.Subscriptions.incUserMentionsAndUnreadForRoomIdAndUserIds(room._id, _.compact(_.unique(mentionIds.concat(highlightsIds))), 1, incUnread);
      } else if (unreadCount === 'all_messages') {
        RocketChat.models.Subscriptions.incUnreadForRoomIdExcludingUserId(room._id, message.u._id);
      }
    }
  } // Update all the room activity tracker fields
  // This method take so long to execute on gient rooms cuz it will trugger the cache rebuild for the releations of that room


  RocketChat.models.Rooms.incMsgCountAndSetLastMessageById(message.rid, 1, message.ts, RocketChat.settings.get('Store_Last_Message') && message); // Update all other subscriptions to alert their owners but witout incrementing
  // the unread counter, as it is only for mentions and direct messages
  // We now set alert and open properties in two separate update commands. This proved to be more efficient on MongoDB - because it uses a more efficient index.

  RocketChat.models.Subscriptions.setAlertForRoomIdExcludingUserId(message.rid, message.u._id);
  RocketChat.models.Subscriptions.setOpenForRoomIdExcludingUserId(message.rid, message.u._id);
  return message;
}

RocketChat.callbacks.add('afterSaveMessage', notifyUsersOnMessage, RocketChat.callbacks.priority.LOW, 'notifyUsersOnMessage');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"processDirectEmail.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/processDirectEmail.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let reply;
module.watch(require("emailreplyparser"), {
  EmailReplyParser(v) {
    reply = v;
  }

}, 0);
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 1);

RocketChat.processDirectEmail = function (email) {
  function sendMessage(email) {
    const message = {
      ts: new Date(email.headers.date),
      msg: email.body,
      sentByEmail: true,
      groupable: false
    };

    if (message.ts) {
      const tsDiff = Math.abs(moment(message.ts).diff());

      if (tsDiff > 10000) {
        message.ts = new Date();
      }
    } else {
      message.ts = new Date();
    }

    if (message.msg && message.msg.length > RocketChat.settings.get('Message_MaxAllowedSize')) {
      return false;
    } // reduce new lines in multiline message


    message.msg = message.msg.split('\n\n').join('\n');
    const user = RocketChat.models.Users.findOneByEmailAddress(email.headers.from, {
      fields: {
        username: 1,
        name: 1
      }
    });

    if (!user) {
      // user not found
      return false;
    }

    const prevMessage = RocketChat.models.Messages.findOneById(email.headers.mid, {
      rid: 1,
      u: 1
    });

    if (!prevMessage) {
      // message doesn't exist anymore
      return false;
    }

    message.rid = prevMessage.rid;
    const room = Meteor.call('canAccessRoom', message.rid, user._id);

    if (!room) {
      return false;
    }

    const roomInfo = RocketChat.models.Rooms.findOneById(message.rid, {
      t: 1,
      name: 1
    }); // check mention

    if (message.msg.indexOf(`@${prevMessage.u.username}`) === -1 && roomInfo.t !== 'd') {
      message.msg = `@${prevMessage.u.username} ${message.msg}`;
    } // reply message link


    let prevMessageLink = `[ ](${Meteor.absoluteUrl().replace(/\/$/, '')}`;

    if (roomInfo.t === 'c') {
      prevMessageLink += `/channel/${roomInfo.name}?msg=${email.headers.mid}) `;
    } else if (roomInfo.t === 'd') {
      prevMessageLink += `/direct/${prevMessage.u.username}?msg=${email.headers.mid}) `;
    } else if (roomInfo.t === 'p') {
      prevMessageLink += `/group/${roomInfo.name}?msg=${email.headers.mid}) `;
    } // add reply message link


    message.msg = prevMessageLink + message.msg;
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(message.rid, user._id);

    if (subscription && subscription.blocked || subscription.blocker) {
      // room is blocked
      return false;
    }

    if ((room.muted || []).includes(user.username)) {
      // room is muted
      return false;
    }

    if (message.alias == null && RocketChat.settings.get('Message_SetNameToAliasEnabled')) {
      message.alias = user.name;
    }

    RocketChat.metrics.messagesSent.inc(); // TODO This line needs to be moved to it's proper place. See the comments on: https://github.com/RocketChat/Rocket.Chat/pull/5736

    return RocketChat.sendMessage(user, message, room);
  } // Extract/parse reply from email body


  email.body = reply.parse_reply(email.body); // if 'To' email format is "Name <username@domain>"

  if (email.headers.to.indexOf('<') >= 0 && email.headers.to.indexOf('>') >= 0) {
    email.headers.to = email.headers.to.split('<')[1].split('>')[0];
  } // if 'From' email format is "Name <username@domain>"


  if (email.headers.from.indexOf('<') >= 0 && email.headers.from.indexOf('>') >= 0) {
    email.headers.from = email.headers.from.split('<')[1].split('>')[0];
  } // 'To' email format "username+messageId@domain"


  if (email.headers.to.indexOf('+') >= 0) {
    // Valid 'To' format
    email.headers.mid = email.headers.to.split('@')[0].split('+')[1];
    sendMessage(email);
  } else {
    console.log('Invalid Email....If not. Please report it.');
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"roomTypes.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/roomTypes.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let RoomTypesCommon;
module.watch(require("../../lib/RoomTypesCommon"), {
  RoomTypesCommon(v) {
    RoomTypesCommon = v;
  }

}, 0);
RocketChat.roomTypes = new class roomTypesServer extends RoomTypesCommon {
  /**
   * Add a publish for a room type
   *
   * @param {string} roomType room type (e.g.: c (for channels), d (for direct channels))
   * @param {function} callback function that will return the publish's data
  */
  setPublish(roomType, callback) {
    if (this.roomTypes[roomType] && this.roomTypes[roomType].publish != null) {
      throw new Meteor.Error('route-publish-exists', 'Publish for the given type already exists');
    }

    if (this.roomTypes[roomType] == null) {
      this.roomTypes[roomType] = {};
    }

    return this.roomTypes[roomType].publish = callback;
  }

  setRoomFind(roomType, callback) {
    if (this.roomTypes[roomType] && this.roomTypes[roomType].roomFind != null) {
      throw new Meteor.Error('room-find-exists', 'Room find for the given type already exists');
    }

    if (this.roomTypes[roomType] == null) {
      this.roomTypes[roomType] = {};
    }

    return this.roomTypes[roomType].roomFind = callback;
  }

  getRoomFind(roomType) {
    return this.roomTypes[roomType] && this.roomTypes[roomType].roomFind;
  }

  getRoomName(roomType, roomData) {
    return this.roomTypes[roomType] && this.roomTypes[roomType].roomName && this.roomTypes[roomType].roomName(roomData);
  }
  /**
   * Run the publish for a room type
   *
   * @param scope Meteor publish scope
   * @param {string} roomType room type (e.g.: c (for channels), d (for direct channels))
   * @param identifier identifier of the room
  */


  runPublish(scope, roomType, identifier) {
    return this.roomTypes[roomType] && this.roomTypes[roomType].publish && this.roomTypes[roomType].publish.call(scope, identifier);
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendNotificationsOnMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/sendNotificationsOnMessage.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);
let callJoinRoom, messageContainsHighlight, parseMessageTextPerUser, replaceMentionedUsernamesWithFullNames;
module.watch(require("../functions/notifications/"), {
  callJoinRoom(v) {
    callJoinRoom = v;
  },

  messageContainsHighlight(v) {
    messageContainsHighlight = v;
  },

  parseMessageTextPerUser(v) {
    parseMessageTextPerUser = v;
  },

  replaceMentionedUsernamesWithFullNames(v) {
    replaceMentionedUsernamesWithFullNames = v;
  }

}, 1);
let sendEmail, shouldNotifyEmail;
module.watch(require("../functions/notifications/email"), {
  sendEmail(v) {
    sendEmail = v;
  },

  shouldNotifyEmail(v) {
    shouldNotifyEmail = v;
  }

}, 2);
let sendSinglePush, shouldNotifyMobile;
module.watch(require("../functions/notifications/mobile"), {
  sendSinglePush(v) {
    sendSinglePush = v;
  },

  shouldNotifyMobile(v) {
    shouldNotifyMobile = v;
  }

}, 3);
let notifyDesktopUser, shouldNotifyDesktop;
module.watch(require("../functions/notifications/desktop"), {
  notifyDesktopUser(v) {
    notifyDesktopUser = v;
  },

  shouldNotifyDesktop(v) {
    shouldNotifyDesktop = v;
  }

}, 4);
let notifyAudioUser, shouldNotifyAudio;
module.watch(require("../functions/notifications/audio"), {
  notifyAudioUser(v) {
    notifyAudioUser = v;
  },

  shouldNotifyAudio(v) {
    shouldNotifyAudio = v;
  }

}, 5);

const sendNotification = ({
  subscription,
  sender,
  hasMentionToAll,
  hasMentionToHere,
  message,
  notificationMessage,
  room,
  mentionIds,
  disableAllMessageNotifications
}) => {
  // don't notify the sender
  if (subscription.u._id === sender._id) {
    return;
  } // notifications disabled


  if (subscription.disableNotifications) {
    return;
  } // dont send notification to users who ignored the sender


  if (Array.isArray(subscription.ignored) && subscription.ignored.includes(sender._id)) {
    return;
  }

  const hasMentionToUser = mentionIds.includes(subscription.u._id); // mute group notifications (@here and @all) if not directly mentioned as well

  if (!hasMentionToUser && subscription.muteGroupMentions && (hasMentionToAll || hasMentionToHere)) {
    return;
  }

  const receiver = RocketChat.models.Users.findOneById(subscription.u._id);

  if (!receiver || !receiver.active) {
    return;
  }

  notificationMessage = parseMessageTextPerUser(notificationMessage, message, receiver);
  const isHighlighted = messageContainsHighlight(message, subscription.userHighlights);
  const roomType = room.t;
  const {
    audioNotifications,
    desktopNotifications,
    mobilePushNotifications,
    emailNotifications
  } = subscription;
  let notificationSent = false; // busy users don't receive audio notification

  if (shouldNotifyAudio({
    disableAllMessageNotifications,
    status: receiver.status,
    audioNotifications,
    hasMentionToAll,
    hasMentionToHere,
    isHighlighted,
    hasMentionToUser,
    roomType
  })) {
    notifyAudioUser(subscription.u._id, message, room);
  } // busy users don't receive desktop notification


  if (shouldNotifyDesktop({
    disableAllMessageNotifications,
    status: receiver.status,
    desktopNotifications,
    hasMentionToAll,
    hasMentionToHere,
    isHighlighted,
    hasMentionToUser,
    roomType
  })) {
    notificationSent = true;
    notifyDesktopUser({
      notificationMessage,
      userId: subscription.u._id,
      user: sender,
      message,
      room,
      duration: subscription.desktopNotificationDuration
    });
  }

  if (shouldNotifyMobile({
    disableAllMessageNotifications,
    mobilePushNotifications,
    hasMentionToAll,
    isHighlighted,
    hasMentionToUser,
    statusConnection: receiver.statusConnection,
    roomType
  })) {
    notificationSent = true;
    sendSinglePush({
      notificationMessage,
      room,
      message,
      userId: subscription.u._id,
      senderUsername: sender.username,
      senderName: sender.name,
      receiverUsername: receiver.username
    });
  }

  if (receiver.emails && shouldNotifyEmail({
    disableAllMessageNotifications,
    statusConnection: receiver.statusConnection,
    emailNotifications,
    isHighlighted,
    hasMentionToUser,
    hasMentionToAll,
    roomType
  })) {
    receiver.emails.some(email => {
      if (email.verified) {
        sendEmail({
          message,
          receiver,
          subscription,
          room,
          emailAddress: email.address,
          hasMentionToUser
        });
        return true;
      }
    });
  }

  if (notificationSent) {
    RocketChat.Sandstorm.notify(message, [subscription.u._id], `@${sender.username}: ${message.msg}`, room.t === 'p' ? 'privateMessage' : 'message');
  }
};

function sendAllNotifications(message, room) {
  // skips this callback if the message was edited
  if (message.editedAt) {
    return message;
  }

  if (message.ts && Math.abs(moment(message.ts).diff()) > 60000) {
    return message;
  }

  if (!room || room.t == null) {
    return message;
  }

  const sender = RocketChat.roomTypes.getConfig(room.t).getMsgSender(message.u._id);

  if (!sender) {
    return message;
  }

  const mentionIds = (message.mentions || []).map(({
    _id
  }) => _id);
  const mentionIdsWithoutGroups = mentionIds.filter(_id => _id !== 'all' && _id !== 'here');
  const hasMentionToAll = mentionIds.includes('all');
  const hasMentionToHere = mentionIds.includes('here');
  let notificationMessage = RocketChat.callbacks.run('beforeSendMessageNotifications', message.msg);

  if (mentionIds.length > 0 && RocketChat.settings.get('UI_Use_Real_Name')) {
    notificationMessage = replaceMentionedUsernamesWithFullNames(message.msg, message.mentions);
  } // Don't fetch all users if room exceeds max members


  const maxMembersForNotification = RocketChat.settings.get('Notifications_Max_Room_Members');
  const roomMembersCount = RocketChat.models.Subscriptions.findByRoomId(room._id).count();
  const disableAllMessageNotifications = roomMembersCount > maxMembersForNotification && maxMembersForNotification !== 0;
  const query = {
    rid: room._id,
    $or: [{
      'userHighlights.0': {
        $exists: 1
      }
    }]
  };
  ['audio', 'desktop', 'mobile', 'email'].map(kind => {
    const notificationField = `${kind === 'mobile' ? 'mobilePush' : kind}Notifications`;
    const filter = {
      [notificationField]: 'all'
    };

    if (disableAllMessageNotifications) {
      filter[`${kind}PrefOrigin`] = {
        $ne: 'user'
      };
    }

    query.$or.push(filter);

    if (mentionIdsWithoutGroups.length > 0) {
      query.$or.push({
        [notificationField]: 'mentions',
        'u._id': {
          $in: mentionIdsWithoutGroups
        }
      });
    } else if (!disableAllMessageNotifications && (hasMentionToAll || hasMentionToHere)) {
      query.$or.push({
        [notificationField]: 'mentions'
      });
    }

    const serverField = kind === 'email' ? 'emailNotificationMode' : `${kind}Notifications`;
    const serverPreference = RocketChat.settings.get(`Accounts_Default_User_Preferences_${serverField}`);

    if (room.t === 'd' && serverPreference !== 'nothing' || !disableAllMessageNotifications && (serverPreference === 'all' || hasMentionToAll || hasMentionToHere)) {
      query.$or.push({
        [notificationField]: {
          $exists: false
        }
      });
    } else if (serverPreference === 'mentions' && mentionIdsWithoutGroups.length) {
      query.$or.push({
        [notificationField]: {
          $exists: false
        },
        'u._id': {
          $in: mentionIdsWithoutGroups
        }
      });
    }
  }); // the find bellow is crucial. all subscription records returned will receive at least one kind of notification.
  // the query is defined by the server's default values and Notifications_Max_Room_Members setting.

  const subscriptions = RocketChat.models.Subscriptions.findNotificationPreferencesByRoom(query);
  subscriptions.forEach(subscription => sendNotification({
    subscription,
    sender,
    hasMentionToAll,
    hasMentionToHere,
    message,
    notificationMessage,
    room,
    mentionIds,
    disableAllMessageNotifications
  })); // on public channels, if a mentioned user is not member of the channel yet, he will first join the channel and then be notified based on his preferences.

  if (room.t === 'c') {
    const mentions = message.mentions.filter(({
      _id
    }) => _id !== 'here' && _id !== 'all').map(({
      _id
    }) => _id);
    Promise.all(RocketChat.models.Subscriptions.findByRoomIdAndUserIds(room._id, mentions).fetch().map(subscription => Promise.asyncApply(() => {
      Promise.await(callJoinRoom(subscription.u, room._id));
      return subscription;
    }))).then(subscriptions => subscriptions.forEach(subscription => sendNotification({
      subscription,
      sender,
      hasMentionToAll,
      hasMentionToHere,
      message,
      notificationMessage,
      room,
      mentionIds
    })));
  }

  return message;
}

RocketChat.callbacks.add('afterSaveMessage', sendAllNotifications, RocketChat.callbacks.priority.LOW, 'sendNotificationsOnMessage');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"validateEmailDomain.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/validateEmailDomain.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let dns;
module.watch(require("dns"), {
  default(v) {
    dns = v;
  }

}, 1);
let emailDomainBlackList = [];
let emailDomainWhiteList = [];
let useDefaultBlackList = false;
let useDNSDomainCheck = false;
RocketChat.settings.get('Accounts_BlockedDomainsList', function (key, value) {
  emailDomainBlackList = _.map(value.split(','), domain => domain.trim());
});
RocketChat.settings.get('Accounts_AllowedDomainsList', function (key, value) {
  emailDomainWhiteList = _.map(value.split(','), domain => domain.trim());
});
RocketChat.settings.get('Accounts_UseDefaultBlockedDomainsList', function (key, value) {
  useDefaultBlackList = value;
});
RocketChat.settings.get('Accounts_UseDNSDomainCheck', function (key, value) {
  useDNSDomainCheck = value;
});

RocketChat.validateEmailDomain = function (email) {
  const emailValidation = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailValidation.test(email)) {
    throw new Meteor.Error('error-invalid-email', `Invalid email ${email}`, {
      function: 'RocketChat.validateEmailDomain',
      email
    });
  }

  const emailDomain = email.substr(email.lastIndexOf('@') + 1); // if not in whitelist

  if (emailDomainWhiteList.indexOf(emailDomain) === -1) {
    if (emailDomainBlackList.indexOf(emailDomain) !== -1 || useDefaultBlackList && RocketChat.emailDomainDefaultBlackList.indexOf(emailDomain) !== -1) {
      throw new Meteor.Error('error-email-domain-blacklisted', 'The email domain is blacklisted', {
        function: 'RocketChat.validateEmailDomain'
      });
    }
  }

  if (useDNSDomainCheck) {
    try {
      Meteor.wrapAsync(dns.resolveMx)(emailDomain);
    } catch (e) {
      throw new Meteor.Error('error-invalid-domain', 'Invalid domain', {
        function: 'RocketChat.validateEmailDomain'
      });
    }
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"passwordPolicy.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/passwordPolicy.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let PasswordPolicy;
module.watch(require("./PasswordPolicyClass"), {
  default(v) {
    PasswordPolicy = v;
  }

}, 0);
RocketChat.passwordPolicy = new PasswordPolicy();
RocketChat.settings.get('Accounts_Password_Policy_Enabled', (key, value) => RocketChat.passwordPolicy.enabled = value);
RocketChat.settings.get('Accounts_Password_Policy_MinLength', (key, value) => RocketChat.passwordPolicy.minLength = value);
RocketChat.settings.get('Accounts_Password_Policy_MaxLength', (key, value) => RocketChat.passwordPolicy.maxLength = value);
RocketChat.settings.get('Accounts_Password_Policy_ForbidRepeatingCharacters', (key, value) => RocketChat.passwordPolicy.forbidRepeatingCharacters = value);
RocketChat.settings.get('Accounts_Password_Policy_ForbidRepeatingCharactersCount', (key, value) => RocketChat.passwordPolicy.forbidRepeatingCharactersCount = value);
RocketChat.settings.get('Accounts_Password_Policy_AtLeastOneLowercase', (key, value) => RocketChat.passwordPolicy.mustContainAtLeastOneLowercase = value);
RocketChat.settings.get('Accounts_Password_Policy_AtLeastOneUppercase', (key, value) => RocketChat.passwordPolicy.mustContainAtLeastOneUppercase = value);
RocketChat.settings.get('Accounts_Password_Policy_AtLeastOneNumber', (key, value) => RocketChat.passwordPolicy.mustContainAtLeastOneNumber = value);
RocketChat.settings.get('Accounts_Password_Policy_AtLeastOneSpecialCharacter', (key, value) => RocketChat.passwordPolicy.mustContainAtLeastOneSpecialCharacter = value);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/index.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  RoomSettingsEnum: () => RoomSettingsEnum,
  RoomTypeConfig: () => RoomTypeConfig,
  RoomTypeRouteConfig: () => RoomTypeRouteConfig
});
let RoomSettingsEnum, RoomTypeConfig, RoomTypeRouteConfig;
module.watch(require("../../lib/RoomTypeConfig"), {
  RoomSettingsEnum(v) {
    RoomSettingsEnum = v;
  },

  RoomTypeConfig(v) {
    RoomTypeConfig = v;
  },

  RoomTypeRouteConfig(v) {
    RoomTypeRouteConfig = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"PasswordPolicyClass.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/lib/PasswordPolicyClass.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
class PasswordPolicy {
  constructor({
    enabled = false,
    minLength = -1,
    maxLength = -1,
    forbidRepeatingCharacters = false,
    forbidRepeatingCharactersCount = 3,
    //the regex is this number minus one
    mustContainAtLeastOneLowercase = false,
    // /[A-Z]{3,}/ could do this instead of at least one
    mustContainAtLeastOneUppercase = false,
    mustContainAtLeastOneNumber = false,
    mustContainAtLeastOneSpecialCharacter = false,
    throwError = true
  } = {}) {
    this.regex = {
      mustContainAtLeastOneLowercase: new RegExp('[a-z]'),
      mustContainAtLeastOneUppercase: new RegExp('[A-Z]'),
      mustContainAtLeastOneNumber: new RegExp('[0-9]'),
      mustContainAtLeastOneSpecialCharacter: new RegExp('[^A-Za-z0-9 ]')
    };
    this.enabled = enabled;
    this.minLength = minLength;
    this.maxLength = maxLength;
    this.forbidRepeatingCharacters = forbidRepeatingCharacters;
    this.forbidRepeatingCharactersCount = forbidRepeatingCharactersCount;
    this.mustContainAtLeastOneLowercase = mustContainAtLeastOneLowercase;
    this.mustContainAtLeastOneUppercase = mustContainAtLeastOneUppercase;
    this.mustContainAtLeastOneNumber = mustContainAtLeastOneNumber;
    this.mustContainAtLeastOneSpecialCharacter = mustContainAtLeastOneSpecialCharacter;
    this.throwError = throwError;
  }

  set forbidRepeatingCharactersCount(value) {
    this._forbidRepeatingCharactersCount = value;
    this.regex.forbiddingRepeatingCharacters = new RegExp(`(.)\\1{${this.forbidRepeatingCharactersCount},}`);
  }

  get forbidRepeatingCharactersCount() {
    return this._forbidRepeatingCharactersCount;
  }

  error(error, message) {
    if (this.throwError) {
      throw new Meteor.Error(error, message);
    }

    return false;
  }

  validate(password) {
    if (!this.enabled) {
      return true;
    }

    if (!password || typeof password !== 'string' || !password.length) {
      return this.error('error-password-policy-not-met', 'The password provided does not meet the server\'s password policy.');
    }

    if (this.minLength >= 1 && password.length < this.minLength) {
      return this.error('error-password-policy-not-met-minLength', 'The password does not meet the minimum length password policy.');
    }

    if (this.maxLength >= 1 && password.length > this.maxLength) {
      return this.error('error-password-policy-not-met-maxLength', 'The password does not meet the maximum length password policy.');
    }

    if (this.forbidRepeatingCharacters && this.regex.forbiddingRepeatingCharacters.test(password)) {
      return this.error('error-password-policy-not-met-repeatingCharacters', 'The password contains repeating characters which is against the password policy.');
    }

    if (this.mustContainAtLeastOneLowercase && !this.regex.mustContainAtLeastOneLowercase.test(password)) {
      return this.error('error-password-policy-not-met-oneLowercase', 'The password does not contain at least one lowercase character which is against the password policy.');
    }

    if (this.mustContainAtLeastOneUppercase && !this.regex.mustContainAtLeastOneUppercase.test(password)) {
      return this.error('error-password-policy-not-met-oneUppercase', 'The password does not contain at least one uppercase character which is against the password policy.');
    }

    if (this.mustContainAtLeastOneNumber && !this.regex.mustContainAtLeastOneNumber.test(password)) {
      return this.error('error-password-policy-not-met-oneNumber', 'The password does not contain at least one numerical character which is against the password policy.');
    }

    if (this.mustContainAtLeastOneSpecialCharacter && !this.regex.mustContainAtLeastOneSpecialCharacter.test(password)) {
      return this.error('error-password-policy-not-met-oneSpecial', 'The password does not contain at least one special character which is against the password policy.');
    }

    return true;
  }

}

module.exportDefault(PasswordPolicy);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"isDocker.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/isDocker.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let fs;
module.watch(require("fs"), {
  default(v) {
    fs = v;
  }

}, 0);

function hasDockerEnv() {
  try {
    fs.statSync('/.dockerenv');
    return true;
  } catch (err) {
    return false;
  }
}

function hasDockerCGroup() {
  try {
    return fs.readFileSync('/proc/self/cgroup', 'utf8').indexOf('docker') !== -1;
  } catch (err) {
    return false;
  }
}

function check() {
  return hasDockerEnv() || hasDockerCGroup();
}

let isDocker;

RocketChat.isDocker = function () {
  if (isDocker === undefined) {
    isDocker = check();
  }

  return isDocker;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addUserToDefaultChannels.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/addUserToDefaultChannels.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.addUserToDefaultChannels = function (user, silenced) {
  RocketChat.callbacks.run('beforeJoinDefaultChannels', user);
  const defaultRooms = RocketChat.models.Rooms.findByDefaultAndTypes(true, ['c', 'p'], {
    fields: {
      usernames: 0
    }
  }).fetch();
  defaultRooms.forEach(room => {
    // put user in default rooms
    const muted = room.ro && !RocketChat.authz.hasPermission(user._id, 'post-readonly');

    if (muted) {
      RocketChat.models.Rooms.muteUsernameByRoomId(room._id, user.username);
    }

    if (!RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user._id)) {
      // Add a subscription to this user
      RocketChat.models.Subscriptions.createWithRoomAndUser(room, user, {
        ts: new Date(),
        open: true,
        alert: true,
        unread: 1,
        userMentions: 1,
        groupMentions: 0
      }); // Insert user joined message

      if (!silenced) {
        RocketChat.models.Messages.createUserJoinWithRoomIdAndUser(room._id, user);
      }
    }
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addUserToRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/addUserToRoom.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.addUserToRoom = function (rid, user, inviter, silenced) {
  const now = new Date();
  const room = RocketChat.models.Rooms.findOneById(rid); // Check if user is already in room

  const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, user._id);

  if (subscription) {
    return;
  }

  if (room.t === 'c' || room.t === 'p') {
    RocketChat.callbacks.run('beforeJoinRoom', user, room);
  }

  const muted = room.ro && !RocketChat.authz.hasPermission(user._id, 'post-readonly');

  if (muted) {
    RocketChat.models.Rooms.muteUsernameByRoomId(rid, user.username);
  }

  RocketChat.models.Subscriptions.createWithRoomAndUser(room, user, {
    ts: now,
    open: true,
    alert: true,
    unread: 1,
    userMentions: 1,
    groupMentions: 0
  });

  if (!silenced) {
    if (inviter) {
      RocketChat.models.Messages.createUserAddedWithRoomIdAndUser(rid, user, {
        ts: now,
        u: {
          _id: inviter._id,
          username: inviter.username
        }
      });
    } else {
      RocketChat.models.Messages.createUserJoinWithRoomIdAndUser(rid, user, {
        ts: now
      });
    }
  }

  if (room.t === 'c' || room.t === 'p') {
    Meteor.defer(function () {
      RocketChat.callbacks.run('afterJoinRoom', user, room);
    });
  }

  return true;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"archiveRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/archiveRoom.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.archiveRoom = function (rid) {
  RocketChat.models.Rooms.archiveById(rid);
  RocketChat.models.Subscriptions.archiveByRoomId(rid);
  RocketChat.callbacks.run('afterRoomArchived', RocketChat.models.Rooms.findOneById(rid), Meteor.user());
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"checkUsernameAvailability.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/checkUsernameAvailability.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
let usernameBlackList = [];

const toRegExp = username => new RegExp(`^${s.escapeRegExp(username).trim()}$`, 'i');

RocketChat.settings.get('Accounts_BlockedUsernameList', (key, value) => {
  usernameBlackList = value.split(',').map(toRegExp);
});

const usernameIsBlocked = (username, usernameBlackList) => usernameBlackList.length && usernameBlackList.some(restrictedUsername => restrictedUsername.test(s.trim(s.escapeRegExp(username))));

RocketChat.checkUsernameAvailability = function (username) {
  if (usernameIsBlocked(username, usernameBlackList)) {
    return false;
  }

  return !Meteor.users.findOne({
    username: {
      $regex: toRegExp(username)
    }
  }, {
    fields: {
      _id: 1
    }
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"checkEmailAvailability.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/checkEmailAvailability.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat.checkEmailAvailability = function (email) {
  return !Meteor.users.findOne({
    'emails.address': {
      $regex: new RegExp(`^${s.trim(s.escapeRegExp(email))}$`, 'i')
    }
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"createRoom.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/createRoom.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);

RocketChat.createRoom = function (type, name, owner, members, readOnly, extraData = {}) {
  name = s.trim(name);
  owner = s.trim(owner);
  members = [].concat(members);

  if (!name) {
    throw new Meteor.Error('error-invalid-name', 'Invalid name', {
      function: 'RocketChat.createRoom'
    });
  }

  owner = RocketChat.models.Users.findOneByUsername(owner, {
    fields: {
      username: 1
    }
  });

  if (!owner) {
    throw new Meteor.Error('error-invalid-user', 'Invalid user', {
      function: 'RocketChat.createRoom'
    });
  }

  if (!_.contains(members, owner.username)) {
    members.push(owner.username);
  }

  if (extraData.broadcast) {
    readOnly = true;
    delete extraData.reactWhenReadOnly;
  }

  const now = new Date();
  let room = Object.assign({
    name: RocketChat.getValidRoomName(name),
    fname: name,
    t: type,
    msgs: 0,
    usersCount: 0,
    u: {
      _id: owner._id,
      username: owner.username
    }
  }, extraData, {
    ts: now,
    ro: readOnly === true,
    sysMes: readOnly !== true
  });

  if (type === 'd') {
    room.usernames = members;
  }

  if (Apps && Apps.isLoaded()) {
    const prevent = Promise.await(Apps.getBridges().getListenerBridge().roomEvent('IPreRoomCreatePrevent', room));

    if (prevent) {
      throw new Meteor.Error('error-app-prevented-creation', 'A Rocket.Chat App prevented the room creation.');
    }

    let result;
    result = Promise.await(Apps.getBridges().getListenerBridge().roomEvent('IPreRoomCreateExtend', room));
    result = Promise.await(Apps.getBridges().getListenerBridge().roomEvent('IPreRoomCreateModify', result));

    if (typeof result === 'object') {
      room = Object.assign(room, result);
    }
  }

  if (type === 'c') {
    RocketChat.callbacks.run('beforeCreateChannel', owner, room);
  }

  room = RocketChat.models.Rooms.createWithFullRoomData(room);

  for (const username of members) {
    const member = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        username: 1,
        'settings.preferences': 1
      }
    });
    const isTheOwner = username === owner.username;

    if (!member) {
      continue;
    } // make all room members (Except the owner) muted by default, unless they have the post-readonly permission


    if (readOnly === true && !RocketChat.authz.hasPermission(member._id, 'post-readonly') && !isTheOwner) {
      RocketChat.models.Rooms.muteUsernameByRoomId(room._id, username);
    }

    const extra = {
      open: true
    };

    if (username === owner.username) {
      extra.ls = now;
    }

    RocketChat.models.Subscriptions.createWithRoomAndUser(room, member, extra);
  }

  RocketChat.authz.addUserRoles(owner._id, ['owner'], room._id);

  if (type === 'c') {
    Meteor.defer(() => {
      RocketChat.callbacks.run('afterCreateChannel', owner, room);
    });
  } else if (type === 'p') {
    Meteor.defer(() => {
      RocketChat.callbacks.run('afterCreatePrivateGroup', owner, room);
    });
  }

  Meteor.defer(() => {
    RocketChat.callbacks.run('afterCreateRoom', owner, room);
  });

  if (Apps && Apps.isLoaded()) {
    // This returns a promise, but it won't mutate anything about the message
    // so, we don't really care if it is successful or fails
    Apps.getBridges().getListenerBridge().roomEvent('IPostRoomCreate', room);
  }

  return {
    rid: room._id,
    name: room.name
  };
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cleanRoomHistory.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/cleanRoomHistory.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.cleanRoomHistory = function ({
  rid,
  latest = new Date(),
  oldest = new Date('0001-01-01T00:00:00Z'),
  inclusive = true,
  limit = 0,
  excludePinned = true,
  filesOnly = false,
  fromUsers = []
}) {
  const gt = inclusive ? '$gte' : '$gt';
  const lt = inclusive ? '$lte' : '$lt';
  const ts = {
    [gt]: oldest,
    [lt]: latest
  };
  const text = `_${TAPi18n.__('File_removed_by_prune')}_`;
  let fileCount = 0;
  RocketChat.models.Messages.findFilesByRoomIdPinnedTimestampAndUsers(rid, excludePinned, ts, fromUsers, {
    fields: {
      'file._id': 1,
      pinned: 1
    },
    limit
  }).forEach(document => {
    FileUpload.getStore('Uploads').deleteById(document.file._id);
    fileCount++;

    if (filesOnly) {
      RocketChat.models.Messages.update({
        _id: document._id
      }, {
        $unset: {
          file: 1
        },
        $set: {
          attachments: [{
            color: '#FD745E',
            text
          }]
        }
      });
    }
  });

  if (filesOnly) {
    return fileCount;
  }

  const count = limit ? RocketChat.models.Messages.removeByIdPinnedTimestampLimitAndUsers(rid, excludePinned, ts, limit, fromUsers) : RocketChat.models.Messages.removeByIdPinnedTimestampAndUsers(rid, excludePinned, ts, fromUsers);

  if (count) {
    RocketChat.models.Rooms.resetLastMessageById(rid);
    RocketChat.Notifications.notifyRoom(rid, 'deleteMessageBulk', {
      rid,
      excludePinned,
      ts,
      users: fromUsers
    });
  }

  return count;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/deleteMessage.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals FileUpload */
RocketChat.deleteMessage = function (message, user) {
  const keepHistory = RocketChat.settings.get('Message_KeepHistory');
  const showDeletedStatus = RocketChat.settings.get('Message_ShowDeletedStatus');
  const deletedMsg = RocketChat.models.Messages.findOneById(message._id);

  if (deletedMsg && Apps && Apps.isLoaded()) {
    const prevent = Promise.await(Apps.getBridges().getListenerBridge().messageEvent('IPreMessageDeletePrevent', deletedMsg));

    if (prevent) {
      throw new Meteor.Error('error-app-prevented-deleting', 'A Rocket.Chat App prevented the message deleting.');
    }
  }

  if (keepHistory) {
    if (showDeletedStatus) {
      RocketChat.models.Messages.cloneAndSaveAsHistoryById(message._id);
    } else {
      RocketChat.models.Messages.setHiddenById(message._id, true);
    }

    if (message.file && message.file._id) {
      RocketChat.models.Uploads.update(message.file._id, {
        $set: {
          _hidden: true
        }
      });
    }
  } else {
    if (!showDeletedStatus) {
      RocketChat.models.Messages.removeById(message._id);
    }

    if (message.file && message.file._id) {
      FileUpload.getStore('Uploads').deleteById(message.file._id);
    }
  }

  Meteor.defer(function () {
    RocketChat.callbacks.run('afterDeleteMessage', deletedMsg);
  }); // update last message

  if (RocketChat.settings.get('Store_Last_Message')) {
    const room = RocketChat.models.Rooms.findOneById(message.rid, {
      fields: {
        lastMessage: 1
      }
    });

    if (!room.lastMessage || room.lastMessage._id === message._id) {
      RocketChat.models.Rooms.resetLastMessageById(message.rid);
    }
  }

  if (showDeletedStatus) {
    RocketChat.models.Messages.setAsDeletedByIdAndUser(message._id, user);
  } else {
    RocketChat.Notifications.notifyRoom(message.rid, 'deleteMessage', {
      _id: message._id
    });
  }

  if (Apps && Apps.isLoaded()) {
    Apps.getBridges().getListenerBridge().messageEvent('IPostMessageDeleted', deletedMsg);
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteUser.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/deleteUser.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.deleteUser = function (userId) {
  const user = RocketChat.models.Users.findOneById(userId, {
    fields: {
      username: 1,
      avatarOrigin: 1
    }
  }); // Users without username can't do anything, so there is nothing to remove

  if (user.username != null) {
    const messageErasureType = RocketChat.settings.get('Message_ErasureType');

    switch (messageErasureType) {
      case 'Delete':
        const store = FileUpload.getStore('Uploads');
        RocketChat.models.Messages.findFilesByUserId(userId).forEach(function ({
          file
        }) {
          store.deleteById(file._id);
        });
        RocketChat.models.Messages.removeByUserId(userId);
        break;

      case 'Unlink':
        const rocketCat = RocketChat.models.Users.findOneById('rocket.cat');

        const nameAlias = TAPi18n.__('Removed_User');

        RocketChat.models.Messages.unlinkUserId(userId, rocketCat._id, rocketCat.username, nameAlias);
        break;
    }

    RocketChat.models.Subscriptions.db.findByUserId(userId).forEach(subscription => {
      const room = RocketChat.models.Rooms.findOneById(subscription.rid);

      if (room) {
        if (room.t !== 'c' && RocketChat.models.Subscriptions.findByRoomId(room._id).count() === 1) {
          RocketChat.models.Messages.removeFilesByRoomId(subscription.rid);
          RocketChat.models.Rooms.removeById(subscription.rid); // Remove non-channel rooms with only 1 user (the one being deleted)
        }

        if (room.t === 'd') {
          RocketChat.models.Subscriptions.removeByRoomId(subscription.rid);
          RocketChat.models.Messages.removeFilesByRoomId(subscription.rid);
          RocketChat.models.Messages.removeByRoomId(subscription.rid);
        }
      }
    });
    RocketChat.models.Subscriptions.removeByUserId(userId); // Remove user subscriptions

    RocketChat.models.Rooms.removeDirectRoomContainingUsername(user.username); // Remove direct rooms with the user
    // removes user's avatar

    if (user.avatarOrigin === 'upload' || user.avatarOrigin === 'url') {
      FileUpload.getStore('Avatars').deleteByName(user.username);
    }

    RocketChat.models.Integrations.disableByUserId(userId); // Disables all the integrations which rely on the user being deleted.

    RocketChat.Notifications.notifyLogged('Users:Deleted', {
      userId
    });
  }

  RocketChat.models.Users.removeById(userId); // Remove user from users database
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getFullUserData.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/getFullUserData.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
const logger = new Logger('getFullUserData');
const defaultFields = {
  name: 1,
  username: 1,
  status: 1,
  utcOffset: 1,
  type: 1,
  active: 1,
  reason: 1
};
const fullFields = {
  emails: 1,
  phone: 1,
  statusConnection: 1,
  createdAt: 1,
  lastLogin: 1,
  services: 1,
  requirePasswordChange: 1,
  requirePasswordChangeReason: 1,
  roles: 1
};
let publicCustomFields = {};
let customFields = {};
RocketChat.settings.get('Accounts_CustomFields', (key, value) => {
  publicCustomFields = {};
  customFields = {};

  if (!value.trim()) {
    return;
  }

  try {
    const customFieldsOnServer = JSON.parse(value.trim());
    Object.keys(customFieldsOnServer).forEach(key => {
      const element = customFieldsOnServer[key];

      if (element.public) {
        publicCustomFields[`customFields.${key}`] = 1;
      }

      customFields[`customFields.${key}`] = 1;
    });
  } catch (e) {
    logger.warn(`The JSON specified for "Accounts_CustomFields" is invalid. The following error was thrown: ${e}`);
  }
});

RocketChat.getFullUserData = function ({
  userId,
  filter,
  limit: l
}) {
  const username = s.trim(filter);
  const userToRetrieveFullUserData = RocketChat.models.Users.findOneByUsername(username);
  const isMyOwnInfo = userToRetrieveFullUserData && userToRetrieveFullUserData._id === userId;
  const viewFullOtherUserInfo = RocketChat.authz.hasPermission(userId, 'view-full-other-user-info');
  const limit = !viewFullOtherUserInfo ? 1 : l;

  if (!username && limit <= 1) {
    return undefined;
  }

  const _customFields = isMyOwnInfo || viewFullOtherUserInfo ? customFields : publicCustomFields;

  const fields = viewFullOtherUserInfo ? (0, _objectSpread2.default)({}, defaultFields, fullFields, _customFields) : (0, _objectSpread2.default)({}, defaultFields, _customFields);
  const options = {
    fields,
    limit,
    sort: {
      username: 1
    }
  };

  if (!username) {
    return RocketChat.models.Users.find({}, options);
  }

  if (limit === 1) {
    return RocketChat.models.Users.findByUsername(username, options);
  }

  const usernameReg = new RegExp(s.escapeRegExp(username), 'i');
  return RocketChat.models.Users.findByUsernameNameOrEmailAddress(usernameReg, options);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getRoomByNameOrIdWithOptionToJoin.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/getRoomByNameOrIdWithOptionToJoin.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.getRoomByNameOrIdWithOptionToJoin = function _getRoomByNameOrIdWithOptionToJoin({
  currentUserId,
  nameOrId,
  type = '',
  tryDirectByUserIdOnly = false,
  joinChannel = true,
  errorOnEmpty = true
}) {
  let room; //If the nameOrId starts with #, then let's try to find a channel or group

  if (nameOrId.startsWith('#')) {
    nameOrId = nameOrId.substring(1);
    room = RocketChat.models.Rooms.findOneByIdOrName(nameOrId);
  } else if (nameOrId.startsWith('@') || type === 'd') {
    //If the nameOrId starts with @ OR type is 'd', then let's try just a direct message
    nameOrId = nameOrId.replace('@', '');
    let roomUser;

    if (tryDirectByUserIdOnly) {
      roomUser = RocketChat.models.Users.findOneById(nameOrId);
    } else {
      roomUser = RocketChat.models.Users.findOne({
        $or: [{
          _id: nameOrId
        }, {
          username: nameOrId
        }]
      });
    }

    const rid = _.isObject(roomUser) ? [currentUserId, roomUser._id].sort().join('') : nameOrId;
    room = RocketChat.models.Rooms.findOneById(rid); //If the room hasn't been found yet, let's try some more

    if (!_.isObject(room)) {
      //If the roomUser wasn't found, then there's no destination to point towards
      //so return out based upon errorOnEmpty
      if (!_.isObject(roomUser)) {
        if (errorOnEmpty) {
          throw new Meteor.Error('invalid-channel');
        } else {
          return;
        }
      }

      room = Meteor.runAsUser(currentUserId, function () {
        const {
          rid
        } = Meteor.call('createDirectMessage', roomUser.username);
        return RocketChat.models.Rooms.findOneById(rid);
      });
    }
  } else {
    //Otherwise, we'll treat this as a channel or group.
    room = RocketChat.models.Rooms.findOneByIdOrName(nameOrId);
  } //If no room was found, handle the room return based upon errorOnEmpty


  if (!room && errorOnEmpty) {
    throw new Meteor.Error('invalid-channel');
  } else if (!room) {
    return;
  } //If a room was found and they provided a type to search, then check
  //and if the type found isn't what we're looking for then handle
  //the return based upon errorOnEmpty


  if (type && room.t !== type) {
    if (errorOnEmpty) {
      throw new Meteor.Error('invalid-channel');
    } else {
      return;
    }
  } //If the room type is channel and joinChannel has been passed, try to join them
  //if they can't join the room, this will error out!


  if (room.t === 'c' && joinChannel) {
    const sub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, currentUserId);

    if (!sub) {
      Meteor.runAsUser(currentUserId, function () {
        return Meteor.call('joinRoom', room._id);
      });
    }
  }

  return room;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"loadMessageHistory.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/loadMessageHistory.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const hideMessagesOfType = [];
RocketChat.settings.get(/Message_HideType_.+/, function (key, value) {
  const type = key.replace('Message_HideType_', '');
  const types = type === 'mute_unmute' ? ['user-muted', 'user-unmuted'] : [type];
  return types.forEach(type => {
    const index = hideMessagesOfType.indexOf(type);

    if (value === true && index === -1) {
      return hideMessagesOfType.push(type);
    }

    if (index > -1) {
      return hideMessagesOfType.splice(index, 1);
    }
  });
});

RocketChat.loadMessageHistory = function loadMessageHistory({
  userId,
  rid,
  end,
  limit = 20,
  ls
}) {
  const options = {
    sort: {
      ts: -1
    },
    limit
  };

  if (!RocketChat.settings.get('Message_ShowEditedStatus')) {
    options.fields = {
      editedAt: 0
    };
  }

  let records;

  if (end != null) {
    records = RocketChat.models.Messages.findVisibleByRoomIdBeforeTimestampNotContainingTypes(rid, end, hideMessagesOfType, options).fetch();
  } else {
    records = RocketChat.models.Messages.findVisibleByRoomIdNotContainingTypes(rid, hideMessagesOfType, options).fetch();
  }

  const UI_Use_Real_Name = RocketChat.settings.get('UI_Use_Real_Name') === true;
  const messages = records.map(message => {
    message.starred = _.findWhere(message.starred, {
      _id: userId
    });

    if (message.u && message.u._id && UI_Use_Real_Name) {
      const user = RocketChat.models.Users.findOneById(message.u._id);
      message.u.name = user && user.name;
    }

    if (message.mentions && message.mentions.length && UI_Use_Real_Name) {
      message.mentions.forEach(mention => {
        const user = RocketChat.models.Users.findOneById(mention._id);
        mention.name = user && user.name;
      });
    }

    return message;
  });
  let unreadNotLoaded = 0;
  let firstUnread;

  if (ls != null) {
    const firstMessage = messages[messages.length - 1];

    if ((firstMessage != null ? firstMessage.ts : undefined) > ls) {
      delete options.limit;
      const unreadMessages = RocketChat.models.Messages.findVisibleByRoomIdBetweenTimestampsNotContainingTypes(rid, ls, firstMessage.ts, hideMessagesOfType, {
        limit: 1,
        sort: {
          ts: 1
        }
      });
      firstUnread = unreadMessages.fetch()[0];
      unreadNotLoaded = unreadMessages.count();
    }
  }

  return {
    messages,
    firstUnread,
    unreadNotLoaded
  };
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeUserFromRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/removeUserFromRoom.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.removeUserFromRoom = function (rid, user) {
  const room = RocketChat.models.Rooms.findOneById(rid);

  if (room) {
    RocketChat.callbacks.run('beforeLeaveRoom', user, room);
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, user._id, {
      fields: {
        _id: 1
      }
    });

    if (subscription) {
      const removedUser = user;
      RocketChat.models.Messages.createUserLeaveWithRoomIdAndUser(rid, removedUser);
    }

    if (room.t === 'l') {
      RocketChat.models.Messages.createCommandWithRoomIdAndUser('survey', rid, user);
    }

    RocketChat.models.Subscriptions.removeByRoomIdAndUserId(rid, user._id);
    Meteor.defer(function () {
      // TODO: CACHE: maybe a queue?
      RocketChat.callbacks.run('afterLeaveRoom', user, room);
    });
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveUser.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/saveUser.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);

RocketChat.saveUser = function (userId, userData) {
  const user = RocketChat.models.Users.findOneById(userId);

  const existingRoles = _.pluck(RocketChat.authz.getRoles(), '_id');

  if (userData._id && userId !== userData._id && !RocketChat.authz.hasPermission(userId, 'edit-other-user-info')) {
    throw new Meteor.Error('error-action-not-allowed', 'Editing user is not allowed', {
      method: 'insertOrUpdateUser',
      action: 'Editing_user'
    });
  }

  if (!userData._id && !RocketChat.authz.hasPermission(userId, 'create-user')) {
    throw new Meteor.Error('error-action-not-allowed', 'Adding user is not allowed', {
      method: 'insertOrUpdateUser',
      action: 'Adding_user'
    });
  }

  if (userData.roles && _.difference(userData.roles, existingRoles).length > 0) {
    throw new Meteor.Error('error-action-not-allowed', 'The field Roles consist invalid role name', {
      method: 'insertOrUpdateUser',
      action: 'Assign_role'
    });
  }

  if (userData.roles && _.indexOf(userData.roles, 'admin') >= 0 && !RocketChat.authz.hasPermission(userId, 'assign-admin-role')) {
    throw new Meteor.Error('error-action-not-allowed', 'Assigning admin is not allowed', {
      method: 'insertOrUpdateUser',
      action: 'Assign_admin'
    });
  }

  if (!userData._id && !s.trim(userData.name)) {
    throw new Meteor.Error('error-the-field-is-required', 'The field Name is required', {
      method: 'insertOrUpdateUser',
      field: 'Name'
    });
  }

  if (!userData._id && !s.trim(userData.username)) {
    throw new Meteor.Error('error-the-field-is-required', 'The field Username is required', {
      method: 'insertOrUpdateUser',
      field: 'Username'
    });
  }

  let nameValidation;

  try {
    nameValidation = new RegExp(`^${RocketChat.settings.get('UTF8_Names_Validation')}$`);
  } catch (e) {
    nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
  }

  if (userData.username && !nameValidation.test(userData.username)) {
    throw new Meteor.Error('error-input-is-not-a-valid-field', `${_.escape(userData.username)} is not a valid username`, {
      method: 'insertOrUpdateUser',
      input: userData.username,
      field: 'Username'
    });
  }

  if (!userData._id && !userData.password) {
    throw new Meteor.Error('error-the-field-is-required', 'The field Password is required', {
      method: 'insertOrUpdateUser',
      field: 'Password'
    });
  }

  if (!userData._id) {
    if (!RocketChat.checkUsernameAvailability(userData.username)) {
      throw new Meteor.Error('error-field-unavailable', `${_.escape(userData.username)} is already in use :(`, {
        method: 'insertOrUpdateUser',
        field: userData.username
      });
    }

    if (userData.email && !RocketChat.checkEmailAvailability(userData.email)) {
      throw new Meteor.Error('error-field-unavailable', `${_.escape(userData.email)} is already in use :(`, {
        method: 'insertOrUpdateUser',
        field: userData.email
      });
    }

    RocketChat.validateEmailDomain(userData.email); // insert user

    const createUser = {
      username: userData.username,
      password: userData.password,
      joinDefaultChannels: userData.joinDefaultChannels
    };

    if (userData.email) {
      createUser.email = userData.email;
    }

    const _id = Accounts.createUser(createUser);

    const updateUser = {
      $set: {
        name: userData.name,
        roles: userData.roles || ['user'],
        settings: userData.settings || {}
      }
    };

    if (typeof userData.requirePasswordChange !== 'undefined') {
      updateUser.$set.requirePasswordChange = userData.requirePasswordChange;
    }

    if (typeof userData.verified === 'boolean') {
      updateUser.$set['emails.0.verified'] = userData.verified;
    }

    Meteor.users.update({
      _id
    }, updateUser);

    if (userData.sendWelcomeEmail) {
      const header = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Header') || '');
      const footer = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Footer') || '');
      let subject;
      let html;

      if (RocketChat.settings.get('Accounts_UserAddedEmail_Customized')) {
        subject = RocketChat.settings.get('Accounts_UserAddedEmailSubject');
        html = RocketChat.settings.get('Accounts_UserAddedEmail');
      } else {
        subject = TAPi18n.__('Accounts_UserAddedEmailSubject_Default', {
          lng: user.language || RocketChat.settings.get('language') || 'en'
        });
        html = TAPi18n.__('Accounts_UserAddedEmail_Default', {
          lng: user.language || RocketChat.settings.get('language') || 'en'
        });
      }

      subject = RocketChat.placeholders.replace(subject);
      html = RocketChat.placeholders.replace(html, {
        name: userData.name,
        email: userData.email,
        password: userData.password
      });
      const email = {
        to: userData.email,
        from: RocketChat.settings.get('From_Email'),
        subject,
        html: header + html + footer
      };
      Meteor.defer(function () {
        try {
          Email.send(email);
        } catch (error) {
          throw new Meteor.Error('error-email-send-failed', `Error trying to send email: ${error.message}`, {
            function: 'RocketChat.saveUser',
            message: error.message
          });
        }
      });
    }

    userData._id = _id;

    if (RocketChat.settings.get('Accounts_SetDefaultAvatar') === true && userData.email) {
      const gravatarUrl = Gravatar.imageUrl(userData.email, {
        default: '404',
        size: 200,
        secure: true
      });

      try {
        RocketChat.setUserAvatar(userData, gravatarUrl, '', 'url');
      } catch (e) {//Ignore this error for now, as it not being successful isn't bad
      }
    }

    return _id;
  } else {
    // update user
    if (userData.username) {
      RocketChat.setUsername(userData._id, userData.username);
    }

    if (userData.name) {
      RocketChat.setRealName(userData._id, userData.name);
    }

    if (userData.email) {
      const shouldSendVerificationEmailToUser = userData.verified !== true;
      RocketChat.setEmail(userData._id, userData.email, shouldSendVerificationEmailToUser);
    }

    if (userData.password && userData.password.trim() && RocketChat.authz.hasPermission(userId, 'edit-other-user-password') && RocketChat.passwordPolicy.validate(userData.password)) {
      Accounts.setPassword(userData._id, userData.password.trim());
    }

    const updateUser = {
      $set: {}
    };

    if (userData.roles) {
      updateUser.$set.roles = userData.roles;
    }

    if (userData.settings) {
      updateUser.$set.settings = {
        preferences: userData.settings.preferences
      };
    }

    if (typeof userData.requirePasswordChange !== 'undefined') {
      updateUser.$set.requirePasswordChange = userData.requirePasswordChange;
    }

    if (typeof userData.verified === 'boolean') {
      updateUser.$set['emails.0.verified'] = userData.verified;
    }

    Meteor.users.update({
      _id: userData._id
    }, updateUser);
    return true;
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveCustomFields.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/saveCustomFields.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat.saveCustomFields = function (userId, formData) {
  if (s.trim(RocketChat.settings.get('Accounts_CustomFields')) !== '') {
    RocketChat.validateCustomFields(formData);
    return RocketChat.saveCustomFieldsWithoutValidation(userId, formData);
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveCustomFieldsWithoutValidation.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/saveCustomFieldsWithoutValidation.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat.saveCustomFieldsWithoutValidation = function (userId, formData) {
  if (s.trim(RocketChat.settings.get('Accounts_CustomFields')) !== '') {
    let customFieldsMeta;

    try {
      customFieldsMeta = JSON.parse(RocketChat.settings.get('Accounts_CustomFields'));
    } catch (e) {
      throw new Meteor.Error('error-invalid-customfield-json', 'Invalid JSON for Custom Fields');
    }

    const customFields = {};
    Object.keys(customFieldsMeta).forEach(key => customFields[key] = formData[key]);
    RocketChat.models.Users.setCustomFields(userId, customFields); // Update customFields of all Direct Messages' Rooms for userId

    RocketChat.models.Subscriptions.setCustomFieldsDirectMessagesByUserId(userId, customFields);
    Object.keys(customFields).forEach(fieldName => {
      if (!customFieldsMeta[fieldName].modifyRecordField) {
        return;
      }

      const modifyRecordField = customFieldsMeta[fieldName].modifyRecordField;
      const update = {};

      if (modifyRecordField.array) {
        update.$addToSet = {};
        update.$addToSet[modifyRecordField.field] = customFields[fieldName];
      } else {
        update.$set = {};
        update.$set[modifyRecordField.field] = customFields[fieldName];
      }

      RocketChat.models.Users.update(userId, update);
    });
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/sendMessage.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const objectMaybeIncluding = types => {
  return Match.Where(value => {
    Object.keys(types).forEach(field => {
      if (value[field] != null) {
        try {
          check(value[field], types[field]);
        } catch (error) {
          error.path = field;
          throw error;
        }
      }
    });
    return true;
  });
};

const validateAttachmentsFields = attachmentFields => {
  check(attachmentFields, objectMaybeIncluding({
    short: Boolean
  }));
  check(attachmentFields, objectMaybeIncluding({
    title: String,
    value: String
  }));
};

const validateAttachment = attachment => {
  check(attachment, objectMaybeIncluding({
    color: String,
    text: String,
    ts: Match.OneOf(String, Match.Integer),
    thumb_url: String,
    message_link: String,
    collapsed: Boolean,
    author_name: String,
    author_link: String,
    author_icon: String,
    title: String,
    title_link: String,
    title_link_download: Boolean,
    image_url: String,
    audio_url: String,
    video_url: String,
    fields: [Match.Any]
  }));

  if (attachment.fields && attachment.fields.length) {
    attachment.fields.map(validateAttachmentsFields);
  }
};

const validateBodyAttachments = attachments => attachments.map(validateAttachment);

RocketChat.sendMessage = function (user, message, room, upsert = false) {
  if (!user || !message || !room._id) {
    return false;
  }

  check(message, objectMaybeIncluding({
    _id: String,
    msg: String,
    text: String,
    alias: String,
    emoji: String,
    avatar: String,
    attachments: [Match.Any]
  }));

  if (Array.isArray(message.attachments) && message.attachments.length) {
    validateBodyAttachments(message.attachments);
  }

  if (!message.ts) {
    message.ts = new Date();
  }

  const {
    _id,
    username,
    name
  } = user;
  message.u = {
    _id,
    username,
    name
  };
  message.rid = room._id;

  if (!Match.test(message.msg, String)) {
    message.msg = '';
  }

  if (message.ts == null) {
    message.ts = new Date();
  }

  if (RocketChat.settings.get('Message_Read_Receipt_Enabled')) {
    message.unread = true;
  } // For the Rocket.Chat Apps :)


  if (message && Apps && Apps.isLoaded()) {
    const prevent = Promise.await(Apps.getBridges().getListenerBridge().messageEvent('IPreMessageSentPrevent', message));

    if (prevent) {
      throw new Meteor.Error('error-app-prevented-sending', 'A Rocket.Chat App prevented the messaging sending.');
    }

    let result;
    result = Promise.await(Apps.getBridges().getListenerBridge().messageEvent('IPreMessageSentExtend', message));
    result = Promise.await(Apps.getBridges().getListenerBridge().messageEvent('IPreMessageSentModify', result));

    if (typeof result === 'object') {
      message = Object.assign(message, result);
    }
  }

  if (message.parseUrls !== false) {
    message.html = message.msg;
    message = RocketChat.Markdown.code(message);
    const urls = message.html.match(/([A-Za-z]{3,9}):\/\/([-;:&=\+\$,\w]+@{1})?([-A-Za-z0-9\.]+)+:?(\d+)?((\/[-\+=!:~%\/\.@\,\(\)\w]*)?\??([-\+=&!:;%@\/\.\,\w]+)?(?:#([^\s\)]+))?)?/g);

    if (urls) {
      message.urls = urls.map(url => ({
        url
      }));
    }

    message = RocketChat.Markdown.mountTokensBack(message, false);
    message.msg = message.html;
    delete message.html;
    delete message.tokens;
  }

  message = RocketChat.callbacks.run('beforeSaveMessage', message);

  if (message) {
    // Avoid saving sandstormSessionId to the database
    let sandstormSessionId = null;

    if (message.sandstormSessionId) {
      sandstormSessionId = message.sandstormSessionId;
      delete message.sandstormSessionId;
    }

    if (message._id && upsert) {
      const _id = message._id;
      delete message._id;
      RocketChat.models.Messages.upsert({
        _id,
        'u._id': message.u._id
      }, message);
      message._id = _id;
    } else {
      message._id = RocketChat.models.Messages.insert(message);
    }

    if (Apps && Apps.isLoaded()) {
      // This returns a promise, but it won't mutate anything about the message
      // so, we don't really care if it is successful or fails
      Apps.getBridges().getListenerBridge().messageEvent('IPostMessageSent', message);
    }
    /*
    Defer other updates as their return is not interesting to the user
    */


    Meteor.defer(() => {
      // Execute all callbacks
      message.sandstormSessionId = sandstormSessionId;
      return RocketChat.callbacks.run('afterSaveMessage', message, room, user._id);
    });
    return message;
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/settings.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const blockedSettings = {};

if (process.env.SETTINGS_BLOCKED) {
  process.env.SETTINGS_BLOCKED.split(',').forEach(settingId => blockedSettings[settingId] = 1);
}

const hiddenSettings = {};

if (process.env.SETTINGS_HIDDEN) {
  process.env.SETTINGS_HIDDEN.split(',').forEach(settingId => hiddenSettings[settingId] = 1);
}

RocketChat.settings._sorter = {};
/*
* Add a setting
* @param {String} _id
* @param {Mixed} value
* @param {Object} setting
*/

RocketChat.settings.add = function (_id, value, options = {}) {
  if (options == null) {
    options = {};
  }

  if (!_id || value == null) {
    return false;
  }

  if (RocketChat.settings._sorter[options.group] == null) {
    RocketChat.settings._sorter[options.group] = 0;
  }

  options.packageValue = value;
  options.valueSource = 'packageValue';
  options.hidden = options.hidden || false;
  options.blocked = options.blocked || false;

  if (options.sorter == null) {
    options.sorter = RocketChat.settings._sorter[options.group]++;
  }

  if (options.enableQuery != null) {
    options.enableQuery = JSON.stringify(options.enableQuery);
  }

  if (options.i18nDefaultQuery != null) {
    options.i18nDefaultQuery = JSON.stringify(options.i18nDefaultQuery);
  }

  if (typeof process !== 'undefined' && process.env && process.env[_id]) {
    value = process.env[_id];

    if (value.toLowerCase() === 'true') {
      value = true;
    } else if (value.toLowerCase() === 'false') {
      value = false;
    }

    options.processEnvValue = value;
    options.valueSource = 'processEnvValue';
  } else if (Meteor.settings && typeof Meteor.settings[_id] !== 'undefined') {
    if (Meteor.settings[_id] == null) {
      return false;
    }

    value = Meteor.settings[_id];
    options.meteorSettingsValue = value;
    options.valueSource = 'meteorSettingsValue';
  }

  if (options.i18nLabel == null) {
    options.i18nLabel = _id;
  }

  if (options.i18nDescription == null) {
    options.i18nDescription = `${_id}_Description`;
  }

  if (blockedSettings[_id] != null) {
    options.blocked = true;
  }

  if (hiddenSettings[_id] != null) {
    options.hidden = true;
  }

  if (options.autocomplete == null) {
    options.autocomplete = true;
  }

  if (typeof process !== 'undefined' && process.env && process.env[`OVERWRITE_SETTING_${_id}`]) {
    let value = process.env[`OVERWRITE_SETTING_${_id}`];

    if (value.toLowerCase() === 'true') {
      value = true;
    } else if (value.toLowerCase() === 'false') {
      value = false;
    }

    options.value = value;
    options.processEnvValue = value;
    options.valueSource = 'processEnvValue';
  }

  const updateOperations = {
    $set: options,
    $setOnInsert: {
      createdAt: new Date()
    }
  };

  if (options.editor != null) {
    updateOperations.$setOnInsert.editor = options.editor;
    delete options.editor;
  }

  if (options.value == null) {
    if (options.force === true) {
      updateOperations.$set.value = options.packageValue;
    } else {
      updateOperations.$setOnInsert.value = value;
    }
  }

  const query = _.extend({
    _id
  }, updateOperations.$set);

  if (options.section == null) {
    updateOperations.$unset = {
      section: 1
    };
    query.section = {
      $exists: false
    };
  }

  const existantSetting = RocketChat.models.Settings.db.findOne(query);

  if (existantSetting != null) {
    if (existantSetting.editor == null && updateOperations.$setOnInsert.editor != null) {
      updateOperations.$set.editor = updateOperations.$setOnInsert.editor;
      delete updateOperations.$setOnInsert.editor;
    }
  } else {
    updateOperations.$set.ts = new Date();
  }

  return RocketChat.models.Settings.upsert({
    _id
  }, updateOperations);
};
/*
* Add a setting group
* @param {String} _id
*/


RocketChat.settings.addGroup = function (_id, options = {}, cb) {
  if (!_id) {
    return false;
  }

  if (_.isFunction(options)) {
    cb = options;
    options = {};
  }

  if (options.i18nLabel == null) {
    options.i18nLabel = _id;
  }

  if (options.i18nDescription == null) {
    options.i18nDescription = `${_id}_Description`;
  }

  options.ts = new Date();
  options.blocked = false;
  options.hidden = false;

  if (blockedSettings[_id] != null) {
    options.blocked = true;
  }

  if (hiddenSettings[_id] != null) {
    options.hidden = true;
  }

  RocketChat.models.Settings.upsert({
    _id
  }, {
    $set: options,
    $setOnInsert: {
      type: 'group',
      createdAt: new Date()
    }
  });

  if (cb != null) {
    cb.call({
      add(id, value, options) {
        if (options == null) {
          options = {};
        }

        options.group = _id;
        return RocketChat.settings.add(id, value, options);
      },

      section(section, cb) {
        return cb.call({
          add(id, value, options) {
            if (options == null) {
              options = {};
            }

            options.group = _id;
            options.section = section;
            return RocketChat.settings.add(id, value, options);
          }

        });
      }

    });
  }
};
/*
* Remove a setting by id
* @param {String} _id
*/


RocketChat.settings.removeById = function (_id) {
  if (!_id) {
    return false;
  }

  return RocketChat.models.Settings.removeById(_id);
};
/*
* Update a setting by id
* @param {String} _id
*/


RocketChat.settings.updateById = function (_id, value, editor) {
  if (!_id || value == null) {
    return false;
  }

  if (editor != null) {
    return RocketChat.models.Settings.updateValueAndEditorById(_id, value, editor);
  }

  return RocketChat.models.Settings.updateValueById(_id, value);
};
/*
* Update options of a setting by id
* @param {String} _id
*/


RocketChat.settings.updateOptionsById = function (_id, options) {
  if (!_id || options == null) {
    return false;
  }

  return RocketChat.models.Settings.updateOptionsById(_id, options);
};
/*
* Update a setting by id
* @param {String} _id
*/


RocketChat.settings.clearById = function (_id) {
  if (_id == null) {
    return false;
  }

  return RocketChat.models.Settings.updateValueById(_id, undefined);
};
/*
* Update a setting by id
*/


RocketChat.settings.init = function () {
  RocketChat.settings.initialLoad = true;
  RocketChat.models.Settings.find().observe({
    added(record) {
      Meteor.settings[record._id] = record.value;

      if (record.env === true) {
        process.env[record._id] = record.value;
      }

      return RocketChat.settings.load(record._id, record.value, RocketChat.settings.initialLoad);
    },

    changed(record) {
      Meteor.settings[record._id] = record.value;

      if (record.env === true) {
        process.env[record._id] = record.value;
      }

      return RocketChat.settings.load(record._id, record.value, RocketChat.settings.initialLoad);
    },

    removed(record) {
      delete Meteor.settings[record._id];

      if (record.env === true) {
        delete process.env[record._id];
      }

      return RocketChat.settings.load(record._id, undefined, RocketChat.settings.initialLoad);
    }

  });
  RocketChat.settings.initialLoad = false;
  RocketChat.settings.afterInitialLoad.forEach(fn => fn(Meteor.settings));
};

RocketChat.settings.afterInitialLoad = [];

RocketChat.settings.onAfterInitialLoad = function (fn) {
  RocketChat.settings.afterInitialLoad.push(fn);

  if (RocketChat.settings.initialLoad === false) {
    return fn(Meteor.settings);
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setUserAvatar.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/setUserAvatar.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.setUserAvatar = function (user, dataURI, contentType, service) {
  let encoding;
  let image;

  if (service === 'initials') {
    return RocketChat.models.Users.setAvatarOrigin(user._id, service);
  } else if (service === 'url') {
    let result = null;

    try {
      result = HTTP.get(dataURI, {
        npmRequestOptions: {
          encoding: 'binary'
        }
      });
    } catch (error) {
      if (!error.response || error.response.statusCode !== 404) {
        console.log(`Error while handling the setting of the avatar from a url (${dataURI}) for ${user.username}:`, error);
        throw new Meteor.Error('error-avatar-url-handling', `Error while handling avatar setting from a URL (${dataURI}) for ${user.username}`, {
          function: 'RocketChat.setUserAvatar',
          url: dataURI,
          username: user.username
        });
      }
    }

    if (result.statusCode !== 200) {
      console.log(`Not a valid response, ${result.statusCode}, from the avatar url: ${dataURI}`);
      throw new Meteor.Error('error-avatar-invalid-url', `Invalid avatar URL: ${dataURI}`, {
        function: 'RocketChat.setUserAvatar',
        url: dataURI
      });
    }

    if (!/image\/.+/.test(result.headers['content-type'])) {
      console.log(`Not a valid content-type from the provided url, ${result.headers['content-type']}, from the avatar url: ${dataURI}`);
      throw new Meteor.Error('error-avatar-invalid-url', `Invalid avatar URL: ${dataURI}`, {
        function: 'RocketChat.setUserAvatar',
        url: dataURI
      });
    }

    encoding = 'binary';
    image = result.content;
    contentType = result.headers['content-type'];
  } else if (service === 'rest') {
    encoding = 'binary';
    image = dataURI;
  } else {
    const fileData = RocketChatFile.dataURIParse(dataURI);
    encoding = 'base64';
    image = fileData.image;
    contentType = fileData.contentType;
  }

  const buffer = new Buffer(image, encoding);
  const fileStore = FileUpload.getStore('Avatars');
  fileStore.deleteByName(user.username);
  const file = {
    userId: user._id,
    type: contentType,
    size: buffer.length
  };
  fileStore.insert(file, buffer, () => {
    Meteor.setTimeout(function () {
      RocketChat.models.Users.setAvatarOrigin(user._id, service);
      RocketChat.Notifications.notifyLogged('updateAvatar', {
        username: user.username
      });
    }, 500);
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setUsername.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/setUsername.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat._setUsername = function (userId, u) {
  const username = s.trim(u);

  if (!userId || !username) {
    return false;
  }

  let nameValidation;

  try {
    nameValidation = new RegExp(`^${RocketChat.settings.get('UTF8_Names_Validation')}$`);
  } catch (error) {
    nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
  }

  if (!nameValidation.test(username)) {
    return false;
  }

  const user = RocketChat.models.Users.findOneById(userId); // User already has desired username, return

  if (user.username === username) {
    return user;
  }

  const previousUsername = user.username; // Check username availability or if the user already owns a different casing of the name

  if (!previousUsername || !(username.toLowerCase() === previousUsername.toLowerCase())) {
    if (!RocketChat.checkUsernameAvailability(username)) {
      return false;
    }
  } //If first time setting username, send Enrollment Email


  try {
    if (!previousUsername && user.emails && user.emails.length > 0 && RocketChat.settings.get('Accounts_Enrollment_Email')) {
      Accounts.sendEnrollmentEmail(user._id);
    }
  } catch (e) {
    console.error(e);
  }
  /* globals getAvatarSuggestionForUser */


  user.username = username;

  if (!previousUsername && RocketChat.settings.get('Accounts_SetDefaultAvatar') === true) {
    const avatarSuggestions = getAvatarSuggestionForUser(user);
    let gravatar;
    Object.keys(avatarSuggestions).some(service => {
      const avatarData = avatarSuggestions[service];

      if (service !== 'gravatar') {
        RocketChat.setUserAvatar(user, avatarData.blob, avatarData.contentType, service);
        gravatar = null;
        return true;
      } else {
        gravatar = avatarData;
      }
    });

    if (gravatar != null) {
      RocketChat.setUserAvatar(user, gravatar.blob, gravatar.contentType, 'gravatar');
    }
  } // Username is available; if coming from old username, update all references


  if (previousUsername) {
    RocketChat.models.Messages.updateAllUsernamesByUserId(user._id, username);
    RocketChat.models.Messages.updateUsernameOfEditByUserId(user._id, username);
    RocketChat.models.Messages.findByMention(previousUsername).forEach(function (msg) {
      const updatedMsg = msg.msg.replace(new RegExp(`@${previousUsername}`, 'ig'), `@${username}`);
      return RocketChat.models.Messages.updateUsernameAndMessageOfMentionByIdAndOldUsername(msg._id, previousUsername, username, updatedMsg);
    });
    RocketChat.models.Rooms.replaceUsername(previousUsername, username);
    RocketChat.models.Rooms.replaceMutedUsername(previousUsername, username);
    RocketChat.models.Rooms.replaceUsernameOfUserByUserId(user._id, username);
    RocketChat.models.Subscriptions.setUserUsernameByUserId(user._id, username);
    RocketChat.models.Subscriptions.setNameForDirectRoomsWithOldName(previousUsername, username);
    RocketChat.models.LivechatDepartmentAgents.replaceUsernameOfAgentByUserId(user._id, username);
    const fileStore = FileUpload.getStore('Avatars');
    const file = fileStore.model.findOneByName(previousUsername);

    if (file) {
      fileStore.model.updateFileNameById(file._id, username);
    }
  } // Set new username*


  RocketChat.models.Users.setUsername(user._id, username);
  return user;
};

RocketChat.setUsername = RocketChat.RateLimiter.limitFunction(RocketChat._setUsername, 1, 60000, {
  [0](userId) {
    return !userId || !RocketChat.authz.hasPermission(userId, 'edit-other-user-info');
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setRealName.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/setRealName.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat._setRealName = function (userId, name) {
  name = s.trim(name);

  if (!userId || !name) {
    return false;
  }

  const user = RocketChat.models.Users.findOneById(userId); // User already has desired name, return

  if (user.name === name) {
    return user;
  } // Set new name


  RocketChat.models.Users.setName(user._id, name);
  user.name = name;
  RocketChat.models.Subscriptions.updateDirectFNameByName(user.username, name);

  if (RocketChat.settings.get('UI_Use_Real_Name') === true) {
    RocketChat.Notifications.notifyLogged('Users:NameChanged', {
      _id: user._id,
      name: user.name,
      username: user.username
    });
  }

  return user;
};

RocketChat.setRealName = RocketChat.RateLimiter.limitFunction(RocketChat._setRealName, 1, 60000, {
  0() {
    return !Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'edit-other-user-info');
  } // Administrators have permission to change others names, so don't limit those


});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setEmail.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/setEmail.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat._setEmail = function (userId, email, shouldSendVerificationEmail = true) {
  email = s.trim(email);

  if (!userId) {
    throw new Meteor.Error('error-invalid-user', 'Invalid user', {
      function: '_setEmail'
    });
  }

  if (!email) {
    throw new Meteor.Error('error-invalid-email', 'Invalid email', {
      function: '_setEmail'
    });
  }

  RocketChat.validateEmailDomain(email);
  const user = RocketChat.models.Users.findOneById(userId); // User already has desired username, return

  if (user.emails && user.emails[0] && user.emails[0].address === email) {
    return user;
  } // Check email availability


  if (!RocketChat.checkEmailAvailability(email)) {
    throw new Meteor.Error('error-field-unavailable', `${email} is already in use :(`, {
      function: '_setEmail',
      field: email
    });
  } // Set new email


  RocketChat.models.Users.setEmail(user._id, email);
  user.email = email;

  if (shouldSendVerificationEmail === true) {
    Meteor.call('sendConfirmationEmail', user.email);
  }

  return user;
};

RocketChat.setEmail = RocketChat.RateLimiter.limitFunction(RocketChat._setEmail, 1, 60000, {
  0() {
    return !Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'edit-other-user-info');
  } // Administrators have permission to change others emails, so don't limit those


});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unarchiveRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/unarchiveRoom.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.unarchiveRoom = function (rid) {
  RocketChat.models.Rooms.unarchiveById(rid);
  RocketChat.models.Subscriptions.unarchiveByRoomId(rid);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"updateMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/updateMessage.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.updateMessage = function (message, user) {
  // If we keep history of edits, insert a new message to store history information
  if (RocketChat.settings.get('Message_KeepHistory')) {
    RocketChat.models.Messages.cloneAndSaveAsHistoryById(message._id);
  }

  message.editedAt = new Date();
  message.editedBy = {
    _id: user._id,
    username: user.username
  };
  const urls = message.msg.match(/([A-Za-z]{3,9}):\/\/([-;:&=\+\$,\w]+@{1})?([-A-Za-z0-9\.]+)+:?(\d+)?((\/[-\+=!:~%\/\.@\,\w]*)?\??([-\+=&!:;%@\/\.\,\w]+)?(?:#([^\s\)]+))?)?/g) || [];
  message.urls = urls.map(url => ({
    url
  }));
  message = RocketChat.callbacks.run('beforeSaveMessage', message);
  const tempid = message._id;
  delete message._id;
  RocketChat.models.Messages.update({
    _id: tempid
  }, {
    $set: message
  });
  const room = RocketChat.models.Rooms.findOneById(message.rid);
  Meteor.defer(function () {
    RocketChat.callbacks.run('afterSaveMessage', RocketChat.models.Messages.findOneById(tempid), room, user._id);
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"validateCustomFields.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/validateCustomFields.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat.validateCustomFields = function (fields) {
  // Special Case:
  // If an admin didn't set any custom fields there's nothing to validate against so consider any customFields valid
  if (s.trim(RocketChat.settings.get('Accounts_CustomFields')) === '') {
    return;
  }

  let customFieldsMeta;

  try {
    customFieldsMeta = JSON.parse(RocketChat.settings.get('Accounts_CustomFields'));
  } catch (e) {
    throw new Meteor.Error('error-invalid-customfield-json', 'Invalid JSON for Custom Fields');
  }

  const customFields = {};
  Object.keys(customFieldsMeta).forEach(fieldName => {
    const field = customFieldsMeta[fieldName];
    customFields[fieldName] = fields[fieldName];
    const fieldValue = s.trim(fields[fieldName]);

    if (field.required && fieldValue === '') {
      throw new Meteor.Error('error-user-registration-custom-field', `Field ${fieldName} is required`, {
        method: 'registerUser'
      });
    }

    if (field.type === 'select' && field.options.indexOf(fields[fieldName]) === -1) {
      throw new Meteor.Error('error-user-registration-custom-field', `Value for field ${fieldName} is invalid`, {
        method: 'registerUser'
      });
    }

    if (field.maxLength && fieldValue.length > field.maxLength) {
      throw new Meteor.Error('error-user-registration-custom-field', `Max length of field ${fieldName} ${field.maxLength}`, {
        method: 'registerUser'
      });
    }

    if (field.minLength && fieldValue.length < field.minLength) {
      throw new Meteor.Error('error-user-registration-custom-field', `Min length of field ${fieldName} ${field.minLength}`, {
        method: 'registerUser'
      });
    }
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Notifications.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/Notifications.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.Notifications = new class {
  constructor() {
    this.debug = false;
    this.streamAll = new Meteor.Streamer('notify-all');
    this.streamLogged = new Meteor.Streamer('notify-logged');
    this.streamRoom = new Meteor.Streamer('notify-room');
    this.streamRoomUsers = new Meteor.Streamer('notify-room-users');
    this.streamUser = new Meteor.Streamer('notify-user');
    this.streamAll.allowWrite('none');
    this.streamLogged.allowWrite('none');
    this.streamRoom.allowWrite('none');
    this.streamRoomUsers.allowWrite(function (eventName, ...args) {
      const [roomId, e] = eventName.split('/'); // const user = Meteor.users.findOne(this.userId, {
      // 	fields: {
      // 		username: 1
      // 	}
      // });

      if (RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(roomId, this.userId) != null) {
        const subscriptions = RocketChat.models.Subscriptions.findByRoomIdAndNotUserId(roomId, this.userId).fetch();
        subscriptions.forEach(subscription => RocketChat.Notifications.notifyUser(subscription.u._id, e, ...args));
      }

      return false;
    });
    this.streamUser.allowWrite('logged');
    this.streamAll.allowRead('all');
    this.streamLogged.allowRead('logged');
    this.streamRoom.allowRead(function (eventName, extraData) {
      const [roomId] = eventName.split('/');
      const room = RocketChat.models.Rooms.findOneById(roomId);

      if (!room) {
        console.warn(`Invalid streamRoom eventName: "${eventName}"`);
        return false;
      }

      if (room.t === 'l' && extraData && extraData.token && room.v.token === extraData.token) {
        return true;
      }

      if (this.userId == null) {
        return false;
      }

      const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(roomId, this.userId, {
        fields: {
          _id: 1
        }
      });
      return subscription != null;
    });
    this.streamRoomUsers.allowRead('none');
    this.streamUser.allowRead(function (eventName) {
      const [userId] = eventName.split('/');
      return this.userId != null && this.userId === userId;
    });
  }

  notifyAll(eventName, ...args) {
    if (this.debug === true) {
      console.log('notifyAll', arguments);
    }

    args.unshift(eventName);
    return this.streamAll.emit.apply(this.streamAll, args);
  }

  notifyLogged(eventName, ...args) {
    if (this.debug === true) {
      console.log('notifyLogged', arguments);
    }

    args.unshift(eventName);
    return this.streamLogged.emit.apply(this.streamLogged, args);
  }

  notifyRoom(room, eventName, ...args) {
    if (this.debug === true) {
      console.log('notifyRoom', arguments);
    }

    args.unshift(`${room}/${eventName}`);
    return this.streamRoom.emit.apply(this.streamRoom, args);
  }

  notifyUser(userId, eventName, ...args) {
    if (this.debug === true) {
      console.log('notifyUser', arguments);
    }

    args.unshift(`${userId}/${eventName}`);
    return this.streamUser.emit.apply(this.streamUser, args);
  }

  notifyAllInThisInstance(eventName, ...args) {
    if (this.debug === true) {
      console.log('notifyAll', arguments);
    }

    args.unshift(eventName);
    return this.streamAll.emitWithoutBroadcast.apply(this.streamAll, args);
  }

  notifyLoggedInThisInstance(eventName, ...args) {
    if (this.debug === true) {
      console.log('notifyLogged', arguments);
    }

    args.unshift(eventName);
    return this.streamLogged.emitWithoutBroadcast.apply(this.streamLogged, args);
  }

  notifyRoomInThisInstance(room, eventName, ...args) {
    if (this.debug === true) {
      console.log('notifyRoomAndBroadcast', arguments);
    }

    args.unshift(`${room}/${eventName}`);
    return this.streamRoom.emitWithoutBroadcast.apply(this.streamRoom, args);
  }

  notifyUserInThisInstance(userId, eventName, ...args) {
    if (this.debug === true) {
      console.log('notifyUserAndBroadcast', arguments);
    }

    args.unshift(`${userId}/${eventName}`);
    return this.streamUser.emitWithoutBroadcast.apply(this.streamUser, args);
  }

}();
RocketChat.Notifications.streamRoom.allowWrite(function (eventName, username, typing, extraData) {
  const [roomId, e] = eventName.split('/');

  if (e === 'webrtc') {
    return true;
  }

  if (e === 'typing') {
    const key = RocketChat.settings.get('UI_Use_Real_Name') ? 'name' : 'username'; // typing from livechat widget

    if (extraData && extraData.token) {
      const room = RocketChat.models.Rooms.findOneById(roomId);

      if (room && room.t === 'l' && room.v.token === extraData.token) {
        return true;
      }
    }

    const user = Meteor.users.findOne(this.userId, {
      fields: {
        [key]: 1
      }
    });

    if (!user) {
      return false;
    }

    return user[key] === username;
  }

  return false;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"notifications":{"audio.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/notifications/audio.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  shouldNotifyAudio: () => shouldNotifyAudio,
  notifyAudioUser: () => notifyAudioUser
});

function shouldNotifyAudio({
  disableAllMessageNotifications,
  status,
  audioNotifications,
  hasMentionToAll,
  hasMentionToHere,
  isHighlighted,
  hasMentionToUser,
  roomType
}) {
  if (disableAllMessageNotifications && audioNotifications == null) {
    return false;
  }

  if (status === 'busy' || audioNotifications === 'nothing') {
    return false;
  }

  if (!audioNotifications && RocketChat.settings.get('Accounts_Default_User_Preferences_audioNotifications') === 'all') {
    return true;
  }

  return roomType === 'd' || !disableAllMessageNotifications && (hasMentionToAll || hasMentionToHere) || isHighlighted || audioNotifications === 'all' || hasMentionToUser;
}

function notifyAudioUser(userId, message, room) {
  RocketChat.metrics.notificationsSent.inc({
    notification_type: 'audio'
  });
  RocketChat.Notifications.notifyUser(userId, 'audioNotification', {
    payload: {
      _id: message._id,
      rid: message.rid,
      sender: message.u,
      type: room.t,
      name: room.name
    }
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"desktop.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/notifications/desktop.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  notifyDesktopUser: () => notifyDesktopUser,
  shouldNotifyDesktop: () => shouldNotifyDesktop
});

function notifyDesktopUser({
  userId,
  user,
  message,
  room,
  duration,
  notificationMessage
}) {
  const {
    title,
    text
  } = RocketChat.roomTypes.getConfig(room.t).getNotificationDetails(room, user, notificationMessage);
  RocketChat.metrics.notificationsSent.inc({
    notification_type: 'desktop'
  });
  RocketChat.Notifications.notifyUser(userId, 'notification', {
    title,
    text,
    duration,
    payload: {
      _id: message._id,
      rid: message.rid,
      sender: message.u,
      type: room.t,
      name: room.name
    }
  });
}

function shouldNotifyDesktop({
  disableAllMessageNotifications,
  status,
  desktopNotifications,
  hasMentionToAll,
  hasMentionToHere,
  isHighlighted,
  hasMentionToUser,
  roomType
}) {
  if (disableAllMessageNotifications && desktopNotifications == null) {
    return false;
  }

  if (status === 'busy' || desktopNotifications === 'nothing') {
    return false;
  }

  if (!desktopNotifications) {
    if (RocketChat.settings.get('Accounts_Default_User_Preferences_desktopNotifications') === 'all') {
      return true;
    }

    if (RocketChat.settings.get('Accounts_Default_User_Preferences_desktopNotifications') === 'nothing') {
      return false;
    }
  }

  return roomType === 'd' || !disableAllMessageNotifications && (hasMentionToAll || hasMentionToHere) || isHighlighted || desktopNotifications === 'all' || hasMentionToUser;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"email.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/notifications/email.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  sendEmail: () => sendEmail,
  shouldNotifyEmail: () => shouldNotifyEmail
});
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
let contentHeader;
RocketChat.settings.get('Email_Header', (key, value) => {
  contentHeader = RocketChat.placeholders.replace(value || '');
});
let contentFooter;
RocketChat.settings.get('Email_Footer', (key, value) => {
  contentFooter = RocketChat.placeholders.replace(value || '');
});
const divisorMessage = '<hr style="margin: 20px auto; border: none; border-bottom: 1px solid #dddddd;">';

function getEmailContent({
  message,
  user,
  room
}) {
  const lng = user && user.language || RocketChat.settings.get('language') || 'en';
  const roomName = s.escapeHTML(`#${RocketChat.roomTypes.getRoomName(room.t, room)}`);
  const userName = s.escapeHTML(RocketChat.settings.get('UI_Use_Real_Name') ? message.u.name || message.u.username : message.u.username);

  const header = TAPi18n.__(room.t === 'd' ? 'User_sent_a_message_to_you' : 'User_sent_a_message_on_channel', {
    username: userName,
    channel: roomName,
    lng
  });

  if (message.msg !== '') {
    let messageContent = s.escapeHTML(message.msg);
    message = RocketChat.callbacks.run('renderMessage', message);

    if (message.tokens && message.tokens.length > 0) {
      message.tokens.forEach(token => {
        token.text = token.text.replace(/([^\$])(\$[^\$])/gm, '$1$$$2');
        messageContent = messageContent.replace(token.token, token.text);
      });
    }

    return `${header}<br/><br/>${messageContent.replace(/\n/gm, '<br/>')}`;
  }

  if (message.file) {
    const fileHeader = TAPi18n.__(room.t === 'd' ? 'User_uploaded_a_file_to_you' : 'User_uploaded_a_file_on_channel', {
      username: userName,
      channel: roomName,
      lng
    });

    let content = `${TAPi18n.__('Attachment_File_Uploaded')}: ${s.escapeHTML(message.file.name)}`;

    if (message.attachments && message.attachments.length === 1 && message.attachments[0].description !== '') {
      content += `<br/><br/>${s.escapeHTML(message.attachments[0].description)}`;
    }

    return `${fileHeader}<br/><br/>${content}`;
  }

  if (message.attachments.length > 0) {
    const [attachment] = message.attachments;
    let content = '';

    if (attachment.title) {
      content += `${s.escapeHTML(attachment.title)}<br/>`;
    }

    if (attachment.text) {
      content += `${s.escapeHTML(attachment.text)}<br/>`;
    }

    return `${header}<br/><br/>${content}`;
  }

  return header;
}

function getMessageLink(room, sub) {
  const roomPath = RocketChat.roomTypes.getRouteLink(room.t, sub);
  const path = Meteor.absoluteUrl(roomPath ? roomPath.replace(/^\//, '') : '');
  const style = ['color: #fff;', 'padding: 9px 12px;', 'border-radius: 4px;', 'background-color: #04436a;', 'text-decoration: none;'].join(' ');

  const message = TAPi18n.__('Offline_Link_Message');

  return `<p style="text-align:center;margin-bottom:8px;"><a style="${style}" href="${path}">${message}</a>`;
}

function sendEmail({
  message,
  user,
  subscription,
  room,
  emailAddress,
  hasMentionToUser
}) {
  let emailSubject;
  const username = RocketChat.settings.get('UI_Use_Real_Name') ? message.u.name : message.u.username;

  if (room.t === 'd') {
    emailSubject = RocketChat.placeholders.replace(RocketChat.settings.get('Offline_DM_Email'), {
      user: username,
      room: RocketChat.roomTypes.getRoomName(room.t, room)
    });
  } else if (hasMentionToUser) {
    emailSubject = RocketChat.placeholders.replace(RocketChat.settings.get('Offline_Mention_Email'), {
      user: username,
      room: RocketChat.roomTypes.getRoomName(room.t, room)
    });
  } else {
    emailSubject = RocketChat.placeholders.replace(RocketChat.settings.get('Offline_Mention_All_Email'), {
      user: username,
      room: RocketChat.roomTypes.getRoomName(room.t, room)
    });
  }

  const content = getEmailContent({
    message,
    user,
    room
  });
  const link = getMessageLink(room, subscription);

  if (RocketChat.settings.get('Direct_Reply_Enable')) {
    contentFooter = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Footer_Direct_Reply') || '');
  }

  const email = {
    to: emailAddress,
    subject: emailSubject,
    html: contentHeader + content + divisorMessage + link + contentFooter
  }; // using user full-name/channel name in from address

  if (room.t === 'd') {
    email.from = `${String(message.u.name).replace(/@/g, '%40').replace(/[<>,]/g, '')} <${RocketChat.settings.get('From_Email')}>`;
  } else {
    email.from = `${String(room.name).replace(/@/g, '%40').replace(/[<>,]/g, '')} <${RocketChat.settings.get('From_Email')}>`;
  } // If direct reply enabled, email content with headers


  if (RocketChat.settings.get('Direct_Reply_Enable')) {
    const replyto = RocketChat.settings.get('Direct_Reply_ReplyTo') ? RocketChat.settings.get('Direct_Reply_ReplyTo') : RocketChat.settings.get('Direct_Reply_Username');
    email.headers = {
      // Reply-To header with format "username+messageId@domain"
      'Reply-To': `${replyto.split('@')[0].split(RocketChat.settings.get('Direct_Reply_Separator'))[0]}${RocketChat.settings.get('Direct_Reply_Separator')}${message._id}@${replyto.split('@')[1]}`
    };
  }

  Meteor.defer(() => {
    RocketChat.metrics.notificationsSent.inc({
      notification_type: 'email'
    });
    Email.send(email);
  });
}

function shouldNotifyEmail({
  disableAllMessageNotifications,
  statusConnection,
  emailNotifications,
  isHighlighted,
  hasMentionToUser,
  hasMentionToAll,
  roomType
}) {
  // use connected (don't need to send him an email)
  if (statusConnection === 'online') {
    return false;
  } // user/room preference to nothing


  if (emailNotifications === 'nothing') {
    return false;
  } // no user or room preference


  if (emailNotifications == null) {
    if (disableAllMessageNotifications) {
      return false;
    } // default server preference is disabled


    if (RocketChat.settings.get('Accounts_Default_User_Preferences_emailNotificationMode') === 'nothing') {
      return false;
    }
  }

  return roomType === 'd' || isHighlighted || emailNotifications === 'all' || hasMentionToUser || !disableAllMessageNotifications && hasMentionToAll;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/notifications/index.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  parseMessageTextPerUser: () => parseMessageTextPerUser,
  replaceMentionedUsernamesWithFullNames: () => replaceMentionedUsernamesWithFullNames,
  messageContainsHighlight: () => messageContainsHighlight,
  callJoinRoom: () => callJoinRoom
});
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

function parseMessageTextPerUser(messageText, message, receiver) {
  if (!message.msg && message.attachments && message.attachments[0]) {
    const lng = receiver.language || RocketChat.settings.get('language') || 'en';
    return message.attachments[0].image_type ? TAPi18n.__('User_uploaded_image', {
      lng
    }) : TAPi18n.__('User_uploaded_file', {
      lng
    });
  }

  return messageText;
}

function replaceMentionedUsernamesWithFullNames(message, mentions) {
  if (!mentions || !mentions.length) {
    return message;
  }

  mentions.forEach(mention => {
    if (mention.name) {
      message = message.replace(new RegExp(s.escapeRegExp(`@${mention.username}`), 'g'), mention.name);
    }
  });
  return message;
}

function messageContainsHighlight(message, highlights) {
  if (!highlights || highlights.length === 0) {
    return false;
  }

  return highlights.some(function (highlight) {
    const regexp = new RegExp(s.escapeRegExp(highlight), 'i');
    return regexp.test(message.msg);
  });
}

function callJoinRoom(user, rid) {
  return new Promise((resolve, reject) => {
    Meteor.runAsUser(user._id, () => Meteor.call('joinRoom', rid, (error, result) => {
      if (error) {
        return reject(error);
      }

      return resolve(result);
    }));
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"mobile.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/functions/notifications/mobile.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  sendSinglePush: () => sendSinglePush,
  shouldNotifyMobile: () => shouldNotifyMobile
});
const CATEGORY_MESSAGE = 'MESSAGE';
const CATEGORY_MESSAGE_NOREPLY = 'MESSAGE_NOREPLY';
let alwaysNotifyMobileBoolean;
RocketChat.settings.get('Notifications_Always_Notify_Mobile', (key, value) => {
  alwaysNotifyMobileBoolean = value;
});
let SubscriptionRaw;
Meteor.startup(() => {
  SubscriptionRaw = RocketChat.models.Subscriptions.model.rawCollection();
});

function getBadgeCount(userId) {
  return Promise.asyncApply(() => {
    const [result] = Promise.await(SubscriptionRaw.aggregate([{
      $match: {
        'u._id': userId
      }
    }, {
      $group: {
        _id: 'total',
        total: {
          $sum: '$unread'
        }
      }
    }]).toArray());
    const {
      total
    } = result;
    return total;
  });
}

function canSendMessageToRoom(room, username) {
  return !(room.muted || []).includes(username);
}

function sendSinglePush({
  room,
  message,
  userId,
  receiverUsername,
  senderUsername,
  senderName,
  notificationMessage
}) {
  return Promise.asyncApply(() => {
    let username = '';

    if (RocketChat.settings.get('Push_show_username_room')) {
      username = RocketChat.settings.get('UI_Use_Real_Name') === true ? senderName : senderUsername;
    }

    RocketChat.PushNotification.send({
      roomId: message.rid,
      payload: {
        host: Meteor.absoluteUrl(),
        rid: message.rid,
        sender: message.u,
        type: room.t,
        name: room.name
      },
      roomName: RocketChat.settings.get('Push_show_username_room') && room.t !== 'd' ? `#${RocketChat.roomTypes.getRoomName(room.t, room)}` : '',
      username,
      message: RocketChat.settings.get('Push_show_message') ? notificationMessage : ' ',
      badge: Promise.await(getBadgeCount(userId)),
      usersTo: {
        userId
      },
      category: canSendMessageToRoom(room, receiverUsername) ? CATEGORY_MESSAGE : CATEGORY_MESSAGE_NOREPLY
    });
  });
}

function shouldNotifyMobile({
  disableAllMessageNotifications,
  mobilePushNotifications,
  hasMentionToAll,
  isHighlighted,
  hasMentionToUser,
  statusConnection,
  roomType
}) {
  if (disableAllMessageNotifications && mobilePushNotifications == null) {
    return false;
  }

  if (mobilePushNotifications === 'nothing') {
    return false;
  }

  if (!alwaysNotifyMobileBoolean && statusConnection === 'online') {
    return false;
  }

  if (!mobilePushNotifications) {
    if (RocketChat.settings.get('Accounts_Default_User_Preferences_mobileNotifications') === 'all') {
      return true;
    }

    if (RocketChat.settings.get('Accounts_Default_User_Preferences_mobileNotifications') === 'nothing') {
      return false;
    }
  }

  return roomType === 'd' || !disableAllMessageNotifications && hasMentionToAll || isHighlighted || mobilePushNotifications === 'all' || hasMentionToUser;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"models":{"_Base.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/_Base.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let ModelsBaseDb;
module.watch(require("./_BaseDb"), {
  default(v) {
    ModelsBaseDb = v;
  }

}, 0);
let objectPath;
module.watch(require("object-path"), {
  default(v) {
    objectPath = v;
  }

}, 1);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 2);

class ModelsBase {
  constructor(nameOrModel) {
    this._db = new ModelsBaseDb(nameOrModel, this);
    this.model = this._db.model;
    this.collectionName = this._db.collectionName;
    this.name = this._db.name;
    this.on = this._db.on.bind(this._db);
    this.emit = this._db.emit.bind(this._db);
    this.db = this;
  }

  get origin() {
    return '_db';
  }

  arrayToCursor(data) {
    return {
      fetch() {
        return data;
      },

      count() {
        return data.length;
      },

      forEach(fn) {
        return data.forEach(fn);
      }

    };
  }

  setUpdatedAt()
  /*record, checkQuery, query*/
  {
    return this._db.setUpdatedAt(...arguments);
  }

  find() {
    try {
      return this[this.origin].find(...arguments);
    } catch (e) {
      console.error('Exception on find', e, ...arguments);
    }
  }

  findOne() {
    try {
      return this[this.origin].findOne(...arguments);
    } catch (e) {
      console.error('Exception on find', e, ...arguments);
    }
  }

  findOneById() {
    try {
      return this[this.origin].findOneById(...arguments);
    } catch (e) {
      console.error('Exception on find', e, ...arguments);
    }
  }

  findOneByIds(ids, options) {
    check(ids, [String]);

    try {
      return this[this.origin].findOneByIds(ids, options);
    } catch (e) {
      console.error('Exception on find', e, ...arguments);
    }
  }

  insert()
  /*record*/
  {
    return this._db.insert(...arguments);
  }

  update()
  /*query, update, options*/
  {
    return this._db.update(...arguments);
  }

  upsert()
  /*query, update*/
  {
    return this._db.upsert(...arguments);
  }

  remove()
  /*query*/
  {
    return this._db.remove(...arguments);
  }

  insertOrUpsert() {
    return this._db.insertOrUpsert(...arguments);
  }

  allow() {
    return this._db.allow(...arguments);
  }

  deny() {
    return this._db.deny(...arguments);
  }

  ensureIndex() {
    return this._db.ensureIndex(...arguments);
  }

  dropIndex() {
    return this._db.dropIndex(...arguments);
  }

  tryEnsureIndex() {
    return this._db.tryEnsureIndex(...arguments);
  }

  tryDropIndex() {
    return this._db.tryDropIndex(...arguments);
  }

  trashFind()
  /*query, options*/
  {
    return this._db.trashFind(...arguments);
  }

  trashFindOneById()
  /*_id, options*/
  {
    return this._db.trashFindOneById(...arguments);
  }

  trashFindDeletedAfter()
  /*deletedAt, query, options*/
  {
    return this._db.trashFindDeletedAfter(...arguments);
  }

  processQueryOptionsOnResult(result, options = {}) {
    if (result === undefined || result === null) {
      return undefined;
    }

    if (Array.isArray(result)) {
      if (options.sort) {
        result = result.sort((a, b) => {
          let r = 0;

          for (const field in options.sort) {
            if (options.sort.hasOwnProperty(field)) {
              const direction = options.sort[field];
              let valueA;
              let valueB;

              if (field.indexOf('.') > -1) {
                valueA = objectPath.get(a, field);
                valueB = objectPath.get(b, field);
              } else {
                valueA = a[field];
                valueB = b[field];
              }

              if (valueA > valueB) {
                r = direction;
                break;
              }

              if (valueA < valueB) {
                r = -direction;
                break;
              }
            }
          }

          return r;
        });
      }

      if (typeof options.skip === 'number') {
        result.splice(0, options.skip);
      }

      if (typeof options.limit === 'number' && options.limit !== 0) {
        result.splice(options.limit);
      }
    }

    if (!options.fields) {
      options.fields = {};
    }

    const fieldsToRemove = [];
    const fieldsToGet = [];

    for (const field in options.fields) {
      if (options.fields.hasOwnProperty(field)) {
        if (options.fields[field] === 0) {
          fieldsToRemove.push(field);
        } else if (options.fields[field] === 1) {
          fieldsToGet.push(field);
        }
      }
    }

    if (fieldsToRemove.length > 0 && fieldsToGet.length > 0) {
      console.warn('Can\'t mix remove and get fields');
      fieldsToRemove.splice(0, fieldsToRemove.length);
    }

    if (fieldsToGet.length > 0 && fieldsToGet.indexOf('_id') === -1) {
      fieldsToGet.push('_id');
    }

    const pickFields = (obj, fields) => {
      const picked = {};
      fields.forEach(field => {
        if (field.indexOf('.') !== -1) {
          objectPath.set(picked, field, objectPath.get(obj, field));
        } else {
          picked[field] = obj[field];
        }
      });
      return picked;
    };

    if (fieldsToRemove.length > 0 || fieldsToGet.length > 0) {
      if (Array.isArray(result)) {
        result = result.map(record => {
          if (fieldsToRemove.length > 0) {
            return _.omit(record, ...fieldsToRemove);
          }

          if (fieldsToGet.length > 0) {
            return pickFields(record, fieldsToGet);
          }
        });
      } else {
        if (fieldsToRemove.length > 0) {
          return _.omit(result, ...fieldsToRemove);
        }

        if (fieldsToGet.length > 0) {
          return pickFields(result, fieldsToGet);
        }
      }
    }

    return result;
  } // dinamicTrashFindAfter(method, deletedAt, ...args) {
  // 	const scope = {
  // 		find: (query={}) => {
  // 			return this.trashFindDeletedAfter(deletedAt, query, { fields: {_id: 1, _deletedAt: 1} });
  // 		}
  // 	};
  // 	scope.model = {
  // 		find: scope.find
  // 	};
  // 	return this[method].apply(scope, args);
  // }
  // dinamicFindAfter(method, updatedAt, ...args) {
  // 	const scope = {
  // 		find: (query={}, options) => {
  // 			query._updatedAt = {
  // 				$gt: updatedAt
  // 			};
  // 			return this.find(query, options);
  // 		}
  // 	};
  // 	scope.model = {
  // 		find: scope.find
  // 	};
  // 	return this[method].apply(scope, args);
  // }
  // dinamicFindChangesAfter(method, updatedAt, ...args) {
  // 	return {
  // 		update: this.dinamicFindAfter(method, updatedAt, ...args).fetch(),
  // 		remove: this.dinamicTrashFindAfter(method, updatedAt, ...args).fetch()
  // 	};
  // }


}

RocketChat.models._Base = ModelsBase;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Avatars.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/Avatars.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);
RocketChat.models.Avatars = new class extends RocketChat.models._Base {
  constructor() {
    super('avatars');
    this.model.before.insert((userId, doc) => {
      doc.instanceId = InstanceStatus.id();
    });
    this.tryEnsureIndex({
      name: 1
    });
  }

  insertAvatarFileInit(name, userId, store, file, extra) {
    const fileData = {
      _id: name,
      name,
      userId,
      store,
      complete: false,
      uploading: true,
      progress: 0,
      extension: s.strRightBack(file.name, '.'),
      uploadedAt: new Date()
    };

    _.extend(fileData, file, extra);

    return this.insertOrUpsert(fileData);
  }

  updateFileComplete(fileId, userId, file) {
    if (!fileId) {
      return;
    }

    const filter = {
      _id: fileId,
      userId
    };
    const update = {
      $set: {
        complete: true,
        uploading: false,
        progress: 1
      }
    };
    update.$set = _.extend(file, update.$set);

    if (this.model.direct && this.model.direct.update) {
      return this.model.direct.update(filter, update);
    } else {
      return this.update(filter, update);
    }
  }

  findOneByName(name) {
    return this.findOne({
      name
    });
  }

  updateFileNameById(fileId, name) {
    const filter = {
      _id: fileId
    };
    const update = {
      $set: {
        name
      }
    };

    if (this.model.direct && this.model.direct.update) {
      return this.model.direct.update(filter, update);
    } else {
      return this.update(filter, update);
    }
  } // @TODO deprecated


  updateFileCompleteByNameAndUserId(name, userId, url) {
    if (!name) {
      return;
    }

    const filter = {
      name,
      userId
    };
    const update = {
      $set: {
        complete: true,
        uploading: false,
        progress: 1,
        url
      }
    };

    if (this.model.direct && this.model.direct.update) {
      return this.model.direct.update(filter, update);
    } else {
      return this.update(filter, update);
    }
  }

  deleteFile(fileId) {
    if (this.model.direct && this.model.direct.remove) {
      return this.model.direct.remove({
        _id: fileId
      });
    } else {
      return this.remove({
        _id: fileId
      });
    }
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Messages.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/Messages.js                                                                   //
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
RocketChat.models.Messages = new class extends RocketChat.models._Base {
  constructor() {
    super('message');
    this.tryEnsureIndex({
      'rid': 1,
      'ts': 1
    });
    this.tryEnsureIndex({
      'ts': 1
    });
    this.tryEnsureIndex({
      'u._id': 1
    });
    this.tryEnsureIndex({
      'editedAt': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'editedBy._id': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'rid': 1,
      't': 1,
      'u._id': 1
    });
    this.tryEnsureIndex({
      'expireAt': 1
    }, {
      expireAfterSeconds: 0
    });
    this.tryEnsureIndex({
      'msg': 'text'
    });
    this.tryEnsureIndex({
      'file._id': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'mentions.username': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'pinned': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'snippeted': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'location': '2dsphere'
    });
    this.tryEnsureIndex({
      'slackBotId': 1,
      'slackTs': 1
    }, {
      sparse: 1
    });
  }

  countVisibleByRoomIdBetweenTimestampsInclusive(roomId, afterTimestamp, beforeTimestamp, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId,
      ts: {
        $gte: afterTimestamp,
        $lte: beforeTimestamp
      }
    };
    return this.find(query, options).count();
  } // FIND


  findByMention(username, options) {
    const query = {
      'mentions.username': username
    };
    return this.find(query, options);
  }

  findFilesByUserId(userId, options = {}) {
    const query = {
      'u._id': userId,
      'file._id': {
        $exists: true
      }
    };
    return this.find(query, (0, _objectSpread2.default)({
      fields: {
        'file._id': 1
      }
    }, options));
  }

  findFilesByRoomIdPinnedTimestampAndUsers(rid, excludePinned, ts, users = [], options = {}) {
    const query = {
      rid,
      ts,
      'file._id': {
        $exists: true
      }
    };

    if (excludePinned) {
      query.pinned = {
        $ne: true
      };
    }

    if (users.length) {
      query['u.username'] = {
        $in: users
      };
    }

    return this.find(query, (0, _objectSpread2.default)({
      fields: {
        'file._id': 1
      }
    }, options));
  }

  findVisibleByMentionAndRoomId(username, rid, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      'mentions.username': username,
      rid
    };
    return this.find(query, options);
  }

  findVisibleByRoomId(roomId, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId
    };
    return this.find(query, options);
  }

  findVisibleByRoomIdNotContainingTypes(roomId, types, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId
    };

    if (Match.test(types, [String]) && types.length > 0) {
      query.t = {
        $nin: types
      };
    }

    return this.find(query, options);
  }

  findInvisibleByRoomId(roomId, options) {
    const query = {
      _hidden: true,
      rid: roomId
    };
    return this.find(query, options);
  }

  findVisibleByRoomIdAfterTimestamp(roomId, timestamp, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId,
      ts: {
        $gt: timestamp
      }
    };
    return this.find(query, options);
  }

  findForUpdates(roomId, timestamp, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId,
      _updatedAt: {
        $gt: timestamp
      }
    };
    return this.find(query, options);
  }

  findVisibleByRoomIdBeforeTimestamp(roomId, timestamp, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId,
      ts: {
        $lt: timestamp
      }
    };
    return this.find(query, options);
  }

  findVisibleByRoomIdBeforeTimestampInclusive(roomId, timestamp, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId,
      ts: {
        $lte: timestamp
      }
    };
    return this.find(query, options);
  }

  findVisibleByRoomIdBetweenTimestamps(roomId, afterTimestamp, beforeTimestamp, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId,
      ts: {
        $gt: afterTimestamp,
        $lt: beforeTimestamp
      }
    };
    return this.find(query, options);
  }

  findVisibleByRoomIdBetweenTimestampsInclusive(roomId, afterTimestamp, beforeTimestamp, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId,
      ts: {
        $gte: afterTimestamp,
        $lte: beforeTimestamp
      }
    };
    return this.find(query, options);
  }

  findVisibleByRoomIdBeforeTimestampNotContainingTypes(roomId, timestamp, types, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId,
      ts: {
        $lt: timestamp
      }
    };

    if (Match.test(types, [String]) && types.length > 0) {
      query.t = {
        $nin: types
      };
    }

    return this.find(query, options);
  }

  findVisibleByRoomIdBetweenTimestampsNotContainingTypes(roomId, afterTimestamp, beforeTimestamp, types, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      rid: roomId,
      ts: {
        $gt: afterTimestamp,
        $lt: beforeTimestamp
      }
    };

    if (Match.test(types, [String]) && types.length > 0) {
      query.t = {
        $nin: types
      };
    }

    return this.find(query, options);
  }

  findVisibleCreatedOrEditedAfterTimestamp(timestamp, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      $or: [{
        ts: {
          $gt: timestamp
        }
      }, {
        'editedAt': {
          $gt: timestamp
        }
      }]
    };
    return this.find(query, options);
  }

  findStarredByUserAtRoom(userId, roomId, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      'starred._id': userId,
      rid: roomId
    };
    return this.find(query, options);
  }

  findPinnedByRoom(roomId, options) {
    const query = {
      t: {
        $ne: 'rm'
      },
      _hidden: {
        $ne: true
      },
      pinned: true,
      rid: roomId
    };
    return this.find(query, options);
  }

  findSnippetedByRoom(roomId, options) {
    const query = {
      _hidden: {
        $ne: true
      },
      snippeted: true,
      rid: roomId
    };
    return this.find(query, options);
  }

  getLastTimestamp(options) {
    if (options == null) {
      options = {};
    }

    const query = {
      ts: {
        $exists: 1
      }
    };
    options.sort = {
      ts: -1
    };
    options.limit = 1;
    const [message] = this.find(query, options).fetch();
    return message && message.ts;
  }

  findByRoomIdAndMessageIds(rid, messageIds, options) {
    const query = {
      rid,
      _id: {
        $in: messageIds
      }
    };
    return this.find(query, options);
  }

  findOneBySlackBotIdAndSlackTs(slackBotId, slackTs) {
    const query = {
      slackBotId,
      slackTs
    };
    return this.findOne(query);
  }

  findOneBySlackTs(slackTs) {
    const query = {
      slackTs
    };
    return this.findOne(query);
  }

  findByRoomIdAndType(roomId, type, options) {
    const query = {
      rid: roomId,
      t: type
    };

    if (options == null) {
      options = {};
    }

    return this.find(query, options);
  }

  findByRoomId(roomId, options) {
    const query = {
      rid: roomId
    };
    return this.find(query, options);
  }

  getLastVisibleMessageSentWithNoTypeByRoomId(rid, messageId) {
    const query = {
      rid,
      _hidden: {
        $ne: true
      },
      t: {
        $exists: false
      }
    };

    if (messageId) {
      query._id = {
        $ne: messageId
      };
    }

    const options = {
      sort: {
        ts: -1
      }
    };
    return this.findOne(query, options);
  }

  cloneAndSaveAsHistoryById(_id) {
    const me = RocketChat.models.Users.findOneById(Meteor.userId());
    const record = this.findOneById(_id);
    record._hidden = true;
    record.parent = record._id;
    record.editedAt = new Date();
    record.editedBy = {
      _id: Meteor.userId(),
      username: me.username
    };
    delete record._id;
    return this.insert(record);
  } // UPDATE


  setHiddenById(_id, hidden) {
    if (hidden == null) {
      hidden = true;
    }

    const query = {
      _id
    };
    const update = {
      $set: {
        _hidden: hidden
      }
    };
    return this.update(query, update);
  }

  setAsDeletedByIdAndUser(_id, user) {
    const query = {
      _id
    };
    const update = {
      $set: {
        msg: '',
        t: 'rm',
        urls: [],
        mentions: [],
        attachments: [],
        reactions: [],
        editedAt: new Date(),
        editedBy: {
          _id: user._id,
          username: user.username
        }
      }
    };
    return this.update(query, update);
  }

  setPinnedByIdAndUserId(_id, pinnedBy, pinned, pinnedAt) {
    if (pinned == null) {
      pinned = true;
    }

    if (pinnedAt == null) {
      pinnedAt = 0;
    }

    const query = {
      _id
    };
    const update = {
      $set: {
        pinned,
        pinnedAt: pinnedAt || new Date(),
        pinnedBy
      }
    };
    return this.update(query, update);
  }

  setSnippetedByIdAndUserId(message, snippetName, snippetedBy, snippeted, snippetedAt) {
    if (snippeted == null) {
      snippeted = true;
    }

    if (snippetedAt == null) {
      snippetedAt = 0;
    }

    const query = {
      _id: message._id
    };
    const msg = `\`\`\`${message.msg}\`\`\``;
    const update = {
      $set: {
        msg,
        snippeted,
        snippetedAt: snippetedAt || new Date(),
        snippetedBy,
        snippetName
      }
    };
    return this.update(query, update);
  }

  setUrlsById(_id, urls) {
    const query = {
      _id
    };
    const update = {
      $set: {
        urls
      }
    };
    return this.update(query, update);
  }

  updateAllUsernamesByUserId(userId, username) {
    const query = {
      'u._id': userId
    };
    const update = {
      $set: {
        'u.username': username
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  updateUsernameOfEditByUserId(userId, username) {
    const query = {
      'editedBy._id': userId
    };
    const update = {
      $set: {
        'editedBy.username': username
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  updateUsernameAndMessageOfMentionByIdAndOldUsername(_id, oldUsername, newUsername, newMessage) {
    const query = {
      _id,
      'mentions.username': oldUsername
    };
    const update = {
      $set: {
        'mentions.$.username': newUsername,
        'msg': newMessage
      }
    };
    return this.update(query, update);
  }

  updateUserStarById(_id, userId, starred) {
    let update;
    const query = {
      _id
    };

    if (starred) {
      update = {
        $addToSet: {
          starred: {
            _id: userId
          }
        }
      };
    } else {
      update = {
        $pull: {
          starred: {
            _id: Meteor.userId()
          }
        }
      };
    }

    return this.update(query, update);
  }

  upgradeEtsToEditAt() {
    const query = {
      ets: {
        $exists: 1
      }
    };
    const update = {
      $rename: {
        'ets': 'editedAt'
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  setMessageAttachments(_id, attachments) {
    const query = {
      _id
    };
    const update = {
      $set: {
        attachments
      }
    };
    return this.update(query, update);
  }

  setSlackBotIdAndSlackTs(_id, slackBotId, slackTs) {
    const query = {
      _id
    };
    const update = {
      $set: {
        slackBotId,
        slackTs
      }
    };
    return this.update(query, update);
  }

  unlinkUserId(userId, newUserId, newUsername, newNameAlias) {
    const query = {
      'u._id': userId
    };
    const update = {
      $set: {
        'alias': newNameAlias,
        'u._id': newUserId,
        'u.username': newUsername,
        'u.name': undefined
      }
    };
    return this.update(query, update, {
      multi: true
    });
  } // INSERT


  createWithTypeRoomIdMessageAndUser(type, roomId, message, user, extraData) {
    const room = RocketChat.models.Rooms.findOneById(roomId, {
      fields: {
        sysMes: 1
      }
    });

    if ((room != null ? room.sysMes : undefined) === false) {
      return;
    }

    const record = {
      t: type,
      rid: roomId,
      ts: new Date(),
      msg: message,
      u: {
        _id: user._id,
        username: user.username
      },
      groupable: false
    };

    if (RocketChat.settings.get('Message_Read_Receipt_Enabled')) {
      record.unread = true;
    }

    _.extend(record, extraData);

    record._id = this.insertOrUpsert(record);
    RocketChat.models.Rooms.incMsgCountById(room._id, 1);
    return record;
  }

  createNavigationHistoryWithRoomIdMessageAndUser(roomId, message, user, extraData) {
    const type = 'livechat_navigation_history';
    const room = RocketChat.models.Rooms.findOneById(roomId, {
      fields: {
        sysMes: 1
      }
    });

    if ((room != null ? room.sysMes : undefined) === false) {
      return;
    }

    const record = {
      t: type,
      rid: roomId,
      ts: new Date(),
      msg: message,
      u: {
        _id: user._id,
        username: user.username
      },
      groupable: false
    };

    if (RocketChat.settings.get('Message_Read_Receipt_Enabled')) {
      record.unread = true;
    }

    _.extend(record, extraData);

    record._id = this.insertOrUpsert(record);
    return record;
  }

  createUserJoinWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('uj', roomId, message, user, extraData);
  }

  createUserLeaveWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('ul', roomId, message, user, extraData);
  }

  createUserRemovedWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('ru', roomId, message, user, extraData);
  }

  createUserAddedWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('au', roomId, message, user, extraData);
  }

  createCommandWithRoomIdAndUser(command, roomId, user, extraData) {
    return this.createWithTypeRoomIdMessageAndUser('command', roomId, command, user, extraData);
  }

  createUserMutedWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('user-muted', roomId, message, user, extraData);
  }

  createUserUnmutedWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('user-unmuted', roomId, message, user, extraData);
  }

  createNewModeratorWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('new-moderator', roomId, message, user, extraData);
  }

  createModeratorRemovedWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('moderator-removed', roomId, message, user, extraData);
  }

  createNewOwnerWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('new-owner', roomId, message, user, extraData);
  }

  createOwnerRemovedWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('owner-removed', roomId, message, user, extraData);
  }

  createNewLeaderWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('new-leader', roomId, message, user, extraData);
  }

  createLeaderRemovedWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('leader-removed', roomId, message, user, extraData);
  }

  createSubscriptionRoleAddedWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('subscription-role-added', roomId, message, user, extraData);
  }

  createSubscriptionRoleRemovedWithRoomIdAndUser(roomId, user, extraData) {
    const message = user.username;
    return this.createWithTypeRoomIdMessageAndUser('subscription-role-removed', roomId, message, user, extraData);
  } // REMOVE


  removeById(_id) {
    const query = {
      _id
    };
    return this.remove(query);
  }

  removeByRoomId(roomId) {
    const query = {
      rid: roomId
    };
    return this.remove(query);
  }

  removeByIdPinnedTimestampAndUsers(rid, pinned, ts, users = []) {
    const query = {
      rid,
      ts
    };

    if (pinned) {
      query.pinned = {
        $ne: true
      };
    }

    if (users.length) {
      query['u.username'] = {
        $in: users
      };
    }

    return this.remove(query);
  }

  removeByIdPinnedTimestampLimitAndUsers(rid, pinned, ts, limit, users = []) {
    const query = {
      rid,
      ts
    };

    if (pinned) {
      query.pinned = {
        $ne: true
      };
    }

    if (users.length) {
      query['u.username'] = {
        $in: users
      };
    }

    const messagesToDelete = RocketChat.models.Messages.find(query, {
      fields: {
        _id: 1
      },
      limit
    }).map(({
      _id
    }) => _id);
    return this.remove({
      _id: {
        $in: messagesToDelete
      }
    });
  }

  removeByUserId(userId) {
    const query = {
      'u._id': userId
    };
    return this.remove(query);
  }

  removeFilesByRoomId(roomId) {
    this.find({
      rid: roomId,
      'file._id': {
        $exists: true
      }
    }, {
      fields: {
        'file._id': 1
      }
    }).fetch().forEach(document => FileUpload.getStore('Uploads').deleteById(document.file._id));
  }

  getMessageByFileId(fileID) {
    return this.findOne({
      'file._id': fileID
    });
  }

  setAsRead(rid, until) {
    return this.update({
      rid,
      unread: true,
      ts: {
        $lt: until
      }
    }, {
      $unset: {
        unread: 1
      }
    }, {
      multi: true
    });
  }

  setAsReadById(_id) {
    return this.update({
      _id
    }, {
      $unset: {
        unread: 1
      }
    });
  }

  findUnreadMessagesByRoomAndDate(rid, after) {
    const query = {
      unread: true,
      rid
    };

    if (after) {
      query.ts = {
        $gt: after
      };
    }

    return this.find(query, {
      fields: {
        _id: 1
      }
    });
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Reports.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/Reports.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
RocketChat.models.Reports = new class extends RocketChat.models._Base {
  constructor() {
    super('reports');
  }

  createWithMessageDescriptionAndUserId(message, description, userId, extraData) {
    const record = {
      message,
      description,
      ts: new Date(),
      userId
    };

    _.extend(record, extraData);

    record._id = this.insert(record);
    return record;
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Rooms.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/Rooms.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);

class ModelRooms extends RocketChat.models._Base {
  constructor() {
    super(...arguments);
    this.tryEnsureIndex({
      'name': 1
    }, {
      unique: 1,
      sparse: 1
    });
    this.tryEnsureIndex({
      'default': 1
    });
    this.tryEnsureIndex({
      't': 1
    });
    this.tryEnsureIndex({
      'u._id': 1
    });
  }

  findOneByIdOrName(_idOrName, options) {
    const query = {
      $or: [{
        _id: _idOrName
      }, {
        name: _idOrName
      }]
    };
    return this.findOne(query, options);
  }

  findOneByImportId(_id, options) {
    const query = {
      importIds: _id
    };
    return this.findOne(query, options);
  }

  findOneByName(name, options) {
    const query = {
      name
    };
    return this.findOne(query, options);
  }

  findOneByNameAndNotId(name, rid) {
    const query = {
      _id: {
        $ne: rid
      },
      name
    };
    return this.findOne(query);
  }

  findOneByDisplayName(fname, options) {
    const query = {
      fname
    };
    return this.findOne(query, options);
  }

  findOneByNameAndType(name, type, options) {
    const query = {
      name,
      t: type
    };
    return this.findOne(query, options);
  } // FIND


  findWithUsername(username, options) {
    return this.find({
      usernames: username
    }, options);
  }

  findById(roomId, options) {
    return this.find({
      _id: roomId
    }, options);
  }

  findByIds(roomIds, options) {
    return this.find({
      _id: {
        $in: [].concat(roomIds)
      }
    }, options);
  }

  findByType(type, options) {
    const query = {
      t: type
    };
    return this.find(query, options);
  }

  findByTypeInIds(type, ids, options) {
    const query = {
      _id: {
        $in: ids
      },
      t: type
    };
    return this.find(query, options);
  }

  findByTypes(types, options) {
    const query = {
      t: {
        $in: types
      }
    };
    return this.find(query, options);
  }

  findByUserId(userId, options) {
    const query = {
      'u._id': userId
    };
    return this.find(query, options);
  }

  findBySubscriptionUserId(userId, options) {
    const data = RocketChat.models.Subscriptions.findByUserId(userId, {
      fields: {
        rid: 1
      }
    }).fetch().map(item => item.rid);
    const query = {
      _id: {
        $in: data
      }
    };
    return this.find(query, options);
  }

  findBySubscriptionTypeAndUserId(type, userId, options) {
    const data = RocketChat.models.Subscriptions.findByUserIdAndType(userId, type, {
      fields: {
        rid: 1
      }
    }).fetch().map(item => item.rid);
    const query = {
      t: type,
      _id: {
        $in: data
      }
    };
    return this.find(query, options);
  }

  findBySubscriptionUserIdUpdatedAfter(userId, _updatedAt, options) {
    const ids = RocketChat.models.Subscriptions.findByUserId(userId, {
      fields: {
        rid: 1
      }
    }).fetch().map(item => item.rid);
    const query = {
      _id: {
        $in: ids
      },
      _updatedAt: {
        $gt: _updatedAt
      }
    };
    return this.find(query, options);
  }

  findByNameContaining(name, options) {
    const nameRegex = new RegExp(s.trim(s.escapeRegExp(name)), 'i');
    const query = {
      $or: [{
        name: nameRegex
      }, {
        t: 'd',
        usernames: nameRegex
      }]
    };
    return this.find(query, options);
  }

  findByNameContainingAndTypes(name, types, options) {
    const nameRegex = new RegExp(s.trim(s.escapeRegExp(name)), 'i');
    const query = {
      t: {
        $in: types
      },
      $or: [{
        name: nameRegex
      }, {
        t: 'd',
        usernames: nameRegex
      }]
    };
    return this.find(query, options);
  }

  findByNameAndType(name, type, options) {
    const query = {
      t: type,
      name
    }; // do not use cache

    return this._db.find(query, options);
  }

  findByNameAndTypeNotDefault(name, type, options) {
    const query = {
      t: type,
      name,
      default: {
        $ne: true
      }
    }; // do not use cache

    return this._db.find(query, options);
  }

  findByNameAndTypesNotInIds(name, types, ids, options) {
    const query = {
      _id: {
        $ne: ids
      },
      t: {
        $in: types
      },
      name
    }; // do not use cache

    return this._db.find(query, options);
  }

  findChannelAndPrivateByNameStarting(name, options) {
    const nameRegex = new RegExp(`^${s.trim(s.escapeRegExp(name))}`, 'i');
    const query = {
      t: {
        $in: ['c', 'p']
      },
      name: nameRegex
    };
    return this.find(query, options);
  }

  findByDefaultAndTypes(defaultValue, types, options) {
    const query = {
      default: defaultValue,
      t: {
        $in: types
      }
    };
    return this.find(query, options);
  }

  findDirectRoomContainingUsername(username, options) {
    const query = {
      t: 'd',
      usernames: username
    };
    return this.find(query, options);
  }

  findByTypeAndName(type, name, options) {
    const query = {
      name,
      t: type
    };
    return this.find(query, options);
  }

  findByTypeAndNameContaining(type, name, options) {
    const nameRegex = new RegExp(s.trim(s.escapeRegExp(name)), 'i');
    const query = {
      name: nameRegex,
      t: type
    };
    return this.find(query, options);
  }

  findByTypeInIdsAndNameContaining(type, ids, name, options) {
    const nameRegex = new RegExp(s.trim(s.escapeRegExp(name)), 'i');
    const query = {
      _id: {
        $in: ids
      },
      name: nameRegex,
      t: type
    };
    return this.find(query, options);
  }

  findByTypeAndArchivationState(type, archivationstate, options) {
    const query = {
      t: type
    };

    if (archivationstate) {
      query.archived = true;
    } else {
      query.archived = {
        $ne: true
      };
    }

    return this.find(query, options);
  } // UPDATE


  addImportIds(_id, importIds) {
    importIds = [].concat(importIds);
    const query = {
      _id
    };
    const update = {
      $addToSet: {
        importIds: {
          $each: importIds
        }
      }
    };
    return this.update(query, update);
  }

  archiveById(_id) {
    const query = {
      _id
    };
    const update = {
      $set: {
        archived: true
      }
    };
    return this.update(query, update);
  }

  unarchiveById(_id) {
    const query = {
      _id
    };
    const update = {
      $set: {
        archived: false
      }
    };
    return this.update(query, update);
  }

  setNameById(_id, name, fname) {
    const query = {
      _id
    };
    const update = {
      $set: {
        name,
        fname
      }
    };
    return this.update(query, update);
  }

  setFnameById(_id, fname) {
    const query = {
      _id
    };
    const update = {
      $set: {
        fname
      }
    };
    return this.update(query, update);
  }

  incMsgCountById(_id, inc) {
    if (inc == null) {
      inc = 1;
    }

    const query = {
      _id
    };
    const update = {
      $inc: {
        msgs: inc
      }
    };
    return this.update(query, update);
  }

  incMsgCountAndSetLastMessageById(_id, inc, lastMessageTimestamp, lastMessage) {
    if (inc == null) {
      inc = 1;
    }

    const query = {
      _id
    };
    const update = {
      $set: {
        lm: lastMessageTimestamp
      },
      $inc: {
        msgs: inc
      }
    };

    if (lastMessage) {
      update.$set.lastMessage = lastMessage;
    }

    return this.update(query, update);
  }

  incUsersCountById(_id, inc = 1) {
    const query = {
      _id
    };
    const update = {
      $inc: {
        usersCount: inc
      }
    };
    return this.update(query, update);
  }

  incUsersCountByIds(ids, inc = 1) {
    const query = {
      _id: {
        $in: ids
      }
    };
    const update = {
      $inc: {
        usersCount: inc
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  setLastMessageById(_id, lastMessage) {
    const query = {
      _id
    };
    const update = {
      $set: {
        lastMessage
      }
    };
    return this.update(query, update);
  }

  resetLastMessageById(_id) {
    const query = {
      _id
    };
    const lastMessage = RocketChat.models.Messages.getLastVisibleMessageSentWithNoTypeByRoomId(_id);
    const update = lastMessage ? {
      $set: {
        lastMessage
      }
    } : {
      $unset: {
        lastMessage: 1
      }
    };
    return this.update(query, update);
  }

  replaceUsername(previousUsername, username) {
    const query = {
      usernames: previousUsername
    };
    const update = {
      $set: {
        'usernames.$': username
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  replaceMutedUsername(previousUsername, username) {
    const query = {
      muted: previousUsername
    };
    const update = {
      $set: {
        'muted.$': username
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  replaceUsernameOfUserByUserId(userId, username) {
    const query = {
      'u._id': userId
    };
    const update = {
      $set: {
        'u.username': username
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  setJoinCodeById(_id, joinCode) {
    let update;
    const query = {
      _id
    };

    if ((joinCode != null ? joinCode.trim() : undefined) !== '') {
      update = {
        $set: {
          joinCodeRequired: true,
          joinCode
        }
      };
    } else {
      update = {
        $set: {
          joinCodeRequired: false
        },
        $unset: {
          joinCode: 1
        }
      };
    }

    return this.update(query, update);
  }

  setUserById(_id, user) {
    const query = {
      _id
    };
    const update = {
      $set: {
        u: {
          _id: user._id,
          username: user.username
        }
      }
    };
    return this.update(query, update);
  }

  setTypeById(_id, type) {
    const query = {
      _id
    };
    const update = {
      $set: {
        t: type
      }
    };

    if (type === 'p') {
      update.$unset = {
        default: ''
      };
    }

    return this.update(query, update);
  }

  setTopicById(_id, topic) {
    const query = {
      _id
    };
    const update = {
      $set: {
        topic
      }
    };
    return this.update(query, update);
  }

  setAnnouncementById(_id, announcement, announcementDetails) {
    const query = {
      _id
    };
    const update = {
      $set: {
        announcement,
        announcementDetails
      }
    };
    return this.update(query, update);
  }

  setCustomFieldsById(_id, customFields) {
    const query = {
      _id
    };
    const update = {
      $set: {
        customFields
      }
    };
    return this.update(query, update);
  }

  muteUsernameByRoomId(_id, username) {
    const query = {
      _id
    };
    const update = {
      $addToSet: {
        muted: username
      }
    };
    return this.update(query, update);
  }

  unmuteUsernameByRoomId(_id, username) {
    const query = {
      _id
    };
    const update = {
      $pull: {
        muted: username
      }
    };
    return this.update(query, update);
  }

  saveDefaultById(_id, defaultValue) {
    const query = {
      _id
    };
    const update = {
      $set: {
        default: defaultValue === 'true'
      }
    };
    return this.update(query, update);
  }

  saveRetentionEnabledById(_id, value) {
    const query = {
      _id
    };
    const update = {};

    if (value == null) {
      update.$unset = {
        'retention.enabled': true
      };
    } else {
      update.$set = {
        'retention.enabled': !!value
      };
    }

    return this.update(query, update);
  }

  saveRetentionMaxAgeById(_id, value) {
    const query = {
      _id
    };
    value = Number(value);

    if (!value) {
      value = 30;
    }

    const update = {
      $set: {
        'retention.maxAge': value
      }
    };
    return this.update(query, update);
  }

  saveRetentionExcludePinnedById(_id, value) {
    const query = {
      _id
    };
    const update = {
      $set: {
        'retention.excludePinned': value === true
      }
    };
    return this.update(query, update);
  }

  saveRetentionFilesOnlyById(_id, value) {
    const query = {
      _id
    };
    const update = {
      $set: {
        'retention.filesOnly': value === true
      }
    };
    return this.update(query, update);
  }

  saveRetentionOverrideGlobalById(_id, value) {
    const query = {
      _id
    };
    const update = {
      $set: {
        'retention.overrideGlobal': value === true
      }
    };
    return this.update(query, update);
  }

  setTopicAndTagsById(_id, topic, tags) {
    const setData = {};
    const unsetData = {};

    if (topic != null) {
      if (!_.isEmpty(s.trim(topic))) {
        setData.topic = s.trim(topic);
      } else {
        unsetData.topic = 1;
      }
    }

    if (tags != null) {
      if (!_.isEmpty(s.trim(tags))) {
        setData.tags = s.trim(tags).split(',').map(tag => s.trim(tag));
      } else {
        unsetData.tags = 1;
      }
    }

    const update = {};

    if (!_.isEmpty(setData)) {
      update.$set = setData;
    }

    if (!_.isEmpty(unsetData)) {
      update.$unset = unsetData;
    }

    if (_.isEmpty(update)) {
      return;
    }

    return this.update({
      _id
    }, update);
  } // INSERT


  createWithTypeNameUserAndUsernames(type, name, fname, user, usernames, extraData) {
    const room = {
      name,
      fname,
      t: type,
      usernames,
      msgs: 0,
      usersCount: 0,
      u: {
        _id: user._id,
        username: user.username
      }
    };

    _.extend(room, extraData);

    room._id = this.insert(room);
    return room;
  }

  createWithIdTypeAndName(_id, type, name, extraData) {
    const room = {
      _id,
      ts: new Date(),
      t: type,
      name,
      usernames: [],
      msgs: 0,
      usersCount: 0
    };

    _.extend(room, extraData);

    this.insert(room);
    return room;
  }

  createWithFullRoomData(room) {
    delete room._id;
    room._id = this.insert(room);
    return room;
  } // REMOVE


  removeById(_id) {
    const query = {
      _id
    };
    return this.remove(query);
  }

  removeDirectRoomContainingUsername(username) {
    const query = {
      t: 'd',
      usernames: username
    };
    return this.remove(query);
  }

}

RocketChat.models.Rooms = new ModelRooms('room', true);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/Settings.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
class ModelSettings extends RocketChat.models._Base {
  constructor() {
    super(...arguments);
    this.tryEnsureIndex({
      'blocked': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'hidden': 1
    }, {
      sparse: 1
    });
  } // FIND


  findById(_id) {
    const query = {
      _id
    };
    return this.find(query);
  }

  findOneNotHiddenById(_id) {
    const query = {
      _id,
      hidden: {
        $ne: true
      }
    };
    return this.findOne(query);
  }

  findByIds(_id = []) {
    _id = [].concat(_id);
    const query = {
      _id: {
        $in: _id
      }
    };
    return this.find(query);
  }

  findByRole(role, options) {
    const query = {
      role
    };
    return this.find(query, options);
  }

  findPublic(options) {
    const query = {
      public: true
    };
    return this.find(query, options);
  }

  findNotHiddenPublic(ids = []) {
    const filter = {
      hidden: {
        $ne: true
      },
      public: true
    };

    if (ids.length > 0) {
      filter._id = {
        $in: ids
      };
    }

    return this.find(filter, {
      fields: {
        _id: 1,
        value: 1
      }
    });
  }

  findNotHiddenPublicUpdatedAfter(updatedAt) {
    const filter = {
      hidden: {
        $ne: true
      },
      public: true,
      _updatedAt: {
        $gt: updatedAt
      }
    };
    return this.find(filter, {
      fields: {
        _id: 1,
        value: 1
      }
    });
  }

  findNotHiddenPrivate() {
    return this.find({
      hidden: {
        $ne: true
      },
      public: {
        $ne: true
      }
    });
  }

  findNotHidden(options) {
    return this.find({
      hidden: {
        $ne: true
      }
    }, options);
  }

  findNotHiddenUpdatedAfter(updatedAt) {
    return this.find({
      hidden: {
        $ne: true
      },
      _updatedAt: {
        $gt: updatedAt
      }
    });
  }

  findSetupWizardSettings() {
    return this.find({
      wizard: {
        '$exists': true,
        '$ne': null
      }
    });
  } // UPDATE


  updateValueById(_id, value) {
    const query = {
      blocked: {
        $ne: true
      },
      value: {
        $ne: value
      },
      _id
    };
    const update = {
      $set: {
        value
      }
    };
    return this.update(query, update);
  }

  updateValueAndEditorById(_id, value, editor) {
    const query = {
      blocked: {
        $ne: true
      },
      value: {
        $ne: value
      },
      _id
    };
    const update = {
      $set: {
        value,
        editor
      }
    };
    return this.update(query, update);
  }

  updateValueNotHiddenById(_id, value) {
    const query = {
      _id,
      hidden: {
        $ne: true
      },
      blocked: {
        $ne: true
      }
    };
    const update = {
      $set: {
        value
      }
    };
    return this.update(query, update);
  }

  updateOptionsById(_id, options) {
    const query = {
      blocked: {
        $ne: true
      },
      _id
    };
    const update = {
      $set: options
    };
    return this.update(query, update);
  } // INSERT


  createWithIdAndValue(_id, value) {
    const record = {
      _id,
      value,
      _createdAt: new Date()
    };
    return this.insert(record);
  } // REMOVE


  removeById(_id) {
    const query = {
      blocked: {
        $ne: true
      },
      _id
    };
    return this.remove(query);
  }

}

RocketChat.models.Settings = new ModelSettings('settings', true);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Subscriptions.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/Subscriptions.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

class ModelSubscriptions extends RocketChat.models._Base {
  constructor() {
    super(...arguments);
    this.tryEnsureIndex({
      'rid': 1,
      'u._id': 1
    }, {
      unique: 1
    });
    this.tryEnsureIndex({
      'rid': 1,
      'u.username': 1
    });
    this.tryEnsureIndex({
      'rid': 1,
      'alert': 1,
      'u._id': 1
    });
    this.tryEnsureIndex({
      'rid': 1,
      'roles': 1
    });
    this.tryEnsureIndex({
      'u._id': 1,
      'name': 1,
      't': 1
    });
    this.tryEnsureIndex({
      'open': 1
    });
    this.tryEnsureIndex({
      'alert': 1
    });
    this.tryEnsureIndex({
      rid: 1,
      'u._id': 1,
      open: 1
    });
    this.tryEnsureIndex({
      'ts': 1
    });
    this.tryEnsureIndex({
      'ls': 1
    });
    this.tryEnsureIndex({
      'audioNotifications': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'desktopNotifications': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'mobilePushNotifications': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'emailNotifications': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'autoTranslate': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'autoTranslateLanguage': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'userHighlights.0': 1
    }, {
      sparse: 1
    });
  } // FIND ONE


  findOneByRoomIdAndUserId(roomId, userId, options) {
    const query = {
      rid: roomId,
      'u._id': userId
    };
    return this.findOne(query, options);
  }

  findOneByRoomIdAndUsername(roomId, username, options) {
    const query = {
      rid: roomId,
      'u.username': username
    };
    return this.findOne(query, options);
  }

  findOneByRoomNameAndUserId(roomName, userId) {
    const query = {
      name: roomName,
      'u._id': userId
    };
    return this.findOne(query);
  } // FIND


  findByUserId(userId, options) {
    const query = {
      'u._id': userId
    };
    return this.find(query, options);
  }

  findByUserIdAndType(userId, type, options) {
    const query = {
      'u._id': userId,
      t: type
    };
    return this.find(query, options);
  }

  findByUserIdAndTypes(userId, types, options) {
    const query = {
      'u._id': userId,
      t: {
        $in: types
      }
    };
    return this.find(query, options);
  }

  findByUserIdUpdatedAfter(userId, updatedAt, options) {
    const query = {
      'u._id': userId,
      _updatedAt: {
        $gt: updatedAt
      }
    };
    return this.find(query, options);
  }

  findByRoomIdAndRoles(roomId, roles, options) {
    roles = [].concat(roles);
    const query = {
      'rid': roomId,
      'roles': {
        $in: roles
      }
    };
    return this.find(query, options);
  }

  findByType(types, options) {
    const query = {
      t: {
        $in: types
      }
    };
    return this.find(query, options);
  }

  findByTypeAndUserId(type, userId, options) {
    const query = {
      t: type,
      'u._id': userId
    };
    return this.find(query, options);
  }

  findByRoomId(roomId, options) {
    const query = {
      rid: roomId
    };
    return this.find(query, options);
  }

  findByRoomIdAndNotUserId(roomId, userId, options) {
    const query = {
      rid: roomId,
      'u._id': {
        $ne: userId
      }
    };
    return this.find(query, options);
  }

  findByRoomWithUserHighlights(roomId, options) {
    const query = {
      rid: roomId,
      'userHighlights.0': {
        $exists: true
      }
    };
    return this.find(query, options);
  }

  getLastSeen(options) {
    if (options == null) {
      options = {};
    }

    const query = {
      ls: {
        $exists: 1
      }
    };
    options.sort = {
      ls: -1
    };
    options.limit = 1;
    const [subscription] = this.find(query, options).fetch();
    return subscription && subscription.ls;
  }

  findByRoomIdAndUserIds(roomId, userIds) {
    const query = {
      rid: roomId,
      'u._id': {
        $in: userIds
      }
    };
    return this.find(query);
  }

  findByRoomIdAndUserIdsOrAllMessages(roomId, userIds) {
    const query = {
      rid: roomId,
      $or: [{
        'u._id': {
          $in: userIds
        }
      }, {
        emailNotifications: 'all'
      }]
    };
    return this.find(query);
  }

  findByRoomIdWhenUserIdExists(rid, options) {
    const query = {
      rid,
      'u._id': {
        $exists: 1
      }
    };
    return this.find(query, options);
  }

  findByRoomIdWhenUsernameExists(rid, options) {
    const query = {
      rid,
      'u.username': {
        $exists: 1
      }
    };
    return this.find(query, options);
  }

  findUnreadByUserId(userId) {
    const query = {
      'u._id': userId,
      unread: {
        $gt: 0
      }
    };
    return this.find(query, {
      fields: {
        unread: 1
      }
    });
  }

  getMinimumLastSeenByRoomId(rid) {
    return this.db.findOne({
      rid
    }, {
      sort: {
        ls: 1
      },
      fields: {
        ls: 1
      }
    });
  } // UPDATE


  archiveByRoomId(roomId) {
    const query = {
      rid: roomId
    };
    const update = {
      $set: {
        alert: false,
        open: false,
        archived: true
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  unarchiveByRoomId(roomId) {
    const query = {
      rid: roomId
    };
    const update = {
      $set: {
        alert: false,
        open: true,
        archived: false
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  hideByRoomIdAndUserId(roomId, userId) {
    const query = {
      rid: roomId,
      'u._id': userId
    };
    const update = {
      $set: {
        alert: false,
        open: false
      }
    };
    return this.update(query, update);
  }

  openByRoomIdAndUserId(roomId, userId) {
    const query = {
      rid: roomId,
      'u._id': userId
    };
    const update = {
      $set: {
        open: true
      }
    };
    return this.update(query, update);
  }

  setAsReadByRoomIdAndUserId(roomId, userId) {
    const query = {
      rid: roomId,
      'u._id': userId
    };
    const update = {
      $set: {
        open: true,
        alert: false,
        unread: 0,
        userMentions: 0,
        groupMentions: 0,
        ls: new Date()
      }
    };
    return this.update(query, update);
  }

  setAsUnreadByRoomIdAndUserId(roomId, userId, firstMessageUnreadTimestamp) {
    const query = {
      rid: roomId,
      'u._id': userId
    };
    const update = {
      $set: {
        open: true,
        alert: true,
        ls: firstMessageUnreadTimestamp
      }
    };
    return this.update(query, update);
  }

  setCustomFieldsDirectMessagesByUserId(userId, fields) {
    const query = {
      'u._id': userId,
      't': 'd'
    };
    const update = {
      $set: {
        customFields: fields
      }
    };
    const options = {
      'multi': true
    };
    return this.update(query, update, options);
  }

  setFavoriteByRoomIdAndUserId(roomId, userId, favorite) {
    if (favorite == null) {
      favorite = true;
    }

    const query = {
      rid: roomId,
      'u._id': userId
    };
    const update = {
      $set: {
        f: favorite
      }
    };
    return this.update(query, update);
  }

  updateNameAndAlertByRoomId(roomId, name, fname) {
    const query = {
      rid: roomId
    };
    const update = {
      $set: {
        name,
        fname,
        alert: true
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  updateDisplayNameByRoomId(roomId, fname) {
    const query = {
      rid: roomId
    };
    const update = {
      $set: {
        fname
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  setUserUsernameByUserId(userId, username) {
    const query = {
      'u._id': userId
    };
    const update = {
      $set: {
        'u.username': username
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  setNameForDirectRoomsWithOldName(oldName, name) {
    const query = {
      name: oldName,
      t: 'd'
    };
    const update = {
      $set: {
        name
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  incUnreadForRoomIdExcludingUserId(roomId, userId, inc) {
    if (inc == null) {
      inc = 1;
    }

    const query = {
      rid: roomId,
      'u._id': {
        $ne: userId
      }
    };
    const update = {
      $set: {
        alert: true,
        open: true
      },
      $inc: {
        unread: inc
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  incGroupMentionsAndUnreadForRoomIdExcludingUserId(roomId, userId, incGroup = 1, incUnread = 1) {
    const query = {
      rid: roomId,
      'u._id': {
        $ne: userId
      }
    };
    const update = {
      $set: {
        alert: true,
        open: true
      },
      $inc: {
        unread: incUnread,
        groupMentions: incGroup
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  incUserMentionsAndUnreadForRoomIdAndUserIds(roomId, userIds, incUser = 1, incUnread = 1) {
    const query = {
      rid: roomId,
      'u._id': {
        $in: userIds
      }
    };
    const update = {
      $set: {
        alert: true,
        open: true
      },
      $inc: {
        unread: incUnread,
        userMentions: incUser
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  ignoreUser({
    _id,
    ignoredUser: ignored,
    ignore = true
  }) {
    const query = {
      _id
    };
    const update = {};

    if (ignore) {
      update.$addToSet = {
        ignored
      };
    } else {
      update.$pull = {
        ignored
      };
    }

    return this.update(query, update);
  }

  setAlertForRoomIdExcludingUserId(roomId, userId) {
    const query = {
      rid: roomId,
      'u._id': {
        $ne: userId
      },
      alert: {
        $ne: true
      }
    };
    const update = {
      $set: {
        alert: true
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  setOpenForRoomIdExcludingUserId(roomId, userId) {
    const query = {
      rid: roomId,
      'u._id': {
        $ne: userId
      },
      open: {
        $ne: true
      }
    };
    const update = {
      $set: {
        open: true
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  setBlockedByRoomId(rid, blocked, blocker) {
    const query = {
      rid,
      'u._id': blocked
    };
    const update = {
      $set: {
        blocked: true
      }
    };
    const query2 = {
      rid,
      'u._id': blocker
    };
    const update2 = {
      $set: {
        blocker: true
      }
    };
    return this.update(query, update) && this.update(query2, update2);
  }

  unsetBlockedByRoomId(rid, blocked, blocker) {
    const query = {
      rid,
      'u._id': blocked
    };
    const update = {
      $unset: {
        blocked: 1
      }
    };
    const query2 = {
      rid,
      'u._id': blocker
    };
    const update2 = {
      $unset: {
        blocker: 1
      }
    };
    return this.update(query, update) && this.update(query2, update2);
  }

  updateCustomFieldsByRoomId(rid, cfields) {
    const query = {
      rid
    };
    const customFields = cfields || {};
    const update = {
      $set: {
        customFields
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  updateTypeByRoomId(roomId, type) {
    const query = {
      rid: roomId
    };
    const update = {
      $set: {
        t: type
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  addRoleById(_id, role) {
    const query = {
      _id
    };
    const update = {
      $addToSet: {
        roles: role
      }
    };
    return this.update(query, update);
  }

  removeRoleById(_id, role) {
    const query = {
      _id
    };
    const update = {
      $pull: {
        roles: role
      }
    };
    return this.update(query, update);
  }

  setArchivedByUsername(username, archived) {
    const query = {
      t: 'd',
      name: username
    };
    const update = {
      $set: {
        archived
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  clearDesktopNotificationUserPreferences(userId) {
    const query = {
      'u._id': userId,
      desktopPrefOrigin: 'user'
    };
    const update = {
      $unset: {
        desktopNotifications: 1,
        desktopPrefOrigin: 1
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  updateDesktopNotificationUserPreferences(userId, desktopNotifications) {
    const query = {
      'u._id': userId,
      desktopPrefOrigin: {
        $ne: 'subscription'
      }
    };
    const update = {
      $set: {
        desktopNotifications,
        desktopPrefOrigin: 'user'
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  clearMobileNotificationUserPreferences(userId) {
    const query = {
      'u._id': userId,
      mobilePrefOrigin: 'user'
    };
    const update = {
      $unset: {
        mobilePushNotifications: 1,
        mobilePrefOrigin: 1
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  updateMobileNotificationUserPreferences(userId, mobilePushNotifications) {
    const query = {
      'u._id': userId,
      mobilePrefOrigin: {
        $ne: 'subscription'
      }
    };
    const update = {
      $set: {
        mobilePushNotifications,
        mobilePrefOrigin: 'user'
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  clearEmailNotificationUserPreferences(userId) {
    const query = {
      'u._id': userId,
      emailPrefOrigin: 'user'
    };
    const update = {
      $unset: {
        emailNotifications: 1,
        emailPrefOrigin: 1
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  updateEmailNotificationUserPreferences(userId, emailNotifications) {
    const query = {
      'u._id': userId,
      emailPrefOrigin: {
        $ne: 'subscription'
      }
    };
    const update = {
      $set: {
        emailNotifications,
        emailPrefOrigin: 'user'
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  updateUserHighlights(userId, userHighlights) {
    const query = {
      'u._id': userId
    };
    const update = {
      $set: {
        userHighlights
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

  updateDirectFNameByName(name, fname) {
    const query = {
      t: 'd',
      name
    };
    const update = {
      $set: {
        fname
      }
    };
    return this.update(query, update, {
      multi: true
    });
  } // INSERT


  createWithRoomAndUser(room, user, extraData) {
    const subscription = (0, _objectSpread2.default)({
      open: false,
      alert: false,
      unread: 0,
      userMentions: 0,
      groupMentions: 0,
      ts: room.ts,
      rid: room._id,
      name: room.name,
      fname: room.fname,
      customFields: room.customFields,
      t: room.t,
      u: {
        _id: user._id,
        username: user.username,
        name: user.name
      }
    }, RocketChat.getDefaultSubscriptionPref(user), extraData);
    const result = this.insert(subscription);
    RocketChat.models.Rooms.incUsersCountById(room._id);
    return result;
  } // REMOVE


  removeByUserId(userId) {
    const query = {
      'u._id': userId
    };
    const roomIds = this.findByUserId(userId).map(s => s.rid);
    const result = this.remove(query);

    if (Match.test(result, Number) && result > 0) {
      RocketChat.models.Rooms.incUsersCountByIds(roomIds, -1);
    }

    return result;
  }

  removeByRoomId(roomId) {
    const query = {
      rid: roomId
    };
    const result = this.remove(query);

    if (Match.test(result, Number) && result > 0) {
      RocketChat.models.Rooms.incUsersCountById(roomId, -result);
    }

    return result;
  }

  removeByRoomIdAndUserId(roomId, userId) {
    const query = {
      rid: roomId,
      'u._id': userId
    };
    const result = this.remove(query);

    if (Match.test(result, Number) && result > 0) {
      RocketChat.models.Rooms.incUsersCountById(roomId, -result);
    }

    return result;
  }

}

RocketChat.models.Subscriptions = new ModelSubscriptions('subscription', true);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Uploads.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/Uploads.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);
RocketChat.models.Uploads = new class extends RocketChat.models._Base {
  constructor() {
    super('uploads');
    this.model.before.insert((userId, doc) => {
      doc.instanceId = InstanceStatus.id();
    });
    this.tryEnsureIndex({
      'rid': 1
    });
    this.tryEnsureIndex({
      'uploadedAt': 1
    });
  }

  findNotHiddenFilesOfRoom(roomId, searchText, limit) {
    const fileQuery = {
      rid: roomId,
      complete: true,
      uploading: false,
      _hidden: {
        $ne: true
      }
    };

    if (searchText) {
      fileQuery.name = {
        $regex: new RegExp(RegExp.escape(searchText), 'i')
      };
    }

    const fileOptions = {
      limit,
      sort: {
        uploadedAt: -1
      },
      fields: {
        _id: 1,
        userId: 1,
        rid: 1,
        name: 1,
        description: 1,
        type: 1,
        url: 1,
        uploadedAt: 1
      }
    };
    return this.find(fileQuery, fileOptions);
  }

  insertFileInit(userId, store, file, extra) {
    const fileData = {
      userId,
      store,
      complete: false,
      uploading: true,
      progress: 0,
      extension: s.strRightBack(file.name, '.'),
      uploadedAt: new Date()
    };

    _.extend(fileData, file, extra);

    if (this.model.direct && this.model.direct.insert != null) {
      file = this.model.direct.insert(fileData);
    } else {
      file = this.insert(fileData);
    }

    return file;
  }

  updateFileComplete(fileId, userId, file) {
    let result;

    if (!fileId) {
      return;
    }

    const filter = {
      _id: fileId,
      userId
    };
    const update = {
      $set: {
        complete: true,
        uploading: false,
        progress: 1
      }
    };
    update.$set = _.extend(file, update.$set);

    if (this.model.direct && this.model.direct.update != null) {
      result = this.model.direct.update(filter, update);
    } else {
      result = this.update(filter, update);
    }

    return result;
  }

  deleteFile(fileId) {
    if (this.model.direct && this.model.direct.remove != null) {
      return this.model.direct.remove({
        _id: fileId
      });
    } else {
      return this.remove({
        _id: fileId
      });
    }
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Users.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/Users.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);

class ModelUsers extends RocketChat.models._Base {
  constructor() {
    super(...arguments);
    this.tryEnsureIndex({
      'roles': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'name': 1
    });
    this.tryEnsureIndex({
      'lastLogin': 1
    });
    this.tryEnsureIndex({
      'status': 1
    });
    this.tryEnsureIndex({
      'active': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'statusConnection': 1
    }, {
      sparse: 1
    });
    this.tryEnsureIndex({
      'type': 1
    });
  }

  findOneByImportId(_id, options) {
    return this.findOne({
      importIds: _id
    }, options);
  }

  findOneByUsername(username, options) {
    if (typeof username === 'string') {
      username = new RegExp(`^${username}$`, 'i');
    }

    const query = {
      username
    };
    return this.findOne(query, options);
  }

  findOneByEmailAddress(emailAddress, options) {
    const query = {
      'emails.address': new RegExp(`^${s.escapeRegExp(emailAddress)}$`, 'i')
    };
    return this.findOne(query, options);
  }

  findOneAdmin(admin, options) {
    const query = {
      admin
    };
    return this.findOne(query, options);
  }

  findOneByIdAndLoginToken(_id, token, options) {
    const query = {
      _id,
      'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(token)
    };
    return this.findOne(query, options);
  }

  findOneById(userId, options) {
    const query = {
      _id: userId
    };
    return this.findOne(query, options);
  } // FIND


  findById(userId) {
    const query = {
      _id: userId
    };
    return this.find(query);
  }

  findByIds(users, options) {
    const query = {
      _id: {
        $in: users
      }
    };
    return this.find(query, options);
  }

  findUsersNotOffline(options) {
    const query = {
      username: {
        $exists: 1
      },
      status: {
        $in: ['online', 'away', 'busy']
      }
    };
    return this.find(query, options);
  }

  findByUsername(username, options) {
    const query = {
      username
    };
    return this.find(query, options);
  }

  findActiveByUsernameOrNameRegexWithExceptions(searchTerm, exceptions, options) {
    if (exceptions == null) {
      exceptions = [];
    }

    if (options == null) {
      options = {};
    }

    if (!_.isArray(exceptions)) {
      exceptions = [exceptions];
    }

    const termRegex = new RegExp(s.escapeRegExp(searchTerm), 'i');
    const query = {
      $or: [{
        username: termRegex
      }, {
        name: termRegex
      }],
      active: true,
      type: {
        $in: ['user', 'bot']
      },
      $and: [{
        username: {
          $exists: true
        }
      }, {
        username: {
          $nin: exceptions
        }
      }]
    };
    return this.find(query, options);
  }

  findByActiveUsersExcept(searchTerm, exceptions, options) {
    if (exceptions == null) {
      exceptions = [];
    }

    if (options == null) {
      options = {};
    }

    if (!_.isArray(exceptions)) {
      exceptions = [exceptions];
    }

    const termRegex = new RegExp(s.escapeRegExp(searchTerm), 'i');

    const orStmt = _.reduce(RocketChat.settings.get('Accounts_SearchFields').trim().split(','), function (acc, el) {
      acc.push({
        [el.trim()]: termRegex
      });
      return acc;
    }, []);

    const query = {
      $and: [{
        active: true,
        $or: orStmt
      }, {
        username: {
          $exists: true,
          $nin: exceptions
        }
      }]
    }; // do not use cache

    return this._db.find(query, options);
  }

  findUsersByNameOrUsername(nameOrUsername, options) {
    const query = {
      username: {
        $exists: 1
      },
      $or: [{
        name: nameOrUsername
      }, {
        username: nameOrUsername
      }],
      type: {
        $in: ['user']
      }
    };
    return this.find(query, options);
  }

  findByUsernameNameOrEmailAddress(usernameNameOrEmailAddress, options) {
    const query = {
      $or: [{
        name: usernameNameOrEmailAddress
      }, {
        username: usernameNameOrEmailAddress
      }, {
        'emails.address': usernameNameOrEmailAddress
      }],
      type: {
        $in: ['user', 'bot']
      }
    };
    return this.find(query, options);
  }

  findLDAPUsers(options) {
    const query = {
      ldap: true
    };
    return this.find(query, options);
  }

  findCrowdUsers(options) {
    const query = {
      crowd: true
    };
    return this.find(query, options);
  }

  getLastLogin(options) {
    if (options == null) {
      options = {};
    }

    const query = {
      lastLogin: {
        $exists: 1
      }
    };
    options.sort = {
      lastLogin: -1
    };
    options.limit = 1;
    const [user] = this.find(query, options).fetch();
    return user && user.lastLogin;
  }

  findUsersByUsernames(usernames, options) {
    const query = {
      username: {
        $in: usernames
      }
    };
    return this.find(query, options);
  }

  findUsersByIds(ids, options) {
    const query = {
      _id: {
        $in: ids
      }
    };
    return this.find(query, options);
  }

  findUsersWithUsernameByIds(ids, options) {
    const query = {
      _id: {
        $in: ids
      },
      username: {
        $exists: 1
      }
    };
    return this.find(query, options);
  }

  findUsersWithUsernameByIdsNotOffline(ids, options) {
    const query = {
      _id: {
        $in: ids
      },
      username: {
        $exists: 1
      },
      status: {
        $in: ['online', 'away', 'busy']
      }
    };
    return this.find(query, options);
  } // UPDATE


  addImportIds(_id, importIds) {
    importIds = [].concat(importIds);
    const query = {
      _id
    };
    const update = {
      $addToSet: {
        importIds: {
          $each: importIds
        }
      }
    };
    return this.update(query, update);
  }

  updateLastLoginById(_id) {
    const update = {
      $set: {
        lastLogin: new Date()
      }
    };
    return this.update(_id, update);
  }

  setServiceId(_id, serviceName, serviceId) {
    const update = {
      $set: {}
    };
    const serviceIdKey = `services.${serviceName}.id`;
    update.$set[serviceIdKey] = serviceId;
    return this.update(_id, update);
  }

  setUsername(_id, username) {
    const update = {
      $set: {
        username
      }
    };
    return this.update(_id, update);
  }

  setEmail(_id, email) {
    const update = {
      $set: {
        emails: [{
          address: email,
          verified: false
        }]
      }
    };
    return this.update(_id, update);
  }

  setEmailVerified(_id, email) {
    const query = {
      _id,
      emails: {
        $elemMatch: {
          address: email,
          verified: false
        }
      }
    };
    const update = {
      $set: {
        'emails.$.verified': true
      }
    };
    return this.update(query, update);
  }

  setName(_id, name) {
    const update = {
      $set: {
        name
      }
    };
    return this.update(_id, update);
  }

  setCustomFields(_id, fields) {
    const values = {};
    Object.keys(fields).forEach(key => {
      values[`customFields.${key}`] = fields[key];
    });
    const update = {
      $set: values
    };
    return this.update(_id, update);
  }

  setAvatarOrigin(_id, origin) {
    const update = {
      $set: {
        avatarOrigin: origin
      }
    };
    return this.update(_id, update);
  }

  unsetAvatarOrigin(_id) {
    const update = {
      $unset: {
        avatarOrigin: 1
      }
    };
    return this.update(_id, update);
  }

  setUserActive(_id, active) {
    if (active == null) {
      active = true;
    }

    const update = {
      $set: {
        active
      }
    };
    return this.update(_id, update);
  }

  setAllUsersActive(active) {
    const update = {
      $set: {
        active
      }
    };
    return this.update({}, update, {
      multi: true
    });
  }

  unsetLoginTokens(_id) {
    const update = {
      $set: {
        'services.resume.loginTokens': []
      }
    };
    return this.update(_id, update);
  }

  unsetRequirePasswordChange(_id) {
    const update = {
      $unset: {
        'requirePasswordChange': true,
        'requirePasswordChangeReason': true
      }
    };
    return this.update(_id, update);
  }

  resetPasswordAndSetRequirePasswordChange(_id, requirePasswordChange, requirePasswordChangeReason) {
    const update = {
      $unset: {
        'services.password': 1
      },
      $set: {
        requirePasswordChange,
        requirePasswordChangeReason
      }
    };
    return this.update(_id, update);
  }

  setLanguage(_id, language) {
    const update = {
      $set: {
        language
      }
    };
    return this.update(_id, update);
  }

  setProfile(_id, profile) {
    const update = {
      $set: {
        'settings.profile': profile
      }
    };
    return this.update(_id, update);
  }

  clearSettings(_id) {
    const update = {
      $set: {
        settings: {}
      }
    };
    return this.update(_id, update);
  }

  setPreferences(_id, preferences) {
    const settings = Object.assign({}, ...Object.keys(preferences).map(key => {
      return {
        [`settings.preferences.${key}`]: preferences[key]
      };
    }));
    const update = {
      $set: settings
    };
    return this.update(_id, update);
  }

  setUtcOffset(_id, utcOffset) {
    const query = {
      _id,
      utcOffset: {
        $ne: utcOffset
      }
    };
    const update = {
      $set: {
        utcOffset
      }
    };
    return this.update(query, update);
  }

  saveUserById(_id, data) {
    const setData = {};
    const unsetData = {};

    if (data.name != null) {
      if (!_.isEmpty(s.trim(data.name))) {
        setData.name = s.trim(data.name);
      } else {
        unsetData.name = 1;
      }
    }

    if (data.email != null) {
      if (!_.isEmpty(s.trim(data.email))) {
        setData.emails = [{
          address: s.trim(data.email)
        }];
      } else {
        unsetData.emails = 1;
      }
    }

    if (data.phone != null) {
      if (!_.isEmpty(s.trim(data.phone))) {
        setData.phone = [{
          phoneNumber: s.trim(data.phone)
        }];
      } else {
        unsetData.phone = 1;
      }
    }

    const update = {};

    if (!_.isEmpty(setData)) {
      update.$set = setData;
    }

    if (!_.isEmpty(unsetData)) {
      update.$unset = unsetData;
    }

    if (_.isEmpty(update)) {
      return true;
    }

    return this.update({
      _id
    }, update);
  }

  setReason(_id, reason) {
    const update = {
      $set: {
        reason
      }
    };
    return this.update(_id, update);
  }

  unsetReason(_id) {
    const update = {
      $unset: {
        reason: true
      }
    };
    return this.update(_id, update);
  }

  addBannerById(_id, banner) {
    const update = {
      $set: {
        [`banners.${banner.id}`]: banner
      }
    };
    return this.update({
      _id
    }, update);
  }

  removeBannerById(_id, banner) {
    const update = {
      $unset: {
        [`banners.${banner.id}`]: true
      }
    };
    return this.update({
      _id
    }, update);
  } // INSERT


  create(data) {
    const user = {
      createdAt: new Date(),
      avatarOrigin: 'none'
    };

    _.extend(user, data);

    return this.insert(user);
  } // REMOVE


  removeById(_id) {
    return this.remove(_id);
  }
  /*
  Find users to send a message by email if:
  - he is not online
  - has a verified email
  - has not disabled email notifications
  - `active` is equal to true (false means they were deactivated and can't login)
  */


  getUsersToSendOfflineEmail(usersIds) {
    const query = {
      _id: {
        $in: usersIds
      },
      active: true,
      status: 'offline',
      statusConnection: {
        $ne: 'online'
      },
      'emails.verified': true
    };
    const options = {
      fields: {
        name: 1,
        username: 1,
        emails: 1,
        'settings.preferences.emailNotificationMode': 1,
        language: 1
      }
    };
    return this.find(query, options);
  }

}

RocketChat.models.Users = new ModelUsers(Meteor.users, true);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ExportOperations.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/ExportOperations.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
RocketChat.models.ExportOperations = new class ModelExportOperations extends RocketChat.models._Base {
  constructor() {
    super('export_operations');
    this.tryEnsureIndex({
      'userId': 1
    });
    this.tryEnsureIndex({
      'status': 1
    });
  } // FIND


  findById(id) {
    const query = {
      _id: id
    };
    return this.find(query);
  }

  findLastOperationByUser(userId, fullExport = false, options = {}) {
    const query = {
      userId,
      fullExport
    };
    options.sort = {
      'createdAt': -1
    };
    return this.findOne(query, options);
  }

  findPendingByUser(userId, options) {
    const query = {
      userId,
      status: {
        $nin: ['completed']
      }
    };
    return this.find(query, options);
  }

  findAllPending(options) {
    const query = {
      status: {
        $nin: ['completed']
      }
    };
    return this.find(query, options);
  } // UPDATE


  updateOperation(data) {
    const update = {
      $set: {
        roomList: data.roomList,
        status: data.status,
        fileList: data.fileList,
        generatedFile: data.generatedFile
      }
    };
    return this.update(data._id, update);
  } // INSERT


  create(data) {
    const exportOperation = {
      createdAt: new Date()
    };

    _.extend(exportOperation, data);

    return this.insert(exportOperation);
  } // REMOVE


  removeById(_id) {
    return this.remove(_id);
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"UserDataFiles.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/UserDataFiles.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
RocketChat.models.UserDataFiles = new class ModelUserDataFiles extends RocketChat.models._Base {
  constructor() {
    super('user_data_files');
    this.tryEnsureIndex({
      'userId': 1
    });
  } // FIND


  findById(id) {
    const query = {
      _id: id
    };
    return this.find(query);
  }

  findLastFileByUser(userId, options = {}) {
    const query = {
      userId
    };
    options.sort = {
      '_updatedAt': -1
    };
    return this.findOne(query, options);
  } // INSERT


  create(data) {
    const userDataFile = {
      createdAt: new Date()
    };

    _.extend(userDataFile, data);

    return this.insert(userDataFile);
  } // REMOVE


  removeById(_id) {
    return this.remove(_id);
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"_BaseDb.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/models/_BaseDb.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let EventEmitter;
module.watch(require("events"), {
  EventEmitter(v) {
    EventEmitter = v;
  }

}, 1);
const baseName = 'rocketchat_';
const trash = new Mongo.Collection(`${baseName}_trash`);

try {
  trash._ensureIndex({
    collection: 1
  });

  trash._ensureIndex({
    _deletedAt: 1
  }, {
    expireAfterSeconds: 60 * 60 * 24 * 30
  });
} catch (e) {
  console.log(e);
}

const isOplogAvailable = MongoInternals.defaultRemoteCollectionDriver().mongo._oplogHandle && !!MongoInternals.defaultRemoteCollectionDriver().mongo._oplogHandle.onOplogEntry;
let isOplogEnabled = isOplogAvailable;
RocketChat.settings.get('Force_Disable_OpLog_For_Cache', (key, value) => {
  isOplogEnabled = isOplogAvailable && value === false;
});

class ModelsBaseDb extends EventEmitter {
  constructor(model, baseModel) {
    super();

    if (Match.test(model, String)) {
      this.name = model;
      this.collectionName = this.baseName + this.name;
      this.model = new Mongo.Collection(this.collectionName);
    } else {
      this.name = model._name;
      this.collectionName = this.name;
      this.model = model;
    }

    this.baseModel = baseModel;
    this.wrapModel();
    let alreadyListeningToOplog = false; // When someone start listening for changes we start oplog if available

    this.on('newListener', (event
    /*, listener*/
    ) => {
      if (event === 'change' && alreadyListeningToOplog === false) {
        alreadyListeningToOplog = true;

        if (isOplogEnabled) {
          const query = {
            collection: this.collectionName
          };

          MongoInternals.defaultRemoteCollectionDriver().mongo._oplogHandle.onOplogEntry(query, this.processOplogRecord.bind(this));

          MongoInternals.defaultRemoteCollectionDriver().mongo._oplogHandle._defineTooFarBehind(Number.MAX_SAFE_INTEGER);
        }
      }
    });
    this.tryEnsureIndex({
      '_updatedAt': 1
    });
  }

  get baseName() {
    return baseName;
  }

  setUpdatedAt(record = {}) {
    // TODO: Check if this can be deleted, Rodrigo does not rememebr WHY he added it. So he removed it to fix issue #5541
    // setUpdatedAt(record = {}, checkQuery = false, query) {
    // if (checkQuery === true) {
    // 	if (!query || Object.keys(query).length === 0) {
    // 		throw new Meteor.Error('Models._Base: Empty query');
    // 	}
    // }
    if (/(^|,)\$/.test(Object.keys(record).join(','))) {
      record.$set = record.$set || {};
      record.$set._updatedAt = new Date();
    } else {
      record._updatedAt = new Date();
    }

    return record;
  }

  wrapModel() {
    this.originals = {
      insert: this.model.insert.bind(this.model),
      update: this.model.update.bind(this.model),
      remove: this.model.remove.bind(this.model)
    };
    const self = this;

    this.model.insert = function () {
      return self.insert(...arguments);
    };

    this.model.update = function () {
      return self.update(...arguments);
    };

    this.model.remove = function () {
      return self.remove(...arguments);
    };
  }

  _doNotMixInclusionAndExclusionFields(options) {
    if (options && options.fields) {
      const keys = Object.keys(options.fields);
      const removeKeys = keys.filter(key => options.fields[key] === 0);

      if (keys.length > removeKeys.length) {
        removeKeys.forEach(key => delete options.fields[key]);
      }
    }
  }

  find() {
    this._doNotMixInclusionAndExclusionFields(arguments[1]);

    return this.model.find(...arguments);
  }

  findOne() {
    this._doNotMixInclusionAndExclusionFields(arguments[1]);

    return this.model.findOne(...arguments);
  }

  findOneById(_id, options) {
    return this.findOne({
      _id
    }, options);
  }

  findOneByIds(ids, options) {
    return this.findOne({
      _id: {
        $in: ids
      }
    }, options);
  }

  updateHasPositionalOperator(update) {
    return Object.keys(update).some(key => key.includes('.$') || Match.test(update[key], Object) && this.updateHasPositionalOperator(update[key]));
  }

  processOplogRecord(action) {
    if (isOplogEnabled === false) {
      return;
    }

    if (action.op.op === 'i') {
      this.emit('change', {
        action: 'insert',
        clientAction: 'inserted',
        id: action.op.o._id,
        data: action.op.o,
        oplog: true
      });
      return;
    }

    if (action.op.op === 'u') {
      if (!action.op.o.$set && !action.op.o.$unset) {
        this.emit('change', {
          action: 'update',
          clientAction: 'updated',
          id: action.id,
          data: action.op.o,
          oplog: true
        });
        return;
      }

      const diff = {};

      if (action.op.o.$set) {
        for (const key in action.op.o.$set) {
          if (action.op.o.$set.hasOwnProperty(key)) {
            diff[key] = action.op.o.$set[key];
          }
        }
      }

      if (action.op.o.$unset) {
        for (const key in action.op.o.$unset) {
          if (action.op.o.$unset.hasOwnProperty(key)) {
            diff[key] = undefined;
          }
        }
      }

      this.emit('change', {
        action: 'update',
        clientAction: 'updated',
        id: action.id,
        diff,
        oplog: true
      });
      return;
    }

    if (action.op.op === 'd') {
      this.emit('change', {
        action: 'remove',
        clientAction: 'removed',
        id: action.id,
        oplog: true
      });
      return;
    }
  }

  insert(record) {
    this.setUpdatedAt(record);
    const result = this.originals.insert(...arguments);
    record._id = result;

    if (!isOplogEnabled && this.listenerCount('change') > 0) {
      this.emit('change', {
        action: 'insert',
        clientAction: 'inserted',
        id: result,
        data: _.extend({}, record),
        oplog: false
      });
    }

    return result;
  }

  update(query, update, options = {}) {
    this.setUpdatedAt(update, true, query);
    let ids = [];

    if (!isOplogEnabled && this.listenerCount('change') > 0) {
      const findOptions = {
        fields: {
          _id: 1
        }
      };
      let records = options.multi ? this.find(query, findOptions).fetch() : this.findOne(query, findOptions) || [];

      if (!Array.isArray(records)) {
        records = [records];
      }

      ids = records.map(item => item._id);

      if (options.upsert !== true && this.updateHasPositionalOperator(update) === false) {
        query = {
          _id: {
            $in: ids
          }
        };
      }
    } // TODO: CACHE: Can we use findAndModify here when oplog is disabled?


    const result = this.originals.update(query, update, options);

    if (!isOplogEnabled && this.listenerCount('change') > 0) {
      if (options.upsert === true && result.insertedId) {
        this.emit('change', {
          action: 'insert',
          clientAction: 'inserted',
          id: result.insertedId,
          oplog: false
        });
        return result;
      }

      for (const id of ids) {
        this.emit('change', {
          action: 'update',
          clientAction: 'updated',
          id,
          oplog: false
        });
      }
    }

    return result;
  }

  upsert(query, update, options = {}) {
    options.upsert = true;
    options._returnObject = true;
    return this.update(query, update, options);
  }

  remove(query) {
    const records = this.model.find(query).fetch();
    const ids = [];

    for (const record of records) {
      ids.push(record._id);
      record._deletedAt = new Date();
      record.__collection__ = this.name;
      trash.upsert({
        _id: record._id
      }, _.omit(record, '_id'));
    }

    query = {
      _id: {
        $in: ids
      }
    };
    const result = this.originals.remove(query);

    if (!isOplogEnabled && this.listenerCount('change') > 0) {
      for (const record of records) {
        this.emit('change', {
          action: 'remove',
          clientAction: 'removed',
          id: record._id,
          data: _.extend({}, record),
          oplog: false
        });
      }
    }

    return result;
  }

  insertOrUpsert(...args) {
    if (args[0] && args[0]._id) {
      const _id = args[0]._id;
      delete args[0]._id;
      args.unshift({
        _id
      });
      this.upsert(...args);
      return _id;
    } else {
      return this.insert(...args);
    }
  }

  allow() {
    return this.model.allow(...arguments);
  }

  deny() {
    return this.model.deny(...arguments);
  }

  ensureIndex() {
    return this.model._ensureIndex(...arguments);
  }

  dropIndex() {
    return this.model._dropIndex(...arguments);
  }

  tryEnsureIndex() {
    try {
      return this.ensureIndex(...arguments);
    } catch (e) {
      console.error('Error creating index:', this.name, '->', ...arguments, e);
    }
  }

  tryDropIndex() {
    try {
      return this.dropIndex(...arguments);
    } catch (e) {
      console.error('Error dropping index:', this.name, '->', ...arguments, e);
    }
  }

  trashFind(query, options) {
    query.__collection__ = this.name;
    return trash.find(query, options);
  }

  trashFindOneById(_id, options) {
    const query = {
      _id,
      __collection__: this.name
    };
    return trash.findOne(query, options);
  }

  trashFindDeletedAfter(deletedAt, query = {}, options) {
    query.__collection__ = this.name;
    query._deletedAt = {
      $gt: deletedAt
    };
    return trash.find(query, options);
  }

}

module.exportDefault(ModelsBaseDb);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"oauth":{"oauth.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/oauth/oauth.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const AccessTokenServices = {};

RocketChat.registerAccessTokenService = function (serviceName, handleAccessTokenRequest) {
  AccessTokenServices[serviceName] = {
    serviceName,
    handleAccessTokenRequest
  };
}; // Listen to calls to `login` with an oauth option set. This is where
// users actually get logged in to meteor via oauth.


Accounts.registerLoginHandler(function (options) {
  if (!options.accessToken) {
    return undefined; // don't handle
  }

  check(options, Match.ObjectIncluding({
    serviceName: String
  }));
  const service = AccessTokenServices[options.serviceName]; // Skip everything if there's no service set by the oauth middleware

  if (!service) {
    throw new Error(`Unexpected AccessToken service ${options.serviceName}`);
  } // Make sure we're configured


  if (!ServiceConfiguration.configurations.findOne({
    service: service.serviceName
  })) {
    throw new ServiceConfiguration.ConfigError();
  }

  if (!_.contains(Accounts.oauth.serviceNames(), service.serviceName)) {
    // serviceName was not found in the registered services list.
    // This could happen because the service never registered itself or
    // unregisterService was called on it.
    return {
      type: 'oauth',
      error: new Meteor.Error(Accounts.LoginCancelledError.numericError, `No registered oauth service found for: ${service.serviceName}`)
    };
  }

  const oauthResult = service.handleAccessTokenRequest(options);
  return Accounts.updateOrCreateUserFromExternalService(service.serviceName, oauthResult.serviceData, oauthResult.options);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"facebook.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/oauth/facebook.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let OAuth;
module.watch(require("meteor/oauth"), {
  OAuth(v) {
    OAuth = v;
  }

}, 1);

const crypto = Npm.require('crypto');

const whitelisted = ['id', 'email', 'name', 'first_name', 'last_name', 'link', 'gender', 'locale', 'age_range'];
const FB_API_VERSION = 'v2.9';
const FB_URL = 'https://graph.facebook.com';

const getIdentity = function (accessToken, fields, secret) {
  const hmac = crypto.createHmac('sha256', OAuth.openSecret(secret));
  hmac.update(accessToken);

  try {
    return HTTP.get(`${FB_URL}/${FB_API_VERSION}/me`, {
      params: {
        access_token: accessToken,
        appsecret_proof: hmac.digest('hex'),
        fields: fields.join(',')
      }
    }).data;
  } catch (err) {
    throw _.extend(new Error(`Failed to fetch identity from Facebook. ${err.message}`), {
      response: err.response
    });
  }
};

RocketChat.registerAccessTokenService('facebook', function (options) {
  check(options, Match.ObjectIncluding({
    accessToken: String,
    secret: String,
    expiresIn: Match.Integer,
    identity: Match.Maybe(Object)
  }));
  const identity = options.identity || getIdentity(options.accessToken, whitelisted, options.secret);
  const serviceData = {
    accessToken: options.accessToken,
    expiresAt: +new Date() + 1000 * parseInt(options.expiresIn, 10)
  };

  const fields = _.pick(identity, whitelisted);

  _.extend(serviceData, fields);

  return {
    serviceData,
    options: {
      profile: {
        name: identity.name
      }
    }
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"twitter.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/oauth/twitter.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Twit;
module.watch(require("twit"), {
  default(v) {
    Twit = v;
  }

}, 0);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 1);
const whitelistedFields = ['id', 'name', 'description', 'profile_image_url', 'profile_image_url_https', 'lang', 'email'];

const getIdentity = function (accessToken, appId, appSecret, accessTokenSecret) {
  const Twitter = new Twit({
    consumer_key: appId,
    consumer_secret: appSecret,
    access_token: accessToken,
    access_token_secret: accessTokenSecret
  });
  const syncTwitter = Meteor.wrapAsync(Twitter.get, Twitter);

  try {
    return syncTwitter('account/verify_credentials.json?include_email=true');
  } catch (err) {
    throw _.extend(new Error(`Failed to fetch identity from Twwiter. ${err.message}`), {
      response: err.response
    });
  }
};

RocketChat.registerAccessTokenService('twitter', function (options) {
  check(options, Match.ObjectIncluding({
    accessToken: String,
    appSecret: String,
    appId: String,
    accessTokenSecret: String,
    expiresIn: Match.Integer,
    identity: Match.Maybe(Object)
  }));
  const identity = options.identity || getIdentity(options.accessToken, options.appId, options.appSecret, options.accessTokenSecret);
  const serviceData = {
    accessToken: options.accessToken,
    expiresAt: +new Date() + 1000 * parseInt(options.expiresIn, 10)
  };

  const fields = _.pick(identity, whitelistedFields);

  _.extend(serviceData, fields);

  return {
    serviceData,
    options: {
      profile: {
        name: identity.name
      }
    }
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"google.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/oauth/google.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

function getIdentity(accessToken) {
  try {
    return HTTP.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      params: {
        access_token: accessToken
      }
    }).data;
  } catch (err) {
    throw _.extend(new Error(`Failed to fetch identity from Google. ${err.message}`), {
      response: err.response
    });
  }
}

function getScopes(accessToken) {
  try {
    return HTTP.get('https://www.googleapis.com/oauth2/v1/tokeninfo', {
      params: {
        access_token: accessToken
      }
    }).data.scope.split(' ');
  } catch (err) {
    throw _.extend(new Error(`Failed to fetch tokeninfo from Google. ${err.message}`), {
      response: err.response
    });
  }
}

RocketChat.registerAccessTokenService('google', function (options) {
  check(options, Match.ObjectIncluding({
    accessToken: String,
    idToken: String,
    expiresIn: Match.Integer,
    scope: Match.Maybe(String),
    identity: Match.Maybe(Object)
  }));
  const identity = options.identity || getIdentity(options.accessToken);
  const serviceData = {
    accessToken: options.accessToken,
    idToken: options.idToken,
    expiresAt: +new Date() + 1000 * parseInt(options.expiresIn, 10),
    scope: options.scopes || getScopes(options.accessToken)
  };

  const fields = _.pick(identity, Google.whitelistedFields);

  _.extend(serviceData, fields); // only set the token in serviceData if it's there. this ensures
  // that we don't lose old ones (since we only get this on the first
  // log in attempt)


  if (options.refreshToken) {
    serviceData.refreshToken = options.refreshToken;
  }

  return {
    serviceData,
    options: {
      profile: {
        name: identity.name
      }
    }
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"proxy.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/oauth/proxy.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
OAuth._redirectUri = _.wrap(OAuth._redirectUri, function (func, serviceName, ...args) {
  const proxy = RocketChat.settings.get('Accounts_OAuth_Proxy_services').replace(/\s/g, '').split(',');

  if (proxy.includes(serviceName)) {
    return `${RocketChat.settings.get('Accounts_OAuth_Proxy_host')}/oauth_redirect`;
  } else {
    return func(serviceName, ...args);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"statsTracker.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/startup/statsTracker.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let StatsD;
module.watch(require("node-dogstatsd"), {
  StatsD(v) {
    StatsD = v;
  }

}, 0);
RocketChat.statsTracker = new class StatsTracker {
  constructor() {
    this.StatsD = StatsD;
    this.dogstatsd = new this.StatsD();
  }

  track(type, stats, ...args) {
    this.dogstatsd[type](`RocketChat.${stats}`, ...args);
  }

  now() {
    const hrtime = process.hrtime();
    return hrtime[0] * 1000000 + hrtime[1] / 1000;
  }

  timing(stats, time, tags) {
    this.track('timing', stats, time, tags);
  }

  increment(stats, time, tags) {
    this.track('increment', stats, time, tags);
  }

  decrement(stats, time, tags) {
    this.track('decrement', stats, time, tags);
  }

  histogram(stats, time, tags) {
    this.track('histogram', stats, time, tags);
  }

  gauge(stats, time, tags) {
    this.track('gauge', stats, time, tags);
  }

  unique(stats, time, tags) {
    this.track('unique', stats, time, tags);
  }

  set(stats, time, tags) {
    this.track('set', stats, time, tags);
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settingsOnLoadCdnPrefix.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/startup/settingsOnLoadCdnPrefix.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

function testWebAppInternals(fn) {
  typeof WebAppInternals !== 'undefined' && fn(WebAppInternals);
}

RocketChat.settings.onload('CDN_PREFIX', function (key, value) {
  if (_.isString(value) && value.trim()) {
    return testWebAppInternals(WebAppInternals => WebAppInternals.setBundledJsCssPrefix(value));
  }
});
Meteor.startup(function () {
  const value = RocketChat.settings.get('CDN_PREFIX');

  if (_.isString(value) && value.trim()) {
    return testWebAppInternals(WebAppInternals => WebAppInternals.setBundledJsCssPrefix(value));
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settingsOnLoadDirectReply.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/startup/settingsOnLoadDirectReply.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let IMAPIntercepter;
module.watch(require("../lib/interceptDirectReplyEmails.js"), {
  IMAPIntercepter(v) {
    IMAPIntercepter = v;
  }

}, 1);
let POP3Helper;
module.watch(require("../lib/interceptDirectReplyEmails.js"), {
  POP3Helper(v) {
    POP3Helper = v;
  }

}, 2);

const startEmailIntercepter = _.debounce(Meteor.bindEnvironment(function () {
  console.log('Starting Email Intercepter...');

  if (RocketChat.settings.get('Direct_Reply_Enable') && RocketChat.settings.get('Direct_Reply_Protocol') && RocketChat.settings.get('Direct_Reply_Host') && RocketChat.settings.get('Direct_Reply_Port') && RocketChat.settings.get('Direct_Reply_Username') && RocketChat.settings.get('Direct_Reply_Password')) {
    if (RocketChat.settings.get('Direct_Reply_Protocol') === 'IMAP') {
      // stop already running IMAP instance
      if (RocketChat.IMAP && RocketChat.IMAP.isActive()) {
        console.log('Disconnecting already running IMAP instance...');
        RocketChat.IMAP.stop(Meteor.bindEnvironment(function () {
          console.log('Starting new IMAP instance......');
          RocketChat.IMAP = new IMAPIntercepter();
          RocketChat.IMAP.start();
          return true;
        }));
      } else if (RocketChat.POP3 && RocketChat.POP3Helper && RocketChat.POP3Helper.isActive()) {
        console.log('Disconnecting already running POP instance...');
        RocketChat.POP3Helper.stop(Meteor.bindEnvironment(function () {
          console.log('Starting new IMAP instance......');
          RocketChat.IMAP = new IMAPIntercepter();
          RocketChat.IMAP.start();
          return true;
        }));
      } else {
        console.log('Starting new IMAP instance......');
        RocketChat.IMAP = new IMAPIntercepter();
        RocketChat.IMAP.start();
        return true;
      }
    } else if (RocketChat.settings.get('Direct_Reply_Protocol') === 'POP') {
      // stop already running POP instance
      if (RocketChat.POP3 && RocketChat.POP3Helper && RocketChat.POP3Helper.isActive()) {
        console.log('Disconnecting already running POP instance...');
        RocketChat.POP3Helper.stop(Meteor.bindEnvironment(function () {
          console.log('Starting new POP instance......');
          RocketChat.POP3Helper = new POP3Helper();
          RocketChat.POP3Helper.start();
          return true;
        }));
      } else if (RocketChat.IMAP && RocketChat.IMAP.isActive()) {
        console.log('Disconnecting already running IMAP instance...');
        RocketChat.IMAP.stop(Meteor.bindEnvironment(function () {
          console.log('Starting new POP instance......');
          RocketChat.POP3Helper = new POP3Helper();
          RocketChat.POP3Helper.start();
          return true;
        }));
      } else {
        console.log('Starting new POP instance......');
        RocketChat.POP3Helper = new POP3Helper();
        RocketChat.POP3Helper.start();
        return true;
      }
    }
  } else if (RocketChat.IMAP && RocketChat.IMAP.isActive()) {
    // stop IMAP instance
    RocketChat.IMAP.stop();
  } else if (RocketChat.POP3 && RocketChat.POP3Helper.isActive()) {
    // stop POP3 instance
    RocketChat.POP3Helper.stop();
  }
}), 1000);

RocketChat.settings.onload(/^Direct_Reply_.+/, startEmailIntercepter);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settingsOnLoadSMTP.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/startup/settingsOnLoadSMTP.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

const buildMailURL = _.debounce(function () {
  console.log('Updating process.env.MAIL_URL');

  if (RocketChat.settings.get('SMTP_Host')) {
    process.env.MAIL_URL = `${RocketChat.settings.get('SMTP_Protocol')}://`;

    if (RocketChat.settings.get('SMTP_Username') && RocketChat.settings.get('SMTP_Password')) {
      process.env.MAIL_URL += `${encodeURIComponent(RocketChat.settings.get('SMTP_Username'))}:${encodeURIComponent(RocketChat.settings.get('SMTP_Password'))}@`;
    }

    process.env.MAIL_URL += encodeURIComponent(RocketChat.settings.get('SMTP_Host'));

    if (RocketChat.settings.get('SMTP_Port')) {
      process.env.MAIL_URL += `:${parseInt(RocketChat.settings.get('SMTP_Port'))}`;
    }

    process.env.MAIL_URL += `?pool=${RocketChat.settings.get('SMTP_Pool')}`;

    if (RocketChat.settings.get('SMTP_Protocol') === 'smtp' && RocketChat.settings.get('SMTP_IgnoreTLS')) {
      process.env.MAIL_URL += '&secure=false&ignoreTLS=true';
    }

    return process.env.MAIL_URL;
  }
}, 500);

RocketChat.settings.onload('SMTP_Host', function (key, value) {
  if (_.isString(value)) {
    return buildMailURL();
  }
});
RocketChat.settings.onload('SMTP_Port', function () {
  return buildMailURL();
});
RocketChat.settings.onload('SMTP_Username', function (key, value) {
  if (_.isString(value)) {
    return buildMailURL();
  }
});
RocketChat.settings.onload('SMTP_Password', function (key, value) {
  if (_.isString(value)) {
    return buildMailURL();
  }
});
RocketChat.settings.onload('SMTP_Protocol', function () {
  return buildMailURL();
});
RocketChat.settings.onload('SMTP_Pool', function () {
  return buildMailURL();
});
RocketChat.settings.onload('SMTP_IgnoreTLS', function () {
  return buildMailURL();
});
Meteor.startup(function () {
  return buildMailURL();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oAuthServicesUpdate.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/startup/oAuthServicesUpdate.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const logger = new Logger('rocketchat:lib', {
  methods: {
    oauth_updated: {
      type: 'info'
    }
  }
});

function _OAuthServicesUpdate() {
  const services = RocketChat.settings.get(/^(Accounts_OAuth_|Accounts_OAuth_Custom-)[a-z0-9_]+$/i);
  services.forEach(service => {
    logger.oauth_updated(service.key);
    let serviceName = service.key.replace('Accounts_OAuth_', '');

    if (serviceName === 'Meteor') {
      serviceName = 'meteor-developer';
    }

    if (/Accounts_OAuth_Custom-/.test(service.key)) {
      serviceName = service.key.replace('Accounts_OAuth_Custom-', '');
    }

    if (service.value === true) {
      const data = {
        clientId: RocketChat.settings.get(`${service.key}_id`),
        secret: RocketChat.settings.get(`${service.key}_secret`)
      };

      if (/Accounts_OAuth_Custom-/.test(service.key)) {
        data.custom = true;
        data.clientId = RocketChat.settings.get(`${service.key}-id`);
        data.secret = RocketChat.settings.get(`${service.key}-secret`);
        data.serverURL = RocketChat.settings.get(`${service.key}-url`);
        data.tokenPath = RocketChat.settings.get(`${service.key}-token_path`);
        data.identityPath = RocketChat.settings.get(`${service.key}-identity_path`);
        data.authorizePath = RocketChat.settings.get(`${service.key}-authorize_path`);
        data.scope = RocketChat.settings.get(`${service.key}-scope`);
        data.buttonLabelText = RocketChat.settings.get(`${service.key}-button_label_text`);
        data.buttonLabelColor = RocketChat.settings.get(`${service.key}-button_label_color`);
        data.loginStyle = RocketChat.settings.get(`${service.key}-login_style`);
        data.buttonColor = RocketChat.settings.get(`${service.key}-button_color`);
        data.tokenSentVia = RocketChat.settings.get(`${service.key}-token_sent_via`);
        data.identityTokenSentVia = RocketChat.settings.get(`${service.key}-identity_token_sent_via`);
        data.usernameField = RocketChat.settings.get(`${service.key}-username_field`);
        data.mergeUsers = RocketChat.settings.get(`${service.key}-merge_users`);
        new CustomOAuth(serviceName.toLowerCase(), {
          serverURL: data.serverURL,
          tokenPath: data.tokenPath,
          identityPath: data.identityPath,
          authorizePath: data.authorizePath,
          scope: data.scope,
          loginStyle: data.loginStyle,
          tokenSentVia: data.tokenSentVia,
          identityTokenSentVia: data.identityTokenSentVia,
          usernameField: data.usernameField,
          mergeUsers: data.mergeUsers
        });
      }

      if (serviceName === 'Facebook') {
        data.appId = data.clientId;
        delete data.clientId;
      }

      if (serviceName === 'Twitter') {
        data.consumerKey = data.clientId;
        delete data.clientId;
      }

      ServiceConfiguration.configurations.upsert({
        service: serviceName.toLowerCase()
      }, {
        $set: data
      });
    } else {
      ServiceConfiguration.configurations.remove({
        service: serviceName.toLowerCase()
      });
    }
  });
}

const OAuthServicesUpdate = _.debounce(Meteor.bindEnvironment(_OAuthServicesUpdate), 2000);

function OAuthServicesRemove(_id) {
  const serviceName = _id.replace('Accounts_OAuth_Custom-', '');

  return ServiceConfiguration.configurations.remove({
    service: serviceName.toLowerCase()
  });
}

RocketChat.settings.get(/^Accounts_OAuth_.+/, function () {
  return OAuthServicesUpdate(); // eslint-disable-line new-cap
});
RocketChat.settings.get(/^Accounts_OAuth_Custom-[a-z0-9_]+/, function (key, value) {
  if (!value) {
    return OAuthServicesRemove(key); // eslint-disable-line new-cap
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/startup/settings.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Insert server unique id if it doesn't exist
RocketChat.settings.add('uniqueID', process.env.DEPLOYMENT_ID || Random.id(), {
  'public': true,
  hidden: true
}); // When you define a setting and want to add a description, you don't need to automatically define the i18nDescription
// if you add a node to the i18n.json with the same setting name but with `_Description` it will automatically work.

RocketChat.settings.addGroup('Accounts', function () {
  this.add('Accounts_AllowAnonymousRead', false, {
    type: 'boolean',
    public: true
  });
  this.add('Accounts_AllowAnonymousWrite', false, {
    type: 'boolean',
    public: true,
    enableQuery: {
      _id: 'Accounts_AllowAnonymousRead',
      value: true
    }
  });
  this.add('Accounts_AllowDeleteOwnAccount', false, {
    type: 'boolean',
    'public': true,
    enableQuery: {
      _id: 'Accounts_AllowUserProfileChange',
      value: true
    }
  });
  this.add('Accounts_AllowUserProfileChange', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Accounts_AllowUserAvatarChange', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Accounts_AllowRealNameChange', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Accounts_AllowUsernameChange', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Accounts_AllowEmailChange', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Accounts_AllowPasswordChange', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Accounts_CustomFieldsToShowInUserInfo', '', {
    type: 'string',
    public: true
  });
  this.add('Accounts_LoginExpiration', 90, {
    type: 'int',
    'public': true
  });
  this.add('Accounts_ShowFormLogin', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Accounts_EmailOrUsernamePlaceholder', '', {
    type: 'string',
    'public': true,
    i18nLabel: 'Placeholder_for_email_or_username_login_field'
  });
  this.add('Accounts_PasswordPlaceholder', '', {
    type: 'string',
    'public': true,
    i18nLabel: 'Placeholder_for_password_login_field'
  });
  this.add('Accounts_ConfirmPasswordPlaceholder', '', {
    type: 'string',
    'public': true,
    i18nLabel: 'Placeholder_for_password_login_field'
  });
  this.add('Accounts_ForgetUserSessionOnWindowClose', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Accounts_SearchFields', 'username, name', {
    type: 'string',
    public: true
  });
  this.section('Registration', function () {
    this.add('Accounts_DefaultUsernamePrefixSuggestion', 'user', {
      type: 'string'
    });
    this.add('Accounts_RequireNameForSignUp', true, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_RequirePasswordConfirmation', true, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_EmailVerification', false, {
      type: 'boolean',
      'public': true,
      enableQuery: {
        _id: 'SMTP_Host',
        value: {
          $exists: 1,
          $ne: ''
        }
      }
    });
    this.add('Accounts_ManuallyApproveNewUsers', false, {
      'public': true,
      type: 'boolean'
    });
    this.add('Accounts_AllowedDomainsList', '', {
      type: 'string',
      'public': true
    });
    this.add('Accounts_BlockedDomainsList', '', {
      type: 'string'
    });
    this.add('Accounts_BlockedUsernameList', '', {
      type: 'string'
    });
    this.add('Accounts_UseDefaultBlockedDomainsList', true, {
      type: 'boolean'
    });
    this.add('Accounts_UseDNSDomainCheck', false, {
      type: 'boolean'
    });
    this.add('Accounts_RegistrationForm', 'Public', {
      type: 'select',
      'public': true,
      values: [{
        key: 'Public',
        i18nLabel: 'Accounts_RegistrationForm_Public'
      }, {
        key: 'Disabled',
        i18nLabel: 'Accounts_RegistrationForm_Disabled'
      }, {
        key: 'Secret URL',
        i18nLabel: 'Accounts_RegistrationForm_Secret_URL'
      }]
    });
    this.add('Accounts_RegistrationForm_SecretURL', Random.id(), {
      type: 'string'
    });
    this.add('Accounts_RegistrationForm_LinkReplacementText', 'New user registration is currently disabled', {
      type: 'string',
      'public': true
    });
    this.add('Accounts_Registration_AuthenticationServices_Enabled', true, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_Registration_AuthenticationServices_Default_Roles', 'user', {
      type: 'string',
      enableQuery: {
        _id: 'Accounts_Registration_AuthenticationServices_Enabled',
        value: true
      }
    });
    this.add('Accounts_PasswordReset', true, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_CustomFields', '', {
      type: 'code',
      'public': true,
      i18nLabel: 'Custom_Fields'
    });
  });
  this.section('Accounts_Default_User_Preferences', function () {
    this.add('Accounts_Default_User_Preferences_enableAutoAway', true, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Enable_Auto_Away'
    });
    this.add('Accounts_Default_User_Preferences_idleTimeLimit', 300, {
      type: 'int',
      'public': true,
      i18nLabel: 'Idle_Time_Limit'
    });
    this.add('Accounts_Default_User_Preferences_desktopNotificationDuration', 0, {
      type: 'int',
      'public': true,
      i18nLabel: 'Notification_Duration'
    });
    this.add('Accounts_Default_User_Preferences_audioNotifications', 'mentions', {
      type: 'select',
      values: [{
        key: 'all',
        i18nLabel: 'All_messages'
      }, {
        key: 'mentions',
        i18nLabel: 'Mentions'
      }, {
        key: 'nothing',
        i18nLabel: 'Nothing'
      }],
      public: true
    });
    this.add('Accounts_Default_User_Preferences_desktopNotifications', 'mentions', {
      type: 'select',
      values: [{
        key: 'all',
        i18nLabel: 'All_messages'
      }, {
        key: 'mentions',
        i18nLabel: 'Mentions'
      }, {
        key: 'nothing',
        i18nLabel: 'Nothing'
      }],
      'public': true
    });
    this.add('Accounts_Default_User_Preferences_mobileNotifications', 'mentions', {
      type: 'select',
      values: [{
        key: 'all',
        i18nLabel: 'All_messages'
      }, {
        key: 'mentions',
        i18nLabel: 'Mentions'
      }, {
        key: 'nothing',
        i18nLabel: 'Nothing'
      }],
      'public': true
    });
    this.add('Accounts_Default_User_Preferences_unreadAlert', true, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Unread_Tray_Icon_Alert'
    });
    this.add('Accounts_Default_User_Preferences_useEmojis', true, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Use_Emojis'
    });
    this.add('Accounts_Default_User_Preferences_convertAsciiEmoji', true, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Convert_Ascii_Emojis'
    });
    this.add('Accounts_Default_User_Preferences_autoImageLoad', true, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Auto_Load_Images'
    });
    this.add('Accounts_Default_User_Preferences_saveMobileBandwidth', true, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Save_Mobile_Bandwidth'
    });
    this.add('Accounts_Default_User_Preferences_collapseMediaByDefault', false, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Collapse_Embedded_Media_By_Default'
    });
    this.add('Accounts_Default_User_Preferences_hideUsernames', false, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Hide_usernames'
    });
    this.add('Accounts_Default_User_Preferences_hideRoles', false, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Hide_roles'
    });
    this.add('Accounts_Default_User_Preferences_hideFlexTab', false, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Hide_flextab'
    });
    this.add('Accounts_Default_User_Preferences_hideAvatars', false, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Hide_Avatars'
    });
    this.add('Accounts_Default_User_Preferences_sidebarGroupByType', true, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Group_by_Type'
    });
    this.add('Accounts_Default_User_Preferences_sidebarViewMode', 'medium', {
      type: 'select',
      values: [{
        key: 'extended',
        i18nLabel: 'Extended'
      }, {
        key: 'medium',
        i18nLabel: 'Medium'
      }, {
        key: 'condensed',
        i18nLabel: 'Condensed'
      }],
      'public': true,
      i18nLabel: 'Sidebar_list_mode'
    });
    this.add('Accounts_Default_User_Preferences_sidebarHideAvatar', false, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Hide_Avatars'
    });
    this.add('Accounts_Default_User_Preferences_sidebarShowUnread', false, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Unread_on_top'
    });
    this.add('Accounts_Default_User_Preferences_sidebarShowFavorites', true, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Group_favorites'
    });
    this.add('Accounts_Default_User_Preferences_sendOnEnter', 'normal', {
      type: 'select',
      values: [{
        key: 'normal',
        i18nLabel: 'Enter_Normal'
      }, {
        key: 'alternative',
        i18nLabel: 'Enter_Alternative'
      }, {
        key: 'desktop',
        i18nLabel: 'Only_On_Desktop'
      }],
      'public': true,
      i18nLabel: 'Enter_Behaviour'
    });
    this.add('Accounts_Default_User_Preferences_messageViewMode', 0, {
      type: 'select',
      values: [{
        key: 0,
        i18nLabel: 'Normal'
      }, {
        key: 1,
        i18nLabel: 'Cozy'
      }, {
        key: 2,
        i18nLabel: 'Compact'
      }],
      'public': true,
      i18nLabel: 'MessageBox_view_mode'
    });
    this.add('Accounts_Default_User_Preferences_emailNotificationMode', 'mentions', {
      type: 'select',
      values: [{
        key: 'nothing',
        i18nLabel: 'Email_Notification_Mode_Disabled'
      }, {
        key: 'mentions',
        i18nLabel: 'Email_Notification_Mode_All'
      }],
      'public': true,
      i18nLabel: 'Email_Notification_Mode'
    });
    this.add('Accounts_Default_User_Preferences_roomCounterSidebar', false, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Show_room_counter_on_sidebar'
    });
    this.add('Accounts_Default_User_Preferences_newRoomNotification', 'door', {
      type: 'select',
      values: [{
        key: 'none',
        i18nLabel: 'None'
      }, {
        key: 'door',
        i18nLabel: 'Default'
      }],
      'public': true,
      i18nLabel: 'New_Room_Notification'
    });
    this.add('Accounts_Default_User_Preferences_newMessageNotification', 'chime', {
      type: 'select',
      values: [{
        key: 'none',
        i18nLabel: 'None'
      }, {
        key: 'chime',
        i18nLabel: 'Default'
      }],
      'public': true,
      i18nLabel: 'New_Message_Notification'
    });
    this.add('Accounts_Default_User_Preferences_muteFocusedConversations', true, {
      type: 'boolean',
      'public': true,
      i18nLabel: 'Mute_Focused_Conversations'
    });
    this.add('Accounts_Default_User_Preferences_notificationsSoundVolume', 100, {
      type: 'int',
      'public': true,
      i18nLabel: 'Notifications_Sound_Volume'
    });
  });
  this.section('Avatar', function () {
    this.add('Accounts_AvatarResize', true, {
      type: 'boolean'
    });
    this.add('Accounts_AvatarSize', 200, {
      type: 'int',
      enableQuery: {
        _id: 'Accounts_AvatarResize',
        value: true
      }
    });
    this.add('Accounts_AvatarCacheTime', 3600, {
      type: 'int',
      i18nDescription: 'Accounts_AvatarCacheTime_description'
    });
    return this.add('Accounts_SetDefaultAvatar', true, {
      type: 'boolean'
    });
  });
  this.section('Password_Policy', function () {
    this.add('Accounts_Password_Policy_Enabled', false, {
      type: 'boolean'
    });
    const enableQuery = {
      _id: 'Accounts_Password_Policy_Enabled',
      value: true
    };
    this.add('Accounts_Password_Policy_MinLength', 7, {
      type: 'int',
      enableQuery
    });
    this.add('Accounts_Password_Policy_MaxLength', -1, {
      type: 'int',
      enableQuery
    });
    this.add('Accounts_Password_Policy_ForbidRepeatingCharacters', true, {
      type: 'boolean',
      enableQuery
    });
    this.add('Accounts_Password_Policy_ForbidRepeatingCharactersCount', 3, {
      type: 'int',
      enableQuery
    });
    this.add('Accounts_Password_Policy_AtLeastOneLowercase', true, {
      type: 'boolean',
      enableQuery
    });
    this.add('Accounts_Password_Policy_AtLeastOneUppercase', true, {
      type: 'boolean',
      enableQuery
    });
    this.add('Accounts_Password_Policy_AtLeastOneNumber', true, {
      type: 'boolean',
      enableQuery
    });
    this.add('Accounts_Password_Policy_AtLeastOneSpecialCharacter', true, {
      type: 'boolean',
      enableQuery
    });
  });
});
RocketChat.settings.addGroup('OAuth', function () {
  this.section('Facebook', function () {
    const enableQuery = {
      _id: 'Accounts_OAuth_Facebook',
      value: true
    };
    this.add('Accounts_OAuth_Facebook', false, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_OAuth_Facebook_id', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Facebook_secret', '', {
      type: 'string',
      enableQuery
    });
    return this.add('Accounts_OAuth_Facebook_callback_url', '_oauth/facebook', {
      type: 'relativeUrl',
      readonly: true,
      force: true,
      enableQuery
    });
  });
  this.section('Google', function () {
    const enableQuery = {
      _id: 'Accounts_OAuth_Google',
      value: true
    };
    this.add('Accounts_OAuth_Google', false, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_OAuth_Google_id', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Google_secret', '', {
      type: 'string',
      enableQuery
    });
    return this.add('Accounts_OAuth_Google_callback_url', '_oauth/google', {
      type: 'relativeUrl',
      readonly: true,
      force: true,
      enableQuery
    });
  });
  this.section('GitHub', function () {
    const enableQuery = {
      _id: 'Accounts_OAuth_Github',
      value: true
    };
    this.add('Accounts_OAuth_Github', false, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_OAuth_Github_id', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Github_secret', '', {
      type: 'string',
      enableQuery
    });
    return this.add('Accounts_OAuth_Github_callback_url', '_oauth/github', {
      type: 'relativeUrl',
      readonly: true,
      force: true,
      enableQuery
    });
  });
  this.section('Linkedin', function () {
    const enableQuery = {
      _id: 'Accounts_OAuth_Linkedin',
      value: true
    };
    this.add('Accounts_OAuth_Linkedin', false, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_OAuth_Linkedin_id', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Linkedin_secret', '', {
      type: 'string',
      enableQuery
    });
    return this.add('Accounts_OAuth_Linkedin_callback_url', '_oauth/linkedin', {
      type: 'relativeUrl',
      readonly: true,
      force: true,
      enableQuery
    });
  });
  this.section('Meteor', function () {
    const enableQuery = {
      _id: 'Accounts_OAuth_Meteor',
      value: true
    };
    this.add('Accounts_OAuth_Meteor', false, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_OAuth_Meteor_id', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Meteor_secret', '', {
      type: 'string',
      enableQuery
    });
    return this.add('Accounts_OAuth_Meteor_callback_url', '_oauth/meteor', {
      type: 'relativeUrl',
      readonly: true,
      force: true,
      enableQuery
    });
  });
  this.section('Twitter', function () {
    const enableQuery = {
      _id: 'Accounts_OAuth_Twitter',
      value: true
    };
    this.add('Accounts_OAuth_Twitter', false, {
      type: 'boolean',
      'public': true
    });
    this.add('Accounts_OAuth_Twitter_id', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Twitter_secret', '', {
      type: 'string',
      enableQuery
    });
    return this.add('Accounts_OAuth_Twitter_callback_url', '_oauth/twitter', {
      type: 'relativeUrl',
      readonly: true,
      force: true,
      enableQuery
    });
  });
  return this.section('Proxy', function () {
    this.add('Accounts_OAuth_Proxy_host', 'https://oauth-proxy.rocket.chat', {
      type: 'string',
      'public': true
    });
    return this.add('Accounts_OAuth_Proxy_services', '', {
      type: 'string',
      'public': true
    });
  });
});
RocketChat.settings.addGroup('General', function () {
  this.add('Show_Setup_Wizard', 'pending', {
    type: 'select',
    public: true,
    values: [{
      key: 'pending',
      i18nLabel: 'Pending'
    }, {
      key: 'in_progress',
      i18nLabel: 'In_progress'
    }, {
      key: 'completed',
      i18nLabel: 'Completed'
    }]
  });
  this.add('Site_Url', typeof __meteor_runtime_config__ !== 'undefined' && __meteor_runtime_config__ !== null ? __meteor_runtime_config__.ROOT_URL : null, {
    type: 'string',
    i18nDescription: 'Site_Url_Description',
    'public': true
  });
  this.add('Site_Name', 'Rocket.Chat', {
    type: 'string',
    'public': true,
    wizard: {
      step: 3,
      order: 0
    }
  });
  this.add('Document_Domain', '', {
    type: 'string',
    'public': true
  });
  this.add('Language', '', {
    type: 'language',
    'public': true,
    wizard: {
      step: 3,
      order: 1
    }
  });
  this.add('Allow_Invalid_SelfSigned_Certs', false, {
    type: 'boolean'
  });
  this.add('Favorite_Rooms', true, {
    type: 'boolean',
    'public': true
  });
  this.add('First_Channel_After_Login', '', {
    type: 'string',
    'public': true
  });
  this.add('Unread_Count', 'user_and_group_mentions_only', {
    type: 'select',
    values: [{
      key: 'all_messages',
      i18nLabel: 'All_messages'
    }, {
      key: 'user_mentions_only',
      i18nLabel: 'User_mentions_only'
    }, {
      key: 'group_mentions_only',
      i18nLabel: 'Group_mentions_only'
    }, {
      key: 'user_and_group_mentions_only',
      i18nLabel: 'User_and_group_mentions_only'
    }],
    'public': true
  });
  this.add('Unread_Count_DM', 'all_messages', {
    type: 'select',
    values: [{
      key: 'all_messages',
      i18nLabel: 'All_messages'
    }, {
      key: 'mentions_only',
      i18nLabel: 'Mentions_only'
    }],
    'public': true
  });
  this.add('CDN_PREFIX', '', {
    type: 'string',
    'public': true
  });
  this.add('Force_SSL', false, {
    type: 'boolean',
    'public': true
  });
  this.add('GoogleTagManager_id', '', {
    type: 'string',
    'public': true
  });
  this.add('Bugsnag_api_key', '', {
    type: 'string',
    'public': false
  });
  this.add('Force_Disable_OpLog_For_Cache', false, {
    type: 'boolean',
    'public': false
  });
  this.add('Restart', 'restart_server', {
    type: 'action',
    actionText: 'Restart_the_server'
  });
  this.add('Store_Last_Message', true, {
    type: 'boolean',
    public: true,
    i18nDescription: 'Store_Last_Message_Sent_per_Room'
  });
  this.section('UTF8', function () {
    this.add('UTF8_Names_Validation', '[0-9a-zA-Z-_.]+', {
      type: 'string',
      'public': true,
      i18nDescription: 'UTF8_Names_Validation_Description'
    });
    return this.add('UTF8_Names_Slugify', true, {
      type: 'boolean',
      'public': true
    });
  });
  this.section('Reporting', function () {
    return this.add('Statistics_reporting', true, {
      type: 'boolean'
    });
  });
  this.section('Notifications', function () {
    this.add('Notifications_Max_Room_Members', 100, {
      type: 'int',
      public: true,
      i18nDescription: 'Notifications_Max_Room_Members_Description'
    });
    this.add('Notifications_Always_Notify_Mobile', false, {
      type: 'boolean',
      public: true,
      i18nDescription: 'Notifications_Always_Notify_Mobile_Description'
    });
  });
  this.section('REST API', function () {
    return this.add('API_User_Limit', 500, {
      type: 'int',
      'public': true,
      i18nDescription: 'API_User_Limit'
    });
  });
  this.section('Iframe_Integration', function () {
    this.add('Iframe_Integration_send_enable', false, {
      type: 'boolean',
      'public': true
    });
    this.add('Iframe_Integration_send_target_origin', '*', {
      type: 'string',
      'public': true,
      enableQuery: {
        _id: 'Iframe_Integration_send_enable',
        value: true
      }
    });
    this.add('Iframe_Integration_receive_enable', false, {
      type: 'boolean',
      'public': true
    });
    return this.add('Iframe_Integration_receive_origin', '*', {
      type: 'string',
      'public': true,
      enableQuery: {
        _id: 'Iframe_Integration_receive_enable',
        value: true
      }
    });
  });
  this.section('Translations', function () {
    return this.add('Custom_Translations', '', {
      type: 'code',
      'public': true
    });
  });
  return this.section('Stream_Cast', function () {
    return this.add('Stream_Cast_Address', '', {
      type: 'string'
    });
  });
});
RocketChat.settings.addGroup('Email', function () {
  this.section('Subject', function () {
    this.add('Offline_DM_Email', '[[Site_Name]] You have been direct messaged by [User]', {
      type: 'code',
      code: 'text',
      multiline: true,
      i18nLabel: 'Offline_DM_Email',
      i18nDescription: 'Offline_Email_Subject_Description'
    });
    this.add('Offline_Mention_Email', '[[Site_Name]] You have been mentioned by [User] in #[Room]', {
      type: 'code',
      code: 'text',
      multiline: true,
      i18nLabel: 'Offline_Mention_Email',
      i18nDescription: 'Offline_Email_Subject_Description'
    });
    return this.add('Offline_Mention_All_Email', '[User] has posted a message in #[Room]', {
      type: 'code',
      code: 'text',
      multiline: true,
      i18nLabel: 'Offline_Mention_All_Email',
      i18nDescription: 'Offline_Email_Subject_Description'
    });
  });
  this.section('Header_and_Footer', function () {
    this.add('Email_Header', '<html><table border="0" cellspacing="0" cellpadding="0" width="100%" bgcolor="#f3f3f3" style="color:#4a4a4a;font-family: Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;border-collapse:collapse;border-spacing:0;margin:0 auto"><tr><td style="padding:1em"><table border="0" cellspacing="0" cellpadding="0" align="center" width="100%" style="width:100%;margin:0 auto;max-width:800px"><tr><td bgcolor="#ffffff" style="background-color:#ffffff; border: 1px solid #DDD; font-size: 10pt; font-family: Helvetica,Arial,sans-serif;"><table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="background-color: #04436a;"><h1 style="font-family: Helvetica,Arial,sans-serif; padding: 0 1em; margin: 0; line-height: 70px; color: #FFF;">[Site_Name]</h1></td></tr><tr><td style="padding: 1em; font-size: 10pt; font-family: Helvetica,Arial,sans-serif;">', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      i18nLabel: 'Header'
    });
    this.add('Email_Footer', '</td></tr></table></td></tr><tr><td border="0" cellspacing="0" cellpadding="0" width="100%" style="font-family: Helvetica,Arial,sans-serif; max-width: 800px; margin: 0 auto; padding: 1.5em; text-align: center; font-size: 8pt; color: #999;">Powered by <a href="https://rocket.chat" target="_blank">Rocket.Chat</a></td></tr></table></td></tr></table></html>', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      i18nLabel: 'Footer'
    });
    return this.add('Email_Footer_Direct_Reply', '</td></tr></table></td></tr><tr><td border="0" cellspacing="0" cellpadding="0" width="100%" style="font-family: Helvetica,Arial,sans-serif; max-width: 800px; margin: 0 auto; padding: 1.5em; text-align: center; font-size: 8pt; color: #999;">You can directly reply to this email.<br>Do not modify previous emails in the thread.<br>Powered by <a href="https://rocket.chat" target="_blank">Rocket.Chat</a></td></tr></table></td></tr></table></html>', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      i18nLabel: 'Footer_Direct_Reply'
    });
  });
  this.section('Direct_Reply', function () {
    this.add('Direct_Reply_Enable', false, {
      type: 'boolean',
      env: true,
      i18nLabel: 'Direct_Reply_Enable'
    });
    this.add('Direct_Reply_Debug', false, {
      type: 'boolean',
      env: true,
      i18nLabel: 'Direct_Reply_Debug',
      i18nDescription: 'Direct_Reply_Debug_Description'
    });
    this.add('Direct_Reply_Protocol', 'IMAP', {
      type: 'select',
      values: [{
        key: 'IMAP',
        i18nLabel: 'IMAP'
      }, {
        key: 'POP',
        i18nLabel: 'POP'
      }],
      env: true,
      i18nLabel: 'Protocol'
    });
    this.add('Direct_Reply_Host', '', {
      type: 'string',
      env: true,
      i18nLabel: 'Host'
    });
    this.add('Direct_Reply_Port', '', {
      type: 'string',
      env: true,
      i18nLabel: 'Port'
    });
    this.add('Direct_Reply_IgnoreTLS', false, {
      type: 'boolean',
      env: true,
      i18nLabel: 'IgnoreTLS'
    });
    this.add('Direct_Reply_Frequency', 5, {
      type: 'int',
      env: true,
      i18nLabel: 'Direct_Reply_Frequency',
      enableQuery: {
        _id: 'Direct_Reply_Protocol',
        value: 'POP'
      }
    });
    this.add('Direct_Reply_Delete', true, {
      type: 'boolean',
      env: true,
      i18nLabel: 'Direct_Reply_Delete',
      enableQuery: {
        _id: 'Direct_Reply_Protocol',
        value: 'IMAP'
      }
    });
    this.add('Direct_Reply_Separator', '+', {
      type: 'select',
      values: [{
        key: '!',
        i18nLabel: '!'
      }, {
        key: '#',
        i18nLabel: '#'
      }, {
        key: '$',
        i18nLabel: '$'
      }, {
        key: '%',
        i18nLabel: '%'
      }, {
        key: '&',
        i18nLabel: '&'
      }, {
        key: '\'',
        i18nLabel: '\''
      }, {
        key: '*',
        i18nLabel: '*'
      }, {
        key: '+',
        i18nLabel: '+'
      }, {
        key: '-',
        i18nLabel: '-'
      }, {
        key: '/',
        i18nLabel: '/'
      }, {
        key: '=',
        i18nLabel: '='
      }, {
        key: '?',
        i18nLabel: '?'
      }, {
        key: '^',
        i18nLabel: '^'
      }, {
        key: '_',
        i18nLabel: '_'
      }, {
        key: '`',
        i18nLabel: '`'
      }, {
        key: '{',
        i18nLabel: '{'
      }, {
        key: '|',
        i18nLabel: '|'
      }, {
        key: '}',
        i18nLabel: '}'
      }, {
        key: '~',
        i18nLabel: '~'
      }],
      env: true,
      i18nLabel: 'Direct_Reply_Separator'
    });
    this.add('Direct_Reply_Username', '', {
      type: 'string',
      env: true,
      i18nLabel: 'Username',
      placeholder: 'email@domain'
    });
    this.add('Direct_Reply_ReplyTo', '', {
      type: 'string',
      env: true,
      i18nLabel: 'ReplyTo',
      placeholder: 'email@domain'
    });
    return this.add('Direct_Reply_Password', '', {
      type: 'password',
      env: true,
      i18nLabel: 'Password'
    });
  });
  this.section('SMTP', function () {
    this.add('SMTP_Protocol', 'smtp', {
      type: 'select',
      values: [{
        key: 'smtp',
        i18nLabel: 'smtp'
      }, {
        key: 'smtps',
        i18nLabel: 'smtps'
      }],
      env: true,
      i18nLabel: 'Protocol'
    });
    this.add('SMTP_Host', '', {
      type: 'string',
      env: true,
      i18nLabel: 'Host'
    });
    this.add('SMTP_Port', '', {
      type: 'string',
      env: true,
      i18nLabel: 'Port'
    });
    this.add('SMTP_IgnoreTLS', false, {
      type: 'boolean',
      env: true,
      i18nLabel: 'IgnoreTLS',
      enableQuery: {
        _id: 'SMTP_Protocol',
        value: 'smtp'
      }
    });
    this.add('SMTP_Pool', true, {
      type: 'boolean',
      env: true,
      i18nLabel: 'Pool'
    });
    this.add('SMTP_Username', '', {
      type: 'string',
      env: true,
      i18nLabel: 'Username',
      autocomplete: false
    });
    this.add('SMTP_Password', '', {
      type: 'password',
      env: true,
      i18nLabel: 'Password',
      autocomplete: false
    });
    this.add('From_Email', '', {
      type: 'string',
      placeholder: 'email@domain'
    });
    return this.add('SMTP_Test_Button', 'sendSMTPTestEmail', {
      type: 'action',
      actionText: 'Send_a_test_mail_to_my_user'
    });
  });
  this.section('Invitation', function () {
    this.add('Invitation_Customized', false, {
      type: 'boolean',
      i18nLabel: 'Custom'
    });
    this.add('Invitation_Subject', '', {
      type: 'string',
      i18nLabel: 'Subject',
      enableQuery: {
        _id: 'Invitation_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Invitation_Customized',
        value: false
      }
    });
    return this.add('Invitation_HTML', '', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      i18nLabel: 'Body',
      i18nDescription: 'Invitation_HTML_Description',
      enableQuery: {
        _id: 'Invitation_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Invitation_Customized',
        value: false
      }
    });
  });
  this.section('Registration', function () {
    this.add('Accounts_Enrollment_Customized', false, {
      type: 'boolean',
      i18nLabel: 'Custom'
    });
    this.add('Accounts_Enrollment_Email_Subject', '', {
      type: 'string',
      i18nLabel: 'Subject',
      enableQuery: {
        _id: 'Accounts_Enrollment_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Accounts_Enrollment_Customized',
        value: false
      }
    });
    return this.add('Accounts_Enrollment_Email', '', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      i18nLabel: 'Body',
      enableQuery: {
        _id: 'Accounts_Enrollment_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Accounts_Enrollment_Customized',
        value: false
      }
    });
  });
  this.section('Registration_via_Admin', function () {
    this.add('Accounts_UserAddedEmail_Customized', false, {
      type: 'boolean',
      i18nLabel: 'Custom'
    });
    this.add('Accounts_UserAddedEmailSubject', '', {
      type: 'string',
      i18nLabel: 'Subject',
      enableQuery: {
        _id: 'Accounts_UserAddedEmail_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Accounts_UserAddedEmail_Customized',
        value: false
      }
    });
    return this.add('Accounts_UserAddedEmail', '', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      i18nLabel: 'Body',
      i18nDescription: 'Accounts_UserAddedEmail_Description',
      enableQuery: {
        _id: 'Accounts_UserAddedEmail_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Accounts_UserAddedEmail_Customized',
        value: false
      }
    });
  });
  this.section('Forgot_password_section', function () {
    this.add('Forgot_Password_Customized', false, {
      type: 'boolean',
      i18nLabel: 'Custom'
    });
    this.add('Forgot_Password_Email_Subject', '', {
      type: 'string',
      i18nLabel: 'Subject',
      enableQuery: {
        _id: 'Forgot_Password_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Forgot_Password_Customized',
        value: false
      }
    });
    return this.add('Forgot_Password_Email', '', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      i18nLabel: 'Body',
      i18nDescription: 'Forgot_Password_Description',
      enableQuery: {
        _id: 'Forgot_Password_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Forgot_Password_Customized',
        value: false
      }
    });
  });
  return this.section('Verification', function () {
    this.add('Verification_Customized', false, {
      type: 'boolean',
      i18nLabel: 'Custom'
    });
    this.add('Verification_Email_Subject', '', {
      type: 'string',
      i18nLabel: 'Subject',
      enableQuery: {
        _id: 'Verification_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Verification_Customized',
        value: false
      }
    });
    return this.add('Verification_Email', '', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      i18nLabel: 'Body',
      i18nDescription: 'Verification_Description',
      enableQuery: {
        _id: 'Verification_Customized',
        value: true
      },
      i18nDefaultQuery: {
        _id: 'Verification_Customized',
        value: false
      }
    });
  });
});
RocketChat.settings.addGroup('Message', function () {
  this.section('Message_Attachments', function () {
    this.add('Message_Attachments_GroupAttach', false, {
      type: 'boolean',
      'public': true,
      i18nDescription: 'Message_Attachments_GroupAttachDescription'
    });
  });
  this.section('Message_Audio', function () {
    this.add('Message_AudioRecorderEnabled', true, {
      type: 'boolean',
      'public': true,
      i18nDescription: 'Message_AudioRecorderEnabledDescription'
    });
    this.add('Message_Audio_bitRate', 32, {
      type: 'int',
      'public': true
    });
  });
  this.add('Message_AllowEditing', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_AllowEditing_BlockEditInMinutes', 0, {
    type: 'int',
    'public': true,
    i18nDescription: 'Message_AllowEditing_BlockEditInMinutesDescription'
  });
  this.add('Message_AllowDeleting', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_AllowDeleting_BlockDeleteInMinutes', 0, {
    type: 'int',
    'public': true,
    i18nDescription: 'Message_AllowDeleting_BlockDeleteInMinutes'
  });
  this.add('Message_AllowUnrecognizedSlashCommand', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_AllowDirectMessagesToYourself', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_AlwaysSearchRegExp', false, {
    type: 'boolean'
  });
  this.add('Message_ShowEditedStatus', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_ShowDeletedStatus', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_AllowBadWordsFilter', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_BadWordsFilterList', '', {
    type: 'string',
    'public': true
  });
  this.add('Message_KeepHistory', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_MaxAll', 0, {
    type: 'int',
    'public': true
  });
  this.add('Message_MaxAllowedSize', 5000, {
    type: 'int',
    'public': true
  });
  this.add('Message_ShowFormattingTips', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_SetNameToAliasEnabled', false, {
    type: 'boolean',
    'public': false,
    i18nDescription: 'Message_SetNameToAliasEnabled_Description'
  });
  this.add('Message_GroupingPeriod', 300, {
    type: 'int',
    'public': true,
    i18nDescription: 'Message_GroupingPeriodDescription'
  });
  this.add('API_Embed', true, {
    type: 'boolean',
    'public': true
  });
  this.add('API_Embed_UserAgent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.0 Safari/537.36', {
    type: 'string',
    'public': true
  });
  this.add('API_EmbedCacheExpirationDays', 30, {
    type: 'int',
    'public': false
  });
  this.add('API_Embed_clear_cache_now', 'OEmbedCacheCleanup', {
    type: 'action',
    actionText: 'clear',
    i18nLabel: 'clear_cache_now'
  });
  this.add('API_EmbedDisabledFor', '', {
    type: 'string',
    'public': true,
    i18nDescription: 'API_EmbedDisabledFor_Description'
  });
  this.add('API_EmbedIgnoredHosts', 'localhost, 127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16', {
    type: 'string',
    i18nDescription: 'API_EmbedIgnoredHosts_Description'
  });
  this.add('API_EmbedSafePorts', '80, 443', {
    type: 'string'
  });
  this.add('Message_TimeFormat', 'LT', {
    type: 'string',
    'public': true,
    i18nDescription: 'Message_TimeFormat_Description'
  });
  this.add('Message_DateFormat', 'LL', {
    type: 'string',
    'public': true,
    i18nDescription: 'Message_DateFormat_Description'
  });
  this.add('Message_TimeAndDateFormat', 'LLL', {
    type: 'string',
    'public': true,
    i18nDescription: 'Message_TimeAndDateFormat_Description'
  });
  this.add('Message_QuoteChainLimit', 2, {
    type: 'int',
    'public': true
  });
  this.add('Message_HideType_uj', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_HideType_ul', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_HideType_ru', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_HideType_au', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_HideType_mute_unmute', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Message_ErasureType', 'Delete', {
    type: 'select',
    'public': true,
    values: [{
      key: 'Keep',
      i18nLabel: 'Message_ErasureType_Keep'
    }, {
      key: 'Delete',
      i18nLabel: 'Message_ErasureType_Delete'
    }, {
      key: 'Unlink',
      i18nLabel: 'Message_ErasureType_Unlink'
    }]
  });
});
RocketChat.settings.addGroup('Meta', function () {
  this.add('Meta_language', '', {
    type: 'string'
  });
  this.add('Meta_fb_app_id', '', {
    type: 'string'
  });
  this.add('Meta_robots', 'INDEX,FOLLOW', {
    type: 'string'
  });
  this.add('Meta_google-site-verification', '', {
    type: 'string'
  });
  this.add('Meta_msvalidate01', '', {
    type: 'string'
  });
  return this.add('Meta_custom', '', {
    type: 'code',
    code: 'text/html',
    multiline: true
  });
});
RocketChat.settings.addGroup('Push', function () {
  this.add('Push_enable', true, {
    type: 'boolean',
    'public': true
  });
  this.add('Push_debug', false, {
    type: 'boolean',
    'public': true,
    enableQuery: {
      _id: 'Push_enable',
      value: true
    }
  });
  this.add('Push_enable_gateway', true, {
    type: 'boolean',
    enableQuery: {
      _id: 'Push_enable',
      value: true
    }
  });
  this.add('Push_gateway', 'https://gateway.rocket.chat', {
    type: 'string',
    enableQuery: [{
      _id: 'Push_enable',
      value: true
    }, {
      _id: 'Push_enable_gateway',
      value: true
    }]
  });
  this.add('Push_production', true, {
    type: 'boolean',
    'public': true,
    enableQuery: [{
      _id: 'Push_enable',
      value: true
    }, {
      _id: 'Push_enable_gateway',
      value: false
    }]
  });
  this.add('Push_test_push', 'push_test', {
    type: 'action',
    actionText: 'Send_a_test_push_to_my_user',
    enableQuery: {
      _id: 'Push_enable',
      value: true
    }
  });
  this.section('Certificates_and_Keys', function () {
    this.add('Push_apn_passphrase', '', {
      type: 'string'
    });
    this.add('Push_apn_key', '', {
      type: 'string',
      multiline: true
    });
    this.add('Push_apn_cert', '', {
      type: 'string',
      multiline: true
    });
    this.add('Push_apn_dev_passphrase', '', {
      type: 'string'
    });
    this.add('Push_apn_dev_key', '', {
      type: 'string',
      multiline: true
    });
    this.add('Push_apn_dev_cert', '', {
      type: 'string',
      multiline: true
    });
    this.add('Push_gcm_api_key', '', {
      type: 'string'
    });
    return this.add('Push_gcm_project_number', '', {
      type: 'string',
      'public': true
    });
  });
  return this.section('Privacy', function () {
    this.add('Push_show_username_room', true, {
      type: 'boolean',
      'public': true
    });
    return this.add('Push_show_message', true, {
      type: 'boolean',
      'public': true
    });
  });
});
RocketChat.settings.addGroup('Layout', function () {
  this.section('Content', function () {
    this.add('Layout_Home_Title', 'Home', {
      type: 'string',
      'public': true
    });
    this.add('Layout_Home_Body', '<p>Welcome to Rocket.Chat!</p>\n<p>The Rocket.Chat desktops apps for Windows, macOS and Linux are available to download <a title="Rocket.Chat desktop apps" href="https://rocket.chat/download" target="_blank" rel="noopener">here</a>.</p><p>The native mobile app, Rocket.Chat+,\n  for Android and iOS is available from <a title="Rocket.Chat+ on Google Play" href="https://play.google.com/store/apps/details?id=chat.rocket.android" target="_blank" rel="noopener">Google Play</a> and the <a title="Rocket.Chat+ on the App Store" href="https://itunes.apple.com/app/rocket-chat/id1148741252" target="_blank" rel="noopener">App Store</a>.</p>\n<p>For further help, please consult the <a title="Rocket.Chat Documentation" href="https://rocket.chat/docs/" target="_blank" rel="noopener">documentation</a>.</p>\n<p>If you\'re an admin, feel free to change this content via <strong>Administration</strong> -> <strong>Layout</strong> -> <strong>Home Body</strong>. Or clicking <a title="Home Body Layout" href="/admin/Layout">here</a>.</p>', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      'public': true
    });
    this.add('Layout_Terms_of_Service', 'Terms of Service <br> Go to APP SETTINGS -> Layout to customize this page.', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      'public': true
    });
    this.add('Layout_Login_Terms', 'By proceeding you are agreeing to our <a href="terms-of-service">Terms of Service</a> and <a href="privacy-policy">Privacy Policy</a>.', {
      type: 'string',
      multiline: true,
      'public': true
    });
    this.add('Layout_Privacy_Policy', 'Privacy Policy <br> Go to APP SETTINGS -> Layout to customize this page.', {
      type: 'code',
      code: 'text/html',
      multiline: true,
      'public': true
    });
    return this.add('Layout_Sidenav_Footer', '<a href="/home"><img src="assets/logo"/></a>', {
      type: 'code',
      code: 'text/html',
      'public': true,
      i18nDescription: 'Layout_Sidenav_Footer_description'
    });
  });
  this.section('Custom_Scripts', function () {
    this.add('Custom_Script_Logged_Out', '//Add your script', {
      type: 'code',
      multiline: true,
      'public': true
    });
    return this.add('Custom_Script_Logged_In', '//Add your script', {
      type: 'code',
      multiline: true,
      'public': true
    });
  });
  return this.section('User_Interface', function () {
    this.add('UI_DisplayRoles', true, {
      type: 'boolean',
      'public': true
    });
    this.add('UI_Group_Channels_By_Type', true, {
      type: 'boolean',
      'public': false
    });
    this.add('UI_Use_Name_Avatar', false, {
      type: 'boolean',
      'public': true
    });
    this.add('UI_Use_Real_Name', false, {
      type: 'boolean',
      'public': true
    });
    this.add('UI_Click_Direct_Message', false, {
      type: 'boolean',
      'public': true
    });
    this.add('UI_Unread_Counter_Style', 'Different_Style_For_User_Mentions', {
      type: 'select',
      values: [{
        key: 'Same_Style_For_Mentions',
        i18nLabel: 'Same_Style_For_Mentions'
      }, {
        key: 'Different_Style_For_User_Mentions',
        i18nLabel: 'Different_Style_For_User_Mentions'
      }],
      'public': true
    });
    this.add('UI_Allow_room_names_with_special_chars', false, {
      type: 'boolean',
      public: true
    });
  });
});
RocketChat.settings.addGroup('Logs', function () {
  this.add('Log_Level', '0', {
    type: 'select',
    values: [{
      key: '0',
      i18nLabel: '0_Errors_Only'
    }, {
      key: '1',
      i18nLabel: '1_Errors_and_Information'
    }, {
      key: '2',
      i18nLabel: '2_Erros_Information_and_Debug'
    }],
    'public': true
  });
  this.add('Log_Package', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Log_File', false, {
    type: 'boolean',
    'public': true
  });
  this.add('Log_View_Limit', 1000, {
    type: 'int'
  });
  this.add('Log_Trace_Methods', false, {
    type: 'boolean'
  });
  this.add('Log_Trace_Methods_Filter', '', {
    type: 'string',
    enableQuery: {
      _id: 'Log_Trace_Methods',
      value: true
    }
  });
  this.add('Log_Trace_Subscriptions', false, {
    type: 'boolean'
  });
  this.add('Log_Trace_Subscriptions_Filter', '', {
    type: 'string',
    enableQuery: {
      _id: 'Log_Trace_Subscriptions',
      value: true
    }
  });
  this.section('Prometheus', function () {
    this.add('Prometheus_Enabled', false, {
      type: 'boolean',
      i18nLabel: 'Enabled'
    });
    this.add('Prometheus_Port', 9100, {
      type: 'string',
      i18nLabel: 'Port'
    });
  });
});
RocketChat.settings.addGroup('Setup_Wizard', function () {
  this.section('Organization_Info', function () {
    this.add('Organization_Type', '', {
      type: 'select',
      values: [{
        key: 'nonprofit',
        i18nLabel: 'Nonprofit'
      }, {
        key: 'enterprise',
        i18nLabel: 'Enterprise'
      }, {
        key: 'government',
        i18nLabel: 'Government'
      }, {
        key: 'community',
        i18nLabel: 'Community'
      }],
      wizard: {
        step: 2,
        order: 0
      }
    });
    this.add('Organization_Name', '', {
      type: 'string',
      wizard: {
        step: 2,
        order: 1
      }
    });
    this.add('Industry', '', {
      type: 'select',
      values: [{
        key: 'advocacy',
        i18nLabel: 'Advocacy'
      }, {
        key: 'blockchain',
        i18nLabel: 'Blockchain'
      }, {
        key: 'helpCenter',
        i18nLabel: 'Help_Center'
      }, {
        key: 'manufacturing',
        i18nLabel: 'Manufacturing'
      }, {
        key: 'education',
        i18nLabel: 'Education'
      }, {
        key: 'insurance',
        i18nLabel: 'Insurance'
      }, {
        key: 'logistics',
        i18nLabel: 'Logistics'
      }, {
        key: 'consulting',
        i18nLabel: 'Consulting'
      }, {
        key: 'entertainment',
        i18nLabel: 'Entertainment'
      }, {
        key: 'publicRelations',
        i18nLabel: 'Public_Relations'
      }, {
        key: 'religious',
        i18nLabel: 'Religious'
      }, {
        key: 'gaming',
        i18nLabel: 'Gaming'
      }, {
        key: 'socialNetwork',
        i18nLabel: 'Social_Network'
      }, {
        key: 'realEstate',
        i18nLabel: 'Real_Estate'
      }, {
        key: 'tourism',
        i18nLabel: 'Tourism'
      }, {
        key: 'telecom',
        i18nLabel: 'Telecom'
      }, {
        key: 'consumerGoods',
        i18nLabel: 'Consumer_Goods'
      }, {
        key: 'financialServices',
        i18nLabel: 'Financial_Services'
      }, {
        key: 'healthcarePharmaceutical',
        i18nLabel: 'Healthcare_and_Pharmaceutical'
      }, {
        key: 'industry',
        i18nLabel: 'Industry'
      }, {
        key: 'media',
        i18nLabel: 'Media'
      }, {
        key: 'retail',
        i18nLabel: 'Retail'
      }, {
        key: 'technologyServices',
        i18nLabel: 'Technology_Services'
      }, {
        key: 'technologyProvider',
        i18nLabel: 'Technology_Provider'
      }, {
        key: 'other',
        i18nLabel: 'Other'
      }],
      wizard: {
        step: 2,
        order: 2
      }
    });
    this.add('Size', '', {
      type: 'select',
      values: [{
        key: '0',
        i18nLabel: '1-10 people'
      }, {
        key: '1',
        i18nLabel: '11-50 people'
      }, {
        key: '2',
        i18nLabel: '51-100 people'
      }, {
        key: '3',
        i18nLabel: '101-250 people'
      }, {
        key: '4',
        i18nLabel: '251-500 people'
      }, {
        key: '5',
        i18nLabel: '501-1000 people'
      }, {
        key: '6',
        i18nLabel: '1001-4000 people'
      }, {
        key: '7',
        i18nLabel: '4000 or more people'
      }],
      wizard: {
        step: 2,
        order: 3
      }
    });
    this.add('Country', '', {
      type: 'select',
      values: [{
        key: 'worldwide',
        i18nLabel: 'Worldwide'
      }, {
        key: 'afghanistan',
        i18nLabel: 'Country_Afghanistan'
      }, {
        key: 'albania',
        i18nLabel: 'Country_Albania'
      }, {
        key: 'algeria',
        i18nLabel: 'Country_Algeria'
      }, {
        key: 'americanSamoa',
        i18nLabel: 'Country_American_Samoa'
      }, {
        key: 'andorra',
        i18nLabel: 'Country_Andorra'
      }, {
        key: 'angola',
        i18nLabel: 'Country_Angola'
      }, {
        key: 'anguilla',
        i18nLabel: 'Country_Anguilla'
      }, {
        key: 'antarctica',
        i18nLabel: 'Country_Antarctica'
      }, {
        key: 'antiguaAndBarbuda',
        i18nLabel: 'Country_Antigua_and_Barbuda'
      }, {
        key: 'argentina',
        i18nLabel: 'Country_Argentina'
      }, {
        key: 'armenia',
        i18nLabel: 'Country_Armenia'
      }, {
        key: 'aruba',
        i18nLabel: 'Country_Aruba'
      }, {
        key: 'australia',
        i18nLabel: 'Country_Australia'
      }, {
        key: 'austria',
        i18nLabel: 'Country_Austria'
      }, {
        key: 'azerbaijan',
        i18nLabel: 'Country_Azerbaijan'
      }, {
        key: 'bahamas',
        i18nLabel: 'Country_Bahamas'
      }, {
        key: 'bahrain',
        i18nLabel: 'Country_Bahrain'
      }, {
        key: 'bangladesh',
        i18nLabel: 'Country_Bangladesh'
      }, {
        key: 'barbados',
        i18nLabel: 'Country_Barbados'
      }, {
        key: 'belarus',
        i18nLabel: 'Country_Belarus'
      }, {
        key: 'belgium',
        i18nLabel: 'Country_Belgium'
      }, {
        key: 'belize',
        i18nLabel: 'Country_Belize'
      }, {
        key: 'benin',
        i18nLabel: 'Country_Benin'
      }, {
        key: 'bermuda',
        i18nLabel: 'Country_Bermuda'
      }, {
        key: 'bhutan',
        i18nLabel: 'Country_Bhutan'
      }, {
        key: 'bolivia',
        i18nLabel: 'Country_Bolivia'
      }, {
        key: 'bosniaAndHerzegovina',
        i18nLabel: 'Country_Bosnia_and_Herzegovina'
      }, {
        key: 'botswana',
        i18nLabel: 'Country_Botswana'
      }, {
        key: 'bouvetIsland',
        i18nLabel: 'Country_Bouvet_Island'
      }, {
        key: 'brazil',
        i18nLabel: 'Country_Brazil'
      }, {
        key: 'britishIndianOceanTerritory',
        i18nLabel: 'Country_British_Indian_Ocean_Territory'
      }, {
        key: 'bruneiDarussalam',
        i18nLabel: 'Country_Brunei_Darussalam'
      }, {
        key: 'bulgaria',
        i18nLabel: 'Country_Bulgaria'
      }, {
        key: 'burkinaFaso',
        i18nLabel: 'Country_Burkina_Faso'
      }, {
        key: 'burundi',
        i18nLabel: 'Country_Burundi'
      }, {
        key: 'cambodia',
        i18nLabel: 'Country_Cambodia'
      }, {
        key: 'cameroon',
        i18nLabel: 'Country_Cameroon'
      }, {
        key: 'canada',
        i18nLabel: 'Country_Canada'
      }, {
        key: 'capeVerde',
        i18nLabel: 'Country_Cape_Verde'
      }, {
        key: 'caymanIslands',
        i18nLabel: 'Country_Cayman_Islands'
      }, {
        key: 'centralAfricanRepublic',
        i18nLabel: 'Country_Central_African_Republic'
      }, {
        key: 'chad',
        i18nLabel: 'Country_Chad'
      }, {
        key: 'chile',
        i18nLabel: 'Country_Chile'
      }, {
        key: 'china',
        i18nLabel: 'Country_China'
      }, {
        key: 'christmasIsland',
        i18nLabel: 'Country_Christmas_Island'
      }, {
        key: 'cocosKeelingIslands',
        i18nLabel: 'Country_Cocos_Keeling_Islands'
      }, {
        key: 'colombia',
        i18nLabel: 'Country_Colombia'
      }, {
        key: 'comoros',
        i18nLabel: 'Country_Comoros'
      }, {
        key: 'congo',
        i18nLabel: 'Country_Congo'
      }, {
        key: 'congoTheDemocraticRepublicOfThe',
        i18nLabel: 'Country_Congo_The_Democratic_Republic_of_The'
      }, {
        key: 'cookIslands',
        i18nLabel: 'Country_Cook_Islands'
      }, {
        key: 'costaRica',
        i18nLabel: 'Country_Costa_Rica'
      }, {
        key: 'coteDivoire',
        i18nLabel: 'Country_Cote_Divoire'
      }, {
        key: 'croatia',
        i18nLabel: 'Country_Croatia'
      }, {
        key: 'cuba',
        i18nLabel: 'Country_Cuba'
      }, {
        key: 'cyprus',
        i18nLabel: 'Country_Cyprus'
      }, {
        key: 'czechRepublic',
        i18nLabel: 'Country_Czech_Republic'
      }, {
        key: 'denmark',
        i18nLabel: 'Country_Denmark'
      }, {
        key: 'djibouti',
        i18nLabel: 'Country_Djibouti'
      }, {
        key: 'dominica',
        i18nLabel: 'Country_Dominica'
      }, {
        key: 'dominicanRepublic',
        i18nLabel: 'Country_Dominican_Republic'
      }, {
        key: 'ecuador',
        i18nLabel: 'Country_Ecuador'
      }, {
        key: 'egypt',
        i18nLabel: 'Country_Egypt'
      }, {
        key: 'elSalvador',
        i18nLabel: 'Country_El_Salvador'
      }, {
        key: 'equatorialGuinea',
        i18nLabel: 'Country_Equatorial_Guinea'
      }, {
        key: 'eritrea',
        i18nLabel: 'Country_Eritrea'
      }, {
        key: 'estonia',
        i18nLabel: 'Country_Estonia'
      }, {
        key: 'ethiopia',
        i18nLabel: 'Country_Ethiopia'
      }, {
        key: 'falklandIslandsMalvinas',
        i18nLabel: 'Country_Falkland_Islands_Malvinas'
      }, {
        key: 'faroeIslands',
        i18nLabel: 'Country_Faroe_Islands'
      }, {
        key: 'fiji',
        i18nLabel: 'Country_Fiji'
      }, {
        key: 'finland',
        i18nLabel: 'Country_Finland'
      }, {
        key: 'france',
        i18nLabel: 'Country_France'
      }, {
        key: 'frenchGuiana',
        i18nLabel: 'Country_French_Guiana'
      }, {
        key: 'frenchPolynesia',
        i18nLabel: 'Country_French_Polynesia'
      }, {
        key: 'frenchSouthernTerritories',
        i18nLabel: 'Country_French_Southern_Territories'
      }, {
        key: 'gabon',
        i18nLabel: 'Country_Gabon'
      }, {
        key: 'gambia',
        i18nLabel: 'Country_Gambia'
      }, {
        key: 'georgia',
        i18nLabel: 'Country_Georgia'
      }, {
        key: 'germany',
        i18nLabel: 'Country_Germany'
      }, {
        key: 'ghana',
        i18nLabel: 'Country_Ghana'
      }, {
        key: 'gibraltar',
        i18nLabel: 'Country_Gibraltar'
      }, {
        key: 'greece',
        i18nLabel: 'Country_Greece'
      }, {
        key: 'greenland',
        i18nLabel: 'Country_Greenland'
      }, {
        key: 'grenada',
        i18nLabel: 'Country_Grenada'
      }, {
        key: 'guadeloupe',
        i18nLabel: 'Country_Guadeloupe'
      }, {
        key: 'guam',
        i18nLabel: 'Country_Guam'
      }, {
        key: 'guatemala',
        i18nLabel: 'Country_Guatemala'
      }, {
        key: 'guinea',
        i18nLabel: 'Country_Guinea'
      }, {
        key: 'guineaBissau',
        i18nLabel: 'Country_Guinea_bissau'
      }, {
        key: 'guyana',
        i18nLabel: 'Country_Guyana'
      }, {
        key: 'haiti',
        i18nLabel: 'Country_Haiti'
      }, {
        key: 'heardIslandAndMcdonaldIslands',
        i18nLabel: 'Country_Heard_Island_and_Mcdonald_Islands'
      }, {
        key: 'holySeeVaticanCityState',
        i18nLabel: 'Country_Holy_See_Vatican_City_State'
      }, {
        key: 'honduras',
        i18nLabel: 'Country_Honduras'
      }, {
        key: 'hongKong',
        i18nLabel: 'Country_Hong_Kong'
      }, {
        key: 'hungary',
        i18nLabel: 'Country_Hungary'
      }, {
        key: 'iceland',
        i18nLabel: 'Country_Iceland'
      }, {
        key: 'india',
        i18nLabel: 'Country_India'
      }, {
        key: 'indonesia',
        i18nLabel: 'Country_Indonesia'
      }, {
        key: 'iranIslamicRepublicOf',
        i18nLabel: 'Country_Iran_Islamic_Republic_of'
      }, {
        key: 'iraq',
        i18nLabel: 'Country_Iraq'
      }, {
        key: 'ireland',
        i18nLabel: 'Country_Ireland'
      }, {
        key: 'israel',
        i18nLabel: 'Country_Israel'
      }, {
        key: 'italy',
        i18nLabel: 'Country_Italy'
      }, {
        key: 'jamaica',
        i18nLabel: 'Country_Jamaica'
      }, {
        key: 'japan',
        i18nLabel: 'Country_Japan'
      }, {
        key: 'jordan',
        i18nLabel: 'Country_Jordan'
      }, {
        key: 'kazakhstan',
        i18nLabel: 'Country_Kazakhstan'
      }, {
        key: 'kenya',
        i18nLabel: 'Country_Kenya'
      }, {
        key: 'kiribati',
        i18nLabel: 'Country_Kiribati'
      }, {
        key: 'koreaDemocraticPeoplesRepublicOf',
        i18nLabel: 'Country_Korea_Democratic_Peoples_Republic_of'
      }, {
        key: 'koreaRepublicOf',
        i18nLabel: 'Country_Korea_Republic_of'
      }, {
        key: 'kuwait',
        i18nLabel: 'Country_Kuwait'
      }, {
        key: 'kyrgyzstan',
        i18nLabel: 'Country_Kyrgyzstan'
      }, {
        key: 'laoPeoplesDemocraticRepublic',
        i18nLabel: 'Country_Lao_Peoples_Democratic_Republic'
      }, {
        key: 'latvia',
        i18nLabel: 'Country_Latvia'
      }, {
        key: 'lebanon',
        i18nLabel: 'Country_Lebanon'
      }, {
        key: 'lesotho',
        i18nLabel: 'Country_Lesotho'
      }, {
        key: 'liberia',
        i18nLabel: 'Country_Liberia'
      }, {
        key: 'libyanArabJamahiriya',
        i18nLabel: 'Country_Libyan_Arab_Jamahiriya'
      }, {
        key: 'liechtenstein',
        i18nLabel: 'Country_Liechtenstein'
      }, {
        key: 'lithuania',
        i18nLabel: 'Country_Lithuania'
      }, {
        key: 'luxembourg',
        i18nLabel: 'Country_Luxembourg'
      }, {
        key: 'macao',
        i18nLabel: 'Country_Macao'
      }, {
        key: 'macedoniaTheFormerYugoslavRepublicOf',
        i18nLabel: 'Country_Macedonia_The_Former_Yugoslav_Republic_of'
      }, {
        key: 'madagascar',
        i18nLabel: 'Country_Madagascar'
      }, {
        key: 'malawi',
        i18nLabel: 'Country_Malawi'
      }, {
        key: 'malaysia',
        i18nLabel: 'Country_Malaysia'
      }, {
        key: 'maldives',
        i18nLabel: 'Country_Maldives'
      }, {
        key: 'mali',
        i18nLabel: 'Country_Mali'
      }, {
        key: 'malta',
        i18nLabel: 'Country_Malta'
      }, {
        key: 'marshallIslands',
        i18nLabel: 'Country_Marshall_Islands'
      }, {
        key: 'martinique',
        i18nLabel: 'Country_Martinique'
      }, {
        key: 'mauritania',
        i18nLabel: 'Country_Mauritania'
      }, {
        key: 'mauritius',
        i18nLabel: 'Country_Mauritius'
      }, {
        key: 'mayotte',
        i18nLabel: 'Country_Mayotte'
      }, {
        key: 'mexico',
        i18nLabel: 'Country_Mexico'
      }, {
        key: 'micronesiaFederatedStatesOf',
        i18nLabel: 'Country_Micronesia_Federated_States_of'
      }, {
        key: 'moldovaRepublicOf',
        i18nLabel: 'Country_Moldova_Republic_of'
      }, {
        key: 'monaco',
        i18nLabel: 'Country_Monaco'
      }, {
        key: 'mongolia',
        i18nLabel: 'Country_Mongolia'
      }, {
        key: 'montserrat',
        i18nLabel: 'Country_Montserrat'
      }, {
        key: 'morocco',
        i18nLabel: 'Country_Morocco'
      }, {
        key: 'mozambique',
        i18nLabel: 'Country_Mozambique'
      }, {
        key: 'myanmar',
        i18nLabel: 'Country_Myanmar'
      }, {
        key: 'namibia',
        i18nLabel: 'Country_Namibia'
      }, {
        key: 'nauru',
        i18nLabel: 'Country_Nauru'
      }, {
        key: 'nepal',
        i18nLabel: 'Country_Nepal'
      }, {
        key: 'netherlands',
        i18nLabel: 'Country_Netherlands'
      }, {
        key: 'netherlandsAntilles',
        i18nLabel: 'Country_Netherlands_Antilles'
      }, {
        key: 'newCaledonia',
        i18nLabel: 'Country_New_Caledonia'
      }, {
        key: 'newZealand',
        i18nLabel: 'Country_New_Zealand'
      }, {
        key: 'nicaragua',
        i18nLabel: 'Country_Nicaragua'
      }, {
        key: 'niger',
        i18nLabel: 'Country_Niger'
      }, {
        key: 'nigeria',
        i18nLabel: 'Country_Nigeria'
      }, {
        key: 'niue',
        i18nLabel: 'Country_Niue'
      }, {
        key: 'norfolkIsland',
        i18nLabel: 'Country_Norfolk_Island'
      }, {
        key: 'northernMarianaIslands',
        i18nLabel: 'Country_Northern_Mariana_Islands'
      }, {
        key: 'norway',
        i18nLabel: 'Country_Norway'
      }, {
        key: 'oman',
        i18nLabel: 'Country_Oman'
      }, {
        key: 'pakistan',
        i18nLabel: 'Country_Pakistan'
      }, {
        key: 'palau',
        i18nLabel: 'Country_Palau'
      }, {
        key: 'palestinianTerritoryOccupied',
        i18nLabel: 'Country_Palestinian_Territory_Occupied'
      }, {
        key: 'panama',
        i18nLabel: 'Country_Panama'
      }, {
        key: 'papuaNewGuinea',
        i18nLabel: 'Country_Papua_New_Guinea'
      }, {
        key: 'paraguay',
        i18nLabel: 'Country_Paraguay'
      }, {
        key: 'peru',
        i18nLabel: 'Country_Peru'
      }, {
        key: 'philippines',
        i18nLabel: 'Country_Philippines'
      }, {
        key: 'pitcairn',
        i18nLabel: 'Country_Pitcairn'
      }, {
        key: 'poland',
        i18nLabel: 'Country_Poland'
      }, {
        key: 'portugal',
        i18nLabel: 'Country_Portugal'
      }, {
        key: 'puertoRico',
        i18nLabel: 'Country_Puerto_Rico'
      }, {
        key: 'qatar',
        i18nLabel: 'Country_Qatar'
      }, {
        key: 'reunion',
        i18nLabel: 'Country_Reunion'
      }, {
        key: 'romania',
        i18nLabel: 'Country_Romania'
      }, {
        key: 'russianFederation',
        i18nLabel: 'Country_Russian_Federation'
      }, {
        key: 'rwanda',
        i18nLabel: 'Country_Rwanda'
      }, {
        key: 'saintHelena',
        i18nLabel: 'Country_Saint_Helena'
      }, {
        key: 'saintKittsAndNevis',
        i18nLabel: 'Country_Saint_Kitts_and_Nevis'
      }, {
        key: 'saintLucia',
        i18nLabel: 'Country_Saint_Lucia'
      }, {
        key: 'saintPierreAndMiquelon',
        i18nLabel: 'Country_Saint_Pierre_and_Miquelon'
      }, {
        key: 'saintVincentAndTheGrenadines',
        i18nLabel: 'Country_Saint_Vincent_and_The_Grenadines'
      }, {
        key: 'samoa',
        i18nLabel: 'Country_Samoa'
      }, {
        key: 'sanMarino',
        i18nLabel: 'Country_San_Marino'
      }, {
        key: 'saoTomeAndPrincipe',
        i18nLabel: 'Country_Sao_Tome_and_Principe'
      }, {
        key: 'saudiArabia',
        i18nLabel: 'Country_Saudi_Arabia'
      }, {
        key: 'senegal',
        i18nLabel: 'Country_Senegal'
      }, {
        key: 'serbiaAndMontenegro',
        i18nLabel: 'Country_Serbia_and_Montenegro'
      }, {
        key: 'seychelles',
        i18nLabel: 'Country_Seychelles'
      }, {
        key: 'sierraLeone',
        i18nLabel: 'Country_Sierra_Leone'
      }, {
        key: 'singapore',
        i18nLabel: 'Country_Singapore'
      }, {
        key: 'slovakia',
        i18nLabel: 'Country_Slovakia'
      }, {
        key: 'slovenia',
        i18nLabel: 'Country_Slovenia'
      }, {
        key: 'solomonIslands',
        i18nLabel: 'Country_Solomon_Islands'
      }, {
        key: 'somalia',
        i18nLabel: 'Country_Somalia'
      }, {
        key: 'southAfrica',
        i18nLabel: 'Country_South_Africa'
      }, {
        key: 'southGeorgiaAndTheSouthSandwichIslands',
        i18nLabel: 'Country_South_Georgia_and_The_South_Sandwich_Islands'
      }, {
        key: 'spain',
        i18nLabel: 'Country_Spain'
      }, {
        key: 'sriLanka',
        i18nLabel: 'Country_Sri_Lanka'
      }, {
        key: 'sudan',
        i18nLabel: 'Country_Sudan'
      }, {
        key: 'suriname',
        i18nLabel: 'Country_Suriname'
      }, {
        key: 'svalbardAndJanMayen',
        i18nLabel: 'Country_Svalbard_and_Jan_Mayen'
      }, {
        key: 'swaziland',
        i18nLabel: 'Country_Swaziland'
      }, {
        key: 'sweden',
        i18nLabel: 'Country_Sweden'
      }, {
        key: 'switzerland',
        i18nLabel: 'Country_Switzerland'
      }, {
        key: 'syrianArabRepublic',
        i18nLabel: 'Country_Syrian_Arab_Republic'
      }, {
        key: 'taiwanProvinceOfChina',
        i18nLabel: 'Country_Taiwan_Province_of_China'
      }, {
        key: 'tajikistan',
        i18nLabel: 'Country_Tajikistan'
      }, {
        key: 'tanzaniaUnitedRepublicOf',
        i18nLabel: 'Country_Tanzania_United_Republic_of'
      }, {
        key: 'thailand',
        i18nLabel: 'Country_Thailand'
      }, {
        key: 'timorLeste',
        i18nLabel: 'Country_Timor_leste'
      }, {
        key: 'togo',
        i18nLabel: 'Country_Togo'
      }, {
        key: 'tokelau',
        i18nLabel: 'Country_Tokelau'
      }, {
        key: 'tonga',
        i18nLabel: 'Country_Tonga'
      }, {
        key: 'trinidadAndTobago',
        i18nLabel: 'Country_Trinidad_and_Tobago'
      }, {
        key: 'tunisia',
        i18nLabel: 'Country_Tunisia'
      }, {
        key: 'turkey',
        i18nLabel: 'Country_Turkey'
      }, {
        key: 'turkmenistan',
        i18nLabel: 'Country_Turkmenistan'
      }, {
        key: 'turksAndCaicosIslands',
        i18nLabel: 'Country_Turks_and_Caicos_Islands'
      }, {
        key: 'tuvalu',
        i18nLabel: 'Country_Tuvalu'
      }, {
        key: 'uganda',
        i18nLabel: 'Country_Uganda'
      }, {
        key: 'ukraine',
        i18nLabel: 'Country_Ukraine'
      }, {
        key: 'unitedArabEmirates',
        i18nLabel: 'Country_United_Arab_Emirates'
      }, {
        key: 'unitedKingdom',
        i18nLabel: 'Country_United_Kingdom'
      }, {
        key: 'unitedStates',
        i18nLabel: 'Country_United_States'
      }, {
        key: 'unitedStatesMinorOutlyingIslands',
        i18nLabel: 'Country_United_States_Minor_Outlying_Islands'
      }, {
        key: 'uruguay',
        i18nLabel: 'Country_Uruguay'
      }, {
        key: 'uzbekistan',
        i18nLabel: 'Country_Uzbekistan'
      }, {
        key: 'vanuatu',
        i18nLabel: 'Country_Vanuatu'
      }, {
        key: 'venezuela',
        i18nLabel: 'Country_Venezuela'
      }, {
        key: 'vietNam',
        i18nLabel: 'Country_Viet_Nam'
      }, {
        key: 'virginIslandsBritish',
        i18nLabel: 'Country_Virgin_Islands_British'
      }, {
        key: 'virginIslandsUS',
        i18nLabel: 'Country_Virgin_Islands_US'
      }, {
        key: 'wallisAndFutuna',
        i18nLabel: 'Country_Wallis_and_Futuna'
      }, {
        key: 'westernSahara',
        i18nLabel: 'Country_Western_Sahara'
      }, {
        key: 'yemen',
        i18nLabel: 'Country_Yemen'
      }, {
        key: 'zambia',
        i18nLabel: 'Country_Zambia'
      }, {
        key: 'zimbabwe',
        i18nLabel: 'Country_Zimbabwe'
      }],
      wizard: {
        step: 2,
        order: 4
      }
    });
    this.add('Website', '', {
      type: 'string',
      wizard: {
        step: 2,
        order: 5
      }
    });
    this.add('Server_Type', '', {
      type: 'select',
      values: [{
        key: 'privateTeam',
        i18nLabel: 'Private_Team'
      }, {
        key: 'publicCommunity',
        i18nLabel: 'Public_Community'
      }],
      wizard: {
        step: 3,
        order: 2
      }
    });
    this.add('Allow_Marketing_Emails', true, {
      type: 'boolean'
    });
  });
});
RocketChat.settings.init();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"publications":{"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/publications/settings.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'public-settings/get'(updatedAt) {
    this.unblock();
    const records = RocketChat.models.Settings.findNotHiddenPublic().fetch();

    if (updatedAt instanceof Date) {
      return {
        update: records.filter(function (record) {
          return record._updatedAt > updatedAt;
        }),
        remove: RocketChat.models.Settings.trashFindDeletedAfter(updatedAt, {
          hidden: {
            $ne: true
          },
          'public': true
        }, {
          fields: {
            _id: 1,
            _deletedAt: 1
          }
        }).fetch()
      };
    }

    return records;
  },

  'private-settings/get'(updatedAt) {
    if (!Meteor.userId()) {
      return [];
    }

    this.unblock();

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'view-privileged-setting')) {
      return [];
    }

    const records = RocketChat.models.Settings.findNotHidden().fetch();

    if (updatedAt instanceof Date) {
      return {
        update: records.filter(function (record) {
          return record._updatedAt > updatedAt;
        }),
        remove: RocketChat.models.Settings.trashFindDeletedAfter(updatedAt, {
          hidden: {
            $ne: true
          }
        }, {
          fields: {
            _id: 1,
            _deletedAt: 1
          }
        }).fetch()
      };
    }

    return records;
  }

});
RocketChat.models.Settings.on('change', ({
  clientAction,
  id,
  data
}) => {
  switch (clientAction) {
    case 'updated':
    case 'inserted':
      const setting = data || RocketChat.models.Settings.findOneById(id);
      const value = {
        _id: setting._id,
        value: setting.value,
        editor: setting.editor,
        properties: setting.properties
      };

      if (setting['public'] === true) {
        RocketChat.Notifications.notifyAllInThisInstance('public-settings-changed', clientAction, value);
      } else {
        RocketChat.Notifications.notifyLoggedInThisInstance('private-settings-changed', clientAction, setting);
      }

      break;

    case 'removed':
      RocketChat.Notifications.notifyLoggedInThisInstance('private-settings-changed', clientAction, {
        _id: id
      });
      RocketChat.Notifications.notifyAllInThisInstance('public-settings-changed', clientAction, {
        _id: id
      });
      break;
  }
});
RocketChat.Notifications.streamAll.allowRead('private-settings-changed', function () {
  if (this.userId == null) {
    return false;
  }

  return RocketChat.authz.hasPermission(this.userId, 'view-privileged-setting');
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"addOAuthService.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/addOAuthService.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
Meteor.methods({
  addOAuthService(name) {
    check(name, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'addOAuthService'
      });
    }

    if (RocketChat.authz.hasPermission(Meteor.userId(), 'add-oauth-service') !== true) {
      throw new Meteor.Error('error-action-not-allowed', 'Adding OAuth Services is not allowed', {
        method: 'addOAuthService',
        action: 'Adding_OAuth_Services'
      });
    }

    name = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    name = s.capitalize(name);
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}`, false, {
      type: 'boolean',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Enable',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-url`, '', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'URL',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-token_path`, '/oauth/token', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Token_Path',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-token_sent_via`, 'payload', {
      type: 'select',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Token_Sent_Via',
      persistent: true,
      values: [{
        key: 'header',
        i18nLabel: 'Header'
      }, {
        key: 'payload',
        i18nLabel: 'Payload'
      }]
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-identity_token_sent_via`, 'default', {
      type: 'select',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Identity_Token_Sent_Via',
      persistent: true,
      values: [{
        key: 'default',
        i18nLabel: 'Same_As_Token_Sent_Via'
      }, {
        key: 'header',
        i18nLabel: 'Header'
      }, {
        key: 'payload',
        i18nLabel: 'Payload'
      }]
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-identity_path`, '/me', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Identity_Path',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-authorize_path`, '/oauth/authorize', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Authorize_Path',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-scope`, 'openid', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Scope',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-id`, '', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_id',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-secret`, '', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Secret',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-login_style`, 'popup', {
      type: 'select',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Login_Style',
      persistent: true,
      values: [{
        key: 'redirect',
        i18nLabel: 'Redirect'
      }, {
        key: 'popup',
        i18nLabel: 'Popup'
      }, {
        key: '',
        i18nLabel: 'Default'
      }]
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-button_label_text`, '', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Button_Label_Text',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-button_label_color`, '#FFFFFF', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Button_Label_Color',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-button_color`, '#13679A', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Button_Color',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-username_field`, '', {
      type: 'string',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Username_Field',
      persistent: true
    });
    RocketChat.settings.add(`Accounts_OAuth_Custom-${name}-merge_users`, false, {
      type: 'boolean',
      group: 'OAuth',
      section: `Custom OAuth: ${name}`,
      i18nLabel: 'Accounts_OAuth_Custom_Merge_Users',
      persistent: true
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"refreshOAuthService.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/refreshOAuthService.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  refreshOAuthService() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'refreshOAuthService'
      });
    }

    if (RocketChat.authz.hasPermission(Meteor.userId(), 'add-oauth-service') !== true) {
      throw new Meteor.Error('error-action-not-allowed', 'Refresh OAuth Services is not allowed', {
        method: 'refreshOAuthService',
        action: 'Refreshing_OAuth_Services'
      });
    }

    ServiceConfiguration.configurations.remove({});
    RocketChat.models.Settings.update({
      _id: /^Accounts_OAuth_.+/
    }, {
      $set: {
        _updatedAt: new Date()
      }
    }, {
      multi: true
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addUserToRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/addUserToRoom.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  addUserToRoom(data) {
    return Meteor.call('addUsersToRoom', {
      rid: data.rid,
      users: [data.username]
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addUsersToRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/addUsersToRoom.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  addUsersToRoom(data = {}) {
    // Validate user and room
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'addUsersToRoom'
      });
    }

    if (!Match.test(data.rid, String)) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'addUsersToRoom'
      });
    } // Get user and room details


    const room = RocketChat.models.Rooms.findOneById(data.rid);
    const userId = Meteor.userId();
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(data.rid, userId, {
      fields: {
        _id: 1
      }
    });
    const userInRoom = subscription != null; // Can't add to direct room ever

    if (room.t === 'd') {
      throw new Meteor.Error('error-cant-invite-for-direct-room', 'Can\'t invite user to direct rooms', {
        method: 'addUsersToRoom'
      });
    } // Can add to any room you're in, with permission, otherwise need specific room type permission


    let canAddUser = false;

    if (userInRoom && RocketChat.authz.hasPermission(userId, 'add-user-to-joined-room', room._id)) {
      canAddUser = true;
    } else if (room.t === 'c' && RocketChat.authz.hasPermission(userId, 'add-user-to-any-c-room')) {
      canAddUser = true;
    } else if (room.t === 'p' && RocketChat.authz.hasPermission(userId, 'add-user-to-any-p-room')) {
      canAddUser = true;
    } // Adding wasn't allowed


    if (!canAddUser) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'addUsersToRoom'
      });
    } // Missing the users to be added


    if (!Array.isArray(data.users)) {
      throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
        method: 'addUsersToRoom'
      });
    } // Validate each user, then add to room


    const user = Meteor.user();
    data.users.forEach(username => {
      const newUser = RocketChat.models.Users.findOneByUsername(username);

      if (!newUser) {
        throw new Meteor.Error('error-invalid-username', 'Invalid username', {
          method: 'addUsersToRoom'
        });
      }

      RocketChat.addUserToRoom(data.rid, newUser, user);
    });
    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"archiveRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/archiveRoom.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  archiveRoom(rid) {
    check(rid, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'archiveRoom'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'archiveRoom'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'archive-room', room._id)) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'archiveRoom'
      });
    }

    if (room.t === 'd') {
      throw new Meteor.Error('error-direct-message-room', 'Direct Messages can not be archived', {
        method: 'archiveRoom'
      });
    }

    return RocketChat.archiveRoom(rid);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"blockUser.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/blockUser.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  blockUser({
    rid,
    blocked
  }) {
    check(rid, String);
    check(blocked, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'blockUser'
      });
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, Meteor.userId());
    const subscription2 = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, blocked);

    if (!subscription || !subscription2) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'blockUser'
      });
    }

    RocketChat.models.Subscriptions.setBlockedByRoomId(rid, blocked, Meteor.userId());
    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"checkRegistrationSecretURL.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/checkRegistrationSecretURL.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  checkRegistrationSecretURL(hash) {
    check(hash, String);
    return hash === RocketChat.settings.get('Accounts_RegistrationForm_SecretURL');
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"checkUsernameAvailability.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/checkUsernameAvailability.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  checkUsernameAvailability(username) {
    check(username, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'setUsername'
      });
    }

    const user = Meteor.user();

    if (user.username && !RocketChat.settings.get('Accounts_AllowUsernameChange')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'setUsername'
      });
    }

    if (user.username === username) {
      return true;
    }

    return RocketChat.checkUsernameAvailability(username);
  }

});
RocketChat.RateLimiter.limitMethod('checkUsernameAvailability', 1, 1000, {
  userId() {
    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cleanRoomHistory.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/cleanRoomHistory.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals FileUpload */
Meteor.methods({
  cleanRoomHistory({
    roomId,
    latest,
    oldest,
    inclusive = true,
    limit,
    excludePinned = false,
    filesOnly = false,
    fromUsers = []
  }) {
    check(roomId, String);
    check(latest, Date);
    check(oldest, Date);
    check(inclusive, Boolean);
    check(limit, Match.Maybe(Number));
    check(excludePinned, Match.Maybe(Boolean));
    check(filesOnly, Match.Maybe(Boolean));
    check(fromUsers, Match.Maybe([String]));
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'cleanRoomHistory'
      });
    }

    if (!RocketChat.authz.hasPermission(userId, 'clean-channel-history', roomId)) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'cleanRoomHistory'
      });
    }

    return RocketChat.cleanRoomHistory({
      rid: roomId,
      latest,
      oldest,
      inclusive,
      limit,
      excludePinned,
      filesOnly,
      fromUsers
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"createChannel.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/createChannel.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

Meteor.methods({
  createChannel(name, members, readOnly = false, customFields = {}, extraData = {}) {
    check(name, String);
    check(members, Match.Optional([String]));

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'createChannel'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'create-c')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'createChannel'
      });
    }

    return RocketChat.createRoom('c', name, Meteor.user() && Meteor.user().username, members, readOnly, (0, _objectSpread2.default)({
      customFields
    }, extraData));
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"createToken.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/createToken.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  createToken(userId) {
    if (Meteor.userId() !== userId && !RocketChat.authz.hasPermission(Meteor.userId(), 'user-generate-access-token')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'createToken'
      });
    }

    const token = Accounts._generateStampedLoginToken();

    Accounts._insertLoginToken(userId, token);

    return {
      userId,
      authToken: token.token
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"createPrivateGroup.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/createPrivateGroup.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

Meteor.methods({
  createPrivateGroup(name, members, readOnly = false, customFields = {}, extraData = {}) {
    check(name, String);
    check(members, Match.Optional([String]));

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'createPrivateGroup'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'create-p')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'createPrivateGroup'
      });
    } // validate extra data schema


    check(extraData, Match.ObjectIncluding({
      tokenpass: Match.Maybe({
        require: String,
        tokens: [{
          token: String,
          balance: String
        }]
      })
    }));
    return RocketChat.createRoom('p', name, Meteor.user() && Meteor.user().username, members, readOnly, (0, _objectSpread2.default)({
      customFields
    }, extraData));
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/deleteMessage.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);
Meteor.methods({
  deleteMessage(message) {
    check(message, Match.ObjectIncluding({
      _id: String
    }));

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'deleteMessage'
      });
    }

    const originalMessage = RocketChat.models.Messages.findOneById(message._id, {
      fields: {
        u: 1,
        rid: 1,
        file: 1,
        ts: 1
      }
    });

    if (originalMessage == null) {
      throw new Meteor.Error('error-action-not-allowed', 'Not allowed', {
        method: 'deleteMessage',
        action: 'Delete_message'
      });
    }

    const forceDelete = RocketChat.authz.hasPermission(Meteor.userId(), 'force-delete-message', originalMessage.rid);
    const hasPermission = RocketChat.authz.hasPermission(Meteor.userId(), 'delete-message', originalMessage.rid);
    const deleteAllowed = RocketChat.settings.get('Message_AllowDeleting');
    const deleteOwn = originalMessage && originalMessage.u && originalMessage.u._id === Meteor.userId();

    if (!(hasPermission || deleteAllowed && deleteOwn) && !forceDelete) {
      throw new Meteor.Error('error-action-not-allowed', 'Not allowed', {
        method: 'deleteMessage',
        action: 'Delete_message'
      });
    }

    const blockDeleteInMinutes = RocketChat.settings.get('Message_AllowDeleting_BlockDeleteInMinutes');

    if (blockDeleteInMinutes != null && blockDeleteInMinutes !== 0 && !forceDelete) {
      if (originalMessage.ts == null) {
        return;
      }

      const msgTs = moment(originalMessage.ts);

      if (msgTs == null) {
        return;
      }

      const currentTsDiff = moment().diff(msgTs, 'minutes');

      if (currentTsDiff > blockDeleteInMinutes) {
        throw new Meteor.Error('error-message-deleting-blocked', 'Message deleting is blocked', {
          method: 'deleteMessage'
        });
      }
    }

    return RocketChat.deleteMessage(originalMessage, Meteor.user());
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteUserOwnAccount.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/deleteUserOwnAccount.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
Meteor.methods({
  deleteUserOwnAccount(password) {
    check(password, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'deleteUserOwnAccount'
      });
    }

    if (!RocketChat.settings.get('Accounts_AllowDeleteOwnAccount')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'deleteUserOwnAccount'
      });
    }

    const userId = Meteor.userId();
    const user = RocketChat.models.Users.findOneById(userId);

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'deleteUserOwnAccount'
      });
    }

    if (user.services && user.services.password && s.trim(user.services.password.bcrypt)) {
      const result = Accounts._checkPassword(user, {
        digest: password,
        algorithm: 'sha-256'
      });

      if (result.error) {
        throw new Meteor.Error('error-invalid-password', 'Invalid password', {
          method: 'deleteUserOwnAccount'
        });
      }
    } else if (user.username !== s.trim(password)) {
      throw new Meteor.Error('error-invalid-username', 'Invalid username', {
        method: 'deleteUserOwnAccount'
      });
    }

    Meteor.defer(function () {
      RocketChat.deleteUser(userId);
    });
    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"executeSlashCommandPreview.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/executeSlashCommandPreview.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  executeSlashCommandPreview(command, preview) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getSlashCommandPreview'
      });
    }

    if (!command || !command.cmd || !RocketChat.slashCommands.commands[command.cmd]) {
      throw new Meteor.Error('error-invalid-command', 'Invalid Command Provided', {
        method: 'executeSlashCommandPreview'
      });
    }

    const theCmd = RocketChat.slashCommands.commands[command.cmd];

    if (!theCmd.providesPreview) {
      throw new Meteor.Error('error-invalid-command', 'Command Does Not Provide Previews', {
        method: 'executeSlashCommandPreview'
      });
    }

    if (!preview) {
      throw new Meteor.Error('error-invalid-command-preview', 'Invalid Preview Provided', {
        method: 'executeSlashCommandPreview'
      });
    }

    return RocketChat.slashCommands.executePreview(command.cmd, command.params, command.msg, preview);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"filterBadWords.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/filterBadWords.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Filter;
module.watch(require("bad-words"), {
  default(v) {
    Filter = v;
  }

}, 0);
RocketChat.callbacks.add('beforeSaveMessage', function (message) {
  if (RocketChat.settings.get('Message_AllowBadWordsFilter')) {
    const badWordsList = RocketChat.settings.get('Message_BadWordsFilterList');
    let options; // Add words to the blacklist

    if (!!badWordsList && badWordsList.length) {
      options = {
        list: badWordsList.split(',')
      };
    }

    const filter = new Filter(options);
    message.msg = filter.clean(message.msg);
  }

  return message;
}, 1, 'filterBadWords');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"filterATAllTag.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/filterATAllTag.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
RocketChat.callbacks.add('beforeSaveMessage', function (message) {
  // Test if the message mentions include @all.
  if (message.mentions != null && _.pluck(message.mentions, '_id').some(item => item === 'all')) {
    // Check if the user has permissions to use @all in both global and room scopes.
    if (!RocketChat.authz.hasPermission(message.u._id, 'mention-all') && !RocketChat.authz.hasPermission(message.u._id, 'mention-all', message.rid)) {
      // Get the language of the user for the error notification.
      const language = RocketChat.models.Users.findOneById(message.u._id).language;

      const action = TAPi18n.__('Notify_all_in_this_room', {}, language); // Add a notification to the chat, informing the user that this
      // action is not allowed.


      RocketChat.Notifications.notifyUser(message.u._id, 'message', {
        _id: Random.id(),
        rid: message.rid,
        ts: new Date(),
        msg: TAPi18n.__('error-action-not-allowed', {
          action
        }, language)
      }); // Also throw to stop propagation of 'sendMessage'.

      throw new Meteor.Error('error-action-not-allowed', 'Notify all in this room not allowed', {
        method: 'filterATAllTag',
        action: 'Notify_all_in_this_room'
      });
    }
  }

  return message;
}, 1, 'filterATAllTag');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"filterATHereTag.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/filterATHereTag.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
RocketChat.callbacks.add('beforeSaveMessage', function (message) {
  // Test if the message mentions include @here.
  if (message.mentions != null && _.pluck(message.mentions, '_id').some(item => item === 'here')) {
    // Check if the user has permissions to use @here in both global and room scopes.
    if (!RocketChat.authz.hasPermission(message.u._id, 'mention-here') && !RocketChat.authz.hasPermission(message.u._id, 'mention-here', message.rid)) {
      // Get the language of the user for the error notification.
      const language = RocketChat.models.Users.findOneById(message.u._id).language;

      const action = TAPi18n.__('Notify_active_in_this_room', {}, language); // Add a notification to the chat, informing the user that this
      // action is not allowed.


      RocketChat.Notifications.notifyUser(message.u._id, 'message', {
        _id: Random.id(),
        rid: message.rid,
        ts: new Date(),
        msg: TAPi18n.__('error-action-not-allowed', {
          action
        }, language)
      }); // Also throw to stop propagation of 'sendMessage'.

      throw new Meteor.Error('error-action-not-allowed', 'Notify here in this room not allowed', {
        method: 'filterATHereTag',
        action: 'Notify_active_in_this_room'
      });
    }
  }

  return message;
}, 1, 'filterATHereTag');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getChannelHistory.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/getChannelHistory.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  getChannelHistory({
    rid,
    latest,
    oldest,
    inclusive,
    count = 20,
    unreads
  }) {
    check(rid, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getChannelHistory'
      });
    }

    const fromUserId = Meteor.userId();
    const room = Meteor.call('canAccessRoom', rid, fromUserId);

    if (!room) {
      return false;
    } //Make sure they can access the room


    if (room.t === 'c' && !RocketChat.authz.hasPermission(fromUserId, 'preview-c-room') && !RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, fromUserId, {
      fields: {
        _id: 1
      }
    })) {
      return false;
    } //Ensure latest is always defined.


    if (_.isUndefined(latest)) {
      latest = new Date();
    } //Verify oldest is a date if it exists


    if (!_.isUndefined(oldest) && !_.isDate(oldest)) {
      throw new Meteor.Error('error-invalid-date', 'Invalid date', {
        method: 'getChannelHistory'
      });
    }

    const options = {
      sort: {
        ts: -1
      },
      limit: count
    };

    if (!RocketChat.settings.get('Message_ShowEditedStatus')) {
      options.fields = {
        'editedAt': 0
      };
    }

    let records = [];

    if (_.isUndefined(oldest) && inclusive) {
      records = RocketChat.models.Messages.findVisibleByRoomIdBeforeTimestampInclusive(rid, latest, options).fetch();
    } else if (_.isUndefined(oldest) && !inclusive) {
      records = RocketChat.models.Messages.findVisibleByRoomIdBeforeTimestamp(rid, latest, options).fetch();
    } else if (!_.isUndefined(oldest) && inclusive) {
      records = RocketChat.models.Messages.findVisibleByRoomIdBetweenTimestampsInclusive(rid, oldest, latest, options).fetch();
    } else {
      records = RocketChat.models.Messages.findVisibleByRoomIdBetweenTimestamps(rid, oldest, latest, options).fetch();
    }

    const UI_Use_Real_Name = RocketChat.settings.get('UI_Use_Real_Name') === true;

    const messages = _.map(records, message => {
      message.starred = _.findWhere(message.starred, {
        _id: fromUserId
      });

      if (message.u && message.u._id && UI_Use_Real_Name) {
        const user = RocketChat.models.Users.findOneById(message.u._id);
        message.u.name = user && user.name;
      }

      if (message.mentions && message.mentions.length && UI_Use_Real_Name) {
        message.mentions.forEach(mention => {
          const user = RocketChat.models.Users.findOneById(mention._id);
          mention.name = user && user.name;
        });
      }

      return message;
    });

    if (unreads) {
      let unreadNotLoaded = 0;
      let firstUnread = undefined;

      if (!_.isUndefined(oldest)) {
        const firstMsg = messages[messages.length - 1];

        if (!_.isUndefined(firstMsg) && firstMsg.ts > oldest) {
          const unreadMessages = RocketChat.models.Messages.findVisibleByRoomIdBetweenTimestamps(rid, oldest, firstMsg.ts, {
            limit: 1,
            sort: {
              ts: 1
            }
          });
          firstUnread = unreadMessages.fetch()[0];
          unreadNotLoaded = unreadMessages.count();
        }
      }

      return {
        messages: messages || [],
        firstUnread,
        unreadNotLoaded
      };
    }

    return {
      messages: messages || []
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getFullUserData.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/getFullUserData.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  getFullUserData({
    filter = '',
    username = '',
    limit = 1
  }) {
    const result = RocketChat.getFullUserData({
      userId: Meteor.userId(),
      filter: filter || username,
      limit
    });
    return result && result.fetch();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getRoomJoinCode.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/getRoomJoinCode.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  getRoomJoinCode(rid) {
    check(rid, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getJoinCode'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'view-join-code')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'getJoinCode'
      });
    }

    const [room] = RocketChat.models.Rooms.findById(rid).fetch();
    return room && room.joinCode;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getRoomRoles.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/getRoomRoles.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  getRoomRoles(rid) {
    check(rid, String);

    if (!Meteor.userId() && RocketChat.settings.get('Accounts_AllowAnonymousRead') === false) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getRoomRoles'
      });
    }

    check(rid, String);
    const options = {
      sort: {
        'u.username': 1
      },
      fields: {
        rid: 1,
        u: 1,
        roles: 1
      }
    };
    const UI_Use_Real_Name = RocketChat.settings.get('UI_Use_Real_Name') === true;
    const roles = RocketChat.models.Roles.find({
      scope: 'Subscriptions',
      description: {
        $exists: 1,
        $ne: ''
      }
    }).fetch();
    const subscriptions = RocketChat.models.Subscriptions.findByRoomIdAndRoles(rid, _.pluck(roles, '_id'), options).fetch();

    if (!UI_Use_Real_Name) {
      return subscriptions;
    } else {
      return subscriptions.map(subscription => {
        const user = RocketChat.models.Users.findOneById(subscription.u._id);
        subscription.u.name = user && user.name;
        return subscription;
      });
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getServerInfo.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/getServerInfo.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  getServerInfo() {
    return RocketChat.Info;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getSingleMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/getSingleMessage.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  getSingleMessage(msgId) {
    check(msgId, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getSingleMessage'
      });
    }

    const msg = RocketChat.models.Messages.findOneById(msgId);

    if (!msg && !msg.rid) {
      return undefined;
    }

    Meteor.call('canAccessRoom', msg.rid, Meteor.userId());
    return msg;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getSlashCommandPreviews.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/getSlashCommandPreviews.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  getSlashCommandPreviews(command) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getSlashCommandPreview'
      });
    }

    if (!command || !command.cmd || !RocketChat.slashCommands.commands[command.cmd]) {
      throw new Meteor.Error('error-invalid-command', 'Invalid Command Provided', {
        method: 'executeSlashCommandPreview'
      });
    }

    const theCmd = RocketChat.slashCommands.commands[command.cmd];

    if (!theCmd.providesPreview) {
      throw new Meteor.Error('error-invalid-command', 'Command Does Not Provide Previews', {
        method: 'executeSlashCommandPreview'
      });
    }

    return RocketChat.slashCommands.getPreviews(command.cmd, command.params, command.msg);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUserRoles.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/getUserRoles.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  getUserRoles() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getUserRoles'
      });
    }

    const options = {
      sort: {
        'username': 1
      },
      fields: {
        username: 1,
        roles: 1
      }
    };
    const roles = RocketChat.models.Roles.find({
      scope: 'Users',
      description: {
        $exists: 1,
        $ne: ''
      }
    }).fetch();

    const roleIds = _.pluck(roles, '_id'); // Security issue: we should not send all user's roles to all clients, only the 'public' roles
    // We must remove all roles that are not part of the query from the returned users


    const users = RocketChat.models.Users.findUsersInRoles(roleIds, null, options).fetch();

    for (const user of users) {
      user.roles = _.intersection(user.roles, roleIds);
    }

    return users;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"insertOrUpdateUser.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/insertOrUpdateUser.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  insertOrUpdateUser(userData) {
    check(userData, Object);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'insertOrUpdateUser'
      });
    }

    return RocketChat.saveUser(Meteor.userId(), userData);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"joinDefaultChannels.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/joinDefaultChannels.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  joinDefaultChannels(silenced) {
    check(silenced, Match.Optional(Boolean));

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'joinDefaultChannels'
      });
    }

    this.unblock();
    return RocketChat.addUserToDefaultChannels(Meteor.user(), silenced);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"joinRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/joinRoom.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  joinRoom(rid, code) {
    check(rid, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'joinRoom'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'joinRoom'
      });
    } // TODO we should have a 'beforeJoinRoom' call back so external services can do their own validations


    const user = Meteor.user();

    if (room.tokenpass && user && user.services && user.services.tokenpass) {
      const balances = RocketChat.updateUserTokenpassBalances(user);

      if (!RocketChat.Tokenpass.validateAccess(room.tokenpass, balances)) {
        throw new Meteor.Error('error-not-allowed', 'Token required', {
          method: 'joinRoom'
        });
      }
    } else {
      if (room.t !== 'c' || RocketChat.authz.hasPermission(Meteor.userId(), 'view-c-room') !== true) {
        throw new Meteor.Error('error-not-allowed', 'Not allowed', {
          method: 'joinRoom'
        });
      }

      if (room.joinCodeRequired === true && code !== room.joinCode && !RocketChat.authz.hasPermission(Meteor.userId(), 'join-without-join-code')) {
        throw new Meteor.Error('error-code-invalid', 'Invalid Room Password', {
          method: 'joinRoom'
        });
      }
    }

    return RocketChat.addUserToRoom(rid, user);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"leaveRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/leaveRoom.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  leaveRoom(rid) {
    check(rid, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'leaveRoom'
      });
    }

    this.unblock();
    const room = RocketChat.models.Rooms.findOneById(rid);
    const user = Meteor.user();

    if (room.t === 'd' || room.t === 'c' && !RocketChat.authz.hasPermission(user._id, 'leave-c') || room.t === 'p' && !RocketChat.authz.hasPermission(user._id, 'leave-p')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'leaveRoom'
      });
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, user._id, {
      fields: {
        _id: 1
      }
    });

    if (!subscription) {
      throw new Meteor.Error('error-user-not-in-room', 'You are not in this room', {
        method: 'leaveRoom'
      });
    } // If user is room owner, check if there are other owners. If there isn't anyone else, warn user to set a new owner.


    if (RocketChat.authz.hasRole(user._id, 'owner', room._id)) {
      const numOwners = RocketChat.authz.getUsersInRole('owner', room._id).count();

      if (numOwners === 1) {
        throw new Meteor.Error('error-you-are-last-owner', 'You are the last owner. Please set new owner before leaving the room.', {
          method: 'leaveRoom'
        });
      }
    }

    return RocketChat.removeUserFromRoom(rid, user);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeOAuthService.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/removeOAuthService.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
Meteor.methods({
  removeOAuthService(name) {
    check(name, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'removeOAuthService'
      });
    }

    if (RocketChat.authz.hasPermission(Meteor.userId(), 'add-oauth-service') !== true) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'removeOAuthService'
      });
    }

    name = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    name = s.capitalize(name);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-url`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-token_path`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-identity_path`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-authorize_path`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-scope`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-token_sent_via`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-identity_token_sent_via`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-id`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-secret`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-button_label_text`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-button_label_color`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-button_color`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-login_style`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-username_field`);
    RocketChat.settings.removeById(`Accounts_OAuth_Custom-${name}-merge_users`);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"restartServer.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/restartServer.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  restart_server() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'restart_server'
      });
    }

    if (RocketChat.authz.hasRole(Meteor.userId(), 'admin') !== true) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'restart_server'
      });
    }

    Meteor.setTimeout(() => {
      Meteor.setTimeout(() => {
        console.warn('Call to process.exit() timed out, aborting.');
        process.abort();
      }, 1000);
      process.exit(1);
    }, 1000);
    return {
      message: 'The_server_will_restart_in_s_seconds',
      params: [2]
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"robotMethods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/robotMethods.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  'robot.modelCall'(model, method, args) {
    check(model, String);
    check(method, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'robot.modelCall'
      });
    }

    if (!RocketChat.authz.hasRole(Meteor.userId(), 'robot')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'robot.modelCall'
      });
    }

    const m = RocketChat.models[model];

    if (!m || !_.isFunction(m[method])) {
      throw new Meteor.Error('error-invalid-method', 'Invalid method', {
        method: 'robot.modelCall'
      });
    }

    const cursor = RocketChat.models[model][method].apply(RocketChat.models[model], args);
    return cursor && cursor.fetch ? cursor.fetch() : cursor;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveSetting.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/saveSetting.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* eslint new-cap: 0 */
Meteor.methods({
  saveSetting(_id, value, editor) {
    if (Meteor.userId() === null) {
      throw new Meteor.Error('error-action-not-allowed', 'Editing settings is not allowed', {
        method: 'saveSetting'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'edit-privileged-setting')) {
      throw new Meteor.Error('error-action-not-allowed', 'Editing settings is not allowed', {
        method: 'saveSetting'
      });
    } //Verify the _id passed in is a string.


    check(_id, String);
    const setting = RocketChat.models.Settings.db.findOneById(_id); //Verify the value is what it should be

    switch (setting.type) {
      case 'roomPick':
        check(value, Match.OneOf([Object], ''));
        break;

      case 'boolean':
        check(value, Boolean);
        break;

      case 'int':
        check(value, Number);
        break;

      default:
        check(value, String);
        break;
    }

    RocketChat.settings.updateById(_id, value, editor);
    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendInvitationEmail.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/sendInvitationEmail.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  sendInvitationEmail(emails) {
    check(emails, [String]);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'sendInvitationEmail'
      });
    }

    if (!RocketChat.authz.hasRole(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'sendInvitationEmail'
      });
    }

    const rfcMailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    const validEmails = _.compact(_.map(emails, function (email) {
      if (rfcMailPattern.test(email)) {
        return email;
      }
    }));

    const header = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Header') || '');
    const footer = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Footer') || '');
    let html;
    let subject;
    const user = Meteor.user();
    const lng = user.language || RocketChat.settings.get('language') || 'en';

    if (RocketChat.settings.get('Invitation_Customized')) {
      subject = RocketChat.settings.get('Invitation_Subject');
      html = RocketChat.settings.get('Invitation_HTML');
    } else {
      subject = TAPi18n.__('Invitation_Subject_Default', {
        lng
      });
      html = TAPi18n.__('Invitation_HTML_Default', {
        lng
      });
    }

    subject = RocketChat.placeholders.replace(subject);
    validEmails.forEach(email => {
      this.unblock();
      html = RocketChat.placeholders.replace(html, {
        email
      });

      try {
        Email.send({
          to: email,
          from: RocketChat.settings.get('From_Email'),
          subject,
          html: header + html + footer
        });
      } catch ({
        message
      }) {
        throw new Meteor.Error('error-email-send-failed', `Error trying to send email: ${message}`, {
          method: 'sendInvitationEmail',
          message
        });
      }
    });
    return validEmails;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/sendMessage.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);
Meteor.methods({
  sendMessage(message) {
    check(message, Object);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'sendMessage'
      });
    }

    if (!message.rid) {
      throw new Error('The \'rid\' property on the message object is missing.');
    }

    if (message.ts) {
      const tsDiff = Math.abs(moment(message.ts).diff());

      if (tsDiff > 60000) {
        throw new Meteor.Error('error-message-ts-out-of-sync', 'Message timestamp is out of sync', {
          method: 'sendMessage',
          message_ts: message.ts,
          server_ts: new Date().getTime()
        });
      } else if (tsDiff > 10000) {
        message.ts = new Date();
      }
    } else {
      message.ts = new Date();
    }

    if (message.msg) {
      const adjustedMessage = RocketChat.messageProperties.messageWithoutEmojiShortnames(message.msg);

      if (RocketChat.messageProperties.length(adjustedMessage) > RocketChat.settings.get('Message_MaxAllowedSize')) {
        throw new Meteor.Error('error-message-size-exceeded', 'Message size exceeds Message_MaxAllowedSize', {
          method: 'sendMessage'
        });
      }
    }

    const user = RocketChat.models.Users.findOneById(Meteor.userId(), {
      fields: {
        username: 1,
        name: 1
      }
    });
    const room = Meteor.call('canAccessRoom', message.rid, user._id);

    if (!room) {
      return false;
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(message.rid, Meteor.userId());

    if (subscription && (subscription.blocked || subscription.blocker)) {
      RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
        _id: Random.id(),
        rid: room._id,
        ts: new Date(),
        msg: TAPi18n.__('room_is_blocked', {}, user.language)
      });
      throw new Meteor.Error('You can\'t send messages because you are blocked');
    }

    if ((room.muted || []).includes(user.username)) {
      RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
        _id: Random.id(),
        rid: room._id,
        ts: new Date(),
        msg: TAPi18n.__('You_have_been_muted', {}, user.language)
      });
      throw new Meteor.Error('You can\'t send messages because you have been muted');
    }

    if (message.alias == null && RocketChat.settings.get('Message_SetNameToAliasEnabled')) {
      message.alias = user.name;
    }

    if (Meteor.settings['public'].sandstorm) {
      message.sandstormSessionId = this.connection.sandstormSessionId();
    }

    RocketChat.metrics.messagesSent.inc(); // TODO This line needs to be moved to it's proper place. See the comments on: https://github.com/RocketChat/Rocket.Chat/pull/5736

    return RocketChat.sendMessage(user, message, room);
  }

}); // Limit a user, who does not have the "bot" role, to sending 5 msgs/second

RocketChat.RateLimiter.limitMethod('sendMessage', 5, 1000, {
  userId(userId) {
    return !RocketChat.authz.hasPermission(userId, 'send-many-messages');
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendSMTPTestEmail.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/sendSMTPTestEmail.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  sendSMTPTestEmail() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'sendSMTPTestEmail'
      });
    }

    const user = Meteor.user();

    if (!user.emails && !user.emails[0] && user.emails[0].address) {
      throw new Meteor.Error('error-invalid-email', 'Invalid email', {
        method: 'sendSMTPTestEmail'
      });
    }

    this.unblock();
    const header = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Header') || '');
    const footer = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Footer') || '');
    console.log(`Sending test email to ${user.emails[0].address}`);

    try {
      Email.send({
        to: user.emails[0].address,
        from: RocketChat.settings.get('From_Email'),
        subject: 'SMTP Test Email',
        html: `${header}<p>You have successfully sent an email</p>${footer}`
      });
    } catch ({
      message
    }) {
      throw new Meteor.Error('error-email-send-failed', `Error trying to send email: ${message}`, {
        method: 'sendSMTPTestEmail',
        message
      });
    }

    return {
      message: 'Your_mail_was_sent_to_s',
      params: [user.emails[0].address]
    };
  }

});
DDPRateLimiter.addRule({
  type: 'method',
  name: 'sendSMTPTestEmail',

  userId() {
    return true;
  }

}, 1, 1000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setAdminStatus.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/setAdminStatus.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  setAdminStatus(userId, admin) {
    check(userId, String);
    check(admin, Match.Optional(Boolean));

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'setAdminStatus'
      });
    }

    if (RocketChat.authz.hasPermission(Meteor.userId(), 'assign-admin-role') !== true) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'setAdminStatus'
      });
    }

    const user = Meteor.users.findOne({
      _id: userId
    }, {
      fields: {
        username: 1
      }
    });

    if (admin) {
      return Meteor.call('authorization:addUserToRole', 'admin', user.username);
    } else {
      return Meteor.call('authorization:removeUserFromRole', 'admin', user.username);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setRealName.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/setRealName.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  setRealName(name) {
    check(name, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'setRealName'
      });
    }

    if (!RocketChat.settings.get('Accounts_AllowRealNameChange')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'setRealName'
      });
    }

    if (!RocketChat.setRealName(Meteor.userId(), name)) {
      throw new Meteor.Error('error-could-not-change-name', 'Could not change name', {
        method: 'setRealName'
      });
    }

    return name;
  }

});
RocketChat.RateLimiter.limitMethod('setRealName', 1, 1000, {
  userId: () => true
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setUsername.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/setUsername.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  setUsername(username, param = {}) {
    const {
      joinDefaultChannelsSilenced
    } = param;
    check(username, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'setUsername'
      });
    }

    const user = Meteor.user();

    if (user.username && !RocketChat.settings.get('Accounts_AllowUsernameChange')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'setUsername'
      });
    }

    if (user.username === username || user.username && user.username.toLowerCase() === username.toLowerCase()) {
      return username;
    }

    let nameValidation;

    try {
      nameValidation = new RegExp(`^${RocketChat.settings.get('UTF8_Names_Validation')}$`);
    } catch (error) {
      nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
    }

    if (!nameValidation.test(username)) {
      throw new Meteor.Error('username-invalid', `${_.escape(username)} is not a valid username, use only letters, numbers, dots, hyphens and underscores`);
    }

    if (!RocketChat.checkUsernameAvailability(username)) {
      throw new Meteor.Error('error-field-unavailable', `<strong>${_.escape(username)}</strong> is already in use :(`, {
        method: 'setUsername',
        field: username
      });
    }

    if (!RocketChat.setUsername(user._id, username)) {
      throw new Meteor.Error('error-could-not-change-username', 'Could not change username', {
        method: 'setUsername'
      });
    }

    if (!user.username) {
      Meteor.runAsUser(user._id, () => Meteor.call('joinDefaultChannels', joinDefaultChannelsSilenced));
      Meteor.defer(function () {
        return RocketChat.callbacks.run('afterCreateUser', RocketChat.models.Users.findOneById(user._id));
      });
    }

    return username;
  }

});
RocketChat.RateLimiter.limitMethod('setUsername', 1, 1000, {
  userId() {
    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setEmail.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/setEmail.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  setEmail(email) {
    check(email, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'setEmail'
      });
    }

    const user = Meteor.user();

    if (!RocketChat.settings.get('Accounts_AllowEmailChange')) {
      throw new Meteor.Error('error-action-not-allowed', 'Changing email is not allowed', {
        method: 'setEmail',
        action: 'Changing_email'
      });
    }

    if (user.emails && user.emails[0] && user.emails[0].address === email) {
      return email;
    }

    if (!RocketChat.setEmail(user._id, email)) {
      throw new Meteor.Error('error-could-not-change-email', 'Could not change email', {
        method: 'setEmail'
      });
    }

    return email;
  }

});
RocketChat.RateLimiter.limitMethod('setEmail', 1, 1000, {
  userId()
  /*userId*/
  {
    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unarchiveRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/unarchiveRoom.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  unarchiveRoom(rid) {
    check(rid, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'unarchiveRoom'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'unarchiveRoom'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'unarchive-room', room._id)) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'unarchiveRoom'
      });
    }

    return RocketChat.unarchiveRoom(rid);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unblockUser.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/unblockUser.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  unblockUser({
    rid,
    blocked
  }) {
    check(rid, String);
    check(blocked, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'blockUser'
      });
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, Meteor.userId());
    const subscription2 = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, blocked);

    if (!subscription || !subscription2) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'blockUser'
      });
    }

    RocketChat.models.Subscriptions.unsetBlockedByRoomId(rid, blocked, Meteor.userId());
    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"updateMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/server/methods/updateMessage.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);
Meteor.methods({
  updateMessage(message) {
    check(message, Match.ObjectIncluding({
      _id: String
    }));

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'updateMessage'
      });
    }

    const originalMessage = RocketChat.models.Messages.findOneById(message._id);

    if (!originalMessage || !originalMessage._id) {
      return;
    }

    const hasPermission = RocketChat.authz.hasPermission(Meteor.userId(), 'edit-message', message.rid);
    const editAllowed = RocketChat.settings.get('Message_AllowEditing');
    const editOwn = originalMessage.u && originalMessage.u._id === Meteor.userId();

    if (!hasPermission && (!editAllowed || !editOwn)) {
      throw new Meteor.Error('error-action-not-allowed', 'Message editing not allowed', {
        method: 'updateMessage',
        action: 'Message_editing'
      });
    }

    const blockEditInMinutes = RocketChat.settings.get('Message_AllowEditing_BlockEditInMinutes');

    if (Match.test(blockEditInMinutes, Number) && blockEditInMinutes !== 0) {
      let currentTsDiff;
      let msgTs;

      if (Match.test(originalMessage.ts, Number)) {
        msgTs = moment(originalMessage.ts);
      }

      if (msgTs) {
        currentTsDiff = moment().diff(msgTs, 'minutes');
      }

      if (currentTsDiff > blockEditInMinutes) {
        throw new Meteor.Error('error-message-editing-blocked', 'Message editing is blocked', {
          method: 'updateMessage'
        });
      }
    } // It is possible to have an empty array as the attachments property, so ensure both things exist


    if (originalMessage.attachments && originalMessage.attachments.length > 0 && originalMessage.attachments[0].description !== undefined) {
      message.attachments = originalMessage.attachments;
      message.attachments[0].description = message.msg;
      message.msg = originalMessage.msg;
    }

    message.u = originalMessage.u;
    return RocketChat.updateMessage(message, Meteor.user());
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"startup":{"defaultRoomTypes.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/startup/defaultRoomTypes.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let ConversationRoomType, DirectMessageRoomType, FavoriteRoomType, PrivateRoomType, PublicRoomType, UnreadRoomType;
module.watch(require("../lib/roomTypes"), {
  ConversationRoomType(v) {
    ConversationRoomType = v;
  },

  DirectMessageRoomType(v) {
    DirectMessageRoomType = v;
  },

  FavoriteRoomType(v) {
    FavoriteRoomType = v;
  },

  PrivateRoomType(v) {
    PrivateRoomType = v;
  },

  PublicRoomType(v) {
    PublicRoomType = v;
  },

  UnreadRoomType(v) {
    UnreadRoomType = v;
  }

}, 0);
RocketChat.roomTypes.add(new UnreadRoomType());
RocketChat.roomTypes.add(new FavoriteRoomType());
RocketChat.roomTypes.add(new ConversationRoomType());
RocketChat.roomTypes.add(new PublicRoomType());
RocketChat.roomTypes.add(new PrivateRoomType());
RocketChat.roomTypes.add(new DirectMessageRoomType());
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"rocketchat.info.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_lib/rocketchat.info.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.Info = {
    "version": "0.68.4",
    "build": {
        "date": "2018-08-28T19:30:25.668Z",
        "nodeVersion": "v8.11.3",
        "arch": "x64",
        "platform": "darwin",
        "osRelease": "17.7.0",
        "totalMemory": 17179869184,
        "freeMemory": 185958400,
        "cpus": 8
    },
    "commit": {
        "hash": "6383eaed98464f7670b867f3a07e128d1a9ed47c",
        "date": "Mon Aug 27 13:00:08 2018 -0400",
        "author": "jdesk",
        "subject": "added package-lock",
        "tag": "0.63.0-rc.0",
        "branch": "meteor"
    }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json",
    ".info"
  ]
});
require("/node_modules/meteor/rocketchat:lib/lib/core.js");
require("/node_modules/meteor/rocketchat:lib/lib/settings.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/debug.js");
require("/node_modules/meteor/rocketchat:lib/lib/RoomTypeConfig.js");
require("/node_modules/meteor/rocketchat:lib/lib/roomTypes/conversation.js");
require("/node_modules/meteor/rocketchat:lib/lib/roomTypes/direct.js");
require("/node_modules/meteor/rocketchat:lib/lib/roomTypes/favorite.js");
require("/node_modules/meteor/rocketchat:lib/lib/roomTypes/index.js");
require("/node_modules/meteor/rocketchat:lib/lib/roomTypes/private.js");
require("/node_modules/meteor/rocketchat:lib/lib/roomTypes/public.js");
require("/node_modules/meteor/rocketchat:lib/lib/roomTypes/unread.js");
require("/node_modules/meteor/rocketchat:lib/lib/getURL.js");
require("/node_modules/meteor/rocketchat:lib/lib/callbacks.js");
require("/node_modules/meteor/rocketchat:lib/lib/fileUploadRestrictions.js");
require("/node_modules/meteor/rocketchat:lib/lib/getAvatarColor.js");
require("/node_modules/meteor/rocketchat:lib/lib/getDefaultSubscriptionPref.js");
require("/node_modules/meteor/rocketchat:lib/lib/getValidRoomName.js");
require("/node_modules/meteor/rocketchat:lib/lib/placeholders.js");
require("/node_modules/meteor/rocketchat:lib/lib/promises.js");
require("/node_modules/meteor/rocketchat:lib/lib/RoomTypesCommon.js");
require("/node_modules/meteor/rocketchat:lib/lib/slashCommand.js");
require("/node_modules/meteor/rocketchat:lib/lib/Message.js");
require("/node_modules/meteor/rocketchat:lib/lib/MessageProperties.js");
require("/node_modules/meteor/rocketchat:lib/lib/messageBox.js");
require("/node_modules/meteor/rocketchat:lib/lib/MessageTypes.js");
require("/node_modules/meteor/rocketchat:lib/lib/templateVarHandler.js");
require("/node_modules/meteor/rocketchat:lib/lib/getUserNotificationPreference.js");
require("/node_modules/meteor/rocketchat:lib/lib/getUserPreference.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/bugsnag.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/metrics.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/RateLimiter.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/isDocker.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/addUserToDefaultChannels.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/addUserToRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/archiveRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/checkUsernameAvailability.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/checkEmailAvailability.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/createRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/cleanRoomHistory.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/deleteMessage.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/deleteUser.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/getFullUserData.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/getRoomByNameOrIdWithOptionToJoin.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/loadMessageHistory.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/removeUserFromRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/saveUser.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/saveCustomFields.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/saveCustomFieldsWithoutValidation.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/sendMessage.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/settings.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/setUserAvatar.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/setUsername.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/setRealName.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/setEmail.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/unarchiveRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/updateMessage.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/validateCustomFields.js");
require("/node_modules/meteor/rocketchat:lib/server/functions/Notifications.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/configLogger.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/PushNotification.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/defaultBlockedDomainsList.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/interceptDirectReplyEmails.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/loginErrorMessageOverride.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/notifyUsersOnMessage.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/processDirectEmail.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/roomTypes.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/sendNotificationsOnMessage.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/validateEmailDomain.js");
require("/node_modules/meteor/rocketchat:lib/server/lib/passwordPolicy.js");
require("/node_modules/meteor/rocketchat:lib/server/models/_Base.js");
require("/node_modules/meteor/rocketchat:lib/server/models/Avatars.js");
require("/node_modules/meteor/rocketchat:lib/server/models/Messages.js");
require("/node_modules/meteor/rocketchat:lib/server/models/Reports.js");
require("/node_modules/meteor/rocketchat:lib/server/models/Rooms.js");
require("/node_modules/meteor/rocketchat:lib/server/models/Settings.js");
require("/node_modules/meteor/rocketchat:lib/server/models/Subscriptions.js");
require("/node_modules/meteor/rocketchat:lib/server/models/Uploads.js");
require("/node_modules/meteor/rocketchat:lib/server/models/Users.js");
require("/node_modules/meteor/rocketchat:lib/server/models/ExportOperations.js");
require("/node_modules/meteor/rocketchat:lib/server/models/UserDataFiles.js");
require("/node_modules/meteor/rocketchat:lib/server/oauth/oauth.js");
require("/node_modules/meteor/rocketchat:lib/server/oauth/facebook.js");
require("/node_modules/meteor/rocketchat:lib/server/oauth/twitter.js");
require("/node_modules/meteor/rocketchat:lib/server/oauth/google.js");
require("/node_modules/meteor/rocketchat:lib/server/oauth/proxy.js");
require("/node_modules/meteor/rocketchat:lib/server/startup/statsTracker.js");
require("/node_modules/meteor/rocketchat:lib/server/publications/settings.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/addOAuthService.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/refreshOAuthService.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/addUserToRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/addUsersToRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/archiveRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/blockUser.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/checkRegistrationSecretURL.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/checkUsernameAvailability.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/cleanRoomHistory.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/createChannel.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/createToken.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/createPrivateGroup.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/deleteMessage.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/deleteUserOwnAccount.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/executeSlashCommandPreview.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/filterBadWords.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/filterATAllTag.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/filterATHereTag.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/getChannelHistory.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/getFullUserData.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/getRoomJoinCode.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/getRoomRoles.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/getServerInfo.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/getSingleMessage.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/getSlashCommandPreviews.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/getUserRoles.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/insertOrUpdateUser.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/joinDefaultChannels.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/joinRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/leaveRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/removeOAuthService.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/restartServer.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/robotMethods.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/saveSetting.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/sendInvitationEmail.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/sendMessage.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/sendSMTPTestEmail.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/setAdminStatus.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/setRealName.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/setUsername.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/setEmail.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/unarchiveRoom.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/unblockUser.js");
require("/node_modules/meteor/rocketchat:lib/server/methods/updateMessage.js");
require("/node_modules/meteor/rocketchat:lib/server/startup/settingsOnLoadCdnPrefix.js");
require("/node_modules/meteor/rocketchat:lib/server/startup/settingsOnLoadDirectReply.js");
require("/node_modules/meteor/rocketchat:lib/server/startup/settingsOnLoadSMTP.js");
require("/node_modules/meteor/rocketchat:lib/server/startup/oAuthServicesUpdate.js");
require("/node_modules/meteor/rocketchat:lib/server/startup/settings.js");
require("/node_modules/meteor/rocketchat:lib/lib/startup/settingsOnLoadSiteUrl.js");
require("/node_modules/meteor/rocketchat:lib/startup/defaultRoomTypes.js");
require("/node_modules/meteor/rocketchat:lib/rocketchat.info.js");
var exports = require("/node_modules/meteor/rocketchat:lib/server/lib/index.js");

/* Exports */
Package._define("rocketchat:lib", exports, {
  RocketChat: RocketChat
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_lib.js