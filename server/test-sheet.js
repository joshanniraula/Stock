const dotenv = require('dotenv');
dotenv.config();

const googleSheetsService = require('./src/services/googleSheetsService');

(async () => {
    console.log('Testing Google Sheets Write...');

    // Mock Data
    const mockData = [
        { symbol: 'TEST1', ltp: 100, percentChange: 5.5, turnover: 100000, sector: 'Banking', status: 'up' },
        { symbol: 'TEST2', ltp: 250, percentChange: -2.3, turnover: 50000, sector: 'Hydropower', status: 'down' }
    ];

    await googleSheetsService.appendDailyData(mockData, 'DailyData');
    console.log('Test Complete. Check your Google Sheet.');
})();
