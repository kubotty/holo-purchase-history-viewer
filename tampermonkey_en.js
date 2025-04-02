// ==UserScript==
// @name         Purchase History Search Tool
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Retrieve detailed purchase history information and automatically navigate to the next page
// @author       kubotty
// @match        https://shop.hololivepro.com/en/account
// @match        https://shop.hololivepro.com/en/account/
// @match        https://shop.hololivepro.com/en/account?page=*
// @match        https://shop.hololivepro.com/en/account/?page=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let allDataEn = loadPreviousData(); // Array to store data from all pages

    // Retrieve past data from local storage
    function loadPreviousData() {
        const storedData = localStorage.getItem('purchaseHistoryEn');
        return storedData ? JSON.parse(storedData) : [];
    }

    // Save data to local storage
    function saveDataToLocalStorage(data) {
        localStorage.setItem('purchaseHistoryEn', JSON.stringify(data));
        // 1. Developer Tools
        // 2. Select the "Application" tab
        // 3. From the left "Storage" section, select "Local Storage".
        // 4. Select the target domain to view the saved data.
    }

    // Recursively fetch data from the next page
    async function fetchNextPageAndGetData(url, updateStatusCallback) {
        if (!url) {
            // If there is no next page, save and download the data
            // Sort order numbers in ascending order
            allDataEn.sort((a, b) => a.orderNumber.localeCompare(b.orderNumber, 'en', { numeric: true }));

            saveDataToLocalStorage(allDataEn);
            alert('Data from all pages has been retrieved!');
            updateStatusCallback(false); // Reset button to original state
            return;
        }

        console.log(`Fetching data from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            updateStatusCallback(false); // Reset button to original state
            return;
        }

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Retrieve data from the current page
        const rows = doc.querySelectorAll('.AccountTable tbody tr'); // Get table rows
        for (const row of rows) {
            const orderNumber = row.querySelector('td:nth-child(1) a').innerText; // Order number
            const orderDate = row.querySelector('td:nth-child(2)').innerText; // Date
            const paymentStatus = row.querySelector('td:nth-child(3)').innerText; // Payment status
            const shippingStatus = row.querySelector('td:nth-child(4)').innerText; // Shipping status
            // Process total amount
            const totalAmountElement = row.querySelector('td:nth-child(5) span'); // Get total amount element
            let totalAmount = totalAmountElement ? totalAmountElement.getAttribute('data-price') : ''; // Get data-price attribute
            let currency = totalAmountElement ? totalAmountElement.getAttribute('data-currency') : ''; // Get data-currency attribute
            const detailLink = row.querySelector('td:nth-child(1) a').href; // Detail link

            // Check for existing data
            const existingOrder = allDataEn.find(data => data.orderNumber === orderNumber);
            if (existingOrder) {
                // Update payment and shipping status
                existingOrder.paymentStatus = paymentStatus;
                existingOrder.shippingStatus = shippingStatus;
                console.log(`Order number ${orderNumber} is already in the data, skipping.`);
                continue;
            }

            // Retrieve data from the detail page
            console.log(`Order number: ${orderNumber}`);
            console.log(`Date: ${orderDate}`);
            console.log(`Payment status: ${paymentStatus}`);
            console.log(`Shipping status: ${shippingStatus}`);
            console.log(`Total amount (data-price): ${totalAmount}`);
            console.log(`Currency (data-currency): ${currency}`);
            console.log(`Detail link: ${detailLink}`);
            const detailData = await fetchDetailData(detailLink);

            console.log("\n");

            // Save data
            allDataEn.push({
                orderNumber: orderNumber,
                date: orderDate,
                paymentStatus: paymentStatus,
                shippingStatus: shippingStatus,
                totalAmount: totalAmount,
                currency: currency,
                details: detailData
            });
        }

        // Get the URL of the next page
        const nextButton = doc.querySelector('.Pagination_arrow.-next'); // Specify the class name of the next page button
        const nextPageUrl = nextButton ? nextButton.href : null;

        // Update status with the current page number
        const currentPageMatch = url.match(/page=(\d+)/);
        const currentPage = currentPageMatch ? currentPageMatch[1] : '1';
        updateStatusCallback(true, currentPage);

        // Recursively fetch the next page
        await fetchNextPageAndGetData(nextPageUrl, updateStatusCallback);
    }

    // Retrieve data from the detail page
    async function fetchDetailData(url) {
        const response = await fetch(url); // Access the detail page
        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            return null; // Abort processing on error
        }
        const text = await response.text();
        if (!text) {
            console.error('Response is empty');
            return null; // Abort processing if the response is empty
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        console.log(doc);

        // Retrieve product information
        const items = doc.querySelectorAll('.CartItem'); // Class name of the product list
        const details = [];
        items.forEach(item => {
            const productName = item.querySelector('.CartItem__Title a').innerText; // Product name
            const productVariant = item.querySelector('.CartItem__Variant')?.innerText || ''; // Variant information
            const quantity = item.querySelector('.CartItem_footerItem.Text--alignCenter').innerText; // Quantity
            const totalPrice = item.querySelector('.CartItem_footerItem.Text--alignRight .money').innerText; // Total price

            console.log(`Product name: ${productName}`);
            console.log(`Variant: ${productVariant}`);
            console.log(`Quantity: ${quantity}`);
            console.log(`Total price: ${totalPrice}`);

            details.push({
                productName: productName,
                variant: productVariant,
                quantity: quantity,
                totalPrice: totalPrice
            });
        });

        // Retrieve subtotal, shipping, tax, and total
        const rows = doc.querySelectorAll('tfoot tr'); // Get all rows in tfoot

        let subtotal = '';
        let shipping = '';
        let tax = '';
        let total = '';

        rows.forEach(row => {
            const labelElement = row.querySelector('td:nth-child(2)'); // Get the column containing the label
            const valueElement = row.querySelector('td:nth-child(3) .money'); // Get the column containing the amount

            if (!labelElement || !valueElement) return; // Skip if elements do not exist

            const label = labelElement.innerText.trim(); // Get the text of the label
            const value = valueElement.innerText.trim(); // Get the text of the amount

            if (label.includes('Subtotal')) {
                subtotal = value;
            } else if (label.includes('Shipping')) {
                shipping = value;
            } else if (label.includes('Tax')) {
                tax = value;
            } else if (label.includes('Total')) {
                total = value;
            }
        });

        console.log(`Subtotal: ${subtotal}`);
        console.log(`Shipping: ${shipping}`);
        console.log(`Tax: ${tax}`);
        console.log(`Total: ${total}`);

        return {
            productDetails: details,
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            total: total
        };
    }

    // Download JSON
    function downloadJSON(data, filename = 'purchase_history.json') {
        const json = JSON.stringify(data, null, 2); // Convert to JSON format (with indentation)
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    function addInterface() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.bottom = '10px'; // 10px from the bottom of the screen
        container.style.right = '10px'; // 10px from the right of the screen
        container.style.width = '400px';
        container.style.padding = '15px';
        container.style.backgroundColor = 'white';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '5px';
        container.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
        container.style.zIndex = 1000;

        const title = document.createElement('h3');
        title.innerText = 'Purchase History Search Tool';
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '16px';

        const startButton = document.createElement('button');
        startButton.innerText = 'Start Data Retrieval';
        startButton.style.width = '100%';
        startButton.style.padding = '10px';
        startButton.style.backgroundColor = '#4CAF50';
        startButton.style.color = 'white';
        startButton.style.border = 'none';
        startButton.style.borderRadius = '3px';
        startButton.style.cursor = 'pointer';
        startButton.style.marginBottom = '10px';

        startButton.addEventListener('click', async () => {
            alert('Starting data retrieval!');
            const initialUrl = window.location.href; // Get the URL of the current page

            // Update button to show "Retrieving (X pages)"
            const updateStatus = (isFetching, currentPage = '') => {
                if (isFetching) {
                    startButton.innerText = `Retrieving (${currentPage} page${currentPage > 1 ? 's' : ''})`;
                    startButton.disabled = true;
                } else {
                    startButton.innerText = 'Start Data Retrieval';
                    startButton.disabled = false;
                }
            };

            updateStatus(true, '1'); // Initial status
            await fetchNextPageAndGetData(initialUrl, updateStatus); // Retrieve data starting from the first page
        });

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter product name';
        input.style.width = '100%';
        input.style.padding = '8px';
        input.style.marginBottom = '10px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '3px';

        // Execute search on Enter key press
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                searchButton.click(); // Trigger the click event of the search button
            }
        });

        const searchButton = document.createElement('button');
        searchButton.innerText = 'Search';
        searchButton.style.width = '100%';
        searchButton.style.padding = '10px';
        searchButton.style.backgroundColor = '#2196F3';
        searchButton.style.color = 'white';
        searchButton.style.border = 'none';
        searchButton.style.borderRadius = '3px';
        searchButton.style.cursor = 'pointer';

        const resultContainer = document.createElement('div');
        resultContainer.style.marginTop = '10px';
        resultContainer.style.maxHeight = '200px';
        resultContainer.style.overflowY = 'auto';
        resultContainer.style.borderTop = '1px solid #ccc';
        resultContainer.style.paddingTop = '10px';

        searchButton.addEventListener('click', () => {
            const query = input.value.trim();
            resultContainer.innerHTML = ''; // Clear search results

            // Error check if allDataEn is empty
            if (allDataEn.length === 0) {
                alert('Data is empty. Please retrieve data first.');
                return;
            }

            if (!query) {
                alert('Please enter a search keyword.');
                return;
            }

            // Search for product names in allDataEn
            const results = [];
            allDataEn.forEach(order => {
                if (order.details && order.details.productDetails) {
                    order.details.productDetails.forEach(item => {
                        if (item.productName.includes(query)) {
                            results.push(item);
                        }
                    });
                }
            });

            if (results.length === 0) {
                resultContainer.innerHTML = '<p>No matching products found.</p>';
            } else {
                results.forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.style.marginBottom = '10px';
                    resultItem.innerHTML = `
                        <p><strong>Product Name:</strong> ${item.productName}</p>
                        <p><strong>Variant:</strong> ${item.variant}</p>
                        <p><strong>Quantity:</strong> ${item.quantity}</p>
                        <p><strong>Total Price:</strong> ${item.totalPrice}</p>
                    `;
                    resultContainer.appendChild(resultItem);
                });
            }
        });

        const actionContainer = document.createElement('div');
        actionContainer.style.display = 'flex'; // Arrange horizontally
        actionContainer.style.justifyContent = 'space-between';
        actionContainer.style.marginTop = '10px';

        const buttonStyle = {
            display: 'inline-block',
            width: '48%', // Adjust width for horizontal arrangement
            padding: '10px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            textAlign: 'center'
        };

        // Download purchase history button
        const downloadButton = document.createElement('button');
        downloadButton.innerText = 'Download Purchase History';
        Object.assign(downloadButton.style, buttonStyle);

        downloadButton.addEventListener('click', () => {
            if (allDataEn.length === 0) {
                alert('Data is empty. Please retrieve data first.');
                return;
            }
            downloadJSON(allDataEn); // Download data
        });

        // Data refresh button
        const refreshButton = document.createElement('button');
        refreshButton.innerText = 'Refresh Data';
        Object.assign(refreshButton.style, buttonStyle);

        refreshButton.addEventListener('click', () => {
            if (confirm('Do you want to delete past data?')) {
                localStorage.removeItem('purchaseHistoryEn'); // Delete data from local storage
                allDataEn = []; // Clear data in memory
                alert('Data has been refreshed.');
            }
        });

        actionContainer.appendChild(downloadButton);
        actionContainer.appendChild(refreshButton);

        container.appendChild(title);
        container.appendChild(startButton);
        container.appendChild(input);
        container.appendChild(searchButton);
        container.appendChild(resultContainer);
        container.appendChild(actionContainer);
        document.body.appendChild(container);
    }

    // Add interface after page load
    window.addEventListener('load', addInterface);
})();
