// CONFIGURATION
// Replace this with the authorized email address
const AUTHORIZED_EMAIL = "mr.dhanushbohara@gmail.com"; 

// YOUR SPECIFIC SPREADSHEET ID (Verified from the links you provided)
const SPREADSHEET_ID = "1lODAMJKUjwugEbLTvFhrB3JqgJ2fGJZrTXAVhlKDMqM";

function getSpreadsheet() {
  let doc = SpreadsheetApp.getActiveSpreadsheet();
  if (!doc) {
    try {
      doc = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      console.error("Could not open spreadsheet by ID: " + e.toString());
    }
  }
  return doc;
}

// Helper to find sheet regardless of Big/Small letters
function getSheetCaseInsensitive(doc, name) {
  const sheets = doc.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase() === name.toLowerCase()) {
      return sheets[i];
    }
  }
  return null;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);
    const userEmail = (data.userEmail || "").trim().toLowerCase();
    const targetEmail = AUTHORIZED_EMAIL.trim().toLowerCase();
    
    console.log("Request from: " + userEmail);

    // SECURITY CHECK (Case-insensitive)
    if (userEmail !== targetEmail) {
      console.error("Unauthorized: " + userEmail);
      return ContentService
        .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Unauthorized user: ' + userEmail }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const doc = getSpreadsheet();
    if (!doc) {
      return ContentService
        .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Spreadsheet not found. Check ID.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheetName = data.sheetName;
    const sheet = getSheetCaseInsensitive(doc, sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Sheet not found: ' + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let rowData = [];
    const lowerName = sheetName.toLowerCase();
    
    if (lowerName === 'pasal kharcha') {
      rowData = [data.item_name, data.price, data.date_time, userEmail, new Date()];
    } else if (lowerName === 'kotha vada') {
      rowData = [data.date, data.price, userEmail, new Date()];
    } else if (lowerName === 'college fee') {
      rowData = [data.semester, data.category, data.price, data.date, userEmail, new Date()];
    } else if (lowerName === 'personal kharcha') {
      rowData = [data.category, data.price, data.date, userEmail, new Date()];
    }

    sheet.appendRow(rowData);
    return ContentService
      .createTextOutput(JSON.stringify({ 'status': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error: " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ 'status': 'error', 'message': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const action = e.parameter.action;
  const userEmail = (e.parameter.userEmail || "").trim().toLowerCase();
  
  // Basic security for GET too
  if (userEmail !== AUTHORIZED_EMAIL.toLowerCase()) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Unauthorized access' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getSummary') {
      const doc = getSpreadsheet();
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
  } else if (action === 'getHistory') {
    const doc = getSpreadsheet();
    const history = fetchAllRecords(doc);
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'success',
        'data': history
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("Script is Active").setMimeType(ContentService.MimeType.TEXT);
}

function fetchAllRecords(doc) {
  const records = [];
  const sheets = [
    { name: 'Pasal Kharcha', type: 'Shop' },
    { name: 'Kotha Vada', type: 'Rent' },
    { name: 'College Fee', type: 'College' },
    { name: 'Personal Kharcha', type: 'Personal' }
  ];

  sheets.forEach(s => {
    const sheet = getSheetCaseInsensitive(doc, s.name);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    data.forEach(row => {
      let entry = { type: s.type, timestamp: row[row.length - 1] };
      
      try {
        if (s.type === 'Shop') {
          entry.name = row[0];
          entry.price = row[1];
          entry.date = row[2];
        } else if (s.type === 'Rent') {
          entry.name = 'Room Rent';
          entry.price = row[1];
          entry.date = row[0];
        } else if (s.type === 'College') {
          entry.name = row[1] + ' (Sem ' + row[0] + ')';
          entry.price = row[2];
          entry.date = row[3];
        } else if (s.type === 'Personal') {
          entry.name = row[0];
          entry.price = row[1];
          entry.date = row[2];
        }
        records.push(entry);
      } catch (err) {
        console.error("Error parsing row in " + s.name + ": " + err.toString());
      }
    });
  });

  return records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
}

function calculateTotal(doc) {
  let sum = 0;
  sum += getColumnSum(getSheetCaseInsensitive(doc, 'Pasal Kharcha'), 1);
  sum += getColumnSum(getSheetCaseInsensitive(doc, 'Kotha Vada'), 1);
  sum += getColumnSum(getSheetCaseInsensitive(doc, 'College Fee'), 2);
  sum += getColumnSum(getSheetCaseInsensitive(doc, 'Personal Kharcha'), 1);
  return sum;
}

function getColumnSum(sheet, colIndex) {
  if (!sheet) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
  let s = 0;
  for (let i = 0; i < values.length; i++) {
    const val = parseFloat(values[i][0]);
    if (!isNaN(val)) s += val;
  }
  return s;
}

function calculateMonthly(doc) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let sum = 0;
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Pasal Kharcha'), 2, 1, currentMonth, currentYear);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Kotha Vada'), 0, 1, currentMonth, currentYear);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'College Fee'), 3, 2, currentMonth, currentYear);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Personal Kharcha'), 2, 1, currentMonth, currentYear);
  return sum;
}

function calculateYearly(doc) {
  const currentYear = new Date().getFullYear();
  let sum = 0;
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Pasal Kharcha'), 2, 1, null, currentYear);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Kotha Vada'), 0, 1, null, currentYear);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'College Fee'), 3, 2, null, currentYear);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Personal Kharcha'), 2, 1, null, currentYear);
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

function setup() {
  const doc = getSpreadsheet();
  if (!doc) throw new Error("Spreadsheet not found! Check SPREADSHEET_ID.");
  createSheetIfNotExists(doc, 'Pasal Kharcha', ['Item Name', 'Price', 'Date Time', 'User Email', 'Timestamp']);
  createSheetIfNotExists(doc, 'Kotha Vada', ['Date', 'Price', 'User Email', 'Timestamp']);
  createSheetIfNotExists(doc, 'College Fee', ['Semester', 'Category', 'Price', 'Date', 'User Email', 'Timestamp']);
  createSheetIfNotExists(doc, 'Personal Kharcha', ['Category', 'Price', 'Date', 'User Email', 'Timestamp']);
  console.log("Setup Ready.");
}

function createSheetIfNotExists(doc, name, headers) {
  let sheet = getSheetCaseInsensitive(doc, name);
  if (!sheet) {
    sheet = doc.insertSheet(name);
    sheet.appendRow(headers);
  }
}

