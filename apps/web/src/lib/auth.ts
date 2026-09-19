export const getTokens = () => {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  if (!accessToken) return null;
  return { accessToken, refreshToken };
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const isAuthenticated = () => {
  return !!getTokens();
};
