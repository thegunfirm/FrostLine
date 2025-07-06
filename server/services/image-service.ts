export interface ImageVariant {
  url: string;
  width: number;
  height: number;
  size: 'thumbnail' | 'standard' | 'large' | 'original';
  quality: 'low' | 'medium' | 'high';
  loadPriority: 'high' | 'medium' | 'low';
}

export interface ProductImage {
  id: string;
  alt: string;
  variants: ImageVariant[];
  primaryVariant: ImageVariant;
  fallbackUrl?: string;
}

class ImageService {
  private rsrImageBaseUrl = 'https://www.rsrgroup.com/images/inventory';
  
  /**
   * Generate multiple image variants from RSR image name
   * RSR follows these patterns:
   * - Standard: /images/inventory/[name].jpg
   * - Large: /images/inventory/large/[name].jpg
   * - Thumbnail: /images/inventory/thumb/[name].jpg
   */
  generateRSRImageVariants(imageName: string, productName: string): ProductImage {
    const cleanImageName = imageName.replace(/\.(jpg|jpeg|png|gif)$/i, '');
    const imageId = `rsr-${cleanImageName}`;
    
    // Firearm-appropriate placeholder images mapped by manufacturer/type
    const placeholderImages = {
      'GLPG': 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400&h=400&fit=crop&auto=format', // Glock
      'SWMP': 'https://images.unsplash.com/photo-1544824724-c606d27b9435?w=400&h=400&fit=crop&auto=format', // Smith & Wesson
      'RUG': 'https://images.unsplash.com/photo-1518131672697-613becd4fab5?w=400&h=400&fit=crop&auto=format', // Ruger
      'FED': 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&h=400&fit=crop&auto=format', // Federal ammo
      'VORTEX': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&auto=format' // Optics
    };
    
    // Find matching placeholder by manufacturer prefix
    const prefix = Object.keys(placeholderImages).find(key => cleanImageName.startsWith(key));
    const selectedImage = placeholderImages[prefix as keyof typeof placeholderImages] || placeholderImages['GLPG'];

    const variants: ImageVariant[] = [
      {
        url: selectedImage.replace('w=400&h=400', 'w=150&h=150'),
        width: 150,
        height: 150,
        size: 'thumbnail',
        quality: 'medium',
        loadPriority: 'high'
      },
      {
        url: selectedImage,
        width: 400,
        height: 400,
        size: 'standard',
        quality: 'medium',
        loadPriority: 'high'
      },
      {
        url: selectedImage.replace('w=400&h=400', 'w=800&h=800'),
        width: 800,
        height: 800,
        size: 'large',
        quality: 'high',
        loadPriority: 'low'
      }
    ];

    return {
      id: imageId,
      alt: `${productName} - Product Image`,
      variants,
      primaryVariant: variants[1], // Standard resolution as primary
      fallbackUrl: selectedImage
    };
  }

  /**
   * Get optimal image variant based on context
   */
  getOptimalVariant(
    productImage: ProductImage, 
    context: 'card' | 'detail' | 'zoom' | 'gallery'
  ): ImageVariant {
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
  }

  /**
   * Get image for lazy loading with progressive enhancement
   */
  getProgressiveLoadingConfig(productImage: ProductImage) {
    const thumbnail = productImage.variants.find(v => v.size === 'thumbnail');
    const standard = productImage.variants.find(v => v.size === 'standard');
    const large = productImage.variants.find(v => v.size === 'large');

    return {
      placeholder: thumbnail?.url || productImage.fallbackUrl,
      initial: standard?.url || productImage.fallbackUrl,
      highRes: large?.url || productImage.fallbackUrl,
      alt: productImage.alt
    };
  }

  /**
   * Convert RSR products to new image format
   */
  processRSRProductImages(rsrProduct: any): ProductImage[] {
    if (!rsrProduct.imgName) {
      return [];
    }

    const productImage = this.generateRSRImageVariants(
      rsrProduct.imgName, 
      rsrProduct.description || rsrProduct.name || 'Product'
    );

    return [productImage];
  }

  /**
   * Check if image URL is accessible
   */
  async verifyImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get best available image variant with fallback
   */
  async getBestAvailableImage(productImage: ProductImage): Promise<ImageVariant> {
    for (const variant of productImage.variants.reverse()) {
      const isAvailable = await this.verifyImageUrl(variant.url);
      if (isAvailable) {
        return variant;
      }
    }
    
    return productImage.primaryVariant;
  }

  /**
   * Generate srcset for responsive images
   */
  generateSrcSet(productImage: ProductImage): string {
    return productImage.variants
      .map(variant => `${variant.url} ${variant.width}w`)
      .join(', ');
  }

  /**
   * Generate sizes attribute for responsive images
   */
  generateSizes(context: 'card' | 'detail' | 'zoom' | 'gallery'): string {
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
  }
}

export const imageService = new ImageService();