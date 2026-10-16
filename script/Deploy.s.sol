// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {TrustLayer} from "../src/TrustLayer.sol";

/// @notice Deploys TrustLayer. No constructor arguments, no owner, no configuration.
/// @dev Local:   forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key $ANVIL_KEY
///      Sepolia: forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --account <keystore-name> --broadcast --verify
///      Prefer a Foundry keystore (`cast wallet import`) over a raw private key in .env.
contract Deploy is Script {
    function run() external returns (TrustLayer tl) {
        vm.startBroadcast();
        tl = new TrustLayer();
        vm.stopBroadcast();
        console.log("TrustLayer deployed at", address(tl));
        console.log("chainid", block.chainid);
    }
}
