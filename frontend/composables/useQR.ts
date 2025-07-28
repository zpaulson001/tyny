import { renderSVG } from 'uqr';

export function useQR(link: Ref<string>) {
  const qrSVG = computed(() => {
    return renderSVG(link.value);
  });

  return {
    qrSVG,
  };
}
