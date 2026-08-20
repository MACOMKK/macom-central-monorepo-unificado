import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';

// lucide-react nao tem um icone de marca pro X/Twitter atual -- SVG proprio, mesmo padrao dos
// outros icones de marca aqui (WhatsApp), pra nao usar um icone generico (ex. ExternalLink) no
// lugar da marca.
export function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.868-2.03-.967-.273-.099-.472-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.003 2C6.478 2 2 6.477 2 12c0 1.892.526 3.658 1.44 5.166L2 22l4.955-1.412A9.936 9.936 0 0 0 12.003 22C17.527 22 22 17.523 22 12S17.527 2 12.003 2zm0 18.09a8.06 8.06 0 0 1-4.354-1.264l-.312-.186-2.94.838.842-2.868-.203-.313A8.06 8.06 0 1 1 20.06 12a8.07 8.07 0 0 1-8.057 8.09z" />
    </svg>
  );
}

// Ordem: WhatsApp primeiro (canal de compartilhamento mais usado hoje), depois redes de marca em
// ordem alfabetica.
export const SOCIAL_NETWORKS = {
  whatsapp: { label: 'WhatsApp', Icon: WhatsAppIcon },
  facebook: { label: 'Facebook', Icon: Facebook },
  instagram: { label: 'Instagram', Icon: Instagram },
  linkedin: { label: 'LinkedIn', Icon: Linkedin },
  x: { label: 'X', Icon: XIcon },
  youtube: { label: 'YouTube', Icon: Youtube },
};

/**
 * Botao/link de rede social com o icone de marca correto (nunca um icone generico tipo
 * ExternalLink). `network` e uma chave de SOCIAL_NETWORKS; `href` e o link de destino (perfil ou
 * URL de compartilhamento ja montada pelo caller).
 */
export function SocialLink({ network, href, className = '', iconClassName = 'h-4 w-4', showLabel = true, ...props }) {
  const entry = SOCIAL_NETWORKS[network];
  if (!entry || !href) return null;
  const { label, Icon } = entry;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Compartilhar via ${label}`}
      className={className}
      {...props}
    >
      <Icon className={iconClassName} />
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </a>
  );
}
