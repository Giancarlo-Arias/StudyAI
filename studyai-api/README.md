
# StudyAI API 🎓

StudyAI API es el backend de una plataforma educativa que utiliza inteligencia artificial y **Retrieval-Augmented Generation (RAG)** para facilitar el aprendizaje a partir de documentos PDF.

La aplicación permitirá a los estudiantes subir sus apuntes, realizar preguntas sobre su contenido y generar cuestionarios para evaluar sus conocimientos.

Las respuestas estarán fundamentadas en la información de los documentos del usuario y mostrarán referencias a las fuentes utilizadas.

**Estado:** En desarrollo.

Actualmente, el backend cuenta con autenticación JWT, verificación de correo electrónico, gestión privada de documentos PDF y una base de datos preparada para almacenar embeddings.

## Funcionalidades

### Implementadas

- **Procesamiento de PDFs:** validación de archivos de hasta 5 MB y extracción de texto mediante PyPDF.
- **Chunking:** división del contenido en fragmentos, conservando el número de página.
- **Persistencia:** almacenamiento de documentos y chunks en PostgreSQL.
- **Gestión de documentos:** subida, listado, consulta individual, paginación y eliminación.
- **Registro de usuarios:** validación de datos, correos electrónicos únicos y contraseñas protegidas mediante Argon2id.
- **Verificación de correo electrónico:** confirmación de cuentas y reenvío de verificaciones.
- **Autenticación JWT:** inicio de sesión, generación y validación de tokens de acceso.
- **Consulta del usuario autenticado:** endpoint para obtener los datos del usuario mediante JWT.
- **Autorización por usuario:** acceso restringido a los documentos del propietario.
- **Integridad referencial:** relación entre usuarios y documentos, con `user_id NOT NULL`.
- **Extensión pgvector:** habilitada en PostgreSQL para almacenar y consultar vectores.
- **Estructura de embeddings:** columna `embedding vector(384)` en la tabla `document_chunks`.
- **Modelo de embeddings:** instalación y prueba local de `intfloat/multilingual-e5-small`.
- **API REST:** desarrollada con FastAPI y documentada mediante OpenAPI.
- **Pruebas automatizadas:** validación de servicios, endpoints, autenticación, autorización y operaciones de base de datos.

### En desarrollo

- Servicio de generación de embeddings.
- Integración automática de embeddings durante el procesamiento de PDFs.
- Almacenamiento de embeddings generados en PostgreSQL.
- Búsqueda semántica mediante pgvector.
- Recuperación de información limitada a los documentos del usuario autenticado.
- Consultas RAG con referencias a documentos y páginas.
- Generación de cuestionarios mediante inteligencia artificial.
- Optimización y despliegue del backend.

## Tecnologías

| Categoría | Tecnologías |
|---|---|
| Lenguaje | Python 3.12 |
| Framework | FastAPI, Uvicorn |
| Validación | Pydantic, Pydantic Settings |
| Procesamiento de documentos | PyPDF |
| Base de datos | PostgreSQL 17, psycopg 3 |
| Búsqueda vectorial | pgvector 0.8.7 |
| Acceso a datos | SQLAlchemy Core, SQL directo |
| Migraciones | Alembic |
| Autenticación | JWT |
| Seguridad | pwdlib, Argon2id |
| Embeddings | Sentence Transformers, multilingual-e5-small |
| Machine Learning | PyTorch |
| Infraestructura | Docker, Docker Compose |
| Pruebas | Pytest |
| Inteligencia artificial | RAG, embeddings, búsqueda semántica |

## Arquitectura

El backend utiliza una **arquitectura por capas** para separar las solicitudes HTTP, la lógica de negocio y las operaciones de base de datos.

| Capa | Responsabilidad |
|---|---|
| `api/v1/routers` | Gestión de solicitudes y respuestas HTTP |
| `api/v1/dependencies` | Autenticación y dependencias compartidas |
| `schemas` | Validación y serialización mediante Pydantic |
| `services` | Lógica de negocio y procesamiento |
| `repositories` | Consultas SQL y transacciones |
| `db` | Conexión a PostgreSQL |
| `core` | Configuración, seguridad y utilidades |

El acceso a datos se realiza mediante **SQL directo con SQLAlchemy Core**, sin utilizar modelos ORM.

Las consultas son parametrizadas y las operaciones de persistencia utilizan transacciones.

### Flujo de procesamiento de documentos

```text
                 FastAPI
                    |
             Autenticación JWT
                    |
              Subida de PDF
                    |
             Validar archivo
                    |
              Extraer texto
                    |
               Chunking
                    |
             PostgreSQL
                    |
           documents / chunks
```

