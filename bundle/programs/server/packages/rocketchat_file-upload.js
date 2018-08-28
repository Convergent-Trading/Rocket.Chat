(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChatFile = Package['rocketchat:file'].RocketChatFile;
var Slingshot = Package['edgee:slingshot'].Slingshot;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Random = Package.random.Random;
var Accounts = Package['accounts-base'].Accounts;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var FileUpload, FileUploadBase, file, options, fileUploadHandler;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:file-upload":{"globalFileRestrictions.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/globalFileRestrictions.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let filesize;
module.watch(require("filesize"), {
  default(v) {
    filesize = v;
  }

}, 0);
const slingShotConfig = {
  authorize(file
  /*, metaContext*/
  ) {
    //Deny uploads if user is not logged in.
    if (!this.userId) {
      throw new Meteor.Error('login-required', 'Please login before posting files');
    }

    if (!RocketChat.fileUploadIsValidContentType(file.type)) {
      throw new Meteor.Error(TAPi18n.__('error-invalid-file-type'));
    }

    const maxFileSize = RocketChat.settings.get('FileUpload_MaxFileSize');

    if (maxFileSize > -1 && maxFileSize < file.size) {
      throw new Meteor.Error(TAPi18n.__('File_exceeds_allowed_size_of_bytes', {
        size: filesize(maxFileSize)
      }));
    }

    return true;
  },

  maxSize: 0,
  allowedFileTypes: null
};
Slingshot.fileRestrictions('rocketchat-uploads', slingShotConfig);
Slingshot.fileRestrictions('rocketchat-uploads-gs', slingShotConfig);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"FileUpload.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/lib/FileUpload.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let filesize;
module.watch(require("filesize"), {
  default(v) {
    filesize = v;
  }

}, 0);
let maxFileSize = 0;
FileUpload = {
  validateFileUpload(file) {
    if (!Match.test(file.rid, String)) {
      return false;
    } // livechat users can upload files but they don't have an userId


    const user = file.userId ? Meteor.user() : null;
    const room = RocketChat.models.Rooms.findOneById(file.rid);
    const directMessageAllow = RocketChat.settings.get('FileUpload_Enabled_Direct');
    const fileUploadAllowed = RocketChat.settings.get('FileUpload_Enabled');

    if (RocketChat.authz.canAccessRoom(room, user, file) !== true) {
      return false;
    }

    const language = user ? user.language : 'en';

    if (!fileUploadAllowed) {
      const reason = TAPi18n.__('FileUpload_Disabled', language);

      throw new Meteor.Error('error-file-upload-disabled', reason);
    }

    if (!directMessageAllow && room.t === 'd') {
      const reason = TAPi18n.__('File_not_allowed_direct_messages', language);

      throw new Meteor.Error('error-direct-message-file-upload-not-allowed', reason);
    } // -1 maxFileSize means there is no limit


    if (maxFileSize > -1 && file.size > maxFileSize) {
      const reason = TAPi18n.__('File_exceeds_allowed_size_of_bytes', {
        size: filesize(maxFileSize)
      }, language);

      throw new Meteor.Error('error-file-too-large', reason);
    }

    if (!RocketChat.fileUploadIsValidContentType(file.type)) {
      const reason = TAPi18n.__('File_type_is_not_accepted', language);

      throw new Meteor.Error('error-invalid-file-type', reason);
    }

    return true;
  }

};
RocketChat.settings.get('FileUpload_MaxFileSize', function (key, value) {
  try {
    maxFileSize = parseInt(value);
  } catch (e) {
    maxFileSize = RocketChat.models.Settings.findOneById('FileUpload_MaxFileSize').packageValue;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"FileUploadBase.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/lib/FileUploadBase.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
UploadFS.config.defaultStorePermissions = new UploadFS.StorePermissions({
  insert(userId, doc) {
    if (userId) {
      return true;
    } // allow inserts from slackbridge (message_id = slack-timestamp-milli)


    if (doc && doc.message_id && doc.message_id.indexOf('slack-') === 0) {
      return true;
    } // allow inserts to the UserDataFiles store


    if (doc && doc.store && doc.store.split(':').pop() === 'UserDataFiles') {
      return true;
    }

    if (RocketChat.authz.canAccessRoom(null, null, doc)) {
      return true;
    }

    return false;
  },

  update(userId, doc) {
    return RocketChat.authz.hasPermission(Meteor.userId(), 'delete-message', doc.rid) || RocketChat.settings.get('Message_AllowDeleting') && userId === doc.userId;
  },

  remove(userId, doc) {
    return RocketChat.authz.hasPermission(Meteor.userId(), 'delete-message', doc.rid) || RocketChat.settings.get('Message_AllowDeleting') && userId === doc.userId;
  }

});
FileUploadBase = class FileUploadBase {
  constructor(store, meta, file) {
    this.id = Random.id();
    this.meta = meta;
    this.file = file;
    this.store = store;
  }

  getProgress() {}

  getFileName() {
    return this.meta.name;
  }

  start(callback) {
    this.handler = new UploadFS.Uploader({
      store: this.store,
      data: this.file,
      file: this.meta,
      onError: err => {
        return callback(err);
      },
      onComplete: fileData => {
        const file = _.pick(fileData, '_id', 'type', 'size', 'name', 'identify', 'description');

        file.url = fileData.url.replace(Meteor.absoluteUrl(), '/');
        return callback(null, file, this.store.options.name);
      }
    });

    this.handler.onProgress = (file, progress) => {
      this.onProgress(progress);
    };

    return this.handler.start();
  }

  onProgress() {}

  stop() {
    return this.handler.stop();
  }

};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"lib":{"FileUpload.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/lib/FileUpload.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  FileUploadClass: () => FileUploadClass
});
let fs;
module.watch(require("fs"), {
  default(v) {
    fs = v;
  }

}, 0);
let stream;
module.watch(require("stream"), {
  default(v) {
    stream = v;
  }

}, 1);
let mime;
module.watch(require("mime-type/with-db"), {
  default(v) {
    mime = v;
  }

}, 2);
let Future;
module.watch(require("fibers/future"), {
  default(v) {
    Future = v;
  }

}, 3);
let sharp;
module.watch(require("sharp"), {
  default(v) {
    sharp = v;
  }

}, 4);
let Cookies;
module.watch(require("meteor/ostrio:cookies"), {
  Cookies(v) {
    Cookies = v;
  }

}, 5);
const cookie = new Cookies();
Object.assign(FileUpload, {
  handlers: {},

  configureUploadsStore(store, name, options) {
    const type = name.split(':').pop();
    const stores = UploadFS.getStores();
    delete stores[name];
    return new UploadFS.store[store](Object.assign({
      name
    }, options, FileUpload[`default${type}`]()));
  },

  defaultUploads() {
    return {
      collection: RocketChat.models.Uploads.model,
      filter: new UploadFS.Filter({
        onCheck: FileUpload.validateFileUpload
      }),

      getPath(file) {
        return `${RocketChat.settings.get('uniqueID')}/uploads/${file.rid}/${file.userId}/${file._id}`;
      },

      onValidate: FileUpload.uploadsOnValidate,

      onRead(fileId, file, req, res) {
        if (!FileUpload.requestCanAccessFiles(req)) {
          res.writeHead(403);
          return false;
        }

        res.setHeader('content-disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
        return true;
      }

    };
  },

  defaultAvatars() {
    return {
      collection: RocketChat.models.Avatars.model,

      // filter: new UploadFS.Filter({
      // 	onCheck: FileUpload.validateFileUpload
      // }),
      getPath(file) {
        return `${RocketChat.settings.get('uniqueID')}/avatars/${file.userId}`;
      },

      onValidate: FileUpload.avatarsOnValidate,
      onFinishUpload: FileUpload.avatarsOnFinishUpload
    };
  },

  defaultUserDataFiles() {
    return {
      collection: RocketChat.models.UserDataFiles.model,

      getPath(file) {
        return `${RocketChat.settings.get('uniqueID')}/uploads/userData/${file.userId}`;
      },

      onValidate: FileUpload.uploadsOnValidate,

      onRead(fileId, file, req, res) {
        if (!FileUpload.requestCanAccessFiles(req)) {
          res.writeHead(403);
          return false;
        }

        res.setHeader('content-disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
        return true;
      }

    };
  },

  avatarsOnValidate(file) {
    if (RocketChat.settings.get('Accounts_AvatarResize') !== true) {
      return;
    }

    const tempFilePath = UploadFS.getTempFilePath(file._id);
    const height = RocketChat.settings.get('Accounts_AvatarSize');
    const future = new Future();
    const s = sharp(tempFilePath);
    s.rotate(); // Get metadata to resize the image the first time to keep "inside" the dimensions
    // then resize again to create the canvas around

    s.metadata(Meteor.bindEnvironment((err, metadata) => {
      if (!metadata) {
        metadata = {};
      }

      s.toFormat(sharp.format.jpeg).resize(Math.min(height || 0, metadata.width || Infinity), Math.min(height || 0, metadata.height || Infinity)).pipe(sharp().resize(height, height).background('#FFFFFF').embed()) // Use buffer to get the result in memory then replace the existing file
      // There is no option to override a file using this library
      .toBuffer().then(Meteor.bindEnvironment(outputBuffer => {
        fs.writeFile(tempFilePath, outputBuffer, Meteor.bindEnvironment(err => {
          if (err != null) {
            console.error(err);
          }

          const size = fs.lstatSync(tempFilePath).size;
          this.getCollection().direct.update({
            _id: file._id
          }, {
            $set: {
              size
            }
          });
          future.return();
        }));
      }));
    }));
    return future.wait();
  },

  resizeImagePreview(file) {
    file = RocketChat.models.Uploads.findOneById(file._id);
    file = FileUpload.addExtensionTo(file);

    const image = FileUpload.getStore('Uploads')._store.getReadStream(file._id, file);

    const transformer = sharp().resize(32, 32).max().jpeg().blur();
    const result = transformer.toBuffer().then(out => out.toString('base64'));
    image.pipe(transformer);
    return result;
  },

  uploadsOnValidate(file) {
    if (!/^image\/((x-windows-)?bmp|p?jpeg|png)$/.test(file.type)) {
      return;
    }

    const tmpFile = UploadFS.getTempFilePath(file._id);
    const fut = new Future();
    const s = sharp(tmpFile);
    s.metadata(Meteor.bindEnvironment((err, metadata) => {
      if (err != null) {
        console.error(err);
        return fut.return();
      }

      const identify = {
        format: metadata.format,
        size: {
          width: metadata.width,
          height: metadata.height
        }
      };

      if (metadata.orientation == null) {
        return fut.return();
      }

      s.rotate().toFile(`${tmpFile}.tmp`).then(Meteor.bindEnvironment(() => {
        fs.unlink(tmpFile, Meteor.bindEnvironment(() => {
          fs.rename(`${tmpFile}.tmp`, tmpFile, Meteor.bindEnvironment(() => {
            const size = fs.lstatSync(tmpFile).size;
            this.getCollection().direct.update({
              _id: file._id
            }, {
              $set: {
                size,
                identify
              }
            });
            fut.return();
          }));
        }));
      })).catch(err => {
        console.error(err);
        fut.return();
      });
    }));
    return fut.wait();
  },

  avatarsOnFinishUpload(file) {
    // update file record to match user's username
    const user = RocketChat.models.Users.findOneById(file.userId);
    const oldAvatar = RocketChat.models.Avatars.findOneByName(user.username);

    if (oldAvatar) {
      RocketChat.models.Avatars.deleteFile(oldAvatar._id);
    }

    RocketChat.models.Avatars.updateFileNameById(file._id, user.username); // console.log('upload finished ->', file);
  },

  requestCanAccessFiles({
    headers = {},
    query = {}
  }) {
    if (!RocketChat.settings.get('FileUpload_ProtectFiles')) {
      return true;
    }

    let {
      rc_uid,
      rc_token,
      rc_rid,
      rc_room_type
    } = query;

    if (!rc_uid && headers.cookie) {
      rc_uid = cookie.get('rc_uid', headers.cookie);
      rc_token = cookie.get('rc_token', headers.cookie);
      rc_rid = cookie.get('rc_rid', headers.cookie);
      rc_room_type = cookie.get('rc_room_type', headers.cookie);
    }

    const isAuthorizedByCookies = rc_uid && rc_token && RocketChat.models.Users.findOneByIdAndLoginToken(rc_uid, rc_token);
    const isAuthorizedByHeaders = headers['x-user-id'] && headers['x-auth-token'] && RocketChat.models.Users.findOneByIdAndLoginToken(headers['x-user-id'], headers['x-auth-token']);
    const isAuthorizedByRoom = rc_room_type && RocketChat.roomTypes.getConfig(rc_room_type).canAccessUploadedFile({
      rc_uid,
      rc_rid,
      rc_token
    });
    return isAuthorizedByCookies || isAuthorizedByHeaders || isAuthorizedByRoom;
  },

  addExtensionTo(file) {
    if (mime.lookup(file.name) === file.type) {
      return file;
    }

    const ext = mime.extension(file.type);

    if (ext && false === new RegExp(`\.${ext}$`, 'i').test(file.name)) {
      file.name = `${file.name}.${ext}`;
    }

    return file;
  },

  getStore(modelName) {
    const storageType = RocketChat.settings.get('FileUpload_Storage_Type');
    const handlerName = `${storageType}:${modelName}`;
    return this.getStoreByName(handlerName);
  },

  getStoreByName(handlerName) {
    if (this.handlers[handlerName] == null) {
      console.error(`Upload handler "${handlerName}" does not exists`);
    }

    return this.handlers[handlerName];
  },

  get(file, req, res, next) {
    const store = this.getStoreByName(file.store);

    if (store && store.get) {
      return store.get(file, req, res, next);
    }

    res.writeHead(404);
    res.end();
  },

  copy(file, targetFile) {
    const store = this.getStoreByName(file.store);
    const out = fs.createWriteStream(targetFile);
    file = FileUpload.addExtensionTo(file);

    if (store.copy) {
      store.copy(file, out);
      return true;
    }

    return false;
  }

});

class FileUploadClass {
  constructor({
    name,
    model,
    store,
    get,
    insert,
    getStore,
    copy
  }) {
    this.name = name;
    this.model = model || this.getModelFromName();
    this._store = store || UploadFS.getStore(name);
    this.get = get;
    this.copy = copy;

    if (insert) {
      this.insert = insert;
    }

    if (getStore) {
      this.getStore = getStore;
    }

    FileUpload.handlers[name] = this;
  }

  getStore() {
    return this._store;
  }

  get store() {
    return this.getStore();
  }

  set store(store) {
    this._store = store;
  }

  getModelFromName() {
    return RocketChat.models[this.name.split(':')[1]];
  }

  delete(fileId) {
    if (this.store && this.store.delete) {
      this.store.delete(fileId);
    }

    return this.model.deleteFile(fileId);
  }

  deleteById(fileId) {
    const file = this.model.findOneById(fileId);

    if (!file) {
      return;
    }

    const store = FileUpload.getStoreByName(file.store);
    return store.delete(file._id);
  }

  deleteByName(fileName) {
    const file = this.model.findOneByName(fileName);

    if (!file) {
      return;
    }

    const store = FileUpload.getStoreByName(file.store);
    return store.delete(file._id);
  }

  insert(fileData, streamOrBuffer, cb) {
    fileData.size = parseInt(fileData.size) || 0; // Check if the fileData matches store filter

    const filter = this.store.getFilter();

    if (filter && filter.check) {
      filter.check(fileData);
    }

    const fileId = this.store.create(fileData);
    const token = this.store.createToken(fileId);
    const tmpFile = UploadFS.getTempFilePath(fileId);

    try {
      if (streamOrBuffer instanceof stream) {
        streamOrBuffer.pipe(fs.createWriteStream(tmpFile));
      } else if (streamOrBuffer instanceof Buffer) {
        fs.writeFileSync(tmpFile, streamOrBuffer);
      } else {
        throw new Error('Invalid file type');
      }

      const file = Meteor.call('ufsComplete', fileId, this.name, token);

      if (cb) {
        cb(null, file);
      }

      return file;
    } catch (e) {
      if (cb) {
        cb(e);
      } else {
        throw e;
      }
    }
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"proxy.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/lib/proxy.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let http;
module.watch(require("http"), {
  default(v) {
    http = v;
  }

}, 0);
let URL;
module.watch(require("url"), {
  default(v) {
    URL = v;
  }

}, 1);
const logger = new Logger('UploadProxy');
WebApp.connectHandlers.stack.unshift({
  route: '',
  handle: Meteor.bindEnvironment(function (req, res, next) {
    // Quick check to see if request should be catch
    if (req.url.indexOf(UploadFS.config.storesPath) === -1) {
      return next();
    }

    logger.debug('Upload URL:', req.url);

    if (req.method !== 'POST') {
      return next();
    } // Remove store path


    const parsedUrl = URL.parse(req.url);
    const path = parsedUrl.pathname.substr(UploadFS.config.storesPath.length + 1); // Get store

    const regExp = new RegExp('^\/([^\/\?]+)\/([^\/\?]+)$');
    const match = regExp.exec(path); // Request is not valid

    if (match === null) {
      res.writeHead(400);
      res.end();
      return;
    } // Get store


    const store = UploadFS.getStore(match[1]);

    if (!store) {
      res.writeHead(404);
      res.end();
      return;
    } // Get file


    const fileId = match[2];
    const file = store.getCollection().findOne({
      _id: fileId
    });

    if (file === undefined) {
      res.writeHead(404);
      res.end();
      return;
    }

    if (file.instanceId === InstanceStatus.id()) {
      logger.debug('Correct instance');
      return next();
    } // Proxy to other instance


    const instance = InstanceStatus.getCollection().findOne({
      _id: file.instanceId
    });

    if (instance == null) {
      res.writeHead(404);
      res.end();
      return;
    }

    if (instance.extraInformation.host === process.env.INSTANCE_IP && RocketChat.isDocker() === false) {
      instance.extraInformation.host = 'localhost';
    }

    logger.debug('Wrong instance, proxing to:', `${instance.extraInformation.host}:${instance.extraInformation.port}`);
    const options = {
      hostname: instance.extraInformation.host,
      port: instance.extraInformation.port,
      path: req.originalUrl,
      method: 'POST'
    };
    const proxy = http.request(options, function (proxy_res) {
      proxy_res.pipe(res, {
        end: true
      });
    });
    req.pipe(proxy, {
      end: true
    });
  })
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"requests.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/lib/requests.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals FileUpload, WebApp */
WebApp.connectHandlers.use('/file-upload/', function (req, res, next) {
  const match = /^\/([^\/]+)\/(.*)/.exec(req.url);

  if (match[1]) {
    const file = RocketChat.models.Uploads.findOneById(match[1]);

    if (file) {
      if (!Meteor.settings.public.sandstorm && !FileUpload.requestCanAccessFiles(req)) {
        res.writeHead(403);
        return res.end();
      }

      res.setHeader('Content-Security-Policy', 'default-src \'none\'');
      return FileUpload.get(file, req, res, next);
    }
  }

  res.writeHead(404);
  res.end();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"config":{"_configUploadStorage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/_configUploadStorage.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
module.watch(require("./AmazonS3.js"));
module.watch(require("./FileSystem.js"));
module.watch(require("./GoogleStorage.js"));
module.watch(require("./GridFS.js"));
module.watch(require("./Webdav.js"));
module.watch(require("./Slingshot_DEPRECATED.js"));

const configStore = _.debounce(() => {
  const store = RocketChat.settings.get('FileUpload_Storage_Type');

  if (store) {
    console.log('Setting default file store to', store);
    UploadFS.getStores().Avatars = UploadFS.getStore(`${store}:Avatars`);
    UploadFS.getStores().Uploads = UploadFS.getStore(`${store}:Uploads`);
    UploadFS.getStores().UserDataFiles = UploadFS.getStore(`${store}:UserDataFiles`);
  }
}, 1000);

RocketChat.settings.get(/^FileUpload_/, configStore);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"AmazonS3.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/AmazonS3.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 1);
module.watch(require("../../ufs/AmazonS3/server.js"));
let http;
module.watch(require("http"), {
  default(v) {
    http = v;
  }

}, 2);
let https;
module.watch(require("https"), {
  default(v) {
    https = v;
  }

}, 3);

const get = function (file, req, res) {
  const fileUrl = this.store.getRedirectURL(file);

  if (fileUrl) {
    const storeType = file.store.split(':').pop();

    if (RocketChat.settings.get(`FileUpload_S3_Proxy_${storeType}`)) {
      const request = /^https:/.test(fileUrl) ? https : http;
      request.get(fileUrl, fileRes => fileRes.pipe(res));
    } else {
      res.removeHeader('Content-Length');
      res.setHeader('Location', fileUrl);
      res.writeHead(302);
      res.end();
    }
  } else {
    res.end();
  }
};

const copy = function (file, out) {
  const fileUrl = this.store.getRedirectURL(file);

  if (fileUrl) {
    const request = /^https:/.test(fileUrl) ? https : http;
    request.get(fileUrl, fileRes => fileRes.pipe(out));
  } else {
    out.end();
  }
};

const AmazonS3Uploads = new FileUploadClass({
  name: 'AmazonS3:Uploads',
  get,
  copy // store setted bellow

});
const AmazonS3Avatars = new FileUploadClass({
  name: 'AmazonS3:Avatars',
  get,
  copy // store setted bellow

});
const AmazonS3UserDataFiles = new FileUploadClass({
  name: 'AmazonS3:UserDataFiles',
  get,
  copy // store setted bellow

});

const configure = _.debounce(function () {
  const Bucket = RocketChat.settings.get('FileUpload_S3_Bucket');
  const Acl = RocketChat.settings.get('FileUpload_S3_Acl');
  const AWSAccessKeyId = RocketChat.settings.get('FileUpload_S3_AWSAccessKeyId');
  const AWSSecretAccessKey = RocketChat.settings.get('FileUpload_S3_AWSSecretAccessKey');
  const URLExpiryTimeSpan = RocketChat.settings.get('FileUpload_S3_URLExpiryTimeSpan');
  const Region = RocketChat.settings.get('FileUpload_S3_Region');
  const SignatureVersion = RocketChat.settings.get('FileUpload_S3_SignatureVersion');
  const ForcePathStyle = RocketChat.settings.get('FileUpload_S3_ForcePathStyle'); // const CDN = RocketChat.settings.get('FileUpload_S3_CDN');

  const BucketURL = RocketChat.settings.get('FileUpload_S3_BucketURL');

  if (!Bucket) {
    return;
  }

  const config = {
    connection: {
      signatureVersion: SignatureVersion,
      s3ForcePathStyle: ForcePathStyle,
      params: {
        Bucket,
        ACL: Acl
      },
      region: Region
    },
    URLExpiryTimeSpan
  };

  if (AWSAccessKeyId) {
    config.connection.accessKeyId = AWSAccessKeyId;
  }

  if (AWSSecretAccessKey) {
    config.connection.secretAccessKey = AWSSecretAccessKey;
  }

  if (BucketURL) {
    config.connection.endpoint = BucketURL;
  }

  AmazonS3Uploads.store = FileUpload.configureUploadsStore('AmazonS3', AmazonS3Uploads.name, config);
  AmazonS3Avatars.store = FileUpload.configureUploadsStore('AmazonS3', AmazonS3Avatars.name, config);
  AmazonS3UserDataFiles.store = FileUpload.configureUploadsStore('AmazonS3', AmazonS3UserDataFiles.name, config);
}, 500);

RocketChat.settings.get(/^FileUpload_S3_/, configure);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"FileSystem.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/FileSystem.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let fs;
module.watch(require("fs"), {
  default(v) {
    fs = v;
  }

}, 1);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 2);
const FileSystemUploads = new FileUploadClass({
  name: 'FileSystem:Uploads',

  // store setted bellow
  get(file, req, res) {
    const filePath = this.store.getFilePath(file._id, file);

    try {
      const stat = Meteor.wrapAsync(fs.stat)(filePath);

      if (stat && stat.isFile()) {
        file = FileUpload.addExtensionTo(file);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
        res.setHeader('Last-Modified', file.uploadedAt.toUTCString());
        res.setHeader('Content-Type', file.type);
        res.setHeader('Content-Length', file.size);
        this.store.getReadStream(file._id, file).pipe(res);
      }
    } catch (e) {
      res.writeHead(404);
      res.end();
      return;
    }
  },

  copy(file, out) {
    const filePath = this.store.getFilePath(file._id, file);

    try {
      const stat = Meteor.wrapAsync(fs.stat)(filePath);

      if (stat && stat.isFile()) {
        file = FileUpload.addExtensionTo(file);
        this.store.getReadStream(file._id, file).pipe(out);
      }
    } catch (e) {
      out.end();
      return;
    }
  }

});
const FileSystemAvatars = new FileUploadClass({
  name: 'FileSystem:Avatars',

  // store setted bellow
  get(file, req, res) {
    const filePath = this.store.getFilePath(file._id, file);

    try {
      const stat = Meteor.wrapAsync(fs.stat)(filePath);

      if (stat && stat.isFile()) {
        file = FileUpload.addExtensionTo(file);
        this.store.getReadStream(file._id, file).pipe(res);
      }
    } catch (e) {
      res.writeHead(404);
      res.end();
      return;
    }
  }

});
const FileSystemUserDataFiles = new FileUploadClass({
  name: 'FileSystem:UserDataFiles',

  get(file, req, res) {
    const filePath = this.store.getFilePath(file._id, file);

    try {
      const stat = Meteor.wrapAsync(fs.stat)(filePath);

      if (stat && stat.isFile()) {
        file = FileUpload.addExtensionTo(file);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
        res.setHeader('Last-Modified', file.uploadedAt.toUTCString());
        res.setHeader('Content-Type', file.type);
        res.setHeader('Content-Length', file.size);
        this.store.getReadStream(file._id, file).pipe(res);
      }
    } catch (e) {
      res.writeHead(404);
      res.end();
      return;
    }
  }

});

const createFileSystemStore = _.debounce(function () {
  const options = {
    path: RocketChat.settings.get('FileUpload_FileSystemPath') //'/tmp/uploads/photos',

  };
  FileSystemUploads.store = FileUpload.configureUploadsStore('Local', FileSystemUploads.name, options);
  FileSystemAvatars.store = FileUpload.configureUploadsStore('Local', FileSystemAvatars.name, options);
  FileSystemUserDataFiles.store = FileUpload.configureUploadsStore('Local', FileSystemUserDataFiles.name, options); // DEPRECATED backwards compatibililty (remove)

  UploadFS.getStores()['fileSystem'] = UploadFS.getStores()[FileSystemUploads.name];
}, 500);

RocketChat.settings.get('FileUpload_FileSystemPath', createFileSystemStore);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"GoogleStorage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/GoogleStorage.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 1);
module.watch(require("../../ufs/GoogleStorage/server.js"));
let http;
module.watch(require("http"), {
  default(v) {
    http = v;
  }

}, 2);
let https;
module.watch(require("https"), {
  default(v) {
    https = v;
  }

}, 3);

const get = function (file, req, res) {
  this.store.getRedirectURL(file, (err, fileUrl) => {
    if (err) {
      console.error(err);
    }

    if (fileUrl) {
      const storeType = file.store.split(':').pop();

      if (RocketChat.settings.get(`FileUpload_GoogleStorage_Proxy_${storeType}`)) {
        const request = /^https:/.test(fileUrl) ? https : http;
        request.get(fileUrl, fileRes => fileRes.pipe(res));
      } else {
        res.removeHeader('Content-Length');
        res.setHeader('Location', fileUrl);
        res.writeHead(302);
        res.end();
      }
    } else {
      res.end();
    }
  });
};

const copy = function (file, out) {
  this.store.getRedirectURL(file, (err, fileUrl) => {
    if (err) {
      console.error(err);
    }

    if (fileUrl) {
      const request = /^https:/.test(fileUrl) ? https : http;
      request.get(fileUrl, fileRes => fileRes.pipe(out));
    } else {
      out.end();
    }
  });
};

const GoogleCloudStorageUploads = new FileUploadClass({
  name: 'GoogleCloudStorage:Uploads',
  get,
  copy // store setted bellow

});
const GoogleCloudStorageAvatars = new FileUploadClass({
  name: 'GoogleCloudStorage:Avatars',
  get,
  copy // store setted bellow

});
const GoogleCloudStorageUserDataFiles = new FileUploadClass({
  name: 'GoogleCloudStorage:UserDataFiles',
  get,
  copy // store setted bellow

});

const configure = _.debounce(function () {
  const bucket = RocketChat.settings.get('FileUpload_GoogleStorage_Bucket');
  const accessId = RocketChat.settings.get('FileUpload_GoogleStorage_AccessId');
  const secret = RocketChat.settings.get('FileUpload_GoogleStorage_Secret');
  const URLExpiryTimeSpan = RocketChat.settings.get('FileUpload_S3_URLExpiryTimeSpan');

  if (!bucket || !accessId || !secret) {
    return;
  }

  const config = {
    connection: {
      credentials: {
        client_email: accessId,
        private_key: secret
      }
    },
    bucket,
    URLExpiryTimeSpan
  };
  GoogleCloudStorageUploads.store = FileUpload.configureUploadsStore('GoogleStorage', GoogleCloudStorageUploads.name, config);
  GoogleCloudStorageAvatars.store = FileUpload.configureUploadsStore('GoogleStorage', GoogleCloudStorageAvatars.name, config);
  GoogleCloudStorageUserDataFiles.store = FileUpload.configureUploadsStore('GoogleStorage', GoogleCloudStorageUserDataFiles.name, config);
}, 500);

RocketChat.settings.get(/^FileUpload_GoogleStorage_/, configure);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"GridFS.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/GridFS.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let stream;
module.watch(require("stream"), {
  default(v) {
    stream = v;
  }

}, 0);
let zlib;
module.watch(require("zlib"), {
  default(v) {
    zlib = v;
  }

}, 1);
let util;
module.watch(require("util"), {
  default(v) {
    util = v;
  }

}, 2);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 3);
const logger = new Logger('FileUpload');

function ExtractRange(options) {
  if (!(this instanceof ExtractRange)) {
    return new ExtractRange(options);
  }

  this.start = options.start;
  this.stop = options.stop;
  this.bytes_read = 0;
  stream.Transform.call(this, options);
}

util.inherits(ExtractRange, stream.Transform);

ExtractRange.prototype._transform = function (chunk, enc, cb) {
  if (this.bytes_read > this.stop) {
    // done reading
    this.end();
  } else if (this.bytes_read + chunk.length < this.start) {// this chunk is still before the start byte
  } else {
    let start;
    let stop;

    if (this.start <= this.bytes_read) {
      start = 0;
    } else {
      start = this.start - this.bytes_read;
    }

    if (this.stop - this.bytes_read + 1 < chunk.length) {
      stop = this.stop - this.bytes_read + 1;
    } else {
      stop = chunk.length;
    }

    const newchunk = chunk.slice(start, stop);
    this.push(newchunk);
  }

  this.bytes_read += chunk.length;
  cb();
};

const getByteRange = function (header) {
  if (header) {
    const matches = header.match(/(\d+)-(\d+)/);

    if (matches) {
      return {
        start: parseInt(matches[1], 10),
        stop: parseInt(matches[2], 10)
      };
    }
  }

  return null;
}; // code from: https://github.com/jalik/jalik-ufs/blob/master/ufs-server.js#L310


const readFromGridFS = function (storeName, fileId, file, req, res) {
  const store = UploadFS.getStore(storeName);
  const rs = store.getReadStream(fileId, file);
  const ws = new stream.PassThrough();
  [rs, ws].forEach(stream => stream.on('error', function (err) {
    store.onReadError.call(store, err, fileId, file);
    res.end();
  }));
  ws.on('close', function () {
    // Close output stream at the end
    ws.emit('end');
  });
  const accept = req.headers['accept-encoding'] || ''; // Transform stream

  store.transformRead(rs, ws, fileId, file, req);
  const range = getByteRange(req.headers.range);
  let out_of_range = false;

  if (range) {
    out_of_range = range.start > file.size || range.stop <= range.start || range.stop > file.size;
  } // Compress data using gzip


  if (accept.match(/\bgzip\b/) && range === null) {
    res.setHeader('Content-Encoding', 'gzip');
    res.removeHeader('Content-Length');
    res.writeHead(200);
    ws.pipe(zlib.createGzip()).pipe(res);
  } else if (accept.match(/\bdeflate\b/) && range === null) {
    // Compress data using deflate
    res.setHeader('Content-Encoding', 'deflate');
    res.removeHeader('Content-Length');
    res.writeHead(200);
    ws.pipe(zlib.createDeflate()).pipe(res);
  } else if (range && out_of_range) {
    // out of range request, return 416
    res.removeHeader('Content-Length');
    res.removeHeader('Content-Type');
    res.removeHeader('Content-Disposition');
    res.removeHeader('Last-Modified');
    res.setHeader('Content-Range', `bytes */${file.size}`);
    res.writeHead(416);
    res.end();
  } else if (range) {
    res.setHeader('Content-Range', `bytes ${range.start}-${range.stop}/${file.size}`);
    res.removeHeader('Content-Length');
    res.setHeader('Content-Length', range.stop - range.start + 1);
    res.writeHead(206);
    logger.debug('File upload extracting range');
    ws.pipe(new ExtractRange({
      start: range.start,
      stop: range.stop
    })).pipe(res);
  } else {
    res.writeHead(200);
    ws.pipe(res);
  }
};

const copyFromGridFS = function (storeName, fileId, file, out) {
  const store = UploadFS.getStore(storeName);
  const rs = store.getReadStream(fileId, file);
  [rs, out].forEach(stream => stream.on('error', function (err) {
    store.onReadError.call(store, err, fileId, file);
    out.end();
  }));
  rs.pipe(out);
};

FileUpload.configureUploadsStore('GridFS', 'GridFS:Uploads', {
  collectionName: 'rocketchat_uploads'
});
FileUpload.configureUploadsStore('GridFS', 'GridFS:UserDataFiles', {
  collectionName: 'rocketchat_userDataFiles'
}); // DEPRECATED: backwards compatibility (remove)

UploadFS.getStores()['rocketchat_uploads'] = UploadFS.getStores()['GridFS:Uploads'];
FileUpload.configureUploadsStore('GridFS', 'GridFS:Avatars', {
  collectionName: 'rocketchat_avatars'
});
new FileUploadClass({
  name: 'GridFS:Uploads',

  get(file, req, res) {
    file = FileUpload.addExtensionTo(file);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader('Last-Modified', file.uploadedAt.toUTCString());
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Length', file.size);
    return readFromGridFS(file.store, file._id, file, req, res);
  },

  copy(file, out) {
    copyFromGridFS(file.store, file._id, file, out);
  }

});
new FileUploadClass({
  name: 'GridFS:UserDataFiles',

  get(file, req, res) {
    file = FileUpload.addExtensionTo(file);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader('Last-Modified', file.uploadedAt.toUTCString());
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Length', file.size);
    return readFromGridFS(file.store, file._id, file, req, res);
  },

  copy(file, out) {
    copyFromGridFS(file.store, file._id, file, out);
  }

});
new FileUploadClass({
  name: 'GridFS:Avatars',

  get(file, req, res) {
    file = FileUpload.addExtensionTo(file);
    return readFromGridFS(file.store, file._id, file, req, res);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Slingshot_DEPRECATED.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/Slingshot_DEPRECATED.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

const configureSlingshot = _.debounce(() => {
  const type = RocketChat.settings.get('FileUpload_Storage_Type');
  const bucket = RocketChat.settings.get('FileUpload_S3_Bucket');
  const acl = RocketChat.settings.get('FileUpload_S3_Acl');
  const accessKey = RocketChat.settings.get('FileUpload_S3_AWSAccessKeyId');
  const secretKey = RocketChat.settings.get('FileUpload_S3_AWSSecretAccessKey');
  const cdn = RocketChat.settings.get('FileUpload_S3_CDN');
  const region = RocketChat.settings.get('FileUpload_S3_Region');
  const bucketUrl = RocketChat.settings.get('FileUpload_S3_BucketURL');
  delete Slingshot._directives['rocketchat-uploads'];

  if (type === 'AmazonS3' && !_.isEmpty(bucket) && !_.isEmpty(accessKey) && !_.isEmpty(secretKey)) {
    if (Slingshot._directives['rocketchat-uploads']) {
      delete Slingshot._directives['rocketchat-uploads'];
    }

    const config = {
      bucket,

      key(file, metaContext) {
        const id = Random.id();
        const path = `${RocketChat.settings.get('uniqueID')}/uploads/${metaContext.rid}/${this.userId}/${id}`;
        const upload = {
          _id: id,
          rid: metaContext.rid,
          AmazonS3: {
            path
          }
        };
        RocketChat.models.Uploads.insertFileInit(this.userId, 'AmazonS3:Uploads', file, upload);
        return path;
      },

      AWSAccessKeyId: accessKey,
      AWSSecretAccessKey: secretKey
    };

    if (!_.isEmpty(acl)) {
      config.acl = acl;
    }

    if (!_.isEmpty(cdn)) {
      config.cdn = cdn;
    }

    if (!_.isEmpty(region)) {
      config.region = region;
    }

    if (!_.isEmpty(bucketUrl)) {
      config.bucketUrl = bucketUrl;
    }

    try {
      Slingshot.createDirective('rocketchat-uploads', Slingshot.S3Storage, config);
    } catch (e) {
      console.error('Error configuring S3 ->', e.message);
    }
  }
}, 500);

RocketChat.settings.get('FileUpload_Storage_Type', configureSlingshot);
RocketChat.settings.get(/^FileUpload_S3_/, configureSlingshot);

const createGoogleStorageDirective = _.debounce(() => {
  const type = RocketChat.settings.get('FileUpload_Storage_Type');
  const bucket = RocketChat.settings.get('FileUpload_GoogleStorage_Bucket');
  const accessId = RocketChat.settings.get('FileUpload_GoogleStorage_AccessId');
  const secret = RocketChat.settings.get('FileUpload_GoogleStorage_Secret');
  delete Slingshot._directives['rocketchat-uploads-gs'];

  if (type === 'GoogleCloudStorage' && !_.isEmpty(secret) && !_.isEmpty(accessId) && !_.isEmpty(bucket)) {
    if (Slingshot._directives['rocketchat-uploads-gs']) {
      delete Slingshot._directives['rocketchat-uploads-gs'];
    }

    const config = {
      bucket,
      GoogleAccessId: accessId,
      GoogleSecretKey: secret,

      key(file, metaContext) {
        const id = Random.id();
        const path = `${RocketChat.settings.get('uniqueID')}/uploads/${metaContext.rid}/${this.userId}/${id}`;
        const upload = {
          _id: id,
          rid: metaContext.rid,
          GoogleStorage: {
            path
          }
        };
        RocketChat.models.Uploads.insertFileInit(this.userId, 'GoogleCloudStorage:Uploads', file, upload);
        return path;
      }

    };

    try {
      Slingshot.createDirective('rocketchat-uploads-gs', Slingshot.GoogleCloud, config);
    } catch (e) {
      console.error('Error configuring GoogleCloudStorage ->', e.message);
    }
  }
}, 500);

RocketChat.settings.get('FileUpload_Storage_Type', createGoogleStorageDirective);
RocketChat.settings.get(/^FileUpload_GoogleStorage_/, createGoogleStorageDirective);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Webdav.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/Webdav.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 1);
module.watch(require("../../ufs/Webdav/server.js"));

const get = function (file, req, res) {
  this.store.getReadStream(file._id, file).pipe(res);
};

const copy = function (file, out) {
  this.store.getReadStream(file._id, file).pipe(out);
};

const WebdavUploads = new FileUploadClass({
  name: 'Webdav:Uploads',
  get,
  copy // store setted bellow

});
const WebdavAvatars = new FileUploadClass({
  name: 'Webdav:Avatars',
  get,
  copy // store setted bellow

});
const WebdavUserDataFiles = new FileUploadClass({
  name: 'Webdav:UserDataFiles',
  get,
  copy // store setted bellow

});

const configure = _.debounce(function () {
  const uploadFolderPath = RocketChat.settings.get('FileUpload_Webdav_Upload_Folder_Path');
  const server = RocketChat.settings.get('FileUpload_Webdav_Server_URL');
  const username = RocketChat.settings.get('FileUpload_Webdav_Username');
  const password = RocketChat.settings.get('FileUpload_Webdav_Password');

  if (!server || !username || !password) {
    return;
  }

  const config = {
    connection: {
      credentials: {
        server,
        username,
        password
      }
    },
    uploadFolderPath
  };
  WebdavUploads.store = FileUpload.configureUploadsStore('Webdav', WebdavUploads.name, config);
  WebdavAvatars.store = FileUpload.configureUploadsStore('Webdav', WebdavAvatars.name, config);
  WebdavUserDataFiles.store = FileUpload.configureUploadsStore('Webdav', WebdavUserDataFiles.name, config);
}, 500);

RocketChat.settings.get(/^FileUpload_Webdav_/, configure);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"sendFileMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/methods/sendFileMessage.js                                                   //
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
  'sendFileMessage'(roomId, store, file, msgData = {}) {
    return Promise.asyncApply(() => {
      if (!Meteor.userId()) {
        throw new Meteor.Error('error-invalid-user', 'Invalid user', {
          method: 'sendFileMessage'
        });
      }

      const room = Meteor.call('canAccessRoom', roomId, Meteor.userId());

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
      RocketChat.models.Uploads.updateFileComplete(file._id, Meteor.userId(), _.omit(file, '_id'));
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

      const user = Meteor.user();
      let msg = Object.assign({
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
        attachments: [attachment]
      }, msgData);
      msg = Meteor.call('sendMessage', msg);
      Meteor.defer(() => RocketChat.callbacks.run('afterFileUpload', {
        user,
        room,
        message: msg
      }));
      return msg;
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getS3FileUrl.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/methods/getS3FileUrl.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals UploadFS */
let protectedFiles;
RocketChat.settings.get('FileUpload_ProtectFiles', function (key, value) {
  protectedFiles = value;
});
Meteor.methods({
  getS3FileUrl(fileId) {
    if (protectedFiles && !Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'sendFileMessage'
      });
    }

    const file = RocketChat.models.Uploads.findOneById(fileId);
    return UploadFS.getStore('AmazonS3:Uploads').getRedirectURL(file);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/startup/settings.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.settings.addGroup('FileUpload', function () {
  this.add('FileUpload_Enabled', true, {
    type: 'boolean',
    public: true
  });
  this.add('FileUpload_MaxFileSize', 104857600, {
    type: 'int',
    public: true,
    i18nDescription: 'FileUpload_MaxFileSizeDescription'
  });
  this.add('FileUpload_MediaTypeWhiteList', 'image/*,audio/*,video/*,application/zip,application/x-rar-compressed,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', {
    type: 'string',
    public: true,
    i18nDescription: 'FileUpload_MediaTypeWhiteListDescription'
  });
  this.add('FileUpload_ProtectFiles', true, {
    type: 'boolean',
    public: true,
    i18nDescription: 'FileUpload_ProtectFilesDescription'
  });
  this.add('FileUpload_Storage_Type', 'GridFS', {
    type: 'select',
    values: [{
      key: 'GridFS',
      i18nLabel: 'GridFS'
    }, {
      key: 'AmazonS3',
      i18nLabel: 'AmazonS3'
    }, {
      key: 'GoogleCloudStorage',
      i18nLabel: 'GoogleCloudStorage'
    }, {
      key: 'Webdav',
      i18nLabel: 'WebDAV'
    }, {
      key: 'FileSystem',
      i18nLabel: 'FileSystem'
    }],
    public: true
  });
  this.section('Amazon S3', function () {
    this.add('FileUpload_S3_Bucket', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_Acl', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_AWSAccessKeyId', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_AWSSecretAccessKey', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_CDN', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_Region', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_BucketURL', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      },
      i18nDescription: 'Override_URL_to_which_files_are_uploaded_This_url_also_used_for_downloads_unless_a_CDN_is_given.'
    });
    this.add('FileUpload_S3_SignatureVersion', 'v4', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_ForcePathStyle', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_URLExpiryTimeSpan', 120, {
      type: 'int',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      },
      i18nDescription: 'FileUpload_S3_URLExpiryTimeSpan_Description'
    });
    this.add('FileUpload_S3_Proxy_Avatars', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_Proxy_Uploads', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
  });
  this.section('Google Cloud Storage', function () {
    this.add('FileUpload_GoogleStorage_Bucket', '', {
      type: 'string',
      private: true,
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
    this.add('FileUpload_GoogleStorage_AccessId', '', {
      type: 'string',
      private: true,
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
    this.add('FileUpload_GoogleStorage_Secret', '', {
      type: 'string',
      multiline: true,
      private: true,
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
    this.add('FileUpload_GoogleStorage_Proxy_Avatars', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
    this.add('FileUpload_GoogleStorage_Proxy_Uploads', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
  });
  this.section('File System', function () {
    this.add('FileUpload_FileSystemPath', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'FileSystem'
      }
    });
  });
  this.section('WebDAV', function () {
    this.add('FileUpload_Webdav_Upload_Folder_Path', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Server_URL', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Username', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Password', '', {
      type: 'password',
      private: true,
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Proxy_Avatars', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Proxy_Uploads', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
  });
  this.add('FileUpload_Enabled_Direct', true, {
    type: 'boolean',
    public: true
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"ufs":{"AmazonS3":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/ufs/AmazonS3/server.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  AmazonS3Store: () => AmazonS3Store
});
let UploadFS;
module.watch(require("meteor/jalik:ufs"), {
  UploadFS(v) {
    UploadFS = v;
  }

}, 0);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 1);
let S3;
module.watch(require("aws-sdk/clients/s3"), {
  default(v) {
    S3 = v;
  }

}, 2);
let stream;
module.watch(require("stream"), {
  default(v) {
    stream = v;
  }

}, 3);

class AmazonS3Store extends UploadFS.Store {
  constructor(options) {
    // Default options
    // options.secretAccessKey,
    // options.accessKeyId,
    // options.region,
    // options.sslEnabled // optional
    options = _.extend({
      httpOptions: {
        timeout: 6000,
        agent: false
      }
    }, options);
    super(options);
    const classOptions = options;
    const s3 = new S3(options.connection);

    options.getPath = options.getPath || function (file) {
      return file._id;
    };

    this.getPath = function (file) {
      if (file.AmazonS3) {
        return file.AmazonS3.path;
      } // Compatibility
      // TODO: Migration


      if (file.s3) {
        return file.s3.path + file._id;
      }
    };

    this.getRedirectURL = function (file) {
      const params = {
        Key: this.getPath(file),
        Expires: classOptions.URLExpiryTimeSpan
      };
      return s3.getSignedUrl('getObject', params);
    };
    /**
     * Creates the file in the collection
     * @param file
     * @param callback
     * @return {string}
     */


    this.create = function (file, callback) {
      check(file, Object);

      if (file._id == null) {
        file._id = Random.id();
      }

      file.AmazonS3 = {
        path: this.options.getPath(file)
      };
      file.store = this.options.name; // assign store to file

      return this.getCollection().insert(file, callback);
    };
    /**
     * Removes the file
     * @param fileId
     * @param callback
     */


    this.delete = function (fileId, callback) {
      const file = this.getCollection().findOne({
        _id: fileId
      });
      const params = {
        Key: this.getPath(file)
      };
      s3.deleteObject(params, (err, data) => {
        if (err) {
          console.error(err);
        }

        callback && callback(err, data);
      });
    };
    /**
     * Returns the file read stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getReadStream = function (fileId, file, options = {}) {
      const params = {
        Key: this.getPath(file)
      };

      if (options.start && options.end) {
        params.Range = `${options.start} - ${options.end}`;
      }

      return s3.getObject(params).createReadStream();
    };
    /**
     * Returns the file write stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getWriteStream = function (fileId, file
    /*, options*/
    ) {
      const writeStream = new stream.PassThrough();
      writeStream.length = file.size;
      writeStream.on('newListener', (event, listener) => {
        if (event === 'finish') {
          process.nextTick(() => {
            writeStream.removeListener(event, listener);
            writeStream.on('real_finish', listener);
          });
        }
      });
      s3.putObject({
        Key: this.getPath(file),
        Body: writeStream,
        ContentType: file.type,
        ContentDisposition: `inline; filename="${encodeURI(file.name)}"`
      }, error => {
        if (error) {
          console.error(error);
        }

        writeStream.emit('real_finish');
      });
      return writeStream;
    };
  }

}

// Add store to UFS namespace
UploadFS.store.AmazonS3 = AmazonS3Store;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"GoogleStorage":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/ufs/GoogleStorage/server.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  GoogleStorageStore: () => GoogleStorageStore
});
let UploadFS;
module.watch(require("meteor/jalik:ufs"), {
  UploadFS(v) {
    UploadFS = v;
  }

}, 0);
let gcStorage;
module.watch(require("@google-cloud/storage"), {
  default(v) {
    gcStorage = v;
  }

}, 1);

class GoogleStorageStore extends UploadFS.Store {
  constructor(options) {
    super(options);
    const gcs = gcStorage(options.connection);
    this.bucket = gcs.bucket(options.bucket);

    options.getPath = options.getPath || function (file) {
      return file._id;
    };

    this.getPath = function (file) {
      if (file.GoogleStorage) {
        return file.GoogleStorage.path;
      } // Compatibility
      // TODO: Migration


      if (file.googleCloudStorage) {
        return file.googleCloudStorage.path + file._id;
      }
    };

    this.getRedirectURL = function (file, callback) {
      const params = {
        action: 'read',
        responseDisposition: 'inline',
        expires: Date.now() + this.options.URLExpiryTimeSpan * 1000
      };
      this.bucket.file(this.getPath(file)).getSignedUrl(params, callback);
    };
    /**
     * Creates the file in the collection
     * @param file
     * @param callback
     * @return {string}
     */


    this.create = function (file, callback) {
      check(file, Object);

      if (file._id == null) {
        file._id = Random.id();
      }

      file.GoogleStorage = {
        path: this.options.getPath(file)
      };
      file.store = this.options.name; // assign store to file

      return this.getCollection().insert(file, callback);
    };
    /**
     * Removes the file
     * @param fileId
     * @param callback
     */


    this.delete = function (fileId, callback) {
      const file = this.getCollection().findOne({
        _id: fileId
      });
      this.bucket.file(this.getPath(file)).delete(function (err, data) {
        if (err) {
          console.error(err);
        }

        callback && callback(err, data);
      });
    };
    /**
     * Returns the file read stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getReadStream = function (fileId, file, options = {}) {
      const config = {};

      if (options.start != null) {
        config.start = options.start;
      }

      if (options.end != null) {
        config.end = options.end;
      }

      return this.bucket.file(this.getPath(file)).createReadStream(config);
    };
    /**
     * Returns the file write stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getWriteStream = function (fileId, file
    /*, options*/
    ) {
      return this.bucket.file(this.getPath(file)).createWriteStream({
        gzip: false,
        metadata: {
          contentType: file.type,
          contentDisposition: `inline; filename=${file.name}` // metadata: {
          // 	custom: 'metadata'
          // }

        }
      });
    };
  }

}

// Add store to UFS namespace
UploadFS.store.GoogleStorage = GoogleStorageStore;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"Webdav":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/ufs/Webdav/server.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  WebdavStore: () => WebdavStore
});
let UploadFS;
module.watch(require("meteor/jalik:ufs"), {
  UploadFS(v) {
    UploadFS = v;
  }

}, 0);
let Webdav;
module.watch(require("webdav"), {
  default(v) {
    Webdav = v;
  }

}, 1);
let stream;
module.watch(require("stream"), {
  default(v) {
    stream = v;
  }

}, 2);

class WebdavStore extends UploadFS.Store {
  constructor(options) {
    super(options);
    const client = new Webdav(options.connection.credentials.server, options.connection.credentials.username, options.connection.credentials.password);

    options.getPath = function (file) {
      if (options.uploadFolderPath[options.uploadFolderPath.length - 1] !== '/') {
        options.uploadFolderPath += '/';
      }

      return options.uploadFolderPath + file._id;
    };

    client.stat(options.uploadFolderPath).catch(function (err) {
      if (err.status === '404') {
        client.createDirectory(options.uploadFolderPath);
      }
    });
    /**
     * Returns the file path
     * @param file
     * @return {string}
     */

    this.getPath = function (file) {
      if (file.Webdav) {
        return file.Webdav.path;
      }
    };
    /**
     * Creates the file in the col lection
     * @param file
     * @param callback
     * @return {string}
     */


    this.create = function (file, callback) {
      check(file, Object);

      if (file._id == null) {
        file._id = Random.id();
      }

      file.Webdav = {
        path: options.getPath(file)
      };
      file.store = this.options.name;
      return this.getCollection().insert(file, callback);
    };
    /**
     * Removes the file
     * @param fileId
     * @param callback
     */


    this.delete = function (fileId, callback) {
      const file = this.getCollection().findOne({
        _id: fileId
      });
      client.deleteFile(this.getPath(file), (err, data) => {
        if (err) {
          console.error(err);
        }

        callback && callback(err, data);
      });
    };
    /**
     * Returns the file read stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getReadStream = function (fileId, file, options = {}) {
      const range = {};

      if (options.start != null) {
        range.start = options.start;
      }

      if (options.end != null) {
        range.end = options.end;
      }

      return client.createReadStream(this.getPath(file), options);
    };
    /**
     * Returns the file write stream
     * @param fileId
     * @param file
     * @return {*}
     */


    this.getWriteStream = function (fileId, file) {
      const writeStream = new stream.PassThrough();
      const webdavStream = client.createWriteStream(this.getPath(file)); //TODO remove timeout when UploadFS bug resolved

      const newListenerCallback = (event, listener) => {
        if (event === 'finish') {
          process.nextTick(() => {
            writeStream.removeListener(event, listener);
            writeStream.removeListener('newListener', newListenerCallback);
            writeStream.on(event, function () {
              setTimeout(listener, 500);
            });
          });
        }
      };

      writeStream.on('newListener', newListenerCallback);
      writeStream.pipe(webdavStream);
      return writeStream;
    };
  }

}

// Add store to UFS namespace
UploadFS.store.Webdav = WebdavStore;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:file-upload/globalFileRestrictions.js");
require("/node_modules/meteor/rocketchat:file-upload/lib/FileUpload.js");
require("/node_modules/meteor/rocketchat:file-upload/lib/FileUploadBase.js");
require("/node_modules/meteor/rocketchat:file-upload/server/lib/FileUpload.js");
require("/node_modules/meteor/rocketchat:file-upload/server/lib/proxy.js");
require("/node_modules/meteor/rocketchat:file-upload/server/lib/requests.js");
require("/node_modules/meteor/rocketchat:file-upload/server/config/_configUploadStorage.js");
require("/node_modules/meteor/rocketchat:file-upload/server/methods/sendFileMessage.js");
require("/node_modules/meteor/rocketchat:file-upload/server/methods/getS3FileUrl.js");
require("/node_modules/meteor/rocketchat:file-upload/server/startup/settings.js");

/* Exports */
Package._define("rocketchat:file-upload", {
  fileUploadHandler: fileUploadHandler,
  FileUpload: FileUpload
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_file-upload.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9nbG9iYWxGaWxlUmVzdHJpY3Rpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL2xpYi9GaWxlVXBsb2FkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL2xpYi9GaWxlVXBsb2FkQmFzZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9zZXJ2ZXIvbGliL0ZpbGVVcGxvYWQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL2xpYi9wcm94eS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9zZXJ2ZXIvbGliL3JlcXVlc3RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3NlcnZlci9jb25maWcvX2NvbmZpZ1VwbG9hZFN0b3JhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL2NvbmZpZy9BbWF6b25TMy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9zZXJ2ZXIvY29uZmlnL0ZpbGVTeXN0ZW0uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL2NvbmZpZy9Hb29nbGVTdG9yYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3NlcnZlci9jb25maWcvR3JpZEZTLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3NlcnZlci9jb25maWcvU2xpbmdzaG90X0RFUFJFQ0FURUQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL2NvbmZpZy9XZWJkYXYuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL21ldGhvZHMvc2VuZEZpbGVNZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3NlcnZlci9tZXRob2RzL2dldFMzRmlsZVVybC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9zZXJ2ZXIvc3RhcnR1cC9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC91ZnMvQW1hem9uUzMvc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3Vmcy9Hb29nbGVTdG9yYWdlL3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC91ZnMvV2ViZGF2L3NlcnZlci5qcyJdLCJuYW1lcyI6WyJmaWxlc2l6ZSIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2Iiwic2xpbmdTaG90Q29uZmlnIiwiYXV0aG9yaXplIiwiZmlsZSIsInVzZXJJZCIsIk1ldGVvciIsIkVycm9yIiwiUm9ja2V0Q2hhdCIsImZpbGVVcGxvYWRJc1ZhbGlkQ29udGVudFR5cGUiLCJ0eXBlIiwiVEFQaTE4biIsIl9fIiwibWF4RmlsZVNpemUiLCJzZXR0aW5ncyIsImdldCIsInNpemUiLCJtYXhTaXplIiwiYWxsb3dlZEZpbGVUeXBlcyIsIlNsaW5nc2hvdCIsImZpbGVSZXN0cmljdGlvbnMiLCJGaWxlVXBsb2FkIiwidmFsaWRhdGVGaWxlVXBsb2FkIiwiTWF0Y2giLCJ0ZXN0IiwicmlkIiwiU3RyaW5nIiwidXNlciIsInJvb20iLCJtb2RlbHMiLCJSb29tcyIsImZpbmRPbmVCeUlkIiwiZGlyZWN0TWVzc2FnZUFsbG93IiwiZmlsZVVwbG9hZEFsbG93ZWQiLCJhdXRoeiIsImNhbkFjY2Vzc1Jvb20iLCJsYW5ndWFnZSIsInJlYXNvbiIsInQiLCJrZXkiLCJ2YWx1ZSIsInBhcnNlSW50IiwiZSIsIlNldHRpbmdzIiwicGFja2FnZVZhbHVlIiwiXyIsIlVwbG9hZEZTIiwiY29uZmlnIiwiZGVmYXVsdFN0b3JlUGVybWlzc2lvbnMiLCJTdG9yZVBlcm1pc3Npb25zIiwiaW5zZXJ0IiwiZG9jIiwibWVzc2FnZV9pZCIsImluZGV4T2YiLCJzdG9yZSIsInNwbGl0IiwicG9wIiwidXBkYXRlIiwiaGFzUGVybWlzc2lvbiIsInJlbW92ZSIsIkZpbGVVcGxvYWRCYXNlIiwiY29uc3RydWN0b3IiLCJtZXRhIiwiaWQiLCJSYW5kb20iLCJnZXRQcm9ncmVzcyIsImdldEZpbGVOYW1lIiwibmFtZSIsInN0YXJ0IiwiY2FsbGJhY2siLCJoYW5kbGVyIiwiVXBsb2FkZXIiLCJkYXRhIiwib25FcnJvciIsImVyciIsIm9uQ29tcGxldGUiLCJmaWxlRGF0YSIsInBpY2siLCJ1cmwiLCJyZXBsYWNlIiwiYWJzb2x1dGVVcmwiLCJvcHRpb25zIiwib25Qcm9ncmVzcyIsInByb2dyZXNzIiwic3RvcCIsImV4cG9ydCIsIkZpbGVVcGxvYWRDbGFzcyIsImZzIiwic3RyZWFtIiwibWltZSIsIkZ1dHVyZSIsInNoYXJwIiwiQ29va2llcyIsImNvb2tpZSIsIk9iamVjdCIsImFzc2lnbiIsImhhbmRsZXJzIiwiY29uZmlndXJlVXBsb2Fkc1N0b3JlIiwic3RvcmVzIiwiZ2V0U3RvcmVzIiwiZGVmYXVsdFVwbG9hZHMiLCJjb2xsZWN0aW9uIiwiVXBsb2FkcyIsIm1vZGVsIiwiZmlsdGVyIiwiRmlsdGVyIiwib25DaGVjayIsImdldFBhdGgiLCJfaWQiLCJvblZhbGlkYXRlIiwidXBsb2Fkc09uVmFsaWRhdGUiLCJvblJlYWQiLCJmaWxlSWQiLCJyZXEiLCJyZXMiLCJyZXF1ZXN0Q2FuQWNjZXNzRmlsZXMiLCJ3cml0ZUhlYWQiLCJzZXRIZWFkZXIiLCJlbmNvZGVVUklDb21wb25lbnQiLCJkZWZhdWx0QXZhdGFycyIsIkF2YXRhcnMiLCJhdmF0YXJzT25WYWxpZGF0ZSIsIm9uRmluaXNoVXBsb2FkIiwiYXZhdGFyc09uRmluaXNoVXBsb2FkIiwiZGVmYXVsdFVzZXJEYXRhRmlsZXMiLCJVc2VyRGF0YUZpbGVzIiwidGVtcEZpbGVQYXRoIiwiZ2V0VGVtcEZpbGVQYXRoIiwiaGVpZ2h0IiwiZnV0dXJlIiwicyIsInJvdGF0ZSIsIm1ldGFkYXRhIiwiYmluZEVudmlyb25tZW50IiwidG9Gb3JtYXQiLCJmb3JtYXQiLCJqcGVnIiwicmVzaXplIiwiTWF0aCIsIm1pbiIsIndpZHRoIiwiSW5maW5pdHkiLCJwaXBlIiwiYmFja2dyb3VuZCIsImVtYmVkIiwidG9CdWZmZXIiLCJ0aGVuIiwib3V0cHV0QnVmZmVyIiwid3JpdGVGaWxlIiwiY29uc29sZSIsImVycm9yIiwibHN0YXRTeW5jIiwiZ2V0Q29sbGVjdGlvbiIsImRpcmVjdCIsIiRzZXQiLCJyZXR1cm4iLCJ3YWl0IiwicmVzaXplSW1hZ2VQcmV2aWV3IiwiYWRkRXh0ZW5zaW9uVG8iLCJpbWFnZSIsImdldFN0b3JlIiwiX3N0b3JlIiwiZ2V0UmVhZFN0cmVhbSIsInRyYW5zZm9ybWVyIiwibWF4IiwiYmx1ciIsInJlc3VsdCIsIm91dCIsInRvU3RyaW5nIiwidG1wRmlsZSIsImZ1dCIsImlkZW50aWZ5Iiwib3JpZW50YXRpb24iLCJ0b0ZpbGUiLCJ1bmxpbmsiLCJyZW5hbWUiLCJjYXRjaCIsIlVzZXJzIiwib2xkQXZhdGFyIiwiZmluZE9uZUJ5TmFtZSIsInVzZXJuYW1lIiwiZGVsZXRlRmlsZSIsInVwZGF0ZUZpbGVOYW1lQnlJZCIsImhlYWRlcnMiLCJxdWVyeSIsInJjX3VpZCIsInJjX3Rva2VuIiwicmNfcmlkIiwicmNfcm9vbV90eXBlIiwiaXNBdXRob3JpemVkQnlDb29raWVzIiwiZmluZE9uZUJ5SWRBbmRMb2dpblRva2VuIiwiaXNBdXRob3JpemVkQnlIZWFkZXJzIiwiaXNBdXRob3JpemVkQnlSb29tIiwicm9vbVR5cGVzIiwiZ2V0Q29uZmlnIiwiY2FuQWNjZXNzVXBsb2FkZWRGaWxlIiwibG9va3VwIiwiZXh0IiwiZXh0ZW5zaW9uIiwiUmVnRXhwIiwibW9kZWxOYW1lIiwic3RvcmFnZVR5cGUiLCJoYW5kbGVyTmFtZSIsImdldFN0b3JlQnlOYW1lIiwibmV4dCIsImVuZCIsImNvcHkiLCJ0YXJnZXRGaWxlIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJnZXRNb2RlbEZyb21OYW1lIiwiZGVsZXRlIiwiZGVsZXRlQnlJZCIsImRlbGV0ZUJ5TmFtZSIsImZpbGVOYW1lIiwic3RyZWFtT3JCdWZmZXIiLCJjYiIsImdldEZpbHRlciIsImNoZWNrIiwiY3JlYXRlIiwidG9rZW4iLCJjcmVhdGVUb2tlbiIsIkJ1ZmZlciIsIndyaXRlRmlsZVN5bmMiLCJjYWxsIiwiaHR0cCIsIlVSTCIsImxvZ2dlciIsIkxvZ2dlciIsIldlYkFwcCIsImNvbm5lY3RIYW5kbGVycyIsInN0YWNrIiwidW5zaGlmdCIsInJvdXRlIiwiaGFuZGxlIiwic3RvcmVzUGF0aCIsImRlYnVnIiwibWV0aG9kIiwicGFyc2VkVXJsIiwicGFyc2UiLCJwYXRoIiwicGF0aG5hbWUiLCJzdWJzdHIiLCJsZW5ndGgiLCJyZWdFeHAiLCJtYXRjaCIsImV4ZWMiLCJmaW5kT25lIiwidW5kZWZpbmVkIiwiaW5zdGFuY2VJZCIsIkluc3RhbmNlU3RhdHVzIiwiaW5zdGFuY2UiLCJleHRyYUluZm9ybWF0aW9uIiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJJTlNUQU5DRV9JUCIsImlzRG9ja2VyIiwicG9ydCIsImhvc3RuYW1lIiwib3JpZ2luYWxVcmwiLCJwcm94eSIsInJlcXVlc3QiLCJwcm94eV9yZXMiLCJ1c2UiLCJwdWJsaWMiLCJzYW5kc3Rvcm0iLCJjb25maWdTdG9yZSIsImRlYm91bmNlIiwibG9nIiwiaHR0cHMiLCJmaWxlVXJsIiwiZ2V0UmVkaXJlY3RVUkwiLCJzdG9yZVR5cGUiLCJmaWxlUmVzIiwicmVtb3ZlSGVhZGVyIiwiQW1hem9uUzNVcGxvYWRzIiwiQW1hem9uUzNBdmF0YXJzIiwiQW1hem9uUzNVc2VyRGF0YUZpbGVzIiwiY29uZmlndXJlIiwiQnVja2V0IiwiQWNsIiwiQVdTQWNjZXNzS2V5SWQiLCJBV1NTZWNyZXRBY2Nlc3NLZXkiLCJVUkxFeHBpcnlUaW1lU3BhbiIsIlJlZ2lvbiIsIlNpZ25hdHVyZVZlcnNpb24iLCJGb3JjZVBhdGhTdHlsZSIsIkJ1Y2tldFVSTCIsImNvbm5lY3Rpb24iLCJzaWduYXR1cmVWZXJzaW9uIiwiczNGb3JjZVBhdGhTdHlsZSIsInBhcmFtcyIsIkFDTCIsInJlZ2lvbiIsImFjY2Vzc0tleUlkIiwic2VjcmV0QWNjZXNzS2V5IiwiZW5kcG9pbnQiLCJGaWxlU3lzdGVtVXBsb2FkcyIsImZpbGVQYXRoIiwiZ2V0RmlsZVBhdGgiLCJzdGF0Iiwid3JhcEFzeW5jIiwiaXNGaWxlIiwidXBsb2FkZWRBdCIsInRvVVRDU3RyaW5nIiwiRmlsZVN5c3RlbUF2YXRhcnMiLCJGaWxlU3lzdGVtVXNlckRhdGFGaWxlcyIsImNyZWF0ZUZpbGVTeXN0ZW1TdG9yZSIsIkdvb2dsZUNsb3VkU3RvcmFnZVVwbG9hZHMiLCJHb29nbGVDbG91ZFN0b3JhZ2VBdmF0YXJzIiwiR29vZ2xlQ2xvdWRTdG9yYWdlVXNlckRhdGFGaWxlcyIsImJ1Y2tldCIsImFjY2Vzc0lkIiwic2VjcmV0IiwiY3JlZGVudGlhbHMiLCJjbGllbnRfZW1haWwiLCJwcml2YXRlX2tleSIsInpsaWIiLCJ1dGlsIiwiRXh0cmFjdFJhbmdlIiwiYnl0ZXNfcmVhZCIsIlRyYW5zZm9ybSIsImluaGVyaXRzIiwicHJvdG90eXBlIiwiX3RyYW5zZm9ybSIsImNodW5rIiwiZW5jIiwibmV3Y2h1bmsiLCJzbGljZSIsInB1c2giLCJnZXRCeXRlUmFuZ2UiLCJoZWFkZXIiLCJtYXRjaGVzIiwicmVhZEZyb21HcmlkRlMiLCJzdG9yZU5hbWUiLCJycyIsIndzIiwiUGFzc1Rocm91Z2giLCJmb3JFYWNoIiwib24iLCJvblJlYWRFcnJvciIsImVtaXQiLCJhY2NlcHQiLCJ0cmFuc2Zvcm1SZWFkIiwicmFuZ2UiLCJvdXRfb2ZfcmFuZ2UiLCJjcmVhdGVHemlwIiwiY3JlYXRlRGVmbGF0ZSIsImNvcHlGcm9tR3JpZEZTIiwiY29sbGVjdGlvbk5hbWUiLCJjb25maWd1cmVTbGluZ3Nob3QiLCJhY2wiLCJhY2Nlc3NLZXkiLCJzZWNyZXRLZXkiLCJjZG4iLCJidWNrZXRVcmwiLCJfZGlyZWN0aXZlcyIsImlzRW1wdHkiLCJtZXRhQ29udGV4dCIsInVwbG9hZCIsIkFtYXpvblMzIiwiaW5zZXJ0RmlsZUluaXQiLCJjcmVhdGVEaXJlY3RpdmUiLCJTM1N0b3JhZ2UiLCJtZXNzYWdlIiwiY3JlYXRlR29vZ2xlU3RvcmFnZURpcmVjdGl2ZSIsIkdvb2dsZUFjY2Vzc0lkIiwiR29vZ2xlU2VjcmV0S2V5IiwiR29vZ2xlU3RvcmFnZSIsIkdvb2dsZUNsb3VkIiwiV2ViZGF2VXBsb2FkcyIsIldlYmRhdkF2YXRhcnMiLCJXZWJkYXZVc2VyRGF0YUZpbGVzIiwidXBsb2FkRm9sZGVyUGF0aCIsInNlcnZlciIsInBhc3N3b3JkIiwibWV0aG9kcyIsInJvb21JZCIsIm1zZ0RhdGEiLCJhdmF0YXIiLCJPcHRpb25hbCIsImVtb2ppIiwiYWxpYXMiLCJncm91cGFibGUiLCJCb29sZWFuIiwibXNnIiwidXBkYXRlRmlsZUNvbXBsZXRlIiwib21pdCIsImVuY29kZVVSSSIsImF0dGFjaG1lbnQiLCJ0aXRsZSIsImRlc2NyaXB0aW9uIiwidGl0bGVfbGluayIsInRpdGxlX2xpbmtfZG93bmxvYWQiLCJpbWFnZV91cmwiLCJpbWFnZV90eXBlIiwiaW1hZ2Vfc2l6ZSIsImltYWdlX2RpbWVuc2lvbnMiLCJpbWFnZV9wcmV2aWV3IiwiYXVkaW9fdXJsIiwiYXVkaW9fdHlwZSIsImF1ZGlvX3NpemUiLCJ2aWRlb191cmwiLCJ2aWRlb190eXBlIiwidmlkZW9fc2l6ZSIsInRzIiwiRGF0ZSIsImF0dGFjaG1lbnRzIiwiZGVmZXIiLCJjYWxsYmFja3MiLCJydW4iLCJwcm90ZWN0ZWRGaWxlcyIsImdldFMzRmlsZVVybCIsImFkZEdyb3VwIiwiYWRkIiwiaTE4bkRlc2NyaXB0aW9uIiwidmFsdWVzIiwiaTE4bkxhYmVsIiwic2VjdGlvbiIsImVuYWJsZVF1ZXJ5IiwicHJpdmF0ZSIsIm11bHRpbGluZSIsIkFtYXpvblMzU3RvcmUiLCJTMyIsIlN0b3JlIiwiZXh0ZW5kIiwiaHR0cE9wdGlvbnMiLCJ0aW1lb3V0IiwiYWdlbnQiLCJjbGFzc09wdGlvbnMiLCJzMyIsIktleSIsIkV4cGlyZXMiLCJnZXRTaWduZWRVcmwiLCJkZWxldGVPYmplY3QiLCJSYW5nZSIsImdldE9iamVjdCIsImNyZWF0ZVJlYWRTdHJlYW0iLCJnZXRXcml0ZVN0cmVhbSIsIndyaXRlU3RyZWFtIiwiZXZlbnQiLCJsaXN0ZW5lciIsIm5leHRUaWNrIiwicmVtb3ZlTGlzdGVuZXIiLCJwdXRPYmplY3QiLCJCb2R5IiwiQ29udGVudFR5cGUiLCJDb250ZW50RGlzcG9zaXRpb24iLCJHb29nbGVTdG9yYWdlU3RvcmUiLCJnY1N0b3JhZ2UiLCJnY3MiLCJnb29nbGVDbG91ZFN0b3JhZ2UiLCJhY3Rpb24iLCJyZXNwb25zZURpc3Bvc2l0aW9uIiwiZXhwaXJlcyIsIm5vdyIsImd6aXAiLCJjb250ZW50VHlwZSIsImNvbnRlbnREaXNwb3NpdGlvbiIsIldlYmRhdlN0b3JlIiwiV2ViZGF2IiwiY2xpZW50Iiwic3RhdHVzIiwiY3JlYXRlRGlyZWN0b3J5Iiwid2ViZGF2U3RyZWFtIiwibmV3TGlzdGVuZXJDYWxsYmFjayIsInNldFRpbWVvdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxRQUFKO0FBQWFDLE9BQU9DLEtBQVAsQ0FBYUMsUUFB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Q0EsYUFBT3pCLFdBQVA7QUFDQSxLQXBCRDtBQXNCQTs7QUExSDhDOztBQTZIaEQ7QUFDQXpZLFNBQVNRLEtBQVQsQ0FBZXNaLE1BQWYsR0FBd0JELFdBQXhCLEMiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfZmlsZS11cGxvYWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWxzIFNsaW5nc2hvdCAqL1xuXG5pbXBvcnQgZmlsZXNpemUgZnJvbSAnZmlsZXNpemUnO1xuXG5jb25zdCBzbGluZ1Nob3RDb25maWcgPSB7XG5cdGF1dGhvcml6ZShmaWxlLyosIG1ldGFDb250ZXh0Ki8pIHtcblx0XHQvL0RlbnkgdXBsb2FkcyBpZiB1c2VyIGlzIG5vdCBsb2dnZWQgaW4uXG5cdFx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbG9naW4tcmVxdWlyZWQnLCAnUGxlYXNlIGxvZ2luIGJlZm9yZSBwb3N0aW5nIGZpbGVzJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LmZpbGVVcGxvYWRJc1ZhbGlkQ29udGVudFR5cGUoZmlsZS50eXBlKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihUQVBpMThuLl9fKCdlcnJvci1pbnZhbGlkLWZpbGUtdHlwZScpKTtcblx0XHR9XG5cblx0XHRjb25zdCBtYXhGaWxlU2l6ZSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX01heEZpbGVTaXplJyk7XG5cblx0XHRpZiAobWF4RmlsZVNpemUgPiAtMSAmJiBtYXhGaWxlU2l6ZSA8IGZpbGUuc2l6ZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihUQVBpMThuLl9fKCdGaWxlX2V4Y2VlZHNfYWxsb3dlZF9zaXplX29mX2J5dGVzJywgeyBzaXplOiBmaWxlc2l6ZShtYXhGaWxlU2l6ZSkgfSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXHRtYXhTaXplOiAwLFxuXHRhbGxvd2VkRmlsZVR5cGVzOiBudWxsXG59O1xuXG5TbGluZ3Nob3QuZmlsZVJlc3RyaWN0aW9ucygncm9ja2V0Y2hhdC11cGxvYWRzJywgc2xpbmdTaG90Q29uZmlnKTtcblNsaW5nc2hvdC5maWxlUmVzdHJpY3Rpb25zKCdyb2NrZXRjaGF0LXVwbG9hZHMtZ3MnLCBzbGluZ1Nob3RDb25maWcpO1xuIiwiLyogZ2xvYmFscyBGaWxlVXBsb2FkOnRydWUgKi9cbi8qIGV4cG9ydGVkIEZpbGVVcGxvYWQgKi9cblxuaW1wb3J0IGZpbGVzaXplIGZyb20gJ2ZpbGVzaXplJztcblxubGV0IG1heEZpbGVTaXplID0gMDtcblxuRmlsZVVwbG9hZCA9IHtcblx0dmFsaWRhdGVGaWxlVXBsb2FkKGZpbGUpIHtcblx0XHRpZiAoIU1hdGNoLnRlc3QoZmlsZS5yaWQsIFN0cmluZykpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0Ly8gbGl2ZWNoYXQgdXNlcnMgY2FuIHVwbG9hZCBmaWxlcyBidXQgdGhleSBkb24ndCBoYXZlIGFuIHVzZXJJZFxuXHRcdGNvbnN0IHVzZXIgPSBmaWxlLnVzZXJJZCA/IE1ldGVvci51c2VyKCkgOiBudWxsO1xuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaWxlLnJpZCk7XG5cdFx0Y29uc3QgZGlyZWN0TWVzc2FnZUFsbG93ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfRW5hYmxlZF9EaXJlY3QnKTtcblx0XHRjb25zdCBmaWxlVXBsb2FkQWxsb3dlZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX0VuYWJsZWQnKTtcblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5jYW5BY2Nlc3NSb29tKHJvb20sIHVzZXIsIGZpbGUpICE9PSB0cnVlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGNvbnN0IGxhbmd1YWdlID0gdXNlciA/IHVzZXIubGFuZ3VhZ2UgOiAnZW4nO1xuXHRcdGlmICghZmlsZVVwbG9hZEFsbG93ZWQpIHtcblx0XHRcdGNvbnN0IHJlYXNvbiA9IFRBUGkxOG4uX18oJ0ZpbGVVcGxvYWRfRGlzYWJsZWQnLCBsYW5ndWFnZSk7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1maWxlLXVwbG9hZC1kaXNhYmxlZCcsIHJlYXNvbik7XG5cdFx0fVxuXG5cdFx0aWYgKCFkaXJlY3RNZXNzYWdlQWxsb3cgJiYgcm9vbS50ID09PSAnZCcpIHtcblx0XHRcdGNvbnN0IHJlYXNvbiA9IFRBUGkxOG4uX18oJ0ZpbGVfbm90X2FsbG93ZWRfZGlyZWN0X21lc3NhZ2VzJywgbGFuZ3VhZ2UpO1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItZGlyZWN0LW1lc3NhZ2UtZmlsZS11cGxvYWQtbm90LWFsbG93ZWQnLCByZWFzb24pO1xuXHRcdH1cblxuXHRcdC8vIC0xIG1heEZpbGVTaXplIG1lYW5zIHRoZXJlIGlzIG5vIGxpbWl0XG5cdFx0aWYgKG1heEZpbGVTaXplID4gLTEgJiYgZmlsZS5zaXplID4gbWF4RmlsZVNpemUpIHtcblx0XHRcdGNvbnN0IHJlYXNvbiA9IFRBUGkxOG4uX18oJ0ZpbGVfZXhjZWVkc19hbGxvd2VkX3NpemVfb2ZfYnl0ZXMnLCB7XG5cdFx0XHRcdHNpemU6IGZpbGVzaXplKG1heEZpbGVTaXplKVxuXHRcdFx0fSwgbGFuZ3VhZ2UpO1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItZmlsZS10b28tbGFyZ2UnLCByZWFzb24pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5maWxlVXBsb2FkSXNWYWxpZENvbnRlbnRUeXBlKGZpbGUudHlwZSkpIHtcblx0XHRcdGNvbnN0IHJlYXNvbiA9IFRBUGkxOG4uX18oJ0ZpbGVfdHlwZV9pc19ub3RfYWNjZXB0ZWQnLCBsYW5ndWFnZSk7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWZpbGUtdHlwZScsIHJlYXNvbik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cbn07XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX01heEZpbGVTaXplJywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHR0cnkge1xuXHRcdG1heEZpbGVTaXplID0gcGFyc2VJbnQodmFsdWUpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0bWF4RmlsZVNpemUgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lQnlJZCgnRmlsZVVwbG9hZF9NYXhGaWxlU2l6ZScpLnBhY2thZ2VWYWx1ZTtcblx0fVxufSk7XG4iLCIvKiBnbG9iYWxzIEZpbGVVcGxvYWRCYXNlOnRydWUsIFVwbG9hZEZTICovXG4vKiBleHBvcnRlZCBGaWxlVXBsb2FkQmFzZSAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cblVwbG9hZEZTLmNvbmZpZy5kZWZhdWx0U3RvcmVQZXJtaXNzaW9ucyA9IG5ldyBVcGxvYWRGUy5TdG9yZVBlcm1pc3Npb25zKHtcblx0aW5zZXJ0KHVzZXJJZCwgZG9jKSB7XG5cdFx0aWYgKHVzZXJJZCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gYWxsb3cgaW5zZXJ0cyBmcm9tIHNsYWNrYnJpZGdlIChtZXNzYWdlX2lkID0gc2xhY2stdGltZXN0YW1wLW1pbGxpKVxuXHRcdGlmIChkb2MgJiYgZG9jLm1lc3NhZ2VfaWQgJiYgZG9jLm1lc3NhZ2VfaWQuaW5kZXhPZignc2xhY2stJykgPT09IDApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIGFsbG93IGluc2VydHMgdG8gdGhlIFVzZXJEYXRhRmlsZXMgc3RvcmVcblx0XHRpZiAoZG9jICYmIGRvYy5zdG9yZSAmJiBkb2Muc3RvcmUuc3BsaXQoJzonKS5wb3AoKSA9PT0gJ1VzZXJEYXRhRmlsZXMnKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5jYW5BY2Nlc3NSb29tKG51bGwsIG51bGwsIGRvYykpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblx0dXBkYXRlKHVzZXJJZCwgZG9jKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdkZWxldGUtbWVzc2FnZScsIGRvYy5yaWQpIHx8IChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWVzc2FnZV9BbGxvd0RlbGV0aW5nJykgJiYgdXNlcklkID09PSBkb2MudXNlcklkKTtcblx0fSxcblx0cmVtb3ZlKHVzZXJJZCwgZG9jKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdkZWxldGUtbWVzc2FnZScsIGRvYy5yaWQpIHx8IChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWVzc2FnZV9BbGxvd0RlbGV0aW5nJykgJiYgdXNlcklkID09PSBkb2MudXNlcklkKTtcblx0fVxufSk7XG5cblxuRmlsZVVwbG9hZEJhc2UgPSBjbGFzcyBGaWxlVXBsb2FkQmFzZSB7XG5cdGNvbnN0cnVjdG9yKHN0b3JlLCBtZXRhLCBmaWxlKSB7XG5cdFx0dGhpcy5pZCA9IFJhbmRvbS5pZCgpO1xuXHRcdHRoaXMubWV0YSA9IG1ldGE7XG5cdFx0dGhpcy5maWxlID0gZmlsZTtcblx0XHR0aGlzLnN0b3JlID0gc3RvcmU7XG5cdH1cblxuXHRnZXRQcm9ncmVzcygpIHtcblxuXHR9XG5cblx0Z2V0RmlsZU5hbWUoKSB7XG5cdFx0cmV0dXJuIHRoaXMubWV0YS5uYW1lO1xuXHR9XG5cblx0c3RhcnQoY2FsbGJhY2spIHtcblx0XHR0aGlzLmhhbmRsZXIgPSBuZXcgVXBsb2FkRlMuVXBsb2FkZXIoe1xuXHRcdFx0c3RvcmU6IHRoaXMuc3RvcmUsXG5cdFx0XHRkYXRhOiB0aGlzLmZpbGUsXG5cdFx0XHRmaWxlOiB0aGlzLm1ldGEsXG5cdFx0XHRvbkVycm9yOiAoZXJyKSA9PiB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fSxcblx0XHRcdG9uQ29tcGxldGU6IChmaWxlRGF0YSkgPT4ge1xuXHRcdFx0XHRjb25zdCBmaWxlID0gXy5waWNrKGZpbGVEYXRhLCAnX2lkJywgJ3R5cGUnLCAnc2l6ZScsICduYW1lJywgJ2lkZW50aWZ5JywgJ2Rlc2NyaXB0aW9uJyk7XG5cblx0XHRcdFx0ZmlsZS51cmwgPSBmaWxlRGF0YS51cmwucmVwbGFjZShNZXRlb3IuYWJzb2x1dGVVcmwoKSwgJy8nKTtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIGZpbGUsIHRoaXMuc3RvcmUub3B0aW9ucy5uYW1lKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuaGFuZGxlci5vblByb2dyZXNzID0gKGZpbGUsIHByb2dyZXNzKSA9PiB7XG5cdFx0XHR0aGlzLm9uUHJvZ3Jlc3MocHJvZ3Jlc3MpO1xuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5oYW5kbGVyLnN0YXJ0KCk7XG5cdH1cblxuXHRvblByb2dyZXNzKCkge31cblxuXHRzdG9wKCkge1xuXHRcdHJldHVybiB0aGlzLmhhbmRsZXIuc3RvcCgpO1xuXHR9XG59O1xuIiwiLyogZ2xvYmFscyBVcGxvYWRGUyAqL1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IG1pbWUgZnJvbSAnbWltZS10eXBlL3dpdGgtZGInO1xuaW1wb3J0IEZ1dHVyZSBmcm9tICdmaWJlcnMvZnV0dXJlJztcbmltcG9ydCBzaGFycCBmcm9tICdzaGFycCc7XG5pbXBvcnQgeyBDb29raWVzIH0gZnJvbSAnbWV0ZW9yL29zdHJpbzpjb29raWVzJztcblxuY29uc3QgY29va2llID0gbmV3IENvb2tpZXMoKTtcblxuT2JqZWN0LmFzc2lnbihGaWxlVXBsb2FkLCB7XG5cdGhhbmRsZXJzOiB7fSxcblxuXHRjb25maWd1cmVVcGxvYWRzU3RvcmUoc3RvcmUsIG5hbWUsIG9wdGlvbnMpIHtcblx0XHRjb25zdCB0eXBlID0gbmFtZS5zcGxpdCgnOicpLnBvcCgpO1xuXHRcdGNvbnN0IHN0b3JlcyA9IFVwbG9hZEZTLmdldFN0b3JlcygpO1xuXHRcdGRlbGV0ZSBzdG9yZXNbbmFtZV07XG5cblx0XHRyZXR1cm4gbmV3IFVwbG9hZEZTLnN0b3JlW3N0b3JlXShPYmplY3QuYXNzaWduKHtcblx0XHRcdG5hbWVcblx0XHR9LCBvcHRpb25zLCBGaWxlVXBsb2FkW2BkZWZhdWx0JHsgdHlwZSB9YF0oKSkpO1xuXHR9LFxuXG5cdGRlZmF1bHRVcGxvYWRzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjb2xsZWN0aW9uOiBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLm1vZGVsLFxuXHRcdFx0ZmlsdGVyOiBuZXcgVXBsb2FkRlMuRmlsdGVyKHtcblx0XHRcdFx0b25DaGVjazogRmlsZVVwbG9hZC52YWxpZGF0ZUZpbGVVcGxvYWRcblx0XHRcdH0pLFxuXHRcdFx0Z2V0UGF0aChmaWxlKSB7XG5cdFx0XHRcdHJldHVybiBgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ3VuaXF1ZUlEJykgfS91cGxvYWRzLyR7IGZpbGUucmlkIH0vJHsgZmlsZS51c2VySWQgfS8keyBmaWxlLl9pZCB9YDtcblx0XHRcdH0sXG5cdFx0XHRvblZhbGlkYXRlOiBGaWxlVXBsb2FkLnVwbG9hZHNPblZhbGlkYXRlLFxuXHRcdFx0b25SZWFkKGZpbGVJZCwgZmlsZSwgcmVxLCByZXMpIHtcblx0XHRcdFx0aWYgKCFGaWxlVXBsb2FkLnJlcXVlc3RDYW5BY2Nlc3NGaWxlcyhyZXEpKSB7XG5cdFx0XHRcdFx0cmVzLndyaXRlSGVhZCg0MDMpO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtZGlzcG9zaXRpb24nLCBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCIkeyBlbmNvZGVVUklDb21wb25lbnQoZmlsZS5uYW1lKSB9XCJgKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSxcblxuXHRkZWZhdWx0QXZhdGFycygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y29sbGVjdGlvbjogUm9ja2V0Q2hhdC5tb2RlbHMuQXZhdGFycy5tb2RlbCxcblx0XHRcdC8vIGZpbHRlcjogbmV3IFVwbG9hZEZTLkZpbHRlcih7XG5cdFx0XHQvLyBcdG9uQ2hlY2s6IEZpbGVVcGxvYWQudmFsaWRhdGVGaWxlVXBsb2FkXG5cdFx0XHQvLyB9KSxcblx0XHRcdGdldFBhdGgoZmlsZSkge1xuXHRcdFx0XHRyZXR1cm4gYCR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCd1bmlxdWVJRCcpIH0vYXZhdGFycy8keyBmaWxlLnVzZXJJZCB9YDtcblx0XHRcdH0sXG5cdFx0XHRvblZhbGlkYXRlOiBGaWxlVXBsb2FkLmF2YXRhcnNPblZhbGlkYXRlLFxuXHRcdFx0b25GaW5pc2hVcGxvYWQ6IEZpbGVVcGxvYWQuYXZhdGFyc09uRmluaXNoVXBsb2FkXG5cdFx0fTtcblx0fSxcblxuXHRkZWZhdWx0VXNlckRhdGFGaWxlcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y29sbGVjdGlvbjogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlckRhdGFGaWxlcy5tb2RlbCxcblx0XHRcdGdldFBhdGgoZmlsZSkge1xuXHRcdFx0XHRyZXR1cm4gYCR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCd1bmlxdWVJRCcpIH0vdXBsb2Fkcy91c2VyRGF0YS8keyBmaWxlLnVzZXJJZCB9YDtcblx0XHRcdH0sXG5cdFx0XHRvblZhbGlkYXRlOiBGaWxlVXBsb2FkLnVwbG9hZHNPblZhbGlkYXRlLFxuXHRcdFx0b25SZWFkKGZpbGVJZCwgZmlsZSwgcmVxLCByZXMpIHtcblx0XHRcdFx0aWYgKCFGaWxlVXBsb2FkLnJlcXVlc3RDYW5BY2Nlc3NGaWxlcyhyZXEpKSB7XG5cdFx0XHRcdFx0cmVzLndyaXRlSGVhZCg0MDMpO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtZGlzcG9zaXRpb24nLCBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCIkeyBlbmNvZGVVUklDb21wb25lbnQoZmlsZS5uYW1lKSB9XCJgKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSxcblxuXHRhdmF0YXJzT25WYWxpZGF0ZShmaWxlKSB7XG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19BdmF0YXJSZXNpemUnKSAhPT0gdHJ1ZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHRlbXBGaWxlUGF0aCA9IFVwbG9hZEZTLmdldFRlbXBGaWxlUGF0aChmaWxlLl9pZCk7XG5cblx0XHRjb25zdCBoZWlnaHQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfQXZhdGFyU2l6ZScpO1xuXHRcdGNvbnN0IGZ1dHVyZSA9IG5ldyBGdXR1cmUoKTtcblxuXHRcdGNvbnN0IHMgPSBzaGFycCh0ZW1wRmlsZVBhdGgpO1xuXHRcdHMucm90YXRlKCk7XG5cdFx0Ly8gR2V0IG1ldGFkYXRhIHRvIHJlc2l6ZSB0aGUgaW1hZ2UgdGhlIGZpcnN0IHRpbWUgdG8ga2VlcCBcImluc2lkZVwiIHRoZSBkaW1lbnNpb25zXG5cdFx0Ly8gdGhlbiByZXNpemUgYWdhaW4gdG8gY3JlYXRlIHRoZSBjYW52YXMgYXJvdW5kXG5cblx0XHRzLm1ldGFkYXRhKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVyciwgbWV0YWRhdGEpID0+IHtcblx0XHRcdGlmICghbWV0YWRhdGEpIHtcblx0XHRcdFx0bWV0YWRhdGEgPSB7fTtcblx0XHRcdH1cblxuXHRcdFx0cy50b0Zvcm1hdChzaGFycC5mb3JtYXQuanBlZylcblx0XHRcdFx0LnJlc2l6ZShNYXRoLm1pbihoZWlnaHQgfHwgMCwgbWV0YWRhdGEud2lkdGggfHwgSW5maW5pdHkpLCBNYXRoLm1pbihoZWlnaHQgfHwgMCwgbWV0YWRhdGEuaGVpZ2h0IHx8IEluZmluaXR5KSlcblx0XHRcdFx0LnBpcGUoc2hhcnAoKVxuXHRcdFx0XHRcdC5yZXNpemUoaGVpZ2h0LCBoZWlnaHQpXG5cdFx0XHRcdFx0LmJhY2tncm91bmQoJyNGRkZGRkYnKVxuXHRcdFx0XHRcdC5lbWJlZCgpXG5cdFx0XHRcdClcblx0XHRcdFx0Ly8gVXNlIGJ1ZmZlciB0byBnZXQgdGhlIHJlc3VsdCBpbiBtZW1vcnkgdGhlbiByZXBsYWNlIHRoZSBleGlzdGluZyBmaWxlXG5cdFx0XHRcdC8vIFRoZXJlIGlzIG5vIG9wdGlvbiB0byBvdmVycmlkZSBhIGZpbGUgdXNpbmcgdGhpcyBsaWJyYXJ5XG5cdFx0XHRcdC50b0J1ZmZlcigpXG5cdFx0XHRcdC50aGVuKE1ldGVvci5iaW5kRW52aXJvbm1lbnQob3V0cHV0QnVmZmVyID0+IHtcblx0XHRcdFx0XHRmcy53cml0ZUZpbGUodGVtcEZpbGVQYXRoLCBvdXRwdXRCdWZmZXIsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZXJyID0+IHtcblx0XHRcdFx0XHRcdGlmIChlcnIgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjb25zdCBzaXplID0gZnMubHN0YXRTeW5jKHRlbXBGaWxlUGF0aCkuc2l6ZTtcblx0XHRcdFx0XHRcdHRoaXMuZ2V0Q29sbGVjdGlvbigpLmRpcmVjdC51cGRhdGUoe19pZDogZmlsZS5faWR9LCB7JHNldDoge3NpemV9fSk7XG5cdFx0XHRcdFx0XHRmdXR1cmUucmV0dXJuKCk7XG5cdFx0XHRcdFx0fSkpO1xuXHRcdFx0XHR9KSk7XG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIGZ1dHVyZS53YWl0KCk7XG5cdH0sXG5cblx0cmVzaXplSW1hZ2VQcmV2aWV3KGZpbGUpIHtcblx0XHRmaWxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kT25lQnlJZChmaWxlLl9pZCk7XG5cdFx0ZmlsZSA9IEZpbGVVcGxvYWQuYWRkRXh0ZW5zaW9uVG8oZmlsZSk7XG5cdFx0Y29uc3QgaW1hZ2UgPSBGaWxlVXBsb2FkLmdldFN0b3JlKCdVcGxvYWRzJykuX3N0b3JlLmdldFJlYWRTdHJlYW0oZmlsZS5faWQsIGZpbGUpO1xuXG5cdFx0Y29uc3QgdHJhbnNmb3JtZXIgPSBzaGFycCgpXG5cdFx0XHQucmVzaXplKDMyLCAzMilcblx0XHRcdC5tYXgoKVxuXHRcdFx0LmpwZWcoKVxuXHRcdFx0LmJsdXIoKTtcblx0XHRjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm1lci50b0J1ZmZlcigpLnRoZW4oKG91dCkgPT4gb3V0LnRvU3RyaW5nKCdiYXNlNjQnKSk7XG5cdFx0aW1hZ2UucGlwZSh0cmFuc2Zvcm1lcik7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblxuXHR1cGxvYWRzT25WYWxpZGF0ZShmaWxlKSB7XG5cdFx0aWYgKCEvXmltYWdlXFwvKCh4LXdpbmRvd3MtKT9ibXB8cD9qcGVnfHBuZykkLy50ZXN0KGZpbGUudHlwZSkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCB0bXBGaWxlID0gVXBsb2FkRlMuZ2V0VGVtcEZpbGVQYXRoKGZpbGUuX2lkKTtcblxuXHRcdGNvbnN0IGZ1dCA9IG5ldyBGdXR1cmUoKTtcblxuXHRcdGNvbnN0IHMgPSBzaGFycCh0bXBGaWxlKTtcblx0XHRzLm1ldGFkYXRhKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVyciwgbWV0YWRhdGEpID0+IHtcblx0XHRcdGlmIChlcnIgIT0gbnVsbCkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cdFx0XHRcdHJldHVybiBmdXQucmV0dXJuKCk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGlkZW50aWZ5ID0ge1xuXHRcdFx0XHRmb3JtYXQ6IG1ldGFkYXRhLmZvcm1hdCxcblx0XHRcdFx0c2l6ZToge1xuXHRcdFx0XHRcdHdpZHRoOiBtZXRhZGF0YS53aWR0aCxcblx0XHRcdFx0XHRoZWlnaHQ6IG1ldGFkYXRhLmhlaWdodFxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAobWV0YWRhdGEub3JpZW50YXRpb24gPT0gbnVsbCkge1xuXHRcdFx0XHRyZXR1cm4gZnV0LnJldHVybigpO1xuXHRcdFx0fVxuXG5cdFx0XHRzLnJvdGF0ZSgpXG5cdFx0XHRcdC50b0ZpbGUoYCR7IHRtcEZpbGUgfS50bXBgKVxuXHRcdFx0XHQudGhlbihNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcblx0XHRcdFx0XHRmcy51bmxpbmsodG1wRmlsZSwgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdFx0XHRcdFx0XHRmcy5yZW5hbWUoYCR7IHRtcEZpbGUgfS50bXBgLCB0bXBGaWxlLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc2l6ZSA9IGZzLmxzdGF0U3luYyh0bXBGaWxlKS5zaXplO1xuXHRcdFx0XHRcdFx0XHR0aGlzLmdldENvbGxlY3Rpb24oKS5kaXJlY3QudXBkYXRlKHtfaWQ6IGZpbGUuX2lkfSwge1xuXHRcdFx0XHRcdFx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHNpemUsXG5cdFx0XHRcdFx0XHRcdFx0XHRpZGVudGlmeVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGZ1dC5yZXR1cm4oKTtcblx0XHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0XHR9KSk7XG5cdFx0XHRcdH0pKS5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdGZ1dC5yZXR1cm4oKTtcblx0XHRcdFx0fSk7XG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIGZ1dC53YWl0KCk7XG5cdH0sXG5cblx0YXZhdGFyc09uRmluaXNoVXBsb2FkKGZpbGUpIHtcblx0XHQvLyB1cGRhdGUgZmlsZSByZWNvcmQgdG8gbWF0Y2ggdXNlcidzIHVzZXJuYW1lXG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKGZpbGUudXNlcklkKTtcblx0XHRjb25zdCBvbGRBdmF0YXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5BdmF0YXJzLmZpbmRPbmVCeU5hbWUodXNlci51c2VybmFtZSk7XG5cdFx0aWYgKG9sZEF2YXRhcikge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuQXZhdGFycy5kZWxldGVGaWxlKG9sZEF2YXRhci5faWQpO1xuXHRcdH1cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5BdmF0YXJzLnVwZGF0ZUZpbGVOYW1lQnlJZChmaWxlLl9pZCwgdXNlci51c2VybmFtZSk7XG5cdFx0Ly8gY29uc29sZS5sb2coJ3VwbG9hZCBmaW5pc2hlZCAtPicsIGZpbGUpO1xuXHR9LFxuXG5cdHJlcXVlc3RDYW5BY2Nlc3NGaWxlcyh7IGhlYWRlcnMgPSB7fSwgcXVlcnkgPSB7fSB9KSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9Qcm90ZWN0RmlsZXMnKSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0bGV0IHsgcmNfdWlkLCByY190b2tlbiwgcmNfcmlkLCByY19yb29tX3R5cGUgfSA9IHF1ZXJ5O1xuXG5cdFx0aWYgKCFyY191aWQgJiYgaGVhZGVycy5jb29raWUpIHtcblx0XHRcdHJjX3VpZCA9IGNvb2tpZS5nZXQoJ3JjX3VpZCcsIGhlYWRlcnMuY29va2llKTtcblx0XHRcdHJjX3Rva2VuID0gY29va2llLmdldCgncmNfdG9rZW4nLCBoZWFkZXJzLmNvb2tpZSk7XG5cdFx0XHRyY19yaWQgPSBjb29raWUuZ2V0KCdyY19yaWQnLCBoZWFkZXJzLmNvb2tpZSk7XG5cdFx0XHRyY19yb29tX3R5cGUgPSBjb29raWUuZ2V0KCdyY19yb29tX3R5cGUnLCBoZWFkZXJzLmNvb2tpZSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaXNBdXRob3JpemVkQnlDb29raWVzID0gcmNfdWlkICYmIHJjX3Rva2VuICYmIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkQW5kTG9naW5Ub2tlbihyY191aWQsIHJjX3Rva2VuKTtcblx0XHRjb25zdCBpc0F1dGhvcml6ZWRCeUhlYWRlcnMgPSBoZWFkZXJzWyd4LXVzZXItaWQnXSAmJiBoZWFkZXJzWyd4LWF1dGgtdG9rZW4nXSAmJiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZEFuZExvZ2luVG9rZW4oaGVhZGVyc1sneC11c2VyLWlkJ10sIGhlYWRlcnNbJ3gtYXV0aC10b2tlbiddKTtcblx0XHRjb25zdCBpc0F1dGhvcml6ZWRCeVJvb20gPSByY19yb29tX3R5cGUgJiYgUm9ja2V0Q2hhdC5yb29tVHlwZXMuZ2V0Q29uZmlnKHJjX3Jvb21fdHlwZSkuY2FuQWNjZXNzVXBsb2FkZWRGaWxlKHsgcmNfdWlkLCByY19yaWQsIHJjX3Rva2VuIH0pO1xuXHRcdHJldHVybiBpc0F1dGhvcml6ZWRCeUNvb2tpZXMgfHwgaXNBdXRob3JpemVkQnlIZWFkZXJzIHx8IGlzQXV0aG9yaXplZEJ5Um9vbTtcblx0fSxcblx0YWRkRXh0ZW5zaW9uVG8oZmlsZSkge1xuXHRcdGlmIChtaW1lLmxvb2t1cChmaWxlLm5hbWUpID09PSBmaWxlLnR5cGUpIHtcblx0XHRcdHJldHVybiBmaWxlO1xuXHRcdH1cblxuXHRcdGNvbnN0IGV4dCA9IG1pbWUuZXh0ZW5zaW9uKGZpbGUudHlwZSk7XG5cdFx0aWYgKGV4dCAmJiBmYWxzZSA9PT0gbmV3IFJlZ0V4cChgXFwuJHsgZXh0IH0kYCwgJ2knKS50ZXN0KGZpbGUubmFtZSkpIHtcblx0XHRcdGZpbGUubmFtZSA9IGAkeyBmaWxlLm5hbWUgfS4keyBleHQgfWA7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZpbGU7XG5cdH0sXG5cblx0Z2V0U3RvcmUobW9kZWxOYW1lKSB7XG5cdFx0Y29uc3Qgc3RvcmFnZVR5cGUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnKTtcblx0XHRjb25zdCBoYW5kbGVyTmFtZSA9IGAkeyBzdG9yYWdlVHlwZSB9OiR7IG1vZGVsTmFtZSB9YDtcblxuXHRcdHJldHVybiB0aGlzLmdldFN0b3JlQnlOYW1lKGhhbmRsZXJOYW1lKTtcblx0fSxcblxuXHRnZXRTdG9yZUJ5TmFtZShoYW5kbGVyTmFtZSkge1xuXHRcdGlmICh0aGlzLmhhbmRsZXJzW2hhbmRsZXJOYW1lXSA9PSBudWxsKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKGBVcGxvYWQgaGFuZGxlciBcIiR7IGhhbmRsZXJOYW1lIH1cIiBkb2VzIG5vdCBleGlzdHNgKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuaGFuZGxlcnNbaGFuZGxlck5hbWVdO1xuXHR9LFxuXG5cdGdldChmaWxlLCByZXEsIHJlcywgbmV4dCkge1xuXHRcdGNvbnN0IHN0b3JlID0gdGhpcy5nZXRTdG9yZUJ5TmFtZShmaWxlLnN0b3JlKTtcblx0XHRpZiAoc3RvcmUgJiYgc3RvcmUuZ2V0KSB7XG5cdFx0XHRyZXR1cm4gc3RvcmUuZ2V0KGZpbGUsIHJlcSwgcmVzLCBuZXh0KTtcblx0XHR9XG5cdFx0cmVzLndyaXRlSGVhZCg0MDQpO1xuXHRcdHJlcy5lbmQoKTtcblx0fSxcblxuXHRjb3B5KGZpbGUsIHRhcmdldEZpbGUpIHtcblx0XHRjb25zdCBzdG9yZSA9IHRoaXMuZ2V0U3RvcmVCeU5hbWUoZmlsZS5zdG9yZSk7XG5cdFx0Y29uc3Qgb3V0ID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0odGFyZ2V0RmlsZSk7XG5cblx0XHRmaWxlID0gRmlsZVVwbG9hZC5hZGRFeHRlbnNpb25UbyhmaWxlKTtcblxuXHRcdGlmIChzdG9yZS5jb3B5KSB7XG5cdFx0XHRzdG9yZS5jb3B5KGZpbGUsIG91dCk7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn0pO1xuXG5leHBvcnQgY2xhc3MgRmlsZVVwbG9hZENsYXNzIHtcblx0Y29uc3RydWN0b3IoeyBuYW1lLCBtb2RlbCwgc3RvcmUsIGdldCwgaW5zZXJ0LCBnZXRTdG9yZSwgY29weSB9KSB7XG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcblx0XHR0aGlzLm1vZGVsID0gbW9kZWwgfHwgdGhpcy5nZXRNb2RlbEZyb21OYW1lKCk7XG5cdFx0dGhpcy5fc3RvcmUgPSBzdG9yZSB8fCBVcGxvYWRGUy5nZXRTdG9yZShuYW1lKTtcblx0XHR0aGlzLmdldCA9IGdldDtcblx0XHR0aGlzLmNvcHkgPSBjb3B5O1xuXG5cdFx0aWYgKGluc2VydCkge1xuXHRcdFx0dGhpcy5pbnNlcnQgPSBpbnNlcnQ7XG5cdFx0fVxuXG5cdFx0aWYgKGdldFN0b3JlKSB7XG5cdFx0XHR0aGlzLmdldFN0b3JlID0gZ2V0U3RvcmU7XG5cdFx0fVxuXG5cdFx0RmlsZVVwbG9hZC5oYW5kbGVyc1tuYW1lXSA9IHRoaXM7XG5cdH1cblxuXHRnZXRTdG9yZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fc3RvcmU7XG5cdH1cblxuXHRnZXQgc3RvcmUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0U3RvcmUoKTtcblx0fVxuXG5cdHNldCBzdG9yZShzdG9yZSkge1xuXHRcdHRoaXMuX3N0b3JlID0gc3RvcmU7XG5cdH1cblxuXHRnZXRNb2RlbEZyb21OYW1lKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVsc1t0aGlzLm5hbWUuc3BsaXQoJzonKVsxXV07XG5cdH1cblxuXHRkZWxldGUoZmlsZUlkKSB7XG5cdFx0aWYgKHRoaXMuc3RvcmUgJiYgdGhpcy5zdG9yZS5kZWxldGUpIHtcblx0XHRcdHRoaXMuc3RvcmUuZGVsZXRlKGZpbGVJZCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMubW9kZWwuZGVsZXRlRmlsZShmaWxlSWQpO1xuXHR9XG5cblx0ZGVsZXRlQnlJZChmaWxlSWQpIHtcblx0XHRjb25zdCBmaWxlID0gdGhpcy5tb2RlbC5maW5kT25lQnlJZChmaWxlSWQpO1xuXG5cdFx0aWYgKCFmaWxlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3RvcmUgPSBGaWxlVXBsb2FkLmdldFN0b3JlQnlOYW1lKGZpbGUuc3RvcmUpO1xuXG5cdFx0cmV0dXJuIHN0b3JlLmRlbGV0ZShmaWxlLl9pZCk7XG5cdH1cblxuXHRkZWxldGVCeU5hbWUoZmlsZU5hbWUpIHtcblx0XHRjb25zdCBmaWxlID0gdGhpcy5tb2RlbC5maW5kT25lQnlOYW1lKGZpbGVOYW1lKTtcblxuXHRcdGlmICghZmlsZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN0b3JlID0gRmlsZVVwbG9hZC5nZXRTdG9yZUJ5TmFtZShmaWxlLnN0b3JlKTtcblxuXHRcdHJldHVybiBzdG9yZS5kZWxldGUoZmlsZS5faWQpO1xuXHR9XG5cblx0aW5zZXJ0KGZpbGVEYXRhLCBzdHJlYW1PckJ1ZmZlciwgY2IpIHtcblx0XHRmaWxlRGF0YS5zaXplID0gcGFyc2VJbnQoZmlsZURhdGEuc2l6ZSkgfHwgMDtcblxuXHRcdC8vIENoZWNrIGlmIHRoZSBmaWxlRGF0YSBtYXRjaGVzIHN0b3JlIGZpbHRlclxuXHRcdGNvbnN0IGZpbHRlciA9IHRoaXMuc3RvcmUuZ2V0RmlsdGVyKCk7XG5cdFx0aWYgKGZpbHRlciAmJiBmaWx0ZXIuY2hlY2spIHtcblx0XHRcdGZpbHRlci5jaGVjayhmaWxlRGF0YSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlsZUlkID0gdGhpcy5zdG9yZS5jcmVhdGUoZmlsZURhdGEpO1xuXHRcdGNvbnN0IHRva2VuID0gdGhpcy5zdG9yZS5jcmVhdGVUb2tlbihmaWxlSWQpO1xuXHRcdGNvbnN0IHRtcEZpbGUgPSBVcGxvYWRGUy5nZXRUZW1wRmlsZVBhdGgoZmlsZUlkKTtcblxuXHRcdHRyeSB7XG5cdFx0XHRpZiAoc3RyZWFtT3JCdWZmZXIgaW5zdGFuY2VvZiBzdHJlYW0pIHtcblx0XHRcdFx0c3RyZWFtT3JCdWZmZXIucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbSh0bXBGaWxlKSk7XG5cdFx0XHR9IGVsc2UgaWYgKHN0cmVhbU9yQnVmZmVyIGluc3RhbmNlb2YgQnVmZmVyKSB7XG5cdFx0XHRcdGZzLndyaXRlRmlsZVN5bmModG1wRmlsZSwgc3RyZWFtT3JCdWZmZXIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZpbGUgdHlwZScpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBmaWxlID0gTWV0ZW9yLmNhbGwoJ3Vmc0NvbXBsZXRlJywgZmlsZUlkLCB0aGlzLm5hbWUsIHRva2VuKTtcblxuXHRcdFx0aWYgKGNiKSB7XG5cdFx0XHRcdGNiKG51bGwsIGZpbGUpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZmlsZTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRpZiAoY2IpIHtcblx0XHRcdFx0Y2IoZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuIiwiLyogZ2xvYmFscyBVcGxvYWRGUywgSW5zdGFuY2VTdGF0dXMgKi9cblxuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgVVJMIGZyb20gJ3VybCc7XG5cbmNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoJ1VwbG9hZFByb3h5Jyk7XG5cbldlYkFwcC5jb25uZWN0SGFuZGxlcnMuc3RhY2sudW5zaGlmdCh7XG5cdHJvdXRlOiAnJyxcblx0aGFuZGxlOiBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdFx0Ly8gUXVpY2sgY2hlY2sgdG8gc2VlIGlmIHJlcXVlc3Qgc2hvdWxkIGJlIGNhdGNoXG5cdFx0aWYgKHJlcS51cmwuaW5kZXhPZihVcGxvYWRGUy5jb25maWcuc3RvcmVzUGF0aCkgPT09IC0xKSB7XG5cdFx0XHRyZXR1cm4gbmV4dCgpO1xuXHRcdH1cblxuXHRcdGxvZ2dlci5kZWJ1ZygnVXBsb2FkIFVSTDonLCByZXEudXJsKTtcblxuXHRcdGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcblx0XHRcdHJldHVybiBuZXh0KCk7XG5cdFx0fVxuXG5cdFx0Ly8gUmVtb3ZlIHN0b3JlIHBhdGhcblx0XHRjb25zdCBwYXJzZWRVcmwgPSBVUkwucGFyc2UocmVxLnVybCk7XG5cdFx0Y29uc3QgcGF0aCA9IHBhcnNlZFVybC5wYXRobmFtZS5zdWJzdHIoVXBsb2FkRlMuY29uZmlnLnN0b3Jlc1BhdGgubGVuZ3RoICsgMSk7XG5cblx0XHQvLyBHZXQgc3RvcmVcblx0XHRjb25zdCByZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFwvKFteXFwvXFw/XSspXFwvKFteXFwvXFw/XSspJCcpO1xuXHRcdGNvbnN0IG1hdGNoID0gcmVnRXhwLmV4ZWMocGF0aCk7XG5cblx0XHQvLyBSZXF1ZXN0IGlzIG5vdCB2YWxpZFxuXHRcdGlmIChtYXRjaCA9PT0gbnVsbCkge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDApO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIEdldCBzdG9yZVxuXHRcdGNvbnN0IHN0b3JlID0gVXBsb2FkRlMuZ2V0U3RvcmUobWF0Y2hbMV0pO1xuXHRcdGlmICghc3RvcmUpIHtcblx0XHRcdHJlcy53cml0ZUhlYWQoNDA0KTtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBHZXQgZmlsZVxuXHRcdGNvbnN0IGZpbGVJZCA9IG1hdGNoWzJdO1xuXHRcdGNvbnN0IGZpbGUgPSBzdG9yZS5nZXRDb2xsZWN0aW9uKCkuZmluZE9uZSh7X2lkOiBmaWxlSWR9KTtcblx0XHRpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDQwNCk7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKGZpbGUuaW5zdGFuY2VJZCA9PT0gSW5zdGFuY2VTdGF0dXMuaWQoKSkge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKCdDb3JyZWN0IGluc3RhbmNlJyk7XG5cdFx0XHRyZXR1cm4gbmV4dCgpO1xuXHRcdH1cblxuXHRcdC8vIFByb3h5IHRvIG90aGVyIGluc3RhbmNlXG5cdFx0Y29uc3QgaW5zdGFuY2UgPSBJbnN0YW5jZVN0YXR1cy5nZXRDb2xsZWN0aW9uKCkuZmluZE9uZSh7X2lkOiBmaWxlLmluc3RhbmNlSWR9KTtcblxuXHRcdGlmIChpbnN0YW5jZSA9PSBudWxsKSB7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDQwNCk7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKGluc3RhbmNlLmV4dHJhSW5mb3JtYXRpb24uaG9zdCA9PT0gcHJvY2Vzcy5lbnYuSU5TVEFOQ0VfSVAgJiYgUm9ja2V0Q2hhdC5pc0RvY2tlcigpID09PSBmYWxzZSkge1xuXHRcdFx0aW5zdGFuY2UuZXh0cmFJbmZvcm1hdGlvbi5ob3N0ID0gJ2xvY2FsaG9zdCc7XG5cdFx0fVxuXG5cdFx0bG9nZ2VyLmRlYnVnKCdXcm9uZyBpbnN0YW5jZSwgcHJveGluZyB0bzonLCBgJHsgaW5zdGFuY2UuZXh0cmFJbmZvcm1hdGlvbi5ob3N0IH06JHsgaW5zdGFuY2UuZXh0cmFJbmZvcm1hdGlvbi5wb3J0IH1gKTtcblxuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRob3N0bmFtZTogaW5zdGFuY2UuZXh0cmFJbmZvcm1hdGlvbi5ob3N0LFxuXHRcdFx0cG9ydDogaW5zdGFuY2UuZXh0cmFJbmZvcm1hdGlvbi5wb3J0LFxuXHRcdFx0cGF0aDogcmVxLm9yaWdpbmFsVXJsLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCdcblx0XHR9O1xuXG5cdFx0Y29uc3QgcHJveHkgPSBodHRwLnJlcXVlc3Qob3B0aW9ucywgZnVuY3Rpb24ocHJveHlfcmVzKSB7XG5cdFx0XHRwcm94eV9yZXMucGlwZShyZXMsIHtcblx0XHRcdFx0ZW5kOiB0cnVlXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHJlcS5waXBlKHByb3h5LCB7XG5cdFx0XHRlbmQ6IHRydWVcblx0XHR9KTtcblx0fSlcbn0pO1xuIiwiLyogZ2xvYmFscyBGaWxlVXBsb2FkLCBXZWJBcHAgKi9cblxuV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoJy9maWxlLXVwbG9hZC8nLFx0ZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcblxuXHRjb25zdCBtYXRjaCA9IC9eXFwvKFteXFwvXSspXFwvKC4qKS8uZXhlYyhyZXEudXJsKTtcblxuXHRpZiAobWF0Y2hbMV0pIHtcblx0XHRjb25zdCBmaWxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kT25lQnlJZChtYXRjaFsxXSk7XG5cblx0XHRpZiAoZmlsZSkge1xuXHRcdFx0aWYgKCFNZXRlb3Iuc2V0dGluZ3MucHVibGljLnNhbmRzdG9ybSAmJiAhRmlsZVVwbG9hZC5yZXF1ZXN0Q2FuQWNjZXNzRmlsZXMocmVxKSkge1xuXHRcdFx0XHRyZXMud3JpdGVIZWFkKDQwMyk7XG5cdFx0XHRcdHJldHVybiByZXMuZW5kKCk7XG5cdFx0XHR9XG5cblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtU2VjdXJpdHktUG9saWN5JywgJ2RlZmF1bHQtc3JjIFxcJ25vbmVcXCcnKTtcblx0XHRcdHJldHVybiBGaWxlVXBsb2FkLmdldChmaWxlLCByZXEsIHJlcywgbmV4dCk7XG5cdFx0fVxuXHR9XG5cblx0cmVzLndyaXRlSGVhZCg0MDQpO1xuXHRyZXMuZW5kKCk7XG59KTtcbiIsIi8qIGdsb2JhbHMgVXBsb2FkRlMgKi9cblxuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgJy4vQW1hem9uUzMuanMnO1xuaW1wb3J0ICcuL0ZpbGVTeXN0ZW0uanMnO1xuaW1wb3J0ICcuL0dvb2dsZVN0b3JhZ2UuanMnO1xuaW1wb3J0ICcuL0dyaWRGUy5qcyc7XG5pbXBvcnQgJy4vV2ViZGF2LmpzJztcbmltcG9ydCAnLi9TbGluZ3Nob3RfREVQUkVDQVRFRC5qcyc7XG5cbmNvbnN0IGNvbmZpZ1N0b3JlID0gXy5kZWJvdW5jZSgoKSA9PiB7XG5cdGNvbnN0IHN0b3JlID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyk7XG5cblx0aWYgKHN0b3JlKSB7XG5cdFx0Y29uc29sZS5sb2coJ1NldHRpbmcgZGVmYXVsdCBmaWxlIHN0b3JlIHRvJywgc3RvcmUpO1xuXHRcdFVwbG9hZEZTLmdldFN0b3JlcygpLkF2YXRhcnMgPSBVcGxvYWRGUy5nZXRTdG9yZShgJHsgc3RvcmUgfTpBdmF0YXJzYCk7XG5cdFx0VXBsb2FkRlMuZ2V0U3RvcmVzKCkuVXBsb2FkcyA9IFVwbG9hZEZTLmdldFN0b3JlKGAkeyBzdG9yZSB9OlVwbG9hZHNgKTtcblx0XHRVcGxvYWRGUy5nZXRTdG9yZXMoKS5Vc2VyRGF0YUZpbGVzID0gVXBsb2FkRlMuZ2V0U3RvcmUoYCR7IHN0b3JlIH06VXNlckRhdGFGaWxlc2ApO1xuXHR9XG59LCAxMDAwKTtcblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoL15GaWxlVXBsb2FkXy8sIGNvbmZpZ1N0b3JlKTtcbiIsIi8qIGdsb2JhbHMgRmlsZVVwbG9hZCAqL1xuXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCB7IEZpbGVVcGxvYWRDbGFzcyB9IGZyb20gJy4uL2xpYi9GaWxlVXBsb2FkJztcbmltcG9ydCAnLi4vLi4vdWZzL0FtYXpvblMzL3NlcnZlci5qcyc7XG5pbXBvcnQgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCBodHRwcyBmcm9tICdodHRwcyc7XG5cbmNvbnN0IGdldCA9IGZ1bmN0aW9uKGZpbGUsIHJlcSwgcmVzKSB7XG5cdGNvbnN0IGZpbGVVcmwgPSB0aGlzLnN0b3JlLmdldFJlZGlyZWN0VVJMKGZpbGUpO1xuXG5cdGlmIChmaWxlVXJsKSB7XG5cdFx0Y29uc3Qgc3RvcmVUeXBlID0gZmlsZS5zdG9yZS5zcGxpdCgnOicpLnBvcCgpO1xuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgRmlsZVVwbG9hZF9TM19Qcm94eV8keyBzdG9yZVR5cGUgfWApKSB7XG5cdFx0XHRjb25zdCByZXF1ZXN0ID0gL15odHRwczovLnRlc3QoZmlsZVVybCkgPyBodHRwcyA6IGh0dHA7XG5cdFx0XHRyZXF1ZXN0LmdldChmaWxlVXJsLCBmaWxlUmVzID0+IGZpbGVSZXMucGlwZShyZXMpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzLnJlbW92ZUhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0xvY2F0aW9uJywgZmlsZVVybCk7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDMwMik7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHJlcy5lbmQoKTtcblx0fVxufTtcblxuY29uc3QgY29weSA9IGZ1bmN0aW9uKGZpbGUsIG91dCkge1xuXHRjb25zdCBmaWxlVXJsID0gdGhpcy5zdG9yZS5nZXRSZWRpcmVjdFVSTChmaWxlKTtcblxuXHRpZiAoZmlsZVVybCkge1xuXHRcdGNvbnN0IHJlcXVlc3QgPSAvXmh0dHBzOi8udGVzdChmaWxlVXJsKSA/IGh0dHBzIDogaHR0cDtcblx0XHRyZXF1ZXN0LmdldChmaWxlVXJsLCBmaWxlUmVzID0+IGZpbGVSZXMucGlwZShvdXQpKTtcblx0fSBlbHNlIHtcblx0XHRvdXQuZW5kKCk7XG5cdH1cbn07XG5cbmNvbnN0IEFtYXpvblMzVXBsb2FkcyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnQW1hem9uUzM6VXBsb2FkcycsXG5cdGdldCxcblx0Y29weVxuXHQvLyBzdG9yZSBzZXR0ZWQgYmVsbG93XG59KTtcblxuY29uc3QgQW1hem9uUzNBdmF0YXJzID0gbmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdBbWF6b25TMzpBdmF0YXJzJyxcblx0Z2V0LFxuXHRjb3B5XG5cdC8vIHN0b3JlIHNldHRlZCBiZWxsb3dcbn0pO1xuXG5jb25zdCBBbWF6b25TM1VzZXJEYXRhRmlsZXMgPSBuZXcgRmlsZVVwbG9hZENsYXNzKHtcblx0bmFtZTogJ0FtYXpvblMzOlVzZXJEYXRhRmlsZXMnLFxuXHRnZXQsXG5cdGNvcHlcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xufSk7XG5cbmNvbnN0IGNvbmZpZ3VyZSA9IF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG5cdGNvbnN0IEJ1Y2tldCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1MzX0J1Y2tldCcpO1xuXHRjb25zdCBBY2wgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19BY2wnKTtcblx0Y29uc3QgQVdTQWNjZXNzS2V5SWQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19BV1NBY2Nlc3NLZXlJZCcpO1xuXHRjb25zdCBBV1NTZWNyZXRBY2Nlc3NLZXkgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19BV1NTZWNyZXRBY2Nlc3NLZXknKTtcblx0Y29uc3QgVVJMRXhwaXJ5VGltZVNwYW4gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19VUkxFeHBpcnlUaW1lU3BhbicpO1xuXHRjb25zdCBSZWdpb24gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19SZWdpb24nKTtcblx0Y29uc3QgU2lnbmF0dXJlVmVyc2lvbiA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1MzX1NpZ25hdHVyZVZlcnNpb24nKTtcblx0Y29uc3QgRm9yY2VQYXRoU3R5bGUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19Gb3JjZVBhdGhTdHlsZScpO1xuXHQvLyBjb25zdCBDRE4gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19DRE4nKTtcblx0Y29uc3QgQnVja2V0VVJMID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfUzNfQnVja2V0VVJMJyk7XG5cblx0aWYgKCFCdWNrZXQpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCBjb25maWcgPSB7XG5cdFx0Y29ubmVjdGlvbjoge1xuXHRcdFx0c2lnbmF0dXJlVmVyc2lvbjogU2lnbmF0dXJlVmVyc2lvbixcblx0XHRcdHMzRm9yY2VQYXRoU3R5bGU6IEZvcmNlUGF0aFN0eWxlLFxuXHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdEJ1Y2tldCxcblx0XHRcdFx0QUNMOiBBY2xcblx0XHRcdH0sXG5cdFx0XHRyZWdpb246IFJlZ2lvblxuXHRcdH0sXG5cdFx0VVJMRXhwaXJ5VGltZVNwYW5cblx0fTtcblxuXHRpZiAoQVdTQWNjZXNzS2V5SWQpIHtcblx0XHRjb25maWcuY29ubmVjdGlvbi5hY2Nlc3NLZXlJZCA9IEFXU0FjY2Vzc0tleUlkO1xuXHR9XG5cblx0aWYgKEFXU1NlY3JldEFjY2Vzc0tleSkge1xuXHRcdGNvbmZpZy5jb25uZWN0aW9uLnNlY3JldEFjY2Vzc0tleSA9IEFXU1NlY3JldEFjY2Vzc0tleTtcblx0fVxuXG5cdGlmIChCdWNrZXRVUkwpIHtcblx0XHRjb25maWcuY29ubmVjdGlvbi5lbmRwb2ludCA9IEJ1Y2tldFVSTDtcblx0fVxuXG5cdEFtYXpvblMzVXBsb2Fkcy5zdG9yZSA9IEZpbGVVcGxvYWQuY29uZmlndXJlVXBsb2Fkc1N0b3JlKCdBbWF6b25TMycsIEFtYXpvblMzVXBsb2Fkcy5uYW1lLCBjb25maWcpO1xuXHRBbWF6b25TM0F2YXRhcnMuc3RvcmUgPSBGaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnQW1hem9uUzMnLCBBbWF6b25TM0F2YXRhcnMubmFtZSwgY29uZmlnKTtcblx0QW1hem9uUzNVc2VyRGF0YUZpbGVzLnN0b3JlID0gRmlsZVVwbG9hZC5jb25maWd1cmVVcGxvYWRzU3RvcmUoJ0FtYXpvblMzJywgQW1hem9uUzNVc2VyRGF0YUZpbGVzLm5hbWUsIGNvbmZpZyk7XG59LCA1MDApO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgvXkZpbGVVcGxvYWRfUzNfLywgY29uZmlndXJlKTtcbiIsIi8qIGdsb2JhbHMgRmlsZVVwbG9hZCwgVXBsb2FkRlMgKi9cblxuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgRmlsZVVwbG9hZENsYXNzIH0gZnJvbSAnLi4vbGliL0ZpbGVVcGxvYWQnO1xuXG5jb25zdCBGaWxlU3lzdGVtVXBsb2FkcyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnRmlsZVN5c3RlbTpVcGxvYWRzJyxcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xuXG5cdGdldChmaWxlLCByZXEsIHJlcykge1xuXHRcdGNvbnN0IGZpbGVQYXRoID0gdGhpcy5zdG9yZS5nZXRGaWxlUGF0aChmaWxlLl9pZCwgZmlsZSk7XG5cblx0XHR0cnkge1xuXHRcdFx0Y29uc3Qgc3RhdCA9IE1ldGVvci53cmFwQXN5bmMoZnMuc3RhdCkoZmlsZVBhdGgpO1xuXG5cdFx0XHRpZiAoc3RhdCAmJiBzdGF0LmlzRmlsZSgpKSB7XG5cdFx0XHRcdGZpbGUgPSBGaWxlVXBsb2FkLmFkZEV4dGVuc2lvblRvKGZpbGUpO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgYGF0dGFjaG1lbnQ7IGZpbGVuYW1lKj1VVEYtOCcnJHsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbGUubmFtZSkgfWApO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdMYXN0LU1vZGlmaWVkJywgZmlsZS51cGxvYWRlZEF0LnRvVVRDU3RyaW5nKCkpO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCBmaWxlLnR5cGUpO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIGZpbGUuc2l6ZSk7XG5cblx0XHRcdFx0dGhpcy5zdG9yZS5nZXRSZWFkU3RyZWFtKGZpbGUuX2lkLCBmaWxlKS5waXBlKHJlcyk7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDQpO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fSxcblxuXHRjb3B5KGZpbGUsIG91dCkge1xuXHRcdGNvbnN0IGZpbGVQYXRoID0gdGhpcy5zdG9yZS5nZXRGaWxlUGF0aChmaWxlLl9pZCwgZmlsZSk7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHN0YXQgPSBNZXRlb3Iud3JhcEFzeW5jKGZzLnN0YXQpKGZpbGVQYXRoKTtcblxuXHRcdFx0aWYgKHN0YXQgJiYgc3RhdC5pc0ZpbGUoKSkge1xuXHRcdFx0XHRmaWxlID0gRmlsZVVwbG9hZC5hZGRFeHRlbnNpb25UbyhmaWxlKTtcblxuXHRcdFx0XHR0aGlzLnN0b3JlLmdldFJlYWRTdHJlYW0oZmlsZS5faWQsIGZpbGUpLnBpcGUob3V0KTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRvdXQuZW5kKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG59KTtcblxuY29uc3QgRmlsZVN5c3RlbUF2YXRhcnMgPSBuZXcgRmlsZVVwbG9hZENsYXNzKHtcblx0bmFtZTogJ0ZpbGVTeXN0ZW06QXZhdGFycycsXG5cdC8vIHN0b3JlIHNldHRlZCBiZWxsb3dcblxuXHRnZXQoZmlsZSwgcmVxLCByZXMpIHtcblx0XHRjb25zdCBmaWxlUGF0aCA9IHRoaXMuc3RvcmUuZ2V0RmlsZVBhdGgoZmlsZS5faWQsIGZpbGUpO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHN0YXQgPSBNZXRlb3Iud3JhcEFzeW5jKGZzLnN0YXQpKGZpbGVQYXRoKTtcblxuXHRcdFx0aWYgKHN0YXQgJiYgc3RhdC5pc0ZpbGUoKSkge1xuXHRcdFx0XHRmaWxlID0gRmlsZVVwbG9hZC5hZGRFeHRlbnNpb25UbyhmaWxlKTtcblxuXHRcdFx0XHR0aGlzLnN0b3JlLmdldFJlYWRTdHJlYW0oZmlsZS5faWQsIGZpbGUpLnBpcGUocmVzKTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDQwNCk7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG59KTtcblxuY29uc3QgRmlsZVN5c3RlbVVzZXJEYXRhRmlsZXMgPSBuZXcgRmlsZVVwbG9hZENsYXNzKHtcblx0bmFtZTogJ0ZpbGVTeXN0ZW06VXNlckRhdGFGaWxlcycsXG5cblx0Z2V0KGZpbGUsIHJlcSwgcmVzKSB7XG5cdFx0Y29uc3QgZmlsZVBhdGggPSB0aGlzLnN0b3JlLmdldEZpbGVQYXRoKGZpbGUuX2lkLCBmaWxlKTtcblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBzdGF0ID0gTWV0ZW9yLndyYXBBc3luYyhmcy5zdGF0KShmaWxlUGF0aCk7XG5cblx0XHRcdGlmIChzdGF0ICYmIHN0YXQuaXNGaWxlKCkpIHtcblx0XHRcdFx0ZmlsZSA9IEZpbGVVcGxvYWQuYWRkRXh0ZW5zaW9uVG8oZmlsZSk7XG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtRGlzcG9zaXRpb24nLCBgYXR0YWNobWVudDsgZmlsZW5hbWUqPVVURi04JyckeyBlbmNvZGVVUklDb21wb25lbnQoZmlsZS5uYW1lKSB9YCk7XG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCBmaWxlLnVwbG9hZGVkQXQudG9VVENTdHJpbmcoKSk7XG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsIGZpbGUudHlwZSk7XG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJywgZmlsZS5zaXplKTtcblxuXHRcdFx0XHR0aGlzLnN0b3JlLmdldFJlYWRTdHJlYW0oZmlsZS5faWQsIGZpbGUpLnBpcGUocmVzKTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDQwNCk7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG59KTtcblxuY29uc3QgY3JlYXRlRmlsZVN5c3RlbVN0b3JlID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRwYXRoOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9GaWxlU3lzdGVtUGF0aCcpIC8vJy90bXAvdXBsb2Fkcy9waG90b3MnLFxuXHR9O1xuXG5cdEZpbGVTeXN0ZW1VcGxvYWRzLnN0b3JlID0gRmlsZVVwbG9hZC5jb25maWd1cmVVcGxvYWRzU3RvcmUoJ0xvY2FsJywgRmlsZVN5c3RlbVVwbG9hZHMubmFtZSwgb3B0aW9ucyk7XG5cdEZpbGVTeXN0ZW1BdmF0YXJzLnN0b3JlID0gRmlsZVVwbG9hZC5jb25maWd1cmVVcGxvYWRzU3RvcmUoJ0xvY2FsJywgRmlsZVN5c3RlbUF2YXRhcnMubmFtZSwgb3B0aW9ucyk7XG5cdEZpbGVTeXN0ZW1Vc2VyRGF0YUZpbGVzLnN0b3JlID0gRmlsZVVwbG9hZC5jb25maWd1cmVVcGxvYWRzU3RvcmUoJ0xvY2FsJywgRmlsZVN5c3RlbVVzZXJEYXRhRmlsZXMubmFtZSwgb3B0aW9ucyk7XG5cblx0Ly8gREVQUkVDQVRFRCBiYWNrd2FyZHMgY29tcGF0aWJpbGlsdHkgKHJlbW92ZSlcblx0VXBsb2FkRlMuZ2V0U3RvcmVzKClbJ2ZpbGVTeXN0ZW0nXSA9IFVwbG9hZEZTLmdldFN0b3JlcygpW0ZpbGVTeXN0ZW1VcGxvYWRzLm5hbWVdO1xufSwgNTAwKTtcblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfRmlsZVN5c3RlbVBhdGgnLCBjcmVhdGVGaWxlU3lzdGVtU3RvcmUpO1xuIiwiLyogZ2xvYmFscyBGaWxlVXBsb2FkICovXG5cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgRmlsZVVwbG9hZENsYXNzIH0gZnJvbSAnLi4vbGliL0ZpbGVVcGxvYWQnO1xuaW1wb3J0ICcuLi8uLi91ZnMvR29vZ2xlU3RvcmFnZS9zZXJ2ZXIuanMnO1xuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgaHR0cHMgZnJvbSAnaHR0cHMnO1xuXG5jb25zdCBnZXQgPSBmdW5jdGlvbihmaWxlLCByZXEsIHJlcykge1xuXHR0aGlzLnN0b3JlLmdldFJlZGlyZWN0VVJMKGZpbGUsIChlcnIsIGZpbGVVcmwpID0+IHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cdFx0fVxuXG5cdFx0aWYgKGZpbGVVcmwpIHtcblx0XHRcdGNvbnN0IHN0b3JlVHlwZSA9IGZpbGUuc3RvcmUuc3BsaXQoJzonKS5wb3AoKTtcblx0XHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX1Byb3h5XyR7IHN0b3JlVHlwZSB9YCkpIHtcblx0XHRcdFx0Y29uc3QgcmVxdWVzdCA9IC9eaHR0cHM6Ly50ZXN0KGZpbGVVcmwpID8gaHR0cHMgOiBodHRwO1xuXHRcdFx0XHRyZXF1ZXN0LmdldChmaWxlVXJsLCBmaWxlUmVzID0+IGZpbGVSZXMucGlwZShyZXMpKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJlcy5yZW1vdmVIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJyk7XG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIoJ0xvY2F0aW9uJywgZmlsZVVybCk7XG5cdFx0XHRcdHJlcy53cml0ZUhlYWQoMzAyKTtcblx0XHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGNvcHkgPSBmdW5jdGlvbihmaWxlLCBvdXQpIHtcblx0dGhpcy5zdG9yZS5nZXRSZWRpcmVjdFVSTChmaWxlLCAoZXJyLCBmaWxlVXJsKSA9PiB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0Y29uc29sZS5lcnJvcihlcnIpO1xuXHRcdH1cblxuXHRcdGlmIChmaWxlVXJsKSB7XG5cdFx0XHRjb25zdCByZXF1ZXN0ID0gL15odHRwczovLnRlc3QoZmlsZVVybCkgPyBodHRwcyA6IGh0dHA7XG5cdFx0XHRyZXF1ZXN0LmdldChmaWxlVXJsLCBmaWxlUmVzID0+IGZpbGVSZXMucGlwZShvdXQpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0b3V0LmVuZCgpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5jb25zdCBHb29nbGVDbG91ZFN0b3JhZ2VVcGxvYWRzID0gbmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdHb29nbGVDbG91ZFN0b3JhZ2U6VXBsb2FkcycsXG5cdGdldCxcblx0Y29weVxuXHQvLyBzdG9yZSBzZXR0ZWQgYmVsbG93XG59KTtcblxuY29uc3QgR29vZ2xlQ2xvdWRTdG9yYWdlQXZhdGFycyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnR29vZ2xlQ2xvdWRTdG9yYWdlOkF2YXRhcnMnLFxuXHRnZXQsXG5cdGNvcHlcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xufSk7XG5cbmNvbnN0IEdvb2dsZUNsb3VkU3RvcmFnZVVzZXJEYXRhRmlsZXMgPSBuZXcgRmlsZVVwbG9hZENsYXNzKHtcblx0bmFtZTogJ0dvb2dsZUNsb3VkU3RvcmFnZTpVc2VyRGF0YUZpbGVzJyxcblx0Z2V0LFxuXHRjb3B5XG5cdC8vIHN0b3JlIHNldHRlZCBiZWxsb3dcbn0pO1xuXG5jb25zdCBjb25maWd1cmUgPSBfLmRlYm91bmNlKGZ1bmN0aW9uKCkge1xuXHRjb25zdCBidWNrZXQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX0J1Y2tldCcpO1xuXHRjb25zdCBhY2Nlc3NJZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfQWNjZXNzSWQnKTtcblx0Y29uc3Qgc2VjcmV0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9TZWNyZXQnKTtcblx0Y29uc3QgVVJMRXhwaXJ5VGltZVNwYW4gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19VUkxFeHBpcnlUaW1lU3BhbicpO1xuXG5cdGlmICghYnVja2V0IHx8ICFhY2Nlc3NJZCB8fCAhc2VjcmV0KSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgY29uZmlnID0ge1xuXHRcdGNvbm5lY3Rpb246IHtcblx0XHRcdGNyZWRlbnRpYWxzOiB7XG5cdFx0XHRcdGNsaWVudF9lbWFpbDogYWNjZXNzSWQsXG5cdFx0XHRcdHByaXZhdGVfa2V5OiBzZWNyZXRcblx0XHRcdH1cblx0XHR9LFxuXHRcdGJ1Y2tldCxcblx0XHRVUkxFeHBpcnlUaW1lU3BhblxuXHR9O1xuXG5cdEdvb2dsZUNsb3VkU3RvcmFnZVVwbG9hZHMuc3RvcmUgPSBGaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnR29vZ2xlU3RvcmFnZScsIEdvb2dsZUNsb3VkU3RvcmFnZVVwbG9hZHMubmFtZSwgY29uZmlnKTtcblx0R29vZ2xlQ2xvdWRTdG9yYWdlQXZhdGFycy5zdG9yZSA9IEZpbGVVcGxvYWQuY29uZmlndXJlVXBsb2Fkc1N0b3JlKCdHb29nbGVTdG9yYWdlJywgR29vZ2xlQ2xvdWRTdG9yYWdlQXZhdGFycy5uYW1lLCBjb25maWcpO1xuXHRHb29nbGVDbG91ZFN0b3JhZ2VVc2VyRGF0YUZpbGVzLnN0b3JlID0gRmlsZVVwbG9hZC5jb25maWd1cmVVcGxvYWRzU3RvcmUoJ0dvb2dsZVN0b3JhZ2UnLCBHb29nbGVDbG91ZFN0b3JhZ2VVc2VyRGF0YUZpbGVzLm5hbWUsIGNvbmZpZyk7XG59LCA1MDApO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgvXkZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV8vLCBjb25maWd1cmUpO1xuIiwiLyogZ2xvYmFscyBGaWxlVXBsb2FkLCBVcGxvYWRGUyAqL1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcblxuaW1wb3J0IHsgRmlsZVVwbG9hZENsYXNzIH0gZnJvbSAnLi4vbGliL0ZpbGVVcGxvYWQnO1xuXG5jb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCdGaWxlVXBsb2FkJyk7XG5cbmZ1bmN0aW9uIEV4dHJhY3RSYW5nZShvcHRpb25zKSB7XG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBFeHRyYWN0UmFuZ2UpKSB7XG5cdFx0cmV0dXJuIG5ldyBFeHRyYWN0UmFuZ2Uob3B0aW9ucyk7XG5cdH1cblxuXHR0aGlzLnN0YXJ0ID0gb3B0aW9ucy5zdGFydDtcblx0dGhpcy5zdG9wID0gb3B0aW9ucy5zdG9wO1xuXHR0aGlzLmJ5dGVzX3JlYWQgPSAwO1xuXG5cdHN0cmVhbS5UcmFuc2Zvcm0uY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cbnV0aWwuaW5oZXJpdHMoRXh0cmFjdFJhbmdlLCBzdHJlYW0uVHJhbnNmb3JtKTtcblxuXG5FeHRyYWN0UmFuZ2UucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbihjaHVuaywgZW5jLCBjYikge1xuXHRpZiAodGhpcy5ieXRlc19yZWFkID4gdGhpcy5zdG9wKSB7XG5cdFx0Ly8gZG9uZSByZWFkaW5nXG5cdFx0dGhpcy5lbmQoKTtcblx0fSBlbHNlIGlmICh0aGlzLmJ5dGVzX3JlYWQgKyBjaHVuay5sZW5ndGggPCB0aGlzLnN0YXJ0KSB7XG5cdFx0Ly8gdGhpcyBjaHVuayBpcyBzdGlsbCBiZWZvcmUgdGhlIHN0YXJ0IGJ5dGVcblx0fSBlbHNlIHtcblx0XHRsZXQgc3RhcnQ7XG5cdFx0bGV0IHN0b3A7XG5cblx0XHRpZiAodGhpcy5zdGFydCA8PSB0aGlzLmJ5dGVzX3JlYWQpIHtcblx0XHRcdHN0YXJ0ID0gMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3RhcnQgPSB0aGlzLnN0YXJ0IC0gdGhpcy5ieXRlc19yZWFkO1xuXHRcdH1cblx0XHRpZiAoKHRoaXMuc3RvcCAtIHRoaXMuYnl0ZXNfcmVhZCArIDEpIDwgY2h1bmsubGVuZ3RoKSB7XG5cdFx0XHRzdG9wID0gdGhpcy5zdG9wIC0gdGhpcy5ieXRlc19yZWFkICsgMTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3RvcCA9IGNodW5rLmxlbmd0aDtcblx0XHR9XG5cdFx0Y29uc3QgbmV3Y2h1bmsgPSBjaHVuay5zbGljZShzdGFydCwgc3RvcCk7XG5cdFx0dGhpcy5wdXNoKG5ld2NodW5rKTtcblx0fVxuXHR0aGlzLmJ5dGVzX3JlYWQgKz0gY2h1bmsubGVuZ3RoO1xuXHRjYigpO1xufTtcblxuXG5jb25zdCBnZXRCeXRlUmFuZ2UgPSBmdW5jdGlvbihoZWFkZXIpIHtcblx0aWYgKGhlYWRlcikge1xuXHRcdGNvbnN0IG1hdGNoZXMgPSBoZWFkZXIubWF0Y2goLyhcXGQrKS0oXFxkKykvKTtcblx0XHRpZiAobWF0Y2hlcykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3RhcnQ6IHBhcnNlSW50KG1hdGNoZXNbMV0sIDEwKSxcblx0XHRcdFx0c3RvcDogcGFyc2VJbnQobWF0Y2hlc1syXSwgMTApXG5cdFx0XHR9O1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbnVsbDtcbn07XG5cbi8vIGNvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2phbGlrL2phbGlrLXVmcy9ibG9iL21hc3Rlci91ZnMtc2VydmVyLmpzI0wzMTBcbmNvbnN0IHJlYWRGcm9tR3JpZEZTID0gZnVuY3Rpb24oc3RvcmVOYW1lLCBmaWxlSWQsIGZpbGUsIHJlcSwgcmVzKSB7XG5cdGNvbnN0IHN0b3JlID0gVXBsb2FkRlMuZ2V0U3RvcmUoc3RvcmVOYW1lKTtcblx0Y29uc3QgcnMgPSBzdG9yZS5nZXRSZWFkU3RyZWFtKGZpbGVJZCwgZmlsZSk7XG5cdGNvbnN0IHdzID0gbmV3IHN0cmVhbS5QYXNzVGhyb3VnaCgpO1xuXG5cdFtycywgd3NdLmZvckVhY2goc3RyZWFtID0+IHN0cmVhbS5vbignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcblx0XHRzdG9yZS5vblJlYWRFcnJvci5jYWxsKHN0b3JlLCBlcnIsIGZpbGVJZCwgZmlsZSk7XG5cdFx0cmVzLmVuZCgpO1xuXHR9KSk7XG5cblx0d3Mub24oJ2Nsb3NlJywgZnVuY3Rpb24oKSB7XG5cdFx0Ly8gQ2xvc2Ugb3V0cHV0IHN0cmVhbSBhdCB0aGUgZW5kXG5cdFx0d3MuZW1pdCgnZW5kJyk7XG5cdH0pO1xuXG5cdGNvbnN0IGFjY2VwdCA9IHJlcS5oZWFkZXJzWydhY2NlcHQtZW5jb2RpbmcnXSB8fCAnJztcblxuXHQvLyBUcmFuc2Zvcm0gc3RyZWFtXG5cdHN0b3JlLnRyYW5zZm9ybVJlYWQocnMsIHdzLCBmaWxlSWQsIGZpbGUsIHJlcSk7XG5cdGNvbnN0IHJhbmdlID0gZ2V0Qnl0ZVJhbmdlKHJlcS5oZWFkZXJzLnJhbmdlKTtcblx0bGV0IG91dF9vZl9yYW5nZSA9IGZhbHNlO1xuXHRpZiAocmFuZ2UpIHtcblx0XHRvdXRfb2ZfcmFuZ2UgPSAocmFuZ2Uuc3RhcnQgPiBmaWxlLnNpemUpIHx8IChyYW5nZS5zdG9wIDw9IHJhbmdlLnN0YXJ0KSB8fCAocmFuZ2Uuc3RvcCA+IGZpbGUuc2l6ZSk7XG5cdH1cblxuXHQvLyBDb21wcmVzcyBkYXRhIHVzaW5nIGd6aXBcblx0aWYgKGFjY2VwdC5tYXRjaCgvXFxiZ3ppcFxcYi8pICYmIHJhbmdlID09PSBudWxsKSB7XG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1FbmNvZGluZycsICdnemlwJyk7XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcblx0XHRyZXMud3JpdGVIZWFkKDIwMCk7XG5cdFx0d3MucGlwZSh6bGliLmNyZWF0ZUd6aXAoKSkucGlwZShyZXMpO1xuXHR9IGVsc2UgaWYgKGFjY2VwdC5tYXRjaCgvXFxiZGVmbGF0ZVxcYi8pICYmIHJhbmdlID09PSBudWxsKSB7XG5cdFx0Ly8gQ29tcHJlc3MgZGF0YSB1c2luZyBkZWZsYXRlXG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1FbmNvZGluZycsICdkZWZsYXRlJyk7XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcblx0XHRyZXMud3JpdGVIZWFkKDIwMCk7XG5cdFx0d3MucGlwZSh6bGliLmNyZWF0ZURlZmxhdGUoKSkucGlwZShyZXMpO1xuXHR9IGVsc2UgaWYgKHJhbmdlICYmIG91dF9vZl9yYW5nZSkge1xuXHRcdC8vIG91dCBvZiByYW5nZSByZXF1ZXN0LCByZXR1cm4gNDE2XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcblx0XHRyZXMucmVtb3ZlSGVhZGVyKCdDb250ZW50LVR5cGUnKTtcblx0XHRyZXMucmVtb3ZlSGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJyk7XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignTGFzdC1Nb2RpZmllZCcpO1xuXHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtUmFuZ2UnLCBgYnl0ZXMgKi8keyBmaWxlLnNpemUgfWApO1xuXHRcdHJlcy53cml0ZUhlYWQoNDE2KTtcblx0XHRyZXMuZW5kKCk7XG5cdH0gZWxzZSBpZiAocmFuZ2UpIHtcblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LVJhbmdlJywgYGJ5dGVzICR7IHJhbmdlLnN0YXJ0IH0tJHsgcmFuZ2Uuc3RvcCB9LyR7IGZpbGUuc2l6ZSB9YCk7XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIHJhbmdlLnN0b3AgLSByYW5nZS5zdGFydCArIDEpO1xuXHRcdHJlcy53cml0ZUhlYWQoMjA2KTtcblx0XHRsb2dnZXIuZGVidWcoJ0ZpbGUgdXBsb2FkIGV4dHJhY3RpbmcgcmFuZ2UnKTtcblx0XHR3cy5waXBlKG5ldyBFeHRyYWN0UmFuZ2UoeyBzdGFydDogcmFuZ2Uuc3RhcnQsIHN0b3A6IHJhbmdlLnN0b3AgfSkpLnBpcGUocmVzKTtcblx0fSBlbHNlIHtcblx0XHRyZXMud3JpdGVIZWFkKDIwMCk7XG5cdFx0d3MucGlwZShyZXMpO1xuXHR9XG59O1xuXG5jb25zdCBjb3B5RnJvbUdyaWRGUyA9IGZ1bmN0aW9uKHN0b3JlTmFtZSwgZmlsZUlkLCBmaWxlLCBvdXQpIHtcblx0Y29uc3Qgc3RvcmUgPSBVcGxvYWRGUy5nZXRTdG9yZShzdG9yZU5hbWUpO1xuXHRjb25zdCBycyA9IHN0b3JlLmdldFJlYWRTdHJlYW0oZmlsZUlkLCBmaWxlKTtcblxuXHRbcnMsIG91dF0uZm9yRWFjaChzdHJlYW0gPT4gc3RyZWFtLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuXHRcdHN0b3JlLm9uUmVhZEVycm9yLmNhbGwoc3RvcmUsIGVyciwgZmlsZUlkLCBmaWxlKTtcblx0XHRvdXQuZW5kKCk7XG5cdH0pKTtcblxuXHRycy5waXBlKG91dCk7XG59O1xuXG5GaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnR3JpZEZTJywgJ0dyaWRGUzpVcGxvYWRzJywge1xuXHRjb2xsZWN0aW9uTmFtZTogJ3JvY2tldGNoYXRfdXBsb2Fkcydcbn0pO1xuXG5GaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnR3JpZEZTJywgJ0dyaWRGUzpVc2VyRGF0YUZpbGVzJywge1xuXHRjb2xsZWN0aW9uTmFtZTogJ3JvY2tldGNoYXRfdXNlckRhdGFGaWxlcydcbn0pO1xuXG4vLyBERVBSRUNBVEVEOiBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSAocmVtb3ZlKVxuVXBsb2FkRlMuZ2V0U3RvcmVzKClbJ3JvY2tldGNoYXRfdXBsb2FkcyddID0gVXBsb2FkRlMuZ2V0U3RvcmVzKClbJ0dyaWRGUzpVcGxvYWRzJ107XG5cbkZpbGVVcGxvYWQuY29uZmlndXJlVXBsb2Fkc1N0b3JlKCdHcmlkRlMnLCAnR3JpZEZTOkF2YXRhcnMnLCB7XG5cdGNvbGxlY3Rpb25OYW1lOiAncm9ja2V0Y2hhdF9hdmF0YXJzJ1xufSk7XG5cblxubmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdHcmlkRlM6VXBsb2FkcycsXG5cblx0Z2V0KGZpbGUsIHJlcSwgcmVzKSB7XG5cdFx0ZmlsZSA9IEZpbGVVcGxvYWQuYWRkRXh0ZW5zaW9uVG8oZmlsZSk7XG5cblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgYGF0dGFjaG1lbnQ7IGZpbGVuYW1lKj1VVEYtOCcnJHsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbGUubmFtZSkgfWApO1xuXHRcdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCBmaWxlLnVwbG9hZGVkQXQudG9VVENTdHJpbmcoKSk7XG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgZmlsZS50eXBlKTtcblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIGZpbGUuc2l6ZSk7XG5cblx0XHRyZXR1cm4gcmVhZEZyb21HcmlkRlMoZmlsZS5zdG9yZSwgZmlsZS5faWQsIGZpbGUsIHJlcSwgcmVzKTtcblx0fSxcblxuXHRjb3B5KGZpbGUsIG91dCkge1xuXHRcdGNvcHlGcm9tR3JpZEZTKGZpbGUuc3RvcmUsIGZpbGUuX2lkLCBmaWxlLCBvdXQpO1xuXHR9XG59KTtcblxubmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdHcmlkRlM6VXNlckRhdGFGaWxlcycsXG5cblx0Z2V0KGZpbGUsIHJlcSwgcmVzKSB7XG5cdFx0ZmlsZSA9IEZpbGVVcGxvYWQuYWRkRXh0ZW5zaW9uVG8oZmlsZSk7XG5cblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgYGF0dGFjaG1lbnQ7IGZpbGVuYW1lKj1VVEYtOCcnJHsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbGUubmFtZSkgfWApO1xuXHRcdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCBmaWxlLnVwbG9hZGVkQXQudG9VVENTdHJpbmcoKSk7XG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgZmlsZS50eXBlKTtcblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIGZpbGUuc2l6ZSk7XG5cblx0XHRyZXR1cm4gcmVhZEZyb21HcmlkRlMoZmlsZS5zdG9yZSwgZmlsZS5faWQsIGZpbGUsIHJlcSwgcmVzKTtcblx0fSxcblxuXHRjb3B5KGZpbGUsIG91dCkge1xuXHRcdGNvcHlGcm9tR3JpZEZTKGZpbGUuc3RvcmUsIGZpbGUuX2lkLCBmaWxlLCBvdXQpO1xuXHR9XG59KTtcblxubmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdHcmlkRlM6QXZhdGFycycsXG5cblx0Z2V0KGZpbGUsIHJlcSwgcmVzKSB7XG5cdFx0ZmlsZSA9IEZpbGVVcGxvYWQuYWRkRXh0ZW5zaW9uVG8oZmlsZSk7XG5cblx0XHRyZXR1cm4gcmVhZEZyb21HcmlkRlMoZmlsZS5zdG9yZSwgZmlsZS5faWQsIGZpbGUsIHJlcSwgcmVzKTtcblx0fVxufSk7XG4iLCIvKiBnbG9iYWxzIFNsaW5nc2hvdCwgRmlsZVVwbG9hZCAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbmNvbnN0IGNvbmZpZ3VyZVNsaW5nc2hvdCA9IF8uZGVib3VuY2UoKCkgPT4ge1xuXHRjb25zdCB0eXBlID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyk7XG5cdGNvbnN0IGJ1Y2tldCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1MzX0J1Y2tldCcpO1xuXHRjb25zdCBhY2wgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19BY2wnKTtcblx0Y29uc3QgYWNjZXNzS2V5ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfUzNfQVdTQWNjZXNzS2V5SWQnKTtcblx0Y29uc3Qgc2VjcmV0S2V5ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfUzNfQVdTU2VjcmV0QWNjZXNzS2V5Jyk7XG5cdGNvbnN0IGNkbiA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1MzX0NETicpO1xuXHRjb25zdCByZWdpb24gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19SZWdpb24nKTtcblx0Y29uc3QgYnVja2V0VXJsID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfUzNfQnVja2V0VVJMJyk7XG5cblx0ZGVsZXRlIFNsaW5nc2hvdC5fZGlyZWN0aXZlc1sncm9ja2V0Y2hhdC11cGxvYWRzJ107XG5cblx0aWYgKHR5cGUgPT09ICdBbWF6b25TMycgJiYgIV8uaXNFbXB0eShidWNrZXQpICYmICFfLmlzRW1wdHkoYWNjZXNzS2V5KSAmJiAhXy5pc0VtcHR5KHNlY3JldEtleSkpIHtcblx0XHRpZiAoU2xpbmdzaG90Ll9kaXJlY3RpdmVzWydyb2NrZXRjaGF0LXVwbG9hZHMnXSkge1xuXHRcdFx0ZGVsZXRlIFNsaW5nc2hvdC5fZGlyZWN0aXZlc1sncm9ja2V0Y2hhdC11cGxvYWRzJ107XG5cdFx0fVxuXHRcdGNvbnN0IGNvbmZpZyA9IHtcblx0XHRcdGJ1Y2tldCxcblx0XHRcdGtleShmaWxlLCBtZXRhQ29udGV4dCkge1xuXHRcdFx0XHRjb25zdCBpZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0XHRjb25zdCBwYXRoID0gYCR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCd1bmlxdWVJRCcpIH0vdXBsb2Fkcy8keyBtZXRhQ29udGV4dC5yaWQgfS8keyB0aGlzLnVzZXJJZCB9LyR7IGlkIH1gO1xuXG5cdFx0XHRcdGNvbnN0IHVwbG9hZCA9IHtcblx0XHRcdFx0XHRfaWQ6IGlkLFxuXHRcdFx0XHRcdHJpZDogbWV0YUNvbnRleHQucmlkLFxuXHRcdFx0XHRcdEFtYXpvblMzOiB7XG5cdFx0XHRcdFx0XHRwYXRoXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMuaW5zZXJ0RmlsZUluaXQodGhpcy51c2VySWQsICdBbWF6b25TMzpVcGxvYWRzJywgZmlsZSwgdXBsb2FkKTtcblxuXHRcdFx0XHRyZXR1cm4gcGF0aDtcblx0XHRcdH0sXG5cdFx0XHRBV1NBY2Nlc3NLZXlJZDogYWNjZXNzS2V5LFxuXHRcdFx0QVdTU2VjcmV0QWNjZXNzS2V5OiBzZWNyZXRLZXlcblx0XHR9O1xuXG5cdFx0aWYgKCFfLmlzRW1wdHkoYWNsKSkge1xuXHRcdFx0Y29uZmlnLmFjbCA9IGFjbDtcblx0XHR9XG5cblx0XHRpZiAoIV8uaXNFbXB0eShjZG4pKSB7XG5cdFx0XHRjb25maWcuY2RuID0gY2RuO1xuXHRcdH1cblxuXHRcdGlmICghXy5pc0VtcHR5KHJlZ2lvbikpIHtcblx0XHRcdGNvbmZpZy5yZWdpb24gPSByZWdpb247XG5cdFx0fVxuXG5cdFx0aWYgKCFfLmlzRW1wdHkoYnVja2V0VXJsKSkge1xuXHRcdFx0Y29uZmlnLmJ1Y2tldFVybCA9IGJ1Y2tldFVybDtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0U2xpbmdzaG90LmNyZWF0ZURpcmVjdGl2ZSgncm9ja2V0Y2hhdC11cGxvYWRzJywgU2xpbmdzaG90LlMzU3RvcmFnZSwgY29uZmlnKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdFcnJvciBjb25maWd1cmluZyBTMyAtPicsIGUubWVzc2FnZSk7XG5cdFx0fVxuXHR9XG59LCA1MDApO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLCBjb25maWd1cmVTbGluZ3Nob3QpO1xuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoL15GaWxlVXBsb2FkX1MzXy8sIGNvbmZpZ3VyZVNsaW5nc2hvdCk7XG5cblxuXG5jb25zdCBjcmVhdGVHb29nbGVTdG9yYWdlRGlyZWN0aXZlID0gXy5kZWJvdW5jZSgoKSA9PiB7XG5cdGNvbnN0IHR5cGUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnKTtcblx0Y29uc3QgYnVja2V0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9CdWNrZXQnKTtcblx0Y29uc3QgYWNjZXNzSWQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX0FjY2Vzc0lkJyk7XG5cdGNvbnN0IHNlY3JldCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfU2VjcmV0Jyk7XG5cblx0ZGVsZXRlIFNsaW5nc2hvdC5fZGlyZWN0aXZlc1sncm9ja2V0Y2hhdC11cGxvYWRzLWdzJ107XG5cblx0aWYgKHR5cGUgPT09ICdHb29nbGVDbG91ZFN0b3JhZ2UnICYmICFfLmlzRW1wdHkoc2VjcmV0KSAmJiAhXy5pc0VtcHR5KGFjY2Vzc0lkKSAmJiAhXy5pc0VtcHR5KGJ1Y2tldCkpIHtcblx0XHRpZiAoU2xpbmdzaG90Ll9kaXJlY3RpdmVzWydyb2NrZXRjaGF0LXVwbG9hZHMtZ3MnXSkge1xuXHRcdFx0ZGVsZXRlIFNsaW5nc2hvdC5fZGlyZWN0aXZlc1sncm9ja2V0Y2hhdC11cGxvYWRzLWdzJ107XG5cdFx0fVxuXG5cdFx0Y29uc3QgY29uZmlnID0ge1xuXHRcdFx0YnVja2V0LFxuXHRcdFx0R29vZ2xlQWNjZXNzSWQ6IGFjY2Vzc0lkLFxuXHRcdFx0R29vZ2xlU2VjcmV0S2V5OiBzZWNyZXQsXG5cdFx0XHRrZXkoZmlsZSwgbWV0YUNvbnRleHQpIHtcblx0XHRcdFx0Y29uc3QgaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdFx0Y29uc3QgcGF0aCA9IGAkeyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndW5pcXVlSUQnKSB9L3VwbG9hZHMvJHsgbWV0YUNvbnRleHQucmlkIH0vJHsgdGhpcy51c2VySWQgfS8keyBpZCB9YDtcblxuXHRcdFx0XHRjb25zdCB1cGxvYWQgPSB7XG5cdFx0XHRcdFx0X2lkOiBpZCxcblx0XHRcdFx0XHRyaWQ6IG1ldGFDb250ZXh0LnJpZCxcblx0XHRcdFx0XHRHb29nbGVTdG9yYWdlOiB7XG5cdFx0XHRcdFx0XHRwYXRoXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMuaW5zZXJ0RmlsZUluaXQodGhpcy51c2VySWQsICdHb29nbGVDbG91ZFN0b3JhZ2U6VXBsb2FkcycsIGZpbGUsIHVwbG9hZCk7XG5cblx0XHRcdFx0cmV0dXJuIHBhdGg7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRyeSB7XG5cdFx0XHRTbGluZ3Nob3QuY3JlYXRlRGlyZWN0aXZlKCdyb2NrZXRjaGF0LXVwbG9hZHMtZ3MnLCBTbGluZ3Nob3QuR29vZ2xlQ2xvdWQsIGNvbmZpZyk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5lcnJvcignRXJyb3IgY29uZmlndXJpbmcgR29vZ2xlQ2xvdWRTdG9yYWdlIC0+JywgZS5tZXNzYWdlKTtcblx0XHR9XG5cdH1cbn0sIDUwMCk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsIGNyZWF0ZUdvb2dsZVN0b3JhZ2VEaXJlY3RpdmUpO1xuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoL15GaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfLywgY3JlYXRlR29vZ2xlU3RvcmFnZURpcmVjdGl2ZSk7XG4iLCIvKiBnbG9iYWxzIEZpbGVVcGxvYWQgKi9cblxuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgeyBGaWxlVXBsb2FkQ2xhc3MgfSBmcm9tICcuLi9saWIvRmlsZVVwbG9hZCc7XG5pbXBvcnQgJy4uLy4uL3Vmcy9XZWJkYXYvc2VydmVyLmpzJztcblxuY29uc3QgZ2V0ID0gZnVuY3Rpb24oZmlsZSwgcmVxLCByZXMpIHtcblx0dGhpcy5zdG9yZS5nZXRSZWFkU3RyZWFtKGZpbGUuX2lkLCBmaWxlKS5waXBlKHJlcyk7XG59O1xuXG5jb25zdCBjb3B5ID0gZnVuY3Rpb24oZmlsZSwgb3V0KSB7XG5cdHRoaXMuc3RvcmUuZ2V0UmVhZFN0cmVhbShmaWxlLl9pZCwgZmlsZSkucGlwZShvdXQpO1xufTtcblxuY29uc3QgV2ViZGF2VXBsb2FkcyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnV2ViZGF2OlVwbG9hZHMnLFxuXHRnZXQsXG5cdGNvcHlcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xufSk7XG5cbmNvbnN0IFdlYmRhdkF2YXRhcnMgPSBuZXcgRmlsZVVwbG9hZENsYXNzKHtcblx0bmFtZTogJ1dlYmRhdjpBdmF0YXJzJyxcblx0Z2V0LFxuXHRjb3B5XG5cdC8vIHN0b3JlIHNldHRlZCBiZWxsb3dcbn0pO1xuXG5jb25zdCBXZWJkYXZVc2VyRGF0YUZpbGVzID0gbmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdXZWJkYXY6VXNlckRhdGFGaWxlcycsXG5cdGdldCxcblx0Y29weVxuXHQvLyBzdG9yZSBzZXR0ZWQgYmVsbG93XG59KTtcblxuY29uc3QgY29uZmlndXJlID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcblx0Y29uc3QgdXBsb2FkRm9sZGVyUGF0aCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1dlYmRhdl9VcGxvYWRfRm9sZGVyX1BhdGgnKTtcblx0Y29uc3Qgc2VydmVyID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfV2ViZGF2X1NlcnZlcl9VUkwnKTtcblx0Y29uc3QgdXNlcm5hbWUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9XZWJkYXZfVXNlcm5hbWUnKTtcblx0Y29uc3QgcGFzc3dvcmQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9XZWJkYXZfUGFzc3dvcmQnKTtcblxuXHRpZiAoIXNlcnZlciB8fCAhdXNlcm5hbWUgfHwgIXBhc3N3b3JkKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgY29uZmlnID0ge1xuXHRcdGNvbm5lY3Rpb246IHtcblx0XHRcdGNyZWRlbnRpYWxzOiB7XG5cdFx0XHRcdHNlcnZlcixcblx0XHRcdFx0dXNlcm5hbWUsXG5cdFx0XHRcdHBhc3N3b3JkXG5cdFx0XHR9XG5cdFx0fSxcblx0XHR1cGxvYWRGb2xkZXJQYXRoXG5cdH07XG5cblx0V2ViZGF2VXBsb2Fkcy5zdG9yZSA9IEZpbGVVcGxvYWQuY29uZmlndXJlVXBsb2Fkc1N0b3JlKCdXZWJkYXYnLCBXZWJkYXZVcGxvYWRzLm5hbWUsIGNvbmZpZyk7XG5cdFdlYmRhdkF2YXRhcnMuc3RvcmUgPSBGaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnV2ViZGF2JywgV2ViZGF2QXZhdGFycy5uYW1lLCBjb25maWcpO1xuXHRXZWJkYXZVc2VyRGF0YUZpbGVzLnN0b3JlID0gRmlsZVVwbG9hZC5jb25maWd1cmVVcGxvYWRzU3RvcmUoJ1dlYmRhdicsIFdlYmRhdlVzZXJEYXRhRmlsZXMubmFtZSwgY29uZmlnKTtcbn0sIDUwMCk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KC9eRmlsZVVwbG9hZF9XZWJkYXZfLywgY29uZmlndXJlKTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdGFzeW5jICdzZW5kRmlsZU1lc3NhZ2UnKHJvb21JZCwgc3RvcmUsIGZpbGUsIG1zZ0RhdGEgPSB7fSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdzZW5kRmlsZU1lc3NhZ2UnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIHJvb21JZCwgTWV0ZW9yLnVzZXJJZCgpKTtcblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNoZWNrKG1zZ0RhdGEsIHtcblx0XHRcdGF2YXRhcjogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdGVtb2ppOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdFx0YWxpYXM6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRncm91cGFibGU6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0bXNnOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG5cdFx0fSk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLnVwZGF0ZUZpbGVDb21wbGV0ZShmaWxlLl9pZCwgTWV0ZW9yLnVzZXJJZCgpLCBfLm9taXQoZmlsZSwgJ19pZCcpKTtcblxuXHRcdGNvbnN0IGZpbGVVcmwgPSBgL2ZpbGUtdXBsb2FkLyR7IGZpbGUuX2lkIH0vJHsgZW5jb2RlVVJJKGZpbGUubmFtZSkgfWA7XG5cblx0XHRjb25zdCBhdHRhY2htZW50ID0ge1xuXHRcdFx0dGl0bGU6IGZpbGUubmFtZSxcblx0XHRcdHR5cGU6ICdmaWxlJyxcblx0XHRcdGRlc2NyaXB0aW9uOiBmaWxlLmRlc2NyaXB0aW9uLFxuXHRcdFx0dGl0bGVfbGluazogZmlsZVVybCxcblx0XHRcdHRpdGxlX2xpbmtfZG93bmxvYWQ6IHRydWVcblx0XHR9O1xuXG5cdFx0aWYgKC9eaW1hZ2VcXC8uKy8udGVzdChmaWxlLnR5cGUpKSB7XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3VybCA9IGZpbGVVcmw7XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3R5cGUgPSBmaWxlLnR5cGU7XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3NpemUgPSBmaWxlLnNpemU7XG5cdFx0XHRpZiAoZmlsZS5pZGVudGlmeSAmJiBmaWxlLmlkZW50aWZ5LnNpemUpIHtcblx0XHRcdFx0YXR0YWNobWVudC5pbWFnZV9kaW1lbnNpb25zID0gZmlsZS5pZGVudGlmeS5zaXplO1xuXHRcdFx0fVxuXHRcdFx0YXR0YWNobWVudC5pbWFnZV9wcmV2aWV3ID0gYXdhaXQgRmlsZVVwbG9hZC5yZXNpemVJbWFnZVByZXZpZXcoZmlsZSk7XG5cdFx0fSBlbHNlIGlmICgvXmF1ZGlvXFwvLisvLnRlc3QoZmlsZS50eXBlKSkge1xuXHRcdFx0YXR0YWNobWVudC5hdWRpb191cmwgPSBmaWxlVXJsO1xuXHRcdFx0YXR0YWNobWVudC5hdWRpb190eXBlID0gZmlsZS50eXBlO1xuXHRcdFx0YXR0YWNobWVudC5hdWRpb19zaXplID0gZmlsZS5zaXplO1xuXHRcdH0gZWxzZSBpZiAoL152aWRlb1xcLy4rLy50ZXN0KGZpbGUudHlwZSkpIHtcblx0XHRcdGF0dGFjaG1lbnQudmlkZW9fdXJsID0gZmlsZVVybDtcblx0XHRcdGF0dGFjaG1lbnQudmlkZW9fdHlwZSA9IGZpbGUudHlwZTtcblx0XHRcdGF0dGFjaG1lbnQudmlkZW9fc2l6ZSA9IGZpbGUuc2l6ZTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcblx0XHRsZXQgbXNnID0gT2JqZWN0LmFzc2lnbih7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiByb29tSWQsXG5cdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdG1zZzogJycsXG5cdFx0XHRmaWxlOiB7XG5cdFx0XHRcdF9pZDogZmlsZS5faWQsXG5cdFx0XHRcdG5hbWU6IGZpbGUubmFtZSxcblx0XHRcdFx0dHlwZTogZmlsZS50eXBlXG5cdFx0XHR9LFxuXHRcdFx0Z3JvdXBhYmxlOiBmYWxzZSxcblx0XHRcdGF0dGFjaG1lbnRzOiBbYXR0YWNobWVudF1cblx0XHR9LCBtc2dEYXRhKTtcblxuXHRcdG1zZyA9IE1ldGVvci5jYWxsKCdzZW5kTWVzc2FnZScsIG1zZyk7XG5cblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4gUm9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdhZnRlckZpbGVVcGxvYWQnLCB7IHVzZXIsIHJvb20sIG1lc3NhZ2U6IG1zZyB9KSk7XG5cblx0XHRyZXR1cm4gbXNnO1xuXHR9XG59KTtcbiIsIi8qIGdsb2JhbHMgVXBsb2FkRlMgKi9cblxubGV0IHByb3RlY3RlZEZpbGVzO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9Qcm90ZWN0RmlsZXMnLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdHByb3RlY3RlZEZpbGVzID0gdmFsdWU7XG59KTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRnZXRTM0ZpbGVVcmwoZmlsZUlkKSB7XG5cdFx0aWYgKHByb3RlY3RlZEZpbGVzICYmICFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ3NlbmRGaWxlTWVzc2FnZScgfSk7XG5cdFx0fVxuXHRcdGNvbnN0IGZpbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmZpbmRPbmVCeUlkKGZpbGVJZCk7XG5cblx0XHRyZXR1cm4gVXBsb2FkRlMuZ2V0U3RvcmUoJ0FtYXpvblMzOlVwbG9hZHMnKS5nZXRSZWRpcmVjdFVSTChmaWxlKTtcblx0fVxufSk7XG4iLCJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdGaWxlVXBsb2FkJywgZnVuY3Rpb24oKSB7XG5cdHRoaXMuYWRkKCdGaWxlVXBsb2FkX0VuYWJsZWQnLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdHB1YmxpYzogdHJ1ZVxuXHR9KTtcblxuXHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9NYXhGaWxlU2l6ZScsIDEwNDg1NzYwMCwge1xuXHRcdHR5cGU6ICdpbnQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuRGVzY3JpcHRpb246ICdGaWxlVXBsb2FkX01heEZpbGVTaXplRGVzY3JpcHRpb24nXG5cdH0pO1xuXG5cdHRoaXMuYWRkKCdGaWxlVXBsb2FkX01lZGlhVHlwZVdoaXRlTGlzdCcsICdpbWFnZS8qLGF1ZGlvLyosdmlkZW8vKixhcHBsaWNhdGlvbi96aXAsYXBwbGljYXRpb24veC1yYXItY29tcHJlc3NlZCxhcHBsaWNhdGlvbi9wZGYsdGV4dC9wbGFpbixhcHBsaWNhdGlvbi9tc3dvcmQsYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwuZG9jdW1lbnQnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0ZpbGVVcGxvYWRfTWVkaWFUeXBlV2hpdGVMaXN0RGVzY3JpcHRpb24nXG5cdH0pO1xuXG5cdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1Byb3RlY3RGaWxlcycsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0ZpbGVVcGxvYWRfUHJvdGVjdEZpbGVzRGVzY3JpcHRpb24nXG5cdH0pO1xuXG5cdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsICdHcmlkRlMnLCB7XG5cdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0dmFsdWVzOiBbe1xuXHRcdFx0a2V5OiAnR3JpZEZTJyxcblx0XHRcdGkxOG5MYWJlbDogJ0dyaWRGUydcblx0XHR9LCB7XG5cdFx0XHRrZXk6ICdBbWF6b25TMycsXG5cdFx0XHRpMThuTGFiZWw6ICdBbWF6b25TMydcblx0XHR9LCB7XG5cdFx0XHRrZXk6ICdHb29nbGVDbG91ZFN0b3JhZ2UnLFxuXHRcdFx0aTE4bkxhYmVsOiAnR29vZ2xlQ2xvdWRTdG9yYWdlJ1xuXHRcdH0sIHtcblx0XHRcdGtleTogJ1dlYmRhdicsXG5cdFx0XHRpMThuTGFiZWw6ICdXZWJEQVYnXG5cdFx0fSwge1xuXHRcdFx0a2V5OiAnRmlsZVN5c3RlbScsXG5cdFx0XHRpMThuTGFiZWw6ICdGaWxlU3lzdGVtJ1xuXHRcdH1dLFxuXHRcdHB1YmxpYzogdHJ1ZVxuXHR9KTtcblxuXHR0aGlzLnNlY3Rpb24oJ0FtYXpvbiBTMycsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX0J1Y2tldCcsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdBbWF6b25TMydcblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TM19BY2wnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfUzNfQVdTQWNjZXNzS2V5SWQnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfUzNfQVdTU2VjcmV0QWNjZXNzS2V5JywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0FtYXpvblMzJ1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX0NETicsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdBbWF6b25TMydcblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TM19SZWdpb24nLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfUzNfQnVja2V0VVJMJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0FtYXpvblMzJ1xuXHRcdFx0fSxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ092ZXJyaWRlX1VSTF90b193aGljaF9maWxlc19hcmVfdXBsb2FkZWRfVGhpc191cmxfYWxzb191c2VkX2Zvcl9kb3dubG9hZHNfdW5sZXNzX2FfQ0ROX2lzX2dpdmVuLidcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TM19TaWduYXR1cmVWZXJzaW9uJywgJ3Y0Jywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfUzNfRm9yY2VQYXRoU3R5bGUnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0FtYXpvblMzJ1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX1VSTEV4cGlyeVRpbWVTcGFuJywgMTIwLCB7XG5cdFx0XHR0eXBlOiAnaW50Jyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdBbWF6b25TMydcblx0XHRcdH0sXG5cdFx0XHRpMThuRGVzY3JpcHRpb246ICdGaWxlVXBsb2FkX1MzX1VSTEV4cGlyeVRpbWVTcGFuX0Rlc2NyaXB0aW9uJ1xuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX1Byb3h5X0F2YXRhcnMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0FtYXpvblMzJ1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX1Byb3h5X1VwbG9hZHMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0FtYXpvblMzJ1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHR0aGlzLnNlY3Rpb24oJ0dvb2dsZSBDbG91ZCBTdG9yYWdlJywgZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9CdWNrZXQnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRwcml2YXRlOiB0cnVlLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0dvb2dsZUNsb3VkU3RvcmFnZSdcblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX0FjY2Vzc0lkJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0cHJpdmF0ZTogdHJ1ZSxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdHb29nbGVDbG91ZFN0b3JhZ2UnXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9TZWNyZXQnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRtdWx0aWxpbmU6IHRydWUsXG5cdFx0XHRwcml2YXRlOiB0cnVlLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0dvb2dsZUNsb3VkU3RvcmFnZSdcblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX1Byb3h5X0F2YXRhcnMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0dvb2dsZUNsb3VkU3RvcmFnZSdcblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX1Byb3h5X1VwbG9hZHMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0dvb2dsZUNsb3VkU3RvcmFnZSdcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0dGhpcy5zZWN0aW9uKCdGaWxlIFN5c3RlbScsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX0ZpbGVTeXN0ZW1QYXRoJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0ZpbGVTeXN0ZW0nXG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdHRoaXMuc2VjdGlvbignV2ViREFWJywgZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfV2ViZGF2X1VwbG9hZF9Gb2xkZXJfUGF0aCcsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdXZWJkYXYnXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfV2ViZGF2X1NlcnZlcl9VUkwnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnV2ViZGF2J1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1dlYmRhdl9Vc2VybmFtZScsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdXZWJkYXYnXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfV2ViZGF2X1Bhc3N3b3JkJywgJycsIHtcblx0XHRcdHR5cGU6ICdwYXNzd29yZCcsXG5cdFx0XHRwcml2YXRlOiB0cnVlLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ1dlYmRhdidcblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9XZWJkYXZfUHJveHlfQXZhdGFycycsIGZhbHNlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnV2ViZGF2J1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1dlYmRhdl9Qcm94eV9VcGxvYWRzJywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdXZWJkYXYnXG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdHRoaXMuYWRkKCdGaWxlVXBsb2FkX0VuYWJsZWRfRGlyZWN0JywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRwdWJsaWM6IHRydWVcblx0fSk7XG59KTtcbiIsImltcG9ydCB7VXBsb2FkRlN9IGZyb20gJ21ldGVvci9qYWxpazp1ZnMnO1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgUzMgZnJvbSAnYXdzLXNkay9jbGllbnRzL3MzJztcbmltcG9ydCBzdHJlYW0gZnJvbSAnc3RyZWFtJztcblxuLyoqXG4gKiBBbWF6b25TMyBzdG9yZVxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5leHBvcnQgY2xhc3MgQW1hem9uUzNTdG9yZSBleHRlbmRzIFVwbG9hZEZTLlN0b3JlIHtcblxuXHRjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG5cdFx0Ly8gRGVmYXVsdCBvcHRpb25zXG5cdFx0Ly8gb3B0aW9ucy5zZWNyZXRBY2Nlc3NLZXksXG5cdFx0Ly8gb3B0aW9ucy5hY2Nlc3NLZXlJZCxcblx0XHQvLyBvcHRpb25zLnJlZ2lvbixcblx0XHQvLyBvcHRpb25zLnNzbEVuYWJsZWQgLy8gb3B0aW9uYWxcblxuXHRcdG9wdGlvbnMgPSBfLmV4dGVuZCh7XG5cdFx0XHRodHRwT3B0aW9uczoge1xuXHRcdFx0XHR0aW1lb3V0OiA2MDAwLFxuXHRcdFx0XHRhZ2VudDogZmFsc2Vcblx0XHRcdH1cblx0XHR9LCBvcHRpb25zKTtcblxuXHRcdHN1cGVyKG9wdGlvbnMpO1xuXG5cdFx0Y29uc3QgY2xhc3NPcHRpb25zID0gb3B0aW9ucztcblxuXHRcdGNvbnN0IHMzID0gbmV3IFMzKG9wdGlvbnMuY29ubmVjdGlvbik7XG5cblx0XHRvcHRpb25zLmdldFBhdGggPSBvcHRpb25zLmdldFBhdGggfHwgZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0cmV0dXJuIGZpbGUuX2lkO1xuXHRcdH07XG5cblx0XHR0aGlzLmdldFBhdGggPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRpZiAoZmlsZS5BbWF6b25TMykge1xuXHRcdFx0XHRyZXR1cm4gZmlsZS5BbWF6b25TMy5wYXRoO1xuXHRcdFx0fVxuXHRcdFx0Ly8gQ29tcGF0aWJpbGl0eVxuXHRcdFx0Ly8gVE9ETzogTWlncmF0aW9uXG5cdFx0XHRpZiAoZmlsZS5zMykge1xuXHRcdFx0XHRyZXR1cm4gZmlsZS5zMy5wYXRoICsgZmlsZS5faWQ7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuZ2V0UmVkaXJlY3RVUkwgPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7XG5cdFx0XHRcdEtleTogdGhpcy5nZXRQYXRoKGZpbGUpLFxuXHRcdFx0XHRFeHBpcmVzOiBjbGFzc09wdGlvbnMuVVJMRXhwaXJ5VGltZVNwYW5cblx0XHRcdH07XG5cblx0XHRcdHJldHVybiBzMy5nZXRTaWduZWRVcmwoJ2dldE9iamVjdCcsIHBhcmFtcyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZXMgdGhlIGZpbGUgaW4gdGhlIGNvbGxlY3Rpb25cblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEBwYXJhbSBjYWxsYmFja1xuXHRcdCAqIEByZXR1cm4ge3N0cmluZ31cblx0XHQgKi9cblx0XHR0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRjaGVjayhmaWxlLCBPYmplY3QpO1xuXG5cdFx0XHRpZiAoZmlsZS5faWQgPT0gbnVsbCkge1xuXHRcdFx0XHRmaWxlLl9pZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRmaWxlLkFtYXpvblMzID0ge1xuXHRcdFx0XHRwYXRoOiB0aGlzLm9wdGlvbnMuZ2V0UGF0aChmaWxlKVxuXHRcdFx0fTtcblxuXHRcdFx0ZmlsZS5zdG9yZSA9IHRoaXMub3B0aW9ucy5uYW1lOyAvLyBhc3NpZ24gc3RvcmUgdG8gZmlsZVxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0Q29sbGVjdGlvbigpLmluc2VydChmaWxlLCBjYWxsYmFjayk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgdGhlIGZpbGVcblx0XHQgKiBAcGFyYW0gZmlsZUlkXG5cdFx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdFx0ICovXG5cdFx0dGhpcy5kZWxldGUgPSBmdW5jdGlvbihmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy5nZXRDb2xsZWN0aW9uKCkuZmluZE9uZSh7X2lkOiBmaWxlSWR9KTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHtcblx0XHRcdFx0S2V5OiB0aGlzLmdldFBhdGgoZmlsZSlcblx0XHRcdH07XG5cblx0XHRcdHMzLmRlbGV0ZU9iamVjdChwYXJhbXMsIChlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrKGVyciwgZGF0YSk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgZmlsZSByZWFkIHN0cmVhbVxuXHRcdCAqIEBwYXJhbSBmaWxlSWRcblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEBwYXJhbSBvcHRpb25zXG5cdFx0ICogQHJldHVybiB7Kn1cblx0XHQgKi9cblx0XHR0aGlzLmdldFJlYWRTdHJlYW0gPSBmdW5jdGlvbihmaWxlSWQsIGZpbGUsIG9wdGlvbnMgPSB7fSkge1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge1xuXHRcdFx0XHRLZXk6IHRoaXMuZ2V0UGF0aChmaWxlKVxuXHRcdFx0fTtcblxuXHRcdFx0aWYgKG9wdGlvbnMuc3RhcnQgJiYgb3B0aW9ucy5lbmQpIHtcblx0XHRcdFx0cGFyYW1zLlJhbmdlID0gYCR7IG9wdGlvbnMuc3RhcnQgfSAtICR7IG9wdGlvbnMuZW5kIH1gO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gczMuZ2V0T2JqZWN0KHBhcmFtcykuY3JlYXRlUmVhZFN0cmVhbSgpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBmaWxlIHdyaXRlIHN0cmVhbVxuXHRcdCAqIEBwYXJhbSBmaWxlSWRcblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEBwYXJhbSBvcHRpb25zXG5cdFx0ICogQHJldHVybiB7Kn1cblx0XHQgKi9cblx0XHR0aGlzLmdldFdyaXRlU3RyZWFtID0gZnVuY3Rpb24oZmlsZUlkLCBmaWxlLyosIG9wdGlvbnMqLykge1xuXHRcdFx0Y29uc3Qgd3JpdGVTdHJlYW0gPSBuZXcgc3RyZWFtLlBhc3NUaHJvdWdoKCk7XG5cdFx0XHR3cml0ZVN0cmVhbS5sZW5ndGggPSBmaWxlLnNpemU7XG5cblx0XHRcdHdyaXRlU3RyZWFtLm9uKCduZXdMaXN0ZW5lcicsIChldmVudCwgbGlzdGVuZXIpID0+IHtcblx0XHRcdFx0aWYgKGV2ZW50ID09PSAnZmluaXNoJykge1xuXHRcdFx0XHRcdHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuXHRcdFx0XHRcdFx0d3JpdGVTdHJlYW0ucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcblx0XHRcdFx0XHRcdHdyaXRlU3RyZWFtLm9uKCdyZWFsX2ZpbmlzaCcsIGxpc3RlbmVyKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHMzLnB1dE9iamVjdCh7XG5cdFx0XHRcdEtleTogdGhpcy5nZXRQYXRoKGZpbGUpLFxuXHRcdFx0XHRCb2R5OiB3cml0ZVN0cmVhbSxcblx0XHRcdFx0Q29udGVudFR5cGU6IGZpbGUudHlwZSxcblx0XHRcdFx0Q29udGVudERpc3Bvc2l0aW9uOiBgaW5saW5lOyBmaWxlbmFtZT1cIiR7IGVuY29kZVVSSShmaWxlLm5hbWUpIH1cImBcblxuXHRcdFx0fSwgKGVycm9yKSA9PiB7XG5cdFx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0d3JpdGVTdHJlYW0uZW1pdCgncmVhbF9maW5pc2gnKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gd3JpdGVTdHJlYW07XG5cdFx0fTtcblx0fVxufVxuXG4vLyBBZGQgc3RvcmUgdG8gVUZTIG5hbWVzcGFjZVxuVXBsb2FkRlMuc3RvcmUuQW1hem9uUzMgPSBBbWF6b25TM1N0b3JlO1xuIiwiaW1wb3J0IHtVcGxvYWRGU30gZnJvbSAnbWV0ZW9yL2phbGlrOnVmcyc7XG5pbXBvcnQgZ2NTdG9yYWdlIGZyb20gJ0Bnb29nbGUtY2xvdWQvc3RvcmFnZSc7XG5cbi8qKlxuICogR29vZ2xlU3RvcmFnZSBzdG9yZVxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5leHBvcnQgY2xhc3MgR29vZ2xlU3RvcmFnZVN0b3JlIGV4dGVuZHMgVXBsb2FkRlMuU3RvcmUge1xuXG5cdGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcblx0XHRzdXBlcihvcHRpb25zKTtcblxuXHRcdGNvbnN0IGdjcyA9IGdjU3RvcmFnZShvcHRpb25zLmNvbm5lY3Rpb24pO1xuXHRcdHRoaXMuYnVja2V0ID0gZ2NzLmJ1Y2tldChvcHRpb25zLmJ1Y2tldCk7XG5cblx0XHRvcHRpb25zLmdldFBhdGggPSBvcHRpb25zLmdldFBhdGggfHwgZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0cmV0dXJuIGZpbGUuX2lkO1xuXHRcdH07XG5cblx0XHR0aGlzLmdldFBhdGggPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRpZiAoZmlsZS5Hb29nbGVTdG9yYWdlKSB7XG5cdFx0XHRcdHJldHVybiBmaWxlLkdvb2dsZVN0b3JhZ2UucGF0aDtcblx0XHRcdH1cblx0XHRcdC8vIENvbXBhdGliaWxpdHlcblx0XHRcdC8vIFRPRE86IE1pZ3JhdGlvblxuXHRcdFx0aWYgKGZpbGUuZ29vZ2xlQ2xvdWRTdG9yYWdlKSB7XG5cdFx0XHRcdHJldHVybiBmaWxlLmdvb2dsZUNsb3VkU3RvcmFnZS5wYXRoICsgZmlsZS5faWQ7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuZ2V0UmVkaXJlY3RVUkwgPSBmdW5jdGlvbihmaWxlLCBjYWxsYmFjaykge1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge1xuXHRcdFx0XHRhY3Rpb246ICdyZWFkJyxcblx0XHRcdFx0cmVzcG9uc2VEaXNwb3NpdGlvbjogJ2lubGluZScsXG5cdFx0XHRcdGV4cGlyZXM6IERhdGUubm93KCkrdGhpcy5vcHRpb25zLlVSTEV4cGlyeVRpbWVTcGFuKjEwMDBcblx0XHRcdH07XG5cblx0XHRcdHRoaXMuYnVja2V0LmZpbGUodGhpcy5nZXRQYXRoKGZpbGUpKS5nZXRTaWduZWRVcmwocGFyYW1zLCBjYWxsYmFjayk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZXMgdGhlIGZpbGUgaW4gdGhlIGNvbGxlY3Rpb25cblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEBwYXJhbSBjYWxsYmFja1xuXHRcdCAqIEByZXR1cm4ge3N0cmluZ31cblx0XHQgKi9cblx0XHR0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRjaGVjayhmaWxlLCBPYmplY3QpO1xuXG5cdFx0XHRpZiAoZmlsZS5faWQgPT0gbnVsbCkge1xuXHRcdFx0XHRmaWxlLl9pZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRmaWxlLkdvb2dsZVN0b3JhZ2UgPSB7XG5cdFx0XHRcdHBhdGg6IHRoaXMub3B0aW9ucy5nZXRQYXRoKGZpbGUpXG5cdFx0XHR9O1xuXG5cdFx0XHRmaWxlLnN0b3JlID0gdGhpcy5vcHRpb25zLm5hbWU7IC8vIGFzc2lnbiBzdG9yZSB0byBmaWxlXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRDb2xsZWN0aW9uKCkuaW5zZXJ0KGZpbGUsIGNhbGxiYWNrKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlcyB0aGUgZmlsZVxuXHRcdCAqIEBwYXJhbSBmaWxlSWRcblx0XHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0XHQgKi9cblx0XHR0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLmdldENvbGxlY3Rpb24oKS5maW5kT25lKHtfaWQ6IGZpbGVJZH0pO1xuXHRcdFx0dGhpcy5idWNrZXQuZmlsZSh0aGlzLmdldFBhdGgoZmlsZSkpLmRlbGV0ZShmdW5jdGlvbihlcnIsIGRhdGEpIHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrKGVyciwgZGF0YSk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgZmlsZSByZWFkIHN0cmVhbVxuXHRcdCAqIEBwYXJhbSBmaWxlSWRcblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEBwYXJhbSBvcHRpb25zXG5cdFx0ICogQHJldHVybiB7Kn1cblx0XHQgKi9cblx0XHR0aGlzLmdldFJlYWRTdHJlYW0gPSBmdW5jdGlvbihmaWxlSWQsIGZpbGUsIG9wdGlvbnMgPSB7fSkge1xuXHRcdFx0Y29uc3QgY29uZmlnID0ge307XG5cblx0XHRcdGlmIChvcHRpb25zLnN0YXJ0ICE9IG51bGwpIHtcblx0XHRcdFx0Y29uZmlnLnN0YXJ0ID0gb3B0aW9ucy5zdGFydDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG9wdGlvbnMuZW5kICE9IG51bGwpIHtcblx0XHRcdFx0Y29uZmlnLmVuZCA9IG9wdGlvbnMuZW5kO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5idWNrZXQuZmlsZSh0aGlzLmdldFBhdGgoZmlsZSkpLmNyZWF0ZVJlYWRTdHJlYW0oY29uZmlnKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgZmlsZSB3cml0ZSBzdHJlYW1cblx0XHQgKiBAcGFyYW0gZmlsZUlkXG5cdFx0ICogQHBhcmFtIGZpbGVcblx0XHQgKiBAcGFyYW0gb3B0aW9uc1xuXHRcdCAqIEByZXR1cm4geyp9XG5cdFx0ICovXG5cdFx0dGhpcy5nZXRXcml0ZVN0cmVhbSA9IGZ1bmN0aW9uKGZpbGVJZCwgZmlsZS8qLCBvcHRpb25zKi8pIHtcblx0XHRcdHJldHVybiB0aGlzLmJ1Y2tldC5maWxlKHRoaXMuZ2V0UGF0aChmaWxlKSkuY3JlYXRlV3JpdGVTdHJlYW0oe1xuXHRcdFx0XHRnemlwOiBmYWxzZSxcblx0XHRcdFx0bWV0YWRhdGE6IHtcblx0XHRcdFx0XHRjb250ZW50VHlwZTogZmlsZS50eXBlLFxuXHRcdFx0XHRcdGNvbnRlbnREaXNwb3NpdGlvbjogYGlubGluZTsgZmlsZW5hbWU9JHsgZmlsZS5uYW1lIH1gXG5cdFx0XHRcdFx0Ly8gbWV0YWRhdGE6IHtcblx0XHRcdFx0XHQvLyBcdGN1c3RvbTogJ21ldGFkYXRhJ1xuXHRcdFx0XHRcdC8vIH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fTtcblx0fVxufVxuXG4vLyBBZGQgc3RvcmUgdG8gVUZTIG5hbWVzcGFjZVxuVXBsb2FkRlMuc3RvcmUuR29vZ2xlU3RvcmFnZSA9IEdvb2dsZVN0b3JhZ2VTdG9yZTtcbiIsImltcG9ydCB7VXBsb2FkRlN9IGZyb20gJ21ldGVvci9qYWxpazp1ZnMnO1xuaW1wb3J0IFdlYmRhdiBmcm9tICd3ZWJkYXYnO1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuLyoqXG4gKiBXZWJEQVYgc3RvcmVcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZXhwb3J0IGNsYXNzIFdlYmRhdlN0b3JlIGV4dGVuZHMgVXBsb2FkRlMuU3RvcmUge1xuXG5cdGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcblxuXHRcdHN1cGVyKG9wdGlvbnMpO1xuXG5cblx0XHRjb25zdCBjbGllbnQgPSBuZXcgV2ViZGF2KFxuXHRcdFx0b3B0aW9ucy5jb25uZWN0aW9uLmNyZWRlbnRpYWxzLnNlcnZlcixcblx0XHRcdG9wdGlvbnMuY29ubmVjdGlvbi5jcmVkZW50aWFscy51c2VybmFtZSxcblx0XHRcdG9wdGlvbnMuY29ubmVjdGlvbi5jcmVkZW50aWFscy5wYXNzd29yZCxcblx0XHQpO1xuXG5cdFx0b3B0aW9ucy5nZXRQYXRoID0gZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0aWYgKG9wdGlvbnMudXBsb2FkRm9sZGVyUGF0aFtvcHRpb25zLnVwbG9hZEZvbGRlclBhdGgubGVuZ3RoLTFdICE9PSAnLycpIHtcblx0XHRcdFx0b3B0aW9ucy51cGxvYWRGb2xkZXJQYXRoICs9ICcvJztcblx0XHRcdH1cblx0XHRcdHJldHVybiBvcHRpb25zLnVwbG9hZEZvbGRlclBhdGggKyBmaWxlLl9pZDtcblx0XHR9O1xuXG5cdFx0Y2xpZW50LnN0YXQob3B0aW9ucy51cGxvYWRGb2xkZXJQYXRoKS5jYXRjaChmdW5jdGlvbihlcnIpIHtcblx0XHRcdGlmIChlcnIuc3RhdHVzID09PSAnNDA0Jykge1xuXHRcdFx0XHRjbGllbnQuY3JlYXRlRGlyZWN0b3J5KG9wdGlvbnMudXBsb2FkRm9sZGVyUGF0aCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBmaWxlIHBhdGhcblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEByZXR1cm4ge3N0cmluZ31cblx0XHQgKi9cblx0XHR0aGlzLmdldFBhdGggPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRpZiAoZmlsZS5XZWJkYXYpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGUuV2ViZGF2LnBhdGg7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZXMgdGhlIGZpbGUgaW4gdGhlIGNvbCBsZWN0aW9uXG5cdFx0ICogQHBhcmFtIGZpbGVcblx0XHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0XHQgKiBAcmV0dXJuIHtzdHJpbmd9XG5cdFx0ICovXG5cdFx0dGhpcy5jcmVhdGUgPSBmdW5jdGlvbihmaWxlLCBjYWxsYmFjaykge1xuXHRcdFx0Y2hlY2soZmlsZSwgT2JqZWN0KTtcblxuXHRcdFx0aWYgKGZpbGUuX2lkID09IG51bGwpIHtcblx0XHRcdFx0ZmlsZS5faWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdH1cblxuXHRcdFx0ZmlsZS5XZWJkYXYgPSB7XG5cdFx0XHRcdHBhdGg6IG9wdGlvbnMuZ2V0UGF0aChmaWxlKVxuXHRcdFx0fTtcblxuXHRcdFx0ZmlsZS5zdG9yZSA9IHRoaXMub3B0aW9ucy5uYW1lO1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0Q29sbGVjdGlvbigpLmluc2VydChmaWxlLCBjYWxsYmFjayk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgdGhlIGZpbGVcblx0XHQgKiBAcGFyYW0gZmlsZUlkXG5cdFx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdFx0ICovXG5cdFx0dGhpcy5kZWxldGUgPSBmdW5jdGlvbihmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy5nZXRDb2xsZWN0aW9uKCkuZmluZE9uZSh7X2lkOiBmaWxlSWR9KTtcblx0XHRcdGNsaWVudC5kZWxldGVGaWxlKHRoaXMuZ2V0UGF0aChmaWxlKSwgKGVyciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FsbGJhY2sgJiYgY2FsbGJhY2soZXJyLCBkYXRhKTtcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBmaWxlIHJlYWQgc3RyZWFtXG5cdFx0ICogQHBhcmFtIGZpbGVJZFxuXHRcdCAqIEBwYXJhbSBmaWxlXG5cdFx0ICogQHBhcmFtIG9wdGlvbnNcblx0XHQgKiBAcmV0dXJuIHsqfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0UmVhZFN0cmVhbSA9IGZ1bmN0aW9uKGZpbGVJZCwgZmlsZSwgb3B0aW9ucyA9IHt9KSB7XG5cdFx0XHRjb25zdCByYW5nZSA9IHt9O1xuXG5cdFx0XHRpZiAob3B0aW9ucy5zdGFydCAhPSBudWxsKSB7XG5cdFx0XHRcdHJhbmdlLnN0YXJ0ID0gb3B0aW9ucy5zdGFydDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG9wdGlvbnMuZW5kICE9IG51bGwpIHtcblx0XHRcdFx0cmFuZ2UuZW5kID0gb3B0aW9ucy5lbmQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gY2xpZW50LmNyZWF0ZVJlYWRTdHJlYW0odGhpcy5nZXRQYXRoKGZpbGUpLCBvcHRpb25zKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgZmlsZSB3cml0ZSBzdHJlYW1cblx0XHQgKiBAcGFyYW0gZmlsZUlkXG5cdFx0ICogQHBhcmFtIGZpbGVcblx0XHQgKiBAcmV0dXJuIHsqfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0V3JpdGVTdHJlYW0gPSBmdW5jdGlvbihmaWxlSWQsIGZpbGUpIHtcblx0XHRcdGNvbnN0IHdyaXRlU3RyZWFtID0gbmV3IHN0cmVhbS5QYXNzVGhyb3VnaCgpO1xuXHRcdFx0Y29uc3Qgd2ViZGF2U3RyZWFtID0gY2xpZW50LmNyZWF0ZVdyaXRlU3RyZWFtKHRoaXMuZ2V0UGF0aChmaWxlKSk7XG5cblx0XHRcdC8vVE9ETyByZW1vdmUgdGltZW91dCB3aGVuIFVwbG9hZEZTIGJ1ZyByZXNvbHZlZFxuXHRcdFx0Y29uc3QgbmV3TGlzdGVuZXJDYWxsYmFjayA9IChldmVudCwgbGlzdGVuZXIpID0+IHtcblx0XHRcdFx0aWYgKGV2ZW50ID09PSAnZmluaXNoJykge1xuXHRcdFx0XHRcdHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuXHRcdFx0XHRcdFx0d3JpdGVTdHJlYW0ucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcblx0XHRcdFx0XHRcdHdyaXRlU3RyZWFtLnJlbW92ZUxpc3RlbmVyKCduZXdMaXN0ZW5lcicsIG5ld0xpc3RlbmVyQ2FsbGJhY2spO1xuXHRcdFx0XHRcdFx0d3JpdGVTdHJlYW0ub24oZXZlbnQsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KGxpc3RlbmVyLCA1MDApO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR3cml0ZVN0cmVhbS5vbignbmV3TGlzdGVuZXInLCBuZXdMaXN0ZW5lckNhbGxiYWNrKTtcblxuXHRcdFx0d3JpdGVTdHJlYW0ucGlwZSh3ZWJkYXZTdHJlYW0pO1xuXHRcdFx0cmV0dXJuIHdyaXRlU3RyZWFtO1xuXHRcdH07XG5cblx0fVxufVxuXG4vLyBBZGQgc3RvcmUgdG8gVUZTIG5hbWVzcGFjZVxuVXBsb2FkRlMuc3RvcmUuV2ViZGF2ID0gV2ViZGF2U3RvcmU7XG4iXX0=
