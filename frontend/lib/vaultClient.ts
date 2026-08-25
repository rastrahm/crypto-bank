import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  Signature,
  formatUnits,
  parseUnits,
  type Eip1193Provider,
  type Signer,
  type TransactionResponse,
} from "ethers";

import vaultAbi from "@/abi/CryptoBankVault.json";
import erc20Abi from "@/abi/MockERC20.json";
import { ensureWalletChain } from "@/lib/chainSwitch";
import type { SupportedAsset, VaultAppConfig } from "@/lib/config";
import {
  subscribeWalletEvents,
  type Eip1193EventProvider,
  type WalletEventHandlers,
} from "@/lib/walletEvents";

export interface VaultBalances {
  /** Saldo de ledger por `asset.id`. */
  ledgers: Record<string, string>;
  paused: boolean;
  owner: string;
}

/** Cliente ethers.js v6 para CryptoBankVault y ERC-20s. */
export class VaultClient {
  private readonly config: VaultAppConfig;
  private provider: BrowserProvider | JsonRpcProvider | null = null;
  private signer: Signer | null = null;
  private account: string | null = null;
  private eip1193: Eip1193EventProvider | null = null;
  private stopWatching: (() => void) | null = null;

  constructor(config: VaultAppConfig) {
    this.config = config;
  }

  get vaultAddress(): string {
    return this.config.vaultAddress;
  }

  get assets(): SupportedAsset[] {
    return this.config.assets;
  }

  get expectedChainId(): number {
    return this.config.chainId;
  }

  get connectedAccount(): string | null {
    return this.account;
  }

  /** Conecta wallet EIP-1193; intenta switch/add de red y valida chainId. */
  async connectWallet(ethereum: Eip1193Provider): Promise<string> {
    this.clearWalletWatch();
    this.eip1193 = ethereum as Eip1193EventProvider;
    await ethereum.request({ method: "eth_requestAccounts", params: [] });
    await ensureWalletChain(ethereum, this.config.chainId, this.config.rpcUrl);
    const browser = new BrowserProvider(ethereum);
    const network = await browser.getNetwork();
    if (Number(network.chainId) !== this.config.chainId) {
      throw new Error(`Red incorrecta: esperaba chainId ${this.config.chainId}, obtuve ${network.chainId}`);
    }
    this.signer = await browser.getSigner();
    this.provider = browser;
    this.account = await this.signer.getAddress();
    return this.account;
  }

  /**
   * Escucha cambios de cuenta/red. Reemplaza un watch previo.
   * @returns Cleanup (también se llama en logout / reconnect).
   */
  watchWallet(handlers: WalletEventHandlers): () => void {
    this.clearWalletWatch();
    if (!this.eip1193) {
      return () => undefined;
    }
    this.stopWatching = subscribeWalletEvents(this.eip1193, handlers);
    return () => this.clearWalletWatch();
  }

  /** Re-enlaza BrowserProvider/signer tras cambio de cuenta o red correcta. */
  async rebindWallet(): Promise<string> {
    if (!this.eip1193) {
      throw new Error("Wallet no conectada");
    }
    const browser = new BrowserProvider(this.eip1193);
    const network = await browser.getNetwork();
    if (Number(network.chainId) !== this.config.chainId) {
      throw new Error(`Red incorrecta: esperaba chainId ${this.config.chainId}, obtuve ${network.chainId}`);
    }
    this.signer = await browser.getSigner();
    this.provider = browser;
    this.account = await this.signer.getAddress();
    return this.account;
  }

  /** Usa solo RPC de lectura (sin wallet). */
  useReadOnlyProvider(): void {
    this.clearWalletWatch();
    this.eip1193 = null;
    this.provider = new JsonRpcProvider(this.config.rpcUrl);
    this.signer = null;
    this.account = null;
  }

  private clearWalletWatch(): void {
    if (this.stopWatching) {
      this.stopWatching();
      this.stopWatching = null;
    }
  }

