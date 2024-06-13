import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './Landing';
import MainPage from './MainPage';
import GeneralOrder from './GeneralOrder';
import InfoPage from './Info';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const correctPassword = 'none';

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleLogin = () => {
    if (password === correctPassword) {
      setAuthenticated(true);
    } else {
      alert('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <Router>
      <div className="App">
        {!authenticated ? (
          <div className="authentication">
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="type code here."
            />
            <button onClick={handleLogin}>enter</button>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/mainPage" element={<MainPage />} />
            <Route path="/generalOrder" element={<GeneralOrder />} />
            <Route path="/Info" element={<InfoPage />} />
          </Routes>
        )}
        <h5 style={{ position: 'absolute', bottom: '0', left: '0' }}>created by ashim dhakal.</h5>
      </div>
    </Router>
  );
}

export default App;
