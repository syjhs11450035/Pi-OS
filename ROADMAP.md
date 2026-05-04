# πOS — 網頁作業系統開發路線圖

> 目標：在瀏覽器中打造一個高度模擬現代 Windows 的作業系統，使用「黑科技」實現資料持久化與執行 x86/ARM 二進位程式。

> 不維護demo而是main

> ROADMAP.md 是唯一權威文件；原 `Files.md` 與 `代辦事項清單.md` 的內容已整合於此。

> App 開發規格與統一 API 詳見 `/開發手冊.md`。

用戶的命令/建議:
```text
希望在跟目錄(這裡定義為工作區，md給你存一竊你知道的資料和你的發想...)建立一個server.py(main.py)用來架設網頁伺服器，最好先php化可以放到託管以及公網可連線...



如果可以加入gui可以看後台情況...

(用戶管理(可不可以看報所有檔案(ftp也架設工作區好維護))(這意味需要架設fpt，握建議把vscode也加進去，整個架構用建構好的vm來跑用外往連進去))
```

---

## 專案規則與部署約定

- 主要維護目標是 `/main/`；`/demo/` 只作為預覽快照，不主動修改。
- 根目錄是 GitHub Pages / 靜態託管入口。
- `/index.html` 必須能導向正確目的地：本機開發進 `./demo/`，GitHub Pages 進 `./介紹/`。
- `/main/` 等同 `/main/index.html`，需支援無副檔名路由或靜態伺服器目錄索引。
- `/api/logo.svg` 保留作為 OS 圖示來源，可用於網頁 favicon、開機畫面、開始按鈕、關機畫面與關於頁。
- `/api/user/` 放登入、註冊等使用者 API 模擬資料。
- `/api/file/` 放預設桌面、桌布、使用者、安裝環境等共用預設資料。
- 所有前端資源路徑需盡量使用相對路徑，避免 GitHub Pages 子路徑部署失效。
- 新 app 可選擇 JSON UI Schema 或自寫 HTML/JS 兩種模式；JSON UI 由 `PiOS.ui` 生成，手寫 HTML 仍必須使用統一 API。
- 系統能力必須先進 `PiOS.*` 統一 API，再提供給 app 使用，避免每個 app 各自呼叫底層模組。

### 虛擬檔案系統目錄規劃

```text
/System/    系統資料，例如桌面配置、桌布、系統設定
/Temp/      app 暫存區，例如 /Temp/vm/{windowId}/
/Apps/      使用者安裝的 app，例如 /Apps/app-name/
/Users/     使用者資料根目錄
  /User/    預設使用者，作為未來多使用者系統基底
```

---

## 架構概覽

```
/                          (GitHub Pages 根目錄)
├── index.html             導向頁 → /main/
├── api/
│   ├── logo.svg           πOS 品牌圖示
│   ├── user/              login.json / register.json
│   └── file/              預設桌面、桌布、使用者、安裝環境
└── main/
    ├── index.html         主系統入口
    ├── os/                核心（不含 app 邏輯）
    │   ├── kernel.js      事件匯流排、沙盒 launch()
    │   ├── i18n.js        多語言系統
    │   ├── apploader.js   動態載入 app、權限管理
    │   ├── fs.js          虛擬檔案系統 (IndexedDB)
    │   ├── wm.js          視窗管理器
    │   ├── desktop.js     桌面圖示、右鍵選單
    │   ├── boot.js        開機序列
    │   ├── style.css      全域樣式
    │   └── lang/          系統語言包
    │       ├── en.json
    │       ├── zh-tw.json
    │       └── zh-cn.json
    └── apps/              應用程式（Mac bundle 風格）
        ├── index.json     app 清單
        ├── explorer/      info.json + app.js + icon.svg + en/zh-tw/zh-cn.json
        ├── notepad/
        ├── terminal/
        ├── browser/
        ├── vm/
        └── settings/
```

---

## 「黑科技」技術棧

| 技術 | 用途 | 狀態 |
|------|------|------|
| IndexedDB | 持久化虛擬檔案系統，支援二進位 (base64) | 完成 |
| WebAssembly (v86) | 在瀏覽器中執行真實 x86 Linux / DOS 程式 | 完成 |
| SharedArrayBuffer + Atomics | 多執行緒同步，模擬 CPU 核心 | 完成（需 HTTPS） |
| Service Worker | 攔截網路請求，模擬 OS 層級 I/O | 規劃中 |
| Web Workers | 背景執行程序，不阻塞 UI | 規劃中 |
| Canvas API | VM 螢幕輸出渲染 | 完成 |
| Blob URL + iframe sandbox | 安全執行 HTML/JS 應用程式 | 完成 |
| File System Access API | 存取真實本機檔案（需使用者授權） | 規劃中 |
| Clipboard API | 跨視窗剪貼簿 | 規劃中 |
| Web Audio API | 系統音效 | 部分完成 |

---

## 開發階段與進度

### Phase 1 — 核心基礎設施
- [x] 開機動畫 (Boot Screen) + 進度條
- [x] 桌面背景與佈局（漸層 + 光暈）
- [x] 工作列 (Taskbar) + 時鐘
- [x] 開始選單 (Start Menu) + 搜尋
- [x] 視窗管理器完整實作（拖曳、縮放、最大化、最小化、z-index）
- [x] 桌面圖示系統（雙擊開啟、右鍵選單）
- [x] 開機初始化序列（i18n → VFS → AppLoader → Desktop）
- [x] 虛擬檔案系統 (VFS) — IndexedDB 持久化
- [x] 核心事件匯流排 (Kernel)
- [x] 沙盒安全機制（AppLoader 權限檢查，阻止未授權背景執行）
- [x] 動態 App 載入器（AppLoader，讀取 info.json + 動態注入 app.js）
- [x] 多語言系統 (i18n)（en / zh-tw / zh-cn，擴充包優先）
- [x] πOS 品牌 Logo SVG（Fluent Design 風格）
- [x] 全 SVG 圖示系統（無 emoji）
- [x] `PiOS.*` 統一 API 基底（fs/app/window/process/clipboard/settings/ui/system/command）
- [x] JSON UI renderer 第一版（panel/row/button/input/select/toggle/slider）

