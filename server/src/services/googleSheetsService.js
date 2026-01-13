const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

class GoogleSheetsService {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
        this.initPromise = this.init();
    }

    async init() {
        try {
            // Check if service account file exists or ENV var is set
            const keyFile = path.join(__dirname, '../../service-account.json');

            if (process.env.GOOGLE_SERVICE_ACCOUNT) {
                // Auth from Environment Variable (JSON String)
                const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
                this.auth = new google.auth.GoogleAuth({
                    credentials,
                    scopes: SCOPES,
                });
            } else if (fs.existsSync(keyFile)) {
                // Auth from File
                this.auth = new google.auth.GoogleAuth({
                    keyFile: keyFile,
                    scopes: SCOPES,
                });
            }

            if (this.auth) {
                const client = await this.auth.getClient();
                this.sheets = google.sheets({ version: 'v4', auth: client });
                console.log(`Google Sheets Authenticated. ID: ${this.spreadsheetId}`);
            } else {
                console.warn('Google Service Account Key not found (File or ENV). Sheets integration will be disabled/mocked.');
            }
        } catch (error) {
            console.error('Failed to init Google Sheets:', error);
        }
    }

    /**
     * Appends data to a specific sheet.
     * @param {Array} data - Array of objects
     * @param {string} sheetName - Target sheet name
     */
    async appendData(data, sheetName) {
        await this.initPromise;
        if (!this.sheets || !this.spreadsheetId) {
            console.log(`[Mock Write] ${sheetName}: ${data.length} rows`);
            return;
        }

        try {
            await this.ensureSheetExists(sheetName);

            // Check for duplicates (Idempotency)
            // Only relevant for time-series sheets where 'Date' is the primary key for the batch
            if (sheetName === 'daily_raw_data' || sheetName === 'daily_top_50' || sheetName === 'sector_summary') {
                const existingData = await this.readData(sheetName);
                if (existingData.length > 0) {
                    const today = new Date().toISOString().split('T')[0];
                    // Check if *any* row has today's date. 
                    const hasToday = existingData.some(row => row['Date'] === today);

                    if (hasToday) {
                        console.log(`[Skip] Data for ${today} already exists in ${sheetName}. Preventing duplicates.`);
                        return;
                    }
                }
            } else if (sheetName === 'predictions' || sheetName === 'weekly_evaluation') {
                // For predictions, we might allow overwriting or we check if we already ran for this date
                const existingData = await this.readData(sheetName);
                const today = new Date().toISOString().split('T')[0];
                const hasToday = existingData.some(row => row['Date'] === today);
                if (hasToday) {
                    console.log(`[Skip] Data for ${today} already exists in ${sheetName}. Preventing duplicates.`);
                    return;
                }
            }

            let values = [];

            // Define headers/row mapping based on sheet type
            if (sheetName === 'daily_raw_data' || sheetName === 'daily_top_50') {
                // Date, Symbol, Company Name, Sector, LTP, Trade Quantity, No Trades, % Change
                values = data.map(item => [
                    new Date().toISOString().split('T')[0],
                    item.symbol,
                    item.companyName,
                    item.sector,
                    item.ltp,
                    item.volume, // Trade Quantity
                    item.transactions || 0, // Number of Trades
                    item.percentChange
                ]);
            } else if (sheetName === 'sector_summary') {
                // Date, Sector, Avg Change, Total Volume
                values = data.map(item => [
                    new Date().toISOString().split('T')[0],
                    item.sector,
                    item.avgChange,
                    item.totalVolume
                ]);
            } else if (sheetName === 'predictions') {
                // Date, Symbol, Prediction (Growth/Downfall), Confidence, Reason, Predicted Price
                values = data.map(item => [
                    item.date || new Date().toISOString().split('T')[0],
                    item.symbol,
                    item.companyName,
                    item.sector,
                    item.prediction,
                    item.confidence,
                    item.predictedPrice,
                    JSON.stringify(item.reason) // Store reason as JSON string or text
                ]);
            } else if (sheetName === 'weekly_evaluation') {
                // Date, Symbol, Actual Outcome, Error, Adjustment Made
                values = data.map(item => [
                    item.date,
                    item.symbol,
                    item.actualOutcome,
                    item.errorMetric,
                    item.adjustment
                ]);
            } else if (sheetName === 'model_params') {
                // Date, Param Name, Value
                values = data.map(item => [
                    item.date || new Date().toISOString().split('T')[0],
                    item.paramName,
                    item.value
                ]);
            } else {
                // Generic fallback
                values = data.map(Object.values);
            }

            if (values.length === 0) return;

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:H`, // Adjust range as needed
                valueInputOption: 'USER_ENTERED',
                resource: { values },
            });
            console.log(`Appended ${values.length} rows to ${sheetName}`);
        } catch (error) {
            console.error(`Error writing to ${sheetName}:`, error.message);
        }
    }

    async ensureSheetExists(title) {
        await this.initPromise;
        try {
            const meta = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            const sheetExists = meta.data.sheets.some(s => s.properties.title === title);

            if (!sheetExists) {
                console.log(`Sheet '${title}' not found. Creating...`);
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: {
                        requests: [{
                            addSheet: {
                                properties: { title }
                            }
                        }]
                    }
                });

                // Determine headers based on title
                let headers = [];
                if (title === 'daily_raw_data' || title === 'daily_top_50' || title.includes('weekly')) {
                    headers = ['Date', 'Symbol', 'Company Name', 'Sector', 'LTP', 'Trade Quantity', 'Num Trades', '% Change'];
                } else if (title === 'sector_summary') {
                    headers = ['Date', 'Sector', 'Avg Change', 'Total Volume'];
                } else if (title === 'predictions') {
                    headers = ['Date', 'Symbol', 'Company Name', 'Sector', 'Prediction', 'Confidence', 'Predicted Price', 'Reason'];
                } else if (title === 'weekly_evaluation') {
                    headers = ['Date', 'Symbol', 'Actual Outcome', 'Error Metric', 'Adjustment'];
                } else if (title === 'model_params') {
                    headers = ['Date', 'Param Name', 'Value'];
                } else {
                    headers = ['Date', 'Data'];
                }

                // Add Headers
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${title}!A1:H1`,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [headers]
                    }
                });
                console.log(`Created sheet '${title}' with headers.`);
            }
        } catch (error) {
            console.error(`Failed to ensure sheet '${title}' exists:`, error.message);
        }
    }

    /**
     * Reads all data from a specific sheet.
     * @param {string} sheetName 
     * @returns {Promise<Array>}
     */
    async readData(sheetName) {
        await this.initPromise;
        if (!this.sheets || !this.spreadsheetId) return [];
        try {
            const resp = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:H`, // Read relevant columns
            });
            const rows = resp.data.values;
            if (!rows || rows.length === 0) return [];

            // Map rows to objects based on header
            const headers = rows[0];
            const data = rows.slice(1).map(row => {
                let obj = {};
                headers.forEach((h, i) => {
                    obj[h] = row[i];
                });
                return obj;
            });
            return data;
        } catch (error) {
            if (error.message.includes('Unable to parse range') || error.message.includes('Sheet not found')) {
                console.log(`Sheet ${sheetName} not found, returning empty array.`);
                return [];
            }
            console.error(`Error reading ${sheetName}:`, error.message);
            return [];
        }
    }

    async removeDuplicates(sheetName) {
        await this.initPromise;
        try {
            console.log(`Checking for duplicates in ${sheetName}...`);
            const rows = await this.readData(sheetName);
            if (rows.length === 0) return;

            const uniqueRows = [];
            const seen = new Set();
            let duplicatesCount = 0;

            rows.forEach(row => {
                // Create a unique key based on sheet type
                let key = '';
                if (sheetName === 'sector_summary') {
                    key = `${row['Date']}_${row['Sector']}`;
                } else {
                    key = `${row['Date']}_${row['Symbol']}`;
                }

                if (seen.has(key)) {
                    duplicatesCount++;
                } else {
                    seen.add(key);
                    uniqueRows.push(row);
                }
            });

            if (duplicatesCount === 0) {
                console.log(`No duplicates found in ${sheetName}.`);
                return;
            }

            console.log(`Found ${duplicatesCount} duplicates in ${sheetName}. Cleaning up...`);

            // Clear the sheet
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A2:Z`, // Keep headers
            });

            // Re-write unique data
            let values = [];
            if (sheetName === 'daily_raw_data' || sheetName === 'daily_top_50' || sheetName.includes('weekly')) {
                values = uniqueRows.map(item => [
                    item['Date'],
                    item['Symbol'],
                    item['Company Name'],
                    item['Sector'],
                    item['LTP'],
                    item['Trade Quantity'],
                    item['Num Trades'],
                    item['% Change']
                ]);
            } else if (sheetName === 'sector_summary') {
                values = uniqueRows.map(item => [
                    item['Date'],
                    item['Sector'],
                    item['Avg Change'],
                    item['Total Volume']
                ]);
            }

            if (values.length > 0) {
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!A2`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values },
                });
                console.log(`Rewrote ${values.length} unique rows to ${sheetName}.`);
            }

        } catch (error) {
            console.error(`Error removing duplicates from ${sheetName}:`, error.message);
        }
    }
}

module.exports = new GoogleSheetsService();
