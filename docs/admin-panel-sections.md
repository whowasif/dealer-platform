# Admin Panel Sections

This document explains the sections currently shown in the Dealer Network management system.

## 1. Super Admin

The Super Admin has the highest level of access and can manage the whole system.

| Section | Purpose |
|---|---|
| Dashboard | Shows a quick summary of the whole business, users, representatives, projects, orders, and other important activity. |
| Users | Creates and manages system login accounts. Assigns roles such as HQ, divisional head, district head, and representative. |
| Representatives | Manages dealer/representative profiles, assigned areas, packages, deposits, contracts, laptop records, and representative status. |
| Products | Adds and manages products, services, prices, categories, specifications, and active/inactive status. |
| Orders | Reviews and manages warehouse orders and customer sales. HQ can approve orders and control fulfillment. |
| Customers | Views and manages customer records belonging to representatives. |
| Projects | Manages business projects, project approvals, project files, project communication, progress stages, and profit distribution. |
| Technical Support | Handles technical problems, software bugs, login issues, and other system-related support requests. |
| Profit Config | Sets the profit-sharing percentages and company-fund rules used by the project profit engine. |
| HQ Executives | Adds HQ executives and sets their designation and profit-share weight. |
| Funds | Shows company-fund balances and transactions, including representative support, future works, and growth funds. |
| Fees & Payments | Manages representative fees, invoices, payments, payment verification, and fee schedules. |
| Website Content | Updates the public website's insight cards, network cards, images, and contact messages. |
| Reports (National) | Shows nationwide sales, projects, orders, financial figures, representatives, and performance reports. |
| Disciplinary | Records warnings, suspensions, terminations, and other disciplinary actions. |
| Complaints | Receives, assigns, tracks, and resolves complaints from customers or representatives. |
| Notifications | Shows system alerts, approval requests, payment notifications, and other important messages. |
| My Profile | Shows the logged-in user's personal information, password settings, and personal documents. |
| Settings | Contains system-level settings and administrative configuration options. |
| Audit | Shows a history of important actions, especially financial and administrative changes. |

## 2. HQ Admin, HQ Finance, and HQ Operations

These are national-level HQ roles. They can see and manage most nationwide operations, but some configuration features are limited by role.

| Section | Purpose |
|---|---|
| Dashboard | Shows nationwide operational summaries and key numbers. |
| Users | Views system users and their roles. User creation and role changes are controlled by the allowed administration permissions. |
| Representatives | Views and manages representatives across Bangladesh according to the user's permission level. |
| Products | Manages the product catalog and central warehouse stock. |
| Orders | Reviews, approves, processes, ships, and delivers warehouse orders. |
| Customers | Views customer records and related sales information. |
| Projects | Reviews projects, approvals, project files, communication, progress, and profit distribution. |
| Technical Support | Handles technical support requests from representatives and field users. |
| Profit Config | Used by authorized HQ users to manage profit-sharing configuration. |
| HQ Executives | Manages HQ executive information and profit-share weights when authorized. |
| Funds | Views and manages company-fund ledgers when authorized. |
| Fees & Payments | Manages invoices, payment records, verification, and fee schedules. |
| Website Content | Available only to Super Admin in the current menu. |
| Reports (National) | Shows nationwide business and financial reports. |
| Disciplinary | Manages compliance and disciplinary records. |
| Complaints | Handles complaints across the organization. |
| Notifications | Shows alerts and workflow notifications. |
| My Profile | Manages the user's own profile, password, and personal documents. |
| Settings | Shows system settings available to the HQ role. |
| Audit | Reviews administrative and financial activity logs. |

### HQ Finance focus

HQ Finance mainly works with:

- Fees and payments
- Deposits
- Ledgers
- Profit configuration
- Profit distribution
- Company funds
- Financial reports
- Payment verification

### HQ Operations focus

HQ Operations mainly works with:

- Products
- Central warehouse inventory
- Orders
- Delivery and fulfillment
- Projects
- Representative operations
- Technical support
- Operational reports

## 3. Divisional Head

A Divisional Head manages representatives and projects within one assigned division.

| Section | Purpose |
|---|---|
| Dashboard | Shows activity and performance for the assigned division. |
| Representatives | Views representatives inside the division and monitors their work. |
| Products | Views available products and product information for operational work. |
| Orders | Reviews orders from representatives in the division. |
| Customers | Views customers connected to representatives in the division. |
| Projects | Reviews projects in the division, participates in approvals, checks files, communicates with related people, and helps control project progress. |
| Technical Support | Communicates with HQ about system and technical problems. |
| Fees | Views representative fee and payment information within the division. |
| Reports (Division) | Shows sales, orders, projects, and performance for the division. |
| Disciplinary | Records or reviews disciplinary matters within the division. |
| Complaints | Handles complaints related to representatives and customers in the division. |

## 4. District Head

A District Head manages representatives and projects within one assigned district.

| Section | Purpose |
|---|---|
| Dashboard | Shows activity and performance for the assigned district. |
| Representatives | Views and monitors representatives in the district. |
| Products | Views products and services available for district operations. |
| Orders | Reviews orders from representatives in the district. |
| Customers | Views customers connected to representatives in the district. |
| Projects | Reviews district projects, communicates with project participants, checks project files, and helps move projects through approved stages. |
| Technical Support | Communicates with HQ about technical problems. |
| Fees | Views fee and payment information for representatives in the district. |
| Reports (District) | Shows district sales, orders, projects, and performance. |
| Complaints | Handles complaints within the district. |

## 5. Upazila Representative

An Upazila Representative manages their own local business, customers, projects, orders, and reports.

| Section | Purpose |
|---|---|
| My Dashboard | Shows the representative's own sales, orders, projects, fees, notifications, and work summary. |
| My Representative | Shows the representative's own dealer profile, package, deposit, contract, laptop information, and area. |
| My Orders | Views orders placed by the representative and tracks delivery status. |
| Place Order | Places a warehouse order to request products from HQ. |
| Record Sale | Records a sale made to a customer. |
| My Customers | Creates and manages the representative's own customer records. |
| My Projects | Creates and tracks the representative's own projects. |
| New Project | Starts a new customer or business project. |
| Technical Support | Sends system bug reports, login problems, and technical questions to HQ. |
| My Fees | Views invoices, fees, payment status, and payment history. |
| Complaints | Submits or follows complaints related to business operations. |
| Notifications | Reads approval results, alerts, and important messages. |
| My Profile | Updates allowed personal information, changes password, and views personal documents. |
| Settings | Shows personal or account settings available to the representative. |

## 6. Access Rules

- A user can only see data allowed by their role and geographic area.
- HQ roles generally see national information.
- Divisional Heads see their division.
- District Heads see their district.
- Representatives normally see their own records.
- Personal documents are visible to the owner and authorized HQ/admin users.
- Project files and project chat are limited to people related to that project.
- Technical support is limited to the requester and HQ/admin support users.
- Financial distribution and sensitive configuration changes are restricted to authorized HQ roles.

## 7. Simple Organization View

```text
Super Admin
    |
    +-- HQ Admin / HQ Finance / HQ Operations
            |
            +-- Divisional Head
                    |
                    +-- District Head
                            |
                            +-- Upazila Representative
```
