const mongoose = require('mongoose');

const tasksSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    completed: {
        type: Boolean,
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    // NEW FIELD: userId to link tasks to a specific user
    userId: {
        type: mongoose.Schema.Types.ObjectId, // This is the correct Mongoose type for MongoDB ObjectIds
        ref: 'User', // IMPORTANT: Replace 'User' with the actual name of your User model if it's different.
                      // This creates a reference to your User collection.
        required: true, // A task must always belong to a user
    },
}, { timestamps: true }); // Adding timestamps is generally good practice for createdAt and updatedAt

module.exports = mongoose.model('Tasks', tasksSchema);