import { LucideIcon, ShoppingBasket } from "lucide-react";
import { CATEGORIES, getCategoryIcon } from "@/lib/categories";

export function CategorySidebar({
  active,
  onSelect,
}: {
  active: string | null;
  onSelect: (category: string | null) => void;
}) {
  return (
    <nav className="w-full shrink-0 sm:w-48">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-paper-400">
        Category
      </p>
      <ul className="flex gap-2 overflow-x-auto pb-2 sm:flex-col sm:overflow-visible sm:pb-0">
        <SidebarItem
          label="All products"
          Icon={ShoppingBasket}
          active={active === null}
          onClick={() => onSelect(null)}
        />
        {CATEGORIES.map((category) => (
          <SidebarItem
            key={category}
            label={category}
            Icon={getCategoryIcon(category)}
            active={active === category}
            onClick={() => onSelect(category)}
          />
        ))}
      </ul>
    </nav>
  );
}

function SidebarItem({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li className="shrink-0 sm:shrink">
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          active
            ? "bg-brand-500 text-white shadow-card"
            : "text-paper-800 hover:bg-paper-100"
        }`}
      >
        <Icon size={18} className={active ? "text-white" : "text-brand-600"} />
        {label}
      </button>
    </li>
  );
}
