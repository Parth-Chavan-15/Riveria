const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 160, index: true },
    artist: { type: String, required: true, trim: true, maxlength: 160, index: true },
    duration: { type: String, default: '0:00', match: /^([0-5]?\d:)?[0-5]\d$/ },
    type: { type: String, enum: ['Cloud', 'Local', 'Upload'], default: 'Cloud', index: true },
    imageColor: { type: String, default: 'bg-gradient-to-br from-slate-700 to-slate-900', maxlength: 180 },
    imageSrc: { type: String, default: '', maxlength: 2048 },
    audioSrc: { type: String, default: '', maxlength: 2048 },
    gridFsId: { type: mongoose.Schema.Types.ObjectId, default: null },
    coverGridFsId: { type: mongoose.Schema.Types.ObjectId, default: null },
    coverMimeType: { type: String, default: 'image/jpeg' },
    audioFile: {
        filename: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        size: { type: Number, default: 0, min: 0 }
    }
}, {
    timestamps: true,
    strict: 'throw',
    versionKey: false
});

trackSchema.index({ title: 'text', artist: 'text' });
trackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Track', trackSchema);
