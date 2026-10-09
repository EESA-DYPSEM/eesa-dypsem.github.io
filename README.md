# EESA Association — v4.1

The official web platform and member portal for the Electrical Engineering Students Association (EESA) at D. Y. Patil School of Engineering & Management (DYPSEM), Kolhapur.

---

## Architecture

- **Public Site**: Hosted from `public/` via Firebase Hosting (`cleanUrls` enabled).
- **Backend**: Google Firebase (Authentication & Cloud Firestore).
- **Zero-Build Stack**: Native ES Modules directly importing modern Firebase Web SDK (v10.8.0).
- **RBAC**: Multi-tier permission model (Super Admin, Admin, Committee Positions, Students).

---

## Firebase Deployment

Deploy from this project directory. On Windows (PowerShell), use `firebase.cmd` or `npx firebase` to bypass script execution policy blocks:

```powershell
firebase.cmd deploy --only hosting,firestore:rules
# or alternatively:
npx firebase deploy --only hosting,firestore:rules
```

> **Note**: Do not delete the `v1/` folder (preserved for historical rollback/reference).

---

## Recent Version Milestones

### v4.1 Recommendations & Enhancements
- **Complete Student Submission Review Workflow**:
  - Control Room now features an interactive modal for reviewing submitted student Micro/Mega projects.
  - Review dialog exposes all student details, technical blueprint, outcomes, and project links.
  - One-click actions to **Approve & Publish** (creates a live project in the public showcase), **Approve as Draft**, or **Reject** with automated status tracking.
  - Status badges (`Pending`, `Approved`, `Rejected`) added to the admin submissions list.
- **Root Directory Alignment**:
  - Replaced stale root `index.html` with an automatic client-side redirect to `./public/index.html` to avoid local dev server discrepancies.
  - Archived previous root index to `index.html.bak`.
- **Cache-Busting Standardization**:
  - Standardized version strings to `?v=4.1` across all stylesheets and module scripts in `public/index.html`, `public/portal.html`, and `public/admin.html`.
- **Asset Directory Standardization**:
  - Standardized favicon and icon structure under `public/assets/icons/eesa-icon.ico`.
  - Updated `manifest.webmanifest` with clean icon paths.
- **PowerShell Deployment Guidance**:
  - Documented Windows PowerShell `firebase.cmd` command usage.

### v3.8 fixes
- Hardened login for Chrome Incognito/private browsing by preventing auth-persistence initialization from hanging indefinitely.
- Added a visible connection/authentication status while signing in and a 10-second timeout with an actionable error.
- Fixed `@username` login detection so the leading `@` is treated as a username, not an email address.
- Refined the student portal greeting to use the first name and show `@username` + access level underneath.

### v3.7 changes & fixes
- Usernames added to student accounts with `@username` or email sign-in.
- Reworked the admin content modal into a fixed-height, internally scrolling layout with sticky headers and footers.
- Added sanitized `publicCommittee/current` and `publicStats/current` documents so guests can see the development team and member count without reading private student records or committee permissions.
- Admin committee loading/saving now synchronizes those public documents automatically.

### v3.5 & v3.2 milestones
- Added Mega/Micro Project Hub with student project submissions.
- Added project scale, category, tagline, mentor, technical details, outcomes, applications, budget, duration and project links.
- Proper student registration: name, PRN/student ID, college email, mobile, department, semester/year, division, password confirmation.
- Committee position assignment with granular permissions.
