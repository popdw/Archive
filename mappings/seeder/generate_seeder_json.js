// var elasticsearch = require('elasticsearch');
var faker = require('faker'),
  _ = require('underscore'),
  xlsx = require('xlsx'),
  jsonfile = require('jsonfile');

console.log("---------------------------------------------------");
console.log("---------------SEED: GENERATE JSON-----------------");
console.log("---------------------------------------------------");
var file = './test_data/procedure_list.xlsx';
var outputFile = './test_data/eoc_procedures.json';

// jsonfile.writeFile(file, obj, function (err) {
//   console.error(err)
// })

var procedures = [];
var promises = [];
// eoc_test_data

var workbook = xlsx.readFile(file);

var baskets = workbook.Sheets['EOC Baskets'],
  CAT_COL = 'A',
  PROC_COL = 'B',
  DESC_COL = 'G';

var i = 3; // Move past headers
while(true) {
  if(i < 800) { // TODO: Arbitrary number from the xlsx
    procedures.push({
      procedure: baskets[PROC_COL + i].v,
      description: baskets[DESC_COL + i].v
    });
  } else {
    break;
  }
  i++;
}

jsonfile.writeFile(outputFile, {procedures: procedures}, function (err) {
  if (err) {
    console.error("Error writing file:" + err);
  }
});
