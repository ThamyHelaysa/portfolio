const rclass = /[\t\r\n\f]/g


/**
 * 
 * @param {element} el Element to add class
 * @param {class} cls Class to be added
 */
function addClass(el, cls){
  el[0].classList.add(`${cls}`)
}

/**
 * 
 * @param {element} el Element to remove class
 * @param {class} cls Class to be removed
 */
function removeClass(el, cls){
  el[0].classList.remove(`${cls}`)
}


/**
 * 
 * @param {element} el Element to search class
 * @param {class} selector Class to be searched
 */
function hasClass(el, selector) {

  if ( (" " + el.className + " ").replace(rclass, " ").indexOf(selector) > -1) {
    return true;
  }

  return false;
}