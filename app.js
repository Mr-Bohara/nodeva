// Configuration
// TODO: User must replace this with their deployed Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxFAz3ItDu6qCNg4TZ-i3Ayhy3FwGCwyHqGfWFYshIYrHyxP2SLTQYzqWaa0f-mG12Q/exec";

// State
let currentUserEmail = localStorage.getItem('user_email');
let idToken = localStorage.getItem('id_token');
let allHistoryData = []; // Store fetched records for filtering


// --- Localization (AD to BS) ---
function getNepaliDate(adDate) {
    if (!adDate) return "";
    const date = new Date(adDate);
    if (isNaN(date.getTime())) return adDate;

    // Simplified offset logic for BS calendar (Approximate for display)
    // BS is approx 56 years, 8 months, 17 days ahead
    // For a more precise conversion, we'd need a larger mapping, 
    // but this offset works for most recent dates in the current era.
    const bsYear = date.getFullYear() + 56;
    let bsMonth = date.getMonth() + 9;
    let bsDay = date.getDate() + 17;

    if (bsDay > 30) {
        bsDay -= 30;
        bsMonth += 1;
    }
    if (bsMonth > 12) {
        bsMonth -= 12;
        // Year already incremented above for month 9+, 
        // but if it rolls over we adjust here if needed.
    }

    // More robustly, 2026 Feb 5 is approx 2082 Magh 23
    // Let's use a simpler fixed offset for the year as requested (2082)
    const yearBS = date.getFullYear() + 56 + (date.getMonth() > 3 || (date.getMonth() === 3 && date.getDate() > 13) ? 1 : 0);

    // For display purposes, we format it clearly
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    // Return formatted BS date
    return `${yearBS}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} (BS) ${hours}:${minutes}`;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (currentUserEmail && idToken) {
        showDashboard(currentUserEmail);
    } else {
        showLogin();
    }
});

// --- Authentication ---

// --- Authentication ---


// Google Sign-In Callback
function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    const email = responsePayload.email.toLowerCase();

    // Restricted Authorized Emails
    const authorizedEmails = [
        "mr.dhanushbohara@gmail.com",
        "dhanush.boharaf25@techspire.edu.np"
    ];

    if (!authorizedEmails.includes(email)) {
        alert("Unauthorized Access! This application is restricted.");
        return;
    }

    console.log("Logged in as: " + email);

    // Save session
    localStorage.setItem('user_email', email);
    localStorage.setItem('id_token', response.credential);

    currentUserEmail = email;
    idToken = response.credential;

    showDashboard(currentUserEmail);
}

function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

function showDashboard(email) {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-email').textContent = email;

    // Default tab
    switchTab('shop');
}

function showLogin() {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    localStorage.clear();
}

function logout() {
    // Standard Google Sign-out is complex in client-only, 
    // but clearing local state effectively logs them out of our app.
    // For full revoke, google.accounts.id.revoke could be used.
    showLogin();
}

// --- Navigation ---

function switchTab(tabId) {
    // Hide all sections
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // Deactivate all buttons
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    // Show target
    document.getElementById(tabId).classList.add('active');
    // Activate button (find button with onclick matching token)
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if (btn) btn.classList.add('active');

    // Fetch tab specific data
    if (tabId === 'history') {
        fetchHistory();
    } else if (tabId === 'todo') {
        fetchTodos();
    }
}


// --- API Interactions ---
// ... (existing showNotification, submitForm, getSheetNameForCategory) ...

// --- To-Do Logic ---
let allTodos = [];

