const {OAuth2Client} = require('google-auth-library');
const crypto = require('crypto');
const config = require("../config.json");

class User {
    constructor() {
    }

    async verifyGoogleUser(token) {
        const client = new OAuth2Client(config.google.client_id);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: global.config.google.client_id
        });
        const payload = ticket.getPayload();
        const userid = payload['sub'];

        let userValid = true;
        let error = "";

        if(payload.aud != global.config.google.client_id) {
            userValid = false;
            error = "Payload aud doesn't equal google client id";
        }
        if(payload.iss != "accounts.google.com" && payload.iss != "https://accounts.google.com") {
            userValid = false;  
            error = "Payload iss doesn't equal expected domains";
        }

        let unixTime = Math.round(Date.now()/1000);
        if(payload.exp < unixTime) {
            userValid = false;
            error = "Ticket has expired";
        }

        if(userValid) {
            this.userObj = payload;
            return payload;
        }
        return false;
    }

    getUserToken() {
        let shaHasher = crypto.createHash('sha1');
        shaHasher.update(this.userObj.email+global.config.security.salt);
        let userToken = shaHasher.digest('hex');
        return userToken;
    }
}
module.exports = User;