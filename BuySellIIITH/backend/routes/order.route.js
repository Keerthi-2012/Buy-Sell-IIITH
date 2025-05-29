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
  verifyDeliveryOTP
} from '../controllers/order.controller.js';
import isAuthenticated from '../middleware/isAuthenticated.js';

const router = express.Router();

// Create a new order
router.post('/', createOrder);

// Complete an order by transactionId
router.patch('/complete/:transactionId', completeOrder);

// Cancel an order by transactionId
router.patch('/cancel/:transactionId', cancelOrder);

// Get all orders
router.get('/', getAllOrders);

// Get orders by user ID (buyer or seller)
router.get('/user/:userId', getUserOrders);

// Cart routes
router.post('/cart/add',isAuthenticated, addToCart);          // Add item to cart
router.post('/cart/remove', removeFromCart);  // Remove item from cart
router.get('/cart', isAuthenticated, viewCart);
     // View cart for a user

// Checkout route
router.post('/checkout', checkout);

router.get('/placed/:userId', getPlacedOrders); // Orders placed by buyer
router.get('/sold/:userId', getSoldOrders); // Orders sold by seller

// OTP verification for delivery
router.post('/verify-delivery', verifyDeliveryOTP); // Verify delivery with OTP


export default router;
