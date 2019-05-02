"use strict";

exports = module.exports = init;

const Responder = require("./Responder");
const fs = require("fs");

function init(opt, req, res, next) {
    return new Handler(opt, req, res, next);
}

function withoutQueryString(url) {
    const sep = url.indexOf("?");
    return sep === -1 ? url : url.substr(0, sep);
}

class Handler {
    constructor(opt, req, res, next) {
        this.opt = opt;
        this.connections = new Array(100);
        this.handle(req, res, next);
    }

    handle(req, res, next) {
        this.script = withoutQueryString(req.url);

        if (this.opt.rewrite) {
            if (!fs.existsSync(this.opt.documentRoot + this.script)) {
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
        let i = 0;

        while (this.connections[++i]) {}

        this.connections[i] = true;

        return i;
    }

    freeUpReqId(reqId) {
        this.connections[reqId] = false;
    }

}

exports.Handler = Handler;
