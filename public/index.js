const socket = io();
let localStream;
let streamId;

const startStreamBtn = document.getElementById('startStream');
const stopStreamBtn = document.getElementById('stopStream');
const streamStatus = document.getElementById('streamStatus');
const streamList = document.getElementById('streamList');
const videoContainer = document.getElementById('videoContainer');
const myStreamContainer = document.getElementById('myStreamContainer');
const myVideoContainer = document.getElementById('myVideoContainer');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

startStreamBtn.addEventListener('click', startStreaming);
stopStreamBtn.addEventListener('click', stopStreaming);
chatForm.addEventListener('submit', sendChatMessage);

socket.on('streamList', updateStreamList);
socket.on('newStream', addNewStream);
socket.on('streamData', receiveStreamData);
socket.on('endStream', removeStream);
socket.on('chatMessage', receiveChatMessage);

async function startStreaming() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamId = Date.now().toString();
        socket.emit('startStream', streamId);
        
        addVideoElement(streamId, localStream, true);

        startStreamBtn.disabled = true;
        stopStreamBtn.disabled = false;
        streamStatus.textContent = 'Streaming Live';
        streamStatus.style.color = '#ff4757';
        myStreamContainer.style.display = 'block';

        sendStreamData();
    } catch (error) {
        console.error('Error starting stream:', error);
        streamStatus.textContent = 'Error starting stream';
        streamStatus.style.color = '#ff6b6b';
    }
}

function sendStreamData() {
    if (localStream) {
        const track = localStream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        
        setInterval(async () => {
            const frame = await imageCapture.grabFrame();
            const canvas = document.createElement('canvas');
            canvas.width = frame.width;
            canvas.height = frame.height;
            canvas.getContext('2d').drawImage(frame, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.5);
            socket.emit('streamData', { streamId, imageData });
        }, 100);
    }
}

function stopStreaming() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        socket.emit('endStream', streamId);
        removeVideoElement(streamId);
        startStreamBtn.disabled = false;
        stopStreamBtn.disabled = true;
        streamStatus.textContent = 'Stream ended';
        streamStatus.style.color = '#ffffff';
        myStreamContainer.style.display = 'none';
    }
}

function updateStreamList(streams) {
    streamList.innerHTML = '';
    streams.forEach(stream => {
        if (stream !== streamId) {
            const li = document.createElement('li');
            li.textContent = `Stream ${stream}`;
            li.addEventListener('click', () => watchStream(stream));
            streamList.appendChild(li);
        }
    });
}

function addNewStream(data) {
    if (data.streamId !== streamId) {
        addVideoElement(data.streamId);
    }
}

function watchStream(watchStreamId) {
    addVideoElement(watchStreamId);
}

function addVideoElement(id, stream = null, isLocal = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    wrapper.id = `wrapper-${id}`;

    const video = document.createElement('video');
    video.autoplay = true;
    video.id = `video-${id}`;
    if (isLocal) {
        video.muted = true;
        video.srcObject = stream;
    }

    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    overlay.textContent = isLocal ? 'You' : `Stream ${id}`;

    wrapper.appendChild(video);
    wrapper.appendChild(overlay);

    if (isLocal) {
        myVideoContainer.appendChild(wrapper);
    } else {
        videoContainer.appendChild(wrapper);
    }
}

function removeVideoElement(id) {
    const wrapper = document.getElementById(`wrapper-${id}`);
    if (wrapper) {
        wrapper.parentNode.removeChild(wrapper);
    }
}

function removeStream(endedStreamId) {
    removeVideoElement(endedStreamId);
}

function receiveStreamData(data) {
    const video = document.getElementById(`video-${data.streamId}`);
    if (video) {
        video.src = data.imageData;
    }
}

function sendChatMessage(event) {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chatMessage', { streamId, message });
        chatInput.value = '';
    }
}

function receiveChatMessage(data) {
    const user = data.senderId === socket.id ? 'You' : `User ${data.senderId.substr(0, 4)}`;
    addChatMessage(user, data.message);
}

function addChatMessage(user, message) {
    const messageElement = document.createElement('p');
    messageElement.innerHTML = `<strong>${user}:</strong> ${message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}