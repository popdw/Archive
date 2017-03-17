var elasticsearch = require('elasticsearch');
var faker = require('faker');
var _ = require('underscore');
var jsonfile = require('jsonfile');

var client = new elasticsearch.Client({
  host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20
  // host: 'localhost:9200', requestTimeout: 100000, maxSockets: 20, log: 'trace'
});

var seed_counts = {
  "prac": 400,
  "pos": 80,
  "eoc": 12
};


var seedNotes = process.argv.length > 2;

// Faker overwrites
// faker.definitions.address.state_abbr = module["exports"] = [ "NJ" ];
// faker.definitions.address.state = module["exports"] = [ "New Jersey" ];

faker.address.latitude = function (bucket) {
  bucket = bucket || 0;
  switch (bucket) {
    case 0: //Default FakerJS
      return (faker.random.number(180 * 10000) / 10000.0 - 90.0).toFixed(4)
      break;

    case 1: // NJ coordinates
      return (faker.random.number({max: 415000, min: 390000}) / 10000).toFixed(4);
      break;

    case 2: // Iasi coordinates
      return (faker.random.number({max: 280700, min: 262900}) / 10000).toFixed(4);
      break;

    case 3: // Greater Northeast
      return (faker.random.number({max: 480000, min: 300000}) / 10000).toFixed(4);
      break;
  }
};

faker.address.longitude = function (bucket) {
  bucket = bucket || 0;
  switch (bucket) {
    case 0: //Default FakerJS Behavior
      return (faker.random.number(360 * 10000) / 10000.0 - 180.0).toFixed(4);
      break;

    case 1: // NJ coordinates
      return (faker.random.number({max: -740000, min: -750000}) / 10000).toFixed(4);
      break;

    case 2: // Iasi coordinates
      return (faker.random.number({max: 473500, min: 464900}) / 10000).toFixed(4);
      break;

    case 3: // Greater Northeast
      return (faker.random.number({max: -740000, min: -950000}) / 10000).toFixed(4);
      break;
  }
};

var eoc_name_json = jsonfile.readFileSync('./test_data/eoc_procedures.json'),
  eoc_category_json = jsonfile.readFileSync('./test_data/eoc_categories.json');

var eoc_names = eoc_name_json.procedures,
  eoc_cats = eoc_category_json.categories,
  specialties = eoc_category_json.specialties;

console.log("---------------------------------------------------");
console.log("---------------SEED: ELASTIC-----------------------");
console.log("---------------------------------------------------");
// PUT https://localhost:9200/wam/facility
////////////////////////////////////////////////////
var facilities = [];
var typePromises = [];
var locationBucket = 0;

console.log("> Generate POS Data ");
for (var i = 0; i < seed_counts.pos; i++) {
  locationBucket = 1;//(i % 8 == 0 ? 2 : 1); // Every 8th Facility will be in Iasi
  var body = {
    place_of_service_name: faker.fake("{{name.firstName}} Hospital"),
    place_of_service_address: {
      address_line_1: faker.address.streetAddress(),
      address_line_2: faker.address.secondaryAddress(),
      city: faker.address.city(),
      // state: faker.address.stateAbbr(),
      state: 'NJ',
      zip: faker.address.zipCode()
    },
    place_of_service_phone: faker.phone.phoneNumber(),
    place_of_service_location: {
      lat: faker.address.latitude(locationBucket),
      lon: faker.address.longitude(locationBucket)
    },
    place_of_service_id: faker.random.uuid(),
    place_of_service_provider_id: faker.random.uuid(),
    place_of_service_type: faker.random.arrayElement(["H", "O", "ASC"]),
    place_of_service_category: faker.random.arrayElement([0, 1, 2]), //["In Network", "Correct Charges", "Public Record"]
  };

  // Push body without Autocomplete fields
  facilities.push(body);

  // Setup Autocomplete
  // var suggest = {
  //     input: [body.name, body.address, body.provider_id],
  //     output: body.name,
  //     payload: {
  //       name: body.name,
  //       address: body.address,
  //       phone: body.phone,
  //       location: body.location,
  //       provider_id: body.provider_id
  //     }
  // };
  // body.suggest = suggest;

  typePromises.push(client.create({
    index: 'wam',
    type: 'place_of_service',
    body: body
  }).then(function (body) {

  }, function (error) {
    console.log("Error indexes " + error);
  }));
}

// PUT https://localhost:9200/wam/practitioner
////////////////////////////////////////////////////
console.log("> Generate Practitioner Data");
var practitioners = [];
for (var i = 0; i < seed_counts.prac; i++) {
  var fName = faker.name.firstName();
  var lName = faker.name.lastName();

  var body = {
    practitioner_id: faker.random.uuid(),
    practitioner_display_name: ("Dr. " + fName + " " + lName),
    practitioner_first_name: fName,
    practitioner_last_name: lName,
    practitioner_gender: faker.random.arrayElement(["Male", "Female"]),
    practitioner_phone: faker.phone.phoneNumber(),
    practitioner_specialty: faker.random.arrayElement(specialties),
    practitioner_practice: "Surgeon",
    practitioner_category: faker.random.arrayElement([0, 1, 2])//["IN", "CC", "PR"])
  };

  practitioners.push(body);

  typePromises.push(client.create({
    index: 'wam',
    type: 'practitioner',
    body: body
  }).then(function (body) {
  }, function (error) {
    console.log("Error indexes " + error);
  }));
}

