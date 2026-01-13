import React, { useEffect, useState } from 'react';
import { getSectorPerformance, getSectorHistory } from '../services/api';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

const TIME_RANGES = ['1D', '3D', '1W', '3M', '6M', '9M', 'YTD', 'LIFETIME'];

const SectorAnalytics = () => {
    // View Mode: 'snapshot' (Bar) or 'history' (Line)
    const [viewMode, setViewMode] = useState('snapshot');

    // Snapshot Data
    const [sectorData, setSectorData] = useState([]);

    // History Data
    const [historyData, setHistoryData] = useState({ labels: [], datasets: [] });
    const [timeRange, setTimeRange] = useState('1W');

    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Initial Load (Snapshot)
    useEffect(() => {
        const fetchSnapshot = async () => {
            try {
                const res = await getSectorPerformance();
                if (res.success) {
                    const sorted = res.data.sort((a, b) => parseFloat(b.avgChange) - parseFloat(a.avgChange));
                    setSectorData(sorted);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSnapshot();
    }, []);

    // Load History when mode is 'history' or range changes
    useEffect(() => {
        if (viewMode === 'history') {
            const fetchHistory = async () => {
                setLoadingHistory(true);
                try {
                    const res = await getSectorHistory(timeRange);
                    if (res.success) {
                        setHistoryData(res.data);
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoadingHistory(false);
                }
            };
            fetchHistory();
        }
    }, [viewMode, timeRange]);

    // ----- Chart Configs -----
    const barChartData = {
        labels: sectorData.map(d => d.sector),
        datasets: [
            {
                label: 'Avg % Change',
                data: sectorData.map(d => parseFloat(d.avgChange)),
                backgroundColor: sectorData.map(d => parseFloat(d.avgChange) >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)'),
                borderRadius: 4,
                barThickness: 20,
            }
        ]
    };

    const lineChartData = {
        labels: historyData.labels,
        datasets: historyData.datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.data,
            borderColor: `hsl(${i * 25}, 70%, 50%)`, // Auto-generate colors
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 3,
            borderWidth: 2,
        }))
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: viewMode === 'history', position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.03)' },
                ticks: { color: '#64748b', font: { family: 'Outfit', size: 10 } },
                border: { display: false }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.03)' },
                ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } },
                border: { display: false }
            }
        }
    };

    const barOptions = {
        ...commonOptions,
        indexAxis: 'y',
        plugins: { ...commonOptions.plugins, legend: { display: false } }
    };

    if (loading) return (
        <div className="glass-panel p-6 h-[500px] flex items-center justify-center animate-pulse">
            <div className="text-center">
                <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-sm text-slate-500">Loading Sectors...</div>
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-panel p-6"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">Sector Performance</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        {viewMode === 'snapshot' ? 'Average daily movement by sector' : 'Historical trend analysis'}
                    </p>
                </div>

                <div className="flex flex-col items-end gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => setViewMode('snapshot')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'snapshot' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                            title="Snapshot View"
                        >
                            <BarChart2 size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'history' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                            title="Historical View"
                        >
                            <TrendingUp size={16} />
                        </button>
                    </div>

                    {/* Time Range Selectors (Only for History) */}
                    {viewMode === 'history' && (
                        <div className="flex flex-wrap justify-end gap-1">
                            {TIME_RANGES.map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${timeRange === range
                                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                            : 'bg-transparent text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-300'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="h-[500px]">
                {viewMode === 'snapshot' ? (
                    sectorData.length > 0 ? <Bar data={barChartData} options={barOptions} /> : <NoData />
                ) : (
                    loadingHistory ? (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                            Loading History...
                        </div>
                    ) : (
                        historyData.labels.length > 0 ? <Line data={lineChartData} options={commonOptions} /> : <NoData message="No historical data available yet." />
                    )
                )}
            </div>
        </motion.div>
    );
};

const NoData = ({ message = "No Data Available" }) => (
    <div className="flex h-full items-center justify-center text-slate-500 flex-col gap-2">
        <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
        <span className="text-sm">{message}</span>
    </div>
);

export default SectorAnalytics;
