'use strict';
/**
 * Module dependencies.
 */
var path = require('path'),
  util = require('util'),
  mongoose = require('mongoose'),
  elasticsearch = require('elasticsearch'),
  _ = require('underscore'),
  errorHandler = require(path.resolve('./modules/wam/server/controllers/errors.server.controller')),
  faker = require('faker'), // TODO: This dependancy will eventually be removed
  async = require('async'),
  common = require('./common'),
  config = require(path.resolve('./config/config'));

// Include Models
var CostList = mongoose.model('CostList');

// TODO: create this object via config
var getClient = function() {
  return new elasticsearch.Client(config.elasticSearch.server());
};


exports.ShowCocGet = function(req, res) {
  req.check('eocCode', 'Invalid eocCode.').notEmpty();
  req.check('placeOfServiceId', 'Invalid practitionerId.').notEmpty();
  req.check('practitionerId', 'Invalid practitionerId.').notEmpty();


  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var client = getClient();
  var eocCode = req.params.eocCode,
    placeOfServiceId = req.params.placeOfServiceId,
    practitionerId = req.params.practitionerId;

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.costOfCare,
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'eoc_data.eoc_code': eocCode } },
            { term: { 'place_of_service_data.place_of_service_id': placeOfServiceId } },
            { term: { 'practitioner_data.practitioner_id': practitionerId } }
          ]
        }
      }
    }
  }).then(function(results) {
    if (results.hits.total === 0) {
      return res.status(404).send(errorHandler.createNotFoundError('The cost of care was not found.'));
    }

    var result_coc = results.hits.hits[0]._source;
    var result_place = common.formatPlace(result_coc.place_of_service_data);
    var result_practitioner = common.formatPractitioner(result_coc.practitioner_data);

    var coc = {
      'cost_of_care': result_coc.cost_breakdown,
      'episode_of_care': result_coc.eoc_data,
      'place_of_care': result_place,
      'practitioner_of_care': result_practitioner
    };

    res.json(coc);

  }).catch(function(error) {
    res.status(500).send(errorHandler.getGeneralError(error));
  });
};

exports.SaveCostPost = function(req, res) {

  req.check('eoc_code', 'Missing EOC Code').notEmpty();
  req.check('place_of_service_id', 'Missing Place of Service ID').notEmpty();
  req.check('practitioner_id', 'Missing Practitioner ID').notEmpty();
  req.check('session_key', 'Missing Session Key').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var eoc_code = req.params.eoc_code,
    session_key = req.params.session_key,
    place_of_service_id = req.params.place_of_service_id,
    practitioner_id = req.params.practitioner_id;

  var model_cost_list = new CostList();
  model_cost_list.session_key = session_key;
  model_cost_list.eoc_code = eoc_code;
  model_cost_list.place_of_service_id = place_of_service_id;
  model_cost_list.practitioner_id = practitioner_id;


  var eocCode = req.params.eoc_code,
    placeOfServiceId = req.params.place_of_service_id,
    practitionerId = req.params.practitioner_id;

  var client = getClient();
  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.episodeOfCare,
    body: {
      query: {
        match: { eoc_code: eocCode }
      }
    }
  }).then(function(results) {
    if (results.hits === 0) {
      return res.json([]);
    }

    model_cost_list.save(function (err) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      } else {
        res.json(model_cost_list);
      }
    });
  }).catch(function(error) {
    res.status(500).send(errorHandler.getGeneralError(error));
  });
};

