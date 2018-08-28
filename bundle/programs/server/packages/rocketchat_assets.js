(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var RocketChatFile = Package['rocketchat:file'].RocketChatFile;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var WebAppHashing = Package['webapp-hashing'].WebAppHashing;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:assets":{"server":{"assets.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_assets/server/assets.js                                                                  //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let sizeOf;
module.watch(require("image-size"), {
  default(v) {
    sizeOf = v;
  }

}, 1);
let mime;
module.watch(require("mime-type/with-db"), {
  default(v) {
    mime = v;
  }

}, 2);
let crypto;
module.watch(require("crypto"), {
  default(v) {
    crypto = v;
  }

}, 3);
mime.extensions['image/vnd.microsoft.icon'] = ['ico'];
const RocketChatAssetsInstance = new RocketChatFile.GridFS({
  name: 'assets'
});
this.RocketChatAssetsInstance = RocketChatAssetsInstance;
const assets = {
  logo: {
    label: 'logo (svg, png, jpg)',
    defaultUrl: 'images/logo/logo.svg',
    constraints: {
      type: 'image',
      extensions: ['svg', 'png', 'jpg', 'jpeg'],
      width: undefined,
      height: undefined
    },
    wizard: {
      step: 3,
      order: 2
    }
  },
  background: {
    label: 'login background (svg, png, jpg)',
    defaultUrl: undefined,
    constraints: {
      type: 'image',
      extensions: ['svg', 'png', 'jpg', 'jpeg'],
      width: undefined,
      height: undefined
    }
  },
  favicon_ico: {
    label: 'favicon (ico)',
    defaultUrl: 'favicon.ico',
    constraints: {
      type: 'image',
      extensions: ['ico'],
      width: undefined,
      height: undefined
    }
  },
  favicon: {
    label: 'favicon (svg)',
    defaultUrl: 'images/logo/icon.svg',
    constraints: {
      type: 'image',
      extensions: ['svg'],
      width: undefined,
      height: undefined
    }
  },
  favicon_16: {
    label: 'favicon 16x16 (png)',
    defaultUrl: 'images/logo/favicon-16x16.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 16,
      height: 16
    }
  },
  favicon_32: {
    label: 'favicon 32x32 (png)',
    defaultUrl: 'images/logo/favicon-32x32.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 32,
      height: 32
    }
  },
  favicon_192: {
    label: 'android-chrome 192x192 (png)',
    defaultUrl: 'images/logo/android-chrome-192x192.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 192,
      height: 192
    }
  },
  favicon_512: {
    label: 'android-chrome 512x512 (png)',
    defaultUrl: 'images/logo/android-chrome-512x512.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 512,
      height: 512
    }
  },
  touchicon_180: {
    label: 'apple-touch-icon 180x180 (png)',
    defaultUrl: 'images/logo/apple-touch-icon.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 180,
      height: 180
    }
  },
  touchicon_180_pre: {
    label: 'apple-touch-icon-precomposed 180x180 (png)',
    defaultUrl: 'images/logo/apple-touch-icon-precomposed.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 180,
      height: 180
    }
  },
  tile_70: {
    label: 'mstile 70x70 (png)',
    defaultUrl: 'images/logo/mstile-70x70.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 144,
      height: 144
    }
  },
  tile_144: {
    label: 'mstile 144x144 (png)',
    defaultUrl: 'images/logo/mstile-144x144.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 144,
      height: 144
    }
  },
  tile_150: {
    label: 'mstile 150x150 (png)',
    defaultUrl: 'images/logo/mstile-150x150.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 150,
      height: 150
    }
  },
  tile_310_square: {
    label: 'mstile 310x310 (png)',
    defaultUrl: 'images/logo/mstile-310x310.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 310,
      height: 310
    }
  },
  tile_310_wide: {
    label: 'mstile 310x150 (png)',
    defaultUrl: 'images/logo/mstile-310x150.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 310,
      height: 150
    }
  },
  safari_pinned: {
    label: 'safari pinned tab (svg)',
    defaultUrl: 'images/logo/safari-pinned-tab.svg',
    constraints: {
      type: 'image',
      extensions: ['svg'],
      width: undefined,
      height: undefined
    }
  }
};
RocketChat.Assets = new class {
  get mime() {
    return mime;
  }

  get assets() {
    return assets;
  }

  setAsset(binaryContent, contentType, asset) {
    if (!assets[asset]) {
      throw new Meteor.Error('error-invalid-asset', 'Invalid asset', {
        function: 'RocketChat.Assets.setAsset'
      });
    }

    const extension = mime.extension(contentType);

    if (assets[asset].constraints.extensions.includes(extension) === false) {
      throw new Meteor.Error(contentType, `Invalid file type: ${contentType}`, {
        function: 'RocketChat.Assets.setAsset',
        errorTitle: 'error-invalid-file-type'
      });
    }

    const file = new Buffer(binaryContent, 'binary');

    if (assets[asset].constraints.width || assets[asset].constraints.height) {
      const dimensions = sizeOf(file);

      if (assets[asset].constraints.width && assets[asset].constraints.width !== dimensions.width) {
        throw new Meteor.Error('error-invalid-file-width', 'Invalid file width', {
          function: 'Invalid file width'
        });
      }

      if (assets[asset].constraints.height && assets[asset].constraints.height !== dimensions.height) {
        throw new Meteor.Error('error-invalid-file-height');
      }
    }

    const rs = RocketChatFile.bufferToStream(file);
    RocketChatAssetsInstance.deleteFile(asset);
    const ws = RocketChatAssetsInstance.createWriteStream(asset, contentType);
    ws.on('end', Meteor.bindEnvironment(function () {
      return Meteor.setTimeout(function () {
        const key = `Assets_${asset}`;
        const value = {
          url: `assets/${asset}.${extension}`,
          defaultUrl: assets[asset].defaultUrl
        };
        RocketChat.settings.updateById(key, value);
        return RocketChat.Assets.processAsset(key, value);
      }, 200);
    }));
    rs.pipe(ws);
  }

  unsetAsset(asset) {
    if (!assets[asset]) {
      throw new Meteor.Error('error-invalid-asset', 'Invalid asset', {
        function: 'RocketChat.Assets.unsetAsset'
      });
    }

    RocketChatAssetsInstance.deleteFile(asset);
    const key = `Assets_${asset}`;
    const value = {
      defaultUrl: assets[asset].defaultUrl
    };
    RocketChat.settings.updateById(key, value);
    RocketChat.Assets.processAsset(key, value);
  }

  refreshClients() {
    return process.emit('message', {
      refresh: 'client'
    });
  }

  processAsset(settingKey, settingValue) {
    if (settingKey.indexOf('Assets_') !== 0) {
      return;
    }

    const assetKey = settingKey.replace(/^Assets_/, '');
    const assetValue = assets[assetKey];

    if (!assetValue) {
      return;
    }

    if (!settingValue || !settingValue.url) {
      assetValue.cache = undefined;
      return;
    }

    const file = RocketChatAssetsInstance.getFileSync(assetKey);

    if (!file) {
      assetValue.cache = undefined;
      return;
    }

    const hash = crypto.createHash('sha1').update(file.buffer).digest('hex');
    const extension = settingValue.url.split('.').pop();
    return assetValue.cache = {
      path: `assets/${assetKey}.${extension}`,
      cacheable: false,
      sourceMapUrl: undefined,
      where: 'client',
      type: 'asset',
      content: file.buffer,
      extension,
      url: `/assets/${assetKey}.${extension}?${hash}`,
      size: file.length,
      uploadDate: file.uploadDate,
      contentType: file.contentType,
      hash
    };
  }

}();
RocketChat.settings.addGroup('Assets');
RocketChat.settings.add('Assets_SvgFavicon_Enable', true, {
  type: 'boolean',
  group: 'Assets',
  i18nLabel: 'Enable_Svg_Favicon'
});

function addAssetToSetting(key, value) {
  return RocketChat.settings.add(`Assets_${key}`, {
    defaultUrl: value.defaultUrl
  }, {
    type: 'asset',
    group: 'Assets',
    fileConstraints: value.constraints,
    i18nLabel: value.label,
    asset: key,
    public: true,
    wizard: value.wizard
  });
}

for (const key of Object.keys(assets)) {
  const value = assets[key];
  addAssetToSetting(key, value);
}

RocketChat.models.Settings.find().observe({
  added(record) {
    return RocketChat.Assets.processAsset(record._id, record.value);
  },

  changed(record) {
    return RocketChat.Assets.processAsset(record._id, record.value);
  },

  removed(record) {
    return RocketChat.Assets.processAsset(record._id, undefined);
  }

});
Meteor.startup(function () {
  return Meteor.setTimeout(function () {
    return process.emit('message', {
      refresh: 'client'
    });
  }, 200);
});
const calculateClientHash = WebAppHashing.calculateClientHash;

WebAppHashing.calculateClientHash = function (manifest, includeFilter, runtimeConfigOverride) {
  for (const key of Object.keys(assets)) {
    const value = assets[key];

    if (!value.cache && !value.defaultUrl) {
      continue;
    }

    let cache = {};

    if (value.cache) {
      cache = {
        path: value.cache.path,
        cacheable: value.cache.cacheable,
        sourceMapUrl: value.cache.sourceMapUrl,
        where: value.cache.where,
        type: value.cache.type,
        url: value.cache.url,
        size: value.cache.size,
        hash: value.cache.hash
      };
      WebAppInternals.staticFiles[`/__cordova/assets/${key}`] = value.cache;
      WebAppInternals.staticFiles[`/__cordova/assets/${key}.${value.cache.extension}`] = value.cache;
    } else {
      const extension = value.defaultUrl.split('.').pop();
      cache = {
        path: `assets/${key}.${extension}`,
        cacheable: false,
        sourceMapUrl: undefined,
        where: 'client',
        type: 'asset',
        url: `/assets/${key}.${extension}?v3`,
        hash: 'v3'
      };
      WebAppInternals.staticFiles[`/__cordova/assets/${key}`] = WebAppInternals.staticFiles[`/__cordova/${value.defaultUrl}`];
      WebAppInternals.staticFiles[`/__cordova/assets/${key}.${extension}`] = WebAppInternals.staticFiles[`/__cordova/${value.defaultUrl}`];
    }

    const manifestItem = _.findWhere(manifest, {
      path: key
    });

    if (manifestItem) {
      const index = manifest.indexOf(manifestItem);
      manifest[index] = cache;
    } else {
      manifest.push(cache);
    }
  }

  return calculateClientHash.call(this, manifest, includeFilter, runtimeConfigOverride);
};

