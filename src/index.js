

global.config = require('../config.json');
const Router = require("./router.js");
const Database = require("./database.js");

new Router(config);
