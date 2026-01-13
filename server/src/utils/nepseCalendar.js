/**
 * NEPSE Calendar Utility
 * Identifies major Nepalese holidays and trading anomalies.
 */

// Simple fixed list for MVP. In production, this might come from an API or a config file.
const HOLIDAYS_2024 = [
    '2024-01-15', // Maghe Sankranti
    '2024-01-30', // Martyrs Day
    '2024-03-08', // Maha Shivaratri
    '2024-03-24', // Fagu Purnima
    '2024-04-13', // New Year 2081
    '2024-05-23', // Buddha Jayanti
    '2024-10-03', // Ghatasthapana
    '2024-10-10', // Fulpati (Dashain Start)
    '2024-10-11', // Maha Ashtami
    '2024-10-12', // Maha Nawami
    '2024-10-13', // Vijaya Dashami (Dashain Main)
    '2024-10-14', // Ekadashi
    '2024-10-30', // Laxmi Puja (Tihar)
    '2024-11-01', // Govardhan Puja
    '2024-11-02', // Bhai Tika
];

// For 2025/2026, we would add more. Assuming 2024 structure for logic demonstration.
const HOLIDAYS_2025 = [
    '2025-01-14', // Maghe Sankranti
    // ... placeholders
    '2025-10-01', // Dashain Approx
];

const ALL_HOLIDAYS = [...HOLIDAYS_2024, ...HOLIDAYS_2025];

const NepseCalendar = {
    /**
     * Check if a specific date is a holiday or weekend (Fri/Sat in Nepal context usually Fri is half/full off depending on era, currently Fri is trading, Sat is off).
     * Actually NEPSE: Fri/Sat is OFF. Sun-Thu is ON.
     */
    isTradingDay: (dateObj) => {
        const day = dateObj.getDay();
        if (day === 5 || day === 6) return false; // Friday(5) and Saturday(6) are weekends in current NEPSE context (Fri is usually off/short?) 
        // Wait, NEPSE Week: Sunday to Thursday. Friday is sometimes odd. Let's assume Sun-Thu is standard.
        // If Fri is trading, it's usually valid. But let's stick to Safe 5 days: Sun(0), Mon(1), Tue(2), Wed(3), Thu(4).
        // Fri(5) and Sat(6) are weekends.
        if (day === 5 || day === 6) return false;

        const dateStr = dateObj.toISOString().split('T')[0];
        if (ALL_HOLIDAYS.includes(dateStr)) return false;

        return true;
    },

    /**
     * Check if upcoming week has major holidays
     * @param {Date} startDate 
     */
    getHolidayContext: (startDate) => {
        let holidaysCount = 0;
        let context = null;

        for (let i = 1; i <= 7; i++) {
            const nextDay = new Date(startDate);
            nextDay.setDate(startDate.getDate() + i);
            const dateStr = nextDay.toISOString().split('T')[0];

            if (ALL_HOLIDAYS.includes(dateStr)) {
                holidaysCount++;
                // Identify major ones
                const month = nextDay.getMonth();
                if (month === 9 || month === 10) context = 'Festival Season (Dashain/Tihar)'; // Oct/Nov
                else if (month === 2 || month === 3) context = 'Spring Holidays';
            }
        }

        if (holidaysCount >= 2) return { hasHoliday: true, count: holidaysCount, note: context || 'Trading Week interrupted by Holidays' };
        if (holidaysCount === 1) return { hasHoliday: true, count: 1, note: 'Short Trading Week' };

        return { hasHoliday: false, count: 0, note: null };
    }
};

module.exports = NepseCalendar;
