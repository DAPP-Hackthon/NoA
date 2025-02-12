import { AbiCoder } from '@ethersproject/abi';
import { parseEther } from '@ethersproject/units';
import '@nomiclabs/hardhat-ethers';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BytesLike, Contract, Signer, Wallet } from 'ethers';
import { ethers } from "hardhat";

import {
  ERC1967Proxy__factory,
  Currency,
  Currency__factory,
  Events,
  Events__factory,
  PublishModule,
  PublishModule__factory,
  FeeCollectModule,
  FeeCollectModule__factory,
  Helper,
  Helper__factory,
  InteractionLogic__factory,
  PublishLogic__factory,
  ModuleGlobals,
  ModuleGlobals__factory,
  TransparentUpgradeableProxy__factory,
  ERC3525ReceiverMock,
  ERC3525ReceiverMock__factory,
  GovernorContract,
  GovernorContract__factory,
  BankTreasury,
  BankTreasury__factory,
  DerivativeNFTV1,
  DerivativeNFTV1__factory,
  NFTDerivativeProtocolTokenV1,
  NFTDerivativeProtocolTokenV2,
  NFTDerivativeProtocolTokenV1__factory,
  NFTDerivativeProtocolTokenV2__factory,
  Manager,
  Manager__factory,
  Voucher,
  Voucher__factory,
  DerivativeMetadataDescriptor,
  DerivativeMetadataDescriptor__factory,
  Template,
  Template__factory,
  MultirecipientFeeCollectModule,
  MultirecipientFeeCollectModule__factory
} from '../typechain';

import { ManagerLibraryAddresses } from '../typechain/factories/contracts/Manager__factory';

import { FAKE_PRIVATEKEY, ZERO_ADDRESS } from './helpers/constants';
import {
  computeContractAddress,
  ProtocolState,
  Error,
  revertToSnapshot,
  takeSnapshot,
} from './helpers/utils';

// import {
//   CanvasDataStruct, PositionStruct
// } from '../typechain/Template';

import { DataTypes } from '../typechain/contracts/modules/template/Template';

use(solidity);

export const NUM_CONFIRMATIONS_REQUIRED = 3;
export const CURRENCY_MINT_AMOUNT = parseEther('100');
export const BPS_MAX = 10000;
export const TREASURY_FEE_BPS = 50;
export const PublishRoyaltyNDPT = 100;
export const GENESIS_FEE_BPS = 100; //genesis Fee
export const MAX_PROFILE_IMAGE_URI_LENGTH = 6000;
export const NDPT_NAME = 'NFT Derivative Protocol Token';
export const NDPT_SYMBOL = 'NDPT';
export const NDPT_DECIMALS = 18;
export const MOCK_PROFILE_HANDLE = 'plant1ghost.eth';
export const LENS_PERIPHERY_NAME = 'LensPeriphery';
export const FIRST_PROFILE_ID = 1; //金库
export const SECOND_PROFILE_ID = 2;
export const THIRD_PROFILE_ID = 3;
export const FOUR_PROFILE_ID = 4;
export const FIRST_HUB_ID = 1;
export const FIRST_PROJECT_ID = 1;
export const FIRST_PUBLISH_ID = 1;
export const FIRST_DNFT_TOKEN_ID = 1;
export const SECOND_DNFT_TOKEN_ID = 2;
export const MOCK_URI = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR';
export const OTHER_MOCK_URI = 'https://ipfs.io/ipfs/QmSfyMcnh1wnJHrAWCBjZHapTS859oNSsuDFiAPPdAHgHP';
export const MOCK_PROFILE_URI =
  'https://ipfs.io/ipfs/Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu';
export const MOCK_FOLLOW_NFT_URI =
  'https://ipfs.fleek.co/ipfs/ghostplantghostplantghostplantghostplantghostplantghostplan';

export const  RECEIVER_MAGIC_VALUE = '0x009ce20b';
export const TreasuryFee = 50; 

export const INITIAL_SUPPLY = 1000000;  //NDPT初始发行总量
export const VOUCHER_AMOUNT_LIMIT = 100;  //用户用NDP兑换Voucher的最低数量 

