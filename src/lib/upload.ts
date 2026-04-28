import imageCompression from 'browser-image-compression'

export interface UploadResult {
  url: string
  filename: string
  size: number
  type: string
}

export async function uploadToLocal(
  file: File,
  folder: 'products' | 'banners' | 'portfolio' | 'evidence' | 'documents',
  options?: { compress?: boolean; maxSizeMB?: number }
): Promise<UploadResult> {
  const { compress = true, maxSizeMB = 1 } = options || {}

  let fileToUpload = file

  if (compress && file.type.startsWith('image/')) {
    try {
      fileToUpload = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight: 1920,
      })
    } catch (e) {
      console.warn('Image compression failed, using original file:', e)
    }
  }

  const formData = new FormData()
  formData.append('file', fileToUpload)
  formData.append('folder', folder)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Upload failed')
  }

  return res.json()
}
