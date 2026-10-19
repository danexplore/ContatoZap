// Avatar: iniciais na cor fixa do id; com foto, a imagem fica por cima e some se falhar.
import { iniciais } from '../logica/texto.js';
import { corDoId } from '../logica/cor.js';

const PROPORCAO_FONTE = 0.4;

export function criarAvatar({ id, nome, foto = null, tamanho = 32, forma = 'circulo' }) {
  const avatar = document.createElement('span');
  avatar.className = `avatar avatar--${forma === 'quadrado' ? 'quadrado' : 'circulo'}`;
  avatar.setAttribute('aria-hidden', 'true');
  avatar.style.backgroundColor = corDoId(id);
  if (tamanho === 'preencher') {
    avatar.classList.add('avatar--preencher');
  } else {
    avatar.style.width = `${tamanho}px`;
    avatar.style.height = `${tamanho}px`;
    avatar.style.fontSize = `${Math.round(tamanho * PROPORCAO_FONTE)}px`;
  }

  const letras = document.createElement('span');
  letras.className = 'avatar-iniciais';
  letras.textContent = iniciais(nome);
  avatar.appendChild(letras);

  if (foto) {
    const img = document.createElement('img');
    img.className = 'avatar-foto';
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      img.remove();
      avatar.classList.remove('avatar--com-foto');
    });
    img.src = foto;
    avatar.classList.add('avatar--com-foto');
    avatar.appendChild(img);
  }
  return avatar;
}
