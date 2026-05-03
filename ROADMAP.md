# πOS — 網頁作業系統開發路線圖

> 目標：在瀏覽器中打造一個高度模擬現代 Windows 的作業系統，使用「黑科技」實現資料持久化與執行 x86/ARM 二進位程式。

用戶的命令/建議:
```text
希望在跟目錄(這裡定義為工作區，md給你存一竊你知道的資料和你的發想...)建立一個server.py(main.py)用來架設網頁伺服器，最好先php化可以放到託管以及公網可連線...



如果可以加入gui可以看後台情況...

(用戶管理(可不可以看報所有檔案(ftp也架設工作區好維護))(這意味需要架設fpt，握建議把vscode也加進去，整個架構用建構好的vm來跑用外往連進去))
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
| Web Audio API | 系統音效 | 規劃中 |

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

### Phase 2 — 內建應用程式
- [x] 記事本（讀寫 VFS、Ctrl+S/N/O、Tab 縮排、狀態列）
- [x] 檔案總管（目錄瀏覽、新增/刪除/重新命名、右鍵選單、側邊欄）
- [x] 終端機（20+ 指令、Tab 補全、歷史記錄、Ctrl+C/L）
- [x] 內建瀏覽器（iframe 沙盒、書籤管理、SVG 工具列）
- [x] 系統設定（顯示/桌布/系統/儲存/關於，語言切換真正可用）
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
- [ ] 本機檔案存取 — File System Access API
- [ ] PWA 支援 — 可安裝為桌面應用程式
- [ ] 多視窗虛擬桌面 — 類 Windows 虛擬桌面
- [ ] Web Audio API — 系統音效
- [ ] Clipboard API — 跨視窗剪貼簿

---

## 里程碑

| 里程碑 | 目標 | 狀態 |
|--------|------|------|
| M1 | 完整可用的桌面環境（視窗/檔案/終端/多語言/沙盒） | 完成 |
| M2 | 執行 FreeDOS .exe 程式 | 完成 |
| M3 | 執行 Linux ARM 二進位 | 規劃中 |
| M4 | 完整多使用者 + PWA + Service Worker | 規劃中 |

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

*最後更新：2026-05-03*
