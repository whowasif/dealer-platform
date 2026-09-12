// -----------------------------------------------------------------------------
// Single source of truth for all public site copy, contact info, and imagery.
// This is a public advertisement / "about us" site for the MIS Solution project:
// who we are, what we do, our offerings, the benefits for clients, and why our
// nationwide model is better than the traditional way of buying and servicing
// technology in Bangladesh. No recruitment funnel, no secrets, no profit figures.
// Images are Unsplash placeholders (clearly replaceable) chosen to feel local:
// Bangladeshi people, community, initiative, and IT/technology.
// -----------------------------------------------------------------------------

export const CONTACT = {
  address: "55/3, North Dhanmondi, Kalabagan, Dhaka 1205, Bangladesh",
  hotline: "+880 2 48122762",
  hotlineTel: "+880248122762",
  emails: ["info@missolution.com.bd", "sales@missolution.com.bd"],
  // Google Maps embed (no API key required) pinned on the MIS SOLUTION place.
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d641.8684193881927!2d90.38296464557213!3d23.74678719480569!2m3!1f0!2f39.28352948416764!3f0!3m2!1i1024!2i768!4f35!3m3!1m2!1s0x3755b99b7829cc9f%3A0x59f9d2d99e21df89!2sMIS%20SOLUTION!5e1!3m2!1sen!2sus!4v1788392993491!5m2!1sen!2sus",
  // Link that opens the MIS SOLUTION location in Google Maps in a new tab.
  mapLink:
    "https://www.google.com/maps/search/?api=1&query=MIS%20SOLUTION&query_place_id=0x3755b99b7829cc9f:0x59f9d2d99e21df89",
} as const;

export const NAV = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Why MIS", href: "#why-mis" },
  { label: "Contact", href: "#contact" },
] as const;

// Bangladeshi-native placeholder imagery — a mix of people, community,
// initiative, and IT/technology. Swap these for your own /public assets later.
// Reliable seeded placeholders (picsum.photos always resolves) so the site
// never shows a broken image. Swap these for your own /public assets — ideally
// Bangladeshi people, community, initiative, and IT/technology photos — later.
const P = (seed: string, w = 1000, h = 1250) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const IMG = {
  heroCity: "/hero-city.png",
  heroCityTall: "/hero-city-tall.png",
  // People / community
  people: P("mis-people"),
  community: P("mis-community"),
  crowd: P("mis-crowd"),
  shopkeeper: P("mis-shopkeeper"),
  // IT / technology
  it: P("mis-it"),
  server: P("mis-server"),
  code: P("mis-code"),
  workspace: P("mis-workspace", 1200, 900),
  support: P("mis-support"),
  // Initiative / nationwide
  map: P("mis-map"),
  delivery: P("mis-delivery"),
} as const;

// Each network card holds a stack of slides. On hover/tap the card advances to
// the next slide (image + caption slide up together inside the frame).
// These now tell the "what we bring to your community" story, not recruitment.
// "Our Network" horizontal gallery — a scroll-driven filmstrip. Each item has
// an image, a caption, and an accent colour used for the gradient overlay.
export const NETWORK_GALLERY = [
  {
    id: 1,
    img: IMG.people,
    title: "Rooted Locally",
    caption: "A trusted point of contact in every upazila",
    color: "#F9D616",
  },
  {
    id: 2,
    img: IMG.it,
    title: "Modern Technology",
    caption: "Products & software for real needs",
    color: "#a8ecd8",
  },
  {
    id: 3,
    img: IMG.support,
    title: "Support You Can Reach",
    caption: "Installation, repair & maintenance close to you",
    color: "#bcd4ff",
  },
  {
    id: 4,
    img: IMG.server,
    title: "Enterprise Grade",
    caption: "Networks, servers & security built to last",
    color: "#F9D616",
  },
  {
    id: 5,
    img: IMG.delivery,
    title: "Fast Delivery",
    caption: "From central stock in 1–2 days, anywhere in BD",
    color: "#a8ecd8",
  },
  {
    id: 6,
    img: IMG.shopkeeper,
    title: "For Every Bangladeshi",
    caption: "Homes, businesses & institutions across the country",
    color: "#bcd4ff",
  },
  {
    id: 7,
    img: IMG.map,
    title: "Nationwide Reach",
    caption: "495+ upazilas · 64 districts · 8 divisions",
    color: "#F9D616",
  },
] as const;

