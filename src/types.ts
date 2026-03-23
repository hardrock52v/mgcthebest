export interface Song {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
}

export interface Playlist {
  id: string;
  name: string;
  coverImage?: string;
  songs: Song[];
}
