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

function addAssetToSetting(asset, value) {
  const key = `Assets_${asset}`;
  RocketChat.settings.add(key, {
    defaultUrl: value.defaultUrl
  }, {
    type: 'asset',
    group: 'Assets',
    fileConstraints: value.constraints,
    i18nLabel: value.label,
    asset,
    public: true,
    wizard: value.wizard
  });
  const currentValue = RocketChat.settings.get(key);

  if (typeof currentValue === 'object' && currentValue.defaultUrl !== assets[asset].defaultUrl) {
    currentValue.defaultUrl = assets[asset].defaultUrl;
    RocketChat.settings.updateById(key, currentValue);
  }
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
const {
  calculateClientHash
} = WebAppHashing;

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphc3NldHMvc2VydmVyL2Fzc2V0cy5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJzaXplT2YiLCJtaW1lIiwiY3J5cHRvIiwiZXh0ZW5zaW9ucyIsIlJvY2tldENoYXRBc3NldHNJbnN0YW5jZSIsIlJvY2tldENoYXRGaWxlIiwiR3JpZEZTIiwibmFtZSIsImFzc2V0cyIsImxvZ28iLCJsYWJlbCIsImRlZmF1bHRVcmwiLCJjb25zdHJhaW50cyIsInR5cGUiLCJ3aWR0aCIsInVuZGVmaW5lZCIsImhlaWdodCIsIndpemFyZCIsInN0ZXAiLCJvcmRlciIsImJhY2tncm91bmQiLCJmYXZpY29uX2ljbyIsImZhdmljb24iLCJmYXZpY29uXzE2IiwiZmF2aWNvbl8zMiIsImZhdmljb25fMTkyIiwiZmF2aWNvbl81MTIiLCJ0b3VjaGljb25fMTgwIiwidG91Y2hpY29uXzE4MF9wcmUiLCJ0aWxlXzcwIiwidGlsZV8xNDQiLCJ0aWxlXzE1MCIsInRpbGVfMzEwX3NxdWFyZSIsInRpbGVfMzEwX3dpZGUiLCJzYWZhcmlfcGlubmVkIiwiUm9ja2V0Q2hhdCIsIkFzc2V0cyIsInNldEFzc2V0IiwiYmluYXJ5Q29udGVudCIsImNvbnRlbnRUeXBlIiwiYXNzZXQiLCJNZXRlb3IiLCJFcnJvciIsImZ1bmN0aW9uIiwiZXh0ZW5zaW9uIiwiaW5jbHVkZXMiLCJlcnJvclRpdGxlIiwiZmlsZSIsIkJ1ZmZlciIsImRpbWVuc2lvbnMiLCJycyIsImJ1ZmZlclRvU3RyZWFtIiwiZGVsZXRlRmlsZSIsIndzIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJvbiIsImJpbmRFbnZpcm9ubWVudCIsInNldFRpbWVvdXQiLCJrZXkiLCJ2YWx1ZSIsInVybCIsInNldHRpbmdzIiwidXBkYXRlQnlJZCIsInByb2Nlc3NBc3NldCIsInBpcGUiLCJ1bnNldEFzc2V0IiwicmVmcmVzaENsaWVudHMiLCJwcm9jZXNzIiwiZW1pdCIsInJlZnJlc2giLCJzZXR0aW5nS2V5Iiwic2V0dGluZ1ZhbHVlIiwiaW5kZXhPZiIsImFzc2V0S2V5IiwicmVwbGFjZSIsImFzc2V0VmFsdWUiLCJjYWNoZSIsImdldEZpbGVTeW5jIiwiaGFzaCIsImNyZWF0ZUhhc2giLCJ1cGRhdGUiLCJidWZmZXIiLCJkaWdlc3QiLCJzcGxpdCIsInBvcCIsInBhdGgiLCJjYWNoZWFibGUiLCJzb3VyY2VNYXBVcmwiLCJ3aGVyZSIsImNvbnRlbnQiLCJzaXplIiwibGVuZ3RoIiwidXBsb2FkRGF0ZSIsImFkZEdyb3VwIiwiYWRkIiwiZ3JvdXAiLCJpMThuTGFiZWwiLCJhZGRBc3NldFRvU2V0dGluZyIsImZpbGVDb25zdHJhaW50cyIsInB1YmxpYyIsImN1cnJlbnRWYWx1ZSIsImdldCIsIk9iamVjdCIsImtleXMiLCJtb2RlbHMiLCJTZXR0aW5ncyIsImZpbmQiLCJvYnNlcnZlIiwiYWRkZWQiLCJyZWNvcmQiLCJfaWQiLCJjaGFuZ2VkIiwicmVtb3ZlZCIsInN0YXJ0dXAiLCJjYWxjdWxhdGVDbGllbnRIYXNoIiwiV2ViQXBwSGFzaGluZyIsIm1hbmlmZXN0IiwiaW5jbHVkZUZpbHRlciIsInJ1bnRpbWVDb25maWdPdmVycmlkZSIsIldlYkFwcEludGVybmFscyIsInN0YXRpY0ZpbGVzIiwibWFuaWZlc3RJdGVtIiwiZmluZFdoZXJlIiwiaW5kZXgiLCJwdXNoIiwiY2FsbCIsIm1ldGhvZHMiLCJ1c2VySWQiLCJtZXRob2QiLCJoYXNQZXJtaXNzaW9uIiwiYXV0aHoiLCJhY3Rpb24iLCJXZWJBcHAiLCJjb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJyZXEiLCJyZXMiLCJuZXh0IiwicGFyYW1zIiwiZGVjb2RlVVJJQ29tcG9uZW50Iiwic3RhdGljRmlsZXNNaWRkbGV3YXJlIiwid3JpdGVIZWFkIiwiZW5kIiwicmVxTW9kaWZpZWRIZWFkZXIiLCJoZWFkZXJzIiwidG9VVENTdHJpbmciLCJzZXRIZWFkZXIi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QUFjLEdBQWQ7QUFDQUwsVUFBSU0sR0FBSjtBQUNBOztBQUVEO0FBQ0E7O0FBRUQsUUFBTUMsb0JBQW9CUixJQUFJUyxPQUFKLENBQVksbUJBQVosQ0FBMUI7O0FBQ0EsTUFBSUQsaUJBQUosRUFBdUI7QUFDdEIsUUFBSUEsdUJBQXVCaEcsS0FBSzZDLFVBQUwsSUFBbUI3QyxLQUFLNkMsVUFBTCxDQUFnQnFELFdBQWhCLEVBQTFDLENBQUosRUFBOEU7QUFDN0VULFVBQUlVLFNBQUosQ0FBYyxlQUFkLEVBQStCSCxpQkFBL0I7QUFDQVAsVUFBSUssU0FBSixDQUFjLEdBQWQ7QUFDQUwsVUFBSU0sR0FBSjtBQUNBO0FBQ0E7QUFDRDs7QUFFRE4sTUFBSVUsU0FBSixDQUFjLGVBQWQsRUFBK0IsbUJBQS9CO0FBQ0FWLE1BQUlVLFNBQUosQ0FBYyxTQUFkLEVBQXlCLElBQXpCO0FBQ0FWLE1BQUlVLFNBQUosQ0FBYyxlQUFkLEVBQWdDbkcsS0FBSzZDLFVBQUwsSUFBbUI3QyxLQUFLNkMsVUFBTCxDQUFnQnFELFdBQWhCLEVBQXBCLElBQXNELElBQUlFLElBQUosR0FBV0YsV0FBWCxFQUFyRjtBQUNBVCxNQUFJVSxTQUFKLENBQWMsY0FBZCxFQUE4Qm5HLEtBQUtSLFdBQW5DO0FBQ0FpRyxNQUFJVSxTQUFKLENBQWMsZ0JBQWQsRUFBZ0NuRyxLQUFLMkMsSUFBckM7QUFDQThDLE1BQUlLLFNBQUosQ0FBYyxHQUFkO0FBQ0FMLE1BQUlNLEdBQUosQ0FBUS9GLEtBQUswQyxPQUFiO0FBQ0EsQ0FwQ3NDLENBQXZDLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfYXNzZXRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFsIFdlYkFwcEhhc2hpbmcsIFdlYkFwcEludGVybmFscyAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbmltcG9ydCBzaXplT2YgZnJvbSAnaW1hZ2Utc2l6ZSc7XG5pbXBvcnQgbWltZSBmcm9tICdtaW1lLXR5cGUvd2l0aC1kYic7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbm1pbWUuZXh0ZW5zaW9uc1snaW1hZ2Uvdm5kLm1pY3Jvc29mdC5pY29uJ10gPSBbJ2ljbyddO1xuXG5jb25zdCBSb2NrZXRDaGF0QXNzZXRzSW5zdGFuY2UgPSBuZXcgUm9ja2V0Q2hhdEZpbGUuR3JpZEZTKHtcblx0bmFtZTogJ2Fzc2V0cycsXG59KTtcblxudGhpcy5Sb2NrZXRDaGF0QXNzZXRzSW5zdGFuY2UgPSBSb2NrZXRDaGF0QXNzZXRzSW5zdGFuY2U7XG5cbmNvbnN0IGFzc2V0cyA9IHtcblx0bG9nbzoge1xuXHRcdGxhYmVsOiAnbG9nbyAoc3ZnLCBwbmcsIGpwZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9sb2dvLnN2ZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3N2ZycsICdwbmcnLCAnanBnJywgJ2pwZWcnXSxcblx0XHRcdHdpZHRoOiB1bmRlZmluZWQsXG5cdFx0XHRoZWlnaHQ6IHVuZGVmaW5lZCxcblx0XHR9LFxuXHRcdHdpemFyZDoge1xuXHRcdFx0c3RlcDogMyxcblx0XHRcdG9yZGVyOiAyLFxuXHRcdH0sXG5cdH0sXG5cdGJhY2tncm91bmQ6IHtcblx0XHRsYWJlbDogJ2xvZ2luIGJhY2tncm91bmQgKHN2ZywgcG5nLCBqcGcpJyxcblx0XHRkZWZhdWx0VXJsOiB1bmRlZmluZWQsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3N2ZycsICdwbmcnLCAnanBnJywgJ2pwZWcnXSxcblx0XHRcdHdpZHRoOiB1bmRlZmluZWQsXG5cdFx0XHRoZWlnaHQ6IHVuZGVmaW5lZCxcblx0XHR9LFxuXHR9LFxuXHRmYXZpY29uX2ljbzoge1xuXHRcdGxhYmVsOiAnZmF2aWNvbiAoaWNvKScsXG5cdFx0ZGVmYXVsdFVybDogJ2Zhdmljb24uaWNvJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsnaWNvJ10sXG5cdFx0XHR3aWR0aDogdW5kZWZpbmVkLFxuXHRcdFx0aGVpZ2h0OiB1bmRlZmluZWQsXG5cdFx0fSxcblx0fSxcblx0ZmF2aWNvbjoge1xuXHRcdGxhYmVsOiAnZmF2aWNvbiAoc3ZnKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2ljb24uc3ZnJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsnc3ZnJ10sXG5cdFx0XHR3aWR0aDogdW5kZWZpbmVkLFxuXHRcdFx0aGVpZ2h0OiB1bmRlZmluZWQsXG5cdFx0fSxcblx0fSxcblx0ZmF2aWNvbl8xNjoge1xuXHRcdGxhYmVsOiAnZmF2aWNvbiAxNngxNiAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2Zhdmljb24tMTZ4MTYucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdH0sXG5cdH0sXG5cdGZhdmljb25fMzI6IHtcblx0XHRsYWJlbDogJ2Zhdmljb24gMzJ4MzIgKHBuZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9mYXZpY29uLTMyeDMyLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0aGVpZ2h0OiAzMixcblx0XHR9LFxuXHR9LFxuXHRmYXZpY29uXzE5Mjoge1xuXHRcdGxhYmVsOiAnYW5kcm9pZC1jaHJvbWUgMTkyeDE5MiAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2FuZHJvaWQtY2hyb21lLTE5MngxOTIucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMTkyLFxuXHRcdFx0aGVpZ2h0OiAxOTIsXG5cdFx0fSxcblx0fSxcblx0ZmF2aWNvbl81MTI6IHtcblx0XHRsYWJlbDogJ2FuZHJvaWQtY2hyb21lIDUxMng1MTIgKHBuZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9hbmRyb2lkLWNocm9tZS01MTJ4NTEyLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDUxMixcblx0XHRcdGhlaWdodDogNTEyLFxuXHRcdH0sXG5cdH0sXG5cdHRvdWNoaWNvbl8xODA6IHtcblx0XHRsYWJlbDogJ2FwcGxlLXRvdWNoLWljb24gMTgweDE4MCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2FwcGxlLXRvdWNoLWljb24ucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMTgwLFxuXHRcdFx0aGVpZ2h0OiAxODAsXG5cdFx0fSxcblx0fSxcblx0dG91Y2hpY29uXzE4MF9wcmU6IHtcblx0XHRsYWJlbDogJ2FwcGxlLXRvdWNoLWljb24tcHJlY29tcG9zZWQgMTgweDE4MCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2FwcGxlLXRvdWNoLWljb24tcHJlY29tcG9zZWQucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMTgwLFxuXHRcdFx0aGVpZ2h0OiAxODAsXG5cdFx0fSxcblx0fSxcblx0dGlsZV83MDoge1xuXHRcdGxhYmVsOiAnbXN0aWxlIDcweDcwIChwbmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vbXN0aWxlLTcweDcwLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDE0NCxcblx0XHRcdGhlaWdodDogMTQ0LFxuXHRcdH0sXG5cdH0sXG5cdHRpbGVfMTQ0OiB7XG5cdFx0bGFiZWw6ICdtc3RpbGUgMTQ0eDE0NCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL21zdGlsZS0xNDR4MTQ0LnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDE0NCxcblx0XHRcdGhlaWdodDogMTQ0LFxuXHRcdH0sXG5cdH0sXG5cdHRpbGVfMTUwOiB7XG5cdFx0bGFiZWw6ICdtc3RpbGUgMTUweDE1MCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL21zdGlsZS0xNTB4MTUwLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDE1MCxcblx0XHRcdGhlaWdodDogMTUwLFxuXHRcdH0sXG5cdH0sXG5cdHRpbGVfMzEwX3NxdWFyZToge1xuXHRcdGxhYmVsOiAnbXN0aWxlIDMxMHgzMTAgKHBuZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9tc3RpbGUtMzEweDMxMC5wbmcnLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydwbmcnXSxcblx0XHRcdHdpZHRoOiAzMTAsXG5cdFx0XHRoZWlnaHQ6IDMxMCxcblx0XHR9LFxuXHR9LFxuXHR0aWxlXzMxMF93aWRlOiB7XG5cdFx0bGFiZWw6ICdtc3RpbGUgMzEweDE1MCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL21zdGlsZS0zMTB4MTUwLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDMxMCxcblx0XHRcdGhlaWdodDogMTUwLFxuXHRcdH0sXG5cdH0sXG5cdHNhZmFyaV9waW5uZWQ6IHtcblx0XHRsYWJlbDogJ3NhZmFyaSBwaW5uZWQgdGFiIChzdmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vc2FmYXJpLXBpbm5lZC10YWIuc3ZnJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsnc3ZnJ10sXG5cdFx0XHR3aWR0aDogdW5kZWZpbmVkLFxuXHRcdFx0aGVpZ2h0OiB1bmRlZmluZWQsXG5cdFx0fSxcblx0fSxcbn07XG5cblJvY2tldENoYXQuQXNzZXRzID0gbmV3IChjbGFzcyB7XG5cdGdldCBtaW1lKCkge1xuXHRcdHJldHVybiBtaW1lO1xuXHR9XG5cblx0Z2V0IGFzc2V0cygpIHtcblx0XHRyZXR1cm4gYXNzZXRzO1xuXHR9XG5cblx0c2V0QXNzZXQoYmluYXJ5Q29udGVudCwgY29udGVudFR5cGUsIGFzc2V0KSB7XG5cdFx0aWYgKCFhc3NldHNbYXNzZXRdKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWFzc2V0JywgJ0ludmFsaWQgYXNzZXQnLCB7XG5cdFx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5Bc3NldHMuc2V0QXNzZXQnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZXh0ZW5zaW9uID0gbWltZS5leHRlbnNpb24oY29udGVudFR5cGUpO1xuXHRcdGlmIChhc3NldHNbYXNzZXRdLmNvbnN0cmFpbnRzLmV4dGVuc2lvbnMuaW5jbHVkZXMoZXh0ZW5zaW9uKSA9PT0gZmFsc2UpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoY29udGVudFR5cGUsIGBJbnZhbGlkIGZpbGUgdHlwZTogJHsgY29udGVudFR5cGUgfWAsIHtcblx0XHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LkFzc2V0cy5zZXRBc3NldCcsXG5cdFx0XHRcdGVycm9yVGl0bGU6ICdlcnJvci1pbnZhbGlkLWZpbGUtdHlwZScsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBmaWxlID0gbmV3IEJ1ZmZlcihiaW5hcnlDb250ZW50LCAnYmluYXJ5Jyk7XG5cdFx0aWYgKGFzc2V0c1thc3NldF0uY29uc3RyYWludHMud2lkdGggfHwgYXNzZXRzW2Fzc2V0XS5jb25zdHJhaW50cy5oZWlnaHQpIHtcblx0XHRcdGNvbnN0IGRpbWVuc2lvbnMgPSBzaXplT2YoZmlsZSk7XG5cdFx0XHRpZiAoYXNzZXRzW2Fzc2V0XS5jb25zdHJhaW50cy53aWR0aCAmJiBhc3NldHNbYXNzZXRdLmNvbnN0cmFpbnRzLndpZHRoICE9PSBkaW1lbnNpb25zLndpZHRoKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtZmlsZS13aWR0aCcsICdJbnZhbGlkIGZpbGUgd2lkdGgnLCB7XG5cdFx0XHRcdFx0ZnVuY3Rpb246ICdJbnZhbGlkIGZpbGUgd2lkdGgnLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChhc3NldHNbYXNzZXRdLmNvbnN0cmFpbnRzLmhlaWdodCAmJiBhc3NldHNbYXNzZXRdLmNvbnN0cmFpbnRzLmhlaWdodCAhPT0gZGltZW5zaW9ucy5oZWlnaHQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1maWxlLWhlaWdodCcpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IHJzID0gUm9ja2V0Q2hhdEZpbGUuYnVmZmVyVG9TdHJlYW0oZmlsZSk7XG5cdFx0Um9ja2V0Q2hhdEFzc2V0c0luc3RhbmNlLmRlbGV0ZUZpbGUoYXNzZXQpO1xuXG5cdFx0Y29uc3Qgd3MgPSBSb2NrZXRDaGF0QXNzZXRzSW5zdGFuY2UuY3JlYXRlV3JpdGVTdHJlYW0oYXNzZXQsIGNvbnRlbnRUeXBlKTtcblx0XHR3cy5vbignZW5kJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBNZXRlb3Iuc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc3Qga2V5ID0gYEFzc2V0c18keyBhc3NldCB9YDtcblx0XHRcdFx0Y29uc3QgdmFsdWUgPSB7XG5cdFx0XHRcdFx0dXJsOiBgYXNzZXRzLyR7IGFzc2V0IH0uJHsgZXh0ZW5zaW9uIH1gLFxuXHRcdFx0XHRcdGRlZmF1bHRVcmw6IGFzc2V0c1thc3NldF0uZGVmYXVsdFVybCxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoa2V5LCB2YWx1ZSk7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5wcm9jZXNzQXNzZXQoa2V5LCB2YWx1ZSk7XG5cdFx0XHR9LCAyMDApO1xuXHRcdH0pKTtcblxuXHRcdHJzLnBpcGUod3MpO1xuXHR9XG5cblx0dW5zZXRBc3NldChhc3NldCkge1xuXHRcdGlmICghYXNzZXRzW2Fzc2V0XSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1hc3NldCcsICdJbnZhbGlkIGFzc2V0Jywge1xuXHRcdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuQXNzZXRzLnVuc2V0QXNzZXQnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdEFzc2V0c0luc3RhbmNlLmRlbGV0ZUZpbGUoYXNzZXQpO1xuXHRcdGNvbnN0IGtleSA9IGBBc3NldHNfJHsgYXNzZXQgfWA7XG5cdFx0Y29uc3QgdmFsdWUgPSB7XG5cdFx0XHRkZWZhdWx0VXJsOiBhc3NldHNbYXNzZXRdLmRlZmF1bHRVcmwsXG5cdFx0fTtcblxuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZChrZXksIHZhbHVlKTtcblx0XHRSb2NrZXRDaGF0LkFzc2V0cy5wcm9jZXNzQXNzZXQoa2V5LCB2YWx1ZSk7XG5cdH1cblxuXHRyZWZyZXNoQ2xpZW50cygpIHtcblx0XHRyZXR1cm4gcHJvY2Vzcy5lbWl0KCdtZXNzYWdlJywge1xuXHRcdFx0cmVmcmVzaDogJ2NsaWVudCcsXG5cdFx0fSk7XG5cdH1cblxuXHRwcm9jZXNzQXNzZXQoc2V0dGluZ0tleSwgc2V0dGluZ1ZhbHVlKSB7XG5cdFx0aWYgKHNldHRpbmdLZXkuaW5kZXhPZignQXNzZXRzXycpICE9PSAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgYXNzZXRLZXkgPSBzZXR0aW5nS2V5LnJlcGxhY2UoL15Bc3NldHNfLywgJycpO1xuXHRcdGNvbnN0IGFzc2V0VmFsdWUgPSBhc3NldHNbYXNzZXRLZXldO1xuXG5cdFx0aWYgKCFhc3NldFZhbHVlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCFzZXR0aW5nVmFsdWUgfHwgIXNldHRpbmdWYWx1ZS51cmwpIHtcblx0XHRcdGFzc2V0VmFsdWUuY2FjaGUgPSB1bmRlZmluZWQ7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlsZSA9IFJvY2tldENoYXRBc3NldHNJbnN0YW5jZS5nZXRGaWxlU3luYyhhc3NldEtleSk7XG5cdFx0aWYgKCFmaWxlKSB7XG5cdFx0XHRhc3NldFZhbHVlLmNhY2hlID0gdW5kZWZpbmVkO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMScpLnVwZGF0ZShmaWxlLmJ1ZmZlcikuZGlnZXN0KCdoZXgnKTtcblx0XHRjb25zdCBleHRlbnNpb24gPSBzZXR0aW5nVmFsdWUudXJsLnNwbGl0KCcuJykucG9wKCk7XG5cblx0XHRyZXR1cm4gYXNzZXRWYWx1ZS5jYWNoZSA9IHtcblx0XHRcdHBhdGg6IGBhc3NldHMvJHsgYXNzZXRLZXkgfS4keyBleHRlbnNpb24gfWAsXG5cdFx0XHRjYWNoZWFibGU6IGZhbHNlLFxuXHRcdFx0c291cmNlTWFwVXJsOiB1bmRlZmluZWQsXG5cdFx0XHR3aGVyZTogJ2NsaWVudCcsXG5cdFx0XHR0eXBlOiAnYXNzZXQnLFxuXHRcdFx0Y29udGVudDogZmlsZS5idWZmZXIsXG5cdFx0XHRleHRlbnNpb24sXG5cdFx0XHR1cmw6IGAvYXNzZXRzLyR7IGFzc2V0S2V5IH0uJHsgZXh0ZW5zaW9uIH0/JHsgaGFzaCB9YCxcblx0XHRcdHNpemU6IGZpbGUubGVuZ3RoLFxuXHRcdFx0dXBsb2FkRGF0ZTogZmlsZS51cGxvYWREYXRlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZpbGUuY29udGVudFR5cGUsXG5cdFx0XHRoYXNoLFxuXHRcdH07XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdBc3NldHMnKTtcblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0Fzc2V0c19TdmdGYXZpY29uX0VuYWJsZScsIHRydWUsIHtcblx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRncm91cDogJ0Fzc2V0cycsXG5cdGkxOG5MYWJlbDogJ0VuYWJsZV9TdmdfRmF2aWNvbicsXG59KTtcblxuZnVuY3Rpb24gYWRkQXNzZXRUb1NldHRpbmcoYXNzZXQsIHZhbHVlKSB7XG5cdGNvbnN0IGtleSA9IGBBc3NldHNfJHsgYXNzZXQgfWA7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoa2V5LCB7XG5cdFx0ZGVmYXVsdFVybDogdmFsdWUuZGVmYXVsdFVybCxcblx0fSwge1xuXHRcdHR5cGU6ICdhc3NldCcsXG5cdFx0Z3JvdXA6ICdBc3NldHMnLFxuXHRcdGZpbGVDb25zdHJhaW50czogdmFsdWUuY29uc3RyYWludHMsXG5cdFx0aTE4bkxhYmVsOiB2YWx1ZS5sYWJlbCxcblx0XHRhc3NldCxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0d2l6YXJkOiB2YWx1ZS53aXphcmQsXG5cdH0pO1xuXG5cdGNvbnN0IGN1cnJlbnRWYWx1ZSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGtleSk7XG5cblx0aWYgKHR5cGVvZiBjdXJyZW50VmFsdWUgPT09ICdvYmplY3QnICYmIGN1cnJlbnRWYWx1ZS5kZWZhdWx0VXJsICE9PSBhc3NldHNbYXNzZXRdLmRlZmF1bHRVcmwpIHtcblx0XHRjdXJyZW50VmFsdWUuZGVmYXVsdFVybCA9IGFzc2V0c1thc3NldF0uZGVmYXVsdFVybDtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoa2V5LCBjdXJyZW50VmFsdWUpO1xuXHR9XG59XG5cbmZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGFzc2V0cykpIHtcblx0Y29uc3QgdmFsdWUgPSBhc3NldHNba2V5XTtcblx0YWRkQXNzZXRUb1NldHRpbmcoa2V5LCB2YWx1ZSk7XG59XG5cblJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmQoKS5vYnNlcnZlKHtcblx0YWRkZWQocmVjb3JkKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQXNzZXRzLnByb2Nlc3NBc3NldChyZWNvcmQuX2lkLCByZWNvcmQudmFsdWUpO1xuXHR9LFxuXG5cdGNoYW5nZWQocmVjb3JkKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQXNzZXRzLnByb2Nlc3NBc3NldChyZWNvcmQuX2lkLCByZWNvcmQudmFsdWUpO1xuXHR9LFxuXG5cdHJlbW92ZWQocmVjb3JkKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQXNzZXRzLnByb2Nlc3NBc3NldChyZWNvcmQuX2lkLCB1bmRlZmluZWQpO1xuXHR9LFxufSk7XG5cbk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gTWV0ZW9yLnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHByb2Nlc3MuZW1pdCgnbWVzc2FnZScsIHtcblx0XHRcdHJlZnJlc2g6ICdjbGllbnQnLFxuXHRcdH0pO1xuXHR9LCAyMDApO1xufSk7XG5cbmNvbnN0IHsgY2FsY3VsYXRlQ2xpZW50SGFzaCB9ID0gV2ViQXBwSGFzaGluZztcblxuV2ViQXBwSGFzaGluZy5jYWxjdWxhdGVDbGllbnRIYXNoID0gZnVuY3Rpb24obWFuaWZlc3QsIGluY2x1ZGVGaWx0ZXIsIHJ1bnRpbWVDb25maWdPdmVycmlkZSkge1xuXHRmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhc3NldHMpKSB7XG5cdFx0Y29uc3QgdmFsdWUgPSBhc3NldHNba2V5XTtcblx0XHRpZiAoIXZhbHVlLmNhY2hlICYmICF2YWx1ZS5kZWZhdWx0VXJsKSB7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHRsZXQgY2FjaGUgPSB7fTtcblx0XHRpZiAodmFsdWUuY2FjaGUpIHtcblx0XHRcdGNhY2hlID0ge1xuXHRcdFx0XHRwYXRoOiB2YWx1ZS5jYWNoZS5wYXRoLFxuXHRcdFx0XHRjYWNoZWFibGU6IHZhbHVlLmNhY2hlLmNhY2hlYWJsZSxcblx0XHRcdFx0c291cmNlTWFwVXJsOiB2YWx1ZS5jYWNoZS5zb3VyY2VNYXBVcmwsXG5cdFx0XHRcdHdoZXJlOiB2YWx1ZS5jYWNoZS53aGVyZSxcblx0XHRcdFx0dHlwZTogdmFsdWUuY2FjaGUudHlwZSxcblx0XHRcdFx0dXJsOiB2YWx1ZS5jYWNoZS51cmwsXG5cdFx0XHRcdHNpemU6IHZhbHVlLmNhY2hlLnNpemUsXG5cdFx0XHRcdGhhc2g6IHZhbHVlLmNhY2hlLmhhc2gsXG5cdFx0XHR9O1xuXHRcdFx0V2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzW2AvX19jb3Jkb3ZhL2Fzc2V0cy8keyBrZXkgfWBdID0gdmFsdWUuY2FjaGU7XG5cdFx0XHRXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvYXNzZXRzLyR7IGtleSB9LiR7IHZhbHVlLmNhY2hlLmV4dGVuc2lvbiB9YF0gPSB2YWx1ZS5jYWNoZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc3QgZXh0ZW5zaW9uID0gdmFsdWUuZGVmYXVsdFVybC5zcGxpdCgnLicpLnBvcCgpO1xuXHRcdFx0Y2FjaGUgPSB7XG5cdFx0XHRcdHBhdGg6IGBhc3NldHMvJHsga2V5IH0uJHsgZXh0ZW5zaW9uIH1gLFxuXHRcdFx0XHRjYWNoZWFibGU6IGZhbHNlLFxuXHRcdFx0XHRzb3VyY2VNYXBVcmw6IHVuZGVmaW5lZCxcblx0XHRcdFx0d2hlcmU6ICdjbGllbnQnLFxuXHRcdFx0XHR0eXBlOiAnYXNzZXQnLFxuXHRcdFx0XHR1cmw6IGAvYXNzZXRzLyR7IGtleSB9LiR7IGV4dGVuc2lvbiB9P3YzYCxcblx0XHRcdFx0aGFzaDogJ3YzJyxcblx0XHRcdH07XG5cblx0XHRcdFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc1tgL19fY29yZG92YS9hc3NldHMvJHsga2V5IH1gXSA9IFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc1tgL19fY29yZG92YS8keyB2YWx1ZS5kZWZhdWx0VXJsIH1gXTtcblx0XHRcdFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc1tgL19fY29yZG92YS9hc3NldHMvJHsga2V5IH0uJHsgZXh0ZW5zaW9uIH1gXSA9IFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc1tgL19fY29yZG92YS8keyB2YWx1ZS5kZWZhdWx0VXJsIH1gXTtcblx0XHR9XG5cblx0XHRjb25zdCBtYW5pZmVzdEl0ZW0gPSBfLmZpbmRXaGVyZShtYW5pZmVzdCwge1xuXHRcdFx0cGF0aDoga2V5LFxuXHRcdH0pO1xuXG5cdFx0aWYgKG1hbmlmZXN0SXRlbSkge1xuXHRcdFx0Y29uc3QgaW5kZXggPSBtYW5pZmVzdC5pbmRleE9mKG1hbmlmZXN0SXRlbSk7XG5cdFx0XHRtYW5pZmVzdFtpbmRleF0gPSBjYWNoZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWFuaWZlc3QucHVzaChjYWNoZSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2guY2FsbCh0aGlzLCBtYW5pZmVzdCwgaW5jbHVkZUZpbHRlciwgcnVudGltZUNvbmZpZ092ZXJyaWRlKTtcbn07XG5cbk1ldGVvci5tZXRob2RzKHtcblx0cmVmcmVzaENsaWVudHMoKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3JlZnJlc2hDbGllbnRzJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGhhc1Blcm1pc3Npb24gPSBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnbWFuYWdlLWFzc2V0cycpO1xuXHRcdGlmICghaGFzUGVybWlzc2lvbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ01hbmFnaW5nIGFzc2V0cyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAncmVmcmVzaENsaWVudHMnLFxuXHRcdFx0XHRhY3Rpb246ICdNYW5hZ2luZ19hc3NldHMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQXNzZXRzLnJlZnJlc2hDbGllbnRzKCk7XG5cdH0sXG5cblx0dW5zZXRBc3NldChhc3NldCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHRtZXRob2Q6ICd1bnNldEFzc2V0Jyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGhhc1Blcm1pc3Npb24gPSBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnbWFuYWdlLWFzc2V0cycpO1xuXHRcdGlmICghaGFzUGVybWlzc2lvbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ01hbmFnaW5nIGFzc2V0cyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAndW5zZXRBc3NldCcsXG5cdFx0XHRcdGFjdGlvbjogJ01hbmFnaW5nX2Fzc2V0cycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5Bc3NldHMudW5zZXRBc3NldChhc3NldCk7XG5cdH0sXG5cblx0c2V0QXNzZXQoYmluYXJ5Q29udGVudCwgY29udGVudFR5cGUsIGFzc2V0KSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3NldEFzc2V0Jyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGhhc1Blcm1pc3Npb24gPSBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnbWFuYWdlLWFzc2V0cycpO1xuXHRcdGlmICghaGFzUGVybWlzc2lvbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ01hbmFnaW5nIGFzc2V0cyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnc2V0QXNzZXQnLFxuXHRcdFx0XHRhY3Rpb246ICdNYW5hZ2luZ19hc3NldHMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5Bc3NldHMuc2V0QXNzZXQoYmluYXJ5Q29udGVudCwgY29udGVudFR5cGUsIGFzc2V0KTtcblx0fSxcbn0pO1xuXG5XZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZSgnL2Fzc2V0cy8nLCBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdGNvbnN0IHBhcmFtcyA9IHtcblx0XHRhc3NldDogZGVjb2RlVVJJQ29tcG9uZW50KHJlcS51cmwucmVwbGFjZSgvXlxcLy8sICcnKS5yZXBsYWNlKC9cXD8uKiQvLCAnJykpLnJlcGxhY2UoL1xcLlteLl0qJC8sICcnKSxcblx0fTtcblxuXHRjb25zdCBmaWxlID0gYXNzZXRzW3BhcmFtcy5hc3NldF0gJiYgYXNzZXRzW3BhcmFtcy5hc3NldF0uY2FjaGU7XG5cblx0aWYgKCFmaWxlKSB7XG5cdFx0aWYgKGFzc2V0c1twYXJhbXMuYXNzZXRdICYmIGFzc2V0c1twYXJhbXMuYXNzZXRdLmRlZmF1bHRVcmwpIHtcblx0XHRcdHJlcS51cmwgPSBgLyR7IGFzc2V0c1twYXJhbXMuYXNzZXRdLmRlZmF1bHRVcmwgfWA7XG5cdFx0XHRXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNNaWRkbGV3YXJlKFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlcywgcmVxLCByZXMsIG5leHQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDQwNCk7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgcmVxTW9kaWZpZWRIZWFkZXIgPSByZXEuaGVhZGVyc1snaWYtbW9kaWZpZWQtc2luY2UnXTtcblx0aWYgKHJlcU1vZGlmaWVkSGVhZGVyKSB7XG5cdFx0aWYgKHJlcU1vZGlmaWVkSGVhZGVyID09PSAoZmlsZS51cGxvYWREYXRlICYmIGZpbGUudXBsb2FkRGF0ZS50b1VUQ1N0cmluZygpKSkge1xuXHRcdFx0cmVzLnNldEhlYWRlcignTGFzdC1Nb2RpZmllZCcsIHJlcU1vZGlmaWVkSGVhZGVyKTtcblx0XHRcdHJlcy53cml0ZUhlYWQoMzA0KTtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH1cblxuXHRyZXMuc2V0SGVhZGVyKCdDYWNoZS1Db250cm9sJywgJ3B1YmxpYywgbWF4LWFnZT0wJyk7XG5cdHJlcy5zZXRIZWFkZXIoJ0V4cGlyZXMnLCAnLTEnKTtcblx0cmVzLnNldEhlYWRlcignTGFzdC1Nb2RpZmllZCcsIChmaWxlLnVwbG9hZERhdGUgJiYgZmlsZS51cGxvYWREYXRlLnRvVVRDU3RyaW5nKCkpIHx8IG5ldyBEYXRlKCkudG9VVENTdHJpbmcoKSk7XG5cdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsIGZpbGUuY29udGVudFR5cGUpO1xuXHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIGZpbGUuc2l6ZSk7XG5cdHJlcy53cml0ZUhlYWQoMjAwKTtcblx0cmVzLmVuZChmaWxlLmNvbnRlbnQpO1xufSkpO1xuIl19
