// Mock users for local development testing
// This file is only used when running locally without SSO

export const MOCK_USERS = [
  {
    id: 'user-1',
    email: 'sy.lee@deep-dive.kr',
    name: '이소영',
    company: 'Deep Dive'
  },
  {
    id: 'user-2',
    email: 'john.kim@vibers.ai',
    name: '김영수',
    company: 'Vibers AI'
  },
  {
    id: 'user-3',
    email: 'sarah.park@example.com',
    name: '박사라',
    company: 'Example Corp'
  },
  {
    id: 'user-4',
    email: 'mike.jung@test.com',
    name: '정마이클',
    company: 'Test Company'
  },
  {
    id: 'user-5',
    email: 'admin@vibers.ai',
    name: 'Admin',
    company: 'Vibers AI'
  }
];

// Check if we're in development mode
export const isDevelopment = () => {
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};