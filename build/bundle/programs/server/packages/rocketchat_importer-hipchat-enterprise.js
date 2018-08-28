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
            const [type, id] = info.dir.split('/'); // ['users', '1']

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
            // What are these files!?
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
          import: this.importRecord._id,
          importer: this.name,
          type: 'users',
          users: tempUsers
        });
        this.users = this.collection.findOne(usersId);
        super.updateRecord({
          'count.users': tempUsers.length
        });
        super.addCountToTotal(tempUsers.length); // Insert the channels records.

        const channelsId = this.collection.insert({
          import: this.importRecord._id,
          importer: this.name,
          type: 'channels',
          channels: tempRooms
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
            messagesstatus: channel
          });

          if (Base.getBSONSize(msgs) > Base.getMaxBSONSize()) {
            Base.getBSONSafeArraysFromAnArray(msgs).forEach((splitMsg, i) => {
              const messagesId = this.collection.insert({
                import: this.importRecord._id,
                importer: this.name,
                type: 'messages',
                name: `${channel}/${i}`,
                messages: splitMsg
              });
              this.messages.get(channel).set(`${channel}.${i}`, this.collection.findOne(messagesId));
            });
          } else {
            const messagesId = this.collection.insert({
              import: this.importRecord._id,
              importer: this.name,
              type: 'messages',
              name: `${channel}`,
              messages: msgs
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
            messagesstatus: directMsgUser
          });

          if (Base.getBSONSize(msgs) > Base.getMaxBSONSize()) {
            Base.getBSONSafeArraysFromAnArray(msgs).forEach((splitMsg, i) => {
              const messagesId = this.collection.insert({
                import: this.importRecord._id,
                importer: this.name,
                type: 'directMessages',
                name: `${directMsgUser}/${i}`,
                messages: splitMsg
              });
              this.directMessages.get(directMsgUser).set(`${directMsgUser}.${i}`, this.collection.findOne(messagesId));
            });
          } else {
            const messagesId = this.collection.insert({
              import: this.importRecord._id,
              importer: this.name,
              type: 'directMessages',
              name: `${directMsgUser}`,
              messages: msgs
            });
            this.directMessages.get(directMsgUser).set(directMsgUser, this.collection.findOne(messagesId));
          }
        }

        super.updateRecord({
          'count.messages': messagesCount,
          messagesstatus: null
        });
        super.addCountToTotal(messagesCount); // Ensure we have some users, channels, and messages

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
      })); // Wish I could make this cleaner :(

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
    const started = Date.now(); // Ensure we're only going to import the users that the user has selected

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
        users: this.users.users
      }
    }); // Ensure we're only importing the channels the user has selected.

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
        channels: this.channels.channels
      }
    });
    const startedByUserId = Meteor.userId();
    Meteor.defer(() => {
      super.updateProgress(ProgressStep.IMPORTING_USERS);

      try {
        // Import the users
        for (const u of this.users.users) {
          this.logger.debug(`Starting the user import: ${u.username} and are we importing them? ${u.do_import}`);

          if (!u.do_import) {
            continue;
          }

          Meteor.runAsUser(startedByUserId, () => {
            let existantUser = RocketChat.models.Users.findOneByEmailAddress(u.email); // If we couldn't find one by their email address, try to find an existing user by their username

            if (!existantUser) {
              existantUser = RocketChat.models.Users.findOneByUsername(u.username);
            }

            if (existantUser) {
              // since we have an existing user, let's try a few things
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
                }); // TODO: Use moment timezone to calc the time offset - Meteor.call 'userSetUtcOffset', user.tz_offset / 3600

                RocketChat.models.Users.setName(userId, u.name); // TODO: Think about using a custom field for the users "title" field

                if (u.avatar) {
                  Meteor.call('setAvatarFromService', `data:image/png;base64,${u.avatar}`);
                } // Deleted users are 'inactive' users in Rocket.Chat


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
            users: this.users.users
          }
        }); // Import the channels

        super.updateProgress(ProgressStep.IMPORTING_CHANNELS);

        for (const c of this.channels.channels) {
          if (!c.do_import) {
            continue;
          }

          Meteor.runAsUser(startedByUserId, () => {
            const existantRoom = RocketChat.models.Rooms.findOneByName(c.name); // If the room exists or the name of it is 'general', then we don't need to create it again

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
              // Find the rocketchatId of the user who created this channel
              let creatorId = startedByUserId;

              for (const u of this.users.users) {
                if (u.id === c.creator && u.do_import) {
                  creatorId = u.rocketId;
                }
              } // Create the channel


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
            channels: this.channels.channels
          }
        }); // Import the Messages

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
                messagesstatus: `${ch}/${msgGroupData}.${msgs.messages.length}`
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
        } // Import the Direct Messages


        for (const [directMsgRoom, directMessagesMap] of this.directMessages.entries()) {
          const hipUser = this.getUserFromDirectMessageIdentifier(directMsgRoom);

          if (!hipUser.do_import) {
            continue;
          } // Verify this direct message user's room is valid (confusing but idk how else to explain it)


          if (!this.getRocketUserFromUserId(hipUser.id)) {
            continue;
          }

          for (const [msgGroupData, msgs] of directMessagesMap.entries()) {
            super.updateRecord({
              messagesstatus: `${directMsgRoom}/${msgGroupData}.${msgs.messages.length}`
            });

            for (const msg of msgs.messages) {
              if (isNaN(msg.ts)) {
                this.logger.warn(`Timestamp on a message in ${directMsgRoom}/${msgGroupData} is invalid`);
                super.addCountCompleted(1);
                continue;
              } // make sure the message sender is a valid user inside rocket.chat


              const sender = this.getRocketUserFromUserId(msg.senderId);

              if (!sender) {
                continue;
              } // make sure the receiver of the message is a valid rocket.chat user


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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1oaXBjaGF0LWVudGVycHJpc2UvaW5mby5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1oaXBjaGF0LWVudGVycHJpc2Uvc2VydmVyL2ltcG9ydGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyLWhpcGNoYXQtZW50ZXJwcmlzZS9zZXJ2ZXIvYWRkZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlckluZm8iLCJJbXBvcnRlckluZm8iLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiY29uc3RydWN0b3IiLCJ0ZXh0IiwiaHJlZiIsIkhpcENoYXRFbnRlcnByaXNlSW1wb3J0ZXIiLCJCYXNlIiwiUHJvZ3Jlc3NTdGVwIiwiU2VsZWN0aW9uIiwiU2VsZWN0aW9uQ2hhbm5lbCIsIlNlbGVjdGlvblVzZXIiLCJSZWFkYWJsZSIsInBhdGgiLCJkZWZhdWx0IiwicyIsImluZm8iLCJ6bGliIiwidGFyU3RyZWFtIiwiZXh0cmFjdCIsIm1lc3NhZ2VzIiwiTWFwIiwiZGlyZWN0TWVzc2FnZXMiLCJwcmVwYXJlIiwiZGF0YVVSSSIsInNlbnRDb250ZW50VHlwZSIsImZpbGVOYW1lIiwidGVtcFVzZXJzIiwidGVtcFJvb21zIiwidGVtcE1lc3NhZ2VzIiwidGVtcERpcmVjdE1lc3NhZ2VzIiwicHJvbWlzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib24iLCJNZXRlb3IiLCJiaW5kRW52aXJvbm1lbnQiLCJoZWFkZXIiLCJzdHJlYW0iLCJuZXh0IiwibmFtZSIsImVuZHNXaXRoIiwicmVzdW1lIiwicGFyc2UiLCJkYXRhIiwiY2h1bmsiLCJwdXNoIiwibG9nZ2VyIiwiZGVidWciLCJkYXRhU3RyaW5nIiwiQnVmZmVyIiwiY29uY2F0IiwidG9TdHJpbmciLCJmaWxlIiwiSlNPTiIsImJhc2UiLCJ1cGRhdGVQcm9ncmVzcyIsIlBSRVBBUklOR19VU0VSUyIsInUiLCJVc2VyIiwiZW1haWwiLCJpZCIsInVzZXJuYW1lIiwibWVudGlvbl9uYW1lIiwiYXZhdGFyIiwicmVwbGFjZSIsInRpbWV6b25lIiwiaXNEZWxldGVkIiwiaXNfZGVsZXRlZCIsIlBSRVBBUklOR19DSEFOTkVMUyIsInIiLCJSb29tIiwiY3JlYXRvciIsIm93bmVyIiwiY3JlYXRlZCIsIkRhdGUiLCJzbHVnaWZ5IiwiaXNQcml2YXRlIiwicHJpdmFjeSIsImlzQXJjaGl2ZWQiLCJpc19hcmNoaXZlZCIsInRvcGljIiwidHlwZSIsImRpciIsInNwbGl0Iiwicm9vbUlkZW50aWZpZXIiLCJtc2dzIiwibSIsIlByaXZhdGVVc2VyTWVzc2FnZSIsInNlbmRlcklkIiwic2VuZGVyIiwicmVjZWl2ZXJJZCIsInJlY2VpdmVyIiwibWVzc2FnZSIsImluZGV4T2YiLCJ0cyIsInRpbWVzdGFtcCIsInNldCIsInJvb21Nc2dzIiwiVXNlck1lc3NhZ2UiLCJ1c2VySWQiLCJOb3RpZmljYXRpb25NZXNzYWdlIiwiYWxpYXMiLCJUb3BpY1Jvb21NZXNzYWdlIiwid2FybiIsImVyciIsInVzZXJzSWQiLCJjb2xsZWN0aW9uIiwiaW5zZXJ0IiwiaW1wb3J0IiwiaW1wb3J0UmVjb3JkIiwiX2lkIiwiaW1wb3J0ZXIiLCJ1c2VycyIsImZpbmRPbmUiLCJ1cGRhdGVSZWNvcmQiLCJsZW5ndGgiLCJhZGRDb3VudFRvVG90YWwiLCJjaGFubmVsc0lkIiwiY2hhbm5lbHMiLCJQUkVQQVJJTkdfTUVTU0FHRVMiLCJtZXNzYWdlc0NvdW50IiwiY2hhbm5lbCIsImVudHJpZXMiLCJnZXQiLCJtZXNzYWdlc3N0YXR1cyIsImdldEJTT05TaXplIiwiZ2V0TWF4QlNPTlNpemUiLCJnZXRCU09OU2FmZUFycmF5c0Zyb21BbkFycmF5IiwiZm9yRWFjaCIsInNwbGl0TXNnIiwiaSIsIm1lc3NhZ2VzSWQiLCJkaXJlY3RNc2dVc2VyIiwiRVJST1IiLCJzZWxlY3Rpb25Vc2VycyIsIm1hcCIsInNlbGVjdGlvbkNoYW5uZWxzIiwic2VsZWN0aW9uTWVzc2FnZXMiLCJjb3VudCIsIlVTRVJfU0VMRUNUSU9OIiwicmVhZCIsInBpcGUiLCJjcmVhdGVHdW56aXAiLCJzdGFydEltcG9ydCIsImltcG9ydFNlbGVjdGlvbiIsInN0YXJ0ZWQiLCJub3ciLCJ1c2VyIiwidXNlcl9pZCIsImRvX2ltcG9ydCIsInVwZGF0ZSIsIiRzZXQiLCJjIiwiY2hhbm5lbF9pZCIsInN0YXJ0ZWRCeVVzZXJJZCIsImRlZmVyIiwiSU1QT1JUSU5HX1VTRVJTIiwicnVuQXNVc2VyIiwiZXhpc3RhbnRVc2VyIiwiUm9ja2V0Q2hhdCIsIm1vZGVscyIsIlVzZXJzIiwiZmluZE9uZUJ5RW1haWxBZGRyZXNzIiwiZmluZE9uZUJ5VXNlcm5hbWUiLCJyb2NrZXRJZCIsIiRhZGRUb1NldCIsImltcG9ydElkcyIsIkFjY291bnRzIiwiY3JlYXRlVXNlciIsInBhc3N3b3JkIiwiUmFuZG9tIiwiY2FsbCIsImpvaW5EZWZhdWx0Q2hhbm5lbHNTaWxlbmNlZCIsInNldE5hbWUiLCJkZWxldGVkIiwiYWRkQ291bnRDb21wbGV0ZWQiLCJJTVBPUlRJTkdfQ0hBTk5FTFMiLCJleGlzdGFudFJvb20iLCJSb29tcyIsImZpbmRPbmVCeU5hbWUiLCJ0b1VwcGVyQ2FzZSIsImNyZWF0b3JJZCIsInJvb21JbmZvIiwicmlkIiwiSU1QT1JUSU5HX01FU1NBR0VTIiwiY2giLCJtZXNzYWdlc01hcCIsImhpcENoYW5uZWwiLCJnZXRDaGFubmVsRnJvbVJvb21JZGVudGlmaWVyIiwicm9vbSIsImZpbmRPbmVCeUlkIiwiZmllbGRzIiwidXNlcm5hbWVzIiwidCIsIm1zZ0dyb3VwRGF0YSIsIm1zZyIsImlzTmFOIiwiZ2V0Um9ja2V0VXNlckZyb21Vc2VySWQiLCJzZW5kTWVzc2FnZSIsIk1lc3NhZ2VzIiwiY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIiLCJkaXJlY3RNc2dSb29tIiwiZGlyZWN0TWVzc2FnZXNNYXAiLCJoaXBVc2VyIiwiZ2V0VXNlckZyb21EaXJlY3RNZXNzYWdlSWRlbnRpZmllciIsInNvcnQiLCJqb2luIiwiRklOSVNISU5HIiwiRE9ORSIsImUiLCJlcnJvciIsInRpbWVUb29rIiwibG9nIiwiZ2V0UHJvZ3Jlc3MiLCJnZXRTZWxlY3Rpb24iLCJkaXJlY3RJZGVudGlmaWVyIiwiSW1wb3J0ZXJzIiwiYWRkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxpQ0FBOEIsTUFBSUE7QUFBbkMsQ0FBZDtBQUFpRixJQUFJQyxZQUFKO0FBQWlCSCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsNEJBQVIsQ0FBYixFQUFtRDtBQUFDRixlQUFhRyxDQUFiLEVBQWU7QUFBQ0gsbUJBQWFHLENBQWI7QUFBZTs7QUFBaEMsQ0FBbkQsRUFBcUYsQ0FBckY7O0FBRTNGLE1BQU1KLDZCQUFOLFNBQTRDQyxZQUE1QyxDQUF5RDtBQUMvREksZ0JBQWM7QUFDYixVQUFNLG1CQUFOLEVBQTJCLGtCQUEzQixFQUErQyxrQkFBL0MsRUFBbUUsQ0FDbEU7QUFDQ0MsWUFBTSx3Q0FEUDtBQUVDQyxZQUFNO0FBRlAsS0FEa0UsQ0FBbkU7QUFNQTs7QUFSOEQsQzs7Ozs7Ozs7Ozs7QUNGaEVULE9BQU9DLE1BQVAsQ0FBYztBQUFDUyw2QkFBMEIsTUFBSUE7QUFBL0IsQ0FBZDtBQUF5RSxJQUFJQyxJQUFKLEVBQVNDLFlBQVQsRUFBc0JDLFNBQXRCLEVBQWdDQyxnQkFBaEMsRUFBaURDLGFBQWpEO0FBQStEZixPQUFPSSxLQUFQLENBQWFDLFFBQVEsNEJBQVIsQ0FBYixFQUFtRDtBQUFDTSxPQUFLTCxDQUFMLEVBQU87QUFBQ0ssV0FBS0wsQ0FBTDtBQUFPLEdBQWhCOztBQUFpQk0sZUFBYU4sQ0FBYixFQUFlO0FBQUNNLG1CQUFhTixDQUFiO0FBQWUsR0FBaEQ7O0FB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QUFVeE4sQ0FBVjtBQUFZOztBQUExQixDQUFuRCxFQUErRSxDQUEvRTtBQUFrRixJQUFJSiw2QkFBSjtBQUFrQ0YsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLFNBQVIsQ0FBYixFQUFnQztBQUFDSCxnQ0FBOEJJLENBQTlCLEVBQWdDO0FBQUNKLG9DQUE4QkksQ0FBOUI7QUFBZ0M7O0FBQWxFLENBQWhDLEVBQW9HLENBQXBHO0FBQXVHLElBQUlJLHlCQUFKO0FBQThCVixPQUFPSSxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNLLDRCQUEwQkosQ0FBMUIsRUFBNEI7QUFBQ0ksZ0NBQTBCSixDQUExQjtBQUE0Qjs7QUFBMUQsQ0FBbkMsRUFBK0YsQ0FBL0Y7QUFJdlF3TixVQUFVQyxHQUFWLENBQWMsSUFBSTdOLDZCQUFKLEVBQWQsRUFBbURRLHlCQUFuRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2ltcG9ydGVyLWhpcGNoYXQtZW50ZXJwcmlzZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEltcG9ydGVySW5mbyB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmltcG9ydGVyJztcblxuZXhwb3J0IGNsYXNzIEhpcENoYXRFbnRlcnByaXNlSW1wb3J0ZXJJbmZvIGV4dGVuZHMgSW1wb3J0ZXJJbmZvIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2hpcGNoYXRlbnRlcnByaXNlJywgJ0hpcENoYXQgKHRhci5neiknLCAnYXBwbGljYXRpb24vZ3ppcCcsIFtcblx0XHRcdHtcblx0XHRcdFx0dGV4dDogJ0ltcG9ydGVyX0hpcENoYXRFbnRlcnByaXNlX0luZm9ybWF0aW9uJyxcblx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vcm9ja2V0LmNoYXQvZG9jcy9hZG1pbmlzdHJhdG9yLWd1aWRlcy9pbXBvcnQvaGlwY2hhdC9lbnRlcnByaXNlLycsXG5cdFx0XHR9LFxuXHRcdF0pO1xuXHR9XG59XG4iLCJpbXBvcnQge1xuXHRCYXNlLFxuXHRQcm9ncmVzc1N0ZXAsXG5cdFNlbGVjdGlvbixcblx0U2VsZWN0aW9uQ2hhbm5lbCxcblx0U2VsZWN0aW9uVXNlcixcbn0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6aW1wb3J0ZXInO1xuaW1wb3J0IHsgUmVhZGFibGUgfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbmV4cG9ydCBjbGFzcyBIaXBDaGF0RW50ZXJwcmlzZUltcG9ydGVyIGV4dGVuZHMgQmFzZSB7XG5cdGNvbnN0cnVjdG9yKGluZm8pIHtcblx0XHRzdXBlcihpbmZvKTtcblxuXHRcdHRoaXMuUmVhZGFibGUgPSBSZWFkYWJsZTtcblx0XHR0aGlzLnpsaWIgPSByZXF1aXJlKCd6bGliJyk7XG5cdFx0dGhpcy50YXJTdHJlYW0gPSByZXF1aXJlKCd0YXItc3RyZWFtJyk7XG5cdFx0dGhpcy5leHRyYWN0ID0gdGhpcy50YXJTdHJlYW0uZXh0cmFjdCgpO1xuXHRcdHRoaXMucGF0aCA9IHBhdGg7XG5cdFx0dGhpcy5tZXNzYWdlcyA9IG5ldyBNYXAoKTtcblx0XHR0aGlzLmRpcmVjdE1lc3NhZ2VzID0gbmV3IE1hcCgpO1xuXHR9XG5cblx0cHJlcGFyZShkYXRhVVJJLCBzZW50Q29udGVudFR5cGUsIGZpbGVOYW1lKSB7XG5cdFx0c3VwZXIucHJlcGFyZShkYXRhVVJJLCBzZW50Q29udGVudFR5cGUsIGZpbGVOYW1lKTtcblxuXHRcdGNvbnN0IHRlbXBVc2VycyA9IFtdO1xuXHRcdGNvbnN0IHRlbXBSb29tcyA9IFtdO1xuXHRcdGNvbnN0IHRlbXBNZXNzYWdlcyA9IG5ldyBNYXAoKTtcblx0XHRjb25zdCB0ZW1wRGlyZWN0TWVzc2FnZXMgPSBuZXcgTWFwKCk7XG5cdFx0Y29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdHRoaXMuZXh0cmFjdC5vbignZW50cnknLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChoZWFkZXIsIHN0cmVhbSwgbmV4dCkgPT4ge1xuXHRcdFx0XHRpZiAoIWhlYWRlci5uYW1lLmVuZHNXaXRoKCcuanNvbicpKSB7XG5cdFx0XHRcdFx0c3RyZWFtLnJlc3VtZSgpO1xuXHRcdFx0XHRcdHJldHVybiBuZXh0KCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBpbmZvID0gdGhpcy5wYXRoLnBhcnNlKGhlYWRlci5uYW1lKTtcblx0XHRcdFx0Y29uc3QgZGF0YSA9IFtdO1xuXG5cdFx0XHRcdHN0cmVhbS5vbignZGF0YScsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGNodW5rKSA9PiB7XG5cdFx0XHRcdFx0ZGF0YS5wdXNoKGNodW5rKTtcblx0XHRcdFx0fSkpO1xuXG5cdFx0XHRcdHN0cmVhbS5vbignZW5kJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoYFByb2Nlc3NpbmcgdGhlIGZpbGU6ICR7IGhlYWRlci5uYW1lIH1gKTtcblx0XHRcdFx0XHRjb25zdCBkYXRhU3RyaW5nID0gQnVmZmVyLmNvbmNhdChkYXRhKS50b1N0cmluZygpO1xuXHRcdFx0XHRcdGNvbnN0IGZpbGUgPSBKU09OLnBhcnNlKGRhdGFTdHJpbmcpO1xuXG5cdFx0XHRcdFx0aWYgKGluZm8uYmFzZSA9PT0gJ3VzZXJzLmpzb24nKSB7XG5cdFx0XHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuUFJFUEFSSU5HX1VTRVJTKTtcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgdSBvZiBmaWxlKSB7XG5cdFx0XHRcdFx0XHRcdGlmICghdS5Vc2VyLmVtYWlsKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dGVtcFVzZXJzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdGlkOiB1LlVzZXIuaWQsXG5cdFx0XHRcdFx0XHRcdFx0ZW1haWw6IHUuVXNlci5lbWFpbCxcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiB1LlVzZXIubmFtZSxcblx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogdS5Vc2VyLm1lbnRpb25fbmFtZSxcblx0XHRcdFx0XHRcdFx0XHRhdmF0YXI6IHUuVXNlci5hdmF0YXIgJiYgdS5Vc2VyLmF2YXRhci5yZXBsYWNlKC9cXG4vZywgJycpLFxuXHRcdFx0XHRcdFx0XHRcdHRpbWV6b25lOiB1LlVzZXIudGltZXpvbmUsXG5cdFx0XHRcdFx0XHRcdFx0aXNEZWxldGVkOiB1LlVzZXIuaXNfZGVsZXRlZCxcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChpbmZvLmJhc2UgPT09ICdyb29tcy5qc29uJykge1xuXHRcdFx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLlBSRVBBUklOR19DSEFOTkVMUyk7XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHIgb2YgZmlsZSkge1xuXHRcdFx0XHRcdFx0XHR0ZW1wUm9vbXMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0aWQ6IHIuUm9vbS5pZCxcblx0XHRcdFx0XHRcdFx0XHRjcmVhdG9yOiByLlJvb20ub3duZXIsXG5cdFx0XHRcdFx0XHRcdFx0Y3JlYXRlZDogbmV3IERhdGUoci5Sb29tLmNyZWF0ZWQpLFxuXHRcdFx0XHRcdFx0XHRcdG5hbWU6IHMuc2x1Z2lmeShyLlJvb20ubmFtZSksXG5cdFx0XHRcdFx0XHRcdFx0aXNQcml2YXRlOiByLlJvb20ucHJpdmFjeSA9PT0gJ3ByaXZhdGUnLFxuXHRcdFx0XHRcdFx0XHRcdGlzQXJjaGl2ZWQ6IHIuUm9vbS5pc19hcmNoaXZlZCxcblx0XHRcdFx0XHRcdFx0XHR0b3BpYzogci5Sb29tLnRvcGljLFxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2UgaWYgKGluZm8uYmFzZSA9PT0gJ2hpc3RvcnkuanNvbicpIHtcblx0XHRcdFx0XHRcdGNvbnN0IFt0eXBlLCBpZF0gPSBpbmZvLmRpci5zcGxpdCgnLycpOyAvLyBbJ3VzZXJzJywgJzEnXVxuXHRcdFx0XHRcdFx0Y29uc3Qgcm9vbUlkZW50aWZpZXIgPSBgJHsgdHlwZSB9LyR7IGlkIH1gO1xuXHRcdFx0XHRcdFx0aWYgKHR5cGUgPT09ICd1c2VycycpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgbXNncyA9IFtdO1xuXHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IG0gb2YgZmlsZSkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChtLlByaXZhdGVVc2VyTWVzc2FnZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0bXNncy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogJ3VzZXInLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZDogYGhpcGNoYXRlbnRlcnByaXNlLSR7IG0uUHJpdmF0ZVVzZXJNZXNzYWdlLmlkIH1gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZW5kZXJJZDogbS5Qcml2YXRlVXNlck1lc3NhZ2Uuc2VuZGVyLmlkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZWNlaXZlcklkOiBtLlByaXZhdGVVc2VyTWVzc2FnZS5yZWNlaXZlci5pZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogbS5Qcml2YXRlVXNlck1lc3NhZ2UubWVzc2FnZS5pbmRleE9mKCcvbWUgJykgPT09IC0xID8gbS5Qcml2YXRlVXNlck1lc3NhZ2UubWVzc2FnZSA6IGAkeyBtLlByaXZhdGVVc2VyTWVzc2FnZS5tZXNzYWdlLnJlcGxhY2UoL1xcL21lIC8sICdfJykgfV9gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbmV3IERhdGUobS5Qcml2YXRlVXNlck1lc3NhZ2UudGltZXN0YW1wLnNwbGl0KCcgJylbMF0pLFxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHRlbXBEaXJlY3RNZXNzYWdlcy5zZXQocm9vbUlkZW50aWZpZXIsIG1zZ3MpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICh0eXBlID09PSAncm9vbXMnKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJvb21Nc2dzID0gW107XG5cblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCBtIG9mIGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAobS5Vc2VyTWVzc2FnZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0cm9vbU1zZ3MucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICd1c2VyJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWQ6IGBoaXBjaGF0ZW50ZXJwcmlzZS0keyBpZCB9LSR7IG0uVXNlck1lc3NhZ2UuaWQgfWAsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHVzZXJJZDogbS5Vc2VyTWVzc2FnZS5zZW5kZXIuaWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IG0uVXNlck1lc3NhZ2UubWVzc2FnZS5pbmRleE9mKCcvbWUgJykgPT09IC0xID8gbS5Vc2VyTWVzc2FnZS5tZXNzYWdlIDogYCR7IG0uVXNlck1lc3NhZ2UubWVzc2FnZS5yZXBsYWNlKC9cXC9tZSAvLCAnXycpIH1fYCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHM6IG5ldyBEYXRlKG0uVXNlck1lc3NhZ2UudGltZXN0YW1wLnNwbGl0KCcgJylbMF0pLFxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtLk5vdGlmaWNhdGlvbk1lc3NhZ2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJvb21Nc2dzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAndXNlcicsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlkOiBgaGlwY2hhdGVudGVycHJpc2UtJHsgaWQgfS0keyBtLk5vdGlmaWNhdGlvbk1lc3NhZ2UuaWQgfWAsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHVzZXJJZDogJ3JvY2tldC5jYXQnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRhbGlhczogbS5Ob3RpZmljYXRpb25NZXNzYWdlLnNlbmRlcixcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogbS5Ob3RpZmljYXRpb25NZXNzYWdlLm1lc3NhZ2UuaW5kZXhPZignL21lICcpID09PSAtMSA/IG0uTm90aWZpY2F0aW9uTWVzc2FnZS5tZXNzYWdlIDogYCR7IG0uTm90aWZpY2F0aW9uTWVzc2FnZS5tZXNzYWdlLnJlcGxhY2UoL1xcL21lIC8sICdfJykgfV9gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbmV3IERhdGUobS5Ob3RpZmljYXRpb25NZXNzYWdlLnRpbWVzdGFtcC5zcGxpdCgnICcpWzBdKSxcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAobS5Ub3BpY1Jvb21NZXNzYWdlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyb29tTXNncy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogJ3RvcGljJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWQ6IGBoaXBjaGF0ZW50ZXJwcmlzZS0keyBpZCB9LSR7IG0uVG9waWNSb29tTWVzc2FnZS5pZCB9YCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXNlcklkOiBtLlRvcGljUm9vbU1lc3NhZ2Uuc2VuZGVyLmlkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbmV3IERhdGUobS5Ub3BpY1Jvb21NZXNzYWdlLnRpbWVzdGFtcC5zcGxpdCgnICcpWzBdKSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogbS5Ub3BpY1Jvb21NZXNzYWdlLm1lc3NhZ2UsXG5cdFx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5sb2dnZXIud2FybignSGlwQ2hhdCBFbnRlcnByaXNlIGltcG9ydGVyIGlzblxcJ3QgY29uZmlndXJlZCB0byBoYW5kbGUgdGhpcyBtZXNzYWdlOicsIG0pO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0ZW1wTWVzc2FnZXMuc2V0KHJvb21JZGVudGlmaWVyLCByb29tTXNncyk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBIaXBDaGF0IEVudGVycHJpc2UgaW1wb3J0ZXIgaXNuJ3QgY29uZmlndXJlZCB0byBoYW5kbGUgXCIkeyB0eXBlIH1cIiBmaWxlcy5gKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gV2hhdCBhcmUgdGhlc2UgZmlsZXMhP1xuXHRcdFx0XHRcdFx0dGhpcy5sb2dnZXIud2FybihgSGlwQ2hhdCBFbnRlcnByaXNlIGltcG9ydGVyIGRvZXNuJ3Qga25vdyB3aGF0IHRvIGRvIHdpdGggdGhlIGZpbGUgXCIkeyBoZWFkZXIubmFtZSB9XCIgOm9gLCBpbmZvKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bmV4dCgpO1xuXHRcdFx0XHR9KSk7XG5cdFx0XHRcdHN0cmVhbS5vbignZXJyb3InLCAoKSA9PiBuZXh0KCkpO1xuXG5cdFx0XHRcdHN0cmVhbS5yZXN1bWUoKTtcblx0XHRcdH0pKTtcblxuXHRcdFx0dGhpcy5leHRyYWN0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcblx0XHRcdFx0dGhpcy5sb2dnZXIud2FybignZXh0cmFjdCBlcnJvcjonLCBlcnIpO1xuXHRcdFx0XHRyZWplY3QoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmV4dHJhY3Qub24oJ2ZpbmlzaCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHQvLyBJbnNlcnQgdGhlIHVzZXJzIHJlY29yZCwgZXZlbnR1YWxseSB0aGlzIG1pZ2h0IGhhdmUgdG8gYmUgc3BsaXQgaW50byBzZXZlcmFsIG9uZXMgYXMgd2VsbFxuXHRcdFx0XHQvLyBpZiBzb21lb25lIHRyaWVzIHRvIGltcG9ydCBhIHNldmVyYWwgdGhvdXNhbmRzIHVzZXJzIGluc3RhbmNlXG5cdFx0XHRcdGNvbnN0IHVzZXJzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHsgaW1wb3J0OiB0aGlzLmltcG9ydFJlY29yZC5faWQsIGltcG9ydGVyOiB0aGlzLm5hbWUsIHR5cGU6ICd1c2VycycsIHVzZXJzOiB0ZW1wVXNlcnMgfSk7XG5cdFx0XHRcdHRoaXMudXNlcnMgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZSh1c2Vyc0lkKTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUmVjb3JkKHsgJ2NvdW50LnVzZXJzJzogdGVtcFVzZXJzLmxlbmd0aCB9KTtcblx0XHRcdFx0c3VwZXIuYWRkQ291bnRUb1RvdGFsKHRlbXBVc2Vycy5sZW5ndGgpO1xuXG5cdFx0XHRcdC8vIEluc2VydCB0aGUgY2hhbm5lbHMgcmVjb3Jkcy5cblx0XHRcdFx0Y29uc3QgY2hhbm5lbHNJZCA9IHRoaXMuY29sbGVjdGlvbi5pbnNlcnQoeyBpbXBvcnQ6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgaW1wb3J0ZXI6IHRoaXMubmFtZSwgdHlwZTogJ2NoYW5uZWxzJywgY2hhbm5lbHM6IHRlbXBSb29tcyB9KTtcblx0XHRcdFx0dGhpcy5jaGFubmVscyA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKGNoYW5uZWxzSWQpO1xuXHRcdFx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyAnY291bnQuY2hhbm5lbHMnOiB0ZW1wUm9vbXMubGVuZ3RoIH0pO1xuXHRcdFx0XHRzdXBlci5hZGRDb3VudFRvVG90YWwodGVtcFJvb21zLmxlbmd0aCk7XG5cblx0XHRcdFx0Ly8gU2F2ZSB0aGUgbWVzc2FnZXMgcmVjb3JkcyB0byB0aGUgaW1wb3J0IHJlY29yZCBmb3IgYHN0YXJ0SW1wb3J0YCB1c2FnZVxuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuUFJFUEFSSU5HX01FU1NBR0VTKTtcblx0XHRcdFx0bGV0IG1lc3NhZ2VzQ291bnQgPSAwO1xuXHRcdFx0XHRmb3IgKGNvbnN0IFtjaGFubmVsLCBtc2dzXSBvZiB0ZW1wTWVzc2FnZXMuZW50cmllcygpKSB7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLm1lc3NhZ2VzLmdldChjaGFubmVsKSkge1xuXHRcdFx0XHRcdFx0dGhpcy5tZXNzYWdlcy5zZXQoY2hhbm5lbCwgbmV3IE1hcCgpKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRtZXNzYWdlc0NvdW50ICs9IG1zZ3MubGVuZ3RoO1xuXHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVJlY29yZCh7IG1lc3NhZ2Vzc3RhdHVzOiBjaGFubmVsIH0pO1xuXG5cdFx0XHRcdFx0aWYgKEJhc2UuZ2V0QlNPTlNpemUobXNncykgPiBCYXNlLmdldE1heEJTT05TaXplKCkpIHtcblx0XHRcdFx0XHRcdEJhc2UuZ2V0QlNPTlNhZmVBcnJheXNGcm9tQW5BcnJheShtc2dzKS5mb3JFYWNoKChzcGxpdE1zZywgaSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBtZXNzYWdlc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7IGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLCBpbXBvcnRlcjogdGhpcy5uYW1lLCB0eXBlOiAnbWVzc2FnZXMnLCBuYW1lOiBgJHsgY2hhbm5lbCB9LyR7IGkgfWAsIG1lc3NhZ2VzOiBzcGxpdE1zZyB9KTtcblx0XHRcdFx0XHRcdFx0dGhpcy5tZXNzYWdlcy5nZXQoY2hhbm5lbCkuc2V0KGAkeyBjaGFubmVsIH0uJHsgaSB9YCwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUobWVzc2FnZXNJZCkpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHsgaW1wb3J0OiB0aGlzLmltcG9ydFJlY29yZC5faWQsIGltcG9ydGVyOiB0aGlzLm5hbWUsIHR5cGU6ICdtZXNzYWdlcycsIG5hbWU6IGAkeyBjaGFubmVsIH1gLCBtZXNzYWdlczogbXNncyB9KTtcblx0XHRcdFx0XHRcdHRoaXMubWVzc2FnZXMuZ2V0KGNoYW5uZWwpLnNldChjaGFubmVsLCB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShtZXNzYWdlc0lkKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yIChjb25zdCBbZGlyZWN0TXNnVXNlciwgbXNnc10gb2YgdGVtcERpcmVjdE1lc3NhZ2VzLmVudHJpZXMoKSkge1xuXHRcdFx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKGBQcmVwYXJpbmcgdGhlIGRpcmVjdCBtZXNzYWdlcyBmb3I6ICR7IGRpcmVjdE1zZ1VzZXIgfWApO1xuXHRcdFx0XHRcdGlmICghdGhpcy5kaXJlY3RNZXNzYWdlcy5nZXQoZGlyZWN0TXNnVXNlcikpIHtcblx0XHRcdFx0XHRcdHRoaXMuZGlyZWN0TWVzc2FnZXMuc2V0KGRpcmVjdE1zZ1VzZXIsIG5ldyBNYXAoKSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0bWVzc2FnZXNDb3VudCArPSBtc2dzLmxlbmd0aDtcblx0XHRcdFx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyBtZXNzYWdlc3N0YXR1czogZGlyZWN0TXNnVXNlciB9KTtcblxuXHRcdFx0XHRcdGlmIChCYXNlLmdldEJTT05TaXplKG1zZ3MpID4gQmFzZS5nZXRNYXhCU09OU2l6ZSgpKSB7XG5cdFx0XHRcdFx0XHRCYXNlLmdldEJTT05TYWZlQXJyYXlzRnJvbUFuQXJyYXkobXNncykuZm9yRWFjaCgoc3BsaXRNc2csIGkpID0+IHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgbWVzc2FnZXNJZCA9IHRoaXMuY29sbGVjdGlvbi5pbnNlcnQoeyBpbXBvcnQ6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgaW1wb3J0ZXI6IHRoaXMubmFtZSwgdHlwZTogJ2RpcmVjdE1lc3NhZ2VzJywgbmFtZTogYCR7IGRpcmVjdE1zZ1VzZXIgfS8keyBpIH1gLCBtZXNzYWdlczogc3BsaXRNc2cgfSk7XG5cdFx0XHRcdFx0XHRcdHRoaXMuZGlyZWN0TWVzc2FnZXMuZ2V0KGRpcmVjdE1zZ1VzZXIpLnNldChgJHsgZGlyZWN0TXNnVXNlciB9LiR7IGkgfWAsIHRoaXMuY29sbGVjdGlvbi5maW5kT25lKG1lc3NhZ2VzSWQpKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjb25zdCBtZXNzYWdlc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7IGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLCBpbXBvcnRlcjogdGhpcy5uYW1lLCB0eXBlOiAnZGlyZWN0TWVzc2FnZXMnLCBuYW1lOiBgJHsgZGlyZWN0TXNnVXNlciB9YCwgbWVzc2FnZXM6IG1zZ3MgfSk7XG5cdFx0XHRcdFx0XHR0aGlzLmRpcmVjdE1lc3NhZ2VzLmdldChkaXJlY3RNc2dVc2VyKS5zZXQoZGlyZWN0TXNnVXNlciwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUobWVzc2FnZXNJZCkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVJlY29yZCh7ICdjb3VudC5tZXNzYWdlcyc6IG1lc3NhZ2VzQ291bnQsIG1lc3NhZ2Vzc3RhdHVzOiBudWxsIH0pO1xuXHRcdFx0XHRzdXBlci5hZGRDb3VudFRvVG90YWwobWVzc2FnZXNDb3VudCk7XG5cblx0XHRcdFx0Ly8gRW5zdXJlIHdlIGhhdmUgc29tZSB1c2VycywgY2hhbm5lbHMsIGFuZCBtZXNzYWdlc1xuXHRcdFx0XHRpZiAodGVtcFVzZXJzLmxlbmd0aCA9PT0gMCB8fCB0ZW1wUm9vbXMubGVuZ3RoID09PSAwIHx8IG1lc3NhZ2VzQ291bnQgPT09IDApIHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBUaGUgbG9hZGVkIHVzZXJzIGNvdW50ICR7IHRlbXBVc2Vycy5sZW5ndGggfSwgdGhlIGxvYWRlZCByb29tcyAkeyB0ZW1wUm9vbXMubGVuZ3RoIH0sIGFuZCB0aGUgbG9hZGVkIG1lc3NhZ2VzICR7IG1lc3NhZ2VzQ291bnQgfWApO1xuXHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5FUlJPUik7XG5cdFx0XHRcdFx0cmVqZWN0KCk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3Qgc2VsZWN0aW9uVXNlcnMgPSB0ZW1wVXNlcnMubWFwKCh1KSA9PiBuZXcgU2VsZWN0aW9uVXNlcih1LmlkLCB1LnVzZXJuYW1lLCB1LmVtYWlsLCB1LmlzRGVsZXRlZCwgZmFsc2UsIHRydWUpKTtcblx0XHRcdFx0Y29uc3Qgc2VsZWN0aW9uQ2hhbm5lbHMgPSB0ZW1wUm9vbXMubWFwKChyKSA9PiBuZXcgU2VsZWN0aW9uQ2hhbm5lbChyLmlkLCByLm5hbWUsIHIuaXNBcmNoaXZlZCwgdHJ1ZSwgci5pc1ByaXZhdGUpKTtcblx0XHRcdFx0Y29uc3Qgc2VsZWN0aW9uTWVzc2FnZXMgPSB0aGlzLmltcG9ydFJlY29yZC5jb3VudC5tZXNzYWdlcztcblxuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuVVNFUl9TRUxFQ1RJT04pO1xuXG5cdFx0XHRcdHJlc29sdmUobmV3IFNlbGVjdGlvbih0aGlzLm5hbWUsIHNlbGVjdGlvblVzZXJzLCBzZWxlY3Rpb25DaGFubmVscywgc2VsZWN0aW9uTWVzc2FnZXMpKTtcblx0XHRcdH0pKTtcblxuXHRcdFx0Ly8gV2lzaCBJIGNvdWxkIG1ha2UgdGhpcyBjbGVhbmVyIDooXG5cdFx0XHRjb25zdCBzcGxpdCA9IGRhdGFVUkkuc3BsaXQoJywnKTtcblx0XHRcdGNvbnN0IHJlYWQgPSBuZXcgdGhpcy5SZWFkYWJsZTtcblx0XHRcdHJlYWQucHVzaChuZXcgQnVmZmVyKHNwbGl0W3NwbGl0Lmxlbmd0aCAtIDFdLCAnYmFzZTY0JykpO1xuXHRcdFx0cmVhZC5wdXNoKG51bGwpO1xuXHRcdFx0cmVhZC5waXBlKHRoaXMuemxpYi5jcmVhdGVHdW56aXAoKSkucGlwZSh0aGlzLmV4dHJhY3QpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHByb21pc2U7XG5cdH1cblxuXHRzdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pIHtcblx0XHRzdXBlci5zdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pO1xuXHRcdGNvbnN0IHN0YXJ0ZWQgPSBEYXRlLm5vdygpO1xuXG5cdFx0Ly8gRW5zdXJlIHdlJ3JlIG9ubHkgZ29pbmcgdG8gaW1wb3J0IHRoZSB1c2VycyB0aGF0IHRoZSB1c2VyIGhhcyBzZWxlY3RlZFxuXHRcdGZvciAoY29uc3QgdXNlciBvZiBpbXBvcnRTZWxlY3Rpb24udXNlcnMpIHtcblx0XHRcdGZvciAoY29uc3QgdSBvZiB0aGlzLnVzZXJzLnVzZXJzKSB7XG5cdFx0XHRcdGlmICh1LmlkID09PSB1c2VyLnVzZXJfaWQpIHtcblx0XHRcdFx0XHR1LmRvX2ltcG9ydCA9IHVzZXIuZG9faW1wb3J0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuY29sbGVjdGlvbi51cGRhdGUoeyBfaWQ6IHRoaXMudXNlcnMuX2lkIH0sIHsgJHNldDogeyB1c2VyczogdGhpcy51c2Vycy51c2VycyB9IH0pO1xuXG5cdFx0Ly8gRW5zdXJlIHdlJ3JlIG9ubHkgaW1wb3J0aW5nIHRoZSBjaGFubmVscyB0aGUgdXNlciBoYXMgc2VsZWN0ZWQuXG5cdFx0Zm9yIChjb25zdCBjaGFubmVsIG9mIGltcG9ydFNlbGVjdGlvbi5jaGFubmVscykge1xuXHRcdFx0Zm9yIChjb25zdCBjIG9mIHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMpIHtcblx0XHRcdFx0aWYgKGMuaWQgPT09IGNoYW5uZWwuY2hhbm5lbF9pZCkge1xuXHRcdFx0XHRcdGMuZG9faW1wb3J0ID0gY2hhbm5lbC5kb19pbXBvcnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy5jaGFubmVscy5faWQgfSwgeyAkc2V0OiB7IGNoYW5uZWxzOiB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzIH0gfSk7XG5cblx0XHRjb25zdCBzdGFydGVkQnlVc2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5JTVBPUlRJTkdfVVNFUlMpO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHQvLyBJbXBvcnQgdGhlIHVzZXJzXG5cdFx0XHRcdGZvciAoY29uc3QgdSBvZiB0aGlzLnVzZXJzLnVzZXJzKSB7XG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoYFN0YXJ0aW5nIHRoZSB1c2VyIGltcG9ydDogJHsgdS51c2VybmFtZSB9IGFuZCBhcmUgd2UgaW1wb3J0aW5nIHRoZW0/ICR7IHUuZG9faW1wb3J0IH1gKTtcblx0XHRcdFx0XHRpZiAoIXUuZG9faW1wb3J0KSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHN0YXJ0ZWRCeVVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0bGV0IGV4aXN0YW50VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUVtYWlsQWRkcmVzcyh1LmVtYWlsKTtcblxuXHRcdFx0XHRcdFx0Ly8gSWYgd2UgY291bGRuJ3QgZmluZCBvbmUgYnkgdGhlaXIgZW1haWwgYWRkcmVzcywgdHJ5IHRvIGZpbmQgYW4gZXhpc3RpbmcgdXNlciBieSB0aGVpciB1c2VybmFtZVxuXHRcdFx0XHRcdFx0aWYgKCFleGlzdGFudFVzZXIpIHtcblx0XHRcdFx0XHRcdFx0ZXhpc3RhbnRVc2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodS51c2VybmFtZSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChleGlzdGFudFVzZXIpIHtcblx0XHRcdFx0XHRcdFx0Ly8gc2luY2Ugd2UgaGF2ZSBhbiBleGlzdGluZyB1c2VyLCBsZXQncyB0cnkgYSBmZXcgdGhpbmdzXG5cdFx0XHRcdFx0XHRcdHUucm9ja2V0SWQgPSBleGlzdGFudFVzZXIuX2lkO1xuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy51cGRhdGUoeyBfaWQ6IHUucm9ja2V0SWQgfSwgeyAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiB1LmlkIH0gfSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB1c2VySWQgPSBBY2NvdW50cy5jcmVhdGVVc2VyKHsgZW1haWw6IHUuZW1haWwsIHBhc3N3b3JkOiBSYW5kb20uaWQoKSB9KTtcblx0XHRcdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnc2V0VXNlcm5hbWUnLCB1LnVzZXJuYW1lLCB7IGpvaW5EZWZhdWx0Q2hhbm5lbHNTaWxlbmNlZDogdHJ1ZSB9KTtcblx0XHRcdFx0XHRcdFx0XHQvLyBUT0RPOiBVc2UgbW9tZW50IHRpbWV6b25lIHRvIGNhbGMgdGhlIHRpbWUgb2Zmc2V0IC0gTWV0ZW9yLmNhbGwgJ3VzZXJTZXRVdGNPZmZzZXQnLCB1c2VyLnR6X29mZnNldCAvIDM2MDBcblx0XHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXROYW1lKHVzZXJJZCwgdS5uYW1lKTtcblx0XHRcdFx0XHRcdFx0XHQvLyBUT0RPOiBUaGluayBhYm91dCB1c2luZyBhIGN1c3RvbSBmaWVsZCBmb3IgdGhlIHVzZXJzIFwidGl0bGVcIiBmaWVsZFxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHUuYXZhdGFyKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnc2V0QXZhdGFyRnJvbVNlcnZpY2UnLCBgZGF0YTppbWFnZS9wbmc7YmFzZTY0LCR7IHUuYXZhdGFyIH1gKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHQvLyBEZWxldGVkIHVzZXJzIGFyZSAnaW5hY3RpdmUnIHVzZXJzIGluIFJvY2tldC5DaGF0XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHUuZGVsZXRlZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJBY3RpdmVTdGF0dXMnLCB1c2VySWQsIGZhbHNlKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy51cGRhdGUoeyBfaWQ6IHVzZXJJZCB9LCB7ICRhZGRUb1NldDogeyBpbXBvcnRJZHM6IHUuaWQgfSB9KTtcblx0XHRcdFx0XHRcdFx0XHR1LnJvY2tldElkID0gdXNlcklkO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0c3VwZXIuYWRkQ291bnRDb21wbGV0ZWQoMSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy51c2Vycy5faWQgfSwgeyAkc2V0OiB7IHVzZXJzOiB0aGlzLnVzZXJzLnVzZXJzIH0gfSk7XG5cblx0XHRcdFx0Ly8gSW1wb3J0IHRoZSBjaGFubmVsc1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuSU1QT1JUSU5HX0NIQU5ORUxTKTtcblx0XHRcdFx0Zm9yIChjb25zdCBjIG9mIHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMpIHtcblx0XHRcdFx0XHRpZiAoIWMuZG9faW1wb3J0KSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHN0YXJ0ZWRCeVVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3QgZXhpc3RhbnRSb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShjLm5hbWUpO1xuXHRcdFx0XHRcdFx0Ly8gSWYgdGhlIHJvb20gZXhpc3RzIG9yIHRoZSBuYW1lIG9mIGl0IGlzICdnZW5lcmFsJywgdGhlbiB3ZSBkb24ndCBuZWVkIHRvIGNyZWF0ZSBpdCBhZ2FpblxuXHRcdFx0XHRcdFx0aWYgKGV4aXN0YW50Um9vbSB8fCBjLm5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ0dFTkVSQUwnKSB7XG5cdFx0XHRcdFx0XHRcdGMucm9ja2V0SWQgPSBjLm5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ0dFTkVSQUwnID8gJ0dFTkVSQUwnIDogZXhpc3RhbnRSb29tLl9pZDtcblx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlKHsgX2lkOiBjLnJvY2tldElkIH0sIHsgJGFkZFRvU2V0OiB7IGltcG9ydElkczogYy5pZCB9IH0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Ly8gRmluZCB0aGUgcm9ja2V0Y2hhdElkIG9mIHRoZSB1c2VyIHdobyBjcmVhdGVkIHRoaXMgY2hhbm5lbFxuXHRcdFx0XHRcdFx0XHRsZXQgY3JlYXRvcklkID0gc3RhcnRlZEJ5VXNlcklkO1xuXHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHUgb2YgdGhpcy51c2Vycy51c2Vycykge1xuXHRcdFx0XHRcdFx0XHRcdGlmICh1LmlkID09PSBjLmNyZWF0b3IgJiYgdS5kb19pbXBvcnQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNyZWF0b3JJZCA9IHUucm9ja2V0SWQ7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly8gQ3JlYXRlIHRoZSBjaGFubmVsXG5cdFx0XHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoY3JlYXRvcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qgcm9vbUluZm8gPSBNZXRlb3IuY2FsbChjLmlzUHJpdmF0ZSA/ICdjcmVhdGVQcml2YXRlR3JvdXAnIDogJ2NyZWF0ZUNoYW5uZWwnLCBjLm5hbWUsIFtdKTtcblx0XHRcdFx0XHRcdFx0XHRjLnJvY2tldElkID0gcm9vbUluZm8ucmlkO1xuXHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGUoeyBfaWQ6IGMucm9ja2V0SWQgfSwgeyAkc2V0OiB7IHRzOiBjLmNyZWF0ZWQsIHRvcGljOiBjLnRvcGljIH0sICRhZGRUb1NldDogeyBpbXBvcnRJZHM6IGMuaWQgfSB9KTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0c3VwZXIuYWRkQ291bnRDb21wbGV0ZWQoMSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy5jaGFubmVscy5faWQgfSwgeyAkc2V0OiB7IGNoYW5uZWxzOiB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzIH0gfSk7XG5cblx0XHRcdFx0Ly8gSW1wb3J0IHRoZSBNZXNzYWdlc1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuSU1QT1JUSU5HX01FU1NBR0VTKTtcblx0XHRcdFx0Zm9yIChjb25zdCBbY2gsIG1lc3NhZ2VzTWFwXSBvZiB0aGlzLm1lc3NhZ2VzLmVudHJpZXMoKSkge1xuXHRcdFx0XHRcdGNvbnN0IGhpcENoYW5uZWwgPSB0aGlzLmdldENoYW5uZWxGcm9tUm9vbUlkZW50aWZpZXIoY2gpO1xuXHRcdFx0XHRcdGlmICghaGlwQ2hhbm5lbC5kb19pbXBvcnQpIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChoaXBDaGFubmVsLnJvY2tldElkLCB7IGZpZWxkczogeyB1c2VybmFtZXM6IDEsIHQ6IDEsIG5hbWU6IDEgfSB9KTtcblx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHN0YXJ0ZWRCeVVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0Zm9yIChjb25zdCBbbXNnR3JvdXBEYXRhLCBtc2dzXSBvZiBtZXNzYWdlc01hcC5lbnRyaWVzKCkpIHtcblx0XHRcdFx0XHRcdFx0c3VwZXIudXBkYXRlUmVjb3JkKHsgbWVzc2FnZXNzdGF0dXM6IGAkeyBjaCB9LyR7IG1zZ0dyb3VwRGF0YSB9LiR7IG1zZ3MubWVzc2FnZXMubGVuZ3RoIH1gIH0pO1xuXHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IG1zZyBvZiBtc2dzLm1lc3NhZ2VzKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGlzTmFOKG1zZy50cykpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYFRpbWVzdGFtcCBvbiBhIG1lc3NhZ2UgaW4gJHsgY2ggfS8keyBtc2dHcm91cERhdGEgfSBpcyBpbnZhbGlkYCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRzdXBlci5hZGRDb3VudENvbXBsZXRlZCgxKTtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGNyZWF0b3IgPSB0aGlzLmdldFJvY2tldFVzZXJGcm9tVXNlcklkKG1zZy51c2VySWQpO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChjcmVhdG9yKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRzd2l0Y2ggKG1zZy50eXBlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgJ3VzZXInOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2VuZE1lc3NhZ2UoY3JlYXRvciwge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0X2lkOiBtc2cuaWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbXNnLnRzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bXNnOiBtc2cudGV4dCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJpZDogcm9vbS5faWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRhbGlhczogbXNnLmFsaWFzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dToge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRfaWQ6IGNyZWF0b3IuX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogY3JlYXRvci51c2VybmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSwgcm9vbSwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgJ3RvcGljJzpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVSb29tU2V0dGluZ3NDaGFuZ2VkV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcigncm9vbV9jaGFuZ2VkX3RvcGljJywgcm9vbS5faWQsIG1zZy50ZXh0LCBjcmVhdG9yLCB7IF9pZDogbXNnLmlkLCB0czogbXNnLnRzIH0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdHN1cGVyLmFkZENvdW50Q29tcGxldGVkKDEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBJbXBvcnQgdGhlIERpcmVjdCBNZXNzYWdlc1xuXHRcdFx0XHRmb3IgKGNvbnN0IFtkaXJlY3RNc2dSb29tLCBkaXJlY3RNZXNzYWdlc01hcF0gb2YgdGhpcy5kaXJlY3RNZXNzYWdlcy5lbnRyaWVzKCkpIHtcblx0XHRcdFx0XHRjb25zdCBoaXBVc2VyID0gdGhpcy5nZXRVc2VyRnJvbURpcmVjdE1lc3NhZ2VJZGVudGlmaWVyKGRpcmVjdE1zZ1Jvb20pO1xuXHRcdFx0XHRcdGlmICghaGlwVXNlci5kb19pbXBvcnQpIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFZlcmlmeSB0aGlzIGRpcmVjdCBtZXNzYWdlIHVzZXIncyByb29tIGlzIHZhbGlkIChjb25mdXNpbmcgYnV0IGlkayBob3cgZWxzZSB0byBleHBsYWluIGl0KVxuXHRcdFx0XHRcdGlmICghdGhpcy5nZXRSb2NrZXRVc2VyRnJvbVVzZXJJZChoaXBVc2VyLmlkKSkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBbbXNnR3JvdXBEYXRhLCBtc2dzXSBvZiBkaXJlY3RNZXNzYWdlc01hcC5lbnRyaWVzKCkpIHtcblx0XHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVJlY29yZCh7IG1lc3NhZ2Vzc3RhdHVzOiBgJHsgZGlyZWN0TXNnUm9vbSB9LyR7IG1zZ0dyb3VwRGF0YSB9LiR7IG1zZ3MubWVzc2FnZXMubGVuZ3RoIH1gIH0pO1xuXHRcdFx0XHRcdFx0Zm9yIChjb25zdCBtc2cgb2YgbXNncy5tZXNzYWdlcykge1xuXHRcdFx0XHRcdFx0XHRpZiAoaXNOYU4obXNnLnRzKSkge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYFRpbWVzdGFtcCBvbiBhIG1lc3NhZ2UgaW4gJHsgZGlyZWN0TXNnUm9vbSB9LyR7IG1zZ0dyb3VwRGF0YSB9IGlzIGludmFsaWRgKTtcblx0XHRcdFx0XHRcdFx0XHRzdXBlci5hZGRDb3VudENvbXBsZXRlZCgxKTtcblx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgbWVzc2FnZSBzZW5kZXIgaXMgYSB2YWxpZCB1c2VyIGluc2lkZSByb2NrZXQuY2hhdFxuXHRcdFx0XHRcdFx0XHRjb25zdCBzZW5kZXIgPSB0aGlzLmdldFJvY2tldFVzZXJGcm9tVXNlcklkKG1zZy5zZW5kZXJJZCk7XG5cdFx0XHRcdFx0XHRcdGlmICghc2VuZGVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIHJlY2VpdmVyIG9mIHRoZSBtZXNzYWdlIGlzIGEgdmFsaWQgcm9ja2V0LmNoYXQgdXNlclxuXHRcdFx0XHRcdFx0XHRjb25zdCByZWNlaXZlciA9IHRoaXMuZ2V0Um9ja2V0VXNlckZyb21Vc2VySWQobXNnLnJlY2VpdmVySWQpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIXJlY2VpdmVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRsZXQgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKFtyZWNlaXZlci5faWQsIHNlbmRlci5faWRdLnNvcnQoKS5qb2luKCcnKSk7XG5cdFx0XHRcdFx0XHRcdGlmICghcm9vbSkge1xuXHRcdFx0XHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc2VuZGVyLl9pZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3Qgcm9vbUluZm8gPSBNZXRlb3IuY2FsbCgnY3JlYXRlRGlyZWN0TWVzc2FnZScsIHJlY2VpdmVyLnVzZXJuYW1lKTtcblx0XHRcdFx0XHRcdFx0XHRcdHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSW5mby5yaWQpO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcihzZW5kZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zZW5kTWVzc2FnZShzZW5kZXIsIHtcblx0XHRcdFx0XHRcdFx0XHRcdF9pZDogbXNnLmlkLFxuXHRcdFx0XHRcdFx0XHRcdFx0dHM6IG1zZy50cyxcblx0XHRcdFx0XHRcdFx0XHRcdG1zZzogbXNnLnRleHQsXG5cdFx0XHRcdFx0XHRcdFx0XHRyaWQ6IHJvb20uX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0dToge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRfaWQ6IHNlbmRlci5faWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBzZW5kZXIudXNlcm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdH0sIHJvb20sIHRydWUpO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRklOSVNISU5HKTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkRPTkUpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihlKTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkVSUk9SKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdGltZVRvb2sgPSBEYXRlLm5vdygpIC0gc3RhcnRlZDtcblx0XHRcdHRoaXMubG9nZ2VyLmxvZyhgSGlwQ2hhdCBFbnRlcnByaXNlIEltcG9ydCB0b29rICR7IHRpbWVUb29rIH0gbWlsbGlzZWNvbmRzLmApO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHN1cGVyLmdldFByb2dyZXNzKCk7XG5cdH1cblxuXHRnZXRTZWxlY3Rpb24oKSB7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uVXNlcnMgPSB0aGlzLnVzZXJzLnVzZXJzLm1hcCgodSkgPT4gbmV3IFNlbGVjdGlvblVzZXIodS5pZCwgdS51c2VybmFtZSwgdS5lbWFpbCwgZmFsc2UsIGZhbHNlLCB0cnVlKSk7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uQ2hhbm5lbHMgPSB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzLm1hcCgoYykgPT4gbmV3IFNlbGVjdGlvbkNoYW5uZWwoYy5pZCwgYy5uYW1lLCBmYWxzZSwgdHJ1ZSwgYy5pc1ByaXZhdGUpKTtcblx0XHRjb25zdCBzZWxlY3Rpb25NZXNzYWdlcyA9IHRoaXMuaW1wb3J0UmVjb3JkLmNvdW50Lm1lc3NhZ2VzO1xuXG5cdFx0cmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5uYW1lLCBzZWxlY3Rpb25Vc2Vycywgc2VsZWN0aW9uQ2hhbm5lbHMsIHNlbGVjdGlvbk1lc3NhZ2VzKTtcblx0fVxuXG5cdGdldENoYW5uZWxGcm9tUm9vbUlkZW50aWZpZXIocm9vbUlkZW50aWZpZXIpIHtcblx0XHRmb3IgKGNvbnN0IGNoIG9mIHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMpIHtcblx0XHRcdGlmIChgcm9vbXMvJHsgY2guaWQgfWAgPT09IHJvb21JZGVudGlmaWVyKSB7XG5cdFx0XHRcdHJldHVybiBjaDtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRnZXRVc2VyRnJvbURpcmVjdE1lc3NhZ2VJZGVudGlmaWVyKGRpcmVjdElkZW50aWZpZXIpIHtcblx0XHRmb3IgKGNvbnN0IHUgb2YgdGhpcy51c2Vycy51c2Vycykge1xuXHRcdFx0aWYgKGB1c2Vycy8keyB1LmlkIH1gID09PSBkaXJlY3RJZGVudGlmaWVyKSB7XG5cdFx0XHRcdHJldHVybiB1O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGdldFJvY2tldFVzZXJGcm9tVXNlcklkKHVzZXJJZCkge1xuXHRcdGZvciAoY29uc3QgdSBvZiB0aGlzLnVzZXJzLnVzZXJzKSB7XG5cdFx0XHRpZiAodS5pZCA9PT0gdXNlcklkKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1LnJvY2tldElkLCB7IGZpZWxkczogeyB1c2VybmFtZTogMSB9IH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuIiwiaW1wb3J0IHsgSW1wb3J0ZXJzIH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6aW1wb3J0ZXInO1xuaW1wb3J0IHsgSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlckluZm8gfSBmcm9tICcuLi9pbmZvJztcbmltcG9ydCB7IEhpcENoYXRFbnRlcnByaXNlSW1wb3J0ZXIgfSBmcm9tICcuL2ltcG9ydGVyJztcblxuSW1wb3J0ZXJzLmFkZChuZXcgSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlckluZm8oKSwgSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlcik7XG4iXX0=
