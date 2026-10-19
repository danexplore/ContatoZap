// Card de participante para a grade: foto ocupando o card, etiquetas sobre a foto, nome e telefone embaixo.
import { formatarTelefone } from '../logica/texto.js';
import { criarAvatar } from './avatar.js';

/**
 * @param {{ participante: object, selecionado: boolean, aoAbrir: (id: string) => void }} props
 * @returns {HTMLElement}
 */
export function criarCardParticipante({ participante, selecionado, aoAbrir }) {
  const card = document.createElement('div');
  card.className = 'card-participante' + (selecionado ? ' ativo' : '');
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  const nome = participante.pushname || participante.name || '';
  const telefone = participante.phone ? formatarTelefone(participante.phone) : '';
  card.setAttribute('aria-label', `${nome || 'Sem nome'}${telefone ? ', ' + telefone : ''}`);
  card.dataset.id = participante.id;

  // Container da foto com etiquetas sobrepostas
  const fotoWrap = document.createElement('div');
  fotoWrap.className = 'card-foto-wrap';
  fotoWrap.appendChild(criarAvatar({
    id: participante.id,
    nome,
    foto: participante.photoUrl || null,
    tamanho: 'preencher',
    forma: 'quadrado',
  }));

  if (participante.admin) {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'card-etiqueta admin';
    etiqueta.textContent = 'Admin';
    fotoWrap.appendChild(etiqueta);
  }
  if (participante.hidden) {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'card-etiqueta privado';
    etiqueta.textContent = 'Privado';
    fotoWrap.appendChild(etiqueta);
  }

  // Textos abaixo da foto
  const textos = document.createElement('div');
  textos.className = 'card-textos';
  const nomeEl = document.createElement('span');
  nomeEl.className = 'card-nome';
  nomeEl.textContent = nome || '(Sem nome)';
  nomeEl.title = nome;
  const telEl = document.createElement('span');
  telEl.className = 'card-telefone';
  telEl.textContent = telefone;
  textos.append(nomeEl, telEl);

  card.append(fotoWrap, textos);

  card.addEventListener('click', () => aoAbrir(participante.id));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoAbrir(participante.id); }
  });

  return card;
}
