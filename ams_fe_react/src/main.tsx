// ====================== POLYFILL SIÊU SỚM ======================
import 'crypto-randomuuid';   // Polyfill mạnh, chạy ngay khi import

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/tokens.scss';
import './styles/global.scss';

console.log('========== MAIN.TSX START ==========');
console.log('window.isSecureContext =', window.isSecureContext);
console.log('typeof window.crypto.randomUUID =', typeof window.crypto?.randomUUID);
console.log('========== MAIN.TSX END ==========');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);