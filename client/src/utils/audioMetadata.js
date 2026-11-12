/**
 * Pure JavaScript ID3v2 (v2.2, v2.3, v2.4) metadata & embedded album art extractor.
 * Reads the first 256KB of the audio file in client RAM with zero dependencies.
 */
export async function extractAudioMetadata(file) {
  const defaultMeta = {
    title: file.name.replace(/\.[^/.]+$/, ''),
    artist: 'This device',
    thumbnailUrl: null
  };

  try {
    // Read the first 256 KB of the file
    const sliceSize = Math.min(file.size, 256 * 1024);
    const buffer = await file.slice(0, sliceSize).arrayBuffer();
    const view = new DataView(buffer);

    // Check for ID3 header
    if (buffer.byteLength < 10) return defaultMeta;
    const id3Header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
    if (id3Header !== 'ID3') return defaultMeta;

    const versionMajor = view.getUint8(3); // 2, 3, or 4
    let offset = 10;
    const maxOffset = buffer.byteLength;

    let title = null;
    let artist = null;
    let thumbnailUrl = null;

    while (offset + 10 < maxOffset) {
      let frameId = '';
      let frameSize = 0;

      if (versionMajor === 2) {
        // ID3v2.2: 3-character frame IDs, 3-byte size
        frameId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2));
        frameSize = (view.getUint8(offset + 3) << 16) | (view.getUint8(offset + 4) << 8) | view.getUint8(offset + 5);
        offset += 6;
      } else {
        // ID3v2.3 / ID3v2.4: 4-character frame IDs, 4-byte size
        frameId = String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        );

        if (versionMajor === 4) {
          // Syncsafe integer
          frameSize =
            (view.getUint8(offset + 4) << 21) |
            (view.getUint8(offset + 5) << 14) |
            (view.getUint8(offset + 6) << 7) |
            view.getUint8(offset + 7);
        } else {
          frameSize = view.getUint32(offset + 4);
        }
        offset += 10;
      }

      // If frameId contains null or non-alphanumeric, reached end of tag
      if (!/^[A-Z0-9]{3,4}$/.test(frameId) || frameSize <= 0 || offset + frameSize > maxOffset) {
        break;
      }

      const frameData = new Uint8Array(buffer, offset, frameSize);

      // Title frame: TIT2 (or TT2 in v2.2)
      if ((frameId === 'TIT2' || frameId === 'TT2') && !title) {
        title = decodeText(frameData);
      }

      // Artist frame: TPE1 (or TP1 in v2.2)
      if ((frameId === 'TPE1' || frameId === 'TP1') && !artist) {
        artist = decodeText(frameData);
      }

      // Attached picture frame: APIC (or PIC in v2.2)
      if ((frameId === 'APIC' || frameId === 'PIC') && !thumbnailUrl) {
        thumbnailUrl = extractPicture(frameData, versionMajor);
      }

      offset += frameSize;
    }

    return {
      title: title && title.trim() ? title.trim() : defaultMeta.title,
      artist: artist && artist.trim() ? artist.trim() : defaultMeta.artist,
      thumbnailUrl
    };
  } catch {
    return defaultMeta;
  }
}

function decodeText(data) {
  if (data.length < 2) return '';
  const encoding = data[0];
  try {
    if (encoding === 0) {
      // ISO-8859-1
      return new TextDecoder('iso-8859-1').decode(data.subarray(1)).replace(/\0+$/, '');
    } else if (encoding === 1) {
      // UTF-16 with BOM
      return new TextDecoder('utf-16').decode(data.subarray(1)).replace(/\0+$/, '');
    } else if (encoding === 2) {
      // UTF-16BE without BOM
      return new TextDecoder('utf-16be').decode(data.subarray(1)).replace(/\0+$/, '');
    } else if (encoding === 3) {
      // UTF-8
      return new TextDecoder('utf-8').decode(data.subarray(1)).replace(/\0+$/, '');
    }
  } catch {
    return '';
  }
  return '';
}

function extractPicture(data, versionMajor) {
  try {
    let cursor = 1; // skip encoding byte
    let mimeType = 'image/jpeg';

    if (versionMajor === 2) {
      // Format is 3 chars e.g. "JPG" or "PNG"
      const format = String.fromCharCode(data[cursor], data[cursor + 1], data[cursor + 2]);
      mimeType = format.toUpperCase() === 'PNG' ? 'image/png' : 'image/jpeg';
      cursor += 3;
      cursor += 1; // picture type
    } else {
      // Null-terminated MIME string e.g. "image/jpeg"
      const mimeStart = cursor;
      while (cursor < data.length && data[cursor] !== 0) {
        cursor++;
      }
      const rawMime = new TextDecoder('ascii').decode(data.subarray(mimeStart, cursor));
      if (rawMime && rawMime.includes('/')) mimeType = rawMime;
      cursor++; // skip null terminator
      cursor++; // skip picture type
    }

    // Skip description (null-terminated according to encoding)
    while (cursor < data.length && data[cursor] !== 0) {
      cursor++;
    }
    while (cursor < data.length && data[cursor] === 0) {
      cursor++;
    }

    // Remaining bytes are the image data
    if (cursor < data.length) {
      const imageBytes = data.subarray(cursor);
      const blob = new Blob([imageBytes], { type: mimeType });
      return URL.createObjectURL(blob);
    }
  } catch {
    return null;
  }
  return null;
}
