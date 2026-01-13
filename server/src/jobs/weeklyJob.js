require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const cron = require('node-cron');
const googleSheetsService = require('../services/googleSheetsService');
const predictionService = require('../services/predictionService');

const runWeeklyJob = async () => {
    console.log('Running Weekly Job: Analysis & Prediction...');
    try {
        // 1. Read 'daily_raw_data'
        const rawData = await googleSheetsService.readData('daily_raw_data');
        if (rawData.length === 0) {
            console.log('No historical data to process.');
            return;
        }

        // ==========================================
        // PART A: Weekly Performance Aggregation
        // ==========================================

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const stockHistory = {};
        const sectorScores = {}; // To store sector performance

        rawData.forEach(row => {
            const date = new Date(row['Date']);
            // We need enough history for prediction (at least 2 weeks hopefully)
            if (date >= twoWeeksAgo) {
                const sym = row['Symbol'];
                if (!stockHistory[sym]) stockHistory[sym] = [];
                stockHistory[sym].push({
                    date: date,
                    ltp: parseFloat(row['LTP']),
                    volume: parseFloat(row['Trade Quantity'] || 0),
                    percentChange: parseFloat(row['% Change'] || 0)
                });
            }
        });

        const weeklyPerformance = [];
        const currentPrices = []; // For evaluation

        Object.keys(stockHistory).forEach(sym => {
            const entries = stockHistory[sym].sort((a, b) => a.date - b.date);
            if (entries.length === 0) return;

            // Latest Entry
            const end = entries[entries.length - 1];
            currentPrices.push({ symbol: sym, ltp: end.ltp });

            // Weekly Calc (approximate)
            const entriesInWeek = entries.filter(e => e.date >= oneWeekAgo);
            if (entriesInWeek.length < 2) return;

            const start = entriesInWeek[0];
            const endWeek = entriesInWeek[entriesInWeek.length - 1];
            const pctChange = ((endWeek.ltp - start.ltp) / start.ltp) * 100;
            const totalVol = entriesInWeek.reduce((acc, curr) => acc + curr.volume, 0);

            weeklyPerformance.push({
                symbol: sym,
                companyName: rawData.find(r => r.Symbol === sym)['Company Name'],
                sector: rawData.find(r => r.Symbol === sym)['Sector'],
                ltp: endWeek.ltp,
                volume: totalVol,
                percentChange: pctChange.toFixed(2),
                transactions: 0
            });
        });

        // Save Weekly Best/Worst as before...
        const best50 = [...weeklyPerformance].sort((a, b) => b.percentChange - a.percentChange).slice(0, 50);
        const worst50 = [...weeklyPerformance].sort((a, b) => a.percentChange - b.percentChange).slice(0, 50);

        await googleSheetsService.appendData(best50, 'weekly_best_50');
        await googleSheetsService.appendData(worst50, 'weekly_worst_50');

        // ==========================================
        // PART B: Prediction Engine & Learning
        // ==========================================

        console.log('Starting Prediction Phase...');

        // 1. Evaluate OLD Predictions (if any exist from ~7 days ago)
        const allPredictions = await googleSheetsService.readData('predictions');
        if (allPredictions.length > 0) {
            // Filter predictions made roughly 7 days ago (allow 5-9 days window)
            // Actually, simplified: Just evaluate ALL pending predictions that haven't been evaluated?
            // For now, let's just grab the batch from last week.
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const lastWeekStr = lastWeek.toISOString().split('T')[0];

            // Loose matching for "last week"
            const oldPredictions = allPredictions.filter(p => {
                const pDate = new Date(p['Date']);
                const diffTime = Math.abs(new Date() - pDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 5 && diffDays <= 10;
            });

            if (oldPredictions.length > 0) {
                console.log(`Found ${oldPredictions.length} old predictions to evaluate.`);
                await predictionService.evaluateAndLearn(oldPredictions, currentPrices);
            } else {
                console.log('No matching old predictions found to evaluate.');
            }
        }

        // 2. Generate NEW Predictions
        // Calculate Sector Trends first for input
        // Simple sector trend = Average % change of stocks in that sector this week
        const sectorMap = {};
        weeklyPerformance.forEach(p => {
            if (!sectorMap[p.sector]) sectorMap[p.sector] = [];
            sectorMap[p.sector].push(parseFloat(p.percentChange));
        });

        const sectorTrends = {};
        Object.keys(sectorMap).forEach(sect => {
            const avg = sectorMap[sect].reduce((a, b) => a + b, 0) / sectorMap[sect].length;
            sectorTrends[sect] = avg; // % change (+2.5, -1.2 etc)
        });

        const newPredictions = [];
        // Predict for Top 100 interesting stocks (e.g., top traded or performers) to save quota
        // Or just predict for the 'weeklyPerformance' list (which is active stocks)
        for (const stock of weeklyPerformance) {
            const history = stockHistory[stock.symbol] || [];
            const sectorTrend = sectorTrends[stock.sector] || 0;

            const pred = await predictionService.predict(stock, history, sectorTrend);
            newPredictions.push(pred);
        }

        if (newPredictions.length > 0) {
            console.log(`Generated ${newPredictions.length} predictions.`);
            await googleSheetsService.appendData(newPredictions, 'predictions');
        }

        console.log('Weekly Job Completed Details.');

    } catch (error) {
        console.error('Weekly Job Failed:', error);
    }
};

if (require.main === module) {
    runWeeklyJob();
}

module.exports = runWeeklyJob;
