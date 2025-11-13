// 必要なライブラリを読み込む
require('dotenv').config(); // .env ファイルから環境変数を読み込む
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const Kuroshiro = require('kuroshiro').default;
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');

// Expressアプリを作成
const app = express();
const PORT = 3000; // サーバーを起動するポート番号 (自由に変更可)

// 必要な設定
app.use(cors()); // CORSを許可 (フロントエンドからアクセスできるようにする)
app.use(express.json()); // POSTリクエストのJSONボディを解析できるようにする
app.use(bodyParser.json());

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

if (!DEEPL_API_KEY) {
    console.error('エラー: DEEPL_API_KEYが.envファイルに設定されていません。');
    process.exit(1); // サーバーを停止
}

const kuroshiro = new Kuroshiro();
let isInitialized = false;

// kuroshiroの初期化
async function initKuroshiro() {
    console.log("kuroshiroを初期化中...");
    await kuroshiro.init(new KuromojiAnalyzer({ 
        dictPath: require('kuroshiro-analyzer-kuromoji').dictPath
    }));
    isInitialized = true;
    console.log("kuroshiroの初期化が完了しました。");
}

// 初期化をバックグラウンドで開始
initKuroshiro();

// 変換処理のエンドポイント
app.post('/convert', async (req, res) => {
    // 初期化が完了しているか確認
    if (!isInitialized) {
        return res.status(503).json({ error: "kuroshiroがまだ初期化中です。" });
    }

    const { text, to = "hiragana" } = req.body;

    if (!text) {
        return res.status(400).json({ error: "変換対象のテキストが必要です。" });
    }

    try {
        const result = await kuroshiro.convert(text, { 
            to: to, // 'hiragana', 'katakana', 'romaji'
            mode: "normal" 
        });

        if (to === "hiragana") {
            // 句読点などを標準化
            result = result.replace(/[\s,，、]/g, '、'); // 空白や読点を「、」に
            result = result.replace(/[.．。]/g, '。'); // ピリオドや句点を「。」に
            result = result.replace(/[\?!？！]/g, '！'); //
            result = result.replace(/[\(\)（）]/g, '（'); //
            // 連続する句読点を一つに
            result = result.replace(/、+/g, '、');
            result = result.replace(/。+/g, '。');
        }
        
        // 変換結果をJSONで返す
        res.json({ original: text, converted: result, format: to });
    } catch (error) {
        console.error("変換エラー:", error);
        res.status(500).json({ error: "サーバー側で変換処理中にエラーが発生しました。", details: error.message });
    }
});

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