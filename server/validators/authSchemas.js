const { z } = require('zod');
const { empty } = require('./commonSchemas');

const registerCredentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128)
}).strict();

const loginCredentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128)
}).strict();

module.exports = {
  registerSchema: z.object({ body: registerCredentials, query: empty, params: empty }),
  loginSchema: z.object({ body: loginCredentials, query: empty, params: empty })
};
