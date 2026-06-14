import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import PasswordGate from './auth/PasswordGate.jsx'
import './index.css'
import 'highlight.js/styles/github-dark.css'

// HashRouter (URLs like /#/topic/pki) so deep links and refreshes work on
// GitHub Pages static hosting without any server-side rewrite/404 config.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PasswordGate>
      <HashRouter>
        <App />
      </HashRouter>
    </PasswordGate>
  </React.StrictMode>,
)
