import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  DepositMade,
  WithdrawalMade,
  WalletCreated,
  UbeSwap,
} from "../../generated/EventEmitter/EventEmitter";
import {
  CentroData,
  Asset,
  Wallet,
  UbeLock,
  Swap,
} from "../../generated/schema";
import { CENTRO_ADDRESS } from "./utils";

function initWallet(event: WalletCreated): Wallet {
  const { wallet: address, user: owner } = event.params;
  let newWallet = new Wallet(address.toHexString());
  newWallet.owner = owner.toHex();

  newWallet.save();
  return newWallet as Wallet;
}

function getUbeLocked(wallet: Wallet): UbeLock {
  const id = `ubeswap-${wallet.id}`;
  let ube = UbeLock.load(id);
  if (ube === null) {
    ube = new UbeLock(id);
    wallet.locked.push(ube.id);
    wallet.save();
  }
  return ube;
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
    asset.totalVolume = new BigInt(0);
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

export function handleSwap(event: UbeSwap): void {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  let wallet = Wallet.load(event.params.wallet.toHexString());
  const { tokenIn, tokenOut, amountIn, amountOut } = event.params;
  const ube = getUbeLocked(wallet);
  const swap: Swap = new Swap(`swap-${wallet.id}-${event.block.number}`);
  const assetInId = `swap-${wallet.id}-${event.block.number}-${tokenIn}`;
  const assetOutId = `swap-${wallet.id}-${event.block.number}-${tokenOut}`;
  modifyAsset(assetInId, tokenIn, [], amountIn.plus);
  modifyAsset(assetOutId, tokenIn, [], amountOut.plus);
  swap.assetIn = assetInId;
  swap.assetOut = assetOutId;
  swap.save();
  ube.swaps.push(swap.id);
  ube.save();
}
