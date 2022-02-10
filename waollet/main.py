import argparse
import json

from algosdk import account

from waollet import actions, contracts, utils
from waollet.account import Account
from waollet.testing import resources, setup

parser = argparse.ArgumentParser(description="Waollet CLI")

parser.add_argument(
    "--algod-address",
    default="http://localhost:4001",
    help="Algorand blockchain address",
)

parser.add_argument(
    "--algod-token",
    default="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    help="Algorand blockchain token",
)

parser.add_argument(
    "COMMAND",
    nargs=1,
    help="Command to run",
)

parser.add_argument(
    "ARGS",
    nargs="*",
    help="Command arguments",
)


def main():
    args = parser.parse_args()

    client = setup.getAlgodClient(args.algod_address, args.algod_token)

    if "create_app" in args.COMMAND:
        contracts.create()
        if "localhost" in args.algod_address:
            res = actions.createApp(client, resources.getTemporaryAccount(client))
        print(res)

    if "generate_account" in args.COMMAND:
        res = account.generate_account()
        acc = Account(res[0])
        print(
            "Private Key: {}\nAddress: {}\nMnemonic: {}\n".format(
                acc.getPrivateKey(), acc.getAddress(), acc.getMnemonic()
            )
        )

    if "app_state" in args.COMMAND:
        app_id = int(args.ARGS[0])
        global_state = utils.getAppGlobalState(client, app_id)
        if len(args.ARGS) > 1:
            address = args.ARGS[1]
            try:
                local_state = utils.getAppLocalState(client, app_id, address)
                print(local_state)
            except Exception as err:
                print("Failed to load local state: {}".format(err))

        print(global_state)

    if "get_balances" in args.COMMAND:
        address = args.ARGS[0]
        res = utils.getBalances(client, address)
        print(res)

    if "fund_account" in args.COMMAND:
        address = args.ARGS[0]
        amount = int(args.ARGS[1])
        res = resources.fundAccount(client, address, amount)
        print(json.dumps(vars(res), indent=2))

    if "stake" in args.COMMAND:
        app_id = int(args.ARGS[0])
        pk = args.ARGS[1]
        amount = int(args.ARGS[2])

        acc = Account(pk)

        try:
            resources.optInToApplication(client, app_id, acc)
        except Exception as err:
            if "already opted in" not in str(err):
                raise err

        res = actions.stake(client, app_id, acc, amount)
        print(json.dumps(vars(res), indent=2))

    if "unstake" in args.COMMAND:
        app_id = int(args.ARGS[0])
        pk = args.ARGS[1]
        amount = int(args.ARGS[2])

        acc = Account(pk)

        try:
            resources.optInToApplication(client, app_id, acc)
        except Exception as err:
            if "already opted in" not in str(err):
                raise err

        res = actions.unstake(client, app_id, acc, amount)
        print(json.dumps(vars(res), indent=2))
