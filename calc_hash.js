
const crypto = require('crypto');
const BUILD_SALT = 'taf-coter-v1-secure-salt';
const origin = 'https://cronometrocafafcoter.netlify.app';
const message = `${origin}:${BUILD_SALT}`;
const hash = crypto.createHash('sha256').update(message).digest('hex');
console.log('Netlify Hash:', hash);
