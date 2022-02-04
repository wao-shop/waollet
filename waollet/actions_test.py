import pytest

from .actions import createApp
from .utils import getAppGlobalState
from .testing.setup import getAlgodClient
from .testing.resources import getTemporaryAccount


def test_create():
    client = getAlgodClient()
    creator = getTemporaryAccount(client)

    appID = createApp(client, creator)

    actual = getAppGlobalState(client, appID)
    expected = {
        b"amount": 0,
    }

    assert actual == expected
