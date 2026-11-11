const { z } = require('zod');
const { empty } = require('./commonSchemas');

const credentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128)
}).strict();

module.exports = {
  registerSchema: z.object({ body: credentials, query: empty, params: empty }),
  loginSchema: z.object({ body: credentials, query: empty, params: empty })
};
