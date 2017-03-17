(function () {
  'use strict';

  angular
    .module('core')
    .factory('searchCriteriaModel', searchCriteriaModel);

  function searchCriteriaModel($q, $timeout, placesOfCareModel, practitionersOfCareModel) {
    var criteria = {};

    var PREFERRED_PRACTITIONER = 'practitioner';
    var PREFERRED_FACILITY = 'facility';

    return {
      PREFERRED_PRACTITIONER: PREFERRED_PRACTITIONER,
      PREFERRED_FACILITY: PREFERRED_FACILITY,

      reset: function () {
        criteria = {};
      },

      resetAllExcept: function (keys) {
        var newCriteria = {};

        angular.forEach(keys, function (key) {
          newCriteria[key] = criteria[key];
        });

        criteria = newCriteria;
      },

      get: function () {
        return criteria;
      },

      set: function (newCriteria) {
        criteria = newCriteria;
      },

      loadResults: function (findLowerRates) {
        var self = this;

        return $q(function (resolve, reject) {
          $timeout(function () {
            var params = {},
              ignoreRadius = false;

            // set location
            var coords = {
              lat: self.homeLocation.get().lat,
              lng: self.homeLocation.get().lng
            };

            angular.merge(params, coords);

            params.eocCode = self.episodeOfCare.getEocCodeParam();

            // preferred practitioner or facility
            if (self.preferred.has()) {
              var preferredId = self.preferred.get().id,
                preferredIdKey = self.preferred.isPractitioner() ? 'practitionerId' : 'placeOfServiceId';

              params[preferredIdKey] = preferredId;
            }

            // radius //
            if (self.radius.get()) {
              params.radius = self.radius.get();
            }

            // cost range //
            var costRange = self.costRange.get();
            if (costRange.min !== null && costRange.min !== undefined) {
              params.minCost = costRange.min;
            }
            if (costRange.max !== null && costRange.max !== undefined) {
              params.maxCost = costRange.max;
            }

            // facility types //
            if (self.facilityTypes.has()) {
              params.placeOfServiceTypes = self.facilityTypes.get();
            }

            // in-network facilities //
            var inNetwork = self.inNetwork.get();
            if (inNetwork) {
              params.placeOfServiceInNetwork = true;
            }

            // facilities //
            if (self.facilities.has()) {
              params.placeOfServiceFilter = self.facilities.get();

              ignoreRadius = true;
            }

            if (ignoreRadius) {
              delete params.radius;
            }

            if (findLowerRates) {
              params.targetPrice = self.targetPrice.get();
              placesOfCareModel.findLowerRates(params)
                .then(function (response) {
                  if (!response) return;

                  practitionersOfCareModel.addSearchFartherPractitioners(response.data);
                  resolve();
                })
                .catch(reject);
            } else {
              placesOfCareModel.search(params)
                .then(function (placesOfCareData) {
                  if (!placesOfCareData || !placesOfCareData.results || !placesOfCareData.results.length) {
                    practitionersOfCareModel.reset();
                    return;
                  }

                  if (!ignoreRadius) {
                    self.radius.set(placesOfCareData.radius);
                    params.radius = self.radius.get();
                  } else {
                    params.radius = 1000;
                  }

                  self.costRange.setInterval(placesOfCareData.costRange);

                  return practitionersOfCareModel.search(params);
                })
                .then(function () {
                  resolve();
                })
                .catch(reject);
            }
          });
        });
      },

      radius: {
        set: function (radius) {
          criteria.radius = radius;
        },

        get: function () {
          return criteria.radius;
        }
      },

      costRange: {
        set: function (range) {
          criteria.costRange = range;
        },

        get: function () {
          return criteria.costRange || criteria.costRangeInterval || {};
        },

        setInterval: function (interval) {
          criteria.costRangeInterval = interval;
        },

        getInterval: function (interval) {
          return criteria.costRangeInterval || {};
        }
      },

      targetPrice: {
        set: function (price) {
          criteria.targetPrice = price;
        },
        get: function () {
          return criteria.targetPrice;
        }
      },

      episodeOfCare: {
        set: function (eoc) {
          criteria.episodeOfCare = eoc || {};
        },

        update: function (eoc) {
          criteria.episodeOfCare = criteria.episodeOfCare || {};
          angular.merge(criteria.episodeOfCare, eoc);
        },

        get: function () {
          return criteria.episodeOfCare || {};
        },

        getId: function () {
          return this.get().id;
        },

        getName: function () {
          return criteria.episodeOfCare ? criteria.episodeOfCare.name : null;
        },

        hasCategory: function () {
          return !!(this.getCategory().id);
        },

        setCategory: function (category) {
          criteria.episodeOfCare = criteria.episodeOfCare || {};

          criteria.episodeOfCare.category = category;
        },

        getCategory: function () {
          return (criteria.episodeOfCare && criteria.episodeOfCare.category) ? criteria.episodeOfCare.category : {};
        },

        setIsExistingPatient: function (isExistingPatient) {
          criteria.episodeOfCare.existingPatient = isExistingPatient;
        },

        getIsExistingPatient: function () {
          return criteria.episodeOfCare.existingPatient;
        },

        getEocCodeParam: function () {
          var eocCodeParam = '';
          // set episode of care
          // for office visit add field for new/existing patient
          if (this.getCategory().id === '1') {
            if (this.getIsExistingPatient() === '1') {
              eocCodeParam = 'EPV-' + this.getId();
            } else {
              eocCodeParam = 'NPV-' + this.getId();
            }
          } else {
            eocCodeParam = this.getId();
          }

          return eocCodeParam;
        }
      },

      // {lat, lng, address}
      homeLocation: {
        get: function () {
          return criteria.homeLocation || {};
        },

        set: function (location) {
          criteria.homeLocation = location;

          this.clearOriginalLocation();
        },

        clearOriginalLocation: function () {
          delete criteria.homeLocation.origLat;
          delete criteria.homeLocation.origLng;
        },

        setNewLocation: function (location) {
          var origLat = criteria.homeLocation.lat,
            origLng = criteria.homeLocation.lng;

          angular.merge(criteria.homeLocation, location);

          // store original location
          if (!this.hasOriginalLocation()) {
            criteria.homeLocation.origLat = origLat;
            criteria.homeLocation.origLng = origLng;
          }
        },

        hasOriginalLocation: function () {
          return criteria.homeLocation && criteria.homeLocation.origLat && criteria.homeLocation.origLng;
        },

        restoreOriginalLocation: function () {
          if (this.hasOriginalLocation()) {
            criteria.homeLocation.lat = criteria.homeLocation.origLat;
            criteria.homeLocation.lng = criteria.homeLocation.origLng;

            this.clearOriginalLocation();
          }
        },

        getAddress: function () {
          return criteria.homeLocation ? criteria.homeLocation.address : null;
        }
      },

      preferred: {
        get: function () {
          return criteria.preferred || {};
        },

        has: function () {
          return !!(criteria.preferred && criteria.preferred.id);
        },

        isPractitioner: function () {
          return !!(criteria.preferred && criteria.preferred.type === PREFERRED_PRACTITIONER);
        },

        isFacility: function () {
          return !!(criteria.preferred && criteria.preferred.type === PREFERRED_FACILITY);
        },

        set: function (preferred) {
          criteria.preferred = preferred;
        }
      },

      facilityTypes: {
        set: function (types) {
          criteria.facilityTypes = types;
        },

        get: function () {
          return criteria.facilityTypes || [];
        },

        has: function () {
          return criteria.facilityTypes && criteria.facilityTypes.length;
        }
      },

      inNetwork: {
        get: function () {
          return !!criteria.inNetwork;
        },

        set: function (inNetwork) {
          criteria.inNetwork = inNetwork;
        }
      },

      facilities: {
        set: function (facilities) {
          criteria.facilities = facilities;
        },

        get: function () {
          return criteria.facilities || [];
        },

        has: function () {
          return criteria.facilities && criteria.facilities.length;
        }
      }
    };
  }
}());
