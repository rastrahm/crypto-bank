# Mejoras futuras — Crypto Bank Vault

Ideas **fuera del alcance** del módulo 02 (Fases 0–6). Prioridad sugerida para un fork / v2.

---

## On-chain

| Mejora | Valor | Complejidad |
|--------|--------|-------------|
| **ERC-2612 Permit** en deposit ERC-20 | Una sola firma (approve+deposit) | Media |
| **Multisig / Timelock** como `initialOwner` documentado en script prod | Pause no depende de EOA | Baja (ops) + media (script) |
| Cap por usuario / TVL | Riesgo de concentración | Media |
| Roles (`AccessControl`) separados: pauser ≠ allowlist ≠ rescue | Menos privilegio concentrado | Media |
| Medir delta también en **withdraw** fee-on-transfer | UX más justa con tax tokens | Media (gas + diseño) |
| Eventos indexables + subgraph | Explorador de depósitos | Alta (off-chain) |
| Pausable granular (solo depósitos) | Owner puede congelar inflows sin bloquear retiros | Media (cambio de producto) |

---

## Frontend / producto

| Mejora | Valor | Complejidad |
|--------|--------|-------------|
| SIWE / sesión verificada en servidor | Auth real | Alta |
| Leer `decimals()` on-chain si falta en env | Menos config manual | Baja |
| Historial de txs (explorer links) | Confianza UX | Baja |
| Modo solo-lectura sin login | Ver vault público | Baja |
| i18n EN/ES | Audiencia más amplia | Media |
| Wagmi/Viem (opcional) | Ecosistema React | Media (reescribe cliente) |

---

## Ops / demo

| Mejora | Valor | Complejidad |
|--------|--------|-------------|
| Docker Compose (frontend + opcional anvil) | Onboarding 1 comando | Media |
| CI: `forge test` + `npm test` + `npm run build` | Calidad en cada PR | Baja (ya hay workflow parcial) |
| Staging Sepolia automático | Demo siempre viva | Alta |

---

## No priorizar (para esta demo)

- Mainnet con fondos reales sin auditoría externa.  
- Indexer propio completo.  
- App móvil nativa.  
