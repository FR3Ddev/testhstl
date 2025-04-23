export default (req, res) => {
  if (req.method === 'POST') {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ success: false });
  }
  return res.status(405).end();
};