export const DEFAULT_COLLECT_PRICE = parseEther('10');
export const DEFAULT_TEMPLATE_NUMBER = 1;
export const NickName = 'BitsoulUser';
export const NickName3 = 'BitsoulUser3';

export let accounts: Signer[];
export let deployer: Signer;
export let user: Signer;
export let userTwo: Signer;
export let userThree: Signer;
export let governance: Signer;
export let deployerAddress: string;
export let userAddress: string;
export let userTwoAddress: string;
export let userThreeAddress: string;
export let governanceAddress: string;
export let testWallet: Wallet;
export let managerImpl: Manager;
export let manager: Manager;
export let currency: Currency;
export let abiCoder: AbiCoder;
export let mockModuleData: BytesLike;
export let managerLibs: ManagerLibraryAddresses;
export let eventsLib: Events;
export let moduleGlobals: ModuleGlobals;
export let helper: Helper;
export let receiverMock: ERC3525ReceiverMock
export let bankTreasuryImpl: BankTreasury
export let bankTreasuryContract: BankTreasury
export let ndptImpl: NFTDerivativeProtocolTokenV1;
export let ndptContract: NFTDerivativeProtocolTokenV1;
export let derivativeNFTV1Impl: DerivativeNFTV1;
export let metadataDescriptor: DerivativeMetadataDescriptor;

export let voucherImpl: Voucher;
export let voucherContract: Voucher

/* Modules */
//Publish
export let publishModule: PublishModule;
// Collect
export let feeCollectModule: FeeCollectModule;
// MultiRoyalties
export let multirecipientFeeCollectModule: MultirecipientFeeCollectModule;

//Template
export let template: Template;

export function makeSuiteCleanRoom(name: string, tests: () => void) {
  describe(name, () => {
    beforeEach(async function () {
      await takeSnapshot();
    });
    tests();
    afterEach(async function () {
      await revertToSnapshot();
    });
  });
}

