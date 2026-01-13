import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTopPerformers, getLiveMarket } from '../services/api';
import { ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const DailyPerformance = () => {
    const navigate = useNavigate();
    const [topStocks, setTopStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState('live');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch best perfromers for highlights
                const bestRes = await getTopPerformers('best');
                if (bestRes.success) {
                    setTopStocks(bestRes.data);
                    setSource(bestRes.source || 'live');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
    };

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-40 glass-panel"></div>
            <div className="h-[400px] glass-panel"></div>
        </div>
    );

    if (topStocks.length === 0) return (
        <div className="p-12 text-center glass-panel">
            <h2 className="text-xl text-slate-400 mb-2">No Market Data</h2>
            <p className="text-sm text-slate-500">Wait for the next trading session or check server status.</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-baseline mb-2">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 tracking-tight">
                        <span className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Activity size={24} />
                        </span>
                        Daily Top Performers
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 ml-12">Top gainers from today's trading session</p>
                </div>
                <div className="text-xs font-mono text-slate-500 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                    Source: {source === 'sheet' ? 'Historical' : 'Live Feed'}
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {topStocks.slice(0, 3).map((stock, i) => (
                    <motion.div
                        key={stock.symbol}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                        className="glass-panel p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-4px]"
                        style={{ background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)' }}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] text-8xl font-black transition-opacity">
                            {i + 1}
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold tracking-tight text-white">{stock.symbol}</h3>
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded border border-emerald-500/20">
                                Rank #{i + 1}
                            </span>
                        </div>

                        <p className="text-xs text-slate-400 mb-6 truncate font-medium tracking-wide">{stock.companyName}</p>

                        <div className="flex items-end justify-between mt-auto">
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Price</span>
                                <span className="text-2xl font-mono-num font-bold text-white">Rs. {stock.ltp}</span>
                            </div>
                            <div className="text-right">
                                <span className={`flex items-center justify-end gap-1 font-bold text-lg ${parseFloat(stock.percentChange) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {parseFloat(stock.percentChange) >= 0 ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                                    {stock.percentChange}%
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Data Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-panel overflow-hidden"
            >
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-semibold text-white">Market Depth</h3>
                    <button onClick={() => navigate('/market-depth')} className="text-xs text-blue-400 hover:text-blue-300 font-medium">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="t-header opacity-50">Symbol</th>
                                <th className="t-header opacity-50">Company</th>
                                <th className="t-header opacity-50">Sector</th>
                                <th className="t-header opacity-50 text-right">LTP</th>
                                <th className="t-header opacity-50 text-right">% Change</th>
                                <th className="t-header opacity-50 text-right">Vol</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topStocks.map((stock) => (
                                <tr key={stock.symbol} className="group border-b border-slate-800/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                                    <td className="font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">{stock.symbol}</td>
                                    <td className="text-slate-400 text-sm max-w-xs truncate">{stock.companyName}</td>
                                    <td>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                            {stock.sector}
                                        </span>
                                    </td>
                                    <td className="text-right font-mono-num text-slate-200">{stock.ltp}</td>
                                    <td className="text-right">
                                        <span className={`inline-flex items-center gap-1 font-bold text-sm ${parseFloat(stock.percentChange) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {stock.percentChange}%
                                        </span>
                                    </td>
                                    <td className="text-right text-slate-500 text-sm font-mono-num">{stock.volume}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default DailyPerformance;
