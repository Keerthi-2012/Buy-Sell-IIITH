import express from 'express';
import {
  login,
  register,
  updateProfile,
  logout,
  getProfile,
  casLogin
} from '../controllers/user.controller.js';
import isAuthenticated from '../middleware/isAuthenticated.js';
import verifyRecaptcha from '../middleware/verifyRecaptcha.js';
import cas from '../middleware/cas.js';

const router = express.Router();

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/logout').get(logout);
router.get('/profile', isAuthenticated, getProfile); 
router.route('/update').post(isAuthenticated, updateProfile);

// 🟢 CAS login route
router.route('/cas-login').get(cas.bounce, casLogin);

export default router;
