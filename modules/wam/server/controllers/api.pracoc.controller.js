'use strict';
/**
 * Module dependencies.
 */
var path = require('path'),
  util = require('util'),
  elasticsearch = require('elasticsearch'),
  _ = require('underscore'),
  errorHandler = require(path.resolve('./modules/wam/server/controllers/errors.server.controller')),
  common = require('./common'),
  config = require(path.resolve('./config/config'));

// TODO: create this object via config
var getClient = function () {
  return new elasticsearch.Client(config.elasticSearch.server());
};

// Practitioner of Care// Place of Care
exports.SearchGet = function (req, res) {
  var prac_categories = ['IN', 'CC', 'PR'];

  req.check('eocCode', 'Missing required field "eocCode"').notEmpty();
  req.check('lat', 'Missing required field "lat"').notEmpty();
  req.check('lng', 'Missing required field "lng"').notEmpty();
  req.check('radius', 'Invalid field "radius"').isDecimal();
  req.check('page', 'Invalid field "page"').optional().isNumeric();
  req.check('count', 'Invalid field "count"').optional().isNumeric();
  req.check('placeOfServiceId', 'Invalid field "placeOfServiceId"').optional();
  req.check('practitionerId', 'Invalid field "practitionerId"').optional();
  req.check('placeOfServiceTypes', 'Invalid field "placeOfServiceTypes"').optional();
  req.check('placeOfServiceFilter', 'Invalid field "placeOfServiceFilter"').optional();
  req.check('placeOfServiceId', 'Invalid field "placeOfServiceId"').optional();
  req.check('maxCost', 'Invalid maxCost.').optional().isNumeric();
  req.check('minCost', 'Invalid minCost.').optional().isNumeric();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  // GET query parameters
  var eocCode = req.query.eocCode;
  var lat = req.query.lat;
  var lng = req.query.lng;

  var radius = req.query.radius;
  var count = req.query.count || 40;
  var page = req.query.page || 1;

  var minCost = req.query.minCost;
  var maxCost = req.query.maxCost;

  var practitionerId = req.query.practitionerId || '';
  var placeOfServiceId = req.query.placeOfServiceId || '';
  var placeOfServiceTypes = req.query.placeOfServiceTypes || '';
  var placeOfServiceFilter = req.query.placeOfServiceFilter || '';
  var placeOfServiceInNetwork = req.query.placeOfServiceInNetwork || false;

  var client = getClient();
  var queries = [];

  var query = {
    bool: {
      must: [{
        term: {
          eoc_code: eocCode
        }
      }],
      filter: {
        nested: {
          path: 'places_of_service',
          filter: {

            and: [{
              geo_distance: {
                distance: radius + 'mi',
                distance_type: 'arc',
                'places_of_service.place_of_service_location': {
                  lat: lat,
                  lon: lng
                }
              }
            }]
          },
          inner_hits: {
            size: 9999999
          } // NEEDS REFACTORING
        }
      }
    }
  };

  var sort = {
    'practitioner_category': {
      'order': 'asc'
    },
    'places_of_service.place_of_service_cost': {
      order: 'asc',
      nested_path: 'places_of_service',
      nested_filter: [{
        geo_distance: {
          distance: radius + 'mi',
          distance_type: 'arc',
          'places_of_service.place_of_service_location': {
            lat: lat,
            lon: lng
          }
        }
      }]
    }
  };

  var pref_prac_query = {
    bool: {
      must: []
    }
  };

  // Filter places of service based on minCost and maxCost
  if (minCost || maxCost) {
    var range = {
      'range': {
        'places_of_service.place_of_service_cost': {}
      }
    };

    var query_range = {
      'bool': {
        'must': []
      }
    };
    if (minCost) {
      range.range['places_of_service.place_of_service_cost'].gte = minCost;
    }
    if (maxCost) {
      range.range['places_of_service.place_of_service_cost'].lte = maxCost;
    }
    sort['places_of_service.place_of_service_cost'].nested_filter.push(range);
    // query.bool.filter.nested.query = query_range;
    query.bool.filter.nested.filter.and.push(range);

  }

  // Filter data based on practitionerId
  /* if (practitionerId) {
     filter.and.push({
      term: { 'practitioner_id': practitionerId }
    });
  } */

  // Filter places of service based on placeOfServiceId
  /* if (placeOfServiceId) {
    query.bool.filter.nested.query = {
      'bool': {
        'must' : {'term': {
          'places_of_service.place_of_service_id': placeOfServiceId
        }}
      }
    };
  } */

  // Filter by  place_of_service_in_network
  if (placeOfServiceInNetwork === 'true') {
    query.bool.filter.nested.filter.and.push({
      'terms': {
        'places_of_service.place_of_service_category': [0]
      }
    });
    sort['places_of_service.place_of_service_cost'].nested_filter.push({
      'terms': {
        'places_of_service.place_of_service_category': [0]
      }
    });
  }

  // Filter by multiples place_of_service IDs
  if (placeOfServiceFilter && placeOfServiceFilter.length) {
    placeOfServiceFilter = placeOfServiceFilter.split(',');
    query.bool.filter.nested.filter.and.push({
      'terms': {
        'places_of_service.place_of_service_id': placeOfServiceFilter // [placeOfServiceFilter]
      }
    });
    sort['places_of_service.place_of_service_cost'].nested_filter.push({
      'terms': {
        'places_of_service.place_of_service_id': placeOfServiceFilter // [placeOfServiceFilter]
      }
    });
  }

  // Filter by place of service types
  if (placeOfServiceTypes && placeOfServiceTypes.length) {
    placeOfServiceTypes = placeOfServiceTypes.split(',');
    var pos_types_filter = {
      'terms': {
        'places_of_service.place_of_service_type': placeOfServiceTypes // [placeOfServiceTypes]
      }
    };

    // This applies the Facility Type Filter to the Preferred Practitioner Query. This business logic has been removed.
    // pref_prac_query.bool.filter = {
    //     nested:{
    //       path: 'places_of_service',
    //       filter:[pos_types_filter],
    //       inner_hits:{}
    //     }
    // };

    sort['places_of_service.place_of_service_cost'].nested_filter.push(pos_types_filter);
    query.bool.filter.nested.filter.and.push(pos_types_filter);
  }

  var exclude_fields = ['places_of_service', 'practitioner_eoc_count', 'practitioner_specialty', 'practitioner_cost'];
  queries.push(client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.practitionerOfCare,
    body: {
      _source: {
        'exclude': exclude_fields
      },
      size: count,
      from: count * (page - 1),
      query: query,
      sort: sort
    }
  }));

  if (practitionerId) {
    exclude_fields = ['practitioner_eoc_count', 'practitioner_specialty', 'practitioner_cost'];
    pref_prac_query.bool.must.push({
      term: {
        practitioner_id: practitionerId
      }
    });
    pref_prac_query.bool.must.push({
      term: {
        eoc_code: eocCode
      }
    });
    queries.push(client.search({
      index: config.elasticSearch.index,
      type: config.elasticSearch.documentTypes.practitionerOfCare,
      body: {
        size: 1,
        _source: {
          'exclude': exclude_fields
        },
        query: pref_prac_query
      }
    }));
  }

  Promise.all(queries).then(function (results) {
    var json = [];
    // var preferred_prac;

    if (!results[0].hits.total) {
      return res.status(200).send(errorHandler.createNotFoundError('No results found. Try adjusting your search.'));
    }

    // Push on top preferred practitioner TO REFACTOR!!!!
    if (typeof results[1] !== 'undefined' && page === 1 && results[1].hits.total) {
      // change the structure of the preferred hit
      // to match the structure of the rest
      var pos = _.map(results[1].hits.hits[0]._source.places_of_service, function (e, key) {
        return {
          _source: e
        };
      });

      results[1].hits.hits[0].inner_hits = {
        places_of_service: {
          hits: {
            hits: pos
          }
        }
      };

      delete results[1].hits.hits[0]._source.places_of_service;

      // now prepend the preferred hit
      results[0].hits.hits.unshift(results[1].hits.hits[0]);
      results[1].hits.hits[0]._source.practitioner_preferred = true;
    }
    var practitioners_of_care = common.formatPractitionerOfCare(results[0].hits.hits, lat, lng, placeOfServiceId, practitionerId);
    practitioners_of_care = _.filter(practitioners_of_care);

    var total = results[0].hits.total;
    var pagination = common.getPagination(req, total, count, page);

    // Scenario1: All facilities for the specified preferred doctor are outside range
    // Scenario2: 1 or more facilities for the specified preferred doctor is/are outside radius
    pagination.status = null;
    if (practitioners_of_care[0].practitioner_preferred) {
      // Find the maximum preferred practitioner distance
      var distances = _.map(practitioners_of_care[0].practitioner_places_of_service, function (pos) {
        return pos.place_of_service_distance;
      });
      var max_distance = Math.max.apply(null, distances);

      if (max_distance > radius) {
        var sc_string = 'One or more of the facilities that ' + practitioners_of_care[0].practitioner_display_name +
          ', performs the specified service at is outside of the search ' +
          'radius and is not currently shown on the map.\n You can still ' +
          'select this doctor to see more details from the list.';
        pagination.status = errorHandler.getSuccesfulGeneral(200, sc_string, '');
      }
    }

    return res.json({
      practitioners_of_care: practitioners_of_care,
      search_metadata: pagination
    });
  });
};
