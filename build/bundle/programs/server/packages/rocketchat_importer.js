(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var check = Package.check.check;
var Match = Package.check.Match;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:importer":{"server":{"classes":{"ImporterBase.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/classes/ImporterBase.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Base: () => Base
});
let Progress;
module.watch(require("./ImporterProgress"), {
  Progress(v) {
    Progress = v;
  }

}, 0);
let ProgressStep;
module.watch(require("../../lib/ImporterProgressStep"), {
  ProgressStep(v) {
    ProgressStep = v;
  }

}, 1);
let Selection;
module.watch(require("./ImporterSelection"), {
  Selection(v) {
    Selection = v;
  }

}, 2);
let Imports;
module.watch(require("../models/Imports"), {
  Imports(v) {
    Imports = v;
  }

}, 3);
let ImporterInfo;
module.watch(require("../../lib/ImporterInfo"), {
  ImporterInfo(v) {
    ImporterInfo = v;
  }

}, 4);
let RawImports;
module.watch(require("../models/RawImports"), {
  RawImports(v) {
    RawImports = v;
  }

}, 5);
let ImporterWebsocket;
module.watch(require("./ImporterWebsocket"), {
  ImporterWebsocket(v) {
    ImporterWebsocket = v;
  }

}, 6);
let http;
module.watch(require("http"), {
  default(v) {
    http = v;
  }

}, 7);
let https;
module.watch(require("https"), {
  default(v) {
    https = v;
  }

}, 8);
let AdmZip;
module.watch(require("adm-zip"), {
  default(v) {
    AdmZip = v;
  }

}, 9);
let getFileType;
module.watch(require("file-type"), {
  default(v) {
    getFileType = v;
  }

}, 10);

class Base {
  /**
   * The max BSON object size we can store in MongoDB is 16777216 bytes
   * but for some reason the mongo instanace which comes with Meteor
   * errors out for anything close to that size. So, we are rounding it
   * down to 8000000 bytes.
   *
   * @param {any} item The item to calculate the BSON size of.
   * @returns {number} The size of the item passed in.
   * @static
   */
  static getBSONSize(item) {
    const {
      BSON
    } = require('bson');

    const bson = new BSON();
    return bson.calculateObjectSize(item);
  }
  /**
   * The max BSON object size we can store in MongoDB is 16777216 bytes
   * but for some reason the mongo instanace which comes with Meteor
   * errors out for anything close to that size. So, we are rounding it
   * down to 8000000 bytes.
   *
   * @returns {number} 8000000 bytes.
   */


  static getMaxBSONSize() {
    return 8000000;
  }
  /**
   * Splits the passed in array to at least one array which has a size that
   * is safe to store in the database.
   *
   * @param {any[]} theArray The array to split out
   * @returns {any[][]} The safe sized arrays
   * @static
   */


  static getBSONSafeArraysFromAnArray(theArray) {
    const BSONSize = Base.getBSONSize(theArray);
    const maxSize = Math.floor(theArray.length / Math.ceil(BSONSize / Base.getMaxBSONSize()));
    const safeArrays = [];
    let i = 0;

    while (i < theArray.length) {
      safeArrays.push(theArray.slice(i, i += maxSize));
    }

    return safeArrays;
  }
  /**
   * Constructs a new importer, adding an empty collection, AdmZip property, and empty users & channels
   *
   * @param {string} name The importer's name.
   * @param {string} description The i18n string which describes the importer
   * @param {string} mimeType The expected file type.
   */


  constructor(info) {
    if (!(info instanceof ImporterInfo)) {
      throw new Error('Information passed in must be a valid ImporterInfo instance.');
    }

    this.http = http;
    this.https = https;
    this.AdmZip = AdmZip;
    this.getFileType = getFileType;
    this.prepare = this.prepare.bind(this);
    this.startImport = this.startImport.bind(this);
    this.getSelection = this.getSelection.bind(this);
    this.getProgress = this.getProgress.bind(this);
    this.updateProgress = this.updateProgress.bind(this);
    this.addCountToTotal = this.addCountToTotal.bind(this);
    this.addCountCompleted = this.addCountCompleted.bind(this);
    this.updateRecord = this.updateRecord.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.info = info;
    this.logger = new Logger(`${this.info.name} Importer`, {});
    this.progress = new Progress(this.info.key, this.info.name);
    this.collection = RawImports;
    const importId = Imports.insert({
      type: this.info.name,
      ts: Date.now(),
      status: this.progress.step,
      valid: true,
      user: Meteor.user()._id
    });
    this.importRecord = Imports.findOne(importId);
    this.users = {};
    this.channels = {};
    this.messages = {};
    this.oldSettings = {};
    this.logger.debug(`Constructed a new ${info.name} Importer.`);
  }
  /**
   * Takes the uploaded file and extracts the users, channels, and messages from it.
   *
   * @param {string} dataURI Base64 string of the uploaded file
   * @param {string} sentContentType The sent file type.
   * @param {string} fileName The name of the uploaded file.
   * @param {boolean} skipTypeCheck Optional property that says to not check the type provided.
   * @returns {Progress} The progress record of the import.
   */


  prepare(dataURI, sentContentType, fileName, skipTypeCheck) {
    if (!skipTypeCheck) {
      const fileType = this.getFileType(new Buffer(dataURI.split(',')[1], 'base64'));
      this.logger.debug('Uploaded file information is:', fileType);
      this.logger.debug('Expected file type is:', this.info.mimeType);

      if (!fileType || fileType.mime !== this.info.mimeType) {
        this.logger.warn(`Invalid file uploaded for the ${this.info.name} importer.`);
        this.updateProgress(ProgressStep.ERROR);
        throw new Meteor.Error('error-invalid-file-uploaded', `Invalid file uploaded to import ${this.info.name} data from.`, {
          step: 'prepare'
        });
      }
    }

    this.updateProgress(ProgressStep.PREPARING_STARTED);
    return this.updateRecord({
      file: fileName
    });
  }
  /**
   * Starts the import process. The implementing method should defer
   * as soon as the selection is set, so the user who started the process
   * doesn't end up with a "locked" UI while Meteor waits for a response.
   * The returned object should be the progress.
   *
   * @param {Selection} importSelection The selection data.
   * @returns {Progress} The progress record of the import.
   */


  startImport(importSelection) {
    if (!(importSelection instanceof Selection)) {
      throw new Error(`Invalid Selection data provided to the ${this.info.name} importer.`);
    } else if (importSelection.users === undefined) {
      throw new Error(`Users in the selected data wasn't found, it must but at least an empty array for the ${this.info.name} importer.`);
    } else if (importSelection.channels === undefined) {
      throw new Error(`Channels in the selected data wasn't found, it must but at least an empty array for the ${this.info.name} importer.`);
    }

    return this.updateProgress(ProgressStep.IMPORTING_STARTED);
  }
  /**
   * Gets the Selection object for the import.
   *
   * @returns {Selection} The users and channels selection
   */


  getSelection() {
    throw new Error(`Invalid 'getSelection' called on ${this.info.name}, it must be overridden and super can not be called.`);
  }
  /**
   * Gets the progress of this import.
   *
   * @returns {Progress} The progress record of the import.
   */


  getProgress() {
    return this.progress;
  }
  /**
   * Updates the progress step of this importer.
   * It also changes some internal settings at various stages of the import.
   * This way the importer can adjust user/room information at will.
   *
   * @param {ProgressStep} step The progress step which this import is currently at.
   * @returns {Progress} The progress record of the import.
   */


  updateProgress(step) {
    this.progress.step = step;

    switch (step) {
      case ProgressStep.IMPORTING_STARTED:
        this.oldSettings.Accounts_AllowedDomainsList = RocketChat.models.Settings.findOneById('Accounts_AllowedDomainsList').value;
        RocketChat.models.Settings.updateValueById('Accounts_AllowedDomainsList', '');
        this.oldSettings.Accounts_AllowUsernameChange = RocketChat.models.Settings.findOneById('Accounts_AllowUsernameChange').value;
        RocketChat.models.Settings.updateValueById('Accounts_AllowUsernameChange', true);
        this.oldSettings.FileUpload_MaxFileSize = RocketChat.models.Settings.findOneById('FileUpload_MaxFileSize').value;
        RocketChat.models.Settings.updateValueById('FileUpload_MaxFileSize', -1);
        break;

      case ProgressStep.DONE:
      case ProgressStep.ERROR:
        RocketChat.models.Settings.updateValueById('Accounts_AllowedDomainsList', this.oldSettings.Accounts_AllowedDomainsList);
        RocketChat.models.Settings.updateValueById('Accounts_AllowUsernameChange', this.oldSettings.Accounts_AllowUsernameChange);
        RocketChat.models.Settings.updateValueById('FileUpload_MaxFileSize', this.oldSettings.FileUpload_MaxFileSize);
        break;
    }

    this.logger.debug(`${this.info.name} is now at ${step}.`);
    this.updateRecord({
      status: this.progress.step
    });
    ImporterWebsocket.progressUpdated(this.progress);
    return this.progress;
  }
  /**
   * Adds the passed in value to the total amount of items needed to complete.
   *
   * @param {number} count The amount to add to the total count of items.
   * @returns {Progress} The progress record of the import.
   */


  addCountToTotal(count) {
    this.progress.count.total = this.progress.count.total + count;
    this.updateRecord({
      'count.total': this.progress.count.total
    });
    return this.progress;
  }
  /**
   * Adds the passed in value to the total amount of items completed.
   *
   * @param {number} count The amount to add to the total count of finished items.
   * @returns {Progress} The progress record of the import.
   */


  addCountCompleted(count) {
    this.progress.count.completed = this.progress.count.completed + count; // Only update the database every 500 records
    // Or the completed is greater than or equal to the total amount

    if (this.progress.count.completed % 500 === 0 || this.progress.count.completed >= this.progress.count.total) {
      this.updateRecord({
        'count.completed': this.progress.count.completed
      });
    }

    ImporterWebsocket.progressUpdated(this.progress);
    return this.progress;
  }
  /**
   * Updates the import record with the given fields being `set`.
   *
   * @param {any} fields The fields to set, it should be an object with key/values.
   * @returns {Imports} The import record.
   */


  updateRecord(fields) {
    Imports.update({
      _id: this.importRecord._id
    }, {
      $set: fields
    });
    this.importRecord = Imports.findOne(this.importRecord._id);
    return this.importRecord;
  }
  /**
   * Uploads the file to the storage.
   *
   * @param {any} details An object with details about the upload: `name`, `size`, `type`, and `rid`.
   * @param {string} fileUrl Url of the file to download/import.
   * @param {any} user The Rocket.Chat user.
   * @param {any} room The Rocket.Chat Room.
   * @param {Date} timeStamp The timestamp the file was uploaded
   */


  uploadFile(details, fileUrl, user, room, timeStamp) {
    this.logger.debug(`Uploading the file ${details.name} from ${fileUrl}.`);
    const requestModule = /https/i.test(fileUrl) ? this.https : this.http;
    const fileStore = FileUpload.getStore('Uploads');
    return requestModule.get(fileUrl, Meteor.bindEnvironment(function (res) {
      const rawData = [];
      res.on('data', chunk => rawData.push(chunk));
      res.on('end', Meteor.bindEnvironment(() => {
        fileStore.insert(details, Buffer.concat(rawData), function (err, file) {
          if (err) {
            throw new Error(err);
          } else {
            const url = file.url.replace(Meteor.absoluteUrl(), '/');
            const attachment = {
              title: file.name,
              title_link: url
            };

            if (/^image\/.+/.test(file.type)) {
              attachment.image_url = url;
              attachment.image_type = file.type;
              attachment.image_size = file.size;
              attachment.image_dimensions = file.identify != null ? file.identify.size : undefined;
            }

            if (/^audio\/.+/.test(file.type)) {
              attachment.audio_url = url;
              attachment.audio_type = file.type;
              attachment.audio_size = file.size;
            }

            if (/^video\/.+/.test(file.type)) {
              attachment.video_url = url;
              attachment.video_type = file.type;
              attachment.video_size = file.size;
            }

            const msg = {
              rid: details.rid,
              ts: timeStamp,
              msg: '',
              file: {
                _id: file._id
              },
              groupable: false,
              attachments: [attachment]
            };

            if (details.message_id != null && typeof details.message_id === 'string') {
              msg._id = details.message_id;
            }

            return RocketChat.sendMessage(user, msg, room, true);
          }
        });
      }));
    }));
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ImporterProgress.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/classes/ImporterProgress.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Progress: () => Progress
});
let ProgressStep;
module.watch(require("../../lib/ImporterProgressStep"), {
  ProgressStep(v) {
    ProgressStep = v;
  }

}, 0);

class Progress {
  /**
   * Creates a new progress container for the importer.
   *
   * @param {string} key The unique key of the importer.
   * @param {string} name The name of the importer.
   */
  constructor(key, name) {
    this.key = key;
    this.name = name;
    this.step = ProgressStep.NEW;
    this.count = {
      completed: 0,
      total: 0
    };
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ImporterSelection.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/classes/ImporterSelection.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Selection: () => Selection
});

