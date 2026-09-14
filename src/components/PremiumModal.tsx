import { useState } from 'react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function PremiumModal({ isOpen, onClose, onUpgrade }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  if (!isOpen) return null;

  const plans = {
    monthly: { price: 100, period: 'month', savings: 0 },
    yearly: { price: 1200, period: 'year', savings: 0 },
  };

  const benefits = [
    { icon: '💰', title: 'Higher Bet Limits', description: 'Bet up to $1,000 per round' },
    { icon: '⚡', title: 'Priority Support', description: '24/7 dedicated support' },
    { icon: '🎯', title: 'Advanced Analytics', description: 'Detailed performance insights' },
    { icon: '🏆', title: 'Exclusive Tournaments', description: 'Access to PRO-only tournaments' },
    { icon: '💎', title: 'Lower Service Fees', description: 'Reduced to 3% (vs 5%)' },
    { icon: '🎁', title: 'Welcome Bonus', description: '$50 bonus on upgrade' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1419] border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-amber-900/30 to-yellow-900/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>⭐</span>
                <span>Upgrade to PRO</span>
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Unlock premium features and maximize your trading potential
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-gray-800/50 rounded-lg p-3 flex items-start gap-3"
              >
                <span className="text-2xl">{benefit.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{benefit.title}</div>
                  <div className="text-xs text-gray-400">{benefit.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Plan Selection */}
          <div className="mb-6">
            <label className="text-sm font-bold text-gray-400 mb-3 block">Choose Your Plan</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPlan === 'monthly'
                    ? 'border-amber-500 bg-amber-900/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="text-sm text-gray-400 mb-1">Monthly</div>
                <div className="text-2xl font-bold text-white">${plans.monthly.price}</div>
                <div className="text-xs text-gray-400">per month</div>
              </button>
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPlan === 'yearly'
                    ? 'border-amber-500 bg-amber-900/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="text-sm text-gray-400 mb-1">Yearly</div>
                <div className="text-2xl font-bold text-white">${plans.yearly.price}</div>
                <div className="text-xs text-gray-400">per year</div>
                <div className="text-xs text-gray-400 mt-1">
                  ${((plans.yearly.price / 12) ).toFixed(2)}/month
                </div>
              </button>
            </div>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={onUpgrade}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold rounded-lg transition-all text-lg"
          >
            ⭐ Upgrade Now - ${plans[selectedPlan].price}/{plans[selectedPlan].period === 'month' ? 'mo' : 'yr'}
          </button>

          {/* Guarantee */}
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500">
              ✓ 7-day money-back guarantee
              <br />
              ✓ Cancel anytime
              <br />
              ✓ Instant activation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
