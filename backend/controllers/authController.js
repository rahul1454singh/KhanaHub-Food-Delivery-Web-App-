const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// Generate 6 digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    console.log(`[Auth] Signup attempt for: ${cleanEmail}`);

    let user = await User.findOne({ email: cleanEmail });
    if (user && user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already registered and verified. Please login.' });
    }

    const isDeliveryBoy = cleanEmail.startsWith('db');

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ 
        name: name.trim(), 
        email: cleanEmail, 
        password: hashedPassword,
        role: isDeliveryBoy ? 'delivery' : 'customer',
        isEmailVerified: isDeliveryBoy ? true : false
      });
      await user.save();
    } else {
       const hashedPassword = await bcrypt.hash(password, 10);
       user.name = name.trim();
       user.password = hashedPassword;
       user.role = isDeliveryBoy ? 'delivery' : 'customer';
       user.isEmailVerified = isDeliveryBoy ? true : false;
       await user.save();
    }

    if (isDeliveryBoy) {
      // Auto-verify and send success response for delivery boys without OTP
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ 
        message: 'Delivery boy registered successfully.', 
        email: user.email,
        isDelivery: true,
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role }
      });
    }

    // Generate and send OTP for normal users
    const otp = generateOTP();

    await OTP.deleteMany({ email: cleanEmail });
    await OTP.create({ email: cleanEmail, otp });

    const path = require('path');
    const fs = require('fs');
    const logoPath = path.resolve(__dirname, '../../assets/logo/newlogo.png');
    const attachments = [];
    let logoImgTag = '';

    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: 'logo.png',
        path: logoPath,
        cid: 'restaurantLogo'
      });
      logoImgTag = `
        <div style="text-align: center; margin-bottom: 12px;">
          <img src="cid:restaurantLogo" alt="KhanaHub Restaurant Logo" style="width: 88px; height: auto; display: inline-block;" />
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #eaeaea;">
          <!-- Header Bar with Logo & Branding -->
          <tr>
            <td style="padding: 30px 24px 18px; text-align: center; background: linear-gradient(180deg, #fffaf5 0%, #ffffff 100%);">
              ${logoImgTag}
              <h1 style="color: #ea580c; margin: 0 0 4px; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">KhanaHub</h1>
              <p style="color: #888888; font-size: 13px; margin: 0; font-weight: 500; letter-spacing: 1px;">RESTAURANT & FOOD ORDERING</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 10px 32px 28px; text-align: center;">
              <h2 style="color: #1f2937; margin: 0 0 10px; font-size: 20px; font-weight: 700;">Verify Your Email</h2>
              <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
                Welcome to <strong>KhanaHub</strong>! Please use the following One-Time Password (OTP) to complete your account registration:
              </p>
              
              <!-- OTP Box -->
              <div style="background: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 24px;">
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #ea580c; font-family: 'Courier New', Courier, monospace; margin-left: 10px;">${otp}</span>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px;">
                ⏱️ This code will expire in <strong style="color: #1f2937;">5 minutes</strong>.
              </p>
              
              <div style="height: 1px; background-color: #f3f4f6; margin: 24px 0 20px;"></div>
              
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
                If you did not request this verification code, you can safely ignore this email.<br>
                Never share this OTP with anyone.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 18px 30px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} <strong>KhanaHub</strong>. Delicious Food, Delivered To You.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await sendEmail({ email: cleanEmail, subject: 'KhanaHub Verification Code', html, attachments });

    console.log(`[Auth] OTP sent successfully to: ${cleanEmail}`);
    res.status(200).json({ message: 'OTP sent to your email. Please verify.', email: user.email });
  } catch (error) {
    console.error('Signup error:', error);
    let message = 'Database connection failed or Server error';
    
    if (error?.message?.includes('Email sending failed')) {
      message = 'Unable to send verification email';
    } else if (error?.name === 'ValidationError') {
      message = error.message;
    } else if (error?.code === 11000) {
      message = 'Email already registered';
    } else if (error?.message) {
      message = error.message;
    }

    res.status(500).json({ message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    console.log(`[Auth] Verifying OTP for: ${cleanEmail}`);

    const otpRecord = await OTP.findOne({ email: cleanEmail, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await User.updateOne({ email: cleanEmail }, { isEmailVerified: true });
    await OTP.deleteOne({ _id: otpRecord._id });

    const user = await User.findOne({ email: cleanEmail });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] OTP verified successfully for: ${cleanEmail}`);

    res.status(200).json({
      message: 'Email verified successfully',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Database connection failed or Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    console.log(`[Auth] Login attempt for: ${cleanEmail}`);

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      console.warn(`[Auth] User not found in database: ${cleanEmail}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      console.warn(`[Auth] Email not verified for: ${cleanEmail}`);
      return res.status(403).json({ message: 'Email not verified. Please signup again to get a new OTP.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`[Auth] Password mismatch for: ${cleanEmail}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log(`[Auth] User logged in successfully: ${cleanEmail}`);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Database connection failed or Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');
let adminApp;

try {
  // Initialize on demand or use default app
  if (!getApps().length) {
    let serviceAccount;
    
    // First try environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } 
    // Fallback to a local file for easier setup
    else {
      const keyPath = path.join(__dirname, '../serviceAccountKey.json');
      if (fs.existsSync(keyPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      }
    }

    if (serviceAccount) {
      adminApp = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin Initialized successfully!");
    } else {
      console.warn("Firebase Admin NOT Initialized: Missing credentials");
    }
  } else {
    adminApp = getApp();
  }
} catch (e) {
  console.error("Firebase Admin Initialization Error:", e);
}

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'No ID token provided' });

    if (!getApps().length) {
      return res.status(500).json({ message: 'Firebase Admin not configured on server' });
    }

    const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: 'Email is required from Google' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = new User({
        name: name || 'Google User',
        email: email,
        isEmailVerified: true,
        authProvider: 'google',
        firebaseUid: uid
      });
      await user.save();
    } else {
      // Update existing user if needed, and make sure we don't block them if they were previously email/password
      user.firebaseUid = uid;
      if (!user.isEmailVerified) user.isEmailVerified = true;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Google authentication failed' });
  }
};
