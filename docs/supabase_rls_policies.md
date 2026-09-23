# Políticas RLS (Row Level Security) - Gestor Cupones B2B

## Contexto de Seguridad
Dado que este proyecto utiliza un sistema de login propio (verificando NIT + Celular) y **no** utiliza la autenticación nativa de Supabase (Supabase Auth), todas las peticiones desde tu frontend llegan a la base de datos con el rol anónimo (`anon`).

Para que tu código Javascript pueda interactuar con la base de datos, **es indispensable** configurar políticas que permitan estas acciones a los roles públicos. 

> **⚠️ Advertencia de Seguridad:** Al configurar `true` para operaciones de lectura/escritura en rol público, estás igualando el nivel de seguridad que tenías en Google Apps Script (cualquiera con acceso a la URL y a la Anon Key puede interactuar con los datos si sabe cómo hacerlo). Esto es normal en esta etapa de migración, pero a futuro se recomienda migrar a Supabase Auth.

---

## Configuración General en el Dashboard

Para todas las políticas descritas abajo, cuando vayas al Dashboard de Supabase (Authentication -> Policies -> New Policy -> For full customization), utilizarás los siguientes parámetros base:
- **Policy Behavior:** Permissive
- **Target Roles:** `anon` (o dejar vacío para `public`)
- **Expresiones SQL (Las líneas de código que te pide rellenar al final):**
  - Si seleccionas **SELECT** o **DELETE**, te pedirá una expresión `USING`. Escribe: `true`
  - Si seleccionas **INSERT**, te pedirá una expresión `WITH CHECK`. Escribe: `true`
  - Si seleccionas **UPDATE** o **ALL**, te pedirá ambas (`USING` y `WITH CHECK`). Escribe `true` en **ambas**.

---

## Políticas requeridas por Tabla

### 1. `clientes_b2b`
- **SELECT**: Crear política para que `admin.js`, `cliente.js` y `usuario.js` puedan leer los negocios. (Template: *Enable read access for all users*).
- **INSERT, UPDATE, DELETE**: Crear políticas para que `admin.js` pueda crear, editar y eliminar negocios. (Policy Command: *ALL*, USING: `true`).

### 2. `cod_ciudades`
- **SELECT**: Crear política para cargar los selectores de ciudades en todos los paneles. (Template: *Enable read access for all users*).

### 3. `cod_tiendas`
- **SELECT**: Crear política para cargar/validar tiendas. (Template: *Enable read access for all users*).

### 4. `cupones_generados`
- **SELECT**: Crear política para cargar el catálogo. (Template: *Enable read access for all users*).
- **INSERT, UPDATE, DELETE**: Crear políticas (o una tipo *ALL*) para que los clientes B2B puedan publicar, editar y borrar cupones, y para que los usuarios finales puedan incrementar la `Cantidad Reclamada` al canjear.

### 5. `cupones_reclamados`
- **SELECT**: Crear política para consultar el historial en el panel de clientes B2B. (Template: *Enable read access for all users*).
- **INSERT**: Crear política para que `usuario.js` pueda guardar la reclamación.
- **UPDATE, DELETE**: Crear políticas para que el administrador gestione el estado del reclamo (si es necesario).

### 6. `usuarios`
- **SELECT**: Crear política para que el sistema valide si un celular ya existe. (Template: *Enable read access for all users*).
- **INSERT**: Crear política para registrar nuevos usuarios finales.
- **UPDATE**: Crear política para actualizar datos si el usuario ya existe.
- **DELETE**: Crear política para la administración.
