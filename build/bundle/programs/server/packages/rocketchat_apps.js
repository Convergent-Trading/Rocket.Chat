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

/* Package-scope variables */
var Apps;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:apps":{"lib":{"Apps.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/lib/Apps.js                                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Please see both server and client's repsective "orchestrator" file for the contents
Apps = {};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"misc":{"Utilities.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/lib/misc/Utilities.js                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  Utilities: () => Utilities
});

class Utilities {
  static getI18nKeyForApp(key, appId) {
    return key && `apps-${appId}-${key}`;
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"storage":{"apps-logs-model.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/apps-logs-model.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsLogsModel: () => AppsLogsModel
});

class AppsLogsModel extends RocketChat.models._Base {
  constructor() {
    super('apps_logs');
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"apps-model.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/apps-model.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsModel: () => AppsModel
});

class AppsModel extends RocketChat.models._Base {
  constructor() {
    super('apps');
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"apps-persistence-model.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/apps-persistence-model.js                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsPersistenceModel: () => AppsPersistenceModel
});

class AppsPersistenceModel extends RocketChat.models._Base {
  constructor() {
    super('apps_persistence');
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"storage.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/storage.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppRealStorage: () => AppRealStorage
});
let AppStorage;
module.watch(require("@rocket.chat/apps-engine/server/storage"), {
  AppStorage(v) {
    AppStorage = v;
  }

}, 0);

class AppRealStorage extends AppStorage {
  constructor(data) {
    super('mongodb');
    this.db = data;
  }

  create(item) {
    return new Promise((resolve, reject) => {
      item.createdAt = new Date();
      item.updatedAt = new Date();
      let doc;

      try {
        doc = this.db.findOne({
          $or: [{
            id: item.id
          }, {
            'info.nameSlug': item.info.nameSlug
          }]
        });
      } catch (e) {
        return reject(e);
      }

      if (doc) {
        return reject(new Error('App already exists.'));
      }

      try {
        const id = this.db.insert(item);
        item._id = id;
        resolve(item);
      } catch (e) {
        reject(e);
      }
    });
  }

  retrieveOne(id) {
    return new Promise((resolve, reject) => {
      let doc;

      try {
        doc = this.db.findOne({
          $or: [{
            _id: id
          }, {
            id
          }]
        });
      } catch (e) {
        return reject(e);
      }

      if (doc) {
        resolve(doc);
      } else {
        reject(new Error(`No App found by the id: ${id}`));
      }
    });
  }

  retrieveAll() {
    return new Promise((resolve, reject) => {
      let docs;

      try {
        docs = this.db.find({}).fetch();
      } catch (e) {
        return reject(e);
      }

      const items = new Map();
      docs.forEach(i => items.set(i.id, i));
      resolve(items);
    });
  }

  update(item) {
    return new Promise((resolve, reject) => {
      try {
        this.db.update({
          id: item.id
        }, item);
      } catch (e) {
        return reject(e);
      }

      this.retrieveOne(item.id).then(updated => resolve(updated)).catch(err => reject(err));
    });
  }

  remove(id) {
    return new Promise((resolve, reject) => {
      try {
        this.db.remove({
          id
        });
      } catch (e) {
        return reject(e);
      }

      resolve({
        success: true
      });
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/index.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsLogsModel: () => AppsLogsModel,
  AppsModel: () => AppsModel,
  AppsPersistenceModel: () => AppsPersistenceModel,
  AppRealLogsStorage: () => AppRealLogsStorage,
  AppRealStorage: () => AppRealStorage
});
let AppsLogsModel;
module.watch(require("./apps-logs-model"), {
  AppsLogsModel(v) {
    AppsLogsModel = v;
  }

}, 0);
let AppsModel;
module.watch(require("./apps-model"), {
  AppsModel(v) {
    AppsModel = v;
  }

}, 1);
let AppsPersistenceModel;
module.watch(require("./apps-persistence-model"), {
  AppsPersistenceModel(v) {
    AppsPersistenceModel = v;
  }

}, 2);
let AppRealLogsStorage;
module.watch(require("./logs-storage"), {
  AppRealLogsStorage(v) {
    AppRealLogsStorage = v;
  }

}, 3);
let AppRealStorage;
module.watch(require("./storage"), {
  AppRealStorage(v) {
    AppRealStorage = v;
  }

}, 4);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"logs-storage.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/logs-storage.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppRealLogsStorage: () => AppRealLogsStorage
});
let AppConsole;
module.watch(require("@rocket.chat/apps-engine/server/logging"), {
  AppConsole(v) {
    AppConsole = v;
  }

}, 0);
let AppLogStorage;
module.watch(require("@rocket.chat/apps-engine/server/storage"), {
  AppLogStorage(v) {
    AppLogStorage = v;
  }

}, 1);

class AppRealLogsStorage extends AppLogStorage {
  constructor(model) {
    super('mongodb');
    this.db = model;
  }

  find(...args) {
    return new Promise((resolve, reject) => {
      let docs;

      try {
        docs = this.db.find(...args).fetch();
      } catch (e) {
        return reject(e);
      }

      resolve(docs);
    });
  }

  storeEntries(appId, logger) {
    return new Promise((resolve, reject) => {
      const item = AppConsole.toStorageEntry(appId, logger);

      try {
        const id = this.db.insert(item);
        resolve(this.db.findOneById(id));
      } catch (e) {
        reject(e);
      }
    });
  }

  getEntriesFor(appId) {
    return new Promise((resolve, reject) => {
      let docs;

      try {
        docs = this.db.find({
          appId
        }).fetch();
      } catch (e) {
        return reject(e);
      }

      resolve(docs);
    });
  }

  removeEntriesFor(appId) {
    return new Promise((resolve, reject) => {
      try {
        this.db.remove({
          appId
        });
      } catch (e) {
        return reject(e);
      }

      resolve();
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"bridges":{"activation.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/activation.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppActivationBridge: () => AppActivationBridge
});

class AppActivationBridge {
  constructor(orch) {
    this.orch = orch;
  }

  appAdded(app) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getNotifier().appAdded(app.getID()));
    });
  }

  appUpdated(app) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getNotifier().appUpdated(app.getID()));
    });
  }

  appRemoved(app) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getNotifier().appRemoved(app.getID()));
    });
  }

  appStatusChanged(app, status) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getNotifier().appStatusUpdated(app.getID(), status));
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"bridges.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/bridges.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  RealAppBridges: () => RealAppBridges
});
let AppBridges;
module.watch(require("@rocket.chat/apps-engine/server/bridges"), {
  AppBridges(v) {
    AppBridges = v;
  }

}, 0);
let AppActivationBridge;
module.watch(require("./activation"), {
  AppActivationBridge(v) {
    AppActivationBridge = v;
  }

}, 1);
let AppDetailChangesBridge;
module.watch(require("./details"), {
  AppDetailChangesBridge(v) {
    AppDetailChangesBridge = v;
  }

}, 2);
let AppCommandsBridge;
module.watch(require("./commands"), {
  AppCommandsBridge(v) {
    AppCommandsBridge = v;
  }

}, 3);
let AppEnvironmentalVariableBridge;
module.watch(require("./environmental"), {
  AppEnvironmentalVariableBridge(v) {
    AppEnvironmentalVariableBridge = v;
  }

}, 4);
let AppHttpBridge;
module.watch(require("./http"), {
  AppHttpBridge(v) {
    AppHttpBridge = v;
  }

}, 5);
let AppListenerBridge;
module.watch(require("./listeners"), {
  AppListenerBridge(v) {
    AppListenerBridge = v;
  }

}, 6);
let AppMessageBridge;
module.watch(require("./messages"), {
  AppMessageBridge(v) {
    AppMessageBridge = v;
  }

}, 7);
let AppPersistenceBridge;
module.watch(require("./persistence"), {
  AppPersistenceBridge(v) {
    AppPersistenceBridge = v;
  }

}, 8);
let AppRoomBridge;
module.watch(require("./rooms"), {
  AppRoomBridge(v) {
    AppRoomBridge = v;
  }

}, 9);
let AppSettingBridge;
module.watch(require("./settings"), {
  AppSettingBridge(v) {
    AppSettingBridge = v;
  }

}, 10);
let AppUserBridge;
module.watch(require("./users"), {
  AppUserBridge(v) {
    AppUserBridge = v;
  }

}, 11);

class RealAppBridges extends AppBridges {
  constructor(orch) {
    super();
    this._actBridge = new AppActivationBridge(orch);
    this._cmdBridge = new AppCommandsBridge(orch);
    this._detBridge = new AppDetailChangesBridge(orch);
    this._envBridge = new AppEnvironmentalVariableBridge(orch);
    this._httpBridge = new AppHttpBridge();
    this._lisnBridge = new AppListenerBridge(orch);
    this._msgBridge = new AppMessageBridge(orch);
    this._persistBridge = new AppPersistenceBridge(orch);
    this._roomBridge = new AppRoomBridge(orch);
    this._setsBridge = new AppSettingBridge(orch);
    this._userBridge = new AppUserBridge(orch);
  }

  getCommandBridge() {
    return this._cmdBridge;
  }

  getEnvironmentalVariableBridge() {
    return this._envBridge;
  }

  getHttpBridge() {
    return this._httpBridge;
  }

  getListenerBridge() {
    return this._lisnBridge;
  }

  getMessageBridge() {
    return this._msgBridge;
  }

  getPersistenceBridge() {
    return this._persistBridge;
  }

  getAppActivationBridge() {
    return this._actBridge;
  }

  getAppDetailChangesBridge() {
    return this._detBridge;
  }

  getRoomBridge() {
    return this._roomBridge;
  }

  getServerSettingBridge() {
    return this._setsBridge;
  }

  getUserBridge() {
    return this._userBridge;
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"commands.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/commands.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppCommandsBridge: () => AppCommandsBridge
});
let SlashCommandContext;
module.watch(require("@rocket.chat/apps-engine/definition/slashcommands"), {
  SlashCommandContext(v) {
    SlashCommandContext = v;
  }

}, 0);
let Utilities;
module.watch(require("../../lib/misc/Utilities"), {
  Utilities(v) {
    Utilities = v;
  }

}, 1);

class AppCommandsBridge {
  constructor(orch) {
    this.orch = orch;
    this.disabledCommands = new Map();
  }

  doesCommandExist(command, appId) {
    console.log(`The App ${appId} is checking if "${command}" command exists.`);

    if (typeof command !== 'string' || command.length === 0) {
      return false;
    }

    const cmd = command.toLowerCase();
    return typeof RocketChat.slashCommands.commands[cmd] === 'object' || this.disabledCommands.has(cmd);
  }

  enableCommand(command, appId) {
    console.log(`The App ${appId} is attempting to enable the command: "${command}"`);

    if (typeof command !== 'string' || command.trim().length === 0) {
      throw new Error('Invalid command parameter provided, must be a string.');
    }

    const cmd = command.toLowerCase();

    if (!this.disabledCommands.has(cmd)) {
      throw new Error(`The command is not currently disabled: "${cmd}"`);
    }

    RocketChat.slashCommands.commands[cmd] = this.disabledCommands.get(cmd);
    this.disabledCommands.delete(cmd);
    this.orch.getNotifier().commandUpdated(cmd);
  }

  disableCommand(command, appId) {
    console.log(`The App ${appId} is attempting to disable the command: "${command}"`);

    if (typeof command !== 'string' || command.trim().length === 0) {
      throw new Error('Invalid command parameter provided, must be a string.');
    }

    const cmd = command.toLowerCase();

    if (this.disabledCommands.has(cmd)) {
      // The command is already disabled, no need to disable it yet again
      return;
    }

    if (typeof RocketChat.slashCommands.commands[cmd] === 'undefined') {
      throw new Error(`Command does not exist in the system currently: "${cmd}"`);
    }

    this.disabledCommands.set(cmd, RocketChat.slashCommands.commands[cmd]);
    delete RocketChat.slashCommands.commands[cmd];
    this.orch.getNotifier().commandDisabled(cmd);
  } // command: { command, paramsExample, i18nDescription, executor: function }


  modifyCommand(command, appId) {
    console.log(`The App ${appId} is attempting to modify the command: "${command}"`);

    this._verifyCommand(command);

    const cmd = command.toLowerCase();

    if (typeof RocketChat.slashCommands.commands[cmd] === 'undefined') {
      throw new Error(`Command does not exist in the system currently (or it is disabled): "${cmd}"`);
    }

    const item = RocketChat.slashCommands.commands[cmd];
    item.params = command.paramsExample ? command.paramsExample : item.params;
    item.description = command.i18nDescription ? command.i18nDescription : item.params;
    item.callback = this._appCommandExecutor.bind(this);
    item.providesPreview = command.providesPreview;
    item.previewer = command.previewer ? this._appCommandPreviewer.bind(this) : item.previewer;
    item.previewCallback = command.executePreviewItem ? this._appCommandPreviewExecutor.bind(this) : item.previewCallback;
    RocketChat.slashCommands.commands[cmd] = item;
    this.orch.getNotifier().commandUpdated(cmd);
  }

  registerCommand(command, appId) {
    console.log(`The App ${appId} is registerin the command: "${command.command}"`);

    this._verifyCommand(command);

    const item = {
      command: command.command.toLowerCase(),
      params: Utilities.getI18nKeyForApp(command.i18nParamsExample, appId),
      description: Utilities.getI18nKeyForApp(command.i18nDescription, appId),
      callback: this._appCommandExecutor.bind(this),
      providesPreview: command.providesPreview,
      previewer: !command.previewer ? undefined : this._appCommandPreviewer.bind(this),
      previewCallback: !command.executePreviewItem ? undefined : this._appCommandPreviewExecutor.bind(this)
    };
    RocketChat.slashCommands.commands[command.command.toLowerCase()] = item;
    this.orch.getNotifier().commandAdded(command.command.toLowerCase());
  }

  unregisterCommand(command, appId) {
    console.log(`The App ${appId} is unregistering the command: "${command}"`);

    if (typeof command !== 'string' || command.trim().length === 0) {
      throw new Error('Invalid command parameter provided, must be a string.');
    }

    const cmd = command.toLowerCase();
    this.disabledCommands.delete(cmd);
    delete RocketChat.slashCommands.commands[cmd];
    this.orch.getNotifier().commandRemoved(cmd);
  }

  _verifyCommand(command) {
    if (typeof command !== 'object') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (typeof command.command !== 'string') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (command.i18nParamsExample && typeof command.i18nParamsExample !== 'string') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (command.i18nDescription && typeof command.i18nDescription !== 'string') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (typeof command.providesPreview !== 'boolean') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (typeof command.executor !== 'function') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }
  }

  _appCommandExecutor(command, parameters, message) {
    const user = this.orch.getConverters().get('users').convertById(Meteor.userId());
    const room = this.orch.getConverters().get('rooms').convertById(message.rid);
    const params = parameters.length === 0 || parameters === ' ' ? [] : parameters.split(' ');
    const context = new SlashCommandContext(Object.freeze(user), Object.freeze(room), Object.freeze(params));
    Promise.await(this.orch.getManager().getCommandManager().executeCommand(command, context));
  }

  _appCommandPreviewer(command, parameters, message) {
    const user = this.orch.getConverters().get('users').convertById(Meteor.userId());
    const room = this.orch.getConverters().get('rooms').convertById(message.rid);
    const params = parameters.length === 0 || parameters === ' ' ? [] : parameters.split(' ');
    const context = new SlashCommandContext(Object.freeze(user), Object.freeze(room), Object.freeze(params));
    return Promise.await(this.orch.getManager().getCommandManager().getPreviews(command, context));
  }

  _appCommandPreviewExecutor(command, parameters, message, preview) {
    const user = this.orch.getConverters().get('users').convertById(Meteor.userId());
    const room = this.orch.getConverters().get('rooms').convertById(message.rid);
    const params = parameters.length === 0 || parameters === ' ' ? [] : parameters.split(' ');
    const context = new SlashCommandContext(Object.freeze(user), Object.freeze(room), Object.freeze(params));
    Promise.await(this.orch.getManager().getCommandManager().executePreview(command, preview, context));
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"environmental.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/environmental.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppEnvironmentalVariableBridge: () => AppEnvironmentalVariableBridge
});

class AppEnvironmentalVariableBridge {
  constructor(orch) {
    this.orch = orch;
    this.allowed = ['NODE_ENV', 'ROOT_URL', 'INSTANCE_IP'];
  }

  getValueByName(envVarName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the environmental variable value ${envVarName}.`);

      if (this.isReadable(envVarName, appId)) {
        return process.env[envVarName];
      }

      throw new Error(`The environmental variable "${envVarName}" is not readable.`);
    });
  }

  isReadable(envVarName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is checking if the environmental variable is readable ${envVarName}.`);
      return this.allowed.includes(envVarName.toUpperCase());
    });
  }

  isSet(envVarName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is checking if the environmental variable is set ${envVarName}.`);

      if (this.isReadable(envVarName, appId)) {
        return typeof process.env[envVarName] !== 'undefined';
      }

      throw new Error(`The environmental variable "${envVarName}" is not readable.`);
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"messages.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/messages.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMessageBridge: () => AppMessageBridge
});

class AppMessageBridge {
  constructor(orch) {
    this.orch = orch;
  }

  create(message, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is creating a new message.`);
      let msg = this.orch.getConverters().get('messages').convertAppMessage(message);
      Meteor.runAsUser(msg.u._id, () => {
        msg = Meteor.call('sendMessage', msg);
      });
      return msg._id;
    });
  }

  getById(messageId, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the message: "${messageId}"`);
      return this.orch.getConverters().get('messages').convertById(messageId);
    });
  }

  update(message, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is updating a message.`);

      if (!message.editor) {
        throw new Error('Invalid editor assigned to the message for the update.');
      }

      if (!message.id || !RocketChat.models.Messages.findOneById(message.id)) {
        throw new Error('A message must exist to update.');
      }

      const msg = this.orch.getConverters().get('messages').convertAppMessage(message);
      const editor = RocketChat.models.Users.findOneById(message.editor.id);
      RocketChat.updateMessage(msg, editor);
    });
  }

  notifyUser(user, message, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is notifying a user.`);
      const msg = this.orch.getConverters().get('messages').convertAppMessage(message);
      RocketChat.Notifications.notifyUser(user.id, 'message', Object.assign(msg, {
        _id: Random.id(),
        ts: new Date(),
        u: undefined,
        editor: undefined
      }));
    });
  }

  notifyRoom(room, message, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is notifying a room's users.`);

      if (room) {
        const msg = this.orch.getConverters().get('messages').convertAppMessage(message);
        const rmsg = Object.assign(msg, {
          _id: Random.id(),
          rid: room.id,
          ts: new Date(),
          u: undefined,
          editor: undefined
        });
        const users = RocketChat.models.Subscriptions.findByRoomIdWhenUserIdExists(room._id, {
          fields: {
            'u._id': 1
          }
        }).fetch().map(s => s.u._id);
        RocketChat.models.Users.findByIds(users, {
          fields: {
            _id: 1
          }
        }).fetch().forEach(({
          _id
        }) => RocketChat.Notifications.notifyUser(_id, 'message', rmsg));
      }
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"persistence.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/persistence.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppPersistenceBridge: () => AppPersistenceBridge
});

class AppPersistenceBridge {
  constructor(orch) {
    this.orch = orch;
  }

  purge(appId) {
    return Promise.asyncApply(() => {
      console.log(`The App's persistent storage is being purged: ${appId}`);
      this.orch.getPersistenceModel().remove({
        appId
      });
    });
  }

  create(data, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is storing a new object in their persistence.`, data);

      if (typeof data !== 'object') {
        throw new Error('Attempted to store an invalid data type, it must be an object.');
      }

      return this.orch.getPersistenceModel().insert({
        appId,
        data
      });
    });
  }

  createWithAssociations(data, associations, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is storing a new object in their persistence that is associated with some models.`, data, associations);

      if (typeof data !== 'object') {
        throw new Error('Attempted to store an invalid data type, it must be an object.');
      }

