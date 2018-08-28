(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChatFile = Package['rocketchat:file'].RocketChatFile;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:user-data-download":{"server":{"startup":{"settings.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_user-data-download/server/startup/settings.js                                             //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
RocketChat.settings.addGroup('UserDataDownload', function () {
  this.add('UserData_EnableDownload', true, {
    type: 'boolean',
    public: true,
    i18nLabel: 'UserData_EnableDownload'
  });
  this.add('UserData_FileSystemPath', '', {
    type: 'string',
    public: true,
    i18nLabel: 'UserData_FileSystemPath'
  });
  this.add('UserData_FileSystemZipPath', '', {
    type: 'string',
    public: true,
    i18nLabel: 'UserData_FileSystemZipPath'
  });
  this.add('UserData_ProcessingFrequency', 15, {
    type: 'int',
    public: true,
    i18nLabel: 'UserData_ProcessingFrequency'
  });
  this.add('UserData_MessageLimitPerRequest', 100, {
    type: 'int',
    public: true,
    i18nLabel: 'UserData_MessageLimitPerRequest'
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cronProcessDownloads.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_user-data-download/server/cronProcessDownloads.js                                         //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let fs;
module.watch(require("fs"), {
  default(v) {
    fs = v;
  }

}, 0);
let path;
module.watch(require("path"), {
  default(v) {
    path = v;
  }

}, 1);
let archiver;
module.watch(require("archiver"), {
  default(v) {
    archiver = v;
  }

}, 2);
let zipFolder = '/tmp/zipFiles';

if (RocketChat.settings.get('UserData_FileSystemZipPath') != null) {
  if (RocketChat.settings.get('UserData_FileSystemZipPath').trim() !== '') {
    zipFolder = RocketChat.settings.get('UserData_FileSystemZipPath');
  }
}

let processingFrequency = 15;

if (RocketChat.settings.get('UserData_ProcessingFrequency') > 0) {
  processingFrequency = RocketChat.settings.get('UserData_ProcessingFrequency');
}

const startFile = function (fileName, content) {
  fs.writeFileSync(fileName, content);
};

const writeToFile = function (fileName, content) {
  fs.appendFileSync(fileName, content);
};

const createDir = function (folderName) {
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
  }
};

const loadUserSubscriptions = function (exportOperation) {
  exportOperation.roomList = [];
  const exportUserId = exportOperation.userId;
  const cursor = RocketChat.models.Subscriptions.findByUserId(exportUserId);
  cursor.forEach(subscription => {
    const roomId = subscription.rid;
    const roomData = RocketChat.models.Rooms.findOneById(roomId);
    let roomName = roomData.name ? roomData.name : roomId;
    let userId = null;

    if (subscription.t === 'd') {
      userId = roomId.replace(exportUserId, '');
      const userData = RocketChat.models.Users.findOneById(userId);

      if (userData) {
        roomName = userData.name;
      }
    }

    const fileName = exportOperation.fullExport ? roomId : roomName;
    const fileType = exportOperation.fullExport ? 'json' : 'html';
    const targetFile = `${fileName}.${fileType}`;
    exportOperation.roomList.push({
      roomId,
      roomName,
      userId,
      exportedCount: 0,
      status: 'pending',
      targetFile,
      type: subscription.t
    });
  });

  if (exportOperation.fullExport) {
    exportOperation.status = 'exporting-rooms';
  } else {
    exportOperation.status = 'exporting';
  }
};

const getAttachmentData = function (attachment) {
  const attachmentData = {
    type: attachment.type,
    title: attachment.title,
    title_link: attachment.title_link,
    image_url: attachment.image_url,
    audio_url: attachment.audio_url,
    video_url: attachment.video_url,
    message_link: attachment.message_link,
    image_type: attachment.image_type,
    image_size: attachment.image_size,
    video_size: attachment.video_size,
    video_type: attachment.video_type,
    audio_size: attachment.audio_size,
    audio_type: attachment.audio_type,
    url: null,
    remote: false,
    fileId: null,
    fileName: null
  };
  const url = attachment.title_link || attachment.image_url || attachment.audio_url || attachment.video_url || attachment.message_link;

  if (url) {
    attachmentData.url = url;
    const urlMatch = /\:\/\//.exec(url);

    if (urlMatch && urlMatch.length > 0) {
      attachmentData.remote = true;
    } else {
      const match = /^\/([^\/]+)\/([^\/]+)\/(.*)/.exec(url);

      if (match && match[2]) {
        const file = RocketChat.models.Uploads.findOneById(match[2]);

        if (file) {
          attachmentData.fileId = file._id;
          attachmentData.fileName = file.name;
        }
      }
    }
  }

  return attachmentData;
};

const addToFileList = function (exportOperation, attachment) {
  const targetFile = path.join(exportOperation.assetsPath, `${attachment.fileId}-${attachment.fileName}`);
  const attachmentData = {
    url: attachment.url,
    copied: false,
    remote: attachment.remote,
    fileId: attachment.fileId,
    fileName: attachment.fileName,
    targetFile
  };
  exportOperation.fileList.push(attachmentData);
};

const getMessageData = function (msg, exportOperation) {
  const attachments = [];

  if (msg.attachments) {
    msg.attachments.forEach(attachment => {
      const attachmentData = getAttachmentData(attachment);
      attachments.push(attachmentData);
      addToFileList(exportOperation, attachmentData);
    });
  }

  const messageObject = {
    msg: msg.msg,
    username: msg.u.username,
    ts: msg.ts
  };

  if (attachments && attachments.length > 0) {
    messageObject.attachments = attachments;
  }

  if (msg.t) {
    messageObject.type = msg.t;
  }

  if (msg.u.name) {
    messageObject.name = msg.u.name;
  }

  return messageObject;
};

const copyFile = function (exportOperation, attachmentData) {
  if (attachmentData.copied || attachmentData.remote || !attachmentData.fileId) {
    attachmentData.copied = true;
    return;
  }

  const file = RocketChat.models.Uploads.findOneById(attachmentData.fileId);

  if (file) {
    if (FileUpload.copy(file, attachmentData.targetFile)) {
      attachmentData.copied = true;
    }
  }
};

const continueExportingRoom = function (exportOperation, exportOpRoomData) {
  createDir(exportOperation.exportPath);
  createDir(exportOperation.assetsPath);
  const filePath = path.join(exportOperation.exportPath, exportOpRoomData.targetFile);

  if (exportOpRoomData.status === 'pending') {
    exportOpRoomData.status = 'exporting';
    startFile(filePath, '');

    if (!exportOperation.fullExport) {
      writeToFile(filePath, '<meta http-equiv="content-type" content="text/html; charset=utf-8">');
    }
  }

  let limit = 100;

  if (RocketChat.settings.get('UserData_MessageLimitPerRequest') > 0) {
    limit = RocketChat.settings.get('UserData_MessageLimitPerRequest');
  }

  const skip = exportOpRoomData.exportedCount;
  const cursor = RocketChat.models.Messages.findByRoomId(exportOpRoomData.roomId, {
    limit,
    skip
  });
  const count = cursor.count();
  cursor.forEach(msg => {
    const messageObject = getMessageData(msg, exportOperation);

    if (exportOperation.fullExport) {
      const messageString = JSON.stringify(messageObject);
      writeToFile(filePath, `${messageString}\n`);
    } else {
      const messageType = msg.t;
      const userName = msg.u.username || msg.u.name;
      const timestamp = msg.ts ? new Date(msg.ts).toUTCString() : '';
      let message = msg.msg;

      switch (messageType) {
        case 'uj':
          message = TAPi18n.__('User_joined_channel');
          break;

        case 'ul':
          message = TAPi18n.__('User_left');
          break;

        case 'au':
          message = TAPi18n.__('User_added_by', {
            user_added: msg.msg,
            user_by: msg.u.username
          });
          break;

        case 'r':
          message = TAPi18n.__('Room_name_changed', {
            room_name: msg.msg,
            user_by: msg.u.username
          });
          break;

        case 'ru':
          message = TAPi18n.__('User_removed_by', {
            user_removed: msg.msg,
            user_by: msg.u.username
          });
          break;

        case 'wm':
          message = TAPi18n.__('Welcome', {
            user: msg.u.username
          });
          break;

        case 'livechat-close':
          message = TAPi18n.__('Conversation_finished');
          break;
      }

      if (message !== msg.msg) {
        message = `<i>${message}</i>`;
      }

      writeToFile(filePath, `<p><strong>${userName}</strong> (${timestamp}):<br/>`);
      writeToFile(filePath, message);

      if (messageObject.attachments && messageObject.attachments.length > 0) {
        messageObject.attachments.forEach(attachment => {
          if (attachment.type === 'file') {
            const description = attachment.description || attachment.title || TAPi18n.__('Message_Attachments');

            const assetUrl = `./assets/${attachment.fileId}-${attachment.fileName}`;
            const link = `<br/><a href="${assetUrl}">${description}</a>`;
            writeToFile(filePath, link);
          }
        });
      }

      writeToFile(filePath, '</p>');
    }

    exportOpRoomData.exportedCount++;
  });

  if (count <= exportOpRoomData.exportedCount) {
    exportOpRoomData.status = 'completed';
    return true;
  }

  return false;
};

const isExportComplete = function (exportOperation) {
  const incomplete = exportOperation.roomList.some(exportOpRoomData => exportOpRoomData.status !== 'completed');
  return !incomplete;
};

const isDownloadFinished = function (exportOperation) {
  const anyDownloadPending = exportOperation.fileList.some(fileData => !fileData.copied && !fileData.remote);
  return !anyDownloadPending;
};

const sendEmail = function (userId) {
  const lastFile = RocketChat.models.UserDataFiles.findLastFileByUser(userId);

  if (lastFile) {
    const userData = RocketChat.models.Users.findOneById(userId);

    if (userData && userData.emails && userData.emails[0] && userData.emails[0].address) {
      const emailAddress = `${userData.name} <${userData.emails[0].address}>`;
      const fromAddress = RocketChat.settings.get('From_Email');

      const subject = TAPi18n.__('UserDataDownload_EmailSubject');

      const download_link = lastFile.url;

      const body = TAPi18n.__('UserDataDownload_EmailBody', {
        download_link
      });

      const rfcMailPatternWithName = /^(?:.*<)?([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)(?:>?)$/;

      if (rfcMailPatternWithName.test(emailAddress)) {
        Meteor.defer(function () {
          return Email.send({
            to: emailAddress,
            from: fromAddress,
            subject,
            html: body
          });
        });
        return console.log(`Sending email to ${emailAddress}`);
      }
    }
  }
};

const makeZipFile = function (exportOperation) {
  createDir(zipFolder);
  const targetFile = path.join(zipFolder, `${exportOperation.userId}.zip`);

  if (fs.existsSync(targetFile)) {
    exportOperation.status = 'uploading';
    return;
  }

  const output = fs.createWriteStream(targetFile);
  exportOperation.generatedFile = targetFile;
  const archive = archiver('zip');
  output.on('close', () => {});
  archive.on('error', err => {
    throw err;
  });
  archive.pipe(output);
  archive.directory(exportOperation.exportPath, false);
  archive.finalize();
};

const uploadZipFile = function (exportOperation, callback) {
  const userDataStore = FileUpload.getStore('UserDataFiles');
  const filePath = exportOperation.generatedFile;
  const stat = Meteor.wrapAsync(fs.stat)(filePath);
  const stream = fs.createReadStream(filePath);
  const contentType = 'application/zip';
  const {
    size
  } = stat;
  const {
    userId
  } = exportOperation;
  const user = RocketChat.models.Users.findOneById(userId);
  const userDisplayName = user ? user.name : userId;
  const utcDate = new Date().toISOString().split('T')[0];
  const newFileName = encodeURIComponent(`${utcDate}-${userDisplayName}.zip`);
  const details = {
    userId,
    type: contentType,
    size,
    name: newFileName
  };
  userDataStore.insert(details, stream, err => {
    if (err) {
      throw new Meteor.Error('invalid-file', 'Invalid Zip File', {
        method: 'cronProcessDownloads.uploadZipFile'
      });
    } else {
      callback();
    }
  });
};

const generateChannelsFile = function (exportOperation) {
  if (exportOperation.fullExport) {
    const fileName = path.join(exportOperation.exportPath, 'channels.json');
    startFile(fileName, '');
    exportOperation.roomList.forEach(roomData => {
      const newRoomData = {
        roomId: roomData.roomId,
        roomName: roomData.roomName,
        type: roomData.type
      };
      const messageString = JSON.stringify(newRoomData);
      writeToFile(fileName, `${messageString}\n`);
    });
  }

  exportOperation.status = 'exporting';
};

const continueExportOperation = function (exportOperation) {
  if (exportOperation.status === 'completed') {
    return;
  }

  if (!exportOperation.roomList) {
    loadUserSubscriptions(exportOperation);
  }

  try {
    if (exportOperation.status === 'exporting-rooms') {
      generateChannelsFile(exportOperation);
    } // Run every room on every request, to avoid missing new messages on the rooms that finished first.


    if (exportOperation.status === 'exporting') {
      exportOperation.roomList.forEach(exportOpRoomData => {
        continueExportingRoom(exportOperation, exportOpRoomData);
      });

      if (isExportComplete(exportOperation)) {
        exportOperation.status = 'downloading';
        return;
      }
    }

    if (exportOperation.status === 'downloading') {
      exportOperation.fileList.forEach(attachmentData => {
        copyFile(exportOperation, attachmentData);
      });

      if (isDownloadFinished(exportOperation)) {
        const targetFile = path.join(zipFolder, `${exportOperation.userId}.zip`);

        if (fs.existsSync(targetFile)) {
          fs.unlinkSync(targetFile);
        }

        exportOperation.status = 'compressing';
        return;
      }
    }

    if (exportOperation.status === 'compressing') {
      makeZipFile(exportOperation);
      return;
    }

    if (exportOperation.status === 'uploading') {
      uploadZipFile(exportOperation, () => {
        exportOperation.status = 'completed';
        RocketChat.models.ExportOperations.updateOperation(exportOperation);
      });
      return;
    }
  } catch (e) {
    console.error(e);
  }
};

function processDataDownloads() {
  const cursor = RocketChat.models.ExportOperations.findAllPending({
    limit: 1
  });
  cursor.forEach(exportOperation => {
    if (exportOperation.status === 'completed') {
      return;
    }

    continueExportOperation(exportOperation);
    RocketChat.models.ExportOperations.updateOperation(exportOperation);

    if (exportOperation.status === 'completed') {
      sendEmail(exportOperation.userId);
    }
  });
}

Meteor.startup(function () {
  Meteor.defer(function () {
    processDataDownloads();
    SyncedCron.add({
      name: 'Generate download files for user data',
      schedule: parser => parser.cron(`*/${processingFrequency} * * * *`),
      job: processDataDownloads
    });
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:user-data-download/server/startup/settings.js");
require("/node_modules/meteor/rocketchat:user-data-download/server/cronProcessDownloads.js");

/* Exports */
Package._define("rocketchat:user-data-download");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_user-data-download.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp1c2VyLWRhdGEtZG93bmxvYWQvc2VydmVyL3N0YXJ0dXAvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dXNlci1kYXRhLWRvd25sb2FkL3NlcnZlci9jcm9uUHJvY2Vzc0Rvd25sb2Fkcy5qcyJdLCJuYW1lcyI6WyJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGRHcm91cCIsImFkZCIsInR5cGUiLCJwdWJsaWMiLCJpMThuTGFiZWwiLCJmcyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwicGF0aCIsImFyY2hpdmVyIiwiemlwRm9sZGVyIiwiZ2V0IiwidHJpbSIsInByb2Nlc3NpbmdGcmVxdWVuY3kiLCJzdGFydEZpbGUiLCJmaWxlTmFtZSIsImNvbnRlbnQiLCJ3cml0ZUZpbGVTeW5jIiwid3JpdGVUb0ZpbGUiLCJhcHBlbmRGaWxlU3luYyIsImNyZWF0ZURpciIsImZvbGRlck5hbWUiLCJleGlzdHNTeW5jIiwibWtkaXJTeW5jIiwibG9hZFVzZXJTdWJzY3JpcHRpb25zIiwiZXhwb3J0T3BlcmF0aW9uIiwicm9vbUxpc3QiLCJleHBvcnRVc2VySWQiLCJ1c2VySWQiLCJjdXJzb3IiLCJtb2RlbHMiLCJTdWJzY3JpcHRpb25zIiwiZmluZEJ5VXNlcklkIiwiZm9yRWFjaCIsInN1YnNjcmlwdGlvbiIsInJvb21JZCIsInJpZCIsInJvb21EYXRhIiwiUm9vbXMiLCJmaW5kT25lQnlJZCIsInJvb21OYW1lIiwibmFtZSIsInQiLCJyZXBsYWNlIiwidXNlckRhdGEiLCJVc2VycyIsImZ1bGxFeHBvcnQiLCJmaWxlVHlwZSIsInRhcmdldEZpbGUiLCJwdXNoIiwiZXhwb3J0ZWRDb3VudCIsInN0YXR1cyIsImdldEF0dGFjaG1lbnREYXRhIiwiYXR0YWNobWVudCIsImF0dGFjaG1lbnREYXRhIiwidGl0bGUiLCJ0aXRsZV9saW5rIiwiaW1hZ2VfdXJsIiwiYXVkaW9fdXJsIiwidmlkZW9fdXJsIiwibWVzc2FnZV9saW5rIiwiaW1hZ2VfdHlwZSIsImltYWdlX3NpemUiLCJ2aWRlb19zaXplIiwidmlkZW9fdHlwZSIsImF1ZGlvX3NpemUiLCJhdWRpb190eXBlIiwidXJsIiwicmVtb3RlIiwiZmlsZUlkIiwidXJsTWF0Y2giLCJleGVjIiwibGVuZ3RoIiwibWF0Y2giLCJmaWxlIiwiVXBsb2FkcyIsIl9pZCIsImFkZFRvRmlsZUxpc3QiLCJqb2luIiwiYXNzZXRzUGF0aCIsImNvcGllZCIsImZpbGVMaXN0IiwiZ2V0TWVzc2FnZURhdGEiLCJtc2ciLCJhdHRhY2htZW50cyIsIm1lc3NhZ2VPYmplY3QiLCJ1c2VybmFtZSIsInUiLCJ0cyIsImNvcHlGaWxlIiwiRmlsZVVwbG9hZCIsImNvcHkiLCJjb250aW51ZUV4cG9ydGluZ1Jvb20iLCJleHBvcnRPcFJvb21EYXRhIiwiZXhwb3J0UGF0aCIsImZpbGVQYXRoIiwibGltaXQiLCJza2lwIiwiTWVzc2FnZXMiLCJmaW5kQnlSb29tSWQiLCJjb3VudCIsIm1lc3NhZ2VTdHJpbmciLCJKU09OIiwic3RyaW5naWZ5IiwibWVzc2FnZVR5cGUiLCJ1c2VyTmFtZSIsInRpbWVzdGFtcCIsIkRhdGUiLCJ0b1VUQ1N0cmluZyIsIm1lc3NhZ2UiLCJUQVBpMThuIiwiX18iLCJ1c2VyX2FkZGVkIiwidXNlcl9ieSIsInJvb21fbmFtZSIsInVzZXJfcmVtb3ZlZCIsInVzZXIiLCJkZXNjcmlwdGlvbiIsImFzc2V0VXJsIiwibGluayIsImlzRXhwb3J0Q29tcGxldGUiLCJpbmNvbXBsZXRlIiwic29tZSIsImlzRG93bmxvYWRGaW5pc2hlZCIsImFueURvd25sb2FkUGVuZGluZyIsImZpbGVEYXRhIiwic2VuZEVtYWlsIiwibGFzdEZpbGUiLCJVc2VyRGF0YUZpbGVzIiwiZmluZExhc3RGaWxlQnlVc2VyIiwiZW1haWxzIiwiYWRkcmVzcyIsImVtYWlsQWRkcmVzcyIsImZyb21BZGRyZXNzIiwic3ViamVjdCIsImRvd25sb2FkX2xpbmsiLCJib2R5IiwicmZjTWFpbFBhdHRlcm5XaXRoTmFtZSIsInRlc3QiLCJNZXRlb3IiLCJkZWZlciIsIkVtYWlsIiwic2VuZCIsInRvIiwiZnJvbSIsImh0bWwiLCJjb25zb2xlIiwibG9nIiwibWFrZVppcEZpbGUiLCJvdXRwdXQiLCJjcmVhdGVXcml0ZVN0cmVhbSIsImdlbmVyYXRlZEZpbGUiLCJhcmNoaXZlIiwib24iLCJlcnIiLCJwaXBlIiwiZGlyZWN0b3J5IiwiZmluYWxpemUiLCJ1cGxvYWRaaXBGaWxlIiwiY2FsbGJhY2siLCJ1c2VyRGF0YVN0b3JlIiwiZ2V0U3RvcmUiLCJzdGF0Iiwid3JhcEFzeW5jIiwic3RyZWFtIiwiY3JlYXRlUmVhZFN0cmVhbSIsImNvbnRlbnRUeXBlIiwic2l6ZSIsInVzZXJEaXNwbGF5TmFtZSIsInV0Y0RhdGUiLCJ0b0lTT1N0cmluZyIsInNwbGl0IiwibmV3RmlsZU5hbWUiLCJlbmNvZGVVUklDb21wb25lbnQiLCJkZXRhaWxzIiwiaW5zZXJ0IiwiRXJyb3IiLCJtZXRob2QiLCJnZW5lcmF0ZUNoYW5uZWxzRmlsZSIsIm5ld1Jvb21EYXRhIiwiY29udGludWVFeHBvcnRPcGVyYXRpb24iLCJ1bmxpbmtTeW5jIiwiRXhwb3J0T3BlcmF0aW9ucyIsInVwZGF0ZU9wZXJhdGlvbiIsImUiLCJlcnJvciIsInByb2Nlc3NEYXRhRG93bmxvYWRzIiwiZmluZEFsbFBlbmRpbmciLCJzdGFydHVwIiwiU3luY2VkQ3JvbiIsInNjaGVkdWxlIiwicGFyc2VyIiwiY3JvbiIsImpvYiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsV0FBV0MsUUFBWCxDQUFvQkMsUUFBcEIsQ0FBNkIsa0JBQTdCLEVBQWlELFlBQVc7QUFFM0QsT0FBS0MsR0FBTCxDQUFTLHlCQUFULEVBQW9DLElBQXBDLEVBQTBDO0FBQ3pDQyxVQUFNLFNBRG1DO0FBRXpDQyxZQUFRLElBRmlDO0FBR3pDQyxlQUFXO0FBSDhC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O0FBRURpSSw0QkFBd0IzSixlQUF4QjtBQUNBOUIsZUFBV21DLE1BQVgsQ0FBa0J3SixnQkFBbEIsQ0FBbUNDLGVBQW5DLENBQW1EOUosZUFBbkQ7O0FBRUEsUUFBSUEsZ0JBQWdCMEIsTUFBaEIsS0FBMkIsV0FBL0IsRUFBNEM7QUFDM0MyRSxnQkFBVXJHLGdCQUFnQkcsTUFBMUI7QUFDQTtBQUNELEdBWEQ7QUFZQTs7QUFFRCtHLE9BQU9pRCxPQUFQLENBQWUsWUFBVztBQUN6QmpELFNBQU9DLEtBQVAsQ0FBYSxZQUFXO0FBQ3ZCOEM7QUFFQUcsZUFBVy9MLEdBQVgsQ0FBZTtBQUNkMkMsWUFBTSx1Q0FEUTtBQUVkcUosZ0JBQVdDLE1BQUQsSUFBWUEsT0FBT0MsSUFBUCxDQUFhLEtBQUtuTCxtQkFBcUIsVUFBdkMsQ0FGUjtBQUdkb0wsV0FBS1A7QUFIUyxLQUFmO0FBS0EsR0FSRDtBQVNBLENBVkQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF91c2VyLWRhdGEtZG93bmxvYWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdVc2VyRGF0YURvd25sb2FkJywgZnVuY3Rpb24oKSB7XG5cblx0dGhpcy5hZGQoJ1VzZXJEYXRhX0VuYWJsZURvd25sb2FkJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnVXNlckRhdGFfRW5hYmxlRG93bmxvYWQnLFxuXHR9KTtcblxuXHR0aGlzLmFkZCgnVXNlckRhdGFfRmlsZVN5c3RlbVBhdGgnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdVc2VyRGF0YV9GaWxlU3lzdGVtUGF0aCcsXG5cdH0pO1xuXG5cdHRoaXMuYWRkKCdVc2VyRGF0YV9GaWxlU3lzdGVtWmlwUGF0aCcsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ1VzZXJEYXRhX0ZpbGVTeXN0ZW1aaXBQYXRoJyxcblx0fSk7XG5cblx0dGhpcy5hZGQoJ1VzZXJEYXRhX1Byb2Nlc3NpbmdGcmVxdWVuY3knLCAxNSwge1xuXHRcdHR5cGU6ICdpbnQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdVc2VyRGF0YV9Qcm9jZXNzaW5nRnJlcXVlbmN5Jyxcblx0fSk7XG5cblx0dGhpcy5hZGQoJ1VzZXJEYXRhX01lc3NhZ2VMaW1pdFBlclJlcXVlc3QnLCAxMDAsIHtcblx0XHR0eXBlOiAnaW50Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnVXNlckRhdGFfTWVzc2FnZUxpbWl0UGVyUmVxdWVzdCcsXG5cdH0pO1xuXG5cbn0pO1xuIiwiLyogZ2xvYmFscyBTeW5jZWRDcm9uICovXG5cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBhcmNoaXZlciBmcm9tICdhcmNoaXZlcic7XG5cbmxldCB6aXBGb2xkZXIgPSAnL3RtcC96aXBGaWxlcyc7XG5pZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VzZXJEYXRhX0ZpbGVTeXN0ZW1aaXBQYXRoJykgIT0gbnVsbCkge1xuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VzZXJEYXRhX0ZpbGVTeXN0ZW1aaXBQYXRoJykudHJpbSgpICE9PSAnJykge1xuXHRcdHppcEZvbGRlciA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdVc2VyRGF0YV9GaWxlU3lzdGVtWmlwUGF0aCcpO1xuXHR9XG59XG5cbmxldCBwcm9jZXNzaW5nRnJlcXVlbmN5ID0gMTU7XG5pZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VzZXJEYXRhX1Byb2Nlc3NpbmdGcmVxdWVuY3knKSA+IDApIHtcblx0cHJvY2Vzc2luZ0ZyZXF1ZW5jeSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdVc2VyRGF0YV9Qcm9jZXNzaW5nRnJlcXVlbmN5Jyk7XG59XG5cbmNvbnN0IHN0YXJ0RmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lLCBjb250ZW50KSB7XG5cdGZzLndyaXRlRmlsZVN5bmMoZmlsZU5hbWUsIGNvbnRlbnQpO1xufTtcblxuY29uc3Qgd3JpdGVUb0ZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZSwgY29udGVudCkge1xuXHRmcy5hcHBlbmRGaWxlU3luYyhmaWxlTmFtZSwgY29udGVudCk7XG59O1xuXG5jb25zdCBjcmVhdGVEaXIgPSBmdW5jdGlvbihmb2xkZXJOYW1lKSB7XG5cdGlmICghZnMuZXhpc3RzU3luYyhmb2xkZXJOYW1lKSkge1xuXHRcdGZzLm1rZGlyU3luYyhmb2xkZXJOYW1lKTtcblx0fVxufTtcblxuY29uc3QgbG9hZFVzZXJTdWJzY3JpcHRpb25zID0gZnVuY3Rpb24oZXhwb3J0T3BlcmF0aW9uKSB7XG5cdGV4cG9ydE9wZXJhdGlvbi5yb29tTGlzdCA9IFtdO1xuXG5cdGNvbnN0IGV4cG9ydFVzZXJJZCA9IGV4cG9ydE9wZXJhdGlvbi51c2VySWQ7XG5cdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5VXNlcklkKGV4cG9ydFVzZXJJZCk7XG5cdGN1cnNvci5mb3JFYWNoKChzdWJzY3JpcHRpb24pID0+IHtcblx0XHRjb25zdCByb29tSWQgPSBzdWJzY3JpcHRpb24ucmlkO1xuXHRcdGNvbnN0IHJvb21EYXRhID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUlkKTtcblx0XHRsZXQgcm9vbU5hbWUgPSByb29tRGF0YS5uYW1lID8gcm9vbURhdGEubmFtZSA6IHJvb21JZDtcblx0XHRsZXQgdXNlcklkID0gbnVsbDtcblxuXHRcdGlmIChzdWJzY3JpcHRpb24udCA9PT0gJ2QnKSB7XG5cdFx0XHR1c2VySWQgPSByb29tSWQucmVwbGFjZShleHBvcnRVc2VySWQsICcnKTtcblx0XHRcdGNvbnN0IHVzZXJEYXRhID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkKTtcblxuXHRcdFx0aWYgKHVzZXJEYXRhKSB7XG5cdFx0XHRcdHJvb21OYW1lID0gdXNlckRhdGEubmFtZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCBmaWxlTmFtZSA9IGV4cG9ydE9wZXJhdGlvbi5mdWxsRXhwb3J0ID8gcm9vbUlkIDogcm9vbU5hbWU7XG5cdFx0Y29uc3QgZmlsZVR5cGUgPSBleHBvcnRPcGVyYXRpb24uZnVsbEV4cG9ydCA/ICdqc29uJyA6ICdodG1sJztcblx0XHRjb25zdCB0YXJnZXRGaWxlID0gYCR7IGZpbGVOYW1lIH0uJHsgZmlsZVR5cGUgfWA7XG5cblx0XHRleHBvcnRPcGVyYXRpb24ucm9vbUxpc3QucHVzaCh7XG5cdFx0XHRyb29tSWQsXG5cdFx0XHRyb29tTmFtZSxcblx0XHRcdHVzZXJJZCxcblx0XHRcdGV4cG9ydGVkQ291bnQ6IDAsXG5cdFx0XHRzdGF0dXM6ICdwZW5kaW5nJyxcblx0XHRcdHRhcmdldEZpbGUsXG5cdFx0XHR0eXBlOiBzdWJzY3JpcHRpb24udCxcblx0XHR9KTtcblx0fSk7XG5cblx0aWYgKGV4cG9ydE9wZXJhdGlvbi5mdWxsRXhwb3J0KSB7XG5cdFx0ZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9ICdleHBvcnRpbmctcm9vbXMnO1xuXHR9IGVsc2Uge1xuXHRcdGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPSAnZXhwb3J0aW5nJztcblx0fVxufTtcblxuY29uc3QgZ2V0QXR0YWNobWVudERhdGEgPSBmdW5jdGlvbihhdHRhY2htZW50KSB7XG5cdGNvbnN0IGF0dGFjaG1lbnREYXRhID0ge1xuXHRcdHR5cGUgOiBhdHRhY2htZW50LnR5cGUsXG5cdFx0dGl0bGU6IGF0dGFjaG1lbnQudGl0bGUsXG5cdFx0dGl0bGVfbGluazogYXR0YWNobWVudC50aXRsZV9saW5rLFxuXHRcdGltYWdlX3VybDogYXR0YWNobWVudC5pbWFnZV91cmwsXG5cdFx0YXVkaW9fdXJsOiBhdHRhY2htZW50LmF1ZGlvX3VybCxcblx0XHR2aWRlb191cmw6IGF0dGFjaG1lbnQudmlkZW9fdXJsLFxuXHRcdG1lc3NhZ2VfbGluazogYXR0YWNobWVudC5tZXNzYWdlX2xpbmssXG5cdFx0aW1hZ2VfdHlwZTogYXR0YWNobWVudC5pbWFnZV90eXBlLFxuXHRcdGltYWdlX3NpemU6IGF0dGFjaG1lbnQuaW1hZ2Vfc2l6ZSxcblx0XHR2aWRlb19zaXplOiBhdHRhY2htZW50LnZpZGVvX3NpemUsXG5cdFx0dmlkZW9fdHlwZTogYXR0YWNobWVudC52aWRlb190eXBlLFxuXHRcdGF1ZGlvX3NpemU6IGF0dGFjaG1lbnQuYXVkaW9fc2l6ZSxcblx0XHRhdWRpb190eXBlOiBhdHRhY2htZW50LmF1ZGlvX3R5cGUsXG5cdFx0dXJsOiBudWxsLFxuXHRcdHJlbW90ZTogZmFsc2UsXG5cdFx0ZmlsZUlkOiBudWxsLFxuXHRcdGZpbGVOYW1lOiBudWxsLFxuXHR9O1xuXG5cdGNvbnN0IHVybCA9IGF0dGFjaG1lbnQudGl0bGVfbGluayB8fCBhdHRhY2htZW50LmltYWdlX3VybCB8fCBhdHRhY2htZW50LmF1ZGlvX3VybCB8fCBhdHRhY2htZW50LnZpZGVvX3VybCB8fCBhdHRhY2htZW50Lm1lc3NhZ2VfbGluaztcblx0aWYgKHVybCkge1xuXHRcdGF0dGFjaG1lbnREYXRhLnVybCA9IHVybDtcblxuXHRcdGNvbnN0IHVybE1hdGNoID0gL1xcOlxcL1xcLy8uZXhlYyh1cmwpO1xuXHRcdGlmICh1cmxNYXRjaCAmJiB1cmxNYXRjaC5sZW5ndGggPiAwKSB7XG5cdFx0XHRhdHRhY2htZW50RGF0YS5yZW1vdGUgPSB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zdCBtYXRjaCA9IC9eXFwvKFteXFwvXSspXFwvKFteXFwvXSspXFwvKC4qKS8uZXhlYyh1cmwpO1xuXG5cdFx0XHRpZiAobWF0Y2ggJiYgbWF0Y2hbMl0pIHtcblx0XHRcdFx0Y29uc3QgZmlsZSA9IFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMuZmluZE9uZUJ5SWQobWF0Y2hbMl0pO1xuXG5cdFx0XHRcdGlmIChmaWxlKSB7XG5cdFx0XHRcdFx0YXR0YWNobWVudERhdGEuZmlsZUlkID0gZmlsZS5faWQ7XG5cdFx0XHRcdFx0YXR0YWNobWVudERhdGEuZmlsZU5hbWUgPSBmaWxlLm5hbWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gYXR0YWNobWVudERhdGE7XG59O1xuXG5jb25zdCBhZGRUb0ZpbGVMaXN0ID0gZnVuY3Rpb24oZXhwb3J0T3BlcmF0aW9uLCBhdHRhY2htZW50KSB7XG5cdGNvbnN0IHRhcmdldEZpbGUgPSBwYXRoLmpvaW4oZXhwb3J0T3BlcmF0aW9uLmFzc2V0c1BhdGgsIGAkeyBhdHRhY2htZW50LmZpbGVJZCB9LSR7IGF0dGFjaG1lbnQuZmlsZU5hbWUgfWApO1xuXG5cdGNvbnN0IGF0dGFjaG1lbnREYXRhID0ge1xuXHRcdHVybDogYXR0YWNobWVudC51cmwsXG5cdFx0Y29waWVkOiBmYWxzZSxcblx0XHRyZW1vdGU6IGF0dGFjaG1lbnQucmVtb3RlLFxuXHRcdGZpbGVJZDogYXR0YWNobWVudC5maWxlSWQsXG5cdFx0ZmlsZU5hbWU6IGF0dGFjaG1lbnQuZmlsZU5hbWUsXG5cdFx0dGFyZ2V0RmlsZSxcblx0fTtcblxuXHRleHBvcnRPcGVyYXRpb24uZmlsZUxpc3QucHVzaChhdHRhY2htZW50RGF0YSk7XG59O1xuXG5jb25zdCBnZXRNZXNzYWdlRGF0YSA9IGZ1bmN0aW9uKG1zZywgZXhwb3J0T3BlcmF0aW9uKSB7XG5cdGNvbnN0IGF0dGFjaG1lbnRzID0gW107XG5cblx0aWYgKG1zZy5hdHRhY2htZW50cykge1xuXHRcdG1zZy5hdHRhY2htZW50cy5mb3JFYWNoKChhdHRhY2htZW50KSA9PiB7XG5cdFx0XHRjb25zdCBhdHRhY2htZW50RGF0YSA9IGdldEF0dGFjaG1lbnREYXRhKGF0dGFjaG1lbnQpO1xuXG5cdFx0XHRhdHRhY2htZW50cy5wdXNoKGF0dGFjaG1lbnREYXRhKTtcblx0XHRcdGFkZFRvRmlsZUxpc3QoZXhwb3J0T3BlcmF0aW9uLCBhdHRhY2htZW50RGF0YSk7XG5cdFx0fSk7XG5cdH1cblxuXHRjb25zdCBtZXNzYWdlT2JqZWN0ID0ge1xuXHRcdG1zZzogbXNnLm1zZyxcblx0XHR1c2VybmFtZTogbXNnLnUudXNlcm5hbWUsXG5cdFx0dHM6IG1zZy50cyxcblx0fTtcblxuXHRpZiAoYXR0YWNobWVudHMgJiYgYXR0YWNobWVudHMubGVuZ3RoID4gMCkge1xuXHRcdG1lc3NhZ2VPYmplY3QuYXR0YWNobWVudHMgPSBhdHRhY2htZW50cztcblx0fVxuXHRpZiAobXNnLnQpIHtcblx0XHRtZXNzYWdlT2JqZWN0LnR5cGUgPSBtc2cudDtcblx0fVxuXHRpZiAobXNnLnUubmFtZSkge1xuXHRcdG1lc3NhZ2VPYmplY3QubmFtZSA9IG1zZy51Lm5hbWU7XG5cdH1cblxuXHRyZXR1cm4gbWVzc2FnZU9iamVjdDtcbn07XG5cbmNvbnN0IGNvcHlGaWxlID0gZnVuY3Rpb24oZXhwb3J0T3BlcmF0aW9uLCBhdHRhY2htZW50RGF0YSkge1xuXHRpZiAoYXR0YWNobWVudERhdGEuY29waWVkIHx8IGF0dGFjaG1lbnREYXRhLnJlbW90ZSB8fCAhYXR0YWNobWVudERhdGEuZmlsZUlkKSB7XG5cdFx0YXR0YWNobWVudERhdGEuY29waWVkID0gdHJ1ZTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCBmaWxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kT25lQnlJZChhdHRhY2htZW50RGF0YS5maWxlSWQpO1xuXG5cdGlmIChmaWxlKSB7XG5cdFx0aWYgKEZpbGVVcGxvYWQuY29weShmaWxlLCBhdHRhY2htZW50RGF0YS50YXJnZXRGaWxlKSkge1xuXHRcdFx0YXR0YWNobWVudERhdGEuY29waWVkID0gdHJ1ZTtcblx0XHR9XG5cdH1cbn07XG5cbmNvbnN0IGNvbnRpbnVlRXhwb3J0aW5nUm9vbSA9IGZ1bmN0aW9uKGV4cG9ydE9wZXJhdGlvbiwgZXhwb3J0T3BSb29tRGF0YSkge1xuXHRjcmVhdGVEaXIoZXhwb3J0T3BlcmF0aW9uLmV4cG9ydFBhdGgpO1xuXHRjcmVhdGVEaXIoZXhwb3J0T3BlcmF0aW9uLmFzc2V0c1BhdGgpO1xuXG5cdGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGV4cG9ydE9wZXJhdGlvbi5leHBvcnRQYXRoLCBleHBvcnRPcFJvb21EYXRhLnRhcmdldEZpbGUpO1xuXG5cdGlmIChleHBvcnRPcFJvb21EYXRhLnN0YXR1cyA9PT0gJ3BlbmRpbmcnKSB7XG5cdFx0ZXhwb3J0T3BSb29tRGF0YS5zdGF0dXMgPSAnZXhwb3J0aW5nJztcblx0XHRzdGFydEZpbGUoZmlsZVBhdGgsICcnKTtcblx0XHRpZiAoIWV4cG9ydE9wZXJhdGlvbi5mdWxsRXhwb3J0KSB7XG5cdFx0XHR3cml0ZVRvRmlsZShmaWxlUGF0aCwgJzxtZXRhIGh0dHAtZXF1aXY9XCJjb250ZW50LXR5cGVcIiBjb250ZW50PVwidGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04XCI+Jyk7XG5cdFx0fVxuXHR9XG5cblx0bGV0IGxpbWl0ID0gMTAwO1xuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VzZXJEYXRhX01lc3NhZ2VMaW1pdFBlclJlcXVlc3QnKSA+IDApIHtcblx0XHRsaW1pdCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdVc2VyRGF0YV9NZXNzYWdlTGltaXRQZXJSZXF1ZXN0Jyk7XG5cdH1cblxuXHRjb25zdCBza2lwID0gZXhwb3J0T3BSb29tRGF0YS5leHBvcnRlZENvdW50O1xuXG5cdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRCeVJvb21JZChleHBvcnRPcFJvb21EYXRhLnJvb21JZCwgeyBsaW1pdCwgc2tpcCB9KTtcblx0Y29uc3QgY291bnQgPSBjdXJzb3IuY291bnQoKTtcblxuXHRjdXJzb3IuZm9yRWFjaCgobXNnKSA9PiB7XG5cdFx0Y29uc3QgbWVzc2FnZU9iamVjdCA9IGdldE1lc3NhZ2VEYXRhKG1zZywgZXhwb3J0T3BlcmF0aW9uKTtcblxuXHRcdGlmIChleHBvcnRPcGVyYXRpb24uZnVsbEV4cG9ydCkge1xuXHRcdFx0Y29uc3QgbWVzc2FnZVN0cmluZyA9IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2VPYmplY3QpO1xuXHRcdFx0d3JpdGVUb0ZpbGUoZmlsZVBhdGgsIGAkeyBtZXNzYWdlU3RyaW5nIH1cXG5gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc3QgbWVzc2FnZVR5cGUgPSBtc2cudDtcblx0XHRcdGNvbnN0IHVzZXJOYW1lID0gbXNnLnUudXNlcm5hbWUgfHwgbXNnLnUubmFtZTtcblx0XHRcdGNvbnN0IHRpbWVzdGFtcCA9IG1zZy50cyA/IG5ldyBEYXRlKG1zZy50cykudG9VVENTdHJpbmcoKSA6ICcnO1xuXHRcdFx0bGV0IG1lc3NhZ2UgPSBtc2cubXNnO1xuXG5cdFx0XHRzd2l0Y2ggKG1lc3NhZ2VUeXBlKSB7XG5cdFx0XHRcdGNhc2UgJ3VqJzpcblx0XHRcdFx0XHRtZXNzYWdlID0gVEFQaTE4bi5fXygnVXNlcl9qb2luZWRfY2hhbm5lbCcpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICd1bCc6XG5cdFx0XHRcdFx0bWVzc2FnZSA9IFRBUGkxOG4uX18oJ1VzZXJfbGVmdCcpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdhdSc6XG5cdFx0XHRcdFx0bWVzc2FnZSA9IFRBUGkxOG4uX18oJ1VzZXJfYWRkZWRfYnknLCB7IHVzZXJfYWRkZWQgOiBtc2cubXNnLCB1c2VyX2J5IDogbXNnLnUudXNlcm5hbWUgfSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3InOlxuXHRcdFx0XHRcdG1lc3NhZ2UgPSBUQVBpMThuLl9fKCdSb29tX25hbWVfY2hhbmdlZCcsIHsgcm9vbV9uYW1lOiBtc2cubXNnLCB1c2VyX2J5OiBtc2cudS51c2VybmFtZSB9KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncnUnOlxuXHRcdFx0XHRcdG1lc3NhZ2UgPSBUQVBpMThuLl9fKCdVc2VyX3JlbW92ZWRfYnknLCB7IHVzZXJfcmVtb3ZlZCA6IG1zZy5tc2csIHVzZXJfYnkgOiBtc2cudS51c2VybmFtZSB9KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnd20nOlxuXHRcdFx0XHRcdG1lc3NhZ2UgPSBUQVBpMThuLl9fKCdXZWxjb21lJywgeyB1c2VyOiBtc2cudS51c2VybmFtZSB9KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnbGl2ZWNoYXQtY2xvc2UnOlxuXHRcdFx0XHRcdG1lc3NhZ2UgPSBUQVBpMThuLl9fKCdDb252ZXJzYXRpb25fZmluaXNoZWQnKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0aWYgKG1lc3NhZ2UgIT09IG1zZy5tc2cpIHtcblx0XHRcdFx0bWVzc2FnZSA9IGA8aT4keyBtZXNzYWdlIH08L2k+YDtcblx0XHRcdH1cblxuXHRcdFx0d3JpdGVUb0ZpbGUoZmlsZVBhdGgsIGA8cD48c3Ryb25nPiR7IHVzZXJOYW1lIH08L3N0cm9uZz4gKCR7IHRpbWVzdGFtcCB9KTo8YnIvPmApO1xuXHRcdFx0d3JpdGVUb0ZpbGUoZmlsZVBhdGgsIG1lc3NhZ2UpO1xuXG5cdFx0XHRpZiAobWVzc2FnZU9iamVjdC5hdHRhY2htZW50cyAmJiBtZXNzYWdlT2JqZWN0LmF0dGFjaG1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0bWVzc2FnZU9iamVjdC5hdHRhY2htZW50cy5mb3JFYWNoKChhdHRhY2htZW50KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGF0dGFjaG1lbnQudHlwZSA9PT0gJ2ZpbGUnKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkZXNjcmlwdGlvbiA9IGF0dGFjaG1lbnQuZGVzY3JpcHRpb24gfHwgYXR0YWNobWVudC50aXRsZSB8fCBUQVBpMThuLl9fKCdNZXNzYWdlX0F0dGFjaG1lbnRzJyk7XG5cblx0XHRcdFx0XHRcdGNvbnN0IGFzc2V0VXJsID0gYC4vYXNzZXRzLyR7IGF0dGFjaG1lbnQuZmlsZUlkIH0tJHsgYXR0YWNobWVudC5maWxlTmFtZSB9YDtcblx0XHRcdFx0XHRcdGNvbnN0IGxpbmsgPSBgPGJyLz48YSBocmVmPVwiJHsgYXNzZXRVcmwgfVwiPiR7IGRlc2NyaXB0aW9uIH08L2E+YDtcblx0XHRcdFx0XHRcdHdyaXRlVG9GaWxlKGZpbGVQYXRoLCBsaW5rKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHR3cml0ZVRvRmlsZShmaWxlUGF0aCwgJzwvcD4nKTtcblx0XHR9XG5cblx0XHRleHBvcnRPcFJvb21EYXRhLmV4cG9ydGVkQ291bnQrKztcblx0fSk7XG5cblx0aWYgKGNvdW50IDw9IGV4cG9ydE9wUm9vbURhdGEuZXhwb3J0ZWRDb3VudCkge1xuXHRcdGV4cG9ydE9wUm9vbURhdGEuc3RhdHVzID0gJ2NvbXBsZXRlZCc7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG5jb25zdCBpc0V4cG9ydENvbXBsZXRlID0gZnVuY3Rpb24oZXhwb3J0T3BlcmF0aW9uKSB7XG5cdGNvbnN0IGluY29tcGxldGUgPSBleHBvcnRPcGVyYXRpb24ucm9vbUxpc3Quc29tZSgoZXhwb3J0T3BSb29tRGF0YSkgPT4gZXhwb3J0T3BSb29tRGF0YS5zdGF0dXMgIT09ICdjb21wbGV0ZWQnKTtcblxuXHRyZXR1cm4gIWluY29tcGxldGU7XG59O1xuXG5jb25zdCBpc0Rvd25sb2FkRmluaXNoZWQgPSBmdW5jdGlvbihleHBvcnRPcGVyYXRpb24pIHtcblx0Y29uc3QgYW55RG93bmxvYWRQZW5kaW5nID0gZXhwb3J0T3BlcmF0aW9uLmZpbGVMaXN0LnNvbWUoKGZpbGVEYXRhKSA9PiAhZmlsZURhdGEuY29waWVkICYmICFmaWxlRGF0YS5yZW1vdGUpO1xuXG5cdHJldHVybiAhYW55RG93bmxvYWRQZW5kaW5nO1xufTtcblxuY29uc3Qgc2VuZEVtYWlsID0gZnVuY3Rpb24odXNlcklkKSB7XG5cdGNvbnN0IGxhc3RGaWxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlckRhdGFGaWxlcy5maW5kTGFzdEZpbGVCeVVzZXIodXNlcklkKTtcblx0aWYgKGxhc3RGaWxlKSB7XG5cdFx0Y29uc3QgdXNlckRhdGEgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpO1xuXG5cdFx0aWYgKHVzZXJEYXRhICYmIHVzZXJEYXRhLmVtYWlscyAmJiB1c2VyRGF0YS5lbWFpbHNbMF0gJiYgdXNlckRhdGEuZW1haWxzWzBdLmFkZHJlc3MpIHtcblx0XHRcdGNvbnN0IGVtYWlsQWRkcmVzcyA9IGAkeyB1c2VyRGF0YS5uYW1lIH0gPCR7IHVzZXJEYXRhLmVtYWlsc1swXS5hZGRyZXNzIH0+YDtcblx0XHRcdGNvbnN0IGZyb21BZGRyZXNzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Zyb21fRW1haWwnKTtcblx0XHRcdGNvbnN0IHN1YmplY3QgPSBUQVBpMThuLl9fKCdVc2VyRGF0YURvd25sb2FkX0VtYWlsU3ViamVjdCcpO1xuXG5cdFx0XHRjb25zdCBkb3dubG9hZF9saW5rID0gbGFzdEZpbGUudXJsO1xuXHRcdFx0Y29uc3QgYm9keSA9IFRBUGkxOG4uX18oJ1VzZXJEYXRhRG93bmxvYWRfRW1haWxCb2R5JywgeyBkb3dubG9hZF9saW5rIH0pO1xuXG5cdFx0XHRjb25zdCByZmNNYWlsUGF0dGVybldpdGhOYW1lID0gL14oPzouKjwpPyhbYS16QS1aMC05LiEjJCUmJyorXFwvPT9eX2B7fH1+LV0rQFthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPyg/OlxcLlthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPykqKSg/Oj4/KSQvO1xuXG5cdFx0XHRpZiAocmZjTWFpbFBhdHRlcm5XaXRoTmFtZS50ZXN0KGVtYWlsQWRkcmVzcykpIHtcblx0XHRcdFx0TWV0ZW9yLmRlZmVyKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBFbWFpbC5zZW5kKHtcblx0XHRcdFx0XHRcdHRvOiBlbWFpbEFkZHJlc3MsXG5cdFx0XHRcdFx0XHRmcm9tOiBmcm9tQWRkcmVzcyxcblx0XHRcdFx0XHRcdHN1YmplY3QsXG5cdFx0XHRcdFx0XHRodG1sOiBib2R5LFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRyZXR1cm4gY29uc29sZS5sb2coYFNlbmRpbmcgZW1haWwgdG8gJHsgZW1haWxBZGRyZXNzIH1gKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbmNvbnN0IG1ha2VaaXBGaWxlID0gZnVuY3Rpb24oZXhwb3J0T3BlcmF0aW9uKSB7XG5cdGNyZWF0ZURpcih6aXBGb2xkZXIpO1xuXG5cdGNvbnN0IHRhcmdldEZpbGUgPSBwYXRoLmpvaW4oemlwRm9sZGVyLCBgJHsgZXhwb3J0T3BlcmF0aW9uLnVzZXJJZCB9LnppcGApO1xuXHRpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXRGaWxlKSkge1xuXHRcdGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPSAndXBsb2FkaW5nJztcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCBvdXRwdXQgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh0YXJnZXRGaWxlKTtcblxuXHRleHBvcnRPcGVyYXRpb24uZ2VuZXJhdGVkRmlsZSA9IHRhcmdldEZpbGU7XG5cblx0Y29uc3QgYXJjaGl2ZSA9IGFyY2hpdmVyKCd6aXAnKTtcblxuXHRvdXRwdXQub24oJ2Nsb3NlJywgKCkgPT4ge1xuXHR9KTtcblxuXHRhcmNoaXZlLm9uKCdlcnJvcicsIChlcnIpID0+IHtcblx0XHR0aHJvdyBlcnI7XG5cdH0pO1xuXG5cdGFyY2hpdmUucGlwZShvdXRwdXQpO1xuXHRhcmNoaXZlLmRpcmVjdG9yeShleHBvcnRPcGVyYXRpb24uZXhwb3J0UGF0aCwgZmFsc2UpO1xuXHRhcmNoaXZlLmZpbmFsaXplKCk7XG59O1xuXG5jb25zdCB1cGxvYWRaaXBGaWxlID0gZnVuY3Rpb24oZXhwb3J0T3BlcmF0aW9uLCBjYWxsYmFjaykge1xuXHRjb25zdCB1c2VyRGF0YVN0b3JlID0gRmlsZVVwbG9hZC5nZXRTdG9yZSgnVXNlckRhdGFGaWxlcycpO1xuXHRjb25zdCBmaWxlUGF0aCA9IGV4cG9ydE9wZXJhdGlvbi5nZW5lcmF0ZWRGaWxlO1xuXG5cdGNvbnN0IHN0YXQgPSBNZXRlb3Iud3JhcEFzeW5jKGZzLnN0YXQpKGZpbGVQYXRoKTtcblx0Y29uc3Qgc3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShmaWxlUGF0aCk7XG5cblx0Y29uc3QgY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vemlwJztcblx0Y29uc3QgeyBzaXplIH0gPSBzdGF0O1xuXG5cdGNvbnN0IHsgdXNlcklkIH0gPSBleHBvcnRPcGVyYXRpb247XG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpO1xuXHRjb25zdCB1c2VyRGlzcGxheU5hbWUgPSB1c2VyID8gdXNlci5uYW1lIDogdXNlcklkO1xuXHRjb25zdCB1dGNEYXRlID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF07XG5cblx0Y29uc3QgbmV3RmlsZU5hbWUgPSBlbmNvZGVVUklDb21wb25lbnQoYCR7IHV0Y0RhdGUgfS0keyB1c2VyRGlzcGxheU5hbWUgfS56aXBgKTtcblxuXHRjb25zdCBkZXRhaWxzID0ge1xuXHRcdHVzZXJJZCxcblx0XHR0eXBlOiBjb250ZW50VHlwZSxcblx0XHRzaXplLFxuXHRcdG5hbWU6IG5ld0ZpbGVOYW1lLFxuXHR9O1xuXG5cdHVzZXJEYXRhU3RvcmUuaW5zZXJ0KGRldGFpbHMsIHN0cmVhbSwgKGVycikgPT4ge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtZmlsZScsICdJbnZhbGlkIFppcCBGaWxlJywgeyBtZXRob2Q6ICdjcm9uUHJvY2Vzc0Rvd25sb2Fkcy51cGxvYWRaaXBGaWxlJyB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgZ2VuZXJhdGVDaGFubmVsc0ZpbGUgPSBmdW5jdGlvbihleHBvcnRPcGVyYXRpb24pIHtcblx0aWYgKGV4cG9ydE9wZXJhdGlvbi5mdWxsRXhwb3J0KSB7XG5cdFx0Y29uc3QgZmlsZU5hbWUgPSBwYXRoLmpvaW4oZXhwb3J0T3BlcmF0aW9uLmV4cG9ydFBhdGgsICdjaGFubmVscy5qc29uJyk7XG5cdFx0c3RhcnRGaWxlKGZpbGVOYW1lLCAnJyk7XG5cblx0XHRleHBvcnRPcGVyYXRpb24ucm9vbUxpc3QuZm9yRWFjaCgocm9vbURhdGEpID0+IHtcblx0XHRcdGNvbnN0IG5ld1Jvb21EYXRhID0ge1xuXHRcdFx0XHRyb29tSWQ6IHJvb21EYXRhLnJvb21JZCxcblx0XHRcdFx0cm9vbU5hbWU6IHJvb21EYXRhLnJvb21OYW1lLFxuXHRcdFx0XHR0eXBlOiByb29tRGF0YS50eXBlLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgbWVzc2FnZVN0cmluZyA9IEpTT04uc3RyaW5naWZ5KG5ld1Jvb21EYXRhKTtcblx0XHRcdHdyaXRlVG9GaWxlKGZpbGVOYW1lLCBgJHsgbWVzc2FnZVN0cmluZyB9XFxuYCk7XG5cdFx0fSk7XG5cdH1cblxuXHRleHBvcnRPcGVyYXRpb24uc3RhdHVzID0gJ2V4cG9ydGluZyc7XG59O1xuXG5jb25zdCBjb250aW51ZUV4cG9ydE9wZXJhdGlvbiA9IGZ1bmN0aW9uKGV4cG9ydE9wZXJhdGlvbikge1xuXHRpZiAoZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoIWV4cG9ydE9wZXJhdGlvbi5yb29tTGlzdCkge1xuXHRcdGxvYWRVc2VyU3Vic2NyaXB0aW9ucyhleHBvcnRPcGVyYXRpb24pO1xuXHR9XG5cblx0dHJ5IHtcblxuXHRcdGlmIChleHBvcnRPcGVyYXRpb24uc3RhdHVzID09PSAnZXhwb3J0aW5nLXJvb21zJykge1xuXHRcdFx0Z2VuZXJhdGVDaGFubmVsc0ZpbGUoZXhwb3J0T3BlcmF0aW9uKTtcblx0XHR9XG5cblx0XHQvLyBSdW4gZXZlcnkgcm9vbSBvbiBldmVyeSByZXF1ZXN0LCB0byBhdm9pZCBtaXNzaW5nIG5ldyBtZXNzYWdlcyBvbiB0aGUgcm9vbXMgdGhhdCBmaW5pc2hlZCBmaXJzdC5cblx0XHRpZiAoZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9PT0gJ2V4cG9ydGluZycpIHtcblx0XHRcdGV4cG9ydE9wZXJhdGlvbi5yb29tTGlzdC5mb3JFYWNoKChleHBvcnRPcFJvb21EYXRhKSA9PiB7XG5cdFx0XHRcdGNvbnRpbnVlRXhwb3J0aW5nUm9vbShleHBvcnRPcGVyYXRpb24sIGV4cG9ydE9wUm9vbURhdGEpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChpc0V4cG9ydENvbXBsZXRlKGV4cG9ydE9wZXJhdGlvbikpIHtcblx0XHRcdFx0ZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9ICdkb3dubG9hZGluZyc7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9PT0gJ2Rvd25sb2FkaW5nJykge1xuXHRcdFx0ZXhwb3J0T3BlcmF0aW9uLmZpbGVMaXN0LmZvckVhY2goKGF0dGFjaG1lbnREYXRhKSA9PiB7XG5cdFx0XHRcdGNvcHlGaWxlKGV4cG9ydE9wZXJhdGlvbiwgYXR0YWNobWVudERhdGEpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChpc0Rvd25sb2FkRmluaXNoZWQoZXhwb3J0T3BlcmF0aW9uKSkge1xuXHRcdFx0XHRjb25zdCB0YXJnZXRGaWxlID0gcGF0aC5qb2luKHppcEZvbGRlciwgYCR7IGV4cG9ydE9wZXJhdGlvbi51c2VySWQgfS56aXBgKTtcblx0XHRcdFx0aWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0RmlsZSkpIHtcblx0XHRcdFx0XHRmcy51bmxpbmtTeW5jKHRhcmdldEZpbGUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9ICdjb21wcmVzc2luZyc7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9PT0gJ2NvbXByZXNzaW5nJykge1xuXHRcdFx0bWFrZVppcEZpbGUoZXhwb3J0T3BlcmF0aW9uKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9PT0gJ3VwbG9hZGluZycpIHtcblx0XHRcdHVwbG9hZFppcEZpbGUoZXhwb3J0T3BlcmF0aW9uLCAoKSA9PiB7XG5cdFx0XHRcdGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPSAnY29tcGxldGVkJztcblx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuRXhwb3J0T3BlcmF0aW9ucy51cGRhdGVPcGVyYXRpb24oZXhwb3J0T3BlcmF0aW9uKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fSBjYXRjaCAoZSkge1xuXHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdH1cbn07XG5cbmZ1bmN0aW9uIHByb2Nlc3NEYXRhRG93bmxvYWRzKCkge1xuXHRjb25zdCBjdXJzb3IgPSBSb2NrZXRDaGF0Lm1vZGVscy5FeHBvcnRPcGVyYXRpb25zLmZpbmRBbGxQZW5kaW5nKHsgbGltaXQ6IDEgfSk7XG5cdGN1cnNvci5mb3JFYWNoKChleHBvcnRPcGVyYXRpb24pID0+IHtcblx0XHRpZiAoZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb250aW51ZUV4cG9ydE9wZXJhdGlvbihleHBvcnRPcGVyYXRpb24pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLkV4cG9ydE9wZXJhdGlvbnMudXBkYXRlT3BlcmF0aW9uKGV4cG9ydE9wZXJhdGlvbik7XG5cblx0XHRpZiAoZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcpIHtcblx0XHRcdHNlbmRFbWFpbChleHBvcnRPcGVyYXRpb24udXNlcklkKTtcblx0XHR9XG5cdH0pO1xufVxuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0TWV0ZW9yLmRlZmVyKGZ1bmN0aW9uKCkge1xuXHRcdHByb2Nlc3NEYXRhRG93bmxvYWRzKCk7XG5cblx0XHRTeW5jZWRDcm9uLmFkZCh7XG5cdFx0XHRuYW1lOiAnR2VuZXJhdGUgZG93bmxvYWQgZmlsZXMgZm9yIHVzZXIgZGF0YScsXG5cdFx0XHRzY2hlZHVsZTogKHBhcnNlcikgPT4gcGFyc2VyLmNyb24oYCovJHsgcHJvY2Vzc2luZ0ZyZXF1ZW5jeSB9ICogKiAqICpgKSxcblx0XHRcdGpvYjogcHJvY2Vzc0RhdGFEb3dubG9hZHMsXG5cdFx0fSk7XG5cdH0pO1xufSk7XG4iXX0=
