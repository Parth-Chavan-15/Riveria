const connectDB = require('../server/config/db');
const app = require('../server/server');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Vercel Serverless Database Connection Error:', err);
  }
  return app(req, res);
};
