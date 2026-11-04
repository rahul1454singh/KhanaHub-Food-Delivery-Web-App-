# 🍕 KhanaHub — Real-Time Food Delivery Web Application

<p align="center">
  <strong>A modern, full-stack, serverless food ordering and real-time delivery platform inspired by Swiggy & Zomato.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%208-blue?style=for-the-badge&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Backend-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase">
  <img src="https://img.shields.io/badge/Realtime-WebSockets-orange?style=for-the-badge" alt="WebSockets">
  <img src="https://img.shields.io/badge/Payments-Razorpay-0C2340?style=for-the-badge&logo=razorpay" alt="Razorpay">
  <img src="https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge&logo=vercel" alt="Vercel">
</p>

---

## 📖 1. What is KhanaHub?

**KhanaHub** is an end-to-end, mobile-responsive food delivery web application built with modern web technologies. It provides a real-time, three-sided platform connecting:

1. **Customers:** Browse delicious food categories (Momos, Biryani, Burgers, Pizza, Snacks, Drinks), customize carts, apply percentage discount promo codes, drop precise delivery pins on interactive maps, pay safely via Razorpay, and track their delivery driver in real time.
2. **Restaurant Owners:** A dedicated operational panel with a live kitchen Kanban board, delivery dispatching, live menu pricing and stock management with Cloudinary image uploads, voucher creation, and business analytics.
3. **Delivery Partners:** A streamlined mobile dashboard to view assigned orders, navigate between the restaurant and the customer drop-off pin, broadcast live GPS updates, and verify deliveries securely using customer OTPs.

---

## 🏗️ 2. System Architecture & Tech Stack

KhanaHub is built as a **100% Serverless Single-Page Application (SPA)**:

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  React 19 + Vite 8 + React Router 7                                               |
|  - Customer Views (Menu, Cart, Checkout, Profile, Orders, Live Delivery Map)      |
|  - Delivery Partner Dashboard (Live GPS Route, Order Dispatch, Drop-off OTP)      |
|  - Restaurant Owner Panel (Active Orders, Dish Manager, Promos, Analytics)        |
+-----------------------------------------------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
+----------------------------------+          +-------------------------------------+
|        VERCEL HOSTING            |          |          SUPABASE CLOUD             |
|  - Global Edge CDN               |          |  - PostgreSQL 15 Database (RLS)     |
|  - Vite SPA Rewrites (/index)    |          |  - Supabase GoTrue Auth (OAuth/OTP) |
|  - Zero Node server maintenance  |          |  - Realtime WebSockets              |
+----------------------------------+          |  - Deno Edge Functions (Razorpay)   |
                                              +-------------------------------------+
