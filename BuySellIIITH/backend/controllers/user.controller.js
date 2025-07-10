import { User } from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from "axios";
import { parseStringPromise } from 'xml2js';

// import CASAuthentication from 'cas-authentication';

// Setup CAS instance
// const cas = new CASAuthentication({
//   cas_url: "https://login.iiit.ac.in/cas",
//   service_url: "http://localhost:8000/api/v1/user/cas-login", // frontend should redirect to this
//   cas_version: "3.0"
// });

// REGISTER
// REGISTER
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ========== REGISTER ==========
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, age, contactNumber, password } = req.body;
    const trimmedEmail = email?.trim();

    // Validate required fields
    if (!firstName || !lastName || !trimmedEmail || !age || !contactNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email: trimmedEmail,
      age,
      contactNumber,
      passwordHash: hashedPassword
    });

    await newUser.save();

    // Generate token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Set cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    // Send response
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email
      }
    });

  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

// ========== LOGIN ==========
// login controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = email?.trim();

    if (!trimmedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Change here: sign token with { id: user._id }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        contactNumber: user.contactNumber,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error during login."
    });
  }
};

// LOGOUT
export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production"
    });

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ message: "Server error during logout." });
  }
};

// UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, age, contactNumber } = req.body;

    if (!firstName || !lastName || !age || !contactNumber) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, age, contactNumber },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        age: updatedUser.age,
        contactNumber: updatedUser.contactNumber
      }
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({ message: "Server error during profile update." });
  }
};

// CAS LOGIN
// NEW CAS login controller
export const casLogin = async (req, res) => {
  try {
    const { ticket } = req.query;
    const service = 'http://localhost:5174/cas-callback'; // Must match what's sent to CAS

    const validateUrl = `https://login.iiit.ac.in/cas/serviceValidate?ticket=${ticket}&service=${encodeURIComponent(service)}`;
    const response = await axios.get(validateUrl);
    const xml = response.data;

    const parsed = await parseStringPromise(xml);
    const success = parsed['cas:serviceResponse']?.['cas:authenticationSuccess'];

    if (!success) {
      return res.status(401).json({ message: 'CAS validation failed' });
    }

    const username = success[0]['cas:user'][0];
    const email = username.includes('@') ? username : `${username}@iiit.ac.in`;

    let firstName = '';
    let lastName = '';

    if (username.includes('@')) {
      const [namePart] = username.split('@');
      const parts = namePart.split('.');
      firstName = parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1);
      lastName = parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1);
    } else {
      firstName = username;
      lastName = '';
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (!user) {
      // If not, create a new one with dummy details (you can customize this)
      user = await User.create({
        firstName,
        lastName,
        email,
        age: 0,
        contactNumber: '',
        passwordHash: await bcrypt.hash('casuser', 10)
      });
    }

    // Generate real JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      message: "CAS login successful"
    });

  } catch (error) {
    console.error("CAS login error:", error);
    return res.status(500).json({ message: 'Internal server error during CAS login' });
  }
};

// GET PROFILE
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        contactNumber: user.contactNumber
      }
    });
  } catch (error) {
    console.error("Get profile error:", error.message);
    res.status(500).json({ message: "Server error fetching profile." });
  }
};
