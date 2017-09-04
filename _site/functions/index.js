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

exports.processDBQueue = functions.database.ref('/users/{uid}/post').onWrite(event => {
  var queue = [];
  var upvotes = 0;
  var active = null;
  var name = '';
  console.log('wakka')
  var reddit_regex = /^https:\/\/www\.reddit\.com\/r\/(.+?)\/comments\/(.+?)\/.+/;
  Promise.resolve().then((snapshot) => {
    active = event.data.val() || '';
    var parts = active.match(reddit_regex)
    if (parts) {
      if (parts[3]) {
        name = `t2_${parts[3]}`
      } else if (parts[2]) {
        name = `t3_${parts[2]}`
      }
    } else {
      return Promise.reject('error occured')
    }
    return admin.database().ref('/users').once('value')
  })
  .then((snapshot) => {
    console.log('wakk2')
    return new Promise( (resolve, reject) => {
      var users = lodash.values(snapshot.val())
      if (!users) {
        return res.send('missing users')
      }
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
            if (!error) {
              upvotes += 1;
            }
            callback()
          });
        })
      }, (err, data) => {
        if (err) {return reject()}
        resolve()
      })
    })
  })
  .then((a,b) => {
    console.log('wakka3')
    return admin.database().ref('/posts').push({
      url: active,
      upvotes: upvotes
    })
  })
  .then(() => {
    console.log('wakka4')
    return event.data.adminRef.parent.once('value')
  })
  .then((snapshot) => {
    var current = snapshot.val()
    current.status = 'processed'
    current.upvotes = upvotes
    return snapshot.ref.set(current)
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

      return admin.database().ref(`/users/${uid}`).once('value')
      .then((snapshot) => {
        current_user = snapshot.val() || {}
        current_user.refresh_token = refresh_token
        current_user.access_token = access_token
        return admin.database().ref(`/users/${uid}`).set(current_user)
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
    })
  })
});
