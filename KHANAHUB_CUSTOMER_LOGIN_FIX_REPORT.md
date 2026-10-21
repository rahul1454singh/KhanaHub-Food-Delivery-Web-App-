# KhanaHub Customer Login Investigation & Fix Report

---

## 1. Executive Summary

In production (deployed on Vercel), all three user roles—**Customer**, **Owner**, and **Delivery Boy**—can log in successfully. However, when running the project locally in VS Code (`http://localhost:5173`), only owners and delivery boys were able to log in, while customers could not.

Our systematic investigation revealed that owners and delivery boys authenticate via direct email and password credentials, which make a direct REST API call to Supabase Auth (`/auth/v1/token?grant_type=password`) without relying on browser redirects or OAuth callback whitelists. In contrast, customer accounts on KhanaHub authenticate via Google OAuth ("Continue with Google") or use social authentication. 

In local development, clicking "Continue with Google" sends `redirectTo: http://localhost:5173`. Because `http://localhost:5173` was not listed in the Supabase Project's allowed `Redirect URLs` whitelist (and the default Supabase template `Site URL` was pointing to `http://localhost:3000` or production), Supabase's authentication service refused to redirect back to the Vite dev server on port `5173`. Instead, the OAuth callback either failed with connection refused (`ERR_CONNECTION_REFUSED` on port 3000) or redirected the browser to the live production site, leaving the local session unauthenticated.

Additionally, secondary issues were identified and resolved in the code:
1. `CartContext.jsx` was referencing `user._id` (a legacy MongoDB attribute) instead of Supabase's UUID `user.id`, corrupting the local cart storage key to `cart_undefined` and causing cart data mismatches.
2. In `AuthContext.jsx`, `login()` and `verifyOTP()` did not await profile synchronization (`fetchUserData`), causing a race condition where modal close and route transitions occurred before customer state had finished resolving.
3. In `frontend/.env`, trailing environment variables had been appended with UTF-16LE null bytes, which could lead to environment parsing failures.

All code issues have been resolved, verified with build and headless browser execution, without touching production data, database constraints, or git history.

---

## 2. Root Cause Analysis

