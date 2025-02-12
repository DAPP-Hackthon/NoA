// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import {DataTypes} from '../libraries/DataTypes.sol';
/**
 * @title IPublishModule
 * @author Bitsoul Protocol
 *
 * @notice This is the standard interface for all Bitsoul-compatible CommunityModules.
 */
interface IPublishModule {
    /**
     * @notice Initializes data for a given publication being published. This can only be called by the manager.
     *
     * @param publishId The publish ID.
     * @param previousPublishId The previous Publish Id
     * @param treasuryOfSoulBoundTokenId The SoulBoundTokenId of treasury
     * @param publication The publication
     *
     * @return tax
     */
    function initializePublishModule(
        uint256 publishId,
        uint256 previousPublishId,
        uint256 treasuryOfSoulBoundTokenId,
        DataTypes.Publication calldata publication
    ) external returns(uint256);
    
    function getPublicationTemplate(
        uint256 publishId
    ) external view returns (uint256, string memory);

    // function getTreasuryOfSoulBoundTokenId() external view returns(uint256);

}


