# FingerprintJS V4 指紋採集測試網站

一個使用 FingerprintJS V4 進行瀏覽器指紋採集的測試網站，支援用戶識別和相似度比對。

## 功能特色

- 使用 FingerprintJS V4 進行高精度瀏覽器指紋採集
- 支援用戶註冊和登入系統
- 智慧指紋相似度比對演算法
- 即時視窗大小監控
- reCAPTCHA 驗證保護
- 響應式設計

## 本地開發

### 安裝套件
```bash
npm install
```

### 啟動開發伺服器
```bash
npm run dev
```

### 啟動生產伺服器
```bash
npm start
```

## 部署到 Render

### 1. 準備專案
確保你的專案已經準備好部署：
- 所有檔案都已提交到 Git
- `package.json` 包含正確的啟動指令
- 伺服器使用 `process.env.PORT` 作為連接埠

### 2. 在 Render 上部署

1. 前往 [Render.com](https://render.com) 並註冊/登入
2. 點擊 "New +" 按鈕
3. 選擇 "Web Service"
4. 連接你的 GitHub 帳號並選擇此專案
5. 設定部署選項：
   - **Name**: `fingerprint-test-site` (或你喜歡的名稱)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: 選擇免費方案

### 3. 環境變數設定（可選）
如果需要，可以在 Render 的環境變數中設定：
- `NODE_ENV`: `production`
- 其他自訂環境變數

### 4. 部署
點擊 "Create Web Service"，Render 會自動：
- 從 GitHub 拉取程式碼
- 安裝套件
- 啟動應用程式
- 提供公開的 URL

## 專案結構

```
fingerprints/
├── server.js              # Express 伺服器
├── package.json           # 專案設定
├── public/                # 靜態檔案
│   ├── index.html         # 主頁面
│   ├── style.css          # 樣式
│   └── app.js             # 前端邏輯
├── fingerprints.db        # SQLite 資料庫（本地開發）
└── README.md              # 專案說明
```

## API 端點

- `GET /` - 主頁面
- `POST /api/fingerprint` - 提交指紋資料
- `GET /api/users` - 取得所有用戶
- `GET /api/stats` - 取得統計資料
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/logout` - 用戶登出
- `GET /api/auth/me` - 取得當前用戶資訊

## 技術堆疊

- **後端**: Node.js, Express.js, SQLite
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **指紋採集**: FingerprintJS V4
- **驗證**: reCAPTCHA v2
- **部署**: Render

## 授權

MIT License
