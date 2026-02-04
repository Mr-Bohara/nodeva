// CONFIGURATION
// Replace this with the authorized email address
const AUTHORIZED_EMAIL = "mr.dhanushbohara@gmail.com"; 

// YOUR SPECIFIC SPREADSHEET ID
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
        .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const doc = getSpreadsheet();
    const sheetName = data.sheetName;
    const sheet = getSheetCaseInsensitive(doc, sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Sheet not found: ' + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Append Logic based on Sheet
    // Sheet Headers assumed:
    // Pasal Kharcha: item_name, price, date_time, user_email
    // Kotha Vada: date, price, user_email
    // College Fee: semester, category, price, date, user_email
    // Personal Kharcha: category, price, date, user_email
    
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
  
  return ContentService.createTextOutput("Active");
}

function calculateTotal(doc) {
  // Sum of all price columns in relevant sheets
  let sum = 0;
  // Sheet configurations: name -> price column index (0-based)
  // Pasal Kharcha (Price is B -> 1)
  // Kotha Vada (Price is B -> 1)
  // College Fee (Price is C -> 2)
  // Personal Kharcha (Price is B -> 1)
  
  sum += getColumnSum(getSheetCaseInsensitive(doc, 'Pasal Kharcha'), 1);
  sum += getColumnSum(getSheetCaseInsensitive(doc, 'Kotha Vada'), 1);
  sum += getColumnSum(getSheetCaseInsensitive(doc, 'College Fee'), 2);
  sum += getColumnSum(getSheetCaseInsensitive(doc, 'Personal Kharcha'), 1);
  
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
  
  console.log("Setup Ready.");
}

// --- SEEDING FUNCTION (Run this to fill with month's data) ---
function seedDatabase() {
  const doc = getSpreadsheet();
  const email = AUTHORIZED_EMAIL;
  setup(); // Ensure tables are there
  
  const shopSheet = getSheetCaseInsensitive(doc, 'Pasal Kharcha');
  const personalSheet = getSheetCaseInsensitive(doc, 'Personal Kharcha');
  const rentSheet = getSheetCaseInsensitive(doc, 'Kotha Vada');
  const collegeSheet = getSheetCaseInsensitive(doc, 'College Fee');

  // Fill some data
  shopSheet.appendRow(["Rice", 1200, new Date().toISOString(), email, new Date()]);
  personalSheet.appendRow(["Snacks", 150, new Date().toISOString(), email, new Date()]);
  rentSheet.appendRow([new Date().toISOString(), 6000, email, new Date()]);
  collegeSheet.appendRow(["5", "Tuition", 12000, new Date().toISOString(), email, new Date()]);
  
  console.log("Seed Done. Please check your sheet tabs.");
}

function createSheetIfNotExists(doc, name, headers) {
  let sheet = getSheetCaseInsensitive(doc, name);
  if (!sheet) {
    sheet = doc.insertSheet(name);
    sheet.appendRow(headers);
  }
}
