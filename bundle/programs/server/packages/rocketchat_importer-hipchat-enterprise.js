(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:importer-hipchat-enterprise":{"info.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_importer-hipchat-enterprise/info.js                                                        //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.export({
  HipChatEnterpriseImporterInfo: () => HipChatEnterpriseImporterInfo
});
let ImporterInfo;
module.watch(require("meteor/rocketchat:importer"), {
  ImporterInfo(v) {
    ImporterInfo = v;
  }

}, 0);

class HipChatEnterpriseImporterInfo extends ImporterInfo {
  constructor() {
    super('hipchatenterprise', 'HipChat (tar.gz)', 'application/gzip', [{
      text: 'Importer_HipChatEnterprise_Information',
      href: 'https://rocket.chat/docs/administrator-guides/import/hipchat/enterprise/'
    }]);
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"importer.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_importer-hipchat-enterprise/server/importer.js                                             //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.export({
  HipChatEnterpriseImporter: () => HipChatEnterpriseImporter
});
let Base, ProgressStep, Selection, SelectionChannel, SelectionUser;
module.watch(require("meteor/rocketchat:importer"), {
  Base(v) {
    Base = v;
  },

  ProgressStep(v) {
    ProgressStep = v;
  },

  Selection(v) {
    Selection = v;
  },

  SelectionChannel(v) {
    SelectionChannel = v;
  },

  SelectionUser(v) {
    SelectionUser = v;
  }

}, 0);
let Readable;
module.watch(require("stream"), {
  Readable(v) {
    Readable = v;
  }

}, 1);
let path;
module.watch(require("path"), {
  default(v) {
    path = v;
  }

}, 2);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 3);

class HipChatEnterpriseImporter extends Base {
  constructor(info) {
    super(info);
    this.Readable = Readable;
    this.zlib = require('zlib');
    this.tarStream = require('tar-stream');
    this.extract = this.tarStream.extract();
    this.path = path;
    this.messages = new Map();
    this.directMessages = new Map();
  }

  prepare(dataURI, sentContentType, fileName) {
    super.prepare(dataURI, sentContentType, fileName);
    const tempUsers = [];
    const tempRooms = [];
    const tempMessages = new Map();
    const tempDirectMessages = new Map();
    const promise = new Promise((resolve, reject) => {
      this.extract.on('entry', Meteor.bindEnvironment((header, stream, next) => {
        if (!header.name.endsWith('.json')) {
          stream.resume();
          return next();
        }

        const info = this.path.parse(header.name);
        const data = [];
        stream.on('data', Meteor.bindEnvironment(chunk => {
          data.push(chunk);
        }));
        stream.on('end', Meteor.bindEnvironment(() => {
          this.logger.debug(`Processing the file: ${header.name}`);
          const dataString = Buffer.concat(data).toString();
          const file = JSON.parse(dataString);

          if (info.base === 'users.json') {
            super.updateProgress(ProgressStep.PREPARING_USERS);

            for (const u of file) {
              if (!u.User.email) {
                continue;
              }

              tempUsers.push({
                id: u.User.id,
                email: u.User.email,
                name: u.User.name,
                username: u.User.mention_name,
                avatar: u.User.avatar && u.User.avatar.replace(/\n/g, ''),
                timezone: u.User.timezone,
                isDeleted: u.User.is_deleted
              });
            }
          } else if (info.base === 'rooms.json') {
            super.updateProgress(ProgressStep.PREPARING_CHANNELS);

            for (const r of file) {
              tempRooms.push({
                id: r.Room.id,
                creator: r.Room.owner,
                created: new Date(r.Room.created),
                name: s.slugify(r.Room.name),
                isPrivate: r.Room.privacy === 'private',
                isArchived: r.Room.is_archived,
                topic: r.Room.topic
              });
            }
          } else if (info.base === 'history.json') {
            const [type, id] = info.dir.split('/'); //['users', '1']

            const roomIdentifier = `${type}/${id}`;

            if (type === 'users') {
              const msgs = [];

              for (const m of file) {
                if (m.PrivateUserMessage) {
                  msgs.push({
                    type: 'user',
                    id: `hipchatenterprise-${m.PrivateUserMessage.id}`,
                    senderId: m.PrivateUserMessage.sender.id,
                    receiverId: m.PrivateUserMessage.receiver.id,
                    text: m.PrivateUserMessage.message.indexOf('/me ') === -1 ? m.PrivateUserMessage.message : `${m.PrivateUserMessage.message.replace(/\/me /, '_')}_`,
                    ts: new Date(m.PrivateUserMessage.timestamp.split(' ')[0])
                  });
                }
              }

              tempDirectMessages.set(roomIdentifier, msgs);
            } else if (type === 'rooms') {
              const roomMsgs = [];

              for (const m of file) {
                if (m.UserMessage) {
                  roomMsgs.push({
                    type: 'user',
                    id: `hipchatenterprise-${id}-${m.UserMessage.id}`,
                    userId: m.UserMessage.sender.id,
                    text: m.UserMessage.message.indexOf('/me ') === -1 ? m.UserMessage.message : `${m.UserMessage.message.replace(/\/me /, '_')}_`,
                    ts: new Date(m.UserMessage.timestamp.split(' ')[0])
                  });
                } else if (m.NotificationMessage) {
                  roomMsgs.push({
                    type: 'user',
                    id: `hipchatenterprise-${id}-${m.NotificationMessage.id}`,
                    userId: 'rocket.cat',
                    alias: m.NotificationMessage.sender,
                    text: m.NotificationMessage.message.indexOf('/me ') === -1 ? m.NotificationMessage.message : `${m.NotificationMessage.message.replace(/\/me /, '_')}_`,
                    ts: new Date(m.NotificationMessage.timestamp.split(' ')[0])
                  });
                } else if (m.TopicRoomMessage) {
                  roomMsgs.push({
                    type: 'topic',
                    id: `hipchatenterprise-${id}-${m.TopicRoomMessage.id}`,
                    userId: m.TopicRoomMessage.sender.id,
                    ts: new Date(m.TopicRoomMessage.timestamp.split(' ')[0]),
                    text: m.TopicRoomMessage.message
                  });
                } else {
                  this.logger.warn('HipChat Enterprise importer isn\'t configured to handle this message:', m);
                }
              }

              tempMessages.set(roomIdentifier, roomMsgs);
            } else {
              this.logger.warn(`HipChat Enterprise importer isn't configured to handle "${type}" files.`);
            }
          } else {
            //What are these files!?
            this.logger.warn(`HipChat Enterprise importer doesn't know what to do with the file "${header.name}" :o`, info);
          }

          next();
        }));
        stream.on('error', () => next());
        stream.resume();
      }));
      this.extract.on('error', err => {
        this.logger.warn('extract error:', err);
        reject();
      });
      this.extract.on('finish', Meteor.bindEnvironment(() => {
        // Insert the users record, eventually this might have to be split into several ones as well
        // if someone tries to import a several thousands users instance
        const usersId = this.collection.insert({
          'import': this.importRecord._id,
          'importer': this.name,
          'type': 'users',
          'users': tempUsers
        });
        this.users = this.collection.findOne(usersId);
        super.updateRecord({
          'count.users': tempUsers.length
        });
        super.addCountToTotal(tempUsers.length); // Insert the channels records.

        const channelsId = this.collection.insert({
          'import': this.importRecord._id,
          'importer': this.name,
          'type': 'channels',
          'channels': tempRooms
        });
        this.channels = this.collection.findOne(channelsId);
        super.updateRecord({
          'count.channels': tempRooms.length
        });
        super.addCountToTotal(tempRooms.length); // Save the messages records to the import record for `startImport` usage

        super.updateProgress(ProgressStep.PREPARING_MESSAGES);
        let messagesCount = 0;

        for (const [channel, msgs] of tempMessages.entries()) {
          if (!this.messages.get(channel)) {
            this.messages.set(channel, new Map());
          }

          messagesCount += msgs.length;
          super.updateRecord({
            'messagesstatus': channel
          });

          if (Base.getBSONSize(msgs) > Base.getMaxBSONSize()) {
            Base.getBSONSafeArraysFromAnArray(msgs).forEach((splitMsg, i) => {
              const messagesId = this.collection.insert({
                'import': this.importRecord._id,
                'importer': this.name,
                'type': 'messages',
                'name': `${channel}/${i}`,
                'messages': splitMsg
              });
              this.messages.get(channel).set(`${channel}.${i}`, this.collection.findOne(messagesId));
            });
          } else {
            const messagesId = this.collection.insert({
              'import': this.importRecord._id,
              'importer': this.name,
              'type': 'messages',
              'name': `${channel}`,
              'messages': msgs
            });
            this.messages.get(channel).set(channel, this.collection.findOne(messagesId));
          }
        }

        for (const [directMsgUser, msgs] of tempDirectMessages.entries()) {
          this.logger.debug(`Preparing the direct messages for: ${directMsgUser}`);

          if (!this.directMessages.get(directMsgUser)) {
            this.directMessages.set(directMsgUser, new Map());
          }

          messagesCount += msgs.length;
          super.updateRecord({
            'messagesstatus': directMsgUser
          });

          if (Base.getBSONSize(msgs) > Base.getMaxBSONSize()) {
            Base.getBSONSafeArraysFromAnArray(msgs).forEach((splitMsg, i) => {
              const messagesId = this.collection.insert({
                'import': this.importRecord._id,
                'importer': this.name,
                'type': 'directMessages',
                'name': `${directMsgUser}/${i}`,
                'messages': splitMsg
              });
              this.directMessages.get(directMsgUser).set(`${directMsgUser}.${i}`, this.collection.findOne(messagesId));
            });
          } else {
            const messagesId = this.collection.insert({
              'import': this.importRecord._id,
              'importer': this.name,
              'type': 'directMessages',
              'name': `${directMsgUser}`,
              'messages': msgs
            });
            this.directMessages.get(directMsgUser).set(directMsgUser, this.collection.findOne(messagesId));
          }
        }

        super.updateRecord({
          'count.messages': messagesCount,
          'messagesstatus': null
        });
        super.addCountToTotal(messagesCount); //Ensure we have some users, channels, and messages

        if (tempUsers.length === 0 || tempRooms.length === 0 || messagesCount === 0) {
          this.logger.warn(`The loaded users count ${tempUsers.length}, the loaded rooms ${tempRooms.length}, and the loaded messages ${messagesCount}`);
          super.updateProgress(ProgressStep.ERROR);
          reject();
          return;
        }

        const selectionUsers = tempUsers.map(u => new SelectionUser(u.id, u.username, u.email, u.isDeleted, false, true));
        const selectionChannels = tempRooms.map(r => new SelectionChannel(r.id, r.name, r.isArchived, true, r.isPrivate));
        const selectionMessages = this.importRecord.count.messages;
        super.updateProgress(ProgressStep.USER_SELECTION);
        resolve(new Selection(this.name, selectionUsers, selectionChannels, selectionMessages));
      })); //Wish I could make this cleaner :(

      const split = dataURI.split(',');
      const read = new this.Readable();
      read.push(new Buffer(split[split.length - 1], 'base64'));
      read.push(null);
      read.pipe(this.zlib.createGunzip()).pipe(this.extract);
    });
    return promise;
  }