exports.ListCostGet = function(req, res) {

  req.check('session_key', 'Missing Session Key').notEmpty();

  var session_key = req.params.session_key;
  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var client = getClient();
  var episodes_of_care = function(callback, eoc_code) {
    return client.search({
      index: config.elasticSearch.index,
      type: config.elasticSearch.documentTypes.episodeOfCare,
      body: {
        query: {
          match: { eoc_code: eoc_code }
        }
      }
    }).then(function(results) {
      if (results.hits.total > 0) {
        callback(null, results.hits.hits[0]._source);
      } else {
        callback(null, []);
      }
    }).catch(function(error) {
      callback(error, null);
    });
  };

  var cost_of_care = function(callback, eoc_code, place_of_service_id) {
    client.search({
      index: config.elasticSearch.index,
      type: config.elasticSearch.documentTypes.costOfCare,
      _source: ['cost_breakdown'],
      size: 1,
      body: {
        aggs: {
          eoc_filter: {
            filter: {
              match: { 'eoc_data.eoc_code': eoc_code }
            }
          },
          place_filter: {
            filter: {
              match: { 'place_of_service_data.place_of_service_id': place_of_service_id }
            }
          }
        }
      }
    }).then(function(results) {
      if (results.hits.total > 0) {
        callback(null, results.hits.hits[0]._source);
      } else {
        callback(null, []);
      }
    }).catch(function(error) {
      callback(error, null);
    });
  };

  var place_of_care = function(callback, eoc_code, place_of_service_id) {
    client.search({
      index: config.elasticSearch.index,
      type: config.elasticSearch.documentTypes.costOfCare,
      body: {
        _source: ['place_of_service_data'],
        query: {
          bool: {
            filter: [
              { term: { 'eoc_data.eoc_code': eoc_code } },
              { term: { 'place_of_service_data.place_of_service_id': place_of_service_id } }
            ]
          }
        }
      }
    }).then(function(results) {
      if (results.hits.total > 0) {
        callback(null, _.pluck(results.hits.hits, '_source'));
      } else {
        callback(null, []);
      }
    }).catch(function(error) {
      callback(error, null);
    });
  };

  var practitioners_of_care = function(callback, eoc_code, place_of_service_id, practitioner_id) {
    client.search({
      index: config.elasticSearch.index,
      type: config.elasticSearch.documentTypes.costOfCare,
      _source: ['practitioner_data', 'cost_breakdown', 'place_of_service_data'],
      body: {
        query: {
          bool: {
            filter: [
              { term: { 'practitioner_data.practitioner_id': practitioner_id } },
              { term: { 'eoc_data.eoc_code': eoc_code } },
              { term: { 'place_of_service_data.place_of_service_id': place_of_service_id } }
            ]
          }
        },
        aggs: {
          stats: {
            extended_stats: {
              field: 'practitioner_data.practitioner_cost'
            }
          }
        }
      }
    }).then(function(results) {
      if (results.hits.total > 0) {
        var cost_breakdown = results.aggregations.stats;
        var extra_data = _.map(results.hits.hits, function(arg) {
          var elem = arg._source;
          var priceObj = {
            practitioner_total_cost: elem.cost_breakdown.charges_cost,
            practitioner_quality_data: {},
            practitioner_cost_comparison: {
              price_metadata: {
                lowest_cost: cost_breakdown.min,
                highest_cost: cost_breakdown.max,
                median_cost: cost_breakdown.avg
              },
              prices_metadata: []
            },
            practitioner_places_of_service: elem.place_of_service_data
          };
          return _.extend(elem.practitioner_data, priceObj);
        });

        callback(null, extra_data);
      } else {
        callback(null, []);
      }
    }).catch(function(error) {
      callback(error, null);
    });
  };

  var list = CostList.find({ session_key: session_key }).sort([['created', 'descending']]).exec()
  .then(function (lists) {
    var data = [];
    async.each(lists, function(list, next) {
      async.parallel({
        episode_of_care: function(callback) {
          episodes_of_care(callback, list.eoc_code);
        },
        cost_of_care: function(callback) {
          cost_of_care(callback, list.eoc_code, list.place_of_service_id);
        },
        place_of_care: function(callback) {
          place_of_care(callback, list.eoc_code, list.place_of_service_id);
        },
        practitioners_of_care: function(callback) {
          practitioners_of_care(callback, list.eoc_code, list.place_of_service_id, list.practitioner_id);
        }
      }, function(err, results) {
        if (err) {
          return res.status(500).send({
            message: errorHandler.getErrorMessage(err)
          });
        }

        if (typeof results.cost_of_care !== 'undefined') {
          results.cost_of_care = results.cost_of_care.cost_breakdown;
        }
        data.push(results);
        next(); // callback for async.each
      });

    }, function(err) {
      if (err) {
        return res.status(500).send({
          message: errorHandler.getErrorMessage(err)
        });
      } else {
        return res.json(data);
      }
    });
  })
  .catch(function(err) {
    if (err) {
      res.status(500).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

  });
};

exports.DestroyCostDelete = function(req, res) {
  req.check('eoc_code', 'Missing EOC Code').notEmpty();
  req.check('place_of_service_id', 'Missing Place of Service ID').notEmpty();
  req.check('practitioner_id', 'Missing Practitioner ID').notEmpty();
  req.check('session_key', 'Missing Session Key').notEmpty();

  var session_key = req.params.session_key;
  var eoc_code = req.params.eoc_code;
  var place_of_service_id = req.params.place_of_service_id;
  var practitioner_id = req.params.practitioner_id;

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var list = CostList.findOneAndRemove({
    'session_key': session_key,
    'practitioner_id': practitioner_id,
    'eoc_code': eoc_code,
    'place_of_service_id': place_of_service_id }).exec()
  .then(function (lists) {
    if (lists) {
      res.status(200).send(errorHandler.getSuccesfulGeneral(200, '', ''));
    } else {
      res.status(404).send(errorHandler.getSuccesfulGeneral(404, 'Invalid resource', ''));
    }
  })
  .catch(function(err) {
    if (err) {
      res.status(500).send({
        message: errorHandler.getErrorMessage(err)
      });
    }
  });
};

exports.apiCostOfCarePractitionerPractitionerIdGet = function(req, res) {

  req.check('practitioner_id', 'Missing Practitioner ID').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var practitioner_id = req.params.practitioner_id;

  var client = getClient();

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.practitionerMetadata,
    body: {
      query: {
        match: { practitioner_id: practitioner_id }
      }
    }
  }).then(function(results) {
    res.json({
      'practitioner_quality_data': results.hits.hits[0]._source.practitioner_quality_data
    });
  }).catch(function(error) {
    res.status(500).send(errorHandler.getGeneralError(error));
  });
};

