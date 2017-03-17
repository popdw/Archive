(function () {
  'use strict';

  angular.module('core')
    .directive('scrollIntoView', function (deviceService, $timeout) {
      return function (scope, el, attrs) {
        // disable directive for larger screens
        if (screen.availHeight >= 768) return;

        var currentScroll = null;
        var headerElement = $('#header')[0];

        el.bind('focus', function (event) {
          if (!deviceService.isMobile()) return;

          currentScroll = window.scrollY;
          var y = $(el[0]).offset().top - headerElement.offsetHeight - 5;

          $timeout(function () {
            window.scrollTo(undefined, y);
          });
        });

        el.bind('blur', function (event) {
          if (!deviceService.isMobile()) return;

          $timeout(function () {
            if (currentScroll !== null) {
              window.scrollTo(undefined, currentScroll);
            }
          });
        });
      };
    });

}());
