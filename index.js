const express = require("express")
const compression = require('compression')
const php_fpm = require("./php-fpm")

const options = {
    RootDir: __dirname + "/php_files",
    env: {},
    rewrite: false,
    socket: { path:  "/run/php/php7.2-fpm.sock" },
}

const app = express();
app.use(compression());
app.use(function (req, res, next) {
    php_fpm(options, req, res, next);
});
app.use(express.static('php_files'));

app.use(function (err, req, res, next) {
    console.log(err);;
});


app.listen(3000, '0.0.0.0')
