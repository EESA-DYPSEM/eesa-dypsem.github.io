# EESA v4.1 — Release Notes & Checklist

## Recommendations Implemented

1. **Submission Review Workflow**:
   - Integrated full review modal in Control Room (`public/admin.html`, `public/js/admin.js`).
   - Admins can inspect submitted project technical specs, team builders, and links.
   - One-click **Approve & Publish**, **Approve as Draft**, or **Reject**.
   - Added visual status pills (`Pending`, `Approved`, `Rejected`) to submissions list and modal.
   - Enforced `manage_projects` permission on approval/rejection actions.

2. **Root Directory Alignment**:
   - Replaced legacy root `index.html` with an automatic client-side redirect to `./public/index.html`.
   - Backed up legacy root file to `index.html.bak`.

3. **Cache-Busting Query Standard**:
   - Harmonized script and stylesheet query strings across `public/index.html`, `public/portal.html`, and `public/admin.html` to `?v=4.1`.

4. **Asset Directory Clean-up**:
   - Consolidated favicon and icon assets under `public/assets/icons/eesa-icon.ico`.
   - Removed folder with spaces and special characters (`icon or ico/`).
   - Updated `public/manifest.webmanifest`.

5. **Deployment Guide**:
   - Documented Windows PowerShell execution policy command `firebase.cmd deploy --only hosting,firestore:rules`.

---

## Deployment Checklist

1. **Verification**:
   - Test member sign-in using email and `@username` in normal and incognito windows.
   - Submit a test student project from `public/portal.html`.
   - Open `public/admin.html` with a committee/admin account, click **Review** on the submission, and click **Approve & Publish**.
   - Verify the approved project appears in `public/index.html` under the Projects showcase.

2. **Deploy to Firebase**:
   ```powershell
   firebase.cmd deploy --only hosting,firestore:rules
   ```
