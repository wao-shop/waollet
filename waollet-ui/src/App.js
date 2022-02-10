import React, { useState, useEffect } from 'react';

import './App.css';

const token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const server = 'http://127.0.0.1';
const port = 4001;
const client = new window.algosdk.Algodv2(token, server, port);
const APP_ID = 46;


const decodeState = states => {
  const finalStates = {}

  for (const state of states) {
    const {key: b64key, value: {bytes, type, uint}} = state
    const key = atob(b64key)
    finalStates[key] = type === 2 ? Number(uint) : atob(bytes)
  }

  return finalStates
}

function Modal(props) {
  const [amount, setAmount] = useState(0)

  return (<div className='modal-bd'>
    <div className="modal-content">
      <p style={{textAlign: 'right', width: '100%'}}>
        <input type="button" value='X' className='btn close' onClick={() => props.onCloseModal?.()} />
      </p>
      <h3>{props.title}</h3>
      <label>Amount <input type='text' value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)}/></label>
      <input type='button' className='btn' value='confirm' onClick={() => props.onSubmit?.(amount)} />
    </div>
  </div>)
}

function App() {
  const [stakeModalIsVisible, setStakeModalVisible] = useState(false)
  const [unstakeModalIsVisible, setUnstakeModalVisible] = useState(false)
  
  const [tvl, setTvl] = useState(0)
  const [staked, setStaked] = useState(0)
  const [myYield, setMyYield] = useState(0)


  useEffect(() => {
    (async () => {
      console.log(await client.status().do());

      const globalState = decodeState((await client.getApplicationByID(APP_ID).do()).params['global-state'])
      console.log(globalState)
      setTvl(globalState.globalStakingBalance)

    })()
}, []);

  const stakeWasSubmitted = async (amount) => { 

      
  }
  const unstakeWasSubmitted = (amount) => { alert(amount)}

  return (
    <div className="App">
      <section className='main bordered'>
        <h1>waollet</h1>
        <div className='bordered content'>
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
              <input type="button" className='btn' value='stake' disabled={stakeModalIsVisible || unstakeModalIsVisible} onClick={() => setStakeModalVisible(!stakeModalIsVisible)} />
              <input type="button" className='btn' value='unstake' disabled={stakeModalIsVisible || unstakeModalIsVisible} onClick={() => setUnstakeModalVisible(!unstakeModalIsVisible)} />
            </div>
          </div>
        </div>
      </section>
      {stakeModalIsVisible && <Modal title='stake' onCloseModal={() => setStakeModalVisible(false)} onSubmit={stakeWasSubmitted} />}
      {unstakeModalIsVisible && <Modal title='unstake' onCloseModal={() => setUnstakeModalVisible(false)} onSubmit={unstakeWasSubmitted} />}
    </div>
  );
}

export default App;
