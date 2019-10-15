const slider      = document.getElementById("slider_list"),
      sliderItems = document.getElementsByClassName("slider-item").length,
      gap         = 16

var count = 0;

function nextSlider(el){
    
    if (count < sliderItems){
        slider.style.transform = `translateX( calc( ${count} * -100% + (${gap * count}px) ) )`
        count++
        console.log("next", count)
    } else {
        return false
    }
}

function prevSlider(el){
    
    if (count > 0 && count <= sliderItems){
        slider.style.transform = `translateX( calc( ${count} * -100% + (${gap * count}px) ) )`
        count--
        console.log("prev", count)
    } else {
        return false
    }
}