```

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + Vite 8** | Ultra-fast client-side component rendering and reactive state management. |
| **Routing** | **React Router v7** | Client-side routing with role-based protected route guards. |
| **Styling & UI** | **Vanilla CSS3 + Lucide Icons** | Frosted glassmorphism modals, custom animations, and responsive mobile-first UI. |
| **Maps & GPS** | **Leaflet & OpenStreetMap** | Interactive address pin placement and live delivery GPS tracking. |
| **Backend & DB** | **Supabase (PostgreSQL 15)** | Handles database records, Row Level Security (RLS), and authentication. |
| **Realtime Engine** | **Supabase Realtime** | Instant WebSocket notifications for accepted orders and driver location changes. |
| **Serverless Functions** | **Supabase Edge Functions** | Cryptographic verification of Razorpay payment signatures using Deno. |
| **Payment Gateway** | **Razorpay Checkout SDK** | Secure payments via UPI, Debit/Credit cards, Net Banking, and Wallets. |
| **Cloud Storage** | **Cloudinary CDN** | Optimized hosting for dish photos, restaurant branding, and owner uploads. |
| **Hosting & CDN** | **Vercel** | High-performance static SPA hosting with automatic rewrite configuration. |

---

## 👥 3. Features by User Role

### 🛍️ Customer Experience
* **Visual Food Catalog:** Explore categories (Momo, Biryani, Burger, Pizza, Snacks, Drinks) with high-res photography and pricing.
* **Interactive Shopping Cart:** Real-time quantity counters, dynamic price calculation, and discount coupon code input (`KHANA20`, etc.).
* **Map Address Picker:** Click or drag a pin on an OpenStreetMap map to pinpoint exact delivery coordinates.
* **Razorpay Payment Integration:** Seamless checkout popup supporting test and live modes.
* **Live GPS Order Tracking:** Real-time visual progress showing restaurant location, driver location, and customer destination.
* **Order History:** Full list of historical orders with itemized breakdowns and one-click re-ordering.
* **Comprehensive Authentication:** Google OAuth ("Continue with Google"), Email/Password signup with email OTP verification, and a 6-digit OTP Forgot Password recovery screen.

### 🍳 Restaurant Owner Panel
* **Live Kitchen Orders:** Real-time Kanban board showing pending, preparing, and dispatched orders.
* **Delivery Partner Dispatch:** Select available drivers and assign orders with a single click.
* **Menu Management:** Add new food items with custom categories, live prices, and instant Cloudinary image uploads; toggle item availability (In Stock / Out of Stock).
* **Promo Code Creator:** Create custom voucher codes with custom discount percentages and toggle promotions storewide.
* **Analytics Dashboard:** Graphical summary of daily sales volume, top revenue dishes, and order statistics.

### 🛵 Delivery Partner Portal
* **Delivery Dashboard:** View newly assigned delivery pickups with customer phone numbers and drop-off addresses.
* **Navigation Map:** View route directions connecting the restaurant to the customer's delivery pin.
* **Secure Drop-off OTP:** Verify order delivery by submitting the customer's 4-digit secret OTP.

---

## 📁 4. Complete File-by-File Directory Guide

Here is a clear, simple description of every file and directory across the project:

### Root Directory
* [`.env`](file:///.env) &mdash; Local private environment variables (Razorpay test keys). Gitignored for security.
* [`.env.example`](file:///.env.example) &mdash; Safe public template showing required environment variable keys for Supabase and Razorpay.
* [`.gitignore`](file:///.gitignore) &mdash; Tells Git which files to never commit (`node_modules`, `.env`, `*.pdf`, etc.).
* [`package.json`](file:///package.json) &mdash; Root package manifest for workspace dependencies.
* [`README.md`](file:///README.md) &mdash; Master project documentation and architecture guide.
* [`supabase_schema.sql`](file:///supabase_schema.sql) &mdash; The complete, unified PostgreSQL database schema, ENUMs, triggers, and Row Level Security policies.
* [`vercel.json`](file:///vercel.json) &mdash; Production deployment instructions for Vercel (build commands, output directory, and SPA rewrite rules).

---

### Supabase Directory (`supabase/`)
* `supabase/.env` &mdash; Private credentials for local Edge Functions testing.
* `supabase/functions/razorpay/index.ts` &mdash; Serverless Deno TypeScript function that validates Razorpay signatures with the Razorpay secret key.

---

### Frontend Configuration (`frontend/`)
* `frontend/index.html` &mdash; Main HTML web page shell hosting the React root mount element.
* `frontend/vite.config.js` &mdash; Vite build configuration file enabling React plugins and optimizations.
* `frontend/package.json` &mdash; Lists all frontend npm packages (React 19, Leaflet, Lucide React, Supabase JS, React Router).
* `frontend/.env` &mdash; Active client environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RAZORPAY_KEY_ID`).
* `frontend/public/` &mdash; Static assets served directly (logo, default menu pictures, promotional video).

---

### Frontend Source Code (`frontend/src/`)

#### Core App
* `src/main.jsx` &mdash; React entrypoint that initializes the app in the browser DOM.
* `src/App.jsx` &mdash; Central view router managing active screens (home, checkout, orders, owner panel, delivery panel) and modal overlays.
* `src/index.css` &mdash; Global design system, CSS variables, typography, color palettes, and responsive breakpoints.

#### API & Realtime
* `src/api/supabase.js` &mdash; Initializes the `@supabase/supabase-js` client with environment variables.
* `src/api/realtimeHub.js` &mdash; WebSocket helper listening for instant broadcasts (e.g. accepted delivery notices).

#### Context (State Management)
* `src/context/AuthContext.jsx` &mdash; Global user state: login, signup, Google OAuth, OTP verification, session persistence, and role detection.
* `src/context/CartContext.jsx` &mdash; Shopping cart state: items, quantities, subtotal calculation, and localStorage sync.

#### Utilities & Fallbacks
* `src/utils/currency.js` &mdash; Formats prices with the standard Indian Rupee symbol (`₹`).
* `src/data/menuData.js` &mdash; Fallback food catalog used if database connection is temporarily offline.

---

### UI Components (`frontend/src/components/`)

#### Global Navigation & Layout
* `Navbar.jsx` / `.css` &mdash; Top header with brand logo, quick navigation, cart trigger, live delivery tracker pill, and user profile badge.
* `Hero.jsx` / `.css` &mdash; Eye-catching banner featuring promotional cards and call-to-action buttons.
* `MenuSection.jsx` / `.css` &mdash; Categorized food menu with category selection pills and 3D card layout.
* `CartSidebar.jsx` / `.css` &mdash; Slide-out shopping cart sidebar with promo code input and checkout button.
* `AuthModal.jsx` / `.css` &mdash; Sign In and Sign Up modal with Google OAuth and email OTP support.
* `ForgotPassword.jsx` / `.css` &mdash; 3-step account recovery flow using 6-digit email OTPs.
* `Footer.jsx` / `.css` &mdash; Page footer with restaurant timings, contact information, and brand watermark.
* `LoadingScreen.jsx` / `.css` &mdash; Polished startup splash screen shown during initial loading.
* `IOSSpinner.jsx` &mdash; Smooth iOS-style SVG loader for buttons and async actions.

