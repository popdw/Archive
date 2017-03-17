(function () {
  'use strict';

  angular
    .module('core')
    .factory('eventsService', eventsService);

  function eventsService() {
    var Service = {
      on: function(eventName, callback, $scope) {
        angular.element(window).bind(eventName, function() {
          callback();
          $scope && $scope.$apply();
        });
      },

      debounce: function(eventName, callback, $scope) {
        var eventTimer;

        angular.element(window).bind(eventName, function() {
          clearTimeout(eventTimer);
          eventTimer = setTimeout(function() {
            callback();
            $scope && $scope.$apply();
          }, 150);
        });
      }
    };

    return Service;
  }
}());
