var faker = require('faker'),
  elasticsearch = require('elasticsearch'),
  _ = require('underscore'),
  jsonfile = require('jsonfile');

console.log("---------------------------------------------------");
console.log("---------------SEED: PLACE OF CARE----------");
console.log("---------------------------------------------------");

var client = new elasticsearch.Client({
  host: 'localhost:9200', requestTimeout: 900000, maxSockets: 20
  // host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20, log: 'trace'
});

var eoc_body_search = {
  query: {
    match_all: {}
  }
};

client.search({
  index: 'wam',
  type: 'eoc',
  body: eoc_body_search
}).then(function(results) {
  var promises = [];
  var eoc_nr = results.hits.hits.length;

  for (var i = 0; i < eoc_nr; i++) {
    var e = results.hits.hits[i];
    var eoc_code = e._source.eoc_code;

    promises.push(client.search({
      index: 'wam',
      type: 'cost_of_care',
      body: {
        size: 10000,
        query: {
          bool: {
            filter: [
              { term: { 'eoc_data.eoc_code': eoc_code } }
            ]
          }
        },
        aggs: {
          places_of_service: {
            terms: {
              field: 'place_of_service_data.place_of_service_id',
              size: 0
            },
            aggs: {
              info: {
                top_hits: {
                  _source: [ 'place_of_service_data', 'cost_breakdown', 'eoc_data', 'practitioner_data' ],
                  size: 9999999
                }
              }
            }
          }
        }
      }
    }));
  }

  Promise.all(promises).then(function (results) {
    var pocs = [];
    var bulk = [];

    for (var i = 0; i < results.length; i++) {
      var bucket = results[i].aggregations.places_of_service.buckets;

      for (var j = 0; j < bucket.length; j++) {
        var source = _.map(bucket[j].info.hits.hits, function(e) {
          return _.extend(e._source.practitioner_data, { practitioner_cost: e._source.cost_breakdown.charges_cost });
        });

        var place_of_care = {};
        place_of_care.place_of_service_data = bucket[j].info.hits.hits[0]._source.place_of_service_data;
        place_of_care.eoc_data = bucket[j].info.hits.hits[0]._source.eoc_data;
        place_of_care.practitioners = source;

        bulk.push( { index:  { _index: 'wam', _type: 'place_of_care'} } );
        bulk.push( place_of_care );
      }
    }

    client.bulk({
      refresh: true,
      body: bulk
    }).then(function(body) {
      if (body.errors === true) {
        console.log("Error indexing:");
        console.log(body.items[0]);
      } else {
        console.log("Completed PLACE OF CARE data seed");
      }
    }, function(error) {
      console.log("Error indexing: " + error);
    });
  }).catch(function(error) {
    console.trace(error);
  });
});
