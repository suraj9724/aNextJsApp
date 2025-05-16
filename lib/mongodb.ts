import mongoose, { Mongoose } from 'mongoose';
import initializeAdmin from './initializeAdmin';

// Augment the NodeJS Global type to include mongoose
declare global {
    var mongoose: {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
    };
}

const MONGODB_URI = process.env.MONGODB_URI;
// console.log("[DB Connect] MONGODB_URI loaded:", MONGODB_URI ? MONGODB_URI.substring(0, 20) + '...' : 'NOT LOADED'); // Log a snippet

if (!MONGODB_URI) {
    // console.error("[DB Connect] MONGODB_URI is not defined in .env.local");
    throw new Error(
        'Please define the MONGODB_URI environment variable inside .env.local'
    );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    // console.log("[DB Connect] dbConnect function called.");
    if (cached.conn) {
        // console.log("[DB Connect] Using cached MongoDB connection.");
        return cached.conn;
    }

    if (!cached.promise) {
        // console.log("[DB Connect] No cached promise. Attempting new MongoDB connection...");
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI!, opts)
            .then((mongooseInstance) => {
                // console.log("[DB Connect] MongoDB connected successfully!");
                initializeAdmin(); // Call admin initialization after successful connection
                return mongooseInstance;
            })
            .catch(err => {
                // console.error("[DB Connect] MongoDB connection error:", err.message);
                // console.error("[DB Connect] Full error object:", err);
                // Set promise to null so a new connection attempt can be made next time
                cached.promise = null;
                throw err; // Re-throw the error to indicate failure
            });
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        // If the promise was rejected, cached.promise was set to null by the .catch block.
        // The error was already logged. We just ensure conn is not set.
        cached.conn = null;
        throw e; // Re-throw to calling function
    }
    return cached.conn;
}

export default dbConnect;

// Optional: If you want to also export the mongoose instance itself
// export const mongooseInstance = mongoose; 