exports.apiCostOfCarePlaceOfServicePlaceOfServiceGet = function(req, res) {

  req.check('place_of_service_id', 'Missing Place of Service ID').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var place_of_service_id = req.params.place_of_service_id;

  var client = getClient();

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.placeOfServiceMetadata,
    body: {
      query: {
        match: { place_of_service_id: place_of_service_id }
      }
    }
  }).then(function(results) {
    res.json({
      'place_of_service_quality_data': results.hits.hits[0]._source.place_of_service_quality_data,
      'place_of_service_reports_data': results.hits.hits[0]._source.place_of_service_reports_data
    });
  }).catch(function(error) {
    res.status(500).send(errorHandler.getGeneralError(error));
  });
};

exports.apiCostOfCareEpisodeOfCareEocCodePlaceOfServiceIdPractitionerIdGet = function(req, res) {
  req.check('eoc_code', 'Missing Episode of Care Code').notEmpty();
  req.check('place_of_service_id', 'Missing Place of Service ID').notEmpty();
  req.check('practitioner_id', 'Missing Practitioner ID').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var eoc_code = req.params.eoc_code;

  var client = getClient();

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.eocMetaData,
    body: {
      query: {
        match: { eoc_code: eoc_code }
      }
    }
  }).then(function(results) {
    res.json({
      'episode_of_care_chart_data': results.hits.hits[0]._source.episode_of_care_chart_data
    });
  }).catch(function(error) {
    res.status(500).send(errorHandler.getGeneralError(error));
  });
};

exports.apiCostOfCarePostman = function(req, res) {

  var client = getClient();

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.placeOfCare,
    body: {
      from: faker.random.number({ 'min': 0, 'max': 200 }), // Random from
      size: 1,
      query: {
        match_all: {}
      }
    }
  }).then(function(results) {
    var poc = results.hits.hits[0]._source;
    res.json({
      'eoc_code': poc.eoc_data.eoc_code,
      'place_of_service_id': poc.place_of_service_data.place_of_service_id,
      'practitioner_id': poc.practitioners[0].practitioner_id,
      'lat': poc.place_of_service_data.place_of_service_location.lat,
      'lng': poc.place_of_service_data.place_of_service_location.lon
    });
  }).catch(function(error) {
    res.status(500).send(errorHandler.getGeneralError(error));
  });
};
