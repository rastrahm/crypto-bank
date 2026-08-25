import type { Eip1193Provider } from "ethers";

/** Provider anunciado vía EIP-6963. */
export interface DiscoveredWallet {
  uuid: string;
  name: string;
  rdns: string;
  icon?: string;
  provider: Eip1193Provider;
}

interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

interface Eip6963AnnounceEvent extends Event {
  detail: Eip6963ProviderDetail;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      providers?: Eip1193Provider[];
    };
    phantom?: { ethereum?: Eip1193Provider };
    solflare?: { ethereum?: Eip1193Provider; isSolflare?: boolean };
  }

  interface WindowEventMap {
    "eip6963:announceProvider": Eip6963AnnounceEvent;
  }
}

const KNOWN_LABELS: Record<string, string> = {
  "io.metamask": "MetaMask",
  "app.phantom": "Phantom",
  "com.solflare": "Solflare",
  "app.wavo": "Wavo",
};

const cache = new Map<string, DiscoveredWallet>();
let listening = false;

/**
 * @description Registra un provider en el cache por rdns.
 * @param {DiscoveredWallet} wallet - Wallet a registrar.
 * @returns {void}
 */
function upsert(wallet: DiscoveredWallet): void {
  if (!cache.has(wallet.rdns)) {
    cache.set(wallet.rdns, wallet);
  }
}

/**
 * @description Activa el listener EIP-6963 una sola vez (acumula announces).
 * @returns {void}
 */
function ensureListener(): void {
  if (typeof window === "undefined" || listening) return;
  listening = true;
  window.addEventListener("eip6963:announceProvider", (event: Eip6963AnnounceEvent) => {
    const { info, provider } = event.detail;
    upsert({
      uuid: info.uuid,
      name: KNOWN_LABELS[info.rdns] ?? info.name,
      rdns: info.rdns,
      icon: info.icon,
      provider,
    });
  });
}

/**
 * @description Añade fallbacks conocidos (MetaMask / Phantom / Solflare / injected).
 * @returns {void}
 */
function addFallbacks(): void {
  if (typeof window === "undefined") return;
  if (window.ethereum?.isMetaMask) {
    upsert({
      uuid: "fallback-metamask",
      name: "MetaMask",
      rdns: "io.metamask",
      provider: window.ethereum,
    });
  }
  if (window.phantom?.ethereum) {
    upsert({
      uuid: "fallback-phantom",
      name: "Phantom",
      rdns: "app.phantom",
      provider: window.phantom.ethereum,
    });
  }
  if (window.solflare?.ethereum) {
    upsert({
      uuid: "fallback-solflare",
      name: "Solflare",
      rdns: "com.solflare",
      provider: window.solflare.ethereum,
    });
  }
  if (window.ethereum && cache.size === 0) {
    upsert({
      uuid: "fallback-injected",
      name: "Wallet inyectada",
      rdns: "browser.injected",
      provider: window.ethereum,
    });
  }
}

/**
 * @description Descubre wallets EVM inyectadas (EIP-6963 + fallbacks).
 * @returns {DiscoveredWallet[]} Lista deduplicada por rdns.
 */
export function discoverInjectedWallets(): DiscoveredWallet[] {
  ensureListener();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  }
  addFallbacks();
  return Array.from(cache.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @description Orden preferido para el entorno de prueba local.
 * @param {DiscoveredWallet[]} wallets - Wallets descubiertas.
 * @returns {DiscoveredWallet[]} Lista reordenada.
 */
export function prioritizeTestWallets(wallets: DiscoveredWallet[]): DiscoveredWallet[] {
  const order = ["io.metamask", "app.phantom", "com.solflare"];
  return [...wallets].sort((a, b) => {
    const ia = order.indexOf(a.rdns);
    const ib = order.indexOf(b.rdns);
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
