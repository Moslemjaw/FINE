import mongoose from 'mongoose';

const NewsSchema = new mongoose.Schema(
  {
    externalProvider: { type: String, default: '' }, // e.g. "newsdata"
    externalId: { type: String, default: '' }, // provider-specific unique id
    tag: { type: String, default: 'KUWAIT' },
    source: { type: String, required: true },
    headline: { type: String, required: true },
    body: { type: String, default: '' },
    url: { type: String, default: '' },
    publishedAt: { type: Date, default: Date.now },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

NewsSchema.index({ externalProvider: 1, externalId: 1 }, { unique: true, sparse: true });
NewsSchema.index({ publishedAt: -1 });

export const News = mongoose.model('News', NewsSchema);

