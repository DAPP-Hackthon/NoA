// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import {Errors} from '../../libraries/Errors.sol';
import {FeeModuleBase} from '../FeeModuleBase.sol';
import {ModuleBase} from "../ModuleBase.sol";
import {ICollectModule} from '../../interfaces/ICollectModule.sol';
import {ModuleBase} from '../ModuleBase.sol';
import {IBankTreasury} from "../../interfaces/IBankTreasury.sol";
import {IManager} from "../../interfaces/IManager.sol";
import {DataTypes} from '../../libraries/DataTypes.sol';
import {IDerivativeNFTV1} from "../../interfaces/IDerivativeNFTV1.sol";


import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import {IERC721} from '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import {INFTDerivativeProtocolTokenV1} from "../../interfaces/INFTDerivativeProtocolTokenV1.sol";

import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import {BaseFeeCollectModuleInitData, BaseProfilePublicationData, IBaseFeeCollectModule} from './IBaseFeeCollectModule.sol';


struct MultirecipientProcessCollectData {
    uint256[] recipients;
}


/**
 * @title BaseFeeCollectModule
 * @author Lens Protocol
 *
 * @notice This is an base Lens CollectModule implementation, allowing customization of time to collect, number of collects
 * and whether only followers can collect, charging a fee for collect and distributing it among Receiver/Referral/Treasury.
 * @dev Here we use "Base" terminology to anything that represents this base functionality (base structs, base functions, base storage).
 * @dev You can build your own collect modules on top of the "Base" by inheriting this contract and overriding functions.
 * @dev This contract is marked "abstract" as it requires you to implement initializePublicationCollectModule and getPublicationData functions when you inherit from it.
 * @dev See BaseFeeCollectModule as an example implementation.
 */
