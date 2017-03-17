(function () {
  'use strict';

  angular
    .module('core')
    .controller('ReviewDetailsController', ReviewDetailsController)
    .controller('CollapseController', CollapseController)
    .controller('TabController', TabController);

  function ReviewDetailsController ($scope, $rootScope, $http, placesOfCareModel, costOfCareModel, searchCriteriaModel) {
    var vm = this;

    $scope.initialComments = 3;
    $scope.initialFacilityCharts = 3;
    $scope.initialReviews = 4;
    $scope.maxComments = 10;
    $scope.maxReviews = 10;
    $scope.ratingsAndCommentsId = 'ratings-and-comments';

    $('.close, .close-button').on('click', function() {
      $scope.error = $scope.success = null;
    });

    // this should probably be refactored to showPractitionerQuality()
    $scope.getDoctor = function () {
      var practitioner = costOfCareModel.getPractitionerOfCare();

      return (practitioner && practitioner.id) ? practitioner : {};
    };

    $scope.getPractitionerProviderInfo = function () {
      return costOfCareModel.getPractitionerProviderInfo();
    };

    $scope.getPractitionerQuality = function () {
      return costOfCareModel.getPractitionerQuality();
    };

    $scope.getFacility = function () {
      var facility = costOfCareModel.getPlaceOfCare();

      return (facility && facility.id) ? facility : placesOfCareModel.getSelectedFacility();
    };

    $scope.getFacilityProviderInfo = function () {
      return costOfCareModel.getFacilityProviderInfo();
    };

    $scope.getFacilityQuality = function () {
      return costOfCareModel.getFacilityQuality();
    };

    $scope.getCostOfCare = function () {
      return costOfCareModel.getCostOfCare();
    };

    $scope.getEpisodeOfCare = function () {
      return costOfCareModel.getEpisodeOfCare();
    };

    $scope.getNationalComparison = function () {
      return costOfCareModel.getNationalComparison();
    };

    $scope.getProviderInfoByType = function (tabSelection) {
      if (tabSelection.indexOf('facility') > -1) {
        return costOfCareModel.getFacilityProviderInfo();
      }
      if (tabSelection.indexOf('practitioner') > -1) {
        return costOfCareModel.getPractitionerProviderInfo();
      }

    };

    $scope.isEmptyObject = function (obj) {
      return jQuery.isEmptyObject(obj);
    };

    $scope.isOverallRating = function (reviewObj) {
      return reviewObj.key === 'Overall Rating';
    };

    $scope.isQualityTypeBool = function (qualityObj) {
      return qualityObj.type === 'B';
    };

    $scope.isQualityTypeRating = function (qualityObj) {
      return qualityObj.type === 'R';
    };

    $scope.isQualityTypeText = function (qualityObj) {
      return qualityObj.type === 'T';
    };

    $scope.isSelectedFacilityReport = function (valueObj) {
      return (valueObj.key === 'Place Of Service');
    };

    $scope.facilityQualityReportColorClass = function (valueObj) {
      // this could probably be improved by enumerating key types
      var classes = 'val';
      if (valueObj.key === 'State') {
        classes += ' blue';
      }
      if ($scope.isSelectedFacilityReport(valueObj)) {
        classes += ' green';
      }
      return classes;
    };

    $scope.facilityQualityReportTriangleClass = function (valueObj) {
      return ($scope.isSelectedFacilityReport(valueObj)) ? 'glyphicon-triangle-bottom' : 'glyphicon-triangle-top';
    };

    $scope.scrollToRatings = function () {
      $('body').animate({
        scrollTop: jQuery('#' + $scope.ratingsAndCommentsId).offset().top - 90
      }, 'slow');
    };

    $scope.$on('facilitySelected', function () {
      // display a loading icon;
      var cocParams = {
        eocCode: searchCriteriaModel.episodeOfCare.getEocCodeParam(),
        placeOfServiceId: placesOfCareModel.getSelectedFacility().id,
        practitionerId: placesOfCareModel.getSelectedDoctorId()
      };
      costOfCareModel.show(cocParams);
      costOfCareModel.showNationalComparison(cocParams);
      costOfCareModel.showQualityInfo(cocParams);
      costOfCareModel.showProviderInfo(cocParams);
    });

    $scope.shareRate = function (isValid) {

      $scope.success = $scope.errors = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'vm.shareForm');
        return false;
      }

      var costOfCareInfo = {
        eoc: searchCriteriaModel.episodeOfCare.getId(),
        placeOfServiceId: placesOfCareModel.getSelectedFacility().id,
        practitionerId: placesOfCareModel.getSelectedDoctorId()
      };

      var inviteInfo = {
        from: $scope.shareName,
        recipient: $scope.shareRecipientName,
        recipientAddress: $scope.shareRecipientEmail
      };
      $http.post('/api/share/email', {
        costOfCareInfo: costOfCareInfo,
        inviteInfo: inviteInfo
      }).success(function (response) {
        console.log(response);
        $scope.success = response.message;
        $scope.$broadcast('show-errors-reset', 'vm.shareForm');
      }).error(function (response) {
        $scope.errors = response;
      });
    };

    $scope.inviteDoctor = function (isValid) {
      $scope.success = $scope.errors = null;
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'vm.inviteForm');
        return false;
      }
      var costOfCareInfo = {
        eoc: searchCriteriaModel.episodeOfCare.getId(),
        placeOfServiceId: placesOfCareModel.getSelectedFacility().id,
        practitionerId: placesOfCareModel.getSelectedDoctorId()
      };

      var inviteInfo = {
        invitedBy: $scope.inviteName,
        practitionerName: $scope.inviteRecipientName,
        practitionerEmail: $scope.inviteRecipientEmail
      };
      $http.post('/api/invites', {
        costOfCareInfo: costOfCareInfo,
        inviteInfo: inviteInfo
      }).success(function (response) {
        console.log(response);
        $scope.success = response.message;
        $scope.$broadcast('show-errors-reset', 'vm.inviteForm');
      }).error(function (response) {
        $scope.errors = response;
      });
    };
  }

  function CollapseController ($scope) {
    $scope.isCollapsed = true;
  }

  function TabController ($scope) {

    $scope.currentTab = '';

    $scope.onClickTab = function (tabUrl) {
      $scope.currentTab = tabUrl;
    };

    $scope.isActiveTab = function (tabUrl) {
      return tabUrl === $scope.currentTab;
    };
    $scope.$on('facilitySelected', function () {
      $scope.currentTab = 'tab-qualityInfo-practitioner';
    });
  }

}());
