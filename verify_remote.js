const axios = require('axios');

const BASE_URL = 'https://stock-qjbq.onrender.com';

async function verify() {
    console.log(`Checking ${BASE_URL}...`);

    try {
        console.log('\n1. Testing Root (/)');
        const root = await axios.get(BASE_URL + '/');
        console.log(`Status: ${root.status}`);
        console.log(`Data: ${root.data}`);
    } catch (error) {
        console.log(`Root Failed: ${error.message}`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Data: ${error.response.data}`);
        }
    }

    try {
        console.log('\n2. Testing Health (/api/health)');
        const health = await axios.get(BASE_URL + '/api/health');
        console.log(`Status: ${health.status}`);
        console.log(`Data:`, health.data);
    } catch (error) {
        console.log(`Health Failed: ${error.message}`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Data: ${error.response.data}`);
        }
    }
}

verify();
