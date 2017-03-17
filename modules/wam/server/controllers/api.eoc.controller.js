'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  util = require('util'),
  elasticsearch = require('elasticsearch'),
  _ = require('underscore'),
  errorHandler = require(path.resolve('./modules/wam/server/controllers/errors.server.controller')),
  config = require(path.resolve('./config/config')),
  fs = require('fs'),
  common = require('./common');

// TODO: create this object via config
var getClient = function () {
  return new elasticsearch.Client(config.elasticSearch.server());
};

exports.SpecialtiesGet = function (req, res) {

  var client = getClient();

  client.search({
    from: 0,
    size: 200,
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.specialty,
    query: {
      match_all: {}
    }
  }).then(function (results) {
    var specialties = _.pluck(results.hits.hits, '_source');
    return res.json(specialties);
  });
};

/**
 Returns the collection of categories the episodes of care can be searched by.
 These currently include:
 "Medical or Surgical Procedure", "Office Visit", "Imaging Exam", and "Lab Test".
 */
exports.CategoriesGet = function (req, res) {
  if (config.mockData) {
    var json = fs.readFileSync('./modules/wam/server/mock-data/eoc_categories.json');

    res.setHeader('Content-Type', 'application/json');
    res.send(json);

    return;
  }

  var client = getClient();

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.eocCategory,
    query: {
      match_all: {}
    }
  }).then(function (results) {
    var categories = _.pluck(results.hits.hits, '_source');
    return res.json(categories);
  });
};

/**
 * GET Practives
 * Returns the collection of practices the episodes of care can be performed by.
 * These include \"Cardiologist\", \"Physiatrist\", \"Radiologist\", etc.
 */
exports.PracticesGet = function (req, res) {
  var practices = [{
    'name': 'Planner',
    'description': 'Repellat neque totam maxime at ea.'
  },
    {
      'name': 'panel',
      'description': 'Repellendus accusantium fugiat.'
    },
    {
      'name': 'Tactics',
      'description': 'Facere dolores alias suscipit.'
    },
    {
      'name': 'Concrete',
      'description': 'Quam ea velit esse maiores.'
    },
    {
      'name': 'applications',
      'description': 'Sint iste autem rerum nemo.'
    },
    {
      'name': 'mint green',
      'description': 'Quod aliquam culpa deserunt fugit.'
    },
    {
      'name': 'Trafficway',
      'description': 'Velit vel nisi quis.'
    }
  ];

  return res.json(practices);
};

/**
 * Search EOC's
 */
exports.SearchGet = function (req, res) {

  req.check('q', 'Missing required field \'q\'').notEmpty();
  req.check('count', 'Invalid Count given.').optional().isNumeric();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var client = getClient();

  var q = req.param('q');
  var eocCat = req.param('eocCategoryId');
  var count = req.param('count') || 20;

  q = common.elasticReserved(q);

  var body = {
    query: {
      multi_match: {
        query: '*' + q + '*',
        fields: ['eoc_code', 'eoc_keywords', 'eoc_title', 'eoc_description']
      }
    }
  };

  if (eocCat) {
    body.filter = {
      bool: {
        must: {
          match: {
            'eoc_category.eoc_category_id': eocCat
          }
        }
      }
    };
  }

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.episodeOfCare,
    size: count,
    body: body
  }).then(function (arg) {
    if (arg.hits.total === 0) {
      return res.status(404).send(errorHandler.createNotFoundError('Sorry, no matches found for "' + q + '"'));
    }

    var results = _.map(arg.hits.hits, function (arg) {
      var e = arg._source;
      return {
        eoc_code: e.eoc_code,
        eoc_category: e.eoc_category,
        eoc_title: e.eoc_title,
        eoc_description: e.eoc_description,
        eoc_keywords: e.eoc_keywords
      };
    });

    res.json(results);
  }).catch(function (error) {
    return res.status(500).send(errorHandler.getGeneralErrors(error));
  });
};

exports.ShowEocCodeGet = function (req, res) {
  req.check('eoc_code', 'Missing required field eoc_code.').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.status(500).send(errorHandler.getParamErrors(errors));
  }

  var eocCode = req.params.eoc_code;

  var client = getClient();

  client.search({
    index: config.elasticSearch.index,
    type: config.elasticSearch.documentTypes.episodeOfCare,
    body: {
      query: {
        match: {
          eoc_code: eocCode
        }
      }
    }
  }).then(function (results) {
    if (results.hits.total === 0) {
      return res.status(404).send(errorHandler.createNotFoundError('The episode of care was not found.'));
    }
    res.json(results.hits.hits[0]._source);
  }).catch(function (error) {
    res.status(500).send(errorHandler.getGeneralError(error));
  });
};
