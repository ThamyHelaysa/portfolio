var express = require("express");
var app = express();
app.use(express.static('src'));

app.get(/.+\.(js|ico|html|png|jpg|css|map|json)$/, function(req, res) {
    res.sendFile(req.originalUrl.replace(/^./, ""));
});
app.get(/.+$/, function(req, res) {
    res.sendFile(__dirname + "/src/index.html");
});

app.listen(8080, () => {
    console.log("Rodando em http://localhost:8080")
});