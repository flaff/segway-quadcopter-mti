var auth = require('./auth');

console.log(auth.createToken());
console.log(auth.createToken(10));
console.log(auth.createToken(20));
console.log(auth.createToken(30));