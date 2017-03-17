(function () {
  'use strict';

  var app = angular.module('core');

  app.filter('price', function(stringService) {
    return function(input) {
      return stringService.formatPrice(input);
    };
  });

}());
