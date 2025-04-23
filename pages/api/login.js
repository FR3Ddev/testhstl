export default function handler(req, res) {
  if (req.method === 'POST') {
    const { password } = JSON.parse(req.body);
    
    if (password === process.env.ADMIN_PASSWORD) {
      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ success: false });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
