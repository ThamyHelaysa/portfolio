const slider      = document.getElementById("slider_list"),
      sliderItems = document.getElementsByClassName("slider-item").length,
      gap         = 16

var count = 1;

// Go to the next slide
function nextSlider(el){
  if (count < sliderItems){
    slider.style.transform = `translateX( calc( ${count} * -100% + (${gap * count}px) ) )`
    count++
  } else {
    return false
  }
}

// Return to the previous slide
function prevSlider(el){
  if (count != 1){
    count--
    slider.style.transform = `translateX( calc( (${count} - 1) * -100% + (${gap * (count - 1)}px) ) )`
  } else {
    return false
  }
}


document.addEventListener ('keydown', (event) => {
  const keyName = event.key;
  if (keyName === "ArrowRight"){
    nextSlider();
  } else if (keyName === "ArrowLeft"){
    prevSlider();
  }
});