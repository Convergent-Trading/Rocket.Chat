(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:mentions":{"server":{"server.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_mentions/server/server.js                                                             //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let MentionsServer;
module.watch(require("./Mentions"), {
  default(v) {
    MentionsServer = v;
  }

}, 1);
const mention = new MentionsServer({
  pattern: () => RocketChat.settings.get('UTF8_Names_Validation'),
  messageMaxAll: () => RocketChat.settings.get('Message_MaxAll'),
  getUsers: usernames => Meteor.users.find({
    username: {
      $in: _.unique(usernames)
    }
  }, {
    fields: {
      _id: true,
      username: true,
      name: 1
    }
  }).fetch(),
  getUser: userId => RocketChat.models.Users.findOneById(userId),
  getTotalChannelMembers: rid => RocketChat.models.Subscriptions.findByRoomId(rid).count(),
  getChannels: channels => RocketChat.models.Rooms.find({
    name: {
      $in: _.unique(channels)
    },
    t: 'c'
  }, {
    fields: {
      _id: 1,
      name: 1
    }
  }).fetch(),

  onMaxRoomMembersExceeded({
    sender,
    rid
  }) {
    // Get the language of the user for the error notification.
    const language = this.getUser(sender._id).language;

    const msg = TAPi18n.__('Group_mentions_disabled_x_members', {
      total: this.messageMaxAll
    }, language);

    RocketChat.Notifications.notifyUser(sender._id, 'message', {
      _id: Random.id(),
      rid,
      ts: new Date(),
      msg,
      groupable: false
    }); // Also throw to stop propagation of 'sendMessage'.

    throw new Meteor.Error('error-action-not-allowed', msg, {
      method: 'filterATAllTag',
      action: msg
    });
  }

});
RocketChat.callbacks.add('beforeSaveMessage', message => mention.execute(message), RocketChat.callbacks.priority.HIGH, 'mentions');
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods":{"getUserMentionsByChannel.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_mentions/server/methods/getUserMentionsByChannel.js                                   //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
Meteor.methods({
  getUserMentionsByChannel({
    roomId,
    options
  }) {
    check(roomId, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getUserMentionsByChannel'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(roomId);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'getUserMentionsByChannel'
      });
    }

    const user = RocketChat.models.Users.findOneById(Meteor.userId());
    return RocketChat.models.Messages.findVisibleByMentionAndRoomId(user.username, roomId, options).fetch();
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"Mentions.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_mentions/server/Mentions.js                                                           //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
module.export({
  default: () => MentionsServer
});
let Mentions;
module.watch(require("../Mentions"), {
  default(v) {
    Mentions = v;
  }

}, 0);

class MentionsServer extends Mentions {
  constructor(args) {
    super(args);
    this.messageMaxAll = args.messageMaxAll;
    this.getChannel = args.getChannel;
    this.getChannels = args.getChannels;
    this.getUsers = args.getUsers;
    this.getUser = args.getUser;
    this.getTotalChannelMembers = args.getTotalChannelMembers;

    this.onMaxRoomMembersExceeded = args.onMaxRoomMembersExceeded || (() => {});
  }

  set getUsers(m) {
    this._getUsers = m;
  }

  get getUsers() {
    return typeof this._getUsers === 'function' ? this._getUsers : () => this._getUsers;
  }

  set getChannels(m) {
    this._getChannels = m;
  }

  get getChannels() {
    return typeof this._getChannels === 'function' ? this._getChannels : () => this._getChannels;
  }

  set getChannel(m) {
    this._getChannel = m;
  }

  get getChannel() {
    return typeof this._getChannel === 'function' ? this._getChannel : () => this._getChannel;
  }

  set messageMaxAll(m) {
    this._messageMaxAll = m;
  }

  get messageMaxAll() {
    return typeof this._messageMaxAll === 'function' ? this._messageMaxAll() : this._messageMaxAll;
  }

  getUsersByMentions({
    msg,
    rid,
    u: sender
  }) {
    let mentions = this.getUserMentions(msg);
    const mentionsAll = [];
    const userMentions = [];
    mentions.forEach(m => {
      const mention = m.trim().substr(1);

      if (mention !== 'all' && mention !== 'here') {
        return userMentions.push(mention);
      }

      if (this.messageMaxAll > 0 && this.getTotalChannelMembers(rid) > this.messageMaxAll) {
        return this.onMaxRoomMembersExceeded({
          sender,
          rid
        });
      }

      mentionsAll.push({
        _id: mention,
        username: mention
      });
    });
    mentions = userMentions.length ? this.getUsers(userMentions) : [];
    return [...mentionsAll, ...mentions];
  }

  getChannelbyMentions({
    msg
  }) {
    const channels = this.getChannelMentions(msg);
    return this.getChannels(channels.map(c => c.trim().substr(1)));
  }

  execute(message) {
    const mentionsAll = this.getUsersByMentions(message);
    const channels = this.getChannelbyMentions(message);
    message.mentions = mentionsAll;
    message.channels = channels;
    return message;
  }

}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"Mentions.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_mentions/Mentions.js                                                                  //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
module.exportDefault(class {
  constructor({
    pattern,
    useRealName,
    me
  }) {
    this.pattern = pattern;
    this.useRealName = useRealName;
    this.me = me;
  }

  set me(m) {
    this._me = m;
  }

  get me() {
    return typeof this._me === 'function' ? this._me() : this._me;
  }

  set pattern(p) {
    this._pattern = p;
  }

  get pattern() {
    return typeof this._pattern === 'function' ? this._pattern() : this._pattern;
  }

  set useRealName(s) {
    this._useRealName = s;
  }

  get useRealName() {
    return typeof this._useRealName === 'function' ? this._useRealName() : this._useRealName;
  }

  get userMentionRegex() {
    return new RegExp(`(^|\\s|<p>)@(${this.pattern})`, 'gm');
  }

  get channelMentionRegex() {
    return new RegExp(`(^|\\s|<p>)#(${this.pattern})`, 'gm');
  }

  replaceUsers(str, message, me) {
    return str.replace(this.userMentionRegex, (match, prefix, username) => {
      if (['all', 'here'].includes(username)) {
        return `${prefix}<a class="mention-link mention-link-me mention-link-all">@${username}</a>`;
      }

      const mentionObj = message.mentions && message.mentions.find(m => m.username === username);

      if (message.temp == null && mentionObj == null) {
        return match;
      }

      const name = this.useRealName && mentionObj && s.escapeHTML(mentionObj.name);
      return `${prefix}<a class="mention-link ${username === me ? 'mention-link-me' : ''}" data-username="${username}" title="${name ? username : ''}">${name || `@${username}`}</a>`;
    });
  }

  replaceChannels(str, message) {
    //since apostrophe escaped contains # we need to unescape it
    return str.replace(/&#39;/g, '\'').replace(this.channelMentionRegex, (match, prefix, name) => {
      if (!message.temp && !(message.channels && message.channels.find(c => c.name === name))) {
        return match;
      }

      return `${prefix}<a class="mention-link" data-channel="${name}">${`#${name}`}</a>`;
    });
  }

  getUserMentions(str) {
    return (str.match(this.userMentionRegex) || []).map(match => match.trim());
  }

  getChannelMentions(str) {
    return (str.match(this.channelMentionRegex) || []).map(match => match.trim());
  }

  parse(message) {
    let msg = message && message.html || '';

    if (!msg.trim()) {
      return message;
    }

    msg = this.replaceUsers(msg, message, this.me);
    msg = this.replaceChannels(msg, message, this.me);
    message.html = msg;
    return message;
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:mentions/server/server.js");
require("/node_modules/meteor/rocketchat:mentions/server/methods/getUserMentionsByChannel.js");

/* Exports */
Package._define("rocketchat:mentions");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_mentions.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZW50aW9ucy9zZXJ2ZXIvc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0Om1lbnRpb25zL3NlcnZlci9tZXRob2RzL2dldFVzZXJNZW50aW9uc0J5Q2hhbm5lbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZW50aW9ucy9zZXJ2ZXIvTWVudGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVudGlvbnMvTWVudGlvbnMuanMiXSwibmFtZXMiOlsiXyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiTWVudGlvbnNTZXJ2ZXIiLCJtZW50aW9uIiwicGF0dGVybiIsIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImdldCIsIm1lc3NhZ2VNYXhBbGwiLCJnZXRVc2VycyIsInVzZXJuYW1lcyIsIk1ldGVvciIsInVzZXJzIiwiZmluZCIsInVzZXJuYW1lIiwiJGluIiwidW5pcXVlIiwiZmllbGRzIiwiX2lkIiwibmFtZSIsImZldGNoIiwiZ2V0VXNlciIsInVzZXJJZCIsIm1vZGVscyIsIlVzZXJzIiwiZmluZE9uZUJ5SWQiLCJnZXRUb3RhbENoYW5uZWxNZW1iZXJzIiwicmlkIiwiU3Vic2NyaXB0aW9ucyIsImZpbmRCeVJvb21JZCIsImNvdW50IiwiZ2V0Q2hhbm5lbHMiLCJjaGFubmVscyIsIlJvb21zIiwidCIsIm9uTWF4Um9vbU1lbWJlcnNFeGNlZWRlZCIsInNlbmRlciIsImxhbmd1YWdlIiwibXNnIiwiVEFQaTE4biIsIl9fIiwidG90YWwiLCJOb3RpZmljYXRpb25zIiwibm90aWZ5VXNlciIsIlJhbmRvbSIsImlkIiwidHMiLCJEYXRlIiwiZ3JvdXBhYmxlIiwiRXJyb3IiLCJtZXRob2QiLCJhY3Rpb24iLCJjYWxsYmFja3MiLCJhZGQiLCJtZXNzYWdlIiwiZXhlY3V0ZSIsInByaW9yaXR5IiwiSElHSCIsIm1ldGhvZHMiLCJnZXRVc2VyTWVudGlvbnNCeUNoYW5uZWwiLCJyb29tSWQiLCJvcHRpb25zIiwiY2hlY2siLCJTdHJpbmciLCJyb29tIiwidXNlciIsIk1lc3NhZ2VzIiwiZmluZFZpc2libGVCeU1lbnRpb25BbmRSb29tSWQiLCJleHBvcnQiLCJNZW50aW9ucyIsImNvbnN0cnVjdG9yIiwiYXJncyIsImdldENoYW5uZWwiLCJtIiwiX2dldFVzZXJzIiwiX2dldENoYW5uZWxzIiwiX2dldENoYW5uZWwiLCJfbWVzc2FnZU1heEFsbCIsImdldFVzZXJzQnlNZW50aW9ucyIsInUiLCJtZW50aW9ucyIsImdldFVzZXJNZW50aW9ucyIsIm1lbnRpb25zQWxsIiwidXNlck1lbnRpb25zIiwiZm9yRWFjaCIsInRyaW0iLCJzdWJzdHIiLCJwdXNoIiwibGVuZ3RoIiwiZ2V0Q2hhbm5lbGJ5TWVudGlvbnMiLCJnZXRDaGFubmVsTWVudGlvbnMiLCJtYXAiLCJjIiwicyIsImV4cG9ydERlZmF1bHQiLCJ1c2VSZWFsTmFtZSIsIm1lIiwiX21lIiwicCIsIl9wYXR0ZXJuIiwiX3VzZVJlYWxOYW1lIiwidXNlck1lbnRpb25SZWdleCIsIlJlZ0V4cCIsImNoYW5uZWxNZW50aW9uUmVnZXgiLCJyZXBsYWNlVXNlcnMiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJwcmVmaXgiLCJpbmNsdWRlcyIsIm1lbnRpb25PYmoiLCJ0ZW1wIiwiZXNjYXBlSFRNTCIsInJlcGxhY2VDaGFubmVscyIsInBhcnNlIiwiaHRtbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFBd0QsSUFBSUMsY0FBSjtBQUFtQkwsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0MscUJBQWVELENBQWY7QUFBaUI7O0FBQTdCLENBQW5DLEVBQWtFLENBQWxFO0FBR2pGLE1BQU1FLFVBQVUsSUFBSUQsY0FBSixDQUFtQjtBQUNsQ0UsV0FBUyxNQUFNQyxXQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3Qix1QkFBeEIsQ0FEbUI7QUFFbENDLGlCQUFlLE1BQU1ILFdBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLGdCQUF4QixDQUZhO0FBR2xDRSxZQUFXQyxTQUFELElBQWVDLE9BQU9DLEtBQVAsQ0FBYUMsSUFBYixDQUFrQjtBQUFFQyxjQUFVO0FBQUNDLFdBQUtuQixFQUFFb0IsTUFBRixDQUFTTixTQUFUO0FBQU47QUFBWixHQUFsQixFQUEyRDtBQUFFTyxZQUFRO0FBQUNDLFdBQUssSUFBTjtBQUFZSixnQkFBVSxJQUF0QjtBQUE0QkssWUFBTTtBQUFsQztBQUFWLEdBQTNELEVBQTZHQyxLQUE3RyxFQUhTO0FBSWxDQyxXQUFVQyxNQUFELElBQVlqQixXQUFXa0IsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JDLFdBQXhCLENBQW9DSCxNQUFwQyxDQUphO0FBS2xDSSwwQkFBeUJDLEdBQUQsSUFBU3RCLFdBQVdrQixNQUFYLENBQWtCSyxhQUFsQixDQUFnQ0MsWUFBaEMsQ0FBNkNGLEdBQTdDLEVBQWtERyxLQUFsRCxFQUxDO0FBTWxDQyxlQUFjQyxRQUFELElBQWMzQixXQUFXa0IsTUFBWCxDQUFrQlUsS0FBbEIsQ0FBd0JwQixJQUF4QixDQUE2QjtBQUFFTSxVQUFNO0FBQUNKLFdBQUtuQixFQUFFb0IsTUFBRixDQUFTZ0IsUUFBVDtBQUFOLEtBQVI7QUFBbUNFLE9BQUc7QUFBdEMsR0FBN0IsRUFBMEU7QUFBRWpCLFlBQVE7QUFBQ0MsV0FBSyxDQUFOO0FBQVNDLFlBQU07QUFBZjtBQUFWLEdBQTFFLEVBQXlHQyxLQUF6RyxFQU5POztBQU9sQ2UsMkJBQXlCO0FBQUVDLFVBQUY7QUFBVVQ7QUFBVixHQUF6QixFQUEwQztBQUN6QztBQUNBLFVBQU1VLFdBQVcsS0FBS2hCLE9BQUwsQ0FBYWUsT0FBT2xCLEdBQXBCLEVBQXlCbUIsUUFBMUM7O0FBQ0EsVUFBTUMsTUFBTUMsUUFBUUMsRUFBUixDQUFXLG1DQUFYLEVBQWdEO0FBQUVDLGFBQU8sS0FBS2pDO0FBQWQsS0FBaEQsRUFBK0U2QixRQUEvRSxDQUFaOztBQUVBaEMsZUFBV3FDLGFBQVgsQ0FBeUJDLFVBQXpCLENBQW9DUCxPQUFPbEIsR0FBM0MsRUFBZ0QsU0FBaEQsRUFBMkQ7QUFDMURBLFdBQUswQixPQUFPQyxFQUFQLEVBRHFEO0FBRTFEbEIsU0FGMEQ7QUFHMURtQixVQUFJLElBQUlDLElBQUosRUFIc0Q7QUFJMURULFNBSjBEO0FBSzFEVSxpQkFBVztBQUwrQyxLQUEzRCxFQUx5QyxDQWF6Qzs7QUFDQSxVQUFNLElBQUlyQyxPQUFPc0MsS0FBWCxDQUFpQiwwQkFBakIsRUFBNkNYLEdBQTdDLEVBQWtEO0FBQ3ZEWSxjQUFRLGdCQUQrQztBQUV2REMsY0FBUWI7QUFGK0MsS0FBbEQsQ0FBTjtBQUlBOztBQXpCaUMsQ0FBbkIsQ0FBaEI7QUEyQkFqQyxXQUFXK0MsU0FBWCxDQUFxQkMsR0FBckIsQ0FBeUIsbUJBQXpCLEVBQStDQyxPQUFELElBQWFuRCxRQUFRb0QsT0FBUixDQUFnQkQsT0FBaEIsQ0FBM0QsRUFBcUZqRCxXQUFXK0MsU0FBWCxDQUFxQkksUUFBckIsQ0FBOEJDLElBQW5ILEVBQXlILFVBQXpILEU7Ozs7Ozs7Ozs7O0FDOUJBOUMsT0FBTytDLE9BQVAsQ0FBZTtBQUNkQywyQkFBeUI7QUFBRUMsVUFBRjtBQUFVQztBQUFWLEdBQXpCLEVBQThDO0FBQzdDQyxVQUFNRixNQUFOLEVBQWNHLE1BQWQ7O0FBRUEsUUFBSSxDQUFDcEQsT0FBT1csTUFBUCxFQUFMLEVBQXNCO0FBQ3JCLFlBQU0sSUFBSVgsT0FBT3NDLEtBQVgsQ0FBaUIsb0JBQWpCLEVBQXVDLGNBQXZDLEVBQXVEO0FBQUVDLGdCQUFRO0FBQVYsT0FBdkQsQ0FBTjtBQUNBOztBQUVELFVBQU1jLE9BQU8zRCxXQUFXa0IsTUFBWCxDQUFrQlUsS0FBbEIsQ0FBd0JSLFdBQXhCLENBQW9DbUMsTUFBcEMsQ0FBYjs7QUFFQSxRQUFJLENBQUNJLElBQUwsRUFBVztBQUNWLFlBQU0sSUFBSXJELE9BQU9zQyxLQUFYLENBQWlCLG9CQUFqQixFQUF1QyxjQUF2QyxFQUF1RDtBQUFFQyxnQkFBUTtBQUFWLE9BQXZELENBQU47QUFDQTs7QUFFRCxVQUFNZSxPQUFPNUQsV0FBV2tCLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCQyxXQUF4QixDQUFvQ2QsT0FBT1csTUFBUCxFQUFwQyxDQUFiO0FBRUEsV0FBT2pCLFdBQVdrQixNQUFYLENBQWtCMkMsUUFBbEIsQ0FBMkJDLDZCQUEzQixDQUF5REYsS0FBS25ELFFBQTlELEVBQXdFOEMsTUFBeEUsRUFBZ0ZDLE9BQWhGLEVBQXlGekMsS0FBekYsRUFBUDtBQUNBOztBQWpCYSxDQUFmLEU7Ozs7Ozs7Ozs7O0FDQUF2QixPQUFPdUUsTUFBUCxDQUFjO0FBQUNwRSxXQUFRLE1BQUlFO0FBQWIsQ0FBZDtBQUE0QyxJQUFJbUUsUUFBSjtBQUFheEUsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGFBQVIsQ0FBYixFQUFvQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ29FLGVBQVNwRSxDQUFUO0FBQVc7O0FBQXZCLENBQXBDLEVBQTZELENBQTdEOztBQUsxQyxNQUFNQyxjQUFOLFNBQTZCbUUsUUFBN0IsQ0FBc0M7QUFDcERDLGNBQVlDLElBQVosRUFBa0I7QUFDakIsVUFBTUEsSUFBTjtBQUNBLFNBQUsvRCxhQUFMLEdBQXFCK0QsS0FBSy9ELGFBQTFCO0FBQ0EsU0FBS2dFLFVBQUwsR0FBa0JELEtBQUtDLFVBQXZCO0FBQ0EsU0FBS3pDLFdBQUwsR0FBbUJ3QyxLQUFLeEMsV0FBeEI7QUFDQSxTQUFLdEIsUUFBTCxHQUFnQjhELEtBQUs5RCxRQUFyQjtBQUNBLFNBQUtZLE9BQUwsR0FBZWtELEtBQUtsRCxPQUFwQjtBQUNBLFNBQUtLLHNCQUFMLEdBQThCNkMsS0FBSzdDLHNCQUFuQzs7QUFDQSxTQUFLUyx3QkFBTCxHQUFnQ29DLEtBQUtwQyx3QkFBTCxLQUFrQyxNQUFNLENBQUUsQ0FBMUMsQ0FBaEM7QUFDQTs7QUFDRCxNQUFJMUIsUUFBSixDQUFhZ0UsQ0FBYixFQUFnQjtBQUNmLFNBQUtDLFNBQUwsR0FBaUJELENBQWpCO0FBQ0E7O0FBQ0QsTUFBSWhFLFFBQUosR0FBZTtBQUNkLFdBQU8sT0FBTyxLQUFLaUUsU0FBWixLQUEwQixVQUExQixHQUF1QyxLQUFLQSxTQUE1QyxHQUF3RCxNQUFNLEtBQUtBLFNBQTFFO0FBQ0E7O0FBQ0QsTUFBSTNDLFdBQUosQ0FBZ0IwQyxDQUFoQixFQUFtQjtBQUNsQixTQUFLRSxZQUFMLEdBQW9CRixDQUFwQjtBQUNBOztBQUNELE1BQUkxQyxXQUFKLEdBQWtCO0FBQ2pCLFdBQU8sT0FBTyxLQUFLNEMsWUFBWixLQUE2QixVQUE3QixHQUEwQyxLQUFLQSxZQUEvQyxHQUE4RCxNQUFNLEtBQUtBLFlBQWhGO0FBQ0E7O0FBQ0QsTUFBSUgsVUFBSixDQUFlQyxDQUFmLEVBQWtCO0FBQ2pCLFNBQUtHLFdBQUwsR0FBbUJILENBQW5CO0FBQ0E7O0FBQ0QsTUFBSUQsVUFBSixHQUFpQjtBQUNoQixXQUFPLE9BQU8sS0FBS0ksV0FBWixLQUE0QixVQUE1QixHQUF5QyxLQUFLQSxXQUE5QyxHQUE0RCxNQUFNLEtBQUtBLFdBQTlFO0FBQ0E7O0FBQ0QsTUFBSXBFLGFBQUosQ0FBa0JpRSxDQUFsQixFQUFxQjtBQUNwQixTQUFLSSxjQUFMLEdBQXNCSixDQUF0QjtBQUNBOztBQUNELE1BQUlqRSxhQUFKLEdBQW9CO0FBQ25CLFdBQU8sT0FBTyxLQUFLcUUsY0FBWixLQUErQixVQUEvQixHQUE0QyxLQUFLQSxjQUFMLEVBQTVDLEdBQW9FLEtBQUtBLGNBQWhGO0FBQ0E7O0FBQ0RDLHFCQUFtQjtBQUFDeEMsT0FBRDtBQUFNWCxPQUFOO0FBQVdvRCxPQUFHM0M7QUFBZCxHQUFuQixFQUEwQztBQUN6QyxRQUFJNEMsV0FBVyxLQUFLQyxlQUFMLENBQXFCM0MsR0FBckIsQ0FBZjtBQUNBLFVBQU00QyxjQUFjLEVBQXBCO0FBQ0EsVUFBTUMsZUFBZSxFQUFyQjtBQUVBSCxhQUFTSSxPQUFULENBQWtCWCxDQUFELElBQU87QUFDdkIsWUFBTXRFLFVBQVVzRSxFQUFFWSxJQUFGLEdBQVNDLE1BQVQsQ0FBZ0IsQ0FBaEIsQ0FBaEI7O0FBQ0EsVUFBSW5GLFlBQVksS0FBWixJQUFxQkEsWUFBWSxNQUFyQyxFQUE2QztBQUM1QyxlQUFPZ0YsYUFBYUksSUFBYixDQUFrQnBGLE9BQWxCLENBQVA7QUFDQTs7QUFDRCxVQUFJLEtBQUtLLGFBQUwsR0FBcUIsQ0FBckIsSUFBMEIsS0FBS2tCLHNCQUFMLENBQTRCQyxHQUE1QixJQUFtQyxLQUFLbkIsYUFBdEUsRUFBcUY7QUFDcEYsZUFBTyxLQUFLMkIsd0JBQUwsQ0FBOEI7QUFBRUMsZ0JBQUY7QUFBVVQ7QUFBVixTQUE5QixDQUFQO0FBQ0E7O0FBQ0R1RCxrQkFBWUssSUFBWixDQUFpQjtBQUNoQnJFLGFBQUtmLE9BRFc7QUFFaEJXLGtCQUFVWDtBQUZNLE9BQWpCO0FBSUEsS0FaRDtBQWFBNkUsZUFBV0csYUFBYUssTUFBYixHQUFzQixLQUFLL0UsUUFBTCxDQUFjMEUsWUFBZCxDQUF0QixHQUFvRCxFQUEvRDtBQUNBLFdBQU8sQ0FBQyxHQUFHRCxXQUFKLEVBQWlCLEdBQUdGLFFBQXBCLENBQVA7QUFDQTs7QUFDRFMsdUJBQXFCO0FBQUNuRDtBQUFELEdBQXJCLEVBQTRCO0FBQzNCLFVBQU1OLFdBQVcsS0FBSzBELGtCQUFMLENBQXdCcEQsR0FBeEIsQ0FBakI7QUFDQSxXQUFPLEtBQUtQLFdBQUwsQ0FBaUJDLFNBQVMyRCxHQUFULENBQWFDLEtBQUtBLEVBQUVQLElBQUYsR0FBU0MsTUFBVCxDQUFnQixDQUFoQixDQUFsQixDQUFqQixDQUFQO0FBQ0E7O0FBQ0QvQixVQUFRRCxPQUFSLEVBQWlCO0FBQ2hCLFVBQU00QixjQUFjLEtBQUtKLGtCQUFMLENBQXdCeEIsT0FBeEIsQ0FBcEI7QUFDQSxVQUFNdEIsV0FBVyxLQUFLeUQsb0JBQUwsQ0FBMEJuQyxPQUExQixDQUFqQjtBQUVBQSxZQUFRMEIsUUFBUixHQUFtQkUsV0FBbkI7QUFDQTVCLFlBQVF0QixRQUFSLEdBQW1CQSxRQUFuQjtBQUVBLFdBQU9zQixPQUFQO0FBQ0E7O0FBcEVtRCxDOzs7Ozs7Ozs7OztBQ0xyRCxJQUFJdUMsQ0FBSjtBQUFNaEcsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLG1CQUFSLENBQWIsRUFBMEM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUM0RixRQUFFNUYsQ0FBRjtBQUFJOztBQUFoQixDQUExQyxFQUE0RCxDQUE1RDtBQUFOSixPQUFPaUcsYUFBUCxDQUtlLE1BQU07QUFDcEJ4QixjQUFZO0FBQUNsRSxXQUFEO0FBQVUyRixlQUFWO0FBQXVCQztBQUF2QixHQUFaLEVBQXdDO0FBQ3ZDLFNBQUs1RixPQUFMLEdBQWVBLE9BQWY7QUFDQSxTQUFLMkYsV0FBTCxHQUFtQkEsV0FBbkI7QUFDQSxTQUFLQyxFQUFMLEdBQVVBLEVBQVY7QUFDQTs7QUFDRCxNQUFJQSxFQUFKLENBQU92QixDQUFQLEVBQVU7QUFDVCxTQUFLd0IsR0FBTCxHQUFXeEIsQ0FBWDtBQUNBOztBQUNELE1BQUl1QixFQUFKLEdBQVM7QUFDUixXQUFPLE9BQU8sS0FBS0MsR0FBWixLQUFvQixVQUFwQixHQUFpQyxLQUFLQSxHQUFMLEVBQWpDLEdBQThDLEtBQUtBLEdBQTFEO0FBQ0E7O0FBQ0QsTUFBSTdGLE9BQUosQ0FBWThGLENBQVosRUFBZTtBQUNkLFNBQUtDLFFBQUwsR0FBZ0JELENBQWhCO0FBQ0E7O0FBQ0QsTUFBSTlGLE9BQUosR0FBYztBQUNiLFdBQU8sT0FBTyxLQUFLK0YsUUFBWixLQUF5QixVQUF6QixHQUFzQyxLQUFLQSxRQUFMLEVBQXRDLEdBQXdELEtBQUtBLFFBQXBFO0FBQ0E7O0FBQ0QsTUFBSUosV0FBSixDQUFnQkYsQ0FBaEIsRUFBbUI7QUFDbEIsU0FBS08sWUFBTCxHQUFvQlAsQ0FBcEI7QUFDQTs7QUFDRCxNQUFJRSxXQUFKLEdBQWtCO0FBQ2pCLFdBQU8sT0FBTyxLQUFLSyxZQUFaLEtBQTZCLFVBQTdCLEdBQTBDLEtBQUtBLFlBQUwsRUFBMUMsR0FBZ0UsS0FBS0EsWUFBNUU7QUFDQTs7QUFDRCxNQUFJQyxnQkFBSixHQUF1QjtBQUN0QixXQUFPLElBQUlDLE1BQUosQ0FBWSxnQkFBZ0IsS0FBS2xHLE9BQVMsR0FBMUMsRUFBOEMsSUFBOUMsQ0FBUDtBQUNBOztBQUNELE1BQUltRyxtQkFBSixHQUEwQjtBQUN6QixXQUFPLElBQUlELE1BQUosQ0FBWSxnQkFBZ0IsS0FBS2xHLE9BQVMsR0FBMUMsRUFBOEMsSUFBOUMsQ0FBUDtBQUNBOztBQUNEb0csZUFBYUMsR0FBYixFQUFrQm5ELE9BQWxCLEVBQTJCMEMsRUFBM0IsRUFBK0I7QUFDOUIsV0FBT1MsSUFBSUMsT0FBSixDQUFZLEtBQUtMLGdCQUFqQixFQUFtQyxDQUFDTSxLQUFELEVBQVFDLE1BQVIsRUFBZ0I5RixRQUFoQixLQUE2QjtBQUN0RSxVQUFJLENBQUMsS0FBRCxFQUFRLE1BQVIsRUFBZ0IrRixRQUFoQixDQUF5Qi9GLFFBQXpCLENBQUosRUFBd0M7QUFDdkMsZUFBUSxHQUFHOEYsTUFBUSw2REFBNkQ5RixRQUFVLE1BQTFGO0FBQ0E7O0FBRUQsWUFBTWdHLGFBQWF4RCxRQUFRMEIsUUFBUixJQUFvQjFCLFFBQVEwQixRQUFSLENBQWlCbkUsSUFBakIsQ0FBc0I0RCxLQUFLQSxFQUFFM0QsUUFBRixLQUFlQSxRQUExQyxDQUF2Qzs7QUFDQSxVQUFJd0MsUUFBUXlELElBQVIsSUFBZ0IsSUFBaEIsSUFBd0JELGNBQWMsSUFBMUMsRUFBZ0Q7QUFDL0MsZUFBT0gsS0FBUDtBQUNBOztBQUNELFlBQU14RixPQUFPLEtBQUs0RSxXQUFMLElBQW9CZSxVQUFwQixJQUFrQ2pCLEVBQUVtQixVQUFGLENBQWFGLFdBQVczRixJQUF4QixDQUEvQztBQUVBLGFBQVEsR0FBR3lGLE1BQVEsMEJBQTBCOUYsYUFBYWtGLEVBQWIsR0FBa0IsaUJBQWxCLEdBQXNDLEVBQUksb0JBQW9CbEYsUUFBVSxZQUFZSyxPQUFPTCxRQUFQLEdBQWtCLEVBQUksS0FBS0ssUUFBUyxJQUFJTCxRQUFVLEVBQUcsTUFBdEw7QUFDQSxLQVpNLENBQVA7QUFhQTs7QUFDRG1HLGtCQUFnQlIsR0FBaEIsRUFBcUJuRCxPQUFyQixFQUE4QjtBQUM3QjtBQUNBLFdBQU9tRCxJQUFJQyxPQUFKLENBQVksUUFBWixFQUFzQixJQUF0QixFQUE0QkEsT0FBNUIsQ0FBb0MsS0FBS0gsbUJBQXpDLEVBQThELENBQUNJLEtBQUQsRUFBUUMsTUFBUixFQUFnQnpGLElBQWhCLEtBQXlCO0FBQzdGLFVBQUksQ0FBQ21DLFFBQVF5RCxJQUFULElBQWlCLEVBQUV6RCxRQUFRdEIsUUFBUixJQUFvQnNCLFFBQVF0QixRQUFSLENBQWlCbkIsSUFBakIsQ0FBc0IrRSxLQUFLQSxFQUFFekUsSUFBRixLQUFXQSxJQUF0QyxDQUF0QixDQUFyQixFQUF5RjtBQUN4RixlQUFPd0YsS0FBUDtBQUNBOztBQUVELGFBQVEsR0FBR0MsTUFBUSx5Q0FBeUN6RixJQUFNLEtBQU0sSUFBSUEsSUFBTSxFQUFHLE1BQXJGO0FBQ0EsS0FOTSxDQUFQO0FBT0E7O0FBQ0Q4RCxrQkFBZ0J3QixHQUFoQixFQUFxQjtBQUNwQixXQUFPLENBQUNBLElBQUlFLEtBQUosQ0FBVSxLQUFLTixnQkFBZixLQUFvQyxFQUFyQyxFQUF5Q1YsR0FBekMsQ0FBNkNnQixTQUFTQSxNQUFNdEIsSUFBTixFQUF0RCxDQUFQO0FBQ0E7O0FBQ0RLLHFCQUFtQmUsR0FBbkIsRUFBd0I7QUFDdkIsV0FBTyxDQUFDQSxJQUFJRSxLQUFKLENBQVUsS0FBS0osbUJBQWYsS0FBdUMsRUFBeEMsRUFBNENaLEdBQTVDLENBQWdEZ0IsU0FBU0EsTUFBTXRCLElBQU4sRUFBekQsQ0FBUDtBQUNBOztBQUNENkIsUUFBTTVELE9BQU4sRUFBZTtBQUNkLFFBQUloQixNQUFPZ0IsV0FBV0EsUUFBUTZELElBQXBCLElBQTZCLEVBQXZDOztBQUNBLFFBQUksQ0FBQzdFLElBQUkrQyxJQUFKLEVBQUwsRUFBaUI7QUFDaEIsYUFBTy9CLE9BQVA7QUFDQTs7QUFDRGhCLFVBQU0sS0FBS2tFLFlBQUwsQ0FBa0JsRSxHQUFsQixFQUF1QmdCLE9BQXZCLEVBQWdDLEtBQUswQyxFQUFyQyxDQUFOO0FBQ0ExRCxVQUFNLEtBQUsyRSxlQUFMLENBQXFCM0UsR0FBckIsRUFBMEJnQixPQUExQixFQUFtQyxLQUFLMEMsRUFBeEMsQ0FBTjtBQUNBMUMsWUFBUTZELElBQVIsR0FBZTdFLEdBQWY7QUFDQSxXQUFPZ0IsT0FBUDtBQUNBOztBQXRFbUIsQ0FMckIsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9tZW50aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IE1lbnRpb25zU2VydmVyIGZyb20gJy4vTWVudGlvbnMnO1xuXG5jb25zdCBtZW50aW9uID0gbmV3IE1lbnRpb25zU2VydmVyKHtcblx0cGF0dGVybjogKCkgPT4gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VURjhfTmFtZXNfVmFsaWRhdGlvbicpLFxuXHRtZXNzYWdlTWF4QWxsOiAoKSA9PiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWVzc2FnZV9NYXhBbGwnKSxcblx0Z2V0VXNlcnM6ICh1c2VybmFtZXMpID0+IE1ldGVvci51c2Vycy5maW5kKHsgdXNlcm5hbWU6IHskaW46IF8udW5pcXVlKHVzZXJuYW1lcyl9fSwgeyBmaWVsZHM6IHtfaWQ6IHRydWUsIHVzZXJuYW1lOiB0cnVlLCBuYW1lOiAxIH19KS5mZXRjaCgpLFxuXHRnZXRVc2VyOiAodXNlcklkKSA9PiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpLFxuXHRnZXRUb3RhbENoYW5uZWxNZW1iZXJzOiAocmlkKSA9PiBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVJvb21JZChyaWQpLmNvdW50KCksXG5cdGdldENoYW5uZWxzOiAoY2hhbm5lbHMpID0+IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmQoeyBuYW1lOiB7JGluOiBfLnVuaXF1ZShjaGFubmVscyl9LCB0OiAnYydcdH0sIHsgZmllbGRzOiB7X2lkOiAxLCBuYW1lOiAxIH19KS5mZXRjaCgpLFxuXHRvbk1heFJvb21NZW1iZXJzRXhjZWVkZWQoeyBzZW5kZXIsIHJpZCB9KSB7XG5cdFx0Ly8gR2V0IHRoZSBsYW5ndWFnZSBvZiB0aGUgdXNlciBmb3IgdGhlIGVycm9yIG5vdGlmaWNhdGlvbi5cblx0XHRjb25zdCBsYW5ndWFnZSA9IHRoaXMuZ2V0VXNlcihzZW5kZXIuX2lkKS5sYW5ndWFnZTtcblx0XHRjb25zdCBtc2cgPSBUQVBpMThuLl9fKCdHcm91cF9tZW50aW9uc19kaXNhYmxlZF94X21lbWJlcnMnLCB7IHRvdGFsOiB0aGlzLm1lc3NhZ2VNYXhBbGwgfSwgbGFuZ3VhZ2UpO1xuXG5cdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeVVzZXIoc2VuZGVyLl9pZCwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkLFxuXHRcdFx0dHM6IG5ldyBEYXRlLFxuXHRcdFx0bXNnLFxuXHRcdFx0Z3JvdXBhYmxlOiBmYWxzZVxuXHRcdH0pO1xuXG5cdFx0Ly8gQWxzbyB0aHJvdyB0byBzdG9wIHByb3BhZ2F0aW9uIG9mICdzZW5kTWVzc2FnZScuXG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgbXNnLCB7XG5cdFx0XHRtZXRob2Q6ICdmaWx0ZXJBVEFsbFRhZycsXG5cdFx0XHRhY3Rpb246IG1zZ1xuXHRcdH0pO1xuXHR9XG59KTtcblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYmVmb3JlU2F2ZU1lc3NhZ2UnLCAobWVzc2FnZSkgPT4gbWVudGlvbi5leGVjdXRlKG1lc3NhZ2UpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5ISUdILCAnbWVudGlvbnMnKTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0Z2V0VXNlck1lbnRpb25zQnlDaGFubmVsKHsgcm9vbUlkLCBvcHRpb25zIH0pIHtcblx0XHRjaGVjayhyb29tSWQsIFN0cmluZyk7XG5cblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnZ2V0VXNlck1lbnRpb25zQnlDaGFubmVsJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUlkKTtcblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHsgbWV0aG9kOiAnZ2V0VXNlck1lbnRpb25zQnlDaGFubmVsJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQoTWV0ZW9yLnVzZXJJZCgpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kVmlzaWJsZUJ5TWVudGlvbkFuZFJvb21JZCh1c2VyLnVzZXJuYW1lLCByb29tSWQsIG9wdGlvbnMpLmZldGNoKCk7XG5cdH1cbn0pO1xuIiwiLypcbiogTWVudGlvbnMgaXMgYSBuYW1lZCBmdW5jdGlvbiB0aGF0IHdpbGwgcHJvY2VzcyBNZW50aW9uc1xuKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSAtIFRoZSBtZXNzYWdlIG9iamVjdFxuKi9cbmltcG9ydCBNZW50aW9ucyBmcm9tICcuLi9NZW50aW9ucyc7XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNZW50aW9uc1NlcnZlciBleHRlbmRzIE1lbnRpb25zIHtcblx0Y29uc3RydWN0b3IoYXJncykge1xuXHRcdHN1cGVyKGFyZ3MpO1xuXHRcdHRoaXMubWVzc2FnZU1heEFsbCA9IGFyZ3MubWVzc2FnZU1heEFsbDtcblx0XHR0aGlzLmdldENoYW5uZWwgPSBhcmdzLmdldENoYW5uZWw7XG5cdFx0dGhpcy5nZXRDaGFubmVscyA9IGFyZ3MuZ2V0Q2hhbm5lbHM7XG5cdFx0dGhpcy5nZXRVc2VycyA9IGFyZ3MuZ2V0VXNlcnM7XG5cdFx0dGhpcy5nZXRVc2VyID0gYXJncy5nZXRVc2VyO1xuXHRcdHRoaXMuZ2V0VG90YWxDaGFubmVsTWVtYmVycyA9IGFyZ3MuZ2V0VG90YWxDaGFubmVsTWVtYmVycztcblx0XHR0aGlzLm9uTWF4Um9vbU1lbWJlcnNFeGNlZWRlZCA9IGFyZ3Mub25NYXhSb29tTWVtYmVyc0V4Y2VlZGVkIHx8ICgoKSA9PiB7fSk7XG5cdH1cblx0c2V0IGdldFVzZXJzKG0pIHtcblx0XHR0aGlzLl9nZXRVc2VycyA9IG07XG5cdH1cblx0Z2V0IGdldFVzZXJzKCkge1xuXHRcdHJldHVybiB0eXBlb2YgdGhpcy5fZ2V0VXNlcnMgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9nZXRVc2VycyA6ICgpID0+IHRoaXMuX2dldFVzZXJzO1xuXHR9XG5cdHNldCBnZXRDaGFubmVscyhtKSB7XG5cdFx0dGhpcy5fZ2V0Q2hhbm5lbHMgPSBtO1xuXHR9XG5cdGdldCBnZXRDaGFubmVscygpIHtcblx0XHRyZXR1cm4gdHlwZW9mIHRoaXMuX2dldENoYW5uZWxzID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZ2V0Q2hhbm5lbHMgOiAoKSA9PiB0aGlzLl9nZXRDaGFubmVscztcblx0fVxuXHRzZXQgZ2V0Q2hhbm5lbChtKSB7XG5cdFx0dGhpcy5fZ2V0Q2hhbm5lbCA9IG07XG5cdH1cblx0Z2V0IGdldENoYW5uZWwoKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiB0aGlzLl9nZXRDaGFubmVsID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZ2V0Q2hhbm5lbCA6ICgpID0+IHRoaXMuX2dldENoYW5uZWw7XG5cdH1cblx0c2V0IG1lc3NhZ2VNYXhBbGwobSkge1xuXHRcdHRoaXMuX21lc3NhZ2VNYXhBbGwgPSBtO1xuXHR9XG5cdGdldCBtZXNzYWdlTWF4QWxsKCkge1xuXHRcdHJldHVybiB0eXBlb2YgdGhpcy5fbWVzc2FnZU1heEFsbCA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX21lc3NhZ2VNYXhBbGwoKSA6IHRoaXMuX21lc3NhZ2VNYXhBbGw7XG5cdH1cblx0Z2V0VXNlcnNCeU1lbnRpb25zKHttc2csIHJpZCwgdTogc2VuZGVyfSkge1xuXHRcdGxldCBtZW50aW9ucyA9IHRoaXMuZ2V0VXNlck1lbnRpb25zKG1zZyk7XG5cdFx0Y29uc3QgbWVudGlvbnNBbGwgPSBbXTtcblx0XHRjb25zdCB1c2VyTWVudGlvbnMgPSBbXTtcblxuXHRcdG1lbnRpb25zLmZvckVhY2goKG0pID0+IHtcblx0XHRcdGNvbnN0IG1lbnRpb24gPSBtLnRyaW0oKS5zdWJzdHIoMSk7XG5cdFx0XHRpZiAobWVudGlvbiAhPT0gJ2FsbCcgJiYgbWVudGlvbiAhPT0gJ2hlcmUnKSB7XG5cdFx0XHRcdHJldHVybiB1c2VyTWVudGlvbnMucHVzaChtZW50aW9uKTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLm1lc3NhZ2VNYXhBbGwgPiAwICYmIHRoaXMuZ2V0VG90YWxDaGFubmVsTWVtYmVycyhyaWQpID4gdGhpcy5tZXNzYWdlTWF4QWxsKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLm9uTWF4Um9vbU1lbWJlcnNFeGNlZWRlZCh7IHNlbmRlciwgcmlkIH0pO1xuXHRcdFx0fVxuXHRcdFx0bWVudGlvbnNBbGwucHVzaCh7XG5cdFx0XHRcdF9pZDogbWVudGlvbixcblx0XHRcdFx0dXNlcm5hbWU6IG1lbnRpb25cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdG1lbnRpb25zID0gdXNlck1lbnRpb25zLmxlbmd0aCA/IHRoaXMuZ2V0VXNlcnModXNlck1lbnRpb25zKSA6IFtdO1xuXHRcdHJldHVybiBbLi4ubWVudGlvbnNBbGwsIC4uLm1lbnRpb25zXTtcblx0fVxuXHRnZXRDaGFubmVsYnlNZW50aW9ucyh7bXNnfSkge1xuXHRcdGNvbnN0IGNoYW5uZWxzID0gdGhpcy5nZXRDaGFubmVsTWVudGlvbnMobXNnKTtcblx0XHRyZXR1cm4gdGhpcy5nZXRDaGFubmVscyhjaGFubmVscy5tYXAoYyA9PiBjLnRyaW0oKS5zdWJzdHIoMSkpKTtcblx0fVxuXHRleGVjdXRlKG1lc3NhZ2UpIHtcblx0XHRjb25zdCBtZW50aW9uc0FsbCA9IHRoaXMuZ2V0VXNlcnNCeU1lbnRpb25zKG1lc3NhZ2UpO1xuXHRcdGNvbnN0IGNoYW5uZWxzID0gdGhpcy5nZXRDaGFubmVsYnlNZW50aW9ucyhtZXNzYWdlKTtcblxuXHRcdG1lc3NhZ2UubWVudGlvbnMgPSBtZW50aW9uc0FsbDtcblx0XHRtZXNzYWdlLmNoYW5uZWxzID0gY2hhbm5lbHM7XG5cblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxufVxuIiwiLypcbiogTWVudGlvbnMgaXMgYSBuYW1lZCBmdW5jdGlvbiB0aGF0IHdpbGwgcHJvY2VzcyBNZW50aW9uc1xuKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSAtIFRoZSBtZXNzYWdlIG9iamVjdFxuKi9cbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcblx0Y29uc3RydWN0b3Ioe3BhdHRlcm4sIHVzZVJlYWxOYW1lLCBtZX0pIHtcblx0XHR0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuXHRcdHRoaXMudXNlUmVhbE5hbWUgPSB1c2VSZWFsTmFtZTtcblx0XHR0aGlzLm1lID0gbWU7XG5cdH1cblx0c2V0IG1lKG0pIHtcblx0XHR0aGlzLl9tZSA9IG07XG5cdH1cblx0Z2V0IG1lKCkge1xuXHRcdHJldHVybiB0eXBlb2YgdGhpcy5fbWUgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9tZSgpIDogdGhpcy5fbWU7XG5cdH1cblx0c2V0IHBhdHRlcm4ocCkge1xuXHRcdHRoaXMuX3BhdHRlcm4gPSBwO1xuXHR9XG5cdGdldCBwYXR0ZXJuKCkge1xuXHRcdHJldHVybiB0eXBlb2YgdGhpcy5fcGF0dGVybiA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX3BhdHRlcm4oKSA6IHRoaXMuX3BhdHRlcm47XG5cdH1cblx0c2V0IHVzZVJlYWxOYW1lKHMpIHtcblx0XHR0aGlzLl91c2VSZWFsTmFtZSA9IHM7XG5cdH1cblx0Z2V0IHVzZVJlYWxOYW1lKCkge1xuXHRcdHJldHVybiB0eXBlb2YgdGhpcy5fdXNlUmVhbE5hbWUgPT09ICdmdW5jdGlvbicgPyB0aGlzLl91c2VSZWFsTmFtZSgpIDogdGhpcy5fdXNlUmVhbE5hbWU7XG5cdH1cblx0Z2V0IHVzZXJNZW50aW9uUmVnZXgoKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoYChefFxcXFxzfDxwPilAKCR7IHRoaXMucGF0dGVybiB9KWAsICdnbScpO1xuXHR9XG5cdGdldCBjaGFubmVsTWVudGlvblJlZ2V4KCkge1xuXHRcdHJldHVybiBuZXcgUmVnRXhwKGAoXnxcXFxcc3w8cD4pIygkeyB0aGlzLnBhdHRlcm4gfSlgLCAnZ20nKTtcblx0fVxuXHRyZXBsYWNlVXNlcnMoc3RyLCBtZXNzYWdlLCBtZSkge1xuXHRcdHJldHVybiBzdHIucmVwbGFjZSh0aGlzLnVzZXJNZW50aW9uUmVnZXgsIChtYXRjaCwgcHJlZml4LCB1c2VybmFtZSkgPT4ge1xuXHRcdFx0aWYgKFsnYWxsJywgJ2hlcmUnXS5pbmNsdWRlcyh1c2VybmFtZSkpIHtcblx0XHRcdFx0cmV0dXJuIGAkeyBwcmVmaXggfTxhIGNsYXNzPVwibWVudGlvbi1saW5rIG1lbnRpb24tbGluay1tZSBtZW50aW9uLWxpbmstYWxsXCI+QCR7IHVzZXJuYW1lIH08L2E+YDtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgbWVudGlvbk9iaiA9IG1lc3NhZ2UubWVudGlvbnMgJiYgbWVzc2FnZS5tZW50aW9ucy5maW5kKG0gPT4gbS51c2VybmFtZSA9PT0gdXNlcm5hbWUpO1xuXHRcdFx0aWYgKG1lc3NhZ2UudGVtcCA9PSBudWxsICYmIG1lbnRpb25PYmogPT0gbnVsbCkge1xuXHRcdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBuYW1lID0gdGhpcy51c2VSZWFsTmFtZSAmJiBtZW50aW9uT2JqICYmIHMuZXNjYXBlSFRNTChtZW50aW9uT2JqLm5hbWUpO1xuXG5cdFx0XHRyZXR1cm4gYCR7IHByZWZpeCB9PGEgY2xhc3M9XCJtZW50aW9uLWxpbmsgJHsgdXNlcm5hbWUgPT09IG1lID8gJ21lbnRpb24tbGluay1tZScgOiAnJyB9XCIgZGF0YS11c2VybmFtZT1cIiR7IHVzZXJuYW1lIH1cIiB0aXRsZT1cIiR7IG5hbWUgPyB1c2VybmFtZSA6ICcnIH1cIj4keyBuYW1lIHx8IGBAJHsgdXNlcm5hbWUgfWAgfTwvYT5gO1xuXHRcdH0pO1xuXHR9XG5cdHJlcGxhY2VDaGFubmVscyhzdHIsIG1lc3NhZ2UpIHtcblx0XHQvL3NpbmNlIGFwb3N0cm9waGUgZXNjYXBlZCBjb250YWlucyAjIHdlIG5lZWQgdG8gdW5lc2NhcGUgaXRcblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoLyYjMzk7L2csICdcXCcnKS5yZXBsYWNlKHRoaXMuY2hhbm5lbE1lbnRpb25SZWdleCwgKG1hdGNoLCBwcmVmaXgsIG5hbWUpID0+IHtcblx0XHRcdGlmICghbWVzc2FnZS50ZW1wICYmICEobWVzc2FnZS5jaGFubmVscyAmJiBtZXNzYWdlLmNoYW5uZWxzLmZpbmQoYyA9PiBjLm5hbWUgPT09IG5hbWUpKSkge1xuXHRcdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBgJHsgcHJlZml4IH08YSBjbGFzcz1cIm1lbnRpb24tbGlua1wiIGRhdGEtY2hhbm5lbD1cIiR7IG5hbWUgfVwiPiR7IGAjJHsgbmFtZSB9YCB9PC9hPmA7XG5cdFx0fSk7XG5cdH1cblx0Z2V0VXNlck1lbnRpb25zKHN0cikge1xuXHRcdHJldHVybiAoc3RyLm1hdGNoKHRoaXMudXNlck1lbnRpb25SZWdleCkgfHwgW10pLm1hcChtYXRjaCA9PiBtYXRjaC50cmltKCkpO1xuXHR9XG5cdGdldENoYW5uZWxNZW50aW9ucyhzdHIpIHtcblx0XHRyZXR1cm4gKHN0ci5tYXRjaCh0aGlzLmNoYW5uZWxNZW50aW9uUmVnZXgpIHx8IFtdKS5tYXAobWF0Y2ggPT4gbWF0Y2gudHJpbSgpKTtcblx0fVxuXHRwYXJzZShtZXNzYWdlKSB7XG5cdFx0bGV0IG1zZyA9IChtZXNzYWdlICYmIG1lc3NhZ2UuaHRtbCkgfHwgJyc7XG5cdFx0aWYgKCFtc2cudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gbWVzc2FnZTtcblx0XHR9XG5cdFx0bXNnID0gdGhpcy5yZXBsYWNlVXNlcnMobXNnLCBtZXNzYWdlLCB0aGlzLm1lKTtcblx0XHRtc2cgPSB0aGlzLnJlcGxhY2VDaGFubmVscyhtc2csIG1lc3NhZ2UsIHRoaXMubWUpO1xuXHRcdG1lc3NhZ2UuaHRtbCA9IG1zZztcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxufVxuIl19
