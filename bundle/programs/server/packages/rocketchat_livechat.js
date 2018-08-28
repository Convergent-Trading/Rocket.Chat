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
WebApp = Package.webapp.WebApp;
const Autoupdate = Package.autoupdate.Autoupdate;
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
  RocketChat.roomTypes.setRoomFind('l', _id => {
    return RocketChat.models.Rooms.findLivechatById(_id);
  });
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
          'Authorization': `Bearer ${apiaiKey}`
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
    const visitor = LivechatVisitors.getVisitorByToken(token); // allow to only user to send transcripts from their own chats

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
  'livechat:getInitialData'(visitorToken) {
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
    const room = RocketChat.models.Rooms.findOpenByVisitorToken(visitorToken, {
      fields: {
        name: 1,
        t: 1,
        cl: 1,
        u: 1,
        usernames: 1,
        v: 1,
        servedBy: 1
      }
    }).fetch();

    if (room && room.length > 0) {
      info.room = room[0];
    }

    const visitor = LivechatVisitors.getVisitorByToken(visitorToken, {
      fields: {
        name: 1,
        username: 1,
        visitorEmails: 1
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
    department
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
        visitorEmails: 1
      }
    }); //If it's updating an existing visitor, it must also update the roomInfo

    const cursor = RocketChat.models.Rooms.findOpenByVisitorToken(token);
    cursor.forEach(room => {
      RocketChat.Livechat.saveRoomInfo(room, visitor);
    });
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
    const valid = settings.every(setting => {
      return validSettings.indexOf(setting._id) !== -1;
    });

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

    if (typeof values['Livechat_webhookUrl'] !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhookUrl', s.trim(values['Livechat_webhookUrl']));
    }

    if (typeof values['Livechat_secret_token'] !== 'undefined') {
      RocketChat.settings.updateById('Livechat_secret_token', s.trim(values['Livechat_secret_token']));
    }

    if (typeof values['Livechat_webhook_on_close'] !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_close', !!values['Livechat_webhook_on_close']);
    }

    if (typeof values['Livechat_webhook_on_offline_msg'] !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_offline_msg', !!values['Livechat_webhook_on_offline_msg']);
    }

    if (typeof values['Livechat_webhook_on_visitor_message'] !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_visitor_message', !!values['Livechat_webhook_on_visitor_message']);
    }

    if (typeof values['Livechat_webhook_on_agent_message'] !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_agent_message', !!values['Livechat_webhook_on_agent_message']);
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

},"setDepartmentForVisitor.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/setDepartmentForVisitor.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:setDepartmentForVisitor'({
    token,
    department
  } = {}) {
    RocketChat.Livechat.setDepartmentForGuest.call(this, {
      token,
      department
    }); // update visited page history to not expire

    RocketChat.models.Messages.keepHistoryForToken(token);
    return true;
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
        'ts': 1
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
    '_id': userId
  };
  const update = {
    $set: {
      'statusLivechat': status
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
  return this.findOne(query, options);
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
  return this.findOne(query, options);
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
      'agentId': userId
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
      'token': 1
    });
    this.tryEnsureIndex({
      'ts': 1
    }); // keep history for 1 month if the visitor does not register

    this.tryEnsureIndex({
      'expireAt': 1
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
      'rid': 1
    }); // room id corresponding to this inquiry

    this.tryEnsureIndex({
      'name': 1
    }); // name of the inquiry (client name for now)

    this.tryEnsureIndex({
      'message': 1
    }); // message sent by the client

    this.tryEnsureIndex({
      'ts': 1
    }); // timestamp

    this.tryEnsureIndex({
      'agents': 1
    }); // Id's of the agents who can see the inquiry (handle departments)

    this.tryEnsureIndex({
      'status': 1
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
      '_id': inquiryId
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
      '_id': inquiryId
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
      '_id': inquiryId
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
      '_id': inquiryId
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
      'day': 1
    }); // the day of the week monday - sunday

    this.tryEnsureIndex({
      'start': 1
    }); // the opening hours of the office

    this.tryEnsureIndex({
      'finish': 1
    }); // the closing hours of the office

    this.tryEnsureIndex({
      'open': 1
    }); // whether or not the offices are open on this day
    // if there is nothing in the collection, add defaults

    if (this.find().count() === 0) {
      this.insert({
        'day': 'Monday',
        'start': '08:00',
        'finish': '20:00',
        'code': 1,
        'open': true
      });
      this.insert({
        'day': 'Tuesday',
        'start': '08:00',
        'finish': '20:00',
        'code': 2,
        'open': true
      });
      this.insert({
        'day': 'Wednesday',
        'start': '08:00',
        'finish': '20:00',
        'code': 3,
        'open': true
      });
      this.insert({
        'day': 'Thursday',
        'start': '08:00',
        'finish': '20:00',
        'code': 4,
        'open': true
      });
      this.insert({
        'day': 'Friday',
        'start': '08:00',
        'finish': '20:00',
        'code': 5,
        'open': true
      });
      this.insert({
        'day': 'Saturday',
        'start': '08:00',
        'finish': '20:00',
        'code': 6,
        'open': false
      });
      this.insert({
        'day': 'Sunday',
        'start': '08:00',
        'finish': '20:00',
        'code': 0,
        'open': false
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
    const saveEmail = [].concat(emails).filter(email => email && email.trim()).map(email => {
      return {
        address: email
      };
    });

    if (saveEmail.length > 0) {
      update.$addToSet.visitorEmails = {
        $each: saveEmail
      };
    }

    const savePhone = [].concat(phones).filter(phone => phone && phone.trim().replace(/[^\d]/g, '')).map(phone => {
      return {
        phoneNumber: phone
      };
    });

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
              'Accept': 'application/json',
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
          username,
          department
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
      return Meteor.users.update(user._id, updateUser);
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

    const servedBy = room.servedBy;

    if (agent && agent.agentId !== servedBy._id) {
      RocketChat.models.Rooms.changeAgentByRoomId(room._id, agent);
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

    const agentIds = []; //get the agents of the department

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
    } //delete agent and room subscription


    RocketChat.models.Subscriptions.removeByRoomId(rid); // remove user from room

    RocketChat.models.Rooms.removeUsernameById(rid, user.username); // find inquiry corresponding to room

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
      RocketChat.Livechat.stream.emit(room._id, {
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

  if (room.t === 'l' && extraData && extraData.token && room.v.token === extraData.token) {
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
      msgs: 1,
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
      msgs: 1,
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
        'authorization': `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`,
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
        'authorization': `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`,
        'content-type': 'application/json'
      }
    });
    return result.data;
  },

  listPages() {
    const result = HTTP.call('GET', `${gatewayURL}/facebook/pages`, {
      headers: {
        'authorization': `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      }
    });
    return result.data;
  },

  subscribe(pageId) {
    const result = HTTP.call('POST', `${gatewayURL}/facebook/page/${pageId}/subscribe`, {
      headers: {
        'authorization': `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      }
    });
    return result.data;
  },

  unsubscribe(pageId) {
    const result = HTTP.call('DELETE', `${gatewayURL}/facebook/page/${pageId}/subscribe`, {
      headers: {
        'authorization': `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
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
        'authorization': `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
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
/*, statusConnection*/
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
/*, params*/
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
      const contentType = curr.contentType;

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9saXZlY2hhdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvc3RhcnR1cC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvdmlzaXRvclN0YXR1cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcm9vbVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2hvb2tzL2V4dGVybmFsTWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvaG9va3MvbGVhZENhcHR1cmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2hvb2tzL21hcmtSb29tUmVzcG9uZGVkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9ob29rcy9vZmZsaW5lTWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvaG9va3MvUkRTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9ob29rcy9zZW5kVG9DUk0uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2hvb2tzL3NlbmRUb0ZhY2Vib29rLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2FkZEFnZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2FkZE1hbmFnZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvY2hhbmdlTGl2ZWNoYXRTdGF0dXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvY2xvc2VCeVZpc2l0b3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvY2xvc2VSb29tLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2ZhY2Vib29rLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2dldEN1c3RvbUZpZWxkcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9nZXRBZ2VudERhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvZ2V0SW5pdGlhbERhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvZ2V0TmV4dEFnZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2xvYWRIaXN0b3J5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2xvZ2luQnlUb2tlbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9wYWdlVmlzaXRlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9yZWdpc3Rlckd1ZXN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZUFnZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZUN1c3RvbUZpZWxkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZURlcGFydG1lbnQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvcmVtb3ZlTWFuYWdlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9yZW1vdmVUcmlnZ2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZVJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZUFwcGVhcmFuY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZUN1c3RvbUZpZWxkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NhdmVEZXBhcnRtZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NhdmVJbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NhdmVJbnRlZ3JhdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9zYXZlU3VydmV5RmVlZGJhY2suanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZVRyaWdnZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2VhcmNoQWdlbnQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2VuZE1lc3NhZ2VMaXZlY2hhdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9zZW5kRmlsZUxpdmVjaGF0TWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9zZW5kT2ZmbGluZU1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2V0Q3VzdG9tRmllbGQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2V0RGVwYXJ0bWVudEZvclZpc2l0b3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc3RhcnRWaWRlb0NhbGwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc3RhcnRGaWxlVXBsb2FkUm9vbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy90cmFuc2Zlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy93ZWJob29rVGVzdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy90YWtlSW5xdWlyeS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9yZXR1cm5Bc0lucXVpcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZU9mZmljZUhvdXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NlbmRUcmFuc2NyaXB0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvVXNlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9Sb29tcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL01lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdEN1c3RvbUZpZWxkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXREZXBhcnRtZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRQYWdlVmlzaXRlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VHJpZ2dlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL2luZGV4ZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdElucXVpcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdE9mZmljZUhvdXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9saWIvTGl2ZWNoYXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2xpYi9RdWV1ZU1ldGhvZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2xpYi9PZmZpY2VDbG9jay5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbGliL09tbmlDaGFubmVsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9zZW5kTWVzc2FnZUJ5U01TLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci91bmNsb3NlZExpdmVjaGF0cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2N1c3RvbUZpZWxkcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2RlcGFydG1lbnRBZ2VudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9leHRlcm5hbE1lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRBZ2VudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdEFwcGVhcmFuY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdERlcGFydG1lbnRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRJbnRlZ3JhdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2xpdmVjaGF0TWFuYWdlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdFJvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRRdWV1ZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2xpdmVjaGF0VHJpZ2dlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy92aXNpdG9ySGlzdG9yeS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL3Zpc2l0b3JJbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvdmlzaXRvclBhZ2VWaXNpdGVkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRJbnF1aXJpZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdE9mZmljZUhvdXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9hcGkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvcGVybWlzc2lvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvbWVzc2FnZVR5cGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L2NvbmZpZy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9pbXBvcnRzL0xpdmVjaGF0Um9vbVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC9kZXBhcnRtZW50cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9pbXBvcnRzL3NlcnZlci9yZXN0L2ZhY2Vib29rLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L2ltcG9ydHMvc2VydmVyL3Jlc3QvbWVzc2FnZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC9zbXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC91cGxvYWQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC91c2Vycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9pbXBvcnRzL3NlcnZlci9yZXN0L3Zpc2l0b3JzLmpzIl0sIm5hbWVzIjpbIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsInVybCIsIldlYkFwcCIsIlBhY2thZ2UiLCJ3ZWJhcHAiLCJBdXRvdXBkYXRlIiwiYXV0b3VwZGF0ZSIsImNvbm5lY3RIYW5kbGVycyIsInVzZSIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsInJlcSIsInJlcyIsIm5leHQiLCJyZXFVcmwiLCJwYXJzZSIsInBhdGhuYW1lIiwic2V0SGVhZGVyIiwiZG9tYWluV2hpdGVMaXN0IiwiUm9ja2V0Q2hhdCIsInNldHRpbmdzIiwiZ2V0IiwiaGVhZGVycyIsInJlZmVyZXIiLCJpc0VtcHR5IiwidHJpbSIsIm1hcCIsInNwbGl0IiwiZG9tYWluIiwiY29udGFpbnMiLCJob3N0IiwicHJvdG9jb2wiLCJoZWFkIiwiQXNzZXRzIiwiZ2V0VGV4dCIsImJhc2VVcmwiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJ0ZXN0IiwiaHRtbCIsImF1dG91cGRhdGVWZXJzaW9uIiwiSlNPTiIsInN0cmluZ2lmeSIsIndyaXRlIiwiZW5kIiwic3RhcnR1cCIsInJvb21UeXBlcyIsInNldFJvb21GaW5kIiwiX2lkIiwibW9kZWxzIiwiUm9vbXMiLCJmaW5kTGl2ZWNoYXRCeUlkIiwiYXV0aHoiLCJhZGRSb29tQWNjZXNzVmFsaWRhdG9yIiwicm9vbSIsInVzZXIiLCJ0IiwiaGFzUGVybWlzc2lvbiIsImV4dHJhRGF0YSIsInJpZCIsImZpbmRPbmVCeUlkIiwidmlzaXRvclRva2VuIiwidG9rZW4iLCJjYWxsYmFja3MiLCJhZGQiLCJFcnJvciIsIlRBUGkxOG4iLCJfXyIsImxuZyIsImxhbmd1YWdlIiwicHJpb3JpdHkiLCJMT1ciLCJVc2VyUHJlc2VuY2VFdmVudHMiLCJvbiIsInNlc3Npb24iLCJzdGF0dXMiLCJtZXRhZGF0YSIsInZpc2l0b3IiLCJMaXZlY2hhdElucXVpcnkiLCJ1cGRhdGVWaXNpdG9yU3RhdHVzIiwiTGl2ZWNoYXRSb29tVHlwZSIsIkxpdmVjaGF0VmlzaXRvcnMiLCJMaXZlY2hhdFJvb21UeXBlU2VydmVyIiwiZ2V0TXNnU2VuZGVyIiwic2VuZGVySWQiLCJnZXROb3RpZmljYXRpb25EZXRhaWxzIiwibm90aWZpY2F0aW9uTWVzc2FnZSIsInRpdGxlIiwicm9vbU5hbWUiLCJ0ZXh0IiwiY2FuQWNjZXNzVXBsb2FkZWRGaWxlIiwicmNfdG9rZW4iLCJyY19yaWQiLCJmaW5kT25lT3BlbkJ5VmlzaXRvclRva2VuIiwia25vd2xlZGdlRW5hYmxlZCIsImFwaWFpS2V5IiwiYXBpYWlMYW5ndWFnZSIsImtleSIsInZhbHVlIiwibWVzc2FnZSIsImVkaXRlZEF0IiwiZGVmZXIiLCJyZXNwb25zZSIsIkhUVFAiLCJwb3N0IiwiZGF0YSIsInF1ZXJ5IiwibXNnIiwibGFuZyIsInNlc3Npb25JZCIsImNvZGUiLCJyZXN1bHQiLCJmdWxmaWxsbWVudCIsInNwZWVjaCIsIkxpdmVjaGF0RXh0ZXJuYWxNZXNzYWdlIiwiaW5zZXJ0Iiwib3JpZyIsInRzIiwiRGF0ZSIsImUiLCJTeXN0ZW1Mb2dnZXIiLCJlcnJvciIsInZhbGlkYXRlTWVzc2FnZSIsInBob25lUmVnZXhwIiwiUmVnRXhwIiwibXNnUGhvbmVzIiwibWF0Y2giLCJlbWFpbFJlZ2V4cCIsIm1zZ0VtYWlscyIsInNhdmVHdWVzdEVtYWlsUGhvbmVCeUlkIiwicnVuIiwid2FpdGluZ1Jlc3BvbnNlIiwibm93Iiwic2V0UmVzcG9uc2VCeVJvb21JZCIsInUiLCJ1c2VybmFtZSIsInJlc3BvbnNlRGF0ZSIsInJlc3BvbnNlVGltZSIsImdldFRpbWUiLCJwb3N0RGF0YSIsInR5cGUiLCJzZW50QXQiLCJuYW1lIiwiZW1haWwiLCJMaXZlY2hhdCIsInNlbmRSZXF1ZXN0IiwiTUVESVVNIiwic2VuZFRvUkRTdGF0aW9uIiwibGl2ZWNoYXREYXRhIiwiZ2V0TGl2ZWNoYXRSb29tR3Vlc3RJbmZvIiwib3B0aW9ucyIsInRva2VuX3Jkc3RhdGlvbiIsImlkZW50aWZpY2Fkb3IiLCJjbGllbnRfaWQiLCJub21lIiwicGhvbmUiLCJ0ZWxlZm9uZSIsInRhZ3MiLCJPYmplY3QiLCJrZXlzIiwiY3VzdG9tRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkIiwiY2FsbCIsImNvbnNvbGUiLCJtc2dOYXZUeXBlIiwic2VuZE1lc3NhZ2VUeXBlIiwibXNnVHlwZSIsInNlbmROYXZIaXN0b3J5Iiwic2VuZFRvQ1JNIiwiaW5jbHVkZU1lc3NhZ2VzIiwibWVzc2FnZXMiLCJNZXNzYWdlcyIsImZpbmRWaXNpYmxlQnlSb29tSWQiLCJzb3J0IiwiQXJyYXkiLCJhZ2VudElkIiwibmF2aWdhdGlvbiIsInB1c2giLCJzYXZlQ1JNRGF0YUJ5Um9vbUlkIiwib3BlbiIsIk9tbmlDaGFubmVsIiwiZmFjZWJvb2siLCJyZXBseSIsInBhZ2UiLCJpZCIsIm1ldGhvZHMiLCJ1c2VySWQiLCJtZXRob2QiLCJhZGRBZ2VudCIsImFkZE1hbmFnZXIiLCJuZXdTdGF0dXMiLCJzdGF0dXNMaXZlY2hhdCIsIlVzZXJzIiwic2V0TGl2ZWNoYXRTdGF0dXMiLCJyb29tSWQiLCJnZXRWaXNpdG9yQnlUb2tlbiIsImNsb3NlUm9vbSIsImNvbW1lbnQiLCJzdWJzY3JpcHRpb24iLCJTdWJzY3JpcHRpb25zIiwiZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkIiwiYWN0aW9uIiwiZW5hYmxlZCIsImhhc1Rva2VuIiwiZW5hYmxlIiwic3VjY2VzcyIsInVwZGF0ZUJ5SWQiLCJkaXNhYmxlIiwibGlzdFBhZ2VzIiwic3Vic2NyaWJlIiwidW5zdWJzY3JpYmUiLCJMaXZlY2hhdEN1c3RvbUZpZWxkIiwiZmluZCIsImZldGNoIiwiY2hlY2siLCJTdHJpbmciLCJzZXJ2ZWRCeSIsImdldEFnZW50SW5mbyIsImluZm8iLCJjb2xvciIsInJlZ2lzdHJhdGlvbkZvcm0iLCJ0cmlnZ2VycyIsImRlcGFydG1lbnRzIiwiYWxsb3dTd2l0Y2hpbmdEZXBhcnRtZW50cyIsIm9ubGluZSIsIm9mZmxpbmVDb2xvciIsIm9mZmxpbmVNZXNzYWdlIiwib2ZmbGluZVN1Y2Nlc3NNZXNzYWdlIiwib2ZmbGluZVVuYXZhaWxhYmxlTWVzc2FnZSIsImRpc3BsYXlPZmZsaW5lRm9ybSIsInZpZGVvQ2FsbCIsImZpbGVVcGxvYWQiLCJjb252ZXJzYXRpb25GaW5pc2hlZE1lc3NhZ2UiLCJuYW1lRmllbGRSZWdpc3RyYXRpb25Gb3JtIiwiZW1haWxGaWVsZFJlZ2lzdHJhdGlvbkZvcm0iLCJmaW5kT3BlbkJ5VmlzaXRvclRva2VuIiwiZmllbGRzIiwiY2wiLCJ1c2VybmFtZXMiLCJsZW5ndGgiLCJ2aXNpdG9yRW1haWxzIiwiaW5pdFNldHRpbmdzIiwiZ2V0SW5pdFNldHRpbmdzIiwiTGl2ZWNoYXRfdGl0bGUiLCJMaXZlY2hhdF90aXRsZV9jb2xvciIsIkxpdmVjaGF0X2VuYWJsZWQiLCJMaXZlY2hhdF9yZWdpc3RyYXRpb25fZm9ybSIsIm9mZmxpbmVUaXRsZSIsIkxpdmVjaGF0X29mZmxpbmVfdGl0bGUiLCJMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yIiwiTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlIiwiTGl2ZWNoYXRfb2ZmbGluZV9zdWNjZXNzX21lc3NhZ2UiLCJMaXZlY2hhdF9vZmZsaW5lX2Zvcm1fdW5hdmFpbGFibGUiLCJMaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybSIsIkxhbmd1YWdlIiwiTGl2ZWNoYXRfdmlkZW9jYWxsX2VuYWJsZWQiLCJKaXRzaV9FbmFibGVkIiwiTGl2ZWNoYXRfZmlsZXVwbG9hZF9lbmFibGVkIiwiRmlsZVVwbG9hZF9FbmFibGVkIiwidHJhbnNjcmlwdCIsIkxpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0IiwidHJhbnNjcmlwdE1lc3NhZ2UiLCJMaXZlY2hhdF90cmFuc2NyaXB0X21lc3NhZ2UiLCJMaXZlY2hhdF9jb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZSIsIkxpdmVjaGF0X25hbWVfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0iLCJMaXZlY2hhdF9lbWFpbF9maWVsZF9yZWdpc3RyYXRpb25fZm9ybSIsImFnZW50RGF0YSIsIkxpdmVjaGF0VHJpZ2dlciIsImZpbmRFbmFibGVkIiwidHJpZ2dlciIsInBpY2siLCJMaXZlY2hhdERlcGFydG1lbnQiLCJmaW5kRW5hYmxlZFdpdGhBZ2VudHMiLCJkZXBhcnRtZW50IiwiTGl2ZWNoYXRfYWxsb3dfc3dpdGNoaW5nX2RlcGFydG1lbnRzIiwiZmluZE9ubGluZUFnZW50cyIsImNvdW50IiwicmVxdWlyZURlcGFybWVudCIsImdldFJlcXVpcmVkRGVwYXJ0bWVudCIsImFnZW50IiwiZ2V0TmV4dEFnZW50IiwibGltaXQiLCJscyIsImxvYWRNZXNzYWdlSGlzdG9yeSIsInBhZ2VJbmZvIiwic2F2ZVBhZ2VIaXN0b3J5IiwicmVnaXN0ZXJHdWVzdCIsImtlZXBIaXN0b3J5Rm9yVG9rZW4iLCJjdXJzb3IiLCJzYXZlUm9vbUluZm8iLCJyZW1vdmVBZ2VudCIsImN1c3RvbUZpZWxkIiwicmVtb3ZlQnlJZCIsInJlbW92ZURlcGFydG1lbnQiLCJyZW1vdmVNYW5hZ2VyIiwidHJpZ2dlcklkIiwicmVtb3ZlQnlSb29tSWQiLCJ2YWxpZFNldHRpbmdzIiwidmFsaWQiLCJldmVyeSIsInNldHRpbmciLCJpbmRleE9mIiwiY3VzdG9tRmllbGREYXRhIiwiTWF0Y2giLCJPYmplY3RJbmNsdWRpbmciLCJsYWJlbCIsInNjb3BlIiwidmlzaWJpbGl0eSIsImNyZWF0ZU9yVXBkYXRlQ3VzdG9tRmllbGQiLCJkZXBhcnRtZW50RGF0YSIsImRlcGFydG1lbnRBZ2VudHMiLCJzYXZlRGVwYXJ0bWVudCIsImd1ZXN0RGF0YSIsInJvb21EYXRhIiwiT3B0aW9uYWwiLCJ0b3BpYyIsInJldCIsInNhdmVHdWVzdCIsInMiLCJ2YWx1ZXMiLCJ2aXNpdG9yUm9vbSIsImZvcm1EYXRhIiwidW5kZWZpbmVkIiwidXBkYXRlRGF0YSIsIml0ZW0iLCJ1cGRhdGVTdXJ2ZXlGZWVkYmFja0J5SWQiLCJNYXliZSIsImRlc2NyaXB0aW9uIiwiQm9vbGVhbiIsImNvbmRpdGlvbnMiLCJhY3Rpb25zIiwiaXNTdHJpbmciLCJmaW5kT25lQnlVc2VybmFtZSIsInNlbmRNZXNzYWdlTGl2ZWNoYXQiLCJhdHRhY2htZW50cyIsImd1ZXN0Iiwic2VuZE1lc3NhZ2UiLCJmaWxlIiwibXNnRGF0YSIsImF2YXRhciIsImVtb2ppIiwiYWxpYXMiLCJncm91cGFibGUiLCJmaWxlVXJsIiwiZW5jb2RlVVJJIiwiYXR0YWNobWVudCIsInRpdGxlX2xpbmsiLCJ0aXRsZV9saW5rX2Rvd25sb2FkIiwiaW1hZ2VfdXJsIiwiaW1hZ2VfdHlwZSIsImltYWdlX3NpemUiLCJzaXplIiwiaWRlbnRpZnkiLCJpbWFnZV9kaW1lbnNpb25zIiwiaW1hZ2VfcHJldmlldyIsIkZpbGVVcGxvYWQiLCJyZXNpemVJbWFnZVByZXZpZXciLCJhdWRpb191cmwiLCJhdWRpb190eXBlIiwiYXVkaW9fc2l6ZSIsInZpZGVvX3VybCIsInZpZGVvX3R5cGUiLCJ2aWRlb19zaXplIiwiYXNzaWduIiwiUmFuZG9tIiwiZG5zIiwiaGVhZGVyIiwicGxhY2Vob2xkZXJzIiwicmVwbGFjZSIsImZvb3RlciIsImZyb21FbWFpbCIsImVtYWlsRG9tYWluIiwic3Vic3RyIiwibGFzdEluZGV4T2YiLCJ3cmFwQXN5bmMiLCJyZXNvbHZlTXgiLCJFbWFpbCIsInNlbmQiLCJ0byIsImZyb20iLCJyZXBseVRvIiwic3ViamVjdCIsInN1YnN0cmluZyIsIkREUFJhdGVMaW1pdGVyIiwiYWRkUnVsZSIsImNvbm5lY3Rpb25JZCIsIm92ZXJ3cml0ZSIsInVwZGF0ZUxpdmVjaGF0RGF0YUJ5VG9rZW4iLCJzZXREZXBhcnRtZW50Rm9yR3Vlc3QiLCJnZXRSb29tIiwiaml0c2lUaW1lb3V0IiwiY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsImFjdGlvbkxpbmtzIiwiaWNvbiIsImkxOG5MYWJlbCIsIm1ldGhvZF9pZCIsInBhcmFtcyIsImppdHNpUm9vbSIsInRyYW5zZmVyRGF0YSIsImRlcGFydG1lbnRJZCIsImhhc1JvbGUiLCJ0cmFuc2ZlciIsInBvc3RDYXRjaEVycm9yIiwicmVzb2x2ZSIsImVyciIsInVuYmxvY2siLCJzYW1wbGVEYXRhIiwiY3JlYXRlZEF0IiwibGFzdE1lc3NhZ2VBdCIsInByb2R1Y3RJZCIsImlwIiwiYnJvd3NlciIsIm9zIiwiY3VzdG9tZXJJZCIsImxvZyIsInN0YXR1c0NvZGUiLCJpbnF1aXJ5SWQiLCJpbnF1aXJ5Iiwic3Vic2NyaXB0aW9uRGF0YSIsImFsZXJ0IiwidW5yZWFkIiwidXNlck1lbnRpb25zIiwiZ3JvdXBNZW50aW9ucyIsImRlc2t0b3BOb3RpZmljYXRpb25zIiwibW9iaWxlUHVzaE5vdGlmaWNhdGlvbnMiLCJlbWFpbE5vdGlmaWNhdGlvbnMiLCJpbmNVc2Vyc0NvdW50QnlJZCIsImNoYW5nZUFnZW50QnlSb29tSWQiLCJ0YWtlSW5xdWlyeSIsImNyZWF0ZUNvbW1hbmRXaXRoUm9vbUlkQW5kVXNlciIsInN0cmVhbSIsImVtaXQiLCJyZXR1cm5Sb29tQXNJbnF1aXJ5IiwiZGF5Iiwic3RhcnQiLCJmaW5pc2giLCJMaXZlY2hhdE9mZmljZUhvdXIiLCJ1cGRhdGVIb3VycyIsIm1vbWVudCIsInVzZXJMYW5ndWFnZSIsImZpbmRWaXNpYmxlQnlSb29tSWROb3RDb250YWluaW5nVHlwZXMiLCJhdXRob3IiLCJkYXRldGltZSIsImxvY2FsZSIsImZvcm1hdCIsInNpbmdsZU1lc3NhZ2UiLCJlbWFpbFNldHRpbmdzIiwic2V0T3BlcmF0b3IiLCJvcGVyYXRvciIsInVwZGF0ZSIsIiRzZXQiLCIkZXhpc3RzIiwiJG5lIiwicm9sZXMiLCJmaW5kT25lT25saW5lQWdlbnRCeVVzZXJuYW1lIiwiZmluZE9uZSIsImZpbmRBZ2VudHMiLCJmaW5kT25saW5lVXNlckZyb21MaXN0IiwidXNlckxpc3QiLCIkaW4iLCJjb25jYXQiLCJjb2xsZWN0aW9uT2JqIiwibW9kZWwiLCJyYXdDb2xsZWN0aW9uIiwiZmluZEFuZE1vZGlmeSIsImxpdmVjaGF0Q291bnQiLCIkaW5jIiwiY2xvc2VPZmZpY2UiLCJzZWxmIiwib3Blbk9mZmljZSIsImVtYWlscyIsInN1cnZleUZlZWRiYWNrIiwiZmluZExpdmVjaGF0IiwiZmlsdGVyIiwib2Zmc2V0IiwiZXh0ZW5kIiwidXBkYXRlTGl2ZWNoYXRSb29tQ291bnQiLCJzZXR0aW5nc1JhdyIsIlNldHRpbmdzIiwiZmluZEJ5VmlzaXRvclRva2VuIiwiZmluZEJ5VmlzaXRvcklkIiwidmlzaXRvcklkIiwicmVzcG9uc2VCeSIsIiR1bnNldCIsImNsb3NlQnlSb29tSWQiLCJjbG9zZUluZm8iLCJjbG9zZXIiLCJjbG9zZWRCeSIsImNsb3NlZEF0IiwiY2hhdER1cmF0aW9uIiwiZmluZE9wZW5CeUFnZW50IiwibmV3QWdlbnQiLCJjcm1EYXRhIiwiZXhwaXJlQXQiLCJtdWx0aSIsInNldFJvb21JZEJ5VG9rZW4iLCJfQmFzZSIsImNvbnN0cnVjdG9yIiwiaXNDbGllbnQiLCJfaW5pdE1vZGVsIiwiZmluZEJ5Um9vbUlkIiwicmVjb3JkIiwicmVtb3ZlIiwidHJ5RW5zdXJlSW5kZXgiLCJudW1BZ2VudHMiLCJmaW5kQnlEZXBhcnRtZW50SWQiLCJjcmVhdGVPclVwZGF0ZURlcGFydG1lbnQiLCJzaG93T25SZWdpc3RyYXRpb24iLCJhZ2VudHMiLCJzYXZlZEFnZW50cyIsInBsdWNrIiwiTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzIiwiYWdlbnRzVG9TYXZlIiwiZGlmZmVyZW5jZSIsInJlbW92ZUJ5RGVwYXJ0bWVudElkQW5kQWdlbnRJZCIsInNhdmVBZ2VudCIsInBhcnNlSW50Iiwib3JkZXIiLCIkZ3QiLCJ1cHNlcnQiLCJnZXROZXh0QWdlbnRGb3JEZXBhcnRtZW50Iiwib25saW5lVXNlcnMiLCJvbmxpbmVVc2VybmFtZXMiLCJnZXRPbmxpbmVGb3JEZXBhcnRtZW50IiwiZGVwQWdlbnRzIiwiZmluZFVzZXJzSW5RdWV1ZSIsInVzZXJzTGlzdCIsInJlcGxhY2VVc2VybmFtZU9mQWdlbnRCeVVzZXJJZCIsIkxpdmVjaGF0UGFnZVZpc2l0ZWQiLCJzcGFyc2UiLCJleHBpcmVBZnRlclNlY29uZHMiLCJzYXZlQnlUb2tlbiIsImtlZXBIaXN0b3J5TWlsaXNlY29uZHMiLCJmaW5kQnlUb2tlbiIsInJlbW92ZUFsbCIsImZpbmRCeUlkIiwib3BlbklucXVpcnkiLCJvcGVuSW5xdWlyeVdpdGhBZ2VudHMiLCJhZ2VudElkcyIsImdldFN0YXR1cyIsIm5ld1N0YXJ0IiwibmV3RmluaXNoIiwibmV3T3BlbiIsImlzTm93V2l0aGluSG91cnMiLCJjdXJyZW50VGltZSIsInV0YyIsInRvZGF5c09mZmljZUhvdXJzIiwiaXNCZWZvcmUiLCJpc0JldHdlZW4iLCJpc09wZW5pbmdUaW1lIiwiaXNTYW1lIiwiaXNDbG9zaW5nVGltZSIsImZpbmRWaXNpdG9yQnlUb2tlbiIsImZpbmRPbmVWaXNpdG9yQnlQaG9uZSIsImdldE5leHRWaXNpdG9yVXNlcm5hbWUiLCJzYXZlR3Vlc3RCeUlkIiwic2V0RGF0YSIsInVuc2V0RGF0YSIsImFkZHJlc3MiLCJwaG9uZU51bWJlciIsImZpbmRPbmVHdWVzdEJ5RW1haWxBZGRyZXNzIiwiZW1haWxBZGRyZXNzIiwiZXNjYXBlUmVnRXhwIiwicGhvbmVzIiwiJGFkZFRvU2V0Iiwic2F2ZUVtYWlsIiwiJGVhY2giLCJzYXZlUGhvbmUiLCJleHBvcnREZWZhdWx0IiwiVUFQYXJzZXIiLCJoaXN0b3J5TW9uaXRvclR5cGUiLCJsb2dnZXIiLCJMb2dnZXIiLCJzZWN0aW9ucyIsIndlYmhvb2siLCJpIiwicXVlcnlTdHJpbmciLCJnZXRBZ2VudHMiLCJnZXRPbmxpbmVBZ2VudHMiLCJvbmxpbmVSZXF1aXJlZCIsImRlcHQiLCJvbmxpbmVBZ2VudHMiLCJyb29tSW5mbyIsIm5ld1Jvb20iLCJyb3V0aW5nTWV0aG9kIiwiUXVldWVNZXRob2RzIiwic2hvd0Nvbm5lY3RpbmciLCJ1cGRhdGVVc2VyIiwiZXhpc3RpbmdVc2VyIiwidXNlckRhdGEiLCJjb25uZWN0aW9uIiwidXNlckFnZW50IiwiaHR0cEhlYWRlcnMiLCJjbGllbnRBZGRyZXNzIiwibnVtYmVyIiwidXNlcnMiLCJjbG9zZURhdGEiLCJoaWRlQnlSb29tSWRBbmRVc2VySWQiLCJmaW5kTm90SGlkZGVuUHVibGljIiwic2V0VG9waWNBbmRUYWdzQnlJZCIsInNldEZuYW1lQnlJZCIsInVwZGF0ZURpc3BsYXlOYW1lQnlSb29tSWQiLCJjbG9zZU9wZW5DaGF0cyIsImZvcndhcmRPcGVuQ2hhdHMiLCJjaGFuZ2UiLCJwYWdlVGl0bGUiLCJwYWdlVXJsIiwibG9jYXRpb24iLCJocmVmIiwiX2hpZGRlbiIsImNyZWF0ZU5hdmlnYXRpb25IaXN0b3J5V2l0aFJvb21JZE1lc3NhZ2VBbmRVc2VyIiwicmVtb3ZlQnlSb29tSWRBbmRVc2VySWQiLCJjcmVhdGVVc2VyTGVhdmVXaXRoUm9vbUlkQW5kVXNlciIsImNyZWF0ZVVzZXJKb2luV2l0aFJvb21JZEFuZFVzZXIiLCJyZW1vdmVVc2VybmFtZUJ5SWQiLCJvcGVuSW5xIiwiY2FsbGJhY2siLCJ0cnlpbmciLCJ3YXJuIiwic2V0VGltZW91dCIsInVhIiwic2V0VUEiLCJmbmFtZSIsImxtIiwiZ2V0T1MiLCJ2ZXJzaW9uIiwiZ2V0QnJvd3NlciIsImFkZFVzZXJSb2xlcyIsInJlbW92ZVVzZXJGcm9tUm9sZXMiLCJTdHJlYW1lciIsImFsbG93UmVhZCIsIm1zZ3MiLCJ1c2Vyc0NvdW50Iiwic2V0SW50ZXJ2YWwiLCJnYXRld2F5VVJMIiwicGFnZUlkIiwiU01TIiwic21zIiwiU01TU2VydmljZSIsImdldFNlcnZpY2UiLCJhZ2VudHNIYW5kbGVyIiwibW9uaXRvckFnZW50cyIsImFjdGlvblRpbWVvdXQiLCJxdWV1ZSIsImNsZWFyVGltZW91dCIsImV4aXN0cyIsInJ1bkFnZW50TGVhdmVBY3Rpb24iLCJvYnNlcnZlQ2hhbmdlcyIsImFkZGVkIiwiY2hhbmdlZCIsInJlbW92ZWQiLCJzdG9wIiwiVXNlclByZXNlbmNlTW9uaXRvciIsIm9uU2V0VXNlclN0YXR1cyIsInB1Ymxpc2giLCJoYW5kbGUiLCJnZXRVc2Vyc0luUm9sZSIsInJlYWR5Iiwib25TdG9wIiwiZmluZEJ5SWRzIiwiJGd0ZSIsInNldERhdGUiLCJnZXREYXRlIiwic2V0U2Vjb25kcyIsImdldFNlY29uZHMiLCIkbHRlIiwiaGFuZGxlRGVwdHMiLCJmaW5kQnlSb29tSWRBbmRUeXBlIiwiUm9sZXMiLCJjcmVhdGVPclVwZGF0ZSIsIlBlcm1pc3Npb25zIiwiTWVzc2FnZVR5cGVzIiwicmVnaXN0ZXJUeXBlIiwic3lzdGVtIiwiaGlzdG9yeSIsInJlZ2lzdGVyIiwiaW5zdGFuY2UiLCJ0YWJCYXIiLCJpc1NlcnZlciIsIk5vdGlmaWNhdGlvbnMiLCJub3RpZnlSb29tIiwic2V0SGlkZGVuQnlJZCIsImFkZEdyb3VwIiwiZ3JvdXAiLCJwdWJsaWMiLCJlZGl0b3IiLCJhbGxvd2VkVHlwZXMiLCJzZWN0aW9uIiwiaTE4bkRlc2NyaXB0aW9uIiwiZW5hYmxlUXVlcnkiLCJleHBvcnQiLCJSb29tU2V0dGluZ3NFbnVtIiwiUm9vbVR5cGVDb25maWciLCJSb29tVHlwZVJvdXRlQ29uZmlnIiwiVWlUZXh0Q29udGV4dCIsIkxpdmVjaGF0Um9vbVJvdXRlIiwicGF0aCIsIm9wZW5Sb29tIiwibGluayIsInN1YiIsImlkZW50aWZpZXIiLCJyb3V0ZSIsIm5vdFN1YnNjcmliZWRUcGwiLCJ0ZW1wbGF0ZSIsImZpbmRSb29tIiwiQ2hhdFJvb20iLCJjb25kaXRpb24iLCJoYXNBbGxQZXJtaXNzaW9uIiwiY2FuU2VuZE1lc3NhZ2UiLCJnZXRVc2VyU3RhdHVzIiwiU2Vzc2lvbiIsImFsbG93Um9vbVNldHRpbmdDaGFuZ2UiLCJKT0lOX0NPREUiLCJnZXRVaVRleHQiLCJjb250ZXh0IiwiSElERV9XQVJOSU5HIiwiTEVBVkVfV0FSTklORyIsIkFQSSIsInYxIiwiYWRkUm91dGUiLCJhdXRoUmVxdWlyZWQiLCJ1bmF1dGhvcml6ZWQiLCJib2R5UGFyYW1zIiwiZmFpbHVyZSIsInVybFBhcmFtcyIsInB1dCIsImRlbGV0ZSIsImNyeXB0byIsInJlcXVlc3QiLCJzaWduYXR1cmUiLCJjcmVhdGVIbWFjIiwiYm9keSIsImRpZ2VzdCIsIm1pZCIsInJvb21zIiwiZmlyc3RfbmFtZSIsImxhc3RfbmFtZSIsInN1Y2VzcyIsInNlbnRNZXNzYWdlcyIsInNlbnRNZXNzYWdlIiwic2VydmljZSIsIm1lZGlhIiwiY3VyciIsIm1lc3NhZ2VfbGluayIsImNvbnRlbnRUeXBlIiwiZXh0cmEiLCJmcm9tQ291bnRyeSIsImZyb21TdGF0ZSIsImZyb21DaXR5IiwiQnVzYm95IiwiZmlsZXNpemUiLCJtYXhGaWxlU2l6ZSIsInBhY2thZ2VWYWx1ZSIsImJ1c2JveSIsImZpbGVzIiwiZmllbGRuYW1lIiwiZmlsZW5hbWUiLCJlbmNvZGluZyIsIm1pbWV0eXBlIiwiZmlsZURhdGUiLCJmaWxlQnVmZmVyIiwiQnVmZmVyIiwicGlwZSIsImZpbGVVcGxvYWRJc1ZhbGlkQ29udGVudFR5cGUiLCJyZWFzb24iLCJzaXplQWxsb3dlZCIsImZpbGVTdG9yZSIsImdldFN0b3JlIiwiZGV0YWlscyIsInVwbG9hZGVkRmlsZSIsImJpbmQiLCJyb2xlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsQ0FBSjs7QUFBTUMsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0wsUUFBRUssQ0FBRjtBQUFJOztBQUFoQixDQUFuQyxFQUFxRCxDQUFyRDtBQUF3RCxJQUFJQyxHQUFKO0FBQVFMLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxLQUFSLENBQWIsRUFBNEI7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNDLFVBQUlELENBQUo7QUFBTTs7QUFBbEIsQ0FBNUIsRUFBZ0QsQ0FBaEQ7QUFJdEVFLFNBQVNDLFFBQVFDLE1BQVIsQ0FBZUYsTUFBeEI7QUFDQSxNQUFNRyxhQUFhRixRQUFRRyxVQUFSLENBQW1CRCxVQUF0QztBQUVBSCxPQUFPSyxlQUFQLENBQXVCQyxHQUF2QixDQUEyQixXQUEzQixFQUF3Q0MsT0FBT0MsZUFBUCxDQUF1QixDQUFDQyxHQUFELEVBQU1DLEdBQU4sRUFBV0MsSUFBWCxLQUFvQjtBQUNsRixRQUFNQyxTQUFTYixJQUFJYyxLQUFKLENBQVVKLElBQUlWLEdBQWQsQ0FBZjs7QUFDQSxNQUFJYSxPQUFPRSxRQUFQLEtBQW9CLEdBQXhCLEVBQTZCO0FBQzVCLFdBQU9ILE1BQVA7QUFDQTs7QUFDREQsTUFBSUssU0FBSixDQUFjLGNB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ckIsUUFBTTtBQUNMLFFBQUksQ0FBQ0YsV0FBV2lDLEtBQVgsQ0FBaUJLLGFBQWpCLENBQStCLEtBQUtrSSxNQUFwQyxFQUE0Qyx1QkFBNUMsQ0FBTCxFQUEyRTtBQUMxRSxhQUFPeEssV0FBVzJyQixHQUFYLENBQWVDLEVBQWYsQ0FBa0JHLFlBQWxCLEVBQVA7QUFDQTs7QUFFRCxVQUFNYSxRQUFRNXNCLFdBQVc4QixNQUFYLENBQWtCQyxLQUFsQixDQUF3QjBMLHNCQUF4QixDQUErQyxLQUFLeWUsU0FBTCxDQUFleHBCLFlBQTlELEVBQTRFO0FBQ3pGZ0wsY0FBUTtBQUNQL0YsY0FBTSxDQURDO0FBRVB0RixXQUFHLENBRkk7QUFHUHNMLFlBQUksQ0FIRztBQUlQeEcsV0FBRyxDQUpJO0FBS1B5RyxtQkFBVyxDQUxKO0FBTVB0QixrQkFBVTtBQU5IO0FBRGlGLEtBQTVFLEVBU1hILEtBVFcsRUFBZDtBQVVBLFdBQU9uTSxXQUFXMnJCLEdBQVgsQ0FBZUMsRUFBZixDQUFrQmpnQixPQUFsQixDQUEwQjtBQUFFaWhCO0FBQUYsS0FBMUIsQ0FBUDtBQUNBOztBQWpCd0YsQ0FBMUYsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9saXZlY2hhdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbHMgV2ViQXBwOnRydWUgKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHVybCBmcm9tICd1cmwnO1xuXG5XZWJBcHAgPSBQYWNrYWdlLndlYmFwcC5XZWJBcHA7XG5jb25zdCBBdXRvdXBkYXRlID0gUGFja2FnZS5hdXRvdXBkYXRlLkF1dG91cGRhdGU7XG5cbldlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKCcvbGl2ZWNoYXQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChyZXEsIHJlcywgbmV4dCkgPT4ge1xuXHRjb25zdCByZXFVcmwgPSB1cmwucGFyc2UocmVxLnVybCk7XG5cdGlmIChyZXFVcmwucGF0aG5hbWUgIT09ICcvJykge1xuXHRcdHJldHVybiBuZXh0KCk7XG5cdH1cblx0cmVzLnNldEhlYWRlcignY29udGVudC10eXBlJywgJ3RleHQvaHRtbDsgY2hhcnNldD11dGYtOCcpO1xuXG5cdGxldCBkb21haW5XaGl0ZUxpc3QgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfQWxsb3dlZERvbWFpbnNMaXN0Jyk7XG5cdGlmIChyZXEuaGVhZGVycy5yZWZlcmVyICYmICFfLmlzRW1wdHkoZG9tYWluV2hpdGVMaXN0LnRyaW0oKSkpIHtcblx0XHRkb21haW5XaGl0ZUxpc3QgPSBfLm1hcChkb21haW5XaGl0ZUxpc3Quc3BsaXQoJywnKSwgZnVuY3Rpb24oZG9tYWluKSB7XG5cdFx0XHRyZXR1cm4gZG9tYWluLnRyaW0oKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IHJlZmVyZXIgPSB1cmwucGFyc2UocmVxLmhlYWRlcnMucmVmZXJlcik7XG5cdFx0aWYgKCFfLmNvbnRhaW5zKGRvbWFpbldoaXRlTGlzdCwgcmVmZXJlci5ob3N0KSkge1xuXHRcdFx0cmVzLnNldEhlYWRlcignWC1GUkFNRS1PUFRJT05TJywgJ0RFTlknKTtcblx0XHRcdHJldHVybiBuZXh0KCk7XG5cdFx0fVxuXG5cdFx0cmVzLnNldEhlYWRlcignWC1GUkFNRS1PUFRJT05TJywgYEFMTE9XLUZST00gJHsgcmVmZXJlci5wcm90b2NvbCB9Ly8keyByZWZlcmVyLmhvc3QgfWApO1xuXHR9XG5cblx0Y29uc3QgaGVhZCA9IEFzc2V0cy5nZXRUZXh0KCdwdWJsaWMvaGVhZC5odG1sJyk7XG5cblx0bGV0IGJhc2VVcmw7XG5cdGlmIChfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYICYmIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVgudHJpbSgpICE9PSAnJykge1xuXHRcdGJhc2VVcmwgPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYO1xuXHR9IGVsc2Uge1xuXHRcdGJhc2VVcmwgPSAnLyc7XG5cdH1cblx0aWYgKC9cXC8kLy50ZXN0KGJhc2VVcmwpID09PSBmYWxzZSkge1xuXHRcdGJhc2VVcmwgKz0gJy8nO1xuXHR9XG5cblx0Y29uc3QgaHRtbCA9IGA8aHRtbD5cblx0XHQ8aGVhZD5cblx0XHRcdDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBjbGFzcz1cIl9fbWV0ZW9yLWNzc19fXCIgaHJlZj1cIiR7IGJhc2VVcmwgfWxpdmVjaGF0L2xpdmVjaGF0LmNzcz9fZGM9JHsgQXV0b3VwZGF0ZS5hdXRvdXBkYXRlVmVyc2lvbiB9XCI+XG5cdFx0XHQ8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIj5cblx0XHRcdFx0X19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9ICR7IEpTT04uc3RyaW5naWZ5KF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18pIH07XG5cdFx0XHQ8L3NjcmlwdD5cblxuXHRcdFx0PGJhc2UgaHJlZj1cIiR7IGJhc2VVcmwgfVwiPlxuXG5cdFx0XHQkeyBoZWFkIH1cblx0XHQ8L2hlYWQ+XG5cdFx0PGJvZHk+XG5cdFx0XHQ8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCIkeyBiYXNlVXJsIH1saXZlY2hhdC9saXZlY2hhdC5qcz9fZGM9JHsgQXV0b3VwZGF0ZS5hdXRvdXBkYXRlVmVyc2lvbiB9XCI+PC9zY3JpcHQ+XG5cdFx0PC9ib2R5PlxuXHQ8L2h0bWw+YDtcblxuXHRyZXMud3JpdGUoaHRtbCk7XG5cdHJlcy5lbmQoKTtcbn0pKTtcbiIsIk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0Um9ja2V0Q2hhdC5yb29tVHlwZXMuc2V0Um9vbUZpbmQoJ2wnLCAoX2lkKSA9PiB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRMaXZlY2hhdEJ5SWQoX2lkKTtcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5hdXRoei5hZGRSb29tQWNjZXNzVmFsaWRhdG9yKGZ1bmN0aW9uKHJvb20sIHVzZXIpIHtcblx0XHRyZXR1cm4gcm9vbSAmJiByb29tLnQgPT09ICdsJyAmJiB1c2VyICYmIFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VyLl9pZCwgJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnKTtcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5hdXRoei5hZGRSb29tQWNjZXNzVmFsaWRhdG9yKGZ1bmN0aW9uKHJvb20sIHVzZXIsIGV4dHJhRGF0YSkge1xuXHRcdGlmICghcm9vbSAmJiBleHRyYURhdGEgJiYgZXh0cmFEYXRhLnJpZCkge1xuXHRcdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGV4dHJhRGF0YS5yaWQpO1xuXHRcdH1cblx0XHRyZXR1cm4gcm9vbSAmJiByb29tLnQgPT09ICdsJyAmJiBleHRyYURhdGEgJiYgZXh0cmFEYXRhLnZpc2l0b3JUb2tlbiAmJiByb29tLnYgJiYgcm9vbS52LnRva2VuID09PSBleHRyYURhdGEudmlzaXRvclRva2VuO1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2JlZm9yZUxlYXZlUm9vbScsIGZ1bmN0aW9uKHVzZXIsIHJvb20pIHtcblx0XHRpZiAocm9vbS50ICE9PSAnbCcpIHtcblx0XHRcdHJldHVybiB1c2VyO1xuXHRcdH1cblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFRBUGkxOG4uX18oJ1lvdV9jYW50X2xlYXZlX2FfbGl2ZWNoYXRfcm9vbV9QbGVhc2VfdXNlX3RoZV9jbG9zZV9idXR0b24nLCB7XG5cdFx0XHRsbmc6IHVzZXIubGFuZ3VhZ2UgfHwgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ2xhbmd1YWdlJykgfHwgJ2VuJ1xuXHRcdH0pKTtcblx0fSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnY2FudC1sZWF2ZS1yb29tJyk7XG59KTtcbiIsIi8qIGdsb2JhbHMgVXNlclByZXNlbmNlRXZlbnRzICovXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG5cdFVzZXJQcmVzZW5jZUV2ZW50cy5vbignc2V0U3RhdHVzJywgKHNlc3Npb24sIHN0YXR1cywgbWV0YWRhdGEpID0+IHtcblx0XHRpZiAobWV0YWRhdGEgJiYgbWV0YWRhdGEudmlzaXRvcikge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5LnVwZGF0ZVZpc2l0b3JTdGF0dXMobWV0YWRhdGEudmlzaXRvciwgc3RhdHVzKTtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZVZpc2l0b3JTdGF0dXMobWV0YWRhdGEudmlzaXRvciwgc3RhdHVzKTtcblx0XHR9XG5cdH0pO1xufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRSb29tVHlwZSBmcm9tICcuLi9pbXBvcnRzL0xpdmVjaGF0Um9vbVR5cGUnO1xuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbmNsYXNzIExpdmVjaGF0Um9vbVR5cGVTZXJ2ZXIgZXh0ZW5kcyBMaXZlY2hhdFJvb21UeXBlIHtcblx0Z2V0TXNnU2VuZGVyKHNlbmRlcklkKSB7XG5cdFx0cmV0dXJuIExpdmVjaGF0VmlzaXRvcnMuZmluZE9uZUJ5SWQoc2VuZGVySWQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJldHVybnMgZGV0YWlscyB0byB1c2Ugb24gbm90aWZpY2F0aW9uc1xuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gcm9vbVxuXHQgKiBAcGFyYW0ge29iamVjdH0gdXNlclxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbm90aWZpY2F0aW9uTWVzc2FnZVxuXHQgKiBAcmV0dXJuIHtvYmplY3R9IE5vdGlmaWNhdGlvbiBkZXRhaWxzXG5cdCAqL1xuXHRnZXROb3RpZmljYXRpb25EZXRhaWxzKHJvb20sIHVzZXIsIG5vdGlmaWNhdGlvbk1lc3NhZ2UpIHtcblx0XHRjb25zdCB0aXRsZSA9IGBbbGl2ZWNoYXRdICR7IHRoaXMucm9vbU5hbWUocm9vbSkgfWA7XG5cdFx0Y29uc3QgdGV4dCA9IG5vdGlmaWNhdGlvbk1lc3NhZ2U7XG5cblx0XHRyZXR1cm4geyB0aXRsZSwgdGV4dCB9O1xuXHR9XG5cblx0Y2FuQWNjZXNzVXBsb2FkZWRGaWxlKHsgcmNfdG9rZW4sIHJjX3JpZCB9ID0ge30pIHtcblx0XHRyZXR1cm4gcmNfdG9rZW4gJiYgcmNfcmlkICYmIFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVPcGVuQnlWaXNpdG9yVG9rZW4ocmNfdG9rZW4sIHJjX3JpZCk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5yb29tVHlwZXMuYWRkKG5ldyBMaXZlY2hhdFJvb21UeXBlU2VydmVyKCkpO1xuIiwiLyogZ2xvYmFscyBIVFRQLCBTeXN0ZW1Mb2dnZXIgKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5sZXQga25vd2xlZGdlRW5hYmxlZCA9IGZhbHNlO1xubGV0IGFwaWFpS2V5ID0gJyc7XG5sZXQgYXBpYWlMYW5ndWFnZSA9ICdlbic7XG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfS25vd2xlZGdlX0VuYWJsZWQnLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdGtub3dsZWRnZUVuYWJsZWQgPSB2YWx1ZTtcbn0pO1xuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0tub3dsZWRnZV9BcGlhaV9LZXknLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdGFwaWFpS2V5ID0gdmFsdWU7XG59KTtcblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9Lbm93bGVkZ2VfQXBpYWlfTGFuZ3VhZ2UnLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdGFwaWFpTGFuZ3VhZ2UgPSB2YWx1ZTtcbn0pO1xuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCBmdW5jdGlvbihtZXNzYWdlLCByb29tKSB7XG5cdC8vIHNraXBzIHRoaXMgY2FsbGJhY2sgaWYgdGhlIG1lc3NhZ2Ugd2FzIGVkaXRlZFxuXHRpZiAoIW1lc3NhZ2UgfHwgbWVzc2FnZS5lZGl0ZWRBdCkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0aWYgKCFrbm93bGVkZ2VFbmFibGVkKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRpZiAoISh0eXBlb2Ygcm9vbS50ICE9PSAndW5kZWZpbmVkJyAmJiByb29tLnQgPT09ICdsJyAmJiByb29tLnYgJiYgcm9vbS52LnRva2VuKSkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Ly8gaWYgdGhlIG1lc3NhZ2UgaGFzbid0IGEgdG9rZW4sIGl0IHdhcyBub3Qgc2VudCBieSB0aGUgdmlzaXRvciwgc28gaWdub3JlIGl0XG5cdGlmICghbWVzc2FnZS50b2tlbikge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBIVFRQLnBvc3QoJ2h0dHBzOi8vYXBpLmFwaS5haS9hcGkvcXVlcnk/dj0yMDE1MDkxMCcsIHtcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdHF1ZXJ5OiBtZXNzYWdlLm1zZyxcblx0XHRcdFx0XHRsYW5nOiBhcGlhaUxhbmd1YWdlLFxuXHRcdFx0XHRcdHNlc3Npb25JZDogcm9vbS5faWRcblx0XHRcdFx0fSxcblx0XHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcsXG5cdFx0XHRcdFx0J0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7IGFwaWFpS2V5IH1gXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnN0YXR1cy5jb2RlID09PSAyMDAgJiYgIV8uaXNFbXB0eShyZXNwb25zZS5kYXRhLnJlc3VsdC5mdWxmaWxsbWVudC5zcGVlY2gpKSB7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RXh0ZXJuYWxNZXNzYWdlLmluc2VydCh7XG5cdFx0XHRcdFx0cmlkOiBtZXNzYWdlLnJpZCxcblx0XHRcdFx0XHRtc2c6IHJlc3BvbnNlLmRhdGEucmVzdWx0LmZ1bGZpbGxtZW50LnNwZWVjaCxcblx0XHRcdFx0XHRvcmlnOiBtZXNzYWdlLl9pZCxcblx0XHRcdFx0XHR0czogbmV3IERhdGUoKVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRTeXN0ZW1Mb2dnZXIuZXJyb3IoJ0Vycm9yIHVzaW5nIEFwaS5haSAtPicsIGUpO1xuXHRcdH1cblx0fSk7XG5cblx0cmV0dXJuIG1lc3NhZ2U7XG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdleHRlcm5hbFdlYkhvb2snKTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uLy4uL3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbmZ1bmN0aW9uIHZhbGlkYXRlTWVzc2FnZShtZXNzYWdlLCByb29tKSB7XG5cdC8vIHNraXBzIHRoaXMgY2FsbGJhY2sgaWYgdGhlIG1lc3NhZ2Ugd2FzIGVkaXRlZFxuXHRpZiAobWVzc2FnZS5lZGl0ZWRBdCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIG1lc3NhZ2UgdmFsaWQgb25seSBpZiBpdCBpcyBhIGxpdmVjaGF0IHJvb21cblx0aWYgKCEodHlwZW9mIHJvb20udCAhPT0gJ3VuZGVmaW5lZCcgJiYgcm9vbS50ID09PSAnbCcgJiYgcm9vbS52ICYmIHJvb20udi50b2tlbikpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXNuJ3QgYSB0b2tlbiwgaXQgd2FzIE5PVCBzZW50IGZyb20gdGhlIHZpc2l0b3IsIHNvIGlnbm9yZSBpdFxuXHRpZiAoIW1lc3NhZ2UudG9rZW4pIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXMgYSB0eXBlIG1lYW5zIGl0IGlzIGEgc3BlY2lhbCBtZXNzYWdlIChsaWtlIHRoZSBjbG9zaW5nIGNvbW1lbnQpLCBzbyBza2lwc1xuXHRpZiAobWVzc2FnZS50KSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0cmV0dXJuIHRydWU7XG59XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0aWYgKCF2YWxpZGF0ZU1lc3NhZ2UobWVzc2FnZSwgcm9vbSkpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvbnN0IHBob25lUmVnZXhwID0gbmV3IFJlZ0V4cChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfbGVhZF9waG9uZV9yZWdleCcpLCAnZycpO1xuXHRjb25zdCBtc2dQaG9uZXMgPSBtZXNzYWdlLm1zZy5tYXRjaChwaG9uZVJlZ2V4cCk7XG5cblx0Y29uc3QgZW1haWxSZWdleHAgPSBuZXcgUmVnRXhwKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9sZWFkX2VtYWlsX3JlZ2V4JyksICdnaScpO1xuXHRjb25zdCBtc2dFbWFpbHMgPSBtZXNzYWdlLm1zZy5tYXRjaChlbWFpbFJlZ2V4cCk7XG5cblx0aWYgKG1zZ0VtYWlscyB8fCBtc2dQaG9uZXMpIHtcblx0XHRMaXZlY2hhdFZpc2l0b3JzLnNhdmVHdWVzdEVtYWlsUGhvbmVCeUlkKHJvb20udi5faWQsIG1zZ0VtYWlscywgbXNnUGhvbmVzKTtcblxuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignbGl2ZWNoYXQubGVhZENhcHR1cmUnLCByb29tKTtcblx0fVxuXG5cdHJldHVybiBtZXNzYWdlO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnbGVhZENhcHR1cmUnKTtcbiIsIlJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0Ly8gc2tpcHMgdGhpcyBjYWxsYmFjayBpZiB0aGUgbWVzc2FnZSB3YXMgZWRpdGVkXG5cdGlmICghbWVzc2FnZSB8fCBtZXNzYWdlLmVkaXRlZEF0KSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHQvLyBjaGVjayBpZiByb29tIGlzIHlldCBhd2FpdGluZyBmb3IgcmVzcG9uc2Vcblx0aWYgKCEodHlwZW9mIHJvb20udCAhPT0gJ3VuZGVmaW5lZCcgJiYgcm9vbS50ID09PSAnbCcgJiYgcm9vbS53YWl0aW5nUmVzcG9uc2UpKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXMgYSB0b2tlbiwgaXQgd2FzIHNlbnQgYnkgdGhlIHZpc2l0b3IsIHNvIGlnbm9yZSBpdFxuXHRpZiAobWVzc2FnZS50b2tlbikge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldFJlc3BvbnNlQnlSb29tSWQocm9vbS5faWQsIHtcblx0XHRcdHVzZXI6IHtcblx0XHRcdFx0X2lkOiBtZXNzYWdlLnUuX2lkLFxuXHRcdFx0XHR1c2VybmFtZTogbWVzc2FnZS51LnVzZXJuYW1lXG5cdFx0XHR9LFxuXHRcdFx0cmVzcG9uc2VEYXRlOiBub3csXG5cdFx0XHRyZXNwb25zZVRpbWU6IChub3cuZ2V0VGltZSgpIC0gcm9vbS50cykgLyAxMDAwXG5cdFx0fSk7XG5cdH0pO1xuXG5cdHJldHVybiBtZXNzYWdlO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnbWFya1Jvb21SZXNwb25kZWQnKTtcbiIsIlJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnbGl2ZWNoYXQub2ZmbGluZU1lc3NhZ2UnLCAoZGF0YSkgPT4ge1xuXHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF93ZWJob29rX29uX29mZmxpbmVfbXNnJykpIHtcblx0XHRyZXR1cm4gZGF0YTtcblx0fVxuXG5cdGNvbnN0IHBvc3REYXRhID0ge1xuXHRcdHR5cGU6ICdMaXZlY2hhdE9mZmxpbmVNZXNzYWdlJyxcblx0XHRzZW50QXQ6IG5ldyBEYXRlKCksXG5cdFx0dmlzaXRvcjoge1xuXHRcdFx0bmFtZTogZGF0YS5uYW1lLFxuXHRcdFx0ZW1haWw6IGRhdGEuZW1haWxcblx0XHR9LFxuXHRcdG1lc3NhZ2U6IGRhdGEubWVzc2FnZVxuXHR9O1xuXG5cdFJvY2tldENoYXQuTGl2ZWNoYXQuc2VuZFJlcXVlc3QocG9zdERhdGEpO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnbGl2ZWNoYXQtc2VuZC1lbWFpbC1vZmZsaW5lLW1lc3NhZ2UnKTtcbiIsImZ1bmN0aW9uIHNlbmRUb1JEU3RhdGlvbihyb29tKSB7XG5cdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X1JEU3RhdGlvbl9Ub2tlbicpKSB7XG5cdFx0cmV0dXJuIHJvb207XG5cdH1cblxuXHRjb25zdCBsaXZlY2hhdERhdGEgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldExpdmVjaGF0Um9vbUd1ZXN0SW5mbyhyb29tKTtcblxuXHRpZiAoIWxpdmVjaGF0RGF0YS52aXNpdG9yLmVtYWlsKSB7XG5cdFx0cmV0dXJuIHJvb207XG5cdH1cblxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdGhlYWRlcnM6IHtcblx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcblx0XHR9LFxuXHRcdGRhdGE6IHtcblx0XHRcdHRva2VuX3Jkc3RhdGlvbjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X1JEU3RhdGlvbl9Ub2tlbicpLFxuXHRcdFx0aWRlbnRpZmljYWRvcjogJ3JvY2tldGNoYXQtbGl2ZWNoYXQnLFxuXHRcdFx0Y2xpZW50X2lkOiBsaXZlY2hhdERhdGEudmlzaXRvci5faWQsXG5cdFx0XHRlbWFpbDogbGl2ZWNoYXREYXRhLnZpc2l0b3IuZW1haWxcblx0XHR9XG5cdH07XG5cblx0b3B0aW9ucy5kYXRhLm5vbWUgPSBsaXZlY2hhdERhdGEudmlzaXRvci5uYW1lIHx8IGxpdmVjaGF0RGF0YS52aXNpdG9yLnVzZXJuYW1lO1xuXG5cdGlmIChsaXZlY2hhdERhdGEudmlzaXRvci5waG9uZSkge1xuXHRcdG9wdGlvbnMuZGF0YS50ZWxlZm9uZSA9IGxpdmVjaGF0RGF0YS52aXNpdG9yLnBob25lO1xuXHR9XG5cblx0aWYgKGxpdmVjaGF0RGF0YS50YWdzKSB7XG5cdFx0b3B0aW9ucy5kYXRhLnRhZ3MgPSBsaXZlY2hhdERhdGEudGFncztcblx0fVxuXG5cdE9iamVjdC5rZXlzKGxpdmVjaGF0RGF0YS5jdXN0b21GaWVsZHMgfHwge30pLmZvckVhY2goZmllbGQgPT4ge1xuXHRcdG9wdGlvbnMuZGF0YVtmaWVsZF0gPSBsaXZlY2hhdERhdGEuY3VzdG9tRmllbGRzW2ZpZWxkXTtcblx0fSk7XG5cblx0T2JqZWN0LmtleXMobGl2ZWNoYXREYXRhLnZpc2l0b3IuY3VzdG9tRmllbGRzIHx8IHt9KS5mb3JFYWNoKGZpZWxkID0+IHtcblx0XHRvcHRpb25zLmRhdGFbZmllbGRdID0gbGl2ZWNoYXREYXRhLnZpc2l0b3IuY3VzdG9tRmllbGRzW2ZpZWxkXTtcblx0fSk7XG5cblx0dHJ5IHtcblx0XHRIVFRQLmNhbGwoJ1BPU1QnLCAnaHR0cHM6Ly93d3cucmRzdGF0aW9uLmNvbS5ici9hcGkvMS4zL2NvbnZlcnNpb25zJywgb3B0aW9ucyk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIGxlYWQgdG8gUkQgU3RhdGlvbiAtPicsIGUpO1xuXHR9XG5cblx0cmV0dXJuIHJvb207XG59XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnbGl2ZWNoYXQuY2xvc2VSb29tJywgc2VuZFRvUkRTdGF0aW9uLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5NRURJVU0sICdsaXZlY2hhdC1yZC1zdGF0aW9uLWNsb3NlLXJvb20nKTtcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdsaXZlY2hhdC5zYXZlSW5mbycsIHNlbmRUb1JEU3RhdGlvbiwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnbGl2ZWNoYXQtcmQtc3RhdGlvbi1zYXZlLWluZm8nKTtcbiIsImNvbnN0IG1zZ05hdlR5cGUgPSAnbGl2ZWNoYXRfbmF2aWdhdGlvbl9oaXN0b3J5JztcblxuY29uc3Qgc2VuZE1lc3NhZ2VUeXBlID0gKG1zZ1R5cGUpID0+IHtcblx0Y29uc3Qgc2VuZE5hdkhpc3RvcnkgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfVmlzaXRvcl9uYXZpZ2F0aW9uX2FzX2FfbWVzc2FnZScpICYmIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTZW5kX3Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5X2xpdmVjaGF0X3dlYmhvb2tfcmVxdWVzdCcpO1xuXG5cdHJldHVybiBzZW5kTmF2SGlzdG9yeSAmJiBtc2dUeXBlID09PSBtc2dOYXZUeXBlO1xufTtcblxuZnVuY3Rpb24gc2VuZFRvQ1JNKHR5cGUsIHJvb20sIGluY2x1ZGVNZXNzYWdlcyA9IHRydWUpIHtcblx0Y29uc3QgcG9zdERhdGEgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldExpdmVjaGF0Um9vbUd1ZXN0SW5mbyhyb29tKTtcblxuXHRwb3N0RGF0YS50eXBlID0gdHlwZTtcblxuXHRwb3N0RGF0YS5tZXNzYWdlcyA9IFtdO1xuXG5cdGxldCBtZXNzYWdlcztcblx0aWYgKHR5cGVvZiBpbmNsdWRlTWVzc2FnZXMgPT09ICdib29sZWFuJyAmJiBpbmNsdWRlTWVzc2FnZXMpIHtcblx0XHRtZXNzYWdlcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRWaXNpYmxlQnlSb29tSWQocm9vbS5faWQsIHsgc29ydDogeyB0czogMSB9IH0pO1xuXHR9IGVsc2UgaWYgKGluY2x1ZGVNZXNzYWdlcyBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0bWVzc2FnZXMgPSBpbmNsdWRlTWVzc2FnZXM7XG5cdH1cblxuXHRpZiAobWVzc2FnZXMpIHtcblx0XHRtZXNzYWdlcy5mb3JFYWNoKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRpZiAobWVzc2FnZS50ICYmICFzZW5kTWVzc2FnZVR5cGUobWVzc2FnZS50KSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBtc2cgPSB7XG5cdFx0XHRcdF9pZDogbWVzc2FnZS5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBtZXNzYWdlLnUudXNlcm5hbWUsXG5cdFx0XHRcdG1zZzogbWVzc2FnZS5tc2csXG5cdFx0XHRcdHRzOiBtZXNzYWdlLnRzLFxuXHRcdFx0XHRlZGl0ZWRBdDogbWVzc2FnZS5lZGl0ZWRBdFxuXHRcdFx0fTtcblxuXHRcdFx0aWYgKG1lc3NhZ2UudS51c2VybmFtZSAhPT0gcG9zdERhdGEudmlzaXRvci51c2VybmFtZSkge1xuXHRcdFx0XHRtc2cuYWdlbnRJZCA9IG1lc3NhZ2UudS5faWQ7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChtZXNzYWdlLnQgPT09IG1zZ05hdlR5cGUpIHtcblx0XHRcdFx0bXNnLm5hdmlnYXRpb24gPSBtZXNzYWdlLm5hdmlnYXRpb247XG5cdFx0XHR9XG5cblx0XHRcdHBvc3REYXRhLm1lc3NhZ2VzLnB1c2gobXNnKTtcblx0XHR9KTtcblx0fVxuXG5cdGNvbnN0IHJlc3BvbnNlID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kUmVxdWVzdChwb3N0RGF0YSk7XG5cblx0aWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5kYXRhKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2F2ZUNSTURhdGFCeVJvb21JZChyb29tLl9pZCwgcmVzcG9uc2UuZGF0YS5kYXRhKTtcblx0fVxuXG5cdHJldHVybiByb29tO1xufVxuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2xpdmVjaGF0LmNsb3NlUm9vbScsIChyb29tKSA9PiB7XG5cdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fY2xvc2UnKSkge1xuXHRcdHJldHVybiByb29tO1xuXHR9XG5cblx0cmV0dXJuIHNlbmRUb0NSTSgnTGl2ZWNoYXRTZXNzaW9uJywgcm9vbSk7XG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5NRURJVU0sICdsaXZlY2hhdC1zZW5kLWNybS1jbG9zZS1yb29tJyk7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnbGl2ZWNoYXQuc2F2ZUluZm8nLCAocm9vbSkgPT4ge1xuXHQvLyBEbyBub3Qgc2VuZCB0byBDUk0gaWYgdGhlIGNoYXQgaXMgc3RpbGwgb3BlblxuXHRpZiAocm9vbS5vcGVuKSB7XG5cdFx0cmV0dXJuIHJvb207XG5cdH1cblxuXHRyZXR1cm4gc2VuZFRvQ1JNKCdMaXZlY2hhdEVkaXQnLCByb29tKTtcbn0sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5Lk1FRElVTSwgJ2xpdmVjaGF0LXNlbmQtY3JtLXNhdmUtaW5mbycpO1xuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCBmdW5jdGlvbihtZXNzYWdlLCByb29tKSB7XG5cdC8vIG9ubHkgY2FsbCB3ZWJob29rIGlmIGl0IGlzIGEgbGl2ZWNoYXQgcm9vbVxuXHRpZiAocm9vbS50ICE9PSAnbCcgfHwgcm9vbS52ID09IG51bGwgfHwgcm9vbS52LnRva2VuID09IG51bGwpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHRva2VuLCBpdCB3YXMgc2VudCBmcm9tIHRoZSB2aXNpdG9yXG5cdC8vIGlmIG5vdCwgaXQgd2FzIHNlbnQgZnJvbSB0aGUgYWdlbnRcblx0aWYgKG1lc3NhZ2UudG9rZW4pIHtcblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF93ZWJob29rX29uX3Zpc2l0b3JfbWVzc2FnZScpKSB7XG5cdFx0XHRyZXR1cm4gbWVzc2FnZTtcblx0XHR9XG5cdH0gZWxzZSBpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF93ZWJob29rX29uX2FnZW50X21lc3NhZ2UnKSkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHR5cGUgbWVhbnMgaXQgaXMgYSBzcGVjaWFsIG1lc3NhZ2UgKGxpa2UgdGhlIGNsb3NpbmcgY29tbWVudCksIHNvIHNraXBzXG5cdC8vIHVubGVzcyB0aGUgc2V0dGluZ3MgdGhhdCBoYW5kbGUgd2l0aCB2aXNpdG9yIG5hdmlnYXRpb24gaGlzdG9yeSBhcmUgZW5hYmxlZFxuXHRpZiAobWVzc2FnZS50ICYmICFzZW5kTWVzc2FnZVR5cGUobWVzc2FnZS50KSkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0c2VuZFRvQ1JNKCdNZXNzYWdlJywgcm9vbSwgW21lc3NhZ2VdKTtcblx0cmV0dXJuIG1lc3NhZ2U7XG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5NRURJVU0sICdsaXZlY2hhdC1zZW5kLWNybS1tZXNzYWdlJyk7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnbGl2ZWNoYXQubGVhZENhcHR1cmUnLCAocm9vbSkgPT4ge1xuXHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF93ZWJob29rX29uX2NhcHR1cmUnKSkge1xuXHRcdHJldHVybiByb29tO1xuXHR9XG5cdHJldHVybiBzZW5kVG9DUk0oJ0xlYWRDYXB0dXJlJywgcm9vbSwgZmFsc2UpO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnbGl2ZWNoYXQtc2VuZC1jcm0tbGVhZC1jYXB0dXJlJyk7XG4iLCJpbXBvcnQgT21uaUNoYW5uZWwgZnJvbSAnLi4vbGliL09tbmlDaGFubmVsJztcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlclNhdmVNZXNzYWdlJywgZnVuY3Rpb24obWVzc2FnZSwgcm9vbSkge1xuXHQvLyBza2lwcyB0aGlzIGNhbGxiYWNrIGlmIHRoZSBtZXNzYWdlIHdhcyBlZGl0ZWRcblx0aWYgKG1lc3NhZ2UuZWRpdGVkQXQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0VuYWJsZWQnKSB8fCAhUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknKSkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Ly8gb25seSBzZW5kIHRoZSBzbXMgYnkgU01TIGlmIGl0IGlzIGEgbGl2ZWNoYXQgcm9vbSB3aXRoIFNNUyBzZXQgdG8gdHJ1ZVxuXHRpZiAoISh0eXBlb2Ygcm9vbS50ICE9PSAndW5kZWZpbmVkJyAmJiByb29tLnQgPT09ICdsJyAmJiByb29tLmZhY2Vib29rICYmIHJvb20udiAmJiByb29tLnYudG9rZW4pKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXMgYSB0b2tlbiwgaXQgd2FzIHNlbnQgZnJvbSB0aGUgdmlzaXRvciwgc28gaWdub3JlIGl0XG5cdGlmIChtZXNzYWdlLnRva2VuKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXMgYSB0eXBlIG1lYW5zIGl0IGlzIGEgc3BlY2lhbCBtZXNzYWdlIChsaWtlIHRoZSBjbG9zaW5nIGNvbW1lbnQpLCBzbyBza2lwc1xuXHRpZiAobWVzc2FnZS50KSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRPbW5pQ2hhbm5lbC5yZXBseSh7XG5cdFx0cGFnZTogcm9vbS5mYWNlYm9vay5wYWdlLmlkLFxuXHRcdHRva2VuOiByb29tLnYudG9rZW4sXG5cdFx0dGV4dDogbWVzc2FnZS5tc2dcblx0fSk7XG5cblx0cmV0dXJuIG1lc3NhZ2U7XG5cbn0sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ3NlbmRNZXNzYWdlVG9GYWNlYm9vaycpO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6YWRkQWdlbnQnKHVzZXJuYW1lKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmFkZEFnZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5hZGRBZ2VudCh1c2VybmFtZSk7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6YWRkTWFuYWdlcicodXNlcm5hbWUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6YWRkTWFuYWdlcicgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQuYWRkTWFuYWdlcih1c2VybmFtZSk7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6Y2hhbmdlTGl2ZWNoYXRTdGF0dXMnKCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6Y2hhbmdlTGl2ZWNoYXRTdGF0dXMnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0Y29uc3QgbmV3U3RhdHVzID0gdXNlci5zdGF0dXNMaXZlY2hhdCA9PT0gJ2F2YWlsYWJsZScgPyAnbm90LWF2YWlsYWJsZScgOiAnYXZhaWxhYmxlJztcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRMaXZlY2hhdFN0YXR1cyh1c2VyLl9pZCwgbmV3U3RhdHVzKTtcblx0fVxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmNsb3NlQnlWaXNpdG9yJyh7IHJvb21JZCwgdG9rZW4gfSkge1xuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lT3BlbkJ5VmlzaXRvclRva2VuKHRva2VuLCByb29tSWQpO1xuXG5cdFx0aWYgKCFyb29tIHx8ICFyb29tLm9wZW4pIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbik7XG5cblx0XHRjb25zdCBsYW5ndWFnZSA9ICh2aXNpdG9yICYmIHZpc2l0b3IubGFuZ3VhZ2UpIHx8IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdsYW5ndWFnZScpIHx8ICdlbic7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5jbG9zZVJvb20oe1xuXHRcdFx0dmlzaXRvcixcblx0XHRcdHJvb20sXG5cdFx0XHRjb21tZW50OiBUQVBpMThuLl9fKCdDbG9zZWRfYnlfdmlzaXRvcicsIHsgbG5nOiBsYW5ndWFnZSB9KVxuXHRcdH0pO1xuXHR9XG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmNsb3NlUm9vbScocm9vbUlkLCBjb21tZW50KSB7XG5cdFx0Y29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuXHRcdGlmICghdXNlcklkIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnY2xvc2UtbGl2ZWNoYXQtcm9vbScpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6Y2xvc2VSb29tJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUlkKTtcblxuXHRcdGlmICghcm9vbSB8fCByb29tLnQgIT09ICdsJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcigncm9vbS1ub3QtZm91bmQnLCAnUm9vbSBub3QgZm91bmQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmNsb3NlUm9vbScgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlciA9IE1ldGVvci51c2VyKCk7XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb29tSWQsIHVzZXIuX2lkLCB7IF9pZDogMSB9KTtcblx0XHRpZiAoIXN1YnNjcmlwdGlvbiAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXJJZCwgJ2Nsb3NlLW90aGVycy1saXZlY2hhdC1yb29tJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpjbG9zZVJvb20nIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LmNsb3NlUm9vbSh7XG5cdFx0XHR1c2VyLFxuXHRcdFx0cm9vbSxcblx0XHRcdGNvbW1lbnRcblx0XHR9KTtcblx0fVxufSk7XG4iLCJpbXBvcnQgT21uaUNoYW5uZWwgZnJvbSAnLi4vbGliL09tbmlDaGFubmVsJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6ZmFjZWJvb2snKG9wdGlvbnMpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6YWRkQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRzd2l0Y2ggKG9wdGlvbnMuYWN0aW9uKSB7XG5cdFx0XHRcdGNhc2UgJ2luaXRpYWxTdGF0ZSc6IHtcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0ZW5hYmxlZDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0VuYWJsZWQnKSxcblx0XHRcdFx0XHRcdGhhc1Rva2VuOiAhIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5Jylcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FzZSAnZW5hYmxlJzoge1xuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IE9tbmlDaGFubmVsLmVuYWJsZSgpO1xuXG5cdFx0XHRcdFx0aWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdMaXZlY2hhdF9GYWNlYm9va19FbmFibGVkJywgdHJ1ZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYXNlICdkaXNhYmxlJzoge1xuXHRcdFx0XHRcdE9tbmlDaGFubmVsLmRpc2FibGUoKTtcblxuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoJ0xpdmVjaGF0X0ZhY2Vib29rX0VuYWJsZWQnLCBmYWxzZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYXNlICdsaXN0LXBhZ2VzJzoge1xuXHRcdFx0XHRcdHJldHVybiBPbW5pQ2hhbm5lbC5saXN0UGFnZXMoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhc2UgJ3N1YnNjcmliZSc6IHtcblx0XHRcdFx0XHRyZXR1cm4gT21uaUNoYW5uZWwuc3Vic2NyaWJlKG9wdGlvbnMucGFnZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYXNlICd1bnN1YnNjcmliZSc6IHtcblx0XHRcdFx0XHRyZXR1cm4gT21uaUNoYW5uZWwudW5zdWJzY3JpYmUob3B0aW9ucy5wYWdlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGlmIChlLnJlc3BvbnNlICYmIGUucmVzcG9uc2UuZGF0YSAmJiBlLnJlc3BvbnNlLmRhdGEuZXJyb3IpIHtcblx0XHRcdFx0aWYgKGUucmVzcG9uc2UuZGF0YS5lcnJvci5lcnJvcikge1xuXHRcdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoZS5yZXNwb25zZS5kYXRhLmVycm9yLmVycm9yLCBlLnJlc3BvbnNlLmRhdGEuZXJyb3IubWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGUucmVzcG9uc2UuZGF0YS5lcnJvci5yZXNwb25zZSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludGVncmF0aW9uLWVycm9yJywgZS5yZXNwb25zZS5kYXRhLmVycm9yLnJlc3BvbnNlLmVycm9yLm1lc3NhZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChlLnJlc3BvbnNlLmRhdGEuZXJyb3IubWVzc2FnZSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludGVncmF0aW9uLWVycm9yJywgZS5yZXNwb25zZS5kYXRhLmVycm9yLm1lc3NhZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmVycm9yKCdFcnJvciBjb250YWN0aW5nIG9tbmkucm9ja2V0LmNoYXQ6JywgZSk7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnRlZ3JhdGlvbi1lcnJvcicsIGUuZXJyb3IpO1xuXHRcdH1cblx0fVxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpnZXRDdXN0b21GaWVsZHMnKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmZpbmQoKS5mZXRjaCgpO1xuXHR9XG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6Z2V0QWdlbnREYXRhJyh7IHJvb21JZCwgdG9rZW4gfSkge1xuXHRcdGNoZWNrKHJvb21JZCwgU3RyaW5nKTtcblx0XHRjaGVjayh0b2tlbiwgU3RyaW5nKTtcblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuKTtcblxuXHRcdC8vIGFsbG93IHRvIG9ubHkgdXNlciB0byBzZW5kIHRyYW5zY3JpcHRzIGZyb20gdGhlaXIgb3duIGNoYXRzXG5cdFx0aWYgKCFyb29tIHx8IHJvb20udCAhPT0gJ2wnIHx8ICFyb29tLnYgfHwgcm9vbS52LnRva2VuICE9PSB2aXNpdG9yLnRva2VuKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFyb29tLnNlcnZlZEJ5KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldEFnZW50SW5mbyhyb29tLnNlcnZlZEJ5Ll9pZCk7XG5cdH1cbn0pO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbmltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6Z2V0SW5pdGlhbERhdGEnKHZpc2l0b3JUb2tlbikge1xuXHRcdGNvbnN0IGluZm8gPSB7XG5cdFx0XHRlbmFibGVkOiBudWxsLFxuXHRcdFx0dGl0bGU6IG51bGwsXG5cdFx0XHRjb2xvcjogbnVsbCxcblx0XHRcdHJlZ2lzdHJhdGlvbkZvcm06IG51bGwsXG5cdFx0XHRyb29tOiBudWxsLFxuXHRcdFx0dmlzaXRvcjogbnVsbCxcblx0XHRcdHRyaWdnZXJzOiBbXSxcblx0XHRcdGRlcGFydG1lbnRzOiBbXSxcblx0XHRcdGFsbG93U3dpdGNoaW5nRGVwYXJ0bWVudHM6IG51bGwsXG5cdFx0XHRvbmxpbmU6IHRydWUsXG5cdFx0XHRvZmZsaW5lQ29sb3I6IG51bGwsXG5cdFx0XHRvZmZsaW5lTWVzc2FnZTogbnVsbCxcblx0XHRcdG9mZmxpbmVTdWNjZXNzTWVzc2FnZTogbnVsbCxcblx0XHRcdG9mZmxpbmVVbmF2YWlsYWJsZU1lc3NhZ2U6IG51bGwsXG5cdFx0XHRkaXNwbGF5T2ZmbGluZUZvcm06IG51bGwsXG5cdFx0XHR2aWRlb0NhbGw6IG51bGwsXG5cdFx0XHRmaWxlVXBsb2FkOiBudWxsLFxuXHRcdFx0Y29udmVyc2F0aW9uRmluaXNoZWRNZXNzYWdlOiBudWxsLFxuXHRcdFx0bmFtZUZpZWxkUmVnaXN0cmF0aW9uRm9ybTogbnVsbCxcblx0XHRcdGVtYWlsRmllbGRSZWdpc3RyYXRpb25Gb3JtOiBudWxsXG5cdFx0fTtcblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHZpc2l0b3JUb2tlbiwge1xuXHRcdFx0ZmllbGRzOiB7XG5cdFx0XHRcdG5hbWU6IDEsXG5cdFx0XHRcdHQ6IDEsXG5cdFx0XHRcdGNsOiAxLFxuXHRcdFx0XHR1OiAxLFxuXHRcdFx0XHR1c2VybmFtZXM6IDEsXG5cdFx0XHRcdHY6IDEsXG5cdFx0XHRcdHNlcnZlZEJ5OiAxXG5cdFx0XHR9XG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdGlmIChyb29tICYmIHJvb20ubGVuZ3RoID4gMCkge1xuXHRcdFx0aW5mby5yb29tID0gcm9vbVswXTtcblx0XHR9XG5cblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih2aXNpdG9yVG9rZW4sIHtcblx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHRuYW1lOiAxLFxuXHRcdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdFx0dmlzaXRvckVtYWlsczogMVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0aWYgKHJvb20pIHtcblx0XHRcdGluZm8udmlzaXRvciA9IHZpc2l0b3I7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW5pdFNldHRpbmdzID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRJbml0U2V0dGluZ3MoKTtcblxuXHRcdGluZm8udGl0bGUgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfdGl0bGU7XG5cdFx0aW5mby5jb2xvciA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF90aXRsZV9jb2xvcjtcblx0XHRpbmZvLmVuYWJsZWQgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZW5hYmxlZDtcblx0XHRpbmZvLnJlZ2lzdHJhdGlvbkZvcm0gPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfcmVnaXN0cmF0aW9uX2Zvcm07XG5cdFx0aW5mby5vZmZsaW5lVGl0bGUgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfb2ZmbGluZV90aXRsZTtcblx0XHRpbmZvLm9mZmxpbmVDb2xvciA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yO1xuXHRcdGluZm8ub2ZmbGluZU1lc3NhZ2UgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlO1xuXHRcdGluZm8ub2ZmbGluZVN1Y2Nlc3NNZXNzYWdlID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X29mZmxpbmVfc3VjY2Vzc19tZXNzYWdlO1xuXHRcdGluZm8ub2ZmbGluZVVuYXZhaWxhYmxlTWVzc2FnZSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9vZmZsaW5lX2Zvcm1fdW5hdmFpbGFibGU7XG5cdFx0aW5mby5kaXNwbGF5T2ZmbGluZUZvcm0gPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZGlzcGxheV9vZmZsaW5lX2Zvcm07XG5cdFx0aW5mby5sYW5ndWFnZSA9IGluaXRTZXR0aW5ncy5MYW5ndWFnZTtcblx0XHRpbmZvLnZpZGVvQ2FsbCA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF92aWRlb2NhbGxfZW5hYmxlZCA9PT0gdHJ1ZSAmJiBpbml0U2V0dGluZ3MuSml0c2lfRW5hYmxlZCA9PT0gdHJ1ZTtcblx0XHRpbmZvLmZpbGVVcGxvYWQgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZmlsZXVwbG9hZF9lbmFibGVkICYmIGluaXRTZXR0aW5ncy5GaWxlVXBsb2FkX0VuYWJsZWQ7XG5cdFx0aW5mby50cmFuc2NyaXB0ID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0O1xuXHRcdGluZm8udHJhbnNjcmlwdE1lc3NhZ2UgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfdHJhbnNjcmlwdF9tZXNzYWdlO1xuXHRcdGluZm8uY29udmVyc2F0aW9uRmluaXNoZWRNZXNzYWdlID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X2NvbnZlcnNhdGlvbl9maW5pc2hlZF9tZXNzYWdlO1xuXHRcdGluZm8ubmFtZUZpZWxkUmVnaXN0cmF0aW9uRm9ybSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9uYW1lX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtO1xuXHRcdGluZm8uZW1haWxGaWVsZFJlZ2lzdHJhdGlvbkZvcm0gPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZW1haWxfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm07XG5cblx0XHRpbmZvLmFnZW50RGF0YSA9IHJvb20gJiYgcm9vbVswXSAmJiByb29tWzBdLnNlcnZlZEJ5ICYmIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldEFnZW50SW5mbyhyb29tWzBdLnNlcnZlZEJ5Ll9pZCk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdFRyaWdnZXIuZmluZEVuYWJsZWQoKS5mb3JFYWNoKCh0cmlnZ2VyKSA9PiB7XG5cdFx0XHRpbmZvLnRyaWdnZXJzLnB1c2goXy5waWNrKHRyaWdnZXIsICdfaWQnLCAnYWN0aW9ucycsICdjb25kaXRpb25zJykpO1xuXHRcdH0pO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmRFbmFibGVkV2l0aEFnZW50cygpLmZvckVhY2goKGRlcGFydG1lbnQpID0+IHtcblx0XHRcdGluZm8uZGVwYXJ0bWVudHMucHVzaChkZXBhcnRtZW50KTtcblx0XHR9KTtcblx0XHRpbmZvLmFsbG93U3dpdGNoaW5nRGVwYXJ0bWVudHMgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfYWxsb3dfc3dpdGNoaW5nX2RlcGFydG1lbnRzO1xuXG5cdFx0aW5mby5vbmxpbmUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25saW5lQWdlbnRzKCkuY291bnQoKSA+IDA7XG5cdFx0cmV0dXJuIGluZm87XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6Z2V0TmV4dEFnZW50Jyh7IHRva2VuLCBkZXBhcnRtZW50IH0pIHtcblx0XHRjaGVjayh0b2tlbiwgU3RyaW5nKTtcblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHRva2VuKS5mZXRjaCgpO1xuXG5cdFx0aWYgKHJvb20gJiYgcm9vbS5sZW5ndGggPiAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCFkZXBhcnRtZW50KSB7XG5cdFx0XHRjb25zdCByZXF1aXJlRGVwYXJtZW50ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRSZXF1aXJlZERlcGFydG1lbnQoKTtcblx0XHRcdGlmIChyZXF1aXJlRGVwYXJtZW50KSB7XG5cdFx0XHRcdGRlcGFydG1lbnQgPSByZXF1aXJlRGVwYXJtZW50Ll9pZDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCBhZ2VudCA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0TmV4dEFnZW50KGRlcGFydG1lbnQpO1xuXHRcdGlmICghYWdlbnQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvKGFnZW50LmFnZW50SWQpO1xuXHR9XG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6bG9hZEhpc3RvcnknKHsgdG9rZW4sIHJpZCwgZW5kLCBsaW1pdCA9IDIwLCBsc30pIHtcblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbiwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cblx0XHRpZiAoIXZpc2l0b3IpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5sb2FkTWVzc2FnZUhpc3RvcnkoeyB1c2VySWQ6IHZpc2l0b3IuX2lkLCByaWQsIGVuZCwgbGltaXQsIGxzIH0pO1xuXHR9XG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6bG9naW5CeVRva2VuJyh0b2tlbikge1xuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblxuXHRcdGlmICghdmlzaXRvcikge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRfaWQ6IHZpc2l0b3IuX2lkXG5cdFx0fTtcblx0fVxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpwYWdlVmlzaXRlZCcodG9rZW4sIHJvb20sIHBhZ2VJbmZvKSB7XG5cdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zYXZlUGFnZUhpc3RvcnkodG9rZW4sIHJvb20sIHBhZ2VJbmZvKTtcblx0fVxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnJlZ2lzdGVyR3Vlc3QnKHsgdG9rZW4sIG5hbWUsIGVtYWlsLCBkZXBhcnRtZW50IH0gPSB7fSkge1xuXHRcdGNvbnN0IHVzZXJJZCA9IFJvY2tldENoYXQuTGl2ZWNoYXQucmVnaXN0ZXJHdWVzdC5jYWxsKHRoaXMsIHtcblx0XHRcdHRva2VuLFxuXHRcdFx0bmFtZSxcblx0XHRcdGVtYWlsLFxuXHRcdFx0ZGVwYXJ0bWVudFxuXHRcdH0pO1xuXG5cdFx0Ly8gdXBkYXRlIHZpc2l0ZWQgcGFnZSBoaXN0b3J5IHRvIG5vdCBleHBpcmVcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5rZWVwSGlzdG9yeUZvclRva2VuKHRva2VuKTtcblxuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuLCB7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0dG9rZW46IDEsXG5cdFx0XHRcdG5hbWU6IDEsXG5cdFx0XHRcdHVzZXJuYW1lOiAxLFxuXHRcdFx0XHR2aXNpdG9yRW1haWxzOiAxXG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvL0lmIGl0J3MgdXBkYXRpbmcgYW4gZXhpc3RpbmcgdmlzaXRvciwgaXQgbXVzdCBhbHNvIHVwZGF0ZSB0aGUgcm9vbUluZm9cblx0XHRjb25zdCBjdXJzb3IgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHRva2VuKTtcblx0XHRjdXJzb3IuZm9yRWFjaCgocm9vbSkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zYXZlUm9vbUluZm8ocm9vbSwgdmlzaXRvcik7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0dXNlcklkLFxuXHRcdFx0dmlzaXRvclxuXHRcdH07XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmVtb3ZlQWdlbnQnKHVzZXJuYW1lKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZUFnZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZW1vdmVBZ2VudCh1c2VybmFtZSk7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmVtb3ZlQ3VzdG9tRmllbGQnKF9pZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVDdXN0b21GaWVsZCcgfSk7XG5cdFx0fVxuXG5cdFx0Y2hlY2soX2lkLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3QgY3VzdG9tRmllbGQgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmZpbmRPbmVCeUlkKF9pZCwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cblx0XHRpZiAoIWN1c3RvbUZpZWxkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWN1c3RvbS1maWVsZCcsICdDdXN0b20gZmllbGQgbm90IGZvdW5kJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVDdXN0b21GaWVsZCcgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQucmVtb3ZlQnlJZChfaWQpO1xuXHR9XG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnJlbW92ZURlcGFydG1lbnQnKF9pZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVEZXBhcnRtZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZW1vdmVEZXBhcnRtZW50KF9pZCk7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmVtb3ZlTWFuYWdlcicodXNlcm5hbWUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlTWFuYWdlcicgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQucmVtb3ZlTWFuYWdlcih1c2VybmFtZSk7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmVtb3ZlVHJpZ2dlcicodHJpZ2dlcklkKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZVRyaWdnZXInIH0pO1xuXHRcdH1cblxuXHRcdGNoZWNrKHRyaWdnZXJJZCwgU3RyaW5nKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdFRyaWdnZXIucmVtb3ZlQnlJZCh0cmlnZ2VySWQpO1xuXHR9XG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnJlbW92ZVJvb20nKHJpZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAncmVtb3ZlLWNsb3NlZC1saXZlY2hhdC1yb29tcycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlUm9vbScgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJpZCk7XG5cblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZVJvb20nXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAocm9vbS50ICE9PSAnbCcpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXRoaXMtaXMtbm90LWEtbGl2ZWNoYXQtcm9vbScsICdUaGlzIGlzIG5vdCBhIExpdmVjaGF0IHJvb20nLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZVJvb20nXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAocm9vbS5vcGVuKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLWlzLW5vdC1jbG9zZWQnLCAnUm9vbSBpcyBub3QgY2xvc2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVSb29tJ1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMucmVtb3ZlQnlSb29tSWQocmlkKTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnJlbW92ZUJ5Um9vbUlkKHJpZCk7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLnJlbW92ZUJ5SWQocmlkKTtcblx0fVxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzYXZlQXBwZWFyYW5jZScoc2V0dGluZ3MpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZUFwcGVhcmFuY2UnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZhbGlkU2V0dGluZ3MgPSBbXG5cdFx0XHQnTGl2ZWNoYXRfdGl0bGUnLFxuXHRcdFx0J0xpdmVjaGF0X3RpdGxlX2NvbG9yJyxcblx0XHRcdCdMaXZlY2hhdF9zaG93X2FnZW50X2VtYWlsJyxcblx0XHRcdCdMaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybScsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9mb3JtX3VuYXZhaWxhYmxlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX21lc3NhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfc3VjY2Vzc19tZXNzYWdlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX2VtYWlsJyxcblx0XHRcdCdMaXZlY2hhdF9jb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZScsXG5cdFx0XHQnTGl2ZWNoYXRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXHRcdFx0J0xpdmVjaGF0X25hbWVfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXHRcdFx0J0xpdmVjaGF0X2VtYWlsX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtJ1xuXHRcdF07XG5cblx0XHRjb25zdCB2YWxpZCA9IHNldHRpbmdzLmV2ZXJ5KChzZXR0aW5nKSA9PiB7XG5cdFx0XHRyZXR1cm4gdmFsaWRTZXR0aW5ncy5pbmRleE9mKHNldHRpbmcuX2lkKSAhPT0gLTE7XG5cdFx0fSk7XG5cblx0XHRpZiAoIXZhbGlkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXNldHRpbmcnKTtcblx0XHR9XG5cblx0XHRzZXR0aW5ncy5mb3JFYWNoKChzZXR0aW5nKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoc2V0dGluZy5faWQsIHNldHRpbmcudmFsdWUpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuO1xuXHR9XG59KTtcbiIsIi8qIGVzbGludCBuZXctY2FwOiBbMiwge1wiY2FwSXNOZXdFeGNlcHRpb25zXCI6IFtcIk1hdGNoLk9iamVjdEluY2x1ZGluZ1wiLCBcIk1hdGNoLk9wdGlvbmFsXCJdfV0gKi9cblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZUN1c3RvbUZpZWxkJyhfaWQsIGN1c3RvbUZpZWxkRGF0YSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlQ3VzdG9tRmllbGQnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChfaWQpIHtcblx0XHRcdGNoZWNrKF9pZCwgU3RyaW5nKTtcblx0XHR9XG5cblx0XHRjaGVjayhjdXN0b21GaWVsZERhdGEsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7IGZpZWxkOiBTdHJpbmcsIGxhYmVsOiBTdHJpbmcsIHNjb3BlOiBTdHJpbmcsIHZpc2liaWxpdHk6IFN0cmluZyB9KSk7XG5cblx0XHRpZiAoIS9eWzAtOWEtekEtWi1fXSskLy50ZXN0KGN1c3RvbUZpZWxkRGF0YS5maWVsZCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtY3VzdG9tLWZpZWxkLW5tYWUnLCAnSW52YWxpZCBjdXN0b20gZmllbGQgbmFtZS4gVXNlIG9ubHkgbGV0dGVycywgbnVtYmVycywgaHlwaGVucyBhbmQgdW5kZXJzY29yZXMuJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlQ3VzdG9tRmllbGQnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChfaWQpIHtcblx0XHRcdGNvbnN0IGN1c3RvbUZpZWxkID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRDdXN0b21GaWVsZC5maW5kT25lQnlJZChfaWQpO1xuXHRcdFx0aWYgKCFjdXN0b21GaWVsZCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWN1c3RvbS1maWVsZCcsICdDdXN0b20gRmllbGQgTm90IGZvdW5kJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlQ3VzdG9tRmllbGQnIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmNyZWF0ZU9yVXBkYXRlQ3VzdG9tRmllbGQoX2lkLCBjdXN0b21GaWVsZERhdGEuZmllbGQsIGN1c3RvbUZpZWxkRGF0YS5sYWJlbCwgY3VzdG9tRmllbGREYXRhLnNjb3BlLCBjdXN0b21GaWVsZERhdGEudmlzaWJpbGl0eSk7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZURlcGFydG1lbnQnKF9pZCwgZGVwYXJ0bWVudERhdGEsIGRlcGFydG1lbnRBZ2VudHMpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZURlcGFydG1lbnQnIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnNhdmVEZXBhcnRtZW50KF9pZCwgZGVwYXJ0bWVudERhdGEsIGRlcGFydG1lbnRBZ2VudHMpO1xuXHR9XG59KTtcbiIsIi8qIGVzbGludCBuZXctY2FwOiBbMiwge1wiY2FwSXNOZXdFeGNlcHRpb25zXCI6IFtcIk1hdGNoLk9iamVjdEluY2x1ZGluZ1wiLCBcIk1hdGNoLk9wdGlvbmFsXCJdfV0gKi9cblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZUluZm8nKGd1ZXN0RGF0YSwgcm9vbURhdGEpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlSW5mbycgfSk7XG5cdFx0fVxuXG5cdFx0Y2hlY2soZ3Vlc3REYXRhLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0X2lkOiBTdHJpbmcsXG5cdFx0XHRuYW1lOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdFx0ZW1haWw6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRwaG9uZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuXHRcdH0pKTtcblxuXHRcdGNoZWNrKHJvb21EYXRhLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0X2lkOiBTdHJpbmcsXG5cdFx0XHR0b3BpYzogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdHRhZ3M6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcblx0XHR9KSk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbURhdGEuX2lkLCB7ZmllbGRzOiB7dDogMSwgc2VydmVkQnk6IDF9fSk7XG5cblx0XHRpZiAocm9vbSA9PSBudWxsIHx8IHJvb20udCAhPT0gJ2wnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlSW5mbycgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCghcm9vbS5zZXJ2ZWRCeSB8fCByb29tLnNlcnZlZEJ5Ll9pZCAhPT0gTWV0ZW9yLnVzZXJJZCgpKSAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3NhdmUtb3RoZXJzLWxpdmVjaGF0LXJvb20taW5mbycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZUluZm8nIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJldCA9IFJvY2tldENoYXQuTGl2ZWNoYXQuc2F2ZUd1ZXN0KGd1ZXN0RGF0YSkgJiYgUm9ja2V0Q2hhdC5MaXZlY2hhdC5zYXZlUm9vbUluZm8ocm9vbURhdGEsIGd1ZXN0RGF0YSk7XG5cblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdsaXZlY2hhdC5zYXZlSW5mbycsIFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21EYXRhLl9pZCkpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHJldDtcblx0fVxufSk7XG4iLCJpbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNhdmVJbnRlZ3JhdGlvbicodmFsdWVzKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVJbnRlZ3JhdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZXNbJ0xpdmVjaGF0X3dlYmhvb2tVcmwnXSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnTGl2ZWNoYXRfd2ViaG9va1VybCcsIHMudHJpbSh2YWx1ZXNbJ0xpdmVjaGF0X3dlYmhvb2tVcmwnXSkpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgdmFsdWVzWydMaXZlY2hhdF9zZWNyZXRfdG9rZW4nXSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnTGl2ZWNoYXRfc2VjcmV0X3Rva2VuJywgcy50cmltKHZhbHVlc1snTGl2ZWNoYXRfc2VjcmV0X3Rva2VuJ10pKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHZhbHVlc1snTGl2ZWNoYXRfd2ViaG9va19vbl9jbG9zZSddICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdMaXZlY2hhdF93ZWJob29rX29uX2Nsb3NlJywgISF2YWx1ZXNbJ0xpdmVjaGF0X3dlYmhvb2tfb25fY2xvc2UnXSk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZXNbJ0xpdmVjaGF0X3dlYmhvb2tfb25fb2ZmbGluZV9tc2cnXSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnTGl2ZWNoYXRfd2ViaG9va19vbl9vZmZsaW5lX21zZycsICEhdmFsdWVzWydMaXZlY2hhdF93ZWJob29rX29uX29mZmxpbmVfbXNnJ10pO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgdmFsdWVzWydMaXZlY2hhdF93ZWJob29rX29uX3Zpc2l0b3JfbWVzc2FnZSddICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdMaXZlY2hhdF93ZWJob29rX29uX3Zpc2l0b3JfbWVzc2FnZScsICEhdmFsdWVzWydMaXZlY2hhdF93ZWJob29rX29uX3Zpc2l0b3JfbWVzc2FnZSddKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHZhbHVlc1snTGl2ZWNoYXRfd2ViaG9va19vbl9hZ2VudF9tZXNzYWdlJ10gIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZScsICEhdmFsdWVzWydMaXZlY2hhdF93ZWJob29rX29uX2FnZW50X21lc3NhZ2UnXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuO1xuXHR9XG59KTtcbiIsIi8qIGVzbGludCBuZXctY2FwOiBbMiwge1wiY2FwSXNOZXdFeGNlcHRpb25zXCI6IFtcIk1hdGNoLk9iamVjdEluY2x1ZGluZ1wiXX1dICovXG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZVN1cnZleUZlZWRiYWNrJyh2aXNpdG9yVG9rZW4sIHZpc2l0b3JSb29tLCBmb3JtRGF0YSkge1xuXHRcdGNoZWNrKHZpc2l0b3JUb2tlbiwgU3RyaW5nKTtcblx0XHRjaGVjayh2aXNpdG9yUm9vbSwgU3RyaW5nKTtcblx0XHRjaGVjayhmb3JtRGF0YSwgW01hdGNoLk9iamVjdEluY2x1ZGluZyh7IG5hbWU6IFN0cmluZywgdmFsdWU6IFN0cmluZyB9KV0pO1xuXG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odmlzaXRvclRva2VuKTtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQodmlzaXRvclJvb20pO1xuXG5cdFx0aWYgKHZpc2l0b3IgIT09IHVuZGVmaW5lZCAmJiByb29tICE9PSB1bmRlZmluZWQgJiYgcm9vbS52ICE9PSB1bmRlZmluZWQgJiYgcm9vbS52LnRva2VuID09PSB2aXNpdG9yLnRva2VuKSB7XG5cdFx0XHRjb25zdCB1cGRhdGVEYXRhID0ge307XG5cdFx0XHRmb3IgKGNvbnN0IGl0ZW0gb2YgZm9ybURhdGEpIHtcblx0XHRcdFx0aWYgKF8uY29udGFpbnMoWydzYXRpc2ZhY3Rpb24nLCAnYWdlbnRLbm93bGVkZ2UnLCAnYWdlbnRSZXNwb3NpdmVuZXNzJywgJ2FnZW50RnJpZW5kbGluZXNzJ10sIGl0ZW0ubmFtZSkgJiYgXy5jb250YWlucyhbJzEnLCAnMicsICczJywgJzQnLCAnNSddLCBpdGVtLnZhbHVlKSkge1xuXHRcdFx0XHRcdHVwZGF0ZURhdGFbaXRlbS5uYW1lXSA9IGl0ZW0udmFsdWU7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaXRlbS5uYW1lID09PSAnYWRkaXRpb25hbEZlZWRiYWNrJykge1xuXHRcdFx0XHRcdHVwZGF0ZURhdGFbaXRlbS5uYW1lXSA9IGl0ZW0udmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICghXy5pc0VtcHR5KHVwZGF0ZURhdGEpKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVTdXJ2ZXlGZWVkYmFja0J5SWQocm9vbS5faWQsIHVwZGF0ZURhdGEpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzYXZlVHJpZ2dlcicodHJpZ2dlcikge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlVHJpZ2dlcicgfSk7XG5cdFx0fVxuXG5cdFx0Y2hlY2sodHJpZ2dlciwge1xuXHRcdFx0X2lkOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0bmFtZTogU3RyaW5nLFxuXHRcdFx0ZGVzY3JpcHRpb246IFN0cmluZyxcblx0XHRcdGVuYWJsZWQ6IEJvb2xlYW4sXG5cdFx0XHRjb25kaXRpb25zOiBBcnJheSxcblx0XHRcdGFjdGlvbnM6IEFycmF5XG5cdFx0fSk7XG5cblx0XHRpZiAodHJpZ2dlci5faWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdFRyaWdnZXIudXBkYXRlQnlJZCh0cmlnZ2VyLl9pZCwgdHJpZ2dlcik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdFRyaWdnZXIuaW5zZXJ0KHRyaWdnZXIpO1xuXHRcdH1cblx0fVxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2VhcmNoQWdlbnQnKHVzZXJuYW1lKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNlYXJjaEFnZW50JyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIXVzZXJuYW1lIHx8ICFfLmlzU3RyaW5nKHVzZXJuYW1lKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1hcmd1bWVudHMnLCAnSW52YWxpZCBhcmd1bWVudHMnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNlYXJjaEFnZW50JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSwgdXNlcm5hbWU6IDEgfSB9KTtcblxuXHRcdGlmICghdXNlcikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2VhcmNoQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB1c2VyO1xuXHR9XG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRzZW5kTWVzc2FnZUxpdmVjaGF0KHsgdG9rZW4sIF9pZCwgcmlkLCBtc2csIGF0dGFjaG1lbnRzIH0sIGFnZW50KSB7XG5cdFx0Y2hlY2sodG9rZW4sIFN0cmluZyk7XG5cdFx0Y2hlY2soX2lkLCBTdHJpbmcpO1xuXHRcdGNoZWNrKHJpZCwgU3RyaW5nKTtcblx0XHRjaGVjayhtc2csIFN0cmluZyk7XG5cblx0XHRjaGVjayhhZ2VudCwgTWF0Y2guTWF5YmUoe1xuXHRcdFx0YWdlbnRJZDogU3RyaW5nLFxuXHRcdFx0dXNlcm5hbWU6IFN0cmluZ1xuXHRcdH0pKTtcblxuXHRcdGNvbnN0IGd1ZXN0ID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbiwge1xuXHRcdFx0ZmllbGRzOiB7XG5cdFx0XHRcdG5hbWU6IDEsXG5cdFx0XHRcdHVzZXJuYW1lOiAxLFxuXHRcdFx0XHRkZXBhcnRtZW50OiAxLFxuXHRcdFx0XHR0b2tlbjogMVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0aWYgKCFndWVzdCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC10b2tlbicpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnNlbmRNZXNzYWdlKHtcblx0XHRcdGd1ZXN0LFxuXHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRfaWQsXG5cdFx0XHRcdHJpZCxcblx0XHRcdFx0bXNnLFxuXHRcdFx0XHR0b2tlbixcblx0XHRcdFx0YXR0YWNobWVudHNcblx0XHRcdH0sXG5cdFx0XHRhZ2VudFxuXHRcdH0pO1xuXHR9XG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRhc3luYyAnc2VuZEZpbGVMaXZlY2hhdE1lc3NhZ2UnKHJvb21JZCwgdmlzaXRvclRva2VuLCBmaWxlLCBtc2dEYXRhID0ge30pIHtcblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih2aXNpdG9yVG9rZW4pO1xuXG5cdFx0aWYgKCF2aXNpdG9yKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVPcGVuQnlWaXNpdG9yVG9rZW4odmlzaXRvclRva2VuLCByb29tSWQpO1xuXG5cdFx0aWYgKCFyb29tKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y2hlY2sobXNnRGF0YSwge1xuXHRcdFx0YXZhdGFyOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdFx0ZW1vamk6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRhbGlhczogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdGdyb3VwYWJsZTogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbiksXG5cdFx0XHRtc2c6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcblx0XHR9KTtcblxuXHRcdGNvbnN0IGZpbGVVcmwgPSBgL2ZpbGUtdXBsb2FkLyR7IGZpbGUuX2lkIH0vJHsgZW5jb2RlVVJJKGZpbGUubmFtZSkgfWA7XG5cblx0XHRjb25zdCBhdHRhY2htZW50ID0ge1xuXHRcdFx0dGl0bGU6IGZpbGUubmFtZSxcblx0XHRcdHR5cGU6ICdmaWxlJyxcblx0XHRcdGRlc2NyaXB0aW9uOiBmaWxlLmRlc2NyaXB0aW9uLFxuXHRcdFx0dGl0bGVfbGluazogZmlsZVVybCxcblx0XHRcdHRpdGxlX2xpbmtfZG93bmxvYWQ6IHRydWVcblx0XHR9O1xuXG5cdFx0aWYgKC9eaW1hZ2VcXC8uKy8udGVzdChmaWxlLnR5cGUpKSB7XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3VybCA9IGZpbGVVcmw7XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3R5cGUgPSBmaWxlLnR5cGU7XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3NpemUgPSBmaWxlLnNpemU7XG5cdFx0XHRpZiAoZmlsZS5pZGVudGlmeSAmJiBmaWxlLmlkZW50aWZ5LnNpemUpIHtcblx0XHRcdFx0YXR0YWNobWVudC5pbWFnZV9kaW1lbnNpb25zID0gZmlsZS5pZGVudGlmeS5zaXplO1xuXHRcdFx0fVxuXHRcdFx0YXR0YWNobWVudC5pbWFnZV9wcmV2aWV3ID0gYXdhaXQgRmlsZVVwbG9hZC5yZXNpemVJbWFnZVByZXZpZXcoZmlsZSk7XG5cdFx0fSBlbHNlIGlmICgvXmF1ZGlvXFwvLisvLnRlc3QoZmlsZS50eXBlKSkge1xuXHRcdFx0YXR0YWNobWVudC5hdWRpb191cmwgPSBmaWxlVXJsO1xuXHRcdFx0YXR0YWNobWVudC5hdWRpb190eXBlID0gZmlsZS50eXBlO1xuXHRcdFx0YXR0YWNobWVudC5hdWRpb19zaXplID0gZmlsZS5zaXplO1xuXHRcdH0gZWxzZSBpZiAoL152aWRlb1xcLy4rLy50ZXN0KGZpbGUudHlwZSkpIHtcblx0XHRcdGF0dGFjaG1lbnQudmlkZW9fdXJsID0gZmlsZVVybDtcblx0XHRcdGF0dGFjaG1lbnQudmlkZW9fdHlwZSA9IGZpbGUudHlwZTtcblx0XHRcdGF0dGFjaG1lbnQudmlkZW9fc2l6ZSA9IGZpbGUuc2l6ZTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSBPYmplY3QuYXNzaWduKHtcblx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRyaWQ6IHJvb21JZCxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0bXNnOiAnJyxcblx0XHRcdGZpbGU6IHtcblx0XHRcdFx0X2lkOiBmaWxlLl9pZCxcblx0XHRcdFx0bmFtZTogZmlsZS5uYW1lLFxuXHRcdFx0XHR0eXBlOiBmaWxlLnR5cGVcblx0XHRcdH0sXG5cdFx0XHRncm91cGFibGU6IGZhbHNlLFxuXHRcdFx0YXR0YWNobWVudHM6IFthdHRhY2htZW50XSxcblx0XHRcdHRva2VuOiB2aXNpdG9yVG9rZW5cblx0XHR9LCBtc2dEYXRhKTtcblxuXHRcdHJldHVybiBNZXRlb3IuY2FsbCgnc2VuZE1lc3NhZ2VMaXZlY2hhdCcsIG1zZyk7XG5cdH1cbn0pO1xuIiwiLyogZ2xvYmFscyBERFBSYXRlTGltaXRlciAqL1xuaW1wb3J0IGRucyBmcm9tICdkbnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzZW5kT2ZmbGluZU1lc3NhZ2UnKGRhdGEpIHtcblx0XHRjaGVjayhkYXRhLCB7XG5cdFx0XHRuYW1lOiBTdHJpbmcsXG5cdFx0XHRlbWFpbDogU3RyaW5nLFxuXHRcdFx0bWVzc2FnZTogU3RyaW5nXG5cdFx0fSk7XG5cblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybScpKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaGVhZGVyID0gUm9ja2V0Q2hhdC5wbGFjZWhvbGRlcnMucmVwbGFjZShSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRW1haWxfSGVhZGVyJykgfHwgJycpO1xuXHRcdGNvbnN0IGZvb3RlciA9IFJvY2tldENoYXQucGxhY2Vob2xkZXJzLnJlcGxhY2UoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0VtYWlsX0Zvb3RlcicpIHx8ICcnKTtcblxuXHRcdGNvbnN0IG1lc3NhZ2UgPSAoYCR7IGRhdGEubWVzc2FnZSB9YCkucmVwbGFjZSgvKFtePlxcclxcbl0/KShcXHJcXG58XFxuXFxyfFxccnxcXG4pL2csICckMScgKyAnPGJyPicgKyAnJDInKTtcblxuXHRcdGNvbnN0IGh0bWwgPSBgXG5cdFx0XHQ8aDE+TmV3IGxpdmVjaGF0IG1lc3NhZ2U8L2gxPlxuXHRcdFx0PHA+PHN0cm9uZz5WaXNpdG9yIG5hbWU6PC9zdHJvbmc+ICR7IGRhdGEubmFtZSB9PC9wPlxuXHRcdFx0PHA+PHN0cm9uZz5WaXNpdG9yIGVtYWlsOjwvc3Ryb25nPiAkeyBkYXRhLmVtYWlsIH08L3A+XG5cdFx0XHQ8cD48c3Ryb25nPk1lc3NhZ2U6PC9zdHJvbmc+PGJyPiR7IG1lc3NhZ2UgfTwvcD5gO1xuXG5cdFx0bGV0IGZyb21FbWFpbCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGcm9tX0VtYWlsJykubWF0Y2goL1xcYltBLVowLTkuXyUrLV0rQCg/OltBLVowLTktXStcXC4pK1tBLVpdezIsNH1cXGIvaSk7XG5cblx0XHRpZiAoZnJvbUVtYWlsKSB7XG5cdFx0XHRmcm9tRW1haWwgPSBmcm9tRW1haWxbMF07XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZyb21FbWFpbCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGcm9tX0VtYWlsJyk7XG5cdFx0fVxuXG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF92YWxpZGF0ZV9vZmZsaW5lX2VtYWlsJykpIHtcblx0XHRcdGNvbnN0IGVtYWlsRG9tYWluID0gZGF0YS5lbWFpbC5zdWJzdHIoZGF0YS5lbWFpbC5sYXN0SW5kZXhPZignQCcpICsgMSk7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdE1ldGVvci53cmFwQXN5bmMoZG5zLnJlc29sdmVNeCkoZW1haWxEb21haW4pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWVtYWlsLWFkZHJlc3MnLCAnSW52YWxpZCBlbWFpbCBhZGRyZXNzJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzZW5kT2ZmbGluZU1lc3NhZ2UnIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRFbWFpbC5zZW5kKHtcblx0XHRcdFx0dG86IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9vZmZsaW5lX2VtYWlsJyksXG5cdFx0XHRcdGZyb206IGAkeyBkYXRhLm5hbWUgfSAtICR7IGRhdGEuZW1haWwgfSA8JHsgZnJvbUVtYWlsIH0+YCxcblx0XHRcdFx0cmVwbHlUbzogYCR7IGRhdGEubmFtZSB9IDwkeyBkYXRhLmVtYWlsIH0+YCxcblx0XHRcdFx0c3ViamVjdDogYExpdmVjaGF0IG9mZmxpbmUgbWVzc2FnZSBmcm9tICR7IGRhdGEubmFtZSB9OiAkeyAoYCR7IGRhdGEubWVzc2FnZSB9YCkuc3Vic3RyaW5nKDAsIDIwKSB9YCxcblx0XHRcdFx0aHRtbDogaGVhZGVyICsgaHRtbCArIGZvb3RlclxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdsaXZlY2hhdC5vZmZsaW5lTWVzc2FnZScsIGRhdGEpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cbn0pO1xuXG5ERFBSYXRlTGltaXRlci5hZGRSdWxlKHtcblx0dHlwZTogJ21ldGhvZCcsXG5cdG5hbWU6ICdsaXZlY2hhdDpzZW5kT2ZmbGluZU1lc3NhZ2UnLFxuXHRjb25uZWN0aW9uSWQoKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cbn0sIDEsIDUwMDApO1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzZXRDdXN0b21GaWVsZCcodG9rZW4sIGtleSwgdmFsdWUsIG92ZXJ3cml0ZSA9IHRydWUpIHtcblx0XHRjb25zdCBjdXN0b21GaWVsZCA9IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQuZmluZE9uZUJ5SWQoa2V5KTtcblx0XHRpZiAoY3VzdG9tRmllbGQpIHtcblx0XHRcdGlmIChjdXN0b21GaWVsZC5zY29wZSA9PT0gJ3Jvb20nKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVMaXZlY2hhdERhdGFCeVRva2VuKHRva2VuLCBrZXksIHZhbHVlLCBvdmVyd3JpdGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gU2F2ZSBpbiB1c2VyXG5cdFx0XHRcdHJldHVybiBMaXZlY2hhdFZpc2l0b3JzLnVwZGF0ZUxpdmVjaGF0RGF0YUJ5VG9rZW4odG9rZW4sIGtleSwgdmFsdWUsIG92ZXJ3cml0ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2V0RGVwYXJ0bWVudEZvclZpc2l0b3InKHsgdG9rZW4sIGRlcGFydG1lbnQgfSA9IHt9KSB7XG5cdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zZXREZXBhcnRtZW50Rm9yR3Vlc3QuY2FsbCh0aGlzLCB7XG5cdFx0XHR0b2tlbixcblx0XHRcdGRlcGFydG1lbnRcblx0XHR9KTtcblxuXHRcdC8vIHVwZGF0ZSB2aXNpdGVkIHBhZ2UgaGlzdG9yeSB0byBub3QgZXhwaXJlXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMua2VlcEhpc3RvcnlGb3JUb2tlbih0b2tlbik7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxufSk7XG4iLCIvKiBlc2xpbnQgbmV3LWNhcDogWzIsIHtcImNhcElzTmV3RXhjZXB0aW9uc1wiOiBbXCJNRDVcIl19XSAqL1xuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c3RhcnRWaWRlb0NhbGwnKHJvb21JZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6Y2xvc2VCeVZpc2l0b3InIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGd1ZXN0ID0gTWV0ZW9yLnVzZXIoKTtcblxuXHRcdGNvbnN0IG1lc3NhZ2UgPSB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiByb29tSWQgfHwgUmFuZG9tLmlkKCksXG5cdFx0XHRtc2c6ICcnLFxuXHRcdFx0dHM6IG5ldyBEYXRlKClcblx0XHR9O1xuXG5cdFx0Y29uc3QgeyByb29tIH0gPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldFJvb20oZ3Vlc3QsIG1lc3NhZ2UsIHsgaml0c2lUaW1lb3V0OiBuZXcgRGF0ZShEYXRlLm5vdygpICsgMzYwMCAqIDEwMDApIH0pO1xuXHRcdG1lc3NhZ2UucmlkID0gcm9vbS5faWQ7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdsaXZlY2hhdF92aWRlb19jYWxsJywgcm9vbS5faWQsICcnLCBndWVzdCwge1xuXHRcdFx0YWN0aW9uTGlua3M6IFtcblx0XHRcdFx0eyBpY29uOiAnaWNvbi12aWRlb2NhbScsIGkxOG5MYWJlbDogJ0FjY2VwdCcsIG1ldGhvZF9pZDogJ2NyZWF0ZUxpdmVjaGF0Q2FsbCcsIHBhcmFtczogJycgfSxcblx0XHRcdFx0eyBpY29uOiAnaWNvbi1jYW5jZWwnLCBpMThuTGFiZWw6ICdEZWNsaW5lJywgbWV0aG9kX2lkOiAnZGVueUxpdmVjaGF0Q2FsbCcsIHBhcmFtczogJycgfVxuXHRcdFx0XVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJvb21JZDogcm9vbS5faWQsXG5cdFx0XHRkb21haW46IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdKaXRzaV9Eb21haW4nKSxcblx0XHRcdGppdHNpUm9vbTogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ppdHNpX1VSTF9Sb29tX1ByZWZpeCcpICsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ3VuaXF1ZUlEJykgKyByb29tSWRcblx0XHR9O1xuXHR9XG59KTtcblxuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzdGFydEZpbGVVcGxvYWRSb29tJyhyb29tSWQsIHRva2VuKSB7XG5cdFx0Y29uc3QgZ3Vlc3QgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuKTtcblxuXHRcdGNvbnN0IG1lc3NhZ2UgPSB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiByb29tSWQgfHwgUmFuZG9tLmlkKCksXG5cdFx0XHRtc2c6ICcnLFxuXHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHR0b2tlbjogZ3Vlc3QudG9rZW5cblx0XHR9O1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0Um9vbShndWVzdCwgbWVzc2FnZSk7XG5cdH1cbn0pO1xuIiwiLyogZXNsaW50IG5ldy1jYXA6IFsyLCB7XCJjYXBJc05ld0V4Y2VwdGlvbnNcIjogW1wiTWF0Y2guT3B0aW9uYWxcIl19XSAqL1xuXG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnRyYW5zZmVyJyh0cmFuc2ZlckRhdGEpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDp0cmFuc2ZlcicgfSk7XG5cdFx0fVxuXG5cdFx0Y2hlY2sodHJhbnNmZXJEYXRhLCB7XG5cdFx0XHRyb29tSWQ6IFN0cmluZyxcblx0XHRcdHVzZXJJZDogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdGRlcGFydG1lbnRJZDogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuXHRcdH0pO1xuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHRyYW5zZmVyRGF0YS5yb29tSWQpO1xuXG5cdFx0Y29uc3QgZ3Vlc3QgPSBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVCeUlkKHJvb20udi5faWQpO1xuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIE1ldGVvci51c2VySWQoKSwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdFx0aWYgKCFzdWJzY3JpcHRpb24gJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUm9sZShNZXRlb3IudXNlcklkKCksICdsaXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDp0cmFuc2ZlcicgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQudHJhbnNmZXIocm9vbSwgZ3Vlc3QsIHRyYW5zZmVyRGF0YSk7XG5cdH1cbn0pO1xuIiwiLyogZ2xvYmFscyBIVFRQICovXG5jb25zdCBwb3N0Q2F0Y2hFcnJvciA9IE1ldGVvci53cmFwQXN5bmMoZnVuY3Rpb24odXJsLCBvcHRpb25zLCByZXNvbHZlKSB7XG5cdEhUVFAucG9zdCh1cmwsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgcmVzKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0cmVzb2x2ZShudWxsLCBlcnIucmVzcG9uc2UpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXNvbHZlKG51bGwsIHJlcyk7XG5cdFx0fVxuXHR9KTtcbn0pO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDp3ZWJob29rVGVzdCcoKSB7XG5cdFx0dGhpcy51bmJsb2NrKCk7XG5cblx0XHRjb25zdCBzYW1wbGVEYXRhID0ge1xuXHRcdFx0dHlwZTogJ0xpdmVjaGF0U2Vzc2lvbicsXG5cdFx0XHRfaWQ6ICdmYXNkNmY1YTRzZDZmOGE0c2RmJyxcblx0XHRcdGxhYmVsOiAndGl0bGUnLFxuXHRcdFx0dG9waWM6ICdhc2lvZG9qZicsXG5cdFx0XHRjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXG5cdFx0XHRsYXN0TWVzc2FnZUF0OiBuZXcgRGF0ZSgpLFxuXHRcdFx0dGFnczogW1xuXHRcdFx0XHQndGFnMScsXG5cdFx0XHRcdCd0YWcyJyxcblx0XHRcdFx0J3RhZzMnXG5cdFx0XHRdLFxuXHRcdFx0Y3VzdG9tRmllbGRzOiB7XG5cdFx0XHRcdHByb2R1Y3RJZDogJzEyMzQ1Nidcblx0XHRcdH0sXG5cdFx0XHR2aXNpdG9yOiB7XG5cdFx0XHRcdF9pZDogJycsXG5cdFx0XHRcdG5hbWU6ICd2aXNpdG9yIG5hbWUnLFxuXHRcdFx0XHR1c2VybmFtZTogJ3Zpc2l0b3ItdXNlcm5hbWUnLFxuXHRcdFx0XHRkZXBhcnRtZW50OiAnZGVwYXJ0bWVudCcsXG5cdFx0XHRcdGVtYWlsOiAnZW1haWxAYWRkcmVzcy5jb20nLFxuXHRcdFx0XHRwaG9uZTogJzE5Mjg3MzE5Mjg3MycsXG5cdFx0XHRcdGlwOiAnMTIzLjQ1Ni43Ljg5Jyxcblx0XHRcdFx0YnJvd3NlcjogJ0Nocm9tZScsXG5cdFx0XHRcdG9zOiAnTGludXgnLFxuXHRcdFx0XHRjdXN0b21GaWVsZHM6IHtcblx0XHRcdFx0XHRjdXN0b21lcklkOiAnMTIzNDU2J1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0YWdlbnQ6IHtcblx0XHRcdFx0X2lkOiAnYXNkZjg5YXM2ZGY4Jyxcblx0XHRcdFx0dXNlcm5hbWU6ICdhZ2VudC51c2VybmFtZScsXG5cdFx0XHRcdG5hbWU6ICdBZ2VudCBOYW1lJyxcblx0XHRcdFx0ZW1haWw6ICdhZ2VudEBlbWFpbC5jb20nXG5cdFx0XHR9LFxuXHRcdFx0bWVzc2FnZXM6IFt7XG5cdFx0XHRcdHVzZXJuYW1lOiAndmlzaXRvci11c2VybmFtZScsXG5cdFx0XHRcdG1zZzogJ21lc3NhZ2UgY29udGVudCcsXG5cdFx0XHRcdHRzOiBuZXcgRGF0ZSgpXG5cdFx0XHR9LCB7XG5cdFx0XHRcdHVzZXJuYW1lOiAnYWdlbnQudXNlcm5hbWUnLFxuXHRcdFx0XHRhZ2VudElkOiAnYXNkZjg5YXM2ZGY4Jyxcblx0XHRcdFx0bXNnOiAnbWVzc2FnZSBjb250ZW50IGZyb20gYWdlbnQnLFxuXHRcdFx0XHR0czogbmV3IERhdGUoKVxuXHRcdFx0fV1cblx0XHR9O1xuXG5cdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0J1gtUm9ja2V0Q2hhdC1MaXZlY2hhdC1Ub2tlbic6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9zZWNyZXRfdG9rZW4nKVxuXHRcdFx0fSxcblx0XHRcdGRhdGE6IHNhbXBsZURhdGFcblx0XHR9O1xuXG5cdFx0Y29uc3QgcmVzcG9uc2UgPSBwb3N0Q2F0Y2hFcnJvcihSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfd2ViaG9va1VybCcpLCBvcHRpb25zKTtcblxuXHRcdGNvbnNvbGUubG9nKCdyZXNwb25zZSAtPicsIHJlc3BvbnNlKTtcblxuXHRcdGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5zdGF0dXNDb2RlICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDIwMCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtd2ViaG9vay1yZXNwb25zZScpO1xuXHRcdH1cblx0fVxufSk7XG5cbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnRha2VJbnF1aXJ5JyhpbnF1aXJ5SWQpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDp0YWtlSW5xdWlyeScgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW5xdWlyeSA9IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0SW5xdWlyeS5maW5kT25lQnlJZChpbnF1aXJ5SWQpO1xuXG5cdFx0aWYgKCFpbnF1aXJ5IHx8IGlucXVpcnkuc3RhdHVzID09PSAndGFrZW4nKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdJbnF1aXJ5IGFscmVhZHkgdGFrZW4nLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnRha2VJbnF1aXJ5JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQoTWV0ZW9yLnVzZXJJZCgpKTtcblxuXHRcdGNvbnN0IGFnZW50ID0ge1xuXHRcdFx0YWdlbnRJZDogdXNlci5faWQsXG5cdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZVxuXHRcdH07XG5cblx0XHQvLyBhZGQgc3Vic2NyaXB0aW9uXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uRGF0YSA9IHtcblx0XHRcdHJpZDogaW5xdWlyeS5yaWQsXG5cdFx0XHRuYW1lOiBpbnF1aXJ5Lm5hbWUsXG5cdFx0XHRhbGVydDogdHJ1ZSxcblx0XHRcdG9wZW46IHRydWUsXG5cdFx0XHR1bnJlYWQ6IDEsXG5cdFx0XHR1c2VyTWVudGlvbnM6IDEsXG5cdFx0XHRncm91cE1lbnRpb25zOiAwLFxuXHRcdFx0dToge1xuXHRcdFx0XHRfaWQ6IGFnZW50LmFnZW50SWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZVxuXHRcdFx0fSxcblx0XHRcdHQ6ICdsJyxcblx0XHRcdGRlc2t0b3BOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdG1vYmlsZVB1c2hOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdGVtYWlsTm90aWZpY2F0aW9uczogJ2FsbCdcblx0XHR9O1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5pbnNlcnQoc3Vic2NyaXB0aW9uRGF0YSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuaW5jVXNlcnNDb3VudEJ5SWQoaW5xdWlyeS5yaWQpO1xuXG5cdFx0Ly8gdXBkYXRlIHJvb21cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoaW5xdWlyeS5yaWQpO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuY2hhbmdlQWdlbnRCeVJvb21JZChpbnF1aXJ5LnJpZCwgYWdlbnQpO1xuXG5cdFx0cm9vbS5zZXJ2ZWRCeSA9IHtcblx0XHRcdF9pZDogYWdlbnQuYWdlbnRJZCxcblx0XHRcdHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZVxuXHRcdH07XG5cblx0XHQvLyBtYXJrIGlucXVpcnkgYXMgdGFrZW5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkudGFrZUlucXVpcnkoaW5xdWlyeS5faWQpO1xuXG5cdFx0Ly8gcmVtb3ZlIHNlbmRpbmcgbWVzc2FnZSBmcm9tIGd1ZXN0IHdpZGdldFxuXHRcdC8vIGRvbnQgY2hlY2sgaWYgc2V0dGluZyBpcyB0cnVlLCBiZWNhdXNlIGlmIHNldHRpbmd3YXMgc3dpdGNoZWQgb2ZmIGluYmV0d2VlbiAgZ3Vlc3QgZW50ZXJlZCBwb29sLFxuXHRcdC8vIGFuZCBpbnF1aXJ5IGJlaW5nIHRha2VuLCBtZXNzYWdlIHdvdWxkIG5vdCBiZSBzd2l0Y2hlZCBvZmYuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlQ29tbWFuZFdpdGhSb29tSWRBbmRVc2VyKCdjb25uZWN0ZWQnLCByb29tLl9pZCwgdXNlcik7XG5cblx0XHRSb2NrZXRDaGF0LkxpdmVjaGF0LnN0cmVhbS5lbWl0KHJvb20uX2lkLCB7XG5cdFx0XHR0eXBlOiAnYWdlbnREYXRhJyxcblx0XHRcdGRhdGE6IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldEFnZW50SW5mbyhhZ2VudC5hZ2VudElkKVxuXHRcdH0pO1xuXG5cdFx0Ly8gcmV0dXJuIGlucXVpcnkgKGZvciByZWRpcmVjdGluZyBhZ2VudCB0byB0aGUgcm9vbSByb3V0ZSlcblx0XHRyZXR1cm4gaW5xdWlyeTtcblx0fVxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpyZXR1cm5Bc0lucXVpcnknKHJpZCwgZGVwYXJ0bWVudElkKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZURlcGFydG1lbnQnIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnJldHVyblJvb21Bc0lucXVpcnkocmlkLCBkZXBhcnRtZW50SWQpO1xuXHR9XG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNhdmVPZmZpY2VIb3VycycoZGF5LCBzdGFydCwgZmluaXNoLCBvcGVuKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRPZmZpY2VIb3VyLnVwZGF0ZUhvdXJzKGRheSwgc3RhcnQsIGZpbmlzaCwgb3Blbik7XG5cdH1cbn0pO1xuIiwiLyogZ2xvYmFscyBlbWFpbFNldHRpbmdzLCBERFBSYXRlTGltaXRlciAqL1xuLyogU2VuZCBhIHRyYW5zY3JpcHQgb2YgdGhlIHJvb20gY29udmVyc3RhdGlvbiB0byB0aGUgZ2l2ZW4gZW1haWwgKi9cbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcblxuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzZW5kVHJhbnNjcmlwdCcodG9rZW4sIHJpZCwgZW1haWwpIHtcblx0XHRjaGVjayhyaWQsIFN0cmluZyk7XG5cdFx0Y2hlY2soZW1haWwsIFN0cmluZyk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblxuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuKTtcblx0XHRjb25zdCB1c2VyTGFuZ3VhZ2UgPSAodmlzaXRvciAmJiB2aXNpdG9yLmxhbmd1YWdlKSB8fCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnbGFuZ3VhZ2UnKSB8fCAnZW4nO1xuXG5cdFx0Ly8gYWxsb3cgdG8gb25seSB1c2VyIHRvIHNlbmQgdHJhbnNjcmlwdHMgZnJvbSB0aGVpciBvd24gY2hhdHNcblx0XHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAnbCcgfHwgIXJvb20udiB8fCByb29tLnYudG9rZW4gIT09IHRva2VuKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWVzc2FnZXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kVmlzaWJsZUJ5Um9vbUlkTm90Q29udGFpbmluZ1R5cGVzKHJpZCwgWydsaXZlY2hhdF9uYXZpZ2F0aW9uX2hpc3RvcnknXSwgeyBzb3J0OiB7ICd0cycgOiAxIH19KTtcblx0XHRjb25zdCBoZWFkZXIgPSBSb2NrZXRDaGF0LnBsYWNlaG9sZGVycy5yZXBsYWNlKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdFbWFpbF9IZWFkZXInKSB8fCAnJyk7XG5cdFx0Y29uc3QgZm9vdGVyID0gUm9ja2V0Q2hhdC5wbGFjZWhvbGRlcnMucmVwbGFjZShSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRW1haWxfRm9vdGVyJykgfHwgJycpO1xuXG5cdFx0bGV0IGh0bWwgPSAnPGRpdj4gPGhyPic7XG5cdFx0bWVzc2FnZXMuZm9yRWFjaChtZXNzYWdlID0+IHtcblx0XHRcdGlmIChtZXNzYWdlLnQgJiYgWydjb21tYW5kJywgJ2xpdmVjaGF0LWNsb3NlJywgJ2xpdmVjaGF0X3ZpZGVvX2NhbGwnXS5pbmRleE9mKG1lc3NhZ2UudCkgIT09IC0xKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0bGV0IGF1dGhvcjtcblx0XHRcdGlmIChtZXNzYWdlLnUuX2lkID09PSB2aXNpdG9yLl9pZCkge1xuXHRcdFx0XHRhdXRob3IgPSBUQVBpMThuLl9fKCdZb3UnLCB7IGxuZzogdXNlckxhbmd1YWdlIH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXV0aG9yID0gbWVzc2FnZS51LnVzZXJuYW1lO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBkYXRldGltZSA9IG1vbWVudChtZXNzYWdlLnRzKS5sb2NhbGUodXNlckxhbmd1YWdlKS5mb3JtYXQoJ0xMTCcpO1xuXHRcdFx0Y29uc3Qgc2luZ2xlTWVzc2FnZSA9IGBcblx0XHRcdFx0PHA+PHN0cm9uZz4keyBhdXRob3IgfTwvc3Ryb25nPiAgPGVtPiR7IGRhdGV0aW1lIH08L2VtPjwvcD5cblx0XHRcdFx0PHA+JHsgbWVzc2FnZS5tc2cgfTwvcD5cblx0XHRcdGA7XG5cdFx0XHRodG1sID0gaHRtbCArIHNpbmdsZU1lc3NhZ2U7XG5cdFx0fSk7XG5cblx0XHRodG1sID0gYCR7IGh0bWwgfTwvZGl2PmA7XG5cblx0XHRsZXQgZnJvbUVtYWlsID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Zyb21fRW1haWwnKS5tYXRjaCgvXFxiW0EtWjAtOS5fJSstXStAKD86W0EtWjAtOS1dK1xcLikrW0EtWl17Miw0fVxcYi9pKTtcblxuXHRcdGlmIChmcm9tRW1haWwpIHtcblx0XHRcdGZyb21FbWFpbCA9IGZyb21FbWFpbFswXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZnJvbUVtYWlsID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Zyb21fRW1haWwnKTtcblx0XHR9XG5cblx0XHRlbWFpbFNldHRpbmdzID0ge1xuXHRcdFx0dG86IGVtYWlsLFxuXHRcdFx0ZnJvbTogZnJvbUVtYWlsLFxuXHRcdFx0cmVwbHlUbzogZnJvbUVtYWlsLFxuXHRcdFx0c3ViamVjdDogVEFQaTE4bi5fXygnVHJhbnNjcmlwdF9vZl95b3VyX2xpdmVjaGF0X2NvbnZlcnNhdGlvbicsIHsgbG5nOiB1c2VyTGFuZ3VhZ2UgfSksXG5cdFx0XHRodG1sOiBoZWFkZXIgKyBodG1sICsgZm9vdGVyXG5cdFx0fTtcblxuXHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRFbWFpbC5zZW5kKGVtYWlsU2V0dGluZ3MpO1xuXHRcdH0pO1xuXG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignbGl2ZWNoYXQuc2VuZFRyYW5zY3JpcHQnLCBtZXNzYWdlcywgZW1haWwpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cbn0pO1xuXG5ERFBSYXRlTGltaXRlci5hZGRSdWxlKHtcblx0dHlwZTogJ21ldGhvZCcsXG5cdG5hbWU6ICdsaXZlY2hhdDpzZW5kVHJhbnNjcmlwdCcsXG5cdGNvbm5lY3Rpb25JZCgpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxufSwgMSwgNTAwMCk7XG4iLCIvKipcbiAqIFNldHMgYW4gdXNlciBhcyAobm9uKW9wZXJhdG9yXG4gKiBAcGFyYW0ge3N0cmluZ30gX2lkIC0gVXNlcidzIF9pZFxuICogQHBhcmFtIHtib29sZWFufSBvcGVyYXRvciAtIEZsYWcgdG8gc2V0IGFzIG9wZXJhdG9yIG9yIG5vdFxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRPcGVyYXRvciA9IGZ1bmN0aW9uKF9pZCwgb3BlcmF0b3IpIHtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdG9wZXJhdG9yXG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShfaWQsIHVwZGF0ZSk7XG59O1xuXG4vKipcbiAqIEdldHMgYWxsIG9ubGluZSBhZ2VudHNcbiAqIEByZXR1cm5cbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9ubGluZUFnZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRzdGF0dXM6IHtcblx0XHRcdCRleGlzdHM6IHRydWUsXG5cdFx0XHQkbmU6ICdvZmZsaW5lJ1xuXHRcdH0sXG5cdFx0c3RhdHVzTGl2ZWNoYXQ6ICdhdmFpbGFibGUnLFxuXHRcdHJvbGVzOiAnbGl2ZWNoYXQtYWdlbnQnXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG4vKipcbiAqIEZpbmQgYW4gb25saW5lIGFnZW50IGJ5IGhpcyB1c2VybmFtZVxuICogQHJldHVyblxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lT25saW5lQWdlbnRCeVVzZXJuYW1lID0gZnVuY3Rpb24odXNlcm5hbWUpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0dXNlcm5hbWUsXG5cdFx0c3RhdHVzOiB7XG5cdFx0XHQkZXhpc3RzOiB0cnVlLFxuXHRcdFx0JG5lOiAnb2ZmbGluZSdcblx0XHR9LFxuXHRcdHN0YXR1c0xpdmVjaGF0OiAnYXZhaWxhYmxlJyxcblx0XHRyb2xlczogJ2xpdmVjaGF0LWFnZW50J1xuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnkpO1xufTtcblxuLyoqXG4gKiBHZXRzIGFsbCBhZ2VudHNcbiAqIEByZXR1cm5cbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZEFnZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRyb2xlczogJ2xpdmVjaGF0LWFnZW50J1xuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnkpO1xufTtcblxuLyoqXG4gKiBGaW5kIG9ubGluZSB1c2VycyBmcm9tIGEgbGlzdFxuICogQHBhcmFtIHthcnJheX0gdXNlckxpc3QgLSBhcnJheSBvZiB1c2VybmFtZXNcbiAqIEByZXR1cm5cbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9ubGluZVVzZXJGcm9tTGlzdCA9IGZ1bmN0aW9uKHVzZXJMaXN0KSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHN0YXR1czoge1xuXHRcdFx0JGV4aXN0czogdHJ1ZSxcblx0XHRcdCRuZTogJ29mZmxpbmUnXG5cdFx0fSxcblx0XHRzdGF0dXNMaXZlY2hhdDogJ2F2YWlsYWJsZScsXG5cdFx0cm9sZXM6ICdsaXZlY2hhdC1hZ2VudCcsXG5cdFx0dXNlcm5hbWU6IHtcblx0XHRcdCRpbjogW10uY29uY2F0KHVzZXJMaXN0KVxuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5KTtcbn07XG5cbi8qKlxuICogR2V0IG5leHQgdXNlciBhZ2VudCBpbiBvcmRlclxuICogQHJldHVybiB7b2JqZWN0fSBVc2VyIGZyb20gZGJcbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0TmV4dEFnZW50ID0gZnVuY3Rpb24oKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHN0YXR1czoge1xuXHRcdFx0JGV4aXN0czogdHJ1ZSxcblx0XHRcdCRuZTogJ29mZmxpbmUnXG5cdFx0fSxcblx0XHRzdGF0dXNMaXZlY2hhdDogJ2F2YWlsYWJsZScsXG5cdFx0cm9sZXM6ICdsaXZlY2hhdC1hZ2VudCdcblx0fTtcblxuXHRjb25zdCBjb2xsZWN0aW9uT2JqID0gdGhpcy5tb2RlbC5yYXdDb2xsZWN0aW9uKCk7XG5cdGNvbnN0IGZpbmRBbmRNb2RpZnkgPSBNZXRlb3Iud3JhcEFzeW5jKGNvbGxlY3Rpb25PYmouZmluZEFuZE1vZGlmeSwgY29sbGVjdGlvbk9iaik7XG5cblx0Y29uc3Qgc29ydCA9IHtcblx0XHRsaXZlY2hhdENvdW50OiAxLFxuXHRcdHVzZXJuYW1lOiAxXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRpbmM6IHtcblx0XHRcdGxpdmVjaGF0Q291bnQ6IDFcblx0XHR9XG5cdH07XG5cblx0Y29uc3QgdXNlciA9IGZpbmRBbmRNb2RpZnkocXVlcnksIHNvcnQsIHVwZGF0ZSk7XG5cdGlmICh1c2VyICYmIHVzZXIudmFsdWUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YWdlbnRJZDogdXNlci52YWx1ZS5faWQsXG5cdFx0XHR1c2VybmFtZTogdXNlci52YWx1ZS51c2VybmFtZVxuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cbn07XG5cbi8qKlxuICogQ2hhbmdlIHVzZXIncyBsaXZlY2hhdCBzdGF0dXNcbiAqIEBwYXJhbSB7c3RyaW5nfSB0b2tlbiAtIFZpc2l0b3IgdG9rZW5cbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0TGl2ZWNoYXRTdGF0dXMgPSBmdW5jdGlvbih1c2VySWQsIHN0YXR1cykge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHQnX2lkJzogdXNlcklkXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdCdzdGF0dXNMaXZlY2hhdCc6IHN0YXR1c1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG4vKipcbiAqIGNoYW5nZSBhbGwgbGl2ZWNoYXQgYWdlbnRzIGxpdmVjaGF0IHN0YXR1cyB0byBcIm5vdC1hdmFpbGFibGVcIlxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5jbG9zZU9mZmljZSA9IGZ1bmN0aW9uKCkge1xuXHRzZWxmID0gdGhpcztcblx0c2VsZi5maW5kQWdlbnRzKCkuZm9yRWFjaChmdW5jdGlvbihhZ2VudCkge1xuXHRcdHNlbGYuc2V0TGl2ZWNoYXRTdGF0dXMoYWdlbnQuX2lkLCAnbm90LWF2YWlsYWJsZScpO1xuXHR9KTtcbn07XG5cbi8qKlxuICogY2hhbmdlIGFsbCBsaXZlY2hhdCBhZ2VudHMgbGl2ZWNoYXQgc3RhdHVzIHRvIFwiYXZhaWxhYmxlXCJcbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMub3Blbk9mZmljZSA9IGZ1bmN0aW9uKCkge1xuXHRzZWxmID0gdGhpcztcblx0c2VsZi5maW5kQWdlbnRzKCkuZm9yRWFjaChmdW5jdGlvbihhZ2VudCkge1xuXHRcdHNlbGYuc2V0TGl2ZWNoYXRTdGF0dXMoYWdlbnQuX2lkLCAnYXZhaWxhYmxlJyk7XG5cdH0pO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvID0gZnVuY3Rpb24oYWdlbnRJZCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IGFnZW50SWRcblx0fTtcblxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdGZpZWxkczoge1xuXHRcdFx0bmFtZTogMSxcblx0XHRcdHVzZXJuYW1lOiAxLFxuXHRcdFx0cGhvbmU6IDEsXG5cdFx0XHRjdXN0b21GaWVsZHM6IDFcblx0XHR9XG5cdH07XG5cblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9zaG93X2FnZW50X2VtYWlsJykpIHtcblx0XHRvcHRpb25zLmZpZWxkcy5lbWFpbHMgPSAxO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSwgb3B0aW9ucyk7XG59O1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbi8qKlxuICogR2V0cyB2aXNpdG9yIGJ5IHRva2VuXG4gKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gLSBWaXNpdG9yIHRva2VuXG4gKi9cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZVN1cnZleUZlZWRiYWNrQnlJZCA9IGZ1bmN0aW9uKF9pZCwgc3VydmV5RmVlZGJhY2spIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHN1cnZleUZlZWRiYWNrXG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZUxpdmVjaGF0RGF0YUJ5VG9rZW4gPSBmdW5jdGlvbih0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlID0gdHJ1ZSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHQndi50b2tlbic6IHRva2VuLFxuXHRcdG9wZW46IHRydWVcblx0fTtcblxuXHRpZiAoIW92ZXJ3cml0ZSkge1xuXHRcdGNvbnN0IHJvb20gPSB0aGlzLmZpbmRPbmUocXVlcnksIHsgZmllbGRzOiB7IGxpdmVjaGF0RGF0YTogMSB9IH0pO1xuXHRcdGlmIChyb29tLmxpdmVjaGF0RGF0YSAmJiB0eXBlb2Ygcm9vbS5saXZlY2hhdERhdGFba2V5XSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0fVxuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRbYGxpdmVjaGF0RGF0YS4keyBrZXkgfWBdOiB2YWx1ZVxuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kTGl2ZWNoYXQgPSBmdW5jdGlvbihmaWx0ZXIgPSB7fSwgb2Zmc2V0ID0gMCwgbGltaXQgPSAyMCkge1xuXHRjb25zdCBxdWVyeSA9IF8uZXh0ZW5kKGZpbHRlciwge1xuXHRcdHQ6ICdsJ1xuXHR9KTtcblxuXHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5LCB7IHNvcnQ6IHsgdHM6IC0gMSB9LCBvZmZzZXQsIGxpbWl0IH0pO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZExpdmVjaGF0QnlJZCA9IGZ1bmN0aW9uKF9pZCwgZmllbGRzKSB7XG5cdGNvbnN0IG9wdGlvbnMgPSB7fTtcblxuXHRpZiAoZmllbGRzKSB7XG5cdFx0b3B0aW9ucy5maWVsZHMgPSBmaWVsZHM7XG5cdH1cblxuXHRjb25zdCBxdWVyeSA9IHtcblx0XHR0OiAnbCcsXG5cdFx0X2lkXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSwgb3B0aW9ucyk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kTGl2ZWNoYXRCeUlkID0gZnVuY3Rpb24oX2lkLCBmaWVsZHMpIHtcblx0Y29uc3Qgb3B0aW9ucyA9IHt9O1xuXG5cdGlmIChmaWVsZHMpIHtcblx0XHRvcHRpb25zLmZpZWxkcyA9IGZpZWxkcztcblx0fVxuXG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHQ6ICdsJyxcblx0XHRfaWRcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5LCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBuZXh0IHZpc2l0b3IgbmFtZVxuICogQHJldHVybiB7c3RyaW5nfSBUaGUgbmV4dCB2aXNpdG9yIG5hbWVcbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlTGl2ZWNoYXRSb29tQ291bnQgPSBmdW5jdGlvbigpIHtcblx0Y29uc3Qgc2V0dGluZ3NSYXcgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5tb2RlbC5yYXdDb2xsZWN0aW9uKCk7XG5cdGNvbnN0IGZpbmRBbmRNb2RpZnkgPSBNZXRlb3Iud3JhcEFzeW5jKHNldHRpbmdzUmF3LmZpbmRBbmRNb2RpZnksIHNldHRpbmdzUmF3KTtcblxuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6ICdMaXZlY2hhdF9Sb29tX0NvdW50J1xuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkaW5jOiB7XG5cdFx0XHR2YWx1ZTogMVxuXHRcdH1cblx0fTtcblxuXHRjb25zdCBsaXZlY2hhdENvdW50ID0gZmluZEFuZE1vZGlmeShxdWVyeSwgbnVsbCwgdXBkYXRlKTtcblxuXHRyZXR1cm4gbGl2ZWNoYXRDb3VudC52YWx1ZS52YWx1ZTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlWaXNpdG9yVG9rZW4gPSBmdW5jdGlvbih2aXNpdG9yVG9rZW4sIG9wdGlvbnMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0b3BlbjogdHJ1ZSxcblx0XHQndi50b2tlbic6IHZpc2l0b3JUb2tlblxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnksIG9wdGlvbnMpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VmlzaXRvclRva2VuID0gZnVuY3Rpb24odmlzaXRvclRva2VuKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdCd2LnRva2VuJzogdmlzaXRvclRva2VuXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlWaXNpdG9ySWQgPSBmdW5jdGlvbih2aXNpdG9ySWQpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0J3YuX2lkJzogdmlzaXRvcklkXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lT3BlbkJ5VmlzaXRvclRva2VuID0gZnVuY3Rpb24odG9rZW4sIHJvb21JZCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IHJvb21JZCxcblx0XHRvcGVuOiB0cnVlLFxuXHRcdCd2LnRva2VuJzogdG9rZW5cblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldFJlc3BvbnNlQnlSb29tSWQgPSBmdW5jdGlvbihyb29tSWQsIHJlc3BvbnNlKSB7XG5cdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0X2lkOiByb29tSWRcblx0fSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHJlc3BvbnNlQnk6IHtcblx0XHRcdFx0X2lkOiByZXNwb25zZS51c2VyLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHJlc3BvbnNlLnVzZXIudXNlcm5hbWVcblx0XHRcdH0sXG5cdFx0XHRyZXNwb25zZURhdGU6IHJlc3BvbnNlLnJlc3BvbnNlRGF0ZSxcblx0XHRcdHJlc3BvbnNlVGltZTogcmVzcG9uc2UucmVzcG9uc2VUaW1lXG5cdFx0fSxcblx0XHQkdW5zZXQ6IHtcblx0XHRcdHdhaXRpbmdSZXNwb25zZTogMVxuXHRcdH1cblx0fSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jbG9zZUJ5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkLCBjbG9zZUluZm8pIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRfaWQ6IHJvb21JZFxuXHR9LCB7XG5cdFx0JHNldDoge1xuXHRcdFx0Y2xvc2VyOiBjbG9zZUluZm8uY2xvc2VyLFxuXHRcdFx0Y2xvc2VkQnk6IGNsb3NlSW5mby5jbG9zZWRCeSxcblx0XHRcdGNsb3NlZEF0OiBjbG9zZUluZm8uY2xvc2VkQXQsXG5cdFx0XHRjaGF0RHVyYXRpb246IGNsb3NlSW5mby5jaGF0RHVyYXRpb24sXG5cdFx0XHQndi5zdGF0dXMnOiAnb2ZmbGluZSdcblx0XHR9LFxuXHRcdCR1bnNldDoge1xuXHRcdFx0b3BlbjogMVxuXHRcdH1cblx0fSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5QWdlbnQgPSBmdW5jdGlvbih1c2VySWQpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0b3BlbjogdHJ1ZSxcblx0XHQnc2VydmVkQnkuX2lkJzogdXNlcklkXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jaGFuZ2VBZ2VudEJ5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkLCBuZXdBZ2VudCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IHJvb21JZFxuXHR9O1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0c2VydmVkQnk6IHtcblx0XHRcdFx0X2lkOiBuZXdBZ2VudC5hZ2VudElkLFxuXHRcdFx0XHR1c2VybmFtZTogbmV3QWdlbnQudXNlcm5hbWVcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0dGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlQ1JNRGF0YUJ5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkLCBjcm1EYXRhKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZDogcm9vbUlkXG5cdH07XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRjcm1EYXRhXG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZVZpc2l0b3JTdGF0dXMgPSBmdW5jdGlvbih0b2tlbiwgc3RhdHVzKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdCd2LnRva2VuJzogdG9rZW4sXG5cdFx0b3BlbjogdHJ1ZVxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHQndi5zdGF0dXMnOiBzdGF0dXNcblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcbiIsIlJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmtlZXBIaXN0b3J5Rm9yVG9rZW4gPSBmdW5jdGlvbih0b2tlbikge1xuXHRyZXR1cm4gdGhpcy51cGRhdGUoe1xuXHRcdCduYXZpZ2F0aW9uLnRva2VuJzogdG9rZW4sXG5cdFx0ZXhwaXJlQXQ6IHtcblx0XHRcdCRleGlzdHM6IHRydWVcblx0XHR9XG5cdH0sIHtcblx0XHQkdW5zZXQ6IHtcblx0XHRcdGV4cGlyZUF0OiAxXG5cdFx0fVxuXHR9LCB7XG5cdFx0bXVsdGk6IHRydWVcblx0fSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5zZXRSb29tSWRCeVRva2VuID0gZnVuY3Rpb24odG9rZW4sIHJpZCkge1xuXHRyZXR1cm4gdGhpcy51cGRhdGUoe1xuXHRcdCduYXZpZ2F0aW9uLnRva2VuJzogdG9rZW4sXG5cdFx0cmlkOiBudWxsXG5cdH0sIHtcblx0XHQkc2V0OiB7XG5cdFx0XHRyaWRcblx0XHR9XG5cdH0sIHtcblx0XHRtdWx0aTogdHJ1ZVxuXHR9KTtcbn07XG4iLCJjbGFzcyBMaXZlY2hhdEV4dGVybmFsTWVzc2FnZSBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2xpdmVjaGF0X2V4dGVybmFsX21lc3NhZ2UnKTtcblxuXHRcdGlmIChNZXRlb3IuaXNDbGllbnQpIHtcblx0XHRcdHRoaXMuX2luaXRNb2RlbCgnbGl2ZWNoYXRfZXh0ZXJuYWxfbWVzc2FnZScpO1xuXHRcdH1cblx0fVxuXG5cdC8vIEZJTkRcblx0ZmluZEJ5Um9vbUlkKHJvb21JZCwgc29ydCA9IHsgdHM6IC0xIH0pIHtcblx0XHRjb25zdCBxdWVyeSA9IHsgcmlkOiByb29tSWQgfTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmQocXVlcnksIHsgc29ydCB9KTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEV4dGVybmFsTWVzc2FnZSA9IG5ldyBMaXZlY2hhdEV4dGVybmFsTWVzc2FnZSgpO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbi8qKlxuICogTGl2ZWNoYXQgQ3VzdG9tIEZpZWxkcyBtb2RlbFxuICovXG5jbGFzcyBMaXZlY2hhdEN1c3RvbUZpZWxkIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignbGl2ZWNoYXRfY3VzdG9tX2ZpZWxkJyk7XG5cdH1cblxuXHQvLyBGSU5EXG5cdGZpbmRPbmVCeUlkKF9pZCwgb3B0aW9ucykge1xuXHRcdGNvbnN0IHF1ZXJ5ID0geyBfaWQgfTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnksIG9wdGlvbnMpO1xuXHR9XG5cblx0Y3JlYXRlT3JVcGRhdGVDdXN0b21GaWVsZChfaWQsIGZpZWxkLCBsYWJlbCwgc2NvcGUsIHZpc2liaWxpdHksIGV4dHJhRGF0YSkge1xuXHRcdGNvbnN0IHJlY29yZCA9IHtcblx0XHRcdGxhYmVsLFxuXHRcdFx0c2NvcGUsXG5cdFx0XHR2aXNpYmlsaXR5XG5cdFx0fTtcblxuXHRcdF8uZXh0ZW5kKHJlY29yZCwgZXh0cmFEYXRhKTtcblxuXHRcdGlmIChfaWQpIHtcblx0XHRcdHRoaXMudXBkYXRlKHsgX2lkIH0sIHsgJHNldDogcmVjb3JkIH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZWNvcmQuX2lkID0gZmllbGQ7XG5cdFx0XHRfaWQgPSB0aGlzLmluc2VydChyZWNvcmQpO1xuXHRcdH1cblxuXHRcdHJldHVybiByZWNvcmQ7XG5cdH1cblxuXHQvLyBSRU1PVkVcblx0cmVtb3ZlQnlJZChfaWQpIHtcblx0XHRjb25zdCBxdWVyeSA9IHsgX2lkIH07XG5cblx0XHRyZXR1cm4gdGhpcy5yZW1vdmUocXVlcnkpO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQgPSBuZXcgTGl2ZWNoYXRDdXN0b21GaWVsZCgpO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbi8qKlxuICogTGl2ZWNoYXQgRGVwYXJ0bWVudCBtb2RlbFxuICovXG5jbGFzcyBMaXZlY2hhdERlcGFydG1lbnQgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9kZXBhcnRtZW50Jyk7XG5cblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHtcblx0XHRcdG51bUFnZW50czogMSxcblx0XHRcdGVuYWJsZWQ6IDFcblx0XHR9KTtcblx0fVxuXG5cdC8vIEZJTkRcblx0ZmluZE9uZUJ5SWQoX2lkLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7IF9pZCB9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHRmaW5kQnlEZXBhcnRtZW50SWQoX2lkLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7IF9pZCB9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHRjcmVhdGVPclVwZGF0ZURlcGFydG1lbnQoX2lkLCB7IGVuYWJsZWQsIG5hbWUsIGRlc2NyaXB0aW9uLCBzaG93T25SZWdpc3RyYXRpb24gfSwgYWdlbnRzKSB7XG5cdFx0YWdlbnRzID0gW10uY29uY2F0KGFnZW50cyk7XG5cblx0XHRjb25zdCByZWNvcmQgPSB7XG5cdFx0XHRlbmFibGVkLFxuXHRcdFx0bmFtZSxcblx0XHRcdGRlc2NyaXB0aW9uLFxuXHRcdFx0bnVtQWdlbnRzOiBhZ2VudHMubGVuZ3RoLFxuXHRcdFx0c2hvd09uUmVnaXN0cmF0aW9uXG5cdFx0fTtcblxuXHRcdGlmIChfaWQpIHtcblx0XHRcdHRoaXMudXBkYXRlKHsgX2lkIH0sIHsgJHNldDogcmVjb3JkIH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRfaWQgPSB0aGlzLmluc2VydChyZWNvcmQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNhdmVkQWdlbnRzID0gXy5wbHVjayhSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMuZmluZEJ5RGVwYXJ0bWVudElkKF9pZCkuZmV0Y2goKSwgJ2FnZW50SWQnKTtcblx0XHRjb25zdCBhZ2VudHNUb1NhdmUgPSBfLnBsdWNrKGFnZW50cywgJ2FnZW50SWQnKTtcblxuXHRcdC8vIHJlbW92ZSBvdGhlciBhZ2VudHNcblx0XHRfLmRpZmZlcmVuY2Uoc2F2ZWRBZ2VudHMsIGFnZW50c1RvU2F2ZSkuZm9yRWFjaCgoYWdlbnRJZCkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLnJlbW92ZUJ5RGVwYXJ0bWVudElkQW5kQWdlbnRJZChfaWQsIGFnZW50SWQpO1xuXHRcdH0pO1xuXG5cdFx0YWdlbnRzLmZvckVhY2goKGFnZW50KSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMuc2F2ZUFnZW50KHtcblx0XHRcdFx0YWdlbnRJZDogYWdlbnQuYWdlbnRJZCxcblx0XHRcdFx0ZGVwYXJ0bWVudElkOiBfaWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZSxcblx0XHRcdFx0Y291bnQ6IGFnZW50LmNvdW50ID8gcGFyc2VJbnQoYWdlbnQuY291bnQpIDogMCxcblx0XHRcdFx0b3JkZXI6IGFnZW50Lm9yZGVyID8gcGFyc2VJbnQoYWdlbnQub3JkZXIpIDogMFxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gXy5leHRlbmQocmVjb3JkLCB7IF9pZCB9KTtcblx0fVxuXG5cdC8vIFJFTU9WRVxuXHRyZW1vdmVCeUlkKF9pZCkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0geyBfaWQgfTtcblxuXHRcdHJldHVybiB0aGlzLnJlbW92ZShxdWVyeSk7XG5cdH1cblxuXHRmaW5kRW5hYmxlZFdpdGhBZ2VudHMoKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRudW1BZ2VudHM6IHsgJGd0OiAwIH0sXG5cdFx0XHRlbmFibGVkOiB0cnVlXG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5KTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQgPSBuZXcgTGl2ZWNoYXREZXBhcnRtZW50KCk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbi8qKlxuICogTGl2ZWNoYXQgRGVwYXJ0bWVudCBtb2RlbFxuICovXG5jbGFzcyBMaXZlY2hhdERlcGFydG1lbnRBZ2VudHMgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9kZXBhcnRtZW50X2FnZW50cycpO1xuXHR9XG5cblx0ZmluZEJ5RGVwYXJ0bWVudElkKGRlcGFydG1lbnRJZCkge1xuXHRcdHJldHVybiB0aGlzLmZpbmQoeyBkZXBhcnRtZW50SWQgfSk7XG5cdH1cblxuXHRzYXZlQWdlbnQoYWdlbnQpIHtcblx0XHRyZXR1cm4gdGhpcy51cHNlcnQoe1xuXHRcdFx0YWdlbnRJZDogYWdlbnQuYWdlbnRJZCxcblx0XHRcdGRlcGFydG1lbnRJZDogYWdlbnQuZGVwYXJ0bWVudElkXG5cdFx0fSwge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHR1c2VybmFtZTogYWdlbnQudXNlcm5hbWUsXG5cdFx0XHRcdGNvdW50OiBwYXJzZUludChhZ2VudC5jb3VudCksXG5cdFx0XHRcdG9yZGVyOiBwYXJzZUludChhZ2VudC5vcmRlcilcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHJlbW92ZUJ5RGVwYXJ0bWVudElkQW5kQWdlbnRJZChkZXBhcnRtZW50SWQsIGFnZW50SWQpIHtcblx0XHR0aGlzLnJlbW92ZSh7IGRlcGFydG1lbnRJZCwgYWdlbnRJZCB9KTtcblx0fVxuXG5cdGdldE5leHRBZ2VudEZvckRlcGFydG1lbnQoZGVwYXJ0bWVudElkKSB7XG5cdFx0Y29uc3QgYWdlbnRzID0gdGhpcy5maW5kQnlEZXBhcnRtZW50SWQoZGVwYXJ0bWVudElkKS5mZXRjaCgpO1xuXG5cdFx0aWYgKGFnZW50cy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBvbmxpbmVVc2VycyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmxpbmVVc2VyRnJvbUxpc3QoXy5wbHVjayhhZ2VudHMsICd1c2VybmFtZScpKTtcblxuXHRcdGNvbnN0IG9ubGluZVVzZXJuYW1lcyA9IF8ucGx1Y2sob25saW5lVXNlcnMuZmV0Y2goKSwgJ3VzZXJuYW1lJyk7XG5cblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdGRlcGFydG1lbnRJZCxcblx0XHRcdHVzZXJuYW1lOiB7XG5cdFx0XHRcdCRpbjogb25saW5lVXNlcm5hbWVzXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGNvbnN0IHNvcnQgPSB7XG5cdFx0XHRjb3VudDogMSxcblx0XHRcdG9yZGVyOiAxLFxuXHRcdFx0dXNlcm5hbWU6IDFcblx0XHR9O1xuXHRcdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHRcdCRpbmM6IHtcblx0XHRcdFx0Y291bnQ6IDFcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Y29uc3QgY29sbGVjdGlvbk9iaiA9IHRoaXMubW9kZWwucmF3Q29sbGVjdGlvbigpO1xuXHRcdGNvbnN0IGZpbmRBbmRNb2RpZnkgPSBNZXRlb3Iud3JhcEFzeW5jKGNvbGxlY3Rpb25PYmouZmluZEFuZE1vZGlmeSwgY29sbGVjdGlvbk9iaik7XG5cblx0XHRjb25zdCBhZ2VudCA9IGZpbmRBbmRNb2RpZnkocXVlcnksIHNvcnQsIHVwZGF0ZSk7XG5cdFx0aWYgKGFnZW50ICYmIGFnZW50LnZhbHVlKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRhZ2VudElkOiBhZ2VudC52YWx1ZS5hZ2VudElkLFxuXHRcdFx0XHR1c2VybmFtZTogYWdlbnQudmFsdWUudXNlcm5hbWVcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0fVxuXG5cdGdldE9ubGluZUZvckRlcGFydG1lbnQoZGVwYXJ0bWVudElkKSB7XG5cdFx0Y29uc3QgYWdlbnRzID0gdGhpcy5maW5kQnlEZXBhcnRtZW50SWQoZGVwYXJ0bWVudElkKS5mZXRjaCgpO1xuXG5cdFx0aWYgKGFnZW50cy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cblx0XHRjb25zdCBvbmxpbmVVc2VycyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmxpbmVVc2VyRnJvbUxpc3QoXy5wbHVjayhhZ2VudHMsICd1c2VybmFtZScpKTtcblxuXHRcdGNvbnN0IG9ubGluZVVzZXJuYW1lcyA9IF8ucGx1Y2sob25saW5lVXNlcnMuZmV0Y2goKSwgJ3VzZXJuYW1lJyk7XG5cblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdGRlcGFydG1lbnRJZCxcblx0XHRcdHVzZXJuYW1lOiB7XG5cdFx0XHRcdCRpbjogb25saW5lVXNlcm5hbWVzXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGNvbnN0IGRlcEFnZW50cyA9IHRoaXMuZmluZChxdWVyeSk7XG5cblx0XHRpZiAoZGVwQWdlbnRzKSB7XG5cdFx0XHRyZXR1cm4gZGVwQWdlbnRzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gW107XG5cdFx0fVxuXHR9XG5cblx0ZmluZFVzZXJzSW5RdWV1ZSh1c2Vyc0xpc3QpIHtcblx0XHRjb25zdCBxdWVyeSA9IHt9O1xuXG5cdFx0aWYgKCFfLmlzRW1wdHkodXNlcnNMaXN0KSkge1xuXHRcdFx0cXVlcnkudXNlcm5hbWUgPSB7XG5cdFx0XHRcdCRpbjogdXNlcnNMaXN0XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRzb3J0OiB7XG5cdFx0XHRcdGRlcGFydG1lbnRJZDogMSxcblx0XHRcdFx0Y291bnQ6IDEsXG5cdFx0XHRcdG9yZGVyOiAxLFxuXHRcdFx0XHR1c2VybmFtZTogMVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdHJlcGxhY2VVc2VybmFtZU9mQWdlbnRCeVVzZXJJZCh1c2VySWQsIHVzZXJuYW1lKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7J2FnZW50SWQnOiB1c2VySWR9O1xuXG5cdFx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHR1c2VybmFtZVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSwgeyBtdWx0aTogdHJ1ZSB9KTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMgPSBuZXcgTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzKCk7XG4iLCIvKipcbiAqIExpdmVjaGF0IFBhZ2UgVmlzaXRlZCBtb2RlbFxuICovXG5jbGFzcyBMaXZlY2hhdFBhZ2VWaXNpdGVkIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignbGl2ZWNoYXRfcGFnZV92aXNpdGVkJyk7XG5cblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgJ3Rva2VuJzogMSB9KTtcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgJ3RzJzogMSB9KTtcblxuXHRcdC8vIGtlZXAgaGlzdG9yeSBmb3IgMSBtb250aCBpZiB0aGUgdmlzaXRvciBkb2VzIG5vdCByZWdpc3RlclxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyAnZXhwaXJlQXQnOiAxIH0sIHsgc3BhcnNlOiAxLCBleHBpcmVBZnRlclNlY29uZHM6IDAgfSk7XG5cdH1cblxuXHRzYXZlQnlUb2tlbih0b2tlbiwgcGFnZUluZm8pIHtcblx0XHQvLyBrZWVwIGhpc3Rvcnkgb2YgdW5yZWdpc3RlcmVkIHZpc2l0b3JzIGZvciAxIG1vbnRoXG5cdFx0Y29uc3Qga2VlcEhpc3RvcnlNaWxpc2Vjb25kcyA9IDI1OTIwMDAwMDA7XG5cblx0XHRyZXR1cm4gdGhpcy5pbnNlcnQoe1xuXHRcdFx0dG9rZW4sXG5cdFx0XHRwYWdlOiBwYWdlSW5mbyxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0ZXhwaXJlQXQ6IG5ldyBEYXRlKCkuZ2V0VGltZSgpICsga2VlcEhpc3RvcnlNaWxpc2Vjb25kc1xuXHRcdH0pO1xuXHR9XG5cblx0ZmluZEJ5VG9rZW4odG9rZW4pIHtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHsgdG9rZW4gfSwgeyBzb3J0IDogeyB0czogLTEgfSwgbGltaXQ6IDIwIH0pO1xuXHR9XG5cblx0a2VlcEhpc3RvcnlGb3JUb2tlbih0b2tlbikge1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0XHR0b2tlbixcblx0XHRcdGV4cGlyZUF0OiB7XG5cdFx0XHRcdCRleGlzdHM6IHRydWVcblx0XHRcdH1cblx0XHR9LCB7XG5cdFx0XHQkdW5zZXQ6IHtcblx0XHRcdFx0ZXhwaXJlQXQ6IDFcblx0XHRcdH1cblx0XHR9LCB7XG5cdFx0XHRtdWx0aTogdHJ1ZVxuXHRcdH0pO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0UGFnZVZpc2l0ZWQgPSBuZXcgTGl2ZWNoYXRQYWdlVmlzaXRlZCgpO1xuIiwiLyoqXG4gKiBMaXZlY2hhdCBUcmlnZ2VyIG1vZGVsXG4gKi9cbmNsYXNzIExpdmVjaGF0VHJpZ2dlciBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2xpdmVjaGF0X3RyaWdnZXInKTtcblx0fVxuXG5cdHVwZGF0ZUJ5SWQoX2lkLCBkYXRhKSB7XG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHsgX2lkIH0sIHsgJHNldDogZGF0YSB9KTtcblx0fVxuXG5cdHJlbW92ZUFsbCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yZW1vdmUoe30pO1xuXHR9XG5cblx0ZmluZEJ5SWQoX2lkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZmluZCh7IF9pZCB9KTtcblx0fVxuXG5cdHJlbW92ZUJ5SWQoX2lkKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVtb3ZlKHsgX2lkIH0pO1xuXHR9XG5cblx0ZmluZEVuYWJsZWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZmluZCh7IGVuYWJsZWQ6IHRydWUgfSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRUcmlnZ2VyID0gbmV3IExpdmVjaGF0VHJpZ2dlcigpO1xuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnRyeUVuc3VyZUluZGV4KHsgb3BlbjogMSB9LCB7IHNwYXJzZTogMSB9KTtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudHJ5RW5zdXJlSW5kZXgoeyAndmlzaXRvckVtYWlscy5hZGRyZXNzJzogMSB9KTtcbn0pO1xuIiwiY2xhc3MgTGl2ZWNoYXRJbnF1aXJ5IGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignbGl2ZWNoYXRfaW5xdWlyeScpO1xuXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7ICdyaWQnOiAxIH0pOyAvLyByb29tIGlkIGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBpbnF1aXJ5XG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7ICduYW1lJzogMSB9KTsgLy8gbmFtZSBvZiB0aGUgaW5xdWlyeSAoY2xpZW50IG5hbWUgZm9yIG5vdylcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgJ21lc3NhZ2UnOiAxIH0pOyAvLyBtZXNzYWdlIHNlbnQgYnkgdGhlIGNsaWVudFxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyAndHMnOiAxIH0pOyAvLyB0aW1lc3RhbXBcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgJ2FnZW50cyc6IDF9KTsgLy8gSWQncyBvZiB0aGUgYWdlbnRzIHdobyBjYW4gc2VlIHRoZSBpbnF1aXJ5IChoYW5kbGUgZGVwYXJ0bWVudHMpXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7ICdzdGF0dXMnOiAxfSk7IC8vICdvcGVuJywgJ3Rha2VuJ1xuXHR9XG5cblx0ZmluZE9uZUJ5SWQoaW5xdWlyeUlkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZmluZE9uZSh7IF9pZDogaW5xdWlyeUlkIH0pO1xuXHR9XG5cblx0Lypcblx0ICogbWFyayB0aGUgaW5xdWlyeSBhcyB0YWtlblxuXHQgKi9cblx0dGFrZUlucXVpcnkoaW5xdWlyeUlkKSB7XG5cdFx0dGhpcy51cGRhdGUoe1xuXHRcdFx0J19pZCc6IGlucXVpcnlJZFxuXHRcdH0sIHtcblx0XHRcdCRzZXQ6IHsgc3RhdHVzOiAndGFrZW4nIH1cblx0XHR9KTtcblx0fVxuXG5cdC8qXG5cdCAqIG1hcmsgdGhlIGlucXVpcnkgYXMgY2xvc2VkXG5cdCAqL1xuXHRjbG9zZUJ5Um9vbUlkKHJvb21JZCwgY2xvc2VJbmZvKSB7XG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRcdHJpZDogcm9vbUlkXG5cdFx0fSwge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHRzdGF0dXM6ICdjbG9zZWQnLFxuXHRcdFx0XHRjbG9zZXI6IGNsb3NlSW5mby5jbG9zZXIsXG5cdFx0XHRcdGNsb3NlZEJ5OiBjbG9zZUluZm8uY2xvc2VkQnksXG5cdFx0XHRcdGNsb3NlZEF0OiBjbG9zZUluZm8uY2xvc2VkQXQsXG5cdFx0XHRcdGNoYXREdXJhdGlvbjogY2xvc2VJbmZvLmNoYXREdXJhdGlvblxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0Lypcblx0ICogbWFyayBpbnF1aXJ5IGFzIG9wZW5cblx0ICovXG5cdG9wZW5JbnF1aXJ5KGlucXVpcnlJZCkge1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0XHQnX2lkJzogaW5xdWlyeUlkXG5cdFx0fSwge1xuXHRcdFx0JHNldDogeyBzdGF0dXM6ICdvcGVuJyB9XG5cdFx0fSk7XG5cdH1cblxuXHQvKlxuXHQgKiBtYXJrIGlucXVpcnkgYXMgb3BlbiBhbmQgc2V0IGFnZW50c1xuXHQgKi9cblx0b3BlbklucXVpcnlXaXRoQWdlbnRzKGlucXVpcnlJZCwgYWdlbnRJZHMpIHtcblx0XHRyZXR1cm4gdGhpcy51cGRhdGUoe1xuXHRcdFx0J19pZCc6IGlucXVpcnlJZFxuXHRcdH0sIHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0c3RhdHVzOiAnb3BlbicsXG5cdFx0XHRcdGFnZW50czogYWdlbnRJZHNcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdC8qXG5cdCAqIHJldHVybiB0aGUgc3RhdHVzIG9mIHRoZSBpbnF1aXJ5IChvcGVuIG9yIHRha2VuKVxuXHQgKi9cblx0Z2V0U3RhdHVzKGlucXVpcnlJZCkge1xuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUoeydfaWQnOiBpbnF1aXJ5SWR9KS5zdGF0dXM7XG5cdH1cblxuXHR1cGRhdGVWaXNpdG9yU3RhdHVzKHRva2VuLCBzdGF0dXMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdCd2LnRva2VuJzogdG9rZW4sXG5cdFx0XHRzdGF0dXM6ICdvcGVuJ1xuXHRcdH07XG5cblx0XHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdCd2LnN0YXR1cyc6IHN0YXR1c1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5ID0gbmV3IExpdmVjaGF0SW5xdWlyeSgpO1xuIiwiaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuXG5jbGFzcyBMaXZlY2hhdE9mZmljZUhvdXIgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9vZmZpY2VfaG91cicpO1xuXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7ICdkYXknOiAxIH0pOyAvLyB0aGUgZGF5IG9mIHRoZSB3ZWVrIG1vbmRheSAtIHN1bmRheVxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyAnc3RhcnQnOiAxIH0pOyAvLyB0aGUgb3BlbmluZyBob3VycyBvZiB0aGUgb2ZmaWNlXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7ICdmaW5pc2gnOiAxIH0pOyAvLyB0aGUgY2xvc2luZyBob3VycyBvZiB0aGUgb2ZmaWNlXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7ICdvcGVuJzogMSB9KTsgLy8gd2hldGhlciBvciBub3QgdGhlIG9mZmljZXMgYXJlIG9wZW4gb24gdGhpcyBkYXlcblxuXHRcdC8vIGlmIHRoZXJlIGlzIG5vdGhpbmcgaW4gdGhlIGNvbGxlY3Rpb24sIGFkZCBkZWZhdWx0c1xuXHRcdGlmICh0aGlzLmZpbmQoKS5jb3VudCgpID09PSAwKSB7XG5cdFx0XHR0aGlzLmluc2VydCh7J2RheScgOiAnTW9uZGF5JywgJ3N0YXJ0JyA6ICcwODowMCcsICdmaW5pc2gnIDogJzIwOjAwJywgJ2NvZGUnIDogMSwgJ29wZW4nIDogdHJ1ZSB9KTtcblx0XHRcdHRoaXMuaW5zZXJ0KHsnZGF5JyA6ICdUdWVzZGF5JywgJ3N0YXJ0JyA6ICcwODowMCcsICdmaW5pc2gnIDogJzIwOjAwJywgJ2NvZGUnIDogMiwgJ29wZW4nIDogdHJ1ZSB9KTtcblx0XHRcdHRoaXMuaW5zZXJ0KHsnZGF5JyA6ICdXZWRuZXNkYXknLCAnc3RhcnQnIDogJzA4OjAwJywgJ2ZpbmlzaCcgOiAnMjA6MDAnLCAnY29kZScgOiAzLCAnb3BlbicgOiB0cnVlIH0pO1xuXHRcdFx0dGhpcy5pbnNlcnQoeydkYXknIDogJ1RodXJzZGF5JywgJ3N0YXJ0JyA6ICcwODowMCcsICdmaW5pc2gnIDogJzIwOjAwJywgJ2NvZGUnIDogNCwgJ29wZW4nIDogdHJ1ZSB9KTtcblx0XHRcdHRoaXMuaW5zZXJ0KHsnZGF5JyA6ICdGcmlkYXknLCAnc3RhcnQnIDogJzA4OjAwJywgJ2ZpbmlzaCcgOiAnMjA6MDAnLCAnY29kZScgOiA1LCAnb3BlbicgOiB0cnVlIH0pO1xuXHRcdFx0dGhpcy5pbnNlcnQoeydkYXknIDogJ1NhdHVyZGF5JywgJ3N0YXJ0JyA6ICcwODowMCcsICdmaW5pc2gnIDogJzIwOjAwJywgJ2NvZGUnIDogNiwgJ29wZW4nIDogZmFsc2UgfSk7XG5cdFx0XHR0aGlzLmluc2VydCh7J2RheScgOiAnU3VuZGF5JywgJ3N0YXJ0JyA6ICcwODowMCcsICdmaW5pc2gnIDogJzIwOjAwJywgJ2NvZGUnIDogMCwgJ29wZW4nIDogZmFsc2UgfSk7XG5cdFx0fVxuXHR9XG5cblx0Lypcblx0ICogdXBkYXRlIHRoZSBnaXZlbiBkYXlzIHN0YXJ0IGFuZCBmaW5pc2ggdGltZXMgYW5kIHdoZXRoZXIgdGhlIG9mZmljZSBpcyBvcGVuIG9uIHRoYXQgZGF5XG5cdCAqL1xuXHR1cGRhdGVIb3VycyhkYXksIG5ld1N0YXJ0LCBuZXdGaW5pc2gsIG5ld09wZW4pIHtcblx0XHR0aGlzLnVwZGF0ZSh7XG5cdFx0XHRkYXlcblx0XHR9LCB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdHN0YXJ0OiBuZXdTdGFydCxcblx0XHRcdFx0ZmluaXNoOiBuZXdGaW5pc2gsXG5cdFx0XHRcdG9wZW46IG5ld09wZW5cblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdC8qXG5cdCAqIENoZWNrIGlmIHRoZSBjdXJyZW50IHNlcnZlciB0aW1lICh1dGMpIGlzIHdpdGhpbiB0aGUgb2ZmaWNlIGhvdXJzIG9mIHRoYXQgZGF5XG5cdCAqIHJldHVybnMgdHJ1ZSBvciBmYWxzZVxuXHQgKi9cblx0aXNOb3dXaXRoaW5Ib3VycygpIHtcblx0XHQvLyBnZXQgY3VycmVudCB0aW1lIG9uIHNlcnZlciBpbiB1dGNcblx0XHQvLyB2YXIgY3QgPSBtb21lbnQoKS51dGMoKTtcblx0XHRjb25zdCBjdXJyZW50VGltZSA9IG1vbWVudC51dGMobW9tZW50KCkudXRjKCkuZm9ybWF0KCdkZGRkOkhIOm1tJyksICdkZGRkOkhIOm1tJyk7XG5cblx0XHQvLyBnZXQgdG9kYXlzIG9mZmljZSBob3VycyBmcm9tIGRiXG5cdFx0Y29uc3QgdG9kYXlzT2ZmaWNlSG91cnMgPSB0aGlzLmZpbmRPbmUoe2RheTogY3VycmVudFRpbWUuZm9ybWF0KCdkZGRkJyl9KTtcblx0XHRpZiAoIXRvZGF5c09mZmljZUhvdXJzKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgaWYgb2ZmaWNlcyBhcmUgb3BlbiB0b2RheVxuXHRcdGlmICh0b2RheXNPZmZpY2VIb3Vycy5vcGVuID09PSBmYWxzZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN0YXJ0ID0gbW9tZW50LnV0YyhgJHsgdG9kYXlzT2ZmaWNlSG91cnMuZGF5IH06JHsgdG9kYXlzT2ZmaWNlSG91cnMuc3RhcnQgfWAsICdkZGRkOkhIOm1tJyk7XG5cdFx0Y29uc3QgZmluaXNoID0gbW9tZW50LnV0YyhgJHsgdG9kYXlzT2ZmaWNlSG91cnMuZGF5IH06JHsgdG9kYXlzT2ZmaWNlSG91cnMuZmluaXNoIH1gLCAnZGRkZDpISDptbScpO1xuXG5cdFx0Ly8gY29uc29sZS5sb2coZmluaXNoLmlzQmVmb3JlKHN0YXJ0KSk7XG5cdFx0aWYgKGZpbmlzaC5pc0JlZm9yZShzdGFydCkpIHtcblx0XHRcdC8vIGZpbmlzaC5kYXkoZmluaXNoLmRheSgpKzEpO1xuXHRcdFx0ZmluaXNoLmFkZCgxLCAnZGF5cycpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJlc3VsdCA9IGN1cnJlbnRUaW1lLmlzQmV0d2VlbihzdGFydCwgZmluaXNoKTtcblxuXHRcdC8vIGluQmV0d2VlbiAgY2hlY2tcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0aXNPcGVuaW5nVGltZSgpIHtcblx0XHQvLyBnZXQgY3VycmVudCB0aW1lIG9uIHNlcnZlciBpbiB1dGNcblx0XHRjb25zdCBjdXJyZW50VGltZSA9IG1vbWVudC51dGMobW9tZW50KCkudXRjKCkuZm9ybWF0KCdkZGRkOkhIOm1tJyksICdkZGRkOkhIOm1tJyk7XG5cblx0XHQvLyBnZXQgdG9kYXlzIG9mZmljZSBob3VycyBmcm9tIGRiXG5cdFx0Y29uc3QgdG9kYXlzT2ZmaWNlSG91cnMgPSB0aGlzLmZpbmRPbmUoe2RheTogY3VycmVudFRpbWUuZm9ybWF0KCdkZGRkJyl9KTtcblx0XHRpZiAoIXRvZGF5c09mZmljZUhvdXJzKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgaWYgb2ZmaWNlcyBhcmUgb3BlbiB0b2RheVxuXHRcdGlmICh0b2RheXNPZmZpY2VIb3Vycy5vcGVuID09PSBmYWxzZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN0YXJ0ID0gbW9tZW50LnV0YyhgJHsgdG9kYXlzT2ZmaWNlSG91cnMuZGF5IH06JHsgdG9kYXlzT2ZmaWNlSG91cnMuc3RhcnQgfWAsICdkZGRkOkhIOm1tJyk7XG5cblx0XHRyZXR1cm4gc3RhcnQuaXNTYW1lKGN1cnJlbnRUaW1lLCAnbWludXRlJyk7XG5cdH1cblxuXHRpc0Nsb3NpbmdUaW1lKCkge1xuXHRcdC8vIGdldCBjdXJyZW50IHRpbWUgb24gc2VydmVyIGluIHV0Y1xuXHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gbW9tZW50LnV0Yyhtb21lbnQoKS51dGMoKS5mb3JtYXQoJ2RkZGQ6SEg6bW0nKSwgJ2RkZGQ6SEg6bW0nKTtcblxuXHRcdC8vIGdldCB0b2RheXMgb2ZmaWNlIGhvdXJzIGZyb20gZGJcblx0XHRjb25zdCB0b2RheXNPZmZpY2VIb3VycyA9IHRoaXMuZmluZE9uZSh7ZGF5OiBjdXJyZW50VGltZS5mb3JtYXQoJ2RkZGQnKX0pO1xuXHRcdGlmICghdG9kYXlzT2ZmaWNlSG91cnMpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5pc2ggPSBtb21lbnQudXRjKGAkeyB0b2RheXNPZmZpY2VIb3Vycy5kYXkgfTokeyB0b2RheXNPZmZpY2VIb3Vycy5maW5pc2ggfWAsICdkZGRkOkhIOm1tJyk7XG5cblx0XHRyZXR1cm4gZmluaXNoLmlzU2FtZShjdXJyZW50VGltZSwgJ21pbnV0ZScpO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0T2ZmaWNlSG91ciA9IG5ldyBMaXZlY2hhdE9mZmljZUhvdXIoKTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuXG5jbGFzcyBMaXZlY2hhdFZpc2l0b3JzIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignbGl2ZWNoYXRfdmlzaXRvcicpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldHMgdmlzaXRvciBieSB0b2tlblxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gLSBWaXNpdG9yIHRva2VuXG5cdCAqL1xuXHRnZXRWaXNpdG9yQnlUb2tlbih0b2tlbiwgb3B0aW9ucykge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0dG9rZW5cblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHQvKipcblx0ICogRmluZCB2aXNpdG9ycyBieSBfaWRcblx0ICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIC0gVmlzaXRvciB0b2tlblxuXHQgKi9cblx0ZmluZEJ5SWQoX2lkLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRfaWRcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHQvKipcblx0ICogR2V0cyB2aXNpdG9yIGJ5IHRva2VuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0b2tlbiAtIFZpc2l0b3IgdG9rZW5cblx0ICovXG5cdGZpbmRWaXNpdG9yQnlUb2tlbih0b2tlbikge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0dG9rZW5cblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG5cdH1cblxuXHR1cGRhdGVMaXZlY2hhdERhdGFCeVRva2VuKHRva2VuLCBrZXksIHZhbHVlLCBvdmVyd3JpdGUgPSB0cnVlKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHR0b2tlblxuXHRcdH07XG5cblx0XHRpZiAoIW92ZXJ3cml0ZSkge1xuXHRcdFx0Y29uc3QgdXNlciA9IHRoaXMuZmluZE9uZShxdWVyeSwgeyBmaWVsZHM6IHsgbGl2ZWNoYXREYXRhOiAxIH0gfSk7XG5cdFx0XHRpZiAodXNlci5saXZlY2hhdERhdGEgJiYgdHlwZW9mIHVzZXIubGl2ZWNoYXREYXRhW2tleV0gIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0W2BsaXZlY2hhdERhdGEuJHsga2V5IH1gXTogdmFsdWVcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEZpbmQgYSB2aXNpdG9yIGJ5IHRoZWlyIHBob25lIG51bWJlclxuXHQgKiBAcmV0dXJuIHtvYmplY3R9IFVzZXIgZnJvbSBkYlxuXHQgKi9cblx0ZmluZE9uZVZpc2l0b3JCeVBob25lKHBob25lKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHQncGhvbmUucGhvbmVOdW1iZXInOiBwaG9uZVxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXQgdGhlIG5leHQgdmlzaXRvciBuYW1lXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gVGhlIG5leHQgdmlzaXRvciBuYW1lXG5cdCAqL1xuXHRnZXROZXh0VmlzaXRvclVzZXJuYW1lKCkge1xuXHRcdGNvbnN0IHNldHRpbmdzUmF3ID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MubW9kZWwucmF3Q29sbGVjdGlvbigpO1xuXHRcdGNvbnN0IGZpbmRBbmRNb2RpZnkgPSBNZXRlb3Iud3JhcEFzeW5jKHNldHRpbmdzUmF3LmZpbmRBbmRNb2RpZnksIHNldHRpbmdzUmF3KTtcblxuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0X2lkOiAnTGl2ZWNoYXRfZ3Vlc3RfY291bnQnXG5cdFx0fTtcblxuXHRcdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHRcdCRpbmM6IHtcblx0XHRcdFx0dmFsdWU6IDFcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Y29uc3QgbGl2ZWNoYXRDb3VudCA9IGZpbmRBbmRNb2RpZnkocXVlcnksIG51bGwsIHVwZGF0ZSk7XG5cblx0XHRyZXR1cm4gYGd1ZXN0LSR7IGxpdmVjaGF0Q291bnQudmFsdWUudmFsdWUgKyAxIH1gO1xuXHR9XG5cblx0dXBkYXRlQnlJZChfaWQsIHVwZGF0ZSkge1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7IF9pZCB9LCB1cGRhdGUpO1xuXHR9XG5cblx0c2F2ZUd1ZXN0QnlJZChfaWQsIGRhdGEpIHtcblx0XHRjb25zdCBzZXREYXRhID0ge307XG5cdFx0Y29uc3QgdW5zZXREYXRhID0ge307XG5cblx0XHRpZiAoZGF0YS5uYW1lKSB7XG5cdFx0XHRpZiAoIV8uaXNFbXB0eShzLnRyaW0oZGF0YS5uYW1lKSkpIHtcblx0XHRcdFx0c2V0RGF0YS5uYW1lID0gcy50cmltKGRhdGEubmFtZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1bnNldERhdGEubmFtZSA9IDE7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGRhdGEuZW1haWwpIHtcblx0XHRcdGlmICghXy5pc0VtcHR5KHMudHJpbShkYXRhLmVtYWlsKSkpIHtcblx0XHRcdFx0c2V0RGF0YS52aXNpdG9yRW1haWxzID0gW1xuXHRcdFx0XHRcdHsgYWRkcmVzczogcy50cmltKGRhdGEuZW1haWwpIH1cblx0XHRcdFx0XTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHVuc2V0RGF0YS52aXNpdG9yRW1haWxzID0gMTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZGF0YS5waG9uZSkge1xuXHRcdFx0aWYgKCFfLmlzRW1wdHkocy50cmltKGRhdGEucGhvbmUpKSkge1xuXHRcdFx0XHRzZXREYXRhLnBob25lID0gW1xuXHRcdFx0XHRcdHsgcGhvbmVOdW1iZXI6IHMudHJpbShkYXRhLnBob25lKSB9XG5cdFx0XHRcdF07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1bnNldERhdGEucGhvbmUgPSAxO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IHVwZGF0ZSA9IHt9O1xuXG5cdFx0aWYgKCFfLmlzRW1wdHkoc2V0RGF0YSkpIHtcblx0XHRcdHVwZGF0ZS4kc2V0ID0gc2V0RGF0YTtcblx0XHR9XG5cblx0XHRpZiAoIV8uaXNFbXB0eSh1bnNldERhdGEpKSB7XG5cdFx0XHR1cGRhdGUuJHVuc2V0ID0gdW5zZXREYXRhO1xuXHRcdH1cblxuXHRcdGlmIChfLmlzRW1wdHkodXBkYXRlKSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHsgX2lkIH0sIHVwZGF0ZSk7XG5cdH1cblxuXHRmaW5kT25lR3Vlc3RCeUVtYWlsQWRkcmVzcyhlbWFpbEFkZHJlc3MpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdCd2aXNpdG9yRW1haWxzLmFkZHJlc3MnOiBuZXcgUmVnRXhwKGBeJHsgcy5lc2NhcGVSZWdFeHAoZW1haWxBZGRyZXNzKSB9JGAsICdpJylcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSk7XG5cdH1cblxuXHRzYXZlR3Vlc3RFbWFpbFBob25lQnlJZChfaWQsIGVtYWlscywgcGhvbmVzKSB7XG5cdFx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdFx0JGFkZFRvU2V0OiB7fVxuXHRcdH07XG5cblx0XHRjb25zdCBzYXZlRW1haWwgPSBbXS5jb25jYXQoZW1haWxzKVxuXHRcdFx0LmZpbHRlcihlbWFpbCA9PiBlbWFpbCAmJiBlbWFpbC50cmltKCkpXG5cdFx0XHQubWFwKGVtYWlsID0+IHtcblx0XHRcdFx0cmV0dXJuIHsgYWRkcmVzczogZW1haWwgfTtcblx0XHRcdH0pO1xuXG5cdFx0aWYgKHNhdmVFbWFpbC5sZW5ndGggPiAwKSB7XG5cdFx0XHR1cGRhdGUuJGFkZFRvU2V0LnZpc2l0b3JFbWFpbHMgPSB7ICRlYWNoOiBzYXZlRW1haWwgfTtcblx0XHR9XG5cblx0XHRjb25zdCBzYXZlUGhvbmUgPSBbXS5jb25jYXQocGhvbmVzKVxuXHRcdFx0LmZpbHRlcihwaG9uZSA9PiBwaG9uZSAmJiBwaG9uZS50cmltKCkucmVwbGFjZSgvW15cXGRdL2csICcnKSlcblx0XHRcdC5tYXAocGhvbmUgPT4ge1xuXHRcdFx0XHRyZXR1cm4geyBwaG9uZU51bWJlcjogcGhvbmUgfTtcblx0XHRcdH0pO1xuXG5cdFx0aWYgKHNhdmVQaG9uZS5sZW5ndGggPiAwKSB7XG5cdFx0XHR1cGRhdGUuJGFkZFRvU2V0LnBob25lID0geyAkZWFjaDogc2F2ZVBob25lIH07XG5cdFx0fVxuXG5cdFx0aWYgKCF1cGRhdGUuJGFkZFRvU2V0LnZpc2l0b3JFbWFpbHMgJiYgIXVwZGF0ZS4kYWRkVG9TZXQucGhvbmUpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy51cGRhdGUoeyBfaWQgfSwgdXBkYXRlKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgTGl2ZWNoYXRWaXNpdG9ycygpO1xuIiwiLyogZ2xvYmFscyBIVFRQICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcbmltcG9ydCBVQVBhcnNlciBmcm9tICd1YS1wYXJzZXItanMnO1xuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5Sb2NrZXRDaGF0LkxpdmVjaGF0ID0ge1xuXHRoaXN0b3J5TW9uaXRvclR5cGU6ICd1cmwnLFxuXG5cdGxvZ2dlcjogbmV3IExvZ2dlcignTGl2ZWNoYXQnLCB7XG5cdFx0c2VjdGlvbnM6IHtcblx0XHRcdHdlYmhvb2s6ICdXZWJob29rJ1xuXHRcdH1cblx0fSksXG5cblx0Z2V0TmV4dEFnZW50KGRlcGFydG1lbnQpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJykgPT09ICdFeHRlcm5hbCcpIHtcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGNvbnN0IHF1ZXJ5U3RyaW5nID0gZGVwYXJ0bWVudCA/IGA/ZGVwYXJ0bWVudElkPSR7IGRlcGFydG1lbnQgfWAgOiAnJztcblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ0dFVCcsIGAkeyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRXh0ZXJuYWxfUXVldWVfVVJMJykgfSR7IHF1ZXJ5U3RyaW5nIH1gLCB7XG5cdFx0XHRcdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdFx0XHRcdCdVc2VyLUFnZW50JzogJ1JvY2tldENoYXQgU2VydmVyJyxcblx0XHRcdFx0XHRcdFx0J0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRcdFx0XHRcdFx0J1gtUm9ja2V0Q2hhdC1TZWNyZXQtVG9rZW4nOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRXh0ZXJuYWxfUXVldWVfVG9rZW4nKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0aWYgKHJlc3VsdCAmJiByZXN1bHQuZGF0YSAmJiByZXN1bHQuZGF0YS51c2VybmFtZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgYWdlbnQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lT25saW5lQWdlbnRCeVVzZXJuYW1lKHJlc3VsdC5kYXRhLnVzZXJuYW1lKTtcblxuXHRcdFx0XHRcdFx0aWYgKGFnZW50KSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdFx0YWdlbnRJZDogYWdlbnQuX2lkLFxuXHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZVxuXHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlcXVlc3RpbmcgYWdlbnQgZnJvbSBleHRlcm5hbCBxdWV1ZS4nLCBlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm8tYWdlbnQtb25saW5lJywgJ1NvcnJ5LCBubyBvbmxpbmUgYWdlbnRzJyk7XG5cdFx0fSBlbHNlIGlmIChkZXBhcnRtZW50KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmdldE5leHRBZ2VudEZvckRlcGFydG1lbnQoZGVwYXJ0bWVudCk7XG5cdFx0fVxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXROZXh0QWdlbnQoKTtcblx0fSxcblx0Z2V0QWdlbnRzKGRlcGFydG1lbnQpIHtcblx0XHRpZiAoZGVwYXJ0bWVudCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kQnlEZXBhcnRtZW50SWQoZGVwYXJ0bWVudCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kQWdlbnRzKCk7XG5cdFx0fVxuXHR9LFxuXHRnZXRPbmxpbmVBZ2VudHMoZGVwYXJ0bWVudCkge1xuXHRcdGlmIChkZXBhcnRtZW50KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmdldE9ubGluZUZvckRlcGFydG1lbnQoZGVwYXJ0bWVudCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25saW5lQWdlbnRzKCk7XG5cdFx0fVxuXHR9LFxuXHRnZXRSZXF1aXJlZERlcGFydG1lbnQob25saW5lUmVxdWlyZWQgPSB0cnVlKSB7XG5cdFx0Y29uc3QgZGVwYXJ0bWVudHMgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQuZmluZEVuYWJsZWRXaXRoQWdlbnRzKCk7XG5cblx0XHRyZXR1cm4gZGVwYXJ0bWVudHMuZmV0Y2goKS5maW5kKChkZXB0KSA9PiB7XG5cdFx0XHRpZiAoIWRlcHQuc2hvd09uUmVnaXN0cmF0aW9uKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdGlmICghb25saW5lUmVxdWlyZWQpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBvbmxpbmVBZ2VudHMgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMuZ2V0T25saW5lRm9yRGVwYXJ0bWVudChkZXB0Ll9pZCk7XG5cdFx0XHRyZXR1cm4gb25saW5lQWdlbnRzLmNvdW50KCkgPiAwO1xuXHRcdH0pO1xuXHR9LFxuXHRnZXRSb29tKGd1ZXN0LCBtZXNzYWdlLCByb29tSW5mbywgYWdlbnQpIHtcblx0XHRsZXQgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKG1lc3NhZ2UucmlkKTtcblx0XHRsZXQgbmV3Um9vbSA9IGZhbHNlO1xuXG5cdFx0aWYgKHJvb20gJiYgIXJvb20ub3Blbikge1xuXHRcdFx0bWVzc2FnZS5yaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdHJvb20gPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmIChyb29tID09IG51bGwpIHtcblx0XHRcdC8vIGlmIG5vIGRlcGFydG1lbnQgc2VsZWN0ZWQgdmVyaWZ5IGlmIHRoZXJlIGlzIGF0IGxlYXN0IG9uZSBhY3RpdmUgYW5kIHBpY2sgdGhlIGZpcnN0XG5cdFx0XHRpZiAoIWFnZW50ICYmICFndWVzdC5kZXBhcnRtZW50KSB7XG5cdFx0XHRcdGNvbnN0IGRlcGFydG1lbnQgPSB0aGlzLmdldFJlcXVpcmVkRGVwYXJ0bWVudCgpO1xuXG5cdFx0XHRcdGlmIChkZXBhcnRtZW50KSB7XG5cdFx0XHRcdFx0Z3Vlc3QuZGVwYXJ0bWVudCA9IGRlcGFydG1lbnQuX2lkO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIGRlbGVnYXRlIHJvb20gY3JlYXRpb24gdG8gUXVldWVNZXRob2RzXG5cdFx0XHRjb25zdCByb3V0aW5nTWV0aG9kID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJyk7XG5cdFx0XHRyb29tID0gUm9ja2V0Q2hhdC5RdWV1ZU1ldGhvZHNbcm91dGluZ01ldGhvZF0oZ3Vlc3QsIG1lc3NhZ2UsIHJvb21JbmZvLCBhZ2VudCk7XG5cblx0XHRcdG5ld1Jvb20gPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmICghcm9vbSB8fCByb29tLnYudG9rZW4gIT09IGd1ZXN0LnRva2VuKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdjYW5ub3QtYWNjZXNzLXJvb20nKTtcblx0XHR9XG5cblx0XHRpZiAobmV3Um9vbSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuc2V0Um9vbUlkQnlUb2tlbihndWVzdC50b2tlbiwgcm9vbS5faWQpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7IHJvb20sIG5ld1Jvb20gfTtcblx0fSxcblx0c2VuZE1lc3NhZ2UoeyBndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8sIGFnZW50IH0pIHtcblx0XHRjb25zdCB7IHJvb20sIG5ld1Jvb20gfSA9IHRoaXMuZ2V0Um9vbShndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8sIGFnZW50KTtcblx0XHRpZiAoZ3Vlc3QubmFtZSkge1xuXHRcdFx0bWVzc2FnZS5hbGlhcyA9IGd1ZXN0Lm5hbWU7XG5cdFx0fVxuXG5cdFx0Ly8gcmV0dXJuIG1lc3NhZ2VzO1xuXHRcdHJldHVybiBfLmV4dGVuZChSb2NrZXRDaGF0LnNlbmRNZXNzYWdlKGd1ZXN0LCBtZXNzYWdlLCByb29tKSwgeyBuZXdSb29tLCBzaG93Q29ubmVjdGluZzogdGhpcy5zaG93Q29ubmVjdGluZygpIH0pO1xuXHR9LFxuXHRyZWdpc3Rlckd1ZXN0KHsgdG9rZW4sIG5hbWUsIGVtYWlsLCBkZXBhcnRtZW50LCBwaG9uZSwgdXNlcm5hbWUgfSA9IHt9KSB7XG5cdFx0Y2hlY2sodG9rZW4sIFN0cmluZyk7XG5cblx0XHRsZXQgdXNlcklkO1xuXHRcdGNvbnN0IHVwZGF0ZVVzZXIgPSB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdHRva2VuXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGNvbnN0IHVzZXIgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblxuXHRcdGlmICh1c2VyKSB7XG5cdFx0XHR1c2VySWQgPSB1c2VyLl9pZDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKCF1c2VybmFtZSkge1xuXHRcdFx0XHR1c2VybmFtZSA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0TmV4dFZpc2l0b3JVc2VybmFtZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgZXhpc3RpbmdVc2VyID0gbnVsbDtcblxuXHRcdFx0aWYgKHMudHJpbShlbWFpbCkgIT09ICcnICYmIChleGlzdGluZ1VzZXIgPSBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVHdWVzdEJ5RW1haWxBZGRyZXNzKGVtYWlsKSkpIHtcblx0XHRcdFx0dXNlcklkID0gZXhpc3RpbmdVc2VyLl9pZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0IHVzZXJEYXRhID0ge1xuXHRcdFx0XHRcdHVzZXJuYW1lLFxuXHRcdFx0XHRcdGRlcGFydG1lbnRcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpZiAodGhpcy5jb25uZWN0aW9uKSB7XG5cdFx0XHRcdFx0dXNlckRhdGEudXNlckFnZW50ID0gdGhpcy5jb25uZWN0aW9uLmh0dHBIZWFkZXJzWyd1c2VyLWFnZW50J107XG5cdFx0XHRcdFx0dXNlckRhdGEuaXAgPSB0aGlzLmNvbm5lY3Rpb24uaHR0cEhlYWRlcnNbJ3gtcmVhbC1pcCddIHx8IHRoaXMuY29ubmVjdGlvbi5odHRwSGVhZGVyc1sneC1mb3J3YXJkZWQtZm9yJ10gfHwgdGhpcy5jb25uZWN0aW9uLmNsaWVudEFkZHJlc3M7XG5cdFx0XHRcdFx0dXNlckRhdGEuaG9zdCA9IHRoaXMuY29ubmVjdGlvbi5odHRwSGVhZGVycy5ob3N0O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dXNlcklkID0gTGl2ZWNoYXRWaXNpdG9ycy5pbnNlcnQodXNlckRhdGEpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChwaG9uZSkge1xuXHRcdFx0dXBkYXRlVXNlci4kc2V0LnBob25lID0gW1xuXHRcdFx0XHR7IHBob25lTnVtYmVyOiBwaG9uZS5udW1iZXIgfVxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRpZiAoZW1haWwgJiYgZW1haWwudHJpbSgpICE9PSAnJykge1xuXHRcdFx0dXBkYXRlVXNlci4kc2V0LnZpc2l0b3JFbWFpbHMgPSBbXG5cdFx0XHRcdHsgYWRkcmVzczogZW1haWwgfVxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRpZiAobmFtZSkge1xuXHRcdFx0dXBkYXRlVXNlci4kc2V0Lm5hbWUgPSBuYW1lO1xuXHRcdH1cblxuXHRcdExpdmVjaGF0VmlzaXRvcnMudXBkYXRlQnlJZCh1c2VySWQsIHVwZGF0ZVVzZXIpO1xuXG5cdFx0cmV0dXJuIHVzZXJJZDtcblx0fSxcblx0c2V0RGVwYXJ0bWVudEZvckd1ZXN0KHsgdG9rZW4sIGRlcGFydG1lbnQgfSA9IHt9KSB7XG5cdFx0Y2hlY2sodG9rZW4sIFN0cmluZyk7XG5cblx0XHRjb25zdCB1cGRhdGVVc2VyID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHRkZXBhcnRtZW50XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGNvbnN0IHVzZXIgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblx0XHRpZiAodXNlcikge1xuXHRcdFx0cmV0dXJuIE1ldGVvci51c2Vycy51cGRhdGUodXNlci5faWQsIHVwZGF0ZVVzZXIpO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cdHNhdmVHdWVzdCh7IF9pZCwgbmFtZSwgZW1haWwsIHBob25lIH0pIHtcblx0XHRjb25zdCB1cGRhdGVEYXRhID0ge307XG5cblx0XHRpZiAobmFtZSkge1xuXHRcdFx0dXBkYXRlRGF0YS5uYW1lID0gbmFtZTtcblx0XHR9XG5cdFx0aWYgKGVtYWlsKSB7XG5cdFx0XHR1cGRhdGVEYXRhLmVtYWlsID0gZW1haWw7XG5cdFx0fVxuXHRcdGlmIChwaG9uZSkge1xuXHRcdFx0dXBkYXRlRGF0YS5waG9uZSA9IHBob25lO1xuXHRcdH1cblx0XHRjb25zdCByZXQgPSBMaXZlY2hhdFZpc2l0b3JzLnNhdmVHdWVzdEJ5SWQoX2lkLCB1cGRhdGVEYXRhKTtcblxuXHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5ydW4oJ2xpdmVjaGF0LnNhdmVHdWVzdCcsIHVwZGF0ZURhdGEpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHJldDtcblx0fSxcblxuXHRjbG9zZVJvb20oeyB1c2VyLCB2aXNpdG9yLCByb29tLCBjb21tZW50IH0pIHtcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0Y29uc3QgY2xvc2VEYXRhID0ge1xuXHRcdFx0Y2xvc2VkQXQ6IG5vdyxcblx0XHRcdGNoYXREdXJhdGlvbjogKG5vdy5nZXRUaW1lKCkgLSByb29tLnRzKSAvIDEwMDBcblx0XHR9O1xuXG5cdFx0aWYgKHVzZXIpIHtcblx0XHRcdGNsb3NlRGF0YS5jbG9zZXIgPSAndXNlcic7XG5cdFx0XHRjbG9zZURhdGEuY2xvc2VkQnkgPSB7XG5cdFx0XHRcdF9pZDogdXNlci5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAodmlzaXRvcikge1xuXHRcdFx0Y2xvc2VEYXRhLmNsb3NlciA9ICd2aXNpdG9yJztcblx0XHRcdGNsb3NlRGF0YS5jbG9zZWRCeSA9IHtcblx0XHRcdFx0X2lkOiB2aXNpdG9yLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHZpc2l0b3IudXNlcm5hbWVcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuY2xvc2VCeVJvb21JZChyb29tLl9pZCwgY2xvc2VEYXRhKTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkuY2xvc2VCeVJvb21JZChyb29tLl9pZCwgY2xvc2VEYXRhKTtcblxuXHRcdGNvbnN0IG1lc3NhZ2UgPSB7XG5cdFx0XHR0OiAnbGl2ZWNoYXQtY2xvc2UnLFxuXHRcdFx0bXNnOiBjb21tZW50LFxuXHRcdFx0Z3JvdXBhYmxlOiBmYWxzZVxuXHRcdH07XG5cblx0XHRSb2NrZXRDaGF0LnNlbmRNZXNzYWdlKHVzZXIsIG1lc3NhZ2UsIHJvb20pO1xuXG5cdFx0aWYgKHJvb20uc2VydmVkQnkpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuaGlkZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCByb29tLnNlcnZlZEJ5Ll9pZCk7XG5cdFx0fVxuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZUNvbW1hbmRXaXRoUm9vbUlkQW5kVXNlcigncHJvbXB0VHJhbnNjcmlwdCcsIHJvb20uX2lkLCBjbG9zZURhdGEuY2xvc2VkQnkpO1xuXG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignbGl2ZWNoYXQuY2xvc2VSb29tJywgcm9vbSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcblxuXHRnZXRJbml0U2V0dGluZ3MoKSB7XG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSB7fTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmROb3RIaWRkZW5QdWJsaWMoW1xuXHRcdFx0J0xpdmVjaGF0X3RpdGxlJyxcblx0XHRcdCdMaXZlY2hhdF90aXRsZV9jb2xvcicsXG5cdFx0XHQnTGl2ZWNoYXRfZW5hYmxlZCcsXG5cdFx0XHQnTGl2ZWNoYXRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXHRcdFx0J0xpdmVjaGF0X2FsbG93X3N3aXRjaGluZ19kZXBhcnRtZW50cycsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV90aXRsZScsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV90aXRsZV9jb2xvcicsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3N1Y2Nlc3NfbWVzc2FnZScsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9mb3JtX3VuYXZhaWxhYmxlJyxcblx0XHRcdCdMaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybScsXG5cdFx0XHQnTGl2ZWNoYXRfdmlkZW9jYWxsX2VuYWJsZWQnLFxuXHRcdFx0J0ppdHNpX0VuYWJsZWQnLFxuXHRcdFx0J0xhbmd1YWdlJyxcblx0XHRcdCdMaXZlY2hhdF9lbmFibGVfdHJhbnNjcmlwdCcsXG5cdFx0XHQnTGl2ZWNoYXRfdHJhbnNjcmlwdF9tZXNzYWdlJyxcblx0XHRcdCdMaXZlY2hhdF9maWxldXBsb2FkX2VuYWJsZWQnLFxuXHRcdFx0J0ZpbGVVcGxvYWRfRW5hYmxlZCcsXG5cdFx0XHQnTGl2ZWNoYXRfY29udmVyc2F0aW9uX2ZpbmlzaGVkX21lc3NhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X25hbWVfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXHRcdFx0J0xpdmVjaGF0X2VtYWlsX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtJ1xuXG5cdFx0XSkuZm9yRWFjaCgoc2V0dGluZykgPT4ge1xuXHRcdFx0c2V0dGluZ3Nbc2V0dGluZy5faWRdID0gc2V0dGluZy52YWx1ZTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBzZXR0aW5ncztcblx0fSxcblxuXHRzYXZlUm9vbUluZm8ocm9vbURhdGEsIGd1ZXN0RGF0YSkge1xuXHRcdGlmICgocm9vbURhdGEudG9waWMgIT0gbnVsbCB8fCByb29tRGF0YS50YWdzICE9IG51bGwpICYmICFSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRUb3BpY0FuZFRhZ3NCeUlkKHJvb21EYXRhLl9pZCwgcm9vbURhdGEudG9waWMsIHJvb21EYXRhLnRhZ3MpKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignbGl2ZWNoYXQuc2F2ZVJvb20nLCByb29tRGF0YSk7XG5cdFx0fSk7XG5cblx0XHRpZiAoIV8uaXNFbXB0eShndWVzdERhdGEubmFtZSkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRGbmFtZUJ5SWQocm9vbURhdGEuX2lkLCBndWVzdERhdGEubmFtZSkgJiYgUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVEaXNwbGF5TmFtZUJ5Um9vbUlkKHJvb21EYXRhLl9pZCwgZ3Vlc3REYXRhLm5hbWUpO1xuXHRcdH1cblx0fSxcblxuXHRjbG9zZU9wZW5DaGF0cyh1c2VySWQsIGNvbW1lbnQpIHtcblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkKTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5QWdlbnQodXNlcklkKS5mb3JFYWNoKChyb29tKSA9PiB7XG5cdFx0XHR0aGlzLmNsb3NlUm9vbSh7IHVzZXIsIHJvb20sIGNvbW1lbnR9KTtcblx0XHR9KTtcblx0fSxcblxuXHRmb3J3YXJkT3BlbkNoYXRzKHVzZXJJZCkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlBZ2VudCh1c2VySWQpLmZvckVhY2goKHJvb20pID0+IHtcblx0XHRcdGNvbnN0IGd1ZXN0ID0gTGl2ZWNoYXRWaXNpdG9ycy5maW5kT25lQnlJZChyb29tLnYuX2lkKTtcblx0XHRcdHRoaXMudHJhbnNmZXIocm9vbSwgZ3Vlc3QsIHsgZGVwYXJ0bWVudElkOiBndWVzdC5kZXBhcnRtZW50IH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdHNhdmVQYWdlSGlzdG9yeSh0b2tlbiwgcm9vbUlkLCBwYWdlSW5mbykge1xuXHRcdGlmIChwYWdlSW5mby5jaGFuZ2UgPT09IFJvY2tldENoYXQuTGl2ZWNoYXQuaGlzdG9yeU1vbml0b3JUeXBlKSB7XG5cblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCgncm9ja2V0LmNhdCcpO1xuXG5cdFx0XHRjb25zdCBwYWdlVGl0bGUgPSBwYWdlSW5mby50aXRsZTtcblx0XHRcdGNvbnN0IHBhZ2VVcmwgPSBwYWdlSW5mby5sb2NhdGlvbi5ocmVmO1xuXHRcdFx0Y29uc3QgZXh0cmFEYXRhID0ge1xuXHRcdFx0XHRuYXZpZ2F0aW9uOiB7XG5cdFx0XHRcdFx0cGFnZTogcGFnZUluZm8sXG5cdFx0XHRcdFx0dG9rZW5cblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0aWYgKCFyb29tSWQpIHtcblx0XHRcdFx0Ly8ga2VlcCBoaXN0b3J5IG9mIHVucmVnaXN0ZXJlZCB2aXNpdG9ycyBmb3IgMSBtb250aFxuXHRcdFx0XHRjb25zdCBrZWVwSGlzdG9yeU1pbGlzZWNvbmRzID0gMjU5MjAwMDAwMDtcblx0XHRcdFx0ZXh0cmFEYXRhLmV4cGlyZUF0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgKyBrZWVwSGlzdG9yeU1pbGlzZWNvbmRzO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9WaXNpdG9yX25hdmlnYXRpb25fYXNfYV9tZXNzYWdlJykpIHtcblx0XHRcdFx0ZXh0cmFEYXRhLl9oaWRkZW4gPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlTmF2aWdhdGlvbkhpc3RvcnlXaXRoUm9vbUlkTWVzc2FnZUFuZFVzZXIocm9vbUlkLCBgJHsgcGFnZVRpdGxlIH0gLSAkeyBwYWdlVXJsIH1gLCB1c2VyLCBleHRyYURhdGEpO1xuXHRcdH1cblxuXHRcdHJldHVybjtcblx0fSxcblxuXHR0cmFuc2Zlcihyb29tLCBndWVzdCwgdHJhbnNmZXJEYXRhKSB7XG5cdFx0bGV0IGFnZW50O1xuXG5cdFx0aWYgKHRyYW5zZmVyRGF0YS51c2VySWQpIHtcblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0cmFuc2ZlckRhdGEudXNlcklkKTtcblx0XHRcdGFnZW50ID0ge1xuXHRcdFx0XHRhZ2VudElkOiB1c2VyLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWVcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfUm91dGluZ19NZXRob2QnKSAhPT0gJ0d1ZXN0X1Bvb2wnKSB7XG5cdFx0XHRhZ2VudCA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0TmV4dEFnZW50KHRyYW5zZmVyRGF0YS5kZXBhcnRtZW50SWQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZXR1cm5Sb29tQXNJbnF1aXJ5KHJvb20uX2lkLCB0cmFuc2ZlckRhdGEuZGVwYXJ0bWVudElkKTtcblx0XHR9XG5cblx0XHRjb25zdCBzZXJ2ZWRCeSA9IHJvb20uc2VydmVkQnk7XG5cblx0XHRpZiAoYWdlbnQgJiYgYWdlbnQuYWdlbnRJZCAhPT0gc2VydmVkQnkuX2lkKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jaGFuZ2VBZ2VudEJ5Um9vbUlkKHJvb20uX2lkLCBhZ2VudCk7XG5cblx0XHRcdGNvbnN0IHN1YnNjcmlwdGlvbkRhdGEgPSB7XG5cdFx0XHRcdHJpZDogcm9vbS5faWQsXG5cdFx0XHRcdG5hbWU6IGd1ZXN0Lm5hbWUgfHwgZ3Vlc3QudXNlcm5hbWUsXG5cdFx0XHRcdGFsZXJ0OiB0cnVlLFxuXHRcdFx0XHRvcGVuOiB0cnVlLFxuXHRcdFx0XHR1bnJlYWQ6IDEsXG5cdFx0XHRcdHVzZXJNZW50aW9uczogMSxcblx0XHRcdFx0Z3JvdXBNZW50aW9uczogMCxcblx0XHRcdFx0dToge1xuXHRcdFx0XHRcdF9pZDogYWdlbnQuYWdlbnRJZCxcblx0XHRcdFx0XHR1c2VybmFtZTogYWdlbnQudXNlcm5hbWVcblx0XHRcdFx0fSxcblx0XHRcdFx0dDogJ2wnLFxuXHRcdFx0XHRkZXNrdG9wTm90aWZpY2F0aW9uczogJ2FsbCcsXG5cdFx0XHRcdG1vYmlsZVB1c2hOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdFx0ZW1haWxOb3RpZmljYXRpb25zOiAnYWxsJ1xuXHRcdFx0fTtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMucmVtb3ZlQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIHNlcnZlZEJ5Ll9pZCk7XG5cblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuaW5zZXJ0KHN1YnNjcmlwdGlvbkRhdGEpO1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuaW5jVXNlcnNDb3VudEJ5SWQocm9vbS5faWQpO1xuXG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVVc2VyTGVhdmVXaXRoUm9vbUlkQW5kVXNlcihyb29tLl9pZCwgeyBfaWQ6IHNlcnZlZEJ5Ll9pZCwgdXNlcm5hbWU6IHNlcnZlZEJ5LnVzZXJuYW1lIH0pO1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlVXNlckpvaW5XaXRoUm9vbUlkQW5kVXNlcihyb29tLl9pZCwgeyBfaWQ6IGFnZW50LmFnZW50SWQsIHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZSB9KTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zdHJlYW0uZW1pdChyb29tLl9pZCwge1xuXHRcdFx0XHR0eXBlOiAnYWdlbnREYXRhJyxcblx0XHRcdFx0ZGF0YTogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvKGFnZW50LmFnZW50SWQpXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXG5cdHJldHVyblJvb21Bc0lucXVpcnkocmlkLCBkZXBhcnRtZW50SWQpIHtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJldHVyblJvb21Bc0lucXVpcnknIH0pO1xuXHRcdH1cblxuXHRcdGlmICghcm9vbS5zZXJ2ZWRCeSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHJvb20uc2VydmVkQnkuX2lkKTtcblx0XHRpZiAoIXVzZXIgfHwgIXVzZXIuX2lkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZXR1cm5Sb29tQXNJbnF1aXJ5JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBhZ2VudElkcyA9IFtdO1xuXHRcdC8vZ2V0IHRoZSBhZ2VudHMgb2YgdGhlIGRlcGFydG1lbnRcblx0XHRpZiAoZGVwYXJ0bWVudElkKSB7XG5cdFx0XHRsZXQgYWdlbnRzID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRPbmxpbmVBZ2VudHMoZGVwYXJ0bWVudElkKTtcblxuXHRcdFx0aWYgKGFnZW50cy5jb3VudCgpID09PSAwICYmIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9ndWVzdF9wb29sX3dpdGhfbm9fYWdlbnRzJykpIHtcblx0XHRcdFx0YWdlbnRzID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRBZ2VudHMoZGVwYXJ0bWVudElkKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFnZW50cy5jb3VudCgpID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0YWdlbnRzLmZvckVhY2goKGFnZW50KSA9PiB7XG5cdFx0XHRcdGFnZW50SWRzLnB1c2goYWdlbnQuYWdlbnRJZCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvL2RlbGV0ZSBhZ2VudCBhbmQgcm9vbSBzdWJzY3JpcHRpb25cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnJlbW92ZUJ5Um9vbUlkKHJpZCk7XG5cblx0XHQvLyByZW1vdmUgdXNlciBmcm9tIHJvb21cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5yZW1vdmVVc2VybmFtZUJ5SWQocmlkLCB1c2VyLnVzZXJuYW1lKTtcblxuXHRcdC8vIGZpbmQgaW5xdWlyeSBjb3JyZXNwb25kaW5nIHRvIHJvb21cblx0XHRjb25zdCBpbnF1aXJ5ID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5LmZpbmRPbmUoe3JpZH0pO1xuXHRcdGlmICghaW5xdWlyeSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGxldCBvcGVuSW5xO1xuXHRcdC8vIG1hcmsgaW5xdWlyeSBhcyBvcGVuXG5cdFx0aWYgKGFnZW50SWRzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0b3BlbklucSA9IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0SW5xdWlyeS5vcGVuSW5xdWlyeShpbnF1aXJ5Ll9pZCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9wZW5JbnEgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkub3BlbklucXVpcnlXaXRoQWdlbnRzKGlucXVpcnkuX2lkLCBhZ2VudElkcyk7XG5cdFx0fVxuXG5cdFx0aWYgKG9wZW5JbnEpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVVzZXJMZWF2ZVdpdGhSb29tSWRBbmRVc2VyKHJpZCwgeyBfaWQ6IHJvb20uc2VydmVkQnkuX2lkLCB1c2VybmFtZTogcm9vbS5zZXJ2ZWRCeS51c2VybmFtZSB9KTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zdHJlYW0uZW1pdChyb29tLl9pZCwge1xuXHRcdFx0XHR0eXBlOiAnYWdlbnREYXRhJyxcblx0XHRcdFx0ZGF0YTogbnVsbFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG9wZW5JbnE7XG5cdH0sXG5cblx0c2VuZFJlcXVlc3QocG9zdERhdGEsIGNhbGxiYWNrLCB0cnlpbmcgPSAxKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XHQnWC1Sb2NrZXRDaGF0LUxpdmVjaGF0LVRva2VuJzogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3NlY3JldF90b2tlbicpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGRhdGE6IHBvc3REYXRhXG5cdFx0XHR9O1xuXHRcdFx0cmV0dXJuIEhUVFAucG9zdChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfd2ViaG9va1VybCcpLCBvcHRpb25zKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRSb2NrZXRDaGF0LkxpdmVjaGF0LmxvZ2dlci53ZWJob29rLmVycm9yKGBSZXNwb25zZSBlcnJvciBvbiAkeyB0cnlpbmcgfSB0cnkgLT5gLCBlKTtcblx0XHRcdC8vIHRyeSAxMCB0aW1lcyBhZnRlciAxMCBzZWNvbmRzIGVhY2hcblx0XHRcdGlmICh0cnlpbmcgPCAxMCkge1xuXHRcdFx0XHRSb2NrZXRDaGF0LkxpdmVjaGF0LmxvZ2dlci53ZWJob29rLndhcm4oJ1dpbGwgdHJ5IGFnYWluIGluIDEwIHNlY29uZHMgLi4uJyk7XG5cdFx0XHRcdHRyeWluZysrO1xuXHRcdFx0XHRzZXRUaW1lb3V0KE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuc2VuZFJlcXVlc3QocG9zdERhdGEsIGNhbGxiYWNrLCB0cnlpbmcpO1xuXHRcdFx0XHR9KSwgMTAwMDApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRnZXRMaXZlY2hhdFJvb21HdWVzdEluZm8ocm9vbSkge1xuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVCeUlkKHJvb20udi5faWQpO1xuXHRcdGNvbnN0IGFnZW50ID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQocm9vbS5zZXJ2ZWRCeSAmJiByb29tLnNlcnZlZEJ5Ll9pZCk7XG5cblx0XHRjb25zdCB1YSA9IG5ldyBVQVBhcnNlcigpO1xuXHRcdHVhLnNldFVBKHZpc2l0b3IudXNlckFnZW50KTtcblxuXHRcdGNvbnN0IHBvc3REYXRhID0ge1xuXHRcdFx0X2lkOiByb29tLl9pZCxcblx0XHRcdGxhYmVsOiByb29tLmZuYW1lIHx8IHJvb20ubGFiZWwsIC8vIHVzaW5nIHNhbWUgZmllbGQgZm9yIGNvbXBhdGliaWxpdHlcblx0XHRcdHRvcGljOiByb29tLnRvcGljLFxuXHRcdFx0Y3JlYXRlZEF0OiByb29tLnRzLFxuXHRcdFx0bGFzdE1lc3NhZ2VBdDogcm9vbS5sbSxcblx0XHRcdHRhZ3M6IHJvb20udGFncyxcblx0XHRcdGN1c3RvbUZpZWxkczogcm9vbS5saXZlY2hhdERhdGEsXG5cdFx0XHR2aXNpdG9yOiB7XG5cdFx0XHRcdF9pZDogdmlzaXRvci5faWQsXG5cdFx0XHRcdHRva2VuOiB2aXNpdG9yLnRva2VuLFxuXHRcdFx0XHRuYW1lOiB2aXNpdG9yLm5hbWUsXG5cdFx0XHRcdHVzZXJuYW1lOiB2aXNpdG9yLnVzZXJuYW1lLFxuXHRcdFx0XHRlbWFpbDogbnVsbCxcblx0XHRcdFx0cGhvbmU6IG51bGwsXG5cdFx0XHRcdGRlcGFydG1lbnQ6IHZpc2l0b3IuZGVwYXJ0bWVudCxcblx0XHRcdFx0aXA6IHZpc2l0b3IuaXAsXG5cdFx0XHRcdG9zOiB1YS5nZXRPUygpLm5hbWUgJiYgKGAkeyB1YS5nZXRPUygpLm5hbWUgfSAkeyB1YS5nZXRPUygpLnZlcnNpb24gfWApLFxuXHRcdFx0XHRicm93c2VyOiB1YS5nZXRCcm93c2VyKCkubmFtZSAmJiAoYCR7IHVhLmdldEJyb3dzZXIoKS5uYW1lIH0gJHsgdWEuZ2V0QnJvd3NlcigpLnZlcnNpb24gfWApLFxuXHRcdFx0XHRjdXN0b21GaWVsZHM6IHZpc2l0b3IubGl2ZWNoYXREYXRhXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGlmIChhZ2VudCkge1xuXHRcdFx0cG9zdERhdGEuYWdlbnQgPSB7XG5cdFx0XHRcdF9pZDogYWdlbnQuX2lkLFxuXHRcdFx0XHR1c2VybmFtZTogYWdlbnQudXNlcm5hbWUsXG5cdFx0XHRcdG5hbWU6IGFnZW50Lm5hbWUsXG5cdFx0XHRcdGVtYWlsOiBudWxsXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoYWdlbnQuZW1haWxzICYmIGFnZW50LmVtYWlscy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHBvc3REYXRhLmFnZW50LmVtYWlsID0gYWdlbnQuZW1haWxzWzBdLmFkZHJlc3M7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHJvb20uY3JtRGF0YSkge1xuXHRcdFx0cG9zdERhdGEuY3JtRGF0YSA9IHJvb20uY3JtRGF0YTtcblx0XHR9XG5cblx0XHRpZiAodmlzaXRvci52aXNpdG9yRW1haWxzICYmIHZpc2l0b3IudmlzaXRvckVtYWlscy5sZW5ndGggPiAwKSB7XG5cdFx0XHRwb3N0RGF0YS52aXNpdG9yLmVtYWlsID0gdmlzaXRvci52aXNpdG9yRW1haWxzO1xuXHRcdH1cblx0XHRpZiAodmlzaXRvci5waG9uZSAmJiB2aXNpdG9yLnBob25lLmxlbmd0aCA+IDApIHtcblx0XHRcdHBvc3REYXRhLnZpc2l0b3IucGhvbmUgPSB2aXNpdG9yLnBob25lO1xuXHRcdH1cblxuXHRcdHJldHVybiBwb3N0RGF0YTtcblx0fSxcblxuXHRhZGRBZ2VudCh1c2VybmFtZSkge1xuXHRcdGNoZWNrKHVzZXJuYW1lLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHVzZXJuYW1lLCB7IGZpZWxkczogeyBfaWQ6IDEsIHVzZXJuYW1lOiAxIH0gfSk7XG5cblx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmFkZEFnZW50JyB9KTtcblx0XHR9XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5hZGRVc2VyUm9sZXModXNlci5faWQsICdsaXZlY2hhdC1hZ2VudCcpKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRPcGVyYXRvcih1c2VyLl9pZCwgdHJ1ZSk7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRMaXZlY2hhdFN0YXR1cyh1c2VyLl9pZCwgJ2F2YWlsYWJsZScpO1xuXHRcdFx0cmV0dXJuIHVzZXI7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXG5cdGFkZE1hbmFnZXIodXNlcm5hbWUpIHtcblx0XHRjaGVjayh1c2VybmFtZSwgU3RyaW5nKTtcblxuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZSh1c2VybmFtZSwgeyBmaWVsZHM6IHsgX2lkOiAxLCB1c2VybmFtZTogMSB9IH0pO1xuXG5cdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsaXZlY2hhdDphZGRNYW5hZ2VyJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5hZGRVc2VyUm9sZXModXNlci5faWQsICdsaXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiB1c2VyO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHRyZW1vdmVBZ2VudCh1c2VybmFtZSkge1xuXHRcdGNoZWNrKHVzZXJuYW1lLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHVzZXJuYW1lLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblxuXHRcdGlmICghdXNlcikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6LnJlbW92ZVVzZXJGcm9tUm9sZXModXNlci5faWQsICdsaXZlY2hhdC1hZ2VudCcpKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRPcGVyYXRvcih1c2VyLl9pZCwgZmFsc2UpO1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0TGl2ZWNoYXRTdGF0dXModXNlci5faWQsICdub3QtYXZhaWxhYmxlJyk7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0cmVtb3ZlTWFuYWdlcih1c2VybmFtZSkge1xuXHRcdGNoZWNrKHVzZXJuYW1lLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHVzZXJuYW1lLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblxuXHRcdGlmICghdXNlcikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlTWFuYWdlcicgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuYXV0aHoucmVtb3ZlVXNlckZyb21Sb2xlcyh1c2VyLl9pZCwgJ2xpdmVjaGF0LW1hbmFnZXInKTtcblx0fSxcblxuXHRzYXZlRGVwYXJ0bWVudChfaWQsIGRlcGFydG1lbnREYXRhLCBkZXBhcnRtZW50QWdlbnRzKSB7XG5cdFx0Y2hlY2soX2lkLCBNYXRjaC5NYXliZShTdHJpbmcpKTtcblxuXHRcdGNoZWNrKGRlcGFydG1lbnREYXRhLCB7XG5cdFx0XHRlbmFibGVkOiBCb29sZWFuLFxuXHRcdFx0bmFtZTogU3RyaW5nLFxuXHRcdFx0ZGVzY3JpcHRpb246IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRzaG93T25SZWdpc3RyYXRpb246IEJvb2xlYW5cblx0XHR9KTtcblxuXHRcdGNoZWNrKGRlcGFydG1lbnRBZ2VudHMsIFtcblx0XHRcdE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRcdGFnZW50SWQ6IFN0cmluZyxcblx0XHRcdFx0dXNlcm5hbWU6IFN0cmluZ1xuXHRcdFx0fSlcblx0XHRdKTtcblxuXHRcdGlmIChfaWQpIHtcblx0XHRcdGNvbnN0IGRlcGFydG1lbnQgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQuZmluZE9uZUJ5SWQoX2lkKTtcblx0XHRcdGlmICghZGVwYXJ0bWVudCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1kZXBhcnRtZW50LW5vdC1mb3VuZCcsICdEZXBhcnRtZW50IG5vdCBmb3VuZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2F2ZURlcGFydG1lbnQnIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQuY3JlYXRlT3JVcGRhdGVEZXBhcnRtZW50KF9pZCwgZGVwYXJ0bWVudERhdGEsIGRlcGFydG1lbnRBZ2VudHMpO1xuXHR9LFxuXG5cdHJlbW92ZURlcGFydG1lbnQoX2lkKSB7XG5cdFx0Y2hlY2soX2lkLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3QgZGVwYXJ0bWVudCA9IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5maW5kT25lQnlJZChfaWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXG5cdFx0aWYgKCFkZXBhcnRtZW50KSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdkZXBhcnRtZW50LW5vdC1mb3VuZCcsICdEZXBhcnRtZW50IG5vdCBmb3VuZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlRGVwYXJ0bWVudCcgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5yZW1vdmVCeUlkKF9pZCk7XG5cdH0sXG5cblx0c2hvd0Nvbm5lY3RpbmcoKSB7XG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcpID09PSAnR3Vlc3RfUG9vbCcpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfb3Blbl9pbnF1aWVyeV9zaG93X2Nvbm5lY3RpbmcnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblxuUm9ja2V0Q2hhdC5MaXZlY2hhdC5zdHJlYW0gPSBuZXcgTWV0ZW9yLlN0cmVhbWVyKCdsaXZlY2hhdC1yb29tJyk7XG5cblJvY2tldENoYXQuTGl2ZWNoYXQuc3RyZWFtLmFsbG93UmVhZCgocm9vbUlkLCBleHRyYURhdGEpID0+IHtcblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cdGlmICghcm9vbSkge1xuXHRcdGNvbnNvbGUud2FybihgSW52YWxpZCBldmVudE5hbWU6IFwiJHsgcm9vbUlkIH1cImApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRpZiAocm9vbS50ID09PSAnbCcgJiYgZXh0cmFEYXRhICYmIGV4dHJhRGF0YS50b2tlbiAmJiByb29tLnYudG9rZW4gPT09IGV4dHJhRGF0YS50b2tlbikge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfaGlzdG9yeV9tb25pdG9yX3R5cGUnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRSb2NrZXRDaGF0LkxpdmVjaGF0Lmhpc3RvcnlNb25pdG9yVHlwZSA9IHZhbHVlO1xufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuUm9ja2V0Q2hhdC5RdWV1ZU1ldGhvZHMgPSB7XG5cdC8qIExlYXN0IEFtb3VudCBRdWV1aW5nIG1ldGhvZDpcblx0ICpcblx0ICogZGVmYXVsdCBtZXRob2Qgd2hlcmUgdGhlIGFnZW50IHdpdGggdGhlIGxlYXN0IG51bWJlclxuXHQgKiBvZiBvcGVuIGNoYXRzIGlzIHBhaXJlZCB3aXRoIHRoZSBpbmNvbWluZyBsaXZlY2hhdFxuXHQgKi9cblx0J0xlYXN0X0Ftb3VudCcoZ3Vlc3QsIG1lc3NhZ2UsIHJvb21JbmZvLCBhZ2VudCkge1xuXHRcdGlmICghYWdlbnQpIHtcblx0XHRcdGFnZW50ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXROZXh0QWdlbnQoZ3Vlc3QuZGVwYXJ0bWVudCk7XG5cdFx0XHRpZiAoIWFnZW50KSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ25vLWFnZW50LW9ubGluZScsICdTb3JyeSwgbm8gb25saW5lIGFnZW50cycpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZUxpdmVjaGF0Um9vbUNvdW50KCk7XG5cblx0XHRjb25zdCByb29tID0gXy5leHRlbmQoe1xuXHRcdFx0X2lkOiBtZXNzYWdlLnJpZCxcblx0XHRcdG1zZ3M6IDEsXG5cdFx0XHR1c2Vyc0NvdW50OiAxLFxuXHRcdFx0bG06IG5ldyBEYXRlKCksXG5cdFx0XHRmbmFtZTogKHJvb21JbmZvICYmIHJvb21JbmZvLmZuYW1lKSB8fCBndWVzdC5uYW1lIHx8IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0Ly8gdXNlcm5hbWVzOiBbYWdlbnQudXNlcm5hbWUsIGd1ZXN0LnVzZXJuYW1lXSxcblx0XHRcdHQ6ICdsJyxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0djoge1xuXHRcdFx0XHRfaWQ6IGd1ZXN0Ll9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0XHR0b2tlbjogbWVzc2FnZS50b2tlbixcblx0XHRcdFx0c3RhdHVzOiBndWVzdC5zdGF0dXMgfHwgJ29ubGluZSdcblx0XHRcdH0sXG5cdFx0XHRzZXJ2ZWRCeToge1xuXHRcdFx0XHRfaWQ6IGFnZW50LmFnZW50SWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZVxuXHRcdFx0fSxcblx0XHRcdGNsOiBmYWxzZSxcblx0XHRcdG9wZW46IHRydWUsXG5cdFx0XHR3YWl0aW5nUmVzcG9uc2U6IHRydWVcblx0XHR9LCByb29tSW5mbyk7XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb25EYXRhID0ge1xuXHRcdFx0cmlkOiBtZXNzYWdlLnJpZCxcblx0XHRcdGZuYW1lOiBndWVzdC5uYW1lIHx8IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0YWxlcnQ6IHRydWUsXG5cdFx0XHRvcGVuOiB0cnVlLFxuXHRcdFx0dW5yZWFkOiAxLFxuXHRcdFx0dXNlck1lbnRpb25zOiAxLFxuXHRcdFx0Z3JvdXBNZW50aW9uczogMCxcblx0XHRcdHU6IHtcblx0XHRcdFx0X2lkOiBhZ2VudC5hZ2VudElkLFxuXHRcdFx0XHR1c2VybmFtZTogYWdlbnQudXNlcm5hbWVcblx0XHRcdH0sXG5cdFx0XHR0OiAnbCcsXG5cdFx0XHRkZXNrdG9wTm90aWZpY2F0aW9uczogJ2FsbCcsXG5cdFx0XHRtb2JpbGVQdXNoTm90aWZpY2F0aW9uczogJ2FsbCcsXG5cdFx0XHRlbWFpbE5vdGlmaWNhdGlvbnM6ICdhbGwnXG5cdFx0fTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmluc2VydChyb29tKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuaW5zZXJ0KHN1YnNjcmlwdGlvbkRhdGEpO1xuXG5cdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zdHJlYW0uZW1pdChyb29tLl9pZCwge1xuXHRcdFx0dHlwZTogJ2FnZW50RGF0YScsXG5cdFx0XHRkYXRhOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXRBZ2VudEluZm8oYWdlbnQuYWdlbnRJZClcblx0XHR9KTtcblxuXHRcdHJldHVybiByb29tO1xuXHR9LFxuXHQvKiBHdWVzdCBQb29sIFF1ZXVpbmcgTWV0aG9kOlxuXHQgKlxuXHQgKiBBbiBpbmNvbW1pbmcgbGl2ZWNoYXQgaXMgY3JlYXRlZCBhcyBhbiBJbnF1aXJ5XG5cdCAqIHdoaWNoIGlzIHBpY2tlZCB1cCBmcm9tIGFuIGFnZW50LlxuXHQgKiBBbiBJbnF1aXJ5IGlzIHZpc2libGUgdG8gYWxsIGFnZW50cyAoVE9ETzogaW4gdGhlIGNvcnJlY3QgZGVwYXJ0bWVudClcbiAgICAgKlxuXHQgKiBBIHJvb20gaXMgc3RpbGwgY3JlYXRlZCB3aXRoIHRoZSBpbml0aWFsIG1lc3NhZ2UsIGJ1dCBpdCBpcyBvY2N1cGllZCBieVxuXHQgKiBvbmx5IHRoZSBjbGllbnQgdW50aWwgcGFpcmVkIHdpdGggYW4gYWdlbnRcblx0ICovXG5cdCdHdWVzdF9Qb29sJyhndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8pIHtcblx0XHRsZXQgYWdlbnRzID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRPbmxpbmVBZ2VudHMoZ3Vlc3QuZGVwYXJ0bWVudCk7XG5cblx0XHRpZiAoYWdlbnRzLmNvdW50KCkgPT09IDAgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X2d1ZXN0X3Bvb2xfd2l0aF9ub19hZ2VudHMnKSkge1xuXHRcdFx0YWdlbnRzID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRBZ2VudHMoZ3Vlc3QuZGVwYXJ0bWVudCk7XG5cdFx0fVxuXG5cdFx0aWYgKGFnZW50cy5jb3VudCgpID09PSAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCduby1hZ2VudC1vbmxpbmUnLCAnU29ycnksIG5vIG9ubGluZSBhZ2VudHMnKTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVMaXZlY2hhdFJvb21Db3VudCgpO1xuXG5cdFx0Y29uc3QgYWdlbnRJZHMgPSBbXTtcblxuXHRcdGFnZW50cy5mb3JFYWNoKChhZ2VudCkgPT4ge1xuXHRcdFx0aWYgKGd1ZXN0LmRlcGFydG1lbnQpIHtcblx0XHRcdFx0YWdlbnRJZHMucHVzaChhZ2VudC5hZ2VudElkKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFnZW50SWRzLnB1c2goYWdlbnQuX2lkKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGNvbnN0IGlucXVpcnkgPSB7XG5cdFx0XHRyaWQ6IG1lc3NhZ2UucmlkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZS5tc2csXG5cdFx0XHRuYW1lOiBndWVzdC5uYW1lIHx8IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHRkZXBhcnRtZW50OiBndWVzdC5kZXBhcnRtZW50LFxuXHRcdFx0YWdlbnRzOiBhZ2VudElkcyxcblx0XHRcdHN0YXR1czogJ29wZW4nLFxuXHRcdFx0djoge1xuXHRcdFx0XHRfaWQ6IGd1ZXN0Ll9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IGd1ZXN0LnVzZXJuYW1lLFxuXHRcdFx0XHR0b2tlbjogbWVzc2FnZS50b2tlbixcblx0XHRcdFx0c3RhdHVzOiBndWVzdC5zdGF0dXMgfHwgJ29ubGluZSdcblx0XHRcdH0sXG5cdFx0XHR0OiAnbCdcblx0XHR9O1xuXG5cdFx0Y29uc3Qgcm9vbSA9IF8uZXh0ZW5kKHtcblx0XHRcdF9pZDogbWVzc2FnZS5yaWQsXG5cdFx0XHRtc2dzOiAxLFxuXHRcdFx0dXNlcnNDb3VudDogMCxcblx0XHRcdGxtOiBuZXcgRGF0ZSgpLFxuXHRcdFx0Zm5hbWU6IGd1ZXN0Lm5hbWUgfHwgZ3Vlc3QudXNlcm5hbWUsXG5cdFx0XHQvLyB1c2VybmFtZXM6IFtndWVzdC51c2VybmFtZV0sXG5cdFx0XHR0OiAnbCcsXG5cdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdHY6IHtcblx0XHRcdFx0X2lkOiBndWVzdC5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBndWVzdC51c2VybmFtZSxcblx0XHRcdFx0dG9rZW46IG1lc3NhZ2UudG9rZW4sXG5cdFx0XHRcdHN0YXR1czogZ3Vlc3Quc3RhdHVzXG5cdFx0XHR9LFxuXHRcdFx0Y2w6IGZhbHNlLFxuXHRcdFx0b3BlbjogdHJ1ZSxcblx0XHRcdHdhaXRpbmdSZXNwb25zZTogdHJ1ZVxuXHRcdH0sIHJvb21JbmZvKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0SW5xdWlyeS5pbnNlcnQoaW5xdWlyeSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuaW5zZXJ0KHJvb20pO1xuXG5cdFx0cmV0dXJuIHJvb207XG5cdH0sXG5cdCdFeHRlcm5hbCcoZ3Vlc3QsIG1lc3NhZ2UsIHJvb21JbmZvLCBhZ2VudCkge1xuXHRcdHJldHVybiB0aGlzWydMZWFzdF9BbW91bnQnXShndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8sIGFnZW50KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuXHR9XG59O1xuIiwiLy8gRXZlcnkgbWludXRlIGNoZWNrIGlmIG9mZmljZSBjbG9zZWRcbk1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9lbmFibGVfb2ZmaWNlX2hvdXJzJykpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRPZmZpY2VIb3VyLmlzT3BlbmluZ1RpbWUoKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMub3Blbk9mZmljZSgpO1xuXHRcdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRPZmZpY2VIb3VyLmlzQ2xvc2luZ1RpbWUoKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuY2xvc2VPZmZpY2UoKTtcblx0XHR9XG5cdH1cbn0sIDYwMDAwKTtcbiIsImNvbnN0IGdhdGV3YXlVUkwgPSAnaHR0cHM6Ly9vbW5pLnJvY2tldC5jaGF0JztcblxuZXhwb3J0IGRlZmF1bHQge1xuXHRlbmFibGUoKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gSFRUUC5jYWxsKCdQT1NUJywgYCR7IGdhdGV3YXlVUkwgfS9mYWNlYm9vay9lbmFibGVgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdCdhdXRob3JpemF0aW9uJzogYEJlYXJlciAkeyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRmFjZWJvb2tfQVBJX0tleScpIH1gLFxuXHRcdFx0XHQnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG5cdFx0XHR9LFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1cmw6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTaXRlX1VybCcpXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc3VsdC5kYXRhO1xuXHR9LFxuXG5cdGRpc2FibGUoKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gSFRUUC5jYWxsKCdERUxFVEUnLCBgJHsgZ2F0ZXdheVVSTCB9L2ZhY2Vib29rL2VuYWJsZWAsIHtcblx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0J2F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JykgfWAsXG5cdFx0XHRcdCdjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gcmVzdWx0LmRhdGE7XG5cdH0sXG5cblx0bGlzdFBhZ2VzKCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IEhUVFAuY2FsbCgnR0VUJywgYCR7IGdhdGV3YXlVUkwgfS9mYWNlYm9vay9wYWdlc2AsIHtcblx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0J2F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JykgfWBcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gcmVzdWx0LmRhdGE7XG5cdH0sXG5cblx0c3Vic2NyaWJlKHBhZ2VJZCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IEhUVFAuY2FsbCgnUE9TVCcsIGAkeyBnYXRld2F5VVJMIH0vZmFjZWJvb2svcGFnZS8keyBwYWdlSWQgfS9zdWJzY3JpYmVgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdCdhdXRob3JpemF0aW9uJzogYEJlYXJlciAkeyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRmFjZWJvb2tfQVBJX0tleScpIH1gXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc3VsdC5kYXRhO1xuXHR9LFxuXG5cdHVuc3Vic2NyaWJlKHBhZ2VJZCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IEhUVFAuY2FsbCgnREVMRVRFJywgYCR7IGdhdGV3YXlVUkwgfS9mYWNlYm9vay9wYWdlLyR7IHBhZ2VJZCB9L3N1YnNjcmliZWAsIHtcblx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0J2F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JykgfWBcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gcmVzdWx0LmRhdGE7XG5cdH0sXG5cblx0cmVwbHkoeyBwYWdlLCB0b2tlbiwgdGV4dCB9KSB7XG5cdFx0cmV0dXJuIEhUVFAuY2FsbCgnUE9TVCcsIGAkeyBnYXRld2F5VVJMIH0vZmFjZWJvb2svcmVwbHlgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdCdhdXRob3JpemF0aW9uJzogYEJlYXJlciAkeyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRmFjZWJvb2tfQVBJX0tleScpIH1gXG5cdFx0XHR9LFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRwYWdlLFxuXHRcdFx0XHR0b2tlbixcblx0XHRcdFx0dGV4dFxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59O1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0Ly8gc2tpcHMgdGhpcyBjYWxsYmFjayBpZiB0aGUgbWVzc2FnZSB3YXMgZWRpdGVkXG5cdGlmIChtZXNzYWdlLmVkaXRlZEF0KSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuU01TLmVuYWJsZWQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIG9ubHkgc2VuZCB0aGUgc21zIGJ5IFNNUyBpZiBpdCBpcyBhIGxpdmVjaGF0IHJvb20gd2l0aCBTTVMgc2V0IHRvIHRydWVcblx0aWYgKCEodHlwZW9mIHJvb20udCAhPT0gJ3VuZGVmaW5lZCcgJiYgcm9vbS50ID09PSAnbCcgJiYgcm9vbS5zbXMgJiYgcm9vbS52ICYmIHJvb20udi50b2tlbikpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHRva2VuLCBpdCB3YXMgc2VudCBmcm9tIHRoZSB2aXNpdG9yLCBzbyBpZ25vcmUgaXRcblx0aWYgKG1lc3NhZ2UudG9rZW4pIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHR5cGUgbWVhbnMgaXQgaXMgYSBzcGVjaWFsIG1lc3NhZ2UgKGxpa2UgdGhlIGNsb3NpbmcgY29tbWVudCksIHNvIHNraXBzXG5cdGlmIChtZXNzYWdlLnQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvbnN0IFNNU1NlcnZpY2UgPSBSb2NrZXRDaGF0LlNNUy5nZXRTZXJ2aWNlKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTTVNfU2VydmljZScpKTtcblxuXHRpZiAoIVNNU1NlcnZpY2UpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHJvb20udi50b2tlbik7XG5cblx0aWYgKCF2aXNpdG9yIHx8ICF2aXNpdG9yLnBob25lIHx8IHZpc2l0b3IucGhvbmUubGVuZ3RoID09PSAwKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRTTVNTZXJ2aWNlLnNlbmQocm9vbS5zbXMuZnJvbSwgdmlzaXRvci5waG9uZVswXS5waG9uZU51bWJlciwgbWVzc2FnZS5tc2cpO1xuXG5cdHJldHVybiBtZXNzYWdlO1xuXG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdzZW5kTWVzc2FnZUJ5U21zJyk7XG4iLCIvKiBnbG9iYWxzIFVzZXJQcmVzZW5jZU1vbml0b3IgKi9cblxubGV0IGFnZW50c0hhbmRsZXI7XG5sZXQgbW9uaXRvckFnZW50cyA9IGZhbHNlO1xubGV0IGFjdGlvblRpbWVvdXQgPSA2MDAwMDtcblxuY29uc3Qgb25saW5lQWdlbnRzID0ge1xuXHR1c2Vyczoge30sXG5cdHF1ZXVlOiB7fSxcblxuXHRhZGQodXNlcklkKSB7XG5cdFx0aWYgKHRoaXMucXVldWVbdXNlcklkXSkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucXVldWVbdXNlcklkXSk7XG5cdFx0XHRkZWxldGUgdGhpcy5xdWV1ZVt1c2VySWRdO1xuXHRcdH1cblx0XHR0aGlzLnVzZXJzW3VzZXJJZF0gPSAxO1xuXHR9LFxuXG5cdHJlbW92ZSh1c2VySWQsIGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMucXVldWVbdXNlcklkXSkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucXVldWVbdXNlcklkXSk7XG5cdFx0fVxuXHRcdHRoaXMucXVldWVbdXNlcklkXSA9IHNldFRpbWVvdXQoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygpO1xuXG5cdFx0XHRkZWxldGUgdGhpcy51c2Vyc1t1c2VySWRdO1xuXHRcdFx0ZGVsZXRlIHRoaXMucXVldWVbdXNlcklkXTtcblx0XHR9KSwgYWN0aW9uVGltZW91dCk7XG5cdH0sXG5cblx0ZXhpc3RzKHVzZXJJZCkge1xuXHRcdHJldHVybiAhIXRoaXMudXNlcnNbdXNlcklkXTtcblx0fVxufTtcblxuZnVuY3Rpb24gcnVuQWdlbnRMZWF2ZUFjdGlvbih1c2VySWQpIHtcblx0Y29uc3QgYWN0aW9uID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X2FnZW50X2xlYXZlX2FjdGlvbicpO1xuXHRpZiAoYWN0aW9uID09PSAnY2xvc2UnKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQuY2xvc2VPcGVuQ2hhdHModXNlcklkLCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfYWdlbnRfbGVhdmVfY29tbWVudCcpKTtcblx0fSBlbHNlIGlmIChhY3Rpb24gPT09ICdmb3J3YXJkJykge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LmZvcndhcmRPcGVuQ2hhdHModXNlcklkKTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfYWdlbnRfbGVhdmVfYWN0aW9uX3RpbWVvdXQnLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdGFjdGlvblRpbWVvdXQgPSB2YWx1ZSAqIDEwMDA7XG59KTtcblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X2FnZW50X2xlYXZlX2FjdGlvbicsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0bW9uaXRvckFnZW50cyA9IHZhbHVlO1xuXHRpZiAodmFsdWUgIT09ICdub25lJykge1xuXHRcdGlmICghYWdlbnRzSGFuZGxlcikge1xuXHRcdFx0YWdlbnRzSGFuZGxlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmxpbmVBZ2VudHMoKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0XHRcdGFkZGVkKGlkKSB7XG5cdFx0XHRcdFx0b25saW5lQWdlbnRzLmFkZChpZCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNoYW5nZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0XHRcdGlmIChmaWVsZHMuc3RhdHVzTGl2ZWNoYXQgJiYgZmllbGRzLnN0YXR1c0xpdmVjaGF0ID09PSAnbm90LWF2YWlsYWJsZScpIHtcblx0XHRcdFx0XHRcdG9ubGluZUFnZW50cy5yZW1vdmUoaWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0cnVuQWdlbnRMZWF2ZUFjdGlvbihpZCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0b25saW5lQWdlbnRzLmFkZChpZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZW1vdmVkKGlkKSB7XG5cdFx0XHRcdFx0b25saW5lQWdlbnRzLnJlbW92ZShpZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0cnVuQWdlbnRMZWF2ZUFjdGlvbihpZCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fSBlbHNlIGlmIChhZ2VudHNIYW5kbGVyKSB7XG5cdFx0YWdlbnRzSGFuZGxlci5zdG9wKCk7XG5cdFx0YWdlbnRzSGFuZGxlciA9IG51bGw7XG5cdH1cbn0pO1xuXG5Vc2VyUHJlc2VuY2VNb25pdG9yLm9uU2V0VXNlclN0YXR1cygodXNlciwgc3RhdHVzLyosIHN0YXR1c0Nvbm5lY3Rpb24qLykgPT4ge1xuXHRpZiAoIW1vbml0b3JBZ2VudHMpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKG9ubGluZUFnZW50cy5leGlzdHModXNlci5faWQpKSB7XG5cdFx0aWYgKHN0YXR1cyA9PT0gJ29mZmxpbmUnIHx8IHVzZXIuc3RhdHVzTGl2ZWNoYXQgPT09ICdub3QtYXZhaWxhYmxlJykge1xuXHRcdFx0b25saW5lQWdlbnRzLnJlbW92ZSh1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0XHRydW5BZ2VudExlYXZlQWN0aW9uKHVzZXIuX2lkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufSk7XG4iLCJpbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDpjdXN0b21GaWVsZHMnLCBmdW5jdGlvbihfaWQpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6Y3VzdG9tRmllbGRzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmN1c3RvbUZpZWxkcycgfSkpO1xuXHR9XG5cblx0aWYgKHMudHJpbShfaWQpKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQuZmluZCh7IF9pZCB9KTtcblx0fVxuXG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmZpbmQoKTtcblxufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6ZGVwYXJ0bWVudEFnZW50cycsIGZ1bmN0aW9uKGRlcGFydG1lbnRJZCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDpkZXBhcnRtZW50QWdlbnRzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6ZGVwYXJ0bWVudEFnZW50cycgfSkpO1xuXHR9XG5cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kKHsgZGVwYXJ0bWVudElkIH0pO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6ZXh0ZXJuYWxNZXNzYWdlcycsIGZ1bmN0aW9uKHJvb21JZCkge1xuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UuZmluZEJ5Um9vbUlkKHJvb21JZCk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDphZ2VudHMnLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6YWdlbnRzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFnZW50cycgfSkpO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0Y29uc3QgaGFuZGxlID0gUm9ja2V0Q2hhdC5hdXRoei5nZXRVc2Vyc0luUm9sZSgnbGl2ZWNoYXQtYWdlbnQnKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnYWdlbnRVc2VycycsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmNoYW5nZWQoJ2FnZW50VXNlcnMnLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdHJlbW92ZWQoaWQpIHtcblx0XHRcdHNlbGYucmVtb3ZlZCgnYWdlbnRVc2VycycsIGlkKTtcblx0XHR9XG5cdH0pO1xuXG5cdHNlbGYucmVhZHkoKTtcblxuXHRzZWxmLm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRoYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0OmFwcGVhcmFuY2UnLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6YXBwZWFyYW5jZScgfSkpO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6YXBwZWFyYW5jZScgfSkpO1xuXHR9XG5cblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkOiB7XG5cdFx0XHQkaW46IFtcblx0XHRcdFx0J0xpdmVjaGF0X3RpdGxlJyxcblx0XHRcdFx0J0xpdmVjaGF0X3RpdGxlX2NvbG9yJyxcblx0XHRcdFx0J0xpdmVjaGF0X3Nob3dfYWdlbnRfZW1haWwnLFxuXHRcdFx0XHQnTGl2ZWNoYXRfZGlzcGxheV9vZmZsaW5lX2Zvcm0nLFxuXHRcdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9mb3JtX3VuYXZhaWxhYmxlJyxcblx0XHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfbWVzc2FnZScsXG5cdFx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3N1Y2Nlc3NfbWVzc2FnZScsXG5cdFx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlJyxcblx0XHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfdGl0bGVfY29sb3InLFxuXHRcdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9lbWFpbCcsXG5cdFx0XHRcdCdMaXZlY2hhdF9jb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZScsXG5cdFx0XHRcdCdMaXZlY2hhdF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XHRcdCdMaXZlY2hhdF9uYW1lX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtJyxcblx0XHRcdFx0J0xpdmVjaGF0X2VtYWlsX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtJ1xuXHRcdFx0XVxuXHRcdH1cblx0fTtcblxuXHRjb25zdCBzZWxmID0gdGhpcztcblxuXHRjb25zdCBoYW5kbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKHF1ZXJ5KS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnbGl2ZWNoYXRBcHBlYXJhbmNlJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuY2hhbmdlZCgnbGl2ZWNoYXRBcHBlYXJhbmNlJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRyZW1vdmVkKGlkKSB7XG5cdFx0XHRzZWxmLnJlbW92ZWQoJ2xpdmVjaGF0QXBwZWFyYW5jZScsIGlkKTtcblx0XHR9XG5cdH0pO1xuXG5cdHRoaXMucmVhZHkoKTtcblxuXHR0aGlzLm9uU3RvcCgoKSA9PiB7XG5cdFx0aGFuZGxlLnN0b3AoKTtcblx0fSk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDpkZXBhcnRtZW50cycsIGZ1bmN0aW9uKF9pZCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDphZ2VudHMnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6YWdlbnRzJyB9KSk7XG5cdH1cblxuXHRpZiAoX2lkICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmRCeURlcGFydG1lbnRJZChfaWQpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQuZmluZCgpO1xuXHR9XG5cbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0OmludGVncmF0aW9uJywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmludGVncmF0aW9uJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDppbnRlZ3JhdGlvbicgfSkpO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0Y29uc3QgaGFuZGxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZEJ5SWRzKFsnTGl2ZWNoYXRfd2ViaG9va1VybCcsICdMaXZlY2hhdF9zZWNyZXRfdG9rZW4nLCAnTGl2ZWNoYXRfd2ViaG9va19vbl9jbG9zZScsICdMaXZlY2hhdF93ZWJob29rX29uX29mZmxpbmVfbXNnJywgJ0xpdmVjaGF0X3dlYmhvb2tfb25fdmlzaXRvcl9tZXNzYWdlJywgJ0xpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZSddKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnbGl2ZWNoYXRJbnRlZ3JhdGlvbicsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmNoYW5nZWQoJ2xpdmVjaGF0SW50ZWdyYXRpb24nLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdHJlbW92ZWQoaWQpIHtcblx0XHRcdHNlbGYucmVtb3ZlZCgnbGl2ZWNoYXRJbnRlZ3JhdGlvbicsIGlkKTtcblx0XHR9XG5cdH0pO1xuXG5cdHNlbGYucmVhZHkoKTtcblxuXHRzZWxmLm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRoYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0Om1hbmFnZXJzJywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0Om1hbmFnZXJzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6bWFuYWdlcnMnIH0pKTtcblx0fVxuXG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdGNvbnN0IGhhbmRsZSA9IFJvY2tldENoYXQuYXV0aHouZ2V0VXNlcnNJblJvbGUoJ2xpdmVjaGF0LW1hbmFnZXInKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnbWFuYWdlclVzZXJzJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuY2hhbmdlZCgnbWFuYWdlclVzZXJzJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRyZW1vdmVkKGlkKSB7XG5cdFx0XHRzZWxmLnJlbW92ZWQoJ21hbmFnZXJVc2VycycsIGlkKTtcblx0XHR9XG5cdH0pO1xuXG5cdHNlbGYucmVhZHkoKTtcblxuXHRzZWxmLm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRoYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0OnJvb21zJywgZnVuY3Rpb24oZmlsdGVyID0ge30sIG9mZnNldCA9IDAsIGxpbWl0ID0gMjApIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6cm9vbXMnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1yb29tcycpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDpyb29tcycgfSkpO1xuXHR9XG5cblx0Y2hlY2soZmlsdGVyLCB7XG5cdFx0bmFtZTogTWF0Y2guTWF5YmUoU3RyaW5nKSwgLy8gcm9vbSBuYW1lIHRvIGZpbHRlclxuXHRcdGFnZW50OiBNYXRjaC5NYXliZShTdHJpbmcpLCAvLyBhZ2VudCBfaWQgd2hvIGlzIHNlcnZpbmdcblx0XHRzdGF0dXM6IE1hdGNoLk1heWJlKFN0cmluZyksIC8vIGVpdGhlciAnb3BlbmVkJyBvciAnY2xvc2VkJ1xuXHRcdGZyb206IE1hdGNoLk1heWJlKERhdGUpLFxuXHRcdHRvOiBNYXRjaC5NYXliZShEYXRlKVxuXHR9KTtcblxuXHRjb25zdCBxdWVyeSA9IHt9O1xuXHRpZiAoZmlsdGVyLm5hbWUpIHtcblx0XHRxdWVyeS5sYWJlbCA9IG5ldyBSZWdFeHAoZmlsdGVyLm5hbWUsICdpJyk7XG5cdH1cblx0aWYgKGZpbHRlci5hZ2VudCkge1xuXHRcdHF1ZXJ5WydzZXJ2ZWRCeS5faWQnXSA9IGZpbHRlci5hZ2VudDtcblx0fVxuXHRpZiAoZmlsdGVyLnN0YXR1cykge1xuXHRcdGlmIChmaWx0ZXIuc3RhdHVzID09PSAnb3BlbmVkJykge1xuXHRcdFx0cXVlcnkub3BlbiA9IHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHF1ZXJ5Lm9wZW4gPSB7ICRleGlzdHM6IGZhbHNlIH07XG5cdFx0fVxuXHR9XG5cdGlmIChmaWx0ZXIuZnJvbSkge1xuXHRcdHF1ZXJ5LnRzID0ge1xuXHRcdFx0JGd0ZTogZmlsdGVyLmZyb21cblx0XHR9O1xuXHR9XG5cdGlmIChmaWx0ZXIudG8pIHtcblx0XHRmaWx0ZXIudG8uc2V0RGF0ZShmaWx0ZXIudG8uZ2V0RGF0ZSgpICsgMSk7XG5cdFx0ZmlsdGVyLnRvLnNldFNlY29uZHMoZmlsdGVyLnRvLmdldFNlY29uZHMoKSAtIDEpO1xuXG5cdFx0aWYgKCFxdWVyeS50cykge1xuXHRcdFx0cXVlcnkudHMgPSB7fTtcblx0XHR9XG5cdFx0cXVlcnkudHMuJGx0ZSA9IGZpbHRlci50bztcblx0fVxuXG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdGNvbnN0IGhhbmRsZSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRMaXZlY2hhdChxdWVyeSwgb2Zmc2V0LCBsaW1pdCkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdGFkZGVkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuYWRkZWQoJ2xpdmVjaGF0Um9vbScsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmNoYW5nZWQoJ2xpdmVjaGF0Um9vbScsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0c2VsZi5yZW1vdmVkKCdsaXZlY2hhdFJvb20nLCBpZCk7XG5cdFx0fVxuXHR9KTtcblxuXHR0aGlzLnJlYWR5KCk7XG5cblx0dGhpcy5vblN0b3AoKCkgPT4ge1xuXHRcdGhhbmRsZS5zdG9wKCk7XG5cdH0pO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6cXVldWUnLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6cXVldWUnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6cXVldWUnIH0pKTtcblx0fVxuXG5cdC8vIGxldCBzb3J0ID0geyBjb3VudDogMSwgc29ydDogMSwgdXNlcm5hbWU6IDEgfTtcblx0Ly8gbGV0IG9ubGluZVVzZXJzID0ge307XG5cblx0Ly8gbGV0IGhhbmRsZVVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9ubGluZUFnZW50cygpLm9ic2VydmVDaGFuZ2VzKHtcblx0Ly8gXHRhZGRlZChpZCwgZmllbGRzKSB7XG5cdC8vIFx0XHRvbmxpbmVVc2Vyc1tmaWVsZHMudXNlcm5hbWVdID0gMTtcblx0Ly8gXHRcdC8vIHRoaXMuYWRkZWQoJ2xpdmVjaGF0UXVldWVVc2VyJywgaWQsIGZpZWxkcyk7XG5cdC8vIFx0fSxcblx0Ly8gXHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0Ly8gXHRcdG9ubGluZVVzZXJzW2ZpZWxkcy51c2VybmFtZV0gPSAxO1xuXHQvLyBcdFx0Ly8gdGhpcy5jaGFuZ2VkKCdsaXZlY2hhdFF1ZXVlVXNlcicsIGlkLCBmaWVsZHMpO1xuXHQvLyBcdH0sXG5cdC8vIFx0cmVtb3ZlZChpZCkge1xuXHQvLyBcdFx0dGhpcy5yZW1vdmVkKCdsaXZlY2hhdFF1ZXVlVXNlcicsIGlkKTtcblx0Ly8gXHR9XG5cdC8vIH0pO1xuXG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdGNvbnN0IGhhbmRsZURlcHRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmZpbmRVc2Vyc0luUXVldWUoKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnbGl2ZWNoYXRRdWV1ZVVzZXInLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdGNoYW5nZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5jaGFuZ2VkKCdsaXZlY2hhdFF1ZXVlVXNlcicsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0c2VsZi5yZW1vdmVkKCdsaXZlY2hhdFF1ZXVlVXNlcicsIGlkKTtcblx0XHR9XG5cdH0pO1xuXG5cdHRoaXMucmVhZHkoKTtcblxuXHR0aGlzLm9uU3RvcCgoKSA9PiB7XG5cdFx0Ly8gaGFuZGxlVXNlcnMuc3RvcCgpO1xuXHRcdGhhbmRsZURlcHRzLnN0b3AoKTtcblx0fSk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDp0cmlnZ2VycycsIGZ1bmN0aW9uKF9pZCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp0cmlnZ2VycycgfSkpO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dHJpZ2dlcnMnIH0pKTtcblx0fVxuXG5cdGlmIChfaWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdFRyaWdnZXIuZmluZEJ5SWQoX2lkKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRUcmlnZ2VyLmZpbmQoKTtcblx0fVxufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6dmlzaXRvckhpc3RvcnknLCBmdW5jdGlvbih7IHJpZDogcm9vbUlkIH0pIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dmlzaXRvckhpc3RvcnknIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dmlzaXRvckhpc3RvcnknIH0pKTtcblx0fVxuXG5cdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXG5cdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCB0aGlzLnVzZXJJZCwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdGlmICghc3Vic2NyaXB0aW9uKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9ySGlzdG9yeScgfSkpO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0aWYgKHJvb20gJiYgcm9vbS52ICYmIHJvb20udi5faWQpIHtcblx0XHRjb25zdCBoYW5kbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlWaXNpdG9ySWQocm9vbS52Ll9pZCkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0XHRzZWxmLmFkZGVkKCd2aXNpdG9yX2hpc3RvcnknLCBpZCwgZmllbGRzKTtcblx0XHRcdH0sXG5cdFx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdFx0c2VsZi5jaGFuZ2VkKCd2aXNpdG9yX2hpc3RvcnknLCBpZCwgZmllbGRzKTtcblx0XHRcdH0sXG5cdFx0XHRyZW1vdmVkKGlkKSB7XG5cdFx0XHRcdHNlbGYucmVtb3ZlZCgndmlzaXRvcl9oaXN0b3J5JywgaWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0c2VsZi5yZWFkeSgpO1xuXG5cdFx0c2VsZi5vblN0b3AoZnVuY3Rpb24oKSB7XG5cdFx0XHRoYW5kbGUuc3RvcCgpO1xuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdHNlbGYucmVhZHkoKTtcblx0fVxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDp2aXNpdG9ySW5mbycsIGZ1bmN0aW9uKHsgcmlkOiByb29tSWQgfSkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9ySW5mbycgfSkpO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9ySW5mbycgfSkpO1xuXHR9XG5cblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cblx0aWYgKHJvb20gJiYgcm9vbS52ICYmIHJvb20udi5faWQpIHtcblx0XHRyZXR1cm4gTGl2ZWNoYXRWaXNpdG9ycy5maW5kQnlJZChyb29tLnYuX2lkKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDp2aXNpdG9yUGFnZVZpc2l0ZWQnLCBmdW5jdGlvbih7IHJpZDogcm9vbUlkIH0pIHtcblxuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9yUGFnZVZpc2l0ZWQnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dmlzaXRvclBhZ2VWaXNpdGVkJyB9KSk7XG5cdH1cblxuXHRjb25zdCBzZWxmID0gdGhpcztcblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cblx0aWYgKHJvb20pIHtcblx0XHRjb25zdCBoYW5kbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kQnlSb29tSWRBbmRUeXBlKHJvb20uX2lkLCAnbGl2ZWNoYXRfbmF2aWdhdGlvbl9oaXN0b3J5Jykub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0XHRzZWxmLmFkZGVkKCd2aXNpdG9yX25hdmlnYXRpb25faGlzdG9yeScsIGlkLCBmaWVsZHMpO1xuXHRcdFx0fSxcblx0XHRcdGNoYW5nZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0XHRzZWxmLmNoYW5nZWQoJ3Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5JywgaWQsIGZpZWxkcyk7XG5cdFx0XHR9LFxuXHRcdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0XHRzZWxmLnJlbW92ZWQoJ3Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5JywgaWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0c2VsZi5yZWFkeSgpO1xuXG5cdFx0c2VsZi5vblN0b3AoZnVuY3Rpb24oKSB7XG5cdFx0XHRoYW5kbGUuc3RvcCgpO1xuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdHNlbGYucmVhZHkoKTtcblx0fVxufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6aW5xdWlyeScsIGZ1bmN0aW9uKCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDppbnF1aXJ5JyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmlucXVpcnknIH0pKTtcblx0fVxuXG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdGFnZW50czogdGhpcy51c2VySWQsXG5cdFx0c3RhdHVzOiAnb3Blbidcblx0fTtcblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5LmZpbmQocXVlcnkpO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6b2ZmaWNlSG91cicsIGZ1bmN0aW9uKCkge1xuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFnZW50cycgfSkpO1xuXHR9XG5cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0T2ZmaWNlSG91ci5maW5kKCk7XG59KTtcbiIsImltcG9ydCAnLi4vaW1wb3J0cy9zZXJ2ZXIvcmVzdC9kZXBhcnRtZW50cy5qcyc7XG5pbXBvcnQgJy4uL2ltcG9ydHMvc2VydmVyL3Jlc3QvZmFjZWJvb2suanMnO1xuaW1wb3J0ICcuLi9pbXBvcnRzL3NlcnZlci9yZXN0L3Ntcy5qcyc7XG5pbXBvcnQgJy4uL2ltcG9ydHMvc2VydmVyL3Jlc3QvdXNlcnMuanMnO1xuaW1wb3J0ICcuLi9pbXBvcnRzL3NlcnZlci9yZXN0L21lc3NhZ2VzLmpzJztcbmltcG9ydCAnLi4vaW1wb3J0cy9zZXJ2ZXIvcmVzdC92aXNpdG9ycy5qcyc7XG5pbXBvcnQgJy4uL2ltcG9ydHMvc2VydmVyL3Jlc3QvdXBsb2FkLmpzJztcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG5cdGNvbnN0IHJvbGVzID0gXy5wbHVjayhSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5maW5kKCkuZmV0Y2goKSwgJ25hbWUnKTtcblx0aWYgKHJvbGVzLmluZGV4T2YoJ2xpdmVjaGF0LWFnZW50JykgPT09IC0xKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuY3JlYXRlT3JVcGRhdGUoJ2xpdmVjaGF0LWFnZW50Jyk7XG5cdH1cblx0aWYgKHJvbGVzLmluZGV4T2YoJ2xpdmVjaGF0LW1hbmFnZXInKSA9PT0gLTEpIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5jcmVhdGVPclVwZGF0ZSgnbGl2ZWNoYXQtbWFuYWdlcicpO1xuXHR9XG5cdGlmIChyb2xlcy5pbmRleE9mKCdsaXZlY2hhdC1ndWVzdCcpID09PSAtMSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmNyZWF0ZU9yVXBkYXRlKCdsaXZlY2hhdC1ndWVzdCcpO1xuXHR9XG5cdGlmIChSb2NrZXRDaGF0Lm1vZGVscyAmJiBSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucykge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKCd2aWV3LWwtcm9vbScsIFsnbGl2ZWNoYXQtYWdlbnQnLCAnbGl2ZWNoYXQtbWFuYWdlcicsICdhZG1pbiddKTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5jcmVhdGVPclVwZGF0ZSgndmlldy1saXZlY2hhdC1tYW5hZ2VyJywgWydsaXZlY2hhdC1tYW5hZ2VyJywgJ2FkbWluJ10pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKCd2aWV3LWxpdmVjaGF0LXJvb21zJywgWydsaXZlY2hhdC1tYW5hZ2VyJywgJ2FkbWluJ10pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKCdjbG9zZS1saXZlY2hhdC1yb29tJywgWydsaXZlY2hhdC1hZ2VudCcsICdsaXZlY2hhdC1tYW5hZ2VyJywgJ2FkbWluJ10pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKCdjbG9zZS1vdGhlcnMtbGl2ZWNoYXQtcm9vbScsIFsnbGl2ZWNoYXQtbWFuYWdlcicsICdhZG1pbiddKTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5jcmVhdGVPclVwZGF0ZSgnc2F2ZS1vdGhlcnMtbGl2ZWNoYXQtcm9vbS1pbmZvJywgWydsaXZlY2hhdC1tYW5hZ2VyJ10pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKCdyZW1vdmUtY2xvc2VkLWxpdmVjaGF0LXJvb21zJywgWydsaXZlY2hhdC1tYW5hZ2VyJywgJ2FkbWluJ10pO1xuXHR9XG59KTtcbiIsIlJvY2tldENoYXQuTWVzc2FnZVR5cGVzLnJlZ2lzdGVyVHlwZSh7XG5cdGlkOiAnbGl2ZWNoYXRfbmF2aWdhdGlvbl9oaXN0b3J5Jyxcblx0c3lzdGVtOiB0cnVlLFxuXHRtZXNzYWdlOiAnTmV3X3Zpc2l0b3JfbmF2aWdhdGlvbicsXG5cdGRhdGEobWVzc2FnZSkge1xuXHRcdGlmICghbWVzc2FnZS5uYXZpZ2F0aW9uIHx8ICFtZXNzYWdlLm5hdmlnYXRpb24ucGFnZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0aGlzdG9yeTogYCR7IChtZXNzYWdlLm5hdmlnYXRpb24ucGFnZS50aXRsZSA/IGAkeyBtZXNzYWdlLm5hdmlnYXRpb24ucGFnZS50aXRsZSB9IC0gYCA6ICcnKSArIG1lc3NhZ2UubmF2aWdhdGlvbi5wYWdlLmxvY2F0aW9uLmhyZWYgfWBcblx0XHR9O1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5NZXNzYWdlVHlwZXMucmVnaXN0ZXJUeXBlKHtcblx0aWQ6ICdsaXZlY2hhdF92aWRlb19jYWxsJyxcblx0c3lzdGVtOiB0cnVlLFxuXHRtZXNzYWdlOiAnTmV3X3ZpZGVvY2FsbF9yZXF1ZXN0J1xufSk7XG5cblJvY2tldENoYXQuYWN0aW9uTGlua3MucmVnaXN0ZXIoJ2NyZWF0ZUxpdmVjaGF0Q2FsbCcsIGZ1bmN0aW9uKG1lc3NhZ2UsIHBhcmFtcywgaW5zdGFuY2UpIHtcblx0aWYgKE1ldGVvci5pc0NsaWVudCkge1xuXHRcdGluc3RhbmNlLnRhYkJhci5vcGVuKCd2aWRlbycpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5hY3Rpb25MaW5rcy5yZWdpc3RlcignZGVueUxpdmVjaGF0Q2FsbCcsIGZ1bmN0aW9uKG1lc3NhZ2UvKiwgcGFyYW1zKi8pIHtcblx0aWYgKE1ldGVvci5pc1NlcnZlcikge1xuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcignY29tbWFuZCcsIG1lc3NhZ2UucmlkLCAnZW5kQ2FsbCcsIHVzZXIpO1xuXHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlSb29tKG1lc3NhZ2UucmlkLCAnZGVsZXRlTWVzc2FnZScsIHsgX2lkOiBtZXNzYWdlLl9pZCB9KTtcblxuXHRcdGNvbnN0IGxhbmd1YWdlID0gdXNlci5sYW5ndWFnZSB8fCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnbGFuZ3VhZ2UnKSB8fCAnZW4nO1xuXG5cdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5jbG9zZVJvb20oe1xuXHRcdFx0dXNlcixcblx0XHRcdHJvb206IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKG1lc3NhZ2UucmlkKSxcblx0XHRcdGNvbW1lbnQ6IFRBUGkxOG4uX18oJ1ZpZGVvY2FsbF9kZWNsaW5lZCcsIHsgbG5nOiBsYW5ndWFnZSB9KVxuXHRcdH0pO1xuXHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5zZXRIaWRkZW5CeUlkKG1lc3NhZ2UuX2lkKTtcblx0XHR9KTtcblx0fVxufSk7XG4iLCJNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnTGl2ZWNoYXQnKTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfZW5hYmxlZCcsIGZhbHNlLCB7IHR5cGU6ICdib29sZWFuJywgZ3JvdXA6ICdMaXZlY2hhdCcsIHB1YmxpYzogdHJ1ZSB9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfdGl0bGUnLCAnUm9ja2V0LkNoYXQnLCB7IHR5cGU6ICdzdHJpbmcnLCBncm91cDogJ0xpdmVjaGF0JywgcHVibGljOiB0cnVlIH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfdGl0bGVfY29sb3InLCAnI0MxMjcyRCcsIHtcblx0XHR0eXBlOiAnY29sb3InLFxuXHRcdGVkaXRvcjogJ2NvbG9yJyxcblx0XHRhbGxvd2VkVHlwZXM6IFsnY29sb3InLCAnZXhwcmVzc2lvbiddLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZVxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfZGlzcGxheV9vZmZsaW5lX2Zvcm0nLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZScsXG5cdFx0aTE4bkxhYmVsOiAnRGlzcGxheV9vZmZsaW5lX2Zvcm0nXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF92YWxpZGF0ZV9vZmZsaW5lX2VtYWlsJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0c2VjdGlvbjogJ09mZmxpbmUnLFxuXHRcdGkxOG5MYWJlbDogJ1ZhbGlkYXRlX2VtYWlsX2FkZHJlc3MnXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9vZmZsaW5lX2Zvcm1fdW5hdmFpbGFibGUnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZScsXG5cdFx0aTE4bkxhYmVsOiAnT2ZmbGluZV9mb3JtX3VuYXZhaWxhYmxlX21lc3NhZ2UnXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlJywgJ0xlYXZlIGEgbWVzc2FnZScsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0c2VjdGlvbjogJ09mZmxpbmUnLFxuXHRcdGkxOG5MYWJlbDogJ1RpdGxlJ1xuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X29mZmxpbmVfdGl0bGVfY29sb3InLCAnIzY2NjY2NicsIHtcblx0XHR0eXBlOiAnY29sb3InLFxuXHRcdGVkaXRvcjogJ2NvbG9yJyxcblx0XHRhbGxvd2VkVHlwZXM6IFsnY29sb3InLCAnZXhwcmVzc2lvbiddLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZScsXG5cdFx0aTE4bkxhYmVsOiAnQ29sb3InXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlJywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0c2VjdGlvbjogJ09mZmxpbmUnLFxuXHRcdGkxOG5MYWJlbDogJ0luc3RydWN0aW9ucycsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnSW5zdHJ1Y3Rpb25zX3RvX3lvdXJfdmlzaXRvcl9maWxsX3RoZV9mb3JtX3RvX3NlbmRfYV9tZXNzYWdlJ1xuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X29mZmxpbmVfZW1haWwnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdGkxOG5MYWJlbDogJ0VtYWlsX2FkZHJlc3NfdG9fc2VuZF9vZmZsaW5lX21lc3NhZ2VzJyxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZSdcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9vZmZsaW5lX3N1Y2Nlc3NfbWVzc2FnZScsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdPZmZsaW5lJyxcblx0XHRpMThuTGFiZWw6ICdPZmZsaW5lX3N1Y2Nlc3NfbWVzc2FnZSdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2FsbG93X3N3aXRjaGluZ19kZXBhcnRtZW50cycsIHRydWUsIHsgdHlwZTogJ2Jvb2xlYW4nLCBncm91cDogJ0xpdmVjaGF0JywgcHVibGljOiB0cnVlLCBpMThuTGFiZWw6ICdBbGxvd19zd2l0Y2hpbmdfZGVwYXJ0bWVudHMnIH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfc2hvd19hZ2VudF9lbWFpbCcsIHRydWUsIHsgdHlwZTogJ2Jvb2xlYW4nLCBncm91cDogJ0xpdmVjaGF0JywgcHVibGljOiB0cnVlLCBpMThuTGFiZWw6ICdTaG93X2FnZW50X2VtYWlsJyB9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfY29udmVyc2F0aW9uX2ZpbmlzaGVkX21lc3NhZ2UnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdDb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZSdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3JlZ2lzdHJhdGlvbl9mb3JtJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnU2hvd19wcmVyZWdpc3RyYXRpb25fZm9ybSdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X25hbWVfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0nLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdTaG93X25hbWVfZmllbGQnXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9lbWFpbF9maWVsZF9yZWdpc3RyYXRpb25fZm9ybScsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ1Nob3dfZW1haWxfZmllbGQnXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9ndWVzdF9jb3VudCcsIDEsIHsgdHlwZTogJ2ludCcsIGdyb3VwOiAnTGl2ZWNoYXQnIH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9Sb29tX0NvdW50JywgMSwge1xuXHRcdHR5cGU6ICdpbnQnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdGkxOG5MYWJlbDogJ0xpdmVjaGF0X3Jvb21fY291bnQnXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb24nLCAnbm9uZScsIHtcblx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHR2YWx1ZXM6IFtcblx0XHRcdHsga2V5OiAnbm9uZScsIGkxOG5MYWJlbDogJ05vbmUnIH0sXG5cdFx0XHR7IGtleTogJ2ZvcndhcmQnLCBpMThuTGFiZWw6ICdGb3J3YXJkJyB9LFxuXHRcdFx0eyBrZXk6ICdjbG9zZScsIGkxOG5MYWJlbDogJ0Nsb3NlJyB9XG5cdFx0XSxcblx0XHRpMThuTGFiZWw6ICdIb3dfdG9faGFuZGxlX29wZW5fc2Vzc2lvbnNfd2hlbl9hZ2VudF9nb2VzX29mZmxpbmUnXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb25fdGltZW91dCcsIDYwLCB7XG5cdFx0dHlwZTogJ2ludCcsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfYWdlbnRfbGVhdmVfYWN0aW9uJywgdmFsdWU6IHsgJG5lOiAnbm9uZScgfSB9LFxuXHRcdGkxOG5MYWJlbDogJ0hvd19sb25nX3RvX3dhaXRfYWZ0ZXJfYWdlbnRfZ29lc19vZmZsaW5lJyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdUaW1lX2luX3NlY29uZHMnXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9jb21tZW50JywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb24nLCB2YWx1ZTogJ2Nsb3NlJyB9LFxuXHRcdGkxOG5MYWJlbDogJ0NvbW1lbnRfdG9fbGVhdmVfb25fY2xvc2luZ19zZXNzaW9uJ1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfd2ViaG9va1VybCcsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0NSTV9JbnRlZ3JhdGlvbicsXG5cdFx0aTE4bkxhYmVsOiAnV2ViaG9va19VUkwnXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9zZWNyZXRfdG9rZW4nLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ1NlY3JldF90b2tlbidcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fY2xvc2UnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdTZW5kX3JlcXVlc3Rfb25fY2hhdF9jbG9zZSdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fb2ZmbGluZV9tc2cnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdTZW5kX3JlcXVlc3Rfb25fb2ZmbGluZV9tZXNzYWdlcydcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fdmlzaXRvcl9tZXNzYWdlJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0NSTV9JbnRlZ3JhdGlvbicsXG5cdFx0aTE4bkxhYmVsOiAnU2VuZF9yZXF1ZXN0X29uX3Zpc2l0b3JfbWVzc2FnZSdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZScsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ1NlbmRfcmVxdWVzdF9vbl9hZ2VudF9tZXNzYWdlJ1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnU2VuZF92aXNpdG9yX25hdmlnYXRpb25faGlzdG9yeV9saXZlY2hhdF93ZWJob29rX3JlcXVlc3QnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdTZW5kX3Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5X29uX3JlcXVlc3QnLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0ZlYXR1cmVfRGVwZW5kc19vbl9MaXZlY2hhdF9WaXNpdG9yX25hdmlnYXRpb25fYXNfYV9tZXNzYWdlX3RvX2JlX2VuYWJsZWQnLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0xpdmVjaGF0X1Zpc2l0b3JfbmF2aWdhdGlvbl9hc19hX21lc3NhZ2UnLCB2YWx1ZTogdHJ1ZSB9XG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF93ZWJob29rX29uX2NhcHR1cmUnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdTZW5kX3JlcXVlc3Rfb25fbGVhZF9jYXB0dXJlJ1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfbGVhZF9lbWFpbF9yZWdleCcsICdcXFxcYltBLVowLTkuXyUrLV0rQCg/OltBLVowLTktXStcXFxcLikrW0EtWl17Miw0fVxcXFxiJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ0xlYWRfY2FwdHVyZV9lbWFpbF9yZWdleCdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2xlYWRfcGhvbmVfcmVnZXgnLCAnKCg/OlxcXFwoWzAtOV17MSwzfVxcXFwpfFswLTldezJ9KVsgXFxcXC1dKj9bMC05XXs0LDV9KD86W1xcXFwtXFxcXHNcXFxcX117MSwyfSk/WzAtOV17NH0oPzooPz1bXjAtOV0pfCQpfFswLTldezQsNX0oPzpbXFxcXC1cXFxcc1xcXFxfXXsxLDJ9KT9bMC05XXs0fSg/Oig/PVteMC05XSl8JCkpJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ0xlYWRfY2FwdHVyZV9waG9uZV9yZWdleCdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0tub3dsZWRnZV9FbmFibGVkJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0tub3dsZWRnZV9CYXNlJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnRW5hYmxlZCdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0tub3dsZWRnZV9BcGlhaV9LZXknLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdLbm93bGVkZ2VfQmFzZScsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ0FwaWFpX0tleSdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0tub3dsZWRnZV9BcGlhaV9MYW5ndWFnZScsICdlbicsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnS25vd2xlZGdlX0Jhc2UnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdBcGlhaV9MYW5ndWFnZSdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2hpc3RvcnlfbW9uaXRvcl90eXBlJywgJ3VybCcsIHtcblx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRpMThuTGFiZWw6ICdNb25pdG9yX2hpc3RvcnlfZm9yX2NoYW5nZXNfb24nLFxuXHRcdHZhbHVlczogW1xuXHRcdFx0eyBrZXk6ICd1cmwnLCBpMThuTGFiZWw6ICdQYWdlX1VSTCcgfSxcblx0XHRcdHsga2V5OiAndGl0bGUnLCBpMThuTGFiZWw6ICdQYWdlX3RpdGxlJyB9XG5cdFx0XVxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfVmlzaXRvcl9uYXZpZ2F0aW9uX2FzX2FfbWVzc2FnZScsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdTZW5kX1Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5X2FzX2FfbWVzc2FnZSdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2VuYWJsZV9vZmZpY2VfaG91cnMnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnT2ZmaWNlX2hvdXJzX2VuYWJsZWQnXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9jb250aW51b3VzX3NvdW5kX25vdGlmaWNhdGlvbl9uZXdfbGl2ZWNoYXRfcm9vbScsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdDb250aW51b3VzX3NvdW5kX25vdGlmaWNhdGlvbnNfZm9yX25ld19saXZlY2hhdF9yb29tJ1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfdmlkZW9jYWxsX2VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnVmlkZW9jYWxsX2VuYWJsZWQnLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0JldGFfZmVhdHVyZV9EZXBlbmRzX29uX1ZpZGVvX0NvbmZlcmVuY2VfdG9fYmVfZW5hYmxlZCcsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnSml0c2lfRW5hYmxlZCcsIHZhbHVlOiB0cnVlIH1cblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2ZpbGV1cGxvYWRfZW5hYmxlZCcsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ0ZpbGVVcGxvYWRfRW5hYmxlZCcsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnRmlsZVVwbG9hZF9FbmFibGVkJywgdmFsdWU6IHRydWUgfVxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfZW5hYmxlX3RyYW5zY3JpcHQnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnVHJhbnNjcmlwdF9FbmFibGVkJ1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfdHJhbnNjcmlwdF9tZXNzYWdlJywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnVHJhbnNjcmlwdF9tZXNzYWdlJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9lbmFibGVfdHJhbnNjcmlwdCcsIHZhbHVlOiB0cnVlIH1cblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X29wZW5faW5xdWllcnlfc2hvd19jb25uZWN0aW5nJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ0xpdmVjaGF0X29wZW5faW5xdWllcnlfc2hvd19jb25uZWN0aW5nJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcsIHZhbHVlOiAnR3Vlc3RfUG9vbCcgfVxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfQWxsb3dlZERvbWFpbnNMaXN0JywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnTGl2ZWNoYXRfQWxsb3dlZERvbWFpbnNMaXN0Jyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdEb21haW5zX2FsbG93ZWRfdG9fZW1iZWRfdGhlX2xpdmVjaGF0X3dpZGdldCdcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0ZhY2Vib29rX0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnRmFjZWJvb2snXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnRmFjZWJvb2snLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0lmX3lvdV9kb250X2hhdmVfb25lX3NlbmRfYW5fZW1haWxfdG9fb21uaV9yb2NrZXRjaGF0X3RvX2dldF95b3Vycydcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9TZWNyZXQnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdGYWNlYm9vaycsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnSWZfeW91X2RvbnRfaGF2ZV9vbmVfc2VuZF9hbl9lbWFpbF90b19vbW5pX3JvY2tldGNoYXRfdG9fZ2V0X3lvdXJzJ1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfUkRTdGF0aW9uX1Rva2VuJywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IGZhbHNlLFxuXHRcdHNlY3Rpb246ICdSRCBTdGF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdSRFN0YXRpb25fVG9rZW4nXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcsICdMZWFzdF9BbW91bnQnLCB7XG5cdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdSb3V0aW5nJyxcblx0XHR2YWx1ZXM6IFtcblx0XHRcdHtrZXk6ICdFeHRlcm5hbCcsIGkxOG5MYWJlbDogJ0V4dGVybmFsX1NlcnZpY2UnfSxcblx0XHRcdHtrZXk6ICdMZWFzdF9BbW91bnQnLCBpMThuTGFiZWw6ICdMZWFzdF9BbW91bnQnfSxcblx0XHRcdHtrZXk6ICdHdWVzdF9Qb29sJywgaTE4bkxhYmVsOiAnR3Vlc3RfUG9vbCd9XG5cdFx0XVxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfZ3Vlc3RfcG9vbF93aXRoX25vX2FnZW50cycsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdSb3V0aW5nJyxcblx0XHRpMThuTGFiZWw6ICdBY2NlcHRfd2l0aF9ub19vbmxpbmVfYWdlbnRzJyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdBY2NlcHRfaW5jb21pbmdfbGl2ZWNoYXRfcmVxdWVzdHNfZXZlbl9pZl90aGVyZV9hcmVfbm9fb25saW5lX2FnZW50cycsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfUm91dGluZ19NZXRob2QnLCB2YWx1ZTogJ0d1ZXN0X1Bvb2wnIH1cblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3Nob3dfcXVldWVfbGlzdF9saW5rJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdSb3V0aW5nJyxcblx0XHRpMThuTGFiZWw6ICdTaG93X3F1ZXVlX2xpc3RfdG9fYWxsX2FnZW50cycsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfUm91dGluZ19NZXRob2QnLCB2YWx1ZTogeyAkbmU6ICdFeHRlcm5hbCcgfSB9XG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9FeHRlcm5hbF9RdWV1ZV9VUkwnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogZmFsc2UsXG5cdFx0c2VjdGlvbjogJ1JvdXRpbmcnLFxuXHRcdGkxOG5MYWJlbDogJ0V4dGVybmFsX1F1ZXVlX1NlcnZpY2VfVVJMJyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdGb3JfbW9yZV9kZXRhaWxzX3BsZWFzZV9jaGVja19vdXJfZG9jcycsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfUm91dGluZ19NZXRob2QnLCB2YWx1ZTogJ0V4dGVybmFsJyB9XG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9FeHRlcm5hbF9RdWV1ZV9Ub2tlbicsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiBmYWxzZSxcblx0XHRzZWN0aW9uOiAnUm91dGluZycsXG5cdFx0aTE4bkxhYmVsOiAnU2VjcmV0X3Rva2VuJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcsIHZhbHVlOiAnRXh0ZXJuYWwnIH1cblx0fSk7XG59KTtcbiIsIi8qIGdsb2JhbHMgb3BlblJvb20sIExpdmVjaGF0SW5xdWlyeSAqL1xuaW1wb3J0IHsgUm9vbVNldHRpbmdzRW51bSwgUm9vbVR5cGVDb25maWcsIFJvb21UeXBlUm91dGVDb25maWcsIFVpVGV4dENvbnRleHQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5jbGFzcyBMaXZlY2hhdFJvb21Sb3V0ZSBleHRlbmRzIFJvb21UeXBlUm91dGVDb25maWcge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcih7XG5cdFx0XHRuYW1lOiAnbGl2ZScsXG5cdFx0XHRwYXRoOiAnL2xpdmUvOmlkJ1xuXHRcdH0pO1xuXHR9XG5cblx0YWN0aW9uKHBhcmFtcykge1xuXHRcdG9wZW5Sb29tKCdsJywgcGFyYW1zLmlkKTtcblx0fVxuXG5cdGxpbmsoc3ViKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGlkOiBzdWIucmlkXG5cdFx0fTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMaXZlY2hhdFJvb21UeXBlIGV4dGVuZHMgUm9vbVR5cGVDb25maWcge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcih7XG5cdFx0XHRpZGVudGlmaWVyOiAnbCcsXG5cdFx0XHRvcmRlcjogNSxcblx0XHRcdGljb246ICdsaXZlY2hhdCcsXG5cdFx0XHRsYWJlbDogJ0xpdmVjaGF0Jyxcblx0XHRcdHJvdXRlOiBuZXcgTGl2ZWNoYXRSb29tUm91dGUoKVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5ub3RTdWJzY3JpYmVkVHBsID0ge1xuXHRcdFx0dGVtcGxhdGU6ICdsaXZlY2hhdE5vdFN1YnNjcmliZWQnXG5cdFx0fTtcblx0fVxuXG5cdGZpbmRSb29tKGlkZW50aWZpZXIpIHtcblx0XHRyZXR1cm4gQ2hhdFJvb20uZmluZE9uZSh7X2lkOiBpZGVudGlmaWVyfSk7XG5cdH1cblxuXHRyb29tTmFtZShyb29tRGF0YSkge1xuXHRcdHJldHVybiByb29tRGF0YS5uYW1lIHx8IHJvb21EYXRhLmZuYW1lIHx8IHJvb21EYXRhLmxhYmVsO1xuXHR9XG5cblx0Y29uZGl0aW9uKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfZW5hYmxlZCcpICYmIFJvY2tldENoYXQuYXV0aHouaGFzQWxsUGVybWlzc2lvbigndmlldy1sLXJvb20nKTtcblx0fVxuXG5cdGNhblNlbmRNZXNzYWdlKHJvb21JZCkge1xuXHRcdGNvbnN0IHJvb20gPSBDaGF0Um9vbS5maW5kT25lKHtfaWQ6IHJvb21JZH0sIHtmaWVsZHM6IHtvcGVuOiAxfX0pO1xuXHRcdHJldHVybiByb29tICYmIHJvb20ub3BlbiA9PT0gdHJ1ZTtcblx0fVxuXG5cdGdldFVzZXJTdGF0dXMocm9vbUlkKSB7XG5cdFx0Y29uc3Qgcm9vbSA9IFNlc3Npb24uZ2V0KGByb29tRGF0YSR7IHJvb21JZCB9YCk7XG5cdFx0aWYgKHJvb20pIHtcblx0XHRcdHJldHVybiByb29tLnYgJiYgcm9vbS52LnN0YXR1cztcblx0XHR9XG5cblx0XHRjb25zdCBpbnF1aXJ5ID0gTGl2ZWNoYXRJbnF1aXJ5LmZpbmRPbmUoeyByaWQ6IHJvb21JZCB9KTtcblx0XHRyZXR1cm4gaW5xdWlyeSAmJiBpbnF1aXJ5LnYgJiYgaW5xdWlyeS52LnN0YXR1cztcblx0fVxuXG5cdGFsbG93Um9vbVNldHRpbmdDaGFuZ2Uocm9vbSwgc2V0dGluZykge1xuXHRcdHN3aXRjaCAoc2V0dGluZykge1xuXHRcdFx0Y2FzZSBSb29tU2V0dGluZ3NFbnVtLkpPSU5fQ09ERTpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHR9XG5cblx0Z2V0VWlUZXh0KGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKGNvbnRleHQpIHtcblx0XHRcdGNhc2UgVWlUZXh0Q29udGV4dC5ISURFX1dBUk5JTkc6XG5cdFx0XHRcdHJldHVybiAnSGlkZV9MaXZlY2hhdF9XYXJuaW5nJztcblx0XHRcdGNhc2UgVWlUZXh0Q29udGV4dC5MRUFWRV9XQVJOSU5HOlxuXHRcdFx0XHRyZXR1cm4gJ0hpZGVfTGl2ZWNoYXRfV2FybmluZyc7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0fVxuXHR9XG59XG4iLCJSb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvZGVwYXJ0bWVudCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRkZXBhcnRtZW50czogUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmQoKS5mZXRjaCgpXG5cdFx0fSk7XG5cdH0sXG5cdHBvc3QoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdFx0ZGVwYXJ0bWVudDogT2JqZWN0LFxuXHRcdFx0XHRhZ2VudHM6IEFycmF5XG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgZGVwYXJ0bWVudCA9IFJvY2tldENoYXQuTGl2ZWNoYXQuc2F2ZURlcGFydG1lbnQobnVsbCwgdGhpcy5ib2R5UGFyYW1zLmRlcGFydG1lbnQsIHRoaXMuYm9keVBhcmFtcy5hZ2VudHMpO1xuXG5cdFx0XHRpZiAoZGVwYXJ0bWVudCkge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdFx0ZGVwYXJ0bWVudCxcblx0XHRcdFx0XHRhZ2VudHM6IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kKHsgZGVwYXJ0bWVudElkOiBkZXBhcnRtZW50Ll9pZCB9KS5mZXRjaCgpXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZSk7XG5cdFx0fVxuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L2RlcGFydG1lbnQvOl9pZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0X2lkOiBTdHJpbmdcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdGRlcGFydG1lbnQ6IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5maW5kT25lQnlJZCh0aGlzLnVybFBhcmFtcy5faWQpLFxuXHRcdFx0XHRhZ2VudHM6IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kKHsgZGVwYXJ0bWVudElkOiB0aGlzLnVybFBhcmFtcy5faWQgfSkuZmV0Y2goKVxuXHRcdFx0fSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxuXHRwdXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnVybFBhcmFtcywge1xuXHRcdFx0XHRfaWQ6IFN0cmluZ1xuXHRcdFx0fSk7XG5cblx0XHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0XHRkZXBhcnRtZW50OiBPYmplY3QsXG5cdFx0XHRcdGFnZW50czogQXJyYXlcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoUm9ja2V0Q2hhdC5MaXZlY2hhdC5zYXZlRGVwYXJ0bWVudCh0aGlzLnVybFBhcmFtcy5faWQsIHRoaXMuYm9keVBhcmFtcy5kZXBhcnRtZW50LCB0aGlzLmJvZHlQYXJhbXMuYWdlbnRzKSkge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdFx0ZGVwYXJ0bWVudDogUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLl9pZCksXG5cdFx0XHRcdFx0YWdlbnRzOiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMuZmluZCh7IGRlcGFydG1lbnRJZDogdGhpcy51cmxQYXJhbXMuX2lkIH0pLmZldGNoKClcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxuXHRkZWxldGUoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnVybFBhcmFtcywge1xuXHRcdFx0XHRfaWQ6IFN0cmluZ1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChSb2NrZXRDaGF0LkxpdmVjaGF0LnJlbW92ZURlcGFydG1lbnQodGhpcy51cmxQYXJhbXMuX2lkKSkge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUuZXJyb3IpO1xuXHRcdH1cblx0fVxufSk7XG4iLCJpbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbmltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uLy4uLy4uL3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbi8qKlxuICogQGFwaSB7cG9zdH0gL2xpdmVjaGF0L2ZhY2Vib29rIFNlbmQgRmFjZWJvb2sgbWVzc2FnZVxuICogQGFwaU5hbWUgRmFjZWJvb2tcbiAqIEBhcGlHcm91cCBMaXZlY2hhdFxuICpcbiAqIEBhcGlQYXJhbSB7U3RyaW5nfSBtaWQgRmFjZWJvb2sgbWVzc2FnZSBpZFxuICogQGFwaVBhcmFtIHtTdHJpbmd9IHBhZ2UgRmFjZWJvb2sgcGFnZXMgaWRcbiAqIEBhcGlQYXJhbSB7U3RyaW5nfSB0b2tlbiBGYWNlYm9vayB1c2VyJ3MgdG9rZW5cbiAqIEBhcGlQYXJhbSB7U3RyaW5nfSBmaXJzdF9uYW1lIEZhY2Vib29rIHVzZXIncyBmaXJzdCBuYW1lXG4gKiBAYXBpUGFyYW0ge1N0cmluZ30gbGFzdF9uYW1lIEZhY2Vib29rIHVzZXIncyBsYXN0IG5hbWVcbiAqIEBhcGlQYXJhbSB7U3RyaW5nfSBbdGV4dF0gRmFjZWJvb2sgbWVzc2FnZSB0ZXh0XG4gKiBAYXBpUGFyYW0ge1N0cmluZ30gW2F0dGFjaG1lbnRzXSBGYWNlYm9vayBtZXNzYWdlIGF0dGFjaG1lbnRzXG4gKi9cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC9mYWNlYm9vaycsIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50ZXh0ICYmICF0aGlzLmJvZHlQYXJhbXMuYXR0YWNobWVudHMpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICghdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtaHViLXNpZ25hdHVyZSddKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19FbmFibGVkJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcjogJ0ludGVncmF0aW9uIGRpc2FibGVkJ1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyB2YWxpZGF0ZSBpZiByZXF1ZXN0IGNvbWUgZnJvbSBvbW5pXG5cdFx0Y29uc3Qgc2lnbmF0dXJlID0gY3J5cHRvLmNyZWF0ZUhtYWMoJ3NoYTEnLCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRmFjZWJvb2tfQVBJX1NlY3JldCcpKS51cGRhdGUoSlNPTi5zdHJpbmdpZnkodGhpcy5yZXF1ZXN0LmJvZHkpKS5kaWdlc3QoJ2hleCcpO1xuXHRcdGlmICh0aGlzLnJlcXVlc3QuaGVhZGVyc1sneC1odWItc2lnbmF0dXJlJ10gIT09IGBzaGExPSR7IHNpZ25hdHVyZSB9YCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRcdGVycm9yOiAnSW52YWxpZCBzaWduYXR1cmUnXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGNvbnN0IHNlbmRNZXNzYWdlID0ge1xuXHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRfaWQ6IHRoaXMuYm9keVBhcmFtcy5taWRcblx0XHRcdH0sXG5cdFx0XHRyb29tSW5mbzoge1xuXHRcdFx0XHRmYWNlYm9vazoge1xuXHRcdFx0XHRcdHBhZ2U6IHRoaXMuYm9keVBhcmFtcy5wYWdlXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHRcdGxldCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0aGlzLmJvZHlQYXJhbXMudG9rZW4pO1xuXHRcdGlmICh2aXNpdG9yKSB7XG5cdFx0XHRjb25zdCByb29tcyA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlWaXNpdG9yVG9rZW4odmlzaXRvci50b2tlbikuZmV0Y2goKTtcblx0XHRcdGlmIChyb29tcyAmJiByb29tcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UucmlkID0gcm9vbXNbMF0uX2lkO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS5yaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdH1cblx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4gPSB2aXNpdG9yLnRva2VuO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLnJpZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS50b2tlbiA9IHRoaXMuYm9keVBhcmFtcy50b2tlbjtcblxuXHRcdFx0Y29uc3QgdXNlcklkID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZWdpc3Rlckd1ZXN0KHtcblx0XHRcdFx0dG9rZW46IHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4sXG5cdFx0XHRcdG5hbWU6IGAkeyB0aGlzLmJvZHlQYXJhbXMuZmlyc3RfbmFtZSB9ICR7IHRoaXMuYm9keVBhcmFtcy5sYXN0X25hbWUgfWBcblx0XHRcdH0pO1xuXG5cdFx0XHR2aXNpdG9yID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkKTtcblx0XHR9XG5cblx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLm1zZyA9IHRoaXMuYm9keVBhcmFtcy50ZXh0O1xuXHRcdHNlbmRNZXNzYWdlLmd1ZXN0ID0gdmlzaXRvcjtcblxuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNlc3M6IHRydWUsXG5cdFx0XHRcdG1lc3NhZ2U6IFJvY2tldENoYXQuTGl2ZWNoYXQuc2VuZE1lc3NhZ2Uoc2VuZE1lc3NhZ2UpXG5cdFx0XHR9O1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVzaW5nIEZhY2Vib29rIC0+JywgZSk7XG5cdFx0fVxuXHR9XG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uLy4uLy4uL3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC9tZXNzYWdlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudmlzaXRvcikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW0gXCJ2aXNpdG9yXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudmlzaXRvci50b2tlbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW0gXCJ2aXNpdG9yLnRva2VuXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZXMpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVzc2FnZXNcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblx0XHRpZiAoISh0aGlzLmJvZHlQYXJhbXMubWVzc2FnZXMgaW5zdGFuY2VvZiBBcnJheSkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVzc2FnZXNcIiBpcyBub3QgYW4gYXJyYXknKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVzc2FnZXNcIiBpcyBlbXB0eScpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZpc2l0b3JUb2tlbiA9IHRoaXMuYm9keVBhcmFtcy52aXNpdG9yLnRva2VuO1xuXG5cdFx0bGV0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHZpc2l0b3JUb2tlbik7XG5cdFx0bGV0IHJpZDtcblx0XHRpZiAodmlzaXRvcikge1xuXHRcdFx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHZpc2l0b3JUb2tlbikuZmV0Y2goKTtcblx0XHRcdGlmIChyb29tcyAmJiByb29tcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHJpZCA9IHJvb21zWzBdLl9pZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJpZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdGNvbnN0IHZpc2l0b3JJZCA9IFJvY2tldENoYXQuTGl2ZWNoYXQucmVnaXN0ZXJHdWVzdCh0aGlzLmJvZHlQYXJhbXMudmlzaXRvcik7XG5cdFx0XHR2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5maW5kT25lQnlJZCh2aXNpdG9ySWQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNlbnRNZXNzYWdlcyA9IHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlcy5tYXAoKG1lc3NhZ2UpID0+IHtcblx0XHRcdGNvbnN0IHNlbmRNZXNzYWdlID0ge1xuXHRcdFx0XHRndWVzdDogdmlzaXRvcixcblx0XHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdFx0cmlkLFxuXHRcdFx0XHRcdHRva2VuOiB2aXNpdG9yVG9rZW4sXG5cdFx0XHRcdFx0bXNnOiBtZXNzYWdlLm1zZ1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0Y29uc3Qgc2VudE1lc3NhZ2UgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LnNlbmRNZXNzYWdlKHNlbmRNZXNzYWdlKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHVzZXJuYW1lOiBzZW50TWVzc2FnZS51LnVzZXJuYW1lLFxuXHRcdFx0XHRtc2c6IHNlbnRNZXNzYWdlLm1zZyxcblx0XHRcdFx0dHM6IHNlbnRNZXNzYWdlLnRzXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXM6IHNlbnRNZXNzYWdlc1xuXHRcdH0pO1xuXHR9XG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uLy4uLy4uL3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC9zbXMtaW5jb21pbmcvOnNlcnZpY2UnLCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgU01TU2VydmljZSA9IFJvY2tldENoYXQuU01TLmdldFNlcnZpY2UodGhpcy51cmxQYXJhbXMuc2VydmljZSk7XG5cblx0XHRjb25zdCBzbXMgPSBTTVNTZXJ2aWNlLnBhcnNlKHRoaXMuYm9keVBhcmFtcyk7XG5cblx0XHRsZXQgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZmluZE9uZVZpc2l0b3JCeVBob25lKHNtcy5mcm9tKTtcblxuXHRcdGNvbnN0IHNlbmRNZXNzYWdlID0ge1xuXHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRfaWQ6IFJhbmRvbS5pZCgpXG5cdFx0XHR9LFxuXHRcdFx0cm9vbUluZm86IHtcblx0XHRcdFx0c21zOiB7XG5cdFx0XHRcdFx0ZnJvbTogc21zLnRvXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0aWYgKHZpc2l0b3IpIHtcblx0XHRcdGNvbnN0IHJvb21zID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeVZpc2l0b3JUb2tlbih2aXNpdG9yLnRva2VuKS5mZXRjaCgpO1xuXG5cdFx0XHRpZiAocm9vbXMgJiYgcm9vbXMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLnJpZCA9IHJvb21zWzBdLl9pZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UucmlkID0gUmFuZG9tLmlkKCk7XG5cdFx0XHR9XG5cdFx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuID0gdmlzaXRvci50b2tlbjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS5yaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4gPSBSYW5kb20uaWQoKTtcblxuXHRcdFx0Y29uc3QgdmlzaXRvcklkID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZWdpc3Rlckd1ZXN0KHtcblx0XHRcdFx0dXNlcm5hbWU6IHNtcy5mcm9tLnJlcGxhY2UoL1teMC05XS9nLCAnJyksXG5cdFx0XHRcdHRva2VuOiBzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuLFxuXHRcdFx0XHRwaG9uZToge1xuXHRcdFx0XHRcdG51bWJlcjogc21zLmZyb21cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVCeUlkKHZpc2l0b3JJZCk7XG5cdFx0fVxuXG5cdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS5tc2cgPSBzbXMuYm9keTtcblx0XHRzZW5kTWVzc2FnZS5ndWVzdCA9IHZpc2l0b3I7XG5cblx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLmF0dGFjaG1lbnRzID0gc21zLm1lZGlhLm1hcChjdXJyID0+IHtcblx0XHRcdGNvbnN0IGF0dGFjaG1lbnQgPSB7XG5cdFx0XHRcdG1lc3NhZ2VfbGluazogY3Vyci51cmxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IGNvbnRlbnRUeXBlID0gY3Vyci5jb250ZW50VHlwZTtcblx0XHRcdHN3aXRjaCAoY29udGVudFR5cGUuc3Vic3RyKDAsIGNvbnRlbnRUeXBlLmluZGV4T2YoJy8nKSkpIHtcblx0XHRcdFx0Y2FzZSAnaW1hZ2UnOlxuXHRcdFx0XHRcdGF0dGFjaG1lbnQuaW1hZ2VfdXJsID0gY3Vyci51cmw7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3ZpZGVvJzpcblx0XHRcdFx0XHRhdHRhY2htZW50LnZpZGVvX3VybCA9IGN1cnIudXJsO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdhdWRpbyc6XG5cdFx0XHRcdFx0YXR0YWNobWVudC5hdWRpb191cmwgPSBjdXJyLnVybDtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGF0dGFjaG1lbnQ7XG5cdFx0fSk7XG5cblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgbWVzc2FnZSA9IFNNU1NlcnZpY2UucmVzcG9uc2UuY2FsbCh0aGlzLCBSb2NrZXRDaGF0LkxpdmVjaGF0LnNlbmRNZXNzYWdlKHNlbmRNZXNzYWdlKSk7XG5cblx0XHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRcdGlmIChzbXMuZXh0cmEpIHtcblx0XHRcdFx0XHRpZiAoc21zLmV4dHJhLmZyb21Db3VudHJ5KSB7XG5cdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnbGl2ZWNoYXQ6c2V0Q3VzdG9tRmllbGQnLCBzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuLCAnY291bnRyeScsIHNtcy5leHRyYS5mcm9tQ291bnRyeSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChzbXMuZXh0cmEuZnJvbVN0YXRlKSB7XG5cdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnbGl2ZWNoYXQ6c2V0Q3VzdG9tRmllbGQnLCBzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuLCAnc3RhdGUnLCBzbXMuZXh0cmEuZnJvbVN0YXRlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHNtcy5leHRyYS5mcm9tQ2l0eSkge1xuXHRcdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ2xpdmVjaGF0OnNldEN1c3RvbUZpZWxkJywgc2VuZE1lc3NhZ2UubWVzc2FnZS50b2tlbiwgJ2NpdHknLCBzbXMuZXh0cmEuZnJvbUNpdHkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBtZXNzYWdlO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBTTVNTZXJ2aWNlLmVycm9yLmNhbGwodGhpcywgZSk7XG5cdFx0fVxuXHR9XG59KTtcbiIsImltcG9ydCBCdXNib3kgZnJvbSAnYnVzYm95JztcbmltcG9ydCBmaWxlc2l6ZSBmcm9tICdmaWxlc2l6ZSc7XG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi8uLi8uLi9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xubGV0IG1heEZpbGVTaXplO1xuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfTWF4RmlsZVNpemUnLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdHRyeSB7XG5cdFx0bWF4RmlsZVNpemUgPSBwYXJzZUludCh2YWx1ZSk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRtYXhGaWxlU2l6ZSA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmVCeUlkKCdGaWxlVXBsb2FkX01heEZpbGVTaXplJykucGFja2FnZVZhbHVlO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L3VwbG9hZC86cmlkJywge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtdmlzaXRvci10b2tlbiddKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdmlzaXRvclRva2VuID0gdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtdmlzaXRvci10b2tlbiddO1xuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHZpc2l0b3JUb2tlbik7XG5cblx0XHRpZiAoIXZpc2l0b3IpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZU9wZW5CeVZpc2l0b3JUb2tlbih2aXNpdG9yVG9rZW4sIHRoaXMudXJsUGFyYW1zLnJpZCk7XG5cdFx0aWYgKCFyb29tKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgYnVzYm95ID0gbmV3IEJ1c2JveSh7IGhlYWRlcnM6IHRoaXMucmVxdWVzdC5oZWFkZXJzIH0pO1xuXHRcdGNvbnN0IGZpbGVzID0gW107XG5cdFx0Y29uc3QgZmllbGRzID0ge307XG5cblx0XHRNZXRlb3Iud3JhcEFzeW5jKChjYWxsYmFjaykgPT4ge1xuXHRcdFx0YnVzYm95Lm9uKCdmaWxlJywgKGZpZWxkbmFtZSwgZmlsZSwgZmlsZW5hbWUsIGVuY29kaW5nLCBtaW1ldHlwZSkgPT4ge1xuXHRcdFx0XHRpZiAoZmllbGRuYW1lICE9PSAnZmlsZScpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmlsZXMucHVzaChuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLWZpZWxkJykpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgZmlsZURhdGUgPSBbXTtcblx0XHRcdFx0ZmlsZS5vbignZGF0YScsIGRhdGEgPT4gZmlsZURhdGUucHVzaChkYXRhKSk7XG5cblx0XHRcdFx0ZmlsZS5vbignZW5kJywgKCkgPT4ge1xuXHRcdFx0XHRcdGZpbGVzLnB1c2goeyBmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUsIGZpbGVCdWZmZXI6IEJ1ZmZlci5jb25jYXQoZmlsZURhdGUpIH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHRidXNib3kub24oJ2ZpZWxkJywgKGZpZWxkbmFtZSwgdmFsdWUpID0+IGZpZWxkc1tmaWVsZG5hbWVdID0gdmFsdWUpO1xuXG5cdFx0XHRidXNib3kub24oJ2ZpbmlzaCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4gY2FsbGJhY2soKSkpO1xuXG5cdFx0XHR0aGlzLnJlcXVlc3QucGlwZShidXNib3kpO1xuXHRcdH0pKCk7XG5cblx0XHRpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnRmlsZSByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGlmIChmaWxlcy5sZW5ndGggPiAxKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSnVzdCAxIGZpbGUgaXMgYWxsb3dlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbGUgPSBmaWxlc1swXTtcblxuXHRcdGlmICghUm9ja2V0Q2hhdC5maWxlVXBsb2FkSXNWYWxpZENvbnRlbnRUeXBlKGZpbGUubWltZXR5cGUpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSh7XG5cdFx0XHRcdHJlYXNvbjogJ2Vycm9yLXR5cGUtbm90LWFsbG93ZWQnXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyAtMSBtYXhGaWxlU2l6ZSBtZWFucyB0aGVyZSBpcyBubyBsaW1pdFxuXHRcdGlmIChtYXhGaWxlU2l6ZSA+IC0xICYmIGZpbGUuZmlsZUJ1ZmZlci5sZW5ndGggPiBtYXhGaWxlU2l6ZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoe1xuXHRcdFx0XHRyZWFzb246ICdlcnJvci1zaXplLW5vdC1hbGxvd2VkJyxcblx0XHRcdFx0c2l6ZUFsbG93ZWQ6IGZpbGVzaXplKG1heEZpbGVTaXplKVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlsZVN0b3JlID0gRmlsZVVwbG9hZC5nZXRTdG9yZSgnVXBsb2FkcycpO1xuXG5cdFx0Y29uc3QgZGV0YWlscyA9IHtcblx0XHRcdG5hbWU6IGZpbGUuZmlsZW5hbWUsXG5cdFx0XHRzaXplOiBmaWxlLmZpbGVCdWZmZXIubGVuZ3RoLFxuXHRcdFx0dHlwZTogZmlsZS5taW1ldHlwZSxcblx0XHRcdHJpZDogdGhpcy51cmxQYXJhbXMucmlkLFxuXHRcdFx0dmlzaXRvclRva2VuXG5cdFx0fTtcblxuXHRcdGNvbnN0IHVwbG9hZGVkRmlsZSA9IE1ldGVvci53cmFwQXN5bmMoZmlsZVN0b3JlLmluc2VydC5iaW5kKGZpbGVTdG9yZSkpKGRldGFpbHMsIGZpbGUuZmlsZUJ1ZmZlcik7XG5cblx0XHR1cGxvYWRlZEZpbGUuZGVzY3JpcHRpb24gPSBmaWVsZHMuZGVzY3JpcHRpb247XG5cblx0XHRkZWxldGUgZmllbGRzLmRlc2NyaXB0aW9uO1xuXHRcdFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoTWV0ZW9yLmNhbGwoJ3NlbmRGaWxlTGl2ZWNoYXRNZXNzYWdlJywgdGhpcy51cmxQYXJhbXMucmlkLCB2aXNpdG9yVG9rZW4sIHVwbG9hZGVkRmlsZSwgZmllbGRzKSk7XG5cdH1cbn0pO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC91c2Vycy86dHlwZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0dHlwZTogU3RyaW5nXG5cdFx0XHR9KTtcblxuXHRcdFx0bGV0IHJvbGU7XG5cdFx0XHRpZiAodGhpcy51cmxQYXJhbXMudHlwZSA9PT0gJ2FnZW50Jykge1xuXHRcdFx0XHRyb2xlID0gJ2xpdmVjaGF0LWFnZW50Jztcblx0XHRcdH0gZWxzZSBpZiAodGhpcy51cmxQYXJhbXMudHlwZSA9PT0gJ21hbmFnZXInKSB7XG5cdFx0XHRcdHJvbGUgPSAnbGl2ZWNoYXQtbWFuYWdlcic7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyAnSW52YWxpZCB0eXBlJztcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdXNlcnMgPSBSb2NrZXRDaGF0LmF1dGh6LmdldFVzZXJzSW5Sb2xlKHJvbGUpO1xuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdHVzZXJzOiB1c2Vycy5mZXRjaCgpLm1hcCh1c2VyID0+IF8ucGljayh1c2VyLCAnX2lkJywgJ3VzZXJuYW1lJywgJ25hbWUnLCAnc3RhdHVzJywgJ3N0YXR1c0xpdmVjaGF0JykpXG5cdFx0XHR9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLmVycm9yKTtcblx0XHR9XG5cdH0sXG5cdHBvc3QoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0dHlwZTogU3RyaW5nXG5cdFx0XHR9KTtcblxuXHRcdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRcdHVzZXJuYW1lOiBTdHJpbmdcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAodGhpcy51cmxQYXJhbXMudHlwZSA9PT0gJ2FnZW50Jykge1xuXHRcdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5hZGRBZ2VudCh0aGlzLmJvZHlQYXJhbXMudXNlcm5hbWUpO1xuXHRcdFx0XHRpZiAodXNlcikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdXNlciB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh0aGlzLnVybFBhcmFtcy50eXBlID09PSAnbWFuYWdlcicpIHtcblx0XHRcdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQuTGl2ZWNoYXQuYWRkTWFuYWdlcih0aGlzLmJvZHlQYXJhbXMudXNlcm5hbWUpO1xuXHRcdFx0XHRpZiAodXNlcikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdXNlciB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgJ0ludmFsaWQgdHlwZSc7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L3VzZXJzLzp0eXBlLzpfaWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMudXJsUGFyYW1zLCB7XG5cdFx0XHRcdHR5cGU6IFN0cmluZyxcblx0XHRcdFx0X2lkOiBTdHJpbmdcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodGhpcy51cmxQYXJhbXMuX2lkKTtcblxuXHRcdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdVc2VyIG5vdCBmb3VuZCcpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgcm9sZTtcblxuXHRcdFx0aWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdhZ2VudCcpIHtcblx0XHRcdFx0cm9sZSA9ICdsaXZlY2hhdC1hZ2VudCc7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdtYW5hZ2VyJykge1xuXHRcdFx0XHRyb2xlID0gJ2xpdmVjaGF0LW1hbmFnZXInO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgJ0ludmFsaWQgdHlwZSc7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh1c2VyLnJvbGVzLmluZGV4T2Yocm9sZSkgIT09IC0xKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHR1c2VyOiBfLnBpY2sodXNlciwgJ19pZCcsICd1c2VybmFtZScpXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdHVzZXI6IG51bGxcblx0XHRcdH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUuZXJyb3IpO1xuXHRcdH1cblx0fSxcblx0ZGVsZXRlKCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0dHlwZTogU3RyaW5nLFxuXHRcdFx0XHRfaWQ6IFN0cmluZ1xuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVybFBhcmFtcy5faWQpO1xuXG5cdFx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdhZ2VudCcpIHtcblx0XHRcdFx0aWYgKFJvY2tldENoYXQuTGl2ZWNoYXQucmVtb3ZlQWdlbnQodXNlci51c2VybmFtZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdtYW5hZ2VyJykge1xuXHRcdFx0XHRpZiAoUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZW1vdmVNYW5hZ2VyKHVzZXIudXNlcm5hbWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgJ0ludmFsaWQgdHlwZSc7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9XG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uLy4uLy4uL3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC92aXNpdG9yLzp2aXNpdG9yVG9rZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odGhpcy51cmxQYXJhbXMudmlzaXRvclRva2VuKTtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh2aXNpdG9yKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC92aXNpdG9yLzp2aXNpdG9yVG9rZW4vcm9vbScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tcyA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlWaXNpdG9yVG9rZW4odGhpcy51cmxQYXJhbXMudmlzaXRvclRva2VuLCB7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0bmFtZTogMSxcblx0XHRcdFx0dDogMSxcblx0XHRcdFx0Y2w6IDEsXG5cdFx0XHRcdHU6IDEsXG5cdFx0XHRcdHVzZXJuYW1lczogMSxcblx0XHRcdFx0c2VydmVkQnk6IDFcblx0XHRcdH1cblx0XHR9KS5mZXRjaCgpO1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgcm9vbXMgfSk7XG5cdH1cbn0pO1xuIl19
