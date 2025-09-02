import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { notFound, errorHandler } from "./middleware/error.js";
import authRouter from "./routes/auth.routes.js";
import codexRouter from "./routes/codex.routes.js";
import criminalsRouter from "./routes/criminals.routes.js";
import evidenceRouter from "./routes/evidence.routes.js";
import casesRouter from "./routes/cases.routes.js";

const app = express();

/** CORS: tighten in prod */
const allowedOrigin = process.env.FRONTEND_ORIGIN || true; // e.g. "https://your-app.vercel.app"
app.use(cors({ origin: allowedOrigin, credentials: true }));

/** Security headers */
app.use(helmet());

/** Prevent HTTP Parameter Pollution (?a=1&a=2) */
app.use(hpp());

/** Mongo injection sanitization ($ and . stripped from keys) */
app.use(mongoSanitize());

/** Gzip responses */
app.use(compression());

/** Parse JSON */
app.use(express.json({ limit: "200kb" }));

/** Rate limits */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,                  // 300 req / window / IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Tighter rate-limit for auth routes
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { message: "Too many auth requests, try again later." },
});
app.use("/api/auth", authLimiter);

/** Health */
app.get("/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "unknown" });
});

/** Routers */
app.use("/api/auth", authRouter);
app.use("/api/codex", codexRouter);
app.use("/api/criminals", criminalsRouter);
app.use("/api/evidence", evidenceRouter);
app.use("/api/cases", casesRouter);

/** 404 + errors */
app.use(notFound);
app.use(errorHandler);

export default app;