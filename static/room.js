// room.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

// Получаем элементы DOM
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

console.log('Room ID:', roomId, 'User:', userName);

if (!userName || !roomId) {
    alert('Нет данных о комнате');
    window.location.href = '/static/index.html';
}

// Отображаем информацию
roomIdDisplay.textContent = roomId;
userNameDisplay.textContent = userName;

// Переменные
let localStream;
let ws;
let isVideoEnabled = true;
let isAudioEnabled = true;
let readyToSend = false;
let mediaRecorder = null;
let receivedChunks = [];
let isVideoPlaying = false;

// Инициализация
async function init() {
    try {
        statusDiv.textContent = 'Запрос доступа к камере...';

        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        localVideo.srcObject = localStream;
        console.log('Локальное видео получено');

        // Подключаемся к серверу
        connectWebSocket();
    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
        statusDiv.textContent = 'Ошибка доступа к камере/микрофону';
    }
}

function connectWebSocket() {
    statusDiv.textContent = 'Подключение к серверу...';

    const wsUrl = `ws://localhost:3000/ws?room=${roomId}&user=${encodeURIComponent(userName)}`;
    console.log('Подключение к:', wsUrl);

    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = function () {
        console.log('WebSocket подключен');
        statusDiv.textContent = 'Подключено к серверу. Ожидание собеседника...';
    };

    ws.onmessage = function (event) {
        if (typeof event.data === 'string') {
            // Текстовое сообщение
            console.log('Текстовое сообщение от сервера:', event.data);

            try {
                const data = JSON.parse(event.data);

                if (data.type === 'user-joined') {
                    statusDiv.textContent = 'Собеседник подключился';
                } else if (data.type === 'user-left') {
                    statusDiv.textContent = 'Собеседник отключился';
                    remoteVideo.src = '';
                    readyToSend = false;
                    receivedChunks = [];
                    isVideoPlaying = false;

                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                }
            } catch (e) {
                console.log('Не JSON сообщение');
            }
        } else {
            // Бинарные данные (ArrayBuffer)
            console.log('Получены бинарные данные, размер:', event.data.byteLength);

            // Проверяем, не сигнал ли это ready (маленький размер)
            if (event.data.byteLength === 5) {
                // Конвертируем ArrayBuffer в строку для проверки
                const text = new TextDecoder().decode(event.data);
                console.log('Содержимое:', text);

                if (text === "ready") {
                    console.log('!!! ПОЛУЧЕН СИГНАЛ READY !!!');
                    statusDiv.textContent = 'Собеседник подключен. Начинаем передачу видео...';
                    readyToSend = true;

                    // Начинаем отправлять свое видео
                    startSendingVideo();

                    // Очищаем буфер для нового видео
                    receivedChunks = [];
                    isVideoPlaying = false;
                    return;
                }
            }

            // Если это не ready и мы готовы принимать видео
            if (readyToSend && event.data.byteLength > 0) {
                // Добавляем в буфер
                receivedChunks.push(event.data);
                console.log('Добавлен чанк видео, всего чанков:', receivedChunks.length);

                // Если видео еще не играет и накопили достаточно чанков
                if (!isVideoPlaying && receivedChunks.length >= 3) {
                    playVideo();
                }
            }
        }
    };

    ws.onerror = function (error) {
        console.error('WebSocket ошибка:', error);
        statusDiv.textContent = 'Ошибка подключения к серверу';
    };

    ws.onclose = function () {
        console.log('WebSocket закрыт');
        statusDiv.textContent = 'Соединение с сервером закрыто';
        readyToSend = false;
        receivedChunks = [];
        isVideoPlaying = false;

        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    };
}

function playVideo() {
    if (isVideoPlaying || receivedChunks.length === 0) return;

    console.log('Запускаем видео, всего чанков:', receivedChunks.length);

    // Создаем Blob из всех полученных чанков
    const videoBlob = new Blob(receivedChunks, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(videoBlob);

    remoteVideo.onplaying = function () {
        console.log('Видео начало играть');
        isVideoPlaying = true;
    };

    remoteVideo.onerror = function (e) {
        console.error('Ошибка видео:', e);
    };

    remoteVideo.onended = function () {
        console.log('Видео закончилось');
        // Можно продолжить принимать новые чанки
    };

    remoteVideo.src = videoUrl;
    remoteVideo.play().catch(e => console.error('Ошибка воспроизведения:', e));
}

function startSendingVideo() {
    if (!readyToSend) {
        console.log('Еще не готовы отправлять видео');
        return;
    }

    console.log('НАЧИНАЕМ ОТПРАВКУ ВИДЕО НА СЕРВЕР');

    try {
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
            console.log('Используем формат:', mimeType);
        }

        mediaRecorder = new MediaRecorder(localStream, {
            mimeType: mimeType
        });

        mediaRecorder.ondataavailable = function (event) {
            if (event.data.size > 0 && ws.readyState === WebSocket.OPEN && readyToSend) {
                const reader = new FileReader();
                reader.onload = function () {
                    ws.send(reader.result);
                    console.log('Отправлен кусок видео, размер:', reader.result.byteLength);
                };
                reader.readAsArrayBuffer(event.data);
            }
        };

        mediaRecorder.start(500);
        console.log('MediaRecorder запущен');

    } catch (error) {
        console.error('Ошибка запуска MediaRecorder:', error);
        statusDiv.textContent = 'Ошибка запуска видео';
    }
}

// Управление видео
toggleVideoBtn.addEventListener('click', () => {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            isVideoEnabled = videoTrack.enabled;
            toggleVideoBtn.textContent = isVideoEnabled ? 'Выключить видео' : 'Включить видео';
            toggleVideoBtn.style.backgroundColor = isVideoEnabled ? '#4CAF50' : '#f44336';
        }
    }
});

// Управление аудио
toggleAudioBtn.addEventListener('click', () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            isAudioEnabled = audioTrack.enabled;
            toggleAudioBtn.textContent = isAudioEnabled ? 'Выключить аудио' : 'Включить аудио';
            toggleAudioBtn.style.backgroundColor = isAudioEnabled ? '#4CAF50' : '#f44336';
        }
    }
});

// Выход из комнаты
leaveBtn.addEventListener('click', () => {
    console.log('Выход из комнаты');

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }

    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
        });
    }

    sessionStorage.clear();
    window.location.href = '/static/index.html';
});

// Запускаем инициализацию
init();