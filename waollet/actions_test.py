from time import time, sleep

import pytest

from .actions import createApp, stake
from .utils import getAppGlobalState, getAppLocalState
from .testing.setup import getAlgodClient
from .testing.resources import getTemporaryAccount, optInToApplication


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

    stakeAmount = 500_000
    stake(client=client, appID=appID, staker=staker, stakeAmount=stakeAmount)

    actualState = getAppGlobalState(client, appID)
    expectedState = {
        b"globalStakingBalance": stakeAmount,
    }

    assert actualState == expectedState

    actualLocalState = getAppLocalState(client, appID, staker.getAddress())
    expectedLocalState = {
        b'stakingBalance': 500_000,
        b'yieldBalance': 0
    }

    assert actualLocalState[b'stakingBalance'] == expectedLocalState[b'stakingBalance']
    assert actualLocalState[b'yieldBalance'] == expectedLocalState[b'yieldBalance']
