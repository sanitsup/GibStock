import { useState, useEffect, useRef } from 'react'
import { getProducts, getStock, updateProductStatus } from '../services/api'
import CartPanel from '../components/CartPanel'
import { ShoppingBag, ShoppingCart, RefreshCw, Scissors } from 'lucide-react'
import { getProductIcon } from '../utils/productIcon'
import { useNavigate } from 'react-router-dom'

export default function POSPage() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingSlow, setLoadingSlow] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [discountModal, setDiscountModal] = useState(null)
  const navigate = useNavigate()
  const slowTimer = useRef(null)

  useEffect(() => { loadProducts() }, [])

  const loadProducts = async () => {
    setLoading(true)
    setLoadError(false)
    setLoadingSlow(false)
    slowTimer.current = setTimeout(() => setLoadingSlow(true), 5000)
    try {
      const [pRes, sRes] = await Promise.all([getProducts(), getStock()])
      clearTimeout(slowTimer.current)
      const stockMap = {}
      sRes.data.forEach(s => { stockMap[s.product_id] = s.remaining })
      const withStock = pRes.data.map(p => ({
        ...p,
        remaining: stockMap[p.product_id] ?? 0
      }))
      setProducts(withStock)
    } catch (err) {
      clearTimeout(slowTimer.current)
      console.error('โหลดสินค้าไม่สำเร็จ', err)
      setLoadError(true)
    } finally {
      clearTimeout(slowTimer.current)
      setLoading(false)
      setLoadingSlow(false)
    }
  }

  const addToCart = (product, customPrice = null) => {
    const price = customPrice !== null ? customPrice : product.price
    const cartKey = customPrice !== null
      ? `${product.product_id}_disc_${customPrice}`
      : String(product.product_id)

    const totalInCart = cart
      .filter(i => i.product_id === product.product_id)
      .reduce((sum, i) => sum + i.qty, 0)

    if (totalInCart >= product.remaining) {
      alert(`⚠️ สต็อก ${product.product_name} เหลือแค่ ${product.remaining} ชิ้น`)
      return
    }

    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey)
      if (existing) {
        return prev.map(i =>
          i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, {
        ...product,
        price: price,
        order_price: price,
        cartKey,
        isDiscounted: customPrice !== null,
        originalPrice: product.price,
        qty: 1
      }]
    })
  }

  const openDiscountModal = (e, product) => {
    e.stopPropagation()
    setDiscountModal({ product, customPrice: '' })
  }

  const confirmDiscount = () => {
    const price = Number(discountModal.customPrice)
    if (!price || price <= 0) {
      alert('กรุณากรอกราคาที่ถูกต้อง')
      return
    }
    if (price >= Number(discountModal.product.price)) {
      alert('ราคาลดต้องน้อยกว่าราคาปกติ')
      return
    }
    addToCart(discountModal.product, price)
    setDiscountModal(null)
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
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <RefreshCw size={32} className="animate-spin text-sky-400" />
        {loadingSlow ? (
          <div className="text-center px-8">
            <p className="text-slate-600 font-medium">กำลังเชื่อมต่อ กรุณารอสักครู่...</p>
            <p className="text-sm text-slate-400 mt-1">Server กำลัง wake up (~30-60 วินาที)</p>
          </div>
        ) : (
          <p>กำลังโหลดสินค้า...</p>
        )}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-slate-500 font-medium">เชื่อมต่อไม่สำเร็จ</p>
        <button
          onClick={loadProducts}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium text-sm transition-all"
        >
          <RefreshCw size={16} />
          ลองใหม่อีกครั้ง
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
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
                <div key={product.product_id} className="relative">
                  <button
                    onClick={() => addToCart(product)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-sky-100
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
                    {product.remaining <= 5 && (
                      <div className="text-xs text-red-400 font-medium mt-0.5">ใกล้หมด!</div>
                    )}
                  </button>

                  <button
                    onClick={(e) => openDiscountModal(e, product)}
                    title="ลดราคาสินค้าชำรุด"
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center
                               bg-orange-50 hover:bg-orange-100 text-orange-400 hover:text-orange-500
                               rounded-lg transition-all border border-orange-100"
                  >
                    <Scissors size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex">
        <CartPanel
          cart={cart}
          setCart={setCart}
          clearCart={clearCart}
          onOrderSuccess={() => { clearCart(); loadProducts() }}
        />
      </div>

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

      {cartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCartOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
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
              <button onClick={() => handleDialogAction('stock')}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-sm">
                🔄 เติมสต็อก
              </button>
              <button onClick={() => handleDialogAction('hidden')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-sm">
                🙈 ซ่อนสินค้า
              </button>
              <button onClick={() => handleDialogAction('inactive')}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl font-medium text-sm">
                🚫 ยกเลิกการขาย
              </button>
              <button onClick={() => setDialog(null)}
                className="w-full py-2 text-slate-400 text-sm hover:text-slate-600">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {discountModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-4xl text-center mb-2">
              {getProductIcon(discountModal.product.product_name)}
            </div>
            <h2 className="font-bold text-slate-700 text-center text-lg mb-1">
              {discountModal.product.product_name}
            </h2>
            <p className="text-center text-sm text-slate-400 mb-4">สินค้าชำรุด — กรอกราคาที่ต้องการขาย</p>

            <div className="bg-slate-50 rounded-xl px-4 py-2 mb-4 text-center">
              <span className="text-xs text-slate-400">ราคาปกติ </span>
              <span className="text-slate-500 font-semibold line-through">
                ฿{Number(discountModal.product.price).toLocaleString()}
              </span>
            </div>

            <div className="relative mb-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">฿</span>
              <input
                type="number"
                min="1"
                max={Number(discountModal.product.price) - 1}
                value={discountModal.customPrice}
                onChange={e => setDiscountModal(prev => ({ ...prev, customPrice: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && confirmDiscount()}
                placeholder="กรอกราคาใหม่"
                autoFocus
                className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-3
                           text-lg font-bold text-orange-500 focus:outline-none
                           focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDiscountModal(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDiscount}
                className="flex-1 py-3 bg-orange-400 hover:bg-orange-500 text-white rounded-xl font-bold text-sm"
              >
                เพิ่มลงตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
