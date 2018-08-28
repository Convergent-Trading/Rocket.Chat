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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:smarsh-connector":{"lib":{"rocketchat.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/lib/rocketchat.js                                                        //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
RocketChat.smarsh = {};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"settings.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/settings.js                                                       //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);
module.watch(require("moment-timezone"));
RocketChat.settings.addGroup('Smarsh', function addSettings() {
  this.add('Smarsh_Enabled', false, {
    type: 'boolean',
    i18nLabel: 'Smarsh_Enabled',
    enableQuery: {
      _id: 'From_Email',
      value: {
        $exists: 1,
        $ne: ''
      }
    }
  });
  this.add('Smarsh_Email', '', {
    type: 'string',
    i18nLabel: 'Smarsh_Email',
    placeholder: 'email@domain.com'
  });
  this.add('Smarsh_MissingEmail_Email', 'no-email@example.com', {
    type: 'string',
    i18nLabel: 'Smarsh_MissingEmail_Email',
    placeholder: 'no-email@example.com'
  });
  const zoneValues = moment.tz.names().map(function _timeZonesToSettings(name) {
    return {
      key: name,
      i18nLabel: name
    };
  });
  this.add('Smarsh_Timezone', 'America/Los_Angeles', {
    type: 'select',
    values: zoneValues
  });
  this.add('Smarsh_Interval', 'every_30_minutes', {
    type: 'select',
    values: [{
      key: 'every_30_seconds',
      i18nLabel: 'every_30_seconds'
    }, {
      key: 'every_30_minutes',
      i18nLabel: 'every_30_minutes'
    }, {
      key: 'every_1_hours',
      i18nLabel: 'every_hour'
    }, {
      key: 'every_6_hours',
      i18nLabel: 'every_six_hours'
    }],
    enableQuery: {
      _id: 'From_Email',
      value: {
        $exists: 1,
        $ne: ''
      }
    }
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"SmarshHistory.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/models/SmarshHistory.js                                           //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
RocketChat.smarsh.History = new class extends RocketChat.models._Base {
  constructor() {
    super('smarsh_history');
  }

}();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"sendEmail.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/functions/sendEmail.js                                            //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.smarsh.sendEmail = data => {
  const attachments = [];

  if (data.files.length > 0) {
    _.each(data.files, fileId => {
      const file = RocketChat.models.Uploads.findOneById(fileId);

      if (file.store === 'rocketchat_uploads' || file.store === 'fileSystem') {
        const rs = UploadFS.getStore(file.store).getReadStream(fileId, file);
        attachments.push({
          filename: file.name,
          streamSource: rs
        });
      }
    });
  }

  Email.send({
    to: RocketChat.settings.get('Smarsh_Email'),
    from: RocketChat.settings.get('From_Email'),
    subject: data.subject,
    html: data.body,
    attachments
  });
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"generateEml.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/functions/generateEml.js                                          //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 1);
module.watch(require("moment-timezone"));
const start = '<table style="width: 100%; border: 1px solid; border-collapse: collapse; table-layout: fixed; margin-top: 10px; font-size: 12px; word-break: break-word;"><tbody>';
const end = '</tbody></table>';
const opentr = '<tr style="border: 1px solid;">';
const closetr = '</tr>';
const open20td = '<td style="border: 1px solid; text-align: center; width: 20%;">';
const open60td = '<td style="border: 1px solid; text-align: left; width: 60%; padding: 0 5px;">';
const closetd = '</td>';

function _getLink(attachment) {
  const url = attachment.title_link.replace(/ /g, '%20');

  if (Meteor.settings.public.sandstorm || url.match(/^(https?:)?\/\//i)) {
    return url;
  } else {
    return Meteor.absoluteUrl().replace(/\/$/, '') + __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + url;
  }
}

RocketChat.smarsh.generateEml = () => {
  Meteor.defer(() => {
    const smarshMissingEmail = RocketChat.settings.get('Smarsh_MissingEmail_Email');
    const timeZone = RocketChat.settings.get('Smarsh_Timezone');
    RocketChat.models.Rooms.find().forEach(room => {
      const smarshHistory = RocketChat.smarsh.History.findOne({
        _id: room._id
      });
      const query = {
        rid: room._id
      };

      if (smarshHistory) {
        query.ts = {
          $gt: smarshHistory.lastRan
        };
      }

      const date = new Date();
      const rows = [];
      const data = {
        users: [],
        msgs: 0,
        files: [],
        time: smarshHistory ? moment(date).diff(moment(smarshHistory.lastRan), 'minutes') : moment(date).diff(moment(room.ts), 'minutes'),
        room: room.name ? `#${room.name}` : `Direct Message Between: ${room.usernames.join(' & ')}`
      };
      RocketChat.models.Messages.find(query).forEach(message => {
        rows.push(opentr); // The timestamp

        rows.push(open20td);
        rows.push(moment(message.ts).tz(timeZone).format('YYYY-MM-DD HH-mm-ss z'));
        rows.push(closetd); // The sender

        rows.push(open20td);
        const sender = RocketChat.models.Users.findOne({
          _id: message.u._id
        });

        if (data.users.indexOf(sender._id) === -1) {
          data.users.push(sender._id);
        } // Get the user's email, can be nothing if it is an unconfigured bot account (like rocket.cat)


        if (sender.emails && sender.emails[0] && sender.emails[0].address) {
          rows.push(`${sender.name} &lt;${sender.emails[0].address}&gt;`);
        } else {
          rows.push(`${sender.name} &lt;${smarshMissingEmail}&gt;`);
        }

        rows.push(closetd); // The message

        rows.push(open60td);
        data.msgs++;

        if (message.t) {
          const messageType = RocketChat.MessageTypes.getType(message);

          if (messageType) {
            rows.push(TAPi18n.__(messageType.message, messageType.data ? messageType.data(message) : '', 'en'));
          } else {
            rows.push(`${message.msg} (${message.t})`);
          }
        } else if (message.file) {
          data.files.push(message.file._id);
          rows.push(`${message.attachments[0].title} (${_getLink(message.attachments[0])})`);
        } else if (message.attachments) {
          const attaches = [];

          _.each(message.attachments, function _loopThroughMessageAttachments(a) {
            if (a.image_url) {
              attaches.push(a.image_url);
            } // TODO: Verify other type of attachments which need to be handled that aren't file uploads and image urls
            // } else {
            // 	console.log(a);
            // }

          });

          rows.push(`${message.msg} (${attaches.join(', ')})`);
        } else {
          rows.push(message.msg);
        }

        rows.push(closetd);
        rows.push(closetr);
      });

      if (rows.length !== 0) {
        const result = start + rows.join('') + end;
        RocketChat.smarsh.History.upsert({
          _id: room._id
        }, {
          _id: room._id,
          lastRan: date,
          lastResult: result
        });
        RocketChat.smarsh.sendEmail({
          body: result,
          subject: `Rocket.Chat, ${data.users.length} Users, ${data.msgs} Messages, ${data.files.length} Files, ${data.time} Minutes, in ${data.room}`,
          files: data.files
        });
      }
    });
  });
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/startup.js                                                        //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const smarshJobName = 'Smarsh EML Connector';

const _addSmarshSyncedCronJob = _.debounce(Meteor.bindEnvironment(function __addSmarshSyncedCronJobDebounced() {
  if (SyncedCron.nextScheduledAtDate(smarshJobName)) {
    SyncedCron.remove(smarshJobName);
  }

  if (RocketChat.settings.get('Smarsh_Enabled') && RocketChat.settings.get('Smarsh_Email') !== '' && RocketChat.settings.get('From_Email') !== '') {
    SyncedCron.add({
      name: smarshJobName,
      schedule: parser => parser.text(RocketChat.settings.get('Smarsh_Interval').replace(/_/g, ' ')),
      job: RocketChat.smarsh.generateEml
    });
  }
}), 500);

Meteor.startup(() => {
  Meteor.defer(() => {
    _addSmarshSyncedCronJob();

    RocketChat.settings.get('Smarsh_Interval', _addSmarshSyncedCronJob);
    RocketChat.settings.get('Smarsh_Enabled', _addSmarshSyncedCronJob);
    RocketChat.settings.get('Smarsh_Email', _addSmarshSyncedCronJob);
    RocketChat.settings.get('From_Email', _addSmarshSyncedCronJob);
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:smarsh-connector/lib/rocketchat.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/settings.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/models/SmarshHistory.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/functions/sendEmail.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/functions/generateEml.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/startup.js");

/* Exports */
Package._define("rocketchat:smarsh-connector");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_smarsh-connector.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbWFyc2gtY29ubmVjdG9yL2xpYi9yb2NrZXRjaGF0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNtYXJzaC1jb25uZWN0b3Ivc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNtYXJzaC1jb25uZWN0b3Ivc2VydmVyL21vZGVscy9TbWFyc2hIaXN0b3J5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNtYXJzaC1jb25uZWN0b3Ivc2VydmVyL2Z1bmN0aW9ucy9zZW5kRW1haWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c21hcnNoLWNvbm5lY3Rvci9zZXJ2ZXIvZnVuY3Rpb25zL2dlbmVyYXRlRW1sLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNtYXJzaC1jb25uZWN0b3Ivc2VydmVyL3N0YXJ0dXAuanMiXSwibmFtZXMiOlsiUm9ja2V0Q2hhdCIsInNtYXJzaCIsIm1vbWVudCIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2Iiwic2V0dGluZ3MiLCJhZGRHcm91cCIsImFkZFNldHRpbmdzIiwiYWRkIiwidHlwZSIsImkxOG5MYWJlbCIsImVuYWJsZVF1ZXJ5IiwiX2lkIiwidmFsdWUiLCIkZXhpc3RzIiwiJG5lIiwicGxhY2Vob2xkZXIiLCJ6b25lVmFsdWVzIiwidHoiLCJuYW1lcyIsIm1hcCIsIl90aW1lWm9uZXNUb1NldHRpbmdzIiwibmFtZSIsImtleSIsInZhbHVlcyIsIkhpc3RvcnkiLCJtb2RlbHMiLCJfQmFzZSIsImNvbnN0cnVjdG9yIiwiXyIsInNlbmRFbWFpbCIsImRhdGEiLCJhdHRhY2htZW50cyIsImZpbGVzIiwibGVuZ3RoIiwiZWFjaCIsImZpbGVJZCIsImZpbGUiLCJVcGxvYWRzIiwiZmluZE9uZUJ5SWQiLCJzdG9yZSIsInJzIiwiVXBsb2FkRlMiLCJnZXRTdG9yZSIsImdldFJlYWRTdHJlYW0iLCJwdXNoIiwiZmlsZW5hbWUiLCJzdHJlYW1Tb3VyY2UiLCJFbWFpbCIsInNlbmQiLCJ0byIsImdldCIsImZyb20iLCJzdWJqZWN0IiwiaHRtbCIsImJvZHkiLCJzdGFydCIsImVuZCIsIm9wZW50ciIsImNsb3NldHIiLCJvcGVuMjB0ZCIsIm9wZW42MHRkIiwiY2xvc2V0ZCIsIl9nZXRMaW5rIiwiYXR0YWNobWVudCIsInVybCIsInRpdGxlX2xpbmsiLCJyZXBsYWNlIiwiTWV0ZW9yIiwicHVibGljIiwic2FuZHN0b3JtIiwibWF0Y2giLCJhYnNvbHV0ZVVybCIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTF9QQVRIX1BSRUZJWCIsImdlbmVyYXRlRW1sIiwiZGVmZXIiLCJzbWFyc2hNaXNzaW5nRW1haWwiLCJ0aW1lWm9uZSIsIlJvb21zIiwiZmluZCIsImZvckVhY2giLCJyb29tIiwic21hcnNoSGlzdG9yeSIsImZpbmRPbmUiLCJxdWVyeSIsInJpZCIsInRzIiwiJGd0IiwibGFzdFJhbiIsImRhdGUiLCJEYXRlIiwicm93cyIsInVzZXJzIiwibXNncyIsInRpbWUiLCJkaWZmIiwidXNlcm5hbWVzIiwiam9pbiIsIk1lc3NhZ2VzIiwibWVzc2FnZSIsImZvcm1hdCIsInNlbmRlciIsIlVzZXJzIiwidSIsImluZGV4T2YiLCJlbWFpbHMiLCJhZGRyZXNzIiwidCIsIm1lc3NhZ2VUeXBlIiwiTWVzc2FnZVR5cGVzIiwiZ2V0VHlwZSIsIlRBUGkxOG4iLCJfXyIsIm1zZyIsInRpdGxlIiwiYXR0YWNoZXMiLCJfbG9vcFRocm91Z2hNZXNzYWdlQXR0YWNobWVudHMiLCJhIiwiaW1hZ2VfdXJsIiwicmVzdWx0IiwidXBzZXJ0IiwibGFzdFJlc3VsdCIsInNtYXJzaEpvYk5hbWUiLCJfYWRkU21hcnNoU3luY2VkQ3JvbkpvYiIsImRlYm91bmNlIiwiYmluZEVudmlyb25tZW50IiwiX19hZGRTbWFyc2hTeW5jZWRDcm9uSm9iRGVib3VuY2VkIiwiU3luY2VkQ3JvbiIsIm5leHRTY2hlZHVsZWRBdERhdGUiLCJyZW1vdmUiLCJzY2hlZHVsZSIsInBhcnNlciIsInRleHQiLCJqb2IiLCJzdGFydHVwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLFdBQVdDLE1BQVgsR0FBb0IsRUFBcEIsQzs7Ozs7Ozs7Ozs7QUNBQSxJQUFJQyxNQUFKO0FBQVdDLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxRQUFSLENBQWIsRUFBK0I7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLGFBQU9LLENBQVA7QUFBUzs7QUFBckIsQ0FBL0IsRUFBc0QsQ0FBdEQ7QUFBeURKLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxpQkFBUixDQUFiO0FBR3BFTCxXQUFXUSxRQUFYLENBQW9CQyxRQUFwQixDQUE2QixRQUE3QixFQUF1QyxTQUFTQyxXQUFULEdBQXVCO0FBQzdELE9BQUtDLEdBQUwsQ0FBUyxnQkFBVCxFQUEyQixLQUEzQixFQUFrQztBQUNqQ0MsVUFBTSxTQUQyQjtBQUVqQ0MsZUFBVyxnQkFGc0I7QUFHakNDLGlCQUFhO0FBQ1pDLFdBQUssWUFETztBQUVaQyxhQUFPO0FBQ05DLGlCQUFTLENBREg7QUFFTkMsYUFBSztBQUZDO0FBRks7QUFIb0IsR0FBbEM7QUFXQSxPQUFLUCxHQUFMLENBQVMsY0FBVCxFQUF5QixFQUF6QixFQUE2QjtBQUM1QkMsVUFBTSxRQURzQjtBQUU1QkMsZUFBVyxjQUZpQjtBQUc1Qk0saUJBQWE7QUFIZSxHQUE3QjtBQUtBLE9BQUtSLEdBQUwsQ0FBUywyQkFBVCxFQUFzQyxzQkFBdEMsRUFBOEQ7QUFDN0RDLFVBQU0sUUFEdUQ7QUFFN0RDLGVBQVcsMkJBRmtEO0FBRzdETSxpQkFBYTtBQUhnRCxHQUE5RDtBQU1BLFFBQU1DLGFBQWFsQixPQUFPbUIsRUFBUCxDQUFVQyxLQUFWLEdBQWtCQyxHQUFsQixDQUFzQixT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USxRQUFYLENBQW9COEMsR0FBcEIsQ0FBd0IsWUFBeEIsTUFBMEMsRUFBN0ksRUFBaUo7QUFDaEo2RSxlQUFXeEgsR0FBWCxDQUFlO0FBQ2RjLFlBQU1xRyxhQURRO0FBRWRRLGdCQUFXQyxNQUFELElBQVlBLE9BQU9DLElBQVAsQ0FBWXhJLFdBQVdRLFFBQVgsQ0FBb0I4QyxHQUFwQixDQUF3QixpQkFBeEIsRUFBMkNnQixPQUEzQyxDQUFtRCxJQUFuRCxFQUF5RCxHQUF6RCxDQUFaLENBRlI7QUFHZG1FLFdBQUt6SSxXQUFXQyxNQUFYLENBQWtCNkU7QUFIVCxLQUFmO0FBS0E7QUFDRCxDQVowQyxDQUFYLEVBWTVCLEdBWjRCLENBQWhDOztBQWNBUCxPQUFPbUUsT0FBUCxDQUFlLE1BQU07QUFDcEJuRSxTQUFPUSxLQUFQLENBQWEsTUFBTTtBQUNsQmdEOztBQUVBL0gsZUFBV1EsUUFBWCxDQUFvQjhDLEdBQXBCLENBQXdCLGlCQUF4QixFQUEyQ3lFLHVCQUEzQztBQUNBL0gsZUFBV1EsUUFBWCxDQUFvQjhDLEdBQXBCLENBQXdCLGdCQUF4QixFQUEwQ3lFLHVCQUExQztBQUNBL0gsZUFBV1EsUUFBWCxDQUFvQjhDLEdBQXBCLENBQXdCLGNBQXhCLEVBQXdDeUUsdUJBQXhDO0FBQ0EvSCxlQUFXUSxRQUFYLENBQW9COEMsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBc0N5RSx1QkFBdEM7QUFDQSxHQVBEO0FBUUEsQ0FURCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3NtYXJzaC1jb25uZWN0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJSb2NrZXRDaGF0LnNtYXJzaCA9IHt9O1xuIiwiaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuaW1wb3J0ICdtb21lbnQtdGltZXpvbmUnO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdTbWFyc2gnLCBmdW5jdGlvbiBhZGRTZXR0aW5ncygpIHtcblx0dGhpcy5hZGQoJ1NtYXJzaF9FbmFibGVkJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0aTE4bkxhYmVsOiAnU21hcnNoX0VuYWJsZWQnLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRfaWQ6ICdGcm9tX0VtYWlsJyxcblx0XHRcdHZhbHVlOiB7XG5cdFx0XHRcdCRleGlzdHM6IDEsXG5cdFx0XHRcdCRuZTogJycsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdH0pO1xuXHR0aGlzLmFkZCgnU21hcnNoX0VtYWlsJywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRpMThuTGFiZWw6ICdTbWFyc2hfRW1haWwnLFxuXHRcdHBsYWNlaG9sZGVyOiAnZW1haWxAZG9tYWluLmNvbScsXG5cdH0pO1xuXHR0aGlzLmFkZCgnU21hcnNoX01pc3NpbmdFbWFpbF9FbWFpbCcsICduby1lbWFpbEBleGFtcGxlLmNvbScsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRpMThuTGFiZWw6ICdTbWFyc2hfTWlzc2luZ0VtYWlsX0VtYWlsJyxcblx0XHRwbGFjZWhvbGRlcjogJ25vLWVtYWlsQGV4YW1wbGUuY29tJyxcblx0fSk7XG5cblx0Y29uc3Qgem9uZVZhbHVlcyA9IG1vbWVudC50ei5uYW1lcygpLm1hcChmdW5jdGlvbiBfdGltZVpvbmVzVG9TZXR0aW5ncyhuYW1lKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGtleTogbmFtZSxcblx0XHRcdGkxOG5MYWJlbDogbmFtZSxcblx0XHR9O1xuXHR9KTtcblx0dGhpcy5hZGQoJ1NtYXJzaF9UaW1lem9uZScsICdBbWVyaWNhL0xvc19BbmdlbGVzJywge1xuXHRcdHR5cGU6ICdzZWxlY3QnLFxuXHRcdHZhbHVlczogem9uZVZhbHVlcyxcblx0fSk7XG5cblx0dGhpcy5hZGQoJ1NtYXJzaF9JbnRlcnZhbCcsICdldmVyeV8zMF9taW51dGVzJywge1xuXHRcdHR5cGU6ICdzZWxlY3QnLFxuXHRcdHZhbHVlczogW3tcblx0XHRcdGtleTogJ2V2ZXJ5XzMwX3NlY29uZHMnLFxuXHRcdFx0aTE4bkxhYmVsOiAnZXZlcnlfMzBfc2Vjb25kcycsXG5cdFx0fSwge1xuXHRcdFx0a2V5OiAnZXZlcnlfMzBfbWludXRlcycsXG5cdFx0XHRpMThuTGFiZWw6ICdldmVyeV8zMF9taW51dGVzJyxcblx0XHR9LCB7XG5cdFx0XHRrZXk6ICdldmVyeV8xX2hvdXJzJyxcblx0XHRcdGkxOG5MYWJlbDogJ2V2ZXJ5X2hvdXInLFxuXHRcdH0sIHtcblx0XHRcdGtleTogJ2V2ZXJ5XzZfaG91cnMnLFxuXHRcdFx0aTE4bkxhYmVsOiAnZXZlcnlfc2l4X2hvdXJzJyxcblx0XHR9XSxcblx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0X2lkOiAnRnJvbV9FbWFpbCcsXG5cdFx0XHR2YWx1ZToge1xuXHRcdFx0XHQkZXhpc3RzOiAxLFxuXHRcdFx0XHQkbmU6ICcnLFxuXHRcdFx0fSxcblx0XHR9LFxuXHR9KTtcbn0pO1xuIiwiUm9ja2V0Q2hhdC5zbWFyc2guSGlzdG9yeSA9IG5ldyBjbGFzcyBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ3NtYXJzaF9oaXN0b3J5Jyk7XG5cdH1cbn07XG4iLCIvKiBnbG9iYWxzIFVwbG9hZEZTICovXG4vLyBFeHBlY3RzIHRoZSBmb2xsb3dpbmcgZGV0YWlsczpcbi8vIHtcbi8vIFx0Ym9keTogJzx0YWJsZT4nLFxuLy8gXHRzdWJqZWN0OiAnUm9ja2V0LkNoYXQsIDE3IFVzZXJzLCAyNCBNZXNzYWdlcywgMSBGaWxlLCA3OTk1MDQgTWludXRlcywgaW4gI3JhbmRvbScsXG4vLyAgZmlsZXM6IFsnaTNuYzlsM21uJ11cbi8vIH1cblxuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cblJvY2tldENoYXQuc21hcnNoLnNlbmRFbWFpbCA9IChkYXRhKSA9PiB7XG5cdGNvbnN0IGF0dGFjaG1lbnRzID0gW107XG5cblx0aWYgKGRhdGEuZmlsZXMubGVuZ3RoID4gMCkge1xuXHRcdF8uZWFjaChkYXRhLmZpbGVzLCAoZmlsZUlkKSA9PiB7XG5cdFx0XHRjb25zdCBmaWxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kT25lQnlJZChmaWxlSWQpO1xuXHRcdFx0aWYgKGZpbGUuc3RvcmUgPT09ICdyb2NrZXRjaGF0X3VwbG9hZHMnIHx8IGZpbGUuc3RvcmUgPT09ICdmaWxlU3lzdGVtJykge1xuXHRcdFx0XHRjb25zdCBycyA9IFVwbG9hZEZTLmdldFN0b3JlKGZpbGUuc3RvcmUpLmdldFJlYWRTdHJlYW0oZmlsZUlkLCBmaWxlKTtcblx0XHRcdFx0YXR0YWNobWVudHMucHVzaCh7XG5cdFx0XHRcdFx0ZmlsZW5hbWU6IGZpbGUubmFtZSxcblx0XHRcdFx0XHRzdHJlYW1Tb3VyY2U6IHJzLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdEVtYWlsLnNlbmQoe1xuXHRcdHRvOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU21hcnNoX0VtYWlsJyksXG5cdFx0ZnJvbTogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Zyb21fRW1haWwnKSxcblx0XHRzdWJqZWN0OiBkYXRhLnN1YmplY3QsXG5cdFx0aHRtbDogZGF0YS5ib2R5LFxuXHRcdGF0dGFjaG1lbnRzLFxuXHR9KTtcbn07XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCAnbW9tZW50LXRpbWV6b25lJztcblxuY29uc3Qgc3RhcnQgPSAnPHRhYmxlIHN0eWxlPVwid2lkdGg6IDEwMCU7IGJvcmRlcjogMXB4IHNvbGlkOyBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlOyB0YWJsZS1sYXlvdXQ6IGZpeGVkOyBtYXJnaW4tdG9wOiAxMHB4OyBmb250LXNpemU6IDEycHg7IHdvcmQtYnJlYWs6IGJyZWFrLXdvcmQ7XCI+PHRib2R5Pic7XG5jb25zdCBlbmQgPSAnPC90Ym9keT48L3RhYmxlPic7XG5jb25zdCBvcGVudHIgPSAnPHRyIHN0eWxlPVwiYm9yZGVyOiAxcHggc29saWQ7XCI+JztcbmNvbnN0IGNsb3NldHIgPSAnPC90cj4nO1xuY29uc3Qgb3BlbjIwdGQgPSAnPHRkIHN0eWxlPVwiYm9yZGVyOiAxcHggc29saWQ7IHRleHQtYWxpZ246IGNlbnRlcjsgd2lkdGg6IDIwJTtcIj4nO1xuY29uc3Qgb3BlbjYwdGQgPSAnPHRkIHN0eWxlPVwiYm9yZGVyOiAxcHggc29saWQ7IHRleHQtYWxpZ246IGxlZnQ7IHdpZHRoOiA2MCU7IHBhZGRpbmc6IDAgNXB4O1wiPic7XG5jb25zdCBjbG9zZXRkID0gJzwvdGQ+JztcblxuZnVuY3Rpb24gX2dldExpbmsoYXR0YWNobWVudCkge1xuXHRjb25zdCB1cmwgPSBhdHRhY2htZW50LnRpdGxlX2xpbmsucmVwbGFjZSgvIC9nLCAnJTIwJyk7XG5cblx0aWYgKE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuc2FuZHN0b3JtIHx8IHVybC5tYXRjaCgvXihodHRwcz86KT9cXC9cXC8vaSkpIHtcblx0XHRyZXR1cm4gdXJsO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBNZXRlb3IuYWJzb2x1dGVVcmwoKS5yZXBsYWNlKC9cXC8kLywgJycpICsgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCArIHVybDtcblx0fVxufVxuXG5Sb2NrZXRDaGF0LnNtYXJzaC5nZW5lcmF0ZUVtbCA9ICgpID0+IHtcblx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRjb25zdCBzbWFyc2hNaXNzaW5nRW1haWwgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU21hcnNoX01pc3NpbmdFbWFpbF9FbWFpbCcpO1xuXHRcdGNvbnN0IHRpbWVab25lID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NtYXJzaF9UaW1lem9uZScpO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZCgpLmZvckVhY2goKHJvb20pID0+IHtcblx0XHRcdGNvbnN0IHNtYXJzaEhpc3RvcnkgPSBSb2NrZXRDaGF0LnNtYXJzaC5IaXN0b3J5LmZpbmRPbmUoeyBfaWQ6IHJvb20uX2lkIH0pO1xuXHRcdFx0Y29uc3QgcXVlcnkgPSB7IHJpZDogcm9vbS5faWQgfTtcblxuXHRcdFx0aWYgKHNtYXJzaEhpc3RvcnkpIHtcblx0XHRcdFx0cXVlcnkudHMgPSB7ICRndDogc21hcnNoSGlzdG9yeS5sYXN0UmFuIH07XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0Y29uc3Qgcm93cyA9IFtdO1xuXHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0dXNlcnM6IFtdLFxuXHRcdFx0XHRtc2dzOiAwLFxuXHRcdFx0XHRmaWxlczogW10sXG5cdFx0XHRcdHRpbWU6IHNtYXJzaEhpc3RvcnkgPyBtb21lbnQoZGF0ZSkuZGlmZihtb21lbnQoc21hcnNoSGlzdG9yeS5sYXN0UmFuKSwgJ21pbnV0ZXMnKSA6IG1vbWVudChkYXRlKS5kaWZmKG1vbWVudChyb29tLnRzKSwgJ21pbnV0ZXMnKSxcblx0XHRcdFx0cm9vbTogcm9vbS5uYW1lID8gYCMkeyByb29tLm5hbWUgfWAgOiBgRGlyZWN0IE1lc3NhZ2UgQmV0d2VlbjogJHsgcm9vbS51c2VybmFtZXMuam9pbignICYgJykgfWAsXG5cdFx0XHR9O1xuXG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kKHF1ZXJ5KS5mb3JFYWNoKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRcdHJvd3MucHVzaChvcGVudHIpO1xuXG5cdFx0XHRcdC8vIFRoZSB0aW1lc3RhbXBcblx0XHRcdFx0cm93cy5wdXNoKG9wZW4yMHRkKTtcblx0XHRcdFx0cm93cy5wdXNoKG1vbWVudChtZXNzYWdlLnRzKS50eih0aW1lWm9uZSkuZm9ybWF0KCdZWVlZLU1NLUREIEhILW1tLXNzIHonKSk7XG5cdFx0XHRcdHJvd3MucHVzaChjbG9zZXRkKTtcblxuXHRcdFx0XHQvLyBUaGUgc2VuZGVyXG5cdFx0XHRcdHJvd3MucHVzaChvcGVuMjB0ZCk7XG5cdFx0XHRcdGNvbnN0IHNlbmRlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUoeyBfaWQ6IG1lc3NhZ2UudS5faWQgfSk7XG5cdFx0XHRcdGlmIChkYXRhLnVzZXJzLmluZGV4T2Yoc2VuZGVyLl9pZCkgPT09IC0xKSB7XG5cdFx0XHRcdFx0ZGF0YS51c2Vycy5wdXNoKHNlbmRlci5faWQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gR2V0IHRoZSB1c2VyJ3MgZW1haWwsIGNhbiBiZSBub3RoaW5nIGlmIGl0IGlzIGFuIHVuY29uZmlndXJlZCBib3QgYWNjb3VudCAobGlrZSByb2NrZXQuY2F0KVxuXHRcdFx0XHRpZiAoc2VuZGVyLmVtYWlscyAmJiBzZW5kZXIuZW1haWxzWzBdICYmIHNlbmRlci5lbWFpbHNbMF0uYWRkcmVzcykge1xuXHRcdFx0XHRcdHJvd3MucHVzaChgJHsgc2VuZGVyLm5hbWUgfSAmbHQ7JHsgc2VuZGVyLmVtYWlsc1swXS5hZGRyZXNzIH0mZ3Q7YCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cm93cy5wdXNoKGAkeyBzZW5kZXIubmFtZSB9ICZsdDskeyBzbWFyc2hNaXNzaW5nRW1haWwgfSZndDtgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyb3dzLnB1c2goY2xvc2V0ZCk7XG5cblx0XHRcdFx0Ly8gVGhlIG1lc3NhZ2Vcblx0XHRcdFx0cm93cy5wdXNoKG9wZW42MHRkKTtcblx0XHRcdFx0ZGF0YS5tc2dzKys7XG5cdFx0XHRcdGlmIChtZXNzYWdlLnQpIHtcblx0XHRcdFx0XHRjb25zdCBtZXNzYWdlVHlwZSA9IFJvY2tldENoYXQuTWVzc2FnZVR5cGVzLmdldFR5cGUobWVzc2FnZSk7XG5cdFx0XHRcdFx0aWYgKG1lc3NhZ2VUeXBlKSB7XG5cdFx0XHRcdFx0XHRyb3dzLnB1c2goVEFQaTE4bi5fXyhtZXNzYWdlVHlwZS5tZXNzYWdlLCBtZXNzYWdlVHlwZS5kYXRhID8gbWVzc2FnZVR5cGUuZGF0YShtZXNzYWdlKSA6ICcnLCAnZW4nKSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHJvd3MucHVzaChgJHsgbWVzc2FnZS5tc2cgfSAoJHsgbWVzc2FnZS50IH0pYCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKG1lc3NhZ2UuZmlsZSkge1xuXHRcdFx0XHRcdGRhdGEuZmlsZXMucHVzaChtZXNzYWdlLmZpbGUuX2lkKTtcblx0XHRcdFx0XHRyb3dzLnB1c2goYCR7IG1lc3NhZ2UuYXR0YWNobWVudHNbMF0udGl0bGUgfSAoJHsgX2dldExpbmsobWVzc2FnZS5hdHRhY2htZW50c1swXSkgfSlgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChtZXNzYWdlLmF0dGFjaG1lbnRzKSB7XG5cdFx0XHRcdFx0Y29uc3QgYXR0YWNoZXMgPSBbXTtcblx0XHRcdFx0XHRfLmVhY2gobWVzc2FnZS5hdHRhY2htZW50cywgZnVuY3Rpb24gX2xvb3BUaHJvdWdoTWVzc2FnZUF0dGFjaG1lbnRzKGEpIHtcblx0XHRcdFx0XHRcdGlmIChhLmltYWdlX3VybCkge1xuXHRcdFx0XHRcdFx0XHRhdHRhY2hlcy5wdXNoKGEuaW1hZ2VfdXJsKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIFRPRE86IFZlcmlmeSBvdGhlciB0eXBlIG9mIGF0dGFjaG1lbnRzIHdoaWNoIG5lZWQgdG8gYmUgaGFuZGxlZCB0aGF0IGFyZW4ndCBmaWxlIHVwbG9hZHMgYW5kIGltYWdlIHVybHNcblx0XHRcdFx0XHRcdC8vIH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBcdGNvbnNvbGUubG9nKGEpO1xuXHRcdFx0XHRcdFx0Ly8gfVxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cm93cy5wdXNoKGAkeyBtZXNzYWdlLm1zZyB9ICgkeyBhdHRhY2hlcy5qb2luKCcsICcpIH0pYCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cm93cy5wdXNoKG1lc3NhZ2UubXNnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyb3dzLnB1c2goY2xvc2V0ZCk7XG5cblx0XHRcdFx0cm93cy5wdXNoKGNsb3NldHIpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChyb3dzLmxlbmd0aCAhPT0gMCkge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzdGFydCArIHJvd3Muam9pbignJykgKyBlbmQ7XG5cblx0XHRcdFx0Um9ja2V0Q2hhdC5zbWFyc2guSGlzdG9yeS51cHNlcnQoeyBfaWQ6IHJvb20uX2lkIH0sIHtcblx0XHRcdFx0XHRfaWQ6IHJvb20uX2lkLFxuXHRcdFx0XHRcdGxhc3RSYW46IGRhdGUsXG5cdFx0XHRcdFx0bGFzdFJlc3VsdDogcmVzdWx0LFxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRSb2NrZXRDaGF0LnNtYXJzaC5zZW5kRW1haWwoe1xuXHRcdFx0XHRcdGJvZHk6IHJlc3VsdCxcblx0XHRcdFx0XHRzdWJqZWN0OiBgUm9ja2V0LkNoYXQsICR7IGRhdGEudXNlcnMubGVuZ3RoIH0gVXNlcnMsICR7IGRhdGEubXNncyB9IE1lc3NhZ2VzLCAkeyBkYXRhLmZpbGVzLmxlbmd0aCB9IEZpbGVzLCAkeyBkYXRhLnRpbWUgfSBNaW51dGVzLCBpbiAkeyBkYXRhLnJvb20gfWAsXG5cdFx0XHRcdFx0ZmlsZXM6IGRhdGEuZmlsZXMsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn07XG4iLCIvKiBnbG9iYWxzIFN5bmNlZENyb24gKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5jb25zdCBzbWFyc2hKb2JOYW1lID0gJ1NtYXJzaCBFTUwgQ29ubmVjdG9yJztcblxuY29uc3QgX2FkZFNtYXJzaFN5bmNlZENyb25Kb2IgPSBfLmRlYm91bmNlKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24gX19hZGRTbWFyc2hTeW5jZWRDcm9uSm9iRGVib3VuY2VkKCkge1xuXHRpZiAoU3luY2VkQ3Jvbi5uZXh0U2NoZWR1bGVkQXREYXRlKHNtYXJzaEpvYk5hbWUpKSB7XG5cdFx0U3luY2VkQ3Jvbi5yZW1vdmUoc21hcnNoSm9iTmFtZSk7XG5cdH1cblxuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NtYXJzaF9FbmFibGVkJykgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NtYXJzaF9FbWFpbCcpICE9PSAnJyAmJiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRnJvbV9FbWFpbCcpICE9PSAnJykge1xuXHRcdFN5bmNlZENyb24uYWRkKHtcblx0XHRcdG5hbWU6IHNtYXJzaEpvYk5hbWUsXG5cdFx0XHRzY2hlZHVsZTogKHBhcnNlcikgPT4gcGFyc2VyLnRleHQoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NtYXJzaF9JbnRlcnZhbCcpLnJlcGxhY2UoL18vZywgJyAnKSksXG5cdFx0XHRqb2I6IFJvY2tldENoYXQuc21hcnNoLmdlbmVyYXRlRW1sLFxuXHRcdH0pO1xuXHR9XG59KSwgNTAwKTtcblxuTWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuXHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdF9hZGRTbWFyc2hTeW5jZWRDcm9uSm9iKCk7XG5cblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU21hcnNoX0ludGVydmFsJywgX2FkZFNtYXJzaFN5bmNlZENyb25Kb2IpO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTbWFyc2hfRW5hYmxlZCcsIF9hZGRTbWFyc2hTeW5jZWRDcm9uSm9iKTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU21hcnNoX0VtYWlsJywgX2FkZFNtYXJzaFN5bmNlZENyb25Kb2IpO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGcm9tX0VtYWlsJywgX2FkZFNtYXJzaFN5bmNlZENyb25Kb2IpO1xuXHR9KTtcbn0pO1xuIl19
