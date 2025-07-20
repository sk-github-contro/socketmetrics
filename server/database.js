const { MongoClient } = require("mongodb");
let db = null;
let inMemoryStorage = [];
let useInMemory = false;

async function connectToDatabase() {
  if (db) {
    console.log("Database already connected");
    return db;
  }
  
  try {
    if (!process.env.MONGODB_URI) {
      console.log("⚠️ MONGODB_URI not set, using in-memory storage");
      useInMemory = true;
      return createInMemoryDB();
    }
    
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    const dbName = process.env.MONGODB_URI.split("/").pop().split("?")[0] || "socketmetrics";
    db = client.db(dbName);
    
    const collections = await db.listCollections().toArray();
    if (!collections.some(c => c.name === "aggregateddata")) {
      await db.createCollection("aggregateddata");
      await db.collection("aggregateddata").createIndex({ timestamp: -1 });
      await db.collection("aggregateddata").createIndex({ symbol: 1 });
      await db.collection("aggregateddata").createIndex({ timestamp: 1, symbol: 1 });
    }
    
    console.log("✅ MongoDB connected successfully");
    return db;
    
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    console.log("🔄 Falling back to in-memory storage");
    useInMemory = true;
    return createInMemoryDB();
  }
}

function createInMemoryDB() {
  console.log("💾 Using in-memory storage (data will be lost on restart)");
  return {
    collection: (name) => {
      return {
        insertOne: async (data) => {
          inMemoryStorage.push(data);
          console.log("💾 Data stored in memory:", data);
          return { insertedId: Date.now() };
        },
        find: () => {
          return {
            sort: (sortObj) => {
              return {
                limit: (limit) => {
                  return {
                    toArray: async () => {
                      const sorted = inMemoryStorage.sort((a, b) => 
                        new Date(b.timestamp) - new Date(a.timestamp)
                      );
                      return sorted.slice(0, limit);
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
}

function getDb() {
  if (!db && !useInMemory) {
    throw new Error("Database not initialized. Call connectToDatabase() first.");
  }
  return db || createInMemoryDB();
}

module.exports = { connectToDatabase, getDb };
