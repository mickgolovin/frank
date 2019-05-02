const express = require("express")
const php_fpm = require("./php-fpm")


console.log(__dirname + "/php_files");
const options = {
    documentRoot: __dirname + "/php_files",
    env: {},
    rewrite: true,
    socketOptions: { path:  "/run/php/php7.2-fpm.sock" },
}

const app = express()
const php_serv = php_fpm(options);
app.use(php_serv);
app.use(express.static('php_files'));

app.listen(3000, '0.0.0.0')
