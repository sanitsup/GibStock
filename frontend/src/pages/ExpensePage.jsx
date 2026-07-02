import { useState, useEffect, useCallback } from 'react'
import { Trash2, Plus, RefreshCw, ChevronLeft, ChevronRight, Receipt, TrendingDown, FileText, Pencil, X } from 'lucide-react'

const API = import.meta.env.VITE_API_URL

function formatDateThai(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTimeThai(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function toLocalDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDatetimeLocalStr(datetimeStr) {
  const d = new Date(datetimeStr)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${day}T${h}:${mi}`
}

export default function ExpensePage() {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(today))
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [editingExpense, setEditingExpense] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDatetime, setEditDatetime] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/expenses?date=${selectedDate}`)
      const data = await res.json()
      setExpenses(Array.isArray(data) ? data : [])
    } catch (err) {
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  function changeDate(delta) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(toLocalDateStr(d))
  }

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  async function handleSubmit() {
    setFormError('')
    setSuccessMsg('')
    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setFormError('กรุณากรอกจำนวนเงินที่ถูกต้อง')
      return
    }
    if (!description.trim()) {
      setFormError('กรุณากรอกรายละเอียดค่าใช้จ่าย')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, description: description.trim() }),
      })
      if (!res.ok) throw new Error()
      setAmount('')
      setDescription('')
      setSuccessMsg('✅ บันทึกค่าใช้จ่ายเรียบร้อยแล้ว')
      setTimeout(() => setSuccessMsg(''), 3000)
      if (selectedDate === toLocalDateStr(new Date())) fetchExpenses()
    } catch {
      setFormError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('ต้องการลบรายการนี้ใช่ไหม?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`${API}/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setExpenses((prev) => prev.filter((e) => e.expense_id !== id))
    } catch {
      alert('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeletingId(null)
    }
  }

  function openEdit(expense) {
    setEditingExpense(expense)
    setEditAmount(String(expense.amount))
    setEditDescription(expense.description)
    setEditDatetime(expense.datetime ? toDatetimeLocalStr(expense.datetime) : toDatetimeLocalStr(new Date().toISOString()))
    setEditError('')
  }

  function closeEdit() {
    setEditingExpense(null)
    setEditError('')
  }

  async function handleEditSubmit() {
    setEditError('')
    const numAmount = parseFloat(editAmount)
    if (!editAmount || isNaN(numAmount) || numAmount <= 0) {
      setEditError('กรุณากรอกจำนวนเงินที่ถูกต้อง')
      return
    }
    if (!editDescription.trim()) {
      setEditError('กรุณากรอกรายละเอียดค่าใช้จ่าย')
      return
    }
    setEditSubmitting(true)
    try {
      const datetimeWithTz = editDatetime + ':00+07:00'
      const res = await fetch(`${API}/api/expenses/${editingExpense.expense_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          description: editDescription.trim(),
          datetime: datetimeWithTz
        }),
      })
      if (!res.ok) throw new Error()
      closeEdit()
      fetchExpenses()
    } catch {
      setEditError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setEditSubmitting(false)
    }
  }

  const isToday = selectedDate === toLocalDateStr(today)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Pencil size={16} className="text-sky-500" />
                แก้ไขค่าใช้จ่าย
              </h2>
              <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">จำนวนเงิน (บาท)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                  <input type="number" min="0" step="0.01"
                    value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">รายละเอียด</label>
                <input type="text"
                  value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">วันที่และเวลา</label>
                <input type="datetime-local"
                  value={editDatetime} onChange={(e) => setEditDatetime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
            </div>
            {editError && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">⚠️ {editError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={closeEdit}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={handleEditSubmit} disabled={editSubmitting}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                {editSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Pencil size={14} />}
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
          <Receipt size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ค่าใช้จ่าย</h1>
          <p className="text-sm text-slate-500">บันทึกและดูรายการค่าใช้จ่าย</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Plus size={16} className="text-sky-500" />
          บันทึกค่าใช้จ่ายใหม่
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-none w-full sm:w-40">
            <label className="block text-xs font-medium text-slate-500 mb-1">จำนวนเงิน (บาท)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">รายละเอียด</label>
            <input type="text" placeholder="เช่น ค่าน้ำ, ค่าไฟ, ค่าถุงพลาสติก..."
              value={description} onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
          </div>
          <div className="flex-none self-end">
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              บันทึก
            </button>
          </div>
        </div>
        {formError && <p className="mt-3 text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">⚠️ {formError}</p>}
        {successMsg && <p className="mt-3 text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg">{successMsg}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-2 flex-1">
          <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 text-center">
            <input type="date" value={selectedDate} max={toLocalDateStr(today)}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-medium text-slate-700 border-none outline-none cursor-pointer bg-transparent" />
            {isToday && <span className="ml-2 text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full font-medium">วันนี้</span>}
          </div>
          <button onClick={() => changeDate(1)} disabled={isToday}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
          <button onClick={fetchExpenses} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 ml-1">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3 sm:min-w-52">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-none">
            <TrendingDown size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">รวมค่าใช้จ่าย</p>
            <p className="text-xl font-bold text-red-500">฿{totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <FileText size={15} className="text-sky-400" />
            รายการค่าใช้จ่าย
          </h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{expenses.length} รายการ</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            <span className="text-sm">กำลังโหลด...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <Receipt size={40} className="mb-3" />
            <p className="text-sm font-medium text-slate-400">ไม่มีค่าใช้จ่ายในวันนี้</p>
            <p className="text-xs text-slate-300 mt-1">{formatDateThai(selectedDate + 'T00:00:00')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {expenses.map((expense) => (
              <li key={expense.expense_id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-none">
                  <span className="text-base">💸</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{expense.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{expense.datetime ? formatTimeThai(expense.datetime) : '—'}</p>
                </div>
                <p className="text-sm font-bold text-red-500 flex-none">
                  −฿{Number(expense.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(expense)}
                    className="p-1.5 rounded-lg text-sky-400 hover:text-sky-600 hover:bg-sky-100 transition-all">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(expense.expense_id)} disabled={deletingId === expense.expense_id}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-all disabled:opacity-50">
                    {deletingId === expense.expense_id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
