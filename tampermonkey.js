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

    let allData = []; // 全ページのデータを格納する配列

    // 次のページのデータを再帰的に取得
    async function fetchNextPageAndGetData(url) {
        if (!url) {
            // 次のページがない場合、データをダウンロード
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
            const initialUrl = window.location.href; // 現在のページのURLを取得
            await fetchNextPageAndGetData(initialUrl); // 最初のページからデータを取得
        });

        document.body.appendChild(button);
    }

    // ページ読み込み後にボタンを追加
    window.addEventListener('load', addStartButton);
})();
