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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:statistics":{"lib":{"rocketchat.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/lib/rocketchat.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.statistics = {};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"models":{"Statistics.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/server/models/Statistics.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.models.Statistics = new class extends RocketChat.models._Base {
  constructor() {
    super('statistics');
    this.tryEnsureIndex({
      createdAt: 1
    });
  } // FIND ONE


  findOneById(_id, options) {
    const query = {
      _id
    };
    return this.findOne(query, options);
  }

  findLast() {
    const options = {
      sort: {
        createdAt: -1
      },
      limit: 1
    };
    const records = this.find({}, options).fetch();
    return records && records[0];
  }

}();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"get.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/server/functions/get.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let os;
module.watch(require("os"), {
  default(v) {
    os = v;
  }

}, 1);
const wizardFields = ['Organization_Type', 'Organization_Name', 'Industry', 'Size', 'Country', 'Website', 'Site_Name', 'Language', 'Server_Type', 'Allow_Marketing_Emails'];

RocketChat.statistics.get = function _getStatistics() {
  const statistics = {}; // Setup Wizard

  statistics.wizard = {};
  wizardFields.forEach(field => {
    const record = RocketChat.models.Settings.findOne(field);

    if (record) {
      const wizardField = field.replace(/_/g, '').replace(field[0], field[0].toLowerCase());
      statistics.wizard[wizardField] = record.value;
    }
  }); // Version

  statistics.uniqueId = RocketChat.settings.get('uniqueID');

  if (RocketChat.models.Settings.findOne('uniqueID')) {
    statistics.installedAt = RocketChat.models.Settings.findOne('uniqueID').createdAt;
  }

  if (RocketChat.Info) {
    statistics.version = RocketChat.Info.version;
    statistics.tag = RocketChat.Info.tag;
    statistics.branch = RocketChat.Info.branch;
  } // User statistics


  statistics.totalUsers = Meteor.users.find().count();
  statistics.activeUsers = Meteor.users.find({
    active: true
  }).count();
  statistics.nonActiveUsers = statistics.totalUsers - statistics.activeUsers;
  statistics.onlineUsers = Meteor.users.find({
    statusConnection: 'online'
  }).count();
  statistics.awayUsers = Meteor.users.find({
    statusConnection: 'away'
  }).count();
  statistics.offlineUsers = statistics.totalUsers - statistics.onlineUsers - statistics.awayUsers; // Room statistics

  statistics.totalRooms = RocketChat.models.Rooms.find().count();
  statistics.totalChannels = RocketChat.models.Rooms.findByType('c').count();
  statistics.totalPrivateGroups = RocketChat.models.Rooms.findByType('p').count();
  statistics.totalDirect = RocketChat.models.Rooms.findByType('d').count();
  statistics.totalLivechat = RocketChat.models.Rooms.findByType('l').count(); // Message statistics

  statistics.totalMessages = RocketChat.models.Messages.find().count();
  statistics.totalChannelMessages = _.reduce(RocketChat.models.Rooms.findByType('c', {
    fields: {
      msgs: 1
    }
  }).fetch(), function _countChannelMessages(num, room) {
    return num + room.msgs;
  }, 0);
  statistics.totalPrivateGroupMessages = _.reduce(RocketChat.models.Rooms.findByType('p', {
    fields: {
      msgs: 1
    }
  }).fetch(), function _countPrivateGroupMessages(num, room) {
    return num + room.msgs;
  }, 0);
  statistics.totalDirectMessages = _.reduce(RocketChat.models.Rooms.findByType('d', {
    fields: {
      msgs: 1
    }
  }).fetch(), function _countDirectMessages(num, room) {
    return num + room.msgs;
  }, 0);
  statistics.totalLivechatMessages = _.reduce(RocketChat.models.Rooms.findByType('l', {
    fields: {
      msgs: 1
    }
  }).fetch(), function _countLivechatMessages(num, room) {
    return num + room.msgs;
  }, 0);
  statistics.lastLogin = RocketChat.models.Users.getLastLogin();
  statistics.lastMessageSentAt = RocketChat.models.Messages.getLastTimestamp();
  statistics.lastSeenSubscription = RocketChat.models.Subscriptions.getLastSeen();
  statistics.os = {
    type: os.type(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: os.uptime(),
    loadavg: os.loadavg(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    cpus: os.cpus()
  };
  statistics.process = {
    nodeVersion: process.version,
    pid: process.pid,
    uptime: process.uptime()
  };
  statistics.deploy = {
    method: process.env.DEPLOY_METHOD || 'tar',
    platform: process.env.DEPLOY_PLATFORM || 'selfinstall'
  };
  statistics.migration = RocketChat.Migrations._getControl();
  statistics.instanceCount = InstanceStatus.getCollection().find({
    _updatedAt: {
      $gt: new Date(Date.now() - process.uptime() * 1000 - 2000)
    }
  }).count();

  if (MongoInternals.defaultRemoteCollectionDriver().mongo._oplogHandle && MongoInternals.defaultRemoteCollectionDriver().mongo._oplogHandle.onOplogEntry && RocketChat.settings.get('Force_Disable_OpLog_For_Cache') !== true) {
    statistics.oplogEnabled = true;
  }

  return statistics;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"save.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/server/functions/save.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.statistics.save = function () {
  const statistics = RocketChat.statistics.get();
  statistics.createdAt = new Date();
  RocketChat.models.Statistics.insert(statistics);
  return statistics;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"getStatistics.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/server/methods/getStatistics.js                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  getStatistics(refresh) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getStatistics'
      });
    }

    if (RocketChat.authz.hasPermission(Meteor.userId(), 'view-statistics') !== true) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'getStatistics'
      });
    }

    if (refresh) {
      return RocketChat.statistics.save();
    } else {
      return RocketChat.models.Statistics.findLast();
    }
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:statistics/lib/rocketchat.js");
require("/node_modules/meteor/rocketchat:statistics/server/models/Statistics.js");
require("/node_modules/meteor/rocketchat:statistics/server/functions/get.js");
require("/node_modules/meteor/rocketchat:statistics/server/functions/save.js");
require("/node_modules/meteor/rocketchat:statistics/server/methods/getStatistics.js");

