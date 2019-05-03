"use strict";

exports.FCGIClient;

var net = require("net");
var FCGI = require("./FCGI");

class FCGIClient {
    constructor(socketOptions) {
        this.buffer = Buffer.alloc(0);
        this.reqId = 0;
        this.onData = this.onData.bind(this);
        this.onError = this.onError.bind(this);
        this.onClose = this.onClose.bind(this);
        this.socket = net.connect(socketOptions);
        this.socket.on("data", this.onData);
        this.socket.on("error", this.onError);
        this.socket.on("close", this.onClose);
    }

    send(msgType, content) {
        for (let offset = 0; offset < content.length || offset === 0; offset += 0xffff) {
            const chunk = content.slice(offset, offset + 0xffff);
            const header = FCGI.createHeader(FCGI.VERSION_1, msgType, this.reqId, chunk.length, 0);
            this.socket.write(header);
            this.socket.write(chunk);
        }
    }

    onData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);

        while (this.buffer.length) {
            const record = FCGI.parseHeader(this.buffer);
            if (!record) {
                break;
            }
            this.buffer = this.buffer.slice(record.recordLength);
            this.onRecord(record);
        }
    }

    onError() {}

    onClose() {}

    onRecord() {}

}

exports.FCGIClient = FCGIClient;
