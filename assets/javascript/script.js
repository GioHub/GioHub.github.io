// Preloader
$(document).ready(function () {
  setTimeout(function () {
    $('.wrapper').addClass('loaded');
  }, 2500);
});

// Side Menu 
let isActive = false;
$('.menu-touch').on('click', function () {
  if (isActive) {
    $(this).removeClass('active');
    $('.drop-menu').removeClass('menu-open');
  } else {
    $(this).addClass('active');
    $('.drop-menu').addClass('menu-open');
  }
  isActive = !isActive;
});

$('.drop-menu .menu-content ul li.btn-clique').on('click', function () {
  if (isActive) {
    $('.menu-touch').removeClass('active');
    $('.drop-menu').removeClass('menu-open');
  } else {
    $('.menu-touch').addClass('active');
    $('.drop-menu').addClass('menu-open');
  }
  isActive = !isActive;
});

$('.drop-menu .menu-content ul li .submenu li').on('click', function () {
  $('.menu-touch').removeClass('active');
  $('.drop-menu').removeClass('menu-open');
});

// Dark Light Mode Toggle
function myFunction() {
  let element = document.body;
  element.classList.toggle("dark-mode");

  let sunIcon = document.getElementById("sunIcon");
  let moonIcon = document.getElementById("moonIcon");

  if (element.classList.contains("dark-mode")) {
    sunIcon.classList.add("hidden");
    moonIcon.classList.remove("hidden");
    localStorage.setItem("mode", "dark");
  } else {
    moonIcon.classList.add("hidden");
    sunIcon.classList.remove("hidden");
    localStorage.setItem("mode", "light");
  }
}
document.addEventListener("DOMContentLoaded", function () {
  const storedMode = localStorage.getItem("mode");
  if (storedMode === "dark") {
    document.body.classList.add("dark-mode");
    let sunIcon = document.getElementById("sunIcon");
    let moonIcon = document.getElementById("moonIcon");
    sunIcon.classList.add("hidden");
    moonIcon.classList.remove("hidden");
  }
});

// Circular Progress Bar
$(document).ready(function ($) {
  function animateElements() {
    $('.progressbar').each(function () {
      let elementPos = $(this).offset().top;
      let topOfWindow = $(window).scrollTop();
      let percent = $(this).find('.circle').attr('data-percent');
      let percentage = parseInt(percent, 10) / parseInt(100, 10);
      let animate = $(this).data('animate');
      if (elementPos < topOfWindow + $(window).height() - 30 && !animate) {
        $(this).data('animate', true);
        $(this).find('.circle').circleProgress({
          startAngle: -Math.PI / 2,
          value: percent / 100,
          thickness: 4,
          fill: {
            color: '#55E6A5',
          }
        }).on('circle-animation-progress', function (event, progress, stepValue) {
          $(this).find('div').text((stepValue * 100).toFixed(0) + "%");
        }).stop();
      }
    });
  }

  animateElements();
  $(window).scroll(animateElements);
});

// About counter
let counted = 0;
$(window).scroll(function () {
  let oTop = $('.counter').offset()?.top - window.innerHeight;
  if (counted == 0 && $(window).scrollTop() > oTop) {
    $('.count').each(function () {
      let $this = $(this),
        countTo = $this.attr('data-count');
      $({
        countNum: $this.text()
      }).animate({
        countNum: countTo
      },
        {
          duration: 2000,
          easing: 'swing',
          step: function () {
            $this.text(Math.floor(this.countNum));
          },
          complete: function () {
            $this.text(this.countNum);
          }

        });
    });
    counted = 1;
  }
});

// Project Pop-Up
function customPopup() {
  let $btnShowPopup = $('.js-open-popup');
  let $btnClosePopup = $('.js-close-popup');
  let $popup = $('.js-custom-popup');

  $btnShowPopup.on('click', function () {
    let targetPopup = $(this).attr('data-target');
    $("[data-popup=" + targetPopup + "]").addClass('is-active');
  });

  $btnClosePopup.on('click', function () {
    $(this).parents('.is-active').removeClass('is-active');
  });

  $popup.on('click', function (event) {
    if (!$(event.target).closest('.js-custom-popup-holder').length && !$(event.target).is('js-custom-popup')) {
      if ($popup.hasClass('is-active')) {
        $popup.removeClass('is-active');
      }
    }
  });
}
customPopup();

// Share Button
const shareButtons = document.querySelectorAll("button.shareButton");
shareButtons.forEach((button, index) => {
  button.addEventListener("click", (e) => {
    shareButtons.forEach((btn) => {
      btn.classList.toggle("open");
    });
    if (index === 0) {
      button.classList.remove("sent");
    } else {
      button.classList.toggle("sent");
    }
  });
});

// Testimonial Card Slider
$(function () {
  $('.testimonials_card').slick({
    infinity: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    arrows: false,
  });
});
// Testimonial Card Slider End

// View More View Less btn
$(document).ready(function () {
  $("#toggle").click(function () {
    var elem = $("#toggle").text();
    if (elem == "View More") {
      $("#toggle").text("View Less");
      $("#text").slideDown();
    } else {
      $("#toggle").text("View More");
      $("#text").slideUp();
    }
  });
});
// View More View Less btn End

// blog Page Pop Up
$(document).ready(function () {
  $('.trigger').click(function () {
    $('.modal-wrapper').toggleClass('open');
    $('.page-wrapper').toggleClass('blur');
    return false;
  });
});
// blog Page Pop Up End

// blog_pop_up_slider
$(function () {
  $('.blog_pop_up_slider').slick({
    infinity: true,
    slidesToShow: 2,
    slidesToScroll: 1,
    autoplay: false,
    arrows: false,
    prevArrow: '<span class="prev-btn"><i class="fa-solid fa-arrow-left"></i> Prev </span>',
    nextArrow: '<span class="next-btn"> Next <i class="fa-solid fa-arrow-right"></i> </span>',
    responsive: [
      {
        breakpoint: 645,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          autoplay: false,
          arrows: false,
        }
      }
    ]
  });
});
// blog_pop_up_slider end

// form
$('input').focus(function () {
  $(this).parent().addClass('active');
  $('input').focusout(function () {
    if ($(this).val() == '') {
      $(this).parent().removeClass('active');
    } else {
      $(this).parent().addClass('active');
    }
  })
});
// form end

// cursor
let cursor = document.querySelector('.cursor');
let cursorScale = document.querySelectorAll('a,button,.js-open-popup,.trigger,.share,#close,.toggle,.icon-container,#youtube,#vimeo,.link');
let mouseX = 0;
let mouseY = 0;
gsap.to({}, 0.016, {
  repeat: -1,
  onRepeat: function () {
    gsap.set(cursor, {
      css: {
        left: mouseX,
        top: mouseY,
      }
    })
  }
});
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
})
cursorScale.forEach(link => {
  link.addEventListener('mousemove', () => {
    cursor.classList.add('grow');
    if (link.classList.contains('small')) {
      cursor.classList.remove('grow');
      cursor.classList.add('grow-small');
    }
  });
  link.addEventListener('mouseleave', () => {
    cursor.classList.remove('grow');
    cursor.classList.remove('grow-small');
  });
});
// cursor End

// gallary code
window.addEventListener("load", () => {
  for (let i of document.querySelectorAll(".gallery img")) {
    i.onclick = () => i.classList.toggle("full");
  }
});