class Selection {
  /**
   * Constructs a new importer selection object.
   *
   * @param {string} name the name of the importer
   * @param {SelectionUser[]} users the users which can be selected
   * @param {SelectionChannel[]} channels the channels which can be selected
   * @param {number} message_count the number of messages
   */
  constructor(name, users, channels, message_count) {
    this.name = name;
    this.users = users;
    this.channels = channels;
    this.message_count = message_count;
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ImporterSelectionChannel.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/classes/ImporterSelectionChannel.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  SelectionChannel: () => SelectionChannel
});

class SelectionChannel {
  /**
   * Constructs a new selection channel.
   *
   * @param {string} channel_id the unique identifier of the channel
   * @param {string} name the name of the channel
   * @param {boolean} is_archived whether the channel was archived or not
   * @param {boolean} do_import whether we will be importing the channel or not
   * @param {boolean} is_private whether the channel is private or public
   */
  constructor(channel_id, name, is_archived, do_import, is_private) {
    this.channel_id = channel_id;
    this.name = name;
    this.is_archived = is_archived;
    this.do_import = do_import;
    this.is_private = is_private;
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ImporterSelectionUser.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/classes/ImporterSelectionUser.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  SelectionUser: () => SelectionUser
});

class SelectionUser {
  /**
   * Constructs a new selection user.
   *
   * @param {string} user_id the unique user identifier
   * @param {string} username the user's username
   * @param {string} email the user's email
   * @param {boolean} is_deleted whether the user was deleted or not
   * @param {boolean} is_bot whether the user is a bot or not
   * @param {boolean} do_import whether we are going to import this user or not
   */
  constructor(user_id, username, email, is_deleted, is_bot, do_import) {
    this.user_id = user_id;
    this.username = username;
    this.email = email;
    this.is_deleted = is_deleted;
    this.is_bot = is_bot;
    this.do_import = do_import;
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ImporterWebsocket.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/classes/ImporterWebsocket.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ImporterWebsocket: () => ImporterWebsocket
});

class ImporterWebsocketDef {
  constructor() {
    this.streamer = new Meteor.Streamer('importers', {
      retransmit: false
    });
    this.streamer.allowRead('all');
    this.streamer.allowEmit('all');
    this.streamer.allowWrite('none');
  }
  /**
   * Called when the progress is updated.
   *
   * @param {Progress} progress The progress of the import.
   */


  progressUpdated(progress) {
    this.streamer.emit('progress', progress);
  }

}

const ImporterWebsocket = new ImporterWebsocketDef();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"Imports.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/models/Imports.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Imports: () => Imports
});

class ImportsModel extends RocketChat.models._Base {
  constructor() {
    super('import');
  }

}

const Imports = new ImportsModel();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"RawImports.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/models/RawImports.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  RawImports: () => RawImports
});

class RawImportsModel extends RocketChat.models._Base {
  constructor() {
    super('raw_imports');
  }

}

const RawImports = new RawImportsModel();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"getImportProgress.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/methods/getImportProgress.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Importers;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  }

}, 0);
Meteor.methods({
  getImportProgress(key) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getImportProgress'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'run-import')) {
      throw new Meteor.Error('error-action-not-allowed', 'Importing is not allowed', {
        method: 'setupImporter'
      });
    }

    const importer = Importers.get(key);

    if (!importer) {
      throw new Meteor.Error('error-importer-not-defined', `The importer (${key}) has no import class defined.`, {
        method: 'getImportProgress'
      });
    }

    if (!importer.instance) {
      return undefined;
    }

    return importer.instance.getProgress();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getSelectionData.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/methods/getSelectionData.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Importers, ProgressStep;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  },

  ProgressStep(v) {
    ProgressStep = v;
  }

}, 0);
Meteor.methods({
  getSelectionData(key) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getSelectionData'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'run-import')) {
      throw new Meteor.Error('error-action-not-allowed', 'Importing is not allowed', {
        method: 'setupImporter'
      });
    }

    const importer = Importers.get(key);

    if (!importer || !importer.instance) {
      throw new Meteor.Error('error-importer-not-defined', `The importer (${key}) has no import class defined.`, {
        method: 'getSelectionData'
      });
    }

    const progress = importer.instance.getProgress();

    switch (progress.step) {
      case ProgressStep.USER_SELECTION:
        return importer.instance.getSelection();

      default:
        return undefined;
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"prepareImport.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/methods/prepareImport.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Importers;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  }

}, 0);
Meteor.methods({
  prepareImport(key, dataURI, contentType, fileName) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'prepareImport'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'run-import')) {
      throw new Meteor.Error('error-action-not-allowed', 'Importing is not allowed', {
        method: 'setupImporter'
      });
    }

    check(key, String);
    check(dataURI, String);
    check(fileName, String);
    const importer = Importers.get(key);

    if (!importer) {
      throw new Meteor.Error('error-importer-not-defined', `The importer (${key}) has no import class defined.`, {
        method: 'prepareImport'
      });
    }

    const results = importer.instance.prepare(dataURI, contentType, fileName);

    if (results instanceof Promise) {
      return results.catch(e => {
        throw new Meteor.Error(e);
      });
    } else {
      return results;
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"restartImport.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/methods/restartImport.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Importers, ProgressStep;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  },

  ProgressStep(v) {
    ProgressStep = v;
  }

}, 0);
Meteor.methods({
  restartImport(key) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'restartImport'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'run-import')) {
      throw new Meteor.Error('error-action-not-allowed', 'Importing is not allowed', {
        method: 'setupImporter'
      });
    }

    const importer = Importers.get(key);

    if (!importer) {
      throw new Meteor.Error('error-importer-not-defined', `The importer (${key}) has no import class defined.`, {
        method: 'restartImport'
      });
    }

    if (importer.instance) {
      importer.instance.updateProgress(ProgressStep.CANCELLED);
      importer.instance.updateRecord({
        valid: false
      });
      importer.instance = undefined;
    }

    importer.instance = new importer.importer(importer); // eslint-disable-line new-cap

    return importer.instance.getProgress();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setupImporter.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/methods/setupImporter.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Importers;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  }

}, 0);
Meteor.methods({
  setupImporter(key) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'setupImporter'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'run-import')) {
      throw new Meteor.Error('error-action-not-allowed', 'Importing is not allowed', {
        method: 'setupImporter'
      });
    }

    const importer = Importers.get(key);

    if (!importer) {
      console.warn(`Tried to setup ${name} as an importer.`);
      throw new Meteor.Error('error-importer-not-defined', 'The importer was not defined correctly, it is missing the Import class.', {
        method: 'setupImporter'
      });
    }

    if (importer.instance) {
      return importer.instance.getProgress();
    }

    importer.instance = new importer.importer(importer); // eslint-disable-line new-cap

    return importer.instance.getProgress();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"startImport.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/methods/startImport.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Importers, Selection, SelectionChannel, SelectionUser;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
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
Meteor.methods({
  startImport(key, input) {
    // Takes name and object with users / channels selected to import
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'startImport'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'run-import')) {
      throw new Meteor.Error('error-action-not-allowed', 'Importing is not allowed', {
        method: 'startImport'
      });
    }

    if (!key) {
      throw new Meteor.Error('error-invalid-importer', `No defined importer by: "${key}"`, {
        method: 'startImport'
      });
    }

    const importer = Importers.get(key);

    if (!importer || !importer.instance) {
      throw new Meteor.Error('error-importer-not-defined', `The importer (${key}) has no import class defined.`, {
        method: 'startImport'
      });
    }

    const usersSelection = input.users.map(user => new SelectionUser(user.user_id, user.username, user.email, user.is_deleted, user.is_bot, user.do_import));
    const channelsSelection = input.channels.map(channel => new SelectionChannel(channel.channel_id, channel.name, channel.is_archived, channel.do_import));
    const selection = new Selection(importer.name, usersSelection, channelsSelection);
    return importer.instance.startImport(selection);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"setImportsToInvalid.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/startup/setImportsToInvalid.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Imports;
module.watch(require("../models/Imports"), {
  Imports(v) {
    Imports = v;
  }

}, 0);
let RawImports;
module.watch(require("../models/RawImports"), {
  RawImports(v) {
    RawImports = v;
  }

}, 1);
Meteor.startup(function () {
  // Make sure all imports are marked as invalid, data clean up since you can't
  // restart an import at the moment.
  Imports.update({
    valid: {
      $ne: false
    }
  }, {
    $set: {
      valid: false
    }
  }, {
    multi: true
  }); // Clean up all the raw import data, since you can't restart an import at the moment

  try {
    RawImports.model.rawCollection().drop();
  } catch (e) {
    console.log('errror', e); // TODO: Remove
    // ignored
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/server/index.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Base: () => Base,
  Imports: () => Imports,
  Importers: () => Importers,
  ImporterInfo: () => ImporterInfo,
  ImporterWebsocket: () => ImporterWebsocket,
  Progress: () => Progress,
  ProgressStep: () => ProgressStep,
  RawImports: () => RawImports,
  Selection: () => Selection,
  SelectionChannel: () => SelectionChannel,
  SelectionUser: () => SelectionUser
});
let Base;
module.watch(require("./classes/ImporterBase"), {
  Base(v) {
    Base = v;
  }

}, 0);
let Imports;
module.watch(require("./models/Imports"), {
  Imports(v) {
    Imports = v;
  }

}, 1);
let Importers;
module.watch(require("../lib/Importers"), {
  Importers(v) {
    Importers = v;
  }

}, 2);
let ImporterInfo;
module.watch(require("../lib/ImporterInfo"), {
  ImporterInfo(v) {
    ImporterInfo = v;
  }

}, 3);
let ImporterWebsocket;
module.watch(require("./classes/ImporterWebsocket"), {
  ImporterWebsocket(v) {
    ImporterWebsocket = v;
  }

}, 4);
let Progress;
module.watch(require("./classes/ImporterProgress"), {
  Progress(v) {
    Progress = v;
  }

}, 5);
let ProgressStep;
module.watch(require("../lib/ImporterProgressStep"), {
  ProgressStep(v) {
    ProgressStep = v;
  }

}, 6);
let RawImports;
module.watch(require("./models/RawImports"), {
  RawImports(v) {
    RawImports = v;
  }

}, 7);
let Selection;
module.watch(require("./classes/ImporterSelection"), {
  Selection(v) {
    Selection = v;
  }

}, 8);
let SelectionChannel;
module.watch(require("./classes/ImporterSelectionChannel"), {
  SelectionChannel(v) {
    SelectionChannel = v;
  }

}, 9);
let SelectionUser;
module.watch(require("./classes/ImporterSelectionUser"), {
  SelectionUser(v) {
    SelectionUser = v;
  }

}, 10);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lib":{"ImporterInfo.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/lib/ImporterInfo.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ImporterInfo: () => ImporterInfo
});

class ImporterInfo {
  /**
   * Creates a new class which contains information about the importer.
   *
   * @param {string} key The unique key of this importer.
   * @param {string} name The i18n name.
   * @param {string} mimeType The type of file it expects.
   * @param {{ href: string, text: string }[]} warnings An array of warning objects. `{ href, text }`
   */
  constructor(key, name = '', mimeType = '', warnings = []) {
    this.key = key;
    this.name = name;
    this.mimeType = mimeType;
    this.warnings = warnings;
    this.importer = undefined;
    this.instance = undefined;
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ImporterProgressStep.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/lib/ImporterProgressStep.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ProgressStep: () => ProgressStep
});
const ProgressStep = Object.freeze({
  NEW: 'importer_new',
  PREPARING_STARTED: 'importer_preparing_started',
  PREPARING_USERS: 'importer_preparing_users',
  PREPARING_CHANNELS: 'importer_preparing_channels',
  PREPARING_MESSAGES: 'importer_preparing_messages',
  USER_SELECTION: 'importer_user_selection',
  IMPORTING_STARTED: 'importer_importing_started',
  IMPORTING_USERS: 'importer_importing_users',
  IMPORTING_CHANNELS: 'importer_importing_channels',
  IMPORTING_MESSAGES: 'importer_importing_messages',
  FINISHING: 'importer_finishing',
  DONE: 'importer_done',
  ERROR: 'importer_import_failed',
  CANCELLED: 'importer_import_cancelled'
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Importers.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer/lib/Importers.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Importers: () => Importers
});
let ImporterInfo;
module.watch(require("./ImporterInfo"), {
  ImporterInfo(v) {
    ImporterInfo = v;
  }

}, 0);

/** Container class which holds all of the importer details. */
class ImportersContainer {
  constructor() {
    this.importers = new Map();
  }
  /**
   * Adds an importer to the import collection. Adding it more than once will
   * overwrite the previous one.
   *
   * @param {ImporterInfo} info The information related to the importer.
   * @param {*} importer The class for the importer, will be undefined on the client.
   */


