"use strict";

exports = module.exports = init;

var express = require("express");
var Responder = require("./Responder");

function init(opt) {
    return new Handler(opt).router;
}

function withoutQueryString(url) {
    const sep = url.indexOf("?");
    return sep === -1 ? url : url.substr(0, sep);
}

class Handler {
    constructor(opt) {
        this.opt = opt;
        this.connections = new Array(100);
        this.router = express.Router();
        this.router.use(this.handle.bind(this));
        this.router.use(express.static(opt.documentRoot));
    }

    handle(req, res, next) {
        if (this.opt.rewrite) {
            this.script = "/index.php";
        } else {
            this.script = withoutQueryString(req.url);

            if (this.script.endsWith("/")) {
                this.script += "index.php";
            }

            if (!this.script.endsWith(".php")) {
                next();
                return;
            }
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
