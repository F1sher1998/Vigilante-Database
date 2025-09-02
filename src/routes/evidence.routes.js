import express from "express";
import mongoose from "mongoose";
import requireAuth from "../middleware/requireAuth.js";
import Evidence from "../models/Evidence.js";

const router = express.Router();
const badRequest = (m) => Object.assign(new Error(m), { status: 400 });
const isValidId = (id) => mongoose.isValidObjectId(id);

// CREATE  POST /api/evidence
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, type = "note", url, content, tags = [] } = req.body || {};
    if (!title) throw badRequest("title is required");
    const doc = await Evidence.create({
      owner: req.user._id,
      title: title.trim(),
      type,
      url: url?.trim(),
      content: content?.trim(),
      tags: tags.map(t => String(t).trim()).filter(Boolean),
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// LIST   GET /api/evidence?q=&type=&tag=&page=1&limit=10&sort=-createdAt
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { page=1, limit=10, q="", type, tag, sort="-createdAt" } = req.query;
    const filter = { owner: req.user._id };
    if (q) {
      filter.$or = [
        { title:   { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
        { tags:    { $elemMatch: { $regex: q, $options: "i" } } },
      ];
    }
    if (type) filter.type = type;
    if (tag)  filter.tags = { $elemMatch: { $regex: `^${String(tag).trim()}$`, $options: "i" } };

    const skip = (Number(page)-1) * Number(limit);
    const sortObj = {};
    for (const k of String(sort).split(",")) {
      const t = k.trim(); if (!t) continue;
      sortObj[t.startsWith("-") ? t.slice(1) : t] = t.startsWith("-") ? -1 : 1;
    }

    const [items, total] = await Promise.all([
      Evidence.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Evidence.countDocuments(filter),
    ]);

    res.json({ items, page:Number(page), limit:Number(limit), total, pages: Math.max(1, Math.ceil(total/Number(limit))) });
  } catch (err) { next(err); }
});

// READ   GET /api/evidence/:id
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const doc = await Evidence.findOne({ _id:id, owner:req.user._id });
    if (!doc) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.json(doc);
  } catch (err) { next(err); }
});

// UPDATE PUT /api/evidence/:id
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const { title, type, url, content, tags } = req.body || {};
    const updates = {};
    if (title)   updates.title   = String(title).trim();
    if (type)    updates.type    = type;
    if (url)     updates.url     = String(url).trim();
    if (content) updates.content = String(content).trim();
    if (Array.isArray(tags)) updates.tags = tags.map(t=>String(t).trim()).filter(Boolean);

    const doc = await Evidence.findOneAndUpdate(
      { _id:id, owner:req.user._id },
      { $set: updates },
      { new: true }
    );
    if (!doc) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.json(doc);
  } catch (err) { next(err); }
});

// DELETE DELETE /api/evidence/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const r = await Evidence.deleteOne({ _id:id, owner:req.user._id });
    if (r.deletedCount === 0) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
