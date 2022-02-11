import './LoadingButton.css'

function LoadingButton(props) {
  return props.isLoading ? (
    <div className="btn-loading">loading...</div>
  ) : (
    <input type="button" className="btn" value={props.value} onClick={() => props.onClick?.()} />
  )
}

export default LoadingButton
