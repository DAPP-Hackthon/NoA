// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

library Errors {
 /* ========== error definitions ========== */
  // revertedWithCustomError
  error InsufficientFund();
  error InsufficientBalance();
  error ZeroValue();
  error NotAllowed();
  error Unauthorized();
  error Locked();
  error EventIdNotExists();
  error NotOwnerNorApproved();
  error NotAuthorised();
  error NotSameSlot();
  error NotSameOwnerOfBothTokenId();
  error TokenExisted(uint256 tokenId);
  error NotProfileOwner();
  error NotProfileOwnerOrDispatcher();
  error ZeroAddress();
  error EventNotExists();
  error ProjectExisted();
  error TokenIsClaimed();
  error PublicationIsExisted();
  error MaxExceeded();
  error ApproveToOwner();
  error ComboLengthNotEnough();
  error LengthNotSame();
  error Initialized();
  error InvalidParameter();
  error NotSoulBoundTokenOwner();
  error NotHubOwner();
  error CannotInitImplementation();
  error NotGovernance();
  error NotManager();
  error EmergencyAdminCannotUnpause();
  error NotGovernanceOrEmergencyAdmin();
  error PublicationDoesNotExist();
  error ArrayMismatch();
  error FollowInvalid();
  error ZeroSpender();
  error ZeroIncubator();
  error SignatureExpired();
  error SignatureInvalid();
  error ProfileCreatorNotWhitelisted();
  error CallerNotWhitelistedModule();
  error CollectModuleNotWhitelisted();
  error FollowModuleNotWhitelisted();
  error PublishModuleNotWhitelisted();
  error NotSameHub();
  error InsufficientAllowance();
  error InsufficientDerivativeNFT();
  error CannotUpdateAfterMinted();

  // Module Errors
  error InitParamsInvalid();
  error ModuleDataMismatch();
  error TokenDoesNotExist();

  // MultiState Errors
  error Paused();
  error PublishingPaused();


  //Receiver Errors
  error RevertWithMessage();
  error RevertWithoutMessage();
  // error Panic();
}