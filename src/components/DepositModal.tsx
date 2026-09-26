import { useState } from 'react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  requiredAmount?: number;
  onDeposit: (amount: number, method: string) => void;
}

export default function DepositModal({ 
  isOpen, 
  onClose, 
  currentBalance, 
  requiredAmount,
  onDeposit 
}: DepositModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [step, setStep] = useState<'amount' | 'method' | 'confirm'>('amount');

  if (!isOpen) return null;

  const depositOptions = [50, 100, 250, 500];
  
  const paymentMethods = [
    { id: 'paypal', name: 'PayPal', icon: '💳', description: 'fhs_alhinai@hotmail.com' },
    { id: 'applepay', name: 'Apple Pay', icon: '', description: '+96895188386' },
    { id: 'googlepay', name: 'Google Pay', icon: '🅖', description: '+96895188386' },
    { id: 'omannet', name: 'Omannet', icon: '📱', description: '+96895188386' },
  ];

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getFinalAmount = () => {
    return selectedAmount || parseFloat(customAmount) || 0;
  };

  const handleNext = () => {
    if (step === 'amount' && getFinalAmount() > 0) {
      setStep('method');
    } else if (step === 'method' && selectedMethod) {
      setStep('confirm');
    }
  };

  const handleConfirm = () => {
    const amount = getFinalAmount();
    if (amount > 0 && selectedMethod) {
      onDeposit(amount, selectedMethod);
      onClose();
      // Reset state
      setSelectedAmount(null);
      setCustomAmount('');
      setSelectedMethod(null);
      setStep('amount');
    }
  };

  const handleBack = () => {
    if (step === 'method') {
      setStep('amount');
    } else if (step === 'confirm') {
      setStep('method');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1419] border border-gray-700 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>💰</span>
            <span>Deposit Funds</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current Balance */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Current Balance</div>
            <div className="text-2xl font-bold text-green-400">${currentBalance.toFixed(2)}</div>
            {requiredAmount && (
              <div className="text-xs text-amber-400 mt-2">
                Required: ${requiredAmount.toFixed(2)}
              </div>
            )}
          </div>

          {/* Step 1: Select Amount */}
          {step === 'amount' && (
            <>
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block">Select Amount</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {depositOptions.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountSelect(amount)}
                      className={`py-3 rounded font-bold transition-all ${
                        selectedAmount === amount
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Or enter custom amount</label>
                  <input
                    type="number"
                    min="10"
                    value={customAmount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    placeholder="Enter amount (min $10)"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={getFinalAmount() < 10}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold rounded transition-all"
              >
                Continue
              </button>
            </>
          )}

          {/* Step 2: Select Payment Method */}
          {step === 'method' && (
            <>
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block">
                  Deposit ${getFinalAmount().toFixed(2)} via
                </label>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full p-3 rounded-lg transition-all border-2 ${
                        selectedMethod === method.id
                          ? 'border-green-500 bg-green-900/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div className="text-left flex-1">
                          <div className="text-sm font-bold text-white">{method.name}</div>
                          <div className="text-xs text-gray-400">{method.description}</div>
                        </div>
                        {selectedMethod === method.id && (
                          <span className="text-green-400 text-xl">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold rounded transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!selectedMethod}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold rounded transition-all"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && (
            <>
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <div className="text-sm font-bold text-gray-400 mb-2">Confirm Deposit</div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="text-white font-bold">${getFinalAmount().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Method:</span>
                  <span className="text-white font-bold">
                    {paymentMethods.find(m => m.id === selectedMethod)?.name}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Processing Time:</span>
                  <span className="text-white">Instant</span>
                </div>
                
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">New Balance:</span>
                    <span className="text-green-400 font-bold">
                      ${(currentBalance + getFinalAmount()).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                <div className="text-xs text-amber-400 font-bold mb-1">Payment Instructions</div>
                <div className="text-xs text-gray-400">
                  {selectedMethod === 'paypal' && (
                    <>
                      Send ${getFinalAmount().toFixed(2)} to: <span className="text-white font-bold">fhs_alhinai@hotmail.com</span>
                      <br />Include your username in the payment note
                    </>
                  )}
                  {(selectedMethod === 'applepay' || selectedMethod === 'googlepay' || selectedMethod === 'omannet') && (
                    <>
                      Send ${getFinalAmount().toFixed(2)} to: <span className="text-white font-bold">+96895188386</span>
                      <br />Include your username in the payment note
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold rounded transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded transition-all"
                >
                  Confirm Deposit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
