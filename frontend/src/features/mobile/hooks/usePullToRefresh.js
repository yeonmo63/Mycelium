import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to implement pull-to-refresh logic.
 * @param {Function} onRefresh - Async function to call when refresh is triggered.
 * @param {Object} options - Configuration options.
 */
export const usePullToRefresh = (onRefresh, {
    threshold = 80,
    maxY = 150,
    scrollEltRef = null
} = {}) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const isPulling = useRef(false);

    const handleTouchStart = useCallback((e) => {
        // Only allow pulling if scroll position is at the top
        const scrollTarget = scrollEltRef?.current || window;
        const scrollTop = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;

        if (scrollTop <= 0) {
            startY.current = e.touches[0].pageY;
            isPulling.current = true;
        }
    }, [scrollEltRef]);

    const handleTouchMove = useCallback((e) => {
        if (!isPulling.current || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Add some resistance to the pull
            const distance = Math.min(diff * 0.4, maxY);
            setPullDistance(distance);

            // Prevent default scroll when pulling down at the top
            if (diff > 10 && e.cancelable) {
                e.preventDefault();
            }
        } else {
            setPullDistance(0);
            isPulling.current = false;
        }
    }, [isRefreshing, maxY]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling.current) return;

        isPulling.current = false;

        if (pullDistance >= threshold) {
            setIsRefreshing(true);
            setPullDistance(threshold); // Keep visible during refresh
            try {
                await onRefresh();
            } finally {
                // Smoothly close after a short delay to let user see success
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }, 500);
            }
        } else {
            setPullDistance(0);
        }
    }, [pullDistance, threshold, onRefresh]);

    return {
        pullDistance,
        isRefreshing,
        bind: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd
        }
    };
};
