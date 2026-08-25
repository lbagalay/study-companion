import { useTheme } from '@/providers/ThemeProvider';

export function useAppTheme() {
  return useTheme().palette;
}
