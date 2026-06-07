export function getProductIcon(name = '') {
  const n = name.toLowerCase()
  if (n.includes('กางเกง'))       return '👖'
  if (n.includes('กระโปรง'))      return '👗'
  if (n.includes('ชุดเดรส') || n.includes('เดรส')) return '👗'
  if (n.includes('เสื้อคลุม'))    return '🥼'
  if (n.includes('สูท'))          return '🤵'
  if (n.includes('ชุดนอน'))       return '🩱'
  if (n.includes('ชุดว่ายน้ำ'))   return '🩲'
  if (n.includes('รองเท้า'))      return '👟'
  if (n.includes('กระเป๋า'))      return '👜'
  if (n.includes('หมวก'))         return '🧢'
  if (n.includes('ผ้าพัน') || n.includes('ผ้าคลุม')) return '🧣'
  if (n.includes('เสื้อ'))        return '👕'
  return '👕' // default
}
