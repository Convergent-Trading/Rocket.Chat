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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:markdown":{"settings.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/settings.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 1);
Meteor.startup(() => {
  RocketChat.settings.add('Markdown_Parser', 'original', {
    type: 'select',
    values: [{
      key: 'disabled',
      i18nLabel: 'Disabled'
    }, {
      key: 'original',
      i18nLabel: 'Original'
    }, {
      key: 'marked',
      i18nLabel: 'Marked'
    }],
    group: 'Message',
    section: 'Markdown',
    public: true
  });
  const enableQueryOriginal = {
    _id: 'Markdown_Parser',
    value: 'original'
  };
  RocketChat.settings.add('Markdown_Headers', false, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryOriginal
  });
  RocketChat.settings.add('Markdown_SupportSchemesForLink', 'http,https', {
    type: 'string',
    group: 'Message',
    section: 'Markdown',
    public: true,
    i18nDescription: 'Markdown_SupportSchemesForLink_Description',
    enableQuery: enableQueryOriginal
  });
  const enableQueryMarked = {
    _id: 'Markdown_Parser',
    value: 'marked'
  };
  RocketChat.settings.add('Markdown_Marked_GFM', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
  RocketChat.settings.add('Markdown_Marked_Tables', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
  RocketChat.settings.add('Markdown_Marked_Breaks', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
  RocketChat.settings.add('Markdown_Marked_Pedantic', false, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: [{
      _id: 'Markdown_Parser',
      value: 'marked'
    }, {
      _id: 'Markdown_Marked_GFM',
      value: false
    }]
  });
  RocketChat.settings.add('Markdown_Marked_SmartLists', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
  RocketChat.settings.add('Markdown_Marked_Smartypants', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"markdown.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/markdown.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let Blaze;
module.watch(require("meteor/blaze"), {
  Blaze(v) {
    Blaze = v;
  }

}, 2);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 3);
let marked;
module.watch(require("./parser/marked/marked.js"), {
  marked(v) {
    marked = v;
  }

}, 4);
let original;
module.watch(require("./parser/original/original.js"), {
  original(v) {
    original = v;
  }

}, 5);
let code;
module.watch(require("./parser/original/code.js"), {
  code(v) {
    code = v;
  }

}, 6);
const parsers = {
  original,
  marked
};

class MarkdownClass {
  parse(text) {
    const message = {
      html: s.escapeHTML(text)
    };
    return this.mountTokensBack(this.parseMessageNotEscaped(message)).html;
  }

  parseNotEscaped(text) {
    const message = {
      html: text
    };
    return this.mountTokensBack(this.parseMessageNotEscaped(message)).html;
  }

  parseMessageNotEscaped(message) {
    const parser = RocketChat.settings.get('Markdown_Parser');

    if (parser === 'disabled') {
      return message;
    }

    if (typeof parsers[parser] === 'function') {
      return parsers[parser](message);
    }

    return parsers['original'](message);
  }

  mountTokensBack(message, useHtml = true) {
    if (message.tokens && message.tokens.length > 0) {
      for (const _ref of message.tokens) {
        const {
          token,
          text,
          noHtml
        } = _ref;
        message.html = message.html.replace(token, () => useHtml ? text : noHtml); // Uses lambda so doesn't need to escape $
      }
    }

    return message;
  }

  code(...args) {
    return code(...args);
  }

}

const Markdown = new MarkdownClass();
RocketChat.Markdown = Markdown; // renderMessage already did html escape

const MarkdownMessage = message => {
  if (s.trim(message != null ? message.html : undefined)) {
    message = Markdown.parseMessageNotEscaped(message);
  }

  return message;
};

RocketChat.callbacks.add('renderMessage', MarkdownMessage, RocketChat.callbacks.priority.HIGH, 'markdown');

if (Meteor.isClient) {
  Blaze.registerHelper('RocketChatMarkdown', text => Markdown.parse(text));
  Blaze.registerHelper('RocketChatMarkdownUnescape', text => Markdown.parseNotEscaped(text));
  Blaze.registerHelper('RocketChatMarkdownInline', text => {
    const output = Markdown.parse(text);
    return output.replace(/^<p>/, '').replace(/<\/p>$/, '');
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"parser":{"marked":{"marked.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/parser/marked/marked.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  marked: () => marked
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 1);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 2);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 3);
let hljs;
module.watch(require("highlight.js"), {
  default(v) {
    hljs = v;
  }

}, 4);

let _marked;

module.watch(require("marked"), {
  default(v) {
    _marked = v;
  }

}, 5);
const renderer = new _marked.Renderer();
let msg = null;

renderer.code = function (code, lang, escaped) {
  if (this.options.highlight) {
    const out = this.options.highlight(code, lang);

    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  let text = null;

  if (!lang) {
    text = `<pre><code class="code-colors hljs">${escaped ? code : s.escapeHTML(code, true)}</code></pre>`;
  } else {
    text = `<pre><code class="code-colors hljs ${escape(lang, true)}">${escaped ? code : s.escapeHTML(code, true)}</code></pre>`;
  }

  if (_.isString(msg)) {
    return text;
  }

  const token = `=!=${Random.id()}=!=`;
  msg.tokens.push({
    highlight: true,
    token,
    text
  });
  return token;
};

renderer.codespan = function (text) {
  text = `<code class="code-colors inline">${text}</code>`;

  if (_.isString(msg)) {
    return text;
  }

  const token = `=!=${Random.id()}=!=`;
  msg.tokens.push({
    token,
    text
  });
  return token;
};

renderer.blockquote = function (quote) {
  return `<blockquote class="background-transparent-darker-before">${quote}</blockquote>`;
};

const highlight = function (code, lang) {
  if (!lang) {
    return code;
  }

  try {
    return hljs.highlight(lang, code).value;
  } catch (e) {
    // Unknown language
    return code;
  }
};

let gfm = null;
let tables = null;
let breaks = null;
let pedantic = null;
let smartLists = null;
let smartypants = null;

const marked = message => {
  msg = message;

  if (!msg.tokens) {
    msg.tokens = [];
  }

  if (gfm == null) {
    gfm = RocketChat.settings.get('Markdown_Marked_GFM');
  }

  if (tables == null) {
    tables = RocketChat.settings.get('Markdown_Marked_Tables');
  }

  if (breaks == null) {
    breaks = RocketChat.settings.get('Markdown_Marked_Breaks');
  }

  if (pedantic == null) {
    pedantic = RocketChat.settings.get('Markdown_Marked_Pedantic');
  }

  if (smartLists == null) {
    smartLists = RocketChat.settings.get('Markdown_Marked_SmartLists');
  }

  if (smartypants == null) {
    smartypants = RocketChat.settings.get('Markdown_Marked_Smartypants');
  }

  msg.html = _marked(s.unescapeHTML(msg.html), {
    gfm,
    tables,
    breaks,
    pedantic,
    smartLists,
    smartypants,
    renderer,
    sanitize: true,
    highlight
  });
  return msg;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"original":{"code.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/parser/original/code.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  code: () => code
});
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);
let hljs;
module.watch(require("highlight.js"), {
  default(v) {
    hljs = v;
  }

}, 2);

const inlinecode = message => {
  // Support `text`
  return message.html = message.html.replace(/\`([^`\r\n]+)\`([<_*~]|\B|\b|$)/gm, (match, p1, p2) => {
    const token = ` =!=${Random.id()}=!=`;
    message.tokens.push({
      token,
      text: `<span class=\"copyonly\">\`</span><span><code class=\"code-colors inline\">${p1}</code></span><span class=\"copyonly\">\`</span>${p2}`,
      noHtml: match
    });
    return token;
  });
};

const codeblocks = message => {
  // Count occurencies of ```
  const count = (message.html.match(/```/g) || []).length;

  if (count) {
    // Check if we need to add a final ```
    if (count % 2 > 0) {
      message.html = `${message.html}\n\`\`\``;
      message.msg = `${message.msg}\n\`\`\``;
    } // Separate text in code blocks and non code blocks


    const msgParts = message.html.split(/(^.*)(```(?:[a-zA-Z]+)?(?:(?:.|\r|\n)*?)```)(.*\n?)$/gm);

    for (let index = 0; index < msgParts.length; index++) {
      // Verify if this part is code
      const part = msgParts[index];
      const codeMatch = part.match(/^```[\r\n]*(.*[\r\n\ ]?)[\r\n]*([\s\S]*?)```+?$/);

      if (codeMatch != null) {
        // Process highlight if this part is code
        const singleLine = codeMatch[0].indexOf('\n') === -1;
        const lang = !singleLine && Array.from(hljs.listLanguages()).includes(s.trim(codeMatch[1])) ? s.trim(codeMatch[1]) : '';
        const code = singleLine ? s.unescapeHTML(codeMatch[1]) : lang === '' ? s.unescapeHTML(codeMatch[1] + codeMatch[2]) : s.unescapeHTML(codeMatch[2]);
        const result = lang === '' ? hljs.highlightAuto(lang + code) : hljs.highlight(lang, code);
        const token = `=!=${Random.id()}=!=`;
        message.tokens.push({
          highlight: true,
          token,
          text: `<pre><code class='code-colors hljs ${result.language}'><span class='copyonly'>\`\`\`<br></span>${result.value}<span class='copyonly'><br>\`\`\`</span></code></pre>`,
          noHtml: codeMatch[0]
        });
        msgParts[index] = token;
      } else {
        msgParts[index] = part;
      }
    } // Re-mount message


    return message.html = msgParts.join('');
  }
};

const code = message => {
  if (s.trim(message.html)) {
    if (message.tokens == null) {
      message.tokens = [];
    }

    codeblocks(message);
    inlinecode(message);
  }

  return message;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"markdown.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/parser/original/markdown.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  markdown: () => markdown
});
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 1);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 2);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 3);

