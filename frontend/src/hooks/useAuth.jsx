import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext.jsx';

export const useAuth = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useAuth must be used within UserProvider');
  }
  return context;
};