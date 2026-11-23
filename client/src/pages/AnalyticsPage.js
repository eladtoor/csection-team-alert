import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

function AnalyticsPage() {
  const [topPerformers, setTopPerformers] = useState([]);
  const [caseStats, setCaseStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [performersRes, statsRes] = await Promise.all([
        axios.get('/api/analytics/top-performers'),
        axios.get('/api/analytics/case-stats')
      ]);

      setTopPerformers(performersRes.data);
      setCaseStats(statsRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setLoading(false);
    }
  };

  const formatSeconds = (seconds) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="loading">טוען נתונים...</div>;
  }

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>מדדים וסטטיסטיקות</h1>
          <p>ניתוח ביצועים ומצטייני השבוע</p>
          <div className="nav-links">
            <a href="/" className="nav-link">הזנקה חדשה</a>
            <a href="/dashboard" className="nav-link">לוח בקרה</a>
            <a href="/analytics" className="nav-link">מדדים וסטטיסטיקות</a>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Case Statistics */}
        {caseStats && (
          <div className="card" style={{ marginTop: '40px' }}>
            <h2 className="page-title">סטטיסטיקות כלליות (30 יום אחרונים)</h2>

            <div className="grid grid-3">
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>
                  {caseStats.total_cases || 0}
                </div>
                <div style={{ fontSize: '16px', opacity: 0.9 }}>
                  סך הכל מקרים
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: 'white',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>
                  {caseStats.completed_cases || 0}
                </div>
                <div style={{ fontSize: '16px', opacity: 0.9 }}>
                  מקרים שהושלמו
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: 'white',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>
                  {formatSeconds(caseStats.avg_time_to_surgery)}
                </div>
                <div style={{ fontSize: '16px', opacity: 0.9 }}>
                  זמן ממוצע עד ניתוח
                </div>
              </div>
            </div>

            <div className="grid grid-3" style={{ marginTop: '20px' }}>
              <div style={{
                padding: '16px',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
                  {caseStats.urgent_cases || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  דחיפות גבוהה
                </div>
              </div>

              <div style={{
                padding: '16px',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                  {caseStats.vacuum_cases || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  ואקום בדבל סטאפ
                </div>
              </div>

              <div style={{
                padding: '16px',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                  {caseStats.regular_cases || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  דחיפות רגילה
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Performers of the Week */}
        <div className="card" style={{ marginTop: '40px' }}>
          <h2 className="page-title">🏆 מצטייני השבוע - מהירות הגעה</h2>

          {topPerformers.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
              אין נתונים זמינים לשבוע זה
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', textAlign: 'right' }}>דירוג</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>שם</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>תפקיד</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>זמן תגובה ממוצע</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>זמן הגעה ממוצע</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>הגעה בזמן</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>מס׳ מקרים</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((performer, index) => (
                    <tr
                      key={performer.member_id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: index < 3 ? '#fef3c7' : 'white'
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        {index === 0 && <span style={{ fontSize: '24px' }}>🥇</span>}
                        {index === 1 && <span style={{ fontSize: '24px' }}>🥈</span>}
                        {index === 2 && <span style={{ fontSize: '24px' }}>🥉</span>}
                        {index > 2 && <span style={{ fontWeight: '600' }}>{index + 1}</span>}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>
                        {performer.full_name}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        {performer.role_name_hebrew || performer.role_name}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'monospace' }}>
                        {formatSeconds(performer.avg_response_time)}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        color: '#16a34a'
                      }}>
                        {formatSeconds(performer.avg_arrival_time)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: performer.on_time_percentage >= 80 ? '#dcfce7' : '#fee2e2',
                          color: performer.on_time_percentage >= 80 ? '#16a34a' : '#dc2626',
                          fontWeight: '600'
                        }}>
                          {Math.round(performer.on_time_percentage)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>
                        {performer.total_responses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance Criteria */}
        <div className="card" style={{ marginTop: '40px', background: '#eff6ff' }}>
          <h3 style={{ marginBottom: '16px' }}>📊 קריטריונים לדירוג</h3>
          <ul style={{ paddingRight: '20px', lineHeight: '1.8' }}>
            <li>הדירוג מבוסס על <strong>זמן ההגעה הממוצע</strong> לחדר הניתוח</li>
            <li>נלקח בחשבון רק מי שאכן הגיע לחדר הניתוח (לא רק הבטיח להגיע)</li>
            <li><strong>הגעה בזמן</strong> = הגעה תוך הזמן שהובטח או לפניו</li>
            <li>הנתונים מתעדכנים אוטומטית בכל שבוע</li>
            <li>חברי צוות עם פחות מ-3 מקרים לא מדורגים</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
