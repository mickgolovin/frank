"use strict";

exports.Responder = void 0;

var FCGI = require("./FCGI");
var FCGIClient = require("./FCGIClient");

class Responder extends FCGIClient.FCGIClient {
    constructor(handler, req, res, next) {
        super(handler.opt.socketOptions);

        this.handler = handler;
        this.req = req;
        this.res = res;
        this.next = next;
        this.gotHead = false;
        this.reqId = handler.getFreeReqId();

        const env = createEnvironment(handler, req, res);

        this.send(FCGI.MSG.BEGIN_REQUEST, FCGI.createBeginRequestBody(FCGI.ROLE.RESPONDER, FCGI.DONT_KEEP_CONN));
        this.send(FCGI.MSG.PARAMS, FCGI.createKeyValueBufferFromObject(env));
        this.send(FCGI.MSG.PARAMS, Buffer.alloc(0));

        req.on("data", this.onReqData.bind(this));
        req.on("end", this.onReqEnd.bind(this));
    }

    onReqData(chunk) {
        this.send(FCGI.MSG.STDIN, chunk);
    }

    onReqEnd() {
        this.send(FCGI.MSG.STDIN, Buffer.alloc(0));
    }

    onError(e) {
        this.next(e);
    }

    onClose() {
        this.handler.freeUpReqId(this.reqId);
    }

    send(msgType, content) {
        super.send(msgType, content);
    }

    onRecord(record) {
        switch (record.type) {
            case FCGI.MSG.STDERR:
            break;

            case FCGI.MSG.STDOUT:
            this.stdout(record.content);
            break;

            case FCGI.MSG.END_REQUEST:
            this.res.end();
            break;

            case FCGI.MSG.GET_VALUES_RESULT:
            break;
        }
    }

    stdout(content) {
        if (this.gotHead) {
            this.res.write(content);
            return;
        }

        this.gotHead = true;
        const sep = content.indexOf("\r\n\r\n");
        const head = content.slice(0, sep);
        const body = content.slice(sep + 4);

        for (const h of head.toString().split("\r\n")) {
            const hsep = h.indexOf(":");
            const hkey = h.substr(0, hsep);
            const hval = h.substr(hsep + 2);

            if (hkey === "Status") {
                this.res.status(parseInt(hval.substr(0, 3)));
                continue;
            }

            this.res.append(hkey, hval);
        }

        this.res.write(body);
    }

}

exports.Responder = Responder;

function createEnvironment(handler, req, res) {
    const queryString = req.url.indexOf("?") === -1 ? "" : req.url.substr(req.url.indexOf("?") + 1);
    const env = {
        SERVER_SIGNATURE: "",
        SERVER_SOFTWARE: 'Frank WEB Server',
        SERVER_NAME: req.connection.domain || "",
        SERVER_ADDR: req.connection.localAddress || "",
        SERVER_PORT: req.connection.localPort || "",
        REMOTE_ADDR: req.connection.remoteAddress || "",
        DOCUMENT_ROOT: handler.opt.documentRoot,
        REQUEST_SCHEME: req.protocol,
        SERVER_ADMIN: "[no address given]",
        SCRIPT_FILENAME: handler.opt.documentRoot + handler.script,
        REMOTE_PORT: req.connection.remotePort || "",
        REDIRECT_QUERY_STRING: queryString,
        REDIRECT_URL: "",
        GATEWAY_INTERFACE: 'CGI/1.1',
        SERVER_PROTOCOL: 'HTTP/1.1',
        REQUEST_METHOD: req.method,
        QUERY_STRING: queryString,
        REQUEST_URI: handler.opt.env.REQUEST_URI || req.url,
        SCRIPT_NAME: handler.script,
        PHP_SELF: handler.script,

        //HTTPS: req.protocol === 'https' ? 'on' : undefined,
        //SERVER_PROTOCOL: req.protocol.toUpperCase() + "/" + req.httpVersion,
    };

    const HTTP_headers = {};
    const ENV_headers = {};
    const XENV_headers = {};

    Object.entries(req.headers).reverse().map(([key]) => {
        HTTP_headers["HTTP_" + key.toUpperCase().replace(/-/g, "_")] = String(req.headers[key]);
    });

    Object.entries(env).reverse().map(([key]) => {
        ENV_headers[key] = env[key];
    });

    Object.entries(handler.opt.env).reverse().map(([key]) => {
        XENV_headers[key] = handler.opt.env[key];
    });

    return Object.assign(XENV_headers, ENV_headers, HTTP_headers);

}
