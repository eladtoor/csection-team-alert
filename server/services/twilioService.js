require('dotenv').config();

// Mock mode - no Twilio required for demo
const MOCK_MODE = !process.env.TWILIO_ACCOUNT_SID || process.env.MOCK_MODE === 'true';

let client = null;
let twilioPhoneNumber = null;

// Initialize Twilio only if credentials are provided
if (!MOCK_MODE) {
    try {
        const twilio = require('twilio');
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        client = twilio(accountSid, authToken);
        console.log('✅ Twilio initialized - Real calls enabled');
    } catch (err) {
        console.warn('⚠️ Twilio initialization failed, using MOCK mode');
        console.warn(err.message);
    }
}

if (MOCK_MODE) {
    console.log('📱 MOCK MODE: Voice calls and SMS will be simulated (no Twilio needed)');
}

/**
 * Generate Hebrew voice message for emergency alert
 */
function generateVoiceMessage(caseData, memberName, roleName) {
    const urgencyText = {
        'urgent': 'דחיפות גבוהה',
        'vacuum_double': 'ואקום בדבל סטאפ',
        'regular': 'דחיפות רגילה'
    };

    const locationText = {
        'ER': 'חדר מיון',
        'DeliveryRoom': 'חדר לידה',
        'Ward': 'מחלקה'
    };

    return `שלום ${memberName}.
    קריאה לניתוח קיסרי דחוף.
    רמת דחיפות: ${urgencyText[caseData.urgencyLevel] || caseData.urgencyLevel}.
    מטופלת: ${caseData.patientName}.
    מיקום: ${locationText[caseData.location] || caseData.location}, חדר מספר ${caseData.roomNumber}.
    נא להגיע לחדר ניתוח בהקדם.
    תודה.`;
}

/**
 * Send voice call with TTS in Hebrew (or mock it)
 */
async function sendVoiceAlert(phoneNumber, message) {
    if (MOCK_MODE) {
        // Simulate voice call
        console.log('📞 MOCK Voice Call to:', phoneNumber);
        console.log('📝 Message:', message);

        return {
            success: true,
            callSid: `MOCK-CALL-${Date.now()}`,
            status: 'sent',
            mock: true
        };
    }

    try {
        const call = await client.calls.create({
            twiml: `
                <Response>
                    <Say voice="Polly.Ayelet" language="he-IL">
                        ${message}
                    </Say>
                </Response>
            `,
            to: phoneNumber,
            from: twilioPhoneNumber
        });

        return {
            success: true,
            callSid: call.sid,
            status: call.status
        };
    } catch (error) {
        console.error('Twilio voice call error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send SMS with case link (or mock it)
 */
async function sendSMSWithLink(phoneNumber, caseId, memberRole, memberId) {
    if (MOCK_MODE) {
        // Simulate SMS
        const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/response/${caseId}?member=${memberId}&role=${memberRole}`;
        console.log('💬 MOCK SMS to:', phoneNumber);
        console.log('🔗 Link:', link);

        return {
            success: true,
            messageSid: `MOCK-SMS-${Date.now()}`,
            status: 'sent',
            mock: true,
            link: link
        };
    }

    try {
        const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/response/${caseId}?member=${memberId}&role=${memberRole}`;

        const message = await client.messages.create({
            body: `קריאה לניתוח קיסרי דחוף. לחץ לפרטים ותגובה: ${link}`,
            to: phoneNumber,
            from: twilioPhoneNumber
        });

        return {
            success: true,
            messageSid: message.sid,
            status: message.status,
            link: link
        };
    } catch (error) {
        console.error('Twilio SMS error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send complete emergency alert (voice + SMS)
 */
async function sendEmergencyAlert(phoneNumber, caseData, memberName, roleName, caseId, memberId) {
    const message = generateVoiceMessage(caseData, memberName, roleName);

    // Send voice call
    const voiceResult = await sendVoiceAlert(phoneNumber, message);

    // Send SMS with link
    const smsResult = await sendSMSWithLink(phoneNumber, caseId, roleName, memberId);

    // In mock mode, show the link clearly
    if (MOCK_MODE && smsResult.link) {
        console.log('\n🎯 TEST LINK for', memberName, ':', smsResult.link, '\n');
    }

    return {
        voice: voiceResult,
        sms: smsResult
    };
}

module.exports = {
    sendEmergencyAlert,
    sendVoiceAlert,
    sendSMSWithLink,
    generateVoiceMessage,
    isMockMode: () => MOCK_MODE
};
