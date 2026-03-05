import BuyerLayout from '../../components/buyer/BuyerLayout';

export default function SellerProtection() {
  return (
    <BuyerLayout>
      <main className="min-h-[60vh] w-full px-4 py-10 sm:px-6 lg:px-10 space-y-10">
        <section
          className="rounded-[24px] px-6 py-10 sm:px-10"
          style={{
            background:
              'linear-gradient(135deg,#020617 0%,#020617 15%,#0f172a 60%,#020617 100%)',
          }}
        >
          <div className="mx-auto max-w-4xl text-center space-y-4">
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              🛡️ Seller Protection Program
            </p>
            <p
              className="text-sm sm:text-base"
              style={{ color: 'rgba(241,245,249,0.8)' }}
            >
              We protect honest sellers from bad actors, false claims, and chargebacks so
              you can focus on growing your business.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3 text-sm">
          {[
            'Fraud buyer protection',
            'Chargeback protection',
            'Dispute resolution support',
            'Account security guarantee',
            'Payment guarantee',
          ].map((title) => (
            <div
              key={title}
              className="rounded-[18px] p-4"
              style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}
            >
              <p
                className="font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                ✓ {title}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Reaglex steps in when there&apos;s a problem, investigates both sides,
                and protects you when you&apos;ve followed the rules.
              </p>
            </div>
          ))}
        </section>
      </main>
    </BuyerLayout>
  );
}

