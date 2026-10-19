// Painel lateral/gaveta reutilizável: estrutura com botão fechar, fundo (gaveta) e suporte a Esc.
import { ICONES } from '../ui.js';

export function criarPainel({ titulo, conteudo, aoFechar }) {
  const painel = document.createElement('aside');
  painel.className = 'painel';
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-modal', 'false');

  const idTitulo = 'painel-titulo-' + Math.random().toString(36).slice(2, 8);
  painel.setAttribute('aria-labelledby', idTitulo);

  const cabeca = document.createElement('div');
  cabeca.className = 'painel-cabeca';

  const h2 = document.createElement('h2');
  h2.id = idTitulo;
  h2.className = 'painel-titulo';
  h2.textContent = titulo;

  const btnFechar = document.createElement('button');
  btnFechar.type = 'button';
  btnFechar.className = 'btn icon-only sm painel-fechar';
  btnFechar.setAttribute('aria-label', 'Fechar');
  btnFechar.innerHTML = ICONES.x;
  btnFechar.addEventListener('click', () => { if (aoFechar) aoFechar(); });

  cabeca.append(h2, btnFechar);

  const corpo = document.createElement('div');
  corpo.className = 'painel-corpo';
  if (conteudo) corpo.appendChild(conteudo);

  painel.append(cabeca, corpo);

  // Fundo escuro só aparece abaixo de 1280px (gaveta); clique fecha.
  const fundo = document.createElement('div');
  fundo.className = 'painel-fundo';
  fundo.setAttribute('aria-hidden', 'true');
  fundo.addEventListener('click', () => { if (aoFechar) aoFechar(); });

  const envoltorio = document.createElement('div');
  envoltorio.className = 'painel-envoltorio';
  envoltorio.append(fundo, painel);

  // Esc fecha o painel
  const aoTeclar = (e) => {
    if (e.key === 'Tab' && painel.getAttribute('aria-modal') === 'true') {
      const alvos = [...painel.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')];
      const primeiro = alvos[0];
      const ultimo = alvos.at(-1);
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo?.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus(); }
    }
    if (e.key === 'Escape') {
      if (e.defaultPrevented) return;
      e.preventDefault();
      e.stopPropagation();
      if (aoFechar) aoFechar();
    }
  };
  painel.addEventListener('keydown', aoTeclar);

  return envoltorio;
}