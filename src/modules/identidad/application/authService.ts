import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { IJwtService } from '../../../shared/security/jwt';
import type {
  CredencialesUniversitarias,
  IUniversityAuthService,
  IUsuarioRepository,
} from '../domain/ports';

export interface LoginResult {
  token: string;
  usuario: {
    id: string;
    cedula: string;
    nombre: string;
    rol: string;
    decanato_id: number | null;
  };
}

/**
 * Caso de uso: autenticar credenciales institucionales y emitir sesión propia.
 *
 * Flujo:
 * 1. Validar credenciales contra la universidad (puerto IUniversityAuthService).
 * 2. Crear o actualizar el usuario local (upsert — nunca toca el rol).
 * 3. Mintear el JWT propio con claims (sub, role, decanato_id) que la RLS leerá.
 */
export class AuthService {
  constructor(
    private readonly universityAuth: IUniversityAuthService,
    private readonly usuarios: IUsuarioRepository,
    private readonly jwt: IJwtService,
    private readonly uow: UnitOfWork,
  ) {}

  async login(credenciales: CredencialesUniversitarias): Promise<LoginResult> {
    const perfil = await this.universityAuth.validateCredentials(credenciales);

    const usuario = await this.uow.run(async (tx) =>
      this.usuarios.upsertDesdePerfil(tx, perfil),
    );

    const token = this.jwt.sign({
      sub: usuario.id,
      role: usuario.rolNombre,
      decanato_id: usuario.decanatoId,
      nombre: usuario.nombre,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        cedula: usuario.cedula,
        nombre: usuario.nombre,
        rol: usuario.rolNombre,
        decanato_id: usuario.decanatoId,
      },
    };
  }
}
