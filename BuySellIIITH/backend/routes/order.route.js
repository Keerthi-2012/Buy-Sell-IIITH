import express from 'express';
import {
  createOrder,
  completeOrder,
  getAllOrders,
  getUserOrders,
  cancelOrder,
  addToCart,
  removeFromCart,
  viewCart,
  checkout,
  getPlacedOrders,
  getSoldOrders,
  verifyDeliveryOTP,
  checkoutAllItems,
  getCancelledOrders
} from '../controllers/order.controller.js';
import isAuthenticated from '../middleware/isAuthenticated.js';

const router = express.Router();

// Create a new order
router.post('/', createOrder);

// Complete an order by transactionId
router.patch('/complete/:transactionId',isAuthenticated, completeOrder);

// Cancel an order by transactionId
router.patch('/cancel/:transactionId', cancelOrder);

// Get all orders
router.get('/', getAllOrders);

// Get orders by user ID (buyer or seller)
router.get('/user/:userId', getUserOrders);

// Cart routes
router.get('/cart', isAuthenticated, viewCart);
router.post('/cart/add',isAuthenticated, addToCart);          // Add item to cart
router.post('/cart/remove', isAuthenticated, removeFromCart);  // ✅ Protect the route

     // View cart for a user

// Checkout route
router.post('/checkoutallItems',isAuthenticated, checkoutAllItems);
router.post('/checkout',isAuthenticated, checkout);
router.get('/cancelled/:userId', isAuthenticated, getCancelledOrders);
router.get('/placed/:userId', getPlacedOrders); // Orders placed by buyer
router.get('/sold/:userId', getSoldOrders); // Orders sold by seller


// OTP verification for delivery
router.post('/verify-delivery',isAuthenticated, verifyDeliveryOTP); // Verify delivery with OTP


export default router;
