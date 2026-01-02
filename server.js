const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    socket.on('join', (email) => {
        socket.join(email);
        console.log(`User joined room: ${email}`);
    });
socket.on('signal', (data) => {
        socket.to(data.email).emit('signal', data.signal);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo-Ghost running on port ${PORT}`));
