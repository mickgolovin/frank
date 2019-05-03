const express = require("express");
const compression = require('compression');
const helmet = require('helmet');
const php_fpm = require("./srv_mod/php-fpm");

const CFG = require("./php_files/.host_config.json");

const app = express();

if (CFG.HELMET) {
    app.use(helmet());
}

if (CFG.COMPRESSION) {
    app.use(compression());
}

if (CFG.DENY.length) {
    app.use(CFG.DENY, function (req, res) {
        res.status(403).send();
    });
}

if (CFG.PHP_FPM.ENABLE) {
    app.use(function (req, res, next) {
        php_fpm(CFG.ROOT_DIR, CFG.PHP_FPM, req, res, next);
    });
}

app.use(express.static(CFG.ROOT_DIR));

app.use(function(req, res){
    res.status(404).send();
});

app.listen(CFG.SERVER_PORT, CFG.SERVER_IP);
