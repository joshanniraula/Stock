const googleSheetsService = require('./googleSheetsService');
const nepseCalendar = require('../utils/nepseCalendar');

class PredictionService {
    constructor() {
        // Default weights for the ensemble model
        this.weights = {
            momentum: 0.4, // Price trend influence
            volume: 0.3,   // Volume trend influence
            sector: 0.3    // Sector performance influence
        };
        // Learning rate for self-correction
        this.learningRate = 0.05;
        this.initialized = false;
    }

    /**
     * Initialize model by loading latest parameters from DB/Sheets
     */
    async init() {
        if (this.initialized) return;
        console.log('Initializing Prediction Engine...');
        try {
            const params = await googleSheetsService.readData('model_params');
            if (params && params.length > 0) {
                // Find latest date
                const sorted = params.sort((a, b) => new Date(b['Date']) - new Date(a['Date']));
                const latestDate = sorted[0]['Date'];
                const currentParams = sorted.filter(p => p['Date'] === latestDate);

                currentParams.forEach(p => {
                    const key = p['Param Name'];
                    const val = parseFloat(p['Value']);
                    if (this.weights[key] !== undefined) {
                        this.weights[key] = val;
                    }
                });
                console.log('Loaded model weights:', this.weights);
            } else {
                console.log('No existing model params found. Using defaults:', this.weights);
            }
            this.initialized = true;
        } catch (error) {
            console.error('Failed to init prediction service:', error);
        }
    }

    /**
     * Generate prediction for a single stock
     * @param {Object} stockHistory - Array of daily data points for the stock
     * @param {Object} sectorTrend - Numeric score of sector performance (-1 to 1)
     */
    async predict(stock, stockHistory, sectorTrend = 0) {
        await this.init();

        // 1. Calculate Momentum Score (-1 to 1)
        const momentumScore = this.calculateMomentum(stockHistory);

        // 2. Calculate Volume Score (-1 to 1)
        const volumeScore = this.calculateVolumeScore(stockHistory);

        // 3. Normalized Sector Score
        const sectorScore = Math.max(-1, Math.min(1, sectorTrend / 5));

        // 4. NEPSE Sector Sensitivity (Beta)
        // Hydro is volatile, Banks are stable
        let sectorBeta = 1.0;
        if (stock.sector === 'Hydropower') sectorBeta = 1.2;
        else if (stock.sector === 'Commercial Bank') sectorBeta = 0.8;
        else if (stock.sector === 'Life Insurance') sectorBeta = 0.9;

        // 5. Holiday Context
        const today = new Date(); // In production this date passes from caller (weekly job execution time)
        const holidayContext = nepseCalendar.getHolidayContext(today);
        let holidayDampener = 1.0;
        let holidayNote = '';

        if (holidayContext.hasHoliday) {
            holidayDampener = 0.6; // Reduce volatility expectation by 40%
            holidayNote = ` (${holidayContext.note})`;
        }

        // 6. Ensemble
        const rawScore = (
            (momentumScore * this.weights.momentum * sectorBeta) +
            (volumeScore * this.weights.volume * holidayDampener) +
            (sectorScore * this.weights.sector)
        );

        // 7. Categorize
        let prediction = 'Neutral';
        let confidence = Math.abs(rawScore); // 0 to 1

        // Dampen confidence during holidays
        if (holidayContext.hasHoliday) {
            confidence *= 0.8;
        }

        if (rawScore > 0.2) prediction = 'Growth';
        else if (rawScore < -0.2) prediction = 'Downfall';

        // 8. Predict Price
        const currentPrice = stock.ltp;
        const projectedChange = rawScore * 0.10 * holidayDampener;
        const predictedPrice = currentPrice * (1 + projectedChange);

        return {
            symbol: stock.symbol,
            companyName: stock.companyName,
            sector: stock.sector,
            prediction,
            confidence: (confidence * 100).toFixed(1),
            predictedPrice: predictedPrice.toFixed(2),
            rawScore,
            reason: {
                momentum: momentumScore.toFixed(2),
                volume: volumeScore.toFixed(2),
                sector: sectorScore.toFixed(2),
                weights: this.weights,
                note: holidayNote ? `Market: ${holidayNote}` : undefined,
                holidayEffect: holidayContext.hasHoliday
            }
        };
    }

