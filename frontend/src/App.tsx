import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther, formatUnits } from "viem";
import { useState, useEffect } from "react";
import { CONTRACT_ADDRESS } from "./lib/wagmi";
import { PREDICTION_ABI } from "./lib/abi";

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);
  const left = Math.max(0, target - now);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return { left, label: `${m}:${s.toString().padStart(2, "0")}` };
}

export default function App() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("0.001");

  const { data: roundId, refetch: refetchId } = useReadContract({
    address: CONTRACT_ADDRESS, abi: PREDICTION_ABI, functionName: "currentRoundId",
  });

  const { data: round, refetch: refetchRound } = useReadContract({
    address: CONTRACT_ADDRESS, abi: PREDICTION_ABI, functionName: "getRound",
    args: roundId ? [roundId] : undefined,
    query: { enabled: !!roundId && roundId > 0n, refetchInterval: 5000 },
  });

  const { data: userBets, refetch: refetchUser } = useReadContract({
    address: CONTRACT_ADDRESS, abi: PREDICTION_ABI, functionName: "getUserBets",
    args: roundId && address ? [roundId, address] : undefined,
    query: { enabled: !!roundId && !!address && roundId > 0n },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (confirmed) { refetchId(); refetchRound(); refetchUser(); }
  }, [confirmed, refetchId, refetchRound, refetchUser]);

  const r = round as any;
  const { label: countdown, left } = useCountdown(r ? Number(r.endTime) : 0);
  const bettingOpen = r && !r.settled && left > 0;
  const canEnd = r && !r.settled && left === 0;
  const totalPool = r ? r.upPool + r.downPool : 0n;
  const upPct = r && totalPool > 0n ? Number((r.upPool * 100n) / totalPool) : 50;

  const placeBet = (up: boolean) => {
    try {
      writeContract({
        address: CONTRACT_ADDRESS, abi: PREDICTION_ABI, functionName: "bet",
        args: [up], value: parseEther(amount),
      });
    } catch (e) { console.error(e); }
  };

  const startNew = () => writeContract({ address: CONTRACT_ADDRESS, abi: PREDICTION_ABI, functionName: "startRound" });
  const endNow = () => writeContract({ address: CONTRACT_ADDRESS, abi: PREDICTION_ABI, functionName: "endRound" });
  const claim = (id: bigint) => writeContract({ address: CONTRACT_ADDRESS, abi: PREDICTION_ABI, functionName: "claim", args: [id] });

  const outcomeLabel = ["Pending", "🟢 UP wins", "🔴 DOWN wins", "⚪ Tie"];

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand"><span className="logo">◎</span> BasePredict</div>
        <ConnectButton />
      </header>

      <main className="main">
        <h1 className="hero">Will ETH go <span className="up">UP</span> or <span className="down">DOWN</span>?</h1>
        <p className="sub">On-chain prediction game on Base. Lock in your prediction, winners split the pool.</p>

        {!roundId || roundId === 0n ? (
          <div className="card center">
            <p>No round started yet.</p>
            {isConnected && <button className="btn primary" onClick={startNew}>Start first round</button>}
          </div>
        ) : (
          <div className="card">
            <div className="row between">
              <div><span className="muted">Round</span> <strong>#{String(roundId)}</strong></div>
              <div className="timer">{r?.settled ? outcomeLabel[Number(r.outcome)] : `⏱ ${countdown}`}</div>
            </div>

            {r && (
              <>
                <div className="prices">
                  <div><div className="muted">Start price</div><div className="price">${formatUnits(r.startPrice, 8)}</div></div>
                  {r.settled && <div><div className="muted">End price</div><div className="price">${formatUnits(r.endPrice, 8)}</div></div>}
                </div>

                <div className="poolbar">
                  <div className="poolup" style={{ width: `${upPct}%` }}>UP {formatEther(r.upPool)} Ξ</div>
                  <div className="pooldown" style={{ width: `${100 - upPct}%` }}>{formatEther(r.downPool)} Ξ DOWN</div>
                </div>

                {bettingOpen && (
                  <div className="betbox">
                    <input className="amt" type="number" min="0.0001" step="0.001" value={amount}
                      onChange={(e) => setAmount(e.target.value)} disabled={!isConnected} />
                    <button className="btn up" disabled={!isConnected || isPending || confirming} onClick={() => placeBet(true)}>Bet UP</button>
                    <button className="btn down" disabled={!isConnected || isPending || confirming} onClick={() => placeBet(false)}>Bet DOWN</button>
                  </div>
                )}

                {canEnd && <button className="btn primary" onClick={endNow}>Settle round</button>}
                {r.settled && <button className="btn primary" onClick={startNew}>Start next round</button>}

                {userBets && (
                  <div className="userbets">
                    <h3>Your stake</h3>
                    <div>UP: {formatEther((userBets as any)[0])} Ξ · DOWN: {formatEther((userBets as any)[1])} Ξ</div>
                    {r.settled && !(userBets as any)[2] && (
                      <button className="btn primary" onClick={() => claim(roundId)}>Claim winnings</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {(isPending || confirming) && <div className="toast">Transaction {confirming ? "confirming" : "pending"}...</div>}

        <footer className="foot">
          <a href={`https://${import.meta.env.VITE_CHAIN === "base" ? "" : "sepolia."}basescan.org/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
            View contract on Basescan ↗
          </a>
        </footer>
      </main>
    </div>
  );
}
