var express = require("express");
var app = express();
app.use(express.static('src'))
app.listen(8080, () => {
    console.log('Servidor rodando em http://localhost:8080')
});