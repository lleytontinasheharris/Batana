// web/app/lib/api.ts
// All API calls to the BATANA backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper function for authenticated requests
async function authFetch(endpoint: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Helper for public requests
async function publicFetch(endpoint: string) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// ===== AUTH =====
export async function loginUser(phone_number: string, pin: string) {
  const response = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number, pin }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}

export async function registerUser(data: {
  phone_number: string;
  pin: string;
  first_name: string;
  last_name: string;
  language: string;
}) {
  const response = await fetch(`${API_URL}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  return response.json();
}

// ===== USER =====
export async function getUserProfile(token: string) {
  return authFetch('/api/users/profile', token);
}

// ===== WALLET =====
export async function getWallet(token: string) {
  return authFetch('/api/wallet', token);
}

export async function depositFunds(token: string, amount: number, currency: string) {
  return authFetch('/api/wallet/deposit', token, {
    method: 'POST',
    body: JSON.stringify({ amount, currency }),
  });
}

export async function withdrawFunds(token: string, amount: number, currency: string) {
  return authFetch('/api/wallet/withdraw', token, {
    method: 'POST',
    body: JSON.stringify({ amount, currency }),
  });
}

export async function transferFunds(token: string, data: {
  to_phone: string;
  amount: number;
  currency: string;
  purpose?: string;
}) {
  return authFetch('/api/wallet/transfer', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== TRUST ENGINE =====
export async function getZigHealth() {
  return publicFetch('/api/trust/zig-health');
}

export async function getGoldPrice() {
  return publicFetch('/api/trust/gold-price');
}

export async function getPrices() {
  return publicFetch('/api/trust/prices');
}

// ===== MUKANDO =====
export async function getUserMukandoGroups(phone: string) {
  return publicFetch(`/api/mukando/user/${phone}`);
}

export async function getMukandoGroup(groupId: string) {
  return publicFetch(`/api/mukando/${groupId}`);
}

export async function createMukandoGroup(token: string, data: {
  name: string;
  contribution_zig: number;
  cycle_months: number;
}) {
  return authFetch('/api/mukando/create', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function joinMukandoGroup(token: string, groupId: string) {
  return authFetch(`/api/mukando/${groupId}/join`, token, {
    method: 'POST',
  });
}

export async function contributeMukando(token: string, groupId: string) {
  return authFetch(`/api/mukando/${groupId}/contribute`, token, {
    method: 'POST',
  });
}

// ===== CREDIT SCORE =====
export async function getVimbisoScore(phone: string) {
  return publicFetch(`/api/credit/score/${phone}`);
}