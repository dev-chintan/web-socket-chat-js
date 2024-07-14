import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PORT = 3000;
// MDN Magic String
const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const sockets = new Set();

// Serve Static Files
const serveFile = (res, filePath, contentType) => {
    fs.createReadStream(filePath)
        .on('error', () => {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        })
        .pipe(res)
        .on('open', () => {
            res.writeHead(200, { 'Content-Type': contentType });
        });
};

// Create an HTTP server to server the static files
const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
        if (req.url === '/') {
            serveFile(res, path.resolve('src', 'index.html'), 'text/html');
            return;
        }

        if (req.url === '/client.js') {
            serveFile(res, path.resolve('src', 'client.js'), 'application/javascript');
            return;
        }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

/*
    FIN: 1 bit, indicates if this is the final fragment (1) or if more fragments will follow (0).
	RSV1, RSV2, RSV3: 1 bit each, reserved for future use, must be 0 unless an extension defines them.
	Opcode: 4 bits, defines the frame type (e.g., text, binary, close, ping, pong).
	Mask: 1 bit, indicates if the payload is masked.
	Payload length: 7 bits (or 7+16 or 7+64 depending on the length).
	Masking key: 32 bits (if the Mask bit is set).
    Payload data: (x+y) bytes, the actual data being sent.
    */
const handleSocketData = (socket, frame ) => {
    const FIN = (frame[0] & 0x80) >> 7;
    const OPCODE = frame[0] & 0x0f;
    const MASK = (frame[1] & 0x80) >> 7;
    let payloadLength = frame[1] & 0x7f;
    
    if(!MASK){
        socket.destroy();
        return;
    }

    // Offset to start reading the payload data
    let offset = 2;

    if(payloadLength === 126) {
        payloadLength = frame.readUInt16BE(offset); // Read 16-bit payload length
        offset += 2;
    } else if (payloadLength === 127) {
        payloadLength = frame.readBigUInt64BE(offset); // Read 64-bit payload length
        offset += 8;
    }

    let maskingKey;

    if (MASK) {
        maskingKey = frame.slice(offset, offset + 4); // Read the 4-byte masking key
        offset += 4;
    }

    let payloadData = frame.slice(offset, offset + payloadLength); // Read the payload data

    if(MASK) {
        // Unmask the payload data
        for(let i = 0; i < payloadData.length; i++) {
            payloadData[i] ^= maskingKey[i % 4];
        }
    }

    switch (OPCODE) {
        case 0x1: // Text Frame
            const textFrame = payloadData.toString();
            console.log('Text Frame:', textFrame);
            // Broadcast to all connected clients
            sockets.forEach(clientSocket => {
                if(clientSocket.readyState === 'open'){
                    clientSocket.write(Buffer.from([0x81, textFrame.length, ...Buffer.from(textFrame)]));
                }
            })
            break;
        case 0x2: // Binary Frame
            console.log('Binary Frame:', payloadData);
            break;
        case 0x8: // Connection Close Frame
            console.log('Connection Close Frame');
            socket.end();
            break;
        case 0x9: // Ping Frame
            console.log('Ping Frame')
            socket.write(Buffer.from([0x8a, 0x00]))
            break;
        case 0xA: // Pong Frame
            console.log('Pong Frame');
            break;
        default:
            console.log('Unknown Frame');
            break;
    }
};

const handleSocketEnd = (socket) => {
    console.log('Socket connection ended.');
    sockets.delete(socket);
};

const handleSocketError = (socket, error) => {
    console.log('Socket error:', error);
    sockets.delete(socket);
};

server.on('upgrade', (req, socket, head) => {
    const socketKey = req.headers['sec-websocket-key'];
    if (!socketKey) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
    }

    // MDN: Concatenate socketKey + MAGIC_STRING, take the SHA-1 hash of the result, and return the base64
    const socketHash = crypto
        .createHash('sha1')
        .update(socketKey + MAGIC_STRING)
        .digest('base64');

    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: WebSocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${socketHash}\r\n`+
        '\r\n'
    );

    sockets.add(socket);

    socket.on('data', (frame) => handleSocketData(socket, frame));
    socket.on('end', () => handleSocketEnd(socket));
    socket.on('error', (error) => handleSocketError(socket, error));
});

server.listen(PORT, () => {
    console.log('Server running on PORT:', PORT);
});

server.on('error', (error) => {
    console.error('Server error:', error);
});
