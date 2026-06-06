/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SynthParameters, SampleCategory } from '../types';

// Helper to generate white noise buffer
function createNoiseBuffer(ctx: BaseAudioContext, duration: number): AudioBuffer {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Custom wave-shaper curves for Overdrive/Distortion
function makeDistortionCurve(amount: number): Float32Array {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// Core voice synthesizer scheduled on a given audio context
export function scheduleVoice(
  ctx: BaseAudioContext,
  category: SampleCategory | 'Other',
  params: SynthParameters,
  startTime: number,
  destination: AudioNode
) {
  const finalGain = ctx.createGain();
  finalGain.gain.setValueAtTime(0.7, startTime);

  // Setup Distortion / Overdrive if requested
  let effectChainEntrance: AudioNode = finalGain;
  if (params.overdrive > 0) {
    const dist = ctx.createWaveShaper();
    dist.curve = makeDistortionCurve(params.overdrive);
    dist.oversample = '4x';
    finalGain.connect(dist);
    effectChainEntrance = dist;
  }

  // Setup Delay effect
  let delayOut: AudioNode = effectChainEntrance;
  if (params.delayTime > 0.01) {
    const delay = ctx.createDelay();
    delay.delayTime.setValueAtTime(params.delayTime, startTime);
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.4, startTime);

    effectChainEntrance.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay); // feedback loop
    
    // Create direct + wet mix
    const wetMix = ctx.createGain();
    wetMix.gain.setValueAtTime(0.4, startTime);
    delay.connect(wetMix);
    
    const delayCombiner = ctx.createGain();
    effectChainEntrance.connect(delayCombiner);
    wetMix.connect(delayCombiner);
    delayOut = delayCombiner;
  }

  // Setup Reverb effect (simulated with feedback-decay delay paths for lightweight execution)
  let reverbOut: AudioNode = delayOut;
  if (params.reverbWet > 0) {
    // Generate simple ambient network of comb filters
    const combLengths = [0.03, 0.037, 0.041, 0.047];
    const combiner = ctx.createGain();
    delayOut.connect(combiner);

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime((params.reverbWet / 100) * 0.6, startTime);

    combLengths.forEach((len) => {
      const delayNode = ctx.createDelay();
      delayNode.delayTime.setValueAtTime(len, startTime);
      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(0.65, startTime);

      delayOut.connect(delayNode);
      delayNode.connect(feedback);
      feedback.connect(delayNode); // feedback
      delayNode.connect(wetGain);
    });

    wetGain.connect(combiner);
    reverbOut = combiner;
  }

  reverbOut.connect(destination);

  // Sound source generation
  if (category === 'Kick') {
    // Kick drum: Oscillating Sine wave with instant pitch drop-sweep and decay
    const osc = ctx.createOscillator();
    const ampEnv = ctx.createGain();
    osc.type = 'sine';

    // Fast pitch sweep (eg 180Hz down to 50Hz)
    const baseFreq = params.pitch; // default around ~55Hz
    const startFreq = baseFreq * 3.5;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, startTime + 0.08);

    // Amplitude decay envelope
    ampEnv.gain.setValueAtTime(1.0, startTime);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, startTime + Math.max(0.05, params.decay));

    osc.connect(ampEnv);
    ampEnv.connect(finalGain);

    osc.start(startTime);
    osc.stop(startTime + params.decay + 0.1);

  } else if (category === 'Snare') {
    // Snare drum: White Noise + filtered high-mid peak + basic fundamental hit
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, Math.max(0.2, params.decay));
    
    // Snare noise filter
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(params.filterCutoff || 1200, startTime);
    noiseFilter.Q.setValueAtTime(1.5, startTime);

    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(0.8, startTime);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, startTime + params.decay);

    // Fundamental modal sine hit (e.g., 180Hz snappy peak)
    const osc = ctx.createOscillator();
    const oscEnv = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, startTime);
    osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.05);

    oscEnv.gain.setValueAtTime(0.5, startTime);
    oscEnv.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnv);
    noiseEnv.connect(finalGain);

    osc.connect(oscEnv);
    oscEnv.connect(finalGain);

    noise.start(startTime);
    noise.stop(startTime + params.decay + 0.1);
    
    osc.start(startTime);
    osc.stop(startTime + 0.1);

  } else if (category === 'Hi-Hat') {
    // Hi-Hat: Short gated white noise filter-swept up to high treble (e.g., 8-10 kHz)
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, Math.max(0.05, params.decay));

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(params.filterCutoff || 7000, startTime);

    const ampEnv = ctx.createGain();
    ampEnv.gain.setValueAtTime(0.9, startTime);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, startTime + params.decay);

    noise.connect(filter);
    filter.connect(ampEnv);
    ampEnv.connect(finalGain);

    noise.start(startTime);
    noise.stop(startTime + params.decay + 0.1);

  } else if (category === 'Melodic') {
    // Melodic chord: Stacked oscillators (triangle + narrow detune)
    const pitches = [params.pitch, params.pitch * 1.25, params.pitch * 1.5, params.pitch * 2]; // Major Chord formula
    
    pitches.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      // Alternate waveforms to simulate a rich piano/chime timbre
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Emulate dynamic acoustic piano filter closure
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(params.filterCutoff || 3000, startTime);
      filter.frequency.exponentialRampToValueAtTime(300, startTime + params.decay);
      
      // Delay note starters slightly for realistic string strum/voicing effect
      const strumDelay = idx * 0.015;
      oscGain.gain.setValueAtTime(0.0, startTime);
      oscGain.gain.setValueAtTime(0.3 / pitches.length, startTime + strumDelay);
      oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + params.decay);
      
      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(finalGain);
      
      osc.start(startTime + strumDelay);
      osc.stop(startTime + params.decay + 0.2);
    });

  } else if (category === 'Bass') {
    // Synth Bass: low fat sawtooth + quick filter envelope
    const osc = ctx.createOscillator();
    const ampEnv = ctx.createGain();
    
    osc.type = params.waveType === 'sawtooth' ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(params.pitch, startTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.filterCutoff || 1000, startTime);
    // Envelope dip
    filter.frequency.exponentialRampToValueAtTime(110, startTime + 0.15);

    ampEnv.gain.setValueAtTime(0.8, startTime);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, startTime + params.decay);

    osc.connect(filter);
    filter.connect(ampEnv);
    ampEnv.connect(finalGain);

    osc.start(startTime);
    osc.stop(startTime + params.decay + 0.1);

  } else {
    // FX / Other: Sweeping modular oscillator with dynamic sweep up/down
    const osc = ctx.createOscillator();
    const ampEnv = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(params.pitch, startTime);
    // Exponential pitch rise and sweep
    osc.frequency.exponentialRampToValueAtTime(params.pitch * 3, startTime + params.decay);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.filterCutoff || 2000, startTime);

    ampEnv.gain.setValueAtTime(0.7, startTime);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, startTime + params.decay);

    osc.connect(filter);
    filter.connect(ampEnv);
    ampEnv.connect(finalGain);

    osc.start(startTime);
    osc.stop(startTime + params.decay + 0.1);
  }
}

