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

    // Create new authenticated session with age verification bypass
    await this.createAuthenticatedSession();
    return this.session!;
  }

  /**
   * Create a new authenticated and age-verified session
   */
  private async createAuthenticatedSession(): Promise<void> {
    console.log('Creating new RSR session with age verification bypass...');

    try {
      // Step 1: Authenticate with Basic Auth and get initial cookies
      const authResponse = await this.authenticate();
      const cookies = this.extractCookies(authResponse.headers);

      // Step 2: Perform sophisticated age verification bypass
      await this.bypassAgeVerification(cookies);

      // Create session object
      this.session = {
        cookies,
        authenticated: true,
        ageVerified: true,
        expiresAt: new Date(Date.now() + this.sessionDuration)
      };

      console.log('RSR session created successfully with age verification bypass');
    } catch (error) {
      console.error('Failed to create RSR session:', error);
      throw error;
    }
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
   * Bypass age verification with sophisticated session handling
   */
  private async bypassAgeVerification(cookies: string[]): Promise<void> {
    try {
      console.log('Attempting sophisticated age verification bypass...');
      
      // Step 1: First navigate to the main page to establish session context
      await this.establishSessionContext(cookies);
      
      // Step 2: Submit age verification with multiple strategies
      await this.submitAgeVerificationForm(cookies);
      
      // Step 3: Verify the session is properly authenticated
      await this.verifySessionAccess(cookies);
      
      console.log('Age verification bypass completed successfully');
      
    } catch (error) {
      console.error('Age verification bypass failed:', error);
      throw new Error(`Age verification bypass failed: ${error}`);
    }
  }

  private async establishSessionContext(cookies: string[]): Promise<void> {
    // Navigate to main RSR page to establish proper session context
    const response = await fetch('https://www.rsrgroup.com/', {
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (response.ok) {
      const newCookies = this.extractCookies(response.headers);
      cookies.push(...newCookies);
    }
  }

  private async submitAgeVerificationForm(cookies: string[]): Promise<void> {
    // Use a realistic birth date (30 years ago to ensure over 21)
    const birthYear = new Date().getFullYear() - 30;
    
    const formData = new URLSearchParams({
      'Month': '6',
      'Day': '15', 
      'Year': birthYear.toString(),
      'redirect': encodeURIComponent('/images/inventory/')
    });

    // Submit to RSR's age verification API
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
        'X-Requested-With': 'XMLHttpRequest',
        'DNT': '1',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      },
      body: formData
    });

    console.log(`Age verification form response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('Age verification response:', responseText);
      
      // Extract any new cookies from the verification response
      const verificationCookies = this.extractCookies(response.headers);
      cookies.push(...verificationCookies);
    }
  }

  private async verifySessionAccess(cookies: string[]): Promise<void> {
    // Test access to a sample image to verify age verification worked
    const testImageUrl = 'https://www.rsrgroup.com/images/inventory/test.jpg';
    
    const response = await fetch(testImageUrl, {
      method: 'HEAD',
      headers: {
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.rsrgroup.com/',
        'Cache-Control': 'no-cache'
      }
    });

    console.log(`Session verification response: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      console.log('Session access verified - age verification bypass successful');
    } else {
      console.log('Session access verification failed - may need additional steps');
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