"use strict";
var util = require( 'util'),
    Buffer = require( 'buffer' ).Buffer,

    CL_RESET    = String.fromCharCode(27)+'[0m',
    CL_BLACK    = String.fromCharCode(27)+'[30m',
    CL_RED      = String.fromCharCode(27)+'[31m',
    CL_GREEN    = String.fromCharCode(27)+'[32m',
    CL_YELLOW   = String.fromCharCode(27)+'[33m',
    CL_BLUE     = String.fromCharCode(27)+'[34m',
    CL_MAGENTA  = String.fromCharCode(27)+'[35m',
    CL_CYAN     = String.fromCharCode(27)+'[36m',
    CL_WHITE    = String.fromCharCode(27)+'[37m',

    error = new Error(),

    _console = {
        log     :   console.log,
        warn    :   console.warn,
        error   :   console.error
    },



    LL_INSPECT = -1,
    // Levels
    LL_NONE = 0,
    LL_INFO = 1,
    LL_WARN = 2,
    LL_ERROR =4,
    LL_FATAL = 8,
    LL_DEBUG = 16,

    LL_ALL = 31,

    LOG_TO_STDOUT = 32,
    LOG_TO_BUFFER = 64,
    LOG_TO_FILE = 128,

    twoCharDigit = function( digit ) {
        return parseInt( digit ) < 10 ? '0'+digit : digit;
    },

    textMessage = CL_GREEN + '[%s-%s-%s]' + CL_RESET + ' %s%s' + CL_RESET + ': ' + CL_WHITE+ ' %s' + CL_RESET + '\n' +
        CL_GREEN + '[ %s:%s:%s ]' + CL_RESET + ' %s%s',

    ErrorLevels = [ LL_NONE, LL_INFO, LL_WARN, LL_ERROR, LL_FATAL, LL_DEBUG ],
    ErrorColors = [ CL_RESET, CL_GREEN, CL_YELLOW, CL_RED, CL_MAGENTA, CL_BLUE ],
    ErrorTypes = [ 'LogOff', 'Info', 'Warning', 'Error', 'Fatal', 'Debug' ],
    ErrorSTD   = [ null, 'log', 'error', 'error', 'error', 'log' ],
    ErrorFuncs = {
        8   :   function(  ) {
            if ( arguments[ 0 ] instanceof Error ) return arguments;
            return false;
        }
    },

    Logger = function( options ) {
        var self = this;

//        if ( console.Logger instanceof Logger ) return console.Logger;

        options = options || {};

        this.options = {
            type            :   'console',
            bufferSize      :   0,
            stackTraceLimit :   15,
            colorInspect    :   true,
            logLevel        :   LL_ALL | LOG_TO_STDOUT
        };

//        _console.log( options );


        for ( var o in this.options ) {
            if ( options[ o ] ) this.options[ o ] = options[ o ];
        }

        this.buffer = function( size ) {
            var self = this;
            this.size = size;

            this.push = function(  ) {
                var args = Array.prototype.slice.apply( arguments );
                for( var i in args ) {
                    var buffer = new Buffer( args[ i ] );
                    if ( !buffer.length ) continue;

                    if ( buffer.length > self.size ) {
                        console.debug( 'Argument greate then buffer size, have %d and need %d', self.size, buffer.length );
                        continue;
                    }

                    while( self.length+buffer.length > self.size ) {
                        if ( self.buffer.length ) {
                            var shift = self.buffer.shift();
                            self.length -= shift.length;
                        }
                    }
                    self.buffer.push( args[ i ] );
                    self.length += buffer.length;
                }
                return self;
            };

            this.shift = function() {
                var buffer = self.buffer.shift();
                self.length-= buffer.length;
                return buffer;
            }

            this.flush = function() { self.buffer = [];self.length = 0; };

            this.join = function( del ) {
                return self.buffer.join( del );
            };

            this.toString = function() {
                return self.join( '' );
            };

            this.flush();

            return this;
        };

        this.stackTrace = function stackTrace( ) {
            var stack = null, message = null;
            if ( arguments[0] instanceof Error ) {

                if ( arguments[0] && !arguments[0].stack ) {
                    message = arguments[0].message || null;
                    arguments[0].message = null;
                    Error.captureStackTrace( arguments[0], this );
                }

                if ( arguments[0].message && arguments[0].stack.indexOf( arguments[0].message ) != -1 )
                    stack = arguments[0].stack.slice(arguments[0].stack.indexOf( arguments[0].message )+arguments[0].message.length);
                else stack = arguments[0].stack;

                stack = stack.split(/\n/).splice(1).join('\n');
                message = arguments[0].message;
            } else {
                Error.stackTraceLimit = this.options.stackTraceLimit;
                Error.captureStackTrace( error, this );
                stack = error.stack.split(/\n/).splice( 4 ).join('\n');
                message = error.message;
            }

            return { stack: stack, message: message };
        };

        this.formatTextLog = function formatTextError( errorLevel, script, message ) {
            var date = new Date(),
                template = util.format( textMessage,
                    twoCharDigit( date.getFullYear() ), twoCharDigit( date.getMonth()+1 ), twoCharDigit( date.getDate() ),
                    ErrorColors[ ErrorLevels.indexOf( errorLevel ) ], ErrorTypes[ ErrorLevels.indexOf( errorLevel ) ], script,
                    twoCharDigit( date.getHours() ), twoCharDigit( date.getMinutes() ), twoCharDigit( date.getSeconds() ),
                    ErrorColors[ ErrorLevels.indexOf( errorLevel ) ], message.split( /\n/ ).join( '\n             ' )
                );

            return template;
        };

        this.createMessage = function( ) {
            var stackTrace = self.stackTrace( arguments[ 0 ] ),
                script = stackTrace.stack.split( /\n/ )[1] && stackTrace.stack.split( /\n/ )[0].replace( /\ +/g, ' ' ) || 'undefined',
                message = stackTrace.message || util.format.apply( null, arguments );

            return {
                stackTrace  :   stackTrace,
                script      :   script,
                message     :   message
            };
        };

        this.Log = function( Level, Message ) {
            function _Log( ) {

                if ( !( self.options.logLevel || self.options.logLevel & Level ) ) return;

                var preMessage = ErrorFuncs[ Level ] && ErrorFuncs[ Level ].apply( null, arguments );

                if ( preMessage == false ) return;
                if ( typeof preMessage == 'undefined' ) preMessage = arguments;
                else preMessage = !Array.isArray( preMessage ) && typeof preMessage == 'object' && preMessage.length ? preMessage : [ preMessage ];

                var msg = self.createMessage.apply( null, preMessage );

//                _console.log( self.options.bufferSize, self.options.logTo );
                if ( self.options.bufferSize > 0 && self.options.logLevel & LOG_TO_BUFFER ) {
                    if ( !self._buffer ) self._buffer = new self.buffer( self.options.bufferSize );

                    msg.level = Level;
                    msg.memory = process.memoryUsage();
                    msg.date = new Date();

                    self._buffer.push( JSON.stringify( msg ) );
                    return;
                }

                var stackTrace = '\n   Trace:   ' + msg.stackTrace.stack.replace( /\ +/g, ' ' ).split( /\n/ ).splice(1).join( '\n            '),
                    message = self.formatTextLog( Level, msg.script, msg.message );

                if ( Level > 0 && ( LL_ERROR | LL_FATAL ) & Level )
                    message+= stackTrace;

                message += CL_RESET;

                _console[ ErrorSTD[ ErrorLevels.indexOf( Level ) ] ]( message );
            }

            if ( !Message ) {
                return _Log;
            } else {
                _Log.apply( null, Array.prototype.slice.apply( arguments, [1] ) );
            }
        };

        this.logLevel = function logLevel( level ) {
            self.options.logLevel = LL_ALL & level ? level : LL_NONE;
        };

        this.flush = function() {
            var object =  JSON.parse( '[' + self._buffer.join(', ') + ']' );
            self._buffer.flush();
            return object;
        };

        process.on( 'uncaughtException', function( error ) {
            if ( typeof process.exceptionCatcher == 'function' ) process.exceptionCatcher( error );

            if ( error instanceof Error )
                new self.Log( LL_FATAL )( error );
            else
                new self.Log( LL_ERROR )( error );
        } );

        return this;
    };

