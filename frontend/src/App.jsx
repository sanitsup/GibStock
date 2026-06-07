import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PinGate from './components/PinGate'
import POSPage from './pages/POSPage'
import StockPage from './pages/StockPage'
import ReportPage from './pages/ReportPage'
import ExpensePage from './pages/ExpensePage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/pos" replace />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="expenses" element={
            <PinGate>
              <ExpensePage />
            </PinGate>
          } />
          <Route path="analytics" element={
            <PinGate>
              <AnalyticsPage />
            </PinGate>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
