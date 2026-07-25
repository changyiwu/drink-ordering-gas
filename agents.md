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

## 同步層級（本專案初始化至第 3 層級）

| 層級 | 平台 | 位置 | 讀取時機 |
|------|------|------|---------|
| L1 | 本地（GDrive） | `agents.md`＋`handoff.md` | 每個 session |
| L2 | GitHub | `changyiwu/drink-ordering-gas` | 指定時 |
| L3 | Obsidian | `drink-ordering-gas/專案工作流程.md` | 有需要時 |

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
