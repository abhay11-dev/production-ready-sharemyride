const STORAGE_KEY = 'sharemyride_recent_tickets';

export const getStoredTickets = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to read saved tickets:', error);
    return [];
  }
};

export const saveTicketToStorage = ({ id, subject, status = 'open' }) => {
  if (!id || !subject) return getStoredTickets();

  const nextTickets = [
    { id, subject, status, savedAt: new Date().toISOString() },
    ...getStoredTickets().filter(ticket => ticket.id !== id),
  ].slice(0, 8);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTickets));
  }

  return nextTickets;
};

export const clearStoredTickets = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};
