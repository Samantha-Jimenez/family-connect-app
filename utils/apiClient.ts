/**
 * API Client Utilities
 * 
 * Helper functions for making authenticated API requests from client components
 */

import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Creates headers with authentication token for API requests
 * Attempts to get the token from Amplify's auth session
 */
export async function getAuthHeaders(contentType: string = 'application/json'): Promise<HeadersInit> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    
    if (token) {
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
      };
      
      // Only add Content-Type if not FormData (browser will set it automatically for FormData)
      if (contentType !== 'multipart/form-data') {
        headers['Content-Type'] = contentType;
      }
      
      return headers;
    }
  } catch (error) {
    console.warn('Failed to get auth token, request will use cookies:', error);
  }
  
  // Return headers without auth token - cookies will be used for authentication
  const headers: HeadersInit = {};
  if (contentType !== 'multipart/form-data') {
    headers['Content-Type'] = contentType;
  }
  return headers;
}

/**
 * Makes an authenticated fetch request
 * Automatically includes authentication token if available
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Determine content type
  const isFormData = options.body instanceof FormData;
  const contentType = isFormData ? 'multipart/form-data' : 'application/json';
  
  const authHeaders = await getAuthHeaders(contentType);
  
  const headers = new Headers({
    ...authHeaders,
    ...options.headers,
  });

  // For FormData requests, don't set Content-Type (browser will set it with boundary)
  if (isFormData) {
    headers.delete('Content-Type');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensure cookies are sent
  });
}
