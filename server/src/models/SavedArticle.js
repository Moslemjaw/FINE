import mongoose from 'mongoose';

const SavedArticleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
  },
  { timestamps: true }
);

SavedArticleSchema.index({ userId: 1, articleId: 1 }, { unique: true });

export const SavedArticle = mongoose.model('SavedArticle', SavedArticleSchema);

