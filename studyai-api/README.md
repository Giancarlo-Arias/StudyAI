# StudyAI 🎓

StudyAI es una aplicación web para ayudar a estudiantes a aprender utilizando inteligencia artificial y RAG (Retrieval-Augmented Generation).

Los usuarios podrán subir sus apuntes en PDF, realizar preguntas sobre su contenido y generar quizzes para evaluar sus conocimientos.

**Estado:** En desarrollo.

## 1. Tecnologías

| Tecnología | Uso | Estado |
|---|---|---|
| Python 3.12 | Lenguaje backend | ✅ |
| FastAPI | API REST | ✅ |
| Uvicorn | Servidor ASGI | ✅ |
| Pydantic Settings | Configuración y variables de entorno | ✅ |
| PyPDF | Lectura y extracción de PDFs | ✅ |
| Pytest | Pruebas automatizadas | ✅ |
| PostgreSQL 17 | Base de datos relacional | ✅ Local |
| Docker | Contenedores para desarrollo local | ✅ |
| SQLAlchemy | Conexión, sesiones y modelos ORM | ✅ Conexión y sesiones |
| Alembic | Migraciones de base de datos | 🔄 Inicializado |
| psycopg 3 | Driver PostgreSQL para Python | ✅ |
| pgvector | Almacenamiento y búsqueda vectorial | Pendiente |
| React + TypeScript | Frontend | Pendiente |
| Tailwind CSS | Estilos | Pendiente |
| Gemini API | Modelo de IA propuesto | Pendiente |

Se utilizará **PostgreSQL + pgvector** en lugar de la propuesta inicial de SQLite + ChromaDB.

## 2. Estructura del proyecto

El backend utiliza una arquitectura por capas, separando rutas HTTP, servicios, configuración, acceso a datos y pruebas.

```text
StudyAI/
├── compose.yaml
├── .env                    # Configuración de Docker
├── .gitignore
├── README.md
│
├── studyai-api/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── routers/
│   │   │       │   ├── health.py
│   │   │       │   └── documents.py
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── exceptions.py
│   │   ├── db/
│   │   │   ├── connection.py
│   │   │   └── session.py
│   │   ├── services/
│   │   │   ├── document_service.py
│   │   │   ├── chunking_service.py
│   │   │   └── document_processing_service.py
│   │   └── main.py
│   │
│   ├── migrations/
│   │   ├── versions/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── README
│   │
│   ├── test/
│   │   ├── fixtures/
│   │   │   └── ejemplo.pdf
│   │   ├── test_document_service.py
│   │   ├── test_pdf_extraction.py
│   │   ├── test_chunking_service.py
│   │   └── test_documents_api.py
│   │
│   ├── alembic.ini
│   ├── .venv/
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
│
└── studyai-web/            # Frontend futuro
```

Las carpetas `models`, `schemas` y `repositories` se utilizarán para los modelos de datos, esquemas de la API y operaciones de persistencia.

## 3. Configuración del backend

### 3.1 Requisitos

- Python 3.12
- pip
- VS Code
- Git
- Docker Desktop
- pgAdmin 4 (opcional, para administrar PostgreSQL)

Verificar Python:

```powershell
python --version
```

### 3.2 Crear entorno virtual

Desde `studyai-api/`:

```powershell
python -m venv .venv
```

El entorno virtual permite instalar dependencias específicas del proyecto sin afectar otras instalaciones de Python.

### 3.3 Activar entorno virtual

En PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

La terminal mostrará algo similar a:

```text
(.venv) PS D:\GianProjects\StudyAI\studyai-api>
```

**Nota:** VS Code puede activar automáticamente `.venv`. Si ya aparece `(.venv)`, no necesitas activarlo nuevamente.

### 3.4 Instalar dependencias

Con el entorno virtual activado:

```powershell
python -m pip install -r requirements.txt
```

Para una instalación inicial de FastAPI:

