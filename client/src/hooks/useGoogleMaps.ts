import { useEffect, useState } from 'react';

interface UseGoogleMapsOptions {
  libraries?: string[];
}

export function useGoogleMaps({ 
  libraries = ['places'] 
}: UseGoogleMapsOptions = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Fetch API key from backend
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/google-maps/config');
        if (!response.ok) {
          throw new Error('Failed to fetch Google Maps configuration');
        }
        const config = await response.json();
        setApiKey(config.apiKey);
      } catch (err) {
        setError('Failed to load Google Maps configuration');
        console.error('Google Maps config error:', err);
      }
    };

    fetchApiKey();
  }, []);

  useEffect(() => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if API key is available
    if (!apiKey) {
      return; // Wait for API key to be fetched
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