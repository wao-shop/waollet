from pyteal import *


def approval_program():
    amount_key = Bytes("amount")
    staked_key = Bytes("staked")

    on_create = Seq(
        App.globalPut(amount_key, Int(0)),
        Approve(),
    )

    on_optin = Seq(
        App.localPut(Txn.sender(), staked_key, Int(0)),
        Approve(),
    )

    on_stake_txn_index = Txn.group_index() - Int(1)
    current_global_amount = App.globalGet(amount_key)
    current_user_amount = App.localGet(Txn.sender(), staked_key)
    on_stake = Seq(
        Assert(
            And(
                Gtxn[on_stake_txn_index].type_enum() == TxnType.AssetTransfer,
                Gtxn[on_stake_txn_index].sender() == Txn.sender(),
                Gtxn[on_stake_txn_index].receiver()
                == Global.current_application_address(),  # TODO should we use another address here? like an "liquidity pool"
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
        Approve(),
    )

    # TODO implement on_unstake
    on_unstake = Approve()

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
