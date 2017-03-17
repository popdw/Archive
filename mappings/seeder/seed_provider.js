var elasticsearch = require('elasticsearch');
var faker = require('faker');
var _ = require('underscore');
var jsonfile = require('jsonfile');

var client = new elasticsearch.Client({
    host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20
    // host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20, log: 'trace'
});

console.log("---------------------------------------------------");
console.log("---------------SEED: Providers---------------------");
console.log("---------------------------------------------------");

var promises = [];
promises.push(client.search({
    index: 'wam',
    type: 'practitioner',
    from: 0,
    size: 10000,
    filter: {
        term: {
            practitioner_category: 2
        }
    }
}));
promises.push(client.search({
    index: 'wam',
    type: 'place_of_service',
    from: 0,
    size: 10000,
    query: {
        match_all: {}
    }
}));

Promise.all(promises).then(function(result) {
    var body = [];
    var practitioners = result[0].hits.hits;
    var places = result[1].hits.hits;

    _.each(practitioners, function(practitioner) {
        body.push({
            index : { _index : 'wam', _type : 'provider' }
        });
        body.push(new ProviderPractitioner(practitioner._source));
    });

    _.each(places, function(place) {
        body.push({
            index : { _index : 'wam', _type : 'provider' }
        });
        body.push(new ProviderPlaceOfService(place._source));
    });

    client.bulk({
        body: body
    });
});

var ProviderTemplate = function() {
    var has_hours;

    this.provider_id = faker.random.uuid();
    this.provider_place_of_service_id = null;
    this.provider_practitioner_id = null;
    this.provider_name = null;
    this.provider_address = null;
    this.provider_phone = null;
    this.provider_fax = faker.phone.phoneNumber();
    this.provider_portal_settings = faker.lorem.sentence(3, 15);
    this.provider_office_hours = [
        {
            day: "Monday",
            has_hours: 1,
            start_time: "09:00",
            end_time: "17:00",
        },
        {
            day: "Tuesday",
            has_hours: 1,
            start_time: "09:00",
            end_time: "17:00",
        },
        {
            day: "Wednesday",
            has_hours: 1,
            start_time: "09:00",
            end_time: "17:00",
        },
        {
            day: "Thursday",
            has_hours: 1,
            start_time: "09:00",
            end_time: "17:00",
        },
        {
            day: "Friday",
            has_hours: 1,
            start_time: "09:00",
            end_time: "17:00",
        },
        {
            day: "Saturday",
            has_hours: (has_hours = faker.random.boolean()),
            start_time: has_hours? "09:00" : "",
            end_time: has_hours? "17:00" : "",
        },
        {
            day: "Sunday",
            has_hours: (has_hours = faker.random.boolean()),
            start_time: has_hours? "09:00" : "",
            end_time: has_hours? "17:00" : "",
        }
    ];
    this.provider_lab_settings = faker.lorem.sentence(3, 15);
    this.provider_imaging_settings = faker.lorem.sentence(3, 15);
    this.provider_surgical_settings = faker.lorem.sentence(3, 15);
    this.provider_social_media_settings = {
        facebook_handle: faker.internet.url(),
        twitter_handle: faker.internet.url(),
        linkedin_handle: faker.internet.url(),
        url: faker.internet.url()
    }
};

var ProviderPractitioner = function(practitioner) {
    ProviderTemplate.call(this);
    this.provider_place_of_service_id = faker.random.uuid();
    this.provider_practitioner_id = practitioner.practitioner_id;
    this.provider_name = practitioner.practitioner_display_name;
    this.provider_address = {
        address_line_1: faker.address.streetAddress(),
        address_line_2: faker.address.secondaryAddress(),
        city: faker.address.city(),
        state: faker.address.state(),
        zip: faker.address.zipCode()
    };
    this.provider_phone = practitioner.practitioner_phone;
};

var ProviderPlaceOfService = function(place_of_service) {
    ProviderTemplate.call(this);
    this.provider_place_of_service_id = place_of_service.place_of_service_id;
    this.provider_name = place_of_service.place_of_service_name;
    this.provider_practitioner_id = faker.random.uuid();
    this.provider_address = place_of_service.place_of_service_address;
    this.provider_phone = faker.phone.phoneNumber();
};


