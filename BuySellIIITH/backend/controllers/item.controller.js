import { Item } from '../models/item.model.js';

export const createItem = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: No user found." });
    }

    const { name, price, description, category } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: "Name, price, and category are required." });
    }

    const newItem = new Item({
      name,
      price,
      description,
      category,
      seller: req.user._id, // ✅ Authenticated user's ID
    });

    const savedItem = await newItem.save();
    return res.status(201).json(savedItem);
  } catch (error) {
    console.error("Create Item Error Stack:", error.stack);
    return res.status(500).json({ error: error.message });
  }
};


// Get all items
// Get all items with optional filters and search
export const getAllItems = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort } = req.query;

    const query = {};

    // Text search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sorting
    let sortOption = {};
    if (sort === 'price_asc') sortOption.price = 1;
    else if (sort === 'price_desc') sortOption.price = -1;
    else if (sort === 'name_asc') sortOption.name = 1;
    else if (sort === 'name_desc') sortOption.name = -1;
    else sortOption.createdAt = -1; // Default sort by newest

    const items = await Item.find(query)
      .populate('seller', 'name email')
      .sort(sortOption);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// In item.controller.js
export const getItemCategories = async (req, res) => {
  try {
    const categories = await Item.distinct('category');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// Get single item by ID
export const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('seller', 'name email');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    console.log("Item seller ID:", item.seller?.toString());
    console.log("Authenticated user ID:", req.user?.id?.toString());

    if (!item.seller || !req.user || !req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: Missing user or seller info' });
    }

    if (item.seller.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    Object.assign(item, req.body);
    const updatedItem = await item.save();
    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Update failed' });
  }
};


// Delete an item
export const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Optional: only allow the seller to delete
    if (item.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await item.deleteOne();
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
