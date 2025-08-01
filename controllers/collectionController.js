const db = require('../models/db');
const jwt = require('jsonwebtoken');

exports.addCollection = (req, res) => {
  const { user_id, amount, frequency, collected_at } = req.body;
  
  const collectedAt = collected_at ? new Date(collected_at) : new Date();
  db.query(
    'INSERT INTO collections (bank_id, user_id, amount, frequency, collected_at) VALUES (?, ?, ?, ?, ?)',
    [req?.query?.user_id, user_id, amount, frequency, collectedAt],
    (err, result) => {
      console.error('DB Error:', err);
      if (err) return res.status(500).json({ error: err });
      res.status(201).json({ message: 'Collection added successfully' });
    }
  );
};

exports.getTotalAmountByUser = (req, res) => {
  const { user_id } = req.params;
  db.query(
    'SELECT SUM(amount) AS total FROM collections WHERE user_id = ? AND is_deleted = FALSE',
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.status(200).json(results[0]);
    }
  );
};

exports.getCollectionsByUser = (req, res) => {
  const { user_id } = req.params;
  const { start, end } = req.query;

  let query = 'SELECT * FROM collections WHERE user_id = ? AND is_deleted = FALSE';
  let params = [user_id];

  if (start && end) {
    query += ' AND DATE(collected_at) BETWEEN ? AND ?';
    params.push(start, end);
  }
  query += ' ORDER BY collected_at DESC';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json(results);
  });

  console.log("Final Query:", query);
  console.log("Params:", params);
};

exports.getSummaryByBank = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    const queries = {
      today: `SELECT SUM(c.amount) as total FROM collections c 
              JOIN users u ON c.user_id = u.id 
              WHERE u.bank_id = ? AND DATE(c.collected_at) = CURDATE() AND c.is_deleted = FALSE`,

      yesterday: `SELECT SUM(c.amount) as total FROM collections c 
                  JOIN users u ON c.user_id = u.id 
                  WHERE u.bank_id = ? AND DATE(c.collected_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND c.is_deleted = FALSE`,

      week: `SELECT SUM(c.amount) as total FROM collections c 
             JOIN users u ON c.user_id = u.id 
             WHERE u.bank_id = ? AND YEARWEEK(c.collected_at, 1) = YEARWEEK(CURDATE(), 1) AND c.is_deleted = FALSE`,

      month: `SELECT SUM(c.amount) as total FROM collections c 
              JOIN users u ON c.user_id = u.id 
              WHERE u.bank_id = ? AND MONTH(c.collected_at) = MONTH(CURDATE()) 
              AND YEAR(c.collected_at) = YEAR(CURDATE()) AND c.is_deleted = FALSE`,

      year: `SELECT SUM(c.amount) as total FROM collections c 
             JOIN users u ON c.user_id = u.id 
             WHERE u.bank_id = ? AND YEAR(c.collected_at) = YEAR(CURDATE()) AND c.is_deleted = FALSE`,
    };

    const summary = {};
    let pending = Object.keys(queries).length;
    let hasError = false;

    for (const key in queries) {
      db.query(queries[key], [bankId], (err, results) => {
        if (hasError) return;
        if (err) {
          hasError = true;
          return res.status(500).json({ error: err });
        }
        summary[key] = results[0].total || 0;

        pending--;
        if (pending === 0) {
          return res.status(200).json(summary);
        }
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(403).json({ error: 'Invalid token' });
  }
};


exports.getFilteredCollections = (req, res) => {
  const { period } = req.params;
  const bankId = req.bankId;

  let dateCondition = '';
  switch (period) {
    case 'today':
      dateCondition = 'DATE(c.created_at) = CURDATE()';
      break;
    case 'yesterday':
      dateCondition = 'DATE(c.created_at) = CURDATE() - INTERVAL 1 DAY';
      break;
    case 'week':
      dateCondition = 'YEARWEEK(c.created_at, 1) = YEARWEEK(CURDATE(), 1)';
      break;
    case 'month':
      dateCondition = 'MONTH(c.created_at) = MONTH(CURDATE()) AND YEAR(c.created_at) = YEAR(CURDATE())';
      break;
    case 'year':
      dateCondition = 'YEAR(c.created_at) = YEAR(CURDATE())';
      break;
    default:
      return res.status(400).json({ message: 'Invalid period' });
  }

  const query = `
    SELECT u.first_name, u.last_name, c.amount, DATE(c.created_at) as date
    FROM collections c
    JOIN users u ON c.user_id = u.id
    WHERE ${dateCondition} AND u.bank_id = ? AND c.is_deleted = FALSE
    ORDER BY c.created_at DESC
  `;

  db.query(query, [bankId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json(results);
  });
};

exports.getUser = (req, res) => {
  let query = 'SELECT * FROM users WHERE user_id = ? AND is_deleted = FALSE';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json(results);
  });
};

