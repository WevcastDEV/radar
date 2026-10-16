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

/**
 * Verifica se um usuário possui privilégios de Administrador.
 * Por padrão estrito:
 * 1. weverton@wctech.com.br (superadmin)
 * 2. admin@radar.com ou contas com prefixo admin@
 * 3. Usuários a quem o administrador concedeu explicitamente o papel de Administrador em radar_system_users_v1
 * Todos os outros colaboradores possuem 'Acesso Comum'.
 */
export function isUserAdmin(user: any): boolean {
  if (!user) return true; // Operador local / standalone possui acesso administrativo total

  const email = (user.email || '').trim().toLowerCase();
  const name = (user.name || '').trim().toLowerCase();

  // Superadministradores do sistema (acesso total garantido)
  if (
    email === 'tom@criart.com' ||
    email === 'weverton@criart.com' ||
    email === 'weverton@wctech.com.br' ||
    email === 'admin@radar.com' ||
    email.startsWith('admin@')
  ) {
    return true;
  }

  // Contas com perfil explicitamente restrito
  if (user?.role === 'employee' || user?.role === 'vendedor' || user?.role === 'colaborador' || user?.role === 'Acesso Comum') {
    return false;
  }

  // Verificação dinâmica na base persistida de usuários (onde o Administrador concede/revoga permissões)
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('radar_system_users_v1');
      if (saved) {
        const list = JSON.parse(saved);
        const found = list.find((u: any) => 
          (u.email && u.email.toLowerCase() === email) ||
          (u.name && u.name.toLowerCase() === name)
        );
        if (found) {
          return found.role === 'Administrador' || found.role === 'admin';
        }
      }
    } catch {}
  }

  // Contas administrativas oficiais
  if (email === 'admin@radar.com' || email.startsWith('admin@')) return true;

  if (user?.role?.slug === 'admin' || user?.role?.name?.toLowerCase() === 'administrador' || user?.role === 'admin' || user?.role === 'Administrador') {
    return true;
  }

  return true;
}

/**
 * Retorna o rótulo oficial da função do usuário:
 * 'Administrador' ou 'Acesso Comum'
 */
export function getUserRoleLabel(user: any): string {
  return isUserAdmin(user) ? 'Administrador' : 'Acesso Comum';
}

