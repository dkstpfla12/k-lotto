import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import 'krds-uiux/resources/css/token/krds_tokens.css'
import './styles/fonts.css'
import './styles/app.css'
import { DataProvider } from './data/DataContext'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </HashRouter>
  </StrictMode>,
)
