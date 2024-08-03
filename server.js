const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const activeStreams = new Map();

io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  // Send current stream list to newly connected client
  socket.emit('streamList', Array.from(activeStreams.keys()));

  socket.on('startStream', (streamId) => {
    console.log(`Stream started: ${streamId} by ${socket.id}`);
    activeStreams.set(streamId, socket.id);
    io.emit('streamList', Array.from(activeStreams.keys()));
    io.emit('newStream', { streamId, userId: socket.id });
  });

  socket.on('streamData', (data) => {
    socket.broadcast.emit('streamData', data);
  });

  socket.on('endStream', (streamId) => {
    console.log(`Stream ended: ${streamId}`);
    activeStreams.delete(streamId);
    io.emit('streamList', Array.from(activeStreams.keys()));
    io.emit('endStream', streamId);
  });

  socket.on('chatMessage', (data) => {
    io.emit('chatMessage', {
      streamId: data.streamId,
      senderId: socket.id,
      message: data.message
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id);
    for (const [streamId, userId] of activeStreams.entries()) {
      if (userId === socket.id) {
        activeStreams.delete(streamId);
        io.emit('streamList', Array.from(activeStreams.keys()));
        io.emit('endStream', streamId);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});