before(async function () {
  abiCoder = ethers.utils.defaultAbiCoder;
  testWallet = new ethers.Wallet(FAKE_PRIVATEKEY).connect(ethers.provider);
  accounts = await ethers.getSigners();
  deployer = accounts[0];
  user = accounts[1];
  userTwo = accounts[2];
  userThree = accounts[4];
  governance = accounts[3];

  deployerAddress = await deployer.getAddress();
  userAddress = await user.getAddress();
  userTwoAddress = await userTwo.getAddress();
  userThreeAddress = await userThree.getAddress();
  governanceAddress = await governance.getAddress();
  mockModuleData = abiCoder.encode(['uint256'], [1]);

  // Deployment
  helper = await new Helper__factory(deployer).deploy();

  //Template
 let canvas: DataTypes.CanvasDataStruct = {width:800, height:600};
 let watermark: DataTypes.CanvasDataStruct = {width:200, height:300};
 let position: DataTypes.PositionStruct = {x:400, y: 0};

  template = await new Template__factory(deployer).deploy(
    1,
    "WaterMark",
    "descript for this template",
    "image",
    canvas,
    watermark,
    position,
  );

  // Currency
  currency = await new Currency__factory(deployer).deploy();

  metadataDescriptor = await new DerivativeMetadataDescriptor__factory(deployer).deploy();

  receiverMock = await new ERC3525ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, Error.None);

  const interactionLogic = await new InteractionLogic__factory(deployer).deploy();
  const publishLogic = await new PublishLogic__factory(deployer).deploy();
  managerLibs = {
    'contracts/libraries/InteractionLogic.sol:InteractionLogic': interactionLogic.address,
    'contracts/libraries/PublishLogic.sol:PublishLogic': publishLogic.address,
  };

  // Here, we pre-compute the nonces and addresses used to deploy the contracts.
  const nonce = await deployer.getTransactionCount();
  // nonce + 0 is impl
  // nonce + 1 is impl
  // nonce + 2 is manager proxy

  const managerProxyAddress = computeContractAddress(deployerAddress, nonce + 2); //'0x' + keccak256(RLP.encode([deployerAddress, hubProxyNonce])).substr(26);
  console.log("managerProxyAddress: ", managerProxyAddress);

  derivativeNFTV1Impl = await new DerivativeNFTV1__factory(deployer).deploy(
    managerProxyAddress
  );

  managerImpl = await new Manager__factory(managerLibs, deployer).deploy(
    derivativeNFTV1Impl.address,
    receiverMock.address,
  );

  let data = managerImpl.interface.encodeFunctionData('initialize', [
    governanceAddress
  ]);
  
  let proxy = await new TransparentUpgradeableProxy__factory(deployer).deploy(
    managerImpl.address,
    deployerAddress,
    data
  );

  // Connect the manager proxy to the Manager factory, must connect by user, not deployer
  manager = Manager__factory.connect(proxy.address, user);
  
  console.log("manager.address: ", manager.address);

  voucherImpl = await new Voucher__factory(deployer).deploy();
  let initializeVoucherData = voucherImpl.interface.encodeFunctionData("initialize", [
      "https://api.bitsoul.xyz/v1/metadata/",
  ]);
  const voucherProxy = await new ERC1967Proxy__factory(deployer).deploy(
    voucherImpl.address,
    initializeVoucherData
  );
  voucherContract = new Voucher__factory(deployer).attach(voucherProxy.address);

  ndptImpl = await new NFTDerivativeProtocolTokenV1__factory(deployer).deploy();
  let initializeNDPTData = ndptImpl.interface.encodeFunctionData("initialize", [
      NDPT_NAME, 
      NDPT_SYMBOL, 
      NDPT_DECIMALS,
      manager.address,
  ]);
  const ndptProxy = await new ERC1967Proxy__factory(deployer).deploy(
    ndptImpl.address,
    initializeNDPTData
  );
  ndptContract = new NFTDerivativeProtocolTokenV1__factory(deployer).attach(ndptProxy.address);

  const soulBoundTokenIdOfBankTreaury = FIRST_PROFILE_ID;
  bankTreasuryImpl = await new BankTreasury__factory(deployer).deploy( );
  let initializeData = bankTreasuryImpl.interface.encodeFunctionData("initialize", [
    governanceAddress,
    soulBoundTokenIdOfBankTreaury,
    [userAddress, userTwoAddress, userThreeAddress],
    NUM_CONFIRMATIONS_REQUIRED  //All full signed 
  ]);

  const bankTreasuryProxy = await new ERC1967Proxy__factory(deployer).deploy(
    bankTreasuryImpl.address,
    initializeData
  );
  bankTreasuryContract = new BankTreasury__factory(deployer).attach(bankTreasuryProxy.address);

  moduleGlobals = await new ModuleGlobals__factory(deployer).deploy(
    manager.address,
    ndptContract.address,
    governanceAddress,
    bankTreasuryContract.address,
    voucherContract.address,
    TREASURY_FEE_BPS,
    PublishRoyaltyNDPT
  );
  
  // Modules
  feeCollectModule = await new FeeCollectModule__factory(deployer).deploy(
    manager.address, 
    moduleGlobals.address
  );

  publishModule = await new PublishModule__factory(deployer).deploy(
    manager.address, 
    moduleGlobals.address,
    ndptContract.address,
  );

  multirecipientFeeCollectModule = await new MultirecipientFeeCollectModule__factory(deployer).deploy(
    manager.address, 
    moduleGlobals.address
  );

  expect(bankTreasuryContract).to.not.be.undefined;
  expect(ndptContract).to.not.be.undefined;
  expect(receiverMock).to.not.be.undefined;
  expect(derivativeNFTV1Impl).to.not.be.undefined;
  expect(manager).to.not.be.undefined;
  expect(currency).to.not.be.undefined;
  expect(metadataDescriptor).to.not.be.undefined;
  expect(feeCollectModule).to.not.be.undefined;
  expect(publishModule).to.not.be.undefined;
  expect(moduleGlobals).to.not.be.undefined;

  // Add to module whitelist
  await expect(
    moduleGlobals.connect(governance).whitelistPublishModule(publishModule.address, true)
  ).to.not.be.reverted;

  await expect(
    moduleGlobals.connect(governance).whitelistCollectModule(feeCollectModule.address, true)
  ).to.not.be.reverted;    

  await expect(
    moduleGlobals.connect(governance).whitelistTemplate(template.address, true)
  ).to.not.be.reverted;    

  expect((await moduleGlobals.getNDPT()).toUpperCase()).to.eq(ndptContract.address.toUpperCase());

  //manager set moduleGlobals
  await manager.connect(governance).setGlobalModule(moduleGlobals.address);
  console.log('manager setGlobalModule ok ');

  await bankTreasuryContract.connect(governance).setGlobalModule(moduleGlobals.address);
  console.log('bankTreasuryContract setGlobalModule ok ');
  
  await expect(ndptContract.connect(deployer).setBankTreasury(
    bankTreasuryContract.address, 
    INITIAL_SUPPLY
  )).to.not.be.reverted;
  
  await expect(ndptContract.connect(deployer).whitelistContract(publishModule.address, true)).to.not.be.reverted;
  await expect(ndptContract.connect(deployer).whitelistContract(feeCollectModule.address, true)).to.not.be.reverted;
  await expect(ndptContract.connect(deployer).whitelistContract(multirecipientFeeCollectModule.address, true)).to.not.be.reverted;
  await expect(ndptContract.connect(deployer).whitelistContract(bankTreasuryContract.address, true)).to.not.be.reverted;
  await expect(ndptContract.connect(deployer).whitelistContract(voucherContract.address, true)).to.not.be.reverted;

  await expect(voucherContract.connect(deployer).setGlobalModule(moduleGlobals.address)).to.not.be.reverted;
  console.log('voucherContract setGlobalModule ok ');
  
  await expect(voucherContract.connect(deployer).setUserAmountLimit(VOUCHER_AMOUNT_LIMIT)).to.not.be.reverted;

  await expect(manager.connect(governance).setState(ProtocolState.Unpaused)).to.not.be.reverted;
  
  await expect(
    moduleGlobals.connect(governance).whitelistProfileCreator(userAddress, true)
  ).to.not.be.reverted;
  await expect(
    moduleGlobals.connect(governance).whitelistProfileCreator(userTwoAddress, true)
  ).to.not.be.reverted;
  await expect(
    moduleGlobals.connect(governance).whitelistProfileCreator(userThreeAddress, true)
  ).to.not.be.reverted;
  await expect(
    moduleGlobals.connect(governance).whitelistProfileCreator(testWallet.address, true)
  ).to.not.be.reverted;

  await expect(
    moduleGlobals.connect(governance).whitelistHubCreator(SECOND_PROFILE_ID, true)
  ).to.not.be.reverted;


  expect((await manager.version()).toNumber()).to.eq(1);

  expect(await manager.getWalletBySoulBoundTokenId(1)).to.eq(bankTreasuryContract.address);

  expect((await derivativeNFTV1Impl.MANAGER()).toUpperCase()).to.eq(manager.address.toUpperCase());

  expect((await ndptContract.version()).toNumber()).to.eq(1);
  expect((await ndptContract.getManager()).toUpperCase()).to.eq(manager.address.toUpperCase());
  console.log('ndptContract getManager ok ');

  expect((await ndptContract.getBankTreasury()).toUpperCase()).to.eq(bankTreasuryContract.address.toUpperCase());
  
  expect((await bankTreasuryContract.getManager()).toUpperCase()).to.eq(manager.address.toUpperCase());
  console.log('bankTreasuryContract getManager ok ');

  expect((await bankTreasuryContract.getNDPT()).toUpperCase()).to.eq(ndptContract.address.toUpperCase());
  
  expect((await moduleGlobals.getPublishCurrencyTax())).to.eq(PublishRoyaltyNDPT);

  // Event library deployment is only needed for testing and is not reproduced in the live environment
  eventsLib = await new Events__factory(deployer).deploy();
  console.log('eventsLib address: ', eventsLib.address);
});
