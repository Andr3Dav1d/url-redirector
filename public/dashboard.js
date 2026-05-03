let API_KEY = '';
const OFFLINE_LABEL = 'Servidor offline';

function setOfflineState(isOffline) {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;
  banner.hidden = !isOffline;
  banner.textContent = OFFLINE_LABEL;
}

function submitKey() {
  const val = document.getElementById('key-input').value.trim();
  if (!val) return;
  API_KEY = val;
  document.getElementById('key-overlay').style.display = 'none';
  loadLinks();
}

function toast(msg, ok = true) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + (ok ? 'ok' : 'err');
  setTimeout(() => {
    el.className = '';
  }, 2500);
}

async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...(options.headers || {})
      }
    });
    setOfflineState(false);
    return res;
  } catch (error) {
    setOfflineState(true);
    toast(OFFLINE_LABEL, false);
    throw error;
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function loadLinks() {
  const tbody = document.getElementById('links-body');
  tbody.innerHTML = '<tr><td colspan="5" class="state-msg">Carregando...</td></tr>';
  try {
    const res = await apiFetch('/api/links');
    if (res.status === 401) {
      document.getElementById('key-error').textContent = 'Chave inválida';
      document.getElementById('key-overlay').style.display = 'flex';
      API_KEY = '';
      return;
    }
    const links = await res.json();
    document.getElementById('stat-links').textContent = links.length;
    document.getElementById('stat-clicks').textContent = links
      .reduce((s, l) => s + l.clicks, 0)
      .toLocaleString('pt-BR');
    if (!links.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="state-msg">Nenhum link cadastrado</td></tr>';
      return;
    }
    tbody.innerHTML = links
      .map(l => `<tr>
        <td class="td-slug">${l.slug}</td>
        <td class="td-url"><a href="${l.target_url}" target="_blank">${l.target_url}</a></td>
        <td class="td-clicks">${l.clicks.toLocaleString('pt-BR')}</td>
        <td class="td-date">${formatDate(l.created_at)}</td>
        <td><button class="btn-delete" data-slug="${l.slug}">Del</button></td>
      </tr>`)
      .join('');
  } catch (e) {
    setOfflineState(true);
    tbody.innerHTML = '<tr><td colspan="5" class="state-msg error">Erro ao carregar links</td></tr>';
  }
}

async function createLink() {
  const slug = document.getElementById('in-slug').value.trim();
  const url = document.getElementById('in-url').value.trim();
  if (!slug || !url) {
    toast('Preencha slug e URL', false);
    return;
  }
  const res = await apiFetch('/api/links', {
    method: 'POST',
    body: JSON.stringify({ slug, target_url: url })
  });
  if (res.ok) {
    document.getElementById('in-slug').value = '';
    document.getElementById('in-url').value = '';
    toast('/' + slug + ' criado');
    loadLinks();
  } else {
    const err = await res.json();
    toast(err.error || 'Erro ao criar', false);
  }
  setOfflineState(false);
}

async function deleteLink(slug) {
  if (!confirm('Deletar /' + slug + '?')) return;
  const res = await apiFetch('/api/links/' + slug, { method: 'DELETE' });
  if (res.ok) {
    toast('/' + slug + ' removido');
    loadLinks();
  } else {
    toast('Erro ao deletar', false);
  }
  setOfflineState(false);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('key-submit').addEventListener('click', submitKey);
  document.getElementById('key-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitKey();
  });
  document.getElementById('create-submit').addEventListener('click', createLink);
  document.getElementById('links-body').addEventListener('click', e => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    deleteLink(btn.dataset.slug);
  });
});
