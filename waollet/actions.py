from algosdk.v2client.algod import AlgodClient
from algosdk.future import transaction

from .account import Account
from .utils import getContracts, waitForTransaction


def createApp(client: AlgodClient, sender: Account):
    """Create a new application

    Args:
      client: An algod client
      sender: The account that will create the auction application.
    """
    approval, clear = getContracts(client)

    globalSchema = transaction.StateSchema(num_uints=1, num_byte_slices=0)
    localSchema = transaction.StateSchema(num_uints=1, num_byte_slices=0)

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


def stake():
    pass


def unstake():
    pass
