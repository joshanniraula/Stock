const nepseService = require('../services/nepseService');
const googleSheetsService = require('../services/googleSheetsService');
const predictionService = require('../services/predictionService');

exports.getLiveMarket = async (req, res) => {
    try {
        // Option: helper to get today's data from Sheet first?
        // For 'Live' data, we usually want the latest from NePSE if market is open.
        // But if we want to stick to "Single Source of Truth", we could read 'daily_raw_data' for today.
        // However, the cron runs at 3:15 PM. Before that, data might be stale in sheet.
        // So for "Live", we fetch live.
        const data = await nepseService.fetchLiveMarketData();
        res.json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTopPerformers = async (req, res) => {
    try {
        const { type = 'best', limit = 50, period = 'daily' } = req.query; // type: 'best' or 'worst', period: 'daily' or 'weekly'
        console.log(`API: getTopPerformers type=${type} period=${period}`);

        // Determine sheet name
        const sheetName = period === 'weekly'
            ? (type === 'best' ? 'weekly_best_50' : 'weekly_worst_50')
            : 'daily_top_50';

        // Try reading from Sheet
        console.log(`API: Reading sheet ${sheetName}`);
        const sheetData = await googleSheetsService.readData(sheetName);
        console.log(`API: Sheet data length: ${sheetData ? sheetData.length : 0}`);

        if (sheetData && sheetData.length > 0) {
            const latestDate = sheetData[sheetData.length - 1]['Date'];
            console.log(`API: Latest date in sheet: ${latestDate}`);
            const todaysData = sheetData.filter(d => d['Date'] === latestDate);

            // Normalize keys to camelCase for frontend
            const normalizedData = todaysData.map(d => ({
                symbol: d['Symbol'],
                companyName: d['Company Name'],
                sector: d['Sector'],
                ltp: d['LTP'],
                volume: d['Trade Quantity'],
                percentChange: d['% Change'],
                transactions: d['Num Trades'] || 0,
                date: d['Date']
            }));

            // If requesting Worst daily and we don't have it (we only append TOP 50 daily), fallback to live
            if (period === 'daily' && type === 'worst') {
                console.log('API: Requesting worst daily, forcing fallback');
                // proceed to fallback
            } else {
                console.log(`API: Returning ${normalizedData.length} rows from sheet`);
                return res.json({ success: true, type, period, source: 'sheet', date: latestDate, data: normalizedData.slice(0, parseInt(limit)) });
            }
        }

        // Fallback to Live (Only for Daily)
        if (period === 'daily') {
            console.log('API: Fallback to live fetch...');
            const data = await nepseService.getTopPerformers(parseInt(limit), type);
            console.log(`API: Live fetch returned ${data.length} rows`);
            return res.json({ success: true, type, period, source: 'live', data });
        } else {
            return res.json({ success: true, type, period, source: 'none', data: [] });
        }

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSectorPerformance = async (req, res) => {
    try {
        const sheetData = await googleSheetsService.readData('sector_summary');

        if (sheetData && sheetData.length > 0) {
            const latestDate = sheetData[sheetData.length - 1]['Date'];
            const todaysData = sheetData.filter(d => d['Date'] === latestDate);

            const normalizedData = todaysData.map(d => ({
                sector: d['Sector'],
                avgChange: d['Avg Change'],
                totalVolume: d['Total Volume'],
                date: d['Date']
            }));

            // Sort
            normalizedData.sort((a, b) => parseFloat(b.avgChange) - parseFloat(a.avgChange));

            return res.json({ success: true, source: 'sheet', date: latestDate, data: normalizedData });
        }

        // Fallback
        const data = await nepseService.fetchLiveMarketData();
        const sectorGroups = {};
        data.forEach(item => {
            const sector = item.sector || 'Others';
            if (!sectorGroups[sector]) sectorGroups[sector] = [];
            sectorGroups[sector].push(item);
        });

        const sectorPerformance = Object.keys(sectorGroups).map(sector => {
            const items = sectorGroups[sector];
            const avgChange = items.reduce((sum, start) => sum + (parseFloat(start.percentChange) || 0), 0) / items.length;
            return { sector, avgChange: avgChange.toFixed(2), count: items.length };
        });

        sectorPerformance.sort((a, b) => b.avgChange - a.avgChange);

        res.json({ success: true, source: 'live', data: sectorPerformance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSectorHistory = async (req, res) => {
    try {
        const { range = '1D' } = req.query; // 1D, 1W, 1M, 3M, 6M, 9M, YTD, LIFETIME
        console.log(`API: getSectorHistory range=${range}`);

        // Read all sector data
        const sheetData = await googleSheetsService.readData('sector_summary');
        if (!sheetData || sheetData.length === 0) {
            return res.json({ success: true, data: { labels: [], datasets: [] } });
        }

        // Determine Start Date
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalize 'now' to midnight
        let startDate = new Date(now);

        switch (range.toUpperCase()) {
            case '1D':
                // For 1D, we want to include today and yesterday to ensure we show something
                // Or just "Since start of yesterday"
                startDate.setDate(now.getDate() - 1);
                break;
            case '1W':
                startDate.setDate(now.getDate() - 7);
                break;
            case '3M':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case '6M':
                startDate.setMonth(now.getMonth() - 6);
                break;
            case '9M':
                startDate.setMonth(now.getMonth() - 9);
                break;
            case 'YTD':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'LIFETIME':
                startDate = new Date(0); // Beginning of time
                break;
            default: // 1M or default
                startDate.setMonth(now.getMonth() - 1);
                break;
        }

        console.log(`API: Filter StartDate (Midnight): ${startDate.toISOString()}`);

        // Filter Data
        const filteredData = sheetData.filter(d => {
            const dateStr = d['Date'];
            // Normalize data date to midnight
            const date = new Date(dateStr);
            date.setHours(0, 0, 0, 0);

            // Check if date is valid
            if (isNaN(date.getTime())) return false;

            return date >= startDate;
        });

        console.log(`API: Found ${filteredData.length} records matching range ${range}`);

        // Group by Sector
        // Result Structure: { 'Commercial Bank': [{date, val}, ...], ... }
        const sectorGroups = {};
        const datesSet = new Set();

        filteredData.forEach(d => {
            const date = d['Date'];
            datesSet.add(date);
            const sector = d['Sector'];
            const val = parseFloat(d['Avg Change']);

            if (!sectorGroups[sector]) sectorGroups[sector] = [];
            sectorGroups[sector].push({ date, val });
        });

        // Format for Chart.js
        // Labels: Sorted Dates
        const labels = Array.from(datesSet).sort();

        // Datasets
        const datasets = Object.keys(sectorGroups).map(sector => {
            const dataPoints = sectorGroups[sector];
            // Map labels to values (filling gaps with null or previous value if needed, but here simple map)
            const data = labels.map(label => {
                const point = dataPoints.find(p => p.date === label);
                return point ? point.val : null;
            });

            return {
                label: sector,
                data,
                // Colors will be handled by frontend or random here
            };
        });

        res.json({ success: true, range, data: { labels, datasets } });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPredictions = async (req, res) => {
    try {
        const sheetData = await googleSheetsService.readData('predictions');
        if (!sheetData || sheetData.length === 0) {
            return res.json({ success: true, count: 0, data: [] });
        }

        // Latest date only
        const latestDate = sheetData[sheetData.length - 1]['Date'];
        const currentPredictions = sheetData.filter(d => d['Date'] === latestDate);

        const normalizedData = currentPredictions.map(d => {
            // Parse reason safely
            let reason = {};
            try { reason = JSON.parse(d['Reason']); } catch (e) { }

            return {
                symbol: d['Symbol'],
                companyName: d['Company Name'],
                sector: d['Sector'],
                prediction: d['Prediction'],
                confidence: d['Confidence'], // String '85.0'
                predictedPrice: d['Predicted Price'],
                reason,
                date: d['Date']
            };
        });

        res.json({ success: true, count: normalizedData.length, date: latestDate, data: normalizedData });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getEvaluations = async (req, res) => {
    try {
        const sheetData = await googleSheetsService.readData('weekly_evaluation');
        // Return active weights
        await predictionService.init();
        const weights = predictionService.weights;

        res.json({
            success: true,
            data: sheetData ? sheetData.reverse().slice(0, 100) : [], // Recent 100
            currentWeights: weights
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStockHistory = async (req, res) => {
    try {
        const { symbol } = req.query;
        if (!symbol) return res.status(400).json({ success: false, message: 'Symbol required' });

        const sheetData = await googleSheetsService.readData('daily_raw_data');
        if (!sheetData) return res.json({ success: true, data: [] });

        const history = sheetData
            .filter(d => d['Symbol'] === symbol)
            .map(d => ({
                date: d['Date'],
                ltp: parseFloat(d['LTP']),
                volume: parseFloat(d['Trade Quantity'])
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first

        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
