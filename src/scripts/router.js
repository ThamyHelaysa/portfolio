import Utils from './utils.js'
import Index from './index.js'


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
    case "/proj1":
      Utils.addClass(container, 'openArticle');
      break;
    case "/proj2":
      Utils.addClass(container, 'openArticle');
      break;
    case "/proj3":
      Utils.addClass(container, 'openArticle');
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
  const mainBody = Index.vars.mainBody;
  
  var URL = window.location.pathname
  var newUrl = URL.replace("/", "");
  if (URL != "/"){
    Utils.addClass(mainBody, `open`);
    Utils.addClass(mainBody, `open-${newUrl}`);
    mainBody.style.overflowY = "auto"
  }
  changeView(URL);
});

const Router = {
  transitionTo,
  changeView
}

export default Router

