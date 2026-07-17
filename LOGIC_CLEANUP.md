# Logic cleanup decisions

## Confirmed behaviour

- CRM data is available only when the signed-in user has an active Clerk
  organization. There is no fallback personal workspace.
- Agent conversations and knowledge are shared within the active organization.
  The session creator is retained for auditability only.
- Lead parsing may leave contact details empty. It must not invent an email
  address or phone number.

## Operational note

`20260101000001_reconcile_to_initial_schema.sql` drops and recreates tables.
Do not run it against a database containing production data. A data-preserving
migration requires an inventory of the live legacy schema and a backup first.
