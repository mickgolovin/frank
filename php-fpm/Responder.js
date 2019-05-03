"use strict";

const FCGI = require("./FCGI");
const FCGIClient = require("./FCGIClient");

class Responder extends FCGIClient.FCGIClient {
    constructor(handler, req, res, next) {
        super(handler.opt.socket);

        this.handler = handler;
        this.req = req;
        this.res = res;
        this.next = next;
        this.gotHead = false;
        this.reqId = handler.getFreeReqId();

        const env = createEnvironment(handler, req);

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

    onError() {
        this.next();
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

function createEnvironment(handler, req) {
    const sep = req.url.indexOf("?");
    const queryString = sep === -1 ? "" : req.url.substr(sep + 1);
    const queryURL = sep === -1 ? "" : req.url.substr(0, sep);
    const env = {
        SERVER_SIGNATURE: "",
        SERVER_SOFTWARE: "NODE SERVER",
        REDIRECT_STATUS: 200,
        SERVER_NAME: req.connection.domain || "",
        SERVER_ADDR: req.connection.localAddress,
        SERVER_PORT: req.connection.localPort,
        REMOTE_ADDR: req.connection.remoteAddress,
        DOCUMENT_ROOT: handler.opt.RootDir,
        REQUEST_SCHEME: req.protocol,
        SERVER_ADMIN: handler.opt.env.SERVER_ADMIN || "",
        SCRIPT_FILENAME: handler.opt.RootDir + handler.script,
        REMOTE_PORT: req.connection.remotePort,
        REDIRECT_QUERY_STRING: queryString,
        REDIRECT_URL: queryURL,
        GATEWAY_INTERFACE: 'CGI/1.1',
        SERVER_PROTOCOL: 'HTTP/1.1',
        REQUEST_METHOD: req.method,
        QUERY_STRING: queryString,
        REQUEST_URI: req.url,
        SCRIPT_NAME: handler.script,
        CONTENT_TYPE: req.headers["content-type"] || "",
        CONTENT_LENGTH: req.headers["content-length"] || ""
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

exports.Responder = Responder;