// PUT https://localhost:9200/wam/eoc
////////////////////////////////////////////////////
console.log("> Generate EOC Data");
var eocs = [];

for (var i = 0; i < seed_counts.eoc; i++) {
  var src = eoc_name_json.procedures.pop();//faker.random.arrayElement(eoc_name_json.procedures);
  var body = {
    eoc_code: faker.random.uuid(),
    // eoc_title: faker.company.catchPhraseAdjective(),
    eoc_title: src.procedure,
    eoc_description: src.description,
    eoc_category: faker.random.arrayElement(eoc_cats),
    eoc_keywords: faker.fake("{{hacker.adjective}},{{hacker.adjective}},{{hacker.adjective}},{{hacker.adjective}},{{hacker.adjective}}")
  };

  eocs.push(body);

  typePromises.push(client.create({
    index: 'wam',
    type: 'eoc',
    body: body
  }).then(function (body) {

  }, function (error) {
    console.log("Error indexes: " + error);
  }));
}

// console.log("sleeping before coc");
// sleep.sleep(20);
// console.log("awake!");


// PUT https://localhost:9200/wam/cost_of_care
////////////////////////////////////////////////

console.log("> Generate COC Data");
var cocPromises = [];
var cocs = [];
var bulk = [];
// var prac_index = 0;
var prac_count = 0;
var fac_index = 0;
var fac_count = 0;

function create_float(num) {
  return parseFloat((Math.round(num * 100) / 100).toFixed(2));
}

for (var i = 0; i < eocs.length; i++) {
  fac_count = faker.random.number(facilities.length);
  for (var j = 0; j < fac_count; j++) {

    if (j % 11 === 0) {
      prac_count = 1;
    } else {
      //Seed between 1 and 50 doctors.
      prac_count = faker.random.number({
        'min' : 1,
        'max' : seed_counts.prac / 10 // 50
      });
    }
    var prac_offset = faker.random.number({
      'min' : 0,
      'max' : seed_counts.prac - ( prac_count + 1)
    });

    for (var l = 0; l < prac_count; l++) {

      var k = l+prac_offset;

      var random = (1 === faker.random.number(20));
      var min_price = (random) ? 100 : 750;

      var total_charges_cost = create_float(faker.commerce.price(min_price));
      var total_medicare_cost = create_float(total_charges_cost * 0.8);

      practitioners[k].practitioner_eoc_count = faker.random.number({
        'min' : 1,
        'max' : 500
      });

      practitioners[k].practitioner_cost = total_charges_cost;

      //sample notes
      var anestNote = !seedNotes ? null : {
          type: 'warning',
          text: 'This service includes an additional charge for anestesia that is not included in this cost breakdown.  Contact ' + facilities[j].place_of_service_name + ' to obtain the name and contact information of the rendering anestesia provider to obtain a cost estimate for your anestesia charges.'
        };
      var itemNote =  !seedNotes ? undefined : {
          type: 'info',
          text: 'This is an example note inside the a cost component.'
        };

      var data_cb = {
        title: "Total Cost",
        type: "TCEOC",
        charges_cost: total_charges_cost,
        medicare_cost: total_medicare_cost,
        in_network: null,
        note : anestNote,
        cost_breakdown: [
          {
            title: practitioners[k].practitioner_display_name,
            type: "CCPRAC",
            charges_cost: create_float(total_charges_cost * 0.25),
            medicare_cost: create_float(total_medicare_cost * 0.25),
            in_network: "IN" === practitioners[k].practitioner_category,
            cost_breakdown: [            ],
            note : itemNote
          },
          {
            title: facilities[j].place_of_service_name,
            type: "CCPOS",
            charges_cost: create_float(total_charges_cost * 0.5),
            medicare_cost: create_float(total_medicare_cost * 0.5),
            in_network: "IN" === facilities[j].place_of_service_category,
            cost_breakdown: []
          }
        ]
      };

      var body = {
        eoc_data: eocs[i],
        place_of_service_data: facilities[j],
        practitioner_data: practitioners[k],
        cost_breakdown: data_cb
      };

      // console.log(body);

      bulk.push({index: {_index: 'wam', _type: 'cost_of_care'}});
      bulk.push(body);
      body = [];
    }
  }
  cocPromises.push(client.bulk({
    refresh: true,
    body: bulk
  }).then(function (body) {
  }, function (error) {
    console.log("Error indexing: " + error);
  }));

  bulk = [];
}

jsonfile.writeFile('./test_data/eoc_procedures.json', eoc_name_json, function (err) {
  if (err) {
    console.error("Error writing file:" + err);
  }
});

Promise.all(typePromises).then(function () {
  // console.log(facilities);
  // console.log(practitioners);
  // console.log(eocs);
  // console.log(cocPromises);
  return Promise.all(cocPromises);
}).catch(function (error) {
  console.error(error);
});
