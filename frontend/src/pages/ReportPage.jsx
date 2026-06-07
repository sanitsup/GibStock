import { useState, useEffect, useCallback, useRef } from 'react'
import { getProductIcon } from '../utils/productIcon'

const API_URL = import.meta.env.VITE_API_URL

function formatDateThai(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00+07:00')
  return d.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
  })
}

function formatMoney(num) {
  return Number(num || 0).toLocaleString('th-TH')
}

function SummaryCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-700">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Date Picker Bar ─────────────────────────────────────────
function DateBar({ selectedDate, today, onChange, onRefresh, refreshing }) {
  const goPrev = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    onChange(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }))
  }
  const goNext = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    const next = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    if (next <= today) onChange(next)
  }
  const isToday = selectedDate === today

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center gap-3">
      <button onClick={goPrev} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors text-lg">‹</button>
      <input
        type="date" value={selectedDate} max={today}
        onChange={e => onChange(e.target.value)}
        className="border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-300"
      />
      <button onClick={goNext} disabled={isToday} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors text-lg disabled:opacity-30">›</button>
      <span className="text-slate-500 text-sm font-medium">{formatDateThai(selectedDate)}</span>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={onRefresh} disabled={refreshing} className="flex items-center gap-1.5 text-xs bg-sky-100 text-sky-600 px-3 py-1.5 rounded-lg hover:bg-sky-200 transition-colors font-medium disabled:opacity-50">
          <span className={refreshing ? 'animate-spin inline-block' : ''}>🔄</span>
          {refreshing ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
        {!isToday && (
          <button onClick={() => onChange(today)} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium">
            กลับวันนี้
          </button>
        )}
      </div>
    </div>
  )
}

