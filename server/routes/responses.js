const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * POST /api/responses
 * Submit team member response
 */
router.post('/', async (req, res) => {
    try {
        const { caseUuid, memberId, responseType, estimatedMinutes } = req.body;

        // Validate input
        if (!caseUuid || !memberId || !responseType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get case ID
        const caseResult = await query(`
            SELECT case_id FROM EmergencyCases WHERE case_uuid = @caseUuid
        `, { caseUuid });

        if (caseResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const caseId = caseResult.recordset[0].case_id;

        // Check if response already exists
        const existingResponse = await query(`
            SELECT response_id FROM TeamResponses
            WHERE case_id = @caseId AND member_id = @memberId
        `, { caseId, memberId });

        let response;
        if (existingResponse.recordset.length > 0) {
            // Update existing response
            await query(`
                UPDATE TeamResponses
                SET response_type = @responseType,
                    estimated_minutes = @estimatedMinutes,
                    responded_at = datetime('now')
                WHERE case_id = @caseId AND member_id = @memberId
            `, { responseType, estimatedMinutes, caseId, memberId });

            // Fetch the updated response
            const result = await query(`
                SELECT * FROM TeamResponses
                WHERE case_id = @caseId AND member_id = @memberId
            `, { caseId, memberId });
            response = result.recordset[0];
        } else {
            // Insert new response
            const result = await query(`
                INSERT INTO TeamResponses (case_id, member_id, response_type, estimated_minutes)
                VALUES (@caseId, @memberId, @responseType, @estimatedMinutes)
            `, { caseId, memberId, responseType, estimatedMinutes });

            // Fetch the inserted response
            const fetchResult = await query(`
                SELECT * FROM TeamResponses
                WHERE case_id = @caseId AND member_id = @memberId
            `, { caseId, memberId });
            response = fetchResult.recordset[0];
        }

        // Calculate performance metric
        const alertTime = await query(`
            SELECT alert_sent_at FROM CaseTeamAssignments
            WHERE case_id = @caseId AND member_id = @memberId
        `, { caseId, memberId });

        if (alertTime.recordset.length > 0) {
            const alertSentAt = new Date(alertTime.recordset[0].alert_sent_at);
            const respondedAt = new Date(response.responded_at);
            const responseTimeSeconds = Math.floor((respondedAt - alertSentAt) / 1000);

            // Get current week and year
            const now = new Date();
            const weekNumber = getWeekNumber(now);
            const yearNumber = now.getFullYear();

            // Insert or update performance metric
            const existingMetric = await query(`
                SELECT metric_id FROM PerformanceMetrics
                WHERE case_id = @caseId AND member_id = @memberId
            `, { caseId, memberId });

            if (existingMetric.recordset.length > 0) {
                await query(`
                    UPDATE PerformanceMetrics
                    SET response_time_seconds = @responseTimeSeconds,
                        week_number = @weekNumber,
                        year_number = @yearNumber
                    WHERE case_id = @caseId AND member_id = @memberId
                `, { caseId, memberId, responseTimeSeconds, weekNumber, yearNumber });
            } else {
                await query(`
                    INSERT INTO PerformanceMetrics
                    (case_id, member_id, response_time_seconds, week_number, year_number)
                    VALUES (@caseId, @memberId, @responseTimeSeconds, @weekNumber, @yearNumber)
                `, { caseId, memberId, responseTimeSeconds, weekNumber, yearNumber });
            }
        }

        // Emit socket event for real-time update
        const io = req.app.get('io');
        io.emit('response-submitted', {
            caseUuid,
            memberId,
            responseType,
            estimatedMinutes,
            respondedAt: response.responded_at
        });

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error('Error submitting response:', error);
        res.status(500).json({ error: 'Failed to submit response' });
    }
});

/**
 * POST /api/responses/arrival
 * Confirm team member arrival at OR
 */
router.post('/arrival', async (req, res) => {
    try {
        const { caseUuid, memberId } = req.body;

        if (!caseUuid || !memberId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get case ID
        const caseResult = await query(`
            SELECT case_id FROM EmergencyCases WHERE case_uuid = @caseUuid
        `, { caseUuid });

        if (caseResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const caseId = caseResult.recordset[0].case_id;

        // Update response with arrival time
        await query(`
            UPDATE TeamResponses
            SET actual_arrival_at = datetime('now'),
                arrival_confirmed = 1
            WHERE case_id = @caseId AND member_id = @memberId
        `, { caseId, memberId });

        // Fetch the updated response
        const result = await query(`
            SELECT * FROM TeamResponses
            WHERE case_id = @caseId AND member_id = @memberId
        `, { caseId, memberId });

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Response not found' });
        }

        const response = result.recordset[0];

        // Update performance metric with arrival time
        const alertTime = await query(`
            SELECT alert_sent_at FROM CaseTeamAssignments
            WHERE case_id = @caseId AND member_id = @memberId
        `, { caseId, memberId });

        if (alertTime.recordset.length > 0) {
            const alertSentAt = new Date(alertTime.recordset[0].alert_sent_at);
            const arrivedAt = new Date(response.actual_arrival_at);
            const arrivalTimeSeconds = Math.floor((arrivedAt - alertSentAt) / 1000);

            // Check if on time
            const estimatedSeconds = response.estimated_minutes * 60;
            const wasOnTime = arrivalTimeSeconds <= estimatedSeconds;

            await query(`
                UPDATE PerformanceMetrics
                SET arrival_time_seconds = @arrivalTimeSeconds,
                    was_on_time = @wasOnTime
                WHERE case_id = @caseId AND member_id = @memberId
            `, { arrivalTimeSeconds, wasOnTime, caseId, memberId });
        }

        // Emit socket event for real-time update
        const io = req.app.get('io');
        io.emit('member-arrived', {
            caseUuid,
            memberId,
            arrivedAt: response.actual_arrival_at
        });

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error('Error confirming arrival:', error);
        res.status(500).json({ error: 'Failed to confirm arrival' });
    }
});

/**
 * Helper function to get ISO week number
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = router;
