/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SampleCategory = 'Kick' | 'Snare' | 'Hi-Hat' | 'Melodic' | 'Bass' | 'FX';

export interface SynthParameters {
  pitch: number;        // Hz (base pitch)
  decay: number;        // seconds
  waveType: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
  overdrive: number;    // 0 to 100 (distortion amount)
  filterCutoff: number; // Hz
  delayTime: number;    // seconds (0 for off)
  reverbWet: number;    // 0 to 100 (wet mix percentage)
}

export interface Sample {
  id: string;
  name: string;
  category: SampleCategory;
  subCategory: string;
  key: string;          // e.g., 'C', 'Amin', 'F#maj', 'N/A'
  bpm: number | null;   // e.g., 120, null for one-shots
  fileSize: string;     // e.g., "1.2 MB"
  duration: number;     // in seconds
  tags: string[];
  rating: number;       // 1 to 5 stars
  isFavorite?: boolean;
  synthParams: SynthParameters;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  sampleIds: string[];  // ids of platform samples in this folder
}

export interface UserFile {
  id: string;
  name: string;
  category: SampleCategory | 'Other';
  fileSize: string;
  duration: number;
  uploadedAt: string;
  audioUrl?: string;    // Blob URL for previewing locally
  tags: string[];
  rating: number;
}

export interface DrumPad {
  id: string;          // e.g., 'pad-1' to 'pad-16'
  keyBind: string;      // e.g., 'Q', 'W', 'E', 'R'...
  name: string;         // Name of loaded sample
  sampleId?: string;    // Reference to platform sample if loaded
  userFileId?: string;  // Reference to user uploaded sample if loaded
  type: 'catalog' | 'user' | null;
  synthOverride?: SynthParameters;
}
