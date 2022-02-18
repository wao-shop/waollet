import LoadingButton from '../atoms/LoadingButton'

const microalgosToAlgos = window.algosdk.microalgosToAlgos

function LoadingModal(props) {
  return (
    <div className="modal-bd">
      <div className="modal-content transfer-modal">
        <div className="close-row">
          <input type="button" value="X" className="btn close" onClick={() => props.onCloseModal?.()} />
        </div>
        <h3>You will receive ALG${microalgosToAlgos(props.amount)}</h3>
        {props.errorMessage && <p className="error-message">{props.errorMessage}</p>}
        <LoadingButton value="confirm" isLoading={props.isLoading} onClick={() => props.onSubmit?.()} />
      </div>
    </div>
  )
}

export default LoadingModal
