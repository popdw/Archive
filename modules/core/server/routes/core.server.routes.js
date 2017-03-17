'use strict';

module.exports = function (app) {
  // Root routing
  var core = require('../controllers/core.server.controller');

  // Define error pages
  app.route('/server-error').get(core.renderServerError);

  // Return a 404 for all undefined api, module or lib routes
  app.route('/:url(api|modules|lib)/*').get(core.renderNotFound);

  // Define application route
  app.route('/').get(core.renderIndex);
  app.route('/search').get(core.renderIndex);
  app.route('/search/*').get(core.renderIndex);
  app.route('/details').get(core.renderIndex);
  app.route('/details/*').get(core.renderIndex);

  app.route('/contact').get(core.renderContact);
  app.route('/healthcare-shopping-guide').get(core.renderGuide);
  app.route('/healthcost-tips').get(core.renderTips);
  app.route('/privacy-policy').get(core.renderPrivacy);
  app.route('/terms-of-use').get(core.renderTerms);
  app.route('/faq').get(core.renderFaq);
  app.route('/about-us').get(core.renderAbout);

};
