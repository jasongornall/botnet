const functions = require('firebase-functions');
const admin = require('firebase-admin');
const request = require('request')
const btoa = require('btoa')
var rawjs = require('raw.js');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
// https://www.reddit.com/api/v1/authorize?client_id=Ag0ViT48lPnFiQ&response_type=code&state=123&redirect_uri=https%3A%2F%2Fus-central1-botnet-a2e6f.cloudfunctions.net%2FredditAuth&duration=permanent&scope=vote
admin.initializeApp(functions.config().firebase);
exports.redditAuth = functions.https.onRequest((req, res) => {
  var reddit = new rawjs("raw.js example script");
  reddit.setupOAuth2("Ag0ViT48lPnFiQ", "BZPiwonkM5uGdlRK9dfdCz7St6M", "https://us-central1-botnet-a2e6f.cloudfunctions.net/redditAuth");
  var url = reddit.authUrl("123", ['vote identity']);
  reddit.auth({"code": req.query.code}, function(err, response) {
    console.log(response, '123');
    reddit.me(function(err, response) {
      console.log(response, '456');

      admin.auth().createUser({
        uid: uid,
        displayName: displayName,
        photoURL: photoURL
      });
    })
    res.send(response);
  })
  // request.post({
  //   headers: {
  //     'Authorization': 'Basic ' + header,
  //     'User-Agent': "REDDIT posTer"
  //   },
  //   url: 'https://www.reddit.com/api/v1/access_token',
  //   form: {
  //     grant_type: 'authorization_code',
  //     code: req.query.code,
  //     redirect_uri: 'https://us-central1-botnet-a2e6f.cloudfunctions.net/redditAuth'
  //   }
  // }, function(err,httpResponse,body){
  //   console.log(body);
  //   response.send("Hello from Firebase!" + err);
  // })
});
