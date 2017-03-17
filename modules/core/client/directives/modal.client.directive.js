(function () {
  'use strict';

  var app = angular.module('core');

  app.directive('modal', function ($parse, $timeout) {
    return {
      restrict: 'A',
      scope: {
        onModalOpen: '&',
        modalOpenWhen: '=modalOpenWhen'
      },
      controller: function () {
        var vm = this.commonInstance = {};
        vm.openers = [];

        vm.addOpener = function (opener) {
          vm.openers.push(opener[0]);
        };

        vm.removeOpener = function (opener) {
          vm.openers.splice(vm.openers.indexOf(opener[0]), 1);
        };
      },
      link: function ($scope, element, attrs, $parentScope) {
        var modalInstance = new Modal({
          holder: element[0],
          openers: $parentScope.commonInstance.openers,
          popup: $parentScope.commonInstance.popup,
          onOpen: function() {
            if (attrs.onModalOpen) {
              var fn = $parse(attrs.onModalOpen);
              fn($scope.$parent);
            }
            // $scope.$parent.$apply();
            $scope.$apply();
          }
        });

        element.on('$destroy', function () {
          modalInstance.destroy();
        });

        $(element[0]).find('.close, .close-button').on('click', function() {
          modalInstance.hide();
        });

        $scope.$watch('modalOpenWhen', function(value) {
          if (value) {
            $scope.modalOpenWhen = false;
            $timeout(function() {
              modalInstance.show();
            });
          }
        });
      }
    };
  })
    .directive('modalOpener', [function () {
      return {
        restrict: 'A',
        require: '^modal',
        link: function (scope, element, attrs, parentScope) {
          parentScope.commonInstance.addOpener(element);

          element.on('$destroy', function () {
            parentScope.commonInstance.removeOpener(element);
          });
        }
      };
    }])
    .directive('modalBox', [function () {
      return {
        restrict: 'A',
        require: '^modal',
        link: function (scope, element, attrs, parentScope) {
          parentScope.commonInstance.popup = element[0];
        }
      };
    }]);

  function Modal(options) {
    this.options = angular.extend({
      activeClass: 'active',
      overlayStructure: '<div class="bg-overlay">'
    }, options);

    this.holder = this.options.holder;
    this.openers = this.options.openers;
    this.popup = this.options.popup;
    this.attachEvents();
  }

  Modal.prototype = {
    attachEvents: function () {
      var self = this;

      this.outsideClickHandler = function (e) {
        var modalBox = e.target.closest('[modal-box]');
        var opener = e.target.closest('[modal-opener]');

        if (
          !(modalBox && modalBox.closest('[modal]') === self.holder)
          && !(opener && opener.closest('[modal]') === self.holder)
          && !e.target.closest('.pac-container')
        ) {
          e.preventDefault();
          e.stopPropagation();

          self.hide();
        }
      };

      this.toggleHandler = function (e) {
        e.preventDefault();
        self[self.isOpen ? 'hide' : 'show']();
      };

      this.refreshEvents();
    },
    refreshEvents: function () {
      var self = this;

      angular.forEach(this.openers, function (opener) {
        angular.element(opener).on('click', self.toggleHandler);
      });
    },
    show: function () {
      this.isOpen = true;
      this.overlay = document.querySelector('body').appendChild(angular.element(this.options.overlayStructure)[0]);
      angular.element(this.holder).addClass(this.options.activeClass);
      $(document).on('mousedown.modal touchstart.modal', this.outsideClickHandler);

      if (angular.isFunction(this.options.onOpen)) {
        this.options.onOpen();
      }

      $(document.querySelector('body')).css('overflow', 'hidden');
      $(this.overlay).on('wheel touchmove', function(e) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      });
    },
    hide: function () {
      this.isOpen = false;
      angular.element(this.holder).removeClass(this.options.activeClass);
      $(document).off('mousedown.modal touchstart.modal');
      document.querySelector('body').removeChild(this.overlay);

      $(document.querySelector('body')).css('overflow', '');
    },
    destroy: function () {
      var self = this;

      document.removeEventListener('click', this.outsideClickHandler);
      try {
        document.querySelector('body').removeChild(this.overlay);
      } catch (err) {
        console.log(err);
      }
      angular.forEach(this.openers, function (opener) {
        angular.element(opener).off('click', self.toggleHandler);
      });
    }
  };

}());
