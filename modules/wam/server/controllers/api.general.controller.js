'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  util = require('util'),
  elasticsearch = require('elasticsearch'),
  mongoose = require('mongoose'),
  _ = require('underscore'),
  errorHandler = require(path.resolve('./modules/wam/server/controllers/errors.server.controller')),
  nodeGeocoder = require('node-geocoder'),
  common = require('./common'),
  notificationService = require(path.resolve('./modules/core/server/services/notification.server.service')),
  config = require(path.resolve('./config/config'));

var RateShare = mongoose.model('RateShare');
var PractitionerInvite = mongoose.model('PractitionerInvite');

// TODO: create this object via config
var getClient = function () {
  return new elasticsearch.Client(config.elasticSearch.server());
};

var getGeocoder = function () {
  return nodeGeocoder({
    provider: 'google',
    httpAdapter: 'https',
    apiKey: 'AIzaSyCkpWfrj1h7z5oNbZQgLXJ0pcIxcZNP3Jk',
    formatter: null
  });
};

/* eslint no-extend-native: [2, { "exceptions": ["Number"] }] */
if (typeof(Number.prototype.toRad) === 'undefined') {
  Number.prototype.toRad = function () {
    return this * Math.PI / 180;
  };
}

// TODO: minor tweaks
exports.QuestionsSearchGet = function (req, res) {
  req.check('eoc_code', 'Missing EOC Code').notEmpty();
  req.check('place_of_service_id', 'Missing EOC Code').notEmpty();
  req.check('practitioner_id', 'Missing EOC Code').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var eocCode = req.params.eoc_code,
    placeOfServiceId = req.params.place_of_service_id,
    practitionerId = req.params.practitioner_id;

  var client = getClient();

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.questionsToAsk,
    query: {
      match: {
        eoc_code: eocCode
      }
    }
  }).then(function (source) {
    var questions = _.pluck(source.hits.hits, '_source');

    return res.json(questions);
  }, function (error) {
    res.status(500).send(error);
  });
};

// Location Services
exports.LocationSearchGet = function (req, res) {
  req.check('q', 'Missing required field "q"').notEmpty();
  req.check('count', 'Invalid Count given.').optional().isNumeric();
  req.assert('q', '3 characters are required.').len(3, 50);

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var q = req.param('q');
  var count = req.param('count', 20);
  var geocoder = getGeocoder();

  geocoder.geocode({
    address: q,
    limit: count
  })
    .then(function (data) {
      if (data.length) {
        var results = [];
        for (var i = 0; i < count; i++) {
          var loc = {};
          var elem = data[i];
          loc.location_id = elem.extra.googlePlaceId;
          loc.location_name = elem.formattedAddress;
          loc.location_lat = elem.latitude;
          loc.location_long = elem.longitude;
          results.push(loc);
        }
        return res.json(results);
      } else {
        return res.status(404).end();
      }
    })
    .catch(function (err) { // TODO: node-geocoder does not return google errors, simply bubbles them up
      return res.json({});
    });
};

exports.ReverseGeocode = function (req, res) {
  req.check('lat', 'Missing required field "lat"').notEmpty();
  req.check('lng', 'Missing required field "lng"').notEmpty();
  req.check('lat', 'Invalid parameter, "lat" must be a Number').isFloat();
  req.check('lng', 'Invalid parameter, "lng" must be a Number').isFloat();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var lat = req.param('lat'),
    lng = req.param('lng'),
    geocoder = getGeocoder();

  geocoder.reverse({
    lat: parseFloat(lat),
    lon: parseFloat(lng)
  }).then(function (results) {
    if (results) {
      var location = results[0]; // Choose best-match
      res.json({
        location_id: location.extra.googlePlaceId, // Use google's location ID's
        location_name: location.formattedAddress,
        location_lat: location.latitude,
        location_lng: location.longitude
      });
    }
  })
    .catch(function (err) { // TODO: node-geocoder does not return google errors, simply bubbles them up
      return res.json({});
    });
};

