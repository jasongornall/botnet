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
  var reddit = new rawjs("raw.js example script");
  reddit.setupOAuth2(functions.config().app.client, functions.config().app.secret, functions.config().app.redirect);
  reddit.refreshToken = "27647062451-j9cm1qRitB4nmXhdkXUAuCgjerg"
  // "https://www.reddit.com/r/Tinder/comments/6xl52t/clippys_only_ever_had_a_single_use_for_me_in_my/"
  reddit.auth(function(err, response) {
    console.log(err,response);
    request.get({
      headers: {
        'content-type' : 'application/x-www-form-urlencoded',
        "authorization": "Bearer " + response.access_token,
        "User-Agent": 'raw.js example script'
      },
      url: 'https://oauth.reddit.com/by_id/t3_6xl52t'
    }, function(error, response, body) {
      console.log(error, body,response)
      res.send(body);
    })
  })


})
exports.processDBQueue = functions.database.ref('/users/{uid}/post').onWrite(event => {
  var queue = [];
  var upvotes = 0;
  var active = null;
  var name = '';
  var parts = null
  var reddit_regex = /^https:\/\/www\.reddit\.com\/r\/(.+?)\/comments\/(.+?)\/.+/;
  return Promise.resolve().then((snapshot) => {
    active = event.data.val() || '';
    parts = active.match(reddit_regex)
    if (parts) {
      if (parts[3]) {
        name = `t2_${parts[3]}`
      } else if (parts[2]) {
        name = `t3_${parts[2]}`
      } else {
        return Promise.reject('error occured')
      }
    } else {
      return Promise.reject('error occured')
    }
    return admin.database().ref('/users').once('value')
  })
  .then((snapshot) => {
    return new Promise( (resolve, reject) => {
      var users = lodash.shuffle(lodash.keys(snapshot.val()))
      if (!users) {
        return res.send('missing users')
      }
      async.eachLimit(users, 10, function(user_key, callback) {
        var user = snapshot.child(user_key).val()
        var reddit = new rawjs("raw.js example script");

        reddit.setupOAuth2(functions.config().app.client, functions.config().app.secret, functions.config().app.redirect);
        reddit.refreshToken = user.refresh_token
        reddit.auth(function(err, response) {
          if (err) {
            return snapshot.child(user_key).ref.remove().then(function() {
              callback()
            })
          }
          request.get({
            headers: {
              'content-type' : 'application/x-www-form-urlencoded',
              "authorization": "Bearer " + response.access_token,
              "User-Agent": 'raw.js example script'
            },
            url:  `https://oauth.reddit.com/by_id/${name}`
          }, function(error_post, response_post, body_post) {
            if (error_post ) {
              return callback()
            }

            body_post = JSON.parse(body_post);
            if (body_post.message == 'Forbidden' && body_post.error == 403) {
              return snapshot.child(user_key).ref.remove().then(function() {
                callback()
              })
            }
            if (body_post.data.children[0].data.likes === true) {
              return callback()
            }
            request.post({
              headers: {
                'content-type' : 'application/x-www-form-urlencoded',
                "authorization": "Bearer " + response.access_token,
                "User-Agent": 'raw.js example script'
              },
              url:     'https://oauth.reddit.com/api/vote',
              body:    `id=${name}&dir=1`
            }, function(error, response, body) {
              body = JSON.parse(body);
              if (body.message == 'Forbidden' && body.error == 403) {
                return snapshot.child(user_key).ref.remove().then(function() {
                  callback()
                })
              }
              if (!error) {
                upvotes += 1;
              }
              callback()
            });
         })
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
  .then((snap) => {
    return admin.database().ref(`/stats/upvotes`).transaction(function(current) {
      return (current || 0) + upvotes
    });
  })
  .then(() => {
    return event.data.adminRef.parent.once('value')
  })
  .then((snapshot) => {
    var current = snapshot.val()
    current.status = 'processed'
    current.upvotes = upvotes
    return snapshot.ref.set(current)
  })
  .then((snap) => {
    return admin.database().ref(`/users`).once('value')
  })
  .then((snap) => {
    var users = lodash.keys(snap.val()).length
    return admin.database().ref(`/stats/users`).set(users)
  })
})
exports.redditAuth = functions.https.onRequest((req, res) => {
  var reddit = new rawjs("raw.js example script");
  console.log(functions.config().app.client, functions.config().app.secret, functions.config().app.redirect)
  reddit.setupOAuth2(functions.config().app.client, functions.config().app.secret, functions.config().app.redirect);
  var url = reddit.authUrl("123", ['vote identity read']);
  reddit.auth({"code": req.query.code}, function(err, response) {
    console.log(err, response);
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
      .then((snap) => {
        return admin.database().ref(`/users`).once('value')
      })
      .then((snap) => {
        var users = lodash.keys(snap.val()).length
        return admin.database().ref(`/stats/users`).set(users)
      })
      .then(() => {
        return admin.auth().createCustomToken(uid)
      })
      .then(customToken => {
        res.redirect(`https://upvotes.infernalscoop.com/?token=${customToken}`);
      })
      .catch(error => {
        res.send(`${error} occured`)
      })
    })
  })
});
