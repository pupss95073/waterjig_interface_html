/* 用於混淆JS，將源碼放在src資料夾，有兩種模式，
   第一種: 整個資料夾進行混淆，會產生在public資料夾下，會維持跟src一樣的資料夾結構
        Ex: node obfuscator.js
   第二種: 單獨一個檔案進行混淆，指定檔名，不須加.js，但是需要有相對路徑
        Ex: node obfuscator.js --name js/transferRate
*/

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// 原始資料夾路徑
const sourceDir = path.join(__dirname, 'src');
// 混淆後資料夾路徑
const outputDir = path.join(__dirname, 'public');

// 獲取命令行參數，允許 `--name` 不帶 `=` 的情況
const args = process.argv.slice(2);
const fileNameArgIndex = args.findIndex(arg => arg === '--name');
const fileName = fileNameArgIndex !== -1 ? args[fileNameArgIndex + 1] : null;

// 創建混淆後資料夾（如果不存在的話）
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 檢查是否指定了檔案名
if (fileName) {
    let filePath = path.join(sourceDir, fileName);

    // 如果沒有 `.js` 擴展名，則添加
    if (!filePath.endsWith('.js')) {
        filePath += '.js';
    }

    if (fs.existsSync(filePath)) {
        obfuscateFile(filePath);
    } else {
        console.error(`指定的檔案不存在: ${filePath}`);
    }
} else {
    obfuscateDirectory(sourceDir);
}

// 遍歷資料夾中的所有檔案
function obfuscateDirectory(directory) {
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error(`無法讀取資料夾: ${err.message}`);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(directory, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error(`無法讀取檔案狀態: ${err.message}`);
                    return;
                }

                if (stats.isDirectory()) {
                    // 遞歸處理子資料夾
                    obfuscateDirectory(filePath);
                } else if (path.extname(file) === '.js') {
                    // 混淆 .js 檔案
                    obfuscateFile(filePath);
                }
            });
        });
    });
}

// 混淆單個檔案
function obfuscateFile(filePath) {
    fs.readFile(filePath, 'utf8', (err, code) => {
        if (err) {
            console.error(`無法讀取檔案: ${err.message}`);
            return;
        }

        // 混淆代碼
        const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
            compact: true,
            controlFlowFlattening: true
        }).getObfuscatedCode();

        // 輸出混淆後檔案
        const relativePath = path.relative(sourceDir, filePath);
        const outputFilePath = path.join(outputDir, relativePath);
        const outputFileDir = path.dirname(outputFilePath);

        // 確保輸出資料夾存在
        if (!fs.existsSync(outputFileDir)) {
            fs.mkdirSync(outputFileDir, { recursive: true });
        }

        fs.writeFile(outputFilePath, obfuscatedCode, (err) => {
            if (err) {
                console.error(`無法寫入檔案: ${err.message}`);
            } else {
                console.log(`已成功混淆並寫入檔案: ${outputFilePath}`);
            }
        });
    });
}