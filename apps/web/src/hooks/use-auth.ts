import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { setTokens, clearTokens } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import { LoginRequest, LoginResponse, UserProfile, ApiResponse } from '@radar/types';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { setUser, logout: storeLogout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
      if (!response.data.success) throw new Error(response.data.error || 'Falha no login');
      return response.data.data!;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      router.push('/');
      toast.success('Bem-vindo ao Radar de Oportunidades!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
    },
  });

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // A sessão local deve ser encerrada mesmo quando a API já estiver offline.
    } finally {
      storeLogout();
      router.replace('/login');
    }
  };

  const useProfile = () => {
    return useQuery({
      queryKey: ['profile'],
      queryFn: async () => {
        const response = await api.get<ApiResponse<UserProfile>>('/auth/me');
        return response.data.data!;
      },
      retry: false,
    });
  };

  return {
    login: loginMutation.mutate,
    isLoading: loginMutation.isPending,
    logout,
    useProfile,
  };
}
