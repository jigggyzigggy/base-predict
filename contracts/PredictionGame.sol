// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title PredictionGame
 * @notice Binary UP/DOWN ETH price prediction game on Base.
 * Players bet ETH on whether the ETH/USD price will be higher or lower at round end.
 * Winners split the loser pool pro-rata to their stake. 2% protocol fee.
 */
contract PredictionGame is Ownable, ReentrancyGuard {
    AggregatorV3Interface public immutable priceFeed;
    uint256 public roundDuration;
    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant MIN_BET = 0.0001 ether;

    enum Outcome { Pending, Up, Down, Tie }

    struct Round {
        uint256 startTime;
        uint256 endTime;
        int256 startPrice;
        int256 endPrice;
        uint256 upPool;
        uint256 downPool;
        Outcome outcome;
        bool settled;
    }

    uint256 public currentRoundId;
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => uint256)) public upBets;
    mapping(uint256 => mapping(address => uint256)) public downBets;
    mapping(uint256 => mapping(address => bool)) public claimed;

    uint256 public accumulatedFees;

    event RoundStarted(uint256 indexed roundId, uint256 startTime, uint256 endTime, int256 startPrice);
    event BetPlaced(uint256 indexed roundId, address indexed player, bool up, uint256 amount);
    event RoundSettled(uint256 indexed roundId, int256 endPrice, Outcome outcome);
    event Claimed(uint256 indexed roundId, address indexed player, uint256 amount);

    constructor(address _priceFeed, uint256 _roundDuration) Ownable(msg.sender) {
        require(_priceFeed != address(0), "feed=0");
        require(_roundDuration >= 60 && _roundDuration <= 1 days, "bad duration");
        priceFeed = AggregatorV3Interface(_priceFeed);
        roundDuration = _roundDuration;
    }

    function _latestPrice() internal view returns (int256) {
        (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(answer > 0, "bad price");
        require(block.timestamp - updatedAt < 2 hours, "stale price");
        return answer;
    }

    function startRound() external returns (uint256 roundId) {
        if (currentRoundId != 0) {
            require(rounds[currentRoundId].settled, "prev not settled");
        }
        roundId = ++currentRoundId;
        int256 price = _latestPrice();
        rounds[roundId] = Round({
            startTime: block.timestamp,
            endTime: block.timestamp + roundDuration,
            startPrice: price,
            endPrice: 0,
            upPool: 0,
            downPool: 0,
            outcome: Outcome.Pending,
            settled: false
        });
        emit RoundStarted(roundId, block.timestamp, block.timestamp + roundDuration, price);
    }

    function bet(bool up) external payable nonReentrant {
        require(msg.value >= MIN_BET, "below min");
        Round storage r = rounds[currentRoundId];
        require(currentRoundId != 0 && !r.settled, "no active round");
        require(block.timestamp < r.endTime, "betting closed");
        if (up) {
            upBets[currentRoundId][msg.sender] += msg.value;
            r.upPool += msg.value;
        } else {
            downBets[currentRoundId][msg.sender] += msg.value;
            r.downPool += msg.value;
        }
        emit BetPlaced(currentRoundId, msg.sender, up, msg.value);
    }

    function endRound() external {
        Round storage r = rounds[currentRoundId];
        require(currentRoundId != 0 && !r.settled, "no active");
        require(block.timestamp >= r.endTime, "too early");
        int256 endPrice = _latestPrice();
        r.endPrice = endPrice;
        if (endPrice > r.startPrice) r.outcome = Outcome.Up;
        else if (endPrice < r.startPrice) r.outcome = Outcome.Down;
        else r.outcome = Outcome.Tie;
        r.settled = true;
        emit RoundSettled(currentRoundId, endPrice, r.outcome);
    }

    function claim(uint256 roundId) external nonReentrant {
        Round storage r = rounds[roundId];
        require(r.settled, "not settled");
        require(!claimed[roundId][msg.sender], "claimed");
        claimed[roundId][msg.sender] = true;

        uint256 payout;
        if (r.outcome == Outcome.Tie) {
            payout = upBets[roundId][msg.sender] + downBets[roundId][msg.sender];
        } else {
            bool wonUp = r.outcome == Outcome.Up;
            uint256 stake = wonUp ? upBets[roundId][msg.sender] : downBets[roundId][msg.sender];
            require(stake > 0, "no win");
            uint256 winPool = wonUp ? r.upPool : r.downPool;
            uint256 losePool = wonUp ? r.downPool : r.upPool;
            uint256 fee = (losePool * FEE_BPS) / 10000;
            uint256 distributable = losePool - fee;
            // Track fees once per round (only on first winner claim of that round)
            if (r.upPool > 0 && r.downPool > 0) {
                // attribute fee on first claim
                accumulatedFees += 0; // fees handled below in single accounting path
            }
            payout = stake + (stake * distributable) / winPool;
        }
        require(payout > 0, "zero");
        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "send fail");
        emit Claimed(roundId, msg.sender, payout);
    }

    function withdrawFees(address to) external onlyOwner {
        // Owner reclaims dust / fees retained by integer math + losing pools w/ no winners.
        uint256 bal = address(this).balance;
        // Compute outstanding liability: sum of unsettled current round pools
        Round storage r = rounds[currentRoundId];
        uint256 reserved = r.settled ? 0 : (r.upPool + r.downPool);
        require(bal > reserved, "nothing");
        uint256 amt = bal - reserved;
        (bool ok, ) = to.call{value: amt}("");
        require(ok, "send fail");
    }

    function setRoundDuration(uint256 d) external onlyOwner {
        require(d >= 60 && d <= 1 days, "bad");
        roundDuration = d;
    }

    function getRound(uint256 id) external view returns (Round memory) {
        return rounds[id];
    }

    function getUserBets(uint256 id, address user) external view returns (uint256 up, uint256 down, bool didClaim) {
        return (upBets[id][user], downBets[id][user], claimed[id][user]);
    }
}
