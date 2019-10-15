const slider      = document.getElementById("slider_list"),
      sliderItems = document.getElementsByClassName("slider-item").length,
      gap         = 16

var count = 1;

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
    
    if (count != 1){
        count--
        slider.style.transform = `translateX( calc( (${count} - 1) * -100% + (${gap * (count - 1)}px) ) )`
        
        
        console.log("prev", count)
    } else {
        return false
    }
}