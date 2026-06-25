/**
 * Google Apps Script Backend (Code.gs)
 * 🥤 飲料線上訂購系統
 */

var ADMIN_PASSWORD = 'sljh2163'; // 管理密碼，用於一鍵清除全部訂單

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('🥤 飲料線上訂購系統')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 取得或建立「飲料訂單」工作表
 */
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('請將此腳本綁定至 Google 試算表（在試算表中點選「擴充功能」 > 「Apps Script」）。');
  }
  
  var sheetName = '飲料訂單';
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // 寫入首列標題 (包含第7欄使用者識別碼)
    sheet.appendRow(['時間戳記', '訂購者姓名', '飲料品項', '杯數', '糖量', '冰塊量', '使用者識別碼']);
    
    // 美化首列標題
    var headerRange = sheet.getRange(1, 1, 1, 7);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#efebe9'); // 淺褐灰色背景
    headerRange.setFontColor('#4e342e'); // 深褐色文字
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    
    // 自動調整欄寬
    sheet.autoResizeColumns(1, 7);
  } else {
    // 檢查並補上使用者識別碼欄位（向後相容）
    var lastColumn = sheet.getLastColumn();
    if (lastColumn < 7) {
      sheet.getRange(1, 7).setValue('使用者識別碼');
      var cell = sheet.getRange(1, 7);
      cell.setFontWeight('bold');
      cell.setBackground('#efebe9');
      cell.setFontColor('#4e342e');
      cell.setHorizontalAlignment('center');
      sheet.autoResizeColumns(1, 7);
    }
  }
  return sheet;
}

/**
 * 新增訂單
 * @param {Object} order 訂單資料 { name, drink, cups, sugar, ice, userId }
 */
function addOrder(order) {
  try {
    var sheet = getSheet();
    var timestamp = new Date();
    // 格式化時間 (台北/標準時間)
    var timeZone = ssTimeZoneSafe();
    var formattedDate = Utilities.formatDate(timestamp, timeZone, 'yyyy/MM/dd HH:mm:ss');
    
    sheet.appendRow([
      formattedDate,
      order.name,
      order.drink,
      Number(order.cups),
      order.sugar,
      order.ice,
      order.userId || ''
    ]);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 取得所有訂單 (依照時間由新到舊排序)
 */
function getOrders() {
  try {
    var sheet = getSheet();
    var lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return []; // 只有標題或為空
    }
    
    var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    var orders = data.map(function(row) {
      return {
        timestamp: row[0] instanceof Date ? Utilities.formatDate(row[0], ssTimeZoneSafe(), 'yyyy/MM/dd HH:mm:ss') : String(row[0]),
        name: String(row[1]),
        drink: String(row[2]),
        cups: Number(row[3]),
        sugar: String(row[4]),
        ice: String(row[5]),
        userId: String(row[6] || '')
      };
    });
    
    // 反轉陣列，讓最新訂單排在最上方
    return orders.reverse();
  } catch (error) {
    Logger.log('取得訂單失敗: ' + error.toString());
    return [];
  }
}

/**
 * 安全取得時區，若出錯則預設為台北時區 (GMT+8)
 */
function ssTimeZoneSafe() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  } catch (e) {
    return 'Asia/Taipei';
  }
}

/**
 * 刪除訂單 (只有自己或欄位為空才允許刪除)
 * @param {string} timestamp 時間戳記
 * @param {string} name 訂購者姓名
 * @param {string} userId 前端傳入的使用者識別碼
 */
function deleteOrder(timestamp, name, userId) {
  try {
    var sheet = getSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: false, error: '沒有訂單可以刪除。' };
    }
    
    var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    var timeZone = ssTimeZoneSafe();
    
    for (var i = 0; i < data.length; i++) {
      var rowTime = data[i][0] instanceof Date ? Utilities.formatDate(data[i][0], timeZone, 'yyyy/MM/dd HH:mm:ss') : String(data[i][0]);
      var rowName = String(data[i][1]);
      var rowUserId = String(data[i][6] || '');
      
      if (rowTime === timestamp && rowName === name) {
        if (rowUserId !== '' && rowUserId !== userId) {
          return { success: false, error: '您只能刪除自己點購的項目！' };
        }
        sheet.deleteRow(i + 2); // 標題列在第1列，數據從第2列(索引0)開始
        return { success: true };
      }
    }
    return { success: false, error: '找不到相符的訂單項目。' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 一鍵清除所有訂單 (需密碼驗證)
 * @param {string} password 輸入的密碼
 */
function deleteAllOrders(password) {
  try {
    if (password !== ADMIN_PASSWORD) {
      return { success: false, error: '密碼錯誤，拒絕清除！' };
    }
    var sheet = getSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, message: '目前無訂單資料可清除。' };
    }
    
    sheet.deleteRows(2, lastRow - 1);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