exports.getCollections = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    const query = `
      SELECT c.*, u.first_name, u.last_name 
      FROM collections c 
      JOIN users u ON c.user_id = u.id 
      WHERE u.bank_id = ? AND c.is_deleted = FALSE
      ORDER BY c.collected_at DESC
    `;

    db.query(query, [bankId], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.status(200).json(results);
    });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

exports.getCollectionsByDateRange = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { start, end } = req.query;

  if (!token) return res.status(401).json({ error: 'Token missing' });
  if (!start || !end) return res.status(400).json({ error: 'Start and end dates required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    const query = `
      SELECT c.*, u.first_name, u.last_name 
      FROM collections c
      JOIN users u ON c.user_id = u.id
      WHERE u.bank_id = ? AND DATE(c.collected_at) BETWEEN ? AND ? AND c.is_deleted = FALSE
      ORDER BY c.collected_at DESC
    `;

    db.query(query, [bankId, start, end], (err, results) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ error: 'Database query failed' });
      }

      const total = results.reduce((sum, item) => sum + parseFloat(item.amount), 0);

      res.status(200).json({
        data: results,
        total,
      });
    });
  } catch (err) {
    console.error('Token error:', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

exports.getTopUsers = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    const query = `
      SELECT u.first_name, u.last_name, SUM(c.amount) AS total
      FROM collections c
      JOIN users u ON c.user_id = u.id
      WHERE u.bank_id = ? AND c.is_deleted = FALSE  
      GROUP BY c.user_id
      ORDER BY total DESC
      LIMIT 10
    `;

    db.query(query, [bankId], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Failed to fetch top users' });
      }

      // Optional: Combine first and last name for display
      const formatted = results.map(user => ({
        name: `${user.first_name} ${user.last_name}`,
        total: user.total
      }));

      res.status(200).json(formatted);
    });
  } catch (err) {
    console.error('Token Error:', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
};
exports.addBulkCollections = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  let bankId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    bankId = decoded.bankId;
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  const { collections } = req.body;
  if (!collections || !Array.isArray(collections) || collections.length === 0) {
    return res.status(400).json({ error: 'No collections provided' });
  }

  const values = collections.map(c => [
    bankId, c.user_id, c.amount, c.frequency, new Date()
  ]);

  const sql = `INSERT INTO collections (bank_id, user_id, amount, frequency, collected_at) VALUES ?`;

  db.query(sql, [values], (err) => {
    if (err) {
      console.error('❌ Bulk insert error:', err);
      return res.status(500).json({ message: 'Insert failed', error: err });
    }

    res.status(201).json({ message: '✅ Bulk collections added successfully' });
  });
};

exports.deleteCollection = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;
    const { collectionId } = req.params;

    // Delete only if the collection belongs to the same bank
    const query = `
      UPDATE collections c 
  JOIN users u ON c.user_id = u.id 
  SET c.is_deleted = TRUE 
  WHERE c.id = ? AND u.bank_id = ?
    `;

    db.query(query, [collectionId, bankId], (err, result) => {
      if (err) {
        console.error('Delete Error:', err);
        return res.status(500).json({ error: 'Failed to delete collection' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Collection not found or unauthorized' });
      }

      res.status(200).json({ message: 'Collection deleted successfully' });
    });
  } catch (err) {
    console.error('Token Error:', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// ✅ backend/controllers/collectionController.js (add at bottom)
exports.restoreCollection = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;
    const { collectionId } = req.params;

    const query = `
      UPDATE collections c 
      JOIN users u ON c.user_id = u.id 
      SET c.is_deleted = FALSE
      WHERE c.id = ? AND u.bank_id = ?`;

    db.query(query, [collectionId, bankId], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Collection not found or unauthorized' });
      }

      res.status(200).json({ message: 'Collection restored successfully' });
    });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};


exports.getPublicUserCollections = (req, res) => {
  const { access_token } = req.params;

  // Step 1: Find the user with the token
  const userQuery = `
    SELECT id, first_name, last_name, package_amount
    FROM users
    WHERE access_token = ?
  `;

  db.query(userQuery, [access_token], (err, userResult) => {
    if (err || userResult.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    const user = userResult[0];

    // Step 2: Get all collections for that user
    const collectionQuery = `
      SELECT collected_at, amount, frequency
      FROM collections
      WHERE user_id = ?
    `;

    db.query(collectionQuery, [user.id], (err, collections) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch collections' });
      }

      // Step 3: Calculate total collected amount
      const totalCollected = collections.reduce((sum, entry) => sum + entry.amount, 0);

      // Step 4: Return full response
      res.json({
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          package_amount: user.package_amount,
          total_collected: totalCollected
        },
        collections
      });
    });
  });
};
