# Data Model: Admin Table Manager

## Mongoose Schema Updates

The existing `Form` schema and `Submission` schema need to handle the new `Table` field type.

### FormField Schema Extensions

For the `Table` field type, the `properties` or `config` object will be extended:

```typescript
type TableColumn = {
  id: string;
  label: string; // Translation key or raw text
  type: 'text' | 'number';
};

type TableRowHeader = {
  id: string;
  label: string; // Translation key or raw text
};

type TableFieldConfig = {
  columns: TableColumn[];
  rowHeaders: TableRowHeader[];
  allowUserAddRows: boolean;
};
```

*Note: Following Constitution Rule VIII, any additive fields at the schema level will use `default: null`.*

## Entity Contracts

The domain entity `FormField` will support the `TABLE` type and validate the configuration using Zod.

```typescript
const TableFieldSchema = z.object({
  type: z.literal('TABLE'),
  config: z.object({
    columns: z.array(z.object({ id: z.string(), label: z.string(), type: z.enum(['text', 'number']) })),
    rowHeaders: z.array(z.object({ id: z.string(), label: z.string() })),
    allowUserAddRows: z.boolean().default(false)
  }).nullable().default(null)
});
```