    calculateMomentum(history) {
        // Need at least a few days
        if (history.length < 5) return 0;
        const recent = history.slice(-5);
        const start = recent[0].ltp;
        const end = recent[recent.length - 1].ltp;
        const change = (end - start) / start;
        // Sigmoid-ish normalization: 10% change => ~1.0
        return Math.max(-1, Math.min(1, change * 10));
    }

    calculateVolumeScore(history) {
        if (history.length < 5) return 0;
        // Check correlation between price change and volume
        let score = 0;
        const recent = history.slice(-5);

        // Avg volume
        const avgVol = recent.reduce((a, b) => a + b.volume, 0) / recent.length;

        recent.forEach(day => {
            const volRatio = day.volume / avgVol; // >1 if high volume
            // If price went up on high volume => Bullish (+1)
            // If price went down on high volume => Bearish (-1)
            if (day.percentChange > 0) score += (volRatio * 0.5);
            else if (day.percentChange < 0) score -= (volRatio * 0.5);
        });

        // Normalize
        return Math.max(-1, Math.min(1, score / recent.length));
    }

    /**
     * Evaluate past predictions and adjust weights
     * @param {Array} pastPredictions 
     * @param {Array} currentActuals 
     */
    async evaluateAndLearn(pastPredictions, currentActuals) {
        await this.init();
        console.log('Evaluating past predictions...');

        let totalError = 0;
        let count = 0;
        let weightAdjustments = { momentum: 0, volume: 0, sector: 0 };

        const evaluations = [];

        pastPredictions.forEach(pred => {
            const actual = currentActuals.find(a => a.symbol === pred.Symbol || a.symbol === pred.Symbol);
            if (!actual) return;

            // Calculate Error using Price
            const predictedPrice = parseFloat(pred['Predicted Price']);
            const actualPrice = actual.ltp;

            // Percentage Error
            const error = (actualPrice - predictedPrice) / actualPrice; // +ve if actual > predicted (Underestimated)
            const absError = Math.abs(error);

            totalError += absError;
            count++;

            // Analyze cause (Simple Heuristic)
            let reason = {};
            try { reason = JSON.parse(pred['Reason']); } catch (e) { }

            // Logic:
            const errorDirection = error > 0 ? 1 : -1; // 1 = market did better than expected

            // Gradient Descent-ish step
            if (reason.momentum) {
                weightAdjustments.momentum += (error * parseFloat(reason.momentum));
            }
            if (reason.volume) weightAdjustments.volume += (error * parseFloat(reason.volume));
            if (reason.sector) weightAdjustments.sector += (error * parseFloat(reason.sector));

            evaluations.push({
                date: new Date().toISOString().split('T')[0],
                symbol: pred.Symbol,
                actualOutcome: actualPrice,
                errorMetric: (absError * 100).toFixed(2) + '%',
                adjustment: 'Pending Batch Update'
            });
        });

        // Apply Batched Adjustments
        if (count > 0) {
            let effLearningRate = this.learningRate;

            // Check if last week was holiday heavy (less reliable)
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const holidayCtx = nepseCalendar.getHolidayContext(lastWeek);

            if (holidayCtx.hasHoliday) {
                console.log('Last week was a Holiday week. Reducing Learning Rate.');
                effLearningRate *= 0.5;
            }

            this.weights.momentum += (weightAdjustments.momentum / count) * effLearningRate;
            this.weights.volume += (weightAdjustments.volume / count) * effLearningRate;
            this.weights.sector += (weightAdjustments.sector / count) * effLearningRate;

            // Normalize weights to sum to 1 (optional but good for stability)
            const totalW = Math.abs(this.weights.momentum) + Math.abs(this.weights.volume) + Math.abs(this.weights.sector);
            if (totalW > 0) {
                this.weights.momentum /= totalW;
                this.weights.volume /= totalW;
                this.weights.sector /= totalW;
            }

            console.log(`Model Evaluated. Mean Error: ${(totalError / count * 100).toFixed(2)}%. New Weights:`, this.weights);

            // Save new params
            const newParams = [
                { date: undefined, paramName: 'momentum', value: this.weights.momentum },
                { date: undefined, paramName: 'volume', value: this.weights.volume },
                { date: undefined, paramName: 'sector', value: this.weights.sector },
            ];
            await googleSheetsService.appendData(newParams, 'model_params');

            // Save evaluations
            await googleSheetsService.appendData(evaluations, 'weekly_evaluation');
        }

        return evaluations;
    }
}

module.exports = new PredictionService();
