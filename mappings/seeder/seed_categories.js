var elasticsearch = require('elasticsearch');
var faker = require('faker');
var _ = require('underscore');
var jsonfile = require('jsonfile');

var client = new elasticsearch.Client({
  host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20
  // host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20, log: 'trace'
});

console.log("---------------------------------------------------");
console.log("---------------SEED: EOC CATEGORY------------------");
console.log("---------------------------------------------------");
var eoc_category_json = jsonfile.readFileSync('./test_data/eoc_categories.json');

var eoc_cats = eoc_category_json.categories,
  specialties = eoc_category_json.specialties;


// PUT https://localhost:9200/wam/practitioner_specialty
////////////////////////////////////////////////////

var typePromises = [];

var specialtyBulk  = [];
_.each(specialties, function(value, index, list) {
  specialtyBulk.push({ index:  { _index: 'wam', _type: 'practitioner_specialty'} });
  specialtyBulk.push(value);
});

typePromises.push(client.bulk({
  refresh: true,
  body: specialtyBulk
}));


// PUT https://localhost:9200/wam/eoc_category
////////////////////////////////////////////////////
for(var i=0;i<eoc_cats.length;i++) {

  var body = eoc_cats[i];
  typePromises.push(client.create({
    index: 'wam',
    type: 'eoc_category',
    body: body
  }).then(function(body) {

  }, function(error) {
    console.log("Error indexes " + error);
  }));
}
Promise.all(typePromises);
