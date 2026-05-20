import AccountSettingsDashboard from '../AccountSettingsDashboard';
import { useAccountOverlay } from '../../stores/accountOverlayStore';

/** Full settings UI inside overlay — uses 2030 OS skin via account-settings-os */
export default function AccountSettingsEmbed() {
  const settingsSection = useAccountOverlay((s) => s.settingsSection);

  return (
    <div className="account-settings-os" style={{ minHeight: 480 }}>
      <AccountSettingsDashboard embedded forcedSection={settingsSection} />
    </div>
  );
}
