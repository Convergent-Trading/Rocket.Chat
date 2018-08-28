(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var FlowRouter = Package['kadira:flow-router'].FlowRouter;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var Mailer;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:mailer":{"lib":{"Mailer.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailer/lib/Mailer.js                                                                //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
Mailer = {}; //eslint-disable-line
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"startup.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailer/server/startup.js                                                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
Meteor.startup(function () {
  return RocketChat.models.Permissions.upsert('access-mailer', {
    $setOnInsert: {
      _id: 'access-mailer',
      roles: ['admin']
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"Users.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailer/server/models/Users.js                                                       //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
RocketChat.models.Users.rocketMailUnsubscribe = function (_id, createdAt) {
  const query = {
    _id,
    createdAt: new Date(parseInt(createdAt))
  };
  const update = {
    $set: {
      'mailer.unsubscribed': true
    }
  };
  const affectedRows = this.update(query, update);
  console.log('[Mailer:Unsubscribe]', _id, createdAt, new Date(parseInt(createdAt)), affectedRows);
  return affectedRows;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"sendMail.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailer/server/functions/sendMail.js                                                 //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

Mailer.sendMail = function (from, subject, body, dryrun, query) {
  const rfcMailPatternWithName = /^(?:.*<)?([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)(?:>?)$/;

  if (!rfcMailPatternWithName.test(from)) {
    throw new Meteor.Error('error-invalid-from-address', 'Invalid from address', {
      function: 'Mailer.sendMail'
    });
  }

  if (body.indexOf('[unsubscribe]') === -1) {
    throw new Meteor.Error('error-missing-unsubscribe-link', 'You must provide the [unsubscribe] link.', {
      function: 'Mailer.sendMail'
    });
  }

  const header = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Header') || '');
  const footer = RocketChat.placeholders.replace(RocketChat.settings.get('Email_Footer') || '');
  let userQuery = {
    'mailer.unsubscribed': {
      $exists: 0
    }
  };

  if (query) {
    userQuery = {
      $and: [userQuery, EJSON.parse(query)]
    };
  }

  if (dryrun) {
    return Meteor.users.find({
      'emails.address': from
    }).forEach(user => {
      let email = undefined;

      if (user.emails && user.emails[0] && user.emails[0].address) {
        email = user.emails[0].address;
      }

      const html = RocketChat.placeholders.replace(body, {
        unsubscribe: Meteor.absoluteUrl(FlowRouter.path('mailer/unsubscribe/:_id/:createdAt', {
          _id: user._id,
          createdAt: user.createdAt.getTime()
        })),
        name: user.name,
        email
      });
      email = `${user.name} <${email}>`;

      if (rfcMailPatternWithName.test(email)) {
        Meteor.defer(function () {
          return Email.send({
            to: email,
            from,
            subject,
            html: header + html + footer
          });
        });
        return console.log(`Sending email to ${email}`);
      }
    });
  } else {
    return Meteor.users.find(userQuery).forEach(function (user) {
      let email = undefined;

      if (user.emails && user.emails[0] && user.emails[0].address) {
        email = user.emails[0].address;
      }

      const html = RocketChat.placeholders.replace(body, {
        unsubscribe: Meteor.absoluteUrl(FlowRouter.path('mailer/unsubscribe/:_id/:createdAt', {
          _id: user._id,
          createdAt: user.createdAt.getTime()
        })),
        name: s.escapeHTML(user.name),
        email: s.escapeHTML(email)
      });
      email = `${user.name} <${email}>`;

      if (rfcMailPatternWithName.test(email)) {
        Meteor.defer(function () {
          return Email.send({
            to: email,
            from,
            subject,
            html: header + html + footer
          });
        });
        return console.log(`Sending email to ${email}`);
      }
    });
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unsubscribe.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailer/server/functions/unsubscribe.js                                              //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/* globals Mailer */
Mailer.unsubscribe = function (_id, createdAt) {
  if (_id && createdAt) {
    return RocketChat.models.Users.rocketMailUnsubscribe(_id, createdAt) === 1;
  }

  return false;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"sendMail.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailer/server/methods/sendMail.js                                                   //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/* globals Mailer */
Meteor.methods({
  'Mailer.sendMail'(from, subject, body, dryrun, query) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'Mailer.sendMail'
      });
    }

    if (RocketChat.authz.hasRole(userId, 'admin') !== true) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'Mailer.sendMail'
      });
    }

    return Mailer.sendMail(from, subject, body, dryrun, query);
  }

}); // Limit setting username once per minute
// DDPRateLimiter.addRule
//	type: 'method'
//	name: 'Mailer.sendMail'
//	connectionId: -> return true
//	, 1, 60000
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unsubscribe.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailer/server/methods/unsubscribe.js                                                //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/* globals Mailer */
Meteor.methods({
  'Mailer:unsubscribe'(_id, createdAt) {
    return Mailer.unsubscribe(_id, createdAt);
  }

});
DDPRateLimiter.addRule({
  type: 'method',
  name: 'Mailer:unsubscribe',

  connectionId() {
    return true;
  }

}, 1, 60000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:mailer/lib/Mailer.js");
require("/node_modules/meteor/rocketchat:mailer/server/startup.js");
require("/node_modules/meteor/rocketchat:mailer/server/models/Users.js");
require("/node_modules/meteor/rocketchat:mailer/server/functions/sendMail.js");
require("/node_modules/meteor/rocketchat:mailer/server/functions/unsubscribe.js");
require("/node_modules/meteor/rocketchat:mailer/server/methods/sendMail.js");
require("/node_modules/meteor/rocketchat:mailer/server/methods/unsubscribe.js");

/* Exports */
Package._define("rocketchat:mailer", {
  Mailer: Mailer
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_mailer.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYWlsZXIvbGliL01haWxlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYWlsZXIvc2VydmVyL3N0YXJ0dXAuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFpbGVyL3NlcnZlci9tb2RlbHMvVXNlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFpbGVyL3NlcnZlci9mdW5jdGlvbnMvc2VuZE1haWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFpbGVyL3NlcnZlci9mdW5jdGlvbnMvdW5zdWJzY3JpYmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFpbGVyL3NlcnZlci9tZXRob2RzL3NlbmRNYWlsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0Om1haWxlci9zZXJ2ZXIvbWV0aG9kcy91bnN1YnNjcmliZS5qcyJdLCJuYW1lcyI6WyJNYWlsZXIiLCJNZXRlb3IiLCJzdGFydHVwIiwiUm9ja2V0Q2hhdCIsIm1vZGVscyIsIlBlcm1pc3Npb25zIiwidXBzZXJ0IiwiJHNldE9uSW5zZXJ0IiwiX2lkIiwicm9sZXMiLCJVc2VycyIsInJvY2tldE1haWxVbnN1YnNjcmliZSIsImNyZWF0ZWRBdCIsInF1ZXJ5IiwiRGF0ZSIsInBhcnNlSW50IiwidXBkYXRlIiwiJHNldCIsImFmZmVjdGVkUm93cyIsImNvbnNvbGUiLCJsb2ciLCJzIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJzZW5kTWFpbCIsImZyb20iLCJzdWJqZWN0IiwiYm9keSIsImRyeXJ1biIsInJmY01haWxQYXR0ZXJuV2l0aE5hbWUiLCJ0ZXN0IiwiRXJyb3IiLCJmdW5jdGlvbiIsImluZGV4T2YiLCJoZWFkZXIiLCJwbGFjZWhvbGRlcnMiLCJyZXBsYWNlIiwic2V0dGluZ3MiLCJnZXQiLCJmb290ZXIiLCJ1c2VyUXVlcnkiLCIkZXhpc3RzIiwiJGFuZCIsIkVKU09OIiwicGFyc2UiLCJ1c2VycyIsImZpbmQiLCJmb3JFYWNoIiwidXNlciIsImVtYWlsIiwidW5kZWZpbmVkIiwiZW1haWxzIiwiYWRkcmVzcyIsImh0bWwiLCJ1bnN1YnNjcmliZSIsImFic29sdXRlVXJsIiwiRmxvd1JvdXRlciIsInBhdGgiLCJnZXRUaW1lIiwibmFtZSIsImRlZmVyIiwiRW1haWwiLCJzZW5kIiwidG8iLCJlc2NhcGVIVE1MIiwibWV0aG9kcyIsInVzZXJJZCIsIm1ldGhvZCIsImF1dGh6IiwiaGFzUm9sZSIsIkREUFJhdGVMaW1pdGVyIiwiYWRkUnVsZSIsInR5cGUiLCJjb25uZWN0aW9uSWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxTQUFTLEVBQVQsQyxDQUFZLHFCOzs7Ozs7Ozs7OztBQ0FaQyxPQUFPQyxPQUFQLENBQWUsWUFBVztBQUN6QixTQUFPQyxXQUFXQyxNQUFYLENBQWtCQyxXQUFsQixDQUE4QkMsTUFBOUIsQ0FBcUMsZUFBckMsRUFBc0Q7QUFDNURDLGtCQUFjO0FBQ2JDLFdBQUssZUFEUTtBQUViQyxhQUFPLENBQUMsT0FBRDtBQUZNO0FBRDhDLEdBQXRELENBQVA7QUFNQSxDQVBELEU7Ozs7Ozs7Ozs7O0FDQUFOLFdBQVdDLE1BQVgsQ0FBa0JNLEtBQWxCLENBQXdCQyxxQkFBeEIsR0FBZ0QsVUFBU0gsR0FBVCxFQUFjSSxTQUFkLEVBQXlCO0FBQ3hFLFFBQU1DLFFBQVE7QUFDYkwsT0FEYTtBQUViSSxlQUFXLElBQUlFLElBQUosQ0FBU0MsU0FBU0gsU0FBVCxDQUFUO0FBRkUsR0FBZDtBQUlBLFFBQU1JLFNBQVM7QUFDZEMsVUFBTTtBQUNMLDZCQUF1QjtBQURsQjtBQURRLEdBQWY7QUFLQSxRQUFNQyxlQUFlLEtBQUtGLE1BQUwsQ0FBWUgsS0FBWixF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QyxnQkFBUTtBQURrRCxPQUFyRCxDQUFOO0FBR0E7O0FBQ0QsV0FBT3RFLE9BQU8yQixRQUFQLENBQWdCQyxJQUFoQixFQUFzQkMsT0FBdEIsRUFBK0JDLElBQS9CLEVBQXFDQyxNQUFyQyxFQUE2Q2xCLEtBQTdDLENBQVA7QUFDQTs7QUFkYSxDQUFmLEUsQ0FrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGE7Ozs7Ozs7Ozs7O0FDeEJBO0FBQ0FaLE9BQU9tRSxPQUFQLENBQWU7QUFDZCx1QkFBcUI1RCxHQUFyQixFQUEwQkksU0FBMUIsRUFBcUM7QUFDcEMsV0FBT1osT0FBT3lELFdBQVAsQ0FBbUJqRCxHQUFuQixFQUF3QkksU0FBeEIsQ0FBUDtBQUNBOztBQUhhLENBQWY7QUFNQTZELGVBQWVDLE9BQWYsQ0FBdUI7QUFDdEJDLFFBQU0sUUFEZ0I7QUFFdEJiLFFBQU0sb0JBRmdCOztBQUd0QmMsaUJBQWU7QUFDZCxXQUFPLElBQVA7QUFDQTs7QUFMcUIsQ0FBdkIsRUFNRyxDQU5ILEVBTU0sS0FOTixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X21haWxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIk1haWxlciA9IHt9Oy8vZXNsaW50LWRpc2FibGUtbGluZVxuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy51cHNlcnQoJ2FjY2Vzcy1tYWlsZXInLCB7XG5cdFx0JHNldE9uSW5zZXJ0OiB7XG5cdFx0XHRfaWQ6ICdhY2Nlc3MtbWFpbGVyJyxcblx0XHRcdHJvbGVzOiBbJ2FkbWluJ10sXG5cdFx0fSxcblx0fSk7XG59KTtcbiIsIlJvY2tldENoYXQubW9kZWxzLlVzZXJzLnJvY2tldE1haWxVbnN1YnNjcmliZSA9IGZ1bmN0aW9uKF9pZCwgY3JlYXRlZEF0KSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZCxcblx0XHRjcmVhdGVkQXQ6IG5ldyBEYXRlKHBhcnNlSW50KGNyZWF0ZWRBdCkpLFxuXHR9O1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0J21haWxlci51bnN1YnNjcmliZWQnOiB0cnVlLFxuXHRcdH0sXG5cdH07XG5cdGNvbnN0IGFmZmVjdGVkUm93cyA9IHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xuXHRjb25zb2xlLmxvZygnW01haWxlcjpVbnN1YnNjcmliZV0nLCBfaWQsIGNyZWF0ZWRBdCwgbmV3IERhdGUocGFyc2VJbnQoY3JlYXRlZEF0KSksIGFmZmVjdGVkUm93cyk7XG5cdHJldHVybiBhZmZlY3RlZFJvd3M7XG59O1xuIiwiLyogZ2xvYmFscyBNYWlsZXIgKi9cbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcblxuTWFpbGVyLnNlbmRNYWlsID0gZnVuY3Rpb24oZnJvbSwgc3ViamVjdCwgYm9keSwgZHJ5cnVuLCBxdWVyeSkge1xuXG5cdGNvbnN0IHJmY01haWxQYXR0ZXJuV2l0aE5hbWUgPSAvXig/Oi4qPCk/KFthLXpBLVowLTkuISMkJSYnKitcXC89P15fYHt8fX4tXStAW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KD86XFwuW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KSopKD86Pj8pJC87XG5cdGlmICghcmZjTWFpbFBhdHRlcm5XaXRoTmFtZS50ZXN0KGZyb20pKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1mcm9tLWFkZHJlc3MnLCAnSW52YWxpZCBmcm9tIGFkZHJlc3MnLCB7XG5cdFx0XHRmdW5jdGlvbjogJ01haWxlci5zZW5kTWFpbCcsXG5cdFx0fSk7XG5cdH1cblx0aWYgKGJvZHkuaW5kZXhPZignW3Vuc3Vic2NyaWJlXScpID09PSAtMSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1pc3NpbmctdW5zdWJzY3JpYmUtbGluaycsICdZb3UgbXVzdCBwcm92aWRlIHRoZSBbdW5zdWJzY3JpYmVdIGxpbmsuJywge1xuXHRcdFx0ZnVuY3Rpb246ICdNYWlsZXIuc2VuZE1haWwnLFxuXHRcdH0pO1xuXHR9XG5cdGNvbnN0IGhlYWRlciA9IFJvY2tldENoYXQucGxhY2Vob2xkZXJzLnJlcGxhY2UoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0VtYWlsX0hlYWRlcicpIHx8ICcnKTtcblx0Y29uc3QgZm9vdGVyID0gUm9ja2V0Q2hhdC5wbGFjZWhvbGRlcnMucmVwbGFjZShSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRW1haWxfRm9vdGVyJykgfHwgJycpO1xuXG5cdGxldCB1c2VyUXVlcnkgPSB7ICdtYWlsZXIudW5zdWJzY3JpYmVkJzogeyAkZXhpc3RzOiAwIH0gfTtcblx0aWYgKHF1ZXJ5KSB7XG5cdFx0dXNlclF1ZXJ5ID0geyAkYW5kOiBbdXNlclF1ZXJ5LCBFSlNPTi5wYXJzZShxdWVyeSldIH07XG5cdH1cblxuXHRpZiAoZHJ5cnVuKSB7XG5cdFx0cmV0dXJuIE1ldGVvci51c2Vycy5maW5kKHtcblx0XHRcdCdlbWFpbHMuYWRkcmVzcyc6IGZyb20sXG5cdFx0fSkuZm9yRWFjaCgodXNlcikgPT4ge1xuXHRcdFx0bGV0IGVtYWlsID0gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHVzZXIuZW1haWxzICYmIHVzZXIuZW1haWxzWzBdICYmIHVzZXIuZW1haWxzWzBdLmFkZHJlc3MpIHtcblx0XHRcdFx0ZW1haWwgPSB1c2VyLmVtYWlsc1swXS5hZGRyZXNzO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgaHRtbCA9IFJvY2tldENoYXQucGxhY2Vob2xkZXJzLnJlcGxhY2UoYm9keSwge1xuXHRcdFx0XHR1bnN1YnNjcmliZTogTWV0ZW9yLmFic29sdXRlVXJsKEZsb3dSb3V0ZXIucGF0aCgnbWFpbGVyL3Vuc3Vic2NyaWJlLzpfaWQvOmNyZWF0ZWRBdCcsIHtcblx0XHRcdFx0XHRfaWQ6IHVzZXIuX2lkLFxuXHRcdFx0XHRcdGNyZWF0ZWRBdDogdXNlci5jcmVhdGVkQXQuZ2V0VGltZSgpLFxuXHRcdFx0XHR9KSksXG5cdFx0XHRcdG5hbWU6IHVzZXIubmFtZSxcblx0XHRcdFx0ZW1haWwsXG5cdFx0XHR9KTtcblx0XHRcdGVtYWlsID0gYCR7IHVzZXIubmFtZSB9IDwkeyBlbWFpbCB9PmA7XG5cdFx0XHRpZiAocmZjTWFpbFBhdHRlcm5XaXRoTmFtZS50ZXN0KGVtYWlsKSkge1xuXHRcdFx0XHRNZXRlb3IuZGVmZXIoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEVtYWlsLnNlbmQoe1xuXHRcdFx0XHRcdFx0dG86IGVtYWlsLFxuXHRcdFx0XHRcdFx0ZnJvbSxcblx0XHRcdFx0XHRcdHN1YmplY3QsXG5cdFx0XHRcdFx0XHRodG1sOiBoZWFkZXIgKyBodG1sICsgZm9vdGVyLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGNvbnNvbGUubG9nKGBTZW5kaW5nIGVtYWlsIHRvICR7IGVtYWlsIH1gKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gTWV0ZW9yLnVzZXJzLmZpbmQodXNlclF1ZXJ5KS5mb3JFYWNoKGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdGxldCBlbWFpbCA9IHVuZGVmaW5lZDtcblx0XHRcdGlmICh1c2VyLmVtYWlscyAmJiB1c2VyLmVtYWlsc1swXSAmJiB1c2VyLmVtYWlsc1swXS5hZGRyZXNzKSB7XG5cdFx0XHRcdGVtYWlsID0gdXNlci5lbWFpbHNbMF0uYWRkcmVzcztcblx0XHRcdH1cblx0XHRcdGNvbnN0IGh0bWwgPSBSb2NrZXRDaGF0LnBsYWNlaG9sZGVycy5yZXBsYWNlKGJvZHksIHtcblx0XHRcdFx0dW5zdWJzY3JpYmU6IE1ldGVvci5hYnNvbHV0ZVVybChGbG93Um91dGVyLnBhdGgoJ21haWxlci91bnN1YnNjcmliZS86X2lkLzpjcmVhdGVkQXQnLCB7XG5cdFx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0XHRjcmVhdGVkQXQ6IHVzZXIuY3JlYXRlZEF0LmdldFRpbWUoKSxcblx0XHRcdFx0fSkpLFxuXHRcdFx0XHRuYW1lOiBzLmVzY2FwZUhUTUwodXNlci5uYW1lKSxcblx0XHRcdFx0ZW1haWw6IHMuZXNjYXBlSFRNTChlbWFpbCksXG5cdFx0XHR9KTtcblx0XHRcdGVtYWlsID0gYCR7IHVzZXIubmFtZSB9IDwkeyBlbWFpbCB9PmA7XG5cdFx0XHRpZiAocmZjTWFpbFBhdHRlcm5XaXRoTmFtZS50ZXN0KGVtYWlsKSkge1xuXHRcdFx0XHRNZXRlb3IuZGVmZXIoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEVtYWlsLnNlbmQoe1xuXHRcdFx0XHRcdFx0dG86IGVtYWlsLFxuXHRcdFx0XHRcdFx0ZnJvbSxcblx0XHRcdFx0XHRcdHN1YmplY3QsXG5cdFx0XHRcdFx0XHRodG1sOiBoZWFkZXIgKyBodG1sICsgZm9vdGVyLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGNvbnNvbGUubG9nKGBTZW5kaW5nIGVtYWlsIHRvICR7IGVtYWlsIH1gKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufTtcbiIsIi8qIGdsb2JhbHMgTWFpbGVyICovXG5NYWlsZXIudW5zdWJzY3JpYmUgPSBmdW5jdGlvbihfaWQsIGNyZWF0ZWRBdCkge1xuXHRpZiAoX2lkICYmIGNyZWF0ZWRBdCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5yb2NrZXRNYWlsVW5zdWJzY3JpYmUoX2lkLCBjcmVhdGVkQXQpID09PSAxO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn07XG4iLCIvKiBnbG9iYWxzIE1haWxlciAqL1xuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnTWFpbGVyLnNlbmRNYWlsJyhmcm9tLCBzdWJqZWN0LCBib2R5LCBkcnlydW4sIHF1ZXJ5KSB7XG5cdFx0Y29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuXHRcdGlmICghdXNlcklkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHRtZXRob2Q6ICdNYWlsZXIuc2VuZE1haWwnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1JvbGUodXNlcklkLCAnYWRtaW4nKSAhPT0gdHJ1ZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ01haWxlci5zZW5kTWFpbCcsXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIE1haWxlci5zZW5kTWFpbChmcm9tLCBzdWJqZWN0LCBib2R5LCBkcnlydW4sIHF1ZXJ5KTtcblx0fSxcbn0pO1xuXG5cbi8vIExpbWl0IHNldHRpbmcgdXNlcm5hbWUgb25jZSBwZXIgbWludXRlXG4vLyBERFBSYXRlTGltaXRlci5hZGRSdWxlXG4vL1x0dHlwZTogJ21ldGhvZCdcbi8vXHRuYW1lOiAnTWFpbGVyLnNlbmRNYWlsJ1xuLy9cdGNvbm5lY3Rpb25JZDogLT4gcmV0dXJuIHRydWVcbi8vXHQsIDEsIDYwMDAwXG4iLCIvKiBnbG9iYWxzIE1haWxlciAqL1xuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnTWFpbGVyOnVuc3Vic2NyaWJlJyhfaWQsIGNyZWF0ZWRBdCkge1xuXHRcdHJldHVybiBNYWlsZXIudW5zdWJzY3JpYmUoX2lkLCBjcmVhdGVkQXQpO1xuXHR9LFxufSk7XG5cbkREUFJhdGVMaW1pdGVyLmFkZFJ1bGUoe1xuXHR0eXBlOiAnbWV0aG9kJyxcblx0bmFtZTogJ01haWxlcjp1bnN1YnNjcmliZScsXG5cdGNvbm5lY3Rpb25JZCgpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0sIDEsIDYwMDAwKTtcbiJdfQ==