  add(info, importer) {
    if (!(info instanceof ImporterInfo)) {
      throw new Error('The importer must be a valid ImporterInfo instance.');
    }

    info.importer = importer;
    this.importers.set(info.key, info);
    return this.importers.get(info.key);
  }
  /**
   * Gets the importer information that is stored.
   *
   * @param {string} key The key of the importer.
   */


  get(key) {
    return this.importers.get(key);
  }
  /**
   * Gets all of the importers in array format.
   *
   * @returns {ImporterInfo[]} The array of importer information.
   */


  getAll() {
    return Array.from(this.importers.values());
  }

}

const Importers = new ImportersContainer();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:importer/server/classes/ImporterBase.js");
require("/node_modules/meteor/rocketchat:importer/server/classes/ImporterProgress.js");
require("/node_modules/meteor/rocketchat:importer/server/classes/ImporterSelection.js");
require("/node_modules/meteor/rocketchat:importer/server/classes/ImporterSelectionChannel.js");
require("/node_modules/meteor/rocketchat:importer/server/classes/ImporterSelectionUser.js");
require("/node_modules/meteor/rocketchat:importer/server/classes/ImporterWebsocket.js");
require("/node_modules/meteor/rocketchat:importer/lib/ImporterInfo.js");
require("/node_modules/meteor/rocketchat:importer/lib/ImporterProgressStep.js");
require("/node_modules/meteor/rocketchat:importer/lib/Importers.js");
require("/node_modules/meteor/rocketchat:importer/server/models/Imports.js");
require("/node_modules/meteor/rocketchat:importer/server/models/RawImports.js");
require("/node_modules/meteor/rocketchat:importer/server/methods/getImportProgress.js");
require("/node_modules/meteor/rocketchat:importer/server/methods/getSelectionData.js");
require("/node_modules/meteor/rocketchat:importer/server/methods/prepareImport.js");
require("/node_modules/meteor/rocketchat:importer/server/methods/restartImport.js");
require("/node_modules/meteor/rocketchat:importer/server/methods/setupImporter.js");
require("/node_modules/meteor/rocketchat:importer/server/methods/startImport.js");
require("/node_modules/meteor/rocketchat:importer/server/startup/setImportsToInvalid.js");
var exports = require("/node_modules/meteor/rocketchat:importer/server/index.js");

