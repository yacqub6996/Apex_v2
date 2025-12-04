import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Box } from '@mui/material'
import { Cropper } from '@/components/shared-assets/image-cropper/cropper'

type Props = {
  open: boolean
  src: string | null
  onClose: () => void
  onConfirm: (blob: Blob) => void
  aspect?: number
}

export const ImageCropperDialog = ({ open, src, onClose, onConfirm, aspect = 1 }: Props) => {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState<{ unit?: '%' | 'px'; x: number; y: number; width: number; height: number }>({
    unit: '%',
    x: 25,
    y: 25,
    width: 50,
    height: 50,
  })

  useEffect(() => {
    if (!open) return
    // reset to center crop when opened
    setCrop({ unit: '%', x: 25, y: 25, width: 50, height: 50 })
  }, [open])

  const handleConfirm = async () => {
    if (!imgRef.current || !crop.width || !crop.height) return
    const blob = await getCroppedBlob(imgRef.current, crop)
    if (blob) onConfirm(blob)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Crop image</DialogTitle>
      <DialogContent>
        {src ? (
          <Box sx={{ width: '100%', height: 360 }}>
            <Cropper
              crop={crop as any}
              onChange={(c) => setCrop(c as any)}
              keepSelection
              aspect={aspect}
              className="w-full h-full"
            >
              <Cropper.Img ref={imgRef as any} src={src} alt="To crop" />
            </Cropper>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text">Cancel</Button>
        <Button onClick={handleConfirm} variant="contained">Apply</Button>
      </DialogActions>
    </Dialog>
  )
}

async function getCroppedBlob(image: HTMLImageElement, crop: { x: number; y: number; width: number; height: number }): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const pixelRatio = window.devicePixelRatio || 1

  const width = Math.round(crop.width * scaleX)
  const height = Math.round(crop.height * scaleY)
  canvas.width = Math.max(1, Math.round(width * pixelRatio))
  canvas.height = Math.max(1, Math.round(height * pixelRatio))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingQuality = 'high'
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

  const sx = Math.round(crop.x * scaleX)
  const sy = Math.round(crop.y * scaleY)
  ctx.drawImage(
    image,
    sx,
    sy,
    width,
    height,
    0,
    0,
    width,
    height,
  )

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/webp',
      0.85,
    )
  })
}

export default ImageCropperDialog
