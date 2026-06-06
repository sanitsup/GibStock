const ITEM_PRICE = 100

function calculatePromotion(items) {

  const totalQty = items.reduce(
    (sum, item) => sum + item.qty_sales, 0
  )

  const freeQty = Math.floor(totalQty / 10)
  const grandTotal = totalQty * ITEM_PRICE

  if (freeQty === 0) {
    return { freeQty: 0, discountAmount: 0, grandTotal, freeItems: [] }
  }

  let remaining = freeQty
  const freeItems = []

  for (const item of items) {
    if (remaining <= 0) break
    const freeCount = Math.min(remaining, item.qty_sales)
    remaining -= freeCount

    freeItems.push({
      product_id_ref: item.product_id_ref,
      product_name: item.product_name,
      order_price: ITEM_PRICE,
      qty_sales: freeCount,
      subtotal: 0,
      free_itemtype: true
    })
  }

  return { freeQty, discountAmount: 0, grandTotal, freeItems }
}

module.exports = { calculatePromotion }