// routes/cas.route.js
import express from 'express';
import cas from '../middleware/cas.js';
import {User} from '../models/user.model.js'; // <-- adjust if you use a different path

const router = express.Router();

// CAS login route
router.get('/login', cas.bounce, async (req, res) => {
  const casUsername = req.session[cas.session_name]; // typically "abc123"

  // Build email based on IIIT format
  const email = `${casUsername}@iiit.ac.in`;

  // Auto-create user if not found
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      firstName: casUsername,
      lastName: '',
      email,
      age: 0,
      contactNumber: '',
      passwordHash: '', // no password needed for CAS
    });
    await user.save();
  }

  // Return session info
  res.status(200).json({
    message: 'Logged in via CAS',
    user: {
      id: user._id,
      email: user.email,
      name: user.firstName,
    }
  });
});

// CAS logout
router.get('/logout', cas.logout);

export default router;