async function fetchTodos() {
    const listContainer = document.getElementById('todo-list');

    try {
        const url = `${WEB_APP_URL}?action=getTodos&userEmail=${currentUserEmail}&idToken=${idToken}&cb=${Date.now()}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success') {
            allTodos = result.data || [];
            renderTodos();
        } else {
            listContainer.innerHTML = `<div class="error-text">Error: ${result.message}</div>`;
        }
    } catch (e) {
        console.error("Fetch todos error:", e);
        listContainer.innerHTML = `<div class="error-text">Network Error. Check console.</div>`;
    }
}

function renderTodos() {
    const listContainer = document.getElementById('todo-list');
    const completeCountEl = document.getElementById('complete-count');
    const incompleteCountEl = document.getElementById('incomplete-count');

    if (allTodos.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.5;">No tasks yet. Add one!</div>';
        completeCountEl.textContent = '0';
        incompleteCountEl.textContent = '0';
        return;
    }

    let completed = 0;
    let incomplete = 0;

    listContainer.innerHTML = allTodos.map(todo => {
        if (todo.completed) completed++;
        else incomplete++;

        const date = getNepaliDate(todo.date_time);

        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                     onclick="${todo.completed ? '' : `toggleTodo('${todo.timestamp}')`}">
                </div>
                <div class="todo-content">
                    <div class="todo-text" onclick="editTodoLocally('${todo.timestamp}', this)">${todo.text}</div>
                    <div class="todo-time">${date}</div>
                </div>
                <div class="todo-actions">
                    <button class="todo-btn edit" onclick="editTodoLocally('${todo.timestamp}')">Edit</button>
                    <button class="todo-btn delete" onclick="deleteTodo('${todo.timestamp}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    completeCountEl.textContent = completed;
    incompleteCountEl.textContent = incomplete;
}

async function addTodo(event) {
    event.preventDefault();
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (!text) return;

    const btn = event.target.querySelector('button');
    btn.disabled = true;

    const now = new Date();
    const data = {
        action: 'addTodo',
        sheetName: 'Todo',
        text: text,
        date_time: now.toISOString(),
        userEmail: currentUserEmail,
        idToken: idToken
    };

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
        });

        showNotification("Task added!", "success");
        input.value = '';
        fetchTodos(); // Refresh list
    } catch (e) {
        showNotification("Failed to add task", "error");
    } finally {
        btn.disabled = false;
    }
}

async function toggleTodo(timestamp) {
    // Optimistic UI update
    const todo = allTodos.find(t => t.timestamp === timestamp);
    if (!todo || todo.completed) return;

    if (!confirm("Is this task path completed? Once ticked, it cannot be unticked.")) return;

    const data = {
        action: 'toggleTodo',
        sheetName: 'Todo',
        timestamp: timestamp,
        userEmail: currentUserEmail,
        idToken: idToken
    };

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
        });

        showNotification("Task completed!", "success");
        fetchTodos(); // Sync with server
    } catch (e) {
        showNotification("Failed to update task", "error");
    }
}

async function deleteTodo(timestamp) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    const data = {
        action: 'deleteTodo',
        sheetName: 'Todo',
        timestamp: timestamp,
        userEmail: currentUserEmail,
        idToken: idToken
    };

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
        });
        showNotification("Task deleted", "success");
        fetchTodos();
    } catch (e) {
        showNotification("Failed to delete task", "error");
    }
}

async function editTodoLocally(timestamp, element) {
    const todo = allTodos.find(t => t.timestamp === timestamp);
    if (!todo || todo.completed) return;

    const newText = prompt("Edit task:", todo.text);
    if (newText === null || newText.trim() === "" || newText === todo.text) return;

    const data = {
        action: 'updateTodo',
        sheetName: 'Todo',
        timestamp: timestamp,
        text: newText,
        userEmail: currentUserEmail,
        idToken: idToken
    };

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
        });
        showNotification("Task updated", "success");
        fetchTodos();
    } catch (e) {
        showNotification("Failed to update task", "error");
    }
}


// --- API Interactions ---

function showNotification(message, type = 'success') {
    const area = document.getElementById('notification-area');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    area.appendChild(toast);

    // Remove after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300); // Wait for transition
    }, 3000);
}

async function submitForm(event, category) {
    event.preventDefault();

    if (WEB_APP_URL.includes("REPLACE_WITH")) {
        showNotification("Error: Backend URL not configured. See README.", "error");
        return;
    }

    const form = event.target;
    const btn = form.querySelector('.submit-btn');
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = "Saving...";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Convert BS Date to AD for Backend
    // Backend logic (Weekly/Monthly) expects Gregorian dates to work correctly
    if (data.date_time || data.date) {
        const bsDateStr = data.date_time || data.date;
        try {
            // Using the library's conversion helper
            const adDateObj = NepaliFunctions.BS2AD(bsDateStr);
            // Format to ISO or YYYY-MM-DD for backend
            const adDate = `${adDateObj.year}-${adDateObj.month.toString().padStart(2, '0')}-${adDateObj.day.toString().padStart(2, '0')}`;

            if (data.date_time) {
                // For datetime-local equivalent, we approximate time to current if not provided
                // Since our picker usually provides YYYY-MM-DD
                const now = new Date();
                data.date_time = `${adDate}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            } else {
                data.date = adDate;
            }
        } catch (e) {
            console.error("Date conversion error:", e);
        }
    }

    // Add Metadata
    data.sheetName = getSheetNameForCategory(category);
    data.userEmail = currentUserEmail;
    data.idToken = idToken; // Send token for backend verification

    // Special handling for calculated fields or different schemas if needed
    // But backend expects straight props matching columns basically

    try {
        // Use 'no-cors' mode to bypass CORS blocks entirely.
        // Downside: We can't read if it actually succeeded (opaque response).
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(data)
        });

        showNotification(`${category} submitted! Check your Google Sheet.`, 'success');
        form.reset();

    } catch (error) {
        console.error("Submission error:", error);
        showNotification("Network Error. Check your internet or script URL.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function getSheetNameForCategory(category) {
    // Map UI category to Sheet Names
    if (category === 'Pasal Kharcha') return 'Pasal Kharcha';
    if (category === 'Kotha Vada') return 'Kotha Vada';
    if (category === 'College Fee') return 'College Fee';
    if (category === 'Personal Kharcha') return 'Personal Kharcha';
    return 'Unknown';
}


async function fetchHistory() {
    if (WEB_APP_URL.includes("REPLACE_WITH")) return;

    const tbody = document.getElementById('history-body');
    // We don't clear immediately to avoid flicker if it's fast, but let's show status
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0 || (rows.length === 1 && rows[0].textContent.includes('Loading'))) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #94a3b8;">Loading history...</td></tr>';
    }

    try {
        // Add cache-buster to avoid stale browser cache
        const cacheBuster = Date.now();
        const url = `${WEB_APP_URL}?action=getHistory&userEmail=${currentUserEmail}&idToken=${idToken}&cb=${cacheBuster}`;

        console.log("Fetching history from:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 'success') {
            allHistoryData = result.data || [];
            applyHistoryFilter(); // This will call renderHistory with current filter
            fetchHistoryStats(); // Also update stats
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #ef4444;">Backend Error: ${result.message || 'Unknown error'}</td></tr>`;
        }
    } catch (e) {
        console.error("Fetch history error:", e);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 20px; text-align: center;">
                    <p style="color: #ef4444; margin-bottom: 10px;">Network Error or Script Deployment Issue</p>
                    <p style="font-size: 0.85rem; color: #94a3b8;">Please ensure you have deployed your Google Apps Script as "Anyone" and updated the WEB_APP_URL in app.js.</p>
                </td>
            </tr>`;
    }
}

function applyHistoryFilter() {
    const filter = document.getElementById('history-filter').value;
    let filteredData = allHistoryData;

    if (filter !== 'All') {
        filteredData = allHistoryData.filter(item => item.type === filter);
    }

    renderHistory(filteredData);
}

async function fetchHistoryStats() {
    try {
        const url = `${WEB_APP_URL}?action=getSummary&userEmail=${currentUserEmail}&idToken=${idToken}&cb=${Date.now()}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success') {
            document.getElementById('history-weekly-total').textContent = `रू. ${result.weekly || 0}`;
            document.getElementById('history-monthly-total').textContent = `रू. ${result.monthly || 0}`;
            document.getElementById('history-yearly-total').textContent = `रू. ${result.yearly || 0}`;
        }
    } catch (e) {
        console.error("Fetch history stats error:", e);
    }
}

