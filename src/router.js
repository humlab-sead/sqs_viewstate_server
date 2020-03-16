var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
const bodyParser = require('body-parser');
const Database = require("./database.js");
const User = require("./user.js");

class Router {
    constructor(config) {
        this.config = config;
        var privateKey  = fs.readFileSync(this.config.ssl.keyFile, 'utf8');
        var certificate = fs.readFileSync(this.config.ssl.certFile, 'utf8');
        var credentials = {key: privateKey, cert: certificate};

        var app = express();

        var httpServer = http.createServer(app);
        var httpsServer = https.createServer(credentials, app);

        httpServer.listen(this.config.webserver.httpPort);
        httpsServer.listen(this.config.webserver.httpsPort);

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
        app.delete('/viewstate/:viewstateId/:userIdToken', this.handleViewstateDelete)
    }
    
    handleNullRequest(req, res) {
        return res.send("No such command");
    }
    
    handleViewStateGet(req, res) {

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
        const user = new User();

        //Get user for this viewstate, then authenticate that user

        new Database(global.config).connect().then(db => {
            const viewStatesCur = db.getViewState(req.params.viewstateId);
            let viewStates = [];
            let userEmail = "";
            viewStatesCur.toArray((err, viewStates) => {
                if (err) throw err;
                userEmail = viewStates[0].user;
                console.log("Request to delete viewstate "+req.params.viewstateId+" which belongs to user "+userEmail);

                const user = new User();
                let userVerifyPromise = user.verifyGoogleUser(req.params.userIdToken);
                userVerifyPromise.then(userObj => {
                    if(userObj === false) {
                        console.log("FAILED deleting viewstate "+req.params.viewstateId+" of user "+userObj.email);
                        db.disconnect();
                        return res.send('{"status": "failed"}');
                    }

                    db.deleteViewstate(req.params.viewstateId);
                    console.log("Deleted viewstate "+req.params.viewstateId+" which belonged to user "+userObj.email);
                    db.disconnect();
                    return res.send('{"status": "ok"}');
                });
            });
        });
    }

    handleViewStateListGet(req, res) {
        const user = new User();
        let userVerifyPromise = user.verifyGoogleUser(req.params.userIdToken);

        userVerifyPromise.then(userObj => {
            if(userObj === false) {
                console.log("FAILED sending list of viewstates for user "+userObj.email);
                return res.send('{"status": "failed"}');
            }

            new Database(global.config).connect().then(db => {
                const viewStatesCur = db.getViewStateList(userObj.email);
                
                let viewStates = [];
                viewStatesCur.toArray((err, viewStates) => {
                    if (err) throw err;
                    db.disconnect();
                    console.log("Sending list of viewstates for user "+userObj.email);
                    return res.send(viewStates);
                  });
              });
        });
    }
    
    handleViewStatePost(req, res) {
        let jsonData = req.body;
        const user = new User();
        let userVerifyPromise = user.verifyGoogleUser(jsonData.user_id_token);
        
        userVerifyPromise.then(userObj => {
            if(userObj === false) {
                console.log("FAILED storing viewstate for user "+userObj.email);
                return res.send('{"status": "failed"}');
            }

            new Database(global.config).connect().then(db => {
                let status = db.saveViewState(userObj.email, jsonData.data);
                db.disconnect();
                if(!status) {
                    return res.send('{"status": "failed"}');
                }
                console.log("Storing viewstate for user "+userObj.email);
                return res.send('{"status": "ok"}');
            });
        });

    }
}

module.exports = Router;