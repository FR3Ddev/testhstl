// pages/api/auth.js
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;
  
  // Compare with hashed password from environment variable
  const hashedPassword = process.env.ADMIN_PASSWORD_HASH;
  
  try {
    // Compare the provided password with the stored hash
    const isValid = await compare(password, hashedPassword);
    
    if (isValid) {
      // Create a JWT token
      const token = sign(
        { isAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
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

// pages/api/recruitments.js
import clientPromise from '../../lib/mongodb';
import { verify } from 'jsonwebtoken';

export default async function handler(req, res) {
  // GET method for retrieving recruitments
  if (req.method === 'GET') {
    try {
      const client = await clientPromise;
      const db = client.db("hstl_tracker");
      
      const recruitments = await db
        .collection("recruitments")
        .find({})
        .sort({ _id: -1 })
        .toArray();
      
      return res.status(200).json(recruitments);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to fetch recruitments' });
    }
  }
  
  // POST method for adding new recruitment (requires authentication)
  else if (req.method === 'POST') {
    try {
      // Verify the JWT token
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      try {
        verify(token, process.env.JWT_SECRET);
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      const { hstlMember, recruitedMember, paidOut } = req.body;
      
      if (!hstlMember || !recruitedMember) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const client = await clientPromise;
      const db = client.db("hstl_tracker");
      
      const newRecruitment = {
        hstlMember,
        recruitedMember,
        paidOut: paidOut || 'Pending',
        createdAt: new Date()
      };
      
      const result = await db.collection("recruitments").insertOne(newRecruitment);
      
      return res.status(201).json({
        message: 'Recruitment added successfully',
        recruitment: { ...newRecruitment, _id: result.insertedId }
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Failed to add recruitment' });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}

// pages/api/updateRecruitment.js
import clientPromise from '../../lib/mongodb';
import { verify } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  // Verify the JWT token
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  const client = await clientPromise;
  const db = client.db("hstl_tracker");
  
  // Update recruitment status
  if (req.method === 'PUT') {
    try {
      const { id, paidOut } = req.body;
      
      if (!id || !paidOut) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      await db.collection("recruitments").updateOne(
        { _id: new ObjectId(id) },
        { $set: { paidOut } }
      );
      
      return res.status(200).json({ message: 'Recruitment updated successfully' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Failed to update recruitment' });
    }
  }
  
  // Delete recruitment
  else if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: 'Missing recruitment id' });
      }
      
      await db.collection("recruitments").deleteOne({ _id: new ObjectId(id) });
      
      return res.status(200).json({ message: 'Recruitment deleted successfully' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Failed to delete recruitment' });
    }
  }
}
