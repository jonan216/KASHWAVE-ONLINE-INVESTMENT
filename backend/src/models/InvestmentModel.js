const { pool, mockStore, isPostgresConnected } = require('../config/db');

class InvestmentModel {
  static async getByUserId(userId) {
    if (isPostgresConnected()) {
      const res = await pool.query(
        `SELECT ui.*, ip.title as plan_title, ip.daily_return_percent, ip.duration_days, ip.risk_level
         FROM investments ui
         JOIN investment_plans ip ON ui.plan_id = ip.id
         WHERE ui.user_id = $1
         ORDER BY ui.created_at DESC`,
        [userId]
      );
      return res.rows.map(inv => {
        const startDate = new Date(inv.start_date || inv.created_at);
        const lastPayout = inv.last_payout_at ? new Date(inv.last_payout_at) : startDate;
        const nextPayout = new Date(lastPayout.getTime() + 24 * 60 * 60 * 1000);
        return {
          ...inv,
          start_date: startDate.toISOString(),
          next_payout_at: nextPayout.toISOString()
        };
      });
    } else {
      return (mockStore.investments || [])
        .filter(inv => inv.user_id === parseInt(userId))
        .map(inv => {
          const plan = (mockStore.plans || []).find(p => p.id === inv.plan_id) || {};
          const startDate = new Date(inv.start_date || inv.created_at || Date.now());
          const lastPayout = inv.last_payout_at ? new Date(inv.last_payout_at) : startDate;
          const nextPayout = new Date(lastPayout.getTime() + 24 * 60 * 60 * 1000);
          return {
            ...inv,
            plan_title: plan.title,
            daily_return_percent: plan.daily_return_percent,
            duration_days: plan.duration_days,
            risk_level: plan.risk_level,
            start_date: startDate.toISOString(),
            next_payout_at: nextPayout.toISOString()
          };
        });
    }
  }

  static async create({ userId, planId, investedAmount, expectedReturn, durationDays }) {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 86400000);

    if (isPostgresConnected()) {
      const res = await pool.query(
        `INSERT INTO investments (user_id, plan_id, invested_amount, expected_return, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, planId, investedAmount, expectedReturn, startDate, endDate]
      );
      return res.rows[0];
    } else {
      const newId = (mockStore.investments || []).length ? Math.max(...mockStore.investments.map(i => i.id)) + 1 : 101;
      const inv = {
        id: newId,
        user_id: parseInt(userId),
        plan_id: parseInt(planId),
        invested_amount: parseFloat(investedAmount),
        expected_return: parseFloat(expectedReturn),
        accrued_earnings: 0.00,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        created_at: startDate.toISOString()
      };
      mockStore.investments = mockStore.investments || [];
      mockStore.investments.push(inv);
      return inv;
    }
  }

  static async getAll() {
    if (isPostgresConnected()) {
      const res = await pool.query(
        `SELECT ui.*, u.full_name, u.email, ip.title as plan_title
         FROM investments ui
         JOIN users u ON ui.user_id = u.id
         JOIN investment_plans ip ON ui.plan_id = ip.id
         ORDER BY ui.created_at DESC`
      );
      return res.rows.map(inv => {
        const startDate = new Date(inv.start_date || inv.created_at);
        const lastPayout = inv.last_payout_at ? new Date(inv.last_payout_at) : startDate;
        const nextPayout = new Date(lastPayout.getTime() + 24 * 60 * 60 * 1000);
        return {
          ...inv,
          start_date: startDate.toISOString(),
          next_payout_at: nextPayout.toISOString()
        };
      });
    } else {
      return (mockStore.investments || []).map(inv => {
        const user = (mockStore.users || []).find(u => u.id === inv.user_id) || {};
        const plan = (mockStore.plans || []).find(p => p.id === inv.plan_id) || {};
        const startDate = new Date(inv.start_date || inv.created_at || Date.now());
        const lastPayout = inv.last_payout_at ? new Date(inv.last_payout_at) : startDate;
        const nextPayout = new Date(lastPayout.getTime() + 24 * 60 * 60 * 1000);
        return {
          ...inv,
          full_name: user.full_name,
          email: user.email,
          plan_title: plan.title,
          start_date: startDate.toISOString(),
          next_payout_at: nextPayout.toISOString()
        };
      });
    }
  }
}

module.exports = InvestmentModel;
