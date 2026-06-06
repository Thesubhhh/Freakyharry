/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import SampleTable from './components/SampleTable';
import SynthLab from './components/SynthLab';
import CloudStorage from './components/CloudStorage';
import DrumKitBuilder from './components/DrumKitBuilder';

import { Sample, Folder, UserFile, DrumPad, SynthParameters } from './types';
import { getCatalogSamples } from './lib/sampleDb';
import { scheduleVoice, renderSampleToWavBlob } from './lib/synth';

const INITIAL_PAD_KEYS = [
  'Q', 'W', 'E', 'R',
  'A', 'S', 'D', 'F',
  'Z', 'X', 'C', 'V',
  '1', '2', '3', '4'
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('catalog');
  
  // Audio Playback References
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<{ [key: string]: AudioScheduledSourceNode[] }>({});
  const activeAudioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Core Library Catalogs & State Holders
  const [catalogSamples, setCatalogSamples] = useState<Sample[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  // Synth Lab State Values
  const [synthParams, setSynthParams] = useState<SynthParameters>({
    pitch: 55,
    decay: 1.2,
    waveType: 'sine',
    overdrive: 15,
    filterCutoff: 180,
    delayTime: 0.0,
    reverbWet: 5
  });
  const [synthCategory, setSynthCategory] = useState<'Kick' | 'Snare' | 'Hi-Hat' | 'Melodic' | 'Bass' | 'FX' | 'Other'>('Kick');
  const [synthTargetLabel, setSynthTargetLabel] = useState('');

  // 16 MPC Drum pads mapping state
  const [drumPads, setDrumPads] = useState<DrumPad[]>([]);

  // Initialize catalogs and restore localStorage state on first load
  useEffect(() => {
    // 1. Generate the 1,000+ catalog lists
    const loadedSamples = getCatalogSamples();
    
    // Restore Favorites
    const storedFavsJson = localStorage.getItem('sampleforge_favorites');
    if (storedFavsJson) {
      try {
        const favIds: string[] = JSON.parse(storedFavsJson);
        loadedSamples.forEach(s => {
          if (favIds.includes(s.id)) s.isFavorite = true;
        });
      } catch (err) {
        console.error('Error parsing favorites', err);
      }
    }
    setCatalogSamples(loadedSamples);

    // 2. Restore Folders Directories
    const storedFoldersJson = localStorage.getItem('sampleforge_folders');
    if (storedFoldersJson) {
      try {
        setFolders(JSON.parse(storedFoldersJson));
      } catch(err) {
        console.error('Error parsing folders', err);
      }
    } else {
      // Create some default factory pack folders
      const defaultFolders: Folder[] = [
        {
          id: 'pack-1',
          name: 'Classic BoomBap Kit',
          createdAt: new Date().toISOString(),
          sampleIds: ['sample-kick-1', 'sample-snare-12', 'sample-hi-hat-4']
        },
        {
          id: 'pack-2',
          name: 'Ambient Piano Progression',
          createdAt: new Date().toISOString(),
          sampleIds: ['sample-melodic-2', 'sample-melodic-15']
        }
      ];
      setFolders(defaultFolders);
      localStorage.setItem('sampleforge_folders', JSON.stringify(defaultFolders));
    }

    // 3. Restore User customized files references
    const storedUserFilesJson = localStorage.getItem('sampleforge_userfiles_metadata');
    if (storedUserFilesJson) {
      try {
        setUserFiles(JSON.parse(storedUserFilesJson));
      } catch (err) {
        console.error('Error loading custom uploads metadata', err);
      }
    }

    // 4. Initialize 16 playable drum pads
    const initialPads: DrumPad[] = INITIAL_PAD_KEYS.map((key, index) => ({
      id: `pad-${index + 1}`,
      keyBind: key,
      name: '',
      type: null
    }));
    setDrumPads(initialPads);
    
    // Load default Trap kit into pads at startup to be playable out of the box
    loadPresetKitIntoPads('Trap Sub', loadedSamples, initialPads);

  }, []);

  // Sync favorites back to localStorage
  const handleToggleFavorite = (sampleId: string) => {
    const updated = catalogSamples.map(s => {
      if (s.id === sampleId) {
        const nextVal = !s.isFavorite;
        return { ...s, isFavorite: nextVal };
      }
      return s;
    });
    setCatalogSamples(updated);
    
    const favIds = updated.filter(s => s.isFavorite).map(s => s.id);
    localStorage.setItem('sampleforge_favorites', JSON.stringify(favIds));
  };

  // Directory Folders persistence
  const handleCreateFolder = (name: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      sampleIds: []
    };
    const nextArr = [...folders, newFolder];
    setFolders(nextArr);
    localStorage.setItem('sampleforge_folders', JSON.stringify(nextArr));
  };

  const handleDeleteFolder = (folderId: string) => {
    const nextArr = folders.filter(f => f.id !== folderId);
    setFolders(nextArr);
    localStorage.setItem('sampleforge_folders', JSON.stringify(nextArr));
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    const nextArr = folders.map(f => {
      if (f.id === folderId) {
        return { ...f, name: newName };
      }
      return f;
    });
    setFolders(nextArr);
    localStorage.setItem('sampleforge_folders', JSON.stringify(nextArr));
  };

  const handleAddSampleToFolder = (sampleId: string, folderId: string) => {
    const nextArr = folders.map(f => {
      if (f.id === folderId) {
        if (!f.sampleIds.includes(sampleId)) {
          return { ...f, sampleIds: [...f.sampleIds, sampleId] };
        }
      }
      return f;
    });
    setFolders(nextArr);
    localStorage.setItem('sampleforge_folders', JSON.stringify(nextArr));
  };

  const handleRemoveSampleFromFolder = (folderId: string, sampleId: string) => {
    const nextArr = folders.map(f => {
      if (f.id === folderId) {
        return { ...f, sampleIds: f.sampleIds.filter(id => id !== sampleId) };
      }
      return f;
    });
    setFolders(nextArr);
    localStorage.setItem('sampleforge_folders', JSON.stringify(nextArr));
  };

  // Personal local uploads simulation via Object Blob URLs
  const handleUploadFile = (file: File) => {
    // Check if file is audio
    if (!file.type.startsWith('audio/')) {
      alert('Unsupported file type! Please provide standard audio files (e.g., .wav, .mp3, .ogg).');
      return;
    }

    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const mockDuration = 0.5 + Math.random() * 2.5; // Random simulated decay loop length

    const newUpload: UserFile = {
      id: `userfile-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: file.name,
      category: determineCategoryFromFilename(file.name),
      fileSize: `${fileSizeMb} MB`,
      duration: Number(mockDuration.toFixed(2)),
      uploadedAt: new Date().toISOString(),
      audioUrl: URL.createObjectURL(file), // Creates playable link direct in browser
      tags: ['user-upload', 'imported'],
      rating: 4
    };

    const nextArr = [newUpload, ...userFiles];
    setUserFiles(nextArr);
    
    // Save metadata references
    const strippedMetadata = nextArr.map(({ id, name, category, fileSize, duration, uploadedAt, tags, rating }) => ({
      id, name, category, fileSize, duration, uploadedAt, tags, rating
    }));
    localStorage.setItem('sampleforge_userfiles_metadata', JSON.stringify(strippedMetadata));
  };

  const handleDeleteUserFile = (fileId: string) => {
    const target = userFiles.find(f => f.id === fileId);
    if (target?.audioUrl) {
      URL.revokeObjectURL(target.audioUrl); // Free memory allocations
    }

    const nextArr = userFiles.filter(f => f.id !== fileId);
    setUserFiles(nextArr);

    const strippedMetadata = nextArr.map(({ id, name, category, fileSize, duration, uploadedAt, tags, rating }) => ({
      id, name, category, fileSize, duration, uploadedAt, tags, rating
    }));
    localStorage.setItem('sampleforge_userfiles_metadata', JSON.stringify(strippedMetadata));
  };

  // Audio trigger systems using initialized AudioContext
  const getAudioContext = (): AudioContext => {
    if (!audioContextRef.current) {
      // Standardize cross browser AudioContext setups
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume context if browser suspended it (gesture security)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  };

  const stopAllActiveSounds = () => {
    // 1. Stop synthesized schedules
    Object.keys(activeSourcesRef.current).forEach(id => {
      activeSourcesRef.current[id].forEach(src => {
        try {
          src.disconnect();
        } catch(e) {}
      });
      delete activeSourcesRef.current[id];
    });

    // 2. Stop HTML5 audio elements playbacks
    Object.keys(activeAudioElementsRef.current).forEach(id => {
      try {
        const audio = activeAudioElementsRef.current[id];
        audio.pause();
        audio.currentTime = 0;
      } catch(e) {}
      delete activeAudioElementsRef.current[id];
    });

    setCurrentPlayingId(null);
  };

  // Playback of factory synthesized catalog sample
  const handleTogglePlayCatalog = (sample: Sample) => {
    if (currentPlayingId === sample.id) {
      stopAllActiveSounds();
      return;
    }

    stopAllActiveSounds();
    setCurrentPlayingId(sample.id);

    try {
      const ctx = getAudioContext();
      
      // Setup simple analyzer node to capture waves, if needed, connected to destinations
      const analyser = ctx.createAnalyser();
      analyser.connect(ctx.destination);

      // Web Audio Oscillator source nodes get scheduled
      // We will trace the OscillatorNode arrays internally so we can disconnect the preview immediately if "Stop" is clicked
      const trackerNodes: AudioScheduledSourceNode[] = [];
      
      const destinationOverride: AudioNode = analyser;

      // Wrap destination around custom scheduling
      scheduleVoice(ctx, sample.category, sample.synthParams, ctx.currentTime, destinationOverride);
      
      // Auto toggle back to "Stop" icon once decay time finishes
      setTimeout(() => {
        setCurrentPlayingId(currentId => currentId === sample.id ? null : currentId);
      }, sample.synthParams.decay * 1000 + 100);

    } catch (err) {
      console.error('Audio initialization blocked inside sandbox container', err);
      setCurrentPlayingId(null);
    }
  };

  // Playback of user-uploaded local files using Blob URL audio elements
  const handleTogglePlayUserFile = (fileId: string, url: string) => {
    if (currentPlayingId === fileId) {
      stopAllActiveSounds();
      return;
    }

    stopAllActiveSounds();
    setCurrentPlayingId(fileId);

    try {
      const audio = new Audio(url);
      activeAudioElementsRef.current[fileId] = audio;
      
      audio.play().catch(err => {
        console.warn('Playback error, browser blocked raw audio stream', err);
        setCurrentPlayingId(null);
      });

      audio.onended = () => {
        setCurrentPlayingId(null);
        delete activeAudioElementsRef.current[fileId];
      };

    } catch (e) {
      console.error('Playback initialization error', e);
      setCurrentPlayingId(null);
    }
  };

  // Direct download of synthesized samples (CD-Quality WAV)
  const handleDownloadCatalogWav = async (sample: Sample) => {
    try {
      const blob = await renderSampleToWavBlob(sample.category, sample.synthParams);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sample.name.replace(/ /g, '_')}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch(err) {
      alert('Error rendering offline digital model inside sandboxed iFrame. Download aborted.');
    }
  };

  const handleDownloadCustomSynthWav = async (filename: string, category: 'Kick' | 'Snare' | 'Hi-Hat' | 'Melodic' | 'Bass' | 'FX' | 'Other', params: SynthParameters) => {
    try {
      const resolvedCategory = category === 'Other' ? 'FX' : category;
      const blob = await renderSampleToWavBlob(resolvedCategory, params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename.trim().replace(/ /g, '_') || 'custom_synthesizer'}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Eror rendering custom WAV file.');
    }
  };

  // Load a catalog sample's properties directly inside Wave Synth Lab for tuning
  const handleLoadSampleToSynthLab = (sample: Sample) => {
    setSynthCategory(sample.category);
    setSynthParams(sample.synthParams);
    setSynthTargetLabel(sample.name);
    setCurrentTab('synth');
  };

  // MPC SAMPLER PLAYBACK TRIGGER SYSTEMS
  const handleTriggerDrumPad = (pad: DrumPad) => {
    if (!pad.name) return; // Pad empty

    try {
      const ctx = getAudioContext();

      if (pad.type === 'catalog' && pad.sampleId) {
        const sampleRef = catalogSamples.find(s => s.id === pad.sampleId);
        if (sampleRef) {
          const params = pad.synthOverride || sampleRef.synthParams;
          scheduleVoice(ctx, sampleRef.category, params, ctx.currentTime, ctx.destination);
        }
      } else if (pad.type === 'user' && pad.userFileId) {
        const fileRef = userFiles.find(f => f.id === pad.userFileId);
        if (fileRef && fileRef.audioUrl) {
          const audio = new Audio(fileRef.audioUrl);
          audio.volume = 0.9;
          audio.play().catch(e => console.warn('Trigger block', e));
        }
      }
    } catch (e) {
      console.warn('Sandbox Web Audio trigger block', e);
    }
  };

  // Map chosen catalog sample or user uploads to specific pad indexes (1-16)
  const handleLoadSampleToPad = (padId: string, assetId: string, type: 'catalog' | 'user') => {
    let name = '';
    
    if (type === 'catalog') {
      const ref = catalogSamples.find(s => s.id === assetId);
      if (ref) name = ref.name;
    } else {
      const ref = userFiles.find(f => f.id === assetId);
      if (ref) name = ref.name;
    }

    if (!name) return;

    setDrumPads(prev => prev.map(pad => {
      if (pad.id === padId) {
        return {
          ...pad,
          name: name,
          sampleId: type === 'catalog' ? assetId : undefined,
          userFileId: type === 'user' ? assetId : undefined,
          type
        };
      }
      return pad;
    }));
  };

  const handleClearPad = (padId: string) => {
    setDrumPads(prev => prev.map(pad => {
      if (pad.id === padId) {
        return { ...pad, name: '', sampleId: undefined, userFileId: undefined, type: null };
      }
      return pad;
    }));
  };

  // Automated Kit preset assigner loading 16 balanced sound slots
  const handleLoadPresetKit = (kitName: string) => {
    loadPresetKitIntoPads(kitName, catalogSamples, drumPads);
  };

  const loadPresetKitIntoPads = (kitName: string, samplesPool: Sample[], padsList: DrumPad[]) => {
    if (samplesPool.length === 0) return;

    // Filter samples nicely
    const kicks = samplesPool.filter(s => s.category === 'Kick');
    const snares = samplesPool.filter(s => s.category === 'Snare');
    const hats = samplesPool.filter(s => s.category === 'Hi-Hat');
    const melodic = samplesPool.filter(s => s.category === 'Melodic');
    const bass = samplesPool.filter(s => s.category === 'Bass');
    const fx = samplesPool.filter(s => s.category === 'FX');

    let loadedPads: DrumPad[] = [];

    if (kitName === 'Trap Sub') {
      // Maps sub drops, heavy 808s, snappy hats
      loadedPads = INITIAL_PAD_KEYS.map((key, index) => {
        let sample: Sample | undefined;
        if (index === 0) sample = kicks[0]; // main sub kick
        if (index === 1) sample = kicks[12]; // long kick
        if (index === 2) sample = snares[1]; // rim snare
        if (index === 3) sample = snares[15]; // trap clap
        if (index === 4) sample = hats[0]; // closed hat
        if (index === 5) sample = hats[5]; // sizzle hat
        if (index === 6) sample = hats[20]; // open cyber hat
        if (index === 7) sample = bass[1]; // fat sub bass glide
        if (index === 8) sample = bass[11]; // sliding bass
        if (index === 9) sample = melodic[0]; // Rhodes chord 1
        if (index === 10) sample = melodic[2]; // Rhodes chord 2
        if (index === 11) sample = melodic[35]; // Lead pluck
        if (index === 12) sample = fx[4]; // impact hit
        if (index === 13) sample = fx[2]; // vinyl crackle
        if (index === 14) sample = fx[10]; // sweep riser
        if (index === 15) sample = melodic[12]; // synth pluck key

        // Fallbacks if arrays somehow empty
        if (!sample) sample = samplesPool[index % samplesPool.length];

        return {
          id: `pad-${index + 1}`,
          keyBind: key,
          name: sample.name,
          sampleId: sample.id,
          type: 'catalog'
        };
      });
    } else if (kitName === 'Boom Bap') {
      // Maps dusty vinyl acoustic drums
      loadedPads = INITIAL_PAD_KEYS.map((key, index) => {
        let sample: Sample | undefined;
        if (index === 0) sample = kicks.find(s => s.subCategory === 'Lofi Soft') || kicks[1];
        if (index === 1) sample = kicks.find(s => s.subCategory === 'Acoustic Pop') || kicks[3];
        if (index === 2) sample = snares.find(s => s.subCategory === 'Lofi Brush') || snares[4];
        if (index === 3) sample = snares.find(s => s.subCategory === 'Gated Vintage') || snares[11];
        if (index === 4) sample = hats.find(s => s.subCategory === 'Egg Shaker') || hats[3];
        if (index === 5) sample = hats.find(s => s.subCategory === 'Analog Classic') || hats[1];
        if (index === 6) sample = hats.find(s => s.subCategory === 'Tambourine Loop') || hats[7];
        if (index === 7) sample = bass.find(s => s.subCategory === 'Slap Bass') || bass[5];
        if (index === 8) sample = bass.find(s => s.subCategory === 'Low End Drone') || bass[3];
        if (index === 9) sample = melodic.find(s => s.subCategory === 'Grand Piano') || melodic[5];
        if (index === 10) sample = melodic.find(s => s.subCategory === 'Rhodes Chord') || melodic[6];
        if (index === 11) sample = melodic.find(s => s.subCategory === 'Chime Bell') || melodic[8];
        if (index === 12) sample = fx.find(s => s.subCategory === 'Vinyl Crackle') || fx[1];
        if (index === 13) sample = fx.find(s => s.subCategory === 'Vocal Chop') || fx[6];
        if (index === 14) sample = fx[14];
        if (index === 15) sample = melodic[15];

        if (!sample) sample = samplesPool[index % samplesPool.length];

        return {
          id: `pad-${index + 1}`,
          keyBind: key,
          name: sample.name,
          sampleId: sample.id,
          type: 'catalog'
        };
      });
    } else {
      // Synthwave / retro style
      loadedPads = INITIAL_PAD_KEYS.map((key, index) => {
        let sample: Sample | undefined;
        if (index === 0) sample = kicks.find(s => s.subCategory === '909 Punch') || kicks[2];
        if (index === 1) sample = kicks.find(s => s.subCategory === 'Tech House') || kicks[4];
        if (index === 2) sample = snares.find(s => s.subCategory === 'Gated Vintage') || snares[2];
        if (index === 3) sample = snares.find(s => s.subCategory === 'Synthwave Rim') || snares[8];
        if (index === 4) sample = hats.find(s => s.subCategory === '909 Open') || hats[2];
        if (index === 5) sample = hats.find(s => s.subCategory === 'Trap Closed') || hats[4];
        if (index === 6) sample = hats.find(s => s.subCategory === 'Sizzle Ride') || hats[5];
        if (index === 7) sample = bass.find(s => s.subCategory === 'Acid Squelch') || bass[4];
        if (index === 8) sample = bass.find(s => s.subCategory === 'FM Growl') || bass[8];
        if (index === 9) sample = melodic.find(s => s.subCategory === 'Atmospheric Pad') || melodic[19];
        if (index === 10) sample = melodic.find(s => s.subCategory === 'Saw Lead') || melodic[22];
        if (index === 11) sample = melodic.find(s => s.subCategory === 'Lofi Pluck') || melodic[24];
        if (index === 12) sample = fx.find(s => s.subCategory === 'Laser Impact') || fx[3];
        if (index === 13) sample = fx.find(s => s.subCategory === 'Noise Riser') || fx[9];
        if (index === 14) sample = fx[8];
        if (index === 15) sample = melodic[20];

        if (!sample) sample = samplesPool[index % samplesPool.length];

        return {
          id: `pad-${index + 1}`,
          keyBind: key,
          name: sample.name,
          sampleId: sample.id,
          type: 'catalog'
         };
      });
    }

    setDrumPads(loadedPads);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#070707] font-sans select-none antialiased">
      
      {/* Shared Navigation Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab}
        folderCount={folders.length}
        savedSampleCount={folders.reduce((acc, f) => acc + f.sampleIds.length, 0)}
        cloudFilesCount={userFiles.length}
        onNewFolderClick={() => {
          const name = prompt('Enter subpack folder name:');
          if (name?.trim()) handleCreateFolder(name.trim());
        }}
      />

      {/* Primary Workspaces Viewer */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {currentTab === 'catalog' && (
          <SampleTable
            samples={catalogSamples}
            folders={folders}
            currentPlayingId={currentPlayingId}
            onPlayToggle={handleTogglePlayCatalog}
            onLoadToSynth={handleLoadSampleToSynthLab}
            onAddToFolder={handleAddSampleToFolder}
            onDownloadWav={handleDownloadCatalogWav}
            onToggleFavorite={handleToggleFavorite}
            onCreateFolder={handleCreateFolder}
          />
        )}

        {currentTab === 'cloud' && (
          <CloudStorage
            folders={folders}
            userFiles={userFiles}
            catalogSamples={catalogSamples}
            currentPlayingId={currentPlayingId}
            onPlayCatalogSample={handleTogglePlayCatalog}
            onPlayUserFile={handleTogglePlayUserFile}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onRemoveFromFolder={handleRemoveSampleFromFolder}
            onUploadFile={handleUploadFile}
            onDeleteUserFile={handleDeleteUserFile}
            onAssignToDrumPad={(sampleId, type, padIndex) => handleLoadSampleToPad(`pad-${padIndex}`, sampleId, type)}
            onCreateFolder={handleCreateFolder}
            onDownloadCatalogSample={handleDownloadCatalogWav}
          />
        )}

        {currentTab === 'kit' && (
          <DrumKitBuilder
            drumPads={drumPads}
            catalogSamples={catalogSamples}
            userFiles={userFiles}
            onTriggerPad={handleTriggerDrumPad}
            onLoadSampleToPad={handleLoadSampleToPad}
            onClearPad={handleClearPad}
            onLoadCustomKit={handleLoadPresetKit}
            onDownloadCatalogSample={handleDownloadCatalogWav}
          />
        )}

        {currentTab === 'synth' && (
          <SynthLab
            currentParams={synthParams}
            setCurrentParams={setSynthParams}
            category={synthCategory === 'Other' ? 'FX' : synthCategory as any}
            setCategory={setSynthCategory as any}
            sampleName={synthTargetLabel}
            onPreview={(cat, prms) => {
              const resCat = cat === 'Other' ? 'FX' : cat;
              try {
                const ctx = getAudioContext();
                scheduleVoice(ctx, resCat, prms, ctx.currentTime, ctx.destination);
              } catch (e) {
                console.warn(e);
              }
            }}
            onDownloadWavDirectly={handleDownloadCustomSynthWav}
          />
        )}
      </main>

    </div>
  );
}

// Quick fallback helper to guess drum category by filename matching
function determineCategoryFromFilename(filename: string): 'Kick' | 'Snare' | 'Hi-Hat' | 'Melodic' | 'Bass' | 'FX' | 'Other' {
  const norm = filename.toLowerCase();
  if (norm.includes('kick') || norm.includes('bd_') || norm.includes('sub_kick')) return 'Kick';
  if (norm.includes('snare') || norm.includes('sd_') || norm.includes('clap') || norm.includes('rim')) return 'Snare';
  if (norm.includes('hat') || norm.includes('hh_') || norm.includes('shaker') || norm.includes('ride') || norm.includes('cymbal')) return 'Hi-Hat';
  if (norm.includes('piano') || norm.includes('key') || norm.includes('chord') || norm.includes('synth') || norm.includes('pad')) return 'Melodic';
  if (norm.includes('bass') || norm.includes('sub_') || norm.includes('synth_bass')) return 'Bass';
  if (norm.includes('fx') || norm.includes('sweep') || norm.includes('riser') || norm.includes('uplifter') || norm.includes('laser')) return 'FX';
  return 'Other';
}
