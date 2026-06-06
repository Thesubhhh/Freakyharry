/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import { 
  Folder, 
  Upload, 
  Trash2, 
  Play, 
  Square, 
  FileAudio, 
  Clock, 
  FolderPlus, 
  Cloud,
  ChevronRight,
  FolderOpen,
  ArrowLeft,
  X,
  Keyboard,
  Grid,
  Download
} from 'lucide-react';
import { Folder as UserFolder, UserFile, Sample } from '../types';

interface CloudStorageProps {
  folders: UserFolder[];
  userFiles: UserFile[];
  catalogSamples: Sample[];
  currentPlayingId: string | null;
  onPlayCatalogSample: (sample: Sample) => void;
  onPlayUserFile: (fileId: string, url: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onRemoveFromFolder: (folderId: string, sampleId: string) => void;
  onUploadFile: (file: File) => void;
  onDeleteUserFile: (fileId: string) => void;
  onAssignToDrumPad: (sampleId: string, type: 'catalog' | 'user', padIndex: number) => void;
  onCreateFolder: (name: string) => void;
  onDownloadCatalogSample: (sample: Sample) => void;
}

export default function CloudStorage({
  folders,
  userFiles,
  catalogSamples,
  currentPlayingId,
  onPlayCatalogSample,
  onPlayUserFile,
  onDeleteFolder,
  onRenameFolder,
  onRemoveFromFolder,
  onUploadFile,
  onDeleteUserFile,
  onAssignToDrumPad,
  onCreateFolder,
  onDownloadCatalogSample
}: CloudStorageProps) {
  
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Map of category to display colors
  const catColorMap: { [key: string]: string } = {
    'Kick': 'text-emerald-400 bg-emerald-950/40',
    'Snare': 'text-blue-400 bg-blue-950/40',
    'Hi-Hat': 'text-amber-400 bg-amber-950/40',
    'Melodic': 'text-purple-400 bg-purple-950/40',
    'Bass': 'text-fuchsia-400 bg-fuchsia-950/40',
    'FX': 'text-cyan-400 bg-cyan-950/40',
    'Other': 'text-neutral-400 bg-neutral-900',
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        onUploadFile(file as File);
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        onUploadFile(file as File);
      });
    }
  };

  const getFolderContents = (folder: UserFolder): Sample[] => {
    return folder.sampleIds
      .map(id => catalogSamples.find(cs => cs.id === id))
      .filter((s): s is Sample => !!s);
  };

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const activeFolderSamples = activeFolder ? getFolderContents(activeFolder) : [];

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderInput.trim()) {
      onCreateFolder(newFolderInput.trim());
      setNewFolderInput('');
    }
  };

  const handleSaveRenameLabel = (folderId: string) => {
    if (editingFolderName.trim()) {
      onRenameFolder(folderId, editingFolderName.trim());
      setEditingFolderId(null);
    }
  };

  return (
    <div id="cloud-library-panel" className="flex-1 flex flex-col h-screen overflow-hidden bg-[#070707] text-[#D0D0D0]">
      
      {/* Banner Area */}
      <div className="p-6 border-b border-[#1F1F1F] bg-[#0A0A0A]/80 backdrop-blur select-none">
        <h2 className="text-2xl font-serif text-white tracking-widest flex items-center gap-2 uppercase">
          <Cloud className="w-5 h-5 text-[#C5A059]" /> My Cloud Library
        </h2>
        <p className="font-sans text-xs text-neutral-400 mt-1">
          Synchronize samples and personal sound files securely using client persistent containers
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Workspace: Custom Folders & Directory Tree */}
        <div className="flex-1 border border-[#1F1F1F] rounded-xl bg-[#111]/30 p-5 flex flex-col min-h-[400px]">
          {activeFolderId === null ? (
            // FOLDERS DIR OVERVIEW
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3 mb-4 select-none">
                <span className="font-sans font-semibold text-sm text-neutral-200">Cloud Folders ({folders.length})</span>
                <span className="font-mono text-[10px] text-neutral-500">Virtual Directory Tree</span>
              </div>

              {/* Folder Creation Input Form inline */}
              <form onSubmit={handleCreateNewFolder} className="flex gap-2 mb-4">
                <input
                  id="create-folder-input-cloud"
                  type="text"
                  placeholder="Create New Pack folder (e.g. Acid Basslines)..."
                  value={newFolderInput}
                  onChange={(e) => setNewFolderInput(e.target.value)}
                  className="flex-1 bg-[#161616] border border-[#222] focus:border-[#C5A059] rounded-lg px-4 py-2 text-sm text-white focus:outline-none placeholder-neutral-600 transition-colors"
                />
                <button
                  id="create-folder-submit-cloud"
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#d6b777] text-black font-bold text-sm rounded-lg px-4 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FolderPlus className="w-4 h-4" /> Save
                </button>
              </form>

              {folders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center select-none">
                  <FolderOpen className="w-12 h-12 text-neutral-850 mb-2" />
                  <span className="font-sans text-sm text-[#C5A059] opacity-80">Your cloud library is empty</span>
                  <p className="font-mono text-[10px] text-[#888] max-w-xs mt-1">
                    Create a folder above, or click "Save to Folder" on any sample in the Catalog!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-y-auto">
                  {folders.map(folder => {
                    const sampleCount = folder.sampleIds.length;
                    const isRename = editingFolderId === folder.id;

                    return (
                      <div 
                        id={`folder-card-${folder.id}`}
                        key={folder.id}
                        className="border border-[#1F1F1F] hover:border-[#C5A059]/40 bg-[#0A0A0A] p-4 rounded-lg flex flex-col justify-between hover:bg-[#111]/40 transition-all cursor-pointer group"
                        onClick={() => {
                          if (!isRename) setActiveFolderId(folder.id);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-3xl select-none">📁</span>
                            <div className="flex-1 truncate max-w-44">
                              {isRename ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    id={`rename-folder-input-${folder.id}`}
                                    type="text"
                                    value={editingFolderName}
                                    onChange={(e) => setEditingFolderName(e.target.value)}
                                    className="bg-[#161616] text-xs text-white border border-[#C5A059] px-1.5 py-0.5 rounded focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    id={`save-rename-folder-btn-${folder.id}`}
                                    onClick={() => handleSaveRenameLabel(folder.id)}
                                    className="px-2 py-0.5 rounded bg-[#C5A059] text-black text-[10px] font-bold"
                                  >
                                    Apply
                                  </button>
                                </div>
                              ) : (
                                <h4 className="font-sans font-medium text-sm text-neutral-100 truncate group-hover:text-[#C5A059]">
                                  {folder.name}
                                </h4>
                              )}
                              <span className="font-mono text-[10px] text-neutral-500 block mt-0.5">
                                Created {new Date(folder.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            {sampleCount > 0 && (
                              <button
                                id={`download-folder-pack-${folder.id}`}
                                onClick={() => {
                                  getFolderContents(folder).forEach((sample, i) => {
                                    setTimeout(() => {
                                      onDownloadCatalogSample(sample);
                                    }, i * 250);
                                  });
                                }}
                                className="p-1 rounded text-neutral-500 hover:text-[#C5A059] hover:bg-[#161616]"
                                title="Download entire folder pack"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              id={`rename-folder-trigger-${folder.id}`}
                              onClick={() => {
                                setEditingFolderId(folder.id);
                                setEditingFolderName(folder.name);
                              }}
                              className="p-1 rounded text-neutral-500 hover:text-[#C5A059] hover:bg-[#161616]"
                              title="Rename folder"
                            >
                              ✍️
                            </button>
                            <button
                              id={`delete-folder-trigger-${folder.id}`}
                              onClick={() => onDeleteFolder(folder.id)}
                              className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-[#161616]"
                              title="Delete folder pack"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#1F1F1F] mt-4 pt-2 font-mono text-[10px] text-neutral-500 select-none">
                          <span>{sampleCount} Samples saved</span>
                          <span className="text-[#C5A059]/80 group-hover:translate-x-1 transition-transform flex items-center">
                            Open Dir <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // EXPANDED FOLDER VIEW
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3 mb-4 select-none">
                <button
                  id="folder-back-btn"
                  onClick={() => setActiveFolderId(null)}
                  className="font-sans text-xs text-neutral-400 hover:text-[#C5A059] flex items-center transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Directories
                </button>
                {activeFolderSamples.length > 0 && (
                  <button
                    id="download-whole-folder-pack-btn"
                    onClick={() => {
                      activeFolderSamples.forEach((sample, i) => {
                        setTimeout(() => {
                          onDownloadCatalogSample(sample);
                        }, i * 250);
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#C5A059]/10 border border-[#C5A059]/40 hover:bg-[#C5A059] hover:text-black transition-all text-xs font-sans rounded text-[#C5A059] cursor-pointer"
                    title="Render and download all samples in this pack folder"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Pack
                  </button>
                )}
                <div className="text-right">
                  <h3 id="current-folder-title" className="font-sans font-semibold text-sm text-[#C5A059] uppercase tracking-wide">{activeFolder?.name}</h3>
                  <span className="font-mono text-[10px] text-neutral-500">{activeFolderSamples.length} platform sample presets</span>
                </div>
              </div>

              {activeFolderSamples.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 select-none">
                  <span className="text-5xl mb-2">📁</span>
                  <span className="font-sans text-sm text-neutral-400">This directory is currently empty</span>
                  <p className="font-mono text-[10px] text-neutral-500 mt-1 max-w-sm">
                    Go browse the "Sample Catalog" tab, search is dynamic! Clicking the "Save to Cloud" button on any sample row lists it here!
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
                  {activeFolderSamples.map(sample => {
                    const isPlaying = currentPlayingId === sample.id;
                    return (
                      <div 
                        id={`folder-item-${sample.id}`}
                        key={sample.id}
                        className={`border border-[#1F1F1F] rounded-lg p-3 bg-[#0A0A0A] flex flex-col md:flex-row md:items-center justify-between hover:border-[#C5A059]/40 transition-colors group ${
                          isPlaying ? 'bg-[#C5A059]/[0.02] border-[#C5A059]/35' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            id={`folder-item-play-${sample.id}`}
                            onClick={() => onPlayCatalogSample(sample)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              isPlaying 
                                ? 'bg-[#C5A059] text-black' 
                                : 'bg-[#161616] border border-[#222] text-neutral-200 hover:border-[#C5A059]'
                            }`}
                          >
                            {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                          </button>
                          
                          <div className="truncate max-w-56 md:max-w-xs">
                            <span className="font-sans font-medium text-sm text-white block truncate">{sample.name}</span>
                            <span className="font-mono text-[10px] text-neutral-500 block capitalize">
                              {sample.category} • {sample.key}
                            </span>
                          </div>
                        </div>

                        {/* Inline Pad quick dispatcher and deletion */}
                        <div className="flex items-center justify-end space-x-2 mt-2 md:mt-0 select-none">
                          {/* Assign to pad dropdown */}
                          <div className="flex items-center border border-[#1F1F1F] rounded px-2 py-0.5 hover:border-[#C5A059]/45 transition-colors bg-[#111]">
                            <Grid className="w-3.5 h-3.5 text-neutral-450 mr-1.5" />
                            <select
                              id={`assign-pad-select-${sample.id}`}
                              className="bg-transparent text-[10px] font-mono text-neutral-300 focus:outline-none cursor-pointer outline-ignore shrink-0"
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value !== "") {
                                  onAssignToDrumPad(sample.id, 'catalog', Number(e.target.value));
                                  e.target.value = ""; // Reset
                                  alert(`Successfully loaded sample onto pad ${Number(e.target.value)} in the MPC Drum machine!`);
                                }
                              }}
                            >
                              <option value="" disabled>Load to PMC Pad</option>
                              {Array.from({ length: 16 }).map((_, padIdx) => (
                                <option key={padIdx} value={padIdx + 1}>Pad {padIdx + 1} ({padIdx + 1 <= 4 ? 'QWER' : padIdx + 1 <= 8 ? 'ASDF' : padIdx + 1 <= 12 ? 'ZXCV' : '1234'}[{padIdx + 1}])</option>
                              ))}
                            </select>
                          </div>

                          <button
                            id={`folder-item-download-${sample.id}`}
                            onClick={() => onDownloadCatalogSample(sample)}
                            className="p-1.5 rounded-lg bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 hover:bg-[#C5A059] hover:text-black transition-colors flex items-center justify-center cursor-pointer"
                            title="Download Audio"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            id={`folder-item-remove-${sample.id}`}
                            onClick={() => onRemoveFromFolder(activeFolderId!, sample.id)}
                            className="p-1 text-neutral-500 hover:text-red-400 focus:outline-none transition-colors"
                            title="Remove from directory pack"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Workspace: Drag-and-Drop Sample Importer */}
        <div className="w-full lg:w-96 flex flex-col space-y-5">
          
          {/* Uploader section */}
          <div 
            id="drag-and-drop-dropbox"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center transition-all min-h-48 cursor-pointer select-none ${
              isDragging 
                ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' 
                : 'border-[#1F1F1F] bg-[#111]/30 text-neutral-400 hover:border-[#C5A059]/35 hover:bg-[#161616]/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              id="file-cloud-uploader-input"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="audio/*"
              className="hidden"
            />
            
            <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'animate-bounce text-[#C5A059]' : 'text-neutral-500'}`} />
            <h4 className="font-sans font-semibold text-sm text-neutral-200">Import Personal Samples</h4>
            <span className="font-mono text-[10px] text-neutral-500 block mt-1 leading-normal px-4">
              Drag-and-drop or click to import WAV, MP3, or OGG drum samples from your local workstation
            </span>
          </div>

          {/* Uploaded User Files List */}
          <div className="border border-[#1F1F1F] rounded-xl bg-[#111]/30 p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3 mb-4 select-none">
              <span className="font-sans font-semibold text-xs text-neutral-300">My Uploads ({userFiles.length})</span>
              <span className="font-mono text-[10px] text-neutral-500">Virtual Cloud Disk</span>
            </div>

            {userFiles.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-12 text-center select-none">
                <FileAudio className="w-10 h-10 text-neutral-800 mb-2" />
                <span className="font-sans text-xs text-neutral-500">No custom files imported yet</span>
                <p className="font-mono text-[9px] text-neutral-500 max-w-[210px] mt-1 leading-normal">
                  Drop your files above to register local samples inside our sandbox storage
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {userFiles.map(file => {
                  const isPlaying = currentPlayingId === file.id;

                  return (
                    <div 
                      id={`userfile-item-${file.id}`}
                      key={file.id}
                      className="border border-[#1F1F1F] p-2.5 rounded hover:border-[#C5A059]/40 bg-[#0A0A0A] flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <button
                          id={`userfile-play-btn-${file.id}`}
                          onClick={() => {
                            if (file.audioUrl) onPlayUserFile(file.id, file.audioUrl);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isPlaying 
                              ? 'bg-[#C5A059] text-black' 
                              : 'bg-[#161616] border border-[#222] hover:border-[#C5A059] text-[#E0E0E0]'
                          }`}
                        >
                          {isPlaying ? <X className="w-3 h-3 text-black font-extrabold" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-inherit" />}
                        </button>
                        
                        <div className="truncate max-w-44 select-none">
                          <span className="font-sans text-xs text-neutral-200 block truncate leading-tight group-hover:text-[#C5A059]">
                            {file.name}
                          </span>
                          <span className="font-mono text-[9px] text-neutral-500 flex items-center gap-1.5 mt-0.5 leading-none">
                            <span>{file.fileSize}</span>
                            <span>•</span>
                            <span className="flex items-center"><Clock className="w-2.5 h-2.5 mr-0.5" /> {file.duration.toFixed(1)}s</span>
                          </span>
                        </div>
                      </div>

                      {/* Operations on uploader */}
                      <div className="flex items-center space-x-1 shrink-0 opacity-80 select-none">
                        <select
                          id={`userfile-pad-assign-${file.id}`}
                          className="bg-transparent text-[9px] border border-[#1F1F1F] rounded px-1 text-neutral-400 focus:outline-none cursor-pointer outline-ignore"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value !== "") {
                              onAssignToDrumPad(file.id, 'user', Number(e.target.value));
                              e.target.value = "";
                              alert(`Loaded custom sample onto Pad ${Number(e.target.value)}!`);
                            }
                          }}
                        >
                          <option value="" disabled>Load Pad</option>
                          {Array.from({ length: 16 }).map((_, idx) => (
                            <option key={idx} value={idx + 1}>Pad {idx + 1}</option>
                          ))}
                        </select>

                        {file.audioUrl && (
                          <a
                            id={`userfile-download-btn-${file.id}`}
                            href={file.audioUrl}
                            download={file.name}
                            className="p-1.5 rounded-lg bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 hover:bg-[#C5A059] hover:text-black transition-colors flex items-center justify-center cursor-pointer"
                            title="Download raw audio file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          id={`userfile-delete-btn-${file.id}`}
                          onClick={() => onDeleteUserFile(file.id)}
                          className="p-1 rounded text-[#888] hover:text-red-400 hover:bg-[#161616] transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
