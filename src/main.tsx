import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './interaction.css'
import { App } from './App'

const application = <App/>
createRoot(document.getElementById('root')!).render(import.meta.env.DEV ? <StrictMode>{application}</StrictMode> : application)
