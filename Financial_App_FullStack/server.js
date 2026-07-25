import express from 'express';
import archiver from 'archiver';

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.static('public'));

// פונקציית סריקה רקורסיבית לחילוץ הפונקציה ממעמקי האובייקט של המודול
function extractHistorical(obj, depth = 0) {
    if (!obj || depth > 5) return null;
    
    // מצאנו את הפונקציה
    if (typeof obj.historical === 'function') {
        return obj.historical.bind(obj);
    }
    
    // סריקה לעומק (חיפוש בתוך default או שכבות אחרות)
    for (const key in obj) {
        try {
            const val = obj[key];
            if (val && typeof val === 'object') {
                const found = extractHistorical(val, depth + 1);
                if (found) return found;
            }
        } catch (e) {
            // התעלמות ממאפיינים שזורקים שגיאות בגישה (כמו getters חסומים)
        }
    }
    return null;
}

app.post('/api/download', async (req, res) => {
    let historicalFunc;
    
    try {
        // טעינה דינמית של הספרייה
        const yfModule = await import('yahoo-finance2');
        
        // הפעלת הסריקה העמוקה
        historicalFunc = extractHistorical(yfModule);
        
        if (!historicalFunc) {
            console.error("Deep search failed. Module keys:", Object.keys(yfModule));
            // אם במקרה עדיין חסר, השגיאה בלוג תדפיס לנו בדיוק מה יש באובייקט
            return res.status(500).send("Module loaded but 'historical' function is completely missing.");
        }
    } catch (err) {
        console.error("Failed to dynamically import yahoo-finance2:", err);
        return res.status(500).send("Internal Server Error: Library import failed");
    }

    const { indexTicker, stockTickers, startDate, endDate } = req.body;
    const allTickers = [indexTicker, ...stockTickers].map(t => t.trim()).filter(Boolean);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=Financial_Data.zip');

    const archive = archiver('zip', {
        zlib: { level: 9 }
    });
    
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

            // שימוש בפונקציה שחולצה מהסריקה
            const result = await historicalFunc(ticker, queryOptions);

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

                archive.append(csvContent, { name: `${ticker}.csv` });
            }
        } catch (error) {
            console.error(`Failed to fetch ${ticker}:`, error.message);
        }

        // השהייה למניעת Rate Limiting
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    await archive.finalize();
    console.log("Archive finalized and sent to client.");
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Server is running on port ${PORT}!`);
    console.log(`=========================================`);
});
