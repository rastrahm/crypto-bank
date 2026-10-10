const I18N = {
  es: {
    'html.lang': 'es',
    'meta.title': 'Crypto Bank Vault — Rolando Strahm',
    'meta.description':
      'Vault DeFi multi-activo (ETH + ERC-20) con CEI, gas optimizado, auditoría SWC y demo Next.js. Foundry · Solidity 0.8.24.',

    'nav.overview': 'Proyecto',
    'nav.pillars': 'Pilares',
    'nav.gas': 'Gas',
    'nav.swc': 'SWC',
    'nav.process': 'Proceso',
    'nav.attacks': 'Ataques',
    'nav.repos': 'Repos',
    'nav.close': '← Cerrar',

    'hero.tag': '// MÓDULO 02 · PORTFOLIO WEB3',
    'hero.title': 'CRYPTO BANK<br>VAULT',
    'hero.role': 'Solidity 0.8.24 · Foundry · Gas · SWC · Next.js',
    'hero.sub':
      'Vault DeFi multi-activo (ETH + ERC-20) con ledger interno, CEI, pause, allowlist, optimización de gas documentada y campañas defensivas SWC — más demo web con ethers.js.',
    'hero.cta1': 'Ver en GitHub',
    'hero.cta2': 'Ver en GitLab',

    'ov.eyebrow': '// 01 — CONTEXTO',
    'ov.title': 'Por qué este proyecto',
    'ov.lead':
      'Segundo módulo de la suite: un <strong>vault bancario descentralizado</strong> donde el riesgo real está en retiros ETH, reentrancy y tokens no estándar. Cerré el ciclo con <strong>gas</strong>, matriz <strong>SWC-100–136</strong>, fuzz/invariant y un frontend Next.js operativo.',

    'pi.eyebrow': '// 02 — TRES PILARES',
    'pi.title': 'Qué entrega el módulo',
    'p1.num': '// PILAR_01',
    'p1.title': 'Vault multi-activo',
    'p1.desc':
      'Ledger interno ETH + ERC-20 allowlisted, Ownable2Step, Pausable, SafeERC20, rescue de surplus y CEI estricto.',
    'p1.l1': 'deposit / withdraw ETH & ERC-20',
    'p1.l2': 'Allowlist + delta fee-on-transfer',
    'p1.l3': 'ReentrancyGuardTransient (Cancun)',
    'p2.num': '// PILAR_02',
    'p2.title': 'Optimización de gas',
    'p2.desc':
      'Transient reentrancy, unchecked post-check, cache de msg.sender, custom errors y pause una sola vez — medido con forge gas-report.',
    'p2.l1': 'Deploy −56 657 gas',
    'p2.l2': 'withdrawETH −2 678 avg',
    'p2.l3': 'depositERC20 −4 301 avg',
    'p3.num': '// PILAR_03',
    'p3.title': 'Verificación de ataques',
    'p3.desc':
      'Matriz SWC completa y campañas A–E en Foundry: reentrancy, ETH forzado, integridad de ledger, unchecked y superficie N/A.',
    'p3.l1': '0 vulnerabilidades SWC explotables',
    'p3.l2': '55 tests Foundry (unit/attack/fuzz/inv)',
    'p3.l3': 'Demo Next.js + ethers v6',

    'gas.eyebrow': '// 03 — OPTIMIZACIÓN DE GAS',
    'gas.title': 'Menos storage, hot paths baratos',
    'gas.lead':
      'Fase 2 del vault: cada optimización documenta su <strong>tradeoff</strong>. Baseline vs post-opt con <code>forge test --match-contract CryptoBankVaultTest --gas-report</code>. Luego se aceptó coste extra de <code>balanceOf</code> delta en depósito ERC-20 para mitigar fee-on-transfer.',
    'gas.m1': 'Deploy cost',
    'gas.m2': 'withdrawETH avg',
    'gas.m3': 'depositERC20 avg',
    'gas.m4': 'withdrawERC20 avg',
    'gas.th1': 'Optimización',
    'gas.th2': 'Tradeoff / efecto',
    'gas.r1a': 'ReentrancyGuardTransient (EIP-1153)',
    'gas.r1b': 'Guard más barato; requiere EVM Cancun+',
    'gas.r2a': 'unchecked en restas de ledger',
    'gas.r2b': 'Solo tras bal >= amount; ahorra overflow check',
    'gas.r3a': 'Cache de msg.sender en paths calientes',
    'gas.r3b': 'Menos opcodes CALLER repetidos',
    'gas.r4a': 'Pause chequeado una sola vez',
    'gas.r4b': 'Evita SLOAD duplicado de paused en receive/helpers',
    'gas.r5a': 'Custom errors',
    'gas.r5b': 'Reverts compactos vs require con strings',
    'gas.r6a': 'Delta balanceOf en depositERC20',
    'gas.r6b': '+2 calls externos; mitiga fee-on-transfer en depósito',

    'swc.eyebrow': '// 04 — VERIFICACIÓN SWC',
    'swc.title': 'SWC Registry · EIP-1470',
    'swc.lead':
      'Matriz completa <strong>SWC-100 → SWC-136</strong> contra <code>CryptoBankVault</code>. Informe en <code>doc/SWC-AUDIT-ES.md</code>. Conclusión: <strong>0 vulnerabilidades explotables</strong>; 1 ítem informativo (SWC-114 approve ERC-20 externo).',
    'swc.s1': 'Mitigados / N/A',
    'swc.s2': 'Informativos (diseño)',
    'swc.s3': 'Vulnerables',
    'swc.th1': 'SWC clave',
    'swc.th2': 'Mitigación en el contrato',
    'swc.r101': 'Overflow: Solidity 0.8.24; unchecked solo tras bal >= amount',
    'swc.r103': 'Floating pragma: pragma solidity 0.8.24 fijo',
    'swc.r104': 'ETH .call con check; ERC-20 vía SafeERC20',
    'swc.r105': 'Retiros solo del ledger de msg.sender + pause + nonReentrant',
    'swc.r107': 'CEI + ReentrancyGuardTransient; tests AttackE / Reentrancy*',
    'swc.r132': 'ETH forzado = surplus; rescue solo surplus; ledger intacto',
    'swc.info': 'INFORMATIVO',
    'swc.i1t': 'Approve front-running',
    'swc.i1d':
      'Race del ERC-20 externo. Mitigación FE: approve(0)→N o permit del token; el vault no gestiona allowances.',
    'swc.i2t': 'Fee-on-transfer / rebase',
    'swc.i2d':
      'Depósito: delta balanceOf. Retiro fee: documentado. Rebase/mentiroso: solo allowlist (confianza en owner).',

    'pr.eyebrow': '// 05 — PROCESO',
    'pr.title': 'Fases 0–6 cerradas',
    'pr.lead':
      'Gates TDD: bootstrap, diseño + tests, vault completo, deploy/ABI, frontend, VPS y handoff documental.',
    'ph.0': 'Bootstrap Foundry',
    'ph.12': 'Diseño TDD + vault + gas',
    'ph.3': 'Deploy scripts + ABI',
    'ph.4': 'Frontend Next.js + ethers',
    'ph.56': 'VPS + handoff / SWC',
    'st.1': 'Fases',
    'st.2': 'Campañas',
    'st.3': 'SWC críticos',
    'st.4': 'Tests Forge',
    'term.label': 'rolando@strahm:~/02-crypto-bank',
    'term.1': 'forge test --match-test test_Attack',
    'term.2': '[PASS] suite · attack campaigns green',
    'term.3': 'cat doc/SWC-AUDIT-ES.md | head',
    'term.4': 'Vulnerable: 0 · Informativos: 1 · Mitigados/N/A: 34',
    'term.5': 'echo status',
    'term.6': 'MODULE_02_CLOSED · SWC_0_CRITICAL · GAS_DOCUMENTED',

    'at.eyebrow': '// 06 — CAMPAÑAS DE ATAQUE',
    'at.title': 'Defensivo, no ofensivo',
    'at.lead':
      'Tests Foundry donde el “ataque” debe fallar o quedar documentado como límite de estándar. Sin PoCs de exploit.',
    'cA.t': 'Integridad',
    'cA.d': 'Ledger, allowlist, fee-on-transfer, rescue.',
    'cB.t': 'Permit N/A',
    'cB.d': 'Sin firmas en el vault; checklist estático.',
    'cC.t': 'Orden txs',
    'cC.d': 'Approve race del ERC-20 externo (doc).',
    'cD.t': 'Unchecked',
    'cD.d': 'Vaciado exacto sin underflow.',
    'cE.t': 'Superficie',
    'cE.d': 'Reentrancy, ETH forzado, pause, bytecode.',

    're.eyebrow': '// 07 — CÓDIGO ABIERTO',
    're.title': 'Repositorios',
    're.lead': 'Contrato, tests, gas, SWC, frontend y playbook VPS en GitHub y GitLab.',
    're.cta': 'Contactar',
    're.linkedin': 'LinkedIn',

    'ft.left': 'ROLANDO STRAHM — Crypto Bank Vault · Portfolio',
    'ft.right': 'FOUNDRY · SOLC 0.8.24 · ALL_SYSTEMS_OPERATIONAL',
  },

  en: {
    'html.lang': 'en',
    'meta.title': 'Crypto Bank Vault — Rolando Strahm',
    'meta.description':
      'Multi-asset DeFi vault (ETH + ERC-20) with CEI, optimized gas, SWC audit, and Next.js demo. Foundry · Solidity 0.8.24.',

    'nav.overview': 'Project',
    'nav.pillars': 'Pillars',
    'nav.gas': 'Gas',
    'nav.swc': 'SWC',
    'nav.process': 'Process',
    'nav.attacks': 'Attacks',
    'nav.repos': 'Repos',
    'nav.close': '← Close',

    'hero.tag': '// MODULE 02 · WEB3 PORTFOLIO',
    'hero.title': 'CRYPTO BANK<br>VAULT',
    'hero.role': 'Solidity 0.8.24 · Foundry · Gas · SWC · Next.js',
    'hero.sub':
      'Multi-asset DeFi vault (ETH + ERC-20) with internal ledger, CEI, pause, allowlist, documented gas optimizations, and defensive SWC campaigns — plus a Next.js / ethers demo.',
    'hero.cta1': 'View on GitHub',
    'hero.cta2': 'View on GitLab',

    'ov.eyebrow': '// 01 — CONTEXT',
    'ov.title': 'Why this project',
    'ov.lead':
      'Second suite module: a <strong>decentralized banking vault</strong> where real risk lives in ETH withdrawals, reentrancy, and non-standard tokens. I closed the loop with <strong>gas</strong>, a full <strong>SWC-100–136</strong> matrix, fuzz/invariant tests, and a working Next.js frontend.',

    'pi.eyebrow': '// 02 — THREE PILLARS',
    'pi.title': 'What the module ships',
    'p1.num': '// PILLAR_01',
    'p1.title': 'Multi-asset vault',
    'p1.desc':
      'Internal ETH + allowlisted ERC-20 ledger, Ownable2Step, Pausable, SafeERC20, surplus rescue, and strict CEI.',
    'p1.l1': 'deposit / withdraw ETH & ERC-20',
    'p1.l2': 'Allowlist + fee-on-transfer delta',
    'p1.l3': 'ReentrancyGuardTransient (Cancun)',
    'p2.num': '// PILLAR_02',
    'p2.title': 'Gas optimization',
    'p2.desc':
      'Transient reentrancy, post-check unchecked, msg.sender caching, custom errors, single pause check — measured with forge gas-report.',
    'p2.l1': 'Deploy −56,657 gas',
    'p2.l2': 'withdrawETH −2,678 avg',
    'p2.l3': 'depositERC20 −4,301 avg',
    'p3.num': '// PILLAR_03',
    'p3.title': 'Attack verification',
    'p3.desc':
      'Full SWC matrix and Foundry campaigns A–E: reentrancy, forced ETH, ledger integrity, unchecked math, and N/A surface.',
    'p3.l1': '0 exploitable SWC findings',
    'p3.l2': '55 Foundry tests (unit/attack/fuzz/inv)',
    'p3.l3': 'Next.js + ethers v6 demo',

    'gas.eyebrow': '// 03 — GAS OPTIMIZATION',
    'gas.title': 'Less storage, cheaper hot paths',
    'gas.lead':
      'Vault phase 2: every optimization documents its <strong>tradeoff</strong>. Baseline vs post-opt via <code>forge test --match-contract CryptoBankVaultTest --gas-report</code>. Later we accepted extra <code>balanceOf</code> delta cost on ERC-20 deposit to mitigate fee-on-transfer.',
    'gas.m1': 'Deploy cost',
    'gas.m2': 'withdrawETH avg',
    'gas.m3': 'depositERC20 avg',
    'gas.m4': 'withdrawERC20 avg',
    'gas.th1': 'Optimization',
    'gas.th2': 'Tradeoff / effect',
    'gas.r1a': 'ReentrancyGuardTransient (EIP-1153)',
    'gas.r1b': 'Cheaper guard; requires Cancun+ EVM',
    'gas.r2a': 'unchecked ledger subtractions',
    'gas.r2b': 'Only after bal >= amount; skips overflow check',
    'gas.r3a': 'msg.sender cache on hot paths',
    'gas.r3b': 'Fewer repeated CALLER opcodes',
    'gas.r4a': 'Pause checked once',
    'gas.r4b': 'Avoids duplicate paused SLOAD in receive/helpers',
    'gas.r5a': 'Custom errors',
    'gas.r5b': 'Compact reverts vs require strings',
    'gas.r6a': 'balanceOf delta on depositERC20',
    'gas.r6b': '+2 external calls; mitigates fee-on-transfer on deposit',

    'swc.eyebrow': '// 04 — SWC VERIFICATION',
    'swc.title': 'SWC Registry · EIP-1470',
    'swc.lead':
      'Full matrix <strong>SWC-100 → SWC-136</strong> against <code>CryptoBankVault</code>. Report in <code>doc/SWC-AUDIT-EN.md</code>. Conclusion: <strong>0 exploitable vulnerabilities</strong>; 1 informational item (SWC-114 external ERC-20 approve).',
    'swc.s1': 'Mitigated / N/A',
    'swc.s2': 'Informational (design)',
    'swc.s3': 'Vulnerable',
    'swc.th1': 'Key SWC',
    'swc.th2': 'Mitigation in the contract',
    'swc.r101': 'Overflow: Solidity 0.8.24; unchecked only after bal >= amount',
    'swc.r103': 'Floating pragma: fixed pragma solidity 0.8.24',
    'swc.r104': 'ETH .call with success check; ERC-20 via SafeERC20',
    'swc.r105': 'Withdrawals only debit msg.sender ledger + pause + nonReentrant',
    'swc.r107': 'CEI + ReentrancyGuardTransient; AttackE / Reentrancy* tests',
    'swc.r132': 'Forced ETH = surplus; rescue surplus only; ledger intact',
    'swc.info': 'INFORMATIONAL',
    'swc.i1t': 'Approve front-running',
    'swc.i1d':
      'External ERC-20 race. FE mitigation: approve(0)→N or token permit; the vault does not manage allowances.',
    'swc.i2t': 'Fee-on-transfer / rebase',
    'swc.i2d':
      'Deposit: balanceOf delta. Withdraw fee: documented. Rebase/lying tokens: allowlist only (owner trust).',

    'pr.eyebrow': '// 05 — PROCESS',
    'pr.title': 'Phases 0–6 closed',
    'pr.lead':
      'TDD gates: bootstrap, design + tests, full vault, deploy/ABI, frontend, VPS, and documentary handoff.',
    'ph.0': 'Foundry bootstrap',
    'ph.12': 'TDD design + vault + gas',
    'ph.3': 'Deploy scripts + ABI',
    'ph.4': 'Next.js + ethers frontend',
    'ph.56': 'VPS + handoff / SWC',
    'st.1': 'Phases',
    'st.2': 'Campaigns',
    'st.3': 'Critical SWC',
    'st.4': 'Forge tests',
    'term.label': 'rolando@strahm:~/02-crypto-bank',
    'term.1': 'forge test --match-test test_Attack',
    'term.2': '[PASS] suite · attack campaigns green',
    'term.3': 'cat doc/SWC-AUDIT-EN.md | head',
    'term.4': 'Vulnerable: 0 · Informational: 1 · Mitigated/N/A: 34',
    'term.5': 'echo status',
    'term.6': 'MODULE_02_CLOSED · SWC_0_CRITICAL · GAS_DOCUMENTED',

    'at.eyebrow': '// 06 — ATTACK CAMPAIGNS',
    'at.title': 'Defensive, not offensive',
    'at.lead':
      'Foundry tests where a successful “attack” means it fails or is documented as a standard limitation. No exploit PoCs.',
    'cA.t': 'Integrity',
    'cA.d': 'Ledger, allowlist, fee-on-transfer, rescue.',
    'cB.t': 'Permit N/A',
    'cB.d': 'No vault signatures; static checklist.',
    'cC.t': 'Tx order',
    'cC.d': 'External ERC-20 approve race (documented).',
    'cD.t': 'Unchecked',
    'cD.d': 'Exact drain without underflow.',
    'cE.t': 'Surface',
    'cE.d': 'Reentrancy, forced ETH, pause, bytecode.',

    're.eyebrow': '// 07 — OPEN SOURCE',
    're.title': 'Repositories',
    're.lead': 'Contract, tests, gas, SWC, frontend, and VPS playbook on GitHub and GitLab.',
    're.cta': 'Contact',
    're.linkedin': 'LinkedIn',

    'ft.left': 'ROLANDO STRAHM — Crypto Bank Vault · Portfolio',
    'ft.right': 'FOUNDRY · SOLC 0.8.24 · ALL_SYSTEMS_OPERATIONAL',
  },
};

function setLanguage(lang) {
  const dict = I18N[lang] || I18N.es;
  document.documentElement.lang = dict['html.lang'];
  document.title = dict['meta.title'];

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && dict['meta.description']) {
    metaDesc.setAttribute('content', dict['meta.description']);
  }

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = dict[key];
    if (val == null) return;
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = val;
    else el.textContent = val;
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  localStorage.setItem('crypto-bank-portfolio-lang', lang);

  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  history.replaceState(null, '', url);
}

function initI18n() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('lang');
  const saved = localStorage.getItem('crypto-bank-portfolio-lang');
  const preferred =
    (fromQuery === 'en' || fromQuery === 'es' ? fromQuery : null) ||
    saved ||
    (navigator.language?.startsWith('en') ? 'en' : 'es');

  setLanguage(preferred);

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
}

document.addEventListener('DOMContentLoaded', initI18n);
