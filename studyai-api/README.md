# StudyAI 🎓

StudyAI es una plataforma educativa que utiliza inteligencia artificial y **Retrieval-Augmented Generation (RAG)** para facilitar el aprendizaje a partir de documentos PDF.

La aplicación permitirá a los estudiantes subir sus apuntes, realizar preguntas sobre su contenido y generar cuestionarios para evaluar sus conocimientos. Las respuestas estarán fundamentadas en la información de los documentos y mostrarán referencias a las fuentes utilizadas.

**Estado:** En desarrollo.

## Funcionalidades

### Implementadas

- **Procesamiento de PDFs:** validación de archivos de hasta 5 MB y extracción de texto mediante PyPDF.
- **Chunking:** división del contenido en fragmentos, conservando el número de página.
- **Persistencia:** almacenamiento de documentos y chunks en PostgreSQL.
- **Gestión de documentos:** subida, listado, consulta individual, paginación y eliminación.
- **Registro de usuarios:** validación de datos, correos electrónicos únicos y contraseñas protegidas mediante Argon2id.
- **API REST:** desarrollada con FastAPI y documentada mediante OpenAPI.
- **Pruebas automatizadas:** validación de servicios, endpoints y operaciones de base de datos.

### En desarrollo

- Verificación de correo electrónico.
- Autenticación JWT y autorización por usuario.
- Generación de embeddings y búsqueda semántica mediante pgvector.
- Consultas RAG con referencias a documentos.
- Generación de cuestionarios con inteligencia artificial.
- Frontend con React y TypeScript.

## Tecnologías

| Categoría | Tecnologías |
|---|---|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Validación | Pydantic, Pydantic Settings |
| Procesamiento de documentos | PyPDF |
| Base de datos | PostgreSQL 17, psycopg 3 |
| Acceso a datos | SQLAlchemy Core |
| Migraciones | Alembic |
| Seguridad | pwdlib, Argon2id |
| Infraestructura | Docker, Docker Compose |
| Pruebas | Pytest |
| Frontend previsto | React, TypeScript, Tailwind CSS |
| Inteligencia artificial | RAG, embeddings, pgvector |

## Arquitectura

El backend utiliza una arquitectura por capas para separar la lógica de negocio, las solicitudes HTTP y las operaciones de base de datos.

| Capa | Responsabilidad |
|---|---|
| `api/routers` | Gestión de solicitudes y respuestas HTTP |
| `schemas` | Validación y serialización mediante Pydantic |
| `services` | Lógica de negocio y procesamiento |
| `repositories` | Consultas SQL y transacciones |
| `db` | Conexión a PostgreSQL |
| `core` | Configuración, seguridad y excepciones |

El acceso a datos se realiza mediante **SQL directo con SQLAlchemy Core**, sin utilizar modelos ORM. Las consultas son parametrizadas y las operaciones de persistencia utilizan transacciones.

### Estructura del proyecto

```text
StudyAI/
├── compose.yaml
├── .gitignore
├── README.md
│
├── studyai-api/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── routers/
│   │   │       └── router.py
│   │   ├── core/
│   │   ├── db/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── migrations/
│   │   ├── versions/
│   │   └── env.py
│   │
│   ├── test/
│   ├── alembic.ini
│   ├── .env.example
│   └── requirements.txt
│
└── studyai-web/
```

## Instalación

### Requisitos

- Python 3.12
- Docker Desktop
- Git
- pip

Los siguientes comandos están orientados a Windows PowerShell.

### 1. Iniciar PostgreSQL

Desde la raíz del proyecto:

```powershell
docker compose up -d
```

Verificar el estado del contenedor:

```powershell
docker compose ps
```

La configuración utiliza PostgreSQL 17 mediante la imagen `pgvector/pgvector:pg17`.

| Parámetro | Valor |
|---|---|
| Host | `127.0.0.1` |
| Puerto | `5433` |
| Base de desarrollo | `studyai_db` |
| Usuario | `studyai` |

### 2. Configurar el backend

Desde `studyai-api/`, crear y activar el entorno virtual:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Instalar las dependencias:

```powershell
python -m pip install -r requirements.txt
```

### 3. Variables de entorno

El proyecto utiliza archivos `.env` independientes para Docker y FastAPI.

