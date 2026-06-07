import { useState, useEffect } from 'react'
import { getProducts, getStock, updateProductStatus } from '../services/api'
import CartPanel from '../components/CartPanel'
import { ShoppingBag } from 'lucide-react'
import { getProductIcon } from '../utils/productIcon'
import { useNavigate } from 'react-router-dom'

export default function POSPage() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { loadProducts() }, [])

  const loadProducts = async () => {
    try {
      const [pRes, sRes] = await Promise.all([getProducts(), getStock()])
      const stockMap = {}
      sRes.data.forEach(s => { stockMap[s.product_id] = s.remaining })
      const withStock = pRes.data.map(p => ({
        ...p,
        remaining: stockMap[p.product_id] ?? 0
      }))
      setProducts(withStock)
    } catch (err) {
      console.error('โหลดสินค้าไม่สำเร็จ', err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product) => {
    const inCart = cart.find(i => i.product_id === product.product_id)
    const currentQty = inCart ? inCart.qty : 0
    if (currentQty >= product.remaining) {
      alert(`⚠️ สต็อก ${product.product_name} เหลือแค่ ${product.remaining} ชิ้น`)
      return
    }
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.product_id)
      if (existing) {
        return prev.map(i =>
          i.product_id === product.product_id
            ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const handleDialogAction = async (action) => {
    const { product } = dialog
    setDialog(null)
    if (action === 'hidden') {
      await updateProductStatus(product.product_id, 'hidden')
      loadProducts()
    } else if (action === 'inactive') {
      await updateProductStatus(product.product_id, 'inactive')
      navigate('/stock?tab=inactive')
    } else if (action === 'stock') {
      navigate('/stock')
    }
  }

  const clearCart = () => setCart([])

  // โชว์เฉพาะสินค้าที่ active และ remaining > 0
  const activeProducts = products.filter(
    p => p.status !== 'hidden' && p.status !== 'inactive' && p.remaining > 0
  )

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400">กำลังโหลด...</div>
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4">
          <h1 className="text-2xl font-bold text-slate-700 flex items-center gap-2">
            <ShoppingBag className="text-sky-500" />
            ขายสินค้า
          </h1>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          {activeProducts.length === 0 ? (
            <div className="text-slate-400 text-center mt-20">ไม่มีสินค้าในสต็อก</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeProducts.map(product => (
                <button
                  key={product.product_id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-sky-100
                             hover:border-sky-300 hover:shadow-md transition-all text-left"
                >
                  <div className="text-3xl mb-2">{getProductIcon(product.product_name)}</div>
                  <div className="font-semibold text-slate-700 text-sm">{product.product_name}</div>
                  <div className="text-sky-500 font-bold mt-1">
                    ฿{Number(product.price).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    เหลือ {product.remaining} ชิ้น
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <CartPanel
        cart={cart}
        setCart={setCart}
        clearCart={clearCart}
        onOrderSuccess={() => { clearCart(); loadProducts() }}
      />

      {/* Dialog สินค้าหมด */}
      {dialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-4xl text-center mb-3">
              {getProductIcon(dialog.product.product_name)}
            </div>
            <h2 className="font-bold text-slate-700 text-center text-lg mb-1">
              {dialog.product.product_name}
            </h2>
            <p className="text-slate-400 text-center text-sm mb-5">
              สินค้าหมดสต็อก กรุณาเลือกการดำเนินการ
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDialogAction('stock')}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600
                           text-white rounded-xl font-bold text-sm"
              >
                🔄 เติมสต็อก
              </button>
              <button
                onClick={() => handleDialogAction('hidden')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200
                           text-slate-600 rounded-xl font-medium text-sm"
              >
                🙈 ซ่อนสินค้า
              </button>
              <button
                onClick={() => handleDialogAction('inactive')}
                className="w-full py-3 bg-red-50 hover:bg-red-100
                           text-red-500 rounded-xl font-medium text-sm"
              >
                🚫 ยกเลิกการขาย
              </button>
              <button
                onClick={() => setDialog(null)}
                className="w-full py-2 text-slate-400 text-sm hover:text-slate-600"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}