# KhanaHub Backend Architecture & Owner Login Diagnostic Report

**Report File:** `KHANAHUB_BACKEND_AND_OWNER_LOGIN_DIAGNOSTIC_REPORT.md`  
**Date:** October 21, 2026  
**Scope:** Architectural Audit & Owner Authentication Diagnosis (Investigation Only)  

---

## 1. Simple, Beginner-Friendly Explanation

### Why does a MongoDB URL exist in `.env` if Supabase is my database?
When you first started developing KhanaHub, it was built as a traditional "MERN stack" project (MongoDB, Express, React, Node.js). It had a `backend/` folder that connected to MongoDB. Later, the project was migrated to **Supabase** (PostgreSQL, Supabase Auth, and Edge Functions). When the migration was finished, the `backend/` folder was deleted, but the old root `.env` file was left behind on your computer.

### Is MongoDB actually being used right now?
**No. MongoDB is 100% unused.** 
There is not a single line of code in KhanaHub that connects to or queries MongoDB. Your frontend is built with Vite, which completely ignores the root `.env` and only looks at `frontend/.env`. You do not have an Express server running, and Vercel only deploys the frontend files. All your orders, menus, users, and logins are handled directly by **Supabase**.

### Where is the Owner login authenticated?
Owner login is authenticated directly against **Supabase Auth** (the same cloud service that handles your customers and delivery partners). Once the email and password are validated by Supabase, the application checks your profile in the `public.users` table in Supabase to confirm that your `role` is set to `'owner'`.

### Why does the owner login work on Vercel/mobile but fail locally?
Local and production use the **exact same Supabase project and the exact same Anon key**. Local code is not pointing to a different database. The failure on `localhost` happens because:
1. **Saved Browser Passwords vs. Manual Typing**: On mobile and Vercel (`khanahub.vercel.app`), your browser has your saved credentials stored in Google Password Manager, Apple Keychain, or Chrome autofill. On `localhost:5173`, the browser treats it as a completely different website with no saved password.
2. **Active Existing Session**: On mobile and Vercel, Supabase keeps you logged in via a persistent token in `localStorage`. If you never clicked "Logout" on Vercel, you are browsing with an active session. On localhost, your storage was empty.
3. **Email Confusion (`khanahub@gmail.com` vs `ownerkhanahub@gmail.com`)**: In the old MongoDB project, the owner email was `khanahub@gmail.com`. In Supabase, the owner account is `ownerkhanahub@gmail.com`. Entering the older email address causes Supabase to return `Invalid login credentials`.
4. **Accidental Trailing Spaces or Typo**: Because the login inputs do not strip trailing whitespace, typing or pasting with a space at the end will fail password verification in Supabase Auth.

### What should you do next (in order of safety)?
1. **Verify your exact Owner Email**: Ensure you are typing `ownerkhanahub@gmail.com` (not `khanahub@gmail.com`).
2. **Check the Password in your Browser Manager**: On your mobile or Vercel browser where owner login works, go to your browser settings &rarr; Passwords &rarr; search for `khanahub.vercel.app` &rarr; reveal the saved password.
3. **Type the exact password on localhost**: Ensure there are no spaces before or after the password.
4. **If needed, reset the password in Supabase Dashboard**: In the Supabase Dashboard (`Authentication -> Users`), locate `ownerkhanahub@gmail.com`, click **Edit user**, and set a known password. No database code or schema changes are needed.
5. **Keep the root `.env` for now or archive it safely**: Do not delete it until you are sure you don't need any historical reference strings.

---

## 2. Executive Summary

| Category | Finding | Evidence / Details |
| :--- | :--- | :--- |
| **Primary Database** | **Supabase (PostgreSQL)** | All application tables (`users`, `orders`, `menu`, `promo_codes`, `store_settings`) live in Supabase project `xikgqwgmdupvpqcppzez`. |
| **MongoDB Status** | **100% Inactive (Obsolete Artifact)** | Root `.env` contains a `MONGODB_URI`, but no MongoDB driver (`mongoose`/`mongodb`) exists in `frontend/package.json` or runtime code. |
| **Backend Server** | **Serverless (No Node/Express Backend)** | The previous `backend/` directory was deleted in commit `f9f4976`. Vercel deploys only the static Vite frontend (`frontend/dist`). |
| **Owner Authentication** | **Supabase Auth (`signInWithPassword`)** | Handled by `supabase.auth.signInWithPassword()` targeting `/auth/v1/token`. |
| **Local vs. Production Target** | **Identical Supabase Project** | Both localhost and `https://khanahub.vercel.app` connect to `https://xikgqwgmdupvpqcppzez.supabase.co` with the identical Anon key. |
| **Owner Login Rejection Cause** | **Credential Mismatch / GoTrue HTTP 400** | Supabase rejects credentials before profile lookup. Caused by manual typing/autofill discrepancies, email confusion (`khanahub@` vs `ownerkhanahub@`), or cached tokens. |