/* Exports */
Package._define("rocketchat:importer", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_importer.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci9zZXJ2ZXIvY2xhc3Nlcy9JbXBvcnRlckJhc2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW1wb3J0ZXIvc2VydmVyL2NsYXNzZXMvSW1wb3J0ZXJQcm9ncmVzcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci9zZXJ2ZXIvY2xhc3Nlcy9JbXBvcnRlclNlbGVjdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci9zZXJ2ZXIvY2xhc3Nlcy9JbXBvcnRlclNlbGVjdGlvbkNoYW5uZWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW1wb3J0ZXIvc2VydmVyL2NsYXNzZXMvSW1wb3J0ZXJTZWxlY3Rpb25Vc2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyL3NlcnZlci9jbGFzc2VzL0ltcG9ydGVyV2Vic29ja2V0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyL3NlcnZlci9tb2RlbHMvSW1wb3J0cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci9zZXJ2ZXIvbW9kZWxzL1Jhd0ltcG9ydHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW1wb3J0ZXIvc2VydmVyL21ldGhvZHMvZ2V0SW1wb3J0UHJvZ3Jlc3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW1wb3J0ZXIvc2VydmVyL21ldGhvZHMvZ2V0U2VsZWN0aW9uRGF0YS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci9zZXJ2ZXIvbWV0aG9kcy9wcmVwYXJlSW1wb3J0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyL3NlcnZlci9tZXRob2RzL3Jlc3RhcnRJbXBvcnQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW1wb3J0ZXIvc2VydmVyL21ldGhvZHMvc2V0dXBJbXBvcnRlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci9zZXJ2ZXIvbWV0aG9kcy9zdGFydEltcG9ydC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci9zZXJ2ZXIvc3RhcnR1cC9zZXRJbXBvcnRzVG9JbnZhbGlkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyL3NlcnZlci9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci9saWIvSW1wb3J0ZXJJbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyL2xpYi9JbXBvcnRlclByb2dyZXNzU3RlcC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci9saWIvSW1wb3J0ZXJzLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsIkJhc2UiLCJQcm9ncmVzcyIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJQcm9ncmVzc1N0ZXAiLCJTZWxlY3Rpb24iLCJJbXBvcnRzIiwiSW1wb3J0ZXJJbmZvIiwiUmF3SW1wb3J0cyIsIkltcG9ydGVyV2Vic29ja2V0IiwiaHR0cCIsImRlZmF1bHQiLCJodHRwcyIsIkFkbVppcCIsImdldEZpbGVUeXBlIiwiZ2V0QlNPTlNpemUiLCJpdGVtIiwiQlNPTiIsImJzb24iLCJjYWxjdWxhdGVPYmplY3RTaXplIiwiZ2V0TWF4QlNPTlNpemUiLCJnZXRCU09OU2FmZUFycmF5c0Zyb21BbkFycmF5IiwidGhlQXJyYXkiLCJCU09OU2l6ZSIsIm1heFNpemUiLCJNYXRoIiwiZmxvb3IiLCJsZW5ndGgiLCJjZWlsIiwic2FmZUFycmF5cyIsImkiLCJwdXNoIiwic2xpY2UiLCJjb25zdHJ1Y3RvciIsImluZm8iLCJFcnJvciIsInByZXBhcmUiLCJiaW5kIiwic3RhcnRJbXBvcnQiLCJnZXRTZWxlY3Rpb24iLCJnZXRQcm9ncmVzcyIsInVwZGF0ZVByb2dyZXNzIiwiYWRkQ291bnRUb1RvdGFsIiwiYWRkQ291bnRDb21wbGV0ZWQiLCJ1cGRhdGVSZWNvcmQiLCJ1cGxvYWRGaWxlIiwibG9nZ2VyIiwiTG9nZ2VyIiwibmFtZSIsInByb2dyZXNzIiwia2V5IiwiY29sbGVjdGlvbiIsImltcG9ydElkIiwiaW5zZXJ0IiwidHlwZSIsInRzIiwiRGF0ZSIsIm5vdyIsInN0YXR1cyIsInN0ZXAiLCJ2YWxpZCIsInVzZXIiLCJNZXRlb3IiLCJfaWQiLCJpbXBvcnRSZWNvcmQiLCJmaW5kT25lIiwidXNlcnMiLCJjaGFubmVscyIsIm1lc3NhZ2VzIiwib2xkU2V0dGluZ3MiLCJkZWJ1ZyIsImRhdGFVUkkiLCJzZW50Q29udGVudFR5cGUiLCJmaWxlTmFtZSIsInNraXBUeXBlQ2hlY2siLCJmaWxlVHlwZSIsIkJ1ZmZlciIsInNwbGl0IiwibWltZVR5cGUiLCJtaW1lIiwid2FybiIsIkVSUk9SIiwiUFJFUEFSSU5HX1NUQVJURUQiLCJmaWxlIiwiaW1wb3J0U2VsZWN0aW9uIiwidW5kZWZpbmVkIiwiSU1QT1JUSU5HX1NUQVJURUQiLCJBY2NvdW50c19BbGxvd2VkRG9tYWluc0xpc3QiLCJSb2NrZXRDaGF0IiwibW9kZWxzIiwiU2V0dGluZ3MiLCJmaW5kT25lQnlJZCIsInZhbHVlIiwidXBkYXRlVmFsdWVCeUlkIiwiQWNjb3VudHNfQWxsb3dVc2VybmFtZUNoYW5nZSIsIkZpbGVVcGxvYWRfTWF4RmlsZVNpemUiLCJET05FIiwicHJvZ3Jlc3NVcGRhdGVkIiwiY291bnQiLCJ0b3RhbCIsImNvbXBsZXRlZCIsImZpZWxkcyIsInVwZGF0ZSIsIiRzZXQiLCJkZXRhaWxzIiwiZmlsZVVybCIsInJvb20iLCJ0aW1lU3RhbXAiLCJyZXF1ZXN0TW9kdWxlIiwidGVzdCIsImZpbGVTdG9yZSIsIkZpbGVVcGxvYWQiLCJnZXRTdG9yZSIsImdldCIsImJpbmRFbnZpcm9ubWVudCIsInJlcyIsInJhd0RhdGEiLCJvbiIsImNodW5rIiwiY29uY2F0IiwiZXJyIiwidXJsIiwicmVwbGFjZSIsImFic29sdXRlVXJsIiwiYXR0YWNobWVudCIsInRpdGxlIiwidGl0bGVfbGluayIsImltYWdlX3VybCIsImltYWdlX3R5cGUiLCJpbWFnZV9zaXplIiwic2l6ZSIsImltYWdlX2RpbWVuc2lvbnMiLCJpZGVudGlmeSIsImF1ZGlvX3VybCIsImF1ZGlvX3R5cGUiLCJhdWRpb19zaXplIiwidmlkZW9fdXJsIiwidmlkZW9fdHlwZSIsInZpZGVvX3NpemUiLCJtc2ciLCJyaWQiLCJncm91cGFibGUiLCJhdHRhY2htZW50cyIsIm1lc3NhZ2VfaWQiLCJzZW5kTWVzc2FnZSIsIk5FVyIsIm1lc3NhZ2VfY291bnQiLCJTZWxlY3Rpb25DaGFubmVsIiwiY2hhbm5lbF9pZCIsImlzX2FyY2hpdmVkIiwiZG9faW1wb3J0IiwiaXNfcHJpdmF0ZSIsIlNlbGVjdGlvblVzZXIiLCJ1c2VyX2lkIiwidXNlcm5hbWUiLCJlbWFpbCIsImlzX2RlbGV0ZWQiLCJpc19ib3QiLCJJbXBvcnRlcldlYnNvY2tldERlZiIsInN0cmVhbWVyIiwiU3RyZWFtZXIiLCJyZXRyYW5zbWl0IiwiYWxsb3dSZWFkIiwiYWxsb3dFbWl0IiwiYWxsb3dXcml0ZSIsImVtaXQiLCJJbXBvcnRzTW9kZWwiLCJfQmFzZSIsIlJhd0ltcG9ydHNNb2RlbCIsIkltcG9ydGVycyIsIm1ldGhvZHMiLCJnZXRJbXBvcnRQcm9ncmVzcyIsInVzZXJJZCIsIm1ldGhvZCIsImF1dGh6IiwiaGFzUGVybWlzc2lvbiIsImltcG9ydGVyIiwiaW5zdGFuY2UiLCJnZXRTZWxlY3Rpb25EYXRhIiwiVVNFUl9TRUxFQ1RJT04iLCJwcmVwYXJlSW1wb3J0IiwiY29udGVudFR5cGUiLCJjaGVjayIsIlN0cmluZyIsInJlc3VsdHMiLCJQcm9taXNlIiwiY2F0Y2giLCJlIiwicmVzdGFydEltcG9ydCIsIkNBTkNFTExFRCIsInNldHVwSW1wb3J0ZXIiLCJjb25zb2xlIiwiaW5wdXQiLCJ1c2Vyc1NlbGVjdGlvbiIsIm1hcCIsImNoYW5uZWxzU2VsZWN0aW9uIiwiY2hhbm5lbCIsInNlbGVjdGlvbiIsInN0YXJ0dXAiLCIkbmUiLCJtdWx0aSIsIm1vZGVsIiwicmF3Q29sbGVjdGlvbiIsImRyb3AiLCJsb2ciLCJ3YXJuaW5ncyIsIk9iamVjdCIsImZyZWV6ZSIsIlBSRVBBUklOR19VU0VSUyIsIlBSRVBBUklOR19DSEFOTkVMUyIsIlBSRVBBUklOR19NRVNTQUdFUyIsIklNUE9SVElOR19VU0VSUyIsIklNUE9SVElOR19DSEFOTkVMUyIsIklNUE9SVElOR19NRVNTQUdFUyIsIkZJTklTSElORyIsIkltcG9ydGVyc0NvbnRhaW5lciIsImltcG9ydGVycyIsIk1hcCIsImFkZCIsInNldCIsImdldEFsbCIsIkFycmF5IiwiZnJvbSIsInZhbHVlcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxRQUFLLE1BQUlBO0FBQVYsQ0FBZDtBQUErQixJQUFJQyxRQUFKO0FBQWFILE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxvQkFBUixDQUFiLEVBQTJDO0FBQUNGLFdBQVNHLENBQVQsRUFBVztBQUFDSCxlQUFTRyxDQUFUO0FBQVc7O0FBQXhCLENBQTNDLEVBQXFFLENBQXJFO0FBQXdFLElBQUlDLFlBQUo7QUFBaUJQLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxnQ0FBUixDQUFiLEVBQXVEO0FBQUNFLGVBQWFELENBQWIsRUFBZTtBQUFDQyxtQkFBYUQsQ0FBYjtBQUFlOztBQUFoQyxDQUF2RCxFQUF5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VyxLQUFLTixTQUFMLENBQWVPLE1BQWYsRUFBWCxDQUFQO0FBQ0E7O0FBeEN1Qjs7QUEyQ2xCLE1BQU10RCxZQUFZLElBQUk4QyxrQkFBSixFQUFsQixDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2ltcG9ydGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUHJvZ3Jlc3MgfSBmcm9tICcuL0ltcG9ydGVyUHJvZ3Jlc3MnO1xuaW1wb3J0IHsgUHJvZ3Jlc3NTdGVwIH0gZnJvbSAnLi4vLi4vbGliL0ltcG9ydGVyUHJvZ3Jlc3NTdGVwJztcbmltcG9ydCB7IFNlbGVjdGlvbiB9IGZyb20gJy4vSW1wb3J0ZXJTZWxlY3Rpb24nO1xuaW1wb3J0IHsgSW1wb3J0cyB9IGZyb20gJy4uL21vZGVscy9JbXBvcnRzJztcbmltcG9ydCB7IEltcG9ydGVySW5mbyB9IGZyb20gJy4uLy4uL2xpYi9JbXBvcnRlckluZm8nO1xuaW1wb3J0IHsgUmF3SW1wb3J0cyB9IGZyb20gJy4uL21vZGVscy9SYXdJbXBvcnRzJztcbmltcG9ydCB7IEltcG9ydGVyV2Vic29ja2V0IH0gZnJvbSAnLi9JbXBvcnRlcldlYnNvY2tldCc7XG5cbmltcG9ydCBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0IGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgZ2V0RmlsZVR5cGUgZnJvbSAnZmlsZS10eXBlJztcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBhbGwgb2YgdGhlIGltcG9ydGVycy5cbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2Uge1xuXHQvKipcblx0ICogVGhlIG1heCBCU09OIG9iamVjdCBzaXplIHdlIGNhbiBzdG9yZSBpbiBNb25nb0RCIGlzIDE2Nzc3MjE2IGJ5dGVzXG5cdCAqIGJ1dCBmb3Igc29tZSByZWFzb24gdGhlIG1vbmdvIGluc3RhbmFjZSB3aGljaCBjb21lcyB3aXRoIE1ldGVvclxuXHQgKiBlcnJvcnMgb3V0IGZvciBhbnl0aGluZyBjbG9zZSB0byB0aGF0IHNpemUuIFNvLCB3ZSBhcmUgcm91bmRpbmcgaXRcblx0ICogZG93biB0byA4MDAwMDAwIGJ5dGVzLlxuXHQgKlxuXHQgKiBAcGFyYW0ge2FueX0gaXRlbSBUaGUgaXRlbSB0byBjYWxjdWxhdGUgdGhlIEJTT04gc2l6ZSBvZi5cblx0ICogQHJldHVybnMge251bWJlcn0gVGhlIHNpemUgb2YgdGhlIGl0ZW0gcGFzc2VkIGluLlxuXHQgKiBAc3RhdGljXG5cdCAqL1xuXHRzdGF0aWMgZ2V0QlNPTlNpemUoaXRlbSkge1xuXHRcdGNvbnN0IHsgQlNPTiB9ID0gcmVxdWlyZSgnYnNvbicpO1xuXHRcdGNvbnN0IGJzb24gPSBuZXcgQlNPTigpO1xuXHRcdHJldHVybiBic29uLmNhbGN1bGF0ZU9iamVjdFNpemUoaXRlbSk7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIG1heCBCU09OIG9iamVjdCBzaXplIHdlIGNhbiBzdG9yZSBpbiBNb25nb0RCIGlzIDE2Nzc3MjE2IGJ5dGVzXG5cdCAqIGJ1dCBmb3Igc29tZSByZWFzb24gdGhlIG1vbmdvIGluc3RhbmFjZSB3aGljaCBjb21lcyB3aXRoIE1ldGVvclxuXHQgKiBlcnJvcnMgb3V0IGZvciBhbnl0aGluZyBjbG9zZSB0byB0aGF0IHNpemUuIFNvLCB3ZSBhcmUgcm91bmRpbmcgaXRcblx0ICogZG93biB0byA4MDAwMDAwIGJ5dGVzLlxuXHQgKlxuXHQgKiBAcmV0dXJucyB7bnVtYmVyfSA4MDAwMDAwIGJ5dGVzLlxuXHQgKi9cblx0c3RhdGljIGdldE1heEJTT05TaXplKCkge1xuXHRcdHJldHVybiA4MDAwMDAwO1xuXHR9XG5cblx0LyoqXG5cdCAqIFNwbGl0cyB0aGUgcGFzc2VkIGluIGFycmF5IHRvIGF0IGxlYXN0IG9uZSBhcnJheSB3aGljaCBoYXMgYSBzaXplIHRoYXRcblx0ICogaXMgc2FmZSB0byBzdG9yZSBpbiB0aGUgZGF0YWJhc2UuXG5cdCAqXG5cdCAqIEBwYXJhbSB7YW55W119IHRoZUFycmF5IFRoZSBhcnJheSB0byBzcGxpdCBvdXRcblx0ICogQHJldHVybnMge2FueVtdW119IFRoZSBzYWZlIHNpemVkIGFycmF5c1xuXHQgKiBAc3RhdGljXG5cdCAqL1xuXHRzdGF0aWMgZ2V0QlNPTlNhZmVBcnJheXNGcm9tQW5BcnJheSh0aGVBcnJheSkge1xuXHRcdGNvbnN0IEJTT05TaXplID0gQmFzZS5nZXRCU09OU2l6ZSh0aGVBcnJheSk7XG5cdFx0Y29uc3QgbWF4U2l6ZSA9IE1hdGguZmxvb3IodGhlQXJyYXkubGVuZ3RoIC8gKE1hdGguY2VpbChCU09OU2l6ZSAvIEJhc2UuZ2V0TWF4QlNPTlNpemUoKSkpKTtcblx0XHRjb25zdCBzYWZlQXJyYXlzID0gW107XG5cdFx0bGV0IGkgPSAwO1xuXHRcdHdoaWxlIChpIDwgdGhlQXJyYXkubGVuZ3RoKSB7XG5cdFx0XHRzYWZlQXJyYXlzLnB1c2godGhlQXJyYXkuc2xpY2UoaSwgKGkgKz0gbWF4U2l6ZSkpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHNhZmVBcnJheXM7XG5cdH1cblxuXHQvKipcblx0ICogQ29uc3RydWN0cyBhIG5ldyBpbXBvcnRlciwgYWRkaW5nIGFuIGVtcHR5IGNvbGxlY3Rpb24sIEFkbVppcCBwcm9wZXJ0eSwgYW5kIGVtcHR5IHVzZXJzICYgY2hhbm5lbHNcblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIGltcG9ydGVyJ3MgbmFtZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0aW9uIFRoZSBpMThuIHN0cmluZyB3aGljaCBkZXNjcmliZXMgdGhlIGltcG9ydGVyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBtaW1lVHlwZSBUaGUgZXhwZWN0ZWQgZmlsZSB0eXBlLlxuXHQgKi9cblx0Y29uc3RydWN0b3IoaW5mbykge1xuXHRcdGlmICghKGluZm8gaW5zdGFuY2VvZiBJbXBvcnRlckluZm8pKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0luZm9ybWF0aW9uIHBhc3NlZCBpbiBtdXN0IGJlIGEgdmFsaWQgSW1wb3J0ZXJJbmZvIGluc3RhbmNlLicpO1xuXHRcdH1cblxuXHRcdHRoaXMuaHR0cCA9IGh0dHA7XG5cdFx0dGhpcy5odHRwcyA9IGh0dHBzO1xuXHRcdHRoaXMuQWRtWmlwID0gQWRtWmlwO1xuXHRcdHRoaXMuZ2V0RmlsZVR5cGUgPSBnZXRGaWxlVHlwZTtcblxuXHRcdHRoaXMucHJlcGFyZSA9IHRoaXMucHJlcGFyZS5iaW5kKHRoaXMpO1xuXHRcdHRoaXMuc3RhcnRJbXBvcnQgPSB0aGlzLnN0YXJ0SW1wb3J0LmJpbmQodGhpcyk7XG5cdFx0dGhpcy5nZXRTZWxlY3Rpb24gPSB0aGlzLmdldFNlbGVjdGlvbi5iaW5kKHRoaXMpO1xuXHRcdHRoaXMuZ2V0UHJvZ3Jlc3MgPSB0aGlzLmdldFByb2dyZXNzLmJpbmQodGhpcyk7XG5cdFx0dGhpcy51cGRhdGVQcm9ncmVzcyA9IHRoaXMudXBkYXRlUHJvZ3Jlc3MuYmluZCh0aGlzKTtcblx0XHR0aGlzLmFkZENvdW50VG9Ub3RhbCA9IHRoaXMuYWRkQ291bnRUb1RvdGFsLmJpbmQodGhpcyk7XG5cdFx0dGhpcy5hZGRDb3VudENvbXBsZXRlZCA9IHRoaXMuYWRkQ291bnRDb21wbGV0ZWQuYmluZCh0aGlzKTtcblx0XHR0aGlzLnVwZGF0ZVJlY29yZCA9IHRoaXMudXBkYXRlUmVjb3JkLmJpbmQodGhpcyk7XG5cdFx0dGhpcy51cGxvYWRGaWxlID0gdGhpcy51cGxvYWRGaWxlLmJpbmQodGhpcyk7XG5cblx0XHR0aGlzLmluZm8gPSBpbmZvO1xuXG5cdFx0dGhpcy5sb2dnZXIgPSBuZXcgTG9nZ2VyKGAkeyB0aGlzLmluZm8ubmFtZSB9IEltcG9ydGVyYCwge30pO1xuXHRcdHRoaXMucHJvZ3Jlc3MgPSBuZXcgUHJvZ3Jlc3ModGhpcy5pbmZvLmtleSwgdGhpcy5pbmZvLm5hbWUpO1xuXHRcdHRoaXMuY29sbGVjdGlvbiA9IFJhd0ltcG9ydHM7XG5cblx0XHRjb25zdCBpbXBvcnRJZCA9IEltcG9ydHMuaW5zZXJ0KHsgdHlwZTogdGhpcy5pbmZvLm5hbWUsIHRzOiBEYXRlLm5vdygpLCBzdGF0dXM6IHRoaXMucHJvZ3Jlc3Muc3RlcCwgdmFsaWQ6IHRydWUsIHVzZXI6IE1ldGVvci51c2VyKCkuX2lkIH0pO1xuXHRcdHRoaXMuaW1wb3J0UmVjb3JkID0gSW1wb3J0cy5maW5kT25lKGltcG9ydElkKTtcblxuXHRcdHRoaXMudXNlcnMgPSB7fTtcblx0XHR0aGlzLmNoYW5uZWxzID0ge307XG5cdFx0dGhpcy5tZXNzYWdlcyA9IHt9O1xuXHRcdHRoaXMub2xkU2V0dGluZ3MgPSB7fTtcblxuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKGBDb25zdHJ1Y3RlZCBhIG5ldyAkeyBpbmZvLm5hbWUgfSBJbXBvcnRlci5gKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBUYWtlcyB0aGUgdXBsb2FkZWQgZmlsZSBhbmQgZXh0cmFjdHMgdGhlIHVzZXJzLCBjaGFubmVscywgYW5kIG1lc3NhZ2VzIGZyb20gaXQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhVVJJIEJhc2U2NCBzdHJpbmcgb2YgdGhlIHVwbG9hZGVkIGZpbGVcblx0ICogQHBhcmFtIHtzdHJpbmd9IHNlbnRDb250ZW50VHlwZSBUaGUgc2VudCBmaWxlIHR5cGUuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlTmFtZSBUaGUgbmFtZSBvZiB0aGUgdXBsb2FkZWQgZmlsZS5cblx0ICogQHBhcmFtIHtib29sZWFufSBza2lwVHlwZUNoZWNrIE9wdGlvbmFsIHByb3BlcnR5IHRoYXQgc2F5cyB0byBub3QgY2hlY2sgdGhlIHR5cGUgcHJvdmlkZWQuXG5cdCAqIEByZXR1cm5zIHtQcm9ncmVzc30gVGhlIHByb2dyZXNzIHJlY29yZCBvZiB0aGUgaW1wb3J0LlxuXHQgKi9cblx0cHJlcGFyZShkYXRhVVJJLCBzZW50Q29udGVudFR5cGUsIGZpbGVOYW1lLCBza2lwVHlwZUNoZWNrKSB7XG5cdFx0aWYgKCFza2lwVHlwZUNoZWNrKSB7XG5cdFx0XHRjb25zdCBmaWxlVHlwZSA9IHRoaXMuZ2V0RmlsZVR5cGUobmV3IEJ1ZmZlcihkYXRhVVJJLnNwbGl0KCcsJylbMV0sICdiYXNlNjQnKSk7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnVXBsb2FkZWQgZmlsZSBpbmZvcm1hdGlvbiBpczonLCBmaWxlVHlwZSk7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnRXhwZWN0ZWQgZmlsZSB0eXBlIGlzOicsIHRoaXMuaW5mby5taW1lVHlwZSk7XG5cblx0XHRcdGlmICghZmlsZVR5cGUgfHwgKGZpbGVUeXBlLm1pbWUgIT09IHRoaXMuaW5mby5taW1lVHlwZSkpIHtcblx0XHRcdFx0dGhpcy5sb2dnZXIud2FybihgSW52YWxpZCBmaWxlIHVwbG9hZGVkIGZvciB0aGUgJHsgdGhpcy5pbmZvLm5hbWUgfSBpbXBvcnRlci5gKTtcblx0XHRcdFx0dGhpcy51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRVJST1IpO1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWZpbGUtdXBsb2FkZWQnLCBgSW52YWxpZCBmaWxlIHVwbG9hZGVkIHRvIGltcG9ydCAkeyB0aGlzLmluZm8ubmFtZSB9IGRhdGEgZnJvbS5gLCB7IHN0ZXA6ICdwcmVwYXJlJyB9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5QUkVQQVJJTkdfU1RBUlRFRCk7XG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlUmVjb3JkKHsgZmlsZTogZmlsZU5hbWUgfSk7XG5cdH1cblxuXHQvKipcblx0ICogU3RhcnRzIHRoZSBpbXBvcnQgcHJvY2Vzcy4gVGhlIGltcGxlbWVudGluZyBtZXRob2Qgc2hvdWxkIGRlZmVyXG5cdCAqIGFzIHNvb24gYXMgdGhlIHNlbGVjdGlvbiBpcyBzZXQsIHNvIHRoZSB1c2VyIHdobyBzdGFydGVkIHRoZSBwcm9jZXNzXG5cdCAqIGRvZXNuJ3QgZW5kIHVwIHdpdGggYSBcImxvY2tlZFwiIFVJIHdoaWxlIE1ldGVvciB3YWl0cyBmb3IgYSByZXNwb25zZS5cblx0ICogVGhlIHJldHVybmVkIG9iamVjdCBzaG91bGQgYmUgdGhlIHByb2dyZXNzLlxuXHQgKlxuXHQgKiBAcGFyYW0ge1NlbGVjdGlvbn0gaW1wb3J0U2VsZWN0aW9uIFRoZSBzZWxlY3Rpb24gZGF0YS5cblx0ICogQHJldHVybnMge1Byb2dyZXNzfSBUaGUgcHJvZ3Jlc3MgcmVjb3JkIG9mIHRoZSBpbXBvcnQuXG5cdCAqL1xuXHRzdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pIHtcblx0XHRpZiAoIShpbXBvcnRTZWxlY3Rpb24gaW5zdGFuY2VvZiBTZWxlY3Rpb24pKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgU2VsZWN0aW9uIGRhdGEgcHJvdmlkZWQgdG8gdGhlICR7IHRoaXMuaW5mby5uYW1lIH0gaW1wb3J0ZXIuYCk7XG5cdFx0fSBlbHNlIGlmIChpbXBvcnRTZWxlY3Rpb24udXNlcnMgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBVc2VycyBpbiB0aGUgc2VsZWN0ZWQgZGF0YSB3YXNuJ3QgZm91bmQsIGl0IG11c3QgYnV0IGF0IGxlYXN0IGFuIGVtcHR5IGFycmF5IGZvciB0aGUgJHsgdGhpcy5pbmZvLm5hbWUgfSBpbXBvcnRlci5gKTtcblx0XHR9IGVsc2UgaWYgKGltcG9ydFNlbGVjdGlvbi5jaGFubmVscyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYENoYW5uZWxzIGluIHRoZSBzZWxlY3RlZCBkYXRhIHdhc24ndCBmb3VuZCwgaXQgbXVzdCBidXQgYXQgbGVhc3QgYW4gZW1wdHkgYXJyYXkgZm9yIHRoZSAkeyB0aGlzLmluZm8ubmFtZSB9IGltcG9ydGVyLmApO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5JTVBPUlRJTkdfU1RBUlRFRCk7XG5cdH1cblxuXHQvKipcblx0ICogR2V0cyB0aGUgU2VsZWN0aW9uIG9iamVjdCBmb3IgdGhlIGltcG9ydC5cblx0ICpcblx0ICogQHJldHVybnMge1NlbGVjdGlvbn0gVGhlIHVzZXJzIGFuZCBjaGFubmVscyBzZWxlY3Rpb25cblx0ICovXG5cdGdldFNlbGVjdGlvbigpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJ2dldFNlbGVjdGlvbicgY2FsbGVkIG9uICR7IHRoaXMuaW5mby5uYW1lIH0sIGl0IG11c3QgYmUgb3ZlcnJpZGRlbiBhbmQgc3VwZXIgY2FuIG5vdCBiZSBjYWxsZWQuYCk7XG5cdH1cblxuXHQvKipcblx0ICogR2V0cyB0aGUgcHJvZ3Jlc3Mgb2YgdGhpcyBpbXBvcnQuXG5cdCAqXG5cdCAqIEByZXR1cm5zIHtQcm9ncmVzc30gVGhlIHByb2dyZXNzIHJlY29yZCBvZiB0aGUgaW1wb3J0LlxuXHQgKi9cblx0Z2V0UHJvZ3Jlc3MoKSB7XG5cdFx0cmV0dXJuIHRoaXMucHJvZ3Jlc3M7XG5cdH1cblxuXHQvKipcblx0ICogVXBkYXRlcyB0aGUgcHJvZ3Jlc3Mgc3RlcCBvZiB0aGlzIGltcG9ydGVyLlxuXHQgKiBJdCBhbHNvIGNoYW5nZXMgc29tZSBpbnRlcm5hbCBzZXR0aW5ncyBhdCB2YXJpb3VzIHN0YWdlcyBvZiB0aGUgaW1wb3J0LlxuXHQgKiBUaGlzIHdheSB0aGUgaW1wb3J0ZXIgY2FuIGFkanVzdCB1c2VyL3Jvb20gaW5mb3JtYXRpb24gYXQgd2lsbC5cblx0ICpcblx0ICogQHBhcmFtIHtQcm9ncmVzc1N0ZXB9IHN0ZXAgVGhlIHByb2dyZXNzIHN0ZXAgd2hpY2ggdGhpcyBpbXBvcnQgaXMgY3VycmVudGx5IGF0LlxuXHQgKiBAcmV0dXJucyB7UHJvZ3Jlc3N9IFRoZSBwcm9ncmVzcyByZWNvcmQgb2YgdGhlIGltcG9ydC5cblx0ICovXG5cdHVwZGF0ZVByb2dyZXNzKHN0ZXApIHtcblx0XHR0aGlzLnByb2dyZXNzLnN0ZXAgPSBzdGVwO1xuXG5cdFx0c3dpdGNoIChzdGVwKSB7XG5cdFx0XHRjYXNlIFByb2dyZXNzU3RlcC5JTVBPUlRJTkdfU1RBUlRFRDpcblx0XHRcdFx0dGhpcy5vbGRTZXR0aW5ncy5BY2NvdW50c19BbGxvd2VkRG9tYWluc0xpc3QgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lQnlJZCgnQWNjb3VudHNfQWxsb3dlZERvbWFpbnNMaXN0JykudmFsdWU7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLnVwZGF0ZVZhbHVlQnlJZCgnQWNjb3VudHNfQWxsb3dlZERvbWFpbnNMaXN0JywgJycpO1xuXG5cdFx0XHRcdHRoaXMub2xkU2V0dGluZ3MuQWNjb3VudHNfQWxsb3dVc2VybmFtZUNoYW5nZSA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmVCeUlkKCdBY2NvdW50c19BbGxvd1VzZXJuYW1lQ2hhbmdlJykudmFsdWU7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLnVwZGF0ZVZhbHVlQnlJZCgnQWNjb3VudHNfQWxsb3dVc2VybmFtZUNoYW5nZScsIHRydWUpO1xuXG5cdFx0XHRcdHRoaXMub2xkU2V0dGluZ3MuRmlsZVVwbG9hZF9NYXhGaWxlU2l6ZSA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmVCeUlkKCdGaWxlVXBsb2FkX01heEZpbGVTaXplJykudmFsdWU7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLnVwZGF0ZVZhbHVlQnlJZCgnRmlsZVVwbG9hZF9NYXhGaWxlU2l6ZScsIC0xKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIFByb2dyZXNzU3RlcC5ET05FOlxuXHRcdFx0Y2FzZSBQcm9ncmVzc1N0ZXAuRVJST1I6XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLnVwZGF0ZVZhbHVlQnlJZCgnQWNjb3VudHNfQWxsb3dlZERvbWFpbnNMaXN0JywgdGhpcy5vbGRTZXR0aW5ncy5BY2NvdW50c19BbGxvd2VkRG9tYWluc0xpc3QpO1xuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy51cGRhdGVWYWx1ZUJ5SWQoJ0FjY291bnRzX0FsbG93VXNlcm5hbWVDaGFuZ2UnLCB0aGlzLm9sZFNldHRpbmdzLkFjY291bnRzX0FsbG93VXNlcm5hbWVDaGFuZ2UpO1xuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy51cGRhdGVWYWx1ZUJ5SWQoJ0ZpbGVVcGxvYWRfTWF4RmlsZVNpemUnLCB0aGlzLm9sZFNldHRpbmdzLkZpbGVVcGxvYWRfTWF4RmlsZVNpemUpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZyhgJHsgdGhpcy5pbmZvLm5hbWUgfSBpcyBub3cgYXQgJHsgc3RlcCB9LmApO1xuXHRcdHRoaXMudXBkYXRlUmVjb3JkKHsgc3RhdHVzOiB0aGlzLnByb2dyZXNzLnN0ZXAgfSk7XG5cblx0XHRJbXBvcnRlcldlYnNvY2tldC5wcm9ncmVzc1VwZGF0ZWQodGhpcy5wcm9ncmVzcyk7XG5cblx0XHRyZXR1cm4gdGhpcy5wcm9ncmVzcztcblx0fVxuXG5cdC8qKlxuXHQgKiBBZGRzIHRoZSBwYXNzZWQgaW4gdmFsdWUgdG8gdGhlIHRvdGFsIGFtb3VudCBvZiBpdGVtcyBuZWVkZWQgdG8gY29tcGxldGUuXG5cdCAqXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBjb3VudCBUaGUgYW1vdW50IHRvIGFkZCB0byB0aGUgdG90YWwgY291bnQgb2YgaXRlbXMuXG5cdCAqIEByZXR1cm5zIHtQcm9ncmVzc30gVGhlIHByb2dyZXNzIHJlY29yZCBvZiB0aGUgaW1wb3J0LlxuXHQgKi9cblx0YWRkQ291bnRUb1RvdGFsKGNvdW50KSB7XG5cdFx0dGhpcy5wcm9ncmVzcy5jb3VudC50b3RhbCA9IHRoaXMucHJvZ3Jlc3MuY291bnQudG90YWwgKyBjb3VudDtcblx0XHR0aGlzLnVwZGF0ZVJlY29yZCh7ICdjb3VudC50b3RhbCc6IHRoaXMucHJvZ3Jlc3MuY291bnQudG90YWwgfSk7XG5cblx0XHRyZXR1cm4gdGhpcy5wcm9ncmVzcztcblx0fVxuXG5cdC8qKlxuXHQgKiBBZGRzIHRoZSBwYXNzZWQgaW4gdmFsdWUgdG8gdGhlIHRvdGFsIGFtb3VudCBvZiBpdGVtcyBjb21wbGV0ZWQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBjb3VudCBUaGUgYW1vdW50IHRvIGFkZCB0byB0aGUgdG90YWwgY291bnQgb2YgZmluaXNoZWQgaXRlbXMuXG5cdCAqIEByZXR1cm5zIHtQcm9ncmVzc30gVGhlIHByb2dyZXNzIHJlY29yZCBvZiB0aGUgaW1wb3J0LlxuXHQgKi9cblx0YWRkQ291bnRDb21wbGV0ZWQoY291bnQpIHtcblx0XHR0aGlzLnByb2dyZXNzLmNvdW50LmNvbXBsZXRlZCA9IHRoaXMucHJvZ3Jlc3MuY291bnQuY29tcGxldGVkICsgY291bnQ7XG5cblx0XHQvLyBPbmx5IHVwZGF0ZSB0aGUgZGF0YWJhc2UgZXZlcnkgNTAwIHJlY29yZHNcblx0XHQvLyBPciB0aGUgY29tcGxldGVkIGlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB0aGUgdG90YWwgYW1vdW50XG5cdFx0aWYgKCgodGhpcy5wcm9ncmVzcy5jb3VudC5jb21wbGV0ZWQgJSA1MDApID09PSAwKSB8fCAodGhpcy5wcm9ncmVzcy5jb3VudC5jb21wbGV0ZWQgPj0gdGhpcy5wcm9ncmVzcy5jb3VudC50b3RhbCkpIHtcblx0XHRcdHRoaXMudXBkYXRlUmVjb3JkKHsgJ2NvdW50LmNvbXBsZXRlZCc6IHRoaXMucHJvZ3Jlc3MuY291bnQuY29tcGxldGVkIH0pO1xuXHRcdH1cblxuXHRcdEltcG9ydGVyV2Vic29ja2V0LnByb2dyZXNzVXBkYXRlZCh0aGlzLnByb2dyZXNzKTtcblxuXHRcdHJldHVybiB0aGlzLnByb2dyZXNzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFVwZGF0ZXMgdGhlIGltcG9ydCByZWNvcmQgd2l0aCB0aGUgZ2l2ZW4gZmllbGRzIGJlaW5nIGBzZXRgLlxuXHQgKlxuXHQgKiBAcGFyYW0ge2FueX0gZmllbGRzIFRoZSBmaWVsZHMgdG8gc2V0LCBpdCBzaG91bGQgYmUgYW4gb2JqZWN0IHdpdGgga2V5L3ZhbHVlcy5cblx0ICogQHJldHVybnMge0ltcG9ydHN9IFRoZSBpbXBvcnQgcmVjb3JkLlxuXHQgKi9cblx0dXBkYXRlUmVjb3JkKGZpZWxkcykge1xuXHRcdEltcG9ydHMudXBkYXRlKHsgX2lkOiB0aGlzLmltcG9ydFJlY29yZC5faWQgfSwgeyAkc2V0OiBmaWVsZHMgfSk7XG5cdFx0dGhpcy5pbXBvcnRSZWNvcmQgPSBJbXBvcnRzLmZpbmRPbmUodGhpcy5pbXBvcnRSZWNvcmQuX2lkKTtcblxuXHRcdHJldHVybiB0aGlzLmltcG9ydFJlY29yZDtcblx0fVxuXG5cdC8qKlxuXHQgKiBVcGxvYWRzIHRoZSBmaWxlIHRvIHRoZSBzdG9yYWdlLlxuXHQgKlxuXHQgKiBAcGFyYW0ge2FueX0gZGV0YWlscyBBbiBvYmplY3Qgd2l0aCBkZXRhaWxzIGFib3V0IHRoZSB1cGxvYWQ6IGBuYW1lYCwgYHNpemVgLCBgdHlwZWAsIGFuZCBgcmlkYC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGZpbGVVcmwgVXJsIG9mIHRoZSBmaWxlIHRvIGRvd25sb2FkL2ltcG9ydC5cblx0ICogQHBhcmFtIHthbnl9IHVzZXIgVGhlIFJvY2tldC5DaGF0IHVzZXIuXG5cdCAqIEBwYXJhbSB7YW55fSByb29tIFRoZSBSb2NrZXQuQ2hhdCBSb29tLlxuXHQgKiBAcGFyYW0ge0RhdGV9IHRpbWVTdGFtcCBUaGUgdGltZXN0YW1wIHRoZSBmaWxlIHdhcyB1cGxvYWRlZFxuXHQgKi9cblx0dXBsb2FkRmlsZShkZXRhaWxzLCBmaWxlVXJsLCB1c2VyLCByb29tLCB0aW1lU3RhbXApIHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZyhgVXBsb2FkaW5nIHRoZSBmaWxlICR7IGRldGFpbHMubmFtZSB9IGZyb20gJHsgZmlsZVVybCB9LmApO1xuXHRcdGNvbnN0IHJlcXVlc3RNb2R1bGUgPSAvaHR0cHMvaS50ZXN0KGZpbGVVcmwpID8gdGhpcy5odHRwcyA6IHRoaXMuaHR0cDtcblxuXHRcdGNvbnN0IGZpbGVTdG9yZSA9IEZpbGVVcGxvYWQuZ2V0U3RvcmUoJ1VwbG9hZHMnKTtcblxuXHRcdHJldHVybiByZXF1ZXN0TW9kdWxlLmdldChmaWxlVXJsLCBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0Y29uc3QgcmF3RGF0YSA9IFtdO1xuXHRcdFx0cmVzLm9uKCdkYXRhJywgKGNodW5rKSA9PiByYXdEYXRhLnB1c2goY2h1bmspKTtcblx0XHRcdHJlcy5vbignZW5kJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdFx0XHRcdGZpbGVTdG9yZS5pbnNlcnQoZGV0YWlscywgQnVmZmVyLmNvbmNhdChyYXdEYXRhKSwgZnVuY3Rpb24oZXJyLCBmaWxlKSB7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGVycik7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNvbnN0IHVybCA9IGZpbGUudXJsLnJlcGxhY2UoTWV0ZW9yLmFic29sdXRlVXJsKCksICcvJyk7XG5cblx0XHRcdFx0XHRcdGNvbnN0IGF0dGFjaG1lbnQgPSB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiBmaWxlLm5hbWUsXG5cdFx0XHRcdFx0XHRcdHRpdGxlX2xpbms6IHVybCxcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdGlmICgvXmltYWdlXFwvLisvLnRlc3QoZmlsZS50eXBlKSkge1xuXHRcdFx0XHRcdFx0XHRhdHRhY2htZW50LmltYWdlX3VybCA9IHVybDtcblx0XHRcdFx0XHRcdFx0YXR0YWNobWVudC5pbWFnZV90eXBlID0gZmlsZS50eXBlO1xuXHRcdFx0XHRcdFx0XHRhdHRhY2htZW50LmltYWdlX3NpemUgPSBmaWxlLnNpemU7XG5cdFx0XHRcdFx0XHRcdGF0dGFjaG1lbnQuaW1hZ2VfZGltZW5zaW9ucyA9IGZpbGUuaWRlbnRpZnkgIT0gbnVsbCA/IGZpbGUuaWRlbnRpZnkuc2l6ZSA6IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKC9eYXVkaW9cXC8uKy8udGVzdChmaWxlLnR5cGUpKSB7XG5cdFx0XHRcdFx0XHRcdGF0dGFjaG1lbnQuYXVkaW9fdXJsID0gdXJsO1xuXHRcdFx0XHRcdFx0XHRhdHRhY2htZW50LmF1ZGlvX3R5cGUgPSBmaWxlLnR5cGU7XG5cdFx0XHRcdFx0XHRcdGF0dGFjaG1lbnQuYXVkaW9fc2l6ZSA9IGZpbGUuc2l6ZTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKC9edmlkZW9cXC8uKy8udGVzdChmaWxlLnR5cGUpKSB7XG5cdFx0XHRcdFx0XHRcdGF0dGFjaG1lbnQudmlkZW9fdXJsID0gdXJsO1xuXHRcdFx0XHRcdFx0XHRhdHRhY2htZW50LnZpZGVvX3R5cGUgPSBmaWxlLnR5cGU7XG5cdFx0XHRcdFx0XHRcdGF0dGFjaG1lbnQudmlkZW9fc2l6ZSA9IGZpbGUuc2l6ZTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Y29uc3QgbXNnID0ge1xuXHRcdFx0XHRcdFx0XHRyaWQ6IGRldGFpbHMucmlkLFxuXHRcdFx0XHRcdFx0XHR0czogdGltZVN0YW1wLFxuXHRcdFx0XHRcdFx0XHRtc2c6ICcnLFxuXHRcdFx0XHRcdFx0XHRmaWxlOiB7XG5cdFx0XHRcdFx0XHRcdFx0X2lkOiBmaWxlLl9pZCxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0Z3JvdXBhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0YXR0YWNobWVudHM6IFthdHRhY2htZW50XSxcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdGlmICgoZGV0YWlscy5tZXNzYWdlX2lkICE9IG51bGwpICYmICh0eXBlb2YgZGV0YWlscy5tZXNzYWdlX2lkID09PSAnc3RyaW5nJykpIHtcblx0XHRcdFx0XHRcdFx0bXNnLl9pZCA9IGRldGFpbHMubWVzc2FnZV9pZDtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuc2VuZE1lc3NhZ2UodXNlciwgbXNnLCByb29tLCB0cnVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSkpO1xuXHRcdH0pKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgUHJvZ3Jlc3NTdGVwIH0gZnJvbSAnLi4vLi4vbGliL0ltcG9ydGVyUHJvZ3Jlc3NTdGVwJztcblxuZXhwb3J0IGNsYXNzIFByb2dyZXNzIHtcblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBuZXcgcHJvZ3Jlc3MgY29udGFpbmVyIGZvciB0aGUgaW1wb3J0ZXIuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIHVuaXF1ZSBrZXkgb2YgdGhlIGltcG9ydGVyLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgaW1wb3J0ZXIuXG5cdCAqL1xuXHRjb25zdHJ1Y3RvcihrZXksIG5hbWUpIHtcblx0XHR0aGlzLmtleSA9IGtleTtcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdHRoaXMuc3RlcCA9IFByb2dyZXNzU3RlcC5ORVc7XG5cdFx0dGhpcy5jb3VudCA9IHsgY29tcGxldGVkOiAwLCB0b3RhbDogMCB9O1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgU2VsZWN0aW9uIHtcblx0LyoqXG5cdCAqIENvbnN0cnVjdHMgYSBuZXcgaW1wb3J0ZXIgc2VsZWN0aW9uIG9iamVjdC5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgdGhlIG5hbWUgb2YgdGhlIGltcG9ydGVyXG5cdCAqIEBwYXJhbSB7U2VsZWN0aW9uVXNlcltdfSB1c2VycyB0aGUgdXNlcnMgd2hpY2ggY2FuIGJlIHNlbGVjdGVkXG5cdCAqIEBwYXJhbSB7U2VsZWN0aW9uQ2hhbm5lbFtdfSBjaGFubmVscyB0aGUgY2hhbm5lbHMgd2hpY2ggY2FuIGJlIHNlbGVjdGVkXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBtZXNzYWdlX2NvdW50IHRoZSBudW1iZXIgb2YgbWVzc2FnZXNcblx0ICovXG5cdGNvbnN0cnVjdG9yKG5hbWUsIHVzZXJzLCBjaGFubmVscywgbWVzc2FnZV9jb3VudCkge1xuXHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0dGhpcy51c2VycyA9IHVzZXJzO1xuXHRcdHRoaXMuY2hhbm5lbHMgPSBjaGFubmVscztcblx0XHR0aGlzLm1lc3NhZ2VfY291bnQgPSBtZXNzYWdlX2NvdW50O1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgU2VsZWN0aW9uQ2hhbm5lbCB7XG5cdC8qKlxuXHQgKiBDb25zdHJ1Y3RzIGEgbmV3IHNlbGVjdGlvbiBjaGFubmVsLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gY2hhbm5lbF9pZCB0aGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNoYW5uZWxcblx0ICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgdGhlIG5hbWUgb2YgdGhlIGNoYW5uZWxcblx0ICogQHBhcmFtIHtib29sZWFufSBpc19hcmNoaXZlZCB3aGV0aGVyIHRoZSBjaGFubmVsIHdhcyBhcmNoaXZlZCBvciBub3Rcblx0ICogQHBhcmFtIHtib29sZWFufSBkb19pbXBvcnQgd2hldGhlciB3ZSB3aWxsIGJlIGltcG9ydGluZyB0aGUgY2hhbm5lbCBvciBub3Rcblx0ICogQHBhcmFtIHtib29sZWFufSBpc19wcml2YXRlIHdoZXRoZXIgdGhlIGNoYW5uZWwgaXMgcHJpdmF0ZSBvciBwdWJsaWNcblx0ICovXG5cdGNvbnN0cnVjdG9yKGNoYW5uZWxfaWQsIG5hbWUsIGlzX2FyY2hpdmVkLCBkb19pbXBvcnQsIGlzX3ByaXZhdGUpIHtcblx0XHR0aGlzLmNoYW5uZWxfaWQgPSBjaGFubmVsX2lkO1xuXHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0dGhpcy5pc19hcmNoaXZlZCA9IGlzX2FyY2hpdmVkO1xuXHRcdHRoaXMuZG9faW1wb3J0ID0gZG9faW1wb3J0O1xuXHRcdHRoaXMuaXNfcHJpdmF0ZSA9IGlzX3ByaXZhdGU7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBTZWxlY3Rpb25Vc2VyIHtcblx0LyoqXG5cdCAqIENvbnN0cnVjdHMgYSBuZXcgc2VsZWN0aW9uIHVzZXIuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB1c2VyX2lkIHRoZSB1bmlxdWUgdXNlciBpZGVudGlmaWVyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB1c2VybmFtZSB0aGUgdXNlcidzIHVzZXJuYW1lXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBlbWFpbCB0aGUgdXNlcidzIGVtYWlsXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNfZGVsZXRlZCB3aGV0aGVyIHRoZSB1c2VyIHdhcyBkZWxldGVkIG9yIG5vdFxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IGlzX2JvdCB3aGV0aGVyIHRoZSB1c2VyIGlzIGEgYm90IG9yIG5vdFxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IGRvX2ltcG9ydCB3aGV0aGVyIHdlIGFyZSBnb2luZyB0byBpbXBvcnQgdGhpcyB1c2VyIG9yIG5vdFxuXHQgKi9cblx0Y29uc3RydWN0b3IodXNlcl9pZCwgdXNlcm5hbWUsIGVtYWlsLCBpc19kZWxldGVkLCBpc19ib3QsIGRvX2ltcG9ydCkge1xuXHRcdHRoaXMudXNlcl9pZCA9IHVzZXJfaWQ7XG5cdFx0dGhpcy51c2VybmFtZSA9IHVzZXJuYW1lO1xuXHRcdHRoaXMuZW1haWwgPSBlbWFpbDtcblx0XHR0aGlzLmlzX2RlbGV0ZWQgPSBpc19kZWxldGVkO1xuXHRcdHRoaXMuaXNfYm90ID0gaXNfYm90O1xuXHRcdHRoaXMuZG9faW1wb3J0ID0gZG9faW1wb3J0O1xuXHR9XG59XG4iLCJjbGFzcyBJbXBvcnRlcldlYnNvY2tldERlZiB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuc3RyZWFtZXIgPSBuZXcgTWV0ZW9yLlN0cmVhbWVyKCdpbXBvcnRlcnMnLCB7IHJldHJhbnNtaXQ6IGZhbHNlIH0pO1xuXHRcdHRoaXMuc3RyZWFtZXIuYWxsb3dSZWFkKCdhbGwnKTtcblx0XHR0aGlzLnN0cmVhbWVyLmFsbG93RW1pdCgnYWxsJyk7XG5cdFx0dGhpcy5zdHJlYW1lci5hbGxvd1dyaXRlKCdub25lJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ2FsbGVkIHdoZW4gdGhlIHByb2dyZXNzIGlzIHVwZGF0ZWQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7UHJvZ3Jlc3N9IHByb2dyZXNzIFRoZSBwcm9ncmVzcyBvZiB0aGUgaW1wb3J0LlxuXHQgKi9cblx0cHJvZ3Jlc3NVcGRhdGVkKHByb2dyZXNzKSB7XG5cdFx0dGhpcy5zdHJlYW1lci5lbWl0KCdwcm9ncmVzcycsIHByb2dyZXNzKTtcblx0fVxufVxuXG5leHBvcnQgY29uc3QgSW1wb3J0ZXJXZWJzb2NrZXQgPSBuZXcgSW1wb3J0ZXJXZWJzb2NrZXREZWYoKTtcbiIsImNsYXNzIEltcG9ydHNNb2RlbCBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2ltcG9ydCcpO1xuXHR9XG59XG5cbmV4cG9ydCBjb25zdCBJbXBvcnRzID0gbmV3IEltcG9ydHNNb2RlbCgpO1xuIiwiY2xhc3MgUmF3SW1wb3J0c01vZGVsIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigncmF3X2ltcG9ydHMnKTtcblx0fVxufVxuXG5leHBvcnQgY29uc3QgUmF3SW1wb3J0cyA9IG5ldyBSYXdJbXBvcnRzTW9kZWwoKTtcbiIsImltcG9ydCB7IEltcG9ydGVycyB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmltcG9ydGVyJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRnZXRJbXBvcnRQcm9ncmVzcyhrZXkpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnZ2V0SW1wb3J0UHJvZ3Jlc3MnIH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3J1bi1pbXBvcnQnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0ltcG9ydGluZyBpcyBub3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnc2V0dXBJbXBvcnRlcicgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW1wb3J0ZXIgPSBJbXBvcnRlcnMuZ2V0KGtleSk7XG5cblx0XHRpZiAoIWltcG9ydGVyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbXBvcnRlci1ub3QtZGVmaW5lZCcsIGBUaGUgaW1wb3J0ZXIgKCR7IGtleSB9KSBoYXMgbm8gaW1wb3J0IGNsYXNzIGRlZmluZWQuYCwgeyBtZXRob2Q6ICdnZXRJbXBvcnRQcm9ncmVzcycgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFpbXBvcnRlci5pbnN0YW5jZSkge1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gaW1wb3J0ZXIuaW5zdGFuY2UuZ2V0UHJvZ3Jlc3MoKTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IHtcblx0SW1wb3J0ZXJzLFxuXHRQcm9ncmVzc1N0ZXAsXG59IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmltcG9ydGVyJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRnZXRTZWxlY3Rpb25EYXRhKGtleSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdnZXRTZWxlY3Rpb25EYXRhJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdydW4taW1wb3J0JykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdJbXBvcnRpbmcgaXMgbm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ3NldHVwSW1wb3J0ZXInIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGltcG9ydGVyID0gSW1wb3J0ZXJzLmdldChrZXkpO1xuXG5cdFx0aWYgKCFpbXBvcnRlciB8fCAhaW1wb3J0ZXIuaW5zdGFuY2UpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWltcG9ydGVyLW5vdC1kZWZpbmVkJywgYFRoZSBpbXBvcnRlciAoJHsga2V5IH0pIGhhcyBubyBpbXBvcnQgY2xhc3MgZGVmaW5lZC5gLCB7IG1ldGhvZDogJ2dldFNlbGVjdGlvbkRhdGEnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHByb2dyZXNzID0gaW1wb3J0ZXIuaW5zdGFuY2UuZ2V0UHJvZ3Jlc3MoKTtcblxuXHRcdHN3aXRjaCAocHJvZ3Jlc3Muc3RlcCkge1xuXHRcdFx0Y2FzZSBQcm9ncmVzc1N0ZXAuVVNFUl9TRUxFQ1RJT046XG5cdFx0XHRcdHJldHVybiBpbXBvcnRlci5pbnN0YW5jZS5nZXRTZWxlY3Rpb24oKTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgeyBJbXBvcnRlcnMgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0cHJlcGFyZUltcG9ydChrZXksIGRhdGFVUkksIGNvbnRlbnRUeXBlLCBmaWxlTmFtZSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdwcmVwYXJlSW1wb3J0JyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdydW4taW1wb3J0JykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdJbXBvcnRpbmcgaXMgbm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ3NldHVwSW1wb3J0ZXInIH0pO1xuXHRcdH1cblxuXHRcdGNoZWNrKGtleSwgU3RyaW5nKTtcblx0XHRjaGVjayhkYXRhVVJJLCBTdHJpbmcpO1xuXHRcdGNoZWNrKGZpbGVOYW1lLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3QgaW1wb3J0ZXIgPSBJbXBvcnRlcnMuZ2V0KGtleSk7XG5cblx0XHRpZiAoIWltcG9ydGVyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbXBvcnRlci1ub3QtZGVmaW5lZCcsIGBUaGUgaW1wb3J0ZXIgKCR7IGtleSB9KSBoYXMgbm8gaW1wb3J0IGNsYXNzIGRlZmluZWQuYCwgeyBtZXRob2Q6ICdwcmVwYXJlSW1wb3J0JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCByZXN1bHRzID0gaW1wb3J0ZXIuaW5zdGFuY2UucHJlcGFyZShkYXRhVVJJLCBjb250ZW50VHlwZSwgZmlsZU5hbWUpO1xuXG5cdFx0aWYgKHJlc3VsdHMgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG5cdFx0XHRyZXR1cm4gcmVzdWx0cy5jYXRjaCgoZSkgPT4geyB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKGUpOyB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHJlc3VsdHM7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQge1xuXHRJbXBvcnRlcnMsXG5cdFByb2dyZXNzU3RlcCxcbn0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6aW1wb3J0ZXInO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdHJlc3RhcnRJbXBvcnQoa2V5KSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ3Jlc3RhcnRJbXBvcnQnIH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3J1bi1pbXBvcnQnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0ltcG9ydGluZyBpcyBub3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnc2V0dXBJbXBvcnRlcicgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW1wb3J0ZXIgPSBJbXBvcnRlcnMuZ2V0KGtleSk7XG5cblx0XHRpZiAoIWltcG9ydGVyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbXBvcnRlci1ub3QtZGVmaW5lZCcsIGBUaGUgaW1wb3J0ZXIgKCR7IGtleSB9KSBoYXMgbm8gaW1wb3J0IGNsYXNzIGRlZmluZWQuYCwgeyBtZXRob2Q6ICdyZXN0YXJ0SW1wb3J0JyB9KTtcblx0XHR9XG5cblx0XHRpZiAoaW1wb3J0ZXIuaW5zdGFuY2UpIHtcblx0XHRcdGltcG9ydGVyLmluc3RhbmNlLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5DQU5DRUxMRUQpO1xuXHRcdFx0aW1wb3J0ZXIuaW5zdGFuY2UudXBkYXRlUmVjb3JkKHsgdmFsaWQ6IGZhbHNlIH0pO1xuXHRcdFx0aW1wb3J0ZXIuaW5zdGFuY2UgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0aW1wb3J0ZXIuaW5zdGFuY2UgPSBuZXcgaW1wb3J0ZXIuaW1wb3J0ZXIoaW1wb3J0ZXIpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5ldy1jYXBcblx0XHRyZXR1cm4gaW1wb3J0ZXIuaW5zdGFuY2UuZ2V0UHJvZ3Jlc3MoKTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IHsgSW1wb3J0ZXJzIH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6aW1wb3J0ZXInO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdHNldHVwSW1wb3J0ZXIoa2V5KSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ3NldHVwSW1wb3J0ZXInIH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3J1bi1pbXBvcnQnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0ltcG9ydGluZyBpcyBub3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnc2V0dXBJbXBvcnRlcicgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW1wb3J0ZXIgPSBJbXBvcnRlcnMuZ2V0KGtleSk7XG5cblx0XHRpZiAoIWltcG9ydGVyKSB7XG5cdFx0XHRjb25zb2xlLndhcm4oYFRyaWVkIHRvIHNldHVwICR7IG5hbWUgfSBhcyBhbiBpbXBvcnRlci5gKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWltcG9ydGVyLW5vdC1kZWZpbmVkJywgJ1RoZSBpbXBvcnRlciB3YXMgbm90IGRlZmluZWQgY29ycmVjdGx5LCBpdCBpcyBtaXNzaW5nIHRoZSBJbXBvcnQgY2xhc3MuJywgeyBtZXRob2Q6ICdzZXR1cEltcG9ydGVyJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoaW1wb3J0ZXIuaW5zdGFuY2UpIHtcblx0XHRcdHJldHVybiBpbXBvcnRlci5pbnN0YW5jZS5nZXRQcm9ncmVzcygpO1xuXHRcdH1cblxuXHRcdGltcG9ydGVyLmluc3RhbmNlID0gbmV3IGltcG9ydGVyLmltcG9ydGVyKGltcG9ydGVyKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuZXctY2FwXG5cdFx0cmV0dXJuIGltcG9ydGVyLmluc3RhbmNlLmdldFByb2dyZXNzKCk7XG5cdH0sXG59KTtcbiIsImltcG9ydCB7XG5cdEltcG9ydGVycyxcblx0U2VsZWN0aW9uLFxuXHRTZWxlY3Rpb25DaGFubmVsLFxuXHRTZWxlY3Rpb25Vc2VyLFxufSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0c3RhcnRJbXBvcnQoa2V5LCBpbnB1dCkge1xuXHRcdC8vIFRha2VzIG5hbWUgYW5kIG9iamVjdCB3aXRoIHVzZXJzIC8gY2hhbm5lbHMgc2VsZWN0ZWQgdG8gaW1wb3J0XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ3N0YXJ0SW1wb3J0JyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdydW4taW1wb3J0JykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdJbXBvcnRpbmcgaXMgbm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ3N0YXJ0SW1wb3J0JyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIWtleSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1pbXBvcnRlcicsIGBObyBkZWZpbmVkIGltcG9ydGVyIGJ5OiBcIiR7IGtleSB9XCJgLCB7IG1ldGhvZDogJ3N0YXJ0SW1wb3J0JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBpbXBvcnRlciA9IEltcG9ydGVycy5nZXQoa2V5KTtcblxuXHRcdGlmICghaW1wb3J0ZXIgfHwgIWltcG9ydGVyLmluc3RhbmNlKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbXBvcnRlci1ub3QtZGVmaW5lZCcsIGBUaGUgaW1wb3J0ZXIgKCR7IGtleSB9KSBoYXMgbm8gaW1wb3J0IGNsYXNzIGRlZmluZWQuYCwgeyBtZXRob2Q6ICdzdGFydEltcG9ydCcgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlcnNTZWxlY3Rpb24gPSBpbnB1dC51c2Vycy5tYXAoKHVzZXIpID0+IG5ldyBTZWxlY3Rpb25Vc2VyKHVzZXIudXNlcl9pZCwgdXNlci51c2VybmFtZSwgdXNlci5lbWFpbCwgdXNlci5pc19kZWxldGVkLCB1c2VyLmlzX2JvdCwgdXNlci5kb19pbXBvcnQpKTtcblx0XHRjb25zdCBjaGFubmVsc1NlbGVjdGlvbiA9IGlucHV0LmNoYW5uZWxzLm1hcCgoY2hhbm5lbCkgPT4gbmV3IFNlbGVjdGlvbkNoYW5uZWwoY2hhbm5lbC5jaGFubmVsX2lkLCBjaGFubmVsLm5hbWUsIGNoYW5uZWwuaXNfYXJjaGl2ZWQsIGNoYW5uZWwuZG9faW1wb3J0KSk7XG5cblx0XHRjb25zdCBzZWxlY3Rpb24gPSBuZXcgU2VsZWN0aW9uKGltcG9ydGVyLm5hbWUsIHVzZXJzU2VsZWN0aW9uLCBjaGFubmVsc1NlbGVjdGlvbik7XG5cdFx0cmV0dXJuIGltcG9ydGVyLmluc3RhbmNlLnN0YXJ0SW1wb3J0KHNlbGVjdGlvbik7XG5cdH0sXG59KTtcbiIsImltcG9ydCB7IEltcG9ydHMgfSBmcm9tICcuLi9tb2RlbHMvSW1wb3J0cyc7XG5pbXBvcnQgeyBSYXdJbXBvcnRzIH0gZnJvbSAnLi4vbW9kZWxzL1Jhd0ltcG9ydHMnO1xuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Ly8gTWFrZSBzdXJlIGFsbCBpbXBvcnRzIGFyZSBtYXJrZWQgYXMgaW52YWxpZCwgZGF0YSBjbGVhbiB1cCBzaW5jZSB5b3UgY2FuJ3Rcblx0Ly8gcmVzdGFydCBhbiBpbXBvcnQgYXQgdGhlIG1vbWVudC5cblx0SW1wb3J0cy51cGRhdGUoeyB2YWxpZDogeyAkbmU6IGZhbHNlIH0gfSwgeyAkc2V0OiB7IHZhbGlkOiBmYWxzZSB9IH0sIHsgbXVsdGk6IHRydWUgfSk7XG5cblx0Ly8gQ2xlYW4gdXAgYWxsIHRoZSByYXcgaW1wb3J0IGRhdGEsIHNpbmNlIHlvdSBjYW4ndCByZXN0YXJ0IGFuIGltcG9ydCBhdCB0aGUgbW9tZW50XG5cdHRyeSB7XG5cdFx0UmF3SW1wb3J0cy5tb2RlbC5yYXdDb2xsZWN0aW9uKCkuZHJvcCgpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0Y29uc29sZS5sb2coJ2VycnJvcicsIGUpOyAvLyBUT0RPOiBSZW1vdmVcblx0XHQvLyBpZ25vcmVkXG5cdH1cbn0pO1xuIiwiaW1wb3J0IHsgQmFzZSB9IGZyb20gJy4vY2xhc3Nlcy9JbXBvcnRlckJhc2UnO1xuaW1wb3J0IHsgSW1wb3J0cyB9IGZyb20gJy4vbW9kZWxzL0ltcG9ydHMnO1xuaW1wb3J0IHsgSW1wb3J0ZXJzIH0gZnJvbSAnLi4vbGliL0ltcG9ydGVycyc7XG5pbXBvcnQgeyBJbXBvcnRlckluZm8gfSBmcm9tICcuLi9saWIvSW1wb3J0ZXJJbmZvJztcbmltcG9ydCB7IEltcG9ydGVyV2Vic29ja2V0IH0gZnJvbSAnLi9jbGFzc2VzL0ltcG9ydGVyV2Vic29ja2V0JztcbmltcG9ydCB7IFByb2dyZXNzIH0gZnJvbSAnLi9jbGFzc2VzL0ltcG9ydGVyUHJvZ3Jlc3MnO1xuaW1wb3J0IHsgUHJvZ3Jlc3NTdGVwIH0gZnJvbSAnLi4vbGliL0ltcG9ydGVyUHJvZ3Jlc3NTdGVwJztcbmltcG9ydCB7IFJhd0ltcG9ydHMgfSBmcm9tICcuL21vZGVscy9SYXdJbXBvcnRzJztcbmltcG9ydCB7IFNlbGVjdGlvbiB9IGZyb20gJy4vY2xhc3Nlcy9JbXBvcnRlclNlbGVjdGlvbic7XG5pbXBvcnQgeyBTZWxlY3Rpb25DaGFubmVsIH0gZnJvbSAnLi9jbGFzc2VzL0ltcG9ydGVyU2VsZWN0aW9uQ2hhbm5lbCc7XG5pbXBvcnQgeyBTZWxlY3Rpb25Vc2VyIH0gZnJvbSAnLi9jbGFzc2VzL0ltcG9ydGVyU2VsZWN0aW9uVXNlcic7XG5cbmV4cG9ydCB7XG5cdEJhc2UsXG5cdEltcG9ydHMsXG5cdEltcG9ydGVycyxcblx0SW1wb3J0ZXJJbmZvLFxuXHRJbXBvcnRlcldlYnNvY2tldCxcblx0UHJvZ3Jlc3MsXG5cdFByb2dyZXNzU3RlcCxcblx0UmF3SW1wb3J0cyxcblx0U2VsZWN0aW9uLFxuXHRTZWxlY3Rpb25DaGFubmVsLFxuXHRTZWxlY3Rpb25Vc2VyLFxufTtcbiIsImV4cG9ydCBjbGFzcyBJbXBvcnRlckluZm8ge1xuXHQvKipcblx0ICogQ3JlYXRlcyBhIG5ldyBjbGFzcyB3aGljaCBjb250YWlucyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgaW1wb3J0ZXIuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIHVuaXF1ZSBrZXkgb2YgdGhpcyBpbXBvcnRlci5cblx0ICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIGkxOG4gbmFtZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IG1pbWVUeXBlIFRoZSB0eXBlIG9mIGZpbGUgaXQgZXhwZWN0cy5cblx0ICogQHBhcmFtIHt7IGhyZWY6IHN0cmluZywgdGV4dDogc3RyaW5nIH1bXX0gd2FybmluZ3MgQW4gYXJyYXkgb2Ygd2FybmluZyBvYmplY3RzLiBgeyBocmVmLCB0ZXh0IH1gXG5cdCAqL1xuXHRjb25zdHJ1Y3RvcihrZXksIG5hbWUgPSAnJywgbWltZVR5cGUgPSAnJywgd2FybmluZ3MgPSBbXSkge1xuXHRcdHRoaXMua2V5ID0ga2V5O1xuXHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0dGhpcy5taW1lVHlwZSA9IG1pbWVUeXBlO1xuXHRcdHRoaXMud2FybmluZ3MgPSB3YXJuaW5ncztcblxuXHRcdHRoaXMuaW1wb3J0ZXIgPSB1bmRlZmluZWQ7XG5cdFx0dGhpcy5pbnN0YW5jZSA9IHVuZGVmaW5lZDtcblx0fVxufVxuIiwiLyoqIFRoZSBwcm9ncmVzcyBzdGVwIHRoYXQgYW4gaW1wb3J0ZXIgaXMgYXQuICovXG5leHBvcnQgY29uc3QgUHJvZ3Jlc3NTdGVwID0gT2JqZWN0LmZyZWV6ZSh7XG5cdE5FVzogJ2ltcG9ydGVyX25ldycsXG5cdFBSRVBBUklOR19TVEFSVEVEOiAnaW1wb3J0ZXJfcHJlcGFyaW5nX3N0YXJ0ZWQnLFxuXHRQUkVQQVJJTkdfVVNFUlM6ICdpbXBvcnRlcl9wcmVwYXJpbmdfdXNlcnMnLFxuXHRQUkVQQVJJTkdfQ0hBTk5FTFM6ICdpbXBvcnRlcl9wcmVwYXJpbmdfY2hhbm5lbHMnLFxuXHRQUkVQQVJJTkdfTUVTU0FHRVM6ICdpbXBvcnRlcl9wcmVwYXJpbmdfbWVzc2FnZXMnLFxuXHRVU0VSX1NFTEVDVElPTjogJ2ltcG9ydGVyX3VzZXJfc2VsZWN0aW9uJyxcblx0SU1QT1JUSU5HX1NUQVJURUQ6ICdpbXBvcnRlcl9pbXBvcnRpbmdfc3RhcnRlZCcsXG5cdElNUE9SVElOR19VU0VSUzogJ2ltcG9ydGVyX2ltcG9ydGluZ191c2VycycsXG5cdElNUE9SVElOR19DSEFOTkVMUzogJ2ltcG9ydGVyX2ltcG9ydGluZ19jaGFubmVscycsXG5cdElNUE9SVElOR19NRVNTQUdFUzogJ2ltcG9ydGVyX2ltcG9ydGluZ19tZXNzYWdlcycsXG5cdEZJTklTSElORzogJ2ltcG9ydGVyX2ZpbmlzaGluZycsXG5cdERPTkU6ICdpbXBvcnRlcl9kb25lJyxcblx0RVJST1I6ICdpbXBvcnRlcl9pbXBvcnRfZmFpbGVkJyxcblx0Q0FOQ0VMTEVEOiAnaW1wb3J0ZXJfaW1wb3J0X2NhbmNlbGxlZCcsXG59KTtcbiIsImltcG9ydCB7IEltcG9ydGVySW5mbyB9IGZyb20gJy4vSW1wb3J0ZXJJbmZvJztcblxuLyoqIENvbnRhaW5lciBjbGFzcyB3aGljaCBob2xkcyBhbGwgb2YgdGhlIGltcG9ydGVyIGRldGFpbHMuICovXG5jbGFzcyBJbXBvcnRlcnNDb250YWluZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLmltcG9ydGVycyA9IG5ldyBNYXAoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBZGRzIGFuIGltcG9ydGVyIHRvIHRoZSBpbXBvcnQgY29sbGVjdGlvbi4gQWRkaW5nIGl0IG1vcmUgdGhhbiBvbmNlIHdpbGxcblx0ICogb3ZlcndyaXRlIHRoZSBwcmV2aW91cyBvbmUuXG5cdCAqXG5cdCAqIEBwYXJhbSB7SW1wb3J0ZXJJbmZvfSBpbmZvIFRoZSBpbmZvcm1hdGlvbiByZWxhdGVkIHRvIHRoZSBpbXBvcnRlci5cblx0ICogQHBhcmFtIHsqfSBpbXBvcnRlciBUaGUgY2xhc3MgZm9yIHRoZSBpbXBvcnRlciwgd2lsbCBiZSB1bmRlZmluZWQgb24gdGhlIGNsaWVudC5cblx0ICovXG5cdGFkZChpbmZvLCBpbXBvcnRlcikge1xuXHRcdGlmICghKGluZm8gaW5zdGFuY2VvZiBJbXBvcnRlckluZm8pKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1RoZSBpbXBvcnRlciBtdXN0IGJlIGEgdmFsaWQgSW1wb3J0ZXJJbmZvIGluc3RhbmNlLicpO1xuXHRcdH1cblxuXHRcdGluZm8uaW1wb3J0ZXIgPSBpbXBvcnRlcjtcblxuXHRcdHRoaXMuaW1wb3J0ZXJzLnNldChpbmZvLmtleSwgaW5mbyk7XG5cblx0XHRyZXR1cm4gdGhpcy5pbXBvcnRlcnMuZ2V0KGluZm8ua2V5KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBpbXBvcnRlciBpbmZvcm1hdGlvbiB0aGF0IGlzIHN0b3JlZC5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBpbXBvcnRlci5cblx0ICovXG5cdGdldChrZXkpIHtcblx0XHRyZXR1cm4gdGhpcy5pbXBvcnRlcnMuZ2V0KGtleSk7XG5cdH1cblxuXHQvKipcblx0ICogR2V0cyBhbGwgb2YgdGhlIGltcG9ydGVycyBpbiBhcnJheSBmb3JtYXQuXG5cdCAqXG5cdCAqIEByZXR1cm5zIHtJbXBvcnRlckluZm9bXX0gVGhlIGFycmF5IG9mIGltcG9ydGVyIGluZm9ybWF0aW9uLlxuXHQgKi9cblx0Z2V0QWxsKCkge1xuXHRcdHJldHVybiBBcnJheS5mcm9tKHRoaXMuaW1wb3J0ZXJzLnZhbHVlcygpKTtcblx0fVxufVxuXG5leHBvcnQgY29uc3QgSW1wb3J0ZXJzID0gbmV3IEltcG9ydGVyc0NvbnRhaW5lcigpO1xuIl19
