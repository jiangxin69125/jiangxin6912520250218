# Source Provenance

This project borrows lightweight practices from external repositories without copying their full architectures.

## tinyhumansai/openhuman

Used ideas:

- keep secrets in environment variables
- provide an `.env.example`
- keep local `.env` files out of Git
- prefer explicit startup and verification scripts

## HKUDS/CLI-Anything

Used ideas:

- expose machine-readable status through JSON
- provide a local diagnostic command
- keep automated checks small and composable

## Imbad0202/academic-research-skills

Used ideas:

- keep humans in the loop for important decisions
- record provenance and project decisions
- treat integrity checks as part of the workflow
- route security-sensitive reports away from public issues
