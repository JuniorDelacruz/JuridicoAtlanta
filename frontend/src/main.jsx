// src/main.jsx ou src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { BrowserRouter } from 'react-router-dom';

import { ToastProvider } from "./utils/toast.jsx";
import { ConfirmProvider } from "./components/ui/confirm.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider position="top-right">
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);