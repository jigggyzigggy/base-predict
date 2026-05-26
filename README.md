# BasePredict — Web3 Prediction Game on Base

A simple binary prediction market dApp deployed on **Base** (mainnet or Sepolia testnet). Users predict whether ETH/USD price will go **UP** or **DOWN** within a fixed round, stake ETH, and winners split the pool.

## Stack

- **Smart contract**: Solidity `0.8.24`, Hardhat, Chainlink ETH/USD price feed (Base)
- **Frontend**: React + Vite + TypeScript, wagmi v2 + viem, RainbowKit
- **Chain**: Base Mainnet (8453) / Base Sepolia (84532)

## Project Structure

```
contracts/PredictionGame.sol     # Main contract
scripts/deploy.ts                # Hardhat deploy script
test/PredictionGame.test.ts      # Tests
hardhat.config.ts
frontend/                        # Vite + React dApp
```

## Quick Start

### 1. Smart contract

```bash
npm install
npx hardhat compile
npx hardhat test

# Deploy to Base Sepolia
cp .env.example .env   # add PRIVATE_KEY + BASESCAN_API_KEY
npx hardhat run scripts/deploy.ts --network baseSepolia
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # add VITE_CONTRACT_ADDRESS + VITE_WC_PROJECT_ID
npm run dev
```

## How the game works

1. Owner (or anyone) calls `startRound()` — locks current ETH/USD price from Chainlink, opens a 5-minute betting window.
2. Players call `bet(true)` for UP or `bet(false)` for DOWN with ETH stake.
3. After the round duration, anyone calls `endRound()` — fetches new price, determines winner side.
4. Winners call `claim(roundId)` to withdraw their proportional share of the losing pool + their original stake. 2% protocol fee.

## Networks

| Network | Chain ID | Chainlink ETH/USD |
|---|---|---|
| Base Mainnet | 8453 | `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70` |
| Base Sepolia | 84532 | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` |

## License

MIT
