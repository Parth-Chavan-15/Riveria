const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid MongoDB ObjectId');
const empty = z.object({}).strict();

module.exports = { objectId, empty };
