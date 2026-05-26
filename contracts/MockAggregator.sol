// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockAggregator {
    uint8 public decimals;
    int256 private _price;
    uint256 private _updatedAt;

    constructor(uint8 _decimals, int256 _initial) {
        decimals = _decimals;
        _price = _initial;
        _updatedAt = block.timestamp;
    }

    function setPrice(int256 p) external {
        _price = p;
        _updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (1, _price, _updatedAt, _updatedAt, 1);
    }

    function description() external pure returns (string memory) { return "MOCK"; }
    function version() external pure returns (uint256) { return 1; }
}
