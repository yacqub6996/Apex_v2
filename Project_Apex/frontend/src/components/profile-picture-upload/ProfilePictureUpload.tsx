import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import EditIcon from '@mui/icons-material/Edit'
import { useQueryClient } from '@tanstack/react-query'
import { ImageCropperDialog } from './ImageCropperDialog'
import { UploadProgress } from './UploadProgress'
import { AvatarPreview } from './AvatarPreview'
import { uploadUserProfilePicture } from '@/services/image-upload-service'
import { toAbsoluteResource } from '@/utils/url'

type Props = {
  currentUrl?: string | null
  displayName?: string | null
  onUpdated?: (absoluteUrl: string, rawPath?: string) => void
}

export const ProfilePictureUpload = ({ currentUrl, displayName, onUpdated }: Props) => {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [localUrl, setLocalUrl] = useState<string>('')
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [openCrop, setOpenCrop] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)

  const effective = useMemo(() => localUrl || toAbsoluteResource(currentUrl), [localUrl, currentUrl])

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl)
    }
  }, [localUrl])

  const onPick = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(String(reader.result || ''))
      setOpenCrop(true)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onPick(file)
    e.currentTarget.value = ''
  }

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) onPick(file)
  }

  const handleConfirmCrop = async (blob: Blob) => {
    setOpenCrop(false)
    setIsUploading(true)
    setProgress(10)
    
    // Create optimistic preview immediately
    const optimisticPreviewUrl = URL.createObjectURL(blob)
    setLocalUrl(optimisticPreviewUrl)
    
    try {
      setProgress(30)
      const res = await uploadUserProfilePicture(blob)
      setProgress(90)
      
      if (!res.ok) throw new Error(res.error || 'Upload failed')
      
      // Backend returns full UserPublic object with updated profile_picture_url
      const fullUserResponse = (res.data || {}) as Record<string, any>
      const rawPath = (fullUserResponse.profile_picture_url as string) || ''
      const absolute = toAbsoluteResource(rawPath)
      
      // Update cache with server response - this is the source of truth
      queryClient.setQueryData(['currentUser'], (oldData: any) => {
        if (!oldData) return fullUserResponse;
        return { ...oldData, ...fullUserResponse };
      });
      
      // Update local URL with the actual server URL (not blob URL)
      if (absolute) {
        setLocalUrl(absolute)
        // Clean up the blob URL
        URL.revokeObjectURL(optimisticPreviewUrl)
      }
      
      // Use background refetch instead of immediate invalidation
      // This prevents race conditions while ensuring data consistency
      queryClient.refetchQueries({
        queryKey: ['currentUser'],
        exact: true
      })
      
      if (absolute) onUpdated?.(absolute, rawPath)
    } catch (err) {
      console.error('Profile picture upload failed:', err)
      
      // Rollback: remove optimistic preview and revert to original
      setLocalUrl('')
      URL.revokeObjectURL(optimisticPreviewUrl)
      
      // Rollback cache to previous state by invalidating
      queryClient.invalidateQueries({
        queryKey: ['currentUser'],
        exact: true
      })
    } finally {
      setProgress(100)
      setTimeout(() => setIsUploading(false), 300)
    }
  }

  return (
    <Stack spacing={2}>
      <AvatarPreview src={effective} name={displayName || undefined} size={96} subtitle="Your profile picture" />
      <Box
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        sx={{
          border: '1px dashed',
          boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
          borderRadius: 2,
          p: 2.5,
          textAlign: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Stack spacing={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Drag & drop an image here, or
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<CloudUploadIcon />} onClick={() => inputRef.current?.click()} variant="outlined">
              Choose file
            </Button>
            <Button startIcon={<EditIcon />} onClick={() => inputRef.current?.click()} variant="text">
              Replace
            </Button>
          </Stack>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleFileChange} />
          {isUploading ? <UploadProgress percent={progress} /> : null}
        </Stack>
      </Box>

      <ImageCropperDialog
        open={openCrop}
        src={cropSrc}
        onClose={() => setOpenCrop(false)}
        onConfirm={handleConfirmCrop}
        aspect={1}
      />
    </Stack>
  )
}

export default ProfilePictureUpload
