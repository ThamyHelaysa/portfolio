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

      break;
    case "/proj1":
      
      break;
    case "/proj2":
      
      break;
    case "/proj3":
      
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
  // const mainBody = Index.vars.mainBody;

  var URL = window.location.pathname
  // var newUrl = URL.replace("/", "");

  changeView(URL);
});

const Router = {
  transitionTo,
  changeView
}

export default Router

