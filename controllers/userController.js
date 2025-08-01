const db = require('../models/db');
const jwt = require('jsonwebtoken');

// exports.addUser = (req, res) => {
//   const { first_name, last_name, dial_code, phone, email, package_name, package_amount } = req.body;

//   if (!first_name || !last_name || !dial_code || !phone || !package_name || !package_amount) {
//     return res.status(400).json({ error: 'Missing required fields' });
//   }

//   const token = req.headers.authorization?.split(' ')[1];
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const bankId = decoded.bankId;

//     // Step 1: Get bank acronym
//     db.query('SELECT acronym FROM banks WHERE id = ?', [bankId], (err, bankResult) => {
//       if (err || bankResult.length === 0) {
//         return res.status(500).json({ error: 'Failed to fetch bank acronym' });
//       }

//       const acronym = bankResult[0].acronym;

//       // Step 2: Count existing users for this bank
//       db.query('SELECT COUNT(*) AS count FROM users WHERE bank_id = ?', [bankId], (err, countResult) => {
//         if (err) {
//           return res.status(500).json({ error: 'Failed to count existing users' });
//         }

//         const userNumber = countResult[0].count + 1;
//         const customUserId = `${acronym}${userNumber.toString().padStart(2, '0')}`; // e.g., RG01

//         // Step 3: Insert new user with custom_user_id
//         db.query(
//           `INSERT INTO users 
//             (bank_id, first_name, last_name, dial_code, phone, email, package_name, package_amount, custom_user_id) 
//            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             bankId,
//             first_name,
//             last_name,
//             dial_code,
//             phone,
//             email || null,
//             package_name,
//             package_amount,
//             customUserId,
//           ],
//           (err, result) => {
//             if (err) {
//               return res.status(500).json({ error: err });
//             }
//             res.status(201).json({
//               message: 'User added successfully',
//               custom_user_id: customUserId,
//             });
//           }
//         );
//       });
//     });
//   } catch (err) {
//     return res.status(403).json({ error: 'Invalid token' });
//   }
// };

const crypto = require('crypto'); // ✅ use crypto module
const accessToken = crypto.randomBytes(16).toString('hex');
exports.addUser = (req, res) => {
  const { first_name, last_name, dial_code, phone, email, package_name, package_amount } = req.body;

  if (!first_name || !last_name || !dial_code || !phone || !package_name || !package_amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    // Step 1: Get bank acronym
    db.query('SELECT acronym FROM banks WHERE id = ?', [bankId], (err, bankResult) => {
      if (err || bankResult.length === 0) {
        return res.status(500).json({ error: 'Failed to fetch bank acronym' });
      }

      const acronym = bankResult[0].acronym;

      // Step 2: Count existing users for this bank
      db.query('SELECT COUNT(*) AS count FROM users WHERE bank_id = ?', [bankId], (err, countResult) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to count existing users' });
        }

        const userNumber = countResult[0].count + 1;
        const customUserId = `${acronym}${userNumber.toString().padStart(2, '0')}`; // e.g., RG01

        // ✅ Generate access token using crypto
        const accessToken = crypto.randomUUID(); // generates a secure UUID v4

        // Step 3: Insert new user with custom_user_id and access_token
        db.query(
          `INSERT INTO users 
            (bank_id, first_name, last_name, dial_code, phone, email, package_name, package_amount, custom_user_id, access_token) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bankId,
            first_name,
            last_name,
            dial_code,
            phone,
            email || null,
            package_name,
            package_amount,
            customUserId,
            accessToken,
          ],
          (err, result) => {
            if (err) {
              return res.status(500).json({ error: err });
            }
            res.status(201).json({
              message: 'User added successfully',
              custom_user_id: customUserId,
              access_token: accessToken, // ✅ returned in response
            });
          }
        );
      });
    });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};



exports.getUsers = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    db.query(
      'SELECT * FROM users WHERE bank_id = ? AND is_deleted = FALSE',
      [bankId],
      (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(200).json(results);
      }
    );
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

exports.deleteUser = (req, res) => {
  const { userId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    // Step 1: Soft delete the user
    db.query(
      'UPDATE users SET is_deleted = TRUE WHERE id = ? AND bank_id = ?',
      [userId, bankId],
      (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result.affectedRows === 0) {
          return res.status(403).json({ error: 'User not found or not owned by bank' });
        }

        // Step 2: Soft delete all collections for the user
        db.query(
          'UPDATE collections SET is_deleted = TRUE WHERE user_id = ?',
          [userId],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2 });

            res.status(200).json({ message: 'User and their collections soft deleted successfully' });
          }
        );
      }
    );
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, dial_code, phone, email, package_name, package_amount } = req.body;

  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    db.query(
      `UPDATE users
       SET first_name = ?, last_name = ?,  dial_code = ?, phone = ?, email = ?, package_name = ?, package_amount = ?
       WHERE id = ? AND bank_id = ?`,
      [first_name, last_name,  dial_code, phone, email || null, package_name, package_amount, id, bankId],
      (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.status(200).json({ message: 'User updated successfully' });
      }
    );
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

exports.updateDialCode = (req, res) => {
  const { dial_code } = req.body;
  console.log('Received updateDialCode request:', { dial_code });

  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;
    console.log('Decoded token:', { bankId });

    db.query(
      `UPDATE users SET dial_code = ? WHERE bank_id = ?`,
      [dial_code, bankId],
      (err, result) => {
        console.log("result", result);
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error occurred', details: err.message });
        }
        console.log('Database update result:', { affectedRows: result.affectedRows });
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'No users found for this bank ID' });
        }
        res.status(200).json({
          message: 'Dial codes updated successfully',
          affectedRows: result.affectedRows,
        });
      }
    );
  } catch (err) {
    console.error('Token error:', err);
    return res.status(403).json({ error: 'Invalid token', details: err.message });
  }
};


// ✅ backend/controllers/userController.js (add at bottom)
// Restore a soft-deleted user and their collections
exports.restoreUser = (req, res) => {
  const userId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    // Step 1: Restore user
    db.query(
      'UPDATE users SET is_deleted = FALSE WHERE id = ? AND bank_id = ?',
      [userId, bankId],
      (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result.affectedRows === 0) {
          return res.status(400).json({ error: 'User not found or unauthorized' });
        }

        // Step 2: Restore collections
        db.query(
          'UPDATE collections SET is_deleted = FALSE WHERE user_id = ?',
          [userId],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2 });
            res.status(200).json({ message: 'User and collections restored' });
          }
        );
      }
    );
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};



exports.getDeletedUsers = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    db.query(
      'SELECT * FROM users WHERE bank_id = ? AND is_deleted = TRUE',
      [bankId],
      (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(200).json(results);
      }
    );
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// ✅ Fetch access_token of a user (used for public collection sharing)
exports.getAccessTokenByUserId = (req, res) => {
  const { user_id } = req.query;
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    db.query(
      'SELECT access_token FROM users WHERE id = ? AND bank_id = ? AND is_deleted = FALSE',
      [user_id, bankId],
      (err, results) => {
        if (err || results.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ access_token: results[0].access_token });
      }
    );
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
