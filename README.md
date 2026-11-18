# Pokédex

Aplicación local con **React + TypeScript + FastAPI**, conectada a [PokéAPI](https://pokeapi.co/docs/v2/). Interfaz en español, rojo y blanco, ilustraciones oficiales, carrusel de todo el catálogo nacional, descubrimiento al azar, filtros combinados y fichas detalladas.

## Arranque rápido en Windows

Requisitos: Python 3.11 o superior y Node.js 22.12 o superior (también Node 24). En PowerShell, desde esta carpeta:

```powershell
.\setup.ps1
.\start.ps1
```

La primera instalación necesita conexión a Internet. Si PowerShell bloquea scripts, usa `powershell -ExecutionPolicy Bypass -File .\setup.ps1` y después `powershell -ExecutionPolicy Bypass -File .\start.ps1`; la opción afecta solo a ese proceso.

- Aplicación: http://127.0.0.1:8000
- Swagger / REST interactiva: http://127.0.0.1:8000/docs
- OpenAPI: http://127.0.0.1:8000/openapi.json

`start.ps1` sirve el build React y la API desde el mismo puerto. Detén el servidor con Ctrl+C. `setup.ps1` no modifica instalaciones globales: usa `.venv` y `node_modules` locales.

Si los runtimes no están en PATH, también puedes indicar sus rutas. `NodeDirectory` debe contener tanto `node.exe` como `npm.cmd`; se añade al PATH del proceso de instalación, sin cambiar el PATH global. `PythonExecutable` solo es necesario al crear `.venv`:

```powershell
.\setup.ps1 -PythonExecutable 'C:\ruta\python.exe' -NodeDirectory 'C:\ruta\node'
```

El instalador reproduce las versiones de `requirements-lock.txt` y `package-lock.json`. En esta laptop se preparó Node.js 24.11.1 dentro de `.cache\tools\node-v24.11.1-win-x64` y un entorno virtual con Python 3.12.14. Para reinstalar y compilar con ese Node local:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1 -NodeDirectory .cache\tools\node-v24.11.1-win-x64
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Estas carpetas locales no se incluyen en Git. El entorno virtual de esta laptop usa el Python incluido con Codex como instalación base; si ese runtime cambia de ubicación, recrea `.venv` indicando una instalación de Python disponible.

## Desarrollo

Terminal 1, desde la raíz:

```powershell
.\start.ps1 -Development
```

Terminal 2:

```powershell
cd CapaPresentacion\frontend
npm run dev
```

Abre http://127.0.0.1:5173. Vite reenvía `/api` a FastAPI. Si el backend está en otro servidor, define `VITE_API_URL` en `CapaPresentacion/frontend/.env` antes de compilar, por ejemplo `VITE_API_URL=https://tu-servidor/api/v1`. En ese backend configura `CORS_ORIGINS` con los orígenes permitidos separados por comas.

## Arquitectura multicapas

```text
CapaPresentacion/
  frontend/src/          React, controles, animaciones y cliente HTTP
    api.ts               Tipos y cliente de la API propia
    components/          Carrusel, fichas, imágenes, carga y diálogo accesible
    App.tsx              Buscador, filtros, historial y paginación
    styles.css           Diseño adaptable y estados
  api/
    routes.py            Endpoints, validación y dependencia del servicio
    main.py              Composición, ciclo de vida, CORS y errores HTTP
CapaNegocio/
  pokemon_service.py     Búsqueda, origen, catálogo y composición de fichas
  models.py              Contratos de datos tipados con Pydantic
CapaDatos/
  pokeapi_repository.py  HTTP a PokéAPI, concurrencia y caché SQLite
tests/                   Pruebas sin depender de la API externa
```

Flujo: **React → REST FastAPI → servicio de negocio → repositorio → PokéAPI**. La capa de negocio depende de un protocolo de repositorio inyectable. El frontend no consulta PokéAPI directamente; las imágenes públicas se cargan desde el repositorio oficial de sprites. FastAPI usa `APIRouter`, modelos de respuesta y un cliente HTTP compartido con cierre correcto.

## REST

| Método y recurso | Uso |
| --- | --- |
| `GET /api/v1/health` | Estado del proceso |
| `GET /api/v1/metadata` | Generaciones, regiones y total |
| `GET /api/v1/catalog` | Índice ligero completo para el carrusel |
| `GET /api/v1/pokemon` | Búsqueda y paginación |
| `GET /api/v1/pokemon-summary` | Búsqueda y paginación con los datos necesarios para las tarjetas |
| `GET /api/v1/pokemon/{nombre-o-id}` | Ficha por nombre exacto o número nacional |

Parámetros de búsqueda: `q` (nombre parcial o número exacto), `region`, `generation`, `offset` (desde 0), `limit` (1–48, por defecto 12). Los filtros se combinan mediante **AND**.

```text
/api/v1/pokemon?q=ditto
/api/v1/pokemon?q=%230025
/api/v1/pokemon?generation=8&region=hisui
/api/v1/pokemon?offset=12&limit=12
/api/v1/pokemon/132
```

Respuestas: `200` con resultados (lista vacía si no hay coincidencias), `404` para ficha inexistente, `422` para parámetros inválidos y `503` con `Retry-After` si PokéAPI no responde.

## Decisiones sobre los datos

- El catálogo muestra **especies y su forma principal**, sin duplicar variantes regionales, Mega ni Gigamax. En la verificación de noviembre de 2026 PokéAPI devuelve 1.025 especies y 9 generaciones; el índice se obtiene dinámicamente.
- «Región de origen» no significa todas las regiones donde puede encontrarse un Pokémon. Se deriva de `generation.main_region`, con Hisui para las especies nacionales 899–905 y «Desconocida» para Meltan y Melmetal. Esta política está centralizada en el servicio y documentada para ampliaciones futuras.
- Se muestran descripciones españolas cuando PokéAPI las ofrece. Si faltan, aparece un texto explícito, sin inventar contenido.
- Caché de 24 horas en memoria y `.cache/pokeapi.sqlite3`. Solo se solicitan los detalles visibles. La concurrencia externa se limita a 12 y las solicitudes simultáneas al mismo recurso se agrupan.
- Las tarjetas solicitan solo los tipos; la descripción y las estadísticas se cargan al abrir la ficha. Las imágenes de la página actual se solicitan de inmediato: se muestra primero un sprite pequeño mientras se descarga la ilustración oficial. Si una fuente falla o tarda más de cinco segundos se prueba otra. El navegador guarda las imágenes según las reglas de caché del proveedor.
- La aplicación necesita Internet para datos no almacenados e imágenes; la caché no pretende ser un modo sin conexión completo.

## Interacciones y accesibilidad

Carrusel cada 6,5 segundos; pausa al enfocar, pasar el ratón, ocultar la pestaña o usar controles manuales. Botones anterior/siguiente/pausa y selección al azar. La preferencia `prefers-reduced-motion` desactiva reproducción y animaciones.

Busca con Enter o el botón; `/` enfoca el buscador. Filtros y página quedan en la URL y respetan Atrás/Adelante. La ficha usa Radix Dialog, cierre con Escape, foco contenido y devolución de foco. Incluye etiquetas accesibles, enlace para saltar al buscador, estados de carga anunciados, errores recuperables e imágenes alternativas.

Bibliotecas: **Motion**, **Radix UI**, **Lucide React** y **Outfit** autoalojada mediante Fontsource.

## Verificación

```powershell
.\.venv\Scripts\python.exe -m pytest -q
cd CapaPresentacion\frontend
npm run build
npm audit --omit=dev
```

Los tests comprueban búsqueda por nombre/número, filtros combinados, Hisui, paginación, normalización de nombres, validación REST, errores externos y persistencia/deduplicación de caché. `requirements-lock.txt` y `package-lock.json` registran las versiones verificadas. Para reproducir Python exactamente: `pip install -r requirements-lock.txt` dentro del entorno virtual.

La auditoría de producción de npm terminó sin vulnerabilidades. La auditoría completa reportó cuatro avisos de severidad alta en herramientas de desarrollo, todos por `picomatch` transitivo de Vite; la última versión publicada disponible durante la revisión seguía afectada. No se forzó una degradación de Vite. Revisar actualizaciones antes de exponer un servidor de desarrollo; los scripts lo vinculan a 127.0.0.1.

## Diseño

[Diseño editable en Figma](https://www.figma.com/design/27d0UhKi4xMRFUfMl8R3e6?node-id=5-186). Incluye componentes reutilizables, tokens y texto Outfit editable. Ver `DESIGN.md` y `PRODUCT.md` para las decisiones del producto.

Proyecto educativo no oficial. Pokémon pertenece a Nintendo, Creatures y GAME FREAK. Datos e ilustraciones proporcionados por PokéAPI.
