require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const cron = require('node-cron');
const nepseService = require('../services/nepseService');
const googleSheetsService = require('../services/googleSheetsService');

const runDailyJob = async () => {
    console.log('Running Daily Job: Fetching Live Data...');
    try {
        // 0. Cleanup Duplicates (firstly)
        console.log('Step 0: Cleaning up duplicates...');
        await googleSheetsService.removeDuplicates('daily_raw_data');
        await googleSheetsService.removeDuplicates('daily_top_50');
        await googleSheetsService.removeDuplicates('sector_summary');

        // 1. Fetch Live Data
        const liveData = await nepseService.fetchLiveMarketData();
        if (!liveData || liveData.length === 0) {
            console.error('No data received from NEPSE.');
            return;
        }
        console.log(`Fetched ${liveData.length} records.`);

        // 2. Store Raw Data
        await googleSheetsService.appendData(liveData, 'daily_raw_data');

        // 3. Compute Top 50 (Best)
        // Note: nepseService logic already handles sorting, but we can reuse getTopPerformers if we want strict logic
        // But here we might want to just sort liveData
        const top50 = [...liveData].sort((a, b) => {
            // Primary: % Change desc
            const chgA = parseFloat(Object.is(a.percentChange, NaN) ? 0 : a.percentChange);
            const chgB = parseFloat(Object.is(b.percentChange, NaN) ? 0 : b.percentChange);
            if (chgA !== chgB) return chgB - chgA;
            return parseFloat(b.volume || 0) - parseFloat(a.volume || 0);
        }).slice(0, 50).map(d => ({ ...d, status: 'best' }));

        await googleSheetsService.appendData(top50, 'daily_top_50');

        // 4. Compute Sector Summary
        // Group by sector
        const sectors = {};
        liveData.forEach(d => {
            const s = d.sector || 'Others';
            if (!sectors[s]) sectors[s] = { totalChange: 0, totalVol: 0, count: 0 };
            sectors[s].totalChange += parseFloat(d.percentChange || 0);
            sectors[s].totalVol += parseFloat(d.volume || 0);
            sectors[s].count++;
        });

        const sectorSummary = Object.keys(sectors).map(s => ({
            sector: s,
            avgChange: (sectors[s].totalChange / sectors[s].count).toFixed(2),
            totalVolume: sectors[s].totalVol
        }));

        await googleSheetsService.appendData(sectorSummary, 'sector_summary');
        console.log('Daily Job Completed Successfully.');

    } catch (error) {
        console.error('Daily Job Failed:', error);
    }
};

// Use this for testing immediately if run directly
if (require.main === module) {
    runDailyJob();
}

// Schedule: 3:05 PM everyday (NEPSE closes at 3 PM)
// cron.schedule('5 15 * * 0-4', runDailyJob); // Sunday-Thursday

module.exports = runDailyJob;
