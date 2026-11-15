/** La web no usa la capa nativa de teclado; el proveedor es transparente. */
export function ProveedorTeclado({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
