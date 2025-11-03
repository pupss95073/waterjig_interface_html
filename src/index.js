        const { createApp } = Vue;

        createApp({
            data() {
                return {
                    lastClicked: null, // 記錄最後點擊的按鈕
                    buttons: [
                        { name: 'A', class: 'btn-primary', label: 'A' },
                        { name: 'B', class: 'btn-primary', label: 'B' },
                        { name: 'C', class: 'btn-primary', label: 'C' },
                        { name: 'D', class: 'btn-primary', label: 'D' },
                        { name: 'E', class: 'btn-primary', label: 'E' }
                    ]
                };
            },
            methods: {
                buttonClick(buttonName) {
                    this.lastClicked = `Button ${buttonName}`;
                    console.log(`Button ${buttonName} clicked!`);
                    
                    // 使用動態方法名稱調用對應的處理函數
                    const methodName = `handleButton${buttonName}`;
                    if (this[methodName]) {
                        this[methodName]();
                    }
                },
                // 使用 for 迴圈動態生成按鈕處理方法
                ...(() => {
                    const methods = {};
                    const buttons = ['A', 'B', 'C', 'D', 'E'];
                    for (let i = 0; i < buttons.length; i++) {
                        const button = buttons[i];
                        methods[`handleButton${button}`] = function() {
                            console.log(`執行按鈕 ${button} 的功能`);
                            // 在這裡添加按鈕 ${button} 的特定功能
                            // 你可以根據按鈕名稱執行不同的邏輯
                            switch(button) {
                                case 'A':
                                    console.log('執行功能 A：初始化系統');
                                    break;
                                case 'B':
                                    console.log('執行功能 B：開始處理');
                                    break;
                                case 'C':
                                    console.log('執行功能 C：暫停操作');
                                    break;
                                case 'D':
                                    console.log('執行功能 D：停止系統');
                                    break;
                                case 'E':
                                    console.log('執行功能 E：重置設定');
                                    break;
                            }
                        };
                    }
                    return methods;
                })()
            }
        }).mount('#app');