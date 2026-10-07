import { jest } from '@jest/globals';

// El contrato del interceptor de respuesta (401 → logout atómico SOLO si la
// request llevaba Authorization). Se testea llamando la función exportada
// directamente con un AxiosError sintético, sin red ni instancia real.
jest.mock('@/features/identidad/store/sesion.store', () => {
  const logout = jest.fn();
  return {
    useSesionStore: {
      getState: () => ({ logout: logout as unknown }) as never,
      // Interceptor solo usa getState; el resto de la store no se consume aquí.
    },
    __logoutMock: logout,
  };
});

jest.mock('@/shared/api/queryClient', () => ({ queryClient: { clear: jest.fn() } }));

// Import tras los mocks.
import {
  interceptorError,
  type ApiErrorBody,
} from '@/shared/api/axios';
import type { AxiosError } from 'axios';
import { queryClient } from '@/shared/api/queryClient';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sesionMock = require('@/features/identidad/store/sesion.store') as {
  __logoutMock: jest.Mock;
};

function error401(conAuth: boolean): AxiosError<{ error?: ApiErrorBody }> {
  return {
    response: { status: 401 },
    config: {
      url: '/materias',
      headers: conAuth ? { Authorization: 'Bearer x' } : {},
    },
  } as unknown as AxiosError<{ error?: ApiErrorBody }>;
}

describe('interceptorError (401 y logout atómico)', () => {
  it('401 SIN Authorization: no desloguea', async () => {
    sesionMock.__logoutMock.mockClear();
    await expect(interceptorError(error401(false))).rejects.toThrow();
    expect(sesionMock.__logoutMock).not.toHaveBeenCalled();
    expect(queryClient.clear).not.toHaveBeenCalled();
  });

  it('401 CON Authorization: logout por ráfaga (el concurrente se deduplica)', async () => {
    sesionMock.__logoutMock.mockClear();
    (queryClient.clear as jest.Mock).mockClear();
    await expect(interceptorError(error401(true))).rejects.toThrow();
    expect(sesionMock.__logoutMock).toHaveBeenCalledTimes(1);

    // Ráfaga concurrente: 3 llamadas simultáneas, pero el logout atómico
    // solo corre una vez (bandera logoutInFlight).
    sesionMock.__logoutMock.mockClear();
    (queryClient.clear as jest.Mock).mockClear();
    await expect(
      Promise.all([
        interceptorError(error401(true)),
        interceptorError(error401(true)),
        interceptorError(error401(true)),
      ]),
    ).rejects.toThrow();
    expect(sesionMock.__logoutMock).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });

  it(' errores no-401: rechaza sin tocar la sesión', async () => {
    sesionMock.__logoutMock.mockClear();
    const error = { response: { status: 500 }, config: { url: '/x', headers: {} } } as unknown as
      AxiosError<{ error?: ApiErrorBody }>;
    await expect(interceptorError(error)).rejects.toThrow();
    expect(sesionMock.__logoutMock).not.toHaveBeenCalled();
  });
});
