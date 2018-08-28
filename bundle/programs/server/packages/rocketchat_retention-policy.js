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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:retention-policy":{"server":{"startup":{"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_retention-policy/server/startup/settings.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.settings.addGroup('RetentionPolicy', function () {
  this.add('RetentionPolicy_Enabled', false, {
    type: 'boolean',
    public: true,
    i18nLabel: 'RetentionPolicy_Enabled',
    alert: 'Watch out! Tweaking these settings without utmost care can destroy all message history. Please read the documentation before turning the feature on at rocket.chat/docs/administrator-guides/retention-policies/'
  });
  this.add('RetentionPolicy_Precision', '0', {
    type: 'select',
    values: [{
      key: '0',
      i18nLabel: 'every_30_minutes'
    }, {
      key: '1',
      i18nLabel: 'every_hour'
    }, {
      key: '2',
      i18nLabel: 'every_six_hours'
    }, {
      key: '3',
      i18nLabel: 'every_day'
    }],
    public: true,
    i18nLabel: 'RetentionPolicy_Precision',
    i18nDescription: 'RetentionPolicy_Precision_Description',
    enableQuery: {
      _id: 'RetentionPolicy_Enabled',
      value: true
    }
  });
  this.section('Global Policy', function () {
    const globalQuery = {
      _id: 'RetentionPolicy_Enabled',
      value: true
    };
    this.add('RetentionPolicy_AppliesToChannels', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_AppliesToChannels',
      enableQuery: globalQuery
    });
    this.add('RetentionPolicy_MaxAge_Channels', 30, {
      type: 'int',
      public: true,
      i18nLabel: 'RetentionPolicy_MaxAge_Channels',
      i18nDescription: 'RetentionPolicy_MaxAge_Description',
      enableQuery: [{
        _id: 'RetentionPolicy_AppliesToChannels',
        value: true
      }, globalQuery]
    });
    this.add('RetentionPolicy_AppliesToGroups', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_AppliesToGroups',
      enableQuery: globalQuery
    });
    this.add('RetentionPolicy_MaxAge_Groups', 30, {
      type: 'int',
      public: true,
      i18nLabel: 'RetentionPolicy_MaxAge_Groups',
      i18nDescription: 'RetentionPolicy_MaxAge_Description',
      enableQuery: [{
        _id: 'RetentionPolicy_AppliesToGroups',
        value: true
      }, globalQuery]
    });
    this.add('RetentionPolicy_AppliesToDMs', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_AppliesToDMs',
      enableQuery: globalQuery
    });
    this.add('RetentionPolicy_MaxAge_DMs', 30, {
      type: 'int',
      public: true,
      i18nLabel: 'RetentionPolicy_MaxAge_DMs',
      i18nDescription: 'RetentionPolicy_MaxAge_Description',
      enableQuery: [{
        _id: 'RetentionPolicy_AppliesToDMs',
        value: true
      }, globalQuery]
    });
    this.add('RetentionPolicy_ExcludePinned', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_ExcludePinned',
      enableQuery: globalQuery
    });
    this.add('RetentionPolicy_FilesOnly', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_FilesOnly',
      i18nDescription: 'RetentionPolicy_FilesOnly_Description',
      enableQuery: globalQuery
    });
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cronPruneMessages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_retention-policy/server/cronPruneMessages.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals SyncedCron */
let types = [];
const oldest = new Date('0001-01-01T00:00:00Z');
let lastPrune = oldest;
const maxTimes = {
  c: 0,
  p: 0,
  d: 0
};
const toDays = 1000 * 60 * 60 * 24;
const gracePeriod = 5000;

function job() {
  const now = new Date();
  const filesOnly = RocketChat.settings.get('RetentionPolicy_FilesOnly');
  const excludePinned = RocketChat.settings.get('RetentionPolicy_ExcludePinned'); // get all rooms with default values

  types.forEach(type => {
    const maxAge = maxTimes[type] || 0;
    const latest = new Date(now.getTime() - maxAge * toDays);
    RocketChat.models.Rooms.find({
      t: type,
      _updatedAt: {
        $gte: lastPrune
      },
      $or: [{
        'retention.enabled': {
          $eq: true
        }
      }, {
        'retention.enabled': {
          $exists: false
        }
      }],
      'retention.overrideGlobal': {
        $ne: true
      }
    }).forEach(({
      _id: rid
    }) => {
      RocketChat.cleanRoomHistory({
        rid,
        latest,
        oldest,
        filesOnly,
        excludePinned
      });
    });
  });
  RocketChat.models.Rooms.find({
    'retention.enabled': {
      $eq: true
    },
    'retention.overrideGlobal': {
      $eq: true
    },
    'retention.maxAge': {
      $gte: 0
    },
    _updatedAt: {
      $gte: lastPrune
    }
  }).forEach(room => {
    const {
      maxAge = 30,
      filesOnly,
      excludePinned
    } = room.retention;
    const latest = new Date(now.getTime() - maxAge * toDays);
    RocketChat.cleanRoomHistory({
      rid: room._id,
      latest,
      oldest,
      filesOnly,
      excludePinned
    });
  });
  lastPrune = new Date(now.getTime() - gracePeriod);
}

