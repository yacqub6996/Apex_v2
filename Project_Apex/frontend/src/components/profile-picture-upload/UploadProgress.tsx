import { LinearProgress, Box, Typography } from '@mui/material'

export const UploadProgress = ({ percent }: { percent: number }) => {
  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, percent))} />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
        {Math.round(percent)}%
      </Typography>
    </Box>
  )
}

export default UploadProgress
