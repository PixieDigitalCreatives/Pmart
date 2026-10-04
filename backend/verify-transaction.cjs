const mongoose = require('mongoose');

async function testTransaction() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect('mongodb://127.0.0.1:27017/pmart?replicaSet=rs0');
    console.log("MongoDB connected.");

    const session = await mongoose.startSession();
    session.startTransaction();
    console.log("Transaction started successfully.");

    // simple write
    const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));
    await TestModel.create([{ name: "txn-test" }], { session });
    
    await session.commitTransaction();
    console.log("Transaction committed successfully.");
    
    // clean up
    await TestModel.deleteOne({ name: "txn-test" });
    session.endSession();
  } catch (error) {
    console.error("Transaction test failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testTransaction();
