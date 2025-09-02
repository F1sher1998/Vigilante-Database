import express from "express";
import mongoose from "mongoose";
import requireAuth from "../middleware/requireAuth.js";
import Criminal from "../models/Criminal.js";

const router = express.Router();

const badRequest = (msg) => Object.assign(new Error(msg), { status: 400 });
const isValidId = (id) => mongoose.isValidObjectId(id);

// POST /api/criminals  (create)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, aliases = [], crimes = [], status = "unknown", threatLevel = 3, lastSeen, notes } = req.body || {};
    if (!name) throw badRequest("name is required");

    const clean = {
      owner: req.user._id,
      name: name.trim(),
      aliases: aliases.map((a) => String(a).trim()).filter(Boolean),
      crimes: crimes.map((c) => String(c).trim()).filter(Boolean),
      status,
      threatLevel: Number(threatLevel),
      notes: notes?.trim(),
    };
    if (lastSeen) clean.lastSeen = new Date(lastSeen);

    const doc = await Criminal.create(clean);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// GET /api/criminals  (list + filters + pagination + sorting)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      q = "",              // free-text search across name/aliases/crimes
      status,              // filter by status
      minThreat,           // filter by threatLevel >=
      maxThreat,           // filter by threatLevel <=
      sort = "-createdAt", // e.g. "-threatLevel", "name", "-updatedAt"
    } = req.query;

    const filter = { owner: req.user._id };

    if (q) {
      // regex-based search (works without text index)
      filter.$or = [
        { name:    { $regex: q, $options: "i" } },
        { aliases: { $elemMatch: { $regex: q, $options: "i" } } },
        { crimes:  { $elemMatch: { $regex: q, $options: "i" } } },
      ];
      // If you switched to $text search later:
      // filter.$text = { $search: q };
    }

    if (status) filter.status = status;
    if (minThreat) filter.threatLevel = { ...(filter.threatLevel || {}), $gte: Number(minThreat) };
    if (maxThreat) filter.threatLevel = { ...(filter.threatLevel || {}), $lte: Number(maxThreat) };

    const skip = (Number(page) - 1) * Number(limit);

    // Build sort object (support leading '-' for desc)
    const sortObj = {};
    for (const key of String(sort).split(",")) {
      const k = key.trim();
      if (!k) continue;
      if (k.startsWith("-")) sortObj[k.slice(1)] = -1;
      else sortObj[k] = 1;
    }

    const [items, total] = await Promise.all([
      Criminal.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Criminal.countDocuments(filter),
    ]);

    res.json({
      items,
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.max(1, Math.ceil(total / Number(limit))),
    });
  } catch (err) { next(err); }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const doc = await Criminal.findOne({ _id: id, owner: req.user._id });
    if (!doc) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.json(doc);
  } catch (err) { next(err); }
});

// PUT /api/criminals/:id
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");

    const allowed = ["name", "aliases", "crimes", "status", "threatLevel", "lastSeen", "notes"];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

    if (updates.name) updates.name = String(updates.name).trim();
    if (updates.aliases) updates.aliases = updates.aliases.map((a) => String(a).trim()).filter(Boolean);
    if (updates.crimes) updates.crimes = updates.crimes.map((c) => String(c).trim()).filter(Boolean);
    if (updates.notes) updates.notes = String(updates.notes).trim();
    if (updates.lastSeen) updates.lastSeen = new Date(updates.lastSeen);

    const doc = await Criminal.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { $set: updates },
      { new: true }
    );

    if (!doc) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.json(doc);
  } catch (err) { next(err); }
});

// DELETE /api/criminals/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const result = await Criminal.deleteOne({ _id: id, owner: req.user._id });
    if (result.deletedCount === 0) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;