/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sample, SampleCategory, SynthParameters } from '../types';

// Simple deterministic seeded random generator to create stable, identical properties
function createRandom(seed: number) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

let cachedSamples: Sample[] | null = null;

export function getCatalogSamples(): Sample[] {
  if (cachedSamples) {
    return cachedSamples;
  }

  const samples: Sample[] = [];
  const rng = createRandom(42); // Seed

  const categories: { name: SampleCategory; count: number; subCategories: string[]; keys: string[]; tags: string[] }[] = [
    {
      name: 'Kick',
      count: 170,
      subCategories: ['808 Sub', '909 Punch', 'Acoustic Pop', 'Tech House', 'Heavy Hardstyle', 'Lofi Soft'],
      keys: ['C', 'C#', 'D', 'Eb', 'F', 'G', 'A'],
      tags: ['punchy', 'subby', 'distorted', 'tight', 'fat', 'warm', 'boom', 'clean'],
    },
    {
      name: 'Snare',
      count: 170,
      subCategories: ['Gated Vintage', 'Trap Clap', 'Crisp Acoustic', 'Synthwave Rim', 'Metallic Dubstep', 'Lofi Brush'],
      keys: ['E', 'G', 'A', 'D', 'N/A'],
      tags: ['snappy', 'crisp', 'bright', 'vintage', 'reverb', 'tight', 'punchy', 'wet'],
    },
    {
      name: 'Hi-Hat',
      count: 170,
      subCategories: ['909 Open', 'Trap Closed', 'Sizzle Ride', 'Egg Shaker', 'Analog Classic', 'Tambourine Loop'],
      keys: ['N/A'],
      tags: ['crisp', 'metallic', 'short', 'sandy', 'bright', 'acoustic', 'ambient', 'top-loop'],
    },
    {
      name: 'Melodic',
      count: 210,
      subCategories: ['Grand Piano', 'Rhodes Chord', 'Chime Bell', 'Lofi Pluck', 'Saw Lead', 'Atmospheric Pad'],
      keys: ['Amin', 'Cmaj', 'F#min', 'Gmaj', 'Dmin', 'Emaj', 'Bmin'],
      tags: ['chords', 'melody', 'ambient', 'dreamy', 'lush', 'warm', 'detuned', 'lofi'],
    },
    {
      name: 'Bass',
      count: 150,
      subCategories: ['808 Glide', 'Moog Sub', 'Acid Squelch', 'Slap Bass', 'Low End Drone', 'FM Growl'],
      keys: ['C', 'D', 'F', 'G', 'A', 'B'],
      tags: ['sub-bass', 'fat', 'growl', 'distorted', 'mono', 'warm', 'glide', 'reverb'],
    },
    {
      name: 'FX',
      count: 150,
      subCategories: ['Noise Riser', 'Laser Impact', 'Vinyl Crackle', 'Sub Drop', 'Atmospheric Sweep', 'Vocal Chop'],
      keys: ['N/A', 'C', 'G'],
      tags: ['riser', 'sweep', 'impact', 'glitch', 'sci-fi', 'organic', 'reverb', 'cinematic'],
    },
  ];

  // Counter to ensure total strictly reaches 1000+
  let sampleIndex = 1;

  categories.forEach((catObj) => {
    for (let i = 0; i < catObj.count; i++) {
      const randSub = catObj.subCategories[Math.floor(rng() * catObj.subCategories.length)];
      const randKey = catObj.keys[Math.floor(rng() * catObj.keys.length)];
      
      // Determine BPM: percussion usually one-shots (null), Melodic and Loops have bpms
      let bpm: number | null = null;
      if (catObj.name === 'Melodic' || (catObj.name === 'FX' && i % 3 === 0)) {
        bpm = 80 + Math.floor(rng() * 13) * 5; // 80, 85, ..., 140 bpm
      }

      // Format size (usually smaller for hats, larger for pianos/chords)
      let duration = 0.2 + rng() * 0.4; // defaults short
      if (catObj.name === 'Melodic') duration = 1.5 + rng() * 1.5;
      if (catObj.name === 'FX') duration = 1.0 + rng() * 3.0;
      if (catObj.name === 'Kick') duration = 0.3 + rng() * 0.4;
      if (catObj.name === 'Bass') duration = 0.8 + rng() * 1.2;

      const sizeInMb = (duration * 0.17).toFixed(1); // 44.1k WAV estimation
      const fileSize = `${sizeInMb} MB`;

      // Rating (stars 3 - 5 usually)
      const rating = 3 + Math.floor(rng() * 3);

      // Generate bespoke tags
      const catTags: string[] = [];
      while (catTags.length < 3) {
        const potentialTag = catObj.tags[Math.floor(rng() * catObj.tags.length)];
        if (!catTags.includes(potentialTag)) {
          catTags.push(potentialTag);
        }
      }

      // Setup customized synthesizer parameters tailored to this item
      const synthParams: SynthParameters = {
        pitch: getDeafultPitchForCategory(catObj.name, randKey),
        decay: Number(duration.toFixed(2)),
        waveType: getDefaultWaveformForCategory(catObj.name, i),
        overdrive: catTags.includes('distorted') || catTags.includes('growl') ? 25 + Math.floor(rng() * 35) : 0,
        filterCutoff: getFilterCutoffForCategory(catObj.name, i, rng),
        delayTime: catObj.name === 'Melodic' || catObj.name === 'FX' ? (rng() > 0.5 ? 0.25 : 0.0) : 0.0,
        reverbWet: catTags.includes('reverb') ? 30 + Math.floor(rng() * 40) : (catObj.name === 'Melodic' ? 25 : 5),
      };

      const name = `${randSub} ${catObj.name} - ${randKey !== 'N/A' ? randKey : ''} #${100 + i}`;

      samples.push({
        id: `sample-${catObj.name.toLowerCase()}-${sampleIndex++}`,
        name: name.replace(' -  #', ' #').replace('  #', ' #'),
        category: catObj.name,
        subCategory: randSub,
        key: randKey,
        bpm,
        fileSize,
        duration: Number(duration.toFixed(2)),
        tags: catTags,
        rating,
        synthParams,
      });
    }
  });

  cachedSamples = samples;
  return samples;
}

