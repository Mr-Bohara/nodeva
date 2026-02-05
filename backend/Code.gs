const AUTHORIZED_EMAILS = [
  "mr.dhanushbohara@gmail.com",
  "dhanush.boharaf25@techspire.edu.np"
];

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
    // SECURITY CHECK (Case-insensitive)
    if (!AUTHORIZED_EMAILS.includes(userEmail)) {
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

    const action = data.action;
    const sheetName = data.sheetName || "Todo";
    const sheet = getSheetCaseInsensitive(doc, sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Sheet not found: ' + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteRecord') {
      const timestamp = data.timestamp;
      const values = sheet.getDataRange().getValues();
      const statusCol = sheet.getLastColumn(); // Last column is Status
      
      // Update in specific sheet
      for (let i = 1; i < values.length; i++) {
        if (values[i][values[i].length - 2].toString() === timestamp.toString()) { // Timestamp is 2nd to last now
          sheet.getRange(i + 1, statusCol).setValue('Deleted');
          
          // Also update in History sheet
          const historySheet = getSheetCaseInsensitive(doc, 'History');
          if (historySheet) {
            const hValues = historySheet.getDataRange().getValues();
            const hStatusCol = historySheet.getLastColumn();
            for (let j = 1; j < hValues.length; j++) {
              if (hValues[j][hValues[j].length - 2].toString() === timestamp.toString()) {
                historySheet.getRange(j + 1, hStatusCol).setValue('Deleted');
                break;
              }
            }
          }
          return ContentService.createTextOutput(JSON.stringify({ 'status': 'success' })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Record not found' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'toggleTodo') {
      const timestamp = data.timestamp;
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (values[i][values[i].length - 2].toString() === timestamp.toString()) {
          sheet.getRange(i + 1, 3).setValue(true); // Assuming Status is Col 3
          return ContentService.createTextOutput(JSON.stringify({ 'status': 'success' })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Todo not found' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteTodo') {
      const timestamp = data.timestamp;
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (values[i][values[i].length - 2].toString() === timestamp.toString()) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ 'status': 'success' })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Todo not found' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'updateTodo') {
      const timestamp = data.timestamp;
      const newText = data.text;
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (values[i][values[i].length - 2].toString() === timestamp.toString()) {
          sheet.getRange(i + 1, 1).setValue(newText);
          return ContentService.createTextOutput(JSON.stringify({ 'status': 'success' })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Todo not found' })).setMimeType(ContentService.MimeType.JSON);
    }

    let rowData = [];
    const lowerName = sheetName.toLowerCase();

    // Use a unique string timestamp for all new rows to ensure reliable matching
    const rowTimestamp = Date.now().toString();

    if (lowerName === 'pasal kharcha' || data.action === 'addExpense') {
      rowData = [data.item_name, data.price, data.date_time, userEmail, rowTimestamp, 'Active'];
    } else if (lowerName === 'kotha vada') {
      rowData = [data.date, data.price, userEmail, rowTimestamp, 'Active'];
    } else if (lowerName === 'college fee') {
      rowData = [data.semester, data.category, data.price, data.date, userEmail, rowTimestamp, 'Active'];
    } else if (lowerName === 'personal kharcha') {
      rowData = [data.category, data.price, data.date, userEmail, rowTimestamp, 'Active'];
    } else if (lowerName === 'todo' || action === 'addTodo') {
      rowData = [data.text, data.date_time, false, userEmail, rowTimestamp, 'Active'];
    }

    if (rowData.length > 0) {
      sheet.appendRow(rowData);
    }

    // --- ALSO ADD TO HISTORY SHEET (Only for kharcha) ---
    if (lowerName !== 'todo' && action !== 'addTodo') {
      const historySheet = getSheetCaseInsensitive(doc, 'History');
      if (historySheet) {
        let historyRow = [];
        if (lowerName === 'pasal kharcha') {
          historyRow = [data.date_time, 'Shop', data.item_name, data.price, userEmail, rowTimestamp, 'Active'];
        } else if (lowerName === 'kotha vada') {
          historyRow = [data.date, 'Rent', 'Room Rent', data.price, userEmail, rowTimestamp, 'Active'];
        } else if (lowerName === 'college fee') {
          historyRow = [data.date, 'College', data.category + ' (Sem ' + data.semester + ')', data.price, userEmail, rowTimestamp, 'Active'];
        } else if (lowerName === 'personal kharcha') {
          historyRow = [data.date, 'Personal', data.category, data.price, userEmail, rowTimestamp, 'Active'];
        }
        if (historyRow.length > 0) {
          historySheet.appendRow(historyRow);
        }
      }
    }

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
  if (!AUTHORIZED_EMAILS.includes(userEmail)) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Unauthorized access' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getSummary') {
    const doc = getSpreadsheet();
    const total = calculateTotal(doc);
    const weekly = calculateWeekly(doc);
    const monthly = calculateMonthly(doc);
    const yearly = calculateYearly(doc);

    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'success',
        'total': total,
        'weekly': weekly,
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
  } else if (action === 'getTodos') {
    const doc = getSpreadsheet();
    const todos = fetchTodos(doc, userEmail);
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'success',
        'data': todos
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput("Script is Active").setMimeType(ContentService.MimeType.TEXT);
}

function fetchTodos(doc, userEmail) {
  const sheet = getSheetCaseInsensitive(doc, 'Todo');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues(); // Get all 6 columns
  return data
    .filter(row => row[3].toString().toLowerCase() === userEmail.toLowerCase() && row[5] !== 'Deleted')
    .map(row => ({
      text: row[0],
      date_time: row[1],
      completed: row[2] === true || row[2] === 'TRUE',
      timestamp: row[4]
    }));
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
      if (row[row.length - 1] === 'Deleted') return; // Filter soft-deleted

      let entry = { type: s.type, timestamp: row[row.length - 2] }; // Timestamp is 2nd to last
      
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
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  let s = 0;
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (row[row.length - 1] === 'Deleted') continue; // Skip deleted
    const val = parseFloat(row[colIndex]);
    if (!isNaN(val)) s += val;
  }
  return s;
}

function calculateWeekly(doc) {
  const now = new Date();
  const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
  firstDay.setHours(0,0,0,0);
  
  let sum = 0;
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Pasal Kharcha'), 2, 1, 'weekly', firstDay);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Kotha Vada'), 0, 1, 'weekly', firstDay);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'College Fee'), 3, 2, 'weekly', firstDay);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Personal Kharcha'), 2, 1, 'weekly', firstDay);
  return sum;
}

