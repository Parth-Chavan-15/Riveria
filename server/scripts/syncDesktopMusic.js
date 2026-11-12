require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('../config/env');
const Track = require('../models/Track');

const SOURCE_DIR = 'C:\\Users\\parth\\Desktop\\Music';
const UPLOADS_DIR = path.resolve(__dirname, '..', env.UPLOAD_DIR || 'uploads');
const CLIENT_AUDIO_DIR = path.resolve(__dirname, '../../client/public/audio');

const TRACK_METADATA = [
  {
    pattern: /believer/i,
    title: 'Believer',
    artist: 'Imagine Dragons',
    duration: '03:24',
    cleanFilename: 'imagine-dragons-believer.mp3',
    mimeType: 'audio/mpeg',
    imageColor: 'bg-gradient-to-br from-rose-600 via-purple-700 to-indigo-950',
    imageSrc: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80'
  },
  {
    pattern: /thunder/i,
    title: 'Thunder',
    artist: 'Imagine Dragons',
    duration: '03:07',
    cleanFilename: 'imagine-dragons-thunder.mp3',
    mimeType: 'audio/mpeg',
    imageColor: 'bg-gradient-to-br from-cyan-600 via-blue-700 to-slate-950',
    imageSrc: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=500&auto=format&fit=crop&q=80'
  },
  {
    pattern: /sunflower/i,
    title: 'Sunflower',
    artist: 'Post Malone & Swae Lee',
    duration: '02:38',
    cleanFilename: 'post-malone-sunflower.mp3',
    mimeType: 'audio/mpeg',
    imageColor: 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-950',
    imageSrc: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=500&auto=format&fit=crop&q=80'
  },
  {
    pattern: /birds/i,
    title: 'Birds',
    artist: 'Imagine Dragons',
    duration: '03:39',
    cleanFilename: 'imagine-dragons-birds.mp4',
    mimeType: 'audio/mp4',
    imageColor: 'bg-gradient-to-br from-emerald-600 via-teal-700 to-zinc-950',
    imageSrc: 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=500&auto=format&fit=crop&q=80'
  },
  {
    pattern: /happier/i,
    title: 'Happier',
    artist: 'Marshmello ft. Bastille',
    duration: '03:34',
    cleanFilename: 'marshmello-happier.mp4',
    mimeType: 'audio/mp4',
    imageColor: 'bg-gradient-to-br from-violet-600 via-fuchsia-700 to-indigo-950',
    imageSrc: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop&q=80'
  }
];

async function syncMusic() {
  console.log(`Checking source music directory: ${SOURCE_DIR}`);
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(CLIENT_AUDIO_DIR, { recursive: true });

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to database.');

  const sourceFiles = fs.readdirSync(SOURCE_DIR);
  console.log(`Found ${sourceFiles.length} file(s) in source directory.`);

  for (const meta of TRACK_METADATA) {
    const matchedFile = sourceFiles.find((f) => meta.pattern.test(f));
    if (!matchedFile) {
      console.warn(`No matching file found for ${meta.title}`);
      continue;
    }

    const srcPath = path.join(SOURCE_DIR, matchedFile);
    const destPath = path.join(UPLOADS_DIR, meta.cleanFilename);
    const clientDestPath = path.join(CLIENT_AUDIO_DIR, meta.cleanFilename);
    const stat = fs.statSync(srcPath);

    console.log(`Copying "${matchedFile}" -> "${meta.cleanFilename}" (${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);
    fs.copyFileSync(srcPath, destPath);
    fs.copyFileSync(srcPath, clientDestPath);

    // Upsert into MongoDB
    let track = await Track.findOne({ title: meta.title, artist: meta.artist });
    if (!track) {
      track = new Track({
        title: meta.title,
        artist: meta.artist,
        duration: meta.duration,
        type: 'Cloud',
        imageColor: meta.imageColor,
        imageSrc: meta.imageSrc,
        audioSrc: `/audio/${meta.cleanFilename}`,
        audioFile: {
          filename: meta.cleanFilename,
          mimeType: meta.mimeType,
          size: stat.size
        }
      });
      await track.save();
      console.log(`Created new Cloud track in database: "${meta.title}" (${track._id})`);
    } else {
      track.duration = meta.duration;
      track.type = 'Cloud';
      track.imageColor = meta.imageColor;
      track.imageSrc = meta.imageSrc;
      track.audioSrc = `/audio/${meta.cleanFilename}`;
      track.audioFile = {
        filename: meta.cleanFilename,
        mimeType: meta.mimeType,
        size: stat.size
      };
      await track.save();
      console.log(`Updated Cloud track in database: "${meta.title}" (${track._id})`);
    }
  }

  // Clean up old placeholder dummy tracks without real audio files
  const cleanup = await Track.deleteMany({
    $or: [
      { 'audioFile.filename': { $in: ['', null] }, audioSrc: { $in: ['', null] } },
      { title: { $in: ['Aetheric Waves', 'Admin Track'] } }
    ]
  });
  if (cleanup.deletedCount > 0) {
    console.log(`Cleaned up ${cleanup.deletedCount} old placeholder tracks.`);
  }

  console.log('\n--- Active Cloud Library in Database ---');
  const allTracks = await Track.find({}, 'title artist duration type audioFile');
  console.log(JSON.stringify(allTracks, null, 2));

  await mongoose.disconnect();
  console.log('Finished syncing desktop music to cloud library.');
}

syncMusic().catch((err) => {
  console.error('Error syncing music:', err);
  process.exit(1);
});
