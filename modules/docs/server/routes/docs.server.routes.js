'use strict';

module.exports = function(app) {
  var docs = require('../controllers/docs.server.controller.js');
  // Routing logic
  app.route('/docs').get(docs.index);
};
