import '@nomiclabs/hardhat-ethers';
import { expect } from 'chai';
import {
  // CollectNFT__factory,
  // FeeFollowModule__factory,
  // FollowNFT__factory,
  DerivativeNFTV1__factory,
  NFTDerivativeProtocolTokenV1__factory,
  Incubator__factory,
  Manager__factory,
  ModuleGlobals__factory,
  // TimedFeeCollectModule__factory,
  TransparentUpgradeableProxy__factory,
} from '../../typechain';
import { ZERO_ADDRESS } from '../helpers/constants';
import { ERRORS } from '../helpers/errors';
import {
  BPS_MAX,
  deployer,
  deployerAddress,
  governanceAddress,
  managerLibs,
  manager,
  managerImpl,
  NDPT_NAME,
  NDPT_SYMBOL,
  makeSuiteCleanRoom,
  moduleGlobals,
  bankTreasuryAddress,
  TREASURY_FEE_BPS,
  user,
  userAddress,
  receiverMockAddress,
  ndptAddress,
  derivativeNFTV1ImplAddress,
  incubatorImplAddress,
  managerAddress,
  ndptContract,
  bankTreasuryContract,
  PublishRoyalty
  
} from '../__setup.spec';

makeSuiteCleanRoom('deployment validation', () => {

  it('Should fail to deploy a Manager implementation with zero address DerivativeNFTV1 impl', async function () {
    await expect(
      new Manager__factory(managerLibs, deployer).deploy(ZERO_ADDRESS, incubatorImplAddress, receiverMockAddress)
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });

  it('Should fail to deploy a Manager implementation with zero address Incubator impl', async function () {
    await expect(
      new Manager__factory(managerLibs, deployer).deploy( derivativeNFTV1ImplAddress, ZERO_ADDRESS, receiverMockAddress)
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });

  it('Should fail to deploy a Manager implementation with zero address receiver impl', async function () {
    await expect(
      new Manager__factory(managerLibs, deployer).deploy( derivativeNFTV1ImplAddress, incubatorImplAddress, ZERO_ADDRESS)
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });


  it('Should fail to deploy a Incubator implementation with zero address Manager impl', async function () {
    await expect(new Incubator__factory(deployer).deploy(ZERO_ADDRESS, ndptAddress)).to.be.revertedWith(
      ERRORS.INIT_PARAMS_INVALID
    );
  });

  it('Should fail to deploy a Incubator implementation with zero address NDPT impl', async function () {
    await expect(new Incubator__factory(deployer).deploy(managerAddress, ZERO_ADDRESS)).to.be.revertedWith(
      ERRORS.INIT_PARAMS_INVALID
    );
  });

  it('Deployer should not be able to initialize implementation due to address(this) check', async function () {
    await expect(
      managerImpl.initialize(
        governanceAddress,
        ndptAddress,
        bankTreasuryAddress
        )
    ).to.be.revertedWith(ERRORS.CANNOT_INIT_IMPL);
  });

  it("User should fail to initialize manager proxy after it's already been initialized via the proxy constructor", async function () {
    // Initialization happens in __setup.spec.ts
    await expect(
      manager.connect(user).initialize(
        userAddress, 
        userAddress, 
        userAddress
        )
      ).to.be.revertedWith(ERRORS.INITIALIZED);
    });
    

  it('Deployer should deploy a Manager implementation, a proxy, initialize it, and fail to initialize it again', async function () {
    const newImpl = await new Manager__factory(managerLibs, deployer).deploy(
      
      derivativeNFTV1ImplAddress,
      incubatorImplAddress,
      receiverMockAddress,
    );

    let data = newImpl.interface.encodeFunctionData('initialize', [
      governanceAddress,
      ndptAddress,
      bankTreasuryAddress
    ]);

    const proxy = await new TransparentUpgradeableProxy__factory(deployer).deploy(
      newImpl.address,
      deployerAddress,
      data
    );

    await expect(
      Manager__factory.connect(proxy.address, user).initialize(
        userAddress, 
        userAddress, 
        userAddress
        )
    ).to.be.revertedWith(ERRORS.INITIALIZED);
  });

  it('User should not be able to call admin-only functions on proxy (should fallback) since deployer is admin', async function () {
    const proxy = TransparentUpgradeableProxy__factory.connect(manager.address, user);
    await expect(proxy.upgradeTo(userAddress)).to.be.revertedWith(ERRORS.NO_SELECTOR);
    await expect(proxy.upgradeToAndCall(userAddress, [])).to.be.revertedWith(ERRORS.NO_SELECTOR);
  });
  
  it('Deployer should be able to call admin-only functions on proxy', async function () {
    const proxy = TransparentUpgradeableProxy__factory.connect(manager.address, deployer);
    const newImpl = await new Manager__factory(managerLibs, deployer).deploy(userAddress, userAddress, userAddress);
    await expect(proxy.upgradeTo(newImpl.address)).to.not.be.reverted;
  });
  
  it('Deployer should transfer admin to user, deployer should fail to call admin-only functions, user should call admin-only functions', async function () {
    const proxy = TransparentUpgradeableProxy__factory.connect(manager.address, deployer);
    
    await expect(proxy.changeAdmin(userAddress)).to.not.be.reverted;
    
    await expect(proxy.upgradeTo(userAddress)).to.be.revertedWith(ERRORS.NO_SELECTOR);
    await expect(proxy.upgradeToAndCall(userAddress, [])).to.be.revertedWith(ERRORS.NO_SELECTOR);
    
    const newImpl = await new Manager__factory(managerLibs, deployer).deploy(userAddress, userAddress, userAddress);
    
    await expect(proxy.connect(user).upgradeTo(newImpl.address)).to.not.be.reverted;
  });
  
  /*
  it('Should fail to deploy a fee collect module with zero address hub', async function () {
    await expect(
      new TimedFeeCollectModule__factory(deployer).deploy(ZERO_ADDRESS, moduleGlobals.address)
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });

  it('Should fail to deploy a fee collect module with zero address module globals', async function () {
    await expect(
      new TimedFeeCollectModule__factory(deployer).deploy(manager.address, ZERO_ADDRESS)
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });

  it('Should fail to deploy a fee follow module with zero address hub', async function () {
    await expect(
      new FeeFollowModule__factory(deployer).deploy(ZERO_ADDRESS, moduleGlobals.address)
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });

  it('Should fail to deploy a fee follow module with zero address module globals', async function () {
    await expect(
      new FeeFollowModule__factory(deployer).deploy(manager.address, ZERO_ADDRESS)
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });
  */

  it('Should fail to deploy module globals with zero address manager', async function () {
    await expect(
      new ModuleGlobals__factory(deployer).deploy(
        ZERO_ADDRESS, 
        ndptAddress,
        governanceAddress,
        bankTreasuryAddress, 
        TREASURY_FEE_BPS,
        PublishRoyalty
      )
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });

  it('Should fail to deploy module globals with zero address NDPT', async function () {
    await expect(
      new ModuleGlobals__factory(deployer).deploy(
        managerAddress, 
        ZERO_ADDRESS,
        governanceAddress,
        bankTreasuryAddress, 
        TREASURY_FEE_BPS,
        PublishRoyalty
      )
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });

  it('Should fail to deploy module globals with zero address governance', async function () {
    await expect(
      new ModuleGlobals__factory(deployer).deploy(
        managerAddress,
        ndptAddress,
        ZERO_ADDRESS, 
        bankTreasuryAddress, 
        TREASURY_FEE_BPS,
        PublishRoyalty
      )
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });

  it('Should fail to deploy module globals with zero address treasury', async function () {
    await expect(
      new ModuleGlobals__factory(deployer).deploy(
        managerAddress,
        ndptAddress,
        governanceAddress, 
        ZERO_ADDRESS, 
        TREASURY_FEE_BPS,
        PublishRoyalty
        )
      ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });
    
  it('Should fail to deploy module globals with treausury fee > BPS_MAX / 2', async function () {
      await expect(
        new ModuleGlobals__factory(deployer).deploy(
          managerAddress,
          ndptAddress,
          governanceAddress, 
          bankTreasuryAddress, 
          5001,
          PublishRoyalty
          )
        ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });
      

  it('Should fail to deploy a fee module with treasury fee equal to or higher than maximum BPS', async function () {
    await expect(
      new ModuleGlobals__factory(deployer).deploy(
        managerAddress,
        ndptAddress,
        governanceAddress, 
        bankTreasuryAddress, 
        BPS_MAX,
        PublishRoyalty
        )
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);

    await expect(
      new ModuleGlobals__factory(deployer).deploy(
        managerAddress,
        ndptAddress,
        governanceAddress, 
        bankTreasuryAddress, 
        BPS_MAX + 1,
        PublishRoyalty
        )
    ).to.be.revertedWith(ERRORS.INIT_PARAMS_INVALID);
  });

  
  it('Validates NDPT name & symbol &Owner', async function () {
    const name = await ndptContract.name();
    const symbol = await ndptContract.symbol();
    const decimals = await ndptContract.valueDecimals();

    expect(name).to.eq(NDPT_NAME);
    expect(symbol).to.eq(NDPT_SYMBOL);
    expect(decimals).to.eq(18);
  });
  
  it('BankTreasury transaction count is zero', async function () {
    const count = await bankTreasuryContract.getTransactionCount();
    expect(count).to.eq(0);
  });

  it('Manager version is 1', async function () {
    expect(await manager.version()).to.eq(1);
  });

  


});
