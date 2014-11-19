function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

var Timer = function(duration, checkInterval, listener, iteratedFunctions) {
    var _endsIn = duration || 1000;
    var _checkInterval = checkInterval || 250;
    var _listener = listener;
    var _iteratedFunctions = iteratedFunctions;
    var _isStarted = false;
    var _countDown = duration;
    var _timerId = null;
    var self = this;

    this.start = function() {
        _isStarted = true;

        _timerId = window.setInterval(checkIfTimeEnded, _checkInterval);
    };

    this.isStarted = function () {
        return _isStarted;
    };

    this.stop = function() {
        _isStarted = false;

        if(_timerId) window.clearInterval(_timerId);
    };

    this.restart = function () {
        if(_isStarted) self.stop();
        
        _countDown = _endsIn;

        self.start();
    };

    this.endsIn = function () {
        return _countDown;
    };

    var callListener = function () {
        if(_listener) _listener.call(this);
    };
    

    var callIteratedFunctions = function () {
        if(_iteratedFunctions) {
            for (var i = 0; i<_iteratedFunctions.length; i++) {
                if(isFunction(_iteratedFunctions[i]))
                    _iteratedFunctions[i].call(this);
            }
        }
    };

    var checkIfTimeEnded = function () {
        //console.log("milliseconds left: " + self.endsIn());
        callIteratedFunctions();

        if(_countDown > 0) {
            _countDown -= _checkInterval;
        } else {
            self.stop();
            callListener();
        }
    }
}; 