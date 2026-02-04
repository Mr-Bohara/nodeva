<<<<<<< HEAD
# Personal Expense Tracking System Deployment

## 1. Google Sheets & Apps Script Setup
1. Create a new Google Sheet.
2. Go to **Extensions > Apps Script**.
3. Clear `Code.gs` and copy the content from `backend/Code.gs` in this repository.
4. **Important**: Change `const AUTHORIZED_EMAIL = "your-email@gmail.com";` to your actual email.
5. Run the `setup()` function once to create the necessary sheets.
6. Click **Deploy > New Deployment**.
   - **Type**: Web App
   - **Description**: v1
   - **Execute as**: Me (Your Email)
   - **Who has access**: Anyone
7. Copy the **Web App URL**.

## 2. Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Go to **APIs & Services > OAuth consent screen**.
   - User Type: External.
   - Fill in app name and email.
4. Go to **Credentials > Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized JavaScript origins**:
     - `http://localhost:5500` (for testing)
     - `https://yourusername.github.io` (your GitHub Pages URL)
5. Copy the **Client ID**.

## 3. Frontend Configuration
1. Open `app.js`.
2. Replace `const WEB_APP_URL` with your **Web App URL** from Step 1.
3. Open `index.html`.
4. Replace `data-client_id="YOUR_GOOGLE_CLIENT_ID"` with your **Client ID** from Step 2.

## 4. Deploy to GitHub Pages
1. Push this code to a GitHub repository.
2. Go to Settings > Pages.
3. Select `main` branch and save.
4. Visit your site!
=======
# nodeva
>>>>>>> f7c2ee69746b0e0943d6bce74e69893b6558df2f
