import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, Download } from 'lucide-react';

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

interface ProgressiveImageProps {
  productImage: ProductImage;
  context: 'card' | 'detail' | 'zoom' | 'gallery';
  showHighResOption?: boolean;
  className?: string;
  onImageLoad?: (imageUrl: string) => void;
}

export function ProgressiveImage({
  productImage,
  context,
  showHighResOption = false,
  className = '',
  onImageLoad
}: ProgressiveImageProps) {
  const [currentImage, setCurrentImage] = useState<ImageVariant | null>(null);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showHighRes, setShowHighRes] = useState(false);
  
  // Get optimal image variant based on context
  const getOptimalVariant = (context: 'card' | 'detail' | 'zoom' | 'gallery'): ImageVariant => {
    const { variants } = productImage;
    
    switch (context) {
      case 'card':
        return variants.find(v => v.size === 'standard') || variants[0];
      case 'detail':
        return variants.find(v => v.size === 'standard') || variants[0];
      case 'zoom':
        return variants.find(v => v.size === 'large') || variants[variants.length - 1];
      case 'gallery':
        return variants.find(v => v.size === 'large') || variants[variants.length - 1];
      default:
        return productImage.primaryVariant;
    }
  };

  // Get high resolution variant
  const getHighResVariant = (): ImageVariant | null => {
    return productImage.variants.find(v => v.size === 'large') || null;
  };

  // Initialize with optimal variant
  useEffect(() => {
    const optimalVariant = getOptimalVariant(context);
    setCurrentImage(optimalVariant);
    setIsLoading(true);
  }, [context, productImage]);

  // Handle image loading
  const handleImageLoad = () => {
    setIsLoading(false);
    if (onImageLoad && currentImage) {
      onImageLoad(currentImage.url);
    }
  };

  // Handle high-res loading
  const handleHighResLoad = async () => {
    const highResVariant = getHighResVariant();
    if (!highResVariant) return;

    setIsLoading(true);
    setShowHighRes(true);
    
    // Preload high-res image
    const img = new Image();
    img.onload = () => {
      setCurrentImage(highResVariant);
      setIsHighResLoaded(true);
      setIsLoading(false);
      if (onImageLoad) {
        onImageLoad(highResVariant.url);
      }
    };
    img.onerror = () => {
      setIsLoading(false);
      // Fallback to current image if high-res fails
    };
    img.src = highResVariant.url;
  };

  // Generate responsive image attributes
  const generateSrcSet = (): string => {
    return productImage.variants
      .map(variant => `${variant.url} ${variant.width}w`)
      .join(', ');
  };

  const generateSizes = (): string => {
    switch (context) {
      case 'card':
        return '(max-width: 768px) 150px, 200px';
      case 'detail':
        return '(max-width: 768px) 300px, 400px';
      case 'zoom':
        return '(max-width: 768px) 100vw, 800px';
      case 'gallery':
        return '(max-width: 768px) 50vw, 400px';
      default:
        return '400px';
    }
  };

  if (!currentImage) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          No Image Available
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Main Image */}
      <img
        src={currentImage.url}
        alt={productImage.alt}
        srcSet={generateSrcSet()}
        sizes={generateSizes()}
        className="w-full h-full object-cover transition-opacity duration-300"
        onLoad={handleImageLoad}
        onError={() => setIsLoading(false)}
        style={{
          opacity: isLoading ? 0.7 : 1,
        }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}

      {/* High-Res Option */}
      {showHighResOption && !isHighResLoaded && context !== 'card' && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleHighResLoad}
            disabled={isLoading}
            className="bg-white/90 hover:bg-white text-black shadow-lg"
          >
            <ZoomIn className="h-4 w-4 mr-1" />
            High Res
          </Button>
        </div>
      )}

      {/* High-Res Downloaded Indicator */}
      {isHighResLoaded && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            className="bg-green-500/90 hover:bg-green-500 text-white shadow-lg cursor-default"
          >
            <Download className="h-4 w-4 mr-1" />
            High Quality
          </Button>
        </div>
      )}

      {/* Image Quality Badge */}
      {context === 'detail' && (
        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
            {currentImage.size === 'large' ? 'High Resolution' : 'Standard Quality'}
          </div>
        </div>
      )}
    </div>
  );
}

// Legacy image support - converts old string URLs to new format
export function convertLegacyImageToProductImage(imageUrl: string, productName: string): ProductImage {
  const imageId = `legacy-${Date.now()}`;
  
  const variants: ImageVariant[] = [
    {
      url: imageUrl,
      width: 400,
      height: 400,
      size: 'standard',
      quality: 'medium',
      loadPriority: 'high'
    }
  ];

  return {
    id: imageId,
    alt: `${productName} - Product Image`,
    variants,
    primaryVariant: variants[0],
    fallbackUrl: imageUrl
  };
}

// Helper to extract image URL from ProductImage for backward compatibility
export function getImageUrl(productImage: ProductImage | string): string {
  if (typeof productImage === 'string') {
    return productImage;
  }
  return productImage.primaryVariant.url;
}