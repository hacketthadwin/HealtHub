const User = require("../models/userModel");

exports.getAllUsers = async (req, res) => {
  try {
    console.log('Received request with query:', req.query);
    const { role } = req.query;
    console.log('Extracted role:', role);

    const validRoles = ['Doctor'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const query = role ? { role } : {}; // dynamically use role if provided
    console.log('Constructed query:', query);

    // CORRECTED LINE: Removed '-_id' from the select statement
    const users = await User.find(query).select('name role'); // Now _id will be included by default
    console.log('Raw query result count:', users.length);
    console.log('Query result (with _id):', users); // Log to confirm _id is present

    if (users.length === 0) {
      return res.status(200).json({ message: 'No users found', data: [] });
    }

    res.status(200).json({ data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

