import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SectorChart = () => {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        const fetchSectors = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/market/sector-performance');
                const data = response.data.data;
                // Take top 5 best and top 5 worst if too many, or just show all if possible.
                // For now, let's show top 8
                const slicedData = data.slice(0, 8);

                setChartData({
                    labels: slicedData.map(d => d.sector),
                    datasets: [
                        {
                            label: 'Avg Change %',
                            data: slicedData.map(d => d.avgChange),
                            backgroundColor: slicedData.map(d => parseFloat(d.avgChange) >= 0 ? '#10b981' : '#ef4444'),
                            borderRadius: 4,
                        },
                    ],
                });
            } catch (err) {
                console.error(err);
            }
        };
        fetchSectors();
    }, []);

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: (context) => `${context.raw}%`
                }
            },
        },
        scales: {
            x: {
                ticks: { color: '#94a3b8' },
                grid: { display: false }
            },
            y: {
                ticks: { color: '#94a3b8' },
                grid: { color: '#334155' }
            }
        }
    };

    return (
        <div className="card" style={{ flex: 1, minHeight: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Sector Performance</h3>
            {chartData ? <Bar options={options} data={chartData} /> : <p>Loading...</p>}
        </div>
    );
};

export default SectorChart;
