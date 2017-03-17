/* global ModalAlert */
(function () {
  'use strict';

  angular
    .module('core')
    .controller('SearchController', SearchController);

  function SearchController($scope, $rootScope, $q, apiService, eventsService, stringService, $timeout, configService, placesOfCareModel, practitionersOfCareModel, searchCriteriaModel, deviceService, logService, $routeParams, $location) {
    var Practitioners = {
      resultsContainer: null,

      init: function () {
        this.resultsContainer = $('#practitioner-results-list');

        this.autoLoadResults();
      },

      hasSearchFarther: function () {
        return this.getSearchFartherDoctors().length > 0;
      },

      hasPreferredDoctors: function () {
        return this.getPreferredDoctors().length > 0;
      },

      hasInNetwork: function () {
        return this.getInNetworkDoctors().length > 0;
      },

      hasOutNetwork: function () {
        return this.getOutNetworkDoctors().length > 0;
      },

      hasResults: function () {
        return this.hasSearchFarther() || this.hasPreferredDoctors() || this.hasInNetwork() || this.hasOutNetwork();
      },

      getSearchFartherDoctors: function () {
        return practitionersOfCareModel.getSearchFartherPractitioners();
      },

      getInNetworkDoctors: function () {
        return practitionersOfCareModel.getInNetworkPractitioners();
      },

      getOutNetworkDoctors: function () {
        return practitionersOfCareModel.getOutNetworkPractitioners();
      },

      getPreferredDoctors: function () {
        return practitionersOfCareModel.getPreferredPractitioners();
      },

      getPreferredFacility: function () {
        return placesOfCareModel.getPreferredFacility();
      },

      isLoading: function () {
        return practitionersOfCareModel.isLoading();
      },

      autoLoadResults: function () {
        var self = this;

        eventsService.debounce('scroll', function () {
          if (self.resultsContainer.is(':hidden')) return;

          if (practitionersOfCareModel.hasNextResults() && self.reachedListEnd()) {
            practitionersOfCareModel.loadNextResults();
          }
        });

        $scope.$on('practitioners-loaded', function () {
          Map.computePosition();
        });
      },

      reachedListEnd: function () {
        var c = this.resultsContainer;
        var boxes = c.find('.doctor-box');
        var distance = c.height() / boxes.length * 6;

        var bottomCoord = c.offset().top + c.height();
        if (bottomCoord === 0) return false;

        var windowBottomCoord = window.scrollY + $(window).height();

        var reachedEnd = bottomCoord - windowBottomCoord < distance;

        return reachedEnd;
      },

      getNumberOfDoctors: function () {
        return practitionersOfCareModel.getPractitionersCount();
      },

      getProcedureName: function () {
        return searchCriteriaModel.episodeOfCare.getName();
      },

      getSearchRadius: function () {
        return searchCriteriaModel.radius.get();
      },

      getPreferredPractitionerName: function () {
        return practitionersOfCareModel.hasPreferredPractitioners() ? practitionersOfCareModel.getPreferredPractitioners()[0].name : '';
      },

      preferredDoctorOutOfMap: function () {
        var status = practitionersOfCareModel.getSearchMetadata().status;

        if (status && status.message) {
          ModalAlert.setMessage(status.message);
        }
      },

      getPreferredFacilityName: function () {
        return searchCriteriaModel.preferred.isFacility() ?
          searchCriteriaModel.preferred.get().name :
          '';
      },

      preferredFacilityOutOfMap: function () {
        var status = placesOfCareModel.getData().status;

        if (status && status.message) {
          ModalAlert.setMessage(status.message);
        }
      }
    };

    var Map = {
      block: null,
      originalStyle: null,
      parent: null,
      position: null,
      $mapContainer: null,
      MapInstance: null,
      places: [],
      PlacePopup: null,
      settingBounds: false,

      init: function () {
        var self = this;

        this.block = $('#tab2');
        this.parent = $('#results-container');

        this.$mapBlock = this.parent.find('.map-block');
        this.$mapMask = this.$mapBlock.siblings('.map-mask');

        this.setOriginalStyle();

        this.makeSticky();

        this.$mapContainer = $('#search-map');
        this.$mapContainer.height('100%');

        this.PlacePopup = new PlacePopupConstructor();
      },

      setOriginalStyle: function () {
        this.originalStyle = {
          position: this.block.css('position'),
          top: this.block.css('top'),
          // width: this.block.css('width'),
          width: 'auto',
          left: this.block.css('left'),
          right: this.block.css('right'),
          height: this.block.css('height'),
          bottom: this.block.css('bottom')
        };

      },

      setContainerBounds: function () {
        if (deviceService.isDesktopScreen()) return;

        var container = this.parent.find('.map-block');

        var headerHeight = $('#header').outerHeight(true);
        var tabsHeight = $('.tabset').outerHeight(true);

        var containerHeight = $(window).height() - headerHeight - tabsHeight;

        container.height(containerHeight);
      },

      makeSticky: function () {
        var self = this;

        eventsService.on('resize orientationchange', function () {
          if ($scope.page !== 'search') return;

          self.position = null;
          self.computePosition();
        });

        eventsService.on('scroll', function () {
          if ($scope.page !== 'search') return;

          self.computePosition();
        });
      },

      computePosition: function () {
        var parentOffset = this.parent.offset().top;

        if (!parentOffset) return;

        if (!deviceService.isDesktopScreen()) {
          this.removePosition();
          this.setTabPosition();
          return;
        }

        var topOffset = this.getTopOffset();
        var parentHeight = this.parent.outerHeight();
        var blockHeight = this.block.outerHeight();

        var isOutOfBoundsTop = parentOffset < window.scrollY + topOffset;
        var isOutOfBoundsBottom = parentOffset + parentHeight < window.scrollY + blockHeight + topOffset;

        if (isOutOfBoundsBottom) {
          this.setBottomPosition();
        } else if (isOutOfBoundsTop) {
          this.setFixedPosition();
        } else {
          this.removePosition();
        }
      },

      getTopOffset: function () {
        return $('#header').outerHeight() + 10;
      },

      setFixedPosition: function () {
        if (this.position === 'fixed') return;

        this.block.css({
          position: 'fixed',
          top: this.getTopOffset(),
          left: this.$mapMask.offset().left,
          right: 'auto',
          height: this.block.height(),
          bottom: 'auto',
          width: this.$mapMask.width()
        });

        this.position = 'fixed';
      },

      setBottomPosition: function () {
        if (this.position === 'bottom') return;

        this.block.css({
          position: 'absolute',
          top: 'auto',
          // width: this.originalStyle.width,
          left: this.originalStyle.left,
          right: this.originalStyle.right,
          height: this.originalStyle.height,
          bottom: 10
        });

        this.position = 'bottom';
      },

      removePosition: function () {
        if (!this.position) return;

        this.originalStyle && this.block.css(this.originalStyle);

        this.position = null;
      },

      setTabPosition: function () {
        this.block.css({
          height: '',
          width: '',
          position: '',
          top: '',
          left: '',
          right: '',
          bottom: ''
        });

        this.setContainerBounds();
      },

      createMap: function () {
        logService('Map.createMap()');

        var self = this;

        var homeCoords = searchCriteriaModel.homeLocation.get();

        this.MapInstance = new google.maps.Map(this.$mapContainer[0], {
          zoom: 12,
          center: {
            lat: homeCoords.lat,
            lng: homeCoords.lng
          },
          // mapTypeControl: false,
          // mapTypeControlOptions: {
          //   style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          //   position: google.maps.ControlPosition.TOP_CENTER
          // },
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.LEFT_TOP
          },
          scaleControl: true,
          streetViewControl: true,
          streetViewControlOptions: {
            position: google.maps.ControlPosition.LEFT_BOTTOM
          },
          fullscreenControl: false
        });

        this.createBounds();

        if (deviceService.isMobile()) {
          this.$mapContainer.on('click', function () {
            self.closePlacePopup();
          });
        } else {
          this.MapInstance.addListener('click', function () {
            self.closePlacePopup();
          });
        }

        this.MapInstance.addListener('dragend', function () {
          $('.redo-search-button').addClass('active');
        });

        this.MapInstance.addListener('zoom_changed', function () {
          if (!self.settingBounds)
            $('.redo-search-button').addClass('active');
          self.settingBounds = false;
        });
      },

      closePlacePopup: function () {
        this.PlacePopup && this.PlacePopup.close();
      },

      createBounds: function () {
        this.mapBounds = new google.maps.LatLngBounds();
      },

      setCenter: function (coords) {
        this.MapInstance.setCenter(coords);
      },

      getCenter: function () {
        return this.MapInstance.getCenter();
      },

      loadPlaces: function () {
        logService('Map.loadPlaces()');

        var self = this;

        var placesData = placesOfCareModel.getData();
        this.displayPlaces(placesData.results);
        this.addHomePlace();
        this.centerMap();
      },

      getHomeCoords: function () {
        return $scope.Location.getCoords();
      },

      setHomeCoords: function (coords) {
        $scope.Location.setCoords(coords);
      },

      displayPlaces: function (places) {
        var self = this;

        places = places || [];

        angular.forEach(places, function (place) {
          self.addPlace(place);
        });
      },

      addHomePlace: function () {
        var homeCoords = searchCriteriaModel.homeLocation.get();

        var homePlace = {
          lat: homeCoords.lat,
          lng: homeCoords.lng,
          type: placesOfCareModel.TYPE_HOME
        };

        this.addPlace(homePlace);
      },

      addPlace: function (place) {
        var Marker = new PlaceOfCareMarkerConstructor({
          place: place,
          map: this.getMapInstance()
        });

        this.mapBounds.extend(Marker.getPosition());

        this.places.push(Marker);
      },

      removePlaces: function () {
        var self = this;

        angular.forEach(this.places, function (Place) {
          Place.setMap(null);
        });

        this.createBounds();
        this.places = [];
      },

      getMapInstance: function () {
        return this.MapInstance;
      },

      centerMap: function () {
        this.settingBounds = true;
        this.getMapInstance().fitBounds(this.mapBounds);
      },

      showPopupInfo: function (placeId) {
        angular.forEach(this.places, function (Marker) {
          if (Marker.place.id === placeId) {
            Marker.openPopup();
          }
        });
      }
    };

    var Tabs = {
      tab: 'list',
      _loadedTabs: {
        list: false,
        map: false
      },

      init: function () {
        var self = this;

        eventsService.debounce('resize orientationchange', function () {
          if (self.tab === 'map' && !deviceService.isDesktopScreen()) {
            Map.setContainerBounds();
          }
        });

      },

      _showTab: function (tab, callback) {
        var self = this;

        $timeout(function () {
          if (tab !== self.tab) {
            self.tab = tab;

            if (!self._loadedTabs[tab]) {
              $timeout(function () {
                self.onFirstLoad(tab);
              });

              self._loadedTabs[tab] = true;
            }

            callback && $.isFunction(callback) && $timeout(function () {
              callback();
            });
          }
        });
      },

      showListTab: function () {
        this._showTab('list');
      },

      showMapTab: function () {
        this._showTab('map', function () {
          Map.setContainerBounds();
        });
      },

      onFirstLoad: function (tab) {
        switch (tab) {
          case 'map':

            break;
          case 'list':
            break;
        }
      },

      isEnabled: function () {
        var enabled = $('#search-page-tabs').is(':visible');

        return enabled;
      },

      isMobile: function () {
        return deviceService.isMobileScreen();
      }

    };

    var PlaceOfCareMarkerConstructor = (function () {
      var placeOfCareTypeCssClasses = {};
      placeOfCareTypeCssClasses[placesOfCareModel.TYPE_HOSPITAL] = 'in-hospital icon-h-square';
      placeOfCareTypeCssClasses[placesOfCareModel.TYPE_ASC] = 'center icon-medkit';
      placeOfCareTypeCssClasses[placesOfCareModel.TYPE_OFFICE] = 'office icon-user-md';
      placeOfCareTypeCssClasses[placesOfCareModel.TYPE_HOME] = 'home icon-home';

      var Constructor = function (ctorArgs) {
        var self = this;

        this.map = ctorArgs.map;
        this.place = angular.copy(ctorArgs.place);

        this.location = {
          lat: this.place.lat,
          lng: this.place.lng
        };

        var initialZoom = this.map.zoom;
        this.map.addListener('idle', function () {
          if (this.zoom !== initialZoom) {
            self.setMap(ctorArgs.map);
            // self.draw();
            initialZoom = this.zoom;
          }
        });

        // hide icon when zooming
        this.map.addListener('zoom_changed', function () {
          self.setMap(null);
        });

        this.setContent(this.place);
        this.setMap(ctorArgs.map);

        setTimeout(function () {
          self.setMap(ctorArgs.map);
        });
      };

      Constructor.prototype = new google.maps.OverlayView();

      Constructor.prototype.onAdd = function () {
        var self = this;

        this.layer = $(this.getPanes().floatPane);
        this.layer.append(this.container);

        this.container.on('click dblclick', function (event) {
          event.stopPropagation();
          self.map.preventClickEvent = true;
        });

        if (this.place.type !== placesOfCareModel.TYPE_HOME) {
          // display info popup
          this.container.on('click', function () {
            self.openPopup();
          });
        }
      };

      Constructor.prototype.openPopup = function () {
        Map.PlacePopup.open(this.map, this);
      };

      Constructor.prototype.draw = function () {
        var self = this,
          cHeight = this.container.outerHeight() / 2,
          cWidth = this.container.outerWidth() / 2;

        var mapLocation = this.getMapLocation();
        this.position = this.getProjection().fromLatLngToDivPixel(mapLocation);
        this.container.css({
          top: this.position.y - cHeight,
          left: this.position.x - cWidth
        });
      };

      Constructor.prototype.getMapLocation = function () {
        var self = this;

        return {
          lat: function () {
            return self.location.lat;
          },
          lng: function () {
            return self.location.lng;
          }
        };
      };

      Constructor.prototype.onRemove = function () {
        this.container.remove();
      };

      Constructor.prototype.setContent = function (place) {
        this.container = $('<div>');

        this.container.addClass('pin');
        this.container.addClass(placeOfCareTypeCssClasses[place.type]);

        place.inNetwork && this.container.addClass('healthcost');
        place.isPreferred && this.container.addClass('selected');
      };

      Constructor.prototype.getPosition = function () {
        return this.location;
      };

      Constructor.prototype.getDivPosition = function () {
        return this.container.position();
      };

      Constructor.prototype.getDivSize = function () {
        return {
          width: this.container.outerWidth(),
          height: this.container.outerHeight()
        };
      };

      return Constructor;
    }());

    var PlacePopupConstructor = (function () {
      var Constructor = function () {
        this.container = $('#place-popup').remove();
        this.layer = null;
        this.marker = null;
        this.position = null;
      };

      Constructor.prototype = new google.maps.OverlayView();

      Constructor.prototype.onAdd = function () {
        this.layer = $(this.getPanes().floatPane);
        this.layer.append(this.container);

        this.container.on('click dblclick', function (event) {
          event.stopPropagation();
        });
      };

      Constructor.prototype.draw = function () {
        var cHeight = this.container.outerHeight() + (deviceService.isDesktopScreen() ? 16 : 9),
          cWidth = this.container.outerWidth() / 2;

        var mapLocation = this.marker.getMapLocation();
        var markerPosition = this.getProjection().fromLatLngToDivPixel(mapLocation);
        var markerSize = this.marker.getDivSize();

        this.position = {
          top: markerPosition.y - cHeight - markerSize.height / 2,
          left: markerPosition.x - cWidth
        };

        this.container.css(this.position);
      };

      Constructor.prototype.onRemove = function () {
        this.container.remove();
      };

      Constructor.prototype.open = function (map, marker) {
        var self = this;

        this._opened = true;
        this.marker = marker;
        this.setMap(map);
        this.setContent(marker.place);

        this.centerOnMap();

        var initialZoom = map.zoom;
        !this.mapIdleListener && (this.mapIdleListener = map.addListener('idle', function () {
          if (this.zoom !== initialZoom) {
            if (self._opened) {
              self.setMap(map);
            }

            initialZoom = this.zoom;
          }
        }));

        // hide popup when zooming
        !this.mapZoomListener && (map.addListener('zoom_changed', function () {
          self.setMap(null);
        }));
      };

      Constructor.prototype.centerOnMap = function () {
        var self = this;
        var markerPosition = this.marker.getPosition();
        var centerCoords = {
          lat: markerPosition.lat + 120 / Math.pow(2, this.map.getZoom()),
          lng: markerPosition.lng
        };

        setTimeout(function () {
          self.map.panTo(centerCoords);
        }, 100);

      };

      Constructor.prototype.close = function () {
        this.setMap(null);

        this._opened = false;
      };

      Constructor.prototype.setContent = function (place) {
        var self = this;
        var currencyHtml = '<sup>$</sup>';
        var doctorsText;
        var priceHtml;
        this.container.find('.title').text(place.name);
        this.container.find('.type').text(place.typeName);

        var $viewMore = this.container.find('.view-more');
        if (place.practitionersCount > 1) {
          doctorsText = place.practitionersCount + ' doctors perform the selected procedure here. Total price ranges from:';
          priceHtml = currencyHtml + stringService.formatPrice(place.place_of_service_min_cost) + ' - ' + currencyHtml + stringService.formatPrice(place.place_of_service_max_cost);
          if (place.isSearchFarther === true) {
            $viewMore.addClass('orange');
          } else {
            $viewMore.removeClass('orange');
          }
          $viewMore
            .text('SHOW ONLY THESE DOCTORS')
            .on('click', function () {
              self.close();
              searchCriteriaModel.facilities.set([place.id]);
              $scope.$broadcast('doSearch');
            });
        } else {
          doctorsText = '<b>' + place.place_of_service_practitioner_display_name + '</b> performs the selected procedure here. Total price:';
          priceHtml = currencyHtml + stringService.formatPrice(place.place_of_service_min_cost);
          if (place.isSearchFarther === true) {
            $viewMore.addClass('orange');
          } else {
            $viewMore.removeClass('orange');
          }
          $viewMore
            .text('VIEW MORE INFO')
            .on('click', function () {
              self.close();
              $scope.selectFacility(place, place.place_of_service_practitioner_id);
            });
        }

        this.container.find('.doctors-text').html(doctorsText);
        this.container.find('.price').html(priceHtml);
      };

      return Constructor;
    }());

    // ------------------------------------

    function init() {
      Practitioners.init();
      Map.init();
      Tabs.init();

      $scope.Results = Practitioners;
      $scope.TabsView = Tabs;
      $scope.showSearchFarther = false;
      $scope.deviceService = deviceService;

      $scope.$watch('page', function (page, oldPage) {
        if (oldPage !== 'search' && page === 'search') {
          if (!$rootScope.skipSearch) {
            onSearchPageDisplay();
          } else {
            $rootScope.skipSearch = false;
          }

          if ($scope.onlyReviewDetails) {
            // displayReviewDetails();
          }
        }
      });

      $scope.$on('doSearch', function () {
        window.$locationReplace = true;
        window.$locationSetUrl = true;
        doSearch();
      });

      $scope.$on('facilitySelected', function () {
        window.scrollTo(0, 0);

        if ($rootScope.detailsUrl !== false) {
          setDetailsUrl();
        } else {
          $rootScope.detailsUrl = undefined;
        }
      });

      $scope.showMap = function (setUrl) {
        placesOfCareModel.clearSelectedFacility();
        window.scrollTo(0, 0);

        if (setUrl !== false) {
          window.$locationSilent = true;
          window.$locationReplace = true;
          setLocationUrl();
        }
      };

      function setDetailsUrl() {
        var eoc = searchCriteriaModel.episodeOfCare.getEocCodeParam(),
            placeOfCare = placesOfCareModel.getSelectedFacility().id,
            practitioner = placesOfCareModel.getSelectedDoctorId();

        var path = ['details', eoc, placeOfCare, practitioner];

        window.$locationSilent = true;
        $location.path(path.join('/')).replace();
      }

      $scope.doSearch = doSearch;

      $scope.isFacilitySelected = function () {
        return placesOfCareModel.hasSelectedFacility();
      };

      $scope.selectFacility = function (facility, doctorId) {
        placesOfCareModel.setSelectedDoctorId(doctorId);
        placesOfCareModel.setSelectedFacility(facility);
        $rootScope.$broadcast('facilitySelected');
      };

      $scope.toggleKeySlide = function () {
        $('.key-list').toggleClass('visible');
      };

      $scope.redoSearch = function () {
        var mapCenter = Map.getCenter();

        searchCriteriaModel.resetAllExcept(['episodeOfCare', 'preferred', 'homeLocation']);
        searchCriteriaModel.homeLocation.setNewLocation({
          lat: mapCenter.lat(),
          lng: mapCenter.lng()
        });

        doSearch();
      };

      $scope.searchFarther = function () {
        var homeCoords = searchCriteriaModel.homeLocation.get();

        if (homeCoords.length === 0) {
          console.log('lat/lng not set from last search');
          return 0;
        }

        searchCriteriaModel.targetPrice.set(Math.ceil(placesOfCareModel.getCheapestPlaceOfServiceCost() * 0.8));
        searchCriteriaModel.loadResults(true).finally(function () {
          $scope.isLoading = false;

          $('#search-results-wrapper').show();

          if ($scope.Results.hasResults()) {
            $('#results-container').show();
            Map.loadPlaces();

            var place = placesOfCareModel.getLastLowerRatePlace();
            if (place) {
              $timeout(function () {
                Map.showPopupInfo(place.id);
              }, 840);
            }
          } else {
            $('#results-container').hide();
          }
        });
      };

      function doSearch(lowerRates) {

        $('.redo-search-button').removeClass('active');

        if (window.$locationSetUrl) {
          window.$locationSetUrl = false;
          window.$locationSilent = true;
          setLocationUrl();
        } else {
          window.$locationSetUrl = true;
        }

        $scope.onlyReviewDetails = false;

        $('#search-results-wrapper').hide();

        $scope.isLoading = true;

        searchCriteriaModel.loadResults(lowerRates).finally(function () {
          $scope.isLoading = false;

          $('#search-results-wrapper').show();

          if ($scope.Results.hasResults() || deviceService.isMobileScreen()) {
            $('#results-container').show();

            Practitioners.preferredDoctorOutOfMap();
            Practitioners.preferredFacilityOutOfMap();
            $scope.showMap(false);

            Map.computePosition();
            Map.createMap();
            Map.loadPlaces();
          } else {
            $('#results-container').hide();
          }
        });
      }

      function setLocationUrl() {
        var homeLocation = searchCriteriaModel.homeLocation.get();

        var urlParams = {
          eoc: searchCriteriaModel.episodeOfCare.getEocCodeParam(),
          location: homeLocation.address,
          lat: homeLocation.lat,
          lng: homeLocation.lng
        };

        var path = ['search', urlParams.eoc, urlParams.location, '@' + urlParams.lat + ',' + urlParams.lng].join('/');

        if (('/' + path) === $location.path()) {
          window.$locationSilent = false;
        } else {
          $location.path(path);
          if (window.$locationReplace) {
            $location.replace();
            window.$locationReplace = false;
          }
        }
      }

      function onSearchPageDisplay() {
        doSearch();
        Tabs.showListTab();
      }

    }

    // ====================================

    init();
  }
}());
