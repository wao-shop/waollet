from time import sleep, time

import pytest
from algosdk.logic import get_application_address

from .actions import createApp, stake, unstake, claim
from .testing.resources import (
    fundAccount,
    getTemporaryAccount,
    optInToApplication,
    accountBalance,
)
from .testing.setup import getAlgodClient
from .utils import getAppGlobalState, getAppLocalState


def test_create():
    client = getAlgodClient()
    creator = getTemporaryAccount(client)

    appID = createApp(client, creator)

    actual = getAppGlobalState(client, appID)
    expected = {
        b"globalStakingBalance": 0,
    }

    assert actual == expected


def test_stake():
    client = getAlgodClient()

    creator = getTemporaryAccount(client)
    staker = getTemporaryAccount(client)

    appID = createApp(client, creator)

    optInToApplication(client, appID, staker)

    # First stake
    stakeAmount = 500_000
    stake(client=client, appID=appID, staker=staker, stakeAmount=stakeAmount)

    actualState = getAppGlobalState(client, appID)
    expectedState = {
        b"globalStakingBalance": stakeAmount,
    }
    assert actualState == expectedState

    actualFirstLocalState = getAppLocalState(client, appID, staker.getAddress())
    expectedLocalState = {b"stakingBalance": 500_000, b"yieldBalance": 0}
    assert (
        actualFirstLocalState[b"stakingBalance"]
        == expectedLocalState[b"stakingBalance"]
    )
    assert actualFirstLocalState[b"yieldBalance"] == expectedLocalState[b"yieldBalance"]

    # Second stake to test yield calculation
    stake(client=client, appID=appID, staker=staker, stakeAmount=stakeAmount)

    actualState = getAppGlobalState(client, appID)
    expectedState = {
        b"globalStakingBalance": stakeAmount * 2,
    }
    assert actualState == expectedState

    actualSecondLocalState = getAppLocalState(client, appID, staker.getAddress())
    expectedLocalState = {b"stakingBalance": 1_000_000, b"yieldBalance": 0}
    assert (
        actualSecondLocalState[b"stakingBalance"]
        == expectedLocalState[b"stakingBalance"]
    )
    assert (
        actualSecondLocalState[b"yieldBalance"] > actualFirstLocalState[b"yieldBalance"]
    )


def test_unstake():
    reward = 0
    fee = 0

    client = getAlgodClient()

    creator = getTemporaryAccount(client)
    staker = getTemporaryAccount(client)

    appID = createApp(client, creator)

    appAddr = get_application_address(appID)
    transaction_response = vars(fundAccount(client, appAddr))
    fee += 1_000
    print("fund >>>>>> ", transaction_response)
    if transaction_response["senderRewards"]:
        print(transaction_response["senderRewards"])
        reward += transaction_response["senderRewards"]

    initial_account_balance = accountBalance(client, staker)
    assert initial_account_balance == 100_000_000 + reward

    transaction_response = vars(optInToApplication(client, appID, staker))
    fee += 1_000
    print("optin >>>>>> ", transaction_response)
    if transaction_response["senderRewards"]:
        print(transaction_response["senderRewards"])
        reward += transaction_response["senderRewards"]

    stakeAmount = 500_000
    transaction_responses = stake(
        client=client, appID=appID, staker=staker, stakeAmount=stakeAmount
    )
    fee += 1_000
    for transaction_response in transaction_responses:
        transaction_response = vars(transaction_response)
        print("stake >>>>>> ", transaction_response)
        if transaction_response["senderRewards"]:
            print(transaction_response["senderRewards"])
            reward += transaction_response["senderRewards"]

    sleep(30)
    transaction_response = vars(
        unstake(client=client, appID=appID, staker=staker, unstakeAmount=stakeAmount)
    )
    fee += 1_000
    if transaction_response["senderRewards"]:
        print(transaction_response["senderRewards"])
        reward += transaction_response["senderRewards"]

    afterUnstakeGlobalState = getAppGlobalState(client, appID)
    afterUnstakeLocalState = getAppLocalState(client, appID, staker.getAddress())

    afterUnstakeExpectedGlobalState = {
        b"globalStakingBalance": 0,
    }

    assert afterUnstakeGlobalState == afterUnstakeExpectedGlobalState
    assert afterUnstakeLocalState[b"stakingBalance"] == 0
    assert afterUnstakeLocalState[b"yieldBalance"] > 0

    transaction_response = vars(
        claim(
            client=client,
            appID=appID,
            staker=staker,
        )
    )
    fee += 1_000
    if transaction_response["senderRewards"]:
        print(transaction_response["senderRewards"])
        reward += transaction_response["senderRewards"]
    final_account_balance = accountBalance(client, staker)

    afterClaimLocalState = getAppLocalState(client, appID, staker.getAddress())

    assert afterClaimLocalState[b"yieldBalance"] == 0
    assert (
        final_account_balance
        == ((100_000_000 + afterUnstakeLocalState[b"yieldBalance"]) - fee) + reward
    )
