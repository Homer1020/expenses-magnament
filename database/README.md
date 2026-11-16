# Base de Datos (Database)

Esta carpeta contiene los scripts SQL organizados por orden de ejecución para migraciones de esquema y datos iniciales (seeders).

---

## 📁 Estructura

```text
database/
├── migrations/
│   ├── 01_transactions_update_policy.sql
│   ├── 02_budget_goals_and_recurring_transactions.sql
│   ├── 03_transactions_required_rate.sql
│   ├── 04_transactions_optional_rate.sql
│   ├── 05_transactions_date.sql
│   ├── 06_reset_account.sql
│   └── historical/
│       ├── transactions_bs_amount.sql
│       └── transactions_exchange_rate.sql
├── seeders/
│   └── 01_seed_initial_data.sql
└── README.md
```

---

## 🚀 Orden de Ejecución de Migraciones

Si necesitas configurar la base de datos o aplicar actualizaciones en Supabase, ejecuta los archivos en el siguiente orden:

| # | Archivo | Propósito |
|---|---|---|
| **01** | `migrations/01_transactions_update_policy.sql` | Agrega políticas RLS para permitir `UPDATE` y `DELETE` de transacciones propias. |
| **02** | `migrations/02_budget_goals_and_recurring_transactions.sql` | Crea las tablas `budget_goals` (metas de gasto) y `recurring_transactions` (gastos e ingresos automáticos), sus índices y políticas RLS. |
| **03** | `migrations/03_transactions_required_rate.sql` | Agrega `input_currency` ('USD' \| 'VES'), rellena tasas históricas faltantes y monto equivalente en Bs (`bs_amount`). *(Sustituye a los scripts preliminares en `historical/`)*. |
| **04** | `migrations/04_transactions_optional_rate.sql` | Vuelve opcional la tasa y monto en Bs para transacciones 100% en dólares (ej. comisiones PayPal, Zelle) y añade restricción de coherencia. |
| **05** | `migrations/05_transactions_date.sql` | Agrega el campo `date` (tipo `DATE`, solo día `YYYY-MM-DD`) para la fecha real de la transacción con `DEFAULT CURRENT_DATE NOT NULL`, rellenando los registros existentes con `created_at::date` sin tocar el registro original de creación. |
| **06** | `migrations/06_reset_account.sql` | Crea la función RPC `reset_my_data()` en PostgreSQL para que el usuario pueda vaciar sus transacciones y metas sin borrar sus categorías ni cuentas. |

> ℹ️ **Nota sobre `migrations/historical/`**: Contiene scripts de versiones preliminares (`transactions_bs_amount.sql` y `transactions_exchange_rate.sql`) que fueron consolidados y mejorados en la migración `03`. Se conservan únicamente como referencia histórica.

---

## 🌱 Seeders (Datos de Prueba / Iniciales)

Los seeders sirven para inicializar categorías, cuentas de presupuesto y metas para un usuario:

| Archivo | Descripción |
|---|---|
| `seeders/01_seed_initial_data.sql` | Reinicia las tablas (`TRUNCATE CASCADE`) y siembra 20 categorías estándar (ingresos y egresos), 5 cuentas con reparto 100%, metas de gasto mensuales y 3 transacciones recurrentes de ejemplo. Toma automáticamente el primer usuario registrado en `auth.users` o el UUID especificado en la cabecera. |