  startImport(importSelection) {
    super.startImport(importSelection);
    const started = Date.now(); //Ensure we're only going to import the users that the user has selected

    for (const user of importSelection.users) {
      for (const u of this.users.users) {
        if (u.id === user.user_id) {
          u.do_import = user.do_import;
        }
      }
    }

    this.collection.update({
      _id: this.users._id
    }, {
      $set: {
        'users': this.users.users
      }
    }); //Ensure we're only importing the channels the user has selected.

    for (const channel of importSelection.channels) {
      for (const c of this.channels.channels) {
        if (c.id === channel.channel_id) {
          c.do_import = channel.do_import;
        }
      }
    }

    this.collection.update({
      _id: this.channels._id
    }, {
      $set: {
        'channels': this.channels.channels
      }
    });
    const startedByUserId = Meteor.userId();
    Meteor.defer(() => {
      super.updateProgress(ProgressStep.IMPORTING_USERS);

      try {
        //Import the users
        for (const u of this.users.users) {
          this.logger.debug(`Starting the user import: ${u.username} and are we importing them? ${u.do_import}`);

          if (!u.do_import) {
            continue;
          }

          Meteor.runAsUser(startedByUserId, () => {
            let existantUser = RocketChat.models.Users.findOneByEmailAddress(u.email); //If we couldn't find one by their email address, try to find an existing user by their username

            if (!existantUser) {
              existantUser = RocketChat.models.Users.findOneByUsername(u.username);
            }

            if (existantUser) {
              //since we have an existing user, let's try a few things
              u.rocketId = existantUser._id;
              RocketChat.models.Users.update({
                _id: u.rocketId
              }, {
                $addToSet: {
                  importIds: u.id
                }
              });
            } else {
              const userId = Accounts.createUser({
                email: u.email,
                password: Random.id()
              });
              Meteor.runAsUser(userId, () => {
                Meteor.call('setUsername', u.username, {
                  joinDefaultChannelsSilenced: true
                }); //TODO: Use moment timezone to calc the time offset - Meteor.call 'userSetUtcOffset', user.tz_offset / 3600

                RocketChat.models.Users.setName(userId, u.name); //TODO: Think about using a custom field for the users "title" field

                if (u.avatar) {
                  Meteor.call('setAvatarFromService', `data:image/png;base64,${u.avatar}`);
                } //Deleted users are 'inactive' users in Rocket.Chat


                if (u.deleted) {
                  Meteor.call('setUserActiveStatus', userId, false);
                }

                RocketChat.models.Users.update({
                  _id: userId
                }, {
                  $addToSet: {
                    importIds: u.id
                  }
                });
                u.rocketId = userId;
              });
            }

            super.addCountCompleted(1);
          });
        }

        this.collection.update({
          _id: this.users._id
        }, {
          $set: {
            'users': this.users.users
          }
        }); //Import the channels

        super.updateProgress(ProgressStep.IMPORTING_CHANNELS);

        for (const c of this.channels.channels) {
          if (!c.do_import) {
            continue;
          }

          Meteor.runAsUser(startedByUserId, () => {
            const existantRoom = RocketChat.models.Rooms.findOneByName(c.name); //If the room exists or the name of it is 'general', then we don't need to create it again

            if (existantRoom || c.name.toUpperCase() === 'GENERAL') {
              c.rocketId = c.name.toUpperCase() === 'GENERAL' ? 'GENERAL' : existantRoom._id;
              RocketChat.models.Rooms.update({
                _id: c.rocketId
              }, {
                $addToSet: {
                  importIds: c.id
                }
              });
            } else {
              //Find the rocketchatId of the user who created this channel
              let creatorId = startedByUserId;

              for (const u of this.users.users) {
                if (u.id === c.creator && u.do_import) {
                  creatorId = u.rocketId;
                }
              } //Create the channel


              Meteor.runAsUser(creatorId, () => {
                const roomInfo = Meteor.call(c.isPrivate ? 'createPrivateGroup' : 'createChannel', c.name, []);
                c.rocketId = roomInfo.rid;
              });
              RocketChat.models.Rooms.update({
                _id: c.rocketId
              }, {
                $set: {
                  ts: c.created,
                  topic: c.topic
                },
                $addToSet: {
                  importIds: c.id
                }
              });
            }

            super.addCountCompleted(1);
          });
        }

        this.collection.update({
          _id: this.channels._id
        }, {
          $set: {
            'channels': this.channels.channels
          }
        }); //Import the Messages

        super.updateProgress(ProgressStep.IMPORTING_MESSAGES);

        for (const [ch, messagesMap] of this.messages.entries()) {
          const hipChannel = this.getChannelFromRoomIdentifier(ch);

          if (!hipChannel.do_import) {
            continue;
          }

          const room = RocketChat.models.Rooms.findOneById(hipChannel.rocketId, {
            fields: {
              usernames: 1,
              t: 1,
              name: 1
            }
          });
          Meteor.runAsUser(startedByUserId, () => {
            for (const [msgGroupData, msgs] of messagesMap.entries()) {
              super.updateRecord({
                'messagesstatus': `${ch}/${msgGroupData}.${msgs.messages.length}`
              });

              for (const msg of msgs.messages) {
                if (isNaN(msg.ts)) {
                  this.logger.warn(`Timestamp on a message in ${ch}/${msgGroupData} is invalid`);
                  super.addCountCompleted(1);
                  continue;
                }

                const creator = this.getRocketUserFromUserId(msg.userId);

                if (creator) {
                  switch (msg.type) {
                    case 'user':
                      RocketChat.sendMessage(creator, {
                        _id: msg.id,
                        ts: msg.ts,
                        msg: msg.text,
                        rid: room._id,
                        alias: msg.alias,
                        u: {
                          _id: creator._id,
                          username: creator.username
                        }
                      }, room, true);
                      break;

                    case 'topic':
                      RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_topic', room._id, msg.text, creator, {
                        _id: msg.id,
                        ts: msg.ts
                      });
                      break;
                  }
                }

                super.addCountCompleted(1);
              }
            }
          });
        } //Import the Direct Messages


        for (const [directMsgRoom, directMessagesMap] of this.directMessages.entries()) {
          const hipUser = this.getUserFromDirectMessageIdentifier(directMsgRoom);

          if (!hipUser.do_import) {
            continue;
          } //Verify this direct message user's room is valid (confusing but idk how else to explain it)


          if (!this.getRocketUserFromUserId(hipUser.id)) {
            continue;
          }

          for (const [msgGroupData, msgs] of directMessagesMap.entries()) {
            super.updateRecord({
              'messagesstatus': `${directMsgRoom}/${msgGroupData}.${msgs.messages.length}`
            });

            for (const msg of msgs.messages) {
              if (isNaN(msg.ts)) {
                this.logger.warn(`Timestamp on a message in ${directMsgRoom}/${msgGroupData} is invalid`);
                super.addCountCompleted(1);
                continue;
              } //make sure the message sender is a valid user inside rocket.chat


              const sender = this.getRocketUserFromUserId(msg.senderId);

              if (!sender) {
                continue;
              } //make sure the receiver of the message is a valid rocket.chat user


              const receiver = this.getRocketUserFromUserId(msg.receiverId);

              if (!receiver) {
                continue;
              }

              let room = RocketChat.models.Rooms.findOneById([receiver._id, sender._id].sort().join(''));

              if (!room) {
                Meteor.runAsUser(sender._id, () => {
                  const roomInfo = Meteor.call('createDirectMessage', receiver.username);
                  room = RocketChat.models.Rooms.findOneById(roomInfo.rid);
                });
              }

              Meteor.runAsUser(sender._id, () => {
                RocketChat.sendMessage(sender, {
                  _id: msg.id,
                  ts: msg.ts,
                  msg: msg.text,
                  rid: room._id,
                  u: {
                    _id: sender._id,
                    username: sender.username
                  }
                }, room, true);
              });
            }
          }
        }

        super.updateProgress(ProgressStep.FINISHING);
        super.updateProgress(ProgressStep.DONE);
      } catch (e) {
        this.logger.error(e);
        super.updateProgress(ProgressStep.ERROR);
      }

      const timeTook = Date.now() - started;
      this.logger.log(`HipChat Enterprise Import took ${timeTook} milliseconds.`);
    });
    return super.getProgress();
  }

  getSelection() {
    const selectionUsers = this.users.users.map(u => new SelectionUser(u.id, u.username, u.email, false, false, true));
    const selectionChannels = this.channels.channels.map(c => new SelectionChannel(c.id, c.name, false, true, c.isPrivate));
    const selectionMessages = this.importRecord.count.messages;
    return new Selection(this.name, selectionUsers, selectionChannels, selectionMessages);
  }

  getChannelFromRoomIdentifier(roomIdentifier) {
    for (const ch of this.channels.channels) {
      if (`rooms/${ch.id}` === roomIdentifier) {
        return ch;
      }
    }
  }

  getUserFromDirectMessageIdentifier(directIdentifier) {
    for (const u of this.users.users) {
      if (`users/${u.id}` === directIdentifier) {
        return u;
      }
    }
  }

  getRocketUserFromUserId(userId) {
    for (const u of this.users.users) {
      if (u.id === userId) {
        return RocketChat.models.Users.findOneById(u.rocketId, {
          fields: {
            username: 1
          }
        });
      }
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"adder.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_importer-hipchat-enterprise/server/adder.js                                                //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
let Importers;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  }

}, 0);
let HipChatEnterpriseImporterInfo;
module.watch(require("../info"), {
  HipChatEnterpriseImporterInfo(v) {
    HipChatEnterpriseImporterInfo = v;
  }

}, 1);
let HipChatEnterpriseImporter;
module.watch(require("./importer"), {
  HipChatEnterpriseImporter(v) {
    HipChatEnterpriseImporter = v;
  }

}, 2);
Importers.add(new HipChatEnterpriseImporterInfo(), HipChatEnterpriseImporter);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:importer-hipchat-enterprise/info.js");
require("/node_modules/meteor/rocketchat:importer-hipchat-enterprise/server/importer.js");
require("/node_modules/meteor/rocketchat:importer-hipchat-enterprise/server/adder.js");

