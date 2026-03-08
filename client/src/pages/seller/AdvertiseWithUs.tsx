import BuyerLayout from '../../components/buyer/BuyerLayout';
import { motion } from 'framer-motion';
import { Image, Mail, BarChart3, List, Target, UserCircle, Plug } from 'lucide-react';

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
          <div className="w-full text-center space-y-4">
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

        <section className="grid w-full gap-4 md:grid-cols-3 text-sm">
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

        <section className="w-full space-y-6">
          <h2
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Pricing Packages
          </h2>
          <div className="grid gap-5 md:grid-cols-3 text-sm">
            {[
              {
                name: 'Starter',
                price: '$99',
                popular: false,
                features: [
                  { text: 'Basic banner placement', icon: Image },
                  { text: '1 email blast', icon: Mail },
                  { text: 'Standard reporting', icon: BarChart3 },
                ],
              },
              {
                name: 'Growth',
                price: '$249',
                popular: true,
                features: [
                  { text: 'Premium banners', icon: Image },
                  { text: '2 email blasts', icon: Mail },
                  { text: 'Sponsored listings', icon: List },
                  { text: 'Detailed analytics', icon: BarChart3 },
                ],
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                popular: false,
                features: [
                  { text: 'Full-funnel campaigns', icon: Target },
                  { text: 'Dedicated manager', icon: UserCircle },
                  { text: 'Custom integrations', icon: Plug },
                ],
              },
            ].map((pkg) => (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3 }}
                className={`relative rounded-[20px] p-6 flex flex-col gap-4 border-2 transition-all duration-200 ${
                  pkg.popular
                    ? 'border-orange-500 shadow-lg'
                    : 'border-transparent'
                }`}
                style={{
                  background: pkg.popular ? 'var(--card-bg)' : 'var(--card-bg)',
                  boxShadow: pkg.popular ? '0 10px 40px rgba(249, 115, 22, 0.15), var(--shadow-md)' : 'var(--shadow-md)',
                }}
              >
                {pkg.popular && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white uppercase tracking-wider"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                  >
                    Most popular
                  </span>
                )}
                <div>
                  <p
                    className="text-base font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {pkg.name}
                  </p>
                  <p
                    className="text-2xl font-extrabold mt-1"
                    style={{ color: '#f97316' }}
                  >
                    {pkg.price}
                  </p>
                </div>
                <ul className="space-y-3 flex-1">
                  {pkg.features.map(({ text, icon: Icon }) => (
                    <li
                      key={text}
                      className="flex items-center gap-3 text-[13px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(249, 115, 22, 0.12)', color: '#f97316' }}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#get-started"
                  className="mt-2 block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-all duration-200 hover:opacity-90"
                  style={{
                    background: pkg.popular
                      ? 'linear-gradient(135deg, #f97316, #ea580c)'
                      : 'var(--bg-secondary)',
                    color: pkg.popular ? '#fff' : 'var(--text-primary)',
                    border: pkg.popular ? 'none' : '1.5px solid var(--divider)',
                  }}
                >
                  Choose {pkg.name}
                </a>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="get-started" className="w-full space-y-4 scroll-mt-6">
          <h2
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Get Started
          </h2>
          <motion.form
            className="space-y-4 rounded-[20px] p-6 sm:p-8"
            style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-500/40"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1.5px solid var(--divider, #e5e7eb)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Your company"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-500/40"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1.5px solid var(--divider, #e5e7eb)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Budget (USD)
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-500/40"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1.5px solid var(--divider, #e5e7eb)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="e.g. $500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Preferred Ad Type
                </label>
                <select
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-500/40 cursor-pointer"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1.5px solid var(--divider, #e5e7eb)',
                    color: 'var(--text-primary)',
                  }}
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
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Message
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-500/40 resize-y min-h-[100px]"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1.5px solid var(--divider, #e5e7eb)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Tell us about your goals and ideal campaign..."
              />
            </div>
            <button
              type="button"
              className="mt-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
              }}
            >
              Get Started
            </button>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              No seller account required — any business can advertise with Reaglex.
            </p>
          </motion.form>
        </section>
      </main>
    </BuyerLayout>
  );
}

