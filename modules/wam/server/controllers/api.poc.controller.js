'use strict';
/**
 * Module dependencies.
 */
var path = require('path'),
  util = require('util'),
  elasticsearch = require('elasticsearch'),
  _ = require('underscore'),
  errorHandler = require(path.resolve('./modules/wam/server/controllers/errors.server.controller')),
  async = require('async'),
  config = require(path.resolve('./config/config')),
  common = require('./common');

// TODO: create this object via config
var getClient = function () {
  return new elasticsearch.Client(config.elasticSearch.server());
};

// Place of Care
exports.SearchGet = function (req, res) {
  req.check('eocCode', 'Missing required field "eocCode"').notEmpty();
  req.check('lat', 'Missing required field "lat"').notEmpty();
  req.check('lng', 'Missing required field "lng"').notEmpty();
  req.check('radius', 'Invalid field "radius"').optional().isDecimal();
  req.check('page', 'Invalid field "page"').optional().isNumeric();
  req.check('count', 'Invalid field "count"').optional().isNumeric();
  req.check('placeOfServiceId', 'Invalid field "placeOfServiceId"').optional();
  req.check('practitionerId', 'Invalid field "practitionerId"').optional();
  req.check('placeOfServiceTypes', 'Invalid field "placeOfServiceTypes"').optional();
  req.check('placeOfServiceFilter', 'Invalid field "placeOfServiceFilter"').optional();
  req.check('maxCost', 'Invalid maxCost.').optional().isNumeric();
  req.check('minCost', 'Invalid minCost.').optional().isNumeric();
  req.check('placeOfServiceInNetwork', 'Invalid placeOfServiceInNetwork.').optional().isBoolean();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  // GET query parameters
  var eocCode = req.query.eocCode;
  var lat = req.query.lat;
  var lng = req.query.lng;

  var radius = req.query.radius || 60;
  var count = req.query.count || 20;
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
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.placeOfCare,
    body: {
      size: count,
      from: count * (page - 1),
      _source: ['place_of_service_data', 'practitioners'],
      sort: [
        {
          _geo_distance: {
            'place_of_service_data.place_of_service_location': {
              lat: lat,
              lon: lng
            },
            order: 'asc',
            unit: 'mi',
            distance_type: 'arc'
          }
        },
        {
          'practitioners.practitioner_cost': {
            order: 'asc',
            mode: 'min',
            nested_path: 'practitioners'
          }
        }
      ],
      query: {
        bool: {
          filter: {
            nested: {
              path: 'practitioners',
              filter: {}
            },
            and: [
              {
                term: {
                  'eoc_data.eoc_code': eocCode
                }
              },
              {
                geo_distance: {
                  distance: radius + 'mi',
                  distance_type: 'arc',
                  'place_of_service_data.place_of_service_location': {
                    lat: lat,
                    lon: lng
                  }
                }
              }
            ]
          }
        }
      }
    }
  };

  if (placeOfServiceInNetwork === 'true') {
    query.body.query.bool.filter.and.push({
      'terms': {
        'place_of_service_data.place_of_service_category': [0]
      }
    });
  }

  // Filter by place of service types
  if (placeOfServiceTypes && placeOfServiceTypes.length) {
    placeOfServiceTypes = placeOfServiceTypes.split(',');
    query.body.query.bool.filter.and.push({
      'terms': {
        'place_of_service_data.place_of_service_type': placeOfServiceTypes // [placeOfServiceTypes]
      }
    });
  }

  // Filter places of service based on minCost and maxCost
  if (minCost || maxCost) {
    query.body.query.bool.filter.nested = {
      'path': 'practitioners',
      'filter': {
        'range': {
          'practitioners.practitioner_cost': {}
        }
      }
    };
    if (minCost) {
      query.body.query.bool.filter.nested.filter.range['practitioners.practitioner_cost'].from = minCost;
    }
    if (maxCost) {
      query.body.query.bool.filter.nested.filter.range['practitioners.practitioner_cost'].to = maxCost;
    }
  }

  if (req.query.radius) {
    // Remove the _geo_distance sort when radius is present.
    query.body.sort = [{
      'practitioners.practitioner_cost': {
        order: 'asc',
        mode: 'min',
        nested_path: 'practitioners'
      }
    }];
  }

  queries.push(client.search(query));

  // Get the range min-max
  var query_range = {
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.placeOfCare,
    body: {
      size: 0,
      query: {
        bool: {
          filter: {
            and: [{
              term: {
                'eoc_data.eoc_code': eocCode
              }
            }]
          }
        }
      },
      aggs: {
        practitioners: {
          nested: {
            path: 'practitioners'
          },
          aggs: {
            cost_metadata: {
              extended_stats: {
                field: 'practitioners.practitioner_cost'
              }
            }
          }
        }
      }
    }
  };
  queries.push(client.search(query_range));

  // Get the preferred facility information
  if (placeOfServiceId !== '') {
    var query_preferred_facility = {
      index: config.elasticSearch.index,
      type: config.elasticSearch.documentTypes.placeOfCare,
      body: {
        size: 1,
        query: {
          bool: {
            filter: {
              and: [
                {
                  term: {
                    'eoc_data.eoc_code': eocCode
                  }
                },
                {
                  term: {
                    'place_of_service_data.place_of_service_id': placeOfServiceId
                  }
                }
              ]
            }
          }
        }
      }
    };
    queries.push(client.search(query_preferred_facility));
  }

  Promise.all(queries).then(function (results) {

    var total = results[0].hits.total;

    if (!total) {
      return res.status(200).send(errorHandler.createNotFoundError('No results found. Try adjusting your search.'));
    }

    var result_places = common.formatPlaceOfCare(results[0].hits.hits, lat, lng, placeOfServiceId, practitionerId, placeOfServiceFilter);
    var pagination = common.getPagination(req, total, count, page);

    // Set the search radius to the furthest away location during the initial search.
    if (_.isEmpty(req.query.radius)) {
      var last_place_of_service = _.last(result_places);
      radius = last_place_of_service.place_of_service_distance;
    }

    var search_filters = {
      search_places_of_care_types: placeOfServiceTypes,
      search_radius: radius,
      search_min_cost: results[1].aggregations.practitioners.cost_metadata.min,
      search_max_cost: results[1].aggregations.practitioners.cost_metadata.max,
      preferred_place_of_care_count: null
    };

    // Scenario 4: The specified preferred facility is outside range
    pagination.status = null;
    if (placeOfServiceId !== '' && results[2].hits.hits.length > 0) {
      var sc_facility = results[2].hits.hits[0]._source.place_of_service_data;
      var sc_distance = common.distance(lat, lng, sc_facility.place_of_service_location.lat, sc_facility.place_of_service_location.lon);
      if (Number(sc_distance) > Number(radius)) {
        var sc_string = sc_facility.place_of_service_name + ' is outside of the search radius and is ' +
          'not currently shown on the map.\n You can still select doctors who ' +
          'perform the selected service there from the list (they are ' +
          'highlighted).';
        pagination.status = errorHandler.getSuccesfulGeneral(200, sc_string, '');
      }
      search_filters.preferred_place_of_care_count = results[2].hits.hits[0]._source.practitioners.length;
    }

    //Scenario 5: Additiona Validation Messages

    var responseObject = {
      places_of_care: result_places,
      search_filters: search_filters,
      search_metadata: pagination,
      message : null
    };
    responseObject.message = getValidationMessage(responseObject);
    res.json(responseObject);
  });
};

