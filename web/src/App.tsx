import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuthStore } from './state/auth';
import { useUiStore } from './state/ui';
import { startPlaybackEngine } from './state/playbackEngine';
import { detectMode } from './lib/catalog';
import { HomePage } from './pages/Home';
import { SearchPage } from './pages/Search';
import { RadioPage } from './pages/Radio';
import { LibraryPage } from './pages/Library';
import { PlaylistPage } from './pages/PlaylistPage';
import { AlbumPage } from './pages/AlbumPage';
import { ArtistPage } from './pages/ArtistPage';
import { SongPage } from './pages/SongPage';
import { GenrePage } from './pages/GenrePage';
import { LanguagePage } from './pages/LanguagePage';
import { ProvidersPage } from './pages/ProvidersPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SettingsPage } from './pages/SettingsPage';
import { FeaturedPage } from './pages/FeaturedPage';
import { NotFoundPage } from './pages/NotFound';

export function App() {
  const init = useAuthStore((s) => s.init);
  const setTheme = useUiStore((s) => s.setTheme);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme !== 'light');
  }, [theme]);

  useEffect(() => {
    void init();
    void detectMode();
    startPlaybackEngine();
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/radio" element={<RadioPage />} />
          <Route path="/radio/:id" element={<RadioPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/liked" element={<LibraryPage tab="liked" />} />
          <Route path="/library/albums" element={<LibraryPage tab="albums" />} />
          <Route path="/library/artists" element={<LibraryPage tab="artists" />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/album/:provider/:providerId" element={<AlbumPage />} />
          <Route path="/artist/:provider/:providerId" element={<ArtistPage />} />
          <Route path="/provider-playlist/:provider/:providerId" element={<AlbumPage kind="playlist" />} />
          <Route path="/song/:id" element={<SongPage />} />
          <Route path="/genre/:slug" element={<GenrePage />} />
          <Route path="/language/:id" element={<LanguagePage />} />
          <Route path="/featured/:id" element={<FeaturedPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
