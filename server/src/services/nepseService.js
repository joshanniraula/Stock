const puppeteer = require('puppeteer');

class NepseService {
    constructor() {
        this.scrapingUrl = 'https://www.sharesansar.com/today-share-price';
        // Simple in-memory cache
        this.cache = {
            data: [],
            timestamp: 0,
            duration: 5 * 60 * 1000 // 5 minutes cache
        };
    }

    async fetchLiveMarketData() {
        // 1. Check Cache
        if (this.cache.data.length > 0 && (Date.now() - this.cache.timestamp < this.cache.duration)) {
            console.log('Serving data from Cache (valid 5 mins)');
            return this.cache.data;
        }

        let browser;
        try {
            console.log('Cache expired or empty. Launching browser for scraping...');
            console.log('Debug: PUPPETEER_CACHE_DIR =', process.env.PUPPETEER_CACHE_DIR);

            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            // Set huge viewport to ensure no responsive hiding
            await page.setViewport({ width: 1920, height: 1080 });

            // Set User Agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            console.log('Navigating to ShareSansar...');
            // Increase timeout to 60s
            await page.goto(this.scrapingUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            console.log('Waiting for table selector...');
            // Wait for the specific table body ID
            await page.waitForSelector('#headFixed tbody tr', { timeout: 30000 });

            // Extract data
            const stocks = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('#headFixed tbody tr'));
                // Sector Heuristic Function
                const guessSector = (name, symbol) => {
                    const n = name.toLowerCase();
                    const s = symbol.toLowerCase();
                    if (n.includes('life insurance') || s.includes('lic') || s.includes('life')) return 'Life Insurance';
                    if (n.includes('insurance')) return 'Non-Life Insurance';
                    if (n.includes('development bank')) return 'Development Bank';
                    if (n.includes('bank')) return 'Commercial Bank';
                    if (n.includes('hydro') || n.includes('power') || s.includes('hpc') || s.includes('project')) return 'Hydropower';
                    if (n.includes('finance')) return 'Finance';
                    if (n.includes('laghubitta') || n.includes('microfinance')) return 'Microfinance';
                    if (n.includes('mutual fund') || n.includes('equity fund') || n.includes('scheme') || n.includes('growth fund')) return 'Mutual Fund';
                    if (n.includes('debenture') || n.includes('bond')) return 'Corporate Debenture';
                    if (n.includes('hotel') || n.includes('resort')) return 'Hotel & Tourism';
                    if (n.includes('cement') || n.includes('shivm') || n.includes('hdl')) return 'Manufacturing';
                    if (n.includes('invest') || n.includes('nric') || n.includes('hidcl')) return 'Investment';
                    return 'Others';
                };

                // Get Mapping from global variable if available
                const companies = window.cmpjson || [];
                const nameMap = {};
                companies.forEach(c => nameMap[c.symbol] = c.companyname);

                return rows.map(row => {
                    const tds = row.querySelectorAll('td');
                    if (tds.length < 20) return null; // Ensure row has enough columns

                    const getText = (index) => tds[index] ? tds[index].innerText.trim().replace(/,/g, '') : '0';

                    // Correct indices verified from dump:
                    // 1: Symbol, 7: LTP, 15: Point Change, 17: % Change
                    // 12: Prev Close, 11: Volume, 3: Open, 4: High, 5: Low

                    const symbol = tds[1].innerText.trim();
                    const companyName = nameMap[symbol] || symbol;

                    const ltp = parseFloat(getText(7));
                    const pointChange = parseFloat(getText(15));
                    const percentChange = parseFloat(getText(17));

                    // Extra fields
                    const open = parseFloat(getText(3));
                    const high = parseFloat(getText(4));
                    const low = parseFloat(getText(5));
                    const volume = parseFloat(getText(11));
                    const prevClose = parseFloat(getText(12));
                    const turnover = parseFloat(getText(13));

                    if (!symbol || isNaN(ltp)) return null;

                    return {
                        symbol,
                        ltp,
                        companyName,
                        pointChange,
                        percentChange,
                        open,
                        high,
                        low,
                        volume,
                        prevClose,
                        turnover,
                        transactions: 0, // Placeholder: ShareSansar table might not have this in the main view, defaults to 0
                        sector: guessSector(companyName, symbol),
                        status: pointChange > 0 ? 'up' : (pointChange < 0 ? 'down' : 'neutral')
                    };
                }).filter(item => item !== null);
            });

            console.log(`Fetched ${stocks.length} stocks via Puppeteer.`);

            // 2. Update Cache
            if (stocks.length > 0) {
                this.cache.data = stocks;
                this.cache.timestamp = Date.now();
            }

            return stocks;

        } catch (error) {
            console.error('Error fetching live data (Puppeteer):', error.message);
            // Return cached data if available even if expired, as fallback
            if (this.cache.data.length > 0) {
                console.log('Serving staled cache due to error.');
                return this.cache.data;
            }
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }

    async getTopPerformers(limit = 50, type = 'best') {
        const data = await this.fetchLiveMarketData();
        // Sort data: Primary = % Change, Secondary = Volume/Trade Quantity
        const sorted = data.sort((a, b) => {
            const changeA = parseFloat(a.percentChange || 0);
            const changeB = parseFloat(b.percentChange || 0);

            if (changeA !== changeB) {
                return type === 'best' ? changeB - changeA : changeA - changeB;
            }
            // Tie-breaker: Volume
            const volA = parseFloat(a.volume || 0);
            const volB = parseFloat(b.volume || 0);
            return volB - volA; // Higher volume wins
        });
        return sorted.slice(0, limit);
    }
}

module.exports = new NepseService();
