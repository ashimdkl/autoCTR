import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <div className="landing">
      <h4 className = "title">powENG distribution tools.</h4>
      <div className="buttons">
        <button className="button" onClick={() => navigateTo('/generalOrder')}>
          General Order Analysis
        </button>
        <button className="button" onClick={() => navigateTo('/mainPage')}>
          Automatic CTR
        </button>
      </div>
    </div>
  );
}

export default Landing;
