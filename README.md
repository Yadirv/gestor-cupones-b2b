# 🎟️ Gestor Cupones B2B — Plataforma Zero-Server con Supabase RLS

> Sistema de emisión, gestión y canje de cupones comerciales B2B con múltiples puntos de entrada desacoplados por rol (`admin`, `cliente`, `usuario`), seguridad multi-inquilino gobernada al 100% por políticas **PostgreSQL Row Level Security (RLS)** y notificaciones transaccionales a WhatsApp vía **Supabase Edge Functions**.

![Vanilla JS](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript)
![HTML5](https://img.shields.io/badge/HTML5-Semántico-E34F26?style=flat-square&logo=html5)
![CSS3](https://img.shields.io/badge/CSS3-Modular-1572B6?style=flat-square&logo=css3)
![PostgreSQL RLS](https://img.shields.io/badge/PostgreSQL-Row_Level_Security-336791?style=flat-square&logo=postgresql)
![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions-3ECF8E?style=flat-square&logo=supabase)
![WhatsApp API](https://img.shields.io/badge/WhatsApp-Webhook_Notifier-25D366?style=flat-square&logo=whatsapp)

---

## 📑 Tabla de Contenidos
1. [Arquitectura Zero-Server Monolítico](#-arquitectura-zero-server-monolítico)
2. [Puntos de Entrada por Rol](#-puntos-de-entrada-por-rol)
3. [Modelo de Seguridad RLS](#-modelo-de-seguridad-rls)
4. [Notificaciones Transaccionales WhatsApp](#-notificaciones-transaccionales-whatsapp)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Instalación y Despliegue](#-instalación-y-despliegue)

---

## 💡 Arquitectura Zero-Server Monolítico

Este proyecto demuestra cómo construir una plataforma segura y multi-rol sin necesidad de mantener un backend monolítico con Node/Express:

* La lógica de negocio y validación de permisos se traslada a la **capa de base de datos** mediante políticas PostgreSQL RLS.
* El frontend consume directamente la API REST generada automáticamente por Supabase vía CDN SDK.
* Tiempos de carga ultra-rápidos (<200ms) y costos de infraestructura prácticamente cero.

---

## 👥 Puntos de Entrada por Rol

El sistema cuenta con tres interfaces HTML independientes y optimizadas:

1. **`admin.html` (Administrador General):**
   * Panel de control maestro para crear tiendas participantes (`cod_tiendas`), asignar cupones y auditar métricas globales de redención.
2. **`cliente.html` (Comercio / Tienda B2B):**
   * Vista para que los comercios verifiquen y validen cupones presentados por clientes en tiempo real.
3. **`usuario.html` (Consumidor Final):**
   * Portal amigable para consultar cupones disponibles, solicitar nuevos códigos y visualizarlos en el móvil.

---

## 🛡️ Modelo de Seguridad RLS

Las políticas de Row Level Security garantizan que ningún usuario o comercio pueda acceder a datos ajenos:
* `cupones_generados`: Solo visibles por el administrador y el comercio emisor.
* `cupones_reclamados`: Solo modificables si el cupón está activo y no ha caducado.
* Consulta la especificación completa en [`docs/supabase_rls_policies.md`](docs/supabase_rls_policies.md).

---

## 📲 Notificaciones Transaccionales WhatsApp

Al redimir un cupón, la base de datos dispara la Edge Function `whatsapp-notifier` (Deno runtime) para enviar un comprobante instantáneo vía WhatsApp al número del cliente.

---

## 📂 Estructura del Proyecto

```
gestor-cupones-b2b/
├── docs/                           # Políticas detalladas de seguridad RLS
│   └── supabase_rls_policies.md
├── css/                            # Estilos modulares para admin, cliente y usuario
├── js/                             # Scripts de interacción con Supabase y lógica de rol
├── admin.html                      # Portal de administración
├── cliente.html                    # Portal del comercio validador
├── usuario.html                    # Portal del consumidor final
├── .env.example
├── vercel.json                     # Reglas de enrutamiento y cabeceras de seguridad
└── package.json
```

---

## 💻 Instalación y Despliegue

```bash
# 1. Configurar variables de entorno
cp .env.example .env

# 2. Servir localmente
npx serve .
```

Abre `http://localhost:3000/admin.html` en tu navegador.