// Map key letters to reasonable starting synth pitches in Hz
function getDeafultPitchForCategory(category: SampleCategory, key: string): number {
  const pitches: { [key: string]: number } = {
    'C': 130.81, 'C#': 138.59, 'D': 146.83, 'Eb': 155.56, 'E': 164.81,
    'F': 174.61, 'F#': 185.00, 'G': 196.00, 'G#': 207.65, 'A': 220.00,
    'Bb': 233.08, 'B': 246.94,
    'Amin': 220.00, 'Cmaj': 261.63, 'F#min': 185.00, 'Gmaj': 392.00,
    'Dmin': 293.66, 'Emaj': 329.63, 'Bmin': 246.94, 'N/A': 100.0
  };

  const hz = pitches[key] || 150.0;
  
  if (category === 'Kick') {
    return hz / 4; // ultra sub bass-dropped kicks (e.g., 32 - 60 Hz)
  }
  if (category === 'Bass') {
    return hz / 2.5; // low fat bassline notes (e.g., dnd - 80 Hz)
  }
  if (category === 'Snare') {
    return 190.00; // Snare basic drum tension body
  }
  if (category === 'Hi-Hat') {
    return 8000.00; // hi hat cymbal treble
  }
  
  return hz; // default piano / pad note frequency
}

function getDefaultWaveformForCategory(category: SampleCategory, index: number): 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise' {
  if (category === 'Kick') return 'sine';
  if (category === 'Snare' || category === 'Hi-Hat') return 'noise';
  if (category === 'Bass') return index % 2 === 0 ? 'sawtooth' : 'triangle';
  if (category === 'Melodic') return 'triangle';
  return 'sine';
}

function getFilterCutoffForCategory(category: SampleCategory, index: number, rng: () => number): number {
  if (category === 'Hi-Hat') return 8000 + Math.floor(rng() * 4000);
  if (category === 'Snare') return 1200 + Math.floor(rng() * 1000);
  if (category === 'Kick') return 300 + Math.floor(rng() * 200);
  if (category === 'Bass') return 400 + Math.floor(rng() * 600);
  if (category === 'Melodic') return 1500 + Math.floor(rng() * 2500);
  return 2000;
}
