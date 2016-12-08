var Crypto = require('crypto');

var alghoritm = 'aes192',
    secret = 'my_little_secret',
    cryptFormat = 'hex',
    decryptFormat = 'utf8';

function encrypt (data, secret) {
    if(data) {
        if(typeof data === 'object') {
            data = JSON.stringify(data);
        }
        var encrypted, cipher = Crypto.createCipher(alghoritm, secret);
        encrypted = cipher.update(data, decryptFormat, cryptFormat);
        return encrypted + cipher.final(cryptFormat);
    }
}

function decrypt (data, secret) {
    if(data && secret) {
        var decrypted, decipher = Crypto.createDecipher(alghoritm, secret);
        decrypted = decipher.update(data, cryptFormat, decryptFormat);
        return decrypted + decipher.final(decryptFormat);
    }
}


var benchmarkStart, benchmarkMax = 100000;

function benchmarkUnit(data) {
    var encrypted = encrypt(data, secret),
        decrypted = decrypt(encrypted, secret);
    // console.log(data, encrypted, decrypt(encrypted, secret));
}

var a = 'swag', s = 'secret',
    b = encrypt(a, s),
    c = decrypt(b, s),
    d;

try {
    d = decrypt(b, 'wrongsecret');
} catch (e) {
    console.log(e.message);
}

console.log(a, b, c, '(',s,')');
console.log(a, b, d, '(',s+'20',')');

// function benchmark() {
//     benchmarkStart = Date.now();
//     var i = 0;
//     for(i = 0; i < benchmarkMax; i++) {
//         benchmarkUnit('test' + i);
//     }
//     console.log(Date.now() - benchmarkStart);
// }
//
// benchmark();