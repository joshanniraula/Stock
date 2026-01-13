const axios = require('axios');

async function check() {
    try {
        const res = await axios.get('http://localhost:5000/api/market/top-performers?type=best&limit=10');
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.log('Res data:', e.response.data);
        }
    }
}

check();
