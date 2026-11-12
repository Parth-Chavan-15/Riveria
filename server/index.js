const connectDB = require('./config/db');
const app = require('./server');

// Ensure MongoDB Atlas is connected when invoked in serverless environments
let isConnected = false;
const handler = async (req, res) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('Database connection error in handler:', err);
    }
  }
  return app(req, res);
};

module.exports = handler;
module.exports.app = app;
