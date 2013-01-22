#lo

Console Logger

#Usage:

```JavaScript
require('lo');
function f() {
    undefinedFunction();
}
console.debug('Debug Message');
console.log('Log Message');
console.warn('Warning Message');
console.error('Error Message');
console.logLevel(console.level.LL_ALL);
console.inspect({
    string: 'string',
    number: 'number',
    regexp: /regexp/i,
    date: new Date(),
    array: [1,2,3],
    object: {hello: 'world'},
    boolean: true
});

f();
```

#LogLevels
```JavaScript
        console.level.LL_NONE       // Only inspect
        console.level.LL_INFO       // Only info messages
        console.level.LL_WARN       // <= Warn
        console.level.LL_ERROR      // <= Error
        console.level.LL_FATAL      // <= Fatal
        console.level.LL_DEBUG      // <= Debug
        console.level.LL_ALL        // All Messages
        
console.logLevel(console.level.LL_ALL);
```
#Switch between default console and logger
```
console.__unset - return to default
console.__set   - return to logger
```
