# drink-ordering-gas 🥤 飲料線上訂購系統（GAS 版本）

前端採用同層 `drink-ordering-gh` 專案的「作伙喝飲料」首頁、五家店介面、菜單、樣式與圖片；訂單仍由原本的 Google Apps Script `Code.gs` 寫入及讀取繫結試算表。

正式網站：[作伙喝飲料 GAS 版](https://script.google.com/macros/s/AKfycbwO8ZoWd0wzIDJkz2OUhAsDEMDcx8Bc4dZcUg1sHUZ2jkSBEZu_mUSpvAWWUfIWKEi6/exec)

## 特色

- **五家店訂購介面**：保留來源專案的店家選擇、分組菜單、容量與價格、訂單看板和統計。
- **試算表儲存**：透過 `google.script.run` 呼叫原有 `addOrder`、`getOrders`、`deleteOrder`、`deleteAllOrders`。
- **自動更新**：店家頁每 15 秒讀取一次試算表；送出或刪除後立即重讀。
- **原有訂單可見**：沒有店家標記的舊訂單在首頁「原有未分類訂單」顯示。

## 資料相容方式

後端欄位沒有店家、容量、單價，因此新訂單把這三項資訊及下單時價格寫在既有的「飲料品項」欄，例如 `[50嵐|L|35] 茉莉綠茶`。前端讀回後會依店家分頁顯示，並以儲存的價格計算金額；其他欄位及 `Code.gs` 均不變。

`deleteAllOrders` 原本會清除**整張試算表的全部訂單**，因此前端清楚標示為「清除所有店家訂單」，需再次確認及輸入管理密碼。原後端沒有驗證登入或跨人刪除單筆訂單的函式；一般使用者只能刪除自己或未綁定身分的舊訂單。

## 更新前端

在本專案資料夾執行：

```powershell
& 'C:\Users\chang\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' tools/build_frontend.py
```

腳本從同層 `drink-ordering-gh` 讀取頁面、`styles.css`、`menu_data.js` 與使用中的圖片，產生 GAS 可直接載入的單一 `Index.html`。GAS 網頁應用程式只需更新 `Index.html` 並重新部署；`Code.gs` 不需修改。`tools/gas_app.js` 是試算表介面轉接程式，會一併內嵌。

## 目錄結構

- `Code.gs`：Google Apps Script 後端程式碼。
- `Index.html`：由來源專案前端與 GAS 轉接程式產生的單一 HTML 模板。
- `tools/build_frontend.py`：前端打包腳本。
- `tools/gas_app.js`：GAS 訂單與頁面導覽轉接程式。
