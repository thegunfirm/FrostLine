import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ImageVariant {
  url: string;
  width: number;
  height: number;
  size: 'thumbnail' | 'standard' | 'large' | 'original';
  quality: 'low' | 'medium' | 'high';
  loadPriority: 'high' | 'medium' | 'low';
}

interface ProductImage {
  id: string;
  alt: string;
  variants: ImageVariant[];
  primaryVariant: ImageVariant;
  fallbackUrl?: string;
}

interface ProgressiveConfig {
  placeholder: string;
  initial: string;
  highRes: string;
  alt: string;
}

interface ImageOptimizationData {
  productImage: ProductImage;
  optimalVariant: ImageVariant;
  progressiveConfig: ProgressiveConfig;
  srcSet?: string;
  sizes?: string;
}

export function useProgressiveImage(
  productId: number,
  context: 'card' | 'detail' | 'zoom' | 'gallery' = 'detail'
) {
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [imageLoadingState, setImageLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Fetch optimized image data
  const { data: imageData, isLoading, error } = useQuery<ImageOptimizationData>({
    queryKey: ['product-image', productId, context],
    queryFn: async () => {
      const response = await fetch(`/api/images/optimize/${productId}?context=${context}`);
      if (!response.ok) {
        throw new Error('Failed to fetch image data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!productId
  });

  // Initialize with optimal image when data loads
  useEffect(() => {
    if (imageData) {
      setCurrentImageUrl(imageData.optimalVariant.url);
      setImageLoadingState('loading');
    }
  }, [imageData]);

  // Load high-resolution image on demand
  const loadHighResolution = async () => {
    if (!imageData?.progressiveConfig.highRes || isHighResLoaded) return;

    setImageLoadingState('loading');
    
    try {
      const img = new Image();
      
      img.onload = () => {
        setCurrentImageUrl(imageData.progressiveConfig.highRes);
        setIsHighResLoaded(true);
        setImageLoadingState('loaded');
      };
      
      img.onerror = () => {
        setImageLoadingState('error');
      };
      
      img.src = imageData.progressiveConfig.highRes;
    } catch (error) {
      setImageLoadingState('error');
    }
  };

  // Image loading handlers
  const handleImageLoad = () => {
    setImageLoadingState('loaded');
  };

  const handleImageError = () => {
    setImageLoadingState('error');
    // Fallback to placeholder if available
    if (imageData?.progressiveConfig.placeholder) {
      setCurrentImageUrl(imageData.progressiveConfig.placeholder);
    }
  };

  // Get responsive image attributes
  const getResponsiveProps = () => {
    if (!imageData) return {};

    return {
      srcSet: imageData.srcSet,
      sizes: imageData.sizes,
    };
  };

  // Get quality information
  const getImageQuality = () => {
    if (!imageData) return 'standard';
    
    if (isHighResLoaded) {
      return 'high-resolution';
    }
    
    return imageData.optimalVariant.quality;
  };

  // Check if high-res is available
  const hasHighResolution = () => {
    return imageData?.progressiveConfig.highRes !== imageData?.progressiveConfig.initial;
  };

  return {
    // Image data
    imageUrl: currentImageUrl,
    altText: imageData?.productImage.alt || '',
    placeholder: imageData?.progressiveConfig.placeholder || '',
    
    // Loading states
    isLoading: isLoading || imageLoadingState === 'loading',
    isLoaded: imageLoadingState === 'loaded',
    hasError: imageLoadingState === 'error' || !!error,
    
    // High-res functionality
    isHighResLoaded,
    hasHighResolution: hasHighResolution(),
    loadHighResolution,
    
    // Image properties
    quality: getImageQuality(),
    responsiveProps: getResponsiveProps(),
    
    // Event handlers
    onLoad: handleImageLoad,
    onError: handleImageError,
    
    // Raw data for advanced usage
    imageData
  };
}

// Hook for verifying image availability
export function useImageVerification(imageUrl: string) {
  return useQuery({
    queryKey: ['image-verify', imageUrl],
    queryFn: async () => {
      const response = await fetch(`/api/images/verify/${encodeURIComponent(imageUrl)}`);
      if (!response.ok) {
        throw new Error('Failed to verify image');
      }
      return response.json();
    },
    enabled: !!imageUrl,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });
}

// Legacy support hook - converts old image format to new progressive system
export function useLegacyImageSupport(imageUrl: string | null, productName: string) {
  const [productImage, setProductImage] = useState<ProductImage | null>(null);

  useEffect(() => {
    if (imageUrl) {
      const legacyImage: ProductImage = {
        id: `legacy-${Date.now()}`,
        alt: `${productName} - Product Image`,
        variants: [
          {
            url: imageUrl,
            width: 400,
            height: 400,
            size: 'standard',
            quality: 'medium',
            loadPriority: 'high'
          }
        ],
        primaryVariant: {
          url: imageUrl,
          width: 400,
          height: 400,
          size: 'standard',
          quality: 'medium',
          loadPriority: 'high'
        },
        fallbackUrl: imageUrl
      };
      
      setProductImage(legacyImage);
    }
  }, [imageUrl, productName]);

  return productImage;
}