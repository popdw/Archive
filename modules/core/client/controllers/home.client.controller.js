(function () {
  'use strict';

  angular
    .module('core')
    .controller('HomeController', HomeController);

  function HomeController($scope, $timeout, apiService, eventsService, searchCriteriaModel) {
    var existingPatientVisibility = false;
    var finalStepVisibility = false;

    var EpisodeOfCare = {
      getCode: function() {
        return searchCriteriaModel.episodeOfCare.getId();
      },

      getTitle: function() {
        return searchCriteriaModel.episodeOfCare.getName();
      },

      setValue: function(eoc) {
        searchCriteriaModel.episodeOfCare.update(eoc);
      },

      getValue: function() {
        return searchCriteriaModel.episodeOfCare.get();
      },

      hasValue: function() {
        return !!this.getCode();
      },

      reset: function() {
        this.setValue({ id: null, name: null });
      },

      isValid: function() {
        return this.hasValue();
      }

    };

    var Location = {
      setValue: function(value) {
        searchCriteriaModel.homeLocation.set(value);
      },

      getValue: function() {
        return searchCriteriaModel.homeLocation.get();
      }
    };

    var EpisodeOfCareView = {
      inputFieldVisibility: true,
      focusInput: false,
      visibility: false,
      inputValue: '',
      error: false,

      showInput: function() {
        $scope.EpisodeOfCare.reset();

        this.inputFieldVisibility = true;
        // this.focusInput = true;
        this.inputValue = '';
      },

      isTextVisible: function () {
        return !this.inputFieldVisibility || $scope.EpisodeOfCare.hasValue();
      },

      isInputVisible: function () {
        return !this.isTextVisible();
      },

      select: function(item) {
        $scope.EpisodeOfCare.setValue(item);

        this.inputFieldVisibility = false;
        this.setError(false);
      },

      isVisible: function() {
        this.visibility = this.visibility || $scope.SelectedService.has();

        return this.visibility;
      },

      hasError: function() {
        return this.error;
      },

      setError: function(error) {
        this.error = error;
      },

      reset: function() {
        this.visibility = false;
        this.inputFieldVisibility = false;
        this.inputValue = '';
        this.error = false;

        $scope.EpisodeOfCare.reset();
      }
    };

    var LocationView = {
      _place_id: null,
      _place_address: '',
      _Geocoder: null,
      _Autocomplete: null,
      _hasError: false,

      init: function() {
        var self = this;

        var inputElement = document.getElementById('homepage-location-search');

        this._Geocoder = new google.maps.Geocoder;
        this.setCurrentLocation();

        this._Autocomplete = new google.maps.places.Autocomplete(
          inputElement,
          { types: ['geocode'] }
        );

        this._Autocomplete.addListener('place_changed', function() {
          var place = self._Autocomplete.getPlace();

          self.setLocation(place, inputElement.value);

          $scope.$apply();
        });

        $scope.$watch('page', function(newValue, oldValue) {
          if (newValue === 'home' && newValue !== oldValue) {
            self._place_address = searchCriteriaModel.homeLocation.get().address;
            self._place_id = true;
          }
        });
      },

      setLocation: function(gPlace, address) {
        gPlace = gPlace || {};

        if (!gPlace.place_id) return;

        this.reset();

        this.setLocationId(gPlace.place_id);

        if (address !== undefined) {
          this.setAddress(address);
        }

        $scope.Location.setValue({
          placeId: this.getLocationId(),
          address: this.getAddress(),
          lat: gPlace.geometry.location.lat(),
          lng: gPlace.geometry.location.lng()
        });
      },

      hasLocation: function() {
        return !!this._place_id;
      },

      getAddress: function() {
        return this._place_address;
      },

      setAddress: function(address) {
        this._place_address = address;
      },

      getLocationId: function() {
        return this._place_id;
      },

      setLocationId: function(pId) {
        this._place_id = pId;
      },

      setCurrentLocation: function() {
        var self = this;

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            var coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };

            self._Geocoder.geocode({ 'location': coords }, function(results, status) {
              if (status === 'OK') {
                if (results[1]) {
                  self.setLocation(results[1], results[1].formatted_address);

                  // $scope.$apply();
                }
              }
            });
          });
        }
      },

      validate: function() {
        this._hasError = !this.hasLocation();
      },

      isValid: function() {
        return !this._hasError;
      },

      reset: function() {
        this._hasError = false;
      },

      clear: function() {
        this.setAddress('');
        this.setLocationId(null);

        $scope.Location.setValue({});
      }
    };

    var Preferred = {
      $model: '',

      set: function(value) {
        searchCriteriaModel.preferred.set(value);
      },

      get: function() {
        return searchCriteriaModel.preferred.get();
      },

      reset: function() {
        this.set({});
        this.$model = '';
      }
    };

    $scope.$watch('page', function(newValue, oldValue) {
      if (newValue === 'home' && newValue !== oldValue) {
        Preferred.$model = searchCriteriaModel.preferred.get().name;
      }
    });

    $scope.services = [];
    $scope.specialties = [];

    $scope.SelectedService = {
      init: function() {
        this.loadCategories();
      },

      loadCategories: function() {
        apiService('categories/list').then(function (response) {
          var categories = [];

          angular.forEach(response.data, function(category) {
            categories.push({
              id: category.eoc_category_id,
              description: category.eoc_category_description,
              name: category.eoc_category_name
            });
          });

          $scope.services = categories;
        });
      },

      has: function() {
        return searchCriteriaModel.episodeOfCare.hasCategory();
      },

      getName: function() {
        return searchCriteriaModel.episodeOfCare.getCategory().name;
      },

      set: function (category) {
        searchCriteriaModel.episodeOfCare.setCategory(category);

        if (this.isSpecialistVisit()) {
          populateSpecialties();
        }

        clearAllFields();

        $timeout(function() {
          EpisodeOfCareView.showInput();
        });
      },

      get: function() {
        return searchCriteriaModel.episodeOfCare.getCategory();
      },

      isSpecialistVisit: function() {
        // return this.get().id === 'cc1b92ba-6267-4ec0-8bfe-4f8eb3da2bdd';
        return this.get().id === '1';
      }
    };

    $scope.existingPatient = null;

    $scope.selectServiceDropdown = false;

    function init() {
      LocationView.init();

      $scope.SelectedService.init();

      $scope.EpisodeOfCare = EpisodeOfCare;
      $scope.Location = Location;
      $scope.Preferred = Preferred;

      $scope.EpisodeOfCareView = EpisodeOfCareView;
      $scope.LocationView = LocationView;

      eventsService.debounce('orientationchange resize', function() {
        redrawDropdown('selectServiceDropdown');
      });
    }

    function populateSpecialties() {
      if ($scope.specialties && $scope.specialties.length) return;

      apiService('specialties/list').then(function(response) {
        $scope.specialties = response.data || [];
      });
    }

    $scope.isExistingPatientVisible = function() {
      existingPatientVisibility = existingPatientVisibility || ($scope.SelectedService.isSpecialistVisit() && $scope.EpisodeOfCare.hasValue());

      return existingPatientVisibility;
    };

    $scope.isFinalStepVisible = function() {
      finalStepVisibility = finalStepVisibility || ($scope.isServiceCompleted());

      return finalStepVisibility;
    };

    $scope.isServiceCompleted = function() {
      return $scope.SelectedService.has() && $scope.EpisodeOfCare.hasValue() && (!$scope.SelectedService.isSpecialistVisit() || $scope.isPatientDefined());
    };

    $scope.isPatientDefined = function() {
      return !!$scope.existingPatient;
    };

    $scope.suggestNames = function(input) {
      return $scope.SelectedService.isSpecialistVisit() ?
          suggestSpecialties(input) :
          suggestEpisodesOfCare(input);
    };

    function suggestSpecialties(input) {
      var filteredItems = [];

      angular.forEach($scope.specialties, function(item) {
        var title = item.specialty_name,
          code = item.specialty_id;

        if (filteredItems.length < 10 && title.toLowerCase().indexOf(input.toLowerCase()) >= 0) {
          filteredItems.push({
            name: title,
            id: code
          });
        }
      });

      return filteredItems;
    }

    function suggestEpisodesOfCare(input) {
      var params = {
        eocCategoryId: $scope.SelectedService.get().id,
        q: input
      };

      return apiService('episode_of_care/search', params).then(function(response) {
        var items = response.data;

        var filteredItems = [];

        angular.forEach(items, function(item) {
          var title = item.eoc_title,
            code = item.eoc_code;

          if (title.toLowerCase().indexOf(input.toLowerCase()) >= 0) {
            filteredItems.push({
              name: title,
              id: code
            });
          }
        });

        return filteredItems;
      });
    }

    $scope.suggestPreference = function(input) {
      if (!$scope.EpisodeOfCare.hasValue()) return;

      var params = {
        q: input,
        eocCode: $scope.EpisodeOfCare.getCode()
      };

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

        var filteredItems = doctors.concat(facilities);

        // angular.forEach(facilities.concat(doctors), function(name){
        //   if(filteredItems.length < 10 && name.toLowerCase().indexOf(input.toLowerCase()) >= 0) {
        //     filteredItems.push(name);
        //   }
        // });

        return filteredItems;
      });
    };

    function redrawDropdown(dropdown) {
      if ($scope[dropdown]) {
        $timeout(function () {
          $scope[dropdown] = false;
        });
        $timeout(function () {
          $scope[dropdown] = true;
        });
      }
    }

    function clearAllFields() {
      existingPatientVisibility = false;
      finalStepVisibility = false;

      $scope.EpisodeOfCareView.reset();

      $scope.existingPatient = null;

      $scope.Preferred.reset();
      $scope.displayPreferenceName = false;

      $scope.LocationView.reset();
    }

    $scope.submit = function() {
      if (validateFields()) {
        // do search

        searchCriteriaModel.resetAllExcept(['episodeOfCare', 'homeLocation', 'preferred']);
        searchCriteriaModel.homeLocation.restoreOriginalLocation();

        window.$locationSetUrl = true;
        $scope.gotoSearchPage();
      }
    };

    function validateFields() {
      var errors = [];
      var isValid = true;

      // validate episode of care
      var eocError = !$scope.EpisodeOfCare.isValid();
      $scope.EpisodeOfCareView.setError(eocError);
      errors.push(eocError);

      // validate locationView
      $scope.LocationView.validate();
      var locationViewIsValid = $scope.LocationView.isValid();
      errors.push(!locationViewIsValid);

      // if an office visit set NPV or EPV for search params
      if ($scope.EpisodeOfCare.getValue().category.id === '1') {
        setIsExistingPatientForOfficeVisitSearchParams();
      }

      angular.forEach(errors, function(error) {
        if (error) {
          isValid = false;
          return;
        }
      });

      return isValid;
    }

    function setIsExistingPatientForOfficeVisitSearchParams() {

      searchCriteriaModel.episodeOfCare.setIsExistingPatient($scope.existingPatient);
    }
    // ======================

    init();
  }
}());
