(function () {
  'use strict';

  angular
    .module('core')
    .factory('apiService', apiService);

  function apiService($http, $q) {
    function queryString(params) {
      var str = [];
      params = params || {};
      for (var p in params)
        if (params.hasOwnProperty(p)) {
          str.push(encodeURIComponent(p) + '=' + encodeURIComponent(params[p]));
        }
      return str.join('&');
    }

    return function (url, params) {
      return $q(function (resolve, reject) {
        $http.get('/api/' + url + '?' + queryString(params))
          .then(resolve)
          .catch(function(response) {
            console.error(response.data.message || 'An unrecoverable error occurred');
            reject(response);
          });
      });
    };
  }
}());