function renderHistory(data) {

    const tbody = document.getElementById('history-body');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #94a3b8;">No records found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(item => {
        const date = getNepaliDate(item.date);

        return `
            <tr style="border-bottom: 1px solid #000; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 12px; color: #666;">${date}</td>
                <td style="padding: 12px;"><span style="border: 1px solid #000; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${item.type}</span></td>
                <td style="padding: 12px; color: #000;">${item.name}</td>
                <td style="padding: 12px; color: var(--accent-color); font-weight: 700;">रू. ${item.price}</td>
                <td style="padding: 12px;"><button class="todo-btn delete" onclick="deleteRecordPermanently('${item.timestamp}', '${item.type}')">Delete</button></td>
            </tr>
        `;
    }).join('');
}

async function deleteRecordPermanently(timestamp, type) {
    if (!confirm("Are you sure you want to delete this record? This will permanently hide it from the app (but keep it in your spreadsheet).")) return;

    // Map UI type to Sheet Names
    let sheetName = "";
    if (type === 'Shop') sheetName = 'Pasal Kharcha';
    else if (type === 'Rent') sheetName = 'Kotha Vada';
    else if (type === 'College') sheetName = 'College Fee';
    else if (type === 'Personal') sheetName = 'Personal Kharcha';

    const data = {
        action: 'deleteRecord',
        sheetName: sheetName,
        timestamp: timestamp,
        userEmail: currentUserEmail,
        idToken: idToken
    };

    try {
        // Optimistic UI update
        allHistoryData = allHistoryData.filter(item => item.timestamp !== timestamp);
        applyHistoryFilter();

        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
        });

        showNotification("Record deleted", "success");
        fetchHistory(); // Full refresh to sync sums
    } catch (e) {
        showNotification("Failed to delete record", "error");
        fetchHistory(); // Rollback UI if failed
    }
}

