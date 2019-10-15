const rclass = /[\t\r\n\f]/g

function addClass(el, cls){
  el.classList.add(`${cls}`)
}

function hasClass(el, selector) {
  var className = " " + selector + " ",
      i = 0;

  if (el[i].nodeType === 1 && (" " + el[i].className + " ").replace(rclass, " ").indexOf(className) >= 0) {
    return true;
  }

  return false;
}

function hasClass(selector) {
  var className = " " + selector + " ",
      i = 0,
      l = this.length;
  for (; i < l; i++) {
      if (this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf(className) >= 0) {
          return true;
      }
  }

  return false;
}
