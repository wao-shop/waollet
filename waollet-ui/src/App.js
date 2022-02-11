import { useState, useEffect } from 'react'
import { decodeState } from './utils'

import './App.css'
import TransactionModal from './molecules/TransactionModal'
import AccountModal from './molecules/AccountModal'

const token = process.env.REACT_APP_TOKEN
const server = process.env.REACT_APP_SERVER
const port = process.env.REACT_APP_PORT
const client = new window.algosdk.Algodv2(token, server, port)
const APP_ID = Number(process.env.REACT_APP_APP_ID)

const microalgosToAlgos = window.algosdk.microalgosToAlgos

// const STAKER_ACCOUNT_ADDRESS = 'L5BXMJ4WOH2OYCZAFDH4ZFCOWPTJZEOECXLQRJJSGT6UEJB4KAZ5MID7EY'
// const STAKER_ACCOUNT_MNEMONIC =
//   'predict giraffe inject reject price relief remain spirit process like siren math bullet awful relief cube you glue clarify tackle during tail law abandon captain'
//
//

async function loadAccount() {

  const localAddress = localStorage.getItem("SELECTED_ADDRESS")
  if (localAddress) {
    return {address: localAddress}
  }

  await window.AlgoSigner.connect()
  const accounts = await window.AlgoSigner.accounts({ledger: process.env.REACT_APP_LEDGER_ID})

  const firstAccount = accounts[0]
  return firstAccount
}


async function signTransactionsWithAlgoSigner(txns) {
  const txnsBase64 = txns.map(tx => window.AlgoSigner.encoding.msgpackToBase64(tx.toByte()))

  const signedTxns = await window.AlgoSigner.signTxn(txnsBase64.map(txnb64 => ({txn: txnb64})))
  return signedTxns.map(tx => window.AlgoSigner.encoding.base64ToMsgpack(tx.blob))
}

async function makeSureHasOptIn(address, suggestedParams) {

  const accountInfo = await client.accountInformation(address).do()

  if (accountInfo['apps-local-state'].find(appls => appls.id === APP_ID))
    return

  const txn = await window.algosdk.makeApplicationOptInTxnFromObject({
    from: address,
    appIndex: APP_ID,
    suggestedParams,
  })

  const rawTxns = await signTransactionsWithAlgoSigner([txn])

  const sendTx = await client.sendRawTransaction(rawTxns).do()

  await window.algosdk.waitForConfirmation(client, sendTx.txId, 5)
}