export const STATS = [
  { value: 495, suffix: "+", label: "Upazilas Within Reach" },
  { value: 64, suffix: "", label: "Districts Across Bangladesh" },
  { value: 8, suffix: "", label: "Divisions Connected" },
] as const;

// The three service divisions, mirroring the official offerings overview.
// Each division lists the concrete services delivered under it.
export const CAPABILITIES = [
  {
    no: "01",
    title: "Digital Services",
    body: "End-to-end software and digital products that put local businesses online and keep them secure — built, shipped, and supported from one trusted national partner.",
    items: [
      "Web Development",
      "Custom Software",
      "Mobile Apps",
      "AI Solutions",
      "Cyber Security",
      "E-Commerce",
    ],
  },
  {
    no: "02",
    title: "Business & Corporate Solutions",
    body: "The hardware and infrastructure backbone every office needs — sourced centrally, delivered fast, and installed to a national standard.",
    items: [
      "IT Equipments",
      "Security System",
      "Office Equipments",
      "Networking",
      "Server Setup",
      "Power Solution",
    ],
  },
  {
    no: "03",
    title: "Maintenance & Support",
    body: "Dependable service after the sale — contracts, repairs, and remote help that keep customers running and their local reputation strong.",
    items: [
      "AMC Contracts",
      "On-call Repair",
      "Installation",
      "Troubleshooting",
      "Remote Solution",
    ],
  },
] as const;

// Client-facing benefits — the reasons a home, shop, office, or institution
// anywhere in Bangladesh should choose MIS Solution.
export const BENEFITS = [
  {
    title: "A trusted partner in your own area",
    body: "One accountable local point of contact for every upazila — not a distant call centre. Real people who know your community.",
  },
  {
    title: "Fair, uniform pricing nationwide",
    body: "The same honest price whether you are in Dhaka or a remote upazila. No mark-ups for being far from the capital.",
  },
  {
    title: "Fast delivery from central stock",
    body: "Products ship from our Dhaka warehouse and reach you in 1–2 days, so projects don't stall waiting for hardware.",
  },
  {
    title: "One brand, full accountability",
    body: "From purchase to installation to after-sales service, a single national brand stands behind every product and project.",
  },
  {
    title: "Genuine products & warranty",
    body: "Authentic equipment with proper warranty support and installation done right — protecting your investment.",
  },
  {
    title: "Everything under one roof",
    body: "Software, hardware, security, networking, power, and ongoing maintenance from one team, so you deal with one partner instead of ten.",
  },
] as const;

// "Why this is better than the traditional way." A side-by-side that makes the
// project's core advantage clear to the public.
export const COMPARISON = {
  traditionalTitle: "The traditional way",
  misTitle: "The MIS Solution way",
  rows: [
    {
      traditional: "Travel to a city market to find genuine products",
      mis: "A trusted local partner right in your own upazila",
    },
    {
      traditional: "Prices change from shop to shop and city to city",
      mis: "One fair, uniform national price everywhere",
    },
    {
      traditional: "No clear warranty or after-sales help",
      mis: "Proper warranty, installation and ongoing support",
    },
    {
      traditional: "Different vendors for hardware, software and service",
      mis: "Digital, hardware and maintenance under one brand",
    },
    {
      traditional: "Long waits for stock and repairs",
      mis: "Central stock delivered in 1–2 days, fast repairs",
    },
    {
      traditional: "No one is truly accountable if something fails",
      mis: "One national brand accountable end to end",
    },
  ],
} as const;

