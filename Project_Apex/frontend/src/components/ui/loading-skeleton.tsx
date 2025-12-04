import { Box, Skeleton, Stack } from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'form' | 'table';
  count?: number;
}

export const LoadingSkeleton = ({ variant = 'card', count = 1 }: LoadingSkeletonProps) => {
  const renderCardSkeleton = () => (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 2 }} />
        </Box>
      </Stack>
    </Box>
  );

  const renderListSkeleton = () => (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        {Array.from({ length: count }).map((_, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="70%" height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Stack>
    </Box>
  );

  const renderFormSkeleton = () => (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Skeleton variant="text" width="50%" height={32} />
        <Stack spacing={2}>
          {Array.from({ length: count }).map((_, index) => (
            <Box key={index}>
              <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
            </Box>
          ))}
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 2 }} />
        </Box>
      </Stack>
    </Box>
  );

  const renderTableSkeleton = () => (
    <Box sx={{ p: 2 }}>
      <Stack spacing={1}>
        {/* Table header */}
        <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="text" width="25%" height={24} />
          ))}
        </Box>
        {/* Table rows */}
        {Array.from({ length: count }).map((_, rowIndex) => (
          <Box key={rowIndex} sx={{ display: 'flex', gap: 2, p: 2 }}>
            {Array.from({ length: 4 }).map((_, colIndex) => (
              <Skeleton key={colIndex} variant="text" width="25%" height={20} />
            ))}
          </Box>
        ))}
      </Stack>
    </Box>
  );

  switch (variant) {
    case 'card':
      return renderCardSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'form':
      return renderFormSkeleton();
    case 'table':
      return renderTableSkeleton();
    default:
      return renderCardSkeleton();
  }
};

export const SettingsTabSkeleton = () => (
  <Box sx={{ p: 3 }}>
    <Stack spacing={3}>
      {/* Header */}
      <Box>
        <Skeleton variant="text" width="40%" height={32} />
        <Skeleton variant="text" width="60%" height={24} />
      </Box>
      
      {/* Form fields */}
      <Stack spacing={2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: "none", boxShadow: "0px 1px 3px rgba(0,0,0,0.04)", borderRadius: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="50%" height={24} />
              <Skeleton variant="text" width="70%" height={20} />
            </Box>
            <Skeleton variant="rectangular" width={60} height={32} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Stack>
      
      {/* Action buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 2 }} />
      </Box>
    </Stack>
  </Box>
);

export const QuickSettingsSkeleton = () => (
  <Box sx={{ p: 2 }}>
    <Stack spacing={2}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="circular" width={32} height={32} />
      </Box>
      
      {/* Settings items */}
      {Array.from({ length: 3 }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={20} height={20} />
            <Skeleton variant="text" width={60} height={20} />
          </Box>
          <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 12 }} />
        </Box>
      ))}
      
      {/* Action button */}
      <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 2 }} />
    </Stack>
  </Box>
);

export const SessionListSkeleton = () => (
  <Box sx={{ p: 2 }}>
    <Stack spacing={1}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
            </Box>
            <Skeleton variant="text" width="60%" height={16} />
            <Skeleton variant="text" width="50%" height={16} />
          </Box>
          <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 2 }} />
        </Box>
      ))}
    </Stack>
  </Box>
);