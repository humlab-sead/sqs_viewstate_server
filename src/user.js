const {OAuth2Client} = require('google-auth-library');
const config = require("../config.json");

class User {
    constructor() {
        
    }

    async verifyGoogleUser(token) {
        const client = new OAuth2Client(config.google.client_id);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: global.config.google.client_id,  // Specify the CLIENT_ID of the app that accesses the backend
            // Or, if multiple clients access the backend:
            //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
        });
        const payload = ticket.getPayload();
        const userid = payload['sub'];
        //console.log(payload, userid);

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

        // If request specified a G Suite domain:
        //const domain = payload['hd'];

        if(userValid) {
            return payload;
        }
        return false;
    }
}
module.exports = User;