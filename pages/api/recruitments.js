import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db();
  
  switch (req.method) {
    case 'GET':
      const recruitments = await db.collection('recruitments').find().toArray();
      res.status(200).json(recruitments);
      break;
      
    case 'POST':
      const newRecruitment = JSON.parse(req.body);
      await db.collection('recruitments').insertOne(newRecruitment);
      res.status(201).json({ success: true });
      break;
      
    case 'PUT':
      const { id, status } = JSON.parse(req.body);
      await db.collection('recruitments').updateOne(
        { _id: new ObjectId(id) },
        { $set: { paidOut: status } }
      );
      res.status(200).json({ success: true });
      break;
      
    case 'DELETE':
      const { id: deleteId } = JSON.parse(req.body);
      await db.collection('recruitments').deleteOne({ _id: new ObjectId(deleteId) });
      res.status(200).json({ success: true });
      break;
      
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  client.close();
}
