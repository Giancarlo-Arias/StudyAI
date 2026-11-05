
# StudyAI API 🎓

Backend de **StudyAI**, una plataforma educativa que utiliza inteligencia artificial y Retrieval-Augmented Generation (RAG) para transformar documentos PDF en cuestionarios personalizados y facilitar el aprendizaje.

Los estudiantes pueden cargar sus documentos, generar evaluaciones con IA, responder preguntas, consultar sus calificaciones y visualizar su progreso académico.

## Funcionalidades

- **Autenticación:** registro de usuarios, verificación de correo electrónico e inicio de sesión con JWT.
- **Gestión de documentos:** carga, procesamiento, consulta y eliminación de archivos PDF.
- **Procesamiento inteligente:** extracción de texto, fragmentación por páginas y generación de embeddings.
- **Búsqueda semántica:** recuperación de información mediante PostgreSQL y pgvector, restringida a los documentos del usuario.
- **Generación de cuestionarios:** creación automática de preguntas con Gemini y RAG, seleccionando dificultad y cantidad.
- **Evaluaciones:** preguntas de opción múltiple, corrección automática, calificaciones y explicaciones.
- **Historial académico:** registro de intentos y resultados anteriores.
- **Progreso:** estadísticas generales e individuales por documento.
- **Logros:** reconocimiento de metas académicas mediante un sistema de logros.
- **Dashboard:** consulta unificada del progreso, documentos y logros.

## Tecnologías

| Categoría | Tecnología |
|---|---|
| Lenguaje | Python 3.12 |
| Framework | FastAPI |
| Validación | Pydantic |
| Base de datos | PostgreSQL 17 |
| Búsqueda vectorial | pgvector |
| Acceso a datos | SQLAlchemy Core y SQL directo |
| Migraciones | Alembic |
| Inteligencia artificial | Google Gemini |
| Embeddings | multilingual-e5-small |
| Machine Learning | Sentence Transformers y PyTorch |
| Documentos | PyPDF |
| Autenticación | JWT y Argon2id |
| Infraestructura | Docker |
| Pruebas | Pytest |

## Arquitectura

El backend utiliza una arquitectura por capas para separar las responsabilidades de la aplicación.

```text
studyai-api/
├── app/
│   ├── api/v1/routers/   # Endpoints REST
│   ├── core/             # Configuración y seguridad
│   ├── db/               # Conexión a PostgreSQL
│   ├── repositories/     # Consultas SQL
│   ├── schemas/          # Modelos Pydantic
│   ├── services/         # Lógica de negocio e IA
│   └── main.py
├── migrations/           # Migraciones Alembic
├── test/                 # Pruebas automatizadas
├── alembic.ini
├── .env.example
└── requirements.txt
```

El acceso a datos se realiza mediante consultas SQL parametrizadas y transacciones, sin utilizar un ORM.

## Funcionamiento de RAG

StudyAI utiliza dos componentes de inteligencia artificial con responsabilidades diferentes.

**multilingual-e5-small:** genera embeddings de 384 dimensiones para representar semánticamente los fragmentos de documentos.

**Google Gemini:** genera preguntas, opciones y explicaciones utilizando la información recuperada del documento.

### Flujo de generación de cuestionarios

1. El estudiante carga un archivo PDF.
2. El backend extrae el texto y lo divide en fragmentos.
3. Se generan embeddings y se almacenan en PostgreSQL.
4. pgvector recupera los fragmentos relevantes del documento seleccionado.
5. Gemini genera el cuestionario utilizando ese contexto.
6. Pydantic valida la estructura de las preguntas.
7. PostgreSQL almacena el cuestionario generado.
8. El estudiante responde y recibe su calificación.
9. StudyAI actualiza el historial, progreso y logros.

## Instalación

### Requisitos

- Python 3.12
- Docker Desktop
- PostgreSQL con pgvector
- Git

### 1. Iniciar PostgreSQL

Desde la raíz del proyecto, donde se encuentra `compose.yaml`:

```powershell
docker compose up -d
```

### 2. Configurar el entorno virtual

Desde `studyai-api/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 3. Variables de entorno

Crear el archivo `.env` a partir de `.env.example`:

```powershell
Copy-Item .env.example .env
```

Configurar la conexión PostgreSQL, los secretos JWT, el servicio de correo y `GEMINI_API_KEY`.

Los archivos `.env` contienen información sensible y no deben incorporarse al repositorio.

### 4. Aplicar migraciones

```powershell
python -m alembic upgrade head
```

El proyecto utiliza `studyai_db` para desarrollo y `studyai_test_db` para pruebas automatizadas.

### 5. Iniciar FastAPI

```powershell
python -m uvicorn app.main:app --reload
```

La API estará disponible en:

- Swagger: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## API REST

Los principales endpoints están disponibles bajo el prefijo `/api/v1`.

| Módulo | Endpoints |
|---|---|
| Autenticación | `/auth/register`, `/auth/login`, `/auth/me`, `/auth/verify-email` |
| Documentos | `/documents`, `/documents/upload`, `/documents/{document_id}` |
| Búsqueda semántica | `/search` |
| Cuestionarios | `/quizzes`, `/quizzes/generate`, `/quizzes/{quiz_id}` |
| Evaluaciones | `/quizzes/{quiz_id}/submit` |
| Intentos | `/quizzes/{quiz_id}/attempts` |
| Revisión | `/quizzes/{quiz_id}/attempts/{attempt_id}` |
| Progreso | `/progress`, `/progress/documents` |
| Logros | `/achievements` |
| Dashboard | `/dashboard` |

La documentación interactiva de FastAPI contiene los métodos HTTP, parámetros, esquemas y respuestas de cada endpoint.

## Seguridad

StudyAI implementa autenticación JWT, contraseñas protegidas con Argon2id, verificación de correo y autorización por propietario.

Las consultas a documentos, cuestionarios y resultados están restringidas al usuario autenticado. Las respuestas correctas de los cuestionarios no se exponen antes de entregar una evaluación.

## Pruebas

El proyecto cuenta con pruebas automatizadas mediante Pytest, incluyendo validaciones funcionales, integraciones con PostgreSQL, autenticación y controles de autorización.

Ejecutar las pruebas:

```powershell
python -m pytest -v
```

## Estado del proyecto

**Backend:** funcionalidades principales implementadas y verificadas.

**Pendiente:** integración con el frontend, mejoras de experiencia de usuario, configuración de producción y despliegue.

El frontend se desarrollará utilizando Next.js, TypeScript y Tailwind CSS.