```powershell
python -m pip install "fastapi[standard]"
```

Incluye FastAPI, Uvicorn, FastAPI CLI, python-multipart, HTTPX y otras dependencias estándar.

Pydantic se instala como dependencia de FastAPI y permite validar datos.

Dependencias adicionales utilizadas:

```powershell
python -m pip install pydantic-settings pypdf pytest
```

Dependencias de PostgreSQL:

```powershell
python -m pip install sqlalchemy alembic "psycopg[binary]"
```

Cuando `requirements.txt` está actualizado, basta con instalarlo; no es necesario repetir los comandos individuales.

### 3.5 Configuración centralizada

Ubicación: `app/core/config.py`

Se utiliza **Pydantic Settings** para gestionar:

- Nombre y versión de la aplicación.
- Modo de depuración.
- Configuración de CORS.
- Variables de entorno.
- Conexión a PostgreSQL.
- Futuras configuraciones de seguridad e IA.

Ejemplo de `studyai-api/.env`:

```dotenv
# Aplicación
APP_NAME="StudyAI API - Development"
APP_VERSION="0.1.0"
DEBUG=false

# Frontend autorizado
CORS_ORIGINS='["http://localhost:5173","http://127.0.0.1:5173"]'

# PostgreSQL
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=studyai_db
DB_USER=studyai
DB_PASSWORD="TU_CONTRASENA_LOCAL"
```

El proyecto utiliza dos archivos de configuración locales:

- `StudyAI/.env`: configuración utilizada por Docker para iniciar PostgreSQL.
- `StudyAI/studyai-api/.env`: configuración utilizada por Python para conectarse a PostgreSQL.

Ambos utilizan la misma contraseña local de base de datos.

Los archivos `.env` deben permanecer fuera de GitHub. Se utiliza `.env.example` como plantilla pública, sin credenciales reales.

## 4. Primera API y arquitectura

La primera versión de StudyAI consistía en una aplicación sencilla de FastAPI:

```python
from fastapi import FastAPI

app = FastAPI(title="StudyAI API")

@app.get("/")
def home():
    return {"message": "StudyAI API funcionando"}
```

Posteriormente se reorganizó en una arquitectura por capas, inspirada en principios de Clean Architecture.

La implementación utiliza:

- **Routers:** reciben solicitudes HTTP y devuelven respuestas.
- **Services:** ejecutan la lógica de procesamiento.
- **Core:** administra configuraciones y errores.
- **DB:** configura el motor y las sesiones de SQLAlchemy.
- **Models:** representarán las entidades de la base de datos.
- **Schemas:** definirán las estructuras de entrada y salida.
- **Repositories:** encapsularán las operaciones de acceso a datos.

Las rutas utilizan el prefijo `/api/v1`.

## 5. Ejecutar el servidor

### Con el entorno virtual activado

Desde `studyai-api/`:

```powershell
uvicorn app.main:app --reload
```

### Sin activar el entorno virtual

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Ambos métodos ejecutan la aplicación desde `app/main.py`.

El parámetro `--reload` reinicia automáticamente el servidor cuando se modifica el código. Se utiliza durante el desarrollo.

### URLs locales

| Recurso | URL |
|---|---|
| API | http://127.0.0.1:8000 |
| Swagger UI | http://127.0.0.1:8000/docs |
| ReDoc | http://127.0.0.1:8000/redoc |
| OpenAPI JSON | http://127.0.0.1:8000/openapi.json |

Para detener el servidor: `Ctrl + C`.

## 6. Gestión de dependencias

Ver paquetes instalados:

```powershell
python -m pip list
```

Ver versiones exactas:

```powershell
python -m pip freeze
```

Generar o actualizar `requirements.txt`:

```powershell
python -m pip freeze > requirements.txt
```

Instalar dependencias:

```powershell
python -m pip install -r requirements.txt
```

