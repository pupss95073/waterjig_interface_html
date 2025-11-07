const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const app = express();

const { generateStates } = require('./generateStates');
const port = process.env.PORT || 3000;

// GPIO 相關變數
let Gpio;
let button;
let buttonState = 0;
let lastTick = 0;

// 初始化 GPIO
try {
    // 檢查是否為 root 使用者
    if (process.getuid && process.getuid() === 0) {
        Gpio = require('pigpio').Gpio;

        // 設定 GPIO 17 為輸入，並啟用內部上拉電阻
        button = new Gpio(17, {
            mode: Gpio.INPUT,
            pullUpDown: Gpio.PUD_UP,
            alert: true // 啟用中斷偵測
        });

        // 使用 pigpio 的 alertOnChange 來監聽腳位變化
        button.on('alert', async (level, tick) => {
            // 去彈跳：忽略 10ms 內的重複觸發
            if (tick - lastTick < 10000) { // 轉換為微秒
                return;
            }

            lastTick = tick;
            buttonState = level;
            console.log(`🔘 GPIO 17 changed to ${level} at ${tick} microseconds`);
            try {
                const stats = await generateStates(5);
                console.log("計算完成:", stats);
            } catch (err) {
                console.error("程式錯誤:", err);
            } finally {
                busy = false;
            }
            // 這裡可以放自定義邏輯，例如：
            // 執行 Modbus 測試、發送 WebSocket 事件、或呼叫內部函式
        });

        console.log('GPIO 初始化成功');
    } else {
        console.warn('警告：需要 root 權限才能使用 GPIO');
        console.warn('請使用 sudo node app.js 執行程式');
    }
} catch (error) {
    console.error('GPIO 初始化失敗:', error.message);
    console.warn('請確認以下事項：');
    console.warn('1. 使用 sudo node app.js 執行程式');
    console.warn('2. 已安裝 pigpio: sudo apt-get install pigpio');
    console.warn('3. pigpio 守護進程已啟動: sudo pigpiod');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// 路由處理
// 1. 基本路由 - 首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. API 路由
// 讀取掃描資料
app.get('/api/scan-data', async (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'scan_data.json');
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            res.json(JSON.parse(data));
        } catch (err) {
            // 如果檔案不存在，返回空陣列
            if (err.code === 'ENOENT') {
                res.json([]);
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('Error reading scan data:', error);
        res.status(500).json({ error: '無法讀取掃描資料' });
    }
});

// 儲存掃描資料
app.post('/api/scan-data', async (req, res) => {
    try {
        const { button, scanResult } = req.body;
        if (!button || !scanResult) {
            return res.status(400).json({ error: '缺少必要資料' });
        }

        const dataDir = path.join(__dirname, 'data');
        const dataPath = path.join(dataDir, 'scan_data.json');

        // 確保data目錄存在
        try {
            await fs.mkdir(dataDir, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }

        // 讀取現有資料
        let existingData = [];
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            existingData = JSON.parse(data);
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }

        // 添加新資料
        const now = new Date();
        // 設定為 GMT+8 時區
        now.setHours(now.getHours() + 8);
        const newData = {
            button,
            scanResult,
            timestamp: now.toISOString().replace('Z', '+08:00')
        };

        existingData.unshift(newData);

        // 儲存資料
        await fs.writeFile(dataPath, JSON.stringify(existingData, null, 2));

        res.json(newData);
    } catch (error) {
        console.error('Error saving scan data:', error);
        res.status(500).json({ error: '無法儲存掃描資料' });
    }
});

// 清除所有掃描資料
app.delete('/api/scan-data', async (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'scan_data.json');
        await fs.writeFile(dataPath, JSON.stringify([], null, 2));
        res.json({ message: '所有資料已清除' });
    } catch (error) {
        console.error('Error clearing scan data:', error);
        res.status(500).json({ error: '無法清除掃描資料' });
    }
});

// 刪除特定掃描資料
app.delete('/api/scan-data/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const dataPath = path.join(__dirname, 'data', 'scan_data.json');

        let existingData = [];
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            existingData = JSON.parse(data);
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }

        if (index >= 0 && index < existingData.length) {
            existingData.splice(index, 1);
            await fs.writeFile(dataPath, JSON.stringify(existingData, null, 2));
            res.json({ message: '資料已刪除' });
        } else {
            res.status(404).json({ error: '找不到指定的資料' });
        }
    } catch (error) {
        console.error('Error deleting scan data:', error);
        res.status(500).json({ error: '無法刪除掃描資料' });
    }
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '伺服器發生錯誤' });
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
