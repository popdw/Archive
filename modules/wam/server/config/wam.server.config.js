'use strict';

/**
 * Module dependencies
 */

var validator = require('express-validator'),
  errorHandler = require('../controllers/errors.server.controller'),
  path = require('path'),
  config = require(path.resolve('./config/config'));

/**
 * Module init function
 */
module.exports = function (app, db) {
  // // Serialize sessions
  // passport.serializeUser(function (user, done) {
  //   done(null, user.id);
  // });
  //
  // // Deserialize sessions
  // passport.deserializeUser(function (id, done) {
  //   User.findOne({
  //     _id: id
  //   }, '-salt -password', function (err, user) {
  //     done(err, user);
  //   });
  // });
  //
  // // Initialize strategies
  // config.utils.getGlobbedPaths(path.join(__dirname, './strategies/**/*.js')).forEach(function (strategy) {
  //   require(path.resolve(strategy))(config);
  // });
  //
  // // Add passport's middleware
  // app.use(passport.initialize());
  // app.use(passport.session());

  app.use(function(err, req, res, next) {
    console.error(err.stack);
    return res.status(500).send('Our apologies, but an unexpected error has occured!  Our team is working to diagnosis the issue, please check back in a little bit to check pricing near you.  ');
  });
  app.use(validator());
};
