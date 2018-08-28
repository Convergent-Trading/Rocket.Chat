(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:message-pin":{"server":{"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-pin/server/settings.js                                                             //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.startup(function () {
  RocketChat.settings.add('Message_AllowPinning', true, {
    type: 'boolean',
    group: 'Message',
    'public': true
  });
  return RocketChat.models.Permissions.upsert('pin-message', {
    $setOnInsert: {
      roles: ['owner', 'moderator', 'admin']
    }
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pinMessage.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-pin/server/pinMessage.js                                                           //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
const recursiveRemove = (msg, deep = 1) => {
  if (!msg) {
    return;
  }

  if (deep > RocketChat.settings.get('Message_QuoteChainLimit')) {
    delete msg.attachments;
    return msg;
  }

  msg.attachments = Array.isArray(msg.attachments) ? msg.attachments.map(nestedMsg => recursiveRemove(nestedMsg, deep + 1)) : null;
  return msg;
};

const shouldAdd = (attachments, attachment) => !attachments.some(({
  message_link
}) => message_link && message_link === attachment.message_link);

Meteor.methods({
  pinMessage(message, pinnedAt) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'pinMessage'
      });
    }

    if (!RocketChat.settings.get('Message_AllowPinning')) {
      throw new Meteor.Error('error-action-not-allowed', 'Message pinning not allowed', {
        method: 'pinMessage',
        action: 'Message_pinning'
      });
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(message.rid, Meteor.userId(), {
      fields: {
        _id: 1
      }
    });

    if (!subscription) {
      return false;
    }

    let originalMessage = RocketChat.models.Messages.findOneById(message._id);

    if (originalMessage == null || originalMessage._id == null) {
      throw new Meteor.Error('error-invalid-message', 'Message you are pinning was not found', {
        method: 'pinMessage',
        action: 'Message_pinning'
      });
    } //If we keep history of edits, insert a new message to store history information


    if (RocketChat.settings.get('Message_KeepHistory')) {
      RocketChat.models.Messages.cloneAndSaveAsHistoryById(message._id);
    }

    const me = RocketChat.models.Users.findOneById(userId);
    originalMessage.pinned = true;
    originalMessage.pinnedAt = pinnedAt || Date.now;
    originalMessage.pinnedBy = {
      _id: userId,
      username: me.username
    };
    originalMessage = RocketChat.callbacks.run('beforeSaveMessage', originalMessage);
    RocketChat.models.Messages.setPinnedByIdAndUserId(originalMessage._id, originalMessage.pinnedBy, originalMessage.pinned);
    const attachments = [];

    if (Array.isArray(originalMessage.attachments)) {
      originalMessage.attachments.forEach(attachment => {
        if (!attachment.message_link || shouldAdd(attachments, attachment)) {
          attachments.push(attachment);
        }
      });
    }

    return RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('message_pinned', originalMessage.rid, '', me, {
      attachments: [{
        text: originalMessage.msg,
        author_name: originalMessage.u.username,
        author_icon: getAvatarUrlFromUsername(originalMessage.u.username),
        ts: originalMessage.ts,
        attachments: recursiveRemove(attachments)
      }]
    });
  },

  unpinMessage(message) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'unpinMessage'
      });
    }

    if (!RocketChat.settings.get('Message_AllowPinning')) {
      throw new Meteor.Error('error-action-not-allowed', 'Message pinning not allowed', {
        method: 'unpinMessage',
        action: 'Message_pinning'
      });
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(message.rid, Meteor.userId(), {
      fields: {
        _id: 1
      }
    });

    if (!subscription) {
      return false;
    }

    let originalMessage = RocketChat.models.Messages.findOneById(message._id);

    if (originalMessage == null || originalMessage._id == null) {
      throw new Meteor.Error('error-invalid-message', 'Message you are unpinning was not found', {
        method: 'unpinMessage',
        action: 'Message_pinning'
      });
    } //If we keep history of edits, insert a new message to store history information


    if (RocketChat.settings.get('Message_KeepHistory')) {
      RocketChat.models.Messages.cloneAndSaveAsHistoryById(originalMessage._id);
    }

    const me = RocketChat.models.Users.findOneById(Meteor.userId());
    originalMessage.pinned = false;
    originalMessage.pinnedBy = {
      _id: Meteor.userId(),
      username: me.username
    };
    originalMessage = RocketChat.callbacks.run('beforeSaveMessage', originalMessage);
    return RocketChat.models.Messages.setPinnedByIdAndUserId(originalMessage._id, originalMessage.pinnedBy, originalMessage.pinned);
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications":{"pinnedMessages.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-pin/server/publications/pinnedMessages.js                                          //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.publish('pinnedMessages', function (rid, limit = 50) {
  if (!this.userId) {
    return this.ready();
  }

  const publication = this;
  const user = RocketChat.models.Users.findOneById(this.userId);

  if (!user) {
    return this.ready();
  }

  const cursorHandle = RocketChat.models.Messages.findPinnedByRoom(rid, {
    sort: {
      ts: -1
    },
    limit
  }).observeChanges({
    added(_id, record) {
      return publication.added('rocketchat_pinned_message', _id, record);
    },

    changed(_id, record) {
      return publication.changed('rocketchat_pinned_message', _id, record);
    },

    removed(_id) {
      return publication.removed('rocketchat_pinned_message', _id);
    }

  });
  this.ready();
  return this.onStop(function () {
    return cursorHandle.stop();
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"indexes.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-pin/server/startup/indexes.js                                                      //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.startup(function () {
  return Meteor.defer(function () {
    return RocketChat.models.Messages.tryEnsureIndex({
      'pinnedBy._id': 1
    }, {
      sparse: 1
    });
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:message-pin/server/settings.js");
require("/node_modules/meteor/rocketchat:message-pin/server/pinMessage.js");
require("/node_modules/meteor/rocketchat:message-pin/server/publications/pinnedMessages.js");
require("/node_modules/meteor/rocketchat:message-pin/server/startup/indexes.js");

/* Exports */
Package._define("rocketchat:message-pin");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_message-pin.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZXNzYWdlLXBpbi9zZXJ2ZXIvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVzc2FnZS1waW4vc2VydmVyL3Bpbk1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVzc2FnZS1waW4vc2VydmVyL3B1YmxpY2F0aW9ucy9waW5uZWRNZXNzYWdlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZXNzYWdlLXBpbi9zZXJ2ZXIvc3RhcnR1cC9pbmRleGVzLmpzIl0sIm5hbWVzIjpbIk1ldGVvciIsInN0YXJ0dXAiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGQiLCJ0eXBlIiwiZ3JvdXAiLCJtb2RlbHMiLCJQZXJtaXNzaW9ucyIsInVwc2VydCIsIiRzZXRPbkluc2VydCIsInJvbGVzIiwicmVjdXJzaXZlUmVtb3ZlIiwibXNnIiwiZGVlcCIsImdldCIsImF0dGFjaG1lbnRzIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwibmVzdGVkTXNnIiwic2hvdWxkQWRkIiwiYXR0YWNobWVudCIsInNvbWUiLCJtZXNzYWdlX2xpbmsiLCJtZXRob2RzIiwicGluTWVzc2FnZSIsIm1lc3NhZ2UiLCJwaW5uZWRBdCIsInVzZXJJZCIsIkVycm9yIiwibWV0aG9kIiwiYWN0aW9uIiwic3Vic2NyaXB0aW9uIiwiU3Vic2NyaXB0aW9ucyIsImZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZCIsInJpZCIsImZpZWxkcyIsIl9pZCIsIm9yaWdpbmFsTWVzc2FnZSIsIk1lc3NhZ2VzIiwiZmluZE9uZUJ5SWQiLCJjbG9uZUFuZFNhdmVBc0hpc3RvcnlCeUlkIiwibWUiLCJVc2VycyIsInBpbm5lZCIsIkRhdGUiLCJub3ciLCJwaW5uZWRCeSIsInVzZXJuYW1lIiwiY2FsbGJhY2tzIiwicnVuIiwic2V0UGlubmVkQnlJZEFuZFVzZXJJZCIsImZvckVhY2giLCJwdXNoIiwiY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsInRleHQiLCJhdXRob3JfbmFtZSIsInUiLCJhdXRob3JfaWNvbiIsImdldEF2YXRhclVybEZyb21Vc2VybmFtZSIsInRzIiwidW5waW5NZXNzYWdlIiwicHVibGlzaCIsImxpbWl0IiwicmVhZHkiLCJwdWJsaWNhdGlvbiIsInVzZXIiLCJjdXJzb3JIYW5kbGUiLCJmaW5kUGlubmVkQnlSb29tIiwic29ydCIsIm9ic2VydmVDaGFuZ2VzIiwiYWRkZWQiLCJyZWNvcmQiLCJjaGFuZ2VkIiwicmVtb3ZlZCIsIm9uU3RvcCIsInN0b3AiLCJkZWZlciIsInRyeUVuc3VyZUluZGV4Iiwic3BhcnNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsT0FBUCxDQUFlLFlBQVc7QUFDekJDLGFBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHNCQUF4QixFQUFnRCxJQUFoRCxFQUFzRDtBQUNyREMsVUFBTSxTQUQrQztBQUVyREMsV0FBTyxTQUY4QztBQUdyRCxjQUFVO0FBSDJDLEdBQXREO0FBS0EsU0FBT0osV0FBV0ssTUFBWCxDQUFrQkMsV0FBbEIsQ0FBOEJDLE1BQTlCLENBQXFDLGFBQXJDLEVBQW9EO0FBQzFEQyxrQkFBYztBQUNiQyxhQUFPLENBQUMsT0FBRCxFQUFVLFdBQVYsRUFBdUIsT0FBdkI7QUFETTtBQUQ0QyxHQUFwRCxDQUFQO0FBS0EsQ0FYRCxFOzs7Ozs7Ozs7OztBQ0FBLE1BQU1DLGtCQUFrQixDQUFDQyxHQUFELEVBQU1DLE9BQU8sQ0FBYixLQUFtQjtBQUMxQyxNQUFJLENBQUNELEdBQUwsRUFBVTtBQUNUO0FBQ0E7O0FBRUQsTUFBSUMsT0FBT1osV0FBV0MsUUFBWCxDQUFvQlksR0FBcEIsQ0FBd0IseUJBQXhCLENBQVgsRUFBK0Q7QUFDOUQsV0FBT0YsSUFBSUcsV0FBWDtBQUNBLFdBQU9ILEdBQVA7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Q0E7O0FBVGdILEdBQTdGLENBQXJCO0FBV0EsT0FBSzJCLEtBQUw7QUFDQSxTQUFPLEtBQUtXLE1BQUwsQ0FBWSxZQUFXO0FBQzdCLFdBQU9SLGFBQWFTLElBQWIsRUFBUDtBQUNBLEdBRk0sQ0FBUDtBQUdBLENBekJELEU7Ozs7Ozs7Ozs7O0FDQUE3RSxPQUFPQyxPQUFQLENBQWUsWUFBVztBQUN6QixTQUFPRCxPQUFPOEUsS0FBUCxDQUFhLFlBQVc7QUFDOUIsV0FBTzVFLFdBQVdLLE1BQVgsQ0FBa0JpQyxRQUFsQixDQUEyQnVDLGNBQTNCLENBQTBDO0FBQ2hELHNCQUFnQjtBQURnQyxLQUExQyxFQUVKO0FBQ0ZDLGNBQVE7QUFETixLQUZJLENBQVA7QUFLQSxHQU5NLENBQVA7QUFPQSxDQVJELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfbWVzc2FnZS1waW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01lc3NhZ2VfQWxsb3dQaW5uaW5nJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ01lc3NhZ2UnLFxuXHRcdCdwdWJsaWMnOiB0cnVlXG5cdH0pO1xuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMudXBzZXJ0KCdwaW4tbWVzc2FnZScsIHtcblx0XHQkc2V0T25JbnNlcnQ6IHtcblx0XHRcdHJvbGVzOiBbJ293bmVyJywgJ21vZGVyYXRvcicsICdhZG1pbiddXG5cdFx0fVxuXHR9KTtcbn0pO1xuIiwiY29uc3QgcmVjdXJzaXZlUmVtb3ZlID0gKG1zZywgZGVlcCA9IDEpID0+IHtcblx0aWYgKCFtc2cpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoZGVlcCA+IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNZXNzYWdlX1F1b3RlQ2hhaW5MaW1pdCcpKSB7XG5cdFx0ZGVsZXRlIG1zZy5hdHRhY2htZW50cztcblx0XHRyZXR1cm4gbXNnO1xuXHR9XG5cblx0bXNnLmF0dGFjaG1lbnRzID0gQXJyYXkuaXNBcnJheShtc2cuYXR0YWNobWVudHMpID8gbXNnLmF0dGFjaG1lbnRzLm1hcChcblx0XHRuZXN0ZWRNc2cgPT4gcmVjdXJzaXZlUmVtb3ZlKG5lc3RlZE1zZywgZGVlcCArIDEpXG5cdCkgOiBudWxsO1xuXG5cdHJldHVybiBtc2c7XG59O1xuXG5jb25zdCBzaG91bGRBZGQgPSAoYXR0YWNobWVudHMsIGF0dGFjaG1lbnQpID0+ICFhdHRhY2htZW50cy5zb21lKCh7bWVzc2FnZV9saW5rfSkgPT4gbWVzc2FnZV9saW5rICYmIG1lc3NhZ2VfbGluayA9PT0gYXR0YWNobWVudC5tZXNzYWdlX2xpbmspO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdHBpbk1lc3NhZ2UobWVzc2FnZSwgcGlubmVkQXQpIHtcblx0XHRjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0aWYgKCF1c2VySWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3Bpbk1lc3NhZ2UnXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNZXNzYWdlX0FsbG93UGlubmluZycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnTWVzc2FnZSBwaW5uaW5nIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdwaW5NZXNzYWdlJyxcblx0XHRcdFx0YWN0aW9uOiAnTWVzc2FnZV9waW5uaW5nJ1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQobWVzc2FnZS5yaWQsIE1ldGVvci51c2VySWQoKSwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdFx0aWYgKCFzdWJzY3JpcHRpb24pIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRsZXQgb3JpZ2luYWxNZXNzYWdlID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQobWVzc2FnZS5faWQpO1xuXHRcdGlmIChvcmlnaW5hbE1lc3NhZ2UgPT0gbnVsbCB8fCBvcmlnaW5hbE1lc3NhZ2UuX2lkID09IG51bGwpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtbWVzc2FnZScsICdNZXNzYWdlIHlvdSBhcmUgcGlubmluZyB3YXMgbm90IGZvdW5kJywge1xuXHRcdFx0XHRtZXRob2Q6ICdwaW5NZXNzYWdlJyxcblx0XHRcdFx0YWN0aW9uOiAnTWVzc2FnZV9waW5uaW5nJ1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly9JZiB3ZSBrZWVwIGhpc3Rvcnkgb2YgZWRpdHMsIGluc2VydCBhIG5ldyBtZXNzYWdlIHRvIHN0b3JlIGhpc3RvcnkgaW5mb3JtYXRpb25cblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01lc3NhZ2VfS2VlcEhpc3RvcnknKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY2xvbmVBbmRTYXZlQXNIaXN0b3J5QnlJZChtZXNzYWdlLl9pZCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpO1xuXG5cdFx0b3JpZ2luYWxNZXNzYWdlLnBpbm5lZCA9IHRydWU7XG5cdFx0b3JpZ2luYWxNZXNzYWdlLnBpbm5lZEF0ID0gcGlubmVkQXQgfHwgRGF0ZS5ub3c7XG5cdFx0b3JpZ2luYWxNZXNzYWdlLnBpbm5lZEJ5ID0ge1xuXHRcdFx0X2lkOiB1c2VySWQsXG5cdFx0XHR1c2VybmFtZTogbWUudXNlcm5hbWVcblx0XHR9O1xuXG5cdFx0b3JpZ2luYWxNZXNzYWdlID0gUm9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdiZWZvcmVTYXZlTWVzc2FnZScsIG9yaWdpbmFsTWVzc2FnZSk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5zZXRQaW5uZWRCeUlkQW5kVXNlcklkKG9yaWdpbmFsTWVzc2FnZS5faWQsIG9yaWdpbmFsTWVzc2FnZS5waW5uZWRCeSwgb3JpZ2luYWxNZXNzYWdlLnBpbm5lZCk7XG5cblx0XHRjb25zdCBhdHRhY2htZW50cyA9IFtdO1xuXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkob3JpZ2luYWxNZXNzYWdlLmF0dGFjaG1lbnRzKSkge1xuXHRcdFx0b3JpZ2luYWxNZXNzYWdlLmF0dGFjaG1lbnRzLmZvckVhY2goYXR0YWNobWVudCA9PiB7XG5cdFx0XHRcdGlmICghYXR0YWNobWVudC5tZXNzYWdlX2xpbmsgfHwgc2hvdWxkQWRkKGF0dGFjaG1lbnRzLCBhdHRhY2htZW50KSkge1xuXHRcdFx0XHRcdGF0dGFjaG1lbnRzLnB1c2goYXR0YWNobWVudCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKFxuXHRcdFx0J21lc3NhZ2VfcGlubmVkJyxcblx0XHRcdG9yaWdpbmFsTWVzc2FnZS5yaWQsXG5cdFx0XHQnJyxcblx0XHRcdG1lLFxuXHRcdFx0e1xuXHRcdFx0XHRhdHRhY2htZW50czogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHRleHQ6IG9yaWdpbmFsTWVzc2FnZS5tc2csXG5cdFx0XHRcdFx0XHRhdXRob3JfbmFtZTogb3JpZ2luYWxNZXNzYWdlLnUudXNlcm5hbWUsXG5cdFx0XHRcdFx0XHRhdXRob3JfaWNvbjogZ2V0QXZhdGFyVXJsRnJvbVVzZXJuYW1lKFxuXHRcdFx0XHRcdFx0XHRvcmlnaW5hbE1lc3NhZ2UudS51c2VybmFtZVxuXHRcdFx0XHRcdFx0KSxcblx0XHRcdFx0XHRcdHRzOiBvcmlnaW5hbE1lc3NhZ2UudHMsXG5cdFx0XHRcdFx0XHRhdHRhY2htZW50czogcmVjdXJzaXZlUmVtb3ZlKGF0dGFjaG1lbnRzKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdCk7XG5cdH0sXG5cdHVucGluTWVzc2FnZShtZXNzYWdlKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3VucGluTWVzc2FnZSdcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01lc3NhZ2VfQWxsb3dQaW5uaW5nJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdNZXNzYWdlIHBpbm5pbmcgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3VucGluTWVzc2FnZScsXG5cdFx0XHRcdGFjdGlvbjogJ01lc3NhZ2VfcGlubmluZydcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKG1lc3NhZ2UucmlkLCBNZXRlb3IudXNlcklkKCksIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXHRcdGlmICghc3Vic2NyaXB0aW9uKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0bGV0IG9yaWdpbmFsTWVzc2FnZSA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKG1lc3NhZ2UuX2lkKTtcblxuXHRcdGlmIChvcmlnaW5hbE1lc3NhZ2UgPT0gbnVsbCB8fCBvcmlnaW5hbE1lc3NhZ2UuX2lkID09IG51bGwpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtbWVzc2FnZScsICdNZXNzYWdlIHlvdSBhcmUgdW5waW5uaW5nIHdhcyBub3QgZm91bmQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3VucGluTWVzc2FnZScsXG5cdFx0XHRcdGFjdGlvbjogJ01lc3NhZ2VfcGlubmluZydcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vSWYgd2Uga2VlcCBoaXN0b3J5IG9mIGVkaXRzLCBpbnNlcnQgYSBuZXcgbWVzc2FnZSB0byBzdG9yZSBoaXN0b3J5IGluZm9ybWF0aW9uXG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNZXNzYWdlX0tlZXBIaXN0b3J5JykpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNsb25lQW5kU2F2ZUFzSGlzdG9yeUJ5SWQob3JpZ2luYWxNZXNzYWdlLl9pZCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChNZXRlb3IudXNlcklkKCkpO1xuXHRcdG9yaWdpbmFsTWVzc2FnZS5waW5uZWQgPSBmYWxzZTtcblx0XHRvcmlnaW5hbE1lc3NhZ2UucGlubmVkQnkgPSB7XG5cdFx0XHRfaWQ6IE1ldGVvci51c2VySWQoKSxcblx0XHRcdHVzZXJuYW1lOiBtZS51c2VybmFtZVxuXHRcdH07XG5cdFx0b3JpZ2luYWxNZXNzYWdlID0gUm9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdiZWZvcmVTYXZlTWVzc2FnZScsIG9yaWdpbmFsTWVzc2FnZSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuc2V0UGlubmVkQnlJZEFuZFVzZXJJZChvcmlnaW5hbE1lc3NhZ2UuX2lkLCBvcmlnaW5hbE1lc3NhZ2UucGlubmVkQnksIG9yaWdpbmFsTWVzc2FnZS5waW5uZWQpO1xuXHR9XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdwaW5uZWRNZXNzYWdlcycsIGZ1bmN0aW9uKHJpZCwgbGltaXQgPSA1MCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVhZHkoKTtcblx0fVxuXHRjb25zdCBwdWJsaWNhdGlvbiA9IHRoaXM7XG5cblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHRoaXMudXNlcklkKTtcblx0aWYgKCF1c2VyKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVhZHkoKTtcblx0fVxuXHRjb25zdCBjdXJzb3JIYW5kbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kUGlubmVkQnlSb29tKHJpZCwgeyBzb3J0OiB7IHRzOiAtMSB9LCBsaW1pdCB9KS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoX2lkLCByZWNvcmQpIHtcblx0XHRcdHJldHVybiBwdWJsaWNhdGlvbi5hZGRlZCgncm9ja2V0Y2hhdF9waW5uZWRfbWVzc2FnZScsIF9pZCwgcmVjb3JkKTtcblx0XHR9LFxuXHRcdGNoYW5nZWQoX2lkLCByZWNvcmQpIHtcblx0XHRcdHJldHVybiBwdWJsaWNhdGlvbi5jaGFuZ2VkKCdyb2NrZXRjaGF0X3Bpbm5lZF9tZXNzYWdlJywgX2lkLCByZWNvcmQpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChfaWQpIHtcblx0XHRcdHJldHVybiBwdWJsaWNhdGlvbi5yZW1vdmVkKCdyb2NrZXRjaGF0X3Bpbm5lZF9tZXNzYWdlJywgX2lkKTtcblx0XHR9XG5cdH0pO1xuXHR0aGlzLnJlYWR5KCk7XG5cdHJldHVybiB0aGlzLm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gY3Vyc29ySGFuZGxlLnN0b3AoKTtcblx0fSk7XG59KTtcbiIsIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gTWV0ZW9yLmRlZmVyKGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy50cnlFbnN1cmVJbmRleCh7XG5cdFx0XHQncGlubmVkQnkuX2lkJzogMVxuXHRcdH0sIHtcblx0XHRcdHNwYXJzZTogMVxuXHRcdH0pO1xuXHR9KTtcbn0pO1xuIl19
