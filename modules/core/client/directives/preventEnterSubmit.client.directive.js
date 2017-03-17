(function () {
  'use strict';

  angular.module('core')
    .directive('preventEnterSubmit', function () {
      return function (scope, el, attrs) {
        el.bind('keydown', function (event) {
          if (event.which === 13) {
            event.preventDefault();
            window.stop();
            document.execCommand('Stop');
            return false;
          }
        });
      };
    });

}());
