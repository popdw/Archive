var elasticsearch = require('elasticsearch');
var faker = require('faker');
var _ = require('underscore');
var jsonfile = require('jsonfile');

var client = new elasticsearch.Client({
    host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20
    // host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20, log: 'trace'
});

console.log("---------------------------------------------------");
console.log("---------------SEED: REVIEWS/COMMENTS--------------");
console.log("---------------------------------------------------");

client.search({
    index: 'wam',
    type: 'provider',
    from: 0,
    size: 10000,
    query: {
        match_all: {}
    }
}).then(function(resp) {
    var body = [];
    _.each(resp.hits.hits, function(provider) {
        if(provider._source.provider_id) {
            for(var i=0; i < faker.random.number({min:0, max:10}); i++) {
                body.push({index : { _index : 'wam', _type : 'comments' }});
                body.push(makeComment(provider._source.provider_id));
            }
            body = body.concat(makeReviews(provider._source.provider_id));
        }
    });
    client.bulk({
        body: body
    });
});

function makeComment(id) {
    return {
        comment_about: id,
        author: faker.name.firstName() + " " + faker.name.lastName(),
        comment: faker.lorem.sentence(5, 20),
        value: faker.random.number({min:1, max:5}),
        date: faker.date.past(3,"2017-01-01")
    };
}

function makeReviews(id) {
    return [
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Overall Rating",
            value: faker.random.number({min:0, max:5}),
            tooltip: "This is an aggregate of all reviews for this Practitioner",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Did the doctor explain things in a way that was easy to understand?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Did the doctor listen carefully to you?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Did the doctor give you easy to understand instructions about taking care of your health problems or concerns?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Did the doctor seem to know the important information about your medical history?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Did the doctor show respect for what you had to say?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Did the doctor give you enough time to ask questions?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "When you phoned this doctor’s office during regular office hours, how often did you get an answer to your medical question that same day?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Did the doctor's office contact you in a timely manner to schedule an appointment?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Did the doctor's office make an appointment that was convenient for you?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Was the doctor's office organized and neat?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
        {
            index : { _index : 'wam', _type : 'reviews' }
        },
        {
            review_about: id,
            key: "Did clerks and receptionists at the doctor's office treat you with courtesy and respect?",
            value: faker.random.number({min:0, max:5}),
            tooltip: "",
            count: faker.random.number({min:2, max:100})
        },
    ];
}