// ── Tab: รายงานยอดขาย ────────────────────────────────────────
function SalesReport({ data }) {
  return (
    <div className="space-y-6">
      {/* Card ยอดรวม */}
      <div className="grid grid-cols-1 gap-4">
        <SummaryCard
          icon="💰"
          label="ยอดรวมทั้งหมด"
          value={`฿${formatMoney(data.summary.cashTotal + data.summary.transferTotal)}`}
          sub={`เงินสด ฿${formatMoney(data.summary.cashTotal)}  +  โอน ฿${formatMoney(data.summary.transferTotal)}`}
          color="bg-emerald-50"
        />
      </div>
      {/* Cards ย่อย */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard icon="💵" label="เงินสด" value={`฿${formatMoney(data.summary.cashTotal)}`} sub={`${data.orders.filter(o => o.payment_method === 'cash').length} ออเดอร์`} color="bg-amber-50" />
        <SummaryCard icon="🏦" label="โอนเงิน" value={`฿${formatMoney(data.summary.transferTotal)}`} sub={`${data.orders.filter(o => o.payment_method === 'transfer').length} ออเดอร์`} color="bg-violet-50" />
        <SummaryCard icon="👕" label="จำนวนชิ้นที่ขาย" value={`${formatMoney(data.summary.totalQty)} ชิ้น`} sub={data.summary.freeItemsTotal > 0 ? `+${data.summary.freeItemsTotal} ชิ้นแถม` : 'ไม่มีของแถม'} color="bg-sky-50" />
        <SummaryCard icon="🧾" label="จำนวนออเดอร์" value={`${data.summary.totalOrders} ออเดอร์`} sub={`เฉลี่ย ฿${formatMoney(Math.round(data.summary.totalRevenue / data.summary.totalOrders))}/ออเดอร์`} color="bg-teal-50" />
        <SummaryCard icon="🎁" label="ของแถมที่ให้" value={`${data.summary.freeItemsTotal} ชิ้น`} sub="ซื้อ 10 แถม 1" color="bg-pink-50" />
      </div>

      {/* สรุปรายการสินค้า */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-700 text-lg">🏷️ สรุปรายการสินค้า</h2>
          <span className="text-sm text-slate-400">{data.productSummary.length} ประเภท</span>
        </div>
        <div className="divide-y divide-slate-50">
          {data.productSummary.map((p, i) => {
            const maxQty = data.productSummary[0]?.qty_sales || 1
            const pct = Math.round((p.qty_sales / maxQty) * 100)
            return (
              <div key={p.product_id} className="px-6 py-4 flex items-center gap-4">
                <span className="text-slate-300 text-sm w-5 text-right shrink-0">{i + 1}</span>
                <span className="text-2xl shrink-0">{getProductIcon(p.product_name)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-slate-700 truncate">{p.product_name}</p>
                    <p className="text-sm font-bold text-slate-600 ml-4 shrink-0">{p.qty_sales} ชิ้น</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-sky-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <p className="text-sm text-emerald-600 font-semibold w-24 text-right shrink-0">฿{formatMoney(p.subtotal)}</p>
              </div>
            )
          })}
        </div>
        {data.freeSummary && data.freeSummary.length > 0 && (
          <>
            <div className="px-6 py-3 bg-pink-50 border-t border-pink-100">
              <p className="text-sm font-semibold text-pink-500">🎁 ของแถม (ซื้อ 10 แถม 1)</p>
            </div>
            {data.freeSummary.map(p => (
              <div key={p.product_id} className="px-6 py-3 flex items-center gap-4 bg-pink-50/40">
                <span className="w-5 shrink-0" />
                <span className="text-2xl shrink-0">{getProductIcon(p.product_name)}</span>
                <p className="flex-1 font-medium text-slate-600 text-sm">{p.product_name}</p>
                <p className="text-sm text-pink-500 font-semibold w-24 text-right shrink-0">แถม {p.freeQty} ชิ้น</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ── Tab: รายการออเดอร์ ───────────────────────────────────────
function OrderList({ data }) {
  const [expandedOrder, setExpandedOrder] = useState(null)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-bold text-slate-700 text-lg">🧾 รายการออเดอร์</h2>
        <span className="text-sm text-slate-400">{data.orders.length} รายการ</span>
      </div>
      <div className="divide-y divide-slate-50">
        {data.orders.map(order => (
          <div key={order.order_id}>
            <button
              onClick={() => setExpandedOrder(expandedOrder === order.order_id ? null : order.order_id)}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-500 text-xs font-bold shrink-0">
                #{String(order.order_id).slice(-3)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-700">{order.total_qty} ชิ้น</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.payment_method === 'cash' ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'}`}>
                    {order.payment_method === 'cash' ? '💵 เงินสด' : '🏦 โอน'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{formatTime(order.date)}</p>
              </div>
              <p className="text-base font-bold text-emerald-600 shrink-0">฿{formatMoney(order.grand_total)}</p>
              <span className="text-slate-300 text-sm ml-1">{expandedOrder === order.order_id ? '▲' : '▼'}</span>
            </button>
            {expandedOrder === order.order_id && (
              <div className="px-6 pb-4 bg-slate-50 border-t border-slate-100">
                <div className="pt-3 space-y-2">
                  {order.details.filter(d => !d.free_itemtype).map(d => (
                    <div key={d.detail_id} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{getProductIcon(d.product_name)}</span>
                      <span className="flex-1 text-slate-600">{d.product_name || '—'}</span>
                      <span className="text-slate-400">x {d.qty_sales}</span>
                      <span className="text-slate-600 font-medium w-20 text-right">฿{formatMoney(d.subtotal)}</span>
                    </div>
                  ))}
                  {order.details.filter(d => d.free_itemtype).map(d => (
                    <div key={d.detail_id} className="flex items-center gap-3 text-sm bg-pink-50 rounded-lg px-2 py-1.5">
                      <span className="text-lg">🎁</span>
                      <span className="flex-1 text-pink-500">แถม: {d.free_item_name || d.product_name}</span>
                      <span className="text-pink-400 text-xs font-medium">ฟรี</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function ReportPage() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  const [selectedDate, setSelectedDate] = useState(today)
  const [activeTab, setActiveTab] = useState('sales') // 'sales' | 'orders'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const selectedDateRef = useRef(selectedDate)

  useEffect(() => { selectedDateRef.current = selectedDate }, [selectedDate])

  const fetchReport = useCallback(async (date, silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/reports/daily?date=${date}`)
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchReport(selectedDate) }, [selectedDate, fetchReport])

  // Real-time: ฟัง event จากหน้า POS
  useEffect(() => {
    const handleNewOrder = () => {
      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
      if (selectedDateRef.current === todayDate) fetchReport(todayDate, true)
    }
    window.addEventListener('gibstock:new-order', handleNewOrder)
    return () => window.removeEventListener('gibstock:new-order', handleNewOrder)
  }, [fetchReport])

  const handleDateChange = (date) => {
    setSelectedDate(date)
  }

  const isEmpty = !loading && !error && data && data.summary.totalOrders === 0

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-700">📊 รายงานยอดขาย</h1>
        <p className="text-slate-400 text-sm mt-1">สรุปยอดขายและรายการสินค้าประจำวัน</p>
      </div>

      {/* Date Bar */}
      <DateBar
        selectedDate={selectedDate}
        today={today}
        onChange={handleDateChange}
        onRefresh={() => fetchReport(selectedDate, true)}
        refreshing={refreshing}
      />

      {/* Tab Bar */}
      <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 w-fit">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'sales'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          📈 รายงานยอดขาย
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'orders'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          🧾 รายการออเดอร์
          {data && data.summary.totalOrders > 0 && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'orders' ? 'bg-white/20' : 'bg-sky-100 text-sky-600'}`}>
              {data.summary.totalOrders}
            </span>
          )}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="animate-spin text-3xl mr-3">⏳</div>
          <span className="text-lg">กำลังโหลดข้อมูล...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 text-center">
          ⚠️ {error}
          <button onClick={() => fetchReport(selectedDate)} className="ml-3 text-sm underline">ลองใหม่</button>
        </div>
      )}

      {/* No Data */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">🛍️</div>
          <p className="text-xl font-medium text-slate-400">ยังไม่มีการขายในวันนี้</p>
          <p className="text-sm text-slate-300 mt-1">ข้อมูลจะแสดงเมื่อมีรายการขาย</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && data.summary.totalOrders > 0 && (
        <>
          {activeTab === 'sales' && <SalesReport data={data} />}
          {activeTab === 'orders' && <OrderList data={data} />}
        </>
      )}

    </div>
  )
}
