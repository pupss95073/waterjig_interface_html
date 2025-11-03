const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;

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
