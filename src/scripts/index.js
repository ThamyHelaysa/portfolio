const slider      = document.getElementById("slider_list"),
      sliderItem  = document.querySelectorAll(".item"),
      sliderItems = sliderItem.length,
      wrapper     = document.querySelector(".wrapper"),
      gap         = 16

var count = 1;

// Go to the next slide
function nextSlider(e){
  //console.log(e)
  if ( !hasClass(wrapper, "openArticle") ){
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
  if (!hasClass(wrapper, "openArticle")){
    if (count != 1){
      count--
      slider.style.transform = `translateX( calc( (${count} - 1) * -100% + (${gap * (count - 1)}px) ) )`
    } else {
      return false
    }
  }
}

// Return or go forward with arrow key
document.addEventListener ('keydown', (event) => {
  const keyName = event.key;
  if ( !hasClass(wrapper, "openArticle") ){
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
var ts_x;
var ts_y;
document.addEventListener('touchstart', function(e) {
   //e.preventDefault();
   var touch = e.changedTouches[0];
   ts_x = touch.pageX;
   ts_y = touch.pageY;
}, false);

document.addEventListener('touchend', function(e) {
   //e.preventDefault();
   var touch = e.changedTouches[0];
   td_x = touch.pageX - ts_x; // deslocamento na horizontal
   td_y = touch.pageY - ts_y; // deslocamento na vertical
   // O movimento principal foi vertical ou horizontal?
   if( Math.abs( td_x ) > Math.abs( td_y ) && !hasClass(wrapper, "openArticle")) {
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
  el.addEventListener('click', function(e) {
    addClass(wrapper, 'openArticle');
  })
})


/**
 * Close Button
 */
function closeArticle(){
  removeClass(wrapper, 'openArticle');
}


