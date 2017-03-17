(function () {
  'use strict';

  angular
    .module('core')
    .factory('logService', logService);

  function logService() {
    function Service(message) {
      // console.log(message);
    }

    return Service;
  }
}());
