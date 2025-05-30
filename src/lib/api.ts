import { Post, SocialAccount } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('authToken', token);
};

export const getStoredToken = () => {
  return localStorage.getItem('authToken');
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('authToken');
};

const handleResponse = async (response: Response) => {
  let data;
  try {
    data = await response.json();
  } catch (error) {
    // JSON parsing failed
    if (!response.ok) {
      const message = response.statusText || 'API request failed';
      throw new Error(`Error ${response.status}: ${message}`);
    } else {
      // This case should ideally not happen for a 2xx response
      throw new Error(`Error ${response.status}: Failed to parse successful response from API.`);
    }
  }

  if (!response.ok) {
    if (data && data.error) {
      throw new Error(`Error ${response.status}: ${data.error}`);
    } else {
      throw new Error(`Error ${response.status}: API error`);
    }
  }

  return data;
};

const fetchWithAuth = (endpoint: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  }).then(handleResponse);
};

export const api = {
  auth: {
    register: (email: string, password: string) =>
      fetchWithAuth('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    login: (email: string, password: string) =>
      fetchWithAuth('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    logout: () =>
      fetchWithAuth('/api/auth/logout', {
        method: 'POST',
      }),

    getCurrentUser: () =>
      fetchWithAuth('/api/auth/me', {
        method: 'GET',
      }),
  },

  posts: {
    getAll: () => fetchWithAuth('/api/posts'),
    
    create: (post: Omit<Post, 'id' | 'user_id'>) =>
      fetchWithAuth('/api/posts', {
        method: 'POST',
        body: JSON.stringify(post),
      }),
    
    update: (post: Post) =>
      fetchWithAuth(`/api/posts/${post.id}`, {
        method: 'PUT',
        body: JSON.stringify(post),
      }),
    
    delete: (id: string) =>
      fetchWithAuth(`/api/posts/${id}`, {
        method: 'DELETE',
      }),
  },

  accounts: {
    getAll: () => fetchWithAuth('/api/accounts'),
    
    create: (account: Omit<SocialAccount, 'id' | 'user_id'>) =>
      fetchWithAuth('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(account),
      }),
    
    delete: (id: string) =>
      fetchWithAuth(`/api/accounts/${id}`, {
        method: 'DELETE',
      }),
  },
};