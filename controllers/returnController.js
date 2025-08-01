const db = require('../models/db');
const jwt = require('jsonwebtoken');

// Helper: Get difference in days
function getDateDifferenceInDays(fromDate, toDate) {
  const diffTime = Math.abs(new Date(toDate) - new Date(fromDate));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: Determine compound frequency
function getCompoundingFrequencyValue(freq) {
  switch (freq?.toLowerCase()) {
    case 'daily': return 365;
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'yearly': return 1;
    default: return 365;
  }
}

exports.processReturn = async (req, res) => {
  const { userId } = req.params;
  const { from_date, to_date, rate, is_compound, compound_frequency } = req.body;

  if (!from_date || !to_date || !rate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const token = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    // Verify user belongs to bank
    db.query(
      'SELECT * FROM users WHERE id = ? AND bank_id = ?',
      [userId, bankId],
      (err, userResult) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        if (userResult.length === 0) return res.status(404).json({ error: 'User not found or unauthorized' });

        // Fetch all deposits individually in the given date range
        db.query(
          `SELECT amount, DATE(collected_at) AS collected_date 
           FROM collections 
           WHERE user_id = ? AND DATE(collected_at) BETWEEN ? AND ?`,
          [userId, from_date, to_date],
          (err, deposits) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });

            let totalPrincipal = 0;
            let totalInterest = 0;
            const rateDecimal = rate / 100;
            const n = getCompoundingFrequencyValue(compound_frequency);

            for (const deposit of deposits) {
              const P = deposit.amount;
              const D = getDateDifferenceInDays(deposit.collected_date, to_date);
              const t = D / 365;
              totalPrincipal += P;

              if (is_compound) {
                const A = P * Math.pow(1 + rateDecimal / n, n * t);
                totalInterest += A - P;
              } else {
                const interest = (P * rate * D) / (100 * 365);
                totalInterest += interest;
              }
            }

            const amountReturned = totalPrincipal + totalInterest;

            res.status(200).json({
              principal: parseFloat(totalPrincipal.toFixed(2)),
              interest: parseFloat(totalInterest.toFixed(2)),
              amount_returned: parseFloat(amountReturned.toFixed(2)),
              method: is_compound ? `compound (${compound_frequency})` : 'simple',
              rate: parseFloat(rate),
              total_deposits: deposits.length,
              period: `${from_date} to ${to_date}`,
            });
          }
        );
      }
    );
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token', details: err.message });
  }
};
