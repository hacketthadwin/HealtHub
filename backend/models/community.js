const mongoose = require('mongoose');

// === Problem Schema ===
const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  tags: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  answers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  }]

}, { timestamps: true });

// Optional: Cascade delete all answers when a problem is removed
problemSchema.pre('remove', async function (next) {
  await Answer.deleteMany({ problemId: this._id });
  next();
});

// === Answer Schema ===
const answerSchema = new mongoose.Schema({
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const Problem = mongoose.model('Problem', problemSchema);
const Answer = mongoose.model('Answer', answerSchema);

module.exports = { Problem, Answer };
