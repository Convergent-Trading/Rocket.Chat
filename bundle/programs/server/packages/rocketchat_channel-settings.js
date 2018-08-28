(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var settings;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:channel-settings":{"server":{"functions":{"saveReactWhenReadOnly.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveReactWhenReadOnly.js                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveReactWhenReadOnly = function (rid, allowReact) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveReactWhenReadOnly'
    });
  }

  return RocketChat.models.Rooms.setAllowReactingWhenReadOnlyById(rid, allowReact);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomType.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomType.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomType = function (rid, roomType, user, sendMessage = true) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      'function': 'RocketChat.saveRoomType'
    });
  }

  if (roomType !== 'c' && roomType !== 'p') {
    throw new Meteor.Error('error-invalid-room-type', 'error-invalid-room-type', {
      'function': 'RocketChat.saveRoomType',
      type: roomType
    });
  }

  const room = RocketChat.models.Rooms.findOneById(rid);

  if (room == null) {
    throw new Meteor.Error('error-invalid-room', 'error-invalid-room', {
      'function': 'RocketChat.saveRoomType',
      _id: rid
    });
  }

  if (room.t === 'd') {
    throw new Meteor.Error('error-direct-room', 'Can\'t change type of direct rooms', {
      'function': 'RocketChat.saveRoomType'
    });
  }

  const result = RocketChat.models.Rooms.setTypeById(rid, roomType) && RocketChat.models.Subscriptions.updateTypeByRoomId(rid, roomType);

  if (result && sendMessage) {
    let message;

    if (roomType === 'c') {
      message = TAPi18n.__('Channel', {
        lng: user && user.language || RocketChat.settings.get('language') || 'en'
      });
    } else {
      message = TAPi18n.__('Private_Group', {
        lng: user && user.language || RocketChat.settings.get('language') || 'en'
      });
    }

    RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_privacy', rid, message, user);
  }

  return result;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomTopic.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomTopic.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomTopic = function (rid, roomTopic, user, sendMessage = true) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      'function': 'RocketChat.saveRoomTopic'
    });
  }

  const update = RocketChat.models.Rooms.setTopicById(rid, roomTopic);

  if (update && sendMessage) {
    RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_topic', rid, roomTopic, user);
  }

  return update;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomCustomFields.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomCustomFields.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomCustomFields = function (rid, roomCustomFields) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      'function': 'RocketChat.saveRoomCustomFields'
    });
  }

  if (!Match.test(roomCustomFields, Object)) {
    throw new Meteor.Error('invalid-roomCustomFields-type', 'Invalid roomCustomFields type', {
      'function': 'RocketChat.saveRoomCustomFields'
    });
  }

  const ret = RocketChat.models.Rooms.setCustomFieldsById(rid, roomCustomFields); // Update customFields of any user's Subscription related with this rid

  RocketChat.models.Subscriptions.updateCustomFieldsByRoomId(rid, roomCustomFields);
  return ret;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomAnnouncement.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomAnnouncement.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectWithoutProperties"));

RocketChat.saveRoomAnnouncement = function (rid, roomAnnouncement, user, sendMessage = true) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomAnnouncement'
    });
  }

  let message;
  let announcementDetails;

  if (typeof roomAnnouncement === 'string') {
    message = roomAnnouncement;
  } else {
    var _roomAnnouncement = roomAnnouncement;
    ({
      message
    } = _roomAnnouncement);
    announcementDetails = (0, _objectWithoutProperties2.default)(_roomAnnouncement, ["message"]);
    _roomAnnouncement;
  }

  const updated = RocketChat.models.Rooms.setAnnouncementById(rid, message, announcementDetails);

  if (updated && sendMessage) {
    RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_announcement', rid, message, user);
  }

  return updated;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomName.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomName.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomName = function (rid, displayName, user, sendMessage = true) {
  const room = RocketChat.models.Rooms.findOneById(rid);

  if (RocketChat.roomTypes.roomTypes[room.t].preventRenaming()) {
    throw new Meteor.Error('error-not-allowed', 'Not allowed', {
      'function': 'RocketChat.saveRoomdisplayName'
    });
  }

  if (displayName === room.name) {
    return;
  }

  const slugifiedRoomName = RocketChat.getValidRoomName(displayName, rid);
  const update = RocketChat.models.Rooms.setNameById(rid, slugifiedRoomName, displayName) && RocketChat.models.Subscriptions.updateNameAndAlertByRoomId(rid, slugifiedRoomName, displayName);

  if (update && sendMessage) {
    RocketChat.models.Messages.createRoomRenamedWithRoomIdRoomNameAndUser(rid, displayName, user);
  }

  return displayName;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomReadOnly.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomReadOnly.js                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomReadOnly = function (rid, readOnly) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      'function': 'RocketChat.saveRoomReadOnly'
    });
  }

  return RocketChat.models.Rooms.setReadOnlyById(rid, readOnly);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomDescription.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomDescription.js                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomDescription = function (rid, roomDescription, user) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      'function': 'RocketChat.saveRoomDescription'
    });
  }

  const update = RocketChat.models.Rooms.setDescriptionById(rid, roomDescription);
  RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_description', rid, roomDescription, user);
  return update;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomSystemMessages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomSystemMessages.js                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomSystemMessages = function (rid, systemMessages) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      'function': 'RocketChat.saveRoomSystemMessages'
    });
  }

  return RocketChat.models.Rooms.setSystemMessagesById(rid, systemMessages);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"saveRoomSettings.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/methods/saveRoomSettings.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const fields = ['roomName', 'roomTopic', 'roomAnnouncement', 'roomCustomFields', 'roomDescription', 'roomType', 'readOnly', 'reactWhenReadOnly', 'systemMessages', 'default', 'joinCode', 'tokenpass', 'streamingOptions', 'retentionEnabled', 'retentionMaxAge', 'retentionExcludePinned', 'retentionFilesOnly', 'retentionOverrideGlobal'];