Meteor.methods({
  refreshClients() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'refreshClients'
      });
    }

    const hasPermission = RocketChat.authz.hasPermission(Meteor.userId(), 'manage-assets');

    if (!hasPermission) {
      throw new Meteor.Error('error-action-not-allowed', 'Managing assets not allowed', {
        method: 'refreshClients',
        action: 'Managing_assets'
      });
    }

    return RocketChat.Assets.refreshClients();
  },

  unsetAsset(asset) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'unsetAsset'
      });
    }

    const hasPermission = RocketChat.authz.hasPermission(Meteor.userId(), 'manage-assets');

    if (!hasPermission) {
      throw new Meteor.Error('error-action-not-allowed', 'Managing assets not allowed', {
        method: 'unsetAsset',
        action: 'Managing_assets'
      });
    }

    return RocketChat.Assets.unsetAsset(asset);
  },

  setAsset(binaryContent, contentType, asset) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'setAsset'
      });
    }

    const hasPermission = RocketChat.authz.hasPermission(Meteor.userId(), 'manage-assets');

    if (!hasPermission) {
      throw new Meteor.Error('error-action-not-allowed', 'Managing assets not allowed', {
        method: 'setAsset',
        action: 'Managing_assets'
      });
    }

    RocketChat.Assets.setAsset(binaryContent, contentType, asset);
  }

});
WebApp.connectHandlers.use('/assets/', Meteor.bindEnvironment(function (req, res, next) {
  const params = {
    asset: decodeURIComponent(req.url.replace(/^\//, '').replace(/\?.*$/, '')).replace(/\.[^.]*$/, '')
  };
  const file = assets[params.asset] && assets[params.asset].cache;

  if (!file) {
    if (assets[params.asset] && assets[params.asset].defaultUrl) {
      req.url = `/${assets[params.asset].defaultUrl}`;
      WebAppInternals.staticFilesMiddleware(WebAppInternals.staticFiles, req, res, next);
    } else {
      res.writeHead(404);
      res.end();
    }

    return;
  }

  const reqModifiedHeader = req.headers['if-modified-since'];

  if (reqModifiedHeader) {
    if (reqModifiedHeader === (file.uploadDate && file.uploadDate.toUTCString())) {
      res.setHeader('Last-Modified', reqModifiedHeader);
      res.writeHead(304);
      res.end();
      return;
    }
  }

  res.setHeader('Cache-Control', 'public, max-age=0');
  res.setHeader('Expires', '-1');
  res.setHeader('Last-Modified', file.uploadDate && file.uploadDate.toUTCString() || new Date().toUTCString());
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Length', file.size);
  res.writeHead(200);
  res.end(file.content);
}));
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:assets/server/assets.js");

/* Exports */
Package._define("rocketchat:assets");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_assets.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphc3NldHMvc2VydmVyL2Fzc2V0cy5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJzaXplT2YiLCJtaW1lIiwiY3J5cHRvIiwiZXh0ZW5zaW9ucyIsIlJvY2tldENoYXRBc3NldHNJbnN0YW5jZSIsIlJvY2tldENoYXRGaWxlIiwiR3JpZEZTIiwibmFtZSIsImFzc2V0cyIsImxvZ28iLCJsYWJlbCIsImRlZmF1bHRVcmwiLCJjb25zdHJhaW50cyIsInR5cGUiLCJ3aWR0aCIsInVuZGVmaW5lZCIsImhlaWdodCIsIndpemFyZCIsInN0ZXAiLCJvcmRlciIsImJhY2tncm91bmQiLCJmYXZpY29uX2ljbyIsImZhdmljb24iLCJmYXZpY29uXzE2IiwiZmF2aWNvbl8zMiIsImZhdmljb25fMTkyIiwiZmF2aWNvbl81MTIiLCJ0b3VjaGljb25fMTgwIiwidG91Y2hpY29uXzE4MF9wcmUiLCJ0aWxlXzcwIiwidGlsZV8xNDQiLCJ0aWxlXzE1MCIsInRpbGVfMzEwX3NxdWFyZSIsInRpbGVfMzEwX3dpZGUiLCJzYWZhcmlfcGlubmVkIiwiUm9ja2V0Q2hhdCIsIkFzc2V0cyIsInNldEFzc2V0IiwiYmluYXJ5Q29udGVudCIsImNvbnRlbnRUeXBlIiwiYXNzZXQiLCJNZXRlb3IiLCJFcnJvciIsImZ1bmN0aW9uIiwiZXh0ZW5zaW9uIiwiaW5jbHVkZXMiLCJlcnJvclRpdGxlIiwiZmlsZSIsIkJ1ZmZlciIsImRpbWVuc2lvbnMiLCJycyIsImJ1ZmZlclRvU3RyZWFtIiwiZGVsZXRlRmlsZSIsIndzIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJvbiIsImJpbmRFbnZpcm9ubWVudCIsInNldFRpbWVvdXQiLCJrZXkiLCJ2YWx1ZSIsInVybCIsInNldHRpbmdzIiwidXBkYXRlQnlJZCIsInByb2Nlc3NBc3NldCIsInBpcGUiLCJ1bnNldEFzc2V0IiwicmVmcmVzaENsaWVudHMiLCJwcm9jZXNzIiwiZW1pdCIsInJlZnJlc2giLCJzZXR0aW5nS2V5Iiwic2V0dGluZ1ZhbHVlIiwiaW5kZXhPZiIsImFzc2V0S2V5IiwicmVwbGFjZSIsImFzc2V0VmFsdWUiLCJjYWNoZSIsImdldEZpbGVTeW5jIiwiaGFzaCIsImNyZWF0ZUhhc2giLCJ1cGRhdGUiLCJidWZmZXIiLCJkaWdlc3QiLCJzcGxpdCIsInBvcCIsInBhdGgiLCJjYWNoZWFibGUiLCJzb3VyY2VNYXBVcmwiLCJ3aGVyZSIsImNvbnRlbnQiLCJzaXplIiwibGVuZ3RoIiwidXBsb2FkRGF0ZSIsImFkZEdyb3VwIiwiYWRkIiwiZ3JvdXAiLCJpMThuTGFiZWwiLCJhZGRBc3NldFRvU2V0dGluZyIsImZpbGVDb25zdHJhaW50cyIsInB1YmxpYyIsIk9iamVjdCIsImtleXMiLCJtb2RlbHMiLCJTZXR0aW5ncyIsImZpbmQiLCJvYnNlcnZlIiwiYWRkZWQiLCJyZWNvcmQiLCJfaWQiLCJjaGFuZ2VkIiwicmVtb3ZlZCIsInN0YXJ0dXAiLCJjYWxjdWxhdGVDbGllbnRIYXNoIiwiV2ViQXBwSGFzaGluZyIsIm1hbmlmZXN0IiwiaW5jbHVkZUZpbHRlciIsInJ1bnRpbWVDb25maWdPdmVycmlkZSIsIldlYkFwcEludGVybmFscyIsInN0YXRpY0ZpbGVzIiwibWFuaWZlc3RJdGVtIiwiZmluZFdoZXJlIiwiaW5kZXgiLCJwdXNoIiwiY2FsbCIsIm1ldGhvZHMiLCJ1c2VySWQiLCJtZXRob2QiLCJoYXNQZXJtaXNzaW9uIiwiYXV0aHoiLCJhY3Rpb24iLCJXZWJBcHAiLCJjb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJyZXEiLCJyZXMiLCJuZXh0IiwicGFyYW1zIiwiZGVjb2RlVVJJQ29tcG9uZW50Iiwic3RhdGljRmlsZXNNaWRkbGV3YXJlIiwid3JpdGVIZWFkIiwiZW5kIiwicmVxTW9kaWZpZWRIZWFkZXIiLCJoZWFkZXJzIiwidG9VVENTdHJpbmciLCJzZXRIZWFkZXIiLCJEYXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxDQUFKOztBQUFNQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxRQUFFSyxDQUFGO0FBQUk7O0FBQWhCLENBQW5DLEVBQXFELENBQXJEO0FBQXdELElBQUlDLE1BQUo7QUFBV0wsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0MsYUFBT0QsQ0FBUDtBQUFTOztBQUFyQixDQUFuQyxFQUEwRCxDQUExRDtBQUE2RCxJQUFJRSxJQUFKO0FBQVNOLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxtQkFBUixDQUFiLEVBQTBDO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDRSxXQUFLRixDQUFMO0FBQU87O0FBQW5CLENBQTFDLEVBQStELENBQS9EO0FBQWtFLElBQUlHLE1BQUo7QUFBV1AsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFFBQVIsQ0FBYixFQUErQjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0csYUFBT0gsQ0FBUDtBQUFTOztBQUFyQixDQUEvQixFQUFzRCxDQUF0RDtBQU81TkUsS0FBS0UsVUFBTCxDQUFnQiwwQkFBaEIsSUFBOEMsQ0FBQyxLQUFELENBQTlDO0FBRUEsTUFBTUMsMkJBQTJCLElBQUlDLGVBQWVDLE1BQW5CLENBQTBCO0FBQzFEQyxRQUFNO0FBRG9ELENBQTFCLENBQWpDO0FBSUEsS0FBS0gsd0JBQUwsR0FBZ0NBLHdCQUFoQztBQUVBLE1BQU1JLFNBQVM7QUFDZEMsUUFBTTtBQUNMQyxXQUFPLHNCQURGO0FBRUxDLGdCQUFZLHNCQUZQO0FBR0xDLGlCQUFhO0FBQ1pDLFlBQU0sT0FETTtBQUVaVixrQkFBWSxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsS0FBZixFQUFzQixNQUF0QixDQUZBO0FBR1pXLGFBQU9DLFNBSEs7QUFJWkMsY0FBUUQ7QUFKSSxLQUhSO0FBU0xFLFlBQVE7QUFDUEMsWUFBTSxDQURDO0FBRVBDLGFBQU87QUFGQTtBQVRILEdBRFE7QUFlZEMsY0FBWTtBQUNYVixXQUFPLGtDQURJO0FBRVhDLGdCQUFZSSxTQUZEO0FBR1hILGlCQUFhO0FBQ1pDLFlBQU0sT0FETTtBQUVaVixrQkFBWSxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsS0FBZixFQUFzQixNQUF0QixDQUZBO0FBR1pXLGFBQU9DLFNBSEs7QUFJWkMsY0FBUUQ7QUFKSTtBQUhGLEdBZkU7QUF5QmRNLGVBQWE7QUFDWlgsV0FBTyxlQURLO0FBRVpDLGdCQUFZLGFBRkE7QUFHWkMsaUJBQWE7QUFDWkMsWUFBTSxPQURNO0FBRVpWLGtCQUFZLENBQUMsS0FBRCxDQUZBO0FBR1pXLGFBQU9DLFNBSEs7QUFJWkMsY0FBUUQ7QUFKSTtBQUhELEdBekJDO0FBbUNkTyxXQUFTO0FBQ1JaLFdBQU8sZUFEQztBQUVSQyxnQkFBWSxzQkFGSjtBQUdSQyxpQkFBYTtBQUNaQyxZQUFNLE9BRE07QUFFWlYsa0JBQVksQ0FBQyxLQUFELENBRkE7QUFHWlcsYUFBT0MsU0FISztBQUlaQyxjQUFRRDtBQUpJO0FBSEwsR0FuQ0s7QUE2Q2RRLGNBQVk7QUFDWGIsV0FBTyxxQkFESTtBQUVYQyxnQkFBWSwrQkFGRDtBQUdYQyxpQkFBYTtBQUNaQyxZQUFNLE9BRE07QUFFWlYsa0JBQVksQ0FBQyxLQUFELENBRkE7QUFHWlcsYUFBTyxFQUhLO0FBSVpFLGNBQVE7QUFKSTtBQUhGLEdBN0NFO0FBdURkUSxjQUFZO0FBQ1hkLFdBQU8scUJBREk7QUFFWEMsZ0JBQVksK0JBRkQ7QUFHWEMsaUJBQWE7QUFDWkMsWUFBTSxPQURNO0FBRVpWLGtCQUFZLENBQUMsS0FBRCxDQUZBO0FBR1pXLGFBQU8sRUFISztBQUlaRSxjQUFRO0FBSkk7QUFIRixHQXZERTtBQWlFZFMsZUFBYTtBQUNaZixXQUFPLDhCQURLO0FBRVpDLGdCQUFZLHdDQUZBO0FBR1pDLGlCQUFhO0FBQ1pDLFlBQU0sT0FETTtBQUVaVixrQkFBWSxDQUFDLEtBQUQsQ0FGQTtBQUdaVyxhQUFPLEdBSEs7QUFJWkUsY0FBUTtBQUpJO0FBSEQsR0FqRUM7QUEyRWRVLGVBQWE7QUFDWmhCLFdBQU8sOEJBREs7QUFFWkMsZ0JBQVksd0NBRkE7QUFHWkMsaUJBQWE7QUFDWkMsWUFBTSxPQURNO0FBRVpWLGtCQUFZLENBQUMsS0FBRCxDQUZBO0FBR1pXLGFBQU8sR0FISztBQUlaRSxjQUFRO0FBSkk7QUFIRCxHQTNFQztBQXFGZFcsaUJBQWU7QUFDZGpCLFdBQU8sZ0NBRE87QUFFZEMsZ0JBQVksa0NBRkU7QUFHZEMsaUJBQWE7QUFDWkMsWUFBTSxPQURNO0FBRVpWLGtCQUFZLENBQUMsS0FBRCxDQUZBO0FBR1pXLGFBQU8sR0FISztBQUlaRSxjQUFRO0FBSkk7QUFIQyxHQXJGRDtBQStGZFkscUJBQW1CO0FBQ2xCbEIsV0FBTyw0Q0FEVztBQUVsQkMsZ0JBQVksOENBRk07QUFHbEJDLGlCQUFhO0FBQ1pDLFlBQU0sT0FETTtBQUVaVixrQkFBWSxDQUFDLEtBQUQsQ0FGQTtBQUdaVyxhQUFPLEdBSEs7QUFJWkUsY0FBUTtBQUpJO0FBSEssR0EvRkw7QUF5R2RhLFdBQVM7QUFDUm5CLFdBQU8sb0JBREM7QUFFUkMsZ0JBQVksOEJBRko7QUFHUkMsaUJBQWE7QUFDWkMsWUFBTSxPQURNO0FBRVpWLGtCQUFZLENBQUMsS0FBRCxDQUZBO0FBR1pXLGFBQU8sR0FISztBQUlaRSxjQUFRO0FBSkk7QUFITCxHQXpHSztBQW1IZGMsWUFBVTtBQUNUcEIsV0FBTyxzQkFERTtBQUVUQyxnQkFBWSxnQ0FGSDtBQUdUQyxpQkFBYTtBQUNaQyxZQUFNLE9BRE07QUFFWlYsa0JBQVksQ0FBQyxLQUFELENBRkE7QUFHWlcsYUFBTyxHQUhLO0FBSVpFLGNBQVE7QUFKSTtBQUhKLEdBbkhJO0FBNkhkZSxZQUFVO0FBQ1RyQixXQUFPLHNCQURFO0FBRVRDLGdCQUFZLGdDQUZIO0FBR1RDLGlCQUFhO0FBQ1pDLFlBQU0sT0FETTtBQUVaVixrQkFBWSxDQUFDLEtBQUQsQ0FGQTtBQUdaVyxhQUFPLEdBSEs7QUFJWkUsY0FBUTtBQUpJO0FBSEosR0E3SEk7QUF1SWRnQixtQkFBaUI7QUFDaEJ0QixXQUFPLHNCQURTO0FBRWhCQyxnQkFBWSxnQ0FGSTtBQUdoQkMsaUJBQWE7QUFDWkMsWUFBTSxPQURNO0FBRVpWLGtCQUFZLENBQUMsS0FBRCxDQUZBO0FBR1pXLGFBQU8sR0FISztBQUlaRSxjQUFRO0FBSkk7QUFIRyxHQXZJSDtBQWlKZGlCLGlCQUFlO0FBQ2R2QixXQUFPLHNCQURPO0FBRWRDLGdCQUFZLGdDQUZFO0FBR2RDLGlCQUFhO0FBQ1pDLFlBQU0sT0FETTtBQUVaVixrQkFBWSxDQUFDLEtBQUQsQ0FGQTtBQUdaVyxhQUFPLEdBSEs7QUFJWkUsY0FBUTtBQUpJO0FBSEMsR0FqSkQ7QUEySmRrQixpQkFBZTtBQUNkeEIsV0FBTyx5QkFETztBQUVkQyxnQkFBWSxtQ0FGRTtBQUdkQyxpQkFBYTtBQUNaQyxZQUFNLE9BRE07QUFFWlYsa0JBQVksQ0FBQyxLQUFELENBRkE7QUFHWlcsYUFBT0MsU0FISztBQUlaQyxjQUFRRDtBQUpJO0FBSEM7QUEzSkQsQ0FBZjtBQXVLQW9CLFdBQVdDLE1BQVgsR0FBb0IsSUFBSyxNQUFNO0FBQzlCLE1BQUluQyxJQUFKLEdBQVc7QUFDVixXQUFPQSxJQUFQO0FBQ0E7O0FBRUQsTUFBSU8sTUFBSixHQUFhO0FBQ1osV0FBT0EsTUFBUDtBQUNBOztBQUVENkIsV0FBU0MsYUFBVCxFQUF3QkMsV0FBeEIsRUFBcUNDLEtBQXJDLEVBQTRDO0FBQzNDLFFBQUksQ0FBQ2hDLE9BQU9nQyxLQUFQLENBQUwsRUFBb0I7QUFDbkIsWUFBTSxJQUFJQyxPQUFPQyxLQUFYLENBQWlCLHFCQUFqQixFQUF3QyxlQUF4QyxFQUF5RDtBQUM5REMsa0JBQVU7QUFEb0QsT0FBekQsQ0FBTjtBQUdBOztBQUVELFVBQU1DLFlBQVkzQyxLQUFLMkMsU0FBTCxDQUFlTCxXQUFmLENBQWxCOztBQUNBLFFBQUkvQixPQUFPZ0MsS0FBUCxFQUFjNUIsV0FBZCxDQUEwQlQsVUFBMUIsQ0FBcUMwQyxRQUFyQyxDQUE4Q0QsU0FBOUMsTUFBNkQsS0FBakUsRUFBd0U7QUFDdkUsWUFBTSxJQUFJSCxPQUFPQyxLQUFYLENBQWlCSCxXQUFqQixFQUErQixzQkFBc0JBLFdBQWEsRUFBbEUsRUFBcUU7QUFDMUVJLGtCQUFVLDRCQURnRTtBQUUxRUcsb0JBQVk7QUFGOEQsT0FBckUsQ0FBTjtBQUlBOztBQUVELFVBQU1DLE9BQU8sSUFBSUMsTUFBSixDQUFXVixhQUFYLEVBQTBCLFFBQTFCLENBQWI7O0FBQ0EsUUFBSTlCLE9BQU9nQyxLQUFQLEVBQWM1QixXQUFkLENBQTBCRSxLQUExQixJQUFtQ04sT0FBT2dDLEtBQVAsRUFBYzVCLFdBQWQsQ0FBMEJJLE1BQWpFLEVBQXlFO0FBQ3hFLFlBQU1pQyxhQUFhakQsT0FBTytDLElBQVAsQ0FBbkI7O0FBQ0EsVUFBSXZDLE9BQU9nQyxLQUFQLEVBQWM1QixXQUFkLENBQTBCRSxLQUExQixJQUFtQ04sT0FBT2dDLEtBQVAsRUFBYzVCLFdBQWQsQ0FBMEJFLEtBQTFCLEtBQW9DbUMsV0FBV25DLEtBQXRGLEVBQTZGO0FBQzVGLGNBQU0sSUFBSTJCLE9BQU9DLEtBQVgsQ0FBaUIsMEJBQWpCLEVBQTZDLG9CQUE3QyxFQUFtRTtBQUN4RUMsb0JBQVU7QUFEOEQsU0FBbkUsQ0FBTjtBQUdBOztBQUNELFVBQUluQyxPQUFPZ0MsS0FBUCxFQUFjNUIsV0FBZCxDQUEwQkksTUFBMUIsSUFBb0NSLE9BQU9nQyxLQUFQLEVBQWM1QixXQUFkLENBQTBCSSxNQUExQixLQUFxQ2lDLFdBQVdqQyxNQUF4RixFQUFnRztBQUMvRixjQUFNLElBQUl5QixPQUFPQyxLQUFYLENBQWlCLDJCQUFqQixDQUFOO0FBQ0E7QUFDRDs7QUFFRCxVQUFNUSxLQUFLN0MsZUFBZThDLGNBQWYsQ0FBOEJKLElBQTlCLENBQVg7QUFDQTNDLDZCQUF5QmdELFVBQXpCLENBQW9DWixLQUFwQztBQUVBLFVBQU1hLEtBQUtqRCx5QkFBeUJrRCxpQkFBekIsQ0FBMkNkLEtBQTNDLEVBQWtERCxXQUFsRCxDQUFYO0FBQ0FjLE9BQUdFLEVBQUgsQ0FBTSxLQUFOLEVBQWFkLE9BQU9lLGVBQVAsQ0FBdUIsWUFBVztBQUM5QyxhQUFPZixPQUFPZ0IsVUFBUCxDQUFrQixZQUFXO0FBQ25DLGNBQU1DLE1BQU8sVUFBVWxCLEtBQU8sRUFBOUI7QUFDQSxjQUFNbUIsUUFBUTtBQUNiQyxlQUFNLFVBQVVwQixLQUFPLElBQUlJLFNBQVcsRUFEekI7QUFFYmpDLHNCQUFZSCxPQUFPZ0MsS0FBUCxFQUFjN0I7QUFGYixTQUFkO0FBS0F3QixtQkFBVzBCLFFBQVgsQ0FBb0JDLFVBQXBCLENBQStCSixHQUEvQixFQUFvQ0MsS0FBcEM7QUFDQSxlQUFPeEIsV0FBV0MsTUFBWCxDQUFrQjJCLFlBQWxCLENBQStCTCxHQUEvQixFQUFvQ0MsS0FBcEMsQ0FBUDtBQUNBLE9BVE0sRUFTSixHQVRJLENBQVA7QUFVQSxLQVhZLENBQWI7QUFhQVQsT0FBR2MsSUFBSCxDQUFRWCxFQUFSO0FBQ0E7O0FBRURZLGFBQVd6QixLQUFYLEVBQWtCO0FBQ2pCLFFBQUksQ0FBQ2hDLE9BQU9nQyxLQUFQLENBQUwsRUFBb0I7QUFDbkIsWUFBTSxJQUFJQyxPQUFPQyxLQUFYLENBQWlCLHFCQUFqQixFQUF3QyxlQUF4QyxFQUF5RDtBQUM5REMsa0JBQVU7QUFEb0QsT0FBekQsQ0FBTjtBQUdBOztBQUVEdkMsNkJBQXlCZ0QsVUFBekIsQ0FBb0NaLEtBQXBDO0FBQ0EsVUFBTWtCLE1BQU8sVUFBVWxCLEtBQU8sRUFBOUI7QUFDQSxVQUFNbUIsUUFBUTtBQUNiaEQsa0JBQVlILE9BQU9nQyxLQUFQLEVBQWM3QjtBQURiLEtBQWQ7QUFJQXdCLGVBQVcwQixRQUFYLENBQW9CQyxVQUFwQixDQUErQkosR0FBL0IsRUFBb0NDLEtBQXBDO0FBQ0F4QixlQUFXQyxNQUFYLENBQWtCMkIsWUFBbEIsQ0FBK0JMLEdBQS9CLEVBQW9DQyxLQUFwQztBQUNBOztBQUVETyxtQkFBaUI7QUFDaEIsV0FBT0MsUUFBUUMsSUFBUixDQUFhLFNBQWIsRUFBd0I7QUFDOUJDLGVBQVM7QUFEcUIsS0FBeEIsQ0FBUDtBQUdBOztBQUVETixlQUFhTyxVQUFiLEVBQXlCQyxZQUF6QixFQUF1QztBQUN0QyxRQUFJRCxXQUFXRSxPQUFYLENBQW1CLFNBQW5CLE1BQWtDLENBQXRDLEVBQXlDO0FBQ3hDO0FBQ0E7O0FBRUQsVUFBTUMsV0FBV0gsV0FBV0ksT0FBWCxDQUFtQixVQUFuQixFQUErQixFQUEvQixDQUFqQjtBQUNBLFVBQU1DLGFBQWFuRSxPQUFPaUUsUUFBUCxDQUFuQjs7QUFFQSxRQUFJLENBQUNFLFVBQUwsRUFBaUI7QUFDaEI7QUFDQTs7QUFFRCxRQUFJLENBQUNKLFlBQUQsSUFBaUIsQ0FBQ0EsYUFBYVgsR0FBbkMsRUFBd0M7QUFDdkNlLGlCQUFXQyxLQUFYLEdBQW1CN0QsU0FBbkI7QUFDQTtBQUNBOztBQUVELFVBQU1nQyxPQUFPM0MseUJBQXlCeUUsV0FBekIsQ0FBcUNKLFFBQXJDLENBQWI7O0FBQ0EsUUFBSSxDQUFDMUIsSUFBTCxFQUFXO0FBQ1Y0QixpQkFBV0MsS0FBWCxHQUFtQjdELFNBQW5CO0FBQ0E7QUFDQTs7QUFFRCxVQUFNK0QsT0FBTzVFLE9BQU82RSxVQUFQLENBQWtCLE1BQWxCLEVBQTBCQyxNQUExQixDQUFpQ2pDLEtBQUtrQyxNQUF0QyxFQUE4Q0MsTUFBOUMsQ0FBcUQsS0FBckQsQ0FBYjtBQUNBLFVBQU10QyxZQUFZMkIsYUFBYVgsR0FBYixDQUFpQnVCLEtBQWpCLENBQXVCLEdBQXZCLEVBQTRCQyxHQUE1QixFQUFsQjtBQUVBLFdBQU9ULFdBQVdDLEtBQVgsR0FBbUI7QUFDekJTLFlBQU8sVUFBVVosUUFBVSxJQUFJN0IsU0FBVyxFQURqQjtBQUV6QjBDLGlCQUFXLEtBRmM7QUFHekJDLG9CQUFjeEUsU0FIVztBQUl6QnlFLGFBQU8sUUFKa0I7QUFLekIzRSxZQUFNLE9BTG1CO0FBTXpCNEUsZUFBUzFDLEtBQUtrQyxNQU5XO0FBT3pCckMsZUFQeUI7QUFRekJnQixXQUFNLFdBQVdhLFFBQVUsSUFBSTdCLFNBQVcsSUFBSWtDLElBQU0sRUFSM0I7QUFTekJZLFlBQU0zQyxLQUFLNEMsTUFUYztBQVV6QkMsa0JBQVk3QyxLQUFLNkMsVUFWUTtBQVd6QnJELG1CQUFhUSxLQUFLUixXQVhPO0FBWXpCdUM7QUFaeUIsS0FBMUI7QUFjQTs7QUF4SDZCLENBQVgsRUFBcEI7QUEySEEzQyxXQUFXMEIsUUFBWCxDQUFvQmdDLFFBQXBCLENBQTZCLFFBQTdCO0FBRUExRCxXQUFXMEIsUUFBWCxDQUFvQmlDLEdBQXBCLENBQXdCLDBCQUF4QixFQUFvRCxJQUFwRCxFQUEwRDtBQUN6RGpGLFFBQU0sU0FEbUQ7QUFFekRrRixTQUFPLFFBRmtEO0FBR3pEQyxhQUFXO0FBSDhDLENBQTFEOztBQU1BLFNBQVNDLGlCQUFULENBQTJCdkMsR0FBM0IsRUFBZ0NDLEtBQWhDLEVBQXVDO0FBQ3RDLFNBQU94QixXQUFXMEIsUUFBWCxDQUFvQmlDLEdBQXBCLENBQXlCLFVBQVVwQyxHQUFLLEVBQXhDLEVBQTJDO0FBQ2pEL0MsZ0JBQVlnRCxNQUFNaEQ7QUFEK0IsR0FBM0MsRUFFSjtBQUNGRSxVQUFNLE9BREo7QUFFRmtGLFdBQU8sUUFGTDtBQUdGRyxxQkFBaUJ2QyxNQUFNL0MsV0FIckI7QUFJRm9GLGVBQVdyQyxNQUFNakQsS0FKZjtBQUtGOEIsV0FBT2tCLEdBTEw7QUFNRnlDLFlBQVEsSUFOTjtBQU9GbEYsWUFBUTBDLE1BQU0xQztBQVBaLEdBRkksQ0FBUDtBQVdBOztBQUVELEtBQUssTUFBTXlDLEdBQVgsSUFBa0IwQyxPQUFPQyxJQUFQLENBQVk3RixNQUFaLENBQWxCLEVBQXVDO0FBQ3RDLFFBQU1tRCxRQUFRbkQsT0FBT2tELEdBQVAsQ0FBZDtBQUNBdUMsb0JBQWtCdkMsR0FBbEIsRUFBdUJDLEtBQXZCO0FBQ0E7O0FBRUR4QixXQUFXbUUsTUFBWCxDQUFrQkMsUUFBbEIsQ0FBMkJDLElBQTNCLEdBQWtDQyxPQUFsQyxDQUEwQztBQUN6Q0MsUUFBTUMsTUFBTixFQUFjO0FBQ2IsV0FBT3hFLFdBQVdDLE1BQVgsQ0FBa0IyQixZQUFsQixDQUErQjRDLE9BQU9DLEdBQXRDLEVBQTJDRCxPQUFPaEQsS0FBbEQsQ0FBUDtBQUNBLEdBSHdDOztBQUt6Q2tELFVBQVFGLE1BQVIsRUFBZ0I7QUFDZixXQUFPeEUsV0FBV0MsTUFBWCxDQUFrQjJCLFlBQWxCLENBQStCNEMsT0FBT0MsR0FBdEMsRUFBMkNELE9BQU9oRCxLQUFsRCxDQUFQO0FBQ0EsR0FQd0M7O0FBU3pDbUQsVUFBUUgsTUFBUixFQUFnQjtBQUNmLFdBQU94RSxXQUFXQyxNQUFYLENBQWtCMkIsWUFBbEIsQ0FBK0I0QyxPQUFPQyxHQUF0QyxFQUEyQzdGLFNBQTNDLENBQVA7QUFDQTs7QUFYd0MsQ0FBMUM7QUFjQTBCLE9BQU9zRSxPQUFQLENBQWUsWUFBVztBQUN6QixTQUFPdEUsT0FBT2dCLFVBQVAsQ0FBa0IsWUFBVztBQUNuQyxXQUFPVSxRQUFRQyxJQUFSLENBQWEsU0FBYixFQUF3QjtBQUM5QkMsZUFBUztBQURxQixLQUF4QixDQUFQO0FBR0EsR0FKTSxFQUlKLEdBSkksQ0FBUDtBQUtBLENBTkQ7QUFRQSxNQUFNMkMsc0JBQXNCQyxjQUFjRCxtQkFBMUM7O0FBRUFDLGNBQWNELG1CQUFkLEdBQW9DLFVBQVNFLFFBQVQsRUFBbUJDLGFBQW5CLEVBQWtDQyxxQkFBbEMsRUFBeUQ7QUFDNUYsT0FBSyxNQUFNMUQsR0FBWCxJQUFrQjBDLE9BQU9DLElBQVAsQ0FBWTdGLE1BQVosQ0FBbEIsRUFBdUM7QUFDdEMsVUFBTW1ELFFBQVFuRCxPQUFPa0QsR0FBUCxDQUFkOztBQUNBLFFBQUksQ0FBQ0MsTUFBTWlCLEtBQVAsSUFBZ0IsQ0FBQ2pCLE1BQU1oRCxVQUEzQixFQUF1QztBQUN0QztBQUNBOztBQUVELFFBQUlpRSxRQUFRLEVBQVo7O0FBQ0EsUUFBSWpCLE1BQU1pQixLQUFWLEVBQWlCO0FBQ2hCQSxjQUFRO0FBQ1BTLGNBQU0xQixNQUFNaUIsS0FBTixDQUFZUyxJQURYO0FBRVBDLG1CQUFXM0IsTUFBTWlCLEtBQU4sQ0FBWVUsU0FGaEI7QUFHUEMsc0JBQWM1QixNQUFNaUIsS0FBTixDQUFZVyxZQUhuQjtBQUlQQyxlQUFPN0IsTUFBTWlCLEtBQU4sQ0FBWVksS0FKWjtBQUtQM0UsY0FBTThDLE1BQU1pQixLQUFOLENBQVkvRCxJQUxYO0FBTVArQyxhQUFLRCxNQUFNaUIsS0FBTixDQUFZaEIsR0FOVjtBQU9QOEIsY0FBTS9CLE1BQU1pQixLQUFOLENBQVljLElBUFg7QUFRUFosY0FBTW5CLE1BQU1pQixLQUFOLENBQVlFO0FBUlgsT0FBUjtBQVVBdUMsc0JBQWdCQyxXQUFoQixDQUE2QixxQkFBcUI1RCxHQUFLLEVBQXZELElBQTREQyxNQUFNaUIsS0FBbEU7QUFDQXlDLHNCQUFnQkMsV0FBaEIsQ0FBNkIscUJBQXFCNUQsR0FBSyxJQUFJQyxNQUFNaUIsS0FBTixDQUFZaEMsU0FBVyxFQUFsRixJQUF1RmUsTUFBTWlCLEtBQTdGO0FBQ0EsS0FiRCxNQWFPO0FBQ04sWUFBTWhDLFlBQVllLE1BQU1oRCxVQUFOLENBQWlCd0UsS0FBakIsQ0FBdUIsR0FBdkIsRUFBNEJDLEdBQTVCLEVBQWxCO0FBQ0FSLGNBQVE7QUFDUFMsY0FBTyxVQUFVM0IsR0FBSyxJQUFJZCxTQUFXLEVBRDlCO0FBRVAwQyxtQkFBVyxLQUZKO0FBR1BDLHNCQUFjeEUsU0FIUDtBQUlQeUUsZUFBTyxRQUpBO0FBS1AzRSxjQUFNLE9BTEM7QUFNUCtDLGFBQU0sV0FBV0YsR0FBSyxJQUFJZCxTQUFXLEtBTjlCO0FBT1BrQyxjQUFNO0FBUEMsT0FBUjtBQVVBdUMsc0JBQWdCQyxXQUFoQixDQUE2QixxQkFBcUI1RCxHQUFLLEVBQXZELElBQTREMkQsZ0JBQWdCQyxXQUFoQixDQUE2QixjQUFjM0QsTUFBTWhELFVBQVksRUFBN0QsQ0FBNUQ7QUFDQTBHLHNCQUFnQkMsV0FBaEIsQ0FBNkIscUJBQXFCNUQsR0FBSyxJQUFJZCxTQUFXLEVBQXRFLElBQTJFeUUsZ0JBQWdCQyxXQUFoQixDQUE2QixjQUFjM0QsTUFBTWhELFVBQVksRUFBN0QsQ0FBM0U7QUFDQTs7QUFFRCxVQUFNNEcsZUFBZTdILEVBQUU4SCxTQUFGLENBQVlOLFFBQVosRUFBc0I7QUFDMUM3QixZQUFNM0I7QUFEb0MsS0FBdEIsQ0FBckI7O0FBSUEsUUFBSTZELFlBQUosRUFBa0I7QUFDakIsWUFBTUUsUUFBUVAsU0FBUzFDLE9BQVQsQ0FBaUIrQyxZQUFqQixDQUFkO0FBQ0FMLGVBQVNPLEtBQVQsSUFBa0I3QyxLQUFsQjtBQUNBLEtBSEQsTUFHTztBQUNOc0MsZUFBU1EsSUFBVCxDQUFjOUMsS0FBZDtBQUNBO0FBQ0Q7O0FBRUQsU0FBT29DLG9CQUFvQlcsSUFBcEIsQ0FBeUIsSUFBekIsRUFBK0JULFFBQS9CLEVBQXlDQyxhQUF6QyxFQUF3REMscUJBQXhELENBQVA7QUFDQSxDQWxERDs7QUFvREEzRSxPQUFPbUYsT0FBUCxDQUFlO0FBQ2QxRCxtQkFBaUI7QUFDaEIsUUFBSSxDQUFDekIsT0FBT29GLE1BQVAsRUFBTCxFQUFzQjtBQUNyQixZQUFNLElBQUlwRixPQUFPQyxLQUFYLENBQWlCLG9CQUFqQixFQUF1QyxjQUF2QyxFQUF1RDtBQUM1RG9GLGdCQUFRO0FBRG9ELE9BQXZELENBQU47QUFHQTs7QUFFRCxVQUFNQyxnQkFBZ0I1RixXQUFXNkYsS0FBWCxDQUFpQkQsYUFBakIsQ0FBK0J0RixPQUFPb0YsTUFBUCxFQUEvQixFQUFnRCxlQUFoRCxDQUF0Qjs7QUFDQSxRQUFJLENBQUNFLGFBQUwsRUFBb0I7QUFDbkIsWUFBTSxJQUFJdEYsT0FBT0MsS0FBWCxDQUFpQiwwQkFBakIsRUFBNkMsNkJBQTdDLEVBQTRFO0FBQ2pGb0YsZ0JBQVEsZ0JBRHlFO0FBRWpGRyxnQkFBUTtBQUZ5RSxPQUE1RSxDQUFOO0FBSUE7O0FBRUQsV0FBTzlGLFdBQVdDLE1BQVgsQ0FBa0I4QixjQUFsQixFQUFQO0FBQ0EsR0FqQmE7O0FBbUJkRCxhQUFXekIsS0FBWCxFQUFrQjtBQUNqQixRQUFJLENBQUNDLE9BQU9vRixNQUFQLEVBQUwsRUFBc0I7QUFDckIsWUFBTSxJQUFJcEYsT0FBT0MsS0FBWCxDQUFpQixvQkFBakIsRUFBdUMsY0FBdkMsRUFBdUQ7QUFDNURvRixnQkFBUTtBQURvRCxPQUF2RCxDQUFOO0FBR0E7O0FBRUQsVUFBTUMsZ0JBQWdCNUYsV0FBVzZGLEtBQVgsQ0FBaUJELGFBQWpCLENBQStCdEYsT0FBT29GLE1BQVAsRUFBL0IsRUFBZ0QsZUFBaEQsQ0FBdEI7O0FBQ0EsUUFBSSxDQUFDRSxhQUFMLEVBQW9CO0FBQ25CLFlBQU0sSUFBSXRGLE9BQU9DLEtBQVgsQ0FBaUIsMEJBQWpCLEVBQTZDLDZCQUE3QyxFQUE0RTtBQUNqRm9GLGdCQUFRLFlBRHlFO0FBRWpGRyxnQkFBUTtBQUZ5RSxPQUE1RSxDQUFOO0FBSUE7O0FBRUQsV0FBTzlGLFdBQVdDLE1BQVgsQ0FBa0I2QixVQUFsQixDQUE2QnpCLEtBQTdCLENBQVA7QUFDQSxHQW5DYTs7QUFxQ2RILFdBQVNDLGFBQVQsRUFBd0JDLFdBQXhCLEVBQXFDQyxLQUFyQyxFQUE0QztBQUMzQyxRQUFJLENBQUNDLE9BQU9vRixNQUFQLEVBQUwsRUFBc0I7QUFDckIsWUFBTSxJQUFJcEYsT0FBT0MsS0FBWCxDQUFpQixvQkFBakIsRUFBdUMsY0FBdkMsRUFBdUQ7QUFDNURvRixnQkFBUTtBQURvRCxPQUF2RCxDQUFOO0FBR0E7O0FBRUQsVUFBTUMsZ0JBQWdCNUYsV0FBVzZGLEtBQVgsQ0FBaUJELGFBQWpCLENBQStCdEYsT0FBT29GLE1BQVAsRUFBL0IsRUFBZ0QsZUFBaEQsQ0FBdEI7O0FBQ0EsUUFBSSxDQUFDRSxhQUFMLEVBQW9CO0FBQ25CLFlBQU0sSUFBSXRGLE9BQU9DLEtBQVgsQ0FBaUIsMEJBQWpCLEVBQTZDLDZCQUE3QyxFQUE0RTtBQUNqRm9GLGdCQUFRLFVBRHlFO0FBRWpGRyxnQkFBUTtBQUZ5RSxPQUE1RSxDQUFOO0FBSUE7O0FBRUQ5RixlQUFXQyxNQUFYLENBQWtCQyxRQUFsQixDQUEyQkMsYUFBM0IsRUFBMENDLFdBQTFDLEVBQXVEQyxLQUF2RDtBQUNBOztBQXJEYSxDQUFmO0FBd0RBMEYsT0FBT0MsZUFBUCxDQUF1QkMsR0FBdkIsQ0FBMkIsVUFBM0IsRUFBdUMzRixPQUFPZSxlQUFQLENBQXVCLFVBQVM2RSxHQUFULEVBQWNDLEdBQWQsRUFBbUJDLElBQW5CLEVBQXlCO0FBQ3RGLFFBQU1DLFNBQVM7QUFDZGhHLFdBQU9pRyxtQkFBbUJKLElBQUl6RSxHQUFKLENBQVFjLE9BQVIsQ0FBZ0IsS0FBaEIsRUFBdUIsRUFBdkIsRUFBMkJBLE9BQTNCLENBQW1DLE9BQW5DLEVBQTRDLEVBQTVDLENBQW5CLEVBQW9FQSxPQUFwRSxDQUE0RSxVQUE1RSxFQUF3RixFQUF4RjtBQURPLEdBQWY7QUFJQSxRQUFNM0IsT0FBT3ZDLE9BQU9nSSxPQUFPaEcsS0FBZCxLQUF3QmhDLE9BQU9nSSxPQUFPaEcsS0FBZCxFQUFxQm9DLEtBQTFEOztBQUVBLE1BQUksQ0FBQzdCLElBQUwsRUFBVztBQUNWLFFBQUl2QyxPQUFPZ0ksT0FBT2hHLEtBQWQsS0FBd0JoQyxPQUFPZ0ksT0FBT2hHLEtBQWQsRUFBcUI3QixVQUFqRCxFQUE2RDtBQUM1RDBILFVBQUl6RSxHQUFKLEdBQVcsSUFBSXBELE9BQU9nSSxPQUFPaEcsS0FBZCxFQUFxQjdCLFVBQVksRUFBaEQ7QUFDQTBHLHNCQUFnQnFCLHFCQUFoQixDQUFzQ3JCLGdCQUFnQkMsV0FBdEQsRUFBbUVlLEdBQW5FLEVBQXdFQyxHQUF4RSxFQUE2RUMsSUFBN0U7QUFDQSxLQUhELE1BR087QUFDTkQsVUFBSUssU0FBSixDQUFjLEdBQWQ7QUFDQUwsVUFBSU0sR0FBSjtBQUNBOztBQUVEO0FBQ0E7O0FBRUQsUUFBTUMsb0JBQW9CUixJQUFJUyxPQUFKLENBQVksbUJBQVosQ0FBMUI7O0FBQ0EsTUFBSUQsaUJBQUosRUFBdUI7QUFDdEIsUUFBSUEsdUJBQXVCOUYsS0FBSzZDLFVBQUwsSUFBbUI3QyxLQUFLNkMsVUFBTCxDQUFnQm1ELFdBQWhCLEVBQTFDLENBQUosRUFBOEU7QUFDN0VULFVBQUlVLFNBQUosQ0FBYyxlQUFkLEVBQStCSCxpQkFBL0I7QUFDQVAsVUFBSUssU0FBSixDQUFjLEdBQWQ7QUFDQUwsVUFBSU0sR0FBSjtBQUNBO0FBQ0E7QUFDRDs7QUFFRE4sTUFBSVUsU0FBSixDQUFjLGVBQWQsRUFBK0IsbUJBQS9CO0FBQ0FWLE1BQUlVLFNBQUosQ0FBYyxTQUFkLEVBQXlCLElBQXpCO0FBQ0FWLE1BQUlVLFNBQUosQ0FBYyxlQUFkLEVBQWdDakcsS0FBSzZDLFVBQUwsSUFBbUI3QyxLQUFLNkMsVUFBTCxDQUFnQm1ELFdBQWhCLEVBQXBCLElBQXNELElBQUlFLElBQUosR0FBV0YsV0FBWCxFQUFyRjtBQUNBVCxNQUFJVSxTQUFKLENBQWMsY0FBZCxFQUE4QmpHLEtBQUtSLFdBQW5DO0FBQ0ErRixNQUFJVSxTQUFKLENBQWMsZ0JBQWQsRUFBZ0NqRyxLQUFLMkMsSUFBckM7QUFDQTRDLE1BQUlLLFNBQUosQ0FBYyxHQUFkO0FBQ0FMLE1BQUlNLEdBQUosQ0FBUTdGLEtBQUswQyxPQUFiO0FBQ0EsQ0FwQ3NDLENBQXZDLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfYXNzZXRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFsIFdlYkFwcEhhc2hpbmcsIFdlYkFwcEludGVybmFscyAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbmltcG9ydCBzaXplT2YgZnJvbSAnaW1hZ2Utc2l6ZSc7XG5pbXBvcnQgbWltZSBmcm9tICdtaW1lLXR5cGUvd2l0aC1kYic7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbm1pbWUuZXh0ZW5zaW9uc1snaW1hZ2Uvdm5kLm1pY3Jvc29mdC5pY29uJ10gPSBbJ2ljbyddO1xuXG5jb25zdCBSb2NrZXRDaGF0QXNzZXRzSW5zdGFuY2UgPSBuZXcgUm9ja2V0Q2hhdEZpbGUuR3JpZEZTKHtcblx0bmFtZTogJ2Fzc2V0cydcbn0pO1xuXG50aGlzLlJvY2tldENoYXRBc3NldHNJbnN0YW5jZSA9IFJvY2tldENoYXRBc3NldHNJbnN0YW5jZTtcblxuY29uc3QgYXNzZXRzID0ge1xuXHRsb2dvOiB7XG5cdFx0bGFiZWw6ICdsb2dvIChzdmcsIHBuZywganBnKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2xvZ28uc3ZnJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsnc3ZnJywgJ3BuZycsICdqcGcnLCAnanBlZyddLFxuXHRcdFx0d2lkdGg6IHVuZGVmaW5lZCxcblx0XHRcdGhlaWdodDogdW5kZWZpbmVkXG5cdFx0fSxcblx0XHR3aXphcmQ6IHtcblx0XHRcdHN0ZXA6IDMsXG5cdFx0XHRvcmRlcjogMlxuXHRcdH1cblx0fSxcblx0YmFja2dyb3VuZDoge1xuXHRcdGxhYmVsOiAnbG9naW4gYmFja2dyb3VuZCAoc3ZnLCBwbmcsIGpwZyknLFxuXHRcdGRlZmF1bHRVcmw6IHVuZGVmaW5lZCxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsnc3ZnJywgJ3BuZycsICdqcGcnLCAnanBlZyddLFxuXHRcdFx0d2lkdGg6IHVuZGVmaW5lZCxcblx0XHRcdGhlaWdodDogdW5kZWZpbmVkXG5cdFx0fVxuXHR9LFxuXHRmYXZpY29uX2ljbzoge1xuXHRcdGxhYmVsOiAnZmF2aWNvbiAoaWNvKScsXG5cdFx0ZGVmYXVsdFVybDogJ2Zhdmljb24uaWNvJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsnaWNvJ10sXG5cdFx0XHR3aWR0aDogdW5kZWZpbmVkLFxuXHRcdFx0aGVpZ2h0OiB1bmRlZmluZWRcblx0XHR9XG5cdH0sXG5cdGZhdmljb246IHtcblx0XHRsYWJlbDogJ2Zhdmljb24gKHN2ZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9pY29uLnN2ZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3N2ZyddLFxuXHRcdFx0d2lkdGg6IHVuZGVmaW5lZCxcblx0XHRcdGhlaWdodDogdW5kZWZpbmVkXG5cdFx0fVxuXHR9LFxuXHRmYXZpY29uXzE2OiB7XG5cdFx0bGFiZWw6ICdmYXZpY29uIDE2eDE2IChwbmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vZmF2aWNvbi0xNngxNi5wbmcnLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydwbmcnXSxcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdGhlaWdodDogMTZcblx0XHR9XG5cdH0sXG5cdGZhdmljb25fMzI6IHtcblx0XHRsYWJlbDogJ2Zhdmljb24gMzJ4MzIgKHBuZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9mYXZpY29uLTMyeDMyLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0aGVpZ2h0OiAzMlxuXHRcdH1cblx0fSxcblx0ZmF2aWNvbl8xOTI6IHtcblx0XHRsYWJlbDogJ2FuZHJvaWQtY2hyb21lIDE5MngxOTIgKHBuZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9hbmRyb2lkLWNocm9tZS0xOTJ4MTkyLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDE5Mixcblx0XHRcdGhlaWdodDogMTkyXG5cdFx0fVxuXHR9LFxuXHRmYXZpY29uXzUxMjoge1xuXHRcdGxhYmVsOiAnYW5kcm9pZC1jaHJvbWUgNTEyeDUxMiAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2FuZHJvaWQtY2hyb21lLTUxMng1MTIucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogNTEyLFxuXHRcdFx0aGVpZ2h0OiA1MTJcblx0XHR9XG5cdH0sXG5cdHRvdWNoaWNvbl8xODA6IHtcblx0XHRsYWJlbDogJ2FwcGxlLXRvdWNoLWljb24gMTgweDE4MCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2FwcGxlLXRvdWNoLWljb24ucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMTgwLFxuXHRcdFx0aGVpZ2h0OiAxODBcblx0XHR9XG5cdH0sXG5cdHRvdWNoaWNvbl8xODBfcHJlOiB7XG5cdFx0bGFiZWw6ICdhcHBsZS10b3VjaC1pY29uLXByZWNvbXBvc2VkIDE4MHgxODAgKHBuZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9hcHBsZS10b3VjaC1pY29uLXByZWNvbXBvc2VkLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDE4MCxcblx0XHRcdGhlaWdodDogMTgwXG5cdFx0fVxuXHR9LFxuXHR0aWxlXzcwOiB7XG5cdFx0bGFiZWw6ICdtc3RpbGUgNzB4NzAgKHBuZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9tc3RpbGUtNzB4NzAucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMTQ0LFxuXHRcdFx0aGVpZ2h0OiAxNDRcblx0XHR9XG5cdH0sXG5cdHRpbGVfMTQ0OiB7XG5cdFx0bGFiZWw6ICdtc3RpbGUgMTQ0eDE0NCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL21zdGlsZS0xNDR4MTQ0LnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDE0NCxcblx0XHRcdGhlaWdodDogMTQ0XG5cdFx0fVxuXHR9LFxuXHR0aWxlXzE1MDoge1xuXHRcdGxhYmVsOiAnbXN0aWxlIDE1MHgxNTAgKHBuZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9tc3RpbGUtMTUweDE1MC5wbmcnLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydwbmcnXSxcblx0XHRcdHdpZHRoOiAxNTAsXG5cdFx0XHRoZWlnaHQ6IDE1MFxuXHRcdH1cblx0fSxcblx0dGlsZV8zMTBfc3F1YXJlOiB7XG5cdFx0bGFiZWw6ICdtc3RpbGUgMzEweDMxMCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL21zdGlsZS0zMTB4MzEwLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDMxMCxcblx0XHRcdGhlaWdodDogMzEwXG5cdFx0fVxuXHR9LFxuXHR0aWxlXzMxMF93aWRlOiB7XG5cdFx0bGFiZWw6ICdtc3RpbGUgMzEweDE1MCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL21zdGlsZS0zMTB4MTUwLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDMxMCxcblx0XHRcdGhlaWdodDogMTUwXG5cdFx0fVxuXHR9LFxuXHRzYWZhcmlfcGlubmVkOiB7XG5cdFx0bGFiZWw6ICdzYWZhcmkgcGlubmVkIHRhYiAoc3ZnKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL3NhZmFyaS1waW5uZWQtdGFiLnN2ZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3N2ZyddLFxuXHRcdFx0d2lkdGg6IHVuZGVmaW5lZCxcblx0XHRcdGhlaWdodDogdW5kZWZpbmVkXG5cdFx0fVxuXHR9XG59O1xuXG5Sb2NrZXRDaGF0LkFzc2V0cyA9IG5ldyAoY2xhc3Mge1xuXHRnZXQgbWltZSgpIHtcblx0XHRyZXR1cm4gbWltZTtcblx0fVxuXG5cdGdldCBhc3NldHMoKSB7XG5cdFx0cmV0dXJuIGFzc2V0cztcblx0fVxuXG5cdHNldEFzc2V0KGJpbmFyeUNvbnRlbnQsIGNvbnRlbnRUeXBlLCBhc3NldCkge1xuXHRcdGlmICghYXNzZXRzW2Fzc2V0XSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1hc3NldCcsICdJbnZhbGlkIGFzc2V0Jywge1xuXHRcdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuQXNzZXRzLnNldEFzc2V0J1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZXh0ZW5zaW9uID0gbWltZS5leHRlbnNpb24oY29udGVudFR5cGUpO1xuXHRcdGlmIChhc3NldHNbYXNzZXRdLmNvbnN0cmFpbnRzLmV4dGVuc2lvbnMuaW5jbHVkZXMoZXh0ZW5zaW9uKSA9PT0gZmFsc2UpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoY29udGVudFR5cGUsIGBJbnZhbGlkIGZpbGUgdHlwZTogJHsgY29udGVudFR5cGUgfWAsIHtcblx0XHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LkFzc2V0cy5zZXRBc3NldCcsXG5cdFx0XHRcdGVycm9yVGl0bGU6ICdlcnJvci1pbnZhbGlkLWZpbGUtdHlwZSdcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbGUgPSBuZXcgQnVmZmVyKGJpbmFyeUNvbnRlbnQsICdiaW5hcnknKTtcblx0XHRpZiAoYXNzZXRzW2Fzc2V0XS5jb25zdHJhaW50cy53aWR0aCB8fCBhc3NldHNbYXNzZXRdLmNvbnN0cmFpbnRzLmhlaWdodCkge1xuXHRcdFx0Y29uc3QgZGltZW5zaW9ucyA9IHNpemVPZihmaWxlKTtcblx0XHRcdGlmIChhc3NldHNbYXNzZXRdLmNvbnN0cmFpbnRzLndpZHRoICYmIGFzc2V0c1thc3NldF0uY29uc3RyYWludHMud2lkdGggIT09IGRpbWVuc2lvbnMud2lkdGgpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1maWxlLXdpZHRoJywgJ0ludmFsaWQgZmlsZSB3aWR0aCcsIHtcblx0XHRcdFx0XHRmdW5jdGlvbjogJ0ludmFsaWQgZmlsZSB3aWR0aCdcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoYXNzZXRzW2Fzc2V0XS5jb25zdHJhaW50cy5oZWlnaHQgJiYgYXNzZXRzW2Fzc2V0XS5jb25zdHJhaW50cy5oZWlnaHQgIT09IGRpbWVuc2lvbnMuaGVpZ2h0KSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtZmlsZS1oZWlnaHQnKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCBycyA9IFJvY2tldENoYXRGaWxlLmJ1ZmZlclRvU3RyZWFtKGZpbGUpO1xuXHRcdFJvY2tldENoYXRBc3NldHNJbnN0YW5jZS5kZWxldGVGaWxlKGFzc2V0KTtcblxuXHRcdGNvbnN0IHdzID0gUm9ja2V0Q2hhdEFzc2V0c0luc3RhbmNlLmNyZWF0ZVdyaXRlU3RyZWFtKGFzc2V0LCBjb250ZW50VHlwZSk7XG5cdFx0d3Mub24oJ2VuZCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gTWV0ZW9yLnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnN0IGtleSA9IGBBc3NldHNfJHsgYXNzZXQgfWA7XG5cdFx0XHRcdGNvbnN0IHZhbHVlID0ge1xuXHRcdFx0XHRcdHVybDogYGFzc2V0cy8keyBhc3NldCB9LiR7IGV4dGVuc2lvbiB9YCxcblx0XHRcdFx0XHRkZWZhdWx0VXJsOiBhc3NldHNbYXNzZXRdLmRlZmF1bHRVcmxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoa2V5LCB2YWx1ZSk7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5wcm9jZXNzQXNzZXQoa2V5LCB2YWx1ZSk7XG5cdFx0XHR9LCAyMDApO1xuXHRcdH0pKTtcblxuXHRcdHJzLnBpcGUod3MpO1xuXHR9XG5cblx0dW5zZXRBc3NldChhc3NldCkge1xuXHRcdGlmICghYXNzZXRzW2Fzc2V0XSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1hc3NldCcsICdJbnZhbGlkIGFzc2V0Jywge1xuXHRcdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuQXNzZXRzLnVuc2V0QXNzZXQnXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0QXNzZXRzSW5zdGFuY2UuZGVsZXRlRmlsZShhc3NldCk7XG5cdFx0Y29uc3Qga2V5ID0gYEFzc2V0c18keyBhc3NldCB9YDtcblx0XHRjb25zdCB2YWx1ZSA9IHtcblx0XHRcdGRlZmF1bHRVcmw6IGFzc2V0c1thc3NldF0uZGVmYXVsdFVybFxuXHRcdH07XG5cblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoa2V5LCB2YWx1ZSk7XG5cdFx0Um9ja2V0Q2hhdC5Bc3NldHMucHJvY2Vzc0Fzc2V0KGtleSwgdmFsdWUpO1xuXHR9XG5cblx0cmVmcmVzaENsaWVudHMoKSB7XG5cdFx0cmV0dXJuIHByb2Nlc3MuZW1pdCgnbWVzc2FnZScsIHtcblx0XHRcdHJlZnJlc2g6ICdjbGllbnQnXG5cdFx0fSk7XG5cdH1cblxuXHRwcm9jZXNzQXNzZXQoc2V0dGluZ0tleSwgc2V0dGluZ1ZhbHVlKSB7XG5cdFx0aWYgKHNldHRpbmdLZXkuaW5kZXhPZignQXNzZXRzXycpICE9PSAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgYXNzZXRLZXkgPSBzZXR0aW5nS2V5LnJlcGxhY2UoL15Bc3NldHNfLywgJycpO1xuXHRcdGNvbnN0IGFzc2V0VmFsdWUgPSBhc3NldHNbYXNzZXRLZXldO1xuXG5cdFx0aWYgKCFhc3NldFZhbHVlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCFzZXR0aW5nVmFsdWUgfHwgIXNldHRpbmdWYWx1ZS51cmwpIHtcblx0XHRcdGFzc2V0VmFsdWUuY2FjaGUgPSB1bmRlZmluZWQ7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlsZSA9IFJvY2tldENoYXRBc3NldHNJbnN0YW5jZS5nZXRGaWxlU3luYyhhc3NldEtleSk7XG5cdFx0aWYgKCFmaWxlKSB7XG5cdFx0XHRhc3NldFZhbHVlLmNhY2hlID0gdW5kZWZpbmVkO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMScpLnVwZGF0ZShmaWxlLmJ1ZmZlcikuZGlnZXN0KCdoZXgnKTtcblx0XHRjb25zdCBleHRlbnNpb24gPSBzZXR0aW5nVmFsdWUudXJsLnNwbGl0KCcuJykucG9wKCk7XG5cblx0XHRyZXR1cm4gYXNzZXRWYWx1ZS5jYWNoZSA9IHtcblx0XHRcdHBhdGg6IGBhc3NldHMvJHsgYXNzZXRLZXkgfS4keyBleHRlbnNpb24gfWAsXG5cdFx0XHRjYWNoZWFibGU6IGZhbHNlLFxuXHRcdFx0c291cmNlTWFwVXJsOiB1bmRlZmluZWQsXG5cdFx0XHR3aGVyZTogJ2NsaWVudCcsXG5cdFx0XHR0eXBlOiAnYXNzZXQnLFxuXHRcdFx0Y29udGVudDogZmlsZS5idWZmZXIsXG5cdFx0XHRleHRlbnNpb24sXG5cdFx0XHR1cmw6IGAvYXNzZXRzLyR7IGFzc2V0S2V5IH0uJHsgZXh0ZW5zaW9uIH0/JHsgaGFzaCB9YCxcblx0XHRcdHNpemU6IGZpbGUubGVuZ3RoLFxuXHRcdFx0dXBsb2FkRGF0ZTogZmlsZS51cGxvYWREYXRlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZpbGUuY29udGVudFR5cGUsXG5cdFx0XHRoYXNoXG5cdFx0fTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ0Fzc2V0cycpO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnQXNzZXRzX1N2Z0Zhdmljb25fRW5hYmxlJywgdHJ1ZSwge1xuXHR0eXBlOiAnYm9vbGVhbicsXG5cdGdyb3VwOiAnQXNzZXRzJyxcblx0aTE4bkxhYmVsOiAnRW5hYmxlX1N2Z19GYXZpY29uJ1xufSk7XG5cbmZ1bmN0aW9uIGFkZEFzc2V0VG9TZXR0aW5nKGtleSwgdmFsdWUpIHtcblx0cmV0dXJuIFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBBc3NldHNfJHsga2V5IH1gLCB7XG5cdFx0ZGVmYXVsdFVybDogdmFsdWUuZGVmYXVsdFVybFxuXHR9LCB7XG5cdFx0dHlwZTogJ2Fzc2V0Jyxcblx0XHRncm91cDogJ0Fzc2V0cycsXG5cdFx0ZmlsZUNvbnN0cmFpbnRzOiB2YWx1ZS5jb25zdHJhaW50cyxcblx0XHRpMThuTGFiZWw6IHZhbHVlLmxhYmVsLFxuXHRcdGFzc2V0OiBrZXksXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHdpemFyZDogdmFsdWUud2l6YXJkXG5cdH0pO1xufVxuXG5mb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhc3NldHMpKSB7XG5cdGNvbnN0IHZhbHVlID0gYXNzZXRzW2tleV07XG5cdGFkZEFzc2V0VG9TZXR0aW5nKGtleSwgdmFsdWUpO1xufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKCkub2JzZXJ2ZSh7XG5cdGFkZGVkKHJlY29yZCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5wcm9jZXNzQXNzZXQocmVjb3JkLl9pZCwgcmVjb3JkLnZhbHVlKTtcblx0fSxcblxuXHRjaGFuZ2VkKHJlY29yZCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5wcm9jZXNzQXNzZXQocmVjb3JkLl9pZCwgcmVjb3JkLnZhbHVlKTtcblx0fSxcblxuXHRyZW1vdmVkKHJlY29yZCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5wcm9jZXNzQXNzZXQocmVjb3JkLl9pZCwgdW5kZWZpbmVkKTtcblx0fVxufSk7XG5cbk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gTWV0ZW9yLnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHByb2Nlc3MuZW1pdCgnbWVzc2FnZScsIHtcblx0XHRcdHJlZnJlc2g6ICdjbGllbnQnXG5cdFx0fSk7XG5cdH0sIDIwMCk7XG59KTtcblxuY29uc3QgY2FsY3VsYXRlQ2xpZW50SGFzaCA9IFdlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaDtcblxuV2ViQXBwSGFzaGluZy5jYWxjdWxhdGVDbGllbnRIYXNoID0gZnVuY3Rpb24obWFuaWZlc3QsIGluY2x1ZGVGaWx0ZXIsIHJ1bnRpbWVDb25maWdPdmVycmlkZSkge1xuXHRmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhc3NldHMpKSB7XG5cdFx0Y29uc3QgdmFsdWUgPSBhc3NldHNba2V5XTtcblx0XHRpZiAoIXZhbHVlLmNhY2hlICYmICF2YWx1ZS5kZWZhdWx0VXJsKSB7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHRsZXQgY2FjaGUgPSB7fTtcblx0XHRpZiAodmFsdWUuY2FjaGUpIHtcblx0XHRcdGNhY2hlID0ge1xuXHRcdFx0XHRwYXRoOiB2YWx1ZS5jYWNoZS5wYXRoLFxuXHRcdFx0XHRjYWNoZWFibGU6IHZhbHVlLmNhY2hlLmNhY2hlYWJsZSxcblx0XHRcdFx0c291cmNlTWFwVXJsOiB2YWx1ZS5jYWNoZS5zb3VyY2VNYXBVcmwsXG5cdFx0XHRcdHdoZXJlOiB2YWx1ZS5jYWNoZS53aGVyZSxcblx0XHRcdFx0dHlwZTogdmFsdWUuY2FjaGUudHlwZSxcblx0XHRcdFx0dXJsOiB2YWx1ZS5jYWNoZS51cmwsXG5cdFx0XHRcdHNpemU6IHZhbHVlLmNhY2hlLnNpemUsXG5cdFx0XHRcdGhhc2g6IHZhbHVlLmNhY2hlLmhhc2hcblx0XHRcdH07XG5cdFx0XHRXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvYXNzZXRzLyR7IGtleSB9YF0gPSB2YWx1ZS5jYWNoZTtcblx0XHRcdFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc1tgL19fY29yZG92YS9hc3NldHMvJHsga2V5IH0uJHsgdmFsdWUuY2FjaGUuZXh0ZW5zaW9uIH1gXSA9IHZhbHVlLmNhY2hlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zdCBleHRlbnNpb24gPSB2YWx1ZS5kZWZhdWx0VXJsLnNwbGl0KCcuJykucG9wKCk7XG5cdFx0XHRjYWNoZSA9IHtcblx0XHRcdFx0cGF0aDogYGFzc2V0cy8keyBrZXkgfS4keyBleHRlbnNpb24gfWAsXG5cdFx0XHRcdGNhY2hlYWJsZTogZmFsc2UsXG5cdFx0XHRcdHNvdXJjZU1hcFVybDogdW5kZWZpbmVkLFxuXHRcdFx0XHR3aGVyZTogJ2NsaWVudCcsXG5cdFx0XHRcdHR5cGU6ICdhc3NldCcsXG5cdFx0XHRcdHVybDogYC9hc3NldHMvJHsga2V5IH0uJHsgZXh0ZW5zaW9uIH0/djNgLFxuXHRcdFx0XHRoYXNoOiAndjMnXG5cdFx0XHR9O1xuXG5cdFx0XHRXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvYXNzZXRzLyR7IGtleSB9YF0gPSBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvJHsgdmFsdWUuZGVmYXVsdFVybCB9YF07XG5cdFx0XHRXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvYXNzZXRzLyR7IGtleSB9LiR7IGV4dGVuc2lvbiB9YF0gPSBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvJHsgdmFsdWUuZGVmYXVsdFVybCB9YF07XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWFuaWZlc3RJdGVtID0gXy5maW5kV2hlcmUobWFuaWZlc3QsIHtcblx0XHRcdHBhdGg6IGtleVxuXHRcdH0pO1xuXG5cdFx0aWYgKG1hbmlmZXN0SXRlbSkge1xuXHRcdFx0Y29uc3QgaW5kZXggPSBtYW5pZmVzdC5pbmRleE9mKG1hbmlmZXN0SXRlbSk7XG5cdFx0XHRtYW5pZmVzdFtpbmRleF0gPSBjYWNoZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWFuaWZlc3QucHVzaChjYWNoZSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2guY2FsbCh0aGlzLCBtYW5pZmVzdCwgaW5jbHVkZUZpbHRlciwgcnVudGltZUNvbmZpZ092ZXJyaWRlKTtcbn07XG5cbk1ldGVvci5tZXRob2RzKHtcblx0cmVmcmVzaENsaWVudHMoKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3JlZnJlc2hDbGllbnRzJ1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaGFzUGVybWlzc2lvbiA9IFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdtYW5hZ2UtYXNzZXRzJyk7XG5cdFx0aWYgKCFoYXNQZXJtaXNzaW9uKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnTWFuYWdpbmcgYXNzZXRzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdyZWZyZXNoQ2xpZW50cycsXG5cdFx0XHRcdGFjdGlvbjogJ01hbmFnaW5nX2Fzc2V0cydcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5yZWZyZXNoQ2xpZW50cygpO1xuXHR9LFxuXG5cdHVuc2V0QXNzZXQoYXNzZXQpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdFx0bWV0aG9kOiAndW5zZXRBc3NldCdcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGhhc1Blcm1pc3Npb24gPSBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnbWFuYWdlLWFzc2V0cycpO1xuXHRcdGlmICghaGFzUGVybWlzc2lvbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ01hbmFnaW5nIGFzc2V0cyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAndW5zZXRBc3NldCcsXG5cdFx0XHRcdGFjdGlvbjogJ01hbmFnaW5nX2Fzc2V0cydcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy51bnNldEFzc2V0KGFzc2V0KTtcblx0fSxcblxuXHRzZXRBc3NldChiaW5hcnlDb250ZW50LCBjb250ZW50VHlwZSwgYXNzZXQpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdFx0bWV0aG9kOiAnc2V0QXNzZXQnXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBoYXNQZXJtaXNzaW9uID0gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ21hbmFnZS1hc3NldHMnKTtcblx0XHRpZiAoIWhhc1Blcm1pc3Npb24pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdNYW5hZ2luZyBhc3NldHMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3NldEFzc2V0Jyxcblx0XHRcdFx0YWN0aW9uOiAnTWFuYWdpbmdfYXNzZXRzJ1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5Bc3NldHMuc2V0QXNzZXQoYmluYXJ5Q29udGVudCwgY29udGVudFR5cGUsIGFzc2V0KTtcblx0fVxufSk7XG5cbldlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKCcvYXNzZXRzLycsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcblx0Y29uc3QgcGFyYW1zID0ge1xuXHRcdGFzc2V0OiBkZWNvZGVVUklDb21wb25lbnQocmVxLnVybC5yZXBsYWNlKC9eXFwvLywgJycpLnJlcGxhY2UoL1xcPy4qJC8sICcnKSkucmVwbGFjZSgvXFwuW14uXSokLywgJycpXG5cdH07XG5cblx0Y29uc3QgZmlsZSA9IGFzc2V0c1twYXJhbXMuYXNzZXRdICYmIGFzc2V0c1twYXJhbXMuYXNzZXRdLmNhY2hlO1xuXG5cdGlmICghZmlsZSkge1xuXHRcdGlmIChhc3NldHNbcGFyYW1zLmFzc2V0XSAmJiBhc3NldHNbcGFyYW1zLmFzc2V0XS5kZWZhdWx0VXJsKSB7XG5cdFx0XHRyZXEudXJsID0gYC8keyBhc3NldHNbcGFyYW1zLmFzc2V0XS5kZWZhdWx0VXJsIH1gO1xuXHRcdFx0V2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzTWlkZGxld2FyZShXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXMsIHJlcSwgcmVzLCBuZXh0KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDQpO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdH1cblxuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IHJlcU1vZGlmaWVkSGVhZGVyID0gcmVxLmhlYWRlcnNbJ2lmLW1vZGlmaWVkLXNpbmNlJ107XG5cdGlmIChyZXFNb2RpZmllZEhlYWRlcikge1xuXHRcdGlmIChyZXFNb2RpZmllZEhlYWRlciA9PT0gKGZpbGUudXBsb2FkRGF0ZSAmJiBmaWxlLnVwbG9hZERhdGUudG9VVENTdHJpbmcoKSkpIHtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCByZXFNb2RpZmllZEhlYWRlcik7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDMwNCk7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cblx0cmVzLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsICdwdWJsaWMsIG1heC1hZ2U9MCcpO1xuXHRyZXMuc2V0SGVhZGVyKCdFeHBpcmVzJywgJy0xJyk7XG5cdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCAoZmlsZS51cGxvYWREYXRlICYmIGZpbGUudXBsb2FkRGF0ZS50b1VUQ1N0cmluZygpKSB8fCBuZXcgRGF0ZSgpLnRvVVRDU3RyaW5nKCkpO1xuXHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCBmaWxlLmNvbnRlbnRUeXBlKTtcblx0cmVzLnNldEhlYWRlcignQ29udGVudC1MZW5ndGgnLCBmaWxlLnNpemUpO1xuXHRyZXMud3JpdGVIZWFkKDIwMCk7XG5cdHJlcy5lbmQoZmlsZS5jb250ZW50KTtcbn0pKTtcbiJdfQ==
