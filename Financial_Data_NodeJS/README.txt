Financial Data Downloader - Node.js Version
===========================================

This package contains a Node.js script that uses the robust 'yahoo-finance2' library.
This library correctly handles Yahoo's Cookies and Crumb security measures,
preventing the 500/403 errors you encountered with public proxies in the browser.

Instructions:
1. Make sure you have Node.js installed on your computer.
2. Open your terminal or command prompt in this folder.
3. Install the required package by running:
   npm install
4. Run the script:
   npm start
   (or you can run: node index.js)
5. A new folder named 'financial_data_assets' will be created containing all 41 CSV files.
