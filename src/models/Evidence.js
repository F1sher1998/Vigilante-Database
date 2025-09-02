import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema(
  {
    owner:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:   { type: String, required: true, trim: true, maxlength: 160 },
    type:    { type: String, enum: ["image","video","audio","doc","note","link"], default: "note", index: true },
    url:     { type: String, trim: true },           // use for image/video/doc/link
    content: { type: String, trim: true, maxlength: 10000 }, // textual notes/transcripts
    tags:    [{ type: String, trim: true, maxlength: 40 }],
  },
  { timestamps: true }
);

evidenceSchema.index({ title: "text", tags: "text" });

evidenceSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id; delete ret.__v;
    return ret;
  }
});

const Evidence = mongoose.model("Evidence", evidenceSchema);
export default Evidence;