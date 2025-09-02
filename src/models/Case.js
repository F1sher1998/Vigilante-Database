import mongoose from "mongoose";

const caseSchema = new mongoose.Schema(
  {
    owner:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:    { type: String, required: true, trim: true, maxlength: 160 },
    summary:  { type: String, trim: true, maxlength: 5000 },
    status:   { type: String, enum: ["open", "cold", "closed"], default: "open", index: true },
    priority: { type: Number, min: 1, max: 5, default: 3, index: true },
    suspects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Criminal" }],
    evidence: [{ type: mongoose.Schema.Types.ObjectId, ref: "Evidence" }],
    openedAt: { type: Date, default: () => new Date() },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

caseSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Case", caseSchema);