Actualizar pip cuando sea necesario:

```powershell
python -m pip install --upgrade pip
```

**Importante:** actualizar `requirements.txt` cuando agreguemos nuevas librerías, especialmente antes de subir cambios a GitHub.

## 7. Archivo .gitignore

El repositorio utiliza `.gitignore` para excluir archivos innecesarios o privados.

Entre las exclusiones importantes:

```gitignore
# Python
.venv/
__pycache__/
*.pyc
.pytest_cache/

# Variables de entorno
.env
.env.*
!.env.example

# Frontend
node_modules/
dist/

# Sistema
.DS_Store
Thumbs.db
```

No se deben publicar entornos virtuales, contraseñas, claves de API ni documentos privados de usuarios.

El repositorio Git se encuentra en la carpeta principal `StudyAI`, permitiendo mantener backend y frontend en el mismo proyecto.

## 8. Funcionalidades implementadas

### 8.1 Validación y recepción de PDFs

El endpoint `POST /api/v1/documents/upload` recibe documentos PDF mediante `multipart/form-data`.

Validaciones implementadas:

- Extensión `.pdf`.
- Tamaño máximo de 5 MB.
- Firma inicial `%PDF-`.
- Rechazo de documentos sin texto extraíble.
- Rechazo de PDFs cifrados.

Son validaciones iniciales; antes de producción se incorporarán controles adicionales de seguridad.

### 8.2 Extracción de texto

Se utiliza la librería **PyPDF**.

Funciones principales de `document_service.py`:

- `validate_pdf()`: valida el documento.
- `extract_pdf_pages()`: obtiene el texto conservando los números de página.
- `extract_pdf_text()`: devuelve el texto completo consolidado.

Actualmente se extrae texto incorporado en el PDF. No se utiliza OCR para documentos escaneados.

### 8.3 Chunking

El servicio `chunking_service.py` divide el contenido en fragmentos para preparar el sistema RAG.

Configuración inicial:

- Tamaño máximo: 1.000 caracteres.
- Solapamiento aproximado: 150 caracteres.
- Conservación del número de página.
- Índice para identificar cada chunk.

El solapamiento ayuda a conservar contexto entre fragmentos. Más adelante se evaluará el uso de tokens y la calidad de recuperación.

### 8.4 Procesamiento integrado

El servicio `document_processing_service.py` coordina:

1. Validación del PDF.
2. Extracción de páginas.
3. Generación de chunks.
4. Preparación del resultado.

El router utiliza `run_in_threadpool()` para ejecutar el procesamiento síncrono sin bloquear directamente el ciclo de eventos de FastAPI.

### 8.5 Endpoints

| Método | Ruta | Función |
|---|---|---|
| GET | `/` | Verificar funcionamiento de la API |
| GET | `/api/v1/health` | Consultar estado del servicio |
| POST | `/api/v1/documents/upload` | Procesar un documento PDF |

Ejemplo de respuesta al subir un PDF:

```json
{
  "message": "PDF procesado correctamente",
  "filename": "ejemplo.pdf",
  "size_bytes": 17168,
  "pages_with_text": 1,
  "text_length": 38,
  "chunk_count": 1
}
```

Actualmente los documentos se procesan en memoria. Todavía no se guardan en PostgreSQL.

## 9. PostgreSQL, Docker y Alembic

PostgreSQL se utilizará para almacenar usuarios, documentos, fragmentos y resultados de estudio.

### 9.1 Herramientas

- **PostgreSQL:** base de datos relacional.
- **Docker:** ejecuta PostgreSQL en un contenedor local.
- **psycopg:** driver que comunica Python con PostgreSQL.
- **SQLAlchemy:** administra conexiones, sesiones, consultas y modelos ORM.
- **Alembic:** gestiona migraciones versionadas de la estructura de las tablas.
- **pgvector:** permitirá almacenar embeddings y realizar búsquedas vectoriales para RAG.

