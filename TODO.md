# TODO

## Smart Contract
- Write operation do withdraw yieldBalance
- Calculate yield during stake if the account has stakingBalance > 0
- Rename "unstake" function that generates the InnerTxn to "withdraw"

## UI
- After execute stake and unstake the states should be updated when
  the transaction is successfully inserted in the blockchain
- Stake and Unstake input should receive the amount in Algos and
  convert it to Microalgos
- Error handling
  - Insuficient balance
- Integrate with a (Algosigner)[https://github.com/PureStake/algosigner/blob/develop/docs/dApp-integration.md]
