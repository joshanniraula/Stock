import React from 'react';
import Layout from '../components/Layout';
import SectorAnalytics from '../components/SectorAnalytics';

const Sectors = () => {
    return (
        <Layout>
            <div className="p-4 md:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Sector Performance</h1>
                    <p className="text-slate-400">Detailed breakdown of market movements by sector</p>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    <SectorAnalytics />
                </div>
            </div>
        </Layout>
    );
};

export default Sectors;
