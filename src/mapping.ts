import { BigInt } from "@graphprotocol/graph-ts"
import {
  CentroMain,
  AddedLiquidity,
  DepositMade,
  RemovedLiquidity,
  SwapMade,
  TransferMade,
  WithdrawMade
} from "../generated/CentroMain/CentroMain"
import { ExampleEntity } from "../generated/schema"

export function handleAddedLiquidity(event: AddedLiquidity): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.wallet = event.params.wallet
  entity.pool = event.params.pool

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract._getPoolAddress(...)
  // - contract._getUbeReserves(...)
  // - contract.addLiquidity(...)
  // - contract.addressToWalletIDs(...)
  // - contract.claimRewardFromPair(...)
  // - contract.claimRewardFromTokens(...)
  // - contract.getAccountIDs(...)
  // - contract.getAccountOverview(...)
  // - contract.getMoolaBalance(...)
  // - contract.getPoolAddress(...)
  // - contract.getWallet(...)
  // - contract.getWalletAddress(...)
  // - contract.getWalletBasis(...)
  // - contract.makeSwap(...)
  // - contract.newWallet(...)
  // - contract.persistWallet(...)
  // - contract.removeLiquidity(...)
  // - contract.walletIDToWallet(...)
}

export function handleDepositMade(event: DepositMade): void {}

export function handleRemovedLiquidity(event: RemovedLiquidity): void {}

export function handleSwapMade(event: SwapMade): void {}

export function handleTransferMade(event: TransferMade): void {}

export function handleWithdrawMade(event: WithdrawMade): void {}
