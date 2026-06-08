import { useState, useEffect } from 'react'
import { getProducts, getStock, updateProductStatus } from '../services/api'
import CartPanel from '../components/CartPanel'
import { ShoppingBag, ShoppingCart } from 'lucide-react'
import { getProductIcon } from '../utils/productIcon'
import { useNavigate } from 'react-router-dom'

export default function POSPage() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
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

  const totalCartQty = cart.reduce((sum, i) => sum + i.qty, 0)

  const activeProducts = products.filter(
    p => p.status !== 'hidden' && p.status !== 'inactive' && p.remaining > 0
  )

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400">กำลังโหลด...</div>
  }

  return (
    <div className="flex h-screen">
      {/* ฝั่งสินค้า */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 md:p-6 pb-4">
          <h1 className="text-xl md:text-2xl font-bold text-slate-700 flex items-center gap-2">
            <ShoppingBag className="text-sky-500" />
            ขายสินค้า
          </h1>
        </div>

        <div className="flex-1 overflow-auto px-4 md:px-6 pb-24 md:pb-6">
          {activeProducts.length === 0 ? (
            <div className="text-slate-400 text-center mt-20">ไม่มีสินค้าในสต็อก</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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

      {/* CartPanel — desktop: sidebar, mobile: hidden */}
      <div className="hidden md:flex">
        <CartPanel
          cart={cart}
          setCart={setCart}
          clearCart={clearCart}
          onOrderSuccess={() => { clearCart(); loadProducts() }}
        />
      </div>

      {/* ปุ่มตะกร้าลอย — mobile only */}
      <button
        onClick={() => setCartOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 bg-sky-500 hover:bg-sky-600
                   text-white rounded-full w-16 h-16 shadow-xl flex items-center
                   justify-center transition-all"
      >
        <ShoppingCart size={26} />
        {totalCartQty > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs
                           font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalCartQty}
          </span>
        )}
      </button>

      {/* Drawer ตะกร้า — mobile only */}
      {cartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCartOpen(false)}
          />
          {/* Drawer */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <CartPanel
              cart={cart}
              setCart={setCart}
              clearCart={clearCart}
              onOrderSuccess={() => {
                clearCart()
                loadProducts()
                setCartOpen(false)
              }}
              onClose={() => setCartOpen(false)}
              isMobile={true}
            />
          </div>
        </div>
      )}

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
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-sm"
              >
                🔄 เติมสต็อก
              </button>
              <button
                onClick={() => handleDialogAction('hidden')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-sm"
              >
                🙈 ซ่อนสินค้า
              </button>
              <button
                onClick={() => handleDialogAction('inactive')}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl font-medium text-sm"
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
