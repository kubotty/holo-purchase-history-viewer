# Holo Purchase History Viewer
[English](#English)


このプロジェクトは、某所の購入履歴ページから詳細情報を取得し、JSON形式で保存するTampermonkeyスクリプトです。

## 機能
- 購入履歴の詳細情報（注文番号、日付、支払状況、発送状況、合計金額、通貨、詳細情報）を取得。
- 複数ページにわたる購入履歴を自動的に取得。
- 取得したデータをJSON形式でダウンロード。
- 右下に「データ取得開始」ボタンを追加。

## 使用方法
1. [Tampermonkey](https://www.tampermonkey.net/) をインストールします。
2. このリポジトリのスクリプト (tampermonkey.js) をコピーし、Tampermonkeyに新しいスクリプトとして追加します。
3. 購入履歴ページの **1ページ目** にアクセスします。
4. 右下に表示される「データ取得開始」ボタンをクリックします。
5. すべてのページのデータが取得されると、JSONファイルが自動的にダウンロードされます。
   - ページ数 × 5 秒ほどかかりますのでタブを開いたまままってください。

## JSON出力例
```json
[
  {
    "注文番号": "#000000",
    "日付": "2021年 12月 25日",
    "支払状況": "支払済",
    "発送状況": "発送済",
    "合計金額": "550000",
    "通貨": "JPY",
    "詳細": {
      "商品詳細": [
        {
          "商品名": "商品A",
          "バリエーション": "サイズM",
          "数量": "1",
          "合計金額": "5000"
        }
      ],
      "小計": "5000",
      "送料": "500",
      "税": "500",
      "合計": "6000"
    }
  }
]
```

# English

This project is a Tampermonkey script that retrieves detailed information from a purchase history page and saves it in JSON format.

## Features
- Retrieves detailed purchase history information (order number, date, payment status, shipping status, total amount, currency, and detailed information).
- Automatically retrieves purchase history spanning multiple pages.
- Downloads the retrieved data in JSON format.
- Adds a "Start Data Retrieval" button at the bottom right corner.

## How to Use
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Copy the script from this repository (tampermonkey_en.js) and add it as a new script in Tampermonkey.
3. Access the **first page** of the purchase history.
4. Click the "Start Data Retrieval" button displayed at the bottom right corner.
5. Once data from all pages is retrieved, a JSON file will be automatically downloaded.
   - It will take approximately 5 seconds per page, so please keep the tab open during the process.