  /** Lee saldos de ledger por cada activo configurado + paused/owner. */
  async getBalances(user: string): Promise<VaultBalances> {
    const vault = this.readVault();
    const native = (await vault.NATIVE()) as string;
    const [paused, owner, ...rawBalances] = await Promise.all([
      vault.paused(),
      vault.owner(),
      ...this.config.assets.map((asset) => {
        const token = asset.kind === "native" ? native : asset.address;
        return vault.balanceOf(user, token);
      }),
    ]);

    const ledgers: Record<string, string> = {};
    this.config.assets.forEach((asset, index) => {
      ledgers[asset.id] = formatUnits(rawBalances[index] as bigint, asset.decimals);
    });

    return {
      ledgers,
      paused: Boolean(paused),
      owner: String(owner),
    };
  }

  /** Deposita el activo (ETH o ERC-20 con permit si hay, si no approve 0→n). */
  async depositAsset(asset: SupportedAsset, amountHuman: string): Promise<TransactionResponse> {
    const amount = parseUnits(amountHuman, asset.decimals);
    if (asset.kind === "native") {
      const vault = this.writeVault();
      return (await vault.depositETH({ value: amount })) as TransactionResponse;
    }
    if (!asset.address) {
      throw new Error("Token sin address");
    }
    await this.ensureErc20Allowance(asset.address, amount);
    const vault = this.writeVault();
    return (await vault.depositERC20(asset.address, amount)) as TransactionResponse;
  }

  /**
   * Preferí EIP-2612 `permit` si el token lo expone; si no, `approve(0)` → `approve(amount)`.
   */
  private async ensureErc20Allowance(tokenAddress: string, amount: bigint): Promise<void> {
    const token = this.writeErc20(tokenAddress);
    const account = await this.signer!.getAddress();
    const vaultAddr = this.config.vaultAddress;
    const currentAllowance = (await token.allowance(account, vaultAddr)) as bigint;
    if (currentAllowance >= amount) {
      return;
    }

    const usedPermit = await this.tryPermit(token, account, vaultAddr, amount);
    if (usedPermit) {
      return;
    }

    if (currentAllowance > BigInt(0)) {
      await (await token.approve(vaultAddr, BigInt(0))).wait();
    }
    await (await token.approve(vaultAddr, amount)).wait();
  }

  /** @returns true si permit dejó allowance suficiente. */
  private async tryPermit(
    token: Contract,
    owner: string,
    spender: string,
    amount: bigint,
  ): Promise<boolean> {
    try {
      const nonce = (await token.nonces(owner)) as bigint;
      const name = (await token.name()) as string;
      const network = await this.signer!.provider!.getNetwork();
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60);
      const domain = {
        name,
        version: "1",
        chainId: Number(network.chainId),
        verifyingContract: await token.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const message = { owner, spender, value: amount, nonce, deadline };
      const raw = await this.signer!.signTypedData(domain, types, message);
      const { v, r, s } = Signature.from(raw);
      await (await token.permit(owner, spender, amount, deadline, v, r, s)).wait();
      return true;
    } catch {
      return false;
    }
  }

  /** Retira el activo seleccionado. */
  async withdrawAsset(asset: SupportedAsset, amountHuman: string): Promise<TransactionResponse> {
    const amount = parseUnits(amountHuman, asset.decimals);
    const vault = this.writeVault();
    if (asset.kind === "native") {
      return (await vault.withdrawETH(amount)) as TransactionResponse;
    }
    if (!asset.address) {
      throw new Error("Token sin address");
    }
    return (await vault.withdrawERC20(asset.address, amount)) as TransactionResponse;
  }

  async pause(): Promise<TransactionResponse> {
    const vault = this.writeVault();
    return (await vault.pause()) as TransactionResponse;
  }

  async unpause(): Promise<TransactionResponse> {
    const vault = this.writeVault();
    return (await vault.unpause()) as TransactionResponse;
  }

  /** Incluye o excluye un ERC-20 de la allowlist de depósitos. */
  async setTokenAllowed(tokenAddress: string, allowed: boolean): Promise<TransactionResponse> {
    const vault = this.writeVault();
    return (await vault.setTokenAllowed(tokenAddress, allowed)) as TransactionResponse;
  }

