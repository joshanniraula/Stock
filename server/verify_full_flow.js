const dotenv = require('dotenv');
dotenv.config();

const nepseService = require('./src/services/nepseService');
const googleSheetsService = require('./src/services/googleSheetsService');

async function verifyFlow() {
    console.log('1. Fetching Live Data...');
    const data = await nepseService.fetchLiveMarketData();
    console.log(`   Fetched ${data.length} records.`);

    if (data.length > 0) {
        console.log('2. Saving to Google Sheets...');
        await googleSheetsService.appendDailyData(data);
        console.log('   Data saved successfully.');
    } else {
        console.error('   Fetching failed, cannot save.');
    }
}

verifyFlow();
