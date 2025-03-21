# Holo Purchase History Viewer

このプロジェクトは、某所の購入履歴ページから詳細情報を取得し、JSON形式で保存するTampermonkeyスクリプトです。

## 機能
- 購入履歴の詳細情報（注文番号、日付、支払状況、発送状況、合計金額、通貨、詳細情報）を取得。
- 複数ページにわたる購入履歴を自動的に取得。
- 取得したデータをJSON形式でダウンロード。
- 右下に「データ取得開始」ボタンを追加。

## 使用方法
1. [Tampermonkey](https://www.tampermonkey.net/) をインストールします。
2. このリポジトリのスクリプトをコピーし、Tampermonkeyに新しいスクリプトとして追加します。
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
