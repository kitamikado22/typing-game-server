// 必要なライブラリを読み込む
require('dotenv').config(); // .env ファイルから環境変数を読み込む
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Expressアプリを作成
const app = express();
const PORT = 3000; // サーバーを起動するポート番号 (自由に変更可)

// 必要な設定
app.use(cors()); // CORSを許可 (フロントエンドからアクセスできるようにする)
app.use(express.json()); // POSTリクエストのJSONボディを解析できるようにする

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

if (!DEEPL_API_KEY) {
    console.error('エラー: DEEPL_API_KEYが.envファイルに設定されていません。');
    process.exit(1); // サーバーを停止
}

// --- 翻訳エンドポイントの作成 ---
// フロントエンドは '/translate' という住所 (URL) にアクセスしてくる
app.post('/translate', async (req, res) => {
    try {
        // 1. フロントエンドから送られてきたテキストを取得
        const textToTranslate = req.body.text;

        if (!textToTranslate) {
            return res.status(400).json({ error: '翻訳するテキストがありません。' });
        }

        // 2. DeepL APIにリクエストを送信
        const response = await axios.post(
            DEEPL_API_URL,
            {
                text: [textToTranslate], // DeepLは配列で受け取る
                target_lang: 'JA',
            },
            {
                headers: {
                    // APIキーをAuthorizationヘッダーで送る
                    'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // 3. DeepLからの結果をフロントエンドに返す
        const translatedText = response.data.translations[0].text;
        res.json({ translation: translatedText });

    } catch (error) {
        console.error('DeepL APIリクエストエラー:', error.message);
        res.status(500).json({ error: '翻訳サーバーでエラーが発生しました。' });
    }
});

// サーバーを指定したポートで起動
app.listen(PORT, () => {
    console.log(`サーバーが http://localhost:${PORT} で起動しました。`);
});