import { useState, useEffect } from 'react'

async function loadAccountsFromAlgoSigner() {
  await window.AlgoSigner.connect()
  const accounts = await window.AlgoSigner.accounts({ ledger: process.env.REACT_APP_LEDGER_ID })
  return accounts
}

const Accounts = ({ accounts, onSelectAddress }) => (
  <>
    {accounts.map(acc => (
      <input
        className="btn account-entry"
        onClick={() => onSelectAddress(acc.address)}
        key={acc.address}
        readOnly={true}
        value={acc.address}
      />
    ))}
  </>
)

function AccountModal(props) {
  const [accountObjects, setAccountObjects] = useState([])

  useEffect(() => {
    loadAccountsFromAlgoSigner().then(data => {
      setAccountObjects(data)
    })
  }, [])

  return (
    <div className="modal-bd">
      <div className="modal-content accounts-modal">
        <div className="close-row">
          <input type="button" value="X" className="btn close" onClick={() => props.onCloseModal?.()} />
        </div>
        <h3>{props.title}</h3>
        <Accounts accounts={accountObjects} onSelectAddress={addr => props.onSelectAddress?.(addr)} />
      </div>
    </div>
  )
}

export default AccountModal
