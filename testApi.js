const axios = require('axios');
const FormData = require('form-data');

async function test() {
    try {
        const login = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'password123'
        });
        const token = login.data.token;
        console.log('Login success');

        const fd = new FormData();
        fd.append('titulo', 'Test Crash');
        fd.append('contenido', 'Contenido 123');
        fd.append('tipo', 'urgente');
        // Omit lat/lng to simulate user creating anuncio without map pin
        // Wait, the screenshot SHOWS a map pin inside South America!
        fd.append('lat', '-10.5'); // Or something
        fd.append('lng', '-70.2');

        const res = await axios.post('http://localhost:5000/api/anuncios', fd, {
            headers: {
                ...fd.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Anuncio res:', res.data);
    } catch (e) {
        if (e.response) {
            console.error('Server error:', e.response.status, e.response.data);
        } else {
            console.error('Network error:', e.message);
        }
    }
}
test();
