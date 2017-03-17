(function () {
  'use strict';

  angular
    .module('core')
    .factory('practitionersOfCareModel', practitionersOfCareModel);

  var inNetworkDoctorsMocked = [
    { name: 'Steve Smith, MD', practice: 'Urologist',
      facilities: [
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true },
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800 },
        { type: 'INPATIENT HOSPITAL', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true },
        { type: 'INPATIENT HOSPITAL', distance: 2.1, name: 'Wayne Medical Center', cost: 1800 },
        { type: 'Office', distance: 2.1, name: 'Wayne Medical Center', cost: 1800 },
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true }
      ]
    },
    { name: 'Joe Stevenson, MD', practice: 'Pedicurist',
      facilities: [
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800 },
        { type: 'INPATIENT HOSPITAL', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true },
        { type: 'Office', distance: 2.1, name: 'Wayne Medical Center', cost: 1800 },
        { type: 'INPATIENT HOSPITAL', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800 },
        { type: 'Office', distance: 2.1, name: 'Wayne Medical Center', cost: 1800, inNetwork: true },
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true }
      ]
    }
  ];

  var outNetworkDoctorsMocked = [
    { name: 'Steve Smith, MD', practice: 'Urologist',
      facilities: [
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true },
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800 },
        { type: 'INPATIENT HOSPITAL', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true },
        { type: 'INPATIENT HOSPITAL', distance: 2.1, name: 'Wayne Medical Center', cost: 1800 },
        { type: 'Office', distance: 2.1, name: 'Wayne Medical Center', cost: 1800 },
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true }
      ]
    },
    { name: 'Joe Stevenson, MD', practice: 'Pedicurist',
      facilities: [
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800 },
        { type: 'INPATIENT HOSPITAL', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true },
        { type: 'Office', distance: 2.1, name: 'Wayne Medical Center', cost: 1800 },
        { type: 'INPATIENT HOSPITAL', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800 },
        { type: 'Office', distance: 2.1, name: 'Wayne Medical Center', cost: 1800, inNetwork: true },
        { type: 'Office', distance: 2.1, name: 'Clifton Surgical Center', cost: 1800, inNetwork: true }
      ]
    }
  ];

  function practitionersOfCareModel(apiService, $q, stringService, $rootScope, $timeout, placesOfCareModel) {
    var inNetworkPractitioners = [],
      outNetworkPractitioners = [],
      preferredPractitioners = [],
      searchFartherPractitioners = [],
      pageIndex = 1,
      totalPages,
      itemsPerPage = 10,
      searchParams = {},
      loading = false,
      practitionersCount,
      searchMetaData = {};

    function parseResults(results) {
      var practitioners = results.practitioners_of_care || [];
      angular.forEach(practitioners, function(practitionerData) {
        var practitioner = {};
        var facilities = [];

        // check if facilities exist
        if (practitionerData.practitioner_places_of_service && practitionerData.practitioner_places_of_service.length) {
          angular.forEach(practitionerData.practitioner_places_of_service, function(facilityData) {
            var facility = parseFacility(facilityData);

            facilities.push(facility);
          });

          practitioner = parsePractitioner(practitionerData);

          practitioner.facilities = parseFacilities(facilities);

 
          if(practitioner.isSearchFarther) {
            //Add practitioners in ascending order
            var tempArray = searchFartherPractitioners.slice(0);
            tempArray.unshift(practitioner);
            searchFartherPractitioners = tempArray;
          }
          else if(practitioner.isPreferred) {
 
            preferredPractitioners.push(practitioner);
          } else if (practitioner.inNetwork) {
            inNetworkPractitioners.push(practitioner);
          } else {
            outNetworkPractitioners.push(practitioner);
          }
        }
      });
    }

    function parseFacility(rawData) {
      var parsedData = placesOfCareModel.parsePlace(rawData);

      return angular.merge({}, parsedData, {
        distance: parseFloat(rawData.place_of_service_distance).toFixed(1),
        cost: rawData.place_of_service_cost,
        address_line_1: rawData.place_of_service_address.address_line_1,
        address_line_2: '',
        city: rawData.place_of_service_address.city,
        state: rawData.place_of_service_address.state,
        zip: rawData.place_of_service_address.zip
      });
    }

    function parsePractitioner(rawData) {
      return {
        id: rawData.practitioner_id,
        name: stringService.htmlDecode(rawData.practitioner_display_name),
        gender: rawData.practitioner_gender,
        practice: stringService.htmlDecode(rawData.practitioner_specialty),
        inNetwork: rawData.practitioner_category && rawData.practitioner_category.toLowerCase() === 'in',
        isPreferred: rawData.practitioner_preferred,
        isSearchFarther: rawData.practitioner_search_farther,
        facilityCount: rawData.practitioner_places_of_service.length,
        eocCode: rawData.eoc_code
      };
    }

    function parseFacilities(facilities) {
      return facilities.sort(function(a, b) {
        if (a.inNetwork < b.inNetwork) {
          return 1;
        } else if (a.inNetwork > b.inNetwork) {
          return -1;
        } else {
          if (a.cost < b.cost) {
            return -1;
          } else if (a.cost > b.cost) {
            return 1;
          } else {
            return 0;
          }
        }
      });
    }

    function getSearchOptions() {
      return {
        page: pageIndex,
        count: itemsPerPage
      };
    }

    function resetResults() {
      pageIndex = 1;
      inNetworkPractitioners = [];
      searchFartherPractitioners = [];
      outNetworkPractitioners = [];
      preferredPractitioners = [];
      searchMetaData = {};
      practitionersCount = 0;
    }

    function storeMetaData(data) {
      if (data.hasOwnProperty('search_metadata')) {
        var metaData = data.search_metadata;
        searchMetaData = data.search_metadata;

        totalPages = metaData.page_count;
        practitionersCount = metaData.total_count;
      }
    }

    function storeSearchParams(params) {
      searchParams = params;
    }

    function getStoredSearchParams() {
      var sP = searchParams;

      sP.page = pageIndex;

      return sP;
    }

    function incrementPage() {
      pageIndex++;
    }

    function hasNextPage() {
      return pageIndex < totalPages;
    }

    function apiRequest(params) {
      loading = true;

      return apiService('practitioner_of_care/search', params).then(function(response) {
        parseResults(response.data);
        loading = false;
        $timeout(function() {
          $rootScope.$broadcast('practitioners-loaded');
        });

        return response.data;
      });
    }

    return {
      getSearchFartherPractitioners: function() {
        return searchFartherPractitioners;
      },

      getInNetworkPractitioners: function() {
        return inNetworkPractitioners;
      },

      getOutNetworkPractitioners: function() {
        return outNetworkPractitioners;
      },

      getPreferredPractitioners: function() {
        return preferredPractitioners;
      },

      hasPreferredPractitioners: function() {
        return preferredPractitioners.length > 0;
      },

      addSearchFartherPractitioners: function(response) {
        angular.forEach(response.practitioners_of_care, function(practitioner) {
          practitioner.practitioner_search_farther = true;
        });
        parseResults(response);
      },

      reset: function() {
        resetResults();
      },

      search: function(params) {
        var self = this;

        resetResults();

        return $q(function(resolve, reject) {
          var searchOptions = getSearchOptions();
          var searchParams = angular.merge({}, params, searchOptions);

          storeSearchParams(searchParams);

          apiRequest(searchParams).then(function(data) {
            storeMetaData(data);
            resolve();
          });
        });
      },

      loadNextResults: function() {
        var self = this;

        if (!hasNextPage()) return;

        incrementPage();

        return $q(function(resolve, reject) {
          var params = getStoredSearchParams();

          apiRequest(params).then(function(data) {
            resolve();
          });
        });
      },

      hasNextResults: hasNextPage,

      isLoading: function() {
        return loading;
      },

      getPractitionersCount: function() {
        return practitionersCount;
      },

      getPractitionerData: function(id) {
        return apiService('provider/practitioner/' + stringService.urlEncode(id));
      },

      getSearchMetadata: function() {
        return searchMetaData;
      }
    };
  }
}());
