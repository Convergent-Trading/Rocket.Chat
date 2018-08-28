(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var Autoupdate = Package.autoupdate.Autoupdate;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var Streamer = Package['rocketchat:streamer'].Streamer;
var UserPresence = Package['konecty:user-presence'].UserPresence;
var UserPresenceMonitor = Package['konecty:user-presence'].UserPresenceMonitor;
var UserPresenceEvents = Package['konecty:user-presence'].UserPresenceEvents;
var fileUpload = Package['rocketchat:ui'].fileUpload;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var check = Package.check.check;
var Match = Package.check.Match;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var department, emailSettings, self, _id, agents, username, agent, exports;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:livechat":{"livechat.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/livechat.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let url;
module.watch(require("url"), {
  default(v) {
    url = v;
  }

}, 1);
const {
  WebApp
} = Package.webapp;
const {
  Autoupdate
} = Package.autoupdate;
WebApp.connectHandlers.use('/livechat', Meteor.bindEnvironment((req, res, next) => {
  const reqUrl = url.parse(req.url);

  if (reqUrl.pathname !== '/') {
    return next();
  }

  res.setHeader('content-type', 'text/html; charset=utf-8');
  let domainWhiteList = RocketChat.settings.get('Livechat_AllowedDomainsList');

  if (req.headers.referer && !_.isEmpty(domainWhiteList.trim())) {
    domainWhiteList = _.map(domainWhiteList.split(','), function (domain) {
      return domain.trim();
    });
    const referer = url.parse(req.headers.referer);

    if (!_.contains(domainWhiteList, referer.host)) {
      res.setHeader('X-FRAME-OPTIONS', 'DENY');
      return next();
    }

    res.setHeader('X-FRAME-OPTIONS', `ALLOW-FROM ${referer.protocol}//${referer.host}`);
  }

  const head = Assets.getText('public/head.html');
  let baseUrl;

  if (__meteor_runtime_config__.ROOT_URL_PATH_PREFIX && __meteor_runtime_config__.ROOT_URL_PATH_PREFIX.trim() !== '') {
    baseUrl = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;
  } else {
    baseUrl = '/';
  }

  if (/\/$/.test(baseUrl) === false) {
    baseUrl += '/';
  }

  const html = `<html>
		<head>
			<link rel="stylesheet" type="text/css" class="__meteor-css__" href="${baseUrl}livechat/livechat.css?_dc=${Autoupdate.autoupdateVersion}">
			<script type="text/javascript">
				__meteor_runtime_config__ = ${JSON.stringify(__meteor_runtime_config__)};
			</script>

			<base href="${baseUrl}">

			${head}
		</head>
		<body>
			<script type="text/javascript" src="${baseUrl}livechat/livechat.js?_dc=${Autoupdate.autoupdateVersion}"></script>
		</body>
	</html>`;
  res.write(html);
  res.end();
}));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"startup.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/startup.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.startup(() => {
  RocketChat.roomTypes.setRoomFind('l', _id => RocketChat.models.Rooms.findLivechatById(_id).fetch());
  RocketChat.authz.addRoomAccessValidator(function (room, user) {
    return room && room.t === 'l' && user && RocketChat.authz.hasPermission(user._id, 'view-livechat-rooms');
  });
  RocketChat.authz.addRoomAccessValidator(function (room, user, extraData) {
    if (!room && extraData && extraData.rid) {
      room = RocketChat.models.Rooms.findOneById(extraData.rid);
    }

    return room && room.t === 'l' && extraData && extraData.visitorToken && room.v && room.v.token === extraData.visitorToken;
  });
  RocketChat.callbacks.add('beforeLeaveRoom', function (user, room) {
    if (room.t !== 'l') {
      return user;
    }

    throw new Meteor.Error(TAPi18n.__('You_cant_leave_a_livechat_room_Please_use_the_close_button', {
      lng: user.language || RocketChat.settings.get('language') || 'en'
    }));
  }, RocketChat.callbacks.priority.LOW, 'cant-leave-room');
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitorStatus.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/visitorStatus.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals UserPresenceEvents */
Meteor.startup(() => {
  UserPresenceEvents.on('setStatus', (session, status, metadata) => {
    if (metadata && metadata.visitor) {
      RocketChat.models.LivechatInquiry.updateVisitorStatus(metadata.visitor, status);
      RocketChat.models.Rooms.updateVisitorStatus(metadata.visitor, status);
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"roomType.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/roomType.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatRoomType;
module.watch(require("../imports/LivechatRoomType"), {
  default(v) {
    LivechatRoomType = v;
  }

}, 0);
let LivechatVisitors;
module.watch(require("./models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 1);

class LivechatRoomTypeServer extends LivechatRoomType {
  getMsgSender(senderId) {
    return LivechatVisitors.findOneById(senderId);
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
    const title = `[livechat] ${this.roomName(room)}`;
    const text = notificationMessage;
    return {
      title,
      text
    };
  }

  canAccessUploadedFile({
    rc_token,
    rc_rid
  } = {}) {
    return rc_token && rc_rid && RocketChat.models.Rooms.findOneOpenByVisitorToken(rc_token, rc_rid);
  }

}

RocketChat.roomTypes.add(new LivechatRoomTypeServer());
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hooks":{"externalMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/externalMessage.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let knowledgeEnabled = false;
let apiaiKey = '';
let apiaiLanguage = 'en';
RocketChat.settings.get('Livechat_Knowledge_Enabled', function (key, value) {
  knowledgeEnabled = value;
});
RocketChat.settings.get('Livechat_Knowledge_Apiai_Key', function (key, value) {
  apiaiKey = value;
});
RocketChat.settings.get('Livechat_Knowledge_Apiai_Language', function (key, value) {
  apiaiLanguage = value;
});
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // skips this callback if the message was edited
  if (!message || message.editedAt) {
    return message;
  }

  if (!knowledgeEnabled) {
    return message;
  }

  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.v && room.v.token)) {
    return message;
  } // if the message hasn't a token, it was not sent by the visitor, so ignore it


  if (!message.token) {
    return message;
  }

  Meteor.defer(() => {
    try {
      const response = HTTP.post('https://api.api.ai/api/query?v=20150910', {
        data: {
          query: message.msg,
          lang: apiaiLanguage,
          sessionId: room._id
        },
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${apiaiKey}`
        }
      });

      if (response.data && response.data.status.code === 200 && !_.isEmpty(response.data.result.fulfillment.speech)) {
        RocketChat.models.LivechatExternalMessage.insert({
          rid: message.rid,
          msg: response.data.result.fulfillment.speech,
          orig: message._id,
          ts: new Date()
        });
      }
    } catch (e) {
      SystemLogger.error('Error using Api.ai ->', e);
    }
  });
  return message;
}, RocketChat.callbacks.priority.LOW, 'externalWebHook');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"leadCapture.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/leadCapture.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);

function validateMessage(message, room) {
  // skips this callback if the message was edited
  if (message.editedAt) {
    return false;
  } // message valid only if it is a livechat room


  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.v && room.v.token)) {
    return false;
  } // if the message hasn't a token, it was NOT sent from the visitor, so ignore it


  if (!message.token) {
    return false;
  } // if the message has a type means it is a special message (like the closing comment), so skips


  if (message.t) {
    return false;
  }

  return true;
}

RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  if (!validateMessage(message, room)) {
    return message;
  }

  const phoneRegexp = new RegExp(RocketChat.settings.get('Livechat_lead_phone_regex'), 'g');
  const msgPhones = message.msg.match(phoneRegexp);
  const emailRegexp = new RegExp(RocketChat.settings.get('Livechat_lead_email_regex'), 'gi');
  const msgEmails = message.msg.match(emailRegexp);

  if (msgEmails || msgPhones) {
    LivechatVisitors.saveGuestEmailPhoneById(room.v._id, msgEmails, msgPhones);
    RocketChat.callbacks.run('livechat.leadCapture', room);
  }

  return message;
}, RocketChat.callbacks.priority.LOW, 'leadCapture');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"markRoomResponded.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/markRoomResponded.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // skips this callback if the message was edited
  if (!message || message.editedAt) {
    return message;
  } // check if room is yet awaiting for response


  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.waitingResponse)) {
    return message;
  } // if the message has a token, it was sent by the visitor, so ignore it


  if (message.token) {
    return message;
  }

  Meteor.defer(() => {
    const now = new Date();
    RocketChat.models.Rooms.setResponseByRoomId(room._id, {
      user: {
        _id: message.u._id,
        username: message.u.username
      },
      responseDate: now,
      responseTime: (now.getTime() - room.ts) / 1000
    });
  });
  return message;
}, RocketChat.callbacks.priority.LOW, 'markRoomResponded');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"offlineMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/offlineMessage.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.callbacks.add('livechat.offlineMessage', data => {
  if (!RocketChat.settings.get('Livechat_webhook_on_offline_msg')) {
    return data;
  }

  const postData = {
    type: 'LivechatOfflineMessage',
    sentAt: new Date(),
    visitor: {
      name: data.name,
      email: data.email
    },
    message: data.message
  };
  RocketChat.Livechat.sendRequest(postData);
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-email-offline-message');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"RDStation.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/RDStation.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
function sendToRDStation(room) {
  if (!RocketChat.settings.get('Livechat_RDStation_Token')) {
    return room;
  }

  const livechatData = RocketChat.Livechat.getLivechatRoomGuestInfo(room);

  if (!livechatData.visitor.email) {
    return room;
  }

  const options = {
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      token_rdstation: RocketChat.settings.get('Livechat_RDStation_Token'),
      identificador: 'rocketchat-livechat',
      client_id: livechatData.visitor._id,
      email: livechatData.visitor.email
    }
  };
  options.data.nome = livechatData.visitor.name || livechatData.visitor.username;

  if (livechatData.visitor.phone) {
    options.data.telefone = livechatData.visitor.phone;
  }

  if (livechatData.tags) {
    options.data.tags = livechatData.tags;
  }

  Object.keys(livechatData.customFields || {}).forEach(field => {
    options.data[field] = livechatData.customFields[field];
  });
  Object.keys(livechatData.visitor.customFields || {}).forEach(field => {
    options.data[field] = livechatData.visitor.customFields[field];
  });

  try {
    HTTP.call('POST', 'https://www.rdstation.com.br/api/1.3/conversions', options);
  } catch (e) {
    console.error('Error sending lead to RD Station ->', e);
  }

  return room;
}

RocketChat.callbacks.add('livechat.closeRoom', sendToRDStation, RocketChat.callbacks.priority.MEDIUM, 'livechat-rd-station-close-room');
RocketChat.callbacks.add('livechat.saveInfo', sendToRDStation, RocketChat.callbacks.priority.MEDIUM, 'livechat-rd-station-save-info');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendToCRM.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/sendToCRM.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const msgNavType = 'livechat_navigation_history';

const sendMessageType = msgType => {
  const sendNavHistory = RocketChat.settings.get('Livechat_Visitor_navigation_as_a_message') && RocketChat.settings.get('Send_visitor_navigation_history_livechat_webhook_request');
  return sendNavHistory && msgType === msgNavType;
};

function sendToCRM(type, room, includeMessages = true) {
  const postData = RocketChat.Livechat.getLivechatRoomGuestInfo(room);
  postData.type = type;
  postData.messages = [];
  let messages;

  if (typeof includeMessages === 'boolean' && includeMessages) {
    messages = RocketChat.models.Messages.findVisibleByRoomId(room._id, {
      sort: {
        ts: 1
      }
    });
  } else if (includeMessages instanceof Array) {
    messages = includeMessages;
  }

  if (messages) {
    messages.forEach(message => {
      if (message.t && !sendMessageType(message.t)) {
        return;
      }

      const msg = {
        _id: message._id,
        username: message.u.username,
        msg: message.msg,
        ts: message.ts,
        editedAt: message.editedAt
      };

      if (message.u.username !== postData.visitor.username) {
        msg.agentId = message.u._id;
      }

      if (message.t === msgNavType) {
        msg.navigation = message.navigation;
      }

      postData.messages.push(msg);
    });
  }

  const response = RocketChat.Livechat.sendRequest(postData);

  if (response && response.data && response.data.data) {
    RocketChat.models.Rooms.saveCRMDataByRoomId(room._id, response.data.data);
  }

  return room;
}

RocketChat.callbacks.add('livechat.closeRoom', room => {
  if (!RocketChat.settings.get('Livechat_webhook_on_close')) {
    return room;
  }

  return sendToCRM('LivechatSession', room);
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-crm-close-room');
RocketChat.callbacks.add('livechat.saveInfo', room => {
  // Do not send to CRM if the chat is still open
  if (room.open) {
    return room;
  }

  return sendToCRM('LivechatEdit', room);
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-crm-save-info');
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // only call webhook if it is a livechat room
  if (room.t !== 'l' || room.v == null || room.v.token == null) {
    return message;
  } // if the message has a token, it was sent from the visitor
  // if not, it was sent from the agent


  if (message.token) {
    if (!RocketChat.settings.get('Livechat_webhook_on_visitor_message')) {
      return message;
    }
  } else if (!RocketChat.settings.get('Livechat_webhook_on_agent_message')) {
    return message;
  } // if the message has a type means it is a special message (like the closing comment), so skips
  // unless the settings that handle with visitor navigation history are enabled


  if (message.t && !sendMessageType(message.t)) {
    return message;
  }

  sendToCRM('Message', room, [message]);
  return message;
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-crm-message');
RocketChat.callbacks.add('livechat.leadCapture', room => {
  if (!RocketChat.settings.get('Livechat_webhook_on_capture')) {
    return room;
  }

  return sendToCRM('LeadCapture', room, false);
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-crm-lead-capture');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendToFacebook.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/sendToFacebook.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let OmniChannel;
module.watch(require("../lib/OmniChannel"), {
  default(v) {
    OmniChannel = v;
  }

}, 0);
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // skips this callback if the message was edited
  if (message.editedAt) {
    return message;
  }

  if (!RocketChat.settings.get('Livechat_Facebook_Enabled') || !RocketChat.settings.get('Livechat_Facebook_API_Key')) {
    return message;
  } // only send the sms by SMS if it is a livechat room with SMS set to true


  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.facebook && room.v && room.v.token)) {
    return message;
  } // if the message has a token, it was sent from the visitor, so ignore it


  if (message.token) {
    return message;
  } // if the message has a type means it is a special message (like the closing comment), so skips


  if (message.t) {
    return message;
  }

  OmniChannel.reply({
    page: room.facebook.page.id,
    token: room.v.token,
    text: message.msg
  });
  return message;
}, RocketChat.callbacks.priority.LOW, 'sendMessageToFacebook');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"addAgent.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/addAgent.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:addAgent'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:addAgent'
      });
    }

    return RocketChat.Livechat.addAgent(username);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addManager.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/addManager.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:addManager'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:addManager'
      });
    }

    return RocketChat.Livechat.addManager(username);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"changeLivechatStatus.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/changeLivechatStatus.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:changeLivechatStatus'() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:changeLivechatStatus'
      });
    }

    const user = Meteor.user();
    const newStatus = user.statusLivechat === 'available' ? 'not-available' : 'available';
    return RocketChat.models.Users.setLivechatStatus(user._id, newStatus);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"closeByVisitor.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/closeByVisitor.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:closeByVisitor'({
    roomId,
    token
  }) {
    const room = RocketChat.models.Rooms.findOneOpenByVisitorToken(token, roomId);

    if (!room || !room.open) {
      return false;
    }

    const visitor = LivechatVisitors.getVisitorByToken(token);
    const language = visitor && visitor.language || RocketChat.settings.get('language') || 'en';
    return RocketChat.Livechat.closeRoom({
      visitor,
      room,
      comment: TAPi18n.__('Closed_by_visitor', {
        lng: language
      })
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"closeRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/closeRoom.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:closeRoom'(roomId, comment) {
    const userId = Meteor.userId();

    if (!userId || !RocketChat.authz.hasPermission(userId, 'close-livechat-room')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'livechat:closeRoom'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(roomId);

    if (!room || room.t !== 'l') {
      throw new Meteor.Error('room-not-found', 'Room not found', {
        method: 'livechat:closeRoom'
      });
    }

    const user = Meteor.user();
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(roomId, user._id, {
      _id: 1
    });

    if (!subscription && !RocketChat.authz.hasPermission(userId, 'close-others-livechat-room')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'livechat:closeRoom'
      });
    }

    return RocketChat.Livechat.closeRoom({
      user,
      room,
      comment
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"facebook.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/facebook.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let OmniChannel;
module.watch(require("../lib/OmniChannel"), {
  default(v) {
    OmniChannel = v;
  }

}, 0);
Meteor.methods({
  'livechat:facebook'(options) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:addAgent'
      });
    }

    try {
      switch (options.action) {
        case 'initialState':
          {
            return {
              enabled: RocketChat.settings.get('Livechat_Facebook_Enabled'),
              hasToken: !!RocketChat.settings.get('Livechat_Facebook_API_Key')
            };
          }

        case 'enable':
          {
            const result = OmniChannel.enable();

            if (!result.success) {
              return result;
            }

            return RocketChat.settings.updateById('Livechat_Facebook_Enabled', true);
          }

        case 'disable':
          {
            OmniChannel.disable();
            return RocketChat.settings.updateById('Livechat_Facebook_Enabled', false);
          }

        case 'list-pages':
          {
            return OmniChannel.listPages();
          }

        case 'subscribe':
          {
            return OmniChannel.subscribe(options.page);
          }

        case 'unsubscribe':
          {
            return OmniChannel.unsubscribe(options.page);
          }
      }
    } catch (e) {
      if (e.response && e.response.data && e.response.data.error) {
        if (e.response.data.error.error) {
          throw new Meteor.Error(e.response.data.error.error, e.response.data.error.message);
        }

        if (e.response.data.error.response) {
          throw new Meteor.Error('integration-error', e.response.data.error.response.error.message);
        }

        if (e.response.data.error.message) {
          throw new Meteor.Error('integration-error', e.response.data.error.message);
        }
      }

      console.error('Error contacting omni.rocket.chat:', e);
      throw new Meteor.Error('integration-error', e.error);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getCustomFields.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getCustomFields.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:getCustomFields'() {
    return RocketChat.models.LivechatCustomField.find().fetch();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getAgentData.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getAgentData.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:getAgentData'({
    roomId,
    token
  }) {
    check(roomId, String);
    check(token, String);
    const room = RocketChat.models.Rooms.findOneById(roomId);
    const visitor = LivechatVisitors.getVisitorByToken(token);

    if (!room || room.t !== 'l' || !room.v || room.v.token !== visitor.token) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room');
    }

    if (!room.servedBy) {
      return;
    }

    return RocketChat.models.Users.getAgentInfo(room.servedBy._id);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getInitialData.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getInitialData.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 1);
Meteor.methods({
  'livechat:getInitialData'(visitorToken, departmentId) {
    const info = {
      enabled: null,
      title: null,
      color: null,
      registrationForm: null,
      room: null,
      visitor: null,
      triggers: [],
      departments: [],
      allowSwitchingDepartments: null,
      online: true,
      offlineColor: null,
      offlineMessage: null,
      offlineSuccessMessage: null,
      offlineUnavailableMessage: null,
      displayOfflineForm: null,
      videoCall: null,
      fileUpload: null,
      conversationFinishedMessage: null,
      nameFieldRegistrationForm: null,
      emailFieldRegistrationForm: null
    };
    const options = {
      fields: {
        name: 1,
        t: 1,
        cl: 1,
        u: 1,
        usernames: 1,
        v: 1,
        servedBy: 1,
        departmentId: 1
      }
    };
    const room = departmentId ? RocketChat.models.Rooms.findOpenByVisitorTokenAndDepartmentId(visitorToken, departmentId, options).fetch() : RocketChat.models.Rooms.findOpenByVisitorToken(visitorToken, options).fetch();

    if (room && room.length > 0) {
      info.room = room[0];
    }

    const visitor = LivechatVisitors.getVisitorByToken(visitorToken, {
      fields: {
        name: 1,
        username: 1,
        visitorEmails: 1,
        department: 1
      }
    });

    if (room) {
      info.visitor = visitor;
    }

    const initSettings = RocketChat.Livechat.getInitSettings();
    info.title = initSettings.Livechat_title;
    info.color = initSettings.Livechat_title_color;
    info.enabled = initSettings.Livechat_enabled;
    info.registrationForm = initSettings.Livechat_registration_form;
    info.offlineTitle = initSettings.Livechat_offline_title;
    info.offlineColor = initSettings.Livechat_offline_title_color;
    info.offlineMessage = initSettings.Livechat_offline_message;
    info.offlineSuccessMessage = initSettings.Livechat_offline_success_message;
    info.offlineUnavailableMessage = initSettings.Livechat_offline_form_unavailable;
    info.displayOfflineForm = initSettings.Livechat_display_offline_form;
    info.language = initSettings.Language;
    info.videoCall = initSettings.Livechat_videocall_enabled === true && initSettings.Jitsi_Enabled === true;
    info.fileUpload = initSettings.Livechat_fileupload_enabled && initSettings.FileUpload_Enabled;
    info.transcript = initSettings.Livechat_enable_transcript;
    info.transcriptMessage = initSettings.Livechat_transcript_message;
    info.conversationFinishedMessage = initSettings.Livechat_conversation_finished_message;
    info.nameFieldRegistrationForm = initSettings.Livechat_name_field_registration_form;
    info.emailFieldRegistrationForm = initSettings.Livechat_email_field_registration_form;
    info.agentData = room && room[0] && room[0].servedBy && RocketChat.models.Users.getAgentInfo(room[0].servedBy._id);
    RocketChat.models.LivechatTrigger.findEnabled().forEach(trigger => {
      info.triggers.push(_.pick(trigger, '_id', 'actions', 'conditions'));
    });
    RocketChat.models.LivechatDepartment.findEnabledWithAgents().forEach(department => {
      info.departments.push(department);
    });
    info.allowSwitchingDepartments = initSettings.Livechat_allow_switching_departments;
    info.online = RocketChat.models.Users.findOnlineAgents().count() > 0;
    return info;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getNextAgent.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getNextAgent.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:getNextAgent'({
    token,
    department
  }) {
    check(token, String);
    const room = RocketChat.models.Rooms.findOpenByVisitorToken(token).fetch();

    if (room && room.length > 0) {
      return;
    }

    if (!department) {
      const requireDeparment = RocketChat.Livechat.getRequiredDepartment();

      if (requireDeparment) {
        department = requireDeparment._id;
      }
    }

    const agent = RocketChat.Livechat.getNextAgent(department);

    if (!agent) {
      return;
    }

    return RocketChat.models.Users.getAgentInfo(agent.agentId);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"loadHistory.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/loadHistory.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:loadHistory'({
    token,
    rid,
    end,
    limit = 20,
    ls
  }) {
    const visitor = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        _id: 1
      }
    });

    if (!visitor) {
      return;
    }

    return RocketChat.loadMessageHistory({
      userId: visitor._id,
      rid,
      end,
      limit,
      ls
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"loginByToken.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/loginByToken.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:loginByToken'(token) {
    const visitor = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        _id: 1
      }
    });

    if (!visitor) {
      return;
    }

    return {
      _id: visitor._id
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pageVisited.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/pageVisited.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:pageVisited'(token, room, pageInfo) {
    RocketChat.Livechat.savePageHistory(token, room, pageInfo);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"registerGuest.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/registerGuest.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:registerGuest'({
    token,
    name,
    email,
    department,
    customFields
  } = {}) {
    const userId = RocketChat.Livechat.registerGuest.call(this, {
      token,
      name,
      email,
      department
    }); // update visited page history to not expire

    RocketChat.models.Messages.keepHistoryForToken(token);
    const visitor = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        token: 1,
        name: 1,
        username: 1,
        visitorEmails: 1,
        department: 1
      }
    }); // If it's updating an existing visitor, it must also update the roomInfo

    const cursor = RocketChat.models.Rooms.findOpenByVisitorToken(token);
    cursor.forEach(room => {
      RocketChat.Livechat.saveRoomInfo(room, visitor);
    });

    if (customFields && customFields instanceof Array) {
      customFields.forEach(customField => {
        if (typeof customField !== 'object') {
          return;
        }

        if (!customField.scope || customField.scope !== 'room') {
          const {
            key,
            value,
            overwrite
          } = customField;
          LivechatVisitors.updateLivechatDataByToken(token, key, value, overwrite);
        }
      });
    }

    return {
      userId,
      visitor
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeAgent.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeAgent.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeAgent'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeAgent'
      });
    }

    return RocketChat.Livechat.removeAgent(username);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeCustomField.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeCustomField.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeCustomField'(_id) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeCustomField'
      });
    }

    check(_id, String);
    const customField = RocketChat.models.LivechatCustomField.findOneById(_id, {
      fields: {
        _id: 1
      }
    });

    if (!customField) {
      throw new Meteor.Error('error-invalid-custom-field', 'Custom field not found', {
        method: 'livechat:removeCustomField'
      });
    }

    return RocketChat.models.LivechatCustomField.removeById(_id);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeDepartment.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeDepartment.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeDepartment'(_id) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeDepartment'
      });
    }

    return RocketChat.Livechat.removeDepartment(_id);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeManager.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeManager.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeManager'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeManager'
      });
    }

    return RocketChat.Livechat.removeManager(username);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeTrigger.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeTrigger.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeTrigger'(triggerId) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeTrigger'
      });
    }

    check(triggerId, String);
    return RocketChat.models.LivechatTrigger.removeById(triggerId);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeRoom.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeRoom'(rid) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'remove-closed-livechat-rooms')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeRoom'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'livechat:removeRoom'
      });
    }

    if (room.t !== 'l') {
      throw new Meteor.Error('error-this-is-not-a-livechat-room', 'This is not a Livechat room', {
        method: 'livechat:removeRoom'
      });
    }

    if (room.open) {
      throw new Meteor.Error('error-room-is-not-closed', 'Room is not closed', {
        method: 'livechat:removeRoom'
      });
    }

    RocketChat.models.Messages.removeByRoomId(rid);
    RocketChat.models.Subscriptions.removeByRoomId(rid);
    return RocketChat.models.Rooms.removeById(rid);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveAppearance.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveAppearance.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:saveAppearance'(settings) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveAppearance'
      });
    }

    const validSettings = ['Livechat_title', 'Livechat_title_color', 'Livechat_show_agent_email', 'Livechat_display_offline_form', 'Livechat_offline_form_unavailable', 'Livechat_offline_message', 'Livechat_offline_success_message', 'Livechat_offline_title', 'Livechat_offline_title_color', 'Livechat_offline_email', 'Livechat_conversation_finished_message', 'Livechat_registration_form', 'Livechat_name_field_registration_form', 'Livechat_email_field_registration_form'];
    const valid = settings.every(setting => validSettings.indexOf(setting._id) !== -1);

    if (!valid) {
      throw new Meteor.Error('invalid-setting');
    }

    settings.forEach(setting => {
      RocketChat.settings.updateById(setting._id, setting.value);
    });
    return;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveCustomField.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveCustomField.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* eslint new-cap: [2, {"capIsNewExceptions": ["Match.ObjectIncluding", "Match.Optional"]}] */
Meteor.methods({
  'livechat:saveCustomField'(_id, customFieldData) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveCustomField'
      });
    }

    if (_id) {
      check(_id, String);
    }

    check(customFieldData, Match.ObjectIncluding({
      field: String,
      label: String,
      scope: String,
      visibility: String
    }));

    if (!/^[0-9a-zA-Z-_]+$/.test(customFieldData.field)) {
      throw new Meteor.Error('error-invalid-custom-field-nmae', 'Invalid custom field name. Use only letters, numbers, hyphens and underscores.', {
        method: 'livechat:saveCustomField'
      });
    }

    if (_id) {
      const customField = RocketChat.models.LivechatCustomField.findOneById(_id);

      if (!customField) {
        throw new Meteor.Error('error-invalid-custom-field', 'Custom Field Not found', {
          method: 'livechat:saveCustomField'
        });
      }
    }

    return RocketChat.models.LivechatCustomField.createOrUpdateCustomField(_id, customFieldData.field, customFieldData.label, customFieldData.scope, customFieldData.visibility);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveDepartment.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveDepartment.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:saveDepartment'(_id, departmentData, departmentAgents) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveDepartment'
      });
    }

    return RocketChat.Livechat.saveDepartment(_id, departmentData, departmentAgents);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveInfo.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveInfo.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* eslint new-cap: [2, {"capIsNewExceptions": ["Match.ObjectIncluding", "Match.Optional"]}] */
Meteor.methods({
  'livechat:saveInfo'(guestData, roomData) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-l-room')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveInfo'
      });
    }

    check(guestData, Match.ObjectIncluding({
      _id: String,
      name: Match.Optional(String),
      email: Match.Optional(String),
      phone: Match.Optional(String)
    }));
    check(roomData, Match.ObjectIncluding({
      _id: String,
      topic: Match.Optional(String),
      tags: Match.Optional(String)
    }));
    const room = RocketChat.models.Rooms.findOneById(roomData._id, {
      fields: {
        t: 1,
        servedBy: 1
      }
    });

    if (room == null || room.t !== 'l') {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'livechat:saveInfo'
      });
    }

    if ((!room.servedBy || room.servedBy._id !== Meteor.userId()) && !RocketChat.authz.hasPermission(Meteor.userId(), 'save-others-livechat-room-info')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveInfo'
      });
    }

    const ret = RocketChat.Livechat.saveGuest(guestData) && RocketChat.Livechat.saveRoomInfo(roomData, guestData);
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.saveInfo', RocketChat.models.Rooms.findOneById(roomData._id));
    });
    return ret;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveIntegration.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveIntegration.js                                                      //
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
  'livechat:saveIntegration'(values) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveIntegration'
      });
    }

    if (typeof values.Livechat_webhookUrl !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhookUrl', s.trim(values.Livechat_webhookUrl));
    }

    if (typeof values.Livechat_secret_token !== 'undefined') {
      RocketChat.settings.updateById('Livechat_secret_token', s.trim(values.Livechat_secret_token));
    }

    if (typeof values.Livechat_webhook_on_close !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_close', !!values.Livechat_webhook_on_close);
    }

    if (typeof values.Livechat_webhook_on_offline_msg !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_offline_msg', !!values.Livechat_webhook_on_offline_msg);
    }

    if (typeof values.Livechat_webhook_on_visitor_message !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_visitor_message', !!values.Livechat_webhook_on_visitor_message);
    }

    if (typeof values.Livechat_webhook_on_agent_message !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_agent_message', !!values.Livechat_webhook_on_agent_message);
    }

    return;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveSurveyFeedback.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveSurveyFeedback.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 1);
Meteor.methods({
  'livechat:saveSurveyFeedback'(visitorToken, visitorRoom, formData) {
    check(visitorToken, String);
    check(visitorRoom, String);
    check(formData, [Match.ObjectIncluding({
      name: String,
      value: String
    })]);
    const visitor = LivechatVisitors.getVisitorByToken(visitorToken);
    const room = RocketChat.models.Rooms.findOneById(visitorRoom);

    if (visitor !== undefined && room !== undefined && room.v !== undefined && room.v.token === visitor.token) {
      const updateData = {};

      for (const item of formData) {
        if (_.contains(['satisfaction', 'agentKnowledge', 'agentResposiveness', 'agentFriendliness'], item.name) && _.contains(['1', '2', '3', '4', '5'], item.value)) {
          updateData[item.name] = item.value;
        } else if (item.name === 'additionalFeedback') {
          updateData[item.name] = item.value;
        }
      }

      if (!_.isEmpty(updateData)) {
        return RocketChat.models.Rooms.updateSurveyFeedbackById(room._id, updateData);
      }
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveTrigger.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveTrigger.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:saveTrigger'(trigger) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveTrigger'
      });
    }

    check(trigger, {
      _id: Match.Maybe(String),
      name: String,
      description: String,
      enabled: Boolean,
      conditions: Array,
      actions: Array
    });

    if (trigger._id) {
      return RocketChat.models.LivechatTrigger.updateById(trigger._id, trigger);
    } else {
      return RocketChat.models.LivechatTrigger.insert(trigger);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"searchAgent.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/searchAgent.js                                                          //
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
  'livechat:searchAgent'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:searchAgent'
      });
    }

    if (!username || !_.isString(username)) {
      throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
        method: 'livechat:searchAgent'
      });
    }

    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1,
        username: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:searchAgent'
      });
    }

    return user;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendMessageLivechat.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/sendMessageLivechat.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  sendMessageLivechat({
    token,
    _id,
    rid,
    msg,
    attachments
  }, agent) {
    check(token, String);
    check(_id, String);
    check(rid, String);
    check(msg, String);
    check(agent, Match.Maybe({
      agentId: String,
      username: String
    }));
    const guest = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        name: 1,
        username: 1,
        department: 1,
        token: 1
      }
    });

    if (!guest) {
      throw new Meteor.Error('invalid-token');
    }

    return RocketChat.Livechat.sendMessage({
      guest,
      message: {
        _id,
        rid,
        msg,
        token,
        attachments
      },
      agent
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendFileLivechatMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/sendFileLivechatMessage.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'sendFileLivechatMessage'(roomId, visitorToken, file, msgData = {}) {
    return Promise.asyncApply(() => {
      const visitor = LivechatVisitors.getVisitorByToken(visitorToken);

      if (!visitor) {
        return false;
      }

      const room = RocketChat.models.Rooms.findOneOpenByVisitorToken(visitorToken, roomId);

      if (!room) {
        return false;
      }

      check(msgData, {
        avatar: Match.Optional(String),
        emoji: Match.Optional(String),
        alias: Match.Optional(String),
        groupable: Match.Optional(Boolean),
        msg: Match.Optional(String)
      });
      const fileUrl = `/file-upload/${file._id}/${encodeURI(file.name)}`;
      const attachment = {
        title: file.name,
        type: 'file',
        description: file.description,
        title_link: fileUrl,
        title_link_download: true
      };

      if (/^image\/.+/.test(file.type)) {
        attachment.image_url = fileUrl;
        attachment.image_type = file.type;
        attachment.image_size = file.size;

        if (file.identify && file.identify.size) {
          attachment.image_dimensions = file.identify.size;
        }

        attachment.image_preview = Promise.await(FileUpload.resizeImagePreview(file));
      } else if (/^audio\/.+/.test(file.type)) {
        attachment.audio_url = fileUrl;
        attachment.audio_type = file.type;
        attachment.audio_size = file.size;
      } else if (/^video\/.+/.test(file.type)) {
        attachment.video_url = fileUrl;
        attachment.video_type = file.type;
        attachment.video_size = file.size;
      }

      const msg = Object.assign({
        _id: Random.id(),
        rid: roomId,
        ts: new Date(),
        msg: '',
        file: {
          _id: file._id,
          name: file.name,
          type: file.type
        },
        groupable: false,
        attachments: [attachment],
        token: visitorToken
      }, msgData);
      return Meteor.call('sendMessageLivechat', msg);
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendOfflineMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/sendOfflineMessage.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let dns;
module.watch(require("dns"), {
  default(v) {
    dns = v;
  }

}, 0);
Meteor.methods({
  'livechat:sendOfflineMessage'(data) {
    check(data, {
      name: String,
      email: String,
      message: String
    });

    if (!RocketChat.settings.get('Livechat_display_offline_form')) {
      return false;
    }

    const header = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Header') || '');
    const footer = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Footer') || '');
    const message = `${data.message}`.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br>' + '$2');
    const html = `
			<h1>New livechat message</h1>
			<p><strong>Visitor name:</strong> ${data.name}</p>
			<p><strong>Visitor email:</strong> ${data.email}</p>
			<p><strong>Message:</strong><br>${message}</p>`;
    let fromEmail = RocketChat.settings.get('From_Email').match(/\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,4}\b/i);

    if (fromEmail) {
      fromEmail = fromEmail[0];
    } else {
      fromEmail = RocketChat.settings.get('From_Email');
    }

    if (RocketChat.settings.get('Livechat_validate_offline_email')) {
      const emailDomain = data.email.substr(data.email.lastIndexOf('@') + 1);

      try {
        Meteor.wrapAsync(dns.resolveMx)(emailDomain);
      } catch (e) {
        throw new Meteor.Error('error-invalid-email-address', 'Invalid email address', {
          method: 'livechat:sendOfflineMessage'
        });
      }
    }

    Meteor.defer(() => {
      Email.send({
        to: RocketChat.settings.get('Livechat_offline_email'),
        from: `${data.name} - ${data.email} <${fromEmail}>`,
        replyTo: `${data.name} <${data.email}>`,
        subject: `Livechat offline message from ${data.name}: ${`${data.message}`.substring(0, 20)}`,
        html: header + html + footer
      });
    });
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.offlineMessage', data);
    });
    return true;
  }

});
DDPRateLimiter.addRule({
  type: 'method',
  name: 'livechat:sendOfflineMessage',

  connectionId() {
    return true;
  }

}, 1, 5000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setCustomField.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/setCustomField.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:setCustomField'(token, key, value, overwrite = true) {
    const customField = RocketChat.models.LivechatCustomField.findOneById(key);

    if (customField) {
      if (customField.scope === 'room') {
        return RocketChat.models.Rooms.updateLivechatDataByToken(token, key, value, overwrite);
      } else {
        // Save in user
        return LivechatVisitors.updateLivechatDataByToken(token, key, value, overwrite);
      }
    }

    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setDepartmentForVisitor.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/setDepartmentForVisitor.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:setDepartmentForVisitor'({
    roomId,
    visitorToken,
    departmentId
  } = {}) {
    check(roomId, String);
    check(visitorToken, String);
    check(departmentId, String);
    const room = RocketChat.models.Rooms.findOneById(roomId);
    const visitor = LivechatVisitors.getVisitorByToken(visitorToken);

    if (!room || room.t !== 'l' || !room.v || room.v.token !== visitor.token) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room');
    } // update visited page history to not expire


    RocketChat.models.Messages.keepHistoryForToken(visitorToken);
    const transferData = {
      roomId,
      departmentId
    };
    return RocketChat.Livechat.transfer(room, visitor, transferData);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"startVideoCall.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/startVideoCall.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* eslint new-cap: [2, {"capIsNewExceptions": ["MD5"]}] */
Meteor.methods({
  'livechat:startVideoCall'(roomId) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'livechat:closeByVisitor'
      });
    }

    const guest = Meteor.user();
    const message = {
      _id: Random.id(),
      rid: roomId || Random.id(),
      msg: '',
      ts: new Date()
    };
    const {
      room
    } = RocketChat.Livechat.getRoom(guest, message, {
      jitsiTimeout: new Date(Date.now() + 3600 * 1000)
    });
    message.rid = room._id;
    RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('livechat_video_call', room._id, '', guest, {
      actionLinks: [{
        icon: 'icon-videocam',
        i18nLabel: 'Accept',
        method_id: 'createLivechatCall',
        params: ''
      }, {
        icon: 'icon-cancel',
        i18nLabel: 'Decline',
        method_id: 'denyLivechatCall',
        params: ''
      }]
    });
    return {
      roomId: room._id,
      domain: RocketChat.settings.get('Jitsi_Domain'),
      jitsiRoom: RocketChat.settings.get('Jitsi_URL_Room_Prefix') + RocketChat.settings.get('uniqueID') + roomId
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"startFileUploadRoom.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/startFileUploadRoom.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:startFileUploadRoom'(roomId, token) {
    const guest = LivechatVisitors.getVisitorByToken(token);
    const message = {
      _id: Random.id(),
      rid: roomId || Random.id(),
      msg: '',
      ts: new Date(),
      token: guest.token
    };
    return RocketChat.Livechat.getRoom(guest, message);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"transfer.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/transfer.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:transfer'(transferData) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-l-room')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:transfer'
      });
    }

    check(transferData, {
      roomId: String,
      userId: Match.Optional(String),
      departmentId: Match.Optional(String)
    });
    const room = RocketChat.models.Rooms.findOneById(transferData.roomId);
    const guest = LivechatVisitors.findOneById(room.v._id);
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, Meteor.userId(), {
      fields: {
        _id: 1
      }
    });

    if (!subscription && !RocketChat.authz.hasRole(Meteor.userId(), 'livechat-manager')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'livechat:transfer'
      });
    }

    return RocketChat.Livechat.transfer(room, guest, transferData);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"webhookTest.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/webhookTest.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals HTTP */
const postCatchError = Meteor.wrapAsync(function (url, options, resolve) {
  HTTP.post(url, options, function (err, res) {
    if (err) {
      resolve(null, err.response);
    } else {
      resolve(null, res);
    }
  });
});
Meteor.methods({
  'livechat:webhookTest'() {
    this.unblock();
    const sampleData = {
      type: 'LivechatSession',
      _id: 'fasd6f5a4sd6f8a4sdf',
      label: 'title',
      topic: 'asiodojf',
      createdAt: new Date(),
      lastMessageAt: new Date(),
      tags: ['tag1', 'tag2', 'tag3'],
      customFields: {
        productId: '123456'
      },
      visitor: {
        _id: '',
        name: 'visitor name',
        username: 'visitor-username',
        department: 'department',
        email: 'email@address.com',
        phone: '192873192873',
        ip: '123.456.7.89',
        browser: 'Chrome',
        os: 'Linux',
        customFields: {
          customerId: '123456'
        }
      },
      agent: {
        _id: 'asdf89as6df8',
        username: 'agent.username',
        name: 'Agent Name',
        email: 'agent@email.com'
      },
      messages: [{
        username: 'visitor-username',
        msg: 'message content',
        ts: new Date()
      }, {
        username: 'agent.username',
        agentId: 'asdf89as6df8',
        msg: 'message content from agent',
        ts: new Date()
      }]
    };
    const options = {
      headers: {
        'X-RocketChat-Livechat-Token': RocketChat.settings.get('Livechat_secret_token')
      },
      data: sampleData
    };
    const response = postCatchError(RocketChat.settings.get('Livechat_webhookUrl'), options);
    console.log('response ->', response);

    if (response && response.statusCode && response.statusCode === 200) {
      return true;
    } else {
      throw new Meteor.Error('error-invalid-webhook-response');
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"takeInquiry.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/takeInquiry.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:takeInquiry'(inquiryId) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-l-room')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:takeInquiry'
      });
    }

    const inquiry = RocketChat.models.LivechatInquiry.findOneById(inquiryId);

    if (!inquiry || inquiry.status === 'taken') {
      throw new Meteor.Error('error-not-allowed', 'Inquiry already taken', {
        method: 'livechat:takeInquiry'
      });
    }

    const user = RocketChat.models.Users.findOneById(Meteor.userId());
    const agent = {
      agentId: user._id,
      username: user.username
    }; // add subscription

    const subscriptionData = {
      rid: inquiry.rid,
      name: inquiry.name,
      alert: true,
      open: true,
      unread: 1,
      userMentions: 1,
      groupMentions: 0,
      u: {
        _id: agent.agentId,
        username: agent.username
      },
      t: 'l',
      desktopNotifications: 'all',
      mobilePushNotifications: 'all',
      emailNotifications: 'all'
    };
    RocketChat.models.Subscriptions.insert(subscriptionData);
    RocketChat.models.Rooms.incUsersCountById(inquiry.rid); // update room

    const room = RocketChat.models.Rooms.findOneById(inquiry.rid);
    RocketChat.models.Rooms.changeAgentByRoomId(inquiry.rid, agent);
    room.servedBy = {
      _id: agent.agentId,
      username: agent.username
    }; // mark inquiry as taken

    RocketChat.models.LivechatInquiry.takeInquiry(inquiry._id); // remove sending message from guest widget
    // dont check if setting is true, because if settingwas switched off inbetween  guest entered pool,
    // and inquiry being taken, message would not be switched off.

    RocketChat.models.Messages.createCommandWithRoomIdAndUser('connected', room._id, user);
    RocketChat.Livechat.stream.emit(room._id, {
      type: 'agentData',
      data: RocketChat.models.Users.getAgentInfo(agent.agentId)
    }); // return inquiry (for redirecting agent to the room route)

    return inquiry;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"returnAsInquiry.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/returnAsInquiry.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:returnAsInquiry'(rid, departmentId) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-l-room')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveDepartment'
      });
    }

    return RocketChat.Livechat.returnRoomAsInquiry(rid, departmentId);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveOfficeHours.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveOfficeHours.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:saveOfficeHours'(day, start, finish, open) {
    RocketChat.models.LivechatOfficeHour.updateHours(day, start, finish, open);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendTranscript.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/sendTranscript.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 1);
Meteor.methods({
  'livechat:sendTranscript'(token, rid, email) {
    check(rid, String);
    check(email, String);
    const room = RocketChat.models.Rooms.findOneById(rid);
    const visitor = LivechatVisitors.getVisitorByToken(token);
    const userLanguage = visitor && visitor.language || RocketChat.settings.get('language') || 'en'; // allow to only user to send transcripts from their own chats

    if (!room || room.t !== 'l' || !room.v || room.v.token !== token) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room');
    }

    const messages = RocketChat.models.Messages.findVisibleByRoomIdNotContainingTypes(rid, ['livechat_navigation_history'], {
      sort: {
        ts: 1
      }
    });
    const header = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Header') || '');
    const footer = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Footer') || '');
    let html = '<div> <hr>';
    messages.forEach(message => {
      if (message.t && ['command', 'livechat-close', 'livechat_video_call'].indexOf(message.t) !== -1) {
        return;
      }

      let author;

      if (message.u._id === visitor._id) {
        author = TAPi18n.__('You', {
          lng: userLanguage
        });
      } else {
        author = message.u.username;
      }

      const datetime = moment(message.ts).locale(userLanguage).format('LLL');
      const singleMessage = `
				<p><strong>${author}</strong>  <em>${datetime}</em></p>
				<p>${message.msg}</p>
			`;
      html = html + singleMessage;
    });
    html = `${html}</div>`;
    let fromEmail = RocketChat.settings.get('From_Email').match(/\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,4}\b/i);

    if (fromEmail) {
      fromEmail = fromEmail[0];
    } else {
      fromEmail = RocketChat.settings.get('From_Email');
    }

    emailSettings = {
      to: email,
      from: fromEmail,
      replyTo: fromEmail,
      subject: TAPi18n.__('Transcript_of_your_livechat_conversation', {
        lng: userLanguage
      }),
      html: header + html + footer
    };
    Meteor.defer(() => {
      Email.send(emailSettings);
    });
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.sendTranscript', messages, email);
    });
    return true;
  }

});
DDPRateLimiter.addRule({
  type: 'method',
  name: 'livechat:sendTranscript',

  connectionId() {
    return true;
  }

}, 1, 5000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"Users.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/Users.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Sets an user as (non)operator
 * @param {string} _id - User's _id
 * @param {boolean} operator - Flag to set as operator or not
 */
RocketChat.models.Users.setOperator = function (_id, operator) {
  const update = {
    $set: {
      operator
    }
  };
  return this.update(_id, update);
};
/**
 * Gets all online agents
 * @return
 */


RocketChat.models.Users.findOnlineAgents = function () {
  const query = {
    status: {
      $exists: true,
      $ne: 'offline'
    },
    statusLivechat: 'available',
    roles: 'livechat-agent'
  };
  return this.find(query);
};
/**
 * Find an online agent by his username
 * @return
 */


RocketChat.models.Users.findOneOnlineAgentByUsername = function (username) {
  const query = {
    username,
    status: {
      $exists: true,
      $ne: 'offline'
    },
    statusLivechat: 'available',
    roles: 'livechat-agent'
  };
  return this.findOne(query);
};
/**
 * Gets all agents
 * @return
 */


RocketChat.models.Users.findAgents = function () {
  const query = {
    roles: 'livechat-agent'
  };
  return this.find(query);
};
/**
 * Find online users from a list
 * @param {array} userList - array of usernames
 * @return
 */


RocketChat.models.Users.findOnlineUserFromList = function (userList) {
  const query = {
    status: {
      $exists: true,
      $ne: 'offline'
    },
    statusLivechat: 'available',
    roles: 'livechat-agent',
    username: {
      $in: [].concat(userList)
    }
  };
  return this.find(query);
};
/**
 * Get next user agent in order
 * @return {object} User from db
 */


RocketChat.models.Users.getNextAgent = function () {
  const query = {
    status: {
      $exists: true,
      $ne: 'offline'
    },
    statusLivechat: 'available',
    roles: 'livechat-agent'
  };
  const collectionObj = this.model.rawCollection();
  const findAndModify = Meteor.wrapAsync(collectionObj.findAndModify, collectionObj);
  const sort = {
    livechatCount: 1,
    username: 1
  };
  const update = {
    $inc: {
      livechatCount: 1
    }
  };
  const user = findAndModify(query, sort, update);

  if (user && user.value) {
    return {
      agentId: user.value._id,
      username: user.value.username
    };
  } else {
    return null;
  }
};
/**
 * Change user's livechat status
 * @param {string} token - Visitor token
 */


RocketChat.models.Users.setLivechatStatus = function (userId, status) {
  const query = {
    _id: userId
  };
  const update = {
    $set: {
      statusLivechat: status
    }
  };
  return this.update(query, update);
};
/**
 * change all livechat agents livechat status to "not-available"
 */


RocketChat.models.Users.closeOffice = function () {
  self = this;
  self.findAgents().forEach(function (agent) {
    self.setLivechatStatus(agent._id, 'not-available');
  });
};
/**
 * change all livechat agents livechat status to "available"
 */


RocketChat.models.Users.openOffice = function () {
  self = this;
  self.findAgents().forEach(function (agent) {
    self.setLivechatStatus(agent._id, 'available');
  });
};

RocketChat.models.Users.getAgentInfo = function (agentId) {
  const query = {
    _id: agentId
  };
  const options = {
    fields: {
      name: 1,
      username: 1,
      phone: 1,
      customFields: 1
    }
  };

  if (RocketChat.settings.get('Livechat_show_agent_email')) {
    options.fields.emails = 1;
  }

  return this.findOne(query, options);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Rooms.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/Rooms.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/**
 * Gets visitor by token
 * @param {string} token - Visitor token
 */
RocketChat.models.Rooms.updateSurveyFeedbackById = function (_id, surveyFeedback) {
  const query = {
    _id
  };
  const update = {
    $set: {
      surveyFeedback
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.updateLivechatDataByToken = function (token, key, value, overwrite = true) {
  const query = {
    'v.token': token,
    open: true
  };

  if (!overwrite) {
    const room = this.findOne(query, {
      fields: {
        livechatData: 1
      }
    });

    if (room.livechatData && typeof room.livechatData[key] !== 'undefined') {
      return true;
    }
  }

  const update = {
    $set: {
      [`livechatData.${key}`]: value
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.findLivechat = function (filter = {}, offset = 0, limit = 20) {
  const query = _.extend(filter, {
    t: 'l'
  });

  return this.find(query, {
    sort: {
      ts: -1
    },
    offset,
    limit
  });
};

RocketChat.models.Rooms.findLivechatById = function (_id, fields) {
  const options = {};

  if (fields) {
    options.fields = fields;
  }

  const query = {
    t: 'l',
    _id
  };
  return this.find(query, options);
};
/**
 * Get the next visitor name
 * @return {string} The next visitor name
 */


RocketChat.models.Rooms.updateLivechatRoomCount = function () {
  const settingsRaw = RocketChat.models.Settings.model.rawCollection();
  const findAndModify = Meteor.wrapAsync(settingsRaw.findAndModify, settingsRaw);
  const query = {
    _id: 'Livechat_Room_Count'
  };
  const update = {
    $inc: {
      value: 1
    }
  };
  const livechatCount = findAndModify(query, null, update);
  return livechatCount.value.value;
};

RocketChat.models.Rooms.findOpenByVisitorToken = function (visitorToken, options) {
  const query = {
    open: true,
    'v.token': visitorToken
  };
  return this.find(query, options);
};

RocketChat.models.Rooms.findOpenByVisitorTokenAndDepartmentId = function (visitorToken, departmentId, options) {
  const query = {
    open: true,
    'v.token': visitorToken,
    departmentId
  };
  return this.find(query, options);
};

RocketChat.models.Rooms.findByVisitorToken = function (visitorToken) {
  const query = {
    'v.token': visitorToken
  };
  return this.find(query);
};

RocketChat.models.Rooms.findByVisitorId = function (visitorId) {
  const query = {
    'v._id': visitorId
  };
  return this.find(query);
};

RocketChat.models.Rooms.findOneOpenByVisitorToken = function (token, roomId) {
  const query = {
    _id: roomId,
    open: true,
    'v.token': token
  };
  return this.findOne(query);
};

RocketChat.models.Rooms.setResponseByRoomId = function (roomId, response) {
  return this.update({
    _id: roomId
  }, {
    $set: {
      responseBy: {
        _id: response.user._id,
        username: response.user.username
      },
      responseDate: response.responseDate,
      responseTime: response.responseTime
    },
    $unset: {
      waitingResponse: 1
    }
  });
};

RocketChat.models.Rooms.closeByRoomId = function (roomId, closeInfo) {
  return this.update({
    _id: roomId
  }, {
    $set: {
      closer: closeInfo.closer,
      closedBy: closeInfo.closedBy,
      closedAt: closeInfo.closedAt,
      chatDuration: closeInfo.chatDuration,
      'v.status': 'offline'
    },
    $unset: {
      open: 1
    }
  });
};

RocketChat.models.Rooms.findOpenByAgent = function (userId) {
  const query = {
    open: true,
    'servedBy._id': userId
  };
  return this.find(query);
};

RocketChat.models.Rooms.changeAgentByRoomId = function (roomId, newAgent) {
  const query = {
    _id: roomId
  };
  const update = {
    $set: {
      servedBy: {
        _id: newAgent.agentId,
        username: newAgent.username
      }
    }
  };
  this.update(query, update);
};

RocketChat.models.Rooms.changeDepartmentIdByRoomId = function (roomId, departmentId) {
  const query = {
    _id: roomId
  };
  const update = {
    $set: {
      departmentId
    }
  };
  this.update(query, update);
};

RocketChat.models.Rooms.saveCRMDataByRoomId = function (roomId, crmData) {
  const query = {
    _id: roomId
  };
  const update = {
    $set: {
      crmData
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.updateVisitorStatus = function (token, status) {
  const query = {
    'v.token': token,
    open: true
  };
  const update = {
    $set: {
      'v.status': status
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.removeAgentByRoomId = function (roomId) {
  const query = {
    _id: roomId
  };
  const update = {
    $unset: {
      servedBy: 1
    }
  };
  this.update(query, update);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Messages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/Messages.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.models.Messages.keepHistoryForToken = function (token) {
  return this.update({
    'navigation.token': token,
    expireAt: {
      $exists: true
    }
  }, {
    $unset: {
      expireAt: 1
    }
  }, {
    multi: true
  });
};

RocketChat.models.Messages.setRoomIdByToken = function (token, rid) {
  return this.update({
    'navigation.token': token,
    rid: null
  }, {
    $set: {
      rid
    }
  }, {
    multi: true
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatExternalMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatExternalMessage.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
class LivechatExternalMessage extends RocketChat.models._Base {
  constructor() {
    super('livechat_external_message');

    if (Meteor.isClient) {
      this._initModel('livechat_external_message');
    }
  } // FIND


  findByRoomId(roomId, sort = {
    ts: -1
  }) {
    const query = {
      rid: roomId
    };
    return this.find(query, {
      sort
    });
  }

}

RocketChat.models.LivechatExternalMessage = new LivechatExternalMessage();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatCustomField.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatCustomField.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/**
 * Livechat Custom Fields model
 */
class LivechatCustomField extends RocketChat.models._Base {
  constructor() {
    super('livechat_custom_field');
  } // FIND


  findOneById(_id, options) {
    const query = {
      _id
    };
    return this.findOne(query, options);
  }

  createOrUpdateCustomField(_id, field, label, scope, visibility, extraData) {
    const record = {
      label,
      scope,
      visibility
    };

    _.extend(record, extraData);

    if (_id) {
      this.update({
        _id
      }, {
        $set: record
      });
    } else {
      record._id = field;
      _id = this.insert(record);
    }

    return record;
  } // REMOVE


  removeById(_id) {
    const query = {
      _id
    };
    return this.remove(query);
  }

}

RocketChat.models.LivechatCustomField = new LivechatCustomField();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatDepartment.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatDepartment.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/**
 * Livechat Department model
 */
class LivechatDepartment extends RocketChat.models._Base {
  constructor() {
    super('livechat_department');
    this.tryEnsureIndex({
      numAgents: 1,
      enabled: 1
    });
  } // FIND


  findOneById(_id, options) {
    const query = {
      _id
    };
    return this.findOne(query, options);
  }

  findByDepartmentId(_id, options) {
    const query = {
      _id
    };
    return this.find(query, options);
  }

  createOrUpdateDepartment(_id, {
    enabled,
    name,
    description,
    showOnRegistration
  }, agents) {
    agents = [].concat(agents);
    const record = {
      enabled,
      name,
      description,
      numAgents: agents.length,
      showOnRegistration
    };

    if (_id) {
      this.update({
        _id
      }, {
        $set: record
      });
    } else {
      _id = this.insert(record);
    }

    const savedAgents = _.pluck(RocketChat.models.LivechatDepartmentAgents.findByDepartmentId(_id).fetch(), 'agentId');

    const agentsToSave = _.pluck(agents, 'agentId'); // remove other agents


    _.difference(savedAgents, agentsToSave).forEach(agentId => {
      RocketChat.models.LivechatDepartmentAgents.removeByDepartmentIdAndAgentId(_id, agentId);
    });

    agents.forEach(agent => {
      RocketChat.models.LivechatDepartmentAgents.saveAgent({
        agentId: agent.agentId,
        departmentId: _id,
        username: agent.username,
        count: agent.count ? parseInt(agent.count) : 0,
        order: agent.order ? parseInt(agent.order) : 0
      });
    });
    return _.extend(record, {
      _id
    });
  } // REMOVE


  removeById(_id) {
    const query = {
      _id
    };
    return this.remove(query);
  }

  findEnabledWithAgents() {
    const query = {
      numAgents: {
        $gt: 0
      },
      enabled: true
    };
    return this.find(query);
  }

}

RocketChat.models.LivechatDepartment = new LivechatDepartment();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatDepartmentAgents.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatDepartmentAgents.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/**
 * Livechat Department model
 */
class LivechatDepartmentAgents extends RocketChat.models._Base {
  constructor() {
    super('livechat_department_agents');
  }

  findByDepartmentId(departmentId) {
    return this.find({
      departmentId
    });
  }

  saveAgent(agent) {
    return this.upsert({
      agentId: agent.agentId,
      departmentId: agent.departmentId
    }, {
      $set: {
        username: agent.username,
        count: parseInt(agent.count),
        order: parseInt(agent.order)
      }
    });
  }

  removeByDepartmentIdAndAgentId(departmentId, agentId) {
    this.remove({
      departmentId,
      agentId
    });
  }

  getNextAgentForDepartment(departmentId) {
    const agents = this.findByDepartmentId(departmentId).fetch();

    if (agents.length === 0) {
      return;
    }

    const onlineUsers = RocketChat.models.Users.findOnlineUserFromList(_.pluck(agents, 'username'));

    const onlineUsernames = _.pluck(onlineUsers.fetch(), 'username');

    const query = {
      departmentId,
      username: {
        $in: onlineUsernames
      }
    };
    const sort = {
      count: 1,
      order: 1,
      username: 1
    };
    const update = {
      $inc: {
        count: 1
      }
    };
    const collectionObj = this.model.rawCollection();
    const findAndModify = Meteor.wrapAsync(collectionObj.findAndModify, collectionObj);
    const agent = findAndModify(query, sort, update);

    if (agent && agent.value) {
      return {
        agentId: agent.value.agentId,
        username: agent.value.username
      };
    } else {
      return null;
    }
  }

  getOnlineForDepartment(departmentId) {
    const agents = this.findByDepartmentId(departmentId).fetch();

    if (agents.length === 0) {
      return [];
    }

    const onlineUsers = RocketChat.models.Users.findOnlineUserFromList(_.pluck(agents, 'username'));

    const onlineUsernames = _.pluck(onlineUsers.fetch(), 'username');

    const query = {
      departmentId,
      username: {
        $in: onlineUsernames
      }
    };
    const depAgents = this.find(query);

    if (depAgents) {
      return depAgents;
    } else {
      return [];
    }
  }

  findUsersInQueue(usersList) {
    const query = {};

    if (!_.isEmpty(usersList)) {
      query.username = {
        $in: usersList
      };
    }

    const options = {
      sort: {
        departmentId: 1,
        count: 1,
        order: 1,
        username: 1
      }
    };
    return this.find(query, options);
  }

  replaceUsernameOfAgentByUserId(userId, username) {
    const query = {
      agentId: userId
    };
    const update = {
      $set: {
        username
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

}

RocketChat.models.LivechatDepartmentAgents = new LivechatDepartmentAgents();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatPageVisited.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatPageVisited.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Livechat Page Visited model
 */
class LivechatPageVisited extends RocketChat.models._Base {
  constructor() {
    super('livechat_page_visited');
    this.tryEnsureIndex({
      token: 1
    });
    this.tryEnsureIndex({
      ts: 1
    }); // keep history for 1 month if the visitor does not register

    this.tryEnsureIndex({
      expireAt: 1
    }, {
      sparse: 1,
      expireAfterSeconds: 0
    });
  }

  saveByToken(token, pageInfo) {
    // keep history of unregistered visitors for 1 month
    const keepHistoryMiliseconds = 2592000000;
    return this.insert({
      token,
      page: pageInfo,
      ts: new Date(),
      expireAt: new Date().getTime() + keepHistoryMiliseconds
    });
  }

  findByToken(token) {
    return this.find({
      token
    }, {
      sort: {
        ts: -1
      },
      limit: 20
    });
  }

  keepHistoryForToken(token) {
    return this.update({
      token,
      expireAt: {
        $exists: true
      }
    }, {
      $unset: {
        expireAt: 1
      }
    }, {
      multi: true
    });
  }

}

RocketChat.models.LivechatPageVisited = new LivechatPageVisited();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatTrigger.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatTrigger.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Livechat Trigger model
 */
class LivechatTrigger extends RocketChat.models._Base {
  constructor() {
    super('livechat_trigger');
  }

  updateById(_id, data) {
    return this.update({
      _id
    }, {
      $set: data
    });
  }

  removeAll() {
    return this.remove({});
  }

  findById(_id) {
    return this.find({
      _id
    });
  }

  removeById(_id) {
    return this.remove({
      _id
    });
  }

  findEnabled() {
    return this.find({
      enabled: true
    });
  }

}

RocketChat.models.LivechatTrigger = new LivechatTrigger();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"indexes.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/indexes.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.startup(function () {
  RocketChat.models.Rooms.tryEnsureIndex({
    open: 1
  }, {
    sparse: 1
  });
  RocketChat.models.Rooms.tryEnsureIndex({
    departmentId: 1
  }, {
    sparse: 1
  });
  RocketChat.models.Users.tryEnsureIndex({
    'visitorEmails.address': 1
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatInquiry.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatInquiry.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
class LivechatInquiry extends RocketChat.models._Base {
  constructor() {
    super('livechat_inquiry');
    this.tryEnsureIndex({
      rid: 1
    }); // room id corresponding to this inquiry

    this.tryEnsureIndex({
      name: 1
    }); // name of the inquiry (client name for now)

    this.tryEnsureIndex({
      message: 1
    }); // message sent by the client

    this.tryEnsureIndex({
      ts: 1
    }); // timestamp

    this.tryEnsureIndex({
      agents: 1
    }); // Id's of the agents who can see the inquiry (handle departments)

    this.tryEnsureIndex({
      status: 1
    }); // 'open', 'taken'
  }

  findOneById(inquiryId) {
    return this.findOne({
      _id: inquiryId
    });
  }
  /*
   * mark the inquiry as taken
   */


  takeInquiry(inquiryId) {
    this.update({
      _id: inquiryId
    }, {
      $set: {
        status: 'taken'
      }
    });
  }
  /*
   * mark the inquiry as closed
   */


  closeByRoomId(roomId, closeInfo) {
    return this.update({
      rid: roomId
    }, {
      $set: {
        status: 'closed',
        closer: closeInfo.closer,
        closedBy: closeInfo.closedBy,
        closedAt: closeInfo.closedAt,
        chatDuration: closeInfo.chatDuration
      }
    });
  }
  /*
   * mark inquiry as open
   */


  openInquiry(inquiryId) {
    return this.update({
      _id: inquiryId
    }, {
      $set: {
        status: 'open'
      }
    });
  }
  /*
   * mark inquiry as open and set agents
   */


  openInquiryWithAgents(inquiryId, agentIds) {
    return this.update({
      _id: inquiryId
    }, {
      $set: {
        status: 'open',
        agents: agentIds
      }
    });
  }
  /*
   * return the status of the inquiry (open or taken)
   */


  getStatus(inquiryId) {
    return this.findOne({
      _id: inquiryId
    }).status;
  }

  updateVisitorStatus(token, status) {
    const query = {
      'v.token': token,
      status: 'open'
    };
    const update = {
      $set: {
        'v.status': status
      }
    };
    return this.update(query, update);
  }

}

RocketChat.models.LivechatInquiry = new LivechatInquiry();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatOfficeHour.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatOfficeHour.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);

class LivechatOfficeHour extends RocketChat.models._Base {
  constructor() {
    super('livechat_office_hour');
    this.tryEnsureIndex({
      day: 1
    }); // the day of the week monday - sunday

    this.tryEnsureIndex({
      start: 1
    }); // the opening hours of the office

    this.tryEnsureIndex({
      finish: 1
    }); // the closing hours of the office

    this.tryEnsureIndex({
      open: 1
    }); // whether or not the offices are open on this day
    // if there is nothing in the collection, add defaults

    if (this.find().count() === 0) {
      this.insert({
        day: 'Monday',
        start: '08:00',
        finish: '20:00',
        code: 1,
        open: true
      });
      this.insert({
        day: 'Tuesday',
        start: '08:00',
        finish: '20:00',
        code: 2,
        open: true
      });
      this.insert({
        day: 'Wednesday',
        start: '08:00',
        finish: '20:00',
        code: 3,
        open: true
      });
      this.insert({
        day: 'Thursday',
        start: '08:00',
        finish: '20:00',
        code: 4,
        open: true
      });
      this.insert({
        day: 'Friday',
        start: '08:00',
        finish: '20:00',
        code: 5,
        open: true
      });
      this.insert({
        day: 'Saturday',
        start: '08:00',
        finish: '20:00',
        code: 6,
        open: false
      });
      this.insert({
        day: 'Sunday',
        start: '08:00',
        finish: '20:00',
        code: 0,
        open: false
      });
    }
  }
  /*
   * update the given days start and finish times and whether the office is open on that day
   */


  updateHours(day, newStart, newFinish, newOpen) {
    this.update({
      day
    }, {
      $set: {
        start: newStart,
        finish: newFinish,
        open: newOpen
      }
    });
  }
  /*
   * Check if the current server time (utc) is within the office hours of that day
   * returns true or false
   */


  isNowWithinHours() {
    // get current time on server in utc
    // var ct = moment().utc();
    const currentTime = moment.utc(moment().utc().format('dddd:HH:mm'), 'dddd:HH:mm'); // get todays office hours from db

    const todaysOfficeHours = this.findOne({
      day: currentTime.format('dddd')
    });

    if (!todaysOfficeHours) {
      return false;
    } // check if offices are open today


    if (todaysOfficeHours.open === false) {
      return false;
    }

    const start = moment.utc(`${todaysOfficeHours.day}:${todaysOfficeHours.start}`, 'dddd:HH:mm');
    const finish = moment.utc(`${todaysOfficeHours.day}:${todaysOfficeHours.finish}`, 'dddd:HH:mm'); // console.log(finish.isBefore(start));

    if (finish.isBefore(start)) {
      // finish.day(finish.day()+1);
      finish.add(1, 'days');
    }

    const result = currentTime.isBetween(start, finish); // inBetween  check

    return result;
  }

  isOpeningTime() {
    // get current time on server in utc
    const currentTime = moment.utc(moment().utc().format('dddd:HH:mm'), 'dddd:HH:mm'); // get todays office hours from db

    const todaysOfficeHours = this.findOne({
      day: currentTime.format('dddd')
    });

    if (!todaysOfficeHours) {
      return false;
    } // check if offices are open today


    if (todaysOfficeHours.open === false) {
      return false;
    }

    const start = moment.utc(`${todaysOfficeHours.day}:${todaysOfficeHours.start}`, 'dddd:HH:mm');
    return start.isSame(currentTime, 'minute');
  }

  isClosingTime() {
    // get current time on server in utc
    const currentTime = moment.utc(moment().utc().format('dddd:HH:mm'), 'dddd:HH:mm'); // get todays office hours from db

    const todaysOfficeHours = this.findOne({
      day: currentTime.format('dddd')
    });

    if (!todaysOfficeHours) {
      return false;
    }

    const finish = moment.utc(`${todaysOfficeHours.day}:${todaysOfficeHours.finish}`, 'dddd:HH:mm');
    return finish.isSame(currentTime, 'minute');
  }

}

RocketChat.models.LivechatOfficeHour = new LivechatOfficeHour();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatVisitors.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatVisitors.js                                                      //
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

class LivechatVisitors extends RocketChat.models._Base {
  constructor() {
    super('livechat_visitor');
  }
  /**
   * Gets visitor by token
   * @param {string} token - Visitor token
   */


  getVisitorByToken(token, options) {
    const query = {
      token
    };
    return this.findOne(query, options);
  }
  /**
   * Find visitors by _id
   * @param {string} token - Visitor token
   */


  findById(_id, options) {
    const query = {
      _id
    };
    return this.find(query, options);
  }
  /**
   * Gets visitor by token
   * @param {string} token - Visitor token
   */


  findVisitorByToken(token) {
    const query = {
      token
    };
    return this.find(query);
  }

  updateLivechatDataByToken(token, key, value, overwrite = true) {
    const query = {
      token
    };

    if (!overwrite) {
      const user = this.findOne(query, {
        fields: {
          livechatData: 1
        }
      });

      if (user.livechatData && typeof user.livechatData[key] !== 'undefined') {
        return true;
      }
    }

    const update = {
      $set: {
        [`livechatData.${key}`]: value
      }
    };
    return this.update(query, update);
  }
  /**
   * Find a visitor by their phone number
   * @return {object} User from db
   */


  findOneVisitorByPhone(phone) {
    const query = {
      'phone.phoneNumber': phone
    };
    return this.findOne(query);
  }
  /**
   * Get the next visitor name
   * @return {string} The next visitor name
   */


  getNextVisitorUsername() {
    const settingsRaw = RocketChat.models.Settings.model.rawCollection();
    const findAndModify = Meteor.wrapAsync(settingsRaw.findAndModify, settingsRaw);
    const query = {
      _id: 'Livechat_guest_count'
    };
    const update = {
      $inc: {
        value: 1
      }
    };
    const livechatCount = findAndModify(query, null, update);
    return `guest-${livechatCount.value.value + 1}`;
  }

  updateById(_id, update) {
    return this.update({
      _id
    }, update);
  }

  saveGuestById(_id, data) {
    const setData = {};
    const unsetData = {};

    if (data.name) {
      if (!_.isEmpty(s.trim(data.name))) {
        setData.name = s.trim(data.name);
      } else {
        unsetData.name = 1;
      }
    }

    if (data.email) {
      if (!_.isEmpty(s.trim(data.email))) {
        setData.visitorEmails = [{
          address: s.trim(data.email)
        }];
      } else {
        unsetData.visitorEmails = 1;
      }
    }

    if (data.phone) {
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

  findOneGuestByEmailAddress(emailAddress) {
    const query = {
      'visitorEmails.address': new RegExp(`^${s.escapeRegExp(emailAddress)}$`, 'i')
    };
    return this.findOne(query);
  }

  saveGuestEmailPhoneById(_id, emails, phones) {
    const update = {
      $addToSet: {}
    };
    const saveEmail = [].concat(emails).filter(email => email && email.trim()).map(email => ({
      address: email
    }));

    if (saveEmail.length > 0) {
      update.$addToSet.visitorEmails = {
        $each: saveEmail
      };
    }

    const savePhone = [].concat(phones).filter(phone => phone && phone.trim().replace(/[^\d]/g, '')).map(phone => ({
      phoneNumber: phone
    }));

    if (savePhone.length > 0) {
      update.$addToSet.phone = {
        $each: savePhone
      };
    }

    if (!update.$addToSet.visitorEmails && !update.$addToSet.phone) {
      return;
    }

    return this.update({
      _id
    }, update);
  }

}

module.exportDefault(new LivechatVisitors());
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lib":{"Livechat.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/lib/Livechat.js                                                                 //
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
let UAParser;
module.watch(require("ua-parser-js"), {
  default(v) {
    UAParser = v;
  }

}, 2);
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 3);
RocketChat.Livechat = {
  historyMonitorType: 'url',
  logger: new Logger('Livechat', {
    sections: {
      webhook: 'Webhook'
    }
  }),

  getNextAgent(department) {
    if (RocketChat.settings.get('Livechat_Routing_Method') === 'External') {
      for (let i = 0; i < 10; i++) {
        try {
          const queryString = department ? `?departmentId=${department}` : '';
          const result = HTTP.call('GET', `${RocketChat.settings.get('Livechat_External_Queue_URL')}${queryString}`, {
            headers: {
              'User-Agent': 'RocketChat Server',
              Accept: 'application/json',
              'X-RocketChat-Secret-Token': RocketChat.settings.get('Livechat_External_Queue_Token')
            }
          });

          if (result && result.data && result.data.username) {
            const agent = RocketChat.models.Users.findOneOnlineAgentByUsername(result.data.username);

            if (agent) {
              return {
                agentId: agent._id,
                username: agent.username
              };
            }
          }
        } catch (e) {
          console.error('Error requesting agent from external queue.', e);
          break;
        }
      }

      throw new Meteor.Error('no-agent-online', 'Sorry, no online agents');
    } else if (department) {
      return RocketChat.models.LivechatDepartmentAgents.getNextAgentForDepartment(department);
    }

    return RocketChat.models.Users.getNextAgent();
  },

  getAgents(department) {
    if (department) {
      return RocketChat.models.LivechatDepartmentAgents.findByDepartmentId(department);
    } else {
      return RocketChat.models.Users.findAgents();
    }
  },

  getOnlineAgents(department) {
    if (department) {
      return RocketChat.models.LivechatDepartmentAgents.getOnlineForDepartment(department);
    } else {
      return RocketChat.models.Users.findOnlineAgents();
    }
  },

  getRequiredDepartment(onlineRequired = true) {
    const departments = RocketChat.models.LivechatDepartment.findEnabledWithAgents();
    return departments.fetch().find(dept => {
      if (!dept.showOnRegistration) {
        return false;
      }

      if (!onlineRequired) {
        return true;
      }

      const onlineAgents = RocketChat.models.LivechatDepartmentAgents.getOnlineForDepartment(dept._id);
      return onlineAgents.count() > 0;
    });
  },

  getRoom(guest, message, roomInfo, agent) {
    let room = RocketChat.models.Rooms.findOneById(message.rid);
    let newRoom = false;

    if (room && !room.open) {
      message.rid = Random.id();
      room = null;
    }

    if (room == null) {
      // if no department selected verify if there is at least one active and pick the first
      if (!agent && !guest.department) {
        const department = this.getRequiredDepartment();

        if (department) {
          guest.department = department._id;
        }
      } // delegate room creation to QueueMethods


      const routingMethod = RocketChat.settings.get('Livechat_Routing_Method');
      room = RocketChat.QueueMethods[routingMethod](guest, message, roomInfo, agent);
      newRoom = true;
    }

    if (!room || room.v.token !== guest.token) {
      throw new Meteor.Error('cannot-access-room');
    }

    if (newRoom) {
      RocketChat.models.Messages.setRoomIdByToken(guest.token, room._id);
    }

    return {
      room,
      newRoom
    };
  },

  sendMessage({
    guest,
    message,
    roomInfo,
    agent
  }) {
    const {
      room,
      newRoom
    } = this.getRoom(guest, message, roomInfo, agent);

    if (guest.name) {
      message.alias = guest.name;
    } // return messages;


    return _.extend(RocketChat.sendMessage(guest, message, room), {
      newRoom,
      showConnecting: this.showConnecting()
    });
  },

  registerGuest({
    token,
    name,
    email,
    department,
    phone,
    username
  } = {}) {
    check(token, String);
    let userId;
    const updateUser = {
      $set: {
        token
      }
    };
    const user = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        _id: 1
      }
    });

    if (user) {
      userId = user._id;
    } else {
      if (!username) {
        username = LivechatVisitors.getNextVisitorUsername();
      }

      let existingUser = null;

      if (s.trim(email) !== '' && (existingUser = LivechatVisitors.findOneGuestByEmailAddress(email))) {
        userId = existingUser._id;
      } else {
        const userData = {
          username
        };

        if (this.connection) {
          userData.userAgent = this.connection.httpHeaders['user-agent'];
          userData.ip = this.connection.httpHeaders['x-real-ip'] || this.connection.httpHeaders['x-forwarded-for'] || this.connection.clientAddress;
          userData.host = this.connection.httpHeaders.host;
        }

        userId = LivechatVisitors.insert(userData);
      }
    }

    if (phone) {
      updateUser.$set.phone = [{
        phoneNumber: phone.number
      }];
    }

    if (email && email.trim() !== '') {
      updateUser.$set.visitorEmails = [{
        address: email
      }];
    }

    if (name) {
      updateUser.$set.name = name;
    }

    if (department) {
      updateUser.$set.department = department;
    }

    LivechatVisitors.updateById(userId, updateUser);
    return userId;
  },

  setDepartmentForGuest({
    token,
    department
  } = {}) {
    check(token, String);
    const updateUser = {
      $set: {
        department
      }
    };
    const user = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        _id: 1
      }
    });

    if (user) {
      return LivechatVisitors.updateById(user._id, updateUser);
    }

    return false;
  },

  saveGuest({
    _id,
    name,
    email,
    phone
  }) {
    const updateData = {};

    if (name) {
      updateData.name = name;
    }

    if (email) {
      updateData.email = email;
    }

    if (phone) {
      updateData.phone = phone;
    }

    const ret = LivechatVisitors.saveGuestById(_id, updateData);
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.saveGuest', updateData);
    });
    return ret;
  },

  closeRoom({
    user,
    visitor,
    room,
    comment
  }) {
    const now = new Date();
    const closeData = {
      closedAt: now,
      chatDuration: (now.getTime() - room.ts) / 1000
    };

    if (user) {
      closeData.closer = 'user';
      closeData.closedBy = {
        _id: user._id,
        username: user.username
      };
    } else if (visitor) {
      closeData.closer = 'visitor';
      closeData.closedBy = {
        _id: visitor._id,
        username: visitor.username
      };
    }

    RocketChat.models.Rooms.closeByRoomId(room._id, closeData);
    RocketChat.models.LivechatInquiry.closeByRoomId(room._id, closeData);
    const message = {
      t: 'livechat-close',
      msg: comment,
      groupable: false
    };
    RocketChat.sendMessage(user, message, room);

    if (room.servedBy) {
      RocketChat.models.Subscriptions.hideByRoomIdAndUserId(room._id, room.servedBy._id);
    }

    RocketChat.models.Messages.createCommandWithRoomIdAndUser('promptTranscript', room._id, closeData.closedBy);
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.closeRoom', room);
    });
    return true;
  },

  getInitSettings() {
    const settings = {};
    RocketChat.models.Settings.findNotHiddenPublic(['Livechat_title', 'Livechat_title_color', 'Livechat_enabled', 'Livechat_registration_form', 'Livechat_allow_switching_departments', 'Livechat_offline_title', 'Livechat_offline_title_color', 'Livechat_offline_message', 'Livechat_offline_success_message', 'Livechat_offline_form_unavailable', 'Livechat_display_offline_form', 'Livechat_videocall_enabled', 'Jitsi_Enabled', 'Language', 'Livechat_enable_transcript', 'Livechat_transcript_message', 'Livechat_fileupload_enabled', 'FileUpload_Enabled', 'Livechat_conversation_finished_message', 'Livechat_name_field_registration_form', 'Livechat_email_field_registration_form']).forEach(setting => {
      settings[setting._id] = setting.value;
    });
    return settings;
  },

  saveRoomInfo(roomData, guestData) {
    if ((roomData.topic != null || roomData.tags != null) && !RocketChat.models.Rooms.setTopicAndTagsById(roomData._id, roomData.topic, roomData.tags)) {
      return false;
    }

    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.saveRoom', roomData);
    });

    if (!_.isEmpty(guestData.name)) {
      return RocketChat.models.Rooms.setFnameById(roomData._id, guestData.name) && RocketChat.models.Subscriptions.updateDisplayNameByRoomId(roomData._id, guestData.name);
    }
  },

  closeOpenChats(userId, comment) {
    const user = RocketChat.models.Users.findOneById(userId);
    RocketChat.models.Rooms.findOpenByAgent(userId).forEach(room => {
      this.closeRoom({
        user,
        room,
        comment
      });
    });
  },

  forwardOpenChats(userId) {
    RocketChat.models.Rooms.findOpenByAgent(userId).forEach(room => {
      const guest = LivechatVisitors.findOneById(room.v._id);
      this.transfer(room, guest, {
        departmentId: guest.department
      });
    });
  },

  savePageHistory(token, roomId, pageInfo) {
    if (pageInfo.change === RocketChat.Livechat.historyMonitorType) {
      const user = RocketChat.models.Users.findOneById('rocket.cat');
      const pageTitle = pageInfo.title;
      const pageUrl = pageInfo.location.href;
      const extraData = {
        navigation: {
          page: pageInfo,
          token
        }
      };

      if (!roomId) {
        // keep history of unregistered visitors for 1 month
        const keepHistoryMiliseconds = 2592000000;
        extraData.expireAt = new Date().getTime() + keepHistoryMiliseconds;
      }

      if (!RocketChat.settings.get('Livechat_Visitor_navigation_as_a_message')) {
        extraData._hidden = true;
      }

      return RocketChat.models.Messages.createNavigationHistoryWithRoomIdMessageAndUser(roomId, `${pageTitle} - ${pageUrl}`, user, extraData);
    }

    return;
  },

  transfer(room, guest, transferData) {
    let agent;

    if (transferData.userId) {
      const user = RocketChat.models.Users.findOneById(transferData.userId);
      agent = {
        agentId: user._id,
        username: user.username
      };
    } else if (RocketChat.settings.get('Livechat_Routing_Method') !== 'Guest_Pool') {
      agent = RocketChat.Livechat.getNextAgent(transferData.departmentId);
    } else {
      return RocketChat.Livechat.returnRoomAsInquiry(room._id, transferData.departmentId);
    }

    const {
      servedBy
    } = room;

    if (agent && agent.agentId !== servedBy._id) {
      RocketChat.models.Rooms.changeAgentByRoomId(room._id, agent);

      if (transferData.departmentId) {
        RocketChat.models.Rooms.changeDepartmentIdByRoomId(room._id, transferData.departmentId);
      }

      const subscriptionData = {
        rid: room._id,
        name: guest.name || guest.username,
        alert: true,
        open: true,
        unread: 1,
        userMentions: 1,
        groupMentions: 0,
        u: {
          _id: agent.agentId,
          username: agent.username
        },
        t: 'l',
        desktopNotifications: 'all',
        mobilePushNotifications: 'all',
        emailNotifications: 'all'
      };
      RocketChat.models.Subscriptions.removeByRoomIdAndUserId(room._id, servedBy._id);
      RocketChat.models.Subscriptions.insert(subscriptionData);
      RocketChat.models.Rooms.incUsersCountById(room._id);
      RocketChat.models.Messages.createUserLeaveWithRoomIdAndUser(room._id, {
        _id: servedBy._id,
        username: servedBy.username
      });
      RocketChat.models.Messages.createUserJoinWithRoomIdAndUser(room._id, {
        _id: agent.agentId,
        username: agent.username
      });
      const guestData = {
        token: guest.token,
        department: transferData.departmentId
      };
      this.setDepartmentForGuest(guestData);
      RocketChat.Livechat.stream.emit(room._id, {
        type: 'agentData',
        data: RocketChat.models.Users.getAgentInfo(agent.agentId)
      });
      return true;
    }

    return false;
  },

  returnRoomAsInquiry(rid, departmentId) {
    const room = RocketChat.models.Rooms.findOneById(rid);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'livechat:returnRoomAsInquiry'
      });
    }

    if (!room.servedBy) {
      return false;
    }

    const user = RocketChat.models.Users.findOne(room.servedBy._id);

    if (!user || !user._id) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:returnRoomAsInquiry'
      });
    }

    const agentIds = []; // get the agents of the department

    if (departmentId) {
      let agents = RocketChat.Livechat.getOnlineAgents(departmentId);

      if (agents.count() === 0 && RocketChat.settings.get('Livechat_guest_pool_with_no_agents')) {
        agents = RocketChat.Livechat.getAgents(departmentId);
      }

      if (agents.count() === 0) {
        return false;
      }

      agents.forEach(agent => {
        agentIds.push(agent.agentId);
      });
      RocketChat.models.Rooms.changeDepartmentIdByRoomId(room._id, departmentId);
    } // delete agent and room subscription


    RocketChat.models.Subscriptions.removeByRoomId(rid); // remove agent from room

    RocketChat.models.Rooms.removeAgentByRoomId(rid); // find inquiry corresponding to room

    const inquiry = RocketChat.models.LivechatInquiry.findOne({
      rid
    });

    if (!inquiry) {
      return false;
    }

    let openInq; // mark inquiry as open

    if (agentIds.length === 0) {
      openInq = RocketChat.models.LivechatInquiry.openInquiry(inquiry._id);
    } else {
      openInq = RocketChat.models.LivechatInquiry.openInquiryWithAgents(inquiry._id, agentIds);
    }

    if (openInq) {
      RocketChat.models.Messages.createUserLeaveWithRoomIdAndUser(rid, {
        _id: room.servedBy._id,
        username: room.servedBy.username
      });
      RocketChat.Livechat.stream.emit(rid, {
        type: 'agentData',
        data: null
      });
    }

    return openInq;
  },

  sendRequest(postData, callback, trying = 1) {
    try {
      const options = {
        headers: {
          'X-RocketChat-Livechat-Token': RocketChat.settings.get('Livechat_secret_token')
        },
        data: postData
      };
      return HTTP.post(RocketChat.settings.get('Livechat_webhookUrl'), options);
    } catch (e) {
      RocketChat.Livechat.logger.webhook.error(`Response error on ${trying} try ->`, e); // try 10 times after 10 seconds each

      if (trying < 10) {
        RocketChat.Livechat.logger.webhook.warn('Will try again in 10 seconds ...');
        trying++;
        setTimeout(Meteor.bindEnvironment(() => {
          RocketChat.Livechat.sendRequest(postData, callback, trying);
        }), 10000);
      }
    }
  },

  getLivechatRoomGuestInfo(room) {
    const visitor = LivechatVisitors.findOneById(room.v._id);
    const agent = RocketChat.models.Users.findOneById(room.servedBy && room.servedBy._id);
    const ua = new UAParser();
    ua.setUA(visitor.userAgent);
    const postData = {
      _id: room._id,
      label: room.fname || room.label,
      // using same field for compatibility
      topic: room.topic,
      createdAt: room.ts,
      lastMessageAt: room.lm,
      tags: room.tags,
      customFields: room.livechatData,
      visitor: {
        _id: visitor._id,
        token: visitor.token,
        name: visitor.name,
        username: visitor.username,
        email: null,
        phone: null,
        department: visitor.department,
        ip: visitor.ip,
        os: ua.getOS().name && `${ua.getOS().name} ${ua.getOS().version}`,
        browser: ua.getBrowser().name && `${ua.getBrowser().name} ${ua.getBrowser().version}`,
        customFields: visitor.livechatData
      }
    };

    if (agent) {
      postData.agent = {
        _id: agent._id,
        username: agent.username,
        name: agent.name,
        email: null
      };

      if (agent.emails && agent.emails.length > 0) {
        postData.agent.email = agent.emails[0].address;
      }
    }

    if (room.crmData) {
      postData.crmData = room.crmData;
    }

    if (visitor.visitorEmails && visitor.visitorEmails.length > 0) {
      postData.visitor.email = visitor.visitorEmails;
    }

    if (visitor.phone && visitor.phone.length > 0) {
      postData.visitor.phone = visitor.phone;
    }

    return postData;
  },

  addAgent(username) {
    check(username, String);
    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1,
        username: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:addAgent'
      });
    }

    if (RocketChat.authz.addUserRoles(user._id, 'livechat-agent')) {
      RocketChat.models.Users.setOperator(user._id, true);
      RocketChat.models.Users.setLivechatStatus(user._id, 'available');
      return user;
    }

    return false;
  },

  addManager(username) {
    check(username, String);
    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1,
        username: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:addManager'
      });
    }

    if (RocketChat.authz.addUserRoles(user._id, 'livechat-manager')) {
      return user;
    }

    return false;
  },

  removeAgent(username) {
    check(username, String);
    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:removeAgent'
      });
    }

    if (RocketChat.authz.removeUserFromRoles(user._id, 'livechat-agent')) {
      RocketChat.models.Users.setOperator(user._id, false);
      RocketChat.models.Users.setLivechatStatus(user._id, 'not-available');
      return true;
    }

    return false;
  },

  removeManager(username) {
    check(username, String);
    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:removeManager'
      });
    }

    return RocketChat.authz.removeUserFromRoles(user._id, 'livechat-manager');
  },

  saveDepartment(_id, departmentData, departmentAgents) {
    check(_id, Match.Maybe(String));
    check(departmentData, {
      enabled: Boolean,
      name: String,
      description: Match.Optional(String),
      showOnRegistration: Boolean
    });
    check(departmentAgents, [Match.ObjectIncluding({
      agentId: String,
      username: String
    })]);

    if (_id) {
      const department = RocketChat.models.LivechatDepartment.findOneById(_id);

      if (!department) {
        throw new Meteor.Error('error-department-not-found', 'Department not found', {
          method: 'livechat:saveDepartment'
        });
      }
    }

    return RocketChat.models.LivechatDepartment.createOrUpdateDepartment(_id, departmentData, departmentAgents);
  },

  removeDepartment(_id) {
    check(_id, String);
    const department = RocketChat.models.LivechatDepartment.findOneById(_id, {
      fields: {
        _id: 1
      }
    });

    if (!department) {
      throw new Meteor.Error('department-not-found', 'Department not found', {
        method: 'livechat:removeDepartment'
      });
    }

    return RocketChat.models.LivechatDepartment.removeById(_id);
  },

  showConnecting() {
    if (RocketChat.settings.get('Livechat_Routing_Method') === 'Guest_Pool') {
      return RocketChat.settings.get('Livechat_open_inquiery_show_connecting');
    } else {
      return false;
    }
  }

};
RocketChat.Livechat.stream = new Meteor.Streamer('livechat-room');
RocketChat.Livechat.stream.allowRead((roomId, extraData) => {
  const room = RocketChat.models.Rooms.findOneById(roomId);

  if (!room) {
    console.warn(`Invalid eventName: "${roomId}"`);
    return false;
  }

  if (room.t === 'l' && extraData && extraData.visitorToken && room.v.token === extraData.visitorToken) {
    return true;
  }

  return false;
});
RocketChat.settings.get('Livechat_history_monitor_type', (key, value) => {
  RocketChat.Livechat.historyMonitorType = value;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"QueueMethods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/lib/QueueMethods.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
RocketChat.QueueMethods = {
  /* Least Amount Queuing method:
   *
   * default method where the agent with the least number
   * of open chats is paired with the incoming livechat
   */
  'Least_Amount'(guest, message, roomInfo, agent) {
    if (!agent) {
      agent = RocketChat.Livechat.getNextAgent(guest.department);

      if (!agent) {
        throw new Meteor.Error('no-agent-online', 'Sorry, no online agents');
      }
    }

    RocketChat.models.Rooms.updateLivechatRoomCount();

    const room = _.extend({
      _id: message.rid,
      msgs: 0,
      usersCount: 1,
      lm: new Date(),
      fname: roomInfo && roomInfo.fname || guest.name || guest.username,
      // usernames: [agent.username, guest.username],
      t: 'l',
      ts: new Date(),
      v: {
        _id: guest._id,
        username: guest.username,
        token: message.token,
        status: guest.status || 'online'
      },
      servedBy: {
        _id: agent.agentId,
        username: agent.username
      },
      cl: false,
      open: true,
      waitingResponse: true
    }, roomInfo);

    const subscriptionData = {
      rid: message.rid,
      fname: guest.name || guest.username,
      alert: true,
      open: true,
      unread: 1,
      userMentions: 1,
      groupMentions: 0,
      u: {
        _id: agent.agentId,
        username: agent.username
      },
      t: 'l',
      desktopNotifications: 'all',
      mobilePushNotifications: 'all',
      emailNotifications: 'all'
    };

    if (guest.department) {
      room.departmentId = guest.department;
    }

    RocketChat.models.Rooms.insert(room);
    RocketChat.models.Subscriptions.insert(subscriptionData);
    RocketChat.Livechat.stream.emit(room._id, {
      type: 'agentData',
      data: RocketChat.models.Users.getAgentInfo(agent.agentId)
    });
    return room;
  },

  /* Guest Pool Queuing Method:
   *
   * An incomming livechat is created as an Inquiry
   * which is picked up from an agent.
   * An Inquiry is visible to all agents (TODO: in the correct department)
      *
   * A room is still created with the initial message, but it is occupied by
   * only the client until paired with an agent
   */
  'Guest_Pool'(guest, message, roomInfo) {
    let agents = RocketChat.Livechat.getOnlineAgents(guest.department);

    if (agents.count() === 0 && RocketChat.settings.get('Livechat_guest_pool_with_no_agents')) {
      agents = RocketChat.Livechat.getAgents(guest.department);
    }

    if (agents.count() === 0) {
      throw new Meteor.Error('no-agent-online', 'Sorry, no online agents');
    }

    RocketChat.models.Rooms.updateLivechatRoomCount();
    const agentIds = [];
    agents.forEach(agent => {
      if (guest.department) {
        agentIds.push(agent.agentId);
      } else {
        agentIds.push(agent._id);
      }
    });
    const inquiry = {
      rid: message.rid,
      message: message.msg,
      name: guest.name || guest.username,
      ts: new Date(),
      department: guest.department,
      agents: agentIds,
      status: 'open',
      v: {
        _id: guest._id,
        username: guest.username,
        token: message.token,
        status: guest.status || 'online'
      },
      t: 'l'
    };

    const room = _.extend({
      _id: message.rid,
      msgs: 0,
      usersCount: 0,
      lm: new Date(),
      fname: guest.name || guest.username,
      // usernames: [guest.username],
      t: 'l',
      ts: new Date(),
      v: {
        _id: guest._id,
        username: guest.username,
        token: message.token,
        status: guest.status
      },
      cl: false,
      open: true,
      waitingResponse: true
    }, roomInfo);

    if (guest.department) {
      room.departmentId = guest.department;
    }

    RocketChat.models.LivechatInquiry.insert(inquiry);
    RocketChat.models.Rooms.insert(room);
    return room;
  },

  'External'(guest, message, roomInfo, agent) {
    return this['Least_Amount'](guest, message, roomInfo, agent); // eslint-disable-line
  }

};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"OfficeClock.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/lib/OfficeClock.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Every minute check if office closed
Meteor.setInterval(function () {
  if (RocketChat.settings.get('Livechat_enable_office_hours')) {
    if (RocketChat.models.LivechatOfficeHour.isOpeningTime()) {
      RocketChat.models.Users.openOffice();
    } else if (RocketChat.models.LivechatOfficeHour.isClosingTime()) {
      RocketChat.models.Users.closeOffice();
    }
  }
}, 60000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"OmniChannel.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/lib/OmniChannel.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const gatewayURL = 'https://omni.rocket.chat';
module.exportDefault({
  enable() {
    const result = HTTP.call('POST', `${gatewayURL}/facebook/enable`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`,
        'content-type': 'application/json'
      },
      data: {
        url: RocketChat.settings.get('Site_Url')
      }
    });
    return result.data;
  },

  disable() {
    const result = HTTP.call('DELETE', `${gatewayURL}/facebook/enable`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`,
        'content-type': 'application/json'
      }
    });
    return result.data;
  },

  listPages() {
    const result = HTTP.call('GET', `${gatewayURL}/facebook/pages`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      }
    });
    return result.data;
  },

  subscribe(pageId) {
    const result = HTTP.call('POST', `${gatewayURL}/facebook/page/${pageId}/subscribe`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      }
    });
    return result.data;
  },

  unsubscribe(pageId) {
    const result = HTTP.call('DELETE', `${gatewayURL}/facebook/page/${pageId}/subscribe`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      }
    });
    return result.data;
  },

  reply({
    page,
    token,
    text
  }) {
    return HTTP.call('POST', `${gatewayURL}/facebook/reply`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      },
      data: {
        page,
        token,
        text
      }
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"sendMessageBySMS.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/sendMessageBySMS.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("./models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // skips this callback if the message was edited
  if (message.editedAt) {
    return message;
  }

  if (!RocketChat.SMS.enabled) {
    return message;
  } // only send the sms by SMS if it is a livechat room with SMS set to true


  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.sms && room.v && room.v.token)) {
    return message;
  } // if the message has a token, it was sent from the visitor, so ignore it


  if (message.token) {
    return message;
  } // if the message has a type means it is a special message (like the closing comment), so skips


  if (message.t) {
    return message;
  }

  const SMSService = RocketChat.SMS.getService(RocketChat.settings.get('SMS_Service'));

  if (!SMSService) {
    return message;
  }

  const visitor = LivechatVisitors.getVisitorByToken(room.v.token);

  if (!visitor || !visitor.phone || visitor.phone.length === 0) {
    return message;
  }

  SMSService.send(room.sms.from, visitor.phone[0].phoneNumber, message.msg);
  return message;
}, RocketChat.callbacks.priority.LOW, 'sendMessageBySms');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unclosedLivechats.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/unclosedLivechats.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals UserPresenceMonitor */
let agentsHandler;
let monitorAgents = false;
let actionTimeout = 60000;
const onlineAgents = {
  users: {},
  queue: {},

  add(userId) {
    if (this.queue[userId]) {
      clearTimeout(this.queue[userId]);
      delete this.queue[userId];
    }

    this.users[userId] = 1;
  },

  remove(userId, callback) {
    if (this.queue[userId]) {
      clearTimeout(this.queue[userId]);
    }

    this.queue[userId] = setTimeout(Meteor.bindEnvironment(() => {
      callback();
      delete this.users[userId];
      delete this.queue[userId];
    }), actionTimeout);
  },

  exists(userId) {
    return !!this.users[userId];
  }

};

function runAgentLeaveAction(userId) {
  const action = RocketChat.settings.get('Livechat_agent_leave_action');

  if (action === 'close') {
    return RocketChat.Livechat.closeOpenChats(userId, RocketChat.settings.get('Livechat_agent_leave_comment'));
  } else if (action === 'forward') {
    return RocketChat.Livechat.forwardOpenChats(userId);
  }
}

RocketChat.settings.get('Livechat_agent_leave_action_timeout', function (key, value) {
  actionTimeout = value * 1000;
});
RocketChat.settings.get('Livechat_agent_leave_action', function (key, value) {
  monitorAgents = value;

  if (value !== 'none') {
    if (!agentsHandler) {
      agentsHandler = RocketChat.models.Users.findOnlineAgents().observeChanges({
        added(id) {
          onlineAgents.add(id);
        },

        changed(id, fields) {
          if (fields.statusLivechat && fields.statusLivechat === 'not-available') {
            onlineAgents.remove(id, () => {
              runAgentLeaveAction(id);
            });
          } else {
            onlineAgents.add(id);
          }
        },

        removed(id) {
          onlineAgents.remove(id, () => {
            runAgentLeaveAction(id);
          });
        }

      });
    }
  } else if (agentsHandler) {
    agentsHandler.stop();
    agentsHandler = null;
  }
});
UserPresenceMonitor.onSetUserStatus((user, status
/* , statusConnection*/
) => {
  if (!monitorAgents) {
    return;
  }

  if (onlineAgents.exists(user._id)) {
    if (status === 'offline' || user.statusLivechat === 'not-available') {
      onlineAgents.remove(user._id, () => {
        runAgentLeaveAction(user._id);
      });
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications":{"customFields.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/customFields.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
Meteor.publish('livechat:customFields', function (_id) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:customFields'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:customFields'
    }));
  }

  if (s.trim(_id)) {
    return RocketChat.models.LivechatCustomField.find({
      _id
    });
  }

  return RocketChat.models.LivechatCustomField.find();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"departmentAgents.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/departmentAgents.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:departmentAgents', function (departmentId) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:departmentAgents'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-rooms')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:departmentAgents'
    }));
  }

  return RocketChat.models.LivechatDepartmentAgents.find({
    departmentId
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"externalMessages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/externalMessages.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:externalMessages', function (roomId) {
  return RocketChat.models.LivechatExternalMessage.findByRoomId(roomId);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatAgents.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatAgents.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:agents', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  const self = this;
  const handle = RocketChat.authz.getUsersInRole('livechat-agent').observeChanges({
    added(id, fields) {
      self.added('agentUsers', id, fields);
    },

    changed(id, fields) {
      self.changed('agentUsers', id, fields);
    },

    removed(id) {
      self.removed('agentUsers', id);
    }

  });
  self.ready();
  self.onStop(function () {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatAppearance.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatAppearance.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:appearance', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:appearance'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:appearance'
    }));
  }

  const query = {
    _id: {
      $in: ['Livechat_title', 'Livechat_title_color', 'Livechat_show_agent_email', 'Livechat_display_offline_form', 'Livechat_offline_form_unavailable', 'Livechat_offline_message', 'Livechat_offline_success_message', 'Livechat_offline_title', 'Livechat_offline_title_color', 'Livechat_offline_email', 'Livechat_conversation_finished_message', 'Livechat_registration_form', 'Livechat_name_field_registration_form', 'Livechat_email_field_registration_form']
    }
  };
  const self = this;
  const handle = RocketChat.models.Settings.find(query).observeChanges({
    added(id, fields) {
      self.added('livechatAppearance', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatAppearance', id, fields);
    },

    removed(id) {
      self.removed('livechatAppearance', id);
    }

  });
  this.ready();
  this.onStop(() => {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatDepartments.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatDepartments.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:departments', function (_id) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  if (_id !== undefined) {
    return RocketChat.models.LivechatDepartment.findByDepartmentId(_id);
  } else {
    return RocketChat.models.LivechatDepartment.find();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatIntegration.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatIntegration.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:integration', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:integration'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:integration'
    }));
  }

  const self = this;
  const handle = RocketChat.models.Settings.findByIds(['Livechat_webhookUrl', 'Livechat_secret_token', 'Livechat_webhook_on_close', 'Livechat_webhook_on_offline_msg', 'Livechat_webhook_on_visitor_message', 'Livechat_webhook_on_agent_message']).observeChanges({
    added(id, fields) {
      self.added('livechatIntegration', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatIntegration', id, fields);
    },

    removed(id) {
      self.removed('livechatIntegration', id);
    }

  });
  self.ready();
  self.onStop(function () {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatManagers.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatManagers.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:managers', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:managers'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-rooms')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:managers'
    }));
  }

  const self = this;
  const handle = RocketChat.authz.getUsersInRole('livechat-manager').observeChanges({
    added(id, fields) {
      self.added('managerUsers', id, fields);
    },

    changed(id, fields) {
      self.changed('managerUsers', id, fields);
    },

    removed(id) {
      self.removed('managerUsers', id);
    }

  });
  self.ready();
  self.onStop(function () {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatRooms.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatRooms.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:rooms', function (filter = {}, offset = 0, limit = 20) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:rooms'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-rooms')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:rooms'
    }));
  }

  check(filter, {
    name: Match.Maybe(String),
    // room name to filter
    agent: Match.Maybe(String),
    // agent _id who is serving
    status: Match.Maybe(String),
    // either 'opened' or 'closed'
    from: Match.Maybe(Date),
    to: Match.Maybe(Date)
  });
  const query = {};

  if (filter.name) {
    query.label = new RegExp(filter.name, 'i');
  }

  if (filter.agent) {
    query['servedBy._id'] = filter.agent;
  }

  if (filter.status) {
    if (filter.status === 'opened') {
      query.open = true;
    } else {
      query.open = {
        $exists: false
      };
    }
  }

  if (filter.from) {
    query.ts = {
      $gte: filter.from
    };
  }

  if (filter.to) {
    filter.to.setDate(filter.to.getDate() + 1);
    filter.to.setSeconds(filter.to.getSeconds() - 1);

    if (!query.ts) {
      query.ts = {};
    }

    query.ts.$lte = filter.to;
  }

  const self = this;
  const handle = RocketChat.models.Rooms.findLivechat(query, offset, limit).observeChanges({
    added(id, fields) {
      self.added('livechatRoom', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatRoom', id, fields);
    },

    removed(id) {
      self.removed('livechatRoom', id);
    }

  });
  this.ready();
  this.onStop(() => {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatQueue.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatQueue.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:queue', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:queue'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:queue'
    }));
  } // let sort = { count: 1, sort: 1, username: 1 };
  // let onlineUsers = {};
  // let handleUsers = RocketChat.models.Users.findOnlineAgents().observeChanges({
  // 	added(id, fields) {
  // 		onlineUsers[fields.username] = 1;
  // 		// this.added('livechatQueueUser', id, fields);
  // 	},
  // 	changed(id, fields) {
  // 		onlineUsers[fields.username] = 1;
  // 		// this.changed('livechatQueueUser', id, fields);
  // 	},
  // 	removed(id) {
  // 		this.removed('livechatQueueUser', id);
  // 	}
  // });


  const self = this;
  const handleDepts = RocketChat.models.LivechatDepartmentAgents.findUsersInQueue().observeChanges({
    added(id, fields) {
      self.added('livechatQueueUser', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatQueueUser', id, fields);
    },

    removed(id) {
      self.removed('livechatQueueUser', id);
    }

  });
  this.ready();
  this.onStop(() => {
    // handleUsers.stop();
    handleDepts.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatTriggers.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatTriggers.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:triggers', function (_id) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:triggers'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:triggers'
    }));
  }

  if (_id !== undefined) {
    return RocketChat.models.LivechatTrigger.findById(_id);
  } else {
    return RocketChat.models.LivechatTrigger.find();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitorHistory.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/visitorHistory.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:visitorHistory', function ({
  rid: roomId
}) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorHistory'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorHistory'
    }));
  }

  const room = RocketChat.models.Rooms.findOneById(roomId);
  const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, this.userId, {
    fields: {
      _id: 1
    }
  });

  if (!subscription) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorHistory'
    }));
  }

  const self = this;

  if (room && room.v && room.v._id) {
    const handle = RocketChat.models.Rooms.findByVisitorId(room.v._id).observeChanges({
      added(id, fields) {
        self.added('visitor_history', id, fields);
      },

      changed(id, fields) {
        self.changed('visitor_history', id, fields);
      },

      removed(id) {
        self.removed('visitor_history', id);
      }

    });
    self.ready();
    self.onStop(function () {
      handle.stop();
    });
  } else {
    self.ready();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitorInfo.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/visitorInfo.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.publish('livechat:visitorInfo', function ({
  rid: roomId
}) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorInfo'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorInfo'
    }));
  }

  const room = RocketChat.models.Rooms.findOneById(roomId);

  if (room && room.v && room.v._id) {
    return LivechatVisitors.findById(room.v._id);
  } else {
    return this.ready();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitorPageVisited.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/visitorPageVisited.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:visitorPageVisited', function ({
  rid: roomId
}) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorPageVisited'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorPageVisited'
    }));
  }

  const self = this;
  const room = RocketChat.models.Rooms.findOneById(roomId);

  if (room) {
    const handle = RocketChat.models.Messages.findByRoomIdAndType(room._id, 'livechat_navigation_history').observeChanges({
      added(id, fields) {
        self.added('visitor_navigation_history', id, fields);
      },

      changed(id, fields) {
        self.changed('visitor_navigation_history', id, fields);
      },

      removed(id) {
        self.removed('visitor_navigation_history', id);
      }

    });
    self.ready();
    self.onStop(function () {
      handle.stop();
    });
  } else {
    self.ready();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatInquiries.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatInquiries.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:inquiry', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:inquiry'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:inquiry'
    }));
  }

  const query = {
    agents: this.userId,
    status: 'open'
  };
  return RocketChat.models.LivechatInquiry.find(query);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatOfficeHours.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatOfficeHours.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:officeHour', function () {
  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  return RocketChat.models.LivechatOfficeHour.find();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"api.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("../imports/server/rest/departments.js"));
module.watch(require("../imports/server/rest/facebook.js"));
module.watch(require("../imports/server/rest/sms.js"));
module.watch(require("../imports/server/rest/users.js"));
module.watch(require("../imports/server/rest/messages.js"));
module.watch(require("../imports/server/rest/visitors.js"));
module.watch(require("../imports/server/rest/upload.js"));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"permissions.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/permissions.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.startup(() => {
  const roles = _.pluck(RocketChat.models.Roles.find().fetch(), 'name');

  if (roles.indexOf('livechat-agent') === -1) {
    RocketChat.models.Roles.createOrUpdate('livechat-agent');
  }

  if (roles.indexOf('livechat-manager') === -1) {
    RocketChat.models.Roles.createOrUpdate('livechat-manager');
  }

  if (roles.indexOf('livechat-guest') === -1) {
    RocketChat.models.Roles.createOrUpdate('livechat-guest');
  }

  if (RocketChat.models && RocketChat.models.Permissions) {
    RocketChat.models.Permissions.createOrUpdate('view-l-room', ['livechat-agent', 'livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('view-livechat-manager', ['livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('view-livechat-rooms', ['livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('close-livechat-room', ['livechat-agent', 'livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('close-others-livechat-room', ['livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('save-others-livechat-room-info', ['livechat-manager']);
    RocketChat.models.Permissions.createOrUpdate('remove-closed-livechat-rooms', ['livechat-manager', 'admin']);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"messageTypes.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/messageTypes.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.MessageTypes.registerType({
  id: 'livechat_navigation_history',
  system: true,
  message: 'New_visitor_navigation',

  data(message) {
    if (!message.navigation || !message.navigation.page) {
      return;
    }

    return {
      history: `${(message.navigation.page.title ? `${message.navigation.page.title} - ` : '') + message.navigation.page.location.href}`
    };
  }

});
RocketChat.MessageTypes.registerType({
  id: 'livechat_video_call',
  system: true,
  message: 'New_videocall_request'
});
RocketChat.actionLinks.register('createLivechatCall', function (message, params, instance) {
  if (Meteor.isClient) {
    instance.tabBar.open('video');
  }
});
RocketChat.actionLinks.register('denyLivechatCall', function (message
/* , params*/
) {
  if (Meteor.isServer) {
    const user = Meteor.user();
    RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('command', message.rid, 'endCall', user);
    RocketChat.Notifications.notifyRoom(message.rid, 'deleteMessage', {
      _id: message._id
    });
    const language = user.language || RocketChat.settings.get('language') || 'en';
    RocketChat.Livechat.closeRoom({
      user,
      room: RocketChat.models.Rooms.findOneById(message.rid),
      comment: TAPi18n.__('Videocall_declined', {
        lng: language
      })
    });
    Meteor.defer(() => {
      RocketChat.models.Messages.setHiddenById(message._id);
    });
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"config.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/config.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.startup(function () {
  RocketChat.settings.addGroup('Livechat');
  RocketChat.settings.add('Livechat_enabled', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true
  });
  RocketChat.settings.add('Livechat_title', 'Rocket.Chat', {
    type: 'string',
    group: 'Livechat',
    public: true
  });
  RocketChat.settings.add('Livechat_title_color', '#C1272D', {
    type: 'color',
    editor: 'color',
    allowedTypes: ['color', 'expression'],
    group: 'Livechat',
    public: true
  });
  RocketChat.settings.add('Livechat_display_offline_form', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Display_offline_form'
  });
  RocketChat.settings.add('Livechat_validate_offline_email', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Validate_email_address'
  });
  RocketChat.settings.add('Livechat_offline_form_unavailable', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Offline_form_unavailable_message'
  });
  RocketChat.settings.add('Livechat_offline_title', 'Leave a message', {
    type: 'string',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Title'
  });
  RocketChat.settings.add('Livechat_offline_title_color', '#666666', {
    type: 'color',
    editor: 'color',
    allowedTypes: ['color', 'expression'],
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Color'
  });
  RocketChat.settings.add('Livechat_offline_message', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Instructions',
    i18nDescription: 'Instructions_to_your_visitor_fill_the_form_to_send_a_message'
  });
  RocketChat.settings.add('Livechat_offline_email', '', {
    type: 'string',
    group: 'Livechat',
    i18nLabel: 'Email_address_to_send_offline_messages',
    section: 'Offline'
  });
  RocketChat.settings.add('Livechat_offline_success_message', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Offline_success_message'
  });
  RocketChat.settings.add('Livechat_allow_switching_departments', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Allow_switching_departments'
  });
  RocketChat.settings.add('Livechat_show_agent_email', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Show_agent_email'
  });
  RocketChat.settings.add('Livechat_conversation_finished_message', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Conversation_finished_message'
  });
  RocketChat.settings.add('Livechat_registration_form', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Show_preregistration_form'
  });
  RocketChat.settings.add('Livechat_name_field_registration_form', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Show_name_field'
  });
  RocketChat.settings.add('Livechat_email_field_registration_form', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Show_email_field'
  });
  RocketChat.settings.add('Livechat_guest_count', 1, {
    type: 'int',
    group: 'Livechat'
  });
  RocketChat.settings.add('Livechat_Room_Count', 1, {
    type: 'int',
    group: 'Livechat',
    i18nLabel: 'Livechat_room_count'
  });
  RocketChat.settings.add('Livechat_agent_leave_action', 'none', {
    type: 'select',
    group: 'Livechat',
    values: [{
      key: 'none',
      i18nLabel: 'None'
    }, {
      key: 'forward',
      i18nLabel: 'Forward'
    }, {
      key: 'close',
      i18nLabel: 'Close'
    }],
    i18nLabel: 'How_to_handle_open_sessions_when_agent_goes_offline'
  });
  RocketChat.settings.add('Livechat_agent_leave_action_timeout', 60, {
    type: 'int',
    group: 'Livechat',
    enableQuery: {
      _id: 'Livechat_agent_leave_action',
      value: {
        $ne: 'none'
      }
    },
    i18nLabel: 'How_long_to_wait_after_agent_goes_offline',
    i18nDescription: 'Time_in_seconds'
  });
  RocketChat.settings.add('Livechat_agent_leave_comment', '', {
    type: 'string',
    group: 'Livechat',
    enableQuery: {
      _id: 'Livechat_agent_leave_action',
      value: 'close'
    },
    i18nLabel: 'Comment_to_leave_on_closing_session'
  });
  RocketChat.settings.add('Livechat_webhookUrl', false, {
    type: 'string',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Webhook_URL'
  });
  RocketChat.settings.add('Livechat_secret_token', false, {
    type: 'string',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Secret_token'
  });
  RocketChat.settings.add('Livechat_webhook_on_close', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_chat_close'
  });
  RocketChat.settings.add('Livechat_webhook_on_offline_msg', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_offline_messages'
  });
  RocketChat.settings.add('Livechat_webhook_on_visitor_message', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_visitor_message'
  });
  RocketChat.settings.add('Livechat_webhook_on_agent_message', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_agent_message'
  });
  RocketChat.settings.add('Send_visitor_navigation_history_livechat_webhook_request', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_visitor_navigation_history_on_request',
    i18nDescription: 'Feature_Depends_on_Livechat_Visitor_navigation_as_a_message_to_be_enabled',
    enableQuery: {
      _id: 'Livechat_Visitor_navigation_as_a_message',
      value: true
    }
  });
  RocketChat.settings.add('Livechat_webhook_on_capture', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_lead_capture'
  });
  RocketChat.settings.add('Livechat_lead_email_regex', '\\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\\.)+[A-Z]{2,4}\\b', {
    type: 'string',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Lead_capture_email_regex'
  });
  RocketChat.settings.add('Livechat_lead_phone_regex', '((?:\\([0-9]{1,3}\\)|[0-9]{2})[ \\-]*?[0-9]{4,5}(?:[\\-\\s\\_]{1,2})?[0-9]{4}(?:(?=[^0-9])|$)|[0-9]{4,5}(?:[\\-\\s\\_]{1,2})?[0-9]{4}(?:(?=[^0-9])|$))', {
    type: 'string',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Lead_capture_phone_regex'
  });
  RocketChat.settings.add('Livechat_Knowledge_Enabled', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'Knowledge_Base',
    public: true,
    i18nLabel: 'Enabled'
  });
  RocketChat.settings.add('Livechat_Knowledge_Apiai_Key', '', {
    type: 'string',
    group: 'Livechat',
    section: 'Knowledge_Base',
    public: true,
    i18nLabel: 'Apiai_Key'
  });
  RocketChat.settings.add('Livechat_Knowledge_Apiai_Language', 'en', {
    type: 'string',
    group: 'Livechat',
    section: 'Knowledge_Base',
    public: true,
    i18nLabel: 'Apiai_Language'
  });
  RocketChat.settings.add('Livechat_history_monitor_type', 'url', {
    type: 'select',
    group: 'Livechat',
    i18nLabel: 'Monitor_history_for_changes_on',
    values: [{
      key: 'url',
      i18nLabel: 'Page_URL'
    }, {
      key: 'title',
      i18nLabel: 'Page_title'
    }]
  });
  RocketChat.settings.add('Livechat_Visitor_navigation_as_a_message', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Send_Visitor_navigation_history_as_a_message'
  });
  RocketChat.settings.add('Livechat_enable_office_hours', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Office_hours_enabled'
  });
  RocketChat.settings.add('Livechat_continuous_sound_notification_new_livechat_room', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Continuous_sound_notifications_for_new_livechat_room'
  });
  RocketChat.settings.add('Livechat_videocall_enabled', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Videocall_enabled',
    i18nDescription: 'Beta_feature_Depends_on_Video_Conference_to_be_enabled',
    enableQuery: {
      _id: 'Jitsi_Enabled',
      value: true
    }
  });
  RocketChat.settings.add('Livechat_fileupload_enabled', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'FileUpload_Enabled',
    enableQuery: {
      _id: 'FileUpload_Enabled',
      value: true
    }
  });
  RocketChat.settings.add('Livechat_enable_transcript', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Transcript_Enabled'
  });
  RocketChat.settings.add('Livechat_transcript_message', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Transcript_message',
    enableQuery: {
      _id: 'Livechat_enable_transcript',
      value: true
    }
  });
  RocketChat.settings.add('Livechat_open_inquiery_show_connecting', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Livechat_open_inquiery_show_connecting',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: 'Guest_Pool'
    }
  });
  RocketChat.settings.add('Livechat_AllowedDomainsList', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Livechat_AllowedDomainsList',
    i18nDescription: 'Domains_allowed_to_embed_the_livechat_widget'
  });
  RocketChat.settings.add('Livechat_Facebook_Enabled', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'Facebook'
  });
  RocketChat.settings.add('Livechat_Facebook_API_Key', '', {
    type: 'string',
    group: 'Livechat',
    section: 'Facebook',
    i18nDescription: 'If_you_dont_have_one_send_an_email_to_omni_rocketchat_to_get_yours'
  });
  RocketChat.settings.add('Livechat_Facebook_API_Secret', '', {
    type: 'string',
    group: 'Livechat',
    section: 'Facebook',
    i18nDescription: 'If_you_dont_have_one_send_an_email_to_omni_rocketchat_to_get_yours'
  });
  RocketChat.settings.add('Livechat_RDStation_Token', '', {
    type: 'string',
    group: 'Livechat',
    public: false,
    section: 'RD Station',
    i18nLabel: 'RDStation_Token'
  });
  RocketChat.settings.add('Livechat_Routing_Method', 'Least_Amount', {
    type: 'select',
    group: 'Livechat',
    public: true,
    section: 'Routing',
    values: [{
      key: 'External',
      i18nLabel: 'External_Service'
    }, {
      key: 'Least_Amount',
      i18nLabel: 'Least_Amount'
    }, {
      key: 'Guest_Pool',
      i18nLabel: 'Guest_Pool'
    }]
  });
  RocketChat.settings.add('Livechat_guest_pool_with_no_agents', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'Routing',
    i18nLabel: 'Accept_with_no_online_agents',
    i18nDescription: 'Accept_incoming_livechat_requests_even_if_there_are_no_online_agents',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: 'Guest_Pool'
    }
  });
  RocketChat.settings.add('Livechat_show_queue_list_link', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    section: 'Routing',
    i18nLabel: 'Show_queue_list_to_all_agents',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: {
        $ne: 'External'
      }
    }
  });
  RocketChat.settings.add('Livechat_External_Queue_URL', '', {
    type: 'string',
    group: 'Livechat',
    public: false,
    section: 'Routing',
    i18nLabel: 'External_Queue_Service_URL',
    i18nDescription: 'For_more_details_please_check_our_docs',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: 'External'
    }
  });
  RocketChat.settings.add('Livechat_External_Queue_Token', '', {
    type: 'string',
    group: 'Livechat',
    public: false,
    section: 'Routing',
    i18nLabel: 'Secret_token',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: 'External'
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"imports":{"LivechatRoomType.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/LivechatRoomType.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => LivechatRoomType
});
let RoomSettingsEnum, RoomTypeConfig, RoomTypeRouteConfig, UiTextContext;
module.watch(require("meteor/rocketchat:lib"), {
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

class LivechatRoomRoute extends RoomTypeRouteConfig {
  constructor() {
    super({
      name: 'live',
      path: '/live/:id'
    });
  }

  action(params) {
    openRoom('l', params.id);
  }

  link(sub) {
    return {
      id: sub.rid
    };
  }

}

class LivechatRoomType extends RoomTypeConfig {
  constructor() {
    super({
      identifier: 'l',
      order: 5,
      icon: 'livechat',
      label: 'Livechat',
      route: new LivechatRoomRoute()
    });
    this.notSubscribedTpl = {
      template: 'livechatNotSubscribed'
    };
  }

  findRoom(identifier) {
    return ChatRoom.findOne({
      _id: identifier
    });
  }

  roomName(roomData) {
    return roomData.name || roomData.fname || roomData.label;
  }

  condition() {
    return RocketChat.settings.get('Livechat_enabled') && RocketChat.authz.hasAllPermission('view-l-room');
  }

  canSendMessage(roomId) {
    const room = ChatRoom.findOne({
      _id: roomId
    }, {
      fields: {
        open: 1
      }
    });
    return room && room.open === true;
  }

  getUserStatus(roomId) {
    const room = Session.get(`roomData${roomId}`);

    if (room) {
      return room.v && room.v.status;
    }

    const inquiry = LivechatInquiry.findOne({
      rid: roomId
    });
    return inquiry && inquiry.v && inquiry.v.status;
  }

  allowRoomSettingChange(room, setting) {
    switch (setting) {
      case RoomSettingsEnum.JOIN_CODE:
        return false;

      default:
        return true;
    }
  }

  getUiText(context) {
    switch (context) {
      case UiTextContext.HIDE_WARNING:
        return 'Hide_Livechat_Warning';

      case UiTextContext.LEAVE_WARNING:
        return 'Hide_Livechat_Warning';

      default:
        return '';
    }
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"rest":{"departments.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/departments.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('livechat/department', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success({
      departments: RocketChat.models.LivechatDepartment.find().fetch()
    });
  },

  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.bodyParams, {
        department: Object,
        agents: Array
      });
      const department = RocketChat.Livechat.saveDepartment(null, this.bodyParams.department, this.bodyParams.agents);

      if (department) {
        return RocketChat.API.v1.success({
          department,
          agents: RocketChat.models.LivechatDepartmentAgents.find({
            departmentId: department._id
          }).fetch()
        });
      }

      RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/department/:_id', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        _id: String
      });
      return RocketChat.API.v1.success({
        department: RocketChat.models.LivechatDepartment.findOneById(this.urlParams._id),
        agents: RocketChat.models.LivechatDepartmentAgents.find({
          departmentId: this.urlParams._id
        }).fetch()
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  },

  put() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        _id: String
      });
      check(this.bodyParams, {
        department: Object,
        agents: Array
      });

      if (RocketChat.Livechat.saveDepartment(this.urlParams._id, this.bodyParams.department, this.bodyParams.agents)) {
        return RocketChat.API.v1.success({
          department: RocketChat.models.LivechatDepartment.findOneById(this.urlParams._id),
          agents: RocketChat.models.LivechatDepartmentAgents.find({
            departmentId: this.urlParams._id
          }).fetch()
        });
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  },

  delete() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        _id: String
      });

      if (RocketChat.Livechat.removeDepartment(this.urlParams._id)) {
        return RocketChat.API.v1.success();
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"facebook.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/facebook.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let crypto;
module.watch(require("crypto"), {
  default(v) {
    crypto = v;
  }

}, 0);
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 1);

/**
 * @api {post} /livechat/facebook Send Facebook message
 * @apiName Facebook
 * @apiGroup Livechat
 *
 * @apiParam {String} mid Facebook message id
 * @apiParam {String} page Facebook pages id
 * @apiParam {String} token Facebook user's token
 * @apiParam {String} first_name Facebook user's first name
 * @apiParam {String} last_name Facebook user's last name
 * @apiParam {String} [text] Facebook message text
 * @apiParam {String} [attachments] Facebook message attachments
 */
RocketChat.API.v1.addRoute('livechat/facebook', {
  post() {
    if (!this.bodyParams.text && !this.bodyParams.attachments) {
      return {
        success: false
      };
    }

    if (!this.request.headers['x-hub-signature']) {
      return {
        success: false
      };
    }

    if (!RocketChat.settings.get('Livechat_Facebook_Enabled')) {
      return {
        success: false,
        error: 'Integration disabled'
      };
    } // validate if request come from omni


    const signature = crypto.createHmac('sha1', RocketChat.settings.get('Livechat_Facebook_API_Secret')).update(JSON.stringify(this.request.body)).digest('hex');

    if (this.request.headers['x-hub-signature'] !== `sha1=${signature}`) {
      return {
        success: false,
        error: 'Invalid signature'
      };
    }

    const sendMessage = {
      message: {
        _id: this.bodyParams.mid
      },
      roomInfo: {
        facebook: {
          page: this.bodyParams.page
        }
      }
    };
    let visitor = LivechatVisitors.getVisitorByToken(this.bodyParams.token);

    if (visitor) {
      const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(visitor.token).fetch();

      if (rooms && rooms.length > 0) {
        sendMessage.message.rid = rooms[0]._id;
      } else {
        sendMessage.message.rid = Random.id();
      }

      sendMessage.message.token = visitor.token;
    } else {
      sendMessage.message.rid = Random.id();
      sendMessage.message.token = this.bodyParams.token;
      const userId = RocketChat.Livechat.registerGuest({
        token: sendMessage.message.token,
        name: `${this.bodyParams.first_name} ${this.bodyParams.last_name}`
      });
      visitor = RocketChat.models.Users.findOneById(userId);
    }

    sendMessage.message.msg = this.bodyParams.text;
    sendMessage.guest = visitor;

    try {
      return {
        sucess: true,
        message: RocketChat.Livechat.sendMessage(sendMessage)
      };
    } catch (e) {
      console.error('Error using Facebook ->', e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"messages.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/messages.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/messages', {
  authRequired: true
}, {
  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    if (!this.bodyParams.visitor) {
      return RocketChat.API.v1.failure('Body param "visitor" is required');
    }

    if (!this.bodyParams.visitor.token) {
      return RocketChat.API.v1.failure('Body param "visitor.token" is required');
    }

    if (!this.bodyParams.messages) {
      return RocketChat.API.v1.failure('Body param "messages" is required');
    }

    if (!(this.bodyParams.messages instanceof Array)) {
      return RocketChat.API.v1.failure('Body param "messages" is not an array');
    }

    if (this.bodyParams.messages.length === 0) {
      return RocketChat.API.v1.failure('Body param "messages" is empty');
    }

    const visitorToken = this.bodyParams.visitor.token;
    let visitor = LivechatVisitors.getVisitorByToken(visitorToken);
    let rid;

    if (visitor) {
      const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(visitorToken).fetch();

      if (rooms && rooms.length > 0) {
        rid = rooms[0]._id;
      } else {
        rid = Random.id();
      }
    } else {
      rid = Random.id();
      const visitorId = RocketChat.Livechat.registerGuest(this.bodyParams.visitor);
      visitor = LivechatVisitors.findOneById(visitorId);
    }

    const sentMessages = this.bodyParams.messages.map(message => {
      const sendMessage = {
        guest: visitor,
        message: {
          _id: Random.id(),
          rid,
          token: visitorToken,
          msg: message.msg
        }
      };
      const sentMessage = RocketChat.Livechat.sendMessage(sendMessage);
      return {
        username: sentMessage.u.username,
        msg: sentMessage.msg,
        ts: sentMessage.ts
      };
    });
    return RocketChat.API.v1.success({
      messages: sentMessages
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sms.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/sms.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/sms-incoming/:service', {
  post() {
    const SMSService = RocketChat.SMS.getService(this.urlParams.service);
    const sms = SMSService.parse(this.bodyParams);
    let visitor = LivechatVisitors.findOneVisitorByPhone(sms.from);
    const sendMessage = {
      message: {
        _id: Random.id()
      },
      roomInfo: {
        sms: {
          from: sms.to
        }
      }
    };

    if (visitor) {
      const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(visitor.token).fetch();

      if (rooms && rooms.length > 0) {
        sendMessage.message.rid = rooms[0]._id;
      } else {
        sendMessage.message.rid = Random.id();
      }

      sendMessage.message.token = visitor.token;
    } else {
      sendMessage.message.rid = Random.id();
      sendMessage.message.token = Random.id();
      const visitorId = RocketChat.Livechat.registerGuest({
        username: sms.from.replace(/[^0-9]/g, ''),
        token: sendMessage.message.token,
        phone: {
          number: sms.from
        }
      });
      visitor = LivechatVisitors.findOneById(visitorId);
    }

    sendMessage.message.msg = sms.body;
    sendMessage.guest = visitor;
    sendMessage.message.attachments = sms.media.map(curr => {
      const attachment = {
        message_link: curr.url
      };
      const {
        contentType
      } = curr;

      switch (contentType.substr(0, contentType.indexOf('/'))) {
        case 'image':
          attachment.image_url = curr.url;
          break;

        case 'video':
          attachment.video_url = curr.url;
          break;

        case 'audio':
          attachment.audio_url = curr.url;
          break;
      }

      return attachment;
    });

    try {
      const message = SMSService.response.call(this, RocketChat.Livechat.sendMessage(sendMessage));
      Meteor.defer(() => {
        if (sms.extra) {
          if (sms.extra.fromCountry) {
            Meteor.call('livechat:setCustomField', sendMessage.message.token, 'country', sms.extra.fromCountry);
          }

          if (sms.extra.fromState) {
            Meteor.call('livechat:setCustomField', sendMessage.message.token, 'state', sms.extra.fromState);
          }

          if (sms.extra.fromCity) {
            Meteor.call('livechat:setCustomField', sendMessage.message.token, 'city', sms.extra.fromCity);
          }
        }
      });
      return message;
    } catch (e) {
      return SMSService.error.call(this, e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"upload.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/upload.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 0);
let filesize;
module.watch(require("filesize"), {
  default(v) {
    filesize = v;
  }

}, 1);
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 2);
let maxFileSize;
RocketChat.settings.get('FileUpload_MaxFileSize', function (key, value) {
  try {
    maxFileSize = parseInt(value);
  } catch (e) {
    maxFileSize = RocketChat.models.Settings.findOneById('FileUpload_MaxFileSize').packageValue;
  }
});
RocketChat.API.v1.addRoute('livechat/upload/:rid', {
  post() {
    if (!this.request.headers['x-visitor-token']) {
      return RocketChat.API.v1.unauthorized();
    }

    const visitorToken = this.request.headers['x-visitor-token'];
    const visitor = LivechatVisitors.getVisitorByToken(visitorToken);

    if (!visitor) {
      return RocketChat.API.v1.unauthorized();
    }

    const room = RocketChat.models.Rooms.findOneOpenByVisitorToken(visitorToken, this.urlParams.rid);

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

    if (!RocketChat.fileUploadIsValidContentType(file.mimetype)) {
      return RocketChat.API.v1.failure({
        reason: 'error-type-not-allowed'
      });
    } // -1 maxFileSize means there is no limit


    if (maxFileSize > -1 && file.fileBuffer.length > maxFileSize) {
      return RocketChat.API.v1.failure({
        reason: 'error-size-not-allowed',
        sizeAllowed: filesize(maxFileSize)
      });
    }

    const fileStore = FileUpload.getStore('Uploads');
    const details = {
      name: file.filename,
      size: file.fileBuffer.length,
      type: file.mimetype,
      rid: this.urlParams.rid,
      visitorToken
    };
    const uploadedFile = Meteor.wrapAsync(fileStore.insert.bind(fileStore))(details, file.fileBuffer);
    uploadedFile.description = fields.description;
    delete fields.description;
    RocketChat.API.v1.success(Meteor.call('sendFileLivechatMessage', this.urlParams.rid, visitorToken, uploadedFile, fields));
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"users.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/users.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/users/:type', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        type: String
      });
      let role;

      if (this.urlParams.type === 'agent') {
        role = 'livechat-agent';
      } else if (this.urlParams.type === 'manager') {
        role = 'livechat-manager';
      } else {
        throw 'Invalid type';
      }

      const users = RocketChat.authz.getUsersInRole(role);
      return RocketChat.API.v1.success({
        users: users.fetch().map(user => _.pick(user, '_id', 'username', 'name', 'status', 'statusLivechat'))
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  },

  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        type: String
      });
      check(this.bodyParams, {
        username: String
      });

      if (this.urlParams.type === 'agent') {
        const user = RocketChat.Livechat.addAgent(this.bodyParams.username);

        if (user) {
          return RocketChat.API.v1.success({
            user
          });
        }
      } else if (this.urlParams.type === 'manager') {
        const user = RocketChat.Livechat.addManager(this.bodyParams.username);

        if (user) {
          return RocketChat.API.v1.success({
            user
          });
        }
      } else {
        throw 'Invalid type';
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/users/:type/:_id', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        type: String,
        _id: String
      });
      const user = RocketChat.models.Users.findOneById(this.urlParams._id);

      if (!user) {
        return RocketChat.API.v1.failure('User not found');
      }

      let role;

      if (this.urlParams.type === 'agent') {
        role = 'livechat-agent';
      } else if (this.urlParams.type === 'manager') {
        role = 'livechat-manager';
      } else {
        throw 'Invalid type';
      }

      if (user.roles.indexOf(role) !== -1) {
        return RocketChat.API.v1.success({
          user: _.pick(user, '_id', 'username')
        });
      }

      return RocketChat.API.v1.success({
        user: null
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  },

  delete() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        type: String,
        _id: String
      });
      const user = RocketChat.models.Users.findOneById(this.urlParams._id);

      if (!user) {
        return RocketChat.API.v1.failure();
      }

      if (this.urlParams.type === 'agent') {
        if (RocketChat.Livechat.removeAgent(user.username)) {
          return RocketChat.API.v1.success();
        }
      } else if (this.urlParams.type === 'manager') {
        if (RocketChat.Livechat.removeManager(user.username)) {
          return RocketChat.API.v1.success();
        }
      } else {
        throw 'Invalid type';
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitors.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/visitors.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/visitor/:visitorToken', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    const visitor = LivechatVisitors.getVisitorByToken(this.urlParams.visitorToken);
    return RocketChat.API.v1.success(visitor);
  }

});
RocketChat.API.v1.addRoute('livechat/visitor/:visitorToken/room', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(this.urlParams.visitorToken, {
      fields: {
        name: 1,
        t: 1,
        cl: 1,
        u: 1,
        usernames: 1,
        servedBy: 1
      }
    }).fetch();
    return RocketChat.API.v1.success({
      rooms
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"node_modules":{"ua-parser-js":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_livechat/node_modules/ua-parser-js/package.json                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "ua-parser-js";
exports.version = "0.7.17";
exports.main = "src/ua-parser.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"src":{"ua-parser.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_livechat/node_modules/ua-parser-js/src/ua-parser.js                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * UAParser.js v0.7.17
 * Lightweight JavaScript-based User-Agent string parser
 * https://github.com/faisalman/ua-parser-js
 *
 * Copyright © 2012-2016 Faisal Salman <fyzlman@gmail.com>
 * Dual licensed under GPLv2 & MIT
 */

(function (window, undefined) {

    'use strict';

    //////////////
    // Constants
    /////////////


    var LIBVERSION  = '0.7.17',
        EMPTY       = '',
        UNKNOWN     = '?',
        FUNC_TYPE   = 'function',
        UNDEF_TYPE  = 'undefined',
        OBJ_TYPE    = 'object',
        STR_TYPE    = 'string',
        MAJOR       = 'major', // deprecated
        MODEL       = 'model',
        NAME        = 'name',
        TYPE        = 'type',
        VENDOR      = 'vendor',
        VERSION     = 'version',
        ARCHITECTURE= 'architecture',
        CONSOLE     = 'console',
        MOBILE      = 'mobile',
        TABLET      = 'tablet',
        SMARTTV     = 'smarttv',
        WEARABLE    = 'wearable',
        EMBEDDED    = 'embedded';


    ///////////
    // Helper
    //////////


    var util = {
        extend : function (regexes, extensions) {
            var margedRegexes = {};
            for (var i in regexes) {
                if (extensions[i] && extensions[i].length % 2 === 0) {
                    margedRegexes[i] = extensions[i].concat(regexes[i]);
                } else {
                    margedRegexes[i] = regexes[i];
                }
            }
            return margedRegexes;
        },
        has : function (str1, str2) {
          if (typeof str1 === "string") {
            return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
          } else {
            return false;
          }
        },
        lowerize : function (str) {
            return str.toLowerCase();
        },
        major : function (version) {
            return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g,'').split(".")[0] : undefined;
        },
        trim : function (str) {
          return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    };


    ///////////////
    // Map helper
    //////////////


    var mapper = {

        rgx : function (ua, arrays) {

            //var result = {},
            var i = 0, j, k, p, q, matches, match;//, args = arguments;

            /*// construct object barebones
            for (p = 0; p < args[1].length; p++) {
                q = args[1][p];
                result[typeof q === OBJ_TYPE ? q[0] : q] = undefined;
            }*/

            // loop through all regexes maps
            while (i < arrays.length && !matches) {

                var regex = arrays[i],       // even sequence (0,2,4,..)
                    props = arrays[i + 1];   // odd sequence (1,3,5,..)
                j = k = 0;

                // try matching uastring with regexes
                while (j < regex.length && !matches) {

                    matches = regex[j++].exec(ua);

                    if (!!matches) {
                        for (p = 0; p < props.length; p++) {
                            match = matches[++k];
                            q = props[p];
                            // check if given property is actually array
                            if (typeof q === OBJ_TYPE && q.length > 0) {
                                if (q.length == 2) {
                                    if (typeof q[1] == FUNC_TYPE) {
                                        // assign modified match
                                        this[q[0]] = q[1].call(this, match);
                                    } else {
                                        // assign given value, ignore regex match
                                        this[q[0]] = q[1];
                                    }
                                } else if (q.length == 3) {
                                    // check whether function or regex
                                    if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                        // call function (usually string mapper)
                                        this[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
                                    } else {
                                        // sanitize match using given regex
                                        this[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                                    }
                                } else if (q.length == 4) {
                                        this[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
                                }
                            } else {
                                this[q] = match ? match : undefined;
                            }
                        }
                    }
                }
                i += 2;
            }
            // console.log(this);
            //return this;
        },

        str : function (str, map) {

            for (var i in map) {
                // check if array
                if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                    for (var j = 0; j < map[i].length; j++) {
                        if (util.has(map[i][j], str)) {
                            return (i === UNKNOWN) ? undefined : i;
                        }
                    }
                } else if (util.has(map[i], str)) {
                    return (i === UNKNOWN) ? undefined : i;
                }
            }
            return str;
        }
    };


    ///////////////
    // String map
    //////////////


    var maps = {

        browser : {
            oldsafari : {
                version : {
                    '1.0'   : '/8',
                    '1.2'   : '/1',
                    '1.3'   : '/3',
                    '2.0'   : '/412',
                    '2.0.2' : '/416',
                    '2.0.3' : '/417',
                    '2.0.4' : '/419',
                    '?'     : '/'
                }
            }
        },

        device : {
            amazon : {
                model : {
                    'Fire Phone' : ['SD', 'KF']
                }
            },
            sprint : {
                model : {
                    'Evo Shift 4G' : '7373KT'
                },
                vendor : {
                    'HTC'       : 'APA',
                    'Sprint'    : 'Sprint'
                }
            }
        },

        os : {
            windows : {
                version : {
                    'ME'        : '4.90',
                    'NT 3.11'   : 'NT3.51',
                    'NT 4.0'    : 'NT4.0',
                    '2000'      : 'NT 5.0',
                    'XP'        : ['NT 5.1', 'NT 5.2'],
                    'Vista'     : 'NT 6.0',
                    '7'         : 'NT 6.1',
                    '8'         : 'NT 6.2',
                    '8.1'       : 'NT 6.3',
                    '10'        : ['NT 6.4', 'NT 10.0'],
                    'RT'        : 'ARM'
                }
            }
        }
    };


    //////////////
    // Regex map
    /////////////


    var regexes = {

        browser : [[

            // Presto based
            /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
            /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
            /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
            /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80
            ], [NAME, VERSION], [

            /(opios)[\/\s]+([\w\.]+)/i                                          // Opera mini on iphone >= 8.0
            ], [[NAME, 'Opera Mini'], VERSION], [

            /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
            ], [[NAME, 'Opera'], VERSION], [

            // Mixed
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,
                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

            // Trident based
            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                // Avant/IEMobile/SlimBrowser/Baidu
            /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

            // Webkit/KHTML based
            /(rekonq)\/([\w\.]+)*/i,                                            // Rekonq
            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser)\/([\w\.-]+)/i
                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser
            ], [NAME, VERSION], [

            /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
            ], [[NAME, 'IE'], VERSION], [

            /(edge)\/((\d+)?[\w\.]+)/i                                          // Microsoft Edge
            ], [NAME, VERSION], [

            /(yabrowser)\/([\w\.]+)/i                                           // Yandex
            ], [[NAME, 'Yandex'], VERSION], [

            /(puffin)\/([\w\.]+)/i                                              // Puffin
            ], [[NAME, 'Puffin'], VERSION], [

            /((?:[\s\/])uc?\s?browser|(?:juc.+)ucweb)[\/\s]?([\w\.]+)/i
                                                                                // UCBrowser
            ], [[NAME, 'UCBrowser'], VERSION], [

            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
            ], [[NAME, /_/g, ' '], VERSION], [

            /(micromessenger)\/([\w\.]+)/i                                      // WeChat
            ], [[NAME, 'WeChat'], VERSION], [

            /(QQ)\/([\d\.]+)/i                                                  // QQ, aka ShouQ
            ], [NAME, VERSION], [

            /m?(qqbrowser)[\/\s]?([\w\.]+)/i                                    // QQBrowser
            ], [NAME, VERSION], [

            /xiaomi\/miuibrowser\/([\w\.]+)/i                                   // MIUI Browser
            ], [VERSION, [NAME, 'MIUI Browser']], [

            /;fbav\/([\w\.]+);/i                                                // Facebook App for iOS & Android
            ], [VERSION, [NAME, 'Facebook']], [

            /headlesschrome(?:\/([\w\.]+)|\s)/i                                 // Chrome Headless
            ], [VERSION, [NAME, 'Chrome Headless']], [

            /\swv\).+(chrome)\/([\w\.]+)/i                                      // Chrome WebView
            ], [[NAME, /(.+)/, '$1 WebView'], VERSION], [

            /((?:oculus|samsung)browser)\/([\w\.]+)/i
            ], [[NAME, /(.+(?:g|us))(.+)/, '$1 $2'], VERSION], [                // Oculus / Samsung Browser

            /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i        // Android Browser
            ], [VERSION, [NAME, 'Android Browser']], [

            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i
                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
            ], [NAME, VERSION], [

            /(dolfin)\/([\w\.]+)/i                                              // Dolphin
            ], [[NAME, 'Dolphin'], VERSION], [

            /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
            ], [[NAME, 'Chrome'], VERSION], [

            /(coast)\/([\w\.]+)/i                                               // Opera Coast
            ], [[NAME, 'Opera Coast'], VERSION], [

            /fxios\/([\w\.-]+)/i                                                // Firefox for iOS
            ], [VERSION, [NAME, 'Firefox']], [

            /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
            ], [VERSION, [NAME, 'Mobile Safari']], [

            /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
            ], [VERSION, NAME], [

            /webkit.+?(gsa)\/([\w\.]+).+?(mobile\s?safari|safari)(\/[\w\.]+)/i  // Google Search Appliance on iOS
            ], [[NAME, 'GSA'], VERSION], [

            /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
            ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

            /(konqueror)\/([\w\.]+)/i,                                          // Konqueror
            /(webkit|khtml)\/([\w\.]+)/i
            ], [NAME, VERSION], [

            // Gecko based
            /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
            ], [[NAME, 'Netscape'], VERSION], [
            /(swiftfox)/i,                                                      // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,
                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

            // Other
            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,
                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir
            /(links)\s\(([\w\.]+)/i,                                            // Links
            /(gobrowser)\/?([\w\.]+)*/i,                                        // GoBrowser
            /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
            /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
            ], [NAME, VERSION]

            /* /////////////////////
            // Media players BEGIN
            ////////////////////////

            , [

            /(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,                          // Generic Apple CoreMedia
            /(coremedia) v((\d+)[\w\._]+)/i
            ], [NAME, VERSION], [

            /(aqualung|lyssna|bsplayer)\/((\d+)?[\w\.-]+)/i                     // Aqualung/Lyssna/BSPlayer
            ], [NAME, VERSION], [

            /(ares|ossproxy)\s((\d+)[\w\.-]+)/i                                 // Ares/OSSProxy
            ], [NAME, VERSION], [

            /(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,
                                                                                // Audacious/AudiMusicStream/Amarok/BASS/OpenCORE/Dalvik/GnomeMplayer/MoC
                                                                                // NSPlayer/PSP-InternetRadioPlayer/Videos
            /(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,               // Clementine/MPD
            /(lg player|nexplayer)\s((\d+)[\d\.]+)/i,
            /player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i                   // NexPlayer/LG Player
            ], [NAME, VERSION], [
            /(nexplayer)\s((\d+)[\w\.-]+)/i                                     // Nexplayer
            ], [NAME, VERSION], [

            /(flrp)\/((\d+)[\w\.-]+)/i                                          // Flip Player
            ], [[NAME, 'Flip Player'], VERSION], [

            /(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i
                                                                                // FStream/NativeHost/QuerySeekSpider/IA Archiver/facebookexternalhit
            ], [NAME], [

            /(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i
                                                                                // Gstreamer
            ], [NAME, VERSION], [

            /(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,              // HTC Streaming Player
            /(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,
                                                                                // Java/urllib/requests/wget/cURL
            /(lavf)((\d+)[\d\.]+)/i                                             // Lavf (FFMPEG)
            ], [NAME, VERSION], [

            /(htc_one_s)\/((\d+)[\d\.]+)/i                                      // HTC One S
            ], [[NAME, /_/g, ' '], VERSION], [

            /(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i
                                                                                // MPlayer SVN
            ], [NAME, VERSION], [

            /(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i                      // MPlayer
            ], [NAME, VERSION], [

            /(mplayer)/i,                                                       // MPlayer (no other info)
            /(yourmuze)/i,                                                      // YourMuze
            /(media player classic|nero showtime)/i                             // Media Player Classic/Nero ShowTime
            ], [NAME], [

            /(nero (?:home|scout))\/((\d+)[\w\.-]+)/i                           // Nero Home/Nero Scout
            ], [NAME, VERSION], [

            /(nokia\d+)\/((\d+)[\w\.-]+)/i                                      // Nokia
            ], [NAME, VERSION], [

            /\s(songbird)\/((\d+)[\w\.-]+)/i                                    // Songbird/Philips-Songbird
            ], [NAME, VERSION], [

            /(winamp)3 version ((\d+)[\w\.-]+)/i,                               // Winamp
            /(winamp)\s((\d+)[\w\.-]+)/i,
            /(winamp)mpeg\/((\d+)[\w\.-]+)/i
            ], [NAME, VERSION], [

            /(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i  // OCMS-bot/tap in radio/tunein/unknown/winamp (no other info)
                                                                                // inlight radio
            ], [NAME], [

            /(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i
                                                                                // QuickTime/RealMedia/RadioApp/RadioClientApplication/
                                                                                // SoundTap/Totem/Stagefright/Streamium
            ], [NAME, VERSION], [

            /(smp)((\d+)[\d\.]+)/i                                              // SMP
            ], [NAME, VERSION], [

            /(vlc) media player - version ((\d+)[\w\.]+)/i,                     // VLC Videolan
            /(vlc)\/((\d+)[\w\.-]+)/i,
            /(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,                    // XBMC/gvfs/Xine/XMMS/irapp
            /(foobar2000)\/((\d+)[\d\.]+)/i,                                    // Foobar2000
            /(itunes)\/((\d+)[\d\.]+)/i                                         // iTunes
            ], [NAME, VERSION], [

            /(wmplayer)\/((\d+)[\w\.-]+)/i,                                     // Windows Media Player
            /(windows-media-player)\/((\d+)[\w\.-]+)/i
            ], [[NAME, /-/g, ' '], VERSION], [

            /windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i
                                                                                // Windows Media Server
            ], [VERSION, [NAME, 'Windows']], [

            /(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i                          // RiseUP Radio Alarm
            ], [NAME, VERSION], [

            /(rad.io)\s((\d+)[\d\.]+)/i,                                        // Rad.io
            /(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i
            ], [[NAME, 'rad.io'], VERSION]

            //////////////////////
            // Media players END
            ////////////////////*/

        ],

        cpu : [[

            /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
            ], [[ARCHITECTURE, 'amd64']], [

            /(ia32(?=;))/i                                                      // IA32 (quicktime)
            ], [[ARCHITECTURE, util.lowerize]], [

            /((?:i[346]|x)86)[;\)]/i                                            // IA32
            ], [[ARCHITECTURE, 'ia32']], [

            // PocketPC mistakenly identified as PowerPC
            /windows\s(ce|mobile);\sppc;/i
            ], [[ARCHITECTURE, 'arm']], [

            /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
            ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

            /(sun4\w)[;\)]/i                                                    // SPARC
            ], [[ARCHITECTURE, 'sparc']], [

            /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
            ], [[ARCHITECTURE, util.lowerize]]
        ],

        device : [[

            /\((ipad|playbook);[\w\s\);-]+(rim|apple)/i                         // iPad/PlayBook
            ], [MODEL, VENDOR, [TYPE, TABLET]], [

            /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

            /(apple\s{0,1}tv)/i                                                 // Apple TV
            ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple']], [

            /(archos)\s(gamepad2?)/i,                                           // Archos
            /(hp).+(touchpad)/i,                                                // HP TouchPad
            /(hp).+(tablet)/i,                                                  // HP Tablet
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
            /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i                               // Kindle Fire HD
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
            /(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i                  // Fire Phone
            ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [

            /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
            ], [MODEL, VENDOR, [TYPE, MOBILE]], [
            /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

            /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,
                                                                                // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron
            /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
            /(asus)-?(\w+)/i                                                    // Asus
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
            ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                // Asus Tablets
            /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone)/i
            ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

            /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
            /(sony)?(?:sgp.+)\sbuild\//i
            ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
            /android.+\s([c-g]\d{4}|so[-l]\w+)\sbuild\//i
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /\s(ouya)\s/i,                                                      // Ouya
            /(nintendo)\s([wids3u]+)/i                                          // Nintendo
            ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

            /android.+;\s(shield)\sbuild/i                                      // Nvidia
            ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

            /(playstation\s[34portablevi]+)/i                                   // Playstation
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

            /(sprint\s(\w+))/i                                                  // Sprint Phones
            ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

            /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,                               // HTC
            /(zte)-(\w+)*/i,                                                    // ZTE
            /(alcatel|geeksphone|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i
                                                                                // Alcatel/GeeksPhone/Lenovo/Nexian/Panasonic/Sony
            ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

            /(nexus\s9)/i                                                       // HTC Nexus 9
            ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

            /d\/huawei([\w\s-]+)[;\)]/i,
            /(nexus\s6p)/i                                                      // Huawei
            ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]], [

            /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
            ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
            /(kin\.[onetw]{3})/i                                                // Microsoft Kin
            ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                // Motorola
            /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,
            /mot[\s-]?(\w+)*/i,
            /(XT\d{3,4}) build\//i,
            /(nexus\s6)/i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
            /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

            /hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i            // HbbTV devices
            ], [[VENDOR, util.trim], [MODEL, util.trim], [TYPE, SMARTTV]], [

            /hbbtv.+maple;(\d+)/i
            ], [[MODEL, /^/, 'SmartTV'], [VENDOR, 'Samsung'], [TYPE, SMARTTV]], [

            /\(dtv[\);].+(aquos)/i                                              // Sharp
            ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [

            /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
            /((SM-T\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
            /smart-tv.+(samsung)/i
            ], [VENDOR, [TYPE, SMARTTV], MODEL], [
            /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
            /(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,
            /sec-((sgh\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [

            /sie-(\w+)*/i                                                       // Siemens
            ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

            /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
            /(nokia)[\s_-]?([\w-]+)*/i
            ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

            /android\s3\.[\s\w;-]{10}(a\d{3})/i                                 // Acer
            ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

            /android.+([vl]k\-?\d{3})\s+build/i                                 // LG Tablet
            ], [MODEL, [VENDOR, 'LG'], [TYPE, TABLET]], [
            /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
            ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
            /(lg) netcast\.tv/i                                                 // LG SmartTV
            ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
            /(nexus\s[45])/i,                                                   // LG
            /lg[e;\s\/-]+(\w+)*/i,
            /android.+lg(\-?[\d\w]+)\s+build/i
            ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

            /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
            ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

            /linux;.+((jolla));/i                                               // Jolla
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /((pebble))app\/[\d\.]+\s/i                                         // Pebble
            ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

            /android.+;\s(oppo)\s?([\w\s]+)\sbuild/i                            // OPPO
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /crkey/i                                                            // Google Chromecast
            ], [[MODEL, 'Chromecast'], [VENDOR, 'Google']], [

            /android.+;\s(glass)\s\d/i                                          // Google Glass
            ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

            /android.+;\s(pixel c)\s/i                                          // Google Pixel C
            ], [MODEL, [VENDOR, 'Google'], [TYPE, TABLET]], [

            /android.+;\s(pixel xl|pixel)\s/i                                   // Google Pixel
            ], [MODEL, [VENDOR, 'Google'], [TYPE, MOBILE]], [

            /android.+(\w+)\s+build\/hm\1/i,                                    // Xiaomi Hongmi 'numeric' models
            /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
            /android.+(mi[\s\-_]*(?:one|one[\s_]plus|note lte)?[\s_]*(?:\d\w)?)\s+build/i,    // Xiaomi Mi
            /android.+(redmi[\s\-_]*(?:note)?(?:[\s_]*[\w\s]+)?)\s+build/i      // Redmi Phones
            ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [
            /android.+(mi[\s\-_]*(?:pad)?(?:[\s_]*[\w\s]+)?)\s+build/i          // Mi Pad tablets
            ],[[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, TABLET]], [
            /android.+;\s(m[1-5]\snote)\sbuild/i                                // Meizu Tablet
            ], [MODEL, [VENDOR, 'Meizu'], [TYPE, TABLET]], [

            /android.+a000(1)\s+build/i                                         // OnePlus
            ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(RCT[\d\w]+)\s+build/i                            // RCA Tablets
            ], [MODEL, [VENDOR, 'RCA'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Venue[\d\s]*)\s+build/i                          // Dell Venue Tablets
            ], [MODEL, [VENDOR, 'Dell'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Q[T|M][\d\w]+)\s+build/i                         // Verizon Tablet
            ], [MODEL, [VENDOR, 'Verizon'], [TYPE, TABLET]], [

            /android.+[;\/]\s+(Barnes[&\s]+Noble\s+|BN[RT])(V?.*)\s+build/i     // Barnes & Noble Tablet
            ], [[VENDOR, 'Barnes & Noble'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s+(TM\d{3}.*\b)\s+build/i                           // Barnes & Noble Tablet
            ], [MODEL, [VENDOR, 'NuVision'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(zte)?.+(k\d{2})\s+build/i                        // ZTE K Series Tablet
            ], [[VENDOR, 'ZTE'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(gen\d{3})\s+build.*49h/i                         // Swiss GEN Mobile
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(zur\d{3})\s+build/i                              // Swiss ZUR Tablet
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((Zeki)?TB.*\b)\s+build/i                         // Zeki Tablets
            ], [MODEL, [VENDOR, 'Zeki'], [TYPE, TABLET]], [

            /(android).+[;\/]\s+([YR]\d{2}x?.*)\s+build/i,
            /android.+[;\/]\s+(Dragon[\-\s]+Touch\s+|DT)(.+)\s+build/i          // Dragon Touch Tablet
            ], [[VENDOR, 'Dragon Touch'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(NS-?.+)\s+build/i                                // Insignia Tablets
            ], [MODEL, [VENDOR, 'Insignia'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((NX|Next)-?.+)\s+build/i                         // NextBook Tablets
            ], [MODEL, [VENDOR, 'NextBook'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Xtreme\_?)?(V(1[045]|2[015]|30|40|60|7[05]|90))\s+build/i
            ], [[VENDOR, 'Voice'], MODEL, [TYPE, MOBILE]], [                    // Voice Xtreme Phones

            /android.+[;\/]\s*(LVTEL\-?)?(V1[12])\s+build/i                     // LvTel Phones
            ], [[VENDOR, 'LvTel'], MODEL, [TYPE, MOBILE]], [

            /android.+[;\/]\s*(V(100MD|700NA|7011|917G).*\b)\s+build/i          // Envizen Tablets
            ], [MODEL, [VENDOR, 'Envizen'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Le[\s\-]+Pan)[\s\-]+(.*\b)\s+build/i             // Le Pan Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trio[\s\-]*.*)\s+build/i                         // MachSpeed Tablets
            ], [MODEL, [VENDOR, 'MachSpeed'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trinity)[\-\s]*(T\d{3})\s+build/i                // Trinity Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*TU_(1491)\s+build/i                               // Rotor Tablets
            ], [MODEL, [VENDOR, 'Rotor'], [TYPE, TABLET]], [

            /android.+(KS(.+))\s+build/i                                        // Amazon Kindle Tablets
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [

            /android.+(Gigaset)[\s\-]+(Q.+)\s+build/i                           // Gigaset Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /\s(tablet|tab)[;\/]/i,                                             // Unidentifiable Tablet
            /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
            ], [[TYPE, util.lowerize], VENDOR, MODEL], [

            /(android.+)[;\/].+build/i                                          // Generic Android Device
            ], [MODEL, [VENDOR, 'Generic']]


        /*//////////////////////////
            // TODO: move to string map
            ////////////////////////////

            /(C6603)/i                                                          // Sony Xperia Z C6603
            ], [[MODEL, 'Xperia Z C6603'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [
            /(C6903)/i                                                          // Sony Xperia Z 1
            ], [[MODEL, 'Xperia Z 1'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /(SM-G900[F|H])/i                                                   // Samsung Galaxy S5
            ], [[MODEL, 'Galaxy S5'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G7102)/i                                                       // Samsung Galaxy Grand 2
            ], [[MODEL, 'Galaxy Grand 2'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G530H)/i                                                       // Samsung Galaxy Grand Prime
            ], [[MODEL, 'Galaxy Grand Prime'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G313HZ)/i                                                      // Samsung Galaxy V
            ], [[MODEL, 'Galaxy V'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T805)/i                                                        // Samsung Galaxy Tab S 10.5
            ], [[MODEL, 'Galaxy Tab S 10.5'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [
            /(SM-G800F)/i                                                       // Samsung Galaxy S5 Mini
            ], [[MODEL, 'Galaxy S5 Mini'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T311)/i                                                        // Samsung Galaxy Tab 3 8.0
            ], [[MODEL, 'Galaxy Tab 3 8.0'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [

            /(T3C)/i                                                            // Advan Vandroid T3C
            ], [MODEL, [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN T1J\+)/i                                                    // Advan Vandroid T1J+
            ], [[MODEL, 'Vandroid T1J+'], [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN S4A)/i                                                      // Advan Vandroid S4A
            ], [[MODEL, 'Vandroid S4A'], [VENDOR, 'Advan'], [TYPE, MOBILE]], [

            /(V972M)/i                                                          // ZTE V972M
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [

            /(i-mobile)\s(IQ\s[\d\.]+)/i                                        // i-mobile IQ
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(IQ6.3)/i                                                          // i-mobile IQ IQ 6.3
            ], [[MODEL, 'IQ 6.3'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
            /(i-mobile)\s(i-style\s[\d\.]+)/i                                   // i-mobile i-STYLE
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(i-STYLE2.1)/i                                                     // i-mobile i-STYLE 2.1
            ], [[MODEL, 'i-STYLE 2.1'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [

            /(mobiistar touch LAI 512)/i                                        // mobiistar touch LAI 512
            ], [[MODEL, 'Touch LAI 512'], [VENDOR, 'mobiistar'], [TYPE, MOBILE]], [

            /////////////
            // END TODO
            ///////////*/

        ],

        engine : [[

            /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
            ], [VERSION, [NAME, 'EdgeHTML']], [

            /(presto)\/([\w\.]+)/i,                                             // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
            ], [NAME, VERSION], [

            /rv\:([\w\.]+).*(gecko)/i                                           // Gecko
            ], [VERSION, NAME]
        ],

        os : [[

            // Windows based
            /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
            ], [NAME, VERSION], [
            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
            /(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s]+\w)*/i,                  // Windows Phone
            /(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
            ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
            ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

            // Mobile/Embedded OS
            /\((bb)(10);/i                                                      // BlackBerry 10
            ], [[NAME, 'BlackBerry'], VERSION], [
            /(blackberry)\w*\/?([\w\.]+)*/i,                                    // Blackberry
            /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
            /(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,
                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
            /linux;.+(sailfish);/i                                              // Sailfish OS
            ], [NAME, VERSION], [
            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i                 // Symbian
            ], [[NAME, 'Symbian'], VERSION], [
            /\((series40);/i                                                    // Series 40
            ], [NAME], [
            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
            ], [[NAME, 'Firefox OS'], VERSION], [

            // Console
            /(nintendo|playstation)\s([wids34portablevu]+)/i,                   // Nintendo/Playstation

            // GNU/Linux based
            /(mint)[\/\s\(]?(\w+)*/i,                                           // Mint
            /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
            /(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]+)*/i,
                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
            /(hurd|linux)\s?([\w\.]+)*/i,                                       // Hurd/Linux
            /(gnu)\s?([\w\.]+)*/i                                               // GNU
            ], [NAME, VERSION], [

            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
            ], [[NAME, 'Chromium OS'], VERSION],[

            // Solaris
            /(sunos)\s?([\w\.]+\d)*/i                                           // Solaris
            ], [[NAME, 'Solaris'], VERSION], [

            // BSD based
            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i                   // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
            ], [NAME, VERSION],[

            /(haiku)\s(\w+)/i                                                  // Haiku
            ], [NAME, VERSION],[

            /cfnetwork\/.+darwin/i,
            /ip[honead]+(?:.*os\s([\w]+)\slike\smac|;\sopera)/i                 // iOS
            ], [[VERSION, /_/g, '.'], [NAME, 'iOS']], [

            /(mac\sos\sx)\s?([\w\s\.]+\w)*/i,
            /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
            ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

            // Other
            /((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,                            // Solaris
            /(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,                               // AIX
            /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,
                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS
            /(unix)\s?([\w\.]+)*/i                                              // UNIX
            ], [NAME, VERSION]
        ]
    };


    /////////////////
    // Constructor
    ////////////////
    /*
    var Browser = function (name, version) {
        this[NAME] = name;
        this[VERSION] = version;
    };
    var CPU = function (arch) {
        this[ARCHITECTURE] = arch;
    };
    var Device = function (vendor, model, type) {
        this[VENDOR] = vendor;
        this[MODEL] = model;
        this[TYPE] = type;
    };
    var Engine = Browser;
    var OS = Browser;
    */
    var UAParser = function (uastring, extensions) {

        if (typeof uastring === 'object') {
            extensions = uastring;
            uastring = undefined;
        }

        if (!(this instanceof UAParser)) {
            return new UAParser(uastring, extensions).getResult();
        }

        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
        var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;
        //var browser = new Browser();
        //var cpu = new CPU();
        //var device = new Device();
        //var engine = new Engine();
        //var os = new OS();

        this.getBrowser = function () {
            var browser = { name: undefined, version: undefined };
            mapper.rgx.call(browser, ua, rgxmap.browser);
            browser.major = util.major(browser.version); // deprecated
            return browser;
        };
        this.getCPU = function () {
            var cpu = { architecture: undefined };
            mapper.rgx.call(cpu, ua, rgxmap.cpu);
            return cpu;
        };
        this.getDevice = function () {
            var device = { vendor: undefined, model: undefined, type: undefined };
            mapper.rgx.call(device, ua, rgxmap.device);
            return device;
        };
        this.getEngine = function () {
            var engine = { name: undefined, version: undefined };
            mapper.rgx.call(engine, ua, rgxmap.engine);
            return engine;
        };
        this.getOS = function () {
            var os = { name: undefined, version: undefined };
            mapper.rgx.call(os, ua, rgxmap.os);
            return os;
        };
        this.getResult = function () {
            return {
                ua      : this.getUA(),
                browser : this.getBrowser(),
                engine  : this.getEngine(),
                os      : this.getOS(),
                device  : this.getDevice(),
                cpu     : this.getCPU()
            };
        };
        this.getUA = function () {
            return ua;
        };
        this.setUA = function (uastring) {
            ua = uastring;
            //browser = new Browser();
            //cpu = new CPU();
            //device = new Device();
            //engine = new Engine();
            //os = new OS();
            return this;
        };
        return this;
    };

    UAParser.VERSION = LIBVERSION;
    UAParser.BROWSER = {
        NAME    : NAME,
        MAJOR   : MAJOR, // deprecated
        VERSION : VERSION
    };
    UAParser.CPU = {
        ARCHITECTURE : ARCHITECTURE
    };
    UAParser.DEVICE = {
        MODEL   : MODEL,
        VENDOR  : VENDOR,
        TYPE    : TYPE,
        CONSOLE : CONSOLE,
        MOBILE  : MOBILE,
        SMARTTV : SMARTTV,
        TABLET  : TABLET,
        WEARABLE: WEARABLE,
        EMBEDDED: EMBEDDED
    };
    UAParser.ENGINE = {
        NAME    : NAME,
        VERSION : VERSION
    };
    UAParser.OS = {
        NAME    : NAME,
        VERSION : VERSION
    };
    //UAParser.Utils = util;

    ///////////
    // Export
    //////////


    // check js environment
    if (typeof(exports) !== UNDEF_TYPE) {
        // nodejs env
        if (typeof module !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser;
        }
        // TODO: test!!!!!!!!
        /*
        if (require && require.main === module && process) {
            // cli
            var jsonize = function (arr) {
                var res = [];
                for (var i in arr) {
                    res.push(new UAParser(arr[i]).getResult());
                }
                process.stdout.write(JSON.stringify(res, null, 2) + '\n');
            };
            if (process.stdin.isTTY) {
                // via args
                jsonize(process.argv.slice(2));
            } else {
                // via pipe
                var str = '';
                process.stdin.on('readable', function() {
                    var read = process.stdin.read();
                    if (read !== null) {
                        str += read;
                    }
                });
                process.stdin.on('end', function () {
                    jsonize(str.replace(/\n$/, '').split('\n'));
                });
            }
        }
        */
        exports.UAParser = UAParser;
    } else {
        // requirejs env (optional)
        if (typeof(define) === FUNC_TYPE && define.amd) {
            define(function () {
                return UAParser;
            });
        } else if (window) {
            // browser env
            window.UAParser = UAParser;
        }
    }

    // jQuery/Zepto specific (optional)
    // Note:
    //   In AMD env the global scope should be kept clean, but jQuery is an exception.
    //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
    //   and we should catch that.
    var $ = window && (window.jQuery || window.Zepto);
    if (typeof $ !== UNDEF_TYPE) {
        var parser = new UAParser();
        $.ua = parser.getResult();
        $.ua.get = function () {
            return parser.getUA();
        };
        $.ua.set = function (uastring) {
            parser.setUA(uastring);
            var result = parser.getResult();
            for (var prop in result) {
                $.ua[prop] = result[prop];
            }
        };
    }

})(typeof window === 'object' ? window : this);

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:livechat/livechat.js");
require("/node_modules/meteor/rocketchat:livechat/server/startup.js");
require("/node_modules/meteor/rocketchat:livechat/server/visitorStatus.js");
require("/node_modules/meteor/rocketchat:livechat/permissions.js");
require("/node_modules/meteor/rocketchat:livechat/messageTypes.js");
require("/node_modules/meteor/rocketchat:livechat/config.js");
require("/node_modules/meteor/rocketchat:livechat/server/roomType.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/externalMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/leadCapture.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/markRoomResponded.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/offlineMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/RDStation.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/sendToCRM.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/sendToFacebook.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/addAgent.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/addManager.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/changeLivechatStatus.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/closeByVisitor.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/closeRoom.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/facebook.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getCustomFields.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getAgentData.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getInitialData.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getNextAgent.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/loadHistory.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/loginByToken.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/pageVisited.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/registerGuest.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeAgent.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeCustomField.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeDepartment.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeManager.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeTrigger.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeRoom.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveAppearance.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveCustomField.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveDepartment.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveInfo.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveIntegration.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveSurveyFeedback.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveTrigger.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/searchAgent.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/sendMessageLivechat.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/sendFileLivechatMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/sendOfflineMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/setCustomField.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/setDepartmentForVisitor.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/startVideoCall.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/startFileUploadRoom.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/transfer.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/webhookTest.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/takeInquiry.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/returnAsInquiry.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveOfficeHours.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/sendTranscript.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/Users.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/Rooms.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/Messages.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatExternalMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatCustomField.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatDepartment.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatDepartmentAgents.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatPageVisited.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatTrigger.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/indexes.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatInquiry.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatOfficeHour.js");
require("/node_modules/meteor/rocketchat:livechat/server/lib/Livechat.js");
require("/node_modules/meteor/rocketchat:livechat/server/lib/QueueMethods.js");
require("/node_modules/meteor/rocketchat:livechat/server/lib/OfficeClock.js");
require("/node_modules/meteor/rocketchat:livechat/server/sendMessageBySMS.js");
require("/node_modules/meteor/rocketchat:livechat/server/unclosedLivechats.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/customFields.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/departmentAgents.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/externalMessages.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatAgents.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatAppearance.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatDepartments.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatIntegration.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatManagers.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatRooms.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatQueue.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatTriggers.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/visitorHistory.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/visitorInfo.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/visitorPageVisited.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatInquiries.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatOfficeHours.js");
require("/node_modules/meteor/rocketchat:livechat/server/api.js");

/* Exports */
Package._define("rocketchat:livechat");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_livechat.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9saXZlY2hhdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvc3RhcnR1cC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvdmlzaXRvclN0YXR1cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcm9vbVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2hvb2tzL2V4dGVybmFsTWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvaG9va3MvbGVhZENhcHR1cmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2hvb2tzL21hcmtSb29tUmVzcG9uZGVkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9ob29rcy9vZmZsaW5lTWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvaG9va3MvUkRTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9ob29rcy9zZW5kVG9DUk0uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2hvb2tzL3NlbmRUb0ZhY2Vib29rLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2FkZEFnZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2FkZE1hbmFnZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvY2hhbmdlTGl2ZWNoYXRTdGF0dXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvY2xvc2VCeVZpc2l0b3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvY2xvc2VSb29tLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2ZhY2Vib29rLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2dldEN1c3RvbUZpZWxkcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9nZXRBZ2VudERhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvZ2V0SW5pdGlhbERhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvZ2V0TmV4dEFnZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2xvYWRIaXN0b3J5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2xvZ2luQnlUb2tlbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9wYWdlVmlzaXRlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9yZWdpc3Rlckd1ZXN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZUFnZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZUN1c3RvbUZpZWxkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZURlcGFydG1lbnQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvcmVtb3ZlTWFuYWdlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9yZW1vdmVUcmlnZ2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZVJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZUFwcGVhcmFuY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZUN1c3RvbUZpZWxkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NhdmVEZXBhcnRtZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NhdmVJbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NhdmVJbnRlZ3JhdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9zYXZlU3VydmV5RmVlZGJhY2suanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZVRyaWdnZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2VhcmNoQWdlbnQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2VuZE1lc3NhZ2VMaXZlY2hhdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9zZW5kRmlsZUxpdmVjaGF0TWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9zZW5kT2ZmbGluZU1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2V0Q3VzdG9tRmllbGQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2V0RGVwYXJ0bWVudEZvclZpc2l0b3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc3RhcnRWaWRlb0NhbGwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc3RhcnRGaWxlVXBsb2FkUm9vbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy90cmFuc2Zlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy93ZWJob29rVGVzdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy90YWtlSW5xdWlyeS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9yZXR1cm5Bc0lucXVpcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZU9mZmljZUhvdXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NlbmRUcmFuc2NyaXB0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvVXNlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9Sb29tcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL01lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdEN1c3RvbUZpZWxkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXREZXBhcnRtZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRQYWdlVmlzaXRlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VHJpZ2dlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL2luZGV4ZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdElucXVpcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdE9mZmljZUhvdXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9saWIvTGl2ZWNoYXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2xpYi9RdWV1ZU1ldGhvZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2xpYi9PZmZpY2VDbG9jay5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbGliL09tbmlDaGFubmVsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9zZW5kTWVzc2FnZUJ5U01TLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci91bmNsb3NlZExpdmVjaGF0cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2N1c3RvbUZpZWxkcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2RlcGFydG1lbnRBZ2VudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9leHRlcm5hbE1lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRBZ2VudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdEFwcGVhcmFuY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdERlcGFydG1lbnRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRJbnRlZ3JhdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2xpdmVjaGF0TWFuYWdlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdFJvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRRdWV1ZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2xpdmVjaGF0VHJpZ2dlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy92aXNpdG9ySGlzdG9yeS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL3Zpc2l0b3JJbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvdmlzaXRvclBhZ2VWaXNpdGVkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRJbnF1aXJpZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdE9mZmljZUhvdXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9hcGkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvcGVybWlzc2lvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvbWVzc2FnZVR5cGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L2NvbmZpZy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9pbXBvcnRzL0xpdmVjaGF0Um9vbVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC9kZXBhcnRtZW50cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9pbXBvcnRzL3NlcnZlci9yZXN0L2ZhY2Vib29rLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L2ltcG9ydHMvc2VydmVyL3Jlc3QvbWVzc2FnZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC9zbXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC91cGxvYWQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC91c2Vycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9pbXBvcnRzL3NlcnZlci9yZXN0L3Zpc2l0b3JzLmpzIl0sIm5hbWVzIjpbIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsInVybCIsIldlYkFwcCIsIlBhY2thZ2UiLCJ3ZWJhcHAiLCJBdXRvdXBkYXRlIiwiYXV0b3VwZGF0ZSIsImNvbm5lY3RIYW5kbGVycyIsInVzZSIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsInJlcSIsInJlcyIsIm5leHQiLCJyZXFVcmwiLCJwYXJzZSIsInBhdGhuYW1lIiwic2V0SGVhZGVyIiwiZG9tYWluV2hpdGVMaXN0IiwiUm9ja2V0Q2hhdCIsInNldHRpbmdzIiwiZ2V0IiwiaGVhZGVycyIsInJlZmVyZXIiLCJpc0VtcHR5IiwidHJpbSIsIm1hcCIsInNwbGl0IiwiZG9tYWluIiwiY29udGFpbnMiLCJob3N0IiwicHJvdG9jb2wiLCJoZWFkIiwiQXNzZXRzIiwiZ2V0VGV4dCIsImJhc2VVcmwiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJ0ZXN0IiwiaHRtbCIsImF1dG91cGRhdGVWZXJzaW9uIiwiSlNPTiIsInN0cmluZ2lmeSIsIndyaXRlIiwiZW5kIiwic3RhcnR1cCIsInJvb21UeXBlcyIsInNldFJvb21GaW5kIiwiX2lkIiwibW9kZWxzIiwiUm9vbXMiLCJmaW5kTGl2ZWNoYXRCeUlkIiwiZmV0Y2giLCJhdXRoeiIsImFkZFJvb21BY2Nlc3NWYWxpZGF0b3IiLCJyb29tIiwidXNlciIsInQiLCJoYXNQZXJtaXNzaW9uIiwiZXh0cmFEYXRhIiwicmlkIiwiZmluZE9uZUJ5SWQiLCJ2aXNpdG9yVG9rZW4iLCJ0b2tlbiIsImNhbGxiYWNrcyIsImFkZCIsIkVycm9yIiwiVEFQaTE4biIsIl9fIiwibG5nIiwibGFuZ3VhZ2UiLCJwcmlvcml0eSIsIkxPVyIsIlVzZXJQcmVzZW5jZUV2ZW50cyIsIm9uIiwic2Vzc2lvbiIsInN0YXR1cyIsIm1ldGFkYXRhIiwidmlzaXRvciIsIkxpdmVjaGF0SW5xdWlyeSIsInVwZGF0ZVZpc2l0b3JTdGF0dXMiLCJMaXZlY2hhdFJvb21UeXBlIiwiTGl2ZWNoYXRWaXNpdG9ycyIsIkxpdmVjaGF0Um9vbVR5cGVTZXJ2ZXIiLCJnZXRNc2dTZW5kZXIiLCJzZW5kZXJJZCIsImdldE5vdGlmaWNhdGlvbkRldGFpbHMiLCJub3RpZmljYXRpb25NZXNzYWdlIiwidGl0bGUiLCJyb29tTmFtZSIsInRleHQiLCJjYW5BY2Nlc3NVcGxvYWRlZEZpbGUiLCJyY190b2tlbiIsInJjX3JpZCIsImZpbmRPbmVPcGVuQnlWaXNpdG9yVG9rZW4iLCJrbm93bGVkZ2VFbmFibGVkIiwiYXBpYWlLZXkiLCJhcGlhaUxhbmd1YWdlIiwia2V5IiwidmFsdWUiLCJtZXNzYWdlIiwiZWRpdGVkQXQiLCJkZWZlciIsInJlc3BvbnNlIiwiSFRUUCIsInBvc3QiLCJkYXRhIiwicXVlcnkiLCJtc2ciLCJsYW5nIiwic2Vzc2lvbklkIiwiQXV0aG9yaXphdGlvbiIsImNvZGUiLCJyZXN1bHQiLCJmdWxmaWxsbWVudCIsInNwZWVjaCIsIkxpdmVjaGF0RXh0ZXJuYWxNZXNzYWdlIiwiaW5zZXJ0Iiwib3JpZyIsInRzIiwiRGF0ZSIsImUiLCJTeXN0ZW1Mb2dnZXIiLCJlcnJvciIsInZhbGlkYXRlTWVzc2FnZSIsInBob25lUmVnZXhwIiwiUmVnRXhwIiwibXNnUGhvbmVzIiwibWF0Y2giLCJlbWFpbFJlZ2V4cCIsIm1zZ0VtYWlscyIsInNhdmVHdWVzdEVtYWlsUGhvbmVCeUlkIiwicnVuIiwid2FpdGluZ1Jlc3BvbnNlIiwibm93Iiwic2V0UmVzcG9uc2VCeVJvb21JZCIsInUiLCJ1c2VybmFtZSIsInJlc3BvbnNlRGF0ZSIsInJlc3BvbnNlVGltZSIsImdldFRpbWUiLCJwb3N0RGF0YSIsInR5cGUiLCJzZW50QXQiLCJuYW1lIiwiZW1haWwiLCJMaXZlY2hhdCIsInNlbmRSZXF1ZXN0IiwiTUVESVVNIiwic2VuZFRvUkRTdGF0aW9uIiwibGl2ZWNoYXREYXRhIiwiZ2V0TGl2ZWNoYXRSb29tR3Vlc3RJbmZvIiwib3B0aW9ucyIsInRva2VuX3Jkc3RhdGlvbiIsImlkZW50aWZpY2Fkb3IiLCJjbGllbnRfaWQiLCJub21lIiwicGhvbmUiLCJ0ZWxlZm9uZSIsInRhZ3MiLCJPYmplY3QiLCJrZXlzIiwiY3VzdG9tRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkIiwiY2FsbCIsImNvbnNvbGUiLCJtc2dOYXZUeXBlIiwic2VuZE1lc3NhZ2VUeXBlIiwibXNnVHlwZSIsInNlbmROYXZIaXN0b3J5Iiwic2VuZFRvQ1JNIiwiaW5jbHVkZU1lc3NhZ2VzIiwibWVzc2FnZXMiLCJNZXNzYWdlcyIsImZpbmRWaXNpYmxlQnlSb29tSWQiLCJzb3J0IiwiQXJyYXkiLCJhZ2VudElkIiwibmF2aWdhdGlvbiIsInB1c2giLCJzYXZlQ1JNRGF0YUJ5Um9vbUlkIiwib3BlbiIsIk9tbmlDaGFubmVsIiwiZmFjZWJvb2siLCJyZXBseSIsInBhZ2UiLCJpZCIsIm1ldGhvZHMiLCJ1c2VySWQiLCJtZXRob2QiLCJhZGRBZ2VudCIsImFkZE1hbmFnZXIiLCJuZXdTdGF0dXMiLCJzdGF0dXNMaXZlY2hhdCIsIlVzZXJzIiwic2V0TGl2ZWNoYXRTdGF0dXMiLCJyb29tSWQiLCJnZXRWaXNpdG9yQnlUb2tlbiIsImNsb3NlUm9vbSIsImNvbW1lbnQiLCJzdWJzY3JpcHRpb24iLCJTdWJzY3JpcHRpb25zIiwiZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkIiwiYWN0aW9uIiwiZW5hYmxlZCIsImhhc1Rva2VuIiwiZW5hYmxlIiwic3VjY2VzcyIsInVwZGF0ZUJ5SWQiLCJkaXNhYmxlIiwibGlzdFBhZ2VzIiwic3Vic2NyaWJlIiwidW5zdWJzY3JpYmUiLCJMaXZlY2hhdEN1c3RvbUZpZWxkIiwiZmluZCIsImNoZWNrIiwiU3RyaW5nIiwic2VydmVkQnkiLCJnZXRBZ2VudEluZm8iLCJkZXBhcnRtZW50SWQiLCJpbmZvIiwiY29sb3IiLCJyZWdpc3RyYXRpb25Gb3JtIiwidHJpZ2dlcnMiLCJkZXBhcnRtZW50cyIsImFsbG93U3dpdGNoaW5nRGVwYXJ0bWVudHMiLCJvbmxpbmUiLCJvZmZsaW5lQ29sb3IiLCJvZmZsaW5lTWVzc2FnZSIsIm9mZmxpbmVTdWNjZXNzTWVzc2FnZSIsIm9mZmxpbmVVbmF2YWlsYWJsZU1lc3NhZ2UiLCJkaXNwbGF5T2ZmbGluZUZvcm0iLCJ2aWRlb0NhbGwiLCJmaWxlVXBsb2FkIiwiY29udmVyc2F0aW9uRmluaXNoZWRNZXNzYWdlIiwibmFtZUZpZWxkUmVnaXN0cmF0aW9uRm9ybSIsImVtYWlsRmllbGRSZWdpc3RyYXRpb25Gb3JtIiwiZmllbGRzIiwiY2wiLCJ1c2VybmFtZXMiLCJmaW5kT3BlbkJ5VmlzaXRvclRva2VuQW5kRGVwYXJ0bWVudElkIiwiZmluZE9wZW5CeVZpc2l0b3JUb2tlbiIsImxlbmd0aCIsInZpc2l0b3JFbWFpbHMiLCJkZXBhcnRtZW50IiwiaW5pdFNldHRpbmdzIiwiZ2V0SW5pdFNldHRpbmdzIiwiTGl2ZWNoYXRfdGl0bGUiLCJMaXZlY2hhdF90aXRsZV9jb2xvciIsIkxpdmVjaGF0X2VuYWJsZWQiLCJMaXZlY2hhdF9yZWdpc3RyYXRpb25fZm9ybSIsIm9mZmxpbmVUaXRsZSIsIkxpdmVjaGF0X29mZmxpbmVfdGl0bGUiLCJMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yIiwiTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlIiwiTGl2ZWNoYXRfb2ZmbGluZV9zdWNjZXNzX21lc3NhZ2UiLCJMaXZlY2hhdF9vZmZsaW5lX2Zvcm1fdW5hdmFpbGFibGUiLCJMaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybSIsIkxhbmd1YWdlIiwiTGl2ZWNoYXRfdmlkZW9jYWxsX2VuYWJsZWQiLCJKaXRzaV9FbmFibGVkIiwiTGl2ZWNoYXRfZmlsZXVwbG9hZF9lbmFibGVkIiwiRmlsZVVwbG9hZF9FbmFibGVkIiwidHJhbnNjcmlwdCIsIkxpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0IiwidHJhbnNjcmlwdE1lc3NhZ2UiLCJMaXZlY2hhdF90cmFuc2NyaXB0X21lc3NhZ2UiLCJMaXZlY2hhdF9jb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZSIsIkxpdmVjaGF0X25hbWVfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0iLCJMaXZlY2hhdF9lbWFpbF9maWVsZF9yZWdpc3RyYXRpb25fZm9ybSIsImFnZW50RGF0YSIsIkxpdmVjaGF0VHJpZ2dlciIsImZpbmRFbmFibGVkIiwidHJpZ2dlciIsInBpY2siLCJMaXZlY2hhdERlcGFydG1lbnQiLCJmaW5kRW5hYmxlZFdpdGhBZ2VudHMiLCJMaXZlY2hhdF9hbGxvd19zd2l0Y2hpbmdfZGVwYXJ0bWVudHMiLCJmaW5kT25saW5lQWdlbnRzIiwiY291bnQiLCJyZXF1aXJlRGVwYXJtZW50IiwiZ2V0UmVxdWlyZWREZXBhcnRtZW50IiwiYWdlbnQiLCJnZXROZXh0QWdlbnQiLCJsaW1pdCIsImxzIiwibG9hZE1lc3NhZ2VIaXN0b3J5IiwicGFnZUluZm8iLCJzYXZlUGFnZUhpc3RvcnkiLCJyZWdpc3Rlckd1ZXN0Iiwia2VlcEhpc3RvcnlGb3JUb2tlbiIsImN1cnNvciIsInNhdmVSb29tSW5mbyIsImN1c3RvbUZpZWxkIiwic2NvcGUiLCJvdmVyd3JpdGUiLCJ1cGRhdGVMaXZlY2hhdERhdGFCeVRva2VuIiwicmVtb3ZlQWdlbnQiLCJyZW1vdmVCeUlkIiwicmVtb3ZlRGVwYXJ0bWVudCIsInJlbW92ZU1hbmFnZXIiLCJ0cmlnZ2VySWQiLCJyZW1vdmVCeVJvb21JZCIsInZhbGlkU2V0dGluZ3MiLCJ2YWxpZCIsImV2ZXJ5Iiwic2V0dGluZyIsImluZGV4T2YiLCJjdXN0b21GaWVsZERhdGEiLCJNYXRjaCIsIk9iamVjdEluY2x1ZGluZyIsImxhYmVsIiwidmlzaWJpbGl0eSIsImNyZWF0ZU9yVXBkYXRlQ3VzdG9tRmllbGQiLCJkZXBhcnRtZW50RGF0YSIsImRlcGFydG1lbnRBZ2VudHMiLCJzYXZlRGVwYXJ0bWVudCIsImd1ZXN0RGF0YSIsInJvb21EYXRhIiwiT3B0aW9uYWwiLCJ0b3BpYyIsInJldCIsInNhdmVHdWVzdCIsInMiLCJ2YWx1ZXMiLCJMaXZlY2hhdF93ZWJob29rVXJsIiwiTGl2ZWNoYXRfc2VjcmV0X3Rva2VuIiwiTGl2ZWNoYXRfd2ViaG9va19vbl9jbG9zZSIsIkxpdmVjaGF0X3dlYmhvb2tfb25fb2ZmbGluZV9tc2ciLCJMaXZlY2hhdF93ZWJob29rX29uX3Zpc2l0b3JfbWVzc2FnZSIsIkxpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZSIsInZpc2l0b3JSb29tIiwiZm9ybURhdGEiLCJ1bmRlZmluZWQiLCJ1cGRhdGVEYXRhIiwiaXRlbSIsInVwZGF0ZVN1cnZleUZlZWRiYWNrQnlJZCIsIk1heWJlIiwiZGVzY3JpcHRpb24iLCJCb29sZWFuIiwiY29uZGl0aW9ucyIsImFjdGlvbnMiLCJpc1N0cmluZyIsImZpbmRPbmVCeVVzZXJuYW1lIiwic2VuZE1lc3NhZ2VMaXZlY2hhdCIsImF0dGFjaG1lbnRzIiwiZ3Vlc3QiLCJzZW5kTWVzc2FnZSIsImZpbGUiLCJtc2dEYXRhIiwiYXZhdGFyIiwiZW1vamkiLCJhbGlhcyIsImdyb3VwYWJsZSIsImZpbGVVcmwiLCJlbmNvZGVVUkkiLCJhdHRhY2htZW50IiwidGl0bGVfbGluayIsInRpdGxlX2xpbmtfZG93bmxvYWQiLCJpbWFnZV91cmwiLCJpbWFnZV90eXBlIiwiaW1hZ2Vfc2l6ZSIsInNpemUiLCJpZGVudGlmeSIsImltYWdlX2RpbWVuc2lvbnMiLCJpbWFnZV9wcmV2aWV3IiwiRmlsZVVwbG9hZCIsInJlc2l6ZUltYWdlUHJldmlldyIsImF1ZGlvX3VybCIsImF1ZGlvX3R5cGUiLCJhdWRpb19zaXplIiwidmlkZW9fdXJsIiwidmlkZW9fdHlwZSIsInZpZGVvX3NpemUiLCJhc3NpZ24iLCJSYW5kb20iLCJkbnMiLCJoZWFkZXIiLCJwbGFjZWhvbGRlcnMiLCJyZXBsYWNlIiwiZm9vdGVyIiwiZnJvbUVtYWlsIiwiZW1haWxEb21haW4iLCJzdWJzdHIiLCJsYXN0SW5kZXhPZiIsIndyYXBBc3luYyIsInJlc29sdmVNeCIsIkVtYWlsIiwic2VuZCIsInRvIiwiZnJvbSIsInJlcGx5VG8iLCJzdWJqZWN0Iiwic3Vic3RyaW5nIiwiRERQUmF0ZUxpbWl0ZXIiLCJhZGRSdWxlIiwiY29ubmVjdGlvbklkIiwidHJhbnNmZXJEYXRhIiwidHJhbnNmZXIiLCJnZXRSb29tIiwiaml0c2lUaW1lb3V0IiwiY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsImFjdGlvbkxpbmtzIiwiaWNvbiIsImkxOG5MYWJlbCIsIm1ldGhvZF9pZCIsInBhcmFtcyIsImppdHNpUm9vbSIsImhhc1JvbGUiLCJwb3N0Q2F0Y2hFcnJvciIsInJlc29sdmUiLCJlcnIiLCJ1bmJsb2NrIiwic2FtcGxlRGF0YSIsImNyZWF0ZWRBdCIsImxhc3RNZXNzYWdlQXQiLCJwcm9kdWN0SWQiLCJpcCIsImJyb3dzZXIiLCJvcyIsImN1c3RvbWVySWQiLCJsb2ciLCJzdGF0dXNDb2RlIiwiaW5xdWlyeUlkIiwiaW5xdWlyeSIsInN1YnNjcmlwdGlvbkRhdGEiLCJhbGVydCIsInVucmVhZCIsInVzZXJNZW50aW9ucyIsImdyb3VwTWVudGlvbnMiLCJkZXNrdG9wTm90aWZpY2F0aW9ucyIsIm1vYmlsZVB1c2hOb3RpZmljYXRpb25zIiwiZW1haWxOb3RpZmljYXRpb25zIiwiaW5jVXNlcnNDb3VudEJ5SWQiLCJjaGFuZ2VBZ2VudEJ5Um9vbUlkIiwidGFrZUlucXVpcnkiLCJjcmVhdGVDb21tYW5kV2l0aFJvb21JZEFuZFVzZXIiLCJzdHJlYW0iLCJlbWl0IiwicmV0dXJuUm9vbUFzSW5xdWlyeSIsImRheSIsInN0YXJ0IiwiZmluaXNoIiwiTGl2ZWNoYXRPZmZpY2VIb3VyIiwidXBkYXRlSG91cnMiLCJtb21lbnQiLCJ1c2VyTGFuZ3VhZ2UiLCJmaW5kVmlzaWJsZUJ5Um9vbUlkTm90Q29udGFpbmluZ1R5cGVzIiwiYXV0aG9yIiwiZGF0ZXRpbWUiLCJsb2NhbGUiLCJmb3JtYXQiLCJzaW5nbGVNZXNzYWdlIiwiZW1haWxTZXR0aW5ncyIsInNldE9wZXJhdG9yIiwib3BlcmF0b3IiLCJ1cGRhdGUiLCIkc2V0IiwiJGV4aXN0cyIsIiRuZSIsInJvbGVzIiwiZmluZE9uZU9ubGluZUFnZW50QnlVc2VybmFtZSIsImZpbmRPbmUiLCJmaW5kQWdlbnRzIiwiZmluZE9ubGluZVVzZXJGcm9tTGlzdCIsInVzZXJMaXN0IiwiJGluIiwiY29uY2F0IiwiY29sbGVjdGlvbk9iaiIsIm1vZGVsIiwicmF3Q29sbGVjdGlvbiIsImZpbmRBbmRNb2RpZnkiLCJsaXZlY2hhdENvdW50IiwiJGluYyIsImNsb3NlT2ZmaWNlIiwic2VsZiIsIm9wZW5PZmZpY2UiLCJlbWFpbHMiLCJzdXJ2ZXlGZWVkYmFjayIsImZpbmRMaXZlY2hhdCIsImZpbHRlciIsIm9mZnNldCIsImV4dGVuZCIsInVwZGF0ZUxpdmVjaGF0Um9vbUNvdW50Iiwic2V0dGluZ3NSYXciLCJTZXR0aW5ncyIsImZpbmRCeVZpc2l0b3JUb2tlbiIsImZpbmRCeVZpc2l0b3JJZCIsInZpc2l0b3JJZCIsInJlc3BvbnNlQnkiLCIkdW5zZXQiLCJjbG9zZUJ5Um9vbUlkIiwiY2xvc2VJbmZvIiwiY2xvc2VyIiwiY2xvc2VkQnkiLCJjbG9zZWRBdCIsImNoYXREdXJhdGlvbiIsImZpbmRPcGVuQnlBZ2VudCIsIm5ld0FnZW50IiwiY2hhbmdlRGVwYXJ0bWVudElkQnlSb29tSWQiLCJjcm1EYXRhIiwicmVtb3ZlQWdlbnRCeVJvb21JZCIsImV4cGlyZUF0IiwibXVsdGkiLCJzZXRSb29tSWRCeVRva2VuIiwiX0Jhc2UiLCJjb25zdHJ1Y3RvciIsImlzQ2xpZW50IiwiX2luaXRNb2RlbCIsImZpbmRCeVJvb21JZCIsInJlY29yZCIsInJlbW92ZSIsInRyeUVuc3VyZUluZGV4IiwibnVtQWdlbnRzIiwiZmluZEJ5RGVwYXJ0bWVudElkIiwiY3JlYXRlT3JVcGRhdGVEZXBhcnRtZW50Iiwic2hvd09uUmVnaXN0cmF0aW9uIiwiYWdlbnRzIiwic2F2ZWRBZ2VudHMiLCJwbHVjayIsIkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cyIsImFnZW50c1RvU2F2ZSIsImRpZmZlcmVuY2UiLCJyZW1vdmVCeURlcGFydG1lbnRJZEFuZEFnZW50SWQiLCJzYXZlQWdlbnQiLCJwYXJzZUludCIsIm9yZGVyIiwiJGd0IiwidXBzZXJ0IiwiZ2V0TmV4dEFnZW50Rm9yRGVwYXJ0bWVudCIsIm9ubGluZVVzZXJzIiwib25saW5lVXNlcm5hbWVzIiwiZ2V0T25saW5lRm9yRGVwYXJ0bWVudCIsImRlcEFnZW50cyIsImZpbmRVc2Vyc0luUXVldWUiLCJ1c2Vyc0xpc3QiLCJyZXBsYWNlVXNlcm5hbWVPZkFnZW50QnlVc2VySWQiLCJMaXZlY2hhdFBhZ2VWaXNpdGVkIiwic3BhcnNlIiwiZXhwaXJlQWZ0ZXJTZWNvbmRzIiwic2F2ZUJ5VG9rZW4iLCJrZWVwSGlzdG9yeU1pbGlzZWNvbmRzIiwiZmluZEJ5VG9rZW4iLCJyZW1vdmVBbGwiLCJmaW5kQnlJZCIsIm9wZW5JbnF1aXJ5Iiwib3BlbklucXVpcnlXaXRoQWdlbnRzIiwiYWdlbnRJZHMiLCJnZXRTdGF0dXMiLCJuZXdTdGFydCIsIm5ld0ZpbmlzaCIsIm5ld09wZW4iLCJpc05vd1dpdGhpbkhvdXJzIiwiY3VycmVudFRpbWUiLCJ1dGMiLCJ0b2RheXNPZmZpY2VIb3VycyIsImlzQmVmb3JlIiwiaXNCZXR3ZWVuIiwiaXNPcGVuaW5nVGltZSIsImlzU2FtZSIsImlzQ2xvc2luZ1RpbWUiLCJmaW5kVmlzaXRvckJ5VG9rZW4iLCJmaW5kT25lVmlzaXRvckJ5UGhvbmUiLCJnZXROZXh0VmlzaXRvclVzZXJuYW1lIiwic2F2ZUd1ZXN0QnlJZCIsInNldERhdGEiLCJ1bnNldERhdGEiLCJhZGRyZXNzIiwicGhvbmVOdW1iZXIiLCJmaW5kT25lR3Vlc3RCeUVtYWlsQWRkcmVzcyIsImVtYWlsQWRkcmVzcyIsImVzY2FwZVJlZ0V4cCIsInBob25lcyIsIiRhZGRUb1NldCIsInNhdmVFbWFpbCIsIiRlYWNoIiwic2F2ZVBob25lIiwiZXhwb3J0RGVmYXVsdCIsIlVBUGFyc2VyIiwiaGlzdG9yeU1vbml0b3JUeXBlIiwibG9nZ2VyIiwiTG9nZ2VyIiwic2VjdGlvbnMiLCJ3ZWJob29rIiwiaSIsInF1ZXJ5U3RyaW5nIiwiQWNjZXB0IiwiZ2V0QWdlbnRzIiwiZ2V0T25saW5lQWdlbnRzIiwib25saW5lUmVxdWlyZWQiLCJkZXB0Iiwib25saW5lQWdlbnRzIiwicm9vbUluZm8iLCJuZXdSb29tIiwicm91dGluZ01ldGhvZCIsIlF1ZXVlTWV0aG9kcyIsInNob3dDb25uZWN0aW5nIiwidXBkYXRlVXNlciIsImV4aXN0aW5nVXNlciIsInVzZXJEYXRhIiwiY29ubmVjdGlvbiIsInVzZXJBZ2VudCIsImh0dHBIZWFkZXJzIiwiY2xpZW50QWRkcmVzcyIsIm51bWJlciIsInNldERlcGFydG1lbnRGb3JHdWVzdCIsImNsb3NlRGF0YSIsImhpZGVCeVJvb21JZEFuZFVzZXJJZCIsImZpbmROb3RIaWRkZW5QdWJsaWMiLCJzZXRUb3BpY0FuZFRhZ3NCeUlkIiwic2V0Rm5hbWVCeUlkIiwidXBkYXRlRGlzcGxheU5hbWVCeVJvb21JZCIsImNsb3NlT3BlbkNoYXRzIiwiZm9yd2FyZE9wZW5DaGF0cyIsImNoYW5nZSIsInBhZ2VUaXRsZSIsInBhZ2VVcmwiLCJsb2NhdGlvbiIsImhyZWYiLCJfaGlkZGVuIiwiY3JlYXRlTmF2aWdhdGlvbkhpc3RvcnlXaXRoUm9vbUlkTWVzc2FnZUFuZFVzZXIiLCJyZW1vdmVCeVJvb21JZEFuZFVzZXJJZCIsImNyZWF0ZVVzZXJMZWF2ZVdpdGhSb29tSWRBbmRVc2VyIiwiY3JlYXRlVXNlckpvaW5XaXRoUm9vbUlkQW5kVXNlciIsIm9wZW5JbnEiLCJjYWxsYmFjayIsInRyeWluZyIsIndhcm4iLCJzZXRUaW1lb3V0IiwidWEiLCJzZXRVQSIsImZuYW1lIiwibG0iLCJnZXRPUyIsInZlcnNpb24iLCJnZXRCcm93c2VyIiwiYWRkVXNlclJvbGVzIiwicmVtb3ZlVXNlckZyb21Sb2xlcyIsIlN0cmVhbWVyIiwiYWxsb3dSZWFkIiwibXNncyIsInVzZXJzQ291bnQiLCJzZXRJbnRlcnZhbCIsImdhdGV3YXlVUkwiLCJhdXRob3JpemF0aW9uIiwicGFnZUlkIiwiU01TIiwic21zIiwiU01TU2VydmljZSIsImdldFNlcnZpY2UiLCJhZ2VudHNIYW5kbGVyIiwibW9uaXRvckFnZW50cyIsImFjdGlvblRpbWVvdXQiLCJ1c2VycyIsInF1ZXVlIiwiY2xlYXJUaW1lb3V0IiwiZXhpc3RzIiwicnVuQWdlbnRMZWF2ZUFjdGlvbiIsIm9ic2VydmVDaGFuZ2VzIiwiYWRkZWQiLCJjaGFuZ2VkIiwicmVtb3ZlZCIsInN0b3AiLCJVc2VyUHJlc2VuY2VNb25pdG9yIiwib25TZXRVc2VyU3RhdHVzIiwicHVibGlzaCIsImhhbmRsZSIsImdldFVzZXJzSW5Sb2xlIiwicmVhZHkiLCJvblN0b3AiLCJmaW5kQnlJZHMiLCIkZ3RlIiwic2V0RGF0ZSIsImdldERhdGUiLCJzZXRTZWNvbmRzIiwiZ2V0U2Vjb25kcyIsIiRsdGUiLCJoYW5kbGVEZXB0cyIsImZpbmRCeVJvb21JZEFuZFR5cGUiLCJSb2xlcyIsImNyZWF0ZU9yVXBkYXRlIiwiUGVybWlzc2lvbnMiLCJNZXNzYWdlVHlwZXMiLCJyZWdpc3RlclR5cGUiLCJzeXN0ZW0iLCJoaXN0b3J5IiwicmVnaXN0ZXIiLCJpbnN0YW5jZSIsInRhYkJhciIsImlzU2VydmVyIiwiTm90aWZpY2F0aW9ucyIsIm5vdGlmeVJvb20iLCJzZXRIaWRkZW5CeUlkIiwiYWRkR3JvdXAiLCJncm91cCIsInB1YmxpYyIsImVkaXRvciIsImFsbG93ZWRUeXBlcyIsInNlY3Rpb24iLCJpMThuRGVzY3JpcHRpb24iLCJlbmFibGVRdWVyeSIsImV4cG9ydCIsIlJvb21TZXR0aW5nc0VudW0iLCJSb29tVHlwZUNvbmZpZyIsIlJvb21UeXBlUm91dGVDb25maWciLCJVaVRleHRDb250ZXh0IiwiTGl2ZWNoYXRSb29tUm91dGUiLCJwYXRoIiwib3BlblJvb20iLCJsaW5rIiwic3ViIiwiaWRlbnRpZmllciIsInJvdXRlIiwibm90U3Vic2NyaWJlZFRwbCIsInRlbXBsYXRlIiwiZmluZFJvb20iLCJDaGF0Um9vbSIsImNvbmRpdGlvbiIsImhhc0FsbFBlcm1pc3Npb24iLCJjYW5TZW5kTWVzc2FnZSIsImdldFVzZXJTdGF0dXMiLCJTZXNzaW9uIiwiYWxsb3dSb29tU2V0dGluZ0NoYW5nZSIsIkpPSU5fQ09ERSIsImdldFVpVGV4dCIsImNvbnRleHQiLCJISURFX1dBUk5JTkciLCJMRUFWRV9XQVJOSU5HIiwiQVBJIiwidjEiLCJhZGRSb3V0ZSIsImF1dGhSZXF1aXJlZCIsInVuYXV0aG9yaXplZCIsImJvZHlQYXJhbXMiLCJmYWlsdXJlIiwidXJsUGFyYW1zIiwicHV0IiwiZGVsZXRlIiwiY3J5cHRvIiwicmVxdWVzdCIsInNpZ25hdHVyZSIsImNyZWF0ZUhtYWMiLCJib2R5IiwiZGlnZXN0IiwibWlkIiwicm9vbXMiLCJmaXJzdF9uYW1lIiwibGFzdF9uYW1lIiwic3VjZXNzIiwic2VudE1lc3NhZ2VzIiwic2VudE1lc3NhZ2UiLCJzZXJ2aWNlIiwibWVkaWEiLCJjdXJyIiwibWVzc2FnZV9saW5rIiwiY29udGVudFR5cGUiLCJleHRyYSIsImZyb21Db3VudHJ5IiwiZnJvbVN0YXRlIiwiZnJvbUNpdHkiLCJCdXNib3kiLCJmaWxlc2l6ZSIsIm1heEZpbGVTaXplIiwicGFja2FnZVZhbHVlIiwiYnVzYm95IiwiZmlsZXMiLCJmaWVsZG5hbWUiLCJmaWxlbmFtZSIsImVuY29kaW5nIiwibWltZXR5cGUiLCJmaWxlRGF0ZSIsImZpbGVCdWZmZXIiLCJCdWZmZXIiLCJwaXBlIiwiZmlsZVVwbG9hZElzVmFsaWRDb250ZW50VHlwZSIsInJlYXNvbiIsInNpemVBbGxvd2VkIiwiZmlsZVN0b3JlIiwiZ2V0U3RvcmUiLCJkZXRhaWxzIiwidXBsb2FkZWRGaWxlIiwiYmluZCIsInJvbGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxDQUFKOztBQUFNQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxRQUFFSyxDQUFGO0FBQUk7O0FBQWhCLENBQW5DLEVBQXFELENBQXJEO0FBQXdELElBQUlDLEdBQUo7QUFBUUwsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLEtBQVIsQ0FBYixFQUE0QjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0MsVUFBSUQsQ0FBSjtBQUFNOztBQUFsQixDQUE1QixFQUFnRCxDQUFoRDtBQUl0RSxNQUFNO0FBQUVFO0FBQUYsSUFBYUMs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WCxDQUFlQyxFQUFmLENBQWtCRyxZQUFsQixFQUFQO0FBQ0E7O0FBRUQsVUFBTWEsUUFBUXZ0QixXQUFXOEIsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JnTSxzQkFBeEIsQ0FBK0MsS0FBSzhlLFNBQUwsQ0FBZWxxQixZQUE5RCxFQUE0RTtBQUN6RmdMLGNBQVE7QUFDUDlGLGNBQU0sQ0FEQztBQUVQdkYsV0FBRyxDQUZJO0FBR1BzTCxZQUFJLENBSEc7QUFJUHZHLFdBQUcsQ0FKSTtBQUtQd0csbUJBQVcsQ0FMSjtBQU1QdEIsa0JBQVU7QUFOSDtBQURpRixLQUE1RSxFQVNYdEssS0FUVyxFQUFkO0FBVUEsV0FBT2pDLFdBQVdzc0IsR0FBWCxDQUFlQyxFQUFmLENBQWtCMWdCLE9BQWxCLENBQTBCO0FBQUUwaEI7QUFBRixLQUExQixDQUFQO0FBQ0E7O0FBakJ3RixDQUExRixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2xpdmVjaGF0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBXZWJBcHA6dHJ1ZSAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgdXJsIGZyb20gJ3VybCc7XG5cbmNvbnN0IHsgV2ViQXBwIH0gPSBQYWNrYWdlLndlYmFwcDtcbmNvbnN0IHsgQXV0b3VwZGF0ZSB9ID0gUGFja2FnZS5hdXRvdXBkYXRlO1xuXG5XZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZSgnL2xpdmVjaGF0JywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgocmVxLCByZXMsIG5leHQpID0+IHtcblx0Y29uc3QgcmVxVXJsID0gdXJsLnBhcnNlKHJlcS51cmwpO1xuXHRpZiAocmVxVXJsLnBhdGhuYW1lICE9PSAnLycpIHtcblx0XHRyZXR1cm4gbmV4dCgpO1xuXHR9XG5cdHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLTgnKTtcblxuXHRsZXQgZG9tYWluV2hpdGVMaXN0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0FsbG93ZWREb21haW5zTGlzdCcpO1xuXHRpZiAocmVxLmhlYWRlcnMucmVmZXJlciAmJiAhXy5pc0VtcHR5KGRvbWFpbldoaXRlTGlzdC50cmltKCkpKSB7XG5cdFx0ZG9tYWluV2hpdGVMaXN0ID0gXy5tYXAoZG9tYWluV2hpdGVMaXN0LnNwbGl0KCcsJyksIGZ1bmN0aW9uKGRvbWFpbikge1xuXHRcdFx0cmV0dXJuIGRvbWFpbi50cmltKCk7XG5cdFx0fSk7XG5cblx0XHRjb25zdCByZWZlcmVyID0gdXJsLnBhcnNlKHJlcS5oZWFkZXJzLnJlZmVyZXIpO1xuXHRcdGlmICghXy5jb250YWlucyhkb21haW5XaGl0ZUxpc3QsIHJlZmVyZXIuaG9zdCkpIHtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ1gtRlJBTUUtT1BUSU9OUycsICdERU5ZJyk7XG5cdFx0XHRyZXR1cm4gbmV4dCgpO1xuXHRcdH1cblxuXHRcdHJlcy5zZXRIZWFkZXIoJ1gtRlJBTUUtT1BUSU9OUycsIGBBTExPVy1GUk9NICR7IHJlZmVyZXIucHJvdG9jb2wgfS8vJHsgcmVmZXJlci5ob3N0IH1gKTtcblx0fVxuXG5cdGNvbnN0IGhlYWQgPSBBc3NldHMuZ2V0VGV4dCgncHVibGljL2hlYWQuaHRtbCcpO1xuXG5cdGxldCBiYXNlVXJsO1xuXHRpZiAoX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCAmJiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYLnRyaW0oKSAhPT0gJycpIHtcblx0XHRiYXNlVXJsID0gX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWDtcblx0fSBlbHNlIHtcblx0XHRiYXNlVXJsID0gJy8nO1xuXHR9XG5cdGlmICgvXFwvJC8udGVzdChiYXNlVXJsKSA9PT0gZmFsc2UpIHtcblx0XHRiYXNlVXJsICs9ICcvJztcblx0fVxuXG5cdGNvbnN0IGh0bWwgPSBgPGh0bWw+XG5cdFx0PGhlYWQ+XG5cdFx0XHQ8bGluayByZWw9XCJzdHlsZXNoZWV0XCIgdHlwZT1cInRleHQvY3NzXCIgY2xhc3M9XCJfX21ldGVvci1jc3NfX1wiIGhyZWY9XCIkeyBiYXNlVXJsIH1saXZlY2hhdC9saXZlY2hhdC5jc3M/X2RjPSR7IEF1dG91cGRhdGUuYXV0b3VwZGF0ZVZlcnNpb24gfVwiPlxuXHRcdFx0PHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCI+XG5cdFx0XHRcdF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPSAkeyBKU09OLnN0cmluZ2lmeShfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fKSB9O1xuXHRcdFx0PC9zY3JpcHQ+XG5cblx0XHRcdDxiYXNlIGhyZWY9XCIkeyBiYXNlVXJsIH1cIj5cblxuXHRcdFx0JHsgaGVhZCB9XG5cdFx0PC9oZWFkPlxuXHRcdDxib2R5PlxuXHRcdFx0PHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIgc3JjPVwiJHsgYmFzZVVybCB9bGl2ZWNoYXQvbGl2ZWNoYXQuanM/X2RjPSR7IEF1dG91cGRhdGUuYXV0b3VwZGF0ZVZlcnNpb24gfVwiPjwvc2NyaXB0PlxuXHRcdDwvYm9keT5cblx0PC9odG1sPmA7XG5cblx0cmVzLndyaXRlKGh0bWwpO1xuXHRyZXMuZW5kKCk7XG59KSk7XG4iLCJNZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG5cdFJvY2tldENoYXQucm9vbVR5cGVzLnNldFJvb21GaW5kKCdsJywgKF9pZCkgPT4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZExpdmVjaGF0QnlJZChfaWQpLmZldGNoKCkpO1xuXG5cdFJvY2tldENoYXQuYXV0aHouYWRkUm9vbUFjY2Vzc1ZhbGlkYXRvcihmdW5jdGlvbihyb29tLCB1c2VyKSB7XG5cdFx0cmV0dXJuIHJvb20gJiYgcm9vbS50ID09PSAnbCcgJiYgdXNlciAmJiBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlci5faWQsICd2aWV3LWxpdmVjaGF0LXJvb21zJyk7XG5cdH0pO1xuXG5cdFJvY2tldENoYXQuYXV0aHouYWRkUm9vbUFjY2Vzc1ZhbGlkYXRvcihmdW5jdGlvbihyb29tLCB1c2VyLCBleHRyYURhdGEpIHtcblx0XHRpZiAoIXJvb20gJiYgZXh0cmFEYXRhICYmIGV4dHJhRGF0YS5yaWQpIHtcblx0XHRcdHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChleHRyYURhdGEucmlkKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJvb20gJiYgcm9vbS50ID09PSAnbCcgJiYgZXh0cmFEYXRhICYmIGV4dHJhRGF0YS52aXNpdG9yVG9rZW4gJiYgcm9vbS52ICYmIHJvb20udi50b2tlbiA9PT0gZXh0cmFEYXRhLnZpc2l0b3JUb2tlbjtcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdiZWZvcmVMZWF2ZVJvb20nLCBmdW5jdGlvbih1c2VyLCByb29tKSB7XG5cdFx0aWYgKHJvb20udCAhPT0gJ2wnKSB7XG5cdFx0XHRyZXR1cm4gdXNlcjtcblx0XHR9XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihUQVBpMThuLl9fKCdZb3VfY2FudF9sZWF2ZV9hX2xpdmVjaGF0X3Jvb21fUGxlYXNlX3VzZV90aGVfY2xvc2VfYnV0dG9uJywge1xuXHRcdFx0bG5nOiB1c2VyLmxhbmd1YWdlIHx8IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdsYW5ndWFnZScpIHx8ICdlbicsXG5cdFx0fSkpO1xuXHR9LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdjYW50LWxlYXZlLXJvb20nKTtcbn0pO1xuIiwiLyogZ2xvYmFscyBVc2VyUHJlc2VuY2VFdmVudHMgKi9cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0VXNlclByZXNlbmNlRXZlbnRzLm9uKCdzZXRTdGF0dXMnLCAoc2Vzc2lvbiwgc3RhdHVzLCBtZXRhZGF0YSkgPT4ge1xuXHRcdGlmIChtZXRhZGF0YSAmJiBtZXRhZGF0YS52aXNpdG9yKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkudXBkYXRlVmlzaXRvclN0YXR1cyhtZXRhZGF0YS52aXNpdG9yLCBzdGF0dXMpO1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlVmlzaXRvclN0YXR1cyhtZXRhZGF0YS52aXNpdG9yLCBzdGF0dXMpO1xuXHRcdH1cblx0fSk7XG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFJvb21UeXBlIGZyb20gJy4uL2ltcG9ydHMvTGl2ZWNoYXRSb29tVHlwZSc7XG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuY2xhc3MgTGl2ZWNoYXRSb29tVHlwZVNlcnZlciBleHRlbmRzIExpdmVjaGF0Um9vbVR5cGUge1xuXHRnZXRNc2dTZW5kZXIoc2VuZGVySWQpIHtcblx0XHRyZXR1cm4gTGl2ZWNoYXRWaXNpdG9ycy5maW5kT25lQnlJZChzZW5kZXJJZCk7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJucyBkZXRhaWxzIHRvIHVzZSBvbiBub3RpZmljYXRpb25zXG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSByb29tXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSB1c2VyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBub3RpZmljYXRpb25NZXNzYWdlXG5cdCAqIEByZXR1cm4ge29iamVjdH0gTm90aWZpY2F0aW9uIGRldGFpbHNcblx0ICovXG5cdGdldE5vdGlmaWNhdGlvbkRldGFpbHMocm9vbSwgdXNlciwgbm90aWZpY2F0aW9uTWVzc2FnZSkge1xuXHRcdGNvbnN0IHRpdGxlID0gYFtsaXZlY2hhdF0gJHsgdGhpcy5yb29tTmFtZShyb29tKSB9YDtcblx0XHRjb25zdCB0ZXh0ID0gbm90aWZpY2F0aW9uTWVzc2FnZTtcblxuXHRcdHJldHVybiB7IHRpdGxlLCB0ZXh0IH07XG5cdH1cblxuXHRjYW5BY2Nlc3NVcGxvYWRlZEZpbGUoeyByY190b2tlbiwgcmNfcmlkIH0gPSB7fSkge1xuXHRcdHJldHVybiByY190b2tlbiAmJiByY19yaWQgJiYgUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZU9wZW5CeVZpc2l0b3JUb2tlbihyY190b2tlbiwgcmNfcmlkKTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0LnJvb21UeXBlcy5hZGQobmV3IExpdmVjaGF0Um9vbVR5cGVTZXJ2ZXIoKSk7XG4iLCIvKiBnbG9iYWxzIEhUVFAsIFN5c3RlbUxvZ2dlciAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbmxldCBrbm93bGVkZ2VFbmFibGVkID0gZmFsc2U7XG5sZXQgYXBpYWlLZXkgPSAnJztcbmxldCBhcGlhaUxhbmd1YWdlID0gJ2VuJztcblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9Lbm93bGVkZ2VfRW5hYmxlZCcsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0a25vd2xlZGdlRW5hYmxlZCA9IHZhbHVlO1xufSk7XG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfS25vd2xlZGdlX0FwaWFpX0tleScsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0YXBpYWlLZXkgPSB2YWx1ZTtcbn0pO1xuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0tub3dsZWRnZV9BcGlhaV9MYW5ndWFnZScsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0YXBpYWlMYW5ndWFnZSA9IHZhbHVlO1xufSk7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0Ly8gc2tpcHMgdGhpcyBjYWxsYmFjayBpZiB0aGUgbWVzc2FnZSB3YXMgZWRpdGVkXG5cdGlmICghbWVzc2FnZSB8fCBtZXNzYWdlLmVkaXRlZEF0KSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRpZiAoIWtub3dsZWRnZUVuYWJsZWQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGlmICghKHR5cGVvZiByb29tLnQgIT09ICd1bmRlZmluZWQnICYmIHJvb20udCA9PT0gJ2wnICYmIHJvb20udiAmJiByb29tLnYudG9rZW4pKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXNuJ3QgYSB0b2tlbiwgaXQgd2FzIG5vdCBzZW50IGJ5IHRoZSB2aXNpdG9yLCBzbyBpZ25vcmUgaXRcblx0aWYgKCFtZXNzYWdlLnRva2VuKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCByZXNwb25zZSA9IEhUVFAucG9zdCgnaHR0cHM6Ly9hcGkuYXBpLmFpL2FwaS9xdWVyeT92PTIwMTUwOTEwJywge1xuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0cXVlcnk6IG1lc3NhZ2UubXNnLFxuXHRcdFx0XHRcdGxhbmc6IGFwaWFpTGFuZ3VhZ2UsXG5cdFx0XHRcdFx0c2Vzc2lvbklkOiByb29tLl9pZCxcblx0XHRcdFx0fSxcblx0XHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcsXG5cdFx0XHRcdFx0QXV0aG9yaXphdGlvbjogYEJlYXJlciAkeyBhcGlhaUtleSB9YCxcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnN0YXR1cy5jb2RlID09PSAyMDAgJiYgIV8uaXNFbXB0eShyZXNwb25zZS5kYXRhLnJlc3VsdC5mdWxmaWxsbWVudC5zcGVlY2gpKSB7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RXh0ZXJuYWxNZXNzYWdlLmluc2VydCh7XG5cdFx0XHRcdFx0cmlkOiBtZXNzYWdlLnJpZCxcblx0XHRcdFx0XHRtc2c6IHJlc3BvbnNlLmRhdGEucmVzdWx0LmZ1bGZpbGxtZW50LnNwZWVjaCxcblx0XHRcdFx0XHRvcmlnOiBtZXNzYWdlLl9pZCxcblx0XHRcdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0U3lzdGVtTG9nZ2VyLmVycm9yKCdFcnJvciB1c2luZyBBcGkuYWkgLT4nLCBlKTtcblx0XHR9XG5cdH0pO1xuXG5cdHJldHVybiBtZXNzYWdlO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnZXh0ZXJuYWxXZWJIb29rJyk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi8uLi9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5mdW5jdGlvbiB2YWxpZGF0ZU1lc3NhZ2UobWVzc2FnZSwgcm9vbSkge1xuXHQvLyBza2lwcyB0aGlzIGNhbGxiYWNrIGlmIHRoZSBtZXNzYWdlIHdhcyBlZGl0ZWRcblx0aWYgKG1lc3NhZ2UuZWRpdGVkQXQpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBtZXNzYWdlIHZhbGlkIG9ubHkgaWYgaXQgaXMgYSBsaXZlY2hhdCByb29tXG5cdGlmICghKHR5cGVvZiByb29tLnQgIT09ICd1bmRlZmluZWQnICYmIHJvb20udCA9PT0gJ2wnICYmIHJvb20udiAmJiByb29tLnYudG9rZW4pKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gaWYgdGhlIG1lc3NhZ2UgaGFzbid0IGEgdG9rZW4sIGl0IHdhcyBOT1Qgc2VudCBmcm9tIHRoZSB2aXNpdG9yLCBzbyBpZ25vcmUgaXRcblx0aWYgKCFtZXNzYWdlLnRva2VuKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gaWYgdGhlIG1lc3NhZ2UgaGFzIGEgdHlwZSBtZWFucyBpdCBpcyBhIHNwZWNpYWwgbWVzc2FnZSAobGlrZSB0aGUgY2xvc2luZyBjb21tZW50KSwgc28gc2tpcHNcblx0aWYgKG1lc3NhZ2UudCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCBmdW5jdGlvbihtZXNzYWdlLCByb29tKSB7XG5cdGlmICghdmFsaWRhdGVNZXNzYWdlKG1lc3NhZ2UsIHJvb20pKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRjb25zdCBwaG9uZVJlZ2V4cCA9IG5ldyBSZWdFeHAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X2xlYWRfcGhvbmVfcmVnZXgnKSwgJ2cnKTtcblx0Y29uc3QgbXNnUGhvbmVzID0gbWVzc2FnZS5tc2cubWF0Y2gocGhvbmVSZWdleHApO1xuXG5cdGNvbnN0IGVtYWlsUmVnZXhwID0gbmV3IFJlZ0V4cChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfbGVhZF9lbWFpbF9yZWdleCcpLCAnZ2knKTtcblx0Y29uc3QgbXNnRW1haWxzID0gbWVzc2FnZS5tc2cubWF0Y2goZW1haWxSZWdleHApO1xuXG5cdGlmIChtc2dFbWFpbHMgfHwgbXNnUGhvbmVzKSB7XG5cdFx0TGl2ZWNoYXRWaXNpdG9ycy5zYXZlR3Vlc3RFbWFpbFBob25lQnlJZChyb29tLnYuX2lkLCBtc2dFbWFpbHMsIG1zZ1Bob25lcyk7XG5cblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5ydW4oJ2xpdmVjaGF0LmxlYWRDYXB0dXJlJywgcm9vbSk7XG5cdH1cblxuXHRyZXR1cm4gbWVzc2FnZTtcbn0sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ2xlYWRDYXB0dXJlJyk7XG4iLCJSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCBmdW5jdGlvbihtZXNzYWdlLCByb29tKSB7XG5cdC8vIHNraXBzIHRoaXMgY2FsbGJhY2sgaWYgdGhlIG1lc3NhZ2Ugd2FzIGVkaXRlZFxuXHRpZiAoIW1lc3NhZ2UgfHwgbWVzc2FnZS5lZGl0ZWRBdCkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Ly8gY2hlY2sgaWYgcm9vbSBpcyB5ZXQgYXdhaXRpbmcgZm9yIHJlc3BvbnNlXG5cdGlmICghKHR5cGVvZiByb29tLnQgIT09ICd1bmRlZmluZWQnICYmIHJvb20udCA9PT0gJ2wnICYmIHJvb20ud2FpdGluZ1Jlc3BvbnNlKSkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Ly8gaWYgdGhlIG1lc3NhZ2UgaGFzIGEgdG9rZW4sIGl0IHdhcyBzZW50IGJ5IHRoZSB2aXNpdG9yLCBzbyBpZ25vcmUgaXRcblx0aWYgKG1lc3NhZ2UudG9rZW4pIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRSZXNwb25zZUJ5Um9vbUlkKHJvb20uX2lkLCB7XG5cdFx0XHR1c2VyOiB7XG5cdFx0XHRcdF9pZDogbWVzc2FnZS51Ll9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IG1lc3NhZ2UudS51c2VybmFtZSxcblx0XHRcdH0sXG5cdFx0XHRyZXNwb25zZURhdGU6IG5vdyxcblx0XHRcdHJlc3BvbnNlVGltZTogKG5vdy5nZXRUaW1lKCkgLSByb29tLnRzKSAvIDEwMDAsXG5cdFx0fSk7XG5cdH0pO1xuXG5cdHJldHVybiBtZXNzYWdlO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnbWFya1Jvb21SZXNwb25kZWQnKTtcbiIsIlJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnbGl2ZWNoYXQub2ZmbGluZU1lc3NhZ2UnLCAoZGF0YSkgPT4ge1xuXHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF93ZWJob29rX29uX29mZmxpbmVfbXNnJykpIHtcblx0XHRyZXR1cm4gZGF0YTtcblx0fVxuXG5cdGNvbnN0IHBvc3REYXRhID0ge1xuXHRcdHR5cGU6ICdMaXZlY2hhdE9mZmxpbmVNZXNzYWdlJyxcblx0XHRzZW50QXQ6IG5ldyBEYXRlKCksXG5cdFx0dmlzaXRvcjoge1xuXHRcdFx0bmFtZTogZGF0YS5uYW1lLFxuXHRcdFx0ZW1haWw6IGRhdGEuZW1haWwsXG5cdFx0fSxcblx0XHRtZXNzYWdlOiBkYXRhLm1lc3NhZ2UsXG5cdH07XG5cblx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kUmVxdWVzdChwb3N0RGF0YSk7XG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5NRURJVU0sICdsaXZlY2hhdC1zZW5kLWVtYWlsLW9mZmxpbmUtbWVzc2FnZScpO1xuIiwiZnVuY3Rpb24gc2VuZFRvUkRTdGF0aW9uKHJvb20pIHtcblx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfUkRTdGF0aW9uX1Rva2VuJykpIHtcblx0XHRyZXR1cm4gcm9vbTtcblx0fVxuXG5cdGNvbnN0IGxpdmVjaGF0RGF0YSA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0TGl2ZWNoYXRSb29tR3Vlc3RJbmZvKHJvb20pO1xuXG5cdGlmICghbGl2ZWNoYXREYXRhLnZpc2l0b3IuZW1haWwpIHtcblx0XHRyZXR1cm4gcm9vbTtcblx0fVxuXG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0aGVhZGVyczoge1xuXHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHR9LFxuXHRcdGRhdGE6IHtcblx0XHRcdHRva2VuX3Jkc3RhdGlvbjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X1JEU3RhdGlvbl9Ub2tlbicpLFxuXHRcdFx0aWRlbnRpZmljYWRvcjogJ3JvY2tldGNoYXQtbGl2ZWNoYXQnLFxuXHRcdFx0Y2xpZW50X2lkOiBsaXZlY2hhdERhdGEudmlzaXRvci5faWQsXG5cdFx0XHRlbWFpbDogbGl2ZWNoYXREYXRhLnZpc2l0b3IuZW1haWwsXG5cdFx0fSxcblx0fTtcblxuXHRvcHRpb25zLmRhdGEubm9tZSA9IGxpdmVjaGF0RGF0YS52aXNpdG9yLm5hbWUgfHwgbGl2ZWNoYXREYXRhLnZpc2l0b3IudXNlcm5hbWU7XG5cblx0aWYgKGxpdmVjaGF0RGF0YS52aXNpdG9yLnBob25lKSB7XG5cdFx0b3B0aW9ucy5kYXRhLnRlbGVmb25lID0gbGl2ZWNoYXREYXRhLnZpc2l0b3IucGhvbmU7XG5cdH1cblxuXHRpZiAobGl2ZWNoYXREYXRhLnRhZ3MpIHtcblx0XHRvcHRpb25zLmRhdGEudGFncyA9IGxpdmVjaGF0RGF0YS50YWdzO1xuXHR9XG5cblx0T2JqZWN0LmtleXMobGl2ZWNoYXREYXRhLmN1c3RvbUZpZWxkcyB8fCB7fSkuZm9yRWFjaCgoZmllbGQpID0+IHtcblx0XHRvcHRpb25zLmRhdGFbZmllbGRdID0gbGl2ZWNoYXREYXRhLmN1c3RvbUZpZWxkc1tmaWVsZF07XG5cdH0pO1xuXG5cdE9iamVjdC5rZXlzKGxpdmVjaGF0RGF0YS52aXNpdG9yLmN1c3RvbUZpZWxkcyB8fCB7fSkuZm9yRWFjaCgoZmllbGQpID0+IHtcblx0XHRvcHRpb25zLmRhdGFbZmllbGRdID0gbGl2ZWNoYXREYXRhLnZpc2l0b3IuY3VzdG9tRmllbGRzW2ZpZWxkXTtcblx0fSk7XG5cblx0dHJ5IHtcblx0XHRIVFRQLmNhbGwoJ1BPU1QnLCAnaHR0cHM6Ly93d3cucmRzdGF0aW9uLmNvbS5ici9hcGkvMS4zL2NvbnZlcnNpb25zJywgb3B0aW9ucyk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIGxlYWQgdG8gUkQgU3RhdGlvbiAtPicsIGUpO1xuXHR9XG5cblx0cmV0dXJuIHJvb207XG59XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnbGl2ZWNoYXQuY2xvc2VSb29tJywgc2VuZFRvUkRTdGF0aW9uLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5NRURJVU0sICdsaXZlY2hhdC1yZC1zdGF0aW9uLWNsb3NlLXJvb20nKTtcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdsaXZlY2hhdC5zYXZlSW5mbycsIHNlbmRUb1JEU3RhdGlvbiwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnbGl2ZWNoYXQtcmQtc3RhdGlvbi1zYXZlLWluZm8nKTtcbiIsImNvbnN0IG1zZ05hdlR5cGUgPSAnbGl2ZWNoYXRfbmF2aWdhdGlvbl9oaXN0b3J5JztcblxuY29uc3Qgc2VuZE1lc3NhZ2VUeXBlID0gKG1zZ1R5cGUpID0+IHtcblx0Y29uc3Qgc2VuZE5hdkhpc3RvcnkgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfVmlzaXRvcl9uYXZpZ2F0aW9uX2FzX2FfbWVzc2FnZScpICYmIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTZW5kX3Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5X2xpdmVjaGF0X3dlYmhvb2tfcmVxdWVzdCcpO1xuXG5cdHJldHVybiBzZW5kTmF2SGlzdG9yeSAmJiBtc2dUeXBlID09PSBtc2dOYXZUeXBlO1xufTtcblxuZnVuY3Rpb24gc2VuZFRvQ1JNKHR5cGUsIHJvb20sIGluY2x1ZGVNZXNzYWdlcyA9IHRydWUpIHtcblx0Y29uc3QgcG9zdERhdGEgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldExpdmVjaGF0Um9vbUd1ZXN0SW5mbyhyb29tKTtcblxuXHRwb3N0RGF0YS50eXBlID0gdHlwZTtcblxuXHRwb3N0RGF0YS5tZXNzYWdlcyA9IFtdO1xuXG5cdGxldCBtZXNzYWdlcztcblx0aWYgKHR5cGVvZiBpbmNsdWRlTWVzc2FnZXMgPT09ICdib29sZWFuJyAmJiBpbmNsdWRlTWVzc2FnZXMpIHtcblx0XHRtZXNzYWdlcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRWaXNpYmxlQnlSb29tSWQocm9vbS5faWQsIHsgc29ydDogeyB0czogMSB9IH0pO1xuXHR9IGVsc2UgaWYgKGluY2x1ZGVNZXNzYWdlcyBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0bWVzc2FnZXMgPSBpbmNsdWRlTWVzc2FnZXM7XG5cdH1cblxuXHRpZiAobWVzc2FnZXMpIHtcblx0XHRtZXNzYWdlcy5mb3JFYWNoKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRpZiAobWVzc2FnZS50ICYmICFzZW5kTWVzc2FnZVR5cGUobWVzc2FnZS50KSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBtc2cgPSB7XG5cdFx0XHRcdF9pZDogbWVzc2FnZS5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBtZXNzYWdlLnUudXNlcm5hbWUsXG5cdFx0XHRcdG1zZzogbWVzc2FnZS5tc2csXG5cdFx0XHRcdHRzOiBtZXNzYWdlLnRzLFxuXHRcdFx0XHRlZGl0ZWRBdDogbWVzc2FnZS5lZGl0ZWRBdCxcblx0XHRcdH07XG5cblx0XHRcdGlmIChtZXNzYWdlLnUudXNlcm5hbWUgIT09IHBvc3REYXRhLnZpc2l0b3IudXNlcm5hbWUpIHtcblx0XHRcdFx0bXNnLmFnZW50SWQgPSBtZXNzYWdlLnUuX2lkO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobWVzc2FnZS50ID09PSBtc2dOYXZUeXBlKSB7XG5cdFx0XHRcdG1zZy5uYXZpZ2F0aW9uID0gbWVzc2FnZS5uYXZpZ2F0aW9uO1xuXHRcdFx0fVxuXG5cdFx0XHRwb3N0RGF0YS5tZXNzYWdlcy5wdXNoKG1zZyk7XG5cdFx0fSk7XG5cdH1cblxuXHRjb25zdCByZXNwb25zZSA9IFJvY2tldENoYXQuTGl2ZWNoYXQuc2VuZFJlcXVlc3QocG9zdERhdGEpO1xuXG5cdGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuZGF0YSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNhdmVDUk1EYXRhQnlSb29tSWQocm9vbS5faWQsIHJlc3BvbnNlLmRhdGEuZGF0YSk7XG5cdH1cblxuXHRyZXR1cm4gcm9vbTtcbn1cblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdsaXZlY2hhdC5jbG9zZVJvb20nLCAocm9vbSkgPT4ge1xuXHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF93ZWJob29rX29uX2Nsb3NlJykpIHtcblx0XHRyZXR1cm4gcm9vbTtcblx0fVxuXG5cdHJldHVybiBzZW5kVG9DUk0oJ0xpdmVjaGF0U2Vzc2lvbicsIHJvb20pO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnbGl2ZWNoYXQtc2VuZC1jcm0tY2xvc2Utcm9vbScpO1xuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2xpdmVjaGF0LnNhdmVJbmZvJywgKHJvb20pID0+IHtcblx0Ly8gRG8gbm90IHNlbmQgdG8gQ1JNIGlmIHRoZSBjaGF0IGlzIHN0aWxsIG9wZW5cblx0aWYgKHJvb20ub3Blbikge1xuXHRcdHJldHVybiByb29tO1xuXHR9XG5cblx0cmV0dXJuIHNlbmRUb0NSTSgnTGl2ZWNoYXRFZGl0Jywgcm9vbSk7XG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5NRURJVU0sICdsaXZlY2hhdC1zZW5kLWNybS1zYXZlLWluZm8nKTtcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlclNhdmVNZXNzYWdlJywgZnVuY3Rpb24obWVzc2FnZSwgcm9vbSkge1xuXHQvLyBvbmx5IGNhbGwgd2ViaG9vayBpZiBpdCBpcyBhIGxpdmVjaGF0IHJvb21cblx0aWYgKHJvb20udCAhPT0gJ2wnIHx8IHJvb20udiA9PSBudWxsIHx8IHJvb20udi50b2tlbiA9PSBudWxsKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXMgYSB0b2tlbiwgaXQgd2FzIHNlbnQgZnJvbSB0aGUgdmlzaXRvclxuXHQvLyBpZiBub3QsIGl0IHdhcyBzZW50IGZyb20gdGhlIGFnZW50XG5cdGlmIChtZXNzYWdlLnRva2VuKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfd2ViaG9va19vbl92aXNpdG9yX21lc3NhZ2UnKSkge1xuXHRcdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdFx0fVxuXHR9IGVsc2UgaWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfd2ViaG9va19vbl9hZ2VudF9tZXNzYWdlJykpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXMgYSB0eXBlIG1lYW5zIGl0IGlzIGEgc3BlY2lhbCBtZXNzYWdlIChsaWtlIHRoZSBjbG9zaW5nIGNvbW1lbnQpLCBzbyBza2lwc1xuXHQvLyB1bmxlc3MgdGhlIHNldHRpbmdzIHRoYXQgaGFuZGxlIHdpdGggdmlzaXRvciBuYXZpZ2F0aW9uIGhpc3RvcnkgYXJlIGVuYWJsZWRcblx0aWYgKG1lc3NhZ2UudCAmJiAhc2VuZE1lc3NhZ2VUeXBlKG1lc3NhZ2UudCkpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdHNlbmRUb0NSTSgnTWVzc2FnZScsIHJvb20sIFttZXNzYWdlXSk7XG5cdHJldHVybiBtZXNzYWdlO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnbGl2ZWNoYXQtc2VuZC1jcm0tbWVzc2FnZScpO1xuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2xpdmVjaGF0LmxlYWRDYXB0dXJlJywgKHJvb20pID0+IHtcblx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfd2ViaG9va19vbl9jYXB0dXJlJykpIHtcblx0XHRyZXR1cm4gcm9vbTtcblx0fVxuXHRyZXR1cm4gc2VuZFRvQ1JNKCdMZWFkQ2FwdHVyZScsIHJvb20sIGZhbHNlKTtcbn0sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5Lk1FRElVTSwgJ2xpdmVjaGF0LXNlbmQtY3JtLWxlYWQtY2FwdHVyZScpO1xuIiwiaW1wb3J0IE9tbmlDaGFubmVsIGZyb20gJy4uL2xpYi9PbW5pQ2hhbm5lbCc7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0Ly8gc2tpcHMgdGhpcyBjYWxsYmFjayBpZiB0aGUgbWVzc2FnZSB3YXMgZWRpdGVkXG5cdGlmIChtZXNzYWdlLmVkaXRlZEF0KSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19FbmFibGVkJykgfHwgIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JykpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIG9ubHkgc2VuZCB0aGUgc21zIGJ5IFNNUyBpZiBpdCBpcyBhIGxpdmVjaGF0IHJvb20gd2l0aCBTTVMgc2V0IHRvIHRydWVcblx0aWYgKCEodHlwZW9mIHJvb20udCAhPT0gJ3VuZGVmaW5lZCcgJiYgcm9vbS50ID09PSAnbCcgJiYgcm9vbS5mYWNlYm9vayAmJiByb29tLnYgJiYgcm9vbS52LnRva2VuKSkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Ly8gaWYgdGhlIG1lc3NhZ2UgaGFzIGEgdG9rZW4sIGl0IHdhcyBzZW50IGZyb20gdGhlIHZpc2l0b3IsIHNvIGlnbm9yZSBpdFxuXHRpZiAobWVzc2FnZS50b2tlbikge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Ly8gaWYgdGhlIG1lc3NhZ2UgaGFzIGEgdHlwZSBtZWFucyBpdCBpcyBhIHNwZWNpYWwgbWVzc2FnZSAobGlrZSB0aGUgY2xvc2luZyBjb21tZW50KSwgc28gc2tpcHNcblx0aWYgKG1lc3NhZ2UudCkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0T21uaUNoYW5uZWwucmVwbHkoe1xuXHRcdHBhZ2U6IHJvb20uZmFjZWJvb2sucGFnZS5pZCxcblx0XHR0b2tlbjogcm9vbS52LnRva2VuLFxuXHRcdHRleHQ6IG1lc3NhZ2UubXNnLFxuXHR9KTtcblxuXHRyZXR1cm4gbWVzc2FnZTtcblxufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnc2VuZE1lc3NhZ2VUb0ZhY2Vib29rJyk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDphZGRBZ2VudCcodXNlcm5hbWUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6YWRkQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LmFkZEFnZW50KHVzZXJuYW1lKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6YWRkTWFuYWdlcicodXNlcm5hbWUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6YWRkTWFuYWdlcicgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQuYWRkTWFuYWdlcih1c2VybmFtZSk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmNoYW5nZUxpdmVjaGF0U3RhdHVzJygpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmNoYW5nZUxpdmVjaGF0U3RhdHVzJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcblxuXHRcdGNvbnN0IG5ld1N0YXR1cyA9IHVzZXIuc3RhdHVzTGl2ZWNoYXQgPT09ICdhdmFpbGFibGUnID8gJ25vdC1hdmFpbGFibGUnIDogJ2F2YWlsYWJsZSc7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0TGl2ZWNoYXRTdGF0dXModXNlci5faWQsIG5ld1N0YXR1cyk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6Y2xvc2VCeVZpc2l0b3InKHsgcm9vbUlkLCB0b2tlbiB9KSB7XG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVPcGVuQnlWaXNpdG9yVG9rZW4odG9rZW4sIHJvb21JZCk7XG5cblx0XHRpZiAoIXJvb20gfHwgIXJvb20ub3Blbikge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuKTtcblxuXHRcdGNvbnN0IGxhbmd1YWdlID0gKHZpc2l0b3IgJiYgdmlzaXRvci5sYW5ndWFnZSkgfHwgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ2xhbmd1YWdlJykgfHwgJ2VuJztcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LmNsb3NlUm9vbSh7XG5cdFx0XHR2aXNpdG9yLFxuXHRcdFx0cm9vbSxcblx0XHRcdGNvbW1lbnQ6IFRBUGkxOG4uX18oJ0Nsb3NlZF9ieV92aXNpdG9yJywgeyBsbmc6IGxhbmd1YWdlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpjbG9zZVJvb20nKHJvb21JZCwgY29tbWVudCkge1xuXHRcdGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblx0XHRpZiAoIXVzZXJJZCB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXJJZCwgJ2Nsb3NlLWxpdmVjaGF0LXJvb20nKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmNsb3NlUm9vbScgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cblx0XHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAnbCcpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ3Jvb20tbm90LWZvdW5kJywgJ1Jvb20gbm90IGZvdW5kJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpjbG9zZVJvb20nIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbUlkLCB1c2VyLl9pZCwgeyBfaWQ6IDEgfSk7XG5cdFx0aWYgKCFzdWJzY3JpcHRpb24gJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VySWQsICdjbG9zZS1vdGhlcnMtbGl2ZWNoYXQtcm9vbScpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6Y2xvc2VSb29tJyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5jbG9zZVJvb20oe1xuXHRcdFx0dXNlcixcblx0XHRcdHJvb20sXG5cdFx0XHRjb21tZW50LFxuXHRcdH0pO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgT21uaUNoYW5uZWwgZnJvbSAnLi4vbGliL09tbmlDaGFubmVsJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6ZmFjZWJvb2snKG9wdGlvbnMpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6YWRkQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRzd2l0Y2ggKG9wdGlvbnMuYWN0aW9uKSB7XG5cdFx0XHRcdGNhc2UgJ2luaXRpYWxTdGF0ZSc6IHtcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0ZW5hYmxlZDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0VuYWJsZWQnKSxcblx0XHRcdFx0XHRcdGhhc1Rva2VuOiAhIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JyksXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhc2UgJ2VuYWJsZSc6IHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBPbW5pQ2hhbm5lbC5lbmFibGUoKTtcblxuXHRcdFx0XHRcdGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnTGl2ZWNoYXRfRmFjZWJvb2tfRW5hYmxlZCcsIHRydWUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FzZSAnZGlzYWJsZSc6IHtcblx0XHRcdFx0XHRPbW5pQ2hhbm5lbC5kaXNhYmxlKCk7XG5cblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdMaXZlY2hhdF9GYWNlYm9va19FbmFibGVkJywgZmFsc2UpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FzZSAnbGlzdC1wYWdlcyc6IHtcblx0XHRcdFx0XHRyZXR1cm4gT21uaUNoYW5uZWwubGlzdFBhZ2VzKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYXNlICdzdWJzY3JpYmUnOiB7XG5cdFx0XHRcdFx0cmV0dXJuIE9tbmlDaGFubmVsLnN1YnNjcmliZShvcHRpb25zLnBhZ2UpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FzZSAndW5zdWJzY3JpYmUnOiB7XG5cdFx0XHRcdFx0cmV0dXJuIE9tbmlDaGFubmVsLnVuc3Vic2NyaWJlKG9wdGlvbnMucGFnZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRpZiAoZS5yZXNwb25zZSAmJiBlLnJlc3BvbnNlLmRhdGEgJiYgZS5yZXNwb25zZS5kYXRhLmVycm9yKSB7XG5cdFx0XHRcdGlmIChlLnJlc3BvbnNlLmRhdGEuZXJyb3IuZXJyb3IpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKGUucmVzcG9uc2UuZGF0YS5lcnJvci5lcnJvciwgZS5yZXNwb25zZS5kYXRhLmVycm9yLm1lc3NhZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChlLnJlc3BvbnNlLmRhdGEuZXJyb3IucmVzcG9uc2UpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnRlZ3JhdGlvbi1lcnJvcicsIGUucmVzcG9uc2UuZGF0YS5lcnJvci5yZXNwb25zZS5lcnJvci5tZXNzYWdlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZS5yZXNwb25zZS5kYXRhLmVycm9yLm1lc3NhZ2UpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnRlZ3JhdGlvbi1lcnJvcicsIGUucmVzcG9uc2UuZGF0YS5lcnJvci5tZXNzYWdlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5lcnJvcignRXJyb3IgY29udGFjdGluZyBvbW5pLnJvY2tldC5jaGF0OicsIGUpO1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW50ZWdyYXRpb24tZXJyb3InLCBlLmVycm9yKTtcblx0XHR9XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmdldEN1c3RvbUZpZWxkcycoKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQuZmluZCgpLmZldGNoKCk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6Z2V0QWdlbnREYXRhJyh7IHJvb21JZCwgdG9rZW4gfSkge1xuXHRcdGNoZWNrKHJvb21JZCwgU3RyaW5nKTtcblx0XHRjaGVjayh0b2tlbiwgU3RyaW5nKTtcblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuKTtcblxuXHRcdGlmICghcm9vbSB8fCByb29tLnQgIT09ICdsJyB8fCAhcm9vbS52IHx8IHJvb20udi50b2tlbiAhPT0gdmlzaXRvci50b2tlbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScpO1xuXHRcdH1cblxuXHRcdGlmICghcm9vbS5zZXJ2ZWRCeSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXRBZ2VudEluZm8ocm9vbS5zZXJ2ZWRCeS5faWQpO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpnZXRJbml0aWFsRGF0YScodmlzaXRvclRva2VuLCBkZXBhcnRtZW50SWQpIHtcblx0XHRjb25zdCBpbmZvID0ge1xuXHRcdFx0ZW5hYmxlZDogbnVsbCxcblx0XHRcdHRpdGxlOiBudWxsLFxuXHRcdFx0Y29sb3I6IG51bGwsXG5cdFx0XHRyZWdpc3RyYXRpb25Gb3JtOiBudWxsLFxuXHRcdFx0cm9vbTogbnVsbCxcblx0XHRcdHZpc2l0b3I6IG51bGwsXG5cdFx0XHR0cmlnZ2VyczogW10sXG5cdFx0XHRkZXBhcnRtZW50czogW10sXG5cdFx0XHRhbGxvd1N3aXRjaGluZ0RlcGFydG1lbnRzOiBudWxsLFxuXHRcdFx0b25saW5lOiB0cnVlLFxuXHRcdFx0b2ZmbGluZUNvbG9yOiBudWxsLFxuXHRcdFx0b2ZmbGluZU1lc3NhZ2U6IG51bGwsXG5cdFx0XHRvZmZsaW5lU3VjY2Vzc01lc3NhZ2U6IG51bGwsXG5cdFx0XHRvZmZsaW5lVW5hdmFpbGFibGVNZXNzYWdlOiBudWxsLFxuXHRcdFx0ZGlzcGxheU9mZmxpbmVGb3JtOiBudWxsLFxuXHRcdFx0dmlkZW9DYWxsOiBudWxsLFxuXHRcdFx0ZmlsZVVwbG9hZDogbnVsbCxcblx0XHRcdGNvbnZlcnNhdGlvbkZpbmlzaGVkTWVzc2FnZTogbnVsbCxcblx0XHRcdG5hbWVGaWVsZFJlZ2lzdHJhdGlvbkZvcm06IG51bGwsXG5cdFx0XHRlbWFpbEZpZWxkUmVnaXN0cmF0aW9uRm9ybTogbnVsbCxcblx0XHR9O1xuXG5cdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHRuYW1lOiAxLFxuXHRcdFx0XHR0OiAxLFxuXHRcdFx0XHRjbDogMSxcblx0XHRcdFx0dTogMSxcblx0XHRcdFx0dXNlcm5hbWVzOiAxLFxuXHRcdFx0XHR2OiAxLFxuXHRcdFx0XHRzZXJ2ZWRCeTogMSxcblx0XHRcdFx0ZGVwYXJ0bWVudElkOiAxLFxuXHRcdFx0fSxcblx0XHR9O1xuXHRcdGNvbnN0IHJvb20gPSAoZGVwYXJ0bWVudElkKSA/IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlWaXNpdG9yVG9rZW5BbmREZXBhcnRtZW50SWQodmlzaXRvclRva2VuLCBkZXBhcnRtZW50SWQsIG9wdGlvbnMpLmZldGNoKCkgOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHZpc2l0b3JUb2tlbiwgb3B0aW9ucykuZmV0Y2goKTtcblx0XHRpZiAocm9vbSAmJiByb29tLmxlbmd0aCA+IDApIHtcblx0XHRcdGluZm8ucm9vbSA9IHJvb21bMF07XG5cdFx0fVxuXG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odmlzaXRvclRva2VuLCB7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0bmFtZTogMSxcblx0XHRcdFx0dXNlcm5hbWU6IDEsXG5cdFx0XHRcdHZpc2l0b3JFbWFpbHM6IDEsXG5cdFx0XHRcdGRlcGFydG1lbnQ6IDEsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0aWYgKHJvb20pIHtcblx0XHRcdGluZm8udmlzaXRvciA9IHZpc2l0b3I7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW5pdFNldHRpbmdzID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRJbml0U2V0dGluZ3MoKTtcblxuXHRcdGluZm8udGl0bGUgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfdGl0bGU7XG5cdFx0aW5mby5jb2xvciA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF90aXRsZV9jb2xvcjtcblx0XHRpbmZvLmVuYWJsZWQgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZW5hYmxlZDtcblx0XHRpbmZvLnJlZ2lzdHJhdGlvbkZvcm0gPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfcmVnaXN0cmF0aW9uX2Zvcm07XG5cdFx0aW5mby5vZmZsaW5lVGl0bGUgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfb2ZmbGluZV90aXRsZTtcblx0XHRpbmZvLm9mZmxpbmVDb2xvciA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yO1xuXHRcdGluZm8ub2ZmbGluZU1lc3NhZ2UgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlO1xuXHRcdGluZm8ub2ZmbGluZVN1Y2Nlc3NNZXNzYWdlID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X29mZmxpbmVfc3VjY2Vzc19tZXNzYWdlO1xuXHRcdGluZm8ub2ZmbGluZVVuYXZhaWxhYmxlTWVzc2FnZSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9vZmZsaW5lX2Zvcm1fdW5hdmFpbGFibGU7XG5cdFx0aW5mby5kaXNwbGF5T2ZmbGluZUZvcm0gPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZGlzcGxheV9vZmZsaW5lX2Zvcm07XG5cdFx0aW5mby5sYW5ndWFnZSA9IGluaXRTZXR0aW5ncy5MYW5ndWFnZTtcblx0XHRpbmZvLnZpZGVvQ2FsbCA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF92aWRlb2NhbGxfZW5hYmxlZCA9PT0gdHJ1ZSAmJiBpbml0U2V0dGluZ3MuSml0c2lfRW5hYmxlZCA9PT0gdHJ1ZTtcblx0XHRpbmZvLmZpbGVVcGxvYWQgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZmlsZXVwbG9hZF9lbmFibGVkICYmIGluaXRTZXR0aW5ncy5GaWxlVXBsb2FkX0VuYWJsZWQ7XG5cdFx0aW5mby50cmFuc2NyaXB0ID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0O1xuXHRcdGluZm8udHJhbnNjcmlwdE1lc3NhZ2UgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfdHJhbnNjcmlwdF9tZXNzYWdlO1xuXHRcdGluZm8uY29udmVyc2F0aW9uRmluaXNoZWRNZXNzYWdlID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X2NvbnZlcnNhdGlvbl9maW5pc2hlZF9tZXNzYWdlO1xuXHRcdGluZm8ubmFtZUZpZWxkUmVnaXN0cmF0aW9uRm9ybSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9uYW1lX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtO1xuXHRcdGluZm8uZW1haWxGaWVsZFJlZ2lzdHJhdGlvbkZvcm0gPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZW1haWxfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm07XG5cblx0XHRpbmZvLmFnZW50RGF0YSA9IHJvb20gJiYgcm9vbVswXSAmJiByb29tWzBdLnNlcnZlZEJ5ICYmIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldEFnZW50SW5mbyhyb29tWzBdLnNlcnZlZEJ5Ll9pZCk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdFRyaWdnZXIuZmluZEVuYWJsZWQoKS5mb3JFYWNoKCh0cmlnZ2VyKSA9PiB7XG5cdFx0XHRpbmZvLnRyaWdnZXJzLnB1c2goXy5waWNrKHRyaWdnZXIsICdfaWQnLCAnYWN0aW9ucycsICdjb25kaXRpb25zJykpO1xuXHRcdH0pO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmRFbmFibGVkV2l0aEFnZW50cygpLmZvckVhY2goKGRlcGFydG1lbnQpID0+IHtcblx0XHRcdGluZm8uZGVwYXJ0bWVudHMucHVzaChkZXBhcnRtZW50KTtcblx0XHR9KTtcblx0XHRpbmZvLmFsbG93U3dpdGNoaW5nRGVwYXJ0bWVudHMgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfYWxsb3dfc3dpdGNoaW5nX2RlcGFydG1lbnRzO1xuXG5cdFx0aW5mby5vbmxpbmUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25saW5lQWdlbnRzKCkuY291bnQoKSA+IDA7XG5cdFx0cmV0dXJuIGluZm87XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmdldE5leHRBZ2VudCcoeyB0b2tlbiwgZGVwYXJ0bWVudCB9KSB7XG5cdFx0Y2hlY2sodG9rZW4sIFN0cmluZyk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeVZpc2l0b3JUb2tlbih0b2tlbikuZmV0Y2goKTtcblxuXHRcdGlmIChyb29tICYmIHJvb20ubGVuZ3RoID4gMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICghZGVwYXJ0bWVudCkge1xuXHRcdFx0Y29uc3QgcmVxdWlyZURlcGFybWVudCA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0UmVxdWlyZWREZXBhcnRtZW50KCk7XG5cdFx0XHRpZiAocmVxdWlyZURlcGFybWVudCkge1xuXHRcdFx0XHRkZXBhcnRtZW50ID0gcmVxdWlyZURlcGFybWVudC5faWQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgYWdlbnQgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldE5leHRBZ2VudChkZXBhcnRtZW50KTtcblx0XHRpZiAoIWFnZW50KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldEFnZW50SW5mbyhhZ2VudC5hZ2VudElkKTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpsb2FkSGlzdG9yeScoeyB0b2tlbiwgcmlkLCBlbmQsIGxpbWl0ID0gMjAsIGxzIH0pIHtcblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbiwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cblx0XHRpZiAoIXZpc2l0b3IpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5sb2FkTWVzc2FnZUhpc3RvcnkoeyB1c2VySWQ6IHZpc2l0b3IuX2lkLCByaWQsIGVuZCwgbGltaXQsIGxzIH0pO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmxvZ2luQnlUb2tlbicodG9rZW4pIHtcblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbiwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cblx0XHRpZiAoIXZpc2l0b3IpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0X2lkOiB2aXNpdG9yLl9pZCxcblx0XHR9O1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpwYWdlVmlzaXRlZCcodG9rZW4sIHJvb20sIHBhZ2VJbmZvKSB7XG5cdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zYXZlUGFnZUhpc3RvcnkodG9rZW4sIHJvb20sIHBhZ2VJbmZvKTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpyZWdpc3Rlckd1ZXN0Jyh7IHRva2VuLCBuYW1lLCBlbWFpbCwgZGVwYXJ0bWVudCwgY3VzdG9tRmllbGRzIH0gPSB7fSkge1xuXHRcdGNvbnN0IHVzZXJJZCA9IFJvY2tldENoYXQuTGl2ZWNoYXQucmVnaXN0ZXJHdWVzdC5jYWxsKHRoaXMsIHtcblx0XHRcdHRva2VuLFxuXHRcdFx0bmFtZSxcblx0XHRcdGVtYWlsLFxuXHRcdFx0ZGVwYXJ0bWVudCxcblx0XHR9KTtcblxuXHRcdC8vIHVwZGF0ZSB2aXNpdGVkIHBhZ2UgaGlzdG9yeSB0byBub3QgZXhwaXJlXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMua2VlcEhpc3RvcnlGb3JUb2tlbih0b2tlbik7XG5cblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbiwge1xuXHRcdFx0ZmllbGRzOiB7XG5cdFx0XHRcdHRva2VuOiAxLFxuXHRcdFx0XHRuYW1lOiAxLFxuXHRcdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdFx0dmlzaXRvckVtYWlsczogMSxcblx0XHRcdFx0ZGVwYXJ0bWVudDogMSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHQvLyBJZiBpdCdzIHVwZGF0aW5nIGFuIGV4aXN0aW5nIHZpc2l0b3IsIGl0IG11c3QgYWxzbyB1cGRhdGUgdGhlIHJvb21JbmZvXG5cdFx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeVZpc2l0b3JUb2tlbih0b2tlbik7XG5cdFx0Y3Vyc29yLmZvckVhY2goKHJvb20pID0+IHtcblx0XHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuc2F2ZVJvb21JbmZvKHJvb20sIHZpc2l0b3IpO1xuXHRcdH0pO1xuXG5cdFx0aWYgKGN1c3RvbUZpZWxkcyAmJiBjdXN0b21GaWVsZHMgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0Y3VzdG9tRmllbGRzLmZvckVhY2goKGN1c3RvbUZpZWxkKSA9PiB7XG5cdFx0XHRcdGlmICh0eXBlb2YgY3VzdG9tRmllbGQgIT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCFjdXN0b21GaWVsZC5zY29wZSB8fCBjdXN0b21GaWVsZC5zY29wZSAhPT0gJ3Jvb20nKSB7XG5cdFx0XHRcdFx0Y29uc3QgeyBrZXksIHZhbHVlLCBvdmVyd3JpdGUgfSA9IGN1c3RvbUZpZWxkO1xuXHRcdFx0XHRcdExpdmVjaGF0VmlzaXRvcnMudXBkYXRlTGl2ZWNoYXREYXRhQnlUb2tlbih0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHVzZXJJZCxcblx0XHRcdHZpc2l0b3IsXG5cdFx0fTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmVtb3ZlQWdlbnQnKHVzZXJuYW1lKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZUFnZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZW1vdmVBZ2VudCh1c2VybmFtZSk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnJlbW92ZUN1c3RvbUZpZWxkJyhfaWQpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlQ3VzdG9tRmllbGQnIH0pO1xuXHRcdH1cblxuXHRcdGNoZWNrKF9pZCwgU3RyaW5nKTtcblxuXHRcdGNvbnN0IGN1c3RvbUZpZWxkID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRDdXN0b21GaWVsZC5maW5kT25lQnlJZChfaWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXG5cdFx0aWYgKCFjdXN0b21GaWVsZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1jdXN0b20tZmllbGQnLCAnQ3VzdG9tIGZpZWxkIG5vdCBmb3VuZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlQ3VzdG9tRmllbGQnIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLnJlbW92ZUJ5SWQoX2lkKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmVtb3ZlRGVwYXJ0bWVudCcoX2lkKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZURlcGFydG1lbnQnIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnJlbW92ZURlcGFydG1lbnQoX2lkKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmVtb3ZlTWFuYWdlcicodXNlcm5hbWUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlTWFuYWdlcicgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQucmVtb3ZlTWFuYWdlcih1c2VybmFtZSk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnJlbW92ZVRyaWdnZXInKHRyaWdnZXJJZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVUcmlnZ2VyJyB9KTtcblx0XHR9XG5cblx0XHRjaGVjayh0cmlnZ2VySWQsIFN0cmluZyk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRUcmlnZ2VyLnJlbW92ZUJ5SWQodHJpZ2dlcklkKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmVtb3ZlUm9vbScocmlkKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdyZW1vdmUtY2xvc2VkLWxpdmVjaGF0LXJvb21zJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVSb29tJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdFx0bWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlUm9vbScsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAocm9vbS50ICE9PSAnbCcpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXRoaXMtaXMtbm90LWEtbGl2ZWNoYXQtcm9vbScsICdUaGlzIGlzIG5vdCBhIExpdmVjaGF0IHJvb20nLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZVJvb20nLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKHJvb20ub3Blbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1pcy1ub3QtY2xvc2VkJywgJ1Jvb20gaXMgbm90IGNsb3NlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlUm9vbScsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5yZW1vdmVCeVJvb21JZChyaWQpO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMucmVtb3ZlQnlSb29tSWQocmlkKTtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMucmVtb3ZlQnlJZChyaWQpO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzYXZlQXBwZWFyYW5jZScoc2V0dGluZ3MpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZUFwcGVhcmFuY2UnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZhbGlkU2V0dGluZ3MgPSBbXG5cdFx0XHQnTGl2ZWNoYXRfdGl0bGUnLFxuXHRcdFx0J0xpdmVjaGF0X3RpdGxlX2NvbG9yJyxcblx0XHRcdCdMaXZlY2hhdF9zaG93X2FnZW50X2VtYWlsJyxcblx0XHRcdCdMaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybScsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9mb3JtX3VuYXZhaWxhYmxlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX21lc3NhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfc3VjY2Vzc19tZXNzYWdlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX2VtYWlsJyxcblx0XHRcdCdMaXZlY2hhdF9jb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZScsXG5cdFx0XHQnTGl2ZWNoYXRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXHRcdFx0J0xpdmVjaGF0X25hbWVfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXHRcdFx0J0xpdmVjaGF0X2VtYWlsX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtJyxcblx0XHRdO1xuXG5cdFx0Y29uc3QgdmFsaWQgPSBzZXR0aW5ncy5ldmVyeSgoc2V0dGluZykgPT4gdmFsaWRTZXR0aW5ncy5pbmRleE9mKHNldHRpbmcuX2lkKSAhPT0gLTEpO1xuXG5cdFx0aWYgKCF2YWxpZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1zZXR0aW5nJyk7XG5cdFx0fVxuXG5cdFx0c2V0dGluZ3MuZm9yRWFjaCgoc2V0dGluZykgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKHNldHRpbmcuX2lkLCBzZXR0aW5nLnZhbHVlKTtcblx0XHR9KTtcblxuXHRcdHJldHVybjtcblx0fSxcbn0pO1xuIiwiLyogZXNsaW50IG5ldy1jYXA6IFsyLCB7XCJjYXBJc05ld0V4Y2VwdGlvbnNcIjogW1wiTWF0Y2guT2JqZWN0SW5jbHVkaW5nXCIsIFwiTWF0Y2guT3B0aW9uYWxcIl19XSAqL1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzYXZlQ3VzdG9tRmllbGQnKF9pZCwgY3VzdG9tRmllbGREYXRhKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVDdXN0b21GaWVsZCcgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKF9pZCkge1xuXHRcdFx0Y2hlY2soX2lkLCBTdHJpbmcpO1xuXHRcdH1cblxuXHRcdGNoZWNrKGN1c3RvbUZpZWxkRGF0YSwgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHsgZmllbGQ6IFN0cmluZywgbGFiZWw6IFN0cmluZywgc2NvcGU6IFN0cmluZywgdmlzaWJpbGl0eTogU3RyaW5nIH0pKTtcblxuXHRcdGlmICghL15bMC05YS16QS1aLV9dKyQvLnRlc3QoY3VzdG9tRmllbGREYXRhLmZpZWxkKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1jdXN0b20tZmllbGQtbm1hZScsICdJbnZhbGlkIGN1c3RvbSBmaWVsZCBuYW1lLiBVc2Ugb25seSBsZXR0ZXJzLCBudW1iZXJzLCBoeXBoZW5zIGFuZCB1bmRlcnNjb3Jlcy4nLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVDdXN0b21GaWVsZCcgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKF9pZCkge1xuXHRcdFx0Y29uc3QgY3VzdG9tRmllbGQgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmZpbmRPbmVCeUlkKF9pZCk7XG5cdFx0XHRpZiAoIWN1c3RvbUZpZWxkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtY3VzdG9tLWZpZWxkJywgJ0N1c3RvbSBGaWVsZCBOb3QgZm91bmQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVDdXN0b21GaWVsZCcgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQuY3JlYXRlT3JVcGRhdGVDdXN0b21GaWVsZChfaWQsIGN1c3RvbUZpZWxkRGF0YS5maWVsZCwgY3VzdG9tRmllbGREYXRhLmxhYmVsLCBjdXN0b21GaWVsZERhdGEuc2NvcGUsIGN1c3RvbUZpZWxkRGF0YS52aXNpYmlsaXR5KTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZURlcGFydG1lbnQnKF9pZCwgZGVwYXJ0bWVudERhdGEsIGRlcGFydG1lbnRBZ2VudHMpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZURlcGFydG1lbnQnIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnNhdmVEZXBhcnRtZW50KF9pZCwgZGVwYXJ0bWVudERhdGEsIGRlcGFydG1lbnRBZ2VudHMpO1xuXHR9LFxufSk7XG4iLCIvKiBlc2xpbnQgbmV3LWNhcDogWzIsIHtcImNhcElzTmV3RXhjZXB0aW9uc1wiOiBbXCJNYXRjaC5PYmplY3RJbmNsdWRpbmdcIiwgXCJNYXRjaC5PcHRpb25hbFwiXX1dICovXG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNhdmVJbmZvJyhndWVzdERhdGEsIHJvb21EYXRhKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZUluZm8nIH0pO1xuXHRcdH1cblxuXHRcdGNoZWNrKGd1ZXN0RGF0YSwgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdF9pZDogU3RyaW5nLFxuXHRcdFx0bmFtZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdGVtYWlsOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdFx0cGhvbmU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0fSkpO1xuXG5cdFx0Y2hlY2socm9vbURhdGEsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRfaWQ6IFN0cmluZyxcblx0XHRcdHRvcGljOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdFx0dGFnczogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHR9KSk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbURhdGEuX2lkLCB7IGZpZWxkczogeyB0OiAxLCBzZXJ2ZWRCeTogMSB9IH0pO1xuXG5cdFx0aWYgKHJvb20gPT0gbnVsbCB8fCByb29tLnQgIT09ICdsJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZUluZm8nIH0pO1xuXHRcdH1cblxuXHRcdGlmICgoIXJvb20uc2VydmVkQnkgfHwgcm9vbS5zZXJ2ZWRCeS5faWQgIT09IE1ldGVvci51c2VySWQoKSkgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdzYXZlLW90aGVycy1saXZlY2hhdC1yb29tLWluZm8nKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVJbmZvJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCByZXQgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LnNhdmVHdWVzdChndWVzdERhdGEpICYmIFJvY2tldENoYXQuTGl2ZWNoYXQuc2F2ZVJvb21JbmZvKHJvb21EYXRhLCBndWVzdERhdGEpO1xuXG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignbGl2ZWNoYXQuc2F2ZUluZm8nLCBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tRGF0YS5faWQpKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiByZXQ7XG5cdH0sXG59KTtcbiIsImltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZUludGVncmF0aW9uJyh2YWx1ZXMpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZUludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHZhbHVlcy5MaXZlY2hhdF93ZWJob29rVXJsICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdMaXZlY2hhdF93ZWJob29rVXJsJywgcy50cmltKHZhbHVlcy5MaXZlY2hhdF93ZWJob29rVXJsKSk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZXMuTGl2ZWNoYXRfc2VjcmV0X3Rva2VuICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdMaXZlY2hhdF9zZWNyZXRfdG9rZW4nLCBzLnRyaW0odmFsdWVzLkxpdmVjaGF0X3NlY3JldF90b2tlbikpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgdmFsdWVzLkxpdmVjaGF0X3dlYmhvb2tfb25fY2xvc2UgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fY2xvc2UnLCAhIXZhbHVlcy5MaXZlY2hhdF93ZWJob29rX29uX2Nsb3NlKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHZhbHVlcy5MaXZlY2hhdF93ZWJob29rX29uX29mZmxpbmVfbXNnICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdMaXZlY2hhdF93ZWJob29rX29uX29mZmxpbmVfbXNnJywgISF2YWx1ZXMuTGl2ZWNoYXRfd2ViaG9va19vbl9vZmZsaW5lX21zZyk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZXMuTGl2ZWNoYXRfd2ViaG9va19vbl92aXNpdG9yX21lc3NhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fdmlzaXRvcl9tZXNzYWdlJywgISF2YWx1ZXMuTGl2ZWNoYXRfd2ViaG9va19vbl92aXNpdG9yX21lc3NhZ2UpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgdmFsdWVzLkxpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnTGl2ZWNoYXRfd2ViaG9va19vbl9hZ2VudF9tZXNzYWdlJywgISF2YWx1ZXMuTGl2ZWNoYXRfd2ViaG9va19vbl9hZ2VudF9tZXNzYWdlKTtcblx0XHR9XG5cblx0XHRyZXR1cm47XG5cdH0sXG59KTtcbiIsIi8qIGVzbGludCBuZXctY2FwOiBbMiwge1wiY2FwSXNOZXdFeGNlcHRpb25zXCI6IFtcIk1hdGNoLk9iamVjdEluY2x1ZGluZ1wiXX1dICovXG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZVN1cnZleUZlZWRiYWNrJyh2aXNpdG9yVG9rZW4sIHZpc2l0b3JSb29tLCBmb3JtRGF0YSkge1xuXHRcdGNoZWNrKHZpc2l0b3JUb2tlbiwgU3RyaW5nKTtcblx0XHRjaGVjayh2aXNpdG9yUm9vbSwgU3RyaW5nKTtcblx0XHRjaGVjayhmb3JtRGF0YSwgW01hdGNoLk9iamVjdEluY2x1ZGluZyh7IG5hbWU6IFN0cmluZywgdmFsdWU6IFN0cmluZyB9KV0pO1xuXG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odmlzaXRvclRva2VuKTtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQodmlzaXRvclJvb20pO1xuXG5cdFx0aWYgKHZpc2l0b3IgIT09IHVuZGVmaW5lZCAmJiByb29tICE9PSB1bmRlZmluZWQgJiYgcm9vbS52ICE9PSB1bmRlZmluZWQgJiYgcm9vbS52LnRva2VuID09PSB2aXNpdG9yLnRva2VuKSB7XG5cdFx0XHRjb25zdCB1cGRhdGVEYXRhID0ge307XG5cdFx0XHRmb3IgKGNvbnN0IGl0ZW0gb2YgZm9ybURhdGEpIHtcblx0XHRcdFx0aWYgKF8uY29udGFpbnMoWydzYXRpc2ZhY3Rpb24nLCAnYWdlbnRLbm93bGVkZ2UnLCAnYWdlbnRSZXNwb3NpdmVuZXNzJywgJ2FnZW50RnJpZW5kbGluZXNzJ10sIGl0ZW0ubmFtZSkgJiYgXy5jb250YWlucyhbJzEnLCAnMicsICczJywgJzQnLCAnNSddLCBpdGVtLnZhbHVlKSkge1xuXHRcdFx0XHRcdHVwZGF0ZURhdGFbaXRlbS5uYW1lXSA9IGl0ZW0udmFsdWU7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaXRlbS5uYW1lID09PSAnYWRkaXRpb25hbEZlZWRiYWNrJykge1xuXHRcdFx0XHRcdHVwZGF0ZURhdGFbaXRlbS5uYW1lXSA9IGl0ZW0udmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICghXy5pc0VtcHR5KHVwZGF0ZURhdGEpKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVTdXJ2ZXlGZWVkYmFja0J5SWQocm9vbS5faWQsIHVwZGF0ZURhdGEpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZVRyaWdnZXInKHRyaWdnZXIpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZVRyaWdnZXInIH0pO1xuXHRcdH1cblxuXHRcdGNoZWNrKHRyaWdnZXIsIHtcblx0XHRcdF9pZDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdG5hbWU6IFN0cmluZyxcblx0XHRcdGRlc2NyaXB0aW9uOiBTdHJpbmcsXG5cdFx0XHRlbmFibGVkOiBCb29sZWFuLFxuXHRcdFx0Y29uZGl0aW9uczogQXJyYXksXG5cdFx0XHRhY3Rpb25zOiBBcnJheSxcblx0XHR9KTtcblxuXHRcdGlmICh0cmlnZ2VyLl9pZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0VHJpZ2dlci51cGRhdGVCeUlkKHRyaWdnZXIuX2lkLCB0cmlnZ2VyKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0VHJpZ2dlci5pbnNlcnQodHJpZ2dlcik7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2VhcmNoQWdlbnQnKHVzZXJuYW1lKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNlYXJjaEFnZW50JyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIXVzZXJuYW1lIHx8ICFfLmlzU3RyaW5nKHVzZXJuYW1lKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1hcmd1bWVudHMnLCAnSW52YWxpZCBhcmd1bWVudHMnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNlYXJjaEFnZW50JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSwgdXNlcm5hbWU6IDEgfSB9KTtcblxuXHRcdGlmICghdXNlcikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2VhcmNoQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB1c2VyO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0c2VuZE1lc3NhZ2VMaXZlY2hhdCh7IHRva2VuLCBfaWQsIHJpZCwgbXNnLCBhdHRhY2htZW50cyB9LCBhZ2VudCkge1xuXHRcdGNoZWNrKHRva2VuLCBTdHJpbmcpO1xuXHRcdGNoZWNrKF9pZCwgU3RyaW5nKTtcblx0XHRjaGVjayhyaWQsIFN0cmluZyk7XG5cdFx0Y2hlY2sobXNnLCBTdHJpbmcpO1xuXG5cdFx0Y2hlY2soYWdlbnQsIE1hdGNoLk1heWJlKHtcblx0XHRcdGFnZW50SWQ6IFN0cmluZyxcblx0XHRcdHVzZXJuYW1lOiBTdHJpbmcsXG5cdFx0fSkpO1xuXG5cdFx0Y29uc3QgZ3Vlc3QgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuLCB7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0bmFtZTogMSxcblx0XHRcdFx0dXNlcm5hbWU6IDEsXG5cdFx0XHRcdGRlcGFydG1lbnQ6IDEsXG5cdFx0XHRcdHRva2VuOiAxLFxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdGlmICghZ3Vlc3QpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtdG9rZW4nKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kTWVzc2FnZSh7XG5cdFx0XHRndWVzdCxcblx0XHRcdG1lc3NhZ2U6IHtcblx0XHRcdFx0X2lkLFxuXHRcdFx0XHRyaWQsXG5cdFx0XHRcdG1zZyxcblx0XHRcdFx0dG9rZW4sXG5cdFx0XHRcdGF0dGFjaG1lbnRzLFxuXHRcdFx0fSxcblx0XHRcdGFnZW50LFxuXHRcdH0pO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0YXN5bmMgJ3NlbmRGaWxlTGl2ZWNoYXRNZXNzYWdlJyhyb29tSWQsIHZpc2l0b3JUb2tlbiwgZmlsZSwgbXNnRGF0YSA9IHt9KSB7XG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odmlzaXRvclRva2VuKTtcblxuXHRcdGlmICghdmlzaXRvcikge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lT3BlbkJ5VmlzaXRvclRva2VuKHZpc2l0b3JUb2tlbiwgcm9vbUlkKTtcblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNoZWNrKG1zZ0RhdGEsIHtcblx0XHRcdGF2YXRhcjogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdGVtb2ppOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdFx0YWxpYXM6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRncm91cGFibGU6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0bXNnOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgZmlsZVVybCA9IGAvZmlsZS11cGxvYWQvJHsgZmlsZS5faWQgfS8keyBlbmNvZGVVUkkoZmlsZS5uYW1lKSB9YDtcblxuXHRcdGNvbnN0IGF0dGFjaG1lbnQgPSB7XG5cdFx0XHR0aXRsZTogZmlsZS5uYW1lLFxuXHRcdFx0dHlwZTogJ2ZpbGUnLFxuXHRcdFx0ZGVzY3JpcHRpb246IGZpbGUuZGVzY3JpcHRpb24sXG5cdFx0XHR0aXRsZV9saW5rOiBmaWxlVXJsLFxuXHRcdFx0dGl0bGVfbGlua19kb3dubG9hZDogdHJ1ZSxcblx0XHR9O1xuXG5cdFx0aWYgKC9eaW1hZ2VcXC8uKy8udGVzdChmaWxlLnR5cGUpKSB7XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3VybCA9IGZpbGVVcmw7XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3R5cGUgPSBmaWxlLnR5cGU7XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3NpemUgPSBmaWxlLnNpemU7XG5cdFx0XHRpZiAoZmlsZS5pZGVudGlmeSAmJiBmaWxlLmlkZW50aWZ5LnNpemUpIHtcblx0XHRcdFx0YXR0YWNobWVudC5pbWFnZV9kaW1lbnNpb25zID0gZmlsZS5pZGVudGlmeS5zaXplO1xuXHRcdFx0fVxuXHRcdFx0YXR0YWNobWVudC5pbWFnZV9wcmV2aWV3ID0gYXdhaXQgRmlsZVVwbG9hZC5yZXNpemVJbWFnZVByZXZpZXcoZmlsZSk7XG5cdFx0fSBlbHNlIGlmICgvXmF1ZGlvXFwvLisvLnRlc3QoZmlsZS50eXBlKSkge1xuXHRcdFx0YXR0YWNobWVudC5hdWRpb191cmwgPSBmaWxlVXJsO1xuXHRcdFx0YXR0YWNobWVudC5hdWRpb190eXBlID0gZmlsZS50eXBlO1xuXHRcdFx0YXR0YWNobWVudC5hdWRpb19zaXplID0gZmlsZS5zaXplO1xuXHRcdH0gZWxzZSBpZiAoL152aWRlb1xcLy4rLy50ZXN0KGZpbGUudHlwZSkpIHtcblx0XHRcdGF0dGFjaG1lbnQudmlkZW9fdXJsID0gZmlsZVVybDtcblx0XHRcdGF0dGFjaG1lbnQudmlkZW9fdHlwZSA9IGZpbGUudHlwZTtcblx0XHRcdGF0dGFjaG1lbnQudmlkZW9fc2l6ZSA9IGZpbGUuc2l6ZTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSBPYmplY3QuYXNzaWduKHtcblx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRyaWQ6IHJvb21JZCxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0bXNnOiAnJyxcblx0XHRcdGZpbGU6IHtcblx0XHRcdFx0X2lkOiBmaWxlLl9pZCxcblx0XHRcdFx0bmFtZTogZmlsZS5uYW1lLFxuXHRcdFx0XHR0eXBlOiBmaWxlLnR5cGUsXG5cdFx0XHR9LFxuXHRcdFx0Z3JvdXBhYmxlOiBmYWxzZSxcblx0XHRcdGF0dGFjaG1lbnRzOiBbYXR0YWNobWVudF0sXG5cdFx0XHR0b2tlbjogdmlzaXRvclRva2VuLFxuXHRcdH0sIG1zZ0RhdGEpO1xuXG5cdFx0cmV0dXJuIE1ldGVvci5jYWxsKCdzZW5kTWVzc2FnZUxpdmVjaGF0JywgbXNnKTtcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFscyBERFBSYXRlTGltaXRlciAqL1xuaW1wb3J0IGRucyBmcm9tICdkbnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzZW5kT2ZmbGluZU1lc3NhZ2UnKGRhdGEpIHtcblx0XHRjaGVjayhkYXRhLCB7XG5cdFx0XHRuYW1lOiBTdHJpbmcsXG5cdFx0XHRlbWFpbDogU3RyaW5nLFxuXHRcdFx0bWVzc2FnZTogU3RyaW5nLFxuXHRcdH0pO1xuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfZGlzcGxheV9vZmZsaW5lX2Zvcm0nKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IGhlYWRlciA9IFJvY2tldENoYXQucGxhY2Vob2xkZXJzLnJlcGxhY2UoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0VtYWlsX0hlYWRlcicpIHx8ICcnKTtcblx0XHRjb25zdCBmb290ZXIgPSBSb2NrZXRDaGF0LnBsYWNlaG9sZGVycy5yZXBsYWNlKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdFbWFpbF9Gb290ZXInKSB8fCAnJyk7XG5cblx0XHRjb25zdCBtZXNzYWdlID0gKGAkeyBkYXRhLm1lc3NhZ2UgfWApLnJlcGxhY2UoLyhbXj5cXHJcXG5dPykoXFxyXFxufFxcblxccnxcXHJ8XFxuKS9nLCAnJDEnICsgJzxicj4nICsgJyQyJyk7XG5cblx0XHRjb25zdCBodG1sID0gYFxuXHRcdFx0PGgxPk5ldyBsaXZlY2hhdCBtZXNzYWdlPC9oMT5cblx0XHRcdDxwPjxzdHJvbmc+VmlzaXRvciBuYW1lOjwvc3Ryb25nPiAkeyBkYXRhLm5hbWUgfTwvcD5cblx0XHRcdDxwPjxzdHJvbmc+VmlzaXRvciBlbWFpbDo8L3N0cm9uZz4gJHsgZGF0YS5lbWFpbCB9PC9wPlxuXHRcdFx0PHA+PHN0cm9uZz5NZXNzYWdlOjwvc3Ryb25nPjxicj4keyBtZXNzYWdlIH08L3A+YDtcblxuXHRcdGxldCBmcm9tRW1haWwgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRnJvbV9FbWFpbCcpLm1hdGNoKC9cXGJbQS1aMC05Ll8lKy1dK0AoPzpbQS1aMC05LV0rXFwuKStbQS1aXXsyLDR9XFxiL2kpO1xuXG5cdFx0aWYgKGZyb21FbWFpbCkge1xuXHRcdFx0ZnJvbUVtYWlsID0gZnJvbUVtYWlsWzBdO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmcm9tRW1haWwgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRnJvbV9FbWFpbCcpO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfdmFsaWRhdGVfb2ZmbGluZV9lbWFpbCcpKSB7XG5cdFx0XHRjb25zdCBlbWFpbERvbWFpbiA9IGRhdGEuZW1haWwuc3Vic3RyKGRhdGEuZW1haWwubGFzdEluZGV4T2YoJ0AnKSArIDEpO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRNZXRlb3Iud3JhcEFzeW5jKGRucy5yZXNvbHZlTXgpKGVtYWlsRG9tYWluKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1lbWFpbC1hZGRyZXNzJywgJ0ludmFsaWQgZW1haWwgYWRkcmVzcycsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2VuZE9mZmxpbmVNZXNzYWdlJyB9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0RW1haWwuc2VuZCh7XG5cdFx0XHRcdHRvOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfb2ZmbGluZV9lbWFpbCcpLFxuXHRcdFx0XHRmcm9tOiBgJHsgZGF0YS5uYW1lIH0gLSAkeyBkYXRhLmVtYWlsIH0gPCR7IGZyb21FbWFpbCB9PmAsXG5cdFx0XHRcdHJlcGx5VG86IGAkeyBkYXRhLm5hbWUgfSA8JHsgZGF0YS5lbWFpbCB9PmAsXG5cdFx0XHRcdHN1YmplY3Q6IGBMaXZlY2hhdCBvZmZsaW5lIG1lc3NhZ2UgZnJvbSAkeyBkYXRhLm5hbWUgfTogJHsgKGAkeyBkYXRhLm1lc3NhZ2UgfWApLnN1YnN0cmluZygwLCAyMCkgfWAsXG5cdFx0XHRcdGh0bWw6IGhlYWRlciArIGh0bWwgKyBmb290ZXIsXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5ydW4oJ2xpdmVjaGF0Lm9mZmxpbmVNZXNzYWdlJywgZGF0YSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuXG5ERFBSYXRlTGltaXRlci5hZGRSdWxlKHtcblx0dHlwZTogJ21ldGhvZCcsXG5cdG5hbWU6ICdsaXZlY2hhdDpzZW5kT2ZmbGluZU1lc3NhZ2UnLFxuXHRjb25uZWN0aW9uSWQoKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0sXG59LCAxLCA1MDAwKTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2V0Q3VzdG9tRmllbGQnKHRva2VuLCBrZXksIHZhbHVlLCBvdmVyd3JpdGUgPSB0cnVlKSB7XG5cdFx0Y29uc3QgY3VzdG9tRmllbGQgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmZpbmRPbmVCeUlkKGtleSk7XG5cdFx0aWYgKGN1c3RvbUZpZWxkKSB7XG5cdFx0XHRpZiAoY3VzdG9tRmllbGQuc2NvcGUgPT09ICdyb29tJykge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlTGl2ZWNoYXREYXRhQnlUb2tlbih0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIFNhdmUgaW4gdXNlclxuXHRcdFx0XHRyZXR1cm4gTGl2ZWNoYXRWaXNpdG9ycy51cGRhdGVMaXZlY2hhdERhdGFCeVRva2VuKHRva2VuLCBrZXksIHZhbHVlLCBvdmVyd3JpdGUpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNldERlcGFydG1lbnRGb3JWaXNpdG9yJyh7IHJvb21JZCwgdmlzaXRvclRva2VuLCBkZXBhcnRtZW50SWQgfSA9IHt9KSB7XG5cdFx0Y2hlY2socm9vbUlkLCBTdHJpbmcpO1xuXHRcdGNoZWNrKHZpc2l0b3JUb2tlbiwgU3RyaW5nKTtcblx0XHRjaGVjayhkZXBhcnRtZW50SWQsIFN0cmluZyk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUlkKTtcblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih2aXNpdG9yVG9rZW4pO1xuXG5cdFx0aWYgKCFyb29tIHx8IHJvb20udCAhPT0gJ2wnIHx8ICFyb29tLnYgfHwgcm9vbS52LnRva2VuICE9PSB2aXNpdG9yLnRva2VuKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJyk7XG5cdFx0fVxuXG5cdFx0Ly8gdXBkYXRlIHZpc2l0ZWQgcGFnZSBoaXN0b3J5IHRvIG5vdCBleHBpcmVcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5rZWVwSGlzdG9yeUZvclRva2VuKHZpc2l0b3JUb2tlbik7XG5cblx0XHRjb25zdCB0cmFuc2ZlckRhdGEgPSB7XG5cdFx0XHRyb29tSWQsXG5cdFx0XHRkZXBhcnRtZW50SWQsXG5cdFx0fTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnRyYW5zZmVyKHJvb20sIHZpc2l0b3IsIHRyYW5zZmVyRGF0YSk7XG5cdH0sXG59KTtcbiIsIi8qIGVzbGludCBuZXctY2FwOiBbMiwge1wiY2FwSXNOZXdFeGNlcHRpb25zXCI6IFtcIk1ENVwiXX1dICovXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzdGFydFZpZGVvQ2FsbCcocm9vbUlkKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpjbG9zZUJ5VmlzaXRvcicgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZ3Vlc3QgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0Y29uc3QgbWVzc2FnZSA9IHtcblx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRyaWQ6IHJvb21JZCB8fCBSYW5kb20uaWQoKSxcblx0XHRcdG1zZzogJycsXG5cdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHR9O1xuXG5cdFx0Y29uc3QgeyByb29tIH0gPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldFJvb20oZ3Vlc3QsIG1lc3NhZ2UsIHsgaml0c2lUaW1lb3V0OiBuZXcgRGF0ZShEYXRlLm5vdygpICsgMzYwMCAqIDEwMDApIH0pO1xuXHRcdG1lc3NhZ2UucmlkID0gcm9vbS5faWQ7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdsaXZlY2hhdF92aWRlb19jYWxsJywgcm9vbS5faWQsICcnLCBndWVzdCwge1xuXHRcdFx0YWN0aW9uTGlua3M6IFtcblx0XHRcdFx0eyBpY29uOiAnaWNvbi12aWRlb2NhbScsIGkxOG5MYWJlbDogJ0FjY2VwdCcsIG1ldGhvZF9pZDogJ2NyZWF0ZUxpdmVjaGF0Q2FsbCcsIHBhcmFtczogJycgfSxcblx0XHRcdFx0eyBpY29uOiAnaWNvbi1jYW5jZWwnLCBpMThuTGFiZWw6ICdEZWNsaW5lJywgbWV0aG9kX2lkOiAnZGVueUxpdmVjaGF0Q2FsbCcsIHBhcmFtczogJycgfSxcblx0XHRcdF0sXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cm9vbUlkOiByb29tLl9pZCxcblx0XHRcdGRvbWFpbjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ppdHNpX0RvbWFpbicpLFxuXHRcdFx0aml0c2lSb29tOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSml0c2lfVVJMX1Jvb21fUHJlZml4JykgKyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndW5pcXVlSUQnKSArIHJvb21JZCxcblx0XHR9O1xuXHR9LFxufSk7XG5cbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c3RhcnRGaWxlVXBsb2FkUm9vbScocm9vbUlkLCB0b2tlbikge1xuXHRcdGNvbnN0IGd1ZXN0ID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbik7XG5cblx0XHRjb25zdCBtZXNzYWdlID0ge1xuXHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdHJpZDogcm9vbUlkIHx8IFJhbmRvbS5pZCgpLFxuXHRcdFx0bXNnOiAnJyxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0dG9rZW46IGd1ZXN0LnRva2VuLFxuXHRcdH07XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRSb29tKGd1ZXN0LCBtZXNzYWdlKTtcblx0fSxcbn0pO1xuIiwiLyogZXNsaW50IG5ldy1jYXA6IFsyLCB7XCJjYXBJc05ld0V4Y2VwdGlvbnNcIjogW1wiTWF0Y2guT3B0aW9uYWxcIl19XSAqL1xuXG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnRyYW5zZmVyJyh0cmFuc2ZlckRhdGEpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDp0cmFuc2ZlcicgfSk7XG5cdFx0fVxuXG5cdFx0Y2hlY2sodHJhbnNmZXJEYXRhLCB7XG5cdFx0XHRyb29tSWQ6IFN0cmluZyxcblx0XHRcdHVzZXJJZDogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdGRlcGFydG1lbnRJZDogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZCh0cmFuc2ZlckRhdGEucm9vbUlkKTtcblxuXHRcdGNvbnN0IGd1ZXN0ID0gTGl2ZWNoYXRWaXNpdG9ycy5maW5kT25lQnlJZChyb29tLnYuX2lkKTtcblxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCBNZXRlb3IudXNlcklkKCksIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXHRcdGlmICghc3Vic2NyaXB0aW9uICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1JvbGUoTWV0ZW9yLnVzZXJJZCgpLCAnbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6dHJhbnNmZXInIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnRyYW5zZmVyKHJvb20sIGd1ZXN0LCB0cmFuc2ZlckRhdGEpO1xuXHR9LFxufSk7XG4iLCIvKiBnbG9iYWxzIEhUVFAgKi9cbmNvbnN0IHBvc3RDYXRjaEVycm9yID0gTWV0ZW9yLndyYXBBc3luYyhmdW5jdGlvbih1cmwsIG9wdGlvbnMsIHJlc29sdmUpIHtcblx0SFRUUC5wb3N0KHVybCwgb3B0aW9ucywgZnVuY3Rpb24oZXJyLCByZXMpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRyZXNvbHZlKG51bGwsIGVyci5yZXNwb25zZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc29sdmUobnVsbCwgcmVzKTtcblx0XHR9XG5cdH0pO1xufSk7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OndlYmhvb2tUZXN0JygpIHtcblx0XHR0aGlzLnVuYmxvY2soKTtcblxuXHRcdGNvbnN0IHNhbXBsZURhdGEgPSB7XG5cdFx0XHR0eXBlOiAnTGl2ZWNoYXRTZXNzaW9uJyxcblx0XHRcdF9pZDogJ2Zhc2Q2ZjVhNHNkNmY4YTRzZGYnLFxuXHRcdFx0bGFiZWw6ICd0aXRsZScsXG5cdFx0XHR0b3BpYzogJ2FzaW9kb2pmJyxcblx0XHRcdGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcblx0XHRcdGxhc3RNZXNzYWdlQXQ6IG5ldyBEYXRlKCksXG5cdFx0XHR0YWdzOiBbXG5cdFx0XHRcdCd0YWcxJyxcblx0XHRcdFx0J3RhZzInLFxuXHRcdFx0XHQndGFnMycsXG5cdFx0XHRdLFxuXHRcdFx0Y3VzdG9tRmllbGRzOiB7XG5cdFx0XHRcdHByb2R1Y3RJZDogJzEyMzQ1NicsXG5cdFx0XHR9LFxuXHRcdFx0dmlzaXRvcjoge1xuXHRcdFx0XHRfaWQ6ICcnLFxuXHRcdFx0XHRuYW1lOiAndmlzaXRvciBuYW1lJyxcblx0XHRcdFx0dXNlcm5hbWU6ICd2aXNpdG9yLXVzZXJuYW1lJyxcblx0XHRcdFx0ZGVwYXJ0bWVudDogJ2RlcGFydG1lbnQnLFxuXHRcdFx0XHRlbWFpbDogJ2VtYWlsQGFkZHJlc3MuY29tJyxcblx0XHRcdFx0cGhvbmU6ICcxOTI4NzMxOTI4NzMnLFxuXHRcdFx0XHRpcDogJzEyMy40NTYuNy44OScsXG5cdFx0XHRcdGJyb3dzZXI6ICdDaHJvbWUnLFxuXHRcdFx0XHRvczogJ0xpbnV4Jyxcblx0XHRcdFx0Y3VzdG9tRmllbGRzOiB7XG5cdFx0XHRcdFx0Y3VzdG9tZXJJZDogJzEyMzQ1NicsXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0YWdlbnQ6IHtcblx0XHRcdFx0X2lkOiAnYXNkZjg5YXM2ZGY4Jyxcblx0XHRcdFx0dXNlcm5hbWU6ICdhZ2VudC51c2VybmFtZScsXG5cdFx0XHRcdG5hbWU6ICdBZ2VudCBOYW1lJyxcblx0XHRcdFx0ZW1haWw6ICdhZ2VudEBlbWFpbC5jb20nLFxuXHRcdFx0fSxcblx0XHRcdG1lc3NhZ2VzOiBbe1xuXHRcdFx0XHR1c2VybmFtZTogJ3Zpc2l0b3ItdXNlcm5hbWUnLFxuXHRcdFx0XHRtc2c6ICdtZXNzYWdlIGNvbnRlbnQnLFxuXHRcdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdH0sIHtcblx0XHRcdFx0dXNlcm5hbWU6ICdhZ2VudC51c2VybmFtZScsXG5cdFx0XHRcdGFnZW50SWQ6ICdhc2RmODlhczZkZjgnLFxuXHRcdFx0XHRtc2c6ICdtZXNzYWdlIGNvbnRlbnQgZnJvbSBhZ2VudCcsXG5cdFx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0fV0sXG5cdFx0fTtcblxuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdCdYLVJvY2tldENoYXQtTGl2ZWNoYXQtVG9rZW4nOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfc2VjcmV0X3Rva2VuJyksXG5cdFx0XHR9LFxuXHRcdFx0ZGF0YTogc2FtcGxlRGF0YSxcblx0XHR9O1xuXG5cdFx0Y29uc3QgcmVzcG9uc2UgPSBwb3N0Q2F0Y2hFcnJvcihSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfd2ViaG9va1VybCcpLCBvcHRpb25zKTtcblxuXHRcdGNvbnNvbGUubG9nKCdyZXNwb25zZSAtPicsIHJlc3BvbnNlKTtcblxuXHRcdGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5zdGF0dXNDb2RlICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDIwMCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtd2ViaG9vay1yZXNwb25zZScpO1xuXHRcdH1cblx0fSxcbn0pO1xuXG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDp0YWtlSW5xdWlyeScoaW5xdWlyeUlkKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6dGFrZUlucXVpcnknIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGlucXVpcnkgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkuZmluZE9uZUJ5SWQoaW5xdWlyeUlkKTtcblxuXHRcdGlmICghaW5xdWlyeSB8fCBpbnF1aXJ5LnN0YXR1cyA9PT0gJ3Rha2VuJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnSW5xdWlyeSBhbHJlYWR5IHRha2VuJywgeyBtZXRob2Q6ICdsaXZlY2hhdDp0YWtlSW5xdWlyeScgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKE1ldGVvci51c2VySWQoKSk7XG5cblx0XHRjb25zdCBhZ2VudCA9IHtcblx0XHRcdGFnZW50SWQ6IHVzZXIuX2lkLFxuXHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0fTtcblxuXHRcdC8vIGFkZCBzdWJzY3JpcHRpb25cblx0XHRjb25zdCBzdWJzY3JpcHRpb25EYXRhID0ge1xuXHRcdFx0cmlkOiBpbnF1aXJ5LnJpZCxcblx0XHRcdG5hbWU6IGlucXVpcnkubmFtZSxcblx0XHRcdGFsZXJ0OiB0cnVlLFxuXHRcdFx0b3BlbjogdHJ1ZSxcblx0XHRcdHVucmVhZDogMSxcblx0XHRcdHVzZXJNZW50aW9uczogMSxcblx0XHRcdGdyb3VwTWVudGlvbnM6IDAsXG5cdFx0XHR1OiB7XG5cdFx0XHRcdF9pZDogYWdlbnQuYWdlbnRJZCxcblx0XHRcdFx0dXNlcm5hbWU6IGFnZW50LnVzZXJuYW1lLFxuXHRcdFx0fSxcblx0XHRcdHQ6ICdsJyxcblx0XHRcdGRlc2t0b3BOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdG1vYmlsZVB1c2hOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdGVtYWlsTm90aWZpY2F0aW9uczogJ2FsbCcsXG5cdFx0fTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuaW5zZXJ0KHN1YnNjcmlwdGlvbkRhdGEpO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmluY1VzZXJzQ291bnRCeUlkKGlucXVpcnkucmlkKTtcblxuXHRcdC8vIHVwZGF0ZSByb29tXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGlucXVpcnkucmlkKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmNoYW5nZUFnZW50QnlSb29tSWQoaW5xdWlyeS5yaWQsIGFnZW50KTtcblxuXHRcdHJvb20uc2VydmVkQnkgPSB7XG5cdFx0XHRfaWQ6IGFnZW50LmFnZW50SWQsXG5cdFx0XHR1c2VybmFtZTogYWdlbnQudXNlcm5hbWUsXG5cdFx0fTtcblxuXHRcdC8vIG1hcmsgaW5xdWlyeSBhcyB0YWtlblxuXHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0SW5xdWlyeS50YWtlSW5xdWlyeShpbnF1aXJ5Ll9pZCk7XG5cblx0XHQvLyByZW1vdmUgc2VuZGluZyBtZXNzYWdlIGZyb20gZ3Vlc3Qgd2lkZ2V0XG5cdFx0Ly8gZG9udCBjaGVjayBpZiBzZXR0aW5nIGlzIHRydWUsIGJlY2F1c2UgaWYgc2V0dGluZ3dhcyBzd2l0Y2hlZCBvZmYgaW5iZXR3ZWVuICBndWVzdCBlbnRlcmVkIHBvb2wsXG5cdFx0Ly8gYW5kIGlucXVpcnkgYmVpbmcgdGFrZW4sIG1lc3NhZ2Ugd291bGQgbm90IGJlIHN3aXRjaGVkIG9mZi5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVDb21tYW5kV2l0aFJvb21JZEFuZFVzZXIoJ2Nvbm5lY3RlZCcsIHJvb20uX2lkLCB1c2VyKTtcblxuXHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuc3RyZWFtLmVtaXQocm9vbS5faWQsIHtcblx0XHRcdHR5cGU6ICdhZ2VudERhdGEnLFxuXHRcdFx0ZGF0YTogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvKGFnZW50LmFnZW50SWQpLFxuXHRcdH0pO1xuXG5cdFx0Ly8gcmV0dXJuIGlucXVpcnkgKGZvciByZWRpcmVjdGluZyBhZ2VudCB0byB0aGUgcm9vbSByb3V0ZSlcblx0XHRyZXR1cm4gaW5xdWlyeTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmV0dXJuQXNJbnF1aXJ5JyhyaWQsIGRlcGFydG1lbnRJZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1sLXJvb20nKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVEZXBhcnRtZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZXR1cm5Sb29tQXNJbnF1aXJ5KHJpZCwgZGVwYXJ0bWVudElkKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZU9mZmljZUhvdXJzJyhkYXksIHN0YXJ0LCBmaW5pc2gsIG9wZW4pIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdE9mZmljZUhvdXIudXBkYXRlSG91cnMoZGF5LCBzdGFydCwgZmluaXNoLCBvcGVuKTtcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFscyBlbWFpbFNldHRpbmdzLCBERFBSYXRlTGltaXRlciAqL1xuLyogU2VuZCBhIHRyYW5zY3JpcHQgb2YgdGhlIHJvb20gY29udmVyc3RhdGlvbiB0byB0aGUgZ2l2ZW4gZW1haWwgKi9cbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcblxuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzZW5kVHJhbnNjcmlwdCcodG9rZW4sIHJpZCwgZW1haWwpIHtcblx0XHRjaGVjayhyaWQsIFN0cmluZyk7XG5cdFx0Y2hlY2soZW1haWwsIFN0cmluZyk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblxuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuKTtcblx0XHRjb25zdCB1c2VyTGFuZ3VhZ2UgPSAodmlzaXRvciAmJiB2aXNpdG9yLmxhbmd1YWdlKSB8fCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnbGFuZ3VhZ2UnKSB8fCAnZW4nO1xuXG5cdFx0Ly8gYWxsb3cgdG8gb25seSB1c2VyIHRvIHNlbmQgdHJhbnNjcmlwdHMgZnJvbSB0aGVpciBvd24gY2hhdHNcblx0XHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAnbCcgfHwgIXJvb20udiB8fCByb29tLnYudG9rZW4gIT09IHRva2VuKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWVzc2FnZXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kVmlzaWJsZUJ5Um9vbUlkTm90Q29udGFpbmluZ1R5cGVzKHJpZCwgWydsaXZlY2hhdF9uYXZpZ2F0aW9uX2hpc3RvcnknXSwgeyBzb3J0OiB7IHRzIDogMSB9IH0pO1xuXHRcdGNvbnN0IGhlYWRlciA9IFJvY2tldENoYXQucGxhY2Vob2xkZXJzLnJlcGxhY2UoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0VtYWlsX0hlYWRlcicpIHx8ICcnKTtcblx0XHRjb25zdCBmb290ZXIgPSBSb2NrZXRDaGF0LnBsYWNlaG9sZGVycy5yZXBsYWNlKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdFbWFpbF9Gb290ZXInKSB8fCAnJyk7XG5cblx0XHRsZXQgaHRtbCA9ICc8ZGl2PiA8aHI+Jztcblx0XHRtZXNzYWdlcy5mb3JFYWNoKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRpZiAobWVzc2FnZS50ICYmIFsnY29tbWFuZCcsICdsaXZlY2hhdC1jbG9zZScsICdsaXZlY2hhdF92aWRlb19jYWxsJ10uaW5kZXhPZihtZXNzYWdlLnQpICE9PSAtMSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGxldCBhdXRob3I7XG5cdFx0XHRpZiAobWVzc2FnZS51Ll9pZCA9PT0gdmlzaXRvci5faWQpIHtcblx0XHRcdFx0YXV0aG9yID0gVEFQaTE4bi5fXygnWW91JywgeyBsbmc6IHVzZXJMYW5ndWFnZSB9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF1dGhvciA9IG1lc3NhZ2UudS51c2VybmFtZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZGF0ZXRpbWUgPSBtb21lbnQobWVzc2FnZS50cykubG9jYWxlKHVzZXJMYW5ndWFnZSkuZm9ybWF0KCdMTEwnKTtcblx0XHRcdGNvbnN0IHNpbmdsZU1lc3NhZ2UgPSBgXG5cdFx0XHRcdDxwPjxzdHJvbmc+JHsgYXV0aG9yIH08L3N0cm9uZz4gIDxlbT4keyBkYXRldGltZSB9PC9lbT48L3A+XG5cdFx0XHRcdDxwPiR7IG1lc3NhZ2UubXNnIH08L3A+XG5cdFx0XHRgO1xuXHRcdFx0aHRtbCA9IGh0bWwgKyBzaW5nbGVNZXNzYWdlO1xuXHRcdH0pO1xuXG5cdFx0aHRtbCA9IGAkeyBodG1sIH08L2Rpdj5gO1xuXG5cdFx0bGV0IGZyb21FbWFpbCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGcm9tX0VtYWlsJykubWF0Y2goL1xcYltBLVowLTkuXyUrLV0rQCg/OltBLVowLTktXStcXC4pK1tBLVpdezIsNH1cXGIvaSk7XG5cblx0XHRpZiAoZnJvbUVtYWlsKSB7XG5cdFx0XHRmcm9tRW1haWwgPSBmcm9tRW1haWxbMF07XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZyb21FbWFpbCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGcm9tX0VtYWlsJyk7XG5cdFx0fVxuXG5cdFx0ZW1haWxTZXR0aW5ncyA9IHtcblx0XHRcdHRvOiBlbWFpbCxcblx0XHRcdGZyb206IGZyb21FbWFpbCxcblx0XHRcdHJlcGx5VG86IGZyb21FbWFpbCxcblx0XHRcdHN1YmplY3Q6IFRBUGkxOG4uX18oJ1RyYW5zY3JpcHRfb2ZfeW91cl9saXZlY2hhdF9jb252ZXJzYXRpb24nLCB7IGxuZzogdXNlckxhbmd1YWdlIH0pLFxuXHRcdFx0aHRtbDogaGVhZGVyICsgaHRtbCArIGZvb3Rlcixcblx0XHR9O1xuXG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdEVtYWlsLnNlbmQoZW1haWxTZXR0aW5ncyk7XG5cdFx0fSk7XG5cblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdsaXZlY2hhdC5zZW5kVHJhbnNjcmlwdCcsIG1lc3NhZ2VzLCBlbWFpbCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuXG5ERFBSYXRlTGltaXRlci5hZGRSdWxlKHtcblx0dHlwZTogJ21ldGhvZCcsXG5cdG5hbWU6ICdsaXZlY2hhdDpzZW5kVHJhbnNjcmlwdCcsXG5cdGNvbm5lY3Rpb25JZCgpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0sIDEsIDUwMDApO1xuIiwiLyoqXG4gKiBTZXRzIGFuIHVzZXIgYXMgKG5vbilvcGVyYXRvclxuICogQHBhcmFtIHtzdHJpbmd9IF9pZCAtIFVzZXIncyBfaWRcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3BlcmF0b3IgLSBGbGFnIHRvIHNldCBhcyBvcGVyYXRvciBvciBub3RcbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0T3BlcmF0b3IgPSBmdW5jdGlvbihfaWQsIG9wZXJhdG9yKSB7XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRvcGVyYXRvcixcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShfaWQsIHVwZGF0ZSk7XG59O1xuXG4vKipcbiAqIEdldHMgYWxsIG9ubGluZSBhZ2VudHNcbiAqIEByZXR1cm5cbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9ubGluZUFnZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRzdGF0dXM6IHtcblx0XHRcdCRleGlzdHM6IHRydWUsXG5cdFx0XHQkbmU6ICdvZmZsaW5lJyxcblx0XHR9LFxuXHRcdHN0YXR1c0xpdmVjaGF0OiAnYXZhaWxhYmxlJyxcblx0XHRyb2xlczogJ2xpdmVjaGF0LWFnZW50Jyxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5KTtcbn07XG5cbi8qKlxuICogRmluZCBhbiBvbmxpbmUgYWdlbnQgYnkgaGlzIHVzZXJuYW1lXG4gKiBAcmV0dXJuXG4gKi9cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVPbmxpbmVBZ2VudEJ5VXNlcm5hbWUgPSBmdW5jdGlvbih1c2VybmFtZSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHR1c2VybmFtZSxcblx0XHRzdGF0dXM6IHtcblx0XHRcdCRleGlzdHM6IHRydWUsXG5cdFx0XHQkbmU6ICdvZmZsaW5lJyxcblx0XHR9LFxuXHRcdHN0YXR1c0xpdmVjaGF0OiAnYXZhaWxhYmxlJyxcblx0XHRyb2xlczogJ2xpdmVjaGF0LWFnZW50Jyxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5KTtcbn07XG5cbi8qKlxuICogR2V0cyBhbGwgYWdlbnRzXG4gKiBAcmV0dXJuXG4gKi9cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRBZ2VudHMgPSBmdW5jdGlvbigpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0cm9sZXM6ICdsaXZlY2hhdC1hZ2VudCcsXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG4vKipcbiAqIEZpbmQgb25saW5lIHVzZXJzIGZyb20gYSBsaXN0XG4gKiBAcGFyYW0ge2FycmF5fSB1c2VyTGlzdCAtIGFycmF5IG9mIHVzZXJuYW1lc1xuICogQHJldHVyblxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25saW5lVXNlckZyb21MaXN0ID0gZnVuY3Rpb24odXNlckxpc3QpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0c3RhdHVzOiB7XG5cdFx0XHQkZXhpc3RzOiB0cnVlLFxuXHRcdFx0JG5lOiAnb2ZmbGluZScsXG5cdFx0fSxcblx0XHRzdGF0dXNMaXZlY2hhdDogJ2F2YWlsYWJsZScsXG5cdFx0cm9sZXM6ICdsaXZlY2hhdC1hZ2VudCcsXG5cdFx0dXNlcm5hbWU6IHtcblx0XHRcdCRpbjogW10uY29uY2F0KHVzZXJMaXN0KSxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnkpO1xufTtcblxuLyoqXG4gKiBHZXQgbmV4dCB1c2VyIGFnZW50IGluIG9yZGVyXG4gKiBAcmV0dXJuIHtvYmplY3R9IFVzZXIgZnJvbSBkYlxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXROZXh0QWdlbnQgPSBmdW5jdGlvbigpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0c3RhdHVzOiB7XG5cdFx0XHQkZXhpc3RzOiB0cnVlLFxuXHRcdFx0JG5lOiAnb2ZmbGluZScsXG5cdFx0fSxcblx0XHRzdGF0dXNMaXZlY2hhdDogJ2F2YWlsYWJsZScsXG5cdFx0cm9sZXM6ICdsaXZlY2hhdC1hZ2VudCcsXG5cdH07XG5cblx0Y29uc3QgY29sbGVjdGlvbk9iaiA9IHRoaXMubW9kZWwucmF3Q29sbGVjdGlvbigpO1xuXHRjb25zdCBmaW5kQW5kTW9kaWZ5ID0gTWV0ZW9yLndyYXBBc3luYyhjb2xsZWN0aW9uT2JqLmZpbmRBbmRNb2RpZnksIGNvbGxlY3Rpb25PYmopO1xuXG5cdGNvbnN0IHNvcnQgPSB7XG5cdFx0bGl2ZWNoYXRDb3VudDogMSxcblx0XHR1c2VybmFtZTogMSxcblx0fTtcblxuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JGluYzoge1xuXHRcdFx0bGl2ZWNoYXRDb3VudDogMSxcblx0XHR9LFxuXHR9O1xuXG5cdGNvbnN0IHVzZXIgPSBmaW5kQW5kTW9kaWZ5KHF1ZXJ5LCBzb3J0LCB1cGRhdGUpO1xuXHRpZiAodXNlciAmJiB1c2VyLnZhbHVlKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFnZW50SWQ6IHVzZXIudmFsdWUuX2lkLFxuXHRcdFx0dXNlcm5hbWU6IHVzZXIudmFsdWUudXNlcm5hbWUsXG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxufTtcblxuLyoqXG4gKiBDaGFuZ2UgdXNlcidzIGxpdmVjaGF0IHN0YXR1c1xuICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIC0gVmlzaXRvciB0b2tlblxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRMaXZlY2hhdFN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJJZCwgc3RhdHVzKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZDogdXNlcklkLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRzdGF0dXNMaXZlY2hhdDogc3RhdHVzLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuLyoqXG4gKiBjaGFuZ2UgYWxsIGxpdmVjaGF0IGFnZW50cyBsaXZlY2hhdCBzdGF0dXMgdG8gXCJub3QtYXZhaWxhYmxlXCJcbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuY2xvc2VPZmZpY2UgPSBmdW5jdGlvbigpIHtcblx0c2VsZiA9IHRoaXM7XG5cdHNlbGYuZmluZEFnZW50cygpLmZvckVhY2goZnVuY3Rpb24oYWdlbnQpIHtcblx0XHRzZWxmLnNldExpdmVjaGF0U3RhdHVzKGFnZW50Ll9pZCwgJ25vdC1hdmFpbGFibGUnKTtcblx0fSk7XG59O1xuXG4vKipcbiAqIGNoYW5nZSBhbGwgbGl2ZWNoYXQgYWdlbnRzIGxpdmVjaGF0IHN0YXR1cyB0byBcImF2YWlsYWJsZVwiXG4gKi9cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLm9wZW5PZmZpY2UgPSBmdW5jdGlvbigpIHtcblx0c2VsZiA9IHRoaXM7XG5cdHNlbGYuZmluZEFnZW50cygpLmZvckVhY2goZnVuY3Rpb24oYWdlbnQpIHtcblx0XHRzZWxmLnNldExpdmVjaGF0U3RhdHVzKGFnZW50Ll9pZCwgJ2F2YWlsYWJsZScpO1xuXHR9KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldEFnZW50SW5mbyA9IGZ1bmN0aW9uKGFnZW50SWQpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkOiBhZ2VudElkLFxuXHR9O1xuXG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0ZmllbGRzOiB7XG5cdFx0XHRuYW1lOiAxLFxuXHRcdFx0dXNlcm5hbWU6IDEsXG5cdFx0XHRwaG9uZTogMSxcblx0XHRcdGN1c3RvbUZpZWxkczogMSxcblx0XHR9LFxuXHR9O1xuXG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfc2hvd19hZ2VudF9lbWFpbCcpKSB7XG5cdFx0b3B0aW9ucy5maWVsZHMuZW1haWxzID0gMTtcblx0fVxuXG5cdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnksIG9wdGlvbnMpO1xufTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG4vKipcbiAqIEdldHMgdmlzaXRvciBieSB0b2tlblxuICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIC0gVmlzaXRvciB0b2tlblxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVTdXJ2ZXlGZWVkYmFja0J5SWQgPSBmdW5jdGlvbihfaWQsIHN1cnZleUZlZWRiYWNrKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZCxcblx0fTtcblxuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0c3VydmV5RmVlZGJhY2ssXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVMaXZlY2hhdERhdGFCeVRva2VuID0gZnVuY3Rpb24odG9rZW4sIGtleSwgdmFsdWUsIG92ZXJ3cml0ZSA9IHRydWUpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0J3YudG9rZW4nOiB0b2tlbixcblx0XHRvcGVuOiB0cnVlLFxuXHR9O1xuXG5cdGlmICghb3ZlcndyaXRlKSB7XG5cdFx0Y29uc3Qgcm9vbSA9IHRoaXMuZmluZE9uZShxdWVyeSwgeyBmaWVsZHM6IHsgbGl2ZWNoYXREYXRhOiAxIH0gfSk7XG5cdFx0aWYgKHJvb20ubGl2ZWNoYXREYXRhICYmIHR5cGVvZiByb29tLmxpdmVjaGF0RGF0YVtrZXldICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHR9XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdFtgbGl2ZWNoYXREYXRhLiR7IGtleSB9YF06IHZhbHVlLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZExpdmVjaGF0ID0gZnVuY3Rpb24oZmlsdGVyID0ge30sIG9mZnNldCA9IDAsIGxpbWl0ID0gMjApIHtcblx0Y29uc3QgcXVlcnkgPSBfLmV4dGVuZChmaWx0ZXIsIHtcblx0XHR0OiAnbCcsXG5cdH0pO1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnksIHsgc29ydDogeyB0czogLSAxIH0sIG9mZnNldCwgbGltaXQgfSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kTGl2ZWNoYXRCeUlkID0gZnVuY3Rpb24oX2lkLCBmaWVsZHMpIHtcblx0Y29uc3Qgb3B0aW9ucyA9IHt9O1xuXG5cdGlmIChmaWVsZHMpIHtcblx0XHRvcHRpb25zLmZpZWxkcyA9IGZpZWxkcztcblx0fVxuXG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHQ6ICdsJyxcblx0XHRfaWQsXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgbmV4dCB2aXNpdG9yIG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIG5leHQgdmlzaXRvciBuYW1lXG4gKi9cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZUxpdmVjaGF0Um9vbUNvdW50ID0gZnVuY3Rpb24oKSB7XG5cdGNvbnN0IHNldHRpbmdzUmF3ID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MubW9kZWwucmF3Q29sbGVjdGlvbigpO1xuXHRjb25zdCBmaW5kQW5kTW9kaWZ5ID0gTWV0ZW9yLndyYXBBc3luYyhzZXR0aW5nc1Jhdy5maW5kQW5kTW9kaWZ5LCBzZXR0aW5nc1Jhdyk7XG5cblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkOiAnTGl2ZWNoYXRfUm9vbV9Db3VudCcsXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRpbmM6IHtcblx0XHRcdHZhbHVlOiAxLFxuXHRcdH0sXG5cdH07XG5cblx0Y29uc3QgbGl2ZWNoYXRDb3VudCA9IGZpbmRBbmRNb2RpZnkocXVlcnksIG51bGwsIHVwZGF0ZSk7XG5cblx0cmV0dXJuIGxpdmVjaGF0Q291bnQudmFsdWUudmFsdWU7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuID0gZnVuY3Rpb24odmlzaXRvclRva2VuLCBvcHRpb25zKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdG9wZW46IHRydWUsXG5cdFx0J3YudG9rZW4nOiB2aXNpdG9yVG9rZW4sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuQW5kRGVwYXJ0bWVudElkID0gZnVuY3Rpb24odmlzaXRvclRva2VuLCBkZXBhcnRtZW50SWQsIG9wdGlvbnMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0b3BlbjogdHJ1ZSxcblx0XHQndi50b2tlbic6IHZpc2l0b3JUb2tlbixcblx0XHRkZXBhcnRtZW50SWQsXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlWaXNpdG9yVG9rZW4gPSBmdW5jdGlvbih2aXNpdG9yVG9rZW4pIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0J3YudG9rZW4nOiB2aXNpdG9yVG9rZW4sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlWaXNpdG9ySWQgPSBmdW5jdGlvbih2aXNpdG9ySWQpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0J3YuX2lkJzogdmlzaXRvcklkLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnkpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZU9wZW5CeVZpc2l0b3JUb2tlbiA9IGZ1bmN0aW9uKHRva2VuLCByb29tSWQpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkOiByb29tSWQsXG5cdFx0b3BlbjogdHJ1ZSxcblx0XHQndi50b2tlbic6IHRva2VuLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnkpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0UmVzcG9uc2VCeVJvb21JZCA9IGZ1bmN0aW9uKHJvb21JZCwgcmVzcG9uc2UpIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRfaWQ6IHJvb21JZCxcblx0fSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHJlc3BvbnNlQnk6IHtcblx0XHRcdFx0X2lkOiByZXNwb25zZS51c2VyLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHJlc3BvbnNlLnVzZXIudXNlcm5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0cmVzcG9uc2VEYXRlOiByZXNwb25zZS5yZXNwb25zZURhdGUsXG5cdFx0XHRyZXNwb25zZVRpbWU6IHJlc3BvbnNlLnJlc3BvbnNlVGltZSxcblx0XHR9LFxuXHRcdCR1bnNldDoge1xuXHRcdFx0d2FpdGluZ1Jlc3BvbnNlOiAxLFxuXHRcdH0sXG5cdH0pO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuY2xvc2VCeVJvb21JZCA9IGZ1bmN0aW9uKHJvb21JZCwgY2xvc2VJbmZvKSB7XG5cdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0X2lkOiByb29tSWQsXG5cdH0sIHtcblx0XHQkc2V0OiB7XG5cdFx0XHRjbG9zZXI6IGNsb3NlSW5mby5jbG9zZXIsXG5cdFx0XHRjbG9zZWRCeTogY2xvc2VJbmZvLmNsb3NlZEJ5LFxuXHRcdFx0Y2xvc2VkQXQ6IGNsb3NlSW5mby5jbG9zZWRBdCxcblx0XHRcdGNoYXREdXJhdGlvbjogY2xvc2VJbmZvLmNoYXREdXJhdGlvbixcblx0XHRcdCd2LnN0YXR1cyc6ICdvZmZsaW5lJyxcblx0XHR9LFxuXHRcdCR1bnNldDoge1xuXHRcdFx0b3BlbjogMSxcblx0XHR9LFxuXHR9KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlBZ2VudCA9IGZ1bmN0aW9uKHVzZXJJZCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRvcGVuOiB0cnVlLFxuXHRcdCdzZXJ2ZWRCeS5faWQnOiB1c2VySWQsXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jaGFuZ2VBZ2VudEJ5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkLCBuZXdBZ2VudCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IHJvb21JZCxcblx0fTtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHNlcnZlZEJ5OiB7XG5cdFx0XHRcdF9pZDogbmV3QWdlbnQuYWdlbnRJZCxcblx0XHRcdFx0dXNlcm5hbWU6IG5ld0FnZW50LnVzZXJuYW1lLFxuXHRcdFx0fSxcblx0XHR9LFxuXHR9O1xuXG5cdHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuY2hhbmdlRGVwYXJ0bWVudElkQnlSb29tSWQgPSBmdW5jdGlvbihyb29tSWQsIGRlcGFydG1lbnRJZCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IHJvb21JZCxcblx0fTtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdGRlcGFydG1lbnRJZCxcblx0XHR9LFxuXHR9O1xuXG5cdHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2F2ZUNSTURhdGFCeVJvb21JZCA9IGZ1bmN0aW9uKHJvb21JZCwgY3JtRGF0YSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IHJvb21JZCxcblx0fTtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdGNybURhdGEsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVWaXNpdG9yU3RhdHVzID0gZnVuY3Rpb24odG9rZW4sIHN0YXR1cykge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHQndi50b2tlbic6IHRva2VuLFxuXHRcdG9wZW46IHRydWUsXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdCd2LnN0YXR1cyc6IHN0YXR1cyxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnJlbW92ZUFnZW50QnlSb29tSWQgPSBmdW5jdGlvbihyb29tSWQpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkOiByb29tSWQsXG5cdH07XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkdW5zZXQ6IHtcblx0XHRcdHNlcnZlZEJ5OiAxLFxuXHRcdH0sXG5cdH07XG5cblx0dGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuIiwiUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMua2VlcEhpc3RvcnlGb3JUb2tlbiA9IGZ1bmN0aW9uKHRva2VuKSB7XG5cdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0J25hdmlnYXRpb24udG9rZW4nOiB0b2tlbixcblx0XHRleHBpcmVBdDoge1xuXHRcdFx0JGV4aXN0czogdHJ1ZSxcblx0XHR9LFxuXHR9LCB7XG5cdFx0JHVuc2V0OiB7XG5cdFx0XHRleHBpcmVBdDogMSxcblx0XHR9LFxuXHR9LCB7XG5cdFx0bXVsdGk6IHRydWUsXG5cdH0pO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuc2V0Um9vbUlkQnlUb2tlbiA9IGZ1bmN0aW9uKHRva2VuLCByaWQpIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHQnbmF2aWdhdGlvbi50b2tlbic6IHRva2VuLFxuXHRcdHJpZDogbnVsbCxcblx0fSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHJpZCxcblx0XHR9LFxuXHR9LCB7XG5cdFx0bXVsdGk6IHRydWUsXG5cdH0pO1xufTtcbiIsImNsYXNzIExpdmVjaGF0RXh0ZXJuYWxNZXNzYWdlIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignbGl2ZWNoYXRfZXh0ZXJuYWxfbWVzc2FnZScpO1xuXG5cdFx0aWYgKE1ldGVvci5pc0NsaWVudCkge1xuXHRcdFx0dGhpcy5faW5pdE1vZGVsKCdsaXZlY2hhdF9leHRlcm5hbF9tZXNzYWdlJyk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gRklORFxuXHRmaW5kQnlSb29tSWQocm9vbUlkLCBzb3J0ID0geyB0czogLTEgfSkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0geyByaWQ6IHJvb21JZCB9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgeyBzb3J0IH0pO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RXh0ZXJuYWxNZXNzYWdlID0gbmV3IExpdmVjaGF0RXh0ZXJuYWxNZXNzYWdlKCk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuLyoqXG4gKiBMaXZlY2hhdCBDdXN0b20gRmllbGRzIG1vZGVsXG4gKi9cbmNsYXNzIExpdmVjaGF0Q3VzdG9tRmllbGQgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9jdXN0b21fZmllbGQnKTtcblx0fVxuXG5cdC8vIEZJTkRcblx0ZmluZE9uZUJ5SWQoX2lkLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7IF9pZCB9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHRjcmVhdGVPclVwZGF0ZUN1c3RvbUZpZWxkKF9pZCwgZmllbGQsIGxhYmVsLCBzY29wZSwgdmlzaWJpbGl0eSwgZXh0cmFEYXRhKSB7XG5cdFx0Y29uc3QgcmVjb3JkID0ge1xuXHRcdFx0bGFiZWwsXG5cdFx0XHRzY29wZSxcblx0XHRcdHZpc2liaWxpdHksXG5cdFx0fTtcblxuXHRcdF8uZXh0ZW5kKHJlY29yZCwgZXh0cmFEYXRhKTtcblxuXHRcdGlmIChfaWQpIHtcblx0XHRcdHRoaXMudXBkYXRlKHsgX2lkIH0sIHsgJHNldDogcmVjb3JkIH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZWNvcmQuX2lkID0gZmllbGQ7XG5cdFx0XHRfaWQgPSB0aGlzLmluc2VydChyZWNvcmQpO1xuXHRcdH1cblxuXHRcdHJldHVybiByZWNvcmQ7XG5cdH1cblxuXHQvLyBSRU1PVkVcblx0cmVtb3ZlQnlJZChfaWQpIHtcblx0XHRjb25zdCBxdWVyeSA9IHsgX2lkIH07XG5cblx0XHRyZXR1cm4gdGhpcy5yZW1vdmUocXVlcnkpO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQgPSBuZXcgTGl2ZWNoYXRDdXN0b21GaWVsZCgpO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbi8qKlxuICogTGl2ZWNoYXQgRGVwYXJ0bWVudCBtb2RlbFxuICovXG5jbGFzcyBMaXZlY2hhdERlcGFydG1lbnQgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9kZXBhcnRtZW50Jyk7XG5cblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHtcblx0XHRcdG51bUFnZW50czogMSxcblx0XHRcdGVuYWJsZWQ6IDEsXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBGSU5EXG5cdGZpbmRPbmVCeUlkKF9pZCwgb3B0aW9ucykge1xuXHRcdGNvbnN0IHF1ZXJ5ID0geyBfaWQgfTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnksIG9wdGlvbnMpO1xuXHR9XG5cblx0ZmluZEJ5RGVwYXJ0bWVudElkKF9pZCwgb3B0aW9ucykge1xuXHRcdGNvbnN0IHF1ZXJ5ID0geyBfaWQgfTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmQocXVlcnksIG9wdGlvbnMpO1xuXHR9XG5cblx0Y3JlYXRlT3JVcGRhdGVEZXBhcnRtZW50KF9pZCwgeyBlbmFibGVkLCBuYW1lLCBkZXNjcmlwdGlvbiwgc2hvd09uUmVnaXN0cmF0aW9uIH0sIGFnZW50cykge1xuXHRcdGFnZW50cyA9IFtdLmNvbmNhdChhZ2VudHMpO1xuXG5cdFx0Y29uc3QgcmVjb3JkID0ge1xuXHRcdFx0ZW5hYmxlZCxcblx0XHRcdG5hbWUsXG5cdFx0XHRkZXNjcmlwdGlvbixcblx0XHRcdG51bUFnZW50czogYWdlbnRzLmxlbmd0aCxcblx0XHRcdHNob3dPblJlZ2lzdHJhdGlvbixcblx0XHR9O1xuXG5cdFx0aWYgKF9pZCkge1xuXHRcdFx0dGhpcy51cGRhdGUoeyBfaWQgfSwgeyAkc2V0OiByZWNvcmQgfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdF9pZCA9IHRoaXMuaW5zZXJ0KHJlY29yZCk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2F2ZWRBZ2VudHMgPSBfLnBsdWNrKFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kQnlEZXBhcnRtZW50SWQoX2lkKS5mZXRjaCgpLCAnYWdlbnRJZCcpO1xuXHRcdGNvbnN0IGFnZW50c1RvU2F2ZSA9IF8ucGx1Y2soYWdlbnRzLCAnYWdlbnRJZCcpO1xuXG5cdFx0Ly8gcmVtb3ZlIG90aGVyIGFnZW50c1xuXHRcdF8uZGlmZmVyZW5jZShzYXZlZEFnZW50cywgYWdlbnRzVG9TYXZlKS5mb3JFYWNoKChhZ2VudElkKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMucmVtb3ZlQnlEZXBhcnRtZW50SWRBbmRBZ2VudElkKF9pZCwgYWdlbnRJZCk7XG5cdFx0fSk7XG5cblx0XHRhZ2VudHMuZm9yRWFjaCgoYWdlbnQpID0+IHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5zYXZlQWdlbnQoe1xuXHRcdFx0XHRhZ2VudElkOiBhZ2VudC5hZ2VudElkLFxuXHRcdFx0XHRkZXBhcnRtZW50SWQ6IF9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IGFnZW50LnVzZXJuYW1lLFxuXHRcdFx0XHRjb3VudDogYWdlbnQuY291bnQgPyBwYXJzZUludChhZ2VudC5jb3VudCkgOiAwLFxuXHRcdFx0XHRvcmRlcjogYWdlbnQub3JkZXIgPyBwYXJzZUludChhZ2VudC5vcmRlcikgOiAwLFxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gXy5leHRlbmQocmVjb3JkLCB7IF9pZCB9KTtcblx0fVxuXG5cdC8vIFJFTU9WRVxuXHRyZW1vdmVCeUlkKF9pZCkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0geyBfaWQgfTtcblxuXHRcdHJldHVybiB0aGlzLnJlbW92ZShxdWVyeSk7XG5cdH1cblxuXHRmaW5kRW5hYmxlZFdpdGhBZ2VudHMoKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRudW1BZ2VudHM6IHsgJGd0OiAwIH0sXG5cdFx0XHRlbmFibGVkOiB0cnVlLFxuXHRcdH07XG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50ID0gbmV3IExpdmVjaGF0RGVwYXJ0bWVudCgpO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG4vKipcbiAqIExpdmVjaGF0IERlcGFydG1lbnQgbW9kZWxcbiAqL1xuY2xhc3MgTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignbGl2ZWNoYXRfZGVwYXJ0bWVudF9hZ2VudHMnKTtcblx0fVxuXG5cdGZpbmRCeURlcGFydG1lbnRJZChkZXBhcnRtZW50SWQpIHtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHsgZGVwYXJ0bWVudElkIH0pO1xuXHR9XG5cblx0c2F2ZUFnZW50KGFnZW50KSB7XG5cdFx0cmV0dXJuIHRoaXMudXBzZXJ0KHtcblx0XHRcdGFnZW50SWQ6IGFnZW50LmFnZW50SWQsXG5cdFx0XHRkZXBhcnRtZW50SWQ6IGFnZW50LmRlcGFydG1lbnRJZCxcblx0XHR9LCB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZSxcblx0XHRcdFx0Y291bnQ6IHBhcnNlSW50KGFnZW50LmNvdW50KSxcblx0XHRcdFx0b3JkZXI6IHBhcnNlSW50KGFnZW50Lm9yZGVyKSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH1cblxuXHRyZW1vdmVCeURlcGFydG1lbnRJZEFuZEFnZW50SWQoZGVwYXJ0bWVudElkLCBhZ2VudElkKSB7XG5cdFx0dGhpcy5yZW1vdmUoeyBkZXBhcnRtZW50SWQsIGFnZW50SWQgfSk7XG5cdH1cblxuXHRnZXROZXh0QWdlbnRGb3JEZXBhcnRtZW50KGRlcGFydG1lbnRJZCkge1xuXHRcdGNvbnN0IGFnZW50cyA9IHRoaXMuZmluZEJ5RGVwYXJ0bWVudElkKGRlcGFydG1lbnRJZCkuZmV0Y2goKTtcblxuXHRcdGlmIChhZ2VudHMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3Qgb25saW5lVXNlcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25saW5lVXNlckZyb21MaXN0KF8ucGx1Y2soYWdlbnRzLCAndXNlcm5hbWUnKSk7XG5cblx0XHRjb25zdCBvbmxpbmVVc2VybmFtZXMgPSBfLnBsdWNrKG9ubGluZVVzZXJzLmZldGNoKCksICd1c2VybmFtZScpO1xuXG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRkZXBhcnRtZW50SWQsXG5cdFx0XHR1c2VybmFtZToge1xuXHRcdFx0XHQkaW46IG9ubGluZVVzZXJuYW1lcyxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGNvbnN0IHNvcnQgPSB7XG5cdFx0XHRjb3VudDogMSxcblx0XHRcdG9yZGVyOiAxLFxuXHRcdFx0dXNlcm5hbWU6IDEsXG5cdFx0fTtcblx0XHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0XHQkaW5jOiB7XG5cdFx0XHRcdGNvdW50OiAxLFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0Y29uc3QgY29sbGVjdGlvbk9iaiA9IHRoaXMubW9kZWwucmF3Q29sbGVjdGlvbigpO1xuXHRcdGNvbnN0IGZpbmRBbmRNb2RpZnkgPSBNZXRlb3Iud3JhcEFzeW5jKGNvbGxlY3Rpb25PYmouZmluZEFuZE1vZGlmeSwgY29sbGVjdGlvbk9iaik7XG5cblx0XHRjb25zdCBhZ2VudCA9IGZpbmRBbmRNb2RpZnkocXVlcnksIHNvcnQsIHVwZGF0ZSk7XG5cdFx0aWYgKGFnZW50ICYmIGFnZW50LnZhbHVlKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRhZ2VudElkOiBhZ2VudC52YWx1ZS5hZ2VudElkLFxuXHRcdFx0XHR1c2VybmFtZTogYWdlbnQudmFsdWUudXNlcm5hbWUsXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdH1cblxuXHRnZXRPbmxpbmVGb3JEZXBhcnRtZW50KGRlcGFydG1lbnRJZCkge1xuXHRcdGNvbnN0IGFnZW50cyA9IHRoaXMuZmluZEJ5RGVwYXJ0bWVudElkKGRlcGFydG1lbnRJZCkuZmV0Y2goKTtcblxuXHRcdGlmIChhZ2VudHMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gW107XG5cdFx0fVxuXG5cdFx0Y29uc3Qgb25saW5lVXNlcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25saW5lVXNlckZyb21MaXN0KF8ucGx1Y2soYWdlbnRzLCAndXNlcm5hbWUnKSk7XG5cblx0XHRjb25zdCBvbmxpbmVVc2VybmFtZXMgPSBfLnBsdWNrKG9ubGluZVVzZXJzLmZldGNoKCksICd1c2VybmFtZScpO1xuXG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRkZXBhcnRtZW50SWQsXG5cdFx0XHR1c2VybmFtZToge1xuXHRcdFx0XHQkaW46IG9ubGluZVVzZXJuYW1lcyxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGNvbnN0IGRlcEFnZW50cyA9IHRoaXMuZmluZChxdWVyeSk7XG5cblx0XHRpZiAoZGVwQWdlbnRzKSB7XG5cdFx0XHRyZXR1cm4gZGVwQWdlbnRzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gW107XG5cdFx0fVxuXHR9XG5cblx0ZmluZFVzZXJzSW5RdWV1ZSh1c2Vyc0xpc3QpIHtcblx0XHRjb25zdCBxdWVyeSA9IHt9O1xuXG5cdFx0aWYgKCFfLmlzRW1wdHkodXNlcnNMaXN0KSkge1xuXHRcdFx0cXVlcnkudXNlcm5hbWUgPSB7XG5cdFx0XHRcdCRpbjogdXNlcnNMaXN0LFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0c29ydDoge1xuXHRcdFx0XHRkZXBhcnRtZW50SWQ6IDEsXG5cdFx0XHRcdGNvdW50OiAxLFxuXHRcdFx0XHRvcmRlcjogMSxcblx0XHRcdFx0dXNlcm5hbWU6IDEsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdHJlcGxhY2VVc2VybmFtZU9mQWdlbnRCeVVzZXJJZCh1c2VySWQsIHVzZXJuYW1lKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7IGFnZW50SWQ6IHVzZXJJZCB9O1xuXG5cdFx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHR1c2VybmFtZSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlLCB7IG11bHRpOiB0cnVlIH0pO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cyA9IG5ldyBMaXZlY2hhdERlcGFydG1lbnRBZ2VudHMoKTtcbiIsIi8qKlxuICogTGl2ZWNoYXQgUGFnZSBWaXNpdGVkIG1vZGVsXG4gKi9cbmNsYXNzIExpdmVjaGF0UGFnZVZpc2l0ZWQgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9wYWdlX3Zpc2l0ZWQnKTtcblxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyB0b2tlbjogMSB9KTtcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgdHM6IDEgfSk7XG5cblx0XHQvLyBrZWVwIGhpc3RvcnkgZm9yIDEgbW9udGggaWYgdGhlIHZpc2l0b3IgZG9lcyBub3QgcmVnaXN0ZXJcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgZXhwaXJlQXQ6IDEgfSwgeyBzcGFyc2U6IDEsIGV4cGlyZUFmdGVyU2Vjb25kczogMCB9KTtcblx0fVxuXG5cdHNhdmVCeVRva2VuKHRva2VuLCBwYWdlSW5mbykge1xuXHRcdC8vIGtlZXAgaGlzdG9yeSBvZiB1bnJlZ2lzdGVyZWQgdmlzaXRvcnMgZm9yIDEgbW9udGhcblx0XHRjb25zdCBrZWVwSGlzdG9yeU1pbGlzZWNvbmRzID0gMjU5MjAwMDAwMDtcblxuXHRcdHJldHVybiB0aGlzLmluc2VydCh7XG5cdFx0XHR0b2tlbixcblx0XHRcdHBhZ2U6IHBhZ2VJbmZvLFxuXHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHRleHBpcmVBdDogbmV3IERhdGUoKS5nZXRUaW1lKCkgKyBrZWVwSGlzdG9yeU1pbGlzZWNvbmRzLFxuXHRcdH0pO1xuXHR9XG5cblx0ZmluZEJ5VG9rZW4odG9rZW4pIHtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHsgdG9rZW4gfSwgeyBzb3J0IDogeyB0czogLTEgfSwgbGltaXQ6IDIwIH0pO1xuXHR9XG5cblx0a2VlcEhpc3RvcnlGb3JUb2tlbih0b2tlbikge1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0XHR0b2tlbixcblx0XHRcdGV4cGlyZUF0OiB7XG5cdFx0XHRcdCRleGlzdHM6IHRydWUsXG5cdFx0XHR9LFxuXHRcdH0sIHtcblx0XHRcdCR1bnNldDoge1xuXHRcdFx0XHRleHBpcmVBdDogMSxcblx0XHRcdH0sXG5cdFx0fSwge1xuXHRcdFx0bXVsdGk6IHRydWUsXG5cdFx0fSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRQYWdlVmlzaXRlZCA9IG5ldyBMaXZlY2hhdFBhZ2VWaXNpdGVkKCk7XG4iLCIvKipcbiAqIExpdmVjaGF0IFRyaWdnZXIgbW9kZWxcbiAqL1xuY2xhc3MgTGl2ZWNoYXRUcmlnZ2VyIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignbGl2ZWNoYXRfdHJpZ2dlcicpO1xuXHR9XG5cblx0dXBkYXRlQnlJZChfaWQsIGRhdGEpIHtcblx0XHRyZXR1cm4gdGhpcy51cGRhdGUoeyBfaWQgfSwgeyAkc2V0OiBkYXRhIH0pO1xuXHR9XG5cblx0cmVtb3ZlQWxsKCkge1xuXHRcdHJldHVybiB0aGlzLnJlbW92ZSh7fSk7XG5cdH1cblxuXHRmaW5kQnlJZChfaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHsgX2lkIH0pO1xuXHR9XG5cblx0cmVtb3ZlQnlJZChfaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5yZW1vdmUoeyBfaWQgfSk7XG5cdH1cblxuXHRmaW5kRW5hYmxlZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHsgZW5hYmxlZDogdHJ1ZSB9KTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdFRyaWdnZXIgPSBuZXcgTGl2ZWNoYXRUcmlnZ2VyKCk7XG4iLCJNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudHJ5RW5zdXJlSW5kZXgoeyBvcGVuOiAxIH0sIHsgc3BhcnNlOiAxIH0pO1xuXHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy50cnlFbnN1cmVJbmRleCh7IGRlcGFydG1lbnRJZDogMSB9LCB7IHNwYXJzZTogMSB9KTtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudHJ5RW5zdXJlSW5kZXgoeyAndmlzaXRvckVtYWlscy5hZGRyZXNzJzogMSB9KTtcbn0pO1xuIiwiY2xhc3MgTGl2ZWNoYXRJbnF1aXJ5IGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignbGl2ZWNoYXRfaW5xdWlyeScpO1xuXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IHJpZDogMSB9KTsgLy8gcm9vbSBpZCBjb3JyZXNwb25kaW5nIHRvIHRoaXMgaW5xdWlyeVxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyBuYW1lOiAxIH0pOyAvLyBuYW1lIG9mIHRoZSBpbnF1aXJ5IChjbGllbnQgbmFtZSBmb3Igbm93KVxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyBtZXNzYWdlOiAxIH0pOyAvLyBtZXNzYWdlIHNlbnQgYnkgdGhlIGNsaWVudFxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyB0czogMSB9KTsgLy8gdGltZXN0YW1wXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IGFnZW50czogMSB9KTsgLy8gSWQncyBvZiB0aGUgYWdlbnRzIHdobyBjYW4gc2VlIHRoZSBpbnF1aXJ5IChoYW5kbGUgZGVwYXJ0bWVudHMpXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IHN0YXR1czogMSB9KTsgLy8gJ29wZW4nLCAndGFrZW4nXG5cdH1cblxuXHRmaW5kT25lQnlJZChpbnF1aXJ5SWQpIHtcblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHsgX2lkOiBpbnF1aXJ5SWQgfSk7XG5cdH1cblxuXHQvKlxuXHQgKiBtYXJrIHRoZSBpbnF1aXJ5IGFzIHRha2VuXG5cdCAqL1xuXHR0YWtlSW5xdWlyeShpbnF1aXJ5SWQpIHtcblx0XHR0aGlzLnVwZGF0ZSh7XG5cdFx0XHRfaWQ6IGlucXVpcnlJZCxcblx0XHR9LCB7XG5cdFx0XHQkc2V0OiB7IHN0YXR1czogJ3Rha2VuJyB9LFxuXHRcdH0pO1xuXHR9XG5cblx0Lypcblx0ICogbWFyayB0aGUgaW5xdWlyeSBhcyBjbG9zZWRcblx0ICovXG5cdGNsb3NlQnlSb29tSWQocm9vbUlkLCBjbG9zZUluZm8pIHtcblx0XHRyZXR1cm4gdGhpcy51cGRhdGUoe1xuXHRcdFx0cmlkOiByb29tSWQsXG5cdFx0fSwge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHRzdGF0dXM6ICdjbG9zZWQnLFxuXHRcdFx0XHRjbG9zZXI6IGNsb3NlSW5mby5jbG9zZXIsXG5cdFx0XHRcdGNsb3NlZEJ5OiBjbG9zZUluZm8uY2xvc2VkQnksXG5cdFx0XHRcdGNsb3NlZEF0OiBjbG9zZUluZm8uY2xvc2VkQXQsXG5cdFx0XHRcdGNoYXREdXJhdGlvbjogY2xvc2VJbmZvLmNoYXREdXJhdGlvbixcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH1cblxuXHQvKlxuXHQgKiBtYXJrIGlucXVpcnkgYXMgb3BlblxuXHQgKi9cblx0b3BlbklucXVpcnkoaW5xdWlyeUlkKSB7XG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRcdF9pZDogaW5xdWlyeUlkLFxuXHRcdH0sIHtcblx0XHRcdCRzZXQ6IHsgc3RhdHVzOiAnb3BlbicgfSxcblx0XHR9KTtcblx0fVxuXG5cdC8qXG5cdCAqIG1hcmsgaW5xdWlyeSBhcyBvcGVuIGFuZCBzZXQgYWdlbnRzXG5cdCAqL1xuXHRvcGVuSW5xdWlyeVdpdGhBZ2VudHMoaW5xdWlyeUlkLCBhZ2VudElkcykge1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0XHRfaWQ6IGlucXVpcnlJZCxcblx0XHR9LCB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdHN0YXR1czogJ29wZW4nLFxuXHRcdFx0XHRhZ2VudHM6IGFnZW50SWRzLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0fVxuXG5cdC8qXG5cdCAqIHJldHVybiB0aGUgc3RhdHVzIG9mIHRoZSBpbnF1aXJ5IChvcGVuIG9yIHRha2VuKVxuXHQgKi9cblx0Z2V0U3RhdHVzKGlucXVpcnlJZCkge1xuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUoeyBfaWQ6IGlucXVpcnlJZCB9KS5zdGF0dXM7XG5cdH1cblxuXHR1cGRhdGVWaXNpdG9yU3RhdHVzKHRva2VuLCBzdGF0dXMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdCd2LnRva2VuJzogdG9rZW4sXG5cdFx0XHRzdGF0dXM6ICdvcGVuJyxcblx0XHR9O1xuXG5cdFx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHQndi5zdGF0dXMnOiBzdGF0dXMsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5ID0gbmV3IExpdmVjaGF0SW5xdWlyeSgpO1xuIiwiaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuXG5jbGFzcyBMaXZlY2hhdE9mZmljZUhvdXIgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9vZmZpY2VfaG91cicpO1xuXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IGRheTogMSB9KTsgLy8gdGhlIGRheSBvZiB0aGUgd2VlayBtb25kYXkgLSBzdW5kYXlcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgc3RhcnQ6IDEgfSk7IC8vIHRoZSBvcGVuaW5nIGhvdXJzIG9mIHRoZSBvZmZpY2Vcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgZmluaXNoOiAxIH0pOyAvLyB0aGUgY2xvc2luZyBob3VycyBvZiB0aGUgb2ZmaWNlXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IG9wZW46IDEgfSk7IC8vIHdoZXRoZXIgb3Igbm90IHRoZSBvZmZpY2VzIGFyZSBvcGVuIG9uIHRoaXMgZGF5XG5cblx0XHQvLyBpZiB0aGVyZSBpcyBub3RoaW5nIGluIHRoZSBjb2xsZWN0aW9uLCBhZGQgZGVmYXVsdHNcblx0XHRpZiAodGhpcy5maW5kKCkuY291bnQoKSA9PT0gMCkge1xuXHRcdFx0dGhpcy5pbnNlcnQoeyBkYXkgOiAnTW9uZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogMSwgb3BlbiA6IHRydWUgfSk7XG5cdFx0XHR0aGlzLmluc2VydCh7IGRheSA6ICdUdWVzZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogMiwgb3BlbiA6IHRydWUgfSk7XG5cdFx0XHR0aGlzLmluc2VydCh7IGRheSA6ICdXZWRuZXNkYXknLCBzdGFydCA6ICcwODowMCcsIGZpbmlzaCA6ICcyMDowMCcsIGNvZGUgOiAzLCBvcGVuIDogdHJ1ZSB9KTtcblx0XHRcdHRoaXMuaW5zZXJ0KHsgZGF5IDogJ1RodXJzZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogNCwgb3BlbiA6IHRydWUgfSk7XG5cdFx0XHR0aGlzLmluc2VydCh7IGRheSA6ICdGcmlkYXknLCBzdGFydCA6ICcwODowMCcsIGZpbmlzaCA6ICcyMDowMCcsIGNvZGUgOiA1LCBvcGVuIDogdHJ1ZSB9KTtcblx0XHRcdHRoaXMuaW5zZXJ0KHsgZGF5IDogJ1NhdHVyZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogNiwgb3BlbiA6IGZhbHNlIH0pO1xuXHRcdFx0dGhpcy5pbnNlcnQoeyBkYXkgOiAnU3VuZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogMCwgb3BlbiA6IGZhbHNlIH0pO1xuXHRcdH1cblx0fVxuXG5cdC8qXG5cdCAqIHVwZGF0ZSB0aGUgZ2l2ZW4gZGF5cyBzdGFydCBhbmQgZmluaXNoIHRpbWVzIGFuZCB3aGV0aGVyIHRoZSBvZmZpY2UgaXMgb3BlbiBvbiB0aGF0IGRheVxuXHQgKi9cblx0dXBkYXRlSG91cnMoZGF5LCBuZXdTdGFydCwgbmV3RmluaXNoLCBuZXdPcGVuKSB7XG5cdFx0dGhpcy51cGRhdGUoe1xuXHRcdFx0ZGF5LFxuXHRcdH0sIHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0c3RhcnQ6IG5ld1N0YXJ0LFxuXHRcdFx0XHRmaW5pc2g6IG5ld0ZpbmlzaCxcblx0XHRcdFx0b3BlbjogbmV3T3Blbixcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH1cblxuXHQvKlxuXHQgKiBDaGVjayBpZiB0aGUgY3VycmVudCBzZXJ2ZXIgdGltZSAodXRjKSBpcyB3aXRoaW4gdGhlIG9mZmljZSBob3VycyBvZiB0aGF0IGRheVxuXHQgKiByZXR1cm5zIHRydWUgb3IgZmFsc2Vcblx0ICovXG5cdGlzTm93V2l0aGluSG91cnMoKSB7XG5cdFx0Ly8gZ2V0IGN1cnJlbnQgdGltZSBvbiBzZXJ2ZXIgaW4gdXRjXG5cdFx0Ly8gdmFyIGN0ID0gbW9tZW50KCkudXRjKCk7XG5cdFx0Y29uc3QgY3VycmVudFRpbWUgPSBtb21lbnQudXRjKG1vbWVudCgpLnV0YygpLmZvcm1hdCgnZGRkZDpISDptbScpLCAnZGRkZDpISDptbScpO1xuXG5cdFx0Ly8gZ2V0IHRvZGF5cyBvZmZpY2UgaG91cnMgZnJvbSBkYlxuXHRcdGNvbnN0IHRvZGF5c09mZmljZUhvdXJzID0gdGhpcy5maW5kT25lKHsgZGF5OiBjdXJyZW50VGltZS5mb3JtYXQoJ2RkZGQnKSB9KTtcblx0XHRpZiAoIXRvZGF5c09mZmljZUhvdXJzKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgaWYgb2ZmaWNlcyBhcmUgb3BlbiB0b2RheVxuXHRcdGlmICh0b2RheXNPZmZpY2VIb3Vycy5vcGVuID09PSBmYWxzZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN0YXJ0ID0gbW9tZW50LnV0YyhgJHsgdG9kYXlzT2ZmaWNlSG91cnMuZGF5IH06JHsgdG9kYXlzT2ZmaWNlSG91cnMuc3RhcnQgfWAsICdkZGRkOkhIOm1tJyk7XG5cdFx0Y29uc3QgZmluaXNoID0gbW9tZW50LnV0YyhgJHsgdG9kYXlzT2ZmaWNlSG91cnMuZGF5IH06JHsgdG9kYXlzT2ZmaWNlSG91cnMuZmluaXNoIH1gLCAnZGRkZDpISDptbScpO1xuXG5cdFx0Ly8gY29uc29sZS5sb2coZmluaXNoLmlzQmVmb3JlKHN0YXJ0KSk7XG5cdFx0aWYgKGZpbmlzaC5pc0JlZm9yZShzdGFydCkpIHtcblx0XHRcdC8vIGZpbmlzaC5kYXkoZmluaXNoLmRheSgpKzEpO1xuXHRcdFx0ZmluaXNoLmFkZCgxLCAnZGF5cycpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJlc3VsdCA9IGN1cnJlbnRUaW1lLmlzQmV0d2VlbihzdGFydCwgZmluaXNoKTtcblxuXHRcdC8vIGluQmV0d2VlbiAgY2hlY2tcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0aXNPcGVuaW5nVGltZSgpIHtcblx0XHQvLyBnZXQgY3VycmVudCB0aW1lIG9uIHNlcnZlciBpbiB1dGNcblx0XHRjb25zdCBjdXJyZW50VGltZSA9IG1vbWVudC51dGMobW9tZW50KCkudXRjKCkuZm9ybWF0KCdkZGRkOkhIOm1tJyksICdkZGRkOkhIOm1tJyk7XG5cblx0XHQvLyBnZXQgdG9kYXlzIG9mZmljZSBob3VycyBmcm9tIGRiXG5cdFx0Y29uc3QgdG9kYXlzT2ZmaWNlSG91cnMgPSB0aGlzLmZpbmRPbmUoeyBkYXk6IGN1cnJlbnRUaW1lLmZvcm1hdCgnZGRkZCcpIH0pO1xuXHRcdGlmICghdG9kYXlzT2ZmaWNlSG91cnMpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBjaGVjayBpZiBvZmZpY2VzIGFyZSBvcGVuIHRvZGF5XG5cdFx0aWYgKHRvZGF5c09mZmljZUhvdXJzLm9wZW4gPT09IGZhbHNlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3RhcnQgPSBtb21lbnQudXRjKGAkeyB0b2RheXNPZmZpY2VIb3Vycy5kYXkgfTokeyB0b2RheXNPZmZpY2VIb3Vycy5zdGFydCB9YCwgJ2RkZGQ6SEg6bW0nKTtcblxuXHRcdHJldHVybiBzdGFydC5pc1NhbWUoY3VycmVudFRpbWUsICdtaW51dGUnKTtcblx0fVxuXG5cdGlzQ2xvc2luZ1RpbWUoKSB7XG5cdFx0Ly8gZ2V0IGN1cnJlbnQgdGltZSBvbiBzZXJ2ZXIgaW4gdXRjXG5cdFx0Y29uc3QgY3VycmVudFRpbWUgPSBtb21lbnQudXRjKG1vbWVudCgpLnV0YygpLmZvcm1hdCgnZGRkZDpISDptbScpLCAnZGRkZDpISDptbScpO1xuXG5cdFx0Ly8gZ2V0IHRvZGF5cyBvZmZpY2UgaG91cnMgZnJvbSBkYlxuXHRcdGNvbnN0IHRvZGF5c09mZmljZUhvdXJzID0gdGhpcy5maW5kT25lKHsgZGF5OiBjdXJyZW50VGltZS5mb3JtYXQoJ2RkZGQnKSB9KTtcblx0XHRpZiAoIXRvZGF5c09mZmljZUhvdXJzKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluaXNoID0gbW9tZW50LnV0YyhgJHsgdG9kYXlzT2ZmaWNlSG91cnMuZGF5IH06JHsgdG9kYXlzT2ZmaWNlSG91cnMuZmluaXNoIH1gLCAnZGRkZDpISDptbScpO1xuXG5cdFx0cmV0dXJuIGZpbmlzaC5pc1NhbWUoY3VycmVudFRpbWUsICdtaW51dGUnKTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdE9mZmljZUhvdXIgPSBuZXcgTGl2ZWNoYXRPZmZpY2VIb3VyKCk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcblxuY2xhc3MgTGl2ZWNoYXRWaXNpdG9ycyBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2xpdmVjaGF0X3Zpc2l0b3InKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXRzIHZpc2l0b3IgYnkgdG9rZW5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIC0gVmlzaXRvciB0b2tlblxuXHQgKi9cblx0Z2V0VmlzaXRvckJ5VG9rZW4odG9rZW4sIG9wdGlvbnMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdHRva2VuLFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBGaW5kIHZpc2l0b3JzIGJ5IF9pZFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gLSBWaXNpdG9yIHRva2VuXG5cdCAqL1xuXHRmaW5kQnlJZChfaWQsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdF9pZCxcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHQvKipcblx0ICogR2V0cyB2aXNpdG9yIGJ5IHRva2VuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0b2tlbiAtIFZpc2l0b3IgdG9rZW5cblx0ICovXG5cdGZpbmRWaXNpdG9yQnlUb2tlbih0b2tlbikge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0dG9rZW4sXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmQocXVlcnkpO1xuXHR9XG5cblx0dXBkYXRlTGl2ZWNoYXREYXRhQnlUb2tlbih0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlID0gdHJ1ZSkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0dG9rZW4sXG5cdFx0fTtcblxuXHRcdGlmICghb3ZlcndyaXRlKSB7XG5cdFx0XHRjb25zdCB1c2VyID0gdGhpcy5maW5kT25lKHF1ZXJ5LCB7IGZpZWxkczogeyBsaXZlY2hhdERhdGE6IDEgfSB9KTtcblx0XHRcdGlmICh1c2VyLmxpdmVjaGF0RGF0YSAmJiB0eXBlb2YgdXNlci5saXZlY2hhdERhdGFba2V5XSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHRbYGxpdmVjaGF0RGF0YS4keyBrZXkgfWBdOiB2YWx1ZSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBGaW5kIGEgdmlzaXRvciBieSB0aGVpciBwaG9uZSBudW1iZXJcblx0ICogQHJldHVybiB7b2JqZWN0fSBVc2VyIGZyb20gZGJcblx0ICovXG5cdGZpbmRPbmVWaXNpdG9yQnlQaG9uZShwaG9uZSkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0J3Bob25lLnBob25lTnVtYmVyJzogcGhvbmUsXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCB0aGUgbmV4dCB2aXNpdG9yIG5hbWVcblx0ICogQHJldHVybiB7c3RyaW5nfSBUaGUgbmV4dCB2aXNpdG9yIG5hbWVcblx0ICovXG5cdGdldE5leHRWaXNpdG9yVXNlcm5hbWUoKSB7XG5cdFx0Y29uc3Qgc2V0dGluZ3NSYXcgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5tb2RlbC5yYXdDb2xsZWN0aW9uKCk7XG5cdFx0Y29uc3QgZmluZEFuZE1vZGlmeSA9IE1ldGVvci53cmFwQXN5bmMoc2V0dGluZ3NSYXcuZmluZEFuZE1vZGlmeSwgc2V0dGluZ3NSYXcpO1xuXG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRfaWQ6ICdMaXZlY2hhdF9ndWVzdF9jb3VudCcsXG5cdFx0fTtcblxuXHRcdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHRcdCRpbmM6IHtcblx0XHRcdFx0dmFsdWU6IDEsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRjb25zdCBsaXZlY2hhdENvdW50ID0gZmluZEFuZE1vZGlmeShxdWVyeSwgbnVsbCwgdXBkYXRlKTtcblxuXHRcdHJldHVybiBgZ3Vlc3QtJHsgbGl2ZWNoYXRDb3VudC52YWx1ZS52YWx1ZSArIDEgfWA7XG5cdH1cblxuXHR1cGRhdGVCeUlkKF9pZCwgdXBkYXRlKSB7XG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHsgX2lkIH0sIHVwZGF0ZSk7XG5cdH1cblxuXHRzYXZlR3Vlc3RCeUlkKF9pZCwgZGF0YSkge1xuXHRcdGNvbnN0IHNldERhdGEgPSB7fTtcblx0XHRjb25zdCB1bnNldERhdGEgPSB7fTtcblxuXHRcdGlmIChkYXRhLm5hbWUpIHtcblx0XHRcdGlmICghXy5pc0VtcHR5KHMudHJpbShkYXRhLm5hbWUpKSkge1xuXHRcdFx0XHRzZXREYXRhLm5hbWUgPSBzLnRyaW0oZGF0YS5uYW1lKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHVuc2V0RGF0YS5uYW1lID0gMTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZGF0YS5lbWFpbCkge1xuXHRcdFx0aWYgKCFfLmlzRW1wdHkocy50cmltKGRhdGEuZW1haWwpKSkge1xuXHRcdFx0XHRzZXREYXRhLnZpc2l0b3JFbWFpbHMgPSBbXG5cdFx0XHRcdFx0eyBhZGRyZXNzOiBzLnRyaW0oZGF0YS5lbWFpbCkgfSxcblx0XHRcdFx0XTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHVuc2V0RGF0YS52aXNpdG9yRW1haWxzID0gMTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZGF0YS5waG9uZSkge1xuXHRcdFx0aWYgKCFfLmlzRW1wdHkocy50cmltKGRhdGEucGhvbmUpKSkge1xuXHRcdFx0XHRzZXREYXRhLnBob25lID0gW1xuXHRcdFx0XHRcdHsgcGhvbmVOdW1iZXI6IHMudHJpbShkYXRhLnBob25lKSB9LFxuXHRcdFx0XHRdO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dW5zZXREYXRhLnBob25lID0gMTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCB1cGRhdGUgPSB7fTtcblxuXHRcdGlmICghXy5pc0VtcHR5KHNldERhdGEpKSB7XG5cdFx0XHR1cGRhdGUuJHNldCA9IHNldERhdGE7XG5cdFx0fVxuXG5cdFx0aWYgKCFfLmlzRW1wdHkodW5zZXREYXRhKSkge1xuXHRcdFx0dXBkYXRlLiR1bnNldCA9IHVuc2V0RGF0YTtcblx0XHR9XG5cblx0XHRpZiAoXy5pc0VtcHR5KHVwZGF0ZSkpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7IF9pZCB9LCB1cGRhdGUpO1xuXHR9XG5cblx0ZmluZE9uZUd1ZXN0QnlFbWFpbEFkZHJlc3MoZW1haWxBZGRyZXNzKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHQndmlzaXRvckVtYWlscy5hZGRyZXNzJzogbmV3IFJlZ0V4cChgXiR7IHMuZXNjYXBlUmVnRXhwKGVtYWlsQWRkcmVzcykgfSRgLCAnaScpLFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5KTtcblx0fVxuXG5cdHNhdmVHdWVzdEVtYWlsUGhvbmVCeUlkKF9pZCwgZW1haWxzLCBwaG9uZXMpIHtcblx0XHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0XHQkYWRkVG9TZXQ6IHt9LFxuXHRcdH07XG5cblx0XHRjb25zdCBzYXZlRW1haWwgPSBbXS5jb25jYXQoZW1haWxzKVxuXHRcdFx0LmZpbHRlcigoZW1haWwpID0+IGVtYWlsICYmIGVtYWlsLnRyaW0oKSlcblx0XHRcdC5tYXAoKGVtYWlsKSA9PiAoeyBhZGRyZXNzOiBlbWFpbCB9KSk7XG5cblx0XHRpZiAoc2F2ZUVtYWlsLmxlbmd0aCA+IDApIHtcblx0XHRcdHVwZGF0ZS4kYWRkVG9TZXQudmlzaXRvckVtYWlscyA9IHsgJGVhY2g6IHNhdmVFbWFpbCB9O1xuXHRcdH1cblxuXHRcdGNvbnN0IHNhdmVQaG9uZSA9IFtdLmNvbmNhdChwaG9uZXMpXG5cdFx0XHQuZmlsdGVyKChwaG9uZSkgPT4gcGhvbmUgJiYgcGhvbmUudHJpbSgpLnJlcGxhY2UoL1teXFxkXS9nLCAnJykpXG5cdFx0XHQubWFwKChwaG9uZSkgPT4gKHsgcGhvbmVOdW1iZXI6IHBob25lIH0pKTtcblxuXHRcdGlmIChzYXZlUGhvbmUubGVuZ3RoID4gMCkge1xuXHRcdFx0dXBkYXRlLiRhZGRUb1NldC5waG9uZSA9IHsgJGVhY2g6IHNhdmVQaG9uZSB9O1xuXHRcdH1cblxuXHRcdGlmICghdXBkYXRlLiRhZGRUb1NldC52aXNpdG9yRW1haWxzICYmICF1cGRhdGUuJGFkZFRvU2V0LnBob25lKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHsgX2lkIH0sIHVwZGF0ZSk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IExpdmVjaGF0VmlzaXRvcnMoKTtcbiIsIi8qIGdsb2JhbHMgSFRUUCAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5pbXBvcnQgVUFQYXJzZXIgZnJvbSAndWEtcGFyc2VyLWpzJztcbmltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuUm9ja2V0Q2hhdC5MaXZlY2hhdCA9IHtcblx0aGlzdG9yeU1vbml0b3JUeXBlOiAndXJsJyxcblxuXHRsb2dnZXI6IG5ldyBMb2dnZXIoJ0xpdmVjaGF0Jywge1xuXHRcdHNlY3Rpb25zOiB7XG5cdFx0XHR3ZWJob29rOiAnV2ViaG9vaycsXG5cdFx0fSxcblx0fSksXG5cblx0Z2V0TmV4dEFnZW50KGRlcGFydG1lbnQpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJykgPT09ICdFeHRlcm5hbCcpIHtcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGNvbnN0IHF1ZXJ5U3RyaW5nID0gZGVwYXJ0bWVudCA/IGA/ZGVwYXJ0bWVudElkPSR7IGRlcGFydG1lbnQgfWAgOiAnJztcblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ0dFVCcsIGAkeyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRXh0ZXJuYWxfUXVldWVfVVJMJykgfSR7IHF1ZXJ5U3RyaW5nIH1gLCB7XG5cdFx0XHRcdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdFx0XHRcdCdVc2VyLUFnZW50JzogJ1JvY2tldENoYXQgU2VydmVyJyxcblx0XHRcdFx0XHRcdFx0QWNjZXB0OiAnYXBwbGljYXRpb24vanNvbicsXG5cdFx0XHRcdFx0XHRcdCdYLVJvY2tldENoYXQtU2VjcmV0LVRva2VuJzogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0V4dGVybmFsX1F1ZXVlX1Rva2VuJyksXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0aWYgKHJlc3VsdCAmJiByZXN1bHQuZGF0YSAmJiByZXN1bHQuZGF0YS51c2VybmFtZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgYWdlbnQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lT25saW5lQWdlbnRCeVVzZXJuYW1lKHJlc3VsdC5kYXRhLnVzZXJuYW1lKTtcblxuXHRcdFx0XHRcdFx0aWYgKGFnZW50KSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdFx0YWdlbnRJZDogYWdlbnQuX2lkLFxuXHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZSxcblx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKCdFcnJvciByZXF1ZXN0aW5nIGFnZW50IGZyb20gZXh0ZXJuYWwgcXVldWUuJywgZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ25vLWFnZW50LW9ubGluZScsICdTb3JyeSwgbm8gb25saW5lIGFnZW50cycpO1xuXHRcdH0gZWxzZSBpZiAoZGVwYXJ0bWVudCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5nZXROZXh0QWdlbnRGb3JEZXBhcnRtZW50KGRlcGFydG1lbnQpO1xuXHRcdH1cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0TmV4dEFnZW50KCk7XG5cdH0sXG5cdGdldEFnZW50cyhkZXBhcnRtZW50KSB7XG5cdFx0aWYgKGRlcGFydG1lbnQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMuZmluZEJ5RGVwYXJ0bWVudElkKGRlcGFydG1lbnQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZEFnZW50cygpO1xuXHRcdH1cblx0fSxcblx0Z2V0T25saW5lQWdlbnRzKGRlcGFydG1lbnQpIHtcblx0XHRpZiAoZGVwYXJ0bWVudCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5nZXRPbmxpbmVGb3JEZXBhcnRtZW50KGRlcGFydG1lbnQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9ubGluZUFnZW50cygpO1xuXHRcdH1cblx0fSxcblx0Z2V0UmVxdWlyZWREZXBhcnRtZW50KG9ubGluZVJlcXVpcmVkID0gdHJ1ZSkge1xuXHRcdGNvbnN0IGRlcGFydG1lbnRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmRFbmFibGVkV2l0aEFnZW50cygpO1xuXG5cdFx0cmV0dXJuIGRlcGFydG1lbnRzLmZldGNoKCkuZmluZCgoZGVwdCkgPT4ge1xuXHRcdFx0aWYgKCFkZXB0LnNob3dPblJlZ2lzdHJhdGlvbikge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIW9ubGluZVJlcXVpcmVkKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3Qgb25saW5lQWdlbnRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmdldE9ubGluZUZvckRlcGFydG1lbnQoZGVwdC5faWQpO1xuXHRcdFx0cmV0dXJuIG9ubGluZUFnZW50cy5jb3VudCgpID4gMDtcblx0XHR9KTtcblx0fSxcblx0Z2V0Um9vbShndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8sIGFnZW50KSB7XG5cdFx0bGV0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChtZXNzYWdlLnJpZCk7XG5cdFx0bGV0IG5ld1Jvb20gPSBmYWxzZTtcblxuXHRcdGlmIChyb29tICYmICFyb29tLm9wZW4pIHtcblx0XHRcdG1lc3NhZ2UucmlkID0gUmFuZG9tLmlkKCk7XG5cdFx0XHRyb29tID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZiAocm9vbSA9PSBudWxsKSB7XG5cdFx0XHQvLyBpZiBubyBkZXBhcnRtZW50IHNlbGVjdGVkIHZlcmlmeSBpZiB0aGVyZSBpcyBhdCBsZWFzdCBvbmUgYWN0aXZlIGFuZCBwaWNrIHRoZSBmaXJzdFxuXHRcdFx0aWYgKCFhZ2VudCAmJiAhZ3Vlc3QuZGVwYXJ0bWVudCkge1xuXHRcdFx0XHRjb25zdCBkZXBhcnRtZW50ID0gdGhpcy5nZXRSZXF1aXJlZERlcGFydG1lbnQoKTtcblxuXHRcdFx0XHRpZiAoZGVwYXJ0bWVudCkge1xuXHRcdFx0XHRcdGd1ZXN0LmRlcGFydG1lbnQgPSBkZXBhcnRtZW50Ll9pZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBkZWxlZ2F0ZSByb29tIGNyZWF0aW9uIHRvIFF1ZXVlTWV0aG9kc1xuXHRcdFx0Y29uc3Qgcm91dGluZ01ldGhvZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcpO1xuXHRcdFx0cm9vbSA9IFJvY2tldENoYXQuUXVldWVNZXRob2RzW3JvdXRpbmdNZXRob2RdKGd1ZXN0LCBtZXNzYWdlLCByb29tSW5mbywgYWdlbnQpO1xuXG5cdFx0XHRuZXdSb29tID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoIXJvb20gfHwgcm9vbS52LnRva2VuICE9PSBndWVzdC50b2tlbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignY2Fubm90LWFjY2Vzcy1yb29tJyk7XG5cdFx0fVxuXG5cdFx0aWYgKG5ld1Jvb20pIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnNldFJvb21JZEJ5VG9rZW4oZ3Vlc3QudG9rZW4sIHJvb20uX2lkKTtcblx0XHR9XG5cblx0XHRyZXR1cm4geyByb29tLCBuZXdSb29tIH07XG5cdH0sXG5cdHNlbmRNZXNzYWdlKHsgZ3Vlc3QsIG1lc3NhZ2UsIHJvb21JbmZvLCBhZ2VudCB9KSB7XG5cdFx0Y29uc3QgeyByb29tLCBuZXdSb29tIH0gPSB0aGlzLmdldFJvb20oZ3Vlc3QsIG1lc3NhZ2UsIHJvb21JbmZvLCBhZ2VudCk7XG5cdFx0aWYgKGd1ZXN0Lm5hbWUpIHtcblx0XHRcdG1lc3NhZ2UuYWxpYXMgPSBndWVzdC5uYW1lO1xuXHRcdH1cblxuXHRcdC8vIHJldHVybiBtZXNzYWdlcztcblx0XHRyZXR1cm4gXy5leHRlbmQoUm9ja2V0Q2hhdC5zZW5kTWVzc2FnZShndWVzdCwgbWVzc2FnZSwgcm9vbSksIHsgbmV3Um9vbSwgc2hvd0Nvbm5lY3Rpbmc6IHRoaXMuc2hvd0Nvbm5lY3RpbmcoKSB9KTtcblx0fSxcblx0cmVnaXN0ZXJHdWVzdCh7IHRva2VuLCBuYW1lLCBlbWFpbCwgZGVwYXJ0bWVudCwgcGhvbmUsIHVzZXJuYW1lIH0gPSB7fSkge1xuXHRcdGNoZWNrKHRva2VuLCBTdHJpbmcpO1xuXG5cdFx0bGV0IHVzZXJJZDtcblx0XHRjb25zdCB1cGRhdGVVc2VyID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHR0b2tlbixcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGNvbnN0IHVzZXIgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblxuXHRcdGlmICh1c2VyKSB7XG5cdFx0XHR1c2VySWQgPSB1c2VyLl9pZDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKCF1c2VybmFtZSkge1xuXHRcdFx0XHR1c2VybmFtZSA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0TmV4dFZpc2l0b3JVc2VybmFtZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgZXhpc3RpbmdVc2VyID0gbnVsbDtcblxuXHRcdFx0aWYgKHMudHJpbShlbWFpbCkgIT09ICcnICYmIChleGlzdGluZ1VzZXIgPSBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVHdWVzdEJ5RW1haWxBZGRyZXNzKGVtYWlsKSkpIHtcblx0XHRcdFx0dXNlcklkID0gZXhpc3RpbmdVc2VyLl9pZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0IHVzZXJEYXRhID0ge1xuXHRcdFx0XHRcdHVzZXJuYW1lLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGlmICh0aGlzLmNvbm5lY3Rpb24pIHtcblx0XHRcdFx0XHR1c2VyRGF0YS51c2VyQWdlbnQgPSB0aGlzLmNvbm5lY3Rpb24uaHR0cEhlYWRlcnNbJ3VzZXItYWdlbnQnXTtcblx0XHRcdFx0XHR1c2VyRGF0YS5pcCA9IHRoaXMuY29ubmVjdGlvbi5odHRwSGVhZGVyc1sneC1yZWFsLWlwJ10gfHwgdGhpcy5jb25uZWN0aW9uLmh0dHBIZWFkZXJzWyd4LWZvcndhcmRlZC1mb3InXSB8fCB0aGlzLmNvbm5lY3Rpb24uY2xpZW50QWRkcmVzcztcblx0XHRcdFx0XHR1c2VyRGF0YS5ob3N0ID0gdGhpcy5jb25uZWN0aW9uLmh0dHBIZWFkZXJzLmhvc3Q7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR1c2VySWQgPSBMaXZlY2hhdFZpc2l0b3JzLmluc2VydCh1c2VyRGF0YSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHBob25lKSB7XG5cdFx0XHR1cGRhdGVVc2VyLiRzZXQucGhvbmUgPSBbXG5cdFx0XHRcdHsgcGhvbmVOdW1iZXI6IHBob25lLm51bWJlciB9LFxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRpZiAoZW1haWwgJiYgZW1haWwudHJpbSgpICE9PSAnJykge1xuXHRcdFx0dXBkYXRlVXNlci4kc2V0LnZpc2l0b3JFbWFpbHMgPSBbXG5cdFx0XHRcdHsgYWRkcmVzczogZW1haWwgfSxcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0aWYgKG5hbWUpIHtcblx0XHRcdHVwZGF0ZVVzZXIuJHNldC5uYW1lID0gbmFtZTtcblx0XHR9XG5cblx0XHRpZiAoZGVwYXJ0bWVudCkge1xuXHRcdFx0dXBkYXRlVXNlci4kc2V0LmRlcGFydG1lbnQgPSBkZXBhcnRtZW50O1xuXHRcdH1cblxuXHRcdExpdmVjaGF0VmlzaXRvcnMudXBkYXRlQnlJZCh1c2VySWQsIHVwZGF0ZVVzZXIpO1xuXG5cdFx0cmV0dXJuIHVzZXJJZDtcblx0fSxcblx0c2V0RGVwYXJ0bWVudEZvckd1ZXN0KHsgdG9rZW4sIGRlcGFydG1lbnQgfSA9IHt9KSB7XG5cdFx0Y2hlY2sodG9rZW4sIFN0cmluZyk7XG5cblx0XHRjb25zdCB1cGRhdGVVc2VyID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHRkZXBhcnRtZW50LFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0Y29uc3QgdXNlciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odG9rZW4sIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXHRcdGlmICh1c2VyKSB7XG5cdFx0XHRyZXR1cm4gTGl2ZWNoYXRWaXNpdG9ycy51cGRhdGVCeUlkKHVzZXIuX2lkLCB1cGRhdGVVc2VyKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXHRzYXZlR3Vlc3QoeyBfaWQsIG5hbWUsIGVtYWlsLCBwaG9uZSB9KSB7XG5cdFx0Y29uc3QgdXBkYXRlRGF0YSA9IHt9O1xuXG5cdFx0aWYgKG5hbWUpIHtcblx0XHRcdHVwZGF0ZURhdGEubmFtZSA9IG5hbWU7XG5cdFx0fVxuXHRcdGlmIChlbWFpbCkge1xuXHRcdFx0dXBkYXRlRGF0YS5lbWFpbCA9IGVtYWlsO1xuXHRcdH1cblx0XHRpZiAocGhvbmUpIHtcblx0XHRcdHVwZGF0ZURhdGEucGhvbmUgPSBwaG9uZTtcblx0XHR9XG5cdFx0Y29uc3QgcmV0ID0gTGl2ZWNoYXRWaXNpdG9ycy5zYXZlR3Vlc3RCeUlkKF9pZCwgdXBkYXRlRGF0YSk7XG5cblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdsaXZlY2hhdC5zYXZlR3Vlc3QnLCB1cGRhdGVEYXRhKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiByZXQ7XG5cdH0sXG5cblx0Y2xvc2VSb29tKHsgdXNlciwgdmlzaXRvciwgcm9vbSwgY29tbWVudCB9KSB7XG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcblxuXHRcdGNvbnN0IGNsb3NlRGF0YSA9IHtcblx0XHRcdGNsb3NlZEF0OiBub3csXG5cdFx0XHRjaGF0RHVyYXRpb246IChub3cuZ2V0VGltZSgpIC0gcm9vbS50cykgLyAxMDAwLFxuXHRcdH07XG5cblx0XHRpZiAodXNlcikge1xuXHRcdFx0Y2xvc2VEYXRhLmNsb3NlciA9ICd1c2VyJztcblx0XHRcdGNsb3NlRGF0YS5jbG9zZWRCeSA9IHtcblx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAodmlzaXRvcikge1xuXHRcdFx0Y2xvc2VEYXRhLmNsb3NlciA9ICd2aXNpdG9yJztcblx0XHRcdGNsb3NlRGF0YS5jbG9zZWRCeSA9IHtcblx0XHRcdFx0X2lkOiB2aXNpdG9yLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHZpc2l0b3IudXNlcm5hbWUsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmNsb3NlQnlSb29tSWQocm9vbS5faWQsIGNsb3NlRGF0YSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5LmNsb3NlQnlSb29tSWQocm9vbS5faWQsIGNsb3NlRGF0YSk7XG5cblx0XHRjb25zdCBtZXNzYWdlID0ge1xuXHRcdFx0dDogJ2xpdmVjaGF0LWNsb3NlJyxcblx0XHRcdG1zZzogY29tbWVudCxcblx0XHRcdGdyb3VwYWJsZTogZmFsc2UsXG5cdFx0fTtcblxuXHRcdFJvY2tldENoYXQuc2VuZE1lc3NhZ2UodXNlciwgbWVzc2FnZSwgcm9vbSk7XG5cblx0XHRpZiAocm9vbS5zZXJ2ZWRCeSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5oaWRlQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIHJvb20uc2VydmVkQnkuX2lkKTtcblx0XHR9XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlQ29tbWFuZFdpdGhSb29tSWRBbmRVc2VyKCdwcm9tcHRUcmFuc2NyaXB0Jywgcm9vbS5faWQsIGNsb3NlRGF0YS5jbG9zZWRCeSk7XG5cblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdsaXZlY2hhdC5jbG9zZVJvb20nLCByb29tKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdGdldEluaXRTZXR0aW5ncygpIHtcblx0XHRjb25zdCBzZXR0aW5ncyA9IHt9O1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZE5vdEhpZGRlblB1YmxpYyhbXG5cdFx0XHQnTGl2ZWNoYXRfdGl0bGUnLFxuXHRcdFx0J0xpdmVjaGF0X3RpdGxlX2NvbG9yJyxcblx0XHRcdCdMaXZlY2hhdF9lbmFibGVkJyxcblx0XHRcdCdMaXZlY2hhdF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XHQnTGl2ZWNoYXRfYWxsb3dfc3dpdGNoaW5nX2RlcGFydG1lbnRzJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX21lc3NhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfc3VjY2Vzc19tZXNzYWdlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX2Zvcm1fdW5hdmFpbGFibGUnLFxuXHRcdFx0J0xpdmVjaGF0X2Rpc3BsYXlfb2ZmbGluZV9mb3JtJyxcblx0XHRcdCdMaXZlY2hhdF92aWRlb2NhbGxfZW5hYmxlZCcsXG5cdFx0XHQnSml0c2lfRW5hYmxlZCcsXG5cdFx0XHQnTGFuZ3VhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0Jyxcblx0XHRcdCdMaXZlY2hhdF90cmFuc2NyaXB0X21lc3NhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X2ZpbGV1cGxvYWRfZW5hYmxlZCcsXG5cdFx0XHQnRmlsZVVwbG9hZF9FbmFibGVkJyxcblx0XHRcdCdMaXZlY2hhdF9jb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZScsXG5cdFx0XHQnTGl2ZWNoYXRfbmFtZV9maWVsZF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XHQnTGl2ZWNoYXRfZW1haWxfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXG5cdFx0XSkuZm9yRWFjaCgoc2V0dGluZykgPT4ge1xuXHRcdFx0c2V0dGluZ3Nbc2V0dGluZy5faWRdID0gc2V0dGluZy52YWx1ZTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBzZXR0aW5ncztcblx0fSxcblxuXHRzYXZlUm9vbUluZm8ocm9vbURhdGEsIGd1ZXN0RGF0YSkge1xuXHRcdGlmICgocm9vbURhdGEudG9waWMgIT0gbnVsbCB8fCByb29tRGF0YS50YWdzICE9IG51bGwpICYmICFSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRUb3BpY0FuZFRhZ3NCeUlkKHJvb21EYXRhLl9pZCwgcm9vbURhdGEudG9waWMsIHJvb21EYXRhLnRhZ3MpKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignbGl2ZWNoYXQuc2F2ZVJvb20nLCByb29tRGF0YSk7XG5cdFx0fSk7XG5cblx0XHRpZiAoIV8uaXNFbXB0eShndWVzdERhdGEubmFtZSkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRGbmFtZUJ5SWQocm9vbURhdGEuX2lkLCBndWVzdERhdGEubmFtZSkgJiYgUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVEaXNwbGF5TmFtZUJ5Um9vbUlkKHJvb21EYXRhLl9pZCwgZ3Vlc3REYXRhLm5hbWUpO1xuXHRcdH1cblx0fSxcblxuXHRjbG9zZU9wZW5DaGF0cyh1c2VySWQsIGNvbW1lbnQpIHtcblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkKTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5QWdlbnQodXNlcklkKS5mb3JFYWNoKChyb29tKSA9PiB7XG5cdFx0XHR0aGlzLmNsb3NlUm9vbSh7IHVzZXIsIHJvb20sIGNvbW1lbnQgfSk7XG5cdFx0fSk7XG5cdH0sXG5cblx0Zm9yd2FyZE9wZW5DaGF0cyh1c2VySWQpIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5QWdlbnQodXNlcklkKS5mb3JFYWNoKChyb29tKSA9PiB7XG5cdFx0XHRjb25zdCBndWVzdCA9IExpdmVjaGF0VmlzaXRvcnMuZmluZE9uZUJ5SWQocm9vbS52Ll9pZCk7XG5cdFx0XHR0aGlzLnRyYW5zZmVyKHJvb20sIGd1ZXN0LCB7IGRlcGFydG1lbnRJZDogZ3Vlc3QuZGVwYXJ0bWVudCB9KTtcblx0XHR9KTtcblx0fSxcblxuXHRzYXZlUGFnZUhpc3RvcnkodG9rZW4sIHJvb21JZCwgcGFnZUluZm8pIHtcblx0XHRpZiAocGFnZUluZm8uY2hhbmdlID09PSBSb2NrZXRDaGF0LkxpdmVjaGF0Lmhpc3RvcnlNb25pdG9yVHlwZSkge1xuXG5cdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQoJ3JvY2tldC5jYXQnKTtcblxuXHRcdFx0Y29uc3QgcGFnZVRpdGxlID0gcGFnZUluZm8udGl0bGU7XG5cdFx0XHRjb25zdCBwYWdlVXJsID0gcGFnZUluZm8ubG9jYXRpb24uaHJlZjtcblx0XHRcdGNvbnN0IGV4dHJhRGF0YSA9IHtcblx0XHRcdFx0bmF2aWdhdGlvbjoge1xuXHRcdFx0XHRcdHBhZ2U6IHBhZ2VJbmZvLFxuXHRcdFx0XHRcdHRva2VuLFxuXHRcdFx0XHR9LFxuXHRcdFx0fTtcblxuXHRcdFx0aWYgKCFyb29tSWQpIHtcblx0XHRcdFx0Ly8ga2VlcCBoaXN0b3J5IG9mIHVucmVnaXN0ZXJlZCB2aXNpdG9ycyBmb3IgMSBtb250aFxuXHRcdFx0XHRjb25zdCBrZWVwSGlzdG9yeU1pbGlzZWNvbmRzID0gMjU5MjAwMDAwMDtcblx0XHRcdFx0ZXh0cmFEYXRhLmV4cGlyZUF0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgKyBrZWVwSGlzdG9yeU1pbGlzZWNvbmRzO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9WaXNpdG9yX25hdmlnYXRpb25fYXNfYV9tZXNzYWdlJykpIHtcblx0XHRcdFx0ZXh0cmFEYXRhLl9oaWRkZW4gPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlTmF2aWdhdGlvbkhpc3RvcnlXaXRoUm9vbUlkTWVzc2FnZUFuZFVzZXIocm9vbUlkLCBgJHsgcGFnZVRpdGxlIH0gLSAkeyBwYWdlVXJsIH1gLCB1c2VyLCBleHRyYURhdGEpO1xuXHRcdH1cblxuXHRcdHJldHVybjtcblx0fSxcblxuXHR0cmFuc2Zlcihyb29tLCBndWVzdCwgdHJhbnNmZXJEYXRhKSB7XG5cdFx0bGV0IGFnZW50O1xuXG5cdFx0aWYgKHRyYW5zZmVyRGF0YS51c2VySWQpIHtcblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0cmFuc2ZlckRhdGEudXNlcklkKTtcblx0XHRcdGFnZW50ID0ge1xuXHRcdFx0XHRhZ2VudElkOiB1c2VyLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJykgIT09ICdHdWVzdF9Qb29sJykge1xuXHRcdFx0YWdlbnQgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldE5leHRBZ2VudCh0cmFuc2ZlckRhdGEuZGVwYXJ0bWVudElkKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQucmV0dXJuUm9vbUFzSW5xdWlyeShyb29tLl9pZCwgdHJhbnNmZXJEYXRhLmRlcGFydG1lbnRJZCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBzZXJ2ZWRCeSB9ID0gcm9vbTtcblxuXHRcdGlmIChhZ2VudCAmJiBhZ2VudC5hZ2VudElkICE9PSBzZXJ2ZWRCeS5faWQpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmNoYW5nZUFnZW50QnlSb29tSWQocm9vbS5faWQsIGFnZW50KTtcblxuXHRcdFx0aWYgKHRyYW5zZmVyRGF0YS5kZXBhcnRtZW50SWQpIHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuY2hhbmdlRGVwYXJ0bWVudElkQnlSb29tSWQocm9vbS5faWQsIHRyYW5zZmVyRGF0YS5kZXBhcnRtZW50SWQpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBzdWJzY3JpcHRpb25EYXRhID0ge1xuXHRcdFx0XHRyaWQ6IHJvb20uX2lkLFxuXHRcdFx0XHRuYW1lOiBndWVzdC5uYW1lIHx8IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0XHRhbGVydDogdHJ1ZSxcblx0XHRcdFx0b3BlbjogdHJ1ZSxcblx0XHRcdFx0dW5yZWFkOiAxLFxuXHRcdFx0XHR1c2VyTWVudGlvbnM6IDEsXG5cdFx0XHRcdGdyb3VwTWVudGlvbnM6IDAsXG5cdFx0XHRcdHU6IHtcblx0XHRcdFx0XHRfaWQ6IGFnZW50LmFnZW50SWQsXG5cdFx0XHRcdFx0dXNlcm5hbWU6IGFnZW50LnVzZXJuYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0OiAnbCcsXG5cdFx0XHRcdGRlc2t0b3BOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdFx0bW9iaWxlUHVzaE5vdGlmaWNhdGlvbnM6ICdhbGwnLFxuXHRcdFx0XHRlbWFpbE5vdGlmaWNhdGlvbnM6ICdhbGwnLFxuXHRcdFx0fTtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMucmVtb3ZlQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIHNlcnZlZEJ5Ll9pZCk7XG5cblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuaW5zZXJ0KHN1YnNjcmlwdGlvbkRhdGEpO1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuaW5jVXNlcnNDb3VudEJ5SWQocm9vbS5faWQpO1xuXG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVVc2VyTGVhdmVXaXRoUm9vbUlkQW5kVXNlcihyb29tLl9pZCwgeyBfaWQ6IHNlcnZlZEJ5Ll9pZCwgdXNlcm5hbWU6IHNlcnZlZEJ5LnVzZXJuYW1lIH0pO1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlVXNlckpvaW5XaXRoUm9vbUlkQW5kVXNlcihyb29tLl9pZCwgeyBfaWQ6IGFnZW50LmFnZW50SWQsIHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZSB9KTtcblxuXHRcdFx0Y29uc3QgZ3Vlc3REYXRhID0ge1xuXHRcdFx0XHR0b2tlbjogZ3Vlc3QudG9rZW4sXG5cdFx0XHRcdGRlcGFydG1lbnQ6IHRyYW5zZmVyRGF0YS5kZXBhcnRtZW50SWQsXG5cdFx0XHR9O1xuXG5cdFx0XHR0aGlzLnNldERlcGFydG1lbnRGb3JHdWVzdChndWVzdERhdGEpO1xuXG5cdFx0XHRSb2NrZXRDaGF0LkxpdmVjaGF0LnN0cmVhbS5lbWl0KHJvb20uX2lkLCB7XG5cdFx0XHRcdHR5cGU6ICdhZ2VudERhdGEnLFxuXHRcdFx0XHRkYXRhOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXRBZ2VudEluZm8oYWdlbnQuYWdlbnRJZCksXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXG5cdHJldHVyblJvb21Bc0lucXVpcnkocmlkLCBkZXBhcnRtZW50SWQpIHtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJldHVyblJvb21Bc0lucXVpcnknIH0pO1xuXHRcdH1cblxuXHRcdGlmICghcm9vbS5zZXJ2ZWRCeSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHJvb20uc2VydmVkQnkuX2lkKTtcblx0XHRpZiAoIXVzZXIgfHwgIXVzZXIuX2lkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZXR1cm5Sb29tQXNJbnF1aXJ5JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBhZ2VudElkcyA9IFtdO1xuXHRcdC8vIGdldCB0aGUgYWdlbnRzIG9mIHRoZSBkZXBhcnRtZW50XG5cdFx0aWYgKGRlcGFydG1lbnRJZCkge1xuXHRcdFx0bGV0IGFnZW50cyA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0T25saW5lQWdlbnRzKGRlcGFydG1lbnRJZCk7XG5cblx0XHRcdGlmIChhZ2VudHMuY291bnQoKSA9PT0gMCAmJiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfZ3Vlc3RfcG9vbF93aXRoX25vX2FnZW50cycpKSB7XG5cdFx0XHRcdGFnZW50cyA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0QWdlbnRzKGRlcGFydG1lbnRJZCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChhZ2VudHMuY291bnQoKSA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGFnZW50cy5mb3JFYWNoKChhZ2VudCkgPT4ge1xuXHRcdFx0XHRhZ2VudElkcy5wdXNoKGFnZW50LmFnZW50SWQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmNoYW5nZURlcGFydG1lbnRJZEJ5Um9vbUlkKHJvb20uX2lkLCBkZXBhcnRtZW50SWQpO1xuXHRcdH1cblxuXHRcdC8vIGRlbGV0ZSBhZ2VudCBhbmQgcm9vbSBzdWJzY3JpcHRpb25cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnJlbW92ZUJ5Um9vbUlkKHJpZCk7XG5cblx0XHQvLyByZW1vdmUgYWdlbnQgZnJvbSByb29tXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMucmVtb3ZlQWdlbnRCeVJvb21JZChyaWQpO1xuXG5cdFx0Ly8gZmluZCBpbnF1aXJ5IGNvcnJlc3BvbmRpbmcgdG8gcm9vbVxuXHRcdGNvbnN0IGlucXVpcnkgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkuZmluZE9uZSh7IHJpZCB9KTtcblx0XHRpZiAoIWlucXVpcnkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRsZXQgb3BlbklucTtcblx0XHQvLyBtYXJrIGlucXVpcnkgYXMgb3BlblxuXHRcdGlmIChhZ2VudElkcy5sZW5ndGggPT09IDApIHtcblx0XHRcdG9wZW5JbnEgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkub3BlbklucXVpcnkoaW5xdWlyeS5faWQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcGVuSW5xID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5Lm9wZW5JbnF1aXJ5V2l0aEFnZW50cyhpbnF1aXJ5Ll9pZCwgYWdlbnRJZHMpO1xuXHRcdH1cblxuXHRcdGlmIChvcGVuSW5xKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVVc2VyTGVhdmVXaXRoUm9vbUlkQW5kVXNlcihyaWQsIHsgX2lkOiByb29tLnNlcnZlZEJ5Ll9pZCwgdXNlcm5hbWU6IHJvb20uc2VydmVkQnkudXNlcm5hbWUgfSk7XG5cblx0XHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuc3RyZWFtLmVtaXQocmlkLCB7XG5cdFx0XHRcdHR5cGU6ICdhZ2VudERhdGEnLFxuXHRcdFx0XHRkYXRhOiBudWxsLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG9wZW5JbnE7XG5cdH0sXG5cblx0c2VuZFJlcXVlc3QocG9zdERhdGEsIGNhbGxiYWNrLCB0cnlpbmcgPSAxKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XHQnWC1Sb2NrZXRDaGF0LUxpdmVjaGF0LVRva2VuJzogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3NlY3JldF90b2tlbicpLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRkYXRhOiBwb3N0RGF0YSxcblx0XHRcdH07XG5cdFx0XHRyZXR1cm4gSFRUUC5wb3N0KFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF93ZWJob29rVXJsJyksIG9wdGlvbnMpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFJvY2tldENoYXQuTGl2ZWNoYXQubG9nZ2VyLndlYmhvb2suZXJyb3IoYFJlc3BvbnNlIGVycm9yIG9uICR7IHRyeWluZyB9IHRyeSAtPmAsIGUpO1xuXHRcdFx0Ly8gdHJ5IDEwIHRpbWVzIGFmdGVyIDEwIHNlY29uZHMgZWFjaFxuXHRcdFx0aWYgKHRyeWluZyA8IDEwKSB7XG5cdFx0XHRcdFJvY2tldENoYXQuTGl2ZWNoYXQubG9nZ2VyLndlYmhvb2sud2FybignV2lsbCB0cnkgYWdhaW4gaW4gMTAgc2Vjb25kcyAuLi4nKTtcblx0XHRcdFx0dHJ5aW5nKys7XG5cdFx0XHRcdHNldFRpbWVvdXQoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kUmVxdWVzdChwb3N0RGF0YSwgY2FsbGJhY2ssIHRyeWluZyk7XG5cdFx0XHRcdH0pLCAxMDAwMCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdGdldExpdmVjaGF0Um9vbUd1ZXN0SW5mbyhyb29tKSB7XG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZmluZE9uZUJ5SWQocm9vbS52Ll9pZCk7XG5cdFx0Y29uc3QgYWdlbnQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChyb29tLnNlcnZlZEJ5ICYmIHJvb20uc2VydmVkQnkuX2lkKTtcblxuXHRcdGNvbnN0IHVhID0gbmV3IFVBUGFyc2VyKCk7XG5cdFx0dWEuc2V0VUEodmlzaXRvci51c2VyQWdlbnQpO1xuXG5cdFx0Y29uc3QgcG9zdERhdGEgPSB7XG5cdFx0XHRfaWQ6IHJvb20uX2lkLFxuXHRcdFx0bGFiZWw6IHJvb20uZm5hbWUgfHwgcm9vbS5sYWJlbCwgLy8gdXNpbmcgc2FtZSBmaWVsZCBmb3IgY29tcGF0aWJpbGl0eVxuXHRcdFx0dG9waWM6IHJvb20udG9waWMsXG5cdFx0XHRjcmVhdGVkQXQ6IHJvb20udHMsXG5cdFx0XHRsYXN0TWVzc2FnZUF0OiByb29tLmxtLFxuXHRcdFx0dGFnczogcm9vbS50YWdzLFxuXHRcdFx0Y3VzdG9tRmllbGRzOiByb29tLmxpdmVjaGF0RGF0YSxcblx0XHRcdHZpc2l0b3I6IHtcblx0XHRcdFx0X2lkOiB2aXNpdG9yLl9pZCxcblx0XHRcdFx0dG9rZW46IHZpc2l0b3IudG9rZW4sXG5cdFx0XHRcdG5hbWU6IHZpc2l0b3IubmFtZSxcblx0XHRcdFx0dXNlcm5hbWU6IHZpc2l0b3IudXNlcm5hbWUsXG5cdFx0XHRcdGVtYWlsOiBudWxsLFxuXHRcdFx0XHRwaG9uZTogbnVsbCxcblx0XHRcdFx0ZGVwYXJ0bWVudDogdmlzaXRvci5kZXBhcnRtZW50LFxuXHRcdFx0XHRpcDogdmlzaXRvci5pcCxcblx0XHRcdFx0b3M6IHVhLmdldE9TKCkubmFtZSAmJiAoYCR7IHVhLmdldE9TKCkubmFtZSB9ICR7IHVhLmdldE9TKCkudmVyc2lvbiB9YCksXG5cdFx0XHRcdGJyb3dzZXI6IHVhLmdldEJyb3dzZXIoKS5uYW1lICYmIChgJHsgdWEuZ2V0QnJvd3NlcigpLm5hbWUgfSAkeyB1YS5nZXRCcm93c2VyKCkudmVyc2lvbiB9YCksXG5cdFx0XHRcdGN1c3RvbUZpZWxkczogdmlzaXRvci5saXZlY2hhdERhdGEsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRpZiAoYWdlbnQpIHtcblx0XHRcdHBvc3REYXRhLmFnZW50ID0ge1xuXHRcdFx0XHRfaWQ6IGFnZW50Ll9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IGFnZW50LnVzZXJuYW1lLFxuXHRcdFx0XHRuYW1lOiBhZ2VudC5uYW1lLFxuXHRcdFx0XHRlbWFpbDogbnVsbCxcblx0XHRcdH07XG5cblx0XHRcdGlmIChhZ2VudC5lbWFpbHMgJiYgYWdlbnQuZW1haWxzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0cG9zdERhdGEuYWdlbnQuZW1haWwgPSBhZ2VudC5lbWFpbHNbMF0uYWRkcmVzcztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAocm9vbS5jcm1EYXRhKSB7XG5cdFx0XHRwb3N0RGF0YS5jcm1EYXRhID0gcm9vbS5jcm1EYXRhO1xuXHRcdH1cblxuXHRcdGlmICh2aXNpdG9yLnZpc2l0b3JFbWFpbHMgJiYgdmlzaXRvci52aXNpdG9yRW1haWxzLmxlbmd0aCA+IDApIHtcblx0XHRcdHBvc3REYXRhLnZpc2l0b3IuZW1haWwgPSB2aXNpdG9yLnZpc2l0b3JFbWFpbHM7XG5cdFx0fVxuXHRcdGlmICh2aXNpdG9yLnBob25lICYmIHZpc2l0b3IucGhvbmUubGVuZ3RoID4gMCkge1xuXHRcdFx0cG9zdERhdGEudmlzaXRvci5waG9uZSA9IHZpc2l0b3IucGhvbmU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHBvc3REYXRhO1xuXHR9LFxuXG5cdGFkZEFnZW50KHVzZXJuYW1lKSB7XG5cdFx0Y2hlY2sodXNlcm5hbWUsIFN0cmluZyk7XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSwgdXNlcm5hbWU6IDEgfSB9KTtcblxuXHRcdGlmICghdXNlcikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6YWRkQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6LmFkZFVzZXJSb2xlcyh1c2VyLl9pZCwgJ2xpdmVjaGF0LWFnZW50JykpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldE9wZXJhdG9yKHVzZXIuX2lkLCB0cnVlKTtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldExpdmVjaGF0U3RhdHVzKHVzZXIuX2lkLCAnYXZhaWxhYmxlJyk7XG5cdFx0XHRyZXR1cm4gdXNlcjtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0YWRkTWFuYWdlcih1c2VybmFtZSkge1xuXHRcdGNoZWNrKHVzZXJuYW1lLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHVzZXJuYW1lLCB7IGZpZWxkczogeyBfaWQ6IDEsIHVzZXJuYW1lOiAxIH0gfSk7XG5cblx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmFkZE1hbmFnZXInIH0pO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6LmFkZFVzZXJSb2xlcyh1c2VyLl9pZCwgJ2xpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIHVzZXI7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXG5cdHJlbW92ZUFnZW50KHVzZXJuYW1lKSB7XG5cdFx0Y2hlY2sodXNlcm5hbWUsIFN0cmluZyk7XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXG5cdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVBZ2VudCcgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKFJvY2tldENoYXQuYXV0aHoucmVtb3ZlVXNlckZyb21Sb2xlcyh1c2VyLl9pZCwgJ2xpdmVjaGF0LWFnZW50JykpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldE9wZXJhdG9yKHVzZXIuX2lkLCBmYWxzZSk7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRMaXZlY2hhdFN0YXR1cyh1c2VyLl9pZCwgJ25vdC1hdmFpbGFibGUnKTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHRyZW1vdmVNYW5hZ2VyKHVzZXJuYW1lKSB7XG5cdFx0Y2hlY2sodXNlcm5hbWUsIFN0cmluZyk7XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXG5cdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVNYW5hZ2VyJyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5hdXRoei5yZW1vdmVVc2VyRnJvbVJvbGVzKHVzZXIuX2lkLCAnbGl2ZWNoYXQtbWFuYWdlcicpO1xuXHR9LFxuXG5cdHNhdmVEZXBhcnRtZW50KF9pZCwgZGVwYXJ0bWVudERhdGEsIGRlcGFydG1lbnRBZ2VudHMpIHtcblx0XHRjaGVjayhfaWQsIE1hdGNoLk1heWJlKFN0cmluZykpO1xuXG5cdFx0Y2hlY2soZGVwYXJ0bWVudERhdGEsIHtcblx0XHRcdGVuYWJsZWQ6IEJvb2xlYW4sXG5cdFx0XHRuYW1lOiBTdHJpbmcsXG5cdFx0XHRkZXNjcmlwdGlvbjogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdHNob3dPblJlZ2lzdHJhdGlvbjogQm9vbGVhbixcblx0XHR9KTtcblxuXHRcdGNoZWNrKGRlcGFydG1lbnRBZ2VudHMsIFtcblx0XHRcdE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRcdGFnZW50SWQ6IFN0cmluZyxcblx0XHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHRcdH0pLFxuXHRcdF0pO1xuXG5cdFx0aWYgKF9pZCkge1xuXHRcdFx0Y29uc3QgZGVwYXJ0bWVudCA9IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5maW5kT25lQnlJZChfaWQpO1xuXHRcdFx0aWYgKCFkZXBhcnRtZW50KSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWRlcGFydG1lbnQtbm90LWZvdW5kJywgJ0RlcGFydG1lbnQgbm90IGZvdW5kJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlRGVwYXJ0bWVudCcgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5jcmVhdGVPclVwZGF0ZURlcGFydG1lbnQoX2lkLCBkZXBhcnRtZW50RGF0YSwgZGVwYXJ0bWVudEFnZW50cyk7XG5cdH0sXG5cblx0cmVtb3ZlRGVwYXJ0bWVudChfaWQpIHtcblx0XHRjaGVjayhfaWQsIFN0cmluZyk7XG5cblx0XHRjb25zdCBkZXBhcnRtZW50ID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmRPbmVCeUlkKF9pZCwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cblx0XHRpZiAoIWRlcGFydG1lbnQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2RlcGFydG1lbnQtbm90LWZvdW5kJywgJ0RlcGFydG1lbnQgbm90IGZvdW5kJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVEZXBhcnRtZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LnJlbW92ZUJ5SWQoX2lkKTtcblx0fSxcblxuXHRzaG93Q29ubmVjdGluZygpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJykgPT09ICdHdWVzdF9Qb29sJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9vcGVuX2lucXVpZXJ5X3Nob3dfY29ubmVjdGluZycpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9LFxufTtcblxuUm9ja2V0Q2hhdC5MaXZlY2hhdC5zdHJlYW0gPSBuZXcgTWV0ZW9yLlN0cmVhbWVyKCdsaXZlY2hhdC1yb29tJyk7XG5cblJvY2tldENoYXQuTGl2ZWNoYXQuc3RyZWFtLmFsbG93UmVhZCgocm9vbUlkLCBleHRyYURhdGEpID0+IHtcblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cblx0aWYgKCFyb29tKSB7XG5cdFx0Y29uc29sZS53YXJuKGBJbnZhbGlkIGV2ZW50TmFtZTogXCIkeyByb29tSWQgfVwiYCk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0aWYgKHJvb20udCA9PT0gJ2wnICYmIGV4dHJhRGF0YSAmJiBleHRyYURhdGEudmlzaXRvclRva2VuICYmIHJvb20udi50b2tlbiA9PT0gZXh0cmFEYXRhLnZpc2l0b3JUb2tlbikge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfaGlzdG9yeV9tb25pdG9yX3R5cGUnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRSb2NrZXRDaGF0LkxpdmVjaGF0Lmhpc3RvcnlNb25pdG9yVHlwZSA9IHZhbHVlO1xufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuUm9ja2V0Q2hhdC5RdWV1ZU1ldGhvZHMgPSB7XG5cdC8qIExlYXN0IEFtb3VudCBRdWV1aW5nIG1ldGhvZDpcblx0ICpcblx0ICogZGVmYXVsdCBtZXRob2Qgd2hlcmUgdGhlIGFnZW50IHdpdGggdGhlIGxlYXN0IG51bWJlclxuXHQgKiBvZiBvcGVuIGNoYXRzIGlzIHBhaXJlZCB3aXRoIHRoZSBpbmNvbWluZyBsaXZlY2hhdFxuXHQgKi9cblx0J0xlYXN0X0Ftb3VudCcoZ3Vlc3QsIG1lc3NhZ2UsIHJvb21JbmZvLCBhZ2VudCkge1xuXHRcdGlmICghYWdlbnQpIHtcblx0XHRcdGFnZW50ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXROZXh0QWdlbnQoZ3Vlc3QuZGVwYXJ0bWVudCk7XG5cdFx0XHRpZiAoIWFnZW50KSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ25vLWFnZW50LW9ubGluZScsICdTb3JyeSwgbm8gb25saW5lIGFnZW50cycpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZUxpdmVjaGF0Um9vbUNvdW50KCk7XG5cblx0XHRjb25zdCByb29tID0gXy5leHRlbmQoe1xuXHRcdFx0X2lkOiBtZXNzYWdlLnJpZCxcblx0XHRcdG1zZ3M6IDAsXG5cdFx0XHR1c2Vyc0NvdW50OiAxLFxuXHRcdFx0bG06IG5ldyBEYXRlKCksXG5cdFx0XHRmbmFtZTogKHJvb21JbmZvICYmIHJvb21JbmZvLmZuYW1lKSB8fCBndWVzdC5uYW1lIHx8IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0Ly8gdXNlcm5hbWVzOiBbYWdlbnQudXNlcm5hbWUsIGd1ZXN0LnVzZXJuYW1lXSxcblx0XHRcdHQ6ICdsJyxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0djoge1xuXHRcdFx0XHRfaWQ6IGd1ZXN0Ll9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0XHR0b2tlbjogbWVzc2FnZS50b2tlbixcblx0XHRcdFx0c3RhdHVzOiBndWVzdC5zdGF0dXMgfHwgJ29ubGluZScsXG5cdFx0XHR9LFxuXHRcdFx0c2VydmVkQnk6IHtcblx0XHRcdFx0X2lkOiBhZ2VudC5hZ2VudElkLFxuXHRcdFx0XHR1c2VybmFtZTogYWdlbnQudXNlcm5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0Y2w6IGZhbHNlLFxuXHRcdFx0b3BlbjogdHJ1ZSxcblx0XHRcdHdhaXRpbmdSZXNwb25zZTogdHJ1ZSxcblx0XHR9LCByb29tSW5mbyk7XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb25EYXRhID0ge1xuXHRcdFx0cmlkOiBtZXNzYWdlLnJpZCxcblx0XHRcdGZuYW1lOiBndWVzdC5uYW1lIHx8IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0YWxlcnQ6IHRydWUsXG5cdFx0XHRvcGVuOiB0cnVlLFxuXHRcdFx0dW5yZWFkOiAxLFxuXHRcdFx0dXNlck1lbnRpb25zOiAxLFxuXHRcdFx0Z3JvdXBNZW50aW9uczogMCxcblx0XHRcdHU6IHtcblx0XHRcdFx0X2lkOiBhZ2VudC5hZ2VudElkLFxuXHRcdFx0XHR1c2VybmFtZTogYWdlbnQudXNlcm5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0dDogJ2wnLFxuXHRcdFx0ZGVza3RvcE5vdGlmaWNhdGlvbnM6ICdhbGwnLFxuXHRcdFx0bW9iaWxlUHVzaE5vdGlmaWNhdGlvbnM6ICdhbGwnLFxuXHRcdFx0ZW1haWxOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHR9O1xuXG5cdFx0aWYgKGd1ZXN0LmRlcGFydG1lbnQpIHtcblx0XHRcdHJvb20uZGVwYXJ0bWVudElkID0gZ3Vlc3QuZGVwYXJ0bWVudDtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5pbnNlcnQocm9vbSk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmluc2VydChzdWJzY3JpcHRpb25EYXRhKTtcblxuXHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuc3RyZWFtLmVtaXQocm9vbS5faWQsIHtcblx0XHRcdHR5cGU6ICdhZ2VudERhdGEnLFxuXHRcdFx0ZGF0YTogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvKGFnZW50LmFnZW50SWQpLFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHJvb207XG5cdH0sXG5cdC8qIEd1ZXN0IFBvb2wgUXVldWluZyBNZXRob2Q6XG5cdCAqXG5cdCAqIEFuIGluY29tbWluZyBsaXZlY2hhdCBpcyBjcmVhdGVkIGFzIGFuIElucXVpcnlcblx0ICogd2hpY2ggaXMgcGlja2VkIHVwIGZyb20gYW4gYWdlbnQuXG5cdCAqIEFuIElucXVpcnkgaXMgdmlzaWJsZSB0byBhbGwgYWdlbnRzIChUT0RPOiBpbiB0aGUgY29ycmVjdCBkZXBhcnRtZW50KVxuICAgICAqXG5cdCAqIEEgcm9vbSBpcyBzdGlsbCBjcmVhdGVkIHdpdGggdGhlIGluaXRpYWwgbWVzc2FnZSwgYnV0IGl0IGlzIG9jY3VwaWVkIGJ5XG5cdCAqIG9ubHkgdGhlIGNsaWVudCB1bnRpbCBwYWlyZWQgd2l0aCBhbiBhZ2VudFxuXHQgKi9cblx0J0d1ZXN0X1Bvb2wnKGd1ZXN0LCBtZXNzYWdlLCByb29tSW5mbykge1xuXHRcdGxldCBhZ2VudHMgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldE9ubGluZUFnZW50cyhndWVzdC5kZXBhcnRtZW50KTtcblxuXHRcdGlmIChhZ2VudHMuY291bnQoKSA9PT0gMCAmJiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfZ3Vlc3RfcG9vbF93aXRoX25vX2FnZW50cycpKSB7XG5cdFx0XHRhZ2VudHMgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldEFnZW50cyhndWVzdC5kZXBhcnRtZW50KTtcblx0XHR9XG5cblx0XHRpZiAoYWdlbnRzLmNvdW50KCkgPT09IDApIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ25vLWFnZW50LW9ubGluZScsICdTb3JyeSwgbm8gb25saW5lIGFnZW50cycpO1xuXHRcdH1cblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZUxpdmVjaGF0Um9vbUNvdW50KCk7XG5cblx0XHRjb25zdCBhZ2VudElkcyA9IFtdO1xuXG5cdFx0YWdlbnRzLmZvckVhY2goKGFnZW50KSA9PiB7XG5cdFx0XHRpZiAoZ3Vlc3QuZGVwYXJ0bWVudCkge1xuXHRcdFx0XHRhZ2VudElkcy5wdXNoKGFnZW50LmFnZW50SWQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YWdlbnRJZHMucHVzaChhZ2VudC5faWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgaW5xdWlyeSA9IHtcblx0XHRcdHJpZDogbWVzc2FnZS5yaWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlLm1zZyxcblx0XHRcdG5hbWU6IGd1ZXN0Lm5hbWUgfHwgZ3Vlc3QudXNlcm5hbWUsXG5cdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdGRlcGFydG1lbnQ6IGd1ZXN0LmRlcGFydG1lbnQsXG5cdFx0XHRhZ2VudHM6IGFnZW50SWRzLFxuXHRcdFx0c3RhdHVzOiAnb3BlbicsXG5cdFx0XHR2OiB7XG5cdFx0XHRcdF9pZDogZ3Vlc3QuX2lkLFxuXHRcdFx0XHR1c2VybmFtZTogZ3Vlc3QudXNlcm5hbWUsXG5cdFx0XHRcdHRva2VuOiBtZXNzYWdlLnRva2VuLFxuXHRcdFx0XHRzdGF0dXM6IGd1ZXN0LnN0YXR1cyB8fCAnb25saW5lJyxcblx0XHRcdH0sXG5cdFx0XHR0OiAnbCcsXG5cdFx0fTtcblxuXHRcdGNvbnN0IHJvb20gPSBfLmV4dGVuZCh7XG5cdFx0XHRfaWQ6IG1lc3NhZ2UucmlkLFxuXHRcdFx0bXNnczogMCxcblx0XHRcdHVzZXJzQ291bnQ6IDAsXG5cdFx0XHRsbTogbmV3IERhdGUoKSxcblx0XHRcdGZuYW1lOiBndWVzdC5uYW1lIHx8IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0Ly8gdXNlcm5hbWVzOiBbZ3Vlc3QudXNlcm5hbWVdLFxuXHRcdFx0dDogJ2wnLFxuXHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHR2OiB7XG5cdFx0XHRcdF9pZDogZ3Vlc3QuX2lkLFxuXHRcdFx0XHR1c2VybmFtZTogZ3Vlc3QudXNlcm5hbWUsXG5cdFx0XHRcdHRva2VuOiBtZXNzYWdlLnRva2VuLFxuXHRcdFx0XHRzdGF0dXM6IGd1ZXN0LnN0YXR1cyxcblx0XHRcdH0sXG5cdFx0XHRjbDogZmFsc2UsXG5cdFx0XHRvcGVuOiB0cnVlLFxuXHRcdFx0d2FpdGluZ1Jlc3BvbnNlOiB0cnVlLFxuXHRcdH0sIHJvb21JbmZvKTtcblxuXHRcdGlmIChndWVzdC5kZXBhcnRtZW50KSB7XG5cdFx0XHRyb29tLmRlcGFydG1lbnRJZCA9IGd1ZXN0LmRlcGFydG1lbnQ7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5Lmluc2VydChpbnF1aXJ5KTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5pbnNlcnQocm9vbSk7XG5cblx0XHRyZXR1cm4gcm9vbTtcblx0fSxcblx0J0V4dGVybmFsJyhndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8sIGFnZW50KSB7XG5cdFx0cmV0dXJuIHRoaXNbJ0xlYXN0X0Ftb3VudCddKGd1ZXN0LCBtZXNzYWdlLCByb29tSW5mbywgYWdlbnQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG5cdH0sXG59O1xuIiwiLy8gRXZlcnkgbWludXRlIGNoZWNrIGlmIG9mZmljZSBjbG9zZWRcbk1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9lbmFibGVfb2ZmaWNlX2hvdXJzJykpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRPZmZpY2VIb3VyLmlzT3BlbmluZ1RpbWUoKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMub3Blbk9mZmljZSgpO1xuXHRcdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRPZmZpY2VIb3VyLmlzQ2xvc2luZ1RpbWUoKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuY2xvc2VPZmZpY2UoKTtcblx0XHR9XG5cdH1cbn0sIDYwMDAwKTtcbiIsImNvbnN0IGdhdGV3YXlVUkwgPSAnaHR0cHM6Ly9vbW5pLnJvY2tldC5jaGF0JztcblxuZXhwb3J0IGRlZmF1bHQge1xuXHRlbmFibGUoKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gSFRUUC5jYWxsKCdQT1NUJywgYCR7IGdhdGV3YXlVUkwgfS9mYWNlYm9vay9lbmFibGVgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdGF1dGhvcml6YXRpb246IGBCZWFyZXIgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknKSB9YCxcblx0XHRcdFx0J2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRcdH0sXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVybDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NpdGVfVXJsJyksXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHJldHVybiByZXN1bHQuZGF0YTtcblx0fSxcblxuXHRkaXNhYmxlKCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IEhUVFAuY2FsbCgnREVMRVRFJywgYCR7IGdhdGV3YXlVUkwgfS9mYWNlYm9vay9lbmFibGVgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdGF1dGhvcml6YXRpb246IGBCZWFyZXIgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknKSB9YCxcblx0XHRcdFx0J2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc3VsdC5kYXRhO1xuXHR9LFxuXG5cdGxpc3RQYWdlcygpIHtcblx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ0dFVCcsIGAkeyBnYXRld2F5VVJMIH0vZmFjZWJvb2svcGFnZXNgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdGF1dGhvcml6YXRpb246IGBCZWFyZXIgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknKSB9YCxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc3VsdC5kYXRhO1xuXHR9LFxuXG5cdHN1YnNjcmliZShwYWdlSWQpIHtcblx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ1BPU1QnLCBgJHsgZ2F0ZXdheVVSTCB9L2ZhY2Vib29rL3BhZ2UvJHsgcGFnZUlkIH0vc3Vic2NyaWJlYCwge1xuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHRhdXRob3JpemF0aW9uOiBgQmVhcmVyICR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JykgfWAsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHJldHVybiByZXN1bHQuZGF0YTtcblx0fSxcblxuXHR1bnN1YnNjcmliZShwYWdlSWQpIHtcblx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ0RFTEVURScsIGAkeyBnYXRld2F5VVJMIH0vZmFjZWJvb2svcGFnZS8keyBwYWdlSWQgfS9zdWJzY3JpYmVgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdGF1dGhvcml6YXRpb246IGBCZWFyZXIgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknKSB9YCxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc3VsdC5kYXRhO1xuXHR9LFxuXG5cdHJlcGx5KHsgcGFnZSwgdG9rZW4sIHRleHQgfSkge1xuXHRcdHJldHVybiBIVFRQLmNhbGwoJ1BPU1QnLCBgJHsgZ2F0ZXdheVVSTCB9L2ZhY2Vib29rL3JlcGx5YCwge1xuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHRhdXRob3JpemF0aW9uOiBgQmVhcmVyICR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JykgfWAsXG5cdFx0XHR9LFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRwYWdlLFxuXHRcdFx0XHR0b2tlbixcblx0XHRcdFx0dGV4dCxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59O1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0Ly8gc2tpcHMgdGhpcyBjYWxsYmFjayBpZiB0aGUgbWVzc2FnZSB3YXMgZWRpdGVkXG5cdGlmIChtZXNzYWdlLmVkaXRlZEF0KSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuU01TLmVuYWJsZWQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIG9ubHkgc2VuZCB0aGUgc21zIGJ5IFNNUyBpZiBpdCBpcyBhIGxpdmVjaGF0IHJvb20gd2l0aCBTTVMgc2V0IHRvIHRydWVcblx0aWYgKCEodHlwZW9mIHJvb20udCAhPT0gJ3VuZGVmaW5lZCcgJiYgcm9vbS50ID09PSAnbCcgJiYgcm9vbS5zbXMgJiYgcm9vbS52ICYmIHJvb20udi50b2tlbikpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHRva2VuLCBpdCB3YXMgc2VudCBmcm9tIHRoZSB2aXNpdG9yLCBzbyBpZ25vcmUgaXRcblx0aWYgKG1lc3NhZ2UudG9rZW4pIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHR5cGUgbWVhbnMgaXQgaXMgYSBzcGVjaWFsIG1lc3NhZ2UgKGxpa2UgdGhlIGNsb3NpbmcgY29tbWVudCksIHNvIHNraXBzXG5cdGlmIChtZXNzYWdlLnQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvbnN0IFNNU1NlcnZpY2UgPSBSb2NrZXRDaGF0LlNNUy5nZXRTZXJ2aWNlKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTTVNfU2VydmljZScpKTtcblxuXHRpZiAoIVNNU1NlcnZpY2UpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHJvb20udi50b2tlbik7XG5cblx0aWYgKCF2aXNpdG9yIHx8ICF2aXNpdG9yLnBob25lIHx8IHZpc2l0b3IucGhvbmUubGVuZ3RoID09PSAwKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRTTVNTZXJ2aWNlLnNlbmQocm9vbS5zbXMuZnJvbSwgdmlzaXRvci5waG9uZVswXS5waG9uZU51bWJlciwgbWVzc2FnZS5tc2cpO1xuXG5cdHJldHVybiBtZXNzYWdlO1xuXG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdzZW5kTWVzc2FnZUJ5U21zJyk7XG4iLCIvKiBnbG9iYWxzIFVzZXJQcmVzZW5jZU1vbml0b3IgKi9cblxubGV0IGFnZW50c0hhbmRsZXI7XG5sZXQgbW9uaXRvckFnZW50cyA9IGZhbHNlO1xubGV0IGFjdGlvblRpbWVvdXQgPSA2MDAwMDtcblxuY29uc3Qgb25saW5lQWdlbnRzID0ge1xuXHR1c2Vyczoge30sXG5cdHF1ZXVlOiB7fSxcblxuXHRhZGQodXNlcklkKSB7XG5cdFx0aWYgKHRoaXMucXVldWVbdXNlcklkXSkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucXVldWVbdXNlcklkXSk7XG5cdFx0XHRkZWxldGUgdGhpcy5xdWV1ZVt1c2VySWRdO1xuXHRcdH1cblx0XHR0aGlzLnVzZXJzW3VzZXJJZF0gPSAxO1xuXHR9LFxuXG5cdHJlbW92ZSh1c2VySWQsIGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMucXVldWVbdXNlcklkXSkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucXVldWVbdXNlcklkXSk7XG5cdFx0fVxuXHRcdHRoaXMucXVldWVbdXNlcklkXSA9IHNldFRpbWVvdXQoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygpO1xuXG5cdFx0XHRkZWxldGUgdGhpcy51c2Vyc1t1c2VySWRdO1xuXHRcdFx0ZGVsZXRlIHRoaXMucXVldWVbdXNlcklkXTtcblx0XHR9KSwgYWN0aW9uVGltZW91dCk7XG5cdH0sXG5cblx0ZXhpc3RzKHVzZXJJZCkge1xuXHRcdHJldHVybiAhIXRoaXMudXNlcnNbdXNlcklkXTtcblx0fSxcbn07XG5cbmZ1bmN0aW9uIHJ1bkFnZW50TGVhdmVBY3Rpb24odXNlcklkKSB7XG5cdGNvbnN0IGFjdGlvbiA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb24nKTtcblx0aWYgKGFjdGlvbiA9PT0gJ2Nsb3NlJykge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LmNsb3NlT3BlbkNoYXRzKHVzZXJJZCwgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X2FnZW50X2xlYXZlX2NvbW1lbnQnKSk7XG5cdH0gZWxzZSBpZiAoYWN0aW9uID09PSAnZm9yd2FyZCcpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5mb3J3YXJkT3BlbkNoYXRzKHVzZXJJZCk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X2FnZW50X2xlYXZlX2FjdGlvbl90aW1lb3V0JywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRhY3Rpb25UaW1lb3V0ID0gdmFsdWUgKiAxMDAwO1xufSk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb24nLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdG1vbml0b3JBZ2VudHMgPSB2YWx1ZTtcblx0aWYgKHZhbHVlICE9PSAnbm9uZScpIHtcblx0XHRpZiAoIWFnZW50c0hhbmRsZXIpIHtcblx0XHRcdGFnZW50c0hhbmRsZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25saW5lQWdlbnRzKCkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdFx0XHRhZGRlZChpZCkge1xuXHRcdFx0XHRcdG9ubGluZUFnZW50cy5hZGQoaWQpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdFx0XHRpZiAoZmllbGRzLnN0YXR1c0xpdmVjaGF0ICYmIGZpZWxkcy5zdGF0dXNMaXZlY2hhdCA9PT0gJ25vdC1hdmFpbGFibGUnKSB7XG5cdFx0XHRcdFx0XHRvbmxpbmVBZ2VudHMucmVtb3ZlKGlkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJ1bkFnZW50TGVhdmVBY3Rpb24oaWQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG9ubGluZUFnZW50cy5hZGQoaWQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0XHRcdG9ubGluZUFnZW50cy5yZW1vdmUoaWQsICgpID0+IHtcblx0XHRcdFx0XHRcdHJ1bkFnZW50TGVhdmVBY3Rpb24oaWQpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYgKGFnZW50c0hhbmRsZXIpIHtcblx0XHRhZ2VudHNIYW5kbGVyLnN0b3AoKTtcblx0XHRhZ2VudHNIYW5kbGVyID0gbnVsbDtcblx0fVxufSk7XG5cblVzZXJQcmVzZW5jZU1vbml0b3Iub25TZXRVc2VyU3RhdHVzKCh1c2VyLCBzdGF0dXMvKiAsIHN0YXR1c0Nvbm5lY3Rpb24qLykgPT4ge1xuXHRpZiAoIW1vbml0b3JBZ2VudHMpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKG9ubGluZUFnZW50cy5leGlzdHModXNlci5faWQpKSB7XG5cdFx0aWYgKHN0YXR1cyA9PT0gJ29mZmxpbmUnIHx8IHVzZXIuc3RhdHVzTGl2ZWNoYXQgPT09ICdub3QtYXZhaWxhYmxlJykge1xuXHRcdFx0b25saW5lQWdlbnRzLnJlbW92ZSh1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0XHRydW5BZ2VudExlYXZlQWN0aW9uKHVzZXIuX2lkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufSk7XG4iLCJpbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDpjdXN0b21GaWVsZHMnLCBmdW5jdGlvbihfaWQpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6Y3VzdG9tRmllbGRzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmN1c3RvbUZpZWxkcycgfSkpO1xuXHR9XG5cblx0aWYgKHMudHJpbShfaWQpKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQuZmluZCh7IF9pZCB9KTtcblx0fVxuXG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmZpbmQoKTtcblxufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6ZGVwYXJ0bWVudEFnZW50cycsIGZ1bmN0aW9uKGRlcGFydG1lbnRJZCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDpkZXBhcnRtZW50QWdlbnRzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6ZGVwYXJ0bWVudEFnZW50cycgfSkpO1xuXHR9XG5cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kKHsgZGVwYXJ0bWVudElkIH0pO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6ZXh0ZXJuYWxNZXNzYWdlcycsIGZ1bmN0aW9uKHJvb21JZCkge1xuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UuZmluZEJ5Um9vbUlkKHJvb21JZCk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDphZ2VudHMnLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6YWdlbnRzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFnZW50cycgfSkpO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0Y29uc3QgaGFuZGxlID0gUm9ja2V0Q2hhdC5hdXRoei5nZXRVc2Vyc0luUm9sZSgnbGl2ZWNoYXQtYWdlbnQnKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnYWdlbnRVc2VycycsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmNoYW5nZWQoJ2FnZW50VXNlcnMnLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdHJlbW92ZWQoaWQpIHtcblx0XHRcdHNlbGYucmVtb3ZlZCgnYWdlbnRVc2VycycsIGlkKTtcblx0XHR9LFxuXHR9KTtcblxuXHRzZWxmLnJlYWR5KCk7XG5cblx0c2VsZi5vblN0b3AoZnVuY3Rpb24oKSB7XG5cdFx0aGFuZGxlLnN0b3AoKTtcblx0fSk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDphcHBlYXJhbmNlJywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFwcGVhcmFuY2UnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFwcGVhcmFuY2UnIH0pKTtcblx0fVxuXG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZDoge1xuXHRcdFx0JGluOiBbXG5cdFx0XHRcdCdMaXZlY2hhdF90aXRsZScsXG5cdFx0XHRcdCdMaXZlY2hhdF90aXRsZV9jb2xvcicsXG5cdFx0XHRcdCdMaXZlY2hhdF9zaG93X2FnZW50X2VtYWlsJyxcblx0XHRcdFx0J0xpdmVjaGF0X2Rpc3BsYXlfb2ZmbGluZV9mb3JtJyxcblx0XHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfZm9ybV91bmF2YWlsYWJsZScsXG5cdFx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX21lc3NhZ2UnLFxuXHRcdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9zdWNjZXNzX21lc3NhZ2UnLFxuXHRcdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV90aXRsZScsXG5cdFx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yJyxcblx0XHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfZW1haWwnLFxuXHRcdFx0XHQnTGl2ZWNoYXRfY29udmVyc2F0aW9uX2ZpbmlzaGVkX21lc3NhZ2UnLFxuXHRcdFx0XHQnTGl2ZWNoYXRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXHRcdFx0XHQnTGl2ZWNoYXRfbmFtZV9maWVsZF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XHRcdCdMaXZlY2hhdF9lbWFpbF9maWVsZF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH07XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0Y29uc3QgaGFuZGxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZChxdWVyeSkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdGFkZGVkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuYWRkZWQoJ2xpdmVjaGF0QXBwZWFyYW5jZScsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmNoYW5nZWQoJ2xpdmVjaGF0QXBwZWFyYW5jZScsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0c2VsZi5yZW1vdmVkKCdsaXZlY2hhdEFwcGVhcmFuY2UnLCBpZCk7XG5cdFx0fSxcblx0fSk7XG5cblx0dGhpcy5yZWFkeSgpO1xuXG5cdHRoaXMub25TdG9wKCgpID0+IHtcblx0XHRoYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0OmRlcGFydG1lbnRzJywgZnVuY3Rpb24oX2lkKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFnZW50cycgfSkpO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDphZ2VudHMnIH0pKTtcblx0fVxuXG5cdGlmIChfaWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQuZmluZEJ5RGVwYXJ0bWVudElkKF9pZCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5maW5kKCk7XG5cdH1cblxufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6aW50ZWdyYXRpb24nLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6aW50ZWdyYXRpb24nIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmludGVncmF0aW9uJyB9KSk7XG5cdH1cblxuXHRjb25zdCBzZWxmID0gdGhpcztcblxuXHRjb25zdCBoYW5kbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kQnlJZHMoWydMaXZlY2hhdF93ZWJob29rVXJsJywgJ0xpdmVjaGF0X3NlY3JldF90b2tlbicsICdMaXZlY2hhdF93ZWJob29rX29uX2Nsb3NlJywgJ0xpdmVjaGF0X3dlYmhvb2tfb25fb2ZmbGluZV9tc2cnLCAnTGl2ZWNoYXRfd2ViaG9va19vbl92aXNpdG9yX21lc3NhZ2UnLCAnTGl2ZWNoYXRfd2ViaG9va19vbl9hZ2VudF9tZXNzYWdlJ10pLm9ic2VydmVDaGFuZ2VzKHtcblx0XHRhZGRlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmFkZGVkKCdsaXZlY2hhdEludGVncmF0aW9uJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuY2hhbmdlZCgnbGl2ZWNoYXRJbnRlZ3JhdGlvbicsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0c2VsZi5yZW1vdmVkKCdsaXZlY2hhdEludGVncmF0aW9uJywgaWQpO1xuXHRcdH0sXG5cdH0pO1xuXG5cdHNlbGYucmVhZHkoKTtcblxuXHRzZWxmLm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRoYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0Om1hbmFnZXJzJywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0Om1hbmFnZXJzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6bWFuYWdlcnMnIH0pKTtcblx0fVxuXG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdGNvbnN0IGhhbmRsZSA9IFJvY2tldENoYXQuYXV0aHouZ2V0VXNlcnNJblJvbGUoJ2xpdmVjaGF0LW1hbmFnZXInKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnbWFuYWdlclVzZXJzJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuY2hhbmdlZCgnbWFuYWdlclVzZXJzJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRyZW1vdmVkKGlkKSB7XG5cdFx0XHRzZWxmLnJlbW92ZWQoJ21hbmFnZXJVc2VycycsIGlkKTtcblx0XHR9LFxuXHR9KTtcblxuXHRzZWxmLnJlYWR5KCk7XG5cblx0c2VsZi5vblN0b3AoZnVuY3Rpb24oKSB7XG5cdFx0aGFuZGxlLnN0b3AoKTtcblx0fSk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDpyb29tcycsIGZ1bmN0aW9uKGZpbHRlciA9IHt9LCBvZmZzZXQgPSAwLCBsaW1pdCA9IDIwKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OnJvb21zJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6cm9vbXMnIH0pKTtcblx0fVxuXG5cdGNoZWNrKGZpbHRlciwge1xuXHRcdG5hbWU6IE1hdGNoLk1heWJlKFN0cmluZyksIC8vIHJvb20gbmFtZSB0byBmaWx0ZXJcblx0XHRhZ2VudDogTWF0Y2guTWF5YmUoU3RyaW5nKSwgLy8gYWdlbnQgX2lkIHdobyBpcyBzZXJ2aW5nXG5cdFx0c3RhdHVzOiBNYXRjaC5NYXliZShTdHJpbmcpLCAvLyBlaXRoZXIgJ29wZW5lZCcgb3IgJ2Nsb3NlZCdcblx0XHRmcm9tOiBNYXRjaC5NYXliZShEYXRlKSxcblx0XHR0bzogTWF0Y2guTWF5YmUoRGF0ZSksXG5cdH0pO1xuXG5cdGNvbnN0IHF1ZXJ5ID0ge307XG5cdGlmIChmaWx0ZXIubmFtZSkge1xuXHRcdHF1ZXJ5LmxhYmVsID0gbmV3IFJlZ0V4cChmaWx0ZXIubmFtZSwgJ2knKTtcblx0fVxuXHRpZiAoZmlsdGVyLmFnZW50KSB7XG5cdFx0cXVlcnlbJ3NlcnZlZEJ5Ll9pZCddID0gZmlsdGVyLmFnZW50O1xuXHR9XG5cdGlmIChmaWx0ZXIuc3RhdHVzKSB7XG5cdFx0aWYgKGZpbHRlci5zdGF0dXMgPT09ICdvcGVuZWQnKSB7XG5cdFx0XHRxdWVyeS5vcGVuID0gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cXVlcnkub3BlbiA9IHsgJGV4aXN0czogZmFsc2UgfTtcblx0XHR9XG5cdH1cblx0aWYgKGZpbHRlci5mcm9tKSB7XG5cdFx0cXVlcnkudHMgPSB7XG5cdFx0XHQkZ3RlOiBmaWx0ZXIuZnJvbSxcblx0XHR9O1xuXHR9XG5cdGlmIChmaWx0ZXIudG8pIHtcblx0XHRmaWx0ZXIudG8uc2V0RGF0ZShmaWx0ZXIudG8uZ2V0RGF0ZSgpICsgMSk7XG5cdFx0ZmlsdGVyLnRvLnNldFNlY29uZHMoZmlsdGVyLnRvLmdldFNlY29uZHMoKSAtIDEpO1xuXG5cdFx0aWYgKCFxdWVyeS50cykge1xuXHRcdFx0cXVlcnkudHMgPSB7fTtcblx0XHR9XG5cdFx0cXVlcnkudHMuJGx0ZSA9IGZpbHRlci50bztcblx0fVxuXG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdGNvbnN0IGhhbmRsZSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRMaXZlY2hhdChxdWVyeSwgb2Zmc2V0LCBsaW1pdCkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdGFkZGVkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuYWRkZWQoJ2xpdmVjaGF0Um9vbScsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmNoYW5nZWQoJ2xpdmVjaGF0Um9vbScsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0c2VsZi5yZW1vdmVkKCdsaXZlY2hhdFJvb20nLCBpZCk7XG5cdFx0fSxcblx0fSk7XG5cblx0dGhpcy5yZWFkeSgpO1xuXG5cdHRoaXMub25TdG9wKCgpID0+IHtcblx0XHRoYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0OnF1ZXVlJywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OnF1ZXVlJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OnF1ZXVlJyB9KSk7XG5cdH1cblxuXHQvLyBsZXQgc29ydCA9IHsgY291bnQ6IDEsIHNvcnQ6IDEsIHVzZXJuYW1lOiAxIH07XG5cdC8vIGxldCBvbmxpbmVVc2VycyA9IHt9O1xuXG5cdC8vIGxldCBoYW5kbGVVc2VycyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmxpbmVBZ2VudHMoKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdC8vIFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHQvLyBcdFx0b25saW5lVXNlcnNbZmllbGRzLnVzZXJuYW1lXSA9IDE7XG5cdC8vIFx0XHQvLyB0aGlzLmFkZGVkKCdsaXZlY2hhdFF1ZXVlVXNlcicsIGlkLCBmaWVsZHMpO1xuXHQvLyBcdH0sXG5cdC8vIFx0Y2hhbmdlZChpZCwgZmllbGRzKSB7XG5cdC8vIFx0XHRvbmxpbmVVc2Vyc1tmaWVsZHMudXNlcm5hbWVdID0gMTtcblx0Ly8gXHRcdC8vIHRoaXMuY2hhbmdlZCgnbGl2ZWNoYXRRdWV1ZVVzZXInLCBpZCwgZmllbGRzKTtcblx0Ly8gXHR9LFxuXHQvLyBcdHJlbW92ZWQoaWQpIHtcblx0Ly8gXHRcdHRoaXMucmVtb3ZlZCgnbGl2ZWNoYXRRdWV1ZVVzZXInLCBpZCk7XG5cdC8vIFx0fVxuXHQvLyB9KTtcblxuXHRjb25zdCBzZWxmID0gdGhpcztcblxuXHRjb25zdCBoYW5kbGVEZXB0cyA9IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kVXNlcnNJblF1ZXVlKCkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdGFkZGVkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuYWRkZWQoJ2xpdmVjaGF0UXVldWVVc2VyJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuY2hhbmdlZCgnbGl2ZWNoYXRRdWV1ZVVzZXInLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdHJlbW92ZWQoaWQpIHtcblx0XHRcdHNlbGYucmVtb3ZlZCgnbGl2ZWNoYXRRdWV1ZVVzZXInLCBpZCk7XG5cdFx0fSxcblx0fSk7XG5cblx0dGhpcy5yZWFkeSgpO1xuXG5cdHRoaXMub25TdG9wKCgpID0+IHtcblx0XHQvLyBoYW5kbGVVc2Vycy5zdG9wKCk7XG5cdFx0aGFuZGxlRGVwdHMuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0OnRyaWdnZXJzJywgZnVuY3Rpb24oX2lkKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OnRyaWdnZXJzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp0cmlnZ2VycycgfSkpO1xuXHR9XG5cblx0aWYgKF9pZCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0VHJpZ2dlci5maW5kQnlJZChfaWQpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdFRyaWdnZXIuZmluZCgpO1xuXHR9XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDp2aXNpdG9ySGlzdG9yeScsIGZ1bmN0aW9uKHsgcmlkOiByb29tSWQgfSkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9ySGlzdG9yeScgfSkpO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9ySGlzdG9yeScgfSkpO1xuXHR9XG5cblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cblx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIHRoaXMudXNlcklkLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblx0aWYgKCFzdWJzY3JpcHRpb24pIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OnZpc2l0b3JIaXN0b3J5JyB9KSk7XG5cdH1cblxuXHRjb25zdCBzZWxmID0gdGhpcztcblxuXHRpZiAocm9vbSAmJiByb29tLnYgJiYgcm9vbS52Ll9pZCkge1xuXHRcdGNvbnN0IGhhbmRsZSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRCeVZpc2l0b3JJZChyb29tLnYuX2lkKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0XHRhZGRlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRcdHNlbGYuYWRkZWQoJ3Zpc2l0b3JfaGlzdG9yeScsIGlkLCBmaWVsZHMpO1xuXHRcdFx0fSxcblx0XHRcdGNoYW5nZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0XHRzZWxmLmNoYW5nZWQoJ3Zpc2l0b3JfaGlzdG9yeScsIGlkLCBmaWVsZHMpO1xuXHRcdFx0fSxcblx0XHRcdHJlbW92ZWQoaWQpIHtcblx0XHRcdFx0c2VsZi5yZW1vdmVkKCd2aXNpdG9yX2hpc3RvcnknLCBpZCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0c2VsZi5yZWFkeSgpO1xuXG5cdFx0c2VsZi5vblN0b3AoZnVuY3Rpb24oKSB7XG5cdFx0XHRoYW5kbGUuc3RvcCgpO1xuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdHNlbGYucmVhZHkoKTtcblx0fVxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDp2aXNpdG9ySW5mbycsIGZ1bmN0aW9uKHsgcmlkOiByb29tSWQgfSkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9ySW5mbycgfSkpO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9ySW5mbycgfSkpO1xuXHR9XG5cblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cblx0aWYgKHJvb20gJiYgcm9vbS52ICYmIHJvb20udi5faWQpIHtcblx0XHRyZXR1cm4gTGl2ZWNoYXRWaXNpdG9ycy5maW5kQnlJZChyb29tLnYuX2lkKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDp2aXNpdG9yUGFnZVZpc2l0ZWQnLCBmdW5jdGlvbih7IHJpZDogcm9vbUlkIH0pIHtcblxuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9yUGFnZVZpc2l0ZWQnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dmlzaXRvclBhZ2VWaXNpdGVkJyB9KSk7XG5cdH1cblxuXHRjb25zdCBzZWxmID0gdGhpcztcblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cblx0aWYgKHJvb20pIHtcblx0XHRjb25zdCBoYW5kbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kQnlSb29tSWRBbmRUeXBlKHJvb20uX2lkLCAnbGl2ZWNoYXRfbmF2aWdhdGlvbl9oaXN0b3J5Jykub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0XHRzZWxmLmFkZGVkKCd2aXNpdG9yX25hdmlnYXRpb25faGlzdG9yeScsIGlkLCBmaWVsZHMpO1xuXHRcdFx0fSxcblx0XHRcdGNoYW5nZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0XHRzZWxmLmNoYW5nZWQoJ3Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5JywgaWQsIGZpZWxkcyk7XG5cdFx0XHR9LFxuXHRcdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0XHRzZWxmLnJlbW92ZWQoJ3Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5JywgaWQpO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHNlbGYucmVhZHkoKTtcblxuXHRcdHNlbGYub25TdG9wKGZ1bmN0aW9uKCkge1xuXHRcdFx0aGFuZGxlLnN0b3AoKTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRzZWxmLnJlYWR5KCk7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0OmlucXVpcnknLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6aW5xdWlyeScgfSkpO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDppbnF1aXJ5JyB9KSk7XG5cdH1cblxuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRhZ2VudHM6IHRoaXMudXNlcklkLFxuXHRcdHN0YXR1czogJ29wZW4nLFxuXHR9O1xuXG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkuZmluZChxdWVyeSk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDpvZmZpY2VIb3VyJywgZnVuY3Rpb24oKSB7XG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6YWdlbnRzJyB9KSk7XG5cdH1cblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRPZmZpY2VIb3VyLmZpbmQoKTtcbn0pO1xuIiwiaW1wb3J0ICcuLi9pbXBvcnRzL3NlcnZlci9yZXN0L2RlcGFydG1lbnRzLmpzJztcbmltcG9ydCAnLi4vaW1wb3J0cy9zZXJ2ZXIvcmVzdC9mYWNlYm9vay5qcyc7XG5pbXBvcnQgJy4uL2ltcG9ydHMvc2VydmVyL3Jlc3Qvc21zLmpzJztcbmltcG9ydCAnLi4vaW1wb3J0cy9zZXJ2ZXIvcmVzdC91c2Vycy5qcyc7XG5pbXBvcnQgJy4uL2ltcG9ydHMvc2VydmVyL3Jlc3QvbWVzc2FnZXMuanMnO1xuaW1wb3J0ICcuLi9pbXBvcnRzL3NlcnZlci9yZXN0L3Zpc2l0b3JzLmpzJztcbmltcG9ydCAnLi4vaW1wb3J0cy9zZXJ2ZXIvcmVzdC91cGxvYWQuanMnO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0Y29uc3Qgcm9sZXMgPSBfLnBsdWNrKFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmZpbmQoKS5mZXRjaCgpLCAnbmFtZScpO1xuXHRpZiAocm9sZXMuaW5kZXhPZignbGl2ZWNoYXQtYWdlbnQnKSA9PT0gLTEpIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5jcmVhdGVPclVwZGF0ZSgnbGl2ZWNoYXQtYWdlbnQnKTtcblx0fVxuXHRpZiAocm9sZXMuaW5kZXhPZignbGl2ZWNoYXQtbWFuYWdlcicpID09PSAtMSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmNyZWF0ZU9yVXBkYXRlKCdsaXZlY2hhdC1tYW5hZ2VyJyk7XG5cdH1cblx0aWYgKHJvbGVzLmluZGV4T2YoJ2xpdmVjaGF0LWd1ZXN0JykgPT09IC0xKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuY3JlYXRlT3JVcGRhdGUoJ2xpdmVjaGF0LWd1ZXN0Jyk7XG5cdH1cblx0aWYgKFJvY2tldENoYXQubW9kZWxzICYmIFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ3ZpZXctbC1yb29tJywgWydsaXZlY2hhdC1hZ2VudCcsICdsaXZlY2hhdC1tYW5hZ2VyJywgJ2FkbWluJ10pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKCd2aWV3LWxpdmVjaGF0LW1hbmFnZXInLCBbJ2xpdmVjaGF0LW1hbmFnZXInLCAnYWRtaW4nXSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnLCBbJ2xpdmVjaGF0LW1hbmFnZXInLCAnYWRtaW4nXSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ2Nsb3NlLWxpdmVjaGF0LXJvb20nLCBbJ2xpdmVjaGF0LWFnZW50JywgJ2xpdmVjaGF0LW1hbmFnZXInLCAnYWRtaW4nXSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ2Nsb3NlLW90aGVycy1saXZlY2hhdC1yb29tJywgWydsaXZlY2hhdC1tYW5hZ2VyJywgJ2FkbWluJ10pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKCdzYXZlLW90aGVycy1saXZlY2hhdC1yb29tLWluZm8nLCBbJ2xpdmVjaGF0LW1hbmFnZXInXSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ3JlbW92ZS1jbG9zZWQtbGl2ZWNoYXQtcm9vbXMnLCBbJ2xpdmVjaGF0LW1hbmFnZXInLCAnYWRtaW4nXSk7XG5cdH1cbn0pO1xuIiwiUm9ja2V0Q2hhdC5NZXNzYWdlVHlwZXMucmVnaXN0ZXJUeXBlKHtcblx0aWQ6ICdsaXZlY2hhdF9uYXZpZ2F0aW9uX2hpc3RvcnknLFxuXHRzeXN0ZW06IHRydWUsXG5cdG1lc3NhZ2U6ICdOZXdfdmlzaXRvcl9uYXZpZ2F0aW9uJyxcblx0ZGF0YShtZXNzYWdlKSB7XG5cdFx0aWYgKCFtZXNzYWdlLm5hdmlnYXRpb24gfHwgIW1lc3NhZ2UubmF2aWdhdGlvbi5wYWdlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHRoaXN0b3J5OiBgJHsgKG1lc3NhZ2UubmF2aWdhdGlvbi5wYWdlLnRpdGxlID8gYCR7IG1lc3NhZ2UubmF2aWdhdGlvbi5wYWdlLnRpdGxlIH0gLSBgIDogJycpICsgbWVzc2FnZS5uYXZpZ2F0aW9uLnBhZ2UubG9jYXRpb24uaHJlZiB9YCxcblx0XHR9O1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuTWVzc2FnZVR5cGVzLnJlZ2lzdGVyVHlwZSh7XG5cdGlkOiAnbGl2ZWNoYXRfdmlkZW9fY2FsbCcsXG5cdHN5c3RlbTogdHJ1ZSxcblx0bWVzc2FnZTogJ05ld192aWRlb2NhbGxfcmVxdWVzdCcsXG59KTtcblxuUm9ja2V0Q2hhdC5hY3Rpb25MaW5rcy5yZWdpc3RlcignY3JlYXRlTGl2ZWNoYXRDYWxsJywgZnVuY3Rpb24obWVzc2FnZSwgcGFyYW1zLCBpbnN0YW5jZSkge1xuXHRpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG5cdFx0aW5zdGFuY2UudGFiQmFyLm9wZW4oJ3ZpZGVvJyk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LmFjdGlvbkxpbmtzLnJlZ2lzdGVyKCdkZW55TGl2ZWNoYXRDYWxsJywgZnVuY3Rpb24obWVzc2FnZS8qICwgcGFyYW1zKi8pIHtcblx0aWYgKE1ldGVvci5pc1NlcnZlcikge1xuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcignY29tbWFuZCcsIG1lc3NhZ2UucmlkLCAnZW5kQ2FsbCcsIHVzZXIpO1xuXHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlSb29tKG1lc3NhZ2UucmlkLCAnZGVsZXRlTWVzc2FnZScsIHsgX2lkOiBtZXNzYWdlLl9pZCB9KTtcblxuXHRcdGNvbnN0IGxhbmd1YWdlID0gdXNlci5sYW5ndWFnZSB8fCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnbGFuZ3VhZ2UnKSB8fCAnZW4nO1xuXG5cdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5jbG9zZVJvb20oe1xuXHRcdFx0dXNlcixcblx0XHRcdHJvb206IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKG1lc3NhZ2UucmlkKSxcblx0XHRcdGNvbW1lbnQ6IFRBUGkxOG4uX18oJ1ZpZGVvY2FsbF9kZWNsaW5lZCcsIHsgbG5nOiBsYW5ndWFnZSB9KSxcblx0XHR9KTtcblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuc2V0SGlkZGVuQnlJZChtZXNzYWdlLl9pZCk7XG5cdFx0fSk7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ0xpdmVjaGF0Jyk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2VuYWJsZWQnLCBmYWxzZSwgeyB0eXBlOiAnYm9vbGVhbicsIGdyb3VwOiAnTGl2ZWNoYXQnLCBwdWJsaWM6IHRydWUgfSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3RpdGxlJywgJ1JvY2tldC5DaGF0JywgeyB0eXBlOiAnc3RyaW5nJywgZ3JvdXA6ICdMaXZlY2hhdCcsIHB1YmxpYzogdHJ1ZSB9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3RpdGxlX2NvbG9yJywgJyNDMTI3MkQnLCB7XG5cdFx0dHlwZTogJ2NvbG9yJyxcblx0XHRlZGl0b3I6ICdjb2xvcicsXG5cdFx0YWxsb3dlZFR5cGVzOiBbJ2NvbG9yJywgJ2V4cHJlc3Npb24nXSxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybScsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdPZmZsaW5lJyxcblx0XHRpMThuTGFiZWw6ICdEaXNwbGF5X29mZmxpbmVfZm9ybScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF92YWxpZGF0ZV9vZmZsaW5lX2VtYWlsJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0c2VjdGlvbjogJ09mZmxpbmUnLFxuXHRcdGkxOG5MYWJlbDogJ1ZhbGlkYXRlX2VtYWlsX2FkZHJlc3MnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfb2ZmbGluZV9mb3JtX3VuYXZhaWxhYmxlJywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0c2VjdGlvbjogJ09mZmxpbmUnLFxuXHRcdGkxOG5MYWJlbDogJ09mZmxpbmVfZm9ybV91bmF2YWlsYWJsZV9tZXNzYWdlJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X29mZmxpbmVfdGl0bGUnLCAnTGVhdmUgYSBtZXNzYWdlJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZScsXG5cdFx0aTE4bkxhYmVsOiAnVGl0bGUnLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X29mZmxpbmVfdGl0bGVfY29sb3InLCAnIzY2NjY2NicsIHtcblx0XHR0eXBlOiAnY29sb3InLFxuXHRcdGVkaXRvcjogJ2NvbG9yJyxcblx0XHRhbGxvd2VkVHlwZXM6IFsnY29sb3InLCAnZXhwcmVzc2lvbiddLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZScsXG5cdFx0aTE4bkxhYmVsOiAnQ29sb3InLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X29mZmxpbmVfbWVzc2FnZScsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdPZmZsaW5lJyxcblx0XHRpMThuTGFiZWw6ICdJbnN0cnVjdGlvbnMnLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0luc3RydWN0aW9uc190b195b3VyX3Zpc2l0b3JfZmlsbF90aGVfZm9ybV90b19zZW5kX2FfbWVzc2FnZScsXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfb2ZmbGluZV9lbWFpbCcsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0aTE4bkxhYmVsOiAnRW1haWxfYWRkcmVzc190b19zZW5kX29mZmxpbmVfbWVzc2FnZXMnLFxuXHRcdHNlY3Rpb246ICdPZmZsaW5lJyxcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9vZmZsaW5lX3N1Y2Nlc3NfbWVzc2FnZScsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdPZmZsaW5lJyxcblx0XHRpMThuTGFiZWw6ICdPZmZsaW5lX3N1Y2Nlc3NfbWVzc2FnZScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9hbGxvd19zd2l0Y2hpbmdfZGVwYXJ0bWVudHMnLCB0cnVlLCB7IHR5cGU6ICdib29sZWFuJywgZ3JvdXA6ICdMaXZlY2hhdCcsIHB1YmxpYzogdHJ1ZSwgaTE4bkxhYmVsOiAnQWxsb3dfc3dpdGNoaW5nX2RlcGFydG1lbnRzJyB9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3Nob3dfYWdlbnRfZW1haWwnLCB0cnVlLCB7IHR5cGU6ICdib29sZWFuJywgZ3JvdXA6ICdMaXZlY2hhdCcsIHB1YmxpYzogdHJ1ZSwgaTE4bkxhYmVsOiAnU2hvd19hZ2VudF9lbWFpbCcgfSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2NvbnZlcnNhdGlvbl9maW5pc2hlZF9tZXNzYWdlJywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnQ29udmVyc2F0aW9uX2ZpbmlzaGVkX21lc3NhZ2UnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfcmVnaXN0cmF0aW9uX2Zvcm0nLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdTaG93X3ByZXJlZ2lzdHJhdGlvbl9mb3JtJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X25hbWVfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0nLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdTaG93X25hbWVfZmllbGQnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfZW1haWxfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0nLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdTaG93X2VtYWlsX2ZpZWxkJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2d1ZXN0X2NvdW50JywgMSwgeyB0eXBlOiAnaW50JywgZ3JvdXA6ICdMaXZlY2hhdCcgfSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X1Jvb21fQ291bnQnLCAxLCB7XG5cdFx0dHlwZTogJ2ludCcsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0aTE4bkxhYmVsOiAnTGl2ZWNoYXRfcm9vbV9jb3VudCcsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb24nLCAnbm9uZScsIHtcblx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHR2YWx1ZXM6IFtcblx0XHRcdHsga2V5OiAnbm9uZScsIGkxOG5MYWJlbDogJ05vbmUnIH0sXG5cdFx0XHR7IGtleTogJ2ZvcndhcmQnLCBpMThuTGFiZWw6ICdGb3J3YXJkJyB9LFxuXHRcdFx0eyBrZXk6ICdjbG9zZScsIGkxOG5MYWJlbDogJ0Nsb3NlJyB9LFxuXHRcdF0sXG5cdFx0aTE4bkxhYmVsOiAnSG93X3RvX2hhbmRsZV9vcGVuX3Nlc3Npb25zX3doZW5fYWdlbnRfZ29lc19vZmZsaW5lJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2FnZW50X2xlYXZlX2FjdGlvbl90aW1lb3V0JywgNjAsIHtcblx0XHR0eXBlOiAnaW50Jyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb24nLCB2YWx1ZTogeyAkbmU6ICdub25lJyB9IH0sXG5cdFx0aTE4bkxhYmVsOiAnSG93X2xvbmdfdG9fd2FpdF9hZnRlcl9hZ2VudF9nb2VzX29mZmxpbmUnLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ1RpbWVfaW5fc2Vjb25kcycsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9jb21tZW50JywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb24nLCB2YWx1ZTogJ2Nsb3NlJyB9LFxuXHRcdGkxOG5MYWJlbDogJ0NvbW1lbnRfdG9fbGVhdmVfb25fY2xvc2luZ19zZXNzaW9uJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3dlYmhvb2tVcmwnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ1dlYmhvb2tfVVJMJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3NlY3JldF90b2tlbicsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0NSTV9JbnRlZ3JhdGlvbicsXG5cdFx0aTE4bkxhYmVsOiAnU2VjcmV0X3Rva2VuJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fY2xvc2UnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdTZW5kX3JlcXVlc3Rfb25fY2hhdF9jbG9zZScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF93ZWJob29rX29uX29mZmxpbmVfbXNnJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0NSTV9JbnRlZ3JhdGlvbicsXG5cdFx0aTE4bkxhYmVsOiAnU2VuZF9yZXF1ZXN0X29uX29mZmxpbmVfbWVzc2FnZXMnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfd2ViaG9va19vbl92aXNpdG9yX21lc3NhZ2UnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdTZW5kX3JlcXVlc3Rfb25fdmlzaXRvcl9tZXNzYWdlJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZScsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ1NlbmRfcmVxdWVzdF9vbl9hZ2VudF9tZXNzYWdlJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ1NlbmRfdmlzaXRvcl9uYXZpZ2F0aW9uX2hpc3RvcnlfbGl2ZWNoYXRfd2ViaG9va19yZXF1ZXN0JywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0NSTV9JbnRlZ3JhdGlvbicsXG5cdFx0aTE4bkxhYmVsOiAnU2VuZF92aXNpdG9yX25hdmlnYXRpb25faGlzdG9yeV9vbl9yZXF1ZXN0Jyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdGZWF0dXJlX0RlcGVuZHNfb25fTGl2ZWNoYXRfVmlzaXRvcl9uYXZpZ2F0aW9uX2FzX2FfbWVzc2FnZV90b19iZV9lbmFibGVkJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9WaXNpdG9yX25hdmlnYXRpb25fYXNfYV9tZXNzYWdlJywgdmFsdWU6IHRydWUgfSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fY2FwdHVyZScsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ1NlbmRfcmVxdWVzdF9vbl9sZWFkX2NhcHR1cmUnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfbGVhZF9lbWFpbF9yZWdleCcsICdcXFxcYltBLVowLTkuXyUrLV0rQCg/OltBLVowLTktXStcXFxcLikrW0EtWl17Miw0fVxcXFxiJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ0xlYWRfY2FwdHVyZV9lbWFpbF9yZWdleCcsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9sZWFkX3Bob25lX3JlZ2V4JywgJygoPzpcXFxcKFswLTldezEsM31cXFxcKXxbMC05XXsyfSlbIFxcXFwtXSo/WzAtOV17NCw1fSg/OltcXFxcLVxcXFxzXFxcXF9dezEsMn0pP1swLTldezR9KD86KD89W14wLTldKXwkKXxbMC05XXs0LDV9KD86W1xcXFwtXFxcXHNcXFxcX117MSwyfSk/WzAtOV17NH0oPzooPz1bXjAtOV0pfCQpKScsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdMZWFkX2NhcHR1cmVfcGhvbmVfcmVnZXgnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfS25vd2xlZGdlX0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnS25vd2xlZGdlX0Jhc2UnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdFbmFibGVkJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0tub3dsZWRnZV9BcGlhaV9LZXknLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdLbm93bGVkZ2VfQmFzZScsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ0FwaWFpX0tleScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9Lbm93bGVkZ2VfQXBpYWlfTGFuZ3VhZ2UnLCAnZW4nLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0tub3dsZWRnZV9CYXNlJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnQXBpYWlfTGFuZ3VhZ2UnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfaGlzdG9yeV9tb25pdG9yX3R5cGUnLCAndXJsJywge1xuXHRcdHR5cGU6ICdzZWxlY3QnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdGkxOG5MYWJlbDogJ01vbml0b3JfaGlzdG9yeV9mb3JfY2hhbmdlc19vbicsXG5cdFx0dmFsdWVzOiBbXG5cdFx0XHR7IGtleTogJ3VybCcsIGkxOG5MYWJlbDogJ1BhZ2VfVVJMJyB9LFxuXHRcdFx0eyBrZXk6ICd0aXRsZScsIGkxOG5MYWJlbDogJ1BhZ2VfdGl0bGUnIH0sXG5cdFx0XSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X1Zpc2l0b3JfbmF2aWdhdGlvbl9hc19hX21lc3NhZ2UnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnU2VuZF9WaXNpdG9yX25hdmlnYXRpb25faGlzdG9yeV9hc19hX21lc3NhZ2UnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfZW5hYmxlX29mZmljZV9ob3VycycsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdPZmZpY2VfaG91cnNfZW5hYmxlZCcsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9jb250aW51b3VzX3NvdW5kX25vdGlmaWNhdGlvbl9uZXdfbGl2ZWNoYXRfcm9vbScsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdDb250aW51b3VzX3NvdW5kX25vdGlmaWNhdGlvbnNfZm9yX25ld19saXZlY2hhdF9yb29tJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3ZpZGVvY2FsbF9lbmFibGVkJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ1ZpZGVvY2FsbF9lbmFibGVkJyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdCZXRhX2ZlYXR1cmVfRGVwZW5kc19vbl9WaWRlb19Db25mZXJlbmNlX3RvX2JlX2VuYWJsZWQnLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0ppdHNpX0VuYWJsZWQnLCB2YWx1ZTogdHJ1ZSB9LFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfZmlsZXVwbG9hZF9lbmFibGVkJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnRmlsZVVwbG9hZF9FbmFibGVkJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdGaWxlVXBsb2FkX0VuYWJsZWQnLCB2YWx1ZTogdHJ1ZSB9LFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfZW5hYmxlX3RyYW5zY3JpcHQnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnVHJhbnNjcmlwdF9FbmFibGVkJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3RyYW5zY3JpcHRfbWVzc2FnZScsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ1RyYW5zY3JpcHRfbWVzc2FnZScsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfZW5hYmxlX3RyYW5zY3JpcHQnLCB2YWx1ZTogdHJ1ZSB9LFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfb3Blbl9pbnF1aWVyeV9zaG93X2Nvbm5lY3RpbmcnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnTGl2ZWNoYXRfb3Blbl9pbnF1aWVyeV9zaG93X2Nvbm5lY3RpbmcnLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJywgdmFsdWU6ICdHdWVzdF9Qb29sJyB9LFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfQWxsb3dlZERvbWFpbnNMaXN0JywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnTGl2ZWNoYXRfQWxsb3dlZERvbWFpbnNMaXN0Jyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdEb21haW5zX2FsbG93ZWRfdG9fZW1iZWRfdGhlX2xpdmVjaGF0X3dpZGdldCcsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9GYWNlYm9va19FbmFibGVkJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0ZhY2Vib29rJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdGYWNlYm9vaycsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnSWZfeW91X2RvbnRfaGF2ZV9vbmVfc2VuZF9hbl9lbWFpbF90b19vbW5pX3JvY2tldGNoYXRfdG9fZ2V0X3lvdXJzJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9TZWNyZXQnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdGYWNlYm9vaycsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnSWZfeW91X2RvbnRfaGF2ZV9vbmVfc2VuZF9hbl9lbWFpbF90b19vbW5pX3JvY2tldGNoYXRfdG9fZ2V0X3lvdXJzJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X1JEU3RhdGlvbl9Ub2tlbicsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiBmYWxzZSxcblx0XHRzZWN0aW9uOiAnUkQgU3RhdGlvbicsXG5cdFx0aTE4bkxhYmVsOiAnUkRTdGF0aW9uX1Rva2VuJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJywgJ0xlYXN0X0Ftb3VudCcsIHtcblx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0c2VjdGlvbjogJ1JvdXRpbmcnLFxuXHRcdHZhbHVlczogW1xuXHRcdFx0eyBrZXk6ICdFeHRlcm5hbCcsIGkxOG5MYWJlbDogJ0V4dGVybmFsX1NlcnZpY2UnIH0sXG5cdFx0XHR7IGtleTogJ0xlYXN0X0Ftb3VudCcsIGkxOG5MYWJlbDogJ0xlYXN0X0Ftb3VudCcgfSxcblx0XHRcdHsga2V5OiAnR3Vlc3RfUG9vbCcsIGkxOG5MYWJlbDogJ0d1ZXN0X1Bvb2wnIH0sXG5cdFx0XSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2d1ZXN0X3Bvb2xfd2l0aF9ub19hZ2VudHMnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnUm91dGluZycsXG5cdFx0aTE4bkxhYmVsOiAnQWNjZXB0X3dpdGhfbm9fb25saW5lX2FnZW50cycsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnQWNjZXB0X2luY29taW5nX2xpdmVjaGF0X3JlcXVlc3RzX2V2ZW5faWZfdGhlcmVfYXJlX25vX29ubGluZV9hZ2VudHMnLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJywgdmFsdWU6ICdHdWVzdF9Qb29sJyB9LFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfc2hvd19xdWV1ZV9saXN0X2xpbmsnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0c2VjdGlvbjogJ1JvdXRpbmcnLFxuXHRcdGkxOG5MYWJlbDogJ1Nob3dfcXVldWVfbGlzdF90b19hbGxfYWdlbnRzJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcsIHZhbHVlOiB7ICRuZTogJ0V4dGVybmFsJyB9IH0sXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9FeHRlcm5hbF9RdWV1ZV9VUkwnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogZmFsc2UsXG5cdFx0c2VjdGlvbjogJ1JvdXRpbmcnLFxuXHRcdGkxOG5MYWJlbDogJ0V4dGVybmFsX1F1ZXVlX1NlcnZpY2VfVVJMJyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdGb3JfbW9yZV9kZXRhaWxzX3BsZWFzZV9jaGVja19vdXJfZG9jcycsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfUm91dGluZ19NZXRob2QnLCB2YWx1ZTogJ0V4dGVybmFsJyB9LFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfRXh0ZXJuYWxfUXVldWVfVG9rZW4nLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogZmFsc2UsXG5cdFx0c2VjdGlvbjogJ1JvdXRpbmcnLFxuXHRcdGkxOG5MYWJlbDogJ1NlY3JldF90b2tlbicsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfUm91dGluZ19NZXRob2QnLCB2YWx1ZTogJ0V4dGVybmFsJyB9LFxuXHR9KTtcbn0pO1xuIiwiLyogZ2xvYmFscyBvcGVuUm9vbSwgTGl2ZWNoYXRJbnF1aXJ5ICovXG5pbXBvcnQgeyBSb29tU2V0dGluZ3NFbnVtLCBSb29tVHlwZUNvbmZpZywgUm9vbVR5cGVSb3V0ZUNvbmZpZywgVWlUZXh0Q29udGV4dCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbmNsYXNzIExpdmVjaGF0Um9vbVJvdXRlIGV4dGVuZHMgUm9vbVR5cGVSb3V0ZUNvbmZpZyB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKHtcblx0XHRcdG5hbWU6ICdsaXZlJyxcblx0XHRcdHBhdGg6ICcvbGl2ZS86aWQnLFxuXHRcdH0pO1xuXHR9XG5cblx0YWN0aW9uKHBhcmFtcykge1xuXHRcdG9wZW5Sb29tKCdsJywgcGFyYW1zLmlkKTtcblx0fVxuXG5cdGxpbmsoc3ViKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGlkOiBzdWIucmlkLFxuXHRcdH07XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGl2ZWNoYXRSb29tVHlwZSBleHRlbmRzIFJvb21UeXBlQ29uZmlnIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoe1xuXHRcdFx0aWRlbnRpZmllcjogJ2wnLFxuXHRcdFx0b3JkZXI6IDUsXG5cdFx0XHRpY29uOiAnbGl2ZWNoYXQnLFxuXHRcdFx0bGFiZWw6ICdMaXZlY2hhdCcsXG5cdFx0XHRyb3V0ZTogbmV3IExpdmVjaGF0Um9vbVJvdXRlKCksXG5cdFx0fSk7XG5cblx0XHR0aGlzLm5vdFN1YnNjcmliZWRUcGwgPSB7XG5cdFx0XHR0ZW1wbGF0ZTogJ2xpdmVjaGF0Tm90U3Vic2NyaWJlZCcsXG5cdFx0fTtcblx0fVxuXG5cdGZpbmRSb29tKGlkZW50aWZpZXIpIHtcblx0XHRyZXR1cm4gQ2hhdFJvb20uZmluZE9uZSh7IF9pZDogaWRlbnRpZmllciB9KTtcblx0fVxuXG5cdHJvb21OYW1lKHJvb21EYXRhKSB7XG5cdFx0cmV0dXJuIHJvb21EYXRhLm5hbWUgfHwgcm9vbURhdGEuZm5hbWUgfHwgcm9vbURhdGEubGFiZWw7XG5cdH1cblxuXHRjb25kaXRpb24oKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9lbmFibGVkJykgJiYgUm9ja2V0Q2hhdC5hdXRoei5oYXNBbGxQZXJtaXNzaW9uKCd2aWV3LWwtcm9vbScpO1xuXHR9XG5cblx0Y2FuU2VuZE1lc3NhZ2Uocm9vbUlkKSB7XG5cdFx0Y29uc3Qgcm9vbSA9IENoYXRSb29tLmZpbmRPbmUoeyBfaWQ6IHJvb21JZCB9LCB7IGZpZWxkczogeyBvcGVuOiAxIH0gfSk7XG5cdFx0cmV0dXJuIHJvb20gJiYgcm9vbS5vcGVuID09PSB0cnVlO1xuXHR9XG5cblx0Z2V0VXNlclN0YXR1cyhyb29tSWQpIHtcblx0XHRjb25zdCByb29tID0gU2Vzc2lvbi5nZXQoYHJvb21EYXRhJHsgcm9vbUlkIH1gKTtcblx0XHRpZiAocm9vbSkge1xuXHRcdFx0cmV0dXJuIHJvb20udiAmJiByb29tLnYuc3RhdHVzO1xuXHRcdH1cblxuXHRcdGNvbnN0IGlucXVpcnkgPSBMaXZlY2hhdElucXVpcnkuZmluZE9uZSh7IHJpZDogcm9vbUlkIH0pO1xuXHRcdHJldHVybiBpbnF1aXJ5ICYmIGlucXVpcnkudiAmJiBpbnF1aXJ5LnYuc3RhdHVzO1xuXHR9XG5cblx0YWxsb3dSb29tU2V0dGluZ0NoYW5nZShyb29tLCBzZXR0aW5nKSB7XG5cdFx0c3dpdGNoIChzZXR0aW5nKSB7XG5cdFx0XHRjYXNlIFJvb21TZXR0aW5nc0VudW0uSk9JTl9DT0RFOlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH1cblxuXHRnZXRVaVRleHQoY29udGV4dCkge1xuXHRcdHN3aXRjaCAoY29udGV4dCkge1xuXHRcdFx0Y2FzZSBVaVRleHRDb250ZXh0LkhJREVfV0FSTklORzpcblx0XHRcdFx0cmV0dXJuICdIaWRlX0xpdmVjaGF0X1dhcm5pbmcnO1xuXHRcdFx0Y2FzZSBVaVRleHRDb250ZXh0LkxFQVZFX1dBUk5JTkc6XG5cdFx0XHRcdHJldHVybiAnSGlkZV9MaXZlY2hhdF9XYXJuaW5nJztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiAnJztcblx0XHR9XG5cdH1cbn1cbiIsIlJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC9kZXBhcnRtZW50JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGRlcGFydG1lbnRzOiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQuZmluZCgpLmZldGNoKCksXG5cdFx0fSk7XG5cdH0sXG5cdHBvc3QoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdFx0ZGVwYXJ0bWVudDogT2JqZWN0LFxuXHRcdFx0XHRhZ2VudHM6IEFycmF5LFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IGRlcGFydG1lbnQgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LnNhdmVEZXBhcnRtZW50KG51bGwsIHRoaXMuYm9keVBhcmFtcy5kZXBhcnRtZW50LCB0aGlzLmJvZHlQYXJhbXMuYWdlbnRzKTtcblxuXHRcdFx0aWYgKGRlcGFydG1lbnQpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRcdGRlcGFydG1lbnQsXG5cdFx0XHRcdFx0YWdlbnRzOiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMuZmluZCh7IGRlcGFydG1lbnRJZDogZGVwYXJ0bWVudC5faWQgfSkuZmV0Y2goKSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlKTtcblx0XHR9XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L2RlcGFydG1lbnQvOl9pZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0X2lkOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRkZXBhcnRtZW50OiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQuZmluZE9uZUJ5SWQodGhpcy51cmxQYXJhbXMuX2lkKSxcblx0XHRcdFx0YWdlbnRzOiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMuZmluZCh7IGRlcGFydG1lbnRJZDogdGhpcy51cmxQYXJhbXMuX2lkIH0pLmZldGNoKCksXG5cdFx0XHR9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLmVycm9yKTtcblx0XHR9XG5cdH0sXG5cdHB1dCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMudXJsUGFyYW1zLCB7XG5cdFx0XHRcdF9pZDogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0XHRkZXBhcnRtZW50OiBPYmplY3QsXG5cdFx0XHRcdGFnZW50czogQXJyYXksXG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKFJvY2tldENoYXQuTGl2ZWNoYXQuc2F2ZURlcGFydG1lbnQodGhpcy51cmxQYXJhbXMuX2lkLCB0aGlzLmJvZHlQYXJhbXMuZGVwYXJ0bWVudCwgdGhpcy5ib2R5UGFyYW1zLmFnZW50cykpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRcdGRlcGFydG1lbnQ6IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5maW5kT25lQnlJZCh0aGlzLnVybFBhcmFtcy5faWQpLFxuXHRcdFx0XHRcdGFnZW50czogUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmZpbmQoeyBkZXBhcnRtZW50SWQ6IHRoaXMudXJsUGFyYW1zLl9pZCB9KS5mZXRjaCgpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLmVycm9yKTtcblx0XHR9XG5cdH0sXG5cdGRlbGV0ZSgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMudXJsUGFyYW1zLCB7XG5cdFx0XHRcdF9pZDogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChSb2NrZXRDaGF0LkxpdmVjaGF0LnJlbW92ZURlcGFydG1lbnQodGhpcy51cmxQYXJhbXMuX2lkKSkge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUuZXJyb3IpO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuXG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi8uLi8uLi9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG4vKipcbiAqIEBhcGkge3Bvc3R9IC9saXZlY2hhdC9mYWNlYm9vayBTZW5kIEZhY2Vib29rIG1lc3NhZ2VcbiAqIEBhcGlOYW1lIEZhY2Vib29rXG4gKiBAYXBpR3JvdXAgTGl2ZWNoYXRcbiAqXG4gKiBAYXBpUGFyYW0ge1N0cmluZ30gbWlkIEZhY2Vib29rIG1lc3NhZ2UgaWRcbiAqIEBhcGlQYXJhbSB7U3RyaW5nfSBwYWdlIEZhY2Vib29rIHBhZ2VzIGlkXG4gKiBAYXBpUGFyYW0ge1N0cmluZ30gdG9rZW4gRmFjZWJvb2sgdXNlcidzIHRva2VuXG4gKiBAYXBpUGFyYW0ge1N0cmluZ30gZmlyc3RfbmFtZSBGYWNlYm9vayB1c2VyJ3MgZmlyc3QgbmFtZVxuICogQGFwaVBhcmFtIHtTdHJpbmd9IGxhc3RfbmFtZSBGYWNlYm9vayB1c2VyJ3MgbGFzdCBuYW1lXG4gKiBAYXBpUGFyYW0ge1N0cmluZ30gW3RleHRdIEZhY2Vib29rIG1lc3NhZ2UgdGV4dFxuICogQGFwaVBhcmFtIHtTdHJpbmd9IFthdHRhY2htZW50c10gRmFjZWJvb2sgbWVzc2FnZSBhdHRhY2htZW50c1xuICovXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvZmFjZWJvb2snLCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudGV4dCAmJiAhdGhpcy5ib2R5UGFyYW1zLmF0dGFjaG1lbnRzKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKCF0aGlzLnJlcXVlc3QuaGVhZGVyc1sneC1odWItc2lnbmF0dXJlJ10pIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19FbmFibGVkJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcjogJ0ludGVncmF0aW9uIGRpc2FibGVkJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gdmFsaWRhdGUgaWYgcmVxdWVzdCBjb21lIGZyb20gb21uaVxuXHRcdGNvbnN0IHNpZ25hdHVyZSA9IGNyeXB0by5jcmVhdGVIbWFjKCdzaGExJywgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9TZWNyZXQnKSkudXBkYXRlKEpTT04uc3RyaW5naWZ5KHRoaXMucmVxdWVzdC5ib2R5KSkuZGlnZXN0KCdoZXgnKTtcblx0XHRpZiAodGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtaHViLXNpZ25hdHVyZSddICE9PSBgc2hhMT0keyBzaWduYXR1cmUgfWApIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcjogJ0ludmFsaWQgc2lnbmF0dXJlJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2VuZE1lc3NhZ2UgPSB7XG5cdFx0XHRtZXNzYWdlOiB7XG5cdFx0XHRcdF9pZDogdGhpcy5ib2R5UGFyYW1zLm1pZCxcblx0XHRcdH0sXG5cdFx0XHRyb29tSW5mbzoge1xuXHRcdFx0XHRmYWNlYm9vazoge1xuXHRcdFx0XHRcdHBhZ2U6IHRoaXMuYm9keVBhcmFtcy5wYWdlLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHR9O1xuXHRcdGxldCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0aGlzLmJvZHlQYXJhbXMudG9rZW4pO1xuXHRcdGlmICh2aXNpdG9yKSB7XG5cdFx0XHRjb25zdCByb29tcyA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlWaXNpdG9yVG9rZW4odmlzaXRvci50b2tlbikuZmV0Y2goKTtcblx0XHRcdGlmIChyb29tcyAmJiByb29tcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UucmlkID0gcm9vbXNbMF0uX2lkO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS5yaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdH1cblx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4gPSB2aXNpdG9yLnRva2VuO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLnJpZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS50b2tlbiA9IHRoaXMuYm9keVBhcmFtcy50b2tlbjtcblxuXHRcdFx0Y29uc3QgdXNlcklkID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZWdpc3Rlckd1ZXN0KHtcblx0XHRcdFx0dG9rZW46IHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4sXG5cdFx0XHRcdG5hbWU6IGAkeyB0aGlzLmJvZHlQYXJhbXMuZmlyc3RfbmFtZSB9ICR7IHRoaXMuYm9keVBhcmFtcy5sYXN0X25hbWUgfWAsXG5cdFx0XHR9KTtcblxuXHRcdFx0dmlzaXRvciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXJJZCk7XG5cdFx0fVxuXG5cdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS5tc2cgPSB0aGlzLmJvZHlQYXJhbXMudGV4dDtcblx0XHRzZW5kTWVzc2FnZS5ndWVzdCA9IHZpc2l0b3I7XG5cblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3VjZXNzOiB0cnVlLFxuXHRcdFx0XHRtZXNzYWdlOiBSb2NrZXRDaGF0LkxpdmVjaGF0LnNlbmRNZXNzYWdlKHNlbmRNZXNzYWdlKSxcblx0XHRcdH07XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5lcnJvcignRXJyb3IgdXNpbmcgRmFjZWJvb2sgLT4nLCBlKTtcblx0XHR9XG5cdH0sXG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uLy4uLy4uL3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC9tZXNzYWdlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudmlzaXRvcikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW0gXCJ2aXNpdG9yXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudmlzaXRvci50b2tlbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW0gXCJ2aXNpdG9yLnRva2VuXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZXMpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVzc2FnZXNcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblx0XHRpZiAoISh0aGlzLmJvZHlQYXJhbXMubWVzc2FnZXMgaW5zdGFuY2VvZiBBcnJheSkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVzc2FnZXNcIiBpcyBub3QgYW4gYXJyYXknKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVzc2FnZXNcIiBpcyBlbXB0eScpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZpc2l0b3JUb2tlbiA9IHRoaXMuYm9keVBhcmFtcy52aXNpdG9yLnRva2VuO1xuXG5cdFx0bGV0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHZpc2l0b3JUb2tlbik7XG5cdFx0bGV0IHJpZDtcblx0XHRpZiAodmlzaXRvcikge1xuXHRcdFx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHZpc2l0b3JUb2tlbikuZmV0Y2goKTtcblx0XHRcdGlmIChyb29tcyAmJiByb29tcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHJpZCA9IHJvb21zWzBdLl9pZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJpZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdGNvbnN0IHZpc2l0b3JJZCA9IFJvY2tldENoYXQuTGl2ZWNoYXQucmVnaXN0ZXJHdWVzdCh0aGlzLmJvZHlQYXJhbXMudmlzaXRvcik7XG5cdFx0XHR2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5maW5kT25lQnlJZCh2aXNpdG9ySWQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNlbnRNZXNzYWdlcyA9IHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlcy5tYXAoKG1lc3NhZ2UpID0+IHtcblx0XHRcdGNvbnN0IHNlbmRNZXNzYWdlID0ge1xuXHRcdFx0XHRndWVzdDogdmlzaXRvcixcblx0XHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdFx0cmlkLFxuXHRcdFx0XHRcdHRva2VuOiB2aXNpdG9yVG9rZW4sXG5cdFx0XHRcdFx0bXNnOiBtZXNzYWdlLm1zZyxcblx0XHRcdFx0fSxcblx0XHRcdH07XG5cdFx0XHRjb25zdCBzZW50TWVzc2FnZSA9IFJvY2tldENoYXQuTGl2ZWNoYXQuc2VuZE1lc3NhZ2Uoc2VuZE1lc3NhZ2UpO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dXNlcm5hbWU6IHNlbnRNZXNzYWdlLnUudXNlcm5hbWUsXG5cdFx0XHRcdG1zZzogc2VudE1lc3NhZ2UubXNnLFxuXHRcdFx0XHR0czogc2VudE1lc3NhZ2UudHMsXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXM6IHNlbnRNZXNzYWdlcyxcblx0XHR9KTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vLi4vLi4vc2VydmVyL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L3Ntcy1pbmNvbWluZy86c2VydmljZScsIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBTTVNTZXJ2aWNlID0gUm9ja2V0Q2hhdC5TTVMuZ2V0U2VydmljZSh0aGlzLnVybFBhcmFtcy5zZXJ2aWNlKTtcblxuXHRcdGNvbnN0IHNtcyA9IFNNU1NlcnZpY2UucGFyc2UodGhpcy5ib2R5UGFyYW1zKTtcblxuXHRcdGxldCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5maW5kT25lVmlzaXRvckJ5UGhvbmUoc21zLmZyb20pO1xuXG5cdFx0Y29uc3Qgc2VuZE1lc3NhZ2UgPSB7XG5cdFx0XHRtZXNzYWdlOiB7XG5cdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHR9LFxuXHRcdFx0cm9vbUluZm86IHtcblx0XHRcdFx0c21zOiB7XG5cdFx0XHRcdFx0ZnJvbTogc21zLnRvLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0aWYgKHZpc2l0b3IpIHtcblx0XHRcdGNvbnN0IHJvb21zID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeVZpc2l0b3JUb2tlbih2aXNpdG9yLnRva2VuKS5mZXRjaCgpO1xuXG5cdFx0XHRpZiAocm9vbXMgJiYgcm9vbXMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLnJpZCA9IHJvb21zWzBdLl9pZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UucmlkID0gUmFuZG9tLmlkKCk7XG5cdFx0XHR9XG5cdFx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuID0gdmlzaXRvci50b2tlbjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS5yaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4gPSBSYW5kb20uaWQoKTtcblxuXHRcdFx0Y29uc3QgdmlzaXRvcklkID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZWdpc3Rlckd1ZXN0KHtcblx0XHRcdFx0dXNlcm5hbWU6IHNtcy5mcm9tLnJlcGxhY2UoL1teMC05XS9nLCAnJyksXG5cdFx0XHRcdHRva2VuOiBzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuLFxuXHRcdFx0XHRwaG9uZToge1xuXHRcdFx0XHRcdG51bWJlcjogc21zLmZyb20sXG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblxuXHRcdFx0dmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZmluZE9uZUJ5SWQodmlzaXRvcklkKTtcblx0XHR9XG5cblx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLm1zZyA9IHNtcy5ib2R5O1xuXHRcdHNlbmRNZXNzYWdlLmd1ZXN0ID0gdmlzaXRvcjtcblxuXHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UuYXR0YWNobWVudHMgPSBzbXMubWVkaWEubWFwKChjdXJyKSA9PiB7XG5cdFx0XHRjb25zdCBhdHRhY2htZW50ID0ge1xuXHRcdFx0XHRtZXNzYWdlX2xpbms6IGN1cnIudXJsLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgeyBjb250ZW50VHlwZSB9ID0gY3Vycjtcblx0XHRcdHN3aXRjaCAoY29udGVudFR5cGUuc3Vic3RyKDAsIGNvbnRlbnRUeXBlLmluZGV4T2YoJy8nKSkpIHtcblx0XHRcdFx0Y2FzZSAnaW1hZ2UnOlxuXHRcdFx0XHRcdGF0dGFjaG1lbnQuaW1hZ2VfdXJsID0gY3Vyci51cmw7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3ZpZGVvJzpcblx0XHRcdFx0XHRhdHRhY2htZW50LnZpZGVvX3VybCA9IGN1cnIudXJsO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdhdWRpbyc6XG5cdFx0XHRcdFx0YXR0YWNobWVudC5hdWRpb191cmwgPSBjdXJyLnVybDtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGF0dGFjaG1lbnQ7XG5cdFx0fSk7XG5cblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgbWVzc2FnZSA9IFNNU1NlcnZpY2UucmVzcG9uc2UuY2FsbCh0aGlzLCBSb2NrZXRDaGF0LkxpdmVjaGF0LnNlbmRNZXNzYWdlKHNlbmRNZXNzYWdlKSk7XG5cblx0XHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRcdGlmIChzbXMuZXh0cmEpIHtcblx0XHRcdFx0XHRpZiAoc21zLmV4dHJhLmZyb21Db3VudHJ5KSB7XG5cdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnbGl2ZWNoYXQ6c2V0Q3VzdG9tRmllbGQnLCBzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuLCAnY291bnRyeScsIHNtcy5leHRyYS5mcm9tQ291bnRyeSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChzbXMuZXh0cmEuZnJvbVN0YXRlKSB7XG5cdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnbGl2ZWNoYXQ6c2V0Q3VzdG9tRmllbGQnLCBzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuLCAnc3RhdGUnLCBzbXMuZXh0cmEuZnJvbVN0YXRlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHNtcy5leHRyYS5mcm9tQ2l0eSkge1xuXHRcdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ2xpdmVjaGF0OnNldEN1c3RvbUZpZWxkJywgc2VuZE1lc3NhZ2UubWVzc2FnZS50b2tlbiwgJ2NpdHknLCBzbXMuZXh0cmEuZnJvbUNpdHkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBtZXNzYWdlO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBTTVNTZXJ2aWNlLmVycm9yLmNhbGwodGhpcywgZSk7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgQnVzYm95IGZyb20gJ2J1c2JveSc7XG5pbXBvcnQgZmlsZXNpemUgZnJvbSAnZmlsZXNpemUnO1xuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vLi4vLi4vc2VydmVyL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcbmxldCBtYXhGaWxlU2l6ZTtcblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX01heEZpbGVTaXplJywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHR0cnkge1xuXHRcdG1heEZpbGVTaXplID0gcGFyc2VJbnQodmFsdWUpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0bWF4RmlsZVNpemUgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lQnlJZCgnRmlsZVVwbG9hZF9NYXhGaWxlU2l6ZScpLnBhY2thZ2VWYWx1ZTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC91cGxvYWQvOnJpZCcsIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LXZpc2l0b3ItdG9rZW4nXSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZpc2l0b3JUb2tlbiA9IHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LXZpc2l0b3ItdG9rZW4nXTtcblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih2aXNpdG9yVG9rZW4pO1xuXG5cdFx0aWYgKCF2aXNpdG9yKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVPcGVuQnlWaXNpdG9yVG9rZW4odmlzaXRvclRva2VuLCB0aGlzLnVybFBhcmFtcy5yaWQpO1xuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGJ1c2JveSA9IG5ldyBCdXNib3koeyBoZWFkZXJzOiB0aGlzLnJlcXVlc3QuaGVhZGVycyB9KTtcblx0XHRjb25zdCBmaWxlcyA9IFtdO1xuXHRcdGNvbnN0IGZpZWxkcyA9IHt9O1xuXG5cdFx0TWV0ZW9yLndyYXBBc3luYygoY2FsbGJhY2spID0+IHtcblx0XHRcdGJ1c2JveS5vbignZmlsZScsIChmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUpID0+IHtcblx0XHRcdFx0aWYgKGZpZWxkbmFtZSAhPT0gJ2ZpbGUnKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZpbGVzLnB1c2gobmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1maWVsZCcpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGZpbGVEYXRlID0gW107XG5cdFx0XHRcdGZpbGUub24oJ2RhdGEnLCAoZGF0YSkgPT4gZmlsZURhdGUucHVzaChkYXRhKSk7XG5cblx0XHRcdFx0ZmlsZS5vbignZW5kJywgKCkgPT4ge1xuXHRcdFx0XHRcdGZpbGVzLnB1c2goeyBmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUsIGZpbGVCdWZmZXI6IEJ1ZmZlci5jb25jYXQoZmlsZURhdGUpIH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHRidXNib3kub24oJ2ZpZWxkJywgKGZpZWxkbmFtZSwgdmFsdWUpID0+IGZpZWxkc1tmaWVsZG5hbWVdID0gdmFsdWUpO1xuXG5cdFx0XHRidXNib3kub24oJ2ZpbmlzaCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4gY2FsbGJhY2soKSkpO1xuXG5cdFx0XHR0aGlzLnJlcXVlc3QucGlwZShidXNib3kpO1xuXHRcdH0pKCk7XG5cblx0XHRpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnRmlsZSByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGlmIChmaWxlcy5sZW5ndGggPiAxKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSnVzdCAxIGZpbGUgaXMgYWxsb3dlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbGUgPSBmaWxlc1swXTtcblxuXHRcdGlmICghUm9ja2V0Q2hhdC5maWxlVXBsb2FkSXNWYWxpZENvbnRlbnRUeXBlKGZpbGUubWltZXR5cGUpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSh7XG5cdFx0XHRcdHJlYXNvbjogJ2Vycm9yLXR5cGUtbm90LWFsbG93ZWQnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gLTEgbWF4RmlsZVNpemUgbWVhbnMgdGhlcmUgaXMgbm8gbGltaXRcblx0XHRpZiAobWF4RmlsZVNpemUgPiAtMSAmJiBmaWxlLmZpbGVCdWZmZXIubGVuZ3RoID4gbWF4RmlsZVNpemUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKHtcblx0XHRcdFx0cmVhc29uOiAnZXJyb3Itc2l6ZS1ub3QtYWxsb3dlZCcsXG5cdFx0XHRcdHNpemVBbGxvd2VkOiBmaWxlc2l6ZShtYXhGaWxlU2l6ZSksXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBmaWxlU3RvcmUgPSBGaWxlVXBsb2FkLmdldFN0b3JlKCdVcGxvYWRzJyk7XG5cblx0XHRjb25zdCBkZXRhaWxzID0ge1xuXHRcdFx0bmFtZTogZmlsZS5maWxlbmFtZSxcblx0XHRcdHNpemU6IGZpbGUuZmlsZUJ1ZmZlci5sZW5ndGgsXG5cdFx0XHR0eXBlOiBmaWxlLm1pbWV0eXBlLFxuXHRcdFx0cmlkOiB0aGlzLnVybFBhcmFtcy5yaWQsXG5cdFx0XHR2aXNpdG9yVG9rZW4sXG5cdFx0fTtcblxuXHRcdGNvbnN0IHVwbG9hZGVkRmlsZSA9IE1ldGVvci53cmFwQXN5bmMoZmlsZVN0b3JlLmluc2VydC5iaW5kKGZpbGVTdG9yZSkpKGRldGFpbHMsIGZpbGUuZmlsZUJ1ZmZlcik7XG5cblx0XHR1cGxvYWRlZEZpbGUuZGVzY3JpcHRpb24gPSBmaWVsZHMuZGVzY3JpcHRpb247XG5cblx0XHRkZWxldGUgZmllbGRzLmRlc2NyaXB0aW9uO1xuXHRcdFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoTWV0ZW9yLmNhbGwoJ3NlbmRGaWxlTGl2ZWNoYXRNZXNzYWdlJywgdGhpcy51cmxQYXJhbXMucmlkLCB2aXNpdG9yVG9rZW4sIHVwbG9hZGVkRmlsZSwgZmllbGRzKSk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvdXNlcnMvOnR5cGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMudXJsUGFyYW1zLCB7XG5cdFx0XHRcdHR5cGU6IFN0cmluZyxcblx0XHRcdH0pO1xuXG5cdFx0XHRsZXQgcm9sZTtcblx0XHRcdGlmICh0aGlzLnVybFBhcmFtcy50eXBlID09PSAnYWdlbnQnKSB7XG5cdFx0XHRcdHJvbGUgPSAnbGl2ZWNoYXQtYWdlbnQnO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLnVybFBhcmFtcy50eXBlID09PSAnbWFuYWdlcicpIHtcblx0XHRcdFx0cm9sZSA9ICdsaXZlY2hhdC1tYW5hZ2VyJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93ICdJbnZhbGlkIHR5cGUnO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCB1c2VycyA9IFJvY2tldENoYXQuYXV0aHouZ2V0VXNlcnNJblJvbGUocm9sZSk7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0dXNlcnM6IHVzZXJzLmZldGNoKCkubWFwKCh1c2VyKSA9PiBfLnBpY2sodXNlciwgJ19pZCcsICd1c2VybmFtZScsICduYW1lJywgJ3N0YXR1cycsICdzdGF0dXNMaXZlY2hhdCcpKSxcblx0XHRcdH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUuZXJyb3IpO1xuXHRcdH1cblx0fSxcblx0cG9zdCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnVybFBhcmFtcywge1xuXHRcdFx0XHR0eXBlOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRcdHVzZXJuYW1lOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdhZ2VudCcpIHtcblx0XHRcdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQuTGl2ZWNoYXQuYWRkQWdlbnQodGhpcy5ib2R5UGFyYW1zLnVzZXJuYW1lKTtcblx0XHRcdFx0aWYgKHVzZXIpIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHVzZXIgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAodGhpcy51cmxQYXJhbXMudHlwZSA9PT0gJ21hbmFnZXInKSB7XG5cdFx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmFkZE1hbmFnZXIodGhpcy5ib2R5UGFyYW1zLnVzZXJuYW1lKTtcblx0XHRcdFx0aWYgKHVzZXIpIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHVzZXIgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93ICdJbnZhbGlkIHR5cGUnO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUuZXJyb3IpO1xuXHRcdH1cblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvdXNlcnMvOnR5cGUvOl9pZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0dHlwZTogU3RyaW5nLFxuXHRcdFx0XHRfaWQ6IFN0cmluZyxcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodGhpcy51cmxQYXJhbXMuX2lkKTtcblxuXHRcdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdVc2VyIG5vdCBmb3VuZCcpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgcm9sZTtcblxuXHRcdFx0aWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdhZ2VudCcpIHtcblx0XHRcdFx0cm9sZSA9ICdsaXZlY2hhdC1hZ2VudCc7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdtYW5hZ2VyJykge1xuXHRcdFx0XHRyb2xlID0gJ2xpdmVjaGF0LW1hbmFnZXInO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgJ0ludmFsaWQgdHlwZSc7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh1c2VyLnJvbGVzLmluZGV4T2Yocm9sZSkgIT09IC0xKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHR1c2VyOiBfLnBpY2sodXNlciwgJ19pZCcsICd1c2VybmFtZScpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHR1c2VyOiBudWxsLFxuXHRcdFx0fSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxuXHRkZWxldGUoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnVybFBhcmFtcywge1xuXHRcdFx0XHR0eXBlOiBTdHJpbmcsXG5cdFx0XHRcdF9pZDogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVybFBhcmFtcy5faWQpO1xuXG5cdFx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdhZ2VudCcpIHtcblx0XHRcdFx0aWYgKFJvY2tldENoYXQuTGl2ZWNoYXQucmVtb3ZlQWdlbnQodXNlci51c2VybmFtZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdtYW5hZ2VyJykge1xuXHRcdFx0XHRpZiAoUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZW1vdmVNYW5hZ2VyKHVzZXIudXNlcm5hbWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgJ0ludmFsaWQgdHlwZSc7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi8uLi8uLi9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvdmlzaXRvci86dmlzaXRvclRva2VuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRoaXMudXJsUGFyYW1zLnZpc2l0b3JUb2tlbik7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3ModmlzaXRvcik7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L3Zpc2l0b3IvOnZpc2l0b3JUb2tlbi9yb29tJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb21zID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeVZpc2l0b3JUb2tlbih0aGlzLnVybFBhcmFtcy52aXNpdG9yVG9rZW4sIHtcblx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHRuYW1lOiAxLFxuXHRcdFx0XHR0OiAxLFxuXHRcdFx0XHRjbDogMSxcblx0XHRcdFx0dTogMSxcblx0XHRcdFx0dXNlcm5hbWVzOiAxLFxuXHRcdFx0XHRzZXJ2ZWRCeTogMSxcblx0XHRcdH0sXG5cdFx0fSkuZmV0Y2goKTtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHJvb21zIH0pO1xuXHR9LFxufSk7XG4iXX0=
