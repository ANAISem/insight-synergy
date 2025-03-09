import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Wenn Sie die Performance messen möchten, können Sie die Funktion reportWebVitals() aufrufen
// und die Ergebnisse an eine Analytics-Plattform senden
reportWebVitals();
