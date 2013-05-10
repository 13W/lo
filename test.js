require('./');
function f() {
    undefinedFunction();
}
console.logLevel(console.level.LL_ALL);
console.log();
console.debug('Debug Message');
console.log('Log Message');
console.warn('Warning Message');
console.error('Error Message');

console.inspect({
    string: 'string',
    number: 'number',
    regexp: /regexp/i,
    date: new Date(),
    array: [1,2,3],
    object: {hello: 'world'},
    boolean: true
});

console.__unset;

console.log();
console.debug('Debug Message');
console.log('Log Message');
console.warn('Warning Message');
console.error('Error Message');

f();

