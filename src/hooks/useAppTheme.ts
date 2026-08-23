import { colors } from '@/constants/theme';

export function useAppTheme() {
  // Study Companion currently has one curated visual theme. Keeping the
  // palette independent from the device appearance prevents mounted PWA tabs
  // from restoring with a mixture of the old dark and new pastel designs.
  return colors.light;
}
