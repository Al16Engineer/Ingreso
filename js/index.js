document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loader = document.getElementById('loader');
    const statusMessage = document.getElementById('statusMessage');

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmsaMtvKJYg1U7Sh42p7kw1pvk5Mi7Z4xII4hvpNn7me4C9HzrRWGFVSsAVzhrQT_I/exec';

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitBtn = this.querySelector('.btn');

        if (!username || !password) {
            showMessage('Por favor, completa todos los campos', 'error');
            return;
        }

        submitBtn.classList.add('loading');
        statusMessage.style.display = 'none';

        verifyCredentials(username, password, submitBtn);
    });

    function verifyCredentials(username, password, submitBtn) {
        console.log('Intentando verificar credenciales para:', username);

        fetch(`${SCRIPT_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
            method: 'GET',
            mode: 'cors',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Datos recibidos:', data);

            if (!data || !data.success || !Array.isArray(data.data)) {
                console.error('Formato de respuesta incorrecto:', data);
                showMessage('Formato de respuesta incorrecto', 'error');
                submitBtn.classList.remove('loading');
                return;
            }

            let usuarioEncontrado = null;

            for (let i = 0; i < data.data.length; i++) {
                const user = data.data[i];
                if (String(user.USUARIO) === String(username) && 
                    String(user.PASSWORD) === String(password)) {
                    usuarioEncontrado = user;
                    break;
                }
            }

            loader.style.display = 'none';

            if (usuarioEncontrado) {
                if (usuarioEncontrado.ESTADO !== 'ACTIVO') {
                    showMessage('Usuario Inactivo. Por favor contacte al administrador.', 'error');
                    submitBtn.classList.remove('loading');
                    return;
                }

                let welcomeMessage = 'Inicio de sesión exitoso. Bienvenido, ' + usuarioEncontrado.NOMBRE;

                if (usuarioEncontrado.SEDE === 'ALL') {
                    welcomeMessage += '<br>Por favor selecciona una sede';
                } else {
                    welcomeMessage += '<br>Sede: ' + usuarioEncontrado.SEDE;
                }

                statusMessage.innerHTML = welcomeMessage;
                statusMessage.className = 'status-message success';
                statusMessage.style.display = 'block';

                const userSession = {
                    username: username,
                    nombre: usuarioEncontrado.NOMBRE || usuarioEncontrado.USUARIO || username,
                    cargo: usuarioEncontrado.CARGO || 'Sin cargo asignado', // Asegura un valor por defecto
                    sede: usuarioEncontrado.SEDE || 'Sin sede asignada',
                    timestamp: new Date().getTime()
                  };
                  
                  // Verificación de depuración (puedes quitarla después)
                  console.log('Datos del usuario encontrado:', usuarioEncontrado);
                  console.log('Sesión guardada:', userSession);
                  localStorage.setItem('userSession', JSON.stringify(userSession));

                if (usuarioEncontrado.SEDE === 'ALL') {
                    showSedeModal(userSession);
                } else {
                    localStorage.setItem('userData', JSON.stringify(userSession));
                    localStorage.setItem('userSession', JSON.stringify(userSession));

                    setTimeout(() => {
                        window.location.href = 'ingresos.html';
                    }, 2000);
                }

            } else {
                showMessage('Usuario o contraseña incorrectos', 'error');
                submitBtn.classList.remove('loading');
            }
        })
        .catch(error => {
            console.error('Error detallado:', error);
            showMessage('Error de conexión. Intenta más tarde.', 'error');
            submitBtn.classList.remove('loading');
        });
    }

    function showMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + type;
        statusMessage.style.display = 'block';
    }

    function showSedeModal(userData) {
        const modal = document.getElementById('sedeModal');
        const sedeButtons = document.querySelectorAll('.sede-btn');

        modal.style.display = 'flex';

        sedeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const selectedSede = this.getAttribute('data-sede');
                
                // Set logo and restaurant name based on sede
                const logoPath = selectedSede === 'SANTA ROSA' ? 'img/logoSR.png' : 'img/logoMP.png';
                const restaurantName = selectedSede === 'SANTA ROSA' ? 'La Portada Campestre' : 'Meson de Piedra Campestre';
                
                userData.sede = selectedSede;
                userData.logoPath = logoPath;
                userData.restaurantName = restaurantName;
                
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('userSession', JSON.stringify(userData));

                modal.style.display = 'none';

                showMessage(`Sede ${selectedSede} seleccionada. Redirigiendo...`, 'success');

                setTimeout(() => {
                    window.location.href = 'ingresos.html';
                }, 1500);
            });
        });
    }

    // Limpiar mensajes al escribir
    document.getElementById('username').addEventListener('input', clearStatus);
    document.getElementById('password').addEventListener('input', clearStatus);

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.style.display = 'none';
        loader.style.display = 'none';
    }
});
