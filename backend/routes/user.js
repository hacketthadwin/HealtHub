const express = require('express');
const router = express.Router();
const { login, signup } = require('../controller/userController');
const { auth, isDoctor, isPatient } = require('../middlewares/authMiddleware');
const { createTask, getTasksLast7Days, updateTaskCompletion } = require('../controller/taskController');
const { newProblem, answerProblem, fetchProblem, getAllProblems } = require('../controller/communityController');
const { getAllUsers } = require('../controller/fetchUsers');

router.post('/login', login);
router.post('/signup', signup);

router.get('/test', auth, (req, res) => {
  res.status(200).json({ success: true, message: 'Protected route accessed successfully' });
});

router.get('/doctor', auth, isDoctor, (req, res) => {
  res.status(200).json({ success: true, message: 'Doctor route accessed successfully' });
});
router.get('/patient', auth, isPatient, (req, res) => {
  res.status(200).json({ success: true, message: 'Patient route accessed successfully' });
});

router.post('/post-tasks', auth, createTask);         // Requires authentication
router.get('/get-7days-tasks', auth, getTasksLast7Days); // REQUIRES AUTHENTICATION
router.patch('/tasks/:id', auth, updateTaskCompletion); // Requires authentication

router.post('/community/problem', auth, newProblem);
router.post('/community/answer/:problemId', auth, answerProblem);
router.get('/community/problem/:id', fetchProblem);
router.get('/community/problems', getAllProblems);

router.get('/book-appointment/users', auth, isPatient, getAllUsers);

module.exports = router;