"use strict";
var CL_RESET    = String.fromCharCode(27)+'[0m',
    CL_BLACK    = String.fromCharCode(27)+'[30m',
    CL_RED      = String.fromCharCode(27)+'[31m',
    CL_GREEN    = String.fromCharCode(27)+'[32m',
    CL_YELLOW   = String.fromCharCode(27)+'[33m',
    CL_BLUE     = String.fromCharCode(27)+'[34m',
    CL_MAGENTA  = String.fromCharCode(27)+'[35m',
    CL_CYAN     = String.fromCharCode(27)+'[36m',
    CL_WHITE    = String.fromCharCode(27)+'[37m',

    LG_NONE     = -1,
    LG_LOG      = 1,
    LG_WARNING  = 2,
    LG_ERROR    = 3,
    LG_FATAL    = 4,
    LG_DEBUG    = 5,
    LG_INSPECT  = 0,

    dateTemplate = '%s[%s-%s-%s] %s%s:%s\n%s[ %s:%s:%s ] %s%s',
    ErrorColors = [ CL_RESET, CL_GREEN, CL_YELLOW, CL_RED, CL_MAGENTA, CL_BLUE, CL_RESET ],
    ErrorLevels = [ LG_NONE, LG_LOG, LG_WARNING, LG_ERROR, LG_FATAL, LG_DEBUG, LG_INSPECT ],
    ErrorTypes = [ 'LogOff', 'Notice', 'Warning', 'Error', 'Fatal', 'Debug', 'Inspect' ],
    SpecialTypes = [ 'Inspect' ],
    WebTypes = [ 'WebInspect' ],
    ErrorSTD   = [ null, 'log', 'error', 'error', 'error', 'log', 'log' ],

    util = require( 'util' ),

    _console = {
        log     :   function() { process.stdout.write(util.format.apply(this, arguments) + '\n' ); },
        error   :   function() { process.stderr.write(util.format.apply(this, arguments) + '\n' ); }
    },


    error = new Error,

    defaultLogLevel = LG_DEBUG,

    buildStack = function(  ) {
        var stack = null, message = null;
        if ( arguments[0] instanceof Error ) {

            if ( arguments[0] && !arguments[0].stack ) {
                message = arguments[0].message || null;
                arguments[0].message = null;
                Error.captureStackTrace( arguments[0], this );
            }

            if ( arguments[0].stack.indexOf( arguments[0].message ) != -1 )
                stack = arguments[0].stack.slice(arguments[0].stack.indexOf( arguments[0].message )+arguments[0].message.length);
            else stack = arguments[0].stack;

            stack = stack.split(/\n/).splice(1).join('\n');
            message = arguments[0].message;
        } else {
            Error.stackTraceLimit = 15;
            Error.captureStackTrace( error, this );
            stack = error.stack.split(/\n/).splice( 4 ).join('\n');
            message = error.message;
        }


        return { stack: stack, message: message };
    },
    twoCharDigit = function( digit ) {
        return parseInt( digit ) < 10 ? '0'+digit : digit;
    },
    Logger = function( Stack, LogName, message ) {
        var logLevel = ErrorTypes.indexOf( LogName ),
            script = Stack.stack.split( /\n/ )[1] && Stack.stack.split( /\n/ )[0].replace( /\ +/g, ' ' ) || 'undefined',
            message = Stack.message || util.format.apply( null, Array.prototype.slice.apply(arguments).slice(2) ),
            stackTrace = '   Trace:   ' + Stack.stack.replace( /\ +/g, ' ' ).split( /\n/ ).splice(1).join( '\n            ' ),
            currentDate = new Date(),
            logTemplate = util.format( dateTemplate, CL_GREEN, currentDate.getFullYear()
                , twoCharDigit( currentDate.getMonth()+1 )
                , twoCharDigit( currentDate.getDate() )
                , CL_CYAN, LogName, script
                , CL_GREEN
                , twoCharDigit( currentDate.getHours() )
                , twoCharDigit( currentDate.getMinutes() )
                , twoCharDigit( currentDate.getSeconds() )
            );
        var Message = util.format( '%s%s\n', ErrorColors[ logLevel ], message.replace( /\n/g, '\n           ' ) );
        if ( logLevel == LG_ERROR || logLevel == LG_FATAL )
            Message+= stackTrace;

        logTemplate = util.format( logTemplate, Message, CL_RESET );
        _console[ ErrorSTD[ logLevel ] ]( logTemplate );
    },
    WebLogger = function( Stack, LogName, message ) {
        var openTag = 0,
            Message = message.replace(/\u001b\[(\d+)m/g, function( s, d ) {
                var color = {
                        30  :   'black',
                        31  :   'red',
                        32  :   'green',
                        33  :   'brown',
                        34  :   'blue',
                        35  :   'purple',
                        36  :   'darkcyan',
                        37  :   'gray'
                    }[ d ];
                if ( color ) {
                    openTag+=1;
                    return '<span style="color:'+ color +';">';
                } else
                if ( openTag > 0 ){
                    openTag-=1;
                    return '</span>';
                }
                return '';
        });
        return '<code style="font-size: 10px;"><b><pre>' + Message + '</pre></b></code>';
    },
    LogLevel = function( logLevel ) {
        defaultLogLevel = logLevel;
    },
    DefaultLog = function(  ) {
        var LogName = Array.prototype.shift.apply(arguments);
        if ( SpecialTypes.indexOf( LogName ) == -1 ) {
            if ( ErrorTypes.indexOf( LogName ) > defaultLogLevel ) return;
        }

        var notPrint = WebTypes.indexOf( LogName ) == -1 ? false : true,
            Stack = buildStack.apply( null, arguments );

        Array.prototype.unshift.call( arguments, LogName );
        Array.prototype.unshift.call( arguments, Stack );

        if ( notPrint ) {
            return WebLogger.apply( null, arguments );
        } else
            Logger.apply( null, arguments );
    },

    Log     = function Notice(  ) { DefaultLog.apply(null, [].concat( 'Notice', Array.prototype.slice.apply( arguments ) ) ) },
    LogWarn = function Warning(  ) { DefaultLog.apply(null, [].concat( 'Warning', Array.prototype.slice.apply( arguments) ) ) },
    LogError   = function Error(  ) { DefaultLog.apply(null, [].concat( 'Error', Array.prototype.slice.apply( arguments) ) ) },
    LogFatal   = function Fatal(  ) { if ( !(arguments[0] instanceof Error) ) return;DefaultLog.apply(null, [].concat( 'Fatal', Array.prototype.slice.apply( arguments) ) ); process.exit(0); },
    LogDebug   = function Debug(  ) { DefaultLog.apply(null, [].concat( 'Debug', Array.prototype.slice.apply( arguments) ) ) },
    LogInspect   = function Inspect(  ) { DefaultLog.apply(null, [ 'Inspect', util.inspect( arguments[0], arguments[1] ? true : false, null, true ) ] )},
    WebInspect   = function WebInspect(  ) { return DefaultLog.apply(null, [ 'WebInspect', util.inspect( arguments[0], arguments[1] ? true : false, null, true ) ] ) };

process.on( 'uncaughtException', LogError );

console.__defineGetter__( 'level', function() {return {
    LG_NONE     :   LG_NONE,
    LG_LOG      :   LG_LOG,
    LG_INFO     :   LG_LOG,
    LG_WARNING  :   LG_WARNING,
    LG_ERROR    :   LG_ERROR,
    LG_FATAL    :   LG_FATAL,
    LG_DEBUG    :   LG_DEBUG
}});
console.__defineGetter__( 'logLevel', function() {return LogLevel});
console.__defineGetter__( 'log', function() { return Log } );
console.__defineGetter__( '_log', function() { return _console.log } );
console.__defineGetter__( '_error', function() { return _console.error } );
console.__defineGetter__( 'info', function() { return Log } );
console.__defineGetter__( 'warn', function() { return LogWarn } );
console.__defineGetter__( 'error', function() { return LogError } );
console.__defineGetter__( 'fatal', function() { return LogFatal } );
console.__defineGetter__( 'debug', function() { return LogDebug } );
console.__defineGetter__( 'inspect', function() { return LogInspect } );

console.__defineGetter__( 'webInspect', function() { return WebInspect });