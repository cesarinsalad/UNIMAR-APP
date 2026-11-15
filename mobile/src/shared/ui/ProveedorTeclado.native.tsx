import { KeyboardProvider } from 'react-native-keyboard-controller';

/** Contexto nativo del teclado (sticky toolbar, scroll aware del IME). */
export function ProveedorTeclado({ children }: { children: React.ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
