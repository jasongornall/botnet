const functions = require('firebase-functions');
const admin = require('firebase-admin');
const request = require('request')
const btoa = require('btoa')
const async = require('async')
const rawjs = require('raw.js');
const snoowrap = require('snoowrap');
const lodash = require('lodash');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
// https://www.reddit.com/api/v1/authorize?client_id=Ag0ViT48lPnFiQ&response_type=code&state=123&redirect_uri=https%3A%2F%2Fus-central1-botnet-a2e6f.cloudfunctions.net%2FredditAuth&duration=permanent&scope=vote,identity
const serviceAccount = require('./service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
});

exports.debug = functions.https.onRequest((req, res) => {
  res.send('hi');
});

exports.processQueue = functions.https.onRequest((req, res)=> {
  console.log('start');
  var queue = [];
  var upvotes = 0;
  var active = null;
  var name = '';
  var reddit_regex = /^https:\/\/www\.reddit\.com\/r\/(.+?)\/comments\/(.+?)\/.+?\/(.*?)/;
  admin.database().ref('/queue').limitToFirst(1).once('child_added')
  .then((snapshot) => {
    active = snapshot.val()
    var parts = active.post.match(reddit_regex)
    if (parts) {
      name = `t2_${parts[3]}` || `t3_${parts[2]}`
    }
    return snapshot.ref.remove()
  })
  .then((snapshot) => {
    return admin.database().ref('/users').once('value')
  })
  .then((snapshot) => {
    return new Promise( (resolve, reject) => {
      var users = lodash.values(snapshot.val())
      async.eachLimit(users, 10, function(user, callback) {
        var reddit = new rawjs("raw.js example script");
        reddit.setupOAuth2("Ag0ViT48lPnFiQ", "BZPiwonkM5uGdlRK9dfdCz7St6M", "https://us-central1-botnet-a2e6f.cloudfunctions.net/redditAuth");
        reddit.refreshToken = user.refresh_token
        reddit.auth(function(err, response) {
          request.post({
            headers: {
              'content-type' : 'application/x-www-form-urlencoded',
              "authorization": "Bearer " + response.access_token,
              "User-Agent": 'raw.js example script'
            },
            url:     'https://oauth.reddit.com/api/vote',
            body:    `id=${name}&dir=1`
          }, function(error, response, body) {
            upvotes += 1;
            callback(null)
          });
        })
      }, (err, data) => {
        if (err) {return reject()}
        resolve()
      })
    })
  })
  .then((a,b) => {
    return admin.database().ref('/posts').push({
      url: active,
      upvotes: upvotes
    })
  })
  .then((snapshot) => {
    res.send('ok');
  })
  .catch(error => {
    res.send(`${error} occured`)
  })
})
exports.redditAuth = functions.https.onRequest((req, res) => {
  var reddit = new rawjs("raw.js example script");
  reddit.setupOAuth2("Ag0ViT48lPnFiQ", "BZPiwonkM5uGdlRK9dfdCz7St6M", "https://us-central1-botnet-a2e6f.cloudfunctions.net/redditAuth");
  var url = reddit.authUrl("123", ['vote identity']);
  reddit.auth({"code": req.query.code}, function(err, response) {
    reddit.me(function(err, user) {
      var uid = user.name;
      var refresh_token = response.refresh_token;
      var access_token = response.access_token;


      return admin.database().ref(`/users/${uid}`).set({
        refresh_token: refresh_token,
        access_token: access_token
      })
      .then(() => {
        return admin.auth().createCustomToken(uid)
      })

      .then(customToken => {
        res.redirect(`http://127.0.0.1:4000/?token=${customToken}`);
      })
      .catch(error => {
        res.send(`${error} occured`)
      })
       res.send('hi');
    })
  })
});
