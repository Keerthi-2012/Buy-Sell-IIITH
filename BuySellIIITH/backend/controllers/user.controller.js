import { User } from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from "axios";
import CASAuthentication from 'cas-authentication';

// Setup CAS instance
const cas = new CASAuthentication({
  cas_url: "https://login.iiit.ac.in/cas",
  service_url: "http://localhost:8000/api/v1/user/cas-login", // frontend should redirect to this
  cas_version: "3.0"
});

// REGISTER
// REGISTER
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, age, contactNumber, password } = req.body;
    const trimmedEmail = email?.trim();

    if (!firstName || !lastName || !trimmedEmail || !age || !contactNumber || !password) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ 
        success: false,
        message: "Please enter a valid email address." 
      });
    }

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "User with this email already exists" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email: trimmedEmail,
      age,
      contactNumber,
      passwordHash: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: { firstName, lastName, email: trimmedEmail },
    });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Internal Server Error" 
    });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_secret", {
      expiresIn: "7d"
    });

    // ✅ Send token in body
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error during login." });
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
export const casLogin = [cas.bounce, async (req, res) => {
  try {
    const casUsername = req.session[cas.session_name]; // e.g., abcd123
    const email = `${casUsername}@iiit.ac.in`;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        firstName: casUsername,
        lastName: "",
        email,
        age: 0,
        contactNumber: "",
        passwordHash: "" // no password
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Logged in via CAS",
      user: {
        id: user._id,
        email: user.email,
        name: user.firstName
      }
    });
  } catch (err) {
    console.error("CAS Login Error:", err);
    res.status(500).json({ message: "CAS login failed" });
  }
}];


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
