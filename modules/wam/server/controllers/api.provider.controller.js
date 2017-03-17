var path = require('path'),
  util = require('util'),
  elasticsearch = require('elasticsearch'),
  _ = require('underscore'),
  errorHandler = require(path.resolve('./modules/wam/server/controllers/errors.server.controller')),
  config = require(path.resolve('./config/config')),
  fs = require('fs');
Promise = require('promise/lib/es6-extensions');

// TODO: create this object via config
var getClient = function() {
  return new elasticsearch.Client(config.elasticSearch.server());
};

// TODO: There may be a way to do this with one query
exports.apiProviderSearchGet = function(req, res) {
  var promises = [],
    pracPromise,
    posPromise,
    client;
  var providerTypes = ['DR', 'PS'];
  req.check('q', 'Missing required field \'q\'').notEmpty();
  req.check('eocCode', 'Missing required field \'eocCode\'').notEmpty();
  req.check('count', 'Invalid Count given.').optional().isNumeric();
  req.check('providerType', 'Invalid providerType given.').optional().isIn(providerTypes);
  req.check('count', 'Invalid field \'count\'').optional().isNumeric();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var q = req.query.q;
  var eoc_code = req.query.eocCode || false;
  var count = req.query.count || 10;
  var lat = req.query.lat;
  var lng = req.query.lng;
  var providerType = req.query.providerType;

  client = getClient();

  if (typeof providerType === 'undefined' || providerType === providerTypes[0]) {
    pracPromise = client.search({
      index: config.elasticSearch.index,
      type: config.elasticSearch.documentTypes.costOfCare,
        body: {
          size: count,
          query: {
            multi_match: {
              query: q.toLowerCase(),
              type: 'phrase_prefix',
              fields: ['practitioner_data.*_name.raw']
            }
          },
          aggs: {
            eoc_filter: {
              filter: {
                match: { 'eoc_data.eoc_code': eoc_code }
              },
              aggs: {
                practitioners: {
                  terms: {
                    field: 'practitioner_data.practitioner_id',
                    size: count
                  },
                  aggs: {
                    info: {
                      top_hits: {
                        size: 1,
                        _source: ['practitioner_data']
                      }
                    }
                  }
                }
              }
            }
          }
        }
    }).then(function(results) {
      var buckets = results.aggregations.eoc_filter.practitioners.buckets;
      var prac_categories = ['IN', 'CC', 'PR'];
      var practitioners = _.map(buckets, function(e) {

        var prac = e.info.hits.hits[0]._source.practitioner_data;
        prac.practitioner_category = prac_categories[prac.practitioner_category];
        delete prac.practitioner_eoc_count;
        delete prac.practitioner_cost;
        delete prac.practitioner_gender;

        return prac;
      });

      return practitioners;
    });

    promises.push(pracPromise);
  } else {
    promises.push(null); // NEEDS REFACTORING
  }

  if (typeof providerType === 'undefined' || providerType === providerTypes[1]) {
    var poc_categories = ['IN', 'CC', 'PR'];
    posPromise = client.search({
      index: config.elasticSearch.index,
      type: config.elasticSearch.documentTypes.costOfCare,
      body: {
        size: count,
        query: {
          multi_match: {
            query: q.toLowerCase(),
            type: 'phrase_prefix',
            fields: ['place_of_service_data.*_name.raw']
          }
        },
        aggs: {
          eoc_filter: {
            filter: {
              match: { 'eoc_data.eoc_code': eoc_code }
            },
            aggs: {
              place_of_services: {
                terms: {
                  field: 'place_of_service_data.place_of_service_id',
                  size: count
                },
                aggs: {
                  info: {
                    top_hits: {
                      size: 1,
                      _source: ['place_of_service_data']
                    }
                  }
                }
              }
            }
          }
        }
      }
    }).then(function(results) {
      var buckets = results.aggregations.eoc_filter.place_of_services.buckets;
      var place_of_services = _.map(buckets, function(e) {
        var place = e.info.hits.hits[0]._source.place_of_service_data;
        place.place_of_service_website = '';
        place.place_of_service_lat = place.place_of_service_location.lat;
        place.place_of_service_lng = place.place_of_service_location.lon;
        place.place_of_service_category = poc_categories[place.place_of_service_category];

        delete place.place_of_service_location;
        delete place.place_of_service_provider_id;

        return place;
      });

      return place_of_services;
    });

    promises.push(posPromise);
  } else {
    promises.push(null); // NEEDS REFACTORING
  }

  Promise.all(promises).then(function (result) {
    res.json({
      practitioners: (result[0]) ? result[0] : [],
      places_of_service: (result[1]) ? result[1] : []
    });
  }).catch(function (error) {
    res.status(500).send(error);
  });
};

exports.apiProviderPractitionerPractitionerIdGet = function(req, res) {
  req.check('practitioner_id', 'Missing practitioner id').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var client = getClient();
  var practitioner_id = req.params.practitioner_id;

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.provider,
    body: {
      query: {
        match: { provider_practitioner_id: practitioner_id }
      }
    }
  })
    .then(function(results) {
      if (!results.hits.total) {
        return res.status(404).send(errorHandler.createNotFoundError('No provider found with practitioner_id id: ' + practitioner_id));
      }

      var provider = results.hits.hits[0]._source;
      var promises = [];

      promises.push(client.search({
        index: config.elasticSearch.index,
        type: config.elasticSearch.documentTypes.comments,
        size: 100,
        body: {
          filter: {
            term: { comment_about: provider.provider_id }
          }
        }
      }));
      promises.push(client.search({
        index: config.elasticSearch.index,
        type: config.elasticSearch.documentTypes.reviews,
        body: {
          size: 100,
          filter: {
            term: { review_about: provider.provider_id }
          }
        }
      }));
      Promise.all(promises)
        .then(function(results) {
          var comments = results[0].hits.hits;
          var reviews = results[1].hits.hits;
          res.json({
            'provider_data': provider,
            'reviews_data': reviews,
            'comments_data': comments
          });
        })
        .catch(function(error) {
          res.status(500).send(errorHandler.getGeneralErrors(error));
        });
    });
};

exports.apiProviderPlaceOfServicePlaceOfServiceIdGet = function(req, res) {
  req.check('place_of_service_id', 'Missing place of service id').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var client = getClient();
  var place_of_service_id = req.params.place_of_service_id;

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.provider,
    body: {
      query: {
        match: { provider_place_of_service_id: place_of_service_id }
      }
    }
  })
    .then(function(results) {
      if (!results.hits.total) {
        return res.status(404).send(errorHandler.createNotFoundError('No provider found with place of service id: ' + place_of_service_id));
      }

      var provider = results.hits.hits[0]._source;
      var promises = [];

      promises.push(client.search({
        index: config.elasticSearch.index,
        type: config.elasticSearch.documentTypes.comments,
        size: 100,
        body: {
          filter: {
            term: { comment_about: provider.provider_id }
          }
        }
      }));
      promises.push(client.search({
        index: config.elasticSearch.index,
        type: config.elasticSearch.documentTypes.reviews,
        body: {
          size: 100,
          filter: {
            term: { review_about: provider.provider_id }
          }
        }
      }));
      Promise.all(promises)
        .then(function(results) {
          var comments = results[0].hits.hits;
          var reviews = results[1].hits.hits;
          res.json({
            'provider_data': provider,
            'reviews_data': reviews,
            'comments_data': comments
          });
        })
        .catch(function(error) {
          res.status(500).send(errorHandler.getGeneralErrors(error));
        });
    });
};
