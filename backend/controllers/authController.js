const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const User = require('../models/User');
const { cookieOptions } = require('../config/security');
// Compare a real hash even for an unknown account, limiting username timing leaks.
const dummyHash = bcrypt.hashSync('unavailable-account-password', 10);
const publicUser = (user) => ({ id: user._id, username: user.username, role: user.role });

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select('+password');
  const valid = await bcrypt.compare(password, user?.password || dummyHash);
  if (!user || !valid) return res.status(401).json({ message: 'Identifiants invalides.' });
  const csrfToken = randomBytes(32).toString('hex');
  const token = jwt.sign(
    { version: user.sessionVersion || 0, csrf: csrfToken },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      subject: String(user._id),
      issuer: 'exam1',
      audience: 'exam1-web',
    },
  );
  res.cookie('session', token, { ...cookieOptions, maxAge: 3600000 });
  res.json({ user: publicUser(user), csrfToken });
};

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  await User.create({ username, email, password, role: 'user' });
  res.status(201).json({ message: 'Compte créé.' });
};

exports.me = (req, res) => res.json({ user: publicUser(req.user), csrfToken: req.csrfToken });
exports.logout = async (req, res) => {
  // Revoke existing sessions, including copied cookies, rather than just clearing the browser.
  await User.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 } });
  res.clearCookie('session', cookieOptions);
  res.sendStatus(204);
};
