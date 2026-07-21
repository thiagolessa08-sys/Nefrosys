"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`rounded-lg px-[15px] py-2 text-sm font-semibold transition-colors ${
        ativo ? "bg-white/15 text-white" : "text-[#a7cdc8] hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}
