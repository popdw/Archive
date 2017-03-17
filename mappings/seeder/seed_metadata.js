var elasticsearch = require('elasticsearch'),
  faker = require('faker'),
  _ = require('underscore'),
  fs = require('fs');

var client = new elasticsearch.Client({
  host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20
  // host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20, log: 'trace'
});

console.log("---------------------------------------------------");
console.log("---------------SEED: METADATA----------------------");
console.log("---------------------------------------------------");

client.search({
  index: 'wam',
  type: 'practitioner',
  from: 0,
  size: 10000,
  query: {
    match_all: {}
  }
}).then(function(resp) {
  return _.pluck(resp.hits.hits, '_source');
}).then(makePractitionerMetadata);

client.search({
  index: 'wam',
  type: 'place_of_service',
  from: 0,
  size: 10000,
  query: {
    match_all: {}
  }
}).then(function(resp) {
  return _.pluck(resp.hits.hits, '_source');
}).then(makePlaceOfServiceMetadata);

client.search({
    index: 'wam',
    type: 'eoc',
    from: 0,
    size: 10000,
    query: {
        match_all: {}
    }
}).then(function(resp) {
    return _.pluck(resp.hits.hits, '_source')
}).then(makeEocMetadata);

function makeEocMetadata(source) {
    console.log("> Generate EOC Metadata");
    var episode_of_care_chart_data = [];

    _.each(source, function(eoc) {

        episode_of_care_chart_data.push({
            key: "State",
            value: faker.random.number({min:1000, max:5000}),
            heading: "State average price of EOC",
            subheading: "Prices may vary"
        });

        episode_of_care_chart_data.push({
            key: "National",
            value: faker.random.number({min:10000, max:15000}),
            heading: "National average price of EOC",
            subheading: "Prices may vary"
        });

        var body = {
            eoc_code: eoc.eoc_code,
            episode_of_care_chart_data: episode_of_care_chart_data,
        };

        client.create({
            index: 'wam',
            type: 'eoc_metadata',
            body: body
        });
    });
}

function makePractitionerMetadata(source) {
  // console.log(source);
  console.log("> Generate Practitioner Metadata");
  _.each(source, function(e) {
    var practitioner_quality_data = [];

    // console.log(e);
    // console.log(e.practitioner_id);
    // return false;

    practitioner_quality_data.push({
      key: "Primary Specialty",
      value: e.practitioner_specialty.specialty_name,
      tooltip: null,
      count: null,
      type: "T"
    });

    practitioner_quality_data.push({
      key: "Gender",
      value: e.practitioner_gender,
      tooltip: null,
      count: null,
      type: "T"
    });

    practitioner_quality_data.push({
      key: "Overall Rating",
      value: faker.random.number({min:0, max:5}),
      tooltip: "This is a number representing overall practitioner rating, 5 being the highest",
      count: 42,
      type: "R"
    });

    practitioner_quality_data.push({
      key: "Reported quality measures",
      value: (_.random(0, 1) === 1)? "true" : "false",
      tooltip: "This practitioner has reported quality measures",
      count: null,
      type: "B"
    });

    practitioner_quality_data.push({
      key: "Electronic health records",
      value: (_.random(0, 1) === 1)? "true" : "false",
      tooltip: "This practitioner has electronic health records",
      count: null,
      type: "B"
    });

    for(var i = 0;i<faker.random.number({min:2, max:6});i++) {
      practitioner_quality_data.push({
        key: faker.commerce.department(),
        value: faker.commerce.productName(),
        tooltip: null,
        count: null,
        type: "T"
      });
    }

    var body = {
      practitioner_id: e.practitioner_id,
      practitioner_quality_data: practitioner_quality_data
    };

    client.create({
      index: 'wam',
      type: 'practitioner_metadata',
      body: body
    });
  });
}

function makePlaceOfServiceMetadata(source) {
  // console.log(source);
  console.log("> Generate Place of Service Metadata");
  _.each(source, function(e) {
    var place_of_service_quality_data = [];
    var place_of_service_reports_data = [];

    // Quality Data
    place_of_service_quality_data.push({
      key: "HCAHPS Overall Rating",
      value: faker.random.number({min:0, max:5}) + "",
      tooltip: "The Hospital Consumer Assessment of Healthcare Providers and Systems Survey is a survey use to measure patients perspectives of hospital care.",
      count: null,
      type: "R"
    });

    place_of_service_quality_data.push({
      key: "HCAHPS Consumer Satisfaction Rating",
      value: faker.random.number({min:0, max:5}) + "",
      tooltip: "The Hospital Consumer Assessment of Healthcare Providers and Systems Survey is a survey use to measure patients perspectives of hospital care.",
      count: null,
      type: "R"
    });

    // Reports Data

    place_of_service_reports_data.push({
      value_keys: [
        "State",
        "National",
        "Place Of Service"
      ],
      survey_values: {
        key: "Patients who reported that their doctors \"Always\" communicated well:",
        values: [
          { key : "State", value : faker.random.number({min:1, max:100})/100 },
          { key : "National", value : faker.random.number({min:1, max:100})/100 },
          { key : "Place Of Service", value : faker.random.number({min:1, max:100})/100 }
        ]
      }
    });

    place_of_service_reports_data.push({
        value_keys: [
            "State",
            "National",
            "Place Of Service"
        ],
        survey_values: {
            key: "Patients who reported that their nurses \"Always\" communicated well:",
            values: [
                { key : "State", value : faker.random.number({min:1, max:100})/100 },
                { key : "National", value : faker.random.number({min:1, max:100})/100 },
                { key : "Place Of Service", value : faker.random.number({min:1, max:100})/100 }
            ]
        }
    });

    place_of_service_reports_data.push({
        value_keys: [
            "State",
            "National",
            "Place Of Service"
        ],
        survey_values: {
            key: "Patients who reported that they \"Always\" received help as soon as they wanted:",
            values: [
                { key : "State", value : faker.random.number({min:1, max:100})/100 },
                { key : "National", value : faker.random.number({min:1, max:100})/100 },
                { key : "Place Of Service", value : faker.random.number({min:1, max:100})/100 }
            ]
        }
    });

    var body = {
      place_of_service_id: e.place_of_service_id,
      place_of_service_quality_data: place_of_service_quality_data,
      place_of_service_reports_data: place_of_service_reports_data
    };

    client.create({
      index: 'wam',
      type: 'place_of_service_metadata',
      body: body
    });
  });
}

