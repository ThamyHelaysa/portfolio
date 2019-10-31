const rclass = /[\t\r\n\f]/g


/**
 * 
 * @param {Object} el Element to add class
 * @param {String} cls Class to be added
 */
function addClass(el, cls){
  el.classList.add(`${cls}`)
}

/**
 * 
 * @param {Object} el Element to remove class
 * @param {String} cls Class to be removed
 */
function removeClass(el, cls){
  el.classList.remove(`${cls}`)
}


/**
 * 
 * @param {Object} el Element to search class
 * @param {String} selector Class to be searched
 */
function hasClass(el, selector) {

  if ( (" " + el.className + " ").replace(rclass, " ").indexOf(selector) > -1) {
    return true;
  }

  return false;
}




const Utils = {
  hasClass,
  removeClass,
  addClass
}


export default Utils;