Actualmente, los documentos se procesan y almacenan correctamente. La generación automática de embeddings será integrada como una etapa adicional de este flujo.

### Flujo RAG previsto

```text
                  Pregunta
                     |
              Autenticación JWT
                     |
             Generar embedding
                     |
             Búsqueda pgvector
                     |
          Filtrar por propietario
                     |
           Recuperar fragmentos
                     |
           Modelo generativo IA
                     |
          Respuesta con fuentes
```

La búsqueda semántica y la generación de respuestas todavía están pendientes de implementación.

### Estructura del proyecto

```text
studyai-api/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── routers/
│   │       ├── dependencies.py
│   │       └── router.py
│   │
│   ├── core/
│   ├── db/
│   ├── repositories/
│   ├── schemas/
│   ├── services/
│   └── main.py
│
├── migrations/
│   ├── versions/
│   └── env.py
│
├── test/
│   └── fixtures/
│
├── alembic.ini
├── .env.example
└── requirements.txt
```

## Instalación

### Requisitos

- Python 3.12
- Docker Desktop
- Git
- pip

Los siguientes comandos están orientados a Windows PowerShell.

### 1. Iniciar PostgreSQL

Desde la raíz del proyecto, donde se encuentra `compose.yaml`:

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
| Base de pruebas | `studyai_test_db` |
| Usuario | `studyai` |

### 2. Configurar el backend

Desde `studyai-api/`, crear el entorno virtual:

```powershell
python -m venv .venv
```

Activarlo:

```powershell
.\.venv\Scripts\Activate.ps1
```

Instalar dependencias:

```powershell
python -m pip install -r requirements.txt
```

### 3. Dependencias de embeddings

Para generar embeddings localmente se utiliza Sentence Transformers:

```powershell
python -m pip install sentence-transformers
```

Esta librería utiliza PyTorch para ejecutar el modelo.

**Nota:** la instalación y prueba local del modelo ya se realizaron. La dependencia debe incorporarse a `requirements.txt` antes del despliegue para garantizar instalaciones reproducibles.

### 4. Variables de entorno

El proyecto utiliza archivos `.env` independientes para Docker y FastAPI.

- `StudyAI/.env`: configuración de PostgreSQL en Docker.
- `studyai-api/.env`: configuración de FastAPI, base de datos, JWT y correo electrónico.

Desde `studyai-api/`:

```powershell
Copy-Item .env.example .env
```

Ejemplo de configuración básica:

```dotenv
APP_NAME="StudyAI API"
APP_VERSION="0.1.0"
DEBUG=false

DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=studyai_db
DB_USER=studyai
DB_PASSWORD="TU_CONTRASENA_LOCAL"
```

Las variables de seguridad JWT y del servicio de verificación de correo también deben configurarse según `.env.example` y la configuración de la aplicación.

Los archivos `.env` deben permanecer excluidos del control de versiones mediante `.gitignore`.

### 5. Aplicar migraciones

Alembic administra los cambios de estructura de PostgreSQL mediante migraciones versionadas.

```powershell
python -m alembic upgrade head
```

Consultar la revisión aplicada:

```powershell
python -m alembic current
```

**Última migración implementada:**

```text
be03f575afc6 (head)
```

Esta migración activa pgvector y agrega la columna `embedding vector(384)` a `document_chunks`.

Las migraciones están aplicadas en ambas bases de datos:

- `studyai_db`
- `studyai_test_db`

### 6. Ejecutar el servidor

```powershell
python -m uvicorn app.main:app --reload
```

La API estará disponible en:

http://127.0.0.1:8000

## Documentación de la API

FastAPI genera automáticamente la documentación interactiva mediante OpenAPI.

- **Swagger UI:** http://127.0.0.1:8000/docs
- **ReDoc:** http://127.0.0.1:8000/redoc

Desde estas interfaces se pueden consultar las rutas, parámetros, esquemas y respuestas HTTP.

### Autenticación

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/v1/auth/register` | Registrar usuario |
| POST | `/api/v1/auth/verify-email` | Verificar correo electrónico |
| POST | `/api/v1/auth/resend-verification` | Reenviar verificación |
| POST | `/api/v1/auth/login` | Iniciar sesión |
| GET | `/api/v1/auth/me` | Obtener usuario autenticado |

La autenticación utiliza tokens JWT.

Los endpoints protegidos requieren el encabezado:

```http
Authorization: Bearer <token>
```

### Documentos

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/v1/documents/upload` | Subir y procesar un PDF |
| GET | `/api/v1/documents` | Listar documentos del usuario |
| GET | `/api/v1/documents/{document_id}` | Consultar documento y chunks |
| DELETE | `/api/v1/documents/{document_id}` | Eliminar documento |

