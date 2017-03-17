'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var RateShareSchema = new Schema({
  type: {
    type: String,
    required: 'Missing type'
  },
  date: {
    type: Date,
    default: Date.now
  },
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
  from_name: {
    type: String,
    trim: true,
    required: 'Missing from_name.'
  },
  recipient_name: {
    type: String,
    trim: true,
    required: 'Missing recipient_name.'
  },
  recipient_email: {
    type: String,
    trim: true,
    required: 'Missing recipient_email.'
  }
});

mongoose.model('RateShare', RateShareSchema);
