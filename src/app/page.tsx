import Image from "next/image";
import Link from "@/components/ui/navigation-link";
import {
  Asterisk,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  DoorOpen,
  House,
  MapPin,
  MoveUpRight,
  Search,
  Sparkles,
  Sprout,
} from "lucide-react";
import { HeroSearch } from "@/features/properties/search-form";
import { ListingCard } from "@/features/listings/card";
import { findListings } from "@/features/listings/public";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: true, follow: true } };

const categories = [
  {
    type: "bedspace",
    title: "A bed, a fresh start",
    subtitle: "Budget-friendly shared spaces",
    icon: BedDouble,
    className: "category-peach",
  },
  {
    type: "private-room",
    title: "A room of your own",
    subtitle: "A little privacy, a lot of possibility",
    icon: DoorOpen,
    className: "category-sage",
  },
  {
    type: "apartment",
    title: "Room to settle in",
    subtitle: "Your space, at your own pace",
    icon: Building2,
    className: "category-sand",
  },
];

export default async function Home() {
  const result = await findListings({ p_limit: 3 })
    .then((listings) => ({ listings, unavailable: false }))
    .catch(() => ({ listings: [], unavailable: true }));
  const { listings, unavailable } = result;
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow">
              <Asterisk className="tiny-sun" size={22} aria-hidden="true" /> YOUR NEXT CHAPTER, IN
              CABADBARAN
            </span>
            <h1>
              Find your space.
              <br />
              Feel <span>at home.</span>
              <svg className="hero-underline" viewBox="0 0 300 16" aria-hidden="true">
                <path
                  d="M3 11 Q145 -3 294 9 M40 15 Q170 7 270 13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </h1>
            <p>
              A place to stay. The freedom to belong.
              <br className="desktop-only" /> Your everyday life. Let’s find where you belong.
            </p>
            <div className="hero-local">
              <span className="local-pin">
                <MapPin size={16} aria-hidden="true" />
              </span>
              <span>
                Starting in <strong>Cabadbaran City, Philippines</strong>
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-orbit" />
            <span className="hero-sparkle">
              <Asterisk size={66} strokeWidth={1.4} aria-hidden="true" />
            </span>
            <div className="hero-image">
              <Image
                src="/images/hero-home.svg"
                alt="Original illustration of a welcoming tropical home with leafy plants and a sunny courtyard"
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="hero-note">
              <span>
                <House size={21} aria-hidden="true" />
              </span>
              <div>
                <strong>A place to call your own.</strong>
                <small>A little closer to what matters.</small>
              </div>
            </div>
            <span className="art-caption">
              An illustration of possibility. Not an actual listing.
            </span>
          </div>
          <div className="hero-search-wrapper">
            <HeroSearch />
            <div className="hero-search-note">
              <span>
                <Check size={14} aria-hidden="true" /> Monthly rentals, made simpler
              </span>
              <span>
                <Sprout size={14} aria-hidden="true" /> Built with local living in mind
              </span>
              <Link href="/preview">
                About Cabahay <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="section categories-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A SPACE FOR EVERY SEASON</span>
              <h2>What feels like home to you?</h2>
            </div>
            <p>
              Big plans or simple beginnings.
              <br />
              Start with a space that fits.
            </p>
          </div>
          <div className="category-grid">
            {categories.map(({ type, title, subtitle, icon: Icon, className }) => (
              <Link
                key={type}
                href={`/properties?type=${type}`}
                className={`category-card ${className}`}
              >
                <div className="category-icon">
                  <Icon size={29} strokeWidth={1.4} aria-hidden="true" />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{subtitle}</p>
                </div>
                <ArrowUpRight size={21} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section featured-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A FEW PLACES TO PICTURE YOURSELF</span>
              <h2>Good spaces. New beginnings.</h2>
            </div>
            <Link href="/properties" className="text-link">
              Explore all rentals <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <p className="section-disclaimer">
            Admin-reviewed properties from local owners. Check each listing for monthly prices and
            rental terms.
          </p>
          {!listings.length && (
            <p className="account-card">
              {unavailable
                ? "Listings are temporarily unavailable. Please try again shortly."
                : "Our first homes are on their way. Owners can add a property and submit it for review."}
            </p>
          )}
          <div className="property-grid">
            {listings.map((property) => (
              <ListingCard key={property.slug} property={property} />
            ))}
          </div>
        </div>
      </section>
      <section id="how-it-works" className="section how-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LESS GUESSWORK. MORE GETTING SETTLED.</span>
              <h2>Your next move, made simple.</h2>
            </div>
            <span className="section-doodle" aria-hidden="true">
              <MoveUpRight size={48} strokeWidth={1} />
            </span>
          </div>
          <div className="steps-grid">
            {[
              {
                number: "01",
                icon: Search,
                title: "Find a place that fits",
                text: "Explore by barangay, monthly budget, and the kind of space you need.",
              },
              {
                number: "02",
                icon: CalendarDays,
                title: "Meet your next home",
                text: "Once requests launch, arrange a viewing and get to know the place before deciding.",
              },
              {
                number: "03",
                icon: House,
                title: "Start your next chapter",
                text: "Request a unit, review the terms, and wait for the owner’s confirmation before making plans.",
              },
            ].map(({ number, icon: Icon, title, text }) => (
              <div className="step" key={number}>
                <div className="step-top">
                  <span className="step-number">{number}</span>
                  <Icon size={24} strokeWidth={1.4} aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <p className="how-note">
            <Sparkles size={15} aria-hidden="true" />
            Owners can now submit properties for review. Viewing and booking requests are coming
            next.
          </p>
        </div>
      </section>
      <section id="for-owners" className="section owner-section">
        <div className="container">
          <div className="owner-banner">
            <div className="owner-art" aria-hidden="true">
              <span className="owner-art-sun">
                <Asterisk size={64} strokeWidth={1.3} />
              </span>
              <Building2 size={112} strokeWidth={0.8} />
              <span className="owner-art-plant">
                <Sprout size={55} strokeWidth={1.1} />
              </span>
            </div>
            <div className="owner-copy">
              <span className="eyebrow">HAVE A SPACE TO SHARE?</span>
              <h2>
                Your property.
                <br />
                Someone’s next beginning.
              </h2>
              <p>
                We’re building a simpler way for local owners to list spaces, manage requests, and
                keep track of what’s available.
              </p>
              <Link href="/become-an-owner" className="button button-light">
                List your property <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <div className="owner-stamp">
              <span>ROOTED IN</span>
              <MapPin size={23} aria-hidden="true" />
              <strong>Cabadbaran</strong>
              <span>BUILT FOR LOCAL LIVING</span>
            </div>
          </div>
        </div>
      </section>
      <div className="container closing-note">
        <Sprout size={20} aria-hidden="true" />
        <p>Every new beginning deserves a place to grow.</p>
        <Link href="/properties" aria-label="Explore rentals">
          <ArrowDown size={19} aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
