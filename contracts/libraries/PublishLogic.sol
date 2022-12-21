// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import {IERC3525} from "@solvprotocol/erc-3525/contracts/IERC3525.sol";
import {DataTypes} from './DataTypes.sol';
import {Errors} from './Errors.sol';
import {Events} from './Events.sol';
import {Constants} from './Constants.sol';
import {IIncubator} from '../interfaces/IIncubator.sol';
import {IDerivativeNFTV1} from "../interfaces/IDerivativeNFTV1.sol";
import {ICollectModule} from '../interfaces/ICollectModule.sol';
import {IPublishModule} from '../interfaces/IPublishModule.sol';
import {IFollowModule} from '../interfaces/IFollowModule.sol';

/**
 * @title PublishLogic
 * @author bitsoul.xyz
 *
 * @notice This is the library that contains the logic for public & send to market place. 
 
 * @dev The functions are external, so they are called from the hub via `delegateCall` under the hood.
 */
library PublishLogic {
    function prePublish(
        DataTypes.Publication memory publication,
        uint256 publishId,
        uint256 previousPublishId,
        mapping(address => bool) storage _publishModuleWhitelisted,
        mapping(uint256 => DataTypes.PublishData) storage _publishIdByProjectData
    ) external {
        
        _initPublishModule(
            publishId,
            previousPublishId,
            publication,
            _publishIdByProjectData,
            _publishModuleWhitelisted
        );

        emit Events.PublishPrepared(
            publication,
            publishId,
            block.timestamp
        );
    }

    function createPublish(
        DataTypes.Publication memory publication,
        uint256 publishId,
        address derivativeNFT,
        mapping(uint256 => mapping(uint256 => DataTypes.PublicationStruct))
            storage _pubByIdByProfile,
        mapping(address => bool) storage _collectModuleWhitelisted
    ) external returns(uint256) {
        uint256 newTokenId =  IDerivativeNFTV1(derivativeNFT).publish(
            publication
        );

        //save
        _pubByIdByProfile[publication.projectId][newTokenId].publishId = publishId;
        _pubByIdByProfile[publication.projectId][newTokenId].hubId = publication.hubId;
        _pubByIdByProfile[publication.projectId][newTokenId].projectId = publication.projectId;
        _pubByIdByProfile[publication.projectId][newTokenId].name = publication.name;
        _pubByIdByProfile[publication.projectId][newTokenId].description = publication.description;
        _pubByIdByProfile[publication.projectId][newTokenId].materialURIs = publication.materialURIs;
        _pubByIdByProfile[publication.projectId][newTokenId].fromTokenIds = publication.fromTokenIds;
        _pubByIdByProfile[publication.projectId][newTokenId].derivativeNFT = derivativeNFT;
        _pubByIdByProfile[publication.projectId][newTokenId].publishModule = publication.publishModule;

        emit Events.PublishDerivativeNFT(
            publication.soulBoundTokenId,
            publication.projectId,
            newTokenId,
            publication.amount,
            block.timestamp
        ); 

        bytes memory collectModuleReturnData = _initCollectModule(
                publishId,
                publication.soulBoundTokenId,
                publication.projectId,
                newTokenId,
                publication.amount,
                publication.collectModule,
                publication.collectModuleInitData,
                _pubByIdByProfile,
                _collectModuleWhitelisted
        );

        _emitPublishCreated(
            publishId,
            collectModuleReturnData
        );
        
        return newTokenId;
    }

    function _emitPublishCreated(
        uint256 publishId,
        bytes memory collectModuleReturnData
    ) internal {
        emit Events.PublishCreated(
            publishId,
            collectModuleReturnData,
            block.timestamp
        );
    }

    function _initCollectModule(
        uint256 publishId,
        uint256 ownerSoulBoundTokenId,
        uint256 projectId,
        uint256 newTokenId,
        uint256 amount,
        address collectModule,
        bytes memory collectModuleInitData,
        mapping(uint256 => mapping(uint256 => DataTypes.PublicationStruct))
            storage _pubByIdByProfile,
        mapping(address => bool) storage _collectModuleWhitelisted
    ) private returns (bytes memory) {
        if (!_collectModuleWhitelisted[collectModule]) revert Errors.CollectModuleNotWhitelisted();
        _pubByIdByProfile[projectId][newTokenId].collectModule = collectModule;
        return
            ICollectModule(collectModule).initializePublicationCollectModule(
                publishId,
                ownerSoulBoundTokenId,
                newTokenId,
                amount,
                collectModuleInitData
            );
    }
    

    //publish之前的初始化，扣费
    function _initPublishModule(
        uint256 publishId,
        uint256 previousPublishId,
        DataTypes.Publication memory publication,
        mapping(uint256 => DataTypes.PublishData) storage _publishIdByProjectData,
        mapping(address => bool) storage _publishModuleWhitelisted
    ) private  {
        if (publication.publishModule == address(0)) return;
        if (!_publishModuleWhitelisted[publication.publishModule])
            revert Errors.PublishModuleNotWhitelisted();
        if (_publishIdByProjectData[publishId].previousPublishId == 0) _publishIdByProjectData[publishId].previousPublishId = publishId;
        _publishIdByProjectData[publishId].publication = publication;
        _publishIdByProjectData[publishId].previousPublishId = previousPublishId;
        _publishIdByProjectData[publishId].isMinted = false;
        _publishIdByProjectData[publishId].tokenId = 0;
        
        IPublishModule(publication.publishModule).initializePublishModule(
            publishId,
            publication
        );
        
    }

    /**
     * @notice Follows the given SoulBoundTokens, executing the necessary logic and module calls before add.
     * @param projectId The projectId to follow.
     * @param follower The address executing the follow.
     * @param soulBoundTokenId The profile token ID to follow.
     * @param followModuleData The follow module data parameters to pass to each profile's follow module.
     * @param _profileById A pointer to the storage mapping of profile structs by profile ID.
     * @param _profileIdByHandleHash A pointer to the storage mapping of profile IDs by handle hash.
     *
     */
    function follow(
        uint256 projectId,
        address follower,
        uint256 soulBoundTokenId,
        bytes calldata followModuleData,
        mapping(uint256 => DataTypes.ProfileStruct) storage _profileById,
        mapping(bytes32 => uint256) storage _profileIdByHandleHash
    ) external {

        string memory handle = _profileById[soulBoundTokenId].handle;
        if (_profileIdByHandleHash[keccak256(bytes(handle))] != soulBoundTokenId)
            revert Errors.TokenDoesNotExist();

        address followModule = _profileById[soulBoundTokenId].followModule;
        //调用followModule的processFollow函数进行后续处理
        if (followModule != address(0)) {
            IFollowModule(followModule).processFollow(
                follower,
                soulBoundTokenId,
                followModuleData
            );
        }
        emit Events.Followed(projectId, follower, soulBoundTokenId, followModuleData, block.timestamp);
    }
   

    /**
     * @notice Collects the given dNFT, executing the necessary logic and module call before minting the
     * collect NFT to the toSoulBoundTokenId.
     * 
     * @param collectData The collect Data struct
     * @param tokenId The collect tokenId
     * @param derivativeNFT The dNFT contract
     * @param _pubByIdByProfile The collect Data struct
     * @return The new tokenId
     */
    function collectDerivativeNFT(
        DataTypes.CollectData calldata collectData,
        uint256 tokenId,
        address derivativeNFT,
        mapping(uint256 => mapping(uint256 => DataTypes.PublicationStruct))
            storage _pubByIdByProfile,
        mapping(uint256 => DataTypes.PublishData) storage _publishIdByProjectData
    ) external returns(uint256) {
        uint256 projectId = _publishIdByProjectData[collectData.publishId].publication.projectId;
        address collectModule = _pubByIdByProfile[projectId][tokenId].collectModule;
        uint256 newTokenId = IDerivativeNFTV1(derivativeNFT).split(tokenId, collectData.collectorSoulBoundTokenId, collectData.collectValue);

        //新生成的tokenId也需要用collectModule来处理
        _pubByIdByProfile[projectId][newTokenId].collectModule = collectModule;

        uint256 ownerSoulBoundTokenId = _publishIdByProjectData[collectData.publishId].publication.soulBoundTokenId;

        //后续调用processCollect进行处理，此机制能扩展出联动合约调用
        ICollectModule(collectModule).processCollect(
            ownerSoulBoundTokenId,
            collectData.collectorSoulBoundTokenId,
            collectData.publishId,
            collectData.collectValue
            // collectData.collectModuleData
        );

        emit Events.CollectDerivativeNFT(
            projectId,
            derivativeNFT,
            ownerSoulBoundTokenId,
            collectData.collectorSoulBoundTokenId,
            tokenId,
            collectData.collectValue,
            newTokenId,
            block.timestamp
        );

        return newTokenId;
    }
    
   function airdropDerivativeNFT(
        uint256 projectId,
        address derivativeNFT,
        address operator,
        uint256 fromSoulBoundTokenId,
        uint256[] memory toSoulBoundTokenIds,
        uint256 tokenId,
        uint256[] memory values
    ) external {
        if (toSoulBoundTokenIds.length != values.length) revert Errors.LengthNotSame();
        for (uint256 i = 0; i < toSoulBoundTokenIds.length; ) {
            uint256 newTokenId = IDerivativeNFTV1(derivativeNFT).split(tokenId, toSoulBoundTokenIds[i], values[i]);

            emit Events.AirdropDerivativeNFT(
                projectId,
                derivativeNFT,
                fromSoulBoundTokenId,
                operator,
                toSoulBoundTokenIds[i],
                tokenId,
                values[i],
                newTokenId,
                block.timestamp
            );

            unchecked {
                ++i;
            }
        }
    }
}    