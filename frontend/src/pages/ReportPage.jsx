import { useState, useEffect, useCallback, useRef } from 'react'
import { getProductIcon } from '../utils/productIcon'
import { getOrderDetail, updateOrder, deleteOrder, getStock, getProducts } from '../services/api'

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

// ── Edit Order Modal ─────────────────────────────────────────
function EditOrderModal({ orderId, onClose, onSaved }) {
  const [order, setOrder] = useState(null)
  const [details, setDetails] = useState([])
  const [products, setProducts] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [detailRes, productRes, stockRes] = await Promise.all([
          getOrderDetail(orderId),
          getProducts(),
          getStock()
        ])
        const { order, details } = detailRes.data
        setOrder(order)
        setPaymentMethod(order.payment_method)
        const normalDetails = details
          .filter(d => !d.free_itemtype)
          .map(d => ({
            product_id_ref: d.product_id_ref,
            product_name: d.product_type?.product_name || '',
            order_price: Number(d.order_price),
            qty_sales: d.qty_sales,
            free_itemtype: false
          }))
        setDetails(normalDetails)
        setProducts(productRes.data.filter(p => p.status === 'active' && Number(p.price) === 100))
        const sm = {}
        stockRes.data.forEach(s => { sm[s.product_id] = s.remaining })
        setStockMap(sm)
      } catch (e) {
        setError('โหลดข้อมูลไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId])

  const updateQty = (idx, qty) => {
    if (qty < 1) return
    setDetails(prev => prev.map((d, i) => i === idx ? { ...d, qty_sales: qty } : d))
  }

  const removeItem = (idx) => {
    setDetails(prev => prev.filter((_, i) => i !== idx))
  }

  const addItem = (product) => {
    const existing = details.find(d => d.product_id_ref === product.product_id)
    if (existing) {
      setDetails(prev => prev.map(d =>
        d.product_id_ref === product.product_id
          ? { ...d, qty_sales: d.qty_sales + 1 }
          : d
      ))
    } else {
      setDetails(prev => [...prev, {
        product_id_ref: product.product_id,
        product_name: product.product_name,
        order_price: Number(product.price),
        qty_sales: 1,
        free_itemtype: false
      }])
    }
  }

  // คำนวณ preview โปรโมชัน
  const promoQty = details.filter(d => Number(d.order_price) === 100).reduce((s, d) => s + d.qty_sales, 0)
  const freeQty = Math.floor(promoQty / 10)
  const grandTotal = details.reduce((s, d) => s + (Number(d.order_price) * d.qty_sales), 0)

  const handleSave = async () => {
    if (details.length === 0) { setError('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ'); return }
    setSaving(true)
    setError(null)
    try {
      await updateOrder(orderId, { items: details, payment_method: paymentMethod })
      onSaved()
    } catch (e) {
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-700 text-lg">✏️ แก้ไข Order #{orderId}</h2>
            <p className="text-xs text-slate-400 mt-0.5">แก้ไขรายการสินค้าในออเดอร์นี้</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <span className="animate-spin text-2xl mr-2">⏳</span> กำลังโหลด...
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-6 space-y-5">

            {/* วิธีชำระ */}
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">💳 วิธีชำระเงิน</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${paymentMethod === 'cash' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >💵 เงินสด</button>
                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${paymentMethod === 'transfer' ? 'bg-violet-100 border-violet-300 text-violet-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >🏦 โอนเงิน</button>
              </div>
            </div>

            {/* รายการสินค้าปัจจุบัน */}
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">📦 รายการสินค้า</p>
              {details.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">ยังไม่มีสินค้า — เพิ่มจากด้านล่าง</p>
              ) : (
                <div className="space-y-2">
                  {details.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                      <span className="text-xl">{getProductIcon(d.product_name)}</span>
                      <span className="flex-1 text-sm font-medium text-slate-700">{d.product_name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(idx, d.qty_sales - 1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 text-sm font-bold">−</button>
                        <input
                          type="number" min="1" value={d.qty_sales}
                          onChange={e => updateQty(idx, parseInt(e.target.value) || 1)}
                          className="w-12 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-sky-300"
                        />
                        <button onClick={() => updateQty(idx, d.qty_sales + 1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 text-sm font-bold">+</button>
                      </div>
                      <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center text-sm transition-colors">🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* เพิ่มสินค้า */}
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">➕ เพิ่มสินค้า</p>
              <div className="grid grid-cols-2 gap-2">
                {products.map(p => (
                  <button key={p.product_id} onClick={() => addItem(p)}
                    className="flex items-center gap-2 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl px-3 py-2.5 text-sm transition-colors text-left">
                    <span className="text-lg">{getProductIcon(p.product_name)}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700 truncate">{p.product_name}</p>
                      <p className="text-xs text-slate-400">คงเหลือ {stockMap[p.product_id] ?? '—'} ชิ้น</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* สรุปยอด */}
            <div className="bg-sky-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>จำนวนสินค้า</span>
                <span className="font-medium">{details.reduce((s, d) => s + d.qty_sales, 0)} ชิ้น</span>
              </div>
              {freeQty > 0 && (
                <div className="flex justify-between text-pink-500">
                  <span>🎁 ของแถม (10 แถม 1)</span>
                  <span className="font-medium">{freeQty} ชิ้น</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-bold text-base pt-1 border-t border-sky-100">
                <span>ยอดชำระ</span>
                <span className="text-emerald-600">฿{formatMoney(grandTotal)}</span>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2">{error}</p>}
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving || details.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold transition-colors disabled:opacity-50">
              {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกการแก้ไข'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab: รายงานยอดขาย ────────────────────────────────────────
function SalesReport({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <SummaryCard
          icon="💰"
          label="ยอดรวมทั้งหมด"
          value={`฿${formatMoney(data.summary.cashTotal + data.summary.transferTotal)}`}
          sub={`เงินสด ฿${formatMoney(data.summary.cashTotal)}  +  โอน ฿${formatMoney(data.summary.transferTotal)}`}
          color="bg-emerald-50"
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard icon="💵" label="เงินสด" value={`฿${formatMoney(data.summary.cashTotal)}`} sub={`${data.orders.filter(o => o.payment_method === 'cash').length} ออเดอร์`} color="bg-amber-50" />
        <SummaryCard icon="🏦" label="โอนเงิน" value={`฿${formatMoney(data.summary.transferTotal)}`} sub={`${data.orders.filter(o => o.payment_method === 'transfer').length} ออเดอร์`} color="bg-violet-50" />
        <SummaryCard icon="👕" label="จำนวนชิ้นที่ขาย" value={`${formatMoney(data.summary.totalQty)} ชิ้น`} sub={data.summary.freeItemsTotal > 0 ? `+${data.summary.freeItemsTotal} ชิ้นแถม` : 'ไม่มีของแถม'} color="bg-sky-50" />
        <SummaryCard icon="🧾" label="จำนวนออเดอร์" value={`${data.summary.totalOrders} ออเดอร์`} sub={`เฉลี่ย ฿${formatMoney(Math.round(data.summary.totalRevenue / data.summary.totalOrders))}/ออเดอร์`} color="bg-teal-50" />
        <SummaryCard icon="🎁" label="ของแถมที่ให้" value={`${data.summary.freeItemsTotal} ชิ้น`} sub="ซื้อ 10 แถม 1" color="bg-pink-50" />
      </div>
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
function OrderList({ data, onEdit, onDelete }) {
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
            {/* หัวออเดอร์ */}
            <div className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors gap-2">
              {/* กดขยาย */}
              <button
                onClick={() => setExpandedOrder(expandedOrder === order.order_id ? null : order.order_id)}
                className="flex items-center gap-3 flex-1 text-left min-w-0"
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
              {/* ปุ่มแก้ไข / ลบ */}
              <div className="flex gap-1.5 shrink-0 ml-1">
                <button
                  onClick={() => onEdit(order.order_id)}
                  className="w-8 h-8 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-500 flex items-center justify-center text-sm transition-colors"
                  title="แก้ไขออเดอร์"
                >✏️</button>
                <button
                  onClick={() => onDelete(order.order_id)}
                  className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center text-sm transition-colors"
                  title="ลบออเดอร์"
                >🗑️</button>
              </div>
            </div>

            {/* รายละเอียดเมื่อขยาย */}
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

// ── Confirm Delete Modal ─────────────────────────────────────
function ConfirmDeleteModal({ orderId, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="text-5xl mb-3">🗑️</div>
        <h2 className="text-lg font-bold text-slate-700 mb-1">ลบ Order #{orderId}?</h2>
        <p className="text-sm text-slate-400 mb-6">ยอดขายและสต็อกจะถูกปรับให้ถูกต้องอัตโนมัติ<br/>การกระทำนี้ไม่สามารถยกเลิกได้</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={deleting} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50">ยกเลิก</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50">
            {deleting ? '⏳ กำลังลบ...' : '✅ ยืนยันลบ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function ReportPage() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  const [selectedDate, setSelectedDate] = useState(today)
  const [activeTab, setActiveTab] = useState('sales')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const selectedDateRef = useRef(selectedDate)

  // Modal states
  const [editOrderId, setEditOrderId] = useState(null)
  const [deleteOrderId, setDeleteOrderId] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  useEffect(() => {
    const handleNewOrder = () => {
      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
      if (selectedDateRef.current === todayDate) fetchReport(todayDate, true)
    }
    window.addEventListener('gibstock:new-order', handleNewOrder)
    return () => window.removeEventListener('gibstock:new-order', handleNewOrder)
  }, [fetchReport])

  const handleEditSaved = () => {
    setEditOrderId(null)
    fetchReport(selectedDate, true)
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      await deleteOrder(deleteOrderId)
      setDeleteOrderId(null)
      fetchReport(selectedDate, true)
    } catch (e) {
      alert('ลบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setDeleting(false)
    }
  }

  const isEmpty = !loading && !error && data && data.summary.totalOrders === 0

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-700">📊 รายงานยอดขาย</h1>
        <p className="text-slate-400 text-sm mt-1">สรุปยอดขายและรายการสินค้าประจำวัน</p>
      </div>

      <DateBar
        selectedDate={selectedDate}
        today={today}
        onChange={setSelectedDate}
        onRefresh={() => fetchReport(selectedDate, true)}
        refreshing={refreshing}
      />

      <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 w-fit">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'sales' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >📈 รายงานยอดขาย</button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'orders' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          🧾 รายการออเดอร์
          {data && data.summary.totalOrders > 0 && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'orders' ? 'bg-white/20' : 'bg-sky-100 text-sky-600'}`}>
              {data.summary.totalOrders}
            </span>
          )}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="animate-spin text-3xl mr-3">⏳</div>
          <span className="text-lg">กำลังโหลดข้อมูล...</span>
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 text-center">
          ⚠️ {error}
          <button onClick={() => fetchReport(selectedDate)} className="ml-3 text-sm underline">ลองใหม่</button>
        </div>
      )}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">🛍️</div>
          <p className="text-xl font-medium text-slate-400">ยังไม่มีการขายในวันนี้</p>
          <p className="text-sm text-slate-300 mt-1">ข้อมูลจะแสดงเมื่อมีรายการขาย</p>
        </div>
      )}
      {!loading && !error && data && data.summary.totalOrders > 0 && (
        <>
          {activeTab === 'sales' && <SalesReport data={data} />}
          {activeTab === 'orders' && (
            <OrderList
              data={data}
              onEdit={setEditOrderId}
              onDelete={setDeleteOrderId}
            />
          )}
        </>
      )}

      {/* Edit Modal */}
      {editOrderId && (
        <EditOrderModal
          orderId={editOrderId}
          onClose={() => setEditOrderId(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* Confirm Delete Modal */}
      {deleteOrderId && (
        <ConfirmDeleteModal
          orderId={deleteOrderId}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteOrderId(null)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
