(function () {
  'use strict';

  var app = angular.module('core');

  app.filter('pluralize', function() {
    return function(input, singularForm, pluralForm) {
      input = input || 0;
      var retval = '' + input + ' ';
      if (input === 1) {
        retval += singularForm;
      } else {
        retval += pluralForm;
      }
      return retval;
    };
  });

}());