function calculateMonthly(doc) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let sum = 0;
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Pasal Kharcha'), 2, 1, 'monthly', {month: currentMonth, year: currentYear});
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Kotha Vada'), 0, 1, 'monthly', {month: currentMonth, year: currentYear});
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'College Fee'), 3, 2, 'monthly', {month: currentMonth, year: currentYear});
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Personal Kharcha'), 2, 1, 'monthly', {month: currentMonth, year: currentYear});
  return sum;
}

function calculateYearly(doc) {
  const currentYear = new Date().getFullYear();
  let sum = 0;
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Pasal Kharcha'), 2, 1, 'yearly', currentYear);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Kotha Vada'), 0, 1, 'yearly', currentYear);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'College Fee'), 3, 2, 'yearly', currentYear);
  sum += getSumForPeriod(getSheetCaseInsensitive(doc, 'Personal Kharcha'), 2, 1, 'yearly', currentYear);
  return sum;
}

function getSumForPeriod(sheet, dateColIndex, priceColIndex, type, target) {
  if (!sheet) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  let s = 0;
  for (let i = 0; i < range.length; i++) {
    const row = range[i];
    if (row[row.length - 1] === 'Deleted') continue; // Skip deleted
    
    const dateStr = row[dateColIndex];
    const price = parseFloat(row[priceColIndex]);
    if (isNaN(price)) continue;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;

    if (type === 'weekly') {
      if (d >= target) s += price;
    } else if (type === 'monthly') {
      if (d.getMonth() === target.month && d.getFullYear() === target.year) s += price;
    } else if (type === 'yearly') {
      if (d.getFullYear() === target) s += price;
    }
  }
  return s;
}

function setup() {
  const doc = getSpreadsheet();
  if (!doc) throw new Error("Spreadsheet not found! Check SPREADSHEET_ID.");
  createSheetIfNotExists(doc, 'Pasal Kharcha', ['Item Name', 'Price', 'Date Time', 'User Email', 'Timestamp', 'Status']);
  createSheetIfNotExists(doc, 'Kotha Vada', ['Date', 'Price', 'User Email', 'Timestamp', 'Status']);
  createSheetIfNotExists(doc, 'College Fee', ['Semester', 'Category', 'Price', 'Date', 'User Email', 'Timestamp', 'Status']);
  createSheetIfNotExists(doc, 'Personal Kharcha', ['Category', 'Price', 'Date', 'User Email', 'Timestamp', 'Status']);
  createSheetIfNotExists(doc, 'History', ['Date', 'Type', 'Item/Category', 'Price', 'User Email', 'Timestamp', 'Status']);
  createSheetIfNotExists(doc, 'Todo', ['Task', 'Date Time', 'Completed', 'User Email', 'Timestamp', 'Status']);
  console.log("Setup Ready.");
}

function createSheetIfNotExists(doc, name, headers) {
  let sheet = getSheetCaseInsensitive(doc, name);
  if (!sheet) {
    sheet = doc.insertSheet(name);
    sheet.appendRow(headers);
  }
}

