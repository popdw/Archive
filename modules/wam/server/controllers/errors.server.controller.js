'use strict';

var _ = require('underscore');

/**
 * Get unique error field name
 */
var getUniqueErrorMessage = function (err) {
  var output;

  try {
    var begin = 0;
    if (err.errmsg.lastIndexOf('.$') !== -1) {
      // support mongodb <= 3.0 (default: MMapv1 engine)
      // "errmsg" : "E11000 duplicate key error index: mean-dev.users.$email_1 dup key: { : \"test@user.com\" }"
      begin = err.errmsg.lastIndexOf('.$') + 2;
    } else {
      // support mongodb >= 3.2 (default: WiredTiger engine)
      // "errmsg" : "E11000 duplicate key error collection: mean-dev.users index: email_1 dup key: { : \"test@user.com\" }"
      begin = err.errmsg.lastIndexOf('index: ') + 7;
    }
    var fieldName = err.errmsg.substring(begin, err.errmsg.lastIndexOf('_1'));
    output = fieldName.charAt(0).toUpperCase() + fieldName.slice(1) + ' already exists';

  } catch (ex) {
    output = 'Unique field already exists';
  }

  return output;
};

exports.getParamErrors = function(errors) {
  return _.map(errors, function (error) {
    return {
      code: '',
      message: error.msg,
      fields: error.param
    };
  });
};

exports.getSuccesfulGeneral = function(code, message, fields) {
  return {
    code: code,
    message: message,
    fields: fields
  };
};

exports.getGeneralErrors = function(errors) {
  return {
    code: '',
    message: errors,
    fields: ''
  };
};

exports.getNotImplementedError = function() {
  return {
    code: '',
    message: 'Service not yet Implemented',
    fields: 'N/A'
  };
};

exports.createNotFoundError = function(message) {
  return {
    code: 404,
    message: message,
    fields: 'N/A'
  };
};

/**
 * Get the error message from error object
 */
exports.getErrorMessage = function (err) {
  var message = '';

  if (err.code) {
    switch (err.code) {
      case 11000:
      case 11001:
        message = getUniqueErrorMessage(err);
        break;
      default:
        message = 'Something went wrong';
    }
  } else {
    for (var errName in err.errors) {
      if (err.errors[errName].message) {
        message = err.errors[errName].message;
      }
    }
  }

  return message;
};