import { useState } from 'react'
import LoadingButton from '../atoms/LoadingButton'

const algosToMicroalgos = window.algosdk.algosToMicroalgos

function TransactionModal(props) {
  const [amount, setAmount] = useState(0)

  return (
    <div className="modal-bd">
      <div className="modal-content">
        <div className="close-row">
          <input type="button" value="X" className="btn close" onClick={() => props.onCloseModal?.()} />
        </div>
        <h3>{props.title}</h3>
        {props.errorMessage && <p className="error-message">{props.errorMessage}</p>}
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
