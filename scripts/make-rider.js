import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config({ path: "backend/.env" });

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false, collection: "users" }));
  const res = await User.updateMany({ role: "CUSTOMER" }, { $set: { role: "RIDER" } });
  console.log("Updated customers to RIDER:", res);
  process.exit(0);
};
run();
