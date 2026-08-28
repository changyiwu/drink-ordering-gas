# drink-ordering-gas（專案藍圖）

> 本檔為跨 Agent 通用的專案藍圖（AGENTS.md 開放標準）。任何 Agent 的每個 session 都應先讀本檔＋`handoff.md`。

## 專案簡介
Google Apps Script 飲料線上訂購系統，配合試算表儲存訂單與讀取顯示。

## 關鍵時程
- 無

## 目標與路線圖
- [x] 階段一：線上訂餐、試算表整合、個人刪除校驗、管理員一鍵清除、手機掃碼身分同步
- [x] 階段二：依據 project-init 技能規範調整 Obsidian 專案工作流程筆記與 L1/L2/L3 結構

## 資料夾結構
- `agents.md`：專案藍圖（本檔）
- `handoff.md`：跨 session / 跨電腦交接檔
- `Code.gs`：Google Apps Script 後端邏輯
- `Index.html`：前端 UI 與互動邏輯
- `README.md`：專案說明
- `飲料訂購程式試算表.gsheet`：繫結的 Google 試算表捷徑（GDrive 同步自動產生，已 gitignore；試算表 ID 只記在 `handoff.md`，不進 repo）

## 同步層級（本專案初始化至第 3 層級）

| 層級 | 平台 | 位置 | 讀取時機 |
|------|------|------|---------|
| L1 | 本地（GDrive） | `agents.md`＋`handoff.md` | 每個 session |
| L2 | GitHub | `changyiwu/drink-ordering-gas` | 指定時 |
| L3 | Obsidian | `drink-ordering-gas/專案工作流程.md` | 有需要時 |

## 三個檔案的職責（依「時效性」分家，不是依「詳細程度」）

| 檔案 | 時效 | 寫入方式 | 放什麼 |
|------|------|---------|--------|
| `handoff.md` | **只對下一個 session 有效**，過期即丟 | 每次收工整份重寫 | 做到哪、下一步、**這次**的暫時 workaround |
| `agents.md`（本檔） | **長期有效**，每個 session 都適用 | 只有規則本身變了才改 | 目標、路線圖、常設規則、結構 |
| Obsidian／`git log` | **歷史**：發生過什麼、為什麼 | 只增不刪 | 決策紀錄、踩坑完整版、逐次進度 |

驗收標準：**`handoff.md` 整份刪掉，不應損失任何長期資訊**——會的話代表該升級進本檔卻沒升級。

**本檔不要出現的東西**：❌ `## 最近進度`／逐次工作紀錄、❌ 決策理由與踩坑完整版。歷史寫 L3 筆記的〈🗓️ 最近更動紀錄〉〈🧠 決策紀錄〉〈🕳️ 踩坑筆記〉；踩過的坑只把**結論**收斂成一條祈使句寫進〈工作約定〉，原因留 L3。

## 工作約定
- 任何 Agent、任何電腦：**開工先讀 `handoff.md`，收工必更新 `handoff.md`**
- 修改共用檔案前先讀最新內容，避免覆蓋其他 Agent 的變更
- 所有回應與文件使用繁體中文；涉及檔案操作時回報完整產出位置
- Windows 指令優先使用 PowerShell 語法
- 修改前先確認計畫，優先保留原有資料結構
- 不把每日流水帳寫進本檔

## 安全與隱私

- 不要 commit API key、token、密碼等敏感資料
- 不要 commit NotebookLM 個人匯出清單或筆記本 ID 清單
- 不要自動納入無關的 Git 變更
- 不要儲存學生真名；正式資料只使用班級代號與座號
