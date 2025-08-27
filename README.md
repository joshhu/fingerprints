# 數位指紋測試網站

這是一個用於測試瀏覽器數位指紋採集功能的網站，可以識別和追蹤單一使用者。

## 功能特色

- **多維度指紋採集**：收集瀏覽器基本資訊、Canvas 指紋、WebGL 指紋、音訊指紋等
- **字體檢測**：檢測系統安裝的字體
- **外掛程式識別**：收集瀏覽器外掛程式資訊
- **資料庫儲存**：使用 SQLite 儲存指紋資料
- **重複識別**：能夠識別相同使用者的重複造訪
- **現代化介面**：響應式設計，支援各種裝置

## 採集的指紋資料

- 使用者代理字串
- 螢幕解析度
- 時區設定
- 語言偏好
- 作業系統平台
- CPU 核心數
- 裝置記憶體
- Canvas 繪圖指紋
- WebGL 硬體指紋
- 音訊處理指紋
- 系統字體列表
- 瀏覽器外掛程式

## 安裝與執行

### 前置需求

- Node.js 14.0 或更新版本
- npm 或 yarn

### 安裝步驟

1. 安裝依賴項目：
```bash
npm install
```

2. 啟動伺服器：
```bash
npm start
```

3. 開發模式（自動重啟）：
```bash
npm run dev
```

### 存取網站

伺服器啟動後，可以透過以下方式存取：

- 本機：http://localhost:3000
- 區域網路：http://0.0.0.0:3000
- 其他裝置：http://[你的IP位址]:3000

## API 端點

### POST /api/fingerprint
提交指紋資料到伺服器

**請求格式：**
```json
{
  "fingerprint": "指紋雜湊值",
  "userAgent": "使用者代理",
  "screenResolution": "螢幕解析度",
  "timezone": "時區",
  "language": "語言",
  "platform": "平台",
  "hardwareConcurrency": "CPU核心數",
  "deviceMemory": "記憶體大小",
  "canvasFingerprint": "Canvas指紋",
  "webglFingerprint": "WebGL指紋",
  "audioFingerprint": "音訊指紋",
  "fonts": "字體列表",
  "plugins": "外掛程式資訊"
}
```

### GET /api/users
取得所有使用者資料

### GET /api/users/:id
取得特定使用者資料

## 專案結構

```
fingerprints/
├── server.js              # Express 伺服器
├── package.json           # 專案配置
├── README.md             # 說明文件
├── fingerprints.db       # SQLite 資料庫（自動建立）
└── public/               # 前端檔案
    ├── index.html        # 主要頁面
    ├── style.css         # 樣式表
    ├── fingerprints.js   # 指紋採集邏輯
    ├── clientid.js       # 客戶端 ID 管理
    └── app.js           # 主要應用程式邏輯
```

## 技術架構

- **後端**：Node.js + Express
- **資料庫**：SQLite
- **前端**：原生 JavaScript + HTML5 + CSS3
- **指紋技術**：Canvas API、WebGL API、Audio API

## 隱私說明

此專案僅用於測試和研究目的。在實際應用中，請確保：

- 遵守相關隱私法規
- 取得使用者明確同意
- 實作適當的資料保護措施
- 提供使用者選擇退出機制

## 授權

MIT License
