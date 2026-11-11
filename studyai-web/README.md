# StudyAI Web

Frontend de **StudyAI**, una plataforma de aprendizaje que ayuda a estudiantes y personas autodidactas a transformar documentos PDF en cuestionarios y herramientas de estudio con inteligencia artificial.

La aplicación se conecta a [StudyAI API](../studyai-api/README.md), que procesa los documentos, genera cuestionarios con RAG y gestiona los resultados y el progreso de cada usuario.

## Funcionalidades

- **Cuenta:** registro, verificación de correo, inicio y cierre de sesión, recuperación de contraseña y perfil de usuario.
- **Documentos:** carga y administración de archivos PDF, consulta de su contenido y acceso a los cuestionarios asociados.
- **Cuestionarios:** generación a partir de un documento, con selección de título, dificultad y cantidad de preguntas.
- **Evaluaciones:** resolución de cuestionarios, consulta de resultados, historial de intentos y revisión de respuestas.
- **Dashboard:** resumen de actividad, resultados, progreso por documento y logros.
- **Experiencia adaptable:** interfaz responsive, modos claro y oscuro, preferencia del sistema y soporte para movimiento reducido.

## Tecnologías

| Categoría | Tecnología |
| --- | --- |
| Framework | Next.js 16 con App Router |
| Interfaz | React 19 y TypeScript |
| Estilos | Tailwind CSS 4 y CSS |
| Gráficas | Recharts |
| Tipografía | Geist, Geist Mono y Poppins |
| Gestor de paquetes | pnpm |
| Backend | FastAPI, PostgreSQL y pgvector |

El proyecto utiliza Server Components, Route Handlers, Cache Components, Partial Prefetching y React Compiler. Las animaciones y los controles interactivos se implementan en componentes cliente cuando son necesarios.

## Requisitos

- Node.js 20.9 o superior.
- pnpm 12.16.1. Si tienes Corepack disponible, puedes activarlo con `corepack enable`.
- [StudyAI API](../studyai-api/README.md) configurada y en ejecución para usar las funciones conectadas.

## Instalación

Desde la raíz del repositorio:

```bash
cd studyai-web
pnpm install
```

Crea un archivo `.env.local` dentro de `studyai-web` y configura la dirección base de la API, incluido su prefijo:

```dotenv
API_BASE_URL=http://127.0.0.1:8000/api/v1
```

La dirección debe ser accesible desde el servidor que ejecuta Next.js. Si el backend utiliza otro host o puerto, ajusta el valor. `API_BASE_URL` se utiliza en el servidor y no requiere el prefijo `NEXT_PUBLIC_`.

Inicia el servidor de desarrollo:

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). Para configurar PostgreSQL, el correo y la generación con IA, sigue las instrucciones del [backend](../studyai-api/README.md).

## Comandos

Ejecuta estos comandos desde `studyai-web`:

```bash
pnpm dev                # Desarrollo
pnpm exec tsc --noEmit  # Comprobación de tipos
pnpm lint               # ESLint
pnpm build              # Compilación de producción
pnpm start              # Servidor de producción, después del build
```

## Estructura

```text
studyai-web/
├── src/
│   ├── app/          # Rutas, layouts y Route Handlers de Next.js
│   ├── assets/       # Iconos, fuentes y recursos visuales
│   ├── components/   # Componentes de interfaz
│   ├── lib/          # Acceso a la API, sesión y validaciones
│   └── types/        # Tipos de datos compartidos
├── public/           # Archivos estáticos
├── next.config.ts    # Configuración de Next.js
├── package.json
└── pnpm-lock.yaml
```

## Autenticación y comunicación con la API

El navegador interactúa con rutas de Next.js para las operaciones que necesitan el backend. La aplicación mantiene el token de sesión en una cookie HttpOnly y realiza las llamadas autenticadas desde el servidor. Los módulos marcados como `server-only` mantienen la configuración privada fuera del código cliente.

Los archivos `.env.local` y otros archivos de entorno están excluidos de Git. No subas secretos, credenciales ni tokens al repositorio.

## Estado del proyecto

StudyAI está en desarrollo. El frontend incluye las vistas principales de autenticación, documentos, cuestionarios y seguimiento; su funcionamiento completo requiere el backend y sus servicios configurados.
