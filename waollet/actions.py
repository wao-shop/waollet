from algosdk.future import transaction
from algosdk.logic import get_application_address
from algosdk.v2client.algod import AlgodClient

from .account import Account
from .utils import getAppGlobalState, getContracts, waitForTransaction


def createApp(client: AlgodClient, sender: Account):
    """Create a new application

    Args:
      client: An algod client
      sender: The account that will create the auction application.
    """
    approval, clear = getContracts(client)

    globalSchema = transaction.StateSchema(num_uints=1, num_byte_slices=0)
    localSchema = transaction.StateSchema(num_uints=3, num_byte_slices=0)

    txn = transaction.ApplicationCreateTxn(
        sender=sender.getAddress(),
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval,
        clear_program=clear,
        global_schema=globalSchema,
        local_schema=localSchema,
        sp=client.suggested_params(),
    )

    signedTxn = txn.sign(sender.getPrivateKey())

    client.send_transaction(signedTxn)

    response = waitForTransaction(client, signedTxn.get_txid())
    assert response.applicationIndex is not None and response.applicationIndex > 0
    return response.applicationIndex


def stake(client: AlgodClient, appID: int, staker: Account, stakeAmount: int) -> None:
    """Stake

    Args:
      client: An algod client
      appId: The app appID
      staker: The account staking
      stakeAmount: The amount being staked
    """
    appAddr = get_application_address(appID)
    appGlobalState = getAppGlobalState(client, appID)

    suggestedParams = client.suggested_params()

    payTxn = transaction.PaymentTxn(
        sender=staker.getAddress(),
        receiver=appAddr,
        amt=stakeAmount,
        sp=suggestedParams,
    )

    appCallTxn = transaction.ApplicationCallTxn(
        sender=staker.getAddress(),
        index=appID,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[b"stake"],
        sp=suggestedParams,
    )

    transaction.assign_group_id([payTxn, appCallTxn])

    signedPayTxn = payTxn.sign(staker.getPrivateKey())
    signedAppCallTxn = appCallTxn.sign(staker.getPrivateKey())

    client.send_transactions([signedPayTxn, signedAppCallTxn])

    return [
        waitForTransaction(client, payTxn.get_txid()),
        waitForTransaction(client, appCallTxn.get_txid()),
    ]


def unstake(
    client: AlgodClient, appID: int, staker: Account, unstakeAmount: int
) -> None:
    """Stake

    Args:
      client: An algod client
      appId: The app appID
      staker: The account staking
      stakeAmount: The amount being staked
    """
    suggestedParams = client.suggested_params()

    appCallTxn = transaction.ApplicationCallTxn(
        sender=staker.getAddress(),
        index=appID,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[b"unstake", (unstakeAmount).to_bytes(8, "big")],
        sp=suggestedParams,
    )

    signedAppCallTxn = appCallTxn.sign(staker.getPrivateKey())

    client.send_transaction(signedAppCallTxn)

    return waitForTransaction(client, appCallTxn.get_txid())


def claim(client: AlgodClient, appID: int, staker: Account) -> None:
    """Claim

    Args:
      client: An algod client
      appID: the app ID
      staker: The account staking
      claimAmount: The amount being claimed
    """
    suggestedParams = client.suggested_params()

    appCallTxn = transaction.ApplicationCallTxn(
        sender=staker.getAddress(),
        index=appID,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[b"claim"],
        sp=suggestedParams,
    )

    signedAppCallTxn = appCallTxn.sign(staker.getPrivateKey())

    client.send_transaction(signedAppCallTxn)

    return waitForTransaction(client, appCallTxn.get_txid())
