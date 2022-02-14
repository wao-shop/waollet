from time import sleep, time

import pytest
from algosdk.logic import get_application_address

from .actions import createApp, stake, unstake
from .testing.resources import fundAccount, getTemporaryAccount, optInToApplication
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
    client = getAlgodClient()

    creator = getTemporaryAccount(client)
    staker = getTemporaryAccount(client)

    appID = createApp(client, creator)

    appAddr = get_application_address(appID)
    fundAccount(client, appAddr)

    optInToApplication(client, appID, staker)

    stakeAmount = 500_000
    stake(client=client, appID=appID, staker=staker, stakeAmount=stakeAmount)

    afterStakeGlobalState = getAppGlobalState(client, appID)
    afterStakeLocalState = getAppLocalState(client, appID, staker.getAddress())

    sleep(30)
    unstake(client=client, appID=appID, staker=staker, unstakeAmount=stakeAmount)

    afterUnstakeGlobalState = getAppGlobalState(client, appID)
    afterUnstakeLocalState = getAppLocalState(client, appID, staker.getAddress())

    afterUnstakeExpectedGlobalState = {
        b"globalStakingBalance": 0,
    }

    assert afterUnstakeGlobalState == afterUnstakeExpectedGlobalState
    assert afterUnstakeLocalState[b"stakingBalance"] == 0
    assert afterUnstakeLocalState[b"yieldBalance"] > 0
