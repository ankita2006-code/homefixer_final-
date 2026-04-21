"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
import Logo from "@/components/Logo";
import AIChatAgent from "@/components/AIChatAgent";
import {
  User,
  LogOut,
  Loader2,
  Facebook,
  Instagram,
  Twitter,
  MapPin,
  Mail,
  Phone,
  LifeBuoy,
  ShoppingBag,
  Briefcase,
  LayoutDashboard,
  ChevronDown,
  Star,
  Shield,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isPartner, setIsPartner] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbUserName, setDbUserName] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Dark mode: load from localStorage and apply .dark class
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // Scroll shadow for navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let unsubUserDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Check if user is a partner
          const q = query(collection(db, "providers"), where("adminUid", "==", currentUser.uid));
          const snap = await getDocs(q);
          setIsPartner(!snap.empty);

          // Real-time listener for user data (name)
          unsubUserDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              setDbUserName(docSnap.data().name || currentUser.displayName || "User");
            } else {
              setDbUserName(currentUser.displayName || "User");
            }
          });
        } catch (error) {
          console.error("Firestore Error:", error);
        }
      } else {
        setIsPartner(false);
        setDbUserName(null);
      }

      setAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // fire once
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    }, 100);

    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/search", label: "Find Services" },
    ...(user ? [{ href: "/orders", label: "My Bookings", icon: ShoppingBag }] : []),
  ];

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>

        {/* ─── NAVBAR ─── */}
        <nav
          className={`uc-nav transition-shadow duration-300 ${scrolled ? "scrolled shadow-[0_4px_30px_rgba(44,58,34,0.10)]" : ""}`}
          aria-label="Main navigation"
        >
          <div className="container mx-auto flex h-full items-center justify-between px-5 max-w-7xl">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group" aria-label="Go to home">
              <Logo className="w-9 h-9" />
              <div className="flex flex-col leading-none">
                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--foreground)" }}>
                  Home<span style={{ color: "var(--brand)" }}>Fixer</span>
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: "var(--muted)" }}>
                  Trusted Professionals
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-6 px-4">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative py-6 text-sm font-600 transition-colors duration-300 group"
                    style={{
                      color: isActive ? "var(--brand)" : "var(--foreground)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = "var(--brand-mid)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
                      }
                    }}
                  >
                    {link.label}
                    <span
                      className="absolute bottom-0 left-0 w-full h-[3px] rounded-t-md transition-transform duration-300 ease-out"
                      style={{
                        background: "var(--brand)",
                        transform: isActive ? "scaleX(1)" : "scaleX(0)",
                        transformOrigin: "center"
                      }}
                    />
                  </Link>
                );
              })}
            </div>

            {/* Right Side: Partner + Auth + Dark Toggle */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 transition-all duration-300"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                style={{ color: "var(--muted)", background: "var(--surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--brand)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {/* Partner CTA */}
              {authLoading ? null : user ? (
                isPartner ? (
                  <Link
                    href="/partner"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 border transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
                      (e.currentTarget as HTMLElement).style.color = "var(--brand)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
                    }}
                  >
                    <LayoutDashboard size={15} /> My Business
                  </Link>
                ) : (
                  <Link href="/register-partner" className="btn-outline text-sm py-2 px-4">
                    <Briefcase size={15} /> Become a Partner
                  </Link>
                )
              ) : (
                <Link href="/partner-login" className="text-sm font-600 transition-colors"
                  style={{ color: "var(--muted)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}>
                  Partner Login
                </Link>
              )}

              {/* Auth */}
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--muted)" }} />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <Link href="/profile" className="flex items-center gap-2.5 group px-3 py-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: "var(--brand)" }}>
                      {(dbUserName?.charAt(0) || "U").toUpperCase()}
                    </div>
                    <span className="text-sm font-600 hidden md:block" style={{ color: "var(--foreground)" }}>
                      {dbUserName?.split(" ")[0] || "Account"}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl transition-colors"
                    title="Logout"
                    style={{ color: "var(--muted)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--danger)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <Link href="/login" className="btn-primary text-sm py-2.5 px-5">
                  Login / Sign Up
                </Link>
              )}
            </div>

            {/* Mobile: Dark toggle + Hamburger */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 transition-colors"
                title={darkMode ? "Light mode" : "Dark mode"}
                style={{ color: "var(--muted)", background: "var(--surface)", borderRadius: "var(--radius-sm)" }}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                className="p-2 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
                style={{ color: "var(--foreground)" }}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>{/* end navbar container */}

          {/* Mobile Menu Drawer */}
          {mobileOpen && (
            <div
              className="lg:hidden border-t px-5 py-6 flex flex-col gap-2 animate-fadeIn"
              style={{ background: "var(--background)", borderColor: "var(--border)" }}
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-3 text-sm font-600 transition-all duration-250"
                  style={{
                    color: pathname === link.href ? "var(--brand)" : "var(--foreground)",
                    background: pathname === link.href ? "var(--brand-light)" : undefined,
                    fontWeight: 600,
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t my-2" style={{ borderColor: "var(--border)" }} />
              {user ? (
                <>
                  <Link href="/profile" className="px-4 py-3 rounded-xl text-sm font-600 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                    <User size={16} /> My Account
                  </Link>
                  {isPartner && (
                    <Link href="/partner" className="px-4 py-3 rounded-xl text-sm font-600 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                      <LayoutDashboard size={16} /> My Business
                    </Link>
                  )}
                  <button onClick={handleLogout} className="px-4 py-3 rounded-xl text-sm font-600 flex items-center gap-2 text-left" style={{ color: "var(--danger)" }}>
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn-primary mt-2">Login / Sign Up</Link>
              )}
            </div>
          )}
        </nav>

        {/* ─── MAIN ─── */}
        <main
          className="flex-grow animate-fadeIn"
          key={pathname}
          style={{ animationDuration: "0.4s", animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          {children}
        </main>

        <AIChatAgent />

        {/* ─── FOOTER ─── */}
        <footer style={{
          background: "linear-gradient(to bottom, var(--surface) 0%, var(--surface-2) 100%)",
          borderTop: "1px solid var(--border)",
          color: "var(--muted)",
          position: "relative",
          overflow: "hidden",
        }}
          className="pt-16 pb-8">

          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, transparent, var(--brand) 30%, var(--gold) 50%, var(--brand) 70%, transparent)"
          }} />

          <div className="container mx-auto px-6 max-w-7xl relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">

              {/* Brand Column */}
              <div className="space-y-4">
                <Link href="/" className="flex items-center gap-2">
                  <Logo className="w-9 h-9" />
                  <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--foreground)" }}>
                    Home<span style={{ color: "var(--brand)" }}>Fixer</span>
                  </span>
                </Link>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  Connecting Durgapur's residents with verified, background-checked local professionals.
                </p>
                <div className="flex gap-3 pt-1">
                  {[
                    { Icon: Facebook, href: "#" },
                    { Icon: Instagram, href: "https://www.instagram.com/home_fixer23/" },
                    { Icon: Twitter, href: "https://x.com/Homefixer23/" }
                  ].map(({ Icon, href }, i) => (
                    <a
                      key={i}
                      href={href}
                      target={href !== "#" ? "_blank" : undefined}
                      rel={href !== "#" ? "noopener noreferrer" : undefined}
                      className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300"
                      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--brand)";
                        el.style.color = "var(--brand)";
                        el.style.background = "var(--brand-light)";
                        el.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--border)";
                        el.style.color = "var(--muted)";
                        el.style.background = "transparent";
                        el.style.transform = "scale(1)";
                      }}
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div>
                <h4 className="text-sm font-700 mb-5" style={{ color: "var(--foreground)" }}>Services</h4>
                <ul className="space-y-3">
                  {["Electrician", "Plumber", "Mechanic", "Tutor", "Tailor"].map((s) => (
                    <li key={s}>
                      <Link href={`/search?category=${s}`}
                        className="text-sm transition-all duration-250"
                        style={{ color: "var(--muted)", display: "inline-block" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "var(--brand-mid)";
                          (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                          (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                        }}>
                        {s}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-sm font-700 mb-5" style={{ color: "var(--foreground)" }}>Company</h4>
                <ul className="space-y-3">
                  {[
                    { href: "/about", label: "About Us" },
                    { href: "/orders", label: "My Bookings" },
                    { href: "/register-partner", label: "Join as Partner" },
                    { href: "#", label: "Help Center" },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}
                        className="text-sm transition-all duration-250"
                        style={{ color: "var(--muted)", display: "inline-block" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "var(--brand-mid)";
                          (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                          (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                        }}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-sm font-700 mb-5" style={{ color: "var(--foreground)" }}>Contact</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-sm">
                    <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: "var(--brand)" }} />
                    City Centre, Durgapur, West Bengal
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Phone size={16} className="shrink-0" style={{ color: "var(--brand)" }} />
                    +91 98765 43210
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="shrink-0" style={{ color: "var(--brand)" }} />
                    <a href="mailto:supporthomefixer@gmail.com" className="hover:underline transition-all">
                      supporthomefixer@gmail.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer Bottom */}
            <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"
              style={{ borderColor: "var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                © {new Date().getFullYear()} Home Fixer. All rights reserved.
              </p>
              <div className="flex items-center gap-2">
                <Shield size={14} style={{ color: "var(--brand)" }} />
                <span className="text-xs font-600" style={{ color: "var(--muted)" }}>
                  Built with ❤️ by{" "}
                  <span style={{ color: "var(--brand)" }} className="font-700">Infinity Squad</span>
                </span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}