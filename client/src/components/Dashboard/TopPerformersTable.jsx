import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowUp, ArrowDown } from 'lucide-react';

const TopPerformersTable = () => {
    const [type, setType] = useState('best'); // 'best' or 'worst'
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [type]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Pointing to backend API
            const response = await axios.get(`http://localhost:5000/api/market/top-performers?type=${type}&limit=10`);
            // limit=10 for summary view, we can expand later
            setData(response.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Top Performers</h3>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '8px' }}>
                    <button
                        onClick={() => setType('best')}
                        style={{
                            backgroundColor: type === 'best' ? 'var(--bg-card)' : 'transparent',
                            color: type === 'best' ? 'var(--accent-green)' : 'var(--text-secondary)',
                            border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        Gainers
                    </button>
                    <button
                        onClick={() => setType('worst')}
                        style={{
                            backgroundColor: type === 'worst' ? 'var(--bg-card)' : 'transparent',
                            color: type === 'worst' ? 'var(--accent-red)' : 'var(--text-secondary)',
                            border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        Losers
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '0.75rem 0' }}>Symbol</th>
                            <th style={{ padding: '0.75rem 0' }}>LTP</th>
                            <th style={{ padding: '0.75rem 0' }}>Change %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                        ) : data.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                <td style={{ padding: '0.75rem 0', fontWeight: '500' }}>{item.symbol}</td>
                                <td style={{ padding: '0.75rem 0' }}>Rs. {item.ltp}</td>
                                <td style={{ padding: '0.75rem 0' }}>
                                    <span style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        color: parseFloat(item.percentChange) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                                    }}>
                                        {parseFloat(item.percentChange) >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                        {item.percentChange}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TopPerformersTable;
