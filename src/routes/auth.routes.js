import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();
const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    {sub: user._id.toString(), username: user.username},
    process.env.JWT_SECRET,
    {expiresIn: "1d"}
  );
}

router.post("/register", async (req, res, next) => {
  try{
    const { username, password } = req.body || {};
    if (!username || !password) {
      const err = new Error("Missing username or password");
      err.status = 400;
      throw err;
    }
    if (password.length < 25) {
      const err = new Error("Password must be at least 25 characters");
      err.status = 400;
      throw err;
    }
    const exists = await User.findOne({ username: username.toLowerCase().trim() });
    if(exists) {
      const err = new Error("Username already exists");
      err.status = 409;
      throw err;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ username, passwordHash });

    const token = signToken(user);
    res.status(201).json({ user: user.toJSON(), token });
  } catch(err){
    next(err);
  }
})

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      const err = new Error("Username and password are required");
      err.status = 400;
      throw err;
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      const err = new Error("Invalid credentials");
      err.status = 401;
      throw err;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const err = new Error("Invalid credentials");
      err.status = 401;
      throw err;
    }

    const token = signToken(user);
    res.json({ user: user.toJSON(), token });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me(protected)
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user }); // from requireAuth
});

export default router;