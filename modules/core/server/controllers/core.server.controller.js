'use strict';

var validator = require('validator');

function getResponseParams(req) {
  var MobileDetect = new (require('mobile-detect'))(req.headers['user-agent']);
  var isMobile = !!MobileDetect.mobile();

  return {
    isMobile: isMobile
  };
}

/**
 * Render the main application page
 */
exports.renderIndex = function (req, res) {

  var safeUserObject = null;
  if (req.user) {
    safeUserObject = {
      displayName: validator.escape(req.user.displayName),
      provider: validator.escape(req.user.provider),
      username: validator.escape(req.user.username),
      created: req.user.created.toString(),
      roles: req.user.roles,
      profileImageURL: req.user.profileImageURL,
      email: validator.escape(req.user.email),
      lastName: validator.escape(req.user.lastName),
      firstName: validator.escape(req.user.firstName),
      additionalProvidersData: req.user.additionalProvidersData
    };
  }

  res.render('modules/core/server/views/index', Object.assign(getResponseParams(req), {
    user: safeUserObject,
    isHomepage: true
  }));
};

exports.renderContact = function (req, res) {
  res.render('modules/core/server/views/contact', getResponseParams(req));
};

exports.renderGuide = function (req, res) {
  res.render('modules/core/server/views/healthcare-shopping-guide', getResponseParams(req));
};

exports.renderTips = function (req, res) {
  res.render('modules/core/server/views/healthcost-tips', getResponseParams(req));
};

exports.renderPrivacy = function (req, res) {
  res.render('modules/core/server/views/privacy-policy', getResponseParams(req));
};

exports.renderTerms = function (req, res) {
  res.render('modules/core/server/views/terms-of-use', getResponseParams(req));
};

exports.renderFaq = function (req, res) {
  res.render('modules/core/server/views/faq', getResponseParams(req));
};

exports.renderAbout = function (req, res) {
  res.render('modules/core/server/views/about-us', getResponseParams(req));
};

/**
 * Render the server error page
 */
exports.renderServerError = function (req, res) {
  res.status(500).render('modules/core/server/views/500', {
    error: 'Oops! Something went wrong...'
  });
};

/**
 * Render the server not found responses
 * Performs content-negotiation on the Accept HTTP header
 */
exports.renderNotFound = function (req, res) {

  res.status(404).format({
    'text/html': function () {
      res.render('modules/core/server/views/404', {
        url: req.originalUrl
      });
    },
    'application/json': function () {
      res.json({
        error: 'Path not found'
      });
    },
    'default': function () {
      res.send('Path not found');
    }
  });
};
