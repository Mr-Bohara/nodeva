// Configuration
// TODO: User must replace this with their deployed Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwTI_R13iDWbn0JtKexk3ZTJxXFqDV-VWWM6l_NdI-Y2-DqJw1bbbRiGW25ogV-FKvP/exec";

// State
let currentUserEmail = localStorage.getItem('user_email');
let idToken = localStorage.getItem('id_token');

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
    fetchSummary();
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

async function fetchSummary() {
    if (WEB_APP_URL.includes("REPLACE_WITH")) return;

    const totalEl = document.getElementById('total-expense');
    const monthlyEl = document.getElementById('monthly-expense');
    const yearlyEl = document.getElementById('yearly-expense');

    totalEl.textContent = "Refreshing...";

    try {
        const url = `${WEB_APP_URL}?action=getSummary&userEmail=${currentUserEmail}&idToken=${idToken}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'success') {
            totalEl.textContent = "Rs. " + data.total;
            monthlyEl.textContent = "Rs. " + data.monthly;
            yearlyEl.textContent = "Rs. " + data.yearly;
        } else {
            totalEl.textContent = "Error";
        }
    } catch (e) {
        console.error(e);
        totalEl.textContent = "N/A";
    }
}
