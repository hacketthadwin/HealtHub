const mongoose = require('mongoose');
require('dotenv').config();

exports.connect = () => {
    const dbURL = process.env.DATABASE_URL;

    if (!dbURL) {
        console.error("❌ DATABASE_URL not found in .env file");
        process.exit(1);
    }

    // console.log("Trying to connect to:", dbURL); // debug

    mongoose.connect(dbURL)
        .then(() => {
            console.log("✅ Database Connection established");
        })
        .catch((err) => {
            console.error("❌ Connection Issues with Database:", err.message);
            process.exit(1);
        });
};
