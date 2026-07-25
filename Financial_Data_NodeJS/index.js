const yahooFinance = require('yahoo-finance2').default;
const fs = require('fs');
const path = require('path');

// 40 top tech companies in DJUSTC
const top_40_tech_tickers = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AVGO", "ORCL", "ADBE", "CRM", "AMD",
    "CSCO", "INTC", "QCOM", "TXN", "INTU", "IBM", "AMAT", "NOW", "UBER", "PANW",
    "MU", "LRCX", "ADI", "KLAC", "SNPS", "CDNS", "ANET", "ROP", "FTNT", "TEL",
    "PTC", "NTAP", "STX", "WDC", "HPQ", "GLW", "CDW", "TRMB", "FICO", "TYL"
];

// Using XLK as the index proxy
const index_ticker = ["XLK"];
const all_tickers = [...index_ticker, ...top_40_tech_tickers];

const out_dir = 'financial_data_assets';
if (!fs.existsSync(out_dir)) {
    fs.mkdirSync(out_dir);
}

async function downloadData() {
    console.log(`Starting download for ${all_tickers.length} assets...\n`);

    for (let i = 0; i < all_tickers.length; i++) {
        const ticker = all_tickers[i];
        console.log(`[${i + 1}/${all_tickers.length}] Downloading ${ticker}...`);

        try {
            const queryOptions = {
                period1: '2021-01-01',
                period2: '2026-06-30',
                interval: '1d'
            };

            // Using yahoo-finance2 to fetch historical data
            const result = await yahooFinance.historical(ticker, queryOptions);

            if (result && result.length > 0) {
                let csvContent = "Date,Open,High,Low,Close,Adj Close,Volume,Pct_Change\n";
                let prevAdjClose = null;

                for (let j = 0; j < result.length; j++) {
                    const row = result[j];
                    
                    // Format date as YYYY-MM-DD
                    const dateStr = row.date.toISOString().split('T')[0];
                    const open = row.open;
                    const high = row.high;
                    const low = row.low;
                    const close = row.close;
                    const adjClose = row.adjClose || row.close;
                    const volume = row.volume;

                    // Calculate Pct_Change
                    let pctChange = "";
                    if (prevAdjClose !== null && prevAdjClose !== 0) {
                        pctChange = (((adjClose - prevAdjClose) / prevAdjClose) * 100).toFixed(4);
                    }

                    csvContent += `${dateStr},${open},${high},${low},${close},${adjClose},${volume},${pctChange}\n`;
                    prevAdjClose = adjClose;
                }

                const csvPath = path.join(out_dir, `${ticker}.csv`);
                fs.writeFileSync(csvPath, csvContent);
                console.log(`  -> Saved ${ticker}.csv`);
            } else {
                console.log(`  -> No data found for ${ticker}`);
            }
        } catch (error) {
            console.error(`  -> Failed to fetch ${ticker}: ${error.message}`);
        }

        // Small delay of 500ms between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\nDone! All files are saved in the '${out_dir}' folder.`);
}

downloadData();
