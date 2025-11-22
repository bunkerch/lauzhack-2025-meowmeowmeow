// API authentication configuration for staff scanner
// In production, this would be securely stored and managed
export const STAFF_API_KEY = 'cff-staff-api-key-2024';

export function getAuthHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${STAFF_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

