import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const CartContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Synchronously load cart from localStorage so items are never lost on reload
  const [cartItems, setCartItems] = useState(() => {
    try {
      const guestSaved = localStorage.getItem('cart_guest');
      if (guestSaved) {
        const parsed = JSON.parse(guestSaved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cart_')) {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        }
      }
    } catch (e) {
      console.error('Error loading initial cart', e);
    }
    return [];
  });
  
  const [prevUser, setPrevUser] = useState(user);
  const isInitialMount = React.useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setPrevUser(user);
      return;
    }

    const cartKey = user ? `cart_${user._id}` : 'cart_guest';
    const saved = localStorage.getItem(cartKey);
    let loadedItems = [];
    
    if (saved) {
      try {
        loadedItems = JSON.parse(saved);
      } catch (e) {}
    }
    
    // If transitioning from guest to user (logging in), merge/preserve the cart items
    if (!prevUser && user && cartItems.length > 0) {
      loadedItems = [...cartItems];
      localStorage.removeItem('cart_guest');
      localStorage.setItem(`cart_${user._id}`, JSON.stringify(loadedItems));
    } else if (prevUser && !user) {
      // User logged out
      loadedItems = [];
    }

    setCartItems(loadedItems);
    setPrevUser(user);
  }, [user]);

  useEffect(() => {
    const cartKey = user ? `cart_${user._id}` : 'cart_guest';
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
  }, [cartItems, user]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const clearCart = () => setCartItems([]);

  const addToCart = (item) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to your cart`);
  };

  const removeFromCart = (id) => {
    setCartItems((prevItems) => {
      const newItems = prevItems.filter((i) => i.id !== id);
      if (newItems.length === 0) {
        setIsCartOpen(false);
      }
      return newItems;
    });
  };

  const updateQuantity = (id, amount) => {
    setCartItems((prevItems) => {
      const updated = prevItems.map((i) => {
        if (i.id === id) {
          return { ...i, quantity: i.quantity + amount };
        }
        return i;
      });
      const finalItems = updated.filter((i) => i.quantity > 0);
      if (finalItems.length === 0) {
        setIsCartOpen(false);
      }
      return finalItems;
    });
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        isCartOpen,
        openCart,
        closeCart,
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
