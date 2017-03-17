(function () {
  'use strict';

  angular
    .module('core')
    .controller('CoreController', CoreController);

  var defaultPage = 'home';

  function CoreController($scope, searchCriteriaModel, deviceService, $location, episodeOfCareModel, $rootScope, placesOfCareModel, practitionersOfCareModel, $q, $timeout) {

    $scope.$$deviceServie = deviceService;
    $scope.$$searchCriteriaModel = searchCriteriaModel;

    var isPageLoaded = false;

    function init() {
      var initialUrl = $location.absUrl();

      $scope.$on('$locationChangeSuccess', function(event, newUrl, oldUrl) {
        if (window.$locationSilent || (newUrl === oldUrl && isPageLoaded)) {
          if (window.$locationSilent) {
            window.$locationSilent = false;
          }
          return;
        }

        dispatchLocation();

        isPageLoaded = true;
      });
    }

    function dispatchLocation() {
      var path = $location.path().substr(1),
        pathParts = path.split('/'),
        basePath = pathParts[0];
      var eoc;
      switch (basePath) {
        case 'search':
          if (isPageLoaded) {
            $rootScope.skipSearch = true;
            $scope.gotoSearchPage();
            break;
          }

          eoc = pathParts[1];
          var address = pathParts[2];
          var location = pathParts[3].substr(1).split(',');
          var lat = location[0];
          var lng = location[1];

          if (!angular.isDefined(eoc) ||
            !angular.isDefined(address) ||
            !angular.isDefined(lat) ||
            !angular.isDefined(lng)) {
            $scope.gotoPage(defaultPage);
            break;
          }

          episodeOfCareModel.get(eoc).then(function(eocObj) {
            searchCriteriaModel.episodeOfCare.set(eocObj);

            var homeLocation = {
              address: address,
              lat: parseFloat(lat),
              lng: parseFloat(lng)
            };
            searchCriteriaModel.homeLocation.set(homeLocation);

            window.$locationSetUrl = false;

            if ($scope.page === 'search') {
              window.$locationReplace = true;
              $scope.$broadcast('doSearch');
            } else {
              $scope.gotoSearchPage();
            }
          }).catch(function() {
            $scope.gotoPage(defaultPage);
          });

          break;

        case 'details':
          if (!isPageLoaded) {
            // display Review Details
            $scope.onlyReviewDetails = true;

            eoc = pathParts[1];
            var placeOfCare = pathParts[2];
            var practitioner = pathParts[3];

            if (!angular.isDefined(eoc) ||
              !angular.isDefined(placeOfCare) ||
              !angular.isDefined(practitioner)) {
              $scope.gotoPage(defaultPage);
              break;
            }

            $('#search-results-wrapper').hide();
            $scope.isLoading = true;

            var PractitionerPromise = practitionersOfCareModel.getPractitionerData(practitioner),
              PlaceOfCarePromise = placesOfCareModel.getPlaceOfCareData(placeOfCare),
              EpisodeOfCarePromise = episodeOfCareModel.get(eoc),
              doctor = {},
              facility = {};

            EpisodeOfCarePromise.then(function(eocData) {
              searchCriteriaModel.episodeOfCare.set(eocData);

              doctor.eocCode = eocData.id;
            });

            PractitionerPromise.then(function(response) {
              var data = response.data;

              angular.merge(doctor, {
                id: data.provider_data.provider_practitioner_id,
                name: data.provider_data.provider_name
              });
            });

            PlaceOfCarePromise.then(function(response) {
              var data = response.data;

              angular.merge(facility, {
                id: data.provider_data.provider_place_of_service_id,
                name: data.provider_data.provider_name,
                address_line_1: data.provider_data.provider_address.address_line_1,
                city: data.provider_data.provider_address.city,
                state: data.provider_data.provider_address.state,
                zip: data.provider_data.provider_address.zip
              });
            });

            $q.all([EpisodeOfCarePromise, PractitionerPromise, PlaceOfCarePromise]).then(function() {
              placesOfCareModel.setSelectedDoctorId(doctor.id);
              placesOfCareModel.setSelectedFacility(facility);

              $rootScope.detailsUrl = false;
              $rootScope.$broadcast('facilitySelected');
            })
            .finally(function() {
              $timeout(function() {
                $scope.isLoading = false;
                $('#search-results-wrapper').show();
              });
            })
            .catch(function() {
              $scope.gotoPage(defaultPage);
            });
          }

          $rootScope.skipSearch = true;
          $scope.gotoSearchPage();

          break;

        default:
          $scope.gotoPage(defaultPage);
          break;
      }
    }

    function getSearchPageParams() {
      return {};
    }

    // --------------------------------

    // for debugging !
    var hasRegistered = false;
    $scope.$watch(function() {
      if (hasRegistered) return;
      hasRegistered = true;
      // Note that we're using a private Angular method here (for now)
      $scope.$$postDigest(function() {
        hasRegistered = false;
        // put your code here //
      });
    });

    // --------------------------------

    $scope.gotoPage = function(page) {
      $scope.page = page;

      window.scroll(0, 0);
    };

    $scope.gotoSearchPage = function() {
      $scope.gotoPage('search');

    };

    $scope.gotoHomePage = function() {
      $location.path('/');
      // $scope.gotoPage('home');
    };

    $scope.gotoCtaPage = function() {
      $scope.gotoPage('cta');
    };

    $scope.getCurrentYear = function() {
      return new Date().getFullYear();
    }
    // ///////

    $rootScope.ModalAlert = {
      message: '',
      show: false,

      setMessage: function(message) {
        this.message = message;
        this.show = true;
      },

      getMessage: function() {
        return this.message;
      }
    };

    // ///////

    init();
  }
}());
