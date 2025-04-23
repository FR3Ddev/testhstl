// api/index.js - Serverless function to handle MongoDB operations
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  
  const db = client.db(process.env.MONGODB_DB || 'hstl_tracker');
  cachedDb = db;
  
  return db;
}

// JWT verification helper
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// The main serverless function that handles all API requests
module.exports = async (req, res) => {
  // Set CORS headers to allow requests from your domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Route: /api/auth (POST)
  if (req.url === '/api/auth' && req.method === 'POST') {
    try {
      const { password } = req.body;
      
      // Compare with hashed password from environment variable
      const passwordMatch = await bcrypt.compare(
        password,
        process.env.ADMIN_PASSWORD_HASH
      );
      
      if (passwordMatch) {
        // Create a JWT token that expires in 24 hours
        const token = jwt.sign(
          { isAdmin: true },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        return res.status(200).json({ token });
      } else {
        return res.status(401).json({ message: 'Invalid password' });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
  
  // Route: /api/recruitments (GET)
  else if (req.url === '/api/recruitments' && req.method === 'GET') {
    try {
      const db = await connectToDatabase();
      const recruitments = await db
        .collection('recruitments')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      return res.status(200).json(recruitments);
    } catch (error) {
      console.error('Error fetching recruitments:', error);
      return res.status(500).json({ message: 'Failed to fetch recruitments' });
    }
  }
  
  // Route: /api/recruitments (POST) - Add new recruitment
  else if (req.url === '/api/recruitments' && req.method === 'POST') {
    try {
      // Extract the token from the Authorization header
      const authHeader = req.headers.authorization || '';
      const token = authHeader.split(' ')[1]; // Bearer <token>
      
      // Verify token
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { hstlMember, recruitedMember, paidOut } = req.body;
      
      if (!hstlMember || !recruitedMember) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const db = await connectToDatabase();
      
      const result = await db.collection('recruitments').insertOne({
        hstlMember,
        recruitedMember,
        paidOut: paidOut || 'Pending',
        createdAt: new Date()
      });
      
      return res.status(201).json({ message: 'Recruitment added successfully' });
    } catch (error) {
      console.error('Error adding recruitment:', error);
      return res.status(500).json({ message: 'Failed to add recruitment' });
    }
  }
  
  // Route: /api/recruitments (PUT) - Update recruitment
  else if (req.url === '/api/recruitments' && req.method === 'PUT') {
    try {
      // Extract the token from the Authorization header
      const authHeader = req.headers.authorization || '';
      const token = authHeader.split(' ')[1]; // Bearer <token>
      
      // Verify token
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { id, paidOut } = req.body;
      
      if (!id || !paidOut) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const db = await connectToDatabase();
      
      await db.collection('recruitments').updateOne(
        { _id: new ObjectId(id) },
        { $set: { paidOut } }
      );
      
      return res.status(200).json({ message: 'Recruitment updated successfully' });
    } catch (error) {
      console.error('Error updating recruitment:', error);
      return res.status(500).json({ message: 'Failed to update recruitment' });
    }
  }
  
  // Route: /api/recruitments (DELETE) - Delete recruitment
  else if (req.url === '/api/recruitments' && req.method === 'DELETE') {
    try {
      // Extract the token from the Authorization header
      const authHeader = req.headers.authorization || '';
      const token = authHeader.split(' ')[1]; // Bearer <token>
      
      // Verify token
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: 'Missing recruitment id' });
      }
      
      const db = await connectToDatabase();
      
      await db.collection('recruitments').deleteOne({ _id: new ObjectId(id) });
      
      return res.status(200).json({ message: 'Recruitment deleted successfully' });
    } catch (error) {
      console.error('Error deleting recruitment:', error);
      return res.status(500).json({ message: 'Failed to delete recruitment' });
    }
  }
  
  // Route not found
  else {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
};
