import Utils from './utils.js'
import Router from './router.js'

const slider      = document.getElementById("slider_list"),
      sliderItem  = document.querySelectorAll("#slider_list .item"),
      sliderItems = sliderItem.length,
      prevBtn     = document.querySelector('.btnprev'),
      nextButton  = document.querySelector('.btnnext'),
      closeBtn    = document.querySelector('#close'),
      bodyCon     = document.querySelector("body"),
      wrapper     = document.querySelector(".wrapper"),
      mainBody    = document.querySelector("body"),
      scrollBody  = mainBody.scrollTop,
      countItems  = document.querySelector(".scroll-hint"),
      gap         = 16;


var projectContent  = document.querySelector(".project");

document.addEventListener('DOMContentLoaded', (e) => {
  const pathName = window.location.pathname

  if (pathName == "/"){
    setTimeout(()=>{
      Utils.removeClass(bodyCon, '--loading');
    }, 11000)
  } else {
    setTimeout(()=>{
      Utils.removeClass(bodyCon, '--loading');
    }, 3000)
  }


})



/**
 * Variable that handle the
 * transforms numbers
 */
var count = 1;



/*
* Putting Listener Buttons
*/
nextButton.addEventListener('click', (e) => {
  var self = nextButton;
  e.stopPropagation();
  nextSlider(e);
  if (count === sliderItems){
    Utils.addClass(self, 'none')
    Utils.removeClass(prevBtn, 'none')
  } else {
    Utils.removeClass(prevBtn, 'none')
  }
});


prevBtn.addEventListener('click', (e) => {
  var self = prevBtn;
  e.stopPropagation();
  prevSlider(e);
  if (count === 1){
    Utils.addClass(self, 'none')
    Utils.removeClass(nextButton, 'none')
  } else {
    Utils.removeClass(nextButton, 'none')
  }
});



closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  closeArticle(e);
});



/**
 * 
 * @param {event} e event nextSlider:
 * It skips the slide
 */
function nextSlider(e){
  if ( !Utils.hasClass(bodyCon, "open") ){
    if (count < sliderItems){
      slider.style.transform = `translateX( calc( ${count} * -100% + (${gap * count}px) ) )`
      count++
      changeCounter()
    } 
  }
}

// Return to the previous slide

/**
 * 
 * @param {event} e event for prevSlider:
 * It returns to the previous slide
 */
function prevSlider(e){
  if (!Utils.hasClass(bodyCon, "open")){
    if (count != 1){
      count--
      slider.style.transform = `translateX( calc( (${count} - 1) * -100% + (${gap * (count - 1)}px) ) )`
      changeCounter()
    } 
  }
}

function changeCounter(){
  countItems.innerHTML = `<span class="label">${count}/${sliderItems}</span>`
}

/**
 * Listener that triggers on arrow keys down
 */
document.addEventListener('keydown', (e) => {
  e.stopPropagation();
  const keyName = event.key;
  if ( !Utils.hasClass(projectContent, "open") ){
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

function startDrag(e){
  var touch = e.changedTouches[0]
  ts_x = touch.pageX;
  ts_y = touch.pageY;
}

function endDrag(e){
  var touch = e.changedTouches[0]
  var td_x = touch.pageX - ts_x; // deslocamento na horizontal
  var td_y = touch.pageY - ts_y; // deslocamento na vertical
  // O movimento principal foi vertical ou horizontal?
  if( Math.abs( td_x ) > Math.abs( td_y ) ) {
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
}

document.addEventListener('touchstart', function(e){
  var touch = e.changedTouches[0]
  ts_x = touch.pageX;
  ts_y = touch.pageY;
}, false);

document.addEventListener('touchend', function(e){
  var touch = e.changedTouches[0]
  var td_x = touch.pageX - ts_x; // deslocamento na horizontal
  var td_y = touch.pageY - ts_y; // deslocamento na vertical
  // O movimento principal foi vertical ou horizontal?
  if( Math.abs( td_x ) > Math.abs( td_y ) ) {
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
    e.stopPropagation();

    projectContent = document.querySelector(`.project.${URL}`)

    Router.transitionTo(e, URL);
    Utils.addClass(mainBody, `open`);
    Utils.addClass(mainBody, `open-${URL}`);
    el.style.overflow = "visible"
    mainBody.style.overflowY = "auto"
  })
})



/**
 * Close Article
 */
function closeArticle(e){
  var URL = window.location.pathname.replace("/", "");

  if (URL != ""){
    projectContent = document.querySelector(`.project.${URL}`);
  }

  function initClose(){
    Utils.removeClass(mainBody, `open`);
    Utils.removeClass(mainBody, `open-${URL}`);
    Utils.removeClass(projectContent, "openArticle");
    mainBody.style.overflowY = "hidden"
    setTimeout(() => {
      document.querySelector(`.item[data-url="${URL}"]`).style.overflow = "hidden"
    }, 500);
    Router.transitionTo(e, "/")
  }

  // Check if body is on scroll
  if (document.body.scrollTop > 0){
    document.body.scrollTop = 0
  }

  initClose();
  
}

const Index = {
  "vars": {
    slider,
    sliderItem,
    sliderItems,
    prevBtn,
    nextButton,
    closeBtn,
    bodyCon,
    wrapper,
    mainBody,
    projectContent,
    scrollBody,
    countItems,
    gap,
    count
  },
  nextSlider,
  prevSlider
}


export default Index

