const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * GET /api/analytics/top-performers
 * Get top performers of the week
 */
router.get('/top-performers', async (req, res) => {
    try {
        const now = new Date();
        const weekNumber = getWeekNumber(now);
        const yearNumber = now.getFullYear();

        const result = await query(`
            SELECT
                tm.member_id,
                tm.full_name,
                tr.role_name,
                tr.role_name_hebrew,
                COUNT(*) as total_responses,
                AVG(CAST(pm.response_time_seconds as FLOAT)) as avg_response_time,
                AVG(CAST(pm.arrival_time_seconds as FLOAT)) as avg_arrival_time,
                SUM(CASE WHEN pm.was_on_time = 1 THEN 1 ELSE 0 END) as on_time_count,
                CAST(SUM(CASE WHEN pm.was_on_time = 1 THEN 1 ELSE 0 END) as FLOAT) / COUNT(*) * 100 as on_time_percentage
            FROM PerformanceMetrics pm
            INNER JOIN TeamMembers tm ON pm.member_id = tm.member_id
            INNER JOIN TeamRoles tr ON tm.role_id = tr.role_id
            WHERE pm.week_number = @weekNumber
                AND pm.year_number = @yearNumber
                AND pm.arrival_time_seconds IS NOT NULL
            GROUP BY tm.member_id, tm.full_name, tr.role_name, tr.role_name_hebrew
            ORDER BY avg_arrival_time ASC
            LIMIT 10
        `, { weekNumber, yearNumber });

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching top performers:', error);
        res.status(500).json({ error: 'Failed to fetch top performers' });
    }
});

/**
 * GET /api/analytics/member/:memberId
 * Get performance metrics for specific member
 */
router.get('/member/:memberId', async (req, res) => {
    try {
        const { memberId } = req.params;

        const result = await query(`
            SELECT
                ec.case_uuid,
                ec.patient_full_name,
                ec.urgency_level,
                ec.triggered_at,
                pm.response_time_seconds,
                pm.arrival_time_seconds,
                pm.was_on_time,
                tr.response_type,
                tr.estimated_minutes
            FROM PerformanceMetrics pm
            INNER JOIN EmergencyCases ec ON pm.case_id = ec.case_id
            LEFT JOIN TeamResponses tr ON pm.case_id = tr.case_id AND pm.member_id = tr.member_id
            WHERE pm.member_id = @memberId
            ORDER BY ec.triggered_at DESC
        `, { memberId });

        // Calculate summary statistics
        const summary = await query(`
            SELECT
                COUNT(*) as total_cases,
                AVG(CAST(response_time_seconds as FLOAT)) as avg_response_time,
                AVG(CAST(arrival_time_seconds as FLOAT)) as avg_arrival_time,
                SUM(CASE WHEN was_on_time = 1 THEN 1 ELSE 0 END) as on_time_count,
                CAST(SUM(CASE WHEN was_on_time = 1 THEN 1 ELSE 0 END) as FLOAT) / COUNT(*) * 100 as on_time_percentage
            FROM PerformanceMetrics
            WHERE member_id = @memberId
                AND arrival_time_seconds IS NOT NULL
        `, { memberId });

        res.json({
            cases: result.recordset,
            summary: summary.recordset[0]
        });
    } catch (error) {
        console.error('Error fetching member analytics:', error);
        res.status(500).json({ error: 'Failed to fetch member analytics' });
    }
});

/**
 * GET /api/analytics/case-stats
 * Get overall case statistics
 */
router.get('/case-stats', async (req, res) => {
    try {
        const result = await query(`
            SELECT
                COUNT(*) as total_cases,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_cases,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_cases,
                AVG(CASE
                    WHEN surgery_started_at IS NOT NULL
                    THEN DATEDIFF(SECOND, triggered_at, surgery_started_at)
                    ELSE NULL
                END) as avg_time_to_surgery,
                SUM(CASE WHEN urgency_level = 'urgent' THEN 1 ELSE 0 END) as urgent_cases,
                SUM(CASE WHEN urgency_level = 'vacuum_double' THEN 1 ELSE 0 END) as vacuum_cases,
                SUM(CASE WHEN urgency_level = 'regular' THEN 1 ELSE 0 END) as regular_cases
            FROM EmergencyCases
            WHERE triggered_at >= DATEADD(DAY, -30, GETDATE())
        `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching case stats:', error);
        res.status(500).json({ error: 'Failed to fetch case statistics' });
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
