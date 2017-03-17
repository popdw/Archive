var _ = require('underscore');

function Common() {}

Common.prototype.distance = function(lat1, lon1, lat2, lon2, unit) {
  var radlat1 = Math.PI * lat1 / 180;
  var radlat2 = Math.PI * lat2 / 180;
  var theta = lon1 - lon2;
  var radtheta = Math.PI * theta / 180;
  var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist);
  dist = dist * 180 / Math.PI;
  dist = dist * 60 * 1.1515;
  if (unit === 'K') { dist = dist * 1.609344; }
  if (unit === 'N') { dist = dist * 0.8684; }
  parseFloat(dist).toFixed(2);
  return dist;
};

Common.prototype.geoDistance = function(p1, p2) {
  var lat2 = p2.lat;
  var lon2 = p2.lon;
  var lat1 = p1.lat;
  var lon1 = p1.lon;

  var R = 6371; // km
// has a problem with the .toRad() method below.
  var x1 = lat2 - lat1;
  var dLat = x1.toRad();
  var x2 = lon2 - lon1;
  var dLon = x2.toRad();
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;

  return d;
};

Common.prototype.networkCategoryIntToString = function(categoryInt) {
  var categories = ['IN', 'CC', 'PR'];
  return categories[categoryInt];
};

Common.prototype.getPagination = function(req, total, count, page) {
  var nextUrl = '',
    pageCount = Math.ceil(total / count),
    nextPage = parseInt(page, 10) + 1;

  if (page < pageCount) {
    nextUrl = req.originalUrl;
    if (nextUrl.includes('page')) {
      nextUrl = nextUrl.replace(/[&?]page=\d+/, function(attr) {
        return attr.replace(/\d+/, nextPage);
      });
    } else {
      nextUrl = nextUrl + '&page=' + nextPage;
    }
  }

  return {
    'page': page,
    'per_page': count,
    'page_count': pageCount,
    'total_count': total,
    'next_results': nextUrl
  };
};

Common.prototype.formatPractitionerOfCare = function(hits, originLat, originLng, placeOfServiceId, practitionerId) {
  var self = this;
  var json = _.map(hits, function(e, key) {
    var prac = e._source;
    var pos = null;
    // Fix for minor response differents between Practitioner of Care / Search and Find Lower Rates.
    if (e.hasOwnProperty('inner_hits')) {
      pos = e.inner_hits.places_of_service.hits.hits;
    } else {
      pos = e._source.places_of_service;
      delete e._source.places_of_service;
    }

    prac = self.formatPractitioner(prac);

    prac.practitioner_places_of_service = [];
    // prac.practitioner_preferred = (practitionerId === prac.practitioner_id) ? true : false;

    if (typeof prac.practitioner_preferred === 'undefined') {
      prac.practitioner_preferred = false;
    }
    if (pos.length) {
      var pos_data = _.map(pos, function(e) {
        var source = e.hasOwnProperty('_source') ? e._source : e;
        var place = self.formatPlace(source);
        place.place_of_service_distance = self.distance(originLat, originLng, place.place_of_service_lat, place.place_of_service_lng);
        place.place_of_service_preferred = (placeOfServiceId === source.place_of_service_id);
        delete place.place_of_service_practitioner_id;
        delete place.place_of_service_practitioner_display_name;
        prac.practitioner_places_of_service.push(place);
      });
      prac.practitioner_places_of_service = _.sortBy(prac.practitioner_places_of_service, 'place_of_service_cost');
    }

    if (practitionerId === prac.practitioner_id && !prac.practitioner_preferred) {
      // preferred_prac = prac;
      return null;
    }
    return prac;
  });
  return json;
};

Common.prototype.formatPractitioner = function(obj) {
  var self = this;
  obj.practitioner_category = self.networkCategoryIntToString(obj.practitioner_category);
  obj.practitioner_specialty = obj.practitioner_practice;
  return obj;
};

Common.prototype.formatPlaceOfCare = function(hits, originLat, originLng, placeOfServiceId, practitionerId, placeOfServiceFilter) {
  var self = this;
  var result_places = _.map(hits, function(e) {
    var source = e._source;
    var obj = source.place_of_service_data;

    // Place of Service Variables
    obj = self.formatPlace(obj);
    obj.place_of_service_distance = self.distance(originLat, originLng, obj.place_of_service_lat, obj.place_of_service_lng);
    obj.place_of_service_preferred = (obj.place_of_service_id === placeOfServiceId); // _.contains(preferredPos, obj.place_of_service_id);
    obj.place_of_service_visibility = (placeOfServiceFilter === '' || placeOfServiceFilter.indexOf(obj.place_of_service_id) !== -1);

    // Practitioner Variables
    obj.place_of_service_practitioner_count = source.practitioners.length;
    obj.place_of_service_practitioner_display_name = (parseInt(obj.place_of_service_practitioner_count, 10) === 1) ? source.practitioners[0].practitioner_display_name : '';
    // Set place_of_service_practitioner_id and place_of_service_practitioner_display_name when there is only one practitioner
    if (parseInt(obj.place_of_service_practitioner_count, 10) === 1) {
      obj.place_of_service_practitioner_id = source.practitioners[0].practitioner_id;
      obj.place_of_service_practitioner_display_name = source.practitioners[0].practitioner_display_name;
    }

    // Set place_of_service_min_cost and place_of_service_max_cost
    var costs = _.map(source.practitioners, function(practitioner) {
      return practitioner.practitioner_cost;
    });
    obj.place_of_service_min_cost = Math.min.apply(null, costs);
    obj.place_of_service_max_cost = Math.max.apply(null, costs);

    // Set place_of_service_preferred from placeOfServiceId or practitionerId
    obj.place_of_service_preferred = obj.place_of_service_preferred || (_.where(source.practitioners, { 'practitioner_id': practitionerId }).length > 0);

    return obj;
  });
  return result_places;
};

Common.prototype.formatPlace = function(obj) {
  var self = this;
  obj.place_of_service_website = '';
  obj.place_of_service_lat = obj.place_of_service_location.lat;
  obj.place_of_service_lng = obj.place_of_service_location.lon;
  obj.place_of_service_category = self.networkCategoryIntToString(obj.place_of_service_category);
  delete obj.place_of_service_location;
  delete obj.place_of_service_provider_id;
  return obj;
};

// https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
Common.prototype.elasticReserved = function(string) {
  var rsv = ['+', '-', '=', '&&', '||', '>', '<', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':', '\\', '/'];

  _.each(rsv, function(rsvChar) {
    string = string.split(rsvChar).join('\\' + rsvChar);
  });

  return string;
};

module.exports = new Common();