exports.shareRatesViaEmail = function (req, res) {

  req.checkBody('costOfCareInfo', 'Missing CoC Info').notEmpty();
  req.checkBody('costOfCareInfo.practitionerId', 'Missing practitionerId').notEmpty();
  req.checkBody('costOfCareInfo.placeOfServiceId', 'Missing Place of Service ID').notEmpty();
  req.checkBody('costOfCareInfo.eoc', 'Missing EOC').notEmpty();
  req.checkBody('inviteInfo', 'Missing Recipient Info').notEmpty();
  req.checkBody('inviteInfo.from', 'Missing from name').notEmpty();
  req.checkBody('inviteInfo.recipient', 'Missing recipient Name').notEmpty();
  req.checkBody('inviteInfo.recipientAddress', 'Missing recipient Address').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var cocInfo = req.body.costOfCareInfo;
  var inviteInfo = req.body.inviteInfo;
  console.log(cocInfo);
  console.log(inviteInfo);
 
  //var eoc = pathParts[1],       placeOfCare = pathParts[2],       practitioner = pathParts[3];
  //http://uat.healthcost.com/details/7763e057-9581-438f-96e8-f96a3032ef0a/17923161-ff92-48f9-836a-f341b416a9bb/16b9ca59-c403-4807-9b11-4eb9c3414d1a
  var url = [config.app.websiteUrl, 'details', cocInfo.eoc, cocInfo.placeOfServiceId, cocInfo.practitionerId].join('/');
 

  res.render(path.resolve('modules/wam/server/templates/share-email'), {
    fromName: inviteInfo.from.trim(),
    toName: inviteInfo.recipient.trim(),
    appName: config.app.title,
    url: url
  }, function (err, emailHTML) {
    console.log('send email');
    var mailOptions = {
      to: inviteInfo.recipient.trim() + ' <' + inviteInfo.recipientAddress.trim() + '>',
      from: inviteInfo.from.trim() + ' <' + config.mailer.from + '>',
      subject: inviteInfo.from.trim() + ' has shared a HealthCost rate with you',
      html: emailHTML
    };
    notificationService.sendNotification(mailOptions, function (err) {
      if (!err) {
        console.log('rate shared');
        var logObj = {};
        logObj.type = 'Email';
        logObj.session_key = req.sessionID;
        logObj.eoc_code = cocInfo.eoc;
        logObj.place_of_service_id = cocInfo.placeOfServiceId;
        logObj.practitioner_id = cocInfo.practitionerId;
        logObj.from_name = inviteInfo.from.trim();
        logObj.recipient_name = inviteInfo.recipient.trim();
        logObj.recipient_email = inviteInfo.recipientAddress.trim();
        var rs = new RateShare(logObj);
        rs.save(logObj, function (err, result) {
          if (!err) {
            return res.status(200).json({
              message: 'Your rate has been shared with ' + inviteInfo.recipient.trim()
            });
          } else {
            return res.status(500).json(err);
          }

        });

      } else {
        console.log(err);
        return res.status(500).send([{
          message: 'Failure sending email'
        }]);
      }
    });
  });
};

exports.inviteViaEmail = function (req, res) {

  req.checkBody('costOfCareInfo', 'Missing CoC Info').notEmpty();
  req.checkBody('costOfCareInfo.practitionerId', 'Missing practitionerId').notEmpty();
  req.checkBody('costOfCareInfo.placeOfServiceId', 'Missing Place of Service ID').notEmpty();
  req.checkBody('costOfCareInfo.eoc', 'Missing EOC').notEmpty();
  req.checkBody('inviteInfo', 'Missing invite Info').notEmpty();
  req.checkBody('inviteInfo.invitedBy', 'Missing invited by').notEmpty();
  req.checkBody('inviteInfo.practitionerName', 'Missing Practitioner Name').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var cocInfo = req.body.costOfCareInfo;
  var inviteInfo = req.body.inviteInfo;
  var toAddress = inviteInfo.practitionerEmail ? inviteInfo.practitionerEmail.trim() : 'Questions@HealthCost.com';

  console.log(cocInfo);
  console.log(inviteInfo);

  res.render(path.resolve('modules/wam/server/templates/invite-email'), {
    toName: inviteInfo.practitionerName.trim(),
    fromName: inviteInfo.invitedBy.trim(),
    appName: config.app.title,
    url: config.app.websiteUrl
  }, function (err, emailHTML) {
    console.log('send email');
    var mailOptions = {
      to: inviteInfo.practitionerName.trim() + ' <' + toAddress + '>',
      from: inviteInfo.invitedBy.trim() + ' <' + config.mailer.from + '>',
      subject: 'Invite to the HealthCost Network',
      html: emailHTML
    };
    notificationService.sendNotification(mailOptions, function (err) {
      if (!err) {
        console.log('invite sent');
        var logObj = {};
        logObj.session_key = req.sessionID;
        logObj.eoc_code = cocInfo.eoc;
        logObj.place_of_service_id = cocInfo.placeOfServiceId;
        logObj.practitioner_id = cocInfo.practitionerId;
        logObj.invited_by = inviteInfo.invitedBy.trim();
        logObj.practitioner_name = inviteInfo.practitionerName.trim();
        logObj.practitioner_email = toAddress;
        var pi = new PractitionerInvite(logObj);
        pi.save(logObj, function (err, result) {
          if (!err) {
            return res.status(200).json({
              message: 'Your Doctor has been invited to join HealthCost via email'
            });
          } else {
            return res.status(500).json(err);
          }
        });
      } else {
        console.log(err);
        return res.status(500).send([{
          message: 'Failure sending email'
        }]);
      }
    });
  });
};
