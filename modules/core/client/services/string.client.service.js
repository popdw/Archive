(function () {
  'use strict';

  angular
    .module('core')
    .factory('stringService', stringService);

  function stringService() {
    var Service = {
      htmlDecode: function(value) {
        return angular.element('<textarea>').html(value).text();
      },

      htmlEncode: function(value) {
        return angular.element('<textarea>').text(value).html();
      },

      formatPrice: function(value) {
        return value ? parseFloat(value).toLocaleString('us-US').replace(/\.0+$/, '') : 0;
      },

      urlEncode: function(value) {
        return encodeURI(value);
      }
    };

    return Service;
  }
}());