#### Checkout & Address Pinning
* `Checkout/CheckoutPage.jsx` &mdash; Checkout screen with contact inputs, address form, price breakdown, and Razorpay modal launch.
* `Checkout/LocationPickerMap.jsx` &mdash; Interactive Leaflet map allowing customers to drag a pin to their exact delivery location.

#### Customer Dashboard
* `Customer/LiveDeliveryPage.jsx` &mdash; Live delivery tracking screen displaying driver location, route map, and ETA.
* `Customer/UserProfile.jsx` &mdash; Customer profile settings to edit phone numbers, addresses, and saved GPS coordinates.

#### Delivery Partner Portal
* `Delivery/DeliveryDashboard.jsx` &mdash; Delivery driver workstation to view assigned orders and navigate routes.
* `Delivery/DeliveryOtpModal.jsx` &mdash; Secure popup requiring the 4-digit customer delivery OTP to complete drop-off.
* `Delivery/DeliverySuccessModal.jsx` &mdash; Success modal displayed when a delivery is verified.
* `Delivery/LiveTrackingMap.jsx` &mdash; OpenStreetMap route map rendering restaurant, driver, and customer pins.

#### Customer Orders
* `Orders/OrdersPage.jsx` &mdash; Customer order history with item summaries, status indicators, and re-order buttons.

#### Restaurant Owner Panel
* `Owner/OwnerDashboard.jsx` &mdash; Master administration dashboard container with sidebar navigation.
* `Owner/ActiveOrders.jsx` &mdash; Kitchen management board tracking pending orders, cooking status, and driver dispatching.
* `Owner/AssignDelivery.jsx` &mdash; Driver assignment modal listing available delivery partners.
* `Owner/AddMenu.jsx` &mdash; Form to create new food dishes with Cloudinary image upload.
* `Owner/ViewMenu.jsx` &mdash; Menu inventory table to edit prices, delete items, or toggle in-stock/out-of-stock.
* `Owner/Analytics.jsx` &mdash; Business sales dashboard with total earnings and popular dish metrics.
* `Owner/ManagePromos.jsx` &mdash; Promotional manager to create discount codes (e.g. `SUMMER20`) and toggle promo availability.
* `Owner/OwnerOrderHistory.jsx` &mdash; Complete historical ledger of past restaurant orders.

#### Payment Confirmation
* `PaymentSuccess/PaymentSuccess.jsx` &mdash; Post-payment confirmation screen displaying payment ID and direct link to live tracking.

---

## 🗄️ 5. Database Schema Overview

KhanaHub uses **Supabase PostgreSQL 15** configured in [`supabase_schema.sql`](file:///supabase_schema.sql):

1. **`public.users`:** Extends Supabase Auth users with name, email, role (`customer`, `owner`, `delivery`), phone details, and GPS coordinates. Automatically synchronized via the `handle_new_user()` trigger.
2. **`public.menu`:** Food catalog with dish name, category, price, image URL, and stock availability.
3. **`public.orders`:** Customer orders containing item arrays, total pricing, delivery details, status stages, and Razorpay payment identifiers.
4. **`public.promo_codes`:** Voucher codes with discount percentages and active toggles.
5. **`public.store_settings`:** Global settings (e.g. `is_promo_active`) to enable/disable promotional codes storewide.
6. **Row Level Security (RLS):** Strict PostgreSQL policies ensure customers can only read/edit their own data, delivery boys only see assigned deliveries, and owners can access store operations.

---

## ⚙️ 6. How to Run Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* A free [Supabase](https://supabase.com/) project
* A free [Razorpay](https://razorpay.com/) test mode account

### Step 1: Clone Repository
```bash
git clone https://github.com/rahul1454singh/KhanaHub-Food-Delivery-Web-App-.git
cd KhanaHub-Food-Delivery-Web-App-
```

### Step 2: Install Dependencies
```bash
cd frontend
npm install
```

### Step 3: Configure Environment Variables
Create a `.env` file in the `frontend/` directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

### Step 4: Run the Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser to start using KhanaHub.

---

## 📄 Documentation PDF
A standalone, formatted PDF copy of this documentation is generated locally as `document.pdf`. It is kept locally for reference and excluded from Git commits.
