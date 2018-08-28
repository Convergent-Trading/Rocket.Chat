(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:irc":{"server":{"irc.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc.js                                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Bridge;
module.watch(require("./irc-bridge"), {
  default(v) {
    Bridge = v;
  }

}, 0);

if (!!RocketChat.settings.get('IRC_Enabled') === true) {
  // Normalize the config values
  const config = {
    server: {
      protocol: RocketChat.settings.get('IRC_Protocol'),
      host: RocketChat.settings.get('IRC_Host'),
      port: RocketChat.settings.get('IRC_Port'),
      name: RocketChat.settings.get('IRC_Name'),
      description: RocketChat.settings.get('IRC_Description')
    },
    passwords: {
      local: RocketChat.settings.get('IRC_Local_Password'),
      peer: RocketChat.settings.get('IRC_Peer_Password')
    }
  };
  Meteor.ircBridge = new Bridge(config);
  Meteor.startup(() => {
    Meteor.ircBridge.init();
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods":{"resetIrcConnection.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/methods/resetIrcConnection.js                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Bridge;
module.watch(require("../irc-bridge"), {
  default(v) {
    Bridge = v;
  }

}, 0);
Meteor.methods({
  resetIrcConnection() {
    const ircEnabled = !!RocketChat.settings.get('IRC_Enabled') === true;

    if (Meteor.ircBridge) {
      Meteor.ircBridge.stop();

      if (!ircEnabled) {
        return {
          message: 'Connection_Closed',
          params: []
        };
      }
    }

    if (ircEnabled) {
      if (Meteor.ircBridge) {
        Meteor.ircBridge.init();
        return {
          message: 'Connection_Reset',
          params: []
        };
      } // Normalize the config values


      const config = {
        server: {
          protocol: RocketChat.settings.get('IRC_Protocol'),
          host: RocketChat.settings.get('IRC_Host'),
          port: RocketChat.settings.get('IRC_Port'),
          name: RocketChat.settings.get('IRC_Name'),
          description: RocketChat.settings.get('IRC_Description')
        },
        passwords: {
          local: RocketChat.settings.get('IRC_Local_Password'),
          peer: RocketChat.settings.get('IRC_Peer_Password')
        }
      };
      Meteor.ircBridge = new Bridge(config);
      Meteor.ircBridge.init();
      return {
        message: 'Connection_Reset',
        params: []
      };
    }

    throw new Meteor.Error(t('IRC_Federation_Disabled'));
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"irc-settings.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-settings.js                                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.startup(function () {
  RocketChat.settings.addGroup('IRC_Federation', function () {
    this.add('IRC_Enabled', false, {
      type: 'boolean',
      i18nLabel: 'Enabled',
      i18nDescription: 'IRC_Enabled',
      alert: 'IRC_Enabled_Alert'
    });
    this.add('IRC_Protocol', 'RFC2813', {
      type: 'select',
      i18nLabel: 'Protocol',
      i18nDescription: 'IRC_Protocol',
      values: [{
        key: 'RFC2813',
        i18nLabel: 'RFC2813'
      }]
    });
    this.add('IRC_Host', 'localhost', {
      type: 'string',
      i18nLabel: 'Host',
      i18nDescription: 'IRC_Host'
    });
    this.add('IRC_Port', 6667, {
      type: 'int',
      i18nLabel: 'Port',
      i18nDescription: 'IRC_Port'
    });
    this.add('IRC_Name', 'irc.rocket.chat', {
      type: 'string',
      i18nLabel: 'Name',
      i18nDescription: 'IRC_Name'
    });
    this.add('IRC_Description', 'Rocket.Chat IRC Bridge', {
      type: 'string',
      i18nLabel: 'Description',
      i18nDescription: 'IRC_Description'
    });
    this.add('IRC_Local_Password', 'password', {
      type: 'string',
      i18nLabel: 'Local_Password',
      i18nDescription: 'IRC_Local_Password'
    });
    this.add('IRC_Peer_Password', 'password', {
      type: 'string',
      i18nLabel: 'Peer_Password',
      i18nDescription: 'IRC_Peer_Password'
    });
    this.add('IRC_Reset_Connection', 'resetIrcConnection', {
      type: 'action',
      actionText: 'Reset_Connection',
      i18nLabel: 'Reset_Connection'
    });
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"irc-bridge":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/index.js                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Queue;
module.watch(require("queue-fifo"), {
  default(v) {
    Queue = v;
  }

}, 0);
let servers;
module.watch(require("../servers"), {
  "*"(v) {
    servers = v;
  }

}, 1);
let peerCommandHandlers;
module.watch(require("./peerHandlers"), {
  "*"(v) {
    peerCommandHandlers = v;
  }

}, 2);
let localCommandHandlers;
module.watch(require("./localHandlers"), {
  "*"(v) {
    localCommandHandlers = v;
  }

}, 3);

class Bridge {
  constructor(config) {
    // General
    this.config = config; // Workaround for Rocket.Chat callbacks being called multiple times

    this.loggedInUsers = []; // Server

    const Server = servers[this.config.server.protocol];
    this.server = new Server(this.config);
    this.setupPeerHandlers();
    this.setupLocalHandlers(); // Command queue

    this.queue = new Queue();
    this.queueTimeout = 5;
  }

  init() {
    this.loggedInUsers = [];
    this.server.register();
    this.server.on('registered', () => {
      this.logQueue('Starting...');
      this.runQueue();
    });
  }

  stop() {
    this.server.disconnect();
  }
  /**
   * Log helper
   */


  log(message) {
    console.log(`[irc][bridge] ${message}`);
  }

  logQueue(message) {
    console.log(`[irc][bridge][queue] ${message}`);
  }
  /**
   *
   *
   * Queue
   *
   *
   */


  onMessageReceived(from, command, ...parameters) {
    this.queue.enqueue({
      from,
      command,
      parameters
    });
  }

  runQueue() {
    return Promise.asyncApply(() => {
      // If it is empty, skip and keep the queue going
      if (this.queue.isEmpty()) {
        return setTimeout(this.runQueue.bind(this), this.queueTimeout);
      } // Get the command


      const item = this.queue.dequeue();
      this.logQueue(`Processing "${item.command}" command from "${item.from}"`); // Handle the command accordingly

      switch (item.from) {
        case 'local':
          if (!localCommandHandlers[item.command]) {
            throw new Error(`Could not find handler for local:${item.command}`);
          }

          Promise.await(localCommandHandlers[item.command].apply(this, item.parameters));
          break;

        case 'peer':
          if (!peerCommandHandlers[item.command]) {
            throw new Error(`Could not find handler for peer:${item.command}`);
          }

          Promise.await(peerCommandHandlers[item.command].apply(this, item.parameters));
          break;
      } // Keep the queue going


      setTimeout(this.runQueue.bind(this), this.queueTimeout);
    });
  }
  /**
   *
   *
   * Peer
   *
   *
   */


  setupPeerHandlers() {
    this.server.on('peerCommand', cmd => {
      this.onMessageReceived('peer', cmd.identifier, cmd.args);
    });
  }
  /**
   *
   *
   * Local
   *
   *
   */


  setupLocalHandlers() {
    // Auth
    RocketChat.callbacks.add('afterValidateLogin', this.onMessageReceived.bind(this, 'local', 'onLogin'), RocketChat.callbacks.priority.LOW, 'irc-on-login');
    RocketChat.callbacks.add('afterCreateUser', this.onMessageReceived.bind(this, 'local', 'onCreateUser'), RocketChat.callbacks.priority.LOW, 'irc-on-create-user'); // Joining rooms or channels

    RocketChat.callbacks.add('afterCreateChannel', this.onMessageReceived.bind(this, 'local', 'onCreateRoom'), RocketChat.callbacks.priority.LOW, 'irc-on-create-channel');
    RocketChat.callbacks.add('afterCreateRoom', this.onMessageReceived.bind(this, 'local', 'onCreateRoom'), RocketChat.callbacks.priority.LOW, 'irc-on-create-room');
    RocketChat.callbacks.add('afterJoinRoom', this.onMessageReceived.bind(this, 'local', 'onJoinRoom'), RocketChat.callbacks.priority.LOW, 'irc-on-join-room'); // Leaving rooms or channels

    RocketChat.callbacks.add('afterLeaveRoom', this.onMessageReceived.bind(this, 'local', 'onLeaveRoom'), RocketChat.callbacks.priority.LOW, 'irc-on-leave-room'); // Chatting

    RocketChat.callbacks.add('afterSaveMessage', this.onMessageReceived.bind(this, 'local', 'onSaveMessage'), RocketChat.callbacks.priority.LOW, 'irc-on-save-message'); // Leaving

    RocketChat.callbacks.add('afterLogoutCleanUp', this.onMessageReceived.bind(this, 'local', 'onLogout'), RocketChat.callbacks.priority.LOW, 'irc-on-logout');
  }

  sendCommand(command, parameters) {
    this.server.emit('onReceiveFromLocal', command, parameters);
  }

}

module.exportDefault(Bridge);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"localHandlers":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/index.js                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  onCreateRoom: () => onCreateRoom,
  onJoinRoom: () => onJoinRoom,
  onLeaveRoom: () => onLeaveRoom,
  onLogin: () => onLogin,
  onLogout: () => onLogout,
  onSaveMessage: () => onSaveMessage,
  onCreateUser: () => onCreateUser
});
let onCreateRoom;
module.watch(require("./onCreateRoom"), {
  default(v) {
    onCreateRoom = v;
  }

}, 0);
let onJoinRoom;
module.watch(require("./onJoinRoom"), {
  default(v) {
    onJoinRoom = v;
  }

}, 1);
let onLeaveRoom;
module.watch(require("./onLeaveRoom"), {
  default(v) {
    onLeaveRoom = v;
  }

}, 2);
let onLogin;
module.watch(require("./onLogin"), {
  default(v) {
    onLogin = v;
  }

}, 3);
let onLogout;
module.watch(require("./onLogout"), {
  default(v) {
    onLogout = v;
  }

}, 4);
let onSaveMessage;
module.watch(require("./onSaveMessage"), {
  default(v) {
    onSaveMessage = v;
  }

}, 5);
let onCreateUser;
module.watch(require("./onCreateUser"), {
  default(v) {
    onCreateUser = v;
  }

}, 6);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onCreateRoom.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onCreateRoom.js                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnCreateRoom
});

function handleOnCreateRoom(user, room) {
  if (!room.usernames) {
    return this.log(`Room ${room.name} does not have a valid list of usernames`);
  }

  for (const username of room.usernames) {
    const user = RocketChat.models.Users.findOne({
      username
    });

    if (user.profile.irc.fromIRC) {
      this.sendCommand('joinChannel', {
        room,
        user
      });
    } else {
      this.sendCommand('joinedChannel', {
        room,
        user
      });
    }
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onCreateUser.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onCreateUser.js                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnCreateUser
});

function handleOnCreateUser(newUser) {
  if (!newUser) {
    return this.log('Invalid handleOnCreateUser call');
  }

  if (!newUser.username) {
    return this.log('Invalid handleOnCreateUser call (Missing username)');
  }

  if (this.loggedInUsers.indexOf(newUser._id) !== -1) {
    return this.log('Duplicate handleOnCreateUser call');
  }

  this.loggedInUsers.push(newUser._id);
  Meteor.users.update({
    _id: newUser._id
  }, {
    $set: {
      'profile.irc.fromIRC': false,
      'profile.irc.username': `${newUser.username}-rkt`,
      'profile.irc.nick': `${newUser.username}-rkt`,
      'profile.irc.hostname': 'rocket.chat'
    }
  });
  const user = RocketChat.models.Users.findOne({
    _id: newUser._id
  });
  this.sendCommand('registerUser', user);
  const rooms = RocketChat.models.Rooms.findWithUsername(user.username).fetch();
  rooms.forEach(room => this.sendCommand('joinedChannel', {
    room,
    user
  }));
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onJoinRoom.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onJoinRoom.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnJoinRoom
});

function handleOnJoinRoom(user, room) {
  this.sendCommand('joinedChannel', {
    room,
    user
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onLeaveRoom.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onLeaveRoom.js                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnLeaveRoom
});

function handleOnLeaveRoom(user, room) {
  this.sendCommand('leftChannel', {
    room,
    user
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onLogin.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onLogin.js                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnLogin
});

function handleOnLogin(login) {
  if (login.user === null) {
    return this.log('Invalid handleOnLogin call');
  }

  if (!login.user.username) {
    return this.log('Invalid handleOnLogin call (Missing username)');
  }

  if (this.loggedInUsers.indexOf(login.user._id) !== -1) {
    return this.log('Duplicate handleOnLogin call');
  }

  this.loggedInUsers.push(login.user._id);
  Meteor.users.update({
    _id: login.user._id
  }, {
    $set: {
      'profile.irc.fromIRC': false,
      'profile.irc.username': `${login.user.username}-rkt`,
      'profile.irc.nick': `${login.user.username}-rkt`,
      'profile.irc.hostname': 'rocket.chat'
    }
  });
  const user = RocketChat.models.Users.findOne({
    _id: login.user._id
  });
  this.sendCommand('registerUser', user);
  const rooms = RocketChat.models.Rooms.findWithUsername(user.username).fetch();
  rooms.forEach(room => this.sendCommand('joinedChannel', {
    room,
    user
  }));
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onLogout.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onLogout.js                                              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnLogout
});

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

function handleOnLogout(user) {
  this.loggedInUsers = _.without(this.loggedInUsers, user._id);
  this.sendCommand('disconnected', {
    user
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onSaveMessage.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onSaveMessage.js                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnSaveMessage
});

function handleOnSaveMessage(message, to) {
  let toIdentification = ''; // Direct message

  if (to.t === 'd') {
    const subscriptions = RocketChat.models.Subscriptions.findByRoomId(to._id);
    subscriptions.forEach(subscription => {
      if (subscription.u.username !== to.username) {
        const userData = RocketChat.models.Users.findOne({
          username: subscription.u.username
        });

        if (userData) {
          if (userData.profile && userData.profile.irc && userData.profile.irc.nick) {
            toIdentification = userData.profile.irc.nick;
          } else {
            toIdentification = userData.username;
          }
        } else {
          toIdentification = subscription.u.username;
        }
      }
    });

    if (!toIdentification) {
      console.error('[irc][server] Target user not found');
      return;
    }
  } else {
    toIdentification = `#${to.name}`;
  }

  const user = RocketChat.models.Users.findOne({
    _id: message.u._id
  });
  this.sendCommand('sentMessage', {
    to: toIdentification,
    user,
    message: message.msg
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"peerHandlers":{"disconnected.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/disconnected.js                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleQUIT
});

function handleQUIT(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });
  Meteor.users.update({
    _id: user._id
  }, {
    $set: {
      status: 'offline'
    }
  });
  RocketChat.models.Rooms.removeUsernameFromAll(user.username);
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/index.js                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  disconnected: () => disconnected,
  joinedChannel: () => joinedChannel,
  leftChannel: () => leftChannel,
  nickChanged: () => nickChanged,
  sentMessage: () => sentMessage,
  userRegistered: () => userRegistered
});
let disconnected;
module.watch(require("./disconnected"), {
  default(v) {
    disconnected = v;
  }

}, 0);
let joinedChannel;
module.watch(require("./joinedChannel"), {
  default(v) {
    joinedChannel = v;
  }

}, 1);
let leftChannel;
module.watch(require("./leftChannel"), {
  default(v) {
    leftChannel = v;
  }

}, 2);
let nickChanged;
module.watch(require("./nickChanged"), {
  default(v) {
    nickChanged = v;
  }

}, 3);
let sentMessage;
module.watch(require("./sentMessage"), {
  default(v) {
    sentMessage = v;
  }

}, 4);
let userRegistered;
module.watch(require("./userRegistered"), {
  default(v) {
    userRegistered = v;
  }

}, 5);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"joinedChannel.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/joinedChannel.js                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleJoinedChannel
});

function handleJoinedChannel(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });

  if (!user) {
    throw new Error(`Could not find a user with nick ${args.nick}`);
  }

  let room = RocketChat.models.Rooms.findOneByName(args.roomName);

  if (!room) {
    const createdRoom = RocketChat.createRoom('c', args.roomName, user.username, []);
    room = RocketChat.models.Rooms.findOne({
      _id: createdRoom.rid
    });
    this.log(`${user.username} created room ${args.roomName}`);
  } else {
    RocketChat.addUserToRoom(room._id, user);
    this.log(`${user.username} joined room ${room.name}`);
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"leftChannel.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/leftChannel.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleLeftChannel
});

function handleLeftChannel(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });

  if (!user) {
    throw new Error(`Could not find a user with nick ${args.nick}`);
  }

  const room = RocketChat.models.Rooms.findOneByName(args.roomName);

  if (!room) {
    throw new Error(`Could not find a room with name ${args.roomName}`);
  }

  this.log(`${user.username} left room ${room.name}`);
  RocketChat.removeUserFromRoom(room._id, user);
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"nickChanged.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/nickChanged.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleNickChanged
});

function handleNickChanged(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });

  if (!user) {
    throw new Error(`Could not find an user with nick ${args.nick}`);
  }

  this.log(`${user.username} changed nick: ${args.nick} -> ${args.newNick}`); // Update on the database

  RocketChat.models.Users.update({
    _id: user._id
  }, {
    $set: {
      name: args.newNick,
      'profile.irc.nick': args.newNick
    }
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sentMessage.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/sentMessage.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleSentMessage
});

/*
 *
 * Get direct chat room helper
 *
 *
 */
