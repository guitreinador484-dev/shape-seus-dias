import { ProfileMore, type MoreItem } from "./profile-more";
import { floatingNavItemClass, PRIMARY_TABS } from "@/lib/student-nav";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onGoToCheckin: () => void;
  userEmail?: string;
  moreItems: MoreItem[];
}

export function MobileNav({ activeTab, onTabChange, onLogout, onGoToCheckin, userEmail, moreItems }: MobileNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-input bg-popover shadow-2xl shadow-black/60 lg:hidden"
    >
      <div className="grid h-16 grid-cols-5 gap-0.5 p-1.5">
        {PRIMARY_TABS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onTabChange(item.id)}
              className={floatingNavItemClass(active)}
            >
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
        <ProfileMore
          userEmail={userEmail}
          activeTab={activeTab}
          items={moreItems}
          onTabChange={onTabChange}
          onGoToCheckin={onGoToCheckin}
          onLogout={onLogout}
        />
      </div>
    </nav>
  );
}
