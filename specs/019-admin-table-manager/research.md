# Research: Admin Table Manager

## Unknowns Resolved

- **Table Component in Form Builder**: Shadcn UI has a Table component that can be used for rendering the tabular view. We will leverage this for both the admin preview and the user form filling view.
- **Form Submission Data Structure**: The form submission will store the table data as a JSON array or object mapped to the columns and rows.
- **Translation Keys**: All UI labels like "Add Column", "Add Row", "Table Options", "Column Name", "Row Name" will be added to `en.json` and `ar.json` and verified with `npm run i18n:sync` per the Constitution.

## Best Practices

- Use `react-hook-form` / `zod` for form validation of the table rows and columns.
- Ensure the Table component is responsive (horizontal scroll on mobile) by wrapping it in a container with `overflow-x-auto`.
- Use Mongoose schema flexibility to accommodate the dynamic nature of table row and column definitions.
