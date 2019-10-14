const slider = document.getElementById("slider_list")

function nextSlider(el){
    const items = document.getElementsByClassName("slider-item").length
    let gap   = 16,
        count = 1;
    
    if (count <= items){
        slider.style.transform = `translateX( calc( ${count} * -100% + (${gap}px) ) )`
        count++
        console.log(count)

    } else {
        return false
    }
}

function prevSlider(el){
    
}