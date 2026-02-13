document.addEventListener('DOMContentLoaded', function () {
    const nameInput = document.getElementById('name');
    const roomInput = document.getElementById('room');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const errorMessage = document.getElementById('errorMessage');
    const infoMessage = document.getElementById('infoMessage');

    // Базовый URL вашего бекенда
    const baseUrl = 'http://localhost:3000'; // Измените на ваш URL

    createRoomBtn.addEventListener('click', function () {
        connectToRoom(true);
    });

    joinRoomBtn.addEventListener('click', function () {
        connectToRoom(false);
    });

    function connectToRoom(isCreating) {
        const name = nameInput.value.trim();

        if (!name) {
            showError('Введите ваше имя');
            return;
        }

        errorMessage.textContent = '';
        infoMessage.textContent = isCreating ? 'Создание комнаты...' : 'Подключение к комнате...';

        const connectionData = {
            Name: name,
            Room: isCreating ? 0 : parseInt(roomInput.value)
        };

        fetch(`${baseUrl}/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(connectionData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка сервера');
                }
                return response.json();
            })
            .then(data => {

                if (data.room && data.room > 0) {
                    // Сохраняем данные в sessionStorage
                    sessionStorage.setItem('userName', name);
                    sessionStorage.setItem('roomId', data.room);

                    // Переходим в комнату
                    console.log(sessionStorage.getItem('userName'), sessionStorage.getItem('roomId'));
                    window.location.href = '/static/room.html';
                } else {
                    showError(data.message || 'Неизвестная ошибка');
                }
            })
            .catch(error => {
                showError('Ошибка подключения: ' + error.message);
                infoMessage.textContent = '';
            });
    }

    function showError(message) {
        errorMessage.textContent = message;
    }
});