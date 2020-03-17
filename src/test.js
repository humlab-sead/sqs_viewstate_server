const crypto = require('crypto');
shasum = crypto.createHash('sha1');
shasum.update('foo2');
console.log(shasum.digest('hex'));