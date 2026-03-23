import React, { useState, useEffect, useRef } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { Search, Play, Pause, SkipForward, SkipBack, Volume2, Plus, ListMusic, X, Image as ImageIcon, Trash2, Power } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Song, Playlist } from './types';
import { usePlaylists } from './hooks/usePlaylists';
import { resizeImage, cn } from './lib/utils';

export default function App() {
  // App State
  const [appState, setAppState] = useState<'splash' | 'main' | 'closing'>('splash');
  const [activeView, setActiveView] = useState<'search' | 'playlist'>('search');
  
  // Data State
  const { playlists, addPlaylist, updatePlaylist, deletePlaylist } = usePlaylists();
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Player State
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [volume, setVolume] = useState(100);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  
  // Refs
  const playerRef = useRef<YouTubePlayer | null>(null);

  // Splash Screen Timer
  useEffect(() => {
    if (appState === 'splash') {
      const timer = setTimeout(() => setAppState('main'), 3500);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  // Handle Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        performSearch(searchQuery);
      } else if (searchQuery.trim().length === 0) {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setActiveView('search');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 2) {
      performSearch(searchQuery);
    }
  };

  // Player Controls
  const playSong = (song: Song, contextQueue: Song[] = [], index: number = 0) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setIsLoading(true);
    if (contextQueue.length > 0) {
      setQueue(contextQueue);
      setQueueIndex(index);
    } else {
      setQueue([song]);
      setQueueIndex(0);
    }
    
    if (playerRef.current) {
      playerRef.current.loadVideoById(song.id);
      playerRef.current.playVideo();
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (queueIndex < queue.length - 1) {
      playSong(queue[queueIndex + 1], queue, queueIndex + 1);
    }
  };

  const playPrev = () => {
    if (queueIndex > 0) {
      playSong(queue[queueIndex - 1], queue, queueIndex - 1);
    }
  };

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    event.target.setVolume(volume);
    if (isPlaying) event.target.playVideo();
  };

  const onPlayerStateChange = (event: YouTubeEvent) => {
    // -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = video cued
    if (event.data === 0) {
      playNext();
    } else if (event.data === 1) {
      setIsPlaying(true);
      setIsLoading(false);
    } else if (event.data === 2) {
      setIsPlaying(false);
      setIsLoading(false);
    } else if (event.data === 3) {
      setIsLoading(true);
    }
  };

  const onPlayerError = (event: YouTubeEvent) => {
    console.error("YouTube Player Error:", event.data);
    setErrorMsg("Bu şarkı telif hakları nedeniyle dışarıdan çalınamıyor. Sonrakine geçiliyor...");
    setTimeout(() => setErrorMsg(null), 4000);
    setIsLoading(false);
    playNext();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value);
    setVolume(vol);
    if (playerRef.current) {
      playerRef.current.setVolume(vol);
    }
  };

  const handleCloseApp = () => {
    setAppState('closing');
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
  };

  // Playlist Management UI State
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistCover, setNewPlaylistCover] = useState('');

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    
    addPlaylist({
      id: uuidv4(),
      name: newPlaylistName,
      coverImage: newPlaylistCover,
      songs: []
    });
    
    setNewPlaylistName('');
    setNewPlaylistCover('');
    setIsCreatingPlaylist(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const resized = await resizeImage(file);
      setNewPlaylistCover(resized);
    }
  };

  const addSongToPlaylist = (song: Song, playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && !playlist.songs.find(s => s.id === song.id)) {
      updatePlaylist({
        ...playlist,
        songs: [...playlist.songs, song]
      });
    }
  };

  const removeSongFromPlaylist = (songId: string, playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      updatePlaylist({
        ...playlist,
        songs: playlist.songs.filter(s => s.id !== songId)
      });
    }
  };

  // Render Splash / Closing Screen
  if (appState === 'splash' || appState === 'closing') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-center p-6 z-50">
        <div className="max-w-2xl space-y-8 animate-in fade-in duration-1000">
          <h1 className="text-3xl md:text-5xl font-serif text-white tracking-wider">
            Bismillahirrahmanirrahim
          </h1>
          <div className="h-px w-32 bg-neutral-800 mx-auto"></div>
          <p className="text-neutral-400 text-lg md:text-xl font-light leading-relaxed">
            Ya Rabbi, 5 Nisan'daki Fenerbahçe deplasmanında Beşiktaş'ımıza güç ve kuvvet ver, sahadan galibiyetle ayrılmamızı nasip eyle. Amin.
          </p>
          {appState === 'closing' && (
            <p className="text-neutral-600 text-sm mt-12">Uygulama kapatılabilir...</p>
          )}
        </div>
      </div>
    );
  }

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  return (
    <div className="flex flex-col h-screen bg-black text-neutral-300 font-sans overflow-hidden selection:bg-neutral-800">
      
      {/* Hidden YouTube Player for Audio */}
      <div className="fixed bottom-0 right-0 w-1 h-1 opacity-10 pointer-events-none overflow-hidden z-50">
        <YouTube
          videoId={currentSong ? currentSong.id : 'M7lc1UVf-VE'}
          opts={{
            height: '10',
            width: '10',
            playerVars: { 
              autoplay: 1, 
              controls: 0, 
              disablekb: 1,
              playsinline: 1,
              origin: window.location.origin
            },
          }}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          onError={onPlayerError}
        />
      </div>

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-md shadow-lg z-50 text-sm animate-in fade-in slide-in-from-top-4">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-64 bg-[#0a0a0a] border-r border-neutral-900 flex flex-col">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white tracking-tight">Hafif Müzik</h2>
            <button onClick={handleCloseApp} className="text-neutral-500 hover:text-red-500 transition-colors" title="Kapat">
              <Power size={18} />
            </button>
          </div>
          
          <div className="px-4 pb-4">
            <button 
              onClick={() => setIsCreatingPlaylist(true)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md transition-colors"
            >
              <Plus size={18} />
              Yeni Çalma Listesi
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
            {playlists.map(playlist => (
              <button
                key={playlist.id}
                onClick={() => {
                  setActivePlaylistId(playlist.id);
                  setActiveView('playlist');
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors text-left",
                  activeView === 'playlist' && activePlaylistId === playlist.id 
                    ? "bg-neutral-900 text-white font-medium" 
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
                )}
              >
                <ListMusic size={16} />
                <span className="truncate">{playlist.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-[#050505]">
          
          {/* Header / Search */}
          <div className="h-20 flex items-center px-8 border-b border-neutral-900/50">
            <form onSubmit={handleSearch} className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <input 
                type="text" 
                placeholder="Şarkı veya sanatçı ara..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 text-white text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-neutral-700 placeholder:text-neutral-600"
              />
            </form>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* Create Playlist Modal (Inline for simplicity) */}
            {isCreatingPlaylist && (
              <div className="mb-8 p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-white">Yeni Çalma Listesi</h3>
                  <button onClick={() => setIsCreatingPlaylist(false)} className="text-neutral-500 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreatePlaylist} className="space-y-4">
                  <div>
                    <input 
                      type="text" 
                      placeholder="Liste Adı" 
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-neutral-600"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-400 hover:text-white">
                      <ImageIcon size={18} />
                      Kapak Fotoğrafı Seç
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {newPlaylistCover && (
                      <img src={newPlaylistCover} alt="Cover preview" className="w-10 h-10 rounded object-cover" />
                    )}
                  </div>
                  <button type="submit" className="bg-white text-black px-6 py-2 rounded-md text-sm font-medium hover:bg-neutral-200 transition-colors">
                    Oluştur
                  </button>
                </form>
              </div>
            )}

            {/* Search Results View */}
            {activeView === 'search' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Arama Sonuçları</h2>
                {isSearching ? (
                  <div className="text-neutral-500">Aranıyor...</div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((song, index) => (
                      <div key={song.id} className="group flex items-center gap-4 p-2 hover:bg-neutral-900/50 rounded-md transition-colors">
                        <div className="relative w-12 h-12 flex-shrink-0 cursor-pointer" onClick={() => playSong(song, searchResults, index)}>
                          <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover rounded" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                            <Play size={20} className="text-white fill-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-medium truncate cursor-pointer hover:underline" onClick={() => playSong(song, searchResults, index)}>
                            {song.title}
                          </h4>
                          <p className="text-neutral-500 text-xs truncate">{song.author}</p>
                        </div>
                        <div className="text-neutral-500 text-xs">{song.duration}</div>
                        
                        {/* Add to Playlist Dropdown (Simplified) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          {playlists.length > 0 && (
                            <select 
                              className="bg-black border border-neutral-800 text-xs rounded px-2 py-1 outline-none"
                              onChange={(e) => {
                                if(e.target.value) {
                                  addSongToPlaylist(song, e.target.value);
                                  e.target.value = ""; // reset
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="" disabled>Listeye Ekle</option>
                              {playlists.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-neutral-600 text-sm">Arama yapmak için yukarıdaki çubuğu kullanın.</div>
                )}
              </div>
            )}

            {/* Playlist View */}
            {activeView === 'playlist' && activePlaylist && (
              <div>
                <div className="flex items-end gap-6 mb-8">
                  <div className="w-40 h-40 bg-neutral-900 rounded-lg shadow-2xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-neutral-800">
                    {activePlaylist.coverImage ? (
                      <img src={activePlaylist.coverImage} alt={activePlaylist.name} className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic size={48} className="text-neutral-700" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Çalma Listesi</p>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">{activePlaylist.name}</h1>
                    <p className="text-sm text-neutral-500">{activePlaylist.songs.length} şarkı</p>
                  </div>
                  <button 
                    onClick={() => {
                      deletePlaylist(activePlaylist.id);
                      setActiveView('search');
                      setActivePlaylistId(null);
                    }}
                    className="text-neutral-600 hover:text-red-500 pb-2 transition-colors"
                    title="Listeyi Sil"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {activePlaylist.songs.length > 0 ? (
                  <div className="space-y-1">
                    {activePlaylist.songs.map((song, index) => (
                      <div key={`${song.id}-${index}`} className="group flex items-center gap-4 p-2 hover:bg-neutral-900/50 rounded-md transition-colors">
                        <div className="w-6 text-center text-neutral-600 text-sm group-hover:hidden">{index + 1}</div>
                        <button onClick={() => playSong(song, activePlaylist.songs, index)} className="w-6 text-center hidden group-hover:block text-white">
                          <Play size={14} className="fill-white mx-auto" />
                        </button>
                        
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover rounded" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-medium truncate">{song.title}</h4>
                          <p className="text-neutral-500 text-xs truncate">{song.author}</p>
                        </div>
                        <div className="text-neutral-500 text-xs">{song.duration}</div>
                        <button 
                          onClick={() => removeSongFromPlaylist(song.id, activePlaylist.id)}
                          className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-white p-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-neutral-600 text-sm py-8 border-t border-neutral-900">
                    Bu listede henüz şarkı yok. Arama yaparak şarkı ekleyebilirsiniz.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Bottom Player Bar */}
      <div className="h-20 bg-[#0a0a0a] border-t border-neutral-900 flex items-center px-6 justify-between select-none">
        
        {/* Now Playing Info */}
        <div className="w-1/3 flex items-center gap-4 min-w-0">
          {currentSong ? (
            <>
              <img src={currentSong.thumbnail} alt={currentSong.title} className="w-12 h-12 rounded object-cover" />
              <div className="min-w-0">
                <h4 className="text-white text-sm font-medium truncate">{currentSong.title}</h4>
                <p className="text-neutral-500 text-xs truncate">{currentSong.author}</p>
              </div>
            </>
          ) : (
            <div className="text-neutral-600 text-xs">Çalınan şarkı yok</div>
          )}
        </div>

        {/* Controls */}
        <div className="w-1/3 flex flex-col items-center gap-2">
          <div className="flex items-center gap-6">
            <button onClick={playPrev} className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50" disabled={!currentSong}>
              <SkipBack size={20} className="fill-current" />
            </button>
            <button 
              onClick={togglePlay} 
              className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform disabled:opacity-50"
              disabled={!currentSong}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={16} className="fill-black" />
              ) : (
                <Play size={16} className="fill-black ml-0.5" />
              )}
            </button>
            <button onClick={playNext} className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50" disabled={!currentSong}>
              <SkipForward size={20} className="fill-current" />
            </button>
          </div>
        </div>

        {/* Volume */}
        <div className="w-1/3 flex items-center justify-end gap-3">
          <Volume2 size={18} className="text-neutral-400" />
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
}
