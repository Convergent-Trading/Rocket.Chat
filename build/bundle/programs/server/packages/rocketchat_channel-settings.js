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
      function: 'RocketChat.saveRoomType'
    });
  }

  if (roomType !== 'c' && roomType !== 'p') {
    throw new Meteor.Error('error-invalid-room-type', 'error-invalid-room-type', {
      function: 'RocketChat.saveRoomType',
      type: roomType
    });
  }

  const room = RocketChat.models.Rooms.findOneById(rid);

  if (room == null) {
    throw new Meteor.Error('error-invalid-room', 'error-invalid-room', {
      function: 'RocketChat.saveRoomType',
      _id: rid
    });
  }

  if (room.t === 'd') {
    throw new Meteor.Error('error-direct-room', 'Can\'t change type of direct rooms', {
      function: 'RocketChat.saveRoomType'
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
      function: 'RocketChat.saveRoomTopic'
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
      function: 'RocketChat.saveRoomCustomFields'
    });
  }

  if (!Match.test(roomCustomFields, Object)) {
    throw new Meteor.Error('invalid-roomCustomFields-type', 'Invalid roomCustomFields type', {
      function: 'RocketChat.saveRoomCustomFields'
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
      function: 'RocketChat.saveRoomdisplayName'
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
      function: 'RocketChat.saveRoomReadOnly'
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
      function: 'RocketChat.saveRoomDescription'
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
      function: 'RocketChat.saveRoomSystemMessages'
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
        function: 'RocketChat.saveRoomName'
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzL3NlcnZlci9mdW5jdGlvbnMvc2F2ZVJlYWN0V2hlblJlYWRPbmx5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y2hhbm5lbC1zZXR0aW5ncy9zZXJ2ZXIvZnVuY3Rpb25zL3NhdmVSb29tVG9waWMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y2hhbm5lbC1zZXR0aW5ncy9zZXJ2ZXIvZnVuY3Rpb25zL3NhdmVSb29tQ3VzdG9tRmllbGRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbUFubm91bmNlbWVudC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzL3NlcnZlci9mdW5jdGlvbnMvc2F2ZVJvb21OYW1lLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVJlYWRPbmx5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbURlc2NyaXB0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVN5c3RlbU1lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL21ldGhvZHMvc2F2ZVJvb21TZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzL3NlcnZlci9tb2RlbHMvTWVzc2FnZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y2hhbm5lbC1zZXR0aW5ncy9zZXJ2ZXIvbW9kZWxzL1Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL3N0YXJ0dXAuanMiXSwibmFtZXMiOlsiUm9ja2V0Q2hhdCIsInNhdmVSZWFjdFdoZW5SZWFkT25seSIsInJpZCIsImFsbG93UmVhY3QiLCJNYXRjaCIsInRlc3QiLCJTdHJpbmciLCJNZXRlb3IiLCJFcnJvciIsImZ1bmN0aW9uIiwibW9kZWxzIiwiUm9vbXMiLCJzZXRBbGxvd1JlYWN0aW5nV2hlblJlYWRPbmx5QnlJZCIsInNhdmVSb29tVHlwZSIsInJvb21UeXBlIiwidXNlciIsInNlbmRNZXNzYWdlIiwidHlwZSIsInJvb20iLCJmaW5kT25lQnlJZCIsIl9pZCIsInQiLCJyZXN1bHQiLCJzZXRUeXBlQnlJZCIsIlN1YnNjcmlwdGlvbnMiLCJ1cGRhdGVUeXBlQnlSb29tSWQiLCJtZXNzYWdlIiwiVEFQaTE4biIsIl9fIiwibG5nIiwibGFuZ3VhZ2UiLCJzZXR0aW5ncyIsImdldCIsIk1lc3NhZ2VzIiwiY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIiLCJzYXZlUm9vbVRvcGljIiwicm9vbVRvcGljIiwidXBkYXRlIiwic2V0VG9waWNCeUlkIiwic2F2ZVJvb21DdXN0b21GaWVsZHMiLCJyb29tQ3VzdG9tRmllbGRzIiwiT2JqZWN0IiwicmV0Iiwic2V0Q3VzdG9tRmllbGRzQnlJZCIsInVwZGF0ZUN1c3RvbUZpZWxkc0J5Um9vbUlkIiwic2F2ZVJvb21Bbm5vdW5jZW1lbnQiLCJyb29tQW5ub3VuY2VtZW50IiwiYW5ub3VuY2VtZW50RGV0YWlscyIsInVwZGF0ZWQiLCJzZXRBbm5vdW5jZW1lbnRCeUlkIiwic2F2ZVJvb21OYW1lIiwiZGlzcGxheU5hbWUiLCJyb29tVHlwZXMiLCJwcmV2ZW50UmVuYW1pbmciLCJuYW1lIiwic2x1Z2lmaWVkUm9vbU5hbWUiLCJnZXRWYWxpZFJvb21OYW1lIiwic2V0TmFtZUJ5SWQiLCJ1cGRhdGVOYW1lQW5kQWxlcnRCeVJvb21JZCIsImNyZWF0ZVJvb21SZW5hbWVkV2l0aFJvb21JZFJvb21OYW1lQW5kVXNlciIsInNhdmVSb29tUmVhZE9ubHkiLCJyZWFkT25seSIsInNldFJlYWRPbmx5QnlJZCIsInNhdmVSb29tRGVzY3JpcHRpb24iLCJyb29tRGVzY3JpcHRpb24iLCJzZXREZXNjcmlwdGlvbkJ5SWQiLCJzYXZlUm9vbVN5c3RlbU1lc3NhZ2VzIiwic3lzdGVtTWVzc2FnZXMiLCJzZXRTeXN0ZW1NZXNzYWdlc0J5SWQiLCJmaWVsZHMiLCJtZXRob2RzIiwic2F2ZVJvb21TZXR0aW5ncyIsInZhbHVlIiwidXNlcklkIiwibWV0aG9kIiwia2V5cyIsImV2ZXJ5Iiwia2V5IiwiaW5jbHVkZXMiLCJhdXRoeiIsImhhc1Blcm1pc3Npb24iLCJhY3Rpb24iLCJicm9hZGNhc3QiLCJyZWFjdFdoZW5SZWFkT25seSIsImZvckVhY2giLCJzZXR0aW5nIiwicmV0ZW50aW9uIiwiZW5hYmxlZCIsIm1heEFnZSIsImV4Y2x1ZGVQaW5uZWQiLCJmaWxlc09ubHkiLCJyZXRlbnRpb25NYXhBZ2UiLCJyZXRlbnRpb25FeGNsdWRlUGlubmVkIiwicmV0ZW50aW9uRmlsZXNPbmx5IiwidG9waWMiLCJhbm5vdW5jZW1lbnQiLCJjdXN0b21GaWVsZHMiLCJkZXNjcmlwdGlvbiIsImNoZWNrIiwicmVxdWlyZSIsInRva2VucyIsInRva2VuIiwiYmFsYW5jZSIsInNhdmVSb29tVG9rZW5wYXNzIiwic2F2ZVN0cmVhbWluZ09wdGlvbnMiLCJybyIsInN5c01lcyIsInNldEpvaW5Db2RlQnlJZCIsInNhdmVEZWZhdWx0QnlJZCIsInNhdmVSZXRlbnRpb25FbmFibGVkQnlJZCIsInNhdmVSZXRlbnRpb25NYXhBZ2VCeUlkIiwic2F2ZVJldGVudGlvbkV4Y2x1ZGVQaW5uZWRCeUlkIiwic2F2ZVJldGVudGlvbkZpbGVzT25seUJ5SWQiLCJzYXZlUmV0ZW50aW9uT3ZlcnJpZGVHbG9iYWxCeUlkIiwicm9vbUlkIiwiZXh0cmFEYXRhIiwiY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsInJvb21OYW1lIiwicXVlcnkiLCIkc2V0IiwibXV0ZWQiLCJmaW5kQnlSb29tSWRXaGVuVXNlcm5hbWVFeGlzdHMiLCJ1IiwicHVzaCIsInVzZXJuYW1lIiwiJHVuc2V0IiwibGVuZ3RoIiwiYWxsb3dSZWFjdGluZyIsInN0YXJ0dXAiLCJQZXJtaXNzaW9ucyIsInVwc2VydCIsIiRzZXRPbkluc2VydCIsInJvbGVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLFdBQVdDLHFCQUFYLEdBQW1DLFVBQVNDLEdBQVQsRUFBY0MsVUFBZCxFQUEwQjtBQUM1RCxNQUFJLENBQUNDLE1BQU1DLElBQU4sQ0FBV0gsR0FBWCxFQUFnQkksTUFBaEIsQ0FBTCxFQUE4QjtBQUM3QixVQUFNLElBQUlDLE9BQU9DLEtBQVgsQ0FBaUIsY0FBakIsRUFBaUMsY0FBakMsRUFBaUQ7QUFBRUMsZ0JBQVU7QUFBWixLQUFqRCxDQUFOO0FBQ0E7O0FBRUQsU0FBT1QsV0FBV1UsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JDLGdDQUF4QixDQUF5RFYsR0FBekQsRUFBOERDLFVBQTlELENBQVA7QUFDQSxDQU5ELEM7Ozs7Ozs7Ozs7O0FDQ0FILFdBQVdhLFlBQVgsR0FBMEIsVUFBU1gsR0FBVCxFQUFjWSxRQUFkLEVBQXdCQyxJQUF4QixFQUE4QkMsY0FBYyxJQUE1QyxFQUFrRDtBQUMzRSxNQUFJLENBQUNaLE1BQU1DLElB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QUFDTHBDLHlCQUFtQjRDO0FBRGQ7QUFEUSxHQUFmO0FBS0EsU0FBTyxLQUFLMUYsTUFBTCxDQUFZaUYsS0FBWixFQUFtQmpGLE1BQW5CLENBQVA7QUFDQSxDQVZEOztBQVlBckMsV0FBV1UsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0J5RCxxQkFBeEIsR0FBZ0QsVUFBU2hELEdBQVQsRUFBYytDLGNBQWQsRUFBOEI7QUFDN0UsUUFBTW1ELFFBQVE7QUFDYmxHO0FBRGEsR0FBZDtBQUdBLFFBQU1pQixTQUFTO0FBQ2RrRixVQUFNO0FBQ0xiLGNBQVF2QztBQURIO0FBRFEsR0FBZjtBQUtBLFNBQU8sS0FBSzlCLE1BQUwsQ0FBWWlGLEtBQVosRUFBbUJqRixNQUFuQixDQUFQO0FBQ0EsQ0FWRCxDOzs7Ozs7Ozs7OztBQ3REQTlCLE9BQU95SCxPQUFQLENBQWUsWUFBVztBQUN6QmhJLGFBQVdVLE1BQVgsQ0FBa0J1SCxXQUFsQixDQUE4QkMsTUFBOUIsQ0FBcUMsZUFBckMsRUFBc0Q7QUFBRUMsa0JBQWM7QUFBRUMsYUFBTyxDQUFDLE9BQUQsRUFBVSxPQUFWLEVBQW1CLFdBQW5CO0FBQVQ7QUFBaEIsR0FBdEQ7QUFDQXBJLGFBQVdVLE1BQVgsQ0FBa0J1SCxXQUFsQixDQUE4QkMsTUFBOUIsQ0FBcUMsY0FBckMsRUFBcUQ7QUFBRUMsa0JBQWM7QUFBRUMsYUFBTyxDQUFDLE9BQUQsRUFBVSxPQUFWO0FBQVQ7QUFBaEIsR0FBckQ7QUFDQXBJLGFBQVdVLE1BQVgsQ0FBa0J1SCxXQUFsQixDQUE4QkMsTUFBOUIsQ0FBcUMseUJBQXJDLEVBQWdFO0FBQUVDLGtCQUFjO0FBQUVDLGFBQU8sQ0FBQyxPQUFELEVBQVUsT0FBVjtBQUFUO0FBQWhCLEdBQWhFO0FBQ0EsQ0FKRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2NoYW5uZWwtc2V0dGluZ3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJSb2NrZXRDaGF0LnNhdmVSZWFjdFdoZW5SZWFkT25seSA9IGZ1bmN0aW9uKHJpZCwgYWxsb3dSZWFjdCkge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHsgZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSZWFjdFdoZW5SZWFkT25seScgfSk7XG5cdH1cblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0QWxsb3dSZWFjdGluZ1doZW5SZWFkT25seUJ5SWQocmlkLCBhbGxvd1JlYWN0KTtcbn07XG4iLCJcblJvY2tldENoYXQuc2F2ZVJvb21UeXBlID0gZnVuY3Rpb24ocmlkLCByb29tVHlwZSwgdXNlciwgc2VuZE1lc3NhZ2UgPSB0cnVlKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tVHlwZScsXG5cdFx0fSk7XG5cdH1cblx0aWYgKHJvb21UeXBlICE9PSAnYycgJiYgcm9vbVR5cGUgIT09ICdwJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbS10eXBlJywgJ2Vycm9yLWludmFsaWQtcm9vbS10eXBlJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tVHlwZScsXG5cdFx0XHR0eXBlOiByb29tVHlwZSxcblx0XHR9KTtcblx0fVxuXHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblx0aWYgKHJvb20gPT0gbnVsbCkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdlcnJvci1pbnZhbGlkLXJvb20nLCB7XG5cdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuc2F2ZVJvb21UeXBlJyxcblx0XHRcdF9pZDogcmlkLFxuXHRcdH0pO1xuXHR9XG5cdGlmIChyb29tLnQgPT09ICdkJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWRpcmVjdC1yb29tJywgJ0NhblxcJ3QgY2hhbmdlIHR5cGUgb2YgZGlyZWN0IHJvb21zJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tVHlwZScsXG5cdFx0fSk7XG5cdH1cblx0Y29uc3QgcmVzdWx0ID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0VHlwZUJ5SWQocmlkLCByb29tVHlwZSkgJiYgUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVUeXBlQnlSb29tSWQocmlkLCByb29tVHlwZSk7XG5cdGlmIChyZXN1bHQgJiYgc2VuZE1lc3NhZ2UpIHtcblx0XHRsZXQgbWVzc2FnZTtcblx0XHRpZiAocm9vbVR5cGUgPT09ICdjJykge1xuXHRcdFx0bWVzc2FnZSA9IFRBUGkxOG4uX18oJ0NoYW5uZWwnLCB7XG5cdFx0XHRcdGxuZzogKHVzZXIgJiYgdXNlci5sYW5ndWFnZSkgfHwgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ2xhbmd1YWdlJykgfHwgJ2VuJyxcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXNzYWdlID0gVEFQaTE4bi5fXygnUHJpdmF0ZV9Hcm91cCcsIHtcblx0XHRcdFx0bG5nOiAodXNlciAmJiB1c2VyLmxhbmd1YWdlKSB8fCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnbGFuZ3VhZ2UnKSB8fCAnZW4nLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfcHJpdmFjeScsIHJpZCwgbWVzc2FnZSwgdXNlcik7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn07XG4iLCJSb2NrZXRDaGF0LnNhdmVSb29tVG9waWMgPSBmdW5jdGlvbihyaWQsIHJvb21Ub3BpYywgdXNlciwgc2VuZE1lc3NhZ2UgPSB0cnVlKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tVG9waWMnLFxuXHRcdH0pO1xuXHR9XG5cblx0Y29uc3QgdXBkYXRlID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0VG9waWNCeUlkKHJpZCwgcm9vbVRvcGljKTtcblx0aWYgKHVwZGF0ZSAmJiBzZW5kTWVzc2FnZSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfdG9waWMnLCByaWQsIHJvb21Ub3BpYywgdXNlcik7XG5cdH1cblx0cmV0dXJuIHVwZGF0ZTtcbn07XG4iLCJSb2NrZXRDaGF0LnNhdmVSb29tQ3VzdG9tRmllbGRzID0gZnVuY3Rpb24ocmlkLCByb29tQ3VzdG9tRmllbGRzKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tQ3VzdG9tRmllbGRzJyxcblx0XHR9KTtcblx0fVxuXHRpZiAoIU1hdGNoLnRlc3Qocm9vbUN1c3RvbUZpZWxkcywgT2JqZWN0KSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbUN1c3RvbUZpZWxkcy10eXBlJywgJ0ludmFsaWQgcm9vbUN1c3RvbUZpZWxkcyB0eXBlJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tQ3VzdG9tRmllbGRzJyxcblx0XHR9KTtcblx0fVxuXHRjb25zdCByZXQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRDdXN0b21GaWVsZHNCeUlkKHJpZCwgcm9vbUN1c3RvbUZpZWxkcyk7XG5cblx0Ly8gVXBkYXRlIGN1c3RvbUZpZWxkcyBvZiBhbnkgdXNlcidzIFN1YnNjcmlwdGlvbiByZWxhdGVkIHdpdGggdGhpcyByaWRcblx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVDdXN0b21GaWVsZHNCeVJvb21JZChyaWQsIHJvb21DdXN0b21GaWVsZHMpO1xuXG5cdHJldHVybiByZXQ7XG59O1xuIiwiUm9ja2V0Q2hhdC5zYXZlUm9vbUFubm91bmNlbWVudCA9IGZ1bmN0aW9uKHJpZCwgcm9vbUFubm91bmNlbWVudCwgdXNlciwgc2VuZE1lc3NhZ2UgPSB0cnVlKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywgeyBmdW5jdGlvbjogJ1JvY2tldENoYXQuc2F2ZVJvb21Bbm5vdW5jZW1lbnQnIH0pO1xuXHR9XG5cblx0bGV0IG1lc3NhZ2U7XG5cdGxldCBhbm5vdW5jZW1lbnREZXRhaWxzO1xuXHRpZiAodHlwZW9mIHJvb21Bbm5vdW5jZW1lbnQgPT09ICdzdHJpbmcnKSB7XG5cdFx0bWVzc2FnZSA9IHJvb21Bbm5vdW5jZW1lbnQ7XG5cdH0gZWxzZSB7XG5cdFx0KHsgbWVzc2FnZSwgLi4uYW5ub3VuY2VtZW50RGV0YWlscyB9ID0gcm9vbUFubm91bmNlbWVudCk7XG5cdH1cblxuXHRjb25zdCB1cGRhdGVkID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0QW5ub3VuY2VtZW50QnlJZChyaWQsIG1lc3NhZ2UsIGFubm91bmNlbWVudERldGFpbHMpO1xuXHRpZiAodXBkYXRlZCAmJiBzZW5kTWVzc2FnZSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfYW5ub3VuY2VtZW50JywgcmlkLCBtZXNzYWdlLCB1c2VyKTtcblx0fVxuXG5cdHJldHVybiB1cGRhdGVkO1xufTtcbiIsIlxuUm9ja2V0Q2hhdC5zYXZlUm9vbU5hbWUgPSBmdW5jdGlvbihyaWQsIGRpc3BsYXlOYW1lLCB1c2VyLCBzZW5kTWVzc2FnZSA9IHRydWUpIHtcblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJpZCk7XG5cdGlmIChSb2NrZXRDaGF0LnJvb21UeXBlcy5yb29tVHlwZXNbcm9vbS50XS5wcmV2ZW50UmVuYW1pbmcoKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tZGlzcGxheU5hbWUnLFxuXHRcdH0pO1xuXHR9XG5cdGlmIChkaXNwbGF5TmFtZSA9PT0gcm9vbS5uYW1lKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3Qgc2x1Z2lmaWVkUm9vbU5hbWUgPSBSb2NrZXRDaGF0LmdldFZhbGlkUm9vbU5hbWUoZGlzcGxheU5hbWUsIHJpZCk7XG5cblx0Y29uc3QgdXBkYXRlID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0TmFtZUJ5SWQocmlkLCBzbHVnaWZpZWRSb29tTmFtZSwgZGlzcGxheU5hbWUpICYmIFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlTmFtZUFuZEFsZXJ0QnlSb29tSWQocmlkLCBzbHVnaWZpZWRSb29tTmFtZSwgZGlzcGxheU5hbWUpO1xuXG5cdGlmICh1cGRhdGUgJiYgc2VuZE1lc3NhZ2UpIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVSb29tUmVuYW1lZFdpdGhSb29tSWRSb29tTmFtZUFuZFVzZXIocmlkLCBkaXNwbGF5TmFtZSwgdXNlcik7XG5cdH1cblx0cmV0dXJuIGRpc3BsYXlOYW1lO1xufTtcbiIsIlJvY2tldENoYXQuc2F2ZVJvb21SZWFkT25seSA9IGZ1bmN0aW9uKHJpZCwgcmVhZE9ubHkpIHtcblx0aWYgKCFNYXRjaC50ZXN0KHJpZCwgU3RyaW5nKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7XG5cdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuc2F2ZVJvb21SZWFkT25seScsXG5cdFx0fSk7XG5cdH1cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldFJlYWRPbmx5QnlJZChyaWQsIHJlYWRPbmx5KTtcbn07XG4iLCJSb2NrZXRDaGF0LnNhdmVSb29tRGVzY3JpcHRpb24gPSBmdW5jdGlvbihyaWQsIHJvb21EZXNjcmlwdGlvbiwgdXNlcikge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbURlc2NyaXB0aW9uJyxcblx0XHR9KTtcblx0fVxuXG5cdGNvbnN0IHVwZGF0ZSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldERlc2NyaXB0aW9uQnlJZChyaWQsIHJvb21EZXNjcmlwdGlvbik7XG5cdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfZGVzY3JpcHRpb24nLCByaWQsIHJvb21EZXNjcmlwdGlvbiwgdXNlcik7XG5cdHJldHVybiB1cGRhdGU7XG59O1xuIiwiUm9ja2V0Q2hhdC5zYXZlUm9vbVN5c3RlbU1lc3NhZ2VzID0gZnVuY3Rpb24ocmlkLCBzeXN0ZW1NZXNzYWdlcykge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbVN5c3RlbU1lc3NhZ2VzJyxcblx0XHR9KTtcblx0fVxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0U3lzdGVtTWVzc2FnZXNCeUlkKHJpZCwgc3lzdGVtTWVzc2FnZXMpO1xufTtcbiIsImNvbnN0IGZpZWxkcyA9IFsncm9vbU5hbWUnLCAncm9vbVRvcGljJywgJ3Jvb21Bbm5vdW5jZW1lbnQnLCAncm9vbUN1c3RvbUZpZWxkcycsICdyb29tRGVzY3JpcHRpb24nLCAncm9vbVR5cGUnLCAncmVhZE9ubHknLCAncmVhY3RXaGVuUmVhZE9ubHknLCAnc3lzdGVtTWVzc2FnZXMnLCAnZGVmYXVsdCcsICdqb2luQ29kZScsICd0b2tlbnBhc3MnLCAnc3RyZWFtaW5nT3B0aW9ucycsICdyZXRlbnRpb25FbmFibGVkJywgJ3JldGVudGlvbk1heEFnZScsICdyZXRlbnRpb25FeGNsdWRlUGlubmVkJywgJ3JldGVudGlvbkZpbGVzT25seScsICdyZXRlbnRpb25PdmVycmlkZUdsb2JhbCddO1xuTWV0ZW9yLm1ldGhvZHMoe1xuXHRzYXZlUm9vbVNldHRpbmdzKHJpZCwgc2V0dGluZ3MsIHZhbHVlKSB7XG5cdFx0Y29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuXG5cdFx0aWYgKCF1c2VySWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbU5hbWUnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ29iamVjdCcpIHtcblx0XHRcdHNldHRpbmdzID0ge1xuXHRcdFx0XHRbc2V0dGluZ3NdIDogdmFsdWUsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICghT2JqZWN0LmtleXMoc2V0dGluZ3MpLmV2ZXJ5KChrZXkpID0+IGZpZWxkcy5pbmNsdWRlcyhrZXkpKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1zZXR0aW5ncycsICdJbnZhbGlkIHNldHRpbmdzIHByb3ZpZGVkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXJJZCwgJ2VkaXQtcm9vbScsIHJpZCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdFZGl0aW5nIHJvb20gaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRhY3Rpb246ICdFZGl0aW5nX3Jvb20nLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJpZCk7XG5cblx0XHRpZiAocm9vbS5icm9hZGNhc3QgJiYgKHNldHRpbmdzLnJlYWRPbmx5IHx8IHNldHRpbmdzLnJlYWN0V2hlblJlYWRPbmx5KSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0VkaXRpbmcgcmVhZE9ubHkvcmVhY3RXaGVuUmVhZE9ubHkgYXJlIG5vdCBhbGxvd2VkIGZvciBicm9hZGNhc3Qgcm9vbXMnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRhY3Rpb246ICdFZGl0aW5nX3Jvb20nLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFyb29tKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0Ly8gdmFsaWRhdGlvbnNcblxuXHRcdE9iamVjdC5rZXlzKHNldHRpbmdzKS5mb3JFYWNoKChzZXR0aW5nKSA9PiB7XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHNldHRpbmdzW3NldHRpbmddO1xuXHRcdFx0aWYgKHNldHRpbmdzID09PSAnZGVmYXVsdCcgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VySWQsICd2aWV3LXJvb20tYWRtaW5pc3RyYXRpb24nKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnVmlld2luZyByb29tIGFkbWluaXN0cmF0aW9uIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ1ZpZXdpbmdfcm9vbV9hZG1pbmlzdHJhdGlvbicsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdyb29tVHlwZScgJiYgdmFsdWUgIT09IHJvb20udCAmJiB2YWx1ZSA9PT0gJ2MnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnY3JlYXRlLWMnKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnQ2hhbmdpbmcgYSBwcml2YXRlIGdyb3VwIHRvIGEgcHVibGljIGNoYW5uZWwgaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncycsXG5cdFx0XHRcdFx0YWN0aW9uOiAnQ2hhbmdlX1Jvb21fVHlwZScsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdyb29tVHlwZScgJiYgdmFsdWUgIT09IHJvb20udCAmJiB2YWx1ZSA9PT0gJ3AnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnY3JlYXRlLXAnKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnQ2hhbmdpbmcgYSBwdWJsaWMgY2hhbm5lbCB0byBhIHByaXZhdGUgcm9vbSBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdFx0XHRhY3Rpb246ICdDaGFuZ2VfUm9vbV9UeXBlJyxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChzZXR0aW5nID09PSAncmV0ZW50aW9uRW5hYmxlZCcgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VySWQsICdlZGl0LXJvb20tcmV0ZW50aW9uLXBvbGljeScsIHJpZCkgJiYgdmFsdWUgIT09IHJvb20ucmV0ZW50aW9uLmVuYWJsZWQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0VkaXRpbmcgcm9vbSByZXRlbnRpb24gcG9saWN5IGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ0VkaXRpbmdfcm9vbScsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdyZXRlbnRpb25NYXhBZ2UnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnZWRpdC1yb29tLXJldGVudGlvbi1wb2xpY3knLCByaWQpICYmIHZhbHVlICE9PSByb29tLnJldGVudGlvbi5tYXhBZ2UpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0VkaXRpbmcgcm9vbSByZXRlbnRpb24gcG9saWN5IGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ0VkaXRpbmdfcm9vbScsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdyZXRlbnRpb25FeGNsdWRlUGlubmVkJyAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXJJZCwgJ2VkaXQtcm9vbS1yZXRlbnRpb24tcG9saWN5JywgcmlkKSAmJiB2YWx1ZSAhPT0gcm9vbS5yZXRlbnRpb24uZXhjbHVkZVBpbm5lZCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnRWRpdGluZyByb29tIHJldGVudGlvbiBwb2xpY3kgaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncycsXG5cdFx0XHRcdFx0YWN0aW9uOiAnRWRpdGluZ19yb29tJyxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc2V0dGluZyA9PT0gJ3JldGVudGlvbkZpbGVzT25seScgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VySWQsICdlZGl0LXJvb20tcmV0ZW50aW9uLXBvbGljeScsIHJpZCkgJiYgdmFsdWUgIT09IHJvb20ucmV0ZW50aW9uLmZpbGVzT25seSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnRWRpdGluZyByb29tIHJldGVudGlvbiBwb2xpY3kgaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncycsXG5cdFx0XHRcdFx0YWN0aW9uOiAnRWRpdGluZ19yb29tJyxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc2V0dGluZyA9PT0gJ3JldGVudGlvbk92ZXJyaWRlR2xvYmFsJykge1xuXHRcdFx0XHRkZWxldGUgc2V0dGluZ3MucmV0ZW50aW9uTWF4QWdlO1xuXHRcdFx0XHRkZWxldGUgc2V0dGluZ3MucmV0ZW50aW9uRXhjbHVkZVBpbm5lZDtcblx0XHRcdFx0ZGVsZXRlIHNldHRpbmdzLnJldGVudGlvbkZpbGVzT25seTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdE9iamVjdC5rZXlzKHNldHRpbmdzKS5mb3JFYWNoKChzZXR0aW5nKSA9PiB7XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHNldHRpbmdzW3NldHRpbmddO1xuXHRcdFx0c3dpdGNoIChzZXR0aW5nKSB7XG5cdFx0XHRcdGNhc2UgJ3Jvb21OYW1lJzpcblx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tTmFtZShyaWQsIHZhbHVlLCB1c2VyKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncm9vbVRvcGljJzpcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHJvb20udG9waWMpIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21Ub3BpYyhyaWQsIHZhbHVlLCB1c2VyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3Jvb21Bbm5vdW5jZW1lbnQnOlxuXHRcdFx0XHRcdGlmICh2YWx1ZSAhPT0gcm9vbS5hbm5vdW5jZW1lbnQpIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21Bbm5vdW5jZW1lbnQocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyb29tQ3VzdG9tRmllbGRzJzpcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHJvb20uY3VzdG9tRmllbGRzKSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tQ3VzdG9tRmllbGRzKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncm9vbURlc2NyaXB0aW9uJzpcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHJvb20uZGVzY3JpcHRpb24pIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21EZXNjcmlwdGlvbihyaWQsIHZhbHVlLCB1c2VyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3Jvb21UeXBlJzpcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHJvb20udCkge1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlUm9vbVR5cGUocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICd0b2tlbnBhc3MnOlxuXHRcdFx0XHRcdGNoZWNrKHZhbHVlLCB7XG5cdFx0XHRcdFx0XHRyZXF1aXJlOiBTdHJpbmcsXG5cdFx0XHRcdFx0XHR0b2tlbnM6IFt7XG5cdFx0XHRcdFx0XHRcdHRva2VuOiBTdHJpbmcsXG5cdFx0XHRcdFx0XHRcdGJhbGFuY2U6IFN0cmluZyxcblx0XHRcdFx0XHRcdH1dLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21Ub2tlbnBhc3MocmlkLCB2YWx1ZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3N0cmVhbWluZ09wdGlvbnMnOlxuXHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVN0cmVhbWluZ09wdGlvbnMocmlkLCB2YWx1ZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3JlYWRPbmx5Jzpcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHJvb20ucm8pIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21SZWFkT25seShyaWQsIHZhbHVlLCB1c2VyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3JlYWN0V2hlblJlYWRPbmx5Jzpcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHJvb20ucmVhY3RXaGVuUmVhZE9ubHkpIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJlYWN0V2hlblJlYWRPbmx5KHJpZCwgdmFsdWUsIHVzZXIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnc3lzdGVtTWVzc2FnZXMnOlxuXHRcdFx0XHRcdGlmICh2YWx1ZSAhPT0gcm9vbS5zeXNNZXMpIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21TeXN0ZW1NZXNzYWdlcyhyaWQsIHZhbHVlLCB1c2VyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2pvaW5Db2RlJzpcblx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRKb2luQ29kZUJ5SWQocmlkLCBTdHJpbmcodmFsdWUpKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnZGVmYXVsdCc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2F2ZURlZmF1bHRCeUlkKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyZXRlbnRpb25FbmFibGVkJzpcblx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlUmV0ZW50aW9uRW5hYmxlZEJ5SWQocmlkLCB2YWx1ZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3JldGVudGlvbk1heEFnZSc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2F2ZVJldGVudGlvbk1heEFnZUJ5SWQocmlkLCB2YWx1ZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3JldGVudGlvbkV4Y2x1ZGVQaW5uZWQnOlxuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNhdmVSZXRlbnRpb25FeGNsdWRlUGlubmVkQnlJZChyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncmV0ZW50aW9uRmlsZXNPbmx5Jzpcblx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlUmV0ZW50aW9uRmlsZXNPbmx5QnlJZChyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncmV0ZW50aW9uT3ZlcnJpZGVHbG9iYWwnOlxuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNhdmVSZXRlbnRpb25PdmVycmlkZUdsb2JhbEJ5SWQocmlkLCB2YWx1ZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdWx0OiB0cnVlLFxuXHRcdFx0cmlkOiByb29tLl9pZCxcblx0XHR9O1xuXHR9LFxufSk7XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVSb29tU2V0dGluZ3NDaGFuZ2VkV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciA9IGZ1bmN0aW9uKHR5cGUsIHJvb21JZCwgbWVzc2FnZSwgdXNlciwgZXh0cmFEYXRhKSB7XG5cdHJldHVybiB0aGlzLmNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIodHlwZSwgcm9vbUlkLCBtZXNzYWdlLCB1c2VyLCBleHRyYURhdGEpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVJlbmFtZWRXaXRoUm9vbUlkUm9vbU5hbWVBbmRVc2VyID0gZnVuY3Rpb24ocm9vbUlkLCByb29tTmFtZSwgdXNlciwgZXh0cmFEYXRhKSB7XG5cdHJldHVybiB0aGlzLmNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoJ3InLCByb29tSWQsIHJvb21OYW1lLCB1c2VyLCBleHRyYURhdGEpO1xufTtcbiIsIlJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldERlc2NyaXB0aW9uQnlJZCA9IGZ1bmN0aW9uKF9pZCwgZGVzY3JpcHRpb24pIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0ZGVzY3JpcHRpb24sXG5cdFx0fSxcblx0fTtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0UmVhZE9ubHlCeUlkID0gZnVuY3Rpb24oX2lkLCByZWFkT25seSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQsXG5cdH07XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRybzogcmVhZE9ubHksXG5cdFx0XHRtdXRlZDogW10sXG5cdFx0fSxcblx0fTtcblx0aWYgKHJlYWRPbmx5KSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWRXaGVuVXNlcm5hbWVFeGlzdHMoX2lkLCB7IGZpZWxkczogeyAndS5faWQnOiAxLCAndS51c2VybmFtZSc6IDEgfSB9KS5mb3JFYWNoKGZ1bmN0aW9uKHsgdTogdXNlciB9KSB7XG5cdFx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXIuX2lkLCAncG9zdC1yZWFkb25seScpKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHJldHVybiB1cGRhdGUuJHNldC5tdXRlZC5wdXNoKHVzZXIudXNlcm5hbWUpO1xuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdHVwZGF0ZS4kdW5zZXQgPSB7XG5cdFx0XHRtdXRlZDogJycsXG5cdFx0fTtcblx0fVxuXG5cdGlmICh1cGRhdGUuJHNldC5tdXRlZC5sZW5ndGggPT09IDApIHtcblx0XHRkZWxldGUgdXBkYXRlLiRzZXQubXV0ZWQ7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRBbGxvd1JlYWN0aW5nV2hlblJlYWRPbmx5QnlJZCA9IGZ1bmN0aW9uKF9pZCwgYWxsb3dSZWFjdGluZykge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQsXG5cdH07XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRyZWFjdFdoZW5SZWFkT25seTogYWxsb3dSZWFjdGluZyxcblx0XHR9LFxuXHR9O1xuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRTeXN0ZW1NZXNzYWdlc0J5SWQgPSBmdW5jdGlvbihfaWQsIHN5c3RlbU1lc3NhZ2VzKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZCxcblx0fTtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHN5c01lczogc3lzdGVtTWVzc2FnZXMsXG5cdFx0fSxcblx0fTtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcbiIsIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy51cHNlcnQoJ3Bvc3QtcmVhZG9ubHknLCB7ICRzZXRPbkluc2VydDogeyByb2xlczogWydhZG1pbicsICdvd25lcicsICdtb2RlcmF0b3InXSB9IH0pO1xuXHRSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy51cHNlcnQoJ3NldC1yZWFkb25seScsIHsgJHNldE9uSW5zZXJ0OiB7IHJvbGVzOiBbJ2FkbWluJywgJ293bmVyJ10gfSB9KTtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMudXBzZXJ0KCdzZXQtcmVhY3Qtd2hlbi1yZWFkb25seScsIHsgJHNldE9uSW5zZXJ0OiB7IHJvbGVzOiBbJ2FkbWluJywgJ293bmVyJ10gfSB9KTtcbn0pO1xuIl19
