import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 10000
});

export const getLiveMarket = async () => {
    try {
        const response = await api.get('/market/live');
        return response.data;
    } catch (error) {
        console.error('Error fetching live market:', error);
        throw error;
    }
};

export const getTopPerformers = async (type = 'best', period = 'daily') => {
    try {
        const response = await api.get(`/market/top-performers?type=${type}&period=${period}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching top performers:', error);
        throw error;
    }
};

export const getSectorPerformance = async () => {
    try {
        const response = await api.get('/market/sector-performance');
        return response.data;
    } catch (error) {
        console.error('Error fetching sector performance:', error);
        throw error;
    }
};

export const getSectorHistory = async (range = '1W') => {
    try {
        const response = await api.get(`/market/sector-history?range=${range}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching sector history:', error);
        throw error;
    }
};

export const getPredictions = async () => {
    try {
        const response = await api.get('/market/predictions');
        return response.data;
    } catch (error) {
        console.error('Error fetching predictions:', error);
        throw error;
    }
};

export const getEvaluations = async () => {
    try {
        const response = await api.get('/market/evaluations');
        return response.data;
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        throw error;
    }
};

export const getStockHistory = async (symbol) => {
    try {
        const response = await api.get(`/market/stock-history?symbol=${symbol}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching stock history:', error);
        throw error;
    }
};

export default api;
