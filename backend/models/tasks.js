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
    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
                     
        required: true, 
    },
}, { timestamps: true });

module.exports = mongoose.model('Tasks', tasksSchema);