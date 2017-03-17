(function () {
  'use strict';

  angular
    .module('core')
    .controller('CtaTextAreaController', CtaTextAreaController);

  function CtaTextAreaController($scope, $rootScope, practitionersOfCareModel, searchCriteriaModel, placesOfCareModel, deviceService, $element, apiService, stringService, $timeout, $sce) {

    $scope.totalCostTooltip = $sce.trustAsHtml('"Total Cost": sum of all charges or HealthCost Networks<sup>SM</sup> rates for the selected procedure.');

    var containerElement = $($element);

    $scope.hasResults = function() {
      var results = placesOfCareModel.getData().results;
      return results && results.length;
    };

    $scope.getNumberOfDoctors = function() {
      return practitionersOfCareModel.getPractitionersCount();
    };


    $scope.getProcedureCategoryId = function() {
      return searchCriteriaModel.episodeOfCare.get().category.id;
    };




    $scope.getProcedureName = function() {
      return searchCriteriaModel.episodeOfCare.getName();
    };

    function doSearch() {
      if (deviceService.isDesktopScreen()) {
        $rootScope.$broadcast('applySearch');
        $rootScope.$broadcast('doSearch');
      }
    }

    $rootScope.$on('applySearch', function() {
      $scope.selectNewDoctor = false;
      $scope.selectNewFacility = false;
      $scope.resetFacilities();
    });

    // radius //
    $scope.getSearchRadius = function() {
      return Math.round(searchCriteriaModel.radius.get());
    };

    $scope.newRadius = null;
    $scope.saveRadius = function() {
      searchCriteriaModel.radius.set($scope.newRadius);
      doSearch();
    };

    // cost-range //
    $scope.getMinCost = function() {
      return searchCriteriaModel.costRange.get().min || 0;
    };

    $scope.getMaxCost = function() {
      return searchCriteriaModel.costRange.get().max || 0;
    };

    $scope.newCostRange = [0, 0];
    $scope.saveCostRange = function() {
      searchCriteriaModel.costRange.set({
        min: $scope.newCostRange[0],
        max: $scope.newCostRange[1]
      });
      doSearch();
    };

    $scope.getCostRange = function() {
      return [$scope.getMinCost(), $scope.getMaxCost()];
    };

    $scope.getIntervalMinCost = function() {
      return searchCriteriaModel.costRange.getInterval().min || 0;
    };

    $scope.getIntervalMaxCost = function() {
      return searchCriteriaModel.costRange.getInterval().max || 0;
    };

    // location //
    $scope.getLocationAddress = function() {
      return searchCriteriaModel.homeLocation.getAddress();
    };

    $scope.newLocation = {};
    $scope.newAddress = null;
    var locationInput = containerElement.find('input[places-autocomplete]');
    var LocationAutocomplete;

    locationInput.on('focus', function() {
      locationInput.val('');

    });

    LocationAutocomplete = new google.maps.places.Autocomplete(
      locationInput[0],
      { types: ['geocode'] }
    );

    LocationAutocomplete.addListener('place_changed', function() {
      var place = LocationAutocomplete.getPlace();

      var locationData = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: locationInput.val()
      };

      $scope.newLocation = locationData;

      $scope.$apply();

      var obj = LocationAutocomplete.gm_accessors_.place;
      $.each(Object.keys(obj), function(i, key) {
        if (typeof(obj[key]) == 'object' && obj[key].hasOwnProperty('gm_accessors_')) {
          obj = obj[key].gm_accessors_.input[key];
          return false;
        }
      });
      $.each(Object.keys(obj), function(i, key) {
        if ($(obj[key]).hasClass('pac-container')) {
          obj = obj[key];
          return false;
        }
      });

      $timeout(function() {
        $(obj).empty();
      }, 100);
    });

    $scope.saveLocation = function() {
      if (!$scope.newLocation.address) return;

      searchCriteriaModel.homeLocation.set($scope.newLocation);
      $scope.resetLocation();

      doSearch();
    };

    $scope.initLocation = function() {
      $scope.resetLocation();
    };

    $scope.resetLocation = function() {
      $scope.newAddress = null;
      $scope.newLocation = {};
    };

    // preferred doctor //
    $scope.hasPreferredDoctor = function() {
      return searchCriteriaModel.preferred.isPractitioner();
    };

    $scope.getPreferredDoctorName = function() {
      return $scope.hasPreferredDoctor() ?
          searchCriteriaModel.preferred.get().name :
          '';
    };

    $scope.getPreferredDoctorFacilities = function() {
      return $scope.hasPreferredDoctor() && practitionersOfCareModel.getPreferredPractitioners()[0] ? practitionersOfCareModel.getPreferredPractitioners()[0].facilityCount : '';
    };

    $scope.selectedPreferredDoctor = {};
    $scope.newPreferredDoctor = {};
    $scope.newPreferredDoctorName = null;
    $scope.selectNewDoctor = false;

    $scope.savePreferredDoctor = function() {
      if (!$scope.selectedPreferredDoctor.name) return;

      $scope.newPreferredDoctor = $scope.selectedPreferredDoctor;
      searchCriteriaModel.preferred.set($scope.newPreferredDoctor);
      $scope.selectNewDoctor = true;
      $scope.resetPreferredDoctor();

      doSearch();
    };

    $scope.resetPreferredDoctor = function() {
      $scope.newPreferredDoctor = {
        type: searchCriteriaModel.PREFERRED_PRACTITIONER
      };
      $scope.newPreferredDoctorName = null;
    };

    $scope.selectPreferredDoctor = function(item) {
      $scope.selectedPreferredDoctor = item;
    };

    $scope.suggestPreference = function(input, type) {

      var params = {
        q: input,
        eocCode: searchCriteriaModel.episodeOfCare.getId()
      };

      if (type) {
        params.providerType = type;
      }

      return apiService('provider/search/', params).then(function(response) {
        var facilities = response.data.places_of_service && response.data.places_of_service.length ? response.data.places_of_service.map(function(item) {
          return {
            type: searchCriteriaModel.PREFERRED_FACILITY,
            name: item.place_of_service_name,
            id: item.place_of_service_id
          };
        }) : [];

        var doctors = response.data.practitioners && response.data.practitioners.length ? response.data.practitioners.map(function(item) {
          return {
            type: searchCriteriaModel.PREFERRED_PRACTITIONER,
            name: item.practitioner_display_name,
            id: item.practitioner_id
          };
        }) : [];

        return doctors.concat(facilities);
      });
    };

    // preferred facility //
    $scope.hasPreferredFacility = function() {
      return searchCriteriaModel.preferred.isFacility();
    };

    $scope.getPreferredFacilityName = function() {
      return $scope.hasPreferredFacility() ?
        searchCriteriaModel.preferred.get().name :
        '';
    };

    $scope.getPreferredFacilityDoctorsCount = function() {
      return placesOfCareModel.getPreferredFacilityDoctorsCount();
    };

    $scope.selectedPreferredFacility = {};
    $scope.newPreferredFacility = {};
    $scope.newPreferredFacilityName = null;
    $scope.selectNewFacility = false;

    $scope.savePreferredFacility = function() {
      if (!$scope.selectedPreferredFacility.name) return;

      $scope.newPreferredFacility = $scope.selectedPreferredFacility;
      searchCriteriaModel.preferred.set($scope.newPreferredFacility);
      $scope.selectNewFacility = true;
      $scope.resetPreferredFacility();

      doSearch();
    };

    $scope.resetPreferredFacility = function() {
      $scope.newPreferredFacility = {
        type: searchCriteriaModel.PREFERRED_FACILITY
      };
      $scope.newPreferredFacilityName = null;
    };

    $scope.selectPreferredFacility = function(item) {
      $scope.selectedPreferredFacility = item;
    };

    // facilities //
    var initialFacilitiesModel = {
      types: {
        H: false,
        O: false,
        ASC: false
      },
      inNetwork: false,
      facilities: {}
    };

    function checkIfFacilitiesFilterEmpty() {
      return angular.equals($scope.facilitiesModel, initialFacilitiesModel);
    }

    function checkIfFacilityTypesEmpty() {
      return angular.equals($scope.facilitiesModel.types, initialFacilitiesModel.types);
    }

    function checkIfFacilitiesEmpty() {
      return angular.equals($scope.facilitiesModel.facilities, {});
    }

    $scope.facilitiesModel = angular.copy(initialFacilitiesModel);

    $scope.newFacilitiesCount = null;

    $scope.getFacilitiesCount = function() {
      return $scope.getFacilities() && $scope.getFacilities().length;
    };

    $scope.getFilteredFacilitiesCount = function() {
      return $scope.newFacilitiesCount !== null ? $scope.newFacilitiesCount : ($scope.getFilteredFacilities() && $scope.getFilteredFacilities().length);
    };

    $scope.updateFacilityFilter = function() {
      $scope.resetFacilities();

      $scope.newFacilitiesCount = $scope.getFilteredFacilitiesCount();

      // update type filters
      angular.forEach(searchCriteriaModel.facilityTypes.get(), function(type) {
        $scope.facilitiesModel.types[type] = true;
      });

      // update in-network filter
      $scope.facilitiesModel.inNetwork = searchCriteriaModel.inNetwork.get();

      // update facility list filter
      angular.forEach(searchCriteriaModel.facilities.get(), function(facility) {
        $scope.facilitiesModel.facilities[facility] = true;
      });
    };

    $scope.resetFacilities = function() {
      // $scope.newFacilitiesCount = $scope.getFilteredFacilitiesCount();
      $scope.newFacilitiesCount = null;
      $scope.facilitiesModel = angular.copy(initialFacilitiesModel);
    };

    $scope.getFacilities = function() {
      return placesOfCareModel.getAllPlacesOfCare();
    };

    $scope.getFilteredFacilities = function() {
      return placesOfCareModel.getPlacesOfCare();
    };

    $scope.saveFacilities = function() {
      var facilityTypes = getFacilityTypes();
      searchCriteriaModel.facilityTypes.set(facilityTypes);

      var inNetwork = $scope.facilitiesModel.inNetwork;
      searchCriteriaModel.inNetwork.set(inNetwork);

      var facilities = getSelectedFacilities();
      searchCriteriaModel.facilities.set(facilities);

      doSearch();
    };

    function getFacilityTypes() {
      var types = [];

      angular.forEach($scope.facilitiesModel.types, function(isSelected, type) {
        if (isSelected) {
          types.push(type);
        }
      });

      return types.length ? types : null;
    }

    function getSelectedFacilities() {
      var facilities = [];

      angular.forEach($scope.facilitiesModel.facilities, function(isSelected, facilityId) {
        if (isSelected) {
          facilities.push(facilityId);
        }
      });

      return facilities.length ? facilities : null;
    }

    $scope.updateFacilitiesFilter = function() {
      angular.forEach($scope.facilitiesModel.facilities, function(value, key) {
        if (!value) {
          delete $scope.facilitiesModel.facilities[key];
        }
      });

      if (checkIfFacilitiesFilterEmpty()) {
        $scope.newFacilitiesCount = $scope.getFacilitiesCount();
      } else {
        var facilitiesCount = 0,
          areTypesSelected = !checkIfFacilityTypesEmpty(),
          areFacilitiesSelected = !checkIfFacilitiesEmpty(),
          isInNetworkSelected = $scope.facilitiesModel.inNetwork;

        if (!areTypesSelected && !areFacilitiesSelected && !isInNetworkSelected) {
          facilitiesCount = $scope.getFacilities().length;
        } else {
          angular.forEach($scope.getFacilities(), function(facility) {
            var facilityType = facility.type,
              facilityId = facility.id;

            var isFacilitySelected = $scope.facilitiesModel.facilities[facilityId],
              isFacilityTypeSelected = $scope.facilitiesModel.types[facilityType],
              isFacilityInNetwork = facility.inNetwork;

            var countable =
              ((!areTypesSelected && !isInNetworkSelected && areFacilitiesSelected) && (isFacilitySelected)) ||
              ((!areTypesSelected && isInNetworkSelected && !areFacilitiesSelected) && (isFacilityInNetwork)) ||
              ((!areTypesSelected && isInNetworkSelected && areFacilitiesSelected) && (isFacilityInNetwork || isFacilitySelected)) ||
              ((areTypesSelected && isInNetworkSelected && !areFacilitiesSelected) && (isFacilityInNetwork && isFacilityTypeSelected)) ||
              ((areTypesSelected && isInNetworkSelected && areFacilitiesSelected) && (isFacilityInNetwork && isFacilityTypeSelected || isFacilitySelected)) ||
              ((areTypesSelected && !isInNetworkSelected && !areFacilitiesSelected) && (isFacilityTypeSelected)) ||
              ((areTypesSelected && !isInNetworkSelected && areFacilitiesSelected) && (isFacilityTypeSelected || isFacilitySelected));

            if (countable) {
              facilitiesCount++;
            }
          });
        }

        $scope.newFacilitiesCount = facilitiesCount;
      }
    };

  }
}());