      return this.orch.getPersistenceModel().insert({
        appId,
        associations,
        data
      });
    });
  }

  readById(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is reading their data in their persistence with the id: "${id}"`);
      const record = this.orch.getPersistenceModel().findOneById(id);
      return record.data;
    });
  }

  readByAssociations(associations, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is searching for records that are associated with the following:`, associations);
      const records = this.orch.getPersistenceModel().find({
        appId,
        associations: {
          $all: associations
        }
      }).fetch();
      return Array.isArray(records) ? records.map(r => r.data) : [];
    });
  }

  remove(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is removing one of their records by the id: "${id}"`);
      const record = this.orch.getPersistenceModel().findOne({
        _id: id,
        appId
      });

      if (!record) {
        return undefined;
      }

      this.orch.getPersistenceModel().remove({
        _id: id,
        appId
      });
      return record.data;
    });
  }

  removeByAssociations(associations, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is removing records with the following associations:`, associations);
      const query = {
        appId,
        associations: {
          $all: associations
        }
      };
      const records = this.orch.getPersistenceModel().find(query).fetch();

      if (!records) {
        return undefined;
      }

      this.orch.getPersistenceModel().remove(query);
      return Array.isArray(records) ? records.map(r => r.data) : [];
    });
  }

  update(id, data, upsert, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is updating the record "${id}" to:`, data);

      if (typeof data !== 'object') {
        throw new Error('Attempted to store an invalid data type, it must be an object.');
      }

      throw new Error('Not implemented.');
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"rooms.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/rooms.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppRoomBridge: () => AppRoomBridge
});
let RoomType;
module.watch(require("@rocket.chat/apps-engine/definition/rooms"), {
  RoomType(v) {
    RoomType = v;
  }

}, 0);

class AppRoomBridge {
  constructor(orch) {
    this.orch = orch;
  }

  create(room, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is creating a new room.`, room);
      const rcRoom = this.orch.getConverters().get('rooms').convertAppRoom(room);
      let method;

      switch (room.type) {
        case RoomType.CHANNEL:
          method = 'createChannel';
          break;

        case RoomType.PRIVATE_GROUP:
          method = 'createPrivateGroup';
          break;

        default:
          throw new Error('Only channels and private groups can be created.');
      }

      let rid;
      Meteor.runAsUser(room.creator.id, () => {
        const info = Meteor.call(method, rcRoom.members);
        rid = info.rid;
      });
      return rid;
    });
  }

  getById(roomId, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the roomById: "${roomId}"`);
      return this.orch.getConverters().get('rooms').convertById(roomId);
    });
  }

  getByName(roomName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the roomByName: "${roomName}"`);
      return this.orch.getConverters().get('rooms').convertByName(roomName);
    });
  }

  getCreatorById(roomId, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the room's creator by id: "${roomId}"`);
      const room = RocketChat.models.Rooms.findOneById(roomId);

      if (!room || !room.u || !room.u._id) {
        return undefined;
      }

      return this.orch.getConverters().get('users').convertById(room.u._id);
    });
  }

  getCreatorByName(roomName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the room's creator by name: "${roomName}"`);
      const room = RocketChat.models.Rooms.findOneByName(roomName);

      if (!room || !room.u || !room.u._id) {
        return undefined;
      }

      return this.orch.getConverters().get('users').convertById(room.u._id);
    });
  }

  update(room, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is updating a room.`);

      if (!room.id || RocketChat.models.Rooms.findOneById(room.id)) {
        throw new Error('A room must exist to update.');
      }

      const rm = this.orch.getConverters().get('rooms').convertAppRoom(room);
      RocketChat.models.Rooms.update(rm._id, rm);
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/settings.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppSettingBridge: () => AppSettingBridge
});

class AppSettingBridge {
  constructor(orch) {
    this.orch = orch;
    this.allowedGroups = [];
    this.disallowedSettings = ['Accounts_RegistrationForm_SecretURL', 'CROWD_APP_USERNAME', 'CROWD_APP_PASSWORD', 'Direct_Reply_Username', 'Direct_Reply_Password', 'SMTP_Username', 'SMTP_Password', 'FileUpload_S3_AWSAccessKeyId', 'FileUpload_S3_AWSSecretAccessKey', 'FileUpload_S3_BucketURL', 'FileUpload_GoogleStorage_Bucket', 'FileUpload_GoogleStorage_AccessId', 'FileUpload_GoogleStorage_Secret', 'GoogleVision_ServiceAccount', 'Allow_Invalid_SelfSigned_Certs', 'GoogleTagManager_id', 'Bugsnag_api_key', 'LDAP_CA_Cert', 'LDAP_Reject_Unauthorized', 'LDAP_Domain_Search_User', 'LDAP_Domain_Search_Password', 'Livechat_secret_token', 'Livechat_Knowledge_Apiai_Key', 'AutoTranslate_GoogleAPIKey', 'MapView_GMapsAPIKey', 'Meta_fb_app_id', 'Meta_google-site-verification', 'Meta_msvalidate01', 'Accounts_OAuth_Dolphin_secret', 'Accounts_OAuth_Drupal_secret', 'Accounts_OAuth_Facebook_secret', 'Accounts_OAuth_Github_secret', 'API_GitHub_Enterprise_URL', 'Accounts_OAuth_GitHub_Enterprise_secret', 'API_Gitlab_URL', 'Accounts_OAuth_Gitlab_secret', 'Accounts_OAuth_Google_secret', 'Accounts_OAuth_Linkedin_secret', 'Accounts_OAuth_Meteor_secret', 'Accounts_OAuth_Twitter_secret', 'API_Wordpress_URL', 'Accounts_OAuth_Wordpress_secret', 'Push_apn_passphrase', 'Push_apn_key', 'Push_apn_cert', 'Push_apn_dev_passphrase', 'Push_apn_dev_key', 'Push_apn_dev_cert', 'Push_gcm_api_key', 'Push_gcm_project_number', 'SAML_Custom_Default_cert', 'SAML_Custom_Default_private_key', 'SlackBridge_APIToken', 'Smarsh_Email', 'SMS_Twilio_Account_SID', 'SMS_Twilio_authToken'];
  }

  getAll(appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting all the settings.`);
      return RocketChat.models.Settings.find({
        _id: {
          $nin: this.disallowedSettings
        }
      }).fetch().map(s => this.orch.getConverters().get('settings').convertToApp(s));
    });
  }

  getOneById(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the setting by id ${id}.`);

      if (!this.isReadableById(id, appId)) {
        throw new Error(`The setting "${id}" is not readable.`);
      }

      return this.orch.getConverters().get('settings').convertById(id);
    });
  }

  hideGroup(name, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is hidding the group ${name}.`);
      throw new Error('Method not implemented.');
    });
  }

  hideSetting(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is hidding the setting ${id}.`);

      if (!this.isReadableById(id, appId)) {
        throw new Error(`The setting "${id}" is not readable.`);
      }

      throw new Error('Method not implemented.');
    });
  }

  isReadableById(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is checking if they can read the setting ${id}.`);
      return !this.disallowedSettings.includes(id);
    });
  }

  updateOne(setting, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is updating the setting ${setting.id} .`);

      if (!this.isReadableById(setting.id, appId)) {
        throw new Error(`The setting "${setting.id}" is not readable.`);
      }

      throw new Error('Method not implemented.');
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"users.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/users.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppUserBridge: () => AppUserBridge
});

class AppUserBridge {
  constructor(orch) {
    this.orch = orch;
  }

  getById(userId, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the userId: "${userId}"`);
      return this.orch.getConverters().get('users').convertById(userId);
    });
  }

  getByUsername(username, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the username: "${username}"`);
      return this.orch.getConverters().get('users').convertByUsername(username);
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/index.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  RealAppBridges: () => RealAppBridges,
  AppActivationBridge: () => AppActivationBridge,
  AppCommandsBridge: () => AppCommandsBridge,
  AppEnvironmentalVariableBridge: () => AppEnvironmentalVariableBridge,
  AppHttpBridge: () => AppHttpBridge,
  AppListenerBridge: () => AppListenerBridge,
  AppMessageBridge: () => AppMessageBridge,
  AppPersistenceBridge: () => AppPersistenceBridge,
  AppRoomBridge: () => AppRoomBridge,
  AppSettingBridge: () => AppSettingBridge,
  AppUserBridge: () => AppUserBridge
});
let RealAppBridges;
module.watch(require("./bridges"), {
  RealAppBridges(v) {
    RealAppBridges = v;
  }

}, 0);
let AppActivationBridge;
module.watch(require("./activation"), {
  AppActivationBridge(v) {
    AppActivationBridge = v;
  }

}, 1);
let AppCommandsBridge;
module.watch(require("./commands"), {
  AppCommandsBridge(v) {
    AppCommandsBridge = v;
  }

}, 2);
let AppEnvironmentalVariableBridge;
module.watch(require("./environmental"), {
  AppEnvironmentalVariableBridge(v) {
    AppEnvironmentalVariableBridge = v;
  }

}, 3);
let AppHttpBridge;
module.watch(require("./http"), {
  AppHttpBridge(v) {
    AppHttpBridge = v;
  }

}, 4);
let AppListenerBridge;
module.watch(require("./listeners"), {
  AppListenerBridge(v) {
    AppListenerBridge = v;
  }

}, 5);
let AppMessageBridge;
module.watch(require("./messages"), {
  AppMessageBridge(v) {
    AppMessageBridge = v;
  }

}, 6);
let AppPersistenceBridge;
module.watch(require("./persistence"), {
  AppPersistenceBridge(v) {
    AppPersistenceBridge = v;
  }

}, 7);
let AppRoomBridge;
module.watch(require("./rooms"), {
  AppRoomBridge(v) {
    AppRoomBridge = v;
  }

}, 8);
let AppSettingBridge;
module.watch(require("./settings"), {
  AppSettingBridge(v) {
    AppSettingBridge = v;
  }

}, 9);
let AppUserBridge;
module.watch(require("./users"), {
  AppUserBridge(v) {
    AppUserBridge = v;
  }

}, 10);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"details.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/details.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppDetailChangesBridge: () => AppDetailChangesBridge
});

class AppDetailChangesBridge {
  constructor(orch) {
    this.orch = orch;
  }

  onAppSettingsChange(appId, setting) {
    try {
      this.orch.getNotifier().appSettingsChange(appId, setting);
    } catch (e) {
      console.warn('failed to notify about the setting change.', appId);
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"http.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/http.js                                                                    //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppHttpBridge: () => AppHttpBridge
});

class AppHttpBridge {
  call(info) {
    return Promise.asyncApply(() => {
      if (!info.request.content && typeof info.request.data === 'object') {
        info.request.content = JSON.stringify(info.request.data);
      }

      console.log(`The App ${info.appId} is requesting from the outter webs:`, info);

      try {
        return HTTP.call(info.method, info.url, info.request);
      } catch (e) {
        return e.response;
      }
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"listeners.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/listeners.js                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppListenerBridge: () => AppListenerBridge
});

class AppListenerBridge {
  constructor(orch) {
    this.orch = orch;
  }

  messageEvent(inte, message) {
    return Promise.asyncApply(() => {
      const msg = this.orch.getConverters().get('messages').convertMessage(message);
      const result = Promise.await(this.orch.getManager().getListenerManager().executeListener(inte, msg));

      if (typeof result === 'boolean') {
        return result;
      } else {
        return this.orch.getConverters().get('messages').convertAppMessage(result);
      } // try {
      // } catch (e) {
      // 	console.log(`${ e.name }: ${ e.message }`);
      // 	console.log(e.stack);
      // }

    });
  }

  roomEvent(inte, room) {
    return Promise.asyncApply(() => {
      const rm = this.orch.getConverters().get('rooms').convertRoom(room);
      const result = Promise.await(this.orch.getManager().getListenerManager().executeListener(inte, rm));

      if (typeof result === 'boolean') {
        return result;
      } else {
        return this.orch.getConverters().get('rooms').convertAppRoom(result);
      } // try {
      // } catch (e) {
      // 	console.log(`${ e.name }: ${ e.message }`);
      // 	console.log(e.stack);
      // }

    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"communication":{"methods.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/communication/methods.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMethods: () => AppMethods
});

const waitToLoad = function (orch) {
  return new Promise(resolve => {
    let id = setInterval(() => {
      if (orch.isEnabled() && orch.isLoaded()) {
        clearInterval(id);
        id = -1;
        resolve();
      }
    }, 100);
  });
};

const waitToUnload = function (orch) {
  return new Promise(resolve => {
    let id = setInterval(() => {
      if (!orch.isEnabled() && !orch.isLoaded()) {
        clearInterval(id);
        id = -1;
        resolve();
      }
    }, 100);
  });
};

class AppMethods {
  constructor(orch) {
    this._orch = orch;

    this._addMethods();
  }

  isEnabled() {
    return typeof this._orch !== 'undefined' && this._orch.isEnabled();
  }

  isLoaded() {
    return typeof this._orch !== 'undefined' && this._orch.isEnabled() && this._orch.isLoaded();
  }

  _addMethods() {
    const instance = this;
    Meteor.methods({
      'apps/is-enabled'() {
        return instance.isEnabled();
      },

      'apps/is-loaded'() {
        return instance.isLoaded();
      },

      'apps/go-enable'() {
        if (!Meteor.userId()) {
          throw new Meteor.Error('error-invalid-user', 'Invalid user', {
            method: 'apps/go-enable'
          });
        }

        if (!RocketChat.authz.hasPermission(Meteor.userId(), 'manage-apps')) {
          throw new Meteor.Error('error-action-not-allowed', 'Not allowed', {
            method: 'apps/go-enable'
          });
        }

        RocketChat.settings.set('Apps_Framework_enabled', true);
        Promise.await(waitToLoad(instance._orch));
      },

      'apps/go-disable'() {
        if (!Meteor.userId()) {
          throw new Meteor.Error('error-invalid-user', 'Invalid user', {
            method: 'apps/go-enable'
          });
        }

        if (!RocketChat.authz.hasPermission(Meteor.userId(), 'manage-apps')) {
          throw new Meteor.Error('error-action-not-allowed', 'Not allowed', {
            method: 'apps/go-enable'
          });
        }

        RocketChat.settings.set('Apps_Framework_enabled', false);
        Promise.await(waitToUnload(instance._orch));
      }

    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"rest.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/communication/rest.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsRestApi: () => AppsRestApi
});
let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 0);

class AppsRestApi {
  constructor(orch, manager) {
    this._orch = orch;
    this._manager = manager;
    this.api = new RocketChat.API.ApiClass({
      version: 'apps',
      useDefaultAuth: true,
      prettyJson: false,
      enableCors: false,
      auth: RocketChat.API.getUserAuth()
    });
    this.addManagementRoutes();
  }

  _handleFile(request, fileField) {
    const busboy = new Busboy({
      headers: request.headers
    });
    return Meteor.wrapAsync(callback => {
      busboy.on('file', Meteor.bindEnvironment((fieldname, file) => {
        if (fieldname !== fileField) {
          return callback(new Meteor.Error('invalid-field', `Expected the field "${fileField}" but got "${fieldname}" instead.`));
        }

        const fileData = [];
        file.on('data', Meteor.bindEnvironment(data => {
          fileData.push(data);
        }));
        file.on('end', Meteor.bindEnvironment(() => callback(undefined, Buffer.concat(fileData))));
      }));
      request.pipe(busboy);
    })();
  }

  addManagementRoutes() {
    const orchestrator = this._orch;
    const manager = this._manager;
    const fileHandler = this._handleFile;
    this.api.addRoute('', {
      authRequired: true
    }, {
      get() {
        const apps = manager.get().map(prl => {
          const info = prl.getInfo();
          info.languages = prl.getStorageItem().languageContent;
          info.status = prl.getStatus();
          return info;
        });
        return RocketChat.API.v1.success({
          apps
        });
      },

      post() {
        let buff;

        if (this.bodyParams.url) {
          const result = HTTP.call('GET', this.bodyParams.url, {
            npmRequestOptions: {
              encoding: 'base64'
            }
          });

          if (result.statusCode !== 200 || !result.headers['content-type'] || result.headers['content-type'] !== 'application/zip') {
            return RocketChat.API.v1.failure({
              error: 'Invalid url. It doesn\'t exist or is not "application/zip".'
            });
          }

          buff = Buffer.from(result.content, 'base64');
        } else {
          buff = fileHandler(this.request, 'app');
        }

        if (!buff) {
          return RocketChat.API.v1.failure({
            error: 'Failed to get a file to install for the App. '
          });
        }

        const aff = Promise.await(manager.add(buff.toString('base64'), false));
        const info = aff.getAppInfo(); // If there are compiler errors, there won't be an App to get the status of

        if (aff.getApp()) {
          info.status = aff.getApp().getStatus();
        } else {
          info.status = 'compiler_error';
        }

        return RocketChat.API.v1.success({
          app: info,
          implemented: aff.getImplementedInferfaces(),
          compilerErrors: aff.getCompilerErrors()
        });
      }

    });
    this.api.addRoute('languages', {
      authRequired: false
    }, {
      get() {
        const apps = manager.get().map(prl => ({
          id: prl.getID(),
          languages: prl.getStorageItem().languageContent
        }));
        return RocketChat.API.v1.success({
          apps
        });
      }

    });
    this.api.addRoute(':id', {
      authRequired: true
    }, {
      get() {
        console.log('Getting:', this.urlParams.id);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const info = prl.getInfo();
          info.status = prl.getStatus();
          return RocketChat.API.v1.success({
            app: info
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      },

      post() {
        console.log('Updating:', this.urlParams.id); // TODO: Verify permissions

        let buff;

        if (this.bodyParams.url) {
          const result = HTTP.call('GET', this.bodyParams.url, {
            npmRequestOptions: {
              encoding: 'base64'
            }
          });

          if (result.statusCode !== 200 || !result.headers['content-type'] || result.headers['content-type'] !== 'application/zip') {
            return RocketChat.API.v1.failure({
              error: 'Invalid url. It doesn\'t exist or is not "application/zip".'
            });
          }

          buff = Buffer.from(result.content, 'base64');
        } else {
          buff = fileHandler(this.request, 'app');
        }

        if (!buff) {
          return RocketChat.API.v1.failure({
            error: 'Failed to get a file to install for the App. '
          });
        }

        const aff = Promise.await(manager.update(buff.toString('base64')));
        const info = aff.getAppInfo(); // Should the updated version have compiler errors, no App will be returned

        if (aff.getApp()) {
          info.status = aff.getApp().getStatus();
        } else {
          info.status = 'compiler_error';
        }

        return RocketChat.API.v1.success({
          app: info,
          implemented: aff.getImplementedInferfaces(),
          compilerErrors: aff.getCompilerErrors()
        });
      },

      delete() {
        console.log('Uninstalling:', this.urlParams.id);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          Promise.await(manager.remove(prl.getID()));
          const info = prl.getInfo();
          info.status = prl.getStatus();
          return RocketChat.API.v1.success({
            app: info
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
    this.api.addRoute(':id/icon', {
      authRequired: true
    }, {
      get() {
        console.log('Getting the App\'s Icon:', this.urlParams.id);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const info = prl.getInfo();
          return RocketChat.API.v1.success({
            iconFileContent: info.iconFileContent
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
    this.api.addRoute(':id/languages', {
      authRequired: false
    }, {
      get() {
        console.log(`Getting ${this.urlParams.id}'s languages..`);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const languages = prl.getStorageItem().languageContent || {};
          return RocketChat.API.v1.success({
            languages
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
    this.api.addRoute(':id/logs', {
      authRequired: true
    }, {
      get() {
        console.log(`Getting ${this.urlParams.id}'s logs..`);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const {
            offset,
            count
          } = this.getPaginationItems();
          const {
            sort,
            fields,
            query
          } = this.parseJsonQuery();
          const ourQuery = Object.assign({}, query, {
            appId: prl.getID()
          });
          const options = {
            sort: sort ? sort : {
              _updatedAt: -1
            },
            skip: offset,
            limit: count,
            fields
          };
          const logs = Promise.await(orchestrator.getLogStorage().find(ourQuery, options));
          return RocketChat.API.v1.success({
            logs
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
    this.api.addRoute(':id/settings', {
      authRequired: true
    }, {
      get() {
        console.log(`Getting ${this.urlParams.id}'s settings..`);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const settings = Object.assign({}, prl.getStorageItem().settings);
          Object.keys(settings).forEach(k => {
            if (settings[k].hidden) {
              delete settings[k];
            }
          });
          return RocketChat.API.v1.success({
            settings
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      },

      post() {
        console.log(`Updating ${this.urlParams.id}'s settings..`);

        if (!this.bodyParams || !this.bodyParams.settings) {
          return RocketChat.API.v1.failure('The settings to update must be present.');
        }

        const prl = manager.getOneById(this.urlParams.id);

        if (!prl) {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }

        const {
          settings
        } = prl.getStorageItem();
        const updated = [];
        this.bodyParams.settings.forEach(s => {
          if (settings[s.id]) {
            Promise.await(manager.getSettingsManager().updateAppSetting(this.urlParams.id, s)); // Updating?

            updated.push(s);
          }
        });
        return RocketChat.API.v1.success({
          updated
        });
      }

    });
    this.api.addRoute(':id/settings/:settingId', {
      authRequired: true
    }, {
      get() {
        console.log(`Getting the App ${this.urlParams.id}'s setting ${this.urlParams.settingId}`);

        try {
          const setting = manager.getSettingsManager().getAppSetting(this.urlParams.id, this.urlParams.settingId);
          RocketChat.API.v1.success({
            setting
          });
        } catch (e) {
          if (e.message.includes('No setting found')) {
            return RocketChat.API.v1.notFound(`No Setting found on the App by the id of: "${this.urlParams.settingId}"`);
          } else if (e.message.includes('No App found')) {
            return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
          } else {
            return RocketChat.API.v1.failure(e.message);
          }
        }
      },

      post() {
        console.log(`Updating the App ${this.urlParams.id}'s setting ${this.urlParams.settingId}`);

        if (!this.bodyParams.setting) {
          return RocketChat.API.v1.failure('Setting to update to must be present on the posted body.');
        }

        try {
          Promise.await(manager.getSettingsManager().updateAppSetting(this.urlParams.id, this.bodyParams.setting));
          return RocketChat.API.v1.success();
        } catch (e) {
          if (e.message.includes('No setting found')) {
            return RocketChat.API.v1.notFound(`No Setting found on the App by the id of: "${this.urlParams.settingId}"`);
          } else if (e.message.includes('No App found')) {
            return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
          } else {
            return RocketChat.API.v1.failure(e.message);
          }
        }
      }

    });
    this.api.addRoute(':id/status', {
      authRequired: true
    }, {
      get() {
        console.log(`Getting ${this.urlParams.id}'s status..`);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          return RocketChat.API.v1.success({
            status: prl.getStatus()
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      },

      post() {
        if (!this.bodyParams.status || typeof this.bodyParams.status !== 'string') {
          return RocketChat.API.v1.failure('Invalid status provided, it must be "status" field and a string.');
        }

        console.log(`Updating ${this.urlParams.id}'s status...`, this.bodyParams.status);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const result = Promise.await(manager.changeStatus(prl.getID(), this.bodyParams.status));
          return RocketChat.API.v1.success({
            status: result.getStatus()
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"websockets.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/communication/websockets.js                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppEvents: () => AppEvents,
  AppServerListener: () => AppServerListener,
  AppServerNotifier: () => AppServerNotifier
});
let AppStatus, AppStatusUtils;
module.watch(require("@rocket.chat/apps-engine/definition/AppStatus"), {
  AppStatus(v) {
    AppStatus = v;
  },

  AppStatusUtils(v) {
    AppStatusUtils = v;
  }

}, 0);
const AppEvents = Object.freeze({
  APP_ADDED: 'app/added',
  APP_REMOVED: 'app/removed',
  APP_UPDATED: 'app/updated',
  APP_STATUS_CHANGE: 'app/statusUpdate',
  APP_SETTING_UPDATED: 'app/settingUpdated',
  COMMAND_ADDED: 'command/added',
  COMMAND_DISABLED: 'command/disabled',
  COMMAND_UPDATED: 'command/updated',
  COMMAND_REMOVED: 'command/removed'
});

class AppServerListener {
  constructor(orch, engineStreamer, clientStreamer, received) {
    this.orch = orch;
    this.engineStreamer = engineStreamer;
    this.clientStreamer = clientStreamer;
    this.received = received;
    this.engineStreamer.on(AppEvents.APP_ADDED, this.onAppAdded.bind(this));
    this.engineStreamer.on(AppEvents.APP_STATUS_CHANGE, this.onAppStatusUpdated.bind(this));
    this.engineStreamer.on(AppEvents.APP_SETTING_UPDATED, this.onAppSettingUpdated.bind(this));
    this.engineStreamer.on(AppEvents.APP_REMOVED, this.onAppRemoved.bind(this));
    this.engineStreamer.on(AppEvents.APP_UPDATED, this.onAppUpdated.bind(this));
    this.engineStreamer.on(AppEvents.COMMAND_ADDED, this.onCommandAdded.bind(this));
    this.engineStreamer.on(AppEvents.COMMAND_DISABLED, this.onCommandDisabled.bind(this));
    this.engineStreamer.on(AppEvents.COMMAND_UPDATED, this.onCommandUpdated.bind(this));
    this.engineStreamer.on(AppEvents.COMMAND_REMOVED, this.onCommandRemoved.bind(this));
  }

  onAppAdded(appId) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getManager().loadOne(appId));
      this.clientStreamer.emit(AppEvents.APP_ADDED, appId);
    });
  }

  onAppStatusUpdated({
    appId,
    status
  }) {
    return Promise.asyncApply(() => {
      this.received.set(`${AppEvents.APP_STATUS_CHANGE}_${appId}`, {
        appId,
        status,
        when: new Date()
      });

      if (AppStatusUtils.isEnabled(status)) {
        Promise.await(this.orch.getManager().enable(appId));
        this.clientStreamer.emit(AppEvents.APP_STATUS_CHANGE, {
          appId,
          status
        });
      } else if (AppStatusUtils.isDisabled(status)) {
        Promise.await(this.orch.getManager().disable(appId, AppStatus.MANUALLY_DISABLED === status));
        this.clientStreamer.emit(AppEvents.APP_STATUS_CHANGE, {
          appId,
          status
        });
      }
    });
  }

  onAppSettingUpdated({
    appId,
    setting
  }) {
    return Promise.asyncApply(() => {
      this.received.set(`${AppEvents.APP_SETTING_UPDATED}_${appId}_${setting.id}`, {
        appId,
        setting,
        when: new Date()
      });
      Promise.await(this.orch.getManager().getSettingsManager().updateAppSetting(appId, setting));
      this.clientStreamer.emit(AppEvents.APP_SETTING_UPDATED, {
        appId
      });
    });
  }

  onAppUpdated(appId) {
    return Promise.asyncApply(() => {
      this.received.set(`${AppEvents.APP_UPDATED}_${appId}`, {
        appId,
        when: new Date()
      });
      const storageItem = Promise.await(this.orch.getStorage().retrieveOne(appId));
      Promise.await(this.orch.getManager().update(storageItem.zip));
      this.clientStreamer.emit(AppEvents.APP_UPDATED, appId);
    });
  }

  onAppRemoved(appId) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getManager().remove(appId));
      this.clientStreamer.emit(AppEvents.APP_REMOVED, appId);
    });
  }

  onCommandAdded(command) {
    return Promise.asyncApply(() => {
      this.clientStreamer.emit(AppEvents.COMMAND_ADDED, command);
    });
  }

  onCommandDisabled(command) {
    return Promise.asyncApply(() => {
      this.clientStreamer.emit(AppEvents.COMMAND_DISABLED, command);
    });
  }

  onCommandUpdated(command) {
    return Promise.asyncApply(() => {
      this.clientStreamer.emit(AppEvents.COMMAND_UPDATED, command);
    });
  }

  onCommandRemoved(command) {
    return Promise.asyncApply(() => {
      this.clientStreamer.emit(AppEvents.COMMAND_REMOVED, command);
    });
  }

}

class AppServerNotifier {
  constructor(orch) {
    this.engineStreamer = new Meteor.Streamer('apps-engine', {
      retransmit: false
    });
    this.engineStreamer.serverOnly = true;
    this.engineStreamer.allowRead('none');
    this.engineStreamer.allowEmit('all');
    this.engineStreamer.allowWrite('none'); // This is used to broadcast to the web clients

    this.clientStreamer = new Meteor.Streamer('apps', {
      retransmit: false
    });
    this.clientStreamer.serverOnly = true;
    this.clientStreamer.allowRead('all');
    this.clientStreamer.allowEmit('all');
    this.clientStreamer.allowWrite('none');
    this.received = new Map();
    this.listener = new AppServerListener(orch, this.engineStreamer, this.clientStreamer, this.received);
  }

  appAdded(appId) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.APP_ADDED, appId);
      this.clientStreamer.emit(AppEvents.APP_ADDED, appId);
    });
  }

  appRemoved(appId) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.APP_REMOVED, appId);
      this.clientStreamer.emit(AppEvents.APP_REMOVED, appId);
    });
  }

  appUpdated(appId) {
    return Promise.asyncApply(() => {
      if (this.received.has(`${AppEvents.APP_UPDATED}_${appId}`)) {
        this.received.delete(`${AppEvents.APP_UPDATED}_${appId}`);
        return;
      }

      this.engineStreamer.emit(AppEvents.APP_UPDATED, appId);
      this.clientStreamer.emit(AppEvents.APP_UPDATED, appId);
    });
  }

  appStatusUpdated(appId, status) {
    return Promise.asyncApply(() => {
      if (this.received.has(`${AppEvents.APP_STATUS_CHANGE}_${appId}`)) {
        const details = this.received.get(`${AppEvents.APP_STATUS_CHANGE}_${appId}`);

        if (details.status === status) {
          this.received.delete(`${AppEvents.APP_STATUS_CHANGE}_${appId}`);
          return;
        }
      }

      this.engineStreamer.emit(AppEvents.APP_STATUS_CHANGE, {
        appId,
        status
      });
      this.clientStreamer.emit(AppEvents.APP_STATUS_CHANGE, {
        appId,
        status
      });
    });
  }

  appSettingsChange(appId, setting) {
    return Promise.asyncApply(() => {
      if (this.received.has(`${AppEvents.APP_SETTING_UPDATED}_${appId}_${setting.id}`)) {
        this.received.delete(`${AppEvents.APP_SETTING_UPDATED}_${appId}_${setting.id}`);
        return;
      }

      this.engineStreamer.emit(AppEvents.APP_SETTING_UPDATED, {
        appId,
        setting
      });
      this.clientStreamer.emit(AppEvents.APP_SETTING_UPDATED, {
        appId
      });
    });
  }

  commandAdded(command) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.COMMAND_ADDED, command);
      this.clientStreamer.emit(AppEvents.COMMAND_ADDED, command);
    });
  }

  commandDisabled(command) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.COMMAND_DISABLED, command);
      this.clientStreamer.emit(AppEvents.COMMAND_DISABLED, command);
    });
  }

  commandUpdated(command) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.COMMAND_UPDATED, command);
      this.clientStreamer.emit(AppEvents.COMMAND_UPDATED, command);
    });
  }

  commandRemoved(command) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.COMMAND_REMOVED, command);
      this.clientStreamer.emit(AppEvents.COMMAND_REMOVED, command);
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/communication/index.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMethods: () => AppMethods,
  AppsRestApi: () => AppsRestApi,
  AppEvents: () => AppEvents,
  AppServerNotifier: () => AppServerNotifier,
  AppServerListener: () => AppServerListener
});
let AppMethods;
module.watch(require("./methods"), {
  AppMethods(v) {
    AppMethods = v;
  }

}, 0);
let AppsRestApi;
module.watch(require("./rest"), {
  AppsRestApi(v) {
    AppsRestApi = v;
  }

}, 1);
let AppEvents, AppServerNotifier, AppServerListener;
module.watch(require("./websockets"), {
  AppEvents(v) {
    AppEvents = v;
  },

  AppServerNotifier(v) {
    AppServerNotifier = v;
  },

  AppServerListener(v) {
    AppServerListener = v;
  }

}, 2);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"converters":{"messages.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/messages.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMessagesConverter: () => AppMessagesConverter
});

class AppMessagesConverter {
  constructor(orch) {
    this.orch = orch;
  }

  convertById(msgId) {
    const msg = RocketChat.models.Messages.getOneById(msgId);
    return this.convertMessage(msg);
  }

  convertMessage(msgObj) {
    if (!msgObj) {
      return undefined;
    }

    const room = this.orch.getConverters().get('rooms').convertById(msgObj.rid);
    let sender;

    if (msgObj.u && msgObj.u._id) {
      sender = this.orch.getConverters().get('users').convertById(msgObj.u._id);

      if (!sender) {
        sender = this.orch.getConverters().get('users').convertToApp(msgObj.u);
      }
    }

    let editor;

    if (msgObj.editedBy) {
      editor = this.orch.getConverters().get('users').convertById(msgObj.editedBy._id);
    }

    const attachments = this._convertAttachmentsToApp(msgObj.attachments);

    return {
      id: msgObj._id,
      room,
      sender,
      text: msgObj.msg,
      createdAt: msgObj.ts,
      updatedAt: msgObj._updatedAt,
      editor,
      editedAt: msgObj.editedAt,
      emoji: msgObj.emoji,
      avatarUrl: msgObj.avatar,
      alias: msgObj.alias,
      customFields: msgObj.customFields,
      attachments
    };
  }

  convertAppMessage(message) {
    if (!message) {
      return undefined;
    }

    const room = RocketChat.models.Rooms.findOneById(message.room.id);

    if (!room) {
      throw new Error('Invalid room provided on the message.');
    }

    let u;

    if (message.sender && message.sender.id) {
      const user = RocketChat.models.Users.findOneById(message.sender.id);

      if (user) {
        u = {
          _id: user._id,
          username: user.username,
          name: user.name
        };
      } else {
        u = {
          _id: message.sender.id,
          username: message.sender.username,
          name: message.sender.name
        };
      }
    }

    let editedBy;

    if (message.editor) {
      const editor = RocketChat.models.Users.findOneById(message.editor.id);
      editedBy = {
        _id: editor._id,
        username: editor.username
      };
    }

    const attachments = this._convertAppAttachments(message.attachments);

    return {
      _id: message.id || Random.id(),
      rid: room._id,
      u,
      msg: message.text,
      ts: message.createdAt || new Date(),
      _updatedAt: message.updatedAt || new Date(),
      editedBy,
      editedAt: message.editedAt,
      emoji: message.emoji,
      avatar: message.avatarUrl,
      alias: message.alias,
      customFields: message.customFields,
      attachments
    };
  }

  _convertAppAttachments(attachments) {
    if (typeof attachments === 'undefined' || !Array.isArray(attachments)) {
      return undefined;
    }

    return attachments.map(attachment => ({
      collapsed: attachment.collapsed,
      color: attachment.color,
      text: attachment.text,
      ts: attachment.timestamp,
      message_link: attachment.timestampLink,
      thumb_url: attachment.thumbnailUrl,
      author_name: attachment.author ? attachment.author.name : undefined,
      author_link: attachment.author ? attachment.author.link : undefined,
      author_icon: attachment.author ? attachment.author.icon : undefined,
      title: attachment.title ? attachment.title.value : undefined,
      title_link: attachment.title ? attachment.title.link : undefined,
      title_link_download: attachment.title ? attachment.title.displayDownloadLink : undefined,
      image_url: attachment.imageUrl,
      audio_url: attachment.audioUrl,
      video_url: attachment.videoUrl,
      fields: attachment.fields,
      type: attachment.type,
      description: attachment.description
    })).map(a => {
      Object.keys(a).forEach(k => {
        if (typeof a[k] === 'undefined') {
          delete a[k];
        }
      });
      return a;
    });
  }

