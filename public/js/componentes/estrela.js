// Estrela de fixar: botão de alternância. O clique não chega ao item em volta (que abriria o grupo).
export function criarEstrela({ ativa, rotulo, aoAlternar }) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `estrela${ativa ? ' estrela--ativa' : ''}`;
  botao.setAttribute('aria-pressed', ativa ? 'true' : 'false');
  const acao = `${ativa ? 'Desafixar' : 'Fixar'} ${rotulo}`;
  botao.setAttribute('aria-label', acao);
  botao.title = acao;

  const simbolo = document.createElement('span');
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.textContent = ativa ? '★' : '☆';
  botao.appendChild(simbolo);

  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    aoAlternar();
  });
  return botao;
}
