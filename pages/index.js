import { useState, useEffect } from 'react';
import { MongoClient } from 'mongodb';

export default function Home({ initialData }) {
  const [recruitmentData, setRecruitmentData] = useState(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [newEntry, setNewEntry] = useState({
    hstlMember: '',
    recruitedMember: '',
    paidOut: 'Pending'
  });

  // Check if already logged in
  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
  }, []);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    if (response.ok) {
      localStorage.setItem('isAdmin', 'true');
      setIsAdmin(true);
    } else {
      alert('Wrong password');
    }
  };

  // Add new recruitment
  const addRecruitment = async () => {
    if (!newEntry.hstlMember || !newEntry.recruitedMember) return;
    
    await fetch('/api/recruitments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });
    
    // Refresh data
    const response = await fetch('/api/recruitments');
    const data = await response.json();
    setRecruitmentData(data);
    
    // Reset form
    setNewEntry({
      hstlMember: '',
      recruitedMember: '',
      paidOut: 'Pending'
    });
  };

  // Update status
  const updateStatus = async (id, status) => {
    await fetch('/api/recruitments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    
    // Refresh data
    const response = await fetch('/api/recruitments');
    const data = await response.json();
    setRecruitmentData(data);
  };

  // Delete entry
  const deleteEntry = async (id) => {
    if (confirm('Are you sure?')) {
      await fetch('/api/recruitments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      // Refresh data
      const response = await fetch('/api/recruitments');
      const data = await response.json();
      setRecruitmentData(data);
    }
  };

  // Filter data
  const filteredData = recruitmentData.filter(item => 
    item.hstlMember.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.recruitedMember.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <h1>HSTL Recruitment Bonus Tracker</h1>
      
      {/* Login Form (if not admin) */}
      {!isAdmin ? (
        <div className="login-box">
          <h2>Admin Login</h2>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Enter password"
          />
          <button onClick={handleLogin}>Login</button>
          <button onClick={() => setIsAdmin(false)}>Continue as Guest</button>
        </div>
      ) : (
        <>
          {/* Admin Controls */}
          <div className="admin-controls">
            <h2>Add New Recruitment</h2>
            <input
              placeholder="HSTL Member"
              value={newEntry.hstlMember}
              onChange={(e) => setNewEntry({...newEntry, hstlMember: e.target.value})}
            />
            <input
              placeholder="Recruited Member"
              value={newEntry.recruitedMember}
              onChange={(e) => setNewEntry({...newEntry, recruitedMember: e.target.value})}
            />
            <select
              value={newEntry.paidOut}
              onChange={(e) => setNewEntry({...newEntry, paidOut: e.target.value})}
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
            <button onClick={addRecruitment}>Add Entry</button>
            <button onClick={() => { localStorage.removeItem('isAdmin'); setIsAdmin(false); }}>
              Logout
            </button>
          </div>
        </>
      )}
      
      {/* Search Box */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Data Table */}
      <table>
        <thead>
          <tr>
            <th>HSTL Member</th>
            <th>Recruited Member</th>
            <th>Status</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredData.map(item => (
            <tr key={item._id}>
              <td>{item.hstlMember}</td>
              <td>{item.recruitedMember}</td>
              <td className={`status-${item.paidOut.toLowerCase()}`}>
                {item.paidOut}
              </td>
              {isAdmin && (
                <td className="actions">
                  {item.paidOut === 'Pending' ? (
                    <button onClick={() => updateStatus(item._id, 'Paid')}>
                      Mark Paid
                    </button>
                  ) : (
                    <button onClick={() => updateStatus(item._id, 'Pending')}>
                      Mark Pending
                    </button>
                  )}
                  <button onClick={() => deleteEntry(item._id)}>
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .login-box, .admin-controls {
          background: #f5f5f5;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 5px;
        }
        input, select, button {
          padding: 8px;
          margin: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        .status-paid {
          color: green;
        }
        .status-pending {
          color: orange;
        }
        .actions button {
          margin: 0 5px;
          padding: 5px 10px;
        }
      `}</style>
    </div>
  );
}

export async function getServerSideProps() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db();
  const recruitments = await db.collection('recruitments').find().toArray();
  client.close();
  
  return {
    props: {
      initialData: JSON.parse(JSON.stringify(recruitments))
    }
  };
}
