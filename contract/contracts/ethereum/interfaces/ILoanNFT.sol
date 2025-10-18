// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ILoanNFT
 * @notice Interface for Loan NFT tokens
 */
interface ILoanNFT is IERC721 {
    function mint(address to, uint256 tokenId) external;
    function burn(uint256 tokenId) external;
    function exists(uint256 tokenId) external view returns (bool);
    function getLoanId(uint256 tokenId) external view returns (uint256);
}