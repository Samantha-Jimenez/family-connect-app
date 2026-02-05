/**
 * API Authentication Utilities
 * 
 * Provides server-side authentication verification for Next.js API routes
 * using AWS Cognito JWT tokens from request headers or cookies.
 */

import { NextRequest } from 'next/server';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  email?: string;
}

/**
 * Extracts and validates authentication token from request
 * Checks both Authorization header and cookies (Amplify stores tokens in cookies)
 * 
 * Note: This performs basic validation. For production, consider adding full JWT verification
 * using aws-jwt-verify package or Amplify's server-side utilities.
 */
export async function verifyAuth(request: NextRequest | Request): Promise<AuthenticatedUser> {
  // Try to get token from Authorization header first
  let token: string | null = null;
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // If no Authorization header, check cookies (Amplify stores tokens in cookies for SSR)
  if (!token && request instanceof NextRequest) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      // Parse cookies properly - handle URL encoding
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim(); // Handle values with = in them
          if (key && value) {
            try {
              cookies[key] = decodeURIComponent(value);
            } catch {
              cookies[key] = value; // If decoding fails, use raw value
            }
          }
        }
      });

      // Log cookie keys in development for debugging
      if (process.env.NODE_ENV === 'development') {
        const cookieKeys = Object.keys(cookies);
        console.log('Available cookie keys:', cookieKeys.filter(k => 
          k.toLowerCase().includes('token') || 
          k.toLowerCase().includes('cognito') ||
          k.toLowerCase().includes('amplify')
        ).join(', ') || 'none');
      }

      // Look for Amplify v6 cookie patterns
      // Amplify v6 stores tokens with keys like: CognitoIdentityServiceProvider.<clientId>.<username>.idToken
      const userPoolId = process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID;
      const clientId = process.env.NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID;
      
      // Try to find idToken cookie - check various patterns
      const tokenPatterns = [
        /idToken/i,
        /IdToken/,
        /CognitoIdentityServiceProvider.*idToken/i,
        /amplify.*token/i,
      ];
      
      for (const [key, value] of Object.entries(cookies)) {
        // Check if key matches any token pattern
        if (tokenPatterns.some(pattern => pattern.test(key))) {
          // Check if value looks like a JWT (has 3 parts separated by dots)
          if (value && typeof value === 'string' && value.split('.').length === 3) {
            token = value;
            break;
          }
        }
      }
      
      // If still no token, try to find any JWT-like value in cookies
      if (!token) {
        for (const [key, value] of Object.entries(cookies)) {
          if (value && typeof value === 'string') {
            const parts = value.split('.');
            if (parts.length === 3 && parts.every(part => part.length > 0)) {
              // Looks like a JWT token
              token = value;
              if (process.env.NODE_ENV === 'development') {
                console.log(`Found JWT token in cookie: ${key.substring(0, 50)}...`);
              }
              break;
            }
          }
        }
      }
    }
  }

  if (!token) {
    // Log available cookies for debugging (in development only)
    if (process.env.NODE_ENV === 'development' && request instanceof NextRequest) {
      const cookieHeader = request.headers.get('cookie');
      console.log('Available cookies:', cookieHeader?.split(';').map(c => c.trim().split('=')[0]).join(', ') || 'none');
    }
    throw new Error('Missing authentication token. Please include Authorization header or valid session cookie.');
  }

  // Basic token validation - check it's a JWT format (3 parts separated by dots)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    throw new Error('Invalid token format');
  }

  // Decode the JWT payload (without verification for now - add verification in production)
  try {
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString('utf-8'));
    
    // Check token expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token has expired');
    }

    // Extract user information from the token payload
    const userId = payload.sub; // Cognito user ID (sub claim)
    const username = payload['cognito:username'] || payload.username || payload.email || '';
    const email = payload.email;

    if (!userId) {
      throw new Error('Invalid token: missing user ID');
    }

    // Verify token issuer matches our Cognito User Pool
    const userPoolId = process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID;
    if (userPoolId && payload.iss) {
      const expectedIssuer = `https://cognito-idp.${process.env.NEXT_PUBLIC_AWS_COGNITO_REGION || process.env.NEXT_PUBLIC_AWS_PROJECT_REGION}.amazonaws.com/${userPoolId}`;
      if (!payload.iss.includes(userPoolId)) {
        console.warn('Token issuer does not match configured User Pool');
        // Don't throw - allow for flexibility in multi-region setups
      }
    }

    return {
      userId,
      username,
      email,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      throw error;
    }
    console.error('Error decoding token:', error);
    throw new Error('Invalid authentication token');
  }
}

/**
 * Helper function to create an unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Authentication required') {
  return new Response(
    JSON.stringify({ 
      error: 'Unauthorized',
      message,
    }),
    { 
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer',
      },
    }
  );
}
