const { createApp } = Vue;

createApp({
    data() {
        return {
            lastClicked: null, // 記錄最後點擊的按鈕
            currentButton: '', // 當前操作的按鈕
            scanInput: '', // 掃碼輸入內容
            savedData: [], // 儲存的掃碼數據
            modal: null, // Bootstrap modal 實例
            stats: null, // xm125測試數據
            buttonAEnabled: false, // 按鈕 A 的狀態
            isGenerating: false, // 是否正在生成數據
            lastScanMode: false, // 記錄上一次的 scanMode 狀態
            buttons: [
                { name: 'A', class: 'btn-secondary', label: 'A' },  // 初始設為灰色 disabled
                { name: 'B', class: 'btn-primary', label: 'B' },
                { name: 'C', class: 'btn-primary', label: 'C' },
                { name: 'D', class: 'btn-primary', label: 'D' },
                { name: 'E', class: 'btn-primary', label: 'E' }
            ]
        };
    },
    mounted() {
        // 初始化 Bootstrap modal
        this.modal = new bootstrap.Modal(document.getElementById('scanModal'));

        // 載入本地儲存的數據
        this.loadSavedData();

        // 監聽 modal 顯示事件，自動 focus 到輸入框
        document.getElementById('scanModal').addEventListener('shown.bs.modal', () => {
            this.$refs.scanInputRef?.focus();
        });

        // 開始輪詢按鈕狀態
        this.startPolling();
    },
    beforeUnmount() {
        // 清理輪詢計時器
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
    },
    methods: {
        startPolling() {
            // 每秒檢查一次按鈕狀態
            this.pollTimer = setInterval(async () => {
                try {
                    const response = await fetch('/api/button-a-status');
                    if (!response.ok) throw new Error('Failed to fetch button status');
                    const data = await response.json();

                    // 更新按鈕 A 的狀態
                    this.buttonAEnabled = data.enabled;
                    this.isGenerating = data.isGenerating;

                    // 更新按鈕狀態和外觀
                    if (this.isGenerating) {
                        // 如果正在生成數據，顯示loading狀態
                        this.buttons[0].class = 'btn-warning';
                        this.buttons[0].label = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> 測試中...`; // 加入 spinner
                    } else if (data.enabled && data.stats) {
                        // 有測試結果時顯示綠色
                        this.buttons[0].class = 'btn-success';
                        this.buttons[0].label = 'A';
                    } else {
                        // 其他情況顯示藍色或灰色
                        this.buttons[0].class = this.buttonAEnabled ? 'btn-primary' : 'btn-secondary';
                        this.buttons[0].label = 'A';
                    }

                    // 更新測試結果
                    if (data.enabled && data.stats) {
                        this.stats = data.stats;
                    }

                    // 檢查 scanMode 狀態變化並處理 modal
                    if (data.scanMode && !this.lastScanMode) {
                        // 只在 scanMode 從 false 變為 true 時開啟 modal
                        this.lastClicked = `Button A`;
                        this.currentButton = `按鈕 A`;
                        this.scanInput = ''; // 清空輸入框
                        this.modal.show();
                    }
                    this.lastScanMode = data.scanMode; // 更新上一次的狀態
                } catch (error) {
                    console.error('Error polling button status:', error);
                }
            }, 1000);
        },
        buttonClick(buttonName) {
            // 如果是按鈕 A
            if (buttonName === 'A') {
                // 如果按鈕未啟用或沒有測試結果，則不處理
                if (!this.buttonAEnabled || !this.stats) {
                    return;
                }
            }

            this.lastClicked = `Button ${buttonName}`;
            this.currentButton = `按鈕 ${buttonName}`;
            this.scanInput = ''; // 清空輸入框
            console.log(`Button ${buttonName} clicked!`);

            // 顯示 modal
            this.modal.show();

            // 使用動態方法名稱調用對應的處理函數
            const methodName = `handleButton${buttonName}`;
            if (this[methodName]) {
                this[methodName]();
            }
        },
        async saveScanData() {
            if (!this.scanInput.trim()) {
                alert('請輸入掃碼結果！');
                return;
            }

            try {
                const response = await fetch('/api/scan-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        button: this.currentButton,
                        scanResult: this.scanInput.trim(),
                        stats: this.stats  // 加入 xm125 測試結果
                    })
                });

                if (!response.ok) {
                    throw new Error('儲存資料失敗');
                }

                await this.loadSavedData(); // 重新載入資料

                // 清空輸入框並關閉 modal
                this.scanInput = '';
                this.stats = null; // 清空測試結果
                this.buttonAEnabled = false; // 禁用按鈕
                this.buttons[0].class = 'btn-secondary'; // 將按鈕顏色改為灰色
                this.modal.hide();

                // 顯示成功訊息
                alert('測試結果儲存成功！');
            } catch (error) {
                console.error('儲存掃碼數據失敗：', error);
                alert('儲存資料時發生錯誤，請稍後再試');
            }
        },
        async deleteScanData(index) {
            if (confirm('確定要刪除這筆記錄嗎？')) {
                try {
                    const response = await fetch(`/api/scan-data/${index}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        throw new Error('刪除資料失敗');
                    }

                    await this.loadSavedData(); // 重新載入資料
                } catch (error) {
                    console.error('刪除掃碼數據失敗：', error);
                    alert('刪除資料時發生錯誤，請稍後再試');
                }
            }
        },
        async clearAllData() {
            if (confirm('確定要清除所有掃碼記錄嗎？')) {
                try {
                    const response = await fetch('/api/scan-data', {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        throw new Error('清除資料失敗');
                    }

                    await this.loadSavedData(); // 重新載入資料
                } catch (error) {
                    console.error('清除掃碼數據失敗：', error);
                    alert('清除資料時發生錯誤，請稍後再試');
                }
            }
        },
        async loadSavedData() {
            try {
                const response = await fetch('/api/scan-data');
                if (!response.ok) {
                    throw new Error('載入資料失敗');
                }
                this.savedData = await response.json();
            } catch (error) {
                console.error('載入掃碼數據失敗：', error);
                this.savedData = [];
            }
        },
        formatTimestamp(timestamp) {
            try {
                // 將 ISO 時間字串轉換為 Date 物件
                const date = new Date(timestamp);
                // 格式化為台灣時間格式
                return date.toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Taipei'
                });
            } catch (error) {
                console.error('時間格式化失敗：', error);
                return timestamp; // 如果轉換失敗，直接返回原始時間字串
            }
        },
        // 使用 for 迴圈動態生成按鈕處理方法
        ...(() => {
            const methods = {};
            const buttons = ['A', 'B', 'C', 'D', 'E'];
            for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i];
                methods[`handleButton${button}`] = function () {
                    console.log(`執行按鈕 ${button} 的功能`);
                    // 在這裡添加按鈕 ${button} 的特定功能
                    // 你可以根據按鈕名稱執行不同的邏輯
                    switch (button) {
                        case 'A':
                            console.log('Button A');
                            break;
                        case 'B':
                            console.log('Button B');
                            break;
                        case 'C':
                            console.log('Button C');
                            break;
                        case 'D':
                            console.log('Button D');
                            break;
                        case 'E':
                            console.log('Button E');
                            break;
                    }
                };
            }
            return methods;
        })()
    }
}).mount('#app');