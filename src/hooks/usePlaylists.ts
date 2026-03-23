import { useState, useEffect } from 'react';
import { Playlist } from '../types';

const PLAYLISTS_KEY = 'hafif_muzik_playlists';

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(PLAYLISTS_KEY);
    if (saved) {
      try {
        setPlaylists(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse playlists', e);
      }
    }
  }, []);

  const savePlaylists = (newPlaylists: Playlist[]) => {
    setPlaylists(newPlaylists);
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(newPlaylists));
  };

  const addPlaylist = (playlist: Playlist) => {
    savePlaylists([...playlists, playlist]);
  };

  const updatePlaylist = (updatedPlaylist: Playlist) => {
    savePlaylists(playlists.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
  };

  const deletePlaylist = (id: string) => {
    savePlaylists(playlists.filter(p => p.id !== id));
  };

  return { playlists, addPlaylist, updatePlaylist, deletePlaylist };
}
