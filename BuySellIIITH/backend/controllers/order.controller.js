import mongoose from 'mongoose';
import { Order } from '../models/order.model.js';
import { Item } from '../models/item.model.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Cart } from '../models/cart.model.js';


export const createOrder = async (req, res) => {
  try {
    const { transactionId, buyer, seller, item, amount } = req.body;

    // ✅ Validate required fields
    if (!transactionId || !buyer || !seller || !item || !amount) {
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

    // ✅ Generate and hash OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(generatedOtp, 10);

    const order = new Order({
      transactionId,
      buyer,
      seller,
      item,
      amount,
      hashedOTP,
      otp: generatedOtp // for testing/debugging only
    });


    const savedOrder = await order.save();

    res.status(201).json({
      order: savedOrder,
      otp: generatedOtp, // send OTP only in response to seller
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate transactionId' });
    }
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};

// GET /api/v1/order/otp/:transactionId
export const getOtpForOrder = async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user._id; // assuming you're using JWT and user is set

  const order = await Order.findOne({ transactionId });

  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (order.seller.toString() !== userId.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // ❌ Return OTP only once or add a TTL mechanism
  return res.status(200).json({ message: 'OTP access not supported securely yet' });
};


export const completeOrder = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { enteredOtp } = req.body;

    if (!enteredOtp) return res.status(400).json({ message: 'OTP is required' });

    const order = await Order.findOne({ transactionId });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status === 'completed') return res.status(400).json({ message: 'Order is already completed' });

    // ✅ Optional: Confirm current user is the seller
    if (order.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the seller can complete the order' });
    }

    const isOtpValid = await bcrypt.compare(enteredOtp, order.hashedOTP);
    if (!isOtpValid) return res.status(400).json({ message: 'Incorrect OTP' });

    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('item')
      .populate('buyer', 'firstName lastName email');

    res.status(200).json(populatedOrder);
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
    const userId = req.user._id;  // assuming isAuthenticated sets req.user

    // Find order by transactionId
    const order = await Order.findOne({ transactionId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Optional: Check if the user is authorized to cancel this order
    if (order.buyer.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Only cancel if order is pending (or whatever your business rule is)
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }

    // Update order status to cancelled, and track who cancelled
    order.status = 'cancelled';
    order.cancelledBy = userId; // or more detailed user info
console.log('CancelOrder: userId:', userId);
console.log('CancelOrder: order.buyer:', order.buyer.toString());

    await order.save();
    const populatedOrder = await Order.findById(order._id)
      .populate('item') // adjust field names based on your schema
      .populate('cancelledBy', 'name email') // only populate name & email from cancelledBy
      .populate('buyer', 'name email'); // if you want buyer details too

    return res.json(populatedOrder);
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { itemId, quantity: rawQuantity } = req.body;

    if (!itemId) return res.status(400).json({ error: "itemId is required" });

    const quantity = Number(rawQuantity) || 1; // default to 1 if not provided

    if (!mongoose.Types.ObjectId.isValid(itemId))
      return res.status(400).json({ error: "Invalid itemId" });

    if (quantity <= 0)
      return res.status(400).json({ error: "Quantity must be positive" });

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{ item: itemId, quantity }],
      });
    } else {
      const index = cart.items.findIndex(
        (i) => i.item.toString() === itemId
      );

      if (index > -1) {
        cart.items[index].quantity += quantity;
      } else {
        cart.items.push({ item: itemId, quantity });
      }
    }

    await cart.save();

    // Return populated cart for frontend convenience
    const populatedCart = await Cart.findById(cart._id).populate('items.item');
    res.status(200).json(populatedCart);
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const viewCart = async (req, res) => {
  console.log("🛠 viewCart controller invoked");
  try {
    const userId = req.user.id; // fixed

    let cart = await Cart.findOne({ user: userId }).populate("items.item");

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }
    if (cart.user.toString() !== userId) {
      console.warn("Cart-user mismatch!");
      return res.status(403).json({ error: "Unauthorized cart access" });
    }
    console.log("Expected user:", userId);
    console.log("Cart belongs to:", cart?.user?.toString());
    if (cart.user.toString() !== userId) {
      console.warn("Cart belongs to another user. Creating new one.");
      cart = await Cart.create({ user: userId, items: [] });
    }


    console.log("Fetching cart for user ID:", userId);
    console.log("Found cart belongs to:", cart?.user?.toString());

    res.status(200).json(cart);
  } catch (err) {
    console.error("View cart error:", err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
};


export const removeFromCart = async (req, res) => {
  const itemId = req.body.itemId?.toString();
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
  }

  if (!itemId) return res.status(400).json({ message: 'Missing itemId' });

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(ci => ci.item.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // If quantity > 1, decrement it; else remove the item
    if (cart.items[itemIndex].quantity > 1) {
      cart.items[itemIndex].quantity -= 1;
    } else {
      cart.items.splice(itemIndex, 1);
    }

    await cart.save();
    const updatedCart = await Cart.findOne({ user: userId }).populate("items.item");

    res.status(200).json({ message: 'Item quantity updated / removed from cart', cart: updatedCart });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update cart', error: err.message });
  }
};


