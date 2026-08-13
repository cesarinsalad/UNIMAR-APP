import { UnauthorizedError } from '../../../shared/errors';
import type { CredencialesUniversitarias, IUniversityAuthService, PerfilUniversitario } from '../domain/ports';

interface MockUsuario {
  email: string;
  password: string;
  cedula: string;
  nombre: string;
  decanatoId: number | null;
  emailFromProfile?: string;
}

const MOCK_USUARIOS: MockUsuario[] = [
  {
    email: 'ana.estudiante@unimar.edu.ve',
    password: 'unimar123',
    cedula: '20123456',
    nombre: 'Ana Estudiante',
    decanatoId: 5,
  },
  {
    email: 'bruno.otra@unimar.edu.ve',
    password: 'unimar123',
    cedula: '21234567',
    nombre: 'Bruno OtraEscuela',
    decanatoId: 3,
  },
  {
    email: 'flavio.rosales@unimar.edu.ve',
    password: 'unimar123',
    cedula: '17420667',
    nombre: 'Flavio Rosales (Comunicador)',
    decanatoId: 5,
  },
  {
    email: 'cgarcia.5516@unimar.edu.ve',
    password: 'unimar123',
    cedula: '30065516',
    nombre: 'César García (Admin)',
    decanatoId: null,
  },
];

const LATENCIA_SIMULADA_MS = 400;

/**
 * Implementación mock del puerto IUniversityAuthService.
 * Simula la latencia de red y la respuesta exitosa/fallida de la API de UNIMAR.
 * Será reemplazada por ApiUniversityAuthService sin tocar el dominio.
 */
export class MockUniversityAuthService implements IUniversityAuthService {
  async validateCredentials(
    credenciales: CredencialesUniversitarias,
  ): Promise<PerfilUniversitario> {
    await new Promise((r) => setTimeout(r, LATENCIA_SIMULADA_MS));

    const usuario = MOCK_USUARIOS.find(
      (u) => u.email === credenciales.email && u.password === credenciales.password,
    );

    if (!usuario) {
      throw new UnauthorizedError('Credenciales institucionales inválidas');
    }

    return {
      cedula: usuario.cedula,
      nombre: usuario.nombre,
      decanatoId: usuario.decanatoId,
      email: credenciales.email,
    };
  }
}
