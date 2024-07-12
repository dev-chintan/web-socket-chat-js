import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PORT = 3000;
const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const sockets = new Set();

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

const handleSocketData = (buffer) => {
    console.log('Buffer:', buffer.toString());
    // TODO: Figure out how to handle data frames
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

    const socketHash = crypto
        .createHash('sha1')
        .update(socketKey + MAGIC_STRING)
        .digest('base64');

    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: WebSocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${socketHash}\r\n\r\n`
    );

    sockets.add(socket);

    socket.on('data', handleSocketData);
    socket.on('end', () => handleSocketEnd(socket));
    socket.on('error', (error) => handleSocketError(socket, error));
});

server.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT}`);
});

server.on('error', (error) => {
    console.error('Server error:', error);
});
