import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useSearchParams } from 'react-router-dom';
import ElapsedTimer from '../components/ElapsedTimer';
import '../App.css';

function ResponsePage() {
  const { caseUuid } = useParams();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('member');
  const roleId = searchParams.get('role');

  const [caseData, setCase] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCaseData();
  }, [caseUuid]);

  const fetchCaseData = async () => {
    try {
      const response = await axios.get(`/api/cases/${caseUuid}`);
      setCase(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching case:', err);
      setLoading(false);
    }
  };

  const handleResponse = async (responseType, minutes) => {
    if (!memberId) {
      alert('שגיאה: לא זוהה מזהה חבר צוות');
      return;
    }

    setSubmitting(true);

    try {
      const result = await axios.post('/api/responses', {
        caseUuid,
        memberId: parseInt(memberId),
        responseType,
        estimatedMinutes: minutes
      });

      if (result.data.success) {
        setResponse(result.data.response);
        alert('תגובתך נרשמה בהצלחה!');
      }
    } catch (err) {
      console.error('Error submitting response:', err);
      alert('שגיאה בשליחת התגובה. אנא נסה שנית.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">טוען נתונים...</div>;
  }

  if (!caseData) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h2>לא נמצא מקרה</h2>
        <p>המקרה שחיפשת לא נמצא במערכת</p>
      </div>
    );
  }

  const urgencyText = {
    urgent: 'דחיפות גבוהה (בהול)',
    vacuum_double: 'ואקום בדבל סטאפ',
    regular: 'דחיפות רגילה'
  };

  const locationText = {
    ER: 'חדר מיון',
    DeliveryRoom: 'חדר לידה',
    Ward: 'מחלקה'
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>🚨 קריאה לניתוח קיסרי דחוף</h1>
          <p>בית חולים סורוקה</p>
        </div>
      </div>

      <div className="container">
        <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
          {/* Elapsed Timer */}
          <ElapsedTimer startTime={caseData.triggered_at} style={{ marginBottom: '24px' }} />

          <div style={{
            textAlign: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <h2 style={{ margin: 0, fontSize: '24px' }}>קריאה דחופה לחדר ניתוח</h2>
          </div>

          <div className="form-group">
            <label>רמת דחיפות</label>
            <div>
              <span className={`urgency-badge urgency-${caseData.urgency_level}`}>
                {urgencyText[caseData.urgency_level]}
              </span>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label>שם המטופלת</label>
              <div style={{
                padding: '12px',
                background: '#f1f5f9',
                borderRadius: '6px',
                fontWeight: '600'
              }}>
                {caseData.patient_full_name}
              </div>
            </div>

            <div className="form-group">
              <label>תעודת זהות</label>
              <div style={{
                padding: '12px',
                background: '#f1f5f9',
                borderRadius: '6px',
                fontWeight: '600'
              }}>
                {caseData.patient_id_number}
              </div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label>מיקום</label>
              <div style={{
                padding: '12px',
                background: '#f1f5f9',
                borderRadius: '6px',
                fontWeight: '600'
              }}>
                {locationText[caseData.location_type]}
              </div>
            </div>

            <div className="form-group">
              <label>מספר חדר</label>
              <div style={{
                padding: '12px',
                background: '#f1f5f9',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '20px',
                textAlign: 'center'
              }}>
                {caseData.room_number}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: '#dbeafe',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <p style={{ margin: 0, fontWeight: '600' }}>
              זמן ההזנקה: {new Date(caseData.triggered_at).toLocaleTimeString('he-IL')}
            </p>
          </div>

          {caseData.case_details && (
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
                {caseData.case_details}
              </p>
            </div>
          )}

          {response ? (
            <div style={{
              padding: '20px',
              background: '#dcfce7',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#16a34a', margin: '0 0 12px 0' }}>✓ תגובתך נרשמה</h3>
              <p style={{ margin: 0, fontSize: '16px' }}>
                {response.response_type === 'not_arriving'
                  ? 'דיווחת שלא תגיע'
                  : `דיווחת שתגיע תוך ${response.estimated_minutes} דקות`}
              </p>
              <p style={{ margin: '12px 0 0', fontSize: '14px', opacity: 0.8 }}>
                זמן תגובה: {new Date(response.responded_at).toLocaleTimeString('he-IL')}
              </p>
            </div>
          ) : (
            <>
              <h3 style={{ marginBottom: '16px', textAlign: 'center' }}>
                מתי תגיע לחדר ניתוח?
              </h3>

              <div className="grid grid-3" style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => handleResponse('arriving_3', 3)}
                  disabled={submitting}
                  className="btn btn-success"
                  style={{ padding: '20px', fontSize: '18px' }}
                >
                  3 דקות
                </button>
                <button
                  onClick={() => handleResponse('arriving_4', 4)}
                  disabled={submitting}
                  className="btn btn-success"
                  style={{ padding: '20px', fontSize: '18px' }}
                >
                  4 דקות
                </button>
                <button
                  onClick={() => handleResponse('arriving_5', 5)}
                  disabled={submitting}
                  className="btn btn-success"
                  style={{ padding: '20px', fontSize: '18px' }}
                >
                  5 דקות
                </button>
              </div>

              <div style={{ marginTop: '8px' }}>
                <button
                  onClick={() => handleResponse('not_arriving', null)}
                  disabled={submitting}
                  className="btn btn-danger"
                  style={{
                    width: '100%',
                    padding: '20px',
                    fontSize: '20px',
                    fontWeight: '700',
                    background: '#dc2626',
                    border: '3px solid #991b1b',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                    animation: submitting ? 'none' : 'pulse 2s infinite'
                  }}
                >
                  ⚠️ לא מגיע
                </button>
                <p style={{
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#dc2626',
                  marginTop: '8px',
                  fontWeight: '600'
                }}>
                  לחץ רק אם אינך יכול להגיע
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResponsePage;
