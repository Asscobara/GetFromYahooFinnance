import express from 'express';
import yahooFinance from 'yahoo-finance2';
import archiver from 'archiver';

const app = express();
// Render דורש האזנה לפורט משתנה
const PORT = process.env.PORT || 3000; 

// Enable JSON body parsing and serve static files from 'public' folder
app.use(express.json());
app.use(express.static('public'));

app.post('/api/download', async (req, res) => {
    const { indexTicker, stockTickers, startDate, endDate } = req.body;
    
    // Combine index and stocks into one array, filter empty strings
    const allTickers = [indexTicker, ...stockTickers].map(t => t.trim()).filter(Boolean);

    // Set headers to trigger a file download in the browser
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=Financial_Data.zip');

    // Create a zip archive and stream it directly to the response
    const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
    });
    
    // Catch warnings and errors
    archive.on('warning', function(err) {
        if (err.code !== 'ENOENT') throw err;
    });
    archive.on('error', function(err) {
        console.error("Archive Error:", err);
    });

    archive.pipe(res);

    console.log(`Starting data fetch for ${allTickers.length} assets...`);

    for (let i = 0; i < allTickers.length; i++) {
        const ticker = allTickers[i];
        console.log(`[${i + 1}/${allTickers.length}] Fetching ${ticker}...`);

        try {
            const queryOptions = {
                period1: startDate,
                period2: endDate,
                interval: '1d'
            };

            const result = await yahooFinance.historical(ticker, queryOptions);

            if (result && result.length > 0) {
                let csvContent = "Date,Open,High,Low,Close,Adj Close,Volume,Pct_Change\n";
                let prevAdjClose = null;

                for (const row of result) {
                    const dateStr = row.date.toISOString().split('T')[0];
                    const adjClose = row.adjClose || row.close;
                    
                    let pctChange = "";
                    if (prevAdjClose !== null && prevAdjClose !== 0) {
                        pctChange = (((adjClose - prevAdjClose) / prevAdjClose) * 100).toFixed(4);
                    }

                    csvContent += `${dateStr},${row.open},${row.high},${row.low},${row.close},${adjClose},${row.volume},${pctChange}\n`;
                    prevAdjClose = adjClose;
                }

                // Append the generated CSV string as a file to the zip archive
                archive.append(csvContent, { name: `${ticker}.csv` });
            }
        } catch (error) {
            console.error(`Failed to fetch ${ticker}:`, error.message);
        }

        // Delay between requests to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Finalize the archive (this will finish the stream and close the connection)
    await archive.finalize();
    console.log("Archive finalized and sent to client.");
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Server is running on port ${PORT}!`);
    console.log(`=========================================`);
});
