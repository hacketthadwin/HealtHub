// Removes duplicate daily tasks that were created before the duplicate check existed.
// Duplicate = same user + same day + same task name (ignoring case and surrounding spaces).
// For each group it keeps ONE task (a completed one if any, otherwise the oldest) and deletes the rest.
//
//   node scripts/dedupeTasks.js            -> dry run: shows what would be removed
//   node scripts/dedupeTasks.js --apply    -> deletes the duplicates
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

// docs: [{ id, completed, createdAt }]  ->  ids to delete
function pickDuplicates(docs) {
  if (!docs || docs.length < 2) return [];
  const byAge = [...docs].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const keep = byAge.find((d) => d.completed) || byAge[0];
  return byAge.filter((d) => String(d.id) !== String(keep.id)).map((d) => d.id);
}

async function main() {
  const Task = require("../models/tasks");
  const APPLY = process.argv.includes("--apply");
  await mongoose.connect(process.env.DATABASE_URL);
  console.log(APPLY ? "APPLYING changes" : "DRY RUN (add --apply to delete)");

  const groups = await Task.aggregate([
    {
      $group: {
        _id: { userId: "$userId", date: "$date", key: { $toLower: { $trim: { input: "$name" } } } },
        docs: { $push: { id: "$_id", completed: "$completed", createdAt: "$createdAt" } },
        n: { $sum: 1 },
      },
    },
    { $match: { n: { $gt: 1 } } },
  ]);

  const toDelete = groups.flatMap((g) => pickDuplicates(g.docs));
  console.log(`Duplicate groups: ${groups.length} | tasks to remove: ${toDelete.length}`);
  groups.slice(0, 10).forEach((g) => console.log(`  ${g._id.date}  "${g._id.key}"  x${g.n}`));
  if (groups.length > 10) console.log(`  ...and ${groups.length - 10} more groups`);

  if (APPLY && toDelete.length) {
    const res = await Task.deleteMany({ _id: { $in: toDelete } });
    console.log(`Deleted ${res.deletedCount} duplicate tasks.`);
  }
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { pickDuplicates };