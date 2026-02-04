// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title DemoStablecoin
 * @notice A demo ERC-20 stablecoin with a faucet function for testing
 * @dev Deploy to Polygon Amoy and Avalanche Fuji testnets
 */
contract DemoStablecoin is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 100 * 10 ** 18; // 100 tokens
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    mapping(address => uint256) public lastFaucetClaim;

    constructor() ERC20('Demo USDT', 'dUSDT') Ownable(msg.sender) {
        // Mint initial supply to deployer for distribution/testing
        _mint(msg.sender, 1_000_000 * 10 ** 18); // 1 million tokens
    }

    /**
     * @notice Claim free tokens from the faucet (once per 24 hours)
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            'Faucet: Must wait 24 hours between claims'
        );
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @notice Check how long until an address can claim again
     * @param account The address to check
     * @return secondsRemaining Time in seconds until next claim (0 if can claim now)
     */
    function timeUntilNextClaim(
        address account
    ) external view returns (uint256 secondsRemaining) {
        uint256 nextClaimTime = lastFaucetClaim[account] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }

    /**
     * @notice Owner can mint additional tokens if needed for testing
     * @param to Recipient address
     * @param amount Amount to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Returns 18 decimals (standard for most stablecoins)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
