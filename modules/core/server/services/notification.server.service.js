'use strict';

/** *
Encapsulates system notifications
***/
var nodemailer = require('nodemailer');
var sesTransport = require('nodemailer-ses-transport');
var path = require('path'),
  config = require(path.resolve('./config/config')),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));


var transport = nodemailer.createTransport(sesTransport(config.mailer.sesTransportOptions));


exports.sendNotification = function(notification, callback) {
  transport.sendMail(notification, function(error, response) {
    callback(error, response);
  });
};