function App() {
  const [stakeModalIsVisible, setStakeModalVisible] = useState(false)
  const [unstakeModalIsVisible, setUnstakeModalVisible] = useState(false)
  const [transactionIsProcessing, setTransactionIsProcessing] = useState(false)
  const [accountModalIsVisible, setAccountModalVisible] = useState(false)

  const [tvl, setTvl] = useState(0)
  const [staked, setStaked] = useState(0)
  const [myYield, setMyYield] = useState(0)
  const [accBalance, setAccBalance] = useState(0)
  const [accAddress, setAccAddress] = useState('')

  const fetchGlobalState = async () => {
    console.log(await client.status().do())

    const globalState = decodeState((await client.getApplicationByID(APP_ID).do()).params['global-state'])
    console.log(globalState)
    setTvl(globalState.globalStakingBalance)

    const account = await loadAccount()

    const accountInfo = await client.accountInformation(account.address).do()
    const accountLocalStateForApp = accountInfo['apps-local-state'].find(state => state.id === APP_ID) 

    if (accountLocalStateForApp) {
      const appsLocalState = decodeState(accountLocalStateForApp['key-value'])
      setStaked(appsLocalState.stakingBalance)
      setMyYield(appsLocalState.yieldBalance)
    } else {
      setStaked(0)
      setMyYield(0)
    }

    setAccBalance(accountInfo.amount)
    setAccAddress(accountInfo.address)
  }

  const selectAddress = async (addr) => {
    localStorage.setItem("SELECTED_ADDRESS", addr)
    await fetchGlobalState()
    setAccountModalVisible(false)
  }

  useEffect(() => {
    fetchGlobalState()
  }, [])

  const handleTransactionError = (err) => {
    if (err.toString().includes("overspend")) {
      const matchStr = err.toString().split(",").at(-1).match(/\{(.*?)\}/)
      const value = matchStr[1]
      console.info(`Overspend. Tried to spend=${value} Algos`)
      window.alert(`Tried to overspend. Balance=${accBalance} , Tried to spend=${value}`)

      setTransactionIsProcessing(false)
      setStakeModalVisible(false)
      setUnstakeModalVisible(false)
      fetchGlobalState()
      throw err
    }

    if (!err.toString().includes("already opted in"))
      throw err
  }

  const stakeWasSubmitted = async amount => {
    setTransactionIsProcessing(true)
    const applicationAddress = await window.algosdk.getApplicationAddress(APP_ID)
    const suggestedParams = await client.getTransactionParams().do()

    const account = await loadAccount()
    const firstAccountAddress = account.address

    const to = applicationAddress

    try {
      await makeSureHasOptIn(firstAccountAddress, suggestedParams)
    } catch (err) {
      handleTransactionError(err)
    }

    const paymentTxn = await window.algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: firstAccountAddress,
      to,
      amount,
      fee: 100,
      suggestedParams,
    })

    const appCallTxn = await window.algosdk.makeApplicationCallTxnFromObject({
      from: firstAccountAddress,
      appIndex: APP_ID,
      onComplete: window.algosdk.AppNoOpTxn,
      appArgs: [Uint8Array.from('stake'.split('').map(c => c.charCodeAt(0)))],
      suggestedParams,
    })

    window.algosdk.assignGroupID([paymentTxn, appCallTxn])

    try {
      const sendTx = await client.sendRawTransaction(await signTransactionsWithAlgoSigner([paymentTxn, appCallTxn])).do()
      await window.algosdk.waitForConfirmation(client, sendTx.txId, 5)
    } catch (err) {
      handleTransactionError(err)
    }

    setTransactionIsProcessing(false)
    setStakeModalVisible(false)
    fetchGlobalState()
  }

  const unstakeWasSubmitted = async amount => {
    setTransactionIsProcessing(true)
    const suggestedParams = await client.getTransactionParams().do()

    const account = await loadAccount()
    const firstAccountAddress = account.address

    try {
      await makeSureHasOptIn(firstAccountAddress, suggestedParams)
    } catch (err) {
      handleTransactionError(err)
    }

    const appCallTxn = await window.algosdk.makeApplicationCallTxnFromObject({
      from: firstAccountAddress,
      appIndex: APP_ID,
      onComplete: window.algosdk.AppNoOpTxn,
      appArgs: [Uint8Array.from('unstake'.split('').map(c => c.charCodeAt(0))), window.algosdk.encodeUint64(amount)],
      suggestedParams,
    })

    try {
      const sendTx = await client.sendRawTransaction(await signTransactionsWithAlgoSigner([appCallTxn])).do()

      await window.algosdk.waitForConfirmation(client, sendTx.txId, 5)
    } catch (err) {
      handleTransactionError(err)
    }

    setTransactionIsProcessing(false)
    setUnstakeModalVisible(false)
    fetchGlobalState()
  }

  return (
    <div className="App">
      <section className="main bordered">
        <h1>waollet</h1>
        <div className="bordered content">
          <div>
            <p>
              <strong>TVL</strong>
              <br />
              <span>ALG$ {microalgosToAlgos(tvl)}</span>
            </p>
            <p>
              <strong>staked</strong>
              <br />
              <span>ALG$ {microalgosToAlgos(staked)}</span>
            </p>
            <p>
              <strong>yield</strong>
              <br />
              <span>ALG$ {microalgosToAlgos(myYield)}</span>
            </p>

            <div>
              <input
                type="button"
                className="btn"
                value="stake"
                disabled={stakeModalIsVisible || unstakeModalIsVisible}
                onClick={() => setStakeModalVisible(!stakeModalIsVisible)}
              />
              <input
                type="button"
                className="btn"
                value="unstake"
                disabled={stakeModalIsVisible || unstakeModalIsVisible}
                onClick={() => setUnstakeModalVisible(!unstakeModalIsVisible)}
              />
            </div>
          </div>
        </div>
        <p style={{ marginTop: '50px' }}>
          <strong>Account Address: </strong>
          <span>{accAddress}</span>
        </p>
        <p>
          <strong>Account Balance: </strong>
          <span>ALG$ {microalgosToAlgos(accBalance)}</span>
        </p>
        <input
          type="button"
          className="btn"
          value="Select Account"
          disabled={accountModalIsVisible}
          onClick={() => setAccountModalVisible(!accountModalIsVisible)}
        />
      </section>
      {accountModalIsVisible && (
        <AccountModal
          title="Accounts"
          onCloseModal={() => setAccountModalVisible(false)}
          onSelectAddress={(addr) => selectAddress(addr)}
          onSubmit={stakeWasSubmitted}
        />
      )}
      {stakeModalIsVisible && (
        <TransactionModal
          title="stake"
          onCloseModal={() => setStakeModalVisible(false)}
          onSubmit={stakeWasSubmitted}
          isLoading={transactionIsProcessing}
        />
      )}
      {unstakeModalIsVisible && (
        <TransactionModal
          title="unstake"
          onCloseModal={() => setUnstakeModalVisible(false)}
          onSubmit={unstakeWasSubmitted}
          isLoading={transactionIsProcessing}
        />
      )}
    </div>
  )
}

export default App
