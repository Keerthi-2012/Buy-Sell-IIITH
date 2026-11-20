import { AppError } from "../utils/AppError.js";

// validate({ body: schema, query: schema, params: schema })
// Parsed values land on req.valid.{body,query,params}; controllers read from there.
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
      return next(new AppError(400, errors[0]?.message || "Invalid input", { errors }));
    }
    req.valid[part] = result.data;
  }
  next();
};
