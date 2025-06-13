import type { Account } from "@/types";
import type { ColumnDef } from "@tanstack/vue-table";

export const columns: ColumnDef<Account>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell({ row }) { return row.getValue('id') }
  },
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell ({ row }) { return row.getValue('name') }
  },
  {
    accessorKey: 'id',
    header: 'Acciones',
    cell() { return 'acciones' }
  }
]