(function () {
  'use strict';

  angular
    .module('core')
    .controller('CtaPageController', CtaPageController);

  function CtaPageController($scope, $rootScope, searchCriteriaModel) {

    var oldSearchCriteria;

    $scope.$watch('page', function(page, oldPage) {
      if (oldPage !== 'cta' && page === 'cta') {
        oldSearchCriteria = angular.copy(searchCriteriaModel.get());
      }
    });

    $scope.goBack = function() {
      $rootScope.skipSearch = true;
      searchCriteriaModel.set(oldSearchCriteria);
      $rootScope.$broadcast('applySearch');
      $scope.gotoSearchPage();
    };

    $scope.saveAndGoBack = function() {
      if (angular.equals(searchCriteriaModel.get(), oldSearchCriteria)) {
        $rootScope.skipSearch = true;
      } else {
        $rootScope.$broadcast('applySearch');
      }

      $scope.gotoSearchPage();
    };

  }
}());
