import React from 'react';
import Layout from '../components/Layout';
import DailyPerformance from '../components/DailyPerformance';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import SectorAnalytics from '../components/SectorAnalytics';
import PredictionDashboard from '../components/Dashboard/PredictionDashboard';

const Home = () => {
    return (
        <Layout>
            <div className="mb-8 p-4">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">NEPSE Analytics</h1>
                    <p className="text-slate-400">Real-time Nepal Stock Exchange Data & Analysis</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="lg:col-span-2">
                        <DailyPerformance />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <WeeklyAnalysis />
                    <SectorAnalytics />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <PredictionDashboard />
                </div>
            </div>
        </Layout>
    );
};

export default Home;

