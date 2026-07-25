Financial Data Downloader - Full-Stack Application
==================================================

This package contains a complete client-server application. 
- The Client (HTML/JS) provides the UI to enter tickers and dates.
- The Server (Node.js/Express) exposes an API to safely fetch data from Yahoo Finance 
  and streams back a compiled ZIP file containing all the CSVs.

Instructions:
1. Make sure Node.js is installed.
2. Open your terminal in this folder and install dependencies:
   npm install
3. Start the server:
   npm start
4. Open your web browser and navigate to:
   http://localhost:3000
5. Click the download button on the webpage. The server will process the data and send you the ZIP.
