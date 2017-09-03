$(window).load ->
  token = $.url '?token'
  if token
    firebase.auth().signInWithCustomToken token
    updateQueryStringParam 'token'

  firebase.auth().onAuthStateChanged (user) ->
    $('#user').empty()
    return unless user
    window.logged_in_user = user

    firebase.database().ref("posts").on 'child_added', (item) ->
      $('#posts').append teacup.render ->
        div '.post', ->
          div '.upvotes', -> item.upvotes
          blockquote ".reddit-card", ->
            a href: "#{item.post}/?ref=share&ref_source=embed"

    firebase.database().ref("users/#{user.uid}").on 'value', (doc) ->
      $('#user').html teacup.render ->
        div '.user', ->
          div -> "User: #{user.uid}"
        div '.post', ->
          span ->'Reddit Post: '
          input value: doc.child('post').val()
        div '.comment', ->
          span -> 'Comment Post: '
          input value: doc.child('comment').val()
        div '.button', -> 'Submit'

      $('#user .button').on 'click', (e) ->
        current_user = doc.val()
        current_user.comment = $('#user .comment input').val()
        current_user.post = $('#user .post input').val()
        doc.ref.set current_user, ->
          firebase.database().ref("queue").push({
            user: user.uid,
            post: current_user.post
          })

  $('.reddit-login').on 'click', (e) ->
    params = ("#{k}=#{encodeURIComponent v}" for k, v of {
      client_id: 'Ag0ViT48lPnFiQ'
      response_type: 'code'
      state: '123'
      redirect_uri: 'https://us-central1-botnet-a2e6f.cloudfunctions.net/redditAuth'
      duration: 'permanent'
      scope: 'vote identity'
    }).join '&'
    url = "https://www.reddit.com/api/v1/authorize?#{params}"
    window.open(url)
