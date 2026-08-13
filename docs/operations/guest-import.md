# Guest import contract

Guest imports are preview-first. Selecting a CSV never changes the active event until validation completes and a staff user explicitly applies the preview.

## Columns

| Column | Required | Purpose |
|---|---:|---|
| `first_name` | yes | Guest given name |
| `last_name` | yes | Guest family name |
| `party` | yes | Arrival group shown during identity confirmation |
| `table` | no | Seating assignment; missing values enter `needs_attention` |
| `zone` | no | Floor or room context for the table |
| `note` | no | Operational staff note |

Header names are normalized, so `First Name` and `first_name` are equivalent. Quoted cells, commas inside notes, and escaped quotes are supported.

## Validation policy

- Missing required columns or required row values block the import.
- Exact duplicate guest/party/table rows block the import.
- Duplicate names are allowed but generate a warning because staff must verify party and table.
- Missing table assignments generate a warning and set the guest to `needs_attention`.
- Import is locked after check-in activity begins. Staff must deliberately reset a synthetic review before replacing the dataset.

Applying an import atomically replaces guests, parties, and tables and creates an auditable `import_guests` mutation in the durable outbox.
