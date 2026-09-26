import { useState } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number, method: string) => void;
  currentBalance: number;
}

export default function PaymentModal({ isOpen, onClose, onDeposit, currentBalance }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [step, setStep] = useState<'select' | 'instructions' | 'confirm'>('select');

  if (!isOpen) return null;

  const paymentMethods = [
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '💳',
      color: 'from-blue-600 to-blue-700',
      details: 'fhs_alhinai@hotmail.com',
      description: 'Send payment to PayPal email'
    },
    {
      id: 'applepay',
      name: 'Apple Pay',
      icon: '',
      color: 'from-gray-800 to-gray-900',
      details: '+96895188386',
      description: 'Pay via Apple Pay'
    },
    {
      id: 'googlepay',
      name: 'Google Pay',
      icon: '🅖',
      color: 'from-green-600 to-green-700',
      details: '+96895188386',
      description: 'Pay via Google Pay'
    },
    {
      id: 'omannet',
      name: 'Omannet Mobile',
      icon: '📱',
      color: 'from-purple-600 to-purple-700',
      details: '+96895188386',
      description: 'Mobile payment via Omannet'
    }
  ];

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setStep('instructions');
  };

  const handleConfirmDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    onDeposit(amount, selectedMethod || 'unknown');
    setStep('confirm');
    setTimeout(() => {
      onClose();
      setStep('select');
      setSelectedMethod(null);
      setDepositAmount('');
    }, 2000);
  };

  const selectedPaymentMethod = paymentMethods.find(m => m.id === selectedMethod);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1419] border border-gray-700 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">💰 Add Funds</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Current Balance */}
        <div className="p-4 bg-gradient-to-r from-green-900/20 to-blue-900/20 border-b border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Current Balance</div>
          <div className="text-2xl font-bold text-green-400">${currentBalance.toFixed(2)}</div>
        </div>

        {/* Step 1: Select Payment Method */}
        {step === 'select' && (
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Select Payment Method</h3>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleMethodSelect(method.id)}
                  className="w-full p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center text-2xl`}>
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{method.name}</div>
                      <div className="text-xs text-gray-400">{method.description}</div>
                    </div>
                    <div className="text-gray-500">→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Instructions */}
        {step === 'instructions' && selectedPaymentMethod && (
          <div className="p-4">
            <button
              onClick={() => setStep('select')}
              className="text-xs text-blue-400 hover:text-blue-300 mb-3"
            >
              ← Back to methods
            </button>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${selectedPaymentMethod.color} flex items-center justify-center text-2xl`}>
                  {selectedPaymentMethod.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{selectedPaymentMethod.name}</div>
                  <div className="text-xs text-gray-400">Send payment to:</div>
                </div>
              </div>

              <div className="bg-black/30 rounded p-3 mb-3">
                <div className="text-xs text-gray-400 mb-1">
                  {selectedPaymentMethod.id === 'paypal' ? 'PayPal Email' : 'Phone Number'}
                </div>
                <div className="text-lg font-mono font-bold text-white break-all">
                  {selectedPaymentMethod.details}
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-2">
                <p>📋 <strong>Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Send your desired amount to the {selectedPaymentMethod.id === 'paypal' ? 'PayPal email' : 'number'} above</li>
                  <li>Include your username or player ID in the payment note</li>
                  <li>Enter the amount you sent below</li>
                  <li>Wait for payment verification (usually instant)</li>
                </ol>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount Sent ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              <button
                onClick={handleConfirmDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold rounded transition-all"
              >
                Confirm Deposit
              </button>

              <p className="text-xs text-center text-gray-500">
                ⚠️ In demo mode, deposits are simulated instantly
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirm' && (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-green-400 mb-2">Deposit Successful!</h3>
            <p className="text-sm text-gray-400">
              ${depositAmount} has been added to your balance
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="text-xs text-gray-500 text-center">
            <p>🔒 Secure payments | 💳 Multiple methods accepted</p>
            <p className="mt-1">Need help? Contact support</p>
          </div>
        </div>
      </div>
    </div>
  );
}
