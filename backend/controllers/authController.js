const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const User = require('../models/User');
const { cookieOptions } = require('../config/security');
// Compare a real hash even for an unknown account, limiting username timing leaks.
const dummyHash = bcrypt.hashSync('unavailable-account-password', 10);
/**
 * Strip a user document down to the fields safe to send to the browser.
 * @param {UserDocument} user Mongoose user document.
 * @returns {{id: string, username: string, role: string}} Public user profile.
 */
const publicUser = (user) => ({ id: user._id, username: user.username, role: user.role });

/**
 * POST /api/auth/login: verify credentials and open a session.
 * Sets an httpOnly `session` JWT cookie (1 h) and returns a CSRF token that the
 * client must echo in the `X-CSRF-Token` header on state-changing requests.
 * @param {express.Request} req Body: `{ username, password }`.
 * @param {express.Response} res 200 `{ user, csrfToken }` or 401.
 * @returns {Promise<void>}
 */
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

/**
 * POST /api/auth/register: create a standard (non-admin) account.
 * The role is always forced to `user`; the password is hashed by the User model.
 * @param {express.Request} req Body: `{ username, email, password }`.
 * @param {express.Response} res 201 on success; duplicates yield 409 via the error handler.
 * @returns {Promise<void>}
 */
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  await User.create({ username, email, password, role: 'user' });
  res.status(201).json({ message: 'Compte créé.' });
};

/**
 * GET /api/auth/me: return the authenticated user and the session's CSRF token.
 * @param {express.Request} req Requires `authenticateToken` (sets `req.user`).
 * @param {express.Response} res 200 `{ user, csrfToken }`.
 */
exports.me = (req, res) => res.json({ user: publicUser(req.user), csrfToken: req.csrfToken });
/**
 * POST /api/auth/logout: end the session.
 * Increments `sessionVersion` so every previously issued JWT is revoked, then
 * clears the cookie.
 * @param {express.Request} req Requires `authenticateToken`.
 * @param {express.Response} res 204 No Content.
 * @returns {Promise<void>}
 */
exports.logout = async (req, res) => {
  // Revoke existing sessions, including copied cookies, rather than just clearing the browser.
  await User.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 } });
  res.clearCookie('session', cookieOptions);
  res.sendStatus(204);
};
