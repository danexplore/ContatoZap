// Utilitários de interface: aviso (toast), copiar, baixar arquivo, preview de foto e ícones SVG fixos.

export const $ = (id) => document.getElementById(id);

/* SVG inline (estilo Lucide). Só markup fixo: é o único conteúdo aceito em innerHTML. */
export const ICONES = {
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  alertCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  alertTriangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  setaBaixo: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
};

export function criarIcone(nome) {
  const molde = document.createElement('template');
  molde.innerHTML = ICONES[nome];
  return molde.content.firstElementChild;
}

/* ========== AVISO (TOAST) ========== */
const ICONE_POR_TIPO = { success: 'checkCircle', error: 'alertCircle', warning: 'alertTriangle', info: 'info' };
const TITULO_POR_TIPO = { success: 'Sucesso', error: 'Erro', warning: 'Atenção', info: 'Informação' };

export function mostrarAviso(texto, tipo = 'info', duracao = 5000) {
  const container = $('toastContainer');
  const aviso = document.createElement('div');
  aviso.className = `toast ${tipo}`;
  aviso.setAttribute('role', 'alert');

  const conteudo = document.createElement('div');
  conteudo.className = 'toast-content';
  const titulo = document.createElement('div');
  titulo.className = 'toast-title';
  titulo.textContent = TITULO_POR_TIPO[tipo] || 'Informação';
  const mensagem = document.createElement('div');
  mensagem.className = 'toast-message';
  mensagem.textContent = texto;
  conteudo.append(titulo, mensagem);

  const fechar = document.createElement('button');
  fechar.className = 'toast-close';
  fechar.setAttribute('aria-label', 'Fechar notificação');
  fechar.innerHTML = ICONES.x;
  fechar.addEventListener('click', () => dispensarAviso(aviso));

  aviso.append(criarIcone(ICONE_POR_TIPO[tipo] || 'info'), conteudo, fechar);
  container.appendChild(aviso);

  if (tipo === 'success' || tipo === 'info') {
    setTimeout(() => dispensarAviso(aviso), duracao);
  }
}

function dispensarAviso(aviso) {
  if (!aviso.parentNode) return;
  aviso.style.opacity = '0';
  aviso.style.transform = 'translateX(40px)';
  aviso.style.transition = 'opacity 200ms ease-in, transform 200ms ease-in';
  setTimeout(() => aviso.remove(), 220);
}

/* ========== COPIAR E BAIXAR ========== */
export function copiarTexto(texto, msgSucesso = 'Copiado!') {
  if (!texto) { mostrarAviso('Nenhum dado para copiar.', 'error'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(() => mostrarAviso(msgSucesso, 'success'), () => copiarPorTextarea(texto, msgSucesso));
  } else {
    copiarPorTextarea(texto, msgSucesso);
  }
}

function copiarPorTextarea(texto, msgSucesso) {
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); mostrarAviso(msgSucesso, 'success'); } catch (_) { mostrarAviso('Falha ao copiar.', 'error'); }
  ta.remove();
}

export function baixarArquivo(blob, nome) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ========== PREVIEW DE FOTO ========== */
export function abrirPreviewFoto(url, nome) {
  const overlay = document.createElement('div');
  overlay.className = 'photo-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', nome ? `Foto de ${nome}` : 'Foto de perfil');

  const origem = document.activeElement;
  const fechar = () => { overlay.remove(); document.removeEventListener('keydown', aoTeclar); origem?.focus({ preventScroll: true }); };
  const aoTeclar = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); fechar(); }
    if (e.key === 'Tab') { e.preventDefault(); botaoFechar.focus(); }
  };
  overlay.addEventListener('click', fechar);

  const img = document.createElement('img');
  img.src = url;
  img.className = 'photo-modal-img';
  img.alt = nome || 'Foto de perfil';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('click', (e) => e.stopPropagation());

  const botaoFechar = document.createElement('button');
  botaoFechar.className = 'photo-modal-close';
  botaoFechar.setAttribute('aria-label', 'Fechar foto');
  botaoFechar.innerHTML = ICONES.x;
  botaoFechar.addEventListener('click', (e) => { e.stopPropagation(); fechar(); });

  overlay.append(img, botaoFechar);
  if (nome) {
    const legenda = document.createElement('div');
    legenda.className = 'photo-modal-name';
    legenda.textContent = nome;
    overlay.appendChild(legenda);
  }
  document.body.appendChild(overlay);
  document.addEventListener('keydown', aoTeclar);
  botaoFechar.focus();
}
