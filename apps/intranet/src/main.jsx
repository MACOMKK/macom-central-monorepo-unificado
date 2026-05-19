import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

console.log('[intranet] main boot', {
  href: window.location.href,
  visibilityState: document.visibilityState,
  timestamp: new Date().toISOString(),
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

