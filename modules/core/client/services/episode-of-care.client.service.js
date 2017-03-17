(function () {
  'use strict';

  angular
    .module('core')
    .factory('episodeOfCareModel', episodeOfCareModel);

  function episodeOfCareModel(apiService, $q, stringService) {

    return {
      get: function(eocCode) {
        return $q(function(resolve, reject) {
          if (!eocCode) {
            reject();
          } else {
            apiService('episode_of_care/show/' + stringService.urlEncode(eocCode)).then(function (response) {
              var data = response.data;

              if (data.eoc_code) {
                var eoc = {
                  id: data.eoc_code,
                  name: data.eoc_title,
                  category: {
                    id: data.eoc_category.eoc_category_id,
                    name: data.eoc_category.eoc_category_name,
                    description: data.eoc_category.eoc_category_description
                  }
                };

                resolve(eoc);
              } else {
                reject();
              }
            });
          }
        });
      }
    };
  }
}());
