(function () {
  'use strict';

  angular
    .module('core')
    .factory('placesOfCareModel', placesOfCareModel);

  function placesOfCareModel(apiService, $q, stringService, $rootScope) {
    var _data = {},
      selectedDoctor = {},
      selectedDoctorId = null,
      selectedFacility = {},
      facilitiesCount = 0,
      preferredFacility = null,
      facilityDoctorsCount = 0,
      lastLowerRateFacility = null;

    var TYPE_HOSPITAL = 'H',
      TYPE_OFFICE = 'O',
      TYPE_ASC = 'ASC',
      TYPE_HOME = 0;

    var typeLabels = {};
    typeLabels[TYPE_HOSPITAL] = 'Hospital';
    typeLabels[TYPE_OFFICE] = 'Office';
    typeLabels[TYPE_ASC] = 'Ambulatory Surgery Center';

    return {
      TYPE_HOSPITAL: TYPE_HOSPITAL,
      TYPE_OFFICE: TYPE_OFFICE,
      TYPE_ASC: TYPE_ASC,
      TYPE_HOME: TYPE_HOME,

      findLowerRates: function(params) {
        var self = this;

        preferredFacility = null;
        facilitiesCount = 0;
        lastLowerRateFacility = null;

        return apiService('place_of_care/find_lower_rates', params)
          .then(function(response) {
            var lowerPlaceOfCare = response.data.place_of_care,
              lowerPractitioners = response.data.practitioners_of_care;

            lowerPlaceOfCare.place_search_farther = true;

            var parsedPlace = self.parsePlace(lowerPlaceOfCare);

            if (lowerPlaceOfCare.place_of_service_practitioner_count === 1) {
              parsedPlace.place_of_service_practitioner_display_name = response.data.practitioners_of_care[0].practitioner_display_name;
              parsedPlace.place_of_service_practitioner_id = response.data.practitioners_of_care[0].practitioner_id;
            }

            var data = self.getData();
            data.resultsWithoutFilters.push(parsedPlace);
            if (parsedPlace.isVisible) {
              data.results.push(parsedPlace);
            }

            self.setData(data);

            lastLowerRateFacility = parsedPlace;

            return response;
          })
          .catch(function(response) {
            if (response.data && response.data.message && response.data.code === 404) {
              $rootScope.ModalAlert.setMessage(response.data.message);
            }
          });
      },

      search: function(params) {
        var self = this;

        self.setData({});
        preferredFacility = null;
        facilitiesCount = 0;
        lastLowerRateFacility = null;

        return apiService('place_of_care/search', params).then(function(response) {
          var responseData = response.data,
            placesOfCare,
            places = [],
            allPlaces = [],
            data = {};

          facilityDoctorsCount = 0;

          if (responseData.code === 404 || !responseData.places_of_care) {
            data = {
              results: places,
              resultsWithoutFilters: allPlaces
            };
          } else {
            placesOfCare = responseData.places_of_care;

            angular.forEach(placesOfCare, function(rawPlace) {
              var place = self.parsePlace(rawPlace);

              allPlaces.push(place);

              if (place.isVisible) {
                places.push(place);
              }

              if (place.isPreferred) {
                preferredFacility = place;
              }
            });

            data = {
              results: places,
              resultsWithoutFilters: allPlaces,
              radius: self.getAdjustedRadius(responseData.search_filters.search_radius),
              costRange: {
                min: responseData.search_filters.search_min_cost,
                max: responseData.search_filters.search_max_cost
              },
              status: responseData.search_metadata.status
            };

            facilityDoctorsCount = responseData.search_filters.preferred_place_of_care_count;
          }

          // facilitiesCount = response.data.search_metadata.total_count;
          facilitiesCount = places.length;

          self.setData(data);

          return data;
        });
      },

      getAdjustedRadius: function(radius) {
        // Adds 1 foot to radius (miles)
        if (typeof radius === 'string') {
          return parseFloat(radius) + 1 / 5280.00;
        }

        return radius + 1 / 5280.00;
      },

      parsePlace: function(rawData) {
        var placeType = this.getPlaceType(rawData.place_of_service_type);

        var parsedData = angular.merge({}, rawData, {
          id: rawData.place_of_service_id,
          lat: parseFloat(rawData.place_of_service_lat),
          lng: parseFloat(rawData.place_of_service_lng),
          inNetwork: this.isInNetwork(rawData.place_of_service_category),
          type: placeType,
          typeLabel: this.getPlaceTypeLabel(placeType),
          name: stringService.htmlDecode(rawData.place_of_service_name),
          practitionersCount: rawData.place_of_service_practitioner_count,
          isPreferred: rawData.place_of_service_preferred,
          isVisible: rawData.place_of_service_visibility,
          isSearchFarther: rawData.place_search_farther
        });

        return parsedData;
      },

      getPlaceType: function(rawType) {
        var self = this;

        var typeMap = {};

        typeMap[TYPE_OFFICE] = TYPE_OFFICE;
        typeMap[TYPE_ASC] = TYPE_ASC;
        typeMap[TYPE_HOSPITAL] = TYPE_HOSPITAL;

        var type = null;

        angular.forEach(typeMap, function(typeValue, placeType) {
          if (rawType.toLowerCase() === typeValue.toLowerCase()) {
            type = placeType;
          }
        });

        return type;
      },

      getPlaceTypeLabel: function(type) {
        return typeLabels[type];
      },

      isInNetwork: function(rawValue) {
        return rawValue.toLowerCase().match(/^in$/);
      },

      setData: function(data) {
        _data = data;
      },

      getData: function() {
        return _data;
      },

      setSelectedDoctorId: function(doctorId) {
        selectedDoctorId = doctorId;
      },

      setSelectedFacility: function(facility) {
        selectedFacility = facility;
      },

      hasSelectedFacility: function() {
        return !!selectedFacility.id;
      },

      getSelectedDoctorId: function() {
        return selectedDoctorId;
      },

      getSelectedFacility: function() {
        return selectedFacility;
      },

      clearSelectedFacility: function() {
        selectedFacility = {};
      },

      getFacilitiesCount: function() {
        return facilitiesCount;
      },

      hasPreferredFacility: function() {
        return !!preferredFacility;
      },

      getPreferredFacility: function() {
        return preferredFacility;
      },

      getPreferredFacilityDoctorsCount: function() {
        return facilityDoctorsCount;
      },

      getPlacesOfCare: function() {
        return this.getData().results;
      },

      getAllPlacesOfCare: function() {
        return this.getData().resultsWithoutFilters || this.getData().results;
      },

      getPlaceOfCareData: function(id) {
        return apiService('provider/place_of_service/' + stringService.urlEncode(id));
      },

      getCheapestPlaceOfServiceCost: function() {
        var places = this.getData();
        var cheapest = null;
        angular.forEach(places.results, function(place) {
          if (cheapest === null) {
            cheapest = place.place_of_service_min_cost;
          } else if (place.place_of_service_min_cost < cheapest) {
            cheapest = place.place_of_service_min_cost;
          }
        });
        return cheapest;
      },

      getLastLowerRatePlace: function() {
        return lastLowerRateFacility;
      }
    };
  }
}());
