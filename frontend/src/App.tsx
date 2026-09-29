import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import PostList from './pages/PostList';
import PostDetail from './pages/PostDetail';
import Tags from './pages/Tags';
import TagPosts from './pages/TagPosts';
import Archive from './pages/Archive';
import About from './pages/About';
import Projects from './pages/Projects';
import Gallery from './pages/Gallery';
import Friends from './pages/Friends';
import Guestbook from './pages/Guestbook';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPosts from './pages/admin/AdminPosts';
import AdminPostEditor from './pages/admin/AdminPostEditor';
import AdminGit from './pages/admin/AdminGit';
import AdminTools from './pages/admin/AdminTools';
import AdminContent from './pages/admin/AdminContent';
import SsoCallback from './pages/SsoCallback';
import { setToken, api } from './api';
import { useAuth, useTheme } from './store';

function useBootstrap() {
  const dark = useTheme((s) => s.dark);
  const token = useAuth((s) => s.token);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    setToken(token);
    if (!token) return;
    // 校验会话并同步 isRoot/头像，避免本地残留假登录态
    api
      .me()
      .then((me) => {
        useAuth.getState().setAuth(token, {
          username: me.username,
          displayName: me.displayName,
          avatarUrl: me.avatarUrl,
          email: me.email,
          isRoot: me.isRoot,
        });
      })
      .catch(() => {
        useAuth.getState().logout();
        setToken(null);
      });
  }, [token]);
}

export default function App() {
  useBootstrap();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="posts" element={<PostList />} />
        <Route path="posts/:slug" element={<PostDetail />} />
        <Route path="tags" element={<Tags />} />
        <Route path="tags/:slug" element={<TagPosts />} />
        <Route path="archive" element={<Archive />} />
        <Route path="about" element={<About />} />
        <Route path="projects" element={<Projects />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="friends" element={<Friends />} />
        <Route path="guestbook" element={<Guestbook />} />
      </Route>
      <Route path="admin/login" element={<AdminLogin />} />
      <Route path="auth/sso/callback" element={<SsoCallback />} />
      <Route path="admin" element={<AdminDashboard />}>
        <Route index element={<Navigate to="posts" replace />} />
        <Route path="posts" element={<AdminPosts />} />
        <Route path="posts/new" element={<AdminPostEditor />} />
        <Route path="posts/:id/edit" element={<AdminPostEditor />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="git" element={<AdminGit />} />
        <Route path="tools" element={<AdminTools />} />
      </Route>
    </Routes>
  );
}
