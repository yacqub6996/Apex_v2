import { Avatar, Box, Typography } from '@mui/material'

type Props = {
  src?: string | null
  name?: string | null
  size?: number
  subtitle?: string
}

export const AvatarPreview = ({ src, name, size = 96, subtitle }: Props) => {
  const initials = (name || '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('') || 'A'

  // Debug: log the src being used
  console.log('AvatarPreview rendering with src:', src, 'name:', name, 'size:', size)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar 
        src={src || undefined} 
        sx={{ 
          width: size, 
          height: size, 
          fontSize: size / 3,
          // Ensure avatar has proper styling
          flexShrink: 0,
          backgroundColor: 'action.hover',
          border: '2px solid',
          borderColor: 'divider'
        }}
      >
        {initials}
      </Avatar>
      {subtitle ? (
        <Box>
          <Typography variant="subtitle2" color="text.secondary">{subtitle}</Typography>
        </Box>
      ) : null}
    </Box>
  )
}

export default AvatarPreview
