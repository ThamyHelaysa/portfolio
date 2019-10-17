import Utils from './utils.js'
import Router from './router.js'

//'use strict';

const slider      = document.getElementById("slider_list"),
      sliderItem  = document.querySelectorAll(".item"),
      sliderItems = sliderItem.length,
      prevBtn     = document.querySelector('.btnprev'),
      nextButton  = document.querySelector('.btnnext'),
      closeBtn    = document.querySelector('#close'),
      wrapper     = document.querySelector(".wrapper"),
      gap         = 16

var count = 1;


/*
* Putting Listener Buttons
*/
prevBtn.addEventListener('click', (e) => {
  prevSlider();
})

nextButton.addEventListener('click', (e) => {
  nextSlider();
})

closeBtn.addEventListener('click', (e) => {
  closeArticle();
})

// Go to the next slide
function nextSlider(e){
  //console.log(e)
  if ( !Utils.hasClass(wrapper, "openArticle") ){
    if (count < sliderItems){
      slider.style.transform = `translateX( calc( ${count} * -100% + (${gap * count}px) ) )`
      count++
    } else {
      return false
    }
  }
}

// Return to the previous slide
function prevSlider(e){
  //console.log(e)
  if (!Utils.hasClass(wrapper, "openArticle")){
    if (count != 1){
      count--
      slider.style.transform = `translateX( calc( (${count} - 1) * -100% + (${gap * (count - 1)}px) ) )`
    } else if (count < 0){
      console.log('aqui')
      return false
    }
  }
}

// Return or go forward with arrow key
document.addEventListener ('keydown', (event) => {
  const keyName = event.key;
  if ( !Utils.hasClass(wrapper, "openArticle") ){
    if (keyName === "ArrowRight"){
      nextSlider();
    } else if (keyName === "ArrowLeft"){
      prevSlider();
    }
  }
});


/**
 * Touch Handler
 * Disponível em: 
 * https://pt.stackoverflow.com/questions/34149/como-determinar-a-dire%C3%A7%C3%A3o-do-touchmove
 */
var ts_x = 0;
var ts_y = 0;
document.addEventListener('touchstart', function(e) {
   //e.preventDefault();
   var touch = e.changedTouches[0];
   ts_x = touch.pageX;
   ts_y = touch.pageY;
}, false);

document.addEventListener('touchend', function(e) {
   //e.preventDefault();
   var touch = e.changedTouches[0];
   var td_x = touch.pageX - ts_x; // deslocamento na horizontal
   var td_y = touch.pageY - ts_y; // deslocamento na vertical
   // O movimento principal foi vertical ou horizontal?
   if( Math.abs( td_x ) > Math.abs( td_y ) && !Utils.hasClass(wrapper, "openArticle")) {
      // é horizontal
      if( td_x < 0 ) {
         // é para esquerda
         nextSlider();
      } else {
         // direita
         prevSlider();
      }
   } else {
      // é vertical
      if( td_y < 0 ) {
         // cima
      } else {
         // baixo
      }
   }
}, false);


/**
 * Add Event Listener for each item
 * on slider list
 */
sliderItem.forEach(function(el){
  var URL = el.dataset.url
  el.addEventListener('click', function(e) {
    Router.transitionTo(e, "tcc");
    Utils.addClass(wrapper, 'openArticle');
  })
})



/**
 * Close Article
 */
function closeArticle(e){
  Utils.removeClass(wrapper, 'openArticle');
  Router.transitionTo(e, "/")
}