Meteor.methods({
  saveRoomSettings(rid, settings, value) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        'function': 'RocketChat.saveRoomName'
      });
    }

    if (!Match.test(rid, String)) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'saveRoomSettings'
      });
    }

    if (typeof settings !== 'object') {
      settings = {
        [settings]: value
      };
    }

    if (!Object.keys(settings).every(key => fields.includes(key))) {
      throw new Meteor.Error('error-invalid-settings', 'Invalid settings provided', {
        method: 'saveRoomSettings'
      });
    }

    if (!RocketChat.authz.hasPermission(userId, 'edit-room', rid)) {
      throw new Meteor.Error('error-action-not-allowed', 'Editing room is not allowed', {
        method: 'saveRoomSettings',
        action: 'Editing_room'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);

    if (room.broadcast && (settings.readOnly || settings.reactWhenReadOnly)) {
      throw new Meteor.Error('error-action-not-allowed', 'Editing readOnly/reactWhenReadOnly are not allowed for broadcast rooms', {
        method: 'saveRoomSettings',
        action: 'Editing_room'
      });
    }

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'saveRoomSettings'
      });
    }

    const user = Meteor.user(); // validations

    Object.keys(settings).forEach(setting => {
      const value = settings[setting];

      if (settings === 'default' && !RocketChat.authz.hasPermission(userId, 'view-room-administration')) {
        throw new Meteor.Error('error-action-not-allowed', 'Viewing room administration is not allowed', {
          method: 'saveRoomSettings',
          action: 'Viewing_room_administration'
        });
      }

      if (setting === 'roomType' && value !== room.t && value === 'c' && !RocketChat.authz.hasPermission(userId, 'create-c')) {
        throw new Meteor.Error('error-action-not-allowed', 'Changing a private group to a public channel is not allowed', {
          method: 'saveRoomSettings',
          action: 'Change_Room_Type'
        });
      }

      if (setting === 'roomType' && value !== room.t && value === 'p' && !RocketChat.authz.hasPermission(userId, 'create-p')) {
        throw new Meteor.Error('error-action-not-allowed', 'Changing a public channel to a private room is not allowed', {
          method: 'saveRoomSettings',
          action: 'Change_Room_Type'
        });
      }

      if (setting === 'retentionEnabled' && !RocketChat.authz.hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.enabled) {
        throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
          method: 'saveRoomSettings',
          action: 'Editing_room'
        });
      }

      if (setting === 'retentionMaxAge' && !RocketChat.authz.hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.maxAge) {
        throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
          method: 'saveRoomSettings',
          action: 'Editing_room'
        });
      }

      if (setting === 'retentionExcludePinned' && !RocketChat.authz.hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.excludePinned) {
        throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
          method: 'saveRoomSettings',
          action: 'Editing_room'
        });
      }

      if (setting === 'retentionFilesOnly' && !RocketChat.authz.hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.filesOnly) {
        throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
          method: 'saveRoomSettings',
          action: 'Editing_room'
        });
      }

      if (setting === 'retentionOverrideGlobal') {
        delete settings.retentionMaxAge;
        delete settings.retentionExcludePinned;
        delete settings.retentionFilesOnly;
      }
    });
    Object.keys(settings).forEach(setting => {
      const value = settings[setting];

      switch (setting) {
        case 'roomName':
          RocketChat.saveRoomName(rid, value, user);
          break;

        case 'roomTopic':
          if (value !== room.topic) {
            RocketChat.saveRoomTopic(rid, value, user);
          }

          break;

        case 'roomAnnouncement':
          if (value !== room.announcement) {
            RocketChat.saveRoomAnnouncement(rid, value, user);
          }

          break;

        case 'roomCustomFields':
          if (value !== room.customFields) {
            RocketChat.saveRoomCustomFields(rid, value);
          }

          break;

        case 'roomDescription':
          if (value !== room.description) {
            RocketChat.saveRoomDescription(rid, value, user);
          }

          break;

        case 'roomType':
          if (value !== room.t) {
            RocketChat.saveRoomType(rid, value, user);
          }

          break;

        case 'tokenpass':
          check(value, {
            require: String,
            tokens: [{
              token: String,
              balance: String
            }]
          });
          RocketChat.saveRoomTokenpass(rid, value);
          break;

        case 'streamingOptions':
          RocketChat.saveStreamingOptions(rid, value);
          break;

        case 'readOnly':
          if (value !== room.ro) {
            RocketChat.saveRoomReadOnly(rid, value, user);
          }

          break;

        case 'reactWhenReadOnly':
          if (value !== room.reactWhenReadOnly) {
            RocketChat.saveReactWhenReadOnly(rid, value, user);
          }

          break;

        case 'systemMessages':
          if (value !== room.sysMes) {
            RocketChat.saveRoomSystemMessages(rid, value, user);
          }

          break;

        case 'joinCode':
          RocketChat.models.Rooms.setJoinCodeById(rid, String(value));
          break;

        case 'default':
          RocketChat.models.Rooms.saveDefaultById(rid, value);
          break;

        case 'retentionEnabled':
          RocketChat.models.Rooms.saveRetentionEnabledById(rid, value);
          break;

        case 'retentionMaxAge':
          RocketChat.models.Rooms.saveRetentionMaxAgeById(rid, value);
          break;

        case 'retentionExcludePinned':
          RocketChat.models.Rooms.saveRetentionExcludePinnedById(rid, value);
          break;

        case 'retentionFilesOnly':
          RocketChat.models.Rooms.saveRetentionFilesOnlyById(rid, value);
          break;

        case 'retentionOverrideGlobal':
          RocketChat.models.Rooms.saveRetentionOverrideGlobalById(rid, value);
          break;
      }
    });
    return {
      result: true,
      rid: room._id
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"Messages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/models/Messages.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser = function (type, roomId, message, user, extraData) {
  return this.createWithTypeRoomIdMessageAndUser(type, roomId, message, user, extraData);
};

