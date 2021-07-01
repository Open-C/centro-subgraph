import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  DepositMade,
  WithdrawalMade,
  WalletCreated,
  UbeSwap,
  UbeFarmClaimed,
  UbeFarmDeposited,
  UbeFarmWithdrawn,
  UbeLiquidityAdded,
  UbeLiquidityRemoved,
} from "../../generated/EventEmitter/EventEmitter";
import {
  CentroData,
  Asset,
  Wallet,
  UbeLock,
  Swap,
} from "../../generated/schema";
import { CENTRO_ADDRESS, UBE_ADDRESS } from "./utils";

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
    (total: BigInt) => total.minus(tokenAmount)
  );
  modifyAsset(
    `${wallet.id}_${tokenAddr.toHexString()}_total`,
    tokenAddr,
    centroData.totalAssets,
    (total: BigInt) => total.minus(tokenAmount)
  );
  modifyAsset(
    `${wallet.id}_${tokenAddr.toHexString()}_basis`,
    tokenAddr,
    wallet.basis,
    (total: BigInt) => total.minus(tokenAmount)
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
  modifyAsset(
    `${wallet.id}-${tokenIn.toHexString()}`,
    tokenIn,
    wallet.assets,
    (total: BigInt) => total.minus(amountIn)
  );
  modifyAsset(
    `${wallet.id}-${tokenOut.toHexString()}`,
    tokenOut,
    wallet.assets,
    amountOut.plus
  );
  modifyAsset(
    `${CENTRO_ADDRESS}_${tokenIn.toHexString()}`,
    tokenIn,
    centroData.totalAssets,
    (total: BigInt) => total.minus(amountIn)
  );
  modifyAsset(
    `${CENTRO_ADDRESS}_${tokenOut.toHexString()}`,
    tokenOut,
    centroData.totalAssets,
    amountOut.plus
  );

  swap.assetIn = assetInId;
  swap.assetOut = assetOutId;

  swap.save();
  ube.swaps.push(swap.id);
  ube.save();
}

export function handleUbeFarmDeposited(event: UbeFarmDeposited) {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  let wallet = Wallet.load(event.params.wallet.toHexString());
  const { amount, lpToken, farm } = event.params;
  const ube = getUbeLocked(wallet);

  modifyAsset(
    `${wallet.id}-${lpToken.toHexString()}`,
    lpToken,
    wallet.assets,
    (total: BigInt) => total.minus(amount)
  );
  modifyAsset(
    `${wallet.id}-${farm.toHexString()}`,
    farm,
    wallet.assets,
    amount.plus
  );
  modifyAsset(
    `${CENTRO_ADDRESS}_${lpToken.toHexString()}`,
    lpToken,
    centroData.totalAssets,
    (total: BigInt) => total.minus(amount)
  );
  modifyAsset(
    `${CENTRO_ADDRESS}_${farm.toHexString()}`,
    farm,
    centroData.totalAssets,
    amount.plus
  );
  wallet.save();
  centroData.save();
}

function handleUbeFarmWithdrawal(event: UbeFarmWithdrawn) {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  let wallet = Wallet.load(event.params.wallet.toHexString());
  const { amount, lpToken, farm } = event.params;
  const ube = getUbeLocked(wallet);

  modifyAsset(
    `${wallet.id}-${farm.toHexString()}`,
    farm,
    wallet.assets,
    (total: BigInt) => total.minus(amount)
  );
  modifyAsset(
    `${wallet.id}-${lpToken.toHexString()}`,
    lpToken,
    wallet.assets,
    amount.plus
  );
  modifyAsset(
    `${CENTRO_ADDRESS}_${farm.toHexString()}`,
    farm,
    centroData.totalAssets,
    (total: BigInt) => total.minus(amount)
  );
  modifyAsset(
    `${CENTRO_ADDRESS}_${lpToken.toHexString()}`,
    lpToken,
    centroData.totalAssets,
    amount.plus
  );
  wallet.save();
  centroData.save();
}

export function handleUbeFarmClaimed(event: UbeFarmClaimed) {
  let centroData = CentroData.load(CENTRO_ADDRESS);
  let wallet = Wallet.load(event.params.wallet.toHexString());
  const { ubeClaimed: amount, farm: tokenEarned } = event.params;
  modifyAsset(
    `${CENTRO_ADDRESS}_${tokenEarned}`,
    tokenEarned,
    centroData.totalAssets,
    amount.plus
  );
  modifyAsset(
    `${wallet.id}-${tokenEarned.toHexString()}`,
    tokenEarned,
    wallet.assets,
    amount.plus
  );
  wallet.save();
  centroData.save();
  const ube = getUbeLocked(wallet);
}
