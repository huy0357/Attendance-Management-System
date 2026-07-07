import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/tokens.scss';
import './styles/global.scss';

console.log('========== MAIN.TSX START ==========');
console.log('window.isSecureContext =', window.isSecureContext);
console.log('window.crypto =', window.crypto);
console.log(
  'typeof window.crypto.randomUUID (before) =',
  typeof window.crypto.randomUUID,
);

// Polyfill crypto.randomUUID cho môi trường HTTP
if (!window.crypto) {
  // @ts-ignore
  window.crypto = {};
}

if (typeof window.crypto.randomUUID !== 'function') {
  console.log('Installing crypto.randomUUID polyfill...');

  Object.defineProperty(window.crypto, 'randomUUID', {
    value: function (): string {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
    },
    writable: true,
    configurable: true,
  });
} else {
  console.log('Native crypto.randomUUID already exists');
}

console.log(
  'typeof window.crypto.randomUUID (after) =',
  typeof window.crypto.randomUUID,
);

console.log(
  'Descriptor =',
  Object.getOwnPropertyDescriptor(window.crypto, 'randomUUID'),
);

console.log('========== MAIN.TSX END ==========');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);