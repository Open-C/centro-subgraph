import { BigInt } from "@graphprotocol/graph-ts";
import {
  DepositMade,
  WithdrawalMade,
  WalletCreated,
} from "../../generated/EventEmitter/EventEmitter";
import { CentroData, Asset } from "../../generated/schema";
import { CENTRO_ADDRESS } from "./utils";

export function handleDepositMade(event: DepositMade): void {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  let tokenAddr = event.params.token;
  let tokenAmount = event.params.amount;
  let asset = Asset.load(`${CENTRO_ADDRESS}_${tokenAddr.toHexString()}`);
  if (asset == null) {
    asset = new Asset(`${CENTRO_ADDRESS}_${tokenAddr.toHexString()}`);
    asset.address = tokenAddr;
    centroData.totalAssets.push(asset.id);
  }
  asset.totalVolume = asset.totalVolume.plus(tokenAmount);
  asset.save();
  centroData.save();
}

export function handleWalletCreated(event: WalletCreated): void {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  if (centroData === null) centroData = new CentroData(CENTRO_ADDRESS);
  let isNewUser = event.params.isFirstWallet;
  if (isNewUser) {
    centroData.users = centroData.users.plus(new BigInt(1));
  }
  centroData.wallets = centroData.wallets.plus(new BigInt(1));
  centroData.save();
}

export function handleWithdrawalMade(event: WithdrawalMade): void {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  let tokenAddr = event.params.token;
  let tokenAmount = event.params.amount;
  let asset = Asset.load(`${CENTRO_ADDRESS}_${tokenAddr.toHexString()}`);
  if (asset == null) {
    asset = new Asset(`${CENTRO_ADDRESS}_${tokenAddr.toHexString()}`);
    asset.address = tokenAddr;
    centroData.totalAssets.push(asset.id);
  }
  asset.totalVolume = asset.totalVolume.minus(tokenAmount);
  asset.save();
  centroData.save();
}
