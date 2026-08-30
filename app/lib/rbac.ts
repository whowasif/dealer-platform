import type { RoleName, SessionUser } from "./types";

// -----------------------------------------------------------------------------
// Role-Based Access Control helpers.
// Role levels come from the seeded `roles` table:
//   super_admin(1), hq_admin(2), hq_finance(2), hq_operations(2),
//   divisional_head(3), district_head(4), upazila_representative(5)
// Lower level number = higher authority.
// -----------------------------------------------------------------------------

export const HQ_ROLES: RoleName[] = [
  "super_admin",
  "hq_admin",
  "hq_finance",
  "hq_operations",
];

/** True if the user holds any HQ-level role (level 1 or 2). */
export function isHQ(user: SessionUser): boolean {
  return user.roles.some((r) => HQ_ROLES.includes(r.role_name));
}

/** True if the user holds the given role. */
export function hasRole(user: SessionUser, role: RoleName): boolean {
  return user.roles.some((r) => r.role_name === role);
}

/** True if the user can manage other users (HQ only). */
export function canManageUsers(user: SessionUser): boolean {
  return isHQ(user);
}

/** The scope (division/district/upazila) attached to a specific role, if any. */
export function scopeForRole(user: SessionUser, role: RoleName) {
  const assignment = user.roles.find((r) => r.role_name === role);
  return {
    divisionId: assignment?.scope_division_id ?? null,
    districtId: assignment?.scope_district_id ?? null,
    upazilaId: assignment?.scope_upazila_id ?? null,
  };
}

export interface MenuItem {
  label: string;
  href: string;
}

/**
 * Sidebar menu items appropriate for the user's highest role.
 * A user with multiple roles gets the menu for their most privileged role.
 */
export function menuForUser(user: SessionUser): MenuItem[] {
  if (isHQ(user)) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Users", href: "/users" },
      { label: "Representatives", href: "/representatives" },
      { label: "Products", href: "/products" },
      { label: "Orders", href: "/orders" },
      { label: "Customers", href: "/customers" },
      { label: "Projects", href: "/projects" },
      { label: "Profit Config", href: "/projects/config" },
      { label: "Fees & Payments", href: "/fees" },
      { label: "Documents", href: "/documents" },
      { label: "Reports (National)", href: "/reports" },
      { label: "Disciplinary", href: "/disciplinary" },
      { label: "Complaints", href: "/complaints" },
      { label: "Settings", href: "/settings" },
      { label: "Audit", href: "/audit" },
    ];
  }

  if (hasRole(user, "divisional_head")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Representatives", href: "/representatives" },
      { label: "Products", href: "/products" },
      { label: "Orders", href: "/orders" },
      { label: "Customers", href: "/customers" },
      { label: "Projects", href: "/projects" },
      { label: "Fees", href: "/fees" },
      { label: "Documents", href: "/documents" },
      { label: "Reports (Division)", href: "/reports" },
      { label: "Disciplinary", href: "/disciplinary" },
      { label: "Complaints", href: "/complaints" },
    ];
  }

  if (hasRole(user, "district_head")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Representatives", href: "/representatives" },
      { label: "Products", href: "/products" },
      { label: "Orders", href: "/orders" },
      { label: "Customers", href: "/customers" },
      { label: "Projects", href: "/projects" },
      { label: "Fees", href: "/fees" },
      { label: "Documents", href: "/documents" },
      { label: "Reports (District)", href: "/reports" },
      { label: "Complaints", href: "/complaints" },
    ];
  }

  // upazila_representative (default / lowest)
  return [
    { label: "My Dashboard", href: "/dashboard" },
    { label: "My Representative", href: "/representatives/me" },
    { label: "My Orders", href: "/orders" },
    { label: "Place Order", href: "/orders/new" },
    { label: "Record Sale", href: "/orders/sale/new" },
    { label: "My Customers", href: "/customers" },
    { label: "My Projects", href: "/projects" },
    { label: "New Project", href: "/projects/new" },
    { label: "My Fees", href: "/fees" },
    { label: "My Documents", href: "/documents" },
    { label: "Complaints", href: "/complaints" },
    { label: "Notifications", href: "/notifications" },
    { label: "My Profile", href: "/profile" },
  ];
}

/** Human-readable label for the user's primary (highest) role. */
export function primaryRoleLabel(user: SessionUser): string {
  const primary = user.roles.find((r) => r.role_name === user.primaryRole);
  return primary?.role_display_name ?? user.primaryRole;
}
