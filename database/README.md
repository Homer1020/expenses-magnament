# Base de Datos (Database)

Esquema SQL y seeders para Supabase (PostgreSQL).

## 📁 Estructura

```text
database/
├── schema.sql                    # Esquema completo: tablas, índices, RLS y reset_my_data()
├── seeders/
│   └── 01_seed_initial_data.sql  # Datos iniciales (categorías, cuentas, metas, recurrentes)
└── README.md
```

## 🚀 Configurar la base de datos

1. En Supabase abre **SQL Editor > New query**.
2. Pega el contenido de [schema.sql](schema.sql) y ejecútalo. Es idempotente: se puede re-ejecutar sin romper datos.
3. (Opcional) Regístra un usuario y ejecuta el seeder (ver abajo).

`schema.sql` reemplaza a las migraciones incrementales anteriores: representa el estado final de la base.

### Tablas

| Tabla | Propósito |
|---|---|
| `categories` | Categorías de ingreso (`type = 1`) y egreso (`type = 0`). |
| `accounts` | Cuentas de presupuesto con porcentaje de reparto. |
| `transactions` | Transacciones en USD con `date`, `input_currency` (`USD`/`VES`) y, opcionalmente, `exchange_rate` y `bs_amount`. |
| `budget_goals` | Límite mensual de gasto por categoría. |
| `recurring_transactions` | Plantillas semanales/mensuales/anuales que generan transacciones. |

Todas tienen RLS: cada usuario solo accede a sus filas. La función RPC `reset_my_data()` borra transacciones, recurrentes y metas del usuario, y conserva categorías y cuentas.

### Cambios futuros

Si cambias el esquema en una base ya existente, escribe el `ALTER` en el SQL Editor, ejecútalo y actualiza `schema.sql` para que siga reflejando el estado real.

## 🌱 Seeders

| Archivo | Descripción |
|---|---|
| `seeders/01_seed_initial_data.sql` | Hace `TRUNCATE ... CASCADE` y siembra 20 categorías, 5 cuentas (100%), metas de gasto y 3 recurrentes de ejemplo. Usa el primer usuario de `auth.users` o el UUID indicado en la cabecera. |

> ⚠️ El seeder **borra todos los datos** de las tablas antes de insertar. Úsalo solo en desarrollo o en una base vacía.
