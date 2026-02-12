document.addEventListener('DOMContentLoaded', function () {
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const roomIdDisplay = document.getElementById('roomIdDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const toggleVideoBtn = document.getElementById('toggleVideoBtn');
    const toggleAudioBtn = document.getElementById('toggleAudioBtn');
    const leaveBtn = document.getElementById('leaveBtn');
    const statusDiv = document.getElementById('status');

    // Получаем данные из sessionStorage
    const userName = sessionStorage.getItem('userName');
    const roomId = sessionStorage.getItem('roomId');

    if (!userName || !roomId) {
        alert('Нет данных о комнате. Вернитесь на страницу подключения.');
        window.location.href = 'index.html';
        return;
    }

    // Отображаем информацию
    roomIdDisplay.textContent = roomId;
    userNameDisplay.textContent = userName;

    // Настройки WebRTC
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    };

    let localStream;
    let peerConnection;
    let ws;
    let isVideoEnabled = true;
    let isAudioEnabled = true;

    // Базовый URL вашего бекенда
    const baseUrl = 'ws://localhost:3000'; // Измените на ваш URL

    // Инициализация
    init();

    async function init() {
        try {
            // Получаем доступ к медиаустройствам
            localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            localVideo.srcObject = localStream;
            updateStatus('Подключение к WebSocket...', 'connecting');

            // Подключаемся к WebSocket
            connectWebSocket();

        } catch (error) {
            console.error('Ошибка доступа к медиаустройствам:', error);
            updateStatus('Ошибка доступа к камере/микрофону', 'disconnected');
            alert('Не удалось получить доступ к камере и микрофону. Проверьте разрешения.');
        }
    }

    function connectWebSocket() {
        // Подключаемся к вашему WebSocket эндпоинту
        ws = new WebSocket(`${baseUrl}/ws?room=${roomId}&user=${encodeURIComponent(userName)}`);

        ws.onopen = () => {
            updateStatus('Подключено к комнате. Ожидание собеседника...', 'connecting');
            setupPeerConnection();
        };

        ws.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);

                switch (message.type) {
                    case 'offer':
                        await handleOffer(message);
                        break;
                    case 'answer':
                        await handleAnswer(message);
                        break;
                    case 'ice-candidate':
                        await handleIceCandidate(message);
                        break;
                    case 'user-joined':
                        updateStatus('Собеседник присоединился. Установка соединения...', 'connecting');
                        break;
                    case 'user-left':
                        updateStatus('Собеседник покинул комнату', 'disconnected');
                        if (peerConnection) {
                            peerConnection.close();
                            peerConnection = null;
                        }
                        remoteVideo.srcObject = null;
                        break;
                    case 'error':
                        console.error('Ошибка сервера:', message.message);
                        updateStatus('Ошибка: ' + message.message, 'disconnected');
                        break;
                }
            } catch (error) {
                // Если сообщение не JSON, это может быть бинарные данные
                // В реальном приложении здесь будет обработка видео/аудио данных
                console.log('Получены бинарные данные:', event.data);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket ошибка:', error);
            updateStatus('Ошибка соединения', 'disconnected');
        };

        ws.onclose = () => {
            updateStatus('Соединение закрыто', 'disconnected');
        };
    }

    function setupPeerConnection() {
        peerConnection = new RTCPeerConnection(configuration);

        // Добавляем локальный поток
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Обработчики ICE кандидатов
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate
                }));
            }
        };

        // Получение удаленного потока
        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
            updateStatus('Соединение установлено', 'connected');
        };

        peerConnection.onconnectionstatechange = () => {
            console.log('Состояние соединения:', peerConnection.connectionState);
        };
    }

    async function handleOffer(offer) {
        if (!peerConnection) {
            setupPeerConnection();
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        ws.send(JSON.stringify({
            type: 'answer',
            sdp: answer.sdp
        }));
    }

    async function handleAnswer(answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    async function handleIceCandidate(candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate.candidate));
        } catch (error) {
            console.error('Ошибка добавления ICE кандидата:', error);
        }
    }

    // Управление медиа
    toggleVideoBtn.addEventListener('click', () => {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            isVideoEnabled = videoTrack.enabled;
            toggleVideoBtn.textContent = isVideoEnabled ? 'Выкл Видео' : 'Вкл Видео';
        }
    });

    toggleAudioBtn.addEventListener('click', () => {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            isAudioEnabled = audioTrack.enabled;
            toggleAudioBtn.textContent = isAudioEnabled ? 'Выкл Аудио' : 'Вкл Аудио';
        }
    });

    leaveBtn.addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        if (peerConnection) {
            peerConnection.close();
        }

        sessionStorage.clear();
        window.location.href = 'index.html';
    });

    function updateStatus(text, className) {
        statusDiv.textContent = text;
        statusDiv.className = className;
    }

    // Обработка закрытия страницы
    window.addEventListener('beforeunload', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });
});