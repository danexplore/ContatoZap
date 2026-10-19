// Funções puras de texto: comparação sem acento, telefone, iniciais e tempo relativo.

export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function contemTexto(alvo, termo) {
  const procurado = normalizar(termo);
  if (!procurado) return true;
  return normalizar(alvo).includes(procurado);
}

export function apenasDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

export function formatarTelefone(telefone) {
  const digitos = apenasDigitos(telefone);
  if (!digitos) return '—';
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    const ddd = digitos.slice(2, 4);
    const resto = digitos.slice(4);
    if (resto.length === 9) return `+55 (${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
    if (resto.length === 8) return `+55 (${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  }
  if (digitos.length > 7) return `+${digitos.slice(0, 2)} ${digitos.slice(2, 6)} ${digitos.slice(6)}`;
  return `+${digitos}`;
}

// Ignora emoji, bandeira, pontuação e marcas invisíveis (como U+200E) no começo da palavra
const primeiraLetraOuNumero = (palavra) => palavra.match(/[\p{L}\p{N}]/u)?.[0];

export function iniciais(nome) {
  const letras = String(nome ?? '').split(/\s+/).map(primeiraLetraOuNumero).filter(Boolean);
  if (!letras.length) return '?';
  const ultima = letras.length > 1 ? letras[letras.length - 1] : '';
  return (letras[0] + ultima).toUpperCase();
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export function tempoRelativo(timestamp, agora) {
  const decorrido = Math.max(0, agora - timestamp);
  if (decorrido < MINUTO) return 'agora mesmo';
  if (decorrido < HORA) return `há ${Math.floor(decorrido / MINUTO)} min`;
  if (decorrido < DIA) return `há ${Math.floor(decorrido / HORA)} h`;
  const dias = Math.floor(decorrido / DIA);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

// Tamanho do grupo; 0 ou desconhecido = a contagem ainda não veio do WhatsApp
export function textoMembros(total) {
  return total > 0 ? `${total} ${total === 1 ? 'membro' : 'membros'}` : 'Membros pendentes';
}
