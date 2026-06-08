import { useState } from 'react'
import { Trash2, Plus, Minus, ShoppingCart, X } from 'lucide-react'
import { createOrder } from '../services/api'
import { getProductIcon } from '../utils/productIcon'
import FreeItemModal from './FreeItemModal'

const calcPromotion = (cart) => {
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0)
  const promoQty = cart
    .filter(i => Number(i.price) === 100)
    .reduce((sum, i) => sum + i.qty, 0)
  const freeQty = Math.floor(promoQty / 10)
  const grandTotal = cart.reduce((sum, i) => sum + (Number(i.price) * i.qty), 0)
  return { totalQty, promoQty, freeQty, grandTotal }
}

export default function CartPanel({ cart, setCart, clearCart, onOrderSuccess, onClose, isMobile }) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showFreeModal, setShowFreeModal] = useState(false)
  const [freeItems, setFreeItems] = useState([])

  const { totalQty, promoQty, freeQty, grandTotal } = calcPromotion(cart)

  const updateQty = (product_id, delta) => {
    setCart(prev =>
      prev
        .map(i => i.product_id === product_id ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    )
    setFreeItems([])
  }

  const handleFreeConfirm = (selected) => {
    setFreeItems(selected)
    setShowFreeModal(false)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (freeQty > 0 && freeItems.length === 0) {
      setShowFreeModal(true)
      return
    }
    setLoading(true)
    try {
      const payload = {
        payment_method: paymentMethod,
        items: [
          ...cart.map(i => ({
            product_id_ref: i.product_id,
            product_name: i.product_name,
            order_price: i.price,
            qty_sales: i.qty
          })),
          ...freeItems.map(i => ({
            product_id_ref: i.product_id,
            product_name: i.product_name,
            order_price: 0,
            qty_sales: i.qty,
            free_itemtype: true
          }))
        ]
      }
      console.log('payload ที่ส่ง:', JSON.stringify(payload, null, 2))
      await createOrder(payload)
      setSuccessMsg(`✅ บันทึกการขายสำเร็จ! ยอด ฿${grandTotal.toLocaleString()}`)
      setFreeItems([])
      onOrderSuccess()
      window.dispatchEvent(new CustomEvent("gibstock:new-order"))
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showFreeModal && (
        <FreeItemModal
          freeQty={freeQty}
          onConfirm={handleFreeConfirm}
          onClose={() => setShowFreeModal(false)}
        />
      )}

      <div className={`bg-white flex flex-col ${isMobile ? 'w-full max-h-[85vh]' : 'w-80 border-l border-sky-100 h-screen'}`}>
        {/* Header */}
        <div className="p-4 border-b border-sky-100 flex items-center gap-2">
          <ShoppingCart className="text-sky-500" size={20} />
          <h2 className="font-bold text-slate-700">ตะกร้าสินค้า</h2>
          {cart.length > 0 && (
            <button
              onClick={() => { clearCart(); setFreeItems([]) }}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          )}
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className={`${cart.length > 0 ? 'ml-2' : 'ml-auto'} text-slate-400 hover:text-slate-600`}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* รายการในตะกร้า */}
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
          {cart.length === 0 ? (
            <div className="text-slate-300 text-center mt-20 text-sm">
              กดเลือกสินค้าเพื่อเพิ่มลงตะกร้า
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id}
                className="flex items-center gap-3 bg-sky-50 rounded-xl p-3">
                <span className="text-xl">{getProductIcon(item.product_name)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {item.product_name}
                  </div>
                  <div className="text-sky-500 text-sm font-bold">
                    ฿{(item.qty * item.price).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.product_id, -1)}
                    className="w-6 h-6 rounded-full bg-sky-200 hover:bg-sky-300
                               flex items-center justify-center text-sky-700"
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={e => {
                      const val = parseInt(e.target.value)
                      if (!val || val < 1) return
                      setCart(prev =>
                        prev.map(i =>
                          i.product_id === item.product_id ? { ...i, qty: val } : i
                        )
                      )
                      setFreeItems([])
                    }}
                    className="w-10 text-center text-sm font-bold text-slate-700
                              border border-sky-200 rounded-lg focus:outline-none
                              focus:border-sky-400 bg-white"
                  />
                  <button
                    onClick={() => updateQty(item.product_id, 1)}
                    className="w-6 h-6 rounded-full bg-sky-200 hover:bg-sky-300
                               flex items-center justify-center text-sky-700"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* สรุปยอด */}
        <div className="p-4 border-t border-sky-100 flex flex-col gap-3">
          {freeQty > 0 && (
            <div
              onClick={() => setShowFreeModal(true)}
              className={`cursor-pointer border rounded-xl p-3 text-sm transition-all
                ${freeItems.length > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200 animate-pulse'
                }`}
            >
              {freeItems.length > 0 ? (
                <div>
                  <div className="font-bold text-amber-600 mb-1">
                    🎁 ของแถม {freeQty} ชิ้น (กดเพื่อเปลี่ยน)
                  </div>
                  {freeItems.map(i => (
                    <div key={i.product_id} className="text-amber-500 text-xs">
                      • {i.product_name} x{i.qty}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="font-bold text-red-500">
                  🎁 แถมฟรี {freeQty} ชิ้น! (ซื้อสินค้า ฿100 ครบ {promoQty} ชิ้น)
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between text-sm text-slate-500">
            <span>จำนวนสินค้า</span>
            <span className="font-medium text-slate-700">{totalQty} ชิ้น</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span className="text-slate-700">ยอดชำระ</span>
            <span className="text-sky-600">฿{grandTotal.toLocaleString()}</span>
          </div>

          <div className="flex gap-2">
            {['cash', 'transfer'].map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all
                  ${paymentMethod === method
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300'
                  }`}
              >
                {method === 'cash' ? '💵 เงินสด' : '🏦 โอน'}
              </button>
            ))}
          </div>

          {successMsg ? (
            <div className="bg-green-50 border border-green-200 text-green-600
                            rounded-xl p-3 text-sm text-center font-medium">
              {successMsg}
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || loading}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200
                         text-white disabled:text-slate-400 rounded-xl font-bold
                         transition-all text-sm"
            >
              {loading ? 'กำลังบันทึก...'
                : freeQty > 0 && freeItems.length === 0
                ? '🎁 เลือกของแถมก่อนชำระเงิน'
                : '✅ ยืนยันการขาย'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
