(function () {
  'use strict';

  angular
    .module('core')
    .controller('HeaderController', HeaderController);

  HeaderController.$inject = ['$scope', 'eventsService'];

  function HeaderController($scope, eventsService) {
    $scope.hasShadow = false;

    eventsService.on('scroll', function() {
      $scope.hasShadow = window.scrollY > 0;
    }, $scope);
  }
}());
