import mongoose from "mongoose";
import dotenv from "dotenv";

// Initialize environment variables
dotenv.config();

const connectDB = async () => {
  try {
    // Validate MongoDB URI exists
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    // Enhanced connection options
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      heartbeatFrequencyMS: 10000, // Keep connection alive
      retryWrites: true,
      w: 'majority'
    };

    console.log("Attempting to connect to MongoDB...");
    
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(
      `✅ MongoDB connected successfully! DB HOST: ${connectionInstance.connection.host}`
    );
    console.log(`📊 Database name: ${connectionInstance.connection.name}`);
    
    // Set up event listeners for connection issues
    mongoose.connection.on('error', err => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔁 MongoDB reconnected');
    });
    
    return connectionInstance;
    
  } catch (error) {
    console.error("❌ MONGODB connection failed:", error.message);
    
    // Provide more specific error messages for common issues
    if (error.name === 'MongooseServerSelectionError') {
      console.error("💡 Tips: Check your network connection, IP whitelisting on MongoDB Atlas, and database availability");
    } else if (error.name === 'MongoNetworkError') {
      console.error("💡 Tips: This is often a network issue. Check your firewall settings and VPN connection");
    }
    
    process.exit(1);
  }
};

// Add graceful shutdown handling
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

export default connectDB;