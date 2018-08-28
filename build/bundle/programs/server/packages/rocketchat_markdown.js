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

    return parsers.original(message);
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

const inlinecode = message => // Support `text`
message.html = message.html.replace(/\`([^`\r\n]+)\`([<_*~]|\B|\b|$)/gm, (match, p1, p2) => {
  const token = ` =!=${Random.id()}=!=`;
  message.tokens.push({
    token,
    text: `<span class=\"copyonly\">\`</span><span><code class=\"code-colors inline\">${p1}</code></span><span class=\"copyonly\">\`</span>${p2}`,
    noHtml: match
  });
  return token;
});

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
        const emptyLanguage = lang === '' ? s.unescapeHTML(codeMatch[1] + codeMatch[2]) : s.unescapeHTML(codeMatch[2]);
        const code = singleLine ? s.unescapeHTML(codeMatch[1]) : emptyLanguage;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9tYXJrZG93bi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9wYXJzZXIvbWFya2VkL21hcmtlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9wYXJzZXIvb3JpZ2luYWwvY29kZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9wYXJzZXIvb3JpZ2luYWwvbWFya2Rvd24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFya2Rvd24vcGFyc2VyL29yaWdpbmFsL29yaWdpbmFsLmpzIl0sIm5hbWVzIjpbIk1ldGVvciIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJSb2NrZXRDaGF0Iiwic3RhcnR1cCIsInNldHRpbmdzIiwiYWRkIiwidHlwZSIsInZhbHVlcyIsImtleSIsImkxOG5MYWJlbCIsImdyb3VwIiwic2VjdGlvbiIsInB1YmxpYyIsImVuYWJsZVF1ZXJ5T3JpZ2luYWwiLCJfaWQiLCJ2YWx1ZSIsImVuYWJsZVF1ZXJ5IiwiaTE4bkRlc2NyaXB0aW9uIiwiZW5hYmxlUXVlcnlNYXJrZWQiLCJzIiwiZGVmYXVsdCIsIkJsYXplIiwibWFya2VkIiwib3JpZ2luYWwiLCJjb2RlIiwicGFyc2VycyIsIk1hcmtkb3duQ2xhc3MiLCJwYXJzZSIsInRleHQiLCJtZXNzYWdlIiwiaHRtbCIsImVzY2FwZUhUTUwiLCJtb3VudFRva2Vuc0JhY2siLCJwYXJzZU1lc3NhZ2VOb3RFc2NhcGVkIiwicGFyc2VOb3RFc2NhcGVkIiwicGFyc2VyIiwiZ2V0IiwidXNlSHRtbCIsInRva2VucyIsImxlbmd0aCIsInRva2VuIiwibm9IdG1sIiwicmVwbGFjZSIsImFyZ3MiLCJNYXJrZG93biIsIk1hcmtkb3duTWVzc2FnZSIsInRyaW0iLCJ1bmRlZmluZWQiLCJjYWxsYmFja3MiLCJwcmlvcml0eSIsIkhJR0giLCJpc0NsaWVudCIsInJlZ2lzdGVySGVscGVyIiwib3V0cHV0IiwiZXhwb3J0IiwiUmFuZG9tIiwiXyIsImhsanMiLCJfbWFya2VkIiwicmVuZGVyZXIiLCJSZW5kZXJlciIsIm1zZyIsImxhbmciLCJlc2NhcGVkIiwib3B0aW9ucyIsImhpZ2hsaWdodCIsIm91dCIsImVzY2FwZSIsImlzU3RyaW5nIiwiaWQiLCJwdXNoIiwiY29kZXNwYW4iLCJibG9ja3F1b3RlIiwicXVvdGUiLCJlIiwiZ2ZtIiwidGFibGVzIiwiYnJlYWtzIiwicGVkYW50aWMiLCJzbWFydExpc3RzIiwic21hcnR5cGFudHMiLCJ1bmVzY2FwZUhUTUwiLCJzYW5pdGl6ZSIsImlubGluZWNvZGUiLCJtYXRjaCIsInAxIiwicDIiLCJjb2RlYmxvY2tzIiwiY291bnQiLCJtc2dQYXJ0cyIsInNwbGl0IiwiaW5kZXgiLCJwYXJ0IiwiY29kZU1hdGNoIiwic2luZ2xlTGluZSIsImluZGV4T2YiLCJBcnJheSIsImZyb20iLCJsaXN0TGFuZ3VhZ2VzIiwiaW5jbHVkZXMiLCJlbXB0eUxhbmd1YWdlIiwicmVzdWx0IiwiaGlnaGxpZ2h0QXV0byIsImxhbmd1YWdlIiwiam9pbiIsIm1hcmtkb3duIiwiYWRkQXNUb2tlbiIsInNjaGVtZXMiLCJSZWdFeHAiLCJ0aXRsZSIsInVybCIsInRhcmdldCIsImFic29sdXRlVXJsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsTUFBSjtBQUFXQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsZUFBUixDQUFiLEVBQXNDO0FBQUNILFNBQU9JLENBQVAsRUFBUztBQUFDSixhQUFPSSxDQUFQO0FBQVM7O0FBQXBCLENBQXRDLEVBQTRELENBQTVEO0FBQStELElBQUlDLFVB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b0MsQ0FPcEM7O0FBQ0FBLFVBQVFDLElBQVIsR0FBZUQsUUFBUUMsSUFBUixDQUFhWSxPQUFiLENBQXFCLE1BQXJCLEVBQTZCLE1BQTdCLENBQWY7QUFFQSxTQUFPYixPQUFQO0FBQ0EsQ0FYTSxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X21hcmtkb3duLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuTWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTWFya2Rvd25fUGFyc2VyJywgJ29yaWdpbmFsJywge1xuXHRcdHR5cGU6ICdzZWxlY3QnLFxuXHRcdHZhbHVlczogW3tcblx0XHRcdGtleTogJ2Rpc2FibGVkJyxcblx0XHRcdGkxOG5MYWJlbDogJ0Rpc2FibGVkJyxcblx0XHR9LCB7XG5cdFx0XHRrZXk6ICdvcmlnaW5hbCcsXG5cdFx0XHRpMThuTGFiZWw6ICdPcmlnaW5hbCcsXG5cdFx0fSwge1xuXHRcdFx0a2V5OiAnbWFya2VkJyxcblx0XHRcdGkxOG5MYWJlbDogJ01hcmtlZCcsXG5cdFx0fV0sXG5cdFx0Z3JvdXA6ICdNZXNzYWdlJyxcblx0XHRzZWN0aW9uOiAnTWFya2Rvd24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0fSk7XG5cblx0Y29uc3QgZW5hYmxlUXVlcnlPcmlnaW5hbCA9IHsgX2lkOiAnTWFya2Rvd25fUGFyc2VyJywgdmFsdWU6ICdvcmlnaW5hbCcgfTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX0hlYWRlcnMnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ01lc3NhZ2UnLFxuXHRcdHNlY3Rpb246ICdNYXJrZG93bicsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGVuYWJsZVF1ZXJ5OiBlbmFibGVRdWVyeU9yaWdpbmFsLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX1N1cHBvcnRTY2hlbWVzRm9yTGluaycsICdodHRwLGh0dHBzJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnTWFya2Rvd25fU3VwcG9ydFNjaGVtZXNGb3JMaW5rX0Rlc2NyaXB0aW9uJyxcblx0XHRlbmFibGVRdWVyeTogZW5hYmxlUXVlcnlPcmlnaW5hbCxcblx0fSk7XG5cblx0Y29uc3QgZW5hYmxlUXVlcnlNYXJrZWQgPSB7IF9pZDogJ01hcmtkb3duX1BhcnNlcicsIHZhbHVlOiAnbWFya2VkJyB9O1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTWFya2Rvd25fTWFya2VkX0dGTScsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdNZXNzYWdlJyxcblx0XHRzZWN0aW9uOiAnTWFya2Rvd24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRlbmFibGVRdWVyeTogZW5hYmxlUXVlcnlNYXJrZWQsXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTWFya2Rvd25fTWFya2VkX1RhYmxlcycsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdNZXNzYWdlJyxcblx0XHRzZWN0aW9uOiAnTWFya2Rvd24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRlbmFibGVRdWVyeTogZW5hYmxlUXVlcnlNYXJrZWQsXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTWFya2Rvd25fTWFya2VkX0JyZWFrcycsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdNZXNzYWdlJyxcblx0XHRzZWN0aW9uOiAnTWFya2Rvd24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRlbmFibGVRdWVyeTogZW5hYmxlUXVlcnlNYXJrZWQsXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTWFya2Rvd25fTWFya2VkX1BlZGFudGljJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdNZXNzYWdlJyxcblx0XHRzZWN0aW9uOiAnTWFya2Rvd24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRlbmFibGVRdWVyeTogW3tcblx0XHRcdF9pZDogJ01hcmtkb3duX1BhcnNlcicsXG5cdFx0XHR2YWx1ZTogJ21hcmtlZCcsXG5cdFx0fSwge1xuXHRcdFx0X2lkOiAnTWFya2Rvd25fTWFya2VkX0dGTScsXG5cdFx0XHR2YWx1ZTogZmFsc2UsXG5cdFx0fV0sXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTWFya2Rvd25fTWFya2VkX1NtYXJ0TGlzdHMnLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0ZW5hYmxlUXVlcnk6IGVuYWJsZVF1ZXJ5TWFya2VkLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9TbWFydHlwYW50cycsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdNZXNzYWdlJyxcblx0XHRzZWN0aW9uOiAnTWFya2Rvd24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRlbmFibGVRdWVyeTogZW5hYmxlUXVlcnlNYXJrZWQsXG5cdH0pO1xufSk7XG4iLCIvKlxuICogTWFya2Rvd24gaXMgYSBuYW1lZCBmdW5jdGlvbiB0aGF0IHdpbGwgcGFyc2UgbWFya2Rvd24gc3ludGF4XG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSAtIFRoZSBtZXNzYWdlIG9iamVjdFxuICovXG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEJsYXplIH0gZnJvbSAnbWV0ZW9yL2JsYXplJztcbmltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5pbXBvcnQgeyBtYXJrZWQgfSBmcm9tICcuL3BhcnNlci9tYXJrZWQvbWFya2VkLmpzJztcbmltcG9ydCB7IG9yaWdpbmFsIH0gZnJvbSAnLi9wYXJzZXIvb3JpZ2luYWwvb3JpZ2luYWwuanMnO1xuXG5pbXBvcnQgeyBjb2RlIH0gZnJvbSAnLi9wYXJzZXIvb3JpZ2luYWwvY29kZS5qcyc7XG5cbmNvbnN0IHBhcnNlcnMgPSB7XG5cdG9yaWdpbmFsLFxuXHRtYXJrZWQsXG59O1xuXG5jbGFzcyBNYXJrZG93bkNsYXNzIHtcblx0cGFyc2UodGV4dCkge1xuXHRcdGNvbnN0IG1lc3NhZ2UgPSB7XG5cdFx0XHRodG1sOiBzLmVzY2FwZUhUTUwodGV4dCksXG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcy5tb3VudFRva2Vuc0JhY2sodGhpcy5wYXJzZU1lc3NhZ2VOb3RFc2NhcGVkKG1lc3NhZ2UpKS5odG1sO1xuXHR9XG5cblx0cGFyc2VOb3RFc2NhcGVkKHRleHQpIHtcblx0XHRjb25zdCBtZXNzYWdlID0ge1xuXHRcdFx0aHRtbDogdGV4dCxcblx0XHR9O1xuXHRcdHJldHVybiB0aGlzLm1vdW50VG9rZW5zQmFjayh0aGlzLnBhcnNlTWVzc2FnZU5vdEVzY2FwZWQobWVzc2FnZSkpLmh0bWw7XG5cdH1cblxuXHRwYXJzZU1lc3NhZ2VOb3RFc2NhcGVkKG1lc3NhZ2UpIHtcblx0XHRjb25zdCBwYXJzZXIgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWFya2Rvd25fUGFyc2VyJyk7XG5cblx0XHRpZiAocGFyc2VyID09PSAnZGlzYWJsZWQnKSB7XG5cdFx0XHRyZXR1cm4gbWVzc2FnZTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHBhcnNlcnNbcGFyc2VyXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIHBhcnNlcnNbcGFyc2VyXShtZXNzYWdlKTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhcnNlcnMub3JpZ2luYWwobWVzc2FnZSk7XG5cdH1cblxuXHRtb3VudFRva2Vuc0JhY2sobWVzc2FnZSwgdXNlSHRtbCA9IHRydWUpIHtcblx0XHRpZiAobWVzc2FnZS50b2tlbnMgJiYgbWVzc2FnZS50b2tlbnMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yIChjb25zdCB7IHRva2VuLCB0ZXh0LCBub0h0bWwgfSBvZiBtZXNzYWdlLnRva2Vucykge1xuXHRcdFx0XHRtZXNzYWdlLmh0bWwgPSBtZXNzYWdlLmh0bWwucmVwbGFjZSh0b2tlbiwgKCkgPT4gKHVzZUh0bWwgPyB0ZXh0IDogbm9IdG1sKSk7IC8vIFVzZXMgbGFtYmRhIHNvIGRvZXNuJ3QgbmVlZCB0byBlc2NhcGUgJFxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Y29kZSguLi5hcmdzKSB7XG5cdFx0cmV0dXJuIGNvZGUoLi4uYXJncyk7XG5cdH1cbn1cblxuY29uc3QgTWFya2Rvd24gPSBuZXcgTWFya2Rvd25DbGFzcztcblJvY2tldENoYXQuTWFya2Rvd24gPSBNYXJrZG93bjtcblxuLy8gcmVuZGVyTWVzc2FnZSBhbHJlYWR5IGRpZCBodG1sIGVzY2FwZVxuY29uc3QgTWFya2Rvd25NZXNzYWdlID0gKG1lc3NhZ2UpID0+IHtcblx0aWYgKHMudHJpbShtZXNzYWdlICE9IG51bGwgPyBtZXNzYWdlLmh0bWwgOiB1bmRlZmluZWQpKSB7XG5cdFx0bWVzc2FnZSA9IE1hcmtkb3duLnBhcnNlTWVzc2FnZU5vdEVzY2FwZWQobWVzc2FnZSk7XG5cdH1cblxuXHRyZXR1cm4gbWVzc2FnZTtcbn07XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgncmVuZGVyTWVzc2FnZScsIE1hcmtkb3duTWVzc2FnZSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuSElHSCwgJ21hcmtkb3duJyk7XG5cbmlmIChNZXRlb3IuaXNDbGllbnQpIHtcblx0QmxhemUucmVnaXN0ZXJIZWxwZXIoJ1JvY2tldENoYXRNYXJrZG93bicsICh0ZXh0KSA9PiBNYXJrZG93bi5wYXJzZSh0ZXh0KSk7XG5cdEJsYXplLnJlZ2lzdGVySGVscGVyKCdSb2NrZXRDaGF0TWFya2Rvd25VbmVzY2FwZScsICh0ZXh0KSA9PiBNYXJrZG93bi5wYXJzZU5vdEVzY2FwZWQodGV4dCkpO1xuXHRCbGF6ZS5yZWdpc3RlckhlbHBlcignUm9ja2V0Q2hhdE1hcmtkb3duSW5saW5lJywgKHRleHQpID0+IHtcblx0XHRjb25zdCBvdXRwdXQgPSBNYXJrZG93bi5wYXJzZSh0ZXh0KTtcblx0XHRyZXR1cm4gb3V0cHV0LnJlcGxhY2UoL148cD4vLCAnJykucmVwbGFjZSgvPFxcL3A+JC8sICcnKTtcblx0fSk7XG59XG4iLCJpbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJ21ldGVvci9yYW5kb20nO1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5pbXBvcnQgaGxqcyBmcm9tICdoaWdobGlnaHQuanMnO1xuaW1wb3J0IF9tYXJrZWQgZnJvbSAnbWFya2VkJztcblxuY29uc3QgcmVuZGVyZXIgPSBuZXcgX21hcmtlZC5SZW5kZXJlcigpO1xuXG5sZXQgbXNnID0gbnVsbDtcblxucmVuZGVyZXIuY29kZSA9IGZ1bmN0aW9uKGNvZGUsIGxhbmcsIGVzY2FwZWQpIHtcblx0aWYgKHRoaXMub3B0aW9ucy5oaWdobGlnaHQpIHtcblx0XHRjb25zdCBvdXQgPSB0aGlzLm9wdGlvbnMuaGlnaGxpZ2h0KGNvZGUsIGxhbmcpO1xuXHRcdGlmIChvdXQgIT0gbnVsbCAmJiBvdXQgIT09IGNvZGUpIHtcblx0XHRcdGVzY2FwZWQgPSB0cnVlO1xuXHRcdFx0Y29kZSA9IG91dDtcblx0XHR9XG5cdH1cblxuXHRsZXQgdGV4dCA9IG51bGw7XG5cblx0aWYgKCFsYW5nKSB7XG5cdFx0dGV4dCA9IGA8cHJlPjxjb2RlIGNsYXNzPVwiY29kZS1jb2xvcnMgaGxqc1wiPiR7IChlc2NhcGVkID8gY29kZSA6IHMuZXNjYXBlSFRNTChjb2RlLCB0cnVlKSkgfTwvY29kZT48L3ByZT5gO1xuXHR9IGVsc2Uge1xuXHRcdHRleHQgPSBgPHByZT48Y29kZSBjbGFzcz1cImNvZGUtY29sb3JzIGhsanMgJHsgZXNjYXBlKGxhbmcsIHRydWUpIH1cIj4keyAoZXNjYXBlZCA/IGNvZGUgOiBzLmVzY2FwZUhUTUwoY29kZSwgdHJ1ZSkpIH08L2NvZGU+PC9wcmU+YDtcblx0fVxuXG5cdGlmIChfLmlzU3RyaW5nKG1zZykpIHtcblx0XHRyZXR1cm4gdGV4dDtcblx0fVxuXG5cdGNvbnN0IHRva2VuID0gYD0hPSR7IFJhbmRvbS5pZCgpIH09IT1gO1xuXHRtc2cudG9rZW5zLnB1c2goe1xuXHRcdGhpZ2hsaWdodDogdHJ1ZSxcblx0XHR0b2tlbixcblx0XHR0ZXh0LFxuXHR9KTtcblxuXHRyZXR1cm4gdG9rZW47XG59O1xuXG5yZW5kZXJlci5jb2Rlc3BhbiA9IGZ1bmN0aW9uKHRleHQpIHtcblx0dGV4dCA9IGA8Y29kZSBjbGFzcz1cImNvZGUtY29sb3JzIGlubGluZVwiPiR7IHRleHQgfTwvY29kZT5gO1xuXHRpZiAoXy5pc1N0cmluZyhtc2cpKSB7XG5cdFx0cmV0dXJuIHRleHQ7XG5cdH1cblxuXHRjb25zdCB0b2tlbiA9IGA9IT0keyBSYW5kb20uaWQoKSB9PSE9YDtcblx0bXNnLnRva2Vucy5wdXNoKHtcblx0XHR0b2tlbixcblx0XHR0ZXh0LFxuXHR9KTtcblxuXHRyZXR1cm4gdG9rZW47XG59O1xuXG5yZW5kZXJlci5ibG9ja3F1b3RlID0gZnVuY3Rpb24ocXVvdGUpIHtcblx0cmV0dXJuIGA8YmxvY2txdW90ZSBjbGFzcz1cImJhY2tncm91bmQtdHJhbnNwYXJlbnQtZGFya2VyLWJlZm9yZVwiPiR7IHF1b3RlIH08L2Jsb2NrcXVvdGU+YDtcbn07XG5cbmNvbnN0IGhpZ2hsaWdodCA9IGZ1bmN0aW9uKGNvZGUsIGxhbmcpIHtcblx0aWYgKCFsYW5nKSB7XG5cdFx0cmV0dXJuIGNvZGU7XG5cdH1cblx0dHJ5IHtcblx0XHRyZXR1cm4gaGxqcy5oaWdobGlnaHQobGFuZywgY29kZSkudmFsdWU7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHQvLyBVbmtub3duIGxhbmd1YWdlXG5cdFx0cmV0dXJuIGNvZGU7XG5cdH1cbn07XG5cbmxldCBnZm0gPSBudWxsO1xubGV0IHRhYmxlcyA9IG51bGw7XG5sZXQgYnJlYWtzID0gbnVsbDtcbmxldCBwZWRhbnRpYyA9IG51bGw7XG5sZXQgc21hcnRMaXN0cyA9IG51bGw7XG5sZXQgc21hcnR5cGFudHMgPSBudWxsO1xuXG5leHBvcnQgY29uc3QgbWFya2VkID0gKG1lc3NhZ2UpID0+IHtcblx0bXNnID0gbWVzc2FnZTtcblxuXHRpZiAoIW1zZy50b2tlbnMpIHtcblx0XHRtc2cudG9rZW5zID0gW107XG5cdH1cblxuXHRpZiAoZ2ZtID09IG51bGwpIHsgZ2ZtID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01hcmtkb3duX01hcmtlZF9HRk0nKTsgfVxuXHRpZiAodGFibGVzID09IG51bGwpIHsgdGFibGVzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01hcmtkb3duX01hcmtlZF9UYWJsZXMnKTsgfVxuXHRpZiAoYnJlYWtzID09IG51bGwpIHsgYnJlYWtzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01hcmtkb3duX01hcmtlZF9CcmVha3MnKTsgfVxuXHRpZiAocGVkYW50aWMgPT0gbnVsbCkgeyBwZWRhbnRpYyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9NYXJrZWRfUGVkYW50aWMnKTsgfVxuXHRpZiAoc21hcnRMaXN0cyA9PSBudWxsKSB7IHNtYXJ0TGlzdHMgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWFya2Rvd25fTWFya2VkX1NtYXJ0TGlzdHMnKTsgfVxuXHRpZiAoc21hcnR5cGFudHMgPT0gbnVsbCkgeyBzbWFydHlwYW50cyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9NYXJrZWRfU21hcnR5cGFudHMnKTsgfVxuXG5cdG1zZy5odG1sID0gX21hcmtlZChzLnVuZXNjYXBlSFRNTChtc2cuaHRtbCksIHtcblx0XHRnZm0sXG5cdFx0dGFibGVzLFxuXHRcdGJyZWFrcyxcblx0XHRwZWRhbnRpYyxcblx0XHRzbWFydExpc3RzLFxuXHRcdHNtYXJ0eXBhbnRzLFxuXHRcdHJlbmRlcmVyLFxuXHRcdHNhbml0aXplOiB0cnVlLFxuXHRcdGhpZ2hsaWdodCxcblx0fSk7XG5cblx0cmV0dXJuIG1zZztcbn07XG4iLCIvKlxuICogY29kZSgpIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHBhcnNlIGBpbmxpbmUgY29kZWAgYW5kIGBgYGNvZGVibG9ja2BgYCBzeW50YXhlc1xuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgLSBUaGUgbWVzc2FnZSBvYmplY3RcbiAqL1xuaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnbWV0ZW9yL3JhbmRvbSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5pbXBvcnQgaGxqcyBmcm9tICdoaWdobGlnaHQuanMnO1xuXG5jb25zdCBpbmxpbmVjb2RlID0gKG1lc3NhZ2UpID0+XG5cdC8vIFN1cHBvcnQgYHRleHRgXG5cdG1lc3NhZ2UuaHRtbCA9IG1lc3NhZ2UuaHRtbC5yZXBsYWNlKC9cXGAoW15gXFxyXFxuXSspXFxgKFs8Xyp+XXxcXEJ8XFxifCQpL2dtLCAobWF0Y2gsIHAxLCBwMikgPT4ge1xuXHRcdGNvbnN0IHRva2VuID0gYCA9IT0keyBSYW5kb20uaWQoKSB9PSE9YDtcblxuXHRcdG1lc3NhZ2UudG9rZW5zLnB1c2goe1xuXHRcdFx0dG9rZW4sXG5cdFx0XHR0ZXh0OiBgPHNwYW4gY2xhc3M9XFxcImNvcHlvbmx5XFxcIj5cXGA8L3NwYW4+PHNwYW4+PGNvZGUgY2xhc3M9XFxcImNvZGUtY29sb3JzIGlubGluZVxcXCI+JHsgcDEgfTwvY29kZT48L3NwYW4+PHNwYW4gY2xhc3M9XFxcImNvcHlvbmx5XFxcIj5cXGA8L3NwYW4+JHsgcDIgfWAsXG5cdFx0XHRub0h0bWw6IG1hdGNoLFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRva2VuO1xuXHR9KVxuO1xuXG5jb25zdCBjb2RlYmxvY2tzID0gKG1lc3NhZ2UpID0+IHtcblx0Ly8gQ291bnQgb2NjdXJlbmNpZXMgb2YgYGBgXG5cdGNvbnN0IGNvdW50ID0gKG1lc3NhZ2UuaHRtbC5tYXRjaCgvYGBgL2cpIHx8IFtdKS5sZW5ndGg7XG5cblx0aWYgKGNvdW50KSB7XG5cblx0XHQvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIGFkZCBhIGZpbmFsIGBgYFxuXHRcdGlmICgoY291bnQgJSAyKSA+IDApIHtcblx0XHRcdG1lc3NhZ2UuaHRtbCA9IGAkeyBtZXNzYWdlLmh0bWwgfVxcblxcYFxcYFxcYGA7XG5cdFx0XHRtZXNzYWdlLm1zZyA9IGAkeyBtZXNzYWdlLm1zZyB9XFxuXFxgXFxgXFxgYDtcblx0XHR9XG5cblx0XHQvLyBTZXBhcmF0ZSB0ZXh0IGluIGNvZGUgYmxvY2tzIGFuZCBub24gY29kZSBibG9ja3Ncblx0XHRjb25zdCBtc2dQYXJ0cyA9IG1lc3NhZ2UuaHRtbC5zcGxpdCgvKF4uKikoYGBgKD86W2EtekEtWl0rKT8oPzooPzoufFxccnxcXG4pKj8pYGBgKSguKlxcbj8pJC9nbSk7XG5cblx0XHRmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgbXNnUGFydHMubGVuZ3RoOyBpbmRleCsrKSB7XG5cdFx0XHQvLyBWZXJpZnkgaWYgdGhpcyBwYXJ0IGlzIGNvZGVcblx0XHRcdGNvbnN0IHBhcnQgPSBtc2dQYXJ0c1tpbmRleF07XG5cdFx0XHRjb25zdCBjb2RlTWF0Y2ggPSBwYXJ0Lm1hdGNoKC9eYGBgW1xcclxcbl0qKC4qW1xcclxcblxcIF0/KVtcXHJcXG5dKihbXFxzXFxTXSo/KWBgYCs/JC8pO1xuXG5cdFx0XHRpZiAoY29kZU1hdGNoICE9IG51bGwpIHtcblx0XHRcdFx0Ly8gUHJvY2VzcyBoaWdobGlnaHQgaWYgdGhpcyBwYXJ0IGlzIGNvZGVcblx0XHRcdFx0Y29uc3Qgc2luZ2xlTGluZSA9IGNvZGVNYXRjaFswXS5pbmRleE9mKCdcXG4nKSA9PT0gLTE7XG5cdFx0XHRcdGNvbnN0IGxhbmcgPSAhc2luZ2xlTGluZSAmJiBBcnJheS5mcm9tKGhsanMubGlzdExhbmd1YWdlcygpKS5pbmNsdWRlcyhzLnRyaW0oY29kZU1hdGNoWzFdKSkgPyBzLnRyaW0oY29kZU1hdGNoWzFdKSA6ICcnO1xuXHRcdFx0XHRjb25zdCBlbXB0eUxhbmd1YWdlID0gbGFuZyA9PT0gJycgPyBzLnVuZXNjYXBlSFRNTChjb2RlTWF0Y2hbMV0gKyBjb2RlTWF0Y2hbMl0pIDogcy51bmVzY2FwZUhUTUwoY29kZU1hdGNoWzJdKTtcblx0XHRcdFx0Y29uc3QgY29kZSA9IHNpbmdsZUxpbmUgPyBzLnVuZXNjYXBlSFRNTChjb2RlTWF0Y2hbMV0pIDogZW1wdHlMYW5ndWFnZTtcblxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBsYW5nID09PSAnJyA/IGhsanMuaGlnaGxpZ2h0QXV0bygobGFuZyArIGNvZGUpKSA6IGhsanMuaGlnaGxpZ2h0KGxhbmcsIGNvZGUpO1xuXHRcdFx0XHRjb25zdCB0b2tlbiA9IGA9IT0keyBSYW5kb20uaWQoKSB9PSE9YDtcblxuXHRcdFx0XHRtZXNzYWdlLnRva2Vucy5wdXNoKHtcblx0XHRcdFx0XHRoaWdobGlnaHQ6IHRydWUsXG5cdFx0XHRcdFx0dG9rZW4sXG5cdFx0XHRcdFx0dGV4dDogYDxwcmU+PGNvZGUgY2xhc3M9J2NvZGUtY29sb3JzIGhsanMgJHsgcmVzdWx0Lmxhbmd1YWdlIH0nPjxzcGFuIGNsYXNzPSdjb3B5b25seSc+XFxgXFxgXFxgPGJyPjwvc3Bhbj4keyByZXN1bHQudmFsdWUgfTxzcGFuIGNsYXNzPSdjb3B5b25seSc+PGJyPlxcYFxcYFxcYDwvc3Bhbj48L2NvZGU+PC9wcmU+YCxcblx0XHRcdFx0XHRub0h0bWw6IGNvZGVNYXRjaFswXSxcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0bXNnUGFydHNbaW5kZXhdID0gdG9rZW47XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtc2dQYXJ0c1tpbmRleF0gPSBwYXJ0O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFJlLW1vdW50IG1lc3NhZ2Vcblx0XHRyZXR1cm4gbWVzc2FnZS5odG1sID0gbXNnUGFydHMuam9pbignJyk7XG5cdH1cbn07XG5cbmV4cG9ydCBjb25zdCBjb2RlID0gKG1lc3NhZ2UpID0+IHtcblx0aWYgKHMudHJpbShtZXNzYWdlLmh0bWwpKSB7XG5cdFx0aWYgKG1lc3NhZ2UudG9rZW5zID09IG51bGwpIHtcblx0XHRcdG1lc3NhZ2UudG9rZW5zID0gW107XG5cdFx0fVxuXG5cdFx0Y29kZWJsb2NrcyhtZXNzYWdlKTtcblx0XHRpbmxpbmVjb2RlKG1lc3NhZ2UpO1xuXHR9XG5cblx0cmV0dXJuIG1lc3NhZ2U7XG59O1xuIiwiLypcbiAqIE1hcmtkb3duIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHBhcnNlIG1hcmtkb3duIHN5bnRheFxuICogQHBhcmFtIHtTdHJpbmd9IG1zZyAtIFRoZSBtZXNzYWdlIGh0bWxcbiAqL1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICdtZXRlb3IvcmFuZG9tJztcbmltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuXG5jb25zdCBwYXJzZU5vdEVzY2FwZWQgPSBmdW5jdGlvbihtc2csIG1lc3NhZ2UpIHtcblx0aWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS50b2tlbnMgPT0gbnVsbCkge1xuXHRcdG1lc3NhZ2UudG9rZW5zID0gW107XG5cdH1cblxuXHRjb25zdCBhZGRBc1Rva2VuID0gZnVuY3Rpb24oaHRtbCkge1xuXHRcdGNvbnN0IHRva2VuID0gYD0hPSR7IFJhbmRvbS5pZCgpIH09IT1gO1xuXHRcdG1lc3NhZ2UudG9rZW5zLnB1c2goe1xuXHRcdFx0dG9rZW4sXG5cdFx0XHR0ZXh0OiBodG1sLFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRva2VuO1xuXHR9O1xuXG5cdGNvbnN0IHNjaGVtZXMgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWFya2Rvd25fU3VwcG9ydFNjaGVtZXNGb3JMaW5rJykuc3BsaXQoJywnKS5qb2luKCd8Jyk7XG5cblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9IZWFkZXJzJykpIHtcblx0XHQvLyBTdXBwb3J0ICMgVGV4dCBmb3IgaDFcblx0XHRtc2cgPSBtc2cucmVwbGFjZSgvXiMgKChbXFxTXFx3XFxkLV9cXC9cXCpcXC4sXFxcXF1bIFxcdTAwYTBcXHUxNjgwXFx1MTgwZVxcdTIwMDAtXFx1MjAwYVxcdTIwMjhcXHUyMDI5XFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1ZmVmZl0/KSspL2dtLCAnPGgxPiQxPC9oMT4nKTtcblxuXHRcdC8vIFN1cHBvcnQgIyBUZXh0IGZvciBoMlxuXHRcdG1zZyA9IG1zZy5yZXBsYWNlKC9eIyMgKChbXFxTXFx3XFxkLV9cXC9cXCpcXC4sXFxcXF1bIFxcdTAwYTBcXHUxNjgwXFx1MTgwZVxcdTIwMDAtXFx1MjAwYVxcdTIwMjhcXHUyMDI5XFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1ZmVmZl0/KSspL2dtLCAnPGgyPiQxPC9oMj4nKTtcblxuXHRcdC8vIFN1cHBvcnQgIyBUZXh0IGZvciBoM1xuXHRcdG1zZyA9IG1zZy5yZXBsYWNlKC9eIyMjICgoW1xcU1xcd1xcZC1fXFwvXFwqXFwuLFxcXFxdWyBcXHUwMGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwLVxcdTIwMGFcXHUyMDI4XFx1MjAyOVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdWZlZmZdPykrKS9nbSwgJzxoMz4kMTwvaDM+Jyk7XG5cblx0XHQvLyBTdXBwb3J0ICMgVGV4dCBmb3IgaDRcblx0XHRtc2cgPSBtc2cucmVwbGFjZSgvXiMjIyMgKChbXFxTXFx3XFxkLV9cXC9cXCpcXC4sXFxcXF1bIFxcdTAwYTBcXHUxNjgwXFx1MTgwZVxcdTIwMDAtXFx1MjAwYVxcdTIwMjhcXHUyMDI5XFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1ZmVmZl0/KSspL2dtLCAnPGg0PiQxPC9oND4nKTtcblx0fVxuXG5cdC8vIFN1cHBvcnQgKnRleHQqIHRvIG1ha2UgYm9sZFxuXHRtc2cgPSBtc2cucmVwbGFjZSgvKF58Jmd0O3xbID5ffmBdKVxcKnsxLDJ9KFteXFwqXFxyXFxuXSspXFwqezEsMn0oWzxffmBdfFxcQnxcXGJ8JCkvZ20sICckMTxzcGFuIGNsYXNzPVwiY29weW9ubHlcIj4qPC9zcGFuPjxzdHJvbmc+JDI8L3N0cm9uZz48c3BhbiBjbGFzcz1cImNvcHlvbmx5XCI+Kjwvc3Bhbj4kMycpO1xuXG5cdC8vIFN1cHBvcnQgX3RleHRfIHRvIG1ha2UgaXRhbGljc1xuXHRtc2cgPSBtc2cucmVwbGFjZSgvKF58Jmd0O3xbID4qfmBdKVxcX3sxLDJ9KFteXFxfXFxyXFxuXSspXFxfezEsMn0oWzwqfmBdfFxcQnxcXGJ8JCkvZ20sICckMTxzcGFuIGNsYXNzPVwiY29weW9ubHlcIj5fPC9zcGFuPjxlbT4kMjwvZW0+PHNwYW4gY2xhc3M9XCJjb3B5b25seVwiPl88L3NwYW4+JDMnKTtcblxuXHQvLyBTdXBwb3J0IH50ZXh0fiB0byBzdHJpa2UgdGhyb3VnaCB0ZXh0XG5cdG1zZyA9IG1zZy5yZXBsYWNlKC8oXnwmZ3Q7fFsgPl8qYF0pXFx+ezEsMn0oW15+XFxyXFxuXSspXFx+ezEsMn0oWzxfKmBdfFxcQnxcXGJ8JCkvZ20sICckMTxzcGFuIGNsYXNzPVwiY29weW9ubHlcIj5+PC9zcGFuPjxzdHJpa2U+JDI8L3N0cmlrZT48c3BhbiBjbGFzcz1cImNvcHlvbmx5XCI+fjwvc3Bhbj4kMycpO1xuXG5cdC8vIFN1cHBvcnQgZm9yIGJsb2NrIHF1b3RlXG5cdC8vID4+PlxuXHQvLyBUZXh0XG5cdC8vIDw8PFxuXHRtc2cgPSBtc2cucmVwbGFjZSgvKD86Jmd0Oyl7M31cXG4rKFtcXHNcXFNdKj8pXFxuKyg/OiZsdDspezN9L2csICc8YmxvY2txdW90ZSBjbGFzcz1cImJhY2tncm91bmQtdHJhbnNwYXJlbnQtZGFya2VyLWJlZm9yZVwiPjxzcGFuIGNsYXNzPVwiY29weW9ubHlcIj4mZ3Q7Jmd0OyZndDs8L3NwYW4+JDE8c3BhbiBjbGFzcz1cImNvcHlvbmx5XCI+Jmx0OyZsdDsmbHQ7PC9zcGFuPjwvYmxvY2txdW90ZT4nKTtcblxuXHQvLyBTdXBwb3J0ID5UZXh0IGZvciBxdW90ZVxuXHRtc2cgPSBtc2cucmVwbGFjZSgvXiZndDsoLiopJC9nbSwgJzxibG9ja3F1b3RlIGNsYXNzPVwiYmFja2dyb3VuZC10cmFuc3BhcmVudC1kYXJrZXItYmVmb3JlXCI+PHNwYW4gY2xhc3M9XCJjb3B5b25seVwiPiZndDs8L3NwYW4+JDE8L2Jsb2NrcXVvdGU+Jyk7XG5cblx0Ly8gUmVtb3ZlIHdoaXRlLXNwYWNlIGFyb3VuZCBibG9ja3F1b3RlIChwcmV2ZW50IDxicj4pLiBCZWNhdXNlIGJsb2NrcXVvdGUgaXMgYmxvY2sgZWxlbWVudC5cblx0bXNnID0gbXNnLnJlcGxhY2UoL1xccyo8YmxvY2txdW90ZSBjbGFzcz1cImJhY2tncm91bmQtdHJhbnNwYXJlbnQtZGFya2VyLWJlZm9yZVwiPi9nbSwgJzxibG9ja3F1b3RlIGNsYXNzPVwiYmFja2dyb3VuZC10cmFuc3BhcmVudC1kYXJrZXItYmVmb3JlXCI+Jyk7XG5cdG1zZyA9IG1zZy5yZXBsYWNlKC88XFwvYmxvY2txdW90ZT5cXHMqL2dtLCAnPC9ibG9ja3F1b3RlPicpO1xuXG5cdC8vIFJlbW92ZSBuZXctbGluZSBiZXR3ZWVuIGJsb2NrcXVvdGVzLlxuXHRtc2cgPSBtc2cucmVwbGFjZSgvPFxcL2Jsb2NrcXVvdGU+XFxuPGJsb2NrcXVvdGUvZ20sICc8L2Jsb2NrcXVvdGU+PGJsb2NrcXVvdGUnKTtcblxuXHQvLyBTdXBwb3J0ICFbYWx0IHRleHRdKGh0dHA6Ly9pbWFnZSB1cmwpXG5cdG1zZyA9IG1zZy5yZXBsYWNlKG5ldyBSZWdFeHAoYCFcXFxcWyhbXlxcXFxdXSspXFxcXF1cXFxcKCgoPzokeyBzY2hlbWVzIH0pOlxcXFwvXFxcXC9bXlxcXFwpXSspXFxcXClgLCAnZ20nKSwgKG1hdGNoLCB0aXRsZSwgdXJsKSA9PiB7XG5cdFx0Y29uc3QgdGFyZ2V0ID0gdXJsLmluZGV4T2YoTWV0ZW9yLmFic29sdXRlVXJsKCkpID09PSAwID8gJycgOiAnX2JsYW5rJztcblx0XHRyZXR1cm4gYWRkQXNUb2tlbihgPGEgaHJlZj1cIiR7IHMuZXNjYXBlSFRNTCh1cmwpIH1cIiB0aXRsZT1cIiR7IHMuZXNjYXBlSFRNTCh0aXRsZSkgfVwiIHRhcmdldD1cIiR7IHMuZXNjYXBlSFRNTCh0YXJnZXQpIH1cIiByZWw9XCJub29wZW5lciBub3JlZmVycmVyXCI+PGRpdiBjbGFzcz1cImlubGluZS1pbWFnZVwiIHN0eWxlPVwiYmFja2dyb3VuZC1pbWFnZTogdXJsKCR7IHMuZXNjYXBlSFRNTCh1cmwpIH0pO1wiPjwvZGl2PjwvYT5gKTtcblx0fSk7XG5cblx0Ly8gU3VwcG9ydCBbVGV4dF0oaHR0cDovL2xpbmspXG5cdG1zZyA9IG1zZy5yZXBsYWNlKG5ldyBSZWdFeHAoYFxcXFxbKFteXFxcXF1dKylcXFxcXVxcXFwoKCg/OiR7IHNjaGVtZXMgfSk6XFxcXC9cXFxcL1teXFxcXCldKylcXFxcKWAsICdnbScpLCAobWF0Y2gsIHRpdGxlLCB1cmwpID0+IHtcblx0XHRjb25zdCB0YXJnZXQgPSB1cmwuaW5kZXhPZihNZXRlb3IuYWJzb2x1dGVVcmwoKSkgPT09IDAgPyAnJyA6ICdfYmxhbmsnO1xuXHRcdHJldHVybiBhZGRBc1Rva2VuKGA8YSBocmVmPVwiJHsgcy5lc2NhcGVIVE1MKHVybCkgfVwiIHRhcmdldD1cIiR7IHMuZXNjYXBlSFRNTCh0YXJnZXQpIH1cIiByZWw9XCJub29wZW5lciBub3JlZmVycmVyXCI+JHsgcy5lc2NhcGVIVE1MKHRpdGxlKSB9PC9hPmApO1xuXHR9KTtcblxuXHQvLyBTdXBwb3J0IDxodHRwOi8vbGlua3xUZXh0PlxuXHRtc2cgPSBtc2cucmVwbGFjZShuZXcgUmVnRXhwKGAoPzo8fCZsdDspKCg/OiR7IHNjaGVtZXMgfSk6XFxcXC9cXFxcL1teXFxcXHxdKylcXFxcfCguKz8pKD89PnwmZ3Q7KSg/Oj58Jmd0OylgLCAnZ20nKSwgKG1hdGNoLCB1cmwsIHRpdGxlKSA9PiB7XG5cdFx0Y29uc3QgdGFyZ2V0ID0gdXJsLmluZGV4T2YoTWV0ZW9yLmFic29sdXRlVXJsKCkpID09PSAwID8gJycgOiAnX2JsYW5rJztcblx0XHRyZXR1cm4gYWRkQXNUb2tlbihgPGEgaHJlZj1cIiR7IHMuZXNjYXBlSFRNTCh1cmwpIH1cIiB0YXJnZXQ9XCIkeyBzLmVzY2FwZUhUTUwodGFyZ2V0KSB9XCIgcmVsPVwibm9vcGVuZXIgbm9yZWZlcnJlclwiPiR7IHMuZXNjYXBlSFRNTCh0aXRsZSkgfTwvYT5gKTtcblx0fSk7XG5cblx0cmV0dXJuIG1zZztcbn07XG5cbmV4cG9ydCBjb25zdCBtYXJrZG93biA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0bWVzc2FnZS5odG1sID0gcGFyc2VOb3RFc2NhcGVkKG1lc3NhZ2UuaHRtbCwgbWVzc2FnZSk7XG5cdHJldHVybiBtZXNzYWdlO1xufTtcbiIsIi8qXG4gKiBNYXJrZG93biBpcyBhIG5hbWVkIGZ1bmN0aW9uIHRoYXQgd2lsbCBwYXJzZSBtYXJrZG93biBzeW50YXhcbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIC0gVGhlIG1lc3NhZ2Ugb2JqZWN0XG4gKi9cbmltcG9ydCB7IG1hcmtkb3duIH0gZnJvbSAnLi9tYXJrZG93bi5qcyc7XG5pbXBvcnQgeyBjb2RlIH0gZnJvbSAnLi9jb2RlLmpzJztcblxuZXhwb3J0IGNvbnN0IG9yaWdpbmFsID0gKG1lc3NhZ2UpID0+IHtcblx0Ly8gUGFyc2UgbWFya2Rvd24gY29kZVxuXHRtZXNzYWdlID0gY29kZShtZXNzYWdlKTtcblxuXHQvLyBQYXJzZSBtYXJrZG93blxuXHRtZXNzYWdlID0gbWFya2Rvd24obWVzc2FnZSk7XG5cblx0Ly8gUmVwbGFjZSBsaW5lYnJlYWsgdG8gYnJcblx0bWVzc2FnZS5odG1sID0gbWVzc2FnZS5odG1sLnJlcGxhY2UoL1xcbi9nbSwgJzxicj4nKTtcblxuXHRyZXR1cm4gbWVzc2FnZTtcbn07XG4iXX0=
