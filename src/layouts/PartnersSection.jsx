import PropTypes from 'prop-types'
import { FaEnvelope } from 'react-icons/fa6'
import CTAButton from '@/components/ui/CTAButton'
import SectionSkipLink from '@/components/ui/SectionSkipLink'

/**
 * Display config for each tier — the single source of truth for how a tier
 * looks. To add a tier: append an entry here, add its key to PARTNER_TIERS and
 * RENDERED_PARTNER_TIERS in scripts/sanity-import/lib/partner-tiers.mjs, and to
 * TIER_OPTIONS in studio/schemaTypes/partner.ts. A tier missing from any of the
 * three saves cleanly in Studio and then renders nowhere.
 *
 * `slots` sets how many grid cells the row shows; anything beyond the real
 * logos renders as a `+` placeholder, which is how open inventory is
 * advertised. Leave it out and the row sizes to the logos it has.
 *
 * `shape` picks the tile proportion: wide 7:4 cards for the paid tiers, squares
 * for the many-small-logos tiers.
 */
const TIER_DISPLAY = [
  { key: 'diamond', heading: 'Diamond', shape: 'card', columns: 'diamond' },
  {
    key: 'platinum',
    heading: 'Platinum',
    slots: 3,
    shape: 'card',
    columns: 'three',
  },
  { key: 'gold', heading: 'Gold', slots: 4, shape: 'card', columns: 'four' },
  {
    key: 'community',
    heading: 'Community',
    slots: 8,
    shape: 'square',
    columns: 'four',
  },
  {
    key: 'media',
    heading: 'Media',
    slots: 4,
    shape: 'square',
    columns: 'four',
  },
  { key: 'fuel', heading: 'Fuel', slots: 4, shape: 'square', columns: 'four' },
]

/**
 * Column counts per tier, mobile first. The single-column diamond row is capped
 * rather than stretched so one logo does not span the full grid width.
 */
const COLUMN_CLASSES = {
  diamond: 'grid-cols-1 md:grid-cols-[minmax(0,640px)]',
  three: 'grid-cols-1 md:grid-cols-3',
  four: 'grid-cols-2 md:grid-cols-4',
}

const SHAPE_CLASSES = {
  card: 'aspect-[7/4] px-6 py-3 sm:px-8',
  square: 'aspect-square p-6 sm:p-8',
}

const BASE_SLOT_CLASSES =
  'flex min-w-0 items-center justify-center overflow-hidden rounded-xl transition-colors duration-300'

/**
 * Logos with dark ink get a near-white tile; everything else sits on the
 * section's own dark surface. Driven by `logoSurface` on the Sanity document,
 * not by anything derivable from the image itself.
 */
const SURFACE_CLASSES = {
  light: 'border border-stone-200/75 bg-white/95',
  dark: 'border border-white/10 bg-white/[0.04] hover:border-white/25 light:border-black/10 light:bg-black/[0.03] light:hover:border-black/25',
}

const PLACEHOLDER_CLASSES =
  'border border-dashed border-white/15 bg-white/[0.02] light:border-black/15 light:bg-black/[0.02]'

const PARTNER_SHAPE = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  name: PropTypes.string.isRequired,
  tier: PropTypes.string.isRequired,
  logo: PropTypes.string,
  logoAlt: PropTypes.string,
  logoSurface: PropTypes.oneOf(['light', 'dark']),
  url: PropTypes.string,
  description: PropTypes.string,
})

function PartnerLogo({ partner }) {
  if (!partner.logo) {
    return (
      <p className="text-center font-heading text-lg font-bold tracking-tight text-white light:text-gray-900">
        {partner.name}
      </p>
    )
  }

  return (
    <img
      src={partner.logo}
      alt={partner.logoAlt || partner.name}
      className="max-h-full max-w-full object-contain transition duration-300 group-hover:brightness-110"
      loading="lazy"
      decoding="async"
    />
  )
}

PartnerLogo.propTypes = { partner: PARTNER_SHAPE.isRequired }