### Phase 2 — 內建應用程式
- [x] 記事本（讀寫 VFS、Ctrl+S/N/O、Tab 縮排、狀態列）
- [x] 檔案總管（目錄瀏覽、新增/刪除/重新命名、右鍵選單、側邊欄）
- [x] 終端機（20+ 指令、Tab 補全、歷史記錄、Ctrl+C/L）
- [x] 內建瀏覽器（iframe 沙盒、書籤管理、SVG 工具列）
- [x] 系統設定（顯示/桌布/系統/儲存/關於，縮放、工作列位置、語言、時區、桌布、透明度、動畫、儲存與記憶體資訊可用）
- [x] 虛擬機（v86 整合，FreeDOS / Linux / KolibriOS）
- [x] 所有 app 完整三語言包（en / zh-tw / zh-cn）
- [x] 所有 app icon.svg（彩色 Fluent 風格）
- [x] 所有 app info.json（權限宣告）

### Phase 3 — 虛擬機（黑科技核心）
- [x] 整合 v86 (WebAssembly x86 模擬器)
- [x] 載入 FreeDOS / Linux / KolibriOS 映像檔
- [x] 執行真實 .exe (DOS) 程式
- [x] 執行 Linux ELF 二進位
- [x] 自訂 ISO/IMG 載入
- [ ] ARM 模擬 — 整合 QEMU.js 或 unicorn.js
- [ ] 虛擬磁碟 — 將 VFS 掛載為 VM 的磁碟機（VFS <-> v86 橋接）
- [ ] VM 剪貼簿共享（主機 <-> VM 雙向）

### Phase 4 — 進階功能
- [ ] 多使用者系統 — 登入畫面、使用者隔離
- [ ] Service Worker — 攔截 /api/ 請求，模擬後端
- [ ] 網路模擬 — 虛擬 TCP/IP 堆疊
- [ ] 應用程式商店 — 動態安裝第三方 app
- [x] App JSON UI Schema 第一版 — 讓 app 可用 JSON 定義 UI
- [ ] 開發者工具與 App Builder
- [ ] 本機檔案存取 — File System Access API
- [ ] PWA 支援 — 可安裝為桌面應用程式
- [ ] 多視窗虛擬桌面 — 類 Windows 虛擬桌面
- [x] Web Audio API — 開機音效開關
- [ ] Clipboard API — 跨視窗剪貼簿

---

## 里程碑

| 里程碑 | 目標 | 狀態 |
|--------|------|------|
| M1 | 完整可用的桌面環境（視窗/檔案/終端/多語言/沙盒） | 完成 |

---

## 近期修復清單

- [x] `main/os/apploader.js`：`APPS_BASE` 改為相對路徑，避免 GitHub Pages 子路徑部署失效。
- [x] `main/os/i18n.js`：系統語言包與 app 語言包改為相對路徑。
- [x] `main/index.html`：favicon、開機 logo、開始按鈕 logo 改為相對路徑。
- [x] `main/os/kernel.js`：關機畫面 logo 改為相對路徑。
- [x] `main/os/wm.js`：視窗初始位置改為 24px cascade，避免小螢幕視窗超出邊界。
- [x] `main/os/fs.js`：`rename()` 重新命名資料夾時同步更新子節點路徑。
- [x] `main/os/boot.js`：有初始化函式的開機步驟完成後立即進下一步，減少硬等待。
- [x] `main/apps/settings/`：設定頁控制項接上實際行為與持久化。
- [x] `main/apps/notepad/app.js`：自動儲存設定接到已開啟檔案的編輯流程。
- [x] `/index.html`：加入 GitHub Pages 偵測導向。
- [x] `/介紹/index.html`：建立介紹頁。

---

## App 標準規格

每個 app 是一個資料夾，位於 `/main/apps/{id}/`：

```
{id}/
  info.json       元資料 + 權限宣告（必要）
  app.js          應用程式本體（必要）
  icon.svg        彩色 SVG 圖示（必要）
  en.json         英文語言包（必要）
  zh-tw.json      繁體中文語言包（必要）
  zh-cn.json      簡體中文語言包（必要）
  {lang}.json     其他語言（選用，擴充包）
```

info.json 格式：
```json
{
  "id":          "appid",
  "version":     "1.0.0",
  "minOsVer":    "1.0.0",
  "entry":       "app.js",
  "icon":        "icon.svg",
  "permissions": ["fs.read", "fs.write", "network", "background", "system"],
  "background":  false,
  "autostart":   false,
  "category":    "system | productivity | internet"
}
```

---

## 已知限制

- SharedArrayBuffer：需要 COOP/COEP HTTP 標頭（本地開發需特殊設定）
- v86 效能：x86 模擬比原生慢約 10-50x，適合 DOS/輕量 Linux
- 儲存空間：IndexedDB 受瀏覽器配額限制（通常 50MB~數 GB）
- iframe 瀏覽器：受 CSP/CORS 限制，部分網站無法載入
- 瀏覽器沙盒：無法直接存取硬體，需透過 Web API 橋接

---

*最後更新：2026-05-04*