abstract contract BaseFeeCollectModule is
    FeeModuleBase,
    ModuleBase,
    IBaseFeeCollectModule
{
    using SafeERC20 for IERC20;

    mapping(uint256 => BaseProfilePublicationData)
        internal _dataByPublicationByProfile;
  

    constructor(address manager, address moduleGlobals) ModuleBase(manager) FeeModuleBase(moduleGlobals) {}
 
    /**
     * @dev Processes a collect by:
     *  1. Validating that collect action meets all needded criteria
     *  2. Processing the collect action either with or withour referral
     *
     */
    function processCollect(
        uint256 ownershipSoulBoundTokenId,
        uint256 collectorSoulBoundTokenId,
        uint256 publishId,
        uint256 collectValue,     
        bytes calldata data
    ) external virtual onlyManager {

        _validateAndStoreCollect(collectorSoulBoundTokenId, ownershipSoulBoundTokenId, publishId, collectValue, data);

        _processCollect(collectorSoulBoundTokenId, publishId, collectValue, data);
    }

    // This function is not implemented because each Collect module has its own return data type
    // function getPublicationData(uint256 projectId) external view returns (.....) {}

    /**
     * @notice Returns the Base publication data for a given publication, or an empty struct if that publication was not
     * initialized with this module.
     *
     * @param projectId The project ID of the publication to query.
     *
     * @return The BaseProfilePublicationData struct mapped to that publication.
     */
    function getBasePublicationData(uint256 projectId)
        public
        view
        virtual
        returns (BaseProfilePublicationData memory)
    {
        return _dataByPublicationByProfile[projectId];
    }



    /**
     * @dev Stores the initial module parameters
     *
     * This should be called during initializePublicationCollectModule()
     *
     * @param projectId The publication ID.
     * @param baseInitData Module initialization data (see BaseFeeCollectModuleInitData struct)
     */
    function _storeBasePublicationCollectParameters(
        uint256 projectId,
        BaseFeeCollectModuleInitData memory baseInitData
    ) internal virtual {
        //store to BaseProfilePublicationData
        _dataByPublicationByProfile[projectId].ownershipSoulBoundTokenId = baseInitData.ownershipSoulBoundTokenId;
        _dataByPublicationByProfile[projectId].projectId = projectId;
        _dataByPublicationByProfile[projectId].publishId = baseInitData.publishId;
        _dataByPublicationByProfile[projectId].amount = baseInitData.amount;
        _dataByPublicationByProfile[projectId].salePrice = baseInitData.salePrice;
        _dataByPublicationByProfile[projectId].royaltyPoints = baseInitData.royaltyPoints;
        
    }

    /**
     * @dev Validates the collect action by checking that:
     * 1) the collector is a follower (if enabled)
     * 2) the number of collects after the action doesn't surpass the collect limit (if enabled)
     * 3) the current block timestamp doesn't surpass the end timestamp (if enabled)
     *
     * This should be called during processCollect()
     *
     * @param collectorSoulBoundTokenId The collector soulBoundTokenId.
     * @param ownershipSoulBoundTokenId The token ID of the profile associated with the publication being collected.
     * @param publishId The  publication ID associated with the publication being collected.
     * @param data Arbitrary data __passed from the collector!__ to be decoded.
     */
    function _validateAndStoreCollect(
        uint256 collectorSoulBoundTokenId,
        uint256 ownershipSoulBoundTokenId,
        uint256 publishId,
        uint256 collectValue,
        bytes calldata data
    ) internal virtual {

        MultirecipientProcessCollectData memory collectData = abi.decode(
            data,
            (MultirecipientProcessCollectData)
        );

         if (collectorSoulBoundTokenId == 0 || 
            ownershipSoulBoundTokenId == 0 || 
            collectValue == 0 || 
            collectData.recipients.length > 5 || 
            publishId == 0 ) revert Errors.InitParamsInvalid();

    }

    /**
     * @dev Internal processing of a collect:
     *  1. Calculation of fees
     *  2. Validation that fees are what collector expected
     *  3. Transfer of fees to recipientSoulBoundTokenId(-s) and treasury
     *
     * @param collectorSoulBoundTokenId The token ID  that will collect the post.
     * @param projectId The  publication ID associated with the publication being collected.
     * @param collectValue The value being collected.
     * @param data Arbitrary data __passed from the collector!__ to be decoded.
     */
    function _processCollect(
        uint256 collectorSoulBoundTokenId,
        uint256 projectId,
        uint256 collectValue,
        bytes calldata data
    ) internal virtual {
        
         MultirecipientProcessCollectData memory collectData = abi.decode(
            data,
            (MultirecipientProcessCollectData)
        );

        address derivativeNFT = IManager(MANAGER).getDerivativeNFT(projectId);
        uint96 fraction = IDerivativeNFTV1(derivativeNFT).getDefaultRoyalty();
         
        uint256 payFees = collectValue * fraction;

        //社区金库地址及税点
        (address treasury, uint16 treasuryFee) = _treasuryData();
        uint256 treasuryAmount = (payFees * treasuryFee) / BPS_MAX;
        uint256 treasuryOfSoulBoundTokenId = IBankTreasury(treasury).getSoulBoundTokenId();
        if (treasuryAmount > 0) 
            INFTDerivativeProtocolTokenV1(_ndpt()).transferValue(
                collectorSoulBoundTokenId, 
                treasuryOfSoulBoundTokenId, 
                treasuryAmount);
            
         if (payFees - treasuryAmount > 0) 
            // Send amount after treasury cut, to all recipients
            _transferToRecipients(
                collectorSoulBoundTokenId, 
                projectId, 
                payFees - treasuryAmount,
                collectData.recipients
            );
    }

    /**
     * @dev Tranfers the fee to recipientSoulBoundTokenId(-s)
     *
     * Override this to add additional functionality (e.g. multiple recipientSoulBoundTokenIds)
     *
     * @param collectorSoulBoundTokenId The token ID that collects the post (and pays the fee).
     * @param projectId The  publication ID associated with the publication being collected.
     * @param salePrice salePrice
     * @param recipients Array of recipient soulBoundTokenId
     */
    function _transferToRecipients(
        uint256 collectorSoulBoundTokenId,
        uint256 projectId,
        uint256 salePrice,
        uint256[] memory recipients
    ) internal virtual {
        /*
        uint16[] memory royaltyPoints = _dataByPublicationByProfile[projectId].royaltyPoints;
        
        if (salePrice > 0){
            INFTDerivativeProtocolTokenV1(_ndpt()).transferValue(collectorSoulBoundTokenId, recipientSoulBoundTokenId, salePrice);

        }
        */
    }

}

