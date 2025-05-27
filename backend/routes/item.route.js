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
router.route('/').get(getAllItems);          // GET /api/items - get all items
router.get('/categories', getItemCategories); // GET /api/v1/item/categories

router.route('/:id').get(getItemById);       // GET /api/items/:id - get a specific item

// In item.routes.js


// Protected routes
router.route('/create').post(isAuthenticated, createItem);         // POST /api/items/create - create new item
router.route('/update/:id').put(isAuthenticated, updateItem);      // PUT /api/items/update/:id - update item
router.route('/delete/:id').delete(isAuthenticated, deleteItem);   // DELETE /api/items/delete/:id - delete item

export default router;
