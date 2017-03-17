'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var SessionSchema = new Schema({
  sessionKey: {
    type: String,
    required: 'Missing type'
  },
  clientKey: {
    type: String
  },
  sessionInfo : {
    ip : [String],
    useragent : String,
    createdDate: {
      type: Date,
      default: Date.now
    }
  },
  searchContexts : [
    {
      createdDate : {
        type: Date,
        default: Date.now
      },
      types : [String],
      serviceQueries : [String],
      preferredProviderQueries : [String],
      searches : [
        {
           eoc : String
        }
      ]
    }
  ]

});

mongoose.model('RateShare', RateShareSchema);
