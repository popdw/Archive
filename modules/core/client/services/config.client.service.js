(function () {
  'use strict';

  angular
    .module('core')
    .factory('configService', configService);

  function configService() {
    return {
      searchRadius: 200 // miles
    };
  }
}());
