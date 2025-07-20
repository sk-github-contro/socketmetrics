const { MongoClient } = require('mongodb');
let db = null;

async function connectToDatabase() {
  if (db) {
    console.log('Database already connected');
    return db;
  }
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0] || 'socketmetrics';
    db = client.db(dbName);
    // Ensure aggregateddata collection exists
    const collections = await db.listCollections().toArray();
    if (!collections.some(c => c.name === 'aggregateddata')) {
      await db.createCollection('aggregateddata');
      await db.collection('aggregateddata').createIndex({ timestamp: -1 });
      await db.collection('aggregateddata').createIndex({ symbol: 1 });
      await db.collection('aggregateddata').createIndex({ timestamp: 1, symbol: 1 });
    }
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call connectToDatabase() first.");
  }
  return db;
}

module.exports = { connectToDatabase, getDb }; 