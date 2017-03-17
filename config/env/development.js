'use strict';

var defaultEnvConfig = require('./default');

module.exports = {
  db: {
    uri: process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'mongodb://' + (process.env.DB_1_PORT_27017_TCP_ADDR || 'localhost') + '/leftshark',
    options: {
      user: '',
      pass: ''
    },
    // Enable mongoose debug mode
    debug: process.env.MONGODB_DEBUG || false
  },
  log: {
    // logging with Morgan - https://github.com/expressjs/morgan
    // Can specify one of 'combined', 'common', 'dev', 'short', 'tiny'
    format: 'dev',
    fileLogger: {
      directoryPath: process.cwd(),
      fileName: 'app.log',
      maxsize: 10485760,
      maxFiles: 2,
      json: false
    }
  },
  app: {
    title: defaultEnvConfig.app.title
  },
  facebook: {
    clientID: process.env.FACEBOOK_ID || 'APP_ID',
    clientSecret: process.env.FACEBOOK_SECRET || 'APP_SECRET',
    callbackURL: '/api/auth/facebook/callback'
  },
  twitter: {
    clientID: process.env.TWITTER_KEY || 'CONSUMER_KEY',
    clientSecret: process.env.TWITTER_SECRET || 'CONSUMER_SECRET',
    callbackURL: '/api/auth/twitter/callback'
  },
  google: {
    clientID: process.env.GOOGLE_ID || 'APP_ID',
    clientSecret: process.env.GOOGLE_SECRET || 'APP_SECRET',
    callbackURL: '/api/auth/google/callback'
  },
  linkedin: {
    clientID: process.env.LINKEDIN_ID || 'APP_ID',
    clientSecret: process.env.LINKEDIN_SECRET || 'APP_SECRET',
    callbackURL: '/api/auth/linkedin/callback'
  },
  github: {
    clientID: process.env.GITHUB_ID || 'APP_ID',
    clientSecret: process.env.GITHUB_SECRET || 'APP_SECRET',
    callbackURL: '/api/auth/github/callback'
  },
  paypal: {
    clientID: process.env.PAYPAL_ID || 'CLIENT_ID',
    clientSecret: process.env.PAYPAL_SECRET || 'CLIENT_SECRET',
    callbackURL: '/api/auth/paypal/callback',
    sandbox: true
  },
  // google: {
  //   apiKey: 'AIzaSyCkpWfrj1h7z5oNbZQgLXJ0pcIxcZNP3Jk',
  // },
  mailer: {
    from: process.env.MAILER_FROM || 'do_not_reply@healthcost.com',
    options: {
      service: process.env.MAILER_SERVICE_PROVIDER || 'MAILER_SERVICE_PROVIDER',
      auth: {
        user: process.env.MAILER_EMAIL_ID || 'MAILER_EMAIL_ID',
        pass: process.env.MAILER_PASSWORD || 'MAILER_PASSWORD'
      }
    },
    sesTransportOptions: {
      accessKeyId: 'AKIAIXURK6DBBYGABIOQ',
      secretAccessKey: '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',
      region: 'us-west-2',
      rateLimit: 14 // do not send more than 5 messages in a second
    }
  },
  livereload: true,
  elasticSearch: {
    index: 'wam',
    server: function () {
      return {
        // host: 'https://search-leftshark-4y2eld3hppytwqotxdbrglocye.us-west-2.es.amazonaws.com',
         //host: '54.245.0.77:9200',
        host: 'search-leftshark-4y2eld3hppytwqotxdbrglocye.us-west-2.es.amazonaws.com',
        log: 'debug'
      };
    },
    documentTypes: {
      questionsToAsk: 'questions_to_ask',
      specialty: 'practitioner_specialty',
      costOfCare: 'cost_of_care',
      episodeOfCare: 'eoc',
      placeOfService: 'place_of_service',
      practitioner: 'practitioner',
      placeOfCare: 'place_of_care',
      provider: 'provider',
      practitionerOfCare: 'practitioner_of_care',
      eocCategory: 'eoc_category',
      practitionerMetadata: 'practitioner_metadata',
      placeOfServiceMetadata: 'place_of_service_metadata',
      eocMetaData: 'eoc_metadata'
    }
  },
  seedDB: {
    seed: process.env.MONGO_SEED === 'true',
    options: {
      logResults: process.env.MONGO_SEED_LOG_RESULTS !== 'false',
      seedUser: {
        username: process.env.MONGO_SEED_USER_USERNAME || 'user',
        provider: 'local',
        email: process.env.MONGO_SEED_USER_EMAIL || 'user@localhost.com',
        firstName: 'User',
        lastName: 'Local',
        displayName: 'User Local',
        roles: ['user']
      },
      seedAdmin: {
        username: process.env.MONGO_SEED_ADMIN_USERNAME || 'admin',
        provider: 'local',
        email: process.env.MONGO_SEED_ADMIN_EMAIL || 'admin@localhost.com',
        firstName: 'Admin',
        lastName: 'Local',
        displayName: 'Admin Local',
        roles: ['user', 'admin']
      }
    }
  }
};
