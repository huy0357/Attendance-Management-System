import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/tokens.scss';
import './styles/global.scss';

// Polyfill crypto.randomUUID cho môi trường HTTP (chưa có secure context)
// TODO: Xoá đoạn này sau khi cấu hình HTTPS xong cho domain
function polyfillRandomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

if (typeof window.crypto === 'undefined') {
  // @ts-ignore
  window.crypto = {};
}
if (typeof window.crypto.randomUUID !== 'function') {
  Object.defineProperty(window.crypto, 'randomUUID', {
    value: polyfillRandomUUID,
    writable: true,
    configurable: true,
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);