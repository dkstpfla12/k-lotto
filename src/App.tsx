import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Sum from './pages/Sum'
import Freq from './pages/Freq'
import Gap from './pages/Gap'
import Pattern from './pages/Pattern'
import Mine from './pages/Mine'
import Draw from './pages/Draw'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="sum" element={<Sum />} />
        <Route path="freq" element={<Freq />} />
        <Route path="gap" element={<Gap />} />
        <Route path="pattern" element={<Pattern />} />
        <Route path="mine" element={<Mine />} />
        <Route path="draw" element={<Draw />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
