const Task = require('../models/tasks'); // Ensure this path is correct

// Controller to create a new task for the authenticated user
exports.createTask = async (req, res) => {
    try {
        const { name, completed, date } = req.body;
        
        // Extract userId from the authenticated request payload.
        // It's crucial that your JWT authentication middleware (`auth` in your case)
        // successfully decodes the token and attaches the user's ID to `req.user.id`.
        const userId = req.user.id; 

        // Validate if userId is present. If the auth middleware failed or the token
        // didn't contain the ID, this prevents further issues.
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated or user ID missing from token."
            });
        }

        // Determine the task date. If not provided, use today's date in YYYY-MM-DD format.
        const taskDate = date || new Date().toISOString().split('T')[0];

        // --- Logic for 7-day task limit per user ---
        // Get all unique dates for tasks belonging to the current user.
        const existingDates = await Task.distinct("date", { userId: userId }); 

        // If the current taskDate is not among the existing dates for this user
        if (!existingDates.includes(taskDate)) {
            // If the user already has tasks for 7 distinct dates
            if (existingDates.length >= 7) {
                // Find the oldest task date for this specific user
                const oldestTask = await Task.findOne({ userId: userId }).sort({ date: 1 });
                if (oldestTask) {
                    // Delete all tasks associated with that oldest date AND this user
                    await Task.deleteMany({ date: oldestTask.date, userId: userId }); 
                }
            }
        }

        // Create the new task, explicitly associating it with the current user's ID.
        const newTask = await Task.create({ name, completed, date: taskDate, userId: userId });

        res.status(200).json({
            success: true,
            message: "Task created successfully",
            data: newTask
        });

    } catch (err) {
        console.error("Task creation error:", err);
        res.status(500).json({
            success: false,
            message: "Task could not be created",
            error: err.message
        });
    }
};

// Controller to get tasks for the last 7 days for the authenticated user
exports.getTasksLast7Days = async (req, res) => {
    try {
        // Extract userId from the authenticated request.
        const userId = req.user.id; 

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated or user ID missing from token."
            });
        }

        // Calculate the date range (today and 6 days prior)
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6); // 6 days ago + today = 7 days

        // Helper function to format date into YYYY-MM-DD string
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        const startDate = formatDate(sevenDaysAgo);
        const endDate = formatDate(today);

        console.log(`Fetching tasks between ${startDate} and ${endDate} for user ${userId}`);

        // Fetch tasks for the current user within the 7-day date range.
        const tasks = await Task.find({
            userId: userId, // Filter by the authenticated user's ID
            date: { $gte: startDate, $lte: endDate } // Filter by date range
        }).sort({ date: -1 }); // Sort by date in descending order

        console.log(`Found ${tasks.length} tasks for user ${userId}`);
        
        res.status(200).json({
            success: true,
            message: "Fetched tasks from the last 7 days",
            data: tasks,
        });
    } catch (err) {
        console.error("Error fetching tasks:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch tasks",
            error: err.message
        });
    }
};

// Controller to update the completion status of a specific task for the authenticated user
exports.updateTaskCompletion = async (req, res) => {
    try {
        const { completed } = req.body;
        // Extract userId from the authenticated request.
        const userId = req.user.id; 

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated or user ID missing from token."
            });
        }

        // Find and update the task. The key here is to find by both the task's _id
        // AND the authenticated user's userId, preventing users from updating others' tasks.
        const updated = await Task.findOneAndUpdate(
            { _id: req.params.id, userId: userId }, // Find by task ID AND user ID
            { completed }, // Update the 'completed' field
            { new: true } // Return the updated document
        );
        
        // If 'updated' is null, it means no document matched the criteria.
        // This could be because:
        // 1. The task ID (req.params.id) does not exist.
        // 2. The task ID exists, but it does not belong to the authenticated user (userId).
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Task not found or you do not have permission to update it.'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: updated
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Update failed',
            error: err.message
        });
    }
};
