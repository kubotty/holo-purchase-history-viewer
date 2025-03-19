// ==UserScript==
// @name         購入履歴詳細取得（ボタン付き・右下）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  購入履歴の詳細情報を取得し、次のページに自動遷移
// @author       Your Name
// @match        https://shop.hololivepro.com/account*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let allData = []; // 全ページのデータを格納する配列

    // 現在のページのデータを取得
    async function getPageData() {
        const rows = document.querySelectorAll('.AccountTable tbody tr'); // テーブルの行を取得
        for (const row of rows) {
            const orderNumber = row.querySelector('td:nth-child(1) a').innerText; // 注文番号
            const orderDate = row.querySelector('td:nth-child(2)').innerText; // 日付
            const paymentStatus = row.querySelector('td:nth-child(3)').innerText; // 支払状況
            const shippingStatus = row.querySelector('td:nth-child(4)').innerText; // 発送状況
            const totalAmount = row.querySelector('td:nth-child(5) span').innerText; // 合計金額
            const detailLink = row.querySelector('td:nth-child(1) a').href; // 詳細リンク

            // 詳細ページのデータを取得
            console.log(`注文番号: ${orderNumber}`);
            console.log(`日付: ${orderDate}`);
            console.log(`支払状況: ${paymentStatus}`);
            console.log(`発送状況: ${shippingStatus}`);
            console.log(`合計金額: ${totalAmount}`);
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
                詳細: detailData
            });
        }
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
        debugger;

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

    // 次のページに移動してデータを取得
    async function goToNextPageAndGetData() {
        const nextButton = document.querySelector('.Pagination_arrow.-next'); // 次ページボタンのクラス名を指定
        if (nextButton) {
            debugger;
            nextButton.click(); // 次のページに移動
            console.log('次のページに移動します...');
            setTimeout(async () => {
                await getPageData(); // 次のページのデータを取得
                await goToNextPageAndGetData(); // 再帰的に次のページを処理
            }, 3000); // ページ遷移後に3秒待機
        } else {
            // 次のページがない場合、データをダウンロード
            downloadCSV(allData);
            alert('すべてのページのデータを取得しました！');
        }
    }

    // CSV形式に変換
    function convertToCSV(data) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => {
            const detailString = row.詳細.商品詳細.map(d => `${d.商品名}(${d.数量})`).join('; ');
            return `${row.注文番号},${row.日付},${row.支払状況},${row.発送状況},${row.合計金額},"${detailString}"`;
        });
        return [headers, ...rows].join('\n');
    }

    // CSVをダウンロード
    function downloadCSV(data, filename = 'purchase_history.csv') {
        const csv = convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    // ボタンを追加
    function addStartButton() {
        const button = document.createElement('button');
        button.innerText = 'データ取得開始';
        button.style.position = 'fixed';
        button.style.bottom = '10px'; // 画面下から10px
        button.style.right = '10px'; // 画面右から10px
        button.style.zIndex = 1000;
        button.style.padding = '10px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px'; // ボタンの角を丸くする
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)'; // ボタンに影を追加

        button.addEventListener('click', async () => {
            alert('データ取得を開始します！');
            await getPageData(); // 現在のページのデータを取得
            await goToNextPageAndGetData(); // 再帰的に次のページのデータを取得
        });

        document.body.appendChild(button);
    }

    // ページ読み込み後にボタンを追加
    window.addEventListener('load', addStartButton);
})();