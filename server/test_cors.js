const axios = require('axios');

const BASE_URL = 'https://stock-qjbq.onrender.com/api/trigger-daily';
const ORIGIN = 'https://missionstock.netlify.app';

async function testCors() {
    console.log(`Testing CORS for ${BASE_URL}`);
    console.log(`Simulating Origin: ${ORIGIN}`);

    try {
        console.log('\n1. Sending OPTIONS request (Preflight)...');
        const preflight = await axios.options(BASE_URL, {
            headers: {
                'Origin': ORIGIN,
                'Access-Control-Request-Method': 'POST'
            },
            validateStatus: () => true // Don't throw on 4xx/5xx
        });

        console.log(`Status: ${preflight.status}`);
        console.log('Access-Control-Allow-Origin:', preflight.headers['access-control-allow-origin']);
        console.log('Access-Control-Allow-Methods:', preflight.headers['access-control-allow-methods']);

        if (preflight.status === 404) {
            console.log("CRITICAL: OPTIONS request returned 404. The CORS middleware might not be working or the server is old.");
        }

        console.log('\n2. Sending POST request...');
        const response = await axios.post(BASE_URL, {}, {
            headers: { 'Origin': ORIGIN },
            validateStatus: () => true
        });

        console.log(`Status: ${response.status}`);
        console.log('Data:', response.data);
        console.log('Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

testCors();