  _convertAttachmentsToApp(attachments) {
    if (typeof attachments === 'undefined' || !Array.isArray(attachments)) {
      return undefined;
    }

    return attachments.map(attachment => {
      let author;

      if (attachment.author_name || attachment.author_link || attachment.author_icon) {
        author = {
          name: attachment.author_name,
          link: attachment.author_link,
          icon: attachment.author_icon
        };
      }

      let title;

      if (attachment.title || attachment.title_link || attachment.title_link_download) {
        title = {
          value: attachment.title,
          link: attachment.title_link,
          displayDownloadLink: attachment.title_link_download
        };
      }

      return {
        collapsed: attachment.collapsed,
        color: attachment.color,
        text: attachment.text,
        timestamp: attachment.ts,
        timestampLink: attachment.message_link,
        thumbnailUrl: attachment.thumb_url,
        author,
        title,
        imageUrl: attachment.image_url,
        audioUrl: attachment.audio_url,
        videoUrl: attachment.video_url,
        fields: attachment.fields,
        type: attachment.type,
        description: attachment.description
      };
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"rooms.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/rooms.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppRoomsConverter: () => AppRoomsConverter
});
let RoomType;
module.watch(require("@rocket.chat/apps-engine/definition/rooms"), {
  RoomType(v) {
    RoomType = v;
  }

}, 0);

class AppRoomsConverter {
  constructor(orch) {
    this.orch = orch;
  }

  convertById(roomId) {
    const room = RocketChat.models.Rooms.findOneById(roomId);
    return this.convertRoom(room);
  }

  convertByName(roomName) {
    const room = RocketChat.models.Rooms.findOneByName(roomName);
    return this.convertRoom(room);
  }

  convertAppRoom(room) {
    if (!room) {
      return undefined;
    }

    let u;

    if (room.creator) {
      const creator = RocketChat.models.Users.findOneById(room.creator.id);
      u = {
        _id: creator._id,
        username: creator.username
      };
    }

    return {
      _id: room.id,
      fname: room.displayName,
      name: room.slugifiedName,
      t: room.type,
      u,
      members: room.members,
      default: typeof room.isDefault === 'undefined' ? false : room.isDefault,
      ro: typeof room.isReadOnly === 'undefined' ? false : room.isReadOnly,
      sysMes: typeof room.displaySystemMessages === 'undefined' ? true : room.displaySystemMessages,
      msgs: room.messageCount || 0,
      ts: room.createdAt,
      _updatedAt: room.updatedAt,
      lm: room.lastModifiedAt
    };
  }

  convertRoom(room) {
    if (!room) {
      return undefined;
    }

    let creator;

    if (room.u) {
      creator = this.orch.getConverters().get('users').convertById(room.u._id);
    }

    return {
      id: room._id,
      displayName: room.fname,
      slugifiedName: room.name,
      type: this._convertTypeToApp(room.t),
      creator,
      members: room.members,
      isDefault: typeof room.default === 'undefined' ? false : room.default,
      isReadOnly: typeof room.ro === 'undefined' ? false : room.ro,
      displaySystemMessages: typeof room.sysMes === 'undefined' ? true : room.sysMes,
      messageCount: room.msgs,
      createdAt: room.ts,
      updatedAt: room._updatedAt,
      lastModifiedAt: room.lm,
      customFields: {}
    };
  }

  _convertTypeToApp(typeChar) {
    switch (typeChar) {
      case 'c':
        return RoomType.CHANNEL;

      case 'p':
        return RoomType.PRIVATE_GROUP;

      case 'd':
        return RoomType.DIRECT_MESSAGE;

      case 'lc':
        return RoomType.LIVE_CHAT;

      default:
        return typeChar;
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/settings.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppSettingsConverter: () => AppSettingsConverter
});
let SettingType;
module.watch(require("@rocket.chat/apps-engine/definition/settings"), {
  SettingType(v) {
    SettingType = v;
  }

}, 0);

class AppSettingsConverter {
  constructor(orch) {
    this.orch = orch;
  }

  convertById(settingId) {
    const setting = RocketChat.models.Settings.findOneById(settingId);
    return this.convertToApp(setting);
  }

  convertToApp(setting) {
    return {
      id: setting._id,
      type: this._convertTypeToApp(setting.type),
      packageValue: setting.packageValue,
      values: setting.values,
      value: setting.value,
      public: setting.public,
      hidden: setting.hidden,
      group: setting.group,
      i18nLabel: setting.i18nLabel,
      i18nDescription: setting.i18nDescription,
      createdAt: setting.ts,
      updatedAt: setting._updatedAt
    };
  }

  _convertTypeToApp(type) {
    switch (type) {
      case 'boolean':
        return SettingType.BOOLEAN;

      case 'code':
        return SettingType.CODE;

      case 'color':
        return SettingType.COLOR;

      case 'font':
        return SettingType.FONT;

      case 'int':
        return SettingType.NUMBER;

      case 'select':
        return SettingType.SELECT;

      case 'string':
        return SettingType.STRING;

      default:
        return type;
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"users.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/users.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppUsersConverter: () => AppUsersConverter
});
let UserStatusConnection, UserType;
module.watch(require("@rocket.chat/apps-engine/definition/users"), {
  UserStatusConnection(v) {
    UserStatusConnection = v;
  },

  UserType(v) {
    UserType = v;
  }

}, 0);

class AppUsersConverter {
  constructor(orch) {
    this.orch = orch;
  }

  convertById(userId) {
    const user = RocketChat.models.Users.findOneById(userId);
    return this.convertToApp(user);
  }

  convertByUsername(username) {
    const user = RocketChat.models.Users.findOneByUsername(username);
    return this.convertToApp(user);
  }

  convertToApp(user) {
    if (!user) {
      return undefined;
    }

    const type = this._convertUserTypeToEnum(user.type);

    const statusConnection = this._convertStatusConnectionToEnum(user.username, user._id, user.statusConnection);

    return {
      id: user._id,
      username: user.username,
      emails: user.emails,
      type,
      isEnabled: user.active,
      name: user.name,
      roles: user.roles,
      status: user.status,
      statusConnection,
      utcOffset: user.utcOffset,
      createdAt: user.createdAt,
      updatedAt: user._updatedAt,
      lastLoginAt: user.lastLogin
    };
  }

  _convertUserTypeToEnum(type) {
    switch (type) {
      case 'user':
        return UserType.USER;

      case 'bot':
        return UserType.BOT;

      case '':
      case undefined:
        return UserType.UNKNOWN;

      default:
        console.warn(`A new user type has been added that the Apps don't know about? "${type}"`);
        return type.toUpperCase();
    }
  }

  _convertStatusConnectionToEnum(username, userId, status) {
    switch (status) {
      case 'offline':
        return UserStatusConnection.OFFLINE;

      case 'online':
        return UserStatusConnection.ONLINE;

      case 'away':
        return UserStatusConnection.AWAY;

      case 'busy':
        return UserStatusConnection.BUSY;

      case undefined:
        // This is needed for Livechat guests and Rocket.Cat user.
        return UserStatusConnection.UNDEFINED;

      default:
        console.warn(`The user ${username} (${userId}) does not have a valid status (offline, online, away, or busy). It is currently: "${status}"`);
        return !status ? UserStatusConnection.OFFLINE : status.toUpperCase();
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/index.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMessagesConverter: () => AppMessagesConverter,
  AppRoomsConverter: () => AppRoomsConverter,
  AppSettingsConverter: () => AppSettingsConverter,
  AppUsersConverter: () => AppUsersConverter
});
let AppMessagesConverter;
module.watch(require("./messages"), {
  AppMessagesConverter(v) {
    AppMessagesConverter = v;
  }

}, 0);
let AppRoomsConverter;
module.watch(require("./rooms"), {
  AppRoomsConverter(v) {
    AppRoomsConverter = v;
  }

}, 1);
let AppSettingsConverter;
module.watch(require("./settings"), {
  AppSettingsConverter(v) {
    AppSettingsConverter = v;
  }

}, 2);
let AppUsersConverter;
module.watch(require("./users"), {
  AppUsersConverter(v) {
    AppUsersConverter = v;
  }

}, 3);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"orchestrator.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/orchestrator.js                                                                    //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let RealAppBridges;
module.watch(require("./bridges"), {
  RealAppBridges(v) {
    RealAppBridges = v;
  }

}, 0);
let AppMethods, AppsRestApi, AppServerNotifier;
module.watch(require("./communication"), {
  AppMethods(v) {
    AppMethods = v;
  },

  AppsRestApi(v) {
    AppsRestApi = v;
  },

  AppServerNotifier(v) {
    AppServerNotifier = v;
  }

}, 1);
let AppMessagesConverter, AppRoomsConverter, AppSettingsConverter, AppUsersConverter;
module.watch(require("./converters"), {
  AppMessagesConverter(v) {
    AppMessagesConverter = v;
  },

  AppRoomsConverter(v) {
    AppRoomsConverter = v;
  },

  AppSettingsConverter(v) {
    AppSettingsConverter = v;
  },

  AppUsersConverter(v) {
    AppUsersConverter = v;
  }

}, 2);
let AppsLogsModel, AppsModel, AppsPersistenceModel, AppRealStorage, AppRealLogsStorage;
module.watch(require("./storage"), {
  AppsLogsModel(v) {
    AppsLogsModel = v;
  },

  AppsModel(v) {
    AppsModel = v;
  },

  AppsPersistenceModel(v) {
    AppsPersistenceModel = v;
  },

  AppRealStorage(v) {
    AppRealStorage = v;
  },

  AppRealLogsStorage(v) {
    AppRealLogsStorage = v;
  }

}, 3);
let AppManager;
module.watch(require("@rocket.chat/apps-engine/server/AppManager"), {
  AppManager(v) {
    AppManager = v;
  }

}, 4);

class AppServerOrchestrator {
  constructor() {
    if (RocketChat.models && RocketChat.models.Permissions) {
      RocketChat.models.Permissions.createOrUpdate('manage-apps', ['admin']);
    }

    this._model = new AppsModel();
    this._logModel = new AppsLogsModel();
    this._persistModel = new AppsPersistenceModel();
    this._storage = new AppRealStorage(this._model);
    this._logStorage = new AppRealLogsStorage(this._logModel);
    this._converters = new Map();

    this._converters.set('messages', new AppMessagesConverter(this));

    this._converters.set('rooms', new AppRoomsConverter(this));

    this._converters.set('settings', new AppSettingsConverter(this));

    this._converters.set('users', new AppUsersConverter(this));

    this._bridges = new RealAppBridges(this);
    this._manager = new AppManager(this._storage, this._logStorage, this._bridges);
    this._communicators = new Map();

    this._communicators.set('methods', new AppMethods(this));

    this._communicators.set('notifier', new AppServerNotifier(this));

    this._communicators.set('restapi', new AppsRestApi(this, this._manager));
  }

  getModel() {
    return this._model;
  }

  getPersistenceModel() {
    return this._persistModel;
  }

  getStorage() {
    return this._storage;
  }

  getLogStorage() {
    return this._logStorage;
  }

  getConverters() {
    return this._converters;
  }

  getBridges() {
    return this._bridges;
  }

  getNotifier() {
    return this._communicators.get('notifier');
  }

  getManager() {
    return this._manager;
  }

  isEnabled() {
    return RocketChat.settings.get('Apps_Framework_enabled');
  }

  isLoaded() {
    return this.getManager().areAppsLoaded();
  }

  load() {
    // Don't try to load it again if it has
    // already been loaded
    if (this.isLoaded()) {
      return;
    }

    this._manager.load().then(affs => console.log(`Loaded the Apps Framework and loaded a total of ${affs.length} Apps!`)).catch(err => console.warn('Failed to load the Apps Framework and Apps!', err));
  }

  unload() {
    // Don't try to unload it if it's already been
    // unlaoded or wasn't unloaded to start with
    if (!this.isLoaded()) {
      return;
    }

    this._manager.unload().then(() => console.log('Unloaded the Apps Framework.')).catch(err => console.warn('Failed to unload the Apps Framework!', err));
  }

}

RocketChat.settings.add('Apps_Framework_enabled', false, {
  type: 'boolean',
  hidden: true
});
RocketChat.settings.get('Apps_Framework_enabled', (key, isEnabled) => {
  // In case this gets called before `Meteor.startup`
  if (!global.Apps) {
    return;
  }

  if (isEnabled) {
    global.Apps.load();
  } else {
    global.Apps.unload();
  }
});
Meteor.startup(function _appServerOrchestrator() {
  global.Apps = new AppServerOrchestrator();

  if (global.Apps.isEnabled()) {
    global.Apps.load();
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:apps/lib/Apps.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/apps-logs-model.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/apps-model.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/apps-persistence-model.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/storage.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/index.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/activation.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/bridges.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/commands.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/environmental.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/messages.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/persistence.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/rooms.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/settings.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/users.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/index.js");
require("/node_modules/meteor/rocketchat:apps/server/communication/methods.js");
require("/node_modules/meteor/rocketchat:apps/server/communication/rest.js");
require("/node_modules/meteor/rocketchat:apps/server/communication/websockets.js");
require("/node_modules/meteor/rocketchat:apps/server/communication/index.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/messages.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/rooms.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/settings.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/users.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/index.js");
require("/node_modules/meteor/rocketchat:apps/server/orchestrator.js");

/* Exports */
Package._define("rocketchat:apps", {
  Apps: Apps
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_apps.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL2xpYi9BcHBzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvbGliL21pc2MvVXRpbGl0aWVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL3N0b3JhZ2UvYXBwcy1sb2dzLW1vZGVsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL3N0b3JhZ2UvYXBwcy1tb2RlbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9zdG9yYWdlL2FwcHMtcGVyc2lzdGVuY2UtbW9kZWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvc3RvcmFnZS9zdG9yYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL3N0b3JhZ2UvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvc3RvcmFnZS9sb2dzLXN0b3JhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvYnJpZGdlcy9hY3RpdmF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvYnJpZGdlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9icmlkZ2VzL2NvbW1hbmRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvZW52aXJvbm1lbnRhbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9icmlkZ2VzL21lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvcGVyc2lzdGVuY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvYnJpZGdlcy9yb29tcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9icmlkZ2VzL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvdXNlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvYnJpZGdlcy9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9icmlkZ2VzL2RldGFpbHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvYnJpZGdlcy9odHRwLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvbGlzdGVuZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2NvbW11bmljYXRpb24vbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9jb21tdW5pY2F0aW9uL3Jlc3QuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvY29tbXVuaWNhdGlvbi93ZWJzb2NrZXRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2NvbW11bmljYXRpb24vaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvY29udmVydGVycy9tZXNzYWdlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9jb252ZXJ0ZXJzL3Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2NvbnZlcnRlcnMvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvY29udmVydGVycy91c2Vycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9jb252ZXJ0ZXJzL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL29yY2hlc3RyYXRvci5qcyJdLCJuYW1lcyI6WyJBcHBzIiwibW9kdWxlIiwiZXhwb3J0IiwiVXRpbGl0aWVzIiwiZ2V0STE4bktleUZvckFwcCIsImtleSIsImFwcElkIiwiQXBwc0xvZ3NNb2RlbCIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJfQmFzZSIsImNvbnN0cnVjdG9yIiwiQXBwc01vZGVsIiwiQXBwc1BlcnNpc3RlbmNlTW9kZWwiLCJBcHBSZWFsU3RvcmFnZSIsIkFwcFN0b3JhZ2UiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiZGF0YSIsImRiIiwiY3JlYXRlIiwiaXRlbSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY3JlYXRlZEF0IiwiRGF0ZSIsInVwZGF0ZWRBdCIsImRvYyIsImZpbmRPbmUiLCIkb3IiLCJpZCIsImluZm8iLCJuYW1lU2x1ZyIsImUiLCJFcnJvciIsImluc2VydCIsIl9pZCIsInJldHJpZXZlT25lIiwicmV0cmlldmVBbGwiLCJkb2NzIiwiZmluZCIsImZldGNoIiwiaXRlbXMiLCJNYXAiLCJmb3JFYWNoIiwiaSIsInNldCIsInVwZGF0ZSIsInRoZW4iLCJ1cGRhdGVkIiwiY2F0Y2giLCJlcnIiLCJyZW1vdmUiLCJzdWNjZXNzIiwiQXBwUmVhbExvZ3NTdG9yYWdlIiwiQXBwQ29uc29sZSIsIkFwcExvZ1N0b3JhZ2UiLCJtb2RlbCIsImFyZ3MiLCJzdG9yZUVudHJpZXMiLCJsb2dnZXIiLCJ0b1N0b3JhZ2VFbnRyeSIsImZpbmRPbmVCeUlkIiwiZ2V0RW50cmllc0ZvciIsInJlbW92ZUVudHJpZXNGb3IiLCJBcHBBY3RpdmF0aW9uQnJpZGdlIiwib3JjaCIsImFwcEFkZGVkIiwiYXBwIiwiZ2V0Tm90aWZpZXIiLCJnZXRJRCIsImFwcFVwZGF0ZWQiLCJhcHBSZW1vdmVkIiwiYXBwU3RhdHVzQ2hhbmdlZCIsInN0YXR1cyIsImFwcFN0YXR1c1VwZGF0ZWQiLCJSZWFsQXBwQnJpZGdlcyIsIkFwcEJyaWRnZXMiLCJBcHBEZXRhaWxDaGFuZ2VzQnJpZGdlIiwiQXBwQ29tbWFuZHNCcmlkZ2UiLCJBcHBFbnZpcm9ubWVudGFsVmFyaWFibGVCcmlkZ2UiLCJBcHBIdHRwQnJpZGdlIiwiQXBwTGlzdGVuZXJCcmlkZ2UiLCJBcHBNZXNzYWdlQnJpZGdlIiwiQXBwUGVyc2lzdGVuY2VCcmlkZ2UiLCJBcHBSb29tQnJpZGdlIiwiQXBwU2V0dGluZ0JyaWRnZSIsIkFwcFVzZXJCcmlkZ2UiLCJfYWN0QnJpZGdlIiwiX2NtZEJyaWRnZSIsIl9kZXRCcmlkZ2UiLCJfZW52QnJpZGdlIiwiX2h0dHBCcmlkZ2UiLCJfbGlzbkJyaWRnZSIsIl9tc2dCcmlkZ2UiLCJfcGVyc2lzdEJyaWRnZSIsIl9yb29tQnJpZGdlIiwiX3NldHNCcmlkZ2UiLCJfdXNlckJyaWRnZSIsImdldENvbW1hbmRCcmlkZ2UiLCJnZXRFbnZpcm9ubWVudGFsVmFyaWFibGVCcmlkZ2UiLCJnZXRIdHRwQnJpZGdlIiwiZ2V0TGlzdGVuZXJCcmlkZ2UiLCJnZXRNZXNzYWdlQnJpZGdlIiwiZ2V0UGVyc2lzdGVuY2VCcmlkZ2UiLCJnZXRBcHBBY3RpdmF0aW9uQnJpZGdlIiwiZ2V0QXBwRGV0YWlsQ2hhbmdlc0JyaWRnZSIsImdldFJvb21CcmlkZ2UiLCJnZXRTZXJ2ZXJTZXR0aW5nQnJpZGdlIiwiZ2V0VXNlckJyaWRnZSIsIlNsYXNoQ29tbWFuZENvbnRleHQiLCJkaXNhYmxlZENvbW1hbmRzIiwiZG9lc0NvbW1hbmRFeGlzdCIsImNvbW1hbmQiLCJjb25zb2xlIiwibG9nIiwibGVuZ3RoIiwiY21kIiwidG9Mb3dlckNhc2UiLCJzbGFzaENvbW1hbmRzIiwiY29tbWFuZHMiLCJoYXMiLCJlbmFibGVDb21tYW5kIiwidHJpbSIsImdldCIsImRlbGV0ZSIsImNvbW1hbmRVcGRhdGVkIiwiZGlzYWJsZUNvbW1hbmQiLCJjb21tYW5kRGlzYWJsZWQiLCJtb2RpZnlDb21tYW5kIiwiX3ZlcmlmeUNvbW1hbmQiLCJwYXJhbXMiLCJwYXJhbXNFeGFtcGxlIiwiZGVzY3JpcHRpb24iLCJpMThuRGVzY3JpcHRpb24iLCJjYWxsYmFjayIsIl9hcHBDb21tYW5kRXhlY3V0b3IiLCJiaW5kIiwicHJvdmlkZXNQcmV2aWV3IiwicHJldmlld2VyIiwiX2FwcENvbW1hbmRQcmV2aWV3ZXIiLCJwcmV2aWV3Q2FsbGJhY2siLCJleGVjdXRlUHJldmlld0l0ZW0iLCJfYXBwQ29tbWFuZFByZXZpZXdFeGVjdXRvciIsInJlZ2lzdGVyQ29tbWFuZCIsImkxOG5QYXJhbXNFeGFtcGxlIiwidW5kZWZpbmVkIiwiY29tbWFuZEFkZGVkIiwidW5yZWdpc3RlckNvbW1hbmQiLCJjb21tYW5kUmVtb3ZlZCIsImV4ZWN1dG9yIiwicGFyYW1ldGVycyIsIm1lc3NhZ2UiLCJ1c2VyIiwiZ2V0Q29udmVydGVycyIsImNvbnZlcnRCeUlkIiwiTWV0ZW9yIiwidXNlcklkIiwicm9vbSIsInJpZCIsInNwbGl0IiwiY29udGV4dCIsIk9iamVjdCIsImZyZWV6ZSIsImF3YWl0IiwiZ2V0TWFuYWdlciIsImdldENvbW1hbmRNYW5hZ2VyIiwiZXhlY3V0ZUNvbW1hbmQiLCJnZXRQcmV2aWV3cyIsInByZXZpZXciLCJleGVjdXRlUHJldmlldyIsImFsbG93ZWQiLCJnZXRWYWx1ZUJ5TmFtZSIsImVudlZhck5hbWUiLCJpc1JlYWRhYmxlIiwicHJvY2VzcyIsImVudiIsImluY2x1ZGVzIiwidG9VcHBlckNhc2UiLCJpc1NldCIsIm1zZyIsImNvbnZlcnRBcHBNZXNzYWdlIiwicnVuQXNVc2VyIiwidSIsImNhbGwiLCJnZXRCeUlkIiwibWVzc2FnZUlkIiwiZWRpdG9yIiwiTWVzc2FnZXMiLCJVc2VycyIsInVwZGF0ZU1lc3NhZ2UiLCJub3RpZnlVc2VyIiwiTm90aWZpY2F0aW9ucyIsImFzc2lnbiIsIlJhbmRvbSIsInRzIiwibm90aWZ5Um9vbSIsInJtc2ciLCJ1c2VycyIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kQnlSb29tSWRXaGVuVXNlcklkRXhpc3RzIiwiZmllbGRzIiwibWFwIiwicyIsImZpbmRCeUlkcyIsInB1cmdlIiwiZ2V0UGVyc2lzdGVuY2VNb2RlbCIsImNyZWF0ZVdpdGhBc3NvY2lhdGlvbnMiLCJhc3NvY2lhdGlvbnMiLCJyZWFkQnlJZCIsInJlY29yZCIsInJlYWRCeUFzc29jaWF0aW9ucyIsInJlY29yZHMiLCIkYWxsIiwiQXJyYXkiLCJpc0FycmF5IiwiciIsInJlbW92ZUJ5QXNzb2NpYXRpb25zIiwicXVlcnkiLCJ1cHNlcnQiLCJSb29tVHlwZSIsInJjUm9vbSIsImNvbnZlcnRBcHBSb29tIiwibWV0aG9kIiwidHlwZSIsIkNIQU5ORUwiLCJQUklWQVRFX0dST1VQIiwiY3JlYXRvciIsIm1lbWJlcnMiLCJyb29tSWQiLCJnZXRCeU5hbWUiLCJyb29tTmFtZSIsImNvbnZlcnRCeU5hbWUiLCJnZXRDcmVhdG9yQnlJZCIsIlJvb21zIiwiZ2V0Q3JlYXRvckJ5TmFtZSIsImZpbmRPbmVCeU5hbWUiLCJybSIsImFsbG93ZWRHcm91cHMiLCJkaXNhbGxvd2VkU2V0dGluZ3MiLCJnZXRBbGwiLCJTZXR0aW5ncyIsIiRuaW4iLCJjb252ZXJ0VG9BcHAiLCJnZXRPbmVCeUlkIiwiaXNSZWFkYWJsZUJ5SWQiLCJoaWRlR3JvdXAiLCJuYW1lIiwiaGlkZVNldHRpbmciLCJ1cGRhdGVPbmUiLCJzZXR0aW5nIiwiZ2V0QnlVc2VybmFtZSIsInVzZXJuYW1lIiwiY29udmVydEJ5VXNlcm5hbWUiLCJvbkFwcFNldHRpbmdzQ2hhbmdlIiwiYXBwU2V0dGluZ3NDaGFuZ2UiLCJ3YXJuIiwicmVxdWVzdCIsImNvbnRlbnQiLCJKU09OIiwic3RyaW5naWZ5IiwiSFRUUCIsInVybCIsInJlc3BvbnNlIiwibWVzc2FnZUV2ZW50IiwiaW50ZSIsImNvbnZlcnRNZXNzYWdlIiwicmVzdWx0IiwiZ2V0TGlzdGVuZXJNYW5hZ2VyIiwiZXhlY3V0ZUxpc3RlbmVyIiwicm9vbUV2ZW50IiwiY29udmVydFJvb20iLCJBcHBNZXRob2RzIiwid2FpdFRvTG9hZCIsInNldEludGVydmFsIiwiaXNFbmFibGVkIiwiaXNMb2FkZWQiLCJjbGVhckludGVydmFsIiwid2FpdFRvVW5sb2FkIiwiX29yY2giLCJfYWRkTWV0aG9kcyIsImluc3RhbmNlIiwibWV0aG9kcyIsImF1dGh6IiwiaGFzUGVybWlzc2lvbiIsInNldHRpbmdzIiwiQXBwc1Jlc3RBcGkiLCJCdXNib3kiLCJkZWZhdWx0IiwibWFuYWdlciIsIl9tYW5hZ2VyIiwiYXBpIiwiQVBJIiwiQXBpQ2xhc3MiLCJ2ZXJzaW9uIiwidXNlRGVmYXVsdEF1dGgiLCJwcmV0dHlKc29uIiwiZW5hYmxlQ29ycyIsImF1dGgiLCJnZXRVc2VyQXV0aCIsImFkZE1hbmFnZW1lbnRSb3V0ZXMiLCJfaGFuZGxlRmlsZSIsImZpbGVGaWVsZCIsImJ1c2JveSIsImhlYWRlcnMiLCJ3cmFwQXN5bmMiLCJvbiIsImJpbmRFbnZpcm9ubWVudCIsImZpZWxkbmFtZSIsImZpbGUiLCJmaWxlRGF0YSIsInB1c2giLCJCdWZmZXIiLCJjb25jYXQiLCJwaXBlIiwib3JjaGVzdHJhdG9yIiwiZmlsZUhhbmRsZXIiLCJhZGRSb3V0ZSIsImF1dGhSZXF1aXJlZCIsImFwcHMiLCJwcmwiLCJnZXRJbmZvIiwibGFuZ3VhZ2VzIiwiZ2V0U3RvcmFnZUl0ZW0iLCJsYW5ndWFnZUNvbnRlbnQiLCJnZXRTdGF0dXMiLCJ2MSIsInBvc3QiLCJidWZmIiwiYm9keVBhcmFtcyIsIm5wbVJlcXVlc3RPcHRpb25zIiwiZW5jb2RpbmciLCJzdGF0dXNDb2RlIiwiZmFpbHVyZSIsImVycm9yIiwiZnJvbSIsImFmZiIsImFkZCIsInRvU3RyaW5nIiwiZ2V0QXBwSW5mbyIsImdldEFwcCIsImltcGxlbWVudGVkIiwiZ2V0SW1wbGVtZW50ZWRJbmZlcmZhY2VzIiwiY29tcGlsZXJFcnJvcnMiLCJnZXRDb21waWxlckVycm9ycyIsInVybFBhcmFtcyIsIm5vdEZvdW5kIiwiaWNvbkZpbGVDb250ZW50Iiwib2Zmc2V0IiwiY291bnQiLCJnZXRQYWdpbmF0aW9uSXRlbXMiLCJzb3J0IiwicGFyc2VKc29uUXVlcnkiLCJvdXJRdWVyeSIsIm9wdGlvbnMiLCJfdXBkYXRlZEF0Iiwic2tpcCIsImxpbWl0IiwibG9ncyIsImdldExvZ1N0b3JhZ2UiLCJrZXlzIiwiayIsImhpZGRlbiIsImdldFNldHRpbmdzTWFuYWdlciIsInVwZGF0ZUFwcFNldHRpbmciLCJzZXR0aW5nSWQiLCJnZXRBcHBTZXR0aW5nIiwiY2hhbmdlU3RhdHVzIiwiQXBwRXZlbnRzIiwiQXBwU2VydmVyTGlzdGVuZXIiLCJBcHBTZXJ2ZXJOb3RpZmllciIsIkFwcFN0YXR1cyIsIkFwcFN0YXR1c1V0aWxzIiwiQVBQX0FEREVEIiwiQVBQX1JFTU9WRUQiLCJBUFBfVVBEQVRFRCIsIkFQUF9TVEFUVVNfQ0hBTkdFIiwiQVBQX1NFVFRJTkdfVVBEQVRFRCIsIkNPTU1BTkRfQURERUQiLCJDT01NQU5EX0RJU0FCTEVEIiwiQ09NTUFORF9VUERBVEVEIiwiQ09NTUFORF9SRU1PVkVEIiwiZW5naW5lU3RyZWFtZXIiLCJjbGllbnRTdHJlYW1lciIsInJlY2VpdmVkIiwib25BcHBBZGRlZCIsIm9uQXBwU3RhdHVzVXBkYXRlZCIsIm9uQXBwU2V0dGluZ1VwZGF0ZWQiLCJvbkFwcFJlbW92ZWQiLCJvbkFwcFVwZGF0ZWQiLCJvbkNvbW1hbmRBZGRlZCIsIm9uQ29tbWFuZERpc2FibGVkIiwib25Db21tYW5kVXBkYXRlZCIsIm9uQ29tbWFuZFJlbW92ZWQiLCJsb2FkT25lIiwiZW1pdCIsIndoZW4iLCJlbmFibGUiLCJpc0Rpc2FibGVkIiwiZGlzYWJsZSIsIk1BTlVBTExZX0RJU0FCTEVEIiwic3RvcmFnZUl0ZW0iLCJnZXRTdG9yYWdlIiwiemlwIiwiU3RyZWFtZXIiLCJyZXRyYW5zbWl0Iiwic2VydmVyT25seSIsImFsbG93UmVhZCIsImFsbG93RW1pdCIsImFsbG93V3JpdGUiLCJsaXN0ZW5lciIsImRldGFpbHMiLCJBcHBNZXNzYWdlc0NvbnZlcnRlciIsIm1zZ0lkIiwibXNnT2JqIiwic2VuZGVyIiwiZWRpdGVkQnkiLCJhdHRhY2htZW50cyIsIl9jb252ZXJ0QXR0YWNobWVudHNUb0FwcCIsInRleHQiLCJlZGl0ZWRBdCIsImVtb2ppIiwiYXZhdGFyVXJsIiwiYXZhdGFyIiwiYWxpYXMiLCJjdXN0b21GaWVsZHMiLCJfY29udmVydEFwcEF0dGFjaG1lbnRzIiwiYXR0YWNobWVudCIsImNvbGxhcHNlZCIsImNvbG9yIiwidGltZXN0YW1wIiwibWVzc2FnZV9saW5rIiwidGltZXN0YW1wTGluayIsInRodW1iX3VybCIsInRodW1ibmFpbFVybCIsImF1dGhvcl9uYW1lIiwiYXV0aG9yIiwiYXV0aG9yX2xpbmsiLCJsaW5rIiwiYXV0aG9yX2ljb24iLCJpY29uIiwidGl0bGUiLCJ2YWx1ZSIsInRpdGxlX2xpbmsiLCJ0aXRsZV9saW5rX2Rvd25sb2FkIiwiZGlzcGxheURvd25sb2FkTGluayIsImltYWdlX3VybCIsImltYWdlVXJsIiwiYXVkaW9fdXJsIiwiYXVkaW9VcmwiLCJ2aWRlb191cmwiLCJ2aWRlb1VybCIsImEiLCJBcHBSb29tc0NvbnZlcnRlciIsImZuYW1lIiwiZGlzcGxheU5hbWUiLCJzbHVnaWZpZWROYW1lIiwidCIsImlzRGVmYXVsdCIsInJvIiwiaXNSZWFkT25seSIsInN5c01lcyIsImRpc3BsYXlTeXN0ZW1NZXNzYWdlcyIsIm1zZ3MiLCJtZXNzYWdlQ291bnQiLCJsbSIsImxhc3RNb2RpZmllZEF0IiwiX2NvbnZlcnRUeXBlVG9BcHAiLCJ0eXBlQ2hhciIsIkRJUkVDVF9NRVNTQUdFIiwiTElWRV9DSEFUIiwiQXBwU2V0dGluZ3NDb252ZXJ0ZXIiLCJTZXR0aW5nVHlwZSIsInBhY2thZ2VWYWx1ZSIsInZhbHVlcyIsInB1YmxpYyIsImdyb3VwIiwiaTE4bkxhYmVsIiwiQk9PTEVBTiIsIkNPREUiLCJDT0xPUiIsIkZPTlQiLCJOVU1CRVIiLCJTRUxFQ1QiLCJTVFJJTkciLCJBcHBVc2Vyc0NvbnZlcnRlciIsIlVzZXJTdGF0dXNDb25uZWN0aW9uIiwiVXNlclR5cGUiLCJmaW5kT25lQnlVc2VybmFtZSIsIl9jb252ZXJ0VXNlclR5cGVUb0VudW0iLCJzdGF0dXNDb25uZWN0aW9uIiwiX2NvbnZlcnRTdGF0dXNDb25uZWN0aW9uVG9FbnVtIiwiZW1haWxzIiwiYWN0aXZlIiwicm9sZXMiLCJ1dGNPZmZzZXQiLCJsYXN0TG9naW5BdCIsImxhc3RMb2dpbiIsIlVTRVIiLCJCT1QiLCJVTktOT1dOIiwiT0ZGTElORSIsIk9OTElORSIsIkFXQVkiLCJCVVNZIiwiVU5ERUZJTkVEIiwiQXBwTWFuYWdlciIsIkFwcFNlcnZlck9yY2hlc3RyYXRvciIsIlBlcm1pc3Npb25zIiwiY3JlYXRlT3JVcGRhdGUiLCJfbW9kZWwiLCJfbG9nTW9kZWwiLCJfcGVyc2lzdE1vZGVsIiwiX3N0b3JhZ2UiLCJfbG9nU3RvcmFnZSIsIl9jb252ZXJ0ZXJzIiwiX2JyaWRnZXMiLCJfY29tbXVuaWNhdG9ycyIsImdldE1vZGVsIiwiZ2V0QnJpZGdlcyIsImFyZUFwcHNMb2FkZWQiLCJsb2FkIiwiYWZmcyIsInVubG9hZCIsImdsb2JhbCIsInN0YXJ0dXAiLCJfYXBwU2VydmVyT3JjaGVzdHJhdG9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FB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O0FBRUQsU0FBS2MsUUFBTCxDQUFjeU8sTUFBZCxHQUNFM2QsSUFERixDQUNPLE1BQU1rRSxRQUFRQyxHQUFSLENBQVksOEJBQVosQ0FEYixFQUVFakUsS0FGRixDQUVTQyxHQUFELElBQVMrRCxRQUFROEksSUFBUixDQUFhLHNDQUFiLEVBQXFEN00sR0FBckQsQ0FGakI7QUFHQTs7QUExRjBCOztBQTZGNUI3QyxXQUFXdVIsUUFBWCxDQUFvQm9ELEdBQXBCLENBQXdCLHdCQUF4QixFQUFrRCxLQUFsRCxFQUF5RDtBQUN4RGpILFFBQU0sU0FEa0Q7QUFFeEQwSSxVQUFRO0FBRmdELENBQXpEO0FBS0FwVyxXQUFXdVIsUUFBWCxDQUFvQmpLLEdBQXBCLENBQXdCLHdCQUF4QixFQUFrRCxDQUFDekgsR0FBRCxFQUFNZ1IsU0FBTixLQUFvQjtBQUNyRTtBQUNBLE1BQUksQ0FBQ3lQLE9BQU85Z0IsSUFBWixFQUFrQjtBQUNqQjtBQUNBOztBQUVELE1BQUlxUixTQUFKLEVBQWU7QUFDZHlQLFdBQU85Z0IsSUFBUCxDQUFZMmdCLElBQVo7QUFDQSxHQUZELE1BRU87QUFDTkcsV0FBTzlnQixJQUFQLENBQVk2Z0IsTUFBWjtBQUNBO0FBQ0QsQ0FYRDtBQWFBL1csT0FBT2lYLE9BQVAsQ0FBZSxTQUFTQyxzQkFBVCxHQUFrQztBQUNoREYsU0FBTzlnQixJQUFQLEdBQWMsSUFBSTZmLHFCQUFKLEVBQWQ7O0FBRUEsTUFBSWlCLE9BQU85Z0IsSUFBUCxDQUFZcVIsU0FBWixFQUFKLEVBQTZCO0FBQzVCeVAsV0FBTzlnQixJQUFQLENBQVkyZ0IsSUFBWjtBQUNBO0FBQ0QsQ0FORCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2FwcHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQbGVhc2Ugc2VlIGJvdGggc2VydmVyIGFuZCBjbGllbnQncyByZXBzZWN0aXZlIFwib3JjaGVzdHJhdG9yXCIgZmlsZSBmb3IgdGhlIGNvbnRlbnRzXG5BcHBzID0ge307XG4iLCJleHBvcnQgY2xhc3MgVXRpbGl0aWVzIHtcblx0c3RhdGljIGdldEkxOG5LZXlGb3JBcHAoa2V5LCBhcHBJZCkge1xuXHRcdHJldHVybiBrZXkgJiYgYGFwcHMtJHsgYXBwSWQgfS0keyBrZXkgfWA7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBBcHBzTG9nc01vZGVsIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignYXBwc19sb2dzJyk7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBBcHBzTW9kZWwgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdhcHBzJyk7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBBcHBzUGVyc2lzdGVuY2VNb2RlbCBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2FwcHNfcGVyc2lzdGVuY2UnKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQXBwU3RvcmFnZSB9IGZyb20gJ0Byb2NrZXQuY2hhdC9hcHBzLWVuZ2luZS9zZXJ2ZXIvc3RvcmFnZSc7XG5cbmV4cG9ydCBjbGFzcyBBcHBSZWFsU3RvcmFnZSBleHRlbmRzIEFwcFN0b3JhZ2Uge1xuXHRjb25zdHJ1Y3RvcihkYXRhKSB7XG5cdFx0c3VwZXIoJ21vbmdvZGInKTtcblx0XHR0aGlzLmRiID0gZGF0YTtcblx0fVxuXG5cdGNyZWF0ZShpdGVtKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGl0ZW0uY3JlYXRlZEF0ID0gbmV3IERhdGUoKTtcblx0XHRcdGl0ZW0udXBkYXRlZEF0ID0gbmV3IERhdGUoKTtcblxuXHRcdFx0bGV0IGRvYztcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0ZG9jID0gdGhpcy5kYi5maW5kT25lKHsgJG9yOiBbeyBpZDogaXRlbS5pZCB9LCB7ICdpbmZvLm5hbWVTbHVnJzogaXRlbS5pbmZvLm5hbWVTbHVnIH1dIH0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KGUpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZG9jKSB7XG5cdFx0XHRcdHJldHVybiByZWplY3QobmV3IEVycm9yKCdBcHAgYWxyZWFkeSBleGlzdHMuJykpO1xuXHRcdFx0fVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCBpZCA9IHRoaXMuZGIuaW5zZXJ0KGl0ZW0pO1xuXHRcdFx0XHRpdGVtLl9pZCA9IGlkO1xuXG5cdFx0XHRcdHJlc29sdmUoaXRlbSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHJlamVjdChlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHJldHJpZXZlT25lKGlkKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGxldCBkb2M7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGRvYyA9IHRoaXMuZGIuZmluZE9uZSh7ICRvcjogW3sgX2lkOiBpZCB9LCB7IGlkIH1dIH0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KGUpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZG9jKSB7XG5cdFx0XHRcdHJlc29sdmUoZG9jKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJlamVjdChuZXcgRXJyb3IoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQ6ICR7IGlkIH1gKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRyZXRyaWV2ZUFsbCgpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0bGV0IGRvY3M7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGRvY3MgPSB0aGlzLmRiLmZpbmQoe30pLmZldGNoKCk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHJldHVybiByZWplY3QoZSk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGl0ZW1zID0gbmV3IE1hcCgpO1xuXG5cdFx0XHRkb2NzLmZvckVhY2goKGkpID0+IGl0ZW1zLnNldChpLmlkLCBpKSk7XG5cblx0XHRcdHJlc29sdmUoaXRlbXMpO1xuXHRcdH0pO1xuXHR9XG5cblx0dXBkYXRlKGl0ZW0pIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dGhpcy5kYi51cGRhdGUoeyBpZDogaXRlbS5pZCB9LCBpdGVtKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIHJlamVjdChlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5yZXRyaWV2ZU9uZShpdGVtLmlkKS50aGVuKCh1cGRhdGVkKSA9PiByZXNvbHZlKHVwZGF0ZWQpKS5jYXRjaCgoZXJyKSA9PiByZWplY3QoZXJyKSk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZW1vdmUoaWQpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dGhpcy5kYi5yZW1vdmUoeyBpZCB9KTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIHJlamVjdChlKTtcblx0XHRcdH1cblxuXHRcdFx0cmVzb2x2ZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cdFx0fSk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEFwcHNMb2dzTW9kZWwgfSBmcm9tICcuL2FwcHMtbG9ncy1tb2RlbCc7XG5pbXBvcnQgeyBBcHBzTW9kZWwgfSBmcm9tICcuL2FwcHMtbW9kZWwnO1xuaW1wb3J0IHsgQXBwc1BlcnNpc3RlbmNlTW9kZWwgfSBmcm9tICcuL2FwcHMtcGVyc2lzdGVuY2UtbW9kZWwnO1xuaW1wb3J0IHsgQXBwUmVhbExvZ3NTdG9yYWdlIH0gZnJvbSAnLi9sb2dzLXN0b3JhZ2UnO1xuaW1wb3J0IHsgQXBwUmVhbFN0b3JhZ2UgfSBmcm9tICcuL3N0b3JhZ2UnO1xuXG5leHBvcnQgeyBBcHBzTG9nc01vZGVsLCBBcHBzTW9kZWwsIEFwcHNQZXJzaXN0ZW5jZU1vZGVsLCBBcHBSZWFsTG9nc1N0b3JhZ2UsIEFwcFJlYWxTdG9yYWdlIH07XG4iLCJpbXBvcnQgeyBBcHBDb25zb2xlIH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL3NlcnZlci9sb2dnaW5nJztcbmltcG9ydCB7IEFwcExvZ1N0b3JhZ2UgfSBmcm9tICdAcm9ja2V0LmNoYXQvYXBwcy1lbmdpbmUvc2VydmVyL3N0b3JhZ2UnO1xuXG5leHBvcnQgY2xhc3MgQXBwUmVhbExvZ3NTdG9yYWdlIGV4dGVuZHMgQXBwTG9nU3RvcmFnZSB7XG5cdGNvbnN0cnVjdG9yKG1vZGVsKSB7XG5cdFx0c3VwZXIoJ21vbmdvZGInKTtcblx0XHR0aGlzLmRiID0gbW9kZWw7XG5cdH1cblxuXHRmaW5kKC4uLmFyZ3MpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0bGV0IGRvY3M7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGRvY3MgPSB0aGlzLmRiLmZpbmQoLi4uYXJncykuZmV0Y2goKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIHJlamVjdChlKTtcblx0XHRcdH1cblxuXHRcdFx0cmVzb2x2ZShkb2NzKTtcblx0XHR9KTtcblx0fVxuXG5cdHN0b3JlRW50cmllcyhhcHBJZCwgbG9nZ2VyKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGNvbnN0IGl0ZW0gPSBBcHBDb25zb2xlLnRvU3RvcmFnZUVudHJ5KGFwcElkLCBsb2dnZXIpO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCBpZCA9IHRoaXMuZGIuaW5zZXJ0KGl0ZW0pO1xuXG5cdFx0XHRcdHJlc29sdmUodGhpcy5kYi5maW5kT25lQnlJZChpZCkpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRnZXRFbnRyaWVzRm9yKGFwcElkKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGxldCBkb2NzO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRkb2NzID0gdGhpcy5kYi5maW5kKHsgYXBwSWQgfSkuZmV0Y2goKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIHJlamVjdChlKTtcblx0XHRcdH1cblxuXHRcdFx0cmVzb2x2ZShkb2NzKTtcblx0XHR9KTtcblx0fVxuXG5cdHJlbW92ZUVudHJpZXNGb3IoYXBwSWQpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dGhpcy5kYi5yZW1vdmUoeyBhcHBJZCB9KTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIHJlamVjdChlKTtcblx0XHRcdH1cblxuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH0pO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQXBwQWN0aXZhdGlvbkJyaWRnZSB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLm9yY2ggPSBvcmNoO1xuXHR9XG5cblx0YXN5bmMgYXBwQWRkZWQoYXBwKSB7XG5cdFx0YXdhaXQgdGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuYXBwQWRkZWQoYXBwLmdldElEKCkpO1xuXHR9XG5cblx0YXN5bmMgYXBwVXBkYXRlZChhcHApIHtcblx0XHRhd2FpdCB0aGlzLm9yY2guZ2V0Tm90aWZpZXIoKS5hcHBVcGRhdGVkKGFwcC5nZXRJRCgpKTtcblx0fVxuXG5cdGFzeW5jIGFwcFJlbW92ZWQoYXBwKSB7XG5cdFx0YXdhaXQgdGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuYXBwUmVtb3ZlZChhcHAuZ2V0SUQoKSk7XG5cdH1cblxuXHRhc3luYyBhcHBTdGF0dXNDaGFuZ2VkKGFwcCwgc3RhdHVzKSB7XG5cdFx0YXdhaXQgdGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuYXBwU3RhdHVzVXBkYXRlZChhcHAuZ2V0SUQoKSwgc3RhdHVzKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQXBwQnJpZGdlcyB9IGZyb20gJ0Byb2NrZXQuY2hhdC9hcHBzLWVuZ2luZS9zZXJ2ZXIvYnJpZGdlcyc7XG5cbmltcG9ydCB7IEFwcEFjdGl2YXRpb25CcmlkZ2UgfSBmcm9tICcuL2FjdGl2YXRpb24nO1xuaW1wb3J0IHsgQXBwRGV0YWlsQ2hhbmdlc0JyaWRnZSB9IGZyb20gJy4vZGV0YWlscyc7XG5pbXBvcnQgeyBBcHBDb21tYW5kc0JyaWRnZSB9IGZyb20gJy4vY29tbWFuZHMnO1xuaW1wb3J0IHsgQXBwRW52aXJvbm1lbnRhbFZhcmlhYmxlQnJpZGdlIH0gZnJvbSAnLi9lbnZpcm9ubWVudGFsJztcbmltcG9ydCB7IEFwcEh0dHBCcmlkZ2UgfSBmcm9tICcuL2h0dHAnO1xuaW1wb3J0IHsgQXBwTGlzdGVuZXJCcmlkZ2UgfSBmcm9tICcuL2xpc3RlbmVycyc7XG5pbXBvcnQgeyBBcHBNZXNzYWdlQnJpZGdlIH0gZnJvbSAnLi9tZXNzYWdlcyc7XG5pbXBvcnQgeyBBcHBQZXJzaXN0ZW5jZUJyaWRnZSB9IGZyb20gJy4vcGVyc2lzdGVuY2UnO1xuaW1wb3J0IHsgQXBwUm9vbUJyaWRnZSB9IGZyb20gJy4vcm9vbXMnO1xuaW1wb3J0IHsgQXBwU2V0dGluZ0JyaWRnZSB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHsgQXBwVXNlckJyaWRnZSB9IGZyb20gJy4vdXNlcnMnO1xuXG5leHBvcnQgY2xhc3MgUmVhbEFwcEJyaWRnZXMgZXh0ZW5kcyBBcHBCcmlkZ2VzIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLl9hY3RCcmlkZ2UgPSBuZXcgQXBwQWN0aXZhdGlvbkJyaWRnZShvcmNoKTtcblx0XHR0aGlzLl9jbWRCcmlkZ2UgPSBuZXcgQXBwQ29tbWFuZHNCcmlkZ2Uob3JjaCk7XG5cdFx0dGhpcy5fZGV0QnJpZGdlID0gbmV3IEFwcERldGFpbENoYW5nZXNCcmlkZ2Uob3JjaCk7XG5cdFx0dGhpcy5fZW52QnJpZGdlID0gbmV3IEFwcEVudmlyb25tZW50YWxWYXJpYWJsZUJyaWRnZShvcmNoKTtcblx0XHR0aGlzLl9odHRwQnJpZGdlID0gbmV3IEFwcEh0dHBCcmlkZ2UoKTtcblx0XHR0aGlzLl9saXNuQnJpZGdlID0gbmV3IEFwcExpc3RlbmVyQnJpZGdlKG9yY2gpO1xuXHRcdHRoaXMuX21zZ0JyaWRnZSA9IG5ldyBBcHBNZXNzYWdlQnJpZGdlKG9yY2gpO1xuXHRcdHRoaXMuX3BlcnNpc3RCcmlkZ2UgPSBuZXcgQXBwUGVyc2lzdGVuY2VCcmlkZ2Uob3JjaCk7XG5cdFx0dGhpcy5fcm9vbUJyaWRnZSA9IG5ldyBBcHBSb29tQnJpZGdlKG9yY2gpO1xuXHRcdHRoaXMuX3NldHNCcmlkZ2UgPSBuZXcgQXBwU2V0dGluZ0JyaWRnZShvcmNoKTtcblx0XHR0aGlzLl91c2VyQnJpZGdlID0gbmV3IEFwcFVzZXJCcmlkZ2Uob3JjaCk7XG5cdH1cblxuXHRnZXRDb21tYW5kQnJpZGdlKCkge1xuXHRcdHJldHVybiB0aGlzLl9jbWRCcmlkZ2U7XG5cdH1cblxuXHRnZXRFbnZpcm9ubWVudGFsVmFyaWFibGVCcmlkZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2VudkJyaWRnZTtcblx0fVxuXG5cdGdldEh0dHBCcmlkZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2h0dHBCcmlkZ2U7XG5cdH1cblxuXHRnZXRMaXN0ZW5lckJyaWRnZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbGlzbkJyaWRnZTtcblx0fVxuXG5cdGdldE1lc3NhZ2VCcmlkZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX21zZ0JyaWRnZTtcblx0fVxuXG5cdGdldFBlcnNpc3RlbmNlQnJpZGdlKCkge1xuXHRcdHJldHVybiB0aGlzLl9wZXJzaXN0QnJpZGdlO1xuXHR9XG5cblx0Z2V0QXBwQWN0aXZhdGlvbkJyaWRnZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fYWN0QnJpZGdlO1xuXHR9XG5cblx0Z2V0QXBwRGV0YWlsQ2hhbmdlc0JyaWRnZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fZGV0QnJpZGdlO1xuXHR9XG5cblx0Z2V0Um9vbUJyaWRnZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fcm9vbUJyaWRnZTtcblx0fVxuXG5cdGdldFNlcnZlclNldHRpbmdCcmlkZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NldHNCcmlkZ2U7XG5cdH1cblxuXHRnZXRVc2VyQnJpZGdlKCkge1xuXHRcdHJldHVybiB0aGlzLl91c2VyQnJpZGdlO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBTbGFzaENvbW1hbmRDb250ZXh0IH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL2RlZmluaXRpb24vc2xhc2hjb21tYW5kcyc7XG5pbXBvcnQgeyBVdGlsaXRpZXMgfSBmcm9tICcuLi8uLi9saWIvbWlzYy9VdGlsaXRpZXMnO1xuXG5leHBvcnQgY2xhc3MgQXBwQ29tbWFuZHNCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0XHR0aGlzLmRpc2FibGVkQ29tbWFuZHMgPSBuZXcgTWFwKCk7XG5cdH1cblxuXHRkb2VzQ29tbWFuZEV4aXN0KGNvbW1hbmQsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBjaGVja2luZyBpZiBcIiR7IGNvbW1hbmQgfVwiIGNvbW1hbmQgZXhpc3RzLmApO1xuXG5cdFx0aWYgKHR5cGVvZiBjb21tYW5kICE9PSAnc3RyaW5nJyB8fCBjb21tYW5kLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNtZCA9IGNvbW1hbmQudG9Mb3dlckNhc2UoKTtcblx0XHRyZXR1cm4gdHlwZW9mIFJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1tjbWRdID09PSAnb2JqZWN0JyB8fCB0aGlzLmRpc2FibGVkQ29tbWFuZHMuaGFzKGNtZCk7XG5cdH1cblxuXHRlbmFibGVDb21tYW5kKGNvbW1hbmQsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBhdHRlbXB0aW5nIHRvIGVuYWJsZSB0aGUgY29tbWFuZDogXCIkeyBjb21tYW5kIH1cImApO1xuXG5cdFx0aWYgKHR5cGVvZiBjb21tYW5kICE9PSAnc3RyaW5nJyB8fCBjb21tYW5kLnRyaW0oKS5sZW5ndGggPT09IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb21tYW5kIHBhcmFtZXRlciBwcm92aWRlZCwgbXVzdCBiZSBhIHN0cmluZy4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBjbWQgPSBjb21tYW5kLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKCF0aGlzLmRpc2FibGVkQ29tbWFuZHMuaGFzKGNtZCkpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVGhlIGNvbW1hbmQgaXMgbm90IGN1cnJlbnRseSBkaXNhYmxlZDogXCIkeyBjbWQgfVwiYCk7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF0gPSB0aGlzLmRpc2FibGVkQ29tbWFuZHMuZ2V0KGNtZCk7XG5cdFx0dGhpcy5kaXNhYmxlZENvbW1hbmRzLmRlbGV0ZShjbWQpO1xuXG5cdFx0dGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuY29tbWFuZFVwZGF0ZWQoY21kKTtcblx0fVxuXG5cdGRpc2FibGVDb21tYW5kKGNvbW1hbmQsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBhdHRlbXB0aW5nIHRvIGRpc2FibGUgdGhlIGNvbW1hbmQ6IFwiJHsgY29tbWFuZCB9XCJgKTtcblxuXHRcdGlmICh0eXBlb2YgY29tbWFuZCAhPT0gJ3N0cmluZycgfHwgY29tbWFuZC50cmltKCkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29tbWFuZCBwYXJhbWV0ZXIgcHJvdmlkZWQsIG11c3QgYmUgYSBzdHJpbmcuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY21kID0gY29tbWFuZC50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmICh0aGlzLmRpc2FibGVkQ29tbWFuZHMuaGFzKGNtZCkpIHtcblx0XHRcdC8vIFRoZSBjb21tYW5kIGlzIGFscmVhZHkgZGlzYWJsZWQsIG5vIG5lZWQgdG8gZGlzYWJsZSBpdCB5ZXQgYWdhaW5cblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIFJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1tjbWRdID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb21tYW5kIGRvZXMgbm90IGV4aXN0IGluIHRoZSBzeXN0ZW0gY3VycmVudGx5OiBcIiR7IGNtZCB9XCJgKTtcblx0XHR9XG5cblx0XHR0aGlzLmRpc2FibGVkQ29tbWFuZHMuc2V0KGNtZCwgUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF0pO1xuXHRcdGRlbGV0ZSBSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuY29tbWFuZHNbY21kXTtcblxuXHRcdHRoaXMub3JjaC5nZXROb3RpZmllcigpLmNvbW1hbmREaXNhYmxlZChjbWQpO1xuXHR9XG5cblx0Ly8gY29tbWFuZDogeyBjb21tYW5kLCBwYXJhbXNFeGFtcGxlLCBpMThuRGVzY3JpcHRpb24sIGV4ZWN1dG9yOiBmdW5jdGlvbiB9XG5cdG1vZGlmeUNvbW1hbmQoY29tbWFuZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGF0dGVtcHRpbmcgdG8gbW9kaWZ5IHRoZSBjb21tYW5kOiBcIiR7IGNvbW1hbmQgfVwiYCk7XG5cblx0XHR0aGlzLl92ZXJpZnlDb21tYW5kKGNvbW1hbmQpO1xuXG5cdFx0Y29uc3QgY21kID0gY29tbWFuZC50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmICh0eXBlb2YgUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF0gPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgZG9lcyBub3QgZXhpc3QgaW4gdGhlIHN5c3RlbSBjdXJyZW50bHkgKG9yIGl0IGlzIGRpc2FibGVkKTogXCIkeyBjbWQgfVwiYCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaXRlbSA9IFJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1tjbWRdO1xuXHRcdGl0ZW0ucGFyYW1zID0gY29tbWFuZC5wYXJhbXNFeGFtcGxlID8gY29tbWFuZC5wYXJhbXNFeGFtcGxlIDogaXRlbS5wYXJhbXM7XG5cdFx0aXRlbS5kZXNjcmlwdGlvbiA9IGNvbW1hbmQuaTE4bkRlc2NyaXB0aW9uID8gY29tbWFuZC5pMThuRGVzY3JpcHRpb24gOiBpdGVtLnBhcmFtcztcblx0XHRpdGVtLmNhbGxiYWNrID0gdGhpcy5fYXBwQ29tbWFuZEV4ZWN1dG9yLmJpbmQodGhpcyk7XG5cdFx0aXRlbS5wcm92aWRlc1ByZXZpZXcgPSBjb21tYW5kLnByb3ZpZGVzUHJldmlldztcblx0XHRpdGVtLnByZXZpZXdlciA9IGNvbW1hbmQucHJldmlld2VyID8gdGhpcy5fYXBwQ29tbWFuZFByZXZpZXdlci5iaW5kKHRoaXMpIDogaXRlbS5wcmV2aWV3ZXI7XG5cdFx0aXRlbS5wcmV2aWV3Q2FsbGJhY2sgPSBjb21tYW5kLmV4ZWN1dGVQcmV2aWV3SXRlbSA/IHRoaXMuX2FwcENvbW1hbmRQcmV2aWV3RXhlY3V0b3IuYmluZCh0aGlzKSA6IGl0ZW0ucHJldmlld0NhbGxiYWNrO1xuXG5cdFx0Um9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF0gPSBpdGVtO1xuXHRcdHRoaXMub3JjaC5nZXROb3RpZmllcigpLmNvbW1hbmRVcGRhdGVkKGNtZCk7XG5cdH1cblxuXHRyZWdpc3RlckNvbW1hbmQoY29tbWFuZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHJlZ2lzdGVyaW4gdGhlIGNvbW1hbmQ6IFwiJHsgY29tbWFuZC5jb21tYW5kIH1cImApO1xuXG5cdFx0dGhpcy5fdmVyaWZ5Q29tbWFuZChjb21tYW5kKTtcblxuXHRcdGNvbnN0IGl0ZW0gPSB7XG5cdFx0XHRjb21tYW5kOiBjb21tYW5kLmNvbW1hbmQudG9Mb3dlckNhc2UoKSxcblx0XHRcdHBhcmFtczogVXRpbGl0aWVzLmdldEkxOG5LZXlGb3JBcHAoY29tbWFuZC5pMThuUGFyYW1zRXhhbXBsZSwgYXBwSWQpLFxuXHRcdFx0ZGVzY3JpcHRpb246IFV0aWxpdGllcy5nZXRJMThuS2V5Rm9yQXBwKGNvbW1hbmQuaTE4bkRlc2NyaXB0aW9uLCBhcHBJZCksXG5cdFx0XHRjYWxsYmFjazogdGhpcy5fYXBwQ29tbWFuZEV4ZWN1dG9yLmJpbmQodGhpcyksXG5cdFx0XHRwcm92aWRlc1ByZXZpZXc6IGNvbW1hbmQucHJvdmlkZXNQcmV2aWV3LFxuXHRcdFx0cHJldmlld2VyOiAhY29tbWFuZC5wcmV2aWV3ZXIgPyB1bmRlZmluZWQgOiB0aGlzLl9hcHBDb21tYW5kUHJldmlld2VyLmJpbmQodGhpcyksXG5cdFx0XHRwcmV2aWV3Q2FsbGJhY2s6ICFjb21tYW5kLmV4ZWN1dGVQcmV2aWV3SXRlbSA/IHVuZGVmaW5lZCA6IHRoaXMuX2FwcENvbW1hbmRQcmV2aWV3RXhlY3V0b3IuYmluZCh0aGlzKSxcblx0XHR9O1xuXG5cdFx0Um9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NvbW1hbmQuY29tbWFuZC50b0xvd2VyQ2FzZSgpXSA9IGl0ZW07XG5cdFx0dGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuY29tbWFuZEFkZGVkKGNvbW1hbmQuY29tbWFuZC50b0xvd2VyQ2FzZSgpKTtcblx0fVxuXG5cdHVucmVnaXN0ZXJDb21tYW5kKGNvbW1hbmQsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyB1bnJlZ2lzdGVyaW5nIHRoZSBjb21tYW5kOiBcIiR7IGNvbW1hbmQgfVwiYCk7XG5cblx0XHRpZiAodHlwZW9mIGNvbW1hbmQgIT09ICdzdHJpbmcnIHx8IGNvbW1hbmQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbW1hbmQgcGFyYW1ldGVyIHByb3ZpZGVkLCBtdXN0IGJlIGEgc3RyaW5nLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNtZCA9IGNvbW1hbmQudG9Mb3dlckNhc2UoKTtcblx0XHR0aGlzLmRpc2FibGVkQ29tbWFuZHMuZGVsZXRlKGNtZCk7XG5cdFx0ZGVsZXRlIFJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1tjbWRdO1xuXG5cdFx0dGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuY29tbWFuZFJlbW92ZWQoY21kKTtcblx0fVxuXG5cdF92ZXJpZnlDb21tYW5kKGNvbW1hbmQpIHtcblx0XHRpZiAodHlwZW9mIGNvbW1hbmQgIT09ICdvYmplY3QnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgU2xhc2ggQ29tbWFuZCBwYXJhbWV0ZXIgcHJvdmlkZWQsIGl0IG11c3QgYmUgYSB2YWxpZCBJU2xhc2hDb21tYW5kIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIGNvbW1hbmQuY29tbWFuZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBTbGFzaCBDb21tYW5kIHBhcmFtZXRlciBwcm92aWRlZCwgaXQgbXVzdCBiZSBhIHZhbGlkIElTbGFzaENvbW1hbmQgb2JqZWN0LicpO1xuXHRcdH1cblxuXHRcdGlmIChjb21tYW5kLmkxOG5QYXJhbXNFeGFtcGxlICYmIHR5cGVvZiBjb21tYW5kLmkxOG5QYXJhbXNFeGFtcGxlICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNsYXNoIENvbW1hbmQgcGFyYW1ldGVyIHByb3ZpZGVkLCBpdCBtdXN0IGJlIGEgdmFsaWQgSVNsYXNoQ29tbWFuZCBvYmplY3QuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKGNvbW1hbmQuaTE4bkRlc2NyaXB0aW9uICYmIHR5cGVvZiBjb21tYW5kLmkxOG5EZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBTbGFzaCBDb21tYW5kIHBhcmFtZXRlciBwcm92aWRlZCwgaXQgbXVzdCBiZSBhIHZhbGlkIElTbGFzaENvbW1hbmQgb2JqZWN0LicpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgY29tbWFuZC5wcm92aWRlc1ByZXZpZXcgIT09ICdib29sZWFuJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNsYXNoIENvbW1hbmQgcGFyYW1ldGVyIHByb3ZpZGVkLCBpdCBtdXN0IGJlIGEgdmFsaWQgSVNsYXNoQ29tbWFuZCBvYmplY3QuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBjb21tYW5kLmV4ZWN1dG9yICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgU2xhc2ggQ29tbWFuZCBwYXJhbWV0ZXIgcHJvdmlkZWQsIGl0IG11c3QgYmUgYSB2YWxpZCBJU2xhc2hDb21tYW5kIG9iamVjdC4nKTtcblx0XHR9XG5cdH1cblxuXHRfYXBwQ29tbWFuZEV4ZWN1dG9yKGNvbW1hbmQsIHBhcmFtZXRlcnMsIG1lc3NhZ2UpIHtcblx0XHRjb25zdCB1c2VyID0gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3VzZXJzJykuY29udmVydEJ5SWQoTWV0ZW9yLnVzZXJJZCgpKTtcblx0XHRjb25zdCByb29tID0gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3Jvb21zJykuY29udmVydEJ5SWQobWVzc2FnZS5yaWQpO1xuXHRcdGNvbnN0IHBhcmFtcyA9IHBhcmFtZXRlcnMubGVuZ3RoID09PSAwIHx8IHBhcmFtZXRlcnMgPT09ICcgJyA/IFtdIDogcGFyYW1ldGVycy5zcGxpdCgnICcpO1xuXG5cdFx0Y29uc3QgY29udGV4dCA9IG5ldyBTbGFzaENvbW1hbmRDb250ZXh0KE9iamVjdC5mcmVlemUodXNlciksIE9iamVjdC5mcmVlemUocm9vbSksIE9iamVjdC5mcmVlemUocGFyYW1zKSk7XG5cdFx0UHJvbWlzZS5hd2FpdCh0aGlzLm9yY2guZ2V0TWFuYWdlcigpLmdldENvbW1hbmRNYW5hZ2VyKCkuZXhlY3V0ZUNvbW1hbmQoY29tbWFuZCwgY29udGV4dCkpO1xuXHR9XG5cblx0X2FwcENvbW1hbmRQcmV2aWV3ZXIoY29tbWFuZCwgcGFyYW1ldGVycywgbWVzc2FnZSkge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgndXNlcnMnKS5jb252ZXJ0QnlJZChNZXRlb3IudXNlcklkKCkpO1xuXHRcdGNvbnN0IHJvb20gPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QnlJZChtZXNzYWdlLnJpZCk7XG5cdFx0Y29uc3QgcGFyYW1zID0gcGFyYW1ldGVycy5sZW5ndGggPT09IDAgfHwgcGFyYW1ldGVycyA9PT0gJyAnID8gW10gOiBwYXJhbWV0ZXJzLnNwbGl0KCcgJyk7XG5cblx0XHRjb25zdCBjb250ZXh0ID0gbmV3IFNsYXNoQ29tbWFuZENvbnRleHQoT2JqZWN0LmZyZWV6ZSh1c2VyKSwgT2JqZWN0LmZyZWV6ZShyb29tKSwgT2JqZWN0LmZyZWV6ZShwYXJhbXMpKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5hd2FpdCh0aGlzLm9yY2guZ2V0TWFuYWdlcigpLmdldENvbW1hbmRNYW5hZ2VyKCkuZ2V0UHJldmlld3MoY29tbWFuZCwgY29udGV4dCkpO1xuXHR9XG5cblx0X2FwcENvbW1hbmRQcmV2aWV3RXhlY3V0b3IoY29tbWFuZCwgcGFyYW1ldGVycywgbWVzc2FnZSwgcHJldmlldykge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgndXNlcnMnKS5jb252ZXJ0QnlJZChNZXRlb3IudXNlcklkKCkpO1xuXHRcdGNvbnN0IHJvb20gPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QnlJZChtZXNzYWdlLnJpZCk7XG5cdFx0Y29uc3QgcGFyYW1zID0gcGFyYW1ldGVycy5sZW5ndGggPT09IDAgfHwgcGFyYW1ldGVycyA9PT0gJyAnID8gW10gOiBwYXJhbWV0ZXJzLnNwbGl0KCcgJyk7XG5cblx0XHRjb25zdCBjb250ZXh0ID0gbmV3IFNsYXNoQ29tbWFuZENvbnRleHQoT2JqZWN0LmZyZWV6ZSh1c2VyKSwgT2JqZWN0LmZyZWV6ZShyb29tKSwgT2JqZWN0LmZyZWV6ZShwYXJhbXMpKTtcblx0XHRQcm9taXNlLmF3YWl0KHRoaXMub3JjaC5nZXRNYW5hZ2VyKCkuZ2V0Q29tbWFuZE1hbmFnZXIoKS5leGVjdXRlUHJldmlldyhjb21tYW5kLCBwcmV2aWV3LCBjb250ZXh0KSk7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBBcHBFbnZpcm9ubWVudGFsVmFyaWFibGVCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0XHR0aGlzLmFsbG93ZWQgPSBbJ05PREVfRU5WJywgJ1JPT1RfVVJMJywgJ0lOU1RBTkNFX0lQJ107XG5cdH1cblxuXHRhc3luYyBnZXRWYWx1ZUJ5TmFtZShlbnZWYXJOYW1lLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgZW52aXJvbm1lbnRhbCB2YXJpYWJsZSB2YWx1ZSAkeyBlbnZWYXJOYW1lIH0uYCk7XG5cblx0XHRpZiAodGhpcy5pc1JlYWRhYmxlKGVudlZhck5hbWUsIGFwcElkKSkge1xuXHRcdFx0cmV0dXJuIHByb2Nlc3MuZW52W2VudlZhck5hbWVdO1xuXHRcdH1cblxuXHRcdHRocm93IG5ldyBFcnJvcihgVGhlIGVudmlyb25tZW50YWwgdmFyaWFibGUgXCIkeyBlbnZWYXJOYW1lIH1cIiBpcyBub3QgcmVhZGFibGUuYCk7XG5cdH1cblxuXHRhc3luYyBpc1JlYWRhYmxlKGVudlZhck5hbWUsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBjaGVja2luZyBpZiB0aGUgZW52aXJvbm1lbnRhbCB2YXJpYWJsZSBpcyByZWFkYWJsZSAkeyBlbnZWYXJOYW1lIH0uYCk7XG5cblx0XHRyZXR1cm4gdGhpcy5hbGxvd2VkLmluY2x1ZGVzKGVudlZhck5hbWUudG9VcHBlckNhc2UoKSk7XG5cdH1cblxuXHRhc3luYyBpc1NldChlbnZWYXJOYW1lLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgY2hlY2tpbmcgaWYgdGhlIGVudmlyb25tZW50YWwgdmFyaWFibGUgaXMgc2V0ICR7IGVudlZhck5hbWUgfS5gKTtcblxuXHRcdGlmICh0aGlzLmlzUmVhZGFibGUoZW52VmFyTmFtZSwgYXBwSWQpKSB7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIHByb2Nlc3MuZW52W2VudlZhck5hbWVdICE9PSAndW5kZWZpbmVkJztcblx0XHR9XG5cblx0XHR0aHJvdyBuZXcgRXJyb3IoYFRoZSBlbnZpcm9ubWVudGFsIHZhcmlhYmxlIFwiJHsgZW52VmFyTmFtZSB9XCIgaXMgbm90IHJlYWRhYmxlLmApO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQXBwTWVzc2FnZUJyaWRnZSB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLm9yY2ggPSBvcmNoO1xuXHR9XG5cblx0YXN5bmMgY3JlYXRlKG1lc3NhZ2UsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBjcmVhdGluZyBhIG5ldyBtZXNzYWdlLmApO1xuXG5cdFx0bGV0IG1zZyA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdtZXNzYWdlcycpLmNvbnZlcnRBcHBNZXNzYWdlKG1lc3NhZ2UpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcihtc2cudS5faWQsICgpID0+IHtcblx0XHRcdG1zZyA9IE1ldGVvci5jYWxsKCdzZW5kTWVzc2FnZScsIG1zZyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gbXNnLl9pZDtcblx0fVxuXG5cdGFzeW5jIGdldEJ5SWQobWVzc2FnZUlkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgbWVzc2FnZTogXCIkeyBtZXNzYWdlSWQgfVwiYCk7XG5cblx0XHRyZXR1cm4gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ21lc3NhZ2VzJykuY29udmVydEJ5SWQobWVzc2FnZUlkKTtcblx0fVxuXG5cdGFzeW5jIHVwZGF0ZShtZXNzYWdlLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgdXBkYXRpbmcgYSBtZXNzYWdlLmApO1xuXG5cdFx0aWYgKCFtZXNzYWdlLmVkaXRvcikge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGVkaXRvciBhc3NpZ25lZCB0byB0aGUgbWVzc2FnZSBmb3IgdGhlIHVwZGF0ZS4nKTtcblx0XHR9XG5cblx0XHRpZiAoIW1lc3NhZ2UuaWQgfHwgIVJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKG1lc3NhZ2UuaWQpKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0EgbWVzc2FnZSBtdXN0IGV4aXN0IHRvIHVwZGF0ZS4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgnbWVzc2FnZXMnKS5jb252ZXJ0QXBwTWVzc2FnZShtZXNzYWdlKTtcblx0XHRjb25zdCBlZGl0b3IgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChtZXNzYWdlLmVkaXRvci5pZCk7XG5cblx0XHRSb2NrZXRDaGF0LnVwZGF0ZU1lc3NhZ2UobXNnLCBlZGl0b3IpO1xuXHR9XG5cblx0YXN5bmMgbm90aWZ5VXNlcih1c2VyLCBtZXNzYWdlLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgbm90aWZ5aW5nIGEgdXNlci5gKTtcblxuXHRcdGNvbnN0IG1zZyA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdtZXNzYWdlcycpLmNvbnZlcnRBcHBNZXNzYWdlKG1lc3NhZ2UpO1xuXG5cdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeVVzZXIodXNlci5pZCwgJ21lc3NhZ2UnLCBPYmplY3QuYXNzaWduKG1zZywge1xuXHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0dTogdW5kZWZpbmVkLFxuXHRcdFx0ZWRpdG9yOiB1bmRlZmluZWQsXG5cdFx0fSkpO1xuXHR9XG5cblx0YXN5bmMgbm90aWZ5Um9vbShyb29tLCBtZXNzYWdlLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgbm90aWZ5aW5nIGEgcm9vbSdzIHVzZXJzLmApO1xuXG5cdFx0aWYgKHJvb20pIHtcblx0XHRcdGNvbnN0IG1zZyA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdtZXNzYWdlcycpLmNvbnZlcnRBcHBNZXNzYWdlKG1lc3NhZ2UpO1xuXHRcdFx0Y29uc3Qgcm1zZyA9IE9iamVjdC5hc3NpZ24obXNnLCB7XG5cdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdHJpZDogcm9vbS5pZCxcblx0XHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHRcdHU6IHVuZGVmaW5lZCxcblx0XHRcdFx0ZWRpdG9yOiB1bmRlZmluZWQsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgdXNlcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVJvb21JZFdoZW5Vc2VySWRFeGlzdHMocm9vbS5faWQsIHsgZmllbGRzOiB7ICd1Ll9pZCc6IDEgfSB9KVxuXHRcdFx0XHQuZmV0Y2goKVxuXHRcdFx0XHQubWFwKChzKSA9PiBzLnUuX2lkKTtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRCeUlkcyh1c2VycywgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSlcblx0XHRcdFx0LmZldGNoKClcblx0XHRcdFx0LmZvckVhY2goKHsgX2lkIH0pID0+XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeVVzZXIoX2lkLCAnbWVzc2FnZScsIHJtc2cpXG5cdFx0XHRcdCk7XG5cdFx0fVxuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQXBwUGVyc2lzdGVuY2VCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0fVxuXG5cdGFzeW5jIHB1cmdlKGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAncyBwZXJzaXN0ZW50IHN0b3JhZ2UgaXMgYmVpbmcgcHVyZ2VkOiAkeyBhcHBJZCB9YCk7XG5cblx0XHR0aGlzLm9yY2guZ2V0UGVyc2lzdGVuY2VNb2RlbCgpLnJlbW92ZSh7IGFwcElkIH0pO1xuXHR9XG5cblx0YXN5bmMgY3JlYXRlKGRhdGEsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBzdG9yaW5nIGEgbmV3IG9iamVjdCBpbiB0aGVpciBwZXJzaXN0ZW5jZS5gLCBkYXRhKTtcblxuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignQXR0ZW1wdGVkIHRvIHN0b3JlIGFuIGludmFsaWQgZGF0YSB0eXBlLCBpdCBtdXN0IGJlIGFuIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5vcmNoLmdldFBlcnNpc3RlbmNlTW9kZWwoKS5pbnNlcnQoeyBhcHBJZCwgZGF0YSB9KTtcblx0fVxuXG5cdGFzeW5jIGNyZWF0ZVdpdGhBc3NvY2lhdGlvbnMoZGF0YSwgYXNzb2NpYXRpb25zLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgc3RvcmluZyBhIG5ldyBvYmplY3QgaW4gdGhlaXIgcGVyc2lzdGVuY2UgdGhhdCBpcyBhc3NvY2lhdGVkIHdpdGggc29tZSBtb2RlbHMuYCwgZGF0YSwgYXNzb2NpYXRpb25zKTtcblxuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignQXR0ZW1wdGVkIHRvIHN0b3JlIGFuIGludmFsaWQgZGF0YSB0eXBlLCBpdCBtdXN0IGJlIGFuIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5vcmNoLmdldFBlcnNpc3RlbmNlTW9kZWwoKS5pbnNlcnQoeyBhcHBJZCwgYXNzb2NpYXRpb25zLCBkYXRhIH0pO1xuXHR9XG5cblx0YXN5bmMgcmVhZEJ5SWQoaWQsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyByZWFkaW5nIHRoZWlyIGRhdGEgaW4gdGhlaXIgcGVyc2lzdGVuY2Ugd2l0aCB0aGUgaWQ6IFwiJHsgaWQgfVwiYCk7XG5cblx0XHRjb25zdCByZWNvcmQgPSB0aGlzLm9yY2guZ2V0UGVyc2lzdGVuY2VNb2RlbCgpLmZpbmRPbmVCeUlkKGlkKTtcblxuXHRcdHJldHVybiByZWNvcmQuZGF0YTtcblx0fVxuXG5cdGFzeW5jIHJlYWRCeUFzc29jaWF0aW9ucyhhc3NvY2lhdGlvbnMsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBzZWFyY2hpbmcgZm9yIHJlY29yZHMgdGhhdCBhcmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBmb2xsb3dpbmc6YCwgYXNzb2NpYXRpb25zKTtcblxuXHRcdGNvbnN0IHJlY29yZHMgPSB0aGlzLm9yY2guZ2V0UGVyc2lzdGVuY2VNb2RlbCgpLmZpbmQoe1xuXHRcdFx0YXBwSWQsXG5cdFx0XHRhc3NvY2lhdGlvbnM6IHsgJGFsbDogYXNzb2NpYXRpb25zIH0sXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBBcnJheS5pc0FycmF5KHJlY29yZHMpID8gcmVjb3Jkcy5tYXAoKHIpID0+IHIuZGF0YSkgOiBbXTtcblx0fVxuXG5cdGFzeW5jIHJlbW92ZShpZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHJlbW92aW5nIG9uZSBvZiB0aGVpciByZWNvcmRzIGJ5IHRoZSBpZDogXCIkeyBpZCB9XCJgKTtcblxuXHRcdGNvbnN0IHJlY29yZCA9IHRoaXMub3JjaC5nZXRQZXJzaXN0ZW5jZU1vZGVsKCkuZmluZE9uZSh7IF9pZDogaWQsIGFwcElkIH0pO1xuXG5cdFx0aWYgKCFyZWNvcmQpIHtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0dGhpcy5vcmNoLmdldFBlcnNpc3RlbmNlTW9kZWwoKS5yZW1vdmUoeyBfaWQ6IGlkLCBhcHBJZCB9KTtcblxuXHRcdHJldHVybiByZWNvcmQuZGF0YTtcblx0fVxuXG5cdGFzeW5jIHJlbW92ZUJ5QXNzb2NpYXRpb25zKGFzc29jaWF0aW9ucywgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHJlbW92aW5nIHJlY29yZHMgd2l0aCB0aGUgZm9sbG93aW5nIGFzc29jaWF0aW9uczpgLCBhc3NvY2lhdGlvbnMpO1xuXG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRhcHBJZCxcblx0XHRcdGFzc29jaWF0aW9uczoge1xuXHRcdFx0XHQkYWxsOiBhc3NvY2lhdGlvbnMsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRjb25zdCByZWNvcmRzID0gdGhpcy5vcmNoLmdldFBlcnNpc3RlbmNlTW9kZWwoKS5maW5kKHF1ZXJ5KS5mZXRjaCgpO1xuXG5cdFx0aWYgKCFyZWNvcmRzKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdHRoaXMub3JjaC5nZXRQZXJzaXN0ZW5jZU1vZGVsKCkucmVtb3ZlKHF1ZXJ5KTtcblxuXHRcdHJldHVybiBBcnJheS5pc0FycmF5KHJlY29yZHMpID8gcmVjb3Jkcy5tYXAoKHIpID0+IHIuZGF0YSkgOiBbXTtcblx0fVxuXG5cdGFzeW5jIHVwZGF0ZShpZCwgZGF0YSwgdXBzZXJ0LCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgdXBkYXRpbmcgdGhlIHJlY29yZCBcIiR7IGlkIH1cIiB0bzpgLCBkYXRhKTtcblxuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignQXR0ZW1wdGVkIHRvIHN0b3JlIGFuIGludmFsaWQgZGF0YSB0eXBlLCBpdCBtdXN0IGJlIGFuIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZC4nKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgUm9vbVR5cGUgfSBmcm9tICdAcm9ja2V0LmNoYXQvYXBwcy1lbmdpbmUvZGVmaW5pdGlvbi9yb29tcyc7XG5cbmV4cG9ydCBjbGFzcyBBcHBSb29tQnJpZGdlIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHRoaXMub3JjaCA9IG9yY2g7XG5cdH1cblxuXHRhc3luYyBjcmVhdGUocm9vbSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGNyZWF0aW5nIGEgbmV3IHJvb20uYCwgcm9vbSk7XG5cblx0XHRjb25zdCByY1Jvb20gPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QXBwUm9vbShyb29tKTtcblx0XHRsZXQgbWV0aG9kO1xuXG5cdFx0c3dpdGNoIChyb29tLnR5cGUpIHtcblx0XHRcdGNhc2UgUm9vbVR5cGUuQ0hBTk5FTDpcblx0XHRcdFx0bWV0aG9kID0gJ2NyZWF0ZUNoYW5uZWwnO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgUm9vbVR5cGUuUFJJVkFURV9HUk9VUDpcblx0XHRcdFx0bWV0aG9kID0gJ2NyZWF0ZVByaXZhdGVHcm91cCc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdPbmx5IGNoYW5uZWxzIGFuZCBwcml2YXRlIGdyb3VwcyBjYW4gYmUgY3JlYXRlZC4nKTtcblx0XHR9XG5cblx0XHRsZXQgcmlkO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIocm9vbS5jcmVhdG9yLmlkLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBpbmZvID0gTWV0ZW9yLmNhbGwobWV0aG9kLCByY1Jvb20ubWVtYmVycyk7XG5cdFx0XHRyaWQgPSBpbmZvLnJpZDtcblx0XHR9KTtcblxuXHRcdHJldHVybiByaWQ7XG5cdH1cblxuXHRhc3luYyBnZXRCeUlkKHJvb21JZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGdldHRpbmcgdGhlIHJvb21CeUlkOiBcIiR7IHJvb21JZCB9XCJgKTtcblxuXHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QnlJZChyb29tSWQpO1xuXHR9XG5cblx0YXN5bmMgZ2V0QnlOYW1lKHJvb21OYW1lLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgcm9vbUJ5TmFtZTogXCIkeyByb29tTmFtZSB9XCJgKTtcblxuXHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QnlOYW1lKHJvb21OYW1lKTtcblx0fVxuXG5cdGFzeW5jIGdldENyZWF0b3JCeUlkKHJvb21JZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGdldHRpbmcgdGhlIHJvb20ncyBjcmVhdG9yIGJ5IGlkOiBcIiR7IHJvb21JZCB9XCJgKTtcblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXG5cdFx0aWYgKCFyb29tIHx8ICFyb29tLnUgfHwgIXJvb20udS5faWQpIHtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCd1c2VycycpLmNvbnZlcnRCeUlkKHJvb20udS5faWQpO1xuXHR9XG5cblx0YXN5bmMgZ2V0Q3JlYXRvckJ5TmFtZShyb29tTmFtZSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGdldHRpbmcgdGhlIHJvb20ncyBjcmVhdG9yIGJ5IG5hbWU6IFwiJHsgcm9vbU5hbWUgfVwiYCk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShyb29tTmFtZSk7XG5cblx0XHRpZiAoIXJvb20gfHwgIXJvb20udSB8fCAhcm9vbS51Ll9pZCkge1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3VzZXJzJykuY29udmVydEJ5SWQocm9vbS51Ll9pZCk7XG5cdH1cblxuXHRhc3luYyB1cGRhdGUocm9vbSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHVwZGF0aW5nIGEgcm9vbS5gKTtcblxuXHRcdGlmICghcm9vbS5pZCB8fCBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tLmlkKSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdBIHJvb20gbXVzdCBleGlzdCB0byB1cGRhdGUuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm0gPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QXBwUm9vbShyb29tKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZShybS5faWQsIHJtKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIEFwcFNldHRpbmdCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0XHR0aGlzLmFsbG93ZWRHcm91cHMgPSBbXTtcblx0XHR0aGlzLmRpc2FsbG93ZWRTZXR0aW5ncyA9IFtcblx0XHRcdCdBY2NvdW50c19SZWdpc3RyYXRpb25Gb3JtX1NlY3JldFVSTCcsICdDUk9XRF9BUFBfVVNFUk5BTUUnLCAnQ1JPV0RfQVBQX1BBU1NXT1JEJywgJ0RpcmVjdF9SZXBseV9Vc2VybmFtZScsXG5cdFx0XHQnRGlyZWN0X1JlcGx5X1Bhc3N3b3JkJywgJ1NNVFBfVXNlcm5hbWUnLCAnU01UUF9QYXNzd29yZCcsICdGaWxlVXBsb2FkX1MzX0FXU0FjY2Vzc0tleUlkJywgJ0ZpbGVVcGxvYWRfUzNfQVdTU2VjcmV0QWNjZXNzS2V5Jyxcblx0XHRcdCdGaWxlVXBsb2FkX1MzX0J1Y2tldFVSTCcsICdGaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfQnVja2V0JywgJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9BY2Nlc3NJZCcsXG5cdFx0XHQnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX1NlY3JldCcsICdHb29nbGVWaXNpb25fU2VydmljZUFjY291bnQnLCAnQWxsb3dfSW52YWxpZF9TZWxmU2lnbmVkX0NlcnRzJywgJ0dvb2dsZVRhZ01hbmFnZXJfaWQnLFxuXHRcdFx0J0J1Z3NuYWdfYXBpX2tleScsICdMREFQX0NBX0NlcnQnLCAnTERBUF9SZWplY3RfVW5hdXRob3JpemVkJywgJ0xEQVBfRG9tYWluX1NlYXJjaF9Vc2VyJywgJ0xEQVBfRG9tYWluX1NlYXJjaF9QYXNzd29yZCcsXG5cdFx0XHQnTGl2ZWNoYXRfc2VjcmV0X3Rva2VuJywgJ0xpdmVjaGF0X0tub3dsZWRnZV9BcGlhaV9LZXknLCAnQXV0b1RyYW5zbGF0ZV9Hb29nbGVBUElLZXknLCAnTWFwVmlld19HTWFwc0FQSUtleScsXG5cdFx0XHQnTWV0YV9mYl9hcHBfaWQnLCAnTWV0YV9nb29nbGUtc2l0ZS12ZXJpZmljYXRpb24nLCAnTWV0YV9tc3ZhbGlkYXRlMDEnLCAnQWNjb3VudHNfT0F1dGhfRG9scGhpbl9zZWNyZXQnLFxuXHRcdFx0J0FjY291bnRzX09BdXRoX0RydXBhbF9zZWNyZXQnLCAnQWNjb3VudHNfT0F1dGhfRmFjZWJvb2tfc2VjcmV0JywgJ0FjY291bnRzX09BdXRoX0dpdGh1Yl9zZWNyZXQnLCAnQVBJX0dpdEh1Yl9FbnRlcnByaXNlX1VSTCcsXG5cdFx0XHQnQWNjb3VudHNfT0F1dGhfR2l0SHViX0VudGVycHJpc2Vfc2VjcmV0JywgJ0FQSV9HaXRsYWJfVVJMJywgJ0FjY291bnRzX09BdXRoX0dpdGxhYl9zZWNyZXQnLCAnQWNjb3VudHNfT0F1dGhfR29vZ2xlX3NlY3JldCcsXG5cdFx0XHQnQWNjb3VudHNfT0F1dGhfTGlua2VkaW5fc2VjcmV0JywgJ0FjY291bnRzX09BdXRoX01ldGVvcl9zZWNyZXQnLCAnQWNjb3VudHNfT0F1dGhfVHdpdHRlcl9zZWNyZXQnLCAnQVBJX1dvcmRwcmVzc19VUkwnLFxuXHRcdFx0J0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19zZWNyZXQnLCAnUHVzaF9hcG5fcGFzc3BocmFzZScsICdQdXNoX2Fwbl9rZXknLCAnUHVzaF9hcG5fY2VydCcsICdQdXNoX2Fwbl9kZXZfcGFzc3BocmFzZScsXG5cdFx0XHQnUHVzaF9hcG5fZGV2X2tleScsICdQdXNoX2Fwbl9kZXZfY2VydCcsICdQdXNoX2djbV9hcGlfa2V5JywgJ1B1c2hfZ2NtX3Byb2plY3RfbnVtYmVyJywgJ1NBTUxfQ3VzdG9tX0RlZmF1bHRfY2VydCcsXG5cdFx0XHQnU0FNTF9DdXN0b21fRGVmYXVsdF9wcml2YXRlX2tleScsICdTbGFja0JyaWRnZV9BUElUb2tlbicsICdTbWFyc2hfRW1haWwnLCAnU01TX1R3aWxpb19BY2NvdW50X1NJRCcsICdTTVNfVHdpbGlvX2F1dGhUb2tlbicsXG5cdFx0XTtcblx0fVxuXG5cdGFzeW5jIGdldEFsbChhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyBhbGwgdGhlIHNldHRpbmdzLmApO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmQoeyBfaWQ6IHsgJG5pbjogdGhpcy5kaXNhbGxvd2VkU2V0dGluZ3MgfSB9KVxuXHRcdFx0LmZldGNoKClcblx0XHRcdC5tYXAoKHMpID0+IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdzZXR0aW5ncycpLmNvbnZlcnRUb0FwcChzKSk7XG5cdH1cblxuXHRhc3luYyBnZXRPbmVCeUlkKGlkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgc2V0dGluZyBieSBpZCAkeyBpZCB9LmApO1xuXG5cdFx0aWYgKCF0aGlzLmlzUmVhZGFibGVCeUlkKGlkLCBhcHBJZCkpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVGhlIHNldHRpbmcgXCIkeyBpZCB9XCIgaXMgbm90IHJlYWRhYmxlLmApO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgnc2V0dGluZ3MnKS5jb252ZXJ0QnlJZChpZCk7XG5cdH1cblxuXHRhc3luYyBoaWRlR3JvdXAobmFtZSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGhpZGRpbmcgdGhlIGdyb3VwICR7IG5hbWUgfS5gKTtcblxuXHRcdHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcblx0fVxuXG5cdGFzeW5jIGhpZGVTZXR0aW5nKGlkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgaGlkZGluZyB0aGUgc2V0dGluZyAkeyBpZCB9LmApO1xuXG5cdFx0aWYgKCF0aGlzLmlzUmVhZGFibGVCeUlkKGlkLCBhcHBJZCkpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVGhlIHNldHRpbmcgXCIkeyBpZCB9XCIgaXMgbm90IHJlYWRhYmxlLmApO1xuXHRcdH1cblxuXHRcdHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcblx0fVxuXG5cdGFzeW5jIGlzUmVhZGFibGVCeUlkKGlkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgY2hlY2tpbmcgaWYgdGhleSBjYW4gcmVhZCB0aGUgc2V0dGluZyAkeyBpZCB9LmApO1xuXG5cdFx0cmV0dXJuICF0aGlzLmRpc2FsbG93ZWRTZXR0aW5ncy5pbmNsdWRlcyhpZCk7XG5cdH1cblxuXHRhc3luYyB1cGRhdGVPbmUoc2V0dGluZywgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHVwZGF0aW5nIHRoZSBzZXR0aW5nICR7IHNldHRpbmcuaWQgfSAuYCk7XG5cblx0XHRpZiAoIXRoaXMuaXNSZWFkYWJsZUJ5SWQoc2V0dGluZy5pZCwgYXBwSWQpKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFRoZSBzZXR0aW5nIFwiJHsgc2V0dGluZy5pZCB9XCIgaXMgbm90IHJlYWRhYmxlLmApO1xuXHRcdH1cblxuXHRcdHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIEFwcFVzZXJCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0fVxuXG5cdGFzeW5jIGdldEJ5SWQodXNlcklkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgdXNlcklkOiBcIiR7IHVzZXJJZCB9XCJgKTtcblxuXHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgndXNlcnMnKS5jb252ZXJ0QnlJZCh1c2VySWQpO1xuXHR9XG5cblx0YXN5bmMgZ2V0QnlVc2VybmFtZSh1c2VybmFtZSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGdldHRpbmcgdGhlIHVzZXJuYW1lOiBcIiR7IHVzZXJuYW1lIH1cImApO1xuXG5cdFx0cmV0dXJuIHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCd1c2VycycpLmNvbnZlcnRCeVVzZXJuYW1lKHVzZXJuYW1lKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgUmVhbEFwcEJyaWRnZXMgfSBmcm9tICcuL2JyaWRnZXMnO1xuaW1wb3J0IHsgQXBwQWN0aXZhdGlvbkJyaWRnZSB9IGZyb20gJy4vYWN0aXZhdGlvbic7XG5pbXBvcnQgeyBBcHBDb21tYW5kc0JyaWRnZSB9IGZyb20gJy4vY29tbWFuZHMnO1xuaW1wb3J0IHsgQXBwRW52aXJvbm1lbnRhbFZhcmlhYmxlQnJpZGdlIH0gZnJvbSAnLi9lbnZpcm9ubWVudGFsJztcbmltcG9ydCB7IEFwcEh0dHBCcmlkZ2UgfSBmcm9tICcuL2h0dHAnO1xuaW1wb3J0IHsgQXBwTGlzdGVuZXJCcmlkZ2UgfSBmcm9tICcuL2xpc3RlbmVycyc7XG5pbXBvcnQgeyBBcHBNZXNzYWdlQnJpZGdlIH0gZnJvbSAnLi9tZXNzYWdlcyc7XG5pbXBvcnQgeyBBcHBQZXJzaXN0ZW5jZUJyaWRnZSB9IGZyb20gJy4vcGVyc2lzdGVuY2UnO1xuaW1wb3J0IHsgQXBwUm9vbUJyaWRnZSB9IGZyb20gJy4vcm9vbXMnO1xuaW1wb3J0IHsgQXBwU2V0dGluZ0JyaWRnZSB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHsgQXBwVXNlckJyaWRnZSB9IGZyb20gJy4vdXNlcnMnO1xuXG5leHBvcnQge1xuXHRSZWFsQXBwQnJpZGdlcyxcblx0QXBwQWN0aXZhdGlvbkJyaWRnZSxcblx0QXBwQ29tbWFuZHNCcmlkZ2UsXG5cdEFwcEVudmlyb25tZW50YWxWYXJpYWJsZUJyaWRnZSxcblx0QXBwSHR0cEJyaWRnZSxcblx0QXBwTGlzdGVuZXJCcmlkZ2UsXG5cdEFwcE1lc3NhZ2VCcmlkZ2UsXG5cdEFwcFBlcnNpc3RlbmNlQnJpZGdlLFxuXHRBcHBSb29tQnJpZGdlLFxuXHRBcHBTZXR0aW5nQnJpZGdlLFxuXHRBcHBVc2VyQnJpZGdlLFxufTtcbiIsImV4cG9ydCBjbGFzcyBBcHBEZXRhaWxDaGFuZ2VzQnJpZGdlIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHRoaXMub3JjaCA9IG9yY2g7XG5cdH1cblxuXHRvbkFwcFNldHRpbmdzQ2hhbmdlKGFwcElkLCBzZXR0aW5nKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHRoaXMub3JjaC5nZXROb3RpZmllcigpLmFwcFNldHRpbmdzQ2hhbmdlKGFwcElkLCBzZXR0aW5nKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLndhcm4oJ2ZhaWxlZCB0byBub3RpZnkgYWJvdXQgdGhlIHNldHRpbmcgY2hhbmdlLicsIGFwcElkKTtcblx0XHR9XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBBcHBIdHRwQnJpZGdlIHtcblx0YXN5bmMgY2FsbChpbmZvKSB7XG5cdFx0aWYgKCFpbmZvLnJlcXVlc3QuY29udGVudCAmJiB0eXBlb2YgaW5mby5yZXF1ZXN0LmRhdGEgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRpbmZvLnJlcXVlc3QuY29udGVudCA9IEpTT04uc3RyaW5naWZ5KGluZm8ucmVxdWVzdC5kYXRhKTtcblx0XHR9XG5cblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBpbmZvLmFwcElkIH0gaXMgcmVxdWVzdGluZyBmcm9tIHRoZSBvdXR0ZXIgd2ViczpgLCBpbmZvKTtcblxuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gSFRUUC5jYWxsKGluZm8ubWV0aG9kLCBpbmZvLnVybCwgaW5mby5yZXF1ZXN0KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gZS5yZXNwb25zZTtcblx0XHR9XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBBcHBMaXN0ZW5lckJyaWRnZSB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLm9yY2ggPSBvcmNoO1xuXHR9XG5cblx0YXN5bmMgbWVzc2FnZUV2ZW50KGludGUsIG1lc3NhZ2UpIHtcblx0XHRjb25zdCBtc2cgPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgnbWVzc2FnZXMnKS5jb252ZXJ0TWVzc2FnZShtZXNzYWdlKTtcblx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLm9yY2guZ2V0TWFuYWdlcigpLmdldExpc3RlbmVyTWFuYWdlcigpLmV4ZWN1dGVMaXN0ZW5lcihpbnRlLCBtc2cpO1xuXG5cdFx0aWYgKHR5cGVvZiByZXN1bHQgPT09ICdib29sZWFuJykge1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdtZXNzYWdlcycpLmNvbnZlcnRBcHBNZXNzYWdlKHJlc3VsdCk7XG5cdFx0fVxuXHRcdC8vIHRyeSB7XG5cblx0XHQvLyB9IGNhdGNoIChlKSB7XG5cdFx0Ly8gXHRjb25zb2xlLmxvZyhgJHsgZS5uYW1lIH06ICR7IGUubWVzc2FnZSB9YCk7XG5cdFx0Ly8gXHRjb25zb2xlLmxvZyhlLnN0YWNrKTtcblx0XHQvLyB9XG5cdH1cblxuXHRhc3luYyByb29tRXZlbnQoaW50ZSwgcm9vbSkge1xuXHRcdGNvbnN0IHJtID0gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3Jvb21zJykuY29udmVydFJvb20ocm9vbSk7XG5cdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5vcmNoLmdldE1hbmFnZXIoKS5nZXRMaXN0ZW5lck1hbmFnZXIoKS5leGVjdXRlTGlzdGVuZXIoaW50ZSwgcm0pO1xuXG5cdFx0aWYgKHR5cGVvZiByZXN1bHQgPT09ICdib29sZWFuJykge1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdyb29tcycpLmNvbnZlcnRBcHBSb29tKHJlc3VsdCk7XG5cdFx0fVxuXHRcdC8vIHRyeSB7XG5cblx0XHQvLyB9IGNhdGNoIChlKSB7XG5cdFx0Ly8gXHRjb25zb2xlLmxvZyhgJHsgZS5uYW1lIH06ICR7IGUubWVzc2FnZSB9YCk7XG5cdFx0Ly8gXHRjb25zb2xlLmxvZyhlLnN0YWNrKTtcblx0XHQvLyB9XG5cdH1cbn1cbiIsImNvbnN0IHdhaXRUb0xvYWQgPSBmdW5jdGlvbihvcmNoKSB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuXHRcdGxldCBpZCA9IHNldEludGVydmFsKCgpID0+IHtcblx0XHRcdGlmIChvcmNoLmlzRW5hYmxlZCgpICYmIG9yY2guaXNMb2FkZWQoKSkge1xuXHRcdFx0XHRjbGVhckludGVydmFsKGlkKTtcblx0XHRcdFx0aWQgPSAtMTtcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fVxuXHRcdH0sIDEwMCk7XG5cdH0pO1xufTtcblxuY29uc3Qgd2FpdFRvVW5sb2FkID0gZnVuY3Rpb24ob3JjaCkge1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcblx0XHRsZXQgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG5cdFx0XHRpZiAoIW9yY2guaXNFbmFibGVkKCkgJiYgIW9yY2guaXNMb2FkZWQoKSkge1xuXHRcdFx0XHRjbGVhckludGVydmFsKGlkKTtcblx0XHRcdFx0aWQgPSAtMTtcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fVxuXHRcdH0sIDEwMCk7XG5cdH0pO1xufTtcblxuZXhwb3J0IGNsYXNzIEFwcE1ldGhvZHMge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5fb3JjaCA9IG9yY2g7XG5cblx0XHR0aGlzLl9hZGRNZXRob2RzKCk7XG5cdH1cblxuXHRpc0VuYWJsZWQoKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiB0aGlzLl9vcmNoICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLl9vcmNoLmlzRW5hYmxlZCgpO1xuXHR9XG5cblx0aXNMb2FkZWQoKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiB0aGlzLl9vcmNoICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLl9vcmNoLmlzRW5hYmxlZCgpICYmIHRoaXMuX29yY2guaXNMb2FkZWQoKTtcblx0fVxuXG5cdF9hZGRNZXRob2RzKCkge1xuXHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcztcblxuXHRcdE1ldGVvci5tZXRob2RzKHtcblx0XHRcdCdhcHBzL2lzLWVuYWJsZWQnKCkge1xuXHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UuaXNFbmFibGVkKCk7XG5cdFx0XHR9LFxuXG5cdFx0XHQnYXBwcy9pcy1sb2FkZWQnKCkge1xuXHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UuaXNMb2FkZWQoKTtcblx0XHRcdH0sXG5cblx0XHRcdCdhcHBzL2dvLWVuYWJsZScoKSB7XG5cdFx0XHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdFx0XHRcdG1ldGhvZDogJ2FwcHMvZ28tZW5hYmxlJyxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ21hbmFnZS1hcHBzJykpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdFx0XHRtZXRob2Q6ICdhcHBzL2dvLWVuYWJsZScsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnNldCgnQXBwc19GcmFtZXdvcmtfZW5hYmxlZCcsIHRydWUpO1xuXG5cdFx0XHRcdFByb21pc2UuYXdhaXQod2FpdFRvTG9hZChpbnN0YW5jZS5fb3JjaCkpO1xuXHRcdFx0fSxcblxuXHRcdFx0J2FwcHMvZ28tZGlzYWJsZScoKSB7XG5cdFx0XHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdFx0XHRcdG1ldGhvZDogJ2FwcHMvZ28tZW5hYmxlJyxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ21hbmFnZS1hcHBzJykpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdFx0XHRtZXRob2Q6ICdhcHBzL2dvLWVuYWJsZScsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnNldCgnQXBwc19GcmFtZXdvcmtfZW5hYmxlZCcsIGZhbHNlKTtcblxuXHRcdFx0XHRQcm9taXNlLmF3YWl0KHdhaXRUb1VubG9hZChpbnN0YW5jZS5fb3JjaCkpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fVxufVxuIiwiaW1wb3J0IEJ1c2JveSBmcm9tICdidXNib3knO1xuXG5leHBvcnQgY2xhc3MgQXBwc1Jlc3RBcGkge1xuXHRjb25zdHJ1Y3RvcihvcmNoLCBtYW5hZ2VyKSB7XG5cdFx0dGhpcy5fb3JjaCA9IG9yY2g7XG5cdFx0dGhpcy5fbWFuYWdlciA9IG1hbmFnZXI7XG5cdFx0dGhpcy5hcGkgPSBuZXcgUm9ja2V0Q2hhdC5BUEkuQXBpQ2xhc3Moe1xuXHRcdFx0dmVyc2lvbjogJ2FwcHMnLFxuXHRcdFx0dXNlRGVmYXVsdEF1dGg6IHRydWUsXG5cdFx0XHRwcmV0dHlKc29uOiBmYWxzZSxcblx0XHRcdGVuYWJsZUNvcnM6IGZhbHNlLFxuXHRcdFx0YXV0aDogUm9ja2V0Q2hhdC5BUEkuZ2V0VXNlckF1dGgoKSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkTWFuYWdlbWVudFJvdXRlcygpO1xuXHR9XG5cblx0X2hhbmRsZUZpbGUocmVxdWVzdCwgZmlsZUZpZWxkKSB7XG5cdFx0Y29uc3QgYnVzYm95ID0gbmV3IEJ1c2JveSh7IGhlYWRlcnM6IHJlcXVlc3QuaGVhZGVycyB9KTtcblxuXHRcdHJldHVybiBNZXRlb3Iud3JhcEFzeW5jKChjYWxsYmFjaykgPT4ge1xuXHRcdFx0YnVzYm95Lm9uKCdmaWxlJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZmllbGRuYW1lLCBmaWxlKSA9PiB7XG5cdFx0XHRcdGlmIChmaWVsZG5hbWUgIT09IGZpbGVGaWVsZCkge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLWZpZWxkJywgYEV4cGVjdGVkIHRoZSBmaWVsZCBcIiR7IGZpbGVGaWVsZCB9XCIgYnV0IGdvdCBcIiR7IGZpZWxkbmFtZSB9XCIgaW5zdGVhZC5gKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBmaWxlRGF0YSA9IFtdO1xuXHRcdFx0XHRmaWxlLm9uKCdkYXRhJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZGF0YSkgPT4ge1xuXHRcdFx0XHRcdGZpbGVEYXRhLnB1c2goZGF0YSk7XG5cdFx0XHRcdH0pKTtcblxuXHRcdFx0XHRmaWxlLm9uKCdlbmQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IGNhbGxiYWNrKHVuZGVmaW5lZCwgQnVmZmVyLmNvbmNhdChmaWxlRGF0YSkpKSk7XG5cdFx0XHR9KSk7XG5cblx0XHRcdHJlcXVlc3QucGlwZShidXNib3kpO1xuXHRcdH0pKCk7XG5cdH1cblxuXHRhZGRNYW5hZ2VtZW50Um91dGVzKCkge1xuXHRcdGNvbnN0IG9yY2hlc3RyYXRvciA9IHRoaXMuX29yY2g7XG5cdFx0Y29uc3QgbWFuYWdlciA9IHRoaXMuX21hbmFnZXI7XG5cdFx0Y29uc3QgZmlsZUhhbmRsZXIgPSB0aGlzLl9oYW5kbGVGaWxlO1xuXG5cdFx0dGhpcy5hcGkuYWRkUm91dGUoJycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0XHRcdGdldCgpIHtcblx0XHRcdFx0Y29uc3QgYXBwcyA9IG1hbmFnZXIuZ2V0KCkubWFwKChwcmwpID0+IHtcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gcHJsLmdldEluZm8oKTtcblx0XHRcdFx0XHRpbmZvLmxhbmd1YWdlcyA9IHBybC5nZXRTdG9yYWdlSXRlbSgpLmxhbmd1YWdlQ29udGVudDtcblx0XHRcdFx0XHRpbmZvLnN0YXR1cyA9IHBybC5nZXRTdGF0dXMoKTtcblxuXHRcdFx0XHRcdHJldHVybiBpbmZvO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IGFwcHMgfSk7XG5cdFx0XHR9LFxuXHRcdFx0cG9zdCgpIHtcblx0XHRcdFx0bGV0IGJ1ZmY7XG5cblx0XHRcdFx0aWYgKHRoaXMuYm9keVBhcmFtcy51cmwpIHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ0dFVCcsIHRoaXMuYm9keVBhcmFtcy51cmwsIHsgbnBtUmVxdWVzdE9wdGlvbnM6IHsgZW5jb2Rpbmc6ICdiYXNlNjQnIH0gfSk7XG5cblx0XHRcdFx0XHRpZiAocmVzdWx0LnN0YXR1c0NvZGUgIT09IDIwMCB8fCAhcmVzdWx0LmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddIHx8IHJlc3VsdC5oZWFkZXJzWydjb250ZW50LXR5cGUnXSAhPT0gJ2FwcGxpY2F0aW9uL3ppcCcpIHtcblx0XHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKHsgZXJyb3I6ICdJbnZhbGlkIHVybC4gSXQgZG9lc25cXCd0IGV4aXN0IG9yIGlzIG5vdCBcImFwcGxpY2F0aW9uL3ppcFwiLicgfSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0YnVmZiA9IEJ1ZmZlci5mcm9tKHJlc3VsdC5jb250ZW50LCAnYmFzZTY0Jyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YnVmZiA9IGZpbGVIYW5kbGVyKHRoaXMucmVxdWVzdCwgJ2FwcCcpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCFidWZmKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoeyBlcnJvcjogJ0ZhaWxlZCB0byBnZXQgYSBmaWxlIHRvIGluc3RhbGwgZm9yIHRoZSBBcHAuICcgfSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBhZmYgPSBQcm9taXNlLmF3YWl0KG1hbmFnZXIuYWRkKGJ1ZmYudG9TdHJpbmcoJ2Jhc2U2NCcpLCBmYWxzZSkpO1xuXHRcdFx0XHRjb25zdCBpbmZvID0gYWZmLmdldEFwcEluZm8oKTtcblxuXHRcdFx0XHQvLyBJZiB0aGVyZSBhcmUgY29tcGlsZXIgZXJyb3JzLCB0aGVyZSB3b24ndCBiZSBhbiBBcHAgdG8gZ2V0IHRoZSBzdGF0dXMgb2Zcblx0XHRcdFx0aWYgKGFmZi5nZXRBcHAoKSkge1xuXHRcdFx0XHRcdGluZm8uc3RhdHVzID0gYWZmLmdldEFwcCgpLmdldFN0YXR1cygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGluZm8uc3RhdHVzID0gJ2NvbXBpbGVyX2Vycm9yJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHRhcHA6IGluZm8sXG5cdFx0XHRcdFx0aW1wbGVtZW50ZWQ6IGFmZi5nZXRJbXBsZW1lbnRlZEluZmVyZmFjZXMoKSxcblx0XHRcdFx0XHRjb21waWxlckVycm9yczogYWZmLmdldENvbXBpbGVyRXJyb3JzKCksXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYXBpLmFkZFJvdXRlKCdsYW5ndWFnZXMnLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRcdFx0Z2V0KCkge1xuXHRcdFx0XHRjb25zdCBhcHBzID0gbWFuYWdlci5nZXQoKS5tYXAoKHBybCkgPT4gKHtcblx0XHRcdFx0XHRpZDogcHJsLmdldElEKCksXG5cdFx0XHRcdFx0bGFuZ3VhZ2VzOiBwcmwuZ2V0U3RvcmFnZUl0ZW0oKS5sYW5ndWFnZUNvbnRlbnQsXG5cdFx0XHRcdH0pKTtcblxuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IGFwcHMgfSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hcGkuYWRkUm91dGUoJzppZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0XHRcdGdldCgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0dldHRpbmc6JywgdGhpcy51cmxQYXJhbXMuaWQpO1xuXHRcdFx0XHRjb25zdCBwcmwgPSBtYW5hZ2VyLmdldE9uZUJ5SWQodGhpcy51cmxQYXJhbXMuaWQpO1xuXG5cdFx0XHRcdGlmIChwcmwpIHtcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gcHJsLmdldEluZm8oKTtcblx0XHRcdFx0XHRpbmZvLnN0YXR1cyA9IHBybC5nZXRTdGF0dXMoKTtcblxuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgYXBwOiBpbmZvIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5ub3RGb3VuZChgTm8gQXBwIGZvdW5kIGJ5IHRoZSBpZCBvZjogJHsgdGhpcy51cmxQYXJhbXMuaWQgfWApO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0cG9zdCgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1VwZGF0aW5nOicsIHRoaXMudXJsUGFyYW1zLmlkKTtcblx0XHRcdFx0Ly8gVE9ETzogVmVyaWZ5IHBlcm1pc3Npb25zXG5cblx0XHRcdFx0bGV0IGJ1ZmY7XG5cblx0XHRcdFx0aWYgKHRoaXMuYm9keVBhcmFtcy51cmwpIHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ0dFVCcsIHRoaXMuYm9keVBhcmFtcy51cmwsIHsgbnBtUmVxdWVzdE9wdGlvbnM6IHsgZW5jb2Rpbmc6ICdiYXNlNjQnIH0gfSk7XG5cblx0XHRcdFx0XHRpZiAocmVzdWx0LnN0YXR1c0NvZGUgIT09IDIwMCB8fCAhcmVzdWx0LmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddIHx8IHJlc3VsdC5oZWFkZXJzWydjb250ZW50LXR5cGUnXSAhPT0gJ2FwcGxpY2F0aW9uL3ppcCcpIHtcblx0XHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKHsgZXJyb3I6ICdJbnZhbGlkIHVybC4gSXQgZG9lc25cXCd0IGV4aXN0IG9yIGlzIG5vdCBcImFwcGxpY2F0aW9uL3ppcFwiLicgfSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0YnVmZiA9IEJ1ZmZlci5mcm9tKHJlc3VsdC5jb250ZW50LCAnYmFzZTY0Jyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YnVmZiA9IGZpbGVIYW5kbGVyKHRoaXMucmVxdWVzdCwgJ2FwcCcpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCFidWZmKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoeyBlcnJvcjogJ0ZhaWxlZCB0byBnZXQgYSBmaWxlIHRvIGluc3RhbGwgZm9yIHRoZSBBcHAuICcgfSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBhZmYgPSBQcm9taXNlLmF3YWl0KG1hbmFnZXIudXBkYXRlKGJ1ZmYudG9TdHJpbmcoJ2Jhc2U2NCcpKSk7XG5cdFx0XHRcdGNvbnN0IGluZm8gPSBhZmYuZ2V0QXBwSW5mbygpO1xuXG5cdFx0XHRcdC8vIFNob3VsZCB0aGUgdXBkYXRlZCB2ZXJzaW9uIGhhdmUgY29tcGlsZXIgZXJyb3JzLCBubyBBcHAgd2lsbCBiZSByZXR1cm5lZFxuXHRcdFx0XHRpZiAoYWZmLmdldEFwcCgpKSB7XG5cdFx0XHRcdFx0aW5mby5zdGF0dXMgPSBhZmYuZ2V0QXBwKCkuZ2V0U3RhdHVzKCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aW5mby5zdGF0dXMgPSAnY29tcGlsZXJfZXJyb3InO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRcdGFwcDogaW5mbyxcblx0XHRcdFx0XHRpbXBsZW1lbnRlZDogYWZmLmdldEltcGxlbWVudGVkSW5mZXJmYWNlcygpLFxuXHRcdFx0XHRcdGNvbXBpbGVyRXJyb3JzOiBhZmYuZ2V0Q29tcGlsZXJFcnJvcnMoKSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0ZGVsZXRlKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnVW5pbnN0YWxsaW5nOicsIHRoaXMudXJsUGFyYW1zLmlkKTtcblx0XHRcdFx0Y29uc3QgcHJsID0gbWFuYWdlci5nZXRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLmlkKTtcblxuXHRcdFx0XHRpZiAocHJsKSB7XG5cdFx0XHRcdFx0UHJvbWlzZS5hd2FpdChtYW5hZ2VyLnJlbW92ZShwcmwuZ2V0SUQoKSkpO1xuXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IHBybC5nZXRJbmZvKCk7XG5cdFx0XHRcdFx0aW5mby5zdGF0dXMgPSBwcmwuZ2V0U3RhdHVzKCk7XG5cblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IGFwcDogaW5mbyB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYXBpLmFkZFJvdXRlKCc6aWQvaWNvbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0XHRcdGdldCgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0dldHRpbmcgdGhlIEFwcFxcJ3MgSWNvbjonLCB0aGlzLnVybFBhcmFtcy5pZCk7XG5cdFx0XHRcdGNvbnN0IHBybCA9IG1hbmFnZXIuZ2V0T25lQnlJZCh0aGlzLnVybFBhcmFtcy5pZCk7XG5cblx0XHRcdFx0aWYgKHBybCkge1xuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBwcmwuZ2V0SW5mbygpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBpY29uRmlsZUNvbnRlbnQ6IGluZm8uaWNvbkZpbGVDb250ZW50IH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5ub3RGb3VuZChgTm8gQXBwIGZvdW5kIGJ5IHRoZSBpZCBvZjogJHsgdGhpcy51cmxQYXJhbXMuaWQgfWApO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hcGkuYWRkUm91dGUoJzppZC9sYW5ndWFnZXMnLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRcdFx0Z2V0KCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhgR2V0dGluZyAkeyB0aGlzLnVybFBhcmFtcy5pZCB9J3MgbGFuZ3VhZ2VzLi5gKTtcblx0XHRcdFx0Y29uc3QgcHJsID0gbWFuYWdlci5nZXRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLmlkKTtcblxuXHRcdFx0XHRpZiAocHJsKSB7XG5cdFx0XHRcdFx0Y29uc3QgbGFuZ3VhZ2VzID0gcHJsLmdldFN0b3JhZ2VJdGVtKCkubGFuZ3VhZ2VDb250ZW50IHx8IHt9O1xuXG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBsYW5ndWFnZXMgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLm5vdEZvdW5kKGBObyBBcHAgZm91bmQgYnkgdGhlIGlkIG9mOiAkeyB0aGlzLnVybFBhcmFtcy5pZCB9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFwaS5hZGRSb3V0ZSgnOmlkL2xvZ3MnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBHZXR0aW5nICR7IHRoaXMudXJsUGFyYW1zLmlkIH0ncyBsb2dzLi5gKTtcblx0XHRcdFx0Y29uc3QgcHJsID0gbWFuYWdlci5nZXRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLmlkKTtcblxuXHRcdFx0XHRpZiAocHJsKSB7XG5cdFx0XHRcdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdFx0XHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0XHRcdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyBhcHBJZDogcHJsLmdldElEKCkgfSk7XG5cdFx0XHRcdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdFx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyBfdXBkYXRlZEF0OiAtMSB9LFxuXHRcdFx0XHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0XHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0XHRcdFx0ZmllbGRzLFxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRjb25zdCBsb2dzID0gUHJvbWlzZS5hd2FpdChvcmNoZXN0cmF0b3IuZ2V0TG9nU3RvcmFnZSgpLmZpbmQob3VyUXVlcnksIG9wdGlvbnMpKTtcblxuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgbG9ncyB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYXBpLmFkZFJvdXRlKCc6aWQvc2V0dGluZ3MnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBHZXR0aW5nICR7IHRoaXMudXJsUGFyYW1zLmlkIH0ncyBzZXR0aW5ncy4uYCk7XG5cdFx0XHRcdGNvbnN0IHBybCA9IG1hbmFnZXIuZ2V0T25lQnlJZCh0aGlzLnVybFBhcmFtcy5pZCk7XG5cblx0XHRcdFx0aWYgKHBybCkge1xuXHRcdFx0XHRcdGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgcHJsLmdldFN0b3JhZ2VJdGVtKCkuc2V0dGluZ3MpO1xuXG5cdFx0XHRcdFx0T2JqZWN0LmtleXMoc2V0dGluZ3MpLmZvckVhY2goKGspID0+IHtcblx0XHRcdFx0XHRcdGlmIChzZXR0aW5nc1trXS5oaWRkZW4pIHtcblx0XHRcdFx0XHRcdFx0ZGVsZXRlIHNldHRpbmdzW2tdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBzZXR0aW5ncyB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHBvc3QoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBVcGRhdGluZyAkeyB0aGlzLnVybFBhcmFtcy5pZCB9J3Mgc2V0dGluZ3MuLmApO1xuXHRcdFx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcyB8fCAhdGhpcy5ib2R5UGFyYW1zLnNldHRpbmdzKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBzZXR0aW5ncyB0byB1cGRhdGUgbXVzdCBiZSBwcmVzZW50LicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgcHJsID0gbWFuYWdlci5nZXRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLmlkKTtcblxuXHRcdFx0XHRpZiAoIXBybCkge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5ub3RGb3VuZChgTm8gQXBwIGZvdW5kIGJ5IHRoZSBpZCBvZjogJHsgdGhpcy51cmxQYXJhbXMuaWQgfWApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgeyBzZXR0aW5ncyB9ID0gcHJsLmdldFN0b3JhZ2VJdGVtKCk7XG5cblx0XHRcdFx0Y29uc3QgdXBkYXRlZCA9IFtdO1xuXHRcdFx0XHR0aGlzLmJvZHlQYXJhbXMuc2V0dGluZ3MuZm9yRWFjaCgocykgPT4ge1xuXHRcdFx0XHRcdGlmIChzZXR0aW5nc1tzLmlkXSkge1xuXHRcdFx0XHRcdFx0UHJvbWlzZS5hd2FpdChtYW5hZ2VyLmdldFNldHRpbmdzTWFuYWdlcigpLnVwZGF0ZUFwcFNldHRpbmcodGhpcy51cmxQYXJhbXMuaWQsIHMpKTtcblx0XHRcdFx0XHRcdC8vIFVwZGF0aW5nP1xuXHRcdFx0XHRcdFx0dXBkYXRlZC5wdXNoKHMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyB1cGRhdGVkIH0pO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYXBpLmFkZFJvdXRlKCc6aWQvc2V0dGluZ3MvOnNldHRpbmdJZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0XHRcdGdldCgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coYEdldHRpbmcgdGhlIEFwcCAkeyB0aGlzLnVybFBhcmFtcy5pZCB9J3Mgc2V0dGluZyAkeyB0aGlzLnVybFBhcmFtcy5zZXR0aW5nSWQgfWApO1xuXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y29uc3Qgc2V0dGluZyA9IG1hbmFnZXIuZ2V0U2V0dGluZ3NNYW5hZ2VyKCkuZ2V0QXBwU2V0dGluZyh0aGlzLnVybFBhcmFtcy5pZCwgdGhpcy51cmxQYXJhbXMuc2V0dGluZ0lkKTtcblxuXHRcdFx0XHRcdFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBzZXR0aW5nIH0pO1xuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0aWYgKGUubWVzc2FnZS5pbmNsdWRlcygnTm8gc2V0dGluZyBmb3VuZCcpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIFNldHRpbmcgZm91bmQgb24gdGhlIEFwcCBieSB0aGUgaWQgb2Y6IFwiJHsgdGhpcy51cmxQYXJhbXMuc2V0dGluZ0lkIH1cImApO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoZS5tZXNzYWdlLmluY2x1ZGVzKCdObyBBcHAgZm91bmQnKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLm5vdEZvdW5kKGBObyBBcHAgZm91bmQgYnkgdGhlIGlkIG9mOiAkeyB0aGlzLnVybFBhcmFtcy5pZCB9YCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUubWVzc2FnZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0cG9zdCgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coYFVwZGF0aW5nIHRoZSBBcHAgJHsgdGhpcy51cmxQYXJhbXMuaWQgfSdzIHNldHRpbmcgJHsgdGhpcy51cmxQYXJhbXMuc2V0dGluZ0lkIH1gKTtcblxuXHRcdFx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5zZXR0aW5nKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1NldHRpbmcgdG8gdXBkYXRlIHRvIG11c3QgYmUgcHJlc2VudCBvbiB0aGUgcG9zdGVkIGJvZHkuJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFByb21pc2UuYXdhaXQobWFuYWdlci5nZXRTZXR0aW5nc01hbmFnZXIoKS51cGRhdGVBcHBTZXR0aW5nKHRoaXMudXJsUGFyYW1zLmlkLCB0aGlzLmJvZHlQYXJhbXMuc2V0dGluZykpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGlmIChlLm1lc3NhZ2UuaW5jbHVkZXMoJ05vIHNldHRpbmcgZm91bmQnKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLm5vdEZvdW5kKGBObyBTZXR0aW5nIGZvdW5kIG9uIHRoZSBBcHAgYnkgdGhlIGlkIG9mOiBcIiR7IHRoaXMudXJsUGFyYW1zLnNldHRpbmdJZCB9XCJgKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGUubWVzc2FnZS5pbmNsdWRlcygnTm8gQXBwIGZvdW5kJykpIHtcblx0XHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5ub3RGb3VuZChgTm8gQXBwIGZvdW5kIGJ5IHRoZSBpZCBvZjogJHsgdGhpcy51cmxQYXJhbXMuaWQgfWApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYXBpLmFkZFJvdXRlKCc6aWQvc3RhdHVzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRcdFx0Z2V0KCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhgR2V0dGluZyAkeyB0aGlzLnVybFBhcmFtcy5pZCB9J3Mgc3RhdHVzLi5gKTtcblx0XHRcdFx0Y29uc3QgcHJsID0gbWFuYWdlci5nZXRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLmlkKTtcblxuXHRcdFx0XHRpZiAocHJsKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBzdGF0dXM6IHBybC5nZXRTdGF0dXMoKSB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHBvc3QoKSB7XG5cdFx0XHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLnN0YXR1cyB8fCB0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLnN0YXR1cyAhPT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBzdGF0dXMgcHJvdmlkZWQsIGl0IG11c3QgYmUgXCJzdGF0dXNcIiBmaWVsZCBhbmQgYSBzdHJpbmcuJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zb2xlLmxvZyhgVXBkYXRpbmcgJHsgdGhpcy51cmxQYXJhbXMuaWQgfSdzIHN0YXR1cy4uLmAsIHRoaXMuYm9keVBhcmFtcy5zdGF0dXMpO1xuXHRcdFx0XHRjb25zdCBwcmwgPSBtYW5hZ2VyLmdldE9uZUJ5SWQodGhpcy51cmxQYXJhbXMuaWQpO1xuXG5cdFx0XHRcdGlmIChwcmwpIHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBQcm9taXNlLmF3YWl0KG1hbmFnZXIuY2hhbmdlU3RhdHVzKHBybC5nZXRJRCgpLCB0aGlzLmJvZHlQYXJhbXMuc3RhdHVzKSk7XG5cblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHN0YXR1czogcmVzdWx0LmdldFN0YXR1cygpIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5ub3RGb3VuZChgTm8gQXBwIGZvdW5kIGJ5IHRoZSBpZCBvZjogJHsgdGhpcy51cmxQYXJhbXMuaWQgfWApO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBBcHBTdGF0dXMsIEFwcFN0YXR1c1V0aWxzIH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL2RlZmluaXRpb24vQXBwU3RhdHVzJztcblxuZXhwb3J0IGNvbnN0IEFwcEV2ZW50cyA9IE9iamVjdC5mcmVlemUoe1xuXHRBUFBfQURERUQ6ICdhcHAvYWRkZWQnLFxuXHRBUFBfUkVNT1ZFRDogJ2FwcC9yZW1vdmVkJyxcblx0QVBQX1VQREFURUQ6ICdhcHAvdXBkYXRlZCcsXG5cdEFQUF9TVEFUVVNfQ0hBTkdFOiAnYXBwL3N0YXR1c1VwZGF0ZScsXG5cdEFQUF9TRVRUSU5HX1VQREFURUQ6ICdhcHAvc2V0dGluZ1VwZGF0ZWQnLFxuXHRDT01NQU5EX0FEREVEOiAnY29tbWFuZC9hZGRlZCcsXG5cdENPTU1BTkRfRElTQUJMRUQ6ICdjb21tYW5kL2Rpc2FibGVkJyxcblx0Q09NTUFORF9VUERBVEVEOiAnY29tbWFuZC91cGRhdGVkJyxcblx0Q09NTUFORF9SRU1PVkVEOiAnY29tbWFuZC9yZW1vdmVkJyxcbn0pO1xuXG5leHBvcnQgY2xhc3MgQXBwU2VydmVyTGlzdGVuZXIge1xuXHRjb25zdHJ1Y3RvcihvcmNoLCBlbmdpbmVTdHJlYW1lciwgY2xpZW50U3RyZWFtZXIsIHJlY2VpdmVkKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyID0gZW5naW5lU3RyZWFtZXI7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lciA9IGNsaWVudFN0cmVhbWVyO1xuXHRcdHRoaXMucmVjZWl2ZWQgPSByZWNlaXZlZDtcblxuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIub24oQXBwRXZlbnRzLkFQUF9BRERFRCwgdGhpcy5vbkFwcEFkZGVkLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIub24oQXBwRXZlbnRzLkFQUF9TVEFUVVNfQ0hBTkdFLCB0aGlzLm9uQXBwU3RhdHVzVXBkYXRlZC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLm9uKEFwcEV2ZW50cy5BUFBfU0VUVElOR19VUERBVEVELCB0aGlzLm9uQXBwU2V0dGluZ1VwZGF0ZWQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5vbihBcHBFdmVudHMuQVBQX1JFTU9WRUQsIHRoaXMub25BcHBSZW1vdmVkLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIub24oQXBwRXZlbnRzLkFQUF9VUERBVEVELCB0aGlzLm9uQXBwVXBkYXRlZC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLm9uKEFwcEV2ZW50cy5DT01NQU5EX0FEREVELCB0aGlzLm9uQ29tbWFuZEFkZGVkLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIub24oQXBwRXZlbnRzLkNPTU1BTkRfRElTQUJMRUQsIHRoaXMub25Db21tYW5kRGlzYWJsZWQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5vbihBcHBFdmVudHMuQ09NTUFORF9VUERBVEVELCB0aGlzLm9uQ29tbWFuZFVwZGF0ZWQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5vbihBcHBFdmVudHMuQ09NTUFORF9SRU1PVkVELCB0aGlzLm9uQ29tbWFuZFJlbW92ZWQuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRhc3luYyBvbkFwcEFkZGVkKGFwcElkKSB7XG5cdFx0YXdhaXQgdGhpcy5vcmNoLmdldE1hbmFnZXIoKS5sb2FkT25lKGFwcElkKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9BRERFRCwgYXBwSWQpO1xuXHR9XG5cblx0YXN5bmMgb25BcHBTdGF0dXNVcGRhdGVkKHsgYXBwSWQsIHN0YXR1cyB9KSB7XG5cdFx0dGhpcy5yZWNlaXZlZC5zZXQoYCR7IEFwcEV2ZW50cy5BUFBfU1RBVFVTX0NIQU5HRSB9XyR7IGFwcElkIH1gLCB7IGFwcElkLCBzdGF0dXMsIHdoZW46IG5ldyBEYXRlKCkgfSk7XG5cblx0XHRpZiAoQXBwU3RhdHVzVXRpbHMuaXNFbmFibGVkKHN0YXR1cykpIHtcblx0XHRcdGF3YWl0IHRoaXMub3JjaC5nZXRNYW5hZ2VyKCkuZW5hYmxlKGFwcElkKTtcblx0XHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1NUQVRVU19DSEFOR0UsIHsgYXBwSWQsIHN0YXR1cyB9KTtcblx0XHR9IGVsc2UgaWYgKEFwcFN0YXR1c1V0aWxzLmlzRGlzYWJsZWQoc3RhdHVzKSkge1xuXHRcdFx0YXdhaXQgdGhpcy5vcmNoLmdldE1hbmFnZXIoKS5kaXNhYmxlKGFwcElkLCBBcHBTdGF0dXMuTUFOVUFMTFlfRElTQUJMRUQgPT09IHN0YXR1cyk7XG5cdFx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9TVEFUVVNfQ0hBTkdFLCB7IGFwcElkLCBzdGF0dXMgfSk7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgb25BcHBTZXR0aW5nVXBkYXRlZCh7IGFwcElkLCBzZXR0aW5nIH0pIHtcblx0XHR0aGlzLnJlY2VpdmVkLnNldChgJHsgQXBwRXZlbnRzLkFQUF9TRVRUSU5HX1VQREFURUQgfV8keyBhcHBJZCB9XyR7IHNldHRpbmcuaWQgfWAsIHsgYXBwSWQsIHNldHRpbmcsIHdoZW46IG5ldyBEYXRlKCkgfSk7XG5cblx0XHRhd2FpdCB0aGlzLm9yY2guZ2V0TWFuYWdlcigpLmdldFNldHRpbmdzTWFuYWdlcigpLnVwZGF0ZUFwcFNldHRpbmcoYXBwSWQsIHNldHRpbmcpO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1NFVFRJTkdfVVBEQVRFRCwgeyBhcHBJZCB9KTtcblx0fVxuXG5cdGFzeW5jIG9uQXBwVXBkYXRlZChhcHBJZCkge1xuXHRcdHRoaXMucmVjZWl2ZWQuc2V0KGAkeyBBcHBFdmVudHMuQVBQX1VQREFURUQgfV8keyBhcHBJZCB9YCwgeyBhcHBJZCwgd2hlbjogbmV3IERhdGUoKSB9KTtcblxuXHRcdGNvbnN0IHN0b3JhZ2VJdGVtID0gYXdhaXQgdGhpcy5vcmNoLmdldFN0b3JhZ2UoKS5yZXRyaWV2ZU9uZShhcHBJZCk7XG5cblx0XHRhd2FpdCB0aGlzLm9yY2guZ2V0TWFuYWdlcigpLnVwZGF0ZShzdG9yYWdlSXRlbS56aXApO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1VQREFURUQsIGFwcElkKTtcblx0fVxuXG5cdGFzeW5jIG9uQXBwUmVtb3ZlZChhcHBJZCkge1xuXHRcdGF3YWl0IHRoaXMub3JjaC5nZXRNYW5hZ2VyKCkucmVtb3ZlKGFwcElkKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9SRU1PVkVELCBhcHBJZCk7XG5cdH1cblxuXHRhc3luYyBvbkNvbW1hbmRBZGRlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX0FEREVELCBjb21tYW5kKTtcblx0fVxuXG5cdGFzeW5jIG9uQ29tbWFuZERpc2FibGVkKGNvbW1hbmQpIHtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkNPTU1BTkRfRElTQUJMRUQsIGNvbW1hbmQpO1xuXHR9XG5cblx0YXN5bmMgb25Db21tYW5kVXBkYXRlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX1VQREFURUQsIGNvbW1hbmQpO1xuXHR9XG5cblx0YXN5bmMgb25Db21tYW5kUmVtb3ZlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX1JFTU9WRUQsIGNvbW1hbmQpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBBcHBTZXJ2ZXJOb3RpZmllciB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyID0gbmV3IE1ldGVvci5TdHJlYW1lcignYXBwcy1lbmdpbmUnLCB7IHJldHJhbnNtaXQ6IGZhbHNlIH0pO1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIuc2VydmVyT25seSA9IHRydWU7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5hbGxvd1JlYWQoJ25vbmUnKTtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLmFsbG93RW1pdCgnYWxsJyk7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5hbGxvd1dyaXRlKCdub25lJyk7XG5cblx0XHQvLyBUaGlzIGlzIHVzZWQgdG8gYnJvYWRjYXN0IHRvIHRoZSB3ZWIgY2xpZW50c1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIgPSBuZXcgTWV0ZW9yLlN0cmVhbWVyKCdhcHBzJywgeyByZXRyYW5zbWl0OiBmYWxzZSB9KTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLnNlcnZlck9ubHkgPSB0cnVlO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuYWxsb3dSZWFkKCdhbGwnKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmFsbG93RW1pdCgnYWxsJyk7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5hbGxvd1dyaXRlKCdub25lJyk7XG5cblx0XHR0aGlzLnJlY2VpdmVkID0gbmV3IE1hcCgpO1xuXHRcdHRoaXMubGlzdGVuZXIgPSBuZXcgQXBwU2VydmVyTGlzdGVuZXIob3JjaCwgdGhpcy5lbmdpbmVTdHJlYW1lciwgdGhpcy5jbGllbnRTdHJlYW1lciwgdGhpcy5yZWNlaXZlZCk7XG5cdH1cblxuXHRhc3luYyBhcHBBZGRlZChhcHBJZCkge1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX0FEREVELCBhcHBJZCk7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5BUFBfQURERUQsIGFwcElkKTtcblx0fVxuXG5cdGFzeW5jIGFwcFJlbW92ZWQoYXBwSWQpIHtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9SRU1PVkVELCBhcHBJZCk7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5BUFBfUkVNT1ZFRCwgYXBwSWQpO1xuXHR9XG5cblx0YXN5bmMgYXBwVXBkYXRlZChhcHBJZCkge1xuXHRcdGlmICh0aGlzLnJlY2VpdmVkLmhhcyhgJHsgQXBwRXZlbnRzLkFQUF9VUERBVEVEIH1fJHsgYXBwSWQgfWApKSB7XG5cdFx0XHR0aGlzLnJlY2VpdmVkLmRlbGV0ZShgJHsgQXBwRXZlbnRzLkFQUF9VUERBVEVEIH1fJHsgYXBwSWQgfWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1VQREFURUQsIGFwcElkKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9VUERBVEVELCBhcHBJZCk7XG5cdH1cblxuXHRhc3luYyBhcHBTdGF0dXNVcGRhdGVkKGFwcElkLCBzdGF0dXMpIHtcblx0XHRpZiAodGhpcy5yZWNlaXZlZC5oYXMoYCR7IEFwcEV2ZW50cy5BUFBfU1RBVFVTX0NIQU5HRSB9XyR7IGFwcElkIH1gKSkge1xuXHRcdFx0Y29uc3QgZGV0YWlscyA9IHRoaXMucmVjZWl2ZWQuZ2V0KGAkeyBBcHBFdmVudHMuQVBQX1NUQVRVU19DSEFOR0UgfV8keyBhcHBJZCB9YCk7XG5cdFx0XHRpZiAoZGV0YWlscy5zdGF0dXMgPT09IHN0YXR1cykge1xuXHRcdFx0XHR0aGlzLnJlY2VpdmVkLmRlbGV0ZShgJHsgQXBwRXZlbnRzLkFQUF9TVEFUVVNfQ0hBTkdFIH1fJHsgYXBwSWQgfWApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5BUFBfU1RBVFVTX0NIQU5HRSwgeyBhcHBJZCwgc3RhdHVzIH0pO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1NUQVRVU19DSEFOR0UsIHsgYXBwSWQsIHN0YXR1cyB9KTtcblx0fVxuXG5cdGFzeW5jIGFwcFNldHRpbmdzQ2hhbmdlKGFwcElkLCBzZXR0aW5nKSB7XG5cdFx0aWYgKHRoaXMucmVjZWl2ZWQuaGFzKGAkeyBBcHBFdmVudHMuQVBQX1NFVFRJTkdfVVBEQVRFRCB9XyR7IGFwcElkIH1fJHsgc2V0dGluZy5pZCB9YCkpIHtcblx0XHRcdHRoaXMucmVjZWl2ZWQuZGVsZXRlKGAkeyBBcHBFdmVudHMuQVBQX1NFVFRJTkdfVVBEQVRFRCB9XyR7IGFwcElkIH1fJHsgc2V0dGluZy5pZCB9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5BUFBfU0VUVElOR19VUERBVEVELCB7IGFwcElkLCBzZXR0aW5nIH0pO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1NFVFRJTkdfVVBEQVRFRCwgeyBhcHBJZCB9KTtcblx0fVxuXG5cdGFzeW5jIGNvbW1hbmRBZGRlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX0FEREVELCBjb21tYW5kKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkNPTU1BTkRfQURERUQsIGNvbW1hbmQpO1xuXHR9XG5cblx0YXN5bmMgY29tbWFuZERpc2FibGVkKGNvbW1hbmQpIHtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkNPTU1BTkRfRElTQUJMRUQsIGNvbW1hbmQpO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQ09NTUFORF9ESVNBQkxFRCwgY29tbWFuZCk7XG5cdH1cblxuXHRhc3luYyBjb21tYW5kVXBkYXRlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX1VQREFURUQsIGNvbW1hbmQpO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQ09NTUFORF9VUERBVEVELCBjb21tYW5kKTtcblx0fVxuXG5cdGFzeW5jIGNvbW1hbmRSZW1vdmVkKGNvbW1hbmQpIHtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkNPTU1BTkRfUkVNT1ZFRCwgY29tbWFuZCk7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX1JFTU9WRUQsIGNvbW1hbmQpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBBcHBNZXRob2RzIH0gZnJvbSAnLi9tZXRob2RzJztcbmltcG9ydCB7IEFwcHNSZXN0QXBpIH0gZnJvbSAnLi9yZXN0JztcbmltcG9ydCB7IEFwcEV2ZW50cywgQXBwU2VydmVyTm90aWZpZXIsIEFwcFNlcnZlckxpc3RlbmVyIH0gZnJvbSAnLi93ZWJzb2NrZXRzJztcblxuZXhwb3J0IHtcblx0QXBwTWV0aG9kcyxcblx0QXBwc1Jlc3RBcGksXG5cdEFwcEV2ZW50cyxcblx0QXBwU2VydmVyTm90aWZpZXIsXG5cdEFwcFNlcnZlckxpc3RlbmVyLFxufTtcbiIsImV4cG9ydCBjbGFzcyBBcHBNZXNzYWdlc0NvbnZlcnRlciB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLm9yY2ggPSBvcmNoO1xuXHR9XG5cblx0Y29udmVydEJ5SWQobXNnSWQpIHtcblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5nZXRPbmVCeUlkKG1zZ0lkKTtcblxuXHRcdHJldHVybiB0aGlzLmNvbnZlcnRNZXNzYWdlKG1zZyk7XG5cdH1cblxuXHRjb252ZXJ0TWVzc2FnZShtc2dPYmopIHtcblx0XHRpZiAoIW1zZ09iaikge1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3Jvb21zJykuY29udmVydEJ5SWQobXNnT2JqLnJpZCk7XG5cblx0XHRsZXQgc2VuZGVyO1xuXHRcdGlmIChtc2dPYmoudSAmJiBtc2dPYmoudS5faWQpIHtcblx0XHRcdHNlbmRlciA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCd1c2VycycpLmNvbnZlcnRCeUlkKG1zZ09iai51Ll9pZCk7XG5cblx0XHRcdGlmICghc2VuZGVyKSB7XG5cdFx0XHRcdHNlbmRlciA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCd1c2VycycpLmNvbnZlcnRUb0FwcChtc2dPYmoudSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0bGV0IGVkaXRvcjtcblx0XHRpZiAobXNnT2JqLmVkaXRlZEJ5KSB7XG5cdFx0XHRlZGl0b3IgPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgndXNlcnMnKS5jb252ZXJ0QnlJZChtc2dPYmouZWRpdGVkQnkuX2lkKTtcblx0XHR9XG5cblx0XHRjb25zdCBhdHRhY2htZW50cyA9IHRoaXMuX2NvbnZlcnRBdHRhY2htZW50c1RvQXBwKG1zZ09iai5hdHRhY2htZW50cyk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0aWQ6IG1zZ09iai5faWQsXG5cdFx0XHRyb29tLFxuXHRcdFx0c2VuZGVyLFxuXHRcdFx0dGV4dDogbXNnT2JqLm1zZyxcblx0XHRcdGNyZWF0ZWRBdDogbXNnT2JqLnRzLFxuXHRcdFx0dXBkYXRlZEF0OiBtc2dPYmouX3VwZGF0ZWRBdCxcblx0XHRcdGVkaXRvcixcblx0XHRcdGVkaXRlZEF0OiBtc2dPYmouZWRpdGVkQXQsXG5cdFx0XHRlbW9qaTogbXNnT2JqLmVtb2ppLFxuXHRcdFx0YXZhdGFyVXJsOiBtc2dPYmouYXZhdGFyLFxuXHRcdFx0YWxpYXM6IG1zZ09iai5hbGlhcyxcblx0XHRcdGN1c3RvbUZpZWxkczogbXNnT2JqLmN1c3RvbUZpZWxkcyxcblx0XHRcdGF0dGFjaG1lbnRzLFxuXHRcdH07XG5cdH1cblxuXHRjb252ZXJ0QXBwTWVzc2FnZShtZXNzYWdlKSB7XG5cdFx0aWYgKCFtZXNzYWdlKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChtZXNzYWdlLnJvb20uaWQpO1xuXG5cdFx0aWYgKCFyb29tKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcm9vbSBwcm92aWRlZCBvbiB0aGUgbWVzc2FnZS4nKTtcblx0XHR9XG5cblx0XHRsZXQgdTtcblx0XHRpZiAobWVzc2FnZS5zZW5kZXIgJiYgbWVzc2FnZS5zZW5kZXIuaWQpIHtcblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChtZXNzYWdlLnNlbmRlci5pZCk7XG5cblx0XHRcdGlmICh1c2VyKSB7XG5cdFx0XHRcdHUgPSB7XG5cdFx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZSxcblx0XHRcdFx0XHRuYW1lOiB1c2VyLm5hbWUsXG5cdFx0XHRcdH07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1ID0ge1xuXHRcdFx0XHRcdF9pZDogbWVzc2FnZS5zZW5kZXIuaWQsXG5cdFx0XHRcdFx0dXNlcm5hbWU6IG1lc3NhZ2Uuc2VuZGVyLnVzZXJuYW1lLFxuXHRcdFx0XHRcdG5hbWU6IG1lc3NhZ2Uuc2VuZGVyLm5hbWUsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0bGV0IGVkaXRlZEJ5O1xuXHRcdGlmIChtZXNzYWdlLmVkaXRvcikge1xuXHRcdFx0Y29uc3QgZWRpdG9yID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQobWVzc2FnZS5lZGl0b3IuaWQpO1xuXHRcdFx0ZWRpdGVkQnkgPSB7XG5cdFx0XHRcdF9pZDogZWRpdG9yLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IGVkaXRvci51c2VybmFtZSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Y29uc3QgYXR0YWNobWVudHMgPSB0aGlzLl9jb252ZXJ0QXBwQXR0YWNobWVudHMobWVzc2FnZS5hdHRhY2htZW50cyk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0X2lkOiBtZXNzYWdlLmlkIHx8IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiByb29tLl9pZCxcblx0XHRcdHUsXG5cdFx0XHRtc2c6IG1lc3NhZ2UudGV4dCxcblx0XHRcdHRzOiBtZXNzYWdlLmNyZWF0ZWRBdCB8fCBuZXcgRGF0ZSgpLFxuXHRcdFx0X3VwZGF0ZWRBdDogbWVzc2FnZS51cGRhdGVkQXQgfHwgbmV3IERhdGUoKSxcblx0XHRcdGVkaXRlZEJ5LFxuXHRcdFx0ZWRpdGVkQXQ6IG1lc3NhZ2UuZWRpdGVkQXQsXG5cdFx0XHRlbW9qaTogbWVzc2FnZS5lbW9qaSxcblx0XHRcdGF2YXRhcjogbWVzc2FnZS5hdmF0YXJVcmwsXG5cdFx0XHRhbGlhczogbWVzc2FnZS5hbGlhcyxcblx0XHRcdGN1c3RvbUZpZWxkczogbWVzc2FnZS5jdXN0b21GaWVsZHMsXG5cdFx0XHRhdHRhY2htZW50cyxcblx0XHR9O1xuXHR9XG5cblx0X2NvbnZlcnRBcHBBdHRhY2htZW50cyhhdHRhY2htZW50cykge1xuXHRcdGlmICh0eXBlb2YgYXR0YWNobWVudHMgPT09ICd1bmRlZmluZWQnIHx8ICFBcnJheS5pc0FycmF5KGF0dGFjaG1lbnRzKSkge1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gYXR0YWNobWVudHMubWFwKChhdHRhY2htZW50KSA9PiAoe1xuXHRcdFx0Y29sbGFwc2VkOiBhdHRhY2htZW50LmNvbGxhcHNlZCxcblx0XHRcdGNvbG9yOiBhdHRhY2htZW50LmNvbG9yLFxuXHRcdFx0dGV4dDogYXR0YWNobWVudC50ZXh0LFxuXHRcdFx0dHM6IGF0dGFjaG1lbnQudGltZXN0YW1wLFxuXHRcdFx0bWVzc2FnZV9saW5rOiBhdHRhY2htZW50LnRpbWVzdGFtcExpbmssXG5cdFx0XHR0aHVtYl91cmw6IGF0dGFjaG1lbnQudGh1bWJuYWlsVXJsLFxuXHRcdFx0YXV0aG9yX25hbWU6IGF0dGFjaG1lbnQuYXV0aG9yID8gYXR0YWNobWVudC5hdXRob3IubmFtZSA6IHVuZGVmaW5lZCxcblx0XHRcdGF1dGhvcl9saW5rOiBhdHRhY2htZW50LmF1dGhvciA/IGF0dGFjaG1lbnQuYXV0aG9yLmxpbmsgOiB1bmRlZmluZWQsXG5cdFx0XHRhdXRob3JfaWNvbjogYXR0YWNobWVudC5hdXRob3IgPyBhdHRhY2htZW50LmF1dGhvci5pY29uIDogdW5kZWZpbmVkLFxuXHRcdFx0dGl0bGU6IGF0dGFjaG1lbnQudGl0bGUgPyBhdHRhY2htZW50LnRpdGxlLnZhbHVlIDogdW5kZWZpbmVkLFxuXHRcdFx0dGl0bGVfbGluazogYXR0YWNobWVudC50aXRsZSA/IGF0dGFjaG1lbnQudGl0bGUubGluayA6IHVuZGVmaW5lZCxcblx0XHRcdHRpdGxlX2xpbmtfZG93bmxvYWQ6IGF0dGFjaG1lbnQudGl0bGUgPyBhdHRhY2htZW50LnRpdGxlLmRpc3BsYXlEb3dubG9hZExpbmsgOiB1bmRlZmluZWQsXG5cdFx0XHRpbWFnZV91cmw6IGF0dGFjaG1lbnQuaW1hZ2VVcmwsXG5cdFx0XHRhdWRpb191cmw6IGF0dGFjaG1lbnQuYXVkaW9VcmwsXG5cdFx0XHR2aWRlb191cmw6IGF0dGFjaG1lbnQudmlkZW9VcmwsXG5cdFx0XHRmaWVsZHM6IGF0dGFjaG1lbnQuZmllbGRzLFxuXHRcdFx0dHlwZTogYXR0YWNobWVudC50eXBlLFxuXHRcdFx0ZGVzY3JpcHRpb246IGF0dGFjaG1lbnQuZGVzY3JpcHRpb24sXG5cdFx0fSkpLm1hcCgoYSkgPT4ge1xuXHRcdFx0T2JqZWN0LmtleXMoYSkuZm9yRWFjaCgoaykgPT4ge1xuXHRcdFx0XHRpZiAodHlwZW9mIGFba10gPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIGFba107XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gYTtcblx0XHR9KTtcblx0fVxuXG5cdF9jb252ZXJ0QXR0YWNobWVudHNUb0FwcChhdHRhY2htZW50cykge1xuXHRcdGlmICh0eXBlb2YgYXR0YWNobWVudHMgPT09ICd1bmRlZmluZWQnIHx8ICFBcnJheS5pc0FycmF5KGF0dGFjaG1lbnRzKSkge1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gYXR0YWNobWVudHMubWFwKChhdHRhY2htZW50KSA9PiB7XG5cdFx0XHRsZXQgYXV0aG9yO1xuXHRcdFx0aWYgKGF0dGFjaG1lbnQuYXV0aG9yX25hbWUgfHwgYXR0YWNobWVudC5hdXRob3JfbGluayB8fCBhdHRhY2htZW50LmF1dGhvcl9pY29uKSB7XG5cdFx0XHRcdGF1dGhvciA9IHtcblx0XHRcdFx0XHRuYW1lOiBhdHRhY2htZW50LmF1dGhvcl9uYW1lLFxuXHRcdFx0XHRcdGxpbms6IGF0dGFjaG1lbnQuYXV0aG9yX2xpbmssXG5cdFx0XHRcdFx0aWNvbjogYXR0YWNobWVudC5hdXRob3JfaWNvbixcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0bGV0IHRpdGxlO1xuXHRcdFx0aWYgKGF0dGFjaG1lbnQudGl0bGUgfHwgYXR0YWNobWVudC50aXRsZV9saW5rIHx8IGF0dGFjaG1lbnQudGl0bGVfbGlua19kb3dubG9hZCkge1xuXHRcdFx0XHR0aXRsZSA9IHtcblx0XHRcdFx0XHR2YWx1ZTogYXR0YWNobWVudC50aXRsZSxcblx0XHRcdFx0XHRsaW5rOiBhdHRhY2htZW50LnRpdGxlX2xpbmssXG5cdFx0XHRcdFx0ZGlzcGxheURvd25sb2FkTGluazogYXR0YWNobWVudC50aXRsZV9saW5rX2Rvd25sb2FkLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb2xsYXBzZWQ6IGF0dGFjaG1lbnQuY29sbGFwc2VkLFxuXHRcdFx0XHRjb2xvcjogYXR0YWNobWVudC5jb2xvcixcblx0XHRcdFx0dGV4dDogYXR0YWNobWVudC50ZXh0LFxuXHRcdFx0XHR0aW1lc3RhbXA6IGF0dGFjaG1lbnQudHMsXG5cdFx0XHRcdHRpbWVzdGFtcExpbms6IGF0dGFjaG1lbnQubWVzc2FnZV9saW5rLFxuXHRcdFx0XHR0aHVtYm5haWxVcmw6IGF0dGFjaG1lbnQudGh1bWJfdXJsLFxuXHRcdFx0XHRhdXRob3IsXG5cdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHRpbWFnZVVybDogYXR0YWNobWVudC5pbWFnZV91cmwsXG5cdFx0XHRcdGF1ZGlvVXJsOiBhdHRhY2htZW50LmF1ZGlvX3VybCxcblx0XHRcdFx0dmlkZW9Vcmw6IGF0dGFjaG1lbnQudmlkZW9fdXJsLFxuXHRcdFx0XHRmaWVsZHM6IGF0dGFjaG1lbnQuZmllbGRzLFxuXHRcdFx0XHR0eXBlOiBhdHRhY2htZW50LnR5cGUsXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBhdHRhY2htZW50LmRlc2NyaXB0aW9uLFxuXHRcdFx0fTtcblx0XHR9KTtcblx0fVxufVxuIiwiaW1wb3J0IHsgUm9vbVR5cGUgfSBmcm9tICdAcm9ja2V0LmNoYXQvYXBwcy1lbmdpbmUvZGVmaW5pdGlvbi9yb29tcyc7XG5cbmV4cG9ydCBjbGFzcyBBcHBSb29tc0NvbnZlcnRlciB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLm9yY2ggPSBvcmNoO1xuXHR9XG5cblx0Y29udmVydEJ5SWQocm9vbUlkKSB7XG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cblx0XHRyZXR1cm4gdGhpcy5jb252ZXJ0Um9vbShyb29tKTtcblx0fVxuXG5cdGNvbnZlcnRCeU5hbWUocm9vbU5hbWUpIHtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShyb29tTmFtZSk7XG5cblx0XHRyZXR1cm4gdGhpcy5jb252ZXJ0Um9vbShyb29tKTtcblx0fVxuXG5cdGNvbnZlcnRBcHBSb29tKHJvb20pIHtcblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0bGV0IHU7XG5cdFx0aWYgKHJvb20uY3JlYXRvcikge1xuXHRcdFx0Y29uc3QgY3JlYXRvciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHJvb20uY3JlYXRvci5pZCk7XG5cdFx0XHR1ID0ge1xuXHRcdFx0XHRfaWQ6IGNyZWF0b3IuX2lkLFxuXHRcdFx0XHR1c2VybmFtZTogY3JlYXRvci51c2VybmFtZSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdF9pZDogcm9vbS5pZCxcblx0XHRcdGZuYW1lOiByb29tLmRpc3BsYXlOYW1lLFxuXHRcdFx0bmFtZTogcm9vbS5zbHVnaWZpZWROYW1lLFxuXHRcdFx0dDogcm9vbS50eXBlLFxuXHRcdFx0dSxcblx0XHRcdG1lbWJlcnM6IHJvb20ubWVtYmVycyxcblx0XHRcdGRlZmF1bHQ6IHR5cGVvZiByb29tLmlzRGVmYXVsdCA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IHJvb20uaXNEZWZhdWx0LFxuXHRcdFx0cm86IHR5cGVvZiByb29tLmlzUmVhZE9ubHkgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiByb29tLmlzUmVhZE9ubHksXG5cdFx0XHRzeXNNZXM6IHR5cGVvZiByb29tLmRpc3BsYXlTeXN0ZW1NZXNzYWdlcyA9PT0gJ3VuZGVmaW5lZCcgPyB0cnVlIDogcm9vbS5kaXNwbGF5U3lzdGVtTWVzc2FnZXMsXG5cdFx0XHRtc2dzOiByb29tLm1lc3NhZ2VDb3VudCB8fCAwLFxuXHRcdFx0dHM6IHJvb20uY3JlYXRlZEF0LFxuXHRcdFx0X3VwZGF0ZWRBdDogcm9vbS51cGRhdGVkQXQsXG5cdFx0XHRsbTogcm9vbS5sYXN0TW9kaWZpZWRBdCxcblx0XHR9O1xuXHR9XG5cblx0Y29udmVydFJvb20ocm9vbSkge1xuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRsZXQgY3JlYXRvcjtcblx0XHRpZiAocm9vbS51KSB7XG5cdFx0XHRjcmVhdG9yID0gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3VzZXJzJykuY29udmVydEJ5SWQocm9vbS51Ll9pZCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGlkOiByb29tLl9pZCxcblx0XHRcdGRpc3BsYXlOYW1lOiByb29tLmZuYW1lLFxuXHRcdFx0c2x1Z2lmaWVkTmFtZTogcm9vbS5uYW1lLFxuXHRcdFx0dHlwZTogdGhpcy5fY29udmVydFR5cGVUb0FwcChyb29tLnQpLFxuXHRcdFx0Y3JlYXRvcixcblx0XHRcdG1lbWJlcnM6IHJvb20ubWVtYmVycyxcblx0XHRcdGlzRGVmYXVsdDogdHlwZW9mIHJvb20uZGVmYXVsdCA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IHJvb20uZGVmYXVsdCxcblx0XHRcdGlzUmVhZE9ubHk6IHR5cGVvZiByb29tLnJvID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogcm9vbS5ybyxcblx0XHRcdGRpc3BsYXlTeXN0ZW1NZXNzYWdlczogdHlwZW9mIHJvb20uc3lzTWVzID09PSAndW5kZWZpbmVkJyA/IHRydWUgOiByb29tLnN5c01lcyxcblx0XHRcdG1lc3NhZ2VDb3VudDogcm9vbS5tc2dzLFxuXHRcdFx0Y3JlYXRlZEF0OiByb29tLnRzLFxuXHRcdFx0dXBkYXRlZEF0OiByb29tLl91cGRhdGVkQXQsXG5cdFx0XHRsYXN0TW9kaWZpZWRBdDogcm9vbS5sbSxcblx0XHRcdGN1c3RvbUZpZWxkczoge30sXG5cdFx0fTtcblx0fVxuXG5cdF9jb252ZXJ0VHlwZVRvQXBwKHR5cGVDaGFyKSB7XG5cdFx0c3dpdGNoICh0eXBlQ2hhcikge1xuXHRcdFx0Y2FzZSAnYyc6XG5cdFx0XHRcdHJldHVybiBSb29tVHlwZS5DSEFOTkVMO1xuXHRcdFx0Y2FzZSAncCc6XG5cdFx0XHRcdHJldHVybiBSb29tVHlwZS5QUklWQVRFX0dST1VQO1xuXHRcdFx0Y2FzZSAnZCc6XG5cdFx0XHRcdHJldHVybiBSb29tVHlwZS5ESVJFQ1RfTUVTU0FHRTtcblx0XHRcdGNhc2UgJ2xjJzpcblx0XHRcdFx0cmV0dXJuIFJvb21UeXBlLkxJVkVfQ0hBVDtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiB0eXBlQ2hhcjtcblx0XHR9XG5cdH1cbn1cbiIsImltcG9ydCB7IFNldHRpbmdUeXBlIH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL2RlZmluaXRpb24vc2V0dGluZ3MnO1xuXG5leHBvcnQgY2xhc3MgQXBwU2V0dGluZ3NDb252ZXJ0ZXIge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0fVxuXG5cdGNvbnZlcnRCeUlkKHNldHRpbmdJZCkge1xuXHRcdGNvbnN0IHNldHRpbmcgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lQnlJZChzZXR0aW5nSWQpO1xuXG5cdFx0cmV0dXJuIHRoaXMuY29udmVydFRvQXBwKHNldHRpbmcpO1xuXHR9XG5cblx0Y29udmVydFRvQXBwKHNldHRpbmcpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aWQ6IHNldHRpbmcuX2lkLFxuXHRcdFx0dHlwZTogdGhpcy5fY29udmVydFR5cGVUb0FwcChzZXR0aW5nLnR5cGUpLFxuXHRcdFx0cGFja2FnZVZhbHVlOiBzZXR0aW5nLnBhY2thZ2VWYWx1ZSxcblx0XHRcdHZhbHVlczogc2V0dGluZy52YWx1ZXMsXG5cdFx0XHR2YWx1ZTogc2V0dGluZy52YWx1ZSxcblx0XHRcdHB1YmxpYzogc2V0dGluZy5wdWJsaWMsXG5cdFx0XHRoaWRkZW46IHNldHRpbmcuaGlkZGVuLFxuXHRcdFx0Z3JvdXA6IHNldHRpbmcuZ3JvdXAsXG5cdFx0XHRpMThuTGFiZWw6IHNldHRpbmcuaTE4bkxhYmVsLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiBzZXR0aW5nLmkxOG5EZXNjcmlwdGlvbixcblx0XHRcdGNyZWF0ZWRBdDogc2V0dGluZy50cyxcblx0XHRcdHVwZGF0ZWRBdDogc2V0dGluZy5fdXBkYXRlZEF0LFxuXHRcdH07XG5cdH1cblxuXHRfY29udmVydFR5cGVUb0FwcCh0eXBlKSB7XG5cdFx0c3dpdGNoICh0eXBlKSB7XG5cdFx0XHRjYXNlICdib29sZWFuJzpcblx0XHRcdFx0cmV0dXJuIFNldHRpbmdUeXBlLkJPT0xFQU47XG5cdFx0XHRjYXNlICdjb2RlJzpcblx0XHRcdFx0cmV0dXJuIFNldHRpbmdUeXBlLkNPREU7XG5cdFx0XHRjYXNlICdjb2xvcic6XG5cdFx0XHRcdHJldHVybiBTZXR0aW5nVHlwZS5DT0xPUjtcblx0XHRcdGNhc2UgJ2ZvbnQnOlxuXHRcdFx0XHRyZXR1cm4gU2V0dGluZ1R5cGUuRk9OVDtcblx0XHRcdGNhc2UgJ2ludCc6XG5cdFx0XHRcdHJldHVybiBTZXR0aW5nVHlwZS5OVU1CRVI7XG5cdFx0XHRjYXNlICdzZWxlY3QnOlxuXHRcdFx0XHRyZXR1cm4gU2V0dGluZ1R5cGUuU0VMRUNUO1xuXHRcdFx0Y2FzZSAnc3RyaW5nJzpcblx0XHRcdFx0cmV0dXJuIFNldHRpbmdUeXBlLlNUUklORztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiB0eXBlO1xuXHRcdH1cblx0fVxufVxuIiwiaW1wb3J0IHsgVXNlclN0YXR1c0Nvbm5lY3Rpb24sIFVzZXJUeXBlIH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL2RlZmluaXRpb24vdXNlcnMnO1xuXG5leHBvcnQgY2xhc3MgQXBwVXNlcnNDb252ZXJ0ZXIge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0fVxuXG5cdGNvbnZlcnRCeUlkKHVzZXJJZCkge1xuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpO1xuXG5cdFx0cmV0dXJuIHRoaXMuY29udmVydFRvQXBwKHVzZXIpO1xuXHR9XG5cblx0Y29udmVydEJ5VXNlcm5hbWUodXNlcm5hbWUpIHtcblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUpO1xuXG5cdFx0cmV0dXJuIHRoaXMuY29udmVydFRvQXBwKHVzZXIpO1xuXHR9XG5cblx0Y29udmVydFRvQXBwKHVzZXIpIHtcblx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdHlwZSA9IHRoaXMuX2NvbnZlcnRVc2VyVHlwZVRvRW51bSh1c2VyLnR5cGUpO1xuXHRcdGNvbnN0IHN0YXR1c0Nvbm5lY3Rpb24gPSB0aGlzLl9jb252ZXJ0U3RhdHVzQ29ubmVjdGlvblRvRW51bSh1c2VyLnVzZXJuYW1lLCB1c2VyLl9pZCwgdXNlci5zdGF0dXNDb25uZWN0aW9uKTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRpZDogdXNlci5faWQsXG5cdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZSxcblx0XHRcdGVtYWlsczogdXNlci5lbWFpbHMsXG5cdFx0XHR0eXBlLFxuXHRcdFx0aXNFbmFibGVkOiB1c2VyLmFjdGl2ZSxcblx0XHRcdG5hbWU6IHVzZXIubmFtZSxcblx0XHRcdHJvbGVzOiB1c2VyLnJvbGVzLFxuXHRcdFx0c3RhdHVzOiB1c2VyLnN0YXR1cyxcblx0XHRcdHN0YXR1c0Nvbm5lY3Rpb24sXG5cdFx0XHR1dGNPZmZzZXQ6IHVzZXIudXRjT2Zmc2V0LFxuXHRcdFx0Y3JlYXRlZEF0OiB1c2VyLmNyZWF0ZWRBdCxcblx0XHRcdHVwZGF0ZWRBdDogdXNlci5fdXBkYXRlZEF0LFxuXHRcdFx0bGFzdExvZ2luQXQ6IHVzZXIubGFzdExvZ2luLFxuXHRcdH07XG5cdH1cblxuXHRfY29udmVydFVzZXJUeXBlVG9FbnVtKHR5cGUpIHtcblx0XHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRcdGNhc2UgJ3VzZXInOlxuXHRcdFx0XHRyZXR1cm4gVXNlclR5cGUuVVNFUjtcblx0XHRcdGNhc2UgJ2JvdCc6XG5cdFx0XHRcdHJldHVybiBVc2VyVHlwZS5CT1Q7XG5cdFx0XHRjYXNlICcnOlxuXHRcdFx0Y2FzZSB1bmRlZmluZWQ6XG5cdFx0XHRcdHJldHVybiBVc2VyVHlwZS5VTktOT1dOO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0Y29uc29sZS53YXJuKGBBIG5ldyB1c2VyIHR5cGUgaGFzIGJlZW4gYWRkZWQgdGhhdCB0aGUgQXBwcyBkb24ndCBrbm93IGFib3V0PyBcIiR7IHR5cGUgfVwiYCk7XG5cdFx0XHRcdHJldHVybiB0eXBlLnRvVXBwZXJDYXNlKCk7XG5cdFx0fVxuXHR9XG5cblx0X2NvbnZlcnRTdGF0dXNDb25uZWN0aW9uVG9FbnVtKHVzZXJuYW1lLCB1c2VySWQsIHN0YXR1cykge1xuXHRcdHN3aXRjaCAoc3RhdHVzKSB7XG5cdFx0XHRjYXNlICdvZmZsaW5lJzpcblx0XHRcdFx0cmV0dXJuIFVzZXJTdGF0dXNDb25uZWN0aW9uLk9GRkxJTkU7XG5cdFx0XHRjYXNlICdvbmxpbmUnOlxuXHRcdFx0XHRyZXR1cm4gVXNlclN0YXR1c0Nvbm5lY3Rpb24uT05MSU5FO1xuXHRcdFx0Y2FzZSAnYXdheSc6XG5cdFx0XHRcdHJldHVybiBVc2VyU3RhdHVzQ29ubmVjdGlvbi5BV0FZO1xuXHRcdFx0Y2FzZSAnYnVzeSc6XG5cdFx0XHRcdHJldHVybiBVc2VyU3RhdHVzQ29ubmVjdGlvbi5CVVNZO1xuXHRcdFx0Y2FzZSB1bmRlZmluZWQ6XG5cdFx0XHRcdC8vIFRoaXMgaXMgbmVlZGVkIGZvciBMaXZlY2hhdCBndWVzdHMgYW5kIFJvY2tldC5DYXQgdXNlci5cblx0XHRcdFx0cmV0dXJuIFVzZXJTdGF0dXNDb25uZWN0aW9uLlVOREVGSU5FRDtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGNvbnNvbGUud2FybihgVGhlIHVzZXIgJHsgdXNlcm5hbWUgfSAoJHsgdXNlcklkIH0pIGRvZXMgbm90IGhhdmUgYSB2YWxpZCBzdGF0dXMgKG9mZmxpbmUsIG9ubGluZSwgYXdheSwgb3IgYnVzeSkuIEl0IGlzIGN1cnJlbnRseTogXCIkeyBzdGF0dXMgfVwiYCk7XG5cdFx0XHRcdHJldHVybiAhc3RhdHVzID8gVXNlclN0YXR1c0Nvbm5lY3Rpb24uT0ZGTElORSA6IHN0YXR1cy50b1VwcGVyQ2FzZSgpO1xuXHRcdH1cblx0fVxufVxuIiwiaW1wb3J0IHsgQXBwTWVzc2FnZXNDb252ZXJ0ZXIgfSBmcm9tICcuL21lc3NhZ2VzJztcbmltcG9ydCB7IEFwcFJvb21zQ29udmVydGVyIH0gZnJvbSAnLi9yb29tcyc7XG5pbXBvcnQgeyBBcHBTZXR0aW5nc0NvbnZlcnRlciB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHsgQXBwVXNlcnNDb252ZXJ0ZXIgfSBmcm9tICcuL3VzZXJzJztcblxuZXhwb3J0IHtcblx0QXBwTWVzc2FnZXNDb252ZXJ0ZXIsXG5cdEFwcFJvb21zQ29udmVydGVyLFxuXHRBcHBTZXR0aW5nc0NvbnZlcnRlcixcblx0QXBwVXNlcnNDb252ZXJ0ZXIsXG59O1xuIiwiaW1wb3J0IHsgUmVhbEFwcEJyaWRnZXMgfSBmcm9tICcuL2JyaWRnZXMnO1xuaW1wb3J0IHsgQXBwTWV0aG9kcywgQXBwc1Jlc3RBcGksIEFwcFNlcnZlck5vdGlmaWVyIH0gZnJvbSAnLi9jb21tdW5pY2F0aW9uJztcbmltcG9ydCB7IEFwcE1lc3NhZ2VzQ29udmVydGVyLCBBcHBSb29tc0NvbnZlcnRlciwgQXBwU2V0dGluZ3NDb252ZXJ0ZXIsIEFwcFVzZXJzQ29udmVydGVyIH0gZnJvbSAnLi9jb252ZXJ0ZXJzJztcbmltcG9ydCB7IEFwcHNMb2dzTW9kZWwsIEFwcHNNb2RlbCwgQXBwc1BlcnNpc3RlbmNlTW9kZWwsIEFwcFJlYWxTdG9yYWdlLCBBcHBSZWFsTG9nc1N0b3JhZ2UgfSBmcm9tICcuL3N0b3JhZ2UnO1xuXG5pbXBvcnQgeyBBcHBNYW5hZ2VyIH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL3NlcnZlci9BcHBNYW5hZ2VyJztcblxuY2xhc3MgQXBwU2VydmVyT3JjaGVzdHJhdG9yIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0aWYgKFJvY2tldENoYXQubW9kZWxzICYmIFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5jcmVhdGVPclVwZGF0ZSgnbWFuYWdlLWFwcHMnLCBbJ2FkbWluJ10pO1xuXHRcdH1cblxuXHRcdHRoaXMuX21vZGVsID0gbmV3IEFwcHNNb2RlbCgpO1xuXHRcdHRoaXMuX2xvZ01vZGVsID0gbmV3IEFwcHNMb2dzTW9kZWwoKTtcblx0XHR0aGlzLl9wZXJzaXN0TW9kZWwgPSBuZXcgQXBwc1BlcnNpc3RlbmNlTW9kZWwoKTtcblx0XHR0aGlzLl9zdG9yYWdlID0gbmV3IEFwcFJlYWxTdG9yYWdlKHRoaXMuX21vZGVsKTtcblx0XHR0aGlzLl9sb2dTdG9yYWdlID0gbmV3IEFwcFJlYWxMb2dzU3RvcmFnZSh0aGlzLl9sb2dNb2RlbCk7XG5cblx0XHR0aGlzLl9jb252ZXJ0ZXJzID0gbmV3IE1hcCgpO1xuXHRcdHRoaXMuX2NvbnZlcnRlcnMuc2V0KCdtZXNzYWdlcycsIG5ldyBBcHBNZXNzYWdlc0NvbnZlcnRlcih0aGlzKSk7XG5cdFx0dGhpcy5fY29udmVydGVycy5zZXQoJ3Jvb21zJywgbmV3IEFwcFJvb21zQ29udmVydGVyKHRoaXMpKTtcblx0XHR0aGlzLl9jb252ZXJ0ZXJzLnNldCgnc2V0dGluZ3MnLCBuZXcgQXBwU2V0dGluZ3NDb252ZXJ0ZXIodGhpcykpO1xuXHRcdHRoaXMuX2NvbnZlcnRlcnMuc2V0KCd1c2VycycsIG5ldyBBcHBVc2Vyc0NvbnZlcnRlcih0aGlzKSk7XG5cblx0XHR0aGlzLl9icmlkZ2VzID0gbmV3IFJlYWxBcHBCcmlkZ2VzKHRoaXMpO1xuXG5cdFx0dGhpcy5fbWFuYWdlciA9IG5ldyBBcHBNYW5hZ2VyKHRoaXMuX3N0b3JhZ2UsIHRoaXMuX2xvZ1N0b3JhZ2UsIHRoaXMuX2JyaWRnZXMpO1xuXG5cdFx0dGhpcy5fY29tbXVuaWNhdG9ycyA9IG5ldyBNYXAoKTtcblx0XHR0aGlzLl9jb21tdW5pY2F0b3JzLnNldCgnbWV0aG9kcycsIG5ldyBBcHBNZXRob2RzKHRoaXMpKTtcblx0XHR0aGlzLl9jb21tdW5pY2F0b3JzLnNldCgnbm90aWZpZXInLCBuZXcgQXBwU2VydmVyTm90aWZpZXIodGhpcykpO1xuXHRcdHRoaXMuX2NvbW11bmljYXRvcnMuc2V0KCdyZXN0YXBpJywgbmV3IEFwcHNSZXN0QXBpKHRoaXMsIHRoaXMuX21hbmFnZXIpKTtcblx0fVxuXG5cdGdldE1vZGVsKCkge1xuXHRcdHJldHVybiB0aGlzLl9tb2RlbDtcblx0fVxuXG5cdGdldFBlcnNpc3RlbmNlTW9kZWwoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3BlcnNpc3RNb2RlbDtcblx0fVxuXG5cdGdldFN0b3JhZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3N0b3JhZ2U7XG5cdH1cblxuXHRnZXRMb2dTdG9yYWdlKCkge1xuXHRcdHJldHVybiB0aGlzLl9sb2dTdG9yYWdlO1xuXHR9XG5cblx0Z2V0Q29udmVydGVycygpIHtcblx0XHRyZXR1cm4gdGhpcy5fY29udmVydGVycztcblx0fVxuXG5cdGdldEJyaWRnZXMoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2JyaWRnZXM7XG5cdH1cblxuXHRnZXROb3RpZmllcigpIHtcblx0XHRyZXR1cm4gdGhpcy5fY29tbXVuaWNhdG9ycy5nZXQoJ25vdGlmaWVyJyk7XG5cdH1cblxuXHRnZXRNYW5hZ2VyKCkge1xuXHRcdHJldHVybiB0aGlzLl9tYW5hZ2VyO1xuXHR9XG5cblx0aXNFbmFibGVkKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQXBwc19GcmFtZXdvcmtfZW5hYmxlZCcpO1xuXHR9XG5cblx0aXNMb2FkZWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0TWFuYWdlcigpLmFyZUFwcHNMb2FkZWQoKTtcblx0fVxuXG5cdGxvYWQoKSB7XG5cdFx0Ly8gRG9uJ3QgdHJ5IHRvIGxvYWQgaXQgYWdhaW4gaWYgaXQgaGFzXG5cdFx0Ly8gYWxyZWFkeSBiZWVuIGxvYWRlZFxuXHRcdGlmICh0aGlzLmlzTG9hZGVkKCkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0aGlzLl9tYW5hZ2VyLmxvYWQoKVxuXHRcdFx0LnRoZW4oKGFmZnMpID0+IGNvbnNvbGUubG9nKGBMb2FkZWQgdGhlIEFwcHMgRnJhbWV3b3JrIGFuZCBsb2FkZWQgYSB0b3RhbCBvZiAkeyBhZmZzLmxlbmd0aCB9IEFwcHMhYCkpXG5cdFx0XHQuY2F0Y2goKGVycikgPT4gY29uc29sZS53YXJuKCdGYWlsZWQgdG8gbG9hZCB0aGUgQXBwcyBGcmFtZXdvcmsgYW5kIEFwcHMhJywgZXJyKSk7XG5cdH1cblxuXHR1bmxvYWQoKSB7XG5cdFx0Ly8gRG9uJ3QgdHJ5IHRvIHVubG9hZCBpdCBpZiBpdCdzIGFscmVhZHkgYmVlblxuXHRcdC8vIHVubGFvZGVkIG9yIHdhc24ndCB1bmxvYWRlZCB0byBzdGFydCB3aXRoXG5cdFx0aWYgKCF0aGlzLmlzTG9hZGVkKCkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0aGlzLl9tYW5hZ2VyLnVubG9hZCgpXG5cdFx0XHQudGhlbigoKSA9PiBjb25zb2xlLmxvZygnVW5sb2FkZWQgdGhlIEFwcHMgRnJhbWV3b3JrLicpKVxuXHRcdFx0LmNhdGNoKChlcnIpID0+IGNvbnNvbGUud2FybignRmFpbGVkIHRvIHVubG9hZCB0aGUgQXBwcyBGcmFtZXdvcmshJywgZXJyKSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0FwcHNfRnJhbWV3b3JrX2VuYWJsZWQnLCBmYWxzZSwge1xuXHR0eXBlOiAnYm9vbGVhbicsXG5cdGhpZGRlbjogdHJ1ZSxcbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQXBwc19GcmFtZXdvcmtfZW5hYmxlZCcsIChrZXksIGlzRW5hYmxlZCkgPT4ge1xuXHQvLyBJbiBjYXNlIHRoaXMgZ2V0cyBjYWxsZWQgYmVmb3JlIGBNZXRlb3Iuc3RhcnR1cGBcblx0aWYgKCFnbG9iYWwuQXBwcykge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmIChpc0VuYWJsZWQpIHtcblx0XHRnbG9iYWwuQXBwcy5sb2FkKCk7XG5cdH0gZWxzZSB7XG5cdFx0Z2xvYmFsLkFwcHMudW5sb2FkKCk7XG5cdH1cbn0pO1xuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbiBfYXBwU2VydmVyT3JjaGVzdHJhdG9yKCkge1xuXHRnbG9iYWwuQXBwcyA9IG5ldyBBcHBTZXJ2ZXJPcmNoZXN0cmF0b3IoKTtcblxuXHRpZiAoZ2xvYmFsLkFwcHMuaXNFbmFibGVkKCkpIHtcblx0XHRnbG9iYWwuQXBwcy5sb2FkKCk7XG5cdH1cbn0pO1xuIl19
