require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('../config/env');
const Track = require('../models/Track');

const SOURCE_DIR = 'C:\\Users\\parth\\Desktop\\Music';

const TRACK_METADATA = [
  {
    pattern: /believer/i,
    title: 'Believer',
    artist: 'Imagine Dragons',
    duration: '03:24',
    cleanFilename: 'imagine-dragons-believer.mp3',
    mimeType: 'audio/mpeg',
    imageColor: 'bg-gradient-to-br from-rose-600 via-purple-700 to-indigo-950',
    imageSrc: '/covers/believer.jpg'
  },
  {
    pattern: /thunder/i,
    title: 'Thunder',
    artist: 'Imagine Dragons',
    duration: '03:07',
    cleanFilename: 'imagine-dragons-thunder.mp3',
    mimeType: 'audio/mpeg',
    imageColor: 'bg-gradient-to-br from-cyan-600 via-blue-700 to-slate-950',
    imageSrc: '/covers/thunder.jpg'
  },
  {
    pattern: /sunflower/i,
    title: 'Sunflower',
    artist: 'Post Malone & Swae Lee',
    duration: '02:38',
    cleanFilename: 'post-malone-sunflower.mp3',
    mimeType: 'audio/mpeg',
    imageColor: 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-950',
    imageSrc: '/covers/sunflower.png'
  },
  {
    pattern: /birds.*\.mp3$/i,
    title: 'Birds',
    artist: 'Imagine Dragons',
    duration: '03:42',
    cleanFilename: 'imagine-dragons-birds.mp3',
    mimeType: 'audio/mpeg',
    imageColor: 'bg-gradient-to-br from-emerald-600 via-teal-700 to-zinc-950',
    imageSrc: '/covers/birds.jpg'
  },
  {
    pattern: /happier.*\.mp3$/i,
    title: 'Happier',
    artist: 'Marshmello ft. Bastille',
    duration: '03:53',
    cleanFilename: 'marshmello-happier.mp3',
    mimeType: 'audio/mpeg',
    imageColor: 'bg-gradient-to-br from-violet-600 via-fuchsia-700 to-indigo-950',
    imageSrc: '/covers/happier.jpg'
  }
];

async function uploadToGridFS() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.');

  const db = mongoose.connection.db;
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'audio_library' });

  const sourceFiles = fs.readdirSync(SOURCE_DIR);
  console.log(`Found ${sourceFiles.length} files in source directory.`);

  for (const meta of TRACK_METADATA) {
    const matchedFile = sourceFiles.find((f) => meta.pattern.test(f));
    if (!matchedFile) {
      console.warn(`File not found for ${meta.title}`);
      continue;
    }

    const srcPath = path.join(SOURCE_DIR, matchedFile);
    const stat = fs.statSync(srcPath);

    console.log(`\nUploading "${meta.title}" (${(stat.size / (1024 * 1024)).toFixed(2)} MB) to GridFS...`);

    // Remove any existing GridFS file with this filename
    const existingFiles = await bucket.find({ filename: meta.cleanFilename }).toArray();
    for (const ef of existingFiles) {
      await bucket.delete(ef._id);
      console.log(`Deleted existing GridFS file ${ef._id}`);
    }

    // Pipe file into GridFS
    const uploadStream = bucket.openUploadStream(meta.cleanFilename, {
      contentType: meta.mimeType,
      metadata: {
        title: meta.title,
        artist: meta.artist,
        duration: meta.duration
      }
    });

    await new Promise((resolve, reject) => {
      fs.createReadStream(srcPath)
        .pipe(uploadStream)
        .on('finish', resolve)
        .on('error', reject);
    });

    console.log(`Uploaded to GridFS with id: ${uploadStream.id}`);

    // Update or create Track document
    let track = await Track.findOne({ title: meta.title, artist: meta.artist });
    if (!track) {
      track = new Track({
        title: meta.title,
        artist: meta.artist,
        duration: meta.duration,
        type: 'Cloud',
        imageColor: meta.imageColor,
        imageSrc: meta.imageSrc,
        gridFsId: uploadStream.id,
        audioFile: {
          filename: meta.cleanFilename,
          mimeType: meta.mimeType,
          size: stat.size
        }
      });
    } else {
      track.duration = meta.duration;
      track.type = 'Cloud';
      track.imageColor = meta.imageColor;
      track.imageSrc = meta.imageSrc;
      track.gridFsId = uploadStream.id;
      track.audioFile = {
        filename: meta.cleanFilename,
        mimeType: meta.mimeType,
        size: stat.size
      };
    }
    await track.save();
    console.log(`Updated Track in Atlas: "${track.title}" (Track ID: ${track._id}, GridFS ID: ${track.gridFsId})`);
  }

  console.log('\n--- Active GridFS Audio Library in MongoDB Atlas ---');
  const storedTracks = await Track.find({}, 'title artist duration gridFsId imageSrc');
  console.log(JSON.stringify(storedTracks, null, 2));

  await mongoose.disconnect();
  console.log('MongoDB Atlas GridFS upload complete.');
}

uploadToGridFS().catch((err) => {
  console.error('Error uploading to GridFS:', err);
  process.exit(1);
});
