const MAX_INPUT_BYTES = 2 * 1024 * 1024
export const MAX_PORTRAIT_BYTES = 100 * 1024

export async function preparePortrait(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片')
  if (file.size > MAX_INPUT_BYTES) throw new Error('原图请小于 2 MB')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 320
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器无法处理图片')
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    if (side < 160) throw new Error('图片分辨率过低，建议至少 160 × 160 像素')
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 320, 320)
    for (const format of ['image/webp', 'image/jpeg']) {
      for (const quality of [0.82, 0.7, 0.55, 0.4]) {
        const dataUrl = canvas.toDataURL(format, quality)
        if (dataUrl.startsWith(`data:${format};`) && Math.ceil(dataUrl.split(',')[1].length * 3 / 4) <= MAX_PORTRAIT_BYTES) return dataUrl
      }
    }
    throw new Error('压缩后仍超过 100 KB，请换一张更简单的照片')
  } finally { URL.revokeObjectURL(url) }
}
