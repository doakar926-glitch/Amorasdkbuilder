import { useCallback, useEffect, useMemo, useState } from "react";
import { AmmoraDataApiClient } from "@ammora-protocol/sdk";

const CHAIN_ID = 91_342n; // GIWA Sepolia
const CHAIN_HEX = "0x" + CHAIN_ID.toString(16);
const DATA_API: string =
  import.meta.env.VITE_AMMORA_DATA_API ?? "https://ammora-giwa-sepolia-data.fly.dev";

const data = new AmmoraDataApiClient(DATA_API);

type Raw = Record<string, unknown>;

function pick(o: Raw, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
}

function toRows(res: unknown): Raw[] {
  if (Array.isArray(res)) return res as Raw[];
  const r = res as Raw;
  for (const k of ["launches", "items", "data", "results"]) {
    if (Array.isArray(r?.[k])) return r[k] as Raw[];
  }
  return [];
}

const json = (v: unknown) =>
  JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), 2);

const short = (a?: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "—");

type Eth = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
};
const eth = () => (window as unknown as { ethereum?: Eth }).ethereum;

export default function App() {
  const [rows, setRows] = useState<Raw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Raw>();
  const [detail, setDetail] = useState<unknown>();
  const [account, setAccount] = useState<string>();
  const [chainOk, setChainOk] = useState<boolean>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setRows(toRows(await data.getLaunches({ chainId: CHAIN_ID })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => json(r).toLowerCase().includes(q));
  }, [rows, query]);

  async function open(row: Raw) {
    setSelected(row);
    setDetail(undefined);
    const token = pick(row, ["token", "tokenAddress", "baseToken", "address"]);
    if (!token) return;
    try {
      setDetail(await data.getLaunch(CHAIN_ID, token as `0x${string}`));
    } catch (e) {
      setDetail({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function connect() {
    const p = eth();
    if (!p) return setError("No wallet found. Install MetaMask or Rabby, then reload.");
    try {
      const [acc] = (await p.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(acc);
      try {
        await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
      } catch {
        /* chain not added in the wallet yet */
      }
      const id = (await p.request({ method: "eth_chainId" })) as string;
      setChainOk(id.toLowerCase() === CHAIN_HEX);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <header className="top">
        <span className="brand">Tidepool</span>
        <button className="btn" onClick={connect}>
          {account ? short(account) : "Connect wallet"}
        </button>
      </header>

      {account && chainOk === false && (
        <p className="notice">
          Your wallet is not on GIWA Sepolia (chain {CHAIN_ID.toString()}). Switch networks to
          interact with launches.
        </p>
      )}

      <main>
        <section className="hero">
          <h1>Every token launched on Ammora, as it happens.</h1>
          <p>
            Bonding-curve launches on GIWA Sepolia, read straight from the Ammora Data API.
            Testnet only.
          </p>
          <div className="tools">
            <input
              aria-label="Search launches"
              placeholder="Search by name, symbol or address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn ghost" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </section>

        {error && (
          <p className="error" role="alert">
            Could not load launches: {error}. Check the Data API URL and try Refresh.
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="empty">
            {rows.length === 0
              ? "No launches indexed yet. Check back after the next launch is created."
              : "No launches match that search. Clear the search to see all launches."}
          </p>
        )}

        <ul className="list">
          {filtered.map((r, i) => {
            const name = pick(r, ["name", "tokenName"]) ?? "Unnamed token";
            const symbol = pick(r, ["symbol", "tokenSymbol"]) ?? "";
            const token = pick(r, ["token", "tokenAddress", "baseToken", "address"]);
            const state = pick(r, ["state", "status", "phase"]);
            return (
              <li key={token ?? i}>
                <button className="row" onClick={() => open(r)}>
                  <span className="name">
                    <strong>{name}</strong> {symbol && <em>{symbol}</em>}
                  </span>
                  <span className="addr">{short(token)}</span>
                  {state && <span className="pill">{state}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </main>

      {selected && (
        <aside className="drawer" role="dialog" aria-label="Launch details">
          <div className="drawer-head">
            <h2>{pick(selected, ["name", "tokenName"]) ?? "Launch"}</h2>
            <button className="btn ghost" onClick={() => setSelected(undefined)}>
              Close
            </button>
          </div>
          <pre>{json(detail ?? selected)}</pre>
        </aside>
      )}

      <footer>
        Beta testnet software. Do not use real funds. Built with{" "}
        <code>@ammora-protocol/sdk</code>.
      </footer>
    </>
  );
}
