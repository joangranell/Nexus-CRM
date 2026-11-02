# Reglas Operativas y Flujo de Trabajo Git para Nexus CRM

> **REGLA DE ORO DE DESARROLLO Y PUBLICACIÓN (INQUEBRANTABLE):**
>
> 1. **Entorno de Desarrollo (`Nexus-CRM-Dev`):**
>    * Rama de trabajo activa: `main`
>    * Repositorio remoto: `dev` (`https://github.com/joangranell/Nexus-CRM-Dev.git`)
>    * **Siempre que el usuario pida cambios, nuevas funciones, mejoras o correcciones**, estos se desarrollan, prueban y confirman exclusivamente en la rama `main` y se sincronizan con `git push dev main`.
>
> 2. **Entorno Público / Producción (`Nexus-CRM`):**
>    * Rama de publicación: `public`
>    * Repositorio remoto: `origin` (`https://github.com/joangranell/Nexus-CRM.git`)
>    * **ÚNICA Y EXCLUSIVAMENTE cuando el usuario lo indique de manera expresa** (ej. *"publica en Nexus-CRM"*, *"sube a la rama public"*, *"pasa a producción"*), se trasladarán los cambios empaquetados a la rama `public` y se hará `git push origin public`.
>    * La rama `main` nunca debe subirse al repositorio público `origin` (Nexus-CRM).