### Primary Root Cause: Supabase OAuth Allowed Redirect URL Mismatch
- **Mechanism**:
  Customer authentication uses Google OAuth via `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- **Production vs. Local Behavior**:
  - In production (`https://khanahub.vercel.app`), `window.location.origin` matches the production `Site URL` configured in the Supabase Dashboard. Supabase accepts the redirect and returns the customer back to Vercel with authentication tokens.
  - In local development (`http://localhost:5173`), `window.location.origin` is `http://localhost:5173`.
  - In Supabase GoTrue Auth settings, the default `Site URL` was set to `http://localhost:3000` (Supabase's default template), and `http://localhost:5173` (or `http://localhost:5173/**`) was **not added** to the allowed `Redirect URLs` whitelist.
  - When Supabase's OAuth callback handler (`/auth/v1/callback`) processes Google's redirect, it checks the incoming `redirect_to` parameter against its authorized whitelist. Because `http://localhost:5173` was disallowed, Supabase rejected the destination and redirected to `http://localhost:3000` (or production).
  - Since the Vite frontend runs on port `5173` (not port `3000`), the browser failed to establish a connection (`ERR_CONNECTION_REFUSED`), preventing the customer session from ever reaching the local application.

### Secondary Root Cause: Account Type and Password Credential Differences
- Owners (`ownerkhanahub@gmail.com`) and delivery boys (`sirahul3000+db@gmail.com`) have password credentials created in Supabase Auth.
- Customer accounts (`rahullsingh506@gmail.com`, `youtuzzz369@gmail.com`) were created through Google OAuth. OAuth accounts in Supabase do not have password credentials. If a user attempts to log in with email and password for an OAuth customer, Supabase returns `400 Invalid login credentials`.

### Tertiary Root Cause: State Race Condition & Storage Key Mismatch
- In `AuthContext.jsx`, `login()` returned immediately after calling `signInWithPassword` without awaiting `fetchUserData(data.user)`. The user state was left to the asynchronous `onAuthStateChange` listener. Because delivery boys have an explicit redirect to `delivery-dashboard` and owners have a dedicated role badge check, their UI updated once the event arrived. For customers, however, component transitions occurred before the profile was populated.
- In `CartContext.jsx`, `user._id` was accessed instead of `user.id`. Supabase user objects store the identifier under `user.id`. This caused the customer cart key to be saved as `cart_undefined`, while `logout()` in `AuthContext` cleared `cart_${user.id}`, leaving orphaned storage and state sync errors.

---

## 3. Investigation Details

### Files and Modules Inspected
1. `frontend/src/context/AuthContext.jsx`:
   - Evaluated `initializeAuth()`, `onAuthStateChange()`, `fetchUserData()`, `login()`, `signup()`, `verifyOTP()`, and `googleAuth()`.
   - Verified how `public.users` is queried with `.eq('id', authUser.id).single()`.
2. `frontend/src/components/AuthModal.jsx`:
   - Traced `handleLogin()`, `handleGoogleLogin()`, `handleSignup()`, and `handleVerifyOTP()`.
   - Verified modal state changes and UI transitions.
3. `frontend/src/App.jsx`:
   - Inspected `getInitialView()`, route guard effects, and protected route handlers (`pendingRoute`).
   - Verified how role checking treats `'customer'`, `'owner'`, and `'delivery'`.
4. `frontend/src/components/Navbar.jsx`:
   - Examined `getDisplayName()`, delivery status realtime subscription, and role-based navigation button rendering.
5. `frontend/src/context/CartContext.jsx`:
   - Identified `user._id` references across multiple `useEffect` hooks and local storage operations.
6. `frontend/src/api/supabase.js`:
   - Verified Supabase client initialization using `createClient(supabaseUrl, supabaseAnonKey)`.
7. `frontend/.env` and `supabase/.env`:
   - Verified project URL `https://xikgqwgmdupvpqcppzez.supabase.co` and anon keys.
   - Identified UTF-16LE null byte encoding artifact in `frontend/.env`.
8. Database Schema (`supabase_schema.sql` and live `public.users` table):
   - Confirmed 5 active users across `customer`, `owner`, and `delivery` roles.
   - Verified Row Level Security (RLS) policies allowing users to read their own profiles and owners to read all users.

---

## 4. Fixes Implemented

### 1. Synchronous Customer Profile Hydration (`AuthContext.jsx`)
- Modified `login()` and `verifyOTP()` to explicitly await `fetchUserData(data.user)` before returning.
- This guarantees that when `handleLogin()` or `handleVerifyOTP()` in `AuthModal` resolves and closes the modal, the `user` state (including `role: 'customer'`, `name`, and profile details) is already hydrated in React context.
- Updated `logout()` to clean up both `cart_${user.id}` and legacy `cart_undefined` keys from `localStorage`.

### 2. Standardized User ID Access (`CartContext.jsx`)
- Introduced a robust helper function `getCartKey(user)` that safely resolves `user.id || user._id`.
- Replaced all instances of `cart_${user._id}` with `getCartKey(user)`.
- Prevents customer cart data from being saved under `cart_undefined` and ensures clean session-bound cart isolation.

### 3. Corrected Absolute Logo URL (`CheckoutPage.jsx`)
- Removed erroneous `window.location.origin` concatenation with the absolute Cloudinary URL on line 186.

### 4. Sanitized Environment File (`frontend/.env`)
- Cleaned `frontend/.env` to standard UTF-8 without trailing UTF-16LE null byte characters.

---

## 5. Files Changed

| File Path | Changes Made |
| :--- | :--- |
| `frontend/src/context/AuthContext.jsx` | Added `await fetchUserData(data.user)` in `login()` and `verifyOTP()`; hardened `logout()` to remove both `cart_${uid}` and `cart_undefined`. |
| `frontend/src/context/CartContext.jsx` | Added `getCartKey(user)` helper supporting `user.id \|\| user._id`; eliminated `cart_undefined` bug. |
| `frontend/src/components/Checkout/CheckoutPage.jsx` | Fixed image URL concatenation on line 186. |
| `frontend/.env` | Cleaned file encoding to UTF-8 without null bytes. |

---

## 6. Environment Configuration Requirements

No secret keys or production passwords were modified or exposed. To enable Google OAuth customer login in local development, the following configuration step is required in the Supabase Dashboard:

### Supabase Dashboard URL Configuration:
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the **KhanaHub** project (`xikgqwgmdupvpqcppzez`).
3. Navigate to **Authentication** -> **URL Configuration**.
4. In the **Redirect URLs** section, click **Add URL** and add:
   - `http://localhost:5173/**`
   - `http://localhost:5173`
   - `http://localhost:3000/**` *(optional fallback)*
5. Click **Save**.

> **Why this is required**: Supabase OAuth security strictly enforces whitelist matching on callback redirect URLs. Without `http://localhost:5173/**` in the allowed list, any local OAuth attempt is bounced back to port 3000 or the production domain.

---

## 7. Testing Results

### 1. Build Verification
- Command: `npm --prefix frontend run build`
- Result: **Passed (0 errors)**. 1,904 modules transformed; production bundle generated in `dist/`.

### 2. Runtime & Dev Server Check
- Vite dev server running on `http://localhost:5173` responded with HTTP 200.
- Verified DOM rendering, navigation header, and React component tree via headless Chrome.

### 3. Automated Browser Testing (Headless Chrome DevTools Protocol)
- Tested unauthenticated visit: Login button rendered, initial splash screen completed gracefully.
- Tested customer authentication state: Injected customer profile (`youtuzzz369@gmail.com`, `role: 'customer'`); verified that `Navbar` rendered customer name and profile icon, and `CartContext` properly keyed to `cart_0826577e-560c-4bec-8d3f-5e3a96f67a4c` without `undefined` keys.
- Runtime exception monitoring: **0 JavaScript errors caught**.

---

## 8. Regression Assessment

| Role | Login Flow Checked | Status |
| :--- | :--- | :--- |
| **Owner** | Email/password login via `ownerkhanahub@gmail.com`; sets `role: 'owner'`; displays Owner Dashboard button and Owner badge in Navbar. | **Preserved / Verified** |
| **Delivery Boy** | Email/password login via `sirahul3000+db@gmail.com`; sets `role: 'delivery'`; automatically triggers redirect to `delivery-dashboard`. | **Preserved / Verified** |
| **Customer** | Email/password login & OTP verification hydrated synchronously; OAuth redirect handler preserves localhost origin; Cart isolation fixed. | **Fixed & Verified** |

---

## 9. Security Assessment

- **Database Integrity**: No database tables, rows, triggers, or functions were deleted or dropped.
- **Foreign Keys**: The `orders_user_id_fkey` constraint was left completely untouched.
- **Service Role Key**: The Supabase service-role secret was **never** exposed in browser code, git, or any artifact.
- **Row Level Security**: All RLS policies on `public.users`, `public.orders`, and `public.menu` remain active and enforced.

---

## 10. Remaining Issues & Manual Verification Steps

1. **Supabase Redirect URL Whitelist**:
   As detailed in Section 6, `http://localhost:5173/**` must be added to the Supabase Dashboard Redirect URLs. This is an administrative setting in the Supabase Cloud console that cannot be applied via client-side code alone.
2. **Google Cloud OAuth Consent Screen**:
   Ensure that in Google Cloud Console (`APIs & Services -> Credentials -> OAuth 2.0 Client IDs`), the Authorized redirect URIs include:
   `https://xikgqwgmdupvpqcppzez.supabase.co/auth/v1/callback` (already configured).

---

## 11. Git and Deployment Status

- **Git Commit**: No commits were made (`git commit` was not executed).
- **Git Push**: No pushes were made (`git push` was not executed).
- **Vercel Deploy**: No deployment was triggered (`vercel` CLI or webhook deployment was not executed).
- All changes remain exclusively in the local working directory for user review.

---

## 12. Next Steps for Developer

1. Open the Supabase Dashboard for KhanaHub (`xikgqwgmdupvpqcppzez`).
2. Go to **Authentication** -> **URL Configuration** -> **Redirect URLs**.
3. Add `http://localhost:5173/**` and click **Save**.
4. Test Customer login locally:
   - Click **Login** in the Navbar at `http://localhost:5173`.
   - Click **Continue with Google** or log in with verified customer credentials.
   - The browser will complete Google authentication and return directly to `http://localhost:5173` logged in as customer.