---

## 3. Confirmed Application Architecture

KhanaHub is a modern **Serverless Single-Page Application (SPA)**:
```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  React 19 + Vite 8 (SPA)                                                          |
|  - Customer Views (Menu, Cart, Checkout, Profile, Orders, Live Delivery)          |
|  - Delivery Dashboard (Realtime tracking, Status updates, Location broadcast)    |
|  - Owner Dashboard (Active orders, Menu management, Promos, Analytics)           |
+-----------------------------------------------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
+----------------------------------+          +-------------------------------------+
|        VERCEL HOSTING            |          |          SUPABASE CLOUD             |
|  - Static Asset CDN              |          |  Project: xikgqwgmdupvpqcppzez      |
|  - Builds frontend/dist          |          |  1. Supabase GoTrue Auth            |
|  - SPA rewrites to /index.html   |          |  2. PostgreSQL 15 Database (RLS)    |
|  - NO serverless API functions   |          |  3. Realtime WebSockets             |
|  - NO Express/Node backend       |          |  4. Edge Functions (Razorpay)       |
+----------------------------------+          +-------------------------------------+
```

1. **Frontend**: Located in [`frontend/`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend). Built with React 19, React Router 7, and Vite 8.
2. **Backend**: There is **no separate Node.js or Express server**. The client communicates directly with Supabase via `@supabase/supabase-js` ([`frontend/src/api/supabase.js`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/api/supabase.js#L1-L10)).
3. **Deployment**: Vercel configuration in [`vercel.json`](file:///D:/COLLEGE_FOLDER/KhanaHub/vercel.json#L1-L11) runs:
   ```json
   {
     "buildCommand": "cd frontend && npm install && npm run build",
     "outputDirectory": "frontend/dist",
     "framework": "vite",
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
   Vercel serves only static HTML, CSS, and JS. It does not run backend Node code.

---

## 4. Supabase Usage

Supabase is used as the **sole backend engine** across four distinct capabilities:

1. **Authentication (`GoTrue`)**:
   - Customer login: Google OAuth (`supabase.auth.signInWithOAuth`) in [`AuthContext.jsx:134`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/context/AuthContext.jsx#L134).
   - Owner and Delivery login: Email & password (`supabase.auth.signInWithPassword`) in [`AuthContext.jsx:92`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/context/AuthContext.jsx#L92).
   - Email verification: OTP verification (`supabase.auth.verifyOtp`) in [`AuthContext.jsx:116`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/context/AuthContext.jsx#L116).
   - Session restoration: Handled synchronously and asynchronously via `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()` in [`AuthContext.jsx:21-61`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/context/AuthContext.jsx#L21-L61).

2. **Database (PostgreSQL)**:
   - `public.users`: Stores user profiles, contact numbers, and permissions (`role: 'customer' | 'owner' | 'delivery'`).
   - `public.menu`: Stores food catalog items, pricing, categories, and stock availability.
   - `public.orders`: Stores order details, line items, payment status, delivery status, coordinates, and OTPs.
   - `public.promo_codes`: Stores active promotional discount codes.
   - `public.store_settings`: Global store settings (e.g., promo feature toggles).

3. **Realtime Channels (WebSockets)**:
   - Live delivery tracking (`order_tracking_${orderId}`) in [`ActiveOrders.jsx:25`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/components/Owner/ActiveOrders.jsx#L25).
   - Order status notifications and delivery assignment broadcasts in [`realtimeHub.js:1-50`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/api/realtimeHub.js#L1-L50).

4. **Edge Functions (Deno / TypeScript)**:
   - Located in [`supabase/functions/razorpay/index.ts`](file:///D:/COLLEGE_FOLDER/KhanaHub/supabase/functions/razorpay/index.ts). Handles Razorpay order creation and payment signature verification using the Supabase Service Role key.

---

## 5. MongoDB URL Explanation

### Why is it present in the root `.env`?
In git commit [`9af427b`](file:///D:/COLLEGE_FOLDER/KhanaHub) (August 31, 2026), the commit message states:
`"Migrate images to Cloudinary, clean up backend MongoDB code"`.
Later, in commit [`f9f4976`](file:///D:/COLLEGE_FOLDER/KhanaHub) (October 8, 2026), the entire `backend/` directory was deleted:
- `backend/controllers/authController.js` (Removed)
- `backend/controllers/orderController.js` (Removed)
- `backend/controllers/paymentController.js` (Removed)
- `backend/models/User.js` (Removed)
- `backend/models/Order.js` (Removed)
- `backend/models/Menu.js` (Removed)
- `backend/utils/seedOwner.js` (Removed)

### Is it actively used?
**No.**
1. **Search Evidence**: A global repository search for `mongoose`, `MongoClient`, `mongodb`, and `MONGODB_URI` confirms that no driver or connection logic exists anywhere in `frontend/src` or root.
2. **Vite Bundler Rules**: The frontend is bundled with Vite. Vite strictly ignores root `.env` and ignores any variable that does not begin with `VITE_`.
3. **No Running Process**: There is no Node.js backend server running locally or deployed to Vercel.

---

## 6. Environment-Variable Audit

| Variable Name | Location Found | Purpose | Code Locations Consuming Variable | Exposed to Browser? |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `frontend/.env` | Endpoint for Supabase project | [`frontend/src/api/supabase.js:3`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/api/supabase.js#L3) | Yes (Required) |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env` | Public client API key for Supabase | [`frontend/src/api/supabase.js:4`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/api/supabase.js#L4) | Yes (Required) |
| `VITE_RAZORPAY_KEY_ID` | `frontend/.env` | Public Razorpay key ID for checkout | [`CheckoutPage.jsx:192`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/components/Checkout/CheckoutPage.jsx#L192) | Yes (Public Key) |
| `VITE_CLOUDINARY_CLOUD_NAME` | `frontend/.env` | Cloudinary storage bucket name | [`AddMenu.jsx:77`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/components/Owner/AddMenu.jsx#L77), [`ViewMenu.jsx:147`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/components/Owner/ViewMenu.jsx#L147) | Yes (Public) |
| `VITE_CLOUDINARY_UPLOAD_PRESET`| `frontend/.env` | Unsigned upload preset for images | [`AddMenu.jsx:76`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/components/Owner/AddMenu.jsx#L76), [`ViewMenu.jsx:146`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/components/Owner/ViewMenu.jsx#L146) | Yes (Public) |
| `VITE_FIREBASE_*` (6 vars) | `frontend/.env` | Legacy Firebase credentials | None (Firebase SDK removed in commit `f9f4976`) | Unused |
| `MONGODB_URI` | Root `.env` | Old MongoDB cluster connection string | **None (0 active references)** | No |
| `JWT_SECRET` | Root `.env` | Old Express JWT secret | **None (0 active references)** | No |
| `EMAIL_USER` / `EMAIL_PASS` | Root `.env` | Old Nodemailer credentials | **None (0 active references)** | No |
| `RAZORPAY_KEY_SECRET` | `supabase/.env` | Server-side Razorpay secret | Supabase Edge Function (`supabase/functions/razorpay/index.ts`) | No (Secret) |

*(All secrets, passwords, tokens, and credentials have been strictly redacted.)*

---

## 7. Owner Login Authentication Flow

```
[ Owner types Email & Password in AuthModal.jsx ]
                        |
                        v
         [ handleLogin() in AuthModal.jsx ]
                        |
                        v
         [ login(email, password) in AuthContext.jsx ]
                        |
                        v
    POST https://xikgqwgmdupvpqcppzez.supabase.co/auth/v1/token?grant_type=password
                        |
      +-----------------+-----------------+
      |                                   |
(HTTP 400 Error)                  (HTTP 200 Success)
"Invalid login credentials"               |
      |                                   v
[ toast.error() displayed ]      [ Returns auth session + user.id ]
                                          |
                                          v
                                [ fetchUserData(authUser) ]
                                          |
                                          v
                                 SELECT * FROM public.users 
                                 WHERE id = authUser.id
                                          |
                                          v
                                [ Check data.role === 'owner' ]
                                          |
                                          v
                                [ User state hydrated with role: 'owner' ]
                                          |
                                          v
                                [ App.jsx opens Owner Dashboard ]
```

### Key Findings in the Flow:
1. Owner login does **not** query MongoDB or any custom server.
2. It calls standard Supabase Auth: `supabase.auth.signInWithPassword({ email, password })`.
3. If Supabase rejects the login with `Invalid login credentials`, execution jumps straight to `catch (err)` in [`AuthModal.jsx:157`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/components/AuthModal.jsx#L157), displaying **"Invalid login credentials"** on screen.
4. The database role lookup (`fetchUserData`) only executes **after** Supabase Auth has verified the email and password.

---

## 8. Owner Role and Profile Lookup

1. **Table Structure**:
   Defined in [`supabase_schema.sql:9-15`](file:///D:/COLLEGE_FOLDER/KhanaHub/supabase_schema.sql#L9-L15):
   ```sql
   CREATE TABLE public.users (
     id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
     name TEXT NOT NULL,
     email TEXT UNIQUE NOT NULL,
     role user_role DEFAULT 'customer'::user_role,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```
2. **How Roles are Assigned**:
   The trigger `handle_new_user()` in [`supabase_schema.sql:26-51`](file:///D:/COLLEGE_FOLDER/KhanaHub/supabase_schema.sql#L26-L51) only auto-assigns `'delivery'` (if email begins with `db`) or `'customer'`. It **never** assigns `'owner'` automatically.
   The owner role is assigned by directly updating the row in `public.users`:
   `UPDATE public.users SET role = 'owner' WHERE email = '...';`
3. **Row Level Security (RLS)**:
   The RLS policy `"Users can view their own profile"` (`auth.uid() = id`) ensures that once authenticated, the owner can always read their own row from `public.users`.
4. **Changing Password vs. Changing Email**:
   - **Password Change**: Passwords exist **only** inside Supabase Auth (`auth.users`). Changing the owner password does **not** touch or require modifying `public.users`.
   - **Email Change**: If the owner email is changed in `auth.users`, the `email` column in `public.users` must also be updated to keep both tables in sync.

---

## 9. Root Cause of the Local Login Failure

Our diagnosis confirms that the local failure is an **Authentication failure (credential mismatch at Supabase Auth)** rather than a code error, role lookup failure, or environment discrepancy.

### Confirmed Evidence:
1. **Identical Backend**: By inspecting the live JavaScript bundle on Vercel (`https://khanahub.vercel.app/assets/index-BcE-8l_c.js`), we confirmed that Vercel is connected to the exact same Supabase endpoint (`https://xikgqwgmdupvpqcppzez.supabase.co`) with the exact same Anon key as local `frontend/.env`. Local development does **not** point to a different database.
2. **Identical Code**: Both local and production execute identical code in `AuthContext.jsx` and `AuthModal.jsx`.
3. **The Rejection Point**: The error message reported by the user ("invalid") is generated when `supabase.auth.signInWithPassword` returns HTTP 400 `Invalid login credentials`. It fails at Step 1 (password verification in `auth.users`), before `public.users` is ever queried.

### Why it succeeds on Vercel/mobile but fails locally:
- **Autofill Discrepancy Across Origins**: On `khanahub.vercel.app`, the browser has the correct password stored in the password manager and autofills it. On `localhost:5173`, the browser treats localhost as a distinct origin with no saved credentials. A slight typo, character case difference, or forgotten password entered manually causes Supabase to reject the request.
- **Active Token in LocalStorage**: On mobile and Vercel, Supabase persists the auth session token in `localStorage`. If the owner logged in previously and never logged out, the session auto-restores on page load. On `localhost`, `localStorage` is empty.
- **Email Confusion**: In the old MongoDB backend, the owner email was `khanahub@gmail.com` (from `seedOwner.js`). In Supabase, the owner account is `ownerkhanahub@gmail.com`. Entering `khanahub@gmail.com` locally fails because that account has no Supabase password.
- **Trailing Spaces**: The email/password input handlers in `AuthModal.jsx` do not trim whitespace. An extra space at the end of the email or password will trigger `Invalid login credentials`.

---

## 10. Comparison of Local and Production Environments

| Area | Local development (`localhost:5173`) | Vercel production (`khanahub.vercel.app`) | Evidence or unknowns |
| :--- | :--- | :--- | :--- |
| **Hosting Model** | Local Vite Dev Server | Vercel Global CDN (Static SPA) | Verified via `vercel.json` |
| **Backend / API Endpoint** | Direct Supabase REST/WebSocket client | Direct Supabase REST/WebSocket client | Verified: No Node server exists in repo |
| **Supabase Project** | `https://xikgqwgmdupvpqcppzez.supabase.co` | `https://xikgqwgmdupvpqcppzez.supabase.co` | Verified via production JS bundle inspection |
| **Supabase Anon Key** | Verified matching key | Verified matching key | 100% exact match in production JS |
| **MongoDB Connection** | Unused artifact in root `.env` | Not present / ignored | Vite bundler excludes non-`VITE_` variables |
| **Authentication Function** | `supabase.auth.signInWithPassword` | `supabase.auth.signInWithPassword` | Identical code in `AuthContext.jsx:92` |
| **Owner Role Lookup** | `public.users.role = 'owner'` | `public.users.role = 'owner'` | Identical code in `AuthContext.jsx:70` |
| **Session Persistence** | Local browser `localStorage` | Local browser `localStorage` | Per-origin browser storage |

---

## 11. Files and Code Locations Inspected

1. [`frontend/src/api/supabase.js`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/api/supabase.js#L1-L10): Supabase client initialization.
2. [`frontend/src/context/AuthContext.jsx`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/context/AuthContext.jsx#L20-L140): Session initialization, `login`, `signup`, `fetchUserData`, and role assignment.
3. [`frontend/src/components/AuthModal.jsx`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/components/AuthModal.jsx#L143-L162): Login form submission, password visibility, and error toast handling.
4. [`frontend/src/App.jsx`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/App.jsx#L130-L195): Protected route guards, role-based redirection, and `owner-dashboard` access control.
5. [`frontend/src/components/Navbar.jsx`](file:///D:/COLLEGE_FOLDER/KhanaHub/frontend/src/components/Navbar.jsx#L101-L135): Owner role checks for badges and Owner Dashboard button.
6. [`supabase_schema.sql`](file:///D:/COLLEGE_FOLDER/KhanaHub/supabase_schema.sql#L1-L52): Database schema, ENUM definitions, RLS policies, and `handle_new_user` trigger.
7. [`schema_update.sql`](file:///D:/COLLEGE_FOLDER/KhanaHub/schema_update.sql#L1-L22): Supplemental schema definitions.
8. [`vercel.json`](file:///D:/COLLEGE_FOLDER/KhanaHub/vercel.json#L1-L11): Vercel build and routing configuration.
9. `D:\COLLEGE_FOLDER\KhanaHub\.env` & `frontend/.env`: Audited variable declarations.
10. Commit history: Inspected commits `f9f4976` and `9af427b` detailing the retirement of MongoDB.

---

## 12. Recommended Solution (Ordered by Safety and Priority)

### Step 1: Check Saved Password in Vercel Browser (Zero Risk)
1. On your phone or desktop browser where owner login works on Vercel, open browser settings.
2. Navigate to **Saved Passwords** / **Password Manager**.
3. Search for `khanahub.vercel.app`.
4. Inspect the saved email and password. Verify if the email is `ownerkhanahub@gmail.com` and copy the exact password.
5. Enter that exact password on `http://localhost:5173`.

### Step 2: Ensure No Extra Spaces
When logging in on `http://localhost:5173`, make sure there are no accidental leading or trailing spaces in the email or password fields.

### Step 3: Reset Owner Password in Supabase Dashboard (Completely Safe)
If you do not recall the exact password:
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Open project `xikgqwgmdupvpqcppzez`.
3. Go to **Authentication** &rarr; **Users**.
4. Locate the owner account (`ownerkhanahub@gmail.com`).
5. Click the three dots (`...`) &rarr; **Edit user** &rarr; **Change password**.
6. Set a new password of your choice.
7. Now log in with that new password on both `localhost:5173` and Vercel.
*(Note: Changing the password in Supabase Auth does not affect any database rows, orders, or menu data.)*

---

## 13. Is an Owner Password Change Necessary?

- **Only if the current password is forgotten**: If you can retrieve the correct password from your browser's password manager, no password change is needed.
- If you cannot retrieve it, resetting the password in the Supabase Dashboard takes 30 seconds and is 100% safe.

---

## 14. Missing Information or Additional Checks

- **Vercel Server-Side Secrets**: We inspected the client bundle deployed on Vercel (`index-BcE-8l_c.js`), but did not access private Vercel dashboard backend settings (not needed because Vercel has no backend functions).
- **Supabase Internal Password Hashes**: Supabase securely hashes passwords with bcrypt inside the private `auth.users` table; raw passwords cannot and should not be retrieved by any tool or script.

---

## 15. Security Considerations

- **Secret Keys**: All Supabase service role keys and Razorpay secrets remain private and unexposed.
- **Client Anon Key**: The `VITE_SUPABASE_ANON_KEY` is meant to be public and is protected by PostgreSQL Row Level Security (RLS).
- **Public Users Table**: `public.users` enforces `auth.uid() = id`, ensuring that unauthenticated users cannot view or modify user profiles.

---

## 16. Explicit Confirmations

1. **No Code Modified**: No application source files, CSS, or scripts were modified for this diagnostic audit.
2. **No Database Modified**: No database schemas, tables, constraints, users, or passwords were created, modified, or deleted.
3. **No Environment Modified**: No `.env` files or variables were altered.
4. **No Git Action Taken**: No `git commit` or `git push` was executed.
5. **No Vercel Action Taken**: No deployment was triggered.
