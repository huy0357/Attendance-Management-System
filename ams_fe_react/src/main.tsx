// ====================== POLYFILL SIÊU SỚM ======================
// @ts-ignore
import randomUUID from 'crypto-randomuuid';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/tokens.scss';
import './styles/global.scss';

if (typeof window.crypto === 'undefined') {
  // @ts-ignore
  window.crypto = {};
}
if (typeof window.crypto.randomUUID !== 'function') {
  Object.defineProperty(window.crypto, 'randomUUID', {
    value: randomUUID,
    writable: true,
    configurable: true,
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);