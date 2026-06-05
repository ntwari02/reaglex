import { Link } from 'react-router-dom';

type AuthTab = 'login' | 'signup' | 'forgot';

export default function AuthFusionTabs({ activeTab }: { activeTab: AuthTab }) {
  const loginActive = activeTab === 'login' || activeTab === 'forgot';

  return (
    <nav className="agf-tabs" role="tablist" aria-label="Sign in or create account">
      <Link
        to="/auth?tab=login"
        role="tab"
        aria-selected={loginActive}
        className={`agf-tabs__tab${loginActive ? ' is-active' : ''}`}
      >
        Sign In
      </Link>
      <Link
        to="/auth?tab=signup"
        role="tab"
        aria-selected={activeTab === 'signup'}
        className={`agf-tabs__tab${activeTab === 'signup' ? ' is-active' : ''}`}
      >
        Create Account
      </Link>
    </nav>
  );
}
