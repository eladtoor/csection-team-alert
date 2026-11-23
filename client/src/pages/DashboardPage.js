import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useSearchParams } from 'react-router-dom';
import ElapsedTimer from '../components/ElapsedTimer';
import '../App.css';

function DashboardPage() {
  const [searchParams] = useSearchParams();
  const selectedCaseUuid = searchParams.get('case');

  const [activeCases, setActiveCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [teamStatus, setTeamStatus] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:3002');
    setSocket(newSocket);

    // Join admin dashboard room
    newSocket.emit('join-admin');

    // Listen for real-time updates
    newSocket.on('case-triggered', (data) => {
      console.log('New case triggered:', data);
      fetchActiveCases();
    });

    newSocket.on('response-submitted', (data) => {
      console.log('Response submitted:', data);
      if (selectedCase && data.caseUuid === selectedCase.case_uuid) {
        fetchTeamStatus(selectedCase.case_uuid);
      }
    });

    newSocket.on('member-arrived', (data) => {
      console.log('Member arrived:', data);
      if (selectedCase && data.caseUuid === selectedCase.case_uuid) {
        fetchTeamStatus(selectedCase.case_uuid);
      }
    });

    newSocket.on('case-completed', (data) => {
      console.log('Case completed:', data);
      // Remove from active cases list
      setActiveCases(prev => prev.filter(c => c.case_uuid !== data.caseUuid));
      // Clear selected case if it was the one completed
      if (selectedCase && selectedCase.case_uuid === data.caseUuid) {
        setSelectedCase(null);
      }
    });

    fetchActiveCases();

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (selectedCaseUuid && activeCases.length > 0) {
      const caseToSelect = activeCases.find(c => c.case_uuid === selectedCaseUuid);
      if (caseToSelect) {
        handleSelectCase(caseToSelect);
      }
    }
  }, [selectedCaseUuid, activeCases]);

  const fetchActiveCases = async () => {
    try {
      const response = await axios.get('/api/cases');
      setActiveCases(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setLoading(false);
    }
  };

  const fetchTeamStatus = async (caseUuid) => {
    try {
      const response = await axios.get(`/api/cases/${caseUuid}/team`);
      setTeamStatus(response.data);
    } catch (err) {
      console.error('Error fetching team status:', err);
    }
  };

  const handleSelectCase = (caseData) => {
    setSelectedCase(caseData);
    fetchTeamStatus(caseData.case_uuid);

    if (socket) {
      socket.emit('join-case', caseData.case_uuid);
    }
  };

  const handleConfirmArrival = async (memberId) => {
    if (!selectedCase) return;

    try {
      await axios.post('/api/responses/arrival', {
        caseUuid: selectedCase.case_uuid,
        memberId
      });

      fetchTeamStatus(selectedCase.case_uuid);
    } catch (err) {
      console.error('Error confirming arrival:', err);
      alert('שגיאה באישור הגעה');
    }
  };

  const handleCompleteCase = async () => {
    if (!selectedCase) return;

    const confirmed = window.confirm(
      `האם אתה בטוח שברצונך לסגור את המקרה של ${selectedCase.patient_full_name}?\n\nהמקרה יועבר לארכיון ויוסר מהרשימה הפעילה.`
    );

    if (!confirmed) return;

    try {
      await axios.post(`/api/cases/${selectedCase.case_uuid}/complete`);
      // Socket.IO event will handle UI update
      alert('המקרה נסגר בהצלחה');
    } catch (err) {
      console.error('Error completing case:', err);
      alert('שגיאה בסגירת המקרה');
    }
  };

  const urgencyText = {
    urgent: 'דחיפות גבוהה',
    vacuum_double: 'ואקום בדבל סטאפ',
    regular: 'דחיפות רגילה'
  };

  const locationText = {
    ER: 'חדר מיון',
    DeliveryRoom: 'חדר לידה',
    Ward: 'מחלקה'
  };

  const responseText = {
    arriving_3: '3 דקות',
    arriving_4: '4 דקות',
    arriving_5: '5 דקות',
    not_arriving: 'לא מגיע'
  };

  if (loading) {
    return <div className="loading">טוען נתונים...</div>;
  }

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>לוח בקרה - מעקב בזמן אמת</h1>
          <p>ניטור צוותי ניתוח קיסרי דחוף</p>
          <div className="nav-links">
            <a href="/" className="nav-link">הזנקה חדשה</a>
            <a href="/dashboard" className="nav-link">לוח בקרה</a>
            <a href="/analytics" className="nav-link">מדדים וסטטיסטיקות</a>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="grid grid-2" style={{ marginTop: '40px' }}>
          {/* Active Cases List */}
          <div>
            <div className="card">
              <h2 className="page-title">מקרים פעילים ({activeCases.length})</h2>

              {activeCases.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                  אין מקרים פעילים כרגע
                </p>
              ) : (
                activeCases.map(caseData => {
                  // Calculate elapsed time for color coding
                  const elapsed = Math.floor((new Date() - new Date(caseData.triggered_at)) / 1000 / 60);
                  const timerColor = elapsed <= 5 ? '#16a34a' : elapsed <= 10 ? '#f59e0b' : '#dc2626';

                  return (
                    <div
                      key={caseData.case_id}
                      onClick={() => handleSelectCase(caseData)}
                      style={{
                        padding: '16px',
                        marginBottom: '12px',
                        border: selectedCase?.case_id === caseData.case_id
                          ? '2px solid #2563eb'
                          : '2px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <strong style={{ fontSize: '16px' }}>
                          {caseData.patient_full_name}
                        </strong>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{
                            background: timerColor,
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: '700',
                            fontFamily: 'monospace'
                          }}>
                            ⏱️ {elapsed}'
                          </span>
                          <span className={`urgency-badge urgency-${caseData.urgency_level}`}>
                            {urgencyText[caseData.urgency_level]}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        <div>📍 {locationText[caseData.location_type]} - חדר {caseData.room_number}</div>
                        <div>🕐 {new Date(caseData.triggered_at).toLocaleTimeString('he-IL')}</div>
                        <div>👨‍⚕️ {caseData.triggered_by_name}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Team Status */}
          <div>
            {selectedCase ? (
              <div className="card">
                {/* Elapsed Timer */}
                <ElapsedTimer startTime={selectedCase.triggered_at} style={{ marginBottom: '24px' }} />

                {/* Complete Case Button */}
                <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                  <button
                    onClick={handleCompleteCase}
                    className="btn btn-warning"
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '18px',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      border: '3px solid #047857',
                      boxShadow: '0 4px 16px rgba(5, 150, 105, 0.4)',
                      color: 'white'
                    }}
                  >
                    ✓ סגור מקרה והעבר לארכיון
                  </button>
                </div>

                <h2 className="page-title">סטטוס צוות - {selectedCase.patient_full_name}</h2>

                {selectedCase.case_details && (
                  <div style={{
                    padding: '16px',
                    background: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#92400e' }}>
                      📋 פרטי המקרה
                    </h3>
                    <p style={{ margin: 0, fontSize: '15px', color: '#78350f', whiteSpace: 'pre-wrap' }}>
                      {selectedCase.case_details}
                    </p>
                  </div>
                )}

                {teamStatus.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                    טוען נתוני צוות...
                  </p>
                ) : (
                  <div>
                    {teamStatus.map((member, index) => {
                      const isNotArriving = member.response_type === 'not_arriving';

                      return (
                        <div
                          key={index}
                          style={{
                            padding: '16px',
                            marginBottom: '12px',
                            border: isNotArriving ? '3px solid #dc2626' : '2px solid #e2e8f0',
                            borderRadius: '8px',
                            background: member.arrival_confirmed ? '#dcfce7' : isNotArriving ? '#fee2e2' : 'white'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <div>
                              <strong style={{ fontSize: '16px' }}>
                                {member.full_name}
                              </strong>
                              <div style={{ fontSize: '14px', color: '#64748b' }}>
                                {member.role_name_hebrew || member.role_name}
                              </div>
                            </div>

                            {member.arrival_confirmed ? (
                              <span className="status-badge status-arrived">
                                ✓ הגיע
                              </span>
                            ) : member.response_type ? (
                              <span
                                className="status-badge"
                                style={{
                                  background: isNotArriving ? '#dc2626' : '#3b82f6',
                                  color: 'white',
                                  fontWeight: '700'
                                }}
                              >
                                {isNotArriving ? '⚠️ ' : ''}{responseText[member.response_type]}
                              </span>
                            ) : (
                              <span className="status-badge status-pending">
                                ממתין
                              </span>
                            )}
                          </div>

                          {member.response_type && !member.arrival_confirmed && !isNotArriving && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                                תגובה: {responseText[member.response_type]}
                                {member.estimated_minutes && ` (${member.estimated_minutes} דקות)`}
                              </div>
                              <button
                                onClick={() => handleConfirmArrival(member.member_id)}
                              className="btn btn-success"
                              style={{ fontSize: '14px', padding: '8px 16px' }}
                            >
                              אשר הגעה
                            </button>
                          </div>
                        )}

                          {isNotArriving && (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px',
                              background: '#fef2f2',
                              border: '2px solid #dc2626',
                              borderRadius: '6px',
                              textAlign: 'center'
                            }}>
                              <strong style={{ color: '#dc2626', fontSize: '15px' }}>
                                ⚠️ חבר צוות זה לא יכול להגיע
                              </strong>
                            </div>
                          )}

                          {member.actual_arrival_at && (
                            <div style={{
                              marginTop: '8px',
                              fontSize: '14px',
                              color: '#16a34a',
                              fontWeight: '600'
                            }}>
                              הגיע בשעה: {new Date(member.actual_arrival_at).toLocaleTimeString('he-IL')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Summary */}
                {teamStatus.length > 0 && (
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: '#f1f5f9',
                    borderRadius: '8px'
                  }}>
                    <h3 style={{ marginBottom: '12px' }}>סיכום</h3>
                    <div style={{ fontSize: '14px' }}>
                      <div>סך הכל: {teamStatus.length} חברי צוות</div>
                      <div style={{ color: '#16a34a', fontWeight: '600' }}>
                        ✓ הגיעו: {teamStatus.filter(m => m.arrival_confirmed).length}
                      </div>
                      <div>ענו: {teamStatus.filter(m => m.response_type && m.response_type !== 'not_arriving').length}</div>
                      <div style={{ color: '#dc2626', fontWeight: '600' }}>
                        ⚠️ לא מגיעים: {teamStatus.filter(m => m.response_type === 'not_arriving').length}
                      </div>
                      <div>
                        ממתינים: {teamStatus.filter(m => !m.response_type).length}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <h3 style={{ color: '#64748b' }}>בחר מקרה לצפייה בסטטוס הצוות</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
