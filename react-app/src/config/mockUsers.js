// Mock users for local development testing
// This file is only used when running locally without SSO

export const MOCK_USERS = [
  {
    id: 'user-1',
    email: 'admin@verish.com',
    name: 'Verish Admin',
    company: 'verish'
  },
  {
    id: 'user-2',
    email: 'admin@seedlab.com',
    name: 'Seedlab Admin',
    company: 'seedlab'
  },
  {
    id: 'user-3',
    email: 'sy.lee@deep-dive.kr',
    name: '이소영',
    company: 'Deep Dive'
  },
  {
    id: 'user-4',
    email: 'john.kim@vibers.ai',
    name: '김영수',
    company: 'Vibers AI'
  },
  {
    id: 'user-5',
    email: 'admin@example.com',
    name: 'Example User',
    company: 'Example Corp'
  }
];

// Check if we're in development mode
export const isDevelopment = () => {
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};