Todos los endpoints de documentos requieren autenticación JWT.

Cada usuario puede consultar, listar y eliminar únicamente sus propios documentos.

Las operaciones de consulta y eliminación verifican el propietario directamente en PostgreSQL.

## Base de datos

StudyAI utiliza PostgreSQL con SQLAlchemy Core y psycopg 3 para ejecutar consultas SQL parametrizadas.

La base de datos incluye usuarios, documentos, fragmentos de texto y estructuras de verificación de correo electrónico.

### Bases de datos

El proyecto utiliza dos bases independientes:

| Base | Propósito |
|---|---|
| `studyai_db` | Desarrollo y pruebas manuales |
| `studyai_test_db` | Pruebas automatizadas de persistencia |

Esta separación permite ejecutar pruebas sin modificar los documentos y usuarios de la base principal.

### Usuarios y documentos

La tabla `documents` contiene una referencia obligatoria al propietario mediante `user_id`.

La relación se implementa mediante una clave foránea hacia `users(id)`.

La columna utiliza la restricción:

```sql
user_id BIGINT NOT NULL
```

Esto impide almacenar documentos sin propietario.

La eliminación de un documento también elimina sus chunks asociados mediante la relación configurada en PostgreSQL.

### Fragmentos de documentos

La tabla `document_chunks` almacena los fragmentos extraídos de los PDFs.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador del fragmento |
| `document_id` | UUID | Documento asociado |
| `page_number` | INTEGER | Número de página |
| `chunk_index` | INTEGER | Posición del fragmento |
| `text` | TEXT | Contenido del fragmento |
| `embedding` | VECTOR(384) | Representación numérica del texto |

La columna `embedding` permite temporalmente valores `NULL`, ya que los documentos existentes todavía no tienen embeddings generados.

### pgvector

Se utiliza la extensión pgvector para almacenar y comparar vectores dentro de PostgreSQL.

**Versión verificada:** `0.8.7`.

La extensión está habilitada en ambas bases de datos.

### Modelo de embeddings

Se seleccionó el modelo:

```text
intfloat/multilingual-e5-small
```

Este modelo convierte textos en vectores de 384 dimensiones y permite trabajar con contenido en diferentes idiomas.

Se utilizarán los prefijos recomendados por el modelo:

- `passage:` para los fragmentos de documentos.
- `query:` para las preguntas.

Ejemplo de generación:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "intfloat/multilingual-e5-small"
)

embedding = model.encode(
    "passage: Python permite desarrollar aplicaciones.",
    normalize_embeddings=True,
)

print("Dimensiones:", len(embedding))
```

Resultado esperado:

```text
Dimensiones: 384
```

La generación de embeddings fue comprobada correctamente en el entorno local.

**Estado actual:** el modelo funciona, pero todavía no está conectado con el procesamiento automático de documentos ni con PostgreSQL.

## Pruebas automatizadas

El backend utiliza **Pytest** para comprobar el comportamiento de los servicios, repositorios y endpoints.

Las pruebas incluyen:

- Validación de documentos PDF.
- Extracción de texto y generación de chunks.
- Operaciones SQL y transacciones.
- Registro de usuarios.
- Verificación de correo electrónico.
- Autenticación JWT.
- Autorización por propietario de documentos.
- Restricciones de acceso entre usuarios.
- Paginación y eliminación de documentos.
- Integridad referencial.
- Restricción `user_id NOT NULL`.
- Validación de pgvector.
- Verificación de la columna `vector(384)`.

### Ejecutar todas las pruebas

Desde `studyai-api/`:

```powershell
python -m pytest -v
```

### Ejecutar pruebas específicas

Seguridad entre usuarios:

```powershell
python -m pytest test/test_document_security_integration.py -v
```

Restricción de propietario obligatorio:

```powershell
python -m pytest test/test_document_user_id_constraint.py -v
```

Validación de la estructura de embeddings:

```powershell
python -m pytest test/test_document_embedding_schema.py -v
```

### Base de datos de pruebas

Las pruebas de persistencia utilizan `studyai_test_db`.

Para aplicar las migraciones a esta base:

```powershell
$env:DB_NAME = "studyai_test_db"

python -m alembic upgrade head

