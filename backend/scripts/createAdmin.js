// Creates (or updates) an Admin account. Admins cannot be created through the public signup form.
//
//   node scripts/createAdmin.js "Your Name" you@example.com
//
// The password is asked for in the terminal (hidden). To run it non-interactively set ADMIN_PASSWORD:
//   PowerShell:  $env:ADMIN_PASSWORD="your-password"; node scripts/createAdmin.js "Your Name" you@example.com
//   Mac/Linux:   ADMIN_PASSWORD='your-password' node scripts/createAdmin.js "Your Name" you@example.com
//
// It uses DATABASE_URL from backend/.env — make sure that is the same database your deployed site uses.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const readline = require("readline");

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.stdoutMuted = false;
    rl._writeToOutput = function (text) {
      if (rl.stdoutMuted) rl.output.write(text.includes("\n") ? text : "*");
      else rl.output.write(text);
    };
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
    rl.stdoutMuted = true;
  });
}

async function main() {
  const mongoose = require("mongoose");
  const bcrypt   = require("bcrypt");
  const User     = require("../models/userModel");

  const [name, email] = process.argv.slice(2);
  if (!name || !email) {
    console.error('Usage: node scripts/createAdmin.js "Your Name" you@example.com');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing. Put it in backend/.env first.");
    process.exit(1);
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await askHidden("Choose an admin password (10+ characters): ");
    const again = await askHidden("Type it again: ");
    if (password !== again) { console.error("Passwords do not match."); process.exit(1); }
  }
  if (password.length < 10) { console.error("The password must be at least 10 characters."); process.exit(1); }

  await mongoose.connect(process.env.DATABASE_URL);
  const hash = await bcrypt.hash(password, 10);

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "Admin") {
      console.error(`${email} is already registered as a ${existing.role}. Use a different email for the admin account.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    existing.password = hash;
    existing.name = name;
    await existing.save();
    console.log(`Updated admin ${email}`);
  } else {
    await User.create({ name, email, password: hash, role: "Admin" });
    console.log(`Created admin ${email}`);
  }
  console.log("Now sign in at /login with this email and password. You will land on /admin.");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });