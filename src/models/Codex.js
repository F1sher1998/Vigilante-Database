import mongoose from "mongoose";

const codexSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body:  { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true }
);

// optional: cleaner JSON
codexSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Codex = mongoose.model("Codex", codexSchema);
export default Codex;