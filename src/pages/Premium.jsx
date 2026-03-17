export default function Premium({ perks, isPremium, onToggle }) {
  return (
    <div className="page-section">
      <div className="page-header">
        <h2>Premium</h2>
        <button className="primary" type="button" onClick={onToggle}>
          {isPremium ? "Manage plan" : "Subscribe"}
        </button>
      </div>
      <div className="glass premium-card">
        <div className="premium-hero">
          <div>
            <h3>{isPremium ? "Premium active" : "Upgrade to Premium"}</h3>
            <p>
              Creator tools, advanced analytics, and a cleaner feed - built for
              serious accounts.
            </p>
          </div>
          <div className="premium-price">
            <span>AUD 9.99</span>
            <small>/ month</small>
          </div>
        </div>
        <div className="premium-billing">
          <span>Annual plan: AUD 99.99 / year (6 months free)</span>
          <span>{isPremium ? "Renews on Aug 24" : "Cancel anytime"}</span>
        </div>
        <div className="premium-perks">
          {perks.map((perk) => (
            <div key={perk} className="premium-perk">
              * {perk}
            </div>
          ))}
        </div>
        <div className="premium-status">
          <span>{isPremium ? "Current plan: Circle Noir" : "Plan details"}</span>
          <button className="ghost" type="button" onClick={onToggle}>
            {isPremium ? "Cancel trial" : "Start 7-day trial"}
          </button>
        </div>
        <div className="premium-note">
          <span>
            By subscribing you agree to recurring billing. Taxes may apply.
          </span>
          <button className="ghost" type="button">
            View terms
          </button>
        </div>
        <div className="premium-disclaimer glass">
          <p>
            By subscribing, you agree to our Purchase Terms. Subscriptions
            auto-renew until canceled. Cancel anytime at least 24 hours prior to
            renewal to avoid additional charges. Price subject to change.
            Manage your subscription through the platform you subscribed on.
          </p>
        </div>
      </div>
    </div>
  );
}
