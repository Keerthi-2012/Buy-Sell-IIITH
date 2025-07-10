import express from 'express';
import {
  createItem,
  getAllItems,
  getItemById,
  getItemCategories,
  updateItem,
  deleteItem
} from '../controllers/item.controller.js';
import isAuthenticated from '../middleware/isAuthenticated.js';

const router = express.Router();

// Public routes
router.get('/', getAllItems);                     // ✅ GET /api/items
router.get('/categories', getItemCategories);     // ✅ GET /api/items/categories

// Protected routes
router.post('/create', isAuthenticated, createItem);         // ✅ POST /api/items/create
router.put('/update/:id', isAuthenticated, updateItem);      // ✅ PUT /api/items/update/:id
router.delete('/delete/:id', isAuthenticated, deleteItem);   // ✅ DELETE /api/items/delete/:id

// ⚠️ Move this to the end
router.get('/:id', getItemById);       // ✅ GET /api/items/:id

export default router;