### 9.2 PostgreSQL local con Docker

La base de datos se ejecuta utilizando `compose.yaml`, ubicado en la raíz de StudyAI.

Configuración actual:

| Elemento | Valor |
|---|---|
| Imagen | `pgvector/pgvector:pg17` |
| Base de datos | `studyai_db` |
| Usuario | `studyai` |
| Host local | `127.0.0.1` |
| Puerto | `5433` |
| Almacenamiento | Volumen persistente de Docker |

Desde la carpeta principal `StudyAI/`, iniciar PostgreSQL:

```powershell
docker compose up -d
```

Verificar el estado:

```powershell
docker compose ps
```

Detener el contenedor:

```powershell
docker compose stop
```

El estado `healthy` indica que PostgreSQL está preparado para aceptar conexiones, gracias al `healthcheck` configurado en Docker Compose.

Este estado es independiente del endpoint `/api/v1/health` de FastAPI.

### 9.3 Administrar la base de datos

Se utiliza **pgAdmin 4** para visualizar la base de datos y ejecutar consultas SQL.

Datos de conexión:

| Campo | Valor |
|---|---|
| Host | `127.0.0.1` |
| Port | `5433` |
| Database | `studyai_db` |
| Username | `studyai` |
| Password | Contraseña local de Docker |

Consulta de verificación:

```sql
SELECT current_database(), current_user, version();
```

La conexión se verificó correctamente con PostgreSQL 17.11.

### 9.4 Conexión desde Python

Ubicación: `app/db/connection.py`

Se utiliza la función `get_engine()` para crear y reutilizar el motor de SQLAlchemy.

La conexión utiliza:

- `URL.create()` para construir la URL de PostgreSQL.
- `postgresql+psycopg` como dialecto y driver.
- `pool_pre_ping=True` para verificar conexiones antes de reutilizarlas.
- Variables de entorno para evitar contraseñas directamente en el código.

Ubicación: `app/db/session.py`

Se implementaron:

- `get_session_factory()`: crea una fábrica de sesiones vinculada al motor.
- `get_db()`: proporciona una sesión y garantiza su cierre.

La conexión real se verificó ejecutando una consulta SQL desde Python.

Resultado:

```text
('studyai_db', 'studyai')
```

Esto confirma la conexión con PostgreSQL, aunque todavía no se han creado tablas ni operaciones de persistencia.

### 9.5 Migraciones con Alembic

Alembic administra los cambios estructurales de la base de datos, como crear tablas, agregar columnas y definir relaciones.

Se inicializó mediante:

```powershell
python -m alembic init migrations
```

Este comando creó:

- `alembic.ini`: configuración general de Alembic.
- `migrations/env.py`: configuración para ejecutar migraciones.
- `migrations/versions/`: carpeta donde se guardarán las versiones.
- `migrations/script.py.mako`: plantilla de los archivos de migración.

**Estado:** Alembic está inicializado. Se está adaptando `migrations/env.py` para reutilizar `get_engine()` y todavía no se han creado modelos ni migraciones de tablas.

Cuando esté configurado, podremos consultar la revisión aplicada:

```powershell
python -m alembic current
```

Y posteriormente generar y aplicar migraciones:

```powershell
python -m alembic revision --autogenerate -m "create initial tables"
python -m alembic upgrade head
```

Estos últimos comandos se utilizarán cuando existan los modelos SQLAlchemy y sus metadatos estén registrados. Las migraciones generadas deberán revisarse antes de aplicarse.

## 10. Pruebas automatizadas — Pytest

Pytest permite crear pruebas para verificar el funcionamiento de funciones y endpoints.

### Instalación

```powershell
python -m pip install pytest
```

### Ejecutar todas las pruebas

```powershell
python -m pytest -v
```

### Ejecutar pruebas específicas

```powershell
python -m pytest test/test_chunking_service.py -v
```

