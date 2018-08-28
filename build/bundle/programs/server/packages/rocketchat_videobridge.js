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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:videobridge":{"lib":{"messageType.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/lib/messageType.js                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.startup(function () {
  RocketChat.MessageTypes.registerType({
    id: 'jitsi_call_started',
    system: true,
    message: TAPi18n.__('Started_a_video_call')
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"settings.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/settings.js                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.startup(function () {
  RocketChat.settings.addGroup('Video Conference', function () {
    this.section('BigBlueButton', function () {
      this.add('bigbluebutton_Enabled', false, {
        type: 'boolean',
        i18nLabel: 'Enabled',
        alert: 'This Feature is currently in beta! Please report bugs to github.com/RocketChat/Rocket.Chat/issues',
        public: true
      });
      this.add('bigbluebutton_server', '', {
        type: 'string',
        i18nLabel: 'Domain',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        }
      });
      this.add('bigbluebutton_sharedSecret', '', {
        type: 'string',
        i18nLabel: 'Shared_Secret',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        }
      });
      this.add('bigbluebutton_enable_d', true, {
        type: 'boolean',
        i18nLabel: 'WebRTC_Enable_Direct',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        },
        public: true
      });
      this.add('bigbluebutton_enable_p', true, {
        type: 'boolean',
        i18nLabel: 'WebRTC_Enable_Private',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        },
        public: true
      });
      this.add('bigbluebutton_enable_c', false, {
        type: 'boolean',
        i18nLabel: 'WebRTC_Enable_Channel',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        },
        public: true
      });
    });
    this.section('Jitsi', function () {
      this.add('Jitsi_Enabled', false, {
        type: 'boolean',
        i18nLabel: 'Enabled',
        alert: 'This Feature is currently in beta! Please report bugs to github.com/RocketChat/Rocket.Chat/issues',
        public: true
      });
      this.add('Jitsi_Domain', 'meet.jit.si', {
        type: 'string',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'Domain',
        public: true
      });
      this.add('Jitsi_URL_Room_Prefix', 'RocketChat', {
        type: 'string',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'URL_room_prefix',
        public: true
      });
      this.add('Jitsi_SSL', true, {
        type: 'boolean',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'SSL',
        public: true
      });
      this.add('Jitsi_Open_New_Window', false, {
        type: 'boolean',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'Always_open_in_new_window',
        public: true
      });
      this.add('Jitsi_Enable_Channels', false, {
        type: 'boolean',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'Jitsi_Enable_Channels',
        public: true
      });
      this.add('Jitsi_Chrome_Extension', 'nocfbnnmjnndkbipkabodnheejiegccf', {
        type: 'string',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'Jitsi_Chrome_Extension',
        public: true
      });
    });
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"Rooms.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/models/Rooms.js                                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/**
 * sets jitsiTimeout to indicate a call is in progress
 * @param {string} _id - Room id
 * @parm {number} time - time to set
 */
RocketChat.models.Rooms.setJitsiTimeout = function (_id, time) {
  const query = {
    _id
  };
  const update = {
    $set: {
      jitsiTimeout: time
    }
  };
  return this.update(query, update);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"jitsiSetTimeout.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/methods/jitsiSetTimeout.js                                                //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.methods({
  'jitsi:updateTimeout': rid => {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'jitsi:updateTimeout'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);
    const currentTime = new Date().getTime();
    const jitsiTimeout = new Date(room && room.jitsiTimeout || currentTime).getTime();

    if (jitsiTimeout <= currentTime) {
      RocketChat.models.Rooms.setJitsiTimeout(rid, new Date(currentTime + 35 * 1000));
      const message = RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('jitsi_call_started', rid, '', Meteor.user(), {
        actionLinks: [{
          icon: 'icon-videocam',
          label: TAPi18n.__('Click_to_join'),
          method_id: 'joinJitsiCall',
          params: ''
        }]
      });
      const room = RocketChat.models.Rooms.findOneById(rid);
      message.msg = TAPi18n.__('Started_a_video_call');
      message.mentions = [{
        _id: 'here',
        username: 'here'
      }];
      RocketChat.callbacks.run('afterSaveMessage', message, room);
    } else if ((jitsiTimeout - currentTime) / 1000 <= 15) {
      RocketChat.models.Rooms.setJitsiTimeout(rid, new Date(jitsiTimeout + 25 * 1000));
    }
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"bbb.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/methods/bbb.js                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let BigBlueButtonApi;
module.watch(require("meteor/rocketchat:bigbluebutton"), {
  default(v) {
    BigBlueButtonApi = v;
  }

}, 0);
let HTTP;
module.watch(require("meteor/http"), {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let xml2js;
module.watch(require("xml2js"), {
  default(v) {
    xml2js = v;
  }

}, 2);
const parser = new xml2js.Parser({
  explicitRoot: true
});
const parseString = Meteor.wrapAsync(parser.parseString);

const getBBBAPI = () => {
  const url = RocketChat.settings.get('bigbluebutton_server');
  const secret = RocketChat.settings.get('bigbluebutton_sharedSecret');
  const api = new BigBlueButtonApi(`${url}/bigbluebutton/api`, secret);
  return {
    api,
    url
  };
};

Meteor.methods({
  bbbJoin({
    rid
  }) {
    if (!this.userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'bbbJoin'
      });
    }

    if (!Meteor.call('canAccessRoom', rid, this.userId)) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'bbbJoin'
      });
    }

    if (!RocketChat.settings.get('bigbluebutton_Enabled')) {
      throw new Meteor.Error('error-not-allowed', 'Not Allowed', {
        method: 'bbbJoin'
      });
    }

    const {
      api,
      url
    } = getBBBAPI();
    const meetingID = RocketChat.settings.get('uniqueID') + rid;
    const room = RocketChat.models.Rooms.findOneById(rid);
    const createUrl = api.urlFor('create', {
      name: room.t === 'd' ? 'Direct' : room.name,
      meetingID,
      attendeePW: 'ap',
      moderatorPW: 'mp',
      welcome: '<br>Welcome to <b>%%CONFNAME%%</b>!',
      meta_html5chat: false,
      meta_html5navbar: false,
      meta_html5autoswaplayout: true,
      meta_html5autosharewebcam: false,
      meta_html5hidepresentation: true
    });
    const createResult = HTTP.get(createUrl);
    const doc = parseString(createResult.content);

    if (doc.response.returncode[0]) {
      const user = RocketChat.models.Users.findOneById(this.userId);
      const hookApi = api.urlFor('hooks/create', {
        meetingID,
        callbackURL: Meteor.absoluteUrl(`api/v1/videoconference.bbb.update/${meetingID}`)
      });
      const hookResult = HTTP.get(hookApi);

      if (hookResult.statusCode !== 200) {
        // TODO improve error logging
        console.log({
          hookResult
        });
        return;
      }

      RocketChat.saveStreamingOptions(rid, {
        type: 'call'
      });
      return {
        url: api.urlFor('join', {
          password: 'mp',
          // mp if moderator ap if attendee
          meetingID,
          fullName: user.username,
          userID: user._id,
          avatarURL: Meteor.absoluteUrl(`avatar/${user.username}`),
          clientURL: `${url}/html5client/join`
        })
      };
    }
  },

  bbbEnd({
    rid
  }) {
    if (!this.userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'bbbEnd'
      });
    }

    if (!Meteor.call('canAccessRoom', rid, this.userId)) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'bbbEnd'
      });
    }

    if (!RocketChat.settings.get('bigbluebutton_Enabled')) {
      throw new Meteor.Error('error-not-allowed', 'Not Allowed', {
        method: 'bbbEnd'
      });
    }

    const {
      api
    } = getBBBAPI();
    const meetingID = RocketChat.settings.get('uniqueID') + rid;
    const endApi = api.urlFor('end', {
      meetingID,
      password: 'mp' // mp if moderator ap if attendee

    });
    const endApiResult = HTTP.get(endApi);

    if (endApiResult.statusCode !== 200) {
      // TODO improve error logging
      console.log({
        endApiResult
      });
      return;
    }

    const doc = parseString(endApiResult.content);

    if (doc.response.returncode[0] === 'FAILED') {
      RocketChat.saveStreamingOptions(rid, {});
    }
  }

});
RocketChat.API.v1.addRoute('videoconference.bbb.update/:id', {
  authRequired: false
}, {
  post() {
    // TODO check checksum
    const event = JSON.parse(this.bodyParams.event)[0];
    const eventType = event.data.id;
    const meetingID = event.data.attributes.meeting['external-meeting-id'];
    const rid = meetingID.replace(RocketChat.settings.get('uniqueID'), '');
    console.log(eventType, rid);

    if (eventType === 'meeting-ended') {
      RocketChat.saveStreamingOptions(rid, {});
    } // if (eventType === 'user-left') {
    // 	const { api } = getBBBAPI();
    // 	const getMeetingInfoApi = api.urlFor('getMeetingInfo', {
    // 		meetingID
    // 	});
    // 	const getMeetingInfoResult = HTTP.get(getMeetingInfoApi);
    // 	if (getMeetingInfoResult.statusCode !== 200) {
    // 		// TODO improve error logging
    // 		console.log({ getMeetingInfoResult });
    // 	}
    // 	const doc = parseString(getMeetingInfoResult.content);
    // 	if (doc.response.returncode[0]) {
    // 		const participantCount = parseInt(doc.response.participantCount[0]);
    // 		console.log(participantCount);
    // 	}
    // }

  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"actionLink.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/actionLink.js                                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
RocketChat.actionLinks.register('joinJitsiCall', function ()
/* message, params*/
{});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:videobridge/lib/messageType.js");
require("/node_modules/meteor/rocketchat:videobridge/server/settings.js");
require("/node_modules/meteor/rocketchat:videobridge/server/models/Rooms.js");
require("/node_modules/meteor/rocketchat:videobridge/server/methods/jitsiSetTimeout.js");
require("/node_modules/meteor/rocketchat:videobridge/server/methods/bbb.js");
require("/node_modules/meteor/rocketchat:videobridge/server/actionLink.js");

/* Exports */
Package._define("rocketchat:videobridge");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_videobridge.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp2aWRlb2JyaWRnZS9saWIvbWVzc2FnZVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dmlkZW9icmlkZ2Uvc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnZpZGVvYnJpZGdlL3NlcnZlci9tb2RlbHMvUm9vbXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dmlkZW9icmlkZ2Uvc2VydmVyL21ldGhvZHMvaml0c2lTZXRUaW1lb3V0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnZpZGVvYnJpZGdlL3NlcnZlci9tZXRob2RzL2JiYi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp2aWRlb2JyaWRnZS9zZXJ2ZXIvYWN0aW9uTGluay5qcyJdLCJuYW1lcyI6WyJNZXRlb3IiLCJzdGFydHVwIiwiUm9ja2V0Q2hhdCIsIk1lc3NhZ2VUeXBlcyIsInJlZ2lzdGVyVHlwZSIsImlkIiwic3lzdGVtIiwibWVzc2FnZSIsIlRBUGkxOG4iLCJfXyIsInNldHRpbmdzIiwiYWRkR3JvdXAiLCJzZWN0aW9uIiwiYWRkIiwidHlwZSIsImkxOG5MYWJlbCIsImFsZXJ0IiwicHVibGljIiwiZW5hYmxlUXVlcnkiLCJfaWQiLCJ2YWx1ZSIsIm1vZGVscyIsIlJvb21zIiwic2V0Sml0c2lUaW1lb3V0IiwidGltZSIsInF1ZXJ5IiwidXBkYXRlIiwiJHNldCIsImppdHNpVGltZW91dCIsIm1ldGhvZHMiLCJyaWQiLCJ1c2VySWQiLCJFcnJvciIsIm1ldGhvZCIsInJvb20iLCJmaW5kT25lQnlJZCIsImN1cnJlbnRUaW1lIiwiRGF0ZSIsImdldFRpbWUiLCJNZXNzYWdlcyIsImNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIiLCJ1c2VyIiwiYWN0aW9uTGlua3MiLCJpY29uIiwibGFiZWwiLCJtZXRob2RfaWQiLCJwYXJhbXMiLCJtc2ciLCJtZW50aW9ucyIsInVzZXJuYW1lIiwiY2FsbGJhY2tzIiwicnVuIiwiQmlnQmx1ZUJ1dHRvbkFwaSIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiSFRUUCIsInhtbDJqcyIsInBhcnNlciIsIlBhcnNlciIsImV4cGxpY2l0Um9vdCIsInBhcnNlU3RyaW5nIiwid3JhcEFzeW5jIiwiZ2V0QkJCQVBJIiwidXJsIiwiZ2V0Iiwic2VjcmV0IiwiYXBpIiwiYmJiSm9pbiIsImNhbGwiLCJtZWV0aW5nSUQiLCJjcmVhdGVVcmwiLCJ1cmxGb3IiLCJuYW1lIiwidCIsImF0dGVuZGVlUFciLCJtb2RlcmF0b3JQVyIsIndlbGNvbWUiLCJtZXRhX2h0bWw1Y2hhdCIsIm1ldGFfaHRtbDVuYXZiYXIiLCJtZXRhX2h0bWw1YXV0b3N3YXBsYXlvdXQiLCJtZXRhX2h0bWw1YXV0b3NoYXJld2ViY2FtIiwibWV0YV9odG1sNWhpZGVwcmVzZW50YXRpb24iLCJjcmVhdGVSZXN1bHQiLCJkb2MiLCJjb250ZW50IiwicmVzcG9uc2UiLCJyZXR1cm5jb2RlIiwiVXNlcnMiLCJob29rQXBpIiwiY2FsbGJhY2tVUkwiLCJhYnNvbHV0ZVVybCIsImhvb2tSZXN1bHQiLCJzdGF0dXNDb2RlIiwiY29uc29sZSIsImxvZyIsInNhdmVTdHJlYW1pbmdPcHRpb25zIiwicGFzc3dvcmQiLCJmdWxsTmFtZSIsInVzZXJJRCIsImF2YXRhclVSTCIsImNsaWVudFVSTCIsImJiYkVuZCIsImVuZEFwaSIsImVuZEFwaVJlc3VsdCIsIkFQSSIsInYxIiwiYWRkUm91dGUiLCJhdXRoUmVxdWlyZWQiLCJwb3N0IiwiZXZlbnQiLCJKU09OIiwicGFyc2UiLCJib2R5UGFyYW1zIiwiZXZlbnRUeXBlIiwiZGF0YSIsImF0dHJpYnV0ZXMiLCJtZWV0aW5nIiwicmVwbGFjZSIsInJlZ2lzdGVyIl0sIm1h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LENBYU47QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBbkNvRixDQUF0RixFOzs7Ozs7Ozs7OztBQ3pIQTVCLFdBQVd3QyxXQUFYLENBQXVCK0UsUUFBdkIsQ0FBZ0MsZUFBaEMsRUFBaUQ7QUFBUztBQUFzQixDQUUvRSxDQUZELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfdmlkZW9icmlkZ2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5NZXNzYWdlVHlwZXMucmVnaXN0ZXJUeXBlKHtcblx0XHRpZDogJ2ppdHNpX2NhbGxfc3RhcnRlZCcsXG5cdFx0c3lzdGVtOiB0cnVlLFxuXHRcdG1lc3NhZ2U6IFRBUGkxOG4uX18oJ1N0YXJ0ZWRfYV92aWRlb19jYWxsJyksXG5cdH0pO1xufSk7XG4iLCJNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnVmlkZW8gQ29uZmVyZW5jZScsIGZ1bmN0aW9uKCkge1xuXG5cdFx0dGhpcy5zZWN0aW9uKCdCaWdCbHVlQnV0dG9uJywgZnVuY3Rpb24oKSB7XG5cblx0XHRcdHRoaXMuYWRkKCdiaWdibHVlYnV0dG9uX0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRcdGkxOG5MYWJlbDogJ0VuYWJsZWQnLFxuXHRcdFx0XHRhbGVydDogJ1RoaXMgRmVhdHVyZSBpcyBjdXJyZW50bHkgaW4gYmV0YSEgUGxlYXNlIHJlcG9ydCBidWdzIHRvIGdpdGh1Yi5jb20vUm9ja2V0Q2hhdC9Sb2NrZXQuQ2hhdC9pc3N1ZXMnLFxuXHRcdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hZGQoJ2JpZ2JsdWVidXR0b25fc2VydmVyJywgJycsIHtcblx0XHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRcdGkxOG5MYWJlbDogJ0RvbWFpbicsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnYmlnYmx1ZWJ1dHRvbl9FbmFibGVkJyxcblx0XHRcdFx0XHR2YWx1ZTogdHJ1ZSxcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnYmlnYmx1ZWJ1dHRvbl9zaGFyZWRTZWNyZXQnLCAnJywge1xuXHRcdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdFx0aTE4bkxhYmVsOiAnU2hhcmVkX1NlY3JldCcsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnYmlnYmx1ZWJ1dHRvbl9FbmFibGVkJyxcblx0XHRcdFx0XHR2YWx1ZTogdHJ1ZSxcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnYmlnYmx1ZWJ1dHRvbl9lbmFibGVfZCcsIHRydWUsIHtcblx0XHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0XHRpMThuTGFiZWw6ICdXZWJSVENfRW5hYmxlX0RpcmVjdCcsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnYmlnYmx1ZWJ1dHRvbl9FbmFibGVkJyxcblx0XHRcdFx0XHR2YWx1ZTogdHJ1ZSxcblx0XHRcdFx0fSxcblx0XHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuYWRkKCdiaWdibHVlYnV0dG9uX2VuYWJsZV9wJywgdHJ1ZSwge1xuXHRcdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRcdGkxOG5MYWJlbDogJ1dlYlJUQ19FbmFibGVfUHJpdmF0ZScsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnYmlnYmx1ZWJ1dHRvbl9FbmFibGVkJyxcblx0XHRcdFx0XHR2YWx1ZTogdHJ1ZSxcblx0XHRcdFx0fSxcblx0XHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuYWRkKCdiaWdibHVlYnV0dG9uX2VuYWJsZV9jJywgZmFsc2UsIHtcblx0XHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0XHRpMThuTGFiZWw6ICdXZWJSVENfRW5hYmxlX0NoYW5uZWwnLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ2JpZ2JsdWVidXR0b25fRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdH0pO1xuXG5cdFx0fSk7XG5cblx0XHR0aGlzLnNlY3Rpb24oJ0ppdHNpJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmFkZCgnSml0c2lfRW5hYmxlZCcsIGZhbHNlLCB7XG5cdFx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdFx0aTE4bkxhYmVsOiAnRW5hYmxlZCcsXG5cdFx0XHRcdGFsZXJ0OiAnVGhpcyBGZWF0dXJlIGlzIGN1cnJlbnRseSBpbiBiZXRhISBQbGVhc2UgcmVwb3J0IGJ1Z3MgdG8gZ2l0aHViLmNvbS9Sb2NrZXRDaGF0L1JvY2tldC5DaGF0L2lzc3VlcycsXG5cdFx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnSml0c2lfRG9tYWluJywgJ21lZXQuaml0LnNpJywge1xuXHRcdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0XHRfaWQ6ICdKaXRzaV9FbmFibGVkJyxcblx0XHRcdFx0XHR2YWx1ZTogdHJ1ZSxcblx0XHRcdFx0fSxcblx0XHRcdFx0aTE4bkxhYmVsOiAnRG9tYWluJyxcblx0XHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuYWRkKCdKaXRzaV9VUkxfUm9vbV9QcmVmaXgnLCAnUm9ja2V0Q2hhdCcsIHtcblx0XHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnSml0c2lfRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGkxOG5MYWJlbDogJ1VSTF9yb29tX3ByZWZpeCcsXG5cdFx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnSml0c2lfU1NMJywgdHJ1ZSwge1xuXHRcdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnSml0c2lfRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGkxOG5MYWJlbDogJ1NTTCcsXG5cdFx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnSml0c2lfT3Blbl9OZXdfV2luZG93JywgZmFsc2UsIHtcblx0XHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ0ppdHNpX0VuYWJsZWQnLFxuXHRcdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpMThuTGFiZWw6ICdBbHdheXNfb3Blbl9pbl9uZXdfd2luZG93Jyxcblx0XHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuYWRkKCdKaXRzaV9FbmFibGVfQ2hhbm5lbHMnLCBmYWxzZSwge1xuXHRcdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnSml0c2lfRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGkxOG5MYWJlbDogJ0ppdHNpX0VuYWJsZV9DaGFubmVscycsXG5cdFx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnSml0c2lfQ2hyb21lX0V4dGVuc2lvbicsICdub2NmYm5ubWpubmRrYmlwa2Fib2RuaGVlamllZ2NjZicsIHtcblx0XHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnSml0c2lfRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGkxOG5MYWJlbDogJ0ppdHNpX0Nocm9tZV9FeHRlbnNpb24nLFxuXHRcdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSk7XG59KTtcbiIsIi8qKlxuICogc2V0cyBqaXRzaVRpbWVvdXQgdG8gaW5kaWNhdGUgYSBjYWxsIGlzIGluIHByb2dyZXNzXG4gKiBAcGFyYW0ge3N0cmluZ30gX2lkIC0gUm9vbSBpZFxuICogQHBhcm0ge251bWJlcn0gdGltZSAtIHRpbWUgdG8gc2V0XG4gKi9cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldEppdHNpVGltZW91dCA9IGZ1bmN0aW9uKF9pZCwgdGltZSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQsXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdGppdHNpVGltZW91dDogdGltZSxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdqaXRzaTp1cGRhdGVUaW1lb3V0JzogKHJpZCkgPT4ge1xuXG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2ppdHNpOnVwZGF0ZVRpbWVvdXQnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyaWQpO1xuXHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cblx0XHRjb25zdCBqaXRzaVRpbWVvdXQgPSBuZXcgRGF0ZSgocm9vbSAmJiByb29tLmppdHNpVGltZW91dCkgfHwgY3VycmVudFRpbWUpLmdldFRpbWUoKTtcblxuXHRcdGlmIChqaXRzaVRpbWVvdXQgPD0gY3VycmVudFRpbWUpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldEppdHNpVGltZW91dChyaWQsIG5ldyBEYXRlKGN1cnJlbnRUaW1lICsgMzUgKiAxMDAwKSk7XG5cdFx0XHRjb25zdCBtZXNzYWdlID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcignaml0c2lfY2FsbF9zdGFydGVkJywgcmlkLCAnJywgTWV0ZW9yLnVzZXIoKSwge1xuXHRcdFx0XHRhY3Rpb25MaW5rcyA6IFtcblx0XHRcdFx0XHR7IGljb246ICdpY29uLXZpZGVvY2FtJywgbGFiZWw6IFRBUGkxOG4uX18oJ0NsaWNrX3RvX2pvaW4nKSwgbWV0aG9kX2lkOiAnam9pbkppdHNpQ2FsbCcsIHBhcmFtczogJycgfSxcblx0XHRcdFx0XSxcblx0XHRcdH0pO1xuXHRcdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJpZCk7XG5cdFx0XHRtZXNzYWdlLm1zZyA9IFRBUGkxOG4uX18oJ1N0YXJ0ZWRfYV92aWRlb19jYWxsJyk7XG5cdFx0XHRtZXNzYWdlLm1lbnRpb25zID0gW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0X2lkOidoZXJlJyxcblx0XHRcdFx0XHR1c2VybmFtZTonaGVyZScsXG5cdFx0XHRcdH0sXG5cdFx0XHRdO1xuXHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdhZnRlclNhdmVNZXNzYWdlJywgbWVzc2FnZSwgcm9vbSk7XG5cdFx0fSBlbHNlIGlmICgoaml0c2lUaW1lb3V0IC0gY3VycmVudFRpbWUpIC8gMTAwMCA8PSAxNSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0Sml0c2lUaW1lb3V0KHJpZCwgbmV3IERhdGUoaml0c2lUaW1lb3V0ICsgMjUgKiAxMDAwKSk7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgQmlnQmx1ZUJ1dHRvbkFwaSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpiaWdibHVlYnV0dG9uJztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQgeG1sMmpzIGZyb20gJ3htbDJqcyc7XG5cbmNvbnN0IHBhcnNlciA9IG5ldyB4bWwyanMuUGFyc2VyKHtcblx0ZXhwbGljaXRSb290OiB0cnVlLFxufSk7XG5cbmNvbnN0IHBhcnNlU3RyaW5nID0gTWV0ZW9yLndyYXBBc3luYyhwYXJzZXIucGFyc2VTdHJpbmcpO1xuXG5jb25zdCBnZXRCQkJBUEkgPSAoKSA9PiB7XG5cdGNvbnN0IHVybCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdiaWdibHVlYnV0dG9uX3NlcnZlcicpO1xuXHRjb25zdCBzZWNyZXQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnYmlnYmx1ZWJ1dHRvbl9zaGFyZWRTZWNyZXQnKTtcblx0Y29uc3QgYXBpID0gbmV3IEJpZ0JsdWVCdXR0b25BcGkoYCR7IHVybCB9L2JpZ2JsdWVidXR0b24vYXBpYCwgc2VjcmV0KTtcblxuXHRyZXR1cm4geyBhcGksIHVybCB9O1xufTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRiYmJKb2luKHsgcmlkIH0pIHtcblxuXHRcdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2JiYkpvaW4nIH0pO1xuXHRcdH1cblxuXHRcdGlmICghTWV0ZW9yLmNhbGwoJ2NhbkFjY2Vzc1Jvb20nLCByaWQsIHRoaXMudXNlcklkKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnYmJiSm9pbicgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnYmlnYmx1ZWJ1dHRvbl9FbmFibGVkJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBBbGxvd2VkJywgeyBtZXRob2Q6ICdiYmJKb2luJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB7IGFwaSwgdXJsIH0gPSBnZXRCQkJBUEkoKTtcblx0XHRjb25zdCBtZWV0aW5nSUQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndW5pcXVlSUQnKSArIHJpZDtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblx0XHRjb25zdCBjcmVhdGVVcmwgPSBhcGkudXJsRm9yKCdjcmVhdGUnLCB7XG5cdFx0XHRuYW1lOiByb29tLnQgPT09ICdkJyA/ICdEaXJlY3QnIDogcm9vbS5uYW1lLFxuXHRcdFx0bWVldGluZ0lELFxuXHRcdFx0YXR0ZW5kZWVQVzogJ2FwJyxcblx0XHRcdG1vZGVyYXRvclBXOiAnbXAnLFxuXHRcdFx0d2VsY29tZTogJzxicj5XZWxjb21lIHRvIDxiPiUlQ09ORk5BTUUlJTwvYj4hJyxcblx0XHRcdG1ldGFfaHRtbDVjaGF0OiBmYWxzZSxcblx0XHRcdG1ldGFfaHRtbDVuYXZiYXI6IGZhbHNlLFxuXHRcdFx0bWV0YV9odG1sNWF1dG9zd2FwbGF5b3V0OiB0cnVlLFxuXHRcdFx0bWV0YV9odG1sNWF1dG9zaGFyZXdlYmNhbTogZmFsc2UsXG5cdFx0XHRtZXRhX2h0bWw1aGlkZXByZXNlbnRhdGlvbjogdHJ1ZSxcblx0XHR9KTtcblxuXHRcdGNvbnN0IGNyZWF0ZVJlc3VsdCA9IEhUVFAuZ2V0KGNyZWF0ZVVybCk7XG5cdFx0Y29uc3QgZG9jID0gcGFyc2VTdHJpbmcoY3JlYXRlUmVzdWx0LmNvbnRlbnQpO1xuXG5cdFx0aWYgKGRvYy5yZXNwb25zZS5yZXR1cm5jb2RlWzBdKSB7XG5cdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodGhpcy51c2VySWQpO1xuXG5cdFx0XHRjb25zdCBob29rQXBpID0gYXBpLnVybEZvcignaG9va3MvY3JlYXRlJywge1xuXHRcdFx0XHRtZWV0aW5nSUQsXG5cdFx0XHRcdGNhbGxiYWNrVVJMOiBNZXRlb3IuYWJzb2x1dGVVcmwoYGFwaS92MS92aWRlb2NvbmZlcmVuY2UuYmJiLnVwZGF0ZS8keyBtZWV0aW5nSUQgfWApLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IGhvb2tSZXN1bHQgPSBIVFRQLmdldChob29rQXBpKTtcblxuXHRcdFx0aWYgKGhvb2tSZXN1bHQuc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG5cdFx0XHRcdC8vIFRPRE8gaW1wcm92ZSBlcnJvciBsb2dnaW5nXG5cdFx0XHRcdGNvbnNvbGUubG9nKHsgaG9va1Jlc3VsdCB9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVTdHJlYW1pbmdPcHRpb25zKHJpZCwge1xuXHRcdFx0XHR0eXBlOiAnY2FsbCcsXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dXJsOiBhcGkudXJsRm9yKCdqb2luJywge1xuXHRcdFx0XHRcdHBhc3N3b3JkOiAnbXAnLCAvLyBtcCBpZiBtb2RlcmF0b3IgYXAgaWYgYXR0ZW5kZWVcblx0XHRcdFx0XHRtZWV0aW5nSUQsXG5cdFx0XHRcdFx0ZnVsbE5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHRcdFx0dXNlcklEOiB1c2VyLl9pZCxcblx0XHRcdFx0XHRhdmF0YXJVUkw6IE1ldGVvci5hYnNvbHV0ZVVybChgYXZhdGFyLyR7IHVzZXIudXNlcm5hbWUgfWApLFxuXHRcdFx0XHRcdGNsaWVudFVSTDogYCR7IHVybCB9L2h0bWw1Y2xpZW50L2pvaW5gLFxuXHRcdFx0XHR9KSxcblx0XHRcdH07XG5cdFx0fVxuXHR9LFxuXG5cdGJiYkVuZCh7IHJpZCB9KSB7XG5cdFx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnYmJiRW5kJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIU1ldGVvci5jYWxsKCdjYW5BY2Nlc3NSb29tJywgcmlkLCB0aGlzLnVzZXJJZCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2JiYkVuZCcgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnYmlnYmx1ZWJ1dHRvbl9FbmFibGVkJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBBbGxvd2VkJywgeyBtZXRob2Q6ICdiYmJFbmQnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgYXBpIH0gPSBnZXRCQkJBUEkoKTtcblx0XHRjb25zdCBtZWV0aW5nSUQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndW5pcXVlSUQnKSArIHJpZDtcblx0XHRjb25zdCBlbmRBcGkgPSBhcGkudXJsRm9yKCdlbmQnLCB7XG5cdFx0XHRtZWV0aW5nSUQsXG5cdFx0XHRwYXNzd29yZDogJ21wJywgLy8gbXAgaWYgbW9kZXJhdG9yIGFwIGlmIGF0dGVuZGVlXG5cdFx0fSk7XG5cblx0XHRjb25zdCBlbmRBcGlSZXN1bHQgPSBIVFRQLmdldChlbmRBcGkpO1xuXG5cdFx0aWYgKGVuZEFwaVJlc3VsdC5zdGF0dXNDb2RlICE9PSAyMDApIHtcblx0XHRcdC8vIFRPRE8gaW1wcm92ZSBlcnJvciBsb2dnaW5nXG5cdFx0XHRjb25zb2xlLmxvZyh7IGVuZEFwaVJlc3VsdCB9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBkb2MgPSBwYXJzZVN0cmluZyhlbmRBcGlSZXN1bHQuY29udGVudCk7XG5cblx0XHRpZiAoZG9jLnJlc3BvbnNlLnJldHVybmNvZGVbMF0gPT09ICdGQUlMRUQnKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVTdHJlYW1pbmdPcHRpb25zKHJpZCwge30pO1xuXHRcdH1cblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndmlkZW9jb25mZXJlbmNlLmJiYi51cGRhdGUvOmlkJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0cG9zdCgpIHtcblx0XHQvLyBUT0RPIGNoZWNrIGNoZWNrc3VtXG5cdFx0Y29uc3QgZXZlbnQgPSBKU09OLnBhcnNlKHRoaXMuYm9keVBhcmFtcy5ldmVudClbMF07XG5cdFx0Y29uc3QgZXZlbnRUeXBlID0gZXZlbnQuZGF0YS5pZDtcblx0XHRjb25zdCBtZWV0aW5nSUQgPSBldmVudC5kYXRhLmF0dHJpYnV0ZXMubWVldGluZ1snZXh0ZXJuYWwtbWVldGluZy1pZCddO1xuXHRcdGNvbnN0IHJpZCA9IG1lZXRpbmdJRC5yZXBsYWNlKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCd1bmlxdWVJRCcpLCAnJyk7XG5cblx0XHRjb25zb2xlLmxvZyhldmVudFR5cGUsIHJpZCk7XG5cblx0XHRpZiAoZXZlbnRUeXBlID09PSAnbWVldGluZy1lbmRlZCcpIHtcblx0XHRcdFJvY2tldENoYXQuc2F2ZVN0cmVhbWluZ09wdGlvbnMocmlkLCB7fSk7XG5cdFx0fVxuXG5cdFx0Ly8gaWYgKGV2ZW50VHlwZSA9PT0gJ3VzZXItbGVmdCcpIHtcblx0XHQvLyBcdGNvbnN0IHsgYXBpIH0gPSBnZXRCQkJBUEkoKTtcblxuXHRcdC8vIFx0Y29uc3QgZ2V0TWVldGluZ0luZm9BcGkgPSBhcGkudXJsRm9yKCdnZXRNZWV0aW5nSW5mbycsIHtcblx0XHQvLyBcdFx0bWVldGluZ0lEXG5cdFx0Ly8gXHR9KTtcblxuXHRcdC8vIFx0Y29uc3QgZ2V0TWVldGluZ0luZm9SZXN1bHQgPSBIVFRQLmdldChnZXRNZWV0aW5nSW5mb0FwaSk7XG5cblx0XHQvLyBcdGlmIChnZXRNZWV0aW5nSW5mb1Jlc3VsdC5zdGF0dXNDb2RlICE9PSAyMDApIHtcblx0XHQvLyBcdFx0Ly8gVE9ETyBpbXByb3ZlIGVycm9yIGxvZ2dpbmdcblx0XHQvLyBcdFx0Y29uc29sZS5sb2coeyBnZXRNZWV0aW5nSW5mb1Jlc3VsdCB9KTtcblx0XHQvLyBcdH1cblxuXHRcdC8vIFx0Y29uc3QgZG9jID0gcGFyc2VTdHJpbmcoZ2V0TWVldGluZ0luZm9SZXN1bHQuY29udGVudCk7XG5cblx0XHQvLyBcdGlmIChkb2MucmVzcG9uc2UucmV0dXJuY29kZVswXSkge1xuXHRcdC8vIFx0XHRjb25zdCBwYXJ0aWNpcGFudENvdW50ID0gcGFyc2VJbnQoZG9jLnJlc3BvbnNlLnBhcnRpY2lwYW50Q291bnRbMF0pO1xuXHRcdC8vIFx0XHRjb25zb2xlLmxvZyhwYXJ0aWNpcGFudENvdW50KTtcblx0XHQvLyBcdH1cblx0XHQvLyB9XG5cdH0sXG59KTtcbiIsIlJvY2tldENoYXQuYWN0aW9uTGlua3MucmVnaXN0ZXIoJ2pvaW5KaXRzaUNhbGwnLCBmdW5jdGlvbigvKiBtZXNzYWdlLCBwYXJhbXMqLykge1xuXG59KTtcbiJdfQ==
