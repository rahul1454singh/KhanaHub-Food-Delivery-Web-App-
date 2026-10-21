import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../api/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('');
  const [globalLoading, setGlobalLoading] = useState({ isLoading: false, message: '' });

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      const startTime = Date.now();
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await fetchUserData(session.user);
        } else {
          // Check for delivery partner local session
          const savedDeliveryUser = localStorage.getItem('khanahub_delivery_user');
          if (savedDeliveryUser) {
            try {
              const parsed = JSON.parse(savedDeliveryUser);
              setUser(parsed);
            } catch (e) {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Auth init check:', err);
      }

      const elapsed = Date.now() - startTime;
      const minDuration = 1000;
      const remaining = Math.max(0, minDuration - elapsed);
      setTimeout(() => setLoading(false), remaining);
    };

    initializeAuth();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserData(session.user);
      } else {
        const savedDeliveryUser = localStorage.getItem('khanahub_delivery_user');
        if (!savedDeliveryUser) {
          setUser(null);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch role and details from public.users table
  const fetchUserData = async (authUser) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (data && !error) {
      setUser({ 
        ...authUser, 
        ...data,
        role: data.role || 'customer'
      });
    } else {
      setUser({
        ...authUser,
        role: 'customer'
      });
    }
  };

  const login = async (email, password) => {
    // Standard Customer / Delivery / Owner Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.user) {
      await fetchUserData(data.user);
    }
    return { message: 'Login successful' };
  };

  const signup = async (name, email, password, phoneCode, contactNumber) => {
    // Standard signup via Supabase Auth for ALL users
    // The Supabase Database Trigger (handle_new_user) will auto-assign the 'delivery' role if email starts with 'db'
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone_code: phoneCode, contact_number: contactNumber }
      }
    });

    if (error) throw error;
    return { isDelivery: false, message: 'Signup successful, please check your email' };
  };

  const verifyOTP = async (email, otp) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
    if (error) throw error;
    if (data?.user) {
      await fetchUserData(data.user);
    }
    return { message: 'Verified successfully' };
  };

  const resendOTP = async (email) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) throw error;
    return { message: 'OTP resent successfully' };
  };

  const googleAuth = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw error;
    return data;
  };

  const verifyRecoveryOTP = async (email, otp) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'recovery'
    });
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    if (user) {
      const uid = user.id || user._id;
      if (uid) {
        localStorage.removeItem(`cart_${uid}`);
      }
    }
    localStorage.removeItem('cart_undefined');
    localStorage.removeItem('cart_guest');
    localStorage.removeItem('khanahub_delivery_user');
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, token: null, loading, login, signup, verifyOTP, resendOTP, googleAuth, logout, resetPassword, verifyRecoveryOTP, updatePassword, 
      showAuthModal, setShowAuthModal,
      authPromptMessage, setAuthPromptMessage,
      globalLoading, setGlobalLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
