/**
 * Image optimization utilities for HomeHaven Kenya.
 * Provides WebP URL transformations for external CDNs (Unsplash)
 * and client-side HTML5 Canvas WebP encoding for uploaded listing photos.
 */

export interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'auto';
}

/**
 * Optimizes an image URL to serve modern WebP with optimal dimensions & compression.
 * For Unsplash images, sets `fm=webp`, `auto=format`, width, and quality.
 * Leaves base64 data URLs or standard local assets intact.
 */
export function optimizeImageUrl(url: string | undefined | null, options: OptimizeOptions = {}): string {
  if (!url) return '';

  const { width, height, quality = 80, format = 'webp' } = options;

  // Check if it's an Unsplash URL
  if (url.includes('images.unsplash.com')) {
    try {
      const urlObj = new URL(url);
      
      // Enforce WebP format
      if (format === 'webp') {
        urlObj.searchParams.set('fm', 'webp');
      }
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('fit', 'crop');
      urlObj.searchParams.set('q', quality.toString());

      if (width) {
        urlObj.searchParams.set('w', width.toString());
      }
      if (height) {
        urlObj.searchParams.set('h', height.toString());
      }

      return urlObj.toString();
    } catch {
      // Fallback if URL parsing fails
      let optimized = url;
      if (!optimized.includes('fm=webp')) {
        optimized += (optimized.includes('?') ? '&' : '?') + 'fm=webp';
      }
      return optimized;
    }
  }

  return url;
}

/**
 * Generates a responsive srcset string with WebP URLs for Unsplash images.
 */
export function getWebpSrcSet(url: string, widths: number[] = [640, 960, 1280, 1920]): string {
  if (!url || !url.includes('images.unsplash.com')) {
    return url || '';
  }

  return widths
    .map(w => `${optimizeImageUrl(url, { width: w, quality: w > 1200 ? 80 : 75, format: 'webp' })} ${w}w`)
    .join(', ');
}

/**
 * Client-side WebP compression strategy for user-uploaded listing photos.
 * Uses an offscreen HTML5 canvas to resize to max dimensions and encode directly as 'image/webp'.
 * Automatically falls back to 'image/jpeg' if the user's browser doesn't support WebP canvas export.
 */
export function convertFileToWebP(
  file: File, 
  maxDimension = 1200, 
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Attempt WebP encoding first
          let dataUrl = canvas.toDataURL('image/webp', quality);

          // Check if browser actually produced WebP or fell back to image/png
          if (!dataUrl.startsWith('data:image/webp')) {
            // Fallback to jpeg
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Failed to decode image file.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsDataURL(file);
  });
}
