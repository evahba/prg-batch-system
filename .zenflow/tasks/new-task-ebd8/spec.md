# Technical Specification

## Task
Restart Docker containers and report new IPs.

**Difficulty**: easy

## Technical Context
- Docker CLI available on host
- 3 containers: `prg-web`, `prg-api`, `prg-postgres`

## Implementation Approach
1. Run `docker restart` on all 3 containers
2. Run `docker inspect` to retrieve assigned IPs
3. Report results to user

## Results
| Container | New IP | Status |
|-----------|--------|--------|
| prg-web | 172.17.0.2 | Running |
| prg-postgres | 172.19.0.2 | Running |
| prg-api | N/A | Crashed (Exit 1) — pre-existing issue |

## Notes
`prg-api` was already exited before the restart request and continues to crash after restart. The container has a bug unrelated to this task.
