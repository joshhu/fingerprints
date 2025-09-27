# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用指令

- **安裝依賴**: `npm install`
- **啟動開發伺服器**: `npm run dev`
- **啟動生產伺服器**: `npm start`
- **執行測試**: `npm test`

## 專案架構

本專案是一個使用 FingerprintJS V4 進行瀏覽器指紋採集的測試網站。

- **後端**: `server.js` 是唯一的後端檔案，使用 Express.js 處理 API 請求和靜態檔案服務。
- **前端**: 靜態檔案位於 `public/` 目錄下，包含 `index.html`, `style.css` 和 `app.js`。前端邏輯主要在 `app.js` 中實現。
- **資料庫**: 使用 `sqlite3` 作為資料庫，資料庫檔案為 `fingerprints.db`。

## 核心邏輯

- **指紋採集**: 前端 `app.js` 使用 FingerprintJS V4 函式庫收集瀏覽器指紋，並將其發送到後端的 `/api/fingerprint` 端點。
- **使用者驗證**: `server.js` 處理使用者註冊、登入和登出。它使用基於 session 的身份驗證。
- **相似度比對**: 當收到新的指紋時，伺服器會將其與資料庫中現有的指紋進行比對，以識別相似的使用者。
