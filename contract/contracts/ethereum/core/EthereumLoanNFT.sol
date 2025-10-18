// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "../interfaces/ILoanNFT.sol";

/**
 * @title EthereumLoanNFT
 * @notice ERC-721 NFT representing loan positions
 * @dev Each NFT represents a unique loan position with on-chain metadata
 */
contract EthereumLoanNFT is ERC721, AccessControl, ILoanNFT {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct LoanMetadata {
        uint256 collateralAmount;
        uint256 borrowAmount;
        uint256 liquidationRatio;
        uint256 createdAt;
        address originalBorrower;
    }

    mapping(uint256 => LoanMetadata) public loanMetadata;

    constructor() ERC721("ETH Lending Position", "ELP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new loan NFT
     * @param to Address to mint to
     * @param tokenId Token ID to mint
     */
    function mint(address to, uint256 tokenId) external override onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
    }

    /**
     * @dev Burn a loan NFT (typically after loan closure or liquidation)
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external override onlyRole(MINTER_ROLE) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        _burn(tokenId);
        delete loanMetadata[tokenId];
    }

    /**
     * @dev Set loan metadata for a token
     * @param tokenId Token ID
     * @param collateral Collateral amount in wei
     * @param borrowed Borrowed amount in PYUSD
     * @param liquidationRatio Liquidation ratio in basis points
     * @param borrower Original borrower address
     */
    function setLoanMetadata(
        uint256 tokenId,
        uint256 collateral,
        uint256 borrowed,
        uint256 liquidationRatio,
        address borrower
    ) external onlyRole(MINTER_ROLE) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        loanMetadata[tokenId] = LoanMetadata({
            collateralAmount: collateral,
            borrowAmount: borrowed,
            liquidationRatio: liquidationRatio,
            createdAt: block.timestamp,
            originalBorrower: borrower
        });
    }

    /**
     * @dev Check if a token exists
     * @param tokenId Token ID to check
     * @return bool indicating if token exists
     */
    function exists(uint256 tokenId) external view override returns (bool) {
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @dev Get loan ID (for compatibility)
     * @param tokenId Token ID
     * @return The token ID itself
     */
    function getLoanId(uint256 tokenId) external view override returns (uint256) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenId;
    }

    /**
     * @dev Generate on-chain SVG image for the NFT
     * @param tokenId Token ID
     * @return SVG image as string
     */
    function generateSVG(uint256 tokenId) internal view returns (string memory) {
        LoanMetadata memory metadata = loanMetadata[tokenId];

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 350">',
            '<rect width="350" height="350" fill="url(#gradient)"/>',
            '<defs>',
            '<linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />',
            '<stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />',
            '</linearGradient>',
            '</defs>',
            '<text x="20" y="40" font-family="Arial" font-size="20" fill="white">Loan #', tokenId.toString(), '</text>',
            '<text x="20" y="80" font-family="Arial" font-size="14" fill="white">Collateral: ',
            (metadata.collateralAmount / 1e18).toString(), ' ETH</text>',
            '<text x="20" y="110" font-family="Arial" font-size="14" fill="white">Borrowed: ',
            (metadata.borrowAmount / 1e6).toString(), ' PYUSD</text>',
            '<text x="20" y="140" font-family="Arial" font-size="14" fill="white">Liquidation: ',
            (metadata.liquidationRatio / 100).toString(), '%</text>',
            '</svg>'
        ));
    }

    /**
     * @dev Generate token metadata
     * @param tokenId Token ID
     * @return Base64 encoded JSON metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");

        LoanMetadata memory metadata = loanMetadata[tokenId];

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "ETH Loan Position #', tokenId.toString(), '",',
            '"description": "Represents an active loan position in the ETH Lending Protocol",',
            '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(generateSVG(tokenId))), '",',
            '"attributes": [',
                '{"trait_type": "Collateral ETH", "value": "', (metadata.collateralAmount / 1e18).toString(), '"},',
                '{"trait_type": "Borrowed PYUSD", "value": "', (metadata.borrowAmount / 1e6).toString(), '"},',
                '{"trait_type": "Liquidation Ratio", "value": "', (metadata.liquidationRatio / 100).toString(), '"},',
                '{"trait_type": "Created", "value": "', metadata.createdAt.toString(), '"}',
            ']}'
        ))));

        return string(abi.encodePacked('data:application/json;base64,', json));
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}