function PartnerSlot({ partner, shape, slotLabel }) {
  const surface = SURFACE_CLASSES[partner.logoSurface] ?? SURFACE_CLASSES.dark
  const content = <PartnerLogo partner={partner} />

  return (
    <li
      className={`${BASE_SLOT_CLASSES} ${surface} ${SHAPE_CLASSES[shape]} group`}
    >
      {partner.url ? (
        <a
          href={partner.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex size-full items-center justify-center rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-iwd-black-950"
          aria-label={`${partner.name} — ${slotLabel} (opens in new tab)`}
        >
          {content}
        </a>
      ) : (
        <div
          className="flex size-full items-center justify-center"
          aria-label={`${partner.name} — ${slotLabel}`}
        >
          {content}
        </div>
      )}
    </li>
  )
}

PartnerSlot.propTypes = {
  partner: PARTNER_SHAPE.isRequired,
  shape: PropTypes.oneOf(Object.keys(SHAPE_CLASSES)).isRequired,
  slotLabel: PropTypes.string.isRequired,
}

/**
 * One tier: a heading plus a fixed number of slots. Real logos fill from the
 * left; the rest render as `+` placeholders so an empty seat reads as available
 * rather than as a layout bug.
 *
 * A tier with no logos at all renders nothing — not even its heading. The
 * placeholders only say "room for more" next to logos that are actually there;
 * a whole row of them under a lonely heading reads as broken instead. The row
 * comes back on its own as soon as one organization in that tier goes active,
 * so an empty tier costs nothing to leave configured.
 */
function PartnerTier({ tier, partners }) {
  const { key, heading, slots, shape, columns } = tier
  const totalSlots = Math.max(slots ?? partners.length, partners.length)
  const placeholderCount = totalSlots - partners.length
  const headingId = `partners-tier-${key}`
  const slotLabel = `${heading} partner`

  if (partners.length === 0) return null

  return (
    <section className="text-center" aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="mb-4 font-heading text-base font-semibold uppercase tracking-[0.2em] text-iwd-gold-400 sm:text-lg"
      >
        {heading}
      </h3>
      <ul
        className={`m-0 grid list-none justify-center gap-4 p-0 ${COLUMN_CLASSES[columns]}`}
      >
        {partners.map((partner) => (
          <PartnerSlot
            key={partner.id}
            partner={partner}
            shape={shape}
            slotLabel={slotLabel}
          />
        ))}
        {Array.from({ length: placeholderCount }, (_, index) => (
          <li
            // Placeholders are positional and interchangeable — index is the
            // only identity they have.
            key={`${key}-placeholder-${index}`}
            className={`${BASE_SLOT_CLASSES} ${PLACEHOLDER_CLASSES} ${SHAPE_CLASSES[shape]}`}
            aria-label={`Open ${heading} partner slot ${
              partners.length + index + 1
            } of ${totalSlots}`}
          >
            <span
              className="select-none text-4xl font-light leading-none text-gray-400/60"
              aria-hidden="true"
            >
              +
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

PartnerTier.propTypes = {
  tier: PropTypes.shape({
    key: PropTypes.string.isRequired,
    heading: PropTypes.string.isRequired,
    slots: PropTypes.number,
    shape: PropTypes.oneOf(['card', 'square']).isRequired,
    columns: PropTypes.oneOf(Object.keys(COLUMN_CLASSES)).isRequired,
  }).isRequired,
  partners: PropTypes.arrayOf(PARTNER_SHAPE).isRequired,
}

const PartnersSection = ({ partnersData = [], year }) => {
  const isCurrentYear = year === new Date().getFullYear()

  // Rows arrive flat and already ordered (tier, then sortOrder, then name) —
  // see fetchEventPartners. Grouping here keeps the tier's display config and
  // its logos in one place.
  const byTier = new Map(TIER_DISPLAY.map(({ key }) => [key, []]))
  for (const partner of partnersData) {
    byTier.get(partner.tier)?.push(partner)
  }

  const hasPartners = partnersData.length > 0

  return (
    <section
      id="partners"
      className="bg-iwd-surface-raised relative flex flex-col justify-center px-8 py-24 sm:px-10 md:px-14 lg:px-16 dark:bg-iwd-black-950"
    >
      {/* Accent glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 50% 50%, rgb(var(--iwd-accent-900) / 0.06) 0%, transparent 60%)`,
        }}
        aria-hidden="true"
      />
      <SectionSkipLink href="#team">Skip partners section</SectionSkipLink>

      <div className="relative w-full pt-0">
        <p className="mb-4 text-center font-body text-xs font-medium uppercase tracking-[0.3em] text-iwd-gold-400">
          Our Supporters
        </p>
        <h2 className="mb-5 w-full text-center font-heading text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
          {year ? `${year} ` : ''}
          <span className="bg-gradient-to-r from-iwd-gold-300 via-iwd-gold-400 to-iwd-gold-300 bg-clip-text text-transparent">
            Partners
          </span>
        </h2>
        <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-iwd-gold-400/50 to-transparent sm:w-32" />
      </div>

      <div className="mx-auto mt-2 max-w-4xl text-center">
        <p className="text-balance font-body text-lg leading-relaxed text-gray-400">
          Michigan DevFest wouldn&apos;t be possible without the support of our
          amazing partners. Thank you for helping us create an unforgettable
          experience for the tech community.
        </p>
      </div>

      <div className="relative mx-auto mt-8 w-full max-w-7xl sm:mt-10 md:mt-14 lg:mt-16">
        {hasPartners ? (
          <div className="flex flex-col gap-11">
            {TIER_DISPLAY.map((tier) => (
              <PartnerTier
                key={tier.key}
                tier={tier}
                partners={byTier.get(tier.key) ?? []}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-lg leading-relaxed text-gray-400">
            {year && !isCurrentYear
              ? `No partner information available for ${year}.`
              : 'We are currently looking for partners for this event.'}
          </p>
        )}

        {year && isCurrentYear && (
          <div className="mx-auto mt-14 max-w-3xl rounded-3xl border border-iwd-gold-400/20 bg-white/[0.04] p-8 text-center backdrop-blur-xl sm:p-10 light:border-black/10 light:bg-black/[0.03]">
            <p className="mb-3 font-body text-xs font-medium uppercase tracking-[0.3em] text-iwd-gold-400">
              Partners &amp; supporters
            </p>
            <h3 className="mb-4 font-heading text-2xl font-bold leading-tight text-white sm:text-3xl light:text-gray-900">
              Put your organization in front of Michigan&apos;s developers
            </h3>
            <p className="mx-auto mb-7 max-w-2xl text-balance font-body leading-relaxed text-gray-400">
              Michigan DevFest brings together developers, students, and
              technologists from across the region for a day of talks,
              workshops, and hiring conversations. Partnering puts your team in
              the room — and every tier above still has open slots.
            </p>
            <div className="flex justify-center">
              <CTAButton
                href="mailto:whatupdoe@compass-detroit.com"
                label="Become a Partner"
                ariaLabel="Email us about partnering with Michigan DevFest"
                className="text-xl font-semibold text-white"
                variant="secondary"
                icon={<FaEnvelope />}
                iconPosition="left"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

PartnersSection.propTypes = {
  partnersData: PropTypes.arrayOf(PARTNER_SHAPE),
  year: PropTypes.number.isRequired,
}

export default PartnersSection
