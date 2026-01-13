import React from 'react';
import Layout from '../components/Layout';
import { Settings as SettingsIcon, Bell, Shield, User } from 'lucide-react';

const Settings = () => {
    return (
        <Layout>
            <div className="p-4 md:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-slate-400">Manage your preferences and application settings</p>
                </header>

                <div className="max-w-2xl space-y-6">
                    <div className="glass-panel p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
                                <p className="text-sm text-slate-400">Manage account information</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                                <span className="text-slate-300">Display Name</span>
                                <span className="text-slate-500">Guest User</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                                <Bell size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                                <p className="text-sm text-slate-400">Configure alert preferences</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                                <span className="text-slate-300">Market Alerts</span>
                                <div className="w-10 h-5 bg-emerald-500/20 rounded-full relative cursor-pointer">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full absolute top-1 right-1"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
