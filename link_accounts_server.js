Accounts.registerLoginHandler(function (options) {
  if (!options.link)
    return undefined;

  check(options.link, {
    credentialToken: String,
    // When an error occurs while retrieving the access token, we store
    // the error in the pending credentials table, with a secret of
    // null. The client can call the login method with a secret of null
    // to retrieve the error.
    credentialSecret: Match.OneOf(null, String)
  });

  var result = OAuth.retrieveCredential(options.link.credentialToken,
                                        options.link.credentialSecret);
  if (!result) {
    return { type: "link",
             error: new Meteor.Error(
               Accounts.LoginCancelledError.numericError,
               "No matching link attempt found") };
  }

  if (result instanceof Error)
    throw result;
  else
    return Accounts.LinkUserFromExternalService(
      result.serviceName, result.serviceData, result.options);
});

Accounts.LinkUserFromExternalService = function (serviceName, serviceData, options) {
  options = _.clone(options || {});

  //We probably throw an error instead of call update or create here.
  if (!Meteor.userId())
    return new Error("Can't use LinkUserFromExternalService without current user");

  if (serviceName === "password" || serviceName === "resume")
    throw new Error(
      "Can't use LinkUserFromExternalService with internal service "
        + serviceName);
  if (!_.has(serviceData, 'id'))
    throw new Error(
      "Service data for service " + serviceName + " must include id");

  var user = Meteor.user();

  if (!user) {
    return new Error('User not found for LinkUserFromExternalService.');
  }

  //we do not allow link another account from existing service.
  if (user.services && user.services[serviceName] &&
      user.services[serviceName].id !== serviceData.id) {

    return new Meteor.Error('User can not link a service that is already actived.');
  } else {
    var setAttrs = {};
    _.each(serviceData, function(value, key) {
      setAttrs["services." + serviceName + "." + key] = value;
    });

    Meteor.users.update(user._id, {$set: setAttrs});
    return {
      type: serviceName,
      userId: user._id
    };
  }
};

Meteor.methods({
  '_accounts/unlink/service': function (service, userId) {
    var user = Meteor.users.findOne({_id: userId});

    if (user.services[service]) {
    } else {
      throw new Meteor.Error(500, 'no service');
    }
  }
});
