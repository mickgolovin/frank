"use strict";

exports = module.exports = init;

const Responder = require("./Responder");
const fs = require("fs");

function init(ROOT_DIR, PHP_FPM, req, res, next) {
    return new Handler(ROOT_DIR, PHP_FPM, req, res, next);
}

function withoutQueryString(url) {
    const sep = url.indexOf("?");
    return sep === -1 ? url : url.substr(0, sep);
}

class Handler {
    constructor(ROOT_DIR, PHP_FPM, req, res, next) {
        this.ROOT_DIR = ROOT_DIR,
        this.PHP_FPM = PHP_FPM;
        this.connections = new Array(100);
        this.handle(req, res, next);
    }

    handle(req, res, next) {
        this.script = withoutQueryString(req.url);

        if (this.PHP_FPM.REWRITE) {
            if (!fs.existsSync(this.ROOT_DIR + this.script)) {
                this.script = "/";
            }
        }

        if (this.script.endsWith("/")) {
            this.script += "index.php";
        }

        if (!this.script.endsWith(".php")) {
            next();
            return;
        }

        new Responder.Responder(this, req, res, next);
    }

    getFreeReqId() {
        var i = 0;

        while (this.connections[++i]) {}

        this.connections[i] = true;

        return i;
    }

    freeUpReqId(reqId) {
        this.connections[reqId] = false;
    }
}
