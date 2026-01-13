import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getTopPerformers } from '../services/api';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Filter, Search } from 'lucide-react';

const MarketDepth = () => {
    const [type, setType] = useState('best');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState('live');

    useEffect(() => {
        fetchData();
    }, [type]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch 50 records for detailed view
            const res = await getTopPerformers(type, 'daily');
            if (res.success) {
                setData(res.data);
                setSource(res.source || 'live');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="p-4 md:p-8">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Market Depth</h1>
                        <p className="text-slate-400">Detailed analysis of today's top market movers</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900/50 p-1 rounded-xl border border-white/5 backdrop-blur-md flex">
                            <button
                                onClick={() => setType('best')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${type === 'best'
                                    ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                Top Gainers
                            </button>
                            <button
                                onClick={() => setType('worst')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${type === 'worst'
                                    ? 'bg-rose-500/10 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                Top Losers
                            </button>
                        </div>
                    </div>
                </header>

                <div className="glass-panel overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <div className="text-xs font-mono text-slate-500 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                            Data Source: {source === 'sheet' ? 'Historical Records' : 'Live Market Feed'}
                        </div>
                        <div className="flex gap-2">
                            {/* Placeholder for future filters */}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-900/40 text-left">
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Symbol</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sector</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">LTP</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Chg %</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Volume</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Trades</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="p-12 text-center text-slate-500 animate-pulse">
                                            Loading Market Data...
                                        </td>
                                    </tr>
                                ) : data.map((stock, i) => (
                                    <motion.tr
                                        key={stock.symbol}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        className="group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="p-4 text-slate-500 font-mono text-xs">#{i + 1}</td>
                                        <td className="p-4 font-bold text-blue-400 group-hover:text-blue-300 transition-colors">{stock.symbol}</td>
                                        <td className="p-4 text-slate-300 text-sm">{stock.companyName}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                                {stock.sector}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono-num font-medium text-slate-200">Rs. {stock.ltp}</td>
                                        <td className="p-4 text-right">
                                            <span className={`inline-flex items-center gap-1 font-bold text-sm ${parseFloat(stock.percentChange) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {parseFloat(stock.percentChange) >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                                {stock.percentChange}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono-num text-slate-400 text-sm">{stock.volume}</td>
                                        <td className="p-4 text-right font-mono-num text-slate-500 text-sm">{stock.transactions}</td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default MarketDepth;
