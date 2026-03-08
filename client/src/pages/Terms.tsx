import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Scale,
  UserCheck,
  ShoppingBag,
  Shield,
  AlertTriangle,
  Copy,
  Gavel,
  LogOut,
  BookOpen,
  Mail,
  ChevronRight,
} from 'lucide-react';
// @ts-ignore
import BuyerLayout from '../components/buyer/BuyerLayout';

const PRIMARY = '#f97316';
const LAST_UPDATED = 'March 7, 2025';

const SECTIONS = [
  { id: 'acceptance', label: 'Acceptance of Terms', icon: FileText },
  { id: 'eligibility', label: 'Eligibility', icon: UserCheck },
  { id: 'account', label: 'Account Registration', icon: UserCheck },
  { id: 'use-of-service', label: 'Use of the Service', icon: BookOpen },
  { id: 'buying-selling', label: 'Buying and Selling', icon: ShoppingBag },
  { id: 'payments', label: 'Payments & Escrow', icon: Shield },
  { id: 'prohibited', label: 'Prohibited Conduct', icon: AlertTriangle },
  { id: 'intellectual-property', label: 'Intellectual Property', icon: Copy },
  { id: 'disclaimers', label: 'Disclaimers', icon: AlertTriangle },
  { id: 'limitation', label: 'Limitation of Liability', icon: Scale },
  { id: 'indemnity', label: 'Indemnity', icon: Shield },
  { id: 'disputes', label: 'Disputes & Resolution', icon: Gavel },
  { id: 'termination', label: 'Termination', icon: LogOut },
  { id: 'general', label: 'General Provisions', icon: BookOpen },
  { id: 'contact', label: 'Contact', icon: Mail },
];

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ComponentType<{ className?: string; size?: number }>; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl p-6 sm:p-8 mb-6"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--divider)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${PRIMARY}18`, color: PRIMARY }}
          >
            <Icon size={20} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
        </div>
        <div className="prose-terms" style={{ color: 'var(--text-secondary)' }}>
          {children}
        </div>
      </motion.div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[15px] leading-relaxed">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 mb-4 space-y-1 text-[15px] leading-relaxed">{children}</ul>;
}

