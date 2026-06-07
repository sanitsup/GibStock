import { useState, useEffect } from 'react'
import { getProducts } from '../services/api'
import { Gift, X } from 'lucide-react'

export default function FreeItemModal({ freeQty, onConfirm, onClose }) {
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await getProducts()
      // กรองเฉพาะสินค้าราคา 100 บาทเท่านั้น
      setProducts(res.data.filter(p => Number(p.price) === 100))
    } catch (err) {
      console.error('โหลดสินค้าไม่สำเร็จ', err)
    } finally {
      setLoading(false)
    }
  }

  const addFreeItem = (item) => {
    if (totalSelected >= freeQty) return
    setSelected(prev => {
      const existing = prev.find(i => i.product_id === item.product_id)
      if (existing) {
        return prev.map(i =>
          i.product_id === item.product_id
            ? { ...i, qty: i.qty + 1 }
            : i
        )
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const removeFreeItem = (product_id) => {
    setSelected(prev =>
      prev
        .map(i => i.product_id === product_id ? { ...i, qty: i.qty - 1 } : i)
        .filter(i => i.qty > 0)
    )
  }

  const totalSelected = selected.reduce((sum, i) => sum + i.qty, 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sky-100">
          <div className="flex items-center gap-2">
            <Gift className="text-amber-500" size={22} />
            <div>
              <h2 className="font-bold text-slate-700">เลือกของแถม</h2>
              <p className="text-xs text-slate-400">
                เลือกได้ {freeQty} ชิ้น (เลือกแล้ว {totalSelected}/{freeQty})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* รายการสินค้า */}
        <div className="p-4 max-h-72 overflow-auto flex flex-col gap-2">
          {loading ? (
            <div className="text-center text-slate-400 py-8">กำลังโหลด...</div>
          ) : products.length === 0 ? (
            <div className="text-center text-slate-400 py-8">ไม่มีสินค้า</div>
          ) : (
            products.map(item => {
              const sel = selected.find(i => i.product_id === item.product_id)
              const selQty = sel ? sel.qty : 0
              return (
                <div key={item.product_id}
                  className="flex items-center justify-between bg-sky-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>👕</span>
                    <div className="text-sm font-medium text-slate-700">
                      {item.product_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selQty > 0 && (
                      <>
                        <button
                          onClick={() => removeFreeItem(item.product_id)}
                          className="w-7 h-7 rounded-full bg-sky-200 hover:bg-sky-300
                                     flex items-center justify-center text-sky-700 font-bold"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-bold text-slate-700 text-sm">
                          {selQty}
                        </span>
                      </>
                    )}
                    <button
                      onClick={() => addFreeItem(item)}
                      disabled={totalSelected >= freeQty}
                      className="w-7 h-7 rounded-full bg-sky-400 hover:bg-sky-500
                                 disabled:bg-slate-200 flex items-center justify-center
                                 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sky-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-200
                       text-slate-500 text-sm hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={totalSelected !== freeQty}
            className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-500
                       disabled:bg-slate-200 text-white disabled:text-slate-400
                       font-bold text-sm transition-all"
          >
            ยืนยันของแถม ({totalSelected}/{freeQty})
          </button>
        </div>
      </div>
    </div>
  )
}