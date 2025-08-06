import { useEffect, useState } from 'react';

interface UseGoogleMapsOptions {
  apiKey?: string;
  libraries?: string[];
}

export function useGoogleMaps({ 
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  libraries = ['places'] 
}: UseGoogleMapsOptions = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if API key is available
    if (!apiKey) {
      setError('Google Maps API key not provided');
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries.join(',')}&loading=async`;
    script.async = true;
    script.defer = true;

    // Handle script load
    script.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };

    // Handle script error
    script.onerror = () => {
      setError('Failed to load Google Maps API');
      setIsLoading(false);
    };

    // Add script to document
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Note: We don't remove the script on cleanup to avoid multiple loads
      // The script will persist for the session
    };
  }, [apiKey, libraries.join(',')]);

  return { isLoaded, isLoading, error };
}

// Global type declarations for Google Maps
declare global {
  interface Window {
    google: any;
  }
}