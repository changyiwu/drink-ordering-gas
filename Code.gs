/**
 * Google Apps Script Backend (Code.gs)
 * 🥤 飲料線上訂購系統
 */

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
    // 寫入首列標題
    sheet.appendRow(['時間戳記', '訂購者姓名', '飲料品項', '杯數', '糖量', '冰塊量']);
    
    // 美化首列標題
    var headerRange = sheet.getRange(1, 1, 1, 6);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#efebe9'); // 淺褐灰色背景
    headerRange.setFontColor('#4e342e'); // 深褐色文字
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    
    // 自動調整欄寬
    sheet.autoResizeColumns(1, 6);
  }
  return sheet;
}

/**
 * 新增訂單
 * @param {Object} order 訂單資料 { name, drink, cups, sugar, ice }
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
      order.ice
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
    
    var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    var orders = data.map(function(row) {
      return {
        timestamp: row[0] instanceof Date ? Utilities.formatDate(row[0], ssTimeZoneSafe(), 'yyyy/MM/dd HH:mm:ss') : String(row[0]),
        name: String(row[1]),
        drink: String(row[2]),
        cups: Number(row[3]),
        sugar: String(row[4]),
        ice: String(row[5])
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
