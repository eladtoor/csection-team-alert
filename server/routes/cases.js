const express = require('express');
const router = express.Router();
const { query, sql } = require('../config/database');
const twilioService = require('../services/twilioService');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/cases/trigger
 * Trigger emergency C-section alert
 */
router.post('/trigger', async (req, res) => {
    try {
        const {
            patientFullName,
            patientIdNumber,
            locationType,
            roomNumber,
            urgencyLevel,
            caseDetails,
            triggeredByDoctorId,
            assistantDoctorId
        } = req.body;

        // Validate input
        if (!patientFullName || !patientIdNumber || !locationType || !roomNumber || !urgencyLevel || !triggeredByDoctorId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create emergency case
        const caseResult = await query(`
            INSERT INTO EmergencyCases
            (case_uuid, patient_full_name, patient_id_number, location_type, room_number, urgency_level, case_details, triggered_by_doctor_id)
            OUTPUT INSERTED.*
            VALUES (NEWID(), @patientFullName, @patientIdNumber, @locationType, @roomNumber, @urgencyLevel, @caseDetails, @triggeredByDoctorId)
        `, {
            patientFullName,
            patientIdNumber,
            locationType,
            roomNumber,
            urgencyLevel,
            caseDetails: caseDetails || null,
            triggeredByDoctorId
        });

        const newCase = caseResult.recordset[0];

        // Get current shift team members
        const shiftTeam = await query(`
            SELECT
                tm.member_id,
                tm.full_name,
                tm.phone_number,
                tr.role_id,
                tr.role_name,
                tr.role_name_hebrew,
                tr.is_fixed_phone,
                tr.requires_selection
            FROM CurrentShift cs
            INNER JOIN TeamMembers tm ON cs.member_id = tm.member_id
            INNER JOIN TeamRoles tr ON cs.role_id = tr.role_id
            WHERE cs.is_active = 1
                AND cs.shift_start <= GETDATE()
                AND cs.shift_end >= GETDATE()
        `);

        // Get triggering doctor info
        const doctorResult = await query(`
            SELECT member_id, full_name, phone_number, role_id
            FROM TeamMembers
            WHERE member_id = @triggeredByDoctorId
        `, { triggeredByDoctorId });

        const triggeringDoctor = doctorResult.recordset[0];

        // Get assistant doctor if selected
        let assistantDoctor = null;
        if (assistantDoctorId) {
            const assistantResult = await query(`
                SELECT member_id, full_name, phone_number, role_id
                FROM TeamMembers
                WHERE member_id = @assistantDoctorId
            `, { assistantDoctorId });
            assistantDoctor = assistantResult.recordset[0];
        }

        // Prepare case data for voice message
        const caseData = {
            patientName: patientFullName,
            location: locationType,
            roomNumber,
            urgencyLevel
        };

        // Send alerts to all team members
        const alertPromises = [];
        const teamToAlert = [...shiftTeam.recordset];

        // Add triggering doctor (senior doctor)
        if (triggeringDoctor && !teamToAlert.find(m => m.member_id === triggeringDoctor.member_id)) {
            teamToAlert.push(triggeringDoctor);
        }

        // Add assistant doctor if selected
        if (assistantDoctor && !teamToAlert.find(m => m.member_id === assistantDoctor.member_id)) {
            teamToAlert.push(assistantDoctor);
        }

        for (const member of teamToAlert) {
            // Record assignment
            await query(`
                INSERT INTO CaseTeamAssignments (case_id, member_id, role_id)
                VALUES (@caseId, @memberId, @roleId)
            `, {
                caseId: newCase.case_id,
                memberId: member.member_id,
                roleId: member.role_id
            });

            // Send alert
            alertPromises.push(
                twilioService.sendEmergencyAlert(
                    member.phone_number,
                    caseData,
                    member.full_name,
                    member.role_name_hebrew || member.role_name,
                    newCase.case_uuid,
                    member.member_id
                ).then(result => {
                    // Update assignment with call status
                    query(`
                        UPDATE CaseTeamAssignments
                        SET voice_call_status = @status, voice_call_sid = @sid
                        WHERE case_id = @caseId AND member_id = @memberId
                    `, {
                        status: result.voice.success ? 'sent' : 'failed',
                        sid: result.voice.callSid || null,
                        caseId: newCase.case_id,
                        memberId: member.member_id
                    });
                })
            );
        }

        await Promise.all(alertPromises);

        // Emit socket event for real-time update
        const io = req.app.get('io');
        io.emit('case-triggered', {
            caseId: newCase.case_id,
            caseUuid: newCase.case_uuid,
            patientName: patientFullName,
            urgencyLevel,
            triggeredAt: newCase.triggered_at
        });

        res.json({
            success: true,
            case: newCase,
            teamAlerted: teamToAlert.length
        });

    } catch (error) {
        console.error('Error triggering case:', error);
        res.status(500).json({ error: 'Failed to trigger emergency alert' });
    }
});

/**
 * GET /api/cases/:caseUuid
 * Get case details by UUID
 */
router.get('/:caseUuid', async (req, res) => {
    try {
        const { caseUuid } = req.params;

        const result = await query(`
            SELECT * FROM EmergencyCases
            WHERE case_uuid = @caseUuid
        `, { caseUuid });

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching case:', error);
        res.status(500).json({ error: 'Failed to fetch case' });
    }
});

/**
 * GET /api/cases/:caseUuid/team
 * Get team assignments and responses for a case
 */
router.get('/:caseUuid/team', async (req, res) => {
    try {
        const { caseUuid } = req.params;

        // Get case ID
        const caseResult = await query(`
            SELECT case_id FROM EmergencyCases WHERE case_uuid = @caseUuid
        `, { caseUuid });

        if (caseResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const caseId = caseResult.recordset[0].case_id;

        // Get team assignments with responses
        const teamResult = await query(`
            SELECT
                tm.member_id,
                tm.full_name,
                tm.phone_number,
                tr.role_name,
                tr.role_name_hebrew,
                cta.alert_sent_at,
                cta.voice_call_status,
                tr2.response_type,
                tr2.estimated_minutes,
                tr2.responded_at,
                tr2.actual_arrival_at,
                tr2.arrival_confirmed
            FROM CaseTeamAssignments cta
            INNER JOIN TeamMembers tm ON cta.member_id = tm.member_id
            INNER JOIN TeamRoles tr ON cta.role_id = tr.role_id
            LEFT JOIN TeamResponses tr2 ON tr2.case_id = cta.case_id AND tr2.member_id = cta.member_id
            WHERE cta.case_id = @caseId
            ORDER BY cta.alert_sent_at
        `, { caseId });

        res.json(teamResult.recordset);
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ error: 'Failed to fetch team data' });
    }
});

/**
 * GET /api/cases/active
 * Get all active cases
 */
router.get('/', async (req, res) => {
    try {
        const result = await query(`
            SELECT
                ec.*,
                tm.full_name as triggered_by_name
            FROM EmergencyCases ec
            LEFT JOIN TeamMembers tm ON ec.triggered_by_doctor_id = tm.member_id
            WHERE ec.status = 'active'
            ORDER BY ec.triggered_at DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching cases:', error);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});

/**
 * POST /api/cases/:caseUuid/complete
 * Mark case as completed and remove from active list
 */
router.post('/:caseUuid/complete', async (req, res) => {
    try {
        const { caseUuid } = req.params;

        // Update case status to completed
        await query(`
            UPDATE EmergencyCases
            SET status = 'completed',
                surgery_completed_at = datetime('now'),
                updated_at = datetime('now')
            WHERE case_uuid = @caseUuid
        `, { caseUuid });

        // Emit socket event for real-time update
        const io = req.app.get('io');
        io.emit('case-completed', {
            caseUuid
        });

        res.json({
            success: true,
            message: 'Case marked as completed'
        });

    } catch (error) {
        console.error('Error completing case:', error);
        res.status(500).json({ error: 'Failed to complete case' });
    }
});

module.exports = router;
