# Michigan DevFest 2026 — Website Plan & Process

**Prepared for:** Event organizer discussion
**Date:** July 29, 2026
**Prepared by:** Greg Miller

---

## Where the site is today

The 2026 site is built and working. It runs on a codebase we've been developing and
improving across several Compass and GDG events, so it arrives with a lot already
solved — accessibility, performance, mobile layout, and a design system we control.

What's already done and correct for 2026:

- **Venue and map** — Little Caesars Resource Center (LCRC), with a working interactive map
- **Page structure** — landing, about, sessions, speakers, team, partners, job board, location
- **Team and partner content**
- **Content management system** — a new Sanity CMS instance under the Compass Detroit
  organization, set up specifically for Michigan DevFest

What's missing is the one thing that can't exist yet: **the 2026 program.** No confirmed
speakers, no sessions, no schedule.

---

## The approach

Rather than hold the site back until the 2026 program is confirmed, we publish now using
**last year's speakers and sessions as placeholder content**, clearly presented as the
2025 program.

Visitors see a real, complete site — this year's venue, this year's map, and a genuine
sense of what DevFest sessions look like — instead of an empty shell or a "coming soon"
page.

As 2026 speakers are confirmed, they replace last year's entries **one at a time through
the CMS.** No code changes, no rebuild cycle, no developer needed for routine content
updates.

### Why this is worth doing rather than waiting

1. **The site goes live sooner**, and the domain starts building search presence now
   rather than three months from now.
2. **It proves the content pipeline with real data.** Loading 50+ speakers, sessions,
   headshots, and bios exercises every part of the system while there's no deadline
   pressure. Problems surface in July, not the week before the event.
3. **Returning speakers are already in the system.** A meaningful share of DevFest
   speakers return year over year. Their bios, headshots, and links carry forward, so
   confirming a returning speaker becomes a quick review rather than collecting
   everything from scratch.

---

## Handling the venue difference

Last year's event was at the MotorCity Casino Conference Center. This year is at LCRC.
That means last year's room assignments (MCC2, Sound Board, Salon A-C) are meaningless
on this year's map.

**How we handle it:** the site shows the **LCRC map and venue**, because that's where
DevFest 2026 actually is and that's what visitors need to know. Last year's sessions are
imported **without room assignments** — they display with title, speaker, track, and time
slot, but no room label.

We are not rebuilding last year's venue map. It would be several days of work with no
value past this fall.

The result reads cleanly: this is the 2026 site, at the 2026 venue, currently previewing
last year's program until this year's is confirmed.

---

## Tracks

DevFest 2025 ran seven tracks — Level Up, Leadership, Hackathon, Innovation, Build with
AI, Tech+Design, and Workshops. The site supports multiple tracks with tabbed navigation,
and we'll restore that for both last year's content and this year's.

**Open question for planning:** what track structure do we expect at LCRC in 2026? This
doesn't block anything now, but it shapes how the schedule is laid out and is worth
settling before the program firms up.

---

## Timeline

Firm dates aren't realistic yet, and I'd rather not invent them. The sequence is:

| Stage | What happens | Timing |
|---|---|---|
| 1 | Load 2025 program into the new CMS | Near term |
| 2 | Publish the site with 2025 content and 2026 venue | Shortly after |
| 3 | Speaker pipeline opens (CFP or invitations) | Around September |
| 4 | Replace 2025 entries with confirmed 2026 speakers | Rolling, as confirmed |
| 5 | Schedule and room assignments finalized | Closer to the event |

Stages 4 and 5 are ongoing content work, not development work. Once the site is
published, adding a speaker takes minutes and doesn't require me.

---

## What I need to keep moving

1. **Confirmation** that publishing with last year's program, clearly labeled, is
   acceptable.
2. **Event date** for 2026, once it's set.
3. **Track structure** expected at LCRC — even a rough sense.
4. **Speaker pipeline guidelines** from Jenna when they exist, however provisional.
   Knowing the shape of the process matters more right now than firm dates.

---

## How I'm building this

A note on process, since it affects speed and cost.

**AI-assisted development.** I use AI tooling throughout — reviewing the codebase,
planning migrations, writing and checking code. It compresses work that would otherwise
take days into hours. I review everything that ships; the AI accelerates the work, it
doesn't run unsupervised.

**Content separated from code.** Event content lives in the Sanity CMS, not buried in
code files. This is the meaningful architectural decision: it means routine updates —
adding a speaker, fixing a bio, changing a session time — don't require a developer.
It also means the same site can be re-pointed at a new year's content without a rebuild.

**Built to be reused.** This codebase has already been adapted across multiple events.
Each cycle it gets more configurable, so each new event costs less than the last.

### Coming later: automation

We have the groundwork for an automated speaker intake pipeline: speakers submit a form,
responses land in a Google Sheet, and an automated process pulls that data — along with
headshots — directly into the CMS. The import script for this already exists in the
project.

I'm deliberately not switching it on yet. It's most valuable when there's a real volume
of submissions arriving, which is the September timeframe. I'd like to revisit it in a
few weeks, ahead of the pipeline opening.

---

## Summary

The site is built. The venue, map, and structure are correct for 2026. We publish now
with last year's program as placeholder content, and swap in this year's speakers
through the CMS as they're confirmed — no development work required for those updates.

The main thing I need is a sense of the speaker timeline and track structure, even
approximate.
