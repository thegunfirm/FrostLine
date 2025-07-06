/**
 * RSR Session Manager
 * Handles RSR authentication and age verification to access product images
 */

interface RSRSession {
  cookies: string[];
  authenticated: boolean;
  ageVerified: boolean;
  expiresAt: Date;
}

class RSRSessionManager {
  private session: RSRSession | null = null;
  private sessionDuration = 2 * 60 * 60 * 1000; // 2 hours

  constructor() {
    this.session = null;
  }

  /**
   * Get authenticated session with age verification
   */
  async getAuthenticatedSession(): Promise<RSRSession> {
    // Check if current session is still valid
    if (this.session && this.session.ageVerified && new Date() < this.session.expiresAt) {
      return this.session;
    }

    // RSR images require age verification on their website
    throw new Error('RSR images require age verification on their website');
  }

  /**
   * Create a new authenticated and age-verified session
   */
  private async createNewSession(): Promise<void> {
    console.log('Creating new RSR session...');

    // Step 1: Authenticate with Basic Auth and get cookies
    const authResponse = await this.authenticate();
    const cookies = this.extractCookies(authResponse.headers);

    // Step 2: Handle age verification
    await this.performAgeVerification(cookies);

    // Step 3: Store session
    this.session = {
      cookies,
      authenticated: true,
      ageVerified: true,
      expiresAt: new Date(Date.now() + this.sessionDuration)
    };

    console.log('RSR session created successfully');
  }

  /**
   * Authenticate with RSR using Basic Auth
   */
  private async authenticate(): Promise<Response> {
    const credentials = Buffer.from(`${process.env.RSR_USERNAME}:${process.env.RSR_PASSWORD}`).toString('base64');
    
    const response = await fetch('https://www.rsrgroup.com/login', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`RSR authentication failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * Perform age verification by submitting the form using the exact endpoint RSR uses
   */
  private async performAgeVerification(cookies: string[]): Promise<void> {
    try {
      // Submit age verification form with valid birth date (25 years old)
      const birthYear = new Date().getFullYear() - 25;
      
      const formData = new URLSearchParams({
        'Month': '1',
        'Day': '1', 
        'Year': birthYear.toString(),
        'redirect': '%2Fimages%2Finventory%2Ftest.jpg'  // URL-encoded redirect
      });

      // Use the exact API endpoint from RSR's form
      const response = await fetch('https://www.rsrgroup.com/umbraco/api/PublicMemberAgeVerification/v1_2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; '),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.rsrgroup.com/',
          'Origin': 'https://www.rsrgroup.com',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
      });

      console.log(`Age verification response: ${response.status} ${response.statusText}`);
      
      // Extract new cookies from the response
      const verificationCookies = this.extractCookies(response.headers);
      cookies.push(...verificationCookies);

      // The API should return JSON with success status
      if (response.ok) {
        const responseText = await response.text();
        console.log('Age verification response:', responseText);
      }

    } catch (error) {
      console.error('Age verification error:', error);
      throw new Error(`Age verification failed: ${error}`);
    }
  }

  /**
   * Download RSR image with authenticated session
   */
  async downloadImage(imageUrl: string): Promise<Buffer> {
    const session = await this.getAuthenticatedSession();

    const response = await fetch(imageUrl, {
      headers: {
        'Cookie': session.cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.rsrgroup.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    // Check if we got HTML instead of an image (age verification redirect)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      // Session expired, retry with new session
      this.session = null;
      return this.downloadImage(imageUrl);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Extract cookies from response headers
   */
  private extractCookies(headers: Headers): string[] {
    const cookies: string[] = [];
    
    // Get Set-Cookie headers
    const setCookieHeaders = headers.get('set-cookie');
    if (setCookieHeaders) {
      // Parse multiple cookies
      const cookieLines = setCookieHeaders.split('\n');
      for (const line of cookieLines) {
        const cookie = line.split(';')[0].trim();
        if (cookie) {
          cookies.push(cookie);
        }
      }
    }

    return cookies;
  }

  /**
   * Test if session is working by trying to access a test image
   */
  async testSession(): Promise<boolean> {
    try {
      const buffer = await this.downloadImage('https://www.rsrgroup.com/images/inventory/GLPG1950203.jpg');
      return buffer.length > 1000; // Valid image should be > 1KB
    } catch (error) {
      console.error('Session test failed:', error);
      return false;
    }
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.session = null;
  }
}

export const rsrSessionManager = new RSRSessionManager();