const parseNotEscaped = function (msg, message) {
  if (message && message.tokens == null) {
    message.tokens = [];
  }

  const addAsToken = function (html) {
    const token = `=!=${Random.id()}=!=`;
    message.tokens.push({
      token,
      text: html
    });
    return token;
  };

  const schemes = RocketChat.settings.get('Markdown_SupportSchemesForLink').split(',').join('|');

  if (RocketChat.settings.get('Markdown_Headers')) {
    // Support # Text for h1
    msg = msg.replace(/^# (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h1>$1</h1>'); // Support # Text for h2

    msg = msg.replace(/^## (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h2>$1</h2>'); // Support # Text for h3

    msg = msg.replace(/^### (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h3>$1</h3>'); // Support # Text for h4

    msg = msg.replace(/^#### (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h4>$1</h4>');
  } // Support *text* to make bold


  msg = msg.replace(/(^|&gt;|[ >_~`])\*{1,2}([^\*\r\n]+)\*{1,2}([<_~`]|\B|\b|$)/gm, '$1<span class="copyonly">*</span><strong>$2</strong><span class="copyonly">*</span>$3'); // Support _text_ to make italics

  msg = msg.replace(/(^|&gt;|[ >*~`])\_{1,2}([^\_\r\n]+)\_{1,2}([<*~`]|\B|\b|$)/gm, '$1<span class="copyonly">_</span><em>$2</em><span class="copyonly">_</span>$3'); // Support ~text~ to strike through text

  msg = msg.replace(/(^|&gt;|[ >_*`])\~{1,2}([^~\r\n]+)\~{1,2}([<_*`]|\B|\b|$)/gm, '$1<span class="copyonly">~</span><strike>$2</strike><span class="copyonly">~</span>$3'); // Support for block quote
  // >>>
  // Text
  // <<<

  msg = msg.replace(/(?:&gt;){3}\n+([\s\S]*?)\n+(?:&lt;){3}/g, '<blockquote class="background-transparent-darker-before"><span class="copyonly">&gt;&gt;&gt;</span>$1<span class="copyonly">&lt;&lt;&lt;</span></blockquote>'); // Support >Text for quote

  msg = msg.replace(/^&gt;(.*)$/gm, '<blockquote class="background-transparent-darker-before"><span class="copyonly">&gt;</span>$1</blockquote>'); // Remove white-space around blockquote (prevent <br>). Because blockquote is block element.

  msg = msg.replace(/\s*<blockquote class="background-transparent-darker-before">/gm, '<blockquote class="background-transparent-darker-before">');
  msg = msg.replace(/<\/blockquote>\s*/gm, '</blockquote>'); // Remove new-line between blockquotes.

  msg = msg.replace(/<\/blockquote>\n<blockquote/gm, '</blockquote><blockquote'); // Support ![alt text](http://image url)

  msg = msg.replace(new RegExp(`!\\[([^\\]]+)\\]\\(((?:${schemes}):\\/\\/[^\\)]+)\\)`, 'gm'), (match, title, url) => {
    const target = url.indexOf(Meteor.absoluteUrl()) === 0 ? '' : '_blank';
    return addAsToken(`<a href="${s.escapeHTML(url)}" title="${s.escapeHTML(title)}" target="${s.escapeHTML(target)}" rel="noopener noreferrer"><div class="inline-image" style="background-image: url(${s.escapeHTML(url)});"></div></a>`);
  }); // Support [Text](http://link)

  msg = msg.replace(new RegExp(`\\[([^\\]]+)\\]\\(((?:${schemes}):\\/\\/[^\\)]+)\\)`, 'gm'), (match, title, url) => {
    const target = url.indexOf(Meteor.absoluteUrl()) === 0 ? '' : '_blank';
    return addAsToken(`<a href="${s.escapeHTML(url)}" target="${s.escapeHTML(target)}" rel="noopener noreferrer">${s.escapeHTML(title)}</a>`);
  }); // Support <http://link|Text>

  msg = msg.replace(new RegExp(`(?:<|&lt;)((?:${schemes}):\\/\\/[^\\|]+)\\|(.+?)(?=>|&gt;)(?:>|&gt;)`, 'gm'), (match, url, title) => {
    const target = url.indexOf(Meteor.absoluteUrl()) === 0 ? '' : '_blank';
    return addAsToken(`<a href="${s.escapeHTML(url)}" target="${s.escapeHTML(target)}" rel="noopener noreferrer">${s.escapeHTML(title)}</a>`);
  });
  return msg;
};

const markdown = function (message) {
  message.html = parseNotEscaped(message.html, message);
  return message;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"original.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/parser/original/original.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  original: () => original
});
let markdown;
module.watch(require("./markdown.js"), {
  markdown(v) {
    markdown = v;
  }

}, 0);
let code;
module.watch(require("./code.js"), {
  code(v) {
    code = v;
  }

}, 1);

const original = message => {
  // Parse markdown code
  message = code(message); // Parse markdown

  message = markdown(message); // Replace linebreak to br

  message.html = message.html.replace(/\n/gm, '<br>');
  return message;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:markdown/settings.js");
var exports = require("/node_modules/meteor/rocketchat:markdown/markdown.js");

/* Exports */
Package._define("rocketchat:markdown", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_markdown.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9tYXJrZG93bi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9wYXJzZXIvbWFya2VkL21hcmtlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9wYXJzZXIvb3JpZ2luYWwvY29kZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9wYXJzZXIvb3JpZ2luYWwvbWFya2Rvd24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFya2Rvd24vcGFyc2VyL29yaWdpbmFsL29yaWdpbmFsLmpzIl0sIm5hbWVzIjpbIk1ldGVvciIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJSb2NrZXRDaGF0Iiwic3RhcnR1cCIsInNldHRpbmdzIiwiYWRkIiwidHlwZSIsInZhbHVlcyIsImtleSIsImkxOG5MYWJlbCIsImdyb3VwIiwic2VjdGlvbiIsInB1YmxpYyIsImVuYWJsZVF1ZXJ5T3JpZ2luYWwiLCJfaWQiLCJ2YWx1ZSIsImVuYWJsZVF1ZXJ5IiwiaTE4bkRlc2NyaXB0aW9uIiwiZW5hYmxlUXVlcnlNYXJrZWQiLCJzIiwiZGVmYXVsdCIsIkJsYXplIiwibWFya2VkIiwib3JpZ2luYWwiLCJjb2RlIiwicGFyc2VycyIsIk1hcmtkb3duQ2xhc3MiLCJwYXJzZSIsInRleHQiLCJtZXNzYWdlIiwiaHRtbCIsImVzY2FwZUhUTUwiLCJtb3VudFRva2Vuc0JhY2siLCJwYXJzZU1lc3NhZ2VOb3RFc2NhcGVkIiwicGFyc2VOb3RFc2NhcGVkIiwicGFyc2VyIiwiZ2V0IiwidXNlSHRtbCIsInRva2VucyIsImxlbmd0aCIsInRva2VuIiwibm9IdG1sIiwicmVwbGFjZSIsImFyZ3MiLCJNYXJrZG93biIsIk1hcmtkb3duTWVzc2FnZSIsInRyaW0iLCJ1bmRlZmluZWQiLCJjYWxsYmFja3MiLCJwcmlvcml0eSIsIkhJR0giLCJpc0NsaWVudCIsInJlZ2lzdGVySGVscGVyIiwib3V0cHV0IiwiZXhwb3J0IiwiUmFuZG9tIiwiXyIsImhsanMiLCJfbWFya2VkIiwicmVuZGVyZXIiLCJSZW5kZXJlciIsIm1zZyIsImxhbmciLCJlc2NhcGVkIiwib3B0aW9ucyIsImhpZ2hsaWdodCIsIm91dCIsImVzY2FwZSIsImlzU3RyaW5nIiwiaWQiLCJwdXNoIiwiY29kZXNwYW4iLCJibG9ja3F1b3RlIiwicXVvdGUiLCJlIiwiZ2ZtIiwidGFibGVzIiwiYnJlYWtzIiwicGVkYW50aWMiLCJzbWFydExpc3RzIiwic21hcnR5cGFudHMiLCJ1bmVzY2FwZUhUTUwiLCJzYW5pdGl6ZSIsImlubGluZWNvZGUiLCJtYXRjaCIsInAxIiwicDIiLCJjb2RlYmxvY2tzIiwiY291bnQiLCJtc2dQYXJ0cyIsInNwbGl0IiwiaW5kZXgiLCJwYXJ0IiwiY29kZU1hdGNoIiwic2luZ2xlTGluZSIsImluZGV4T2YiLCJBcnJheSIsImZyb20iLCJsaXN0TGFuZ3VhZ2VzIiwiaW5jbHVkZXMiLCJyZXN1bHQiLCJoaWdobGlnaHRBdXRvIiwibGFuZ3VhZ2UiLCJqb2luIiwibWFya2Rvd24iLCJhZGRBc1Rva2VuIiwic2NoZW1lcyIsIlJlZ0V4cCIsInRpdGxlIiwidXJsIiwidGFyZ2V0IiwiYWJzb2x1dGVVcmwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxNQUFKO0FBQVdDLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxlQUFSLENBQWIsRUFBc0M7QUFBQ0gsU0FBT0ksQ0FBUCxFQUFTO0FBQUNKLGFBQU9JLENBQVA7QUFBUzs7QUFBcEIsQ0FBdEMsRUFBNEQsQ0FBNUQ7QUFBK0QsSUFBSUMsVUFBSjtBQUFlSixPQUFPQyxL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QUFRQyxJQUFSLENBQWFZLE9BQWIsQ0FBcUIsTUFBckIsRUFBNkIsTUFBN0IsQ0FBZjtBQUVBLFNBQU9iLE9BQVA7QUFDQSxDQVhNLEMiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfbWFya2Rvd24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNYXJrZG93bl9QYXJzZXInLCAnb3JpZ2luYWwnLCB7XG5cdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0dmFsdWVzOiBbe1xuXHRcdFx0a2V5OiAnZGlzYWJsZWQnLFxuXHRcdFx0aTE4bkxhYmVsOiAnRGlzYWJsZWQnXG5cdFx0fSwge1xuXHRcdFx0a2V5OiAnb3JpZ2luYWwnLFxuXHRcdFx0aTE4bkxhYmVsOiAnT3JpZ2luYWwnXG5cdFx0fSwge1xuXHRcdFx0a2V5OiAnbWFya2VkJyxcblx0XHRcdGkxOG5MYWJlbDogJ01hcmtlZCdcblx0XHR9XSxcblx0XHRncm91cDogJ01lc3NhZ2UnLFxuXHRcdHNlY3Rpb246ICdNYXJrZG93bicsXG5cdFx0cHVibGljOiB0cnVlXG5cdH0pO1xuXG5cdGNvbnN0IGVuYWJsZVF1ZXJ5T3JpZ2luYWwgPSB7X2lkOiAnTWFya2Rvd25fUGFyc2VyJywgdmFsdWU6ICdvcmlnaW5hbCd9O1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTWFya2Rvd25fSGVhZGVycycsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0ZW5hYmxlUXVlcnk6IGVuYWJsZVF1ZXJ5T3JpZ2luYWxcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNYXJrZG93bl9TdXBwb3J0U2NoZW1lc0ZvckxpbmsnLCAnaHR0cCxodHRwcycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ01lc3NhZ2UnLFxuXHRcdHNlY3Rpb246ICdNYXJrZG93bicsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ01hcmtkb3duX1N1cHBvcnRTY2hlbWVzRm9yTGlua19EZXNjcmlwdGlvbicsXG5cdFx0ZW5hYmxlUXVlcnk6IGVuYWJsZVF1ZXJ5T3JpZ2luYWxcblx0fSk7XG5cblx0Y29uc3QgZW5hYmxlUXVlcnlNYXJrZWQgPSB7X2lkOiAnTWFya2Rvd25fUGFyc2VyJywgdmFsdWU6ICdtYXJrZWQnfTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9HRk0nLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0ZW5hYmxlUXVlcnk6IGVuYWJsZVF1ZXJ5TWFya2VkXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTWFya2Rvd25fTWFya2VkX1RhYmxlcycsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdNZXNzYWdlJyxcblx0XHRzZWN0aW9uOiAnTWFya2Rvd24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRlbmFibGVRdWVyeTogZW5hYmxlUXVlcnlNYXJrZWRcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNYXJrZG93bl9NYXJrZWRfQnJlYWtzJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ01lc3NhZ2UnLFxuXHRcdHNlY3Rpb246ICdNYXJrZG93bicsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGVuYWJsZVF1ZXJ5OiBlbmFibGVRdWVyeU1hcmtlZFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9QZWRhbnRpYycsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0ZW5hYmxlUXVlcnk6IFt7XG5cdFx0XHRfaWQ6ICdNYXJrZG93bl9QYXJzZXInLFxuXHRcdFx0dmFsdWU6ICdtYXJrZWQnXG5cdFx0fSwge1xuXHRcdFx0X2lkOiAnTWFya2Rvd25fTWFya2VkX0dGTScsXG5cdFx0XHR2YWx1ZTogZmFsc2Vcblx0XHR9XVxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9TbWFydExpc3RzJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ01lc3NhZ2UnLFxuXHRcdHNlY3Rpb246ICdNYXJrZG93bicsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGVuYWJsZVF1ZXJ5OiBlbmFibGVRdWVyeU1hcmtlZFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9TbWFydHlwYW50cycsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdNZXNzYWdlJyxcblx0XHRzZWN0aW9uOiAnTWFya2Rvd24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRlbmFibGVRdWVyeTogZW5hYmxlUXVlcnlNYXJrZWRcblx0fSk7XG59KTtcbiIsIi8qXG4gKiBNYXJrZG93biBpcyBhIG5hbWVkIGZ1bmN0aW9uIHRoYXQgd2lsbCBwYXJzZSBtYXJrZG93biBzeW50YXhcbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIC0gVGhlIG1lc3NhZ2Ugb2JqZWN0XG4gKi9cbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcbmltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgQmxhemUgfSBmcm9tICdtZXRlb3IvYmxhemUnO1xuaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbmltcG9ydCB7IG1hcmtlZCB9IGZyb20gJy4vcGFyc2VyL21hcmtlZC9tYXJrZWQuanMnO1xuaW1wb3J0IHsgb3JpZ2luYWwgfSBmcm9tICcuL3BhcnNlci9vcmlnaW5hbC9vcmlnaW5hbC5qcyc7XG5cbmltcG9ydCB7IGNvZGUgfSBmcm9tICcuL3BhcnNlci9vcmlnaW5hbC9jb2RlLmpzJztcblxuY29uc3QgcGFyc2VycyA9IHtcblx0b3JpZ2luYWwsXG5cdG1hcmtlZFxufTtcblxuY2xhc3MgTWFya2Rvd25DbGFzcyB7XG5cdHBhcnNlKHRleHQpIHtcblx0XHRjb25zdCBtZXNzYWdlID0ge1xuXHRcdFx0aHRtbDogcy5lc2NhcGVIVE1MKHRleHQpXG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcy5tb3VudFRva2Vuc0JhY2sodGhpcy5wYXJzZU1lc3NhZ2VOb3RFc2NhcGVkKG1lc3NhZ2UpKS5odG1sO1xuXHR9XG5cblx0cGFyc2VOb3RFc2NhcGVkKHRleHQpIHtcblx0XHRjb25zdCBtZXNzYWdlID0ge1xuXHRcdFx0aHRtbDogdGV4dFxuXHRcdH07XG5cdFx0cmV0dXJuIHRoaXMubW91bnRUb2tlbnNCYWNrKHRoaXMucGFyc2VNZXNzYWdlTm90RXNjYXBlZChtZXNzYWdlKSkuaHRtbDtcblx0fVxuXG5cdHBhcnNlTWVzc2FnZU5vdEVzY2FwZWQobWVzc2FnZSkge1xuXHRcdGNvbnN0IHBhcnNlciA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9QYXJzZXInKTtcblxuXHRcdGlmIChwYXJzZXIgPT09ICdkaXNhYmxlZCcpIHtcblx0XHRcdHJldHVybiBtZXNzYWdlO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgcGFyc2Vyc1twYXJzZXJdID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2Vyc1twYXJzZXJdKG1lc3NhZ2UpO1xuXHRcdH1cblx0XHRyZXR1cm4gcGFyc2Vyc1snb3JpZ2luYWwnXShtZXNzYWdlKTtcblx0fVxuXG5cdG1vdW50VG9rZW5zQmFjayhtZXNzYWdlLCB1c2VIdG1sID0gdHJ1ZSkge1xuXHRcdGlmIChtZXNzYWdlLnRva2VucyAmJiBtZXNzYWdlLnRva2Vucy5sZW5ndGggPiAwKSB7XG5cdFx0XHRmb3IgKGNvbnN0IHt0b2tlbiwgdGV4dCwgbm9IdG1sfSBvZiBtZXNzYWdlLnRva2Vucykge1xuXHRcdFx0XHRtZXNzYWdlLmh0bWwgPSBtZXNzYWdlLmh0bWwucmVwbGFjZSh0b2tlbiwgKCkgPT4gdXNlSHRtbCA/IHRleHQgOiBub0h0bWwpOyAvLyBVc2VzIGxhbWJkYSBzbyBkb2Vzbid0IG5lZWQgdG8gZXNjYXBlICRcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvZGUoLi4uYXJncykge1xuXHRcdHJldHVybiBjb2RlKC4uLmFyZ3MpO1xuXHR9XG59XG5cbmNvbnN0IE1hcmtkb3duID0gbmV3IE1hcmtkb3duQ2xhc3M7XG5Sb2NrZXRDaGF0Lk1hcmtkb3duID0gTWFya2Rvd247XG5cbi8vIHJlbmRlck1lc3NhZ2UgYWxyZWFkeSBkaWQgaHRtbCBlc2NhcGVcbmNvbnN0IE1hcmtkb3duTWVzc2FnZSA9IChtZXNzYWdlKSA9PiB7XG5cdGlmIChzLnRyaW0obWVzc2FnZSAhPSBudWxsID8gbWVzc2FnZS5odG1sIDogdW5kZWZpbmVkKSkge1xuXHRcdG1lc3NhZ2UgPSBNYXJrZG93bi5wYXJzZU1lc3NhZ2VOb3RFc2NhcGVkKG1lc3NhZ2UpO1xuXHR9XG5cblx0cmV0dXJuIG1lc3NhZ2U7XG59O1xuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ3JlbmRlck1lc3NhZ2UnLCBNYXJrZG93bk1lc3NhZ2UsIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkhJR0gsICdtYXJrZG93bicpO1xuXG5pZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG5cdEJsYXplLnJlZ2lzdGVySGVscGVyKCdSb2NrZXRDaGF0TWFya2Rvd24nLCB0ZXh0ID0+IE1hcmtkb3duLnBhcnNlKHRleHQpKTtcblx0QmxhemUucmVnaXN0ZXJIZWxwZXIoJ1JvY2tldENoYXRNYXJrZG93blVuZXNjYXBlJywgdGV4dCA9PiBNYXJrZG93bi5wYXJzZU5vdEVzY2FwZWQodGV4dCkpO1xuXHRCbGF6ZS5yZWdpc3RlckhlbHBlcignUm9ja2V0Q2hhdE1hcmtkb3duSW5saW5lJywgKHRleHQpID0+IHtcblx0XHRjb25zdCBvdXRwdXQgPSBNYXJrZG93bi5wYXJzZSh0ZXh0KTtcblx0XHRyZXR1cm4gb3V0cHV0LnJlcGxhY2UoL148cD4vLCAnJykucmVwbGFjZSgvPFxcL3A+JC8sICcnKTtcblx0fSk7XG59XG4iLCJpbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJ21ldGVvci9yYW5kb20nO1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5pbXBvcnQgaGxqcyBmcm9tICdoaWdobGlnaHQuanMnO1xuaW1wb3J0IF9tYXJrZWQgZnJvbSAnbWFya2VkJztcblxuY29uc3QgcmVuZGVyZXIgPSBuZXcgX21hcmtlZC5SZW5kZXJlcigpO1xuXG5sZXQgbXNnID0gbnVsbDtcblxucmVuZGVyZXIuY29kZSA9IGZ1bmN0aW9uKGNvZGUsIGxhbmcsIGVzY2FwZWQpIHtcblx0aWYgKHRoaXMub3B0aW9ucy5oaWdobGlnaHQpIHtcblx0XHRjb25zdCBvdXQgPSB0aGlzLm9wdGlvbnMuaGlnaGxpZ2h0KGNvZGUsIGxhbmcpO1xuXHRcdGlmIChvdXQgIT0gbnVsbCAmJiBvdXQgIT09IGNvZGUpIHtcblx0XHRcdGVzY2FwZWQgPSB0cnVlO1xuXHRcdFx0Y29kZSA9IG91dDtcblx0XHR9XG5cdH1cblxuXHRsZXQgdGV4dCA9IG51bGw7XG5cblx0aWYgKCFsYW5nKSB7XG5cdFx0dGV4dCA9IGA8cHJlPjxjb2RlIGNsYXNzPVwiY29kZS1jb2xvcnMgaGxqc1wiPiR7IChlc2NhcGVkID8gY29kZSA6IHMuZXNjYXBlSFRNTChjb2RlLCB0cnVlKSkgfTwvY29kZT48L3ByZT5gO1xuXHR9IGVsc2Uge1xuXHRcdHRleHQgPSBgPHByZT48Y29kZSBjbGFzcz1cImNvZGUtY29sb3JzIGhsanMgJHsgZXNjYXBlKGxhbmcsIHRydWUpIH1cIj4keyAoZXNjYXBlZCA/IGNvZGUgOiBzLmVzY2FwZUhUTUwoY29kZSwgdHJ1ZSkpIH08L2NvZGU+PC9wcmU+YDtcblx0fVxuXG5cdGlmIChfLmlzU3RyaW5nKG1zZykpIHtcblx0XHRyZXR1cm4gdGV4dDtcblx0fVxuXG5cdGNvbnN0IHRva2VuID0gYD0hPSR7IFJhbmRvbS5pZCgpIH09IT1gO1xuXHRtc2cudG9rZW5zLnB1c2goe1xuXHRcdGhpZ2hsaWdodDogdHJ1ZSxcblx0XHR0b2tlbixcblx0XHR0ZXh0XG5cdH0pO1xuXG5cdHJldHVybiB0b2tlbjtcbn07XG5cbnJlbmRlcmVyLmNvZGVzcGFuID0gZnVuY3Rpb24odGV4dCkge1xuXHR0ZXh0ID0gYDxjb2RlIGNsYXNzPVwiY29kZS1jb2xvcnMgaW5saW5lXCI+JHsgdGV4dCB9PC9jb2RlPmA7XG5cdGlmIChfLmlzU3RyaW5nKG1zZykpIHtcblx0XHRyZXR1cm4gdGV4dDtcblx0fVxuXG5cdGNvbnN0IHRva2VuID0gYD0hPSR7IFJhbmRvbS5pZCgpIH09IT1gO1xuXHRtc2cudG9rZW5zLnB1c2goe1xuXHRcdHRva2VuLFxuXHRcdHRleHRcblx0fSk7XG5cblx0cmV0dXJuIHRva2VuO1xufTtcblxucmVuZGVyZXIuYmxvY2txdW90ZSA9IGZ1bmN0aW9uKHF1b3RlKSB7XG5cdHJldHVybiBgPGJsb2NrcXVvdGUgY2xhc3M9XCJiYWNrZ3JvdW5kLXRyYW5zcGFyZW50LWRhcmtlci1iZWZvcmVcIj4keyBxdW90ZSB9PC9ibG9ja3F1b3RlPmA7XG59O1xuXG5jb25zdCBoaWdobGlnaHQgPSBmdW5jdGlvbihjb2RlLCBsYW5nKSB7XG5cdGlmICghbGFuZykge1xuXHRcdHJldHVybiBjb2RlO1xuXHR9XG5cdHRyeSB7XG5cdFx0cmV0dXJuIGhsanMuaGlnaGxpZ2h0KGxhbmcsIGNvZGUpLnZhbHVlO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0Ly8gVW5rbm93biBsYW5ndWFnZVxuXHRcdHJldHVybiBjb2RlO1xuXHR9XG59O1xuXG5sZXQgZ2ZtID0gbnVsbDtcbmxldCB0YWJsZXMgPSBudWxsO1xubGV0IGJyZWFrcyA9IG51bGw7XG5sZXQgcGVkYW50aWMgPSBudWxsO1xubGV0IHNtYXJ0TGlzdHMgPSBudWxsO1xubGV0IHNtYXJ0eXBhbnRzID0gbnVsbDtcblxuZXhwb3J0IGNvbnN0IG1hcmtlZCA9IChtZXNzYWdlKSA9PiB7XG5cdG1zZyA9IG1lc3NhZ2U7XG5cblx0aWYgKCFtc2cudG9rZW5zKSB7XG5cdFx0bXNnLnRva2VucyA9IFtdO1xuXHR9XG5cblx0aWYgKGdmbSA9PSBudWxsKSB7IGdmbSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9NYXJrZWRfR0ZNJyk7IH1cblx0aWYgKHRhYmxlcyA9PSBudWxsKSB7IHRhYmxlcyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9NYXJrZWRfVGFibGVzJyk7IH1cblx0aWYgKGJyZWFrcyA9PSBudWxsKSB7IGJyZWFrcyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9NYXJrZWRfQnJlYWtzJyk7IH1cblx0aWYgKHBlZGFudGljID09IG51bGwpIHsgcGVkYW50aWMgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWFya2Rvd25fTWFya2VkX1BlZGFudGljJyk7IH1cblx0aWYgKHNtYXJ0TGlzdHMgPT0gbnVsbCkgeyBzbWFydExpc3RzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01hcmtkb3duX01hcmtlZF9TbWFydExpc3RzJyk7IH1cblx0aWYgKHNtYXJ0eXBhbnRzID09IG51bGwpIHsgc21hcnR5cGFudHMgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWFya2Rvd25fTWFya2VkX1NtYXJ0eXBhbnRzJyk7IH1cblxuXHRtc2cuaHRtbCA9IF9tYXJrZWQocy51bmVzY2FwZUhUTUwobXNnLmh0bWwpLCB7XG5cdFx0Z2ZtLFxuXHRcdHRhYmxlcyxcblx0XHRicmVha3MsXG5cdFx0cGVkYW50aWMsXG5cdFx0c21hcnRMaXN0cyxcblx0XHRzbWFydHlwYW50cyxcblx0XHRyZW5kZXJlcixcblx0XHRzYW5pdGl6ZTogdHJ1ZSxcblx0XHRoaWdobGlnaHRcblx0fSk7XG5cblx0cmV0dXJuIG1zZztcbn07XG4iLCIvKlxuICogY29kZSgpIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHBhcnNlIGBpbmxpbmUgY29kZWAgYW5kIGBgYGNvZGVibG9ja2BgYCBzeW50YXhlc1xuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgLSBUaGUgbWVzc2FnZSBvYmplY3RcbiAqL1xuaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnbWV0ZW9yL3JhbmRvbSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5pbXBvcnQgaGxqcyBmcm9tICdoaWdobGlnaHQuanMnO1xuXG5jb25zdCBpbmxpbmVjb2RlID0gKG1lc3NhZ2UpID0+IHtcblx0Ly8gU3VwcG9ydCBgdGV4dGBcblx0cmV0dXJuIG1lc3NhZ2UuaHRtbCA9IG1lc3NhZ2UuaHRtbC5yZXBsYWNlKC9cXGAoW15gXFxyXFxuXSspXFxgKFs8Xyp+XXxcXEJ8XFxifCQpL2dtLCAobWF0Y2gsIHAxLCBwMikgPT4ge1xuXHRcdGNvbnN0IHRva2VuID0gYCA9IT0keyBSYW5kb20uaWQoKSB9PSE9YDtcblxuXHRcdG1lc3NhZ2UudG9rZW5zLnB1c2goe1xuXHRcdFx0dG9rZW4sXG5cdFx0XHR0ZXh0OiBgPHNwYW4gY2xhc3M9XFxcImNvcHlvbmx5XFxcIj5cXGA8L3NwYW4+PHNwYW4+PGNvZGUgY2xhc3M9XFxcImNvZGUtY29sb3JzIGlubGluZVxcXCI+JHsgcDEgfTwvY29kZT48L3NwYW4+PHNwYW4gY2xhc3M9XFxcImNvcHlvbmx5XFxcIj5cXGA8L3NwYW4+JHsgcDIgfWAsXG5cdFx0XHRub0h0bWw6IG1hdGNoXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdG9rZW47XG5cdH0pO1xufTtcblxuY29uc3QgY29kZWJsb2NrcyA9IChtZXNzYWdlKSA9PiB7XG5cdC8vIENvdW50IG9jY3VyZW5jaWVzIG9mIGBgYFxuXHRjb25zdCBjb3VudCA9IChtZXNzYWdlLmh0bWwubWF0Y2goL2BgYC9nKSB8fCBbXSkubGVuZ3RoO1xuXG5cdGlmIChjb3VudCkge1xuXG5cdFx0Ly8gQ2hlY2sgaWYgd2UgbmVlZCB0byBhZGQgYSBmaW5hbCBgYGBcblx0XHRpZiAoKGNvdW50ICUgMikgPiAwKSB7XG5cdFx0XHRtZXNzYWdlLmh0bWwgPSBgJHsgbWVzc2FnZS5odG1sIH1cXG5cXGBcXGBcXGBgO1xuXHRcdFx0bWVzc2FnZS5tc2cgPSBgJHsgbWVzc2FnZS5tc2cgfVxcblxcYFxcYFxcYGA7XG5cdFx0fVxuXG5cdFx0Ly8gU2VwYXJhdGUgdGV4dCBpbiBjb2RlIGJsb2NrcyBhbmQgbm9uIGNvZGUgYmxvY2tzXG5cdFx0Y29uc3QgbXNnUGFydHMgPSBtZXNzYWdlLmh0bWwuc3BsaXQoLyheLiopKGBgYCg/OlthLXpBLVpdKyk/KD86KD86LnxcXHJ8XFxuKSo/KWBgYCkoLipcXG4/KSQvZ20pO1xuXG5cdFx0Zm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IG1zZ1BhcnRzLmxlbmd0aDsgaW5kZXgrKykge1xuXHRcdFx0Ly8gVmVyaWZ5IGlmIHRoaXMgcGFydCBpcyBjb2RlXG5cdFx0XHRjb25zdCBwYXJ0ID0gbXNnUGFydHNbaW5kZXhdO1xuXHRcdFx0Y29uc3QgY29kZU1hdGNoID0gcGFydC5tYXRjaCgvXmBgYFtcXHJcXG5dKiguKltcXHJcXG5cXCBdPylbXFxyXFxuXSooW1xcc1xcU10qPylgYGArPyQvKTtcblxuXHRcdFx0aWYgKGNvZGVNYXRjaCAhPSBudWxsKSB7XG5cdFx0XHRcdC8vIFByb2Nlc3MgaGlnaGxpZ2h0IGlmIHRoaXMgcGFydCBpcyBjb2RlXG5cdFx0XHRcdGNvbnN0IHNpbmdsZUxpbmUgPSBjb2RlTWF0Y2hbMF0uaW5kZXhPZignXFxuJykgPT09IC0xO1xuXHRcdFx0XHRjb25zdCBsYW5nID0gIXNpbmdsZUxpbmUgJiYgQXJyYXkuZnJvbShobGpzLmxpc3RMYW5ndWFnZXMoKSkuaW5jbHVkZXMocy50cmltKGNvZGVNYXRjaFsxXSkpID8gcy50cmltKGNvZGVNYXRjaFsxXSkgOiAnJztcblx0XHRcdFx0Y29uc3QgY29kZSA9XG5cdFx0XHRcdFx0c2luZ2xlTGluZSA/XG5cdFx0XHRcdFx0XHRzLnVuZXNjYXBlSFRNTChjb2RlTWF0Y2hbMV0pIDpcblx0XHRcdFx0XHRcdGxhbmcgPT09ICcnID9cblx0XHRcdFx0XHRcdFx0cy51bmVzY2FwZUhUTUwoY29kZU1hdGNoWzFdICsgY29kZU1hdGNoWzJdKSA6XG5cdFx0XHRcdFx0XHRcdHMudW5lc2NhcGVIVE1MKGNvZGVNYXRjaFsyXSk7XG5cblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbGFuZyA9PT0gJycgPyBobGpzLmhpZ2hsaWdodEF1dG8oKGxhbmcgKyBjb2RlKSkgOiBobGpzLmhpZ2hsaWdodChsYW5nLCBjb2RlKTtcblx0XHRcdFx0Y29uc3QgdG9rZW4gPSBgPSE9JHsgUmFuZG9tLmlkKCkgfT0hPWA7XG5cblx0XHRcdFx0bWVzc2FnZS50b2tlbnMucHVzaCh7XG5cdFx0XHRcdFx0aGlnaGxpZ2h0OiB0cnVlLFxuXHRcdFx0XHRcdHRva2VuLFxuXHRcdFx0XHRcdHRleHQ6IGA8cHJlPjxjb2RlIGNsYXNzPSdjb2RlLWNvbG9ycyBobGpzICR7IHJlc3VsdC5sYW5ndWFnZSB9Jz48c3BhbiBjbGFzcz0nY29weW9ubHknPlxcYFxcYFxcYDxicj48L3NwYW4+JHsgcmVzdWx0LnZhbHVlIH08c3BhbiBjbGFzcz0nY29weW9ubHknPjxicj5cXGBcXGBcXGA8L3NwYW4+PC9jb2RlPjwvcHJlPmAsXG5cdFx0XHRcdFx0bm9IdG1sOiBjb2RlTWF0Y2hbMF1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0bXNnUGFydHNbaW5kZXhdID0gdG9rZW47XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtc2dQYXJ0c1tpbmRleF0gPSBwYXJ0O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFJlLW1vdW50IG1lc3NhZ2Vcblx0XHRyZXR1cm4gbWVzc2FnZS5odG1sID0gbXNnUGFydHMuam9pbignJyk7XG5cdH1cbn07XG5cbmV4cG9ydCBjb25zdCBjb2RlID0gKG1lc3NhZ2UpID0+IHtcblx0aWYgKHMudHJpbShtZXNzYWdlLmh0bWwpKSB7XG5cdFx0aWYgKG1lc3NhZ2UudG9rZW5zID09IG51bGwpIHtcblx0XHRcdG1lc3NhZ2UudG9rZW5zID0gW107XG5cdFx0fVxuXG5cdFx0Y29kZWJsb2NrcyhtZXNzYWdlKTtcblx0XHRpbmxpbmVjb2RlKG1lc3NhZ2UpO1xuXHR9XG5cblx0cmV0dXJuIG1lc3NhZ2U7XG59O1xuIiwiLypcbiAqIE1hcmtkb3duIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHBhcnNlIG1hcmtkb3duIHN5bnRheFxuICogQHBhcmFtIHtTdHJpbmd9IG1zZyAtIFRoZSBtZXNzYWdlIGh0bWxcbiAqL1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICdtZXRlb3IvcmFuZG9tJztcbmltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuXG5jb25zdCBwYXJzZU5vdEVzY2FwZWQgPSBmdW5jdGlvbihtc2csIG1lc3NhZ2UpIHtcblx0aWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS50b2tlbnMgPT0gbnVsbCkge1xuXHRcdG1lc3NhZ2UudG9rZW5zID0gW107XG5cdH1cblxuXHRjb25zdCBhZGRBc1Rva2VuID0gZnVuY3Rpb24oaHRtbCkge1xuXHRcdGNvbnN0IHRva2VuID0gYD0hPSR7IFJhbmRvbS5pZCgpIH09IT1gO1xuXHRcdG1lc3NhZ2UudG9rZW5zLnB1c2goe1xuXHRcdFx0dG9rZW4sXG5cdFx0XHR0ZXh0OiBodG1sXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdG9rZW47XG5cdH07XG5cblx0Y29uc3Qgc2NoZW1lcyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9TdXBwb3J0U2NoZW1lc0ZvckxpbmsnKS5zcGxpdCgnLCcpLmpvaW4oJ3wnKTtcblxuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01hcmtkb3duX0hlYWRlcnMnKSkge1xuXHRcdC8vIFN1cHBvcnQgIyBUZXh0IGZvciBoMVxuXHRcdG1zZyA9IG1zZy5yZXBsYWNlKC9eIyAoKFtcXFNcXHdcXGQtX1xcL1xcKlxcLixcXFxcXVsgXFx1MDBhMFxcdTE2ODBcXHUxODBlXFx1MjAwMC1cXHUyMDBhXFx1MjAyOFxcdTIwMjlcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHVmZWZmXT8pKykvZ20sICc8aDE+JDE8L2gxPicpO1xuXG5cdFx0Ly8gU3VwcG9ydCAjIFRleHQgZm9yIGgyXG5cdFx0bXNnID0gbXNnLnJlcGxhY2UoL14jIyAoKFtcXFNcXHdcXGQtX1xcL1xcKlxcLixcXFxcXVsgXFx1MDBhMFxcdTE2ODBcXHUxODBlXFx1MjAwMC1cXHUyMDBhXFx1MjAyOFxcdTIwMjlcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHVmZWZmXT8pKykvZ20sICc8aDI+JDE8L2gyPicpO1xuXG5cdFx0Ly8gU3VwcG9ydCAjIFRleHQgZm9yIGgzXG5cdFx0bXNnID0gbXNnLnJlcGxhY2UoL14jIyMgKChbXFxTXFx3XFxkLV9cXC9cXCpcXC4sXFxcXF1bIFxcdTAwYTBcXHUxNjgwXFx1MTgwZVxcdTIwMDAtXFx1MjAwYVxcdTIwMjhcXHUyMDI5XFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1ZmVmZl0/KSspL2dtLCAnPGgzPiQxPC9oMz4nKTtcblxuXHRcdC8vIFN1cHBvcnQgIyBUZXh0IGZvciBoNFxuXHRcdG1zZyA9IG1zZy5yZXBsYWNlKC9eIyMjIyAoKFtcXFNcXHdcXGQtX1xcL1xcKlxcLixcXFxcXVsgXFx1MDBhMFxcdTE2ODBcXHUxODBlXFx1MjAwMC1cXHUyMDBhXFx1MjAyOFxcdTIwMjlcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHVmZWZmXT8pKykvZ20sICc8aDQ+JDE8L2g0PicpO1xuXHR9XG5cblx0Ly8gU3VwcG9ydCAqdGV4dCogdG8gbWFrZSBib2xkXG5cdG1zZyA9IG1zZy5yZXBsYWNlKC8oXnwmZ3Q7fFsgPl9+YF0pXFwqezEsMn0oW15cXCpcXHJcXG5dKylcXCp7MSwyfShbPF9+YF18XFxCfFxcYnwkKS9nbSwgJyQxPHNwYW4gY2xhc3M9XCJjb3B5b25seVwiPio8L3NwYW4+PHN0cm9uZz4kMjwvc3Ryb25nPjxzcGFuIGNsYXNzPVwiY29weW9ubHlcIj4qPC9zcGFuPiQzJyk7XG5cblx0Ly8gU3VwcG9ydCBfdGV4dF8gdG8gbWFrZSBpdGFsaWNzXG5cdG1zZyA9IG1zZy5yZXBsYWNlKC8oXnwmZ3Q7fFsgPip+YF0pXFxfezEsMn0oW15cXF9cXHJcXG5dKylcXF97MSwyfShbPCp+YF18XFxCfFxcYnwkKS9nbSwgJyQxPHNwYW4gY2xhc3M9XCJjb3B5b25seVwiPl88L3NwYW4+PGVtPiQyPC9lbT48c3BhbiBjbGFzcz1cImNvcHlvbmx5XCI+Xzwvc3Bhbj4kMycpO1xuXG5cdC8vIFN1cHBvcnQgfnRleHR+IHRvIHN0cmlrZSB0aHJvdWdoIHRleHRcblx0bXNnID0gbXNnLnJlcGxhY2UoLyhefCZndDt8WyA+XypgXSlcXH57MSwyfShbXn5cXHJcXG5dKylcXH57MSwyfShbPF8qYF18XFxCfFxcYnwkKS9nbSwgJyQxPHNwYW4gY2xhc3M9XCJjb3B5b25seVwiPn48L3NwYW4+PHN0cmlrZT4kMjwvc3RyaWtlPjxzcGFuIGNsYXNzPVwiY29weW9ubHlcIj5+PC9zcGFuPiQzJyk7XG5cblx0Ly8gU3VwcG9ydCBmb3IgYmxvY2sgcXVvdGVcblx0Ly8gPj4+XG5cdC8vIFRleHRcblx0Ly8gPDw8XG5cdG1zZyA9IG1zZy5yZXBsYWNlKC8oPzomZ3Q7KXszfVxcbisoW1xcc1xcU10qPylcXG4rKD86Jmx0Oyl7M30vZywgJzxibG9ja3F1b3RlIGNsYXNzPVwiYmFja2dyb3VuZC10cmFuc3BhcmVudC1kYXJrZXItYmVmb3JlXCI+PHNwYW4gY2xhc3M9XCJjb3B5b25seVwiPiZndDsmZ3Q7Jmd0Ozwvc3Bhbj4kMTxzcGFuIGNsYXNzPVwiY29weW9ubHlcIj4mbHQ7Jmx0OyZsdDs8L3NwYW4+PC9ibG9ja3F1b3RlPicpO1xuXG5cdC8vIFN1cHBvcnQgPlRleHQgZm9yIHF1b3RlXG5cdG1zZyA9IG1zZy5yZXBsYWNlKC9eJmd0OyguKikkL2dtLCAnPGJsb2NrcXVvdGUgY2xhc3M9XCJiYWNrZ3JvdW5kLXRyYW5zcGFyZW50LWRhcmtlci1iZWZvcmVcIj48c3BhbiBjbGFzcz1cImNvcHlvbmx5XCI+Jmd0Ozwvc3Bhbj4kMTwvYmxvY2txdW90ZT4nKTtcblxuXHQvLyBSZW1vdmUgd2hpdGUtc3BhY2UgYXJvdW5kIGJsb2NrcXVvdGUgKHByZXZlbnQgPGJyPikuIEJlY2F1c2UgYmxvY2txdW90ZSBpcyBibG9jayBlbGVtZW50LlxuXHRtc2cgPSBtc2cucmVwbGFjZSgvXFxzKjxibG9ja3F1b3RlIGNsYXNzPVwiYmFja2dyb3VuZC10cmFuc3BhcmVudC1kYXJrZXItYmVmb3JlXCI+L2dtLCAnPGJsb2NrcXVvdGUgY2xhc3M9XCJiYWNrZ3JvdW5kLXRyYW5zcGFyZW50LWRhcmtlci1iZWZvcmVcIj4nKTtcblx0bXNnID0gbXNnLnJlcGxhY2UoLzxcXC9ibG9ja3F1b3RlPlxccyovZ20sICc8L2Jsb2NrcXVvdGU+Jyk7XG5cblx0Ly8gUmVtb3ZlIG5ldy1saW5lIGJldHdlZW4gYmxvY2txdW90ZXMuXG5cdG1zZyA9IG1zZy5yZXBsYWNlKC88XFwvYmxvY2txdW90ZT5cXG48YmxvY2txdW90ZS9nbSwgJzwvYmxvY2txdW90ZT48YmxvY2txdW90ZScpO1xuXG5cdC8vIFN1cHBvcnQgIVthbHQgdGV4dF0oaHR0cDovL2ltYWdlIHVybClcblx0bXNnID0gbXNnLnJlcGxhY2UobmV3IFJlZ0V4cChgIVxcXFxbKFteXFxcXF1dKylcXFxcXVxcXFwoKCg/OiR7IHNjaGVtZXMgfSk6XFxcXC9cXFxcL1teXFxcXCldKylcXFxcKWAsICdnbScpLCAobWF0Y2gsIHRpdGxlLCB1cmwpID0+IHtcblx0XHRjb25zdCB0YXJnZXQgPSB1cmwuaW5kZXhPZihNZXRlb3IuYWJzb2x1dGVVcmwoKSkgPT09IDAgPyAnJyA6ICdfYmxhbmsnO1xuXHRcdHJldHVybiBhZGRBc1Rva2VuKGA8YSBocmVmPVwiJHsgcy5lc2NhcGVIVE1MKHVybCkgfVwiIHRpdGxlPVwiJHsgcy5lc2NhcGVIVE1MKHRpdGxlKSB9XCIgdGFyZ2V0PVwiJHsgcy5lc2NhcGVIVE1MKHRhcmdldCkgfVwiIHJlbD1cIm5vb3BlbmVyIG5vcmVmZXJyZXJcIj48ZGl2IGNsYXNzPVwiaW5saW5lLWltYWdlXCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWltYWdlOiB1cmwoJHsgcy5lc2NhcGVIVE1MKHVybCkgfSk7XCI+PC9kaXY+PC9hPmApO1xuXHR9KTtcblxuXHQvLyBTdXBwb3J0IFtUZXh0XShodHRwOi8vbGluaylcblx0bXNnID0gbXNnLnJlcGxhY2UobmV3IFJlZ0V4cChgXFxcXFsoW15cXFxcXV0rKVxcXFxdXFxcXCgoKD86JHsgc2NoZW1lcyB9KTpcXFxcL1xcXFwvW15cXFxcKV0rKVxcXFwpYCwgJ2dtJyksIChtYXRjaCwgdGl0bGUsIHVybCkgPT4ge1xuXHRcdGNvbnN0IHRhcmdldCA9IHVybC5pbmRleE9mKE1ldGVvci5hYnNvbHV0ZVVybCgpKSA9PT0gMCA/ICcnIDogJ19ibGFuayc7XG5cdFx0cmV0dXJuIGFkZEFzVG9rZW4oYDxhIGhyZWY9XCIkeyBzLmVzY2FwZUhUTUwodXJsKSB9XCIgdGFyZ2V0PVwiJHsgcy5lc2NhcGVIVE1MKHRhcmdldCkgfVwiIHJlbD1cIm5vb3BlbmVyIG5vcmVmZXJyZXJcIj4keyBzLmVzY2FwZUhUTUwodGl0bGUpIH08L2E+YCk7XG5cdH0pO1xuXG5cdC8vIFN1cHBvcnQgPGh0dHA6Ly9saW5rfFRleHQ+XG5cdG1zZyA9IG1zZy5yZXBsYWNlKG5ldyBSZWdFeHAoYCg/Ojx8Jmx0OykoKD86JHsgc2NoZW1lcyB9KTpcXFxcL1xcXFwvW15cXFxcfF0rKVxcXFx8KC4rPykoPz0+fCZndDspKD86PnwmZ3Q7KWAsICdnbScpLCAobWF0Y2gsIHVybCwgdGl0bGUpID0+IHtcblx0XHRjb25zdCB0YXJnZXQgPSB1cmwuaW5kZXhPZihNZXRlb3IuYWJzb2x1dGVVcmwoKSkgPT09IDAgPyAnJyA6ICdfYmxhbmsnO1xuXHRcdHJldHVybiBhZGRBc1Rva2VuKGA8YSBocmVmPVwiJHsgcy5lc2NhcGVIVE1MKHVybCkgfVwiIHRhcmdldD1cIiR7IHMuZXNjYXBlSFRNTCh0YXJnZXQpIH1cIiByZWw9XCJub29wZW5lciBub3JlZmVycmVyXCI+JHsgcy5lc2NhcGVIVE1MKHRpdGxlKSB9PC9hPmApO1xuXHR9KTtcblxuXHRyZXR1cm4gbXNnO1xufTtcblxuZXhwb3J0IGNvbnN0IG1hcmtkb3duID0gZnVuY3Rpb24obWVzc2FnZSkge1xuXHRtZXNzYWdlLmh0bWwgPSBwYXJzZU5vdEVzY2FwZWQobWVzc2FnZS5odG1sLCBtZXNzYWdlKTtcblx0cmV0dXJuIG1lc3NhZ2U7XG59O1xuIiwiLypcbiAqIE1hcmtkb3duIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHBhcnNlIG1hcmtkb3duIHN5bnRheFxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgLSBUaGUgbWVzc2FnZSBvYmplY3RcbiAqL1xuaW1wb3J0IHsgbWFya2Rvd24gfSBmcm9tICcuL21hcmtkb3duLmpzJztcbmltcG9ydCB7IGNvZGUgfSBmcm9tICcuL2NvZGUuanMnO1xuXG5leHBvcnQgY29uc3Qgb3JpZ2luYWwgPSAobWVzc2FnZSkgPT4ge1xuXHQvLyBQYXJzZSBtYXJrZG93biBjb2RlXG5cdG1lc3NhZ2UgPSBjb2RlKG1lc3NhZ2UpO1xuXG5cdC8vIFBhcnNlIG1hcmtkb3duXG5cdG1lc3NhZ2UgPSBtYXJrZG93bihtZXNzYWdlKTtcblxuXHQvLyBSZXBsYWNlIGxpbmVicmVhayB0byBiclxuXHRtZXNzYWdlLmh0bWwgPSBtZXNzYWdlLmh0bWwucmVwbGFjZSgvXFxuL2dtLCAnPGJyPicpO1xuXG5cdHJldHVybiBtZXNzYWdlO1xufTtcbiJdfQ==
