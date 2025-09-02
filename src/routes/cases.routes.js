import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import mongoose from "mongoose";
import Case from "../models/Case.js";
import Criminal from "../models/Criminal.js";
import Evidence from "../models/Evidence.js";
import { isValidId, ensureOwnsAll } from "../utils/ownership.js";

const router = express.Router();
const badRequest = (m) => Object.assign(new Error(m), { status: 400 });

// CREATE  POST /api/cases
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, summary, status = "open", priority = 3, suspects = [], evidence = [] } = req.body || {};
    if (!title) throw badRequest("title is required");

    // Ownership checks for references
    const cleanSuspects = await ensureOwnsAll(suspects, Criminal, req.user._id);
    const cleanEvidence = await ensureOwnsAll(evidence, Evidence, req.user._id);

    const doc = await Case.create({
      owner: req.user._id,
      title: String(title).trim(),
      summary: summary?.trim(),
      status,
      priority: Number(priority),
      suspects: cleanSuspects,
      evidence: cleanEvidence,
    });

    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// LIST   GET /api/cases?q=&status=&minPr=&maxPr=&page=1&limit=10&sort=-createdAt&populate=true
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { page=1, limit=10, q="", status, minPr, maxPr, sort="-createdAt", populate="false" } = req.query;
    const filter = { owner: req.user._id };
    if (q) {
      filter.$or = [
        { title:   { $regex: q, $options: "i" } },
        { summary: { $regex: q, $options: "i" } },
      ];
    }
    if (status) filter.status = status;
    if (minPr) filter.priority = { ...(filter.priority || {}), $gte: Number(minPr) };
    if (maxPr) filter.priority = { ...(filter.priority || {}), $lte: Number(maxPr) };

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = {};
    for (const key of String(sort).split(",")) {
      const k = key.trim(); if (!k) continue;
      sortObj[k.startsWith("-") ? k.slice(1) : k] = k.startsWith("-") ? -1 : 1;
    }

    let query = Case.find(filter).sort(sortObj).skip(skip).limit(Number(limit));
    if (String(populate).toLowerCase() === "true") {
      query = query
        .populate({ path: "suspects", select: "name status threatLevel" })
        .populate({ path: "evidence", select: "title type tags" });
    }

    const [items, total] = await Promise.all([
      query,
      Case.countDocuments(filter),
    ]);

    res.json({ items, page:Number(page), limit:Number(limit), total, pages: Math.max(1, Math.ceil(total/Number(limit))) });
  } catch (err) { next(err); }
});

// READ   GET /api/cases/:id?populate=true
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const doPop = String(req.query.populate || "false").toLowerCase() === "true";
    let query = Case.findOne({ _id:id, owner:req.user._id });
    if (doPop) {
      query = query
        .populate({ path: "suspects", select: "name status threatLevel" })
        .populate({ path: "evidence", select: "title type tags" });
    }
    const doc = await query;
    if (!doc) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.json(doc);
  } catch (err) { next(err); }
});

// UPDATE PUT /api/cases/:id
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");

    const { title, summary, status, priority, suspects, evidence, closedAt } = req.body || {};
    const updates = {};
    if (title)   updates.title   = String(title).trim();
    if (summary) updates.summary = String(summary).trim();
    if (status)  updates.status  = status;
    if (priority !== undefined) updates.priority = Number(priority);
    if (closedAt !== undefined) updates.closedAt = closedAt ? new Date(closedAt) : null;

    if (Array.isArray(suspects)) {
      updates.suspects = await ensureOwnsAll(suspects, Criminal, req.user._id);
    }
    if (Array.isArray(evidence)) {
      updates.evidence = await ensureOwnsAll(evidence, Evidence, req.user._id);
    }

    const doc = await Case.findOneAndUpdate(
      { _id:id, owner:req.user._id },
      { $set: updates },
      { new: true }
    );
    if (!doc) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.json(doc);
  } catch (err) { next(err); }
});

// DELETE DELETE /api/cases/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const r = await Case.deleteOne({ _id:id, owner:req.user._id });
    if (r.deletedCount === 0) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.status(204).end();
  } catch (err) { next(err); }
});

// PATCH  /api/cases/:id/close   (helper endpoint)
router.patch("/:id/close", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw badRequest("invalid id");
    const doc = await Case.findOneAndUpdate(
      { _id:id, owner:req.user._id },
      { $set: { status:"closed", closedAt:new Date() } },
      { new: true }
    );
    if (!doc) { const e = new Error("Not found"); e.status = 404; throw e; }
    res.json(doc);
  } catch (err) { next(err); }
});

// STATS  GET /api/cases/stats
router.get("/stats/summary", requireAuth, async (req, res, next) => {
  try {
    const [byStatus, byPriority] = await Promise.all([
      Case.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(req.user._id) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Case.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(req.user._id) } },
        { $group: { _id: "$priority", count: { $sum: 1 }, avgSuspects: { $avg: { $size: "$suspects" } } } },
        { $sort: { _id: 1 } }
      ]),
    ]);
    res.json({ byStatus, byPriority });
  } catch (err) { next(err); }
});

export default router;
