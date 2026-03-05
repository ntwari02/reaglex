import BuyerLayout from '../../components/buyer/BuyerLayout';
import { motion } from 'framer-motion';

export default function AdvertiseWithUs() {
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
              📢 Advertise with Reaglex
            </p>
            <p
              className="text-sm sm:text-base"
              style={{ color: 'rgba(241,245,249,0.8)' }}
            >
              Reach 50,000+ active buyers across Rwanda with targeted campaigns that work.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3 text-sm">
          {[
            { title: 'Banner Ads', desc: 'High-visibility placements on key pages.' },
            { title: 'Featured Products', desc: 'Boost your top SKUs in search results.' },
            { title: 'Sponsored Listings', desc: 'Pay-per-click placement in listings.' },
            { title: 'Email Campaigns', desc: 'Reach inboxes of engaged shoppers.' },
            { title: 'Push Notifications', desc: 'Real-time alerts on mobile devices.' },
            { title: 'Social Media Promotion', desc: 'Co-branded posts on our channels.' },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[18px] p-4"
              style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}
            >
              <p
                className="font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.title}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-5xl space-y-4">
          <h2
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Pricing Packages
          </h2>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            {[
              {
                name: 'Starter',
                price: '$99',
                features: ['Basic banner placement', '1 email blast', 'Standard reporting'],
              },
              {
                name: 'Growth',
                price: '$249',
                features: ['Premium banners', '2 email blasts', 'Sponsored listings', 'Detailed analytics'],
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                features: ['Full-funnel campaigns', 'Dedicated manager', 'Custom integrations'],
              },
            ].map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-[18px] p-5 flex flex-col gap-3"
                style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {pkg.name}
                </p>
                <p
                  className="text-lg font-bold"
                  style={{ color: '#f97316' }}
                >
                  {pkg.price}
                </p>
                <ul className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {pkg.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl space-y-4">
          <h2
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Get Started
          </h2>
          <motion.form
            className="space-y-3 rounded-[20px] p-6"
            style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Company Name
                </label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-xs"
                  style={{ background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-primary)' }}
                  placeholder="Your company"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Email
                </label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-xs"
                  style={{ background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-primary)' }}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Budget (USD)
                </label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-xs"
                  style={{ background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-primary)' }}
                  placeholder="e.g. $500"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Preferred Ad Type
                </label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-xs"
                  style={{ background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-primary)' }}
                >
                  <option>Banner Ads</option>
                  <option>Featured Products</option>
                  <option>Sponsored Listings</option>
                  <option>Email Campaigns</option>
                  <option>Push Notifications</option>
                  <option>Social Media Promotion</option>
                </select>
              </div>
            </div>
            <div className="text-sm">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Message
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-xs"
                style={{ background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-primary)' }}
                placeholder="Tell us about your goals and ideal campaign..."
              />
            </div>
            <button
              type="button"
              className="mt-2 rounded-[12px] px-6 py-2 text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg,#f97316,#ea580c)',
              }}
            >
              Get Started
            </button>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              No seller account required — any business can advertise with Reaglex.
            </p>
          </motion.form>
        </section>
      </main>
    </BuyerLayout>
  );
}

