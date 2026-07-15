import RevolvingWord from '@/components/ui/RevolvingWord'

const BUILD_WORDS = ['Apps', 'Tools', 'Products', 'Startups', 'Experiences']

function AboutSection() {
  return (
    <section
      id="about"
      className="bg-iwd-surface-raised relative overflow-hidden px-6 py-24 sm:px-10 sm:py-32 md:px-14 lg:px-16 dark:bg-iwd-black-950"
      aria-labelledby="about-heading"
    >
      {/* Subtle gradient accent */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 80% 20%, rgb(var(--iwd-accent-900) / 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 10% 80%, rgb(var(--iwd-accent-800) / 0.1) 0%, transparent 50%)
          `,
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl rounded-3xl border border-white/5 bg-white/[0.01] p-8 text-center backdrop-blur-sm md:p-12">
        {/* Eyebrow */}
        <div className="mb-5 flex items-center justify-center gap-4">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-iwd-gold-400/40 sm:w-14" />
          <span className="font-body text-[10px] font-semibold uppercase tracking-[0.4em] text-iwd-gold-400 sm:text-xs">
            About the DevFest
          </span>
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-iwd-gold-400/40 sm:w-14" />
        </div>

        <h2
          id="about-heading"
          className="mb-12 font-heading text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl"
        >
          Where Detroit
          <br />
          <span className="bg-gradient-to-r from-iwd-gold-200 via-iwd-gold-400 to-iwd-gold-200 bg-clip-text text-transparent">
            Builds <RevolvingWord words={BUILD_WORDS} /> with AI
          </span>
          <span className="sr-only">
            {' '}
            (apps, tools, products, startups, and experiences)
          </span>
        </h2>

        <p className="text-left font-body text-lg leading-relaxed text-gray-400">
          Michigan DevFest brings together developers, builders, and tech
          enthusiasts for a day of hands-on learning with the latest from Google
          — Gemini, Android, Cloud, and beyond — across Detroit&apos;s tech
          ecosystem.
        </p>
        <p className="mt-6 text-left font-body text-lg leading-relaxed text-gray-400">
          Hosted by GDG Detroit in partnership with Compass Detroit and Women
          Techmakers, this DevFest features keynotes, hands-on workshops,
          codelabs, and community-driven sessions designed to help you build
          with the newest tools before anyone else does.
        </p>
        <p className="mt-6 text-pretty text-left font-body text-lg leading-relaxed text-gray-400">
          Whether you&apos;re a seasoned engineer, a student writing your first
          line of code, a founder shipping something bold, or a hobbyist chasing
          curiosity —{' '}
          <span className="font-bold text-iwd-gold-300">you belong here.</span>
        </p>
      </div>
    </section>
  )
}

export default AboutSection