Remove-Item Env:\DB_NAME -ErrorAction SilentlyContinue
```

La base de pruebas debe mantenerse separada de `studyai_db`.

### Último resultado confirmado

**151 pruebas aprobadas en 7.52 segundos.**

Este resultado corresponde a las funcionalidades del backend implementadas hasta la preparación de la estructura de embeddings.

## Seguridad

El backend incorpora las siguientes medidas:

- Hashing de contraseñas mediante Argon2id.
- Autenticación JWT.
- Verificación de correo electrónico.
- Validación de usuarios autenticados.
- Autorización por propietario de documentos.
- Consultas SQL parametrizadas.
- Restricciones de integridad en PostgreSQL.
- Relación obligatoria entre documentos y usuarios.
- Transacciones con reversión ante errores.
- Manejo controlado de excepciones.
- Configuración sensible mediante variables de entorno.
- Validación de documentos PDF.
- Límite de tamaño para archivos PDF.
- Pruebas automatizadas de acceso entre usuarios.

Los futuros endpoints RAG deberán mantener el mismo aislamiento de datos.

La búsqueda semántica deberá comprobar que cada fragmento recuperado pertenezca a un documento del usuario autenticado.

## Consideraciones para el despliegue

El backend todavía se encuentra en desarrollo local.

Antes de su despliegue será necesario configurar un entorno de ejecución para FastAPI, una instancia PostgreSQL compatible con pgvector y las variables de entorno correspondientes.

### Ejecución de embeddings

Actualmente, el modelo `multilingual-e5-small` se ejecuta localmente mediante Sentence Transformers y PyTorch.

Para producción se evaluarán dos alternativas:

1. **Modelo local en el servidor:** ejecutar Sentence Transformers directamente en el alojamiento de FastAPI.
2. **Servicio externo:** consumir una API de embeddings para reducir los recursos necesarios en el servidor.

La decisión dependerá de la memoria, CPU, almacenamiento y presupuesto disponibles.

También será necesario definir la estrategia de generación y almacenamiento de embeddings para documentos nuevos y existentes.

## Roadmap

### Configuración y persistencia

- [x] Configurar FastAPI.
- [x] Configurar PostgreSQL con Docker.
- [x] Implementar conexión con SQLAlchemy Core.
- [x] Configurar Alembic.
- [x] Implementar validación de PDFs.
- [x] Extraer texto mediante PyPDF.
- [x] Generar chunks conservando las páginas.
- [x] Almacenar documentos y chunks.
- [x] Implementar listado, consulta y eliminación de documentos.

### Usuarios y seguridad

- [x] Crear registro de usuarios.
- [x] Implementar hashing con Argon2id.
- [x] Implementar verificación de correo electrónico.
- [x] Implementar reenvío de verificación.
- [x] Implementar login con JWT.
- [x] Implementar consulta del usuario autenticado.
- [x] Asociar documentos con usuarios.
- [x] Proteger endpoints mediante JWT.
- [x] Implementar autorización por propietario.
- [x] Agregar la restricción `user_id NOT NULL`.
- [x] Implementar pruebas de seguridad e integración.

### Inteligencia artificial y RAG

- [x] Configurar PostgreSQL con pgvector.
- [x] Agregar columna `embedding vector(384)`.
- [x] Instalar Sentence Transformers localmente.
- [x] Probar el modelo `multilingual-e5-small`.
- [ ] Crear servicio de generación de embeddings.
- [ ] Integrar embeddings con el procesamiento de PDFs.
- [ ] Guardar embeddings en PostgreSQL.
- [ ] Generar embeddings para documentos existentes.
- [ ] Implementar búsqueda semántica con pgvector.
- [ ] Restringir búsquedas a documentos del usuario autenticado.
- [ ] Implementar consultas RAG.
- [ ] Generar respuestas basadas en documentos.
- [ ] Mostrar referencias a documentos y páginas.
- [ ] Implementar generación de cuestionarios con IA.

### Calidad y despliegue

- [x] Incorporar Pytest.
- [x] Implementar pruebas de servicios y repositorios.
- [x] Implementar pruebas de endpoints.
- [x] Implementar pruebas de autenticación y autorización.
- [x] Validar restricciones de PostgreSQL.
- [x] Validar la estructura de embeddings.
- [ ] Incorporar pruebas de generación de embeddings.
- [ ] Incorporar pruebas de búsqueda semántica.
- [ ] Incorporar pruebas de consultas RAG.
- [ ] Preparar configuración de producción.
- [ ] Definir alojamiento del backend.
- [ ] Configurar PostgreSQL en producción.
- [ ] Desplegar y validar el servicio.
