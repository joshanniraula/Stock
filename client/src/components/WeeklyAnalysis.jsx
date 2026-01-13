import React, { useEffect, useState } from 'react';
import { getTopPerformers } from '../services/api';
import { Line } from 'react-chartjs-2';
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
import { motion } from 'framer-motion';
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

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

const WeeklyAnalysis = () => {
    const [best, setBest] = useState([]);
    const [worst, setWorst] = useState([]);
    const [activeTab, setActiveTab] = useState('best');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Period = weekly
                const bestRes = await getTopPerformers('best', 'weekly');
                const worstRes = await getTopPerformers('worst', 'weekly');
                if (bestRes.success) setBest(bestRes.data);
                if (worstRes.success) setWorst(worstRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const dataToShow = activeTab === 'best' ? best : worst;

    // Chart Data: Top 10 only for clarity
    const chartData = {
        labels: dataToShow.slice(0, 10).map(d => d.symbol),
        datasets: [
            {
                label: `Weekly % Change`,
                data: dataToShow.slice(0, 10).map(d => parseFloat(d.percentChange)),
                borderColor: activeTab === 'best' ? '#10b981' : '#f43f5e',
                backgroundColor: activeTab === 'best' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#0f172a',
                pointBorderColor: activeTab === 'best' ? '#10b981' : '#f43f5e',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (context) => `${context.raw}%`
                }
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                    color: '#94a3b8',
                    font: { family: 'Outfit', size: 10 }
                },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: {
                    color: '#64748b',
                    font: { family: 'Outfit', size: 10 }
                },
                border: { display: false }
            }
        }
    };

    if (loading) return (
        <div className="glass-panel p-6 h-[500px] flex items-center justify-center animate-pulse">
            <div className="text-center">
                <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-sm text-slate-500">Loading Weekly Data...</div>
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-panel p-6"
        >
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <TrendingUp size={20} className="text-amber-500" />
                        Weekly Analysis
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 ml-7">Performance over the last 7 days</p>
                </div>

                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
                    <button
                        onClick={() => setActiveTab('best')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'best'
                                ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        Best Performers
                    </button>
                    <button
                        onClick={() => setActiveTab('worst')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'worst'
                                ? 'bg-rose-500/10 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        Worst Performers
                    </button>
                </div>
            </div>

            <div className="h-64 mb-8 relative px-2">
                {dataToShow.length > 0 ? (
                    <Line data={chartData} options={options} />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-500 gap-2">
                        <TrendingUp size={32} className="opacity-20" />
                        <span className="text-sm">No Weekly Data Available</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-64 overflow-y-auto pr-2 custom-scrollbar">
                {dataToShow.length > 0 ? dataToShow.map((item, i) => (
                    <motion.div
                        key={item.symbol}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded ${activeTab === 'best' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {i + 1}
                            </span>
                            <div>
                                <div className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors">{item.symbol}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.sector}</div>
                            </div>
                        </div>
                        <div className={`font-mono-num font-bold text-sm flex items-center gap-1 ${activeTab === 'best' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {activeTab === 'best' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {item.percentChange}%
                        </div>
                    </motion.div>
                )) : (
                    <div className="col-span-2 text-center text-slate-500 mt-10 text-sm">Data not yet aggregated</div>
                )}
            </div>
        </motion.div>
    );
};

export default WeeklyAnalysis;
