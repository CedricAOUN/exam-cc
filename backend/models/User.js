/**
 * Mongoose model for accounts. The password is hashed with bcrypt in a `pre('save')`
 * hook and excluded from queries by default (`select: false`).
 * `sessionVersion` is bumped to invalidate previously issued tokens.
 * @typedef {Object} UserDocument
 * @property {string} username Unique.
 * @property {string} email Unique.
 * @property {string} password bcrypt hash.
 * @property {number} sessionVersion
 * @property {'user'|'admin'} role
 * @module models/User
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  sessionVersion: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }, // Peut être 'user' ou 'admin'
});

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
