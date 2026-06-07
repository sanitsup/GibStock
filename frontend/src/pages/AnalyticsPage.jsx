import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

const API_URL = import.meta.env.VITE_API_URL

function formatMoney(num) {
  return Number(num || 0).toLocaleString('th-TH')
}

function toLocalDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-sm">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: ฿{formatMoney(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const productIcons = (name) => {
  if (!name) return '👕'
  if (name.includes('กางเกง')) return '👖'
  if (name.includes('กระโปรง') || name.includes('เดรส') || name.includes('ชุดเดรส')) return '👗'
  if (name.includes('เสื้อคลุม')) return '🥼'
  if (name.includes('สูท')) return '🤵'
  return '👕'
}

export default function AnalyticsPage() {
  const currentYear = new Date().getFullYear()
  const today = new Date()

  const [tab, setTab] = useState('sales')

  // Sales
  const [view, setView] = useState('monthly')
  const [chartType, setChartType] = useState('bar')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [monthlyData, setMonthlyData] = useState(null)
  const [yearlyData, setYearlyData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Profit
  const [profitView, setProfitView] = useState('monthly')
  const [profitYear, setProfitYear] = useState(currentYear)
  const [profitMonthly, setProfitMonthly] = useState(null)
  const [profitYearly, setProfitYearly] = useState(null)
  const [profitLoading, setProfitLoading] = useState(false)
  const [profitError, setProfitError] = useState(null)

  // Trends
  const defaultFrom = toLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const defaultTo   = toLocalDateStr(today)
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate]     = useState(defaultTo)
  const [trendsData, setTrendsData]   = useState(null)
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [trendsError, setTrendsError]   = useState(null)

  const yearOptions = []
  for (let y = currentYear; y >= currentYear - 4; y--) yearOptions.push(y)

  // ---- Sales ----
  const fetchMonthly = useCallback(async (year) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/analytics/monthly?year=${year}`)
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setMonthlyData(await res.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  const fetchYearly = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/analytics/yearly`)
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setYearlyData(await res.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab !== 'sales') return
    if (view === 'monthly') fetchMonthly(selectedYear)
    else fetchYearly()
  }, [tab, view, selectedYear, fetchMonthly, fetchYearly])

  // ---- Profit ----
  const fetchProfitMonthly = useCallback(async (year) => {
    setProfitLoading(true); setProfitError(null)
    try {
      const res = await fetch(`${API_URL}/api/analytics/profit/monthly?year=${year}`)
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setProfitMonthly(await res.json())
    } catch (e) { setProfitError(e.message) }
    finally { setProfitLoading(false) }
  }, [])

  const fetchProfitYearly = useCallback(async () => {
    setProfitLoading(true); setProfitError(null)
    try {
      const res = await fetch(`${API_URL}/api/analytics/profit/yearly`)
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setProfitYearly(await res.json())
    } catch (e) { setProfitError(e.message) }
    finally { setProfitLoading(false) }
  }, [])

  useEffect(() => {
    if (tab !== 'profit') return
    if (profitView === 'monthly') fetchProfitMonthly(profitYear)
    else fetchProfitYearly()
  }, [tab, profitView, profitYear, fetchProfitMonthly, fetchProfitYearly])

  // ---- Trends ----
  const fetchTrends = useCallback(async (from, to) => {
    setTrendsLoading(true); setTrendsError(null)
    try {
      const res = await fetch(`${API_URL}/api/analytics/trends?from=${from}&to=${to}`)
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      setTrendsData(await res.json())
    } catch (e) { setTrendsError(e.message) }
    finally { setTrendsLoading(false) }
  }, [])

  useEffect(() => {
    if (tab !== 'trends') return
    fetchTrends(fromDate, toDate)
  }, [tab, fetchTrends])

  // Chart data
  const chartData = view === 'monthly'
    ? (monthlyData?.monthly || []).map(m => ({
        name: m.monthLabel, 'ยอดรวม': m.totalRevenue, 'เงินสด': m.cashTotal, 'โอนเงิน': m.transferTotal,
      }))
    : (yearlyData?.yearly || []).map(y => ({ name: y.year, 'ยอดรวม': y.totalRevenue }))

  const profitChartData = profitView === 'monthly'
    ? (profitMonthly?.monthly || []).map(m => ({
        name: m.monthLabel, 'ยอดขาย': m.revenue, 'ค่าใช้จ่าย': m.expense, 'กำไร': m.profit,
      }))
    : (profitYearly?.yearly || []).map(y => ({
        name: y.year, 'ยอดขาย': y.revenue, 'ค่าใช้จ่าย': y.expense, 'กำไร': y.profit,
      }))

  const summary = view === 'monthly' ? monthlyData?.summary : null
  const profitSummary = profitView === 'monthly' ? profitMonthly?.summary : null
  const profitYearlySummary = profitView === 'yearly' ? profitYearly?.yearly : null

  // progress bar สินค้าขายดี
  const maxQty = trendsData?.topProducts?.[0]?.totalQty || 1

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-700">📈 Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">วิเคราะห์ยอดขายและสรุปบัญชีการค้า</p>
      </div>

      {/* Tab หลัก */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 mb-6 w-fit">
        {[
          { key: 'sales',  label: '📊 ยอดขาย' },
          { key: 'profit', label: '💰 สรุปบัญชี' },
          { key: 'trends', label: '🔍 เทรนด์' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== TAB: ยอดขาย ==================== */}
      {tab === 'sales' && (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {[['monthly','📅 รายเดือน'],['yearly','📆 รายปี']].map(([v,l]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === v ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>
                  {l}
                </button>
              ))}
            </div>
            {view === 'monthly' && (
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                className="border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-300">
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            <div className="ml-auto flex gap-1 bg-slate-100 rounded-xl p-1">
              {[['bar','📊 Bar'],['line','📉 Line']].map(([v,l]) => (
                <button key={v} onClick={() => setChartType(v)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${chartType === v ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {view === 'monthly' && summary && !loading && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">ยอดรวมทั้งปี</p>
                <p className="text-xl font-bold text-slate-700 mt-1">฿{formatMoney(summary.totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">ออเดอร์ทั้งปี</p>
                <p className="text-xl font-bold text-slate-700 mt-1">{summary.totalOrders} รายการ</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">เดือนขายดีสุด</p>
                <p className="text-xl font-bold text-sky-600 mt-1">{summary.bestMonth || '—'}</p>
              </div>
            </div>
          )}

          {loading && <div className="flex items-center justify-center py-20 text-slate-400"><span className="animate-spin text-3xl mr-3">⏳</span>กำลังโหลด...</div>}
          {error && !loading && <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 text-center">⚠️ {error}</div>}
          {!loading && !error && chartData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-bold text-slate-700 mb-6">{view === 'monthly' ? `ยอดขายรายเดือน ปี ${selectedYear}` : 'ยอดขายรายปี'}</h2>
              <ResponsiveContainer width="100%" height={380}>
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} /><Legend />
                    {view === 'monthly' ? (<>
                      <Bar dataKey="ยอดรวม" fill="#38bdf8" radius={[6,6,0,0]} />
                      <Bar dataKey="เงินสด" fill="#fbbf24" radius={[6,6,0,0]} />
                      <Bar dataKey="โอนเงิน" fill="#a78bfa" radius={[6,6,0,0]} />
                    </>) : <Bar dataKey="ยอดรวม" fill="#38bdf8" radius={[6,6,0,0]} />}
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} /><Legend />
                    {view === 'monthly' ? (<>
                      <Line type="monotone" dataKey="ยอดรวม" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="เงินสด" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="โอนเงิน" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
                    </>) : <Line type="monotone" dataKey="ยอดรวม" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ==================== TAB: สรุปบัญชี ==================== */}
      {tab === 'profit' && (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {[['monthly','📅 รายเดือน'],['yearly','📆 รายปี']].map(([v,l]) => (
                <button key={v} onClick={() => setProfitView(v)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${profitView === v ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>
                  {l}
                </button>
              ))}
            </div>
            {profitView === 'monthly' && (
              <select value={profitYear} onChange={e => setProfitYear(Number(e.target.value))}
                className="border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-300">
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>

          {profitView === 'monthly' && profitSummary && !profitLoading && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">ยอดขายรวม</p>
                <p className="text-xl font-bold text-sky-600 mt-1">฿{formatMoney(profitSummary.totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">ค่าใช้จ่ายรวม</p>
                <p className="text-xl font-bold text-red-500 mt-1">฿{formatMoney(profitSummary.totalExpense)}</p>
              </div>
              <div className={`rounded-2xl p-5 shadow-sm border ${profitSummary.totalProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <p className="text-xs text-slate-400 font-medium">{profitSummary.totalProfit >= 0 ? '✅ กำไรสุทธิ' : '❌ ขาดทุนสุทธิ'}</p>
                <p className={`text-xl font-bold mt-1 ${profitSummary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ฿{formatMoney(Math.abs(profitSummary.totalProfit))}
                </p>
              </div>
            </div>
          )}

          {profitView === 'yearly' && profitYearlySummary && !profitLoading && (
            <div className="space-y-3 mb-6">
              {profitYearlySummary.map(y => (
                <div key={y.year} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm font-bold text-slate-600 mb-3">ปี {y.year}</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div><p className="text-xs text-slate-400">ยอดขาย</p><p className="text-lg font-bold text-sky-600">฿{formatMoney(y.revenue)}</p></div>
                    <div><p className="text-xs text-slate-400">ค่าใช้จ่าย</p><p className="text-lg font-bold text-red-500">฿{formatMoney(y.expense)}</p></div>
                    <div>
                      <p className="text-xs text-slate-400">{y.profit >= 0 ? '✅ กำไร' : '❌ ขาดทุน'}</p>
                      <p className={`text-lg font-bold ${y.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>฿{formatMoney(Math.abs(y.profit))}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {profitLoading && <div className="flex items-center justify-center py-20 text-slate-400"><span className="animate-spin text-3xl mr-3">⏳</span>กำลังโหลด...</div>}
          {profitError && !profitLoading && <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 text-center">⚠️ {profitError}</div>}

          {!profitLoading && !profitError && profitChartData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-bold text-slate-700 mb-6">{profitView === 'monthly' ? `สรุปบัญชีรายเดือน ปี ${profitYear}` : 'สรุปบัญชีรายปี'}</h2>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={profitChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} /><Legend />
                  <Bar dataKey="ยอดขาย" fill="#38bdf8" radius={[6,6,0,0]} />
                  <Bar dataKey="ค่าใช้จ่าย" fill="#f87171" radius={[6,6,0,0]} />
                  <Bar dataKey="กำไร" fill="#34d399" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ==================== TAB: เทรนด์ ==================== */}
      {tab === 'trends' && (
        <>
          {/* Date Range Picker */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">ตั้งแต่</label>
              <input type="date" value={fromDate} max={toDate}
                onChange={e => setFromDate(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">ถึง</label>
              <input type="date" value={toDate} max={toLocalDateStr(today)}
                onChange={e => setToDate(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <button onClick={() => fetchTrends(fromDate, toDate)}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors">
              🔍 วิเคราะห์
            </button>
            {/* Shortcut buttons */}
            <div className="ml-auto flex gap-2">
              {[
                { label: '7 วัน', days: 7 },
                { label: '30 วัน', days: 30 },
                { label: '90 วัน', days: 90 },
              ].map(({ label, days }) => (
                <button key={days}
                  onClick={() => {
                    const f = toLocalDateStr(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
                    const t = toLocalDateStr(today)
                    setFromDate(f); setToDate(t)
                    fetchTrends(f, t)
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-sky-100 hover:text-sky-600 text-slate-500 rounded-lg transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>

          {trendsLoading && <div className="flex items-center justify-center py-20 text-slate-400"><span className="animate-spin text-3xl mr-3">⏳</span>กำลังวิเคราะห์...</div>}
          {trendsError && !trendsLoading && <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 text-center">⚠️ {trendsError}</div>}

          {!trendsLoading && !trendsError && trendsData && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">ยอดขายรวม</p>
                  <p className="text-2xl font-bold text-sky-600 mt-1">฿{formatMoney(trendsData.summary.totalRevenue)}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">จำนวนออเดอร์</p>
                  <p className="text-2xl font-bold text-slate-700 mt-1">{trendsData.summary.totalOrders} รายการ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* สินค้าขายดี Top 5 */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    🏆 สินค้าขายดี Top 5
                  </h2>
                  {trendsData.topProducts.length === 0 ? (
                    <p className="text-center text-slate-300 py-8">ไม่มีข้อมูล</p>
                  ) : (
                    <div className="space-y-4">
                      {trendsData.topProducts.map((p, i) => (
                        <div key={p.product_id}>
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-none
                              ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {i + 1}
                            </span>
                            <span className="text-base">{productIcons(p.product_name)}</span>
                            <span className="text-sm font-medium text-slate-700 flex-1 truncate">{p.product_name}</span>
                            <span className="text-sm font-bold text-slate-600 flex-none">{p.totalQty} ชิ้น</span>
                          </div>
                          <div className="ml-9 flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                              <div className="bg-sky-400 h-1.5 rounded-full transition-all"
                                style={{ width: `${(p.totalQty / maxQty) * 100}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 flex-none">฿{formatMoney(p.totalRevenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* วันขายดีสุด */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    📅 วันที่ขายดีที่สุด
                  </h2>
                  {trendsData.topDays.length === 0 ? (
                    <p className="text-center text-slate-300 py-8">ไม่มีข้อมูล</p>
                  ) : (
                    <div className="space-y-3">
                      {trendsData.topDays.map((d, i) => (
                        <div key={d.date} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-none
                            ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700">{d.dateLabel}</p>
                            <p className="text-xs text-slate-400">{d.totalOrders} ออเดอร์</p>
                          </div>
                          <p className="text-sm font-bold text-sky-600">฿{formatMoney(d.totalRevenue)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* เดือนขายดีสุด */}
                {trendsData.topMonths.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 lg:col-span-2">
                    <h2 className="font-bold text-slate-700 mb-4">📆 เดือนที่ขายดีที่สุด</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {trendsData.topMonths.map((m, i) => (
                        <div key={m.month} className={`rounded-xl p-4 border ${i === 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                              ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : 'bg-orange-300 text-white'}`}>
                              {i + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-700">{m.monthLabel}</span>
                          </div>
                          <p className="text-lg font-bold text-sky-600">฿{formatMoney(m.totalRevenue)}</p>
                          <p className="text-xs text-slate-400">{m.totalOrders} ออเดอร์</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </>
          )}
        </>
      )}

    </div>
  )
}
