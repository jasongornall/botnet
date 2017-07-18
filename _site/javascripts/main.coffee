$(window).load ->
  firebase.auth().onAuthStateChanged (user) ->
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
