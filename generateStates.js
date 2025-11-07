const ModbusRTU = require("modbus-serial");

const client = new ModbusRTU();

// const PORT = "/dev/serial/by-path/platform-fe9c0000.xhci-usb-0\:1.1\:1.0-port0";
const PORT = "/dev/serial/by-path/platform-fd500000.pcie-pci-0000\:01\:00.0-usb-0\:1.1.1\:1.0-port0";
const SLAVE_ID = 0x01;
const POLL_MS = 1000;
const REQ_TIMEOUT = 5000;

function toFloat32(high, low) {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(high, 0);
  buf.writeUInt16BE(low, 2);
  return buf.readFloatBE(0);
}

function calcStats(data) {
  const n = data.length;
  const mean = data.reduce((sum, val) => sum + val, 0) / n;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  return { mean, stdDev, range, min, max };
}

async function generateStates(n = 5) {
  return new Promise((resolve, reject) => {
    client.on("error", (e) => reject(new Error("[serial error] " + (e.message || e))));
    client.on("close", () => console.error("[serial] port closed"));

    client.connectRTUBuffered(
      PORT,
      { baudRate: 9600, parity: "none", stopBits: 1, dataBits: 8 },
      async () => {
        try {
          console.log(`[serial] opened ${PORT}`);
          client.setID(SLAVE_ID);
          client.setTimeout(REQ_TIMEOUT);

          const results = [];

          for (let i = 0; i < n; i++) {
            try {
              const res = await client.readHoldingRegisters(0x0000, 0x0004);
              const data = res.data;
              const level = toFloat32(data[1], data[0]);
              const signal = data[3];
              results.push(level);
              console.log(`(${i + 1}/${n}) level:`, level, " signal:", signal);
            } catch (err) {
              console.error("[modbus read error]", err.message || err);
            }
            await new Promise((r) => setTimeout(r, POLL_MS));
          }

          const stats = calcStats(results);
          console.log("資料:", results);
          console.log("平均數:", stats.mean);
          console.log("標準差:", stats.stdDev);
          console.log("Range:", stats.range);

          client.close(); // 關閉連線
          resolve(stats);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

// 使用範例
// generateStats(5)
//   .then((stats) => console.log("計算完成:", stats))
//   .catch((err) => console.error("程式錯誤:", err));

module.exports = {
  generateStates
};