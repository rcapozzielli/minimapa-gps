// Declarações para imports que o TypeScript não reconhece sozinho.

// CSS do sickmaps: o pacote o exporta como "@iantroisi/sickmaps/css" (sem extensão .css),
// então o TypeScript não sabe que é CSS. O Vite resolve e injeta normalmente.
declare module '@iantroisi/sickmaps/css';
