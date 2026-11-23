const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * GET /api/team/members
 * Get all team members
 */
router.get('/members', async (req, res) => {
    try {
        const result = await query(`
            SELECT
                tm.member_id,
                tm.full_name,
                tm.phone_number,
                tm.is_active,
                tr.role_id,
                tr.role_name,
                tr.role_name_hebrew
            FROM TeamMembers tm
            INNER JOIN TeamRoles tr ON tm.role_id = tr.role_id
            WHERE tm.is_active = 1
            ORDER BY tr.role_id, tm.full_name
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
});

/**
 * GET /api/team/members/role/:roleId
 * Get team members by role
 */
router.get('/members/role/:roleId', async (req, res) => {
    try {
        const { roleId } = req.params;

        const result = await query(`
            SELECT
                tm.member_id,
                tm.full_name,
                tm.phone_number
            FROM TeamMembers tm
            WHERE tm.role_id = @roleId AND tm.is_active = 1
            ORDER BY tm.full_name
        `, { roleId });

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching team members by role:', error);
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
});

/**
 * GET /api/team/roles
 * Get all team roles
 */
router.get('/roles', async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM TeamRoles
            ORDER BY role_id
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching team roles:', error);
        res.status(500).json({ error: 'Failed to fetch team roles' });
    }
});

/**
 * GET /api/team/shift/current
 * Get current shift assignments
 */
router.get('/shift/current', async (req, res) => {
    try {
        const result = await query(`
            SELECT
                cs.shift_id,
                cs.shift_start,
                cs.shift_end,
                tm.member_id,
                tm.full_name,
                tm.phone_number,
                tr.role_id,
                tr.role_name,
                tr.role_name_hebrew
            FROM CurrentShift cs
            INNER JOIN TeamMembers tm ON cs.member_id = tm.member_id
            INNER JOIN TeamRoles tr ON cs.role_id = tr.role_id
            WHERE cs.is_active = 1
                AND cs.shift_start <= GETDATE()
                AND cs.shift_end >= GETDATE()
            ORDER BY tr.role_id
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching current shift:', error);
        res.status(500).json({ error: 'Failed to fetch current shift' });
    }
});

/**
 * POST /api/team/shift
 * Create or update shift assignment
 */
router.post('/shift', async (req, res) => {
    try {
        const { roleId, memberId, shiftStart, shiftEnd } = req.body;

        if (!roleId || !memberId || !shiftStart || !shiftEnd) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await query(`
            INSERT INTO CurrentShift (role_id, member_id, shift_start, shift_end, is_active)
            OUTPUT INSERTED.*
            VALUES (@roleId, @memberId, @shiftStart, @shiftEnd, 1)
        `, { roleId, memberId, shiftStart, shiftEnd });

        res.json({
            success: true,
            shift: result.recordset[0]
        });

    } catch (error) {
        console.error('Error creating shift:', error);
        res.status(500).json({ error: 'Failed to create shift' });
    }
});

/**
 * GET /api/team/assistant-doctors
 * Get available assistant doctors for selection
 */
router.get('/assistant-doctors', async (req, res) => {
    try {
        const result = await query(`
            SELECT
                tm.member_id,
                tm.full_name,
                tm.phone_number
            FROM TeamMembers tm
            INNER JOIN TeamRoles tr ON tm.role_id = tr.role_id
            WHERE tr.role_name = 'Assistant Doctor' AND tm.is_active = 1
            ORDER BY tm.full_name
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching assistant doctors:', error);
        res.status(500).json({ error: 'Failed to fetch assistant doctors' });
    }
});

module.exports = router;
