(function () {
  'use strict';

  var app = angular.module('core');

  app.filter('parseToHtml', function($sce) {
    return function(input) {
      return $sce.trustAsHtml(input.replace('\n', '<br><br>'));
    };
  });

}());
