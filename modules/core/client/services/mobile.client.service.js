(function () {
  'use strict';

  angular
    .module('core')
    .factory('deviceService', deviceService);

  var isMobile = /Android|webOS|iPhone|iPad|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);

  function deviceService($http) {
    return {
      isMobile: function() {
        return isMobile;
      },

      isDesktopScreen: function() {
        return window.innerWidth > 1024;
      },

      isMobileScreen: function() {
        return window.innerWidth <= 1024;
      }
    };
  }
}());