console.Logger = new Logger(  );

console.__defineGetter__( 'log', function() { return console.Logger.Log( LL_INFO ) } );
console.__defineGetter__( '_log', function() { return _console.log } );
console.__defineGetter__( '_error', function() { return _console.error } );
console.__defineGetter__( 'info', function() { return console.Logger.Log( LL_INFO ) } );
console.__defineGetter__( 'warn', function() { return console.Logger.Log( LL_WARN ) } );
console.__defineGetter__( 'error', function() { return console.Logger.Log( LL_ERROR ) } );
console.__defineGetter__( 'fatal', function() { return console.Logger.Log( LL_FATAL ) } );
console.__defineGetter__( 'debug', function() { return console.Logger.Log( LL_DEBUG ) } );
console.__defineGetter__( 'inspect', function() { return console.Logger.Log( LL_INSPECT ) } );

console.__defineGetter__( 'logLevel', function() { return console.Logger.logLevel } );

console.__defineGetter__( 'level', function() {
    return {
        LL_NONE     :   LL_NONE,
        LL_INFO     :   LL_INFO,
        LL_WARN     :   LL_WARN,
        LL_ERROR    :   LL_ERROR,
        LL_FATAL    :   LL_FATAL,
        LL_DEBUG    :   LL_DEBUG,
        LL_INSPECT  :   LL_INSPECT,
        LL_ALL      :   LL_ALL,
        LT_BUFFER   :   LOG_TO_BUFFER,
        LT_FILE     :   LOG_TO_FILE,
        LL_STDOUT   :   LOG_TO_STDOUT
    };
});

ErrorTypes[ -1 ] = 'Inspect';
ErrorColors[ -1 ] = CL_RESET;
ErrorSTD[ -1 ] = 'log';
ErrorLevels[ -1 ] = LL_INSPECT;
ErrorFuncs[ LL_INSPECT ] = function(  ) {
    var args = Array.prototype.slice.apply( arguments ),
        message = '';

    for( var i in args ) {
        message+= util.inspect( args[ i ], false, null, console.Logger.options.colorInspect ) + '\n';
    }

    return message;
};

//var L = new Logger({
//    logTo   :   LOG_TO_BUFFER,
//    bufferSize:     2024
//});
//
//L.Log( LL_DEBUG, 'first message' );
//L.Log( LL_INFO, 'next message' );
//L.Log( LL_INSPECT, {asd:'third message'} );
//
//console.inspect( L.flush() );

//console.Logger.logLevel( 600 );
//console.log( 'log' );
//console.warn( 'warn' );
//console.error( 'error' );
//console.fatal( 'fatal' );
//console.debug( 'debug' );
//console.log( console.Logger.options.logLevel );
//console.inspect( {first: 'one'}, { second: 'two' } );

module.exports = Logger;