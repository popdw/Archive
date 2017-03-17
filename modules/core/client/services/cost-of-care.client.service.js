(function () {
  'use strict';

  angular
    .module('core')
    .factory('costOfCareModel', costOfCareModel);

  function costOfCareModel(apiService, $q, stringService, $timeout) {
    var costOfCare = {},
      episodeOfCare = {},
      placeOfCare = {},
      practitionerOfCare = {},
      nationalComparison = [],
      nationalComparisonTimeout = null,
      providerInfo = {
        practitioner: {
          comments: [],
          reviews: [],
          data: {}
        },
        facility: {
          comments: [],
          reviews: [],
          data: {}
        }
      },
      qualityInfo = {
        practitioner: [],
        facility: {
          ratings: {},
          reports: []
        }
      };

    // enumerate CoC types
    var TYPE_TOTAL_EPISODE = 1,
      TYPE_TOTAL_OFFICE = 2,
      TYPE_COMPONENT_PRAC = 3,
      TYPE_COMPONENT_POS = 4,
      TYPE_COMPONENT_ANS = 5;

    var typeLabels = {};
    typeLabels[TYPE_TOTAL_EPISODE] = null;
    typeLabels[TYPE_TOTAL_OFFICE] = null;
    typeLabels[TYPE_COMPONENT_PRAC] = 'HealthCost Network Doctor';
    typeLabels[TYPE_COMPONENT_POS] = 'HealthCost Network Facility';
    typeLabels[TYPE_COMPONENT_ANS] = null;

    function parseResult(result) {
      var cocWrapper = [],
        parsedResult;
      cocWrapper.push(result.cost_of_care);
      parsedResult = parseCostBreakdown(cocWrapper);
      if (parsedResult !== null)
        costOfCare = parsedResult.shift();

      episodeOfCare = parseEoc(result.episode_of_care);
      placeOfCare = parseFacility(result.place_of_care);
      practitionerOfCare = parsePracitioner(result.practitioner_of_care);
    }

    function parseCostBreakdown(breakdownArray) {
      if (breakdownArray === undefined || breakdownArray === null || angular.isArray(breakdownArray) && !breakdownArray.length)
        return null;
      var costs = [];
      angular.forEach(breakdownArray, function(costData) {
        var costType = getCostType(costData.type),
          inNetwork = costData.in_network;

        var cost = {
          chargesCost: costData.charges_cost,
          costBreakdown: parseCostBreakdown(costData.cost_breakdown),
          inNetwork: inNetwork,
          medicareCost: costData.medicare_cost,
          title: costData.title,
          type: costType,
          typeLabel: (inNetwork) ? getCostTypeLabel(costType) : null,
          note: costData.note
        };
        costs.push(cost);
      });
      return costs;
    }

    function getCostType(rawType) {
      var typeMap = {};
      typeMap[TYPE_TOTAL_EPISODE] = /^TCEOC$/;
      typeMap[TYPE_TOTAL_OFFICE] = /^TCOV$/;
      typeMap[TYPE_COMPONENT_PRAC] = /^CCPRAC$/;
      typeMap[TYPE_COMPONENT_POS] = /^CCPOS$/;
      typeMap[TYPE_COMPONENT_ANS] = /^CCANS$/;

      var type = null;

      angular.forEach(typeMap, function(matchExp, placeType) {
        if (rawType.toUpperCase().match(matchExp)) {
          type = placeType;
        }
      });

      return type;
    }

    function getCostTypeLabel(costType) {
      return typeLabels[costType];
    }

    function parseEoc(rawData) {
      return {
        id: rawData.eoc_code,
        title: rawData.eoc_title
      };
    }

    function parseFacility(rawData) {
      return angular.merge({}, rawData, {
        id: rawData.place_of_service_id,
        lat: parseFloat(rawData.place_of_service_lat),
        lng: parseFloat(rawData.place_of_service_lng),
        name: stringService.htmlDecode(rawData.place_of_service_name),
        address_line_1: rawData.place_of_service_address.address_line_1,
        address_line_2: rawData.place_of_service_address.address_line_2,
        city: rawData.place_of_service_address.city,
        state: rawData.place_of_service_address.state,
        zip: rawData.place_of_service_address.zip,
        inNetwork: rawData.place_of_service_category && rawData.place_of_service_category.toLowerCase() === 'in'
      });
    }

    function parseFacilityProviderInfo(rawData) {
      angular.forEach(rawData.comments_data, function(commentObj) {
        if (commentObj._type !== 'comments')
          return;
        providerInfo.facility.comments.push({
          author: commentObj._source.author,
          comment: commentObj._source.comment,
          value: commentObj._source.value,
          datetime: commentObj._source.date
        });
      });

      angular.forEach(rawData.reviews_data, function(reviewObj) {
        if (reviewObj._type !== 'reviews')
          return;
        providerInfo.facility.reviews.push({
          count: reviewObj._source.count,
          key: reviewObj._source.key,
          tooltip: reviewObj._source.tooltip,
          value: reviewObj._source.value
        });
      });

      var data = rawData.provider_data,
        socialMediaObj = {};

      if (data.provider_social_media_settings.facebook_handle)
        socialMediaObj.facebook = data.provider_social_media_settings.facebook_handle;
      if (data.provider_social_media_settings.linkedin_handle)
        socialMediaObj.linkedin = data.provider_social_media_settings.linkedin_handle;
      if (data.provider_social_media_settings.twitter_handle)
        socialMediaObj.twitter = data.provider_social_media_settings.twitter_handle;
      if (data.provider_social_media_settings.url)
        socialMediaObj.url = data.provider_social_media_settings.url;

      angular.forEach(data.provider_office_hours, function(hoursObj) {
        hoursObj.startTimeDateObj = new Date().setHours(hoursObj.start_time.split(':')[0]);
        hoursObj.endTimeDateObj = new Date().setHours(hoursObj.end_time.split(':')[0]);
      });

      providerInfo.facility.data = {
        imagingServices: stringService.htmlDecode(data.provider_imaging_settings),
        fax: data.provider_fax,
        labServices: stringService.htmlDecode(data.provider_lab_settings),
        officeHours: angular.copy(data.provider_office_hours),
        phone: data.provider_phone,
        portal: stringService.htmlDecode(data.provider_portal_settings),
        surgicalServices: stringService.htmlDecode(data.provider_surgical_settings),
        socialMedia: angular.copy(socialMediaObj)
      };
    }

    function parseFacilityQuality(rawData) {
      var parsedQualityObj = {};
      angular.forEach(rawData.place_of_service_quality_data, function(ratingItem) {
        var key = formatKey(ratingItem.key.replace('HCAHPS ', ''));
        delete ratingItem.key;
        parsedQualityObj[key] = angular.copy(ratingItem);
      });
      qualityInfo.facility.ratings = angular.merge({}, qualityInfo.facility.ratings, parsedQualityObj);
      angular.forEach(rawData.place_of_service_reports_data, function(report) {
        var reportObj = {
          title: report.survey_values.key,
          keys: report.keys,
          values: []
        };
        angular.forEach(report.survey_values.values, function(value) {
          // some numbers do not multiply cleanly (like 0.56), implementing a method like ECMAScript 6 Math.trunc()
          var percentValue = (truncateNumber(value.value * 100) || 0),
            valueObj = {
              key: value.key,
              decimalValue: value.value,
              percentValue: percentValue
            };
          reportObj.values.push(valueObj);
        });
        qualityInfo.facility.reports.push(reportObj);
      });
    }

    function parseNationalComparison(rawData) {
      var chartDataKey = 'episode_of_care_chart_data';
      if (rawData.hasOwnProperty(chartDataKey)) {
        var chartData = rawData[chartDataKey];

        // this function relies on another async call, and potential exists for a race condition
        if (jQuery.isEmptyObject(angular.copy(placeOfCare)) || jQuery.isEmptyObject(angular.copy(costOfCare))) {
          if (nationalComparisonTimeout !== null)
            $timeout.cancel(nationalComparisonTimeout);
          nationalComparisonTimeout = $timeout(function() {
            parseNationalComparison(rawData);
          }, 100);
          return;
        }

        var selectedInfo = {
          heading: (placeOfCare.city.toUpperCase() + ', ' + placeOfCare.state.toUpperCase()),
          subheading: placeOfCare.name,
          key: 'YOUR SELECTION',
          value: costOfCare.chargesCost,
          isSelection: true
        };
        chartData.push(selectedInfo);
        chartData = sortChartData(chartData);
        angular.forEach(chartData, function(dataObj) {
          dataObj.percentValue = truncateNumber(((dataObj.value / chartData[0].value) * 100));
          dataObj.value = dataObj.value;
          dataObj.isSelection = (dataObj.hasOwnProperty('isSelection')) ? dataObj.isSelection : false;
          nationalComparison.push(angular.copy(dataObj));
        });
      }
    }

    function sortChartData(chartData) {
      return chartData.sort(function(a, b) {return b.value - a.value;});
    }

    function parsePracitioner(rawData) {
      return angular.merge({}, rawData, {
        id: rawData.practitioner_id,
        name: stringService.htmlDecode(rawData.practitioner_display_name),
        gender: rawData.practitioner_gender,
        practice: stringService.htmlDecode(rawData.practitioner_specialty),
        inNetwork: rawData.practitioner_category && rawData.practitioner_category.toLowerCase() === 'in'
      });
    }

    function parsePractitionerProviderInfo(rawData) {
      angular.forEach(rawData.comments_data, function(commentObj) {
        if (commentObj._type !== 'comments')
          return;
        providerInfo.practitioner.comments.push({
          author: commentObj._source.author,
          comment: commentObj._source.comment,
          value: commentObj._source.value,
          datetime: commentObj._source.date
        });
      });

      angular.forEach(rawData.reviews_data, function(reviewObj) {
        if (reviewObj._type !== 'reviews')
          return;
        providerInfo.practitioner.reviews.push({
          count: reviewObj._source.count,
          key: reviewObj._source.key,
          tooltip: reviewObj._source.tooltip,
          value: reviewObj._source.value
        });
      });

      var data = rawData.provider_data,
        socialMediaObj = {};

      if (data.provider_social_media_settings.facebook_handle)
        socialMediaObj.facebook = data.provider_social_media_settings.facebook_handle;
      if (data.provider_social_media_settings.linkedin_handle)
        socialMediaObj.linkedin = data.provider_social_media_settings.linkedin_handle;
      if (data.provider_social_media_settings.twitter_handle)
        socialMediaObj.twitter = data.provider_social_media_settings.twitter_handle;
      if (data.provider_social_media_settings.url)
        socialMediaObj.url = data.provider_social_media_settings.url;

      angular.forEach(data.provider_office_hours, function(hoursObj) {
        hoursObj.startTimeDateObj = new Date().setHours(hoursObj.start_time.split(':')[0]);
        hoursObj.endTimeDateObj = new Date().setHours(hoursObj.end_time.split(':')[0]);
      });

      providerInfo.practitioner.data = {
        imagingServices: stringService.htmlDecode(data.provider_imaging_settings),
        fax: data.provider_fax,
        labServices: stringService.htmlDecode(data.provider_lab_settings),
        officeHours: angular.copy(data.provider_office_hours),
        phone: data.provider_phone,
        portal: stringService.htmlDecode(data.provider_portal_settings),
        surgicalServices: stringService.htmlDecode(data.provider_surgical_settings),
        socialMedia: angular.copy(socialMediaObj)
      };
    }

    function parsePracitionerQuality(rawData) {
      angular.forEach(rawData, function(qualityItem) {
        // parse string booleans into boolean literals
        if (qualityItem.type === 'B') {
          qualityItem.value = (qualityItem.value === 'true');
          if (!qualityItem.value)
            return;
          // @todo: is it worth putting booleans that will trigger a display at the end of the array?
        }
        qualityInfo.practitioner.push(angular.copy(qualityItem));
      });
    }

    function prepareUrlPathParameters(expectedParams, params) {
      var url = '',
        valid = true;

      angular.forEach(expectedParams, function(paramKey) {
        if (!params.hasOwnProperty(paramKey) || !validateApiParameter(params[paramKey]))
          valid = false;
        url += '/' + params[paramKey];
      });

      return (valid) ? url : null;
    }

    function validateApiParameter(param) {
      // should we also check that value looks like a UUID pattern/length?
      return (angular.isString(param) && param !== '');
    }

    function formatKey(str) {
      str = toTitleCase(str);
      return (str.charAt(0).toLowerCase() + str.substr(1).replace(/\s/g, ''));
    }

    function toTitleCase(str) {
      return str.replace(/\w\S*/g, function(txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    // this should probably be centralized in a service similar to stringService
    function truncateNumber(x) {
      if (isNaN(x) || !angular.isNumber(x))
        return 0;
      if (x > 0)
        return Math.floor(x);
      return Math.ceil(x);
    }

    return {
      TYPE_TOTAL_EPISODE: TYPE_TOTAL_EPISODE,
      TYPE_TOTAL_OFFICE: TYPE_TOTAL_OFFICE,
      TYPE_COMPONENT_PRAC: TYPE_COMPONENT_PRAC,
      TYPE_COMPONENT_POS: TYPE_COMPONENT_POS,
      TYPE_COMPONENT_ANS: TYPE_COMPONENT_ANS,

      show: function(params) {
        var self = this,
          expectedParams = ['eocCode', 'placeOfServiceId', 'practitionerId'],
          url = 'cost_of_care/show';

        // params are part of API path, so we validate and extend the URL instead of sending object for URL query params
        var urlPathParams = prepareUrlPathParameters(expectedParams, params);
        if (urlPathParams === null)
          return null;
        url += urlPathParams;

        return $q(function(resolve, reject) {
          apiService(url).then(function(response) {
            parseResult(response.data);
            resolve();
          });
        });
      },

      showNationalComparison: function(params) {
        var self = this,
          expectedParams = ['eocCode', 'placeOfServiceId', 'practitionerId'],
          url = 'cost_of_care/episode_of_care';
        self.resetNationalComparison();

        // params are part of API path, so we validate and extend the URL instead of sending object for URL query params
        var urlPathParams = prepareUrlPathParameters(expectedParams, params);
        if (urlPathParams === null)
          return null;
        url += urlPathParams;

        return $q(function(resolve, reject) {
          apiService(url).then(function(response) {
            parseNationalComparison(response.data);
            resolve();
          });
        });
      },

      showProviderInfo: function(params) {
        var self = this;
        self.resetProviderInfo();
        self.showPosProviderInfo(params);
        self.showPractitionerProviderInfo(params);
      },

      showQualityInfo: function (params) {
        var self = this;
        self.resetQualityInfo();
        self.showPosQuality(params);
        self.showPractitionerQuality(params);
      },

      showPosProviderInfo: function(params) {
        var expectedParams = ['placeOfServiceId'],
          url = 'provider/place_of_service';

        // params are part of API path, so we validate and extend the URL instead of sending object for URL query params
        var urlPathParams = prepareUrlPathParameters(expectedParams, params);
        if (urlPathParams === null)
          return null;
        url += urlPathParams;

        return $q(function(resolve, reject) {
          apiService(url).then(function(response) {
            parseFacilityProviderInfo(response.data);
            resolve();
          });
        });
      },

      showPosQuality: function(params) {
        var expectedParams = ['placeOfServiceId'],
          url = 'cost_of_care/place_of_service';

        // params are part of API path, so we validate and extend the URL instead of sending object for URL query params
        var urlPathParams = prepareUrlPathParameters(expectedParams, params);
        if (urlPathParams === null)
          return null;
        url += urlPathParams;

        return $q(function(resolve, reject) {
          apiService(url).then(function(response) {
            parseFacilityQuality(response.data);
            resolve();
          });
        });
      },

      showPractitionerProviderInfo: function(params) {
        var expectedParams = ['practitionerId'],
          url = 'provider/practitioner';

        // params are part of API path, so we validate and extend the URL instead of sending object for URL query params
        var urlPathParams = prepareUrlPathParameters(expectedParams, params);
        if (urlPathParams === null)
          return null;
        url += urlPathParams;

        return $q(function(resolve, reject) {
          apiService(url).then(function(response) {
            parsePractitionerProviderInfo(response.data);
            resolve();
          });
        });
      },

      showPractitionerQuality: function(params) {
        var expectedParams = ['practitionerId'],
          url = 'cost_of_care/practitioner';

        // params are part of API path, so we validate and extend the URL instead of sending object for URL query params
        var urlPathParams = prepareUrlPathParameters(expectedParams, params);
        if (urlPathParams === null)
          return null;
        url += urlPathParams;

        return $q(function(resolve, reject) {
          apiService(url).then(function(response) {
            parsePracitionerQuality(response.data.practitioner_quality_data);
            resolve();
          });
        });
      },

      getCostOfCare: function() {
        return costOfCare;
      },

      getEpisodeOfCare: function() {
        return episodeOfCare;
      },

      getPlaceOfCare: function() {
        return placeOfCare;
      },

      getPractitionerOfCare: function() {
        return practitionerOfCare;
      },

      getFacilityProviderInfo: function() {
        return providerInfo.facility;
      },

      getFacilityQuality: function () {
        return qualityInfo.facility;
      },

      getNationalComparison: function() {
        return nationalComparison;
      },

      getPractitionerProviderInfo: function() {
        return providerInfo.practitioner;
      },

      getPractitionerQuality: function () {
        return qualityInfo.practitioner;
      },

      resetNationalComparison: function() {
        nationalComparison = [];
      },

      resetProviderInfo: function() {
        providerInfo = {
          practitioner: {
            comments: [],
            reviews: [],
            data: {}
          },
          facility: {
            comments: [],
            reviews: [],
            data: {}
          }
        };
      },

      resetQualityInfo: function() {
        qualityInfo = {
          practitioner: [],
          facility: {
            ratings: {},
            reports: []
          }
        };
      }
    };
  }
}());
