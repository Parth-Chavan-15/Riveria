const connectDB = require('../server/config/db');
const { app } = require('../server/server');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (dbErr) {
    console.error('Vercel Serverless Database Connection Error:', dbErr);
  }
  return app(req, res);
};
