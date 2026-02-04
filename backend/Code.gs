// CONFIGURATION
// Replace this with the authorized email address
const AUTHORIZED_EMAIL = "mr.dhanushbohara@gmail.com"; 

// YOUR SPECIFIC SPREADSHEET ID
const SPREADSHEET_ID = "1lODAMJKUjwugEbLTvFhrB3JqgJ2fGJZrTXAVhlKDMqM";

function getSpreadsheet() {
  let doc = SpreadsheetApp.getActiveSpreadsheet();
  if (!doc) {
    doc = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return doc;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);
    const userEmail = data.userEmail;
    
    // SECURITY CHECK
    if (userEmail !== AUTHORIZED_EMAIL) {
      return ContentService
        .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Unauthorized user' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const doc = getSpreadsheet();
    const sheetName = data.sheetName;
    let sheet = doc.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Sheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Append Logic based on Sheet
    // Sheet Headers assumed:
    // Pasal Kharcha: item_name, price, date_time, user_email
    // Kotha Vada: date, price, user_email
    // College Fee: semester, category, price, date, user_email
    // Personal Kharcha: category, price, date, user_email
    
    let rowData = [];
    
    if (sheetName === 'Pasal Kharcha') {
      rowData = [data.item_name, data.price, data.date_time, userEmail, new Date()];
    } else if (sheetName === 'Kotha Vada') {
      rowData = [data.date, data.price, userEmail, new Date()];
    } else if (sheetName === 'College Fee') {
      rowData = [data.semester, data.category, data.price, data.date, userEmail, new Date()];
    } else if (sheetName === 'Personal Kharcha') {
      rowData = [data.category, data.price, data.date, userEmail, new Date()];
    }

    sheet.appendRow(rowData);
    
    // Refresh Formula Sheets if needed (Optional, usually automatic)

    return ContentService
      .createTextOutput(JSON.stringify({ 'status': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'status': 'error', 'message': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  // Return Summary Data
  // ?action=getSummary&userEmail=...
  
  const action = e.parameter.action;
  
  if (action === 'getSummary') {
      const doc = getSpreadsheet();
      
      // Assumes Sheet 5 and 6 are set up with formulas, or we calculate here.
      // Let's calculate dynamically so we don't rely on brittle sheet cell references (like 'Sheet5!A1')
      
      // Helper to sum a column in a sheet
      // Note: fetching all data might be slow if huge, but fine for personal use
      const total = calculateTotal(doc);
      const monthly = calculateMonthly(doc);
      const yearly = calculateYearly(doc);
      
      return ContentService
        .createTextOutput(JSON.stringify({
          'status': 'success',
          'total': total,
          'monthly': monthly,
          'yearly': yearly
        }))
        .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("Hello World");
}

function calculateTotal(doc) {
  // Sum of all price columns in relevant sheets
  let sum = 0;
  // Sheet configurations: name -> price column index (0-based)
  // Pasal Kharcha (Price is B -> 1)
  // Kotha Vada (Price is B -> 1)
  // College Fee (Price is C -> 2)
  // Personal Kharcha (Price is B -> 1)
  
  sum += getColumnSum(doc.getSheetByName('Pasal Kharcha'), 1);
  sum += getColumnSum(doc.getSheetByName('Kotha Vada'), 1);
  sum += getColumnSum(doc.getSheetByName('College Fee'), 2);
  sum += getColumnSum(doc.getSheetByName('Personal Kharcha'), 1);
  
  return sum;
}

function getColumnSum(sheet, colIndex) {
  if (!sheet) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0; // No data (assuming header)
  
  const values = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
  let s = 0;
  for (let i = 0; i < values.length; i++) {
    const val = parseFloat(values[i][0]);
    if (!isNaN(val)) s += val;
  }
  return s;
}

function calculateMonthly(doc) {
  // Complex implementation omitted for brevity, returns a dummy or simple check
  // For now, let's just return Total for simplicity or implement proper date parsing if user asks.
  // The user requested: "Automatically calculate total, monthly, and yearly expenses"
  
  // Real implementation requires parsing date strings which can be inconsistent.
  // Let's just return 0 with a TODO or implement a simple check for current month.
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let sum = 0;

  // Example for Pasal Kharcha (Date is C -> 2, Price is B -> 1)
  // Date format is input type="datetime-local" or "date" -> ISO string YYYY-MM-DD...
  sum += getSumForPeriod(doc.getSheetByName('Pasal Kharcha'), 2, 1, currentMonth, currentYear);
  sum += getSumForPeriod(doc.getSheetByName('Kotha Vada'), 0, 1, currentMonth, currentYear);
  sum += getSumForPeriod(doc.getSheetByName('College Fee'), 3, 2, currentMonth, currentYear);
  sum += getSumForPeriod(doc.getSheetByName('Personal Kharcha'), 2, 1, currentMonth, currentYear);

  return sum;
}

function calculateYearly(doc) {
  const currentYear = new Date().getFullYear();
  let sum = 0;
  
  sum += getSumForPeriod(doc.getSheetByName('Pasal Kharcha'), 2, 1, null, currentYear);
  sum += getSumForPeriod(doc.getSheetByName('Kotha Vada'), 0, 1, null, currentYear);
  sum += getSumForPeriod(doc.getSheetByName('College Fee'), 3, 2, null, currentYear);
  sum += getSumForPeriod(doc.getSheetByName('Personal Kharcha'), 2, 1, null, currentYear);

  return sum;
}

function getSumForPeriod(sheet, dateColIndex, priceColIndex, month, year) {
  if (!sheet) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  
  const range = sheet.getRange(2, 1, lastRow - 1, Math.max(dateColIndex, priceColIndex) + 1).getValues();
  let s = 0;
  
  for (let i = 0; i < range.length; i++) {
    const row = range[i];
    const dateStr = row[dateColIndex];
    const price = parseFloat(row[priceColIndex]);
    
    if (isNaN(price)) continue;
    
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;
    
    if (d.getFullYear() === year) {
      if (month === null || d.getMonth() === month) {
        s += price;
      }
    }
  }
  return s;
}


// --- TEST FUNCTION (Use this to verify if script is working) ---
function testPost() {
  const mockEvent = {
    postData: {
      contents: JSON.stringify({
        userEmail: AUTHORIZED_EMAIL,
        sheetName: "Pasal Kharcha",
        item_name: "Test Item",
        price: 100,
        date_time: new Date().toISOString()
      })
    }
  };
  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}

// --- SETUP FUNCTIONS ---

function setup() {
  const doc = getSpreadsheet();
  
  if (!doc) {
    throw new Error("Spreadsheet not found! Check your SPREADSHEET_ID in Code.gs");
  }
  
  createSheetIfNotExists(doc, 'Pasal Kharcha', ['Item Name', 'Price', 'Date Time', 'User Email', 'Timestamp']);
  createSheetIfNotExists(doc, 'Kotha Vada', ['Date', 'Price', 'User Email', 'Timestamp']);
  createSheetIfNotExists(doc, 'College Fee', ['Semester', 'Category', 'Price', 'Date', 'User Email', 'Timestamp']);
  createSheetIfNotExists(doc, 'Personal Kharcha', ['Category', 'Price', 'Date', 'User Email', 'Timestamp']);
  
  console.log("Setup complete! All sheets created.");
}

function createSheetIfNotExists(doc, name, headers) {
  let sheet = doc.getSheetByName(name);
  if (!sheet) {
    sheet = doc.insertSheet(name);
    sheet.appendRow(headers);
  }
}
