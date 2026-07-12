// src/services/trustedContactsService.js


import api from '../config/api';

export const getTrustedContacts = async () => {
  const res = await api.get('/trusted-contacts');
  return res.data.data;
};

export const addTrustedContact = async (contact) => {
  const res = await api.post('/trusted-contacts', contact);
  return res.data.data;
};

export const updateTrustedContact = async (contactId, updates) => {
  const res = await api.patch(`/trusted-contacts/${contactId}`, updates);
  return res.data.data;
};

export const removeTrustedContact = async (contactId) => {
  const res = await api.delete(`/trusted-contacts/${contactId}`);
  return res.data.data;
};

export default { getTrustedContacts, addTrustedContact, updateTrustedContact, removeTrustedContact };