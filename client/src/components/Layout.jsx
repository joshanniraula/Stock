import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LineChart, TrendingUp, Settings, Menu, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-amber-500/30">

            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Fixed Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    x: isSidebarOpen ? 0 : -280,
                    opacity: isSidebarOpen ? 1 : 0.5
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 left-0 h-full w-[280px] z-50 border-r border-white/5 bg-[#0f172a] shadow-2xl flex flex-col"
            >
                {/* Sidebar Header */}
                <div className="p-6 flex items-center gap-3 border-b border-white/5 bg-[#020617]/50">
                    <div className="bg-amber-500 p-2 rounded-lg text-black shadow-lg shadow-amber-500/20">
                        <TrendingUp size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">NEPSE</h1>
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">Pro Terminal</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <NavItem
                        icon={<Home size={20} />}
                        label="Overview"
                        active={isActive('/')}
                        onClick={() => navigate('/')}
                    />
                    <NavItem
                        icon={<LineChart size={20} />}
                        label="Market Depth"
                        active={isActive('/market-depth')}
                        onClick={() => navigate('/market-depth')}
                    />
                    <NavItem
                        icon={<TrendingUp size={20} />}
                        label="Sectors"
                        active={isActive('/sectors')}
                        onClick={() => navigate('/sectors')}
                    />
                    <div className="my-4 h-px bg-white/5" />
                    <NavItem
                        icon={<Settings size={20} />}
                        label="Settings"
                        active={isActive('/settings')}
                        onClick={() => navigate('/settings')}
                    />
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 bg-slate-900/50 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500">System Status</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-500">Live</span>
                        </div>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                        Market Open • 11:00-15:00
                    </div>
                </div>
            </motion.aside>

            {/* Toggle Button (Floating) */}
            <button
                onClick={toggleSidebar}
                className="fixed top-4 z-50 p-2 bg-slate-800 text-white rounded-lg border border-white/10 shadow-lg hover:bg-slate-700 transition-colors"
                style={{
                    left: isSidebarOpen ? '296px' : '20px',
                    transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Main Content Area */}
            <main
                className="transition-[padding] duration-300 ease-in-out min-h-screen"
                style={{ paddingLeft: isSidebarOpen ? '280px' : '0' }}
            >
                <div className="max-w-7xl mx-auto p-8 pt-20">
                    {children}
                </div>
            </main>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
            ${active
                ? 'bg-amber-500 text-[#0f172a] font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
        `}
    >
        <span className={active ? 'text-[#0f172a]' : 'text-slate-500 group-hover:text-white transition-colors'}>
            {icon}
        </span>
        <span className="text-sm tracking-wide">{label}</span>
        {active && <ChevronRight size={16} className="ml-auto opacity-80" />}
    </button>
);

export default Layout;
