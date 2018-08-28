(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var ECMAScript = Package.ecmascript.ECMAScript;
var check = Package.check.check;
var Match = Package.check.Match;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:migrations":{"migrations.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/rocketchat_migrations/migrations.js                                                                //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 2);

/*
	Adds migration capabilities. Migrations are defined like:

	Migrations.add({
		up: function() {}, //*required* code to run to migrate upwards
		version: 1, //*required* number to identify migration order
		down: function() {}, //*optional* code to run to migrate downwards
		name: 'Something' //*optional* display name for the migration
	});

	The ordering of migrations is determined by the version you set.

	To run the migrations, set the MIGRATE environment variable to either
	'latest' or the version number you want to migrate to. Optionally, append
	',exit' if you want the migrations to exit the meteor process, e.g if you're
	migrating from a script (remember to pass the --once parameter).

	e.g:
	MIGRATE="latest" mrt # ensure we'll be at the latest version and run the app
	MIGRATE="latest,exit" mrt --once # ensure we'll be at the latest version and exit
	MIGRATE="2,exit" mrt --once # migrate to version 2 and exit

	Note: Migrations will lock ensuring only 1 app can be migrating at once. If
	a migration crashes, the control record in the migrations collection will
	remain locked and at the version it was at previously, however the db could
	be in an inconsistant state.
*/
// since we'll be at version 0 by default, we should have a migration set for it.
const DefaultMigration = {
  version: 0,

  up() {// @TODO: check if collection "migrations" exist
    // If exists, rename and rerun _migrateTo
  }

};
const Migrations = this.Migrations = {
  _list: [DefaultMigration],
  options: {
    // false disables logging
    log: true,
    // null or a function
    logger: null,
    // enable/disable info log "already at latest."
    logIfLatest: true,
    // lock will be valid for this amount of minutes
    lockExpiration: 5,
    // retry interval in seconds
    retryInterval: 10,
    // max number of attempts to retry unlock
    maxAttempts: 30,
    // migrations collection name
    collectionName: 'migrations' // collectionName: "rocketchat_migrations"

  },

  config(opts) {
    this.options = _.extend({}, this.options, opts);
  }

};
Migrations._collection = new Mongo.Collection(Migrations.options.collectionName);
/* Create a box around messages for displaying on a console.log */

function makeABox(message, color = 'red') {
  if (!_.isArray(message)) {
    message = message.split('\n');
  }

  const len = _(message).reduce(function (memo, msg) {
    return Math.max(memo, msg.length);
  }, 0) + 4;
  const text = message.map(msg => '|'[color] + s.lrpad(msg, len)[color] + '|'[color]).join('\n');
  const topLine = '+'[color] + s.pad('', len, '-')[color] + '+'[color];
  const separator = '|'[color] + s.pad('', len, '') + '|'[color];
  const bottomLine = '+'[color] + s.pad('', len, '-')[color] + '+'[color];
  return `\n${topLine}\n${separator}\n${text}\n${separator}\n${bottomLine}\n`;
}
/*
	Logger factory function. Takes a prefix string and options object
	and uses an injected `logger` if provided, else falls back to
	Meteor's `Log` package.
	Will send a log object to the injected logger, on the following form:
		message: String
		level: String (info, warn, error, debug)
		tag: 'Migrations'
*/


function createLogger(prefix) {
  check(prefix, String); // Return noop if logging is disabled.

  if (Migrations.options.log === false) {
    return function () {};
  }

  return function (level, message) {
    check(level, Match.OneOf('info', 'error', 'warn', 'debug'));
    check(message, Match.OneOf(String, [String]));
    const logger = Migrations.options && Migrations.options.logger;

    if (logger && _.isFunction(logger)) {
      logger({
        level,
        message,
        tag: prefix
      });
    } else {
      Log[level]({
        message: `${prefix}: ${message}`
      });
    }
  };
} // collection holding the control record


const log = createLogger('Migrations');
['info', 'warn', 'error', 'debug'].forEach(function (level) {
  log[level] = _.partial(log, level);
}); // if (process.env.MIGRATE)
//   Migrations.migrateTo(process.env.MIGRATE);
// Add a new migration:
// {up: function *required
//  version: Number *required
//  down: function *optional
//  name: String *optional
// }

Migrations.add = function (migration) {
  if (typeof migration.up !== 'function') {
    throw new Meteor.Error('Migration must supply an up function.');
  }

  if (typeof migration.version !== 'number') {
    throw new Meteor.Error('Migration must supply a version number.');
  }

  if (migration.version <= 0) {
    throw new Meteor.Error('Migration version must be greater than 0');
  } // Freeze the migration object to make it hereafter immutable


  Object.freeze(migration);

  this._list.push(migration);

  this._list = _.sortBy(this._list, function (m) {
    return m.version;
  });
}; // Attempts to run the migrations using command in the form of:
// e.g 'latest', 'latest,exit', 2
// use 'XX,rerun' to re-run the migration at that version


Migrations.migrateTo = function (command) {
  if (_.isUndefined(command) || command === '' || this._list.length === 0) {
    throw new Error(`Cannot migrate using invalid command: ${command}`);
  }

  let version;
  let subcommand;

  if (typeof command === 'number') {
    version = command;
  } else {
    version = command.split(',')[0];
    subcommand = command.split(',')[1];
  }

  const {
    maxAttempts,
    retryInterval
  } = Migrations.options;
  let migrated;

  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    if (version === 'latest') {
      migrated = this._migrateTo(_.last(this._list).version);
    } else {
      migrated = this._migrateTo(parseInt(version), subcommand === 'rerun');
    }

    if (migrated) {
      break;
    } else {
      let willRetry;

      if (attempts < maxAttempts) {
        willRetry = ` Trying again in ${retryInterval} seconds.`;

        Meteor._sleepForMs(retryInterval * 1000);
      } else {
        willRetry = '';
      }

      console.log(`Not migrating, control is locked. Attempt ${attempts}/${maxAttempts}.${willRetry}`.yellow);
    }
  }

  if (!migrated) {
    const control = this._getControl(); // Side effect: upserts control document.


    console.log(makeABox(['ERROR! SERVER STOPPED', '', 'Your database migration control is locked.', 'Please make sure you are running the latest version and try again.', 'If the problem persists, please contact support.', '', `This Rocket.Chat version: ${RocketChat.Info.version}`, `Database locked at version: ${control.version}`, `Database target version: ${version === 'latest' ? _.last(this._list).version : version}`, '', `Commit: ${RocketChat.Info.commit.hash}`, `Date: ${RocketChat.Info.commit.date}`, `Branch: ${RocketChat.Info.commit.branch}`, `Tag: ${RocketChat.Info.commit.tag}`]));
    process.exit(1);
  } // remember to run meteor with --once otherwise it will restart


  if (subcommand === 'exit') {
    process.exit(0);
  }
}; // just returns the current version


Migrations.getVersion = function () {
  return this._getControl().version;
}; // migrates to the specific version passed in


