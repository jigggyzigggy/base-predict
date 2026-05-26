export const PREDICTION_ABI = [
  { type: "function", name: "currentRoundId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "roundDuration", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "getRound", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{
      type: "tuple", components: [
        { name: "startTime", type: "uint256" },
        { name: "endTime", type: "uint256" },
        { name: "startPrice", type: "int256" },
        { name: "endPrice", type: "int256" },
        { name: "upPool", type: "uint256" },
        { name: "downPool", type: "uint256" },
        { name: "outcome", type: "uint8" },
        { name: "settled", type: "bool" },
      ]
    }],
  },
  {
    type: "function", name: "getUserBets", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }, { name: "user", type: "address" }],
    outputs: [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
  },
  { type: "function", name: "startRound", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "bet", stateMutability: "payable", inputs: [{ name: "up", type: "bool" }], outputs: [] },
  { type: "function", name: "endRound", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [{ name: "roundId", type: "uint256" }], outputs: [] },
] as const;
