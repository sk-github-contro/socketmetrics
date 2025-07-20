// MongoDB initialization script
db = db.getSiblingDB('socketmetrics');

// Create collections with proper indexes
db.createCollection('aggregateddata');

// Create indexes for better performance
db.aggregateddata.createIndex({ "timestamp": -1 });
db.aggregateddata.createIndex({ "symbol": 1 });
db.aggregateddata.createIndex({ "timestamp": 1, "symbol": 1 });

// Create a user for the application
db.createUser({
  user: 'socketmetrics_user',
  pwd: 'socketmetrics_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'socketmetrics'
    }
  ]
});

print('✅ MongoDB initialized successfully');
print('📊 Database: socketmetrics');
print('📈 Collection: aggregateddata');
print('👤 User: socketmetrics_user'); 