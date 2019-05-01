const express = require("express")
const php = require("./php-fpm").default

console.log(__dirname + "/php_files");
const options = {

  documentRoot: __dirname + "/php_files",

  env: {},
  socketOptions: { path:  "/run/php/php7.2-fpm.sock" },
}

const app = express()
app.use(php(options));
app.use(express.static('php_files'));

app.listen(3000)
