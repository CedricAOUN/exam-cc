const Joi = require('joi');
/** Joi rule for a 24-character hexadecimal MongoDB ObjectId (lower-cased, required). */
const id = Joi.string().hex().length(24).lowercase().required();
/**
 * Joi rule for a required, trimmed, non-empty string.
 * @param {number} max Maximum length.
 */
const text = (max) => Joi.string().trim().min(1).max(max).required();
/** Request body schemas for each endpoint (register, login, order, stock, status). */
const schemas = {
  register: Joi.object({
    username: Joi.string()
      .trim()
      .pattern(/^[a-zA-Z0-9_-]{3,40}$/)
      .required(),
    email: Joi.string()
      .trim()
      .lowercase()
      .email({ tlds: { allow: false } })
      .max(254)
      .required(),
    password: Joi.string()
      .min(12)
      .max(72)
      .custom((value, helpers) =>
        Buffer.byteLength(value) <= 72 ? value : helpers.error('any.invalid'),
      )
      .required(),
  }),
  login: Joi.object({ username: text(40), password: Joi.string().min(1).max(72).required() }),
  order: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({ productId: id, quantity: Joi.number().integer().min(1).max(1000).required() }),
      )
      .min(1)
      .max(100)
      .unique('productId')
      .required(),
    shippingAddress: Joi.object({
      street: text(200),
      city: text(100),
      postalCode: text(20),
      country: text(100),
    }).required(),
    paymentMethod: Joi.string().valid('Carte bancaire', 'PayPal', 'Virement').required(),
    shippingMethod: Joi.string().valid('colissimo', 'chronopost').required(),
  }),
  stock: Joi.object({ stock: Joi.number().integer().min(0).max(1000000).required() }),
  status: Joi.object({
    status: Joi.string()
      .valid('En attente', 'En cours de traitement', 'Expédiée', 'Délivrée', 'Annulée')
      .required(),
  }),
};
/**
 * Build a middleware that validates `req[source]` against a Joi schema.
 * Type coercion is disabled; on failure it responds 400 with the offending field
 * paths, otherwise it replaces `req[source]` with the sanitised value.
 * @param {Joi.ObjectSchema} schema Schema to apply.
 * @param {'body'|'params'|'query'} [source='body'] Request part to validate.
 * @returns {express.RequestHandler}
 */
const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const { value, error } = schema
      .required()
      .validate(req[source], { abortEarly: false, convert: false });
    if (error)
      return res.status(400).json({
        message: 'Données invalides.',
        fields: error.details.map((detail) => detail.path.join('.')),
      });
    req[source] = value;
    next();
  };
module.exports = { schemas, validate, id, Joi };
