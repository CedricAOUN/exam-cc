const jwt = require('jsonwebtoken');
const { timingSafeEqual } = require('node:crypto');
const User = require('../models/User');
const { asyncHandler } = require('../utils/http');

exports.authenticateToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ message: 'Connexion requise.' });
  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'exam1',
      audience: 'exam1-web',
    });
  } catch {
    return res.status(401).json({ message: 'Session invalide ou expirée.' });
  }
  if (!/^[a-f0-9]{24}$/i.test(claims.sub || '')) return res.sendStatus(401);
  const user = await User.findById(claims.sub).select('username email role sessionVersion');
  if (!user || (user.sessionVersion || 0) !== claims.version)
    return res.status(401).json({ message: 'Session invalide.' });
  req.user = user;
  req.csrfToken = claims.csrf;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const supplied = req.get('X-CSRF-Token');
    if (
      typeof supplied !== 'string' ||
      typeof claims.csrf !== 'string' ||
      Buffer.byteLength(supplied) !== Buffer.byteLength(claims.csrf) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(claims.csrf))
    ) {
      return res.status(403).json({ message: 'Jeton CSRF invalide.' });
    }
  }
  next();
});

exports.isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Accès interdit.' });
  next();
};
