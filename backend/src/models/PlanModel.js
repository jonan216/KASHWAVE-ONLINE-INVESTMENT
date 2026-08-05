const { pool, mockStore, isPostgresConnected } = require('../config/db');

class PlanModel {
  static async getAllActive() {
    if (isPostgresConnected()) {
      const res = await pool.query("SELECT * FROM investment_plans WHERE status = 'active' ORDER BY min_investment ASC");
      return res.rows;
    } else {
      return mockStore.plans.filter(p => p.status === 'active');
    }
  }

  static async getAll() {
    if (isPostgresConnected()) {
      const res = await pool.query("SELECT * FROM investment_plans ORDER BY id DESC");
      return res.rows;
    } else {
      return mockStore.plans;
    }
  }

  static async findById(id) {
    if (isPostgresConnected()) {
      const res = await pool.query("SELECT * FROM investment_plans WHERE id = $1", [id]);
      return res.rows[0] || null;
    } else {
      return mockStore.plans.find(p => p.id === parseInt(id)) || null;
    }
  }

  static async create({ title, description, daily_return_percent, duration_days, min_investment, max_investment, risk_level }) {
    if (isPostgresConnected()) {
      const res = await pool.query(
        `INSERT INTO investment_plans 
         (title, description, daily_return_percent, duration_days, min_investment, max_investment, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [title, description, daily_return_percent, duration_days, min_investment, max_investment, risk_level]
      );
      return res.rows[0];
    } else {
      const newId = mockStore.plans.length ? Math.max(...mockStore.plans.map(p => p.id)) + 1 : 1;
      const plan = {
        id: newId,
        title,
        description,
        daily_return_percent: parseFloat(daily_return_percent),
        duration_days: parseInt(duration_days),
        min_investment: parseFloat(min_investment),
        max_investment: parseFloat(max_investment),
        risk_level: risk_level || 'medium',
        status: 'active'
      };
      mockStore.plans.push(plan);
      return plan;
    }
  }

  static async update(id, { title, description, daily_return_percent, duration_days, min_investment, max_investment, risk_level, status }) {
    if (isPostgresConnected()) {
      const res = await pool.query(
        `UPDATE investment_plans 
         SET title = $1, description = $2, daily_return_percent = $3, duration_days = $4,
             min_investment = $5, max_investment = $6, risk_level = $7, status = $8
         WHERE id = $9 RETURNING *`,
        [title, description, daily_return_percent, duration_days, min_investment, max_investment, risk_level, status, id]
      );
      return res.rows[0];
    } else {
      const plan = mockStore.plans.find(p => p.id === parseInt(id));
      if (!plan) return null;
      if (title) plan.title = title;
      if (description) plan.description = description;
      if (daily_return_percent) plan.daily_return_percent = parseFloat(daily_return_percent);
      if (duration_days) plan.duration_days = parseInt(duration_days);
      if (min_investment) plan.min_investment = parseFloat(min_investment);
      if (max_investment) plan.max_investment = parseFloat(max_investment);
      if (risk_level) plan.risk_level = risk_level;
      if (status) plan.status = status;
      return plan;
    }
  }
}

module.exports = PlanModel;
