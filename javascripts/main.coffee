$(window).load ->
  handleLogout = ->
    firebase.auth().signOut().then (->
      window.location.reload()
    ), ->
      window.location.reload()
  token = $.url '?token'
  if token
    firebase.auth().signInWithCustomToken token
    updateQueryStringParam 'token'

  firebase.auth().onAuthStateChanged (user) ->
    return unless user
    window.logged_in_user = user
    firebase.database().ref("posts").limitToLast(5).on 'value', (items) ->
      arr = Object.values(items.val()).reverse()
      $('#posts').html teacup.render ->
        for item in arr
          div '.post', ->
            div '.upvotes', ->
              span '.reddit-upvote'
              span '.reddit-upvote'
              span -> "#{item.upvotes} upvotes"
              span '.reddit-upvote'
              span '.reddit-upvote'
            blockquote ".reddit-card", 'data-card-preview': '0', 'data-card-created':"", ->
              a href: "#{item.url}/?ref=share&ref_source=embed"

    firebase.database().ref("users/#{user.uid}").on 'value', (doc) ->
      return handleLogout() if not doc.val()
      $('#user').html teacup.render ->
        form ->

          div '.user', ->
            div -> "User: #{user.uid}"
            if doc.child('post').val()
              a href: doc.child('post').val(), -> doc.child('post').val()
            div '.logout-wrap', ->
              div '.logout button', -> 'logout'

          div '.post', ->
            if doc.child('post').val()
              status = doc.child('status').val() || 'processing'
              switch status

                when 'processing'
                  div ->
                    span -> 'status: ' + status
                    span '.reddit-upvote spin'
                    span '.reddit-upvote spin'
                  div -> 'Just hang tight a moment we are processing your post now'

                when 'processed'
                  div -> 'status: ' + status
                  div -> 'Post is now processed! you got ' + doc.child('upvotes').val() + ' free upvotes'
                  if doc.child('upvotes').val() >= 50
                    div -> 'You hit the maximum upvotes per account! You may still have more you can claim.'
                  div -> 'Please click logout and use a new account to process another link!'
            else
              div ->'Reddit Post: '
              input '.text', placeholder: 'https://www.reddit.com/r/Tinder/comments/6xl52t/clippys_only_ever_had_a_single_use_for_me_in_my', value: doc.child('post').val(), required: true, pattern: "^https:\/\/www\.reddit\.com\/r\/(.+?)\/comments\/(.+?)\/.+", title: 'should match this format \n \nhttps://www.reddit.com/r/Tinder/comments/6xl52t/clippys_only_ever_had_a_single_use_for_me_in_my'
              input '.button', type: 'submit'


      $('#user .logout').on 'click', (e) ->
        handleLogout()

      $('#user form').on 'submit', (e) ->
        e.preventDefault();
        current_user = doc.val()
        current_user.post = $('#user .post input').val()
        doc.ref.set current_user
        return false

  $('.reddit-login').on 'click', (e) ->
    params = ("#{k}=#{encodeURIComponent v}" for k, v of {
      client_id: 'QSVcVspRbgo_wg'
      response_type: 'code'
      state: '123'
      redirect_uri: 'https://us-central1-botnet-a2e6f.cloudfunctions.net/redditAuth'
      duration: 'permanent'
      scope: 'vote identity read'
    }).join '&'
    url = "https://www.reddit.com/api/v1/authorize?#{params}"
    window.open(url)