Pytest descubre automáticamente archivos como `test_*.py` y funciones que comienzan con `test_`.

### Pruebas implementadas

| Archivo | Cantidad |
|---|---:|
| `test_document_service.py` | 5 |
| `test_pdf_extraction.py` | 2 |
| `test_chunking_service.py` | 4 |
| `test_documents_api.py` | 2 |
| **Total** | **13** |

Se comprueban:

- PDFs válidos e inválidos.
- Extensión, firma y tamaño de archivos.
- Rechazo de PDFs sin texto.
- Extracción de texto real.
- Conservación del número de página.
- División en chunks.
- Configuración del chunking.
- Respuestas HTTP del endpoint.

**Último resultado: 13 pruebas exitosas.**

Las conexiones a PostgreSQL se han verificado manualmente. Las pruebas automatizadas de persistencia están pendientes.

## 11. Funcionalidades previstas

### Fase 1 — Backend y documentos

- [x] Configurar FastAPI.
- [x] Crear endpoints.
- [x] Organizar la arquitectura.
- [x] Configurar variables de entorno.
- [x] Implementar validación y recepción de PDFs.
- [x] Extraer texto y conservar páginas.
- [x] Implementar chunking.
- [x] Crear pruebas automatizadas.

### Fase 2 — Base de datos y RAG

- [x] Configurar PostgreSQL en Docker.
- [x] Verificar conexión desde pgAdmin.
- [x] Implementar motor y sesiones con SQLAlchemy.
- [x] Inicializar Alembic.
- [ ] Registrar los metadatos de los modelos en Alembic.
- [ ] Crear modelos y relaciones.
- [ ] Generar y ejecutar migraciones.
- [ ] Guardar documentos y chunks.
- [ ] Implementar usuarios y control de acceso.
- [ ] Generar embeddings.
- [ ] Integrar pgvector.
- [ ] Recuperar fragmentos relevantes.
- [ ] Integrar un modelo de IA.
- [ ] Responder preguntas citando los documentos.

### Fase 3 — Quizzes

- [ ] Generar preguntas con IA.
- [ ] Evaluar respuestas.
- [ ] Guardar resultados.

### Fase 4 — Frontend

- [ ] React + TypeScript.
- [ ] Tailwind CSS.
- [ ] Interfaz para documentos.
- [ ] Interfaz del chat.
- [ ] Interfaz de quizzes.

### Fase 5 — Publicación

- [ ] Implementar seguridad y autenticación.
- [ ] Ampliar pruebas y validaciones.
- [ ] Configurar CI/CD.
- [ ] Desplegar backend y frontend.
- [ ] Completar documentación.

## 12. Documentación oficial

- [Python](https://docs.python.org/3/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Uvicorn](https://www.uvicorn.org/)
- [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [PyPDF](https://pypdf.readthedocs.io/)
- [Pytest](https://docs.pytest.org/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Docker](https://docs.docker.com/)
- [SQLAlchemy](https://docs.sqlalchemy.org/)
- [Alembic](https://alembic.sqlalchemy.org/)
- [psycopg](https://www.psycopg.org/psycopg3/docs/)
- [pgvector](https://github.com/pgvector/pgvector)
- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Gemini API](https://ai.google.dev/gemini-api/docs)

## 13. Estado del proyecto

**En desarrollo.**

El backend funciona con FastAPI y permite validar PDFs, extraer texto por página y generar chunks. Cuenta con 13 pruebas automatizadas exitosas y control de versiones mediante Git.

PostgreSQL 17 funciona localmente en Docker y su conexión se ha verificado desde pgAdmin y Python mediante SQLAlchemy.

Alembic está inicializado. La siguiente etapa consiste en registrar los modelos ORM, generar la primera migración y crear las tablas necesarias para guardar documentos y fragmentos.

Las funcionalidades de embeddings, RAG, generación de quizzes y frontend se implementarán progresivamente.