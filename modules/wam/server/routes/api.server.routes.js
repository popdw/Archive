'use strict';

// var validate = require('express-validation')

module.exports = function(app) {
  var api_gen = require('../controllers/api.general.controller');
  var api_coc = require('../controllers/api.coc.controller');
  var api_eoc = require('../controllers/api.eoc.controller');
  var api_poc = require('../controllers/api.poc.controller');
  var api_pracoc = require('../controllers/api.pracoc.controller');
  var api_provider = require('../controllers/api.provider.controller');

  // http://enable-cors.org/server_expressjs.html
  app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  // Taxonomy-like
  app.route('/api/specialties/list').get(api_eoc.SpecialtiesGet);
  app.route('/api/categories/list').get(api_eoc.CategoriesGet);

  // Episode of Care
  app.route('/api/episode_of_care/show/:eoc_code').get(api_eoc.ShowEocCodeGet);
  app.route('/api/episode_of_care/search').get(api_eoc.SearchGet);
  app.route('/api/episode_of_care/practices').get(api_eoc.PracticesGet);
  app.route('/api/eoc/practices').get(api_eoc.PracticesGet); // Deprecated

  // Provider
  app.route('/api/provider/search').get(api_provider.apiProviderSearchGet);
  app.route('/api/provider/practitioner/:practitioner_id').get(api_provider.apiProviderPractitionerPractitionerIdGet);
  app.route('/api/provider/place_of_service/:place_of_service_id').get(api_provider.apiProviderPlaceOfServicePlaceOfServiceIdGet);

    // Location
  app.route('/api/location/search').get(api_gen.LocationSearchGet); // TODO: Fake
  app.route('/api/location/reverse_geocode').get(api_gen.ReverseGeocode);

  // Place of Care (Episode of Care and Place of Service Composite)
  app.route('/api/place_of_care/search').get(api_poc.SearchGet);
  app.route('/api/place_of_care/find_lower_rates').get(api_poc.FindLowerRatesGet);

  // Practitioner of Care (Episode of Care and Practitioner Composite)
  app.route('/api/practitioner_of_care/search').get(api_pracoc.SearchGet);

  // Cost of Care
  app.route('/api/cost_of_care/show/:eocCode/:placeOfServiceId/:practitionerId').get(api_coc.ShowCocGet);
  app.route('/api/cost_of_care/place_of_service/:place_of_service_id').get(api_coc.apiCostOfCarePlaceOfServicePlaceOfServiceGet);
  app.route('/api/cost_of_care/practitioner/:practitioner_id').get(api_coc.apiCostOfCarePractitionerPractitionerIdGet);
  app.route('/api/cost_of_care/episode_of_care/:eoc_code/:place_of_service_id/:practitioner_id').get(api_coc.apiCostOfCareEpisodeOfCareEocCodePlaceOfServiceIdPractitionerIdGet);
  app.route('/api/cost_of_care/postman').get(api_coc.apiCostOfCarePostman); // Utility

  // Saved Care (Favorites)
  app.route('/api/saved_care/create/:session_key/:eoc_code/:place_of_service_id/:practitioner_id').get(api_coc.SaveCostPost);
  app.route('/api/saved_care/list/:session_key').get(api_coc.ListCostGet);
  app.route('/api/saved_care/destroy/:session_key/:eoc_code/:place_of_service_id/:practitioner_id').get(api_coc.DestroyCostDelete);

  // rate sharing api
  app.route('/api/share/email').post(api_gen.shareRatesViaEmail);

  // invite api
  app.route('/api/invites').post(api_gen.inviteViaEmail);

  // Misc
  // app.route('/api/questions/search/').get(api_gen.QuestionsSearchGet); //Deprecated

};
