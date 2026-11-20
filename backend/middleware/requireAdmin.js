import { AppError } from "../utils/AppError.js";
import { isAdminUser } from "../utils/roles.js";

// Use after isAuthenticated: lets admins through and turns everyone else away.
const requireAdmin = (req, _res, next) =>
  isAdminUser(req.user) ? next() : next(new AppError(403, "Admin access required"));

export default requireAdmin;
