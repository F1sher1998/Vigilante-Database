import mongoose from "mongoose";

export const isValidId = (id) => mongoose.isValidObjectId(id);

export async function ensureOwnsAll(ids, Model, ownerId) {
  const unique = Array.from(new Set(ids.filter(isValidId)));
  if (unique.length === 0) return []; // nothing to check
  const count = await Model.countDocuments({ _id: { $in: unique }, owner: ownerId });
  if (count !== unique.length) {
    const err = new Error("One or more referenced documents are invalid or not owned by the user");
    err.status = 400;
    throw err;
  }
  return unique;
}