RocketChat.models.Messages.createRoomRenamedWithRoomIdRoomNameAndUser = function (roomId, roomName, user, extraData) {
  return this.createWithTypeRoomIdMessageAndUser('r', roomId, roomName, user, extraData);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Rooms.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/models/Rooms.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.models.Rooms.setDescriptionById = function (_id, description) {
  const query = {
    _id
  };
  const update = {
    $set: {
      description
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.setReadOnlyById = function (_id, readOnly) {
  const query = {
    _id
  };
  const update = {
    $set: {
      ro: readOnly,
      muted: []
    }
  };

  if (readOnly) {
    RocketChat.models.Subscriptions.findByRoomIdWhenUsernameExists(_id, {
      fields: {
        'u._id': 1,
        'u.username': 1
      }
    }).forEach(function ({
      u: user
    }) {
      if (RocketChat.authz.hasPermission(user._id, 'post-readonly')) {
        return;
      }

      return update.$set.muted.push(user.username);
    });
  } else {
    update.$unset = {
      muted: ''
    };
  }

  if (update.$set.muted.length === 0) {
    delete update.$set.muted;
  }

  return this.update(query, update);
};

RocketChat.models.Rooms.setAllowReactingWhenReadOnlyById = function (_id, allowReacting) {
  const query = {
    _id
  };
  const update = {
    $set: {
      reactWhenReadOnly: allowReacting
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.setSystemMessagesById = function (_id, systemMessages) {
  const query = {
    _id
  };
  const update = {
    $set: {
      sysMes: systemMessages
    }
  };
  return this.update(query, update);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/startup.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.startup(function () {
  RocketChat.models.Permissions.upsert('post-readonly', {
    $setOnInsert: {
      roles: ['admin', 'owner', 'moderator']
    }
  });
  RocketChat.models.Permissions.upsert('set-readonly', {
    $setOnInsert: {
      roles: ['admin', 'owner']
    }
  });
  RocketChat.models.Permissions.upsert('set-react-when-readonly', {
    $setOnInsert: {
      roles: ['admin', 'owner']
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveReactWhenReadOnly.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomType.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomTopic.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomCustomFields.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomAnnouncement.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomName.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomReadOnly.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomDescription.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomSystemMessages.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/methods/saveRoomSettings.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/models/Messages.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/models/Rooms.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/startup.js");

/* Exports */
Package._define("rocketchat:channel-settings");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_channel-settings.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzL3NlcnZlci9mdW5jdGlvbnMvc2F2ZVJlYWN0V2hlblJlYWRPbmx5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y2hhbm5lbC1zZXR0aW5ncy9zZXJ2ZXIvZnVuY3Rpb25zL3NhdmVSb29tVG9waWMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y2hhbm5lbC1zZXR0aW5ncy9zZXJ2ZXIvZnVuY3Rpb25zL3NhdmVSb29tQ3VzdG9tRmllbGRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbUFubm91bmNlbWVudC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzL3NlcnZlci9mdW5jdGlvbnMvc2F2ZVJvb21OYW1lLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVJlYWRPbmx5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbURlc2NyaXB0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVN5c3RlbU1lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL21ldGhvZHMvc2F2ZVJvb21TZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzL3NlcnZlci9tb2RlbHMvTWVzc2FnZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y2hhbm5lbC1zZXR0aW5ncy9zZXJ2ZXIvbW9kZWxzL1Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL3N0YXJ0dXAuanMiXSwibmFtZXMiOlsiUm9ja2V0Q2hhdCIsInNhdmVSZWFjdFdoZW5SZWFkT25seSIsInJpZCIsImFsbG93UmVhY3QiLCJNYXRjaCIsInRlc3QiLCJTdHJpbmciLCJNZXRlb3IiLCJFcnJvciIsImZ1bmN0aW9uIiwibW9kZWxzIiwiUm9vbXMiLCJzZXRBbGxvd1JlYWN0aW5nV2hlblJlYWRPbmx5QnlJZCIsInNhdmVSb29tVHlwZSIsInJvb21UeXBlIiwidXNlciIsInNlbmRNZXNzYWdlIiwidHlwZSIsInJvb20iLCJmaW5kT25lQnlJZCIsIl9pZCIsInQiLCJyZXN1bHQiLCJzZXRUeXBlQnlJZCIsIlN1YnNjcmlwdGlvbnMiLCJ1cGRhdGVUeXBlQnlSb29tSWQiLCJtZXNzYWdlIiwiVEFQaTE4biIsIl9fIiwibG5nIiwibGFuZ3VhZ2UiLCJzZXR0aW5ncyIsImdldCIsIk1lc3NhZ2VzIiwiY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIiLCJzYXZlUm9vbVRvcGljIiwicm9vbVRvcGljIiwidXBkYXRlIiwic2V0VG9waWNCeUlkIiwic2F2ZVJvb21DdXN0b21GaWVsZHMiLCJyb29tQ3VzdG9tRmllbGRzIiwiT2JqZWN0IiwicmV0Iiwic2V0Q3VzdG9tRmllbGRzQnlJZCIsInVwZGF0ZUN1c3RvbUZpZWxkc0J5Um9vbUlkIiwic2F2ZVJvb21Bbm5vdW5jZW1lbnQiLCJyb29tQW5ub3VuY2VtZW50IiwiYW5ub3VuY2VtZW50RGV0YWlscyIsInVwZGF0ZWQiLCJzZXRBbm5vdW5jZW1lbnRCeUlkIiwic2F2ZVJvb21OYW1lIiwiZGlzcGxheU5hbWUiLCJyb29tVHlwZXMiLCJwcmV2ZW50UmVuYW1pbmciLCJuYW1lIiwic2x1Z2lmaWVkUm9vbU5hbWUiLCJnZXRWYWxpZFJvb21OYW1lIiwic2V0TmFtZUJ5SWQiLCJ1cGRhdGVOYW1lQW5kQWxlcnRCeVJvb21JZCIsImNyZWF0ZVJvb21SZW5hbWVkV2l0aFJvb21JZFJvb21OYW1lQW5kVXNlciIsInNhdmVSb29tUmVhZE9ubHkiLCJyZWFkT25seSIsInNldFJlYWRPbmx5QnlJZCIsInNhdmVSb29tRGVzY3JpcHRpb24iLCJyb29tRGVzY3JpcHRpb24iLCJzZXREZXNjcmlwdGlvbkJ5SWQiLCJzYXZlUm9vbVN5c3RlbU1lc3NhZ2VzIiwic3lzdGVtTWVzc2FnZXMiLCJzZXRTeXN0ZW1NZXNzYWdlc0J5SWQiLCJmaWVsZHMiLCJtZXRob2RzIiwic2F2ZVJvb21TZXR0aW5ncyIsInZhbHVlIiwidXNlcklkIiwibWV0aG9kIiwia2V5cyIsImV2ZXJ5Iiwia2V5IiwiaW5jbHVkZXMiLCJhdXRoeiIsImhhc1Blcm1pc3Npb24iLCJhY3Rpb24iLCJicm9hZGNhc3QiLCJyZWFjdFdoZW5SZWFkT25seSIsImZvckVhY2giLCJzZXR0aW5nIiwicmV0ZW50aW9uIiwiZW5hYmxlZCIsIm1heEFnZSIsImV4Y2x1ZGVQaW5uZWQiLCJmaWxlc09ubHkiLCJyZXRlbnRpb25NYXhBZ2UiLCJyZXRlbnRpb25FeGNsdWRlUGlubmVkIiwicmV0ZW50aW9uRmlsZXNPbmx5IiwidG9waWMiLCJhbm5vdW5jZW1lbnQiLCJjdXN0b21GaWVsZHMiLCJkZXNjcmlwdGlvbiIsImNoZWNrIiwicmVxdWlyZSIsInRva2VucyIsInRva2VuIiwiYmFsYW5jZSIsInNhdmVSb29tVG9rZW5wYXNzIiwic2F2ZVN0cmVhbWluZ09wdGlvbnMiLCJybyIsInN5c01lcyIsInNldEpvaW5Db2RlQnlJZCIsInNhdmVEZWZhdWx0QnlJZCIsInNhdmVSZXRlbnRpb25FbmFibGVkQnlJZCIsInNhdmVSZXRlbnRpb25NYXhBZ2VCeUlkIiwic2F2ZVJldGVudGlvbkV4Y2x1ZGVQaW5uZWRCeUlkIiwic2F2ZVJldGVudGlvbkZpbGVzT25seUJ5SWQiLCJzYXZlUmV0ZW50aW9uT3ZlcnJpZGVHbG9iYWxCeUlkIiwicm9vbUlkIiwiZXh0cmFEYXRhIiwiY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsInJvb21OYW1lIiwicXVlcnkiLCIkc2V0IiwibXV0ZWQiLCJmaW5kQnlSb29tSWRXaGVuVXNlcm5hbWVFeGlzdHMiLCJ1IiwicHVzaCIsInVzZXJuYW1lIiwiJHVuc2V0IiwibGVuZ3RoIiwiYWxsb3dSZWFjdGluZyIsInN0YXJ0dXAiLCJQZXJtaXNzaW9ucyIsInVwc2VydCIsIiRzZXRPbkluc2VydCIsInJvbGVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLFdBQVdDLHFCQUFYLEdBQW1DLFVBQVNDLEdBQVQsRUFBY0MsVUFBZCxFQUEwQjtBQUM1RCxNQUFJLENBQUNDLE1BQU1DLElBQU4sQ0FBV0gsR0FBWCxFQUFnQkksTUFBaEIsQ0FBTCxFQUE4QjtBQUM3QixVQUFNLElBQUlDLE9BQU9DLEtBQVgsQ0FBaUIsY0FBakIsRUFBaUMsY0FBakMsRUFBaUQ7QUFBRUMsZ0JBQVU7QUFBWixLQUFqRCxDQUFOO0FBQ0E7O0FBRUQsU0FBT1QsV0FBV1UsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JDLGdDQUF4QixDQUF5RFYsR0FBekQsRUFBOERDLFVBQTlELENBQVA7QUFDQSxDQU5ELEM7Ozs7Ozs7Ozs7O0FDQ0FILFdBQVdhLFlBQVgsR0FBMEIsVUFBU1gsR0FBVCxFQUFjWSxRQUFkLEVBQXdCQyxJQUF4QixFQUE4QkMsY0FBYyxJQUE1QyxFQUFrRDtBQUMzRSxNQUFJLENBQUNaLE1BQU1DLElB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QUFmO0FBS0EsU0FBTyxLQUFLMUYsTUFBTCxDQUFZaUYsS0FBWixFQUFtQmpGLE1BQW5CLENBQVA7QUFDQSxDQVZEOztBQVlBckMsV0FBV1UsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0J5RCxxQkFBeEIsR0FBZ0QsVUFBU2hELEdBQVQsRUFBYytDLGNBQWQsRUFBOEI7QUFDN0UsUUFBTW1ELFFBQVE7QUFDYmxHO0FBRGEsR0FBZDtBQUdBLFFBQU1pQixTQUFTO0FBQ2RrRixVQUFNO0FBQ0xiLGNBQVF2QztBQURIO0FBRFEsR0FBZjtBQUtBLFNBQU8sS0FBSzlCLE1BQUwsQ0FBWWlGLEtBQVosRUFBbUJqRixNQUFuQixDQUFQO0FBQ0EsQ0FWRCxDOzs7Ozs7Ozs7OztBQ3REQTlCLE9BQU95SCxPQUFQLENBQWUsWUFBVztBQUN6QmhJLGFBQVdVLE1BQVgsQ0FBa0J1SCxXQUFsQixDQUE4QkMsTUFBOUIsQ0FBcUMsZUFBckMsRUFBc0Q7QUFBQ0Msa0JBQWM7QUFBRUMsYUFBTyxDQUFDLE9BQUQsRUFBVSxPQUFWLEVBQW1CLFdBQW5CO0FBQVQ7QUFBZixHQUF0RDtBQUNBcEksYUFBV1UsTUFBWCxDQUFrQnVILFdBQWxCLENBQThCQyxNQUE5QixDQUFxQyxjQUFyQyxFQUFxRDtBQUFDQyxrQkFBYztBQUFFQyxhQUFPLENBQUMsT0FBRCxFQUFVLE9BQVY7QUFBVDtBQUFmLEdBQXJEO0FBQ0FwSSxhQUFXVSxNQUFYLENBQWtCdUgsV0FBbEIsQ0FBOEJDLE1BQTlCLENBQXFDLHlCQUFyQyxFQUFnRTtBQUFDQyxrQkFBYztBQUFFQyxhQUFPLENBQUMsT0FBRCxFQUFVLE9BQVY7QUFBVDtBQUFmLEdBQWhFO0FBQ0EsQ0FKRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2NoYW5uZWwtc2V0dGluZ3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJSb2NrZXRDaGF0LnNhdmVSZWFjdFdoZW5SZWFkT25seSA9IGZ1bmN0aW9uKHJpZCwgYWxsb3dSZWFjdCkge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHsgZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSZWFjdFdoZW5SZWFkT25seScgfSk7XG5cdH1cblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0QWxsb3dSZWFjdGluZ1doZW5SZWFkT25seUJ5SWQocmlkLCBhbGxvd1JlYWN0KTtcbn07XG4iLCJcblJvY2tldENoYXQuc2F2ZVJvb21UeXBlID0gZnVuY3Rpb24ocmlkLCByb29tVHlwZSwgdXNlciwgc2VuZE1lc3NhZ2UgPSB0cnVlKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0J2Z1bmN0aW9uJzogJ1JvY2tldENoYXQuc2F2ZVJvb21UeXBlJ1xuXHRcdH0pO1xuXHR9XG5cdGlmIChyb29tVHlwZSAhPT0gJ2MnICYmIHJvb21UeXBlICE9PSAncCcpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20tdHlwZScsICdlcnJvci1pbnZhbGlkLXJvb20tdHlwZScsIHtcblx0XHRcdCdmdW5jdGlvbic6ICdSb2NrZXRDaGF0LnNhdmVSb29tVHlwZScsXG5cdFx0XHR0eXBlOiByb29tVHlwZVxuXHRcdH0pO1xuXHR9XG5cdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyaWQpO1xuXHRpZiAocm9vbSA9PSBudWxsKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ2Vycm9yLWludmFsaWQtcm9vbScsIHtcblx0XHRcdCdmdW5jdGlvbic6ICdSb2NrZXRDaGF0LnNhdmVSb29tVHlwZScsXG5cdFx0XHRfaWQ6IHJpZFxuXHRcdH0pO1xuXHR9XG5cdGlmIChyb29tLnQgPT09ICdkJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWRpcmVjdC1yb29tJywgJ0NhblxcJ3QgY2hhbmdlIHR5cGUgb2YgZGlyZWN0IHJvb21zJywge1xuXHRcdFx0J2Z1bmN0aW9uJzogJ1JvY2tldENoYXQuc2F2ZVJvb21UeXBlJ1xuXHRcdH0pO1xuXHR9XG5cdGNvbnN0IHJlc3VsdCA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldFR5cGVCeUlkKHJpZCwgcm9vbVR5cGUpICYmIFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlVHlwZUJ5Um9vbUlkKHJpZCwgcm9vbVR5cGUpO1xuXHRpZiAocmVzdWx0ICYmIHNlbmRNZXNzYWdlKSB7XG5cdFx0bGV0IG1lc3NhZ2U7XG5cdFx0aWYgKHJvb21UeXBlID09PSAnYycpIHtcblx0XHRcdG1lc3NhZ2UgPSBUQVBpMThuLl9fKCdDaGFubmVsJywge1xuXHRcdFx0XHRsbmc6IHVzZXIgJiYgdXNlci5sYW5ndWFnZSB8fCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnbGFuZ3VhZ2UnKSB8fCAnZW4nXG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWVzc2FnZSA9IFRBUGkxOG4uX18oJ1ByaXZhdGVfR3JvdXAnLCB7XG5cdFx0XHRcdGxuZzogdXNlciAmJiB1c2VyLmxhbmd1YWdlIHx8IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdsYW5ndWFnZScpIHx8ICdlbidcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVSb29tU2V0dGluZ3NDaGFuZ2VkV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcigncm9vbV9jaGFuZ2VkX3ByaXZhY3knLCByaWQsIG1lc3NhZ2UsIHVzZXIpO1xuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59O1xuIiwiUm9ja2V0Q2hhdC5zYXZlUm9vbVRvcGljID0gZnVuY3Rpb24ocmlkLCByb29tVG9waWMsIHVzZXIsIHNlbmRNZXNzYWdlID0gdHJ1ZSkge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdCdmdW5jdGlvbic6ICdSb2NrZXRDaGF0LnNhdmVSb29tVG9waWMnXG5cdFx0fSk7XG5cdH1cblxuXHRjb25zdCB1cGRhdGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRUb3BpY0J5SWQocmlkLCByb29tVG9waWMpO1xuXHRpZiAodXBkYXRlICYmIHNlbmRNZXNzYWdlKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoJ3Jvb21fY2hhbmdlZF90b3BpYycsIHJpZCwgcm9vbVRvcGljLCB1c2VyKTtcblx0fVxuXHRyZXR1cm4gdXBkYXRlO1xufTtcbiIsIlJvY2tldENoYXQuc2F2ZVJvb21DdXN0b21GaWVsZHMgPSBmdW5jdGlvbihyaWQsIHJvb21DdXN0b21GaWVsZHMpIHtcblx0aWYgKCFNYXRjaC50ZXN0KHJpZCwgU3RyaW5nKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7XG5cdFx0XHQnZnVuY3Rpb24nOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbUN1c3RvbUZpZWxkcydcblx0XHR9KTtcblx0fVxuXHRpZiAoIU1hdGNoLnRlc3Qocm9vbUN1c3RvbUZpZWxkcywgT2JqZWN0KSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbUN1c3RvbUZpZWxkcy10eXBlJywgJ0ludmFsaWQgcm9vbUN1c3RvbUZpZWxkcyB0eXBlJywge1xuXHRcdFx0J2Z1bmN0aW9uJzogJ1JvY2tldENoYXQuc2F2ZVJvb21DdXN0b21GaWVsZHMnXG5cdFx0fSk7XG5cdH1cblx0Y29uc3QgcmV0ID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0Q3VzdG9tRmllbGRzQnlJZChyaWQsIHJvb21DdXN0b21GaWVsZHMpO1xuXG5cdC8vIFVwZGF0ZSBjdXN0b21GaWVsZHMgb2YgYW55IHVzZXIncyBTdWJzY3JpcHRpb24gcmVsYXRlZCB3aXRoIHRoaXMgcmlkXG5cdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlQ3VzdG9tRmllbGRzQnlSb29tSWQocmlkLCByb29tQ3VzdG9tRmllbGRzKTtcblxuXHRyZXR1cm4gcmV0O1xufTtcbiIsIlJvY2tldENoYXQuc2F2ZVJvb21Bbm5vdW5jZW1lbnQgPSBmdW5jdGlvbihyaWQsIHJvb21Bbm5vdW5jZW1lbnQsIHVzZXIsIHNlbmRNZXNzYWdlPXRydWUpIHtcblx0aWYgKCFNYXRjaC50ZXN0KHJpZCwgU3RyaW5nKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7IGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbUFubm91bmNlbWVudCcgfSk7XG5cdH1cblxuXHRsZXQgbWVzc2FnZTtcblx0bGV0IGFubm91bmNlbWVudERldGFpbHM7XG5cdGlmICh0eXBlb2Ygcm9vbUFubm91bmNlbWVudCA9PT0gJ3N0cmluZycpIHtcblx0XHRtZXNzYWdlID0gcm9vbUFubm91bmNlbWVudDtcblx0fSBlbHNlIHtcblx0XHQoe21lc3NhZ2UsIC4uLmFubm91bmNlbWVudERldGFpbHN9ID0gcm9vbUFubm91bmNlbWVudCk7XG5cdH1cblxuXHRjb25zdCB1cGRhdGVkID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0QW5ub3VuY2VtZW50QnlJZChyaWQsIG1lc3NhZ2UsIGFubm91bmNlbWVudERldGFpbHMpO1xuXHRpZiAodXBkYXRlZCAmJiBzZW5kTWVzc2FnZSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfYW5ub3VuY2VtZW50JywgcmlkLCBtZXNzYWdlLCB1c2VyKTtcblx0fVxuXG5cdHJldHVybiB1cGRhdGVkO1xufTtcbiIsIlxuUm9ja2V0Q2hhdC5zYXZlUm9vbU5hbWUgPSBmdW5jdGlvbihyaWQsIGRpc3BsYXlOYW1lLCB1c2VyLCBzZW5kTWVzc2FnZSA9IHRydWUpIHtcblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJpZCk7XG5cdGlmIChSb2NrZXRDaGF0LnJvb21UeXBlcy5yb29tVHlwZXNbcm9vbS50XS5wcmV2ZW50UmVuYW1pbmcoKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywge1xuXHRcdFx0J2Z1bmN0aW9uJzogJ1JvY2tldENoYXQuc2F2ZVJvb21kaXNwbGF5TmFtZSdcblx0XHR9KTtcblx0fVxuXHRpZiAoZGlzcGxheU5hbWUgPT09IHJvb20ubmFtZSkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IHNsdWdpZmllZFJvb21OYW1lID0gUm9ja2V0Q2hhdC5nZXRWYWxpZFJvb21OYW1lKGRpc3BsYXlOYW1lLCByaWQpO1xuXG5cdGNvbnN0IHVwZGF0ZSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldE5hbWVCeUlkKHJpZCwgc2x1Z2lmaWVkUm9vbU5hbWUsIGRpc3BsYXlOYW1lKSAmJiBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZU5hbWVBbmRBbGVydEJ5Um9vbUlkKHJpZCwgc2x1Z2lmaWVkUm9vbU5hbWUsIGRpc3BsYXlOYW1lKTtcblxuXHRpZiAodXBkYXRlICYmIHNlbmRNZXNzYWdlKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVJlbmFtZWRXaXRoUm9vbUlkUm9vbU5hbWVBbmRVc2VyKHJpZCwgZGlzcGxheU5hbWUsIHVzZXIpO1xuXHR9XG5cdHJldHVybiBkaXNwbGF5TmFtZTtcbn07XG4iLCJSb2NrZXRDaGF0LnNhdmVSb29tUmVhZE9ubHkgPSBmdW5jdGlvbihyaWQsIHJlYWRPbmx5KSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0J2Z1bmN0aW9uJzogJ1JvY2tldENoYXQuc2F2ZVJvb21SZWFkT25seSdcblx0XHR9KTtcblx0fVxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0UmVhZE9ubHlCeUlkKHJpZCwgcmVhZE9ubHkpO1xufTtcbiIsIlJvY2tldENoYXQuc2F2ZVJvb21EZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKHJpZCwgcm9vbURlc2NyaXB0aW9uLCB1c2VyKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0J2Z1bmN0aW9uJzogJ1JvY2tldENoYXQuc2F2ZVJvb21EZXNjcmlwdGlvbidcblx0XHR9KTtcblx0fVxuXG5cdGNvbnN0IHVwZGF0ZSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldERlc2NyaXB0aW9uQnlJZChyaWQsIHJvb21EZXNjcmlwdGlvbik7XG5cdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfZGVzY3JpcHRpb24nLCByaWQsIHJvb21EZXNjcmlwdGlvbiwgdXNlcik7XG5cdHJldHVybiB1cGRhdGU7XG59O1xuIiwiUm9ja2V0Q2hhdC5zYXZlUm9vbVN5c3RlbU1lc3NhZ2VzID0gZnVuY3Rpb24ocmlkLCBzeXN0ZW1NZXNzYWdlcykge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdCdmdW5jdGlvbic6ICdSb2NrZXRDaGF0LnNhdmVSb29tU3lzdGVtTWVzc2FnZXMnXG5cdFx0fSk7XG5cdH1cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldFN5c3RlbU1lc3NhZ2VzQnlJZChyaWQsIHN5c3RlbU1lc3NhZ2VzKTtcbn07XG4iLCJjb25zdCBmaWVsZHMgPSBbJ3Jvb21OYW1lJywgJ3Jvb21Ub3BpYycsICdyb29tQW5ub3VuY2VtZW50JywgJ3Jvb21DdXN0b21GaWVsZHMnLCAncm9vbURlc2NyaXB0aW9uJywgJ3Jvb21UeXBlJywgJ3JlYWRPbmx5JywgJ3JlYWN0V2hlblJlYWRPbmx5JywgJ3N5c3RlbU1lc3NhZ2VzJywgJ2RlZmF1bHQnLCAnam9pbkNvZGUnLCAndG9rZW5wYXNzJywgJ3N0cmVhbWluZ09wdGlvbnMnLCAncmV0ZW50aW9uRW5hYmxlZCcsICdyZXRlbnRpb25NYXhBZ2UnLCAncmV0ZW50aW9uRXhjbHVkZVBpbm5lZCcsICdyZXRlbnRpb25GaWxlc09ubHknLCAncmV0ZW50aW9uT3ZlcnJpZGVHbG9iYWwnXTtcbk1ldGVvci5tZXRob2RzKHtcblx0c2F2ZVJvb21TZXR0aW5ncyhyaWQsIHNldHRpbmdzLCB2YWx1ZSkge1xuXHRcdGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblxuXHRcdGlmICghdXNlcklkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHQnZnVuY3Rpb24nOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbU5hbWUnXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0aWYgKCFNYXRjaC50ZXN0KHJpZCwgU3RyaW5nKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncydcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2Ygc2V0dGluZ3MgIT09ICdvYmplY3QnKSB7XG5cdFx0XHRzZXR0aW5ncyA9IHtcblx0XHRcdFx0W3NldHRpbmdzXSA6IHZhbHVlXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICghT2JqZWN0LmtleXMoc2V0dGluZ3MpLmV2ZXJ5KGtleSA9PiBmaWVsZHMuaW5jbHVkZXMoa2V5KSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtc2V0dGluZ3MnLCAnSW52YWxpZCBzZXR0aW5ncyBwcm92aWRlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncydcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXJJZCwgJ2VkaXQtcm9vbScsIHJpZCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdFZGl0aW5nIHJvb20gaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRhY3Rpb246ICdFZGl0aW5nX3Jvb20nXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblxuXHRcdGlmIChyb29tLmJyb2FkY2FzdCAmJiAoc2V0dGluZ3MucmVhZE9ubHkgfHwgc2V0dGluZ3MucmVhY3RXaGVuUmVhZE9ubHkpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnRWRpdGluZyByZWFkT25seS9yZWFjdFdoZW5SZWFkT25seSBhcmUgbm90IGFsbG93ZWQgZm9yIGJyb2FkY2FzdCByb29tcycsIHtcblx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncycsXG5cdFx0XHRcdGFjdGlvbjogJ0VkaXRpbmdfcm9vbSdcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncydcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0Ly8gdmFsaWRhdGlvbnNcblxuXHRcdE9iamVjdC5rZXlzKHNldHRpbmdzKS5mb3JFYWNoKHNldHRpbmcgPT4ge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSBzZXR0aW5nc1tzZXR0aW5nXTtcblx0XHRcdGlmIChzZXR0aW5ncyA9PT0gJ2RlZmF1bHQnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJykpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ1ZpZXdpbmcgcm9vbSBhZG1pbmlzdHJhdGlvbiBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdFx0XHRhY3Rpb246ICdWaWV3aW5nX3Jvb21fYWRtaW5pc3RyYXRpb24nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdyb29tVHlwZScgJiYgdmFsdWUgIT09IHJvb20udCAmJiB2YWx1ZSA9PT0gJ2MnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnY3JlYXRlLWMnKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnQ2hhbmdpbmcgYSBwcml2YXRlIGdyb3VwIHRvIGEgcHVibGljIGNoYW5uZWwgaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncycsXG5cdFx0XHRcdFx0YWN0aW9uOiAnQ2hhbmdlX1Jvb21fVHlwZSdcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc2V0dGluZyA9PT0gJ3Jvb21UeXBlJyAmJiB2YWx1ZSAhPT0gcm9vbS50ICYmIHZhbHVlID09PSAncCcgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VySWQsICdjcmVhdGUtcCcpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdDaGFuZ2luZyBhIHB1YmxpYyBjaGFubmVsIHRvIGEgcHJpdmF0ZSByb29tIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ0NoYW5nZV9Sb29tX1R5cGUnXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoc2V0dGluZyA9PT0gJ3JldGVudGlvbkVuYWJsZWQnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnZWRpdC1yb29tLXJldGVudGlvbi1wb2xpY3knLCByaWQpICYmIHZhbHVlICE9PSByb29tLnJldGVudGlvbi5lbmFibGVkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdFZGl0aW5nIHJvb20gcmV0ZW50aW9uIHBvbGljeSBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdFx0XHRhY3Rpb246ICdFZGl0aW5nX3Jvb20nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdyZXRlbnRpb25NYXhBZ2UnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnZWRpdC1yb29tLXJldGVudGlvbi1wb2xpY3knLCByaWQpICYmIHZhbHVlICE9PSByb29tLnJldGVudGlvbi5tYXhBZ2UpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0VkaXRpbmcgcm9vbSByZXRlbnRpb24gcG9saWN5IGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ0VkaXRpbmdfcm9vbSdcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc2V0dGluZyA9PT0gJ3JldGVudGlvbkV4Y2x1ZGVQaW5uZWQnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnZWRpdC1yb29tLXJldGVudGlvbi1wb2xpY3knLCByaWQpICYmIHZhbHVlICE9PSByb29tLnJldGVudGlvbi5leGNsdWRlUGlubmVkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdFZGl0aW5nIHJvb20gcmV0ZW50aW9uIHBvbGljeSBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdFx0XHRhY3Rpb246ICdFZGl0aW5nX3Jvb20nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdyZXRlbnRpb25GaWxlc09ubHknICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnZWRpdC1yb29tLXJldGVudGlvbi1wb2xpY3knLCByaWQpICYmIHZhbHVlICE9PSByb29tLnJldGVudGlvbi5maWxlc09ubHkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0VkaXRpbmcgcm9vbSByZXRlbnRpb24gcG9saWN5IGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ0VkaXRpbmdfcm9vbSdcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc2V0dGluZyA9PT0gJ3JldGVudGlvbk92ZXJyaWRlR2xvYmFsJykge1xuXHRcdFx0XHRkZWxldGUgc2V0dGluZ3MucmV0ZW50aW9uTWF4QWdlO1xuXHRcdFx0XHRkZWxldGUgc2V0dGluZ3MucmV0ZW50aW9uRXhjbHVkZVBpbm5lZDtcblx0XHRcdFx0ZGVsZXRlIHNldHRpbmdzLnJldGVudGlvbkZpbGVzT25seTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdE9iamVjdC5rZXlzKHNldHRpbmdzKS5mb3JFYWNoKHNldHRpbmcgPT4ge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSBzZXR0aW5nc1tzZXR0aW5nXTtcblx0XHRcdHN3aXRjaCAoc2V0dGluZykge1xuXHRcdFx0XHRjYXNlICdyb29tTmFtZSc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlUm9vbU5hbWUocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3Jvb21Ub3BpYyc6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLnRvcGljKSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tVG9waWMocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyb29tQW5ub3VuY2VtZW50Jzpcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHJvb20uYW5ub3VuY2VtZW50KSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tQW5ub3VuY2VtZW50KHJpZCwgdmFsdWUsIHVzZXIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncm9vbUN1c3RvbUZpZWxkcyc6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLmN1c3RvbUZpZWxkcykge1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlUm9vbUN1c3RvbUZpZWxkcyhyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3Jvb21EZXNjcmlwdGlvbic6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLmRlc2NyaXB0aW9uKSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tRGVzY3JpcHRpb24ocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyb29tVHlwZSc6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLnQpIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21UeXBlKHJpZCwgdmFsdWUsIHVzZXIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAndG9rZW5wYXNzJzpcblx0XHRcdFx0XHRjaGVjayh2YWx1ZSwge1xuXHRcdFx0XHRcdFx0cmVxdWlyZTogU3RyaW5nLFxuXHRcdFx0XHRcdFx0dG9rZW5zOiBbe1xuXHRcdFx0XHRcdFx0XHR0b2tlbjogU3RyaW5nLFxuXHRcdFx0XHRcdFx0XHRiYWxhbmNlOiBTdHJpbmdcblx0XHRcdFx0XHRcdH1dXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlUm9vbVRva2VucGFzcyhyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnc3RyZWFtaW5nT3B0aW9ucyc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlU3RyZWFtaW5nT3B0aW9ucyhyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncmVhZE9ubHknOlxuXHRcdFx0XHRcdGlmICh2YWx1ZSAhPT0gcm9vbS5ybykge1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlUm9vbVJlYWRPbmx5KHJpZCwgdmFsdWUsIHVzZXIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncmVhY3RXaGVuUmVhZE9ubHknOlxuXHRcdFx0XHRcdGlmICh2YWx1ZSAhPT0gcm9vbS5yZWFjdFdoZW5SZWFkT25seSkge1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlUmVhY3RXaGVuUmVhZE9ubHkocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdzeXN0ZW1NZXNzYWdlcyc6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLnN5c01lcykge1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlUm9vbVN5c3RlbU1lc3NhZ2VzKHJpZCwgdmFsdWUsIHVzZXIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnam9pbkNvZGUnOlxuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldEpvaW5Db2RlQnlJZChyaWQsIFN0cmluZyh2YWx1ZSkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdkZWZhdWx0Jzpcblx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlRGVmYXVsdEJ5SWQocmlkLCB2YWx1ZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3JldGVudGlvbkVuYWJsZWQnOlxuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNhdmVSZXRlbnRpb25FbmFibGVkQnlJZChyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncmV0ZW50aW9uTWF4QWdlJzpcblx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlUmV0ZW50aW9uTWF4QWdlQnlJZChyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncmV0ZW50aW9uRXhjbHVkZVBpbm5lZCc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2F2ZVJldGVudGlvbkV4Y2x1ZGVQaW5uZWRCeUlkKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyZXRlbnRpb25GaWxlc09ubHknOlxuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNhdmVSZXRlbnRpb25GaWxlc09ubHlCeUlkKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyZXRlbnRpb25PdmVycmlkZUdsb2JhbCc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2F2ZVJldGVudGlvbk92ZXJyaWRlR2xvYmFsQnlJZChyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN1bHQ6IHRydWUsXG5cdFx0XHRyaWQ6IHJvb20uX2lkXG5cdFx0fTtcblx0fVxufSk7XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVSb29tU2V0dGluZ3NDaGFuZ2VkV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciA9IGZ1bmN0aW9uKHR5cGUsIHJvb21JZCwgbWVzc2FnZSwgdXNlciwgZXh0cmFEYXRhKSB7XG5cdHJldHVybiB0aGlzLmNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIodHlwZSwgcm9vbUlkLCBtZXNzYWdlLCB1c2VyLCBleHRyYURhdGEpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVJlbmFtZWRXaXRoUm9vbUlkUm9vbU5hbWVBbmRVc2VyID0gZnVuY3Rpb24ocm9vbUlkLCByb29tTmFtZSwgdXNlciwgZXh0cmFEYXRhKSB7XG5cdHJldHVybiB0aGlzLmNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoJ3InLCByb29tSWQsIHJvb21OYW1lLCB1c2VyLCBleHRyYURhdGEpO1xufTtcbiIsIlJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldERlc2NyaXB0aW9uQnlJZCA9IGZ1bmN0aW9uKF9pZCwgZGVzY3JpcHRpb24pIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkXG5cdH07XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRkZXNjcmlwdGlvblxuXHRcdH1cblx0fTtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0UmVhZE9ubHlCeUlkID0gZnVuY3Rpb24oX2lkLCByZWFkT25seSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWRcblx0fTtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHJvOiByZWFkT25seSxcblx0XHRcdG11dGVkOiBbXVxuXHRcdH1cblx0fTtcblx0aWYgKHJlYWRPbmx5KSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWRXaGVuVXNlcm5hbWVFeGlzdHMoX2lkLCB7IGZpZWxkczogeyAndS5faWQnOiAxLCAndS51c2VybmFtZSc6IDEgfSB9KS5mb3JFYWNoKGZ1bmN0aW9uKHsgdTogdXNlciB9KSB7XG5cdFx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXIuX2lkLCAncG9zdC1yZWFkb25seScpKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHJldHVybiB1cGRhdGUuJHNldC5tdXRlZC5wdXNoKHVzZXIudXNlcm5hbWUpO1xuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdHVwZGF0ZS4kdW5zZXQgPSB7XG5cdFx0XHRtdXRlZDogJydcblx0XHR9O1xuXHR9XG5cblx0aWYgKHVwZGF0ZS4kc2V0Lm11dGVkLmxlbmd0aCA9PT0gMCkge1xuXHRcdGRlbGV0ZSB1cGRhdGUuJHNldC5tdXRlZDtcblx0fVxuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldEFsbG93UmVhY3RpbmdXaGVuUmVhZE9ubHlCeUlkID0gZnVuY3Rpb24oX2lkLCBhbGxvd1JlYWN0aW5nKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZFxuXHR9O1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0cmVhY3RXaGVuUmVhZE9ubHk6IGFsbG93UmVhY3Rpbmdcblx0XHR9XG5cdH07XG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldFN5c3RlbU1lc3NhZ2VzQnlJZCA9IGZ1bmN0aW9uKF9pZCwgc3lzdGVtTWVzc2FnZXMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkXG5cdH07XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRzeXNNZXM6IHN5c3RlbU1lc3NhZ2VzXG5cdFx0fVxuXHR9O1xuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLnVwc2VydCgncG9zdC1yZWFkb25seScsIHskc2V0T25JbnNlcnQ6IHsgcm9sZXM6IFsnYWRtaW4nLCAnb3duZXInLCAnbW9kZXJhdG9yJ10gfSB9KTtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMudXBzZXJ0KCdzZXQtcmVhZG9ubHknLCB7JHNldE9uSW5zZXJ0OiB7IHJvbGVzOiBbJ2FkbWluJywgJ293bmVyJ10gfSB9KTtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMudXBzZXJ0KCdzZXQtcmVhY3Qtd2hlbi1yZWFkb25seScsIHskc2V0T25JbnNlcnQ6IHsgcm9sZXM6IFsnYWRtaW4nLCAnb3duZXInXSB9fSk7XG59KTtcbiJdfQ==
