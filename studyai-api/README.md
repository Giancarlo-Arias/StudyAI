
# StudyAI 🎓

StudyAI es una aplicación web para ayudar a estudiantes a aprender utilizando inteligencia artificial y RAG (Retrieval-Augmented Generation).

Los usuarios podrán subir sus apuntes en PDF, realizar preguntas sobre el contenido y generar quizzes para evaluar sus conocimientos.

## 1. Tecnologías

| Tecnología | Uso | Estado |
|---|---|---|
| Python 3.12 | Lenguaje backend | ✅ |
| FastAPI | API REST | ✅ |
| Uvicorn | Servidor ASGI | ✅ |
| React + TypeScript | Frontend | Pendiente |
| Tailwind CSS | Estilos | Pendiente |
| SQLite | Base de datos inicial | Pendiente |
| ChromaDB | Almacenamiento vectorial | Pendiente |
| Gemini API | Modelo de IA | Pendiente |

## 2. Estructura del proyecto

Estructura actual:

```text
StudyAI/
└── studyai-api/
    ├── .venv/
    └── main.py
```

Estructura prevista:

```text
StudyAI/
├── studyai-api/       # Backend Python
├── studyai-web/       # Frontend React
├── .gitignore
└── README.md
```

## 3. Configuración del backend

### 3.1 Requisitos

- Python 3.12
- pip
- VS Code
- Git

Verificar Python:

```powershell
python --version
```

### 3.2 Crear entorno virtual

Desde la carpeta `studyai-api`:

```powershell
python -m venv .venv
```

El entorno virtual permite instalar dependencias específicas del proyecto sin afectar otras instalaciones de Python.

### 3.3 Activar entorno virtual

En PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

La terminal mostrará:

```text
(.venv) PS D:\GianProjects\StudyAI\studyai-api>
```

**Nota:** VS Code puede activar automáticamente `.venv` al abrir su terminal. Si ya aparece `(.venv)`, no necesitas activarlo nuevamente.

### 3.4 Instalar FastAPI

Con el entorno virtual activado:

```powershell
pip install "fastapi[standard]"
```

Incluye:

- **FastAPI:** framework para construir APIs.
- **Uvicorn:** servidor ASGI.
- **FastAPI CLI:** comandos de desarrollo.
- **python-multipart:** manejo de formularios y subida de archivos.
- **HTTPX:** cliente HTTP.
- **Jinja2:** plantillas HTML.
- Otras dependencias estándar.

Pydantic se instala como dependencia esencial de FastAPI y permite validar datos.

Documentación oficial:
https://fastapi.tiangolo.com/

## 4. Crear la primera API

Crear `main.py` dentro de `studyai-api`:

```python
from fastapi import FastAPI

app = FastAPI(title="StudyAI API")

@app.get("/")
def home():
    return {"message": "StudyAI API funcionando"}
```

## 5. Ejecutar el servidor

### Con el entorno virtual activado

```powershell
uvicorn main:app --reload
```

### Sin activar el entorno virtual

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

Ambos métodos ejecutan el mismo servidor usando las dependencias del entorno virtual.

El parámetro `--reload` reinicia automáticamente el servidor cuando se modifica el código. Se utiliza durante el desarrollo.

### URLs locales

API:

http://127.0.0.1:8000

Swagger UI:

http://127.0.0.1:8000/docs

Documentación ReDoc:

http://127.0.0.1:8000/redoc

Para detener el servidor:

```text
Ctrl + C
```

## 6. Gestión de dependencias

Ver paquetes instalados:

```powershell
pip list
```

Ver versiones exactas:

```powershell
pip freeze
```

Generar `requirements.txt`:

```powershell
pip freeze > requirements.txt
```

Instalar dependencias desde `requirements.txt`:

```powershell
pip install -r requirements.txt
```

Actualizar pip si es necesario:

```powershell
python -m pip install --upgrade pip
```

**Importante:** `requirements.txt` debe actualizarse cuando agreguemos nuevas dependencias.

## 7. Archivo .gitignore

En el `.gitignore` del proyecto, agregar:

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

No subir entornos virtuales, contraseñas o claves API al repositorio.

## 8. Funcionalidades previstas

### Fase 1 — Backend
- Configurar FastAPI.
- Crear endpoints.
- Preparar la estructura del proyecto.

### Fase 2 — Documentos y RAG
- Subir archivos PDF.
- Extraer texto.
- Crear embeddings.
- Almacenar y recuperar información relevante.
- Integrar un modelo de IA.
- Responder preguntas con referencias al documento.

### Fase 3 — Quizzes
- Generar preguntas con IA.
- Evaluar respuestas.
- Guardar resultados.

### Fase 4 — Frontend
- React + TypeScript.
- Interfaz para documentos.
- Interfaz del chat.
- Interfaz de quizzes.

### Fase 5 — Publicación
- Pruebas.
- Seguridad.
- Despliegue.
- Documentación final.

## 9. Documentación oficial

- Python: https://docs.python.org/3/
- FastAPI: https://fastapi.tiangolo.com/
- Uvicorn: https://www.uvicorn.org/
- React: https://react.dev/
- Vite: https://vite.dev/
- ChromaDB: https://docs.trychroma.com/
- Gemini API: https://ai.google.dev/gemini-api/docs

## 10. Estado del proyecto

**En desarrollo.**

Backend inicial configurado con Python 3.12 y FastAPI.

Las dependencias de IA, RAG, base de datos y frontend se instalarán y documentarán conforme avance el desarrollo.



## Configuración centralizada

### Instalar Pydantic Settings

```powershell
python -m pip install pydantic-settings
```

Esta librería permite gestionar y validar configuraciones mediante variables de entorno.

### Archivo de configuración

Ubicación: `app/core/config.py`

Se utiliza para centralizar:

- Nombre y versión de la aplicación.
- Configuración del entorno.
- Variables de entorno del archivo `.env`.
- Futuras configuraciones de base de datos, seguridad e IA.

Documentación:
https://docs.pydantic.dev/latest/concepts/pydantic_settings/


## 11. Pruebas automatizadas — Pytest

Pytest es un framework de Python que permite crear y ejecutar pruebas automatizadas para verificar el funcionamiento de la aplicación.

### Instalación

Con el entorno virtual `.venv` activado:

```powershell
python -m pip install pytest
```

### Ejecutar pruebas

```powershell
python -m pytest
```

### Pruebas previstas para StudyAI

- Validar archivos PDF correctos (200).
- Rechazar archivos con formato inválido (400).
- Rechazar archivos mayores de 5 MB (413).
- Comprobar el funcionamiento de los endpoints.

**Estado:** pendiente de implementar los archivos de pruebas.

Documentación oficial:
https://docs.pytest.org/en/stable/
