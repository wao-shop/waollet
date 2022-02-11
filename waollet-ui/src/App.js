import { useState, useEffect } from 'react'
import { decodeState } from './utils'

import './App.css'
import TransactionModal from './molecules/TransactionModal'

const token = process.env.REACT_APP_TOKEN
const server = process.env.REACT_APP_SERVER
const port = process.env.REACT_APP_PORT
const client = new window.algosdk.Algodv2(token, server, port)
const APP_ID = Number(process.env.REACT_APP_APP_ID)

const microalgosToAlgos = window.algosdk.microalgosToAlgos

// const STAKER_ACCOUNT_ADDRESS = 'L5BXMJ4WOH2OYCZAFDH4ZFCOWPTJZEOECXLQRJJSGT6UEJB4KAZ5MID7EY'
// const STAKER_ACCOUNT_MNEMONIC =
//   'predict giraffe inject reject price relief remain spirit process like siren math bullet awful relief cube you glue clarify tackle during tail law abandon captain'

async function loadAccountFromAlgoSigner() {
  await window.AlgoSigner.connect()
  const accounts = await window.AlgoSigner.accounts({ledger: "sandbox-net"})

  const firstAccount = accounts[0]
  return firstAccount
}

function App() {
  const [stakeModalIsVisible, setStakeModalVisible] = useState(false)
  const [unstakeModalIsVisible, setUnstakeModalVisible] = useState(false)
  const [transactionIsProcessing, setTransactionIsProcessing] = useState(false)

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

    const account = await loadAccountFromAlgoSigner()

    const accountInfo = await client.accountInformation(account.address).do()
    const appsLocalState = decodeState(accountInfo['apps-local-state'].find(state => state.id === APP_ID)['key-value'])

    setStaked(appsLocalState.stakingBalance)
    setMyYield(appsLocalState.yieldBalance)
    setAccBalance(accountInfo.amount)
    setAccAddress(accountInfo.address)
  }

  useEffect(() => {
    fetchGlobalState()
  }, [])

  const stakeWasSubmitted = async amount => {
    setTransactionIsProcessing(true)
    const applicationAddress = await window.algosdk.getApplicationAddress(APP_ID)
    const suggestedParams = await client.getTransactionParams().do()

    const account = await loadAccountFromAlgoSigner()
    const firstAccountAddress = account.address

    const to = applicationAddress

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

    console.log({paymentTxn, appCallTxn})

    const paymenTxnBase64 = window.AlgoSigner.encoding.msgpackToBase64(paymentTxn.toByte())
    const appCallTxnBase64 = window.AlgoSigner.encoding.msgpackToBase64(appCallTxn.toByte())

    let signedTxs = null
    try {
      signedTxs = await window.AlgoSigner.signTxn([{txn: paymenTxnBase64}, {txn: appCallTxnBase64}])
    } catch (err) {
      console.info("ERROR")
      throw err
    }
    console.info(signedTxs)

    const sendTx = await client.sendRawTransaction(
        signedTxs.map(tx => window.AlgoSigner.encoding.base64ToMsgpack(tx.blob))
        ).do()

    await window.algosdk.waitForConfirmation(client, sendTx.txId, 5)

    setTransactionIsProcessing(false)
    setStakeModalVisible(false)
    fetchGlobalState()
  }

  const unstakeWasSubmitted = async amount => {
    setTransactionIsProcessing(true)
    const suggestedParams = await client.getTransactionParams().do()

    const account = await loadAccountFromAlgoSigner()
    const firstAccountAddress = account.address

    const appCallTxn = await window.algosdk.makeApplicationCallTxnFromObject({
      from: firstAccountAddress,
      appIndex: APP_ID,
      onComplete: window.algosdk.AppNoOpTxn,
      appArgs: [Uint8Array.from('unstake'.split('').map(c => c.charCodeAt(0))), window.algosdk.encodeUint64(amount)],
      suggestedParams,
    })
    const appCallTxnBase64 = window.AlgoSigner.encoding.msgpackToBase64(appCallTxn.toByte())

    const signedTxs = await window.AlgoSigner.signTxn([{txn: appCallTxnBase64}])
    const sendTx = await client.sendRawTransaction(
        signedTxs.map(tx => window.AlgoSigner.encoding.base64ToMsgpack(tx.blob))
        ).do()

    await window.algosdk.waitForConfirmation(client, sendTx.txId, 5)

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
      </section>
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