Migrations._migrateTo = function (version, rerun) {
  const self = this;

  const control = this._getControl(); // Side effect: upserts control document.


  let currentVersion = control.version;

  if (lock() === false) {
    // log.info('Not migrating, control is locked.');
    // Warning
    return false;
  }

  if (rerun) {
    log.info(`Rerunning version ${version}`);
    migrate('up', this._findIndexByVersion(version));
    log.info('Finished migrating.');
    unlock();
    return true;
  }

  if (currentVersion === version) {
    if (this.options.logIfLatest) {
      log.info(`Not migrating, already at version ${version}`);
    }

    unlock();
    return true;
  }

  const startIdx = this._findIndexByVersion(currentVersion);

  const endIdx = this._findIndexByVersion(version); // log.info('startIdx:' + startIdx + ' endIdx:' + endIdx);


  log.info(`Migrating from version ${this._list[startIdx].version} -> ${this._list[endIdx].version}`); // run the actual migration

  function migrate(direction, idx) {
    const migration = self._list[idx];

    if (typeof migration[direction] !== 'function') {
      unlock();
      throw new Meteor.Error(`Cannot migrate ${direction} on version ${migration.version}`);
    }

    function maybeName() {
      return migration.name ? ` (${migration.name})` : '';
    }

    log.info(`Running ${direction}() on version ${migration.version}${maybeName()}`);

    try {
      migration[direction](migration);
    } catch (e) {
      console.log(makeABox(['ERROR! SERVER STOPPED', '', 'Your database migration failed:', e.message, '', 'Please make sure you are running the latest version and try again.', 'If the problem persists, please contact support.', '', `This Rocket.Chat version: ${RocketChat.Info.version}`, `Database locked at version: ${control.version}`, `Database target version: ${version}`, '', `Commit: ${RocketChat.Info.commit.hash}`, `Date: ${RocketChat.Info.commit.date}`, `Branch: ${RocketChat.Info.commit.branch}`, `Tag: ${RocketChat.Info.commit.tag}`]));
      process.exit(1);
    }
  } // Returns true if lock was acquired.


  function lock() {
    const date = new Date();
    const dateMinusInterval = moment(date).subtract(self.options.lockExpiration, 'minutes').toDate();
    const build = RocketChat.Info ? RocketChat.Info.build.date : date; // This is atomic. The selector ensures only one caller at a time will see
    // the unlocked control, and locking occurs in the same update's modifier.
    // All other simultaneous callers will get false back from the update.

    return self._collection.update({
      _id: 'control',
      $or: [{
        locked: false
      }, {
        lockedAt: {
          $lt: dateMinusInterval
        }
      }, {
        buildAt: {
          $ne: build
        }
      }]
    }, {
      $set: {
        locked: true,
        lockedAt: date,
        buildAt: build
      }
    }) === 1;
  } // Side effect: saves version.


  function unlock() {
    self._setControl({
      locked: false,
      version: currentVersion
    });
  }

  if (currentVersion < version) {
    for (let i = startIdx; i < endIdx; i++) {
      migrate('up', i + 1);
      currentVersion = self._list[i + 1].version;

      self._setControl({
        locked: true,
        version: currentVersion
      });
    }
  } else {
    for (let i = startIdx; i > endIdx; i--) {
      migrate('down', i);
      currentVersion = self._list[i - 1].version;

      self._setControl({
        locked: true,
        version: currentVersion
      });
    }
  }

  unlock();
  log.info('Finished migrating.');
}; // gets the current control record, optionally creating it if non-existant


Migrations._getControl = function () {
  const control = this._collection.findOne({
    _id: 'control'
  });

  return control || this._setControl({
    version: 0,
    locked: false
  });
}; // sets the control record


Migrations._setControl = function (control) {
  // be quite strict
  check(control.version, Number);
  check(control.locked, Boolean);

  this._collection.update({
    _id: 'control'
  }, {
    $set: {
      version: control.version,
      locked: control.locked
    }
  }, {
    upsert: true
  });

  return control;
}; // returns the migration index in _list or throws if not found


Migrations._findIndexByVersion = function (version) {
  for (let i = 0; i < this._list.length; i++) {
    if (this._list[i].version === version) {
      return i;
    }
  }

  throw new Meteor.Error(`Can't find migration version ${version}`);
}; // reset (mainly intended for tests)


Migrations._reset = function () {
  this._list = [{
    version: 0,

    up() {}

  }];

  this._collection.remove({});
};

RocketChat.Migrations = Migrations;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:migrations/migrations.js");

