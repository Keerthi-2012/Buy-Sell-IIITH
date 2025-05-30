  import jwt from "jsonwebtoken";
  import { User } from "../models/user.model.js";

  const isAuthenticated = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      let token = null;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      } else if (req.cookies?.token) {
        token = req.cookies.token;
      }

      if (!token) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // decoded should now contain `id` correctly
      if (!decoded?.id) {
        return res.status(401).json({ message: "Invalid token payload" });
      }

      const user = await User.findById(decoded.id).select("-passwordHash");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      console.log("Authenticated user ID:", user._id.toString());
      next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };

  export default isAuthenticated;
