# CODING STANDARDS — SharkFit

## Nomenclatura de archivos
- Archivos de componentes React: `PascalCase.jsx`
- Archivos utilitarios y controladores: `camelCase.js`
- Prohibido commitear archivos `.bak` o `.IMPROVED`

## Estructura de un controller (Node.js)
```js
// Ejemplo controller
async function getUser(req, res) {
  try {
    // lógica principal
  } catch (err) {
    // manejo de error
    logger.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
}
module.exports = { getUser };
```

## Estructura de un componente React
```jsx
import React from 'react';

function ExampleComponent({ prop }) {
  // hooks y lógica
  return (
    <div>{prop}</div>
  );
}
export default ExampleComponent;
```

## Reglas de seguridad y calidad
- Prohibido commitear archivos `.bak` o `.IMPROVED`
- Prohibido usar `console.log` en producción; usar el logger
- Toda función asíncrona debe tener `try/catch`
- Imports siempre ordenados (builtin, externos, internos)
- No usar `eval` bajo ningún motivo
- Usar `eslint` y `prettier` antes de commitear

## Reglas de hooks React
- Usar hooks solo en componentes o custom hooks
- `useEffect` debe tener dependencias claras
- No abusar de `useState` para datos complejos

## Otros
- Mantener funciones pequeñas y reutilizables
- Documentar funciones complejas
- Usar destructuring en parámetros y props
