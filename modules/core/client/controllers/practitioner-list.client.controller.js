(function () {
  'use strict';

  angular
    .module('core')
    .controller('PractitionerListController', PractitionerListController);

  function PractitionerListController($scope, $rootScope, placesOfCareModel) {

    $scope.selectDoctor = function(doctor) {
      placesOfCareModel.setSelectedDoctorId(doctor.id);
    };

    $scope.selectFacility = function(facility) {
      placesOfCareModel.setSelectedFacility(facility);
      $rootScope.$broadcast('facilitySelected');
    };

    $scope.isFacilitySelected = function(facilityId) {
      return placesOfCareModel.getSelectedFacility().id === facilityId;
    };

  }
}());
