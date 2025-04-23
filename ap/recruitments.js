import { MongoClient } from 'mongodb';

export default async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db();
  
  try {
    switch (req.method) {
      case 'GET':
        const data = await db.collection('recruitments').find().toArray();
        res.status(200).json(data);
        break;
        
      case 'POST':
        await db.collection('recruitments').insertOne(req.body);
        res.status(201).json({ success: true });
        break;
        
      case 'PUT':
        await db.collection('recruitments').updateOne(
          { _id: new ObjectId(req.body.id) },
          { $set: { paidOut: req.body.status } }
        );
        res.status(200).json({ success: true });
        break;
        
      case 'DELETE':
        await db.collection('recruitments').deleteOne({ _id: new ObjectId(req.body.id) });
        res.status(200).json({ success: true });
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } finally {
    client.close();
  }
};
