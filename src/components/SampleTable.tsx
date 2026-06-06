/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Square, 
  Star, 
  Download, 
  FolderPlus, 
  Sliders, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Filter,
  CheckCircle2,
  Bookmark,
  Music,
  DownloadCloud
} from 'lucide-react';
import { Sample, SampleCategory, Folder } from '../types';

interface SampleTableProps {
  samples: Sample[];
  folders: Folder[];
  currentPlayingId: string | null;
  onPlayToggle: (sample: Sample) => void;
  onLoadToSynth: (sample: Sample) => void;
  onAddToFolder: (sampleId: string, folderId: string) => void;
  onDownloadWav: (sample: Sample) => void;
  onToggleFavorite: (sampleId: string) => void;
  onCreateFolder: (name: string) => void;
}

export default function SampleTable({
  samples,
  folders,
  currentPlayingId,
  onPlayToggle,
  onLoadToSynth,
  onAddToFolder,
  onDownloadWav,
  onToggleFavorite,
  onCreateFolder
}: SampleTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedKey, setSelectedKey] = useState<string>('All');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'bpm'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [expandedFolderMenuId, setExpandedFolderMenuId] = useState<string | null>(null);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [showQuickFolderCreate, setShowQuickFolderCreate] = useState(false);

  // Available filters from the list
  const categoryFilters = ['All', 'Kick', 'Snare', 'Hi-Hat', 'Melodic', 'Bass', 'FX'];
  const keyFilters = useMemo(() => {
    const keysSet = new Set<string>();
    samples.forEach(s => {
      if (s.key && s.key !== 'N/A') keysSet.add(s.key);
    });
    return ['All', ...Array.from(keysSet).sort()];
  }, [samples]);

  // Combine Search, Category, and Tag Filtering
  const filteredSamples = useMemo(() => {
    let result = samples.filter((s) => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.subCategory.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
      const matchesKey = selectedKey === 'All' || s.key === selectedKey;
      const matchesFavorite = !onlyFavorites || s.isFavorite;

      return matchesSearch && matchesCategory && matchesKey && matchesFavorite;
    });

    // Handle sorting
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'bpm') {
      result.sort((a, b) => (b.bpm || 0) - (a.bpm || 0));
    }

    return result;
  }, [samples, searchTerm, selectedCategory, selectedKey, onlyFavorites, sortBy]);

  // Reset page number back to 1 when filters or searches change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedKey, onlyFavorites, sortBy]);

  // Pagination calculation
  const totalItems = filteredSamples.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSamples = useMemo(() => {
    return filteredSamples.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSamples, startIndex, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setExpandedFolderMenuId(null);
    }
  };

  const handleQuickFolderCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderNameInput.trim()) {
      onCreateFolder(newFolderNameInput.trim());
      setNewFolderNameInput('');
      setShowQuickFolderCreate(false);
    }
  };

  return (
    <div id="sample-catalog-panel" className="flex-1 flex flex-col h-screen overflow-hidden bg-[#070707] text-[#E0E0E0]">
      
      {/* Search and Filters Header */}
      <div className="p-6 border-b border-[#1F1F1F] bg-[#0A0A0A]/80 backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-serif text-white tracking-widest flex items-center gap-2 uppercase">
              <Music className="w-5 h-5 text-[#C5A059]" /> Catalog Explorer
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <p className="font-sans text-xs text-neutral-400">
                Showing <span className="text-[#C5A059] font-medium">{filteredSamples.length}</span> of {samples.length} pro-grade micro synthesis samples
              </p>
              {filteredSamples.length > 0 && (
                <button
                  id="bulk-download-catalog-samples-btn"
                  onClick={() => {
                    const maxSamps = Math.min(filteredSamples.length, 30);
                    const confirmDl = confirm(`Download the top ${maxSamps} samples matching your filters? Your browser will trigger individual sequential WAV files.`);
                    if (!confirmDl) return;
                    filteredSamples.slice(0, maxSamps).forEach((sample, i) => {
                      setTimeout(() => {
                        onDownloadWav(sample);
                      }, i * 300);
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#C5A059]/10 border border-[#C5A059]/30 hover:bg-[#C5A059] hover:text-black transition-all text-xs font-sans rounded text-[#C5A059] cursor-pointer font-semibold"
                  title="Download top samples matching filters sequentially"
                >
                  <DownloadCloud className="w-3.5 h-3.5" /> Download Pack ({Math.min(filteredSamples.length, 30)})
                </button>
              )}
            </div>
          </div>

          {/* Search Inputs */}
          <div className="flex flex-1 max-w-md items-center relative gap-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                id="catalog-search-input"
                type="text"
                placeholder="Search kicks, snare, chords, tech, epic tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#161616] border border-[#222] focus:border-[#C5A059] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none placeholder-neutral-500 transition-colors"
              />
            </div>

            <button
              id="favorite-filter-btn"
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-center cursor-pointer ${
                onlyFavorites 
                  ? 'bg-amber-950/20 border-amber-500/80 text-amber-400' 
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
              title="Show Favorites only"
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Badges */}
          <div className="flex flex-wrap gap-1.5 items-center mr-4">
            <span className="font-sans text-[10px] uppercase tracking-widest text-[#C5A059] opacity-60 mr-2">Category:</span>
            {categoryFilters.map(cat => (
              <button
                id={`cat-filter-${cat.toLowerCase().replace('/', '-')}`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-sans transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#C5A059] text-black font-semibold'
                    : 'bg-[#161616] hover:bg-[#222] text-neutral-300'
                }`}
              >
                {cat}s
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 flex-wrap mt-2 sm:mt-0">
            {/* Key Filter Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="font-sans text-[10px] uppercase tracking-widest text-[#C5A059] opacity-60">Key:</span>
              <select
                id="key-select-filter"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="bg-[#161616] border border-[#222] rounded-md text-xs px-2.5 py-1 text-white focus:outline-none focus:border-[#C5A059] cursor-pointer"
              >
                {keyFilters.map(k => (
                  <option key={k} value={k}>{k === 'All' ? 'All Keys' : k}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="font-sans text-[10px] uppercase tracking-widest text-[#C5A059] opacity-60">Sort:</span>
              <select
                id="sort-select-filter"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#161616] border border-[#222] rounded-md text-xs px-2.5 py-1 text-white focus:outline-none focus:border-[#C5A059] cursor-pointer"
              >
                <option value="name">Alpabetical A-Z</option>
                <option value="rating">Top Rated ⭐</option>
                <option value="bpm">BPM Speeds</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Filter className="w-12 h-12 text-neutral-600 mb-4 animate-bounce" />
            <h3 className="font-sans font-medium text-lg text-neutral-300">No samples found</h3>
            <p className="font-mono text-xs text-neutral-500 max-w-md mt-2">
              Try readjusting your search term, toggling off the star filter, or switching to "All Categories"
            </p>
          </div>
        ) : (
          <div className="border border-[#1F1F1F] rounded-lg overflow-hidden bg-[#111]/30">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1F1F1F] bg-[#0F0F0F] text-neutral-400 font-mono text-[11px] uppercase tracking-wider select-none">
                  <th className="p-4 w-12 text-center">Audition</th>
                  <th className="p-4">Name / Tags</th>
                  <th className="p-4 w-28">Category</th>
                  <th className="p-4 w-24">Key / BPM</th>
                  <th className="p-4 w-20 text-center">Rating</th>
                  <th className="p-4 w-44 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1F]">
                {paginatedSamples.map((sample) => {
                  const isPlaying = currentPlayingId === sample.id;
                  const isExpandedFolder = expandedFolderMenuId === sample.id;

                  return (
                    <tr 
                      key={sample.id}
                      className={`hover:bg-[#161616] group transition-all duration-100 ${
                        isPlaying ? 'bg-[#C5A059]/10' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        {/* Audition Trigger */}
                        <button
                          id={`play-btn-${sample.id}`}
                          onClick={() => onPlayToggle(sample)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isPlaying 
                              ? 'bg-[#C5A059] text-black shadow-[#C5A059]/20 shadow-md ring-2 ring-[#C5A059]/50' 
                              : 'bg-[#161616] text-neutral-200 hover:bg-[#222] hover:text-white'
                          }`}
                          title={isPlaying ? 'Stop Playback' : 'Audition Sample'}
                        >
                          {isPlaying ? (
                            <Square className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        {/* Display Info & Tags */}
                        <div className="flex items-center space-x-2">
                          <button
                            id={`fav-btn-${sample.id}`}
                            onClick={() => onToggleFavorite(sample.id)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              sample.isFavorite 
                                ? 'text-amber-400 hover:text-amber-300' 
                                : 'text-neutral-600 hover:text-neutral-400 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${sample.isFavorite ? 'fill-current' : ''}`} />
                          </button>
                          
                          <span className={`font-sans font-medium text-sm transition-colors ${
                            isPlaying ? 'text-[#C5A059] font-semibold' : 'text-white'
                          }`}>
                            {sample.name}
                          </span>
                        </div>

                        {/* Badges / Sub-tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-7">
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-bold leading-normal uppercase">
                            {sample.subCategory}
                          </span>
                          {sample.tags.map(tag => (
                            <span 
                              key={tag}
                              className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-500 leading-normal hover:text-neutral-300 transition-colors"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        {/* Category */}
                        <span className="font-sans text-xs text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded">
                          {sample.category}
                        </span>
                      </td>
                      <td className="p-4">
                        {/* Musical Values (Key/BPM) */}
                        <div className="flex flex-col font-mono text-[11px] text-neutral-300 space-y-1">
                          {sample.key !== 'N/A' && (
                            <span className="text-[#C5A059] font-bold">🎹 {sample.key}</span>
                          )}
                          {sample.bpm && (
                            <span className="text-neutral-400 font-semibold">⚡ {sample.bpm} BPM</span>
                          )}
                          {!sample.bpm && sample.key === 'N/A' && (
                            <span className="text-neutral-500 uppercase tracking-widest">one shot</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono text-xs text-amber-400 font-semibold">
                        {/* Rating Stars */}
                        {Array.from({ length: sample.rating }).map((_, rIdx) => (
                          <span key={rIdx}>★</span>
                        ))}
                      </td>
                      <td className="p-4 text-right">
                        {/* Operations Actions & Folder Dropdowns */}
                        <div className="flex items-center justify-end space-x-1.5 relative">
                          
                          {/* Folder Assignment Trigger */}
                          <div className="relative">
                            <button
                              id={`folder-assign-btn-${sample.id}`}
                              onClick={() => setExpandedFolderMenuId(isExpandedFolder ? null : sample.id)}
                              className={`p-1.5 rounded-md hover:bg-[#161616] hover:text-[#C5A059] transition-colors flex items-center justify-center border border-transparent hover:border-[#222] cursor-pointer ${
                                isExpandedFolder ? 'bg-[#161616] text-[#C5A059] border-[#222]' : 'text-neutral-400'
                              }`}
                              title="Save to Cloud Folder"
                            >
                              <FolderPlus className="w-4.5 h-4.5" />
                            </button>

                            {/* Dropdown Folder Selector Menu */}
                            {isExpandedFolder && (
                              <div className="absolute right-0 mt-2 w-56 bg-[#111] border border-[#1F1F1F] rounded-lg shadow-2xl z-20 p-2 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                <span className="font-mono text-[9px] uppercase text-neutral-500 tracking-wider px-2 block mb-1">
                                  Save to Cloud Folder
                                </span>
                                
                                <div className="max-h-40 overflow-y-auto space-y-0.5">
                                  {folders.length === 0 ? (
                                    <div className="p-2 text-center text-xs text-neutral-500 font-sans">
                                      No folders created yet
                                    </div>
                                  ) : (
                                    folders.map(folder => {
                                      const alreadyHas = folder.sampleIds.includes(sample.id);
                                      return (
                                        <button
                                          id={`folder-row-${folder.id}-sample-${sample.id}`}
                                          key={folder.id}
                                          onClick={() => {
                                            onAddToFolder(sample.id, folder.id);
                                            setExpandedFolderMenuId(null);
                                          }}
                                          disabled={alreadyHas}
                                          className="w-full flex items-center justify-between p-2 rounded text-xs select-none hover:bg-neutral-850 transition-colors text-left"
                                        >
                                          <span className="truncate max-w-36 font-sans text-neutral-200">📁 {folder.name}</span>
                                          {alreadyHas ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 ml-1" />
                                          ) : (
                                            <span className="font-sans text-[10px] text-neutral-500 hover:text-[#C5A059]">Add</span>
                                          )}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>

                                <div className="border-t border-[#1F1F1F] mt-2 pt-2">
                                  {showQuickFolderCreate ? (
                                    <form onSubmit={handleQuickFolderCreateSubmit} className="flex gap-1 items-center px-1">
                                      <input
                                        id="quick-folder-name"
                                        type="text"
                                        placeholder="Folder name..."
                                        value={newFolderNameInput}
                                        onChange={(e) => setNewFolderNameInput(e.target.value)}
                                        className="bg-[#070707] border border-[#1F1F1F] focus:border-[#C5A059] text-xs text-white px-2 py-1 rounded w-full outline-ignore focus:outline-none"
                                        autoFocus
                                      />
                                      <button 
                                        type="submit" 
                                        className="bg-[#C5A059] hover:bg-[#d6b777] text-white font-semibold text-xs rounded px-2 py-1 cursor-pointer"
                                      >
                                        Create
                                      </button>
                                    </form>
                                  ) : (
                                    <button
                                      id="toggle-quick-folder-btn"
                                      onClick={() => setShowQuickFolderCreate(true)}
                                      className="w-full font-sans text-[10px] text-center text-[#C5A059] hover:text-[#d6b777] py-1 rounded cursor-pointer hover:bg-[#161616]/40"
                                    >
                                      + New Folder
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Launch into Wave Synth Lab */}
                          <button
                            id={`load-synth-btn-${sample.id}`}
                            onClick={() => onLoadToSynth(sample)}
                            className="p-1.5 rounded-md text-neutral-400 hover:text-[#C5A059] hover:bg-[#161616] transition-colors flex items-center justify-center border border-transparent hover:border-[#1F1F1F] cursor-pointer"
                            title="Tweak parameters in Wave Synth Lab"
                          >
                            <Sliders className="w-4.5 h-4.5" />
                          </button>

                          {/* Download WAV File */}
                          <button
                            id={`export-wav-btn-${sample.id}`}
                            onClick={() => onDownloadWav(sample)}
                            className="p-1.5 rounded-lg bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 hover:bg-[#C5A059] hover:text-black transition-colors flex items-center justify-center cursor-pointer"
                            title="Download Audio (.WAV)"
                          >
                            <Download className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Navigation Pagination Footer */}
      <div className="p-4 border-t border-[#1F1F1F] bg-[#0A0A0A] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-sans text-[11px] text-neutral-500">Rows per page:</span>
          <select
            id="rows-per-page-select"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-[#161616] border border-[#222] rounded text-xs text-white px-2 py-0.5 cursor-pointer"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center justify-center space-x-1 font-mono text-xs">
          <button
            id="prev-page-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded bg-[#161616] hover:bg-[#222] hover:text-white disabled:opacity-40 disabled:hover:bg-[#161616] disabled:hover:text-inherit cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-[#888] px-2 select-none">
            Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
          </span>

          <button
            id="next-page-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded bg-[#161616] hover:bg-[#222] hover:text-white disabled:opacity-40 disabled:hover:bg-[#161616] disabled:hover:text-inherit cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
