const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('moneymap_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    error.errorCode = data.errorCode;
    error.details = data.details;
    throw error;
  }
  return data;
}

async function uploadFile(endpoint, formData) {
  const token = localStorage.getItem('moneymap_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Don't set Content-Type — browser sets multipart boundary automatically

  const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers, body: formData });
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || 'Upload failed');
    error.status = res.status;
    error.errorCode = data.errorCode;
    error.details = data.details;
    throw error;
  }
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
  deleteWithBody: (url, body) => request(url, { method: 'DELETE', body: JSON.stringify(body) }),
  upload: (url, formData) => uploadFile(url, formData),
};

