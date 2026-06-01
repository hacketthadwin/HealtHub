const { Problem, Answer } = require('../models/community');

// communityController.js
exports.newProblem = async (req, res) => {
  console.log('➡️ newProblem reached. body:', req.body);
  try {
    const problem = await Problem.create({
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags,
      author: req.user.id
    });
    console.log('✅ Created problem:', problem);
    return res.status(201).json(problem);
  } catch (err) {
    console.error('❌ newProblem error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.answerProblem = async (req, res) => {
  try {
    const { content } = req.body;
    const problemId = req.params.problemId;
    const authorId = req.user.id; // from auth middleware

    // 1. Create the new answer
    const newAnswer = await Answer.create({
      content,
      author: authorId,
      problemId: problemId
    });

    // 2. Find the parent Problem and push the new answer's ID into its 'answers' array
    await Problem.findByIdAndUpdate(
      problemId,
      {
        $push: { answers: newAnswer._id }
      },
      { new: true } // This option is good practice but not essential here
    );
    
    // 3. Populate the author details for the new answer before sending it back
    const populatedAnswer = await Answer.findById(newAnswer._id).populate('author', 'name');

    res.status(201).json(populatedAnswer);
  } catch (err) {
    console.error('Error submitting answer:', err);
    res.status(500).json({ error: err.message });
  }
};

// === VERIFY THIS CONTROLLER IS CORRECT ===
exports.getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find()
      .sort({ createdAt: -1 })
      .populate('author', 'name') // Populate the author of the question
      .populate({
        path: 'answers',         // Populate the answers array
        populate: {
          path: 'author',        // In each answer, populate its author
          select: 'name'         // And only get the author's name
        }
      });
      
    res.json(problems);
  } catch (err) {
    console.error("Error fetching problems with answers:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.fetchProblem=async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).populate('author', 'name');
    const answers = await Answer.find({ problemId: req.params.id }).populate('author', 'name');
    res.json({ problem, answers });
  } catch (err) {
    res.status(404).json({ error: 'Problem not found' });
  }
}


