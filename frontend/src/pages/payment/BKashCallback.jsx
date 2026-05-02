import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { executeBKashPayment } from '../../api/paymentApi'
import toast from 'react-hot-toast'

export default function BKashCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing') // processing, success, error
  const [errorMessage, setErrorMessage] = useState('')

  const paymentID = searchParams.get('paymentID')
  const bKashStatus = searchParams.get('status')

  useEffect(() => {
    const execute = async () => {
      if (bKashStatus === 'success' && paymentID) {
        try {
          const { data } = await executeBKashPayment({ paymentID })
          if (data.status === 'success') {
            setStatus('success')
            toast.success('Payment Successful!')
            setTimeout(() => navigate('/dashboard'), 3000)
          } else {
            setStatus('error')
            setErrorMessage(data.error || 'Payment execution failed')
          }
        } catch (err) {
          setStatus('error')
          setErrorMessage(err.response?.data?.error || 'Something went wrong during execution')
        }
      } else {
        setStatus('error')
        setErrorMessage(bKashStatus === 'cancel' ? 'Payment Cancelled' : 'Payment Failed')
      }
    }

    execute()
  }, [paymentID, bKashStatus, navigate])

  return (
    <div className="container page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: 450, width: '100%', padding: 40, textAlign: 'center' }}>
        {status === 'processing' && (
          <>
            <Loader2 size={64} className="spinner" style={{ color: 'var(--orange-500)', marginBottom: 20 }} />
            <h2 className="section-title">Finalizing Payment</h2>
            <p style={{ color: 'var(--gray-400)', marginTop: 10 }}>Please do not close or refresh this page...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ color: '#10b981', marginBottom: 20 }}>
              <CheckCircle size={80} strokeWidth={1.5} />
            </div>
            <h2 className="section-title">Payment Successful!</h2>
            <p style={{ color: 'var(--gray-400)', marginTop: 10 }}>Thank you for your payment. Redirecting to your dashboard...</p>
            <button className="btn btn-primary" style={{ marginTop: 24, width: '100%' }} onClick={() => navigate('/dashboard')}>
              Go to Dashboard Now
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ color: '#ef4444', marginBottom: 20 }}>
              <XCircle size={80} strokeWidth={1.5} />
            </div>
            <h2 className="section-title" style={{ color: '#ef4444' }}>Payment Failed</h2>
            <p style={{ color: 'var(--gray-400)', marginTop: 10 }}>{errorMessage}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(-1)}>
                  Try Again
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