const getDirectRoom = (source, target) => {
  const rid = [source._id, target._id].sort().join('');
  RocketChat.models.Rooms.upsert({
    _id: rid
  }, {
    $set: {
      usernames: [source.username, target.username]
    },
    $setOnInsert: {
      t: 'd',
      msgs: 0,
      ts: new Date()
    }
  });
  RocketChat.models.Subscriptions.upsert({
    rid,
    'u._id': target._id
  }, {
    $setOnInsert: {
      name: source.username,
      t: 'd',
      open: false,
      alert: false,
      unread: 0,
      u: {
        _id: target._id,
        username: target.username
      }
    }
  });
  RocketChat.models.Subscriptions.upsert({
    rid,
    'u._id': source._id
  }, {
    $setOnInsert: {
      name: target.username,
      t: 'd',
      open: false,
      alert: false,
      unread: 0,
      u: {
        _id: source._id,
        username: source.username
      }
    }
  });
  return {
    _id: rid,
    t: 'd'
  };
};

function handleSentMessage(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });

  if (!user) {
    throw new Error(`Could not find a user with nick ${args.nick}`);
  }

  let room;

  if (args.roomName) {
    room = RocketChat.models.Rooms.findOneByName(args.roomName);
  } else {
    const recipientUser = RocketChat.models.Users.findOne({
      'profile.irc.nick': args.recipientNick
    });
    room = getDirectRoom(user, recipientUser);
  }

  const message = {
    msg: args.message,
    ts: new Date()
  };
  RocketChat.sendMessage(user, message, room);
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"userRegistered.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/userRegistered.js                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleUserRegistered
});

