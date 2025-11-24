# LLM Chat Application - Testing Guide

## 📋 Resumen de Tests

Este proyecto cuenta con una suite completa de tests para el backend (Python) y frontend (JavaScript/React).

### 🎯 Estadísticas

- **Total de tests:** 44 ✅
- **Backend (Python/pytest):** 14 tests
- **Frontend (JavaScript/Vitest):** 30 tests
- **Cobertura:** API endpoints, servicios LLM, persistencia, componentes UI, utilidades, integración SSE

---

## 🚀 Ejecución Rápida

### Ejecutar todos los tests

**PowerShell (Windows):**
```powershell
.\run_all_tests.ps1
```

**Bash (Linux/Mac):**
```bash
./run_all_tests.sh
```

### Ejecutar tests individuales

**Backend:**
```bash
cd backend
python -m pytest -v
```

**Frontend:**
```bash
cd frontend
npm test -- --run
```

---

## 🧪 Backend Tests (Python)

### Configuración
- **Framework:** pytest + pytest-asyncio
- **Base de datos:** SQLite (en memoria para tests)
- **Mocking:** unittest.mock

### Tests Implementados

#### 1. API Endpoints (`test_api.py`)
- ✅ Health check endpoint
- ✅ Obtener conversaciones
- ✅ Crear conversación vía chat
- ✅ Streaming de respuestas

#### 2. Servicio LLM (`test_llm_service.py`)
- ✅ Streaming exitoso de respuestas
- ✅ Manejo de errores del LLM
- ✅ Callbacks asíncronos
- ✅ Formato SSE

#### 3. Persistencia (`test_persistence.py`)
- ✅ Modelos de base de datos
- ✅ Relaciones entre modelos
- ✅ Operaciones CRUD

#### 4. Mejoras SSE (`test_sse_improvements.py`)
- ✅ Parsing de metadatos SSE
- ✅ Inyección de conversation_id
- ✅ Manejo de JSON malformado
- ✅ Sesiones de DB independientes para callbacks
- ✅ Passthrough de líneas no-data

### Comandos útiles

```bash
# Ejecutar con verbose
python -m pytest -v

# Ejecutar con coverage
python -m pytest --cov=. --cov-report=html

# Ejecutar tests específicos
python -m pytest tests/test_api.py -v

# Ejecutar con output detallado
python -m pytest -v --tb=short
```

---

## 🎨 Frontend Tests (JavaScript)

### Configuración
- **Framework:** Vitest + React Testing Library
- **Entorno:** jsdom
- **Mocking:** vi (Vitest)

### Tests Implementados

#### 1. ChatInput Component (`ChatInput.test.jsx`) - 8 tests
- ✅ Renderizado de elementos
- ✅ Envío de mensajes (click y Enter)
- ✅ Limpieza del input
- ✅ Atajos de teclado (Enter, Shift+Enter)
- ✅ Validación de mensajes vacíos
- ✅ Estados deshabilitados
- ✅ Indicador de carga

#### 2. MessageBubble Component (`MessageBubble.test.jsx`) - 10 tests
- ✅ Renderizado de mensajes de usuario/asistente
- ✅ Renderizado de Markdown
- ✅ Iconos diferenciados
- ✅ Bloques de pensamiento (`<think>`)
- ✅ Toggle de bloques de pensamiento
- ✅ Bloques de código
- ✅ Múltiples bloques de pensamiento

#### 3. Utilities (`utils.test.jsx`) - 6 tests
- ✅ Validación de formato de mensajes
- ✅ Parsing de datos SSE
- ✅ Construcción de URLs
- ✅ Validación de estructuras de datos

#### 4. App Integration (`App.test.jsx`) - 6 tests
- ✅ Renderizado inicial y fetch de conversaciones
- ✅ Flujo completo de envío de mensajes
- ✅ Estados de carga (loading spinner)
- ✅ Manejo de errores de red
- ✅ Visualización de mensajes en el chat

### Comandos útiles

```bash
# Ejecutar todos los tests
npm test -- --run

# Ejecutar en modo watch
npm test

# Ejecutar con UI
npm run test:ui

# Ejecutar con coverage
npm run test:coverage

# Ejecutar tests específicos
npx vitest run src/test/ChatInput.test.jsx
```

---

## 📊 Estructura de Tests

```
antigravity/
├── backend/
│   ├── tests/
│   │   ├── test_api.py           # Tests de endpoints
│   │   ├── test_llm_service.py   # Tests del servicio LLM
│   │   ├── test_persistence.py   # Tests de base de datos
│   │   └── test_sse_improvements.py # Tests de mejoras SSE
│   └── pytest.ini                # Configuración de pytest
│
├── frontend/
│   ├── src/
│   │   └── test/
│   │       ├── setup.js          # Configuración de tests
│   │       ├── ChatInput.test.jsx
│   │       ├── MessageBubble.test.jsx
│   │       ├── utils.test.jsx
│   │       └── App.test.jsx      # Tests de integración
│   └── vitest.config.js          # Configuración de Vitest
│
├── run_all_tests.ps1             # Script PowerShell
├── run_all_tests.sh              # Script Bash
└── TESTS_SUMMARY.md              # Resumen detallado
```

---

## 🔧 Configuración de Entorno de Tests

### Backend

**Dependencias necesarias:**
```txt
pytest
pytest-asyncio
httpx
```

**Instalación:**
```bash
pip install -r requirements.txt
```

### Frontend

**Dependencias necesarias:**
```json
{
  "devDependencies": {
    "vitest": "^2.1.8",
    "@vitest/ui": "^2.1.8",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1"
  }
}
```

**Instalación:**
```bash
npm install
```

---

## 🎯 Mejoras Futuras

### Backend
- [ ] Tests de integración end-to-end
- [ ] Tests de rendimiento para streaming
- [ ] Tests de concurrencia
- [ ] Aumentar coverage a 90%+

### Frontend
- [ ] Tests de integración completos con App.jsx
- [ ] Tests de accesibilidad (a11y)
- [ ] Tests de performance
- [ ] Visual regression tests
- [ ] Aumentar coverage a 90%+

---

## 📝 Notas

- Los tests del backend usan una base de datos SQLite en memoria para evitar efectos secundarios
- Los tests del frontend mockean las llamadas a la API para evitar dependencias externas
- Todos los tests son independientes y pueden ejecutarse en cualquier orden
- Los tests se ejecutan automáticamente en CI/CD (cuando esté configurado)

---

## 🐛 Troubleshooting

### Backend

**Error: ModuleNotFoundError**
```bash
# Asegúrate de estar en el directorio correcto
cd backend
python -m pytest
```

**Error: Database locked**
```bash
# Elimina las bases de datos de test
rm test.db test_api.db
```

### Frontend

**Error: Cannot find module**
```bash
# Reinstala las dependencias
rm -rf node_modules package-lock.json
npm install
```

**Error: scrollIntoView is not a function**
- Ya está solucionado en `src/test/setup.js` con mocks de browser APIs

---

## 📚 Recursos

- [pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

**Última actualización:** 2025-11-23
## ✅ Verificación de Tests

### Backend
- **Resultado:** ✅ 14 tests pasados sin errores.
- **Comando usado:** `python -m pytest -q` en `backend/`.

### Frontend
- **Resultado:** ✅ 30 tests pasados sin errores.
- **Comando usado:** `npm test -- --run` en `frontend/`.

> Ambas suites de pruebas se ejecutan correctamente y el proyecto está listo para continuar con el desarrollo.