/* Exports */
Package._define("rocketchat:importer-hipchat-enterprise");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_importer-hipchat-enterprise.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1oaXBjaGF0LWVudGVycHJpc2UvaW5mby5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1oaXBjaGF0LWVudGVycHJpc2Uvc2VydmVyL2ltcG9ydGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyLWhpcGNoYXQtZW50ZXJwcmlzZS9zZXJ2ZXIvYWRkZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlckluZm8iLCJJbXBvcnRlckluZm8iLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiY29uc3RydWN0b3IiLCJ0ZXh0IiwiaHJlZiIsIkhpcENoYXRFbnRlcnByaXNlSW1wb3J0ZXIiLCJCYXNlIiwiUHJvZ3Jlc3NTdGVwIiwiU2VsZWN0aW9uIiwiU2VsZWN0aW9uQ2hhbm5lbCIsIlNlbGVjdGlvblVzZXIiLCJSZWFkYWJsZSIsInBhdGgiLCJkZWZhdWx0IiwicyIsImluZm8iLCJ6bGliIiwidGFyU3RyZWFtIiwiZXh0cmFjdCIsIm1lc3NhZ2VzIiwiTWFwIiwiZGlyZWN0TWVzc2FnZXMiLCJwcmVwYXJlIiwiZGF0YVVSSSIsInNlbnRDb250ZW50VHlwZSIsImZpbGVOYW1lIiwidGVtcFVzZXJzIiwidGVtcFJvb21zIiwidGVtcE1lc3NhZ2VzIiwidGVtcERpcmVjdE1lc3NhZ2VzIiwicHJvbWlzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib24iLCJNZXRlb3IiLCJiaW5kRW52aXJvbm1lbnQiLCJoZWFkZXIiLCJzdHJlYW0iLCJuZXh0IiwibmFtZSIsImVuZHNXaXRoIiwicmVzdW1lIiwicGFyc2UiLCJkYXRhIiwiY2h1bmsiLCJwdXNoIiwibG9nZ2VyIiwiZGVidWciLCJkYXRhU3RyaW5nIiwiQnVmZmVyIiwiY29uY2F0IiwidG9TdHJpbmciLCJmaWxlIiwiSlNPTiIsImJhc2UiLCJ1cGRhdGVQcm9ncmVzcyIsIlBSRVBBUklOR19VU0VSUyIsInUiLCJVc2VyIiwiZW1haWwiLCJpZCIsInVzZXJuYW1lIiwibWVudGlvbl9uYW1lIiwiYXZhdGFyIiwicmVwbGFjZSIsInRpbWV6b25lIiwiaXNEZWxldGVkIiwiaXNfZGVsZXRlZCIsIlBSRVBBUklOR19DSEFOTkVMUyIsInIiLCJSb29tIiwiY3JlYXRvciIsIm93bmVyIiwiY3JlYXRlZCIsIkRhdGUiLCJzbHVnaWZ5IiwiaXNQcml2YXRlIiwicHJpdmFjeSIsImlzQXJjaGl2ZWQiLCJpc19hcmNoaXZlZCIsInRvcGljIiwidHlwZSIsImRpciIsInNwbGl0Iiwicm9vbUlkZW50aWZpZXIiLCJtc2dzIiwibSIsIlByaXZhdGVVc2VyTWVzc2FnZSIsInNlbmRlcklkIiwic2VuZGVyIiwicmVjZWl2ZXJJZCIsInJlY2VpdmVyIiwibWVzc2FnZSIsImluZGV4T2YiLCJ0cyIsInRpbWVzdGFtcCIsInNldCIsInJvb21Nc2dzIiwiVXNlck1lc3NhZ2UiLCJ1c2VySWQiLCJOb3RpZmljYXRpb25NZXNzYWdlIiwiYWxpYXMiLCJUb3BpY1Jvb21NZXNzYWdlIiwid2FybiIsImVyciIsInVzZXJzSWQiLCJjb2xsZWN0aW9uIiwiaW5zZXJ0IiwiaW1wb3J0UmVjb3JkIiwiX2lkIiwidXNlcnMiLCJmaW5kT25lIiwidXBkYXRlUmVjb3JkIiwibGVuZ3RoIiwiYWRkQ291bnRUb1RvdGFsIiwiY2hhbm5lbHNJZCIsImNoYW5uZWxzIiwiUFJFUEFSSU5HX01FU1NBR0VTIiwibWVzc2FnZXNDb3VudCIsImNoYW5uZWwiLCJlbnRyaWVzIiwiZ2V0IiwiZ2V0QlNPTlNpemUiLCJnZXRNYXhCU09OU2l6ZSIsImdldEJTT05TYWZlQXJyYXlzRnJvbUFuQXJyYXkiLCJmb3JFYWNoIiwic3BsaXRNc2ciLCJpIiwibWVzc2FnZXNJZCIsImRpcmVjdE1zZ1VzZXIiLCJFUlJPUiIsInNlbGVjdGlvblVzZXJzIiwibWFwIiwic2VsZWN0aW9uQ2hhbm5lbHMiLCJzZWxlY3Rpb25NZXNzYWdlcyIsImNvdW50IiwiVVNFUl9TRUxFQ1RJT04iLCJyZWFkIiwicGlwZSIsImNyZWF0ZUd1bnppcCIsInN0YXJ0SW1wb3J0IiwiaW1wb3J0U2VsZWN0aW9uIiwic3RhcnRlZCIsIm5vdyIsInVzZXIiLCJ1c2VyX2lkIiwiZG9faW1wb3J0IiwidXBkYXRlIiwiJHNldCIsImMiLCJjaGFubmVsX2lkIiwic3RhcnRlZEJ5VXNlcklkIiwiZGVmZXIiLCJJTVBPUlRJTkdfVVNFUlMiLCJydW5Bc1VzZXIiLCJleGlzdGFudFVzZXIiLCJSb2NrZXRDaGF0IiwibW9kZWxzIiwiVXNlcnMiLCJmaW5kT25lQnlFbWFpbEFkZHJlc3MiLCJmaW5kT25lQnlVc2VybmFtZSIsInJvY2tldElkIiwiJGFkZFRvU2V0IiwiaW1wb3J0SWRzIiwiQWNjb3VudHMiLCJjcmVhdGVVc2VyIiwicGFzc3dvcmQiLCJSYW5kb20iLCJjYWxsIiwiam9pbkRlZmF1bHRDaGFubmVsc1NpbGVuY2VkIiwic2V0TmFtZSIsImRlbGV0ZWQiLCJhZGRDb3VudENvbXBsZXRlZCIsIklNUE9SVElOR19DSEFOTkVMUyIsImV4aXN0YW50Um9vbSIsIlJvb21zIiwiZmluZE9uZUJ5TmFtZSIsInRvVXBwZXJDYXNlIiwiY3JlYXRvcklkIiwicm9vbUluZm8iLCJyaWQiLCJJTVBPUlRJTkdfTUVTU0FHRVMiLCJjaCIsIm1lc3NhZ2VzTWFwIiwiaGlwQ2hhbm5lbCIsImdldENoYW5uZWxGcm9tUm9vbUlkZW50aWZpZXIiLCJyb29tIiwiZmluZE9uZUJ5SWQiLCJmaWVsZHMiLCJ1c2VybmFtZXMiLCJ0IiwibXNnR3JvdXBEYXRhIiwibXNnIiwiaXNOYU4iLCJnZXRSb2NrZXRVc2VyRnJvbVVzZXJJZCIsInNlbmRNZXNzYWdlIiwiTWVzc2FnZXMiLCJjcmVhdGVSb29tU2V0dGluZ3NDaGFuZ2VkV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsImRpcmVjdE1zZ1Jvb20iLCJkaXJlY3RNZXNzYWdlc01hcCIsImhpcFVzZXIiLCJnZXRVc2VyRnJvbURpcmVjdE1lc3NhZ2VJZGVudGlmaWVyIiwic29ydCIsImpvaW4iLCJGSU5JU0hJTkciLCJET05FIiwiZSIsImVycm9yIiwidGltZVRvb2siLCJsb2ciLCJnZXRQcm9ncmVzcyIsImdldFNlbGVjdGlvbiIsImRpcmVjdElkZW50aWZpZXIiLCJJbXBvcnRlcnMiLCJhZGQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLGlDQUE4QixNQUFJQTtBQUFuQyxDQUFkO0FBQWlGLElBQUlDLFlBQUo7QUFBaUJILE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSw0QkFBUixDQUFiLEVBQW1EO0FBQUNGLGVBQWFHLENBQWIsRUFBZTtBQUFDSCxtQkFBYUcsQ0FBYjtBQUFlOztBQUFoQyxDQUFuRCxFQUFxRixDQUFyRjs7QUFFM0YsTUFBTUosNkJBQU4sU0FBNENDLFlBQTVDLENBQXlEO0FBQy9ESSxnQkFBYztBQUNiLFVBQU0sbUJBQU4sRUFBMkIsa0JBQTNCLEVBQStDLGtCQUEvQyxFQUFtRSxDQUNsRTtBQUNDQyxZQUFNLHdDQURQO0FBRUNDLFlBQU07QUFGUCxLQURrRSxDQUFuRTtBQU1BOztBQVI4RCxDOzs7Ozs7Ozs7OztBQ0ZoRVQsT0FBT0MsTUFBUCxDQUFjO0FBQUNTLDZCQUEwQixNQUFJQTtBQUEvQixDQUFkO0FBQXlFLElBQUlDLElBQUosRUFBU0MsWUFBVCxFQUFzQkMsU0FBdEIsRUFBZ0NDLGdCQUFoQyxFQUFpREMsYUFBakQ7QUFBK0RmLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSw0QkFBUixDQUFiLEVBQW1EO0FBQUNNLE9BQUtMLENBQUwsRUFBTztBQUFDSyxXQUFLTCxDQUFMO0FBQU8sR0FBaEI7O0FBQWlCTSxlQUFhTixDQUFiLEVBQWU7QUFBQ00sbUJBQWFOLENBQWI7QUFBZSxHQUFoRDs7QUFBaURPLFlBQVVQLENBQVYsRUFBWTtBQUFDTyxnQkFBVVAsQ0FB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LENBQWIsRUFBZ0M7QUFBQ0gsZ0NBQThCSSxDQUE5QixFQUFnQztBQUFDSixvQ0FBOEJJLENBQTlCO0FBQWdDOztBQUFsRSxDQUFoQyxFQUFvRyxDQUFwRztBQUF1RyxJQUFJSSx5QkFBSjtBQUE4QlYsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDSyw0QkFBMEJKLENBQTFCLEVBQTRCO0FBQUNJLGdDQUEwQkosQ0FBMUI7QUFBNEI7O0FBQTFELENBQW5DLEVBQStGLENBQS9GO0FBSXZRcU4sVUFBVUMsR0FBVixDQUFjLElBQUkxTiw2QkFBSixFQUFkLEVBQW1EUSx5QkFBbkQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9pbXBvcnRlci1oaXBjaGF0LWVudGVycHJpc2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbXBvcnRlckluZm8gfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5cbmV4cG9ydCBjbGFzcyBIaXBDaGF0RW50ZXJwcmlzZUltcG9ydGVySW5mbyBleHRlbmRzIEltcG9ydGVySW5mbyB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdoaXBjaGF0ZW50ZXJwcmlzZScsICdIaXBDaGF0ICh0YXIuZ3opJywgJ2FwcGxpY2F0aW9uL2d6aXAnLCBbXG5cdFx0XHR7XG5cdFx0XHRcdHRleHQ6ICdJbXBvcnRlcl9IaXBDaGF0RW50ZXJwcmlzZV9JbmZvcm1hdGlvbicsXG5cdFx0XHRcdGhyZWY6ICdodHRwczovL3JvY2tldC5jaGF0L2RvY3MvYWRtaW5pc3RyYXRvci1ndWlkZXMvaW1wb3J0L2hpcGNoYXQvZW50ZXJwcmlzZS8nXG5cdFx0XHR9XG5cdFx0XSk7XG5cdH1cbn1cbiIsImltcG9ydCB7XG5cdEJhc2UsXG5cdFByb2dyZXNzU3RlcCxcblx0U2VsZWN0aW9uLFxuXHRTZWxlY3Rpb25DaGFubmVsLFxuXHRTZWxlY3Rpb25Vc2VyXG59IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmltcG9ydGVyJztcbmltcG9ydCB7UmVhZGFibGV9IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcblxuZXhwb3J0IGNsYXNzIEhpcENoYXRFbnRlcnByaXNlSW1wb3J0ZXIgZXh0ZW5kcyBCYXNlIHtcblx0Y29uc3RydWN0b3IoaW5mbykge1xuXHRcdHN1cGVyKGluZm8pO1xuXG5cdFx0dGhpcy5SZWFkYWJsZSA9IFJlYWRhYmxlO1xuXHRcdHRoaXMuemxpYiA9IHJlcXVpcmUoJ3psaWInKTtcblx0XHR0aGlzLnRhclN0cmVhbSA9IHJlcXVpcmUoJ3Rhci1zdHJlYW0nKTtcblx0XHR0aGlzLmV4dHJhY3QgPSB0aGlzLnRhclN0cmVhbS5leHRyYWN0KCk7XG5cdFx0dGhpcy5wYXRoID0gcGF0aDtcblx0XHR0aGlzLm1lc3NhZ2VzID0gbmV3IE1hcCgpO1xuXHRcdHRoaXMuZGlyZWN0TWVzc2FnZXMgPSBuZXcgTWFwKCk7XG5cdH1cblxuXHRwcmVwYXJlKGRhdGFVUkksIHNlbnRDb250ZW50VHlwZSwgZmlsZU5hbWUpIHtcblx0XHRzdXBlci5wcmVwYXJlKGRhdGFVUkksIHNlbnRDb250ZW50VHlwZSwgZmlsZU5hbWUpO1xuXG5cdFx0Y29uc3QgdGVtcFVzZXJzID0gW107XG5cdFx0Y29uc3QgdGVtcFJvb21zID0gW107XG5cdFx0Y29uc3QgdGVtcE1lc3NhZ2VzID0gbmV3IE1hcCgpO1xuXHRcdGNvbnN0IHRlbXBEaXJlY3RNZXNzYWdlcyA9IG5ldyBNYXAoKTtcblx0XHRjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0dGhpcy5leHRyYWN0Lm9uKCdlbnRyeScsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGhlYWRlciwgc3RyZWFtLCBuZXh0KSA9PiB7XG5cdFx0XHRcdGlmICghaGVhZGVyLm5hbWUuZW5kc1dpdGgoJy5qc29uJykpIHtcblx0XHRcdFx0XHRzdHJlYW0ucmVzdW1lKCk7XG5cdFx0XHRcdFx0cmV0dXJuIG5leHQoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGluZm8gPSB0aGlzLnBhdGgucGFyc2UoaGVhZGVyLm5hbWUpO1xuXHRcdFx0XHRjb25zdCBkYXRhID0gW107XG5cblx0XHRcdFx0c3RyZWFtLm9uKCdkYXRhJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoY2h1bmspID0+IHtcblx0XHRcdFx0XHRkYXRhLnB1c2goY2h1bmspO1xuXHRcdFx0XHR9KSk7XG5cblx0XHRcdFx0c3RyZWFtLm9uKCdlbmQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZyhgUHJvY2Vzc2luZyB0aGUgZmlsZTogJHsgaGVhZGVyLm5hbWUgfWApO1xuXHRcdFx0XHRcdGNvbnN0IGRhdGFTdHJpbmcgPSBCdWZmZXIuY29uY2F0KGRhdGEpLnRvU3RyaW5nKCk7XG5cdFx0XHRcdFx0Y29uc3QgZmlsZSA9IEpTT04ucGFyc2UoZGF0YVN0cmluZyk7XG5cblx0XHRcdFx0XHRpZiAoaW5mby5iYXNlID09PSAndXNlcnMuanNvbicpIHtcblx0XHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5QUkVQQVJJTkdfVVNFUlMpO1xuXHRcdFx0XHRcdFx0Zm9yIChjb25zdCB1IG9mIGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCF1LlVzZXIuZW1haWwpIHtcblx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0ZW1wVXNlcnMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0aWQ6IHUuVXNlci5pZCxcblx0XHRcdFx0XHRcdFx0XHRlbWFpbDogdS5Vc2VyLmVtYWlsLFxuXHRcdFx0XHRcdFx0XHRcdG5hbWU6IHUuVXNlci5uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiB1LlVzZXIubWVudGlvbl9uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdGF2YXRhcjogdS5Vc2VyLmF2YXRhciAmJiB1LlVzZXIuYXZhdGFyLnJlcGxhY2UoL1xcbi9nLCAnJyksXG5cdFx0XHRcdFx0XHRcdFx0dGltZXpvbmU6IHUuVXNlci50aW1lem9uZSxcblx0XHRcdFx0XHRcdFx0XHRpc0RlbGV0ZWQ6IHUuVXNlci5pc19kZWxldGVkXG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoaW5mby5iYXNlID09PSAncm9vbXMuanNvbicpIHtcblx0XHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5QUkVQQVJJTkdfQ0hBTk5FTFMpO1xuXHRcdFx0XHRcdFx0Zm9yIChjb25zdCByIG9mIGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0dGVtcFJvb21zLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdGlkOiByLlJvb20uaWQsXG5cdFx0XHRcdFx0XHRcdFx0Y3JlYXRvcjogci5Sb29tLm93bmVyLFxuXHRcdFx0XHRcdFx0XHRcdGNyZWF0ZWQ6IG5ldyBEYXRlKHIuUm9vbS5jcmVhdGVkKSxcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBzLnNsdWdpZnkoci5Sb29tLm5hbWUpLFxuXHRcdFx0XHRcdFx0XHRcdGlzUHJpdmF0ZTogci5Sb29tLnByaXZhY3kgPT09ICdwcml2YXRlJyxcblx0XHRcdFx0XHRcdFx0XHRpc0FyY2hpdmVkOiByLlJvb20uaXNfYXJjaGl2ZWQsXG5cdFx0XHRcdFx0XHRcdFx0dG9waWM6IHIuUm9vbS50b3BpY1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2UgaWYgKGluZm8uYmFzZSA9PT0gJ2hpc3RvcnkuanNvbicpIHtcblx0XHRcdFx0XHRcdGNvbnN0IFt0eXBlLCBpZF0gPSBpbmZvLmRpci5zcGxpdCgnLycpOyAvL1sndXNlcnMnLCAnMSddXG5cdFx0XHRcdFx0XHRjb25zdCByb29tSWRlbnRpZmllciA9IGAkeyB0eXBlIH0vJHsgaWQgfWA7XG5cdFx0XHRcdFx0XHRpZiAodHlwZSA9PT0gJ3VzZXJzJykge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBtc2dzID0gW107XG5cdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgbSBvZiBmaWxlKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKG0uUHJpdmF0ZVVzZXJNZXNzYWdlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtc2dzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAndXNlcicsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlkOiBgaGlwY2hhdGVudGVycHJpc2UtJHsgbS5Qcml2YXRlVXNlck1lc3NhZ2UuaWQgfWAsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNlbmRlcklkOiBtLlByaXZhdGVVc2VyTWVzc2FnZS5zZW5kZXIuaWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJlY2VpdmVySWQ6IG0uUHJpdmF0ZVVzZXJNZXNzYWdlLnJlY2VpdmVyLmlkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBtLlByaXZhdGVVc2VyTWVzc2FnZS5tZXNzYWdlLmluZGV4T2YoJy9tZSAnKSA9PT0gLTEgPyBtLlByaXZhdGVVc2VyTWVzc2FnZS5tZXNzYWdlIDogYCR7IG0uUHJpdmF0ZVVzZXJNZXNzYWdlLm1lc3NhZ2UucmVwbGFjZSgvXFwvbWUgLywgJ18nKSB9X2AsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRzOiBuZXcgRGF0ZShtLlByaXZhdGVVc2VyTWVzc2FnZS50aW1lc3RhbXAuc3BsaXQoJyAnKVswXSlcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0ZW1wRGlyZWN0TWVzc2FnZXMuc2V0KHJvb21JZGVudGlmaWVyLCBtc2dzKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ3Jvb21zJykge1xuXHRcdFx0XHRcdFx0XHRjb25zdCByb29tTXNncyA9IFtdO1xuXG5cdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgbSBvZiBmaWxlKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKG0uVXNlck1lc3NhZ2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJvb21Nc2dzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAndXNlcicsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlkOiBgaGlwY2hhdGVudGVycHJpc2UtJHsgaWQgfS0keyBtLlVzZXJNZXNzYWdlLmlkIH1gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR1c2VySWQ6IG0uVXNlck1lc3NhZ2Uuc2VuZGVyLmlkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBtLlVzZXJNZXNzYWdlLm1lc3NhZ2UuaW5kZXhPZignL21lICcpID09PSAtMSA/IG0uVXNlck1lc3NhZ2UubWVzc2FnZSA6IGAkeyBtLlVzZXJNZXNzYWdlLm1lc3NhZ2UucmVwbGFjZSgvXFwvbWUgLywgJ18nKSB9X2AsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRzOiBuZXcgRGF0ZShtLlVzZXJNZXNzYWdlLnRpbWVzdGFtcC5zcGxpdCgnICcpWzBdKVxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtLk5vdGlmaWNhdGlvbk1lc3NhZ2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJvb21Nc2dzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAndXNlcicsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlkOiBgaGlwY2hhdGVudGVycHJpc2UtJHsgaWQgfS0keyBtLk5vdGlmaWNhdGlvbk1lc3NhZ2UuaWQgfWAsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHVzZXJJZDogJ3JvY2tldC5jYXQnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRhbGlhczogbS5Ob3RpZmljYXRpb25NZXNzYWdlLnNlbmRlcixcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogbS5Ob3RpZmljYXRpb25NZXNzYWdlLm1lc3NhZ2UuaW5kZXhPZignL21lICcpID09PSAtMSA/IG0uTm90aWZpY2F0aW9uTWVzc2FnZS5tZXNzYWdlIDogYCR7IG0uTm90aWZpY2F0aW9uTWVzc2FnZS5tZXNzYWdlLnJlcGxhY2UoL1xcL21lIC8sICdfJykgfV9gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbmV3IERhdGUobS5Ob3RpZmljYXRpb25NZXNzYWdlLnRpbWVzdGFtcC5zcGxpdCgnICcpWzBdKVxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtLlRvcGljUm9vbU1lc3NhZ2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJvb21Nc2dzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAndG9waWMnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZDogYGhpcGNoYXRlbnRlcnByaXNlLSR7IGlkIH0tJHsgbS5Ub3BpY1Jvb21NZXNzYWdlLmlkIH1gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR1c2VySWQ6IG0uVG9waWNSb29tTWVzc2FnZS5zZW5kZXIuaWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRzOiBuZXcgRGF0ZShtLlRvcGljUm9vbU1lc3NhZ2UudGltZXN0YW1wLnNwbGl0KCcgJylbMF0pLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBtLlRvcGljUm9vbU1lc3NhZ2UubWVzc2FnZVxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubG9nZ2VyLndhcm4oJ0hpcENoYXQgRW50ZXJwcmlzZSBpbXBvcnRlciBpc25cXCd0IGNvbmZpZ3VyZWQgdG8gaGFuZGxlIHRoaXMgbWVzc2FnZTonLCBtKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dGVtcE1lc3NhZ2VzLnNldChyb29tSWRlbnRpZmllciwgcm9vbU1zZ3MpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5sb2dnZXIud2FybihgSGlwQ2hhdCBFbnRlcnByaXNlIGltcG9ydGVyIGlzbid0IGNvbmZpZ3VyZWQgdG8gaGFuZGxlIFwiJHsgdHlwZSB9XCIgZmlsZXMuYCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vV2hhdCBhcmUgdGhlc2UgZmlsZXMhP1xuXHRcdFx0XHRcdFx0dGhpcy5sb2dnZXIud2FybihgSGlwQ2hhdCBFbnRlcnByaXNlIGltcG9ydGVyIGRvZXNuJ3Qga25vdyB3aGF0IHRvIGRvIHdpdGggdGhlIGZpbGUgXCIkeyBoZWFkZXIubmFtZSB9XCIgOm9gLCBpbmZvKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bmV4dCgpO1xuXHRcdFx0XHR9KSk7XG5cdFx0XHRcdHN0cmVhbS5vbignZXJyb3InLCAoKSA9PiBuZXh0KCkpO1xuXG5cdFx0XHRcdHN0cmVhbS5yZXN1bWUoKTtcblx0XHRcdH0pKTtcblxuXHRcdFx0dGhpcy5leHRyYWN0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcblx0XHRcdFx0dGhpcy5sb2dnZXIud2FybignZXh0cmFjdCBlcnJvcjonLCBlcnIpO1xuXHRcdFx0XHRyZWplY3QoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmV4dHJhY3Qub24oJ2ZpbmlzaCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHQvLyBJbnNlcnQgdGhlIHVzZXJzIHJlY29yZCwgZXZlbnR1YWxseSB0aGlzIG1pZ2h0IGhhdmUgdG8gYmUgc3BsaXQgaW50byBzZXZlcmFsIG9uZXMgYXMgd2VsbFxuXHRcdFx0XHQvLyBpZiBzb21lb25lIHRyaWVzIHRvIGltcG9ydCBhIHNldmVyYWwgdGhvdXNhbmRzIHVzZXJzIGluc3RhbmNlXG5cdFx0XHRcdGNvbnN0IHVzZXJzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHsgJ2ltcG9ydCc6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgJ2ltcG9ydGVyJzogdGhpcy5uYW1lLCAndHlwZSc6ICd1c2VycycsICd1c2Vycyc6IHRlbXBVc2VycyB9KTtcblx0XHRcdFx0dGhpcy51c2VycyA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKHVzZXJzSWQpO1xuXHRcdFx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyAnY291bnQudXNlcnMnOiB0ZW1wVXNlcnMubGVuZ3RoIH0pO1xuXHRcdFx0XHRzdXBlci5hZGRDb3VudFRvVG90YWwodGVtcFVzZXJzLmxlbmd0aCk7XG5cblx0XHRcdFx0Ly8gSW5zZXJ0IHRoZSBjaGFubmVscyByZWNvcmRzLlxuXHRcdFx0XHRjb25zdCBjaGFubmVsc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7ICdpbXBvcnQnOiB0aGlzLmltcG9ydFJlY29yZC5faWQsICdpbXBvcnRlcic6IHRoaXMubmFtZSwgJ3R5cGUnOiAnY2hhbm5lbHMnLCAnY2hhbm5lbHMnOiB0ZW1wUm9vbXMgfSk7XG5cdFx0XHRcdHRoaXMuY2hhbm5lbHMgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShjaGFubmVsc0lkKTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUmVjb3JkKHsgJ2NvdW50LmNoYW5uZWxzJzogdGVtcFJvb21zLmxlbmd0aCB9KTtcblx0XHRcdFx0c3VwZXIuYWRkQ291bnRUb1RvdGFsKHRlbXBSb29tcy5sZW5ndGgpO1xuXG5cdFx0XHRcdC8vIFNhdmUgdGhlIG1lc3NhZ2VzIHJlY29yZHMgdG8gdGhlIGltcG9ydCByZWNvcmQgZm9yIGBzdGFydEltcG9ydGAgdXNhZ2Vcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLlBSRVBBUklOR19NRVNTQUdFUyk7XG5cdFx0XHRcdGxldCBtZXNzYWdlc0NvdW50ID0gMDtcblx0XHRcdFx0Zm9yIChjb25zdCBbY2hhbm5lbCwgbXNnc10gb2YgdGVtcE1lc3NhZ2VzLmVudHJpZXMoKSkge1xuXHRcdFx0XHRcdGlmICghdGhpcy5tZXNzYWdlcy5nZXQoY2hhbm5lbCkpIHtcblx0XHRcdFx0XHRcdHRoaXMubWVzc2FnZXMuc2V0KGNoYW5uZWwsIG5ldyBNYXAoKSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0bWVzc2FnZXNDb3VudCArPSBtc2dzLmxlbmd0aDtcblx0XHRcdFx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyAnbWVzc2FnZXNzdGF0dXMnOiBjaGFubmVsIH0pO1xuXG5cdFx0XHRcdFx0aWYgKEJhc2UuZ2V0QlNPTlNpemUobXNncykgPiBCYXNlLmdldE1heEJTT05TaXplKCkpIHtcblx0XHRcdFx0XHRcdEJhc2UuZ2V0QlNPTlNhZmVBcnJheXNGcm9tQW5BcnJheShtc2dzKS5mb3JFYWNoKChzcGxpdE1zZywgaSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBtZXNzYWdlc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7ICdpbXBvcnQnOiB0aGlzLmltcG9ydFJlY29yZC5faWQsICdpbXBvcnRlcic6IHRoaXMubmFtZSwgJ3R5cGUnOiAnbWVzc2FnZXMnLCAnbmFtZSc6IGAkeyBjaGFubmVsIH0vJHsgaSB9YCwgJ21lc3NhZ2VzJzogc3BsaXRNc2cgfSk7XG5cdFx0XHRcdFx0XHRcdHRoaXMubWVzc2FnZXMuZ2V0KGNoYW5uZWwpLnNldChgJHsgY2hhbm5lbCB9LiR7IGkgfWAsIHRoaXMuY29sbGVjdGlvbi5maW5kT25lKG1lc3NhZ2VzSWQpKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjb25zdCBtZXNzYWdlc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7ICdpbXBvcnQnOiB0aGlzLmltcG9ydFJlY29yZC5faWQsICdpbXBvcnRlcic6IHRoaXMubmFtZSwgJ3R5cGUnOiAnbWVzc2FnZXMnLCAnbmFtZSc6IGAkeyBjaGFubmVsIH1gLCAnbWVzc2FnZXMnOiBtc2dzIH0pO1xuXHRcdFx0XHRcdFx0dGhpcy5tZXNzYWdlcy5nZXQoY2hhbm5lbCkuc2V0KGNoYW5uZWwsIHRoaXMuY29sbGVjdGlvbi5maW5kT25lKG1lc3NhZ2VzSWQpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKGNvbnN0IFtkaXJlY3RNc2dVc2VyLCBtc2dzXSBvZiB0ZW1wRGlyZWN0TWVzc2FnZXMuZW50cmllcygpKSB7XG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoYFByZXBhcmluZyB0aGUgZGlyZWN0IG1lc3NhZ2VzIGZvcjogJHsgZGlyZWN0TXNnVXNlciB9YCk7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLmRpcmVjdE1lc3NhZ2VzLmdldChkaXJlY3RNc2dVc2VyKSkge1xuXHRcdFx0XHRcdFx0dGhpcy5kaXJlY3RNZXNzYWdlcy5zZXQoZGlyZWN0TXNnVXNlciwgbmV3IE1hcCgpKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRtZXNzYWdlc0NvdW50ICs9IG1zZ3MubGVuZ3RoO1xuXHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVJlY29yZCh7ICdtZXNzYWdlc3N0YXR1cyc6IGRpcmVjdE1zZ1VzZXIgfSk7XG5cblx0XHRcdFx0XHRpZiAoQmFzZS5nZXRCU09OU2l6ZShtc2dzKSA+IEJhc2UuZ2V0TWF4QlNPTlNpemUoKSkge1xuXHRcdFx0XHRcdFx0QmFzZS5nZXRCU09OU2FmZUFycmF5c0Zyb21BbkFycmF5KG1zZ3MpLmZvckVhY2goKHNwbGl0TXNnLCBpKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHsgJ2ltcG9ydCc6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgJ2ltcG9ydGVyJzogdGhpcy5uYW1lLCAndHlwZSc6ICdkaXJlY3RNZXNzYWdlcycsICduYW1lJzogYCR7IGRpcmVjdE1zZ1VzZXIgfS8keyBpIH1gLCAnbWVzc2FnZXMnOiBzcGxpdE1zZyB9KTtcblx0XHRcdFx0XHRcdFx0dGhpcy5kaXJlY3RNZXNzYWdlcy5nZXQoZGlyZWN0TXNnVXNlcikuc2V0KGAkeyBkaXJlY3RNc2dVc2VyIH0uJHsgaSB9YCwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUobWVzc2FnZXNJZCkpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHsgJ2ltcG9ydCc6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgJ2ltcG9ydGVyJzogdGhpcy5uYW1lLCAndHlwZSc6ICdkaXJlY3RNZXNzYWdlcycsICduYW1lJzogYCR7IGRpcmVjdE1zZ1VzZXIgfWAsICdtZXNzYWdlcyc6IG1zZ3MgfSk7XG5cdFx0XHRcdFx0XHR0aGlzLmRpcmVjdE1lc3NhZ2VzLmdldChkaXJlY3RNc2dVc2VyKS5zZXQoZGlyZWN0TXNnVXNlciwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUobWVzc2FnZXNJZCkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVJlY29yZCh7ICdjb3VudC5tZXNzYWdlcyc6IG1lc3NhZ2VzQ291bnQsICdtZXNzYWdlc3N0YXR1cyc6IG51bGwgfSk7XG5cdFx0XHRcdHN1cGVyLmFkZENvdW50VG9Ub3RhbChtZXNzYWdlc0NvdW50KTtcblxuXHRcdFx0XHQvL0Vuc3VyZSB3ZSBoYXZlIHNvbWUgdXNlcnMsIGNoYW5uZWxzLCBhbmQgbWVzc2FnZXNcblx0XHRcdFx0aWYgKHRlbXBVc2Vycy5sZW5ndGggPT09IDAgfHwgdGVtcFJvb21zLmxlbmd0aCA9PT0gMCB8fCBtZXNzYWdlc0NvdW50ID09PSAwKSB7XG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIud2FybihgVGhlIGxvYWRlZCB1c2VycyBjb3VudCAkeyB0ZW1wVXNlcnMubGVuZ3RoIH0sIHRoZSBsb2FkZWQgcm9vbXMgJHsgdGVtcFJvb21zLmxlbmd0aCB9LCBhbmQgdGhlIGxvYWRlZCBtZXNzYWdlcyAkeyBtZXNzYWdlc0NvdW50IH1gKTtcblx0XHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRVJST1IpO1xuXHRcdFx0XHRcdHJlamVjdCgpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHNlbGVjdGlvblVzZXJzID0gdGVtcFVzZXJzLm1hcCgodSkgPT4gbmV3IFNlbGVjdGlvblVzZXIodS5pZCwgdS51c2VybmFtZSwgdS5lbWFpbCwgdS5pc0RlbGV0ZWQsIGZhbHNlLCB0cnVlKSk7XG5cdFx0XHRcdGNvbnN0IHNlbGVjdGlvbkNoYW5uZWxzID0gdGVtcFJvb21zLm1hcCgocikgPT4gbmV3IFNlbGVjdGlvbkNoYW5uZWwoci5pZCwgci5uYW1lLCByLmlzQXJjaGl2ZWQsIHRydWUsIHIuaXNQcml2YXRlKSk7XG5cdFx0XHRcdGNvbnN0IHNlbGVjdGlvbk1lc3NhZ2VzID0gdGhpcy5pbXBvcnRSZWNvcmQuY291bnQubWVzc2FnZXM7XG5cblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLlVTRVJfU0VMRUNUSU9OKTtcblxuXHRcdFx0XHRyZXNvbHZlKG5ldyBTZWxlY3Rpb24odGhpcy5uYW1lLCBzZWxlY3Rpb25Vc2Vycywgc2VsZWN0aW9uQ2hhbm5lbHMsIHNlbGVjdGlvbk1lc3NhZ2VzKSk7XG5cdFx0XHR9KSk7XG5cblx0XHRcdC8vV2lzaCBJIGNvdWxkIG1ha2UgdGhpcyBjbGVhbmVyIDooXG5cdFx0XHRjb25zdCBzcGxpdCA9IGRhdGFVUkkuc3BsaXQoJywnKTtcblx0XHRcdGNvbnN0IHJlYWQgPSBuZXcgdGhpcy5SZWFkYWJsZTtcblx0XHRcdHJlYWQucHVzaChuZXcgQnVmZmVyKHNwbGl0W3NwbGl0Lmxlbmd0aCAtIDFdLCAnYmFzZTY0JykpO1xuXHRcdFx0cmVhZC5wdXNoKG51bGwpO1xuXHRcdFx0cmVhZC5waXBlKHRoaXMuemxpYi5jcmVhdGVHdW56aXAoKSkucGlwZSh0aGlzLmV4dHJhY3QpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHByb21pc2U7XG5cdH1cblxuXHRzdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pIHtcblx0XHRzdXBlci5zdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pO1xuXHRcdGNvbnN0IHN0YXJ0ZWQgPSBEYXRlLm5vdygpO1xuXG5cdFx0Ly9FbnN1cmUgd2UncmUgb25seSBnb2luZyB0byBpbXBvcnQgdGhlIHVzZXJzIHRoYXQgdGhlIHVzZXIgaGFzIHNlbGVjdGVkXG5cdFx0Zm9yIChjb25zdCB1c2VyIG9mIGltcG9ydFNlbGVjdGlvbi51c2Vycykge1xuXHRcdFx0Zm9yIChjb25zdCB1IG9mIHRoaXMudXNlcnMudXNlcnMpIHtcblx0XHRcdFx0aWYgKHUuaWQgPT09IHVzZXIudXNlcl9pZCkge1xuXHRcdFx0XHRcdHUuZG9faW1wb3J0ID0gdXNlci5kb19pbXBvcnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy51c2Vycy5faWQgfSwgeyAkc2V0OiB7ICd1c2Vycyc6IHRoaXMudXNlcnMudXNlcnMgfX0pO1xuXG5cdFx0Ly9FbnN1cmUgd2UncmUgb25seSBpbXBvcnRpbmcgdGhlIGNoYW5uZWxzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZC5cblx0XHRmb3IgKGNvbnN0IGNoYW5uZWwgb2YgaW1wb3J0U2VsZWN0aW9uLmNoYW5uZWxzKSB7XG5cdFx0XHRmb3IgKGNvbnN0IGMgb2YgdGhpcy5jaGFubmVscy5jaGFubmVscykge1xuXHRcdFx0XHRpZiAoYy5pZCA9PT0gY2hhbm5lbC5jaGFubmVsX2lkKSB7XG5cdFx0XHRcdFx0Yy5kb19pbXBvcnQgPSBjaGFubmVsLmRvX2ltcG9ydDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHsgX2lkOiB0aGlzLmNoYW5uZWxzLl9pZCB9LCB7ICRzZXQ6IHsgJ2NoYW5uZWxzJzogdGhpcy5jaGFubmVscy5jaGFubmVscyB9fSk7XG5cblx0XHRjb25zdCBzdGFydGVkQnlVc2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5JTVBPUlRJTkdfVVNFUlMpO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHQvL0ltcG9ydCB0aGUgdXNlcnNcblx0XHRcdFx0Zm9yIChjb25zdCB1IG9mIHRoaXMudXNlcnMudXNlcnMpIHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZyhgU3RhcnRpbmcgdGhlIHVzZXIgaW1wb3J0OiAkeyB1LnVzZXJuYW1lIH0gYW5kIGFyZSB3ZSBpbXBvcnRpbmcgdGhlbT8gJHsgdS5kb19pbXBvcnQgfWApO1xuXHRcdFx0XHRcdGlmICghdS5kb19pbXBvcnQpIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc3RhcnRlZEJ5VXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRsZXQgZXhpc3RhbnRVc2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5RW1haWxBZGRyZXNzKHUuZW1haWwpO1xuXG5cdFx0XHRcdFx0XHQvL0lmIHdlIGNvdWxkbid0IGZpbmQgb25lIGJ5IHRoZWlyIGVtYWlsIGFkZHJlc3MsIHRyeSB0byBmaW5kIGFuIGV4aXN0aW5nIHVzZXIgYnkgdGhlaXIgdXNlcm5hbWVcblx0XHRcdFx0XHRcdGlmICghZXhpc3RhbnRVc2VyKSB7XG5cdFx0XHRcdFx0XHRcdGV4aXN0YW50VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHUudXNlcm5hbWUpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoZXhpc3RhbnRVc2VyKSB7XG5cdFx0XHRcdFx0XHRcdC8vc2luY2Ugd2UgaGF2ZSBhbiBleGlzdGluZyB1c2VyLCBsZXQncyB0cnkgYSBmZXcgdGhpbmdzXG5cdFx0XHRcdFx0XHRcdHUucm9ja2V0SWQgPSBleGlzdGFudFVzZXIuX2lkO1xuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy51cGRhdGUoeyBfaWQ6IHUucm9ja2V0SWQgfSwgeyAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiB1LmlkIH0gfSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB1c2VySWQgPSBBY2NvdW50cy5jcmVhdGVVc2VyKHsgZW1haWw6IHUuZW1haWwsIHBhc3N3b3JkOiBSYW5kb20uaWQoKSB9KTtcblx0XHRcdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnc2V0VXNlcm5hbWUnLCB1LnVzZXJuYW1lLCB7am9pbkRlZmF1bHRDaGFubmVsc1NpbGVuY2VkOiB0cnVlfSk7XG5cdFx0XHRcdFx0XHRcdFx0Ly9UT0RPOiBVc2UgbW9tZW50IHRpbWV6b25lIHRvIGNhbGMgdGhlIHRpbWUgb2Zmc2V0IC0gTWV0ZW9yLmNhbGwgJ3VzZXJTZXRVdGNPZmZzZXQnLCB1c2VyLnR6X29mZnNldCAvIDM2MDBcblx0XHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXROYW1lKHVzZXJJZCwgdS5uYW1lKTtcblx0XHRcdFx0XHRcdFx0XHQvL1RPRE86IFRoaW5rIGFib3V0IHVzaW5nIGEgY3VzdG9tIGZpZWxkIGZvciB0aGUgdXNlcnMgXCJ0aXRsZVwiIGZpZWxkXG5cblx0XHRcdFx0XHRcdFx0XHRpZiAodS5hdmF0YXIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCdzZXRBdmF0YXJGcm9tU2VydmljZScsIGBkYXRhOmltYWdlL3BuZztiYXNlNjQsJHsgdS5hdmF0YXIgfWApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdC8vRGVsZXRlZCB1c2VycyBhcmUgJ2luYWN0aXZlJyB1c2VycyBpbiBSb2NrZXQuQ2hhdFxuXHRcdFx0XHRcdFx0XHRcdGlmICh1LmRlbGV0ZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCdzZXRVc2VyQWN0aXZlU3RhdHVzJywgdXNlcklkLCBmYWxzZSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudXBkYXRlKHsgX2lkOiB1c2VySWQgfSwgeyAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiB1LmlkIH0gfSk7XG5cdFx0XHRcdFx0XHRcdFx0dS5yb2NrZXRJZCA9IHVzZXJJZDtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHN1cGVyLmFkZENvdW50Q29tcGxldGVkKDEpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuY29sbGVjdGlvbi51cGRhdGUoeyBfaWQ6IHRoaXMudXNlcnMuX2lkIH0sIHsgJHNldDogeyAndXNlcnMnOiB0aGlzLnVzZXJzLnVzZXJzIH19KTtcblxuXHRcdFx0XHQvL0ltcG9ydCB0aGUgY2hhbm5lbHNcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLklNUE9SVElOR19DSEFOTkVMUyk7XG5cdFx0XHRcdGZvciAoY29uc3QgYyBvZiB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzKSB7XG5cdFx0XHRcdFx0aWYgKCFjLmRvX2ltcG9ydCkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcihzdGFydGVkQnlVc2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IGV4aXN0YW50Um9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUoYy5uYW1lKTtcblx0XHRcdFx0XHRcdC8vSWYgdGhlIHJvb20gZXhpc3RzIG9yIHRoZSBuYW1lIG9mIGl0IGlzICdnZW5lcmFsJywgdGhlbiB3ZSBkb24ndCBuZWVkIHRvIGNyZWF0ZSBpdCBhZ2FpblxuXHRcdFx0XHRcdFx0aWYgKGV4aXN0YW50Um9vbSB8fCBjLm5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ0dFTkVSQUwnKSB7XG5cdFx0XHRcdFx0XHRcdGMucm9ja2V0SWQgPSBjLm5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ0dFTkVSQUwnID8gJ0dFTkVSQUwnIDogZXhpc3RhbnRSb29tLl9pZDtcblx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlKHsgX2lkOiBjLnJvY2tldElkIH0sIHsgJGFkZFRvU2V0OiB7IGltcG9ydElkczogYy5pZCB9IH0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Ly9GaW5kIHRoZSByb2NrZXRjaGF0SWQgb2YgdGhlIHVzZXIgd2hvIGNyZWF0ZWQgdGhpcyBjaGFubmVsXG5cdFx0XHRcdFx0XHRcdGxldCBjcmVhdG9ySWQgPSBzdGFydGVkQnlVc2VySWQ7XG5cdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgdSBvZiB0aGlzLnVzZXJzLnVzZXJzKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHUuaWQgPT09IGMuY3JlYXRvciAmJiB1LmRvX2ltcG9ydCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y3JlYXRvcklkID0gdS5yb2NrZXRJZDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvL0NyZWF0ZSB0aGUgY2hhbm5lbFxuXHRcdFx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKGNyZWF0b3JJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHJvb21JbmZvID0gTWV0ZW9yLmNhbGwoYy5pc1ByaXZhdGUgPyAnY3JlYXRlUHJpdmF0ZUdyb3VwJyA6ICdjcmVhdGVDaGFubmVsJywgYy5uYW1lLCBbXSk7XG5cdFx0XHRcdFx0XHRcdFx0Yy5yb2NrZXRJZCA9IHJvb21JbmZvLnJpZDtcblx0XHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlKHsgX2lkOiBjLnJvY2tldElkIH0sIHsgJHNldDogeyB0czogYy5jcmVhdGVkLCB0b3BpYzogYy50b3BpYyB9LCAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiBjLmlkIH0gfSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHN1cGVyLmFkZENvdW50Q29tcGxldGVkKDEpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuY29sbGVjdGlvbi51cGRhdGUoeyBfaWQ6IHRoaXMuY2hhbm5lbHMuX2lkIH0sIHsgJHNldDogeyAnY2hhbm5lbHMnOiB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzIH19KTtcblxuXHRcdFx0XHQvL0ltcG9ydCB0aGUgTWVzc2FnZXNcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLklNUE9SVElOR19NRVNTQUdFUyk7XG5cdFx0XHRcdGZvciAoY29uc3QgW2NoLCBtZXNzYWdlc01hcF0gb2YgdGhpcy5tZXNzYWdlcy5lbnRyaWVzKCkpIHtcblx0XHRcdFx0XHRjb25zdCBoaXBDaGFubmVsID0gdGhpcy5nZXRDaGFubmVsRnJvbVJvb21JZGVudGlmaWVyKGNoKTtcblx0XHRcdFx0XHRpZiAoIWhpcENoYW5uZWwuZG9faW1wb3J0KSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoaGlwQ2hhbm5lbC5yb2NrZXRJZCwgeyBmaWVsZHM6IHsgdXNlcm5hbWVzOiAxLCB0OiAxLCBuYW1lOiAxIH0gfSk7XG5cdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcihzdGFydGVkQnlVc2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgW21zZ0dyb3VwRGF0YSwgbXNnc10gb2YgbWVzc2FnZXNNYXAuZW50cmllcygpKSB7XG5cdFx0XHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVJlY29yZCh7ICdtZXNzYWdlc3N0YXR1cyc6IGAkeyBjaCB9LyR7IG1zZ0dyb3VwRGF0YSB9LiR7IG1zZ3MubWVzc2FnZXMubGVuZ3RoIH1gIH0pO1xuXHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IG1zZyBvZiBtc2dzLm1lc3NhZ2VzKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGlzTmFOKG1zZy50cykpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYFRpbWVzdGFtcCBvbiBhIG1lc3NhZ2UgaW4gJHsgY2ggfS8keyBtc2dHcm91cERhdGEgfSBpcyBpbnZhbGlkYCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRzdXBlci5hZGRDb3VudENvbXBsZXRlZCgxKTtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGNyZWF0b3IgPSB0aGlzLmdldFJvY2tldFVzZXJGcm9tVXNlcklkKG1zZy51c2VySWQpO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChjcmVhdG9yKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRzd2l0Y2ggKG1zZy50eXBlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgJ3VzZXInOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2VuZE1lc3NhZ2UoY3JlYXRvciwge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0X2lkOiBtc2cuaWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbXNnLnRzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bXNnOiBtc2cudGV4dCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJpZDogcm9vbS5faWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRhbGlhczogbXNnLmFsaWFzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dToge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRfaWQ6IGNyZWF0b3IuX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogY3JlYXRvci51c2VybmFtZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sIHJvb20sIHRydWUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjYXNlICd0b3BpYyc6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoJ3Jvb21fY2hhbmdlZF90b3BpYycsIHJvb20uX2lkLCBtc2cudGV4dCwgY3JlYXRvciwgeyBfaWQ6IG1zZy5pZCwgdHM6IG1zZy50cyB9KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRzdXBlci5hZGRDb3VudENvbXBsZXRlZCgxKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9JbXBvcnQgdGhlIERpcmVjdCBNZXNzYWdlc1xuXHRcdFx0XHRmb3IgKGNvbnN0IFtkaXJlY3RNc2dSb29tLCBkaXJlY3RNZXNzYWdlc01hcF0gb2YgdGhpcy5kaXJlY3RNZXNzYWdlcy5lbnRyaWVzKCkpIHtcblx0XHRcdFx0XHRjb25zdCBoaXBVc2VyID0gdGhpcy5nZXRVc2VyRnJvbURpcmVjdE1lc3NhZ2VJZGVudGlmaWVyKGRpcmVjdE1zZ1Jvb20pO1xuXHRcdFx0XHRcdGlmICghaGlwVXNlci5kb19pbXBvcnQpIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vVmVyaWZ5IHRoaXMgZGlyZWN0IG1lc3NhZ2UgdXNlcidzIHJvb20gaXMgdmFsaWQgKGNvbmZ1c2luZyBidXQgaWRrIGhvdyBlbHNlIHRvIGV4cGxhaW4gaXQpXG5cdFx0XHRcdFx0aWYgKCF0aGlzLmdldFJvY2tldFVzZXJGcm9tVXNlcklkKGhpcFVzZXIuaWQpKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRmb3IgKGNvbnN0IFttc2dHcm91cERhdGEsIG1zZ3NdIG9mIGRpcmVjdE1lc3NhZ2VzTWFwLmVudHJpZXMoKSkge1xuXHRcdFx0XHRcdFx0c3VwZXIudXBkYXRlUmVjb3JkKHsgJ21lc3NhZ2Vzc3RhdHVzJzogYCR7IGRpcmVjdE1zZ1Jvb20gfS8keyBtc2dHcm91cERhdGEgfS4keyBtc2dzLm1lc3NhZ2VzLmxlbmd0aCB9YCB9KTtcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgbXNnIG9mIG1zZ3MubWVzc2FnZXMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGlzTmFOKG1zZy50cykpIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBUaW1lc3RhbXAgb24gYSBtZXNzYWdlIGluICR7IGRpcmVjdE1zZ1Jvb20gfS8keyBtc2dHcm91cERhdGEgfSBpcyBpbnZhbGlkYCk7XG5cdFx0XHRcdFx0XHRcdFx0c3VwZXIuYWRkQ291bnRDb21wbGV0ZWQoMSk7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvL21ha2Ugc3VyZSB0aGUgbWVzc2FnZSBzZW5kZXIgaXMgYSB2YWxpZCB1c2VyIGluc2lkZSByb2NrZXQuY2hhdFxuXHRcdFx0XHRcdFx0XHRjb25zdCBzZW5kZXIgPSB0aGlzLmdldFJvY2tldFVzZXJGcm9tVXNlcklkKG1zZy5zZW5kZXJJZCk7XG5cdFx0XHRcdFx0XHRcdGlmICghc2VuZGVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvL21ha2Ugc3VyZSB0aGUgcmVjZWl2ZXIgb2YgdGhlIG1lc3NhZ2UgaXMgYSB2YWxpZCByb2NrZXQuY2hhdCB1c2VyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJlY2VpdmVyID0gdGhpcy5nZXRSb2NrZXRVc2VyRnJvbVVzZXJJZChtc2cucmVjZWl2ZXJJZCk7XG5cdFx0XHRcdFx0XHRcdGlmICghcmVjZWl2ZXIpIHtcblx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGxldCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoW3JlY2VpdmVyLl9pZCwgc2VuZGVyLl9pZF0uc29ydCgpLmpvaW4oJycpKTtcblx0XHRcdFx0XHRcdFx0aWYgKCFyb29tKSB7XG5cdFx0XHRcdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcihzZW5kZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCByb29tSW5mbyA9IE1ldGVvci5jYWxsKCdjcmVhdGVEaXJlY3RNZXNzYWdlJywgcmVjZWl2ZXIudXNlcm5hbWUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JbmZvLnJpZCk7XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHNlbmRlci5faWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNlbmRNZXNzYWdlKHNlbmRlciwge1xuXHRcdFx0XHRcdFx0XHRcdFx0X2lkOiBtc2cuaWQsXG5cdFx0XHRcdFx0XHRcdFx0XHR0czogbXNnLnRzLFxuXHRcdFx0XHRcdFx0XHRcdFx0bXNnOiBtc2cudGV4dCxcblx0XHRcdFx0XHRcdFx0XHRcdHJpZDogcm9vbS5faWQsXG5cdFx0XHRcdFx0XHRcdFx0XHR1OiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdF9pZDogc2VuZGVyLl9pZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXNlcm5hbWU6IHNlbmRlci51c2VybmFtZVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0sIHJvb20sIHRydWUpO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRklOSVNISU5HKTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkRPTkUpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihlKTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkVSUk9SKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdGltZVRvb2sgPSBEYXRlLm5vdygpIC0gc3RhcnRlZDtcblx0XHRcdHRoaXMubG9nZ2VyLmxvZyhgSGlwQ2hhdCBFbnRlcnByaXNlIEltcG9ydCB0b29rICR7IHRpbWVUb29rIH0gbWlsbGlzZWNvbmRzLmApO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHN1cGVyLmdldFByb2dyZXNzKCk7XG5cdH1cblxuXHRnZXRTZWxlY3Rpb24oKSB7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uVXNlcnMgPSB0aGlzLnVzZXJzLnVzZXJzLm1hcCgodSkgPT4gbmV3IFNlbGVjdGlvblVzZXIodS5pZCwgdS51c2VybmFtZSwgdS5lbWFpbCwgZmFsc2UsIGZhbHNlLCB0cnVlKSk7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uQ2hhbm5lbHMgPSB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzLm1hcCgoYykgPT4gbmV3IFNlbGVjdGlvbkNoYW5uZWwoYy5pZCwgYy5uYW1lLCBmYWxzZSwgdHJ1ZSwgYy5pc1ByaXZhdGUpKTtcblx0XHRjb25zdCBzZWxlY3Rpb25NZXNzYWdlcyA9IHRoaXMuaW1wb3J0UmVjb3JkLmNvdW50Lm1lc3NhZ2VzO1xuXG5cdFx0cmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5uYW1lLCBzZWxlY3Rpb25Vc2Vycywgc2VsZWN0aW9uQ2hhbm5lbHMsIHNlbGVjdGlvbk1lc3NhZ2VzKTtcblx0fVxuXG5cdGdldENoYW5uZWxGcm9tUm9vbUlkZW50aWZpZXIocm9vbUlkZW50aWZpZXIpIHtcblx0XHRmb3IgKGNvbnN0IGNoIG9mIHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMpIHtcblx0XHRcdGlmIChgcm9vbXMvJHsgY2guaWQgfWAgPT09IHJvb21JZGVudGlmaWVyKSB7XG5cdFx0XHRcdHJldHVybiBjaDtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRnZXRVc2VyRnJvbURpcmVjdE1lc3NhZ2VJZGVudGlmaWVyKGRpcmVjdElkZW50aWZpZXIpIHtcblx0XHRmb3IgKGNvbnN0IHUgb2YgdGhpcy51c2Vycy51c2Vycykge1xuXHRcdFx0aWYgKGB1c2Vycy8keyB1LmlkIH1gID09PSBkaXJlY3RJZGVudGlmaWVyKSB7XG5cdFx0XHRcdHJldHVybiB1O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGdldFJvY2tldFVzZXJGcm9tVXNlcklkKHVzZXJJZCkge1xuXHRcdGZvciAoY29uc3QgdSBvZiB0aGlzLnVzZXJzLnVzZXJzKSB7XG5cdFx0XHRpZiAodS5pZCA9PT0gdXNlcklkKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1LnJvY2tldElkLCB7IGZpZWxkczogeyB1c2VybmFtZTogMSB9fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG4iLCJpbXBvcnQgeyBJbXBvcnRlcnMgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5pbXBvcnQgeyBIaXBDaGF0RW50ZXJwcmlzZUltcG9ydGVySW5mbyB9IGZyb20gJy4uL2luZm8nO1xuaW1wb3J0IHsgSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlciB9IGZyb20gJy4vaW1wb3J0ZXInO1xuXG5JbXBvcnRlcnMuYWRkKG5ldyBIaXBDaGF0RW50ZXJwcmlzZUltcG9ydGVySW5mbygpLCBIaXBDaGF0RW50ZXJwcmlzZUltcG9ydGVyKTtcbiJdfQ==
