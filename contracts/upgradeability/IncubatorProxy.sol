// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import {IManager} from '../interfaces/IManager.sol';
import {Proxy} from '@openzeppelin/contracts/proxy/Proxy.sol';
import {Address} from '@openzeppelin/contracts/utils/Address.sol';

contract IncubatorProxy is Proxy {
    using Address for address;
    address immutable MANAGER;

    constructor(bytes memory data) {
        MANAGER = msg.sender;
        IManager(msg.sender).getIncubatorImpl().functionDelegateCall(data);
    }

    function _implementation() internal view override returns (address) {
        return IManager(MANAGER).getIncubatorImpl();
    }
}
