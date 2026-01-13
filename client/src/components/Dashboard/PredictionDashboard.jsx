
import React, { useEffect, useState } from 'react';
import { getPredictions, getEvaluations, getStockHistory } from '../../services/api';
import { Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, AlertCircle, CheckCircle, BrainCircuit } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const PredictionDashboard = () => {
    const [predictions, setPredictions] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [weights, setWeights] = useState({});
    const [selectedStock, setSelectedStock] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [predRes, evalRes] = await Promise.all([
                    getPredictions(),
                    getEvaluations()
                ]);

                if (predRes.success) setPredictions(predRes.data || []);
                if (evalRes.success) {
                    setEvaluations(evalRes.data || []);
                    setWeights(evalRes.currentWeights || {});
                }

                // Select first prediction by default
                if (predRes.data && predRes.data.length > 0) {
                    handleSelectStock(predRes.data[0]);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSelectStock = async (stock) => {
        setSelectedStock(stock);
        setHistoryLoading(true);
        try {
            const res = await getStockHistory(stock.symbol);
            if (res.success) {
                setHistory(res.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setHistoryLoading(false);
            setLoading(false);
        }
    };

    // Chart Data Preparation
    const getChartData = () => {
        if (!selectedStock || history.length === 0) return null;

        // History Labels & Data
        const labels = history.map(h => h.date);
        const prices = history.map(h => h.ltp);

        // Add Prediction Point (Future)
        // We want to visually connect the last history point to the predicted point
        const lastDate = new Date(labels[labels.length - 1]);
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + 7); // Approx 1 week
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const extendedLabels = [...labels, futureDateStr];

        // Actual Data (stops at current)
        const actualData = [...prices, null];

        // Prediction Data (starts at last actual, goes to predicted)
        const lastPrice = prices[prices.length - 1];
        const predictedPrice = parseFloat(selectedStock.predictedPrice);

        // We need a dataset that is null everywhere except the last two points
        const predictionData = new Array(prices.length - 1).fill(null);
        predictionData.push(lastPrice);
        predictionData.push(predictedPrice);

        return {
            labels: extendedLabels,
            datasets: [
                {
                    label: 'Actual Price',
                    data: actualData,
                    borderColor: '#f43f5e', // Red
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    tension: 0.4,
                    pointRadius: 2
                },
                {
                    label: 'Predicted Trend',
                    data: predictionData,
                    borderColor: '#10b981', // Green/Blue
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981'
                }
            ]
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, labels: { color: '#94a3b8' } },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (ctx) => `Rs. ${ctx.raw}`
                }
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
            },
            x: {
                display: false // Hide dates for cleaner look if many points
            }
        }
    };

    if (loading) return (
        <div className="glass-panel p-8 flex items-center justify-center h-96">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: List */}
                <div className="glass-panel p-6 h-[600px] flex flex-col">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <BrainCircuit className="text-purple-400" />
                        AI Predictions
                        <span className="text-xs font-normal text-slate-500 ml-auto">
                            {predictions.length} items
                        </span>
                    </h2>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {predictions.length === 0 ? (
                            <div className="text-slate-500 text-center mt-10">No predictions available yet.</div>
                        ) : predictions.map((p, i) => (
                            <div
                                key={i}
                                onClick={() => handleSelectStock(p)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedStock === p
                                    ? 'bg-white/10 border-white/20 shadow-lg'
                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-200">{p.symbol}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.prediction === 'Growth' ? 'bg-emerald-500/20 text-emerald-400' :
                                        p.prediction === 'Downfall' ? 'bg-rose-500/20 text-rose-400' :
                                            'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {p.prediction}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Conf: {p.confidence}%</span>
                                    <span>Target: {p.predictedPrice}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Detail & Chart */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Top: Chart Area */}
                    {/* Top: Chart Area */}
                    <div className="glass-panel p-6 h-[400px] flex flex-col">
                        {selectedStock ? (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            {selectedStock.companyName}
                                            <span className="text-sm font-normal text-slate-400">({selectedStock.symbol})</span>
                                        </h3>
                                        <div className="flex gap-4 mt-2 text-sm">
                                            <div className="text-slate-400">
                                                Reason: <span className="text-slate-200">
                                                    Momentum: {selectedStock.reason?.momentum > 0 ? 'High' : 'Low'},
                                                    Vol: {selectedStock.reason?.volume > 0 ? 'High' : 'Low'}
                                                </span>
                                            </div>
                                            {selectedStock.reason?.note && (
                                                <div className="text-amber-400 text-xs flex items-center gap-1">
                                                    <AlertCircle size={14} />
                                                    {selectedStock.reason.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500">Predicted Price</div>
                                        <div className={`text-2xl font-bold ${selectedStock.prediction === 'Growth' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            Rs. {selectedStock.predictedPrice}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 relative">
                                    {historyLoading ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="animate-spin h-6 w-6 border-2 border-slate-500 rounded-full border-t-transparent"></div>
                                        </div>
                                    ) : (
                                        history.length > 0 && <Line data={getChartData()} options={chartOptions} />
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500">
                                Select a stock to view detailed prediction analysis
                            </div>
                        )}
                    </div>

                    {/* Bottom: Weekly Learning Log */}
                    <div className="glass-panel p-6">
                        <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-amber-500" />
                            Weekly Self-Learning Log
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                                <div className="text-xs text-slate-500 mb-1">Momentum Weight</div>
                                <div className="text-xl font-mono text-emerald-400">{(weights.momentum || 0).toFixed(3)}</div>
                            </div>
                            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                                <div className="text-xs text-slate-500 mb-1">Volume Weight</div>
                                <div className="text-xl font-mono text-blue-400">{(weights.volume || 0).toFixed(3)}</div>
                            </div>
                            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                                <div className="text-xs text-slate-500 mb-1">Sector Weight</div>
                                <div className="text-xl font-mono text-purple-400">{(weights.sector || 0).toFixed(3)}</div>
                            </div>
                        </div>

                        <div className="h-40 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-xs text-slate-500 border-b border-white/10 sticky top-0 bg-[#0f172a]">
                                    <tr>
                                        <th className="py-2">Date</th>
                                        <th className="py-2">Symbol</th>
                                        <th className="py-2">Error</th>
                                        <th className="py-2">Adjustment</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-300">
                                    {evaluations.map((ev, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                                            <td className="py-2 font-mono text-xs text-slate-500">{ev['Date']}</td>
                                            <td className="py-2 font-bold">{ev['Symbol']}</td>
                                            <td className="py-2 text-rose-400">{ev['Error Metric']}</td>
                                            <td className="py-2 text-xs text-slate-400">{ev['Adjustment']}</td>
                                        </tr>
                                    ))}
                                    {evaluations.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-4 text-center text-slate-500 text-xs">
                                                No evaluation history yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default PredictionDashboard;
