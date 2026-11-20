# StudyAI Mobile

Aplicación móvil de **StudyAI** desarrollada con **React Native, Expo y TypeScript**.

[**Proyecto principal**](../README.md) · [**Backend / API**](../studyai-api/README.md)

## Funcionalidades

- Inicio de sesión y dashboard con estadísticas de aprendizaje.
- Consulta y detalle de documentos PDF.
- Listado de cuestionarios y acceso a modos Práctica y Examen.
- Creación de cuestionarios con configuración de dificultad y cantidad de preguntas.
- Historial de intentos, resultados y seguimiento de logros.
- Navegación móvil y preferencias de interfaz.

## Stack

**Expo · React Native · React 19 · TypeScript · Expo Router · React Native Reanimated**

La app consume la [StudyAI API](../studyai-api/README.md) para autenticación, documentos, cuestionarios y progreso.

## Ejecución

```bash
cd studyai-mobile
npm install
npx expo start
```

El backend debe estar configurado y ejecutándose. En un dispositivo físico, la dirección de la API debe ser accesible desde la red del teléfono; `localhost` se refiere al propio dispositivo.

## Estado

Aplicación en desarrollo. Las funciones dependen de los servicios de backend disponibles y de su configuración local.
