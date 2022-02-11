import { useState } from 'react'
import LoadingButton from '../atoms/LoadingButton'

const algosToMicroalgos = window.algosdk.algosToMicroalgos

function TransactionModal(props) {
  const [amount, setAmount] = useState(0)

  return (
    <div className="modal-bd">
      <div className="modal-content">
        <p style={{ textAlign: 'right', width: '100%' }}>
          <input type="button" value="X" className="btn close" onClick={() => props.onCloseModal?.()} />
        </p>
        <h3>{props.title}</h3>
        <label>
          Amount ALG$ <input type="text" value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} />
        </label>
        <LoadingButton
          value="confirm"
          isLoading={props.isLoading}
          onClick={() => props.onSubmit?.(algosToMicroalgos(amount))}
        />
      </div>
    </div>
  )
}

export default TransactionModal