/* Exports */
Package._define("rocketchat:migrations");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_migrations.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptaWdyYXRpb25zL21pZ3JhdGlvbnMuanMiXSwibmFtZXMiOlsiXyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwicyIsIm1vbWVudCIsIkRlZmF1bHRNaWdyYXRpb24iLCJ2ZXJzaW9uIiwidXAiLCJNaWdyYXRpb25zIiwiX2xpc3QiLCJvcHRpb25zIiwibG9nIiwibG9nZ2VyIiwibG9nSWZMYXRlc3QiLCJsb2NrRXhwaXJhdGlvbiIsInJldHJ5SW50ZXJ2YWwiLCJtYXhBdHRlbXB0cyIsImNvbGxlY3Rpb25OYW1lIiwiY29uZmlnIiwib3B0cyIsImV4dGVuZCIsIl9jb2xsZWN0aW9uIiwiTW9uZ28iLCJDb2xsZWN0aW9uIiwibWFrZUFCb3giLCJtZXNzYWdlIiwiY29sb3IiLCJpc0FycmF5Iiwic3BsaXQiLCJsZW4iLCJyZWR1Y2UiLCJtZW1vIiwibXNnIiwiTWF0aCIsIm1heCIsImxlbmd0aCIsInRleHQiLCJtYXAiLCJscnBhZCIsImpvaW4iLCJ0b3BMaW5lIiwicGFkIiwic2VwYXJhdG9yIiwiYm90dG9tTGluZSIsImNyZWF0ZUxvZ2dlciIsInByZWZpeCIsImNoZWNrIiwiU3RyaW5nIiwibGV2ZWwiLCJNYXRjaCIsIk9uZU9mIiwiaXNGdW5jdGlvbiIsInRhZyIsIkxvZyIsImZvckVhY2giLCJwYXJ0aWFsIiwiYWRkIiwibWlncmF0aW9uIiwiTWV0ZW9yIiwiRXJyb3IiLCJPYmplY3QiLCJmcmVlemUiLCJwdXNoIiwic29ydEJ5IiwibSIsIm1pZ3JhdGVUbyIsImNvbW1hbmQiLCJpc1VuZGVmaW5lZCIsInN1YmNvbW1hbmQiLCJtaWdyYXRlZCIsImF0dGVtcHRzIiwiX21pZ3JhdGVUbyIsImxhc3QiLCJwYXJzZUludCIsIndpbGxSZXRyeSIsIl9zbGVlcEZvck1zIiwiY29uc29sZSIsInllbGxvdyIsImNvbnRyb2wiLCJfZ2V0Q29udHJvbCIsIlJvY2tldENoYXQiLCJJbmZvIiwiY29tbWl0IiwiaGFzaCIsImRhdGUiLCJicmFuY2giLCJwcm9jZXNzIiwiZXhpdCIsImdldFZlcnNpb24iLCJyZXJ1biIsInNlbGYiLCJjdXJyZW50VmVyc2lvbiIsImxvY2siLCJpbmZvIiwibWlncmF0ZSIsIl9maW5kSW5kZXhCeVZlcnNpb24iLCJ1bmxvY2siLCJzdGFydElkeCIsImVuZElkeCIsImRpcmVjdGlvbiIsImlkeCIsIm1heWJlTmFtZSIsIm5hbWUiLCJlIiwiRGF0ZSIsImRhdGVNaW51c0ludGVydmFsIiwic3VidHJhY3QiLCJ0b0RhdGUiLCJidWlsZCIsInVwZGF0ZSIsIl9pZCIsIiRvciIsImxvY2tlZCIsImxvY2tlZEF0IiwiJGx0IiwiYnVpbGRBdCIsIiRuZSIsIiRzZXQiLCJfc2V0Q29udHJvbCIsImkiLCJmaW5kT25lIiwiTnVtYmVyIiwiQm9vbGVhbiIsInVwc2VydCIsIl9yZXNldCIsInJlbW92ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxDQUFKOztBQUFNQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxRQUFFSyxDQUFGO0FBQUk7O0FBQWhCLENBQW5DLEVBQXFELENBQXJEO0FBQXdELElBQUlDLENBQUo7QUFBTUwsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLG1CQUFSLENBQWIsRUFBMEM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNDLFFBQUVELENBQUY7QUFBSTs7QUFBaEIsQ0FBMUMsRUFBNEQsQ0FBNUQ7QUFBK0QsSUFBSUUsTUFBSjtBQUFXTixPQUFPQyxLQUFQLENBQWFDLFFBQVEsUUFBUixDQUFiLEVBQStCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDRSxhQUFPRixDQUFQO0FBQVM7O0FBQXJCLENBQS9CLEVBQXNELENBQXREOztBQUs5STs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBNEJBO0FBQ0EsTUFB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O0FBQzFDO0FBQ0FoQyxRQUFNZ0MsUUFBUXhFLE9BQWQsRUFBdUJtSCxNQUF2QjtBQUNBM0UsUUFBTWdDLFFBQVFrQyxNQUFkLEVBQXNCVSxPQUF0Qjs7QUFFQSxPQUFLckcsV0FBTCxDQUFpQndGLE1BQWpCLENBQXdCO0FBQ3ZCQyxTQUFLO0FBRGtCLEdBQXhCLEVBRUc7QUFDRk8sVUFBTTtBQUNML0csZUFBU3dFLFFBQVF4RSxPQURaO0FBRUwwRyxjQUFRbEMsUUFBUWtDO0FBRlg7QUFESixHQUZILEVBT0c7QUFDRlcsWUFBUTtBQUROLEdBUEg7O0FBV0EsU0FBTzdDLE9BQVA7QUFDQSxDQWpCRCxDLENBbUJBOzs7QUFDQXRFLFdBQVd1RixtQkFBWCxHQUFpQyxVQUFTekYsT0FBVCxFQUFrQjtBQUNsRCxPQUFLLElBQUlpSCxJQUFJLENBQWIsRUFBZ0JBLElBQUksS0FBSzlHLEtBQUwsQ0FBVzBCLE1BQS9CLEVBQXVDb0YsR0FBdkMsRUFBNEM7QUFDM0MsUUFBSSxLQUFLOUcsS0FBTCxDQUFXOEcsQ0FBWCxFQUFjakgsT0FBZCxLQUEwQkEsT0FBOUIsRUFBdUM7QUFBRSxhQUFPaUgsQ0FBUDtBQUFXO0FBQ3BEOztBQUVELFFBQU0sSUFBSTdELE9BQU9DLEtBQVgsQ0FBa0IsZ0NBQWdDckQsT0FBUyxFQUEzRCxDQUFOO0FBQ0EsQ0FORCxDLENBUUE7OztBQUNBRSxXQUFXb0gsTUFBWCxHQUFvQixZQUFXO0FBQzlCLE9BQUtuSCxLQUFMLEdBQWEsQ0FBQztBQUNiSCxhQUFTLENBREk7O0FBRWJDLFNBQUssQ0FBRTs7QUFGTSxHQUFELENBQWI7O0FBSUEsT0FBS2MsV0FBTCxDQUFpQndHLE1BQWpCLENBQXdCLEVBQXhCO0FBQ0EsQ0FORDs7QUFRQTdDLFdBQVd4RSxVQUFYLEdBQXdCQSxVQUF4QixDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X21pZ3JhdGlvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQgbm8tdXNlLWJlZm9yZS1kZWZpbmU6MCAqL1xuLyogZ2xvYmFscyBMb2cqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG4vKlxuXHRBZGRzIG1pZ3JhdGlvbiBjYXBhYmlsaXRpZXMuIE1pZ3JhdGlvbnMgYXJlIGRlZmluZWQgbGlrZTpcblxuXHRNaWdyYXRpb25zLmFkZCh7XG5cdFx0dXA6IGZ1bmN0aW9uKCkge30sIC8vKnJlcXVpcmVkKiBjb2RlIHRvIHJ1biB0byBtaWdyYXRlIHVwd2FyZHNcblx0XHR2ZXJzaW9uOiAxLCAvLypyZXF1aXJlZCogbnVtYmVyIHRvIGlkZW50aWZ5IG1pZ3JhdGlvbiBvcmRlclxuXHRcdGRvd246IGZ1bmN0aW9uKCkge30sIC8vKm9wdGlvbmFsKiBjb2RlIHRvIHJ1biB0byBtaWdyYXRlIGRvd253YXJkc1xuXHRcdG5hbWU6ICdTb21ldGhpbmcnIC8vKm9wdGlvbmFsKiBkaXNwbGF5IG5hbWUgZm9yIHRoZSBtaWdyYXRpb25cblx0fSk7XG5cblx0VGhlIG9yZGVyaW5nIG9mIG1pZ3JhdGlvbnMgaXMgZGV0ZXJtaW5lZCBieSB0aGUgdmVyc2lvbiB5b3Ugc2V0LlxuXG5cdFRvIHJ1biB0aGUgbWlncmF0aW9ucywgc2V0IHRoZSBNSUdSQVRFIGVudmlyb25tZW50IHZhcmlhYmxlIHRvIGVpdGhlclxuXHQnbGF0ZXN0JyBvciB0aGUgdmVyc2lvbiBudW1iZXIgeW91IHdhbnQgdG8gbWlncmF0ZSB0by4gT3B0aW9uYWxseSwgYXBwZW5kXG5cdCcsZXhpdCcgaWYgeW91IHdhbnQgdGhlIG1pZ3JhdGlvbnMgdG8gZXhpdCB0aGUgbWV0ZW9yIHByb2Nlc3MsIGUuZyBpZiB5b3UncmVcblx0bWlncmF0aW5nIGZyb20gYSBzY3JpcHQgKHJlbWVtYmVyIHRvIHBhc3MgdGhlIC0tb25jZSBwYXJhbWV0ZXIpLlxuXG5cdGUuZzpcblx0TUlHUkFURT1cImxhdGVzdFwiIG1ydCAjIGVuc3VyZSB3ZSdsbCBiZSBhdCB0aGUgbGF0ZXN0IHZlcnNpb24gYW5kIHJ1biB0aGUgYXBwXG5cdE1JR1JBVEU9XCJsYXRlc3QsZXhpdFwiIG1ydCAtLW9uY2UgIyBlbnN1cmUgd2UnbGwgYmUgYXQgdGhlIGxhdGVzdCB2ZXJzaW9uIGFuZCBleGl0XG5cdE1JR1JBVEU9XCIyLGV4aXRcIiBtcnQgLS1vbmNlICMgbWlncmF0ZSB0byB2ZXJzaW9uIDIgYW5kIGV4aXRcblxuXHROb3RlOiBNaWdyYXRpb25zIHdpbGwgbG9jayBlbnN1cmluZyBvbmx5IDEgYXBwIGNhbiBiZSBtaWdyYXRpbmcgYXQgb25jZS4gSWZcblx0YSBtaWdyYXRpb24gY3Jhc2hlcywgdGhlIGNvbnRyb2wgcmVjb3JkIGluIHRoZSBtaWdyYXRpb25zIGNvbGxlY3Rpb24gd2lsbFxuXHRyZW1haW4gbG9ja2VkIGFuZCBhdCB0aGUgdmVyc2lvbiBpdCB3YXMgYXQgcHJldmlvdXNseSwgaG93ZXZlciB0aGUgZGIgY291bGRcblx0YmUgaW4gYW4gaW5jb25zaXN0YW50IHN0YXRlLlxuKi9cblxuLy8gc2luY2Ugd2UnbGwgYmUgYXQgdmVyc2lvbiAwIGJ5IGRlZmF1bHQsIHdlIHNob3VsZCBoYXZlIGEgbWlncmF0aW9uIHNldCBmb3IgaXQuXG5jb25zdCBEZWZhdWx0TWlncmF0aW9uID0ge1xuXHR2ZXJzaW9uOiAwLFxuXHR1cCgpIHtcblx0XHQvLyBAVE9ETzogY2hlY2sgaWYgY29sbGVjdGlvbiBcIm1pZ3JhdGlvbnNcIiBleGlzdFxuXHRcdC8vIElmIGV4aXN0cywgcmVuYW1lIGFuZCByZXJ1biBfbWlncmF0ZVRvXG5cdH0sXG59O1xuXG5jb25zdCBNaWdyYXRpb25zID0gdGhpcy5NaWdyYXRpb25zID0ge1xuXHRfbGlzdDogW0RlZmF1bHRNaWdyYXRpb25dLFxuXHRvcHRpb25zOiB7XG5cdFx0Ly8gZmFsc2UgZGlzYWJsZXMgbG9nZ2luZ1xuXHRcdGxvZzogdHJ1ZSxcblx0XHQvLyBudWxsIG9yIGEgZnVuY3Rpb25cblx0XHRsb2dnZXI6IG51bGwsXG5cdFx0Ly8gZW5hYmxlL2Rpc2FibGUgaW5mbyBsb2cgXCJhbHJlYWR5IGF0IGxhdGVzdC5cIlxuXHRcdGxvZ0lmTGF0ZXN0OiB0cnVlLFxuXHRcdC8vIGxvY2sgd2lsbCBiZSB2YWxpZCBmb3IgdGhpcyBhbW91bnQgb2YgbWludXRlc1xuXHRcdGxvY2tFeHBpcmF0aW9uOiA1LFxuXHRcdC8vIHJldHJ5IGludGVydmFsIGluIHNlY29uZHNcblx0XHRyZXRyeUludGVydmFsOiAxMCxcblx0XHQvLyBtYXggbnVtYmVyIG9mIGF0dGVtcHRzIHRvIHJldHJ5IHVubG9ja1xuXHRcdG1heEF0dGVtcHRzOiAzMCxcblx0XHQvLyBtaWdyYXRpb25zIGNvbGxlY3Rpb24gbmFtZVxuXHRcdGNvbGxlY3Rpb25OYW1lOiAnbWlncmF0aW9ucycsXG5cdFx0Ly8gY29sbGVjdGlvbk5hbWU6IFwicm9ja2V0Y2hhdF9taWdyYXRpb25zXCJcblx0fSxcblx0Y29uZmlnKG9wdHMpIHtcblx0XHR0aGlzLm9wdGlvbnMgPSBfLmV4dGVuZCh7fSwgdGhpcy5vcHRpb25zLCBvcHRzKTtcblx0fSxcbn07XG5cbk1pZ3JhdGlvbnMuX2NvbGxlY3Rpb24gPSBuZXcgTW9uZ28uQ29sbGVjdGlvbihNaWdyYXRpb25zLm9wdGlvbnMuY29sbGVjdGlvbk5hbWUpO1xuXG4vKiBDcmVhdGUgYSBib3ggYXJvdW5kIG1lc3NhZ2VzIGZvciBkaXNwbGF5aW5nIG9uIGEgY29uc29sZS5sb2cgKi9cbmZ1bmN0aW9uIG1ha2VBQm94KG1lc3NhZ2UsIGNvbG9yID0gJ3JlZCcpIHtcblx0aWYgKCFfLmlzQXJyYXkobWVzc2FnZSkpIHtcblx0XHRtZXNzYWdlID0gbWVzc2FnZS5zcGxpdCgnXFxuJyk7XG5cdH1cblx0Y29uc3QgbGVuID0gXyhtZXNzYWdlKS5yZWR1Y2UoZnVuY3Rpb24obWVtbywgbXNnKSB7XG5cdFx0cmV0dXJuIE1hdGgubWF4KG1lbW8sIG1zZy5sZW5ndGgpO1xuXHR9LCAwKSArIDQ7XG5cdGNvbnN0IHRleHQgPSBtZXNzYWdlLm1hcCgobXNnKSA9PiAnfCcgW2NvbG9yXSArIHMubHJwYWQobXNnLCBsZW4pW2NvbG9yXSArICd8JyBbY29sb3JdKS5qb2luKCdcXG4nKTtcblx0Y29uc3QgdG9wTGluZSA9ICcrJyBbY29sb3JdICsgcy5wYWQoJycsIGxlbiwgJy0nKVtjb2xvcl0gKyAnKycgW2NvbG9yXTtcblx0Y29uc3Qgc2VwYXJhdG9yID0gJ3wnIFtjb2xvcl0gKyBzLnBhZCgnJywgbGVuLCAnJykgKyAnfCcgW2NvbG9yXTtcblx0Y29uc3QgYm90dG9tTGluZSA9ICcrJyBbY29sb3JdICsgcy5wYWQoJycsIGxlbiwgJy0nKVtjb2xvcl0gKyAnKycgW2NvbG9yXTtcblx0cmV0dXJuIGBcXG4keyB0b3BMaW5lIH1cXG4keyBzZXBhcmF0b3IgfVxcbiR7IHRleHQgfVxcbiR7IHNlcGFyYXRvciB9XFxuJHsgYm90dG9tTGluZSB9XFxuYDtcbn1cblxuLypcblx0TG9nZ2VyIGZhY3RvcnkgZnVuY3Rpb24uIFRha2VzIGEgcHJlZml4IHN0cmluZyBhbmQgb3B0aW9ucyBvYmplY3Rcblx0YW5kIHVzZXMgYW4gaW5qZWN0ZWQgYGxvZ2dlcmAgaWYgcHJvdmlkZWQsIGVsc2UgZmFsbHMgYmFjayB0b1xuXHRNZXRlb3IncyBgTG9nYCBwYWNrYWdlLlxuXHRXaWxsIHNlbmQgYSBsb2cgb2JqZWN0IHRvIHRoZSBpbmplY3RlZCBsb2dnZXIsIG9uIHRoZSBmb2xsb3dpbmcgZm9ybTpcblx0XHRtZXNzYWdlOiBTdHJpbmdcblx0XHRsZXZlbDogU3RyaW5nIChpbmZvLCB3YXJuLCBlcnJvciwgZGVidWcpXG5cdFx0dGFnOiAnTWlncmF0aW9ucydcbiovXG5mdW5jdGlvbiBjcmVhdGVMb2dnZXIocHJlZml4KSB7XG5cdGNoZWNrKHByZWZpeCwgU3RyaW5nKTtcblxuXHQvLyBSZXR1cm4gbm9vcCBpZiBsb2dnaW5nIGlzIGRpc2FibGVkLlxuXHRpZiAoTWlncmF0aW9ucy5vcHRpb25zLmxvZyA9PT0gZmFsc2UpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7fTtcblx0fVxuXG5cdHJldHVybiBmdW5jdGlvbihsZXZlbCwgbWVzc2FnZSkge1xuXHRcdGNoZWNrKGxldmVsLCBNYXRjaC5PbmVPZignaW5mbycsICdlcnJvcicsICd3YXJuJywgJ2RlYnVnJykpO1xuXHRcdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgW1N0cmluZ10pKTtcblxuXHRcdGNvbnN0IGxvZ2dlciA9IE1pZ3JhdGlvbnMub3B0aW9ucyAmJiBNaWdyYXRpb25zLm9wdGlvbnMubG9nZ2VyO1xuXG5cdFx0aWYgKGxvZ2dlciAmJiBfLmlzRnVuY3Rpb24obG9nZ2VyKSkge1xuXG5cdFx0XHRsb2dnZXIoe1xuXHRcdFx0XHRsZXZlbCxcblx0XHRcdFx0bWVzc2FnZSxcblx0XHRcdFx0dGFnOiBwcmVmaXgsXG5cdFx0XHR9KTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRMb2dbbGV2ZWxdKHtcblx0XHRcdFx0bWVzc2FnZTogYCR7IHByZWZpeCB9OiAkeyBtZXNzYWdlIH1gLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufVxuXG4vLyBjb2xsZWN0aW9uIGhvbGRpbmcgdGhlIGNvbnRyb2wgcmVjb3JkXG5cbmNvbnN0IGxvZyA9IGNyZWF0ZUxvZ2dlcignTWlncmF0aW9ucycpO1xuXG5bJ2luZm8nLCAnd2FybicsICdlcnJvcicsICdkZWJ1ZyddLmZvckVhY2goZnVuY3Rpb24obGV2ZWwpIHtcblx0bG9nW2xldmVsXSA9IF8ucGFydGlhbChsb2csIGxldmVsKTtcbn0pO1xuXG4vLyBpZiAocHJvY2Vzcy5lbnYuTUlHUkFURSlcbi8vICAgTWlncmF0aW9ucy5taWdyYXRlVG8ocHJvY2Vzcy5lbnYuTUlHUkFURSk7XG5cbi8vIEFkZCBhIG5ldyBtaWdyYXRpb246XG4vLyB7dXA6IGZ1bmN0aW9uICpyZXF1aXJlZFxuLy8gIHZlcnNpb246IE51bWJlciAqcmVxdWlyZWRcbi8vICBkb3duOiBmdW5jdGlvbiAqb3B0aW9uYWxcbi8vICBuYW1lOiBTdHJpbmcgKm9wdGlvbmFsXG4vLyB9XG5NaWdyYXRpb25zLmFkZCA9IGZ1bmN0aW9uKG1pZ3JhdGlvbikge1xuXHRpZiAodHlwZW9mIG1pZ3JhdGlvbi51cCAhPT0gJ2Z1bmN0aW9uJykgeyB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdNaWdyYXRpb24gbXVzdCBzdXBwbHkgYW4gdXAgZnVuY3Rpb24uJyk7IH1cblxuXHRpZiAodHlwZW9mIG1pZ3JhdGlvbi52ZXJzaW9uICE9PSAnbnVtYmVyJykgeyB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdNaWdyYXRpb24gbXVzdCBzdXBwbHkgYSB2ZXJzaW9uIG51bWJlci4nKTsgfVxuXG5cdGlmIChtaWdyYXRpb24udmVyc2lvbiA8PSAwKSB7IHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ01pZ3JhdGlvbiB2ZXJzaW9uIG11c3QgYmUgZ3JlYXRlciB0aGFuIDAnKTsgfVxuXG5cdC8vIEZyZWV6ZSB0aGUgbWlncmF0aW9uIG9iamVjdCB0byBtYWtlIGl0IGhlcmVhZnRlciBpbW11dGFibGVcblx0T2JqZWN0LmZyZWV6ZShtaWdyYXRpb24pO1xuXG5cdHRoaXMuX2xpc3QucHVzaChtaWdyYXRpb24pO1xuXHR0aGlzLl9saXN0ID0gXy5zb3J0QnkodGhpcy5fbGlzdCwgZnVuY3Rpb24obSkge1xuXHRcdHJldHVybiBtLnZlcnNpb247XG5cdH0pO1xufTtcblxuLy8gQXR0ZW1wdHMgdG8gcnVuIHRoZSBtaWdyYXRpb25zIHVzaW5nIGNvbW1hbmQgaW4gdGhlIGZvcm0gb2Y6XG4vLyBlLmcgJ2xhdGVzdCcsICdsYXRlc3QsZXhpdCcsIDJcbi8vIHVzZSAnWFgscmVydW4nIHRvIHJlLXJ1biB0aGUgbWlncmF0aW9uIGF0IHRoYXQgdmVyc2lvblxuTWlncmF0aW9ucy5taWdyYXRlVG8gPSBmdW5jdGlvbihjb21tYW5kKSB7XG5cdGlmIChfLmlzVW5kZWZpbmVkKGNvbW1hbmQpIHx8IGNvbW1hbmQgPT09ICcnIHx8IHRoaXMuX2xpc3QubGVuZ3RoID09PSAwKSB7IHRocm93IG5ldyBFcnJvcihgQ2Fubm90IG1pZ3JhdGUgdXNpbmcgaW52YWxpZCBjb21tYW5kOiAkeyBjb21tYW5kIH1gKTsgfVxuXG5cdGxldCB2ZXJzaW9uO1xuXHRsZXQgc3ViY29tbWFuZDtcblx0aWYgKHR5cGVvZiBjb21tYW5kID09PSAnbnVtYmVyJykge1xuXHRcdHZlcnNpb24gPSBjb21tYW5kO1xuXHR9IGVsc2Uge1xuXHRcdHZlcnNpb24gPSBjb21tYW5kLnNwbGl0KCcsJylbMF07XG5cdFx0c3ViY29tbWFuZCA9IGNvbW1hbmQuc3BsaXQoJywnKVsxXTtcblx0fVxuXG5cdGNvbnN0IHsgbWF4QXR0ZW1wdHMsIHJldHJ5SW50ZXJ2YWwgfSA9IE1pZ3JhdGlvbnMub3B0aW9ucztcblx0bGV0IG1pZ3JhdGVkO1xuXHRmb3IgKGxldCBhdHRlbXB0cyA9IDE7IGF0dGVtcHRzIDw9IG1heEF0dGVtcHRzOyBhdHRlbXB0cysrKSB7XG5cdFx0aWYgKHZlcnNpb24gPT09ICdsYXRlc3QnKSB7XG5cdFx0XHRtaWdyYXRlZCA9IHRoaXMuX21pZ3JhdGVUbyhfLmxhc3QodGhpcy5fbGlzdCkudmVyc2lvbik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1pZ3JhdGVkID0gdGhpcy5fbWlncmF0ZVRvKHBhcnNlSW50KHZlcnNpb24pLCAoc3ViY29tbWFuZCA9PT0gJ3JlcnVuJykpO1xuXHRcdH1cblx0XHRpZiAobWlncmF0ZWQpIHtcblx0XHRcdGJyZWFrO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZXQgd2lsbFJldHJ5O1xuXHRcdFx0aWYgKGF0dGVtcHRzIDwgbWF4QXR0ZW1wdHMpIHtcblx0XHRcdFx0d2lsbFJldHJ5ID0gYCBUcnlpbmcgYWdhaW4gaW4gJHsgcmV0cnlJbnRlcnZhbCB9IHNlY29uZHMuYDtcblx0XHRcdFx0TWV0ZW9yLl9zbGVlcEZvck1zKHJldHJ5SW50ZXJ2YWwgKiAxMDAwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHdpbGxSZXRyeSA9ICcnO1xuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coYE5vdCBtaWdyYXRpbmcsIGNvbnRyb2wgaXMgbG9ja2VkLiBBdHRlbXB0ICR7IGF0dGVtcHRzIH0vJHsgbWF4QXR0ZW1wdHMgfS4keyB3aWxsUmV0cnkgfWAueWVsbG93KTtcblx0XHR9XG5cdH1cblx0aWYgKCFtaWdyYXRlZCkge1xuXHRcdGNvbnN0IGNvbnRyb2wgPSB0aGlzLl9nZXRDb250cm9sKCk7IC8vIFNpZGUgZWZmZWN0OiB1cHNlcnRzIGNvbnRyb2wgZG9jdW1lbnQuXG5cdFx0Y29uc29sZS5sb2cobWFrZUFCb3goW1xuXHRcdFx0J0VSUk9SISBTRVJWRVIgU1RPUFBFRCcsXG5cdFx0XHQnJyxcblx0XHRcdCdZb3VyIGRhdGFiYXNlIG1pZ3JhdGlvbiBjb250cm9sIGlzIGxvY2tlZC4nLFxuXHRcdFx0J1BsZWFzZSBtYWtlIHN1cmUgeW91IGFyZSBydW5uaW5nIHRoZSBsYXRlc3QgdmVyc2lvbiBhbmQgdHJ5IGFnYWluLicsXG5cdFx0XHQnSWYgdGhlIHByb2JsZW0gcGVyc2lzdHMsIHBsZWFzZSBjb250YWN0IHN1cHBvcnQuJyxcblx0XHRcdCcnLFxuXHRcdFx0YFRoaXMgUm9ja2V0LkNoYXQgdmVyc2lvbjogJHsgUm9ja2V0Q2hhdC5JbmZvLnZlcnNpb24gfWAsXG5cdFx0XHRgRGF0YWJhc2UgbG9ja2VkIGF0IHZlcnNpb246ICR7IGNvbnRyb2wudmVyc2lvbiB9YCxcblx0XHRcdGBEYXRhYmFzZSB0YXJnZXQgdmVyc2lvbjogJHsgdmVyc2lvbiA9PT0gJ2xhdGVzdCcgPyBfLmxhc3QodGhpcy5fbGlzdCkudmVyc2lvbiA6IHZlcnNpb24gfWAsXG5cdFx0XHQnJyxcblx0XHRcdGBDb21taXQ6ICR7IFJvY2tldENoYXQuSW5mby5jb21taXQuaGFzaCB9YCxcblx0XHRcdGBEYXRlOiAkeyBSb2NrZXRDaGF0LkluZm8uY29tbWl0LmRhdGUgfWAsXG5cdFx0XHRgQnJhbmNoOiAkeyBSb2NrZXRDaGF0LkluZm8uY29tbWl0LmJyYW5jaCB9YCxcblx0XHRcdGBUYWc6ICR7IFJvY2tldENoYXQuSW5mby5jb21taXQudGFnIH1gLFxuXHRcdF0pKTtcblx0XHRwcm9jZXNzLmV4aXQoMSk7XG5cdH1cblxuXHQvLyByZW1lbWJlciB0byBydW4gbWV0ZW9yIHdpdGggLS1vbmNlIG90aGVyd2lzZSBpdCB3aWxsIHJlc3RhcnRcblx0aWYgKHN1YmNvbW1hbmQgPT09ICdleGl0JykgeyBwcm9jZXNzLmV4aXQoMCk7IH1cbn07XG5cbi8vIGp1c3QgcmV0dXJucyB0aGUgY3VycmVudCB2ZXJzaW9uXG5NaWdyYXRpb25zLmdldFZlcnNpb24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuX2dldENvbnRyb2woKS52ZXJzaW9uO1xufTtcblxuLy8gbWlncmF0ZXMgdG8gdGhlIHNwZWNpZmljIHZlcnNpb24gcGFzc2VkIGluXG5NaWdyYXRpb25zLl9taWdyYXRlVG8gPSBmdW5jdGlvbih2ZXJzaW9uLCByZXJ1bikge1xuXHRjb25zdCBzZWxmID0gdGhpcztcblx0Y29uc3QgY29udHJvbCA9IHRoaXMuX2dldENvbnRyb2woKTsgLy8gU2lkZSBlZmZlY3Q6IHVwc2VydHMgY29udHJvbCBkb2N1bWVudC5cblx0bGV0IGN1cnJlbnRWZXJzaW9uID0gY29udHJvbC52ZXJzaW9uO1xuXG5cdGlmIChsb2NrKCkgPT09IGZhbHNlKSB7XG5cdFx0Ly8gbG9nLmluZm8oJ05vdCBtaWdyYXRpbmcsIGNvbnRyb2wgaXMgbG9ja2VkLicpO1xuXHRcdC8vIFdhcm5pbmdcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRpZiAocmVydW4pIHtcblx0XHRsb2cuaW5mbyhgUmVydW5uaW5nIHZlcnNpb24gJHsgdmVyc2lvbiB9YCk7XG5cdFx0bWlncmF0ZSgndXAnLCB0aGlzLl9maW5kSW5kZXhCeVZlcnNpb24odmVyc2lvbikpO1xuXHRcdGxvZy5pbmZvKCdGaW5pc2hlZCBtaWdyYXRpbmcuJyk7XG5cdFx0dW5sb2NrKCk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRpZiAoY3VycmVudFZlcnNpb24gPT09IHZlcnNpb24pIHtcblx0XHRpZiAodGhpcy5vcHRpb25zLmxvZ0lmTGF0ZXN0KSB7XG5cdFx0XHRsb2cuaW5mbyhgTm90IG1pZ3JhdGluZywgYWxyZWFkeSBhdCB2ZXJzaW9uICR7IHZlcnNpb24gfWApO1xuXHRcdH1cblx0XHR1bmxvY2soKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGNvbnN0IHN0YXJ0SWR4ID0gdGhpcy5fZmluZEluZGV4QnlWZXJzaW9uKGN1cnJlbnRWZXJzaW9uKTtcblx0Y29uc3QgZW5kSWR4ID0gdGhpcy5fZmluZEluZGV4QnlWZXJzaW9uKHZlcnNpb24pO1xuXG5cdC8vIGxvZy5pbmZvKCdzdGFydElkeDonICsgc3RhcnRJZHggKyAnIGVuZElkeDonICsgZW5kSWR4KTtcblx0bG9nLmluZm8oYE1pZ3JhdGluZyBmcm9tIHZlcnNpb24gJHsgdGhpcy5fbGlzdFtzdGFydElkeF0udmVyc2lvbiB9IC0+ICR7IHRoaXMuX2xpc3RbZW5kSWR4XS52ZXJzaW9uIH1gKTtcblxuXHQvLyBydW4gdGhlIGFjdHVhbCBtaWdyYXRpb25cblx0ZnVuY3Rpb24gbWlncmF0ZShkaXJlY3Rpb24sIGlkeCkge1xuXHRcdGNvbnN0IG1pZ3JhdGlvbiA9IHNlbGYuX2xpc3RbaWR4XTtcblxuXHRcdGlmICh0eXBlb2YgbWlncmF0aW9uW2RpcmVjdGlvbl0gIT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHVubG9jaygpO1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihgQ2Fubm90IG1pZ3JhdGUgJHsgZGlyZWN0aW9uIH0gb24gdmVyc2lvbiAkeyBtaWdyYXRpb24udmVyc2lvbiB9YCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbWF5YmVOYW1lKCkge1xuXHRcdFx0cmV0dXJuIG1pZ3JhdGlvbi5uYW1lID8gYCAoJHsgbWlncmF0aW9uLm5hbWUgfSlgIDogJyc7XG5cdFx0fVxuXG5cdFx0bG9nLmluZm8oYFJ1bm5pbmcgJHsgZGlyZWN0aW9uIH0oKSBvbiB2ZXJzaW9uICR7IG1pZ3JhdGlvbi52ZXJzaW9uIH0keyBtYXliZU5hbWUoKSB9YCk7XG5cblx0XHR0cnkge1xuXHRcdFx0bWlncmF0aW9uW2RpcmVjdGlvbl0obWlncmF0aW9uKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhtYWtlQUJveChbXG5cdFx0XHRcdCdFUlJPUiEgU0VSVkVSIFNUT1BQRUQnLFxuXHRcdFx0XHQnJyxcblx0XHRcdFx0J1lvdXIgZGF0YWJhc2UgbWlncmF0aW9uIGZhaWxlZDonLFxuXHRcdFx0XHRlLm1lc3NhZ2UsXG5cdFx0XHRcdCcnLFxuXHRcdFx0XHQnUGxlYXNlIG1ha2Ugc3VyZSB5b3UgYXJlIHJ1bm5pbmcgdGhlIGxhdGVzdCB2ZXJzaW9uIGFuZCB0cnkgYWdhaW4uJyxcblx0XHRcdFx0J0lmIHRoZSBwcm9ibGVtIHBlcnNpc3RzLCBwbGVhc2UgY29udGFjdCBzdXBwb3J0LicsXG5cdFx0XHRcdCcnLFxuXHRcdFx0XHRgVGhpcyBSb2NrZXQuQ2hhdCB2ZXJzaW9uOiAkeyBSb2NrZXRDaGF0LkluZm8udmVyc2lvbiB9YCxcblx0XHRcdFx0YERhdGFiYXNlIGxvY2tlZCBhdCB2ZXJzaW9uOiAkeyBjb250cm9sLnZlcnNpb24gfWAsXG5cdFx0XHRcdGBEYXRhYmFzZSB0YXJnZXQgdmVyc2lvbjogJHsgdmVyc2lvbiB9YCxcblx0XHRcdFx0JycsXG5cdFx0XHRcdGBDb21taXQ6ICR7IFJvY2tldENoYXQuSW5mby5jb21taXQuaGFzaCB9YCxcblx0XHRcdFx0YERhdGU6ICR7IFJvY2tldENoYXQuSW5mby5jb21taXQuZGF0ZSB9YCxcblx0XHRcdFx0YEJyYW5jaDogJHsgUm9ja2V0Q2hhdC5JbmZvLmNvbW1pdC5icmFuY2ggfWAsXG5cdFx0XHRcdGBUYWc6ICR7IFJvY2tldENoYXQuSW5mby5jb21taXQudGFnIH1gLFxuXHRcdFx0XSkpO1xuXHRcdFx0cHJvY2Vzcy5leGl0KDEpO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybnMgdHJ1ZSBpZiBsb2NrIHdhcyBhY3F1aXJlZC5cblx0ZnVuY3Rpb24gbG9jaygpIHtcblx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcblx0XHRjb25zdCBkYXRlTWludXNJbnRlcnZhbCA9IG1vbWVudChkYXRlKS5zdWJ0cmFjdChzZWxmLm9wdGlvbnMubG9ja0V4cGlyYXRpb24sICdtaW51dGVzJykudG9EYXRlKCk7XG5cdFx0Y29uc3QgYnVpbGQgPSBSb2NrZXRDaGF0LkluZm8gPyBSb2NrZXRDaGF0LkluZm8uYnVpbGQuZGF0ZSA6IGRhdGU7XG5cblx0XHQvLyBUaGlzIGlzIGF0b21pYy4gVGhlIHNlbGVjdG9yIGVuc3VyZXMgb25seSBvbmUgY2FsbGVyIGF0IGEgdGltZSB3aWxsIHNlZVxuXHRcdC8vIHRoZSB1bmxvY2tlZCBjb250cm9sLCBhbmQgbG9ja2luZyBvY2N1cnMgaW4gdGhlIHNhbWUgdXBkYXRlJ3MgbW9kaWZpZXIuXG5cdFx0Ly8gQWxsIG90aGVyIHNpbXVsdGFuZW91cyBjYWxsZXJzIHdpbGwgZ2V0IGZhbHNlIGJhY2sgZnJvbSB0aGUgdXBkYXRlLlxuXHRcdHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZSh7XG5cdFx0XHRfaWQ6ICdjb250cm9sJyxcblx0XHRcdCRvcjogW3tcblx0XHRcdFx0bG9ja2VkOiBmYWxzZSxcblx0XHRcdH0sIHtcblx0XHRcdFx0bG9ja2VkQXQ6IHtcblx0XHRcdFx0XHQkbHQ6IGRhdGVNaW51c0ludGVydmFsLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSwge1xuXHRcdFx0XHRidWlsZEF0OiB7XG5cdFx0XHRcdFx0JG5lOiBidWlsZCxcblx0XHRcdFx0fSxcblx0XHRcdH1dLFxuXHRcdH0sIHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0bG9ja2VkOiB0cnVlLFxuXHRcdFx0XHRsb2NrZWRBdDogZGF0ZSxcblx0XHRcdFx0YnVpbGRBdDogYnVpbGQsXG5cdFx0XHR9LFxuXHRcdH0pID09PSAxO1xuXHR9XG5cblxuXHQvLyBTaWRlIGVmZmVjdDogc2F2ZXMgdmVyc2lvbi5cblx0ZnVuY3Rpb24gdW5sb2NrKCkge1xuXHRcdHNlbGYuX3NldENvbnRyb2woe1xuXHRcdFx0bG9ja2VkOiBmYWxzZSxcblx0XHRcdHZlcnNpb246IGN1cnJlbnRWZXJzaW9uLFxuXHRcdH0pO1xuXHR9XG5cblx0aWYgKGN1cnJlbnRWZXJzaW9uIDwgdmVyc2lvbikge1xuXHRcdGZvciAobGV0IGkgPSBzdGFydElkeDsgaSA8IGVuZElkeDsgaSsrKSB7XG5cdFx0XHRtaWdyYXRlKCd1cCcsIGkgKyAxKTtcblx0XHRcdGN1cnJlbnRWZXJzaW9uID0gc2VsZi5fbGlzdFtpICsgMV0udmVyc2lvbjtcblx0XHRcdHNlbGYuX3NldENvbnRyb2woe1xuXHRcdFx0XHRsb2NrZWQ6IHRydWUsXG5cdFx0XHRcdHZlcnNpb246IGN1cnJlbnRWZXJzaW9uLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGZvciAobGV0IGkgPSBzdGFydElkeDsgaSA+IGVuZElkeDsgaS0tKSB7XG5cdFx0XHRtaWdyYXRlKCdkb3duJywgaSk7XG5cdFx0XHRjdXJyZW50VmVyc2lvbiA9IHNlbGYuX2xpc3RbaSAtIDFdLnZlcnNpb247XG5cdFx0XHRzZWxmLl9zZXRDb250cm9sKHtcblx0XHRcdFx0bG9ja2VkOiB0cnVlLFxuXHRcdFx0XHR2ZXJzaW9uOiBjdXJyZW50VmVyc2lvbixcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdHVubG9jaygpO1xuXHRsb2cuaW5mbygnRmluaXNoZWQgbWlncmF0aW5nLicpO1xufTtcblxuLy8gZ2V0cyB0aGUgY3VycmVudCBjb250cm9sIHJlY29yZCwgb3B0aW9uYWxseSBjcmVhdGluZyBpdCBpZiBub24tZXhpc3RhbnRcbk1pZ3JhdGlvbnMuX2dldENvbnRyb2wgPSBmdW5jdGlvbigpIHtcblx0Y29uc3QgY29udHJvbCA9IHRoaXMuX2NvbGxlY3Rpb24uZmluZE9uZSh7XG5cdFx0X2lkOiAnY29udHJvbCcsXG5cdH0pO1xuXG5cdHJldHVybiBjb250cm9sIHx8IHRoaXMuX3NldENvbnRyb2woe1xuXHRcdHZlcnNpb246IDAsXG5cdFx0bG9ja2VkOiBmYWxzZSxcblx0fSk7XG59O1xuXG4vLyBzZXRzIHRoZSBjb250cm9sIHJlY29yZFxuTWlncmF0aW9ucy5fc2V0Q29udHJvbCA9IGZ1bmN0aW9uKGNvbnRyb2wpIHtcblx0Ly8gYmUgcXVpdGUgc3RyaWN0XG5cdGNoZWNrKGNvbnRyb2wudmVyc2lvbiwgTnVtYmVyKTtcblx0Y2hlY2soY29udHJvbC5sb2NrZWQsIEJvb2xlYW4pO1xuXG5cdHRoaXMuX2NvbGxlY3Rpb24udXBkYXRlKHtcblx0XHRfaWQ6ICdjb250cm9sJyxcblx0fSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHZlcnNpb246IGNvbnRyb2wudmVyc2lvbixcblx0XHRcdGxvY2tlZDogY29udHJvbC5sb2NrZWQsXG5cdFx0fSxcblx0fSwge1xuXHRcdHVwc2VydDogdHJ1ZSxcblx0fSk7XG5cblx0cmV0dXJuIGNvbnRyb2w7XG59O1xuXG4vLyByZXR1cm5zIHRoZSBtaWdyYXRpb24gaW5kZXggaW4gX2xpc3Qgb3IgdGhyb3dzIGlmIG5vdCBmb3VuZFxuTWlncmF0aW9ucy5fZmluZEluZGV4QnlWZXJzaW9uID0gZnVuY3Rpb24odmVyc2lvbikge1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuX2xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAodGhpcy5fbGlzdFtpXS52ZXJzaW9uID09PSB2ZXJzaW9uKSB7IHJldHVybiBpOyB9XG5cdH1cblxuXHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKGBDYW4ndCBmaW5kIG1pZ3JhdGlvbiB2ZXJzaW9uICR7IHZlcnNpb24gfWApO1xufTtcblxuLy8gcmVzZXQgKG1haW5seSBpbnRlbmRlZCBmb3IgdGVzdHMpXG5NaWdyYXRpb25zLl9yZXNldCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9saXN0ID0gW3tcblx0XHR2ZXJzaW9uOiAwLFxuXHRcdHVwKCkge30sXG5cdH1dO1xuXHR0aGlzLl9jb2xsZWN0aW9uLnJlbW92ZSh7fSk7XG59O1xuXG5Sb2NrZXRDaGF0Lk1pZ3JhdGlvbnMgPSBNaWdyYXRpb25zO1xuIl19