export default function Terms() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <BuyerLayout>
      <div className="min-h-screen pb-16">
        {/* Hero */}
        <div
          className="relative overflow-hidden rounded-b-3xl px-4 sm:px-6 py-12 sm:py-16 mb-10"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            color: '#f8fafc',
          }}
        >
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(249,115,22,0.25) 0%, transparent 50%)' }} />
          <div className="relative max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium"
              style={{ background: 'rgba(249,115,22,0.2)', color: '#fdba74' }}
            >
              <FileText size={16} />
              Legal
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
            >
              Terms of Service
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-300 text-base sm:text-lg mb-2"
            >
              Please read these terms carefully before using Reaglex.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-slate-400 text-sm"
            >
              Last updated: {LAST_UPDATED}
            </motion.p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row gap-10">
          {/* Table of contents - sticky on desktop */}
          <aside className="lg:w-64 flex-shrink-0">
            <div
              className="lg:sticky lg:top-28 rounded-2xl p-5 border"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--divider)' }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                On this page
              </h3>
              <nav className="space-y-0.5">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-colors"
                    style={{
                      color: activeId === id ? PRIMARY : 'var(--text-secondary)',
                      background: activeId === id ? `${PRIMARY}12` : 'transparent',
                    }}
                  >
                    <Icon size={14} className="flex-shrink-0 opacity-70" />
                    <span className="truncate">{label}</span>
                    <ChevronRight size={14} className="ml-auto opacity-50 flex-shrink-0" />
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Section id="acceptance" title="Acceptance of Terms" icon={FileText}>
              <P>
                Welcome to Reaglex. These Terms of Service (“Terms”) are a binding agreement between you and Reaglex
                (“we,” “us,” or “our”) governing your access to and use of the Reaglex website, mobile applications,
                and related services (collectively, the “Service”). By creating an account, browsing, or using the
                Service in any way, you agree to be bound by these Terms and our Privacy Policy.
              </P>
              <P>
                If you do not agree to these Terms, you may not access or use the Service. We may update these Terms
                from time to time; the “Last updated” date at the top of this page will reflect the latest version.
                Continued use of the Service after changes constitutes acceptance of the revised Terms.
              </P>
            </Section>

            <Section id="eligibility" title="Eligibility" icon={UserCheck}>
              <P>
                You must be at least 18 years of age (or the age of majority in your jurisdiction) and have the legal
                capacity to enter into a binding contract to use the Service. By using Reaglex, you represent and warrant
                that you meet these requirements and that all information you provide is accurate and current.
              </P>
              <P>
                If you are using the Service on behalf of a business, you represent that you have the authority to bind
                that entity to these Terms.
              </P>
            </Section>

            <Section id="account" title="Account Registration" icon={UserCheck}>
              <P>
                To access certain features (e.g., buying, selling, messaging), you must register for an account. You
                agree to provide accurate, current, and complete information and to update it as needed. You are
                responsible for maintaining the confidentiality of your password and for all activity under your
                account.
              </P>
              <Ul>
                <li>You must not share your account credentials or allow others to use your account.</li>
                <li>You must notify us immediately of any unauthorized use or breach of security.</li>
                <li>We may suspend or terminate accounts that violate these Terms or for other reasons we deem appropriate.</li>
              </Ul>
            </Section>

            <Section id="use-of-service" title="Use of the Service" icon={BookOpen}>
              <P>
                Reaglex provides a platform that connects buyers and sellers. We do not take ownership of items sold
                on the platform; transactions are between buyers and sellers. We may facilitate payments, escrow, and
                dispute resolution as described in these Terms and in our policies.
              </P>
              <P>You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:</P>
              <Ul>
                <li>Use the Service in any way that violates applicable laws or regulations.</li>
                <li>Infringe the intellectual property or other rights of Reaglex or any third party.</li>
                <li>Transmit malware, spam, or any harmful or disruptive content.</li>
                <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems.</li>
                <li>Use automated means (e.g., bots, scrapers) without our prior written permission.</li>
              </Ul>
            </Section>

            <Section id="buying-selling" title="Buying and Selling" icon={ShoppingBag}>
              <P>
                <strong>Buyers:</strong> When you purchase an item, you agree to pay the listed price (including any
                applicable taxes and shipping) and to complete the transaction in good faith. You must comply with our
                Buyer Protection and returns policies where applicable.
              </P>
              <P>
                <strong>Sellers:</strong> When you list an item, you represent that you have the right to sell it, that
                the listing is accurate and not misleading, and that you will fulfill orders in a timely manner. You must
                comply with our Seller Guidelines, fees, and policies. We may hold funds in escrow until the buyer
                confirms receipt or the dispute period expires.
              </P>
              <P>
                Both buyers and sellers must communicate and resolve issues in good faith. Reaglex may step in to
                mediate or resolve disputes in accordance with our dispute resolution process.
              </P>
            </Section>

            <Section id="payments" title="Payments & Escrow" icon={Shield}>
              <P>
                Payments may be processed through our designated payment providers. By using the Service, you agree to
                their terms and to our payment and escrow policies. In certain cases, buyer funds are held in escrow
                until the buyer confirms delivery or the applicable period expires. Fees (e.g., transaction fees, listing
                fees) are as described on the platform and may change with notice.
              </P>
              <P>
                You are responsible for any taxes arising from your use of the Service or from transactions you
                conduct. Refunds and cancellations are subject to our refund policy and the specific terms of the
                transaction.
              </P>
            </Section>

            <Section id="prohibited" title="Prohibited Conduct" icon={AlertTriangle}>
              <P>You must not use the Service to:</P>
              <Ul>
                <li>List or sell illegal, counterfeit, stolen, or prohibited items.</li>
                <li>Misrepresent items, prices, or your identity or business.</li>
                <li>Circumvent Reaglex (e.g., directing users to pay or communicate off-platform to avoid fees or policies).</li>
                <li>Harass, abuse, or harm other users or our staff.</li>
                <li>Manipulate reviews, ratings, or search results.</li>
                <li>Collect or misuse other users’ data without consent.</li>
              </Ul>
              <P>
                We reserve the right to remove content, suspend or terminate accounts, and report illegal activity to
                authorities. Repeat or serious violations may result in permanent bans.
              </P>
            </Section>

            <Section id="intellectual-property" title="Intellectual Property" icon={Copy}>
              <P>
                Reaglex and its logos, design, text, graphics, and other materials are owned by or licensed to us and
                are protected by intellectual property laws. You may not copy, modify, distribute, or create derivative
                works without our prior written consent. You retain ownership of content you submit (e.g., listings,
                photos), but you grant us a worldwide, non-exclusive, royalty-free license to use, display, and
                distribute that content in connection with the Service.
              </P>
            </Section>

            <Section id="disclaimers" title="Disclaimers" icon={AlertTriangle}>
              <P>
                THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
                WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
                WE ARE NOT RESPONSIBLE FOR THE CONDUCT OF USERS OR FOR THE QUALITY, SAFETY, OR LEGALITY OF ITEMS
                LISTED ON THE PLATFORM. YOU USE THE SERVICE AT YOUR OWN RISK.
              </P>
            </Section>

            <Section id="limitation" title="Limitation of Liability" icon={Scale}>
              <P>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, REAGLEX AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS
                SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
                (INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL) ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE
                OR FROM ANY TRANSACTIONS BETWEEN USERS, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH
                DAMAGES.
              </P>
              <P>
                OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT
                EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO REAGLEX IN THE TWELVE (12) MONTHS BEFORE THE CLAIM,
                OR (B) ONE HUNDRED UNITED STATES DOLLARS (USD $100). SOME JURISDICTIONS DO NOT ALLOW CERTAIN
                LIMITATIONS; IN SUCH CASES, OUR LIABILITY WILL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
              </P>
            </Section>

            <Section id="indemnity" title="Indemnity" icon={Shield}>
              <P>
                You agree to indemnify, defend, and hold harmless Reaglex and its affiliates, officers, employees, and
                agents from and against any claims, damages, losses, liabilities, costs, and expenses (including
                reasonable attorneys’ fees) arising from (a) your use of the Service, (b) your violation of these
                Terms or any law, (c) your violation of any third-party rights, or (d) any dispute between you and
                another user.
              </P>
            </Section>

            <Section id="disputes" title="Disputes & Resolution" icon={Gavel}>
              <P>
                We encourage you to resolve disputes with other users directly. If you cannot, you may use our in-platform
                dispute resolution process. For disputes between you and Reaglex, you agree to first contact us in good
                faith. If the dispute is not resolved within sixty (60) days, either party may pursue the dispute in
                accordance with the governing law and dispute resolution provisions below.
              </P>
              <P>
                These Terms are governed by the laws of the jurisdiction in which Reaglex operates, without regard to
                conflict of law principles. Any legal action shall be brought in the courts of that jurisdiction, and
                you consent to personal jurisdiction there. Where permitted, you agree to waive any right to a jury trial
                or to participate in a class action.
              </P>
            </Section>

            <Section id="termination" title="Termination" icon={LogOut}>
              <P>
                You may close your account at any time through your account settings. We may suspend or terminate your
                access to the Service, with or without notice, for any reason, including breach of these Terms, fraud,
                or conduct that we believe harms the platform or other users.
              </P>
              <P>
                Upon termination, your right to use the Service ceases. Provisions that by their nature should survive
                (e.g., disclaimers, limitation of liability, indemnity, dispute resolution) will survive termination.
              </P>
            </Section>

            <Section id="general" title="General Provisions" icon={BookOpen}>
              <P>
                <strong>Entire agreement:</strong> These Terms, together with our Privacy Policy and any other policies
                we reference, constitute the entire agreement between you and Reaglex regarding the Service.
              </P>
              <P>
                <strong>Severability:</strong> If any provision of these Terms is held invalid or unenforceable, the
                remaining provisions will remain in effect.
              </P>
              <P>
                <strong>Waiver:</strong> Our failure to enforce any right or provision does not waive that right or
                provision.
              </P>
              <P>
                <strong>Assignment:</strong> You may not assign or transfer these Terms without our consent. We may
                assign our rights and obligations without restriction.
              </P>
            </Section>

            <Section id="contact" title="Contact" icon={Mail}>
              <P>
                For questions about these Terms or the Service, please contact us:
              </P>
              <ul className="list-none space-y-1 text-[15px]">
                <li><strong>Reaglex</strong></li>
                <li>Email: legal@reaglex.com (or the contact address published on our website)</li>
                <li>Support: through the Help or Contact options in the Service</li>
              </ul>
              <P className="mt-4">
                By using Reaglex, you acknowledge that you have read, understood, and agree to be bound by these Terms
                of Service.
              </P>
            </Section>
          </main>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(234,88,12,0.05) 100%)',
              border: '1px solid rgba(249,115,22,0.2)',
            }}
          >
            <div>
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Privacy & cookies
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Read how we collect and use your data.
              </p>
            </div>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: PRIMARY, color: '#fff', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}
            >
              Privacy Policy
              <ChevronRight size={18} />
            </Link>
          </motion.div>
        </div>
      </div>

      <style>{`
        .prose-terms p:last-child { margin-bottom: 0; }
        .prose-terms ul:last-child { margin-bottom: 0; }
        .prose-terms strong { color: var(--text-primary); }
      `}</style>
    </BuyerLayout>
  );
}
