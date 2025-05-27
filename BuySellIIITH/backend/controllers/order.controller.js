import mongoose from 'mongoose';
import { Order } from '../models/order.model.js';
import { Item } from '../models/item.model.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Cart } from '../models/cart.model.js';


export const createOrder = async (req, res) => {
  try {
    const { transactionId, buyer, seller, item, amount, otp } = req.body;

    if (!transactionId || !buyer || !seller || !item || !amount || !otp) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (buyer === seller) {
      return res.status(400).json({ message: 'Buyer and seller cannot be the same user' });
    }

    if (
      !mongoose.Types.ObjectId.isValid(buyer) ||
      !mongoose.Types.ObjectId.isValid(seller) ||
      !mongoose.Types.ObjectId.isValid(item)
    ) {
      return res.status(400).json({ message: 'Invalid buyer, seller, or item ID' });
    }

    const existingOrder = await Order.findOne({ transactionId });
    if (existingOrder) {
      return res.status(400).json({ message: 'Order with this transactionId already exists' });
    }

    const hashedOTP = await bcrypt.hash(otp, 10);

    const order = new Order({
      transactionId,
      buyer,
      seller,
      item,
      amount,
      hashedOTP,
    });

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate transactionId' });
    }
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};

export const completeOrder = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const order = await Order.findOne({ transactionId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status === 'completed') {
      return res.status(400).json({ message: 'Order is already completed' });
    }

    order.status = 'completed';
    order.completedAt = new Date();

    const updatedOrder = await order.save();
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Failed to complete order', error: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('item');
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('item');

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user orders', error: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const order = await Order.findOne({ transactionId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status === 'completed') {
      return res.status(400).json({ message: 'Completed orders cannot be cancelled' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();

    const cancelledOrder = await order.save();
    res.status(200).json(cancelledOrder);
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel order', error: error.message });
  }
};

export const addToCart = (req, res) => {
  const { userId, itemId } = req.body;
  if (!userId || !itemId) return res.status(400).json({ message: 'Missing userId or itemId' });

  if (!cart[userId]) cart[userId] = [];

  if (!cart[userId].includes(itemId)) {
    cart[userId].push(itemId);
  }

  res.json({ message: 'Item added to cart', cart: cart[userId] });
};

export const removeFromCart = (req, res) => {
  const { userId, itemId } = req.body;
  if (!userId || !itemId) return res.status(400).json({ message: 'Missing userId or itemId' });

  if (cart[userId]) {
    cart[userId] = cart[userId].filter(id => id !== itemId);
  }

  res.json({ message: 'Item removed from cart', cart: cart[userId] || [] });
};

export const viewCart = (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ message: 'Missing userId' });

  res.json({ cart: cart[userId] || [] });
};

export const checkout = async (req, res) => {
  const { userId, items, otp } = req.body;

  try {
    if (!userId || !items || items.length === 0 || !otp) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const fetchedItems = await Item.find({ _id: { $in: items } }).populate('seller');

    const itemsBySeller = {};
    for (const item of fetchedItems) {
      const sellerId = item.seller._id.toString();

      if (sellerId === userId) {
        return res.status(400).json({ message: 'Cannot buy your own item', itemId: item._id });
      }

      if (!itemsBySeller[sellerId]) itemsBySeller[sellerId] = [];
      itemsBySeller[sellerId].push(item);
    }

    const hashedOTP = await bcrypt.hash(otp, 10);
    const orders = [];

    for (const sellerId in itemsBySeller) {
      for (const item of itemsBySeller[sellerId]) {
        const transactionId = uuidv4();

        const order = new Order({
          transactionId,
          buyer: userId,
          seller: sellerId,
          item: item._id,
          amount: item.price,
          hashedOTP,
        });

        const savedOrder = await order.save();
        orders.push(savedOrder);
      }
    }

    cart[userId] = [];

    res.status(201).json({ message: 'Orders placed successfully', orders });
  } catch (err) {
    res.status(500).json({ message: 'Checkout failed', error: err.message });
  }
};

export const getPlacedOrders = async (req, res) => {
  const { userId } = req.params;
  try {
    const orders = await Order.find({ buyer: userId }).populate('item seller');
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
};

export const getSoldOrders = async (req, res) => {
  const { userId } = req.params;
  try {
    const orders = await Order.find({ seller: userId }).populate('item buyer');
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
};

export const verifyDeliveryOTP = async (req, res) => {
  const { transactionId, otp } = req.body;
  try {
    const order = await Order.findOne({ transactionId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isMatch = await bcrypt.compare(otp, order.hashedOTP);
    if (!isMatch) return res.status(400).json({ message: 'Invalid OTP' });

    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    res.json({ message: 'Delivery verified', order });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
};
