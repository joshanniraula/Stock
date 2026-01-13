require('dotenv').config(); // Load first
const googleSheetsService = require('./src/services/googleSheetsService');

async function inspectData() {
    try {
        console.log('Sheet ID:', process.env.GOOGLE_SHEET_ID);
        console.log('Reading sector_summary...');
        const sectors = await googleSheetsService.readData('sector_summary');
        console.log(`Sector Rows: ${sectors.length}`);
        if (sectors.length > 0) {
            console.log('First Row:', sectors[0]);
            console.log('Last Row:', sectors[sectors.length - 1]);
        }

        console.log('\nReading daily_raw_data...');
        const daily = await googleSheetsService.readData('daily_raw_data');
        console.log(`Daily Rows: ${daily.length}`);
        if (daily.length > 0) {
            console.log('First Row:', daily[0]);
            console.log('Last Row:', daily[daily.length - 1]);
        }

    } catch (e) {
        console.error(e);
    }
}

inspectData();
