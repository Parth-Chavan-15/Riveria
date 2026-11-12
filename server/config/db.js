const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (cachedConnection) return cachedConnection;

    try {
        cachedConnection = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10_000,
            maxPoolSize: 20,
            minPoolSize: 1
        });
        console.log(`MongoDB Connected: ${cachedConnection.connection.host}`);
        return cachedConnection;
    } catch (error) {
        cachedConnection = null;
        console.error(`Error connecting to MongoDB: ${error.message}`);
        throw error;
    }
};

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('error', (error) => console.error(`MongoDB connection error: ${error.message}`));

module.exports = connectDB;
