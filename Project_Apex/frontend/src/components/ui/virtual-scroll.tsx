import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { Box, Typography, BoxProps } from '@mui/material';
import { useVirtualScrollAccessibility } from '@/utils/accessibility';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  loading?: boolean;
  loadingComponent?: ReactNode;
  onScroll?: (scrollTop: number) => void;
  className?: string;
  sx?: BoxProps['sx'];
}

export const VirtualScroll = <T,>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
  renderItem,
  emptyState,
  loading = false,
  loadingComponent,
  onScroll,
  className,
  sx,
}: VirtualScrollProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const totalItems = items.length;
  const innerHeight = totalItems * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  // Accessibility support
  const { containerProps, itemProps } = useVirtualScrollAccessibility(
    totalItems,
    visibleItems.length,
    startIndex
  );

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Auto-scroll to top when items change significantly
  useEffect(() => {
    if (containerRef.current && Math.abs(totalItems - items.length) > 10) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length, totalItems]);

  const defaultEmptyState = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: containerHeight,
        color: 'text.secondary',
        textAlign: 'center',
        p: 3,
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No items found
      </Typography>
      <Typography variant="body2">
        There are no items to display at the moment.
      </Typography>
    </Box>
  );

  const defaultLoadingComponent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: containerHeight,
        color: 'text.secondary',
      }}
    >
      <Typography variant="body2">
        Loading items...
      </Typography>
    </Box>
  );

  if (loading) {
    return (
      <Box className={className}>
        {loadingComponent || defaultLoadingComponent}
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box className={className}>
        {emptyState || defaultEmptyState}
      </Box>
    );
  }

  return (
    <Box
      component="div"
      ref={containerRef}
      onScroll={handleScroll}
      sx={{
        height: containerHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        '&::-webkit-scrollbar': {
          width: 8,
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'background.default',
          borderRadius: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'action.disabled',
          borderRadius: 4,
          '&:hover': {
            backgroundColor: 'action.disabledBackground',
          },
        },
        ...sx,
      }}
      className={className}
      {...containerProps}
    >
      {/* Virtual container with full height */}
      <Box
        sx={{
          height: innerHeight,
          position: 'relative',
        }}
      >
        {/* Visible items with offset */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <Box
                key={actualIndex}
                sx={{
                  height: itemHeight,
                  '&:not(:last-child)': {
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                  },
                }}
                {...itemProps(actualIndex)}
              >
                {renderItem(item, actualIndex)}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

// Hook for using virtual scroll with dynamic item heights
interface UseVirtualScrollOptions {
  estimatedItemHeight: number;
  overscan?: number;
}

export const useVirtualScroll = <T,>({
  estimatedItemHeight,
  overscan = 3,
}: UseVirtualScrollOptions) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateVisibleRange = useCallback((
    items: T[],
    scrollTop: number,
    containerHeight: number
  ) => {
    const totalItems = items.length;
    
    // Calculate start and end indices based on estimated heights
    let startIndex = 0;
    let endIndex = 0;
    let currentPosition = 0;

    // Find start index
    for (let i = 0; i < totalItems; i++) {
      const itemHeight = itemHeights.get(i) || estimatedItemHeight;
      if (currentPosition + itemHeight > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      currentPosition += itemHeight;
    }

    // Find end index
    currentPosition = 0;
    for (let i = 0; i < totalItems; i++) {
      const itemHeight = itemHeights.get(i) || estimatedItemHeight;
      currentPosition += itemHeight;
      if (currentPosition >= scrollTop + containerHeight) {
        endIndex = Math.min(totalItems - 1, i + overscan);
        break;
      }
    }

    // Calculate offset
    let offsetY = 0;
    for (let i = 0; i < startIndex; i++) {
      offsetY += itemHeights.get(i) || estimatedItemHeight;
    }

    return { startIndex, endIndex, offsetY };
  }, [estimatedItemHeight, itemHeights, overscan]);

  const updateItemHeight = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      const newHeights = new Map(prev);
      newHeights.set(index, height);
      return newHeights;
    });
  }, []);

  const scrollToItem = useCallback((index: number) => {
    if (containerRef.current) {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += itemHeights.get(i) || estimatedItemHeight;
      }
      containerRef.current.scrollTop = offset;
      setScrollTop(offset);
    }
  }, [itemHeights, estimatedItemHeight]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  return {
    containerRef,
    scrollTop,
    handleScroll,
    calculateVisibleRange,
    updateItemHeight,
    scrollToItem,
    itemHeights,
  };
};

// Virtual scroll with dynamic item heights
interface DynamicVirtualScrollProps<T> extends Omit<VirtualScrollProps<T>, 'itemHeight'> {
  estimatedItemHeight: number;
  getItemKey?: (item: T, index: number) => string | number;
  sx?: BoxProps['sx'];
}

export const DynamicVirtualScroll = <T,>({
  items,
  estimatedItemHeight,
  containerHeight,
  overscan = 3,
  renderItem,
  getItemKey = (_, index) => index,
  sx,
  onScroll,
  ...props
}: DynamicVirtualScrollProps<T>) => {
  const {
    containerRef,
    scrollTop,
    handleScroll,
    calculateVisibleRange,
    updateItemHeight,
    itemHeights,
  } = useVirtualScroll({
    estimatedItemHeight,
    overscan,
  });

  const { startIndex, endIndex, offsetY } = calculateVisibleRange(items, scrollTop, containerHeight);
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalItems = items.length;
  const innerHeight = Array.from(itemHeights.values()).reduce(
    (sum, height) => sum + height,
    (totalItems - itemHeights.size) * estimatedItemHeight
  );

  const { containerProps, itemProps } = useVirtualScrollAccessibility(
    totalItems,
    visibleItems.length,
    startIndex
  );

  const renderItemWithHeight = (item: T, index: number) => {
    const actualIndex = startIndex + index;
    const itemKey = getItemKey(item, actualIndex);
    
    return (
      <Box
        key={itemKey}
        ref={(element: HTMLDivElement | null) => {
          if (element) {
            const height = element.getBoundingClientRect().height;
            if (height !== itemHeights.get(actualIndex)) {
              updateItemHeight(actualIndex, height);
            }
          }
        }}
        {...itemProps(actualIndex)}
      >
        {renderItem(item, actualIndex)}
      </Box>
    );
  };

  const handleScrollInternal = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    handleScroll(event);
    onScroll?.(event.currentTarget.scrollTop);
  }, [handleScroll, onScroll]);

  return (
    <Box
      component="div"
      ref={containerRef}
      onScroll={handleScrollInternal}
      sx={{
        height: containerHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        '&::-webkit-scrollbar': {
          width: 8,
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'background.default',
          borderRadius: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'action.disabled',
          borderRadius: 4,
          '&:hover': {
            backgroundColor: 'action.disabledBackground',
          },
        },
        ...sx,
      }}
      {...containerProps}
      {...props}
    >
      <Box sx={{ height: innerHeight, position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((item, index) => renderItemWithHeight(item, index))}
        </Box>
      </Box>
    </Box>
  );
};