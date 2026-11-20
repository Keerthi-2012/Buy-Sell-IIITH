import { AppError } from "../utils/AppError.js";

// Checks params/query/body against zod schemas; the cleaned values land on req.valid.
export const validate = (schemas) => (req, _res, next) => {
  req.valid = {};
  for (const part of ["params", "query", "body"]) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      // The first problem becomes the message; the full list rides along in `errors`.
      return next(new AppError(400, errors[0]?.message || "Invalid input", { errors }));
    }
    req.valid[part] = result.data;
  }
  next();
};
