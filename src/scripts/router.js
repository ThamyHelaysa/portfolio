import Services from './services.js'


function changeView() {
    var content = document.querySelector("#itemcontent");
    switch (window.location.pathname) {
        case "/tcc":
            const urlContent = Services.load("tcc");
            content.innerHTML = urlContent
            break;
        case "/produtos":
            content.load("/src/produto/list.html");
            break;
        case "/categorias/criar":
            content.load("/src/categoria/form.html");
            break;
        case "/categorias":
            content.load("/src/categoria/list.html");
            break;
        case "/login":
            content.load("/src/login.html");
            break;
        case "/logout":
            localStorage.clear();
            window.location = "/";
            break;
    }
}

function transitionTo(e, url) {
    e && e.preventDefault();
    window.history.pushState("", "", url);
    changeView();
}



