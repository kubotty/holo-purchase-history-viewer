// ==UserScript==
// @name         購入履歴詳細取得
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  購入履歴の詳細情報を取得し、次のページに自動遷移
// @author       kubotty
// @match        https://shop.hololivepro.com/account
// @match        https://shop.hololivepro.com/account/
// @match        https://shop.hololivepro.com/account/?page=1
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let allData = loadPreviousData(); // 全ページのデータを格納する配列

    // 過去データをローカルストレージから取得
    function loadPreviousData() {
        const storedData = localStorage.getItem('purchaseHistory');
        return storedData ? JSON.parse(storedData) : [];
    }

    // データをローカルストレージに保存
    function saveDataToLocalStorage(data) {
        localStorage.setItem('purchaseHistory', JSON.stringify(data));
        // 1. 開発者ツール
        // 2. 「Application」タブを選択
        // 3. 左側の「Storage」セクションから「Local Storage」を選択。
        // 4. 対象のドメインを選択すると、保存されたデータが表示されます。
    }

    // 次のページのデータを再帰的に取得
    async function fetchNextPageAndGetData(url) {
        if (!url) {
            // 次のページがない場合、データを保存してダウンロード
            // 注文番号を昇順にソート
            allData.sort((a, b) => a.注文番号.localeCompare(b.注文番号, 'ja', { numeric: true }));

            saveDataToLocalStorage(allData);
            downloadJSON(allData);
            alert('すべてのページのデータを取得しました！');
            return;
        }

        console.log(`Fetching data from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`HTTPエラー: ${response.status} ${response.statusText}`);
            return;
        }

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // 現在のページのデータを取得
        const rows = doc.querySelectorAll('.AccountTable tbody tr'); // テーブルの行を取得
        for (const row of rows) {
            const orderNumber = row.querySelector('td:nth-child(1) a').innerText; // 注文番号
            const orderDate = row.querySelector('td:nth-child(2)').innerText; // 日付
            const paymentStatus = row.querySelector('td:nth-child(3)').innerText; // 支払状況
            const shippingStatus = row.querySelector('td:nth-child(4)').innerText; // 発送状況
            // 合計金額の処理
            const totalAmountElement = row.querySelector('td:nth-child(5) span'); // 合計金額の要素を取得
            let totalAmount = totalAmountElement ? totalAmountElement.getAttribute('data-price') : ''; // data-price 属性を取得
            let currency = totalAmountElement ? totalAmountElement.getAttribute('data-currency') : ''; // data-currency 属性を取得
            const detailLink = row.querySelector('td:nth-child(1) a').href; // 詳細リンク

            // 既存データの確認
            const existingOrder = allData.find(data => data.注文番号 === orderNumber);
            if (existingOrder) {
                // 支払状況・発送状況を更新
                existingOrder.支払状況 = paymentStatus;
                existingOrder.発送状況 = shippingStatus;
                console.log(`注文番号 ${orderNumber} は既存データのためスキップ`);
                continue;
            }

            // 詳細ページのデータを取得
            console.log(`注文番号: ${orderNumber}`);
            console.log(`日付: ${orderDate}`);
            console.log(`支払状況: ${paymentStatus}`);
            console.log(`発送状況: ${shippingStatus}`);
            console.log(`合計金額 (data-price): ${totalAmount}`);
            console.log(`通貨 (data-currency): ${currency}`);
            console.log(`詳細リンク: ${detailLink}`);
            const detailData = await fetchDetailData(detailLink);

            console.log("\n");

            // データを保存
            allData.push({
                注文番号: orderNumber,
                日付: orderDate,
                支払状況: paymentStatus,
                発送状況: shippingStatus,
                合計金額: totalAmount,
                通貨: currency,
                詳細: detailData
            });
        }

        // 次のページのURLを取得
        const nextButton = doc.querySelector('.Pagination_arrow.-next'); // 次ページボタンのクラス名を指定
        const nextPageUrl = nextButton ? nextButton.href : null;

        // 再帰的に次のページを取得
        await fetchNextPageAndGetData(nextPageUrl);
    }

    // 詳細ページのデータを取得
    async function fetchDetailData(url) {
        const response = await fetch(url); // 詳細ページにアクセス
        if (!response.ok) {
            console.error(`HTTPエラー: ${response.status} ${response.statusText}`);
            return null; // エラー時は処理を中断
        }
        const text = await response.text();
        if (!text) {
            console.error('レスポンスが空です');
            return null; // 空のレスポンスの場合は処理を中断
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        console.log(doc);

        // 商品情報を取得
        const items = doc.querySelectorAll('.CartItem'); // 商品リストのクラス名
        const details = [];
        items.forEach(item => {
            const productName = item.querySelector('.CartItem__Title a').innerText; // 商品名
            const productVariant = item.querySelector('.CartItem__Variant')?.innerText || ''; // バリエーション情報
            const quantity = item.querySelector('.CartItem_footerItem.Text--alignCenter').innerText; // 数量
            const totalPrice = item.querySelector('.CartItem_footerItem.Text--alignRight .money').innerText; // 合計金額

            console.log(`商品名: ${productName}`);
            console.log(`バリエーション: ${productVariant}`);
            console.log(`数量: ${quantity}`);
            console.log(`合計金額: ${totalPrice}`);

            details.push({
                商品名: productName,
                バリエーション: productVariant,
                数量: quantity,
                合計金額: totalPrice
            });
        });

        // 小計、送料、税、合計を取得
        const rows = doc.querySelectorAll('tfoot tr'); // tfoot内のすべての行を取得

        let subtotal = '';
        let shipping = '';
        let tax = '';
        let total = '';

        rows.forEach(row => {
            const labelElement = row.querySelector('td:nth-child(2)'); // ラベルが含まれる列を取得
            const valueElement = row.querySelector('td:nth-child(3) .money'); // 金額が含まれる列を取得

            if (!labelElement || !valueElement) return; // 要素が存在しない場合はスキップ

            const label = labelElement.innerText.trim(); // ラベルのテキストを取得
            const value = valueElement.innerText.trim(); // 金額のテキストを取得

            if (label.includes('小計')) {
                subtotal = value;
            } else if (label.includes('送料')) {
                shipping = value;
            } else if (label.includes('税')) {
                tax = value;
            } else if (label.includes('合計')) {
                total = value;
            }
        });

        console.log(`小計: ${subtotal}`);
        console.log(`送料: ${shipping}`);
        console.log(`税: ${tax}`);
        console.log(`合計: ${total}`);


        return {
            商品詳細: details,
            小計: subtotal,
            送料: shipping,
            税: tax,
            合計: total
        };
    }

    // JSONをダウンロード
    function downloadJSON(data, filename = 'purchase_history.json') {
        const json = JSON.stringify(data, null, 2); // JSON形式に変換（インデント付き）
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    function addInterface() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.bottom = '10px'; // 画面下から10px
        container.style.right = '10px'; // 画面右から10px
        container.style.width = '300px';
        container.style.padding = '15px';
        container.style.backgroundColor = 'white';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '5px';
        container.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
        container.style.zIndex = 1000;

        const title = document.createElement('h3');
        title.innerText = '購入履歴ツール';
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '16px';

        const startButton = document.createElement('button');
        startButton.innerText = 'データ取得開始';
        startButton.style.width = '100%';
        startButton.style.padding = '10px';
        startButton.style.backgroundColor = '#4CAF50';
        startButton.style.color = 'white';
        startButton.style.border = 'none';
        startButton.style.borderRadius = '3px';
        startButton.style.cursor = 'pointer';
        startButton.style.marginBottom = '10px';

        startButton.addEventListener('click', async () => {
            alert('データ取得を開始します！');
            const initialUrl = window.location.href; // 現在のページのURLを取得
            await fetchNextPageAndGetData(initialUrl); // 最初のページからデータを取得
        });

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '商品名を入力';
        input.style.width = '100%';
        input.style.padding = '8px';
        input.style.marginBottom = '10px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '3px';

        const searchButton = document.createElement('button');
        searchButton.innerText = '検索';
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
            resultContainer.innerHTML = ''; // 検索結果をクリア

            // allDataが空の場合のエラーチェック
            if (allData.length === 0) {
                alert('データが空です。先にデータを取得してください。');
                return;
            }

            if (!query) {
                alert('検索キーワードを入力してください。');
                return;
            }

            // allDataから商品名を検索
            const results = [];
            allData.forEach(order => {
                if (order.詳細 && order.詳細.商品詳細) {
                    order.詳細.商品詳細.forEach(item => {
                        if (item.商品名.includes(query)) {
                            results.push(item);
                        }
                    });
                }
            });

            if (results.length === 0) {
                resultContainer.innerHTML = '<p>該当する商品が見つかりませんでした。</p>';
            } else {
                results.forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.style.marginBottom = '10px';
                    resultItem.innerHTML = `
                        <p><strong>商品名:</strong> ${item.商品名}</p>
                        <p><strong>バリエーション:</strong> ${item.バリエーション}</p>
                        <p><strong>数量:</strong> ${item.数量}</p>
                        <p><strong>合計金額:</strong> ${item.合計金額}</p>
                    `;
                    resultContainer.appendChild(resultItem);
                });
            }
        });

        container.appendChild(title);
        container.appendChild(startButton);
        container.appendChild(input);
        container.appendChild(searchButton);
        container.appendChild(resultContainer);
        document.body.appendChild(container);
    }

    // ページ読み込み後にインターフェースを追加
    window.addEventListener('load', addInterface);
})();
