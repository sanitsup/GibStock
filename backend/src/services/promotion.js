function calculatePromotion(items) {
  // นับเฉพาะสินค้าราคา 100 บาท เท่านั้น
  const promoItems = items.filter(i => Number(i.order_price) === 100)
  const promoQty = promoItems.reduce((sum, i) => sum + i.qty_sales, 0)

  // แถมทุก 10 ชิ้น จากสินค้าราคา 100 เท่านั้น
  const freeQty = Math.floor(promoQty / 10)

  // grandTotal คำนวณจากราคาจริงทุกชิ้น (รวมสินค้าที่ไม่ใช่ 100 ด้วย)
  const grandTotal = items.reduce(
    (sum, item) => sum + (Number(item.order_price) * item.qty_sales), 0
  )

  return { freeQty, discountAmount: 0, grandTotal, freeItems: [] }
}

module.exports = { calculatePromotion }
