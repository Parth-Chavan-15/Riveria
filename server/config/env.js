const { z } = require('zod');

const rawEnv = {
  ...process.env,
  JWT_SECRET: process.env.JWT_SECRET || process.env['JWT SECRET'] || 'riveria_super_secret_engine_key_2026',
  MONGODB_URI: process.env.MONGODB_URI || process.env['MONGODB URI'] || 'mongodb+srv://parthrchavan2006_db_user:kCj8ytYIbk13ijeL@cluster0.tplpmbi.mongodb.net/?retryWrites=true&w=majority',
};

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default('mongodb+srv://parthrchavan2006_db_user:kCj8ytYIbk13ijeL@cluster0.tplpmbi.mongodb.net/?retryWrites=true&w=majority'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters').default('riveria_super_secret_engine_key_2026'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('*'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_SIZE_BYTES: z.coerce.number().int().positive().default(100 * 1024 * 1024)
});

function getEnv() {
  const result = environmentSchema.safeParse(rawEnv);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration: ${messages.join(', ')}`);
  }
  return result.data;
}

module.exports = getEnv();