// Community / client voices — the value MIS brings, in the words of the people
// it serves. (Illustrative until real testimonials are collected.)
export const TESTIMONIALS = [
  {
    quote:
      "Before, getting a genuine server and someone to set it up meant a trip to Dhaka. Now the same expertise and fair pricing reaches our upazila. That changes what a local business can do.",
    author: "Business Owner, Rajshahi Division",
    color: "brand",
  },
  {
    quote:
      "We needed a website, secure networking, and reliable after-sales support. Getting all of it from one accountable national brand — right here — saved us time and worry.",
    author: "School Administrator, Khulna Division",
    color: "mint",
  },
  {
    quote:
      "The same price, the same quality, and someone nearby who actually answers when we need help. That is what technology should feel like for every community in Bangladesh.",
    author: "Shop Owner, Sylhet Division",
    color: "sky",
  },
] as const;

// Public-interest articles about the project, its benefits, and its vision.
export const INSIGHTS = [
  {
    title: "Closing Bangladesh's Digital Gap, One Upazila at a Time",
    date: "Jan 15, 2026",
    img: IMG.crowd,
    excerpt:
      "Reliable technology is no longer optional for local businesses. MIS Solution brings dependable products, fair pricing, and real support to communities that big-city vendors overlook — putting a trusted technology partner within reach of every upazila.",
  },
  {
    title: "Everything Technology, Under One National Brand",
    date: "Dec 04, 2025",
    img: IMG.it,
    excerpt:
      "Digital services, business hardware, and dependable maintenance usually mean juggling many vendors. MIS Solution unifies all three under one accountable brand, so homes, shops, offices and institutions deal with a single trusted partner from purchase to after-sales support.",
  },
  {
    title: "Why a Nationwide Standard Beats the Old Way",
    date: "Nov 18, 2025",
    img: IMG.map,
    excerpt:
      "The traditional route means uneven prices, unclear warranties, and long waits for stock and repairs. A single national standard — uniform pricing, central stock, fast delivery, and end-to-end accountability — delivers a fairer, faster experience to every corner of the country.",
  },
] as const;

// Public / client FAQ — about MIS Solution, its services, and how it works for
// customers. (No recruitment content.)
export const FAQ = [
  {
    q: "What is MIS Solution?",
    a: "MIS Solution is a nationwide ICT company on a mission to bring trusted technology to every upazila in Bangladesh. We deliver digital services, business and corporate hardware, and ongoing maintenance and support through a network that reaches communities big-city vendors usually overlook.",
  },
  {
    q: "What services and products do you offer?",
    a: "Three divisions: Digital Services (web development, custom software, mobile apps, AI solutions, cyber security, e-commerce); Business & Corporate Solutions (IT equipment, security systems, office equipment, networking, server setup, power solutions); and Maintenance & Support (AMC contracts, on-call repair, installation, troubleshooting, remote solutions).",
  },
  {
    q: "Where do you operate?",
    a: "Across all of Bangladesh — 495+ upazilas, 64 districts, and 8 divisions — with a trusted local point of contact in each area, backed by our central operations in Dhaka.",
  },
  {
    q: "How is this better than buying from a local market or a distant vendor?",
    a: "You get one fair, uniform national price everywhere, genuine products with proper warranty and installation, fast delivery from central stock (usually 1–2 days), and a single accountable brand for hardware, software, and after-sales service — instead of chasing several vendors with no clear accountability.",
  },
  {
    q: "Do you support homes and small businesses, or only large organisations?",
    a: "Both. From individual customers and local shops to schools, offices, and institutions, our offerings scale to fit real needs — with the same standard of service everywhere.",
  },
  {
    q: "How can I get in touch or request a quote?",
    a: "Reach us through the contact section on this page, by phone, or by email. Tell us what you need — a product, a project, or ongoing support — and our team will help you with the right solution.",
  },
] as const;
