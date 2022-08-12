var fs = require('fs');
var http = require('http');
//var https = require('https');
var express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const Database = require("./database.js");
const User = require("./user.js");
const vsManager = require("./ViewstateManager.class");

class Router {
    constructor(config) {
        this.config = config;
        /*
        var privateKey  = fs.readFileSync(this.config.ssl.keyFile, 'utf8');
        var certificate = fs.readFileSync(this.config.ssl.certFile, 'utf8');
        var credentials = {key: privateKey, cert: certificate};
        */

        var app = express();

        var httpServer = http.createServer(app);
        //var httpsServer = https.createServer(credentials, app);

        httpServer.listen(this.config.webserver.httpPort);
        //httpsServer.listen(this.config.webserver.httpsPort);

        app.use(bodyParser.json());

        app.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
            next();
        });

        app.get('/', this.handleNullRequest);
        app.get('/viewstates/:userIdToken', this.handleViewStateListGet);
        app.get('/viewstate/:viewstateId', this.handleViewStateGet);
        app.post('/viewstate', this.handleViewStatePost);
        app.delete('/viewstate/:viewstateId/:userIdToken', this.handleViewstateDelete); //We never actually delete anything, but we use this for removing the associated user information

	    console.log("Router init done");
    }

    getUserToken(userEmail) {
	    console.log("getUserToken");
        let shaHasher = crypto.createHash('sha1');
        shaHasher.update(userEmail+global.config.security.salt);
        let userToken = shaHasher.digest('hex');
        return userToken;
    }
    
    handleNullRequest(req, res) {
	    console.log("handleNullRequest");
        return res.send("No such command");
    }
    
    handleViewStateGet(req, res) {
	    console.log("handleViewStateGet");
        new Database(global.config).connect().then(db => {
            const viewStatesCur = db.getViewState(req.params.viewstateId);
            let viewStates = [];
            viewStatesCur.toArray((err, viewStates) => {
                if (err) throw err;
                db.disconnect();
                return res.send(viewStates);
              });
          });
    }

    handleViewstateDelete(req, res) {
	    console.log("handleViewstateDelete");
        new Database(global.config).connect().then(db => {
            const viewStatesCur = db.getViewState(req.params.viewstateId);
            let viewStates = [];
            let userEmail = "";
            viewStatesCur.toArray((err, viewStates) => {
                if (err) throw err;
                userEmail = viewStates[0].user;
                console.log("Request to anonymize viewstate "+req.params.viewstateId);

                const user = new User();
                let userVerifyPromise = user.verifyGoogleUser(req.params.userIdToken);
                userVerifyPromise.then(userObj => {
                    if(userObj === false) {
                        console.log("FAILED anonymizing viewstate "+req.params.viewstateId+", userObj is false ");
                        db.disconnect();
                        return res.send('{"status": "failed"}');
                    }

                    db.deleteUserFromViewstate(req.params.viewstateId);

                    console.log("Anonymized viewstate "+req.params.viewstateId+" which belonged to user "+user.getUserToken());
                    db.disconnect();
                    return res.send('{"status": "ok"}');
                });
            });
        });
    }

    handleViewStateListGet(req, res) {
	    console.log("handleViewStateListGet");
        const user = new User();
        let userVerifyPromise = user.verifyGoogleUser(req.params.userIdToken);
	    console.log("User verification pending");
        userVerifyPromise.then(userObj => {
            if(userObj === false) {
                console.log("FAILED sending list of viewstates for user "+this.getUserToken(user.email));
                return res.send('{"status": "failed"}');
            }

            new Database(global.config).connect().then(db => {
                const viewStatesCur = db.getViewStateList(user.getUserToken());
                
                let viewStates = [];
                viewStatesCur.toArray((err, viewStates) => {
                    if (err) throw err;
                    db.disconnect();
                    console.log("Sending list of viewstates for user "+user.getUserToken());
                    return res.send(viewStates);
                  });
              }).catch(() => { console.log("Everything has gone to hell"); });
        });
    }
    
    handleViewStatePost(req, res) {
	    console.log("handleViewStatePost");
        let jsonData = req.body;
        const user = new User();
        let userVerifyPromise = user.verifyGoogleUser(jsonData.user_id_token);
        
        userVerifyPromise.then(userObj => {
            if(userObj === false) {
                console.log("FAILED storing viewstate - no user");
                return res.send('{"status": "failed"}');
            }

            new Database(global.config).connect().then(db => {
                let status = db.saveViewState(user.getUserToken(), jsonData.data);
                db.disconnect();
                if(!status) {
                    return res.send('{"status": "failed"}');
                }
                console.log("Storing viewstate for user "+user.getUserToken());
                return res.send('{"status": "ok"}');
            });
        });

    }
}

module.exports = Router;
