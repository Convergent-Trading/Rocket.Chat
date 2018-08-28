(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var roles;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:authorization":{"lib":{"rocketchat.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/lib/rocketchat.js                                                          //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.authz = {};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"models":{"Permissions.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Permissions.js                                               //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
class ModelPermissions extends RocketChat.models._Base {
  constructor(...args) {
    super(...args);
  } // FIND


  findByRole(role, options) {
    const query = {
      roles: role
    };
    return this.find(query, options);
  }

  findOneById(_id) {
    return this.findOne(_id);
  }

  createOrUpdate(name, roles) {
    this.upsert({
      _id: name
    }, {
      $set: {
        roles
      }
    });
  }

  addRole(permission, role) {
    this.update({
      _id: permission
    }, {
      $addToSet: {
        roles: role
      }
    });
  }

  removeRole(permission, role) {
    this.update({
      _id: permission
    }, {
      $pull: {
        roles: role
      }
    });
  }

}

RocketChat.models.Permissions = new ModelPermissions('permissions');
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Roles.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Roles.js                                                     //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
class ModelRoles extends RocketChat.models._Base {
  constructor(...args) {
    super(...args);
    this.tryEnsureIndex({
      name: 1
    });
    this.tryEnsureIndex({
      scope: 1
    });
  }

  findUsersInRole(name, scope, options) {
    const role = this.findOne(name);
    const roleScope = role && role.scope || 'Users';
    const model = RocketChat.models[roleScope];
    return model && model.findUsersInRoles && model.findUsersInRoles(name, scope, options);
  }

  isUserInRoles(userId, roles, scope) {
    roles = [].concat(roles);
    return roles.some(roleName => {
      const role = this.findOne(roleName);
      const roleScope = role && role.scope || 'Users';
      const model = RocketChat.models[roleScope];
      return model && model.isUserInRole && model.isUserInRole(userId, roleName, scope);
    });
  }

  createOrUpdate(name, scope = 'Users', description, protectedRole) {
    const updateData = {};
    updateData.name = name;
    updateData.scope = scope;

    if (description != null) {
      updateData.description = description;
    }

    if (protectedRole) {
      updateData.protected = protectedRole;
    }

    this.upsert({
      _id: name
    }, {
      $set: updateData
    });
  }

  addUserRoles(userId, roles, scope) {
    roles = [].concat(roles);

    for (const roleName of roles) {
      const role = this.findOne(roleName);
      const roleScope = role && role.scope || 'Users';
      const model = RocketChat.models[roleScope];
      model && model.addRolesByUserId && model.addRolesByUserId(userId, roleName, scope);
    }

    return true;
  }

  removeUserRoles(userId, roles, scope) {
    roles = [].concat(roles);

    for (const roleName of roles) {
      const role = this.findOne(roleName);
      const roleScope = role && role.scope || 'Users';
      const model = RocketChat.models[roleScope];
      model && model.removeRolesByUserId && model.removeRolesByUserId(userId, roleName, scope);
    }

    return true;
  }

}

RocketChat.models.Roles = new ModelRoles('roles');
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Base.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Base.js                                                      //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.models._Base.prototype.roleBaseQuery = function ()
/* userId, scope*/
{
  return;
};

RocketChat.models._Base.prototype.findRolesByUserId = function (userId
/* , options*/
) {
  const query = this.roleBaseQuery(userId);
  return this.find(query, {
    fields: {
      roles: 1
    }
  });
};

RocketChat.models._Base.prototype.isUserInRole = function (userId, roleName, scope) {
  const query = this.roleBaseQuery(userId, scope);

  if (query == null) {
    return false;
  }

  query.roles = roleName;
  return !_.isUndefined(this.findOne(query, {
    fields: {
      roles: 1
    }
  }));
};

RocketChat.models._Base.prototype.addRolesByUserId = function (userId, roles, scope) {
  roles = [].concat(roles);
  const query = this.roleBaseQuery(userId, scope);
  const update = {
    $addToSet: {
      roles: {
        $each: roles
      }
    }
  };
  return this.update(query, update);
};

RocketChat.models._Base.prototype.removeRolesByUserId = function (userId, roles, scope) {
  roles = [].concat(roles);
  const query = this.roleBaseQuery(userId, scope);
  const update = {
    $pullAll: {
      roles
    }
  };
  return this.update(query, update);
};

RocketChat.models._Base.prototype.findUsersInRoles = function () {
  throw new Meteor.Error('overwrite-function', 'You must overwrite this function in the extended classes');
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Users.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Users.js                                                     //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.models.Users.roleBaseQuery = function (userId) {
  return {
    _id: userId
  };
};

RocketChat.models.Users.findUsersInRoles = function (roles, scope, options) {
  roles = [].concat(roles);
  const query = {
    roles: {
      $in: roles
    }
  };
  return this.find(query, options);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Subscriptions.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Subscriptions.js                                             //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.models.Subscriptions.roleBaseQuery = function (userId, scope) {
  if (scope == null) {
    return;
  }

  const query = {
    'u._id': userId
  };

  if (!_.isUndefined(scope)) {
    query.rid = scope;
  }

  return query;
};

RocketChat.models.Subscriptions.findUsersInRoles = function (roles, scope, options) {
  roles = [].concat(roles);
  const query = {
    roles: {
      $in: roles
    }
  };

  if (scope) {
    query.rid = scope;
  }

  const subscriptions = this.find(query).fetch();

  const users = _.compact(_.map(subscriptions, function (subscription) {
    if ('undefined' !== typeof subscription.u && 'undefined' !== typeof subscription.u._id) {
      return subscription.u._id;
    }
  }));

  return RocketChat.models.Users.find({
    _id: {
      $in: users
    }
  }, options);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"addUserRoles.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/addUserRoles.js                                           //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.authz.addUserRoles = function (userId, roleNames, scope) {
  if (!userId || !roleNames) {
    return false;
  }

  const user = RocketChat.models.Users.db.findOneById(userId);

  if (!user) {
    throw new Meteor.Error('error-invalid-user', 'Invalid user', {
      function: 'RocketChat.authz.addUserRoles'
    });
  }

  roleNames = [].concat(roleNames);

  const existingRoleNames = _.pluck(RocketChat.authz.getRoles(), '_id');

  const invalidRoleNames = _.difference(roleNames, existingRoleNames);

  if (!_.isEmpty(invalidRoleNames)) {
    for (const role of invalidRoleNames) {
      RocketChat.models.Roles.createOrUpdate(role);
    }
  }

  RocketChat.models.Roles.addUserRoles(userId, roleNames, scope);
  return true;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"canAccessRoom.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/canAccessRoom.js                                          //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
/* globals RocketChat */
RocketChat.authz.roomAccessValidators = [function (room, user = {}) {
  if (room && room.t === 'c') {
    if (!user._id && RocketChat.settings.get('Accounts_AllowAnonymousRead') === true) {
      return true;
    }

    return RocketChat.authz.hasPermission(user._id, 'view-c-room');
  }
}, function (room, user = {}) {
  if (!room || !user) {
    return;
  }

  const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user._id);

  if (subscription) {
    return RocketChat.models.Rooms.findOneById(subscription.rid);
  }
}];

RocketChat.authz.canAccessRoom = function (room, user, extraData) {
  return RocketChat.authz.roomAccessValidators.some(validator => validator.call(this, room, user, extraData));
};

RocketChat.authz.addRoomAccessValidator = function (validator) {
  RocketChat.authz.roomAccessValidators.push(validator);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getRoles.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/getRoles.js                                               //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.authz.getRoles = function () {
  return RocketChat.models.Roles.find().fetch();
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUsersInRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/getUsersInRole.js                                         //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.authz.getUsersInRole = function (roleName, scope, options) {
  return RocketChat.models.Roles.findUsersInRole(roleName, scope, options);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hasPermission.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/hasPermission.js                                          //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
function atLeastOne(userId, permissions = [], scope) {
  return permissions.some(permissionId => {
    const permission = RocketChat.models.Permissions.findOne(permissionId);
    return RocketChat.models.Roles.isUserInRoles(userId, permission.roles, scope);
  });
}

function all(userId, permissions = [], scope) {
  return permissions.every(permissionId => {
    const permission = RocketChat.models.Permissions.findOne(permissionId);
    return RocketChat.models.Roles.isUserInRoles(userId, permission.roles, scope);
  });
}

function hasPermission(userId, permissions, scope, strategy) {
  if (!userId) {
    return false;
  }

  permissions = [].concat(permissions);
  return strategy(userId, permissions, scope);
}

RocketChat.authz.hasAllPermission = function (userId, permissions, scope) {
  return hasPermission(userId, permissions, scope, all);
};

RocketChat.authz.hasPermission = RocketChat.authz.hasAllPermission;

RocketChat.authz.hasAtLeastOnePermission = function (userId, permissions, scope) {
  return hasPermission(userId, permissions, scope, atLeastOne);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hasRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/hasRole.js                                                //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.authz.hasRole = function (userId, roleNames, scope) {
  roleNames = [].concat(roleNames);
  return RocketChat.models.Roles.isUserInRoles(userId, roleNames, scope);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeUserFromRoles.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/removeUserFromRoles.js                                    //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.authz.removeUserFromRoles = function (userId, roleNames, scope) {
  if (!userId || !roleNames) {
    return false;
  }

  const user = RocketChat.models.Users.findOneById(userId);

  if (!user) {
    throw new Meteor.Error('error-invalid-user', 'Invalid user', {
      function: 'RocketChat.authz.removeUserFromRoles'
    });
  }

  roleNames = [].concat(roleNames);

  const existingRoleNames = _.pluck(RocketChat.authz.getRoles(), '_id');

  const invalidRoleNames = _.difference(roleNames, existingRoleNames);

  if (!_.isEmpty(invalidRoleNames)) {
    throw new Meteor.Error('error-invalid-role', 'Invalid role', {
      function: 'RocketChat.authz.removeUserFromRoles'
    });
  }

  RocketChat.models.Roles.removeUserRoles(userId, roleNames, scope);
  return true;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"publications":{"permissions.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/publications/permissions.js                                         //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'permissions/get'(updatedAt) {
    this.unblock(); // TODO: should we return this for non logged users?
    // TODO: we could cache this collection

    const records = RocketChat.models.Permissions.find().fetch();

    if (updatedAt instanceof Date) {
      return {
        update: records.filter(record => record._updatedAt > updatedAt),
        remove: RocketChat.models.Permissions.trashFindDeletedAfter(updatedAt, {}, {
          fields: {
            _id: 1,
            _deletedAt: 1
          }
        }).fetch()
      };
    }

    return records;
  }

});
RocketChat.models.Permissions.on('change', ({
  clientAction,
  id,
  data
}) => {
  switch (clientAction) {
    case 'updated':
    case 'inserted':
      data = data || RocketChat.models.Permissions.findOneById(id);
      break;

    case 'removed':
      data = {
        _id: id
      };
      break;
  }

  RocketChat.Notifications.notifyLoggedInThisInstance('permissions-changed', clientAction, data);
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"roles.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/publications/roles.js                                               //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.publish('roles', function () {
  if (!this.userId) {
    return this.ready();
  }

  return RocketChat.models.Roles.find();
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"usersInRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/publications/usersInRole.js                                         //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.publish('usersInRole', function (roleName, scope, limit = 50) {
  if (!this.userId) {
    return this.ready();
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'access-permissions')) {
    return this.error(new Meteor.Error('error-not-allowed', 'Not allowed', {
      publish: 'usersInRole'
    }));
  }

  const options = {
    limit,
    sort: {
      name: 1
    }
  };
  return RocketChat.authz.getUsersInRole(roleName, scope, options);
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"addUserToRole.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/addUserToRole.js                                            //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  'authorization:addUserToRole'(roleName, username, scope) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Accessing permissions is not allowed', {
        method: 'authorization:addUserToRole',
        action: 'Accessing_permissions'
      });
    }

    if (!roleName || !_.isString(roleName) || !username || !_.isString(username)) {
      throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
        method: 'authorization:addUserToRole'
      });
    }

    if (roleName === 'admin' && !RocketChat.authz.hasPermission(Meteor.userId(), 'assign-admin-role')) {
      throw new Meteor.Error('error-action-not-allowed', 'Assigning admin is not allowed', {
        method: 'authorization:addUserToRole',
        action: 'Assign_admin'
      });
    }

    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1
      }
    });

    if (!user || !user._id) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'authorization:addUserToRole'
      });
    }

    const add = RocketChat.models.Roles.addUserRoles(user._id, roleName, scope);

    if (RocketChat.settings.get('UI_DisplayRoles')) {
      RocketChat.Notifications.notifyLogged('roles-change', {
        type: 'added',
        _id: roleName,
        u: {
          _id: user._id,
          username
        },
        scope
      });
    }

    return add;
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/deleteRole.js                                               //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'authorization:deleteRole'(roleName) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Accessing permissions is not allowed', {
        method: 'authorization:deleteRole',
        action: 'Accessing_permissions'
      });
    }

    const role = RocketChat.models.Roles.findOne(roleName);

    if (!role) {
      throw new Meteor.Error('error-invalid-role', 'Invalid role', {
        method: 'authorization:deleteRole'
      });
    }

    if (role.protected) {
      throw new Meteor.Error('error-delete-protected-role', 'Cannot delete a protected role', {
        method: 'authorization:deleteRole'
      });
    }

    const roleScope = role.scope || 'Users';
    const model = RocketChat.models[roleScope];
    const existingUsers = model && model.findUsersInRoles && model.findUsersInRoles(roleName);

    if (existingUsers && existingUsers.count() > 0) {
      throw new Meteor.Error('error-role-in-use', 'Cannot delete role because it\'s in use', {
        method: 'authorization:deleteRole'
      });
    }

    return RocketChat.models.Roles.remove(role.name);
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeUserFromRole.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/removeUserFromRole.js                                       //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  'authorization:removeUserFromRole'(roleName, username, scope) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Access permissions is not allowed', {
        method: 'authorization:removeUserFromRole',
        action: 'Accessing_permissions'
      });
    }

    if (!roleName || !_.isString(roleName) || !username || !_.isString(username)) {
      throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
        method: 'authorization:removeUserFromRole'
      });
    }

    const user = Meteor.users.findOne({
      username
    }, {
      fields: {
        _id: 1,
        roles: 1
      }
    });

    if (!user || !user._id) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'authorization:removeUserFromRole'
      });
    } // prevent removing last user from admin role


    if (roleName === 'admin') {
      const adminCount = Meteor.users.find({
        roles: {
          $in: ['admin']
        }
      }).count();
      const userIsAdmin = user.roles.indexOf('admin') > -1;

      if (adminCount === 1 && userIsAdmin) {
        throw new Meteor.Error('error-action-not-allowed', 'Leaving the app without admins is not allowed', {
          method: 'removeUserFromRole',
          action: 'Remove_last_admin'
        });
      }
    }

    const remove = RocketChat.models.Roles.removeUserRoles(user._id, roleName, scope);

    if (RocketChat.settings.get('UI_DisplayRoles')) {
      RocketChat.Notifications.notifyLogged('roles-change', {
        type: 'removed',
        _id: roleName,
        u: {
          _id: user._id,
          username
        },
        scope
      });
    }

    return remove;
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/saveRole.js                                                 //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'authorization:saveRole'(roleData) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Accessing permissions is not allowed', {
        method: 'authorization:saveRole',
        action: 'Accessing_permissions'
      });
    }

    if (!roleData.name) {
      throw new Meteor.Error('error-role-name-required', 'Role name is required', {
        method: 'authorization:saveRole'
      });
    }

    if (['Users', 'Subscriptions'].includes(roleData.scope) === false) {
      roleData.scope = 'Users';
    }

    const update = RocketChat.models.Roles.createOrUpdate(roleData.name, roleData.scope, roleData.description);

    if (RocketChat.settings.get('UI_DisplayRoles')) {
      RocketChat.Notifications.notifyLogged('roles-change', {
        type: 'changed',
        _id: roleData.name
      });
    }

    return update;
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addPermissionToRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/addPermissionToRole.js                                      //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'authorization:addPermissionToRole'(permission, role) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Adding permission is not allowed', {
        method: 'authorization:addPermissionToRole',
        action: 'Adding_permission'
      });
    }

    return RocketChat.models.Permissions.addRole(permission, role);
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeRoleFromPermission.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/removeRoleFromPermission.js                                 //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'authorization:removeRoleFromPermission'(permission, role) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Accessing permissions is not allowed', {
        method: 'authorization:removeRoleFromPermission',
        action: 'Accessing_permissions'
      });
    }

    return RocketChat.models.Permissions.removeRole(permission, role);
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/startup.js                                                          //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
/* eslint no-multi-spaces: 0 */
Meteor.startup(function () {
  // Note:
  // 1.if we need to create a role that can only edit channel message, but not edit group message
  // then we can define edit-<type>-message instead of edit-message
  // 2. admin, moderator, and user roles should not be deleted as they are referened in the code.
  const permissions = [{
    _id: 'access-permissions',
    roles: ['admin']
  }, {
    _id: 'add-oauth-service',
    roles: ['admin']
  }, {
    _id: 'add-user-to-joined-room',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'add-user-to-any-c-room',
    roles: ['admin']
  }, {
    _id: 'add-user-to-any-p-room',
    roles: []
  }, {
    _id: 'archive-room',
    roles: ['admin', 'owner']
  }, {
    _id: 'assign-admin-role',
    roles: ['admin']
  }, {
    _id: 'ban-user',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'bulk-create-c',
    roles: ['admin']
  }, {
    _id: 'bulk-register-user',
    roles: ['admin']
  }, {
    _id: 'create-c',
    roles: ['admin', 'user', 'bot']
  }, {
    _id: 'create-d',
    roles: ['admin', 'user', 'bot']
  }, {
    _id: 'create-p',
    roles: ['admin', 'user', 'bot']
  }, {
    _id: 'create-user',
    roles: ['admin']
  }, {
    _id: 'clean-channel-history',
    roles: ['admin']
  }, {
    _id: 'delete-c',
    roles: ['admin', 'owner']
  }, {
    _id: 'delete-d',
    roles: ['admin']
  }, {
    _id: 'delete-message',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'delete-p',
    roles: ['admin', 'owner']
  }, {
    _id: 'delete-user',
    roles: ['admin']
  }, {
    _id: 'edit-message',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'edit-other-user-active-status',
    roles: ['admin']
  }, {
    _id: 'edit-other-user-info',
    roles: ['admin']
  }, {
    _id: 'edit-other-user-password',
    roles: ['admin']
  }, {
    _id: 'edit-privileged-setting',
    roles: ['admin']
  }, {
    _id: 'edit-room',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'edit-room-retention-policy',
    roles: ['admin']
  }, {
    _id: 'force-delete-message',
    roles: ['admin', 'owner']
  }, {
    _id: 'join-without-join-code',
    roles: ['admin', 'bot']
  }, {
    _id: 'leave-c',
    roles: ['admin', 'user', 'bot', 'anonymous']
  }, {
    _id: 'leave-p',
    roles: ['admin', 'user', 'bot', 'anonymous']
  }, {
    _id: 'manage-assets',
    roles: ['admin']
  }, {
    _id: 'manage-emoji',
    roles: ['admin']
  }, {
    _id: 'manage-integrations',
    roles: ['admin']
  }, {
    _id: 'manage-own-integrations',
    roles: ['admin', 'bot']
  }, {
    _id: 'manage-oauth-apps',
    roles: ['admin']
  }, {
    _id: 'mention-all',
    roles: ['admin', 'owner', 'moderator', 'user']
  }, {
    _id: 'mention-here',
    roles: ['admin', 'owner', 'moderator', 'user']
  }, {
    _id: 'mute-user',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'remove-user',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'run-import',
    roles: ['admin']
  }, {
    _id: 'run-migration',
    roles: ['admin']
  }, {
    _id: 'set-moderator',
    roles: ['admin', 'owner']
  }, {
    _id: 'set-owner',
    roles: ['admin', 'owner']
  }, {
    _id: 'send-many-messages',
    roles: ['admin', 'bot']
  }, {
    _id: 'set-leader',
    roles: ['admin', 'owner']
  }, {
    _id: 'unarchive-room',
    roles: ['admin']
  }, {
    _id: 'view-c-room',
    roles: ['admin', 'user', 'bot', 'anonymous']
  }, {
    _id: 'user-generate-access-token',
    roles: ['admin']
  }, {
    _id: 'view-d-room',
    roles: ['admin', 'user', 'bot']
  }, {
    _id: 'view-full-other-user-info',
    roles: ['admin']
  }, {
    _id: 'view-history',
    roles: ['admin', 'user', 'anonymous']
  }, {
    _id: 'view-joined-room',
    roles: ['guest', 'bot', 'anonymous']
  }, {
    _id: 'view-join-code',
    roles: ['admin']
  }, {
    _id: 'view-logs',
    roles: ['admin']
  }, {
    _id: 'view-other-user-channels',
    roles: ['admin']
  }, {
    _id: 'view-p-room',
    roles: ['admin', 'user', 'anonymous']
  }, {
    _id: 'view-privileged-setting',
    roles: ['admin']
  }, {
    _id: 'view-room-administration',
    roles: ['admin']
  }, {
    _id: 'view-statistics',
    roles: ['admin']
  }, {
    _id: 'view-user-administration',
    roles: ['admin']
  }, {
    _id: 'preview-c-room',
    roles: ['admin', 'user', 'anonymous']
  }, {
    _id: 'view-outside-room',
    roles: ['admin', 'owner', 'moderator', 'user']
  }, {
    _id: 'view-broadcast-member-list',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'call-management',
    roles: ['admin', 'owner', 'moderator']
  }];

  for (const permission of permissions) {
    if (!RocketChat.models.Permissions.findOneById(permission._id)) {
      RocketChat.models.Permissions.upsert(permission._id, {
        $set: permission
      });
    }
  }

  const defaultRoles = [{
    name: 'admin',
    scope: 'Users',
    description: 'Admin'
  }, {
    name: 'moderator',
    scope: 'Subscriptions',
    description: 'Moderator'
  }, {
    name: 'leader',
    scope: 'Subscriptions',
    description: 'Leader'
  }, {
    name: 'owner',
    scope: 'Subscriptions',
    description: 'Owner'
  }, {
    name: 'user',
    scope: 'Users',
    description: ''
  }, {
    name: 'bot',
    scope: 'Users',
    description: ''
  }, {
    name: 'guest',
    scope: 'Users',
    description: ''
  }, {
    name: 'anonymous',
    scope: 'Users',
    description: ''
  }];

  for (const role of defaultRoles) {
    RocketChat.models.Roles.upsert({
      _id: role.name
    }, {
      $setOnInsert: {
        scope: role.scope,
        description: role.description || '',
        protected: true
      }
    });
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:authorization/lib/rocketchat.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Permissions.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Roles.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Base.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Users.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Subscriptions.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/addUserRoles.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/canAccessRoom.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/getRoles.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/getUsersInRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/hasPermission.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/hasRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/removeUserFromRoles.js");
require("/node_modules/meteor/rocketchat:authorization/server/publications/permissions.js");
require("/node_modules/meteor/rocketchat:authorization/server/publications/roles.js");
require("/node_modules/meteor/rocketchat:authorization/server/publications/usersInRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/addUserToRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/deleteRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/removeUserFromRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/saveRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/addPermissionToRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/removeRoleFromPermission.js");
require("/node_modules/meteor/rocketchat:authorization/server/startup.js");

/* Exports */
Package._define("rocketchat:authorization");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_authorization.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL2xpYi9yb2NrZXRjaGF0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21vZGVscy9QZXJtaXNzaW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9tb2RlbHMvUm9sZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvbW9kZWxzL0Jhc2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvbW9kZWxzL1VzZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21vZGVscy9TdWJzY3JpcHRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL2Z1bmN0aW9ucy9hZGRVc2VyUm9sZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvZnVuY3Rpb25zL2NhbkFjY2Vzc1Jvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvZnVuY3Rpb25zL2dldFJvbGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL2Z1bmN0aW9ucy9nZXRVc2Vyc0luUm9sZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9mdW5jdGlvbnMvaGFzUGVybWlzc2lvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9mdW5jdGlvbnMvaGFzUm9sZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9mdW5jdGlvbnMvcmVtb3ZlVXNlckZyb21Sb2xlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9wdWJsaWNhdGlvbnMvcGVybWlzc2lvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvcHVibGljYXRpb25zL3JvbGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL3B1YmxpY2F0aW9ucy91c2Vyc0luUm9sZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9tZXRob2RzL2FkZFVzZXJUb1JvbGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvbWV0aG9kcy9kZWxldGVSb2xlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21ldGhvZHMvcmVtb3ZlVXNlckZyb21Sb2xlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21ldGhvZHMvc2F2ZVJvbGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvbWV0aG9kcy9hZGRQZXJtaXNzaW9uVG9Sb2xlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21ldGhvZHMvcmVtb3ZlUm9sZUZyb21QZXJtaXNzaW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL3N0YXJ0dXAuanMiXSwibmFtZXMiOlsiUm9ja2V0Q2hhdCIsImF1dGh6IiwiTW9kZWxQZXJtaXNzaW9ucyIsIm1vZGVscyIsIl9CYXNlIiwiY29uc3RydWN0b3IiLCJhcmdzIiwiZmluZEJ5Um9sZSIsInJvbGUiLCJvcHRpb25zIiwicXVlcnkiLCJyb2xlcyIsImZpbmQiLCJmaW5kT25lQnlJZCIsIl9pZCIsImZpbmRPbmUiLCJjcmVhdGVPclVwZGF0ZSIsIm5hbWUiLCJ1cHNlcnQiLCIkc2V0IiwiYWRkUm9sZSIsInBlcm1pc3Npb24iLCJ1cGRhdGUiLCIkYWRkVG9TZXQiLCJyZW1vdmVSb2xlIiwiJHB1bGwiLCJQZXJtaXNzaW9ucyIsIk1vZGVsUm9sZXMiLCJ0cnlFbnN1cmVJbmRleCIsInNjb3BlIiwiZmluZFVzZXJzSW5Sb2xlIiwicm9sZVNjb3BlIiwibW9kZWwiLCJmaW5kVXNlcnNJblJvbGVzIiwiaXNVc2VySW5Sb2xlcyIsInVzZXJJZCIsImNvbmNhdCIsInNvbWUiLCJyb2xlTmFtZSIsImlzVXNlckluUm9sZSIsImRlc2NyaXB0aW9uIiwicHJvdGVjdGVkUm9sZSIsInVwZGF0ZURhdGEiLCJwcm90ZWN0ZWQiLCJhZGRVc2VyUm9sZXMiLCJhZGRSb2xlc0J5VXNlcklkIiwicmVtb3ZlVXNlclJvbGVzIiwicmVtb3ZlUm9sZXNCeVVzZXJJZCIsIlJvbGVzIiwiXyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwicHJvdG90eXBlIiwicm9sZUJhc2VRdWVyeSIsImZpbmRSb2xlc0J5VXNlcklkIiwiZmllbGRzIiwiaXNVbmRlZmluZWQiLCIkZWFjaCIsIiRwdWxsQWxsIiwiTWV0ZW9yIiwiRXJyb3IiLCJVc2VycyIsIiRpbiIsIlN1YnNjcmlwdGlvbnMiLCJyaWQiLCJzdWJzY3JpcHRpb25zIiwiZmV0Y2giLCJ1c2VycyIsImNvbXBhY3QiLCJtYXAiLCJzdWJzY3JpcHRpb24iLCJ1Iiwicm9sZU5hbWVzIiwidXNlciIsImRiIiwiZnVuY3Rpb24iLCJleGlzdGluZ1JvbGVOYW1lcyIsInBsdWNrIiwiZ2V0Um9sZXMiLCJpbnZhbGlkUm9sZU5hbWVzIiwiZGlmZmVyZW5jZSIsImlzRW1wdHkiLCJyb29tQWNjZXNzVmFsaWRhdG9ycyIsInJvb20iLCJ0Iiwic2V0dGluZ3MiLCJnZXQiLCJoYXNQZXJtaXNzaW9uIiwiZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkIiwiUm9vbXMiLCJjYW5BY2Nlc3NSb29tIiwiZXh0cmFEYXRhIiwidmFsaWRhdG9yIiwiY2FsbCIsImFkZFJvb21BY2Nlc3NWYWxpZGF0b3IiLCJwdXNoIiwiZ2V0VXNlcnNJblJvbGUiLCJhdExlYXN0T25lIiwicGVybWlzc2lvbnMiLCJwZXJtaXNzaW9uSWQiLCJhbGwiLCJldmVyeSIsInN0cmF0ZWd5IiwiaGFzQWxsUGVybWlzc2lvbiIsImhhc0F0TGVhc3RPbmVQZXJtaXNzaW9uIiwiaGFzUm9sZSIsInJlbW92ZVVzZXJGcm9tUm9sZXMiLCJtZXRob2RzIiwidXBkYXRlZEF0IiwidW5ibG9jayIsInJlY29yZHMiLCJEYXRlIiwiZmlsdGVyIiwicmVjb3JkIiwiX3VwZGF0ZWRBdCIsInJlbW92ZSIsInRyYXNoRmluZERlbGV0ZWRBZnRlciIsIl9kZWxldGVkQXQiLCJvbiIsImNsaWVudEFjdGlvbiIsImlkIiwiZGF0YSIsIk5vdGlmaWNhdGlvbnMiLCJub3RpZnlMb2dnZWRJblRoaXNJbnN0YW5jZSIsInB1Ymxpc2giLCJyZWFkeSIsImxpbWl0IiwiZXJyb3IiLCJzb3J0IiwidXNlcm5hbWUiLCJtZXRob2QiLCJhY3Rpb24iLCJpc1N0cmluZyIsImZpbmRPbmVCeVVzZXJuYW1lIiwiYWRkIiwibm90aWZ5TG9nZ2VkIiwidHlwZSIsImV4aXN0aW5nVXNlcnMiLCJjb3VudCIsImFkbWluQ291bnQiLCJ1c2VySXNBZG1pbiIsImluZGV4T2YiLCJyb2xlRGF0YSIsImluY2x1ZGVzIiwic3RhcnR1cCIsImRlZmF1bHRSb2xlcyIsIiRzZXRPbkluc2VydCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLFdBQVdDLEtBQVgsR0FBbUIsRUFBbkIsQzs7Ozs7Ozs7Ozs7QUNBQSxNQUFNQyxnQkFBTixTQUErQkYsV0FBV0csTUFBWCxDQUFrQkMsS0FBakQsQ0FBdUQ7QUFDdERDLGNBQVksR0FBR0MsSUFBZixFQUFxQjtBQUNwQixVQUFNLEdBQUdBLElBQVQ7QUFDQSxHQUhxRCxDQUt0RDs7O0FBQ0FDLGFBQVdDLElBQVgsRUFBaUJDLE9BQWpCLEVBQTBCO0FBQ3pCLFVBQU1DLFFBQVE7QUFDYkMsYUFBT0g7QUFETSxLQUFkO0FBSUEsV0FBTyxLQUFLSSxJQUFMLENBQVVGLEtBQVYsRUFBaUJELE9BQWpCLENBQVA7QUFDQTs7QUFFREksY0FBWUMsR0FBWixFQUFpQjtBQUNoQixXQUFPLEtBQUtDLE9BQUwsQ0FBYUQsR0FBYixDQUFQO0FBQ0E7O0FBRURFLGlCQUFlQyxJQUFmLEVBQXFCTixLQUFyQixFQUE0QjtBQUMzQixTQUFLTyxNQUFMLENBQVk7QUFBRUosV0FBS0c7QUFBUCxLQUFaLEVBQTJCO0FBQUVFLFlBQU07QUFBRVI7QUFBRjtBQUFSLEtBQTNCO0FBQ0E7O0FBRURTLFVBQVFDLFVBQVIsRUFBb0JiLElBQXBCLEVBQTBCO0FBQ3pCLFNBQUtjLE1BQUwsQ0FBWTtBQUFFUixXQUFLTztBQUFQLEtBQVosRUFBaUM7QUFBRUUsaUJBQVc7QUFBRVosZUFBT0g7QUFBVDtBQUFiLEtBQWpDO0FBQ0E7O0FBRURnQixhQUFXSCxVQUFYLEVBQXVCYixJQUF2QixFQUE2QjtBQUM1QixTQUFLYyxNQUFMLENBQVk7QUFBRVIsV0FBS087QUFBUCxLQUFaLEVBQWlDO0FBQUVJLGFBQU87QUFBRWQsZUFBT0g7QUFBVDtBQUFULEtBQWpDO0FBQ0E7O0FBNUJx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OiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9hdXRob3JpemF0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiUm9ja2V0Q2hhdC5hdXRoeiA9IHt9O1xuIiwiY2xhc3MgTW9kZWxQZXJtaXNzaW9ucyBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoLi4uYXJncykge1xuXHRcdHN1cGVyKC4uLmFyZ3MpO1xuXHR9XG5cblx0Ly8gRklORFxuXHRmaW5kQnlSb2xlKHJvbGUsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdHJvbGVzOiByb2xlLFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdGZpbmRPbmVCeUlkKF9pZCkge1xuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUoX2lkKTtcblx0fVxuXG5cdGNyZWF0ZU9yVXBkYXRlKG5hbWUsIHJvbGVzKSB7XG5cdFx0dGhpcy51cHNlcnQoeyBfaWQ6IG5hbWUgfSwgeyAkc2V0OiB7IHJvbGVzIH0gfSk7XG5cdH1cblxuXHRhZGRSb2xlKHBlcm1pc3Npb24sIHJvbGUpIHtcblx0XHR0aGlzLnVwZGF0ZSh7IF9pZDogcGVybWlzc2lvbiB9LCB7ICRhZGRUb1NldDogeyByb2xlczogcm9sZSB9IH0pO1xuXHR9XG5cblx0cmVtb3ZlUm9sZShwZXJtaXNzaW9uLCByb2xlKSB7XG5cdFx0dGhpcy51cGRhdGUoeyBfaWQ6IHBlcm1pc3Npb24gfSwgeyAkcHVsbDogeyByb2xlczogcm9sZSB9IH0pO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zID0gbmV3IE1vZGVsUGVybWlzc2lvbnMoJ3Blcm1pc3Npb25zJyk7XG4iLCJjbGFzcyBNb2RlbFJvbGVzIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG5cdFx0c3VwZXIoLi4uYXJncyk7XG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IG5hbWU6IDEgfSk7XG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IHNjb3BlOiAxIH0pO1xuXHR9XG5cblx0ZmluZFVzZXJzSW5Sb2xlKG5hbWUsIHNjb3BlLCBvcHRpb25zKSB7XG5cdFx0Y29uc3Qgcm9sZSA9IHRoaXMuZmluZE9uZShuYW1lKTtcblx0XHRjb25zdCByb2xlU2NvcGUgPSAocm9sZSAmJiByb2xlLnNjb3BlKSB8fCAnVXNlcnMnO1xuXHRcdGNvbnN0IG1vZGVsID0gUm9ja2V0Q2hhdC5tb2RlbHNbcm9sZVNjb3BlXTtcblxuXHRcdHJldHVybiBtb2RlbCAmJiBtb2RlbC5maW5kVXNlcnNJblJvbGVzICYmIG1vZGVsLmZpbmRVc2Vyc0luUm9sZXMobmFtZSwgc2NvcGUsIG9wdGlvbnMpO1xuXHR9XG5cblx0aXNVc2VySW5Sb2xlcyh1c2VySWQsIHJvbGVzLCBzY29wZSkge1xuXHRcdHJvbGVzID0gW10uY29uY2F0KHJvbGVzKTtcblx0XHRyZXR1cm4gcm9sZXMuc29tZSgocm9sZU5hbWUpID0+IHtcblx0XHRcdGNvbnN0IHJvbGUgPSB0aGlzLmZpbmRPbmUocm9sZU5hbWUpO1xuXHRcdFx0Y29uc3Qgcm9sZVNjb3BlID0gKHJvbGUgJiYgcm9sZS5zY29wZSkgfHwgJ1VzZXJzJztcblx0XHRcdGNvbnN0IG1vZGVsID0gUm9ja2V0Q2hhdC5tb2RlbHNbcm9sZVNjb3BlXTtcblxuXHRcdFx0cmV0dXJuIG1vZGVsICYmIG1vZGVsLmlzVXNlckluUm9sZSAmJiBtb2RlbC5pc1VzZXJJblJvbGUodXNlcklkLCByb2xlTmFtZSwgc2NvcGUpO1xuXHRcdH0pO1xuXHR9XG5cblx0Y3JlYXRlT3JVcGRhdGUobmFtZSwgc2NvcGUgPSAnVXNlcnMnLCBkZXNjcmlwdGlvbiwgcHJvdGVjdGVkUm9sZSkge1xuXHRcdGNvbnN0IHVwZGF0ZURhdGEgPSB7fTtcblx0XHR1cGRhdGVEYXRhLm5hbWUgPSBuYW1lO1xuXHRcdHVwZGF0ZURhdGEuc2NvcGUgPSBzY29wZTtcblxuXHRcdGlmIChkZXNjcmlwdGlvbiAhPSBudWxsKSB7XG5cdFx0XHR1cGRhdGVEYXRhLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG5cdFx0fVxuXG5cdFx0aWYgKHByb3RlY3RlZFJvbGUpIHtcblx0XHRcdHVwZGF0ZURhdGEucHJvdGVjdGVkID0gcHJvdGVjdGVkUm9sZTtcblx0XHR9XG5cblx0XHR0aGlzLnVwc2VydCh7IF9pZDogbmFtZSB9LCB7ICRzZXQ6IHVwZGF0ZURhdGEgfSk7XG5cdH1cblxuXHRhZGRVc2VyUm9sZXModXNlcklkLCByb2xlcywgc2NvcGUpIHtcblx0XHRyb2xlcyA9IFtdLmNvbmNhdChyb2xlcyk7XG5cdFx0Zm9yIChjb25zdCByb2xlTmFtZSBvZiByb2xlcykge1xuXHRcdFx0Y29uc3Qgcm9sZSA9IHRoaXMuZmluZE9uZShyb2xlTmFtZSk7XG5cdFx0XHRjb25zdCByb2xlU2NvcGUgPSAocm9sZSAmJiByb2xlLnNjb3BlKSB8fCAnVXNlcnMnO1xuXHRcdFx0Y29uc3QgbW9kZWwgPSBSb2NrZXRDaGF0Lm1vZGVsc1tyb2xlU2NvcGVdO1xuXG5cdFx0XHRtb2RlbCAmJiBtb2RlbC5hZGRSb2xlc0J5VXNlcklkICYmIG1vZGVsLmFkZFJvbGVzQnlVc2VySWQodXNlcklkLCByb2xlTmFtZSwgc2NvcGUpO1xuXHRcdH1cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHJlbW92ZVVzZXJSb2xlcyh1c2VySWQsIHJvbGVzLCBzY29wZSkge1xuXHRcdHJvbGVzID0gW10uY29uY2F0KHJvbGVzKTtcblx0XHRmb3IgKGNvbnN0IHJvbGVOYW1lIG9mIHJvbGVzKSB7XG5cdFx0XHRjb25zdCByb2xlID0gdGhpcy5maW5kT25lKHJvbGVOYW1lKTtcblx0XHRcdGNvbnN0IHJvbGVTY29wZSA9IChyb2xlICYmIHJvbGUuc2NvcGUpIHx8ICdVc2Vycyc7XG5cdFx0XHRjb25zdCBtb2RlbCA9IFJvY2tldENoYXQubW9kZWxzW3JvbGVTY29wZV07XG5cblx0XHRcdG1vZGVsICYmIG1vZGVsLnJlbW92ZVJvbGVzQnlVc2VySWQgJiYgbW9kZWwucmVtb3ZlUm9sZXNCeVVzZXJJZCh1c2VySWQsIHJvbGVOYW1lLCBzY29wZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLlJvbGVzID0gbmV3IE1vZGVsUm9sZXMoJ3JvbGVzJyk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2UucHJvdG90eXBlLnJvbGVCYXNlUXVlcnkgPSBmdW5jdGlvbigvKiB1c2VySWQsIHNjb3BlKi8pIHtcblx0cmV0dXJuO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2UucHJvdG90eXBlLmZpbmRSb2xlc0J5VXNlcklkID0gZnVuY3Rpb24odXNlcklkLyogLCBvcHRpb25zKi8pIHtcblx0Y29uc3QgcXVlcnkgPSB0aGlzLnJvbGVCYXNlUXVlcnkodXNlcklkKTtcblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgeyBmaWVsZHM6IHsgcm9sZXM6IDEgfSB9KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLl9CYXNlLnByb3RvdHlwZS5pc1VzZXJJblJvbGUgPSBmdW5jdGlvbih1c2VySWQsIHJvbGVOYW1lLCBzY29wZSkge1xuXHRjb25zdCBxdWVyeSA9IHRoaXMucm9sZUJhc2VRdWVyeSh1c2VySWQsIHNjb3BlKTtcblxuXHRpZiAocXVlcnkgPT0gbnVsbCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHF1ZXJ5LnJvbGVzID0gcm9sZU5hbWU7XG5cdHJldHVybiAhXy5pc1VuZGVmaW5lZCh0aGlzLmZpbmRPbmUocXVlcnksIHsgZmllbGRzOiB7IHJvbGVzOiAxIH0gfSkpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2UucHJvdG90eXBlLmFkZFJvbGVzQnlVc2VySWQgPSBmdW5jdGlvbih1c2VySWQsIHJvbGVzLCBzY29wZSkge1xuXHRyb2xlcyA9IFtdLmNvbmNhdChyb2xlcyk7XG5cdGNvbnN0IHF1ZXJ5ID0gdGhpcy5yb2xlQmFzZVF1ZXJ5KHVzZXJJZCwgc2NvcGUpO1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JGFkZFRvU2V0OiB7XG5cdFx0XHRyb2xlczogeyAkZWFjaDogcm9sZXMgfSxcblx0XHR9LFxuXHR9O1xuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5fQmFzZS5wcm90b3R5cGUucmVtb3ZlUm9sZXNCeVVzZXJJZCA9IGZ1bmN0aW9uKHVzZXJJZCwgcm9sZXMsIHNjb3BlKSB7XG5cdHJvbGVzID0gW10uY29uY2F0KHJvbGVzKTtcblx0Y29uc3QgcXVlcnkgPSB0aGlzLnJvbGVCYXNlUXVlcnkodXNlcklkLCBzY29wZSk7XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkcHVsbEFsbDoge1xuXHRcdFx0cm9sZXMsXG5cdFx0fSxcblx0fTtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2UucHJvdG90eXBlLmZpbmRVc2Vyc0luUm9sZXMgPSBmdW5jdGlvbigpIHtcblx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignb3ZlcndyaXRlLWZ1bmN0aW9uJywgJ1lvdSBtdXN0IG92ZXJ3cml0ZSB0aGlzIGZ1bmN0aW9uIGluIHRoZSBleHRlbmRlZCBjbGFzc2VzJyk7XG59O1xuIiwiUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMucm9sZUJhc2VRdWVyeSA9IGZ1bmN0aW9uKHVzZXJJZCkge1xuXHRyZXR1cm4geyBfaWQ6IHVzZXJJZCB9O1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZFVzZXJzSW5Sb2xlcyA9IGZ1bmN0aW9uKHJvbGVzLCBzY29wZSwgb3B0aW9ucykge1xuXHRyb2xlcyA9IFtdLmNvbmNhdChyb2xlcyk7XG5cblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0cm9sZXM6IHsgJGluOiByb2xlcyB9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnksIG9wdGlvbnMpO1xufTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnJvbGVCYXNlUXVlcnkgPSBmdW5jdGlvbih1c2VySWQsIHNjb3BlKSB7XG5cdGlmIChzY29wZSA9PSBudWxsKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgcXVlcnkgPSB7ICd1Ll9pZCc6IHVzZXJJZCB9O1xuXHRpZiAoIV8uaXNVbmRlZmluZWQoc2NvcGUpKSB7XG5cdFx0cXVlcnkucmlkID0gc2NvcGU7XG5cdH1cblx0cmV0dXJuIHF1ZXJ5O1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kVXNlcnNJblJvbGVzID0gZnVuY3Rpb24ocm9sZXMsIHNjb3BlLCBvcHRpb25zKSB7XG5cdHJvbGVzID0gW10uY29uY2F0KHJvbGVzKTtcblxuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRyb2xlczogeyAkaW46IHJvbGVzIH0sXG5cdH07XG5cblx0aWYgKHNjb3BlKSB7XG5cdFx0cXVlcnkucmlkID0gc2NvcGU7XG5cdH1cblxuXHRjb25zdCBzdWJzY3JpcHRpb25zID0gdGhpcy5maW5kKHF1ZXJ5KS5mZXRjaCgpO1xuXG5cdGNvbnN0IHVzZXJzID0gXy5jb21wYWN0KF8ubWFwKHN1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uKHN1YnNjcmlwdGlvbikge1xuXHRcdGlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHN1YnNjcmlwdGlvbi51ICYmICd1bmRlZmluZWQnICE9PSB0eXBlb2Ygc3Vic2NyaXB0aW9uLnUuX2lkKSB7XG5cdFx0XHRyZXR1cm4gc3Vic2NyaXB0aW9uLnUuX2lkO1xuXHRcdH1cblx0fSkpO1xuXG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kKHsgX2lkOiB7ICRpbjogdXNlcnMgfSB9LCBvcHRpb25zKTtcbn07XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuUm9ja2V0Q2hhdC5hdXRoei5hZGRVc2VyUm9sZXMgPSBmdW5jdGlvbih1c2VySWQsIHJvbGVOYW1lcywgc2NvcGUpIHtcblx0aWYgKCF1c2VySWQgfHwgIXJvbGVOYW1lcykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5kYi5maW5kT25lQnlJZCh1c2VySWQpO1xuXHRpZiAoIXVzZXIpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LmF1dGh6LmFkZFVzZXJSb2xlcycsXG5cdFx0fSk7XG5cdH1cblxuXHRyb2xlTmFtZXMgPSBbXS5jb25jYXQocm9sZU5hbWVzKTtcblx0Y29uc3QgZXhpc3RpbmdSb2xlTmFtZXMgPSBfLnBsdWNrKFJvY2tldENoYXQuYXV0aHouZ2V0Um9sZXMoKSwgJ19pZCcpO1xuXHRjb25zdCBpbnZhbGlkUm9sZU5hbWVzID0gXy5kaWZmZXJlbmNlKHJvbGVOYW1lcywgZXhpc3RpbmdSb2xlTmFtZXMpO1xuXG5cdGlmICghXy5pc0VtcHR5KGludmFsaWRSb2xlTmFtZXMpKSB7XG5cdFx0Zm9yIChjb25zdCByb2xlIG9mIGludmFsaWRSb2xlTmFtZXMpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmNyZWF0ZU9yVXBkYXRlKHJvbGUpO1xuXHRcdH1cblx0fVxuXG5cdFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmFkZFVzZXJSb2xlcyh1c2VySWQsIHJvbGVOYW1lcywgc2NvcGUpO1xuXG5cdHJldHVybiB0cnVlO1xufTtcbiIsIi8qIGdsb2JhbHMgUm9ja2V0Q2hhdCAqL1xuUm9ja2V0Q2hhdC5hdXRoei5yb29tQWNjZXNzVmFsaWRhdG9ycyA9IFtcblx0ZnVuY3Rpb24ocm9vbSwgdXNlciA9IHt9KSB7XG5cdFx0aWYgKHJvb20gJiYgcm9vbS50ID09PSAnYycpIHtcblx0XHRcdGlmICghdXNlci5faWQgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX0FsbG93QW5vbnltb3VzUmVhZCcpID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXIuX2lkLCAndmlldy1jLXJvb20nKTtcblx0XHR9XG5cdH0sXG5cdGZ1bmN0aW9uKHJvb20sIHVzZXIgPSB7fSkge1xuXHRcdGlmICghcm9vbSB8fCAhdXNlcikge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCB1c2VyLl9pZCk7XG5cdFx0aWYgKHN1YnNjcmlwdGlvbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHN1YnNjcmlwdGlvbi5yaWQpO1xuXHRcdH1cblx0fSxcbl07XG5cblJvY2tldENoYXQuYXV0aHouY2FuQWNjZXNzUm9vbSA9IGZ1bmN0aW9uKHJvb20sIHVzZXIsIGV4dHJhRGF0YSkge1xuXHRyZXR1cm4gUm9ja2V0Q2hhdC5hdXRoei5yb29tQWNjZXNzVmFsaWRhdG9ycy5zb21lKCh2YWxpZGF0b3IpID0+IHZhbGlkYXRvci5jYWxsKHRoaXMsIHJvb20sIHVzZXIsIGV4dHJhRGF0YSkpO1xufTtcblxuUm9ja2V0Q2hhdC5hdXRoei5hZGRSb29tQWNjZXNzVmFsaWRhdG9yID0gZnVuY3Rpb24odmFsaWRhdG9yKSB7XG5cdFJvY2tldENoYXQuYXV0aHoucm9vbUFjY2Vzc1ZhbGlkYXRvcnMucHVzaCh2YWxpZGF0b3IpO1xufTtcbiIsIlJvY2tldENoYXQuYXV0aHouZ2V0Um9sZXMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmZpbmQoKS5mZXRjaCgpO1xufTtcbiIsIlJvY2tldENoYXQuYXV0aHouZ2V0VXNlcnNJblJvbGUgPSBmdW5jdGlvbihyb2xlTmFtZSwgc2NvcGUsIG9wdGlvbnMpIHtcblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmZpbmRVc2Vyc0luUm9sZShyb2xlTmFtZSwgc2NvcGUsIG9wdGlvbnMpO1xufTtcbiIsImZ1bmN0aW9uIGF0TGVhc3RPbmUodXNlcklkLCBwZXJtaXNzaW9ucyA9IFtdLCBzY29wZSkge1xuXHRyZXR1cm4gcGVybWlzc2lvbnMuc29tZSgocGVybWlzc2lvbklkKSA9PiB7XG5cdFx0Y29uc3QgcGVybWlzc2lvbiA9IFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmZpbmRPbmUocGVybWlzc2lvbklkKTtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuaXNVc2VySW5Sb2xlcyh1c2VySWQsIHBlcm1pc3Npb24ucm9sZXMsIHNjb3BlKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGFsbCh1c2VySWQsIHBlcm1pc3Npb25zID0gW10sIHNjb3BlKSB7XG5cdHJldHVybiBwZXJtaXNzaW9ucy5ldmVyeSgocGVybWlzc2lvbklkKSA9PiB7XG5cdFx0Y29uc3QgcGVybWlzc2lvbiA9IFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmZpbmRPbmUocGVybWlzc2lvbklkKTtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuaXNVc2VySW5Sb2xlcyh1c2VySWQsIHBlcm1pc3Npb24ucm9sZXMsIHNjb3BlKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGhhc1Blcm1pc3Npb24odXNlcklkLCBwZXJtaXNzaW9ucywgc2NvcGUsIHN0cmF0ZWd5KSB7XG5cdGlmICghdXNlcklkKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0cGVybWlzc2lvbnMgPSBbXS5jb25jYXQocGVybWlzc2lvbnMpO1xuXHRyZXR1cm4gc3RyYXRlZ3kodXNlcklkLCBwZXJtaXNzaW9ucywgc2NvcGUpO1xufVxuXG5Sb2NrZXRDaGF0LmF1dGh6Lmhhc0FsbFBlcm1pc3Npb24gPSBmdW5jdGlvbih1c2VySWQsIHBlcm1pc3Npb25zLCBzY29wZSkge1xuXHRyZXR1cm4gaGFzUGVybWlzc2lvbih1c2VySWQsIHBlcm1pc3Npb25zLCBzY29wZSwgYWxsKTtcbn07XG5cblJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbiA9IFJvY2tldENoYXQuYXV0aHouaGFzQWxsUGVybWlzc2lvbjtcblxuUm9ja2V0Q2hhdC5hdXRoei5oYXNBdExlYXN0T25lUGVybWlzc2lvbiA9IGZ1bmN0aW9uKHVzZXJJZCwgcGVybWlzc2lvbnMsIHNjb3BlKSB7XG5cdHJldHVybiBoYXNQZXJtaXNzaW9uKHVzZXJJZCwgcGVybWlzc2lvbnMsIHNjb3BlLCBhdExlYXN0T25lKTtcbn07XG4iLCJSb2NrZXRDaGF0LmF1dGh6Lmhhc1JvbGUgPSBmdW5jdGlvbih1c2VySWQsIHJvbGVOYW1lcywgc2NvcGUpIHtcblx0cm9sZU5hbWVzID0gW10uY29uY2F0KHJvbGVOYW1lcyk7XG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5pc1VzZXJJblJvbGVzKHVzZXJJZCwgcm9sZU5hbWVzLCBzY29wZSk7XG59O1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cblJvY2tldENoYXQuYXV0aHoucmVtb3ZlVXNlckZyb21Sb2xlcyA9IGZ1bmN0aW9uKHVzZXJJZCwgcm9sZU5hbWVzLCBzY29wZSkge1xuXHRpZiAoIXVzZXJJZCB8fCAhcm9sZU5hbWVzKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXJJZCk7XG5cblx0aWYgKCF1c2VyKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5hdXRoei5yZW1vdmVVc2VyRnJvbVJvbGVzJyxcblx0XHR9KTtcblx0fVxuXG5cdHJvbGVOYW1lcyA9IFtdLmNvbmNhdChyb2xlTmFtZXMpO1xuXHRjb25zdCBleGlzdGluZ1JvbGVOYW1lcyA9IF8ucGx1Y2soUm9ja2V0Q2hhdC5hdXRoei5nZXRSb2xlcygpLCAnX2lkJyk7XG5cdGNvbnN0IGludmFsaWRSb2xlTmFtZXMgPSBfLmRpZmZlcmVuY2Uocm9sZU5hbWVzLCBleGlzdGluZ1JvbGVOYW1lcyk7XG5cblx0aWYgKCFfLmlzRW1wdHkoaW52YWxpZFJvbGVOYW1lcykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvbGUnLCAnSW52YWxpZCByb2xlJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LmF1dGh6LnJlbW92ZVVzZXJGcm9tUm9sZXMnLFxuXHRcdH0pO1xuXHR9XG5cblx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMucmVtb3ZlVXNlclJvbGVzKHVzZXJJZCwgcm9sZU5hbWVzLCBzY29wZSk7XG5cblx0cmV0dXJuIHRydWU7XG59O1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQncGVybWlzc2lvbnMvZ2V0Jyh1cGRhdGVkQXQpIHtcblx0XHR0aGlzLnVuYmxvY2soKTtcblx0XHQvLyBUT0RPOiBzaG91bGQgd2UgcmV0dXJuIHRoaXMgZm9yIG5vbiBsb2dnZWQgdXNlcnM/XG5cdFx0Ly8gVE9ETzogd2UgY291bGQgY2FjaGUgdGhpcyBjb2xsZWN0aW9uXG5cblx0XHRjb25zdCByZWNvcmRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuZmluZCgpLmZldGNoKCk7XG5cblx0XHRpZiAodXBkYXRlZEF0IGluc3RhbmNlb2YgRGF0ZSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dXBkYXRlOiByZWNvcmRzLmZpbHRlcigocmVjb3JkKSA9PiByZWNvcmQuX3VwZGF0ZWRBdCA+IHVwZGF0ZWRBdCksXG5cdFx0XHRcdHJlbW92ZTogUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMudHJhc2hGaW5kRGVsZXRlZEFmdGVyKHVwZGF0ZWRBdCwge30sIHsgZmllbGRzOiB7IF9pZDogMSwgX2RlbGV0ZWRBdDogMSB9IH0pLmZldGNoKCksXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiByZWNvcmRzO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLm9uKCdjaGFuZ2UnLCAoeyBjbGllbnRBY3Rpb24sIGlkLCBkYXRhIH0pID0+IHtcblx0c3dpdGNoIChjbGllbnRBY3Rpb24pIHtcblx0XHRjYXNlICd1cGRhdGVkJzpcblx0XHRjYXNlICdpbnNlcnRlZCc6XG5cdFx0XHRkYXRhID0gZGF0YSB8fCBSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5maW5kT25lQnlJZChpZCk7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgJ3JlbW92ZWQnOlxuXHRcdFx0ZGF0YSA9IHsgX2lkOiBpZCB9O1xuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHRSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5TG9nZ2VkSW5UaGlzSW5zdGFuY2UoJ3Blcm1pc3Npb25zLWNoYW5nZWQnLCBjbGllbnRBY3Rpb24sIGRhdGEpO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgncm9sZXMnLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLnJlYWR5KCk7XG5cdH1cblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuZmluZCgpO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgndXNlcnNJblJvbGUnLCBmdW5jdGlvbihyb2xlTmFtZSwgc2NvcGUsIGxpbWl0ID0gNTApIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLnJlYWR5KCk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ2FjY2Vzcy1wZXJtaXNzaW9ucycpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7XG5cdFx0XHRwdWJsaXNoOiAndXNlcnNJblJvbGUnLFxuXHRcdH0pKTtcblx0fVxuXG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0bGltaXQsXG5cdFx0c29ydDoge1xuXHRcdFx0bmFtZTogMSxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiBSb2NrZXRDaGF0LmF1dGh6LmdldFVzZXJzSW5Sb2xlKHJvbGVOYW1lLCBzY29wZSwgb3B0aW9ucyk7XG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdhdXRob3JpemF0aW9uOmFkZFVzZXJUb1JvbGUnKHJvbGVOYW1lLCB1c2VybmFtZSwgc2NvcGUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ2FjY2Vzcy1wZXJtaXNzaW9ucycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnQWNjZXNzaW5nIHBlcm1pc3Npb25zIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOmFkZFVzZXJUb1JvbGUnLFxuXHRcdFx0XHRhY3Rpb246ICdBY2Nlc3NpbmdfcGVybWlzc2lvbnMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFyb2xlTmFtZSB8fCAhXy5pc1N0cmluZyhyb2xlTmFtZSkgfHwgIXVzZXJuYW1lIHx8ICFfLmlzU3RyaW5nKHVzZXJuYW1lKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1hcmd1bWVudHMnLCAnSW52YWxpZCBhcmd1bWVudHMnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246YWRkVXNlclRvUm9sZScsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAocm9sZU5hbWUgPT09ICdhZG1pbicgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdhc3NpZ24tYWRtaW4tcm9sZScpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnQXNzaWduaW5nIGFkbWluIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOmFkZFVzZXJUb1JvbGUnLFxuXHRcdFx0XHRhY3Rpb246ICdBc3NpZ25fYWRtaW4nLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHVzZXJuYW1lLCB7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0X2lkOiAxLFxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdGlmICghdXNlciB8fCAhdXNlci5faWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246YWRkVXNlclRvUm9sZScsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBhZGQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5hZGRVc2VyUm9sZXModXNlci5faWQsIHJvbGVOYW1lLCBzY29wZSk7XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VJX0Rpc3BsYXlSb2xlcycpKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5TG9nZ2VkKCdyb2xlcy1jaGFuZ2UnLCB7XG5cdFx0XHRcdHR5cGU6ICdhZGRlZCcsXG5cdFx0XHRcdF9pZDogcm9sZU5hbWUsXG5cdFx0XHRcdHU6IHtcblx0XHRcdFx0XHRfaWQ6IHVzZXIuX2lkLFxuXHRcdFx0XHRcdHVzZXJuYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzY29wZSxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBhZGQ7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2F1dGhvcml6YXRpb246ZGVsZXRlUm9sZScocm9sZU5hbWUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ2FjY2Vzcy1wZXJtaXNzaW9ucycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnQWNjZXNzaW5nIHBlcm1pc3Npb25zIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOmRlbGV0ZVJvbGUnLFxuXHRcdFx0XHRhY3Rpb246ICdBY2Nlc3NpbmdfcGVybWlzc2lvbnMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9sZSA9IFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmZpbmRPbmUocm9sZU5hbWUpO1xuXHRcdGlmICghcm9sZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb2xlJywgJ0ludmFsaWQgcm9sZScsIHtcblx0XHRcdFx0bWV0aG9kOiAnYXV0aG9yaXphdGlvbjpkZWxldGVSb2xlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmIChyb2xlLnByb3RlY3RlZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItZGVsZXRlLXByb3RlY3RlZC1yb2xlJywgJ0Nhbm5vdCBkZWxldGUgYSBwcm90ZWN0ZWQgcm9sZScsIHtcblx0XHRcdFx0bWV0aG9kOiAnYXV0aG9yaXphdGlvbjpkZWxldGVSb2xlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvbGVTY29wZSA9IHJvbGUuc2NvcGUgfHwgJ1VzZXJzJztcblx0XHRjb25zdCBtb2RlbCA9IFJvY2tldENoYXQubW9kZWxzW3JvbGVTY29wZV07XG5cdFx0Y29uc3QgZXhpc3RpbmdVc2VycyA9IG1vZGVsICYmIG1vZGVsLmZpbmRVc2Vyc0luUm9sZXMgJiYgbW9kZWwuZmluZFVzZXJzSW5Sb2xlcyhyb2xlTmFtZSk7XG5cblx0XHRpZiAoZXhpc3RpbmdVc2VycyAmJiBleGlzdGluZ1VzZXJzLmNvdW50KCkgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb2xlLWluLXVzZScsICdDYW5ub3QgZGVsZXRlIHJvbGUgYmVjYXVzZSBpdFxcJ3MgaW4gdXNlJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOmRlbGV0ZVJvbGUnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvbGVzLnJlbW92ZShyb2xlLm5hbWUpO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnYXV0aG9yaXphdGlvbjpyZW1vdmVVc2VyRnJvbVJvbGUnKHJvbGVOYW1lLCB1c2VybmFtZSwgc2NvcGUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ2FjY2Vzcy1wZXJtaXNzaW9ucycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnQWNjZXNzIHBlcm1pc3Npb25zIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOnJlbW92ZVVzZXJGcm9tUm9sZScsXG5cdFx0XHRcdGFjdGlvbjogJ0FjY2Vzc2luZ19wZXJtaXNzaW9ucycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAoIXJvbGVOYW1lIHx8ICFfLmlzU3RyaW5nKHJvbGVOYW1lKSB8fCAhdXNlcm5hbWUgfHwgIV8uaXNTdHJpbmcodXNlcm5hbWUpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWFyZ3VtZW50cycsICdJbnZhbGlkIGFyZ3VtZW50cycsIHtcblx0XHRcdFx0bWV0aG9kOiAnYXV0aG9yaXphdGlvbjpyZW1vdmVVc2VyRnJvbVJvbGUnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHtcblx0XHRcdHVzZXJuYW1lLFxuXHRcdH0sIHtcblx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHRfaWQ6IDEsXG5cdFx0XHRcdHJvbGVzOiAxLFxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdGlmICghdXNlciB8fCAhdXNlci5faWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246cmVtb3ZlVXNlckZyb21Sb2xlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIHByZXZlbnQgcmVtb3ZpbmcgbGFzdCB1c2VyIGZyb20gYWRtaW4gcm9sZVxuXHRcdGlmIChyb2xlTmFtZSA9PT0gJ2FkbWluJykge1xuXHRcdFx0Y29uc3QgYWRtaW5Db3VudCA9IE1ldGVvci51c2Vycy5maW5kKHtcblx0XHRcdFx0cm9sZXM6IHtcblx0XHRcdFx0XHQkaW46IFsnYWRtaW4nXSxcblx0XHRcdFx0fSxcblx0XHRcdH0pLmNvdW50KCk7XG5cblx0XHRcdGNvbnN0IHVzZXJJc0FkbWluID0gdXNlci5yb2xlcy5pbmRleE9mKCdhZG1pbicpID4gLTE7XG5cdFx0XHRpZiAoYWRtaW5Db3VudCA9PT0gMSAmJiB1c2VySXNBZG1pbikge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnTGVhdmluZyB0aGUgYXBwIHdpdGhvdXQgYWRtaW5zIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3JlbW92ZVVzZXJGcm9tUm9sZScsXG5cdFx0XHRcdFx0YWN0aW9uOiAnUmVtb3ZlX2xhc3RfYWRtaW4nLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCByZW1vdmUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5yZW1vdmVVc2VyUm9sZXModXNlci5faWQsIHJvbGVOYW1lLCBzY29wZSk7XG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdVSV9EaXNwbGF5Um9sZXMnKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeUxvZ2dlZCgncm9sZXMtY2hhbmdlJywge1xuXHRcdFx0XHR0eXBlOiAncmVtb3ZlZCcsXG5cdFx0XHRcdF9pZDogcm9sZU5hbWUsXG5cdFx0XHRcdHU6IHtcblx0XHRcdFx0XHRfaWQ6IHVzZXIuX2lkLFxuXHRcdFx0XHRcdHVzZXJuYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzY29wZSxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiByZW1vdmU7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2F1dGhvcml6YXRpb246c2F2ZVJvbGUnKHJvbGVEYXRhKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdhY2Nlc3MtcGVybWlzc2lvbnMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0FjY2Vzc2luZyBwZXJtaXNzaW9ucyBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnYXV0aG9yaXphdGlvbjpzYXZlUm9sZScsXG5cdFx0XHRcdGFjdGlvbjogJ0FjY2Vzc2luZ19wZXJtaXNzaW9ucycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAoIXJvbGVEYXRhLm5hbWUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvbGUtbmFtZS1yZXF1aXJlZCcsICdSb2xlIG5hbWUgaXMgcmVxdWlyZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246c2F2ZVJvbGUnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKFsnVXNlcnMnLCAnU3Vic2NyaXB0aW9ucyddLmluY2x1ZGVzKHJvbGVEYXRhLnNjb3BlKSA9PT0gZmFsc2UpIHtcblx0XHRcdHJvbGVEYXRhLnNjb3BlID0gJ1VzZXJzJztcblx0XHR9XG5cblx0XHRjb25zdCB1cGRhdGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5jcmVhdGVPclVwZGF0ZShyb2xlRGF0YS5uYW1lLCByb2xlRGF0YS5zY29wZSwgcm9sZURhdGEuZGVzY3JpcHRpb24pO1xuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnVUlfRGlzcGxheVJvbGVzJykpIHtcblx0XHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlMb2dnZWQoJ3JvbGVzLWNoYW5nZScsIHtcblx0XHRcdFx0dHlwZTogJ2NoYW5nZWQnLFxuXHRcdFx0XHRfaWQ6IHJvbGVEYXRhLm5hbWUsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdXBkYXRlO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdhdXRob3JpemF0aW9uOmFkZFBlcm1pc3Npb25Ub1JvbGUnKHBlcm1pc3Npb24sIHJvbGUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ2FjY2Vzcy1wZXJtaXNzaW9ucycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnQWRkaW5nIHBlcm1pc3Npb24gaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246YWRkUGVybWlzc2lvblRvUm9sZScsXG5cdFx0XHRcdGFjdGlvbjogJ0FkZGluZ19wZXJtaXNzaW9uJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5hZGRSb2xlKHBlcm1pc3Npb24sIHJvbGUpO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdhdXRob3JpemF0aW9uOnJlbW92ZVJvbGVGcm9tUGVybWlzc2lvbicocGVybWlzc2lvbiwgcm9sZSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnYWNjZXNzLXBlcm1pc3Npb25zJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdBY2Nlc3NpbmcgcGVybWlzc2lvbnMgaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246cmVtb3ZlUm9sZUZyb21QZXJtaXNzaW9uJyxcblx0XHRcdFx0YWN0aW9uOiAnQWNjZXNzaW5nX3Blcm1pc3Npb25zJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5yZW1vdmVSb2xlKHBlcm1pc3Npb24sIHJvbGUpO1xuXHR9LFxufSk7XG4iLCIvKiBlc2xpbnQgbm8tbXVsdGktc3BhY2VzOiAwICovXG5cbk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHQvLyBOb3RlOlxuXHQvLyAxLmlmIHdlIG5lZWQgdG8gY3JlYXRlIGEgcm9sZSB0aGF0IGNhbiBvbmx5IGVkaXQgY2hhbm5lbCBtZXNzYWdlLCBidXQgbm90IGVkaXQgZ3JvdXAgbWVzc2FnZVxuXHQvLyB0aGVuIHdlIGNhbiBkZWZpbmUgZWRpdC08dHlwZT4tbWVzc2FnZSBpbnN0ZWFkIG9mIGVkaXQtbWVzc2FnZVxuXHQvLyAyLiBhZG1pbiwgbW9kZXJhdG9yLCBhbmQgdXNlciByb2xlcyBzaG91bGQgbm90IGJlIGRlbGV0ZWQgYXMgdGhleSBhcmUgcmVmZXJlbmVkIGluIHRoZSBjb2RlLlxuXHRjb25zdCBwZXJtaXNzaW9ucyA9IFtcblx0XHR7IF9pZDogJ2FjY2Vzcy1wZXJtaXNzaW9ucycsICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ2FkZC1vYXV0aC1zZXJ2aWNlJywgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ2FkZC11c2VyLXRvLWpvaW5lZC1yb29tJywgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvciddIH0sXG5cdFx0eyBfaWQ6ICdhZGQtdXNlci10by1hbnktYy1yb29tJywgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdhZGQtdXNlci10by1hbnktcC1yb29tJywgICAgICAgIHJvbGVzIDogW10gfSxcblx0XHR7IF9pZDogJ2FyY2hpdmUtcm9vbScsICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJ10gfSxcblx0XHR7IF9pZDogJ2Fzc2lnbi1hZG1pbi1yb2xlJywgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ2Jhbi11c2VyJywgICAgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvciddIH0sXG5cdFx0eyBfaWQ6ICdidWxrLWNyZWF0ZS1jJywgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdidWxrLXJlZ2lzdGVyLXVzZXInLCAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdjcmVhdGUtYycsICAgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICd1c2VyJywgJ2JvdCddIH0sXG5cdFx0eyBfaWQ6ICdjcmVhdGUtZCcsICAgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICd1c2VyJywgJ2JvdCddIH0sXG5cdFx0eyBfaWQ6ICdjcmVhdGUtcCcsICAgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICd1c2VyJywgJ2JvdCddIH0sXG5cdFx0eyBfaWQ6ICdjcmVhdGUtdXNlcicsICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdjbGVhbi1jaGFubmVsLWhpc3RvcnknLCAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdkZWxldGUtYycsICAgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lciddIH0sXG5cdFx0eyBfaWQ6ICdkZWxldGUtZCcsICAgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdkZWxldGUtbWVzc2FnZScsICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lcicsICdtb2RlcmF0b3InXSB9LFxuXHRcdHsgX2lkOiAnZGVsZXRlLXAnLCAgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInXSB9LFxuXHRcdHsgX2lkOiAnZGVsZXRlLXVzZXInLCAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnZWRpdC1tZXNzYWdlJywgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInLCAnbW9kZXJhdG9yJ10gfSxcblx0XHR7IF9pZDogJ2VkaXQtb3RoZXItdXNlci1hY3RpdmUtc3RhdHVzJywgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ2VkaXQtb3RoZXItdXNlci1pbmZvJywgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ2VkaXQtb3RoZXItdXNlci1wYXNzd29yZCcsICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ2VkaXQtcHJpdmlsZWdlZC1zZXR0aW5nJywgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ2VkaXQtcm9vbScsICAgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvciddIH0sXG5cdFx0eyBfaWQ6ICdlZGl0LXJvb20tcmV0ZW50aW9uLXBvbGljeScsICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdmb3JjZS1kZWxldGUtbWVzc2FnZScsICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lciddIH0sXG5cdFx0eyBfaWQ6ICdqb2luLXdpdGhvdXQtam9pbi1jb2RlJywgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdib3QnXSB9LFxuXHRcdHsgX2lkOiAnbGVhdmUtYycsICAgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAndXNlcicsICdib3QnLCAnYW5vbnltb3VzJ10gfSxcblx0XHR7IF9pZDogJ2xlYXZlLXAnLCAgICAgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ3VzZXInLCAnYm90JywgJ2Fub255bW91cyddIH0sXG5cdFx0eyBfaWQ6ICdtYW5hZ2UtYXNzZXRzJywgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdtYW5hZ2UtZW1vamknLCAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdtYW5hZ2UtaW50ZWdyYXRpb25zJywgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdtYW5hZ2Utb3duLWludGVncmF0aW9ucycsICAgICAgIHJvbGVzIDogWydhZG1pbicsICdib3QnXSB9LFxuXHRcdHsgX2lkOiAnbWFuYWdlLW9hdXRoLWFwcHMnLCAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnbWVudGlvbi1hbGwnLCAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInLCAnbW9kZXJhdG9yJywgJ3VzZXInXSB9LFxuXHRcdHsgX2lkOiAnbWVudGlvbi1oZXJlJywgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInLCAnbW9kZXJhdG9yJywgJ3VzZXInXSB9LFxuXHRcdHsgX2lkOiAnbXV0ZS11c2VyJywgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInLCAnbW9kZXJhdG9yJ10gfSxcblx0XHR7IF9pZDogJ3JlbW92ZS11c2VyJywgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvciddIH0sXG5cdFx0eyBfaWQ6ICdydW4taW1wb3J0JywgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdydW4tbWlncmF0aW9uJywgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdzZXQtbW9kZXJhdG9yJywgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lciddIH0sXG5cdFx0eyBfaWQ6ICdzZXQtb3duZXInLCAgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lciddIH0sXG5cdFx0eyBfaWQ6ICdzZW5kLW1hbnktbWVzc2FnZXMnLCAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdib3QnXSB9LFxuXHRcdHsgX2lkOiAnc2V0LWxlYWRlcicsICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInXSB9LFxuXHRcdHsgX2lkOiAndW5hcmNoaXZlLXJvb20nLCAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAndmlldy1jLXJvb20nLCAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAndXNlcicsICdib3QnLCAnYW5vbnltb3VzJ10gfSxcblx0XHR7IF9pZDogJ3VzZXItZ2VuZXJhdGUtYWNjZXNzLXRva2VuJywgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctZC1yb29tJywgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ3VzZXInLCAnYm90J10gfSxcblx0XHR7IF9pZDogJ3ZpZXctZnVsbC1vdGhlci11c2VyLWluZm8nLCAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctaGlzdG9yeScsICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ3VzZXInLCAnYW5vbnltb3VzJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctam9pbmVkLXJvb20nLCAgICAgICAgICAgICAgcm9sZXMgOiBbJ2d1ZXN0JywgJ2JvdCcsICdhbm9ueW1vdXMnXSB9LFxuXHRcdHsgX2lkOiAndmlldy1qb2luLWNvZGUnLCAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAndmlldy1sb2dzJywgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAndmlldy1vdGhlci11c2VyLWNoYW5uZWxzJywgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAndmlldy1wLXJvb20nLCAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAndXNlcicsICdhbm9ueW1vdXMnXSB9LFxuXHRcdHsgX2lkOiAndmlldy1wcml2aWxlZ2VkLXNldHRpbmcnLCAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJywgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAndmlldy1zdGF0aXN0aWNzJywgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAndmlldy11c2VyLWFkbWluaXN0cmF0aW9uJywgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAncHJldmlldy1jLXJvb20nLCAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAndXNlcicsICdhbm9ueW1vdXMnXSB9LFxuXHRcdHsgX2lkOiAndmlldy1vdXRzaWRlLXJvb20nLCAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInLCAnbW9kZXJhdG9yJywgJ3VzZXInXSB9LFxuXHRcdHsgX2lkOiAndmlldy1icm9hZGNhc3QtbWVtYmVyLWxpc3QnLCAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInLCAnbW9kZXJhdG9yJ10gfSxcblx0XHR7IF9pZDogJ2NhbGwtbWFuYWdlbWVudCcsICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvciddIH0sXG5cdF07XG5cblx0Zm9yIChjb25zdCBwZXJtaXNzaW9uIG9mIHBlcm1pc3Npb25zKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5maW5kT25lQnlJZChwZXJtaXNzaW9uLl9pZCkpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLnVwc2VydChwZXJtaXNzaW9uLl9pZCwgeyAkc2V0OiBwZXJtaXNzaW9uIH0pO1xuXHRcdH1cblx0fVxuXG5cdGNvbnN0IGRlZmF1bHRSb2xlcyA9IFtcblx0XHR7IG5hbWU6ICdhZG1pbicsICAgICBzY29wZTogJ1VzZXJzJywgICAgICAgICBkZXNjcmlwdGlvbjogJ0FkbWluJyB9LFxuXHRcdHsgbmFtZTogJ21vZGVyYXRvcicsIHNjb3BlOiAnU3Vic2NyaXB0aW9ucycsIGRlc2NyaXB0aW9uOiAnTW9kZXJhdG9yJyB9LFxuXHRcdHsgbmFtZTogJ2xlYWRlcicsICAgIHNjb3BlOiAnU3Vic2NyaXB0aW9ucycsIGRlc2NyaXB0aW9uOiAnTGVhZGVyJyB9LFxuXHRcdHsgbmFtZTogJ293bmVyJywgICAgIHNjb3BlOiAnU3Vic2NyaXB0aW9ucycsIGRlc2NyaXB0aW9uOiAnT3duZXInIH0sXG5cdFx0eyBuYW1lOiAndXNlcicsICAgICAgc2NvcGU6ICdVc2VycycsICAgICAgICAgZGVzY3JpcHRpb246ICcnIH0sXG5cdFx0eyBuYW1lOiAnYm90JywgICAgICAgc2NvcGU6ICdVc2VycycsICAgICAgICAgZGVzY3JpcHRpb246ICcnIH0sXG5cdFx0eyBuYW1lOiAnZ3Vlc3QnLCAgICAgc2NvcGU6ICdVc2VycycsICAgICAgICAgZGVzY3JpcHRpb246ICcnIH0sXG5cdFx0eyBuYW1lOiAnYW5vbnltb3VzJywgc2NvcGU6ICdVc2VycycsICAgICAgICAgZGVzY3JpcHRpb246ICcnIH0sXG5cdF07XG5cblx0Zm9yIChjb25zdCByb2xlIG9mIGRlZmF1bHRSb2xlcykge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvbGVzLnVwc2VydCh7IF9pZDogcm9sZS5uYW1lIH0sIHsgJHNldE9uSW5zZXJ0OiB7IHNjb3BlOiByb2xlLnNjb3BlLCBkZXNjcmlwdGlvbjogcm9sZS5kZXNjcmlwdGlvbiB8fCAnJywgcHJvdGVjdGVkOiB0cnVlIH0gfSk7XG5cdH1cbn0pO1xuIl19