  /** Consulta si un ERC-20 puede depositarse. */
  async isTokenAllowed(tokenAddress: string): Promise<boolean> {
    const vault = this.readVault();
    return Boolean(await vault.isTokenAllowed(tokenAddress));
  }

  async rescueETH(to: string, amountHuman: string, decimals = 18): Promise<TransactionResponse> {
    const vault = this.writeVault();
    const amount = parseUnits(amountHuman, decimals);
    return (await vault.rescueETH(to, amount)) as TransactionResponse;
  }

  async rescueERC20(
    tokenAddress: string,
    to: string,
    amountHuman: string,
    decimals = 18,
  ): Promise<TransactionResponse> {
    const vault = this.writeVault();
    const amount = parseUnits(amountHuman, decimals);
    return (await vault.rescueERC20(tokenAddress, to, amount)) as TransactionResponse;
  }

  async getSurplusETH(): Promise<bigint> {
    const vault = this.readVault();
    return (await vault.surplusETH()) as bigint;
  }

  /** Normaliza errores de ethers / usuario para la UI. */
  static formatError(error: unknown): string {
    if (typeof error === "object" && error !== null) {
      const maybe = error as {
        code?: string;
        shortMessage?: string;
        message?: string;
        reason?: string;
        data?: string;
        info?: { error?: { data?: string } };
        error?: { data?: string };
      };
      if (maybe.code === "ACTION_REJECTED") {
        return "Transacción cancelada en la wallet";
      }

      const data =
        (typeof maybe.data === "string" && maybe.data) ||
        maybe.info?.error?.data ||
        maybe.error?.data ||
        "";
      const decoded = VaultClient.decodeCustomError(data);
      if (decoded) {
        return decoded;
      }

      // ethers a veces mete el selector en el mensaje
      const blob = `${maybe.shortMessage ?? ""} ${maybe.message ?? ""} ${maybe.reason ?? ""}`;
      const fromMsg = VaultClient.decodeCustomErrorFromText(blob);
      if (fromMsg) {
        return fromMsg;
      }

      if (maybe.shortMessage) {
        return maybe.shortMessage;
      }
      if (maybe.reason) {
        return maybe.reason;
      }
      if (maybe.message) {
        return maybe.message;
      }
    }
    return "Error desconocido";
  }

  private static readonly ERROR_HINTS: Record<string, string> = {
    "0x14ecd6c7": "Saldo insuficiente en el vault (depositá antes de retirar)",
    InsufficientVaultBalance: "Saldo insuficiente en el vault (depositá antes de retirar)",
    ZeroAmount: "El monto debe ser mayor que 0",
    TransferFailed: "Falló la transferencia de ETH",
    DepositFailed: "El depósito ERC-20 no acreditó tokens",
    InvalidToken: "Token inválido",
    TokenNotAllowed: "Token no permitido para depósitos",
    EnforcedPause: "El vault está pausado",
    RescueExceedsSurplus: "El rescue supera el excedente disponible",
    InvalidRecipient: "Destinatario inválido",
    ReentrancyGuardReentrantCall: "Reentrancy bloqueada",
  };

  private static decodeCustomError(data: string): string | null {
    if (!data || data === "0x") return null;
    const selector = data.slice(0, 10).toLowerCase();
    return VaultClient.ERROR_HINTS[selector] ?? null;
  }

  private static decodeCustomErrorFromText(text: string): string | null {
    for (const [key, hint] of Object.entries(VaultClient.ERROR_HINTS)) {
      if (text.includes(key)) {
        return hint;
      }
    }
    if (/unknown custom error|execution reverted/i.test(text)) {
      return null;
    }
    return null;
  }

  private readVault(): Contract {
    const provider = this.provider ?? new JsonRpcProvider(this.config.rpcUrl);
    return new Contract(this.config.vaultAddress, vaultAbi, provider);
  }

  private writeVault(): Contract {
    if (!this.signer) {
      throw new Error("Wallet no conectada");
    }
    return new Contract(this.config.vaultAddress, vaultAbi, this.signer);
  }

  private writeErc20(tokenAddress: string): Contract {
    if (!this.signer) {
      throw new Error("Wallet no conectada");
    }
    return new Contract(tokenAddress, erc20Abi, this.signer);
  }
}
