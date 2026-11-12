const { z } = require('zod');
const { objectId, empty } = require('./commonSchemas');

const duration = z.string().regex(/^([0-5]?\d:)?[0-5]\d$/, 'Duration must use MM:SS or HH:MM:SS');
const trackTypeEnum = z.preprocess(
  (val) => (typeof val === 'string' ? val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() : val),
  z.enum(['Cloud', 'Local', 'Upload'])
);

const trackFields = {
  title: z.string().trim().min(1).max(160),
  artist: z.string().trim().min(1).max(160),
  duration: duration.optional(),
  type: trackTypeEnum.optional(),
  imageColor: z.string().trim().min(1).max(180).regex(/^[a-z0-9\-\[\]#(),.%/\s]+$/i, 'Invalid image style').optional(),
  imageSrc: z.string().url().max(2048).optional(),
  audioSrc: z.string().url().max(2048).optional()
};

const createTrack = z.object(trackFields).strict();
const updateTrack = z.object(trackFields).partial().strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
const uploadTrack = z.object({ title: trackFields.title, artist: trackFields.artist, duration: duration.optional(), imageColor: trackFields.imageColor, imageSrc: trackFields.imageSrc }).strict();
const idParams = z.object({ id: objectId }).strict();

module.exports = {
  createTrackSchema: z.object({ body: createTrack, query: z.any().optional(), params: z.any().optional() }),
  updateTrackSchema: z.object({ body: updateTrack, query: z.any().optional(), params: idParams }),
  trackIdSchema: z.object({ body: z.any().optional(), query: z.any().optional(), params: idParams }),
  uploadTrackSchema: z.object({ body: uploadTrack, query: z.any().optional(), params: z.any().optional() })
};
