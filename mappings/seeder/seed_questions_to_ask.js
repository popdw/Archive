var elasticsearch = require('elasticsearch'),
  faker = require('faker'),
  _ = require('underscore'),
  fs = require('fs');


var client = new elasticsearch.Client({
  host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20
  // host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20, log: 'trace'
});


client.search({
  index: 'wam',
  type: 'eoc',
  query: {
    match_all: {}
  }
}).then(function(resp) {
  return _.pluck(resp.hits.hits, '_source');
}).then(makeQuestions);



function makeQuestions(source) {
  console.log(source);
  _.each(source, function(e) {
    var questions = [];

    for(var i = 0;i<faker.random.number({min:2, max:10});i++) {
      questions.push({
        text: faker.hacker.phrase() + '?'
      });
    }

    var body = {
      eoc_code: source.code,
      category: faker.random.arrayElement([ 'Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5', 'Category 6', 'Category 7' ]),
      questions: questions
    };

    client.create({
      index: 'wam',
      type: 'questions_to_ask',
      body: body
    });
  });
}
