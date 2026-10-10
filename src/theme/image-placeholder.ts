const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" stroke="#868e96" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
<rect x="22" y="30" width="76" height="60" rx="8"/>
<circle cx="45" cy="52" r="7"/>
<path d="M22 80l24-22 16 14 14-12 22 20"/>
</svg>`;

/**
 * Imagem exibida quando o produto não tem foto (ex.: criado no admin, que não envia imagem) ou
 * quando o carregamento falha. É um data URI: não depende de rede e funciona no tema claro e escuro.
 */
export const IMAGE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
