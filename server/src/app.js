const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const dotenv = require('dotenv');

// Load environment variables BEFORE importing services
dotenv.config();

const nepseService = require('./services/nepseService');
const googleSheetsService = require('./services/googleSheetsService');

const dailyJob = require('./jobs/dailyJob');
const weeklyJob = require('./jobs/weeklyJob');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const marketController = require('./controllers/marketController');

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/market/live', marketController.getLiveMarket);
app.get('/api/market/top-performers', marketController.getTopPerformers);
app.get('/api/market/sector-performance', marketController.getSectorPerformance);
app.get('/api/market/sector-history', marketController.getSectorHistory);
app.get('/api/market/predictions', marketController.getPredictions);
app.get('/api/market/evaluations', marketController.getEvaluations);
app.get('/api/market/stock-history', marketController.getStockHistory);

// Cron Jobs
// Daily Analysis at 3:15 PM (Sunday to Thursday)
cron.schedule('15 15 * * 0-4', () => {
    dailyJob();
});

// Weekly Analysis at 3:30 PM on Thursday
cron.schedule('30 15 * * 4', () => {
    weeklyJob();
});

// Manual Trigger Endpoints
app.post('/api/trigger-daily', async (req, res) => {
    try {
        console.log('Manual Trigger: Daily Analysis');
        await dailyJob();
        res.json({ success: true, message: 'Daily job executed successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/trigger-weekly', async (req, res) => {
    try {
        console.log('Manual Trigger: Weekly Analysis');
        await weeklyJob();
        res.json({ success: true, message: 'Weekly job executed successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