function getSchedule(precision) {
  switch (precision) {
    case '0':
      return '0 */30 * * * *';

    case '1':
      return '0 0 * * * *';

    case '2':
      return '0 0 */6 * * *';

    case '3':
      return '0 0 0 * * *';
  }
}

const pruneCronName = 'Prune old messages by retention policy';

function deployCron(precision) {
  const schedule = parser => parser.cron(getSchedule(precision), true);

  SyncedCron.remove(pruneCronName);
  SyncedCron.add({
    name: pruneCronName,
    schedule,
    job
  });
}

function reloadPolicy() {
  types = [];

  if (RocketChat.settings.get('RetentionPolicy_Enabled')) {
    if (RocketChat.settings.get('RetentionPolicy_AppliesToChannels')) {
      types.push('c');
    }

    if (RocketChat.settings.get('RetentionPolicy_AppliesToGroups')) {
      types.push('p');
    }

    if (RocketChat.settings.get('RetentionPolicy_AppliesToDMs')) {
      types.push('d');
    }

    maxTimes.c = RocketChat.settings.get('RetentionPolicy_MaxAge_Channels');
    maxTimes.p = RocketChat.settings.get('RetentionPolicy_MaxAge_Groups');
    maxTimes.d = RocketChat.settings.get('RetentionPolicy_MaxAge_DMs');
    return deployCron(RocketChat.settings.get('RetentionPolicy_Precision'));
  }

  return SyncedCron.remove(pruneCronName);
}

