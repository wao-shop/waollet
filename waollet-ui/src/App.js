import { useState, useEffect } from 'react'

import './App.css'

const token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const server = 'http://127.0.0.1'
const port = 4001
const client = new window.algosdk.Algodv2(token, server, port)
const APP_ID = 46

// const STAKER_ACCOUNT_PK = 'TY0Y6E47VdWyFtJcbeCSkRiPQqh2Nfn/2FPQHSJ1vw9fQ3YnlnH07AsgKM/MlE6z5pyRxBXXCKUyNP1CJDxQMw=='
const STAKER_ACCOUNT_ADDRESS = 'L5BXMJ4WOH2OYCZAFDH4ZFCOWPTJZEOECXLQRJJSGT6UEJB4KAZ5MID7EY'
const STAKER_ACCOUNT_MNEMONIC =
  'predict giraffe inject reject price relief remain spirit process like siren math bullet awful relief cube you glue clarify tackle during tail law abandon captain'

const decodeState = states => {
  const finalStates = {}

  for (const state of states) {
    const {
      key: b64key,
      value: { bytes, type, uint },
    } = state
    const key = atob(b64key)
    finalStates[key] = type === 2 ? Number(uint) : atob(bytes)
  }

  return finalStates
}

function Modal(props) {
  const [amount, setAmount] = useState(0)

  return (
    <div className="modal-bd">
      <div className="modal-content">
        <p style={{ textAlign: 'right', width: '100%' }}>
          <input type="button" value="X" className="btn close" onClick={() => props.onCloseModal?.()} />
        </p>
        <h3>{props.title}</h3>
        <label>
          Amount <input type="text" value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} />
        </label>
        <input type="button" className="btn" value="confirm" onClick={() => props.onSubmit?.(amount)} />
      </div>
    </div>
  )
}

function App() {
  const [stakeModalIsVisible, setStakeModalVisible] = useState(false)
  const [unstakeModalIsVisible, setUnstakeModalVisible] = useState(false)

  const [tvl, setTvl] = useState(0)
  // eslint-disable-next-line no-unused-vars
  const [staked, setStaked] = useState(0)
  // eslint-disable-next-line no-unused-vars
  const [myYield, setMyYield] = useState(0)

  useEffect(() => {
    ;(async () => {
      console.log(await client.status().do())

      const globalState = decodeState((await client.getApplicationByID(APP_ID).do()).params['global-state'])
      console.log(globalState)
      setTvl(globalState.globalStakingBalance)

      const accountInfo = await client.accountInformation(STAKER_ACCOUNT_ADDRESS).do()
      const appsLocalState = decodeState(
        accountInfo['apps-local-state'].find(state => state.id === APP_ID)['key-value']
      )

      setStaked(appsLocalState.stakingBalance)
      setMyYield(appsLocalState.yieldBalance)
    })()
  }, [])

  const stakeWasSubmitted = async amount => {
    const applicationAddress = await window.algosdk.getApplicationAddress(APP_ID)
    const suggestedParams = await client.getTransactionParams().do()

    const stakerAccount = window.algosdk.mnemonicToSecretKey(STAKER_ACCOUNT_MNEMONIC)

    const to = applicationAddress

    const paymentTxn = await window.algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: STAKER_ACCOUNT_ADDRESS,
      to,
      amount,
      fee: 100,
      suggestedParams,
    })

    const appCallTxn = await window.algosdk.makeApplicationCallTxnFromObject({
      from: STAKER_ACCOUNT_ADDRESS,
      appIndex: APP_ID,
      onComplete: window.algosdk.AppNoOpTxn,
      appArgs: [Uint8Array.from('stake'.split('').map(c => c.charCodeAt(0)))],
      suggestedParams,
    })

    window.algosdk.assignGroupID([paymentTxn, appCallTxn])

    const signedPaymentTxn = await paymentTxn.signTxn(stakerAccount.sk)
    const signedAppCallTxn = await appCallTxn.signTxn(stakerAccount.sk)

    console.log('Sending transactions...')
    const sendTx = await client.sendRawTransaction([signedPaymentTxn, signedAppCallTxn]).do()
    console.log('Transaction ID')
    console.log(sendTx.txId)
  }

  const unstakeWasSubmitted = async amount => {
    const suggestedParams = await client.getTransactionParams().do()

    const stakerAccount = window.algosdk.mnemonicToSecretKey(STAKER_ACCOUNT_MNEMONIC)

    const appCallTxn = await window.algosdk.makeApplicationCallTxnFromObject({
      from: STAKER_ACCOUNT_ADDRESS,
      appIndex: APP_ID,
      onComplete: window.algosdk.AppNoOpTxn,
      appArgs: [Uint8Array.from('unstake'.split('').map(c => c.charCodeAt(0))), window.algosdk.encodeUint64(amount)],
      suggestedParams,
    })

    const signedAppCallTxn = await appCallTxn.signTxn(stakerAccount.sk)

    console.log('Sending transactions...')
    const sendTx = await client.sendRawTransaction([signedAppCallTxn]).do()
    console.log('Transaction ID')
    console.log(sendTx.txId)
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
              <span>ALG$ {tvl}</span>
            </p>
            <p>
              <strong>staked</strong>
              <br />
              <span>ALG$ {staked}</span>
            </p>
            <p>
              <strong>yield</strong>
              <br />
              <span>ALG$ {myYield}</span>
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
      </section>
      {stakeModalIsVisible && (
        <Modal title="stake" onCloseModal={() => setStakeModalVisible(false)} onSubmit={stakeWasSubmitted} />
      )}
      {unstakeModalIsVisible && (
        <Modal title="unstake" onCloseModal={() => setUnstakeModalVisible(false)} onSubmit={unstakeWasSubmitted} />
      )}
    </div>
  )
}

export default App