- `StudyAI/.env`: configuración de PostgreSQL en Docker.
- `studyai-api/.env`: configuración de la aplicación y conexión a PostgreSQL.

Desde `studyai-api/`:

```powershell
Copy-Item .env.example .env
```

Configuración de referencia:

```dotenv
APP_NAME="StudyAI API"
APP_VERSION="0.1.0"
DEBUG=false

CORS_ORIGINS='["http://localhost:5173","http://127.0.0.1:5173"]'

DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=studyai_db
DB_USER=studyai
DB_PASSWORD="TU_CONTRASENA_LOCAL"
```

Los archivos `.env` se excluyen del control de versiones mediante `.gitignore`.

### 4. Aplicar migraciones

Alembic administra los cambios de estructura de PostgreSQL mediante migraciones versionadas.

```powershell
python -m alembic upgrade head
```

Consultar la revisión aplicada:

```powershell
python -m alembic current
```

### 5. Ejecutar el servidor

```powershell
uvicorn app.main:app --reload
```

La API estará disponible en `http://127.0.0.1:8000`.

## Documentación de la API

FastAPI genera la documentación interactiva mediante OpenAPI.

- **Swagger UI:** http://127.0.0.1:8000/docs
- **ReDoc:** http://127.0.0.1:8000/redoc

Desde estas interfaces se pueden consultar las rutas, parámetros, esquemas de datos y respuestas HTTP.

## Base de datos

StudyAI utiliza PostgreSQL con SQLAlchemy Core y psycopg 3 para ejecutar consultas SQL parametrizadas.

Actualmente se implementaron las tablas de usuarios, documentos y fragmentos de texto, con integridad referencial y eliminación en cascada de los chunks asociados a cada documento.

El proyecto utiliza dos bases de datos:

| Base | Propósito |
|---|---|
| `studyai_db` | Desarrollo y pruebas manuales |
| `studyai_test_db` | Pruebas automatizadas de persistencia |

Las migraciones de documentos y usuarios están implementadas. La migración para los tokens de verificación de correo, con vencimiento de **5 minutos**, está creada y pendiente de aplicar.

## Pruebas automatizadas

El backend utiliza **Pytest** para comprobar el comportamiento de los servicios, repositorios y endpoints.

Las pruebas incluyen validación y procesamiento de PDFs, generación de chunks, operaciones SQL, transacciones, eliminación de documentos, hashing de contraseñas y registro de usuarios.

### Ejecutar todas las pruebas

Desde `studyai-api/`:

```powershell
python -m pytest -v
```

### Ejecutar pruebas específicas

```powershell
python -m pytest test/test_user_repository.py -v
```

Las pruebas de persistencia utilizan `studyai_test_db`, que debe estar creada y tener las migraciones correspondientes aplicadas.

Para aplicar las migraciones a la base de pruebas:

```powershell
$env:DB_NAME = "studyai_test_db"

python -m alembic upgrade head

Remove-Item Env:\DB_NAME
```

**Último resultado confirmado: 34 pruebas aprobadas.**

## Seguridad

El backend incorpora medidas iniciales de seguridad:

- Hashing de contraseñas mediante Argon2id.
- Validación de datos con Pydantic.
- Consultas SQL parametrizadas.
- Restricciones de integridad en PostgreSQL.
- Transacciones con reversión automática ante errores.
- Manejo controlado de excepciones.
- Configuración sensible mediante variables de entorno.
- Validación de documentos PDF.

La autenticación JWT, la verificación de correo electrónico y el control de acceso a documentos están pendientes de implementación.

## Roadmap

- [x] Configurar FastAPI y PostgreSQL.
- [x] Implementar validación y extracción de texto de PDFs.
- [x] Generar y almacenar chunks.
- [x] Implementar gestión de documentos.
- [x] Crear registro de usuarios con Argon2id.
- [x] Incorporar pruebas automatizadas.
- [ ] Implementar verificación de correo electrónico.
- [ ] Implementar login con JWT.
- [ ] Asociar documentos con usuarios y proteger los endpoints.
- [ ] Integrar embeddings y pgvector.
- [ ] Implementar consultas mediante RAG.
- [ ] Generar cuestionarios con IA.
- [ ] Desarrollar el frontend con React y TypeScript.