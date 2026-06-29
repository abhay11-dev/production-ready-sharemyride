import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error('❌ VITE_API_URL is not set in environment variables');
}

const adminAxios = axios.create({
  baseURL: `${API_URL}/admin`,
});

// Interceptor to attach admin token
adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginAdmin = async (username, password) => {
  const response = await axios.post(`${API_URL}/admin/login`, { username, password });
  return response.data;
};

export const fetchRequests = async () => {
  const response = await adminAxios.get('/verifications');
  return response.data.data;
};

export const updateRequestStatus = async (id, status, remark) => {
  const response = await adminAxios.put(`/verifications/${id}`, { status, remark });
  return response.data;
};

export const fetchVerificationDocument = async (id, documentType) => {
  const response = await adminAxios.get(`/verifications/${id}/document/${documentType}`, {
    responseType: 'blob',
  });
  return {
    blob: response.data,
    contentType: response.headers['content-type'] || response.data.type || 'application/octet-stream',
  };
};

export { adminAxios };  // add at the bottom of adminService.jsc