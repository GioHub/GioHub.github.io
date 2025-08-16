// pop video
$(document).ready(function () {
  $('#vimeo').magnificPopup({
    items: {
      src: 'https://vimeo.com/259411563'
    },
    type: 'iframe'
  });

  $('#youtube').magnificPopup({
    items: {
      src: 'https://www.youtube.com/watch?v=OZzoAw9QHXY'
    },
    type: 'iframe'
  });

  $('.link').magnificPopup({
    type: 'soundcloud',
    items: {
      src: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/163522130&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true'
    },
    type: 'iframe',
  });
});
