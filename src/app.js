import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from "./middleware/error.js";
import authRouter from "./routes/auth.routes.js";
import codexRouter from "./routes/codex.routes.js";
import criminalsRouter from "./routes/criminals.routes.js"

const app = express();

app.use(cors({ origin: true, credential: true }));
app.use(express.json());
app.use("/api/auth", authRouter)
app.use("/api/codex", codexRouter)
app.use("/api/criminals", criminalsRouter)

app.get("/health", (req, res) => {
  res.json({ ok:true, env: process.env.NODE_ENV || "unknown" })
});

app.get("/version", (req, res) => {
  res.json({ version: "1.0.0" })
});


app.use(notFound);
app.use(errorHandler);

export default app;