// Convert AudioBuffer to WAV format in browser
export function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = Raw uncompressed PCM
  const bitDepth = 16;
  
  const resultLength = buffer.length * numOfChan * (bitDepth / 8) + 44;
  const bufferArr = new ArrayBuffer(resultLength);
  const view = new DataView(bufferArr);
  
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAV headers
  setUint32(0x46464952);                         // "RIFF"
  setUint32(resultLength - 8);                   // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // chunk length = 16
  setUint16(format);                             // sample format (PCM)
  setUint16(numOfChan);                          // channel count
  setUint32(sampleRate);                         // sample rate
  setUint32(sampleRate * numOfChan * (bitDepth / 8)); // byte rate
  setUint16(numOfChan * (bitDepth / 8));         // block align
  setUint16(bitDepth);                           // bits per sample

  setUint32(0x61746164);                         // "data" chunk
  setUint32(resultLength - pos - 4);             // chunk length (data bytes)

  const channels = [];
  for (i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < resultLength) {
    for (i = 0; i < numOfChan; i++) {             // interleave channels
      sample = channels[i][offset];
      if (sample === undefined) {
        sample = 0;
      }
      sample = Math.max(-1, Math.min(1, SampleClipMultiplier(sample))); // clap/gain control
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF); // scale to 16-bit
      view.setInt16(pos, sample, true);          // write 16-bit PCM element
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });

  function SampleClipMultiplier(val: number): number {
    // Subtle compression/gain safety limiter
    return val * 0.95;
  }
}

// Render sample parameters to dynamic WAV URL for local download
export async function renderSampleToWavBlob(
  category: SampleCategory | 'Other',
  params: SynthParameters
): Promise<Blob> {
  const sampleRate = 44100;
  const duration = Math.min(2.0, params.decay + 0.3); // add room for delay/reverb tail
  const numOfChannels = 2; // Stereo render
  
  // Use OfflineAudioContext for headless super fast background audio processing
  const offlineCtx = new OfflineAudioContext(numOfChannels, sampleRate * duration, sampleRate);
  
  // Schedule the sample to start at timestamp 0
  scheduleVoice(offlineCtx, category, params, 0, offlineCtx.destination);
  
  // Return completed AudioBuffer
  const renderedBuffer = await offlineCtx.startRendering();
  
  // Convert AudioBuffer to WAV blob
  return bufferToWav(renderedBuffer);
}
