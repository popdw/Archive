'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var PractitionerInviteSchema = new Schema({
  date: {
    type: Date,
    default: Date.now
  },
  session_key: {
    type: String,
    trim: true,
    required: 'Missing session_key.'
  },
  practitioner_id: {
    type: String,
    trim: true,
    required: 'Missing practitioner_id.'
  },
  place_of_service_id: {
    type: String,
    trim: true,
    required: 'Missing place_of_service_id.'
  },
  eoc_code: {
    type: String,
    trim: true,
    required: 'Missing eoc_code.'
  },
  invited_by: {
    type: String,
    trim: true,
    required: 'Missing invited_by.'
  },
  practitioner_name: {
    type: String,
    trim: true,
    required: 'Missing practitioner_name.'
  },
  practitioner_email: {
    type: String,
    trim: true,
    required: 'Missing practitioner_email.'
  }
});

mongoose.model('PractitionerInvite', PractitionerInviteSchema);
