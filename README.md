
<div align="center">
  <img width="120" src="public/lotus.svg" alt="Lotus Icon" />
  <h1>靈曦籤苑 &bull; Mystical Oracle of Guanyin</h1>
  <p><strong>融合傳統東方籤詩文化與現代生成式 AI 的心靈指引平台</strong></p>
  
  [![](https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
  [![](https://img.shields.io/badge/Powered%20by-Gemini%20AI-8E75B2?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
  [![](https://img.shields.io/badge/License-MIT-green?style=flat-square)]()
</div>

---

## 📖 專案簡介 (Introduction)

**靈曦籤苑** 是一個結合傳統觀音靈籤與 Google Gemini AI 的現代化解籤應用程式。透過數位化的方式，使用者可以誠心訴說心中的煩惱，並獲得來自「大師」的智慧指引。

本專案不僅提供傳統的籤詩內容，更利用先進的大型語言模型 (LLM) 針對使用者的具體問題進行深入剖析，並生成相應的視覺藝術與語音解說，提供全方位的沈浸式體驗。

## ✨ 特色功能 (Features)

- **🗣️ 語音互動問事**：支援 Web Speech API，讓您可以直接用說的與大師溝通。
- **🤖 AI 智慧解籤**：串接 Google Gemini API，針對您的具體問題提供個性化、幽默且富有智慧的解讀。
- **🎨 生成式藝術**：根據抽到的籤詩內容，AI 自動生成獨一無二的立體紙雕風格 (或其他自訂風格) 藝術圖。
- **🔊 大師語音開示**：將文字解讀轉化為語音，讓您「聽」見大師的叮嚀。
- **📜 數位籤詩收藏**：支援將解籤結果（含籤詩、解釋、AI 繪圖）打包下載為精美的 HTML 檔案永久保存。
- **🔐 安全的 API 管理**：支援使用者自行輸入 API Key，並安全儲存於本地端 (LocalStorage)。

## 🚀 快速開始 (Getting Started)

### 先決條件
- Node.js (建議 v16 以上)
- 一個有效的 [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 安裝步驟

1. **複製專案**
   ```bash
   git clone <你的專案儲存庫網址>
   cd <專案資料夾>
   ```

2. **安裝依賴套件**
   ```bash
   npm install
   ```

3. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

4. **開始使用**
   - 開啟瀏覽器訪問 `http://localhost:5173` (或終端機顯示的網址)。
   - 點擊右上角的設定圖示 ⚙️，輸入您的 Gemini API Key。
   - 開始您的求籤之旅！

## 🛠️ 技術棧 (Tech Stack)

- **前端框架**: React + Vite
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **AI 模型**: Google Gemini (透過 Google Generative AI SDK)
- **語音識別**: Web Speech API
- **語音合成**: 瀏覽器原生 API / Gemini Audio 生成

## 📂 專案結構

```
/
├── components/      # React 組件 (如 SettingsModal)
├── services/        # API 服務整合 (Gemini 呼叫邏輯)
├── constants.tsx    # 常數資料 (籤詩內容、SVG 圖標)
├── types.ts         # TypeScript 型別定義
├── App.tsx          # 主要應用程式邏輯
└── vite.config.ts   # Vite 設定檔
```

## 👨‍💻 開發者 (Developer)

本專案由 **義守大學大眾傳播學系 陳嘉暐老師** 開發與設計。

---

> 「一切法從心想生，解籤僅供參考，未來掌握在您手中。」
