const connectDB = require('../server/config/db');
const app = require('../server/server');

let isConnected = false;
module.exports = async (req, res) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('Vercel Serverless Database Connection Error:', err);
    }
  }
  return app(req, res);
};
