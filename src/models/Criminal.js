import mongoose from 'mongoose';

const criminalSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120, index: true },
  aliases: [{ type: String, trim: true, maxlength: 120 }],
  crimes: [{ type: String, trim: true, maxlength: 200 }],
  status: { type: String, enum: ["free", "captured", "unknown"], default: "unknown", index: true },
  threatLevel: { type: Number, min: 1, max: 5, default: 3, index: true },
  lastSeen: { type: Date },
  notes: { type: String, trim: true, maxlength: 5000 },
},
  {timestamps: true}
);

criminalSchema.index({ name: "text", aliases: "text", crimes: "text" });

criminalSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Criminal = mongoose.model("Criminal", criminalSchema);
export default Criminal;