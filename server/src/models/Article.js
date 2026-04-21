import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    excerpt: { type: String, default: '' },
    content: { type: String, default: '' },
    source: { type: String, default: '' },
    url: { type: String, default: '' },
    tags: { type: [String], default: [] },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

export const Article = mongoose.model('Article', ArticleSchema);

