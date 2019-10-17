var express = require("express");
var app = express();
app.use(express.static('src'));
app.use('/tcc', express.static('content'));
app.listen(8080, () => {
    console.log('Servidor rodando em http://localhost:8080')
});