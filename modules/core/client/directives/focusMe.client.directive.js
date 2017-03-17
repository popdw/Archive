(function () {
  'use strict';

  angular.module('core')
    .directive('focusOn', function($timeout) {
      return {
        scope: {
          trigger: '=focusOn'
        },
        link: function(scope, element) {
          scope.$watch('trigger', function(value) {
            if (value === true) {
              // console.log('trigger',value);
              scope.trigger = false;
              $timeout(function() {
                element[0].focus();
              });
            }
          });
        }
      };
    });

}());
