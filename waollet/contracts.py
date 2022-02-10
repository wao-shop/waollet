from pyteal import *


def approval_program():
    # App Global State
    amount_key = Bytes("globalStakingBalance")

    # App Local State
    staked_key = Bytes('stakingBalance')
    startTime_key = Bytes('startTime')
    yieldBalance_key = Bytes('yieldBalance')

    
    @Subroutine(TealType.uint64)
    def calculateYieldTotal(sender: Expr) -> Int:
        staking_balance = App.localGet(sender, staked_key)
        elapsed_time = (Global.latest_timestamp() - App.localGet(sender, startTime_key)) * Int(10**8)
        rate = elapsed_time / Int(86400)

        return (staking_balance * rate)  / Int(10**8)


    @Subroutine(TealType.none)
    def unstake(receiver: Expr, amount: Expr) -> Expr:
        return Seq(
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.amount: amount,
                    TxnField.receiver: receiver,
                }
            ),
            InnerTxnBuilder.Submit(),
            App.globalPut(amount_key, current_global_amount - amount_to_unstake),
        )

    on_create = Seq(
        App.globalPut(amount_key, Int(0)),
        Approve(),
    )

    on_optin = Seq(
        App.localPut(Txn.sender(), staked_key, Int(0)),
        App.localPut(Txn.sender(), startTime_key, Int(0)),
        App.localPut(Txn.sender(), yieldBalance_key, Int(0)),
        Approve(),
    )

    # Staking Transaction
    on_stake_txn_index = Txn.group_index() - Int(1)
    current_global_amount = App.globalGet(amount_key)
    current_user_amount = App.localGet(Txn.sender(), staked_key)
    on_stake = Seq(
        Assert(
            And(
                Gtxn[on_stake_txn_index].type_enum() == TxnType.Payment,
                Gtxn[on_stake_txn_index].sender() == Txn.sender(),
                Gtxn[on_stake_txn_index].receiver()
                == Global.current_application_address(),  # TODO should we use another address here? like an "liquidity pool"
                Gtxn[on_stake_txn_index].amount() >= Global.min_txn_fee(),
            )
        ),
        App.globalPut(
            amount_key, current_global_amount + Gtxn[on_stake_txn_index].amount()
        ),
        App.localPut(
            Txn.sender(),
            staked_key,
            current_user_amount + Gtxn[on_stake_txn_index].amount(),
        ),
        App.localPut(Txn.sender(), startTime_key, Global.latest_timestamp()),
        Approve(),
    )

    # Unstake Transaction
    current_user_yield = App.localGet(Txn.sender(), yieldBalance_key)
    amount_to_unstake = Btoi(Txn.application_args[1])
    amount_to_yield = calculateYieldTotal(Txn.sender())
    on_unstake = Seq(
        If(current_user_amount >= amount_to_unstake)
        .Then(
            Seq(
                unstake(Txn.sender(), amount_to_unstake),
                App.localPut(Txn.sender(), yieldBalance_key, current_user_yield + amount_to_yield),
                App.localPut(Txn.sender(), staked_key, current_user_amount - amount_to_unstake),
                App.localPut(Txn.sender(), startTime_key, Global.latest_timestamp()), # reset startTime
                Approve(),
            )
        )
        .Else(
            Reject(),
        )
    )

    on_call_method = Txn.application_args[0]
    on_call = Cond(
        [on_call_method == Bytes("stake"), on_stake],
        [on_call_method == Bytes("unstake"), on_unstake],
    )

    on_delete = (
        If(Txn.sender() == Global.creator_address()).Then(Approve()).Else(Reject())
    )

    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.NoOp, on_call],
        [Txn.on_completion() == OnComplete.DeleteApplication, on_delete],
        [Txn.on_completion() == OnComplete.OptIn, on_optin],
        [
            Or(
                Txn.on_completion() == OnComplete.CloseOut,
                Txn.on_completion() == OnComplete.UpdateApplication,
            ),
            Reject(),
        ],
    )

    return program


def clear_state_program():
    return Approve()


if __name__ == "__main__":
    with open("contracts/stake_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=5)
        f.write(compiled)

    with open("contracts/stake_clear_state.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=5)
        f.write(compiled)