export const checkout = async (req, res) => {
  const { items } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
  }

  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Step 1: Validate items exist in the user's cart
    const userCart = await Cart.findOne({ user: userId });
    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const cartItemIds = userCart.items.map(ci => ci.item.toString());
    const invalidItems = items.filter(itemId => !cartItemIds.includes(itemId.toString()));

    if (invalidItems.length > 0) {
      return res.status(400).json({
        message: 'Some items are not in your cart',
        invalidItems,
      });
    }

    // Step 2: Fetch item details and group by seller
    const fetchedItems = await Item.find({ _id: { $in: items } }).populate('seller');

    const itemsBySeller = {};
    for (const item of fetchedItems) {
      if (!item.seller || !item.seller._id) {
  return res.status(400).json({ message: 'Item has no seller info', itemId: item._id });
}
const sellerId = item.seller._id.toString();


      if (sellerId === userId) {
        return res.status(400).json({ message: 'Cannot buy your own item', itemId: item._id });
      }

      if (!itemsBySeller[sellerId]) itemsBySeller[sellerId] = [];
      itemsBySeller[sellerId].push(item);
    }

    // Step 3: Create individual orders with unique OTPs
    const orders = [];

    for (const sellerId in itemsBySeller) {
      for (const item of itemsBySeller[sellerId]) {
        const transactionId = uuidv4();
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOTP = await bcrypt.hash(generatedOtp, 10);

        const order = new Order({
          transactionId,
          buyer: userId,
          seller: sellerId,
          item: item._id,
          amount: item.price,
          hashedOTP,
          otp: generatedOtp, // ⚠️ For testing/debugging only
        });

        const savedOrder = await order.save();
        orders.push({
          order: savedOrder,
          otp: generatedOtp, // ✅ Individual OTP per order
        });
      }
    }

    // Step 4: Remove purchased items from cart
    await Cart.updateOne(
      { user: userId },
      { $pull: { items: { item: { $in: items } } } }
    );

    res.status(201).json({
      message: 'Orders placed successfully',
      orders, // each with its own OTP
    });

  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ message: 'Checkout failed', error: err.message });
  }
};



export const checkoutAllItems = async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
  }

  try {
    // 🧩 Step 1: Get user's cart
    const userCart = await Cart.findOne({ user: userId }).populate('items.item');
    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // 🧩 Step 2: Group items by seller and validate
    const itemsBySeller = {};
    for (const cartItem of userCart.items) {
      const item = cartItem.item;
      await item.populate('seller');

      if (item.seller._id.toString() === userId.toString()) {
        return res.status(400).json({ message: 'Cannot buy your own item', itemId: item._id });
      }

      const sellerId = item.seller._id.toString();
      if (!itemsBySeller[sellerId]) itemsBySeller[sellerId] = [];
      itemsBySeller[sellerId].push(item);
    }

    // 🧩 Step 3: Generate OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(generatedOtp, 10);

    const orders = [];

    // 🧩 Step 4: Create orders
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
          otp: generatedOtp, // for internal visibility/testing/debugging
        });

        const savedOrder = await order.save();
        orders.push(savedOrder);
      }
    }

    // 🧩 Step 5: Clear the cart
    await Cart.updateOne({ user: userId }, { $set: { items: [] } });

    res.status(201).json({
      message: 'All items checked out successfully',
      orders,
      otp: generatedOtp // 🔑 Return to buyer so they can give to seller for order completion
    });
  } catch (err) {
    res.status(500).json({ message: 'Checkout failed', error: err.message });
  }
};



export const getPlacedOrders = async (req, res) => {
  const { userId } = req.params;
  try {
    const orders = await Order.find({ buyer: userId }).populate('item seller');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
};

export const getSoldOrders = async (req, res) => {
  const { userId } = req.params;
  try {
    const orders = await Order.find({
      seller: userId,
      status: 'pending'
    }).populate('item buyer');

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
};
export const getCancelledOrders = async (req, res) => {
  const { userId } = req.params;
  try {
    const orders = await Order.find({ buyer: userId, status: 'cancelled' })
      .populate('item seller cancelledBy');  // populate item, seller, and cancelledBy references
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cancelled orders', error: err.message });
  }
};



export const verifyDeliveryOTP = async (req, res) => {
  const { transactionId, otp } = req.body;

  if (!transactionId || !otp) {
    return res.status(400).json({ message: "Transaction ID and OTP are required." });
  }

  try {
    const order = await Order.findOne({ transactionId });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const isOtpValid = await bcrypt.compare(otp, order.hashedOTP);
    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP." });
    }


    order.status = 'completed';
    await order.save();

    return res.status(200).json({ message: "Delivery completed successfully." });
  } catch (error) {
    console.error("OTP verification error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};
