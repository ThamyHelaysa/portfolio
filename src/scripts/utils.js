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

  if ( (" " + el[0].className + " ").replace(rclass, " ").indexOf(selector) > -1) {
    return true;
  }

  return false;
}

// function hasClass(selector) {
//   var className = " " + selector + " ",
//       i = 0,
//       l = this.length;
//   for (; i < l; i++) {
//       if (this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf(className) >= 0) {
//           return true;
//       }
//   }

//   return false;
// }
