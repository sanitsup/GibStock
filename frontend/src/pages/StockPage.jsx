import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getProducts, addProduct, updateProduct, deleteProduct,
  getStock, addStock, getStockHistory, updateProductStatus
} from '../services/api'
import { Package, Plus, Pencil, Trash2, History, RotateCcw } from 'lucide-react'
import { getProductIcon } from '../utils/productIcon'

export default function StockPage() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'stock')
  const [products, setProducts] = useState([])
  const [stock, setStock] = useState([])
  const [history, setHistory] = useState([])
  const [inactiveProducts, setInactiveProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({ product_name: '', price: '' })

  const [showStockForm, setShowStockForm] = useState(false)
  const [stockForm, setStockForm] = useState({ product_id: '', qty_added: '' })

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [pRes, sRes, hRes] = await Promise.all([
        getProducts(), getStock(), getStockHistory()
      ])
      const active = pRes.data.filter(p => p.status !== 'inactive')
      const inactive = pRes.data.filter(p => p.status === 'inactive')
      setProducts(active)
      setInactiveProducts(inactive)
      setStock(sRes.data)
      setHistory(hRes.data)
    } catch (err) {
      console.error('โหลดข้อมูลไม่สำเร็จ', err)
    } finally {
      setLoading(false)
    }
  }

  const openAddProduct = () => {
    setEditingProduct(null)
    setProductForm({ product_name: '', price: '' })
    setShowProductForm(true)
  }

  const openEditProduct = (product) => {
    setEditingProduct(product)
    setProductForm({ product_name: product.product_name, price: product.price })
    setShowProductForm(true)
  }

  const handleSaveProduct = async () => {
    if (!productForm.product_name || !productForm.price) return
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.product_id, {
          product_name: productForm.product_name,
          price: Number(productForm.price)
        })
      } else {
        await addProduct({
          product_name: productForm.product_name,
          price: Number(productForm.price)
        })
      }
      setShowProductForm(false)
      loadAll()
    } catch (err) {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  const handleDeleteProduct = async (id) => {
    if (!confirm('ต้องการลบสินค้านี้ใช่ไหม? ประวัติการขายจะถูกลบด้วย')) return
    try {
      await deleteProduct(id)
      loadAll()
    } catch (err) {
      alert('ลบไม่สำเร็จ')
    }
  }

  const handleReactivate = async (id) => {
    await updateProductStatus(id, 'active')
    loadAll()
  }

  const handleAddStock = async () => {
    if (!stockForm.product_id || !stockForm.qty_added) return
    try {
      await addStock({
        product_id: Number(stockForm.product_id),
        qty_added: Number(stockForm.qty_added)
      })
      setShowStockForm(false)
      setStockForm({ product_id: '', qty_added: '' })
      loadAll()
    } catch (err) {
      alert('เติมสต็อกไม่สำเร็จ')
    }
  }

  const getRemaining = (product_id) => {
    const s = stock.find(s => s.product_id === product_id)
    return s ? s.remaining : 0
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400">กำลังโหลด...</div>
  }

  const tabs = [
    { key: 'stock', label: '📦 จัดการสต็อก' },
    { key: 'inactive', label: `🚫 ไม่ขายแล้ว${inactiveProducts.length > 0 ? ` (${inactiveProducts.length})` : ''}` },
    { key: 'history', label: '🕐 ประวัติ' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-700 mb-4 flex items-center gap-2">
        <Package className="text-sky-500" />
        จัดการสต็อก
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-sky-100 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all
              ${activeTab === tab.key
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: จัดการสต็อก */}
      {activeTab === 'stock' && (
        <>
          {/* ประเภทสินค้า */}
          <div className="bg-white rounded-2xl shadow-sm border border-sky-100 mb-6">
            <div className="flex items-center justify-between p-5 border-b border-sky-100">
              <h2 className="font-bold text-slate-700">ประเภทสินค้า</h2>
              <button
                onClick={openAddProduct}
                className="flex items-center gap-1 px-4 py-2 bg-sky-500 hover:bg-sky-600
                           text-white rounded-xl text-sm font-medium transition-all"
              >
                <Plus size={16} />เพิ่มสินค้า
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {products.length === 0 ? (
                <div className="text-center text-slate-300 py-8">ยังไม่มีสินค้า</div>
              ) : (
                products.map(product => (
                  <div key={product.product_id}
                    className="flex items-center justify-between bg-sky-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getProductIcon(product.product_name)}</span>
                      <div>
                        <div className="font-medium text-slate-700">{product.product_name}</div>
                        <div className="text-sm text-sky-500 font-bold">
                          ฿{Number(product.price).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">คงเหลือ</div>
                        <div className={`font-bold text-sm
                          ${getRemaining(product.product_id) <= 0
                            ? 'text-red-600'
                            : getRemaining(product.product_id) <= 5
                            ? 'text-red-500' : 'text-slate-700'}`}>
                          {getRemaining(product.product_id)} ชิ้น
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditProduct(product)}
                          className="p-2 text-slate-400 hover:text-sky-500 transition-all">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.product_id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-all">
                          <Trash2 size={16} />
                        </button>
                        {getRemaining(product.product_id) <= 0 && (
                          <>
                            <button
                              onClick={() => {
                                setStockForm({ product_id: product.product_id, qty_added: '' })
                                setShowStockForm(true)
                              }}
                              title="เติมสต็อก"
                              className="p-2 text-sky-500 hover:bg-sky-100 rounded-lg transition-all"
                            >
                              🔄
                            </button>
                            <button
                              onClick={async () => {
                                await updateProductStatus(product.product_id, 'inactive')
                                loadAll()
                                setActiveTab('inactive')
                              }}
                              title="ยกเลิกการขาย"
                              className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                            >
                              🚫
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* เติมสต็อก */}
          <div className="bg-white rounded-2xl shadow-sm border border-sky-100">
            <div className="flex items-center justify-between p-5 border-b border-sky-100">
              <h2 className="font-bold text-slate-700">เติมสต็อก</h2>
              <button
                onClick={() => setShowStockForm(!showStockForm)}
                className="flex items-center gap-1 px-4 py-2 bg-sky-500 hover:bg-sky-600
                           text-white rounded-xl text-sm font-medium transition-all"
              >
                <Plus size={16} />เติมสต็อก
              </button>
            </div>
            {showStockForm && (
              <div className="p-4 border-b border-sky-50 bg-sky-50 flex flex-col gap-3">
                <select
                  value={stockForm.product_id}
                  onChange={e => setStockForm(prev => ({ ...prev, product_id: e.target.value }))}
                  className="w-full border border-sky-200 rounded-xl px-4 py-2
                             text-slate-700 text-sm focus:outline-none focus:border-sky-400"
                >
                  <option value="">เลือกสินค้า</option>
                  {products.map(p => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name} (คงเหลือ {getRemaining(p.product_id)} ชิ้น)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="จำนวนที่เติม (ชิ้น)"
                  value={stockForm.qty_added}
                  onChange={e => setStockForm(prev => ({ ...prev, qty_added: e.target.value }))}
                  className="w-full border border-sky-200 rounded-xl px-4 py-2
                             text-slate-700 text-sm focus:outline-none focus:border-sky-400"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowStockForm(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200
                               text-slate-500 text-sm hover:bg-slate-50">
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleAddStock}
                    disabled={!stockForm.product_id || !stockForm.qty_added}
                    className="flex-1 py-2 rounded-xl bg-sky-500 hover:bg-sky-600
                               disabled:bg-slate-200 text-white disabled:text-slate-400
                               font-bold text-sm transition-all"
                  >
                    ยืนยันเติมสต็อก
                  </button>
                </div>
              </div>
            )}
            <div className="p-4 flex flex-col gap-2">
              {stock.length === 0 ? (
                <div className="text-center text-slate-300 py-8">ยังไม่มีข้อมูลสต็อก</div>
              ) : (
                stock.map(item => (
                  <div key={item.product_id}
                    className="flex items-center justify-between px-4 py-3 bg-sky-50 rounded-xl">
                    <div className="font-medium text-slate-700">{item.product_name}</div>
                    <div className={`font-bold text-sm
                      ${item.remaining <= 0 ? 'text-red-600' : item.remaining <= 5 ? 'text-red-500' : 'text-sky-600'}`}>
                      {item.remaining <= 0 ? 0 : item.remaining} ชิ้น
                      {item.remaining <= 0 ? (
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">เติมสินค้า!</span>
                      ) : item.remaining <= 5 ? (
                        <span className="ml-2 text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">ใกล้หมด!</span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Tab 2: ไม่ขายแล้ว */}
      {activeTab === 'inactive' && (
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100">
          <div className="p-5 border-b border-sky-100">
            <h2 className="font-bold text-slate-700">สินค้าที่ยกเลิกการขาย</h2>
            <p className="text-xs text-slate-400 mt-1">กด "กลับมาขาย" เพื่อนำสินค้ากลับมาขายในหน้า POS</p>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {inactiveProducts.length === 0 ? (
              <div className="text-center text-slate-300 py-8">ไม่มีสินค้าที่ยกเลิกการขาย</div>
            ) : (
              inactiveProducts.map(product => (
                <div key={product.product_id}
                  className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl grayscale opacity-50">
                      {getProductIcon(product.product_name)}
                    </span>
                    <div>
                      <div className="font-medium text-slate-500">{product.product_name}</div>
                      <div className="text-sm text-slate-400">
                        ฿{Number(product.price).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReactivate(product.product_id)}
                    className="flex items-center gap-1 px-3 py-2 bg-sky-500 hover:bg-sky-600
                               text-white rounded-xl text-xs font-medium transition-all"
                  >
                    <RotateCcw size={12} />
                    กลับมาขาย
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: ประวัติ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100">
          <div className="p-5 border-b border-sky-100">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <History size={18} className="text-sky-500" />
              ประวัติการเติมสต็อก
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {history.length === 0 ? (
              <div className="text-center text-slate-300 py-8">ยังไม่มีประวัติ</div>
            ) : (
              history.map(h => (
                <div key={h.stock_id}
                  className="flex items-center justify-between px-4 py-3 bg-sky-50 rounded-xl text-sm">
                  <div>
                    <div className="font-medium text-slate-700">{h.product_name}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(h.added_at).toLocaleDateString('th-TH', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="font-bold text-sky-600">+{h.qty_added} ชิ้น</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal เพิ่ม/แก้ไขสินค้า */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="font-bold text-slate-700 text-lg">
              {editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
            </h2>
            <input
              type="text"
              placeholder="ชื่อสินค้า"
              value={productForm.product_name}
              onChange={e => setProductForm(prev => ({ ...prev, product_name: e.target.value }))}
              className="w-full border border-sky-200 rounded-xl px-4 py-2
                         text-slate-700 text-sm focus:outline-none focus:border-sky-400"
            />
            <input
              type="number"
              placeholder="ราคา (บาท)"
              value={productForm.price}
              onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))}
              className="w-full border border-sky-200 rounded-xl px-4 py-2
                         text-slate-700 text-sm focus:outline-none focus:border-sky-400"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowProductForm(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200
                           text-slate-500 text-sm hover:bg-slate-50">
                ยกเลิก
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={!productForm.product_name || !productForm.price}
                className="flex-1 py-2 rounded-xl bg-sky-500 hover:bg-sky-600
                           disabled:bg-slate-200 text-white disabled:text-slate-400
                           font-bold text-sm transition-all"
              >
                {editingProduct ? 'บันทึก' : 'เพิ่มสินค้า'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}