exports.FindLowerRatesGet = function (req, res) {
  req.check('eocCode', 'Missing required field "eocCode"').notEmpty();
  req.check('lat', 'Missing required field "lat"').notEmpty();
  req.check('lng', 'Missing required field "lng"').notEmpty();
  req.check('targetPrice', 'Missing required field "targetPrice"').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  // GET query parameters
  var eocCode = req.query.eocCode;
  var lat = req.query.lat;
  var lng = req.query.lng;
  var targetPrice = parseFloat(req.query.targetPrice);
  var client = getClient();

  var query_place = {
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.placeOfCare,
    body: {
      size: 1,
      _source: ['place_of_service_data', 'eoc_data', 'practitioners'],
      sort: [{
        _geo_distance: {
          'place_of_service_data.place_of_service_location': {
            lat: lat,
            lon: lng
          },
          order: 'asc',
          unit: 'mi',
          distance_type: 'arc'
        }
      }],
      query: {
        bool: {
          must: [
            {
              match: {
                'eoc_data.eoc_code': eocCode
              }
            },
            {
              nested: {
                path: 'practitioners',
                query: {
                  bool: {
                    must: [{
                      range: {
                        'practitioners.practitioner_cost': {
                          lte: targetPrice
                        }
                      }
                    }]
                  }
                }
              }
            }
          ]
        }
      }
    }
  };

  client.search(query_place).then(function (resp) {

    if (!resp.hits.total) {
      return res.status(404).send(errorHandler.createNotFoundError('We were unable to find a rate that was 20% cheaper than the lowest rate currently shown.'));
    }

    var result_places = common.formatPlaceOfCare(resp.hits.hits, lat, lng, '', '', '');
    if (result_places) {
      // Get Place of Service data from response.
      var result_place = result_places[0];
      var place_of_service_id = result_place.place_of_service_id;
      var distance = common.distance(lat, lng, result_place.place_of_service_lat, result_place.place_of_service_lng);

      if (!distance) {
        return res.status(404).send(errorHandler.createNotFoundError('We were unable to find a rate that was 20% cheaper than the lowest rate currently shown.'));
      }

      var query_prac = {
        index: config.elasticSearch.index,
        type: config.elasticSearch.documentTypes.practitionerOfCare,
        body: {
          query: {
            bool: {
              must: [
                {
                  match: {
                    'eoc_code': eocCode
                  }
                },
                {
                  nested: {
                    path: 'places_of_service',
                    query: {
                      bool: {
                        must: [
                          {
                            match: {
                              'places_of_service.place_of_service_id': place_of_service_id
                            }
                          },
                          {
                            range: {
                              'places_of_service.place_of_service_cost': {
                                lte: targetPrice
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      };

      client.search(query_prac).then(function (resp) {
        var prac_hits = resp.hits.hits;

        if (!resp.hits.total) {
          return res.status(404).send(errorHandler.createNotFoundError('We were unable to find a rate that was 20% cheaper than the lowest rate currently shown.'));
        }

        var result_practitioners = common.formatPractitionerOfCare(prac_hits, lat, lng);

        // Remove Place of Cares from Practitioners of Care which are outside distance.
        result_practitioners = removePractitionerOfCarePlacesByDistance(result_practitioners, distance);
        result_practitioners = removePractitionerOfCarePlacesByCost(result_practitioners, targetPrice);
        // Set place_of_service_practitioner_count to the appropriate number.
        result_place.place_of_service_practitioner_count = result_practitioners.length;

        return res.json({
          place_of_care: result_place,
          practitioners_of_care: result_practitioners
        });
      });
    }

  }, function (err) {
    console.trace(err.message);
  });

};

function removePractitionerOfCarePlacesByDistance(practitioners_of_care, distance) {
  for (var i = 0; i < practitioners_of_care.length; i++) {
    var pracs = practitioners_of_care[i];
    var poss = pracs.practitioner_places_of_service;
    var poss_filtered = _.filter(poss, function (pos) {
      return (pos.place_of_service_distance <= this.distance);
    }, {
      'distance': distance
    });
    practitioners_of_care[i].practitioner_places_of_service = poss_filtered;
  }
  return practitioners_of_care;
}

function removePractitionerOfCarePlacesByCost(practitioners_of_care, cost) {
  for (var i = 0; i < practitioners_of_care.length; i++) {
    var pracs = practitioners_of_care[i];
    var poss = pracs.practitioner_places_of_service;
    var poss_filtered = _.filter(poss, function (pos) {
      return (pos.place_of_service_cost <= this.cost);
    }, {
      'cost': cost
    });
    practitioners_of_care[i].practitioner_places_of_service = poss_filtered;
  }
  return practitioners_of_care;
}

//TODO: Refactor this out of the file after Nik completes his major refactor ticket
function getValidationMessage(response){
  try{
    //validation check 1: is any result in the state of maryland
    if(response.places_of_care && response.places_of_care.length > 0){
      if(_.some(response.places_of_care,function (poc) { return poc.place_of_service_address.state === "MD";})){
       return {
         header : 'Results Note',
         message : '<p>Please be aware that hospitals in the state of Maryland have received special exemption from CMS and are not required to report charge data.</p><p>Our results do not currently incorporate hospitals in the state of Maryland unless the hospital has shared their charge data directly with HealthCost.</p>'
       }
      }
    }
  }catch(e){
    console.error("Unexpected error occured");
    console.error(e.message);
  }

  return null ;
}