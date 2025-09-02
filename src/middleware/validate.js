import { ZodError } from "zod";

export function validate(schema, where = "body") {
  return (req, _res, next) => {
    try {
      const data = schema.parse(where === "query" ? req.query : req.body);
      if (where === "query") req.query = data;
      else req.body = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const e = new Error(err.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
        e.status = 400;
        return next(e);
      }
      next(err);
    }
  };
}