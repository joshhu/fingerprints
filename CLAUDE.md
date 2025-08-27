# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案描述

這是一個使用 FingerprintJS V4 的瀏覽器數位指紋測試網站，主要用於研究和測試瀏覽器指紋識別技術。專案採用 Node.js/Express 後端與 SQLite 資料庫，前端使用原生 JavaScript。

## 常用指令

```bash
# 安裝依賴項目
npm install

# 啟動伺服器
npm start

# 開發模式（使用 nodemon 自動重啟）
npm run dev

# 執行自動化測試（使用 Puppeteer）
node test-fingerprint.js
```

## 專案架構

### 後端架構 (server.js)
- **Express 伺服器**：監聽 port 3000，提供靜態檔案服務
- **SQLite 資料庫**：存儲使用者指紋資料，使用 `users` 資料表
- **API 端點**：
  - `POST /api/fingerprint`：接收並處理指紋資料，自動判斷新舊使用者
  - `GET /api/users`：獲取所有使用者列表
  - `GET /api/stats`：獲取統計資料

### 前端架構 (public/)
- **index.html**：主要 UI 介面，引用 FingerprintJS V4 CDN
- **app.js**：核心應用程式邏輯，包含 `FingerprintApp` 類別
- **style.css**：響應式 CSS 樣式

### 關鍵模組

1. **FingerprintApp 類別** (public/app.js:2)：
   - 管理 FingerprintJS 初始化
   - 處理指紋採集流程
   - 顯示結果和統計資訊
   - 與後端 API 通訊

2. **資料庫模型** (server.js:16)：
   - `users` 資料表包含：visitor_id、confidence_score、version、components 等欄位
   - 自動追蹤建立時間和最後存取時間

3. **測試模組** (test-fingerprint.js)：
   - 使用 Puppeteer 進行自動化測試
   - 模擬使用者互動測試指紋採集功能

## 技術特點

- **指紋技術**：使用 FingerprintJS V4 專業版功能，包含 Canvas、WebGL、音訊指紋等
- **使用者識別**：基於 visitor_id 自動判斷新舊使用者
- **即時統計**：顯示元件成功率、採集時間等詳細指標
- **調試支援**：提供詳細的 console 日誌和調試資訊輸出

## 開發注意事項

- 伺服器預設綁定到 `0.0.0.0:3000` 以支援區域網路存取
- 資料庫檔案 `fingerprints.db` 會在首次啟動時自動建立
- 前端使用原生 JavaScript，無需建置步驟
- 測試需要伺服器運行在 localhost:3000

## 資料庫結構

使用 SQLite 資料庫，主要資料表：
- `users`：存儲指紋資料和使用者資訊
- 支援自動建立/更新使用者記錄
- 包含信心度評分和元件詳細資料

## API 格式

指紋資料格式基於 FingerprintJS V4 回應結構：
- `visitorId`：唯一使用者識別碼
- `confidence`：信心度物件 (score, comment)
- `components`：詳細指紋元件資料
- `version`：FingerprintJS 版本資訊