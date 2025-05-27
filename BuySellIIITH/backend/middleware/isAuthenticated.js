import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js"; // adjust the path as needed

const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("Incoming headers:", req.headers);
    console.log("Authorization Header:", req.headers.authorization);
    console.log("Cookies:", req.cookies);

    let token = null;

if (req.cookies?.token) {
  token = req.cookies.token;
} else if (authHeader?.startsWith("Bearer ")) {
  token = authHeader.split(" ")[1];
}

    if (!token) {
      console.log("Extracted token:", token);

      return res.status(401).json({ message: "User not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default isAuthenticated;
