const axios = require('axios');
const FormData = require('form-data');

async function main() {
    try {
        // Authenticate as admin to get token
        const login = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@jufra.org', // replace with a valid admin email if known, or bypass
            password: 'admin' // placeholder
        });
        const token = login.data.token;

        const form = new FormData();
        form.append('titulo', 'Test from Script');
        form.append('contenido', 'Content');
        form.append('tipo', 'urgente');

        const res = await axios.post('http://localhost:5000/api/anuncios', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log(res.data);
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
main();
