import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Megaphone,
  DollarSign,
  ShoppingCart,
  Package,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { adminRoleLabel } from '@/lib/adminPermissions';
import { buildAdminMenuSections, type AdminNavCategoryId } from '@/lib/adminNavCatalog';

const CATEGORY_ICONS: Partial<Record<AdminNavCategoryId, typeof Megaphone>> = {
  overview: Users,
  platform: ShieldCheck,
  people: Users,
  catalog: Package,
  commerce: ShoppingCart,
  revenue: DollarSign,
  growth: Megaphone,
  administration: Users,
};

export default function AdminScopedWorkspace() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const sections = buildAdminMenuSections(user);

  const go = (routeId: string) => {
    navigate(routeId === 'dashboard' ? '/admin' : `/admin/${routeId}`);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {adminRoleLabel(user)} workspace
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Tools grouped by department — you only see areas your role can access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ category, items }) => {
          const Icon = CATEGORY_ICONS[category.id] || Package;
          return (
            <section
              key={category.id}
              className="rounded-2xl border p-4 sm:p-5"
              style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)' }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {category.label}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {category.description}
                  </p>
                </div>
              </div>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item.id)}
                      className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      <ArrowRight className="w-4 h-4 shrink-0 opacity-50" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
