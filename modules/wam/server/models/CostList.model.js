'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * Cost List Schema
 */
var CostListSchema = new Schema({
  session_key: {
    type: String,
    trim: true,
    required: 'Missing session_key.'
  },
  eoc_code: {
    type: String,
    trim: true,
    required: 'Missing eoc_code.'
  },
  place_of_service_id: {
    type: String,
    trim: true,
    required: 'Missing place_of_service_id.'
  },
  practitioner_id: {
    type: String,
    trim: true,
    required: 'Missing practitioner_id.'
  },
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('CostList', CostListSchema);
