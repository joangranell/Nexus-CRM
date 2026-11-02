# Especificación Funcional y Arquitectural: Prospectos y Categorización de Clientes

Este documento define la integración de la capa de **Prospecto** en el embudo comercial, la **categorización dual de clientes** (Distribuidor vs. Cliente Final) y las adaptaciones necesarias en el **módulo de importación** del sistema Nexus CRM.

---

## 1. Integración de la Capa de Prospecto en el Embudo

Para optimizar el filtrado de cuentas antes de iniciar negociaciones comerciales formales, se formaliza el ciclo de vida comercial en cuatro fases secuenciales:

$$\text{Lead} \rightarrow \text{Prospecto} \rightarrow \text{Potencial} \rightarrow \text{Cliente}$$

*   **Lead (Captación inicial):** Contacto en bruto obtenido a través de campañas, ferias o registros web sin validar.
*   **Prospecto (Cualificación):** Fase intermedia donde se verifica que el registro cumple con los requisitos mínimos, interés real y potencial de negocio, separando a los contactos cualificados de los curiosos.
*   **Potencial (Oportunidad de Venta):** Fase activa de negociación donde se cuantifica el valor económico y las probabilidades de cierre.
*   **Cliente:** Cuenta cerrada y activa en cartera.

---

## 2. Categorización de Clientes y Relación Jerárquica

El modelo de negocio opera bajo un canal de distribución indirecta de dos niveles, lo que obliga a diferenciar claramente entre la entidad que asume el pago de la factura y la entidad que recibe el producto.

### Tipologías de Cliente:
1. **Distribuidor:** El mayorista o distribuidor logístico (*Cliente Factura*, quién asume y abona las facturas).
2. **Cliente Final:** El punto de venta o establecimiento consumidor final (*Cliente Pedido*, ej. restaurante, clínica, taller).

### Relación en el Modelo de Datos:
*   Al cualificar un registro de tipo **Cliente Final** (durante la transición de Lead a Prospecto), se habilita obligatoriamente un campo relacional denominado **"Distribuidor Asociado"** o **"Cliente Factura"** (`billing_account_id`).
*   **Implicación en pedidos/facturación:** El sistema mantiene la trazabilidad indicando el *Cliente Pedido* (el Cliente Final) vinculado al *Cliente Factura* (el Distribuidor).

---

## 3. Adaptaciones Requeridas en el Módulo de Importación

Para asegurar que la carga masiva de datos (CSV / Excel) no corrompa el pipeline ni rompa las relaciones de negocio, el módulo de importación debe adaptarse con las siguientes reglas:

1. **Mapeo del Estado del Ciclo de Vida:**
   * El asistente de importación debe permitir asignar el estado inicial del registro (`lead`, `prospect`, `potential`, `customer`). Por defecto, si no se especifica, los registros importados masivamente ingresarán como `lead`.

2. **Validación del Campo de Tipología (`client_type`):**
   * Se añade una columna obligatoria o condicional para definir si el registro es `distributor` o `cliente_final`.

3. **Resolución de Dependencias para Cliente Final (Cliente Factura):**
   * Si en la importación se define un registro como `cliente_final`, el archivo de importación debe incluir la referencia al distribuidor (mediante su código de cuenta, nombre o CIF/NIF).
   * **Regla de validación previa:** El módulo de importación debe comprobar que el *Cliente Factura* exista previamente en la base de datos o esté incluido en el mismo lote de importación (procesando primero a los distribuidores y posteriormente a los clientes finales).

4. **Prevención de Errores en el Pipeline (Salvaguarda de Forecasting):**
   * La importación masiva no debe inyectar registros directamente en la fase de *Potencial* a menos que se acompañe de los atributos económicos obligatorios (importe y fecha estimada de cierre), degradando preventivamente a *Prospecto* para evitar contaminar las métricas de previsión (*forecasting*).
