/**
 * Decrypts Splice audio data using XOR cipher
 * @param {Uint8Array} data - Encrypted audio data with header containing length at offset 2
 * @returns {Uint8Array} Decrypted audio data
 */
export function unscramble(data) {
  const e = Number(new DataView(data.buffer).getBigUint64(2, true));
  const key = data.slice(10, 28);
  const buf = data.slice(28);
  const klen = key.length;
  for (let i = 0, k = 0; i < e && i < buf.length; i++, k++)
    buf[i] ^= key[k % klen];
  for (let i = e * 2, k = 0; i < e * 3 && i < buf.length; i++, k++)
    buf[i] ^= key[k % klen];
  return buf;
}

/**
 * Encodes AudioBuffer to WAV format
 * @param {AudioBuffer} audioBuffer - The audio buffer to encode
 * @returns {ArrayBuffer} WAV encoded audio data
 */
export function wavEncode(audioBuffer) {
  const ch = audioBuffer.numberOfChannels;
  const sr = audioBuffer.sampleRate;
  const len = audioBuffer.length;
  const bps = 2;
  const align = ch * bps;
  const dataSz = len * align;
  const buf = new ArrayBuffer(44 + dataSz);
  const v = new DataView(buf);
  const w = (off, str) => {
    for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i));
  };
  w(0, 'RIFF'); v.setUint32(4, 36 + dataSz, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, ch, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * align, true); v.setUint16(32, align, true);
  v.setUint16(34, 16, true); w(36, 'data');
  v.setUint32(40, dataSz, true);
  let off = 44;
  for (let i = 0; i < len; i++)
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, audioBuffer.getChannelData(c)[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  return buf;
}