Meteor.startup(function () {
  Meteor.defer(function () {
    RocketChat.models.Settings.find({
      _id: {
        $in: ['RetentionPolicy_Enabled', 'RetentionPolicy_Precision', 'RetentionPolicy_AppliesToChannels', 'RetentionPolicy_AppliesToGroups', 'RetentionPolicy_AppliesToDMs', 'RetentionPolicy_MaxAge_Channels', 'RetentionPolicy_MaxAge_Groups', 'RetentionPolicy_MaxAge_DMs']
      }
    }).observe({
      changed() {
        reloadPolicy();
      }

    });
    reloadPolicy();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:retention-policy/server/startup/settings.js");
require("/node_modules/meteor/rocketchat:retention-policy/server/cronPruneMessages.js");

/* Exports */
Package._define("rocketchat:retention-policy");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_retention-policy.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpyZXRlbnRpb24tcG9saWN5L3NlcnZlci9zdGFydHVwL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnJldGVudGlvbi1wb2xpY3kvc2VydmVyL2Nyb25QcnVuZU1lc3NhZ2VzLmpzIl0sIm5hbWVzIjpbIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImFkZEdyb3VwIiwiYWRkIiwidHlwZSIsInB1YmxpYyIsImkxOG5MYWJlbCIsImFsZXJ0IiwidmFsdWVzIiwia2V5IiwiaTE4bkRlc2NyaXB0aW9uIiwiZW5hYmxlUXVlcnkiLCJfaWQiLCJ2YWx1ZSIsInNlY3Rpb24iLCJnbG9iYWxRdWVyeSIsInR5cGVzIiwib2xkZXN0IiwiRGF0ZSIsImxhc3RQcnVuZSIsIm1heFRpbWVzIiwiYyIsInAiLCJkIiwidG9EYXlzIiwiZ3JhY2VQZXJpb2QiLCJqb2IiLCJub3ciLCJmaWxlc09ubHkiLCJnZXQiLCJleGNsdWRlUGlubmVkIiwiZm9yRWFjaCIsIm1heEFnZSIsImxhdGVzdCIsImdldFRpbWUiLCJtb2RlbHMiLCJSb29tcyIsImZpbmQiLCJ0IiwiX3VwZGF0ZWRBdCIsIiRndGUiLCIkb3IiLCIkZXEiLCIkZXhpc3RzIiwiJG5lIiwicmlkIiwiY2xlYW5Sb29tSGlzdG9yeSIsInJvb20iLCJyZXRlbnRpb24iLCJnZXRTY2hlZHVsZSIsInByZWNpc2lvbiIsInBydW5lQ3Jvbk5hbWUiLCJkZXBsb3lDcm9uIiwic2NoZWR1bGUiLCJwYXJzZXIiLCJjcm9uIiwiU3luY2VkQ3JvbiIsInJlbW92ZSIsIm5hbWUiLCJyZWxvYWRQb2xpY3kiLCJwdXNoIiwiTWV0ZW9yIiwic3RhcnR1cCIsImRlZmVyIiwiU2V0dGluZ3MiLCIkaW4iLCJvYnNlcnZlIiwiY2hhbmdlZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLFdBQVdDLFFBQVgs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QVdwRCxXQUFXQyxRQUFYLENBQW9CNEIsR0FBcEIsQ0FBd0IsMkJBQXhCLENBQVgsQ0FBUDtBQUNBOztBQUNELFNBQU8yQixXQUFXQyxNQUFYLENBQWtCTixhQUFsQixDQUFQO0FBQ0E7O0FBRURVLE9BQU9DLE9BQVAsQ0FBZSxZQUFXO0FBQ3pCRCxTQUFPRSxLQUFQLENBQWEsWUFBVztBQUN2Qi9ELGVBQVdtQyxNQUFYLENBQWtCNkIsUUFBbEIsQ0FBMkIzQixJQUEzQixDQUFnQztBQUMvQnpCLFdBQUs7QUFDSnFELGFBQUssQ0FDSix5QkFESSxFQUVKLDJCQUZJLEVBR0osbUNBSEksRUFJSixpQ0FKSSxFQUtKLDhCQUxJLEVBTUosaUNBTkksRUFPSiwrQkFQSSxFQVFKLDRCQVJJO0FBREQ7QUFEMEIsS0FBaEMsRUFhR0MsT0FiSCxDQWFXO0FBQ1ZDLGdCQUFVO0FBQ1RSO0FBQ0E7O0FBSFMsS0FiWDtBQW1CQUE7QUFDQSxHQXJCRDtBQXNCQSxDQXZCRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3JldGVudGlvbi1wb2xpY3kuanMiLCJzb3VyY2VzQ29udGVudCI6WyJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdSZXRlbnRpb25Qb2xpY3knLCBmdW5jdGlvbigpIHtcblxuXHR0aGlzLmFkZCgnUmV0ZW50aW9uUG9saWN5X0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnUmV0ZW50aW9uUG9saWN5X0VuYWJsZWQnLFxuXHRcdGFsZXJ0OiAnV2F0Y2ggb3V0ISBUd2Vha2luZyB0aGVzZSBzZXR0aW5ncyB3aXRob3V0IHV0bW9zdCBjYXJlIGNhbiBkZXN0cm95IGFsbCBtZXNzYWdlIGhpc3RvcnkuIFBsZWFzZSByZWFkIHRoZSBkb2N1bWVudGF0aW9uIGJlZm9yZSB0dXJuaW5nIHRoZSBmZWF0dXJlIG9uIGF0IHJvY2tldC5jaGF0L2RvY3MvYWRtaW5pc3RyYXRvci1ndWlkZXMvcmV0ZW50aW9uLXBvbGljaWVzLydcblx0fSk7XG5cblx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9QcmVjaXNpb24nLCAnMCcsIHtcblx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHR2YWx1ZXM6IFtcblx0XHRcdHtcblx0XHRcdFx0a2V5OiAnMCcsXG5cdFx0XHRcdGkxOG5MYWJlbDogJ2V2ZXJ5XzMwX21pbnV0ZXMnXG5cdFx0XHR9LCB7XG5cdFx0XHRcdGtleTogJzEnLFxuXHRcdFx0XHRpMThuTGFiZWw6ICdldmVyeV9ob3VyJ1xuXHRcdFx0fSwge1xuXHRcdFx0XHRrZXk6ICcyJyxcblx0XHRcdFx0aTE4bkxhYmVsOiAnZXZlcnlfc2l4X2hvdXJzJ1xuXHRcdFx0fSwge1xuXHRcdFx0XHRrZXk6ICczJyxcblx0XHRcdFx0aTE4bkxhYmVsOiAnZXZlcnlfZGF5J1xuXHRcdFx0fVxuXHRcdF0sXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ1JldGVudGlvblBvbGljeV9QcmVjaXNpb24nLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ1JldGVudGlvblBvbGljeV9QcmVjaXNpb25fRGVzY3JpcHRpb24nLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRfaWQ6ICdSZXRlbnRpb25Qb2xpY3lfRW5hYmxlZCcsXG5cdFx0XHR2YWx1ZTogdHJ1ZVxuXHRcdH1cblx0fSk7XG5cblx0dGhpcy5zZWN0aW9uKCdHbG9iYWwgUG9saWN5JywgZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgZ2xvYmFsUXVlcnkgPSB7XG5cdFx0XHRfaWQ6ICdSZXRlbnRpb25Qb2xpY3lfRW5hYmxlZCcsXG5cdFx0XHR2YWx1ZTogdHJ1ZVxuXHRcdH07XG5cblx0XHR0aGlzLmFkZCgnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0NoYW5uZWxzJywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdGkxOG5MYWJlbDogJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9DaGFubmVscycsXG5cdFx0XHRlbmFibGVRdWVyeTogZ2xvYmFsUXVlcnlcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnUmV0ZW50aW9uUG9saWN5X01heEFnZV9DaGFubmVscycsIDMwLCB7XG5cdFx0XHR0eXBlOiAnaW50Jyxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdGkxOG5MYWJlbDogJ1JldGVudGlvblBvbGljeV9NYXhBZ2VfQ2hhbm5lbHMnLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnUmV0ZW50aW9uUG9saWN5X01heEFnZV9EZXNjcmlwdGlvbicsXG5cdFx0XHRlbmFibGVRdWVyeTogW3tcblx0XHRcdFx0X2lkOiAnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0NoYW5uZWxzJyxcblx0XHRcdFx0dmFsdWU6IHRydWVcblx0XHRcdH0sIGdsb2JhbFF1ZXJ5XVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9Hcm91cHMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0aTE4bkxhYmVsOiAnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0dyb3VwcycsXG5cdFx0XHRlbmFibGVRdWVyeTogZ2xvYmFsUXVlcnlcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnUmV0ZW50aW9uUG9saWN5X01heEFnZV9Hcm91cHMnLCAzMCwge1xuXHRcdFx0dHlwZTogJ2ludCcsXG5cdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHRpMThuTGFiZWw6ICdSZXRlbnRpb25Qb2xpY3lfTWF4QWdlX0dyb3VwcycsXG5cdFx0XHRpMThuRGVzY3JpcHRpb246ICdSZXRlbnRpb25Qb2xpY3lfTWF4QWdlX0Rlc2NyaXB0aW9uJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiBbe1xuXHRcdFx0XHRfaWQ6ICdSZXRlbnRpb25Qb2xpY3lfQXBwbGllc1RvR3JvdXBzJyxcblx0XHRcdFx0dmFsdWU6IHRydWVcblx0XHRcdH0sIGdsb2JhbFF1ZXJ5XVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9ETXMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0aTE4bkxhYmVsOiAnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0RNcycsXG5cdFx0XHRlbmFibGVRdWVyeTogZ2xvYmFsUXVlcnlcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnUmV0ZW50aW9uUG9saWN5X01heEFnZV9ETXMnLCAzMCwge1xuXHRcdFx0dHlwZTogJ2ludCcsXG5cdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHRpMThuTGFiZWw6ICdSZXRlbnRpb25Qb2xpY3lfTWF4QWdlX0RNcycsXG5cdFx0XHRpMThuRGVzY3JpcHRpb246ICdSZXRlbnRpb25Qb2xpY3lfTWF4QWdlX0Rlc2NyaXB0aW9uJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiBbe1xuXHRcdFx0XHRfaWQ6ICdSZXRlbnRpb25Qb2xpY3lfQXBwbGllc1RvRE1zJyxcblx0XHRcdFx0dmFsdWU6IHRydWVcblx0XHRcdH0sIGdsb2JhbFF1ZXJ5XVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9FeGNsdWRlUGlubmVkJywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdGkxOG5MYWJlbDogJ1JldGVudGlvblBvbGljeV9FeGNsdWRlUGlubmVkJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiBnbG9iYWxRdWVyeVxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdSZXRlbnRpb25Qb2xpY3lfRmlsZXNPbmx5JywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdGkxOG5MYWJlbDogJ1JldGVudGlvblBvbGljeV9GaWxlc09ubHknLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnUmV0ZW50aW9uUG9saWN5X0ZpbGVzT25seV9EZXNjcmlwdGlvbicsXG5cdFx0XHRlbmFibGVRdWVyeTogZ2xvYmFsUXVlcnlcblx0XHR9KTtcblx0fSk7XG59KTtcbiIsIi8qIGdsb2JhbHMgU3luY2VkQ3JvbiAqL1xuXG5sZXQgdHlwZXMgPSBbXTtcblxuY29uc3Qgb2xkZXN0ID0gbmV3IERhdGUoJzAwMDEtMDEtMDFUMDA6MDA6MDBaJyk7XG5cbmxldCBsYXN0UHJ1bmUgPSBvbGRlc3Q7XG5cbmNvbnN0IG1heFRpbWVzID0ge1xuXHRjOiAwLFxuXHRwOiAwLFxuXHRkOiAwXG59O1xuY29uc3QgdG9EYXlzID0gMTAwMCAqIDYwICogNjAgKiAyNDtcbmNvbnN0IGdyYWNlUGVyaW9kID0gNTAwMDtcbmZ1bmN0aW9uIGpvYigpIHtcblx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcblx0Y29uc3QgZmlsZXNPbmx5ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1JldGVudGlvblBvbGljeV9GaWxlc09ubHknKTtcblx0Y29uc3QgZXhjbHVkZVBpbm5lZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdSZXRlbnRpb25Qb2xpY3lfRXhjbHVkZVBpbm5lZCcpO1xuXG5cdC8vIGdldCBhbGwgcm9vbXMgd2l0aCBkZWZhdWx0IHZhbHVlc1xuXHR0eXBlcy5mb3JFYWNoKHR5cGUgPT4ge1xuXHRcdGNvbnN0IG1heEFnZSA9IG1heFRpbWVzW3R5cGVdIHx8IDA7XG5cdFx0Y29uc3QgbGF0ZXN0ID0gbmV3IERhdGUobm93LmdldFRpbWUoKSAtIG1heEFnZSAqIHRvRGF5cyk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKHtcblx0XHRcdHQ6IHR5cGUsXG5cdFx0XHRfdXBkYXRlZEF0OiB7ICRndGU6IGxhc3RQcnVuZSB9LFxuXHRcdFx0JG9yOiBbeydyZXRlbnRpb24uZW5hYmxlZCc6IHsgJGVxOiB0cnVlIH0gfSwgeyAncmV0ZW50aW9uLmVuYWJsZWQnOiB7ICRleGlzdHM6IGZhbHNlIH0gfV0sXG5cdFx0XHQncmV0ZW50aW9uLm92ZXJyaWRlR2xvYmFsJzogeyAkbmU6IHRydWUgfVxuXHRcdH0pLmZvckVhY2goKHsgX2lkOiByaWQgfSkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5jbGVhblJvb21IaXN0b3J5KHsgcmlkLCBsYXRlc3QsIG9sZGVzdCwgZmlsZXNPbmx5LCBleGNsdWRlUGlubmVkIH0pO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKHtcblx0XHQncmV0ZW50aW9uLmVuYWJsZWQnOiB7ICRlcTogdHJ1ZSB9LFxuXHRcdCdyZXRlbnRpb24ub3ZlcnJpZGVHbG9iYWwnOiB7ICRlcTogdHJ1ZSB9LFxuXHRcdCdyZXRlbnRpb24ubWF4QWdlJzogeyAkZ3RlOiAwIH0sXG5cdFx0X3VwZGF0ZWRBdDogeyAkZ3RlOiBsYXN0UHJ1bmUgfVxuXHR9KS5mb3JFYWNoKHJvb20gPT4ge1xuXHRcdGNvbnN0IHsgbWF4QWdlID0gMzAsIGZpbGVzT25seSwgZXhjbHVkZVBpbm5lZCB9ID0gcm9vbS5yZXRlbnRpb247XG5cdFx0Y29uc3QgbGF0ZXN0ID0gbmV3IERhdGUobm93LmdldFRpbWUoKSAtIG1heEFnZSAqIHRvRGF5cyk7XG5cdFx0Um9ja2V0Q2hhdC5jbGVhblJvb21IaXN0b3J5KHsgcmlkOiByb29tLl9pZCwgbGF0ZXN0LCBvbGRlc3QsIGZpbGVzT25seSwgZXhjbHVkZVBpbm5lZCB9KTtcblx0fSk7XG5cdGxhc3RQcnVuZSA9IG5ldyBEYXRlKG5vdy5nZXRUaW1lKCkgLSBncmFjZVBlcmlvZCk7XG59XG5cbmZ1bmN0aW9uIGdldFNjaGVkdWxlKHByZWNpc2lvbikge1xuXHRzd2l0Y2ggKHByZWNpc2lvbikge1xuXHRcdGNhc2UgJzAnOlxuXHRcdFx0cmV0dXJuICcwICovMzAgKiAqICogKic7XG5cdFx0Y2FzZSAnMSc6XG5cdFx0XHRyZXR1cm4gJzAgMCAqICogKiAqJztcblx0XHRjYXNlICcyJzpcblx0XHRcdHJldHVybiAnMCAwICovNiAqICogKic7XG5cdFx0Y2FzZSAnMyc6XG5cdFx0XHRyZXR1cm4gJzAgMCAwICogKiAqJztcblx0fVxufVxuXG5jb25zdCBwcnVuZUNyb25OYW1lID0gJ1BydW5lIG9sZCBtZXNzYWdlcyBieSByZXRlbnRpb24gcG9saWN5JztcblxuZnVuY3Rpb24gZGVwbG95Q3JvbihwcmVjaXNpb24pIHtcblx0Y29uc3Qgc2NoZWR1bGUgPSBwYXJzZXIgPT4gcGFyc2VyLmNyb24oZ2V0U2NoZWR1bGUocHJlY2lzaW9uKSwgdHJ1ZSk7XG5cblx0U3luY2VkQ3Jvbi5yZW1vdmUocHJ1bmVDcm9uTmFtZSk7XG5cdFN5bmNlZENyb24uYWRkKHtcblx0XHRuYW1lOiBwcnVuZUNyb25OYW1lLFxuXHRcdHNjaGVkdWxlLFxuXHRcdGpvYlxuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVsb2FkUG9saWN5KCkge1xuXHR0eXBlcyA9IFtdO1xuXG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnUmV0ZW50aW9uUG9saWN5X0VuYWJsZWQnKSkge1xuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0NoYW5uZWxzJykpIHtcblx0XHRcdHR5cGVzLnB1c2goJ2MnKTtcblx0XHR9XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9Hcm91cHMnKSkge1xuXHRcdFx0dHlwZXMucHVzaCgncCcpO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0RNcycpKSB7XG5cdFx0XHR0eXBlcy5wdXNoKCdkJyk7XG5cdFx0fVxuXG5cdFx0bWF4VGltZXMuYyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdSZXRlbnRpb25Qb2xpY3lfTWF4QWdlX0NoYW5uZWxzJyk7XG5cdFx0bWF4VGltZXMucCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdSZXRlbnRpb25Qb2xpY3lfTWF4QWdlX0dyb3VwcycpO1xuXHRcdG1heFRpbWVzLmQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnUmV0ZW50aW9uUG9saWN5X01heEFnZV9ETXMnKTtcblxuXHRcdHJldHVybiBkZXBsb3lDcm9uKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdSZXRlbnRpb25Qb2xpY3lfUHJlY2lzaW9uJykpO1xuXHR9XG5cdHJldHVybiBTeW5jZWRDcm9uLnJlbW92ZShwcnVuZUNyb25OYW1lKTtcbn1cblxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdE1ldGVvci5kZWZlcihmdW5jdGlvbigpIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKHtcblx0XHRcdF9pZDoge1xuXHRcdFx0XHQkaW46IFtcblx0XHRcdFx0XHQnUmV0ZW50aW9uUG9saWN5X0VuYWJsZWQnLFxuXHRcdFx0XHRcdCdSZXRlbnRpb25Qb2xpY3lfUHJlY2lzaW9uJyxcblx0XHRcdFx0XHQnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0NoYW5uZWxzJyxcblx0XHRcdFx0XHQnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0dyb3VwcycsXG5cdFx0XHRcdFx0J1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9ETXMnLFxuXHRcdFx0XHRcdCdSZXRlbnRpb25Qb2xpY3lfTWF4QWdlX0NoYW5uZWxzJyxcblx0XHRcdFx0XHQnUmV0ZW50aW9uUG9saWN5X01heEFnZV9Hcm91cHMnLFxuXHRcdFx0XHRcdCdSZXRlbnRpb25Qb2xpY3lfTWF4QWdlX0RNcydcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdH0pLm9ic2VydmUoe1xuXHRcdFx0Y2hhbmdlZCgpIHtcblx0XHRcdFx0cmVsb2FkUG9saWN5KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRyZWxvYWRQb2xpY3koKTtcblx0fSk7XG59KTtcbiJdfQ==
