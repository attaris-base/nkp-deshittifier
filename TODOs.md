❯ Enhancements to implement:
  1) Enable fetching of older message threads in the messages view by clicking a 'load more'
  button at the top of the threads list (the cursor is already returned with the messages api
  call)
  2) enable sending an initial message to a user (presently, we can only respond to received
  messages) using either the old oink or sendMessage api functionality (methods for both are
──now included in api.ts). To be able to view the sent message threads in the messages list 
  currently requires a hack wherein we make sure that our initial message to the user contains
  the word OINK in it, and we then use the message search functionality to search for "oink"
  -- the resulting list of search results will contain the message thread that we started with
  the user
  3) Add messages search functionality via the searchMessages method (added to api.ts) 
  4) Improve leaflet map styling by fading out map features to emphasize user icons
  5) Enable fetching of nearby users for remote locations via the map -- when the center
  changes, show a button to "search here", using the map center for lat / lng values for the 
  api 