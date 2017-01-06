var crypto = require('crypto'),
    defaultTokenStrength = 2,
    defaultSecretStrength = 6,
    defaultTokenType = 'hex',
    defaultSecretType = 'hex',
    tokens = [],
    secrets = [];

var alghoritm = 'aes192',
    cryptFormat = 'hex',
    decryptFormat = 'utf8',
    loggerEnabled = false;

var createSecret = function (strength, type) {
    var newSecret = crypto.randomBytes((strength || defaultSecretStrength)).toString((type || defaultSecretType));
    if(secrets.indexOf(newSecret) === -1) {
        secrets.push(newSecret);
        return newSecret;
    } else {
        return createSecret(strength, type);
    }
};

function SecretToken (secret) {
    if(loggerEnabled) console.log('SecretToken created:', secret);
    this.update = function (newSecret) {
        secret = newSecret;
    };
    this.encrypt = function (data) {
        if (data) {
            var encrypted, cipher = crypto.createCipher(alghoritm, secret);
            encrypted = cipher.update(data, decryptFormat, cryptFormat);
            return encrypted + cipher.final(cryptFormat);
        }
    };

    this.decrypt = function (data) {
        if (data) {
            var decrypted, decipher = crypto.createDecipher(alghoritm, secret);
            decrypted = decipher.update(data, cryptFormat, decryptFormat);
            return decrypted + decipher.final(decryptFormat);
        }
    };
}

function SecretStore () {
    var tokens = {};

    this.access = function (name) {
        return tokens[name];
    };

    this.update = function (name, token) {
        if (tokens[name] && tokens[name].update) {
            tokens[name].update(token);
        } else {
            throw new Error (name + ' token doesnt exist');
        }
    };

    this.create = function (name, secret) {
        secret = secret || createSecret();
        tokens[name] = new SecretToken (secret);
        return secret;
    };
}

var createToken = function (strength, type) {
    var newToken = crypto.randomBytes((strength || defaultTokenStrength)).toString((type || defaultTokenType));
    if(tokens.indexOf(newToken) === -1) {
        tokens.push(newToken);
        return newToken;
    } else {
        return createToken(strength, type);
    }
};

var encrypt = function (data, secret) {
    if(data) {
        if(typeof data === 'object') {
            data = JSON.stringify(data);
        }
        var encrypted, cipher = Crypto.createCipher(alghoritm, secret);
        encrypted = cipher.update(data, decryptFormat, cryptFormat);
        return encrypted + cipher.final(cryptFormat);
    }
};

var decrypt = function (data, secret) {
    if(data && secret) {
        var decrypted, decipher = Crypto.createDecipher(alghoritm, secret);
        decrypted = decipher.update(data, cryptFormat, decryptFormat);
        return decrypted + decipher.final(decryptFormat);
    }
};

var removeToken = function (token) {
    var i = tokens.indexOf(token);
    if(i !== -1) {
        tokens.splice(i, 1);
    }
};

function Crypter () {

}

exports.removeToken = removeToken;
exports.createToken = createToken;
exports.SecretStore = SecretStore;