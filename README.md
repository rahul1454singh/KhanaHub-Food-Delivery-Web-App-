# KhanaHub 🍔

KhanaHub is a premium, full-stack food delivery web application designed to bring delicious food straight to your doorstep. I built this project to learn and implement modern web development practices, focusing heavily on a clean, Swiggy/Zomato-inspired user interface and real-time data handling.

## ✨ Features

- **Premium User Interface**: A modern, highly responsive design with smooth spring animations, clean layouts, and a distinct brand theme.
- **Three-Tier Role System**: Dedicated, custom dashboards for **Customers**, **Restaurant Owners**, and **Delivery Partners**.
- **Real-Time Order Tracking**: See exactly when your order is placed, prepared, and out for delivery using Supabase real-time subscriptions.
- **Secure Payments**: Integrated with Razorpay for safe, seamless checkout experiences.
- **Authentication**: Secure email/password and OTP login via Supabase.

## 🚀 Tech Stack

- **Frontend**: React.js (Vite), plain CSS Modules for custom styling, Lucide React (Icons).
- **Backend & Database**: Supabase (PostgreSQL, Realtime, Edge Functions).
- **Media & Storage**: Cloudinary (for menu images, logos, and owner uploads).
- **Payment Gateway**: Razorpay.

## 🛠️ Local Development

If you want to run this project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/khanahub.git
   cd khanahub
   ```

2. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `frontend` folder and add your API keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_RAZORPAY_KEY_ID=your_razorpay_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 🤝 Contributing
Since this is a personal project, it's currently not actively seeking major contributions. However, feel free to fork the repo, play around with the code, and submit any cool pull requests if you'd like!

---
*Built with ❤️ and a lot of coffee.*
