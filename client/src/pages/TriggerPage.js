import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function TriggerPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patientFullName: '',
    patientIdNumber: '',
    locationType: 'ER',
    roomNumber: '',
    urgencyLevel: 'urgent',
    triggeredByDoctorId: '',
    assistantDoctorId: '',
    caseDetails: ''
  });

  const [seniorDoctors, setSeniorDoctors] = useState([]);
  const [assistantDoctors, setAssistantDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      // Fetch senior doctors (role_id = 1)
      const seniorResponse = await axios.get('/api/team/members/role/1');
      setSeniorDoctors(seniorResponse.data);

      // Fetch assistant doctors
      const assistantResponse = await axios.get('/api/team/assistant-doctors');
      setAssistantDoctors(assistantResponse.data);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('שגיאה בטעינת רשימת הרופאים');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Double-click confirmation simulation
    if (!window.confirm('האם אתה בטוח שברצונך להזניק את הצוות? (לחיצה כפולה)')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/cases/trigger', {
        ...formData,
        triggeredByDoctorId: parseInt(formData.triggeredByDoctorId),
        assistantDoctorId: formData.assistantDoctorId ? parseInt(formData.assistantDoctorId) : null
      });

      if (response.data.success) {
        alert(`הזנקה נשלחה בהצלחה!\nצוות שהוזנק: ${response.data.teamAlerted} חברים`);

        // Navigate to dashboard to see live updates
        navigate(`/dashboard?case=${response.data.case.case_uuid}`);
      }
    } catch (err) {
      console.error('Error triggering alert:', err);
      setError('שגיאה בשליחת ההזנקה. אנא נסה שנית.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>מערכת הזנקה לניתוח קיסרי דחוף</h1>
          <p>בית חולים סורוקה - באר שבע</p>
          <div className="nav-links">
            <a href="/" className="nav-link">הזנקה חדשה</a>
            <a href="/dashboard" className="nav-link">לוח בקרה</a>
            <a href="/analytics" className="nav-link">מדדים וסטטיסטיקות</a>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card" style={{ maxWidth: '800px', margin: '40px auto' }}>
          <h2 className="page-title">הזנקת צוות לניתוח קיסרי דחוף</h2>

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-2">
              <div className="form-group">
                <label>שם מלא של המטופלת *</label>
                <input
                  type="text"
                  name="patientFullName"
                  value={formData.patientFullName}
                  onChange={handleChange}
                  required
                  placeholder="לדוגמה: שרה כהן"
                />
              </div>

              <div className="form-group">
                <label>תעודת זהות *</label>
                <input
                  type="text"
                  name="patientIdNumber"
                  value={formData.patientIdNumber}
                  onChange={handleChange}
                  required
                  placeholder="123456789"
                  maxLength="9"
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>מיקום היולדת *</label>
                <select
                  name="locationType"
                  value={formData.locationType}
                  onChange={handleChange}
                  required
                >
                  <option value="ER">חדר מיון</option>
                  <option value="DeliveryRoom">חדר לידה</option>
                  <option value="Ward">מחלקה</option>
                </select>
              </div>

              <div className="form-group">
                <label>מספר חדר *</label>
                <input
                  type="text"
                  name="roomNumber"
                  value={formData.roomNumber}
                  onChange={handleChange}
                  required
                  placeholder="לדוגמה: 305"
                />
              </div>
            </div>

            <div className="form-group">
              <label>רמת דחיפות *</label>
              <select
                name="urgencyLevel"
                value={formData.urgencyLevel}
                onChange={handleChange}
                required
              >
                <option value="urgent">דחיפות גבוהה (בהול)</option>
                <option value="vacuum_double">ואקום בדבל סטאפ</option>
                <option value="regular">דחיפות רגילה</option>
              </select>
            </div>

            <div className="form-group">
              <label>פרטי המקרה (אופציונלי)</label>
              <textarea
                name="caseDetails"
                value={formData.caseDetails}
                onChange={handleChange}
                placeholder="פרטים נוספים על המקרה: סיבוכים, הערות רפואיות, מצב המטופלת וכו'"
                rows="4"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  fontFamily: 'Assistant, sans-serif',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>רופא בכיר מזניק (אתה) *</label>
                <select
                  name="triggeredByDoctorId"
                  value={formData.triggeredByDoctorId}
                  onChange={handleChange}
                  required
                >
                  <option value="">בחר רופא בכיר</option>
                  {seniorDoctors.map(doctor => (
                    <option key={doctor.member_id} value={doctor.member_id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>רופא עוזר *</label>
                <select
                  name="assistantDoctorId"
                  value={formData.assistantDoctorId}
                  onChange={handleChange}
                  required
                >
                  <option value="">בחר רופא עוזר</option>
                  {assistantDoctors.map(doctor => (
                    <option key={doctor.member_id} value={doctor.member_id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={loading}
                style={{
                  fontSize: '20px',
                  padding: '16px 48px',
                  minWidth: '300px'
                }}
              >
                {loading ? 'מזניק את הצוות...' : '🚨 הזנק צוות (לחיצה כפולה)'}
              </button>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#fef3c7',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              <strong>שים לב:</strong> לחיצה על הכפתור תשלח הודעה קולית ו-SMS לכל חברי הצוות במשמרת הנוכחית
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TriggerPage;
