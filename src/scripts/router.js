import Utils from './utils.js'

const mainBody = document.querySelector("body");

async function changeView(data) {

  /**
   * Switch that deals with location pathname
   * and sets the classes for the content
   */
  if (data != "/"){
      var newData = data.replace("/", "");
      var container = document.querySelector(`.project.${newData}`);
  } 
  switch (window.location.pathname) {
    case "/tcc":
      Utils.addClass(container, 'openArticle');
      break;
    case "/produtos":
      content.load("/src/produto/list.html");
      break;
    case "/categorias/criar":
      content.load("/src/categoria/form.html");
      break;
  }
}

/**
 * 
 * @param {event} e event
 * @param {url} url pathname
 */
function transitionTo(e, url) {
  e && e.preventDefault();
  window.history.pushState("", "", url);
  changeView(url);
}

/**
 * On the first load verifies the url
 * for adding or not the classes
 */
document.addEventListener("DOMContentLoaded", (e) => {
  var URL = window.location.pathname
  var newUrl = URL.replace("/", "");
  if (URL != "/"){
    Utils.addClass(mainBody, `open-${newUrl}`);
  }
  changeView(window.location.pathname);
});

const Router = {
  transitionTo,
  changeView
}

export default Router

