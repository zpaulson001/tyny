// Function to convert Float32Array to WAV format
export function float32ArrayToWav(
  audioBuffer: Float32Array,
  sampleRate: number
): Blob {
  const numChannels = 1;
  const numSamples = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, byteRate, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bytesPerSample * 8, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataSize, true);

  // Write the PCM samples
  const offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, audioBuffer[i]));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset + i * 2, value, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function concatenateFloat32Arrays(arrays: Float32Array[]): Float32Array {
  // Calculate total length
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);

  // Create result array
  const result = new Float32Array(totalLength);

  // Copy each array into the result
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }

  return result;
}

export function saveFloat32ArrayToWav(
  audioBuffer: Float32Array,
  sampleRate: number,
  fileName?: string
) {
  const wavBlob = float32ArrayToWav(audioBuffer, sampleRate);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(wavBlob);
  a.download = fileName || `recording-${new Date().toISOString()}.wav`;
  a.click();
}

export function convertFloat32ArrayToInt16Array(audioBuffer: Float32Array) {
  const int16Array = new Int16Array(audioBuffer.length);
  for (let i = 0; i < audioBuffer.length; i++) {
    int16Array[i] = Math.max(
      -32768,
      Math.min(32767, Math.round(audioBuffer[i] * 32767))
    );
  }
  return int16Array;
}
