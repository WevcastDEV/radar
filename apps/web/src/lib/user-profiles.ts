export interface PersistentUserProfile {
  id?: string;
  email: string;
  name?: string;
  avatar?: string;
  updatedAt: number;
}

const STORAGE_KEY = 'radar_persistent_profiles_v1';
const LAST_ACTIVE_EMAIL_KEY = 'radar_last_active_email_v1';

function normalizeKey(str?: string): string {
  return (str || '').trim().toLowerCase();
}

/**
 * Retorna todos os perfis persistidos localmente (chaveados por e-mail e ID).
 */
export function getAllPersistentProfiles(): Record<string, PersistentUserProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

/**
 * Busca o perfil customizado persistente por e-mail, identificador ou ID.
 */
export function getPersistentProfile(identifierOrEmail?: string, id?: string): PersistentUserProfile | null {
  if (typeof window === 'undefined') return null;
  const profiles = getAllPersistentProfiles();

  const normEmail = normalizeKey(identifierOrEmail);
  if (normEmail && profiles[normEmail]) {
    return profiles[normEmail];
  }

  const normId = normalizeKey(id);
  if (normId && profiles[normId]) {
    return profiles[normId];
  }

  // Busca flexível: prefixo antes do '@' ou nome correspondente
  if (normEmail) {
    for (const key of Object.keys(profiles)) {
      const p = profiles[key];
      if (
        key === normEmail ||
        key.split('@')[0] === normEmail ||
        normalizeKey(p.email) === normEmail ||
        normalizeKey(p.name) === normEmail
      ) {
        return p;
      }
    }
  }

  return null;
}

/**
 * Salva permanentemente as informações de perfil (avatar, nome) no localStorage,
 * garantindo que sobrevivam a logout, fechamento do navegador e reconexões.
 */
export function savePersistentProfile(user: { id?: string; email?: string; name?: string; avatar?: string }): void {
  if (typeof window === 'undefined' || (!user.email && !user.id && !user.name)) return;
  try {
    const profiles = getAllPersistentProfiles();
    const primaryKey = normalizeKey(user.email) || normalizeKey(user.id) || normalizeKey(user.name);
    if (!primaryKey) return;

    const existing = profiles[primaryKey] || {};
    const updated: PersistentUserProfile = {
      ...existing,
      id: user.id || existing.id,
      email: user.email || existing.email || primaryKey,
      name: user.name || existing.name,
      avatar: user.avatar !== undefined ? user.avatar : existing.avatar,
      updatedAt: Date.now(),
    };

    profiles[primaryKey] = updated;
    if (user.id) {
      profiles[normalizeKey(user.id)] = updated;
    }
    if (user.email) {
      profiles[normalizeKey(user.email)] = updated;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    if (updated.email) {
      localStorage.setItem(LAST_ACTIVE_EMAIL_KEY, updated.email);
    }

    // Sincroniza também com contas salvas de login (radar_saved_accounts_v1)
    try {
      const savedAccountsRaw = localStorage.getItem('radar_saved_accounts_v1');
      if (savedAccountsRaw) {
        const savedList = JSON.parse(savedAccountsRaw);
        const updatedList = savedList.map((acc: any) => {
          if (
            normalizeKey(acc.identifier) === primaryKey ||
            normalizeKey(acc.identifier) === normalizeKey(user.email) ||
            normalizeKey(acc.identifier).split('@')[0] === primaryKey
          ) {
            return {
              ...acc,
              name: updated.name || acc.name,
              avatar: updated.avatar,
            };
          }
          return acc;
        });
        localStorage.setItem('radar_saved_accounts_v1', JSON.stringify(updatedList));
      }
    } catch {}

    // Sincroniza também com a listagem de usuários do sistema (radar_system_users_v1)
    try {
      const systemUsersRaw = localStorage.getItem('radar_system_users_v1');
      if (systemUsersRaw) {
        const userList = JSON.parse(systemUsersRaw);
        const updatedList = userList.map((u: any) => {
          if (
            normalizeKey(u.email) === primaryKey ||
            normalizeKey(u.email) === normalizeKey(user.email) ||
            normalizeKey(u.id) === normalizeKey(user.id)
          ) {
            return {
              ...u,
              name: updated.name || u.name,
              avatar: updated.avatar,
            };
          }
          return u;
        });
        localStorage.setItem('radar_system_users_v1', JSON.stringify(updatedList));
      }
    } catch {}
  } catch (err) {
    console.warn('Erro ao salvar perfil persistente:', err);
  }
}

/**
 * Mescla qualquer objeto de usuário com as customizações persistentes salvas
 * (foto de perfil em base64 e nome customizado).
 */
export function mergeWithPersistentProfile<T extends { id?: string; email?: string; name?: string; avatar?: string }>(
  user: T
): T;
export function mergeWithPersistentProfile<T extends { id?: string; email?: string; name?: string; avatar?: string }>(
  user: T | null
): T | null;
export function mergeWithPersistentProfile<T extends { id?: string; email?: string; name?: string; avatar?: string }>(
  user: T | null | undefined
): T | null | undefined;
export function mergeWithPersistentProfile<T extends { id?: string; email?: string; name?: string; avatar?: string }>(
  user: T | null | undefined
): T | null | undefined {
  if (!user) return user;
  const saved = getPersistentProfile(user.email, user.id);
  if (!saved) return user;

  return {
    ...user,
    name: saved.name || user.name,
    avatar: saved.avatar !== undefined ? saved.avatar : user.avatar,
  };
}
