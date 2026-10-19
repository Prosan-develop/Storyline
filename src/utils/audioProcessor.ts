/**
 * Web Audio API audio separation, vocal extraction/removal DSP,
 * real-time waveform visualizers, and WAV file export.
 */

export class VocalSeparatorEngine {
  private audioCtx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private vocalGainNode: GainNode | null = null;
  private bgmGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private startTime = 0;
  private pauseOffset = 0;
  private isRunning = false;

  public async loadAudioFile(file: File | Blob): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = this.getAudioContext();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    this.audioBuffer = decoded;
    this.pauseOffset = 0;
    return decoded;
  }

  public getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public play(vocalGain = 1.0, bgmGain = 1.0, onEnded?: () => void) {
    if (!this.audioBuffer) return;
    const ctx = this.getAudioContext();

    if (this.isRunning) {
      this.stop();
    }

    const buffer = this.audioBuffer;
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = buffer;

    // Create Stereo Splitter & Merger
    const splitter = ctx.createChannelSplitter(2);
    const bgmMerger = ctx.createChannelMerger(2);
    const vocalMerger = ctx.createChannelMerger(2);

    // Gain nodes for mixing
    this.vocalGainNode = ctx.createGain();
    this.vocalGainNode.gain.value = vocalGain;

    this.bgmGainNode = ctx.createGain();
    this.bgmGainNode.gain.value = bgmGain;

    this.masterGainNode = ctx.createGain();
    this.masterGainNode.gain.value = 1.0;

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;

    this.sourceNode.connect(splitter);

    // BGM track: Center cancellation (L - R)
    // Left channel
    const leftInvert = ctx.createGain();
    leftInvert.gain.value = -1;
    // (L - R) to left & right
    splitter.connect(bgmMerger, 0, 0); // L
    splitter.connect(leftInvert, 1);    // -R
    leftInvert.connect(bgmMerger, 0, 0);

    const rightInvert = ctx.createGain();
    rightInvert.gain.value = -1;
    splitter.connect(bgmMerger, 1, 1); // R
    splitter.connect(rightInvert, 0);   // -L
    rightInvert.connect(bgmMerger, 0, 1);

    bgmMerger.connect(this.bgmGainNode);

    // Vocal track: Formant Bandpass & Mid component (L + R)
    const vocalFilter = ctx.createBiquadFilter();
    vocalFilter.type = 'bandpass';
    vocalFilter.frequency.value = 1000;
    vocalFilter.Q.value = 1.2;

    const vocalSum = ctx.createGain();
    vocalSum.gain.value = 0.5;

    splitter.connect(vocalSum, 0);
    splitter.connect(vocalSum, 1);
    vocalSum.connect(vocalFilter);

    vocalFilter.connect(vocalMerger, 0, 0);
    vocalFilter.connect(vocalMerger, 0, 1);

    vocalMerger.connect(this.vocalGainNode);

    // Mix both to master and analyser
    this.bgmGainNode.connect(this.masterGainNode);
    this.vocalGainNode.connect(this.masterGainNode);

    this.masterGainNode.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);

    this.startTime = ctx.currentTime - this.pauseOffset;
    this.sourceNode.start(0, this.pauseOffset % buffer.duration);
    this.isRunning = true;

    this.sourceNode.onended = () => {
      this.isRunning = false;
      if (onEnded) onEnded();
    };
  }

  public setVocalLevel(val: number) {
    if (this.vocalGainNode && this.audioCtx) {
      this.vocalGainNode.gain.setValueAtTime(Math.max(0, val), this.audioCtx.currentTime);
    }
  }

  public setBgmLevel(val: number) {
    if (this.bgmGainNode && this.audioCtx) {
      this.bgmGainNode.gain.setValueAtTime(Math.max(0, val), this.audioCtx.currentTime);
    }
  }

  public pause() {
    if (!this.isRunning || !this.audioCtx) return;
    this.pauseOffset = (this.audioCtx.currentTime - this.startTime);
    this.stop();
  }

  public stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // already stopped
      }
      this.sourceNode = null;
    }
    this.isRunning = false;
  }

  public getCurrentTime(): number {
    if (!this.audioBuffer) return 0;
    if (this.isRunning && this.audioCtx) {
      return (this.audioCtx.currentTime - this.startTime) % this.audioBuffer.duration;
    }
    return this.pauseOffset % (this.audioBuffer.duration || 1);
  }

  public getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Offline renders either the isolated vocal track or isolated BGM track
   * and returns a downloadable WAV Blob!
   */
  public async renderTrackOffline(mode: 'vocal' | 'bgm'): Promise<Blob> {
    if (!this.audioBuffer) throw new Error('No audio loaded');

    const original = this.audioBuffer;
    const offlineCtx = new OfflineAudioContext(
      original.numberOfChannels,
      original.length,
      original.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = original;

    const splitter = offlineCtx.createChannelSplitter(2);
    source.connect(splitter);

    if (mode === 'bgm') {
      // Karaoke / Instrumental (L - R)
      const bgmMerger = offlineCtx.createChannelMerger(2);
      const invR = offlineCtx.createGain();
      invR.gain.value = -1;
      splitter.connect(bgmMerger, 0, 0);
      splitter.connect(invR, 1);
      invR.connect(bgmMerger, 0, 0);

      const invL = offlineCtx.createGain();
      invL.gain.value = -1;
      splitter.connect(bgmMerger, 1, 1);
      splitter.connect(invL, 0);
      invL.connect(bgmMerger, 0, 1);

      bgmMerger.connect(offlineCtx.destination);
    } else {
      // Vocals: Bandpass formant filter + center extraction
      const vocalFilter = offlineCtx.createBiquadFilter();
      vocalFilter.type = 'bandpass';
      vocalFilter.frequency.value = 1000;
      vocalFilter.Q.value = 1.2;

      const sum = offlineCtx.createGain();
      sum.gain.value = 0.5;
      splitter.connect(sum, 0);
      splitter.connect(sum, 1);
      sum.connect(vocalFilter);

      const vocalMerger = offlineCtx.createChannelMerger(2);
      vocalFilter.connect(vocalMerger, 0, 0);
      vocalFilter.connect(vocalMerger, 0, 1);
      vocalMerger.connect(offlineCtx.destination);
    }

    source.start(0);
    const rendered = await offlineCtx.startRendering();
    return audioBufferToWav(rendered);
  }
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM RIFF WAV format
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);  // file length - 8
  setUint32(0x45564157); // "WAVE"

  // fmt sub-chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16);         // 16 for PCM
  setUint16(1);          // Linear PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2);              // block align
  setUint16(16);                         // bits per sample

  // data sub-chunk
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  // write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      // convert to 16 bit PCM
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}
