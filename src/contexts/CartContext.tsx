'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Meal } from '@/lib/api';

interface CartItem {
  meal: Meal;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { meal: Meal; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { mealId: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { mealId: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] };

interface CartContextType {
  state: CartState;
  addItem: (meal: Meal, quantity: number) => void;
  removeItem: (mealId: number) => void;
  updateQuantity: (mealId: number, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (mealId: number) => number;
  mergeGuestCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.meal.id === action.payload.meal.id);
      
      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.meal.id === action.payload.meal.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        
        return {
          ...state,
          items: updatedItems,
          total: updatedItems.reduce((sum, item) => sum + (item.meal.price * item.quantity), 0)
        };
      } else {
        const newItems = [...state.items, action.payload];
        return {
          ...state,
          items: newItems,
          total: newItems.reduce((sum, item) => sum + (item.meal.price * item.quantity), 0)
        };
      }
    }
    
    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.meal.id !== action.payload.mealId);
      return {
        ...state,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + (item.meal.price * item.quantity), 0)
      };
    }
    
    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.meal.id === action.payload.mealId
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0);
      
      return {
        ...state,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + (item.meal.price * item.quantity), 0)
      };
    }
    
    case 'CLEAR_CART':
      return {
        items: [],
        total: 0
      };
    
    case 'LOAD_CART':
      return {
        items: action.payload,
        total: action.payload.reduce((sum, item) => sum + (item.meal.price * item.quantity), 0)
      };
    
    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: cartItems });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

           // Save cart to localStorage whenever it changes
         useEffect(() => {
           console.log('Cart state changed:', state.items);
           localStorage.setItem('cart', JSON.stringify(state.items));
         }, [state.items]);

           const addItem = (meal: Meal, quantity: number) => {
           console.log('Adding item to cart:', meal.name, 'quantity:', quantity);
           dispatch({ type: 'ADD_ITEM', payload: { meal, quantity } });
         };

  const removeItem = (mealId: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { mealId } });
  };

  const updateQuantity = (mealId: number, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { mealId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getItemQuantity = (mealId: number) => {
    const item = state.items.find(item => item.meal.id === mealId);
    return item ? item.quantity : 0;
  };

  const mergeGuestCart = () => {
    // This function can be called after login to merge any guest cart items
    // Currently, the cart is already persisted in localStorage, so it should
    // automatically be available after login. This function is here for future
    // server-side cart synchronization if needed.
    console.log('Guest cart merged successfully');
  };

  return (
    <CartContext.Provider value={{
      state,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getItemQuantity,
      mergeGuestCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
