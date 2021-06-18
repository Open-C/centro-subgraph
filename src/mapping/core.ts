import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  DepositMade,
  WithdrawalMade,
  WalletCreated,
  WalletCreated__Params,
} from "../../generated/EventEmitter/EventEmitter";
import { CentroData, Asset, Wallet } from "../../generated/schema";
import { CENTRO_ADDRESS } from "./utils";

function initWallet(event: WalletCreated): Wallet {
  const { wallet: address, user: owner } = event.params;
  let newWallet = new Wallet(address.toHexString());
  newWallet.owner = owner.toHex();

  newWallet.save();
  return newWallet as Wallet;
}

function modifyAsset(
  assetId: string,
  address: Address,
  location: string[],
  callback: (BigInt) => BigInt
) {
  let asset = Asset.load(assetId);
  if (asset == null) {
    asset = new Asset(assetId);
    asset.address = address;
    location.push(asset.id);
  }
  asset.totalVolume = callback(asset.totalVolume);
  asset.save();
}

export function handleWalletCreated(event: WalletCreated): void {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  if (centroData === null) centroData = new CentroData(CENTRO_ADDRESS);
  let isNewUser = event.params.isFirstWallet;
  if (isNewUser) {
    centroData.users = centroData.users.plus(new BigInt(1));
  }
  centroData.wallets = centroData.wallets.plus(new BigInt(1));
  initWallet(event);
  centroData.save();
}

export function handleDepositMade(event: DepositMade): void {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  let wallet = Wallet.load(event.params.wallet.toHexString());
  let tokenAddr = event.params.token;
  let tokenAmount = event.params.amount;

  modifyAsset(
    `${CENTRO_ADDRESS}_${tokenAddr.toHexString()}`,
    tokenAddr,
    centroData.totalAssets,
    tokenAmount.plus
  );
  modifyAsset(
    `${wallet.id}_${tokenAddr.toHexString()}_total`,
    tokenAddr,
    wallet.assets,
    tokenAmount.plus
  );
  modifyAsset(
    `${wallet.id}_${tokenAddr.toHexString()}_basis`,
    tokenAddr,
    wallet.basis,
    tokenAmount.plus
  );

  centroData.save();
  wallet.save();
}

export function handleWithdrawalMade(event: WithdrawalMade): void {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  let wallet = Wallet.load(event.params.wallet.toHexString());
  let tokenAddr = event.params.token;
  let tokenAmount = event.params.amount;

  modifyAsset(
    `${CENTRO_ADDRESS}_${tokenAddr.toHexString()}`,
    tokenAddr,
    centroData.totalAssets,
    tokenAmount.minus
  );
  modifyAsset(
    `${wallet.id}_${tokenAddr.toHexString()}_total`,
    tokenAddr,
    centroData.totalAssets,
    tokenAmount.minus
  );
  modifyAsset(
    `${wallet.id}_${tokenAddr.toHexString()}_basis`,
    tokenAddr,
    wallet.basis,
    tokenAmount.minus
  );

  centroData.save();
  wallet.save();
}
