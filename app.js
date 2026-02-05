// Configuration
// TODO: User must replace this with their deployed Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwTI_R13iDWbn0JtKexk3ZTJxXFqDV-VWWM6l_NdI-Y2-DqJw1bbbRiGW25ogV-FKvP/exec";

// State
let currentUserEmail = localStorage.getItem('user_email');
let idToken = localStorage.getItem('id_token');
let allHistoryData = []; // Store fetched records for filtering


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

// Simple Login Implementation
function handleSimpleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Authorized Email Check (Case-insensitive)
    const authorizedEmail = "mr.dhanushbohara@gmail.com".toLowerCase();

    // Hardcoded credentials for testing
    if (email.toLowerCase() === authorizedEmail && password === 'admin123') {
        console.log("Logged in as: " + email);

        // Save session
        localStorage.setItem('user_email', email.toLowerCase());
        localStorage.setItem('id_token', 'mock_token_' + Date.now());

        currentUserEmail = email.toLowerCase();
        idToken = localStorage.getItem('id_token');

        showDashboard(currentUserEmail);
    } else {
        alert("Unauthorized or Wrong Password!");
    }
}

// Google Sign-In Callback
function handleCredentialResponse(response) {
    // Decode JWT to get user info (simplified decoding)
    const responsePayload = decodeJwtResponse(response.credential);

    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log('Given Name: ' + responsePayload.given_name);
    console.log('Family Name: ' + responsePayload.family_name);
    console.log("Image URL: " + responsePayload.picture);
    console.log("Email: " + responsePayload.email);

    // Save session
    localStorage.setItem('user_email', responsePayload.email);
    localStorage.setItem('id_token', response.credential); // Store ID token for backend verification

    currentUserEmail = responsePayload.email;
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

function renderHistory(data) {

    const tbody = document.getElementById('history-body');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #94a3b8;">No records found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(item => {
        const date = new Date(item.date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <tr style="border-bottom: 1px solid #334155; transition: background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">
                <td style="padding: 12px; color: #cbd5e1;">${date}</td>
                <td style="padding: 12px;"><span style="background: #475569; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${item.type}</span></td>
                <td style="padding: 12px; color: white;">${item.name}</td>
                <td style="padding: 12px; color: #10b981; font-weight: 600;">Rs. ${item.price}</td>
            </tr>
        `;
    }).join('');
}

