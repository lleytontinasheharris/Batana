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
  date_of_birth: string;
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
export async function getExchangeRates() {
  return publicFetch('/api/trust/exchange-rates');  
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

// ===== VERIFICATION =====
export async function submitVerification(token: string, data: {
  document_type: 'national_id' | 'passport';
  document_number: string;
  document_front_base64: string;
  document_back_base64?: string;
}) {
  return authFetch('/api/verify/submit', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getVerificationStatus(token: string) {
  return authFetch('/api/verify/status', token);
}

// ===== ADMIN =====
export async function getAdminVerifications(token: string, status = 'pending') {
  return authFetch(`/api/admin/verifications?status=${status}`, token);
}

export async function approveVerification(token: string, verificationId: string) {
  return authFetch(`/api/admin/verifications/${verificationId}/approve`, token, {
    method: 'POST',
  });
}

export async function rejectVerification(token: string, verificationId: string, reason: string) {
  return authFetch(`/api/admin/verifications/${verificationId}/reject`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function makeMeAdmin(token: string) {
  return authFetch('/api/admin/make-admin', token, {
    method: 'POST',
  });
}

// ===== INSURANCE =====
export async function getInsurancePlans() {
  return publicFetch('/api/insurance/plans');
}

export async function getMyPolicies(token: string) {
  return authFetch('/api/insurance/my-policies', token);
}

export async function enrollInsurance(token: string, plan_id: string) {
  return authFetch('/api/insurance/enroll', token, {
    method: 'POST',
    body: JSON.stringify({ plan_id }),
  });
}

export async function cancelPolicy(token: string, policyId: string) {
  return authFetch(`/api/insurance/cancel/${policyId}`, token, {
    method: 'POST',
  });
}

export async function submitClaim(token: string, policyId: string, data: {
  description: string;
  days_hospitalised?: number;
}) {
  return authFetch(`/api/insurance/claim/${policyId}`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== LOANS =====
export async function getLoanEligibility(token: string) {
  return authFetch('/api/loans/eligibility', token);
}

export async function applyForLoan(token: string, data: {
  amount_usd: number;
  purpose?: string;
  pin: string;
  next_of_kin_id?: string;
}) {
  return authFetch('/api/loans/apply', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMyLoans(token: string) {
  return authFetch('/api/loans/my-loans', token);
}

export async function repayLoan(token: string, loanId: string, amount_zig: number) {
  return authFetch(`/api/loans/${loanId}/repay`, token, {
    method: 'POST',
    body: JSON.stringify({ amount_zig }),
  });
}

// ===== NEXT OF KIN =====
export async function getMyKin(token: string) {
  return authFetch('/api/kin/my-kin', token);
}

export async function addKin(token: string, data: {
  full_name: string;
  relationship: string;
  phone_number: string;
  national_id: string;
  is_primary?: boolean;
}) {
  return authFetch('/api/kin/add', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateKin(token: string, kinId: string, data: Partial<{
  full_name: string;
  relationship: string;
  phone_number: string;
  national_id: string;
  is_primary: boolean;
}>) {
  return authFetch(`/api/kin/${kinId}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteKin(token: string, kinId: string) {
  return authFetch(`/api/kin/${kinId}`, token, {
    method: 'DELETE',
  });
}

// ===== STORE =====
export async function storeLookup(token: string, verification_code: string) {
  return authFetch('/api/store/lookup', token, {
    method: 'POST',
    body: JSON.stringify({ verification_code }),
  });
}

export async function storeConfirm(token: string, data: {
  loan_id: string;
  verification_code: string;
  notes?: string;
}) {
  return authFetch('/api/store/confirm', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function storeReject(token: string, data: {
  loan_id: string;
  verification_code: string;
  reason?: string;
}) {
  return authFetch('/api/store/reject', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== INVEST =====
export async function getInvestmentPools(token: string) {
  return authFetch('/api/invest/pools', token);
}

export async function getPoolDetail(token: string, poolId: string) {
  return authFetch(`/api/invest/pools/${poolId}`, token);
}

export async function contributeToPool(token: string, data: {
  pool_id: string;
  amount_usd: number;
}) {
  return authFetch('/api/invest/contribute', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMyInvestments(token: string) {
  return authFetch('/api/invest/my-investments', token);
}

export async function applyForLoanUpdated(token: string, data: {
  amount_usd: number;
  purpose?: string;
  pin: string;
  next_of_kin_id?: string;
}) {
  return authFetch('/api/loans/apply', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}