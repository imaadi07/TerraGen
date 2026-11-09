import zlib from "zlib";

/**
 * Creates a valid ZIP archive buffer in memory without external dependencies.
 * Uses standard ZIP specification (PK\x03\x04, PK\x01\x02, PK\x05\x06) and Node's built-in zlib.
 *
 * @param {Record<string, string>} files - Map of filename to content string
 * @returns {Buffer} ZIP archive binary buffer
 */
export function createZipBuffer(files = {}) {
  const fileRecords = [];
  let offset = 0;
  const localChunks = [];

  for (const [filename, contentStr] of Object.entries(files)) {
    const filenameBuf = Buffer.from(filename, "utf8");
    const contentBuf = Buffer.from(contentStr || "", "utf8");
    const uncompressedSize = contentBuf.length;
    const crc = typeof zlib.crc32 === "function" ? zlib.crc32(contentBuf) : 0;
    const compressedBuf = zlib.deflateRawSync(contentBuf);
    const compressedSize = compressedBuf.length;

    // Local file header: 30 bytes
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    localHeader.writeUInt16LE(20, 4);         // version needed: 2.0
    localHeader.writeUInt16LE(0x0800, 6);     // flags: UTF-8 filename
    localHeader.writeUInt16LE(8, 8);          // compression: 8 = Deflate
    localHeader.writeUInt16LE(0, 10);         // last mod file time
    localHeader.writeUInt16LE(0x5221, 12);     // last mod file date (2021-01-01)
    localHeader.writeUInt32LE(crc, 14);       // crc-32
    localHeader.writeUInt32LE(compressedSize, 18);   // compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28);         // extra field length

    localChunks.push(localHeader, filenameBuf, compressedBuf);

    fileRecords.push({
      filenameBuf,
      crc,
      compressedSize,
      uncompressedSize,
      offset,
    });

    offset += localHeader.length + filenameBuf.length + compressedBuf.length;
  }

  const centralChunks = [];
  let centralDirSize = 0;

  for (const rec of fileRecords) {
    // Central directory file header: 46 bytes
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    cdHeader.writeUInt16LE(20, 4);         // version made by
    cdHeader.writeUInt16LE(20, 6);         // version needed
    cdHeader.writeUInt16LE(0x0800, 8);     // flags: UTF-8
    cdHeader.writeUInt16LE(8, 10);         // compression: Deflate
    cdHeader.writeUInt16LE(0, 12);         // last mod file time
    cdHeader.writeUInt16LE(0x5221, 14);     // last mod file date
    cdHeader.writeUInt32LE(rec.crc, 16);
    cdHeader.writeUInt32LE(rec.compressedSize, 20);
    cdHeader.writeUInt32LE(rec.uncompressedSize, 24);
    cdHeader.writeUInt16LE(rec.filenameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);         // extra len
    cdHeader.writeUInt16LE(0, 32);         // comment len
    cdHeader.writeUInt16LE(0, 34);         // disk start
    cdHeader.writeUInt16LE(0, 36);         // internal attrs
    cdHeader.writeUInt32LE(0, 38);         // external attrs
    cdHeader.writeUInt32LE(rec.offset, 42); // relative offset of local header

    centralChunks.push(cdHeader, rec.filenameBuf);
    centralDirSize += cdHeader.length + rec.filenameBuf.length;
  }

  // End of central directory record: 22 bytes
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // start disk
  eocd.writeUInt16LE(fileRecords.length, 8);  // entries on this disk
  eocd.writeUInt16LE(fileRecords.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);     // size of central directory
  eocd.writeUInt32LE(offset, 16);             // offset of central directory
  eocd.writeUInt16LE(0, 20);                  // comment len

  return Buffer.concat([...localChunks, ...centralChunks, eocd]);
}

