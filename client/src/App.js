import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TriggerPage from './pages/TriggerPage';
import ResponsePage from './pages/ResponsePage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TriggerPage />} />
          <Route path="/response/:caseUuid" element={<ResponsePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