/* Exports */
Package._define("rocketchat:statistics");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_statistics.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzdGF0aXN0aWNzL2xpYi9yb2NrZXRjaGF0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnN0YXRpc3RpY3Mvc2VydmVyL21vZGVscy9TdGF0aXN0aWNzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnN0YXRpc3RpY3Mvc2VydmVyL2Z1bmN0aW9ucy9nZXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c3RhdGlzdGljcy9zZXJ2ZXIvZnVuY3Rpb25zL3NhdmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c3RhdGlzdGljcy9zZXJ2ZXIvbWV0aG9kcy9nZXRTdGF0aXN0aWNzLmpzIl0sIm5hbWVzIjpbIlJvY2tldENoYXQiLCJzdGF0aXN0aWNzIiwibW9kZWxzIiwiU3RhdGlzdGljcyIsIl9CYXNlIiwiY29uc3RydWN0b3IiLCJ0cnlFbnN1cmVJbmRleCIsImNyZWF0ZWRBdCIsImZpbmRPbmVCeUlkIiwiX2lkIiwib3B0aW9ucyIsInF1ZXJ5IiwiZmluZE9uZSIsImZpbmRMYXN0Iiwic29ydCIsImxpbWl0IiwicmVjb3JkcyIsImZpbmQiLCJmZXRjaCIsIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsIm9zIiwid2l6YXJkRmllbGRzIiwiZ2V0IiwiX2dldFN0YXRpc3RpY3MiLCJ3aXphcmQiLCJmb3JFYWNoIiwiZmllbGQiLCJyZWNvcmQiLCJTZXR0aW5ncyIsIndpemFyZEZpZWxkIiwicmVwbGFjZSIsInRvTG93ZXJDYXNlIiwidmFsdWUiLCJ1bmlxdWVJZCIsInNldHRpbmdzIiwiaW5zdGFsbGVkQXQiLCJJbmZvIiwidmVyc2lvbiIsInRhZyIsImJyYW5jaCIsInRvdGFsVXNlcnMiLCJNZXRlb3IiLCJ1c2VycyIsImNvdW50IiwiYWN0aXZlVXNlcnMiLCJhY3RpdmUiLCJub25BY3RpdmVVc2VycyIsIm9ubGluZVVzZXJzIiwic3RhdHVzQ29ubmVjdGlvbiIsImF3YXlVc2VycyIsIm9mZmxpbmVVc2VycyIsInRvdGFsUm9vbXMiLCJSb29tcyIsInRvdGFsQ2hhbm5lbHMiLCJmaW5kQnlUeXBlIiwidG90YWxQcml2YXRlR3JvdXBzIiwidG90YWxEaXJlY3QiLCJ0b3RhbExpdmVjaGF0IiwidG90YWxNZXNzYWdlcyIsIk1lc3NhZ2VzIiwidG90YWxDaGFubmVsTWVzc2FnZXMiLCJyZWR1Y2UiLCJmaWVsZHMiLCJtc2dzIiwiX2NvdW50Q2hhbm5lbE1lc3NhZ2VzIiwibnVtIiwicm9vbSIsInRvdGFsUHJpdmF0ZUdyb3VwTWVzc2FnZXMiLCJfY291bnRQcml2YXRlR3JvdXBNZXNzYWdlcyIsInRvdGFsRGlyZWN0TWVzc2FnZXMiLCJfY291bnREaXJlY3RNZXNzYWdlcyIsInRvdGFsTGl2ZWNoYXRNZXNzYWdlcyIsIl9jb3VudExpdmVjaGF0TWVzc2FnZXMiLCJsYXN0TG9naW4iLCJVc2VycyIsImdldExhc3RMb2dpbiIsImxhc3RNZXNzYWdlU2VudEF0IiwiZ2V0TGFzdFRpbWVzdGFtcCIsImxhc3RTZWVuU3Vic2NyaXB0aW9uIiwiU3Vic2NyaXB0aW9ucyIsImdldExhc3RTZWVuIiwidHlwZSIsInBsYXRmb3JtIiwiYXJjaCIsInJlbGVhc2UiLCJ1cHRpbWUiLCJsb2FkYXZnIiwidG90YWxtZW0iLCJmcmVlbWVtIiwiY3B1cyIsInByb2Nlc3MiLCJub2RlVmVyc2lvbiIsInBpZCIsImRlcGxveSIsIm1ldGhvZCIsImVudiIsIkRFUExPWV9NRVRIT0QiLCJERVBMT1lfUExBVEZPUk0iLCJtaWdyYXRpb24iLCJNaWdyYXRpb25zIiwiX2dldENvbnRyb2wiLCJpbnN0YW5jZUNvdW50IiwiSW5zdGFuY2VTdGF0dXMiLCJnZXRDb2xsZWN0aW9uIiwiX3VwZGF0ZWRBdCIsIiRndCIsIkRhdGUiLCJub3ciLCJNb25nb0ludGVybmFscyIsImRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyIiwibW9uZ28iLCJfb3Bsb2dIYW5kbGUiLCJvbk9wbG9nRW50cnkiLCJvcGxvZ0VuYWJsZWQiLCJzYXZlIiwiaW5zZXJ0IiwibWV0aG9kcyIsImdldFN0YXRpc3RpY3MiLCJyZWZyZXNoIiwidXNlcklkIiwiRXJyb3IiLCJhdXRoeiIsImhhc1Blcm1pc3Npb24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxXQUFXQyxVQUFYLEdBQXdCLEVBQXhCLEM7Ozs7Ozs7Ozs7O0FDQUFELFdBQVdFLE1BQVgsQ0FBa0JDLFVBQWxCLEdBQStCLElBQUksY0FBY0gsV0FBV0UsTUFBWCxDQUFrQkUsS0FBaEMsQ0FBc0M7QUFDeEVDLGdCQUFjO0FBQ2IsVUFBTSxZQUFOO0FBRUEsU0FBS0MsY0FBTCxDQUFvQjtBQUFFQyxpQkFBVztBQUFiLEtBQXBCO0FBQ0EsR0FMdUUsQ0FPeEU7OztBQUNBQyxjQUFZQyxHQUFaLEVBQWlCQyxPQUFqQixFQUEwQjtBQUN6QixVQUFNQyxRQUFRO0FBQUVGO0FBQUYsS0FBZDtBQUNBLFdBQU8sS0FBS0csT0FBTCxDQUFhRCxLQUFiLEVBQW9CRCxPQUFwQixDQUFQO0FBQ0E7O0FBRURHLGFBQVc7QUFDVixVQUFNSCxVQUFVO0FBQ2ZJLFlBQU07QUFDTFAsbUJBQVcsQ0FBQztBQURQLE9BRFM7QUFJZlEsYUFBTztBQUpRLEtBQWhCO0FBTUEsVUFBTUMsVUFBVSxLQUFLQyxJQUFMLENBQVUsRUFBVixFQUFjUCxPQUFkLEVBQXVCUSxLQUF2QixFQUFoQjtBQUNBLFdBQU9GLFdBQVdBLFFBQVEsQ0FBUixDQUFsQjtBQUNBOztBQXRCdUUsQ0FBMUMsRUFBL0IsQzs7Ozs7Ozs7Ozs7QUNBQSxJQUFJRyxDQUFKOztBQUFNQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxRQUFFSyxDQUFGO0FBQUk7O0FBQWhCLENBQW5DLEVBQXFELENBQXJEO0FB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YXRfc3RhdGlzdGljcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlJvY2tldENoYXQuc3RhdGlzdGljcyA9IHt9O1xuIiwiUm9ja2V0Q2hhdC5tb2RlbHMuU3RhdGlzdGljcyA9IG5ldyBjbGFzcyBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ3N0YXRpc3RpY3MnKTtcblxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyBjcmVhdGVkQXQ6IDEgfSk7XG5cdH1cblxuXHQvLyBGSU5EIE9ORVxuXHRmaW5kT25lQnlJZChfaWQsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHsgX2lkIH07XG5cdFx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHRmaW5kTGFzdCgpIHtcblx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0c29ydDoge1xuXHRcdFx0XHRjcmVhdGVkQXQ6IC0xLFxuXHRcdFx0fSxcblx0XHRcdGxpbWl0OiAxLFxuXHRcdH07XG5cdFx0Y29uc3QgcmVjb3JkcyA9IHRoaXMuZmluZCh7fSwgb3B0aW9ucykuZmV0Y2goKTtcblx0XHRyZXR1cm4gcmVjb3JkcyAmJiByZWNvcmRzWzBdO1xuXHR9XG59O1xuIiwiLyogZ2xvYmFsIEluc3RhbmNlU3RhdHVzLCBNb25nb0ludGVybmFscyAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuXG5jb25zdCB3aXphcmRGaWVsZHMgPSBbXG5cdCdPcmdhbml6YXRpb25fVHlwZScsXG5cdCdPcmdhbml6YXRpb25fTmFtZScsXG5cdCdJbmR1c3RyeScsXG5cdCdTaXplJyxcblx0J0NvdW50cnknLFxuXHQnV2Vic2l0ZScsXG5cdCdTaXRlX05hbWUnLFxuXHQnTGFuZ3VhZ2UnLFxuXHQnU2VydmVyX1R5cGUnLFxuXHQnQWxsb3dfTWFya2V0aW5nX0VtYWlscycsXG5dO1xuXG5Sb2NrZXRDaGF0LnN0YXRpc3RpY3MuZ2V0ID0gZnVuY3Rpb24gX2dldFN0YXRpc3RpY3MoKSB7XG5cdGNvbnN0IHN0YXRpc3RpY3MgPSB7fTtcblxuXHQvLyBTZXR1cCBXaXphcmRcblx0c3RhdGlzdGljcy53aXphcmQgPSB7fTtcblx0d2l6YXJkRmllbGRzLmZvckVhY2goKGZpZWxkKSA9PiB7XG5cdFx0Y29uc3QgcmVjb3JkID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZE9uZShmaWVsZCk7XG5cdFx0aWYgKHJlY29yZCkge1xuXHRcdFx0Y29uc3Qgd2l6YXJkRmllbGQgPSBmaWVsZC5yZXBsYWNlKC9fL2csICcnKS5yZXBsYWNlKGZpZWxkWzBdLCBmaWVsZFswXS50b0xvd2VyQ2FzZSgpKTtcblx0XHRcdHN0YXRpc3RpY3Mud2l6YXJkW3dpemFyZEZpZWxkXSA9IHJlY29yZC52YWx1ZTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIFZlcnNpb25cblx0c3RhdGlzdGljcy51bmlxdWVJZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCd1bmlxdWVJRCcpO1xuXHRpZiAoUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZE9uZSgndW5pcXVlSUQnKSkge1xuXHRcdHN0YXRpc3RpY3MuaW5zdGFsbGVkQXQgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lKCd1bmlxdWVJRCcpLmNyZWF0ZWRBdDtcblx0fVxuXG5cdGlmIChSb2NrZXRDaGF0LkluZm8pIHtcblx0XHRzdGF0aXN0aWNzLnZlcnNpb24gPSBSb2NrZXRDaGF0LkluZm8udmVyc2lvbjtcblx0XHRzdGF0aXN0aWNzLnRhZyA9IFJvY2tldENoYXQuSW5mby50YWc7XG5cdFx0c3RhdGlzdGljcy5icmFuY2ggPSBSb2NrZXRDaGF0LkluZm8uYnJhbmNoO1xuXHR9XG5cblx0Ly8gVXNlciBzdGF0aXN0aWNzXG5cdHN0YXRpc3RpY3MudG90YWxVc2VycyA9IE1ldGVvci51c2Vycy5maW5kKCkuY291bnQoKTtcblx0c3RhdGlzdGljcy5hY3RpdmVVc2VycyA9IE1ldGVvci51c2Vycy5maW5kKHsgYWN0aXZlOiB0cnVlIH0pLmNvdW50KCk7XG5cdHN0YXRpc3RpY3Mubm9uQWN0aXZlVXNlcnMgPSBzdGF0aXN0aWNzLnRvdGFsVXNlcnMgLSBzdGF0aXN0aWNzLmFjdGl2ZVVzZXJzO1xuXHRzdGF0aXN0aWNzLm9ubGluZVVzZXJzID0gTWV0ZW9yLnVzZXJzLmZpbmQoeyBzdGF0dXNDb25uZWN0aW9uOiAnb25saW5lJyB9KS5jb3VudCgpO1xuXHRzdGF0aXN0aWNzLmF3YXlVc2VycyA9IE1ldGVvci51c2Vycy5maW5kKHsgc3RhdHVzQ29ubmVjdGlvbjogJ2F3YXknIH0pLmNvdW50KCk7XG5cdHN0YXRpc3RpY3Mub2ZmbGluZVVzZXJzID0gc3RhdGlzdGljcy50b3RhbFVzZXJzIC0gc3RhdGlzdGljcy5vbmxpbmVVc2VycyAtIHN0YXRpc3RpY3MuYXdheVVzZXJzO1xuXG5cdC8vIFJvb20gc3RhdGlzdGljc1xuXHRzdGF0aXN0aWNzLnRvdGFsUm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKCkuY291bnQoKTtcblx0c3RhdGlzdGljcy50b3RhbENoYW5uZWxzID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VHlwZSgnYycpLmNvdW50KCk7XG5cdHN0YXRpc3RpY3MudG90YWxQcml2YXRlR3JvdXBzID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VHlwZSgncCcpLmNvdW50KCk7XG5cdHN0YXRpc3RpY3MudG90YWxEaXJlY3QgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlUeXBlKCdkJykuY291bnQoKTtcblx0c3RhdGlzdGljcy50b3RhbExpdmVjaGF0ID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VHlwZSgnbCcpLmNvdW50KCk7XG5cblx0Ly8gTWVzc2FnZSBzdGF0aXN0aWNzXG5cdHN0YXRpc3RpY3MudG90YWxNZXNzYWdlcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQoKS5jb3VudCgpO1xuXHRzdGF0aXN0aWNzLnRvdGFsQ2hhbm5lbE1lc3NhZ2VzID0gXy5yZWR1Y2UoUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VHlwZSgnYycsIHsgZmllbGRzOiB7IG1zZ3M6IDEgfSB9KS5mZXRjaCgpLCBmdW5jdGlvbiBfY291bnRDaGFubmVsTWVzc2FnZXMobnVtLCByb29tKSB7IHJldHVybiBudW0gKyByb29tLm1zZ3M7IH0sIDApO1xuXHRzdGF0aXN0aWNzLnRvdGFsUHJpdmF0ZUdyb3VwTWVzc2FnZXMgPSBfLnJlZHVjZShSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlUeXBlKCdwJywgeyBmaWVsZHM6IHsgbXNnczogMSB9IH0pLmZldGNoKCksIGZ1bmN0aW9uIF9jb3VudFByaXZhdGVHcm91cE1lc3NhZ2VzKG51bSwgcm9vbSkgeyByZXR1cm4gbnVtICsgcm9vbS5tc2dzOyB9LCAwKTtcblx0c3RhdGlzdGljcy50b3RhbERpcmVjdE1lc3NhZ2VzID0gXy5yZWR1Y2UoUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VHlwZSgnZCcsIHsgZmllbGRzOiB7IG1zZ3M6IDEgfSB9KS5mZXRjaCgpLCBmdW5jdGlvbiBfY291bnREaXJlY3RNZXNzYWdlcyhudW0sIHJvb20pIHsgcmV0dXJuIG51bSArIHJvb20ubXNnczsgfSwgMCk7XG5cdHN0YXRpc3RpY3MudG90YWxMaXZlY2hhdE1lc3NhZ2VzID0gXy5yZWR1Y2UoUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VHlwZSgnbCcsIHsgZmllbGRzOiB7IG1zZ3M6IDEgfSB9KS5mZXRjaCgpLCBmdW5jdGlvbiBfY291bnRMaXZlY2hhdE1lc3NhZ2VzKG51bSwgcm9vbSkgeyByZXR1cm4gbnVtICsgcm9vbS5tc2dzOyB9LCAwKTtcblxuXHRzdGF0aXN0aWNzLmxhc3RMb2dpbiA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldExhc3RMb2dpbigpO1xuXHRzdGF0aXN0aWNzLmxhc3RNZXNzYWdlU2VudEF0ID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZ2V0TGFzdFRpbWVzdGFtcCgpO1xuXHRzdGF0aXN0aWNzLmxhc3RTZWVuU3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5nZXRMYXN0U2VlbigpO1xuXG5cdHN0YXRpc3RpY3Mub3MgPSB7XG5cdFx0dHlwZTogb3MudHlwZSgpLFxuXHRcdHBsYXRmb3JtOiBvcy5wbGF0Zm9ybSgpLFxuXHRcdGFyY2g6IG9zLmFyY2goKSxcblx0XHRyZWxlYXNlOiBvcy5yZWxlYXNlKCksXG5cdFx0dXB0aW1lOiBvcy51cHRpbWUoKSxcblx0XHRsb2FkYXZnOiBvcy5sb2FkYXZnKCksXG5cdFx0dG90YWxtZW06IG9zLnRvdGFsbWVtKCksXG5cdFx0ZnJlZW1lbTogb3MuZnJlZW1lbSgpLFxuXHRcdGNwdXM6IG9zLmNwdXMoKSxcblx0fTtcblxuXHRzdGF0aXN0aWNzLnByb2Nlc3MgPSB7XG5cdFx0bm9kZVZlcnNpb246IHByb2Nlc3MudmVyc2lvbixcblx0XHRwaWQ6IHByb2Nlc3MucGlkLFxuXHRcdHVwdGltZTogcHJvY2Vzcy51cHRpbWUoKSxcblx0fTtcblxuXHRzdGF0aXN0aWNzLmRlcGxveSA9IHtcblx0XHRtZXRob2Q6IHByb2Nlc3MuZW52LkRFUExPWV9NRVRIT0QgfHwgJ3RhcicsXG5cdFx0cGxhdGZvcm06IHByb2Nlc3MuZW52LkRFUExPWV9QTEFURk9STSB8fCAnc2VsZmluc3RhbGwnLFxuXHR9O1xuXG5cdHN0YXRpc3RpY3MubWlncmF0aW9uID0gUm9ja2V0Q2hhdC5NaWdyYXRpb25zLl9nZXRDb250cm9sKCk7XG5cdHN0YXRpc3RpY3MuaW5zdGFuY2VDb3VudCA9IEluc3RhbmNlU3RhdHVzLmdldENvbGxlY3Rpb24oKS5maW5kKHsgX3VwZGF0ZWRBdDogeyAkZ3Q6IG5ldyBEYXRlKERhdGUubm93KCkgLSBwcm9jZXNzLnVwdGltZSgpICogMTAwMCAtIDIwMDApIH0gfSkuY291bnQoKTtcblxuXHRpZiAoTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIoKS5tb25nby5fb3Bsb2dIYW5kbGUgJiYgTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIoKS5tb25nby5fb3Bsb2dIYW5kbGUub25PcGxvZ0VudHJ5ICYmIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGb3JjZV9EaXNhYmxlX09wTG9nX0Zvcl9DYWNoZScpICE9PSB0cnVlKSB7XG5cdFx0c3RhdGlzdGljcy5vcGxvZ0VuYWJsZWQgPSB0cnVlO1xuXHR9XG5cblx0cmV0dXJuIHN0YXRpc3RpY3M7XG59O1xuIiwiUm9ja2V0Q2hhdC5zdGF0aXN0aWNzLnNhdmUgPSBmdW5jdGlvbigpIHtcblx0Y29uc3Qgc3RhdGlzdGljcyA9IFJvY2tldENoYXQuc3RhdGlzdGljcy5nZXQoKTtcblx0c3RhdGlzdGljcy5jcmVhdGVkQXQgPSBuZXcgRGF0ZTtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuU3RhdGlzdGljcy5pbnNlcnQoc3RhdGlzdGljcyk7XG5cdHJldHVybiBzdGF0aXN0aWNzO1xufTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0Z2V0U3RhdGlzdGljcyhyZWZyZXNoKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2dldFN0YXRpc3RpY3MnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1zdGF0aXN0aWNzJykgIT09IHRydWUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdnZXRTdGF0aXN0aWNzJyB9KTtcblx0XHR9XG5cblx0XHRpZiAocmVmcmVzaCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuc3RhdGlzdGljcy5zYXZlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5TdGF0aXN0aWNzLmZpbmRMYXN0KCk7XG5cdFx0fVxuXHR9LFxufSk7XG4iXX0=
