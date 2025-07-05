import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Use environment variable or fallback to localhost for development
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

function App() {
  const [username, setUsername] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);

  const fetchPlayerData = async () => {
    setError(null);
    setProfileData(null);
    try {
      const response = await axios.get(`${BACKEND_URL}/player/${username}`);
      setProfileData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unknown error occurred');
    }
  };

  return (
    <div className="App">
      <h1>Skyblock Player Tracker</h1>
      <input
        type="text"
        placeholder="Enter Minecraft Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={fetchPlayerData}>Search</button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {profileData && (
        <div>
          <h2>{profileData.username} ({profileData.skyblock_data.profile_name})</h2>
          <p><strong>Purse:</strong> {profileData.skyblock_data.purse}</p>
          <h3>Skills</h3>
          <ul>
            {Object.entries(profileData.skyblock_data.skills).map(([skill, xp]) => (
              <li key={skill}>{skill}: {xp.toLocaleString()} XP</li>
            ))}
          </ul>
          <h3>Pets</h3>
          <ul>
            {profileData.skyblock_data.pets.length === 0 ? (
              <li>No pets</li>
            ) : (
              profileData.skyblock_data.pets.map((pet, index) => (
                <li key={index}>
                  {pet.type} (Level {pet.level || "?"})
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
