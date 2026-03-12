const db = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");

dotenv.config();

// Helper: Generate acronym from bank name
function generateAcronym(name) {
  return name
    .split(' ')
    .map(word => word[0].toUpperCase())
    .join('');
}

exports.registerBank = (req, res) => {
  const { name, email, password } = req.body;

  const passwordRegex = /^[a-zA-Z0-9]{6,10}$/;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Name is required' });
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: 'Password must be 6–10 alphanumeric characters',
    });
  }

  db.query('SELECT * FROM banks WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const acronym = generateAcronym(name); // Generate acronym like 'RG'
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO banks (name, email, password, acronym) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, acronym],
      (err, result) => {
        if (err) return res.status(500).json({ error: err });
        return res.status(201).json({ message: 'Bank registered successfully', acronym: acronym });
      }
    );
  });
};

exports.loginBank = (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM banks WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

    const bank = results[0];
    const match = await bcrypt.compare(password, bank.password);

    if (!match) return res.status(400).json({ message: 'Invalid password' });

    const token = jwt.sign({ bankId: bank.id }, process.env.JWT_SECRET, { expiresIn: '1y' });
    return res.status(200).json({ message: 'Login successful', token: token, id: bank.id });
  });
};

exports.getProfile = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;

    db.query('SELECT id, name, email, acronym FROM banks WHERE id = ?', [bankId], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (results.length === 0) return res.status(404).json({ error: 'Bank not found' });
      res.status(200).json(results[0]);
    });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

exports.changePassword = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old and new passwords are required' });
    }

    db.query('SELECT password FROM banks WHERE id = ?', [bankId], async (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: 'Bank not found' });
      }

      const isMatch = await bcrypt.compare(oldPassword, results[0].password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Old password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.query('UPDATE banks SET password = ? WHERE id = ?', [hashedPassword, bankId], (err) => {
        if (err) return res.status(500).json({ message: 'Error updating password' });
        res.json({ message: 'Password changed successfully' });
      });
    });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

exports.updateBankAcronym = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { newAcronym, country, currency } = req.body;

  if (!newAcronym || typeof newAcronym !== 'string' || newAcronym.length < 1 || newAcronym.length > 10) {
    return res.status(400).json({ message: 'Invalid acronym' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const bankId = decoded.bankId;
    const upperAcronym = newAcronym.toUpperCase();

    db.query(
      'UPDATE banks SET acronym = ?, currency = ?, country = ? WHERE id = ?',
      [upperAcronym, currency, country, bankId],
      (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update bank details' });
        return res.status(200).json({ message: 'Bank details updated successfully' });
      }
    );
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
