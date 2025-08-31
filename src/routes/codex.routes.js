import express from "express";
import mongoose from "mongoose";
import requireAuth from "../middleware/requireAuth.js";
import Codex from "../models/Codex.js";

const router = express.Router();

// helpers
function badRequest(msg) {
  const err = new Error(msg);
  err.status = 400;
  return err;
}
const isValidId = (id) => mongoose.isValidObjectId(id);

// POST /api/codex  (create)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, body } = req.body || {};
    if (!title || !body) throw badRequest("title and body are required");
    if (title.length > 120) throw badRequest("title too long");
    if (body.length > 5000) throw badRequest("body too long");

    const item = await Codex.create({
      owner: req.user._id,
      title: title.trim(),
      body: body.trim(),
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

// GET /api/codex  (list with search + pagination)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, q = "" } = req.query;
    const filter = { owner: req.user._id };
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { body:  { $regex: q, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Codex.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Codex.countDocuments(filter),
    ]);

    res.json({
      items,
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit) || 1),
    });
  } catch (err) { next(err); }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const item = await Codex.findOne({ _id: id, owner: req.user._id });
    if (!item) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.json(item);
  } catch (err) { next(err); }
});

// PUT /api/codex/:id
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, body } = req.body || {};
    if (!isValidId(id)) throw badRequest("invalid id");
    if (!title && !body) throw badRequest("nothing to update");

    const updates = {};
    if (title) {
      if (title.length > 120) throw badRequest("title too long");
      updates.title = title.trim();
    }
    if (body) {
      if (body.length > 5000) throw badRequest("body too long");
      updates.body = body.trim();
    }

    const item = await Codex.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { $set: updates },
      { new: true }
    );
    if (!item) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.json(item);
  } catch (err) { next(err); }
});

// DELETE /api/codex/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const result = await Codex.deleteOne({ _id: id, owner: req.user._id });
    if (result.deletedCount === 0) {
      const e = new Error("Not found"); e.status = 404; throw e;
    }
    res.status(204).end();
  } catch (err) { next(err); }
});

// (You’ll add GET/:id, PUT/:id, DELETE/:id after you test create/list)
export default router;