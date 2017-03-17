'use strict';

module.exports = {
  app: {
    title: 'Healthcost',
    version: 'v1.0',
    description: '',
    keywords: '',
    googleAnalyticsTrackingID: process.env.GOOGLE_ANALYTICS_TRACKING_ID || 'GOOGLE_ANALYTICS_TRACKING_ID',
    googlePlayUrl: 'https://play.google.com/store/apps/details?id=com.healthcost',
    appStoreUrl: 'https://appsto.re/us/Uv36hb.i', // http://itunes.apple.com/[country]/app/[App –Name]/id[App-ID]?mt=8
    websiteUrl: 'https://www.healthcost.com'
  },
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  templateEngine: 'swig',
  // Session Cookie settings
  sessionCookie: {
    // session expiration is set by default to 24 hours
    maxAge: 24 * (60 * 60 * 1000),
    // httpOnly flag makes sure the cookie is only accessed
    // through the HTTP protocol and not JS/browser
    httpOnly: true,
    // secure cookie should be turned to true to provide additional
    // layer of security so that the cookie is set only when working
    // in HTTPS mode.
    secure: false
  },
  // sessionSecret should be changed for security measures and concerns
  sessionSecret: process.env.SESSION_SECRET || 'HEALTHCOST',
  // sessionKey is set to the generic sessionId key used by PHP applications
  // for obsecurity reasons
  sessionKey: 'sessionId',
  sessionCollection: 'sessions',
  // Lusca config
  csrf: {
    csrf: false,
    csp: { /* Content Security Policy object */},
    xframe: 'SAMEORIGIN',
    p3p: 'ABCDEF',
    xssProtection: true
  },
  logo: 'modules/core/client/img/brand/logo.svg',
  favicon: 'modules/core/client/img/brand/favicon.png',
  uploads: {
    profileUpload: {
      dest: './modules/users/client/img/profile/uploads/', // Profile upload destination path
      limits: {
        fileSize: 1 * 1024 * 1024 // Max file size in bytes (1 MB)
      }
    }
  },
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
  }
};
