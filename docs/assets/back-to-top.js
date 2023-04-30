$(document).ready(function() {
    $('#back-to-top').fadeOut();
    // Check to see if the window is top if not then display button
    $(window).scroll(function() {
      if ($(this).scrollTop() > 100) {
        $('#back-to-top').fadeIn();
      } else {
        $('#back-to-top').fadeOut();
      }
    });
  
    // Click event to scroll to top
    $('#back-to-top').click(function() {
       $('html, body').animate({scrollTop : 0},800);
       return false;
    });
  });
$(document).ready(function() {
    $('#back-to-top').fadeOut();
});
  