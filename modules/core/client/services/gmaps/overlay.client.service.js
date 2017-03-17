(function () {
  'use strict';

  angular
    .module('core')
    .factory('gmapsOverlayConstructorService', gmapsOverlayConstructorService);

  function gmapsOverlayConstructorService() {
    var constructorOptions = {};

    var OverlayConstructor = function(opts) {
      this.layer = null;
      this.marker = null;
      this.position = null;
      this.container = null;

      constructorOptions = angular.copy(opts);

      constructorOptions.initFn.call(this);
    };

    OverlayConstructor.prototype = new google.maps.OverlayView();

    OverlayConstructor.prototype.onAdd = function() {
      this.layer = $(this.getPanes().floatPane);
      this.layer.append(this.container);

      this.container.on('click dblclick', function(event) {
        event.stopPropagation();
      });
    };

    OverlayConstructor.prototype.draw = constructorOptions.drawFn;

    OverlayConstructor.prototype.onRemove = function() {
      this.container.remove();
    };


    return OverlayConstructor;
  }
}());
