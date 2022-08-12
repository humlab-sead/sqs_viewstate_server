global.config = require('../config.json');
/*
global.config.ssl.keyFile = global.config.ssl.keyFile.replace("${DOMAIN}", process.env.DOMAIN);
global.config.ssl.certFile = global.config.ssl.certFile.replace("${DOMAIN}", process.env.DOMAIN);
*/
const Router = require("./router.js");
const Database = require("./database.js");
new Router(config);
console.log("Online");