function handleUserRegistered(args) {
  return Promise.asyncApply(() => {
    // Check if there is an user with the given username
    let user = RocketChat.models.Users.findOne({
      'profile.irc.username': args.username
    }); // If there is no user, create one...

    if (!user) {
      this.log(`Registering ${args.username} with nick: ${args.nick}`);
      const userToInsert = {
        name: args.nick,
        username: `${args.username}-irc`,
        status: 'online',
        utcOffset: 0,
        active: true,
        type: 'user',
        profile: {
          irc: {
            fromIRC: true,
            nick: args.nick,
            username: args.username,
            hostname: args.hostname
          }
        }
      };
      user = RocketChat.models.Users.create(userToInsert);
    } else {
      // ...otherwise, log the user in and update the information
      this.log(`Logging in ${args.username} with nick: ${args.nick}`);
      Meteor.users.update({
        _id: user._id
      }, {
        $set: {
          status: 'online',
          'profile.irc.nick': args.nick,
          'profile.irc.username': args.username,
          'profile.irc.hostname': args.hostname
        }
      });
    }
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"servers":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/index.js                                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  RFC2813: () => RFC2813
});
let RFC2813;
module.watch(require("./RFC2813"), {
  default(v) {
    RFC2813 = v;
  }

}, 0);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"RFC2813":{"codes.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/codes.js                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/**
 * This file is part of https://github.com/martynsmith/node-irc
 * by https://github.com/martynsmith
 */
module.exports = {
  '001': {
    name: 'rpl_welcome',
    type: 'reply'
  },
  '002': {
    name: 'rpl_yourhost',
    type: 'reply'
  },
  '003': {
    name: 'rpl_created',
    type: 'reply'
  },
  '004': {
    name: 'rpl_myinfo',
    type: 'reply'
  },
  '005': {
    name: 'rpl_isupport',
    type: 'reply'
  },
  200: {
    name: 'rpl_tracelink',
    type: 'reply'
  },
  201: {
    name: 'rpl_traceconnecting',
    type: 'reply'
  },
  202: {
    name: 'rpl_tracehandshake',
    type: 'reply'
  },
  203: {
    name: 'rpl_traceunknown',
    type: 'reply'
  },
  204: {
    name: 'rpl_traceoperator',
    type: 'reply'
  },
  205: {
    name: 'rpl_traceuser',
    type: 'reply'
  },
  206: {
    name: 'rpl_traceserver',
    type: 'reply'
  },
  208: {
    name: 'rpl_tracenewtype',
    type: 'reply'
  },
  211: {
    name: 'rpl_statslinkinfo',
    type: 'reply'
  },
  212: {
    name: 'rpl_statscommands',
    type: 'reply'
  },
  213: {
    name: 'rpl_statscline',
    type: 'reply'
  },
  214: {
    name: 'rpl_statsnline',
    type: 'reply'
  },
  215: {
    name: 'rpl_statsiline',
    type: 'reply'
  },
  216: {
    name: 'rpl_statskline',
    type: 'reply'
  },
  218: {
    name: 'rpl_statsyline',
    type: 'reply'
  },
  219: {
    name: 'rpl_endofstats',
    type: 'reply'
  },
  221: {
    name: 'rpl_umodeis',
    type: 'reply'
  },
  241: {
    name: 'rpl_statslline',
    type: 'reply'
  },
  242: {
    name: 'rpl_statsuptime',
    type: 'reply'
  },
  243: {
    name: 'rpl_statsoline',
    type: 'reply'
  },
  244: {
    name: 'rpl_statshline',
    type: 'reply'
  },
  250: {
    name: 'rpl_statsconn',
    type: 'reply'
  },
  251: {
    name: 'rpl_luserclient',
    type: 'reply'
  },
  252: {
    name: 'rpl_luserop',
    type: 'reply'
  },
  253: {
    name: 'rpl_luserunknown',
    type: 'reply'
  },
  254: {
    name: 'rpl_luserchannels',
    type: 'reply'
  },
  255: {
    name: 'rpl_luserme',
    type: 'reply'
  },
  256: {
    name: 'rpl_adminme',
    type: 'reply'
  },
  257: {
    name: 'rpl_adminloc1',
    type: 'reply'
  },
  258: {
    name: 'rpl_adminloc2',
    type: 'reply'
  },
  259: {
    name: 'rpl_adminemail',
    type: 'reply'
  },
  261: {
    name: 'rpl_tracelog',
    type: 'reply'
  },
  265: {
    name: 'rpl_localusers',
    type: 'reply'
  },
  266: {
    name: 'rpl_globalusers',
    type: 'reply'
  },
  300: {
    name: 'rpl_none',
    type: 'reply'
  },
  301: {
    name: 'rpl_away',
    type: 'reply'
  },
  302: {
    name: 'rpl_userhost',
    type: 'reply'
  },
  303: {
    name: 'rpl_ison',
    type: 'reply'
  },
  305: {
    name: 'rpl_unaway',
    type: 'reply'
  },
  306: {
    name: 'rpl_nowaway',
    type: 'reply'
  },
  311: {
    name: 'rpl_whoisuser',
    type: 'reply'
  },
  312: {
    name: 'rpl_whoisserver',
    type: 'reply'
  },
  313: {
    name: 'rpl_whoisoperator',
    type: 'reply'
  },
  314: {
    name: 'rpl_whowasuser',
    type: 'reply'
  },
  315: {
    name: 'rpl_endofwho',
    type: 'reply'
  },
  317: {
    name: 'rpl_whoisidle',
    type: 'reply'
  },
  318: {
    name: 'rpl_endofwhois',
    type: 'reply'
  },
  319: {
    name: 'rpl_whoischannels',
    type: 'reply'
  },
  321: {
    name: 'rpl_liststart',
    type: 'reply'
  },
  322: {
    name: 'rpl_list',
    type: 'reply'
  },
  323: {
    name: 'rpl_listend',
    type: 'reply'
  },
  324: {
    name: 'rpl_channelmodeis',
    type: 'reply'
  },
  329: {
    name: 'rpl_creationtime',
    type: 'reply'
  },
  331: {
    name: 'rpl_notopic',
    type: 'reply'
  },
  332: {
    name: 'rpl_topic',
    type: 'reply'
  },
  333: {
    name: 'rpl_topicwhotime',
    type: 'reply'
  },
  341: {
    name: 'rpl_inviting',
    type: 'reply'
  },
  342: {
    name: 'rpl_summoning',
    type: 'reply'
  },
  351: {
    name: 'rpl_version',
    type: 'reply'
  },
  352: {
    name: 'rpl_whoreply',
    type: 'reply'
  },
  353: {
    name: 'rpl_namreply',
    type: 'reply'
  },
  364: {
    name: 'rpl_links',
    type: 'reply'
  },
  365: {
    name: 'rpl_endoflinks',
    type: 'reply'
  },
  366: {
    name: 'rpl_endofnames',
    type: 'reply'
  },
  367: {
    name: 'rpl_banlist',
    type: 'reply'
  },
  368: {
    name: 'rpl_endofbanlist',
    type: 'reply'
  },
  369: {
    name: 'rpl_endofwhowas',
    type: 'reply'
  },
  371: {
    name: 'rpl_info',
    type: 'reply'
  },
  372: {
    name: 'rpl_motd',
    type: 'reply'
  },
  374: {
    name: 'rpl_endofinfo',
    type: 'reply'
  },
  375: {
    name: 'rpl_motdstart',
    type: 'reply'
  },
  376: {
    name: 'rpl_endofmotd',
    type: 'reply'
  },
  381: {
    name: 'rpl_youreoper',
    type: 'reply'
  },
  382: {
    name: 'rpl_rehashing',
    type: 'reply'
  },
  391: {
    name: 'rpl_time',
    type: 'reply'
  },
  392: {
    name: 'rpl_usersstart',
    type: 'reply'
  },
  393: {
    name: 'rpl_users',
    type: 'reply'
  },
  394: {
    name: 'rpl_endofusers',
    type: 'reply'
  },
  395: {
    name: 'rpl_nousers',
    type: 'reply'
  },
  401: {
    name: 'err_nosuchnick',
    type: 'error'
  },
  402: {
    name: 'err_nosuchserver',
    type: 'error'
  },
  403: {
    name: 'err_nosuchchannel',
    type: 'error'
  },
  404: {
    name: 'err_cannotsendtochan',
    type: 'error'
  },
  405: {
    name: 'err_toomanychannels',
    type: 'error'
  },
  406: {
    name: 'err_wasnosuchnick',
    type: 'error'
  },
  407: {
    name: 'err_toomanytargets',
    type: 'error'
  },
  409: {
    name: 'err_noorigin',
    type: 'error'
  },
  411: {
    name: 'err_norecipient',
    type: 'error'
  },
  412: {
    name: 'err_notexttosend',
    type: 'error'
  },
  413: {
    name: 'err_notoplevel',
    type: 'error'
  },
  414: {
    name: 'err_wildtoplevel',
    type: 'error'
  },
  421: {
    name: 'err_unknowncommand',
    type: 'error'
  },
  422: {
    name: 'err_nomotd',
    type: 'error'
  },
  423: {
    name: 'err_noadmininfo',
    type: 'error'
  },
  424: {
    name: 'err_fileerror',
    type: 'error'
  },
  431: {
    name: 'err_nonicknamegiven',
    type: 'error'
  },
  432: {
    name: 'err_erroneusnickname',
    type: 'error'
  },
  433: {
    name: 'err_nicknameinuse',
    type: 'error'
  },
  436: {
    name: 'err_nickcollision',
    type: 'error'
  },
  441: {
    name: 'err_usernotinchannel',
    type: 'error'
  },
  442: {
    name: 'err_notonchannel',
    type: 'error'
  },
  443: {
    name: 'err_useronchannel',
    type: 'error'
  },
  444: {
    name: 'err_nologin',
    type: 'error'
  },
  445: {
    name: 'err_summondisabled',
    type: 'error'
  },
  446: {
    name: 'err_usersdisabled',
    type: 'error'
  },
  451: {
    name: 'err_notregistered',
    type: 'error'
  },
  461: {
    name: 'err_needmoreparams',
    type: 'error'
  },
  462: {
    name: 'err_alreadyregistred',
    type: 'error'
  },
  463: {
    name: 'err_nopermforhost',
    type: 'error'
  },
  464: {
    name: 'err_passwdmismatch',
    type: 'error'
  },
  465: {
    name: 'err_yourebannedcreep',
    type: 'error'
  },
  467: {
    name: 'err_keyset',
    type: 'error'
  },
  471: {
    name: 'err_channelisfull',
    type: 'error'
  },
  472: {
    name: 'err_unknownmode',
    type: 'error'
  },
  473: {
    name: 'err_inviteonlychan',
    type: 'error'
  },
  474: {
    name: 'err_bannedfromchan',
    type: 'error'
  },
  475: {
    name: 'err_badchannelkey',
    type: 'error'
  },
  481: {
    name: 'err_noprivileges',
    type: 'error'
  },
  482: {
    name: 'err_chanoprivsneeded',
    type: 'error'
  },
  483: {
    name: 'err_cantkillserver',
    type: 'error'
  },
  491: {
    name: 'err_nooperhost',
    type: 'error'
  },
  501: {
    name: 'err_umodeunknownflag',
    type: 'error'
  },
  502: {
    name: 'err_usersdontmatch',
    type: 'error'
  }
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/index.js                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let net;
module.watch(require("net"), {
  default(v) {
    net = v;
  }

}, 0);
let util;
module.watch(require("util"), {
  default(v) {
    util = v;
  }

}, 1);
let EventEmitter;
module.watch(require("events"), {
  EventEmitter(v) {
    EventEmitter = v;
  }

}, 2);
let parseMessage;
module.watch(require("./parseMessage"), {
  default(v) {
    parseMessage = v;
  }

}, 3);
let peerCommandHandlers;
module.watch(require("./peerCommandHandlers"), {
  default(v) {
    peerCommandHandlers = v;
  }

}, 4);
let localCommandHandlers;
module.watch(require("./localCommandHandlers"), {
  default(v) {
    localCommandHandlers = v;
  }

}, 5);

class RFC2813 {
  constructor(config) {
    this.config = config; // Hold registered state

    this.registerSteps = [];
    this.isRegistered = false; // Hold peer server information

    this.serverPrefix = null; // Hold the buffer while receiving

    this.receiveBuffer = new Buffer('');
  }
  /**
   * Setup socket
   */


  setupSocket() {
    // Setup socket
    this.socket = new net.Socket();
    this.socket.setNoDelay();
    this.socket.setEncoding('utf-8');
    this.socket.setKeepAlive(true);
    this.socket.setTimeout(90000);
    this.socket.on('data', this.onReceiveFromPeer.bind(this));
    this.socket.on('connect', this.onConnect.bind(this));
    this.socket.on('error', err => console.log('[irc][server][err]', err));
    this.socket.on('timeout', () => this.log('Timeout'));
    this.socket.on('close', () => this.log('Connection Closed')); // Setup local

    this.on('onReceiveFromLocal', this.onReceiveFromLocal.bind(this));
  }
  /**
   * Log helper
   */


  log(message) {
    console.log(`[irc][server] ${message}`);
  }
  /**
   * Connect
   */


  register() {
    this.log(`Connecting to @${this.config.server.host}:${this.config.server.port}`);

    if (!this.socket) {
      this.setupSocket();
    }

    this.socket.connect(this.config.server.port, this.config.server.host);
  }
  /**
   * Disconnect
   */


  disconnect() {
    this.log('Disconnecting from server.');

    if (this.socket) {
      this.socket.destroy();
      this.socket = undefined;
    }

    this.isRegistered = false;
    this.registerSteps = [];
  }
  /**
   * Setup the server connection
   */


  onConnect() {
    this.log('Connected! Registering as server...');
    this.write({
      command: 'PASS',
      parameters: [this.config.passwords.local, '0210', 'ngircd']
    });
    this.write({
      command: 'SERVER',
      parameters: [this.config.server.name],
      trailer: this.config.server.description
    });
  }
  /**
   * Sends a command message through the socket
   */


  write(command) {
    let buffer = command.prefix ? `:${command.prefix} ` : '';
    buffer += command.command;

    if (command.parameters && command.parameters.length > 0) {
      buffer += ` ${command.parameters.join(' ')}`;
    }

    if (command.trailer) {
      buffer += ` :${command.trailer}`;
    }

    this.log(`Sending Command: ${buffer}`);
    return this.socket.write(`${buffer}\r\n`);
  }
  /**
   *
   *
   * Peer message handling
   *
   *
   */


  onReceiveFromPeer(chunk) {
    if (typeof chunk === 'string') {
      this.receiveBuffer += chunk;
    } else {
      this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);
    }

    const lines = this.receiveBuffer.toString().split(/\r\n|\r|\n|\u0007/); // eslint-disable-line no-control-regex
    // If the buffer does not end with \r\n, more chunks are coming

    if (lines.pop()) {
      return;
    } // Reset the buffer


    this.receiveBuffer = new Buffer('');
    lines.forEach(line => {
      if (line.length && !line.startsWith('\a')) {
        const parsedMessage = parseMessage(line);

        if (peerCommandHandlers[parsedMessage.command]) {
          this.log(`Handling peer message: ${line}`);
          const command = peerCommandHandlers[parsedMessage.command].call(this, parsedMessage);

          if (command) {
            this.log(`Emitting peer command to local: ${JSON.stringify(command)}`);
            this.emit('peerCommand', command);
          }
        } else {
          this.log(`Unhandled peer message: ${JSON.stringify(parsedMessage)}`);
        }
      }
    });
  }
  /**
   *
   *
   * Local message handling
   *
   *
   */


  onReceiveFromLocal(command, parameters) {
    if (localCommandHandlers[command]) {
      this.log(`Handling local command: ${command}`);
      localCommandHandlers[command].call(this, parameters);
    } else {
      this.log(`Unhandled local command: ${JSON.stringify(command)}`);
    }
  }

}

util.inherits(RFC2813, EventEmitter);
module.exportDefault(RFC2813);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"localCommandHandlers.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/localCommandHandlers.js                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
function registerUser(parameters) {
  const {
    name,
    profile: {
      irc: {
        nick,
        username
      }
    }
  } = parameters;
  this.write({
    prefix: this.config.server.name,
    command: 'NICK',
    parameters: [nick, 1, username, 'irc.rocket.chat', 1, '+i'],
    trailer: name
  });
}

function joinChannel(parameters) {
  const {
    room: {
      name: roomName
    },
    user: {
      profile: {
        irc: {
          nick
        }
      }
    }
  } = parameters;
  this.write({
    prefix: this.config.server.name,
    command: 'NJOIN',
    parameters: [`#${roomName}`],
    trailer: nick
  });
}

function joinedChannel(parameters) {
  const {
    room: {
      name: roomName
    },
    user: {
      profile: {
        irc: {
          nick
        }
      }
    }
  } = parameters;
  this.write({
    prefix: nick,
    command: 'JOIN',
    parameters: [`#${roomName}`]
  });
}

function leftChannel(parameters) {
  const {
    room: {
      name: roomName
    },
    user: {
      profile: {
        irc: {
          nick
        }
      }
    }
  } = parameters;
  this.write({
    prefix: nick,
    command: 'PART',
    parameters: [`#${roomName}`]
  });
}

function sentMessage(parameters) {
  const {
    user: {
      profile: {
        irc: {
          nick
        }
      }
    },
    to,
    message
  } = parameters;
  this.write({
    prefix: nick,
    command: 'PRIVMSG',
    parameters: [to],
    trailer: message
  });
}

function disconnected(parameters) {
  const {
    user: {
      profile: {
        irc: {
          nick
        }
      }
    }
  } = parameters;
  this.write({
    prefix: nick,
    command: 'QUIT'
  });
}

module.exportDefault({
  registerUser,
  joinChannel,
  joinedChannel,
  leftChannel,
  sentMessage,
  disconnected
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"parseMessage.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/parseMessage.js                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/**
 * This file is part of https://github.com/martynsmith/node-irc
 * by https://github.com/martynsmith
 */
const replyFor = require('./codes');
/**
 * parseMessage(line, stripColors)
 *
 * takes a raw "line" from the IRC server and turns it into an object with
 * useful keys
 * @param {String} line Raw message from IRC server.
 * @return {Object} A parsed message object.
 */


module.exports = function parseMessage(line) {
  const message = {};
  let match; // Parse prefix

  match = line.match(/^:([^ ]+) +/);

  if (match) {
    message.prefix = match[1];
    line = line.replace(/^:[^ ]+ +/, '');
    match = message.prefix.match(/^([_a-zA-Z0-9\~\[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/);

    if (match) {
      message.nick = match[1];
      message.user = match[3];
      message.host = match[4];
    } else {
      message.server = message.prefix;
    }
  } // Parse command


  match = line.match(/^([^ ]+) */);
  message.command = match[1];
  message.rawCommand = match[1];
  message.commandType = 'normal';
  line = line.replace(/^[^ ]+ +/, '');

  if (replyFor[message.rawCommand]) {
    message.command = replyFor[message.rawCommand].name;
    message.commandType = replyFor[message.rawCommand].type;
  }

  message.args = [];
  let middle;
  let trailing; // Parse parameters

  if (line.search(/^:|\s+:/) !== -1) {
    match = line.match(/(.*?)(?:^:|\s+:)(.*)/);
    middle = match[1].trimRight();
    trailing = match[2];
  } else {
    middle = line;
  }

  if (middle.length) {
    message.args = middle.split(/ +/);
  }

  if (typeof trailing !== 'undefined' && trailing.length) {
    message.args.push(trailing);
  }

  return message;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"peerCommandHandlers.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/peerCommandHandlers.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
function PASS() {
  this.log('Received PASS command, continue registering...');
  this.registerSteps.push('PASS');
}

function SERVER(parsedMessage) {
  this.log('Received SERVER command, waiting for first PING...');
  this.serverPrefix = parsedMessage.prefix;
  this.registerSteps.push('SERVER');
}

function PING() {
  if (!this.isRegistered && this.registerSteps.length === 2) {
    this.log('Received first PING command, server is registered!');
    this.isRegistered = true;
    this.emit('registered');
  }

  this.write({
    prefix: this.config.server.name,
    command: 'PONG',
    parameters: [this.config.server.name]
  });
}

function NICK(parsedMessage) {
  let command; // Check if the message comes from the server,
  // which means it is a new user

  if (parsedMessage.prefix === this.serverPrefix) {
    command = {
      identifier: 'userRegistered',
      args: {
        nick: parsedMessage.args[0],
        username: parsedMessage.args[2],
        host: parsedMessage.args[3],
        name: parsedMessage.args[6]
      }
    };
  } else {
    // Otherwise, it is a nick change
    command = {
      identifier: 'nickChanged',
      args: {
        nick: parsedMessage.nick,
        newNick: parsedMessage.args[0]
      }
    };
  }

  return command;
}

function JOIN(parsedMessage) {
  const command = {
    identifier: 'joinedChannel',
    args: {
      roomName: parsedMessage.args[0].substring(1),
      nick: parsedMessage.prefix
    }
  };
  return command;
}

function PART(parsedMessage) {
  const command = {
    identifier: 'leftChannel',
    args: {
      roomName: parsedMessage.args[0].substring(1),
      nick: parsedMessage.prefix
    }
  };
  return command;
}

function PRIVMSG(parsedMessage) {
  const command = {
    identifier: 'sentMessage',
    args: {
      nick: parsedMessage.prefix,
      message: parsedMessage.args[1]
    }
  };

  if (parsedMessage.args[0][0] === '#') {
    command.args.roomName = parsedMessage.args[0].substring(1);
  } else {
    command.args.recipientNick = parsedMessage.args[0];
  }

  return command;
}

function QUIT(parsedMessage) {
  const command = {
    identifier: 'disconnected',
    args: {
      nick: parsedMessage.prefix
    }
  };
  return command;
}

module.exportDefault({
  PASS,
  SERVER,
  PING,
  NICK,
  JOIN,
  PART,
  PRIVMSG,
  QUIT
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"node_modules":{"queue-fifo":{"package.json":function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/rocketchat_irc/node_modules/queue-fifo/package.json                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
exports.name = "queue-fifo";
exports.version = "0.2.4";
exports.main = "index.js";

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/rocketchat_irc/node_modules/queue-fifo/index.js                                              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/**
 * @fileOverview Implementation of a queue (FIFO) data structure
 * @author Jason S. Jones
 * @license MIT
 */

(function() {
    'use strict';

    /***********************************************************
     * Queue Data Structure
     *
     * This is a 'queue' data structure that implements the notion
     * of a 'First in First Out', or FIFO, protocol.  The underlying data
     * structure is a doubly linked list.  This linked list data structure
     * does all the heavy lifting, enabling this implementation to be a
     * simple wrapper around the linked list to leverage the applicable
     * methods and properties.  This provides a very clean and simple
     * implementation for this queue data structure.
     *
     ***********************************************************/

    // bring in the one dependency which will be the underlying
    // data structure for this queue implementation
    var LinkedList = require('dbly-linked-list');

    /**
     * Creates a new queue instance and initializes the underlying data
     * structure
     *
     * @constructor
     */
    function Queue() {
        this._list = new LinkedList();
    }

    /* Functions attached to the Queue prototype.  All queue instances
     * will share these methods, meaning there will NOT be copies made for each
     * instance.  This will be a huge memory savings since there may be several
     * different queue instances.
     */
    Queue.prototype = {

        /**
         * Determines if the queue is empty
         *
         * @returns {boolean} true if the queue is empty, false otherwise
         */
        isEmpty: function() {
            return this._list.isEmpty();
        },

        /**
         * Returns the size, or number of items in the queue
         *
         * @returns {number} the number of items in the queue
         */
        size: function() {
            return this._list.getSize();
        },

        /**
         * Clears the queue of all data
         */
        clear: function () {
            return this._list.clear();
        },

        /**
         * Adds a new item containing 'data' to the back of the queue
         *
         * @param {object} data the data to add to the back of the queue
         */
        enqueue: function (data) {
            return this._list.insert(data);
        },

        /**
         * Removes the item from the front of the queue
         *
         * @returns {object} the item, or data, from the front of the queue
         */
        dequeue: function () {
            return this._list.removeFirst().getData();
        },

        /**
         * Returns the data of the item at the front of the queue,
         * but does not remove it
         *
         * @returns {object} the item, or data, from the top of the stack
         */
        peek: function () {
            return this._list.getHeadNode().getData();
        }
    };

    // export the constructor fn to make it available for use outside
    // this file
    module.exports = Queue;
}());

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:irc/server/irc.js");
require("/node_modules/meteor/rocketchat:irc/server/methods/resetIrcConnection.js");
require("/node_modules/meteor/rocketchat:irc/server/irc-settings.js");

/* Exports */
Package._define("rocketchat:irc");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_irc.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL21ldGhvZHMvcmVzZXRJcmNDb25uZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLXNldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvbG9jYWxIYW5kbGVycy9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvbG9jYWxIYW5kbGVycy9vbkNyZWF0ZVJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL2xvY2FsSGFuZGxlcnMvb25DcmVhdGVVc2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9sb2NhbEhhbmRsZXJzL29uSm9pblJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL2xvY2FsSGFuZGxlcnMvb25MZWF2ZVJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL2xvY2FsSGFuZGxlcnMvb25Mb2dpbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvbG9jYWxIYW5kbGVycy9vbkxvZ291dC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvbG9jYWxIYW5kbGVycy9vblNhdmVNZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9wZWVySGFuZGxlcnMvZGlzY29ubmVjdGVkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9wZWVySGFuZGxlcnMvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL3BlZXJIYW5kbGVycy9qb2luZWRDaGFubmVsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9wZWVySGFuZGxlcnMvbGVmdENoYW5uZWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL3BlZXJIYW5kbGVycy9uaWNrQ2hhbmdlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvcGVlckhhbmRsZXJzL3NlbnRNZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9wZWVySGFuZGxlcnMvdXNlclJlZ2lzdGVyZWQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9zZXJ2ZXJzL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvc2VydmVycy9SRkMyODEzL2NvZGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvc2VydmVycy9SRkMyODEzL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvc2VydmVycy9SRkMyODEzL2xvY2FsQ29tbWFuZEhhbmRsZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvc2VydmVycy9SRkMyODEzL3BhcnNlTWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL3NlcnZlcnMvUkZDMjgxMy9wZWVyQ29tbWFuZEhhbmRsZXJzLmpzIl0sIm5hbWVzIjpbIkJyaWRnZSIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiUm9ja2V0Q2hhdCIsInNldHRpbmdzIiwiZ2V0IiwiY29uZmlnIiwic2VydmVyIiwicHJvdG9jb2wiLCJob3N0IiwicG9ydCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsInBhc3N3b3JkcyIsImxvY2FsIiwicGVlciIsIk1ldGVvciIsImlyY0JyaWRnZSIsInN0YXJ0dXAiLCJpbml0IiwibWV0aG9kcyIsInJlc2V0SXJjQ29ubmVjdGlvbiIsImlyY0VuYWJsZWQiLCJzdG9wIiwibWVzc2FnZSIsInBhcmFtcyIsIkVycm9yIiwidCIsImFkZEdyb3VwIiwiYWRkIiwidHlwZSIsImkxOG5MYWJlbCIsImkxOG5EZXNjcmlwdGlvbiIsImFsZXJ0IiwidmFsdWVzIiwia2V5IiwiYWN0aW9uVGV4dCIsIlF1ZXVlIiwic2VydmVycyIsInBlZXJDb21tYW5kSGFuZGxlcnMiLCJsb2NhbENvbW1hbmRIYW5kbGVycyIsImNvbnN0cnVjdG9yIiwibG9nZ2VkSW5Vc2VycyIsIlNlcnZlciIsInNldHVwUGVlckhhbmRsZXJzIiwic2V0dXBMb2NhbEhhbmRsZXJzIiwicXVldWUiLCJxdWV1ZVRpbWVvdXQiLCJyZWdpc3RlciIsIm9uIiwibG9nUXVldWUiLCJydW5RdWV1ZSIsImRpc2Nvbm5lY3QiLCJsb2ciLCJjb25zb2xlIiwib25NZXNzYWdlUmVjZWl2ZWQiLCJmcm9tIiwiY29tbWFuZCIsInBhcmFtZXRlcnMiLCJlbnF1ZXVlIiwiaXNFbXB0eSIsInNldFRpbWVvdXQiLCJiaW5kIiwiaXRlbSIsImRlcXVldWUiLCJhcHBseSIsImNtZCIsImlkZW50aWZpZXIiLCJhcmdzIiwiY2FsbGJhY2tzIiwicHJpb3JpdHkiLCJMT1ciLCJzZW5kQ29tbWFuZCIsImVtaXQiLCJleHBvcnREZWZhdWx0IiwiZXhwb3J0Iiwib25DcmVhdGVSb29tIiwib25Kb2luUm9vbSIsIm9uTGVhdmVSb29tIiwib25Mb2dpbiIsIm9uTG9nb3V0Iiwib25TYXZlTWVzc2FnZSIsIm9uQ3JlYXRlVXNlciIsImhhbmRsZU9uQ3JlYXRlUm9vbSIsInVzZXIiLCJyb29tIiwidXNlcm5hbWVzIiwidXNlcm5hbWUiLCJtb2RlbHMiLCJVc2VycyIsImZpbmRPbmUiLCJwcm9maWxlIiwiaXJjIiwiZnJvbUlSQyIsImhhbmRsZU9uQ3JlYXRlVXNlciIsIm5ld1VzZXIiLCJpbmRleE9mIiwiX2lkIiwicHVzaCIsInVzZXJzIiwidXBkYXRlIiwiJHNldCIsInJvb21zIiwiUm9vbXMiLCJmaW5kV2l0aFVzZXJuYW1lIiwiZmV0Y2giLCJmb3JFYWNoIiwiaGFuZGxlT25Kb2luUm9vbSIsImhhbmRsZU9uTGVhdmVSb29tIiwiaGFuZGxlT25Mb2dpbiIsImxvZ2luIiwiaGFuZGxlT25Mb2dvdXQiLCJfIiwid2l0aG91dCIsImhhbmRsZU9uU2F2ZU1lc3NhZ2UiLCJ0byIsInRvSWRlbnRpZmljYXRpb24iLCJzdWJzY3JpcHRpb25zIiwiU3Vic2NyaXB0aW9ucyIsImZpbmRCeVJvb21JZCIsInN1YnNjcmlwdGlvbiIsInUiLCJ1c2VyRGF0YSIsIm5pY2siLCJlcnJvciIsIm1zZyIsImhhbmRsZVFVSVQiLCJzdGF0dXMiLCJyZW1vdmVVc2VybmFtZUZyb21BbGwiLCJkaXNjb25uZWN0ZWQiLCJqb2luZWRDaGFubmVsIiwibGVmdENoYW5uZWwiLCJuaWNrQ2hhbmdlZCIsInNlbnRNZXNzYWdlIiwidXNlclJlZ2lzdGVyZWQiLCJoYW5kbGVKb2luZWRDaGFubmVsIiwiZmluZE9uZUJ5TmFtZSIsInJvb21OYW1lIiwiY3JlYXRlZFJvb20iLCJjcmVhdGVSb29tIiwicmlkIiwiYWRkVXNlclRvUm9vbSIsImhhbmRsZUxlZnRDaGFubmVsIiwicmVtb3ZlVXNlckZyb21Sb29tIiwiaGFuZGxlTmlja0NoYW5nZWQiLCJuZXdOaWNrIiwiaGFuZGxlU2VudE1lc3NhZ2UiLCJnZXREaXJlY3RSb29tIiwic291cmNlIiwidGFyZ2V0Iiwic29ydCIsImpvaW4iLCJ1cHNlcnQiLCIkc2V0T25JbnNlcnQiLCJtc2dzIiwidHMiLCJEYXRlIiwib3BlbiIsInVucmVhZCIsInJlY2lwaWVudFVzZXIiLCJyZWNpcGllbnROaWNrIiwic2VuZE1lc3NhZ2UiLCJoYW5kbGVVc2VyUmVnaXN0ZXJlZCIsInVzZXJUb0luc2VydCIsInV0Y09mZnNldCIsImFjdGl2ZSIsImhvc3RuYW1lIiwiY3JlYXRlIiwiUkZDMjgxMyIsImV4cG9ydHMiLCJuZXQiLCJ1dGlsIiwiRXZlbnRFbWl0dGVyIiwicGFyc2VNZXNzYWdlIiwicmVnaXN0ZXJTdGVwcyIsImlzUmVnaXN0ZXJlZCIsInNlcnZlclByZWZpeCIsInJlY2VpdmVCdWZmZXIiLCJCdWZmZXIiLCJzZXR1cFNvY2tldCIsInNvY2tldCIsIlNvY2tldCIsInNldE5vRGVsYXkiLCJzZXRFbmNvZGluZyIsInNldEtlZXBBbGl2ZSIsIm9uUmVjZWl2ZUZyb21QZWVyIiwib25Db25uZWN0IiwiZXJyIiwib25SZWNlaXZlRnJvbUxvY2FsIiwiY29ubmVjdCIsImRlc3Ryb3kiLCJ1bmRlZmluZWQiLCJ3cml0ZSIsInRyYWlsZXIiLCJidWZmZXIiLCJwcmVmaXgiLCJsZW5ndGgiLCJjaHVuayIsImNvbmNhdCIsImxpbmVzIiwidG9TdHJpbmciLCJzcGxpdCIsInBvcCIsImxpbmUiLCJzdGFydHNXaXRoIiwicGFyc2VkTWVzc2FnZSIsImNhbGwiLCJKU09OIiwic3RyaW5naWZ5IiwiaW5oZXJpdHMiLCJyZWdpc3RlclVzZXIiLCJqb2luQ2hhbm5lbCIsInJlcGx5Rm9yIiwibWF0Y2giLCJyZXBsYWNlIiwicmF3Q29tbWFuZCIsImNvbW1hbmRUeXBlIiwibWlkZGxlIiwidHJhaWxpbmciLCJzZWFyY2giLCJ0cmltUmlnaHQiLCJQQVNTIiwiU0VSVkVSIiwiUElORyIsIk5JQ0siLCJKT0lOIiwic3Vic3RyaW5nIiwiUEFSVCIsIlBSSVZNU0ciLCJRVUlUIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLE1BQUo7QUFBV0MsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGNBQVIsQ0FBYixFQUFxQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0wsYUFBT0ssQ0FBUDtBQUFTOztBQUFyQixDQUFyQyxFQUE0RCxDQUE1RDs7QUFFWCxJQUFJLENBQUMsQ0FBQ0MsV0FBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0IsYUFBeEIsQ0FBRixLQUE2QyxJQUFqRCxFQUF1RDtBQUN0RDtBQUNBLFFBQU1DLFNBQVM7QUFDZEMsWUFBUTtBQUNQQyxnQkFBVUwsV0FBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0IsY0FBeEIsQ0FESDtBQUVQSSxZQUFNTixXQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3QixVQUF4QixDQUZDO0FBR1BLLFlBQU1QLFdBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLFVBQXhCLENBSEM7QUFJUE0sWUFBTVIsV0FBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0IsVUFBeEIsQ0FKQztBQUtQTyxtQkFBYVQsV0FBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0IsaUJBQXhCO0FBTE4sS0FETTtBQVFkUSxlQUFXO0FBQ1ZDLGFBQU9YLFdBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLG9CQUF4QixDQURHO0FBRVZVLFlBQU1aLFdBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENB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QXhCO0FBQ0EsR0FGRCxNQUVPO0FBQ056SyxZQUFRVyxJQUFSLENBQWE0RixhQUFiLEdBQTZCNkMsY0FBY3pJLElBQWQsQ0FBbUIsQ0FBbkIsQ0FBN0I7QUFDQTs7QUFFRCxTQUFPWCxPQUFQO0FBQ0E7O0FBRUQsU0FBUzRLLElBQVQsQ0FBY3hCLGFBQWQsRUFBNkI7QUFDNUIsUUFBTXBKLFVBQVU7QUFDZlUsZ0JBQVksY0FERztBQUVmQyxVQUFNO0FBQ0x1RCxZQUFNa0YsY0FBY1Y7QUFEZjtBQUZTLEdBQWhCO0FBT0EsU0FBTzFJLE9BQVA7QUFDQTs7QUE3R0QzRCxPQUFPNEUsYUFBUCxDQStHZTtBQUFFbUosTUFBRjtBQUFRQyxRQUFSO0FBQWdCQyxNQUFoQjtBQUFzQkMsTUFBdEI7QUFBNEJDLE1BQTVCO0FBQWtDRSxNQUFsQztBQUF3Q0MsU0FBeEM7QUFBaURDO0FBQWpELENBL0dmLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfaXJjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEJyaWRnZSBmcm9tICcuL2lyYy1icmlkZ2UnO1xuXG5pZiAoISFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX0VuYWJsZWQnKSA9PT0gdHJ1ZSkge1xuXHQvLyBOb3JtYWxpemUgdGhlIGNvbmZpZyB2YWx1ZXNcblx0Y29uc3QgY29uZmlnID0ge1xuXHRcdHNlcnZlcjoge1xuXHRcdFx0cHJvdG9jb2w6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdJUkNfUHJvdG9jb2wnKSxcblx0XHRcdGhvc3Q6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdJUkNfSG9zdCcpLFxuXHRcdFx0cG9ydDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19Qb3J0JyksXG5cdFx0XHRuYW1lOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX05hbWUnKSxcblx0XHRcdGRlc2NyaXB0aW9uOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX0Rlc2NyaXB0aW9uJyksXG5cdFx0fSxcblx0XHRwYXNzd29yZHM6IHtcblx0XHRcdGxvY2FsOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX0xvY2FsX1Bhc3N3b3JkJyksXG5cdFx0XHRwZWVyOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX1BlZXJfUGFzc3dvcmQnKSxcblx0XHR9LFxuXHR9O1xuXG5cdE1ldGVvci5pcmNCcmlkZ2UgPSBuZXcgQnJpZGdlKGNvbmZpZyk7XG5cblx0TWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuXHRcdE1ldGVvci5pcmNCcmlkZ2UuaW5pdCgpO1xuXHR9KTtcbn1cbiIsImltcG9ydCBCcmlkZ2UgZnJvbSAnLi4vaXJjLWJyaWRnZSc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0cmVzZXRJcmNDb25uZWN0aW9uKCkge1xuXHRcdGNvbnN0IGlyY0VuYWJsZWQgPSAoISFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX0VuYWJsZWQnKSkgPT09IHRydWU7XG5cblx0XHRpZiAoTWV0ZW9yLmlyY0JyaWRnZSkge1xuXHRcdFx0TWV0ZW9yLmlyY0JyaWRnZS5zdG9wKCk7XG5cdFx0XHRpZiAoIWlyY0VuYWJsZWQpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRtZXNzYWdlOiAnQ29ubmVjdGlvbl9DbG9zZWQnLFxuXHRcdFx0XHRcdHBhcmFtczogW10sXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGlyY0VuYWJsZWQpIHtcblx0XHRcdGlmIChNZXRlb3IuaXJjQnJpZGdlKSB7XG5cdFx0XHRcdE1ldGVvci5pcmNCcmlkZ2UuaW5pdCgpO1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdG1lc3NhZ2U6ICdDb25uZWN0aW9uX1Jlc2V0Jyxcblx0XHRcdFx0XHRwYXJhbXM6IFtdLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBOb3JtYWxpemUgdGhlIGNvbmZpZyB2YWx1ZXNcblx0XHRcdGNvbnN0IGNvbmZpZyA9IHtcblx0XHRcdFx0c2VydmVyOiB7XG5cdFx0XHRcdFx0cHJvdG9jb2w6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdJUkNfUHJvdG9jb2wnKSxcblx0XHRcdFx0XHRob3N0OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX0hvc3QnKSxcblx0XHRcdFx0XHRwb3J0OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX1BvcnQnKSxcblx0XHRcdFx0XHRuYW1lOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX05hbWUnKSxcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19EZXNjcmlwdGlvbicpLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRwYXNzd29yZHM6IHtcblx0XHRcdFx0XHRsb2NhbDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19Mb2NhbF9QYXNzd29yZCcpLFxuXHRcdFx0XHRcdHBlZXI6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdJUkNfUGVlcl9QYXNzd29yZCcpLFxuXHRcdFx0XHR9LFxuXHRcdFx0fTtcblxuXHRcdFx0TWV0ZW9yLmlyY0JyaWRnZSA9IG5ldyBCcmlkZ2UoY29uZmlnKTtcblx0XHRcdE1ldGVvci5pcmNCcmlkZ2UuaW5pdCgpO1xuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRtZXNzYWdlOiAnQ29ubmVjdGlvbl9SZXNldCcsXG5cdFx0XHRcdHBhcmFtczogW10sXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IodCgnSVJDX0ZlZGVyYXRpb25fRGlzYWJsZWQnKSk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdJUkNfRmVkZXJhdGlvbicsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdJUkNfRW5hYmxlZCcsIGZhbHNlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRpMThuTGFiZWw6ICdFbmFibGVkJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0lSQ19FbmFibGVkJyxcblx0XHRcdGFsZXJ0OiAnSVJDX0VuYWJsZWRfQWxlcnQnLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ0lSQ19Qcm90b2NvbCcsICdSRkMyODEzJywge1xuXHRcdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0XHRpMThuTGFiZWw6ICdQcm90b2NvbCcsXG5cdFx0XHRpMThuRGVzY3JpcHRpb246ICdJUkNfUHJvdG9jb2wnLFxuXHRcdFx0dmFsdWVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRrZXk6ICdSRkMyODEzJyxcblx0XHRcdFx0XHRpMThuTGFiZWw6ICdSRkMyODEzJyxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnSVJDX0hvc3QnLCAnbG9jYWxob3N0Jywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRpMThuTGFiZWw6ICdIb3N0Jyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0lSQ19Ib3N0Jyxcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkKCdJUkNfUG9ydCcsIDY2NjcsIHtcblx0XHRcdHR5cGU6ICdpbnQnLFxuXHRcdFx0aTE4bkxhYmVsOiAnUG9ydCcsXG5cdFx0XHRpMThuRGVzY3JpcHRpb246ICdJUkNfUG9ydCcsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnSVJDX05hbWUnLCAnaXJjLnJvY2tldC5jaGF0Jywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRpMThuTGFiZWw6ICdOYW1lJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0lSQ19OYW1lJyxcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkKCdJUkNfRGVzY3JpcHRpb24nLCAnUm9ja2V0LkNoYXQgSVJDIEJyaWRnZScsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0aTE4bkxhYmVsOiAnRGVzY3JpcHRpb24nLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnSVJDX0Rlc2NyaXB0aW9uJyxcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkKCdJUkNfTG9jYWxfUGFzc3dvcmQnLCAncGFzc3dvcmQnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGkxOG5MYWJlbDogJ0xvY2FsX1Bhc3N3b3JkJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0lSQ19Mb2NhbF9QYXNzd29yZCcsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnSVJDX1BlZXJfUGFzc3dvcmQnLCAncGFzc3dvcmQnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGkxOG5MYWJlbDogJ1BlZXJfUGFzc3dvcmQnLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnSVJDX1BlZXJfUGFzc3dvcmQnLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ0lSQ19SZXNldF9Db25uZWN0aW9uJywgJ3Jlc2V0SXJjQ29ubmVjdGlvbicsIHtcblx0XHRcdHR5cGU6ICdhY3Rpb24nLFxuXHRcdFx0YWN0aW9uVGV4dDogJ1Jlc2V0X0Nvbm5lY3Rpb24nLFxuXHRcdFx0aTE4bkxhYmVsOiAnUmVzZXRfQ29ubmVjdGlvbicsXG5cdFx0fSk7XG5cdH0pO1xufSk7XG4iLCJpbXBvcnQgUXVldWUgZnJvbSAncXVldWUtZmlmbyc7XG5pbXBvcnQgKiBhcyBzZXJ2ZXJzIGZyb20gJy4uL3NlcnZlcnMnO1xuaW1wb3J0ICogYXMgcGVlckNvbW1hbmRIYW5kbGVycyBmcm9tICcuL3BlZXJIYW5kbGVycyc7XG5pbXBvcnQgKiBhcyBsb2NhbENvbW1hbmRIYW5kbGVycyBmcm9tICcuL2xvY2FsSGFuZGxlcnMnO1xuXG5jbGFzcyBCcmlkZ2Uge1xuXHRjb25zdHJ1Y3Rvcihjb25maWcpIHtcblx0XHQvLyBHZW5lcmFsXG5cdFx0dGhpcy5jb25maWcgPSBjb25maWc7XG5cblx0XHQvLyBXb3JrYXJvdW5kIGZvciBSb2NrZXQuQ2hhdCBjYWxsYmFja3MgYmVpbmcgY2FsbGVkIG11bHRpcGxlIHRpbWVzXG5cdFx0dGhpcy5sb2dnZWRJblVzZXJzID0gW107XG5cblx0XHQvLyBTZXJ2ZXJcblx0XHRjb25zdCBTZXJ2ZXIgPSBzZXJ2ZXJzW3RoaXMuY29uZmlnLnNlcnZlci5wcm90b2NvbF07XG5cblx0XHR0aGlzLnNlcnZlciA9IG5ldyBTZXJ2ZXIodGhpcy5jb25maWcpO1xuXG5cdFx0dGhpcy5zZXR1cFBlZXJIYW5kbGVycygpO1xuXHRcdHRoaXMuc2V0dXBMb2NhbEhhbmRsZXJzKCk7XG5cblx0XHQvLyBDb21tYW5kIHF1ZXVlXG5cdFx0dGhpcy5xdWV1ZSA9IG5ldyBRdWV1ZSgpO1xuXHRcdHRoaXMucXVldWVUaW1lb3V0ID0gNTtcblx0fVxuXG5cdGluaXQoKSB7XG5cdFx0dGhpcy5sb2dnZWRJblVzZXJzID0gW107XG5cdFx0dGhpcy5zZXJ2ZXIucmVnaXN0ZXIoKTtcblxuXHRcdHRoaXMuc2VydmVyLm9uKCdyZWdpc3RlcmVkJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5sb2dRdWV1ZSgnU3RhcnRpbmcuLi4nKTtcblxuXHRcdFx0dGhpcy5ydW5RdWV1ZSgpO1xuXHRcdH0pO1xuXHR9XG5cblx0c3RvcCgpIHtcblx0XHR0aGlzLnNlcnZlci5kaXNjb25uZWN0KCk7XG5cdH1cblxuXHQvKipcblx0ICogTG9nIGhlbHBlclxuXHQgKi9cblx0bG9nKG1lc3NhZ2UpIHtcblx0XHRjb25zb2xlLmxvZyhgW2lyY11bYnJpZGdlXSAkeyBtZXNzYWdlIH1gKTtcblx0fVxuXG5cdGxvZ1F1ZXVlKG1lc3NhZ2UpIHtcblx0XHRjb25zb2xlLmxvZyhgW2lyY11bYnJpZGdlXVtxdWV1ZV0gJHsgbWVzc2FnZSB9YCk7XG5cdH1cblxuXHQvKipcblx0ICpcblx0ICpcblx0ICogUXVldWVcblx0ICpcblx0ICpcblx0ICovXG5cdG9uTWVzc2FnZVJlY2VpdmVkKGZyb20sIGNvbW1hbmQsIC4uLnBhcmFtZXRlcnMpIHtcblx0XHR0aGlzLnF1ZXVlLmVucXVldWUoeyBmcm9tLCBjb21tYW5kLCBwYXJhbWV0ZXJzIH0pO1xuXHR9XG5cblx0YXN5bmMgcnVuUXVldWUoKSB7XG5cdFx0Ly8gSWYgaXQgaXMgZW1wdHksIHNraXAgYW5kIGtlZXAgdGhlIHF1ZXVlIGdvaW5nXG5cdFx0aWYgKHRoaXMucXVldWUuaXNFbXB0eSgpKSB7XG5cdFx0XHRyZXR1cm4gc2V0VGltZW91dCh0aGlzLnJ1blF1ZXVlLmJpbmQodGhpcyksIHRoaXMucXVldWVUaW1lb3V0KTtcblx0XHR9XG5cblx0XHQvLyBHZXQgdGhlIGNvbW1hbmRcblx0XHRjb25zdCBpdGVtID0gdGhpcy5xdWV1ZS5kZXF1ZXVlKCk7XG5cblx0XHR0aGlzLmxvZ1F1ZXVlKGBQcm9jZXNzaW5nIFwiJHsgaXRlbS5jb21tYW5kIH1cIiBjb21tYW5kIGZyb20gXCIkeyBpdGVtLmZyb20gfVwiYCk7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGNvbW1hbmQgYWNjb3JkaW5nbHlcblx0XHRzd2l0Y2ggKGl0ZW0uZnJvbSkge1xuXHRcdFx0Y2FzZSAnbG9jYWwnOlxuXHRcdFx0XHRpZiAoIWxvY2FsQ29tbWFuZEhhbmRsZXJzW2l0ZW0uY29tbWFuZF0pIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGhhbmRsZXIgZm9yIGxvY2FsOiR7IGl0ZW0uY29tbWFuZCB9YCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRhd2FpdCBsb2NhbENvbW1hbmRIYW5kbGVyc1tpdGVtLmNvbW1hbmRdLmFwcGx5KHRoaXMsIGl0ZW0ucGFyYW1ldGVycyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAncGVlcic6XG5cdFx0XHRcdGlmICghcGVlckNvbW1hbmRIYW5kbGVyc1tpdGVtLmNvbW1hbmRdKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBoYW5kbGVyIGZvciBwZWVyOiR7IGl0ZW0uY29tbWFuZCB9YCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRhd2FpdCBwZWVyQ29tbWFuZEhhbmRsZXJzW2l0ZW0uY29tbWFuZF0uYXBwbHkodGhpcywgaXRlbS5wYXJhbWV0ZXJzKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0Ly8gS2VlcCB0aGUgcXVldWUgZ29pbmdcblx0XHRzZXRUaW1lb3V0KHRoaXMucnVuUXVldWUuYmluZCh0aGlzKSwgdGhpcy5xdWV1ZVRpbWVvdXQpO1xuXHR9XG5cblx0LyoqXG5cdCAqXG5cdCAqXG5cdCAqIFBlZXJcblx0ICpcblx0ICpcblx0ICovXG5cdHNldHVwUGVlckhhbmRsZXJzKCkge1xuXHRcdHRoaXMuc2VydmVyLm9uKCdwZWVyQ29tbWFuZCcsIChjbWQpID0+IHtcblx0XHRcdHRoaXMub25NZXNzYWdlUmVjZWl2ZWQoJ3BlZXInLCBjbWQuaWRlbnRpZmllciwgY21kLmFyZ3MpO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqXG5cdCAqXG5cdCAqIExvY2FsXG5cdCAqXG5cdCAqXG5cdCAqL1xuXHRzZXR1cExvY2FsSGFuZGxlcnMoKSB7XG5cdFx0Ly8gQXV0aFxuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJWYWxpZGF0ZUxvZ2luJywgdGhpcy5vbk1lc3NhZ2VSZWNlaXZlZC5iaW5kKHRoaXMsICdsb2NhbCcsICdvbkxvZ2luJyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ2lyYy1vbi1sb2dpbicpO1xuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJDcmVhdGVVc2VyJywgdGhpcy5vbk1lc3NhZ2VSZWNlaXZlZC5iaW5kKHRoaXMsICdsb2NhbCcsICdvbkNyZWF0ZVVzZXInKSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnaXJjLW9uLWNyZWF0ZS11c2VyJyk7XG5cdFx0Ly8gSm9pbmluZyByb29tcyBvciBjaGFubmVsc1xuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJDcmVhdGVDaGFubmVsJywgdGhpcy5vbk1lc3NhZ2VSZWNlaXZlZC5iaW5kKHRoaXMsICdsb2NhbCcsICdvbkNyZWF0ZVJvb20nKSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnaXJjLW9uLWNyZWF0ZS1jaGFubmVsJyk7XG5cdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlckNyZWF0ZVJvb20nLCB0aGlzLm9uTWVzc2FnZVJlY2VpdmVkLmJpbmQodGhpcywgJ2xvY2FsJywgJ29uQ3JlYXRlUm9vbScpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdpcmMtb24tY3JlYXRlLXJvb20nKTtcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVySm9pblJvb20nLCB0aGlzLm9uTWVzc2FnZVJlY2VpdmVkLmJpbmQodGhpcywgJ2xvY2FsJywgJ29uSm9pblJvb20nKSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnaXJjLW9uLWpvaW4tcm9vbScpO1xuXHRcdC8vIExlYXZpbmcgcm9vbXMgb3IgY2hhbm5lbHNcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyTGVhdmVSb29tJywgdGhpcy5vbk1lc3NhZ2VSZWNlaXZlZC5iaW5kKHRoaXMsICdsb2NhbCcsICdvbkxlYXZlUm9vbScpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdpcmMtb24tbGVhdmUtcm9vbScpO1xuXHRcdC8vIENoYXR0aW5nXG5cdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlclNhdmVNZXNzYWdlJywgdGhpcy5vbk1lc3NhZ2VSZWNlaXZlZC5iaW5kKHRoaXMsICdsb2NhbCcsICdvblNhdmVNZXNzYWdlJyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ2lyYy1vbi1zYXZlLW1lc3NhZ2UnKTtcblx0XHQvLyBMZWF2aW5nXG5cdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlckxvZ291dENsZWFuVXAnLCB0aGlzLm9uTWVzc2FnZVJlY2VpdmVkLmJpbmQodGhpcywgJ2xvY2FsJywgJ29uTG9nb3V0JyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ2lyYy1vbi1sb2dvdXQnKTtcblx0fVxuXG5cdHNlbmRDb21tYW5kKGNvbW1hbmQsIHBhcmFtZXRlcnMpIHtcblx0XHR0aGlzLnNlcnZlci5lbWl0KCdvblJlY2VpdmVGcm9tTG9jYWwnLCBjb21tYW5kLCBwYXJhbWV0ZXJzKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBCcmlkZ2U7XG4iLCJpbXBvcnQgb25DcmVhdGVSb29tIGZyb20gJy4vb25DcmVhdGVSb29tJztcbmltcG9ydCBvbkpvaW5Sb29tIGZyb20gJy4vb25Kb2luUm9vbSc7XG5pbXBvcnQgb25MZWF2ZVJvb20gZnJvbSAnLi9vbkxlYXZlUm9vbSc7XG5pbXBvcnQgb25Mb2dpbiBmcm9tICcuL29uTG9naW4nO1xuaW1wb3J0IG9uTG9nb3V0IGZyb20gJy4vb25Mb2dvdXQnO1xuaW1wb3J0IG9uU2F2ZU1lc3NhZ2UgZnJvbSAnLi9vblNhdmVNZXNzYWdlJztcbmltcG9ydCBvbkNyZWF0ZVVzZXIgZnJvbSAnLi9vbkNyZWF0ZVVzZXInO1xuXG5leHBvcnQgeyBvbkNyZWF0ZVJvb20sIG9uSm9pblJvb20sIG9uTGVhdmVSb29tLCBvbkxvZ2luLCBvbkxvZ291dCwgb25TYXZlTWVzc2FnZSwgb25DcmVhdGVVc2VyIH07XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBoYW5kbGVPbkNyZWF0ZVJvb20odXNlciwgcm9vbSkge1xuXHRpZiAoIXJvb20udXNlcm5hbWVzKSB7XG5cdFx0cmV0dXJuIHRoaXMubG9nKGBSb29tICR7IHJvb20ubmFtZSB9IGRvZXMgbm90IGhhdmUgYSB2YWxpZCBsaXN0IG9mIHVzZXJuYW1lc2ApO1xuXHR9XG5cblx0Zm9yIChjb25zdCB1c2VybmFtZSBvZiByb29tLnVzZXJuYW1lcykge1xuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHsgdXNlcm5hbWUgfSk7XG5cblx0XHRpZiAodXNlci5wcm9maWxlLmlyYy5mcm9tSVJDKSB7XG5cdFx0XHR0aGlzLnNlbmRDb21tYW5kKCdqb2luQ2hhbm5lbCcsIHsgcm9vbSwgdXNlciB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5zZW5kQ29tbWFuZCgnam9pbmVkQ2hhbm5lbCcsIHsgcm9vbSwgdXNlciB9KTtcblx0XHR9XG5cdH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGhhbmRsZU9uQ3JlYXRlVXNlcihuZXdVc2VyKSB7XG5cdGlmICghbmV3VXNlcikge1xuXHRcdHJldHVybiB0aGlzLmxvZygnSW52YWxpZCBoYW5kbGVPbkNyZWF0ZVVzZXIgY2FsbCcpO1xuXHR9XG5cdGlmICghbmV3VXNlci51c2VybmFtZSkge1xuXHRcdHJldHVybiB0aGlzLmxvZygnSW52YWxpZCBoYW5kbGVPbkNyZWF0ZVVzZXIgY2FsbCAoTWlzc2luZyB1c2VybmFtZSknKTtcblx0fVxuXHRpZiAodGhpcy5sb2dnZWRJblVzZXJzLmluZGV4T2YobmV3VXNlci5faWQpICE9PSAtMSkge1xuXHRcdHJldHVybiB0aGlzLmxvZygnRHVwbGljYXRlIGhhbmRsZU9uQ3JlYXRlVXNlciBjYWxsJyk7XG5cdH1cblxuXHR0aGlzLmxvZ2dlZEluVXNlcnMucHVzaChuZXdVc2VyLl9pZCk7XG5cblx0TWV0ZW9yLnVzZXJzLnVwZGF0ZSh7IF9pZDogbmV3VXNlci5faWQgfSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdCdwcm9maWxlLmlyYy5mcm9tSVJDJzogZmFsc2UsXG5cdFx0XHQncHJvZmlsZS5pcmMudXNlcm5hbWUnOiBgJHsgbmV3VXNlci51c2VybmFtZSB9LXJrdGAsXG5cdFx0XHQncHJvZmlsZS5pcmMubmljayc6IGAkeyBuZXdVc2VyLnVzZXJuYW1lIH0tcmt0YCxcblx0XHRcdCdwcm9maWxlLmlyYy5ob3N0bmFtZSc6ICdyb2NrZXQuY2hhdCcsXG5cdFx0fSxcblx0fSk7XG5cblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUoe1xuXHRcdF9pZDogbmV3VXNlci5faWQsXG5cdH0pO1xuXG5cdHRoaXMuc2VuZENvbW1hbmQoJ3JlZ2lzdGVyVXNlcicsIHVzZXIpO1xuXG5cdGNvbnN0IHJvb21zID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZFdpdGhVc2VybmFtZSh1c2VyLnVzZXJuYW1lKS5mZXRjaCgpO1xuXG5cdHJvb21zLmZvckVhY2goKHJvb20pID0+IHRoaXMuc2VuZENvbW1hbmQoJ2pvaW5lZENoYW5uZWwnLCB7IHJvb20sIHVzZXIgfSkpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlT25Kb2luUm9vbSh1c2VyLCByb29tKSB7XG5cdHRoaXMuc2VuZENvbW1hbmQoJ2pvaW5lZENoYW5uZWwnLCB7IHJvb20sIHVzZXIgfSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBoYW5kbGVPbkxlYXZlUm9vbSh1c2VyLCByb29tKSB7XG5cdHRoaXMuc2VuZENvbW1hbmQoJ2xlZnRDaGFubmVsJywgeyByb29tLCB1c2VyIH0pO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlT25Mb2dpbihsb2dpbikge1xuXHRpZiAobG9naW4udXNlciA9PT0gbnVsbCkge1xuXHRcdHJldHVybiB0aGlzLmxvZygnSW52YWxpZCBoYW5kbGVPbkxvZ2luIGNhbGwnKTtcblx0fVxuXHRpZiAoIWxvZ2luLnVzZXIudXNlcm5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5sb2coJ0ludmFsaWQgaGFuZGxlT25Mb2dpbiBjYWxsIChNaXNzaW5nIHVzZXJuYW1lKScpO1xuXHR9XG5cdGlmICh0aGlzLmxvZ2dlZEluVXNlcnMuaW5kZXhPZihsb2dpbi51c2VyLl9pZCkgIT09IC0xKSB7XG5cdFx0cmV0dXJuIHRoaXMubG9nKCdEdXBsaWNhdGUgaGFuZGxlT25Mb2dpbiBjYWxsJyk7XG5cdH1cblxuXHR0aGlzLmxvZ2dlZEluVXNlcnMucHVzaChsb2dpbi51c2VyLl9pZCk7XG5cblx0TWV0ZW9yLnVzZXJzLnVwZGF0ZSh7IF9pZDogbG9naW4udXNlci5faWQgfSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdCdwcm9maWxlLmlyYy5mcm9tSVJDJzogZmFsc2UsXG5cdFx0XHQncHJvZmlsZS5pcmMudXNlcm5hbWUnOiBgJHsgbG9naW4udXNlci51c2VybmFtZSB9LXJrdGAsXG5cdFx0XHQncHJvZmlsZS5pcmMubmljayc6IGAkeyBsb2dpbi51c2VyLnVzZXJuYW1lIH0tcmt0YCxcblx0XHRcdCdwcm9maWxlLmlyYy5ob3N0bmFtZSc6ICdyb2NrZXQuY2hhdCcsXG5cdFx0fSxcblx0fSk7XG5cblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUoe1xuXHRcdF9pZDogbG9naW4udXNlci5faWQsXG5cdH0pO1xuXG5cdHRoaXMuc2VuZENvbW1hbmQoJ3JlZ2lzdGVyVXNlcicsIHVzZXIpO1xuXG5cdGNvbnN0IHJvb21zID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZFdpdGhVc2VybmFtZSh1c2VyLnVzZXJuYW1lKS5mZXRjaCgpO1xuXG5cdHJvb21zLmZvckVhY2goKHJvb20pID0+IHRoaXMuc2VuZENvbW1hbmQoJ2pvaW5lZENoYW5uZWwnLCB7IHJvb20sIHVzZXIgfSkpO1xufVxuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGhhbmRsZU9uTG9nb3V0KHVzZXIpIHtcblx0dGhpcy5sb2dnZWRJblVzZXJzID0gXy53aXRob3V0KHRoaXMubG9nZ2VkSW5Vc2VycywgdXNlci5faWQpO1xuXG5cdHRoaXMuc2VuZENvbW1hbmQoJ2Rpc2Nvbm5lY3RlZCcsIHsgdXNlciB9KTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGhhbmRsZU9uU2F2ZU1lc3NhZ2UobWVzc2FnZSwgdG8pIHtcblx0bGV0IHRvSWRlbnRpZmljYXRpb24gPSAnJztcblx0Ly8gRGlyZWN0IG1lc3NhZ2Vcblx0aWYgKHRvLnQgPT09ICdkJykge1xuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVJvb21JZCh0by5faWQpO1xuXHRcdHN1YnNjcmlwdGlvbnMuZm9yRWFjaCgoc3Vic2NyaXB0aW9uKSA9PiB7XG5cdFx0XHRpZiAoc3Vic2NyaXB0aW9uLnUudXNlcm5hbWUgIT09IHRvLnVzZXJuYW1lKSB7XG5cdFx0XHRcdGNvbnN0IHVzZXJEYXRhID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7IHVzZXJuYW1lOiBzdWJzY3JpcHRpb24udS51c2VybmFtZSB9KTtcblx0XHRcdFx0aWYgKHVzZXJEYXRhKSB7XG5cdFx0XHRcdFx0aWYgKHVzZXJEYXRhLnByb2ZpbGUgJiYgdXNlckRhdGEucHJvZmlsZS5pcmMgJiYgdXNlckRhdGEucHJvZmlsZS5pcmMubmljaykge1xuXHRcdFx0XHRcdFx0dG9JZGVudGlmaWNhdGlvbiA9IHVzZXJEYXRhLnByb2ZpbGUuaXJjLm5pY2s7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRvSWRlbnRpZmljYXRpb24gPSB1c2VyRGF0YS51c2VybmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dG9JZGVudGlmaWNhdGlvbiA9IHN1YnNjcmlwdGlvbi51LnVzZXJuYW1lO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAoIXRvSWRlbnRpZmljYXRpb24pIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ1tpcmNdW3NlcnZlcl0gVGFyZ2V0IHVzZXIgbm90IGZvdW5kJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHRvSWRlbnRpZmljYXRpb24gPSBgIyR7IHRvLm5hbWUgfWA7XG5cdH1cblxuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7IF9pZDogbWVzc2FnZS51Ll9pZCB9KTtcblxuXHR0aGlzLnNlbmRDb21tYW5kKCdzZW50TWVzc2FnZScsIHsgdG86IHRvSWRlbnRpZmljYXRpb24sIHVzZXIsIG1lc3NhZ2U6IG1lc3NhZ2UubXNnIH0pO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlUVVJVChhcmdzKSB7XG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHtcblx0XHQncHJvZmlsZS5pcmMubmljayc6IGFyZ3Mubmljayxcblx0fSk7XG5cblx0TWV0ZW9yLnVzZXJzLnVwZGF0ZSh7IF9pZDogdXNlci5faWQgfSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHN0YXR1czogJ29mZmxpbmUnLFxuXHRcdH0sXG5cdH0pO1xuXG5cdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnJlbW92ZVVzZXJuYW1lRnJvbUFsbCh1c2VyLnVzZXJuYW1lKTtcbn1cbiIsImltcG9ydCBkaXNjb25uZWN0ZWQgZnJvbSAnLi9kaXNjb25uZWN0ZWQnO1xuaW1wb3J0IGpvaW5lZENoYW5uZWwgZnJvbSAnLi9qb2luZWRDaGFubmVsJztcbmltcG9ydCBsZWZ0Q2hhbm5lbCBmcm9tICcuL2xlZnRDaGFubmVsJztcbmltcG9ydCBuaWNrQ2hhbmdlZCBmcm9tICcuL25pY2tDaGFuZ2VkJztcbmltcG9ydCBzZW50TWVzc2FnZSBmcm9tICcuL3NlbnRNZXNzYWdlJztcbmltcG9ydCB1c2VyUmVnaXN0ZXJlZCBmcm9tICcuL3VzZXJSZWdpc3RlcmVkJztcblxuZXhwb3J0IHsgZGlzY29ubmVjdGVkLCBqb2luZWRDaGFubmVsLCBsZWZ0Q2hhbm5lbCwgbmlja0NoYW5nZWQsIHNlbnRNZXNzYWdlLCB1c2VyUmVnaXN0ZXJlZCB9O1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlSm9pbmVkQ2hhbm5lbChhcmdzKSB7XG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHtcblx0XHQncHJvZmlsZS5pcmMubmljayc6IGFyZ3Mubmljayxcblx0fSk7XG5cblx0aWYgKCF1c2VyKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBhIHVzZXIgd2l0aCBuaWNrICR7IGFyZ3MubmljayB9YCk7XG5cdH1cblxuXHRsZXQgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUoYXJncy5yb29tTmFtZSk7XG5cblx0aWYgKCFyb29tKSB7XG5cdFx0Y29uc3QgY3JlYXRlZFJvb20gPSBSb2NrZXRDaGF0LmNyZWF0ZVJvb20oJ2MnLCBhcmdzLnJvb21OYW1lLCB1c2VyLnVzZXJuYW1lLCBbXSk7XG5cdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmUoeyBfaWQ6IGNyZWF0ZWRSb29tLnJpZCB9KTtcblxuXHRcdHRoaXMubG9nKGAkeyB1c2VyLnVzZXJuYW1lIH0gY3JlYXRlZCByb29tICR7IGFyZ3Mucm9vbU5hbWUgfWApO1xuXHR9IGVsc2Uge1xuXHRcdFJvY2tldENoYXQuYWRkVXNlclRvUm9vbShyb29tLl9pZCwgdXNlcik7XG5cblx0XHR0aGlzLmxvZyhgJHsgdXNlci51c2VybmFtZSB9IGpvaW5lZCByb29tICR7IHJvb20ubmFtZSB9YCk7XG5cdH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGhhbmRsZUxlZnRDaGFubmVsKGFyZ3MpIHtcblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUoe1xuXHRcdCdwcm9maWxlLmlyYy5uaWNrJzogYXJncy5uaWNrLFxuXHR9KTtcblxuXHRpZiAoIXVzZXIpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGEgdXNlciB3aXRoIG5pY2sgJHsgYXJncy5uaWNrIH1gKTtcblx0fVxuXG5cdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlOYW1lKGFyZ3Mucm9vbU5hbWUpO1xuXG5cdGlmICghcm9vbSkge1xuXHRcdHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSByb29tIHdpdGggbmFtZSAkeyBhcmdzLnJvb21OYW1lIH1gKTtcblx0fVxuXG5cdHRoaXMubG9nKGAkeyB1c2VyLnVzZXJuYW1lIH0gbGVmdCByb29tICR7IHJvb20ubmFtZSB9YCk7XG5cdFJvY2tldENoYXQucmVtb3ZlVXNlckZyb21Sb29tKHJvb20uX2lkLCB1c2VyKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGhhbmRsZU5pY2tDaGFuZ2VkKGFyZ3MpIHtcblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUoe1xuXHRcdCdwcm9maWxlLmlyYy5uaWNrJzogYXJncy5uaWNrLFxuXHR9KTtcblxuXHRpZiAoIXVzZXIpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGFuIHVzZXIgd2l0aCBuaWNrICR7IGFyZ3MubmljayB9YCk7XG5cdH1cblxuXHR0aGlzLmxvZyhgJHsgdXNlci51c2VybmFtZSB9IGNoYW5nZWQgbmljazogJHsgYXJncy5uaWNrIH0gLT4gJHsgYXJncy5uZXdOaWNrIH1gKTtcblxuXHQvLyBVcGRhdGUgb24gdGhlIGRhdGFiYXNlXG5cdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnVwZGF0ZSh7IF9pZDogdXNlci5faWQgfSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdG5hbWU6IGFyZ3MubmV3Tmljayxcblx0XHRcdCdwcm9maWxlLmlyYy5uaWNrJzogYXJncy5uZXdOaWNrLFxuXHRcdH0sXG5cdH0pO1xufVxuIiwiLypcbiAqXG4gKiBHZXQgZGlyZWN0IGNoYXQgcm9vbSBoZWxwZXJcbiAqXG4gKlxuICovXG5jb25zdCBnZXREaXJlY3RSb29tID0gKHNvdXJjZSwgdGFyZ2V0KSA9PiB7XG5cdGNvbnN0IHJpZCA9IFtzb3VyY2UuX2lkLCB0YXJnZXQuX2lkXS5zb3J0KCkuam9pbignJyk7XG5cblx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBzZXJ0KHsgX2lkOiByaWQgfSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHVzZXJuYW1lczogW3NvdXJjZS51c2VybmFtZSwgdGFyZ2V0LnVzZXJuYW1lXSxcblx0XHR9LFxuXHRcdCRzZXRPbkluc2VydDoge1xuXHRcdFx0dDogJ2QnLFxuXHRcdFx0bXNnczogMCxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdH0sXG5cdH0pO1xuXG5cdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBzZXJ0KHsgcmlkLCAndS5faWQnOiB0YXJnZXQuX2lkIH0sIHtcblx0XHQkc2V0T25JbnNlcnQ6IHtcblx0XHRcdG5hbWU6IHNvdXJjZS51c2VybmFtZSxcblx0XHRcdHQ6ICdkJyxcblx0XHRcdG9wZW46IGZhbHNlLFxuXHRcdFx0YWxlcnQ6IGZhbHNlLFxuXHRcdFx0dW5yZWFkOiAwLFxuXHRcdFx0dToge1xuXHRcdFx0XHRfaWQ6IHRhcmdldC5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiB0YXJnZXQudXNlcm5hbWUsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdH0pO1xuXG5cdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBzZXJ0KHsgcmlkLCAndS5faWQnOiBzb3VyY2UuX2lkIH0sIHtcblx0XHQkc2V0T25JbnNlcnQ6IHtcblx0XHRcdG5hbWU6IHRhcmdldC51c2VybmFtZSxcblx0XHRcdHQ6ICdkJyxcblx0XHRcdG9wZW46IGZhbHNlLFxuXHRcdFx0YWxlcnQ6IGZhbHNlLFxuXHRcdFx0dW5yZWFkOiAwLFxuXHRcdFx0dToge1xuXHRcdFx0XHRfaWQ6IHNvdXJjZS5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBzb3VyY2UudXNlcm5hbWUsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdH0pO1xuXG5cdHJldHVybiB7XG5cdFx0X2lkOiByaWQsXG5cdFx0dDogJ2QnLFxuXHR9O1xufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlU2VudE1lc3NhZ2UoYXJncykge1xuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7XG5cdFx0J3Byb2ZpbGUuaXJjLm5pY2snOiBhcmdzLm5pY2ssXG5cdH0pO1xuXG5cdGlmICghdXNlcikge1xuXHRcdHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSB1c2VyIHdpdGggbmljayAkeyBhcmdzLm5pY2sgfWApO1xuXHR9XG5cblx0bGV0IHJvb207XG5cblx0aWYgKGFyZ3Mucm9vbU5hbWUpIHtcblx0XHRyb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShhcmdzLnJvb21OYW1lKTtcblx0fSBlbHNlIHtcblx0XHRjb25zdCByZWNpcGllbnRVc2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7XG5cdFx0XHQncHJvZmlsZS5pcmMubmljayc6IGFyZ3MucmVjaXBpZW50Tmljayxcblx0XHR9KTtcblxuXHRcdHJvb20gPSBnZXREaXJlY3RSb29tKHVzZXIsIHJlY2lwaWVudFVzZXIpO1xuXHR9XG5cblx0Y29uc3QgbWVzc2FnZSA9IHtcblx0XHRtc2c6IGFyZ3MubWVzc2FnZSxcblx0XHR0czogbmV3IERhdGUoKSxcblx0fTtcblxuXHRSb2NrZXRDaGF0LnNlbmRNZXNzYWdlKHVzZXIsIG1lc3NhZ2UsIHJvb20pO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlVXNlclJlZ2lzdGVyZWQoYXJncykge1xuXHQvLyBDaGVjayBpZiB0aGVyZSBpcyBhbiB1c2VyIHdpdGggdGhlIGdpdmVuIHVzZXJuYW1lXG5cdGxldCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7XG5cdFx0J3Byb2ZpbGUuaXJjLnVzZXJuYW1lJzogYXJncy51c2VybmFtZSxcblx0fSk7XG5cblx0Ly8gSWYgdGhlcmUgaXMgbm8gdXNlciwgY3JlYXRlIG9uZS4uLlxuXHRpZiAoIXVzZXIpIHtcblx0XHR0aGlzLmxvZyhgUmVnaXN0ZXJpbmcgJHsgYXJncy51c2VybmFtZSB9IHdpdGggbmljazogJHsgYXJncy5uaWNrIH1gKTtcblxuXHRcdGNvbnN0IHVzZXJUb0luc2VydCA9IHtcblx0XHRcdG5hbWU6IGFyZ3Mubmljayxcblx0XHRcdHVzZXJuYW1lOiBgJHsgYXJncy51c2VybmFtZSB9LWlyY2AsXG5cdFx0XHRzdGF0dXM6ICdvbmxpbmUnLFxuXHRcdFx0dXRjT2Zmc2V0OiAwLFxuXHRcdFx0YWN0aXZlOiB0cnVlLFxuXHRcdFx0dHlwZTogJ3VzZXInLFxuXHRcdFx0cHJvZmlsZToge1xuXHRcdFx0XHRpcmM6IHtcblx0XHRcdFx0XHRmcm9tSVJDOiB0cnVlLFxuXHRcdFx0XHRcdG5pY2s6IGFyZ3Mubmljayxcblx0XHRcdFx0XHR1c2VybmFtZTogYXJncy51c2VybmFtZSxcblx0XHRcdFx0XHRob3N0bmFtZTogYXJncy5ob3N0bmFtZSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5jcmVhdGUodXNlclRvSW5zZXJ0KTtcblx0fSBlbHNlIHtcblx0XHQvLyAuLi5vdGhlcndpc2UsIGxvZyB0aGUgdXNlciBpbiBhbmQgdXBkYXRlIHRoZSBpbmZvcm1hdGlvblxuXHRcdHRoaXMubG9nKGBMb2dnaW5nIGluICR7IGFyZ3MudXNlcm5hbWUgfSB3aXRoIG5pY2s6ICR7IGFyZ3MubmljayB9YCk7XG5cblx0XHRNZXRlb3IudXNlcnMudXBkYXRlKHsgX2lkOiB1c2VyLl9pZCB9LCB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdHN0YXR1czogJ29ubGluZScsXG5cdFx0XHRcdCdwcm9maWxlLmlyYy5uaWNrJzogYXJncy5uaWNrLFxuXHRcdFx0XHQncHJvZmlsZS5pcmMudXNlcm5hbWUnOiBhcmdzLnVzZXJuYW1lLFxuXHRcdFx0XHQncHJvZmlsZS5pcmMuaG9zdG5hbWUnOiBhcmdzLmhvc3RuYW1lLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0fVxufVxuIiwiaW1wb3J0IFJGQzI4MTMgZnJvbSAnLi9SRkMyODEzJztcblxuZXhwb3J0IHsgUkZDMjgxMyB9O1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiBodHRwczovL2dpdGh1Yi5jb20vbWFydHluc21pdGgvbm9kZS1pcmNcbiAqIGJ5IGh0dHBzOi8vZ2l0aHViLmNvbS9tYXJ0eW5zbWl0aFxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHQnMDAxJzoge1xuXHRcdG5hbWU6ICdycGxfd2VsY29tZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0JzAwMic6IHtcblx0XHRuYW1lOiAncnBsX3lvdXJob3N0Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQnMDAzJzoge1xuXHRcdG5hbWU6ICdycGxfY3JlYXRlZCcsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0JzAwNCc6IHtcblx0XHRuYW1lOiAncnBsX215aW5mbycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0JzAwNSc6IHtcblx0XHRuYW1lOiAncnBsX2lzdXBwb3J0Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMDA6IHtcblx0XHRuYW1lOiAncnBsX3RyYWNlbGluaycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjAxOiB7XG5cdFx0bmFtZTogJ3JwbF90cmFjZWNvbm5lY3RpbmcnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIwMjoge1xuXHRcdG5hbWU6ICdycGxfdHJhY2VoYW5kc2hha2UnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIwMzoge1xuXHRcdG5hbWU6ICdycGxfdHJhY2V1bmtub3duJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMDQ6IHtcblx0XHRuYW1lOiAncnBsX3RyYWNlb3BlcmF0b3InLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIwNToge1xuXHRcdG5hbWU6ICdycGxfdHJhY2V1c2VyJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMDY6IHtcblx0XHRuYW1lOiAncnBsX3RyYWNlc2VydmVyJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMDg6IHtcblx0XHRuYW1lOiAncnBsX3RyYWNlbmV3dHlwZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjExOiB7XG5cdFx0bmFtZTogJ3JwbF9zdGF0c2xpbmtpbmZvJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMTI6IHtcblx0XHRuYW1lOiAncnBsX3N0YXRzY29tbWFuZHMnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIxMzoge1xuXHRcdG5hbWU6ICdycGxfc3RhdHNjbGluZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjE0OiB7XG5cdFx0bmFtZTogJ3JwbF9zdGF0c25saW5lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMTU6IHtcblx0XHRuYW1lOiAncnBsX3N0YXRzaWxpbmUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIxNjoge1xuXHRcdG5hbWU6ICdycGxfc3RhdHNrbGluZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjE4OiB7XG5cdFx0bmFtZTogJ3JwbF9zdGF0c3lsaW5lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMTk6IHtcblx0XHRuYW1lOiAncnBsX2VuZG9mc3RhdHMnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIyMToge1xuXHRcdG5hbWU6ICdycGxfdW1vZGVpcycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjQxOiB7XG5cdFx0bmFtZTogJ3JwbF9zdGF0c2xsaW5lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNDI6IHtcblx0XHRuYW1lOiAncnBsX3N0YXRzdXB0aW1lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNDM6IHtcblx0XHRuYW1lOiAncnBsX3N0YXRzb2xpbmUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI0NDoge1xuXHRcdG5hbWU6ICdycGxfc3RhdHNobGluZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjUwOiB7XG5cdFx0bmFtZTogJ3JwbF9zdGF0c2Nvbm4nLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI1MToge1xuXHRcdG5hbWU6ICdycGxfbHVzZXJjbGllbnQnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI1Mjoge1xuXHRcdG5hbWU6ICdycGxfbHVzZXJvcCcsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjUzOiB7XG5cdFx0bmFtZTogJ3JwbF9sdXNlcnVua25vd24nLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI1NDoge1xuXHRcdG5hbWU6ICdycGxfbHVzZXJjaGFubmVscycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjU1OiB7XG5cdFx0bmFtZTogJ3JwbF9sdXNlcm1lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNTY6IHtcblx0XHRuYW1lOiAncnBsX2FkbWlubWUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI1Nzoge1xuXHRcdG5hbWU6ICdycGxfYWRtaW5sb2MxJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNTg6IHtcblx0XHRuYW1lOiAncnBsX2FkbWlubG9jMicsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjU5OiB7XG5cdFx0bmFtZTogJ3JwbF9hZG1pbmVtYWlsJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNjE6IHtcblx0XHRuYW1lOiAncnBsX3RyYWNlbG9nJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNjU6IHtcblx0XHRuYW1lOiAncnBsX2xvY2FsdXNlcnMnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI2Njoge1xuXHRcdG5hbWU6ICdycGxfZ2xvYmFsdXNlcnMnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMwMDoge1xuXHRcdG5hbWU6ICdycGxfbm9uZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzAxOiB7XG5cdFx0bmFtZTogJ3JwbF9hd2F5Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMDI6IHtcblx0XHRuYW1lOiAncnBsX3VzZXJob3N0Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMDM6IHtcblx0XHRuYW1lOiAncnBsX2lzb24nLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMwNToge1xuXHRcdG5hbWU6ICdycGxfdW5hd2F5Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMDY6IHtcblx0XHRuYW1lOiAncnBsX25vd2F3YXknLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMxMToge1xuXHRcdG5hbWU6ICdycGxfd2hvaXN1c2VyJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMTI6IHtcblx0XHRuYW1lOiAncnBsX3dob2lzc2VydmVyJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMTM6IHtcblx0XHRuYW1lOiAncnBsX3dob2lzb3BlcmF0b3InLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMxNDoge1xuXHRcdG5hbWU6ICdycGxfd2hvd2FzdXNlcicsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzE1OiB7XG5cdFx0bmFtZTogJ3JwbF9lbmRvZndobycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzE3OiB7XG5cdFx0bmFtZTogJ3JwbF93aG9pc2lkbGUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMxODoge1xuXHRcdG5hbWU6ICdycGxfZW5kb2Z3aG9pcycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzE5OiB7XG5cdFx0bmFtZTogJ3JwbF93aG9pc2NoYW5uZWxzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMjE6IHtcblx0XHRuYW1lOiAncnBsX2xpc3RzdGFydCcsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzIyOiB7XG5cdFx0bmFtZTogJ3JwbF9saXN0Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMjM6IHtcblx0XHRuYW1lOiAncnBsX2xpc3RlbmQnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMyNDoge1xuXHRcdG5hbWU6ICdycGxfY2hhbm5lbG1vZGVpcycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzI5OiB7XG5cdFx0bmFtZTogJ3JwbF9jcmVhdGlvbnRpbWUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMzMToge1xuXHRcdG5hbWU6ICdycGxfbm90b3BpYycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzMyOiB7XG5cdFx0bmFtZTogJ3JwbF90b3BpYycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzMzOiB7XG5cdFx0bmFtZTogJ3JwbF90b3BpY3dob3RpbWUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM0MToge1xuXHRcdG5hbWU6ICdycGxfaW52aXRpbmcnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM0Mjoge1xuXHRcdG5hbWU6ICdycGxfc3VtbW9uaW5nJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzNTE6IHtcblx0XHRuYW1lOiAncnBsX3ZlcnNpb24nLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM1Mjoge1xuXHRcdG5hbWU6ICdycGxfd2hvcmVwbHknLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM1Mzoge1xuXHRcdG5hbWU6ICdycGxfbmFtcmVwbHknLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM2NDoge1xuXHRcdG5hbWU6ICdycGxfbGlua3MnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM2NToge1xuXHRcdG5hbWU6ICdycGxfZW5kb2ZsaW5rcycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzY2OiB7XG5cdFx0bmFtZTogJ3JwbF9lbmRvZm5hbWVzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzNjc6IHtcblx0XHRuYW1lOiAncnBsX2Jhbmxpc3QnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM2ODoge1xuXHRcdG5hbWU6ICdycGxfZW5kb2ZiYW5saXN0Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzNjk6IHtcblx0XHRuYW1lOiAncnBsX2VuZG9md2hvd2FzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzNzE6IHtcblx0XHRuYW1lOiAncnBsX2luZm8nLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM3Mjoge1xuXHRcdG5hbWU6ICdycGxfbW90ZCcsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0Mzc0OiB7XG5cdFx0bmFtZTogJ3JwbF9lbmRvZmluZm8nLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM3NToge1xuXHRcdG5hbWU6ICdycGxfbW90ZHN0YXJ0Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzNzY6IHtcblx0XHRuYW1lOiAncnBsX2VuZG9mbW90ZCcsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzgxOiB7XG5cdFx0bmFtZTogJ3JwbF95b3VyZW9wZXInLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM4Mjoge1xuXHRcdG5hbWU6ICdycGxfcmVoYXNoaW5nJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzOTE6IHtcblx0XHRuYW1lOiAncnBsX3RpbWUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM5Mjoge1xuXHRcdG5hbWU6ICdycGxfdXNlcnNzdGFydCcsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzkzOiB7XG5cdFx0bmFtZTogJ3JwbF91c2VycycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0Mzk0OiB7XG5cdFx0bmFtZTogJ3JwbF9lbmRvZnVzZXJzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzOTU6IHtcblx0XHRuYW1lOiAncnBsX25vdXNlcnMnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDQwMToge1xuXHRcdG5hbWU6ICdlcnJfbm9zdWNobmljaycsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDAyOiB7XG5cdFx0bmFtZTogJ2Vycl9ub3N1Y2hzZXJ2ZXInLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQwMzoge1xuXHRcdG5hbWU6ICdlcnJfbm9zdWNoY2hhbm5lbCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDA0OiB7XG5cdFx0bmFtZTogJ2Vycl9jYW5ub3RzZW5kdG9jaGFuJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MDU6IHtcblx0XHRuYW1lOiAnZXJyX3Rvb21hbnljaGFubmVscycsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDA2OiB7XG5cdFx0bmFtZTogJ2Vycl93YXNub3N1Y2huaWNrJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MDc6IHtcblx0XHRuYW1lOiAnZXJyX3Rvb21hbnl0YXJnZXRzJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MDk6IHtcblx0XHRuYW1lOiAnZXJyX25vb3JpZ2luJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MTE6IHtcblx0XHRuYW1lOiAnZXJyX25vcmVjaXBpZW50Jyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MTI6IHtcblx0XHRuYW1lOiAnZXJyX25vdGV4dHRvc2VuZCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDEzOiB7XG5cdFx0bmFtZTogJ2Vycl9ub3RvcGxldmVsJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MTQ6IHtcblx0XHRuYW1lOiAnZXJyX3dpbGR0b3BsZXZlbCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDIxOiB7XG5cdFx0bmFtZTogJ2Vycl91bmtub3duY29tbWFuZCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDIyOiB7XG5cdFx0bmFtZTogJ2Vycl9ub21vdGQnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQyMzoge1xuXHRcdG5hbWU6ICdlcnJfbm9hZG1pbmluZm8nLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQyNDoge1xuXHRcdG5hbWU6ICdlcnJfZmlsZWVycm9yJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MzE6IHtcblx0XHRuYW1lOiAnZXJyX25vbmlja25hbWVnaXZlbicsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDMyOiB7XG5cdFx0bmFtZTogJ2Vycl9lcnJvbmV1c25pY2tuYW1lJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MzM6IHtcblx0XHRuYW1lOiAnZXJyX25pY2tuYW1laW51c2UnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQzNjoge1xuXHRcdG5hbWU6ICdlcnJfbmlja2NvbGxpc2lvbicsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDQxOiB7XG5cdFx0bmFtZTogJ2Vycl91c2Vybm90aW5jaGFubmVsJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NDI6IHtcblx0XHRuYW1lOiAnZXJyX25vdG9uY2hhbm5lbCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDQzOiB7XG5cdFx0bmFtZTogJ2Vycl91c2Vyb25jaGFubmVsJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NDQ6IHtcblx0XHRuYW1lOiAnZXJyX25vbG9naW4nLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ0NToge1xuXHRcdG5hbWU6ICdlcnJfc3VtbW9uZGlzYWJsZWQnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ0Njoge1xuXHRcdG5hbWU6ICdlcnJfdXNlcnNkaXNhYmxlZCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDUxOiB7XG5cdFx0bmFtZTogJ2Vycl9ub3RyZWdpc3RlcmVkJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NjE6IHtcblx0XHRuYW1lOiAnZXJyX25lZWRtb3JlcGFyYW1zJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NjI6IHtcblx0XHRuYW1lOiAnZXJyX2FscmVhZHlyZWdpc3RyZWQnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ2Mzoge1xuXHRcdG5hbWU6ICdlcnJfbm9wZXJtZm9yaG9zdCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDY0OiB7XG5cdFx0bmFtZTogJ2Vycl9wYXNzd2RtaXNtYXRjaCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDY1OiB7XG5cdFx0bmFtZTogJ2Vycl95b3VyZWJhbm5lZGNyZWVwJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0Njc6IHtcblx0XHRuYW1lOiAnZXJyX2tleXNldCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDcxOiB7XG5cdFx0bmFtZTogJ2Vycl9jaGFubmVsaXNmdWxsJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NzI6IHtcblx0XHRuYW1lOiAnZXJyX3Vua25vd25tb2RlJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NzM6IHtcblx0XHRuYW1lOiAnZXJyX2ludml0ZW9ubHljaGFuJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NzQ6IHtcblx0XHRuYW1lOiAnZXJyX2Jhbm5lZGZyb21jaGFuJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NzU6IHtcblx0XHRuYW1lOiAnZXJyX2JhZGNoYW5uZWxrZXknLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ4MToge1xuXHRcdG5hbWU6ICdlcnJfbm9wcml2aWxlZ2VzJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0ODI6IHtcblx0XHRuYW1lOiAnZXJyX2NoYW5vcHJpdnNuZWVkZWQnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ4Mzoge1xuXHRcdG5hbWU6ICdlcnJfY2FudGtpbGxzZXJ2ZXInLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ5MToge1xuXHRcdG5hbWU6ICdlcnJfbm9vcGVyaG9zdCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NTAxOiB7XG5cdFx0bmFtZTogJ2Vycl91bW9kZXVua25vd25mbGFnJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ1MDI6IHtcblx0XHRuYW1lOiAnZXJyX3VzZXJzZG9udG1hdGNoJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxufTtcbiIsImltcG9ydCBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcblxuaW1wb3J0IHBhcnNlTWVzc2FnZSBmcm9tICcuL3BhcnNlTWVzc2FnZSc7XG5cbmltcG9ydCBwZWVyQ29tbWFuZEhhbmRsZXJzIGZyb20gJy4vcGVlckNvbW1hbmRIYW5kbGVycyc7XG5pbXBvcnQgbG9jYWxDb21tYW5kSGFuZGxlcnMgZnJvbSAnLi9sb2NhbENvbW1hbmRIYW5kbGVycyc7XG5cbmNsYXNzIFJGQzI4MTMge1xuXHRjb25zdHJ1Y3Rvcihjb25maWcpIHtcblx0XHR0aGlzLmNvbmZpZyA9IGNvbmZpZztcblxuXHRcdC8vIEhvbGQgcmVnaXN0ZXJlZCBzdGF0ZVxuXHRcdHRoaXMucmVnaXN0ZXJTdGVwcyA9IFtdO1xuXHRcdHRoaXMuaXNSZWdpc3RlcmVkID0gZmFsc2U7XG5cblx0XHQvLyBIb2xkIHBlZXIgc2VydmVyIGluZm9ybWF0aW9uXG5cdFx0dGhpcy5zZXJ2ZXJQcmVmaXggPSBudWxsO1xuXG5cdFx0Ly8gSG9sZCB0aGUgYnVmZmVyIHdoaWxlIHJlY2VpdmluZ1xuXHRcdHRoaXMucmVjZWl2ZUJ1ZmZlciA9IG5ldyBCdWZmZXIoJycpO1xuXG5cdH1cblxuXHQvKipcblx0ICogU2V0dXAgc29ja2V0XG5cdCAqL1xuXHRzZXR1cFNvY2tldCgpIHtcblx0XHQvLyBTZXR1cCBzb2NrZXRcblx0XHR0aGlzLnNvY2tldCA9IG5ldyBuZXQuU29ja2V0KCk7XG5cdFx0dGhpcy5zb2NrZXQuc2V0Tm9EZWxheSgpO1xuXHRcdHRoaXMuc29ja2V0LnNldEVuY29kaW5nKCd1dGYtOCcpO1xuXHRcdHRoaXMuc29ja2V0LnNldEtlZXBBbGl2ZSh0cnVlKTtcblx0XHR0aGlzLnNvY2tldC5zZXRUaW1lb3V0KDkwMDAwKTtcblxuXHRcdHRoaXMuc29ja2V0Lm9uKCdkYXRhJywgdGhpcy5vblJlY2VpdmVGcm9tUGVlci5iaW5kKHRoaXMpKTtcblxuXHRcdHRoaXMuc29ja2V0Lm9uKCdjb25uZWN0JywgdGhpcy5vbkNvbm5lY3QuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5zb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4gY29uc29sZS5sb2coJ1tpcmNdW3NlcnZlcl1bZXJyXScsIGVycikpO1xuXHRcdHRoaXMuc29ja2V0Lm9uKCd0aW1lb3V0JywgKCkgPT4gdGhpcy5sb2coJ1RpbWVvdXQnKSk7XG5cdFx0dGhpcy5zb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4gdGhpcy5sb2coJ0Nvbm5lY3Rpb24gQ2xvc2VkJykpO1xuXHRcdC8vIFNldHVwIGxvY2FsXG5cdFx0dGhpcy5vbignb25SZWNlaXZlRnJvbUxvY2FsJywgdGhpcy5vblJlY2VpdmVGcm9tTG9jYWwuYmluZCh0aGlzKSk7XG5cdH1cblxuXHQvKipcblx0ICogTG9nIGhlbHBlclxuXHQgKi9cblx0bG9nKG1lc3NhZ2UpIHtcblx0XHRjb25zb2xlLmxvZyhgW2lyY11bc2VydmVyXSAkeyBtZXNzYWdlIH1gKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb25uZWN0XG5cdCAqL1xuXHRyZWdpc3RlcigpIHtcblx0XHR0aGlzLmxvZyhgQ29ubmVjdGluZyB0byBAJHsgdGhpcy5jb25maWcuc2VydmVyLmhvc3QgfTokeyB0aGlzLmNvbmZpZy5zZXJ2ZXIucG9ydCB9YCk7XG5cblx0XHRpZiAoIXRoaXMuc29ja2V0KSB7XG5cdFx0XHR0aGlzLnNldHVwU29ja2V0KCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zb2NrZXQuY29ubmVjdCh0aGlzLmNvbmZpZy5zZXJ2ZXIucG9ydCwgdGhpcy5jb25maWcuc2VydmVyLmhvc3QpO1xuXHR9XG5cblx0LyoqXG5cdCAqIERpc2Nvbm5lY3Rcblx0ICovXG5cdGRpc2Nvbm5lY3QoKSB7XG5cdFx0dGhpcy5sb2coJ0Rpc2Nvbm5lY3RpbmcgZnJvbSBzZXJ2ZXIuJyk7XG5cblx0XHRpZiAodGhpcy5zb2NrZXQpIHtcblx0XHRcdHRoaXMuc29ja2V0LmRlc3Ryb3koKTtcblx0XHRcdHRoaXMuc29ja2V0ID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHR0aGlzLmlzUmVnaXN0ZXJlZCA9IGZhbHNlO1xuXHRcdHRoaXMucmVnaXN0ZXJTdGVwcyA9IFtdO1xuXHR9XG5cblx0LyoqXG5cdCAqIFNldHVwIHRoZSBzZXJ2ZXIgY29ubmVjdGlvblxuXHQgKi9cblx0b25Db25uZWN0KCkge1xuXHRcdHRoaXMubG9nKCdDb25uZWN0ZWQhIFJlZ2lzdGVyaW5nIGFzIHNlcnZlci4uLicpO1xuXG5cdFx0dGhpcy53cml0ZSh7XG5cdFx0XHRjb21tYW5kOiAnUEFTUycsXG5cdFx0XHRwYXJhbWV0ZXJzOiBbdGhpcy5jb25maWcucGFzc3dvcmRzLmxvY2FsLCAnMDIxMCcsICduZ2lyY2QnXSxcblx0XHR9KTtcblxuXHRcdHRoaXMud3JpdGUoe1xuXHRcdFx0Y29tbWFuZDogJ1NFUlZFUicsIHBhcmFtZXRlcnM6IFt0aGlzLmNvbmZpZy5zZXJ2ZXIubmFtZV0sXG5cdFx0XHR0cmFpbGVyOiB0aGlzLmNvbmZpZy5zZXJ2ZXIuZGVzY3JpcHRpb24sXG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogU2VuZHMgYSBjb21tYW5kIG1lc3NhZ2UgdGhyb3VnaCB0aGUgc29ja2V0XG5cdCAqL1xuXHR3cml0ZShjb21tYW5kKSB7XG5cdFx0bGV0IGJ1ZmZlciA9IGNvbW1hbmQucHJlZml4ID8gYDokeyBjb21tYW5kLnByZWZpeCB9IGAgOiAnJztcblx0XHRidWZmZXIgKz0gY29tbWFuZC5jb21tYW5kO1xuXG5cdFx0aWYgKGNvbW1hbmQucGFyYW1ldGVycyAmJiBjb21tYW5kLnBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuXHRcdFx0YnVmZmVyICs9IGAgJHsgY29tbWFuZC5wYXJhbWV0ZXJzLmpvaW4oJyAnKSB9YDtcblx0XHR9XG5cblx0XHRpZiAoY29tbWFuZC50cmFpbGVyKSB7XG5cdFx0XHRidWZmZXIgKz0gYCA6JHsgY29tbWFuZC50cmFpbGVyIH1gO1xuXHRcdH1cblxuXHRcdHRoaXMubG9nKGBTZW5kaW5nIENvbW1hbmQ6ICR7IGJ1ZmZlciB9YCk7XG5cblx0XHRyZXR1cm4gdGhpcy5zb2NrZXQud3JpdGUoYCR7IGJ1ZmZlciB9XFxyXFxuYCk7XG5cdH1cblxuXHQvKipcblx0ICpcblx0ICpcblx0ICogUGVlciBtZXNzYWdlIGhhbmRsaW5nXG5cdCAqXG5cdCAqXG5cdCAqL1xuXHRvblJlY2VpdmVGcm9tUGVlcihjaHVuaykge1xuXHRcdGlmICh0eXBlb2YgKGNodW5rKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHRoaXMucmVjZWl2ZUJ1ZmZlciArPSBjaHVuaztcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5yZWNlaXZlQnVmZmVyID0gQnVmZmVyLmNvbmNhdChbdGhpcy5yZWNlaXZlQnVmZmVyLCBjaHVua10pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGxpbmVzID0gdGhpcy5yZWNlaXZlQnVmZmVyLnRvU3RyaW5nKCkuc3BsaXQoL1xcclxcbnxcXHJ8XFxufFxcdTAwMDcvKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb250cm9sLXJlZ2V4XG5cblx0XHQvLyBJZiB0aGUgYnVmZmVyIGRvZXMgbm90IGVuZCB3aXRoIFxcclxcbiwgbW9yZSBjaHVua3MgYXJlIGNvbWluZ1xuXHRcdGlmIChsaW5lcy5wb3AoKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFJlc2V0IHRoZSBidWZmZXJcblx0XHR0aGlzLnJlY2VpdmVCdWZmZXIgPSBuZXcgQnVmZmVyKCcnKTtcblxuXHRcdGxpbmVzLmZvckVhY2goKGxpbmUpID0+IHtcblx0XHRcdGlmIChsaW5lLmxlbmd0aCAmJiAhbGluZS5zdGFydHNXaXRoKCdcXGEnKSkge1xuXHRcdFx0XHRjb25zdCBwYXJzZWRNZXNzYWdlID0gcGFyc2VNZXNzYWdlKGxpbmUpO1xuXG5cdFx0XHRcdGlmIChwZWVyQ29tbWFuZEhhbmRsZXJzW3BhcnNlZE1lc3NhZ2UuY29tbWFuZF0pIHtcblx0XHRcdFx0XHR0aGlzLmxvZyhgSGFuZGxpbmcgcGVlciBtZXNzYWdlOiAkeyBsaW5lIH1gKTtcblxuXHRcdFx0XHRcdGNvbnN0IGNvbW1hbmQgPSBwZWVyQ29tbWFuZEhhbmRsZXJzW3BhcnNlZE1lc3NhZ2UuY29tbWFuZF0uY2FsbCh0aGlzLCBwYXJzZWRNZXNzYWdlKTtcblxuXHRcdFx0XHRcdGlmIChjb21tYW5kKSB7XG5cdFx0XHRcdFx0XHR0aGlzLmxvZyhgRW1pdHRpbmcgcGVlciBjb21tYW5kIHRvIGxvY2FsOiAkeyBKU09OLnN0cmluZ2lmeShjb21tYW5kKSB9YCk7XG5cdFx0XHRcdFx0XHR0aGlzLmVtaXQoJ3BlZXJDb21tYW5kJywgY29tbWFuZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMubG9nKGBVbmhhbmRsZWQgcGVlciBtZXNzYWdlOiAkeyBKU09OLnN0cmluZ2lmeShwYXJzZWRNZXNzYWdlKSB9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKlxuXHQgKlxuXHQgKiBMb2NhbCBtZXNzYWdlIGhhbmRsaW5nXG5cdCAqXG5cdCAqXG5cdCAqL1xuXHRvblJlY2VpdmVGcm9tTG9jYWwoY29tbWFuZCwgcGFyYW1ldGVycykge1xuXHRcdGlmIChsb2NhbENvbW1hbmRIYW5kbGVyc1tjb21tYW5kXSkge1xuXHRcdFx0dGhpcy5sb2coYEhhbmRsaW5nIGxvY2FsIGNvbW1hbmQ6ICR7IGNvbW1hbmQgfWApO1xuXG5cdFx0XHRsb2NhbENvbW1hbmRIYW5kbGVyc1tjb21tYW5kXS5jYWxsKHRoaXMsIHBhcmFtZXRlcnMpO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMubG9nKGBVbmhhbmRsZWQgbG9jYWwgY29tbWFuZDogJHsgSlNPTi5zdHJpbmdpZnkoY29tbWFuZCkgfWApO1xuXHRcdH1cblx0fVxufVxuXG51dGlsLmluaGVyaXRzKFJGQzI4MTMsIEV2ZW50RW1pdHRlcik7XG5cbmV4cG9ydCBkZWZhdWx0IFJGQzI4MTM7XG4iLCJmdW5jdGlvbiByZWdpc3RlclVzZXIocGFyYW1ldGVycykge1xuXHRjb25zdCB7IG5hbWUsIHByb2ZpbGU6IHsgaXJjOiB7IG5pY2ssIHVzZXJuYW1lIH0gfSB9ID0gcGFyYW1ldGVycztcblxuXHR0aGlzLndyaXRlKHtcblx0XHRwcmVmaXg6IHRoaXMuY29uZmlnLnNlcnZlci5uYW1lLFxuXHRcdGNvbW1hbmQ6ICdOSUNLJywgcGFyYW1ldGVyczogW25pY2ssIDEsIHVzZXJuYW1lLCAnaXJjLnJvY2tldC5jaGF0JywgMSwgJytpJ10sXG5cdFx0dHJhaWxlcjogbmFtZSxcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGpvaW5DaGFubmVsKHBhcmFtZXRlcnMpIHtcblx0Y29uc3Qge1xuXHRcdHJvb206IHsgbmFtZTogcm9vbU5hbWUgfSxcblx0XHR1c2VyOiB7IHByb2ZpbGU6IHsgaXJjOiB7IG5pY2sgfSB9IH0sXG5cdH0gPSBwYXJhbWV0ZXJzO1xuXG5cdHRoaXMud3JpdGUoe1xuXHRcdHByZWZpeDogdGhpcy5jb25maWcuc2VydmVyLm5hbWUsXG5cdFx0Y29tbWFuZDogJ05KT0lOJywgcGFyYW1ldGVyczogW2AjJHsgcm9vbU5hbWUgfWBdLFxuXHRcdHRyYWlsZXI6IG5pY2ssXG5cdH0pO1xufVxuXG5mdW5jdGlvbiBqb2luZWRDaGFubmVsKHBhcmFtZXRlcnMpIHtcblx0Y29uc3Qge1xuXHRcdHJvb206IHsgbmFtZTogcm9vbU5hbWUgfSxcblx0XHR1c2VyOiB7IHByb2ZpbGU6IHsgaXJjOiB7IG5pY2sgfSB9IH0sXG5cdH0gPSBwYXJhbWV0ZXJzO1xuXG5cdHRoaXMud3JpdGUoe1xuXHRcdHByZWZpeDogbmljayxcblx0XHRjb21tYW5kOiAnSk9JTicsIHBhcmFtZXRlcnM6IFtgIyR7IHJvb21OYW1lIH1gXSxcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGxlZnRDaGFubmVsKHBhcmFtZXRlcnMpIHtcblx0Y29uc3Qge1xuXHRcdHJvb206IHsgbmFtZTogcm9vbU5hbWUgfSxcblx0XHR1c2VyOiB7IHByb2ZpbGU6IHsgaXJjOiB7IG5pY2sgfSB9IH0sXG5cdH0gPSBwYXJhbWV0ZXJzO1xuXG5cdHRoaXMud3JpdGUoe1xuXHRcdHByZWZpeDogbmljayxcblx0XHRjb21tYW5kOiAnUEFSVCcsIHBhcmFtZXRlcnM6IFtgIyR7IHJvb21OYW1lIH1gXSxcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNlbnRNZXNzYWdlKHBhcmFtZXRlcnMpIHtcblx0Y29uc3Qge1xuXHRcdHVzZXI6IHsgcHJvZmlsZTogeyBpcmM6IHsgbmljayB9IH0gfSxcblx0XHR0byxcblx0XHRtZXNzYWdlLFxuXHR9ID0gcGFyYW1ldGVycztcblxuXHR0aGlzLndyaXRlKHtcblx0XHRwcmVmaXg6IG5pY2ssXG5cdFx0Y29tbWFuZDogJ1BSSVZNU0cnLCBwYXJhbWV0ZXJzOiBbdG9dLFxuXHRcdHRyYWlsZXI6IG1lc3NhZ2UsXG5cdH0pO1xufVxuXG5mdW5jdGlvbiBkaXNjb25uZWN0ZWQocGFyYW1ldGVycykge1xuXHRjb25zdCB7XG5cdFx0dXNlcjogeyBwcm9maWxlOiB7IGlyYzogeyBuaWNrIH0gfSB9LFxuXHR9ID0gcGFyYW1ldGVycztcblxuXHR0aGlzLndyaXRlKHtcblx0XHRwcmVmaXg6IG5pY2ssXG5cdFx0Y29tbWFuZDogJ1FVSVQnLFxuXHR9KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgeyByZWdpc3RlclVzZXIsIGpvaW5DaGFubmVsLCBqb2luZWRDaGFubmVsLCBsZWZ0Q2hhbm5lbCwgc2VudE1lc3NhZ2UsIGRpc2Nvbm5lY3RlZCB9O1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiBodHRwczovL2dpdGh1Yi5jb20vbWFydHluc21pdGgvbm9kZS1pcmNcbiAqIGJ5IGh0dHBzOi8vZ2l0aHViLmNvbS9tYXJ0eW5zbWl0aFxuICovXG5cbmNvbnN0IHJlcGx5Rm9yID0gcmVxdWlyZSgnLi9jb2RlcycpO1xuXG4vKipcbiAqIHBhcnNlTWVzc2FnZShsaW5lLCBzdHJpcENvbG9ycylcbiAqXG4gKiB0YWtlcyBhIHJhdyBcImxpbmVcIiBmcm9tIHRoZSBJUkMgc2VydmVyIGFuZCB0dXJucyBpdCBpbnRvIGFuIG9iamVjdCB3aXRoXG4gKiB1c2VmdWwga2V5c1xuICogQHBhcmFtIHtTdHJpbmd9IGxpbmUgUmF3IG1lc3NhZ2UgZnJvbSBJUkMgc2VydmVyLlxuICogQHJldHVybiB7T2JqZWN0fSBBIHBhcnNlZCBtZXNzYWdlIG9iamVjdC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZU1lc3NhZ2UobGluZSkge1xuXHRjb25zdCBtZXNzYWdlID0ge307XG5cdGxldCBtYXRjaDtcblxuXHQvLyBQYXJzZSBwcmVmaXhcblx0bWF0Y2ggPSBsaW5lLm1hdGNoKC9eOihbXiBdKykgKy8pO1xuXHRpZiAobWF0Y2gpIHtcblx0XHRtZXNzYWdlLnByZWZpeCA9IG1hdGNoWzFdO1xuXHRcdGxpbmUgPSBsaW5lLnJlcGxhY2UoL146W14gXSsgKy8sICcnKTtcblx0XHRtYXRjaCA9IG1lc3NhZ2UucHJlZml4Lm1hdGNoKC9eKFtfYS16QS1aMC05XFx+XFxbXFxdXFxcXGBee318LV0qKSghKFteQF0rKUAoLiopKT8kLyk7XG5cdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRtZXNzYWdlLm5pY2sgPSBtYXRjaFsxXTtcblx0XHRcdG1lc3NhZ2UudXNlciA9IG1hdGNoWzNdO1xuXHRcdFx0bWVzc2FnZS5ob3N0ID0gbWF0Y2hbNF07XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lc3NhZ2Uuc2VydmVyID0gbWVzc2FnZS5wcmVmaXg7XG5cdFx0fVxuXHR9XG5cblx0Ly8gUGFyc2UgY29tbWFuZFxuXHRtYXRjaCA9IGxpbmUubWF0Y2goL14oW14gXSspICovKTtcblx0bWVzc2FnZS5jb21tYW5kID0gbWF0Y2hbMV07XG5cdG1lc3NhZ2UucmF3Q29tbWFuZCA9IG1hdGNoWzFdO1xuXHRtZXNzYWdlLmNvbW1hbmRUeXBlID0gJ25vcm1hbCc7XG5cdGxpbmUgPSBsaW5lLnJlcGxhY2UoL15bXiBdKyArLywgJycpO1xuXG5cdGlmIChyZXBseUZvclttZXNzYWdlLnJhd0NvbW1hbmRdKSB7XG5cdFx0bWVzc2FnZS5jb21tYW5kID0gcmVwbHlGb3JbbWVzc2FnZS5yYXdDb21tYW5kXS5uYW1lO1xuXHRcdG1lc3NhZ2UuY29tbWFuZFR5cGUgPSByZXBseUZvclttZXNzYWdlLnJhd0NvbW1hbmRdLnR5cGU7XG5cdH1cblxuXHRtZXNzYWdlLmFyZ3MgPSBbXTtcblx0bGV0IG1pZGRsZTtcblx0bGV0IHRyYWlsaW5nO1xuXG5cdC8vIFBhcnNlIHBhcmFtZXRlcnNcblx0aWYgKGxpbmUuc2VhcmNoKC9eOnxcXHMrOi8pICE9PSAtMSkge1xuXHRcdG1hdGNoID0gbGluZS5tYXRjaCgvKC4qPykoPzpeOnxcXHMrOikoLiopLyk7XG5cdFx0bWlkZGxlID0gbWF0Y2hbMV0udHJpbVJpZ2h0KCk7XG5cdFx0dHJhaWxpbmcgPSBtYXRjaFsyXTtcblx0fSBlbHNlIHtcblx0XHRtaWRkbGUgPSBsaW5lO1xuXHR9XG5cblx0aWYgKG1pZGRsZS5sZW5ndGgpIHtcblx0XHRtZXNzYWdlLmFyZ3MgPSBtaWRkbGUuc3BsaXQoLyArLyk7XG5cdH1cblxuXHRpZiAodHlwZW9mICh0cmFpbGluZykgIT09ICd1bmRlZmluZWQnICYmIHRyYWlsaW5nLmxlbmd0aCkge1xuXHRcdG1lc3NhZ2UuYXJncy5wdXNoKHRyYWlsaW5nKTtcblx0fVxuXG5cdHJldHVybiBtZXNzYWdlO1xufTtcbiIsImZ1bmN0aW9uIFBBU1MoKSB7XG5cdHRoaXMubG9nKCdSZWNlaXZlZCBQQVNTIGNvbW1hbmQsIGNvbnRpbnVlIHJlZ2lzdGVyaW5nLi4uJyk7XG5cblx0dGhpcy5yZWdpc3RlclN0ZXBzLnB1c2goJ1BBU1MnKTtcbn1cblxuZnVuY3Rpb24gU0VSVkVSKHBhcnNlZE1lc3NhZ2UpIHtcblx0dGhpcy5sb2coJ1JlY2VpdmVkIFNFUlZFUiBjb21tYW5kLCB3YWl0aW5nIGZvciBmaXJzdCBQSU5HLi4uJyk7XG5cblx0dGhpcy5zZXJ2ZXJQcmVmaXggPSBwYXJzZWRNZXNzYWdlLnByZWZpeDtcblxuXHR0aGlzLnJlZ2lzdGVyU3RlcHMucHVzaCgnU0VSVkVSJyk7XG59XG5cbmZ1bmN0aW9uIFBJTkcoKSB7XG5cdGlmICghdGhpcy5pc1JlZ2lzdGVyZWQgJiYgdGhpcy5yZWdpc3RlclN0ZXBzLmxlbmd0aCA9PT0gMikge1xuXHRcdHRoaXMubG9nKCdSZWNlaXZlZCBmaXJzdCBQSU5HIGNvbW1hbmQsIHNlcnZlciBpcyByZWdpc3RlcmVkIScpO1xuXG5cdFx0dGhpcy5pc1JlZ2lzdGVyZWQgPSB0cnVlO1xuXG5cdFx0dGhpcy5lbWl0KCdyZWdpc3RlcmVkJyk7XG5cdH1cblxuXHR0aGlzLndyaXRlKHtcblx0XHRwcmVmaXg6IHRoaXMuY29uZmlnLnNlcnZlci5uYW1lLFxuXHRcdGNvbW1hbmQ6ICdQT05HJyxcblx0XHRwYXJhbWV0ZXJzOiBbdGhpcy5jb25maWcuc2VydmVyLm5hbWVdLFxuXHR9KTtcbn1cblxuZnVuY3Rpb24gTklDSyhwYXJzZWRNZXNzYWdlKSB7XG5cdGxldCBjb21tYW5kO1xuXG5cdC8vIENoZWNrIGlmIHRoZSBtZXNzYWdlIGNvbWVzIGZyb20gdGhlIHNlcnZlcixcblx0Ly8gd2hpY2ggbWVhbnMgaXQgaXMgYSBuZXcgdXNlclxuXHRpZiAocGFyc2VkTWVzc2FnZS5wcmVmaXggPT09IHRoaXMuc2VydmVyUHJlZml4KSB7XG5cdFx0Y29tbWFuZCA9IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VyUmVnaXN0ZXJlZCcsXG5cdFx0XHRhcmdzOiB7XG5cdFx0XHRcdG5pY2s6IHBhcnNlZE1lc3NhZ2UuYXJnc1swXSxcblx0XHRcdFx0dXNlcm5hbWU6IHBhcnNlZE1lc3NhZ2UuYXJnc1syXSxcblx0XHRcdFx0aG9zdDogcGFyc2VkTWVzc2FnZS5hcmdzWzNdLFxuXHRcdFx0XHRuYW1lOiBwYXJzZWRNZXNzYWdlLmFyZ3NbNl0sXG5cdFx0XHR9LFxuXHRcdH07XG5cdH0gZWxzZSB7IC8vIE90aGVyd2lzZSwgaXQgaXMgYSBuaWNrIGNoYW5nZVxuXHRcdGNvbW1hbmQgPSB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbmlja0NoYW5nZWQnLFxuXHRcdFx0YXJnczoge1xuXHRcdFx0XHRuaWNrOiBwYXJzZWRNZXNzYWdlLm5pY2ssXG5cdFx0XHRcdG5ld05pY2s6IHBhcnNlZE1lc3NhZ2UuYXJnc1swXSxcblx0XHRcdH0sXG5cdFx0fTtcblx0fVxuXG5cdHJldHVybiBjb21tYW5kO1xufVxuXG5mdW5jdGlvbiBKT0lOKHBhcnNlZE1lc3NhZ2UpIHtcblx0Y29uc3QgY29tbWFuZCA9IHtcblx0XHRpZGVudGlmaWVyOiAnam9pbmVkQ2hhbm5lbCcsXG5cdFx0YXJnczoge1xuXHRcdFx0cm9vbU5hbWU6IHBhcnNlZE1lc3NhZ2UuYXJnc1swXS5zdWJzdHJpbmcoMSksXG5cdFx0XHRuaWNrOiBwYXJzZWRNZXNzYWdlLnByZWZpeCxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiBjb21tYW5kO1xufVxuXG5mdW5jdGlvbiBQQVJUKHBhcnNlZE1lc3NhZ2UpIHtcblx0Y29uc3QgY29tbWFuZCA9IHtcblx0XHRpZGVudGlmaWVyOiAnbGVmdENoYW5uZWwnLFxuXHRcdGFyZ3M6IHtcblx0XHRcdHJvb21OYW1lOiBwYXJzZWRNZXNzYWdlLmFyZ3NbMF0uc3Vic3RyaW5nKDEpLFxuXHRcdFx0bmljazogcGFyc2VkTWVzc2FnZS5wcmVmaXgsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gY29tbWFuZDtcbn1cblxuZnVuY3Rpb24gUFJJVk1TRyhwYXJzZWRNZXNzYWdlKSB7XG5cdGNvbnN0IGNvbW1hbmQgPSB7XG5cdFx0aWRlbnRpZmllcjogJ3NlbnRNZXNzYWdlJyxcblx0XHRhcmdzOiB7XG5cdFx0XHRuaWNrOiBwYXJzZWRNZXNzYWdlLnByZWZpeCxcblx0XHRcdG1lc3NhZ2U6IHBhcnNlZE1lc3NhZ2UuYXJnc1sxXSxcblx0XHR9LFxuXHR9O1xuXG5cdGlmIChwYXJzZWRNZXNzYWdlLmFyZ3NbMF1bMF0gPT09ICcjJykge1xuXHRcdGNvbW1hbmQuYXJncy5yb29tTmFtZSA9IHBhcnNlZE1lc3NhZ2UuYXJnc1swXS5zdWJzdHJpbmcoMSk7XG5cdH0gZWxzZSB7XG5cdFx0Y29tbWFuZC5hcmdzLnJlY2lwaWVudE5pY2sgPSBwYXJzZWRNZXNzYWdlLmFyZ3NbMF07XG5cdH1cblxuXHRyZXR1cm4gY29tbWFuZDtcbn1cblxuZnVuY3Rpb24gUVVJVChwYXJzZWRNZXNzYWdlKSB7XG5cdGNvbnN0IGNvbW1hbmQgPSB7XG5cdFx0aWRlbnRpZmllcjogJ2Rpc2Nvbm5lY3RlZCcsXG5cdFx0YXJnczoge1xuXHRcdFx0bmljazogcGFyc2VkTWVzc2FnZS5wcmVmaXgsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gY29tbWFuZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgeyBQQVNTLCBTRVJWRVIsIFBJTkcsIE5JQ0ssIEpPSU4sIFBBUlQsIFBSSVZNU0csIFFVSVQgfTtcbiJdfQ==
