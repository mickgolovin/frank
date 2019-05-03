const express = require("express")
const php_fpm = require("./php-fpm")



console.log(__dirname + "/php_files");
const options = {
    RootDir: __dirname + "/php_files",
    env: {},
    rewrite: false,
    socket: { path:  "/run/php/php7.2-fpm.sock" },
}

const app = express();

app.use(function (req, res, next) {
    php_fpm(options, req, res, next);
});
app.use(express.static('php_files'));

app.listen(3000, '0.0.0.0')
