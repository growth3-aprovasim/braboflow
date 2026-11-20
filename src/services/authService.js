// Serviço de Autenticação e Permissões do BraboFlow
// As credenciais são configuradas exclusivamente via variáveis de ambiente (.env):
// VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD, VITE_VIEWER_EMAIL, VITE_VIEWER_PASSWORD

const AUTH_SESSION_KEY = 'bflow_auth_session_v1';

export async function authenticateUser(identifier, password) {
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPass = String(password || '');

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'Preencha e-mail e senha.' };
  }

  const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(import.meta.env.VITE_ADMIN_PASSWORD || '');
  const viewerEmail = String(import.meta.env.VITE_VIEWER_EMAIL || '').trim().toLowerCase();
  const viewerPassword = String(import.meta.env.VITE_VIEWER_PASSWORD || '');

  let result = null;

  // Se as variáveis foram embutidas no build/dev do Vite, valida localmente
  if (adminEmail || viewerEmail) {
    let matchedUser = null;

    if (adminEmail && adminPassword && cleanId === adminEmail && cleanPass === adminPassword) {
      matchedUser = {
        id: 'user-editor',
        email: adminEmail,
        name: 'Administrador',
        role: 'editor',
        roleLabel: 'Editor (Acesso Total)'
      };
    } else if (viewerEmail && viewerPassword && cleanId === viewerEmail && cleanPass === viewerPassword) {
      matchedUser = {
        id: 'user-viewer',
        email: viewerEmail,
        name: 'Visualizador',
        role: 'viewer',
        roleLabel: 'Visualizador (Somente Leitura)'
      };
    }

    if (!matchedUser) {
      return { success: false, error: 'E-mail ou senha inválidos.' };
    }

    result = {
      success: true,
      user: {
        ...matchedUser,
        loggedInAt: new Date().toISOString()
      }
    };
  } else {
    // Em produção (Docker / EasyPanel), valida em runtime via servidor Node (.env / process.env)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass })
      });
      const data = await response.json();
      if (!data?.success || !data?.user) {
        return {
          success: false,
          error: data?.error || 'E-mail ou senha inválidos.'
        };
      }
      result = data;
    } catch (err) {
      console.error('Erro ao autenticar no servidor:', err);
      return {
        success: false,
        error: 'Credenciais não configuradas nas variáveis de ambiente (.env).'
      };
    }
  }

  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(result.user));
  } catch (err) {
    console.warn('Erro ao salvar sessão no localStorage:', err);
  }

  return { success: true, user: result.user };
}

export function getSavedSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.role && parsed.id) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function logoutSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function canUserEdit(user) {
  return user?.role === 'editor';
}
