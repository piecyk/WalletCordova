var deps = ['ngAnimate', 'greenWalletServices'];
if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
   deps.push('ngTouch');
}
angular.module('greenWalletBaseApp', deps)
.config(['$interpolateProvider', '$httpProvider',
        function config($interpolateProvider, $httpProvider) {
    // don't conflict with Django templates
    $interpolateProvider.startSymbol('((');
    $interpolateProvider.endSymbol('))');

    // show loading indicator on http requests
    $httpProvider.interceptors.push(['$q', '$rootScope', '$timeout', 'notices',
            function($q, $rootScope, $timeout, notices) {
        return {
            'request': function(config) {
                if (config.no_loading_indicator) return config || $q.when(config);
                if (!$rootScope.is_loading) $rootScope.is_loading = 0;
                notices.setLoadingText('Loading', true);  // for requests without setLoadingText
                $rootScope.is_loading += 1;
                return config || $q.when(config);
            },
            'response': function(response) {
                if (response.config.no_loading_indicator) return response || $q.when(response);
                if (!$rootScope.is_loading) $rootScope.is_loading = 1;
                $rootScope.is_loading -= 1;
                notices.setLoadingText();  // clear it (it's one-off)
                return response || $q.when(response);
            },
            'responseError': function(rejection) {
                if (!$rootScope.is_loading) $rootScope.is_loading = 1;
                $rootScope.is_loading -= 1;
                notices.setLoadingText();  // clear it (it's one-off)
                return $q.reject(rejection);
            }
        };
    }]);

    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'x-csrftoken';
}]).config(['$compileProvider', function($compileProvider) {   
    if (window.cordova) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|bitcoin|data|file):/);
    } else if (window.chrome && chrome.storage) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|bitcoin|data|chrome-extension):/);
    } else {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|bitcoin|data):/);
    }
}
]).run(['$rootScope', function run($rootScope) {
    $rootScope.LANG = LANG;
    $rootScope.safeApply = function(fn) {  // required for 'invalid' event handling
        var phase = this.$root.$$phase;
        if(phase == '$apply' || phase == '$digest') {
            if(fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };
}]).filter('format_btc', function() {
    return function format_btc(satoshis, unit) {
        var mul = {'µBTC': '1000000', 'mBTC': '1000', 'BTC': '1'}
        satoshis = (new BigInteger((satoshis || 0).toString())).multiply(new BigInteger(mul[unit]));
        if (satoshis.compareTo(new BigInteger('0')) < 0) {
            return '-'+Bitcoin.Util.formatValue(-satoshis) + ' ' + unit;
        } else {
            return Bitcoin.Util.formatValue(satoshis) + ' ' + unit;
        }
    };
}).filter('startFrom', function() {
    return function(input, start) {
        if (!input) return input;
        start = +start; //parse to int
        return input.slice(start);
    };
}).factory('$exceptionHandler', ['$injector', '$log', function($injector, $log) {
  return function (exception, cause) {
      if (typeof exception == "string") {
          $injector.get('notices').makeNotice('error', exception);
      } else {
          $log.error.apply($log, arguments);
      }
  };
}]);
