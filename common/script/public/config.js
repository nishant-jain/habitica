'use strict';

angular.module('habitrpg')
.config(['$httpProvider', function($httpProvider){
  $httpProvider.interceptors.push(['$q', '$rootScope', function($q, $rootScope){
    var resyncNumber = 0;
    var lastResync = 0;

    return {
      response: function(response) {
        return response;
      },
      responseError: function(response) {
        var mobileApp = !!window.env.appVersion;

        // Offline
        if (response.status == 0 ||
          // don't know why we're getting 404 here, should be 0
          (response.status == 404 && _.isEmpty(response.data))) {

          if (!mobileApp)  // skip mobile, queue actions
            $rootScope.$broadcast('responseText', window.env.t('serverUnreach'));

        // Needs refresh
        } else if (response.needRefresh) {
          if (!mobileApp) // skip mobile for now
            $rootScope.$broadcast('responseError', "The site has been updated and the page needs to refresh. The last action has not been recorded, please refresh and try again.");

        } else if (response.data.code && response.data.code === 'ACCOUNT_SUSPENDED') {
          confirm(response.data.err);
          localStorage.clear();
          window.location.href = mobileApp ? '/app/login' : '/logout'; //location.reload()

        // 400 range
        } else if (response.status < 400) {
          // never triggered because we're in responseError
          $rootScope.$broadcast('responseText', response.data.message);
        } else if (response.status < 500) {
          if (response.status === 400 && response.data.errors && _.isArray(response.data.errors)) { // bad requests with more info
            response.data.errors.forEach(function (err) {
              $rootScope.$broadcast('responseError', err.message);
            });
          } else {
            $rootScope.$broadcast('responseError', response.data.message);
          }

          if ($rootScope.User && $rootScope.User.sync) {
            if (resyncNumber < 100 && (Date.now() - lastResync) > 500) { // avoid thousands of requests when user is not found
              $rootScope.User.sync();
              resyncNumber++;
              lastResync = Date.now();
            }
          }

          // Need to reject the prompse so the error is handled correctly
          if (response.status === 401) {
            return $q.reject(response);
          }
        // Error
        } else {
          var error = window.env.t('requestError') + '<br><br>"' +
          window.env.t('error') + ' ' + (response.data.message || response.data.error || response.data || 'something went wrong') +
          '" <br><br>' + window.env.t('seeConsole');
          if (mobileApp) error = 'Error contacting the server. Please try again in a few minutes.';
          $rootScope.$broadcast('responseError500', error);
          console.error(response);
        }

        return $q.reject(response);
      }
    };
  }]);
}]);
