import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthLayout from './layouts/AuthLayout';
import ChatLayout from './layouts/ChatLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import PrivateRoute from './components/common/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
            </Route>
            <Route element={<PrivateRoute />}>
              <Route path="/chat" element={<ChatLayout />}>
                <Route index element={<Chat />} />
              </Route>
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;